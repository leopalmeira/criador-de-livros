// ================================================================
// PIPELINE DE CORREÇÃO EDITORIAL → PDF FINAL VALIDADO
// 1 manuscrito original (preservado) → 2 capítulos → 3 continuidade →
// 4-7 correção capítulo a capítulo (salva cada um) → 8-9 revisão cruzada →
// 10 consolidação → 11 sumário → 12 capa → 13 diagramação → 14 paginação →
// 15 PDF → 16 validação do PDF aberto → 17 persistência → 18 dashboard →
// 19 relatório.
// ================================================================
import type {
  ChapterRecord,
  CorrectionChange,
  CoverStatus,
  EditorialJob,
  EditorialReport,
  FinalBookRecord,
  ManuscriptSnapshot,
  PendingItem,
} from '../types/editorial-correction';
import { countOccurrences } from './editorial-rules';
import { hashString, countWords } from './editorial-text-utils';
import {
  AiCall,
  AiUnavailableError,
  CorrectorConfig,
  correctChapter,
} from './kdp-editorial-corrector';
import {
  createContinuityRegistry,
  isOldTocChapter,
  rebuildToc,
  runCrossReview,
  updateContinuityWithChapter,
} from './kdp-editorial-review';
import { buildKdpPdf, inspectCover } from './kdp-pdf-builder';
import { validatePdf } from './kdp-pdf-validator';
import { ManuscriptIntegrityEngine } from './manuscript-integrity-engine';
import { StoryContextAuditor } from './story-context-auditor';

// ---------------------------------------------------------------
// ARMAZENAMENTO
// ---------------------------------------------------------------
export interface EditorialStore {
  loadJob(bookId: string): Promise<EditorialJob | null>;
  saveJob(job: EditorialJob): Promise<void>;
  saveFinalBook(rec: FinalBookRecord): Promise<void>;
}

/** armazenamento persistente real (IndexedDB "BookIntelDB") */
export const indexedDbStore: EditorialStore = {
  async loadJob(bookId) {
    const { db } = await import('../database/local-database');
    return db.getEditorialJob(bookId);
  },
  async saveJob(job) {
    const { db } = await import('../database/local-database');
    await db.saveEditorialJob(job);
  },
  async saveFinalBook(rec) {
    const { db } = await import('../database/local-database');
    await db.saveFinalBook(rec);
  },
};

export function createMemoryStore() {
  const jobs = new Map<string, EditorialJob>();
  const finals = new Map<string, FinalBookRecord>();
  const store: EditorialStore & { jobs: typeof jobs; finals: typeof finals } = {
    jobs,
    finals,
    async loadJob(id) { const j = jobs.get(id); return j ? JSON.parse(JSON.stringify(j)) : null; },
    async saveJob(job) { jobs.set(job.bookId, JSON.parse(JSON.stringify(job))); },
    async saveFinalBook(rec) { finals.set(rec.id, rec); },
  };
  return store;
}

// ---------------------------------------------------------------
// TIPOS PÚBLICOS
// ---------------------------------------------------------------
export interface PipelineLivro {
  titulo: string;
  subtitulo: string;
  autor: string;
  genero: string;
  idioma: string;
  capitulos: { titulo: string; texto: string }[];
}

export interface PipelineConfig {
  formato: string;
  optSumario: boolean;
  tamCapitulo: number;
  corCapitulo: string;
  corrector?: Partial<CorrectorConfig>;
}

export interface PipelineProgress {
  percent: number;
  stage: string;
  message: string;
  chapterIndex?: number;
  chaptersDone: number;
  chaptersTotal: number;
  job: EditorialJob;
}

export type PipelineOutcome =
  | 'concluido'
  | 'interrompido'
  | 'erro_ia'
  | 'aguardando_capa'
  | 'falha_pdf'
  | 'falha_validacao'
  | 'sem_trabalho';

export interface PipelineResult {
  outcome: PipelineOutcome;
  message: string;
  job: EditorialJob;
  /** manuscrito com o texto corrigido (disponível mesmo se o PDF falhar) */
  livroCorrigido?: PipelineLivro;
  final?: FinalBookRecord;
  report?: EditorialReport;
}

export interface PipelineInput {
  livro: PipelineLivro;
  capaDataUrl?: string | null;
  config: PipelineConfig;
  premissa?: string;
  ai: AiCall | null;
  store: EditorialStore;
  onProgress?: (p: PipelineProgress) => void;
  shouldStop?: () => boolean;
  /** recomeça do zero ignorando job salvo */
  forceRestart?: boolean;
  /** só consolida → sumário → capa → PDF → validação (usa o job salvo; sem IA) */
  onlyFinalize?: boolean;
  /** injetáveis (testes de falha) */
  buildPdf?: typeof buildKdpPdf;
  validate?: typeof validatePdf;
}

// ---------------------------------------------------------------
// UTILITÁRIOS
// ---------------------------------------------------------------
export function hashChapters(chs: { titulo: string; texto: string }[]): string {
  return hashString(chs.map(c => `${c.titulo}\u0001${c.texto}`).join('\u0002'));
}

export function computeBookId(livro?: Partial<Pick<PipelineLivro, 'titulo' | 'autor' | 'genero'>> | null): string {
  if (!livro) return 'kb-empty';
  return `kb-${hashString(`${livro.titulo || ''}|${livro.autor || ''}|${livro.genero || ''}`)}`;
}

const NONFICTION = /n[aã]o.?fic|autoajuda|neg[oó]cio|guia|manual|t[eé]cnic|did[aá]tic|receita|how.?to|self.?help|business|educa/i;
const isPortuguese = (idioma: string) => !idioma || /portugu|pt/i.test(idioma);
const tick = () => new Promise<void>(r => setTimeout(r, 0));

function emptyCover(): CoverStatus {
  return { present: false, valid: false, kind: 'ausente', notes: [] };
}

function addLog(job: EditorialJob, msg: string) {
  job.log.push(`${new Date().toLocaleTimeString('pt-BR')} · ${msg}`);
  if (job.log.length > 300) job.log = job.log.slice(-300);
}

export function newJob(livro: PipelineLivro, premissa?: string): EditorialJob {
  const now = Date.now();
  const bookId = computeBookId(livro);
  const original: ManuscriptSnapshot = {
    titulo: livro.titulo, subtitulo: livro.subtitulo, autor: livro.autor, genero: livro.genero,
    idioma: livro.idioma, topico: premissa,
    capitulos: livro.capitulos.map(c => ({ titulo: c.titulo, texto: c.texto })),
  };
  return {
    id: `job-${bookId}-${now.toString(36)}`,
    bookId,
    startedAt: now,
    updatedAt: now,
    lastRunAt: now,
    status: 'em_andamento',
    stage: 'inicio',
    stageMessage: 'Manuscrito original carregado e preservado.',
    original,
    originalHash: hashChapters(original.capitulos),
    chapters: [],
    continuity: createContinuityRegistry([]),
    storyBibleStructured: StoryContextAuditor.buildStoryBible(livro, premissa),
    snapshots: [StoryContextAuditor.createSnapshot(livro, 'Manuscrito Original')],
    toc: [],
    tocIssues: [],
    cover: emptyCover(),
    log: [],
  };
}

// ---------------------------------------------------------------
// RELATÓRIO
// ---------------------------------------------------------------
export function buildEditorialReport(job: EditorialJob): EditorialReport {
  const all: CorrectionChange[] = [
    ...job.chapters.flatMap(c => c.changes),
    ...(job.crossReview?.autoChanges ?? []),
  ];
  const sum = (types: string[]) => countOccurrences(all.filter(c => types.includes(c.type) && c.resolution !== 'PENDENTE_VALIDACAO_AUTOR'));
  const pendings: PendingItem[] = [
    ...job.chapters.flatMap(c => c.pendings),
    ...(job.crossReview?.findings ?? []),
  ];
  const pendingAuthor = pendings.filter(p => p.resolution === 'PENDENTE_VALIDACAO_AUTOR');
  const notVerified = pendings.filter(p => p.resolution === 'NAO_FOI_POSSIVEL_VERIFICAR');
  (job.crossReview?.notes ?? []).filter(n => n.startsWith('NÃO FOI POSSÍVEL')).forEach((n, i) => notVerified.push({
    id: `nv-${i}`, chapterIndex: -1, kind: 'outro', description: n, resolution: 'NAO_FOI_POSSIVEL_VERIFICAR',
  }));
  (job.pdfValidation?.checks ?? []).filter(c => c.ok === null).forEach(c => notVerified.push({
    id: `nvp-${c.id}`, chapterIndex: -1, kind: 'outro', description: `${c.label}: ${c.detail}`, resolution: 'NAO_FOI_POSSIVEL_VERIFICAR',
  }));
  const words = job.chapters.reduce((s, c) => s + countWords(c.originalText), 0);
  const done = job.chapters.filter(c => c.status === 'corrigido_salvo' || c.status === 'pendente_autor').length;
  const aiFully = job.chapters.length > 0 && job.chapters.every(c => c.aiVerified) && !!job.crossReview?.aiVerified;
  const corrAuto = all.filter(c => c.resolution === 'CORRIGIDO_AUTOMATICAMENTE' && (c.occurrences ?? 1) > 0);
  const totalFixed = countOccurrences(corrAuto);
  const rep: EditorialReport = {
    generatedAt: Date.now(),
    bookTitle: job.original.titulo,
    author: job.original.autor,
    pagesAnalyzed: Math.max(1, Math.ceil(words / 250)),
    pdfPages: job.layout?.pageCount ?? 0,
    chaptersIdentified: job.chapters.length,
    chaptersCorrected: done,
    chaptersPending: job.chapters.filter(c => c.status === 'pendente_autor').length,
    spellingErrors: sum(['ortografia', 'acentuacao', 'codificacao']),
    grammarErrors: sum(['gramatica']),
    punctuationFixes: sum(['pontuacao', 'espacamento']),
    paragraphFixes: sum(['paragrafo']),
    dialogueFixes: sum(['dialogo']),
    encodingFixes: sum(['codificacao']),
    styleChanges: sum(['estilo']),
    repetitionFindings: sum(['repeticao']) + (job.crossReview?.findings ?? []).filter(f => f.kind === 'repeticao').length,
    continuityFindings: pendings.filter(p => p.kind === 'continuidade').length,
    tocIssues: job.tocIssues,
    layoutWarnings: job.layout?.warnings ?? [],
    cover: job.cover,
    pdfValidation: job.pdfValidation,
    correctedAutomatically: corrAuto,
    pendingAuthor,
    notVerified,
    aiFullyVerified: aiFully,
    summary: '',
    overallAuditScore: job.auditResult?.overallScore,
    auditStatus: job.auditResult?.status,
    narrativeIntegrityScore: job.auditResult?.narrativeIntegrityScore,
    endingResolutionOk: job.auditResult?.endingAssessment.approved,
    aiContaminationCleaned: job.auditResult?.aiContaminationCleaned,
  };
  rep.summary = `${rep.chaptersCorrected}/${rep.chaptersIdentified} capítulo(s) processado(s); ${totalFixed} correção(ões) automática(s) aplicada(s) ` +
    `(${rep.spellingErrors} ortografia/acentuação, ${rep.grammarErrors} gramática, ${rep.punctuationFixes} pontuação/espaço, ${rep.paragraphFixes} parágrafo, ${rep.dialogueFixes} diálogo, ${rep.styleChanges} estilo); ` +
    `${pendingAuthor.length} pendência(s) para validação do autor; ${notVerified.length} item(ns) NÃO verificado(s). ` +
    (aiFully ? 'Todos os blocos passaram pela revisão da IA.' : 'Nem todos os blocos puderam ser revisados pela IA — veja os itens "não foi possível verificar".') +
    ' Nenhuma ferramenta garante 100% de ausência de erros ou de plágio; a leitura final do autor continua recomendada.';
  return rep;
}

// ---------------------------------------------------------------
// PIPELINE
// ---------------------------------------------------------------
export async function runEditorialPipeline(inp: PipelineInput): Promise<PipelineResult> {
  const { store, ai, config } = inp;
  const doBuild = inp.buildPdf ?? buildKdpPdf;
  const doValidate = inp.validate ?? validatePdf;
  const bookId = computeBookId(inp.livro);

  // --- carrega/decide job ---------------------------------------
  let job: EditorialJob | null = inp.forceRestart ? null : await store.loadJob(bookId);
  if (job) {
    const inHash = hashChapters(inp.livro.capitulos);
    const resumable = inHash === job.originalHash || (job.consolidatedHash !== undefined && inHash === job.consolidatedHash);
    if (!resumable) job = null;
  }
  if (!job) {
    if (inp.onlyFinalize) {
      const j = newJob(inp.livro, inp.premissa);
      return { outcome: 'sem_trabalho', message: 'Nenhuma correção salva para este livro. Execute "Corrigir Livro Completo" primeiro.', job: j };
    }
    job = newJob(inp.livro, inp.premissa);
    addLog(job, 'Novo processo de correção iniciado; manuscrito original preservado.');
  } else {
    addLog(job, `Processo retomado (status anterior: ${job.status}).`);
  }
  job.lastRunAt = Date.now();
  job.status = 'em_andamento';
  const J: EditorialJob = job;

  const total = () => J.chapters.length;
  const doneCount = () => J.chapters.filter(c => c.status === 'corrigido_salvo' || c.status === 'pendente_autor').length;
  const persist = async () => { J.updatedAt = Date.now(); await store.saveJob(J); };
  const progress = (percent: number, stage: string, message: string, chapterIndex?: number) => {
    J.stage = stage;
    J.stageMessage = message;
    inp.onProgress?.({ percent: Math.min(100, Math.max(0, Math.round(percent))), stage, message, chapterIndex, chaptersDone: doneCount(), chaptersTotal: total(), job: J });
  };
  const stopped = async (): Promise<PipelineResult> => {
    J.status = 'interrompido';
    addLog(J, 'Processo interrompido pelo usuário. Progresso salvo.');
    await persist();
    progress(0, 'interrompido', `Interrompido — ${doneCount()}/${total()} capítulo(s) salvo(s). Use "Continuar" para retomar.`);
    return { outcome: 'interrompido', message: J.stageMessage, job: J };
  };

  const livroMeta = { titulo: J.original.titulo, subtitulo: J.original.subtitulo, autor: J.original.autor, genero: J.original.genero, idioma: J.original.idioma };
  const corrCfg: Partial<CorrectorConfig> = {
    dialogueHyphen: !NONFICTION.test(J.original.genero || ''),
    portuguese: isPortuguese(J.original.idioma),
    ...(config.corrector || {}),
  };

  // --- 2) identifica capítulos / 3) registro de continuidade ------
  if (J.chapters.length === 0) {
    progress(1, 'identificacao', 'Identificando capítulos…');
    const skipped: string[] = [];
    const recs: ChapterRecord[] = [];
    J.original.capitulos.forEach((c, i) => {
      if (isOldTocChapter(c.titulo)) { skipped.push(c.titulo); return; }
      const idx = recs.length;
      const title = (c.titulo || '').trim();
      recs.push({
        index: idx,
        title: title || `Capítulo ${idx + 1}`,
        originalTitle: c.titulo,
        originalText: c.texto || '',
        correctedText: '',
        status: 'aguardando',
        changes: [], errorsFound: 0, errorsFixed: 0,
        pendings: title ? [] : [{
          id: `tit-${i}`, chapterIndex: idx, kind: 'titulo',
          description: 'Capítulo sem título no manuscrito: foi usado o título provisório "Capítulo N". Defina o título correto.',
          resolution: 'PENDENTE_VALIDACAO_AUTOR',
        }],
        validation: { ok: true, notes: [] }, aiVerified: false, blocks: 0,
      });
    });
    J.chapters = recs;
    if (skipped.length) {
      J.tocIssues.push(`Sumário antigo encontrado no manuscrito ("${skipped.join('", "')}") foi descartado: o novo sumário é reconstruído a partir do conteúdo corrigido.`);
    }
    J.continuity = createContinuityRegistry(recs.map(r => ({ title: r.title, text: r.originalText })));
    addLog(J, `${recs.length} capítulo(s) identificado(s); registro de continuidade criado (${Object.keys(J.continuity.characters).length} personagem(ns), ${Object.keys(J.continuity.locations).length} local(is)).`);
    await persist();
  }
  if (J.chapters.length === 0) {
    J.status = 'falha';
    J.stageMessage = 'O manuscrito não possui capítulos.';
    await persist();
    return { outcome: 'sem_trabalho', message: J.stageMessage, job: J };
  }

  // --- 4-7) correção capítulo a capítulo --------------------------
  if (!inp.onlyFinalize) {
    for (let i = 0; i < J.chapters.length; i++) {
      const ch = J.chapters[i];
      if (ch.status === 'corrigido_salvo' || ch.status === 'pendente_autor') continue; // já salvo — não refaz
      if (inp.shouldStop?.()) return stopped();

      const base = (doneCount() / total()) * 60;
      ch.status = 'em_analise';
      ch.error = undefined;
      progress(base, 'correcao', `Capítulo ${i + 1}/${total()} — analisando “${ch.title}”…`, i);
      await persist();
      ch.status = 'corrigindo';
      try {
        const out = await correctChapter(
          {
            bookTitle: livroMeta.titulo, genre: livroMeta.genero, language: livroMeta.idioma,
            chapterIndex: i, title: ch.title, text: ch.originalText, registry: J.continuity,
          },
          ai,
          corrCfg,
          {
            shouldStop: inp.shouldStop,
            onStatus: m => progress(base + (1 / total()) * 30, 'correcao', m, i),
          },
        );
        ch.status = 'validando';
        progress(base + (1 / total()) * 45, 'correcao', `Capítulo ${i + 1}/${total()} — validando e salvando…`, i);
        const cont = await updateContinuityWithChapter(J.continuity, i, ch.title, out.correctedText, ai);
        J.continuity = cont.registry;
        ch.correctedText = out.correctedText;
        ch.changes = out.changes;
        ch.pendings = [...ch.pendings, ...out.pendings, ...cont.contradictions];
        ch.aiVerified = out.aiVerified;
        ch.model = out.model;
        ch.blocks = out.blocks;
        ch.errorsFixed = out.errorsFixed;
        ch.errorsFound = out.errorsFound + cont.contradictions.length;
        ch.validation = out.validation;
        ch.correctedAt = Date.now();
        const hasAuthorPending = ch.pendings.some(p => p.resolution !== 'CORRIGIDO_AUTOMATICAMENTE');
        ch.status = out.status === 'pendente_autor' || hasAuthorPending ? 'pendente_autor' : 'corrigido_salvo';
        addLog(J, `Capítulo ${i + 1} ${ch.status === 'corrigido_salvo' ? 'corrigido e salvo' : 'salvo com pendências'} (${out.errorsFixed} correção(ões), ${ch.pendings.length} pendência(s)).`);
        await persist(); // SALVA antes de avançar
        progress(((doneCount()) / total()) * 60, 'correcao', `Capítulo ${i + 1}/${total()} salvo.`, i);
      } catch (e: any) {
        if (String(e?.message) === 'INTERROMPIDO') {
          ch.status = 'aguardando';
          return stopped();
        }
        ch.status = 'erro';
        ch.error = e?.message || String(e);
        J.status = 'interrompido';
        const iaDown = e instanceof AiUnavailableError;
        addLog(J, `Erro no capítulo ${i + 1}: ${ch.error}`);
        await persist();
        const msg = iaDown
          ? `A IA ficou indisponível no capítulo ${i + 1} (${ch.error}). ${doneCount()}/${total()} capítulo(s) já estão salvos — clique em "Continuar" para retomar deste ponto, sem refazer os anteriores.`
          : `Erro ao processar o capítulo ${i + 1}: ${ch.error}. Os capítulos anteriores estão salvos; clique em "Continuar" para tentar novamente.`;
        progress((doneCount() / total()) * 60, 'erro', msg, i);
        return { outcome: 'erro_ia', message: msg, job: J };
      }
    }

    // --- 8-9) revisão cruzada final ------------------------------
    if (inp.shouldStop?.()) return stopped();
    if (!J.crossReview) {
      progress(62, 'revisao_cruzada', 'Revisão cruzada final: continuidade, repetições e contradições…');
      const cr = await runCrossReview({
        bookTitle: livroMeta.titulo,
        chapters: J.chapters.map(c => ({ index: c.index, title: c.title, text: c.correctedText })),
        registry: J.continuity,
        ai,
      });
      for (const [k, v] of Object.entries(cr.newTexts)) {
        const c = J.chapters[Number(k)];
        c.correctedText = v;
        c.changes = [...c.changes, ...cr.result.autoChanges.filter(a => a.chapterIndex === c.index)];
        c.errorsFixed += cr.result.autoChanges.filter(a => a.chapterIndex === c.index).length;
        c.errorsFound += cr.result.autoChanges.filter(a => a.chapterIndex === c.index).length;
      }
      J.crossReview = cr.result;
      addLog(J, `Revisão cruzada: ${cr.result.autoChanges.length} correção(ões) automática(s), ${cr.result.findings.length} apontamento(s).`);
      await persist();
    }
  }

  const incomplete = J.chapters.filter(c => c.status !== 'corrigido_salvo' && c.status !== 'pendente_autor');
  if (incomplete.length > 0) {
    J.status = 'interrompido';
    await persist();
    const msg = `Há ${incomplete.length} capítulo(s) ainda não corrigido(s). Execute "Corrigir Livro Completo".`;
    return { outcome: 'sem_trabalho', message: msg, job: J };
  }

  // --- 10) consolidação e auditoria global contextual 7 passagens ----
  progress(70, 'consolidacao', 'Consolidando o livro corrigido e executando auditoria global contextual…');
  let livroCorrigido: PipelineLivro = {
    ...livroMeta,
    capitulos: J.chapters.map(c => ({ titulo: c.title, texto: c.correctedText })),
  };

  const audit = StoryContextAuditor.auditManuscript(livroCorrigido, J.original.topico);
  J.auditResult = audit;
  J.storyBibleStructured = audit.bible;

  // Aplica as limpezas estruturais de texto nos capítulos consolidados
  if (audit.sanitizedManuscript && audit.sanitizedManuscript.capitulos) {
    audit.sanitizedManuscript.capitulos.forEach((sc, idx) => {
      if (J.chapters[idx] && sc.texto !== J.chapters[idx].correctedText) {
        J.chapters[idx].correctedText = sc.texto;
      }
    });
    livroCorrigido = audit.sanitizedManuscript;
  }

  if (!J.snapshots) J.snapshots = [];
  J.snapshots.push(StoryContextAuditor.createSnapshot(livroCorrigido, 'Consolidação e Auditoria Editorial'));

  addLog(J, `Auditoria Global Editorial: Nota ${audit.overallScore}/100 (${audit.status}). Resíduos de IA limpos: ${audit.aiContaminationCleaned}. Integridade Narrativa: ${audit.narrativeIntegrityScore}/100.`);

  J.consolidatedHash = hashChapters(livroCorrigido.capitulos);
  await persist();

  // --- 11) sumário reconstruído ----------------------------------
  progress(72, 'sumario', 'Reconstruindo o sumário a partir do conteúdo corrigido…');
  const tocRes = rebuildToc(J.chapters.map(c => ({ title: c.title })));
  J.toc = tocRes.toc;
  J.tocIssues = [...J.tocIssues.filter(t => t.startsWith('Sumário antigo')), ...tocRes.issues];

  // 11.1) Validação de integridade e contagem contra o sumário/original
  const expectedCount = J.original.capitulos.length;
  const consistency = ManuscriptIntegrityEngine.validateBookConsistency(
    expectedCount,
    J.chapters.map(c => ({ title: c.title, text: c.correctedText, index: c.index }))
  );
  if (consistency.discrepancyWarning) {
    J.tocIssues.push(consistency.discrepancyWarning);
    addLog(J, `Atenção: ${consistency.discrepancyWarning}`);
  }

  // --- 12) capa ---------------------------------------------------
  progress(75, 'capa', 'Verificando a capa…');
  J.cover = inspectCover(inp.capaDataUrl, config.formato);
  if (!J.cover.valid) {
    J.status = 'aguardando_capa';
    const msg = J.cover.present
      ? 'A capa do projeto está corrompida/inválida. Gere ou envie uma nova capa frontal e clique em "Continuar" — o texto corrigido já está salvo.'
      : 'Este projeto ainda não tem capa. Gere ou envie a capa frontal e clique em "Continuar" — o texto corrigido já está salvo; o PDF final só é gerado com a capa incorporada.';
    addLog(J, msg);
    await persist();
    progress(75, 'aguardando_capa', msg);
    return { outcome: 'aguardando_capa', message: msg, job: J, livroCorrigido };
  }

  // --- 13-15) diagramação + paginação do sumário + PDF -------------
  progress(78, 'pdf', 'Diagramando e gerando o PDF (capa, sumário com páginas reais, capítulos)…');
  await tick();
  let build: ReturnType<typeof buildKdpPdf>;
  try {
    build = doBuild({
      livro: livroCorrigido,
      capaDataUrl: inp.capaDataUrl,
      formato: config.formato,
      optSumario: config.optSumario,
      tamCapitulo: config.tamCapitulo,
      corCapitulo: config.corCapitulo,
    });
  } catch (e: any) {
    J.status = 'falha';
    const msg = `Falha na geração do PDF: ${e?.message || e}. O texto corrigido continua salvo; nenhuma versão final foi publicada.`;
    addLog(J, msg);
    await persist();
    progress(78, 'falha_pdf', msg);
    return { outcome: 'falha_pdf', message: msg, job: J, livroCorrigido };
  }
  J.layout = {
    pageCount: build.pageCount, chapterStartPages: build.chapterStartPages,
    tocPages: build.tocPages, passes: build.passes, warnings: build.warnings,
  };
  J.toc = J.toc.map((t, i) => ({ ...t, page: build.chapterStartPages[i] }));
  addLog(J, `PDF diagramado: ${build.pageCount} página(s), sumário ${build.tocPages} pág., ${build.passes} passe(s) de paginação.`);
  await persist();

  // --- 16) abre e valida o PDF -------------------------------------
  progress(90, 'validacao', 'Abrindo o PDF gerado e validando (texto, sumário, capa, páginas)…');
  await tick();
  let validation;
  try {
    validation = await doValidate({
      bytes: build.bytes, build, chapters: livroCorrigido.capitulos,
      bookTitle: livroCorrigido.titulo, optSumario: config.optSumario, coverRequired: true,
    });
  } catch (e: any) {
    J.status = 'falha_validacao';
    const msg = `Não foi possível validar o PDF: ${e?.message || e}. Nenhuma versão final foi publicada.`;
    addLog(J, msg);
    await persist();
    progress(90, 'falha_validacao', msg);
    return { outcome: 'falha_validacao', message: msg, job: J, livroCorrigido };
  }
  J.pdfValidation = validation;
  if (!validation.ok) {
    J.status = 'falha_validacao';
    const failed = validation.checks.filter(c => c.critical && c.ok === false).map(c => `${c.label}: ${c.detail}`);
    const msg = `O PDF gerado NÃO passou na validação (${failed.length} falha(s) crítica(s)): ${failed.join(' | ').slice(0, 400)}`;
    addLog(J, msg);
    await persist();
    progress(92, 'falha_validacao', msg);
    return { outcome: 'falha_validacao', message: msg, job: J, livroCorrigido };
  }

  // --- 17) salva definitivamente / 18) dashboard / 19) relatório ----
  progress(96, 'salvando', 'Salvando o livro finalizado…');
  const report = buildEditorialReport(J);
  const pdfBuf = build.bytes.buffer.slice(build.bytes.byteOffset, build.bytes.byteOffset + build.bytes.byteLength) as ArrayBuffer;
  const final: FinalBookRecord = {
    id: `fb-${J.bookId}`,
    bookId: J.bookId,
    jobId: J.id,
    title: livroCorrigido.titulo,
    subtitle: livroCorrigido.subtitulo,
    author: livroCorrigido.autor,
    coverDataUrl: inp.capaDataUrl || undefined,
    pdf: pdfBuf,
    pageCount: build.pageCount,
    sizeBytes: build.bytes.byteLength,
    finalizedAt: Date.now(),
    status: 'finalizado_validado',
    report,
    pendings: [...report.pendingAuthor, ...report.notVerified],
    validation,
  };
  await store.saveFinalBook(final);
  J.finalBookId = final.id;
  J.status = 'concluido';
  addLog(J, `Livro finalizado e validado: ${build.pageCount} páginas, ${(build.bytes.byteLength / 1024).toFixed(0)} KB.`);
  await persist();
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event('kdp-final-books-updated'));
  }
  progress(100, 'concluido', 'LIVRO CORRIGIDO E FINALIZADO COM SUCESSO!');
  return { outcome: 'concluido', message: 'LIVRO CORRIGIDO E FINALIZADO COM SUCESSO!', job: J, livroCorrigido, final, report };
}
