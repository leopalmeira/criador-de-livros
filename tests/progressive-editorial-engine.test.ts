import { describe, it, expect, beforeEach } from 'vitest';
import { BookProject } from '../src/types/book-project';
import { ProgressivePageEngine } from '../src/services/progressive-page-engine';
import { EditorialContextService } from '../src/services/editorial-context-service';
import { AiService } from '../src/services/ai-service';

describe('ProgressivePageEngine & EditorialContextService - Processo Editorial Unificado', () => {
  let sampleProject: BookProject;

  beforeEach(() => {
    sampleProject = {
      id: 'proj_test_editorial_flow',
      title: 'Mindset da Disciplina',
      subtitle: 'Como Construir Hábitos Inquebráveis e Vencer a Procrastinação',
      author: 'Lucas Ferreira',
      topic: 'Disciplina pessoal e produtividade prática',
      genre: 'Autoajuda / Produtividade',
      targetAudience: 'Profissionais e estudantes que lutam contra a inconsistência',
      description: 'Um método definitivo e prático para desenvolver constância e blindar o foco diário.',
      estimatedPages: 120,
      kdpChapters: [
        {
          index: 1,
          title: 'Capítulo 1: O Mito da Motivação Espontânea',
          summary: 'Desmistificar a dependência de picos emocionais e apresentar o poder dos sistemas diários.',
          targetWordCount: 2500,
          scenes: [],
          sections: [
            'A Falácia da Força de Vontade',
            'Sistemas Superam Metas',
            'A Psicologia do Primeiro Passo'
          ]
        },
        {
          index: 2,
          title: 'Capítulo 2: O Loop dos Hábitos Automáticos',
          summary: 'Explicar a neurociência da deixa, rotina e recompensa no contexto moderno.',
          targetWordCount: 2500,
          scenes: [],
          sections: [
            'Gatilhos Visuais e Contextuais',
            'Reduzindo a Resistência Inicial',
            'O Papel da Dopamina'
          ]
        }
      ],
      stageStatuses: {
        'research': 'COMPLETED',
        'book-titles': 'COMPLETED',
        'resources': 'COMPLETED',
        'author-persona': 'COMPLETED',
        'purpose': 'COMPLETED',
        'book-details': 'COMPLETED',
        'author-bio': 'COMPLETED',
        'outline': 'COMPLETED',
        'write': 'IN_PROGRESS',
        'description': 'NOT_STARTED',
        'book-cover': 'NOT_STARTED',
        'finish': 'NOT_STARTED'
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    } as unknown as BookProject;
  });

  it('1. Constrói o esqueleto real com paginação e restrição editorial por título/objetivo (Regras 8, 9 e 17)', () => {
    const skeleton = ProgressivePageEngine.initializeBookSkeleton(sampleProject);

    expect(skeleton.length).toBeGreaterThan(10);
    // Pré-textuais aprovadas
    expect(skeleton[0].type).toBe('half-title');
    expect(skeleton[0].status).toBe('approved');
    expect(skeleton[2].type).toBe('title-page');
    expect(skeleton[6].type).toBe('toc');

    // Páginas de capítulos geradas com títulos e objetivos específicos do sumário
    const ch1Pages = skeleton.filter(p => p.chapterIndex === 1);
    expect(ch1Pages.length).toBeGreaterThanOrEqual(4); // Abertura + 3 seções

    const opener = ch1Pages[0];
    expect(opener.type).toBe('chapter-opener');
    expect(opener.title).toContain('O Mito da Motivação Espontânea');
    expect(opener.goal).toBeDefined();

    const sec1 = ch1Pages[1];
    expect(sec1.title).toBe('A Falácia da Força de Vontade');
    expect(sec1.goal).toContain('A Falácia da Força de Vontade');
    expect(sec1.status).toBe('pending');
  });

  it('2. Gera página sob demanda com restrição de título, validação e memória estruturada (Regras 9, 10, 12, 14 e 15)', async () => {
    const aiService = new AiService({ provider: 'local-builtin' });
    const skeleton = ProgressivePageEngine.initializeBookSkeleton(sampleProject);
    sampleProject.visualPages = skeleton;

    // Localiza a primeira página de conteúdo pendente (seção 1 do capítulo 1)
    const targetIdx = skeleton.findIndex(p => p.chapterIndex === 1 && p.status === 'pending');
    expect(targetIdx).toBeGreaterThan(0);

    const { updatedProject, generatedPage } = await ProgressivePageEngine.generatePageProgressively(
      sampleProject,
      targetIdx,
      aiService
    );

    // Página gerada e aprovada
    expect(generatedPage.status).toBe('approved');
    expect(generatedPage.elements.length).toBeGreaterThan(1);
    expect(generatedPage.elements.some(e => e.type === 'paragraph')).toBe(true);

    // Texto completo sem cortes e sem marcadores de placeholder
    const fullText = generatedPage.elements.map(e => e.content).join(' ');
    expect(fullText.length).toBeGreaterThan(200);
    expect(fullText).not.toContain('[INSERIR IMAGEM]');
    expect(fullText).not.toContain('[IMAGEM AQUI]');

    // Memória estruturada da página gravada
    expect(generatedPage.pageContext).toBeDefined();
    expect(generatedPage.pageContext?.title).toBe(generatedPage.title);
    expect(generatedPage.pageContext?.summary).toBeDefined();

    // Persistência no projeto
    expect(updatedProject.pageContexts?.[generatedPage.pageNumber]).toBeDefined();
    expect(updatedProject.lastGeneratedPage).toBe(generatedPage.pageNumber);
  });

  it('3. Preserva edições manuais como versão oficial e atualiza memória de continuidade (Regra 20)', () => {
    const skeleton = ProgressivePageEngine.initializeBookSkeleton(sampleProject);
    const page = skeleton[7]; // Primeira página de capítulo
    const manualProse = 'Esta é a reflexão oficial editada pelo autor. Princípio fundamental: a disciplina liberta.';

    const memory = EditorialContextService.extractPageStructuredMemory(
      page.pageNumber,
      page.title || 'Título',
      page.goal || 'Objetivo',
      manualProse,
      'Capítulo 1',
      page.sectionTitle
    );

    expect(memory.summary).toContain('disciplina liberta');
    expect(memory.keyPoints.length).toBeGreaterThan(0);
  });

  it('4. Regenera exclusivamente uma página específica preservando as demais e o contexto (Regra 21)', async () => {
    const aiService = new AiService({ provider: 'local-builtin' });
    const skeleton = ProgressivePageEngine.initializeBookSkeleton(sampleProject);
    sampleProject.visualPages = skeleton;

    const targetIdx = skeleton.findIndex(p => p.chapterIndex === 1 && p.status === 'pending');
    const { updatedProject: p1, generatedPage: firstGen } = await ProgressivePageEngine.generatePageProgressively(
      sampleProject,
      targetIdx,
      aiService
    );

    const { updatedProject: p2, generatedPage: regenPage } = await ProgressivePageEngine.regenerateSinglePage(
      p1,
      targetIdx,
      aiService
    );

    expect(regenPage.pageNumber).toBe(firstGen.pageNumber);
    expect(regenPage.title).toBe(firstGen.title);
    expect(p2.visualPages?.length).toBe(p1.visualPages?.length);
  });

  it('5. Compila COVER_BRIEF com dados consolidados e gera 3 direções artísticas originais (Regras 24, 27, 28 e 29)', () => {
    const { brief, proposals } = EditorialContextService.buildCoverBriefAndProposals(sampleProject);

    // COVER BRIEF
    expect(brief.title).toBe(sampleProject.title);
    expect(brief.subtitle).toBe(sampleProject.subtitle);
    expect(brief.genre).toBe(sampleProject.genre);
    expect(brief.targetAudience).toBe(sampleProject.targetAudience);
    expect(brief.originalityRules.length).toBeGreaterThan(0);
    expect(brief.originalityRules[0]).toContain('PROIBIDO copiar');

    // 3 Direções Visuais Distintas para o mesmo livro
    expect(proposals.length).toBe(3);

    const [propA, propB, propC] = proposals;
    expect(propA.directionName).toContain('Minimalismo');
    expect(propB.directionName).toContain('Cinematográfica');
    expect(propC.directionName).toContain('Ilustração Editorial');

    // Todas usam o mesmo título do livro
    expect(propA.prompt).toContain('MINDSET DA DISCIPLINA');
    expect(propB.prompt).toContain('MINDSET DA DISCIPLINA');
    expect(propC.prompt).toContain('MINDSET DA DISCIPLINA');

    // Cada uma com estética visual e paleta distintas
    expect(propA.paletteDescription).not.toBe(propB.paletteDescription);
    expect(propB.visualConcept).not.toBe(propC.visualConcept);
  });
});
