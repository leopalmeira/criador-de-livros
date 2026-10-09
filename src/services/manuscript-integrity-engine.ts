// ============================================================================
// MOTOR DE INTEGRIDADE, SANITIZAÇÃO EDITORIAL E BLINDAGEM DE MANUSCRITOS KDP
// 1. Limpeza e sanitização de caracteres matemáticos / resíduos LaTeX em UTF-8
// 2. Remoção de metadados e marcadores de fim de bloco ("Fim do Capítulo...", etc.)
// 3. Validação de integridade e truncamento de capítulos (Watchdog de conclusão)
// 4. Padronização tipográfica de diálogos (hífens para travessões clássicos "— ")
// 5. Verificação de consistência entre sumário previsto e capítulos compilados
// ============================================================================

import { BookProject } from '../types/book-project';

export interface ChapterIntegrityCheck {
  isValid: boolean;
  isTruncated: boolean;
  truncationReason?: string;
  hasLaTeXResiduals: boolean;
  laTeXResidualCount: number;
  hasBlockMarkers: boolean;
  removedMarkers: string[];
  repairedText: string;
}

export interface BookIntegrityReport {
  isValid: boolean;
  expectedChaptersCount: number;
  actualChaptersCount: number;
  missingChapters: number[];
  discrepancyWarning?: string;
  chapterChecks: Array<{
    chapterIndex: number;
    title: string;
    check: ChapterIntegrityCheck;
  }>;
}

/**
 * Tabela exaustiva de mapeamento de macros e resíduos LaTeX para caracteres UTF-8
 */
const LATEX_ACCENT_MAP: Record<string, string> = {
  // Circunflexo
  '\\hat{A}': 'Â', '\\hat{a}': 'â',
  '\\hat{E}': 'Ê', '\\hat{e}': 'ê',
  '\\hat{I}': 'Î', '\\hat{i}': 'î',
  '\\hat{O}': 'Ô', '\\hat{o}': 'ô',
  '\\hat{U}': 'Û', '\\hat{u}': 'û',
  '\\^A': 'Â', '\\^a': 'â',
  '\\^E': 'Ê', '\\^e': 'ê',
  '\\^I': 'Î', '\\^i': 'î',
  '\\^O': 'Ô', '\\^o': 'ô',
  '\\^U': 'Û', '\\^u': 'û',

  // Til
  '\\tilde{A}': 'Ã', '\\tilde{a}': 'ã',
  '\\tilde{O}': 'Õ', '\\tilde{o}': 'õ',
  '\\~A': 'Ã', '\\~a': 'ã',
  '\\~O': 'Õ', '\\~o': 'õ',

  // Agudo
  '\\acute{A}': 'Á', '\\acute{a}': 'á',
  '\\acute{E}': 'É', '\\acute{e}': 'é',
  '\\acute{I}': 'Í', '\\acute{i}': 'í',
  '\\acute{O}': 'Ó', '\\acute{o}': 'ó',
  '\\acute{U}': 'Ú', '\\acute{u}': 'ú',
  '\\\'A': 'Á', '\\\'a': 'á',
  '\\\'E': 'É', '\\\'e': 'é',
  '\\\'I': 'Í', '\\\'i': 'í',
  '\\\'O': 'Ó', '\\\'o': 'ó',
  '\\\'U': 'Ú', '\\\'u': 'ú',

  // Crase
  '\\grave{A}': 'À', '\\grave{a}': 'à',
  '\\`A': 'À', '\\`a': 'à',

  // Trema
  '\\ddot{U}': 'Ü', '\\ddot{u}': 'ü',
  '\\"U': 'Ü', '\\"u': 'ü',

  // Cedilha
  '\\c{C}': 'Ç', '\\c{c}': 'ç',
};

/**
 * Padrões de marcadores de controle de fim de bloco inseridos por modelos de IA
 */
const END_OF_CHAPTER_PATTERNS: RegExp[] = [
  /^[ \t]*(?:\[|\(|—|-)?\s*(?:fim|termina|final|conclus[aã]o)\s+d?[oa]?\s*cap[ií]tulo(?:\s+\d+|\s+[ivxlcdm]+|\s+de\s+\d+)?\b[^\n]*$/gmi,
  /^[ \t]*(?:\[|\()?\s*(?:fim|termina|final)\s+d?[oa]?\s*(?:livro|obra|volume|parte|bloco|se[çc][aã]o)\b[^\n]*$/gmi,
  /^[ \t]*\[\s*Fim\s+do\s+Cap[ií]tulo\s*\d*\s*\]\s*$/gmi,
  /^[ \t]*---\s*Fim\s+do\s+Cap[ií]tulo(?:\s+\d+)?\s*---\s*$/gmi,
  /^[ \t]*\*\*\*\s*Fim\s+do\s+Cap[ií]tulo(?:\s+\d+)?\s*\*\*\*\s*$/gmi,
  /^[ \t]*(?:\[|\()?\s*(?:continua\s+no\s+pr[oó]ximo\s+cap[ií]tulo|continue\s+in\s+next\s+chapter)[^\]\)\n]*[\]\)]?\s*$/gmi,
  /^[ \t]*(?:Nota\s+do\s+Autor|Nota\s+Editorial|Instrução|Prompt|Contagem\s+de\s+palavras|Tokens?)\s*:[^\n]*$/gmi,
  /^[ \t]*<<<[A-Z_]+>>>\s*$/gmi,
  /^[ \t]*===\s*FIM(?:\s+DO\s+CAP[IÍ]TULO)?\s*===\s*$/gmi
];

export class ManuscriptIntegrityEngine {
  /**
   * 1. Limpeza e sanitização de caracteres matemáticos e resíduos LaTeX (Encoding Fix)
   * Converte $\hat{E}$, $\hat{A}$, $\tilde{A}$, $\^E$, etc., para caracteres UTF-8 puros.
   */
  public static cleanLaTeXResiduals(text: string): string {
    if (!text) return '';
    let result = text;

    // A) Padrões delimitados por $...$: $\hat{E}$, $\tilde{A}$, $\acute{o}$, $\^A$, $^E$, etc.
    result = result.replace(/\$([^\$\n]+)\$/g, (match, inner) => {
      const trimmed = inner.trim();
      
      // 1. Mapeamento direto do dicionário
      if (LATEX_ACCENT_MAP[trimmed]) {
        return LATEX_ACCENT_MAP[trimmed];
      }

      // 2. \hat{X}, \tilde{X}, \acute{X}, \grave{X}, \ddot{X}, \c{X}
      const cmdMatch = trimmed.match(/^\\(hat|tilde|acute|grave|ddot|c)\{([A-Za-z])\}$/);
      if (cmdMatch) {
        const [, cmd, letter] = cmdMatch;
        const key = `\\${cmd}{${letter}}`;
        if (LATEX_ACCENT_MAP[key]) return LATEX_ACCENT_MAP[key];
      }

      // 3. \^X, \~X, \'X, \`X, \"X
      const shortMatch = trimmed.match(/^\\([\^~'`"])([A-Za-z])$/);
      if (shortMatch) {
        const [, sym, letter] = shortMatch;
        const key = `\\${sym}${letter}`;
        if (LATEX_ACCENT_MAP[key]) return LATEX_ACCENT_MAP[key];
      }

      // 4. Letra única isolada em modo matemático: $E$ -> E, $A$ -> A
      if (/^[a-zA-ZáéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛçÇ]$/.test(trimmed)) {
        return trimmed;
      }

      // 5. Palavra acentuada com circunflexo/til solto: $^E$ -> Ê, $^A$ -> Â, $~A$ -> Ã
      const circumMatch = trimmed.match(/^\^([a-zA-ZáéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛ])$/);
      if (circumMatch) {
        const key = `\\^${circumMatch[1]}`;
        if (LATEX_ACCENT_MAP[key]) return LATEX_ACCENT_MAP[key];
      }

      const tildeMatch = trimmed.match(/^~([a-zA-ZáéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛ])$/);
      if (tildeMatch) {
        const key = `\\~${tildeMatch[1]}`;
        if (LATEX_ACCENT_MAP[key]) return LATEX_ACCENT_MAP[key];
      }

      // 6. Resíduos como $^\hat{E}$ ou $\^?([a-zA-Z])$
      const regexHatMatch = trimmed.match(/^\\?\^?([a-zA-ZáéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛ])$/);
      if (regexHatMatch) {
        const ch = regexHatMatch[1];
        const key = `\\^${ch}`;
        if (LATEX_ACCENT_MAP[key]) return LATEX_ACCENT_MAP[key];
      }

      // Caso não seja reconhecido como fórmula matemática legítima (ex: $x + y$), mantém ou remove cifrão
      if (/^[a-zA-Z0-9\s,.;:!?—\-]+$/.test(trimmed)) {
        return trimmed;
      }

      return match;
    });

    // B) Padrões LaTeX soltos no texto SEM cifrão: \hat{E}, \tilde{a}, \acute{e}
    for (const [latexCmd, utf8Char] of Object.entries(LATEX_ACCENT_MAP)) {
      if (result.includes(latexCmd)) {
        result = result.split(latexCmd).join(utf8Char);
      }
    }

    // C) Padrões como \^E ou \~a colados a outras letras
    result = result.replace(/\\([\^~'`"])([A-Za-z])/g, (match, sym, letter) => {
      const key = `\\${sym}${letter}`;
      return LATEX_ACCENT_MAP[key] || letter;
    });

    // D) Remove comandos LaTeX vazios residuais: \hat{}, \tilde{}, \acute{}
    result = result.replace(/\\(?:hat|tilde|acute|grave|ddot|c)\{\}/g, '');

    // E) Cifrões isolados residuais que cercam palavras comuns (ex: $capítulo$ -> capítulo)
    result = result.replace(/\$([a-zA-Z0-9áéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛçÇ\s]{1,40})\$/g, '$1');

    // F) Cifrões acidentais colados a letras: $palavra ou palavra$
    result = result.replace(/(?<=\s|^)\$([a-zA-ZáéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛ])/g, '$1');
    result = result.replace(/([a-zA-ZáéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛ])\$(?=\s|[.,!?;:]|$)/g, '$1');

    return result.normalize('NFC');
  }

  /**
   * 2. Remoção de metadados e marcadores de fim de bloco
   * Elimina "Fim do Capítulo 18.", "Termina o Capítulo 20.", notas de modelo, etc.
   */
  public static removeChapterBlockMarkers(text: string): { cleanText: string; removedMarkers: string[] } {
    if (!text) return { cleanText: '', removedMarkers: [] };

    const removedMarkers: string[] = [];
    let lines = text.split('\n');

    // 1. Varredura linha por linha
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return true; // preserva quebras normais

      for (const pattern of END_OF_CHAPTER_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(trimmed)) {
          removedMarkers.push(trimmed);
          return false;
        }
      }
      return true;
    });

    let cleanText = filteredLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();

    // 2. Varredura inline no final do texto (caso o marcador esteja colado no final do parágrafo)
    const inlineEndPattern = /(?:[.\!?—"”»]\s+|^)\s*(?:\[|\(|—|-)?\s*(?:fim|termina|final|conclus[aã]o)\s+d?[oa]?\s*cap[ií]tulo(?:\s+\d+|\s+[ivxlcdm]+|\s+de\s+\d+)?\b[^\n]*$/i;
    const inlineMatch = cleanText.match(inlineEndPattern);
    if (inlineMatch) {
      removedMarkers.push(inlineMatch[0].trim());
      cleanText = cleanText.slice(0, inlineMatch.index).trimEnd();
      if (!/[.\!?—"”»]$/.test(cleanText)) {
        cleanText += '.';
      }
    }

    return { cleanText, removedMarkers };
  }

  /**
   * 3. Padronização tipográfica de diálogos
   * Converte hífens soltos ("- ") no início de falas para travessão clássico ("— ")
   */
  public static standardizeDialogueTypography(text: string): string {
    if (!text) return '';
    let result = text;

    // Linhas iniciadas por hífen ou meia-risca seguida de espaço e letra: "- Olá" -> "— Olá"
    result = result.replace(/^[-–][ \t]+(?=[\p{L}"“¿¡(\[])/gmu, '— ');

    // Travessão colado sem espaço: "—Olá" -> "— Olá"
    result = result.replace(/^—(?=[^\s—])/gmu, '— ');

    // Hífen solto após quebra de parágrafo dentro de blocos de diálogo
    result = result.replace(/(?<=\n)[-–][ \t]+(?=[\p{L}"“¿¡(\[])/gu, '— ');

    return result;
  }

  /**
   * 4. Validação de integridade e detecção de truncamento de capítulos
   * Verifica se o texto termina de maneira abrupta sem fechamento sintático.
   */
  public static checkChapterTruncation(text: string): { isTruncated: boolean; reason?: string } {
    if (!text || text.trim().length === 0) {
      return { isTruncated: true, reason: 'Texto do capítulo está vazio.' };
    }

    const trimmed = text.trim();

    // Palavras finais que denunciam frase incompleta
    const danglingConnectors = [
      'e', 'mas', 'ou', 'porque', 'porém', 'contudo', 'todavia', 'pois',
      'que', 'quando', 'onde', 'como', 'se', 'embora',
      'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
      'para', 'com', 'por', 'a', 'ao', 'aos', 'à', 'às', 'sob', 'sobre',
      'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
      'ele', 'ela', 'eles', 'elas', 'seu', 'sua', 'seus', 'suas',
      'nem', 'nem um', 'nem uma'
    ];

    // Termina em reticências após frase evidentemente curta ou incompleta
    if (trimmed.endsWith('...') || trimmed.endsWith('…')) {
      const lastSentence = trimmed.slice(Math.max(0, trimmed.length - 80));
      // Se termina com "... " ou expressão suspensa típica de estouro de tokens
      const words = lastSentence.split(/\s+/).filter(Boolean);
      const lastWord = words[words.length - 1]?.replace(/[.…]/g, '').toLowerCase();
      if (danglingConnectors.includes(lastWord)) {
        return {
          isTruncated: true,
          reason: `Terminou em reticências no meio de oração com conector pendente: "${lastWord}..."`
        };
      }
    }

    // Caracteres finais válidos de encerramento de capítulo
    const validEndings = ['.', '!', '?', '—', '"', '”', '»'];
    const lastChar = trimmed.slice(-1);

    if (!validEndings.includes(lastChar)) {
      // Se terminar com aspas após pontuação (ex: '."', '!"', '?"')
      if (trimmed.length >= 2) {
        const lastTwo = trimmed.slice(-2);
        if (['."', '!"', '?"', '.”', '!”', '?”'].includes(lastTwo)) {
          return { isTruncated: false };
        }
      }

      return {
        isTruncated: true,
        reason: `Capítulo não termina com pontuação de fechamento válida (terminou em '${lastChar}').`
      };
    }

    // Verifica se a última palavra antes da pontuação é um conector solto
    const lastWordMatch = trimmed.match(/([a-zA-ZáéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛçÇ]+)[.!?—"”»]+$/);
    if (lastWordMatch) {
      const lastWord = lastWordMatch[1].toLowerCase();
      if (['e', 'ou', 'mas', 'que', 'nem'].includes(lastWord)) {
        return {
          isTruncated: true,
          reason: `Última palavra é uma conjunção suspensa antes da pontuação: "${lastWord}".`
        };
      }
    }

    return { isTruncated: false };
  }

  /**
   * 5. Reparo sintático automático para capítulos truncados
   * Se o capítulo foi cortado no meio ("Ele não parecia nem um..."), repara a pontuação
   * ou conclui o período de forma elegante e correta antes de salvar ou exportar.
   */
  public static repairTruncatedSentence(text: string): string {
    if (!text) return '';
    let result = text.trim();

    const check = this.checkChapterTruncation(result);
    if (!check.isTruncated) return result;

    // Caso A: Termina em reticências (ex: "Ele não parecia nem um...")
    if (result.endsWith('...') || result.endsWith('…')) {
      // Remove reticências soltas
      result = result.replace(/[.…]+$/, '').trimEnd();
    }

    // Remove conectores e artigos suspensos encadeados no final (ex: "nem um", "para o", "com a")
    const connectorPattern = /\s+(?:e|mas|ou|porque|porém|contudo|pois|que|quando|onde|como|se|de|do|da|dos|das|em|no|na|nos|nas|para|com|por|a|ao|aos|à|às|o|os|as|um|uma|uns|umas|nem|nem\s+um|nem\s+uma|sob|sobre)$/i;
    let prevLen = -1;
    while (result.length !== prevLen) {
      prevLen = result.length;
      result = result.replace(connectorPattern, '').trimEnd();
    }

    // Se terminar em vírgula, dois pontos ou ponto e vírgula, substitui por ponto final
    if (/[,;:]$/.test(result)) {
      result = result.slice(0, -1).trimEnd();
    }

    // Garante fechamento definitivo com pontuação válida
    if (!/[.!?—"”»]$/.test(result)) {
      result += '.';
    }

    return result;
  }

  /**
   * 6. Sanitização completa e unificada de um capítulo individual
   * Aplica:
   * 1. Limpeza LaTeX
   * 2. Remoção de marcadores de fim de capítulo
   * 3. Padronização de diálogos
   * 4. Validação e reparo de truncamento
   */
  public static sanitizeChapterContent(text: string): {
    cleanText: string;
    wasTruncated: boolean;
    truncationReason?: string;
    markersRemoved: string[];
  } {
    if (!text) return { cleanText: '', wasTruncated: false, markersRemoved: [] };

    // 1. Limpeza LaTeX
    let processed = this.cleanLaTeXResiduals(text);

    // 2. Remoção de marcadores de fim de bloco
    const { cleanText: withoutMarkers, removedMarkers } = this.removeChapterBlockMarkers(processed);
    processed = withoutMarkers;

    // 3. Padronização de diálogos
    processed = this.standardizeDialogueTypography(processed);

    // 4. Verificação e reparo de truncamento
    const truncationCheck = this.checkChapterTruncation(processed);
    if (truncationCheck.isTruncated) {
      processed = this.repairTruncatedSentence(processed);
    }

    return {
      cleanText: processed,
      wasTruncated: truncationCheck.isTruncated,
      truncationReason: truncationCheck.reason,
      markersRemoved: removedMarkers
    };
  }

  /**
   * 7. Validação de integridade do livro completo contra o Sumário/Outline
   * Verifica se todos os capítulos previstos (ex: até o Capítulo 45) foram gerados
   * e compilados, alertando sobre qualquer discrepância de contagem.
   */
  public static validateBookConsistency(
    expectedCount: number,
    chapters: Array<{ index?: number; number?: number; title: string; text: string }>
  ): BookIntegrityReport {
    const actualCount = chapters.length;
    const missing: number[] = [];

    // Mapeamento dos índices existentes
    const presentIndices = new Set<number>();
    chapters.forEach((c, idx) => {
      const num = c.number || c.index || (idx + 1);
      presentIndices.add(num);
    });

    for (let i = 1; i <= expectedCount; i++) {
      if (!presentIndices.has(i)) {
        missing.push(i);
      }
    }

    const chapterChecks = chapters.map((ch, idx) => {
      const rawText = ch.text || '';
      const checkResult = this.checkChapterTruncation(rawText);
      const laTeXMatches = (rawText.match(/\$[^$]+\$|\\hat\{|\\tilde\{|\\acute\{/g) || []).length;
      const { removedMarkers } = this.removeChapterBlockMarkers(rawText);
      const sanitized = this.sanitizeChapterContent(rawText);

      return {
        chapterIndex: idx + 1,
        title: ch.title,
        check: {
          isValid: !checkResult.isTruncated && laTeXMatches === 0 && removedMarkers.length === 0,
          isTruncated: checkResult.isTruncated,
          truncationReason: checkResult.reason,
          hasLaTeXResiduals: laTeXMatches > 0,
          laTeXResidualCount: laTeXMatches,
          hasBlockMarkers: removedMarkers.length > 0,
          removedMarkers,
          repairedText: sanitized.cleanText
        }
      };
    });

    const isCountConsistent = actualCount >= expectedCount && missing.length === 0;
    const allChaptersValid = chapterChecks.every(c => c.check.isValid);

    let discrepancyWarning: string | undefined;
    if (!isCountConsistent) {
      discrepancyWarning = `Discrepância na contagem de capítulos: previstos ${expectedCount}, compilados ${actualCount}. ` +
        (missing.length > 0 ? `Capítulos ausentes: ${missing.join(', ')}.` : '');
    }

    return {
      isValid: isCountConsistent && allChaptersValid,
      expectedChaptersCount: expectedCount,
      actualChaptersCount: actualCount,
      missingChapters: missing,
      discrepancyWarning,
      chapterChecks
    };
  }

  /**
   * 8. Sanitização completa de um BookProject KDP antes da exportação
   * Aplica a limpeza e reparo em 100% dos capítulos e campos textuais da obra.
   */
  public static sanitizeBookProject(project: BookProject): BookProject {
    const updated = { ...project };

    // Sanitiza título, subtítulo e descrição
    if (updated.title) updated.title = this.cleanLaTeXResiduals(updated.title);
    if (updated.subtitle) updated.subtitle = this.cleanLaTeXResiduals(updated.subtitle);
    if (updated.description) updated.description = this.cleanLaTeXResiduals(updated.description);

    // Sanitiza kdpChapters
    if (updated.kdpChapters && Array.isArray(updated.kdpChapters)) {
      updated.kdpChapters = updated.kdpChapters.map((ch) => {
        const raw = ch.content || ch.prose || ch.texto || '';
        const sanitized = this.sanitizeChapterContent(raw);
        return {
          ...ch,
          title: this.cleanLaTeXResiduals(ch.title || ''),
          content: sanitized.cleanText,
          prose: sanitized.cleanText,
          texto: sanitized.cleanText
        };
      });
    }

    // Sanitiza chapters convencionais
    if (updated.chapters && Array.isArray(updated.chapters)) {
      updated.chapters = updated.chapters.map((ch) => {
        const raw = ch.content || '';
        const sanitized = this.sanitizeChapterContent(raw);
        return {
          ...ch,
          title: this.cleanLaTeXResiduals(ch.title || ''),
          content: sanitized.cleanText
        };
      });
    }

    return updated;
  }
}
