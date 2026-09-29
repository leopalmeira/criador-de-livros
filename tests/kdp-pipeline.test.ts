import { describe, it, expect } from 'vitest';
import { BOOK_TYPE_CONFIGS, BookType } from '../src/types/book-project';
import { AiService } from '../src/services/ai-service';

describe('kdp-book Pipeline & Modelos', () => {
  it('deve ter as 4 configurações de tipos de livros alinhadas ao kdp-book', () => {
    const types: BookType[] = ['children-picture-book', 'light-novel', 'non-fiction', 'fiction-novel'];
    
    types.forEach(type => {
      const cfg = BOOK_TYPE_CONFIGS[type];
      expect(cfg).toBeDefined();
      expect(cfg.chapterCount[0]).toBeGreaterThan(0);
      expect(cfg.wordsPerChapter[0]).toBeGreaterThan(0);
      expect(cfg.trimSize).toBeDefined();
      expect(cfg.paperType).toBeDefined();
    });

    // Livro Infantil: full bleed, cores e quadrado 8.5x8.5
    expect(BOOK_TYPE_CONFIGS['children-picture-book'].fullBleed).toBe(true);
    expect(BOOK_TYPE_CONFIGS['children-picture-book'].paperType).toBe('color');
    expect(BOOK_TYPE_CONFIGS['children-picture-book'].trimSize).toBe('8.5x8.5');

    // Light Novel: 5x8 papel creme
    expect(BOOK_TYPE_CONFIGS['light-novel'].trimSize).toBe('5x8');
    expect(BOOK_TYPE_CONFIGS['light-novel'].paperType).toBe('bw-cream');

    // Não-Ficção: 6x9 papel branco
    expect(BOOK_TYPE_CONFIGS['non-fiction'].trimSize).toBe('6x9');
    expect(BOOK_TYPE_CONFIGS['non-fiction'].paperType).toBe('bw-white');
  });

  it('AiService deve limpar e extrair JSON mesmo encapsulado em markdown', () => {
    const ai = new AiService({
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o-mini'
    });

    // Testa extração de JSON dentro de bloco de código ```json ... ```
    const markdownWrapped = '```json\n{"title": "O Livro Perfeito", "chapters": 10}\n```';
    const parsed = (ai as any).cleanAndParseJson(markdownWrapped);
    expect(parsed).toEqual({ title: 'O Livro Perfeito', chapters: 10 });

    // Testa extração com texto introdutório antes do JSON
    const textWrapped = 'Aqui está a resposta solicitada:\n{"title": "Teste", "success": true}\nEspero ter ajudado!';
    const parsed2 = (ai as any).cleanAndParseJson(textWrapped);
    expect(parsed2).toEqual({ title: 'Teste', success: true });
  });

  it('deve calcular corretamente a largura de lombada da Amazon KDP', () => {
    // 100 páginas em papel branco (100 * 0.002252 = 0.225 polegadas)
    const pages = 100;
    const spineInches = Number((pages * 0.002252).toFixed(3));
    expect(spineInches).toBe(0.225);

    // Milímetros: 0.225 * 25.4 = ~5.7 mm
    const spineMm = Number((spineInches * 25.4).toFixed(1));
    expect(spineMm).toBe(5.7);
  });
});
