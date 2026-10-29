import { describe, it, expect } from 'vitest';
import {
  AmazonTop100Service,
  AMAZON_TOP_100_SEGMENTS
} from '../src/services/amazon-top100-segments';

describe('AmazonTop100Service — Ranking dos Top 100 Segmentos & Pool Dinâmico de Livros', () => {
  it('1. Deve conter exatamente 100 segmentos numerados de #1 a #100 sem falhas', () => {
    const segments = AmazonTop100Service.getTop100Segments();
    expect(segments.length).toBe(100);
    expect(segments[0].rank).toBe(1);
    expect(segments[99].rank).toBe(100);
    
    // Todos os ranks devem ser sequenciais de 1 a 100
    for (let i = 0; i < 100; i++) {
      expect(segments[i].rank).toBe(i + 1);
    }
  });

  it('2. Todos os segmentos devem ter volume de buscas > 0 e tendência dos últimos 7 dias', () => {
    for (const seg of AMAZON_TOP_100_SEGMENTS) {
      expect(seg.weeklySearchVolume).toBeGreaterThan(0);
      expect(typeof seg.trend7dPercent).toBe('number');
      expect(seg.avgBsr).toBeLessThanOrEqual(80000);
      expect(seg.topCustomerKeywords.length).toBeGreaterThanOrEqual(1);
      expect(seg.books.length).toBeGreaterThan(0);
    }
  });

  it('3. Deve filtrar segmentos por categoria corretamente', () => {
    const autoajuda = AmazonTop100Service.getTop100Segments({ category: 'Desenvolvimento Pessoal' });
    expect(autoajuda.length).toBeGreaterThan(0);
    for (const s of autoajuda) {
      expect(s.category).toBe('Desenvolvimento Pessoal');
    }
  });

  it('4. Deve filtrar segmentos por busca textual de palavras-chave', () => {
    const matches = AmazonTop100Service.getTop100Segments({ query: 'hábitos' });
    expect(matches.length).toBeGreaterThan(0);
  });

  it('5. Deve fornecer um pool ativo de exatamente 10 livros candidatos', () => {
    const pool = AmazonTop100Service.getActiveBookPool('habitos-disciplina', [], 10);
    expect(pool.activeBooks.length).toBe(10);
    expect(pool.activeBooks[0].bsr).toBeLessThanOrEqual(80000);
    expect(pool.activeBooks[0].asin).toBeTruthy();
    expect(pool.activeBooks[0].title).toBeTruthy();
    expect(pool.activeBooks[0].coverImage).toContain('images-na.ssl-images-amazon.com');
  });

  it('6. Descarte dinâmico: ao excluir um livro, repõe imediatamente com outro livro do pool', () => {
    const initialPool = AmazonTop100Service.getActiveBookPool('habitos-disciplina', [], 10);
    const bookToDiscard = initialPool.activeBooks[0];
    
    // Descartamos o primeiro livro
    const updatedPool = AmazonTop100Service.getActiveBookPool('habitos-disciplina', [bookToDiscard.asin], 10);
    expect(updatedPool.activeBooks.length).toBe(10);
    // O livro descartado não pode estar no novo pool
    expect(updatedPool.activeBooks.some(b => b.asin === bookToDiscard.asin)).toBe(false);
  });
});

