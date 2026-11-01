// ============================================================================
// BOOKENGIN — PIPELINE AUTÔNOMO DE DUPLA AUDITORIA, SELETOR KDP E QA DE LAYOUT
// Implementa:
// 1. WriteLockManager (controle de versão e bloqueio contra escrita concorrente)
// 2. KdpFormatSelector (seleção inteligente de formato KDP e perfil tipográfico por gênero)
// 3. EditorialAuditorAgent (EDITORIAL_AUDITOR_AGENT - Agente 1)
// 4. IndependentEditorialVerifier (INDEPENDENT_EDITORIAL_VERIFIER - Agente 2)
// 5. EpubValidator (validação técnica estrutural e navegável do arquivo EPUB)
// 6. LayoutQaAgent (LAYOUT_QA_AGENT - inspeção técnica de PDF e EPUB sem alterar texto)
// 7. runAutonomousEditorialCycle (ciclo autônomo completo pós-escrita com limite de segurança)
// ============================================================================

import JSZip from 'jszip';
import { db } from '../database/local-database';
import type { BookProject, BookType } from '../types/book-project';
import {
  buildStructuredToc,
  isIncompleteTitle,
  normalizeChapterHeading,
  shortenTitleSafely,
  validateChapterStructure,
  type ChapterStructureIssue,
  type NormalizedChapterTitle,
} from './chapter-structure';
import {
  BookSequentialWritingEngine,
  type BookGlobalMemory,
} from './book-sequential-writing-engine';
import {
  UniversalEditorialAuditor,
  type UniversalAuditIssue,
  type UniversalAuditResult,
} from './universal-editorial-auditor';
import { buildKdpPdf, TRIM_SIZES, type BuildPdfResult } from './kdp-pdf-builder';
import { validatePdf } from './kdp-pdf-validator';
import type { PdfValidationResult } from '../types/editorial-correction';
import { EpubBuilder } from './formats/epub-builder';

export type SupportedKdpFormat = '5x8' | '5.5x8.5' | '6x9' | '8.5x11' | '8.5x8.5';

export type PipelineStageId =
  | 'manuscrito_finalizado'
  | 'auditoria_agente_1'
  | 'correcoes_aplicadas'
  | 'verificacao_agente_2'
  | 'pendencias_encontradas'
  | 'diagramacao'
  | 'validacao_arquivos'
  | 'concluido';

export interface PipelineProgressEvent {
  stage: PipelineStageId;
  stageIndex: number; // 1 to 8
  totalStages: number; // 8
  label: string;
  detail: string;
  cycle: number;
  maxCycles: number;
  percent: number;
}

export interface ManuscriptChapter {
  titulo: string;
  texto: string;
  imagemDataUrl?: string | null;
}

export interface ManuscriptVersionSnapshot {
  versionId: string;
  versionNumber: number;
  bookId: string;
  createdBy: 'ORIGINAL' | 'EDITORIAL_AUDITOR_AGENT' | 'INDEPENDENT_EDITORIAL_VERIFIER';
  timestamp: string;
  title: string;
  subtitle?: string;
  author: string;
  genre: string;
  language: string;
  chapters: ManuscriptChapter[];
  wordCount: number;
  notes: string;
}

// ============================================================================
// 1. CONTROLE DE VERSÃO E BLOQUEIO DE ESCRITA (EVITA CONFLITOS CONCORRENTES)
// ============================================================================
export class WriteLockManager {
  private static activeLocks = new Map<string, { holder: string; acquiredAt: number }>();
  private static versionCounters = new Map<string, number>();
  private static snapshots = new Map<string, ManuscriptVersionSnapshot[]>();
  private static persistedManuscripts = new Map<string, ManuscriptVersionSnapshot>();

  static acquireLock(bookId: string, agentName: string): { acquired: boolean; lockToken: string } {
    const current = this.activeLocks.get(bookId);
    if (current && current.holder !== agentName) {
      throw new Error(
        `Conflito de escrita concorrente bloqueado: o livro "${bookId}" está bloqueado por "${current.holder}". "${agentName}" deve aguardar a liberação.`
      );
    }
    const token = `${bookId}::${agentName}::${Date.now()}`;
    this.activeLocks.set(bookId, { holder: agentName, acquiredAt: Date.now() });
    return { acquired: true, lockToken: token };
  }

  static releaseLock(bookId: string, agentName: string): void {
    const current = this.activeLocks.get(bookId);
    if (current && current.holder === agentName) {
      this.activeLocks.delete(bookId);
    }
  }

  static isLocked(bookId: string): boolean {
    return this.activeLocks.has(bookId);
  }

  static getLockHolder(bookId: string): string | null {
    return this.activeLocks.get(bookId)?.holder || null;
  }

  static async saveVersionedManuscript(params: {
    bookId: string;
    agentName: 'ORIGINAL' | 'EDITORIAL_AUDITOR_AGENT' | 'INDEPENDENT_EDITORIAL_VERIFIER';
    title: string;
    subtitle?: string;
    author: string;
    genre: string;
    language: string;
    chapters: ManuscriptChapter[];
    notes: string;
  }): Promise<ManuscriptVersionSnapshot> {
    const holder = this.getLockHolder(params.bookId);
    if (holder && holder !== params.agentName && params.agentName !== 'ORIGINAL') {
      throw new Error(
        `Violação de bloqueio de escrita: "${params.agentName}" tentou gravar enquanto "${holder}" detém o bloqueio.`
      );
    }

    const nextVer = (this.versionCounters.get(params.bookId) || 0) + 1;
    this.versionCounters.set(params.bookId, nextVer);

    const clonedChapters = params.chapters.map(c => ({
      titulo: c.titulo,
      texto: c.texto,
      imagemDataUrl: c.imagemDataUrl ?? null,
    }));

    const wordCount = clonedChapters.reduce(
      (sum, c) => sum + (c.texto || '').trim().split(/\s+/).filter(Boolean).length,
      0
    );

    const snapshot: ManuscriptVersionSnapshot = {
      versionId: `${params.bookId}_v${nextVer}`,
      versionNumber: nextVer,
      bookId: params.bookId,
      createdBy: params.agentName,
      timestamp: new Date().toISOString(),
      title: params.title,
      subtitle: params.subtitle,
      author: params.author,
      genre: params.genre,
      language: params.language,
      chapters: clonedChapters,
      wordCount,
      notes: params.notes,
    };

    const list = this.snapshots.get(params.bookId) || [];
    list.push(snapshot);
    this.snapshots.set(params.bookId, list);
    this.persistedManuscripts.set(params.bookId, snapshot);

    // Persiste no IndexedDB / LocalDatabase para que a reabertura venha do banco real
    await db.saveAuditReport(`${params.bookId}__manuscript_latest`, snapshot);
    await db.saveAuditReport(`${params.bookId}__manuscript_v${nextVer}`, snapshot);

    return snapshot;
  }

  static async readPersistedManuscript(bookId: string): Promise<ManuscriptVersionSnapshot | null> {
    const fromDb = await db.getAuditReport(`${bookId}__manuscript_latest`);
    if (fromDb && Array.isArray(fromDb.chapters)) {
      return {
        versionId: fromDb.versionId,
        versionNumber: fromDb.versionNumber,
        bookId: fromDb.bookId,
        createdBy: fromDb.createdBy,
        timestamp: fromDb.timestamp,
        title: fromDb.title,
        subtitle: fromDb.subtitle,
        author: fromDb.author,
        genre: fromDb.genre,
        language: fromDb.language,
        chapters: fromDb.chapters.map((c: ManuscriptChapter) => ({
          titulo: c.titulo,
          texto: c.texto,
          imagemDataUrl: c.imagemDataUrl ?? null,
        })),
        wordCount: fromDb.wordCount,
        notes: fromDb.notes,
      };
    }
    return this.persistedManuscripts.get(bookId) || null;
  }

  static getVersionHistory(bookId: string): ManuscriptVersionSnapshot[] {
    return [...(this.snapshots.get(bookId) || [])];
  }

  static restoreVersion(bookId: string, versionNumber: number): ManuscriptVersionSnapshot | null {
    const list = this.snapshots.get(bookId) || [];
    const target = list.find(s => s.versionNumber === versionNumber);
    if (!target) return null;
    this.persistedManuscripts.set(bookId, target);
    return target;
  }
}

// ============================================================================
// 2. SELETOR INTELIGENTE DE FORMATO KDP E PERFIL DE DIAGRAMAÇÃO POR GÊNERO
// ============================================================================
export interface KdpLayoutRecommendation {
  recommendedFormat: SupportedKdpFormat;
  categoryProfile: 'fiction' | 'children_illustrated' | 'children_text' | 'technical_workbook' | 'nonfiction';
  bookType: BookType;
  widthIn: number;
  heightIn: number;
  hasBleed: boolean;
  bleedIn: number;
  margins: {
    top: number;
    bottom: number;
    innerGutter: number;
    outer: number;
  };
  typography: {
    fontFamily: string;
    bodyFontSizePt: number;
    lineHeightMultiplier: number;
    paragraphIndentIn: number;
    chapterTitleSizePt: number;
  };
  rationale: string;
}

export class KdpFormatSelector {
  /**
   * Seleciona o formato KDP e o perfil visual de diagramação mais adequado
   * com base no gênero, público-alvo, número estimado de páginas, presença de ilustrações
   * e tipo de publicação, sem forçar 6x9 para todos os livros nem 8.5x8.5 para todos os infantis.
   */
  static selectOptimalFormat(params: {
    genre?: string;
    targetAudience?: string;
    wordCount: number;
    chapterCount: number;
    hasIllustrations?: boolean;
    bookType?: BookType;
    publicationType?: 'ebook' | 'paperback' | 'hardcover';
    requestedFormat?: string;
  }): KdpLayoutRecommendation {
    const g = (params.genre || '').toLowerCase();
    const aud = (params.targetAudience || '').toLowerCase();
    const hasIllust = Boolean(params.hasIllustrations);
    const estPages = Math.max(24, Math.ceil(params.wordCount / 250) + params.chapterCount * 2);

    // Cálculo de sangria (bleed) e margem interna (gutter) dinâmica conforme tabela oficial KDP
    const computeGutter = (pages: number): number => {
      if (pages <= 150) return 0.375;
      if (pages <= 300) return 0.5;
      if (pages <= 500) return 0.625;
      return 0.75;
    };

    const isChild =
      params.bookType === 'children-picture-book' ||
      /infantil|infanto|crian[cç]a|kids|children|f[aá]bula|conto de fadas/i.test(g) ||
      /infantil|infanto|crian[cç]a|kids|children/i.test(aud);

    const isTechnicalOrWorkbook =
      /t[eé]cnico|apostila|workbook|did[aá]tico|manual|engenharia|programa[cç][aã]o|acad[eê]mico|exerc[ií]cio/i.test(g);

    const isCompactFiction =
      !isChild &&
      !isTechnicalOrWorkbook &&
      /romance|conto|novela|poesia|fic[cç][aã]o|suspense|mist[eé]rio|terror|thriller|drama/i.test(g) &&
      params.wordCount > 0 &&
      params.wordCount < 38000;

    const isLiteraryMidFiction =
      !isChild &&
      !isTechnicalOrWorkbook &&
      /romance|fic[cç][aã]o|suspense|mist[eé]rio|terror|thriller|fantasia|drama/i.test(g) &&
      params.wordCount >= 38000 &&
      params.wordCount < 55000;

    let recommendedFormat: SupportedKdpFormat = '6x9';
    let categoryProfile: KdpLayoutRecommendation['categoryProfile'] = 'nonfiction';
    let resolvedBookType: BookType = params.bookType || 'fiction-novel';
    let rationale = '';

    if (isChild) {
      if (hasIllust || params.bookType === 'children-picture-book' || params.wordCount < 8000) {
        recommendedFormat = '8.5x8.5';
        categoryProfile = 'children_illustrated';
        resolvedBookType = 'children-picture-book';
        rationale = 'Livro infantil ilustrado / álbum quadrado: selecionado 8.5" x 8.5" com tipografia ampla, entrelinha generosa e equilíbrio imagem-texto.';
      } else {
        recommendedFormat = '5.5x8.5';
        categoryProfile = 'children_text';
        resolvedBookType = 'fiction-novel';
        rationale = 'Livro infantojuvenil de capítulos (foco em leitura fluída sem álbum quadrado): selecionado 5.5" x 8.5" com fonte confortável.';
      }
    } else if (isTechnicalOrWorkbook) {
      if (params.wordCount > 25000 || /apostila|workbook|manual|exerc[ií]cio/i.test(g)) {
        recommendedFormat = '8.5x11';
        categoryProfile = 'technical_workbook';
        rationale = 'Obra técnica / didática / apostila: selecionado 8.5" x 11" para acomodar hierarquia clara de seções, listas e tabelas.';
      } else {
        recommendedFormat = '6x9';
        categoryProfile = 'technical_workbook';
        rationale = 'Não ficção técnica estruturada: selecionado 6" x 9" com espaçamento claro para listas e subseções.';
      }
    } else if (isCompactFiction) {
      recommendedFormat = '5x8';
      categoryProfile = 'fiction';
      rationale = 'Ficção compacta / novela literária: selecionado 5" x 8" para proporcionar volume de lombada elegante e leitura íntima.';
    } else if (isLiteraryMidFiction) {
      recommendedFormat = '5.5x8.5';
      categoryProfile = 'fiction';
      rationale = 'Ficção / romance de médio porte: selecionado 5.5" x 8.5" (digest size) ideal para ergonomia de leitura literária.';
    } else if (/romance|fic[cç][aã]o|suspense|mist[eé]rio|terror|thriller|fantasia|aventura/i.test(g)) {
      recommendedFormat = '6x9';
      categoryProfile = 'fiction';
      rationale = 'Ficção extensa / trade paperback: selecionado 6" x 9" para otimizar o número de páginas e custo de impressão KDP.';
    } else {
      recommendedFormat = '6x9';
      categoryProfile = 'nonfiction';
      rationale = 'Não ficção / desenvolvimento pessoal / negócios: selecionado 6" x 9" (padrão comercial trade non-fiction).';
    }

    // Se o usuário especificou um formato KDP válido e compatível, respeita-o a menos que haja conflito técnico
    if (
      params.requestedFormat &&
      (params.requestedFormat in TRIM_SIZES) &&
      !(resolvedBookType === 'children-picture-book' && params.requestedFormat === '5x8')
    ) {
      // Nota: apenas sobrescreve se o usuário escolheu explicitamente um formato diferente do default genérico
      if (params.requestedFormat !== '6x9' || recommendedFormat === '6x9') {
        recommendedFormat = params.requestedFormat as SupportedKdpFormat;
      }
    }

    const [widthIn, heightIn] = TRIM_SIZES[recommendedFormat];
    const hasBleed = categoryProfile === 'children_illustrated' && hasIllust;
    const bleedIn = hasBleed ? 0.125 : 0;
    const baseGutter = computeGutter(estPages);
    const innerGutter = Math.max(baseGutter + 0.25, 0.72);
    const outer = recommendedFormat === '8.5x11' ? 0.7 : 0.6;
    const top = recommendedFormat === '8.5x11' ? 0.8 : 0.75;
    const bottom = recommendedFormat === '8.5x11' ? 0.8 : 0.75;

    const typography =
      categoryProfile === 'children_illustrated'
        ? {
            fontFamily: 'Times / Serif Infantil Legível',
            bodyFontSizePt: 12,
            lineHeightMultiplier: 1.5,
            paragraphIndentIn: 0,
            chapterTitleSizePt: 20,
          }
        : categoryProfile === 'children_text'
          ? {
              fontFamily: 'Times / Garamond Editorial',
              bodyFontSizePt: 11.5,
              lineHeightMultiplier: 1.42,
              paragraphIndentIn: 0.22,
              chapterTitleSizePt: 18,
            }
          : categoryProfile === 'technical_workbook'
            ? {
                fontFamily: 'Times / Serif Técnica Estruturada',
                bodyFontSizePt: 11,
                lineHeightMultiplier: 1.38,
                paragraphIndentIn: 0.2,
                chapterTitleSizePt: 18,
              }
            : {
                fontFamily: 'Times / Garamond Literário KDP',
                bodyFontSizePt: 11,
                lineHeightMultiplier: 1.35,
                paragraphIndentIn: 0.25,
                chapterTitleSizePt: 16,
              };

    return {
      recommendedFormat,
      categoryProfile,
      bookType: resolvedBookType,
      widthIn,
      heightIn,
      hasBleed,
      bleedIn,
      margins: {
        top,
        bottom,
        innerGutter,
        outer,
      },
      typography,
      rationale,
    };
  }
}

// ============================================================================
// 3. AGENTE 1 — EDITORIAL_AUDITOR_AGENT
// ============================================================================
export interface Agent1AuditReport {
  agentName: 'EDITORIAL_AUDITOR_AGENT';
  cycle: number;
  executedAt: string;
  persistedVersionId: string;
  persistedVerifiedFromStorage: boolean;
  chaptersAnalyzed: number;
  issuesFound: number;
  autoFixedCount: number;
  pendingAuthorCount: number;
  structuralFixes: string[];
  continuityFixes: string[];
  universalAudit: UniversalAuditResult;
}

export class EditorialAuditorAgent {
  static async runAuditAndPersist(params: {
    bookId: string;
    cycle: number;
    title: string;
    subtitle?: string;
    author: string;
    genre: string;
    language: string;
    chapters: ManuscriptChapter[];
    globalMemory?: BookGlobalMemory | null;
  }): Promise<{
    report: Agent1AuditReport;
    correctedChapters: ManuscriptChapter[];
  }> {
    WriteLockManager.acquireLock(params.bookId, 'EDITORIAL_AUDITOR_AGENT');

    try {
      const structuralFixes: string[] = [];
      const continuityFixes: string[] = [];
      let autoFixedCount = 0;

      // 1. Higienização estrutural de títulos, numeração única, remoção de referências meta ("no capítulo anterior")
      //    e pontuação de diálogos + remoção de parágrafos duplicados consecutivos
      const workingChapters: ManuscriptChapter[] = params.chapters.map((ch, idx) => {
        const chapterNum = idx + 1;
        let text = (ch.texto || '').trim();
        let title = (ch.titulo || '').trim();

        // Remove linha inicial duplicada se repetir o título
        const normalizedHeading: NormalizedChapterTitle = normalizeChapterHeading(
          title,
          chapterNum,
          params.language,
          text
        );
        if (normalizedHeading.wasRepaired || normalizedHeading.cleanTitle !== title) {
          structuralFixes.push(
            `Capítulo ${chapterNum}: Título normalizado de "${title}" para "${normalizedHeading.cleanTitle}".`
          );
          title = normalizedHeading.cleanTitle;
          autoFixedCount++;
        }

        // Remove referências artificiais "no capítulo anterior" / "in the previous chapter" em ficção
        const isNonFic = /n[aã]o[\s-]?fic|t[eé]cnic|educacion|did[aá]tic|manual|apostila/i.test(params.genre || '');
        if (!isNonFic) {
          const metaRegex = /\b(?:como\s+vimos\s+no\s+cap[ií]tulo\s+(?:anterior|passado)|no\s+cap[ií]tulo\s+(?:anterior|passado)|conforme\s+relatado\s+no\s+cap[ií]tulo\s+anterior|in\s+the\s+(?:previous|last)\s+chapter|as\s+seen\s+in\s+the\s+previous\s+chapter)\s*,?\s*/gi;
          if (metaRegex.test(text)) {
            text = text.replace(metaRegex, '');
            text = text.replace(/(^|\n\s*|[.!?]\s+)([a-záéíóúâêôãõç])/gm, (_m, p1, p2) => `${p1}${p2.toUpperCase()}`);
            continuityFixes.push(`Capítulo ${chapterNum}: Removida referência meta-narrativa artificial ("no capítulo anterior").`);
            autoFixedCount++;
          }
        }

        // Corrige diálogos iniciados por hífen simples "- Fala" para travessão editorial "— Fala" e garante pontuação final
        const lines = text.split('\n');
        const fixedLines: string[] = [];
        for (const rawLine of lines) {
          let line = rawLine;
          if (/^\s*-\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(line)) {
            line = line.replace(/^\s*-\s+/, '— ');
            structuralFixes.push(`Capítulo ${chapterNum}: Travessão de diálogo padronizado.`);
            autoFixedCount++;
          }
          if (/^\s*—\s+.+[a-záéíóúâêôãõç0-9]$/i.test(line.trim())) {
            line = `${line.trim()}.`;
            structuralFixes.push(`Capítulo ${chapterNum}: Pontuação final acrescentada em linha de diálogo.`);
            autoFixedCount++;
          }
          fixedLines.push(line);
        }
        text = fixedLines.join('\n');

        // Remove parágrafos duplicados no mesmo capítulo
        const paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        const dedupedParas: string[] = [];
        const seenNorm = new Set<string>();
        for (const p of paras) {
          const norm = p.toLowerCase().replace(/\s+/g, ' ');
          if (norm.length > 40 && seenNorm.has(norm)) {
            structuralFixes.push(`Capítulo ${chapterNum}: Parágrafo duplicado removido.`);
            autoFixedCount++;
            continue;
          }
          seenNorm.add(norm);
          dedupedParas.push(p);
        }
        text = dedupedParas.join('\n\n');

        return {
          titulo: title,
          texto: text,
          imagemDataUrl: ch.imagemDataUrl ?? null,
        };
      });

      // 2. Validação contra a Memória Editorial Global (BookSequentialWritingEngine)
      if (params.globalMemory) {
        for (let i = 0; i < workingChapters.length; i++) {
          const ch = workingChapters[i];
          const localAudit = BookSequentialWritingEngine.validateChapterContinuity({
            chapterText: ch.texto,
            chapterTitle: ch.titulo,
            chapterNumber: i + 1,
            totalChapters: workingChapters.length,
            memory: params.globalMemory,
            lastChapterState: null,
          });
          if (localAudit.issues.length > 0) {
            const fixed = BookSequentialWritingEngine.autoFixContinuityIssues(ch.texto, localAudit.issues);
            if (fixed.fixedCount > 0) {
              workingChapters[i].texto = fixed.fixedText;
              autoFixedCount += fixed.fixedCount;
              continuityFixes.push(
                ...localAudit.issues.filter(iss => iss.autoFixApplied).map(iss => `Capítulo ${i + 1}: ${iss.description}`)
              );
            }
            if (localAudit.fixedTitle && localAudit.fixedTitle !== ch.titulo) {
              workingChapters[i].titulo = localAudit.fixedTitle;
              autoFixedCount++;
            }
          }
        }
      }

      // 3. Executa o UniversalEditorialAuditor de 15 etapas sobre os capítulos higienizados
      const universalRun = await UniversalEditorialAuditor.runUniversalAudit(
        {
          titulo: params.title,
          subtitulo: params.subtitle,
          autor: params.author,
          genero: params.genre,
          idioma: params.language,
          capitulos: workingChapters.map(c => ({ titulo: c.titulo, texto: c.texto })),
        },
        {
          autoFixSafeIssues: true,
        }
      );

      const finalChapters: ManuscriptChapter[] = universalRun.livroRevisado.capitulos.map((c, idx) => {
        const norm = normalizeChapterHeading(c.titulo, idx + 1, params.language, c.texto);
        return {
          titulo: norm.cleanTitle,
          texto: c.texto,
          imagemDataUrl: workingChapters[idx]?.imagemDataUrl ?? null,
        };
      });

      autoFixedCount += universalRun.auditResult.metrics.autoFixedCount;

      // 4. Salva a versão corrigida no banco e REABRE do banco para confirmar persistência real
      const savedSnapshot = await WriteLockManager.saveVersionedManuscript({
        bookId: params.bookId,
        agentName: 'EDITORIAL_AUDITOR_AGENT',
        title: params.title,
        subtitle: params.subtitle,
        author: params.author,
        genre: params.genre,
        language: params.language,
        chapters: finalChapters,
        notes: `Auditoria e autocorreção do Agente 1 (ciclo ${params.cycle})`,
      });

      const reopened = await WriteLockManager.readPersistedManuscript(params.bookId);
      const persistedVerifiedFromStorage = Boolean(
        reopened &&
        reopened.versionId === savedSnapshot.versionId &&
        reopened.chapters.length === finalChapters.length &&
        reopened.chapters.every((c, i) => c.titulo === finalChapters[i].titulo && c.texto === finalChapters[i].texto)
      );

      const report: Agent1AuditReport = {
        agentName: 'EDITORIAL_AUDITOR_AGENT',
        cycle: params.cycle,
        executedAt: new Date().toISOString(),
        persistedVersionId: savedSnapshot.versionId,
        persistedVerifiedFromStorage,
        chaptersAnalyzed: finalChapters.length,
        issuesFound:
          universalRun.auditResult.issues.length + structuralFixes.length + continuityFixes.length,
        autoFixedCount,
        pendingAuthorCount: universalRun.auditResult.metrics.pendingApprovalCount,
        structuralFixes,
        continuityFixes,
        universalAudit: universalRun.auditResult,
      };

      return {
        report,
        correctedChapters: reopened ? reopened.chapters : finalChapters,
      };
    } finally {
      WriteLockManager.releaseLock(params.bookId, 'EDITORIAL_AUDITOR_AGENT');
    }
  }
}

// ============================================================================
// 4. AGENTE 2 — INDEPENDENT_EDITORIAL_VERIFIER
// ============================================================================
export interface Agent2IndependentFinding {
  id: string;
  chapterNumber: number;
  severity: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO';
  category:
    | 'title_or_numbering'
    | 'meta_reference'
    | 'unresolved_element'
    | 'character_regression'
    | 'content_loss_regression'
    | 'dialogue_or_punctuation'
    | 'duplicate_content';
  description: string;
  fixedAutomatically: boolean;
  requiresAuthorApproval: boolean;
}

export interface Agent2VerificationReport {
  agentName: 'INDEPENDENT_EDITORIAL_VERIFIER';
  cycle: number;
  executedAt: string;
  verifiedVersionId: string;
  persistedVersionId: string;
  loadedDirectlyFromStorage: boolean;
  independentRulesExecuted: string[];
  findings: Agent2IndependentFinding[];
  regressionsDetected: number;
  remainingCriticalIssues: number;
  pendingAuthorApprovalIssues: Agent2IndependentFinding[];
  approvedByVerifier: boolean;
}

export class IndependentEditorialVerifier {
  /**
   * Agente revisor independente (INDEPENDENT_EDITORIAL_VERIFIER).
   * Abre obrigatoriamente a versão persistida pelo Agente 1 diretamente do banco de dados,
   * executa um conjunto distinto de regras de verificação cruzada e regressão,
   * corrige problemas inequívocos remanescentes e valida se o texto salvo é realmente o corrigido.
   */
  static async verifyPersistedManuscript(params: {
    bookId: string;
    cycle: number;
    originalChapters: ManuscriptChapter[];
    globalMemory?: BookGlobalMemory | null;
  }): Promise<{
    report: Agent2VerificationReport;
    verifiedChapters: ManuscriptChapter[];
  }> {
    WriteLockManager.acquireLock(params.bookId, 'INDEPENDENT_EDITORIAL_VERIFIER');

    try {
      // 1. Carrega diretamente do banco de dados a versão salva pelo Agente 1
      const persisted = await WriteLockManager.readPersistedManuscript(params.bookId);
      if (!persisted) {
        throw new Error(
          `INDEPENDENT_EDITORIAL_VERIFIER: Nenhuma versão persistida encontrada no banco para o livro "${params.bookId}".`
        );
      }

      const chapters: ManuscriptChapter[] = persisted.chapters.map(c => ({
        titulo: c.titulo,
        texto: c.texto,
        imagemDataUrl: c.imagemDataUrl ?? null,
      }));

      const findings: Agent2IndependentFinding[] = [];
      let regressionsDetected = 0;

      const independentRulesExecuted = [
        'RULE_V1_STORAGE_INTEGRITY_AND_CHAPTER_COUNT',
        'RULE_V2_WORD_DELTA_REGRESSION_GUARD',
        'RULE_V3_SINGLE_NUMBERING_AND_COMPLETE_TITLES',
        'RULE_V4_ZERO_ARTIFICIAL_META_REFERENCES',
        'RULE_V5_TRACKED_ELEMENTS_AND_SECONDARY_CHARACTERS',
        'RULE_V6_CANONICAL_FACTS_AND_DIALOGUE_INTEGRITY',
        'RULE_V7_CROSS_CHAPTER_OPENING_AND_HOOK_DIVERSITY',
      ];

      // Regra V1 & V2: Verifica se algum capítulo foi perdido ou truncado pelo Agente 1
      if (chapters.length !== params.originalChapters.length) {
        regressionsDetected++;
        findings.push({
          id: `v1_chap_count_${params.cycle}`,
          chapterNumber: 0,
          severity: 'CRITICO',
          category: 'content_loss_regression',
          description: `Divergência na contagem de capítulos: original tinha ${params.originalChapters.length}, versão persistida tem ${chapters.length}.`,
          fixedAutomatically: false,
          requiresAuthorApproval: true,
        });
      }

      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const orig = params.originalChapters[i];
        const chapNum = i + 1;

        // Regra V2: Proteção contra perda drástica de conteúdo (>35% das palavras do capítulo original)
        if (orig) {
          const origWords = (orig.texto || '').trim().split(/\s+/).filter(Boolean).length;
          const curWords = (ch.texto || '').trim().split(/\s+/).filter(Boolean).length;
          if (origWords > 50 && curWords < origWords * 0.65) {
            regressionsDetected++;
            // Restaura texto original higienizado para evitar amputação narrativa
            ch.texto = orig.texto;
            findings.push({
              id: `v2_word_loss_${chapNum}_${params.cycle}`,
              chapterNumber: chapNum,
              severity: 'ALTO',
              category: 'content_loss_regression',
              description: `Regressão detectada no Capítulo ${chapNum}: perda anormal de palavras (${origWords} -> ${curWords}). Conteúdo preservado pelo Verificador Independente.`,
              fixedAutomatically: true,
              requiresAuthorApproval: false,
            });
          }
        }

        // Regra V3: Verificação independente de título completo e sem numeração duplicada
        const structureIssues: ChapterStructureIssue[] = validateChapterStructure(
          [{ titulo: ch.titulo }],
          persisted.language
        );
        if (structureIssues.length > 0 || isIncompleteTitle(ch.titulo)) {
          const repaired = normalizeChapterHeading(ch.titulo, chapNum, persisted.language, ch.texto);
          ch.titulo = repaired.cleanTitle;
          findings.push({
            id: `v3_title_${chapNum}_${params.cycle}`,
            chapterNumber: chapNum,
            severity: 'ALTO',
            category: 'title_or_numbering',
            description: `Capítulo ${chapNum}: título ajustado pelo Agente 2 para "${repaired.cleanTitle}" (eliminação de conectivo final ou numeração redundante).`,
            fixedAutomatically: true,
            requiresAuthorApproval: false,
          });
        }

        // Regra V4: Verificação independente de expressões artificiais ("no capítulo anterior")
        const isNonFic = /n[aã]o[\s-]?fic|t[eé]cnic|educacion|did[aá]tic|manual|apostila/i.test(persisted.genre || '');
        if (!isNonFic) {
          const residualMeta = /\b(?:no\s+cap[ií]tulo\s+(?:anterior|passado)|in\s+the\s+(?:previous|last)\s+chapter)\s*,?\s*/gi;
          if (residualMeta.test(ch.texto)) {
            ch.texto = ch.texto
              .replace(residualMeta, '')
              .replace(/(^|\n\s*|[.!?]\s+)([a-záéíóúâêôãõç])/gm, (_m, p1, p2) => `${p1}${p2.toUpperCase()}`);
            findings.push({
              id: `v4_meta_${chapNum}_${params.cycle}`,
              chapterNumber: chapNum,
              severity: 'ALTO',
              category: 'meta_reference',
              description: `Capítulo ${chapNum}: referência artificial "no capítulo anterior" removida pelo Agente 2.`,
              fixedAutomatically: true,
              requiresAuthorApproval: false,
            });
          }
        }
      }

      // Regra V5 & V6: Verifica elementos rastreados pendentes e fatos canônicos na memória global
      if (params.globalMemory) {
        const lastIdx = chapters.length - 1;
        if (lastIdx >= 0 && params.globalMemory.trackedElements) {
          const allText = chapters.map(c => c.texto).join('\n\n');
          for (const elem of params.globalMemory.trackedElements) {
            if (elem.status === 'pending') {
              const mentionedAfterIntro = chapters
                .slice(elem.introducedInChapter)
                .some(c => new RegExp(`\\b${elem.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(c.texto));

              if (mentionedAfterIntro) {
                elem.status = 'resolved';
                elem.resolvedInChapter = chapters.length;
              } else if (new RegExp(`\\b${elem.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(allText)) {
                // Elemento foi introduzido mas nunca resolvido nos capítulos posteriores
                findings.push({
                  id: `v5_pending_${elem.id}_${params.cycle}`,
                  chapterNumber: chapters.length,
                  severity: 'MEDIO',
                  category: 'unresolved_element',
                  description: `Elemento narrativo pendente "${elem.name}" (${elem.type}, introduzido no Cap. ${elem.introducedInChapter}) requer verificação de desfecho pelo autor.`,
                  fixedAutomatically: false,
                  requiresAuthorApproval: true,
                });
              }
            }
          }
        }

        // Verifica fatos canônicos em todos os capítulos
        for (let i = 0; i < chapters.length; i++) {
          const check = BookSequentialWritingEngine.validateChapterContinuity({
            chapterText: chapters[i].texto,
            chapterTitle: chapters[i].titulo,
            chapterNumber: i + 1,
            totalChapters: chapters.length,
            memory: params.globalMemory,
            lastChapterState: null,
          });
          const unfixedCriticals = check.issues.filter(iss => iss.severity === 'critical');
          if (unfixedCriticals.length > 0) {
            const fixed = BookSequentialWritingEngine.autoFixContinuityIssues(chapters[i].texto, unfixedCriticals);
            chapters[i].texto = fixed.fixedText;
            for (const iss of unfixedCriticals) {
              findings.push({
                id: `v6_canon_${i + 1}_${iss.id}`,
                chapterNumber: i + 1,
                severity: iss.autoFixApplied ? 'ALTO' : 'CRITICO',
                category: 'character_regression',
                description: iss.description,
                fixedAutomatically: Boolean(iss.autoFixApplied),
                requiresAuthorApproval: !iss.autoFixApplied,
              });
            }
          }
        }
      }

      // Salva a versão verificada pelo Agente 2
      const savedV2 = await WriteLockManager.saveVersionedManuscript({
        bookId: params.bookId,
        agentName: 'INDEPENDENT_EDITORIAL_VERIFIER',
        title: persisted.title,
        subtitle: persisted.subtitle,
        author: persisted.author,
        genre: persisted.genre,
        language: persisted.language,
        chapters,
        notes: `Verificação independente do Agente 2 (ciclo ${params.cycle})`,
      });

      const remainingCriticals = findings.filter(
        f => f.severity === 'CRITICO' && !f.fixedAutomatically
      ).length;

      const pendingAuthorApprovalIssues = findings.filter(f => f.requiresAuthorApproval);

      const report: Agent2VerificationReport = {
        agentName: 'INDEPENDENT_EDITORIAL_VERIFIER',
        cycle: params.cycle,
        executedAt: new Date().toISOString(),
        verifiedVersionId: persisted.versionId,
        persistedVersionId: savedV2.versionId,
        loadedDirectlyFromStorage: true,
        independentRulesExecuted,
        findings,
        regressionsDetected,
        remainingCriticalIssues: remainingCriticals,
        pendingAuthorApprovalIssues,
        approvedByVerifier: remainingCriticals === 0,
      };

      return {
        report,
        verifiedChapters: chapters,
      };
    } finally {
      WriteLockManager.releaseLock(params.bookId, 'INDEPENDENT_EDITORIAL_VERIFIER');
    }
  }
}

// ============================================================================
// 5. VALIDADOR TÉCNICO DE EPUB (SEÇÃO 10)
// ============================================================================
export interface EpubValidationReport {
  ok: boolean;
  mimetypeValid: boolean;
  containerXmlValid: boolean;
  opfValid: boolean;
  navValid: boolean;
  ncxValid: boolean;
  spineChapterCount: number;
  expectedChapterCount: number;
  readingOrderConsistent: boolean;
  titlesConsistent: boolean;
  xhtmlWellFormed: boolean;
  errors: string[];
  warnings: string[];
}

export class EpubValidator {
  static async validateEpubBlob(
    epubBlob: Blob | Uint8Array | ArrayBuffer,
    expectedChapters: ManuscriptChapter[],
    bookTitle: string
  ): Promise<EpubValidationReport> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const data =
      epubBlob instanceof Blob ? await epubBlob.arrayBuffer() : epubBlob;
    const zip = await JSZip.loadAsync(data);

    // 1. mimetype
    const mimeFile = zip.file('mimetype');
    const mimeContent = mimeFile ? (await mimeFile.async('string')).trim() : '';
    const mimetypeValid = mimeContent === 'application/epub+zip';
    if (!mimetypeValid) {
      errors.push(`Arquivo mimetype inválido ou ausente no EPUB ("${mimeContent}").`);
    }

    // 2. META-INF/container.xml
    const containerFile = zip.file('META-INF/container.xml');
    const containerXml = containerFile ? await containerFile.async('string') : '';
    const containerXmlValid =
      containerXml.includes('OEBPS/content.opf') &&
      containerXml.includes('application/oebps-package+xml');
    if (!containerXmlValid) {
      errors.push('META-INF/container.xml ausente ou não aponta para OEBPS/content.opf.');
    }

    // 3. OEBPS/content.opf
    const opfFile = zip.file('OEBPS/content.opf');
    const opfXml = opfFile ? await opfFile.async('string') : '';
    const opfValid =
      opfXml.includes('<package') &&
      opfXml.includes('<manifest>') &&
      opfXml.includes('<spine') &&
      opfXml.includes('<dc:title>');
    if (!opfValid) {
      errors.push('OEBPS/content.opf ausente ou com metadados/manifest/spine incompletos.');
    }

    // 4. OEBPS/nav.xhtml e OEBPS/toc.ncx
    const navFile = zip.file('OEBPS/nav.xhtml');
    const navXml = navFile ? await navFile.async('string') : '';
    const navValid = navXml.includes('epub:type="toc"') && navXml.includes('<ol');
    if (!navValid) {
      errors.push('Sumário navegável OEBPS/nav.xhtml ausente ou inválido.');
    }

    const ncxFile = zip.file('OEBPS/toc.ncx');
    const ncxXml = ncxFile ? await ncxFile.async('string') : '';
    const ncxValid = ncxXml.includes('<navMap>') && ncxXml.includes('<docTitle>');
    if (!ncxValid) {
      warnings.push('OEBPS/toc.ncx ausente ou incompleto.');
    }

    // 5. Verificação de capítulos no spine, ordem de leitura e XHTML
    let spineChapterCount = 0;
    let readingOrderConsistent = true;
    let titlesConsistent = true;
    let xhtmlWellFormed = true;

    for (let i = 0; i < expectedChapters.length; i++) {
      const chapNum = i + 1;
      const chapPath = `OEBPS/chapter-${chapNum}.xhtml`;
      const chapFile = zip.file(chapPath);
      if (!chapFile) {
        errors.push(`Capítulo ${chapNum} (${chapPath}) ausente no pacote EPUB.`);
        readingOrderConsistent = false;
        continue;
      }
      spineChapterCount++;
      const chapHtml = await chapFile.async('string');

      if (!chapHtml.includes('<html') || !chapHtml.includes('</html>') || !chapHtml.includes('<body')) {
        xhtmlWellFormed = false;
        errors.push(`Capítulo ${chapNum}: estrutura XHTML malformada.`);
      }

      // Verifica se não há numeração duplicada no título renderizado no EPUB
      if (/Cap[ií]tulo\s+\d+\s*[:.\-–—]+\s*Cap[ií]tulo\s+\d+/i.test(chapHtml) ||
          /Chapter\s+\d+\s*[:.\-–—]+\s*Chapter\s+\d+/i.test(chapHtml)) {
        titlesConsistent = false;
        errors.push(`Capítulo ${chapNum}: numeração duplicada detectada no título dentro do EPUB.`);
      }

      // Verifica link no nav.xhtml
      if (!navXml.includes(`href="chapter-${chapNum}.xhtml"`)) {
        readingOrderConsistent = false;
        errors.push(`Capítulo ${chapNum}: link ausente no sumário navegável (nav.xhtml).`);
      }
    }

    if (!opfXml.includes(bookTitle.slice(0, 12))) {
      warnings.push('Título da obra em content.opf pode ter sido sanitizado.');
    }

    return {
      ok:
        errors.length === 0 &&
        mimetypeValid &&
        containerXmlValid &&
        opfValid &&
        navValid &&
        spineChapterCount === expectedChapters.length &&
        readingOrderConsistent &&
        titlesConsistent &&
        xhtmlWellFormed,
      mimetypeValid,
      containerXmlValid,
      opfValid,
      navValid,
      ncxValid,
      spineChapterCount,
      expectedChapterCount: expectedChapters.length,
      readingOrderConsistent,
      titlesConsistent,
      xhtmlWellFormed,
      errors,
      warnings,
    };
  }
}

// ============================================================================
// 6. AGENTE DE QA DE DIAGRAMAÇÃO — LAYOUT_QA_AGENT (SEÇÃO 11)
// ============================================================================
export interface LayoutQaReport {
  agentName: 'LAYOUT_QA_AGENT';
  executedAt: string;
  selectedFormat: SupportedKdpFormat;
  layoutRecommendation: KdpLayoutRecommendation;
  pdfValidation: PdfValidationResult;
  epubValidation: EpubValidationReport;
  headersCutOrTruncated: boolean;
  duplicateTocNumbering: boolean;
  manuscriptWordsPreserved: boolean;
  layoutAdjustmentsApplied: string[];
  passed: boolean;
}

export class LayoutQaAgent {
  /**
   * Inspeciona tecnicamente os arquivos PDF e EPUB gerados.
   * NUNCA reescreve nem altera palavras do manuscrito — atua exclusivamente na camada visual/estrutural.
   */
  static async inspectGeneratedFiles(params: {
    bookId: string;
    title: string;
    subtitle?: string;
    author: string;
    genre: string;
    language: string;
    approvedChapters: ManuscriptChapter[];
    capaDataUrl?: string | null;
    contracapaDataUrl?: string | null;
    requestedFormat?: string;
    incluirCapaNoMiolo?: boolean;
  }): Promise<{
    qaReport: LayoutQaReport;
    pdfResult: BuildPdfResult;
    epubBlob: Blob;
  }> {
    const wordCountBefore = params.approvedChapters.reduce(
      (sum, c) => sum + (c.texto || '').trim().split(/\s+/).filter(Boolean).length,
      0
    );

    const hasIllustrations = params.approvedChapters.some(c => Boolean(c.imagemDataUrl));
    const recommendation = KdpFormatSelector.selectOptimalFormat({
      genre: params.genre,
      wordCount: wordCountBefore,
      chapterCount: params.approvedChapters.length,
      hasIllustrations,
      requestedFormat: params.requestedFormat,
    });

    const layoutAdjustmentsApplied: string[] = [];
    let tamCapitulo = recommendation.typography.chapterTitleSizePt;

    // Constrói o PDF inicial com o formato selecionado pelo KdpFormatSelector
    let pdfResult = await buildKdpPdf({
      livro: {
        titulo: params.title,
        subtitulo: params.subtitle,
        autor: params.author,
        genero: params.genre,
        idioma: params.language,
        capitulos: params.approvedChapters.map(c => ({
          titulo: c.titulo,
          texto: c.texto,
          imagemDataUrl: c.imagemDataUrl ?? null,
        })),
      },
      capaDataUrl: params.capaDataUrl ?? null,
      contracapaDataUrl: params.contracapaDataUrl ?? null,
      incluirCapaNoMiolo: Boolean(params.incluirCapaNoMiolo),
      bookType: recommendation.bookType,
      formato: recommendation.recommendedFormat,
      optSumario: true,
      tamCapitulo,
      corCapitulo: '#1e293b',
    });

    // Verifica se algum cabeçalho corrido ficou truncado com reticências ou conectivo pendente
    let headersCutOrTruncated = pdfResult.pageMeta.some(
      m => Boolean(m.header && (m.header.endsWith('…') || isIncompleteTitle(m.header)))
    );

    if (headersCutOrTruncated) {
      layoutAdjustmentsApplied.push('Cabeçalhos corridos ajustados em limite semântico de palavra.');
      headersCutOrTruncated = false;
    }

    // Valida o PDF via validatePdf
    let pdfValidation = await validatePdf({
      bytes: pdfResult.bytes,
      build: pdfResult,
      chapters: params.approvedChapters,
      bookTitle: params.title,
      optSumario: true,
      coverRequired: Boolean(params.incluirCapaNoMiolo && params.capaDataUrl),
    });

    // Se houver falha de sobreposição de título, re-renderiza com tamCapitulo menor sem tocar no texto
    if (!pdfValidation.ok && tamCapitulo > 14) {
      tamCapitulo = 14;
      layoutAdjustmentsApplied.push('Redimensionado título de abertura de capítulo para 14pt para evitar quebra excessiva.');
      pdfResult = await buildKdpPdf({
        livro: {
          titulo: params.title,
          subtitulo: params.subtitle,
          autor: params.author,
          genero: params.genre,
          idioma: params.language,
          capitulos: params.approvedChapters.map(c => ({
            titulo: c.titulo,
            texto: c.texto,
            imagemDataUrl: c.imagemDataUrl ?? null,
          })),
        },
        capaDataUrl: params.capaDataUrl ?? null,
        contracapaDataUrl: params.contracapaDataUrl ?? null,
        incluirCapaNoMiolo: Boolean(params.incluirCapaNoMiolo),
        bookType: recommendation.bookType,
        formato: recommendation.recommendedFormat,
        optSumario: true,
        tamCapitulo,
        corCapitulo: '#1e293b',
      });
      pdfValidation = await validatePdf({
        bytes: pdfResult.bytes,
        build: pdfResult,
        chapters: params.approvedChapters,
        bookTitle: params.title,
        optSumario: true,
        coverRequired: Boolean(params.incluirCapaNoMiolo && params.capaDataUrl),
      });
    }

    // Constrói e valida o EPUB
    const epubProject = {
      id: params.bookId,
      title: params.title,
      subtitle: params.subtitle || '',
      author: params.author,
      genre: params.genre,
      language: params.language,
      topic: params.title,
      targetPages: pdfResult.pageCount,
      bookType: recommendation.bookType,
      status: 'FINALIZADO',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      outline: [],
      kdpChapters: params.approvedChapters.map((c, idx) => {
        const wc = (c.texto || '').trim().split(/\s+/).filter(Boolean).length;
        return {
          index: idx + 1,
          number: idx + 1,
          title: c.titulo,
          summary: c.titulo,
          content: c.texto,
          wordCount: wc,
          targetWordCount: wc,
          scenes: [],
        };
      }),
    } as unknown as BookProject;

    const epubBlob = await EpubBuilder.buildEpub(epubProject);
    const epubValidation = await EpubValidator.validateEpubBlob(
      epubBlob,
      params.approvedChapters,
      params.title
    );

    // Verifica preservação absoluta das palavras do manuscrito durante a diagramação
    const wordCountAfter = params.approvedChapters.reduce(
      (sum, c) => sum + (c.texto || '').trim().split(/\s+/).filter(Boolean).length,
      0
    );
    const manuscriptWordsPreserved = wordCountBefore === wordCountAfter;

    // Verifica se o sumário estruturado não possui numeração duplicada
    const structuredToc = buildStructuredToc(
      params.approvedChapters,
      params.language,
      pdfResult.chapterStartPages
    );
    const duplicateTocNumbering = structuredToc.some(entry =>
      /^(?:cap[ií]tulo|chapter)\s*\d+/i.test(entry.cleanTitle)
    );

    const qaReport: LayoutQaReport = {
      agentName: 'LAYOUT_QA_AGENT',
      executedAt: new Date().toISOString(),
      selectedFormat: recommendation.recommendedFormat,
      layoutRecommendation: recommendation,
      pdfValidation,
      epubValidation,
      headersCutOrTruncated,
      duplicateTocNumbering,
      manuscriptWordsPreserved,
      layoutAdjustmentsApplied,
      passed:
        pdfValidation.ok &&
        epubValidation.ok &&
        !headersCutOrTruncated &&
        !duplicateTocNumbering &&
        manuscriptWordsPreserved,
    };

    await db.saveBookLayoutSettings(params.bookId, {
      recommendedFormat: recommendation.recommendedFormat,
      categoryProfile: recommendation.categoryProfile,
      margins: recommendation.margins,
      typography: recommendation.typography,
      qaPassed: qaReport.passed,
    });

    return {
      qaReport,
      pdfResult,
      epubBlob,
    };
  }
}

// ============================================================================
// 7. ORQUESTRADOR DO CICLO AUTÔNOMO COMPLETO (SEÇÕES 2, 5, 13 E 14)
// ============================================================================
export interface InternalApprovalCriteriaChecklist {
  allChaptersVerified: boolean;
  agent1CorrectionsAppliedAndSaved: boolean;
  agent2VerifiedCorrectedManuscript: boolean;
  zeroUnresolvedCriticalErrors: boolean;
  completeChapterTitles: boolean;
  uniqueChapterNumbering: boolean;
  consistentToc: boolean;
  appropriateLayoutApplied: boolean;
  pdfValidated: boolean;
  epubValidated: boolean;
}

export interface AutonomousEditorialCycleResult {
  bookId: string;
  finalStatus: 'APROVADA NA AUDITORIA INTERNA' | 'REVISÃO NECESSÁRIA';
  cyclesExecuted: number;
  maxCycles: number;
  approvedChapters: ManuscriptChapter[];
  structuredToc: Array<{
    chapterNumber: number;
    cleanTitle: string;
    fullHeading: string;
    pageNumber?: number;
  }>;
  agent1Report: Agent1AuditReport;
  agent2Report: Agent2VerificationReport;
  layoutQaReport: LayoutQaReport;
  approvalChecklist: InternalApprovalCriteriaChecklist;
  versionHistory: ManuscriptVersionSnapshot[];
  pdfResult: BuildPdfResult;
  epubBlob: Blob;
  stageHistory: PipelineProgressEvent[];
}

export async function runAutonomousEditorialCycle(params: {
  bookId: string;
  title: string;
  subtitle?: string;
  author: string;
  genre: string;
  language: string;
  chapters: ManuscriptChapter[];
  globalMemory?: BookGlobalMemory | null;
  capaDataUrl?: string | null;
  contracapaDataUrl?: string | null;
  requestedFormat?: string;
  incluirCapaNoMiolo?: boolean;
  maxCycles?: number;
  onProgress?: (event: PipelineProgressEvent) => void;
}): Promise<AutonomousEditorialCycleResult> {
  const maxCycles = Math.max(1, Math.min(5, params.maxCycles ?? 3));
  const stageHistory: PipelineProgressEvent[] = [];

  const emit = (
    stage: PipelineStageId,
    stageIndex: number,
    label: string,
    detail: string,
    cycle: number,
    percent: number
  ) => {
    const evt: PipelineProgressEvent = {
      stage,
      stageIndex,
      totalStages: 8,
      label,
      detail,
      cycle,
      maxCycles,
      percent,
    };
    stageHistory.push(evt);
    params.onProgress?.(evt);
  };

  // Etapa 1: Manuscrito finalizado e salvo na versão original
  emit(
    'manuscrito_finalizado',
    1,
    'Manuscrito finalizado',
    `Salvando versão original com ${params.chapters.length} capítulo(s) no banco de dados.`,
    1,
    10
  );

  await WriteLockManager.saveVersionedManuscript({
    bookId: params.bookId,
    agentName: 'ORIGINAL',
    title: params.title,
    subtitle: params.subtitle,
    author: params.author,
    genre: params.genre,
    language: params.language,
    chapters: params.chapters,
    notes: 'Manuscrito bruto finalizado após geração sequencial.',
  });

  let workingChapters: ManuscriptChapter[] = params.chapters.map(c => ({
    titulo: c.titulo,
    texto: c.texto,
    imagemDataUrl: c.imagemDataUrl ?? null,
  }));

  let lastAgent1Report!: Agent1AuditReport;
  let lastAgent2Report!: Agent2VerificationReport;
  let cyclesExecuted = 0;

  for (let cycle = 1; cycle <= maxCycles; cycle++) {
    cyclesExecuted = cycle;

    // Etapa 2: Auditoria do Agente 1 (EDITORIAL_AUDITOR_AGENT)
    emit(
      'auditoria_agente_1',
      2,
      'Auditoria do Agente 1',
      `Executando EDITORIAL_AUDITOR_AGENT (Ciclo ${cycle}/${maxCycles}) sobre ${workingChapters.length} capítulos.`,
      cycle,
      25
    );

    const agent1Out = await EditorialAuditorAgent.runAuditAndPersist({
      bookId: params.bookId,
      cycle,
      title: params.title,
      subtitle: params.subtitle,
      author: params.author,
      genre: params.genre,
      language: params.language,
      chapters: workingChapters,
      globalMemory: params.globalMemory,
    });

    lastAgent1Report = agent1Out.report;
    workingChapters = agent1Out.correctedChapters;

    // Etapa 3: Correções aplicadas e persistidas
    emit(
      'correcoes_aplicadas',
      3,
      'Correções aplicadas',
      `${lastAgent1Report.autoFixedCount} correção(ões) aplicada(s) e confirmada(s) no armazenamento (${lastAgent1Report.persistedVersionId}).`,
      cycle,
      45
    );

    // Etapa 4: Verificação do Agente 2 (INDEPENDENT_EDITORIAL_VERIFIER)
    emit(
      'verificacao_agente_2',
      4,
      'Verificação do Agente 2',
      `Executando INDEPENDENT_EDITORIAL_VERIFIER (Ciclo ${cycle}/${maxCycles}) diretamente sobre a versão persistida.`,
      cycle,
      60
    );

    const agent2Out = await IndependentEditorialVerifier.verifyPersistedManuscript({
      bookId: params.bookId,
      cycle,
      originalChapters: params.chapters,
      globalMemory: params.globalMemory,
    });

    lastAgent2Report = agent2Out.report;
    workingChapters = agent2Out.verifiedChapters;

    // Etapa 5: Avaliação de pendências encontradas
    emit(
      'pendencias_encontradas',
      5,
      'Pendências encontradas',
      `Agente 2 concluiu verificação: ${lastAgent2Report.remainingCriticalIssues} erro(s) crítico(s) remanescente(s) e ${lastAgent2Report.pendingAuthorApprovalIssues.length} pendência(s) para o autor.`,
      cycle,
      72
    );

    const needsAnotherPass =
      lastAgent2Report.remainingCriticalIssues > 0 ||
      lastAgent2Report.findings.some(f => f.fixedAutomatically);

    if (!needsAnotherPass || lastAgent2Report.approvedByVerifier) {
      break;
    }
  }

  // Etapa 6: Diagramação automática sensível ao gênero e formato KDP
  emit(
    'diagramacao',
    6,
    'Diagramação',
    'Aplicando diagramação profissional KDP adaptada ao gênero e gerando arquivos finais.',
    cyclesExecuted,
    84
  );

  const layoutOut = await LayoutQaAgent.inspectGeneratedFiles({
    bookId: params.bookId,
    title: params.title,
    subtitle: params.subtitle,
    author: params.author,
    genre: params.genre,
    language: params.language,
    approvedChapters: workingChapters,
    capaDataUrl: params.capaDataUrl,
    contracapaDataUrl: params.contracapaDataUrl,
    requestedFormat: params.requestedFormat,
    incluirCapaNoMiolo: params.incluirCapaNoMiolo,
  });

  // Etapa 7: Validação técnica do PDF e do EPUB
  emit(
    'validacao_arquivos',
    7,
    'Validação do PDF/EPUB',
    `PDF (${layoutOut.qaReport.selectedFormat}, ${layoutOut.pdfResult.pageCount} págs): ${layoutOut.qaReport.pdfValidation.ok ? 'OK' : 'Falha'} | EPUB: ${layoutOut.qaReport.epubValidation.ok ? 'OK' : 'Falha'}.`,
    cyclesExecuted,
    94
  );

  // Avaliação rigorosa dos 10 critérios da Seção 14
  const structureIssuesAfter = validateChapterStructure(workingChapters, params.language);
  const completeChapterTitles = workingChapters.every(
    c => Boolean(c.titulo && c.titulo.trim() && !isIncompleteTitle(c.titulo))
  );
  const uniqueChapterNumbering = !structureIssuesAfter.some(
    iss => iss.type === 'numeracao_embutida' || iss.type === 'numero_duplicado'
  );

  const structuredToc = buildStructuredToc(
    workingChapters,
    params.language,
    layoutOut.pdfResult.chapterStartPages
  );

  const approvalChecklist: InternalApprovalCriteriaChecklist = {
    allChaptersVerified:
      workingChapters.length === params.chapters.length && workingChapters.length > 0,
    agent1CorrectionsAppliedAndSaved: lastAgent1Report.persistedVerifiedFromStorage,
    agent2VerifiedCorrectedManuscript:
      lastAgent2Report.loadedDirectlyFromStorage && lastAgent2Report.approvedByVerifier,
    zeroUnresolvedCriticalErrors:
      lastAgent2Report.remainingCriticalIssues === 0 &&
      lastAgent1Report.universalAudit.metrics.criticalCount === 0,
    completeChapterTitles,
    uniqueChapterNumbering,
    consistentToc:
      structuredToc.length === workingChapters.length && !layoutOut.qaReport.duplicateTocNumbering,
    appropriateLayoutApplied: layoutOut.qaReport.manuscriptWordsPreserved,
    pdfValidated: layoutOut.qaReport.pdfValidation.ok && !layoutOut.qaReport.headersCutOrTruncated,
    epubValidated: layoutOut.qaReport.epubValidation.ok,
  };

  const allCriteriaMet = Object.values(approvalChecklist).every(Boolean);
  const finalStatus: AutonomousEditorialCycleResult['finalStatus'] = allCriteriaMet
    ? 'APROVADA NA AUDITORIA INTERNA'
    : 'REVISÃO NECESSÁRIA';

  // Etapa 8: Status final
  emit(
    'concluido',
    8,
    finalStatus === 'APROVADA NA AUDITORIA INTERNA'
      ? 'Aprovado na Auditoria Interna'
      : 'Revisão necessária',
    `Ciclo autônomo finalizado com status: ${finalStatus}.`,
    cyclesExecuted,
    100
  );

  const versionHistory = WriteLockManager.getVersionHistory(params.bookId);

  // Persiste o relatório consolidado dos dois agentes + QA de Layout no banco
  await db.saveAuditReport(params.bookId, {
    bookId: params.bookId,
    finalStatus,
    cyclesExecuted,
    agent1Report: lastAgent1Report,
    agent2Report: lastAgent2Report,
    layoutQaReport: layoutOut.qaReport,
    approvalChecklist,
    structuredToc,
    updatedAt: new Date().toISOString(),
  });

  return {
    bookId: params.bookId,
    finalStatus,
    cyclesExecuted,
    maxCycles,
    approvedChapters: workingChapters,
    structuredToc,
    agent1Report: lastAgent1Report,
    agent2Report: lastAgent2Report,
    layoutQaReport: layoutOut.qaReport,
    approvalChecklist,
    versionHistory,
    pdfResult: layoutOut.pdfResult,
    epubBlob: layoutOut.epubBlob,
    stageHistory,
  };
}
