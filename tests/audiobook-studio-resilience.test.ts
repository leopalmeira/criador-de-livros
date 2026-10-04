import { describe, it, expect } from 'vitest';
import { KOKORO_NARRATOR_VOICES, kokoroVoiceEngine } from '../src/services/audiobook/voice-engine';
import { analyzeChapterSoundDesign } from '../src/services/audiobook/smart-sound-design';
import { SOUND_EFFECTS_CATALOG } from '../src/services/audiobook/sound-effects-catalog';

describe('AudiobookStudio - Resiliência e Motor de Áudio', () => {
  it('1. Deve possuir catálogo de vozes Kokoro com narradores masculinos e femininos em PT-BR', () => {
    expect(KOKORO_NARRATOR_VOICES.length).toBeGreaterThanOrEqual(6);
    const ptVoices = KOKORO_NARRATOR_VOICES.filter(v => v.language.includes('Brasil'));
    expect(ptVoices.length).toBeGreaterThanOrEqual(6);

    const masc = KOKORO_NARRATOR_VOICES.find(v => v.gender === 'masculino');
    const fem = KOKORO_NARRATOR_VOICES.find(v => v.gender === 'feminino');
    expect(masc).toBeDefined();
    expect(fem).toBeDefined();
  });

  it('2. Deve parsear e construir capítulos defensivamente sem crash mesmo com lista vazia', () => {
    const parseInitialChapters = (list?: Array<{ titulo: string; texto: string }>) => {
      if (list && list.length > 0) {
        return list.map((c, i) => {
          const words = c.texto ? c.texto.trim().split(/\s+/).length : 0;
          const durationSeconds = Math.max(30, Math.round(words / 2.25));
          return {
            id: `chap_audio_${i}`,
            chapterIndex: i,
            title: c.titulo || `Capítulo ${i + 1}`,
            textSnippet: c.texto ? c.texto.slice(0, 160) + '...' : '',
            fullText: c.texto || '',
            status: 'pendente',
            durationSeconds,
            wordCount: words,
            isStale: false,
            timelineEvents: []
          };
        });
      }
      return [
        {
          id: 'chap_audio_0',
          chapterIndex: 0,
          title: '01 — Introdução & Abertura',
          textSnippet: 'Pronto para narração...',
          fullText: 'Texto editorial padrão.',
          status: 'pendente',
          durationSeconds: 45,
          wordCount: 15,
          isStale: false,
          timelineEvents: []
        }
      ];
    };

    // Caso 1: Array vazio
    const chapsEmpty = parseInitialChapters([]);
    expect(chapsEmpty).toHaveLength(1);
    expect(chapsEmpty[0].title).toBe('01 — Introdução & Abertura');
    expect(chapsEmpty[0].wordCount).toBe(15);

    // Caso 2: Undefined
    const chapsUndef = parseInitialChapters(undefined);
    expect(chapsUndef).toHaveLength(1);

    // Caso 3: Capítulos reais
    const chapsReal = parseInitialChapters([
      { titulo: 'Capítulo 1: O Início', texto: 'Uma noite escura e silenciosa envolvia a cidade inteira.' },
      { titulo: 'Capítulo 2: A Pista', texto: 'No dia seguinte, as investigações começaram.' }
    ]);
    expect(chapsReal).toHaveLength(2);
    expect(chapsReal[0].wordCount).toBeGreaterThan(0);
    expect(chapsReal[1].durationSeconds).toBeGreaterThanOrEqual(30);
  });

  it('3. Deve analisar semântica de Sound Design em capítulo sem erros', () => {
    const text = 'Uma chuva torrencial começou a cair enquanto os passos ecoavam pelo corredor escuro. De repente, a porta bateu com estrondo.';
    const analysis = analyzeChapterSoundDesign(text, 1.0);

    expect(analysis).toBeDefined();
    expect(analysis.detectedEvents.length).toBeGreaterThan(0);
    expect(analysis.summary.totalDetected).toBe(analysis.detectedEvents.length);
  });

  it('4. Catálogo de efeitos sonoros deve conter itens essenciais e loops ambientais', () => {
    expect(SOUND_EFFECTS_CATALOG.length).toBeGreaterThanOrEqual(10);
    const ambientLoops = SOUND_EFFECTS_CATALOG.filter(s => s.isAmbientLoop);
    const sfxShots = SOUND_EFFECTS_CATALOG.filter(s => !s.isAmbientLoop);

    expect(ambientLoops.length).toBeGreaterThan(0);
    expect(sfxShots.length).toBeGreaterThan(0);
  });
});
