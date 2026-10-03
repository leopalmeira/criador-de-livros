import zlib from 'node:zlib';

/** PNG RGB real (válido) gerado em memória — usado em testes de capa */
export function makePng(w: number, h: number, rgb: [number, number, number] = [30, 60, 120]): string {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = rgb[0];
      raw[o + 1] = (rgb[1] + (x % 40)) & 255;
      raw[o + 2] = (rgb[2] + (y % 50)) & 255;
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return 'data:image/png;base64,' + png.toString('base64');
}

const NOUNS = ['o farol', 'a biblioteca', 'o velho barco', 'a janela quebrada', 'o jardim', 'o relógio da torre', 'a estrada de terra', 'o mercador', 'a pequena ponte', 'o moinho'];
const VERBS = ['observava', 'esperava', 'lembrava', 'atravessava', 'guardava', 'procurava'];
const OBJ = ['uma carta amarelada', 'as chaves de ferro', 'um mapa antigo', 'o segredo da família', 'as luzes distantes', 'a canção esquecida'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** frase única e determinística (numerada) — evita repetições artificiais entre capítulos */
export function sentence(k: number): string {
  return `${cap(NOUNS[k % 10])} ${VERBS[(k * 3) % 6]} ${OBJ[(k * 7) % 6]} enquanto Helena caminhava pela vila número ${k}.`;
}

export interface SeedOptions {
  /** erros semeados corrigíveis por regras */
  ruleErrors?: boolean;
  /** erro que só a IA corrige ("ouvio") */
  aiError?: boolean;
}

/** capítulo com n parágrafos; erros semeados em parágrafos específicos */
export function chapterBody(c: number, nParas: number, seed: SeedOptions = {}): string {
  const out: string[] = [];
  for (let p = 0; p < nParas; p++) {
    const base = c * 1000 + p * 5;
    let t = [sentence(base), sentence(base + 1), sentence(base + 2), sentence(base + 3)].join(' ');
    if (p === 1 && seed.ruleErrors) t = t.replace('enquanto', 'enquanto  ').replace('Helena', 'Helena,,') + ' Porisso ela nÃ£o voltou, e voce sabe.';
    if (p === 2 && seed.aiError) t += ' Tomás ouvio o sino e foi embora.';
    out.push(t);
    if (p === Math.floor(nParas / 2)) out.push('***');
  }
  return out.join('\n\n');
}

export interface FakeAiState {
  blockCalls: number[]; // nº do capítulo (1-based) de cada chamada de revisão de bloco
  otherCalls: number;
  failChapter?: number; // 1-based: lança erro nas chamadas de bloco desse capítulo
  mode: 'ok' | 'summarize' | 'invent' | 'garbage';
}

/**
 * IA SIMULADA (somente para testes unitários): corrige "ouvio"→"ouviu",
 * respeitando o contrato de formato. As asserções dos testes verificam o
 * texto resultante de verdade; só o "modelo" é roteirizado.
 */
export function makeFakeAi(state: FakeAiState) {
  return async (prompt: string): Promise<{ texto: string; modelo: string }> => {
    const marker = 'TEXTO A REVISAR (devolva integralmente, corrigido, no formato exigido):';
    const i = prompt.indexOf(marker);
    if (i >= 0) {
      const chap = Number(/CAPÍTULO (\d+):/.exec(prompt)?.[1] || 0);
      state.blockCalls.push(chap);
      if (state.failChapter === chap) throw new Error('503 Google em alta demanda');
      const block = prompt.slice(i + marker.length).trim();
      let out = block.replace(/\bouvio\b/g, 'ouviu');
      if (state.mode === 'summarize') out = out.slice(0, Math.floor(out.length * 0.4));
      if (state.mode === 'invent') out = out + '\n\nDe repente, um dragão apareceu e destruiu a cidade inteira, matando todos os personagens.';
      if (state.mode === 'garbage') return { texto: 'Desculpe, não posso ajudar com isso.', modelo: 'fake-model' };
      const notes = out !== block ? '[{"de":"ouvio","para":"ouviu","motivo":"conjugação verbal"}]' : '[]';
      return { texto: `<<<TEXTO>>>\n${out}\n<<<FIM>>>\n<<<NOTAS>>>\n${notes}\n<<<FIMNOTAS>>>`, modelo: 'fake-model' };
    }
    state.otherCalls++;
    if (prompt.includes('editor de continuidade narrativa')) {
      return {
        texto: JSON.stringify({
          personagens: [{ nome: 'Helena', tracos: ['curiosa'], estado: 'caminhando' }], locais: [{ nome: 'vila', descricao: 'pequena' }],
          objetos: [], eventos: ['Helena caminha'], reveladas: [], misterios_abertos: [], misterios_resolvidos: [],
          estado_final: 'Helena segue pela vila.', regras_a_lembrar: [], contradicoes: [],
        }),
        modelo: 'fake-model',
      };
    }
    return { texto: '{"contradicoes":[]}', modelo: 'fake-model' };
  };
}
