// ================================================================
// BasicFallbackProvider — último recurso quando nenhum outro motor
// responde. Não permite escolher gênero (voz única do serviço), por isso
// fica sempre por último e é registrado no metadata.json.
// ================================================================

import { TTSProvider, fetchWithTimeout } from './tts-provider.js';
import { resolveLanguage } from '../languages.js';
import { isMp3 } from '../mp3.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class BasicFallbackProvider extends TTSProvider {
  name = 'basic-fallback';
  priority = 10;
  maxChars = 180;
  honorsGender = false;

  async isAvailable() {
    return true;
  }

  supports(language) {
    return Boolean(resolveLanguage(language));
  }

  async synthesizeSegment(text, language) {
    const lang = resolveLanguage(language);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang.basic)}&client=tw-ob&q=${encodeURIComponent(text)}`;
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, 20000);
    if (!res.ok) throw new Error(`Serviço de voz respondeu HTTP ${res.status}`);
    const audio = Buffer.from(await res.arrayBuffer());
    if (!isMp3(audio)) throw new Error('Resposta de áudio inválida');
    await sleep(120); // respeita o limite de requisições do serviço
    return audio;
  }
}
