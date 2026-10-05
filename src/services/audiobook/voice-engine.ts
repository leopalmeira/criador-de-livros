// ================================================================
// MOTOR DE VOZ MODULAR — AUDIOBOOK STUDIO TTS ENGINE
// 
// FASE 1: Vozes reais, backend-first, sem fallbacks falsos.
// - O backend faz toda a síntese TTS real (NeuralCloud, Kokoro, etc.)
// - O frontend apenas chama /api/tts/synthesize
// - Vozes são descobertas via /api/audiobook/voices (IDs reais)
// - NÃO há Google Translate TTS silencioso
// - NÃO há sine wave como voz
// ================================================================

import {
  VoiceEngine,
  VoiceEngineGenerateParams,
  VoiceEngineResult,
  NarratorVoice
} from '../../types/audiobook-studio';
import {
  AudiobookClient,
  AudiobookVoice
} from './audiobook-client';

// ================================================================
// VOZES REAIS DISPONÍVEIS
// IDs verificados nos motores Kokoro e Edge TTS Neural.
// O frontend NÃO inventa IDs — apenas exibe o que o backend reporta.
// ================================================================

// Vozes pré-definidas para exibição (serão validadas pelo backend)
const PT_BR_VOICES: NarratorVoice[] = [
  {
    id: 'kokoro-narrativa-masc',
    name: 'Alex — Narrativa Masculina',
    gender: 'masculino',
    style: 'narrativa',
    language: 'Português — Brasil',
    description: 'Tom clássico, profundo e envolvente para audiolivros.',
    sampleText: 'No silêncio da noite, os segredos mais profundos do passado começam a se revelar.',
    kokoroVoiceId: 'pm_alex', // ID REAL do Kokoro
    previewPitch: 0.95,
    previewRate: 1.0
  },
  {
    id: 'kokoro-narrativa-fem',
    name: 'Dora — Narrativa Feminina',
    gender: 'feminino',
    style: 'narrativa',
    language: 'Português — Brasil',
    description: 'Dicção perfeita e cadência emotiva para romances e sagas.',
    sampleText: 'Ela sabia que aquele momento mudaria tudo, mas mesmo assim deu o primeiro passo.',
    kokoroVoiceId: 'pf_dora', // ID REAL do Kokoro
    previewPitch: 1.05,
    previewRate: 1.0
  }
];

const EN_US_VOICES: NarratorVoice[] = [
  {
    id: 'kokoro-narrative-masc-en',
    name: 'Adam — Male Narrator',
    gender: 'masculino',
    style: 'narrativa',
    language: 'English — US',
    description: 'Deep, engaging voice for audiobooks and non-fiction.',
    sampleText: 'In the silence of the night, the deepest secrets of the past begin to reveal themselves.',
    kokoroVoiceId: 'am_adam', // ID REAL do Kokoro
    previewPitch: 0.95,
    previewRate: 1.0
  },
  {
    id: 'kokoro-narrative-fem-en',
    name: 'Heart — Female Narrator',
    gender: 'feminino',
    style: 'narrativa',
    language: 'English — US',
    description: 'Warm, expressive voice for fiction and memoirs.',
    sampleText: 'She knew that moment would change everything, but she took the first step without hesitation.',
    kokoroVoiceId: 'af_heart', // ID REAL do Kokoro
    previewPitch: 1.05,
    previewRate: 1.0
  }
];

const ES_ES_VOICES: NarratorVoice[] = [
  {
    id: 'kokoro-narrativa-masc-es',
    name: 'Alex — Narrador Masculino',
    gender: 'masculino',
    style: 'narrativa',
    language: 'Español',
    description: 'Voz envolvente para audiolibros en español.',
    sampleText: 'En el silencio de la noche, los secretos más profundos del pasado comienzan a revelarse.',
    kokoroVoiceId: 'em_alex', // ID REAL do Kokoro
    previewPitch: 0.95,
    previewRate: 1.0
  },
  {
    id: 'kokoro-narrativa-fem-es',
    name: 'Dora — Narradora Femenina',
    gender: 'feminino',
    style: 'narrativa',
    language: 'Español',
    description: 'Voz cálida y expresiva para novelas y memorias.',
    sampleText: 'Ella sabía que ese momento lo cambiaría todo, pero dio el primer paso sin vacilar.',
    kokoroVoiceId: 'ef_dora', // ID REAL do Kokoro
    previewPitch: 1.05,
    previewRate: 1.0
  }
];

const IT_IT_VOICES: NarratorVoice[] = [
  {
    id: 'kokoro-narrativa-masc-it',
    name: 'Nicola — Narratore Maschile',
    gender: 'masculino',
    style: 'narrativa',
    language: 'Italiano',
    description: 'Voce profonda e coinvolgente per audiolibri.',
    sampleText: 'Nel silenzio della notte, i segreti più profondi del passato cominciano a rivelarsi.',
    kokoroVoiceId: 'im_nicola', // ID REAL do Kokoro
    previewPitch: 0.95,
    previewRate: 1.0
  },
  {
    id: 'kokoro-narrativa-fem-it',
    name: 'Sara — Narratrice Femminile',
    gender: 'feminino',
    style: 'narrativa',
    language: 'Italiano',
    description: 'Voce espressiva e calda per romanzi e saghe.',
    sampleText: 'Sapeva che quel momento avrebbe cambiato tutto, ma fece comunque il primo passo.',
    kokoroVoiceId: 'if_sara', // ID REAL do Kokoro
    previewPitch: 1.05,
    previewRate: 1.0
  }
];

const FR_FR_VOICES: NarratorVoice[] = [
  {
    id: 'kokoro-narrativa-fem-fr',
    name: 'Siwis — Narratrice',
    gender: 'feminino',
    style: 'narrativa',
    language: 'Français',
    description: 'Voix douce et expressive pour les livres audio.',
    sampleText: 'Dans le silence de la nuit, les secrets les plus profonds du passé commencent à se révéler.',
    kokoroVoiceId: 'ff_siwis', // ID REAL do Kokoro
    previewPitch: 1.05,
    previewRate: 1.0
  }
];

// Mapa de vozes por idioma — SOMENTE IDs reais
export const VOICE_CATALOG: Record<string, NarratorVoice[]> = {
  'pt-BR': PT_BR_VOICES,
  'en-US': EN_US_VOICES,
  'es-ES': ES_ES_VOICES,
  'it-IT': IT_IT_VOICES,
  'fr-FR': FR_FR_VOICES,
  'de-DE': [] // Alemão usa apenas Neural Cloud (Edge TTS)
};

/** Retorna as vozes do catálogo para um idioma específico */
export function getVoicesForLanguage(language: string): NarratorVoice[] {
  return VOICE_CATALOG[language] || VOICE_CATALOG['pt-BR'] || [];
}

/** Mantém compatibilidade: exporta a lista como antes */
export const KOKORO_NARRATOR_VOICES: NarratorVoice[] = [
  ...PT_BR_VOICES,
  ...EN_US_VOICES,
  ...ES_ES_VOICES,
  ...IT_IT_VOICES,
  ...FR_FR_VOICES
];

// ================================================================
// MOTOR DE VOZ — BACKEND-FIRST (SEM FALLBACKS FALSOS)
//
// Cadeia de síntese (tudo no backend):
// 1. Backend /api/tts/synthesize → NeuralCloud (Edge TTS) ou Kokoro
// 2. Se backend offline → ERRO CLARO para o usuário
// 
// REMOVIDO:
// - Google Translate TTS silencioso no frontend
// - Sine wave como "voz" 
// - Vozes com IDs inventados
// ================================================================

export class KokoroTTSVoiceEngine implements VoiceEngine {
  readonly id = 'kokoro-tts';
  readonly name = 'AudioBook Studio Voice Engine';
  readonly description = 'Motor de voz neural real — toda síntese ocorre no backend via NeuralCloud ou Kokoro.';
  
  private customServerUrl: string = '';
  public isServerConnected: boolean = false;
  private _cachedVoices: AudiobookVoice[] | null = null;

  constructor(serverUrl?: string) {
    if (typeof localStorage !== 'undefined') {
      this.customServerUrl = serverUrl || localStorage.getItem('kokoro_server_url') || '';
    } else {
      this.customServerUrl = serverUrl || '';
    }
  }

  public setServerUrl(url: string): void {
    this.customServerUrl = url.trim();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kokoro_server_url', this.customServerUrl);
    }
  }

  public getServerUrl(): string {
    return this.customServerUrl;
  }

  public getVoices(): NarratorVoice[] {
    return KOKORO_NARRATOR_VOICES;
  }

  /** Obtém vozes reais do backend via API */
  public async fetchRealVoices(language: string = 'pt-BR'): Promise<AudiobookVoice[]> {
    try {
      const result = await AudiobookClient.fetchVoices(language);
      if (result && result.voices) {
        this._cachedVoices = result.voices;
        return result.voices;
      }
    } catch {
      // fallback to cached
    }
    return this._cachedVoices || [];
  }

  // Testa conexão com o backend de voz
  public async testServerHealth(): Promise<boolean> {
    try {
      const status = await AudiobookClient.fetchEngineStatus();
      this.isServerConnected = status !== null && status.status === 'ready';
      return this.isServerConnected;
    } catch {
      this.isServerConnected = false;
      return false;
    }
  }

  public async generateVoice(params: VoiceEngineGenerateParams): Promise<VoiceEngineResult> {
    const selectedVoice = KOKORO_NARRATOR_VOICES.find(v => v.id === params.voiceId) || KOKORO_NARRATOR_VOICES[0];
    const words = params.text.trim().split(/\s+/).filter(Boolean);
    const estimatedDuration = Math.max(3, Math.round(words.length / (2.25 * params.speed)));

    params.onProgress?.(10);

    // 1. Tentar servidor Kokoro local se configurado pelo usuário
    if (this.customServerUrl) {
      try {
        params.onProgress?.(25);
        const endpoint = `${this.customServerUrl.replace(/\/+$/, '')}/v1/audio/speech`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'kokoro',
            input: params.text,
            voice: selectedVoice.kokoroVoiceId || 'pm_alex',
            speed: params.speed
          }),
          signal: AbortSignal.timeout(30000)
        });

        if (res.ok) {
          const blob = await res.blob();
          params.onProgress?.(100);
          return {
            audioBlob: blob,
            audioUrl: URL.createObjectURL(blob),
            durationSeconds: estimatedDuration,
            engineName: 'Kokoro TTS (Servidor Local)'
          };
        }
      } catch (err) {
        console.warn('[VoiceEngine] Servidor Kokoro local indisponível, usando backend:', err);
      }
    }

    // 2. Chamar o backend oficial (/api/tts/synthesize)
    // O backend escolhe automaticamente o melhor motor (NeuralCloud, Kokoro, F5, XTTS)
    try {
      params.onProgress?.(35);
      const origin = (typeof window !== 'undefined' && window.location?.origin) 
        ? window.location.origin 
        : 'http://localhost:3000';

      const res = await fetch(`${origin}/api/tts/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: params.text,
          voiceId: selectedVoice.kokoroVoiceId || 'pm_alex',
          speed: params.speed,
          lang: params.language || 'pt-BR'
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (res.ok) {
        params.onProgress?.(90);
        const blob = await res.blob();
        params.onProgress?.(100);
        return {
          audioBlob: blob,
          audioUrl: URL.createObjectURL(blob),
          durationSeconds: estimatedDuration,
          engineName: `Voz Neural (${selectedVoice.name})`
        };
      }

      // Se o backend retornou erro, reportar ao usuário
      const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(errorData.error || `Erro no motor de voz: HTTP ${res.status}`);
    } catch (backendErr: any) {
      // NÃO fazer fallback para Google Translate ou sine wave
      // Reportar erro claro ao usuário
      console.error('[VoiceEngine] Backend de voz indisponível:', backendErr);
      
      params.onProgress?.(100);
      throw new Error(
        backendErr?.message || 
        'Motor de voz temporariamente indisponível. Verifique a conexão com o servidor e tente novamente.'
      );
    }
  }
}

// Instância singleton padrão
export const kokoroVoiceEngine = new KokoroTTSVoiceEngine();
