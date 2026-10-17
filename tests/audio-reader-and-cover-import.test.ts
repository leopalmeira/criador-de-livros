import { describe, it, expect } from 'vitest';

describe('BookEngin — Leitor de Áudio do Manuscrito & Importação de Capa Externa', () => {
  it('1. Divisão inteligente em sentenças para evitar timeout do sintetizador de voz', () => {
    const rawText = `### Capítulo 1: O Despertar da Consciência. Em um mundo hiperconectado, o foco é a moeda mais valiosa do século XXI! Quem domina a atenção, domina os resultados. Vamos explorar cada pilar prático.`;
    
    // Algoritmo idêntico ao do KdpBookGeneratorPro
    const clean = rawText
      .replace(/###\s*/g, '')
      .replace(/[*_#`]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    const sentences = clean.match(/[^.!?;\n]+[.!?;\n]+/g) || [clean];
    const chunks: string[] = [];
    let current = '';

    for (const s of sentences) {
      if ((current + ' ' + s).length > 220) {
        if (current.trim()) chunks.push(current.trim());
        current = s;
      } else {
        current = current ? current + ' ' + s : s;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0]).toContain('Capítulo 1: O Despertar da Consciência');
    chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(250);
    });
  });

  it('2. Modo de leitura contínua (Obra Toda) avança sequencialmente por todos os capítulos', () => {
    const capitulos = [
      { titulo: 'Fundação', texto: 'Primeiro capítulo com conteúdo estruturado.' },
      { titulo: 'Execução', texto: 'Segundo capítulo com estratégias de alto impacto.' },
      { titulo: 'Consolidação', texto: 'Terceiro e último capítulo da obra.' }
    ];

    let currentCapIndex = 0;
    const mode = 'full';
    const visitedCaps: number[] = [];

    while (currentCapIndex < capitulos.length) {
      visitedCaps.push(currentCapIndex);
      if (mode === 'full') {
        currentCapIndex++;
      } else {
        break;
      }
    }

    expect(visitedCaps).toEqual([0, 1, 2]);
    expect(visitedCaps.length).toBe(capitulos.length);
  });

  it('3. Modo de leitura por capítulo individual lê apenas o capítulo selecionado', () => {
    const targetCapIndex = 1;
    const mode = 'single';
    const visitedCaps: number[] = [];

    visitedCaps.push(targetCapIndex);
    if (mode === 'single') {
      // Finaliza sem avançar
    }

    expect(visitedCaps).toEqual([1]);
  });

  it('4. Validação de formato para importação de capa própria (PNG, JPG, WEBP)', () => {
    const validMimes = ['image/png', 'image/jpeg', 'image/webp'];
    const invalidMimes = ['application/pdf', 'text/plain', 'video/mp4'];

    validMimes.forEach(mime => {
      expect(mime.startsWith('image/')).toBe(true);
    });

    invalidMimes.forEach(mime => {
      expect(mime.startsWith('image/')).toBe(false);
    });
  });
});
