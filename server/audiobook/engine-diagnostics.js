// ================================================================
// AUDIOBOOK STUDIO — ENGINE DIAGNOSTICS & VOICE DISCOVERY
// Endpoints: /api/audiobook/engine-status, /api/audiobook/voices
// ================================================================

import { TTSEngineManager } from './engine-manager.js';
import { LANGUAGES, resolveLanguage } from './languages.js';
import { hasFfmpeg } from './mp3.js';

/**
 * Verifica o status de cada provider TTS registrado e retorna
 * um diagnóstico completo para a UI.
 */
export async function getEngineStatus(engineManager) {
  const em = engineManager || new TTSEngineManager();
  const providers = em.providers || [];

  const engines = [];
  for (const p of providers) {
    let available = false;
    try {
      available = Boolean(await p.isAvailable());
    } catch {}
    engines.push({
      name: p.name,
      priority: p.priority,
      honorsGender: Boolean(p.honorsGender),
      consistentVoice: Boolean(p.consistentVoice),
      maxChars: p.maxChars || 0,
      available
    });
  }

  // FFmpeg check
  let ffmpegInstalled = false;
  try {
    ffmpegInstalled = Boolean(await hasFfmpeg());
  } catch {}

  // Supported languages
  const supportedLanguages = LANGUAGES.map(l => ({
    id: l.id,
    label: l.label,
    hasKokoro: Boolean(l.kokoro && (l.kokoro.male || l.kokoro.female)),
    hasNeural: Boolean(l.neural && (l.neural.male || l.neural.female)),
    hasBasic: Boolean(l.basic)
  }));

  const availableCount = engines.filter(e => e.available).length;
  const primaryEngine = engines.find(e => e.available && e.honorsGender);

  return {
    status: availableCount > 0 ? 'ready' : 'no_engines',
    primaryEngine: primaryEngine ? primaryEngine.name : null,
    totalEngines: engines.length,
    availableEngines: availableCount,
    engines,
    ffmpegInstalled,
    supportedLanguages,
    diagnosticAt: Date.now()
  };
}

/**
 * Retorna as vozes disponíveis para um idioma, consultando diretamente
 * o catálogo configurado (languages.js). Quando um servidor Kokoro estiver
 * conectado, tenta listar as vozes reais instaladas.
 */
export async function getAvailableVoices(languageInput, engineManager) {
  const em = engineManager || new TTSEngineManager();
  const lang = resolveLanguage(languageInput || 'pt-BR');
  if (!lang) return { language: languageInput, voices: [], error: 'Idioma não suportado' };

  const voices = [];

  // Kokoro voices (from config)
  if (lang.kokoro) {
    if (lang.kokoro.female) {
      voices.push({
        id: lang.kokoro.female,
        name: formatVoiceName(lang.kokoro.female),
        gender: 'female',
        provider: 'kokoro',
        language: lang.id,
        available: false // will be checked below
      });
    }
    if (lang.kokoro.male) {
      voices.push({
        id: lang.kokoro.male,
        name: formatVoiceName(lang.kokoro.male),
        gender: 'male',
        provider: 'kokoro',
        language: lang.id,
        available: false
      });
    }
  }

  // Neural (Edge TTS) voices
  if (lang.neural) {
    if (lang.neural.female) {
      voices.push({
        id: lang.neural.female,
        name: formatNeuralName(lang.neural.female),
        gender: 'female',
        provider: 'neural-cloud',
        language: lang.id,
        available: false
      });
    }
    if (lang.neural.male) {
      voices.push({
        id: lang.neural.male,
        name: formatNeuralName(lang.neural.male),
        gender: 'male',
        provider: 'neural-cloud',
        language: lang.id,
        available: false
      });
    }
  }

  // Check availability of providers
  for (const p of em.providers) {
    let isAvail = false;
    try {
      isAvail = Boolean(await p.isAvailable());
    } catch {}
    for (const v of voices) {
      if (v.provider === p.name) {
        v.available = isAvail;
      }
    }
  }

  // Try to get real voices from Kokoro server if available
  const kokoroProvider = em.providers.find(p => p.name === 'kokoro');
  if (kokoroProvider && kokoroProvider.baseUrl) {
    try {
      const res = await fetch(`${kokoroProvider.baseUrl}/v1/audio/voices`, {
        headers: kokoroProvider.headers ? kokoroProvider.headers() : {},
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const data = await res.json();
        const installedVoices = Array.isArray(data.voices) ? data.voices : 
                               Array.isArray(data) ? data : [];
        // Mark Kokoro voices as available only if they exist on the server
        for (const v of voices) {
          if (v.provider === 'kokoro') {
            v.available = installedVoices.some(iv => 
              (typeof iv === 'string' ? iv : iv.id || iv.voice_id) === v.id
            );
          }
        }
      }
    } catch {
      // Server not responding, keep availability from health check
    }
  }

  return {
    language: lang.id,
    languageLabel: lang.label,
    voices: voices.filter(v => v.available || v.provider === 'neural-cloud'),
    allVoices: voices,
    checkedAt: Date.now()
  };
}

function formatVoiceName(voiceId) {
  if (!voiceId) return 'Unknown';
  // pf_dora -> PF Dora, am_adam -> AM Adam
  const parts = voiceId.split('_');
  if (parts.length === 2) {
    return `${parts[0].toUpperCase()} ${parts[1].charAt(0).toUpperCase()}${parts[1].slice(1)}`;
  }
  return voiceId;
}

function formatNeuralName(voiceId) {
  if (!voiceId) return 'Neural Voice';
  // pt-BR-FranciscaNeural -> Francisca (Neural)
  const match = voiceId.match(/[A-Za-z]+-[A-Za-z]+-([A-Za-z]+)Neural/);
  if (match) return `${match[1]} (Neural)`;
  return voiceId;
}
