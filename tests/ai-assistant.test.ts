import { describe, it, expect } from 'vitest';
import { AiAssistantService } from '../src/services/ai-assistant-service';
import { AiService } from '../src/services/ai-service';
import { BookProject } from '../src/types/book-project';

describe('AiAssistantService & Memória do Livro', () => {
  const aiService = new AiService({ provider: 'local-builtin' });
  const assistant = new AiAssistantService(aiService);

  const mockProject: BookProject = {
    id: 'proj_ai_test',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'ESCREVENDO',
    priority: 'ALTA',
    executionMode: 'assisted',
    title: 'Crônicas do Tempo',
    author: 'Helena Silva',
    description: 'Ficção sobre viagens e enigmas temporais.',
    language: 'Português',
    format: 'Capa Comum',
    trimSize: '6x9',
    paperType: 'bw-cream',
    estimatedPages: 200,
    targetPrice: 29.90,
    currency: 'BRL',
    targetMarketplace: 'amazon.com.br',
    categories: ['sci-fi'],
    keywords: [],
    targetAudience: 'Geral',
    topic: 'Ficção temporal',
    kdpBookType: 'sci-fi',
    pipelineStage: 'writing',
    pipelineProgress: 60,
    pipelineLog: [],
    tasks: [],
    notes: '',
    competitorsAsins: [],
    currentStage: 'research',
    stageProgress: [],
    stageContents: [],
    stageVersions: [],
    stageApprovals: [],
    bookMemory: {
      characters: [
        { id: '1', name: 'Laura', role: 'Protagonista', appearance: 'Cabelos castanhos, olhos atentos', personality: 'Determinada e analítica' },
        { id: '2', name: 'Dr. Valério', role: 'Mentor', appearance: 'Homem idoso de óculos redondos', personality: 'Sábio e reservado' }
      ],
      locations: [
        { id: '1', name: 'Laboratório Subterrâneo', description: 'Câmara secreta com maquinários de cobre', mood: 'Tenso e misterioso' }
      ],
      events: [
        { id: '1', chapterIndex: 1, title: 'Ativação do Núcleo', description: 'Laura e Valério ligaram a máquina pela primeira vez' }
      ],
      rules: [
        { id: '1', category: 'Física Temporal', rule: 'Nenhum viajante pode alterar um evento já presenciado por si mesmo' }
      ],
      concepts: []
    }
  };

  it('deve executar ação de continuação de texto utilizando a memória da obra', async () => {
    const input = 'Laura olhou para o relógio de pulso e percebeu que os ponteiros giravam em sentido anti-horário.';
    const result = await assistant.executeAction('continue', input, mockProject);

    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(input.length);
  });

  it('deve executar auditoria de repetições e coerência', async () => {
    const input = 'O tempo passava rápido e o tempo não esperava ninguém, pois o tempo é implacável.';
    const result = await assistant.executeAction('detect_repetition', input, mockProject);

    expect(result.text).toBeDefined();
    expect(result.analysisNotes).toBeDefined();
  });

  it('deve checar consistência narrativa contra a Book Memory', async () => {
    const input = 'Laura decidiu mudar o passado imediatamente para salvar o relógio.';
    const result = await assistant.executeAction('check_consistency', input, mockProject);

    expect(result.text).toBeDefined();
    expect(result.analysisNotes).toBeDefined();
  });
});
