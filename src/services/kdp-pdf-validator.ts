// ================================================================
// VALIDADOR DO PDF FINAL (abre o arquivo gerado e confere de verdade)
// Usa pdfjs-dist para: abrir, contar páginas, detectar capa (imagem),
// extrair texto real e compará-lo ao texto corrigido, conferir sumário ×
// páginas reais, ordem dos capítulos, numeração, páginas em branco,
// caracteres corrompidos e texto fora da área da página.
// ================================================================
import type { PdfCheck, PdfValidationResult } from '../types/editorial-correction';
import type { BuildPdfResult } from './kdp-pdf-builder';
import { cleanChapterTitle } from './kdp-editorial-review';

export interface ValidatePdfInput {
  bytes: Uint8Array;
  build: BuildPdfResult;
  chapters: { titulo: string }[];
  bookTitle: string;
  optSumario: boolean;
  coverRequired: boolean;
}

export interface ExtractedPage {
  page: number;
  lines: string[];
  text: string;
  width: number;
  height: number;
  hasImage: boolean;
  outOfBounds: number;
  nearEdge: number;
}

let pdfjsPromise: Promise<any> | null = null;
export async function loadPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const lib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        lib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).href;
      }
      return lib;
    })();
  }
  return pdfjsPromise;
}

export async function openPdf(bytes: Uint8Array): Promise<any> {
  const lib = await loadPdfjs();
  const task = lib.getDocument({
    data: bytes.slice(),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
  });
  return task.promise;
}

const strict = (s: string) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export async function extractPages(pdf: any): Promise<ExtractedPage[]> {
  const lib = await loadPdfjs();
  const out: ExtractedPage[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items: { str: string; x: number; y: number; w: number; h: number }[] = [];
    for (const it of tc.items as any[]) {
      if (typeof it.str !== 'string' || it.str.trim() === '') continue;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0, h: it.height || 0 });
    }
    items.sort((a, b) => (Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x));
    const lines: string[] = [];
    let curY: number | null = null;
    let cur: string[] = [];
    for (const it of items) {
      if (curY === null || Math.abs(it.y - curY) > 2) {
        if (cur.length) lines.push(cur.join(' '));
        cur = [it.str];
        curY = it.y;
      } else {
        cur.push(it.str);
      }
    }
    if (cur.length) lines.push(cur.join(' '));

    const edge = 0.2 * 72;
    let outOfBounds = 0;
    let nearEdge = 0;
    for (const it of items) {
      if (it.x < 0 || it.x + it.w > vp.width + 0.5 || it.y < 0 || it.y > vp.height) outOfBounds++;
      else if (it.x < edge || it.x + it.w > vp.width - edge) nearEdge++;
    }

    let hasImage = false;
    try {
      const ops = await page.getOperatorList();
      const O = lib.OPS;
      hasImage = ops.fnArray.some((f: number) => f === O.paintImageXObject || f === O.paintInlineImageXObject || f === O.paintImageMaskXObject);
    } catch { /* sem operator list */ }

    out.push({ page: p, lines, text: lines.join('\n'), width: vp.width, height: vp.height, hasImage, outOfBounds, nearEdge });
  }
  return out;
}

function chk(id: string, label: string, ok: boolean | null, detail: string, critical = true): PdfCheck {
  return { id, label, ok, critical, detail };
}

/** parse do sumário: entradas "k. título … página" em sequência */
export function parseToc(tocText: string, n: number): { title: string; page: number }[] | null {
  const s = tocText.replace(/\s+/g, ' ').trim();
  const out: { title: string; page: number }[] = [];
  let pos = 0;
  const marks: number[] = [];
  for (let k = 1; k <= n; k++) {
    const i = s.indexOf(`${k}. `, pos);
    if (i < 0) return null;
    marks.push(i);
    pos = i + `${k}. `.length;
  }
  for (let k = 0; k < n; k++) {
    const startIdx = marks[k] + `${k + 1}. `.length;
    const seg = s.slice(startIdx, k + 1 < n ? marks[k + 1] : s.length).trim();
    const m = /^(.*?)\s*(\d{1,5})$/.exec(seg);
    if (!m) return null;
    out.push({ title: m[1].trim(), page: Number(m[2]) });
  }
  return out;
}

function wordMismatch(expected: string, got: string): { missing: number; extra: number; first: string } {
  const ew = expected.split(' ').filter(Boolean);
  const gw = got.split(' ').filter(Boolean);
  const cnt = new Map<string, number>();
  for (const w of ew) cnt.set(w, (cnt.get(w) || 0) + 1);
  let extra = 0;
  for (const w of gw) {
    const c = cnt.get(w) || 0;
    if (c > 0) cnt.set(w, c - 1); else extra++;
  }
  let missing = 0;
  cnt.forEach(v => { missing += v; });
  let i = 0;
  while (i < ew.length && i < gw.length && ew[i] === gw[i]) i++;
  return { missing, extra, first: `palavra ${i + 1}: esperado "${ew[i] ?? '∅'}" × encontrado "${gw[i] ?? '∅'}"` };
}

export async function validatePdf(input: ValidatePdfInput): Promise<PdfValidationResult> {
  const checks: PdfCheck[] = [];
  const { build } = input;
  const finish = (pageCount: number): PdfValidationResult => {
    const criticalFailures = checks.filter(c => c.critical && c.ok === false).length;
    const notVerified = checks.filter(c => c.ok === null).length;
    return { ok: criticalFailures === 0, pageCount, checks, criticalFailures, notVerified, validatedAt: Date.now() };
  };

  // 1) abre o PDF
  let pdf: any;
  try {
    if (!input.bytes || input.bytes.length < 100) throw new Error('arquivo vazio ou truncado');
    const head = String.fromCharCode(...input.bytes.slice(0, 5));
    if (head !== '%PDF-') throw new Error('cabeçalho %PDF ausente');
    pdf = await openPdf(input.bytes);
    checks.push(chk('open', 'O PDF abre corretamente', true, `Aberto com pdf.js (${(input.bytes.length / 1024).toFixed(0)} KB).`));
  } catch (e: any) {
    checks.push(chk('open', 'O PDF abre corretamente', false, `Falha ao abrir: ${e?.message || e}`));
    return finish(0);
  }

  let pages: ExtractedPage[];
  try {
    pages = await extractPages(pdf);
  } catch (e: any) {
    checks.push(chk('extract', 'Texto do PDF pôde ser extraído', false, `Falha na extração: ${e?.message || e}`));
    return finish(pdf.numPages || 0);
  }

  // 2) nº de páginas e tamanho
  checks.push(chk('pagecount', 'Número de páginas confere com a diagramação', pdf.numPages === build.pageCount,
    `PDF tem ${pdf.numPages} página(s); diagramação previa ${build.pageCount}.`));
  const [LW, LH] = build.pageSize;
  const sizeOk = pages.every(p => Math.abs(p.width - LW * 72) < 1.5 && Math.abs(p.height - LH * 72) < 1.5);
  checks.push(chk('pagesize', `Tamanho de página ${LW}×${LH} pol em todas as páginas`, sizeOk, sizeOk ? 'Todas as páginas têm o tamanho do formato escolhido.' : 'Há páginas com tamanho divergente.'));

  // 3) capa
  if (build.coverIncluded) {
    const p1 = pages[0];
    const ok = !!p1 && p1.hasImage;
    checks.push(chk('cover', 'A capa está incorporada na 1ª página', ok, ok ? 'Imagem de capa encontrada na página 1.' : 'Nenhuma imagem encontrada na página 1.'));
  } else {
    checks.push(chk('cover', 'A capa está incorporada na 1ª página', !input.coverRequired ? null : false,
      input.coverRequired ? 'PDF sem capa incorporada.' : 'PDF gerado sem capa (não exigida).', input.coverRequired));
  }

  // 4) texto íntegro por capítulo
  const byChapter = new Map<number, ExtractedPage[]>();
  build.pageMeta.forEach(m => {
    if (m.kind === 'capitulo' && m.chapterIndex !== undefined) {
      const ep = pages[m.page - 1];
      if (!ep) return;
      const arr = byChapter.get(m.chapterIndex) || [];
      arr.push(ep);
      byChapter.set(m.chapterIndex, arr);
    }
  });
  const stripHeadFoot = (ep: ExtractedPage): string[] => {
    const meta = build.pageMeta[ep.page - 1];
    let ls = [...ep.lines];
    if (meta?.number !== undefined && ls.length && ls[ls.length - 1].trim() === String(meta.number)) ls = ls.slice(0, -1);
    if (meta?.header && ls.length && strict(ls[0]) === strict(meta.header)) ls = ls.slice(1);
    return ls;
  };
  const integrityProblems: string[] = [];
  let totalExpWords = 0;
  let totalGotWords = 0;
  for (let ci = 0; ci < input.chapters.length; ci++) {
    const eps = byChapter.get(ci) || [];
    const got = strict(eps.flatMap(stripHeadFoot).join(' '));
    const title = cleanChapterTitle(input.chapters[ci].titulo) || `Capítulo ${ci + 1}`;
    const exp = strict(`CAPÍTULO ${ci + 1} ${title} ${build.sanitizedText[ci] || ''}`);
    totalExpWords += exp.split(' ').filter(Boolean).length;
    totalGotWords += got.split(' ').filter(Boolean).length;
    if (got !== exp) {
      const mm = wordMismatch(exp, got);
      integrityProblems.push(`Cap. ${ci + 1}: ${mm.missing} palavra(s) ausente(s), ${mm.extra} inesperada(s) (${mm.first})`);
    }
  }
  checks.push(chk('integrity', 'Texto do PDF = texto corrigido (todos os capítulos, sem perda, duplicação ou corte)',
    integrityProblems.length === 0,
    integrityProblems.length === 0
      ? `Comparação palavra a palavra: ${totalGotWords} palavras no PDF, ${totalExpWords} esperadas — idênticas.`
      : integrityProblems.slice(0, 6).join(' | ')));

  // 5) ordem dos capítulos
  const headings: { n: number; page: number }[] = [];
  pages.forEach(p => {
    const meta = build.pageMeta[p.page - 1];
    if (meta?.kind !== 'capitulo') return;
    for (const l of p.lines) {
      const m = /^CAP[ÍI]TULO\s+(\d+)$/.exec(l.trim());
      if (m) headings.push({ n: Number(m[1]), page: p.page });
    }
  });
  const orderOk = headings.length === input.chapters.length && headings.every((h, i) => h.n === i + 1) &&
    headings.every((h, i) => h.page === build.chapterStartPages[i]);
  checks.push(chk('order', 'Capítulos na ordem correta e iniciando em página própria', orderOk,
    orderOk ? `${headings.length} capítulo(s) encontrados em sequência (1…${headings.length}).`
      : `Esperados ${input.chapters.length}, encontrados ${headings.length}: ${headings.map(h => `${h.n}@p${h.page}`).join(', ').slice(0, 200)}`));

  // 6) sumário × páginas reais
  if (input.optSumario && input.chapters.length > 0) {
    const tocText = pages
      .filter(p => build.pageMeta[p.page - 1]?.kind === 'sumario')
      .map(p => stripHeadFoot(p).filter(l => strict(l) !== 'sumario').join(' '))
      .join(' ');
    const parsed = parseToc(tocText, input.chapters.length);
    if (!parsed) {
      checks.push(chk('toc', 'Sumário confere com as páginas reais', false, 'Não foi possível ler as entradas do sumário no PDF.'));
    } else {
      const bad: string[] = [];
      parsed.forEach((e, i) => {
        const real = headings.find(h => h.n === i + 1)?.page;
        const expTitle = cleanChapterTitle(input.chapters[i].titulo) || `Capítulo ${i + 1}`;
        if (real === undefined) bad.push(`${i + 1}: capítulo não encontrado`);
        else if (e.page !== real) bad.push(`${i + 1}: sumário diz p.${e.page}, real p.${real}`);
        if (strict(e.title) !== strict(expTitle)) bad.push(`${i + 1}: título do sumário "${e.title}" ≠ "${expTitle}"`);
      });
      checks.push(chk('toc', 'Sumário confere com as páginas reais (título e número)', bad.length === 0,
        bad.length === 0 ? `${parsed.length} entrada(s) do sumário apontam exatamente para a página onde o capítulo começa.` : bad.slice(0, 6).join(' | ')));
    }
  } else {
    checks.push(chk('toc', 'Sumário confere com as páginas reais', null, 'Sumário desativado nas opções do livro.', false));
  }

  // 7) numeração
  const numberProblems: string[] = [];
  build.pageMeta.forEach(m => {
    if (m.number === undefined) return;
    const p = pages[m.page - 1];
    const last = p?.lines[p.lines.length - 1]?.trim();
    if (last !== String(m.number)) numberProblems.push(`p.${m.page}: rodapé "${last ?? '∅'}"`);
  });
  checks.push(chk('numbering', 'Numeração de páginas sequencial e correta', numberProblems.length === 0,
    numberProblems.length === 0 ? 'Número impresso = página física em todas as páginas numeradas.' : numberProblems.slice(0, 5).join(' | ')));

  // 8) páginas em branco
  const blank: number[] = [];
  pages.forEach(p => {
    const meta = build.pageMeta[p.page - 1];
    if (meta?.kind === 'capa') return;
    const body = stripHeadFoot(p).filter(l => l.trim().length > 0);
    if (body.length === 0 && !p.hasImage) blank.push(p.page);
  });
  checks.push(chk('blank', 'Nenhuma página em branco', blank.length === 0,
    blank.length === 0 ? 'Todas as páginas possuem conteúdo.' : `Páginas em branco: ${blank.join(', ')}`));

  // 9) caracteres corrompidos
  const allText = pages.map(p => p.text).join('\n');
  const bad = [...new Set([...(allText.match(/\uFFFD|Ã[\u0080-\u00bf§£¡©]|â€./g) || [])])];
  checks.push(chk('encoding', 'Sem caracteres corrompidos (�, Ã§, â€…) e com acentuação preservada', bad.length === 0,
    bad.length === 0 ? 'Nenhum caractere corrompido detectado no texto extraído.' : `Encontrados: ${bad.slice(0, 6).join(' ')}`));

  // 10) texto fora/na borda da página
  const oob = pages.reduce((s, p) => s + p.outOfBounds, 0);
  const near = pages.reduce((s, p) => s + p.nearEdge, 0);
  checks.push(chk('bounds', 'Nenhum texto cortado ou fora da área da página', oob === 0,
    oob === 0 ? (near ? `Sem texto fora da página (${near} item(ns) a menos de 0,2 pol da borda).` : 'Todo o texto está dentro das margens.') : `${oob} item(ns) de texto fora da página.`));

  // 11) inspeção visual (somente onde há canvas/DOM)
  checks.push(await visualInspection(pdf, build));

  return finish(pdf.numPages);
}

/** renderiza páginas-chave em canvas e verifica tinta/margens — só no navegador */
async function visualInspection(pdf: any, build: BuildPdfResult): Promise<PdfCheck> {
  const label = 'Inspeção visual (capa, sumário, 1ª página de cada capítulo, última página)';
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return chk('visual', label, null, 'NÃO FOI POSSÍVEL VERIFICAR: renderização visual exige navegador (canvas). A verificação estrutural e de texto foi feita.', false);
  }
  try {
    const targets = new Set<number>([1, pdf.numPages]);
    build.pageMeta.forEach(m => { if (m.kind === 'sumario' || (m.kind === 'capitulo' && m.firstOfChapter)) targets.add(m.page); });
    const list = [...targets].sort((a, b) => a - b).slice(0, 40);
    const problems: string[] = [];
    for (const pn of list) {
      const page = await pdf.getPage(pn);
      const vp = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(vp.width);
      canvas.height = Math.ceil(vp.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0;
      let edgeInk = 0;
      const edge = Math.floor(0.12 * 72 * 0.6);
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const dark = data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200;
          if (dark) {
            ink++;
            if (x < edge || x > canvas.width - edge) edgeInk++;
          }
        }
      }
      const kind = build.pageMeta[pn - 1]?.kind;
      if (ink === 0) problems.push(`p.${pn} renderizou em branco`);
      else if (kind !== 'capa' && edgeInk / ink > 0.02) problems.push(`p.${pn} tem conteúdo colado na borda`);
    }
    return chk('visual', label, problems.length === 0, problems.length === 0 ? `${list.length} página(s)-chave renderizadas e inspecionadas (tinta presente, margens livres).` : problems.slice(0, 5).join(' | '), false);
  } catch (e: any) {
    return chk('visual', label, null, `NÃO FOI POSSÍVEL VERIFICAR: ${e?.message || e}`, false);
  }
}

/** renderiza uma página do PDF em dataURL (navegador) — usado para miniaturas/inspeção manual */
export async function renderPageToDataUrl(bytes: Uint8Array, pageNumber: number, scale = 1): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  const pdf = await openPdf(bytes);
  const page = await pdf.getPage(pageNumber);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(vp.width);
  canvas.height = Math.ceil(vp.height);
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  return canvas.toDataURL('image/png');
}
