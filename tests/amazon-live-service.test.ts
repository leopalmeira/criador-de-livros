import { describe, it, expect } from 'vitest';
import { AmazonLiveService } from '../src/services/amazon-live-service';

describe('AmazonLiveService - Dados Reais da Amazon em Tempo Real', () => {
  it('1. Puxa sugestões de busca da API oficial da Amazon Books', async () => {
    const suggestions = await AmazonLiveService.getLiveSuggestions('suspense');
    expect(Array.isArray(suggestions)).toBe(true);
    // Deve conter sugestões reais da Amazon
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.toLowerCase().includes('suspense'))).toBe(true);
  });

  it('2. Extrai livros reais com ASIN, capa dos servidores Amazon e preço', async () => {
    const books = await AmazonLiveService.searchAmazonBooks('coloring book', 4);
    expect(Array.isArray(books)).toBe(true);
    expect(books.length).toBeGreaterThan(0);

    const first = books[0];
    expect(first.asin).toBeDefined();
    expect(first.asin.length).toBe(10);
    expect(first.title).toBeDefined();
    expect(first.coverImage).toContain('amazon.com');
    expect(first.priceUsd).toBeGreaterThan(0);
    expect(first.royaltyEstUsd).toBeGreaterThan(0);
    expect(first.amazonUrl).toContain(`https://www.amazon.com/dp/${first.asin}`);
  }, 20000);
});
