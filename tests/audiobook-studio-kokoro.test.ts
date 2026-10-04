import { describe, it, expect } from 'vitest';
import {
  kokoroVoiceEngine,
  KOKORO_NARRATOR_VOICES
} from '../src/services/audiobook/voice-engine';
import {
  SOUND_EFFECTS_CATALOG,
  generateProceduralSoundBuffer
} from '../src/services/audiobook/sound-effects-catalog';
import {
  analyzeChapterSoundDesign
} from '../src/services/audiobook/smart-sound-design';
import {
  audioBufferToWavBlob
} from '../src/services/audiobook/audio-mixer';

describe('AudiobookStudio — Kokoro TTS, Smart Sound Design & Multi-track Mixer', () => {
  it('1. Deve fornecer os 10 perfis de voz do narrador com todas as configurações requeridas', () => {
    expect(KOKORO_NARRATOR_VOICES).toHaveLength(10);

    const genders = KOKORO_NARRATOR_VOICES.map(v => v.gender);
    expect(genders).toContain('masculino');
    expect(genders).toContain('feminino');

    const styles = KOKORO_NARRATOR_VOICES.map(v => v.style);
    expect(styles).toContain('narrativa');
    expect(styles).toContain('jovem');
    expect(styles).toContain('madura');
    expect(styles).toContain('documental');
    expect(styles).toContain('dramatica');
    expect(styles).toContain('calma');
    expect(styles).toContain('suspense');
    expect(styles).toContain('energetica');

    KOKORO_NARRATOR_VOICES.forEach(voice => {
      expect(voice.id).toBeTruthy();
      expect(voice.name).toBeTruthy();
      expect(voice.sampleText).toBeTruthy();
      expect(voice.description).toBeTruthy();
    });
  });

  it('2. O motor Kokoro TTS deve sintetizar áudio WAV neural offline de alta qualidade', async () => {
    const result = await kokoroVoiceEngine.generateVoice({
      text: 'O silêncio reinava na velha biblioteca até que um sussurro mudou tudo.',
      voiceId: 'kokoro-narrativa-masc',
      language: 'Português — Brasil',
      speed: 1.0,
      styleMode: 'natural'
    });

    expect(result.audioBlob).toBeDefined();
    expect(result.audioBlob.size).toBeGreaterThan(1000);
    expect(['audio/wav', 'audio/mpeg']).toContain(result.audioBlob.type);
    expect(result.durationSeconds).toBeGreaterThan(0);
    expect(result.audioUrl).toContain('blob:');
  });

  it('3. Smart Sound Design deve identificar eventos sonoros contextuais e classificar prioridade', () => {
    const chapterText = `
      Uma forte chuva batia contra as janelas.
      Maria caminhou lentamente pelo corredor escuro.
      Então a porta se abriu com um rangido assustador.
      Ele deixou o copo cair no chão e ouviu passos ao longe.
      Um trovão explodiu no céu.
    `;

    const result = analyzeChapterSoundDesign(chapterText, 1.0);

    expect(result.detectedEvents.length).toBeGreaterThanOrEqual(3);
    expect(result.summary.totalDetected).toBeGreaterThanOrEqual(3);

    const eventNames = result.detectedEvents.map(e => e.name);
    // Deve detectar chuva, porta e passos
    const hasRain = eventNames.some(n => n.includes('Chuva'));
    const hasDoor = eventNames.some(n => n.includes('Porta'));
    const hasSteps = eventNames.some(n => n.includes('Passos'));

    expect(hasRain).toBe(true);
    expect(hasDoor).toBe(true);
    expect(hasSteps).toBe(true);

    // Valida prioridades
    expect(result.summary.essentialCount).toBeGreaterThan(0);

    // Valida propriedades da timeline
    result.detectedEvents.forEach(evt => {
      expect(evt.startTimeSeconds).toBeGreaterThanOrEqual(0);
      expect(evt.durationSeconds).toBeGreaterThan(0);
      expect(evt.volume).toBeGreaterThan(0);
      expect(evt.fadeInSeconds).toBeGreaterThan(0);
      expect(evt.fadeOutSeconds).toBeGreaterThan(0);
      expect(evt.enabled).toBe(true);
    });
  });

  it('4. Banco de efeitos (/audio-effects) deve conter as categorias requeridas com licença comercial CC0', () => {
    expect(SOUND_EFFECTS_CATALOG.length).toBeGreaterThanOrEqual(10);

    const categories = new Set(SOUND_EFFECTS_CATALOG.map(s => s.category));
    expect(categories.has('weather')).toBe(true);
    expect(categories.has('doors')).toBe(true);
    expect(categories.has('footsteps')).toBe(true);
    expect(categories.has('vehicles')).toBe(true);
    expect(categories.has('objects')).toBe(true);

    SOUND_EFFECTS_CATALOG.forEach(sfx => {
      expect(sfx.license).toMatch(/CC0|Public Domain|Procedural/i);
      expect(sfx.author).toBeTruthy();
      expect(sfx.durationSeconds).toBeGreaterThan(0);
    });
  });
});
