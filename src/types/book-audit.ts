// ============================================================
// TIPOS DA AUDITORIA FINAL COMPLETA DO LIVRO (SEÇÃO 44)
// Controle de Qualidade Editorial, Técnico e Gráfico KDP
// ============================================================

export type AuditSeverity = 'critical' | 'important' | 'warning';
export type AuditStatus = 'approved' | 'warning' | 'blocked';

export type AuditCategory =
  | 'planning'
  | 'title'
  | 'subtitle'
  | 'synopsis'
  | 'preface'
  | 'outline'
  | 'chapters'
  | 'pages'
  | 'content'
  | 'repetitions'
  | 'anti_hallucination'
  | 'similarity'
  | 'pagination'
  | 'typesetting'
  | 'images'
  | 'cover'
  | 'preview'
  | 'statistics'
  | 'metadata'
  | 'files'
  | 'export_config'
  | 'publication_ready';

export interface AuditCheckItem {
  id: string;
  category: AuditCategory;
  categoryLabel: string;
  name: string;
  passed: boolean;
  severity: AuditSeverity;
  details: string;
  affectedElements?: string[];
  snippet?: string;
  suggestion?: string;
  autoFixAvailable?: boolean;
  fixAction?: 
    | 'sync_title' 
    | 'sync_subtitle' 
    | 'sync_outline_pagination' 
    | 'generate_missing_page' 
    | 'select_cover' 
    | 'fill_metadata'
    | 'dismiss_warning';
}

export interface FinalRealStats {
  chaptersCount: number;
  sectionsCount: number;
  pagesCount: number;
  wordsCount: number;
  charactersCount: number;
  imagesCount: number;
  completedPagesCount: number;
  pendingPagesCount: number;
}

export interface HallucinationFinding {
  item: string;
  location: string;
  reason: string;
  status: 'verified' | 'needs_check';
  recommendation: string;
}

export interface RepetitionFinding {
  repeatedSnippet: string;
  occurrences: string[];
  suggestion: string;
}

export interface BookAuditReport {
  overallStatus: AuditStatus; // 'approved' | 'warning' | 'blocked'
  score: number; // 0 - 100
  canFinalize: boolean; // true se criticalCount === 0
  criticalCount: number;
  importantCount: number;
  warningCount: number;
  passedCount: number;
  totalChecks: number;
  checks: AuditCheckItem[];
  realStats: FinalRealStats;
  similarityRisk: 'low' | 'moderate' | 'elevated';
  similarityPercentage: number;
  similaritySummary: string;
  hallucinationFindings: HallucinationFinding[];
  repetitionFindings: RepetitionFinding[];
  summary: string;
  timestamp: number;
}
