// ================================================================
// UTILITÁRIOS DE TEXTO PARA O FLUXO EDITORIAL
// normalização, hash estável, diff por palavras, classificação de mudanças
// ================================================================
import type { ChangeType } from '../types/editorial-correction';

export const PARA_TOKEN = '¶';

export const stripAccents = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** normaliza para comparação: minúsculas, sem acentos, só letras/números separados por 1 espaço */
export function normText(s: string): string {
  return stripAccents((s || '').toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim();
}

export function normWord(w: string): string {
  return stripAccents(w.toLowerCase()).replace(/[^a-z0-9]/g, '');
}

export function wordsOf(s: string): string[] {
  return (s || '').split(/\s+/).map(normWord).filter(Boolean);
}

export function splitParagraphs(t: string): string[] {
  return (t || '').split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
}

export function countWords(t: string): number {
  return (t || '').split(/\s+/).filter(Boolean).length;
}

/** hash estável (dois FNV-1a 32 bits + tamanho) — identifica versões do manuscrito */
export function hashString(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
    h2 ^= h2 >>> 13;
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}-${s.length.toString(16)}`;
}

export function levenshtein(a: string, b: string, max = 4): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

// ---------------------------------------------------------------
// DIFF POR PALAVRAS
// ---------------------------------------------------------------
export function tokenizeForDiff(text: string): string[] {
  const out: string[] = [];
  const paras = (text || '').split(/\n{2,}|\n/).map(p => p.trim()).filter(Boolean);
  paras.forEach((p, i) => {
    if (i > 0) out.push(PARA_TOKEN);
    for (const w of p.split(/\s+/)) if (w) out.push(w);
  });
  return out;
}

export interface DiffHunk {
  removed: string[];
  added: string[];
  before: string[];
  after: string[];
}

const CONTEXT = 5;
const MERGE_GAP = 2;

export function wordDiff(a: string, b: string): DiffHunk[] {
  const A = tokenizeForDiff(a);
  const B = tokenizeForDiff(b);
  let pre = 0;
  while (pre < A.length && pre < B.length && A[pre] === B[pre]) pre++;
  let suf = 0;
  while (suf < A.length - pre && suf < B.length - pre && A[A.length - 1 - suf] === B[B.length - 1 - suf]) suf++;
  const a2 = A.slice(pre, A.length - suf);
  const b2 = B.slice(pre, B.length - suf);
  if (a2.length === 0 && b2.length === 0) return [];

  type Op = { t: 'eq' | 'del' | 'ins'; tok: string };
  let ops: Op[] = [];
  const n = a2.length;
  const m = b2.length;
  if (n * m > 6_000_000) {
    // grande demais para LCS exata: trata como bloco único (sempre registrado)
    ops = [...a2.map(tok => ({ t: 'del' as const, tok })), ...b2.map(tok => ({ t: 'ins' as const, tok }))];
  } else {
    const w = m + 1;
    const dp = new Uint16Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] = a2[i] === b2[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a2[i] === b2[j]) { ops.push({ t: 'eq', tok: a2[i] }); i++; j++; }
      else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) { ops.push({ t: 'del', tok: a2[i] }); i++; }
      else { ops.push({ t: 'ins', tok: b2[j] }); j++; }
    }
    while (i < n) ops.push({ t: 'del', tok: a2[i++] });
    while (j < m) ops.push({ t: 'ins', tok: b2[j++] });
  }

  // agrupa operações não-iguais em hunks; junta hunks separados por poucas palavras iguais
  const hunks: { start: number; end: number }[] = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k].t === 'eq') { k++; continue; }
    let s = k;
    let e = k;
    while (e < ops.length) {
      if (ops[e].t !== 'eq') { e++; continue; }
      let g = e;
      while (g < ops.length && ops[g].t === 'eq') g++;
      if (g < ops.length && g - e <= MERGE_GAP) { e = g; continue; }
      break;
    }
    hunks.push({ start: s, end: e });
    k = e;
  }

  const prefixTokens = A.slice(0, pre);
  const result: DiffHunk[] = [];
  for (const h of hunks) {
    const seg = ops.slice(h.start, h.end);
    const removed = seg.filter(o => o.t !== 'ins').map(o => o.tok);
    const added = seg.filter(o => o.t !== 'del').map(o => o.tok);
    const beforeOps = ops.slice(0, h.start).filter(o => o.t !== 'ins').map(o => o.tok);
    const beforeAll = prefixTokens.concat(beforeOps);
    const afterOps = ops.slice(h.end).filter(o => o.t !== 'ins').map(o => o.tok);
    const afterAll = afterOps.concat(suf > 0 ? A.slice(A.length - suf) : []);
    result.push({
      removed,
      added,
      before: beforeAll.slice(-CONTEXT),
      after: afterAll.slice(0, CONTEXT),
    });
  }
  return result;
}

export function tokensToDisplay(tokens: string[]): string {
  return tokens.map(t => (t === PARA_TOKEN ? '↵↵' : t)).join(' ').replace(/ ?↵↵ ?/g, ' ↵↵ ').trim();
}

// ---------------------------------------------------------------
// CLASSIFICAÇÃO DE MUDANÇAS
// ---------------------------------------------------------------
const FUNCTION_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'e', 'em', 'na', 'no', 'nas', 'nos', 'que', 'para', 'com',
  'se', 'um', 'uma', 'por', 'ao', 'aos', 'a', 'pela', 'pelo', 'lhe', 'me', 'te', 'ou', 'mas', 'ja', 'ha', 'pra',
]);

export interface HunkClassification {
  type: ChangeType;
  /** true quando a alteração pode ter mudado o sentido (exige validação do autor) */
  meaningChange: boolean;
  reason: string;
}

const REASONS: Record<ChangeType, string> = {
  ortografia: 'Correção ortográfica',
  acentuacao: 'Acentuação corrigida',
  gramatica: 'Correção gramatical (concordância, regência, crase, maiúscula ou palavra de ligação)',
  pontuacao: 'Pontuação ajustada',
  espacamento: 'Espaçamento ajustado',
  paragrafo: 'Estrutura de parágrafo ajustada',
  dialogo: 'Formatação de diálogo ajustada',
  estilo: 'Ajuste de redação (fluidez/qualidade literária)',
  repeticao: 'Repetição reduzida',
  codificacao: 'Caractere corrompido corrigido',
  titulo: 'Título ajustado',
  continuidade: 'Ajuste de continuidade',
};

export function reasonFor(type: ChangeType): string {
  return REASONS[type];
}

export function classifyHunk(removedT: string[], addedT: string[]): HunkClassification {
  const r = removedT.filter(t => t !== PARA_TOKEN);
  const a = addedT.filter(t => t !== PARA_TOKEN);
  const mk = (type: ChangeType, meaningChange = false): HunkClassification => ({ type, meaningChange, reason: REASONS[type] });

  if (r.length === 0 && a.length === 0) return mk('paragrafo');
  const rj = r.join(' ');
  const aj = a.join(' ');
  if (rj === aj) return mk('paragrafo');

  const lr = rj.replace(/[^\p{L}\p{N}]/gu, '');
  const la = aj.replace(/[^\p{L}\p{N}]/gu, '');
  if (lr === la) {
    if (rj.replace(/\s/g, '') === aj.replace(/\s/g, '')) return mk('espacamento');
    if (/^[—–-]/.test(aj) || /^[—–-]/.test(rj)) return mk('dialogo');
    return mk('pontuacao');
  }
  if (lr.toLowerCase() === la.toLowerCase()) return mk('gramatica');
  if (stripAccents(lr.toLowerCase()) === stripAccents(la.toLowerCase())) return mk('acentuacao');

  const wr = r.map(normWord).filter(Boolean);
  const wa = a.map(normWord).filter(Boolean);
  if (wr.length === wa.length && wr.length > 0 && wr.every((w, i) => levenshtein(w, wa[i], 3) <= (w.length > 7 ? 3 : 2))) {
    return mk('ortografia');
  }
  if (levenshtein(wr.join(''), wa.join(''), 3) <= 2) return mk('ortografia');
  const all = wr.concat(wa);
  if (all.length > 0 && all.every(w => FUNCTION_WORDS.has(w))) return mk('gramatica');

  const similarToRemoved = (w: string) => wr.some(x => levenshtein(x, w, 3) <= 2);
  const newContent = wa.filter(w => w.length >= 4 && !FUNCTION_WORDS.has(w) && !similarToRemoved(w));
  const lostContent = wr.filter(w => w.length >= 4 && !FUNCTION_WORDS.has(w) && !wa.some(x => levenshtein(x, w, 3) <= 2));
  const meaning = newContent.length > 0 || lostContent.length > 0;
  return mk('estilo', meaning);
}
