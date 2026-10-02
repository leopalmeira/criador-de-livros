import { BookProject, BookVisualPage, BookPageContext, IBookChapter } from '../types/book-project';

export interface BookEditorialContext {
  global: {
    title: string;
    subtitle: string;
    author: string;
    theme: string;
    purpose: string;
    targetAudience: string;
    genre: string;
    tone: string;
    style: string;
    synopsis: string;
    preface: string;
  };
  structural: {
    tableOfContents: Array<{
      chapterNumber: number;
      title: string;
      goal: string;
      sections: string[];
    }>;
  };
  factsAndRules: string[];
}

export interface CoverBrief {
  title: string;
  subtitle: string;
  author: string;
  genre: string;
  category: string;
  theme: string;
  targetAudience: string;
  purpose: string;
  synopsis: string;
  preface: string;
  tableOfContentsSummary: string;
  tone: string;
  style: string;
  coreConcepts: string[];
  keyVisualElements: string[];
  editorialIdentity: string;
  originalityRules: string[];
}

export interface CoverDirectionProposal {
  directionId: 'direction_a' | 'direction_b' | 'direction_c';
  directionName: string;
  artStyle: string;
  visualConcept: string;
  paletteDescription: string;
  compositionFocalPoint: string;
  prompt: string;
}

export class EditorialContextService {
  /**
   * Consolida a FONTE DE VERDADE única do projeto editorial (Seção 2)
   */
  public static getBookEditorialContext(project: BookProject): BookEditorialContext {
    const title = project.title || 'Livro Sem Título';
    const subtitle = project.subtitle || '';
    const author = project.author || 'Autor da Obra';
    const theme = project.topic || title;
    const purpose = project.stageData?.purpose?.bookPromise || project.guidedProjectLine || project.description || title;
    const targetAudience = project.targetAudience || 'Público Geral';
    const genre = project.genre || project.kdpBookType || 'Não-Ficção';
    const tone = project.kdpConcept?.tone || 'Inspirador, didático e prático';
    const style = (project.editorialElements as any)?.styleGuide?.tone || 'Claro, fluido e profissional';
    const synopsis = project.stageData?.description?.fullDescription || project.description || title;
    const preface = project.editorialElements?.introduction || project.stageData?.['book-details']?.introduction || '';

    // Estrutura de capítulos e seções
    const chapters = project.kdpChapters || [];
    const tableOfContents = chapters.map((ch, idx) => ({
      chapterNumber: ch.index || idx + 1,
      title: ch.title || `Capítulo ${idx + 1}`,
      goal: ch.summary || (ch as any).purpose || (ch as any).goal || `Desenvolvimento dos conceitos do capítulo ${idx + 1}`,
      sections: ((ch as any).sections as any[])?.map((s: any) => typeof s === 'string' ? s : s.title) || []
    }));

    // Fatos imutáveis e regras
    const factsAndRules = [
      `Título oficial: "${title.toUpperCase()}"`,
      subtitle ? `Subtítulo: "${subtitle}"` : '',
      `Autor: ${author}`,
      `Gênero: ${genre}`,
      `Público: ${targetAudience}`,
      `Proposta: ${purpose}`
    ].filter(Boolean);

    return {
      global: {
        title,
        subtitle,
        author,
        theme,
        purpose,
        targetAudience,
        genre,
        tone,
        style,
        synopsis,
        preface
      },
      structural: {
        tableOfContents
      },
      factsAndRules
    };
  }

  /**
   * Constrói o prompt hierárquico contextual para a geração progressiva de uma página específica (Seções 3, 9 e 10)
   */
  public static buildProgressivePagePrompt(
    project: BookProject,
    targetPage: BookVisualPage,
    previousPage?: BookVisualPage,
    allPages: BookVisualPage[] = []
  ): { systemPrompt: string; userPrompt: string } {
    const context = this.getBookEditorialContext(project);

    // Resumo das 3 páginas anteriores relevantes (Seção 10)
    const prevPagesContext: string[] = [];
    if (targetPage.pageNumber > 1) {
      const recentPages = allPages
        .filter(p => p.pageNumber < targetPage.pageNumber && p.rawText && p.rawText.length > 30)
        .slice(-3);

      for (const rp of recentPages) {
        prevPagesContext.push(`[Página ${rp.pageNumber} - "${rp.title || 'Seção'}"]: ${rp.rawText?.substring(0, 280)}...`);
      }
    }

    const chapterIndex = targetPage.chapterIndex || 1;
    const chapter = (project.kdpChapters || []).find(c => c.index === chapterIndex) || project.kdpChapters?.[chapterIndex - 1];
    const chapterTitle = chapter?.title || `Capítulo ${chapterIndex}`;
    const pageTitle = targetPage.title || `Continuação do Capítulo ${chapterIndex}`;
    const pageGoal = targetPage.goal || `Aprofundar os ensinamentos da seção com clareza editorial e exemplos práticos.`;

    const systemPrompt = `Você é o Coautor e Editor Sênior do livro "${context.global.title.toUpperCase()}".
Sua tarefa é redigir o texto EXATO e COMPLETO da PÁGINA ${targetPage.pageNumber}, respeitando estritamente a hierarquia editorial:
Título → Subtítulo → Tema → Proposta → Sinopse → Sumário → Capítulo → Título da Página → Objetivo.

RESTRIÇÕES INEGOCIÁVEIS:
1. O TÍTULO DA PÁGINA ("${pageTitle}") É UMA RESTRIÇÃO EDITORIAL OBRIGATÓRIA. Desenvolva EXATAMENTE este assunto. Não fuja para tópicos não relacionados.
2. CONTINUIDADE IMPECÁVEL: Conecte logicamente o texto com o que foi dito na página anterior, sem reiniciar a explicação do zero.
3. CONTEÚDO COMPLETO: Escreva o texto completo e diagramável para preencher a página (cerca de 250 a 380 palavras por página em livro comercial), dividido em 3 a 5 parágrafos harmônicos.
4. SEM PLACEHOLDERS: NUNCA use marcadores como "[Inserir imagem]", "[Continua...]" ou texto incompleto.
5. TOM E ESTILO: ${context.global.tone}, em português impecável, envolvente e de alto valor prático para ${context.global.targetAudience}.`;

    const userPrompt = `DADOS DO PROJETO EDITORIAL:
- LIVRO: "${context.global.title}" ${context.global.subtitle ? `(${context.global.subtitle})` : ''}
- AUTOR: ${context.global.author}
- GÊNERO: ${context.global.genre}
- PÚBLICO-ALVO: ${context.global.targetAudience}
- PROPOSTA CENTRAL: ${context.global.purpose}
- CAPÍTULO ATUAL: "${chapterTitle}"

PÁGINA A SER REDIGIDA AGORA:
- PÁGINA NÚMERO: ${targetPage.pageNumber}
- TÍTULO OBRIGATÓRIO DESTA PÁGINA: "${pageTitle}"
- OBJETIVO EDITORIAL DESTA PÁGINA: ${pageGoal}
${targetPage.sectionTitle ? `- SEÇÃO: "${targetPage.sectionTitle}"` : ''}

${previousPage && previousPage.rawText ? `CONTEXTO DA PÁGINA ANTERIOR (PÁGINA ${previousPage.pageNumber}):
"${previousPage.rawText.substring(Math.max(0, previousPage.rawText.length - 450))}"` : 'Esta é a página inicial da seção.'}

${prevPagesContext.length > 0 ? `HISTÓRICO RECENTE DO LIVRO:\n${prevPagesContext.join('\n')}` : ''}

INSTRUÇÃO FINAL: Redija o texto completo e contínuo desta página com excelência literária.`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Valida a página gerada quanto à coerência, continuidade e ausência de desvios (Seção 14)
   */
  public static validatePageContent(
    project: BookProject,
    targetPage: BookVisualPage,
    content: string,
    previousPage?: BookVisualPage
  ): { isValid: boolean; issues: string[]; cleanedContent: string } {
    const issues: string[] = [];
    let cleaned = content.trim();

    // 1. Remove eventuais marcadores indesejados como [INSERIR IMAGEM]
    cleaned = cleaned.replace(/\[\s*(inserir|adicionar|imagem|foto|figura|ilustra[çc][ãa]o)[^\]]*\]/gi, '').trim();

    // 2. Remove tags de conversa com o usuário como "Aqui está o texto:", "Certamente!"
    cleaned = cleaned.replace(/^(aqui est[áa]|certamente|com certeza|com prazer)[^\n]*\n+/i, '').trim();

    // 3. Validação de tamanho mínimo para página completa
    if (cleaned.length < 200) {
      issues.push('Texto muito curto para preencher uma página diagramada completa.');
    }

    // 4. Verificação de repetição imediata da página anterior
    if (previousPage?.rawText) {
      const prevStart = previousPage.rawText.substring(0, 100).toLowerCase();
      const currStart = cleaned.substring(0, 100).toLowerCase();
      if (prevStart === currStart) {
        issues.push('A página atual iniciou com repetição exata do conteúdo da página anterior.');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      cleanedContent: cleaned
    };
  }

  /**
   * Extrai e atualiza a Memória Estruturada da página concluída (Seção 12)
   */
  public static extractPageStructuredMemory(
    pageNumber: number,
    title: string,
    goal: string,
    content: string,
    chapterTitle?: string,
    sectionTitle?: string
  ): BookPageContext {
    // Extrai frases principais para pontos-chave
    const sentences = content
      .split(/[.!?]/)
      .map(s => s.trim())
      .filter(s => s.length > 15);

    const keyPoints = sentences.slice(0, 3);
    const summary = sentences.length > 0 
      ? sentences.slice(0, 2).join('. ') + '.'
      : content.substring(0, 160);

    return {
      pageNumber,
      title,
      goal,
      chapterTitle,
      sectionTitle,
      keyPoints,
      establishedFacts: [title, `Abordado na página ${pageNumber}`],
      conceptsIntroduced: keyPoints.slice(0, 2),
      pendingQuestions: [],
      summary,
      connectionToNext: `Continuidade do tópico "${title}" para a próxima página.`,
      status: 'approved',
      updatedAt: Date.now()
    };
  }

  /**
   * Constrói o COVER_BRIEF completo e as 3 direções artísticas exclusivas para a capa (Seções 15 a 31)
   */
  public static buildCoverBriefAndProposals(project: BookProject): {
    brief: CoverBrief;
    proposals: CoverDirectionProposal[];
  } {
    const ctx = this.getBookEditorialContext(project);

    // Constrói resumo do sumário
    const tocSummary = ctx.structural.tableOfContents
      .slice(0, 6)
      .map(ch => `${ch.chapterNumber}. ${ch.title}`)
      .join(' | ');

    const brief: CoverBrief = {
      title: ctx.global.title,
      subtitle: ctx.global.subtitle,
      author: ctx.global.author,
      genre: ctx.global.genre,
      category: project.categories?.[0] || ctx.global.genre,
      theme: ctx.global.theme,
      targetAudience: ctx.global.targetAudience,
      purpose: ctx.global.purpose,
      synopsis: ctx.global.synopsis,
      preface: ctx.global.preface ? ctx.global.preface.substring(0, 300) : '',
      tableOfContentsSummary: tocSummary,
      tone: ctx.global.tone,
      style: ctx.global.style,
      coreConcepts: project.keywords || [ctx.global.genre, 'bestseller'],
      keyVisualElements: [
        'Tipografia imponente de livro comercial',
        'Contraste de alto impacto visual',
        'Acabamento nobre de editora comercial'
      ],
      editorialIdentity: `Livro comercial de alta performance para Amazon KDP`,
      originalityRules: [
        'PROIBIDO copiar ilustrações, fotos ou personagens de capas existentes.',
        'Transformar referências de bestsellers em características conceituais abstratas.',
        'Composição 100% original e exclusiva para esta obra.'
      ]
    };

    // Gera as 3 propostas com direções visuais distintas (Seções 18, 19, 20, 28 e 29)
    const proposals: CoverDirectionProposal[] = [
      {
        directionId: 'direction_a',
        directionName: 'Capa 1 — Minimalismo Dramático de Alto Impacto',
        artStyle: 'Minimalismo contemporâneo com contraste visual dominante e símbolo central marcante',
        visualConcept: 'Um elemento icônico isolado com iluminação focal dramática, transmitindo foco, autoridade e elegância editorial.',
        paletteDescription: 'Fundo escuro profundo (ardósia/obsidiana) com detalhes em dourado metálico ou cobre nobre.',
        compositionFocalPoint: 'Símbolo geométrico ou arquétipo central no terço médio, com título em caixa alta dominante no topo.',
        prompt: `Professional book cover for "${ctx.global.title.toUpperCase()}" by ${ctx.global.author}.
Art Direction: Dramatic Minimalism with powerful focal icon, deep rich dark slate background, elegant gold accent lighting.
Title "${ctx.global.title.toUpperCase()}" rendered prominently in bold masterclass typography. 2:3 vertical aspect ratio, Amazon KDP commercial bestseller quality. Original artwork.`
      },
      {
        directionId: 'direction_b',
        directionName: 'Capa 2 — Cinematográfica & Atmosférica',
        artStyle: 'Composição cinematográfica de grande escala com iluminação volumétrica e profundidade imersiva',
        visualConcept: 'Cenário envolvente que evoca a jornada e a transformação prometida pelo livro, com luz suave de horizonte.',
        paletteDescription: 'Tons profundos de azul meia-noite, esmeralda escuro ou âmbar com feixe de luz contrastante.',
        compositionFocalPoint: 'Perspectiva em profundidade com atmosfera densa, título integrado de forma escultural no terço superior.',
        prompt: `Cinematic professional book cover for "${ctx.global.title.toUpperCase()}" by ${ctx.global.author}.
Art Direction: Immersive depth, cinematic volumetric rim lighting, deep emerald and midnight blue tones, prestigious commercial non-fiction aesthetics.
Title "${ctx.global.title.toUpperCase()}" prominently integrated in luxury serif typography. 2:3 vertical proportion, bestselling book jacket.`
      },
      {
        directionId: 'direction_c',
        directionName: 'Capa 3 — Ilustração Editorial de Luxo',
        artStyle: 'Ilustração editorial de prestígio com texturas nobres, linhas clássicas e refinamento de grande editora',
        visualConcept: 'Gravura ou ilustração vetorial nobre entrelaçada com a tipografia, remetendo a bestsellers internacionais clássicos.',
        paletteDescription: 'Bordeaux nobre, verde floresta profundo ou azul marinho com texturas de papel de linho e acabamento bronze.',
        compositionFocalPoint: 'Moldura sutil e elementos decorativos sofisticados emoldurando o título com harmonia gráfica impecável.',
        prompt: `Luxury editorial illustrated book cover for "${ctx.global.title.toUpperCase()}" by ${ctx.global.author}.
Art Direction: Prestigious publishing house illustration, fine intricate linework, deep royal navy and warm bronze accents, classic modern typography.
Title "${ctx.global.title.toUpperCase()}" clearly displayed with masterclass editorial kerning. 2:3 vertical aspect ratio, museum-grade composition.`
      }
    ];

    return { brief, proposals };
  }
}
