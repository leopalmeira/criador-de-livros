import { describe, it, expect } from 'vitest';
import { AiService } from '../src/services/ai-service';
import { KdpBookPipeline } from '../src/services/kdp-pipeline';
import { EpubBuilder } from '../src/services/formats/epub-builder';
import { PdfBuilder } from '../src/services/formats/pdf-builder';
import { KdpPackager } from '../src/services/formats/kdp-packager';
import { BookProject, IBookChapter } from '../src/types/book-project';

describe('Livro de Teste Automático (Item 51) - Teste do BookIntel Pro', () => {
  it('deve executar o pipeline completo: ideia -> planejamento -> outline -> Book Bible -> capítulos -> revisão -> compilação (EPUB e PDF)', async () => {
    // Provedor local embutido para execução determinística e offline
    const aiService = new AiService({ provider: 'local-builtin', model: 'local-coauthor-engine' });
    const pipeline = new KdpBookPipeline(aiService);

    // 1. IDEIA & ANÁLISE
    const idea = 'Quero criar um livro sobre como organizar a vida financeira para jovens adultos.';
    const analysis = await pipeline.analyzeIdea(idea, 'Português');
    expect(analysis.niche).toBeDefined();

    // 2. CONCEITO & TÍTULO
    const concept = await pipeline.generateConcept(idea, 'finance', 'Português');
    concept.title = 'Teste do BookIntel Pro';
    concept.subtitle = 'Manual Prático de Organização Financeira para Jovens Adultos';
    expect(concept.title).toBe('Teste do BookIntel Pro');

    // 3. OUTLINE (SUMÁRIO DE CAPÍTULOS)
    const outline = await pipeline.generateOutline(concept, 'finance', 'Português');
    expect(outline.length).toBeGreaterThanOrEqual(5);

    // 4. BOOK BIBLE (CANON EDITORIAL)
    const bible = await pipeline.generateBible(concept, outline, 'finance', 'Português');
    expect(bible).toBeDefined();

    // 5. REDAÇÃO DOS CAPÍTULOS EM ALTA DENSIDADE
    const chapters: IBookChapter[] = [];
    let prevSummary = '';
    for (let i = 0; i < Math.min(3, outline.length); i++) {
      const ch = outline[i];
      const draft = await pipeline.writeChapter(concept, bible, outline, ch, 'finance', prevSummary, 'Português');
      expect(draft.prose.length).toBeGreaterThan(1500); // Garante que nenhum capítulo tem < 1500 caracteres
      expect(draft.wordCount).toBeGreaterThan(250);
      chapters.push({
        ...ch,
        prose: draft.prose,
        wordCount: draft.wordCount,
        status: 'RASCUNHO'
      });
      prevSummary = ch.summary;
    }

    // 6. ELEMENTOS EDITORIAIS (PÁGINAS PRELIMINARES E FINAIS)
    const editorial = await pipeline.generateEditorialMatter(concept, 'Autor BookIntel Pro');
    expect(editorial.halfTitle).toBe('Teste do BookIntel Pro');
    expect(editorial.copyrightNotice).toContain('©');

    // 7. METADADOS KDP (7 KEYWORDS E CATEGORIAS)
    const metadata = await pipeline.generateMetadataKdp(concept, chapters, 'Autor BookIntel Pro', 'Português');
    expect(metadata.keywords7.length).toBe(7);

    // 8. CRIAÇÃO DO OBJETO DE PROJETO
    const totalWords = chapters.reduce((s, c) => s + (c.wordCount || 0), 0);
    // 8. CRIAÇÃO DO OBJETO DE PROJETO
    const project: BookProject = {
      id: 'proj_teste_bookintel_pro',
      title: concept.title,
      subtitle: concept.subtitle,
      author: 'Autor BookIntel Pro',
      description: concept.shortSynopsis || 'Livro de finanças pessoais',
      language: 'Português',
      format: 'Capa Comum',
      kdpBookType: 'finance',
      status: 'DIAGRAMAÇÃO',
      priority: 'ALTA',
      executionMode: 'automatic',
      topic: 'Investimentos para Iniciantes',
      targetPrice: 39.90,
      currency: 'BRL',
      targetMarketplace: 'Amazon.com.br',
      categories: ['Finanças', 'Negócios'],
      keywords: ['investimentos', 'financas'],
      targetAudience: 'Adultos',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pipelineStage: 'packaging',
      pipelineProgress: 100,
      pipelineLog: [],
      tasks: [],
      notes: '',
      competitorsAsins: [],
      currentStage: 'research',
      stageProgress: [],
      stageContents: [],
      stageVersions: [],
      stageApprovals: [],
      estimatedPages: 160,
      actualPages: 160,
      trimSize: '6x9',
      paperType: 'bw-white',
      kdpConcept: concept,
      kdpBible: bible,
      kdpChapters: chapters,
      editorialElements: editorial,
      kdpMetadata: metadata
    };

    // 9. COMPILAÇÃO DE ARQUIVOS (EPUB, PDF INTERIOR, CAPA E PACOTE KDP)
    // 9.1 EPUB
    const epubBlob = await EpubBuilder.buildEpub(project);
    expect(epubBlob).toBeDefined();
    expect(epubBlob.size).toBeGreaterThan(1000);

    // 9.2 PDF Interior
    const interiorPdfBlob = await PdfBuilder.buildInteriorPdf(project);
    expect(interiorPdfBlob).toBeDefined();
    expect(interiorPdfBlob.size).toBeGreaterThan(1000);

    // 9.3 PDF Capa Full Wrap
    const coverWrapBlob = await PdfBuilder.buildCoverWrapPdf(project, 160);
    expect(coverWrapBlob).toBeDefined();
    expect(coverWrapBlob.size).toBeGreaterThan(1000);

    // 9.4 Pacote Completo KDP (.ZIP)
    const kdpZipBlob = await KdpPackager.createKdpPackage(project);
    expect(kdpZipBlob).toBeDefined();
    expect(kdpZipBlob.size).toBeGreaterThan(5000);
  });
});
