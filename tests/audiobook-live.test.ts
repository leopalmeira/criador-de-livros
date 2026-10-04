import { describe, it, expect } from 'vitest';
import { NeuralCloudTTSProvider } from '../server/audiobook/providers/neural-cloud-provider.js';
import { isMp3, mp3DurationSeconds } from '../server/audiobook/mp3.js';

describe('AudiobookStudio — Síntese Neural Real com Vozes Masculinas e Femininas', () => {
  const provider = new NeuralCloudTTSProvider();

  it('1. Síntese Real: Português (Brasil) Voz Masculina', async () => {
    const isAvail = await provider.isAvailable();
    if (!isAvail) {
      console.warn('Provedor neural offline no ambiente atual');
      return;
    }
    const audio = await provider.synthesizeSegment('Olá leitor. Bem-vindo ao seu novo audiobook.', 'pt-BR', 'male');
    expect(isMp3(audio)).toBe(true);
    expect(audio.length).toBeGreaterThan(1000);
    const dur = mp3DurationSeconds(audio);
    expect(dur).toBeGreaterThan(0.5);
  }, 15000);

  it('2. Síntese Real: Português (Brasil) Voz Feminina', async () => {
    const isAvail = await provider.isAvailable();
    if (!isAvail) return;
    const audio = await provider.synthesizeSegment('Este é o primeiro capítulo narrado em voz feminina.', 'pt-BR', 'female');
    expect(isMp3(audio)).toBe(true);
    expect(audio.length).toBeGreaterThan(1000);
  }, 15000);

  it('3. Síntese Real: Inglês Voz Masculina', async () => {
    const isAvail = await provider.isAvailable();
    if (!isAvail) return;
    const audio = await provider.synthesizeSegment('Welcome to your professional audiobook production.', 'en-US', 'male');
    expect(isMp3(audio)).toBe(true);
    expect(audio.length).toBeGreaterThan(1000);
  }, 15000);

  it('4. Síntese Real: Inglês Voz Feminina', async () => {
    const isAvail = await provider.isAvailable();
    if (!isAvail) return;
    const audio = await provider.synthesizeSegment('Chapter one, the beginning of an unforgettable journey.', 'en-US', 'female');
    expect(isMp3(audio)).toBe(true);
    expect(audio.length).toBeGreaterThan(1000);
  }, 15000);
});
