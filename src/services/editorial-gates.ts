// ================================================================
// GATES — o APLICATIVO controla o fluxo; a IA só executa tarefas autorizadas
// ================================================================
import { validateAgeRequirement } from './age-engine';
import type { EditorialProjectState, ProjectStatus } from './project-state';

export type GateId =
  | 'GATE_THEME' | 'GATE_MARKET' | 'GATE_TITLE' | 'GATE_CONCEPT' | 'GATE_OUTLINE' | 'GATE_BIBLE'
  | 'GATE_CHAPTER' | 'GATE_CONTINUITY' | 'GATE_MANUSCRIPT' | 'GATE_COVER' | 'GATE_PDF'
  | 'GATE_FINAL_AUDIT' | 'GATE_KDP';

export const GATE_ORDER: GateId[] = [
  'GATE_THEME', 'GATE_MARKET', 'GATE_TITLE', 'GATE_CONCEPT', 'GATE_OUTLINE', 'GATE_BIBLE',
  'GATE_CHAPTER', 'GATE_CONTINUITY', 'GATE_MANUSCRIPT', 'GATE_COVER', 'GATE_PDF', 'GATE_FINAL_AUDIT', 'GATE_KDP',
];

export type GateStatus = 'PASSED' | 'OPEN' | 'LOCKED';
export interface GateResult { gate: GateId; status: GateStatus; reasons: string[] }

export class GateBlockedError extends Error {
  constructor(public gate: GateId, public reasons: string[]) {
    super(`${gate} bloqueado: ${reasons.join('; ')}`);
  }
}

const filled = (s: unknown) => typeof s === 'string' && s.trim().length > 0;

/** checagem local do gate (sem dependências) */
function check(gate: GateId, s: EditorialProjectState): string[] {
  const r: string[] = [];
  switch (gate) {
    case 'GATE_THEME': {
      if (!filled(s.theme)) r.push('Escolha o tema do livro.');
      const age = validateAgeRequirement(s.isChildrenBook, s.targetAge);
      if (!age.ok) r.push(age.reason!);
      if (!s.approvals.theme) r.push('Tema ainda não aprovado.');
      break;
    }
    case 'GATE_MARKET':
      if (!s.research) r.push('Execute a análise de mercado.');
      if (s.references.length === 0) r.push('Nenhuma referência de mercado disponível.');
      if (!s.approvals.market) r.push('Pesquisa ainda não aprovada.');
      break;
    case 'GATE_TITLE':
      if (!filled(s.title)) r.push('Defina o título.');
      if (!s.approvals.title) r.push('Título ainda não aprovado.');
      break;
    case 'GATE_CONCEPT':
      if (!filled(s.premise)) r.push('Premissa ausente.');
      if (!filled(s.uniqueAngle)) r.push('Diferencial (UNIQUE_ANGLE) ausente.');
      if (!filled(s.bookPromise)) r.push('Promessa do livro (BOOK_PROMISE) ausente.');
      if (!filled(s.targetReader)) r.push('Leitor-alvo (TARGET_READER) ausente.');
      if (!s.approvals.concept) r.push('Conceito ainda não aprovado.');
      break;
    case 'GATE_OUTLINE':
      if (!s.outline || s.outline.length === 0) r.push('Outline não gerado.');
      if (!s.outlineLocked) r.push('Outline ainda não aprovado/travado.');
      break;
    case 'GATE_BIBLE':
      if (!s.bookBible) r.push('Book Bible não criada.');
      else if (s.bookBible.projectId !== s.projectId) r.push('Book Bible pertence a outro projeto.');
      if (!s.bibleApproved) r.push('Book Bible ainda não aprovada.');
      break;
    case 'GATE_CHAPTER': {
      const total = s.outline?.length ?? 0;
      const approved = s.chapters.filter(c => c.approved).length;
      if (total === 0) r.push('Sem outline.');
      else if (approved === 0) r.push('Nenhum capítulo aprovado.');
      break;
    }
    case 'GATE_CONTINUITY':
      if (!s.audit) r.push('Auditoria de continuidade não executada.');
      else {
        if (s.audit.critical > 0) r.push(`${s.audit.critical} erro(s) CRÍTICO(s) pendente(s).`);
        if (s.audit.red > 0) r.push(`${s.audit.red} erro(s) RED pendente(s).`);
      }
      break;
    case 'GATE_MANUSCRIPT': {
      const total = s.outline?.length ?? 0;
      const approved = s.chapters.filter(c => c.approved).length;
      if (total === 0 || approved < total) r.push(`Manuscrito incompleto (${approved}/${total} capítulos aprovados).`);
      break;
    }
    case 'GATE_COVER':
      if (!s.cover) r.push('Capa não aprovada.');
      break;
    case 'GATE_PDF':
      if (!s.pdf) r.push('PDF não gerado.');
      else if (!s.pdf.preflightOk) r.push('PDF reprovado no preflight.');
      break;
    case 'GATE_FINAL_AUDIT':
      if (!s.finalAuditPassed) r.push('Auditoria final não aprovada.');
      break;
    case 'GATE_KDP': {
      const m = s.metadata || {};
      for (const k of ['description', 'categories', 'keywords', 'language', 'rights']) if (!m[k] || (Array.isArray(m[k]) && !(m[k] as unknown[]).length)) r.push(`Metadado KDP ausente: ${k}.`);
      if (s.isChildrenBook && !s.targetAge) r.push('Faixa etária ausente.');
      if (typeof m['aiAssisted'] !== 'boolean') r.push('Informação de IA (AI_ASSISTED_CONTENT) não registrada.');
      break;
    }
  }
  return r;
}

export function evaluateGates(s: EditorialProjectState): GateResult[] {
  const results: GateResult[] = [];
  let blockedBy: GateId | null = null;
  for (const gate of GATE_ORDER) {
    const own = check(gate, s);
    if (blockedBy) { results.push({ gate, status: 'LOCKED', reasons: [`Depende de ${blockedBy}.`, ...own] }); continue; }
    if (own.length === 0) results.push({ gate, status: 'PASSED', reasons: [] });
    else { results.push({ gate, status: 'OPEN', reasons: own }); blockedBy = gate; }
  }
  return results;
}

export function gateResult(s: EditorialProjectState, gate: GateId): GateResult {
  return evaluateGates(s).find(g => g.gate === gate)!;
}

/** Lança se o gate (ou qualquer dependência anterior) não estiver aprovado. */
export function assertCanAdvance(s: EditorialProjectState, toGate: GateId): void {
  const idx = GATE_ORDER.indexOf(toGate);
  const before = evaluateGates(s).slice(0, idx).filter(g => g.status !== 'PASSED');
  if (before.length) throw new GateBlockedError(toGate, before.flatMap(b => [`${b.gate}: ${b.reasons[0] ?? 'pendente'}`]));
}

/** Gera SOMENTE o próximo capítulo permitido (sequencial, com anterior aprovado). */
export function nextAllowedChapter(s: EditorialProjectState): { index: number | null; reasons: string[] } {
  try { assertCanAdvance(s, 'GATE_CHAPTER'); } catch (e) { return { index: null, reasons: (e as GateBlockedError).reasons }; }
  const total = s.outline?.length ?? 0;
  for (let i = 0; i < total; i++) {
    const ch = s.chapters.find(c => c.index === i);
    if (!ch || !ch.approved) return { index: i, reasons: [] };
  }
  return { index: null, reasons: ['Todos os capítulos já foram aprovados.'] };
}

export function canGenerateChapter(s: EditorialProjectState, index: number): { ok: boolean; reasons: string[] } {
  const next = nextAllowedChapter(s);
  if (next.index === null) return { ok: false, reasons: next.reasons };
  return index === next.index ? { ok: true, reasons: [] } : { ok: false, reasons: [`Só é permitido gerar o capítulo ${next.index + 1} agora.`] };
}

/** Erro crítico bloqueia finalização; nada de "seguir mesmo com erro". */
export function canFinalize(s: EditorialProjectState): { ok: boolean; reasons: string[] } {
  const bad = evaluateGates(s).filter(g => g.status !== 'PASSED' && g.gate !== 'GATE_KDP');
  if (bad.length) return { ok: false, reasons: bad.map(b => `${b.gate}: ${b.reasons[0]}`) };
  if (s.audit && s.audit.critical > 0) return { ok: false, reasons: ['Erro CRÍTICO pendente.'] };
  return { ok: true, reasons: [] };
}

export function deriveStatus(s: EditorialProjectState): ProjectStatus {
  if (s.audit && s.audit.critical > 0) return 'BLOCKED';
  const g = Object.fromEntries(evaluateGates(s).map(x => [x.gate, x.status])) as Record<GateId, GateStatus>;
  if (g.GATE_KDP === 'PASSED') return 'KDP_READY';
  if (g.GATE_PDF === 'PASSED') return 'FINAL_AUDIT';
  if (g.GATE_MANUSCRIPT === 'PASSED') return 'MANUSCRIPT_COMPLETE';
  if (s.audit && (s.audit.red > 0)) return 'REPAIR_REQUIRED';
  if (s.chapters.some(c => c.approved)) return 'CHAPTER_APPROVED';
  if (s.chapters.length > 0) return 'GENERATING';
  if (g.GATE_BIBLE === 'PASSED') return 'BIBLE_READY';
  if (g.GATE_OUTLINE === 'PASSED') return 'OUTLINE_APPROVED';
  if (g.GATE_CONCEPT === 'PASSED') return 'CONCEPT_APPROVED';
  if (g.GATE_TITLE === 'PASSED') return 'TITLE_SELECTED';
  if (g.GATE_MARKET === 'PASSED') return 'MARKET_ANALYZED';
  if (g.GATE_THEME === 'PASSED') return 'THEME_SELECTED';
  return 'DRAFT';
}

/** Mudar o outline depois de travado exige confirmação explícita. */
export function outlineChangeWarning(s: EditorialProjectState): string | null {
  const approved = s.chapters.filter(c => c.approved).length;
  return s.outlineLocked && approved > 0 ? 'Esta alteração pode afetar capítulos já aprovados.' : null;
}
