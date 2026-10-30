import { describe, it, expect } from 'vitest';
import { KdpTitleSuggestionEngine } from '../src/services/kdp-title-suggestion-engine';

describe('KdpTitleSuggestionEngine', () => {
  it('gera sugestões apropriadas para Thriller / Mistério sem fórmulas genéricas de autoajuda', () => {
    const suggestions = KdpTitleSuggestionEngine.getSuggestionsForTheme('Thriller psicológico', 'Obsessão');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].kind).toBe('ficcao');
    suggestions.forEach(s => {
      expect(s.title).not.toContain('O Novo Código de');
      expect(s.title).not.toBe('O Efeito O');
      expect(s.subtitle).not.toContain('Como alcançar resultados superiores');
    });
  });

  it('gera títulos similares a partir de uma ideia livre digitada pelo usuário', () => {
    const similar = KdpTitleSuggestionEngine.getSimilarTitles('Obsessão', 'Thriller psicológico', 'Suspense');
    expect(similar.length).toBeGreaterThanOrEqual(4);
    expect(similar[0].kind).toBe('ficcao');
    similar.forEach(s => {
      expect(s.title.toLowerCase()).toContain('obsessão');
      expect(s.title).not.toBe('O Efeito O');
    });
  });

  it('descontrói bestsellers de suspense sem quebrar palavras curtas como "O"', () => {
    const book = {
      title: 'O Colecionador',
      bsr: 12500,
      author: 'John Fowles'
    };
    const inspired = KdpTitleSuggestionEngine.generateInspiredFromBook(book, 'Thriller psicológico');
    expect(inspired.title).toBeDefined();
    expect(inspired.title).not.toBe('O Efeito O');
    expect(inspired.title).not.toContain('O Novo Código de');
    expect(inspired.subtitle).toBeDefined();
    expect(inspired.uniqueAngle).toBeDefined();
    expect(inspired.stance).toBeDefined();
  });

  it('gera sugestões adequadas para Finanças e Negócios', () => {
    const book = {
      title: 'Pai Rico, Pai Pobre',
      bsr: 850,
      author: 'Robert Kiyosaki'
    };
    const inspired = KdpTitleSuggestionEngine.generateInspiredFromBook(book, 'Finanças Pessoais');
    expect(inspired.title).toBe('A Máquina de Liberdade Financeira');
    expect(inspired.subtitle).toContain('patrimônio previsível');
  });

  it('gera sugestões de hábitos e desenvolvimento pessoal com promessas de alta conversão', () => {
    const book = {
      title: 'Hábitos Atômicos',
      bsr: 45,
      author: 'James Clear'
    };
    const inspired = KdpTitleSuggestionEngine.generateInspiredFromBook(book, 'Desenvolvimento Pessoal');
    expect(inspired.title).not.toContain('O Novo Código de');
    expect(inspired.title).not.toBe('O Efeito O');
    expect(inspired.uniqueAngle).toBeDefined();
  });

  it('gera sugestões 100% em American English quando idioma é inglês', () => {
    const suggestions = KdpTitleSuggestionEngine.getSuggestionsForTheme('Psychological Thriller', 'Obsession', [], 'inglês');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].title).toMatch(/^[A-Za-z0-9\s:,'"-]+$/);
    expect(suggestions[0].subtitle).toMatch(/^[A-Za-z0-9\s:,'"-]+$/);
    expect(suggestions[0].title).not.toContain('O Segredo');
    expect(suggestions[0].title).not.toContain('A Garota');
    expect(suggestions[0].rationale).toContain('suspense');
  });

  it('gera inspiração de bestseller 100% em American English para obras em inglês', () => {
    const book = {
      title: 'The Silent Patient',
      bsr: 320,
      author: 'Alex Michaelides'
    };
    const inspired = KdpTitleSuggestionEngine.generateInspiredFromBook(book, 'Thriller', 'inglês');
    expect(inspired.title).toBeDefined();
    expect(inspired.title).not.toContain('O Segredo');
    expect(inspired.title).not.toContain('A Esposa');
    expect(inspired.subtitle).toMatch(/^[A-Za-z0-9\s:,'".!?-]+$/);
  });
});
