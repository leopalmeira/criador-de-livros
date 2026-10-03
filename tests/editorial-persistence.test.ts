import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { runEditorialPipeline, indexedDbStore, computeBookId, type PipelineLivro, type PipelineConfig } from '../src/services/kdp-editorial-pipeline';
import { db } from '../src/database/local-database';
import { openPdf, extractPages } from '../src/services/kdp-pdf-validator';
import { chapterBody, makeFakeAi, makePng, type FakeAiState } from './helpers/editorial-fixtures';

const CONFIG: PipelineConfig = {
  formato: '6x9', optSumario: true, tamCapitulo: 11, corCapitulo: '#1e293b',
  corrector: { retryDelayMs: 1, maxAiAttempts: 2, maxValidationRetries: 1 },
};

const livro = (): PipelineLivro => ({
  titulo: 'Livro Persistente', subtitulo: 'Teste de IndexedDB', autor: 'Fulana de Tal', genero: 'Romance', idioma: 'português',
  capitulos: [
    { titulo: 'Início', texto: chapterBody(1, 6, { ruleErrors: true, aiError: true }) },
    { titulo: 'Meio', texto: chapterBody(2, 6, { ruleErrors: true }) },
    { titulo: 'Fim', texto: chapterBody(3, 5, { aiError: true }) },
  ],
});

describe('persistência real no IndexedDB (BookIntelDB v4)', () => {
  it('salva job por capítulo, retoma após falha e persiste o PDF final como ArrayBuffer', async () => {
    const l = livro();
    const bookId = computeBookId(l);
    const s1: FakeAiState = { blockCalls: [], otherCalls: 0, mode: 'ok', failChapter: 3 };
    const r1 = await runEditorialPipeline({ livro: l, capaDataUrl: makePng(300, 450), config: CONFIG, ai: makeFakeAi(s1), store: indexedDbStore });
    expect(r1.outcome).toBe('erro_ia');

    // simula "refresh": lê direto do banco, não do estado em memória
    const saved = await db.getEditorialJob(bookId);
    expect(saved).not.toBeNull();
    expect(saved!.chapters.filter(c => c.status === 'corrigido_salvo' || c.status === 'pendente_autor').length).toBe(2);
    expect(saved!.chapters[2].status).toBe('erro');
    expect((await db.getAllFinalBooks()).length).toBe(0);

    const s2: FakeAiState = { blockCalls: [], otherCalls: 0, mode: 'ok' };
    const r2 = await runEditorialPipeline({ livro: livro(), capaDataUrl: makePng(300, 450), config: CONFIG, ai: makeFakeAi(s2), store: indexedDbStore });
    expect(r2.outcome).toBe('concluido');
    expect(new Set(s2.blockCalls)).toEqual(new Set([3]));

    const finals = await db.getAllFinalBooks();
    expect(finals.length).toBe(1);
    const f = finals[0];
    expect(f.status).toBe('finalizado_validado');
    expect(f.title).toBe('Livro Persistente');
    expect(f.pdf instanceof ArrayBuffer || ArrayBuffer.isView(f.pdf) || (f.pdf as any)?.byteLength > 0).toBe(true);
    expect(f.coverDataUrl?.startsWith('data:image/png')).toBe(true);

    const pdf = await openPdf(new Uint8Array(f.pdf));
    expect(pdf.numPages).toBe(f.pageCount);
    const text = (await extractPages(pdf)).map(p => p.text).join('\n');
    expect(text).toContain('ouviu');
    expect(text).not.toContain('ouvio');

    const job = await db.getEditorialJob(bookId);
    expect(job!.status).toBe('concluido');
    expect(job!.finalBookId).toBe(f.id);
    expect(job!.original.capitulos[0].texto).toContain('ouvio'); // original preservado no banco
  }, 120000);

  it('rodar de novo com o texto já corrigido reaproveita o job (não duplica correções)', async () => {
    const jobBefore = await db.getEditorialJob(computeBookId(livro()));
    const corrected: PipelineLivro = { ...livro(), capitulos: jobBefore!.chapters.map(c => ({ titulo: c.title, texto: c.correctedText })) };
    const s: FakeAiState = { blockCalls: [], otherCalls: 0, mode: 'ok' };
    const r = await runEditorialPipeline({ livro: corrected, capaDataUrl: makePng(300, 450), config: CONFIG, ai: makeFakeAi(s), store: indexedDbStore });
    expect(r.outcome).toBe('concluido');
    expect(s.blockCalls.length).toBe(0);
    expect((await db.getAllFinalBooks()).length).toBe(1); // substituído, não duplicado
    expect(r.job.chapters.map(c => c.correctedText)).toEqual(jobBefore!.chapters.map(c => c.correctedText));
  }, 120000);
});
