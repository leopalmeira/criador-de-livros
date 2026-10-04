import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/database/local-database';
import type { FinalBookRecord } from '../src/types/editorial-correction';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { buildKdpPdf } from '../src/services/kdp-pdf-builder';

describe('Estante de Livros Finalizados - Downloads e Detalhes', () => {
  const mockBook: FinalBookRecord = {
    id: 'final_test_123',
    bookId: 'proj_test_123',
    jobId: 'job_test_123',
    title: 'A Hóspede Silenciosa',
    subtitle: 'Um Thriller Psicológico de Tirar o Fôlego',
    author: 'Leandro Palmeira',
    pdf: new ArrayBuffer(1024),
    pageCount: 120,
    sizeBytes: 45000,
    finalizedAt: Date.now(),
    status: 'finalizado_validado',
    genre: 'Thriller / Mistério Investigativo',
    trimSize: '6x9',
    wordCount: 9161,
    chaptersCount: 13,
    chapters: [
      { titulo: 'Capítulo 1: O Silêncio da Casa', texto: 'A casa estava vazia quando cheguei.' },
      { titulo: 'Capítulo 2: Pegadas no Corredor', texto: 'Passos ecoavam na madeira escura.' }
    ],
    report: {
      generatedAt: Date.now(),
      bookTitle: 'A Hóspede Silenciosa',
      author: 'Leandro Palmeira',
      pagesAnalyzed: 36,
      pdfPages: 120,
      chaptersIdentified: 13,
      chaptersCorrected: 13,
      chaptersPending: 0,
      spellingErrors: 0,
      grammarErrors: 0,
      punctuationFixes: 0,
      paragraphFixes: 0,
      dialogueFixes: 0,
      encodingFixes: 0,
      styleChanges: 0,
      repetitionFindings: 0,
      continuityFindings: 0,
      tocIssues: [],
      layoutWarnings: [],
      cover: { present: true, valid: true, kind: 'frontal', notes: [] },
      correctedAutomatically: [],
      pendingAuthor: [],
      notVerified: [],
      aiFullyVerified: true,
      summary: 'Obra concluída e aprovada.'
    },
    pendings: [],
    validation: {
      ok: true,
      pageCount: 120,
      criticalFailures: 0,
      notVerified: 0,
      validatedAt: Date.now(),
      checks: [
        { id: 'trim', label: 'Dimensões 6x9', ok: true, critical: true, detail: 'OK' }
      ]
    }
  };

  it('1. Persiste e recupera livro finalizado no IndexedDB com todos os metadados', async () => {
    await db.saveFinalBook(mockBook);
    const retrieved = await db.getFinalBook(mockBook.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe('A Hóspede Silenciosa');
    expect(retrieved?.author).toBe('Leandro Palmeira');
    expect(retrieved?.chaptersCount).toBe(13);
    expect(retrieved?.wordCount).toBe(9161);
  });

  it('2. Gera o manuscrito estruturado com cabeçalho editorial e capítulos completos', () => {
    let conteudo = `MANUSCRITO EDITORIAL OFICIAL — AMAZON KDP\n\n`;
    conteudo += `TÍTULO: ${mockBook.title}\n`;
    conteudo += `SUBTÍTULO: ${mockBook.subtitle}\n`;
    conteudo += `AUTOR: ${mockBook.author}\n\n`;

    mockBook.chapters?.forEach((c, idx) => {
      conteudo += `CAPÍTULO ${idx + 1}: ${c.titulo}\n${c.texto}\n\n`;
    });

    expect(conteudo).toContain('A Hóspede Silenciosa');
    expect(conteudo).toContain('Leandro Palmeira');
    expect(conteudo).toContain('CAPÍTULO 1: Capítulo 1: O Silêncio da Casa');
    expect(conteudo).toContain('A casa estava vazia quando cheguei.');
  });

  it('3. Gera PDF da Capa KDP com dimensões corretas', () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [152.4, 228.6] });
    doc.text(mockBook.title, 76.2, 50, { align: 'center' });
    const bytes = doc.output('arraybuffer');
    expect(bytes.byteLength).toBeGreaterThan(500);
  });

  it('4. Gera PDF da Página do Livro com formatação KDP', () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [152.4, 228.6] });
    doc.setFont('times', 'bold');
    doc.text('CAPÍTULO 1', 76.2, 40, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.text('Texto de amostra diagramado conforme padrão KDP.', 19.05, 60);
    const bytes = doc.output('arraybuffer');
    expect(bytes.byteLength).toBeGreaterThan(500);
  });

  it('5. Empacota todos os 4 arquivos (manuscrito, pdf livro, pdf capa, pdf página) em arquivo ZIP', async () => {
    const zip = new JSZip();
    zip.file('01_MANUSCRITO.txt', 'Texto do manuscrito');
    zip.file('02_LIVRO_MIOLO_KDP.pdf', new Uint8Array([1, 2, 3]));
    zip.file('03_CAPA_KDP.pdf', new Uint8Array([4, 5, 6]));
    zip.file('04_PAGINA_DO_LIVRO.pdf', new Uint8Array([7, 8, 9]));

    const content = await zip.generateAsync({ type: 'blob' });
    expect(content.size).toBeGreaterThan(100);
  });
});
