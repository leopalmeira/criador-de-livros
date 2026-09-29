import { 
  SalesEstimateInput, 
  SalesEstimateResult, 
  SalesModelConfig, 
  SalesCalibrationPoint, 
  ConfidenceLevel 
} from '../types';
import { DEFAULT_SALES_MODELS } from '../database/defaults';

export interface ISalesEstimator {
  estimate(input: SalesEstimateInput, model?: SalesModelConfig): SalesEstimateResult;
}

export class SalesEstimator implements ISalesEstimator {
  private monthlyMultiplier: number;

  constructor(monthlyMultiplier: number = 30) {
    this.monthlyMultiplier = monthlyMultiplier;
  }

  setMonthlyMultiplier(days: 30 | 30.44): void {
    this.monthlyMultiplier = days;
  }

  estimate(input: SalesEstimateInput, model?: SalesModelConfig): SalesEstimateResult {
    const { bsr, marketplace } = input;

    // Se não há BSR válido, não inventar dados
    if (bsr === undefined || bsr === null || isNaN(bsr) || bsr <= 0) {
      return {
        estimatedDailySales: null,
        estimatedMonthlySales: null,
        confidence: 'BAIXA',
        methodVersion: model ? model.version : 'sales-model-none',
        notes: 'BSR não disponível para estimativa.'
      };
    }

    // Seleciona o modelo adequado caso não fornecido
    const activeModel = model || this.findDefaultModel(marketplace);
    const points = [...activeModel.points].sort((a, b) => a.bsr - b.bsr);

    if (points.length === 0) {
      return {
        estimatedDailySales: null,
        estimatedMonthlySales: null,
        confidence: 'BAIXA',
        methodVersion: activeModel.version,
        notes: 'Modelo de vendas sem pontos de calibração.'
      };
    }

    // Calcula estimativa diária usando interpolação log-log
    const dailySales = this.interpolate(bsr, points, activeModel.method);
    const monthlySales = Math.round(dailySales * this.monthlyMultiplier);

    // Avalia nível de confiança
    const confidence = this.evaluateConfidence(bsr, marketplace, activeModel);

    return {
      estimatedDailySales: Number(dailySales.toFixed(1)),
      estimatedMonthlySales: monthlySales,
      confidence,
      methodVersion: activeModel.version,
      notes: `Estimativa calculada via ${activeModel.method} com base em ${points.length} pontos de calibração.`
    };
  }

  /**
   * Interpolação Log-Log entre pontos de calibração BSR vs Vendas Diárias.
   * Relação de potência: S = A * BSR^(-k), logo ln(S) é linear com ln(BSR).
   */
  public interpolate(
    bsr: number, 
    points: SalesCalibrationPoint[], 
    method: 'log-log' | 'logarithmic' | 'linear' = 'log-log'
  ): number {
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    // Se BSR for menor que o primeiro ponto (ex: top 1)
    if (bsr <= firstPoint.bsr) {
      if (bsr === 1) return firstPoint.dailySales;
      // Projeção suave para o topo
      return firstPoint.dailySales * Math.pow(firstPoint.bsr / bsr, 0.4);
    }

    // Se BSR for maior que o último ponto de calibração
    if (bsr >= lastPoint.bsr) {
      // Decaimento assintótico suave
      const ratio = bsr / lastPoint.bsr;
      const decaySales = lastPoint.dailySales / Math.pow(ratio, 0.65);
      return Math.max(0.01, decaySales);
    }

    // Encontra os 2 pontos vizinhos no array ordenado
    let lower = firstPoint;
    let upper = lastPoint;

    for (let i = 0; i < points.length - 1; i++) {
      if (bsr >= points[i].bsr && bsr <= points[i + 1].bsr) {
        lower = points[i];
        upper = points[i + 1];
        break;
      }
    }

    // Se coincidência exata
    if (bsr === lower.bsr) return lower.dailySales;
    if (bsr === upper.bsr) return upper.dailySales;

    if (method === 'linear') {
      const t = (bsr - lower.bsr) / (upper.bsr - lower.bsr);
      return lower.dailySales + t * (upper.dailySales - lower.dailySales);
    }

    // Interpolação Log-Log (padrão ouro para distribuições Power-Law / Pareto / BSR)
    const lnB1 = Math.log(lower.bsr);
    const lnB2 = Math.log(upper.bsr);
    const lnS1 = Math.log(Math.max(0.001, lower.dailySales));
    const lnS2 = Math.log(Math.max(0.001, upper.dailySales));

    const slope = (lnS2 - lnS1) / (lnB2 - lnB1);
    const lnB = Math.log(bsr);
    const lnS = lnS1 + slope * (lnB - lnB1);

    return Math.max(0.01, Math.exp(lnS));
  }

  private evaluateConfidence(
    bsr: number, 
    marketplace: string, 
    model: SalesModelConfig
  ): ConfidenceLevel {
    // Mercados não calibrados diretamente têm menor confiança
    const isDirectlyCalibrated = model.marketplace === marketplace;
    if (!isDirectlyCalibrated) {
      return 'BAIXA';
    }

    // BSR com alto volume e estabilidade relativa
    if (bsr <= 25000) {
      return 'ALTA';
    }

    // BSR de faixa média
    if (bsr <= 120000) {
      return 'MÉDIA';
    }

    // BSR alto (vendas raras/esparsas)
    return 'BAIXA';
  }

  private findDefaultModel(marketplace: string): SalesModelConfig {
    const found = DEFAULT_SALES_MODELS.find(m => m.marketplace === marketplace);
    return found || DEFAULT_SALES_MODELS[0];
  }
}

export const defaultSalesEstimator = new SalesEstimator();
