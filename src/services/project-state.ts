// ================================================================
// PROJECT_STATE — estado editorial central, isolado por projectId
// REGRAS: "Novo projeto" = entidade nova e vazia (nunca carrega o último).
// Abrir = carregar por id explícito. Duplicar = cópia explícita (novo id).
// ================================================================
import type { CanonicalBookBible } from './continuity-engine';
import type { AgeBandId } from './age-engine';

export type ProjectStatus =
  | 'DRAFT' | 'THEME_SELECTED' | 'MARKET_ANALYZED' | 'TITLE_SELECTED'
  | 'CONCEPT_APPROVED' | 'OUTLINE_APPROVED' | 'BIBLE_READY' | 'GENERATING'
  | 'AUDITING' | 'REPAIR_REQUIRED' | 'CHAPTER_APPROVED' | 'MANUSCRIPT_COMPLETE'
  | 'FINAL_AUDIT' | 'KDP_READY' | 'BLOCKED';

export interface MarketReference {
  asin?: string;
  title: string;
  subtitle?: string;
  author?: string;
  bsr?: number | null;
  /** tipo de ranking: BSR real da Amazon x posição nos resultados de busca */
  rankType: 'BSR' | 'SEARCH_POSITION' | 'UNKNOWN';
  rank?: number | null;
  rating?: number | null;
  reviews?: number | null;
  price?: number | null;
  category?: string;
  source: string;
  collectedAt: number;
  referenceScore?: number;
}

export interface OutlineEntry {
  index: number;
  title: string;
  objective: string;
  characters?: string[];
  locations?: string[];
  objects?: string[];
}

export interface ChapterVersion {
  version: number;
  title: string;
  text: string;
  createdAt: number;
  approved: boolean;
}

export interface ProjectChapter {
  index: number;
  versions: ChapterVersion[];
  currentVersion: number;
  approved: boolean;
}

export interface AuditLogEntry {
  timestamp: number;
  projectId: string;
  action: string;
  actor: 'user' | 'system' | 'ai';
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}

export interface EditorialProjectState {
  projectId: string;
  sessionId: string;
  seriesId: string | null;
  duplicatedFromProjectId: string | null;

  title: string;
  subtitle: string;
  author: string;
  genre: string;
  theme: string;
  subtheme: string;
  premise: string;
  uniqueAngle: string;
  bookPromise: string;
  targetReader: string;

  language: string;
  targetAge: AgeBandId | null;
  isChildrenBook: boolean;
  targetPages: number | null;
  maxChapters: number | null;
  kdpTrimSize: string;
  chapterSize: string;
  chapterColor: string;

  research: { query: string; marketplace: string; category: string; collectedAt: number } | null;
  references: MarketReference[];
  titleOptions: string[];
  subtitleOptions: string[];

  concept: { approved: boolean } | null;
  outline: OutlineEntry[] | null;
  outlineLocked: boolean;
  bookBible: CanonicalBookBible | null;
  bibleApproved: boolean;

  approvals: { theme: boolean; market: boolean; title: boolean; concept: boolean };
  chapters: ProjectChapter[];
  characters: { id: string; name: string; permanent?: any }[];
  locations: any[];
  objects: any[];

  cover: string | null;
  coverVariants: string[];
  metadata: Record<string, unknown> | null;
  audit: { critical: number; red: number; at: number } | null;
  pdf: { pageCount: number; preflightOk: boolean; at: number } | null;
  finalAuditPassed: boolean;
  aiAssisted: boolean;

  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
  auditLog: AuditLogEntry[];
}

export function newId(prefix = ''): string {
  const c: any = (globalThis as any).crypto;
  const raw = c?.randomUUID
    ? c.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
        const r = (Math.random() * 16) | 0;
        return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
  return prefix + raw;
}

/** Estado inicial 100% vazio — NENHUM dado de projeto anterior. */
export function createEmptyProjectState(): EditorialProjectState {
  const now = Date.now();
  return {
    projectId: newId('prj_'),
    sessionId: newId('ses_'),
    seriesId: null,
    duplicatedFromProjectId: null,
    title: '', subtitle: '', author: '', genre: '', theme: '', subtheme: '',
    premise: '', uniqueAngle: '', bookPromise: '', targetReader: '',
    language: '', targetAge: null, isChildrenBook: false,
    targetPages: null, maxChapters: null,
    kdpTrimSize: '', chapterSize: '', chapterColor: '',
    research: null, references: [], titleOptions: [], subtitleOptions: [],
    concept: null, outline: null, outlineLocked: false,
    bookBible: null, bibleApproved: false,
    approvals: { theme: false, market: false, title: false, concept: false },
    chapters: [],
    characters: [],
    locations: [],
    objects: [],
    cover: null, coverVariants: [], metadata: null,
    audit: null, pdf: null, finalAuditPassed: false, aiAssisted: false,
    status: 'DRAFT',
    createdAt: now, updatedAt: now, auditLog: [],
  };
}

// ---------------------------------------------------------------
// STORAGE — sempre por projectId (nunca uma chave global "último")
// ---------------------------------------------------------------
export interface KeyValueStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  key(i: number): string | null;
  readonly length: number;
}

export function createMemoryStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return {
    getItem: k => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: k => void m.delete(k),
    key: i => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
}

const PREFIX = 'kdp_editorial_project:';

function defaultStorage(): KeyValueStorage {
  try {
    if (typeof localStorage !== 'undefined') return localStorage as unknown as KeyValueStorage;
  } catch { /* ignore */ }
  return createMemoryStorage();
}

export class ProjectStore {
  constructor(private storage: KeyValueStorage = defaultStorage()) {}

  private k(id: string) { return PREFIX + id; }

  save(state: EditorialProjectState): void {
    state.updatedAt = Date.now();
    this.storage.setItem(this.k(state.projectId), JSON.stringify(state));
  }

  /** carrega SOMENTE por id explícito */
  open(projectId: string): EditorialProjectState | null {
    const raw = this.storage.getItem(this.k(projectId));
    if (!raw) return null;
    try {
      const st = JSON.parse(raw) as EditorialProjectState;
      return st.projectId === projectId ? st : null;
    } catch { return null; }
  }

  list(): EditorialProjectState[] {
    const out: EditorialProjectState[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(PREFIX)) {
        const st = this.open(key.slice(PREFIX.length));
        if (st) out.push(st);
      }
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  remove(projectId: string): void { this.storage.removeItem(this.k(projectId)); }

  /** Duplicação só acontece quando o usuário pede; novo projectId + origem registrada */
  duplicate(projectId: string, newTitle?: string): EditorialProjectState | null {
    const src = this.open(projectId);
    if (!src) return null;
    const copy: EditorialProjectState = JSON.parse(JSON.stringify(src));
    copy.projectId = newId('prj_');
    copy.sessionId = newId('ses_');
    copy.duplicatedFromProjectId = src.projectId;
    copy.title = newTitle || (src.title ? `${src.title} (cópia)` : '');
    copy.createdAt = Date.now();
    copy.auditLog = [];
    logAction(copy, 'duplicate', 'user', undefined, { from: src.projectId });
    this.save(copy);
    return copy;
  }
}

export function logAction(
  st: EditorialProjectState, action: string, actor: AuditLogEntry['actor'],
  oldValue?: unknown, newValue?: unknown, reason?: string,
): void {
  st.auditLog.push({ timestamp: Date.now(), projectId: st.projectId, action, actor, oldValue, newValue, reason });
}

// ---------------------------------------------------------------
// PROJECT_CONTEXT_ISOLATOR
// ---------------------------------------------------------------
export class ProjectContextContaminationError extends Error {
  constructor(public currentProjectId: string, public contextProjectId: string) {
    super(`Contexto bloqueado: pertence ao projeto ${contextProjectId}, mas o projeto atual é ${currentProjectId}.`);
  }
}

export function assertSameProject(currentProjectId: string, ctx: { projectId: string }): void {
  if (!ctx || ctx.projectId !== currentProjectId) {
    throw new ProjectContextContaminationError(currentProjectId, ctx?.projectId ?? '(sem projectId)');
  }
}
