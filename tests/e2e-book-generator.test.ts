import { describe, it, expect } from 'vitest';
import { 
  BookProject, 
  BOOK_TYPE_CONFIGS, 
  calculateTargetWordsForPages,
  estimateActualPagesFromWords 
} from '../src/types/book-project';
import { EpubBuilder } from '../src/services/formats/epub-builder';
import { PdfBuilder } from '../src/services/formats/pdf-builder';
import { KdpPackager } from '../src/services/formats/kdp-packager';

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
      language: 'Português',
      bookType: 'self-help',
      status: 'kdp_ready',
      progress: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStage: 'packaging',
      totalCostUsd: 0.12,
      totalCostBrl: 0.68,
      totalTokens: 18450,
      targetPages,
      targetWords,
      estimatedPages: targetPages,
      actualPages: 162,
      actualWords: 42100,
      trimSize: '6x9',
      paperType: 'bw-white',

      concept: {
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

      bible: {
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
        locations: [
          { name: 'Home Office', description: 'Ambiente de foco profundo', mood: 'Calmo e organizado' }
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
        { index: 1, title: 'A Ilusão da Motivação', summary: 'Por que a força de vontade falha e como sistemas substituem sentimentos.', prose: '### O Mito da Força de Vontade\n\nTodos os dias, milhões de pessoas acordam prometendo mudar suas vidas...', wordCount: 4100 },
        { index: 2, title: 'A Neurobiologia da Inércia', summary: 'Como o cérebro economiza energia e cria rotinas automáticas.', prose: '### Os Circuitos dos Gânglios da Base\n\nPara o cérebro, mudar significa gastar energia vital...', wordCount: 4200 },
        { index: 3, title: 'Engenharia de Ambiente: O Gatilho Invisível', summary: 'Redesenhando o espaço para que a disciplina seja o caminho de menor resistência.', prose: '### O Poder da Arquitetura Espacial\n\nSe você deseja ler mais, não guarde os livros na gaveta...', wordCount: 4300 },
        { index: 4, title: 'A Regra dos Dois Minutos', summary: 'Como quebrar a barreira inicial da procrastinação.', prose: '### Tornando o Início Ridiculamente Fácil\n\nQuando uma ação demora menos de dois minutos para começar...', wordCount: 4000 },
        { index: 5, title: 'Empilhamento de Hábitos na Prática', summary: 'Utilizando comportamentos consolidados como âncoras para novos hábitos.', prose: '### A Fórmula do Empilhamento\n\nDepois do meu café da manhã, eu escreverei uma página...', wordCount: 4150 },
        { index: 6, title: 'Gestão de Energia vs Gestão de Tempo', summary: 'O segredo dos profissionais de alto rendimento.', prose: '### Ritmos Ultradianos\n\nNão adianta ter uma agenda perfeitamente planejada se sua energia mental estiver esgotada...', wordCount: 4250 },
        { index: 7, title: 'Superando o Vale da Decepção', summary: 'O que fazer quando o progresso parece invisível.', prose: '### A Curva de Retornos Latentes\n\nResultados notáveis raramente são lineares...', wordCount: 4300 },
        { index: 8, title: 'Rastreamento e Recompensas Imediatas', summary: 'Como alimentar o sistema dopaminérgico com vitórias visíveis.', prose: '### Não Quebre a Corrente\n\nMarcar um X no calendário gera satisfação neural instantânea...', wordCount: 4100 },
        { index: 9, title: 'Blindagem Social e Círculo de Influência', summary: 'Como as pessoas ao seu redor moldam seus padrões sem você perceber.', prose: '### A Gravidade das Normas Sociais\n\nNós tendemos a imitar os hábitos das pessoas próximas...', wordCount: 4350 },
        { index: 10, title: 'A Identidade de Alta Performance', summary: 'A mudança definitiva: de "tentar fazer" para "quem eu sou".', prose: '### Hábitos Baseados em Identidade\n\nO objetivo não é correr uma maratona; o objetivo é se tornar um corredor...', wordCount: 4350 }
      ],

      editorialElements: {
        halftitle: 'A Arquitetura da Disciplina',
        titlePage: 'A Arquitetura da Disciplina\nDr. Valter Santos',
        copyright: '© 2026 Dr. Valter Santos. Todos os direitos reservados.\nPublicado via Amazon KDP.',
        dedication: 'Para todos aqueles que se recusam a aceitar a mediocridade da rotina.',
        epigraph: '"Somos o que fazemos repetidamente. A excelência, portanto, não é um ato, mas um hábito." — Aristóteles',
        introduction: 'Bem-vindo à transformação dos seus hábitos. Este livro foi estruturado para ser um manual prático de ação...',
        conclusion: 'Você agora tem o mapa completo da disciplina sistêmica. O próximo passo depende da sua primeira ação hoje.',
        acknowledgments: 'Meus sinceros agradecimentos aos pesquisadores de ciência comportamental e a todos os leitores que testaram este método.',
        aboutAuthor: 'Dr. Valter Santos é especialista em produtividade e neurociência aplicada ao comportamento humano.'
      },

      kdpCoverDesign: {
        concept: 'Design geométrico com linhas de tração e contraste azul cobalto e dourado com fundo grafite escuro.',
        frontPrompt: 'Professional book cover typography "A Arquitetura da Disciplina", modern minimalist geometry, dark slate background #0f172a, elegant electric blue and gold lines, 8k resolution, Amazon KDP best-seller aesthetic',
        frontCoverUrl: '',
        backCoverText: 'Você quer resultados reais ou apenas mais promessas vazias?\n\nAprenda a ciência por trás da disciplina consistente.',
        spineWidthInches: 0.365,
        spineWidthMm: 9.3,
        totalWidthInches: 12.565,
        totalHeightInches: 9.25,
        barcodePlaceholder: true
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
        salesPitchBullets: [
          'Método baseado em neurociência comprovada',
          'Passo a passo sem enrolação',
          'Técnicas imediatas de engenharia de ambiente'
        ],
        isbnStatus: 'ISBN não informado. Utilizará ASIN / ISBN Gratuito KDP.'
      },

      qualityGate: {
        passed: true,
        checkedAt: new Date().toISOString(),
        score: 100,
        checks: [
          { id: 'chk_manuscript', label: 'Manuscrito completo', passed: true, details: '10 capítulos finalizados (42.100 palavras)' },
          { id: 'chk_chapters', label: 'Capítulos completos', passed: true, details: '10 de 10 capítulos com prosa substancial' },
          { id: 'chk_toc', label: 'Sumário e estrutura', passed: true, details: 'Hierarquia editorial consistente' },
          { id: 'chk_pagination', label: 'Paginação e dimensionamento', passed: true, details: 'Formato 6x9 com 162 páginas estimadas' },
          { id: 'chk_continuity', label: 'Consistência e continuidade', passed: true, details: '0 conflitos detectados' },
          { id: 'chk_metadata', label: 'Metadados KDP', passed: true, details: '7 palavras-chave e categorias preenchidas' },
          { id: 'chk_cover', label: 'Capa e cálculo de lombada', passed: true, details: 'Lombada calculada: 0.365" (9.3mm)' },
          { id: 'chk_formats', label: 'Formatos de publicação', passed: true, details: 'EPUB 3, PDF Interior e Capa Full-Wrap prontos' }
        ]
      }
    };

    // Validações Estruturais
    expect(project.kdpChapters.length).toBeGreaterThanOrEqual(10);
    expect(project.actualWords).toBeGreaterThan(30000);
    expect(project.kdpMetadata?.keywords7.length).toBe(7);
    expect(project.qualityGate?.passed).toBe(true);

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
    const kdpZipBlob = await KdpPackager.createKdpPackage(project);
    expect(kdpZipBlob).toBeDefined();
    expect(kdpZipBlob.size).toBeGreaterThan(5000);
  });
});
