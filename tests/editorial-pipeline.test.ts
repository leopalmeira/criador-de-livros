import { describe, it, expect } from 'vitest';
import { runEditorialPipeline, createMemoryStore, computeBookId, type PipelineLivro, type PipelineConfig } from '../src/services/kdp-editorial-pipeline';
import { openPdf, extractPages } from '../src/services/kdp-pdf-validator';
import { buildKdpPdf } from '../src/services/kdp-pdf-builder';
import { chapterBody, makeFakeAi, makePng, type FakeAiState } from './helpers/editorial-fixtures';

const CONFIG: PipelineConfig = {
  formato: '6x9', optSumario: true, tamCapitulo: 11, corCapitulo: '#1e293b',
  corrector: { retryDelayMs: 1, maxAiAttempts: 2, maxValidationRetries: 1 },
};
const CAPA = makePng(300, 450);

function livroBase(): PipelineLivro {
  return {
    titulo: 'A Cidade das Sombras', subtitulo: 'Um romance de mistério', autor: 'Ana Souza', genero: 'Romance', idioma: 'português',
    capitulos: [
      { titulo: 'Capítulo 1: A chegada', texto: chapterBody(1, 7, { ruleErrors: true, aiError: true }) },
      { titulo: 'O segredo do relógio', texto: chapterBody(2, 6, { ruleErrors: true }) },
      { titulo: 'Sombras no porão', texto: chapterBody(3, 8, { aiError: true }) },
      { titulo: 'A última carta', texto: chapterBody(4, 5) },
    ],
  };
}
const newAi = (over: Partial<FakeAiState> = {}) => {
  const state: FakeAiState = { blockCalls: [], otherCalls: 0, mode: 'ok', ...over };
  return { state, ai: makeFakeAi(state) };
};

describe('pipeline editorial — fluxo completo', () => {
  it('corrige capítulo a capítulo, gera o PDF, valida e salva (com asserções reais)', async () => {
    const store = createMemoryStore();
    const { ai, state } = newAi();
    const livro = livroBase();
    const originalSnapshot = JSON.stringify(livro.capitulos);
    const progresso: { percent: number; stage: string }[] = [];

    const r = await runEditorialPipeline({ livro, capaDataUrl: CAPA, config: CONFIG, ai, store, onProgress: p => progresso.push({ percent: p.percent, stage: p.stage }) });

    expect(r.outcome).toBe('concluido');
    expect(r.message).toBe('LIVRO CORRIGIDO E FINALIZADO COM SUCESSO!');
    expect(r.job.status).toBe('concluido');

    // original preservado, sem mutação do livro de entrada
    expect(JSON.stringify(livro.capitulos)).toBe(originalSnapshot);
    expect(JSON.stringify(r.job.original.capitulos)).toBe(originalSnapshot);

    // texto corrigido de verdade
    const all = r.livroCorrigido!.capitulos.map(c => c.texto).join('\n');
    expect(all).not.toContain('Porisso');
    expect(all).not.toContain('nÃ£o');
    expect(all).not.toContain('ouvio');
    expect(all).not.toContain(',,');
    expect(all).toContain('Por isso');
    expect(all).toContain('ouviu');
    expect(all).toContain('você');
    expect(r.livroCorrigido!.capitulos[0].texto).not.toBe(livro.capitulos[0].texto);
    // capítulo sem erros semeados permanece íntegro
    expect(r.livroCorrigido!.capitulos[3].texto).toBe(livro.capitulos[3].texto);

    // cada capítulo salvo com original, corrigido e lista de alterações reais
    for (const c of r.job.chapters) {
      expect(['corrigido_salvo', 'pendente_autor']).toContain(c.status);
      expect(c.originalText.length).toBeGreaterThan(100);
      expect(c.correctedText.length).toBeGreaterThan(100);
      for (const ch of c.changes) {
        expect(ch.original).not.toBe(ch.corrected);
        expect(ch.reason.length).toBeGreaterThan(3);
      }
    }
    expect(r.job.chapters[0].changes.some(c => c.source === 'ia' && c.corrected.includes('ouviu'))).toBe(true);

    // progresso real e monotônico até 100
    const pcts = progresso.map(p => p.percent);
    expect(pcts[pcts.length - 1]).toBe(100);
    expect(Math.max(...pcts)).toBe(100);
    expect(progresso.some(p => p.stage === 'correcao')).toBe(true);
    expect(progresso.some(p => p.stage === 'validacao')).toBe(true);

    // continuidade criada e atualizada
    expect(r.job.continuity.chapterEndStates.length).toBeGreaterThanOrEqual(4);
    expect(r.job.continuity.aiChapters.length).toBe(4);

    // sumário reconstruído com páginas reais
    expect(r.job.toc.map(t => t.title)).toEqual(['A chegada', 'O segredo do relógio', 'Sombras no porão', 'A última carta']);
    expect(r.job.toc.every(t => (t.page ?? 0) > 2)).toBe(true);

    // PDF final salvo e REABERTO
    const final = store.finals.get(r.final!.id)!;
    expect(final.status).toBe('finalizado_validado');
    expect(final.pdf.byteLength).toBeGreaterThan(5000);
    const pdf = await openPdf(new Uint8Array(final.pdf));
    expect(pdf.numPages).toBe(final.pageCount);
    const pages = await extractPages(pdf);
    expect(pages[0].hasImage).toBe(true); // capa na 1ª página
    const pdfText = pages.map(p => p.text).join('\n');
    expect(pdfText).toContain('Por isso');
    expect(pdfText).not.toContain('Porisso');
    expect(pdfText).not.toContain('ouvio');
    expect(pdfText).toContain('Sumário');
    // sem páginas em branco
    for (const p of pages.slice(1)) expect(p.lines.length).toBeGreaterThan(1);
    expect(final.validation.ok).toBe(true);
    expect(final.validation.checks.filter(c => c.critical && c.ok === false)).toEqual([]);

    // relatório honesto
    const rep = final.report;
    expect(rep.chaptersIdentified).toBe(4);
    expect(rep.spellingErrors).toBeGreaterThan(0);
    expect(rep.correctedAutomatically.length).toBeGreaterThan(0);
    expect(rep.summary).toMatch(/Nenhuma ferramenta garante/);
    expect(rep.cover.kind).toBe('frontal');
    expect(rep.cover.notes.join(' ')).toMatch(/capa completa de impressão/i);
    expect(rep.pdfPages).toBe(final.pageCount);
    expect(state.blockCalls.length).toBeGreaterThanOrEqual(4);
  }, 120000);

  it('processa em ordem sequencial e SALVA cada capítulo antes de avançar', async () => {
    const store = createMemoryStore();
    const events: string[] = [];
    const origSave = store.saveJob.bind(store);
    store.saveJob = async job => {
      await origSave(job);
      job.chapters.forEach(c => { if ((c.status === 'corrigido_salvo' || c.status === 'pendente_autor') && !events.includes(`saved:${c.index + 1}`)) events.push(`saved:${c.index + 1}`); });
    };
    const state: FakeAiState = { blockCalls: [], otherCalls: 0, mode: 'ok' };
    const inner = makeFakeAi(state);
    const ai = async (p: string) => {
      const m = /CAPÍTULO (\d+):/.exec(p);
      if (m && p.includes('TEXTO A REVISAR')) {
        const n = Number(m[1]);
        if (!events.includes(`ai:${n}`)) events.push(`ai:${n}`);
      }
      return inner(p);
    };
    const r = await runEditorialPipeline({ livro: livroBase(), capaDataUrl: CAPA, config: CONFIG, ai, store });
    expect(r.outcome).toBe('concluido');
    const iAi = (n: number) => events.indexOf(`ai:${n}`);
    const iSaved = (n: number) => events.indexOf(`saved:${n}`);
    for (let n = 1; n < 4; n++) {
      expect(iSaved(n)).toBeGreaterThan(-1);
      expect(iSaved(n)).toBeLessThan(iAi(n + 1)); // capítulo n salvo antes de a IA tocar o n+1
    }
  }, 120000);

  it('retoma após falha da IA no meio, sem refazer capítulos já salvos', async () => {
    const store = createMemoryStore();
    const a1 = newAi({ failChapter: 3 });
    const r1 = await runEditorialPipeline({ livro: livroBase(), capaDataUrl: CAPA, config: CONFIG, ai: a1.ai, store });
    expect(r1.outcome).toBe('erro_ia');
    expect(r1.job.chapters.map(c => c.status).slice(0, 2).every(s => s === 'corrigido_salvo' || s === 'pendente_autor')).toBe(true);
    expect(r1.job.chapters[2].status).toBe('erro');
    expect(store.finals.size).toBe(0);
    const savedCh1 = store.jobs.get(r1.job.bookId)!.chapters[0].correctedText;
    expect(savedCh1.length).toBeGreaterThan(100);

    const a2 = newAi();
    const r2 = await runEditorialPipeline({ livro: livroBase(), capaDataUrl: CAPA, config: CONFIG, ai: a2.ai, store });
    expect(r2.outcome).toBe('concluido');
    expect(new Set(a2.state.blockCalls)).toEqual(new Set([3, 4])); // capítulos 1 e 2 NÃO foram reprocessados
    expect(r2.job.chapters[0].correctedText).toBe(savedCh1);
    expect(store.finals.size).toBe(1);
  }, 120000);

  it('interrupção pelo usuário salva o progresso e permite continuar', async () => {
    const store = createMemoryStore();
    const a1 = newAi();
    let stop = false;
    const r1 = await runEditorialPipeline({
      livro: livroBase(), capaDataUrl: CAPA, config: CONFIG, ai: a1.ai, store,
      shouldStop: () => stop,
      onProgress: p => { if (p.chaptersDone >= 2) stop = true; },
    });
    expect(r1.outcome).toBe('interrompido');
    expect(r1.job.chapters.filter(c => c.status === 'corrigido_salvo' || c.status === 'pendente_autor').length).toBe(2);
    const a2 = newAi();
    const r2 = await runEditorialPipeline({ livro: livroBase(), capaDataUrl: CAPA, config: CONFIG, ai: a2.ai, store });
    expect(r2.outcome).toBe('concluido');
    expect(new Set(a2.state.blockCalls)).toEqual(new Set([3, 4]));
  }, 120000);

  it('sem capa: salva o texto corrigido, NÃO gera PDF final e pede a capa; depois conclui sem refazer a IA', async () => {
    const store = createMemoryStore();
    const a1 = newAi();
    const r1 = await runEditorialPipeline({ livro: livroBase(), capaDataUrl: null, config: CONFIG, ai: a1.ai, store });
    expect(r1.outcome).toBe('aguardando_capa');
    expect(r1.message).toMatch(/capa/i);
    expect(store.finals.size).toBe(0);
    expect(r1.job.chapters.every(c => c.correctedText.length > 100)).toBe(true);
    expect(r1.livroCorrigido).toBeTruthy();

    const a2 = newAi();
    // o usuário agora tem a capa; o texto de entrada pode ser o corrigido OU o original
    const r2 = await runEditorialPipeline({ livro: r1.livroCorrigido!, capaDataUrl: CAPA, config: CONFIG, ai: a2.ai, store });
    expect(r2.outcome).toBe('concluido');
    expect(a2.state.blockCalls.length).toBe(0);
    expect(store.finals.size).toBe(1);
  }, 120000);

  it('capa corrompida é tratada como ausente (não inventa capa)', async () => {
    const store = createMemoryStore();
    const r = await runEditorialPipeline({ livro: livroBase(), capaDataUrl: 'data:image/png;base64,AAAAAAAA', config: CONFIG, ai: newAi().ai, store });
    expect(r.outcome).toBe('aguardando_capa');
    expect(r.job.cover.valid).toBe(false);
    expect(r.job.cover.notes.join(' ')).toMatch(/corrompido/i);
  }, 120000);

  it('falha na geração do PDF preserva os capítulos e não publica versão final', async () => {
    const store = createMemoryStore();
    const r1 = await runEditorialPipeline({
      livro: livroBase(), capaDataUrl: CAPA, config: CONFIG, ai: newAi().ai, store,
      buildPdf: () => { throw new Error('jsPDF explodiu'); },
    });
    expect(r1.outcome).toBe('falha_pdf');
    expect(store.finals.size).toBe(0);
    expect(r1.job.chapters.every(c => c.correctedText.length > 100)).toBe(true);
    const a2 = newAi();
    const r2 = await runEditorialPipeline({ livro: livroBase(), capaDataUrl: CAPA, config: CONFIG, ai: a2.ai, store });
    expect(r2.outcome).toBe('concluido');
    expect(a2.state.blockCalls.length).toBe(0);
  }, 120000);

  it('PDF corrompido é reprovado pela validação e NÃO é publicado', async () => {
    const store = createMemoryStore();
    const r = await runEditorialPipeline({
      livro: livroBase(), capaDataUrl: CAPA, config: CONFIG, ai: newAi().ai, store,
      buildPdf: input => { const b = buildKdpPdf(input); return { ...b, bytes: b.bytes.slice(0, Math.floor(b.bytes.length / 2)) }; },
    });
    expect(r.outcome).toBe('falha_validacao');
    expect(r.job.pdfValidation?.ok).toBe(false);
    expect(store.finals.size).toBe(0);
    expect(r.job.status).toBe('falha_validacao');
  }, 120000);

  it('IA que resume, inventa ou devolve lixo é REJEITADA (anti-alucinação) e o capítulo vira pendente', async () => {
    for (const mode of ['summarize', 'invent', 'garbage'] as const) {
      const store = createMemoryStore();
      const a = newAi({ mode });
      const r = await runEditorialPipeline({ livro: livroBase(), capaDataUrl: CAPA, config: CONFIG, ai: a.ai, store });
      const all = r.job.chapters.map(c => c.correctedText).join('\n');
      expect(all, mode).not.toContain('dragão');
      // texto não encolheu: as regras continuam valendo, mas nada foi resumido
      for (const c of r.job.chapters) {
        expect(c.correctedText.length, mode).toBeGreaterThan(c.originalText.length * 0.95);
        expect(c.status, mode).toBe('pendente_autor');
        expect(c.pendings.some(p => p.resolution === 'NAO_FOI_POSSIVEL_VERIFICAR'), mode).toBe(true);
        expect(c.aiVerified, mode).toBe(false);
      }
      expect(r.report?.aiFullyVerified ?? false, mode).toBe(false);
      expect(r.report?.notVerified.length ?? 1, mode).toBeGreaterThan(0);
    }
  }, 180000);

  it('capítulo sem título, sumário antigo, títulos duplicados e capítulos repetidos viram pendências (nada é apagado em silêncio)', async () => {
    const store = createMemoryStore();
    const dupBody = chapterBody(9, 6);
    const livro = livroBase();
    livro.capitulos = [
      { titulo: 'Sumário', texto: '1. A chegada ........ 3\n2. Outro ........ 9' },
      { titulo: '', texto: chapterBody(1, 6) },
      { titulo: 'Repetido', texto: dupBody },
      { titulo: 'Repetido', texto: dupBody },
      { titulo: 'Final', texto: chapterBody(5, 5) },
    ];
    const r = await runEditorialPipeline({ livro, capaDataUrl: CAPA, config: CONFIG, ai: newAi().ai, store });
    expect(r.outcome).toBe('concluido');
    expect(r.job.chapters.length).toBe(4); // sumário antigo descartado
    expect(r.job.tocIssues.join(' ')).toMatch(/Sumário antigo/);
    expect(r.job.chapters[0].title).toBe('Capítulo 1');
    expect(r.job.chapters[0].pendings.some(p => p.kind === 'titulo')).toBe(true);
    const f = r.job.crossReview!.findings.map(x => x.description).join(' | ');
    expect(f).toMatch(/Título duplicado/);
    expect(f).toMatch(/semelhantes|repetido/i);
    // o texto do capítulo duplicado NÃO foi removido automaticamente
    expect(r.job.chapters[2].correctedText.length).toBeGreaterThan(500);
    expect(r.job.chapters[3].correctedText.length).toBeGreaterThan(500);
    expect(r.final!.pendings.length).toBeGreaterThan(0);
    // o original (incluindo o sumário antigo) permanece intacto
    expect(r.job.original.capitulos[0].titulo).toBe('Sumário');
  }, 120000);

  it('parágrafo duplicado consecutivo é removido na revisão cruzada e registrado', async () => {
    const store = createMemoryStore();
    const livro = livroBase();
    const body = chapterBody(7, 6);
    const paras = body.split('\n\n');
    paras.splice(3, 0, paras[2]); // duplica o parágrafo 3
    livro.capitulos[1].texto = paras.join('\n\n');
    const r = await runEditorialPipeline({ livro, capaDataUrl: CAPA, config: CONFIG, ai: newAi().ai, store });
    expect(r.outcome).toBe('concluido');
    const cr = r.job.crossReview!;
    expect(cr.autoChanges.length).toBe(1);
    expect(cr.autoChanges[0].type).toBe('repeticao');
    expect(r.job.chapters[1].correctedText.split('\n\n').filter(p => p === paras[2]).length).toBe(1);
  }, 120000);

  it('sem IA disponível o pipeline NÃO finge sucesso total: aplica só regras e marca "não foi possível verificar"', async () => {
    const store = createMemoryStore();
    const r = await runEditorialPipeline({ livro: livroBase(), capaDataUrl: CAPA, config: CONFIG, ai: null, store });
    expect(r.outcome).toBe('concluido');
    expect(r.report!.aiFullyVerified).toBe(false);
    expect(r.report!.notVerified.length).toBeGreaterThan(0);
    expect(r.job.chapters.every(c => c.status === 'pendente_autor')).toBe(true);
    // regras ainda corrigiram o que é determinístico
    expect(r.livroCorrigido!.capitulos.map(c => c.texto).join('\n')).toContain('Por isso');
    // "ouvio" só a IA corrige — continua lá e NÃO é declarado como corrigido
    expect(r.livroCorrigido!.capitulos.map(c => c.texto).join('\n')).toContain('ouvio');
  }, 120000);

  it('onlyFinalize sem correção prévia informa que não há trabalho salvo', async () => {
    const store = createMemoryStore();
    const r = await runEditorialPipeline({ livro: livroBase(), capaDataUrl: CAPA, config: CONFIG, ai: null, store, onlyFinalize: true });
    expect(r.outcome).toBe('sem_trabalho');
    expect(store.finals.size).toBe(0);
  });

  it('bookId é estável', () => {
    const l = livroBase();
    expect(computeBookId(l)).toBe(computeBookId({ ...l }));
    expect(computeBookId(l)).not.toBe(computeBookId({ ...l, titulo: 'Outro' }));
  });
});
