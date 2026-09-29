import { OpportunityScoreWeights, OpportunityScoreResult } from '../types';
import { DEFAULT_SETTINGS } from '../database/defaults';

export class OpportunityScoreCalculator {
  private weights: OpportunityScoreWeights;

  constructor(weights?: OpportunityScoreWeights) {
    this.weights = weights || DEFAULT_SETTINGS.opportunityWeights;
  }

  setWeights(weights: OpportunityScoreWeights) {
    this.weights = weights;
  }

  calculate(params: {
    bsr?: number | null;
    estimatedDailySales?: number | null;
    reviewCount?: number | null;
    rating?: number | null;
    price?: number | null;
    ageDays?: number | null;
  }): OpportunityScoreResult {
    const { bsr, estimatedDailySales, reviewCount, rating, price, ageDays } = params;

    // 1. Fator de Volume de Vendas (0 a 100)
    // Mais vendas = mercado com demanda comprovada
    let salesFactor = 10;
    if (estimatedDailySales !== null && estimatedDailySales !== undefined) {
      if (estimatedDailySales >= 50) salesFactor = 100;
      else if (estimatedDailySales >= 20) salesFactor = 85;
      else if (estimatedDailySales >= 10) salesFactor = 70;
      else if (estimatedDailySales >= 5) salesFactor = 55;
      else if (estimatedDailySales >= 2) salesFactor = 40;
      else if (estimatedDailySales >= 0.5) salesFactor = 25;
      else salesFactor = 10;
    } else if (bsr !== null && bsr !== undefined && bsr > 0) {
      if (bsr <= 500) salesFactor = 100;
      else if (bsr <= 2500) salesFactor = 85;
      else if (bsr <= 10000) salesFactor = 65;
      else if (bsr <= 35000) salesFactor = 45;
      else if (bsr <= 100000) salesFactor = 25;
      else salesFactor = 10;
    }

    // 2. Fator de Barreira de Concorrência / Reviews (0 a 100)
    // Menos reviews para vender bem = MAIOR oportunidade de entrar no nicho
    let reviewFactor = 50;
    if (reviewCount !== null && reviewCount !== undefined) {
      if (reviewCount <= 20) reviewFactor = 95;
      else if (reviewCount <= 50) reviewFactor = 85;
      else if (reviewCount <= 150) reviewFactor = 70;
      else if (reviewCount <= 350) reviewFactor = 55;
      else if (reviewCount <= 800) reviewFactor = 35;
      else if (reviewCount <= 2000) reviewFactor = 20;
      else reviewFactor = 5; // Barreira altíssima de milhares de avaliações
    }

    // 3. Fator de Avaliação / Espaço para Melhoria (0 a 100)
    // Se a nota for média (3.6 a 4.3), há oportunidade de criar algo muito melhor
    let ratingFactor = 60;
    if (rating !== null && rating !== undefined && rating > 0) {
      if (rating >= 3.5 && rating <= 4.2) {
        ratingFactor = 90; // Oportunidade excelente de produto melhor
      } else if (rating > 4.2 && rating <= 4.6) {
        ratingFactor = 70; // Boa aceitação geral
      } else if (rating > 4.6) {
        ratingFactor = 50; // Concorrente de altíssima satisfação, difícil de superar
      } else {
        ratingFactor = 40; // Livro fraco ou dados ruidosos
      }
    }

    // 4. Fator de Preço e Margem (0 a 100)
    // Preço saudável permite boa margem de lucro por exemplar
    let priceFactor = 50;
    if (price !== null && price !== undefined && price > 0) {
      if (price >= 24 && price <= 65) priceFactor = 95;
      else if (price >= 14 && price < 24) priceFactor = 80;
      else if (price > 65) priceFactor = 65;
      else if (price >= 8) priceFactor = 50;
      else priceFactor = 20; // Preço muito baixo comprime royalties
    }

    // 5. Fator de Recência / Idade (0 a 100)
    // Livro novo vendendo bem indica tendência quente
    let recencyFactor = 50;
    if (ageDays !== null && ageDays !== undefined && ageDays >= 0) {
      if (ageDays <= 90) recencyFactor = 95; // Lançamento com tração
      else if (ageDays <= 180) recencyFactor = 80;
      else if (ageDays <= 365) recencyFactor = 65;
      else if (ageDays <= 730) recencyFactor = 50;
      else recencyFactor = 35; // Livro antigo já consolidado
    }

    // Cálculo ponderado
    const totalWeight = 
      this.weights.salesWeight + 
      this.weights.reviewBarrierWeight + 
      this.weights.ratingWeight + 
      this.weights.priceWeight + 
      this.weights.recencyWeight;

    const weightedScore = 
      (salesFactor * this.weights.salesWeight) +
      (reviewFactor * this.weights.reviewBarrierWeight) +
      (ratingFactor * this.weights.ratingWeight) +
      (priceFactor * this.weights.priceWeight) +
      (recencyFactor * this.weights.recencyWeight);

    const finalScore = Math.round(weightedScore / (totalWeight || 1));

    // Monta explicação em português
    const points: string[] = [];
    if (salesFactor >= 70) points.push('Forte demanda de vendas');
    if (reviewFactor >= 70) points.push('Barreira de avaliações baixa (acessível)');
    if (reviewFactor <= 30) points.push('Barreira de avaliações alta (mercado consolidado)');
    if (ratingFactor >= 80) points.push('Margem para produto de maior qualidade');
    if (priceFactor >= 80) points.push('Boa margem de preço/lucro');
    if (recencyFactor >= 80) points.push('Lançamento recente com boa tração');

    const explanation = points.length > 0 
      ? points.join(' • ') 
      : 'Balanço neutro entre demanda e concorrência.';

    return {
      score: Math.min(100, Math.max(0, finalScore)),
      factors: {
        salesFactor,
        reviewFactor,
        ratingFactor,
        priceFactor,
        recencyFactor
      },
      explanation
    };
  }
}

export const defaultOpportunityCalculator = new OpportunityScoreCalculator();
