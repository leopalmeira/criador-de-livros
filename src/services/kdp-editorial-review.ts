// ================================================================
// CONTINUIDADE NARRATIVA · REVISÃO CRUZADA · SUMÁRIO
// ================================================================
import type {
  ContinuityEntity,
  ContinuityRegistry,
  CorrectionChange,
  CrossReviewResult,
  PendingItem,
  TocEntry,
} from '../types/editorial-correction';
import type { AiCall } from './kdp-editorial-corrector';
import { levenshtein, normText, normWord, splitParagraphs, stripAccents, wordsOf } from './editorial-text-utils';

// ---------------------------------------------------------------
// TÍTULOS / SUMÁRIO
// ---------------------------------------------------------------
/** remove prefixo "Capítulo N:" do título (o PDF imprime "CAPÍTULO N" separadamente) */
export function cleanChapterTitle(title: string): string {
  const t = (title || '').trim();
  const cleaned = t.replace(/^cap[ií]tulo\s+(\d+|[ivxlc]+)\s*[:.\-–—]*\s*/i, '').trim();
  return cleaned || t;
}

export function isOldTocChapter(title: string): boolean {
  return /^(sum[aá]rio|[ií]ndice|tabela de conte[uú]do|conte[uú]do)\s*$/i.test((title || '').trim());
}

export function rebuildToc(chapters: { title: string; text?: string }[]): { toc: TocEntry[]; issues: string[] } {
  const issues: string[] = [];
  const toc: TocEntry[] = [];
  const seen = new Map<string, number>();
  chapters.forEach((c, i) => {
    const title = cleanChapterTitle(c.title || '');
    if (!title) issues.push(`Capítulo ${i + 1} está sem título.`);
    toc.push({ index: i, title: title || `Capítulo ${i + 1}` });
    const key = normText(title);
    if (key) {
      if (seen.has(key)) issues.push(`Título duplicado: "${title}" nos capítulos ${seen.get(key)! + 1} e ${i + 1} (não alterado automaticamente).`);
      else seen.set(key, i);
    }
    const m = /^cap[ií]tulo\s+(\d+)/i.exec((c.title || '').trim());
    if (m && Number(m[1]) !== i + 1) issues.push(`O título "${c.title}" indica o número ${m[1]}, mas é o capítulo ${i + 1} na ordem do livro.`);
  });
  return { toc, issues };
}

// ---------------------------------------------------------------
// REGISTRO DE CONTINUIDADE (heurística local + IA opcional)
// ---------------------------------------------------------------
export function emptyRegistry(): ContinuityRegistry {
  return {
    characters: {}, locations: {}, objects: {}, timeline: [], revealed: [],
    mysteriesOpen: [], mysteriesResolved: [], chapterEndStates: [], mustRemember: [], aiChapters: [],
  };
}

const NOT_NAMES = new Set([
  'capitulo', 'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro',
  'novembro', 'dezembro', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo', 'senhor', 'senhora',
  'doutor', 'doutora', 'professor', 'professora', 'dona', 'seu', 'natal', 'ele', 'ela', 'eles', 'elas', 'voce', 'nos',
  'mas', 'entao', 'quando', 'depois', 'antes', 'assim', 'porque', 'enquanto', 'talvez', 'ainda', 'tambem', 'sempre',
  'nunca', 'agora', 'hoje', 'ontem', 'amanha', 'cada', 'todos', 'todas', 'nada', 'tudo', 'algo', 'alguem', 'ninguem',
]);

interface EntStat { mid: number; start: number; loc: number }

function collectEntities(text: string): Map<string, EntStat & { display: string }> {
  const map = new Map<string, EntStat & { display: string }>();
  const bump = (display: string, kind: 'mid' | 'start' | 'loc') => {
    const key = normWord(display);
    if (key.length < 3 || NOT_NAMES.has(key)) return;
    const e = map.get(key) || { mid: 0, start: 0, loc: 0, display };
    e[kind]++;
    if (kind === 'mid' || kind === 'loc') e.display = display;
    map.set(key, e);
  };
  let m: RegExpExecArray | null;
  const mid = /(?<=[\p{Ll}\p{N},;:] )(\p{Lu}\p{Ll}{2,})/gu;
  while ((m = mid.exec(text)) !== null) bump(m[1], 'mid');
  const start = /(?:^|[.!?…]\s+|\n|—\s*)(\p{Lu}\p{Ll}{2,})/gmu;
  while ((m = start.exec(text)) !== null) bump(m[1], 'start');
  const loc = /(?<=(?:^|[^\p{L}])(?:em|na|no|nas|nos|para|à|ao|aos|às|pela|pelo|até) )(\p{Lu}\p{Ll}{2,})/gu;
  while ((m = loc.exec(text)) !== null) bump(m[1], 'loc');
  return map;
}

export function createContinuityRegistry(chapters: { title: string; text: string }[]): ContinuityRegistry {
  const reg = emptyRegistry();
  const total = new Map<string, { display: string; mid: number; start: number; loc: number; first: number; last: number }>();
  chapters.forEach((c, i) => {
    const ents = collectEntities(c.text);
    ents.forEach((e, key) => {
      const t = total.get(key) || { display: e.display, mid: 0, start: 0, loc: 0, first: i, last: i };
      t.mid += e.mid; t.start += e.start; t.loc += e.loc; t.last = i;
      t.display = e.display;
      total.set(key, t);
    });
  });
  const list = [...total.values()].filter(t => t.mid >= 1 && t.mid + t.start >= 2);
  for (const t of list) {
    const ent: ContinuityEntity = { firstChapter: t.first, lastChapter: t.last, mentions: t.mid + t.start, traits: [] };
    if (t.loc >= 1 && t.loc / Math.max(1, t.mid) >= 0.5) reg.locations[t.display] = ent;
    else if (t.mid >= 2 || t.mid + t.start >= 3) reg.characters[t.display] = ent;
  }
  const trim = (rec: Record<string, ContinuityEntity>, n: number) => {
    const keep = Object.entries(rec).sort((a, b) => b[1].mentions - a[1].mentions).slice(0, n);
    return Object.fromEntries(keep);
  };
  reg.characters = trim(reg.characters, 40);
  reg.locations = trim(reg.locations, 25);
  return reg;
}

function extractJson(raw: string): any | null {
  const s = raw || '';
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

const asStrArray = (v: any): string[] => (Array.isArray(v) ? v.map(x => String(x)).filter(Boolean) : []);

/** atualiza o registro com o capítulo já corrigido (heurística + enriquecimento por IA, não fatal) */
export async function updateContinuityWithChapter(
  registry: ContinuityRegistry,
  chapterIndex: number,
  chapterTitle: string,
  correctedText: string,
  ai: AiCall | null,
): Promise<{ registry: ContinuityRegistry; contradictions: PendingItem[]; aiUsed: boolean }> {
  const reg: ContinuityRegistry = JSON.parse(JSON.stringify(registry));
  const contradictions: PendingItem[] = [];
  const ents = collectEntities(correctedText);
  ents.forEach((_e, key) => {
    for (const rec of [reg.characters, reg.locations]) {
      for (const name of Object.keys(rec)) {
        if (normWord(name) === key) rec[name].lastChapter = Math.max(rec[name].lastChapter, chapterIndex);
      }
    }
  });
  if (!ai) return { registry: reg, contradictions, aiUsed: false };

  const excerpt = correctedText.length > 14000 ? correctedText.slice(0, 7000) + '\n[...]\n' + correctedText.slice(-7000) : correctedText;
  const known = {
    personagens: Object.keys(reg.characters), locais: Object.keys(reg.locations),
    estados_anteriores: reg.chapterEndStates.slice(-3), fatos_ja_revelados: reg.revealed.slice(-12),
  };
  const prompt = `Você é um editor de continuidade narrativa. Leia o capítulo ${chapterIndex + 1} ("${chapterTitle}") e extraia SOMENTE fatos presentes no texto — não invente nada.
REGISTRO ATUAL: ${JSON.stringify(known)}
Responda APENAS com JSON válido neste formato:
{"personagens":[{"nome":"","tracos":[""],"estado":""}],"locais":[{"nome":"","descricao":""}],"objetos":[{"nome":""}],"eventos":[""],"reveladas":[""],"misterios_abertos":[""],"misterios_resolvidos":[""],"estado_final":"1-2 frases","regras_a_lembrar":[""],"contradicoes":["descrição objetiva de qualquer contradição com o REGISTRO ATUAL, ou lista vazia"]}

CAPÍTULO:
${excerpt}`;
  try {
    const resp = await ai(prompt, { temperature: 0.1, maxTokens: 4096 });
    const j = extractJson(resp.texto);
    if (!j) return { registry: reg, contradictions, aiUsed: false };
    for (const p of Array.isArray(j.personagens) ? j.personagens : []) {
      const nome = String(p?.nome || '').trim();
      if (!nome) continue;
      const ex = reg.characters[nome] || { firstChapter: chapterIndex, lastChapter: chapterIndex, mentions: 1, traits: [] };
      ex.lastChapter = chapterIndex;
      ex.traits = [...new Set([...ex.traits, ...asStrArray(p.tracos)])].slice(0, 8);
      if (p.estado) ex.state = String(p.estado);
      reg.characters[nome] = ex;
    }
    for (const l of Array.isArray(j.locais) ? j.locais : []) {
      const nome = String(l?.nome || '').trim();
      if (!nome) continue;
      const ex = reg.locations[nome] || { firstChapter: chapterIndex, lastChapter: chapterIndex, mentions: 1, traits: [] };
      ex.lastChapter = chapterIndex;
      if (l.descricao) ex.traits = [...new Set([...ex.traits, String(l.descricao)])].slice(0, 4);
      reg.locations[nome] = ex;
    }
    for (const o of Array.isArray(j.objetos) ? j.objetos : []) {
      const nome = String(o?.nome || '').trim();
      if (!nome) continue;
      const ex = reg.objects[nome] || { firstChapter: chapterIndex, lastChapter: chapterIndex, mentions: 1, traits: [] };
      ex.lastChapter = chapterIndex;
      reg.objects[nome] = ex;
    }
    asStrArray(j.eventos).slice(0, 8).forEach(e => reg.timeline.push({ chapter: chapterIndex, event: e }));
    reg.revealed = [...new Set([...reg.revealed, ...asStrArray(j.reveladas)])].slice(-60);
    reg.mysteriesResolved = [...new Set([...reg.mysteriesResolved, ...asStrArray(j.misterios_resolvidos)])];
    reg.mysteriesOpen = [...new Set([...reg.mysteriesOpen, ...asStrArray(j.misterios_abertos)])]
      .filter(m => !reg.mysteriesResolved.includes(m)).slice(-30);
    reg.mustRemember = [...new Set([...reg.mustRemember, ...asStrArray(j.regras_a_lembrar)])].slice(-30);
    if (j.estado_final) reg.chapterEndStates.push({ chapter: chapterIndex, summary: String(j.estado_final) });
    reg.aiChapters = [...new Set([...reg.aiChapters, chapterIndex])];
    asStrArray(j.contradicoes).forEach((d, i) => contradictions.push({
      id: `ct${chapterIndex}-${i}-${Date.now().toString(36)}`,
      chapterIndex,
      kind: 'continuidade',
      description: `Possível contradição de continuidade: ${d}`,
      resolution: 'PENDENTE_VALIDACAO_AUTOR',
    }));
    return { registry: reg, contradictions, aiUsed: true };
  } catch {
    return { registry: reg, contradictions, aiUsed: false };
  }
}

// ---------------------------------------------------------------
// REVISÃO CRUZADA FINAL
// ---------------------------------------------------------------
const STOP = new Set(['de', 'da', 'do', 'a', 'o', 'e', 'que', 'em', 'um', 'uma', 'para', 'com', 'nao', 'se', 'os', 'as', 'no', 'na', 'por', 'mais', 'foi', 'ele', 'ela', 'mas', 'como', 'era', 'ao', 'seu', 'sua', 'me', 'te']);

function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+|\n+/).map(s => s.trim()).filter(Boolean);
}

function shingles(text: string, n = 5): Set<string> {
  const w = wordsOf(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}

export interface CrossReviewInput {
  bookTitle: string;
  chapters: { index: number; title: string; text: string }[];
  registry: ContinuityRegistry;
  ai: AiCall | null;
}

export async function runCrossReview(input: CrossReviewInput): Promise<{ result: CrossReviewResult; newTexts: Record<number, string> }> {
  const { chapters, registry, ai } = input;
  const autoChanges: CorrectionChange[] = [];
  const findings: PendingItem[] = [];
  const notes: string[] = [];
  const newTexts: Record<number, string> = {};
  let fid = 0;
  const id = (k: string) => `cr-${k}-${Date.now().toString(36)}-${fid++}`;
  const pend = (chapterIndex: number, kind: PendingItem['kind'], description: string, snippet?: string): PendingItem => ({
    id: id(kind), chapterIndex, kind, description, snippet, resolution: 'PENDENTE_VALIDACAO_AUTOR',
  });

  // 1) parágrafos idênticos CONSECUTIVOS dentro do mesmo capítulo → remoção automática (duplicação evidente)
  for (const ch of chapters) {
    const paras = splitParagraphs(ch.text);
    const kept: string[] = [];
    let changed = false;
    for (const p of paras) {
      const prev = kept[kept.length - 1];
      if (prev !== undefined && p.length >= 40 && normText(prev) === normText(p)) {
        autoChanges.push({
          id: id('dup'), chapterIndex: ch.index, original: p.slice(0, 160), corrected: '(parágrafo duplicado consecutivo removido)',
          type: 'repeticao', reason: 'Parágrafo idêntico repetido imediatamente — duplicação evidente',
          resolution: 'CORRIGIDO_AUTOMATICAMENTE', source: 'revisao_cruzada', occurrences: 1,
        });
        changed = true;
        continue;
      }
      kept.push(p);
    }
    if (changed) newTexts[ch.index] = kept.join('\n\n');
  }
  const textOf = (c: { index: number; text: string }) => newTexts[c.index] ?? c.text;

  // 2) parágrafos longos repetidos (não consecutivos / entre capítulos)
  const paraMap = new Map<string, { ch: number; text: string }[]>();
  for (const c of chapters) {
    for (const p of splitParagraphs(textOf(c))) {
      if (p.length < 60) continue;
      const k = normText(p);
      const arr = paraMap.get(k) || [];
      arr.push({ ch: c.index, text: p });
      paraMap.set(k, arr);
    }
  }
  let n = 0;
  for (const arr of paraMap.values()) {
    if (arr.length >= 2 && n < 15) {
      n++;
      const where = [...new Set(arr.map(a => a.ch + 1))].join(', ');
      findings.push(pend(arr[1].ch, 'repeticao', `Parágrafo repetido ${arr.length}× (capítulos ${where}).`, arr[0].text.slice(0, 140)));
    }
  }

  // 3) frases longas repetidas
  const sentMap = new Map<string, { ch: number; text: string }[]>();
  for (const c of chapters) {
    for (const s of sentencesOf(textOf(c))) {
      if (s.length < 70) continue;
      const k = normText(s);
      const arr = sentMap.get(k) || [];
      arr.push({ ch: c.index, text: s });
      sentMap.set(k, arr);
    }
  }
  n = 0;
  for (const [k, arr] of sentMap) {
    if (arr.length >= 2 && n < 15 && !paraMap.has(k)) {
      n++;
      findings.push(pend(arr[1].ch, 'repeticao', `Frase repetida ${arr.length}× (capítulos ${[...new Set(arr.map(a => a.ch + 1))].join(', ')}).`, arr[0].text.slice(0, 140)));
    }
  }

  // 4) títulos duplicados / capítulos vazios
  const toc = rebuildToc(chapters.map(c => ({ title: c.title })));
  toc.issues.forEach(i => findings.push(pend(-1, 'titulo', i)));
  for (const c of chapters) {
    if (wordsOf(textOf(c)).length < 30) findings.push(pend(c.index, 'outro', `Capítulo ${c.index + 1} tem menos de 30 palavras — conteúdo possivelmente incompleto.`));
  }

  // 5) capítulos quase idênticos
  const sh = chapters.map(c => shingles(textOf(c)));
  for (let i = 0; i < chapters.length; i++) {
    for (let j = i + 1; j < chapters.length; j++) {
      if (sh[i].size < 20 || sh[j].size < 20) continue;
      let inter = 0;
      sh[i].forEach(g => { if (sh[j].has(g)) inter++; });
      const jac = inter / (sh[i].size + sh[j].size - inter);
      if (jac >= 0.45) findings.push(pend(chapters[j].index, 'repeticao', `Capítulos ${chapters[i].index + 1} e ${chapters[j].index + 1} são ${(jac * 100).toFixed(0)}% semelhantes (possível conteúdo duplicado).`));
    }
  }

  // 6) expressões excessivamente repetidas (4-gramas)
  const gramCount = new Map<string, number>();
  for (const c of chapters) {
    const w = wordsOf(textOf(c));
    for (let i = 0; i + 4 <= w.length; i++) {
      const g = w.slice(i, i + 4);
      if (g.filter(x => STOP.has(x)).length >= 3) continue;
      const k = g.join(' ');
      gramCount.set(k, (gramCount.get(k) || 0) + 1);
    }
  }
  [...gramCount.entries()].filter(([, c]) => c >= 6).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .forEach(([g, c]) => findings.push(pend(-1, 'repeticao', `Expressão repetida ${c}× no livro: "${g}".`)));

  // 7) variantes de nome (possível erro de digitação/continuidade) — nunca altera automaticamente
  const names = Object.keys({ ...registry.characters, ...registry.locations });
  const seenPair = new Set<string>();
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i], b = names[j];
      const na = normWord(a), nb = normWord(b);
      if (na.length < 4 || nb.length < 4 || na === nb) {
        if (na === nb && a !== b && !seenPair.has(na)) {
          seenPair.add(na);
          findings.push(pend(-1, 'continuidade', `O nome aparece com grafias diferentes: "${a}" e "${b}" (acentuação) — padronizar?`));
        }
        continue;
      }
      if (levenshtein(na, nb, 1) <= 1 && stripAccents(a[0]).toLowerCase() === stripAccents(b[0]).toLowerCase()) {
        findings.push(pend(-1, 'continuidade', `Nomes muito parecidos: "${a}" e "${b}" — pode ser o mesmo personagem/local escrito de formas diferentes.`));
      }
    }
  }

  // 8) contradições via IA (uma chamada com registro + início/fim de cada capítulo)
  let aiVerified = false;
  if (ai) {
    const summary = chapters.map(c => {
      const t = textOf(c);
      return `CAP ${c.index + 1} "${c.title}": INÍCIO: ${t.slice(0, 450)} … FIM: ${t.slice(-450)}`;
    }).join('\n').slice(0, 22000);
    const prompt = `Você é um revisor de continuidade. Com base no REGISTRO e nos trechos (início/fim de cada capítulo) do livro "${input.bookTitle}", aponte APENAS contradições objetivas (personagem que morre e reaparece, mudança de nome, idade/lugar/data incompatíveis, fato revelado e depois negado). Não invente; se não houver, devolva lista vazia.
REGISTRO: ${JSON.stringify({ personagens: registry.characters, locais: Object.keys(registry.locations), fatos: registry.revealed.slice(-20), estados: registry.chapterEndStates })}
TRECHOS:
${summary}
Responda APENAS JSON: {"contradicoes":[{"capitulos":[1,2],"descricao":""}]}`;
    try {
      const resp = await ai(prompt, { temperature: 0.1, maxTokens: 4096 });
      const j = extractJson(resp.texto);
      if (j && Array.isArray(j.contradicoes)) {
        aiVerified = true;
        for (const c of j.contradicoes.slice(0, 12)) {
          const caps: number[] = Array.isArray(c?.capitulos) ? c.capitulos.map((x: any) => Number(x) - 1).filter((x: number) => x >= 0) : [];
          findings.push(pend(caps[0] ?? -1, 'continuidade', `Possível contradição (caps ${caps.map(x => x + 1).join(', ') || '?'}): ${String(c?.descricao || '')}`));
        }
        notes.push(`Revisão de contradições por IA concluída (${j.contradicoes.length} apontamento(s)).`);
      } else {
        notes.push('NÃO FOI POSSÍVEL VERIFICAR contradições via IA: resposta fora do formato esperado.');
      }
    } catch (e: any) {
      notes.push(`NÃO FOI POSSÍVEL VERIFICAR contradições via IA: ${String(e?.message || e).slice(0, 120)}`);
    }
  } else {
    notes.push('NÃO FOI POSSÍVEL VERIFICAR contradições semânticas: IA não disponível. Apenas verificações locais foram executadas.');
  }

  return {
    result: { executedAt: Date.now(), aiVerified, autoChanges, findings, notes },
    newTexts,
  };
}
