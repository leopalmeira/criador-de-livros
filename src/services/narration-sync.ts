// ============================================================================
// SINCRONIZAÇÃO TEXTO ↔ NARRAÇÃO (ACOMPANHAMENTO DE LEITURA ESTILO KARAOKÊ)
// BookEngin — Divide o capítulo em segmentos de fala mapeados exatamente aos
// parágrafos exibidos no Livro Diagramado, permitindo destacar e rolar o texto
// conforme a voz neural avança.
// ============================================================================

import { coAuthorVoiceService } from './coauthor-voice-service';

/** Segmento de narração com posição exata dentro do parágrafo exibido */
export interface NarrationSegment {
  /** Índice do parágrafo exibido (-1 = cabeçalho "Capítulo N: Título") */
  paragraphIndex: number;
  /** Offset inicial (inclusivo) dentro do texto exibido do parágrafo */
  start: number;
  /** Offset final (exclusivo) dentro do texto exibido do parágrafo */
  end: number;
  /** Texto exatamente como aparece na tela */
  displayText: string;
  /** Texto higienizado enviado ao motor de voz */
  speechText: string;
}

const MAX_SEGMENT_CHARS = 220;
const HARD_SPLIT_CHARS = 280;

/**
 * Divide o texto do capítulo nos mesmos parágrafos renderizados no Livro Diagramado.
 * IMPORTANTE: deve permanecer idêntico à lógica de renderização para que os índices batam.
 */
export function splitChapterParagraphs(texto: string): string[] {
  if (!texto) return [];
  return texto.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
}

/** Retorna o texto visível de um parágrafo (cabeçalhos ### aparecem sem o marcador) */
export function getParagraphDisplayText(paragraph: string): string {
  return paragraph.startsWith('###') ? paragraph.replace(/^###\s*/, '').trim() : paragraph;
}

/** Quebra um texto em intervalos de frases [start, end) preservando offsets originais */
function sentenceRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  // Quebra por pontuação de fim de sentença completa (. ! ? … ; : ou travessão de diálogo com fala completa)
  const boundary = /[.!?…;:]+["'”»)\]]*\s+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = boundary.exec(text)) !== null) {
    const end = m.index + m[0].length;
    if (end > last) ranges.push([last, end]);
    last = end;
  }
  if (last < text.length) ranges.push([last, text.length]);

  // Frases excessivamente longas (sem pontuação final) são quebradas em vírgulas naturais
  const out: Array<[number, number]> = [];
  for (const [s, e] of ranges) {
    let cursor = s;
    while (e - cursor > HARD_SPLIT_CHARS) {
      const windowSlice = text.slice(cursor, cursor + MAX_SEGMENT_CHARS);
      let cut = windowSlice.lastIndexOf(', ');
      if (cut < 60) cut = windowSlice.lastIndexOf(' ');
      if (cut < 30) cut = MAX_SEGMENT_CHARS;
      const cutEnd = cursor + cut + 1;
      out.push([cursor, cutEnd]);
      cursor = cutEnd;
    }
    if (cursor < e) out.push([cursor, e]);
  }
  return out;
}

/** Divide o parágrafo em sentenças completas que preservam a cadência e emoção humana do narrador */
function segmentParagraph(text: string, paragraphIndex: number): NarrationSegment[] {
  const segments: NarrationSegment[] = [];
  let groupStart = -1;
  let groupEnd = -1;

  const flush = () => {
    if (groupStart < 0) return;
    const displayText = text.slice(groupStart, groupEnd);
    let speechText = coAuthorVoiceService.cleanTextForSpeech(displayText);
    if (speechText) {
      // Assegura que o trecho tenha pontuação de fala para prosódia humana perfeita
      if (!/[.!?…;:]$/.test(speechText.trim())) {
        speechText = `${speechText.trim()}.`;
      }
      segments.push({ paragraphIndex, start: groupStart, end: groupEnd, displayText, speechText });
    }
    groupStart = -1;
    groupEnd = -1;
  };

  for (const [s, e] of sentenceRanges(text)) {
    if (groupStart < 0) {
      groupStart = s;
      groupEnd = e;
    } else if (e - groupStart <= MAX_SEGMENT_CHARS) {
      // Agrupa apenas frases muito breves consecutivas (ex: "Sim.", "Ele concordou.")
      groupEnd = e;
    } else {
      flush();
      groupStart = s;
      groupEnd = e;
    }
  }
  flush();
  return segments;
}

/**
 * Constrói a sequência completa de segmentos de narração de um capítulo,
 * começando pelo cabeçalho "Capítulo N: Título" e seguindo parágrafo a parágrafo.
 */
export function buildChapterNarrationSegments(
  chapterNumber: number,
  chapterTitle: string,
  chapterText: string
): NarrationSegment[] {
  const segments: NarrationSegment[] = [];

  const header = `Capítulo ${chapterNumber}: ${chapterTitle || ''}`.trim();
  const headerSpeech = coAuthorVoiceService.cleanTextForSpeech(`${header}.`);
  if (headerSpeech) {
    segments.push({ paragraphIndex: -1, start: 0, end: header.length, displayText: header, speechText: headerSpeech });
  }

  splitChapterParagraphs(chapterText).forEach((p, idx) => {
    segments.push(...segmentParagraph(getParagraphDisplayText(p), idx));
  });

  return segments;
}

/**
 * Divide o segmento em palavras e retorna o índice da palavra correspondente
 * ao progresso (0..1) da fala, ponderado pelo tamanho de cada palavra.
 */
export function wordIndexForProgress(words: string[], progress: number): number {
  if (words.length === 0) return -1;
  const p = Math.min(1, Math.max(0, progress));
  const total = words.reduce((acc, w) => acc + w.length + 1, 0);
  const target = p * total;
  let acc = 0;
  for (let i = 0; i < words.length; i++) {
    acc += words[i].length + 1;
    if (acc >= target) return i;
  }
  return words.length - 1;
}

// ─── STORE LEVE DE PROGRESSO (FORA DO REACT PARA EVITAR RE-RENDER DO EDITOR INTEIRO) ───

export interface NarrationProgressState {
  active: boolean;
  paused: boolean;
  capIndex: number | null;
  segmentIndex: number;
  /** Progresso da fala dentro do segmento atual (0..1) */
  progress: number;
  segments: NarrationSegment[];
}

const INITIAL_STATE: NarrationProgressState = {
  active: false,
  paused: false,
  capIndex: null,
  segmentIndex: -1,
  progress: 0,
  segments: []
};

type Listener = () => void;

class NarrationProgressStore {
  private state: NarrationProgressState = INITIAL_STATE;
  private listeners = new Set<Listener>();

  getState = (): NarrationProgressState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  set(partial: Partial<NarrationProgressState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(l => l());
  }

  reset(): void {
    this.state = INITIAL_STATE;
    this.listeners.forEach(l => l());
  }

  /** Segmento sendo lido agora (ou null) */
  currentSegment(): NarrationSegment | null {
    const { active, segments, segmentIndex } = this.state;
    if (!active || segmentIndex < 0) return null;
    return segments[segmentIndex] || null;
  }
}

export const narrationProgressStore = new NarrationProgressStore();
