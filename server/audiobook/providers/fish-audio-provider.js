// ================================================================
// FishAudioProvider — Fish Audio official text-to-speech API
// Credentials and voice model IDs are configured on the backend only.
// ================================================================

import { TTSProvider, fetchWithTimeout } from './tts-provider.js';
import { resolveLanguage } from '../languages.js';
import { isMp3, convertToMp3 } from '../mp3.js';

export class FishAudioProvider extends TTSProvider {
  name = 'fish-audio';
  priority = 120;
  maxChars = 1200;

  constructor(env = process.env) {
    super();
    this.apiKey = String(env.FISH_API_KEY || '').trim();
    this.voiceIds = {
      male: String(env.FISH_VOICE_ID_MALE || '').trim(),
      female: String(env.FISH_VOICE_ID_FEMALE || '').trim()
    };
    this.singleVoiceId = String(env.FISH_VOICE_ID || '').trim();
    this.model = String(env.FISH_MODEL || 's2.1-pro-free').trim();
    this.honorsGender = Boolean(this.voiceIds.male && this.voiceIds.female);
  }

  headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      model: this.model
    };
  }

  voiceFor(language, voiceGender) {
    if (!resolveLanguage(language)) return null;
    return this.voiceIds[voiceGender] || this.singleVoiceId || null;
  }

  async isAvailable() {
    return Boolean(this.apiKey && (this.singleVoiceId || (this.voiceIds.male && this.voiceIds.female)));
  }

  supports(language, voiceGender) {
    return Boolean(this.apiKey && this.voiceFor(language, voiceGender));
  }

  async synthesizeSegment(text, language, voiceGender) {
    const referenceId = this.voiceFor(language, voiceGender);
    if (!referenceId) throw new Error('Configure um ID de voz Fish Audio para este gênero');

    const res = await fetchWithTimeout(
      'https://api.fish.audio/v1/tts',
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          text,
          reference_id: referenceId,
          format: 'mp3',
          mp3_bitrate: 128,
          normalize: true
        })
      },
      120000
    );

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      throw new Error(`Fish Audio respondeu HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
    }

    const audio = Buffer.from(await res.arrayBuffer());
    return isMp3(audio) ? audio : convertToMp3(audio);
  }
}
