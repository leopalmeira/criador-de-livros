// ============================================================================
// BOOKENGIN — ESTRUTURA DE CAPÍTULOS (FONTE ÚNICA DE NUMERAÇÃO E TÍTULOS)
// O número do capítulo é gerenciado separadamente do texto do título.
// Sumário, PDF, EPUB e auditorias usam estes metadados estruturados — nunca
// a numeração eventualmente embutida no título gerado pela IA.
// ============================================================================

export type StructureLang = 'pt' | 'en' | 'es';

export interface StructuredChapterHeading {
  numero: number;
  /** Texto do título SEM numeração (ex.: "A Carta no Porão") */
  titulo: string;
  cleanTitle: string;
  /** Rótulo de exibição montado a partir dos campos estruturados */
  display: string;
  fullHeading: string;
  wasRepaired: boolean;
  issues: string[];
}
export type NormalizedChapterTitle = StructuredChapterHeading;

export interface ChapterStructureIssue {
  chapterIndex: number;
  type: 'numeracao_embutida' | 'titulo_incompleto' | 'titulo_vazio' | 'titulo_duplicado' | 'numero_duplicado' | 'titulo_truncado';
  severity: 'CRITICO' | 'ALTO' | 'MEDIO';
  description: string;
  original: string;
  suggested?: string;
}

const NUM_WORDS_PT = 'um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta';
const NUM_WORDS_EN = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty';
const NUM_WORDS_ES = 'uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez';

const NUMBER_TOKEN = `(?:\\d{1,3}|[ivxlc]{1,7}|(?:${NUM_WORDS_PT}|${NUM_WORDS_EN}|${NUM_WORDS_ES})(?:[\\s-]+(?:e|and|y)?[\\s-]*(?:${NUM_WORDS_PT}|${NUM_WORDS_EN}|${NUM_WORDS_ES}))?)`;
const PREFIX_RX = new RegExp(`^\\s*(?:cap[ií]tulo|cap\\.?|chapter|ch\\.?|parte|part)\\s*${NUMBER_TOKEN}?\\s*[:.\\-–—)]*\\s*`, 'i');
const BARE_NUMBER_RX = /^\s*(?:\d{1,3}|[IVXLC]{1,7})\s*[:.\-–—)]\s+/;

/** Palavras que nunca podem encerrar um título (conectivos, artigos, preposições). */
const TRAILING_CONNECTIVES: Record<StructureLang, string[]> = {
  pt: ['e', 'ou', 'mas', 'que', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'para', 'por', 'pela', 'pelo', 'pelas', 'pelos', 'com', 'sem', 'sob', 'sobre', 'entre', 'ao', 'aos', 'à', 'às', 'se', 'quando', 'onde', 'como', 'porque', 'pois', 'enquanto', 'até', 'após', 'contra', 'desde', 'nem', 'seu', 'sua', 'seus', 'suas', 'meu', 'minha', 'cujo', 'cuja', 'qual'],
  en: ['and', 'or', 'but', 'that', 'of', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'without', 'by', 'from', 'into', 'onto', 'when', 'where', 'while', 'as', 'because', 'if', 'than', 'his', 'her', 'their', 'its', 'my', 'our', 'your', 'which', 'whose', 'nor'],
  es: ['y', 'o', 'pero', 'que', 'de', 'del', 'en', 'la', 'el', 'las', 'los', 'un', 'una', 'para', 'por', 'con', 'sin', 'sobre', 'entre', 'al', 'cuando', 'donde', 'como', 'porque', 'su', 'sus', 'mi', 'cuyo', 'cuya']
};

export function detectStructureLang(idioma?: string): StructureLang {
  const s = (idioma || '').toLowerCase();
  if (/ingl|english|^en/.test(s)) return 'en';
  if (/espa|spanish|^es/.test(s)) return 'es';
  return 'pt';
}

/** Remove toda numeração embutida ("Capítulo 3:", "Cap. III -", "Chapter Three:", "3. ") repetidamente. */
export function stripChapterNumbering(title: string): string {
  let t = (title || '').replace(/\s+/g, ' ').trim();
  let prev = '';
  let guard = 0;
  while (t !== prev && guard++ < 5) {
    prev = t;
    t = t.replace(PREFIX_RX, '').replace(BARE_NUMBER_RX, '').trim();
  }
  // Remove aspas/asteriscos/markdown que envolvem o título inteiro
  t = t.replace(/^[*_#"“”'«»\s]+|[*_#"“”'«»\s]+$/g, '').trim();
  return t;
}

function lastWord(title: string): string {
  const words = title.replace(/[.,;:!?…"”»)\]]+$/g, '').trim().split(/\s+/);
  return (words[words.length - 1] || '').toLowerCase();
}

/** Título incompleto: termina com conectivo/artigo/preposição, vírgula, dois-pontos, hífen ou reticências de corte. */
export function isIncompleteTitle(title: string, lang?: StructureLang): boolean {
  const t = (title || '').trim();
  if (!t) return true;
  if (/[,;:\-–—(]$/.test(t)) return true;
  if (/(\.\.\.|…)$/.test(t)) return true;
  const quotes = (t.match(/["“”]/g) || []).length;
  if (quotes % 2 === 1) return true;
  const lw = lastWord(t);
  if (lang) {
    return TRAILING_CONNECTIVES[lang].includes(lw);
  }
  return (
    TRAILING_CONNECTIVES.pt.includes(lw) ||
    TRAILING_CONNECTIVES.en.includes(lw) ||
    TRAILING_CONNECTIVES.es.includes(lw)
  );
}

/** Reparo seguro: remove pontuação pendente e conectivos finais. Retorna '' se nada restar. */
export function repairIncompleteTitle(title: string, lang?: StructureLang): string {
  let t = (title || '').trim().replace(/(\.\.\.|…)$/, '').replace(/[,;:\-–—(\s]+$/, '').trim();
  let guard = 0;
  const isConn = (w: string) =>
    lang
      ? TRAILING_CONNECTIVES[lang].includes(w)
      : TRAILING_CONNECTIVES.pt.includes(w) ||
        TRAILING_CONNECTIVES.en.includes(w) ||
        TRAILING_CONNECTIVES.es.includes(w);
  while (t && guard++ < 6 && isConn(lastWord(t))) {
    t = t.split(/\s+/).slice(0, -1).join(' ').replace(/[,;:\-–—\s]+$/, '').trim();
  }
  const quotes = (t.match(/["“”]/g) || []).length;
  if (quotes % 2 === 1) t = t.replace(/["“”]/g, '').trim();
  return t;
}

/**
 * Encurta títulos longos SEM cortar palavras e SEM terminar em conectivo.
 * Só atua acima de `maxWords`.
 */
export function shortenTitleSafely(title: string, maxWords = 10, lang: StructureLang = 'pt'): string {
  const words = (title || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return title.trim();
  return repairIncompleteTitle(words.slice(0, maxWords).join(' '), lang) || words.slice(0, maxWords).join(' ');
}

export function chapterLabel(numero: number, lang: StructureLang): string {
  return lang === 'en' ? `Chapter ${numero}` : `Capítulo ${numero}`;
}

/** Normaliza o cabeçalho de um capítulo a partir de qualquer string gerada pela IA. */
export function normalizeChapterHeading(raw: string, numero: number, idioma?: string, _fallbackText?: string): StructuredChapterHeading {
  const lang = detectStructureLang(idioma);
  const issues: string[] = [];
  const original = (raw || '').trim();
  let titulo = stripChapterNumbering(original);
  if (titulo !== original.replace(/\s+/g, ' ') && /\d|cap|chapter/i.test(original)) {
    issues.push('numeracao_embutida_removida');
  }
  if (isIncompleteTitle(titulo, lang) && titulo) {
    const repaired = repairIncompleteTitle(titulo, lang);
    if (repaired && repaired !== titulo) {
      issues.push(`titulo_incompleto_reparado: "${titulo}" → "${repaired}"`);
      titulo = repaired;
    }
  }
  titulo = shortenTitleSafely(titulo, 12, lang);
  const label = chapterLabel(numero, lang);
  const display = titulo ? `${label}: ${titulo}` : label;
  return {
    numero,
    titulo,
    cleanTitle: titulo,
    display,
    fullHeading: display,
    wasRepaired: issues.length > 0,
    issues
  };
}

/** Sumário a partir de metadados estruturados (numeração vem do índice, nunca do título). */
export function buildStructuredToc(
  chapters: { titulo: string }[],
  idioma?: string,
  pageStarts?: number[]
): { numero: number; chapterNumber: number; titulo: string; cleanTitle: string; fullHeading: string; pageNumber?: number }[] {
  return chapters.map((c, i) => {
    const norm = normalizeChapterHeading(c.titulo, i + 1, idioma);
    return {
      numero: i + 1,
      chapterNumber: i + 1,
      titulo: norm.titulo,
      cleanTitle: norm.titulo,
      fullHeading: norm.display,
      pageNumber: pageStarts ? pageStarts[i] : undefined,
    };
  });
}

/** Validação estrutural determinística (títulos, numeração, duplicidades). */
export function validateChapterStructure(chapters: { titulo: string }[], idioma?: string): ChapterStructureIssue[] {
  const lang = detectStructureLang(idioma);
  const issues: ChapterStructureIssue[] = [];
  const seenTitles = new Map<string, number>();
  const embeddedNumbers = new Map<number, number>();

  chapters.forEach((c, i) => {
    const raw = (c.titulo || '').trim();
    const clean = stripChapterNumbering(raw);

    const m = /^\s*(?:cap[ií]tulo|chapter|cap\.?)\s*(\d{1,3})/i.exec(raw) || /^\s*(\d{1,3})\s*[.:\-–—]/.exec(raw);
    if (m) {
      const n = Number(m[1]);
      if (embeddedNumbers.has(n)) {
        issues.push({ chapterIndex: i, type: 'numero_duplicado', severity: 'CRITICO', description: `Número ${n} embutido no título repete o do capítulo ${embeddedNumbers.get(n)! + 1}.`, original: raw, suggested: clean });
      } else embeddedNumbers.set(n, i);
      if (n !== i + 1) {
        issues.push({ chapterIndex: i, type: 'numero_duplicado', severity: 'ALTO', description: `Título traz o número ${n}, mas o capítulo ocupa a posição ${i + 1}.`, original: raw, suggested: clean });
      }
    }
    if (/^(?:cap[ií]tulo|chapter)\s*\d+\s*[:.\-–—]?\s*(?:cap[ií]tulo|chapter)\s*\d+/i.test(raw) || /^\d+\.\s*(?:cap[ií]tulo|chapter)/i.test(raw)) {
      issues.push({ chapterIndex: i, type: 'numeracao_embutida', severity: 'CRITICO', description: 'Numeração duplicada no título do capítulo.', original: raw, suggested: clean });
    }
    if (!clean) {
      issues.push({ chapterIndex: i, type: 'titulo_vazio', severity: 'MEDIO', description: 'Capítulo sem título descritivo (será exibido apenas o número).', original: raw });
      return;
    }
    if (isIncompleteTitle(clean, lang)) {
      issues.push({ chapterIndex: i, type: 'titulo_incompleto', severity: 'ALTO', description: `Título incompleto ou terminado em conectivo: "${clean}".`, original: raw, suggested: repairIncompleteTitle(clean, lang) || undefined });
    }
    if (/…$/.test(raw) || /\.\.\.$/.test(raw)) {
      issues.push({ chapterIndex: i, type: 'titulo_truncado', severity: 'ALTO', description: `Título truncado com reticências: "${raw}".`, original: raw, suggested: repairIncompleteTitle(clean, lang) || undefined });
    }
    const key = clean.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
    if (key) {
      if (seenTitles.has(key)) {
        issues.push({ chapterIndex: i, type: 'titulo_duplicado', severity: 'MEDIO', description: `Título idêntico ao do capítulo ${seenTitles.get(key)! + 1}: "${clean}".`, original: raw });
      } else seenTitles.set(key, i);
    }
  });
  return issues;
}

