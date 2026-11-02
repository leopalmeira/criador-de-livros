// ============================================================================
// BOOKENGIN MULTI-ENGINE — COORDENADOR CENTRAL MULTI-MOTOR
// Unifica BookEngin + InkOS + Webnovel Writer no ciclo editorial completo
// ============================================================================

import {
  MultiEngineConfig,
  DEFAULT_MULTI_ENGINE_CONFIG,
  WebnovelReviewReport,
  GlobalEditorialAuditReport,
  StructuredNarrativeMemory
} from './contracts';
import { NarrativeMemoryStore } from './narrative-memory-store';
import { InkosOrchestrator, ScenePlan } from './inkos-orchestrator';
import { WebnovelAuditEngine } from './webnovel-audit-engine';
import { AutonomousCorrector, AutonomousCorrectionResult } from './autonomous-corrector';
import { GlobalBookAuditor, ChapterInput } from './global-book-auditor';

export interface MultiEngineProductionResult {
  chapterNumber: number;
  chapterTitle: string;
  finalProse: string;
  plan: ScenePlan;
  firstAudit: WebnovelReviewReport;
  secondAudit?: WebnovelReviewReport;
  correctionResult?: AutonomousCorrectionResult;
  approved: boolean;
  requiresManualReview: boolean;
  cyclesExecuted: number;
  memorySnapshot: StructuredNarrativeMemory;
}

export class MultiEngineCoordinator {
  private config: MultiEngineConfig;
  private memoryStore: NarrativeMemoryStore;
  private inkosOrchestrator: InkosOrchestrator;
  private webnovelAuditEngine: WebnovelAuditEngine;
  private autonomousCorrector: AutonomousCorrector;
  private globalBookAuditor: GlobalBookAuditor;

  constructor(
    bookId: string,
    bookTitleOrConfig?: string | Partial<MultiEngineConfig>,
    genre?: string,
    initialConfig?: Partial<MultiEngineConfig>
  ) {
    let title = 'Obra Sem Título';
    let g = 'Ficção';
    let cfg: Partial<MultiEngineConfig> = {};

    if (typeof bookTitleOrConfig === 'object' && bookTitleOrConfig !== null) {
      cfg = bookTitleOrConfig;
    } else {
      if (typeof bookTitleOrConfig === 'string') title = bookTitleOrConfig;
      if (genre) g = genre;
      if (initialConfig) cfg = initialConfig;
    }

    this.config = { ...DEFAULT_MULTI_ENGINE_CONFIG, ...cfg };
    this.memoryStore = new NarrativeMemoryStore(bookId, title, g);
    this.inkosOrchestrator = new InkosOrchestrator(this.memoryStore);
    this.webnovelAuditEngine = new WebnovelAuditEngine(this.memoryStore);
    this.autonomousCorrector = new AutonomousCorrector(this.webnovelAuditEngine, this.memoryStore);
    this.globalBookAuditor = new GlobalBookAuditor(this.memoryStore, this.webnovelAuditEngine);
  }

  public async init(): Promise<void> {
    await this.memoryStore.load();
  }

  public getConfig(): MultiEngineConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<MultiEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getMemoryStore(): NarrativeMemoryStore {
    return this.memoryStore;
  }

  public getWebnovelAuditor(): WebnovelAuditEngine {
    return this.webnovelAuditEngine;
  }

  public getGlobalAuditor(): GlobalBookAuditor {
    return this.globalBookAuditor;
  }

  /**
   * Executa o ciclo editorial completo de um capítulo:
   * InkOS (Planejamento) -> Recuperação de Memória -> Geração com Motor Atual ->
   * Webnovel Writer (Auditoria 1) -> Autocorreção se houver bloqueio ->
   * 2ª Auditoria Independente -> Aprovação -> Sedimentação Transacional de Memória
   */
  public async produceChapter(
    chapterNumber: number,
    outlineTitle: string,
    outlineSummary: string,
    options: {
      targetWords?: number;
      systemTone?: string;
      language?: string;
      rawTextToAuditDirectly?: string; // Se já tiver texto pré-gerado para auditar
    } = {}
  ): Promise<MultiEngineProductionResult> {
    const targetWords = options.targetWords || 1000;
    const language = options.language || 'português';
    const systemTone = options.systemTone || 'Literário e envolvente';

    // 1. INKOS: Planejamento Narrativo
    const plan = await this.inkosOrchestrator.planScene(
      chapterNumber,
      outlineTitle,
      outlineSummary,
      targetWords
    );

    // 2. RECUPERAÇÃO DE MEMÓRIA GLOBAL E LOCAL
    const context = this.config.narrativeMemoryEnabled
      ? this.inkosOrchestrator.retrieveContext(plan)
      : {
          charactersContext: '',
          environmentContext: '',
          objectsContext: '',
          knowledgeBoundaries: '',
          canonicalRules: '',
          previousChapterHook: ''
        };

    // 3. MOTOR DE GERAÇÃO ATUAL DO BOOKENGIN
    let draftProse = options.rawTextToAuditDirectly || '';
    if (!draftProse) {
      draftProse = await this.inkosOrchestrator.generateChapterProse(
        plan,
        context,
        systemTone,
        language
      );
    }

    // 4. WEBNOVEL WRITER: AUDITORIA NARRATIVA EM 5 DIMENSÕES
    let firstAudit: WebnovelReviewReport;
    if (this.config.webnovelAuditorEnabled) {
      firstAudit = await this.webnovelAuditEngine.auditChapter(
        chapterNumber,
        outlineTitle,
        draftProse
      );
    } else {
      firstAudit = {
        chapter: chapterNumber,
        approved: true,
        issues: [],
        dimensionResults: {
          setting: { dimension: 'setting', conclusion: 'pass', detail: 'Auditor desativado por configuração' },
          timeline: { dimension: 'timeline', conclusion: 'pass', detail: 'Auditor desativado por configuração' },
          continuity: { dimension: 'continuity', conclusion: 'pass', detail: 'Auditor desativado por configuração' },
          character: { dimension: 'character', conclusion: 'pass', detail: 'Auditor desativado por configuração' },
          logic: { dimension: 'logic', conclusion: 'pass', detail: 'Auditor desativado por configuração' }
        },
        blockingCount: 0,
        hasBlocking: false,
        summary: 'Auditoria ignorada por configuração.',
        reviewedAt: Date.now()
      };
    }

    // 5. AUTOCORREÇÃO CONTROLADA & SEGUNDA AUDITORIA INDEPENDENTE
    let finalProse = draftProse;
    let secondAudit: WebnovelReviewReport | undefined;
    let correctionResult: AutonomousCorrectionResult | undefined;
    let cyclesExecuted = 0;
    let requiresManualReview = false;

    if (firstAudit.hasBlocking && this.config.autoCorrectionEnabled) {
      correctionResult = await this.autonomousCorrector.correctChapter(
        chapterNumber,
        outlineTitle,
        draftProse,
        firstAudit,
        this.config.maxCorrectionCycles
      );

      finalProse = correctionResult.finalText;
      cyclesExecuted = correctionResult.totalCyclesExecuted;
      requiresManualReview = correctionResult.requiresManualReview;

      if (correctionResult.cycles.length > 0) {
        secondAudit = correctionResult.cycles[correctionResult.cycles.length - 1].secondAudit;
      }
    }

    const approved = !firstAudit.hasBlocking || (secondAudit ? !secondAudit.hasBlocking : false);

    // 6. CONTROLE DE QUALIDADE & SEDIMENTAÇÃO TRANSACIONAL DA MEMÓRIA
    if (approved && this.config.narrativeMemoryEnabled) {
      // Extrai micro-acontecimentos do texto final aprovado
      const microEvents = this.memoryStore.parseAndExtractMicroEvents(finalProse, chapterNumber);

      // Registra a memória do capítulo e atualiza estados de forma transacional e idempotente
      this.memoryStore.commitChapterMicroMemory(chapterNumber, outlineTitle, {
        openingScene: finalProse.slice(0, 200),
        closingScene: finalProse.slice(-200),
        endingLocation: plan.primaryLocation,
        charactersInvolved: plan.activeCharacters,
        events: microEvents
      });

      // Salva de forma persistente
      await this.memoryStore.save();
    }

    return {
      chapterNumber,
      chapterTitle: outlineTitle,
      finalProse,
      plan,
      firstAudit,
      secondAudit,
      correctionResult,
      approved,
      requiresManualReview,
      cyclesExecuted,
      memorySnapshot: this.memoryStore.getMemory()
    };
  }

  /**
   * Executa a auditoria global completa do livro
   */
  public async auditFullBook(chapters: ChapterInput[]): Promise<GlobalEditorialAuditReport> {
    return this.globalBookAuditor.auditFullBook(this.memoryStore.getMemory().title, chapters);
  }
}
