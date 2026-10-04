// ================================================================
// NeuralCloudProvider — vozes neurais em nuvem com gênero real
// (masculina/feminina) nos 6 idiomas. Funciona sem servidor próprio e
// sem chave de API; é o motor padrão quando F5/Kokoro/XTTS não estão
// configurados no backend.
// ================================================================

import { TTSProvider, withTimeout } from './tts-provider.js';
import { resolveLanguage } from '../languages.js';

let modPromise = null;
async function loadModule() {
  if (!modPromise) {
    modPromise = import('msedge-tts').then((m) => ({
      MsEdgeTTS: m.MsEdgeTTS ?? m.default?.MsEdgeTTS,
      OUTPUT_FORMAT: m.OUTPUT_FORMAT ?? m.default?.OUTPUT_FORMAT
    }));
  }
  return modPromise;
}

export class NeuralCloudProvider extends TTSProvider {
  name = 'neural-cloud';
  priority = 50;
  maxChars = 2200;

  voiceFor(language, voiceGender) {
    return resolveLanguage(language)?.neural?.[voiceGender] || null;
  }

  async isAvailable() {
    try {
      const { MsEdgeTTS } = await loadModule();
      return typeof MsEdgeTTS === 'function';
    } catch {
      return false;
    }
  }

  supports(language, voiceGender) {
    return Boolean(this.voiceFor(language, voiceGender));
  }

  async synthesizeSegment(text, language, voiceGender) {
    const voice = this.voiceFor(language, voiceGender);
    if (!voice) throw new Error('Voz indisponível para este idioma/gênero');
    const { MsEdgeTTS, OUTPUT_FORMAT } = await loadModule();

    const run = async () => {
      const tts = new MsEdgeTTS();
      try {
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const { audioStream } = tts.toStream(text);
        const chunks = [];
        await new Promise((resolve, reject) => {
          audioStream.on('data', (c) => chunks.push(c));
          audioStream.on('end', resolve);
          audioStream.on('close', resolve);
          audioStream.on('error', reject);
        });
        return Buffer.concat(chunks);
      } finally {
        try {
          tts.close();
        } catch {
          /* conexão já encerrada */
        }
      }
    };

    const audio = await withTimeout(run(), 60000, 'síntese de voz');
    if (audio.length < 400) throw new Error('Áudio vazio retornado pelo motor');
    return audio;
  }
}

export const NeuralCloudTTSProvider = NeuralCloudProvider;
