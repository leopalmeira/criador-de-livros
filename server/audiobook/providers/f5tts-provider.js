// ================================================================
// F5TTSProvider — F5-TTS (servidor próprio com wrapper HTTP)
// Contrato do wrapper:
//   GET  {F5TTS_SERVER_URL}/health
//   POST {F5TTS_SERVER_URL}/api/tts  { text, language, voice_gender }
//        → audio/mpeg (ou audio/wav, convertido via ffmpeg)
// Configuração SOMENTE no backend:
//   F5TTS_SERVER_URL, F5TTS_API_KEY (opcional), F5TTS_LANGUAGES (padrão: pt-BR,en-US)
// ================================================================

import { TTSProvider, fetchWithTimeout } from './tts-provider.js';
import { resolveLanguage } from '../languages.js';
import { isMp3, convertToMp3 } from '../mp3.js';

export class F5TTSProvider extends TTSProvider {
  name = 'f5-tts';
  priority = 100;
  maxChars = 300;

  constructor(env = process.env) {
    super();
    this.baseUrl = String(env.F5TTS_SERVER_URL || '').replace(/\/+$/, '');
    this.apiKey = env.F5TTS_API_KEY || '';
    this.languages = String(env.F5TTS_LANGUAGES || 'pt-BR,en-US')
      .split(',')
      .map((l) => resolveLanguage(l)?.id)
      .filter(Boolean);
  }

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  async isAvailable() {
    if (!this.baseUrl) return false;
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/health`, { headers: this.headers() }, 3000);
      return res.ok;
    } catch {
      return false;
    }
  }

  supports(language) {
    const lang = resolveLanguage(language);
    return Boolean(this.baseUrl && lang && this.languages.includes(lang.id));
  }

  async synthesizeSegment(text, language, voiceGender) {
    const lang = resolveLanguage(language);
    const res = await fetchWithTimeout(
      `${this.baseUrl}/api/tts`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ text, language: lang.id, voice_gender: voiceGender })
      },
      120000
    );
    if (!res.ok) throw new Error(`Motor respondeu HTTP ${res.status}`);
    const audio = Buffer.from(await res.arrayBuffer());
    return isMp3(audio) ? audio : convertToMp3(audio);
  }
}
