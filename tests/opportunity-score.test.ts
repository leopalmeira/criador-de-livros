import { describe, it, expect } from 'vitest';
import { OpportunityScoreCalculator } from '../src/estimators/opportunity-score';

describe('OpportunityScoreCalculator', () => {
  const calculator = new OpportunityScoreCalculator();

  it('deve gerar pontuação alta (>= 70) para nicho com alta demanda e poucas avaliações', () => {
    const res = calculator.calculate({
      bsr: 1200,
      estimatedDailySales: 15,
      reviewCount: 35, // Barreira baixa!
      rating: 4.1,     // Espaço para melhoria
      price: 34.90,    // Bom preço
      ageDays: 60      // Recente e com tração
    });

    expect(res.score).toBeGreaterThanOrEqual(70);
    expect(res.score).toBeLessThanOrEqual(100);
    expect(res.explanation).toContain('Barreira de avaliações baixa');
  });

  it('deve gerar pontuação mais baixa para mercado consolidado com milhares de reviews e poucas vendas', () => {
    const res = calculator.calculate({
      bsr: 120000,
      estimatedDailySales: 0.2,
      reviewCount: 4500, // Barreira enorme
      rating: 4.8,
      price: 9.90,
      ageDays: 1500
    });

    expect(res.score).toBeLessThan(45);
    expect(res.explanation).toContain('Barreira de avaliações alta');
  });

  it('deve manter a pontuação estritamente entre 0 e 100', () => {
    const minRes = calculator.calculate({ bsr: 9999999, reviewCount: 99999 });
    const maxRes = calculator.calculate({ bsr: 1, estimatedDailySales: 500, reviewCount: 5, price: 50 });

    expect(minRes.score).toBeGreaterThanOrEqual(0);
    expect(maxRes.score).toBeLessThanOrEqual(100);
  });
});
