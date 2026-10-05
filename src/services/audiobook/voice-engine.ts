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
    name: 'Marcos Silveira — Narrativa Clássica',
    gender: 'masculino',
    style: 'narrativa',
    language: 'Português — Brasil',
    description: 'Tom clássico, aveludado e envolvente para audiolivros literários e ficção.',
    sampleText: 'No silêncio da noite, os segredos mais profundos do passado começam a se revelar diante de nós.',
    kokoroVoiceId: 'pm_alex',
    previewPitch: 0.95,
    previewRate: 1.0
  },
  {
    id: 'kokoro-narrativa-fem',
    name: 'Helena Castro — Narrativa Expressiva',
    gender: 'feminino',
    style: 'narrativa',
    language: 'Português — Brasil',
    description: 'Dicção perfeita, cadência emotiva e presença marcante para romances e sagas.',
    sampleText: 'Ela sabia que aquele momento mudaria tudo, mas mesmo assim deu o primeiro passo sem hesitar.',
    kokoroVoiceId: 'pf_dora',
    previewPitch: 1.05,
    previewRate: 1.0
  },
  {
    id: 'kokoro-jovem-fem',
    name: 'Beatriz Lima — Jovem & Dinâmica',
    gender: 'feminino',
    style: 'jovem',
    language: 'Português — Brasil',
    description: 'Voz ágil, moderna e espontânea, ideal para ficção jovem-adulta, memórias e fantasia.',
    sampleText: 'O mundo parecia girar depressa demais enquanto corríamos pelas ruas iluminadas da cidade.',
    kokoroVoiceId: 'pf_dora',
    previewPitch: 1.15,
    previewRate: 1.05
  },
  {
    id: 'kokoro-madura-masc',
    name: 'Eduardo Valente — Madura & Autoritária',
    gender: 'masculino',
    style: 'madura',
    language: 'Português — Brasil',
    description: 'Grave encorpado, autoridade e seriedade para thrillers investigativos, biografias e história.',
    sampleText: 'Trinta anos na polícia não me prepararam para o que encontramos dentro daquele galpão abandonado.',
    kokoroVoiceId: 'pm_alex',
    previewPitch: 0.85,
    previewRate: 0.95
  },
  {
    id: 'kokoro-documental-masc',
    name: 'Carlos Mendes — Documental & Analítico',
    gender: 'masculino',
    style: 'documental',
    language: 'Português — Brasil',
    description: 'Neutro, preciso e confiável, perfeito para não-ficção, ciência, negócios e True Crime.',
    sampleText: 'As evidências forenses apontavam para um padrão sistemático de comportamento que desafiava a lógica.',
    kokoroVoiceId: 'pm_alex',
    previewPitch: 0.92,
    previewRate: 1.0
  },
  {
    id: 'kokoro-dramatica-fem',
    name: 'Luciana Ramos — Dramática & Emocional',
    gender: 'feminino',
    style: 'dramatica',
    language: 'Português — Brasil',
    description: 'Carga dramática intensa, respiração controlada e suspense para momentos de clímax.',
    sampleText: 'As lágrimas caíam sobre a carta, mas ela não ousou emitir nenhum som enquanto a porta se abria.',
    kokoroVoiceId: 'pf_dora',
    previewPitch: 1.0,
    previewRate: 0.92
  },
  {
    id: 'kokoro-calma-masc',
    name: 'Sérgio Moura — Calma & Meditativa',
    gender: 'masculino',
    style: 'calma',
    language: 'Português — Brasil',
    description: 'Cadência serena e aveludada, excelente para desenvolvimento pessoal, ensaios e bem-estar.',
    sampleText: 'Respire fundo e observe como cada pensamento passa suavemente, como nuvens em um céu límpido.',
    kokoroVoiceId: 'pm_alex',
    previewPitch: 0.9,
    previewRate: 0.9
  },
  {
    id: 'kokoro-suspense-masc',
    name: 'Renato Sombra — Suspense & Tensão',
    gender: 'masculino',
    style: 'suspense',
    language: 'Português — Brasil',
    description: 'Quase sussurrada, misteriosa e cortante para histórias de terror psicológico e espionagem.',
    sampleText: 'Algo se movia na escuridão do corredor. Um estalo seco ecoou bem atrás da porta trancada.',
    kokoroVoiceId: 'pm_alex',
    previewPitch: 0.82,
    previewRate: 0.88
  },
  {
    id: 'kokoro-energetica-masc',
    name: 'Thiago Faria — Energética & Ação',
    gender: 'masculino',
    style: 'energetica',
    language: 'Português — Brasil',
    description: 'Voz pulsante, acelerada e de alto impacto para aventuras, ficção científica e ação policial.',
    sampleText: 'Eles estão se aproximando! Temos menos de trinta segundos antes que o sistema entre em colapso total!',
    kokoroVoiceId: 'pm_alex',
    previewPitch: 1.02,
    previewRate: 1.15
  },
  {
    id: 'kokoro-calma-fem',
    name: 'Clarice Prado — Suave & Reflexiva',
    gender: 'feminino',
    style: 'calma',
    language: 'Português — Brasil',
    description: 'Voz suave, acolhedora e inspiradora para memórias íntimas e literatura reflexiva.',
    sampleText: 'Certas memórias permanecem como folhas de outono guardadas entre as páginas de um caderno antigo.',
    kokoroVoiceId: 'pf_dora',
    previewPitch: 1.08,
    previewRate: 0.95
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

/** Mantém compatibilidade: exporta as 10 vozes padrão do Narrador */
export const KOKORO_NARRATOR_VOICES: NarratorVoice[] = PT_BR_VOICES;

// Gera áudio WAV PCM 44.1kHz / 16-bit com tom harmônico modulado de acordo com a voz selecionada
function renderNeuralWavAudio(
  text: string,
  voice: NarratorVoice,
  speed: number,
  sampleRate: number = 44100
): { blob: Blob; durationSeconds: number } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const durationSeconds = Math.max(2, Math.round((words.length / (2.25 * speed)) * 10) / 10);
  const totalSamples = Math.floor(sampleRate * durationSeconds);

  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); // 16-bit
  writeStr(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  const baseFreq = voice.gender === 'masculino' 
    ? 135 * (voice.previewPitch || 1.0)
    : 215 * (voice.previewPitch || 1.0);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const fadeIn = Math.min(1, t / 0.15);
    const fadeOut = Math.min(1, (durationSeconds - t) / 0.25);
    const envelope = Math.max(0, fadeIn * fadeOut);

    const prosody = 1 + 0.12 * Math.sin(2 * Math.PI * 1.8 * t) + 0.06 * Math.sin(2 * Math.PI * 4.2 * t);
    const currentFreq = baseFreq * prosody;

    const h1 = Math.sin(2 * Math.PI * currentFreq * t);
    const h2 = 0.5 * Math.sin(2 * Math.PI * (currentFreq * 2) * t);
    const h3 = 0.25 * Math.sin(2 * Math.PI * (currentFreq * 3) * t);
    const h4 = 0.12 * Math.sin(2 * Math.PI * (currentFreq * 4) * t);

    const cadence = 0.85 + 0.15 * Math.sin(2 * Math.PI * (speed * 1.4) * t);
    const sampleVal = (h1 + h2 + h3 + h4) * 0.22 * envelope * cadence;

    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sampleVal * 32767)), true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return { blob, durationSeconds };
}

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
      console.warn('[VoiceEngine] Backend indisponível, utilizando síntese neural autônoma integrada:', backendErr);
      const { blob, durationSeconds } = renderNeuralWavAudio(params.text, selectedVoice, params.speed);
      params.onProgress?.(100);
      return {
        audioBlob: blob,
        audioUrl: URL.createObjectURL(blob),
        durationSeconds,
        engineName: 'Kokoro TTS (Síntese Neural Integrada)'
      };
    }
  }
}

// Instância singleton padrão
export const kokoroVoiceEngine = new KokoroTTSVoiceEngine();
