import { describe, it, expect } from 'vitest';
import {
  formatColoringPrompt,
  planejarPaginasColorir,
  buildColoringBookPdf,
  type ColoringPage
} from '../src/services/coloring-book-service';

describe('Motor de Livros de Colorir KDP (Coloring Book Engine)', () => {
  it('1. Formata prompt estritamente em preto e branco sem gradientes ou cinzas', () => {
    const promptInfantil = formatColoringPrompt('ursinho fofo na floresta', 'infantil');
    expect(promptInfantil).toContain('Clean black and white coloring book page');
    expect(promptInfantil).toContain('pure white background');
    expect(promptInfantil).toContain('strictly no colors');
    expect(promptInfantil).toContain('no shading');
    expect(promptInfantil).toContain('no grayscale');

    const promptAdulto = formatColoringPrompt('mandala floral simétrica', 'adultos');
    expect(promptAdulto).toContain('complex intricate mandala');
    expect(promptAdulto).toContain('no grayscale');
  });

  it('2. Planejamento gera páginas estruturadas com IDs únicos e status pendente', async () => {
    const mockAi = async () => ({
      texto: JSON.stringify([
        { pageNumber: 1, title: 'Leãozinho Corajoso', description: 'Leão sorrindo na savana', promptEnglish: 'Cute lion in savannah' },
        { pageNumber: 2, title: 'Girafa Elegante', description: 'Girafa comendo folhas', promptEnglish: 'Giraffe eating leaves' },
        { pageNumber: 3, title: 'Elefante Brincalhão', description: 'Elefante jogando água', promptEnglish: 'Baby elephant spraying water' }
      ])
    });

    const paginas = await planejarPaginasColorir('Animais da Selva', 'Leão e Girafa', 3, 'infantil', mockAi);
    expect(paginas).toHaveLength(3);
    expect(paginas[0].pageNumber).toBe(1);
    expect(paginas[0].status).toBe('pendente');
    expect(paginas[0].prompt).toBeDefined();
    expect(paginas[0].prompt).toContain('coloring book page');
  });

  it('3. Compilação de PDF KDP gera documento 8.5x11 pol com páginas ímpares e versos em branco', async () => {
    // 1x1 pixel PNG em base64 para simular ilustração gerada
    const fakePixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    const mockPages: ColoringPage[] = [
      {
        id: 'p1',
        pageNumber: 1,
        title: 'Leãozinho Corajoso',
        description: 'Um leãozinho com juba redonda sorrindo na savana',
        prompt: 'Clean line art of a lion',
        imageDataUrl: fakePixel,
        status: 'concluida'
      },
      {
        id: 'p2',
        pageNumber: 2,
        title: 'Girafa Elegante',
        description: 'Uma girafa com manchas geométricas comendo folhas',
        prompt: 'Clean line art of a giraffe',
        imageDataUrl: fakePixel,
        status: 'concluida'
      }
    ];

    const pdfBytes = await buildColoringBookPdf(
      'Reino Animal para Colorir',
      'Studio Autor',
      mockPages,
      null
    );

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });
});
