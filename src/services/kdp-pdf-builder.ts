// ================================================================
// CONSTRUTOR DE PDF KDP (DIAGRAMAÇÃO PROFISSIONAL)
// - capa incorporada na 1ª página (imagem validada, sem distorção)
// - página de rosto, sumário com páginas REAIS (multi-passe)
// - margens espelhadas (miolo/externa) conforme nº de páginas
// - recuo de parágrafo, texto justificado, viúvas/órfãs, cenas "* * *"
// - cabeçalhos corridos e numeração = página física do PDF
// - páginas só são criadas quando há conteúdo para elas (sem brancas)
// ================================================================
import { jsPDF } from 'jspdf';
import type { CoverStatus } from '../types/editorial-correction';
import { cleanChapterTitle } from './kdp-editorial-review';

export const TRIM_SIZES: Record<string, [number, number]> = {
  '6x9': [6, 9],
  '5x8': [5, 8],
  '5.5x8.5': [5.5, 8.5],
  '8.5x11': [8.5, 11],
};

export interface BuildPdfInput {
  livro: {
    titulo: string;
    subtitulo?: string;
    autor: string;
    capitulos: { titulo: string; texto: string; imagemDataUrl?: string | null }[];
  };
  capaDataUrl?: string | null;
  formato: string;
  optSumario: boolean;
  tamCapitulo: number;
  corCapitulo: string;
  silhuetaConfig?: {
    ativado: boolean;
    imagemDataUrl?: string | null;
    paginasSelecionadas: number[];
    opacidade?: number;
    sangriaPct?: number;
  };
}

export type PageKind = 'capa' | 'rosto' | 'sumario' | 'capitulo';

export interface PageMeta {
  page: number;
  kind: PageKind;
  chapterIndex?: number;
  firstOfChapter?: boolean;
  header?: string;
  number?: number;
}

export interface BuildPdfResult {
  bytes: Uint8Array;
  pageCount: number;
  chapterStartPages: number[];
  tocPages: number;
  pageMeta: PageMeta[];
  warnings: string[];
  passes: number;
  coverIncluded: boolean;
  pageSize: [number, number];
  sanitizedText: string[];
}

// ---------------------------------------------------------------
// SANEAMENTO PARA FONTES PADRÃO PDF (WinAnsi / cp1252)
// ---------------------------------------------------------------
const CP1252_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.split(''));
const REPLACE: Record<string, string> = {
  '\u00a0': ' ', '\u2009': ' ', '\u202f': ' ', '\u2002': ' ', '\u2003': ' ', '\u2011': '-', '\u2212': '-',
  '\u200b': '', '\u200c': '', '\u200d': '', '\ufeff': '', '\u2192': '->', '\u2190': '<-', '\u2713': '', '\u2714': '',
  '\u2605': '*', '\u2606': '*', '\u2764': '', '\u2026': '…', '\u00ad': '',
};

export function sanitizeForPdf(text: string, onUnsupported?: (ch: string) => void): string {
  let out = '';
  for (const ch of text) {
    if (ch === '\n') { out += ch; continue; }
    if (REPLACE[ch] !== undefined) { out += REPLACE[ch]; continue; }
    const cp = ch.codePointAt(0)!;
    if (cp >= 32 && cp <= 126) { out += ch; continue; }
    if (cp >= 160 && cp <= 255) { out += ch; continue; }
    if (CP1252_EXTRA.has(ch)) { out += ch; continue; }
    onUnsupported?.(ch);
    out += '?';
  }
  return out;
}

// ---------------------------------------------------------------
// INSPEÇÃO DA CAPA (sem decodificar a imagem inteira)
// ---------------------------------------------------------------
export function readImageInfo(dataUrl: string): { format: 'png' | 'jpeg'; width: number; height: number } | null {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl || '');
  if (!m) return null;
  let bin: string;
  try { bin = atob(m[2].slice(0, 200000)); } catch { return null; }
  const b = (i: number) => bin.charCodeAt(i) & 0xff;
  if (m[1].toLowerCase() === 'png') {
    if (bin.length < 24 || b(0) !== 0x89 || bin.slice(1, 4) !== 'PNG') return null;
    const w = (b(16) << 24) | (b(17) << 16) | (b(18) << 8) | b(19);
    const h = (b(20) << 24) | (b(21) << 16) | (b(22) << 8) | b(23);
    return w > 0 && h > 0 ? { format: 'png', width: w, height: h } : null;
  }
  if (b(0) !== 0xff || b(1) !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bin.length) {
    if (b(i) !== 0xff) { i++; continue; }
    const marker = b(i + 1);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = (b(i + 5) << 8) | b(i + 6);
      const w = (b(i + 7) << 8) | b(i + 8);
      return w > 0 && h > 0 ? { format: 'jpeg', width: w, height: h } : null;
    }
    i += 2 + ((b(i + 2) << 8) | b(i + 3));
  }
  return null;
}

export function inspectCover(dataUrl: string | null | undefined, formato: string): CoverStatus {
  if (!dataUrl) {
    return { present: false, valid: false, kind: 'ausente', notes: ['Nenhuma capa foi encontrada no projeto.'] };
  }
  const info = readImageInfo(dataUrl);
  if (!info) {
    return { present: true, valid: false, kind: 'ausente', notes: ['O arquivo de capa está corrompido ou não é PNG/JPEG válido.'] };
  }
  const [LW, LH] = TRIM_SIZES[formato] || [6, 9];
  const notes: string[] = [];
  const ratio = info.width / info.height;
  const target = LW / LH;
  if (Math.abs(ratio - target) / target > 0.02) {
    notes.push(`Proporção da capa (${ratio.toFixed(3)}) difere do formato ${formato} (${target.toFixed(3)}): será recortada no centro, sem distorção.`);
  }
  const dpi = Math.round(info.width / LW);
  if (dpi < 300) notes.push(`Resolução efetiva da capa ≈ ${dpi} dpi (a Amazon recomenda 300 dpi ou mais).`);
  notes.push('Esta é a CAPA FRONTAL. A capa completa de impressão (lombada + contracapa) depende do nº final de páginas/papel e NÃO foi gerada.');
  return { present: true, valid: true, kind: 'frontal', width: info.width, height: info.height, format: info.format, notes };
}

// ---------------------------------------------------------------
// MARGENS
// ---------------------------------------------------------------
export function gutterFor(pages: number): number {
  if (pages <= 150) return 0.375;
  if (pages <= 300) return 0.5;
  if (pages <= 500) return 0.625;
  if (pages <= 700) return 0.75;
  return 0.875;
}

const SCENE_BREAK = /^(?:(?:\*\s*){3,}|[-–—_=#~]{3,}|⁂)$/;

interface RenderOutput {
  doc: jsPDF;
  starts: number[];
  tocPages: number;
  pageMeta: PageMeta[];
  warnings: string[];
  pageCount: number;
  coverIncluded: boolean;
  sanitized: string[];
}

function renderOnce(input: BuildPdfInput, tocNums: number[] | null, gutter: number): RenderOutput {
  const [LW, LH] = TRIM_SIZES[input.formato] || [6, 9];
  const doc = new jsPDF({ unit: 'in', format: [LW, LH], orientation: 'portrait', compress: true });
  const warnings: string[] = [];
  const unsupported = new Set<string>();
  const sanitize = (s: string) => sanitizeForPdf(s, ch => unsupported.add(ch));

  const inner = gutter + 0.3;
  const outer = 0.6;
  const mT = 0.85;
  const mB = 0.9;
  const textW = LW - inner - outer;
  const lineH = 0.215;
  const FS = 11;
  const indent = 0.25;
  const bottomLimit = LH - mB;

  const pageMeta: PageMeta[] = [];
  let page = 0;
  let y = mT;
  let firstUsed = false;
  let coverOffset = 0;
  let coverIncluded = false;

  const isRecto = (p: number) => (p - coverOffset) % 2 === 1;
  const leftOf = (p: number) => (isRecto(p) ? inner : outer);

  const bookTitle = sanitize(input.livro.titulo);
  const chapters = input.livro.capitulos;
  const cleanTitles = chapters.map((c, i) => sanitize(cleanChapterTitle(c.titulo) || `Capítulo ${i + 1}`));
  const starts: number[] = new Array(chapters.length).fill(0);

  const finishPage = () => {
    if (page === 0) return;
    const meta = pageMeta[page - 1];
    if (meta.kind === 'capa' || meta.kind === 'rosto') return;

    // Renderização de Silhueta Marginal (Marca d'água com sangria de 3% da metade da página para fora)
    if (input.silhuetaConfig?.ativado && input.silhuetaConfig.imagemDataUrl) {
      const paginas = input.silhuetaConfig.paginasSelecionadas || [];
      if (paginas.includes(page)) {
        try {
          const halfW = LW / 2;
          const sangria = halfW * (input.silhuetaConfig.sangriaPct ?? 0.03); // 3% da metade da página para fora
          const silW = LW * 0.36;
          const silH = silW * 1.33; // proporção 3:4
          const isRight = isRecto(page);
          const silX = isRight ? (LW - silW + sangria) : -sangria;
          const silY = LH - silH - 0.6;

          const opacidade = input.silhuetaConfig.opacidade ?? 0.18;
          if ((doc as any).GState) {
            try {
              (doc as any).setGState(new (doc as any).GState({ opacity: opacidade }));
            } catch {}
          }
          doc.addImage(input.silhuetaConfig.imagemDataUrl, 'PNG', silX, silY, silW, silH, undefined, 'FAST');
          if ((doc as any).GState) {
            try {
              (doc as any).setGState(new (doc as any).GState({ opacity: 1.0 }));
            } catch {}
          }
        } catch {
          // Continua normalmente se a imagem falhar
        }
      }
    }

    if (meta.kind === 'capitulo' && !meta.firstOfChapter) {
      const header = isRecto(page) ? cleanTitles[meta.chapterIndex!] : bookTitle;
      doc.setFont('times', 'italic').setFontSize(9).setTextColor(120);
      doc.text(header, LW / 2, 0.5, { align: 'center', maxWidth: textW });
      meta.header = header;
    }
    doc.setFont('times', 'normal').setFontSize(10).setTextColor(110);
    doc.text(String(page), LW / 2, LH - 0.5, { align: 'center' });
    meta.number = page;
    doc.setTextColor(0);
  };

  const startPage = (kind: PageKind, chapterIndex?: number, firstOfChapter?: boolean) => {
    finishPage();
    if (firstUsed) doc.addPage();
    firstUsed = true;
    page++;
    pageMeta.push({ page, kind, chapterIndex, firstOfChapter });
    y = mT;
  };

  // 1) CAPA
  if (input.capaDataUrl) {
    const info = readImageInfo(input.capaDataUrl);
    if (info) {
      startPage('capa');
      const pr = LW / LH;
      const ir = info.width / info.height;
      let dw = LW, dh = LH, dx = 0, dy = 0;
      if (ir > pr) { dh = LH; dw = LH * ir; dx = -(dw - LW) / 2; }
      else if (ir < pr) { dw = LW; dh = LW / ir; dy = -(dh - LH) / 2; }
      try {
        doc.addImage(input.capaDataUrl, info.format === 'png' ? 'PNG' : 'JPEG', dx, dy, dw, dh, undefined, 'FAST');
        coverIncluded = true;
        coverOffset = 1;
      } catch (e: any) {
        warnings.push(`Falha ao incorporar a capa: ${e?.message || e}`);
      }
    } else {
      warnings.push('Capa inválida: não foi incorporada.');
    }
  } else {
    warnings.push('PDF gerado SEM capa incorporada.');
  }

  // 2) PÁGINA DE ROSTO
  startPage('rosto');
  doc.setFont('times', 'bold').setFontSize(24).setTextColor(20);
  const tL = doc.splitTextToSize(bookTitle, textW) as string[];
  doc.text(tL, LW / 2, LH / 3, { align: 'center' });
  let ty = LH / 3 + tL.length * 0.38;
  if (input.livro.subtitulo) {
    doc.setFont('times', 'italic').setFontSize(13).setTextColor(60);
    const sL = doc.splitTextToSize(sanitize(input.livro.subtitulo), textW) as string[];
    doc.text(sL, LW / 2, ty + 0.25, { align: 'center' });
  }
  doc.setFont('times', 'normal').setFontSize(13).setTextColor(20);
  doc.text(sanitize(`por ${input.livro.autor}`), LW / 2, LH - 1.4, { align: 'center' });
  doc.setTextColor(0);

  // 3) SUMÁRIO (páginas reais vindas do passe anterior)
  let tocPages = 0;
  if (input.optSumario && chapters.length > 0) {
    startPage('sumario');
    tocPages = 1;
    doc.setFont('times', 'bold').setFontSize(18).setTextColor(20);
    doc.text('Sumário', LW / 2, y + 0.3, { align: 'center' });
    doc.setTextColor(0);
    y += 0.95;
    const entryH = 0.26;
    chapters.forEach((_, i) => {
      doc.setFont('times', 'normal').setFontSize(11);
      const label = `${i + 1}. ${cleanTitles[i]}`;
      const wrapped = doc.splitTextToSize(label, textW - 0.75) as string[];
      if (y + wrapped.length * entryH > bottomLimit) {
        startPage('sumario');
        tocPages++;
        y = mT + 0.1;
        doc.setFont('times', 'normal').setFontSize(11);
      }
      const L = leftOf(page);
      doc.text(wrapped, L, y);
      const lastY = y + (wrapped.length - 1) * entryH;
      const lastW = doc.getTextWidth(wrapped[wrapped.length - 1]);
      const numStr = String(tocNums ? tocNums[i] : '000');
      const rightX = L + textW;
      const dotsFrom = L + lastW + 0.1;
      const dotsTo = rightX - doc.getTextWidth(numStr) - 0.1;
      if (dotsTo > dotsFrom) {
        doc.setLineDashPattern([0.012, 0.045], 0);
        doc.setDrawColor(150);
        doc.setLineWidth(0.008);
        doc.line(dotsFrom, lastY - 0.02, dotsTo, lastY - 0.02);
        doc.setLineDashPattern([], 0);
      }
      doc.text(numStr, rightX, lastY, { align: 'right' });
      y += wrapped.length * entryH;
    });
  }

  // 4) CAPÍTULOS
  const spaceW = (() => { doc.setFont('times', 'normal').setFontSize(FS); return doc.getTextWidth(' '); })();
  const remainingLines = () => Math.floor((bottomLimit - y + 0.001) / lineH);
  const newContentPage = (ci: number) => { startPage('capitulo', ci, false); };

  const wrapParagraph = (text: string, firstIndent: number): { words: string[]; width: number }[] => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: { words: string[]; width: number }[] = [];
    let cur: string[] = [];
    let curW = 0;
    const maxFor = () => (lines.length === 0 ? textW - firstIndent : textW);
    for (let w of words) {
      let ww = doc.getTextWidth(w);
      while (ww > textW) { // palavra maior que a linha (URL etc.): quebra por caracteres
        let cut = w.length - 1;
        while (cut > 1 && doc.getTextWidth(w.slice(0, cut)) > maxFor()) cut--;
        if (cur.length) { lines.push({ words: cur, width: curW }); cur = []; curW = 0; }
        const part = w.slice(0, cut);
        lines.push({ words: [part], width: doc.getTextWidth(part) });
        w = w.slice(cut);
        ww = doc.getTextWidth(w);
      }
      const add = cur.length ? curW + spaceW + ww : ww;
      if (add > maxFor() && cur.length) {
        lines.push({ words: cur, width: curW });
        cur = [w];
        curW = ww;
      } else {
        cur = cur.concat(w);
        curW = add;
      }
    }
    if (cur.length) lines.push({ words: cur, width: curW });
    return lines;
  };

  const sanitized: string[] = [];
  const tcolor = /^#?[0-9a-f]{6}$/i.test(input.corCapitulo || '') ? input.corCapitulo.replace('#', '') : '1e293b';
  const rgb = [0, 2, 4].map(i => parseInt(tcolor.slice(i, i + 2), 16));

  chapters.forEach((cap, ci) => {
    startPage('capitulo', ci, true);
    starts[ci] = page;
    y = mT + 1.1;
    doc.setFont('times', 'bold').setFontSize(10).setTextColor(130);
    doc.text(`CAPÍTULO ${ci + 1}`, LW / 2, y, { align: 'center' });
    y += 0.4;
    const tSize = Math.max(14, Math.min(30, Math.round(input.tamCapitulo * 1.7)));
    doc.setFont('times', 'bold').setFontSize(tSize).setTextColor(rgb[0], rgb[1], rgb[2]);
    const titleLines = doc.splitTextToSize(cleanTitles[ci], textW) as string[];
    titleLines.forEach(l => { doc.text(l, LW / 2, y, { align: 'center' }); y += (tSize * 1.25) / 72; });
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(0.012);
    doc.line(LW / 2 - 0.35, y - 0.05, LW / 2 + 0.35, y - 0.05);
    y += 0.5;
    doc.setTextColor(0);

    // Ilustração dedicada do capítulo (se presente)
    if (cap.imagemDataUrl) {
      try {
        const maxImgW = Math.min(textW, 3.8);
        const imgH = maxImgW * 0.65;
        const imgX = leftOf(page) + (textW - maxImgW) / 2;
        doc.addImage(cap.imagemDataUrl, 'PNG', imgX, y, maxImgW, imgH, undefined, 'FAST');
        y += imgH + 0.35;
      } catch (e: any) {
        warnings.push(`Capítulo ${ci + 1}: Imagem ilustrada não pôde ser renderizada.`);
      }
    }

    const body = sanitize(cap.texto || '');
    sanitized.push(body);
    const paras = body.split(/\n+/).map(p => p.trim()).filter(Boolean);
    if (paras.length === 0) warnings.push(`Capítulo ${ci + 1} ("${cleanTitles[ci]}") está sem texto.`);
    let first = true;
    doc.setFont('times', 'normal').setFontSize(FS).setTextColor(0);

    for (const p of paras) {
      if (SCENE_BREAK.test(p)) {
        if (remainingLines() < 4) newContentPage(ci);
        y += lineH * 0.6;
        doc.setFont('times', 'normal').setFontSize(FS);
        doc.text('* * *', leftOf(page) + textW / 2, y, { align: 'center' });
        y += lineH * 1.6;
        first = true;
        continue;
      }
      doc.setFont('times', 'normal').setFontSize(FS);
      const ind = first ? 0 : indent;
      const lines = wrapParagraph(p, ind);
      let i = 0;
      while (i < lines.length) {
        let R = remainingLines();
        const left = lines.length - i;
        if (R <= 0) { newContentPage(ci); R = remainingLines(); if (R <= 0) R = 1; }
        let take = Math.min(left, R);
        if (left > R) {
          if (R < 2 && i === 0) { newContentPage(ci); continue; } // órfã
          if (left - R < 2) take = R - 1; // viúva
          if (take < 1) { newContentPage(ci); continue; }
          if (take < 2 && i === 0) { newContentPage(ci); continue; }
        }
        const L = leftOf(page);
        for (let k = 0; k < take; k++) {
          const ln = lines[i + k];
          const isFirstLine = i + k === 0;
          const x = L + (isFirstLine ? ind : 0);
          const maxW = isFirstLine ? textW - ind : textW;
          const isLast = i + k === lines.length - 1;
          const nSp = ln.words.length - 1;
          const extra = maxW - ln.width;
          let justified = false;
          if (!isLast && nSp > 0 && extra > 0 && extra / nSp <= 0.12) {
            (doc as any).internal.write(`${((extra * 72) / nSp).toFixed(3)} Tw`);
            justified = true;
          }
          doc.text(ln.words.join(' '), x, y);
          if (justified) (doc as any).internal.write('0 Tw');
          y += lineH;
        }
        i += take;
        if (i < lines.length) newContentPage(ci);
      }
      first = false;
    }
  });
  finishPage();

  if (unsupported.size > 0) {
    warnings.push(`Caracteres fora do alfabeto suportado pelas fontes do PDF foram substituídos por "?": ${[...unsupported].slice(0, 12).join(' ')}`);
  }

  return { doc, starts, tocPages, pageMeta, warnings, pageCount: page, coverIncluded, sanitized };
}

export function buildKdpPdf(input: BuildPdfInput): BuildPdfResult {
  const totalWords = input.livro.capitulos.reduce((s, c) => s + (c.texto || '').split(/\s+/).filter(Boolean).length, 0);
  let gutter = gutterFor(Math.round(totalWords / 280) + 6);
  let tocNums: number[] | null = null;
  let last: RenderOutput | null = null;
  let passes = 0;
  for (let pass = 1; pass <= 6; pass++) {
    passes = pass;
    const r = renderOnce(input, tocNums, gutter);
    last = r;
    const needed = gutterFor(r.pageCount);
    if (needed > gutter) { gutter = needed; tocNums = r.starts; continue; }
    if (tocNums && tocNums.length === r.starts.length && tocNums.every((v, i) => v === r.starts[i])) break;
    tocNums = r.starts;
    if (pass === 6) r.warnings.push('Sumário não estabilizou após 6 passes; confira a validação do PDF.');
  }
  const r = last!;
  const buf = r.doc.output('arraybuffer') as ArrayBuffer;
  return {
    bytes: new Uint8Array(buf),
    pageCount: r.pageCount,
    chapterStartPages: r.starts,
    tocPages: r.tocPages,
    pageMeta: r.pageMeta,
    warnings: r.warnings,
    passes,
    coverIncluded: r.coverIncluded,
    pageSize: TRIM_SIZES[input.formato] || [6, 9],
    sanitizedText: r.sanitized,
  };
}
