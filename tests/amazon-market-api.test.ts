import { describe, it, expect } from 'vitest';
import { AmazonMarketIntelligenceService } from '../src/services/amazon-market-api';

describe('AmazonMarketIntelligenceService — Classificação e Royalties KDP em U$', () => {

  it('1. Deve listar segmentos ordenados por escala de ranking na Amazon', () => {
    const list = AmazonMarketIntelligenceService.getRankedSegments('all');

    expect(list.length).toBeGreaterThanOrEqual(10);
    // Primeiro deve ser #1 Romance
    expect(list[0].rankNumber).toBe(1);
    expect(list[0].id).toBe('romance');

    // #3 deve ser Suspense
    const suspense = list.find(s => s.rankNumber === 3);
    expect(suspense).toBeDefined();
    expect(suspense?.id).toBe('thriller');
    expect(suspense?.unitRoyaltyFormatted).toContain('U$');

    // #102 deve ser Colorir
    const colorir = list.find(s => s.rankNumber === 102);
    expect(colorir).toBeDefined();
    expect(colorir?.id).toBe('coloring-book');
    expect(colorir?.unitRoyaltyFormatted).toContain('U$');
  });

  it('2. Deve filtrar segmentos pelo Top 10 mais vendidos', () => {
    const top10 = AmazonMarketIntelligenceService.getRankedSegments('top10');

    expect(top10.length).toBe(10);
    top10.forEach(s => {
      expect(s.rankNumber).toBeLessThanOrEqual(10);
    });
  });

  it('3. Deve filtrar segmentos por maior royalty (U$ >= 6.00)', () => {
    const highRoyalty = AmazonMarketIntelligenceService.getRankedSegments('high_royalty');

    expect(highRoyalty.length).toBeGreaterThan(0);
    highRoyalty.forEach(s => {
      expect(s.unitRoyaltyUsdMax).toBeGreaterThanOrEqual(6.0);
    });
  });

  it('4. Deve filtrar segmentos de baixo conteúdo / KDP (Colorir, Planners, Passatempos)', () => {
    const lowContent = AmazonMarketIntelligenceService.getRankedSegments('low_content');

    expect(lowContent.some(s => s.id === 'coloring-book')).toBe(true);
    expect(lowContent.some(s => s.id === 'journal')).toBe(true);
    expect(lowContent.some(s => s.id === 'activity-book')).toBe(true);
  });

  it('5. Deve realizar busca textual instantânea por nome ou palavra-chave', () => {
    const searchSuspense = AmazonMarketIntelligenceService.getRankedSegments('all', 'Suspense');
    expect(searchSuspense.some(s => s.id === 'thriller')).toBe(true);

    const searchColorir = AmazonMarketIntelligenceService.getRankedSegments('all', 'Colorir');
    expect(searchColorir.some(s => s.id === 'coloring-book')).toBe(true);
  });

});
