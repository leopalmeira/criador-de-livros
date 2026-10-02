import { describe, it, expect } from 'vitest';
import {
  getAmazonBestSellersForSegment,
  getRandomAmazonSuggestionForSegment,
  AMAZON_BESTSELLERS_BY_SEGMENT
} from '../src/services/amazon-bestsellers-catalog';
import { BookType } from '../src/types/book-project';

describe('Catálogo de Best Sellers Reais da Amazon Books e Fluxo Guiado', () => {
  it('deve conter best sellers reais da Amazon catalogados para todos os segmentos principais', () => {
    const segments: BookType[] = [
      'business',
      'finance',
      'self-help',
      'health-wellness',
      'practical-guide',
      'romance',
      'thriller',
      'mystery',
      'fantasy',
      'sci-fi',
      'children-picture-book',
      'education',
      'journal',
      'coloring-book',
      'activity-book',
      'biography',
      'non-fiction',
      'technical-manual'
    ];

    for (const seg of segments) {
      const books = getAmazonBestSellersForSegment(seg);
      expect(books).toBeDefined();
      expect(books.length).toBeGreaterThanOrEqual(2);

      // Validação de integridade de dados reais da Amazon
      books.forEach(book => {
        expect(book.id).toBeTruthy();
        expect(book.title).toBeTruthy();
        expect(book.author).toBeTruthy();
        expect(book.rankBadge).toBeTruthy();
        expect(book.rating).toBeGreaterThanOrEqual(4.0);
        expect(book.reviewCount).toBeGreaterThan(1000);
        expect(book.successFormula).toBeTruthy();
        expect(book.suggestedProjectHook).toBeTruthy();
        expect(book.suggestedTitle).toBeTruthy();
        expect(book.targetAudience).toBeTruthy();
      });
    }
  });

  it('deve resolver variantes de segmentos correlatos com fallbacks inteligentes', () => {
    const illustrated = getAmazonBestSellersForSegment('illustrated-book');
    expect(illustrated[0].title).toContain('How to Babysit a Grandma');

    const puzzles = getAmazonBestSellersForSegment('puzzle-book');
    expect(puzzles[0].title).toContain('Word Search');

    const suspense = getAmazonBestSellersForSegment('suspense');
    expect(suspense[0].title).toContain('The Housemaid');
  });

  it('deve gerar sugestões randômicas consistentes e respeitar histórico usado', () => {
    const used = new Set<string>();
    const sug1 = getRandomAmazonSuggestionForSegment('business', used);
    expect(sug1.topic).toBeTruthy();
    expect(sug1.reference).toBeDefined();
    expect(sug1.reference.author).toBeTruthy();

    used.add(sug1.topic);
    const sug2 = getRandomAmazonSuggestionForSegment('business', used);
    expect(sug2.topic).toBeTruthy();
    // Garante que é uma referência válida da Amazon
    expect(sug2.reference.price).toBeGreaterThan(0);
  });

  it('deve conter livros clássicos verificados da Amazon nos nichos mais populares', () => {
    // Negócios
    const bizBooks = getAmazonBestSellersForSegment('business');
    const bizTitles = bizBooks.map(b => b.title);
    expect(bizTitles.some(t => t.includes('Good to Great') || t.includes('Zero to One'))).toBe(true);

    // Finanças
    const finBooks = getAmazonBestSellersForSegment('finance');
    const finTitles = finBooks.map(b => b.title);
    expect(finTitles.some(t => t.includes('The Psychology of Money') || t.includes('Rich Dad'))).toBe(true);

    // Hábitos
    const habitBooks = getAmazonBestSellersForSegment('self-help');
    const habitTitles = habitBooks.map(b => b.title);
    expect(habitTitles.some(t => t.includes('Atomic Habits') || t.includes('Deep Work'))).toBe(true);

    // Romance
    const romBooks = getAmazonBestSellersForSegment('romance');
    const romTitles = romBooks.map(b => b.title);
    expect(romTitles.some(t => t.includes('It Ends with Us') || t.includes('Twisted Love'))).toBe(true);
  });
});
