// ================================================================
// REGRAS DETERMINÍSTICAS DE CORREÇÃO EDITORIAL
// - Idempotentes: rodar duas vezes não altera o resultado da 1ª.
// - Conservadoras: só corrigem erros inequívocos (nunca mudam sentido).
// - Cada alteração real é registrada (trecho original × corrigido).
// Servem de 1ª camada antes da IA e de fallback quando a IA falha.
// ================================================================
import type {
  ChangeType,
  CorrectionChange,
  PendingItem,
} from '../types/editorial-correction';
import { ManuscriptIntegrityEngine } from './manuscript-integrity-engine';

export interface RuleOptions {
  /** converte "- fala" / "– fala" em "— fala" (desligar em não-ficção com listas) */
  dialogueHyphen?: boolean;
  /** aplica regras específicas do português (dicionário, palavras duplicadas, maiúscula); padrão true */
  portuguese?: boolean;
}

export interface RuleResult {
  text: string;
  changes: CorrectionChange[];
  pendings: PendingItem[];
}

const MAX_EXAMPLES_PER_RULE = 40;
const L = '\\p{L}';
const NOT_WORD_BEFORE = '(?<![\\p{L}\\p{N}])';
const NOT_WORD_AFTER = '(?![\\p{L}\\p{N}])';

const MOJIBAKE: [string, string][] = [
  ['â€”', '—'], ['â€“', '–'], ['â€œ', '“'], ['â€\u009d', '”'], ['â€™', '’'], ['â€˜', '‘'], ['â€¦', '…'], ['â€', '”'],
  ['Ã§', 'ç'], ['Ã£', 'ã'], ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'],
  ['Ã¢', 'â'], ['Ãª', 'ê'], ['Ã´', 'ô'], ['Ã\u00a0', 'à'], ['Ãµ', 'õ'], ['Ã¼', 'ü'],
  ['Ã‡', 'Ç'], ['Ã‰', 'É'], ['Ã“', 'Ó'], ['Ãš', 'Ú'], ['Ã€', 'À'], ['Ã•', 'Õ'], ['Ãƒ', 'Ã'],
  ['Âº', 'º'], ['Âª', 'ª'], ['Â\u00a0', ' '], ['Â«', '«'], ['Â»', '»'],
];

/** erros ortográficos inequívocos (palavra inteira, sem ambiguidade com outra palavra válida) */
const SPELLING: [string, string, ChangeType][] = [
  ['porisso', 'por isso', 'ortografia'], ['derrepente', 'de repente', 'ortografia'],
  ['apartir', 'a partir', 'ortografia'], ['menas', 'menos', 'gramatica'],
  ['interresse', 'interesse', 'ortografia'], ['interresante', 'interessante', 'ortografia'],
  ['intereçante', 'interessante', 'ortografia'], ['excessão', 'exceção', 'ortografia'],
  ['expontâneo', 'espontâneo', 'ortografia'], ['expontaneo', 'espontâneo', 'ortografia'],
  ['expontânea', 'espontânea', 'ortografia'], ['beneficiente', 'beneficente', 'ortografia'],
  ['enchergar', 'enxergar', 'ortografia'], ['enchergou', 'enxergou', 'ortografia'],
  ['enchergava', 'enxergava', 'ortografia'],
  ['tambem', 'também', 'acentuacao'], ['voce', 'você', 'acentuacao'], ['voces', 'vocês', 'acentuacao'],
  ['entao', 'então', 'acentuacao'], ['atraves', 'através', 'acentuacao'], ['porem', 'porém', 'acentuacao'],
  ['alem', 'além', 'acentuacao'], ['apos', 'após', 'acentuacao'], ['ninguem', 'ninguém', 'acentuacao'],
  ['irmao', 'irmão', 'acentuacao'], ['irmaos', 'irmãos', 'acentuacao'], ['coracao', 'coração', 'acentuacao'],
  ['familia', 'família', 'acentuacao'], ['agua', 'água', 'acentuacao'], ['ultimo', 'último', 'acentuacao'],
  ['ultima', 'última', 'acentuacao'], ['unico', 'único', 'acentuacao'], ['unica', 'única', 'acentuacao'],
  ['otimo', 'ótimo', 'acentuacao'], ['proprio', 'próprio', 'acentuacao'], ['propria', 'própria', 'acentuacao'],
  ['possivel', 'possível', 'acentuacao'], ['impossivel', 'impossível', 'acentuacao'],
  ['dificil', 'difícil', 'acentuacao'], ['facil', 'fácil', 'acentuacao'], ['inutil', 'inútil', 'acentuacao'],
  ['historia', 'história', 'acentuacao'], ['memoria', 'memória', 'acentuacao'], ['vitoria', 'vitória', 'acentuacao'],
  ['misterio', 'mistério', 'acentuacao'], ['medico', 'médico', 'acentuacao'],
];

/** palavras funcionais que nunca aparecem legitimamente duplicadas em sequência */
const DUP_WORDS = ['de', 'da', 'do', 'que', 'em', 'um', 'uma', 'para', 'com', 'no', 'na', 'e', 'os', 'as'];

const ABBREVIATIONS = new Set([
  'sr', 'sra', 'srta', 'dr', 'dra', 'prof', 'profa', 'etc', 'ex', 'exa', 'pág', 'pag', 'vs', 'av', 'cel',
  'gen', 'cap', 'obs', 'cf', 'min', 'seg', 'ltda', 'tel', 'ed', 'séc', 'sec', 'depto', 'núm', 'num',
  'ibid', 'op', 'ref', 'fig', 'apt', 'apto', 'eng', 'adv', 'min', 'max', 'máx', 'mín', 'jr', 'sto', 'sta',
]);

let seq = 0;
const nextId = (chapter: number) => `r${chapter}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function show(s: string): string {
  return s.replace(/\n/g, '↵');
}

function matchCase(src: string, rep: string): string {
  if (src.length > 1 && src === src.toUpperCase() && src !== src.toLowerCase()) return rep.toUpperCase();
  if (src[0] !== src[0].toLowerCase()) return rep[0].toUpperCase() + rep.slice(1);
  return rep;
}

interface Tracker {
  chapter: number;
  changes: CorrectionChange[];
}

/**
 * Aplica uma regra e registra exemplos reais (trecho antes × depois).
 * O 1º registro de cada regra carrega o total real de ocorrências;
 * os demais exemplos valem 0 para não duplicar a contagem.
 */
function applyRule(
  tr: Tracker,
  text: string,
  _ruleKey: string,
  regex: RegExp,
  replace: (m: RegExpExecArray) => string | null,
  type: ChangeType,
  reason: string,
): string {
  let out = '';
  let last = 0;
  let total = 0;
  let first: CorrectionChange | null = null;
  let examples = 0;
  regex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m[0].length === 0) { regex.lastIndex++; continue; }
    const rep = replace(m);
    if (rep === null || rep === m[0]) continue;
    out += text.slice(last, m.index) + rep;
    last = m.index + m[0].length;
    total++;
    if (examples < MAX_EXAMPLES_PER_RULE) {
      examples++;
      const before = text.slice(Math.max(0, m.index - 28), m.index);
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 28);
      const ch: CorrectionChange = {
        id: nextId(tr.chapter),
        chapterIndex: tr.chapter,
        original: show(before + m[0] + after).trim(),
        corrected: show(before + rep + after).trim(),
        type,
        reason,
        resolution: 'CORRIGIDO_AUTOMATICAMENTE',
        source: 'regras',
        occurrences: 0,
      };
      if (!first) first = ch;
      tr.changes.push(ch);
    }
  }
  if (first) first.occurrences = total;
  return out + text.slice(last);
}

export function applyDeterministicFixes(
  input: string,
  chapterIndex: number,
  opts: RuleOptions = {},
): RuleResult {
  const tr: Tracker = { chapter: chapterIndex, changes: [] };
  const pendings: PendingItem[] = [];
  const dialogueHyphen = opts.dialogueHyphen !== false;
  const pt = opts.portuguese !== false;
  let t = (input || '').replace(/\r\n?/g, '\n');

  // 0) Resíduos de sintaxe LaTeX e caracteres matemáticos residuais (ex: $\hat{E}$ -> Ê)
  const afterLatex = ManuscriptIntegrityEngine.cleanLaTeXResiduals(t);
  if (afterLatex !== t) {
    tr.changes.push({
      id: nextId(chapterIndex),
      chapterIndex,
      original: '(marcações LaTeX/matemáticas residuais)',
      corrected: '(caracteres acentuados em UTF-8)',
      type: 'codificacao',
      reason: 'Sintaxe matemática/LaTeX residual convertida para caracteres acentuados UTF-8',
      resolution: 'CORRIGIDO_AUTOMATICAMENTE',
      source: 'regras',
      occurrences: 1,
    });
    t = afterLatex;
  }

  // 1) Codificação corrompida (mojibake)
  for (const [bad, good] of MOJIBAKE) {
    if (!t.includes(bad)) continue;
    const re = new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    t = applyRule(tr, t, 'moji:' + bad, re, () => good, 'codificacao', `Caractere corrompido (codificação): "${bad}" → "${good}"`);
  }

  // 2) Tabs e espaços duplicados dentro das linhas
  t = applyRule(tr, t, 'tab', /\t+/g, () => ' ', 'espacamento', 'Tabulação substituída por espaço');
  t = applyRule(tr, t, 'esp2', /(?<=\S)[ \u00a0]{2,}(?=\S)/g, () => ' ', 'espacamento', 'Espaços duplicados removidos');
  t = applyRule(tr, t, 'espfim', /[ \u00a0]+(?=\n|$)/g, () => '', 'espacamento', 'Espaços no fim da linha removidos');

  // 3) Pontuação
  t = applyRule(tr, t, 'esppont', /(?<=\S)[ \u00a0]+(?=[,;:!?](?![\p{L}\p{N}])|\.(?![\p{L}\p{N}.]|\.))/gu, () => '', 'pontuacao', 'Espaço indevido antes de pontuação removido');
  t = applyRule(tr, t, 'esppont3', /(?<=\p{L})[ \u00a0]+(?=\.\.\.)/gu, () => '', 'pontuacao', 'Espaço indevido antes de reticências removido');
  t = applyRule(tr, t, 'virg2', /,{2,}/g, () => ',', 'pontuacao', 'Vírgulas repetidas reduzidas a uma');
  t = applyRule(tr, t, 'pv2', /;{2,}/g, () => ';', 'pontuacao', 'Ponto e vírgula repetido reduzido a um');
  t = applyRule(tr, t, 'pt2', /(?<![.])\.\.(?![.])/g, () => '.', 'pontuacao', 'Ponto duplicado reduzido a um');
  t = applyRule(tr, t, 'pt4', /\.{4,}/g, () => '...', 'pontuacao', 'Reticências com pontos em excesso padronizadas (...)');
  t = applyRule(tr, t, 'semsp,', /(?<=\p{L}),(?=\p{L})/gu, () => ', ', 'pontuacao', 'Espaço ausente após vírgula inserido');
  t = applyRule(tr, t, 'semsp;', /(?<=\p{L});(?=\p{L})/gu, () => '; ', 'pontuacao', 'Espaço ausente após ponto e vírgula inserido');
  t = applyRule(tr, t, 'semsp.', /(?<=\p{Ll}{2})([.!?])(?=\p{Lu})/gu, m => m[1] + ' ', 'pontuacao', 'Espaço ausente após ponto final inserido');

  // 4) Hífen de diálogo → travessão
  if (dialogueHyphen) {
    t = applyRule(
      tr, t, 'trav',
      /^[-–][ \t]*(?=[\p{L}"“¿¡(\[])/gmu,
      () => '— ',
      'dialogo',
      'Hífen/meia-risca de abertura de fala substituído por travessão (—)',
    );
  }
  t = applyRule(tr, t, 'trav2', /^—(?=[^\s—])/gmu, () => '— ', 'dialogo', 'Espaço ausente após travessão de fala inserido');

  // 5) Palavras funcionais duplicadas ("de de", "que que"…) — apenas português
  if (pt) {
    const dupRe = new RegExp(`${NOT_WORD_BEFORE}(${DUP_WORDS.join('|')})([ \\t]+)\\1${NOT_WORD_AFTER}`, 'giu');
    t = applyRule(tr, t, 'dup', dupRe, m => m[1], 'gramatica', 'Palavra repetida em sequência removida');
  }

  // 6) Ortografia/acentuação inequívoca
  for (const [bad, good, type] of pt ? SPELLING : []) {
    const re = new RegExp(`${NOT_WORD_BEFORE}${bad}${NOT_WORD_AFTER}`, 'giu');
    if (!re.test(t)) continue;
    t = applyRule(tr, t, 'sp:' + bad, re, m => matchCase(m[0], good), type, `${type === 'acentuacao' ? 'Acentuação' : type === 'gramatica' ? 'Gramática' : 'Ortografia'}: "${bad}" → "${good}"`);
  }

  // 7) Maiúscula no início de frase após ponto final
  if (pt) t = applyRule(
    tr, t, 'caps',
    new RegExp(`(?<![.])(${L}{2,})\\.([ \\t]+)(\\p{Ll})`, 'gu'),
    m => (ABBREVIATIONS.has(m[1].toLowerCase()) ? null : `${m[1]}.${m[2]}${m[3].toUpperCase()}`),
    'gramatica',
    'Letra maiúscula inicial após ponto final',
  );

  // 8) Parágrafos: normaliza quebras e junta frases cortadas no meio
  const rawParas = t.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
  const merged: string[] = [];
  const mergeLog: { a: string; b: string }[] = [];
  for (const p of rawParas) {
    const prev = merged[merged.length - 1];
    if (
      prev !== undefined &&
      /[\p{L}\p{N},;]$/u.test(prev) &&
      /^\p{Ll}/u.test(p) &&
      prev.length > 40
    ) {
      mergeLog.push({ a: prev.slice(-30), b: p.slice(0, 30) });
      merged[merged.length - 1] = prev + ' ' + p;
    } else {
      merged.push(p);
    }
  }
  if (mergeLog.length > 0) {
    const ex = mergeLog.slice(0, MAX_EXAMPLES_PER_RULE);
    ex.forEach((e, i) => {
      tr.changes.push({
        id: nextId(chapterIndex),
        chapterIndex,
        original: `…${e.a}↵↵${e.b}…`,
        corrected: `…${e.a} ${e.b}…`,
        type: 'paragrafo',
        reason: 'Frase interrompida no meio por quebra de parágrafo foi reunida',
        resolution: 'CORRIGIDO_AUTOMATICAMENTE',
        source: 'regras',
        occurrences: i === 0 ? mergeLog.length : 0,
      });
    });
  }
  const normalized = merged.join('\n\n');
  const blankBefore = (t.match(/\n{3,}/g) || []).length;
  const singleBreaks = (t.match(/(?<!\n)\n(?!\n)/g) || []).length;
  if (blankBefore + singleBreaks > 0 && normalized !== t) {
    const n = blankBefore + singleBreaks;
    tr.changes.push({
      id: nextId(chapterIndex),
      chapterIndex,
      original: `(${n} quebra(s) de linha irregulares)`,
      corrected: '(parágrafos separados por uma linha em branco)',
      type: 'paragrafo',
      reason: 'Separação de parágrafos padronizada',
      resolution: 'CORRIGIDO_AUTOMATICAMENTE',
      source: 'regras',
      occurrences: n,
    });
  }
  t = normalized;

  // 8.1) Remoção de metadados e marcadores de fim de bloco (ex: "Fim do Capítulo 18.")
  const blockMarkerResult = ManuscriptIntegrityEngine.removeChapterBlockMarkers(t);
  if (blockMarkerResult.removedMarkers.length > 0) {
    tr.changes.push({
      id: nextId(chapterIndex),
      chapterIndex,
      original: blockMarkerResult.removedMarkers.join('; '),
      corrected: '(marcador de controle/metadado removido)',
      type: 'paragrafo',
      reason: 'Marcadores de encerramento de bloco ou metadados de modelo de IA removidos',
      resolution: 'CORRIGIDO_AUTOMATICAMENTE',
      source: 'regras',
      occurrences: blockMarkerResult.removedMarkers.length,
    });
    t = blockMarkerResult.cleanText;
  }

  // 8.2) Watchdog de integridade e fechamento sintático de final de capítulo (em prosa substancial)
  if (opts.dialogueHyphen !== false && t.length > 30) {
    const truncCheck = ManuscriptIntegrityEngine.checkChapterTruncation(t);
    if (truncCheck.isTruncated) {
      const repaired = ManuscriptIntegrityEngine.repairTruncatedSentence(t);
      if (repaired !== t) {
        tr.changes.push({
          id: nextId(chapterIndex),
          chapterIndex,
          original: '…' + t.slice(Math.max(0, t.length - 40)),
          corrected: '…' + repaired.slice(Math.max(0, repaired.length - 40)),
          type: 'pontuacao',
          reason: `Frase de encerramento truncada foi reparada sintaticamente (${truncCheck.reason || 'sem pontuação final'})`,
          resolution: 'CORRIGIDO_AUTOMATICAMENTE',
          source: 'regras',
          occurrences: 1,
        });
        t = repaired;
      }
    }
  }

  // 9) Pendências que regras não podem resolver sozinhas
  const repl = (t.match(/\uFFFD/g) || []).length;
  if (repl > 0) {
    const idx = t.indexOf('\uFFFD');
    pendings.push({
      id: nextId(chapterIndex),
      chapterIndex,
      kind: 'codificacao',
      description: `${repl} caractere(s) ilegível(is) (�) restante(s) — o original se perdeu; verificar no manuscrito de origem.`,
      snippet: show(t.slice(Math.max(0, idx - 30), idx + 30)),
      resolution: 'PENDENTE_VALIDACAO_AUTOR',
    });
  }
  const moji = t.match(/Ã[\u0080-\u00bf\u2018-\u203a]|â€./);
  if (moji) {
    pendings.push({
      id: nextId(chapterIndex),
      chapterIndex,
      kind: 'codificacao',
      description: `Possível codificação corrompida restante ("${moji[0]}").`,
      resolution: 'PENDENTE_VALIDACAO_AUTOR',
    });
  }
  const straight = (t.match(/"/g) || []).length;
  const open = (t.match(/“/g) || []).length;
  const close = (t.match(/”/g) || []).length;
  if (straight % 2 === 1 || open !== close) {
    pendings.push({
      id: nextId(chapterIndex),
      chapterIndex,
      kind: 'sentido',
      description: 'Aspas desbalanceadas (abertura sem fechamento ou vice-versa) — conferir manualmente.',
      resolution: 'PENDENTE_VALIDACAO_AUTOR',
    });
  }

  return { text: t, changes: tr.changes, pendings };
}

/** soma real de ocorrências corrigidas num conjunto de alterações */
export function countOccurrences(changes: CorrectionChange[]): number {
  return changes.reduce((s, c) => s + (c.occurrences ?? 1), 0);
}
