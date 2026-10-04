// ================================================================
// KokoroProvider — Kokoro TTS (servidor próprio compatível com a API
// OpenAI /v1/audio/speech, ex.: Kokoro-FastAPI)
// Configuração SOMENTE no backend:
//   KOKORO_SERVER_URL=http://host:8880   KOKORO_API_KEY=(opcional)
// ================================================================

import { TTSProvider, fetchWithTimeout } from './tts-provider.js';
import { resolveLanguage } from '../languages.js';
import { isMp3, convertToMp3 } from '../mp3.js';

export class KokoroProvider extends TTSProvider {
  name = 'kokoro';
  priority = 80;
  maxChars = 1800;

  constructor(env = process.env) {
    super();
    this.baseUrl = String(env.KOKORO_SERVER_URL || '').replace(/\/+$/, '');
    this.apiKey = env.KOKORO_API_KEY || '';
  }

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  voiceFor(language, voiceGender) {
    return resolveLanguage(language)?.kokoro?.[voiceGender] || null;
  }

  async isAvailable() {
    if (!this.baseUrl) return false;
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/health`, { headers: this.headers() }, 3000);
      if (res.ok) return true;
      const alt = await fetchWithTimeout(`${this.baseUrl}/v1/models`, { headers: this.headers() }, 3000);
      return alt.ok;
    } catch {
      return false;
    }
  }

  supports(language, voiceGender) {
    return Boolean(this.baseUrl && this.voiceFor(language, voiceGender));
  }

  async synthesizeSegment(text, language, voiceGender) {
    const voice = this.voiceFor(language, voiceGender);
    if (!voice) throw new Error('Voz indisponível para este idioma/gênero');
    const res = await fetchWithTimeout(
      `${this.baseUrl}/v1/audio/speech`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ model: 'kokoro', input: text, voice, response_format: 'mp3', speed: 1.0 })
      },
      90000
    );
    if (!res.ok) throw new Error(`Motor respondeu HTTP ${res.status}`);
    const audio = Buffer.from(await res.arrayBuffer());
    return isMp3(audio) ? audio : convertToMp3(audio);
  }
}
