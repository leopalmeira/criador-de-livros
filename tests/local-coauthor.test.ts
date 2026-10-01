import { describe, it, expect } from 'vitest';
import { LocalAiEngine } from '../src/services/local-ai-engine';
import { KdpBookPipeline } from '../src/services/kdp-pipeline';
import { AiService } from '../src/services/ai-service';
import { KdpPackager } from '../src/services/formats/kdp-packager';
import { BookProject } from '../src/types/book-project';

describe('Motor Local Embutido - Modo CoAuthor (Offline)', () => {
  it('deve gerar livro completo sobre "crimes na america do Sul" 100% offline e empacotar para o KDP', async () => {
    const aiService = new AiService({
      provider: 'local-builtin',
      apiKey: '',
      model: 'local-coauthor-engine'
    });

    const pipeline = new KdpBookPipeline(aiService);

    // 0. Análise da ideia
    const analysis = await pipeline.analyzeIdea('crimes na america do Sul');
    expect(analysis).toBeDefined();
    expect(analysis.recommendedBookType).toBe('thriller');

    // 1. Conceito com opções de títulos
    const concept = await pipeline.generateConcept(
      'crimes na america do Sul',
      'thriller',
      'Português',
      'Investigador Silva',
      160
    );
    expect(concept.titleOptions?.length).toBeGreaterThanOrEqual(3);
    expect(concept.title).toContain('Sul');

    // 2. Outline detalhado
    const outline = await pipeline.generateOutline(concept, 'thriller');
    expect(outline.length).toBeGreaterThanOrEqual(10);
    expect(outline[0].title).toBeDefined();

    // 3. Bíblia da obra
    const bible = await pipeline.generateBible(concept, outline, 'thriller');
    expect(bible.characters.length).toBeGreaterThan(0);
    expect(bible.locations.length).toBeGreaterThan(0);

    // 4. Escrita do capítulo 1 com contexto e gancho de best-seller
    const chapter1 = await pipeline.writeChapter(concept, bible, outline, outline[0], 'thriller');
    expect(chapter1.prose.length).toBeGreaterThan(500);
    expect(chapter1.wordCount).toBeGreaterThan(100);
    expect(chapter1.prose).toContain('Ponto de Ruptura');

    // 4.1 Auditoria de Continuidade
    const continuityIssues = await pipeline.checkContinuity(outline[0], bible, []);
    expect(Array.isArray(continuityIssues)).toBe(true);

    // 4.2 Parecer Editorial Crítico
    const editorReport = await pipeline.reviewManuscript(concept, [outline[0]], bible);
    expect(editorReport).toBeDefined();
    expect(editorReport.score).toBeGreaterThanOrEqual(80);
    expect(editorReport.strengths.length).toBeGreaterThan(0);

    // 5. Elementos editoriais
    const editorial = await pipeline.generateEditorialMatter(concept, 'Investigador Silva');
    expect(editorial.copyrightNotice).toContain('Amazon Kindle Direct Publishing');
    expect(editorial.introduction?.length).toBeGreaterThan(100);

    // 6. Metadados KDP
    const metadata = await pipeline.generateMetadataKdp(concept, outline, 'Investigador Silva');
    expect(metadata.keywords7.length).toBe(7);
    expect(metadata.categoriesPrimary.length).toBeGreaterThan(0);

    // 7. Capa com geometria KDP
    const cover = await pipeline.generateCoverDesign(concept, bible, 'Investigador Silva', 160);
    expect(cover.geometry.spineWidthInches).toBeGreaterThan(0.2);

    // 8. Pacote KDP .ZIP
    const project: BookProject = {
      id: 'proj_test_crime',
      title: concept.title,
      subtitle: concept.subtitle,
      author: 'Investigador Silva',
      description: concept.shortSynopsis || 'Thriller policial',
      language: 'Português',
      format: 'Capa Comum',
      kdpBookType: 'thriller',
      status: 'DIAGRAMAÇÃO',
      priority: 'ALTA',
      executionMode: 'automatic',
      topic: 'crimes na america do Sul',
      targetPrice: 39.90,
      currency: 'BRL',
      targetMarketplace: 'Amazon.com.br',
      categories: ['Policial', 'Suspense'],
      keywords: ['crime', 'investigador'],
      targetAudience: 'Adultos',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pipelineStage: 'packaging',
      pipelineProgress: 100,
      pipelineLog: [],
      tasks: [],
      notes: '',
      competitorsAsins: [],
      estimatedPages: 160,
      actualPages: 160,
      trimSize: '6x9',
      paperType: 'bw-white',
      kdpConcept: concept,
      kdpBible: bible,
      kdpChapters: [
        { ...outline[0], prose: chapter1.prose, wordCount: chapter1.wordCount }
      ],
      editorialElements: editorial,
      kdpCoverDesign: cover,
      kdpMetadata: metadata
    };

    const zipBlob = await KdpPackager.createKdpPackage(project);
    expect(zipBlob).toBeDefined();
    expect(zipBlob.size).toBeGreaterThan(3000);
  });
});
