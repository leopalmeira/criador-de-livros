import {
  BookProject,
  IBookChapter,
  IBookConcept,
  IBookBible,
  ContinuityIssue,
  PipelineStage
} from '../types/book-project';
import { KdpBookPipeline } from './kdp-pipeline';
import { AiService } from './ai-service';
import { PageEngine } from './page-engine';
import { ImageGenerationService } from './image-generation-service';
import { KdpPackager } from './formats/kdp-packager';

export type FullBookStage =
  | 'concept'
  | 'outline'
  | 'bible'
  | 'editorial'
  | 'chapters'
  | 'review'
  | 'illustrations'
  | 'cover'
  | 'metadata'
  | 'layout'
  | 'quality'
  | 'export';

export const FULL_BOOK_STAGES: FullBookStage[] = [
  'concept',
  'outline',
  'bible',
  'editorial',
  'chapters',
  'review',
  'illustrations',
  'cover',
  'metadata',
  'layout',
  'quality',
  'export'
];

export const STAGE_LABELS: Record<FullBookStage, string> = {
  concept: 'Criando conceito editorial e promessa',
  outline: 'Gerando estrutura e sumário de capítulos',
  bible: 'Construindo a memória da obra',
  editorial: 'Redigindo páginas preliminares e conclusão',
  chapters: 'Redigindo o manuscrito completo',
  review: 'Auditando continuidade e estilo',
  illustrations: 'Gerando ilustrações dos capítulos',
  cover: 'Projetando capa e geometria KDP',
  metadata: 'Otimizando metadados e palavras-chave',
  layout: 'Diagramando as páginas impressas',
  quality: 'Executando a auditoria de publicação',
  export: 'Gerando o pacote final de arquivos'
};

const MIN_PROSE_CHARS = 400;

/**
 * Mapeia as escolhas do wizard e da linha de produção para as etapas do runner.
 * Etapas ausentes de pré-requisito são preenchidas automaticamente.
 */
export function resolveStages(requested: string[]): FullBookStage[] {
  if (requested.includes('complete_all')) {
    return [...FULL_BOOK_STAGES];
  }

  const alias: Record<string, FullBookStage> = {
    all_chapters: 'chapters',
    chapter_1: 'chapters',
    concept: 'concept',
    outline: 'outline',
    bible: 'bible',
    editorial: 'editorial',
    chapters: 'chapters',
    review: 'review',
    illustrations: 'illustrations',
    cover: 'cover',
    metadata: 'metadata',
    layout: 'layout',
    quality: 'quality',
    export: 'export'
  };

  const selected = new Set<FullBookStage>();
  requested.forEach(id => {
    const stage = alias[id];
    if (stage) selected.add(stage);
  });

  const has = (...stages: FullBookStage[]) => stages.some(s => selected.has(s));

  // Fecha as dependências em cadeia até não sobrar nenhuma etapa sem pré-requisito.
  let changed = true;
  while (changed) {
    changed = false;
    const add = (...stages: FullBookStage[]) => {
      stages.forEach(s => {
        if (!selected.has(s)) {
          selected.add(s);
          changed = true;
        }
      });
    };

    if (has('chapters', 'review', 'layout', 'illustrations')) add('concept');
    if (has('chapters', 'review')) add('outline');
    if (has('review', 'illustrations', 'chapters')) add('bible');
    if (has('layout', 'quality', 'export')) add('chapters');
    if (has('quality', 'export')) add('layout');
    if (has('export')) add('quality');
  }

  return FULL_BOOK_STAGES.filter(s => selected.has(s));
}

export interface FullBookRunOptions {
  /** Etapas a executar. Use 'complete_all' para a obra inteira. */
  stages: string[];
  /** Refaz etapas que já possuem conteúdo válido. */
  force?: boolean;
  /** Auditoria de continuidade e estilo logo após cada capítulo. */
  reviewEachChapter?: boolean;
  /** Dispara o download do ZIP final ao terminar. */
  downloadPackage?: boolean;
  /** Exige um roteiro completo: sem capítulos escritos a etapa de capítulos não é pulada. */
  requireFullManuscript?: boolean;
}

export interface FullBookRunCallbacks {
  onProgress?: (percent: number, label: string) => void;
  onProjectChange?: (project: BookProject) => void | Promise<void>;
  onDownload?: (blob: Blob, filename: string) => void;
  onFinished?: (project: BookProject, summary: FullBookRunSummary) => void;
  shouldCancel?: () => boolean;
}

export interface FullBookRunSummary {
  completedStages: FullBookStage[];
  failedStages: Array<{ stage: FullBookStage; error: string }>;
  chaptersWritten: number;
  pagesGenerated: number;
  cancelled: boolean;
}

const EMPTY_BIBLE: IBookBible = {
  characters: [],
  locations: [],
  styleGuide: { artStyle: '', palette: [], tone: '' }
};

const STAGE_PIPELINE_NAMES: Record<FullBookStage, PipelineStage> = {
  concept: 'concept',
  outline: 'outline',
  bible: 'bible',
  editorial: 'editorial_matter',
  chapters: 'writing',
  review: 'continuity',
  illustrations: 'cover',
  cover: 'cover',
  metadata: 'metadata',
  layout: 'typesetting',
  quality: 'quality_gate',
  export: 'packaging'
};

/**
 * Orquestrador de geração autônoma: conduz a obra do conceito ao pacote final
 * do KDP, isolando falhas por etapa e permitindo retomar do ponto em que parou.
 */
export class FullBookRunner {
  private readonly ai: AiService;
  private readonly pipeline: KdpBookPipeline;
  private working: BookProject;
  private readonly callbacks: FullBookRunCallbacks;
  private readonly options: FullBookRunOptions;
  private completedStages: FullBookStage[] = [];
  private failedStages: Array<{ stage: FullBookStage; error: string }> = [];
  private chaptersWritten = 0;

  constructor(project: BookProject, aiService: AiService, options: FullBookRunOptions, callbacks: FullBookRunCallbacks = {}) {
    this.working = PageEngine.ensureProjectSettings(structuredClone(project) as BookProject);
    this.ai = aiService;
    this.pipeline = new KdpBookPipeline(aiService);
    this.options = options;
    this.callbacks = callbacks;
  }

  public async run(): Promise<FullBookRunSummary> {
    const stages = resolveStages(this.options.stages);
    const summary: FullBookRunSummary = {
      completedStages: this.completedStages,
      failedStages: this.failedStages,
      chaptersWritten: 0,
      pagesGenerated: 0,
      cancelled: false
    };

    this.log(`Iniciando produção autônoma (${stages.length} etapas): ${stages.join(', ')}.`);

    for (let i = 0; i < stages.length; i++) {
      if (this.callbacks.shouldCancel?.()) {
        summary.cancelled = true;
        this.log('Execução interrompida pelo autor. O progresso foi salvo e pode ser retomado.');
        break;
      }

      const stage = stages[i];
      const basePercent = Math.round((i / stages.length) * 100);
      const spanPercent = Math.round(100 / stages.length);

      this.report(basePercent, STAGE_LABELS[stage]);
      this.working.pipelineStage = STAGE_PIPELINE_NAMES[stage];
      this.working.pipelineProgress = basePercent;
      await this.persist();

      try {
        await this.runStage(stage, basePercent, spanPercent);
        this.completedStages.push(stage);
      } catch (err: any) {
        const message = err?.message || String(err);
        this.failedStages.push({ stage, error: message });
        this.log(`Falha na etapa "${stage}": ${message}. As demais etapas continuam.`);
      }

      this.working.pipelineProgress = Math.min(99, basePercent + spanPercent);
      await this.persist();
    }

    this.working.pipelineStage = summary.cancelled ? 'idle' : 'completed';
    this.working.pipelineProgress = summary.cancelled
      ? Math.round((this.completedStages.length / stages.length) * 100)
      : 100;
    await this.persist();

    summary.chaptersWritten = this.chaptersWritten;
    summary.pagesGenerated = this.working.visualPages?.length || 0;
    summary.completedStages = [...this.completedStages];
    summary.failedStages = [...this.failedStages];

    this.report(100, summary.failedStages.length > 0 ? 'Concluído com avisos' : 'Obra concluída');
    this.callbacks.onFinished?.(this.working, summary);
    return summary;
  }

  private async runStage(stage: FullBookStage, basePercent: number, spanPercent: number): Promise<void> {
    switch (stage) {
      case 'concept':
        await this.ensureConcept();
        return;
      case 'outline':
        await this.ensureOutline();
        return;
      case 'bible':
        await this.ensureBible();
        return;
      case 'editorial':
        await this.ensureEditorialMatter();
        return;
      case 'chapters':
        await this.writeAllChapters(basePercent, spanPercent);
        return;
      case 'review':
        await this.reviewManuscript();
        return;
      case 'illustrations':
        this.ensureIllustrations();
        return;
      case 'cover':
        await this.ensureCover();
        return;
      case 'metadata':
        await this.ensureMetadata();
        return;
      case 'layout':
        this.buildLayout();
        return;
      case 'quality':
        this.runQualityChecks();
        return;
      case 'export':
        await this.buildPackage();
        return;
    }
  }

  private async ensureConcept(): Promise<void> {
    if (!this.options.force && this.working.kdpConcept?.title?.trim()) {
      this.log('Conceito editorial já existente: etapa mantida.');
      return;
    }
    const topic = this.working.topic || this.working.title;
    const concept = await this.pipeline.generateConcept(
      topic,
      this.working.kdpBookType,
      this.working.language,
      this.working.author,
      this.working.estimatedPages
    );
    this.working.kdpConcept = concept;
    this.working.title = concept.title || this.working.title;
    this.working.subtitle = concept.subtitle || this.working.subtitle;
    this.working.description = concept.longSynopsis || concept.shortSynopsis || this.working.description;
    await this.persist();
  }

  private async ensureOutline(): Promise<void> {
    if (!this.options.force && (this.working.kdpChapters?.length || 0) > 0) {
      this.log(`Estrutura existente com ${this.working.kdpChapters?.length} capítulos: etapa mantida.`);
      return;
    }
    const concept = this.requireConcept();
    const chapters = await this.pipeline.generateOutline(concept, this.working.kdpBookType, this.working.language);
    if (!chapters.length) throw new Error('A geração do sumário não retornou capítulos.');
    this.working.kdpChapters = chapters;
    this.working.outline = chapters.map((c, idx) => ({
      id: `out_${c.index || idx + 1}`,
      order: c.index || idx + 1,
      title: c.title,
      description: c.summary,
      status: 'PENDENTE'
    }));
    await this.persist();
  }

  private async ensureBible(): Promise<void> {
    if (!this.options.force && (this.working.kdpBible || this.working.bookMemory)) {
      this.log('Memória da obra já existente: etapa mantida.');
      return;
    }
    const concept = this.requireConcept();
    const bible = await this.pipeline.generateBible(
      concept,
      this.working.kdpChapters || [],
      this.working.kdpBookType,
      this.working.language
    );
    this.working.kdpBible = bible;
    this.working.bookMemory = {
      characters: (bible.characters || []).map((c, i) => ({
        id: `char_${i}`,
        name: c.name,
        role: c.role,
        appearance: c.appearance,
        personality: c.personality || '',
        arc: c.arc || ''
      })),
      locations: (bible.locations || []).map((l, i) => ({
        id: `loc_${i}`,
        name: l.name,
        description: l.description,
        mood: l.mood || ''
      })),
      events: [],
      rules: (bible.rulesOfUniverse || []).map((r, i) => ({
        id: `rule_${i}`,
        category: 'Geral',
        rule: r
      })),
      concepts: (bible.coreConcepts || []).map((c, i) => ({
        id: `conc_${i}`,
        term: c.concept,
        definition: c.explanation,
        application: c.practicalApplication
      }))
    };
    await this.persist();
  }

  private async ensureEditorialMatter(): Promise<void> {
    if (!this.options.force && this.working.editorialElements?.conclusion) {
      this.log('Páginas preliminares já existentes: etapa mantida.');
      return;
    }
    const concept = this.requireConcept();
    this.working.editorialElements = await this.pipeline.generateEditorialMatter(
      concept,
      this.working.author,
      this.working.language
    );
    await this.persist();
  }

  private async writeAllChapters(basePercent: number, spanPercent: number): Promise<void> {
    const chapters = this.working.kdpChapters || [];
    if (chapters.length === 0) throw new Error('Não há capítulos planejados para redigir.');

    const concept = this.requireConcept();
    const bible = this.working.kdpBible || EMPTY_BIBLE;
    const language = this.working.language;
    let previousSummary = '';

    for (let i = 0; i < chapters.length; i++) {
      if (this.callbacks.shouldCancel?.()) {
        this.log('Execução interrompida durante a redação do manuscrito.');
        await this.persist();
        return;
      }

      const chapter = chapters[i];
      const number = chapter.index || i + 1;
      const alreadyWritten = (chapter.prose?.trim().length || 0) >= MIN_PROSE_CHARS;

      if (alreadyWritten && !this.options.force) {
        previousSummary = (chapter.prose || '').slice(-400);
        this.report(basePercent + Math.round((i / chapters.length) * spanPercent), `Capítulo ${number}/${chapters.length} já redigido: mantido.`);
        continue;
      }

      this.report(
        basePercent + Math.round((i / chapters.length) * spanPercent),
        `Redigindo Capítulo ${number} de ${chapters.length}: "${(chapter.title || '').slice(0, 28)}"`
      );
      chapters[i] = { ...chapter, status: 'ESCREVENDO' };
      await this.persist();

      try {
        const written = await this.pipeline.writeChapter(
          concept,
          bible,
          chapters,
          chapters[i],
          this.working.kdpBookType,
          previousSummary,
          language
        );

        chapters[i] = {
          ...chapters[i],
          prose: written.prose,
          wordCount: written.wordCount,
          notes: written.notes,
          status: 'APROVADO'
        };
        previousSummary = written.prose.slice(-400);
        this.chaptersWritten++;

        const target = chapters[i].targetWordCount || 2000;
        if (written.wordCount < target * 0.6) {
          this.log(`Capítulo ${number} ficou abaixo da meta (${written.wordCount}/${target} palavras).`);
        }
      } catch (err: any) {
        chapters[i] = { ...chapters[i], status: 'PENDENTE' };
        this.log(`Falha ao redigir o capítulo ${number}: ${err?.message || err}.`);
        continue;
      }

      if (this.options.reviewEachChapter) {
        await this.auditChapterContinuity(chapters[i], chapters.slice(0, i));
      }

      await this.persist();
    }

    this.working.kdpChapters = chapters;
    this.working.outline = chapters.map((c, idx) => ({
      id: `out_${c.index || idx + 1}`,
      order: c.index || idx + 1,
      title: c.title,
      description: c.summary,
      wordCount: c.wordCount,
      status: (c.prose?.trim().length || 0) >= MIN_PROSE_CHARS ? 'APROVADO' : 'PENDENTE'
    }));

    const written = chapters.filter(c => (c.prose?.trim().length || 0) >= MIN_PROSE_CHARS).length;
    this.log(`Manuscrito: ${written}/${chapters.length} capítulos redigidos.`);
    await this.persist();
  }

  private async auditChapterContinuity(chapter: IBookChapter, previous: IBookChapter[]): Promise<void> {
    if (!chapter.prose?.trim()) return;
    try {
      const issues = await this.pipeline.checkContinuity(
        chapter,
        this.working.kdpBible || EMPTY_BIBLE,
        previous,
        this.working.language
      );
      if (issues.length === 0) return;
      const existing = this.working.kdpEditorReport?.continuityIssues || [];
      this.working.kdpEditorReport = {
        score: this.working.kdpEditorReport?.score || 0,
        summary: this.working.kdpEditorReport?.summary || '',
        strengths: this.working.kdpEditorReport?.strengths || [],
        issues: this.working.kdpEditorReport?.issues || [],
        chaptersToRevise: this.working.kdpEditorReport?.chaptersToRevise || [],
        plagiarismNote: this.working.kdpEditorReport?.plagiarismNote || '',
        continuityIssues: [...existing, ...issues]
      };
      if (issues.length > 0) {
        this.log(`Capítulo ${chapter.index}: ${issues.length} inconsistência(s) de continuidade registrada(s).`);
      }
    } catch (err: any) {
      this.log(`Auditoria de continuidade do capítulo ${chapter.index} falhou: ${err?.message || err}.`);
    }
  }

  private async reviewManuscript(): Promise<void> {
    const concept = this.requireConcept();
    const chapters = this.working.kdpChapters || [];
    const written = chapters.filter(c => (c.prose?.trim().length || 0) >= MIN_PROSE_CHARS);

    for (let i = 0; i < written.length; i++) {
      if (this.callbacks.shouldCancel?.()) break;
      await this.auditChapterContinuity(written[i], written.slice(0, i));
      this.report(60 + Math.round((i / Math.max(1, written.length)) * 10), `Auditando coerência do capítulo ${written[i].index}`);
    }

    const existingIssues = this.working.kdpEditorReport?.continuityIssues || [];
    const report = await this.pipeline.reviewManuscript(
      concept,
      written,
      this.working.kdpBible || EMPTY_BIBLE,
      this.working.language
    );
    this.working.kdpEditorReport = {
      ...report,
      continuityIssues: [...existingIssues, ...(report.continuityIssues || [])]
    };
    this.log(`Parecer editorial: nota ${report.score}/100 com ${(report.issues || []).length} apontamento(s).`);
    await this.persist();
  }

  private ensureIllustrations(): void {
    const chapters = this.working.kdpChapters || [];
    const existing = this.working.images || [];
    let created = 0;

    chapters.forEach((chapter, idx) => {
      const number = chapter.index || idx + 1;
      if (existing.some(img => img.chapterIndex === number)) return;

      const seed = 1000 + number * 73;
      const prompt = ImageGenerationService.buildChapterPrompt(chapter, this.working, 'realistic-photo', seed);
      existing.push({
        id: `img_ch_${number}_${seed}`,
        name: `Ilustração do Capítulo ${number}: ${chapter.title}`,
        dataUrl: ImageGenerationService.getPollinationsUrl(prompt, 1024, 768, seed),
        source: 'ai-generated',
        prompt,
        chapterIndex: number,
        createdAt: Date.now()
      });
      created++;
    });

    if (!this.working.coverImageUrl) {
      const coverSeed = 42;
      const coverPrompt = ImageGenerationService.buildCoverPrompt(this.working, 'realistic-photo', '', coverSeed);
      this.working.coverImageUrl = ImageGenerationService.getPollinationsUrl(coverPrompt, 1200, 1800, coverSeed);
      created++;
    }

    this.working.images = existing;
    this.log(`Ilustrações: ${created} nova(s) imagem(ns) vinculada(s) aos capítulos.`);
  }

  private async ensureCover(): Promise<void> {
    const concept = this.requireConcept();
    const pages = this.working.actualPages || this.working.estimatedPages || 160;
    const cover = await this.pipeline.generateCoverDesign(
      concept,
      this.working.kdpBible || EMPTY_BIBLE,
      this.working.author,
      pages
    );
    this.working.kdpCoverDesign = cover;

    if (!this.working.coverImageUrl) {
      const prompt = ImageGenerationService.buildCoverPrompt(this.working, 'realistic-photo', '', 42);
      this.working.coverImageUrl = ImageGenerationService.getPollinationsUrl(prompt, 1200, 1800, 42);
    }
    cover.frontImageUrl = this.working.coverImageUrl;
    await this.persist();
  }

  private async ensureMetadata(): Promise<void> {
    const concept = this.requireConcept();
    const metadata = await this.pipeline.generateMetadataKdp(
      concept,
      this.working.kdpChapters || [],
      this.working.author,
      this.working.language
    );
    this.working.kdpMetadata = metadata;
    this.working.keywords = (metadata.keywords7 || []).filter(Boolean);
    await this.persist();
  }

  private buildLayout(): void {
    this.working.visualPages = PageEngine.generateVisualPagesFromManuscript(this.working);
    this.working.actualPages = this.working.visualPages.length;
    this.working = PageEngine.ensureProjectSettings(this.working);
    this.log(`Diagramação: ${this.working.actualPages} páginas no padrão ${this.working.trimSize}.`);
  }

  private runQualityChecks(): void {
    this.working.kdpQualityReport = this.pipeline.runQualityGate(this.working);
    const report = this.working.kdpQualityReport;
    this.log(
      `Auditoria: ${report.passed ? 'aprovada' : 'com pendências'} (${report.overallScore}%, ${report.blockerCount} bloqueador(es)).`
    );
  }

  private async buildPackage(): Promise<void> {
    const blob = await KdpPackager.createKdpPackage(this.working);
    this.working.kdpPackageGeneratedAt = Date.now();
    const safeTitle = (this.working.title || 'Livro').replace(/[^\w\- ]+/g, '').trim() || 'Livro';
    const filename = `Pacote_Completo_KDP_${safeTitle}.zip`;

    if (this.options.downloadPackage && this.callbacks.onDownload) {
      this.callbacks.onDownload(blob, filename);
      this.log(`Pacote KDP gerado e baixado: ${filename}.`);
    } else {
      this.log(`Pacote KDP pronto para download na aba Exportar (${Math.round(blob.size / 1024)} KB).`);
    }
  }

  private requireConcept(): IBookConcept {
    const concept = this.working.kdpConcept;
    if (!concept?.title?.trim()) {
      throw new Error('Conceito editorial ausente: a etapa de conceito precisa ser concluída primeiro.');
    }
    return concept;
  }

  private report(percent: number, label: string): void {
    this.working.pipelineProgress = percent;
    this.callbacks.onProgress?.(percent, label);
  }

  private log(message: string): void {
    const stamped = `[${new Date().toLocaleTimeString()}] ${message}`;
    this.working.pipelineLog = [...(this.working.pipelineLog || []), stamped].slice(-200);
    console.info(`[FullBookRunner] ${message}`);
  }

  private async persist(): Promise<void> {
    this.working.updatedAt = Date.now();
    await this.callbacks.onProjectChange?.(this.working);
  }

  /** Instância do serviço de IA em uso, exposta para exibir custos na interface. */
  public get aiService(): AiService {
    return this.ai;
  }

  /** Snapshot do projeto conforme está no momento da execução. */
  public get project(): BookProject {
    return this.working;
  }

  /** Problemas de continuidade acumulados durante a produção. */
  public get continuityIssues(): ContinuityIssue[] {
    return this.working.kdpEditorReport?.continuityIssues || [];
  }
}
