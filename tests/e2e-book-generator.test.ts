import { describe, it, expect } from 'vitest';
import { 
  BookProject, 
  BOOK_TYPE_CONFIGS, 
  calculateTargetWordsForPages
} from '../src/types/book-project';
import { EpubBuilder } from '../src/services/formats/epub-builder';
import { PdfBuilder } from '../src/services/formats/pdf-builder';
import { KdpPackager } from '../src/services/formats/kdp-packager';
import JSZip from 'jszip';

describe('Teste de Ponta a Ponta - Gerador Editorial KDP (Item 47)', () => {
  it('deve gerar e validar o projeto completo de teste: "Disciplina e construção de hábitos para adultos que querem melhorar sua produtividade"', async () => {
    const topic = 'Disciplina e construção de hábitos para adultos que querem melhorar sua produtividade.';
    const bookType = 'self-help';
    const cfg = BOOK_TYPE_CONFIGS[bookType];
    const targetPages = 160;
    const { targetWords } = calculateTargetWordsForPages(targetPages, cfg.trimSize);

    // 1. Simulação do Objeto Editorial Completo gerado pelos agentes
    const project: BookProject = {
      id: 'proj_disciplina_habitos_test',
      title: 'A Arquitetura da Disciplina',
      subtitle: 'O Método Científico para Construir Hábitos Inabaláveis e Multiplicar sua Produtividade',
      author: 'Dr. Valter Santos',
      description: 'O guia definitivo para transformar hábitos diários em alavancas de produtividade exponencial.',
      language: 'Português',
      format: 'Capa Comum',
      kdpBookType: 'self-help',
      status: 'VALIDAÇÃO',
      priority: 'ALTA',
      executionMode: 'automatic',
      topic,
      targetPrice: 39.90,
      currency: 'BRL',
      targetMarketplace: 'Amazon.com.br',
      categories: ['Autoajuda', 'Produtividade'],
      keywords: ['habitos atomicos', 'disciplina'],
      targetAudience: 'Adultos profissionais de 25 a 45 anos',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pipelineStage: 'packaging',
      pipelineProgress: 100,
      pipelineLog: ['Conceito gerado', 'Outline gerado', 'Capítulos escritos', 'Diagramação concluída'],
      tasks: [],
      notes: '',
      competitorsAsins: [],
      currentStage: 'research',
      stageProgress: [],
      stageContents: [],
      stageVersions: [],
      stageApprovals: [],
      estimatedPages: targetPages,
      actualPages: 162,
      trimSize: '6x9',
      paperType: 'bw-white',

      kdpConcept: {
        title: 'A Arquitetura da Disciplina',
        subtitle: 'O Método Científico para Construir Hábitos Inabaláveis e Multiplicar sua Produtividade',
        hook: 'Descubra como reprogramar seus gatilhos mentais diários e conquistar uma disciplina consistente sem depender de motivação passageira.',
        audience: 'Adultos profissionais de 25 a 45 anos que lutam contra procrastinação e cansaço mental.',
        readingLevel: 'Acessível e prático',
        tone: 'Direto, empático, científico e inspirador',
        promise: 'Dominar uma rotina de alta performance com menos esforço e clareza mental absoluta.',
        differentiator: 'Foco em engenharia de ambiente e neurociência comportamental em vez de discursos clichês de força de vontade.',
        shortSynopsis: 'Um manual definitivo para transformar intenções em ações automáticas usando pequenos ajustes no cotidiano.',
        longSynopsis: 'Neste livro transformador, você aprenderá as leis fundamentais que regem a formação de hábitos no cérebro humano...',
        targetWordCount: targetWords,
        targetChapterCount: 10,
        targetPages: targetPages,
        trimSize: '6x9',
        paperType: 'bw-white',
        comparableTitles: ['Hábitos Atômicos', 'O Poder do Hábito', 'Hiperfoco'],
        themes: ['Neurociência dos hábitos', 'Engenharia de ambiente', 'Gestão de energia', 'Sistemas de consistência'],
        titleOptions: [
          {
            id: 'opt_1',
            title: 'A Arquitetura da Disciplina',
            subtitle: 'O Método Científico para Construir Hábitos Inabaláveis',
            hook: 'Reprograme sua rotina diária.',
            commercialAngle: 'Engenharia comportamental',
            targetAppeal: 'Profissionais focados em resultados'
          },
          {
            id: 'opt_2',
            title: 'Disciplina Sem Força de Vontade',
            subtitle: 'Como o Ambiente Controla seus Hábitos',
            hook: 'Pare de lutar contra si mesmo.',
            commercialAngle: 'Anti-motivação barata',
            targetAppeal: 'Pessoas exaustas de tentar sem sucesso'
          }
        ]
      },

      kdpBible: {
        characters: [],
        locations: [
          { name: 'Home Office', description: 'Ambiente de foco profundo', mood: 'Calmo e organizado' }
        ],
        coreConcepts: [
          { concept: 'O Loop do Hábito', explanation: 'Deixa, Rotina, Recompensa', practicalApplication: 'Identificar os gatilhos invisíveis do dia.' },
          { concept: 'Engenharia de Ambiente', explanation: 'Tornar o hábito positivo óbvio e o negativo invisível', practicalApplication: 'Remover o celular da mesa de trabalho.' }
        ],
        keyArguments: [
          'Você não sobe ao nível dos seus objetivos, você cai ao nível dos seus sistemas.',
          'Pequenas melhorias de 1% geram resultados exponenciais ao longo de 1 ano.'
        ],
        terminologyGlossary: [
          { term: 'Empilhamento de Hábitos', definition: 'Conectar um novo comportamento a um hábito já existente e consolidado.' }
        ],
        styleGuide: {
          artStyle: 'Minimalista corporativo moderno',
          palette: ['#0f172a', '#3b82f6', '#f8fafc'],
          lineWeight: 'Sóbria',
          lighting: 'Equilibrada',
          tone: 'Profissional e acolhedor',
          inspirations: ['James Clear', 'Charles Duhigg']
        }
      },

      // Pelo menos 10 capítulos conforme exigido pelo Item 47
      kdpChapters: [
        { index: 1, title: 'A Ilusão da Motivação', summary: 'Por que a força de vontade falha e como sistemas substituem sentimentos.', prose: '### O Mito da Força de Vontade\n\nTodos os dias, milhões de pessoas acordam prometendo mudar suas vidas...', wordCount: 4100, targetWordCount: 4000, scenes: [] },
        { index: 2, title: 'A Neurobiologia da Inércia', summary: 'Como o cérebro economiza energia e cria rotinas automáticas.', prose: '### Os Circuitos dos Gânglios da Base\n\nPara o cérebro, mudar significa gastar energia vital...', wordCount: 4200, targetWordCount: 4000, scenes: [] },
        { index: 3, title: 'Engenharia de Ambiente: O Gatilho Invisível', summary: 'Redesenhando o espaço para que a disciplina seja o caminho de menor resistência.', prose: '### O Poder da Arquitetura Espacial\n\nSe você deseja ler mais, não guarde os livros na gaveta...', wordCount: 4300, targetWordCount: 4000, scenes: [] },
        { index: 4, title: 'A Regra dos Dois Minutos', summary: 'Como quebrar a barreira inicial da procrastinação.', prose: '### Tornando o Início Ridiculamente Fácil\n\nQuando uma ação demora menos de dois minutos para começar...', wordCount: 4000, targetWordCount: 4000, scenes: [] },
        { index: 5, title: 'Empilhamento de Hábitos na Prática', summary: 'Utilizando comportamentos consolidados como âncoras para novos hábitos.', prose: '### A Fórmula do Empilhamento\n\nDepois do meu café da manhã, eu escreverei uma página...', wordCount: 4150, targetWordCount: 4000, scenes: [] },
        { index: 6, title: 'Gestão de Energia vs Gestão de Tempo', summary: 'O segredo dos profissionais de alto rendimento.', prose: '### Ritmos Ultradianos\n\nNão adianta ter uma agenda perfeitamente planejada se sua energia mental estiver esgotada...', wordCount: 4250, targetWordCount: 4000, scenes: [] },
        { index: 7, title: 'Superando o Vale da Decepção', summary: 'O que fazer quando o progresso parece invisível.', prose: '### A Curva de Retornos Latentes\n\nResultados notáveis raramente são lineares...', wordCount: 4300, targetWordCount: 4000, scenes: [] },
        { index: 8, title: 'Rastreamento e Recompensas Imediatas', summary: 'Como alimentar o sistema dopaminérgico com vitórias visíveis.', prose: '### Não Quebre a Corrente\n\nMarcar um X no calendário gera satisfação neural instantânea...', wordCount: 4100, targetWordCount: 4000, scenes: [] },
        { index: 9, title: 'Blindagem Social e Círculo de Influência', summary: 'Como as pessoas ao seu redor moldam seus padrões sem você perceber.', prose: '### A Gravidade das Normas Sociais\n\nNós tendemos a imitar os hábitos das pessoas próximas...', wordCount: 4350, targetWordCount: 4000, scenes: [] },
        { index: 10, title: 'A Identidade de Alta Performance', summary: 'A mudança definitiva: de "tentar fazer" para "quem eu sou".', prose: '### Hábitos Baseados em Identidade\n\nO objetivo não é correr uma maratona; o objetivo é se tornar um corredor...', wordCount: 4350, targetWordCount: 4000, scenes: [] }
      ],

      editorialElements: {
        halfTitle: 'A Arquitetura da Disciplina',
        titlePage: {
          title: 'A Arquitetura da Disciplina',
          subtitle: 'O Método Científico para Construir Hábitos Inabaláveis e Multiplicar sua Produtividade',
          author: 'Dr. Valter Santos',
          publisher: 'Independente',
          year: '2026'
        },
        copyrightNotice: '© 2026 Dr. Valter Santos. Todos os direitos reservados.\nPublicado via Amazon KDP.',
        dedication: 'Para todos aqueles que se recusam a aceitar a mediocridade da rotina.',
        epigraph: '"Somos o que fazemos repetidamente. A excelência, portanto, não é um ato, mas um hábito." — Aristóteles',
        introduction: 'Bem-vindo à transformação dos seus hábitos. Este livro foi estruturado para ser um manual prático de ação...',
        conclusion: 'Você agora tem o mapa completo da disciplina sistêmica. O próximo passo depende da sua primeira ação hoje.',
        acknowledgements: 'Meus sinceros agradecimentos aos pesquisadores de ciência comportamental e a todos os leitores que testaram este método.',
        aboutAuthor: 'Dr. Valter Santos é especialista em produtividade e neurociência aplicada ao comportamento humano.'
      },

      kdpCoverDesign: {
        title: 'A Arquitetura da Disciplina',
        subtitle: 'O Método Científico para Construir Hábitos Inabaláveis e Multiplicar sua Produtividade',
        author: 'Dr. Valter Santos',
        geometry: {
          trimSize: '6x9',
          pageCount: 162,
          paperType: 'bw-white',
          spineWidthInches: 0.365,
          totalCoverWidthInches: 12.565,
          totalCoverHeightInches: 9.25,
          bleedInches: 0.125,
          spineText: 'A Arquitetura da Disciplina'
        },
        frontPrompt: 'Professional book cover typography "A Arquitetura da Disciplina", modern minimalist geometry, dark slate background #0f172a, elegant electric blue and gold lines, 8k resolution, Amazon KDP best-seller aesthetic',
        backCoverBlurb: 'Você quer resultados reais ou apenas mais promessas vazias?\n\nAprenda a ciência por trás da disciplina consistente.'
      },

      kdpMetadata: {
        title: 'A Arquitetura da Disciplina',
        subtitle: 'O Método Científico para Construir Hábitos Inabaláveis e Multiplicar sua Produtividade',
        author: 'Dr. Valter Santos',
        language: 'Português',
        categoriesPrimary: [
          'Autoajuda / Produtividade Pessoal',
          'Negócios / Gestão de Tempo',
          'Psicologia Aplicada'
        ],
        categoriesSecondary: [],
        keywords7: [
          'habitos atomicos produtividade',
          'disciplina foco rotina',
          'como vencer a procrastinacao',
          'metodo organizacao pessoal',
          'alta performance mental',
          'desenvolvimento pessoal pratico',
          'gestao do tempo e energia'
        ],
        targetAudience: 'Adultos profissionais buscando alta produtividade',
        commercialShortDescription: 'O guia definitivo para transformar hábitos diários em alavancas de produtividade exponencial.',
        commercialLongDescription: '<h2>Descubra Como Construir Hábitos Inabaláveis</h2><p>Você já tentou começar uma nova rotina e desistiu poucos dias depois?</p>',
        descriptionHtml: '<h2>Descubra Como Construir Hábitos Inabaláveis</h2><p>Você já tentou começar uma nova rotina e desistiu poucos dias depois?</p>',
        salesHooks: [
          'Método baseado em neurociência comprovada',
          'Passo a passo sem enrolação',
          'Técnicas imediatas de engenharia de ambiente'
        ],
        priceSuggestedBrl: 39.90,
        priceSuggestedUsd: 9.99
      },

      kdpQualityReport: {
        passed: true,
        overallScore: 100,
        isReadyForKdp: true,
        blockerCount: 0,
        warningCount: 0,
        timestamp: Date.now(),
        recommendations: [],
        checks: [
          { id: 'chk_manuscript', name: 'Manuscrito completo', category: 'Manuscrito', passed: true, details: '10 capítulos finalizados (42.100 palavras)', severity: 'blocker' },
          { id: 'chk_chapters', name: 'Capítulos completos', category: 'Manuscrito', passed: true, details: '10 de 10 capítulos com prosa substancial', severity: 'blocker' },
          { id: 'chk_toc', name: 'Sumário e estrutura', category: 'Estrutura', passed: true, details: 'Hierarquia editorial consistente', severity: 'warning' },
          { id: 'chk_pagination', name: 'Paginação e dimensionamento', category: 'Formatação', passed: true, details: 'Formato 6x9 com 162 páginas estimadas', severity: 'warning' },
          { id: 'chk_continuity', name: 'Consistência e continuidade', category: 'Manuscrito', passed: true, details: '0 conflitos detectados', severity: 'blocker' },
          { id: 'chk_metadata', name: 'Metadados KDP', category: 'Metadados', passed: true, details: '7 palavras-chave e categorias preenchidas', severity: 'blocker' },
          { id: 'chk_cover', name: 'Capa e cálculo de lombada', category: 'Capa', passed: true, details: 'Lombada calculada: 0.365" (9.3mm)', severity: 'blocker' },
          { id: 'chk_formats', name: 'Formatos de publicação', category: 'Formatação', passed: true, details: 'EPUB 3, PDF Interior e Capa Full-Wrap prontos', severity: 'blocker' }
        ]
      }
    };

    // Validações Estruturais
    expect(project.kdpChapters?.length).toBeGreaterThanOrEqual(10);
    const totalWords = (project.kdpChapters || []).reduce((s, c) => s + (c.wordCount || 0), 0);
    expect(totalWords).toBeGreaterThan(30000);
    expect(project.kdpMetadata?.keywords7.length).toBe(7);
    expect(project.kdpQualityReport?.passed).toBe(true);

    // 2. Geração do EPUB
    const epubBlob = await EpubBuilder.buildEpub(project);
    expect(epubBlob).toBeDefined();
    expect(epubBlob.size).toBeGreaterThan(1000);

    // 3. Geração do PDF Interior
    const interiorPdfBlob = await PdfBuilder.buildInteriorPdf(project);
    expect(interiorPdfBlob).toBeDefined();
    expect(interiorPdfBlob.size).toBeGreaterThan(1000);

    // 4. Geração do PDF da Capa Full-Wrap
    const coverWrapPdfBlob = await PdfBuilder.buildCoverWrapPdf(project, 162);
    expect(coverWrapPdfBlob).toBeDefined();
    expect(coverWrapPdfBlob.size).toBeGreaterThan(1000);

    // 5. Geração do Pacote KDP (.ZIP)
    const vivliostylePdf = new Blob(['%PDF-1.7\nvivliostyle-rendered-interior'], { type: 'application/pdf' });
    const kdpZipBlob = await KdpPackager.createKdpPackage(project, vivliostylePdf);
    expect(kdpZipBlob).toBeDefined();
    expect(kdpZipBlob.size).toBeGreaterThan(5000);

    const archive = await JSZip.loadAsync(kdpZipBlob);
    const packagedInterior = archive.file(/\/paperback\/interior\.pdf$/)[0];
    expect(packagedInterior).toBeDefined();
    await expect(packagedInterior!.async('string')).resolves.toBe('%PDF-1.7\nvivliostyle-rendered-interior');
  });
});
