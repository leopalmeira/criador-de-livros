// ================================================================
// TIPOS DO ECOSSISTEMA DE AUDIOBOOK & PUBLICAÇÃO MULTIPLATAFORMA
// Book Intel KDP — AI Publishing Studio (1 Conteúdo → Vários Formatos)
// ================================================================

export type AudiobookNarrationMethod = 'notebooklm' | 'ai-tts' | 'human-upload';

export type AudiobookType = 
  | 'traditional'    // Audiobook Tradicional (Linear com voz única)
  | 'ai-narrated'    // Narrado por IA (Voz neural sintetizada)
  | 'human-narrated' // Narrado por Humano (Gravação em estúdio)
  | 'dramatized';    // Produção Dramatizada (Múltiplas vozes e ambientação)

export type ChapterAudioStatus = 'pendente' | 'pronto' | 'alterado' | 'erro';

export interface AudiobookChapterItem {
  id: string;
  chapterIndex: number;
  title: string;
  textSnippet: string;
  fullText: string;
  status: ChapterAudioStatus;
  audioBlobUrl?: string;
  audioFileName?: string;
  audioFileSize?: number;
  durationSeconds: number;
  wordCount: number;
  isStale?: boolean; // Verdadeiro se o texto do livro foi alterado após gerar o áudio
  lastGeneratedAt?: number;
  error?: string;
  // Campos do Smart Sound Design e Multi-track
  timelineEvents?: import('./audiobook-studio').SoundTimelineEvent[];
  voiceBlobUrl?: string;
  mixedBlobUrl?: string;
  voiceBlob?: Blob;
  mixedBlob?: Blob;
  soundDesignAnalyzed?: boolean;
}

export interface AudiobookConfig {
  title: string;
  subtitle: string;
  author: string;
  narrator: string;
  language: string;
  type: AudiobookType;
  method: AudiobookNarrationMethod;
  voiceName?: string;
  pitch: number;
  rate: number;
  volume: number;
}

export interface AudiobookAuditIssue {
  id: string;
  level: 'critico' | 'aviso';
  message: string;
  field?: string;
}

export interface AudiobookAuditReport {
  isReady: boolean;
  totalChapters: number;
  readyChapters: number;
  totalDurationSeconds: number;
  issues: AudiobookAuditIssue[];
  checkedAt: number;
}

export type DistributionPlatformId = 'spotify' | 'audible' | 'apple' | 'google' | 'kobo';

export interface DistributionPlatformInfo {
  id: DistributionPlatformId;
  name: string;
  shortName: string;
  tagline: string;
  status: 'nao_preparado' | 'pronto_para_publicar' | 'publicado';
  audioFormatRequirements: string;
  coverSpecs: string;
  payoutModel: string; // Ex: "70% KDP / ACX" ou "Pagamento por stream / consumo"
  isOfficialIntegrationAvailable: boolean; // false = requer preparação de pacote e envio manual oficial
  officialUploadUrl: string;
  instructions: string[];
}

export interface MultiplatformPublishingState {
  bookId: string;
  audiobookReady: boolean;
  audiobookOutdated: boolean;
  selectedPlatforms: DistributionPlatformId[];
  lastExportedPackageAt?: number;
  formats: {
    kindle: boolean;
    paperback: boolean;
    hardcover: boolean;
  };
}

export interface RoyaltyScenario {
  listeners: number;
  hoursConsumed: number;
  estimatedEarningsBrl: number;
  estimatedEarningsUsd: number;
}

export interface RoyaltySimulatorParams {
  platform: DistributionPlatformId;
  durationMinutes: number;
  estimatedListeners: number;
  estimatedStreams: number;
  periodMonths: number;
  conservative: RoyaltyScenario;
  moderate: RoyaltyScenario;
  optimistic: RoyaltyScenario;
  disclaimer: string;
}
