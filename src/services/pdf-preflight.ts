// ================================================================
// PDF_PREFLIGHT + BLANK_PAGE_DETECTOR
// Núcleo puro (preflightFromPages) + wrapper que abre o PDF real com pdf.js.
// ================================================================
import type { ExtractedPage } from './kdp-pdf-validator';
import type { AuditIssue, Severity } from './continuity-engine';
import { worstSeverity } from './continuity-engine';

export interface PreflightOptions {
  /** páginas (1-based) que são intencionalmente em branco pela diagramação */
  intentionalBlankPages?: number[];
  coverRequired?: boolean;
  /** palavras do manuscrito (para comparar com o PDF) */
  manuscriptWordCount?: number;
  chapterTitles?: string[];
  /** tolerância de perda de conteúdo (padrão 8%) */
  maxContentLoss?: number;
  /** páginas que podem ser curtas (títulos de capítulo, rosto, sumário) */
  shortOkPages?: number[];
  expectedImagePages?: number[];
  /** dimensões esperadas em pontos [w,h] */
  expectedSizePts?: [number, number];
}

const wordsIn = (t: string) => (t.match(/[\p{L}\p{N}]+/gu) || []).length;
const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const MOJIBAKE = /(Ã.|Â.|â€.|\uFFFD)/;

export interface PreflightResult {
  ok: boolean;
  severity: Severity;
  pageCount: number;
  pdfWordCount: number;
  issues: AuditIssue[];
  blankPages: number[];
}

export function detectBlankPages(pages: ExtractedPage[], intentional: number[] = []): number[] {
  return pages.filter(p => wordsIn(p.text) === 0 && !p.hasImage && !intentional.includes(p.page)).map(p => p.page);
}

export function preflightFromPages(pages: ExtractedPage[], opts: PreflightOptions = {}): PreflightResult {
  const issues: AuditIssue[] = [];
  const add = (severity: Severity, page: number, message: string, detail?: string) =>
    issues.push({ validator: 'PDF Preflight', severity, chapter: page, message, detail });

  if (pages.length === 0) add('CRITICAL', 0, 'PDF sem páginas.');

  const blank = detectBlankPages(pages, opts.intentionalBlankPages);
  blank.forEach(p => add('RED', p, `Página ${p} em branco inesperada.`));

  pages.forEach(p => {
    const w = wordsIn(p.text);
    const shortOk = (opts.shortOkPages || []).includes(p.page) || p.hasImage;
    if (w > 0 && w < 4 && !shortOk) add('YELLOW', p.page, `Página ${p.page} quase vazia (${w} palavras).`);
    if (p.outOfBounds > 0) add('RED', p.page, `Texto cortado/fora da página (${p.outOfBounds} trechos) na página ${p.page}.`);
    else if (p.nearEdge > 0) add('YELLOW', p.page, `Texto muito perto da borda na página ${p.page} (${p.nearEdge} trechos).`);
    if (MOJIBAKE.test(p.text)) add('RED', p.page, `Caracteres quebrados (codificação) na página ${p.page}.`);
    if (opts.expectedSizePts && (Math.abs(p.width - opts.expectedSizePts[0]) > 2 || Math.abs(p.height - opts.expectedSizePts[1]) > 2))
      add('RED', p.page, `Página ${p.page} com tamanho ${p.width.toFixed(0)}x${p.height.toFixed(0)}pt fora do formato KDP esperado.`);
  });

  (opts.expectedImagePages || []).forEach(n => {
    const p = pages.find(x => x.page === n);
    if (!p || !p.hasImage) add('RED', n, `Imagem ausente na página ${n}.`);
  });
  if (opts.coverRequired && pages[0] && !pages[0].hasImage) add('RED', 1, 'Capa ausente na primeira página.');

  const pdfWords = pages.reduce((a, p) => a + wordsIn(p.text), 0);
  if (opts.manuscriptWordCount) {
    const loss = 1 - pdfWords / opts.manuscriptWordCount;
    if (loss > (opts.maxContentLoss ?? 0.08)) add('CRITICAL', 0, `Perda de conteúdo: PDF tem ${pdfWords} palavras, manuscrito ${opts.manuscriptWordCount} (${(loss * 100).toFixed(1)}% a menos).`);
  }

  if (opts.chapterTitles?.length) {
    const all = norm(pages.map(p => p.text).join(' '));
    opts.chapterTitles.forEach((t, i) => { if (t && !all.includes(norm(t))) add('RED', 0, `Capítulo ${i + 1} ("${t}") não encontrado no PDF.`); });
  }

  const severity = worstSeverity(issues.map(i => i.severity));
  return { ok: severity !== 'RED' && severity !== 'CRITICAL', severity, pageCount: pages.length, pdfWordCount: pdfWords, issues, blankPages: blank };
}

/** Preflight sobre o PDF real. */
export async function preflightPdf(bytes: Uint8Array, opts: PreflightOptions = {}): Promise<PreflightResult> {
  const { openPdf, extractPages } = await import('./kdp-pdf-validator');
  const pdf = await openPdf(bytes);
  const pages = await extractPages(pdf);
  return preflightFromPages(pages, opts);
}

/**
 * Loop: gera → preflight → corrige → gera de novo → audita de novo.
 * `rebuild` recebe os problemas e devolve novos bytes.
 */
export async function preflightWithRepair(
  build: () => Promise<Uint8Array> | Uint8Array,
  rebuild: (issues: AuditIssue[]) => Promise<Uint8Array> | Uint8Array,
  opts: PreflightOptions, maxRounds = 2,
): Promise<{ bytes: Uint8Array; result: PreflightResult; rounds: number }> {
  let bytes = await build();
  let result = await preflightPdf(bytes, opts);
  let rounds = 0;
  while (!result.ok && rounds < maxRounds) {
    bytes = await rebuild(result.issues.filter(i => i.severity === 'RED' || i.severity === 'CRITICAL'));
    result = await preflightPdf(bytes, opts);
    rounds++;
  }
  return { bytes, result, rounds };
}
