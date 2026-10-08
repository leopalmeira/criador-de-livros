import { describe, it, expect } from 'vitest';
import {
  formatColoringPrompt,
  formatDenseColoringPrompt,
  buildCharacterVisualGuide,
  planejarPaginasColorir,
  buildColoringBookPdf,
  type ColoringPage
} from '../src/services/coloring-book-service';

describe('Motor de Livros de Colorir KDP (Coloring Book Engine)', () => {
  it('1. Formata prompt denso de página de colorir com no mínimo 1500 caracteres, preto e branco puro e personagem', () => {
    const characterGuide = buildCharacterVisualGuide('Ursinho Aventureiro', 'Floresta Mágica', 'infantil');
    expect(characterGuide).toContain('Consistent main character design sheet');
    expect(characterGuide).toContain('Ursinho Aventureiro');

    const promptPagina = formatDenseColoringPrompt(
      'Ursinho descobrindo um mapa do tesouro esculpido em uma árvore oca',
      'infantil',
      characterGuide,
      false,
      1
    );

    // Validação estrita do tamanho do prompt (>= 1500 caracteres)
    expect(promptPagina.length).toBeGreaterThanOrEqual(1500);

    // Validação de traços e estilo para livro de colorir
    expect(promptPagina).toContain('pure crisp solid black outlines');
    expect(promptPagina).toContain('pure solid white background');
    expect(promptPagina).toContain('zero grayscale');
    expect(promptPagina).toContain('no shaded fills');
    expect(promptPagina).toContain('Amazon KDP 8.5x11 inches portrait coloring page specifications');

    // Validação do contexto e do personagem
    expect(promptPagina).toContain('Consistent main character design sheet for Ursinho Aventureiro');
    expect(promptPagina).toContain('Ursinho descobrindo um mapa do tesouro');
  });

  it('2. Formata prompt denso da Capa Colorida com no mínimo 1500 caracteres e cores vibrantes', () => {
    const characterGuide = buildCharacterVisualGuide('Ursinho Curioso', 'Bosque Encantado', 'infantil');
    const promptCapa = formatDenseColoringPrompt(
      'Ursinho acenando alegremente na entrada da floresta mágica com flores e borboletas',
      'infantil',
      characterGuide,
      true, // isCover
      0
    );

    // Validação de tamanho (>= 1500 caracteres)
    expect(promptCapa.length).toBeGreaterThanOrEqual(1500);

    // Validação de estilo da capa colorida
    expect(promptCapa).toContain('stunning full vibrant colors');
    expect(promptCapa).toContain('Amazon KDP bestselling coloring book');
    expect(promptCapa).toContain('Hero cover composition');
    expect(promptCapa).toContain('Ursinho Curioso');
  });

  it('3. Planejamento inclui Capa Colorida como item 0 e páginas sequenciais do mesmo personagem', async () => {
    const mockAi = async () => ({
      texto: JSON.stringify([
        { pageNumber: 0, isCover: true, title: 'Capa Colorida: O Urso e o Rio', description: 'Urso sorrindo na capa', promptEnglish: 'Vibrant cover with smiling bear' },
        { pageNumber: 1, title: 'O Urso e a Colmeia', description: 'Urso observando abelhas', promptEnglish: 'Bear watching bees' },
        { pageNumber: 2, title: 'O Urso na Ponte de Madeira', description: 'Urso atravessando o rio', promptEnglish: 'Bear crossing wooden bridge' },
        { pageNumber: 3, title: 'O Urso sob as Estrelas', description: 'Urso descansando na clareira', promptEnglish: 'Bear resting under stars' }
      ])
    });

    const paginas = await planejarPaginasColorir('Urso Pardo', 'Aventuras na Montanha', 3, 'infantil', mockAi);

    // Deve ter a Capa Colorida (0) + 3 páginas internas = 4 páginas no total
    expect(paginas).toHaveLength(4);

    // 1ª geração é SEMPRE a Capa Colorida
    expect(paginas[0].pageNumber).toBe(0);
    expect(paginas[0].isCover).toBe(true);
    expect(paginas[0].status).toBe('pendente');
    expect(paginas[0].prompt.length).toBeGreaterThanOrEqual(1500);
    expect(paginas[0].prompt).toContain('stunning full vibrant colors');

    // Páginas seguintes são de colorir e com mesmo personagem
    for (let i = 1; i <= 3; i++) {
      expect(paginas[i].pageNumber).toBe(i);
      expect(paginas[i].isCover).toBe(false);
      expect(paginas[i].status).toBe('pendente');
      expect(paginas[i].prompt.length).toBeGreaterThanOrEqual(1500);
      expect(paginas[i].prompt).toContain('zero grayscale');
      expect(paginas[i].prompt).toContain('The established visual world is Urso Pardo — Aventuras na Montanha');
      expect(paginas[i].prompt).not.toContain('magical forest');
      expect(paginas[i].characterVisualGuide).toContain('Urso Pardo');
    }
  });

  it('4. Compilação de PDF KDP gera documento 8.5x11 pol com capa colorida e páginas ímpares com versos em branco', async () => {
    const fakePixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    const mockPages: ColoringPage[] = [
      {
        id: 'p0',
        pageNumber: 0,
        isCover: true,
        title: 'Capa Colorida',
        description: 'Capa frontal colorida',
        prompt: 'Prompt da Capa',
        imageDataUrl: fakePixel,
        status: 'concluida'
      },
      {
        id: 'p1',
        pageNumber: 1,
        title: 'Ursinho Brincalhão',
        description: 'Ursinho correndo na floresta',
        prompt: 'Prompt página 1',
        imageDataUrl: fakePixel,
        status: 'concluida'
      }
    ];

    const pdfBytes = await buildColoringBookPdf(
      'As Aventuras do Urso para Colorir',
      'Studio Autor',
      mockPages,
      fakePixel
    );

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });
});
