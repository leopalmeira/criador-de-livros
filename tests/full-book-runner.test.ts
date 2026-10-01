import { describe, it, expect } from 'vitest';
import { FullBookRunner, resolveStages, FULL_BOOK_STAGES } from '../src/services/full-book-runner';
import { AiService } from '../src/services/ai-service';
import { BookProject } from '../src/types/book-project';

const buildProject = (): BookProject => ({
  id: 'proj_runner',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  status: 'ESCREVENDO',
  priority: 'ALTA',
  executionMode: 'automatic',
  title: 'Engenharia da Disciplina',
  author: 'Autor Independente',
  description: 'Guia prático sobre hábitos e foco.',
  language: 'Português',
  format: 'Capa Comum',
  trimSize: '6x9',
  paperType: 'bw-white',
  estimatedPages: 160,
  targetPrice: 29.90,
  currency: 'BRL',
  targetMarketplace: 'amazon.com.br',
  categories: ['self-help'],
  keywords: [],
  targetAudience: 'Adultos 25-40',
  topic: 'disciplina e hábitos',
  kdpBookType: 'self-help',
  pipelineStage: 'idle',
  pipelineProgress: 0,
  pipelineLog: [],
  tasks: [],
  notes: '',
  competitorsAsins: [],
  currentStage: 'research',
  stageProgress: [],
  stageContents: [],
  stageVersions: [],
  stageApprovals: []
});

const ai = () => new AiService({ provider: 'local-builtin' });

describe('Orquestrador de produção completa (FullBookRunner)', () => {
  it('deve expandir "complete_all" para todas as etapas, do conceito ao pacote final', () => {
    expect(resolveStages(['complete_all'])).toEqual(FULL_BOOK_STAGES);
  });

  it('deve preencher as etapas de pré-requisito quando o pedido é parcial', () => {
    const stages = resolveStages(['chapters']);

    expect(stages).toContain('concept');
    expect(stages).toContain('outline');
    expect(stages).toContain('bible');
    expect(stages).toContain('chapters');
    expect(stages).not.toContain('layout');
    expect(stages).not.toContain('export');
  });

  it('deve diagramar as páginas antes de auditar e exportar', () => {
    const stages = resolveStages(['export']);

    expect(stages).toContain('chapters');
    expect(stages).toContain('layout');
    expect(stages).toContain('quality');
    expect(stages).toContain('export');
  });

  it('deve gerar a obra inteira de forma autônoma com o motor local', async () => {
    const runner = new FullBookRunner(buildProject(), ai(), { stages: ['complete_all'] });
    const summary = await runner.run();

    expect(summary.failedStages).toEqual([]);
    expect(summary.cancelled).toBe(false);
    expect(summary.completedStages).toEqual(FULL_BOOK_STAGES);

    const project = runner.project;

    // Conceito e estrutura
    expect(project.kdpConcept?.title).toBeTruthy();
    expect((project.kdpChapters || []).length).toBeGreaterThan(0);

    // Manuscrito completo
    const chapters = project.kdpChapters || [];
    const written = chapters.filter(c => (c.prose || '').trim().length > 0);
    expect(written.length).toBe(chapters.length);
    expect(summary.chaptersWritten).toBe(chapters.length);

    // Elementos editoriais, capa, metadados, páginas e auditoria
    expect(project.editorialElements?.conclusion).toBeTruthy();
    expect(project.kdpCoverDesign?.geometry?.spineWidthInches).toBeGreaterThan(0);
    expect(project.kdpMetadata?.keywords7).toHaveLength(7);
    expect((project.visualPages || []).length).toBeGreaterThan(0);
    expect(project.actualPages).toBe((project.visualPages || []).length);
    expect((project.images || []).length).toBeGreaterThan(0);
    expect(project.kdpQualityReport).toBeDefined();
    expect(project.kdpPackageGeneratedAt).toBeGreaterThan(0);

    // Estado final
    expect(project.pipelineStage).toBe('completed');
    expect(project.pipelineProgress).toBe(100);
    expect(project.pipelineLog.length).toBeGreaterThan(0);
  }, 120000);

  it('deve ser retomável: uma segunda execução não reescreve o que já está pronto', async () => {
    const project = buildProject();
    const first = new FullBookRunner(project, ai(), { stages: ['complete_all'] });
    await first.run();

    const second = new FullBookRunner(first.project, ai(), { stages: ['complete_all'] });
    const summary = await second.run();

    expect(summary.chaptersWritten).toBe(0);
    expect(summary.failedStages).toEqual([]);
    expect(second.project.kdpChapters?.length).toBe(first.project.kdpChapters?.length);
  }, 120000);

  it('deve registrar a etapa no log e persistir o progresso a cada avanço', async () => {
    const snapshots: BookProject[] = [];
    const runner = new FullBookRunner(buildProject(), ai(), { stages: ['complete_all'] }, {
      onProjectChange: (p) => {
        snapshots.push(JSON.parse(JSON.stringify(p)));
      }
    });

    await runner.run();

    expect(snapshots.length).toBeGreaterThan(10);
    expect(snapshots[snapshots.length - 1].pipelineStage).toBe('completed');
    expect(runner.project.pipelineLog.some(line => line.includes('produção autônoma'))).toBe(true);
  }, 120000);

  it('deve interromper a execução mantendo o progresso salvo', async () => {
    let calls = 0;
    const runner = new FullBookRunner(buildProject(), ai(), { stages: ['complete_all'] }, {
      shouldCancel: () => {
        calls++;
        return calls > 2;
      }
    });

    const summary = await runner.run();

    expect(summary.cancelled).toBe(true);
    expect(summary.completedStages.length).toBeLessThan(FULL_BOOK_STAGES.length);
    expect(runner.project.pipelineStage).toBe('idle');
  }, 120000);
});
