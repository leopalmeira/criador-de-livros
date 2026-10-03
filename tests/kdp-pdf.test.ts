import { describe, it, expect } from 'vitest';
import zlib from 'node:zlib';
import { buildKdpPdf, inspectCover, sanitizeForPdf, readImageInfo } from '../src/services/kdp-pdf-builder';
import { validatePdf, parseToc } from '../src/services/kdp-pdf-validator';

// PNG real (cor sólida) gerado em memória — proporção 2:3
function makePng(w: number, h: number, rgb: [number, number, number] = [30, 60, 120]): string {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = rgb[0]; raw[o + 1] = rgb[1] + (x % 40); raw[o + 2] = rgb[2];
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf: Buffer) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return 'data:image/png;base64,' + png.toString('base64');
}

const SENT = [
  'A noite caiu sobre a cidade de São Paulo e ninguém ouviu o sino da velha igreja.',
  'Maria atravessou a praça devagar, pensando em tudo o que o pai havia dito antes de partir.',
  'O vento frio trazia o cheiro de café e de chuva próxima, e as luzes tremiam nas poças.',
  '— Você não precisa ir — disse João, segurando a porta.',
  '— Preciso, sim. A verdade está lá, e eu não aguento mais a dúvida.',
];
function para(seed: number, n = 6) {
  return Array.from({ length: n }, (_, i) => SENT[(seed + i) % SENT.length]).join(' ');
}
function chapterText(ci: number, nParas: number) {
  const ps: string[] = [];
  for (let i = 0; i < nParas; i++) {
    ps.push(para(ci + i, 3 + ((ci + i) % 5)));
    if (i === Math.floor(nParas / 2)) ps.push('***');
  }
  return ps.join('\n\n');
}

const livro = {
  titulo: 'A Cidade das Sombras',
  subtitulo: 'Um romance de mistério',
  autor: 'Ana Souza',
  capitulos: [
    { titulo: 'Capítulo 1: A chegada', texto: chapterText(0, 30) },
    { titulo: 'O segredo do relógio', texto: chapterText(1, 22) },
    { titulo: 'Sombras no porão', texto: chapterText(2, 40) },
    { titulo: 'A última carta', texto: chapterText(3, 12) },
  ],
};

describe('kdp-pdf-builder + kdp-pdf-validator (PDF real aberto com pdf.js)', () => {
  it('sanitiza caracteres fora do cp1252 e preserva acentos/travessão', () => {
    const seen: string[] = [];
    const out = sanitizeForPdf('Olá — “mundo” … ✓ 日本', c => seen.push(c));
    expect(out).toBe('Olá — “mundo” …  ??');
    expect(out).not.toContain('日');
  });

  it('lê dimensões de PNG e avalia a capa', () => {
    const png = makePng(60, 90);
    expect(readImageInfo(png)).toEqual({ format: 'png', width: 60, height: 90 });
    const st = inspectCover(png, '6x9');
    expect(st.valid).toBe(true);
    expect(st.kind).toBe('frontal');
    expect(inspectCover(null, '6x9').present).toBe(false);
    expect(inspectCover('data:image/png;base64,AAAA', '6x9').valid).toBe(false);
  });

  it('gera PDF com capa, sumário com páginas reais e passa em toda a validação', async () => {
    const capa = makePng(300, 450);
    const build = buildKdpPdf({ livro, capaDataUrl: capa, formato: '6x9', optSumario: true, tamCapitulo: 11, corCapitulo: '#1e293b' });
    expect(build.coverIncluded).toBe(true);
    expect(build.pageCount).toBeGreaterThan(8);
    expect(build.chapterStartPages.length).toBe(4);
    const v = await validatePdf({ bytes: build.bytes, build, chapters: livro.capitulos, bookTitle: livro.titulo, optSumario: true, coverRequired: true });
    const failed = v.checks.filter(c => c.ok === false);
    expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
    expect(v.ok).toBe(true);
    expect(v.pageCount).toBe(build.pageCount);
    // sumário × páginas reais: cada capítulo em sua página
    const toc = v.checks.find(c => c.id === 'toc')!;
    expect(toc.ok).toBe(true);
  }, 60000);

  it('validador detecta PDF corrompido', async () => {
    const build = buildKdpPdf({ livro, capaDataUrl: null, formato: '6x9', optSumario: true, tamCapitulo: 11, corCapitulo: '#1e293b' });
    const broken = build.bytes.slice(0, Math.floor(build.bytes.length / 3));
    const v = await validatePdf({ bytes: broken, build, chapters: livro.capitulos, bookTitle: livro.titulo, optSumario: true, coverRequired: false });
    expect(v.ok).toBe(false);
    expect(v.checks[0].id).toBe('open');
    expect(v.checks[0].ok).toBe(false);
  }, 60000);

  it('validador detecta divergência entre texto esperado e PDF (texto perdido)', async () => {
    const build = buildKdpPdf({ livro, capaDataUrl: null, formato: '6x9', optSumario: true, tamCapitulo: 11, corCapitulo: '#1e293b' });
    const tampered = { ...build, sanitizedText: build.sanitizedText.map((t, i) => (i === 1 ? t + '\n\nParágrafo que não está no PDF.' : t)) };
    const v = await validatePdf({ bytes: build.bytes, build: tampered, chapters: livro.capitulos, bookTitle: livro.titulo, optSumario: true, coverRequired: false });
    expect(v.checks.find(c => c.id === 'integrity')!.ok).toBe(false);
    expect(v.ok).toBe(false);
  }, 60000);

  it('parseToc lê entradas em sequência', () => {
    const r = parseToc('1. A chegada 3 2. O segredo do relógio 10 3. Ano 2020 em foco 15', 3);
    expect(r).toEqual([
      { title: 'A chegada', page: 3 },
      { title: 'O segredo do relógio', page: 10 },
      { title: 'Ano 2020 em foco', page: 15 },
    ]);
  });
});
