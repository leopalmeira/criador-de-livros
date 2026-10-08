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
  narratorVoiceId?: string;
  chapters: Array<{
    title?: string;
    titulo?: string;
    text?: string;
    texto?: string;
    speakerSegments?: Array<{
      speakerId: string;
      text: string;
      voiceId: string;
    }>;
  }>;
}

export interface AudiobookCastMember {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'unknown';
  voiceId?: string;
}

export interface AudiobookCastSegment {
  speakerId: string;
  text: string;
  pauseAfterMs?: number;
  soundCue?: string | null;
}

export interface AudiobookCastChapter {
  index: number;
  title: string;
  segments: AudiobookCastSegment[];
}

export interface AudiobookCastAnalysis {
  cast: AudiobookCastMember[];
  chapters: AudiobookCastChapter[];
}

export interface FishAudioVoice {
  id: string;
  title: string;
  languages: string[];
}

export interface AudiobookSelectableVoice extends FishAudioVoice {
  provider: 'fish-audio' | 'neural-cloud';
}

const DEFAULT_LANGUAGES: AudiobookLanguage[] = [
  { id: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { id: 'en-US', label: 'Inglês', flag: '🇺🇸' },
  { id: 'es-ES', label: 'Espanhol', flag: '🇪🇸' },
  { id: 'fr-FR', label: 'Francês', flag: '🇫🇷' },
  { id: 'de-DE', label: 'Alemão', flag: '🇩🇪' },
  { id: 'it-IT', label: 'Italiano', flag: '🇮🇹' }
];

const MAX_CAST_CHAPTER_CHARS = 3_500;
const MAX_CAST_BATCH_CHARS = 3_500;
const MAX_CAST_BATCH_CHAPTERS = 20;

interface CastAnalysisTextChunk {
  originalChapterIndex: number;
  title: string;
  text: string;
}

function splitCastAnalysisChapter(
  chapter: { title: string; text: string },
  originalChapterIndex: number
): CastAnalysisTextChunk[] {
  const chunks: CastAnalysisTextChunk[] = [];
  let start = 0;
  while (start < chapter.text.length) {
    let end = Math.min(start + MAX_CAST_CHAPTER_CHARS, chapter.text.length);
    if (end < chapter.text.length) {
      let boundary = end;
      while (boundary > start && !/\s/.test(chapter.text[boundary - 1])) boundary--;
      if (boundary > start) end = boundary;
    }
    if (end <= start) end = Math.min(start + MAX_CAST_CHAPTER_CHARS, chapter.text.length);
    chunks.push({
      originalChapterIndex,
      title: chapter.title,
      text: chapter.text.slice(start, end)
    });
    start = end;
  }
  return chunks;
}

function normalizeCastName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizeCastText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

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

  static async listFishAudioVoices(): Promise<FishAudioVoice[]> {
    const res = await fetch('/api/audiobook/fish-audio/models', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Não foi possível carregar as vozes da conta Fish Audio.');
    }
    if (!data.configured) {
      throw new Error('Configure FISH_API_KEY no ambiente do servidor para listar as vozes.');
    }
    return Array.isArray(data.voices) ? data.voices : [];
  }

  static async listAudiobookVoices(language: string): Promise<AudiobookSelectableVoice[]> {
    const [fishResult, neuralResult] = await Promise.allSettled([
      this.listFishAudioVoices(),
      this.fetchVoices(language)
    ]);
    const fishVoices = fishResult.status === 'fulfilled' ? fishResult.value : [];
    const neuralResponse = neuralResult.status === 'fulfilled' ? neuralResult.value : null;
    const hasNeuralCatalog = Array.isArray(neuralResponse?.voices);
    const neuralVoices = hasNeuralCatalog
      ? neuralResponse.voices.filter((voice) => voice.provider === 'neural-cloud')
      : [];
    if (!hasNeuralCatalog && fishVoices.length === 0) {
      throw new Error('Não foi possível carregar o catálogo de vozes. Verifique a conexão e tente novamente.');
    }
    return [
      ...fishVoices.map((voice) => ({
        ...voice,
        id: `fish:${voice.id}`,
        provider: 'fish-audio' as const
      })),
      ...neuralVoices.map((voice) => ({
        id: voice.id,
        title: voice.name,
        languages: [voice.language],
        provider: 'neural-cloud' as const
      }))
    ];
  }

  static async analyzeAudiobookCast(
    chapters: Array<{ title: string; text: string }>,
    onProgress?: (currentBatch: number, totalBatches: number) => void
  ): Promise<AudiobookCastAnalysis> {
    if (
      chapters.length === 0 ||
      chapters.some((chapter) => typeof chapter.text !== 'string' || !chapter.text.trim())
    ) {
      throw new Error('Inclua capítulos com texto antes de analisar o elenco.');
    }
    const textChunks = chapters.flatMap((chapter, index) =>
      splitCastAnalysisChapter(chapter, index)
    );
    const batches: CastAnalysisTextChunk[][] = [];
    let currentBatch: CastAnalysisTextChunk[] = [];
    let currentBatchChars = 0;
    for (const chunk of textChunks) {
      if (
        currentBatch.length > 0 &&
        (currentBatch.length >= MAX_CAST_BATCH_CHAPTERS ||
          currentBatchChars + chunk.text.length > MAX_CAST_BATCH_CHARS)
      ) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchChars = 0;
      }
      currentBatch.push(chunk);
      currentBatchChars += chunk.text.length;
    }
    if (currentBatch.length > 0) batches.push(currentBatch);

    const cast: AudiobookCastMember[] = [
      { id: 'narrator', name: 'Narrador', gender: 'unknown' }
    ];
    const castByName = new Map<string, AudiobookCastMember>();
    const analyzedChapters: AudiobookCastChapter[] = chapters.map((chapter, index) => ({
      index,
      title: chapter.title,
      segments: []
    }));

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      onProgress?.(batchIndex + 1, batches.length);
      const batch = batches[batchIndex];
      const requestChapters = batch.map((chunk, index) => ({
        id: `batch-${batchIndex + 1}-chapter-${index + 1}`,
        title: chunk.title,
        text: chunk.text
      }));
      const res = await fetch('/api/audiobook/analyze-cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapters: requestChapters,
          knownCast: cast.filter((member) => member.id !== 'narrator')
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'A IA não conseguiu identificar os interlocutores.');
      }
      if (!Array.isArray(data.cast) || !Array.isArray(data.chapters) ||
          data.chapters.length !== batch.length) {
        throw new Error('A análise retornou um formato inválido. Tente novamente.');
      }

      const speakerIdMap = new Map<string, string>();
      for (const member of data.cast as AudiobookCastMember[]) {
        if (!member?.id || !member.name) {
          throw new Error('A análise retornou um integrante de elenco inválido.');
        }
        if (member.id === 'narrator' || normalizeCastName(member.name) === 'narrador') {
          speakerIdMap.set(member.id, 'narrator');
          continue;
        }
        const nameKey = normalizeCastName(member.name);
        let globalMember = castByName.get(nameKey);
        if (!globalMember) {
          if (cast.length >= 100) {
            throw new Error('A análise encontrou mais de 99 personagens. Divida a obra em volumes para continuar.');
          }
          globalMember = {
            id: `cast-${cast.length}`,
            name: member.name,
            gender: member.gender
          };
          cast.push(globalMember);
          castByName.set(nameKey, globalMember);
        }
        speakerIdMap.set(member.id, globalMember.id);
      }

      for (let chapterIndex = 0; chapterIndex < batch.length; chapterIndex++) {
        const analyzed = data.chapters[chapterIndex];
        if (!Array.isArray(analyzed?.segments)) {
          throw new Error('A análise retornou segmentos inválidos. Tente novamente.');
        }
        const destination = analyzedChapters[batch[chapterIndex].originalChapterIndex];
        for (const segment of analyzed.segments as AudiobookCastSegment[]) {
          const speakerId = speakerIdMap.get(segment.speakerId);
          if (!speakerId || typeof segment.text !== 'string' || segment.text.length === 0) {
            throw new Error('A análise retornou segmentos sem um interlocutor válido.');
          }
          destination.segments.push({
            speakerId,
            text: segment.text,
            pauseAfterMs: segment.pauseAfterMs,
            soundCue: segment.soundCue
          });
        }
      }
    }

    for (const chapter of analyzedChapters) {
      if (normalizeCastText(chapter.segments.map((segment) => segment.text).join('')) !==
          normalizeCastText(chapters[chapter.index].text)) {
        throw new Error(`A análise não preservou todo o texto do capítulo "${chapter.title}". Tente novamente.`);
      }
    }
    return { cast, chapters: analyzedChapters };
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

  static async renderFinalMp3(mixedWav: Blob): Promise<Blob> {
    const response = await fetch('/api/audiobook/render-mp3', {
      method: 'POST',
      headers: { 'Content-Type': 'audio/wav' },
      body: mixedWav
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Não foi possível gerar o MP3 final.');
    }
    const mp3 = await response.blob();
    if (mp3.size < 500 || mp3.type !== 'audio/mpeg') {
      throw new Error('O servidor retornou um MP3 vazio ou inválido.');
    }
    return mp3;
  }

  // ================================================================
  // PRÉVIA / TESTE DE VOZ
  // ================================================================
  static getVoicePreviewUrl(
    language: string,
    voiceGender: AudiobookVoiceGender,
    voiceId?: string
  ): string {
    const params = new URLSearchParams({ language, voiceGender });
    if (voiceId) params.set('voiceId', voiceId);
    return `/api/audiobook/preview-voice?${params.toString()}`;
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
