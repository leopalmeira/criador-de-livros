import { describe, it, expect } from 'vitest';
import {
  splitChapterParagraphs,
  getParagraphDisplayText,
  buildChapterNarrationSegments,
  wordIndexForProgress,
  narrationProgressStore
} from '../src/services/narration-sync';

describe('narration-sync: Sincronização Texto ↔ Áudio Neural', () => {
  it('divide parágrafos preservando a mesma estrutura renderizada no DOM', () => {
    const texto = `Primeiro parágrafo do capítulo. Ele tem várias frases.\n\n### Subtítulo Editorial\n\nTerceiro parágrafo longo com reflexões profundas sobre a história.`;
    const paragraphs = splitChapterParagraphs(texto);

    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toContain('Primeiro parágrafo');
    expect(paragraphs[1]).toBe('### Subtítulo Editorial');
    expect(paragraphs[2]).toContain('Terceiro parágrafo');
  });

  it('limpa marcadores de seção com getParagraphDisplayText', () => {
    expect(getParagraphDisplayText('### Revelações Ocultas')).toBe('Revelações Ocultas');
    expect(getParagraphDisplayText('Parágrafo padrão sem marcadores')).toBe('Parágrafo padrão sem marcadores');
  });

  it('constrói segmentos com cabeçalho de capítulo e offsets precisos', () => {
    const chapterText = `No silêncio da noite, Clara abriu o velho diário de couro. As páginas amareladas cheiravam a memórias esquecidas.\n\n### A Primeira Pista\n\nEntre as folhas soltas, havia um bilhete dobrado em quatro partes com um carimbo carmesim.`;
    
    const segments = buildChapterNarrationSegments(1, 'O Despertar da Memória', chapterText);

    // Segmento 0 deve ser o cabeçalho "Capítulo 1: O Despertar da Memória" com paragraphIndex = -1
    expect(segments.length).toBeGreaterThan(3);
    expect(segments[0].paragraphIndex).toBe(-1);
    expect(segments[0].displayText).toContain('Capítulo 1: O Despertar da Memória');

    // Segmentos seguintes devem mapear para os parágrafos corretos
    const paraZeroSegments = segments.filter(s => s.paragraphIndex === 0);
    expect(paraZeroSegments.length).toBeGreaterThanOrEqual(1);

    // Verifica que os offsets start e end batem com o texto exibido
    const paragraphs = splitChapterParagraphs(chapterText);
    for (const seg of segments) {
      if (seg.paragraphIndex >= 0) {
        const fullPara = getParagraphDisplayText(paragraphs[seg.paragraphIndex]);
        const sliced = fullPara.slice(seg.start, seg.end);
        expect(sliced).toBe(seg.displayText);
      }
    }
  });

  it('calcula wordIndexForProgress ponderado por tamanho de palavra', () => {
    const words = ['No', 'silêncio', 'da', 'madrugada', 'profunda'];
    // Progresso 0 deve apontar para o início
    expect(wordIndexForProgress(words, 0)).toBe(0);
    // Progresso 1 deve apontar para a última palavra
    expect(wordIndexForProgress(words, 1)).toBe(words.length - 1);
    // Progresso intermediário
    const mid = wordIndexForProgress(words, 0.5);
    expect(mid).toBeGreaterThanOrEqual(1);
    expect(mid).toBeLessThan(words.length);
  });

  it('narrationProgressStore gerencia estado global e notifica listeners', () => {
    narrationProgressStore.reset();
    expect(narrationProgressStore.getState().active).toBe(false);

    let called = 0;
    const unsubscribe = narrationProgressStore.subscribe(() => {
      called++;
    });

    narrationProgressStore.set({
      active: true,
      capIndex: 2,
      segmentIndex: 1
    });

    expect(called).toBe(1);
    expect(narrationProgressStore.getState().active).toBe(true);
    expect(narrationProgressStore.getState().capIndex).toBe(2);

    narrationProgressStore.reset();
    expect(narrationProgressStore.getState().active).toBe(false);
    expect(called).toBe(2);

    unsubscribe();
    narrationProgressStore.set({ active: true });
    expect(called).toBe(2); // não deve mais incrementar após unsubscribe
  });
});
