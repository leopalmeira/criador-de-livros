import { describe, it, expect } from 'vitest';
import { BatchTitleTextGenerator } from '../src/services/batch-title-text-generator';
import { CoverGraphicsEngine } from '../src/services/cover-graphics-engine';
import { BatchBookGeneratorService, BatchGenerationSettings } from '../src/services/batch-book-generator-service';

describe('Motor de Diversidade Editorial — Títulos, Subtítulos, Textos e Capas 100% Exclusivos', () => {
  it('1. Deve gerar 20 títulos 100% únicos sem repetição e sem sufixos genéricos ("Vol. 1")', () => {
    const usedTitles = new Set<string>();
    const generated: string[] = [];

    for (let i = 1; i <= 20; i++) {
      const title = BatchTitleTextGenerator.generateUniqueTitle('business', usedTitles, i, 'Negócios');
      generated.push(title);
    }

    expect(generated.length).toBe(20);
    expect(new Set(generated).size).toBe(20); // 20 títulos estritamente únicos!

    // Garante que nenhum título tenha o sufixo antigo preguiçoso "Vol. 1" ou "Vol. 2"
    for (const title of generated) {
      expect(title).not.toMatch(/Vol\.\s*\d+/i);
    }
  });

  it('2. Deve gerar 20 subtítulos 100% únicos e sem repetição para o mesmo gênero', () => {
    const usedSubtitles = new Set<string>();
    const generated: string[] = [];

    for (let i = 1; i <= 20; i++) {
      const subtitle = BatchTitleTextGenerator.generateUniqueSubtitle(
        'business', 
        `Livro de Gestão ${i}`, 
        usedSubtitles, 
        i, 
        'Negócios'
      );
      generated.push(subtitle);
    }

    expect(generated.length).toBe(20);
    expect(new Set(generated).size).toBe(20); // 20 subtítulos estritamente únicos!
  });

  it('3. Deve gerar sumários de capítulos diferentes entre livros gerados no mesmo gênero', () => {
    const book1Chapters = BatchTitleTextGenerator.generateUniqueChapterOutline(
      'business',
      'Construído para Escalar',
      5,
      1
    );

    const book2Chapters = BatchTitleTextGenerator.generateUniqueChapterOutline(
      'business',
      'A Lógica do Monopólio',
      5,
      2
    );

    expect(book1Chapters.length).toBe(5);
    expect(book2Chapters.length).toBe(5);

    // O primeiro capítulo do Livro 1 deve ser diferente do primeiro capítulo do Livro 2
    expect(book1Chapters[0].theme).not.toBe(book2Chapters[0].theme);
    expect(book1Chapters[1].theme).not.toBe(book2Chapters[1].theme);
  });

  it('4. Deve gerar textos integrais de capítulos com introduções e parágrafos exclusivos', () => {
    const contentBook1 = BatchTitleTextGenerator.generateUniqueChapterContent(
      'Construído para Escalar',
      'Como criar processos autônomos e multiplicar o valuation.',
      'Capítulo 1: O Diagnóstico Inicial',
      'Diagnóstico Estrutural',
      'Negócios',
      400,
      1,
      5,
      1
    );

    const contentBook2 = BatchTitleTextGenerator.generateUniqueChapterContent(
      'A Lógica do Monopólio Criativo',
      'Como descobrir vantagens secretas e liderar mercados.',
      'Capítulo 1: A Nova Perspectiva',
      'Primeiros Princípios',
      'Negócios',
      400,
      1,
      5,
      2
    );

    // O texto deve ter densidade substancial
    expect(contentBook1.length).toBeGreaterThan(500);
    expect(contentBook2.length).toBeGreaterThan(500);

    // Os textos de abertura devem ser completamente diferentes
    const intro1 = contentBook1.split('\n\n')[1];
    const intro2 = contentBook2.split('\n\n')[1];
    expect(intro1).not.toBe(intro2);
  });

  it('5. Capas devem variar layout, tipografia, paletas e silhuetas entre livros', () => {
    const coverData1 = CoverGraphicsEngine.generateHighResCoverDataUrl({
      title: 'The United World',
      subtitle: 'Quando uma nova ordem desperta',
      author: 'Craig Priestley',
      genre: 'Ficção Científica, Cyberpunk & Distopia',
      seedIndex: 1
    });

    const coverData2 = CoverGraphicsEngine.generateHighResCoverDataUrl({
      title: 'O Enigma do Labirinto',
      subtitle: 'Nenhum segredo permanece enterrado para sempre',
      author: 'Leandro Palmeira',
      genre: 'Thriller Psicológico, Suspense & Crime',
      seedIndex: 2
    });

    const coverData3 = CoverGraphicsEngine.generateHighResCoverDataUrl({
      title: 'A Arte da Marcenaria Fina',
      subtitle: 'Encaixes nobres e técnicas manuais',
      author: 'Mestre da Oficina',
      genre: 'Manuais Técnicos, Marcenaria & Faça Você Mesmo (DIY)',
      seedIndex: 3
    });

    expect(coverData1).toContain('data:image/svg+xml;base64,');
    expect(coverData2).toContain('data:image/svg+xml;base64,');
    expect(coverData3).toContain('data:image/svg+xml;base64,');

    // As três capas devem ser distintas
    expect(coverData1).not.toBe(coverData2);
    expect(coverData2).not.toBe(coverData3);

    // Decodifica a primeira capa para validar elementos do estilo da imagem do usuário
    const decodedSvg1 = Buffer.from(coverData1.replace('data:image/svg+xml;base64,', ''), 'base64').toString('utf-8');
    // Deve conter elementos de silhueta ou emblema ou tipografia em duas espessuras
    expect(decodedSvg1).toMatch(/(UNITED|WORLD|font-weight="900"|font-weight="200"|<polygon|<path)/);
  });

  it('6. Deve suportar todos os gêneros KDP com vocabulário contextual rico', () => {
    const genresToTest = [
      'business', 'self-help', 'finance', 'health-longevity', 'psychology',
      'thriller', 'scifi', 'fantasy', 'romance', 'diy-woodworking',
      'culinary', 'biography', 'philosophy', 'marketing'
    ];

    const usedTitles = new Set<string>();
    for (const g of genresToTest) {
      const title = BatchTitleTextGenerator.generateUniqueTitle(g, usedTitles, 1);
      expect(title).toBeDefined();
      expect(title.length).toBeGreaterThan(5);
    }
    expect(usedTitles.size).toBe(genresToTest.length);
  });
});
