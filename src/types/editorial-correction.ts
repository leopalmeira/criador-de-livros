// ================================================================
// TIPOS DO FLUXO DE CORREÇÃO EDITORIAL AUTOMÁTICA (CAPÍTULO A CAPÍTULO)
// Correção → Continuidade → Revisão cruzada → Sumário → Capa →
// Diagramação → PDF → Validação → Dashboard
// ================================================================

export type ChapterStatus =
  | 'aguardando'
  | 'em_analise'
  | 'corrigindo'
  | 'validando'
  | 'corrigido_salvo'
  | 'pendente_autor'
  | 'erro';

export type Resolution =
  | 'CORRIGIDO_AUTOMATICAMENTE'
  | 'PENDENTE_VALIDACAO_AUTOR'
  | 'NAO_FOI_POSSIVEL_VERIFICAR';

export type ChangeType =
  | 'ortografia'
  | 'acentuacao'
  | 'gramatica'
  | 'pontuacao'
  | 'espacamento'
  | 'paragrafo'
  | 'dialogo'
  | 'estilo'
  | 'repeticao'
  | 'codificacao'
  | 'titulo'
  | 'continuidade';

export interface CorrectionChange {
  id: string;
  chapterIndex: number; // 0-based
  original: string;
  corrected: string;
  type: ChangeType;
  reason: string;
  resolution: Resolution;
  source: 'regras' | 'ia' | 'revisao_cruzada';
  /** nº de ocorrências reais representadas por este registro (padrão 1) */
  occurrences?: number;
}

export type PendingKind =
  | 'continuidade'
  | 'repeticao'
  | 'titulo'
  | 'sentido'
  | 'codificacao'
  | 'ia'
  | 'outro';

export interface PendingItem {
  id: string;
  chapterIndex: number; // -1 = livro inteiro
  kind: PendingKind;
  description: string;
  snippet?: string;
  resolution: Resolution;
}

export interface ChapterRecord {
  index: number;
  title: string;
  originalTitle: string;
  originalText: string;
  correctedText: string;
  status: ChapterStatus;
  changes: CorrectionChange[];
  errorsFound: number;
  errorsFixed: number;
  pendings: PendingItem[];
  validation: { ok: boolean; notes: string[] };
  aiVerified: boolean;
  model?: string;
  blocks: number;
  correctedAt?: number;
  error?: string;
}

export interface ContinuityEntity {
  firstChapter: number;
  lastChapter: number;
  mentions: number;
  traits: string[];
  state?: string;
  location?: string;
}

export interface ContinuityRegistry {
  characters: Record<string, ContinuityEntity>;
  locations: Record<string, ContinuityEntity>;
  objects: Record<string, ContinuityEntity>;
  timeline: { chapter: number; event: string }[];
  revealed: string[];
  mysteriesOpen: string[];
  mysteriesResolved: string[];
  chapterEndStates: { chapter: number; summary: string }[];
  mustRemember: string[];
  aiChapters: number[]; // capítulos cuja continuidade foi enriquecida por IA
}

export interface TocEntry {
  index: number;
  title: string;
  page?: number;
}

export interface CoverStatus {
  present: boolean;
  valid: boolean;
  kind: 'frontal' | 'ausente';
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
  notes: string[];
}

export interface PdfCheck {
  id: string;
  label: string;
  /** true = ok · false = falhou · null = não foi possível verificar neste ambiente */
  ok: boolean | null;
  critical: boolean;
  detail: string;
}

export interface PdfValidationResult {
  ok: boolean;
  pageCount: number;
  checks: PdfCheck[];
  criticalFailures: number;
  notVerified: number;
  validatedAt: number;
}

export interface LayoutSummary {
  pageCount: number;
  chapterStartPages: number[];
  tocPages: number;
  passes: number;
  warnings: string[];
}

export type JobStatus =
  | 'em_andamento'
  | 'interrompido'
  | 'aguardando_capa'
  | 'falha'
  | 'falha_validacao'
  | 'concluido';

export interface ManuscriptSnapshot {
  titulo: string;
  subtitulo: string;
  autor: string;
  genero: string;
  idioma: string;
  topico?: string;
  capitulos: { titulo: string; texto: string }[];
}

export interface CrossReviewResult {
  executedAt: number;
  aiVerified: boolean;
  autoChanges: CorrectionChange[];
  findings: PendingItem[];
  notes: string[];
}

export interface EditorialJob {
  id: string;
  bookId: string;
  startedAt: number;
  updatedAt: number;
  lastRunAt: number;
  status: JobStatus;
  stage: string;
  stageMessage: string;
  original: ManuscriptSnapshot;
  originalHash: string;
  chapters: ChapterRecord[];
  continuity: ContinuityRegistry;
  crossReview?: CrossReviewResult;
  consolidatedHash?: string;
  toc: TocEntry[];
  tocIssues: string[];
  cover: CoverStatus;
  layout?: LayoutSummary;
  pdfValidation?: PdfValidationResult;
  finalBookId?: string;
  log: string[];
}

export interface EditorialReport {
  generatedAt: number;
  bookTitle: string;
  author: string;
  pagesAnalyzed: number; // páginas estimadas do manuscrito (palavras/250)
  pdfPages: number;
  chaptersIdentified: number;
  chaptersCorrected: number;
  chaptersPending: number;
  spellingErrors: number;
  grammarErrors: number;
  punctuationFixes: number;
  paragraphFixes: number;
  dialogueFixes: number;
  encodingFixes: number;
  styleChanges: number;
  repetitionFindings: number;
  continuityFindings: number;
  tocIssues: string[];
  layoutWarnings: string[];
  cover: CoverStatus;
  pdfValidation?: PdfValidationResult;
  correctedAutomatically: CorrectionChange[];
  pendingAuthor: PendingItem[];
  notVerified: PendingItem[];
  aiFullyVerified: boolean;
  summary: string;
}

export interface FinalBookRecord {
  id: string;
  bookId: string;
  jobId: string;
  title: string;
  subtitle: string;
  author: string;
  coverDataUrl?: string;
  pdf: ArrayBuffer;
  pageCount: number;
  sizeBytes: number;
  finalizedAt: number;
  status: 'finalizado_validado';
  report: EditorialReport;
  pendings: PendingItem[];
  validation: PdfValidationResult;
  manuscriptText?: string;
  genre?: string;
  trimSize?: string;
  wordCount?: number;
  chaptersCount?: number;
  chapters?: Array<{ titulo: string; texto: string }>;
  promoData?: any;
  descriptionHtml?: string;
  projectId?: string;
  language?: string;
  tags?: string[];
  kdpExportApproved?: boolean;
  validationReport?: any;
  audiobook?: import('./book-project').BookAudiobookAsset;
}
