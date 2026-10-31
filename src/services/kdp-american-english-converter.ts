// ============================================================================
// SERVIÇO DE CONVERSÃO EDITORIAL PARA INGLÊS AMERICANO CONTEMPORÂNEO
// Transforma miolo, capítulos, títulos e sinopses em prosa natural nativa dos EUA
// em conformidade com as regras de bestsellers da Amazon KDP (.com)
// ============================================================================

import { chamarGeminiTexto } from './kdp-ai-engine';

export interface CapituloModel {
  titulo: string;
  texto: string;
  imagemDataUrl?: string | null;
  imagemPrompt?: string;
}

export interface LivroGeradoModel {
  titulo: string;
  subtitulo: string;
  autor: string;
  genero: string;
  idioma: string;
  capitulos: CapituloModel[];
  meta: {
    palavrasPorCap: number;
    paginasAlvo: number;
  };
}

export interface ConvertProgressCallback {
  (progress: {
    current: number;
    total: number;
    percent: number;
    stepTitle: string;
    chapterTitle?: string;
  }): void;
}

export class KdpAmericanEnglishConverter {
  /**
   * Adapta o título, subtítulo, tópico e diferencial da obra para o padrão comercial americano.
   */
  public static async adaptMetadataToAmericanEnglish(params: {
    titulo: string;
    subtitulo: string;
    topico?: string;
    genero?: string;
    estadoEua?: string;
  }): Promise<{
    tituloEn: string;
    subtituloEn: string;
    topicoEn: string;
    generoEn: string;
  }> {
    const estado = params.estadoEua || 'New York (NY)';
    const prompt = `You are a top acquisitions editor and book packaging strategist at a Big 5 publisher in New York.
Translate and stylistically adapt the following book metadata from Portuguese into punchy, magnetic, contemporary American English.

CURRENT METADATA (Portuguese):
- Title: "${params.titulo}"
- Subtitle: "${params.subtitulo}"
- Topic/Premise: "${params.topico || ''}"
- Genre: "${params.genero || 'Fiction'}"
- US Geographical Anchor: ${estado}

RULES:
1. The new title must be commercially irresistible, catchy, and sound like a New York Times bestseller.
2. The subtitle should be crisp, modern, and promise high engagement or emotional payoff.
3. The topic should be articulated in fluent, professional American English.
4. Return ONLY a valid JSON object with keys: "tituloEn", "subtituloEn", "topicoEn", "generoEn". No markdown, no backticks.`;

    try {
      const resp = await chamarGeminiTexto(prompt, {
        temperature: 0.85,
        maxTokens: 500
      });
      const txt = (typeof resp === 'string' ? resp : resp?.texto || '')
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const jsonMatch = txt.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          tituloEn: parsed.tituloEn || this.fallbackTranslateTitle(params.titulo),
          subtituloEn: parsed.subtituloEn || params.subtitulo,
          topicoEn: parsed.topicoEn || params.topico || '',
          generoEn: parsed.generoEn || params.genero || 'Contemporary Fiction'
        };
      }
    } catch (err) {
      console.warn('[AmericanEnglishConverter] Falha na adaptação de metadados via IA, usando fallback:', err);
    }

    return {
      tituloEn: this.fallbackTranslateTitle(params.titulo),
      subtituloEn: params.subtitulo ? `A Contemporary American Journey: ${params.subtitulo}` : '',
      topicoEn: params.topico || '',
      generoEn: params.genero || 'Contemporary Fiction'
    };
  }

  /**
   * Adapta e reescreve um capítulo completo para o inglês americano contemporâneo,
   * garantindo tom natural, diálogos autênticos e formatação "Chapter N: [Title]".
   */
  public static async adaptChapterToAmericanEnglish(params: {
    chapterIndex: number;
    totalChapters: number;
    chapterTitle: string;
    chapterText: string;
    bookTitle: string;
    genre?: string;
    estadoEua?: string;
  }): Promise<{ titulo: string; texto: string }> {
    const num = params.chapterIndex;
    const estado = params.estadoEua || 'New York (NY)';

    const systemInstruction = `You are an acclaimed contemporary American bestselling author (fiction/nonfiction) writing for the US market.
Your mission is to rewrite and stylistically localize this chapter into authentic, natural, contemporary AMERICAN ENGLISH.

MANDATORY RULES (US BESTSELLER STANDARD):
1. NATIVE CONTEMPORARY PROSE: Write in modern American English as spoken and read in the US today. Use fluid sentence variety, natural contractions (don't, couldn't, wasn't, what's), sensory imagery, and modern colloquial rhythm.
2. ZERO LITERAL TRANSLATION: Do not mechanically mirror Portuguese grammar, syntax, or phrasing. Rephrase concepts so they read effortlessly like an original American novel.
3. DIALOGUE CONVENTIONS: Use standard American dialogue formatting with double quotes ("Hello," he said). Never use European em-dashes (—) as dialogue indicators.
4. TITLE FORMAT: Strict format "Chapter ${num}: [Engaging Title in English]". NEVER use the Portuguese word "Capítulo".
5. GEOGRAPHICAL ANCHORING: If the scene mentions cities, streets, vehicles, law enforcement, or weather, anchor them authentically in the US (${estado}).
6. COMPLETE NARRATIVE: Do not truncate or summarize. Deliver the complete chapter prose with full paragraphs.
7. NO META-TEXT: Do not include introductory notes, conversational filler, markdown asterisks, or translation disclaimers.

OUTPUT FORMAT:
TITULO: Chapter ${num}: [English Chapter Title]
TEXTO:
[Full chapter prose with empty lines between paragraphs]`;

    const prompt = `━━━ BOOK INFO ━━━
Book Title: "${params.bookTitle}" | Genre: ${params.genre || 'Literature'}
US Setting: ${estado}

━━━ CHAPTER ${num} OF ${params.totalChapters} (SOURCE IN PORTUGUESE) ━━━
Original Title: "${params.chapterTitle}"
Original Text:
${params.chapterText}

Rewrite and localize this entire chapter into natural, contemporary American English now.`;

    try {
      const resp = await chamarGeminiTexto(prompt, {
        temperature: 0.82,
        maxTokens: Math.max(3800, Math.min(8192, Math.round(params.chapterText.split(/\s+/).length * 4.2))),
        systemInstruction
      });

      const raw = typeof resp === 'string' ? resp : resp?.texto || '';
      const parsed = this.parseChapterOutput(raw, num, params.chapterTitle);
      return parsed;
    } catch (err) {
      console.warn(`[AmericanEnglishConverter] Erro ao traduzir Capítulo ${num} via IA, aplicando fallback:`, err);
      return this.fallbackChapterLocalization(params.chapterTitle, params.chapterText, num);
    }
  }

  /**
   * Converte a obra inteira (Título, Subtítulo, Descrição e todos os Capítulos)
   * emitindo progresso contínuo e permitindo cancelamento.
   */
  public static async convertEntireBook(params: {
    livro: LivroGeradoModel;
    topico?: string;
    estadoEua?: string;
    onProgress?: ConvertProgressCallback;
    onChapterDone?: (livroAtualizado: LivroGeradoModel, capituloIndex: number) => void;
    cancellationRef?: { isCancelled: boolean };
  }): Promise<LivroGeradoModel> {
    const { livro, topico, estadoEua, onProgress, onChapterDone, cancellationRef } = params;
    const totalChapters = livro.capitulos.length;
    const totalSteps = totalChapters + 1; // 1 para metadados + N capítulos

    // 1. Adaptação dos Metadados da Obra
    if (onProgress) {
      onProgress({
        current: 0,
        total: totalSteps,
        percent: 5,
        stepTitle: 'Localizing Book Title, Subtitle & Theme to American English...'
      });
    }

    const metaEn = await this.adaptMetadataToAmericanEnglish({
      titulo: livro.titulo,
      subtitulo: livro.subtitulo,
      topico,
      genero: livro.genero,
      estadoEua
    });

    const livroConvertido: LivroGeradoModel = {
      ...livro,
      titulo: metaEn.tituloEn,
      subtitulo: metaEn.subtituloEn,
      idioma: 'inglês',
      capitulos: [...livro.capitulos]
    };

    // 2. Adaptação de cada capítulo do miolo
    for (let i = 0; i < totalChapters; i++) {
      if (cancellationRef?.isCancelled) {
        break;
      }

      const capOriginal = livroConvertido.capitulos[i];
      const capNum = i + 1;

      if (onProgress) {
        onProgress({
          current: capNum,
          total: totalSteps,
          percent: Math.round((capNum / totalSteps) * 100),
          stepTitle: `Writing Chapter ${capNum} of ${totalChapters} in contemporary American English...`,
          chapterTitle: capOriginal.titulo
        });
      }

      const capConvertido = await this.adaptChapterToAmericanEnglish({
        chapterIndex: capNum,
        totalChapters,
        chapterTitle: capOriginal.titulo,
        chapterText: capOriginal.texto,
        bookTitle: livroConvertido.titulo,
        genre: livroConvertido.genero,
        estadoEua
      });

      livroConvertido.capitulos[i] = {
        ...capOriginal,
        titulo: capConvertido.titulo,
        texto: capConvertido.texto
      };

      if (onChapterDone) {
        onChapterDone({ ...livroConvertido }, capNum);
      }

      // Pequena pausa para evitar limites de taxa
      if (i < totalChapters - 1) {
        await new Promise(r => setTimeout(r, 600));
      }
    }

    if (onProgress) {
      onProgress({
        current: totalSteps,
        total: totalSteps,
        percent: 100,
        stepTitle: '✓ All chapters successfully localized into contemporary American English!'
      });
    }

    return livroConvertido;
  }

  /**
   * Parser robusto da saída do modelo para extrair Título e Texto
   */
  private static parseChapterOutput(
    rawText: string,
    num: number,
    fallbackTitle: string
  ): { titulo: string; texto: string } {
    let titulo = `Chapter ${num}: Title`;
    let texto = rawText.trim();

    const titleMatch = rawText.match(/TITULO:\s*([^\n\r]+)/i);
    if (titleMatch && titleMatch[1]) {
      titulo = titleMatch[1].replace(/\*\*/g, '').trim();
    } else {
      const firstLine = rawText.split('\n')[0].replace(/^#+\s*/, '').trim();
      if (/^chapter\s*\d+/i.test(firstLine)) {
        titulo = firstLine;
      } else {
        titulo = `Chapter ${num}: ${this.fallbackTranslateTitle(fallbackTitle)}`;
      }
    }

    // Garante padronização "Chapter N"
    titulo = titulo.replace(/Cap[ií]tulo/gi, 'Chapter');
    if (!/^Chapter\s*\d+/i.test(titulo)) {
      titulo = `Chapter ${num}: ${titulo.replace(/^[:\s-]+/, '')}`;
    }

    const textMatch = rawText.match(/TEXTO:\s*([\s\S]+)/i);
    if (textMatch && textMatch[1]) {
      texto = textMatch[1].trim();
    } else if (titleMatch) {
      texto = rawText.replace(titleMatch[0], '').trim();
    }

    // Higienização básica de resíduos
    texto = texto
      .replace(/^TEXTO:\s*/i, '')
      .replace(/```/g, '')
      .trim();

    return { titulo, texto };
  }

  /**
   * Fallback leve para tradução de títulos conhecidos
   */
  private static fallbackTranslateTitle(ptTitle: string): string {
    if (!ptTitle) return 'Untitled American Novel';
    let en = ptTitle
      .replace(/O Segredo Que Ela Levou/gi, 'The Secret She Kept')
      .replace(/A Sombra do Alvo/gi, 'In the Crosshairs')
      .replace(/O Poder do Foco Inabalável/gi, 'The Power of Unshakable Focus')
      .replace(/O Código Secreto de/gi, 'The Secret Code of')
      .replace(/O Guia Definitivo de/gi, 'The Definitive Guide to')
      .replace(/Capítulo/gi, 'Chapter');

    return en.trim();
  }

  /**
   * Fallback offline para localização do capítulo se o modelo estiver indisponível
   */
  private static fallbackChapterLocalization(
    title: string,
    text: string,
    num: number
  ): { titulo: string; texto: string } {
    const enTitle = title
      .replace(/Cap[ií]tulo\s*\d*[:\s-]*/gi, '')
      .trim();

    return {
      titulo: `Chapter ${num}: ${enTitle || 'The Path Forward'}`,
      texto: text
        .replace(/—\s*/g, '"')
        .replace(/Capítulo/gi, 'Chapter')
    };
  }
}
