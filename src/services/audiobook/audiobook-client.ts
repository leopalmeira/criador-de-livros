// ================================================================
// AUDIOBOOK STUDIO — CLIENTE HTTP (FRONTEND)
// Comunicação tipada com /api/audiobook
// Nenhuma chave de API ou parâmetro técnico no frontend.
// ================================================================

export type AudiobookVoiceGender = 'male' | 'female';

export interface AudiobookLanguage {
  id: string;
  label: string;
  flag: string;
}

export interface AudiobookChapterItem {
  index: number;
  kind: 'intro' | 'chapter';
  label: string;
  title: string;
  file: string;
  status: 'pending' | 'generating' | 'done' | 'failed';
  durationSeconds: number;
  startSeconds: number;
}

export type AudiobookStateStatus = 'idle' | 'generating' | 'completed' | 'partial' | 'interrupted' | 'failed';

export interface AudiobookStatusResponse {
  projectId: string;
  title?: string;
  subtitle?: string;
  author?: string;
  status: AudiobookStateStatus;
  progressPercent: number;
  totalUnits: number;
  completedCount: number;
  bookChapters: number;
  current: {
    index: number;
    kind: 'intro' | 'chapter';
    label: string;
    title: string;
    file: string;
    chapterNumber: number | null;
  } | null;
  resumeFrom: string | null;
  chapters: AudiobookChapterItem[];
  durationSeconds: number;
  finalReady: boolean;
  message: string;
  language: {
    id: string;
    label: string;
  } | null;
  voiceGender: AudiobookVoiceGender | null;
  voiceLabel: string | null;
}

export interface ManuscriptPayload {
  title: string;
  subtitle?: string;
  author?: string;
  preface?: string;
  chapters: Array<{
    title?: string;
    titulo?: string;
    text?: string;
    texto?: string;
  }>;
}

const DEFAULT_LANGUAGES: AudiobookLanguage[] = [
  { id: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { id: 'en-US', label: 'Inglês', flag: '🇺🇸' },
  { id: 'es-ES', label: 'Espanhol', flag: '🇪🇸' },
  { id: 'fr-FR', label: 'Francês', flag: '🇫🇷' },
  { id: 'de-DE', label: 'Alemão', flag: '🇩🇪' },
  { id: 'it-IT', label: 'Italiano', flag: '🇮🇹' }
];

export function mapBookLanguageToAudiobook(bookLang?: string): string {
  const norm = String(bookLang ?? '').toLowerCase().trim();
  if (norm.includes('portug') || norm.includes('pt')) return 'pt-BR';
  if (norm.includes('ingl') || norm.includes('eng') || norm.includes('en')) return 'en-US';
  if (norm.includes('espanh') || norm.includes('span') || norm.includes('es')) return 'es-ES';
  if (norm.includes('franc') || norm.includes('french') || norm.includes('fr')) return 'fr-FR';
  if (norm.includes('alem') || norm.includes('germ') || norm.includes('de')) return 'de-DE';
  if (norm.includes('ital') || norm.includes('it')) return 'it-IT';
  return 'pt-BR';
}

export interface AudiobookEngineInfo {
  name: string;
  priority: number;
  honorsGender: boolean;
  consistentVoice: boolean;
  maxChars: number;
  available: boolean;
}

export interface AudiobookEngineStatus {
  status: 'ready' | 'no_engines';
  primaryEngine: string | null;
  totalEngines: number;
  availableEngines: number;
  engines: AudiobookEngineInfo[];
  ffmpegInstalled: boolean;
  diagnosticAt: number;
}

export interface AudiobookVoice {
  id: string;
  name: string;
  gender: AudiobookVoiceGender;
  provider: string;
  language: string;
  available: boolean;
}

export interface AudiobookVoicesResponse {
  language: string;
  languageLabel: string;
  voices: AudiobookVoice[];
  allVoices: AudiobookVoice[];
  checkedAt: number;
}

export class AudiobookClient {
  static getFinalAudioUrl(projectId: string, download = false): string {
    const base = `/api/audiobook/file/${encodeURIComponent(projectId)}/final`;
    return download ? `${base}?download=1` : base;
  }

  static getChapterAudioUrl(projectId: string, file: string, download = false): string {
    const base = `/api/audiobook/file/${encodeURIComponent(projectId)}/chapters/${encodeURIComponent(file)}`;
    return download ? `${base}?download=1` : base;
  }

  static getDownloadAllChaptersUrl(projectId: string): string {
    return `/api/audiobook/download-chapters/${encodeURIComponent(projectId)}`;
  }

  static async fetchLanguages(): Promise<AudiobookLanguage[]> {
    try {
      const res = await fetch('/api/audiobook/languages');
      if (!res.ok) return DEFAULT_LANGUAGES;
      const data = await res.json();
      return Array.isArray(data.languages) && data.languages.length > 0 ? data.languages : DEFAULT_LANGUAGES;
    } catch {
      return DEFAULT_LANGUAGES;
    }
  }

  /** Diagnóstico completo dos motores TTS disponíveis */
  static async fetchEngineStatus(): Promise<AudiobookEngineStatus | null> {
    try {
      const res = await fetch('/api/audiobook/engine-status');
      if (!res.ok) return null;
      const data = await res.json();
      return data as AudiobookEngineStatus;
    } catch {
      return null;
    }
  }

  /** Vozes reais disponíveis para um idioma */
  static async fetchVoices(language: string = 'pt-BR'): Promise<AudiobookVoicesResponse | null> {
    try {
      const res = await fetch(`/api/audiobook/voices?language=${encodeURIComponent(language)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data as AudiobookVoicesResponse;
    } catch {
      return null;
    }
  }

  static async syncManuscript(projectId: string, manuscript: ManuscriptPayload): Promise<void> {
    const res = await fetch('/api/audiobook/manuscript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ...manuscript })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao sincronizar o texto do livro com o estúdio.');
    }
  }

  static async startGeneration(
    projectId: string,
    language: string,
    voiceGender: AudiobookVoiceGender
  ): Promise<AudiobookStatusResponse> {
    const res = await fetch('/api/audiobook/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, language, voiceGender })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao iniciar a geração do audiobook.');
    }
    return data.status;
  }

  static async getStatus(projectId: string): Promise<AudiobookStatusResponse> {
    const res = await fetch(`/api/audiobook/status/${encodeURIComponent(projectId)}`, {
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao verificar status do audiobook.');
    }
    return data.status;
  }

  static async resetAudiobook(projectId: string): Promise<AudiobookStatusResponse> {
    const res = await fetch('/api/audiobook/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao reiniciar o estúdio.');
    }
    return data.status;
  }

  // ================================================================
  // PRÉVIA / TESTE DE VOZ
  // ================================================================
  static getVoicePreviewUrl(language: string, voiceGender: AudiobookVoiceGender): string {
    return `/api/audiobook/preview-voice?language=${encodeURIComponent(language)}&voiceGender=${encodeURIComponent(voiceGender)}`;
  }

  // ================================================================
  // MÉTODOS DE EFEITOS SONOROS (SFX) & BANCO DE ÁUDIO
  // ================================================================

  static getSFXFileUrl(sfxId: string): string {
    return `/api/audiobook/sfx/file/${encodeURIComponent(sfxId)}`;
  }

  static async searchSFX(
    query: string = '',
    options?: { maxDuration?: number; minDuration?: number; maxResults?: number }
  ): Promise<SFXSearchResponse> {
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (options?.maxDuration) params.set('maxDuration', String(options.maxDuration));
      if (options?.minDuration) params.set('minDuration', String(options.minDuration));
      const res = await fetch(`/api/audiobook/sfx/search?${params.toString()}`);
      if (!res.ok) return { results: [], total: 0, source: 'error', error: `HTTP ${res.status}` };
      const data = await res.json();
      return data as SFXSearchResponse;
    } catch (err: any) {
      return { results: [], total: 0, source: 'error', error: err.message };
    }
  }

  static async downloadSFX(freesoundId: number | string): Promise<{ success: boolean; id: string; cached: boolean }> {
    const res = await fetch('/api/audiobook/sfx/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freesoundId })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao baixar efeito sonoro.');
    }
    return await res.json();
  }

  static async listCachedSFX(): Promise<SFXItem[]> {
    try {
      const res = await fetch('/api/audiobook/sfx/cached');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.effects || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        durationSeconds: e.duration,
        license: e.license,
        previewUrl: `/api/audiobook/sfx/file/${encodeURIComponent(e.id)}`,
        category: e.category,
        source: e.source,
        cached: true
      }));
    } catch {
      return [];
    }
  }
}

export interface SFXItem {
  id: string;
  name: string;
  description?: string;
  durationSeconds: number;
  license: string;
  previewUrl: string | null;
  downloadUrl?: string | null;
  category?: string;
  tags?: string[];
  source?: 'local' | 'freesound' | 'local_fallback';
  cached?: boolean;
  freesoundId?: number;
}

export interface SFXSearchResponse {
  results: SFXItem[];
  total: number;
  source: string;
  freesoundConfigured?: boolean;
  error?: string;
}

