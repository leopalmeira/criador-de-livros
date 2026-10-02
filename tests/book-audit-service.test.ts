import { describe, it, expect } from 'vitest';
import { BookAuditService } from '../src/services/book-audit-service';
import { BookProject } from '../src/types/book-project';

describe('BookAuditService — Auditoria Final Completa do Livro (Seção 44)', () => {

  const createBaseProject = (overrides?: Partial<BookProject>): BookProject => ({
    id: 'audit-test-book',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'ESCREVENDO',
    priority: 'MÉDIA',
    executionMode: 'assisted',
    title: 'Atomic Habits for Writers',
    subtitle: 'Build Consistent Daily Writing Routines',
    author: 'Leo Palmeira',
    genre: 'Produtividade & Escrita',
    description: 'Guia completo e prático para autores construírem hábitos diários consistentes de escrita e publicarem no KDP.',
    language: 'Português',
    format: 'Capa Comum',
    trimSize: '6x9',
    paperType: 'bw-white',
    estimatedPages: 160,
    actualPages: 160,
    targetPrice: 29.90,
    currency: 'BRL',
    targetMarketplace: 'Amazon BR',
    categories: ['Não-Ficção', 'Autoajuda'],
    keywords: ['escrita', 'hábitos', 'produtividade'],
    targetAudience: 'Escritores aspirantes e profissionais',
    topic: 'Hábitos diários de escrita',
    kdpBookType: 'self-help',
    pipelineStage: 'idle',
    pipelineProgress: 0,
    pipelineLog: [],
    tasks: [],
    notes: '',
    competitorsAsins: [],
    coverImageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
    kdpChapters: [
      {
        index: 0,
        title: 'Fundamentos dos Hábitos',
        prose: 'O segredo da consistência reside na repetição diária de microações intencionais que consolidam a identidade criativa do autor ao longo das semanas de produção editorial. Cada página redigida diariamente aproxima o escritor da conclusão de sua grande obra prima no mercado literário contemporâneo.',
        wordCount: 150,
        targetWordCount: 150,
        scenes: [],
        summary: 'Introdução aos hábitos de escrita.',
        sections: ['Microações', 'Identidade Autoral']
      },
      {
        index: 1,
        title: 'Projetando o Ambiente de Foco',
        prose: 'Eliminar atritos cognitivos no espaço de trabalho amplia a clareza mental e assegura que a energia seja canalizada diretamente para a escrita expressiva. Organizar sua mesa, silenciar notificações e definir blocos inegociáveis de tempo transformam o ato de escrever em um compromisso diário inabalável.',
        wordCount: 160,
        targetWordCount: 160,
        scenes: [],
        summary: 'Otimização do ambiente de escrita.',
        sections: ['Atritos', 'Clareza']
      },
      {
        index: 2,
        title: 'Métricas de Progresso e Revisão',
        prose: 'Acompanhar palavras produzidas diariamente e revisar semanalmente retroalimenta a motivação e garante a conclusão do manuscrito dentro do prazo estipulado. Autores de alto desempenho não contam apenas com a inspiração momentânea, mas com rotinas estruturadas de metas tangíveis e auditoria editorial constante.',
        wordCount: 140,
        targetWordCount: 140,
        scenes: [],
        summary: 'Medição de progresso.',
        sections: ['Métricas', 'Revisão']
      }
    ],
    ...overrides
  });

  it('1. Deve bloquear a finalização de projeto sem título ou sem capa', () => {
    const incomplete = createBaseProject({
      title: '',
      coverImageUrl: undefined,
      kdpCoverDesign: undefined
    });

    const report = BookAuditService.runCompleteAudit(incomplete);

    expect(report.canFinalize).toBe(false);
    expect(report.overallStatus).toBe('blocked');
    expect(report.criticalCount).toBeGreaterThanOrEqual(1);

    const titleCheck = report.checks.find(c => c.id === 'title_main_missing');
    expect(titleCheck).toBeDefined();
    expect(titleCheck?.passed).toBe(false);
    expect(titleCheck?.severity).toBe('critical');

    const coverCheck = report.checks.find(c => c.id === 'cover_existence');
    expect(coverCheck).toBeDefined();
    expect(coverCheck?.passed).toBe(false);
  });

  it('2. Deve detectar divergência entre título do projeto e título da capa', () => {
    const divergent = createBaseProject({
      title: 'Atomic Habits for Writers',
      kdpCoverDesign: {
        title: 'Outro Titulo Diferente',
        subtitle: 'Subtítulo qualquer',
        author: 'Leo Palmeira',
        frontPrompt: '',
        backCoverBlurb: '',
        geometry: {
          trimSize: '6x9',
          pageCount: 160,
          paperType: 'bw-white',
          totalCoverWidthInches: 12.5,
          totalCoverHeightInches: 9.25,
          spineWidthInches: 0.5,
          bleedInches: 0.125,
          spineText: 'Atomic Habits'
        }
      }
    });

    const report = BookAuditService.runCompleteAudit(divergent);
    const divergenceCheck = report.checks.find(c => c.id === 'title_divergence');

    expect(divergenceCheck).toBeDefined();
    expect(divergenceCheck?.passed).toBe(false);
    expect(divergenceCheck?.autoFixAvailable).toBe(true);

    // Testa Auto-Fix de sincronização
    const fixed = BookAuditService.applyAutoFix(divergent, 'sync_title');
    expect(fixed.kdpCoverDesign?.title).toBe('Atomic Habits for Writers');

    const recheck = BookAuditService.runCompleteAudit(fixed);
    expect(recheck.checks.find(c => c.id === 'title_consistency')?.passed).toBe(true);
  });

  it('3. Deve detectar capítulos vazios e páginas pendentes como bloqueadores críticos', () => {
    const projectWithPending = createBaseProject({
      visualPages: [
        {
          id: 'vp-1',
          pageNumber: 1,
          type: 'body',
          chapterIndex: 0,
          elements: [],
          rawText: 'Conteúdo diagramado da página 1.',
          status: 'approved'
        },
        {
          id: 'vp-2',
          pageNumber: 2,
          type: 'body',
          chapterIndex: 0,
          elements: [],
          rawText: '',
          status: 'pending' // Página pendente!
        }
      ]
    });

    const report = BookAuditService.runCompleteAudit(projectWithPending);
    const pageCheck = report.checks.find(c => c.id === 'pages_pending');

    expect(pageCheck).toBeDefined();
    expect(pageCheck?.passed).toBe(false);
    expect(pageCheck?.severity).toBe('critical');
    expect(report.canFinalize).toBe(false);
  });

  it('4. Deve detectar e apontar repetições desnecessárias de parágrafos', () => {
    const repeatedPara = 'Este parágrafo extenso e detalhado foi clonado acidentalmente no livro para testar o detector de redundância editorial da seção 44.';
    const projectWithRepetition = createBaseProject({
      kdpChapters: [
        {
          index: 0,
          title: 'Capítulo 1',
          prose: `${repeatedPara}\n\nTexto adicional exclusivo do capítulo 1 sobre rotinas criativas.`,
          wordCount: 150,
          targetWordCount: 150,
          scenes: [],
          summary: '',
          sections: []
        },
        {
          index: 1,
          title: 'Capítulo 2',
          prose: `Introdução do capítulo 2.\n\n${repeatedPara}\n\nConclusão do capítulo 2.`,
          wordCount: 150,
          targetWordCount: 150,
          scenes: [],
          summary: '',
          sections: []
        },
        {
          index: 2,
          title: 'Capítulo 3',
          prose: 'Texto sem repetições do capítulo 3 para manter a estrutura completa.',
          wordCount: 150,
          targetWordCount: 150,
          scenes: [],
          summary: '',
          sections: []
        }
      ]
    });

    const report = BookAuditService.runCompleteAudit(projectWithRepetition);
    const repCheck = report.checks.find(c => c.id === 'content_repetitions');

    expect(repCheck).toBeDefined();
    expect(repCheck?.passed).toBe(false);
    expect(report.repetitionFindings.length).toBeGreaterThan(0);
  });

  it('5. Deve sinalizar afirmações extremas para conferência anti-alucinação sem inventar fontes falsas', () => {
    const projectWithFact = createBaseProject({
      kdpChapters: [
        {
          index: 0,
          title: 'Capítulo 1',
          prose: 'Vários autores relatam que estudos comprovam que 99% das pessoas desistem antes de completar 30 dias de esforço continuado.',
          wordCount: 150,
          targetWordCount: 150,
          scenes: [],
          summary: '',
          sections: []
        },
        {
          index: 1,
          title: 'Capítulo 2',
          prose: 'Texto legítimo sem dados numéricos soltos para o capítulo 2.',
          wordCount: 150,
          targetWordCount: 150,
          scenes: [],
          summary: '',
          sections: []
        },
        {
          index: 2,
          title: 'Capítulo 3',
          prose: 'Texto legítimo de fechamento para o capítulo 3.',
          wordCount: 150,
          targetWordCount: 150,
          scenes: [],
          summary: '',
          sections: []
        }
      ]
    });

    const report = BookAuditService.runCompleteAudit(projectWithFact);
    const antiCheck = report.checks.find(c => c.id === 'anti_hallucination_check');

    expect(antiCheck).toBeDefined();
    expect(antiCheck?.passed).toBe(false);
    expect(report.hallucinationFindings.length).toBeGreaterThan(0);
    expect(report.hallucinationFindings[0].status).toBe('needs_check');
  });

  it('6. Deve calcular as estatísticas reais da versão final com exatidão', () => {
    const project = createBaseProject({
      actualPages: 160,
      visualPages: [
        {
          id: 'vp-1',
          pageNumber: 1,
          type: 'body',
          elements: [{ id: 'e1', type: 'image', content: '', imageUrl: 'http://example.com/fig1.jpg' }],
          rawText: 'Primeira página do livro com dez palavras exatas aqui agora.',
          status: 'approved'
        },
        {
          id: 'vp-2',
          pageNumber: 2,
          type: 'body',
          elements: [],
          rawText: 'Segunda página do livro com mais dez palavras bem calculadas.',
          status: 'approved'
        }
      ]
    });

    const stats = BookAuditService.calculateFinalRealStats(project);

    expect(stats.chaptersCount).toBe(3);
    expect(stats.pagesCount).toBe(2);
    expect(stats.imagesCount).toBe(1);
    expect(stats.completedPagesCount).toBe(2);
    expect(stats.pendingPagesCount).toBe(0);
  });

  it('7. Deve aprovar e liberar finalização quando todos os requisitos críticos são cumpridos', () => {
    const fullyValid = createBaseProject({
      visualPages: [
        {
          id: 'vp-1',
          pageNumber: 1,
          type: 'body',
          chapterIndex: 0,
          elements: [],
          rawText: 'O segredo da consistência reside na repetição diária de microações intencionais que consolidam a identidade criativa do autor.',
          status: 'approved'
        },
        {
          id: 'vp-2',
          pageNumber: 2,
          type: 'body',
          chapterIndex: 1,
          elements: [],
          rawText: 'Eliminar atritos cognitivos no espaço de trabalho amplia a clareza mental e assegura que a energia seja canalizada diretamente.',
          status: 'approved'
        },
        {
          id: 'vp-3',
          pageNumber: 3,
          type: 'body',
          chapterIndex: 2,
          elements: [],
          rawText: 'Acompanhar palavras produzidas diariamente e revisar semanalmente retroalimenta a motivação e garante a conclusão.',
          status: 'approved'
        }
      ]
    });

    const report = BookAuditService.runCompleteAudit(fullyValid);
    expect(report.criticalCount).toBe(0);
    expect(report.canFinalize).toBe(true);
    expect(report.overallStatus).toBe('approved');
    expect(report.score).toBeGreaterThanOrEqual(85);
  });

});
