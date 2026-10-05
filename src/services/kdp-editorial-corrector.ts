// ================================================================
// CORRETOR EDITORIAL CAPÍTULO A CAPÍTULO
// Regras determinísticas + IA em blocos + validação rígida contra
// resumo/invenção/perda de texto + relatório de alterações REAIS (diff).
// ================================================================
import type {
  ChapterStatus,
  ContinuityRegistry,
  CorrectionChange,
  PendingItem,
} from '../types/editorial-correction';
import { applyDeterministicFixes, countOccurrences } from './editorial-rules';
import {
  classifyHunk,
  levenshtein,
  normText,
  normWord,
  splitParagraphs,
  tokensToDisplay,
  wordDiff,
  wordsOf,
} from './editorial-text-utils';

// ---------------------------------------------------------------
// IA injetável
// ---------------------------------------------------------------
export interface AiCallOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
}
export type AiCall = (prompt: string, opts?: AiCallOptions) => Promise<{ texto: string; modelo: string }>;

/** adaptador padrão: cascata de modelos Gemini já existente no projeto */
export async function defaultAiCall(prompt: string, opts: AiCallOptions = {}): Promise<{ texto: string; modelo: string }> {
  const { chamarGeminiTexto } = await import('./kdp-ai-engine');
  return chamarGeminiTexto(prompt, {
    temperature: opts.temperature ?? 0.2,
    maxTokens: opts.maxTokens ?? 2500,
    maxRetries: 2,
    systemInstruction: opts.system,
  });
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

export interface CorrectorConfig {
  blockChars: number;
  maxAiAttempts: number;
  maxValidationRetries: number;
  retryDelayMs: number;
  dialogueHyphen: boolean;
  portuguese: boolean;
}

export const DEFAULT_CORRECTOR_CONFIG: CorrectorConfig = {
  blockChars: 6000,
  maxAiAttempts: 4,
  maxValidationRetries: 2,
  retryDelayMs: 3000,
  dialogueHyphen: true,
  portuguese: true,
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------
// BLOCOS
// ---------------------------------------------------------------
export interface TextBlock {
  text: string;
  /** como este bloco se liga ao anterior ao reunir */
  sep: '' | '\n\n' | ' ';
}

export function splitIntoBlocks(text: string, maxChars = 6000): TextBlock[] {
  const paras = (text || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const blocks: TextBlock[] = [];
  let cur: string[] = [];
  let curLen = 0;
  const flush = () => {
    if (cur.length) {
      blocks.push({ text: cur.join('\n\n'), sep: blocks.length === 0 ? '' : '\n\n' });
      cur = [];
      curLen = 0;
    }
  };
  for (const p of paras) {
    if (p.length > maxChars) {
      flush();
      const sentences = p.split(/(?<=[.!?…])\s+/);
      let piece = '';
      let first = true;
      const emit = () => {
        if (!piece) return;
        blocks.push({ text: piece, sep: blocks.length === 0 ? '' : first ? '\n\n' : ' ' });
        first = false;
        piece = '';
      };
      for (const s of sentences) {
        if ((piece + ' ' + s).length > maxChars && piece) emit();
        piece = piece ? piece + ' ' + s : s;
      }
      emit();
      continue;
    }
    if (curLen + p.length + 2 > maxChars && cur.length) flush();
    cur.push(p);
    curLen += p.length + 2;
  }
  flush();
  return blocks;
}

export function joinBlocks(blocks: { text: string; sep: string }[]): string {
  return blocks.map((b, i) => (i === 0 ? b.text : b.sep + b.text)).join('');
}

// ---------------------------------------------------------------
// VALIDAÇÃO DO BLOCO CORRIGIDO PELA IA
// ---------------------------------------------------------------
export interface BlockValidation {
  ok: boolean;
  notes: string[];
}

function properNames(text: string): string[] {
  const names: string[] = [];
  const re = /(?<=[\p{Ll},;] )(\p{Lu}\p{L}{2,})/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) names.push(normWord(m[1]));
  return names;
}

export function validateCorrectedBlock(original: string, corrected: string): BlockValidation {
  const notes: string[] = [];
  const o = original.trim();
  const c = corrected.trim();
  if (!c) return { ok: false, notes: ['resposta vazia'] };

  if (/<<<|>>>/.test(c)) notes.push('marcadores de formato vazaram para o texto');
  if (/^(aqui est|segue|claro[,!]|certo[,!]|ok[,!]|texto corrigido|com certeza|vou )/i.test(c)) notes.push('contém preâmbulo/comentário da IA');
  if (/```|\*\*/.test(c) && !/```|\*\*/.test(o)) notes.push('contém formatação markdown inexistente no original');

  const ratio = c.length / Math.max(1, o.length);
  if (ratio < 0.85) notes.push(`texto ${(100 - ratio * 100).toFixed(0)}% menor que o original (possível resumo/corte)`);
  if (ratio > 1.2) notes.push(`texto ${(ratio * 100 - 100).toFixed(0)}% maior que o original (possível acréscimo)`);

  const wo = wordsOf(o);
  const wc = wordsOf(c);
  const so = new Set(wo);
  const sc = new Set(wc);
  let inter = 0;
  so.forEach(w => { if (sc.has(w)) inter++; });
  const jac = inter / Math.max(1, so.size + sc.size - inter);
  if (jac < 0.88) notes.push(`vocabulário diverge do original (similaridade ${(jac * 100).toFixed(0)}%)`);

  // números e datas preservados
  const numsO = o.match(/\d+(?:[.,]\d+)*/g) || [];
  const numsC = c.match(/\d+(?:[.,]\d+)*/g) || [];
  const poolC = [...numsC];
  const lostNums = numsO.filter(n => { const i = poolC.indexOf(n); if (i >= 0) { poolC.splice(i, 1); return false; } return true; });
  if (lostNums.length > 0) notes.push(`números alterados/perdidos: ${lostNums.slice(0, 5).join(', ')}`);

  // nomes próprios preservados
  const namesO = properNames(o);
  if (namesO.length >= 3) {
    const normC = normText(c);
    const missing = namesO.filter(n => !normC.split(' ').includes(n));
    if (missing.length / namesO.length > 0.05) notes.push(`nomes próprios alterados/perdidos: ${[...new Set(missing)].slice(0, 5).join(', ')}`);
  }

  // estrutura de parágrafos
  const po = splitParagraphs(o).length;
  const pc = splitParagraphs(c).length;
  if (po >= 4 && (pc < po * 0.75 || pc > po * 1.3)) notes.push(`nº de parágrafos mudou de ${po} para ${pc}`);

  // final do texto preservado (não truncou)
  const tailO = wo.slice(-4).join(' ');
  const tailC = wc.slice(-6).join(' ');
  if (wo.length > 20 && !tailC.includes(wo[wo.length - 1])) notes.push('o final do bloco não foi preservado (possível truncamento)');
  void tailO;

  return { ok: notes.length === 0, notes };
}

// ---------------------------------------------------------------
// PROMPTS
// ---------------------------------------------------------------
export const CORRECTOR_SYSTEM = `Você é um revisor/preparador editorial profissional de língua portuguesa (pt-BR), com anos de experiência em livros para Amazon KDP.

REGRAS ABSOLUTAS:
1. Corrija SOMENTE: ortografia, acentuação, gramática (concordância, regência, crase, tempos verbais incoerentes), pontuação, maiúsculas/minúsculas, paragrafação, formatação de diálogos com travessão (—) e repetições desnecessárias/improvisadas imediatas.
2. NÃO resuma. NÃO corte. NÃO acrescente fatos, personagens, falas, cenas, explicações ou informações novas.
3. NÃO altere nomes próprios, números, datas, locais, a ordem dos acontecimentos nem o sentido de nenhuma frase.
4. Preserve a voz narrativa, o tom, o estilo e o tempo verbal do autor. Só reescreva uma frase se ela estiver realmente ininteligível, mantendo o mesmo conteúdo.
5. Mantenha o MESMO número de parágrafos (parágrafos separados por uma linha em branco). Só junte parágrafos se uma frase estiver evidentemente cortada ao meio.
6. Se não tiver certeza de que algo é um erro, deixe exatamente como está.
7. Devolva o TEXTO INTEGRAL do bloco recebido, do início ao fim, sem omitir nada.
8. NÃO escreva comentários, saudações, títulos novos, markdown (**, #, \`\`\`) nem explicações fora do formato pedido.

FORMATO DE RESPOSTA (obrigatório):
<<<TEXTO>>>
(texto integral corrigido)
<<<FIM>>>
<<<NOTAS>>>
[{"de":"trecho original curto","para":"trecho corrigido curto","motivo":"motivo curto"}]
<<<FIMNOTAS>>>`;

export interface BlockPromptContext {
  bookTitle: string;
  genre: string;
  language: string;
  chapterIndex: number;
  chapterTitle: string;
  blockNumber: number;
  blockTotal: number;
  canonicalNames: string[];
  previousTail?: string;
  strictReasons?: string[];
}

export function buildBlockPrompt(block: string, ctx: BlockPromptContext): string {
  const lines: string[] = [];
  lines.push(`LIVRO: "${ctx.bookTitle}" · Gênero: ${ctx.genre || 'não informado'} · Idioma: ${ctx.language || 'pt-BR'}`);
  lines.push(`CAPÍTULO ${ctx.chapterIndex + 1}: "${ctx.chapterTitle}" — bloco ${ctx.blockNumber} de ${ctx.blockTotal}`);
  if (ctx.canonicalNames.length) {
    lines.push(`GRAFIA CANÔNICA DE NOMES (NÃO altere nem "corrija" estes nomes): ${ctx.canonicalNames.slice(0, 40).join(', ')}`);
  }
  if (ctx.previousTail) {
    lines.push(`FINAL DO BLOCO ANTERIOR (apenas contexto de leitura — NÃO reescreva nem inclua na resposta):\n"${ctx.previousTail}"`);
  }
  if (ctx.strictReasons && ctx.strictReasons.length) {
    lines.push(`ATENÇÃO: sua resposta anterior foi REJEITADA pelos motivos: ${ctx.strictReasons.join('; ')}. Devolva o texto COMPLETO, com praticamente o mesmo tamanho, apenas com correções pontuais. Não resuma, não acrescente nada.`);
  }
  lines.push('TEXTO A REVISAR (devolva integralmente, corrigido, no formato exigido):');
  lines.push(block);
  return lines.join('\n\n');
}

export interface ParsedAiBlock {
  text: string;
  notes: { de: string; para: string; motivo: string }[];
}

export function parseAiBlock(raw: string): ParsedAiBlock | null {
  const s = (raw || '').replace(/\r\n?/g, '\n');
  const start = s.indexOf('<<<TEXTO>>>');
  const end = s.indexOf('<<<FIM>>>');
  if (start < 0 || end < 0 || end <= start) return null;
  let text = s.slice(start + '<<<TEXTO>>>'.length, end).trim();
  text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
  const notes: ParsedAiBlock['notes'] = [];
  const ns = s.indexOf('<<<NOTAS>>>');
  if (ns >= 0) {
    const ne = s.indexOf('<<<FIMNOTAS>>>', ns);
    const jsonStr = s.slice(ns + '<<<NOTAS>>>'.length, ne > 0 ? ne : undefined).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try {
      const arr = JSON.parse(jsonStr);
      if (Array.isArray(arr)) {
        for (const n of arr) {
          if (n && typeof n === 'object') notes.push({ de: String(n.de ?? ''), para: String(n.para ?? ''), motivo: String(n.motivo ?? '') });
        }
      }
    } catch { /* notas são opcionais */ }
  }
  return { text, notes };
}

// ---------------------------------------------------------------
// DIFF → ALTERAÇÕES REAIS
// ---------------------------------------------------------------
export function diffToChanges(
  before: string,
  after: string,
  chapterIndex: number,
  source: CorrectionChange['source'],
  notes: ParsedAiBlock['notes'] = [],
  idPrefix = 'd',
): CorrectionChange[] {
  const hunks = wordDiff(before, after);
  const out: CorrectionChange[] = [];
  hunks.forEach((h, i) => {
    const cls = classifyHunk(h.removed, h.added);
    const addedText = tokensToDisplay(h.added);
    const note = notes.find(n => n.para && n.motivo && (addedText.includes(n.para) || n.para.includes(addedText)) && addedText.length > 0);
    out.push({
      id: `${idPrefix}${chapterIndex}-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      chapterIndex,
      original: tokensToDisplay([...h.before, ...h.removed, ...h.after]),
      corrected: tokensToDisplay([...h.before, ...h.added, ...h.after]),
      type: cls.type,
      reason: note?.motivo ? `${cls.reason} — ${note.motivo}` : cls.reason,
      resolution: cls.meaningChange ? 'PENDENTE_VALIDACAO_AUTOR' : 'CORRIGIDO_AUTOMATICAMENTE',
      source,
      occurrences: 1,
    });
  });
  return out;
}

// ---------------------------------------------------------------
// CHAMADA À IA COM RETRY
// ---------------------------------------------------------------
async function callWithRetry(
  ai: AiCall,
  prompt: string,
  opts: AiCallOptions,
  cfg: CorrectorConfig,
  shouldStop?: () => boolean,
  onStatus?: (m: string) => void,
): Promise<{ texto: string; modelo: string }> {
  let lastErr = '';
  for (let attempt = 1; attempt <= cfg.maxAiAttempts; attempt++) {
    if (shouldStop?.()) throw new Error('INTERROMPIDO');
    try {
      return await ai(prompt, opts);
    } catch (e: any) {
      lastErr = e?.message || String(e);
      if (attempt < cfg.maxAiAttempts) {
        onStatus?.(`IA indisponível (${lastErr.slice(0, 80)}). Nova tentativa ${attempt + 1}/${cfg.maxAiAttempts}…`);
        await sleep(cfg.retryDelayMs * attempt);
      }
    }
  }
  throw new AiUnavailableError(lastErr || 'IA indisponível');
}

// ---------------------------------------------------------------
// CORREÇÃO DE UM CAPÍTULO
// ---------------------------------------------------------------
export interface ChapterCorrectionInput {
  bookTitle: string;
  genre: string;
  language: string;
  chapterIndex: number;
  title: string;
  text: string;
  registry: ContinuityRegistry;
}

export interface ChapterCorrectionOutcome {
  correctedText: string;
  changes: CorrectionChange[];
  pendings: PendingItem[];
  status: Extract<ChapterStatus, 'corrigido_salvo' | 'pendente_autor'>;
  aiVerified: boolean;
  model?: string;
  blocks: number;
  errorsFound: number;
  errorsFixed: number;
  validation: { ok: boolean; notes: string[] };
}

/** remove do início do texto um título duplicado (ex.: "Capítulo 2" ou o próprio título repetido) */
export function stripLeadingTitleDuplicate(text: string, title: string, chapterIndex: number): { text: string; change?: CorrectionChange } {
  const paras = text.split(/\n{2,}/);
  const first = (paras[0] || '').trim();
  if (!first || first.length > 160) return { text };
  const nf = normText(first);
  const nt = normText(title);
  const isHeading = /^cap[ií]tulo\s+(\d+|[ivxlc]+|um|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\b[\s:.\-–—]*(.*)$/i.exec(first);
  const duplicate = (nt && (nf === nt || nf.endsWith(' ' + nt) && /^cap/.test(nf))) || (isHeading && (!isHeading[2] || normText(isHeading[2]) === nt));
  if (!duplicate) return { text };
  return {
    text: paras.slice(1).join('\n\n').trimStart(),
    change: {
      id: `t${chapterIndex}-${Date.now().toString(36)}`,
      chapterIndex,
      original: first,
      corrected: '(removido — o título já é impresso no cabeçalho do capítulo)',
      type: 'titulo',
      reason: 'Título duplicado no início do texto do capítulo removido para evitar repetição no PDF',
      resolution: 'CORRIGIDO_AUTOMATICAMENTE',
      source: 'regras',
      occurrences: 1,
    },
  };
}

export async function correctChapter(
  input: ChapterCorrectionInput,
  ai: AiCall | null,
  cfgIn: Partial<CorrectorConfig> = {},
  hooks: { onStatus?: (m: string) => void; shouldStop?: () => boolean } = {},
): Promise<ChapterCorrectionOutcome> {
  const cfg = { ...DEFAULT_CORRECTOR_CONFIG, ...cfgIn };
  const changes: CorrectionChange[] = [];
  const pendings: PendingItem[] = [];
  const idx = input.chapterIndex;

  // 0) título duplicado no corpo
  const stripped = stripLeadingTitleDuplicate(input.text, input.title, idx);
  if (stripped.change) changes.push(stripped.change);

  // 1) regras determinísticas
  const rules = applyDeterministicFixes(stripped.text, idx, { dialogueHyphen: cfg.dialogueHyphen, portuguese: cfg.portuguese });
  changes.push(...rules.changes);
  pendings.push(...rules.pendings);
  const ruleOccurrences = countOccurrences(rules.changes);

  // 2) IA em blocos
  const blocks = splitIntoBlocks(rules.text, cfg.blockChars);
  const outBlocks: { text: string; sep: string }[] = [];
  let aiVerifiedBlocks = 0;
  let model: string | undefined;
  const canonicalNames = [
    ...Object.keys(input.registry.characters),
    ...Object.keys(input.registry.locations),
  ];
  const validationNotes: string[] = [];

  for (let b = 0; b < blocks.length; b++) {
    if (hooks.shouldStop?.()) throw new Error('INTERROMPIDO');
    const blk = blocks[b];
    hooks.onStatus?.(`Capítulo ${idx + 1}: revisando bloco ${b + 1}/${blocks.length}…`);
    if (!ai || blk.text.length < 25) {
      outBlocks.push({ text: blk.text, sep: blk.sep });
      if (!ai) continue;
      aiVerifiedBlocks++;
      continue;
    }
    let accepted: ParsedAiBlock | null = null;
    let reasons: string[] = [];
    for (let v = 0; v <= cfg.maxValidationRetries; v++) {
      const prompt = buildBlockPrompt(blk.text, {
        bookTitle: input.bookTitle,
        genre: input.genre,
        language: input.language,
        chapterIndex: idx,
        chapterTitle: input.title,
        blockNumber: b + 1,
        blockTotal: blocks.length,
        canonicalNames,
        previousTail: b > 0 ? outBlocks[b - 1].text.slice(-220) : undefined,
        strictReasons: v > 0 ? reasons : undefined,
      });
      const resp = await callWithRetry(ai, prompt, { system: CORRECTOR_SYSTEM, temperature: v === 0 ? 0.2 : 0.1, maxTokens: 2500 }, cfg, hooks.shouldStop, hooks.onStatus);
      model = resp.modelo;
      const parsed = parseAiBlock(resp.texto);
      if (!parsed) { reasons = ['formato inválido (faltam marcadores <<<TEXTO>>> / <<<FIM>>>)']; continue; }
      // reaplica regras (idempotentes) para padronizar formato da saída da IA
      const norm = applyDeterministicFixes(parsed.text, idx, { dialogueHyphen: cfg.dialogueHyphen, portuguese: cfg.portuguese });
      const val = validateCorrectedBlock(blk.text, norm.text);
      if (val.ok) { accepted = { text: norm.text, notes: parsed.notes }; break; }
      reasons = val.notes;
    }
    if (accepted) {
      aiVerifiedBlocks++;
      const diff = diffToChanges(blk.text, accepted.text, idx, 'ia', accepted.notes);
      changes.push(...diff);
      outBlocks.push({ text: accepted.text, sep: blk.sep });
    } else {
      outBlocks.push({ text: blk.text, sep: blk.sep }); // mantém texto corrigido só por regras
      validationNotes.push(`bloco ${b + 1}: ${reasons.join('; ')}`);
      pendings.push({
        id: `ia${idx}-${b}-${Date.now().toString(36)}`,
        chapterIndex: idx,
        kind: 'ia',
        description: `Bloco ${b + 1}/${blocks.length} NÃO foi revisado pela IA: todas as respostas foram rejeitadas pela validação anti-alucinação (${reasons.join('; ')}). Apenas as regras automáticas foram aplicadas.`,
        snippet: blk.text.slice(0, 120),
        resolution: 'NAO_FOI_POSSIVEL_VERIFICAR',
      });
    }
  }

  const correctedText = joinBlocks(outBlocks);

  // 3) pendências geradas por mudanças de sentido (do diff)
  for (const c of changes) {
    if (c.resolution === 'PENDENTE_VALIDACAO_AUTOR') {
      pendings.push({
        id: `p-${c.id}`,
        chapterIndex: idx,
        kind: 'sentido',
        description: 'A IA alterou palavras de conteúdo — confirme que o sentido original foi mantido.',
        snippet: `${c.original}  →  ${c.corrected}`,
        resolution: 'PENDENTE_VALIDACAO_AUTOR',
      });
    }
  }

  // 4) verificação final de integridade do capítulo inteiro
  const finalVal = validateCorrectedBlock(rules.text, correctedText);
  if (!finalVal.ok) validationNotes.push(...finalVal.notes.map(n => `capítulo: ${n}`));

  const fixedByAi = changes.filter(c => c.source === 'ia' && c.resolution === 'CORRIGIDO_AUTOMATICAMENTE').length;
  const errorsFixed = ruleOccurrences + fixedByAi + (stripped.change ? 1 : 0);
  const authorPendings = pendings.filter(p => p.resolution !== 'CORRIGIDO_AUTOMATICAMENTE');
  const allAi = !!ai && aiVerifiedBlocks === blocks.length;

  return {
    correctedText,
    changes,
    pendings,
    status: authorPendings.length > 0 || !allAi ? 'pendente_autor' : 'corrigido_salvo',
    aiVerified: allAi,
    model,
    blocks: blocks.length,
    errorsFound: errorsFixed + authorPendings.length,
    errorsFixed,
    validation: { ok: validationNotes.length === 0 && finalVal.ok, notes: validationNotes },
  };
}

/** utilitário: variantes quase idênticas de um mesmo nome (distância 1) */
export function nameVariants(names: Record<string, number>): [string, string][] {
  const list = Object.keys(names).filter(n => n.length >= 4);
  const out: [string, string][] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (levenshtein(a, b, 1) <= 1 && a !== b) out.push([a, b]);
    }
  }
  return out;
}
