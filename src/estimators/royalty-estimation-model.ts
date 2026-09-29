import { BookFormat, RoyaltySettings } from '../types';
import { DEFAULT_SETTINGS } from '../database/defaults';

export interface RoyaltyCalculationResult {
  unitRoyalty: number | null;
  royaltyRateFormatted: string;
  estimatedDailyRoyalty: number | null;
  estimatedMonthlyRoyalty: number | null;
  notes: string;
}

export class RoyaltyEstimator {
  private settings: RoyaltySettings;

  constructor(settings?: RoyaltySettings) {
    this.settings = settings || DEFAULT_SETTINGS.royaltySettings['BRL'];
  }

  setSettings(settings: RoyaltySettings) {
    this.settings = settings;
  }

  calculate(
    price: number | undefined | null,
    format: BookFormat | undefined,
    pages?: number,
    dailySales?: number | null,
    monthlySales?: number | null
  ): RoyaltyCalculationResult {
    if (price === undefined || price === null || isNaN(price) || price <= 0) {
      return {
        unitRoyalty: null,
        royaltyRateFormatted: 'N/D',
        estimatedDailyRoyalty: null,
        estimatedMonthlyRoyalty: null,
        notes: 'Preço ausente para cálculo de royalty.'
      };
    }

    let unitRoyalty = 0;
    let rateText = '';
    let notes = '';

    const effectiveFormat = format || 'Kindle';

    switch (effectiveFormat) {
      case 'Kindle': {
        const isHighTier = 
          price >= this.settings.kindleMinPriceForHighRate && 
          price <= this.settings.kindleMaxPriceForHighRate;

        if (isHighTier) {
          // 70% menos taxa de entrega estimada (1MB padrão)
          const deliveryCost = this.settings.kindleDeliveryCostPerMb;
          const netPrice = Math.max(0, price - deliveryCost);
          unitRoyalty = netPrice * this.settings.kindleRateHigh;
          rateText = `${(this.settings.kindleRateHigh * 100).toFixed(0)}%`;
          notes = `Faixa de 70% com dedução de taxa de entrega (${deliveryCost.toFixed(2)}).`;
        } else {
          // 35% sem taxa de entrega
          unitRoyalty = price * this.settings.kindleRateLow;
          rateText = `${(this.settings.kindleRateLow * 100).toFixed(0)}%`;
          notes = `Faixa padrão de 35% (preço fora do intervalo 70%).`;
        }
        break;
      }

      case 'Capa Comum':
      case 'Livro de Bolso': {
        const bookPages = pages && pages > 24 ? pages : 160; // 160 páginas como estimativa de fallback
        const printCost = this.settings.paperbackFixedCost + (bookPages * this.settings.paperbackPerPageCost);
        const grossRoyalty = price * this.settings.paperbackRoyaltyRate;
        const netRoyalty = grossRoyalty - printCost;

        unitRoyalty = Math.max(0, netRoyalty);
        rateText = `${(this.settings.paperbackRoyaltyRate * 100).toFixed(0)}% KDP Print`;
        notes = `Fórmula KDP Print: (Preço × 60%) - Custo Impressão (~${printCost.toFixed(2)} para ${bookPages} páginas).`;
        break;
      }

      case 'Capa Dura': {
        const bookPages = pages && pages > 24 ? pages : 200;
        const printCost = this.settings.hardcoverFixedCost + (bookPages * this.settings.hardcoverPerPageCost);
        const grossRoyalty = price * this.settings.hardcoverRoyaltyRate;
        const netRoyalty = grossRoyalty - printCost;

        unitRoyalty = Math.max(0, netRoyalty);
        rateText = `${(this.settings.hardcoverRoyaltyRate * 100).toFixed(0)}% KDP Hardcover`;
        notes = `Fórmula KDP Capa Dura: (Preço × 60%) - Custo Impressão (~${printCost.toFixed(2)}).`;
        break;
      }

      case 'Audiobook': {
        unitRoyalty = price * this.settings.audiobookRoyaltyRate;
        rateText = `${(this.settings.audiobookRoyaltyRate * 100).toFixed(0)}% Audible`;
        notes = `Taxa padrão Audible/ACX para distribuição.`;
        break;
      }

      default: {
        // Fallback genérico para outros formatos
        unitRoyalty = price * 0.50;
        rateText = '50% Estimado';
        notes = 'Estimativa genérica para formato não catalogado.';
        break;
      }
    }

    const roundedUnit = Number(unitRoyalty.toFixed(2));
    const estimatedDailyRoyalty = (dailySales !== null && dailySales !== undefined) 
      ? Number((roundedUnit * dailySales).toFixed(2)) 
      : null;
    const estimatedMonthlyRoyalty = (monthlySales !== null && monthlySales !== undefined)
      ? Number((roundedUnit * monthlySales).toFixed(2))
      : null;

    return {
      unitRoyalty: roundedUnit,
      royaltyRateFormatted: rateText,
      estimatedDailyRoyalty,
      estimatedMonthlyRoyalty,
      notes
    };
  }
}

export const defaultRoyaltyEstimator = new RoyaltyEstimator();
