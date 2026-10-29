import { describe, it, expect } from 'vitest';
import { KdpTitleSuggestionEngine } from '../src/services/kdp-title-suggestion-engine';

describe('KdpTitleSuggestionEngine', () => {
  it('gera sugestões apropriadas para Thriller / Mistério sem fórmulas genéricas de autoajuda', () => {
    const suggestions = KdpTitleSuggestionEngine.getSuggestionsForTheme('Thriller psicológico', 'Suspense doméstico');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].kind).toBe('ficcao');
    // Não deve conter títulos com 'O Novo Código de'
    suggestions.forEach(s => {
      expect(s.title).not.toContain('O Novo Código de');
      expect(s.subtitle).not.toContain('Como alcançar resultados superiores');
    });
  });

  it('descontrói bestsellers de suspense (ex: Garota Exemplar) gerando títulos adequados de thriller', () => {
    const book = {
      title: 'Garota Exemplar',
      bsr: 12500,
      author: 'Gillian Flynn'
    };
    const inspired = KdpTitleSuggestionEngine.generateInspiredFromBook(book, 'Thriller psicológico');
    expect(inspired.title).toBeDefined();
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
    expect(inspired.uniqueAngle).toBeDefined();
  });
});

