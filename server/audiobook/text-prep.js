// ================================================================
// AUDIOBOOK STUDIO — PREPARO DO TEXTO PARA NARRAÇÃO
// - Preserva integralmente o conteúdo (não resume, não reescreve)
// - Remove apenas marcações visuais (markdown, emojis) que a voz leria
// - Divide em partes que NUNCA cortam palavras nem frases
// ================================================================

import { createHash } from 'node:crypto';
import { resolveLanguage } from './languages.js';

const ABBREVIATIONS = new Set([
  'sr', 'sra', 'srta', 'dr', 'dra', 'prof', 'profa', 'eng', 'exmo', 'exma', 'ilmo', 'ilma',
  'av', 'etc', 'ex', 'cap', 'pág', 'pag', 'vol', 'art', 'nº', 'no', 'mr', 'mrs', 'ms', 'st', 'jr',
  'vs', 'inc', 'ltd', 'co', 'cia', 'm', 'mme', 'mlle', 'hr', 'fr', 'sig', 'dott', 'ing'
]);

/** Remove marcações visuais e prepara o texto para a voz, sem alterar as palavras. */
export function prepareNarrationText(raw) {
  let text = String(raw ?? '').replace(/\r\n?/g, '\n');

  // blocos de código e HTML
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/<[^>]+>/g, ' ');
  // imagens e links: mantém apenas o texto visível
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // divisores de cena (---, ***, ___) viram quebra de parágrafo
  text = text.replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, '\n');

  const lines = text.split('\n').map((line) => {
    let l = line.trim();
    if (!l) return '';
    const heading = /^#{1,6}\s+/.test(l);
    l = l.replace(/^#{1,6}\s+/, '');
    l = l.replace(/^>+\s?/, '');
    l = l.replace(/^[-*•]\s+/, '');
    // ênfases markdown
    l = l.replace(/(\*\*|__)(.+?)\1/g, '$2');
    l = l.replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, '$1$2');
    l = l.replace(/[*_`~]+/g, '');
    // travessão de diálogo no início da fala vira pausa natural (sem alterar palavras)
    l = l.replace(/^[—–-]\s*/, '');
    // travessão no meio da frase vira vírgula (pausa rítmica na oração)
    l = l.replace(/\s+[—–]\s+/g, ', ');
    // emojis e símbolos que a voz leria em voz alta
    l = l.replace(/[\p{Extended_Pictographic}\u200d\ufe0f✓✔✗✘•▪■□▶►]/gu, '');
    l = l.replace(/\s{2,}/g, ' ').trim();
    if (heading && l && !/[.!?…:]$/.test(l)) l += '.';
    return l;
  });

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function endsWithAbbreviation(fragment) {
  const m = /(\p{L}+)\.$/u.exec(fragment.trim());
  if (!m) return false;
  const word = m[1];
  if (word.length === 1) return true; // inicial: "J. Silva"
  return ABBREVIATIONS.has(word.toLowerCase());
}

/** Divide um parágrafo em frases, sem quebrar em abreviações comuns. */
export function splitSentences(paragraph) {
  const parts = String(paragraph)
    .split(/(?<=[.!?…]["”')\]]*)\s+(?=[\p{Lu}"“'(¿¡\d—–-])/u)
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = [];
  for (const part of parts) {
    const prev = merged[merged.length - 1];
    if (prev && endsWithAbbreviation(prev)) merged[merged.length - 1] = `${prev} ${part}`;
    else merged.push(part);
  }
  return merged;
}

/** Quebra uma frase gigante em cláusulas (vírgula/ponto e vírgula) e, por último, em palavras. Nunca corta uma palavra. */
function splitLongSentence(sentence, maxChars) {
  const pieces = [];
  const clauses = sentence.split(/(?<=[,;:])\s+/);
  let current = '';
  const flush = () => {
    if (current) pieces.push(current);
    current = '';
  };
  for (const clause of clauses) {
    if (clause.length > maxChars) {
      flush();
      let buf = '';
      for (const word of clause.split(/\s+/)) {
        if (buf && buf.length + 1 + word.length > maxChars) {
          pieces.push(buf);
          buf = word;
        } else {
          buf = buf ? `${buf} ${word}` : word;
        }
      }
      if (buf) current = buf;
      continue;
    }
    if (current && current.length + 1 + clause.length > maxChars) flush();
    current = current ? `${current} ${clause}` : clause;
  }
  flush();
  return pieces;
}

/**
 * Divide o texto em partes de até `maxChars`, preservando fronteiras de parágrafo (\n\n)
 * e frases para garantir que os motores de voz respeitem pausas de respiração naturais.
 */
export function splitIntoChunks(text, maxChars = 2400) {
  const limit = Math.max(120, Math.floor(maxChars));
  const rawText = String(text ?? '').trim();
  if (!rawText) return [];

  // Se o texto não possui quebras de parágrafo (parágrafo único)
  const isSingleParagraph = !rawText.includes('\n');
  if (isSingleParagraph) {
    const sentences = [];
    for (const s of splitSentences(rawText)) {
      if (s.length > limit) sentences.push(...splitLongSentence(s, limit));
      else sentences.push(s);
    }
    const chunks = [];
    let current = '';
    for (const s of sentences) {
      if (current && current.length + 1 + s.length > limit) {
        chunks.push(current);
        current = s;
      } else {
        current = current ? `${current} ${s}` : s;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  // Texto com múltiplos parágrafos: divide por parágrafos e preserva \n\n
  const paragraphs = rawText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const processedParagraphs = [];
  for (const p of paragraphs) {
    if (p.length <= limit) {
      processedParagraphs.push(p);
    } else {
      // Parágrafo longo precisa ser dividido em frases
      const sents = [];
      for (const s of splitSentences(p)) {
        if (s.length > limit) sents.push(...splitLongSentence(s, limit));
        else sents.push(s);
      }
      let currentSentenceGroup = '';
      for (const s of sents) {
        if (currentSentenceGroup && currentSentenceGroup.length + 1 + s.length > limit) {
          processedParagraphs.push(currentSentenceGroup);
          currentSentenceGroup = s;
        } else {
          currentSentenceGroup = currentSentenceGroup ? `${currentSentenceGroup} ${s}` : s;
        }
      }
      if (currentSentenceGroup) processedParagraphs.push(currentSentenceGroup);
    }
  }

  const chunks = [];
  let current = '';
  for (const p of processedParagraphs) {
    if (current && current.length + 2 + p.length > limit) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export const sha1 = (value) => createHash('sha1').update(String(value)).digest('hex');

const CHAPTER_PREFIX = /^\s*(cap[ií]tulo|chapter|chapitre|kapitel|capitolo)\s*\d+/i;

const pad2 = (n) => String(n).padStart(2, '0');

const slugify = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

/**
 * Converte o manuscrito em unidades de narração:
 *   01-introducao.mp3, 02-capitulo-01.mp3, 03-capitulo-02.mp3 ...
 */
export function buildNarrationUnits(manuscript, languageInput) {
  const lang = resolveLanguage(languageInput) || resolveLanguage('pt-BR');
  const w = lang.words;
  const title = String(manuscript.title ?? '').trim();
  const subtitle = String(manuscript.subtitle ?? '').trim();
  const author = String(manuscript.author ?? '').trim();
  const preface = prepareNarrationText(manuscript.preface ?? '');

  const introParts = [];
  if (title) introParts.push(/[.!?…]$/.test(title) ? title : `${title}.`);
  if (subtitle) introParts.push(/[.!?…]$/.test(subtitle) ? subtitle : `${subtitle}.`);
  if (author) introParts.push(`${w.by} ${author}.`);
  let introText = introParts.join('\n\n');
  if (preface) introText += `\n\n${w.preface}.\n\n${preface}`;
  const narratorVoiceId = String(manuscript.narratorVoiceId || '').trim() || null;

  const units = [];
  let order = 1;
  const bookTitle = title || 'Livro';
  units.push({
    index: 0,
    kind: 'intro',
    id: `${pad2(order)}-introducao`,
    file: `${pad2(order)}-introducao.mp3`,
    label: 'Introdução',
    title: bookTitle,
    text: introText,
    segments: narratorVoiceId ? [{ text: introText, voiceId: narratorVoiceId }] : null,
    hash: narratorVoiceId ? sha1(JSON.stringify([{ text: introText, voiceId: narratorVoiceId }])) : sha1(introText)
  });

  (manuscript.chapters || []).forEach((chapter, i) => {
    order += 1;
    const chapterNumber = i + 1;
    const chTitle = String(chapter.title ?? '').trim();
    const heading = !chTitle
      ? `${w.chapter} ${chapterNumber}.`
      : CHAPTER_PREFIX.test(chTitle)
        ? /[.!?…]$/.test(chTitle) ? chTitle : `${chTitle}.`
        : `${w.chapter} ${chapterNumber}. ${/[.!?…]$/.test(chTitle) ? chTitle : `${chTitle}.`}`;
    const rawSegments = Array.isArray(chapter.speakerSegments) ? chapter.speakerSegments : [];
    const narratorVoiceId =
      rawSegments.find((segment) => String(segment.speakerId || '').toLowerCase() === 'narrator')?.voiceId || null;
    const segments = rawSegments.length > 0
      ? [
          { text: heading, voiceId: narratorVoiceId },
          ...rawSegments
            .map((segment) => ({
              text: prepareNarrationText(segment.text),
              voiceId: String(segment.voiceId || '').trim() || null
            }))
            .filter((segment) => segment.text)
        ]
      : null;
    const body = prepareNarrationText(chapter.text ?? '');
    const text = body ? `${heading}\n\n${body}` : heading;
    const cleanTitle = chTitle.replace(CHAPTER_PREFIX, '').replace(/^[\s:.\-–—]+/, '').trim() || chTitle || `Capítulo ${chapterNumber}`;
    units.push({
      index: units.length,
      kind: 'chapter',
      chapterNumber,
      id: `${pad2(order)}-capitulo-${pad2(chapterNumber)}`,
      file: `${pad2(order)}-capitulo-${pad2(chapterNumber)}.mp3`,
      label: `Capítulo ${chapterNumber}`,
      title: cleanTitle,
      slug: slugify(chTitle || `capitulo-${chapterNumber}`),
      text: segments ? segments.map((segment) => segment.text).join('\n\n') : text,
      segments,
      hash: segments ? sha1(JSON.stringify(segments)) : sha1(text)
    });
  });

  return units;
}
