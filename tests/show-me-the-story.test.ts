import { describe, it, expect } from 'vitest';
import { ShowMeTheStoryEngine } from '../src/services/show-me-the-story-engine';
import { BookProject } from '../src/types/book-project';

describe('Show Me The Story Engine (Nigh Integration & Page Budget)', () => {
  it('deve calcular o orçamento de páginas e capítulos com precisão KDP', () => {
    const budget150 = ShowMeTheStoryEngine.calculateStoryBudget(150);
    expect(budget150.targetPages).toBe(150);
    expect(budget150.frontMatterPages).toBe(6);
    expect(budget150.backMatterPages).toBe(4);
    expect(budget150.storyPages).toBe(140);
    expect(budget150.chapterCount).toBeGreaterThanOrEqual(8);
    expect(budget150.chapterCount).toBeLessThanOrEqual(14);
    expect(budget150.spineWidthInches).toBeGreaterThan(0.2);
    expect(budget150.totalWords).toBe(150 * 250);
  });

  it('deve calcular corretamente orçamentos curtos e longos', () => {
    const budget60 = ShowMeTheStoryEngine.calculateStoryBudget(60);
    expect(budget60.targetPages).toBe(60);
    expect(budget60.chapterCount).toBeGreaterThanOrEqual(4);

    const budget300 = ShowMeTheStoryEngine.calculateStoryBudget(300);
    expect(budget300.targetPages).toBe(300);
    expect(budget300.bindingMarginInches).toBe(0.75);
  });

  it('deve aplicar De-AI Polish na prosa removendo clichês genéricos', () => {
    const raw = 'No mundo acelerado de hoje, é importante lembrar que a persistência é crucial para o sucesso.';
    const polished = ShowMeTheStoryEngine.deAiPolishProse(raw);
    expect(polished).not.toContain('No mundo acelerado de hoje');
    expect(polished).not.toContain('crucial para');
    expect(polished).toContain('na rotina saturada da era digital');
  });

  it('deve gerar história completa com capítulos e páginas diagramadas correspondentes à meta escolhida', () => {
    const initialProject: BookProject = {
      id: 'proj_story_test',
      title: 'O Enigma do Vale Escuro',
      topic: 'Investigação policial e segredos de família',
      author: 'Leandro Palmeira',
      trimSize: '6x9',
      estimatedPages: 120,
      kdpBookType: 'thriller',
      status: 'IDEIA',
      priority: 'MÉDIA',
      executionMode: 'assisted',
      description: '',
      language: 'Português',
      format: 'Capa Comum',
      paperType: 'bw-white',
      targetPrice: 29.9,
      currency: 'BRL',
      targetMarketplace: 'amazon.com.br',
      categories: [],
      keywords: [],
      targetAudience: 'Adulto',
      pipelineStage: 'idle',
      pipelineProgress: 0,
      pipelineLog: [],
      tasks: [],
      notes: '',
      competitorsAsins: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const generated = ShowMeTheStoryEngine.generateStoryBook(initialProject, 120);
    expect(generated.kdpChapters).toBeDefined();
    expect(generated.kdpChapters!.length).toBeGreaterThan(0);
    expect(generated.kdpChapters?.[0]?.prose?.length || 0).toBeGreaterThan(200);
    expect(generated.visualPages).toBeDefined();
    expect(generated.visualPages!.length).toBeGreaterThan(20);
  });
});
