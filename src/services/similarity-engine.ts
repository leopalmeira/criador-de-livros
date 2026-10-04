// ================================================================
// SIMILARITY ENGINES — TITLE / SUBTITLE / COVER / ORIGINALITY
// Análise de SIMILARIDADE (não promete "zero plágio").
// ================================================================

const STOP = new Set(['a', 'o', 'as', 'os', 'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'um', 'uma', 'para', 'por', 'com', 'no', 'na', 'que', 'the', 'of', 'and', 'to', 'in']);

export const normalizeText = (s: string) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();

const tokens = (s: string, dropStop = true) =>
  normalizeText(s).split(' ').filter(w => w && (!dropStop || !STOP.has(w)));

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach(x => { if (b.has(x)) inter++; });
  return inter / (a.size + b.size - inter);
}

function shingles(ws: string[], n: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + n <= ws.length; i++) out.add(ws.slice(i, i + n).join(' '));
  return out;
}

/** maior sequência contígua de palavras em comum (com stopwords) */
export function longestCommonWordRun(a: string, b: string): number {
  const x = tokens(a, false), y = tokens(b, false);
  let best = 0;
  const dp: number[][] = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      if (x[i - 1] === y[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + 1; best = Math.max(best, dp[i][j]); }
    }
  }
  return best;
}

function levenshteinRatio(a: string, b: string): number {
  const s = normalizeText(a), t = normalizeText(b);
  if (!s && !t) return 1;
  const m = s.length, n = t.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n, 1);
}

export type SimilarityRisk = 'low' | 'medium' | 'high';

export interface SimilarityResult {
  risk: SimilarityRisk;
  score: number; // 0..1
  lexical: number;
  semantic: number; // aproximação por conceitos (raízes de palavras)
  structural: number;
  commonRun: number;
  against?: string;
}

const stem = (w: string) => (w.length > 5 ? w.slice(0, 5) : w);

export function textSimilarity(candidate: string, reference: string): SimilarityResult {
  const ct = tokens(candidate), rt = tokens(reference);
  const lexical = Math.max(jaccard(new Set(ct), new Set(rt)), levenshteinRatio(candidate, reference) * 0.9);
  const semantic = jaccard(new Set(ct.map(stem)), new Set(rt.map(stem)));
  const run = longestCommonWordRun(candidate, reference);
  const sh = jaccard(shingles(tokens(candidate, false), 2), shingles(tokens(reference, false), 2));
  const structural = Math.max(sh, run >= 3 ? 0.8 : 0);
  const score = Math.max(lexical, semantic * 0.9, structural);
  let risk: SimilarityRisk = 'low';
  if (score >= 0.6 || run >= 4 || levenshteinRatio(candidate, reference) >= 0.85) risk = 'high';
  else if (score >= 0.4 || run >= 3) risk = 'medium';
  return { risk, score: +score.toFixed(3), lexical: +lexical.toFixed(3), semantic: +semantic.toFixed(3), structural: +structural.toFixed(3), commonRun: run, against: reference };
}

export function checkAgainstCorpus(candidate: string, corpus: string[]): SimilarityResult {
  let worst: SimilarityResult = { risk: 'low', score: 0, lexical: 0, semantic: 0, structural: 0, commonRun: 0 };
  for (const ref of corpus) {
    if (!ref) continue;
    const r = textSimilarity(candidate, ref);
    if (r.score > worst.score || r.commonRun > worst.commonRun) worst = r;
  }
  return worst;
}

/** TITLE_SIMILARITY_ENGINE */
export const checkTitleSimilarity = checkAgainstCorpus;
/** SUBTITLE_SIMILARITY_ENGINE */
export const checkSubtitleSimilarity = checkAgainstCorpus;

/** Descarta candidatos de risco elevado; devolve também os motivos. */
export function filterOriginalCandidates(candidates: string[], corpus: string[]) {
  const accepted: { text: string; result: SimilarityResult }[] = [];
  const rejected: { text: string; result: SimilarityResult }[] = [];
  for (const c of candidates) {
    const result = checkAgainstCorpus(c, corpus);
    (result.risk === 'high' ? rejected : accepted).push({ text: c, result });
  }
  return { accepted, rejected };
}

// ---------------------------------------------------------------
// COVER_SIMILARITY_ENGINE
// ---------------------------------------------------------------
export interface CoverDescriptor {
  composition: string;      // ex.: 'centralizada', 'terco-inferior', 'diagonal'
  mainElement: string;      // ex.: 'cabana', 'silhueta', 'floresta'
  palette: string[];        // hex
  typography: string;       // ex.: 'serifada-condensada'
  atmosphere: string;
  hash?: string;            // hash perceptual 64 bits (hex 16)
  version?: number;
  timestamp?: number;
}

/** average-hash 8x8 a partir de grade de cinza (qualquer resolução) */
export function averageHashFromGray(gray: ArrayLike<number>, w: number, h: number): string {
  const cells: number[] = [];
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      const x0 = Math.floor((gx * w) / 8), x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * w) / 8));
      const y0 = Math.floor((gy * h) / 8), y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * h) / 8));
      let sum = 0, c = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { sum += gray[y * w + x]; c++; }
      cells.push(sum / Math.max(c, 1));
    }
  }
  const avg = cells.reduce((a, b) => a + b, 0) / 64;
  let bits = '';
  cells.forEach(v => (bits += v >= avg ? '1' : '0'));
  let hex = '';
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

export function hammingHex(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

/** no navegador: lê pixels de um dataURL (retorna null em Node) */
export async function perceptualHashFromDataUrl(dataUrl: string): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
    });
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d'); if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 64, 64);
    const d = ctx.getImageData(0, 0, 64, 64).data;
    const g = new Float32Array(64 * 64);
    for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    return averageHashFromGray(g, 64, 64);
  } catch { return null; }
}

export interface CoverSimilarity { similar: boolean; hashDistance: number | null; descriptorScore: number; reasons: string[] }

export function compareCovers(a: CoverDescriptor, b: CoverDescriptor): CoverSimilarity {
  const reasons: string[] = [];
  let same = 0;
  const dims: [string, boolean][] = [
    ['composição', normalizeText(a.composition) === normalizeText(b.composition)],
    ['elemento principal', normalizeText(a.mainElement) === normalizeText(b.mainElement)],
    ['tipografia', normalizeText(a.typography) === normalizeText(b.typography)],
    ['atmosfera', normalizeText(a.atmosphere) === normalizeText(b.atmosphere)],
    ['paleta', jaccard(new Set(a.palette.map(x => x.toLowerCase())), new Set(b.palette.map(x => x.toLowerCase()))) >= 0.6],
  ];
  dims.forEach(([n, eq]) => { if (eq) { same++; reasons.push(`${n} igual`); } });
  const descriptorScore = same / dims.length;
  const dist = a.hash && b.hash ? hammingHex(a.hash, b.hash) : null;
  const hashSimilar = dist !== null && dist <= 10;
  if (hashSimilar) reasons.push(`hash perceptual muito próximo (distância ${dist})`);
  // trocar só uma cor NÃO torna a capa diferente: composição+elemento iguais já reprova
  const structuralSame = dims[0][1] && dims[1][1];
  return { similar: hashSimilar || structuralSame || descriptorScore >= 0.6, hashDistance: dist, descriptorScore, reasons };
}

/** Garante que cada variante seja realmente diferente das anteriores. */
export function validateCoverVariants(variants: CoverDescriptor[]): { ok: boolean; rejected: { index: number; against: number; reasons: string[] }[] } {
  const rejected: { index: number; against: number; reasons: string[] }[] = [];
  for (let i = 1; i < variants.length; i++)
    for (let j = 0; j < i; j++) {
      const r = compareCovers(variants[i], variants[j]);
      if (r.similar) { rejected.push({ index: i, against: j, reasons: r.reasons }); break; }
    }
  return { ok: rejected.length === 0, rejected };
}

// ---------------------------------------------------------------
// ORIGINALITY_ENGINE — evita que o próprio sistema se repita
// ---------------------------------------------------------------
export interface ProjectFingerprint { projectId: string; title: string; subtitle: string; premise: string; characters: string[]; cover?: CoverDescriptor }

export function checkProjectOriginality(candidate: ProjectFingerprint, others: ProjectFingerprint[]) {
  const findings: { projectId: string; field: string; risk: SimilarityRisk; score: number }[] = [];
  for (const o of others) {
    if (o.projectId === candidate.projectId) continue;
    const t = textSimilarity(candidate.title, o.title);
    const s = candidate.subtitle && o.subtitle ? textSimilarity(candidate.subtitle, o.subtitle) : null;
    const p = candidate.premise && o.premise ? textSimilarity(candidate.premise, o.premise) : null;
    if (t.risk !== 'low') findings.push({ projectId: o.projectId, field: 'título', risk: t.risk, score: t.score });
    if (s && s.risk !== 'low') findings.push({ projectId: o.projectId, field: 'subtítulo', risk: s.risk, score: s.score });
    if (p && p.risk !== 'low') findings.push({ projectId: o.projectId, field: 'premissa', risk: p.risk, score: p.score });
    const cj = jaccard(new Set(candidate.characters.map(normalizeText)), new Set(o.characters.map(normalizeText)));
    if (candidate.characters.length >= 2 && cj >= 0.6) findings.push({ projectId: o.projectId, field: 'personagens', risk: 'high', score: cj });
    if (candidate.cover && o.cover && compareCovers(candidate.cover, o.cover).similar) findings.push({ projectId: o.projectId, field: 'capa', risk: 'high', score: 1 });
  }
  const high = findings.some(f => f.risk === 'high');
  return { original: !high, findings, note: 'Análise de similaridade interna — não garante ausência de plágio.' };
}
