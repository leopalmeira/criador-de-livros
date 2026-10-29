// ================================================================
// NeuralCloudProvider — vozes neurais em nuvem com gênero real
// (masculina/feminina) nos 6 idiomas. Funciona sem servidor próprio e
// sem chave de API; é o motor padrão quando F5/Kokoro/XTTS não estão
// configurados no backend.
// ================================================================

import { TTSProvider, withTimeout } from './tts-provider.js';
import { resolveLanguage } from '../languages.js';

let modPromise = null;
let voiceCatalogPromise = null;
let voiceCatalogCheckedAt = 0;
let voiceCatalog = [];

async function loadModule() {
  if (!modPromise) {
    modPromise = import('msedge-tts')
      .then((m) => ({
        MsEdgeTTS: m.MsEdgeTTS ?? m.default?.MsEdgeTTS,
        OUTPUT_FORMAT: m.OUTPUT_FORMAT ?? m.default?.OUTPUT_FORMAT
      }))
      .catch((error) => {
        modPromise = null;
        throw error;
      });
  }
  return modPromise;
}

async function getVoiceCatalog() {
  if (voiceCatalog.length > 0 && Date.now() - voiceCatalogCheckedAt < 60 * 60_000) {
    return voiceCatalog;
  }
  if (voiceCatalogPromise) return voiceCatalogPromise;

  const catalogRequest = (async () => {
    const { MsEdgeTTS } = await loadModule();
    const tts = new MsEdgeTTS();
    try {
      const voices = await tts.getVoices();
      voiceCatalog = voices
        .filter((voice) => voice.ShortName && voice.Locale)
        .map((voice) => ({
          id: voice.ShortName,
          name: voice.FriendlyName || voice.ShortName,
          gender: String(voice.Gender || '').toLowerCase(),
          language: voice.Locale
        }));
      voiceCatalogCheckedAt = Date.now();
      return voiceCatalog;
    } finally {
      tts.close();
    }
  })();
  voiceCatalogPromise = catalogRequest;
  try {
    return await catalogRequest;
  } finally {
    if (voiceCatalogPromise === catalogRequest) voiceCatalogPromise = null;
  }
}

export class NeuralCloudProvider extends TTSProvider {
  name = 'neural-cloud';
  priority = 50;
  maxChars = 2200;

  voiceFor(language, voiceGender) {
    return resolveLanguage(language)?.neural?.[voiceGender] || null;
  }

  supportsVoice(language, voiceId) {
    const lang = resolveLanguage(language);
    return Boolean(
      lang &&
      typeof voiceId === 'string' &&
      voiceId.startsWith('edge:') &&
      voiceId.length > 5
    );
  }

  async listVoices(language) {
    const lang = resolveLanguage(language);
    if (!lang) return [];
    const languagePrefix = lang.id.toLowerCase();
    return (await getVoiceCatalog())
      .filter((voice) => voice.language.toLowerCase() === languagePrefix)
      .filter((voice) => voice.gender === 'male' || voice.gender === 'female')
      .map((voice) => ({
        id: `edge:${voice.id}`,
        name: voice.name,
        gender: voice.gender,
        provider: this.name,
        language: lang.id,
        available: true
      }));
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

  async synthesizeSegment(text, language, voiceGender, options = {}) {
    // Mapeamento de personas vocais para vozes neurais físicas disponíveis no Edge TTS com ajustes acústicos reais
    const VOICE_PERSONA_PROFILES = {
      'pt-BR-FranciscaNeural': { baseVoice: 'pt-BR-FranciscaNeural', rate: '-5%', pitch: '+0Hz', fallbackVoice: 'pt-BR-FranciscaNeural' },
      'pt-BR-AntonioNeural': { baseVoice: 'pt-BR-AntonioNeural', rate: '-5%', pitch: '+0Hz', fallbackVoice: 'pt-BR-AntonioNeural' },
      'pt-BR-ThalitaMultilingualNeural': { baseVoice: 'pt-BR-ThalitaMultilingualNeural', rate: '-3%', pitch: undefined, fallbackVoice: 'pt-BR-FranciscaNeural' },
      'pt-BR-BrendaNeural': { baseVoice: 'pt-BR-FranciscaNeural', rate: '+2%', pitch: '+4Hz', fallbackVoice: 'pt-BR-FranciscaNeural' },
      'pt-BR-FabioNeural': { baseVoice: 'pt-BR-AntonioNeural', rate: '-8%', pitch: '-5Hz', fallbackVoice: 'pt-BR-AntonioNeural' },
      'pt-BR-DonatoNeural': { baseVoice: 'pt-BR-AntonioNeural', rate: '+2%', pitch: '+3Hz', fallbackVoice: 'pt-BR-AntonioNeural' }
    };

    let voice = this.voiceFor(language, voiceGender);
    let customRate = '-5%';
    let customPitch = '+0Hz';
    let fallbackVoice = voice;

    if (options.voiceId) {
      if (!this.supportsVoice(language, options.voiceId)) {
        throw new Error('O ID de voz neural escolhido não é compatível com este idioma.');
      }
      const requestedId = options.voiceId.slice('edge:'.length);
      const persona = VOICE_PERSONA_PROFILES[requestedId];
      if (persona) {
        voice = persona.baseVoice;
        customRate = persona.rate;
        customPitch = persona.pitch;
        fallbackVoice = persona.fallbackVoice;
      } else {
        const availableVoices = await this.listVoices(language);
        const requestedVoice = availableVoices.find((candidate) => candidate.id === `edge:${requestedId}`);
        if (requestedVoice) {
          voice = requestedId;
          fallbackVoice = requestedId;
        } else {
          // Fallback para a voz padrão do gênero caso o ID específico não esteja ativo no catálogo regional
          voice = this.voiceFor(language, voiceGender) || 'pt-BR-FranciscaNeural';
          fallbackVoice = voice;
        }
      }
    }
    if (!voice) throw new Error('Voz indisponível para este idioma/gênero');
    const { MsEdgeTTS, OUTPUT_FORMAT } = await loadModule();

    // Limpa reticências iniciais e caracteres que interrompem o stream WebSocket do Edge TTS
    const sanitizedText = String(text || '')
      .replace(/^\s*\.{2,}\s*/g, '')
      .replace(/\.{3,}/g, ', ')
      .replace(/["""]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Cena silenciosa.';

    const runWithVoice = async (targetVoice, rateVal, pitchVal) => {
      const tts = new MsEdgeTTS();
      try {
        await tts.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const prosodyOptions = { rate: rateVal || '-5%' };
        if (pitchVal) prosodyOptions.pitch = pitchVal;
        const { audioStream } = tts.toStream(sanitizedText, prosodyOptions);
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

    let audio;
    try {
      audio = await withTimeout(runWithVoice(voice, customRate, customPitch), 45000, 'síntese de voz');
    } catch (firstErr) {
      // Se uma voz Multilingual falhar no meio do stream, faz fallback imediato para a voz estável do mesmo gênero
      const safeVoice = fallbackVoice && fallbackVoice !== voice
        ? fallbackVoice
        : (voiceGender === 'male' ? 'pt-BR-AntonioNeural' : 'pt-BR-FranciscaNeural');
      audio = await withTimeout(runWithVoice(safeVoice, customRate, customPitch || '+0Hz'), 45000, 'síntese de voz (contingência)');
    }

    if (!audio || audio.length < 400) throw new Error('Áudio vazio retornado pelo motor');
    return audio;
  }
}

export const NeuralCloudTTSProvider = NeuralCloudProvider;
