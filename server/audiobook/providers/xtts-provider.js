// ================================================================
// XTTSProvider — Coqui XTTS v2 (servidor próprio, ex.: xtts-api-server)
//   GET  {XTTS_SERVER_URL}/speakers_list  (health)
//   POST {XTTS_SERVER_URL}/tts_to_audio/  { text, speaker_wav, language } → WAV
// O WAV é convertido para MP3 via ffmpeg (necessário no servidor).
// Configuração SOMENTE no backend:
//   XTTS_SERVER_URL, XTTS_API_KEY (opcional),
//   XTTS_SPEAKER_MALE (padrão: male), XTTS_SPEAKER_FEMALE (padrão: female)
// ================================================================

import { TTSProvider, fetchWithTimeout } from './tts-provider.js';
import { resolveLanguage } from '../languages.js';
import { isMp3, convertToMp3, hasFfmpeg } from '../mp3.js';

export class XTTSProvider extends TTSProvider {
  name = 'xtts-v2';
  priority = 90;
  maxChars = 220;

  constructor(env = process.env) {
    super();
    this.baseUrl = String(env.XTTS_SERVER_URL || '').replace(/\/+$/, '');
    this.apiKey = env.XTTS_API_KEY || '';
    this.speakers = {
      male: env.XTTS_SPEAKER_MALE || 'male',
      female: env.XTTS_SPEAKER_FEMALE || 'female'
    };
  }

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  async isAvailable() {
    if (!this.baseUrl) return false;
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/speakers_list`, { headers: this.headers() }, 3000);
      return res.ok;
    } catch {
      return false;
    }
  }

  supports(language) {
    return Boolean(this.baseUrl && resolveLanguage(language));
  }

  async synthesizeSegment(text, language, voiceGender) {
    const lang = resolveLanguage(language);
    const res = await fetchWithTimeout(
      `${this.baseUrl}/tts_to_audio/`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ text, speaker_wav: this.speakers[voiceGender], language: lang.xtts })
      },
      120000
    );
    if (!res.ok) throw new Error(`Motor respondeu HTTP ${res.status}`);
    const audio = Buffer.from(await res.arrayBuffer());
    if (isMp3(audio)) return audio;
    if (!(await hasFfmpeg())) throw new Error('Conversor de áudio indisponível para este motor');
    return convertToMp3(audio);
  }
}
