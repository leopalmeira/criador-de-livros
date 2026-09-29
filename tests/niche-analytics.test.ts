import { describe, it, expect } from 'vitest';
import { NicheAnalytics } from '../src/estimators/niche-analytics';

describe('NicheAnalytics', () => {
  const mockBooks = [
    { asin: 'B001', title: 'Livro 1', author: 'A1', bsr: 1000, price: 30, rating: 4.5, reviewCount: 50, ageDays: 45, estimatedDailySales: 10, estimatedMonthlySales: 300, estimatedMonthlyRevenue: 9000 },
    { asin: 'B002', title: 'Livro 2', author: 'A2', bsr: 2000, price: 25, rating: 4.2, reviewCount: 80, ageDays: 70, estimatedDailySales: 6, estimatedMonthlySales: 180, estimatedMonthlyRevenue: 4500 },
    { asin: 'B003', title: 'Livro 3', author: 'A3', bsr: 5000, price: 35, rating: 4.0, reviewCount: 120, ageDays: 120, estimatedDailySales: 3, estimatedMonthlySales: 90, estimatedMonthlyRevenue: 3150 },
    { asin: 'B004', title: 'Livro 4', author: 'A4', bsr: 15000, price: 40, rating: 4.7, reviewCount: 300, ageDays: 800, estimatedDailySales: 1, estimatedMonthlySales: 30, estimatedMonthlyRevenue: 1200 },
    { asin: 'B005', title: 'Livro 5', author: 'A5', bsr: 50000, price: 20, rating: 3.8, reviewCount: 30, ageDays: 30, estimatedDailySales: 0.5, estimatedMonthlySales: 15, estimatedMonthlyRevenue: 300 }
  ];

  it('deve calcular média e mediana de BSR, Preço e Reviews corretamente', () => {
    const summary = NicheAnalytics.analyze(mockBooks, 'nicho teste', 'https://amazon.com.br');

    expect(summary.totalBooks).toBe(5);
    // BSR ordenado: 1000, 2000, 5000, 15000, 50000 -> Mediana = 5000
    expect(summary.medianBsr).toBe(5000);
    // Preço ordenado: 20, 25, 30, 35, 40 -> Mediana = 30
    expect(summary.medianPrice).toBe(30);
    // Reviews ordenados: 30, 50, 80, 120, 300 -> Mediana = 80
    expect(summary.medianReviews).toBe(80);
    expect(summary.minBsr).toBe(1000);
    expect(summary.maxBsr).toBe(50000);
  });

  it('deve calcular concentração de mercado Top 3', () => {
    const summary = NicheAnalytics.analyze(mockBooks, 'nicho teste');

    // Total daily sales: 10 + 6 + 3 + 1 + 0.5 = 20.5
    // Top 3 sales: 10 + 6 + 3 = 19
    // Concentration = 19 / 20.5 ≈ 92.6% -> 93%
    expect(summary.concentrationTop3).toBeGreaterThanOrEqual(90);
  });

  it('deve identificar novos destaques e títulos evergreen', () => {
    const summary = NicheAnalytics.analyze(mockBooks, 'nicho teste');

    // Livros com ageDays <= 90 e BSR <= 50000: B001, B002, B005 (3 livros)
    expect(summary.newHighPerformersCount).toBe(3);
    // Livro com ageDays >= 730 e BSR <= 30000: B004 (1 livro)
    expect(summary.evergreenCount).toBe(1);
  });
});
