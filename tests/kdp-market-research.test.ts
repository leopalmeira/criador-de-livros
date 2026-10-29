import { describe, it, expect } from 'vitest';
import {
  KdpMarketResearchService,
  calculateEstimatesFromBsr
} from '../src/services/kdp-market-research';

describe('KDP Market Research Service & BSR Calibrations', () => {
  it('calibra faturamento USD para BSR próximo de 80.000 (~$500 USD/mês)', () => {
    const estimates = calculateEstimatesFromBsr(80000);
    // Usuário especificou: livros com BSR abaixo de 80.000 fazem em média 500 USD/mês
    expect(estimates.monthlyRevenueUsd).toBeGreaterThanOrEqual(450);
    expect(estimates.monthlyRevenueUsd).toBeLessThanOrEqual(580);
    expect(estimates.monthlySales).toBeGreaterThanOrEqual(70);
  });

  it('calibra faturamento USD para faixa de 20k a 30k BSR (~$1.200 a $1.800 USD/mês)', () => {
    const estimates20k = calculateEstimatesFromBsr(20000);
    const estimates25k = calculateEstimatesFromBsr(25000);
    const estimates30k = calculateEstimatesFromBsr(30000);

    expect(estimates25k.monthlyRevenueUsd).toBeGreaterThanOrEqual(1000);
    expect(estimates25k.monthlyRevenueUsd).toBeLessThanOrEqual(1600);

    expect(estimates20k.monthlyRevenueUsd).toBeGreaterThan(estimates30k.monthlyRevenueUsd);
  });

  it('filtra corretamente livros por faixa de BSR e mínimo de 20 avaliações positivas', async () => {
    const result = await KdpMarketResearchService.analyzeNiche({
      theme: 'Foco e Hábitos',
      minBsr: 20000,
      maxBsr: 30000,
      minReviews: 20
    });

    expect(result).toBeDefined();
    expect(result.theme).toBe('Foco e Hábitos');
    expect(result.books.length).toBeGreaterThan(0);

    result.books.forEach(book => {
      expect(book.bsr).toBeGreaterThanOrEqual(20000);
      expect(book.bsr).toBeLessThanOrEqual(30000);
      expect(book.reviewsCount).toBeGreaterThanOrEqual(20);
      expect(book.rating).toBeGreaterThanOrEqual(4.0);
      expect(book.coverUrl).toBeDefined();
      expect(book.estimatedMonthlyRevenueUsd).toBeGreaterThan(0);
    });

    expect(result.metrics.averageRevenueUsd).toBeGreaterThanOrEqual(700);
    expect(result.metrics.bsrRange.min).toBe(20000);
    expect(result.metrics.bsrRange.max).toBe(30000);
  });

  it('fornece sugestões de títulos e subtítulos inspirados nos concorrentes', async () => {
    const result = await KdpMarketResearchService.analyzeNiche({
      theme: 'Inteligência Artificial',
      minBsr: 1,
      maxBsr: 80000,
      minReviews: 20
    });

    expect(result.suggestedTitles.length).toBe(5);
    expect(result.suggestedSubtitles.length).toBe(5);

    result.suggestedTitles.forEach(t => {
      expect(t.title.length).toBeGreaterThan(3);
      expect(t.rationale.length).toBeGreaterThan(3);
    });

    result.suggestedSubtitles.forEach(s => {
      expect(s.subtitle.length).toBeGreaterThan(5);
      expect(s.rationale.length).toBeGreaterThan(3);
    });
  });
});
