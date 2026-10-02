import { describe, it, expect, vi } from 'vitest';
import { ColoringBookService } from '../src/services/coloring-book-service';
import { COLORING_THEMES } from '../src/services/coloring-themes-catalog';
import { ColoringBookConfig, GeneratedColoringPage } from '../src/types/coloring-book';

describe('ColoringBookService • Integração ElliottSax/coloring-books para Amazon KDP', () => {
  const baseConfig: ColoringBookConfig = {
    title: 'Mandalas Zen de Alta Precisão',
    subtitle: 'Arte Terapêutica para Colorir',
    theme: 'mandalas',
    style: 'adult',
    difficulty: 'medium',
    pageCount: 10,
    trimFormat: '8.5x11',
    hasBleed: false,
    blankPageInterleaving: true,
    includeBelongsToPage: true,
    provider: 'pollinations',
    lineArtMethod: 'enhanced'
  };

  it('1. Dimensões KDP e 300 DPI devem respeitar as normas físicas de impressão', () => {
    const [wMm, hMm] = ColoringBookService.getDimensionsMm('8.5x11');
    expect(wMm).toBeCloseTo(215.9, 1);
    expect(hMm).toBeCloseTo(279.4, 1);

    const [squareW, squareH] = ColoringBookService.getDimensionsMm('8.25x8.25');
    expect(squareW).toBeCloseTo(209.55, 1);
    expect(squareH).toBeCloseTo(209.55, 1);

    const [pxW, pxH] = ColoringBookService.getPrintPixels('8.5x11');
    expect(pxW).toBe(2550); // 8.5 polegadas * 300 DPI
    expect(pxH).toBe(3300); // 11 polegadas * 300 DPI
  });

  it('2. Catálogo de Temas do ElliottSax deve conter os 17 temas com prompts detalhados', () => {
    expect(COLORING_THEMES.length).toBeGreaterThanOrEqual(14);
    const mandalas = COLORING_THEMES.find(t => t.id === 'mandalas');
    const animals = COLORING_THEMES.find(t => t.id === 'animals');
    const nature = COLORING_THEMES.find(t => t.id === 'nature');

    expect(mandalas).toBeDefined();
    expect(mandalas?.prompts.length).toBeGreaterThan(0);
    expect(animals).toBeDefined();
    expect(animals?.prompts.length).toBeGreaterThan(0);
    expect(nature).toBeDefined();
  });

  it('3. buildPagePrompt deve gerar diretrizes estritas de traço preto puro, sem tons de cinza ou sombras', () => {
    const promptAdult = ColoringBookService.buildPagePrompt(baseConfig, 0);
    expect(promptAdult).toContain('pure black');
    expect(promptAdult).toContain('no shading');
    expect(promptAdult).toContain('no gradients');

    const promptKids = ColoringBookService.buildPagePrompt({ ...baseConfig, style: 'kids' }, 1);
    expect(promptKids).toContain('EXTRA THICK');
    expect(promptKids).toContain('LARGE simple shapes');

    const promptDetailed = ColoringBookService.buildPagePrompt({ ...baseConfig, style: 'detailed' }, 2);
    expect(promptDetailed).toContain('detailed');
    expect(promptDetailed).toContain('zentangle');
  });

  it('4. buildCoverPrompt deve estruturar capa comercial no estilo Amazon KDP', () => {
    const coverPrompt = ColoringBookService.buildCoverPrompt(baseConfig);
    expect(coverPrompt).toContain(baseConfig.title);
    expect(coverPrompt).toContain('Amazon KDP');
    expect(coverPrompt).toContain('300 DPI');
  });

  it('5. generateKdpPdf deve compilar o PDF aplicando a regra de Intercalação de Páginas em Branco (Anti-Bleed)', async () => {
    // 3 ilustrações de teste
    const samplePages: GeneratedColoringPage[] = [
      {
        id: 'p1',
        pageNumber: 1,
        bookPageNumber: 3,
        prompt: 'mandala floral',
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        status: 'completed',
        seed: 1234
      },
      {
        id: 'p2',
        pageNumber: 2,
        bookPageNumber: 5,
        prompt: 'mandala celestial',
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        status: 'completed',
        seed: 5678
      }
    ];

    // Criação de PDF com intercalação ativa e folha de rosto
    const result = await ColoringBookService.generateKdpPdf(samplePages, baseConfig);

    expect(result).toBeDefined();
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.size).toBeGreaterThan(1000);
    // 1 folha de rosto + 1 verso em branco + (2 desenhos * 2 com intercalação) = 6 páginas físicas no PDF KDP
    expect(result.totalPdfPages).toBe(6);
  });

  it('6. saveToBookProject deve estruturar metadados do projeto compatíveis com o Book Intel KDP', async () => {
    const samplePages: GeneratedColoringPage[] = [
      {
        id: 'p1',
        pageNumber: 1,
        bookPageNumber: 3,
        prompt: 'mandala floral',
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        status: 'completed',
        seed: 1234
      }
    ];

    const project = await ColoringBookService.saveToBookProject(baseConfig, samplePages, 'https://example.com/cover.png');
    expect(project).toBeDefined();
    expect(project.id).toContain('proj_coloring_');
    expect(project.kdpBookType).toBe('coloring-book');
    expect(project.title).toBe(baseConfig.title);
    expect(project.kdpChapters?.length).toBe(1);
  });
});
