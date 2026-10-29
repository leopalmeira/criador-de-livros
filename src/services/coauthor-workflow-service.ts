// ============================================================================
// ✍️ COAUTHOR WORKFLOW SERVICE — MOTOR EDITORIAL INTELIGENTE (13 PASSOS)
// Inspirado na metodologia oficial do CoAuthor.ai para criação de bestsellers
// da Amazon KDP em um único dia com IA e continuidade sequencial.
// ============================================================================

import { chamarGeminiTexto } from './kdp-ai-engine';
import { AmazonLiveService, AmazonLiveBook } from './amazon-live-service';
import { AMAZON_BESTSELLERS_BY_SEGMENT, AmazonBestSellerReference } from './amazon-bestsellers-catalog';

export interface CoAuthorStepItem {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  isCompleted: boolean;
}

export interface CoAuthorCompetitorBook {
  id: string;
  asin?: string;
  title: string;
  subtitle?: string;
  author: string;
  coverImage?: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  salesRank?: string;
  notes?: string;
}

export interface CoAuthorResourceItem {
  id: string;
  type: 'link' | 'text' | 'file';
  title: string;
  content: string;
  sourceUrl?: string;
  dateAdded: string;
}

export interface CoAuthorAuthorPersona {
  name: string;
  isPenName: boolean;
  background: string;
  credentials: string;
  narrativeTone: string;
  pacingStyle: string;
  realLifeStories: string[];
  imitatedAuthorStyle?: string;
  savedPersonaId?: string;
}

export interface CoAuthorProposedBook {
  title: string;
  subtitle: string;
  uniqueSellingPoint: string;
  competitiveDifferentiation: string;
  modeledStrengths: string[];
  keySellingPoints: string[];
  selectedFocusTags: string[];
}

export interface CoAuthorBookDetails {
  wordCountTarget: '10k-15k' | '20k-25k' | '30k-35k' | '35k-40k';
  chapterCount: number;
  bookStructure: 'problem-solution' | 'step-by-step' | 'chronological' | 'topical-mastery';
  targetAudience: string;
}

export interface CoAuthorSubSection {
  id: string;
  title: string;
  guidance: string;
}

export interface CoAuthorSection {
  id: string;
  sectionNumber: number;
  title: string;
  suggestedWordCount: number;
  actualWordCount?: number;
  subSections: CoAuthorSubSection[];
  content?: string;
  isGenerated?: boolean;
}

export interface CoAuthorChapter {
  id: string;
  chapterNumber: number;
  title: string;
  coreTheme: string;
  targetWordCount: number;
  actualWordCount?: number;
  sections: CoAuthorSection[];
  isCompleted?: boolean;
}

export interface CoAuthorAmazonDescription {
  headline: string;
  relateSection: string;
  benefitBullets: string[];
  overcomingObjections: string;
  callToAction: string;
  formattedHtml: string;
}

export interface CoAuthorProjectState {
  id: string;
  currentStep: number; // 1 a 13
  
  // Step 1: Research
  bookTitle: string;
  authorName: string;
  genre: string;
  bookTopic: string;
  topicStance: string; // Opinião forte / Posicionamento único
  uniqueStandout: string; // O que faz o livro se destacar
  authorTone: string;
  targetAudience: string;

  // Step 2: Analysis
  competitors: CoAuthorCompetitorBook[];

  // Step 3: Book Title
  titleOptions: Array<{ title: string; subtitle: string; angle: string }>;
  selectedTitle: string;
  selectedSubtitle: string;

  // Step 4: Resources
  resources: CoAuthorResourceItem[];

  // Step 5: Author Persona
  authorPersona: CoAuthorAuthorPersona;

  // Step 6: Proposed Book
  proposedBook: CoAuthorProposedBook;

  // Step 7: Details
  details: CoAuthorBookDetails;

  // Step 8: Author Bio
  authorBiography: string;

  // Step 9: Outline
  chapters: CoAuthorChapter[];

  // Step 10: Write
  activeChapterIdx: number;
  activeSectionIdx: number;
  totalGeneratedWords: number;

  // Step 11: Description
  amazonDescription: CoAuthorAmazonDescription;

  // Step 12: Book Cover
  coverStyle: string;
  coverPalette: string;
  coverFrontUrl?: string;

  // Step 13: Finish
  isFinalized: boolean;
  lastUpdated: string;
}

export class CoAuthorWorkflowService {
  /**
   * Lista oficial dos 13 passos do CoAuthor
   */
  public static getStepList(): CoAuthorStepItem[] {
    return [
      { id: 1, slug: 'research', title: 'Research', subtitle: 'Pesquisa, posicionamento e diferencial', icon: '🔍', isCompleted: false },
      { id: 2, slug: 'analysis', title: 'Analysis', subtitle: 'Bestsellers e concorrentes do nicho', icon: '📊', isCompleted: false },
      { id: 3, slug: 'book-title', title: 'Book Title', subtitle: '10 opções de títulos campeões de venda', icon: '🏷️', isCompleted: false },
      { id: 4, slug: 'resources', title: 'Resources', subtitle: 'Fontes, referências e base de contexto', icon: '📁', isCompleted: false },
      { id: 5, slug: 'author-persona', title: 'Author Persona', subtitle: 'Voz, estilo e storytelling do autor', icon: '👤', isCompleted: false },
      { id: 6, slug: 'proposed-book', title: 'Proposed Book', subtitle: 'Tags de foco e proposta de valor única', icon: '💡', isCompleted: false },
      { id: 7, slug: 'details', title: 'Details', subtitle: 'Contagem de palavras e arquitetura', icon: '⚙️', isCompleted: false },
      { id: 8, slug: 'author-bio', title: 'Author Bio', subtitle: 'Biografia oficial para o livro e Amazon', icon: '📝', isCompleted: false },
      { id: 9, slug: 'outline', title: 'Outline', subtitle: 'Sumário com capítulos e ritmo dinâmico', icon: '📑', isCompleted: false },
      { id: 10, slug: 'write', title: 'Write', subtitle: 'Escrita inteligente com editor inline', icon: '✍️', isCompleted: false },
      { id: 11, slug: 'description', title: 'Description', subtitle: 'Sinopse e copy de vendas Amazon KDP', icon: '🛒', isCompleted: false },
      { id: 12, slug: 'book-cover', title: 'Book Cover', subtitle: 'Direção de arte e capa editorial', icon: '🎨', isCompleted: false },
      { id: 13, slug: 'finish', title: 'Finish', subtitle: 'Resumo geral e exportação em PDF/DOCX', icon: '🏁', isCompleted: false }
    ];
  }

  /**
   * Cria o estado inicial de um novo livro no CoAuthor
   */
  public static createInitialState(initialData?: Partial<CoAuthorProjectState>): CoAuthorProjectState {
    const id = initialData?.id || `coauthor-${Date.now()}`;
    return {
      id,
      currentStep: initialData?.currentStep || 1,
      bookTitle: initialData?.bookTitle || '',
      authorName: initialData?.authorName || 'Autor(a)',
      genre: initialData?.genre || 'Autoajuda & Desenvolvimento Pessoal',
      bookTopic: initialData?.bookTopic || 'Organização e Produtividade Descomplicada',
      topicStance: initialData?.topicStance || 'Você não precisa perder finais de semana inteiros para organizar sua vida; apenas 10 minutos por dia com micro-vitórias consistentes.',
      uniqueStandout: initialData?.uniqueStandout || 'Foco em táticas ultra-específicas para pessoas ocupadas, com estratégias reais do dia a dia e sem teorias maçantes.',
      authorTone: initialData?.authorTone || 'Conversacional, prático e motivador',
      targetAudience: initialData?.targetAudience || 'Adultos ocupados, profissionais e pessoas sobrecarregadas buscando clareza mental',
      competitors: initialData?.competitors || [],
      titleOptions: initialData?.titleOptions || [],
      selectedTitle: initialData?.selectedTitle || initialData?.bookTitle || '',
      selectedSubtitle: initialData?.selectedSubtitle || '',
      resources: initialData?.resources || [],
      authorPersona: initialData?.authorPersona || {
        name: initialData?.authorName || 'Autor(a)',
        isPenName: true,
        background: 'Mãe de dois filhos, mentora e especialista em rotinas minimalistas práticas',
        credentials: 'Mais de 10 anos testando métodos eficientes de organização diária',
        narrativeTone: 'Amigável, direto, acolhedor e focado em soluções imediatas',
        pacingStyle: 'Frases diretas com histórias reais de superação e rotina',
        realLifeStories: [
          'O dia em que a sobrecarga quase a fez desistir e como uma regra de 5 minutos transformou sua casa.',
          'A experiência com uma rotina de 10 minutos que liberou 8 horas semanais para a família.'
        ]
      },
      proposedBook: initialData?.proposedBook || {
        title: initialData?.bookTitle || 'Organização Sem Estresse',
        subtitle: 'O Método de 10 Minutos por Dia para Conquistar Espaço e Paz Mental',
        uniqueSellingPoint: 'Metodologia exclusiva de micro-organização em menos de 10 minutos por dia que entrega resultados visíveis imediatos.',
        competitiveDifferentiation: 'Diferente dos livros clássicos que exigem desapego radical ou maratonas exaustivas, nossa obra prioriza o equilíbrio real de pessoas comuns.',
        modeledStrengths: [
          'Abordagem empática com os sentimentos do leitor (inspirada nos melhores do mercado)',
          'Passo a passo visual e organizado por cômodos e prioridades práticas'
        ],
        keySellingPoints: [
          'Rotinas rápidas de 10 minutos',
          'Eliminação de culpa e ansiedade por desorganização',
          'Checklists diários de execução imediata'
        ],
        selectedFocusTags: ['Táticas de 10 Minutos', 'Estratégias Realistas', 'Mudança de Mentalidade', 'Vida Sem Estresse']
      },
      details: initialData?.details || {
        wordCountTarget: '20k-25k',
        chapterCount: 10,
        bookStructure: 'problem-solution',
        targetAudience: 'Adultos e famílias sobrecarregadas com pouco tempo disponível'
      },
      authorBiography: initialData?.authorBiography || '',
      chapters: initialData?.chapters || [],
      activeChapterIdx: 0,
      activeSectionIdx: 0,
      totalGeneratedWords: 0,
      amazonDescription: initialData?.amazonDescription || {
        headline: '',
        relateSection: '',
        benefitBullets: [],
        overcomingObjections: '',
        callToAction: '',
        formattedHtml: ''
      },
      coverStyle: 'Clean Minimalist Bestseller',
      coverPalette: 'Teal & Deep Navy com tipografia contrastante',
      isFinalized: false,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * STEP 2: Busca concorrentes e bestsellers reais no nicho
   */
  public static async fetchMarketCompetitors(topic: string, genre: string): Promise<CoAuthorCompetitorBook[]> {
    const cleanTopic = topic.trim();
    const competitors: CoAuthorCompetitorBook[] = [];

    // 1. Tenta catálogo curado local de bestsellers
    const segmentKey = (genre || '').toLowerCase().includes('negocio') ? 'business'
      : (genre || '').toLowerCase().includes('financ') ? 'finance'
      : (genre || '').toLowerCase().includes('saude') || (genre || '').toLowerCase().includes('longev') ? 'health-wellness'
      : 'self-help';

    const localBestsellers = AMAZON_BESTSELLERS_BY_SEGMENT[segmentKey] || AMAZON_BESTSELLERS_BY_SEGMENT['self-help'] || Object.values(AMAZON_BESTSELLERS_BY_SEGMENT)[0] || [];
    localBestsellers.slice(0, 4).forEach((b) => {
      competitors.push({
        id: b.id,
        asin: b.asin,
        title: b.title,
        subtitle: b.subtitle,
        author: b.author,
        coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
        rating: b.rating,
        reviewCount: b.reviewCount,
        badge: b.rankBadge,
        salesRank: '#1 Bestseller Amazon'
      });
    });

    // 2. Tenta busca em tempo real com Amazon Live Service
    try {
      const liveBooks = await AmazonLiveService.searchAmazonBooks(cleanTopic || genre, 4);
      if (liveBooks && liveBooks.length > 0) {
        liveBooks.forEach((lb, idx) => {
          competitors.push({
            id: `live-${idx}-${lb.asin}`,
            asin: lb.asin,
            title: lb.title,
            author: lb.author || 'Autor Best-Seller',
            coverImage: lb.coverImage || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
            rating: lb.rating || 4.7,
            reviewCount: lb.reviewsCount || 1200,
            badge: lb.badge || 'Top Rated',
            salesRank: 'Amazon Bestseller Rank'
          });
        });
      }
    } catch (err) {
      console.warn('[CoAuthor] Busca ao vivo falhou, usando acervo de inteligência:', err);
    }

    return competitors;
  }

  /**
   * STEP 3: Gera 10 títulos otimizados para vendas
   */
  public static async generateTitleOptions(params: {
    topic: string;
    stance: string;
    uniqueStandout: string;
    genre: string;
    authorName: string;
  }): Promise<Array<{ title: string; subtitle: string; angle: string }>> {
    const prompt = `Você é um ESPECIALISTA SÊNIOR EM LANÇAMENTOS E TITULAÇÃO DE LIVROS BEST-SELLERS AMAZON KDP (Padrão CoAuthor.ai).
Gere exatamente 10 opções de TÍTULOS e SUBTÍTULOS com altíssimo potencial de clique e conversão.

## CONTEXTO DO PROJETO:
- TEMA: ${params.topic}
- GÊNERO: ${params.genre}
- OPINIÃO FORTE / POSICIONAMENTO ÚNICO (STANCE): ${params.stance}
- O QUE FAZ O LIVRO SE DESTACAR (DIFERENCIAL): ${params.uniqueStandout}
- AUTOR: ${params.authorName}

## REGRAS DE TITULAÇÃO DE ELITE:
1. O título principal deve ser magnético, curto (1 a 4 palavras) e memorável.
2. O subtítulo deve entregar a promessa clara, o público-alvo ou o método específico.
3. Evite clichês vazios de IA. Foque em benefícios tangíveis, números concretos ou contraste inteligente.

Retorne APENAS um JSON no formato estrito:
{
  "titles": [
    {
      "title": "O Desafio dos 10 Minutos",
      "subtitle": "Como Destralhar Sua Casa e Sua Mente Sem Finais de Semana Exaustivos",
      "angle": "Abordagem rápida e prática para pessoas ocupadas"
    }
  ]
}`;

    try {
      const res = await chamarGeminiTexto(prompt, { temperature: 0.7, maxTokens: 2500 });
      const jsonMatch = res.texto.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.titles) && parsed.titles.length > 0) {
          return parsed.titles;
        }
      }
    } catch (err) {
      console.warn('[CoAuthor] Falha na IA de títulos, usando títulos calibrados:', err);
    }

    return [
      { title: `O Método dos 10 Minutos`, subtitle: `Estratégias Diárias de Alto Impacto para ${params.topic}`, angle: 'Eficiência de tempo e vitórias rápidas' },
      { title: `Simplesmente Prático`, subtitle: `O Guia Definitivo para Descomplicar ${params.topic} no Dia a Dia`, angle: 'Abordagem realista sem jargões' },
      { title: `Além da Sobrecarga`, subtitle: `Como Recuperar o Controle e a Clareza Mental em Menos Tempo`, angle: 'Foco no alívio emocional e clareza' },
      { title: `O Código de ${params.topic}`, subtitle: `Pequenas Mudanças Diárias para Resultados Extraordinários`, angle: 'Princípio de hábitos atômicos aplicados' },
      { title: `Mais Espaço, Menos Caos`, subtitle: `Um Roteiro Passo a Passo para Pessoas Ocupadas Vencerem a Bagunça`, angle: 'Transformação visível passo a passo' }
    ];
  }

  /**
   * STEP 6: Gera o Proposed Book com USP e Análise de Diferenciação
   */
  public static async generateProposedBook(params: {
    title: string;
    topic: string;
    stance: string;
    uniqueStandout: string;
    genre: string;
    selectedTags: string[];
    competitors: CoAuthorCompetitorBook[];
    authorPersona: CoAuthorAuthorPersona;
  }): Promise<CoAuthorProposedBook> {
    const competitorsText = params.competitors.slice(0, 4).map(c => `- "${c.title}" por ${c.author}`).join('\n');

    const prompt = `Você é o ESTRATEGISTA EDITORIAL DO COAUTHOR.AI.
Com base nas informações do autor e nos concorrentes do nicho, crie a PROPOSTA ESTRUTURADA DE VALOR (PROPOSED BOOK).

## PROJETO:
- TÍTULO: ${params.title}
- TEMA: ${params.topic}
- STANCE (OPINIÃO ÚNICA): ${params.stance}
- DIFERENCIAL: ${params.uniqueStandout}
- TAGS DE FOCO: ${params.selectedTags.join(', ')}
- PERSONA DO AUTOR: ${params.authorPersona.name} (${params.authorPersona.background})

## BESTSELLERS CONCORRENTES ANALISADOS:
${competitorsText || 'Best-sellers clássicos do nicho na Amazon'}

## REQUISITOS OBRIGATÓRIOS DO COAUTHOR:
1. "uniqueSellingPoint": O USP que resume por que este livro revoluciona o mercado.
2. "competitiveDifferentiation": Análise profunda de mercado explicando exatamente como nosso livro modela as partes fortes dos concorrentes, mas introduz um salto inovador único.
3. "modeledStrengths": 2 a 4 elementos de sucesso comprovados dos concorrentes que nosso livro adotará estrategicamente.
4. "keySellingPoints": 3 a 5 pontos de venda principais.

Retorne APENAS JSON estrito:
{
  "title": "${params.title}",
  "subtitle": "Subtítulo atraente",
  "uniqueSellingPoint": "USP detalhado...",
  "competitiveDifferentiation": "Análise comparativa profunda...",
  "modeledStrengths": ["Elemento 1", "Elemento 2"],
  "keySellingPoints": ["Benefício 1", "Benefício 2", "Benefício 3"]
}`;

    try {
      const res = await chamarGeminiTexto(prompt, { temperature: 0.5, maxTokens: 2500 });
      const jsonMatch = res.texto.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || params.title,
          subtitle: parsed.subtitle || 'O Guia Prático para Resultados Reais',
          uniqueSellingPoint: parsed.uniqueSellingPoint || params.uniqueStandout,
          competitiveDifferentiation: parsed.competitiveDifferentiation || params.stance,
          modeledStrengths: parsed.modeledStrengths || ['Metodologia clara', 'Exemplos práticos'],
          keySellingPoints: parsed.keySellingPoints || ['Ação rápida', 'Resultados mensuráveis'],
          selectedFocusTags: params.selectedTags
        };
      }
    } catch (e) {
      console.warn('[CoAuthor] Falha na proposta de livro, gerando padrão:', e);
    }

    return {
      title: params.title || 'Guia Prático e Transformador',
      subtitle: 'O Método Definitivo para Resultados Rápidos e Duradouros',
      uniqueSellingPoint: `${params.title} revoluciona o segmento de ${params.topic} ao introduzir uma metodologia objetiva e realista, desenhada para pessoas ocupadas conquistarem vitórias tangíveis sem frustração.`,
      competitiveDifferentiation: `Enquanto os livros estabelecidos no mercado focam em teorias exaustivas ou regras impraticáveis para o dia a dia, nossa obra adota a clareza e empatia dos melhores best-sellers, mas se destaca com táticas de ação rápida em menos de 10 minutos.`,
      modeledStrengths: [
        'Estrutura progressiva e didática comprovada por bestsellers da categoria',
        'Linguagem acessível e acolhedora sem jargões corporativos vazios'
      ],
      keySellingPoints: [
        'Estratégias de micro-vitórias aplicáveis imediatamente',
        'Exemplos da vida real e histórias com que o leitor se identifica',
        'Passo a passo livre de sobrecarga'
      ],
      selectedFocusTags: params.selectedTags
    };
  }

  /**
   * STEP 8: Gera a Biografia Oficial do Autor
   */
  public static async generateAuthorBiography(params: {
    authorName: string;
    isPenName: boolean;
    background: string;
    credentials: string;
    persona: CoAuthorAuthorPersona;
    topic: string;
  }): Promise<string> {
    const prompt = `Escreva uma BIOGRAFIA OFICIAL DE AUTOR para a Amazon Author Central e para o livro.
- NOME: ${params.authorName} (${params.isPenName ? 'Pseudônimo / Pen Name de Autoridade' : 'Nome Real'})
- BACKGROUND: ${params.background}
- CREDENCIAIS & EXPERIÊNCIA: ${params.credentials}
- TÓPICO DA OBRA: ${params.topic}

Regras:
1. Tom profissional, caloroso e inspirador em terceira pessoa.
2. Destaque como as vivências práticas do autor o levaram a criar este método.
3. Termine com uma declaração de missão conectando o autor aos seus leitores.
4. Extensão: 120 a 180 palavras.`;

    try {
      const res = await chamarGeminiTexto(prompt, { temperature: 0.6, maxTokens: 800 });
      return res.texto.trim();
    } catch {
      return `${params.authorName} é especialista em ${params.topic}, dedicando anos ao desenvolvimento de métodos acessíveis para pessoas comuns superarem a sobrecarga diária. Com uma abordagem prática e acolhedora, sua missão é transformar rotinas caóticas em jornadas de realização e paz mental.`;
    }
  }

  public static async generateAuthorBio(params: {
    authorName: string;
    isPenName: boolean;
    background: string;
    credentials: string;
    persona?: CoAuthorAuthorPersona;
    topic: string;
  }): Promise<string> {
    return CoAuthorWorkflowService.generateAuthorBiography({
      ...params,
      persona: params.persona || {
        name: params.authorName,
        isPenName: params.isPenName,
        background: params.background,
        credentials: params.credentials,
        narrativeTone: 'Amigável e acolhedor',
        pacingStyle: 'Dinâmico',
        realLifeStories: []
      }
    });
  }

  /**
   * STEP 9: Constrói o Outline Granular com Ritmo Dinâmico (Capítulos -> Seções -> Subseções)
   * O segredo do CoAuthor: palavras variadas por seção para evitar monotonia robótica.
   */
  public static async generateGranularOutline(params: {
    title: string;
    topic: string;
    proposedBook: CoAuthorProposedBook;
    details: CoAuthorBookDetails;
    persona: CoAuthorAuthorPersona;
  }): Promise<CoAuthorChapter[]> {
    const prompt = `Você é o DIRETOR DE ESTRUTURA E ARQUITETURA EDITORIAL DO COAUTHOR.AI.
Crie o OUTLINE GRANULAR COMPLETO de um livro best-seller com ${params.details.chapterCount} capítulos.

## PROJETO:
- TÍTULO: ${params.title}
- TEMA: ${params.topic}
- ESTRUTURA: ${params.details.bookStructure}
- META TOTAL DE PALAVRAS: ${params.details.wordCountTarget}
- USP: ${params.proposedBook.uniqueSellingPoint}

## REGRA FUNDAMENTAL DO COAUTHOR ANTI-ROBÔ:
A contagem de palavras NÃO DEVE SER IDÊNTICA em todas as seções e capítulos!
Algumas seções são curtas e diretas (350-500 palavras), outras são mais densas e ricas em histórias (700-1100 palavras).
Essa variação de tempo e ritmo é o que torna o livro natural e fascinante de ler.

Retorne APENAS um JSON no formato estrito:
{
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "A Ilusão da Maratona Perfeita",
      "coreTheme": "Desconstruindo o mito de que arrumar exige dias inteiros de folga",
      "targetWordCount": 2200,
      "sections": [
        {
          "sectionNumber": 1,
          "title": "Por que adiamos o que mais nos consome",
          "suggestedWordCount": 650,
          "subSections": [
            { "id": "sub-1-1-1", "title": "A armadilha mental do 'quando eu tiver tempo'", "guidance": "Explicar o custo psicológico da procrastinação ambiental" },
            { "id": "sub-1-1-2", "title": "O choque de realidade da pilha oculta", "guidance": "História real ilustrativa da autora sobre o guarda-roupa" }
          ]
        },
        {
          "sectionNumber": 2,
          "title": "O poder das micro-vitórias de 10 minutos",
          "suggestedWordCount": 850,
          "subSections": [
            { "id": "sub-1-2-1", "title": "A neurociência do alívio imediato", "guidance": "Como dopamina é liberada ao ver uma gaveta limpa em 7 minutos" },
            { "id": "sub-1-2-2", "title": "A regra de ouro da gaveta única", "guidance": "Instrução passo a passo direta para hoje" }
          ]
        }
      ]
    }
  ]
}`;

    try {
      const res = await chamarGeminiTexto(prompt, { temperature: 0.6, maxTokens: 4000 });
      const jsonMatch = res.texto.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
          return parsed.chapters.map((ch: any, cIdx: number) => ({
            id: `ch-${cIdx + 1}-${Date.now()}`,
            chapterNumber: ch.chapterNumber || cIdx + 1,
            title: ch.title || `Capítulo ${cIdx + 1}`,
            coreTheme: ch.coreTheme || params.topic,
            targetWordCount: ch.targetWordCount || 2000,
            sections: (ch.sections || []).map((sec: any, sIdx: number) => ({
              id: `sec-${cIdx + 1}-${sIdx + 1}-${Date.now()}`,
              sectionNumber: sec.sectionNumber || sIdx + 1,
              title: sec.title || `Seção ${sIdx + 1}`,
              suggestedWordCount: sec.suggestedWordCount || 600,
              subSections: (sec.subSections || []).map((sub: any, subIdx: number) => ({
                id: `sub-${cIdx + 1}-${sIdx + 1}-${subIdx + 1}`,
                title: sub.title || `Tópico ${subIdx + 1}`,
                guidance: sub.guidance || ''
              }))
            }))
          }));
        }
      }
    } catch (e) {
      console.warn('[CoAuthor] Falha no outline via IA, usando estrutura padrão:', e);
    }

    // Fallback estruturado
    const defaultChapters: CoAuthorChapter[] = [];
    const count = params.details.chapterCount || 10;
    const baseThemes = [
      'O Desafio Invisível e a Mudança de Perspectiva',
      'Desmistificando os Velhos Hábitos que Travam Sua Rotina',
      'O Método Fundamental: A Regra dos 10 Minutos',
      'Estratégias Práticas para Espaços Críticos',
      'Vencendo a Resistência Emocional e o Apego',
      'Construindo Sistemas que se Mantêm Sozinhos',
      'Envolvendo a Família e Criando Harmonia no Lar',
      'Como Lidar com Recaídas e Fases de Caos Inesperado',
      'O Impacto da Clareza Espacial na Sua Saúde Mental',
      'Sustentando a Liberdade e o Estilo de Vida Leve'
    ];

    for (let i = 0; i < count; i++) {
      const chNum = i + 1;
      const theme = baseThemes[i % baseThemes.length];
      defaultChapters.push({
        id: `ch-fallback-${chNum}`,
        chapterNumber: chNum,
        title: `Capítulo ${chNum}: ${theme}`,
        coreTheme: theme,
        targetWordCount: 1800 + (chNum % 3) * 350,
        sections: [
          {
            id: `sec-${chNum}-1`,
            sectionNumber: 1,
            title: `Fundamentos e Diagnóstico de ${theme}`,
            suggestedWordCount: 700 + (chNum % 2) * 150,
            subSections: [
              { id: `sub-${chNum}-1-1`, title: 'Identificando o gargalo real', guidance: 'Explicar a raiz psicológica do problema' },
              { id: `sub-${chNum}-1-2`, title: 'A experiência de transformação', guidance: 'Exemplo prático e história real' }
            ]
          },
          {
            id: `sec-${chNum}-2`,
            sectionNumber: 2,
            title: `Plano de Ação Imediato e Prático`,
            suggestedWordCount: 850,
            subSections: [
              { id: `sub-${chNum}-2-1`, title: 'Passo a passo de execução rápida', guidance: 'Checklist acionável em 10 minutos' },
              { id: `sub-${chNum}-2-2`, title: 'Como medir o sucesso hoje', guidance: 'Micro-vitória tangível' }
            ]
          }
        ]
      });
    }

    return defaultChapters;
  }

  /**
   * STEP 10: Escrita Seção por Seção com Memória Contínua (O Segredo do CoAuthor)
   * Recebe o conteúdo da seção anterior para construir em cima e NÃO se repetir!
   */
  public static async writeBookSection(params: {
    bookTitle: string;
    chapter: CoAuthorChapter;
    section: CoAuthorSection;
    previousSectionContent?: string;
    proposedBook: CoAuthorProposedBook;
    persona: CoAuthorAuthorPersona;
    resources: CoAuthorResourceItem[];
  }): Promise<{ content: string; wordCount: number }> {
    const subSectionsText = params.section.subSections.map(s => `- ${s.title}: ${s.guidance}`).join('\n');
    const resourcesText = params.resources.slice(0, 3).map(r => `[Fonte/Anotação]: ${r.title} -> ${r.content.slice(0, 200)}`).join('\n');
    const prevContext = params.previousSectionContent
      ? `\n## CONTEÚDO DA SEÇÃO ANTERIOR (LEIA COM ATENÇÃO E NÃO REPITA ESTAS PALAVRAS OU IDEIAS, CONSTRUA A PARTIR DELE):\n"${params.previousSectionContent.slice(-1200)}"\n`
      : '';

    const prompt = `Você é o GHOSTWRITER BEST-SELLER DO COAUTHOR.AI.
Escreva AGORA a SEÇÃO ${params.section.sectionNumber} do ${params.chapter.title}.

## CONTEXTO DO LIVRO:
- TÍTULO: ${params.bookTitle}
- CAPÍTULO: ${params.chapter.title} (${params.chapter.coreTheme})
- SEÇÃO A ESCREVER: "${params.section.title}"
- META DE EXTENSÃO: Aproximadamente ${params.section.suggestedWordCount} palavras.
- SUBSEÇÕES / TÓPICOS OBRIGATÓRIOS A COBRIR:
${subSectionsText}
${prevContext}
## VOZ E PERSONA DO AUTOR (SEJA FIEL A ESTE ESTILO):
- AUTOR: ${params.persona.name}
- TOM: ${params.persona.narrativeTone}
- RITMO: ${params.persona.pacingStyle}
- HISTÓRIA OU EXPERIÊNCIA PESSOAL A INTEGRAR: ${params.persona.realLifeStories[0] || 'História de superação pessoal'}

## RECURSOS E DADOS DE APOIO:
${resourcesText || 'Conhecimento especializado de alta densidade'}

## DIRETRIZES DE ESCRITA DE BEST-SELLER:
1. Comece de forma envolvente, sem introduções burocráticas como "Nesta seção vamos falar...".
2. Use parágrafos bem espaçados, com ritmo dinâmico.
3. Integre histórias reais e exemplos práticos para tornar a dica inesquecível.
4. Entregue valor denso, acionável e humanizado.
5. Escreva em português impecável e fluído.`;

    try {
      const res = await chamarGeminiTexto(prompt, { temperature: 0.7, maxTokens: 3000 });
      const cleanText = res.texto.trim();
      const words = cleanText.split(/\s+/).filter(Boolean).length;
      return { content: cleanText, wordCount: words };
    } catch (err: any) {
      console.warn('[CoAuthor] Erro na escrita de seção:', err.message);
      const fallback = `### ${params.section.title}\n\nA verdadeira transformação na forma como encaramos ${params.chapter.coreTheme} começa quando abandonamos as falsas expectativas de perfeição.\n\nDurante muito tempo, acreditou-se que qualquer mudança duradoura exigia sacrifícios monumentais e dedicação em tempo integral. No entanto, a realidade cotidiana nos mostra exatamente o contrário: são os pequenos passos, dados com regularidade e consciência, que reconstroem nossa relação com o espaço e com o tempo.\n\nAo focar em ações rápidas e intencionais de apenas alguns minutos, você não apenas supera a inércia, mas constrói a base sólida para um estilo de vida mais leve, produtivo e gratificante.`;
      return { content: fallback, wordCount: fallback.split(/\s+/).length };
    }
  }

  /**
   * STEP 10: Inline Editor Enhancement (Elaborate, Strengthen with Data, Add Source, Insert Story, Diagram)
   */
  public static async enhanceInlineText(params: {
    action: 'elaborate' | 'data' | 'source' | 'story' | 'diagram' | 'custom';
    selectedText: string;
    sectionContext: string;
    customPrompt?: string;
    topic: string;
    persona: CoAuthorAuthorPersona;
  }): Promise<string> {
    let actionInstruction = '';

    switch (params.action) {
      case 'elaborate':
        actionInstruction = 'Expanda este trecho selecionado com profundidade, enriquecendo a explicação com detalhes vívidos, analogias esclarecedoras e reflexões que façam o leitor refletir profundamente, dobrando a densidade do conteúdo.';
        break;
      case 'data':
        actionInstruction = 'Fortaleça este trecho inserindo dados estatísticos reais, pesquisas empíricas ou percentuais reconhecidos (ex: estudos sobre psicologia do consumo, pesquisas de mercado ou dados de saúde/produtividade) com citação contextual.';
        break;
      case 'source':
        actionInstruction = 'Adicione credibilidade citando estudos de caso, livros consagrados, periódicos acadêmicos ou especialistas de renome internacional para embasar o argumento.';
        break;
      case 'story':
        actionInstruction = `Insira uma breve história real envolvente ou analogia inspirada na vivência de ${params.persona.name} (${params.persona.background}) que ilustre perfeitamente o conceito de forma humana e emocionante.`;
        break;
      case 'diagram':
        actionInstruction = 'Gere um diagrama conceitual comparativo claro em formato de caixa de texto elegante com caracteres ASCII / Markdown (estilo [ ANTES vs DEPOIS ] ou [ FLUXO DE AÇÃO EM 3 PASSOS ]), pronto para o leitor visualizar no livro impresso.';
        break;
      case 'custom':
        actionInstruction = params.customPrompt || 'Melhore a clareza e o impacto deste texto.';
        break;
    }

    const prompt = `Você é o EDITOR INLINE DO COAUTHOR.AI.
Realize a seguinte melhoria editorial no texto selecionado:

## AÇÃO REQUISITADA:
${actionInstruction}

## TRECHO SELECIONADO:
"${params.selectedText}"

## CONTEXTO DO PARÁGRAFO:
"${params.sectionContext.slice(0, 500)}"

Retorne APENAS o novo texto substituto aprimorado, sem introduções ou explicações suas.`;

    try {
      const res = await chamarGeminiTexto(prompt, { temperature: 0.65, maxTokens: 1500 });
      return res.texto.trim();
    } catch {
      return params.selectedText;
    }
  }

  /**
   * STEP 11: Gera a Sinopse e Copy KDP nos 5 Blocos do Sean Dollwet
   */
  public static async generateAmazonDescription(params: {
    title: string;
    subtitle: string;
    topic: string;
    proposedBook: CoAuthorProposedBook;
    persona: CoAuthorAuthorPersona;
  }): Promise<CoAuthorAmazonDescription> {
    const prompt = `Você é o MAIOR COPYWRITER DE PÁGINAS DE VENDAS DA AMAZON KDP (Metodologia Sean Dollwet do CoAuthor.ai).
Gere a DESCRIÇÃO OFICIAL DO LIVRO (Book Description) estruturada exatamente nos 5 blocos campeões de conversão.

## LIVRO:
- TÍTULO: ${params.title}
- SUBTÍTULO: ${params.subtitle}
- TEMA: ${params.topic}
- USP: ${params.proposedBook.uniqueSellingPoint}
- PONTOS FORTES: ${params.proposedBook.keySellingPoints.join(', ')}

## OS 5 BLOCOS OBRIGATÓRIOS DO COAUTHOR:
1. HEADLINE: Frase de abertura magnética em maiúsculas ou destaque em negrito.
2. RELATE: Parágrafo de profunda empatia descrevendo a dor, o cansaço e a rotina do leitor.
3. BULLETS (BENEFITS): Lista com 5 a 7 bullets destacando os segredos e transformações que o livro entrega.
4. OVERCOMING OBJECTIONS: Parágrafo que responde à dúvida do leitor ("E se eu não tiver tempo?", "E se eu já tentei de tudo?").
5. CALL TO ACTION: Chamada final enérgica incentivando a rolar para cima e garantir o exemplar agora.

Retorne APENAS JSON estrito:
{
  "headline": "...",
  "relateSection": "...",
  "benefitBullets": ["...", "...", "..."],
  "overcomingObjections": "...",
  "callToAction": "..."
}`;

    try {
      const res = await chamarGeminiTexto(prompt, { temperature: 0.6, maxTokens: 2500 });
      const jsonMatch = res.texto.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const headline = parsed.headline || `DESCUBRA COMO TRANSFORMAR ${params.topic.toUpperCase()} DE UMA VEZ POR TODAS!`;
        const relate = parsed.relateSection || `Você se sente constantemente sobrecarregado pela rotina e pela sensação de que os dias passam sem que você veja progresso real?`;
        const bullets: string[] = parsed.benefitBullets || [
          'O método prático para eliminar a sobrecarga em apenas 10 minutos diários.',
          'Como superar a procrastinação com micro-vitórias consistentes.',
          'Checklists acionáveis para implementar hoje mesmo sem esforço extra.'
        ];
        const objections = parsed.overcomingObjections || `Mesmo que você já tenha tentado outros guias e sinta que sua rotina não tem mais espaço para nada, este livro foi desenhado especificamente para pessoas reais que precisam de resultados sem complicação.`;
        const cta = parsed.callToAction || `Não espere outro dia passar no meio do caos. Role até o topo da página, clique em "Comprar Agora" e comece sua transformação hoje mesmo!`;

        const formattedHtml = `<h3><strong>${headline}</strong></h3>\n\n<p>${relate}</p>\n\n<p><strong>Dentro deste livro transformador, você descobrirá:</strong></p>\n<ul>\n${bullets.map(b => `  <li>${b}</li>`).join('\n')}\n</ul>\n\n<p>${objections}</p>\n\n<p><strong>${cta}</strong></p>`;

        return {
          headline,
          relateSection: relate,
          benefitBullets: bullets,
          overcomingObjections: objections,
          callToAction: cta,
          formattedHtml
        };
      }
    } catch (err) {
      console.warn('[CoAuthor] Falha na copy de vendas:', err);
    }

    const defaultHtml = `<h3><strong>DESCUBRA O MÉTODO PRÁTICO PARA DOMINAR ${params.topic.toUpperCase()}!</strong></h3><p>Você sente que seus dias são consumidos pelo estresse e pela desorganização constante? Este livro foi criado para devolver a você o controle do seu tempo.</p><p><strong>O que você vai aprender:</strong></p><ul><li>Táticas simples de 10 minutos diários com resultados visíveis imediatos.</li><li>Como blindar sua mente contra a ansiedade e o acúmulo desnecessário.</li><li>O passo a passo para criar rotinas leves e consistentes.</li></ul><p>Role até o topo da página e garanta o seu exemplar agora mesmo!</p>`;

    return {
      headline: `DESCUBRA O MÉTODO PRÁTICO PARA DOMINAR ${params.topic.toUpperCase()}!`,
      relateSection: `Você sente que seus dias são consumidos pelo estresse e pela desorganização constante?`,
      benefitBullets: ['Táticas de 10 minutos diários', 'Resultados visíveis imediatos', 'Rotinas leves e consistentes'],
      overcomingObjections: 'Mesmo com pouco tempo, o método se encaixa na sua rotina.',
      callToAction: 'Garanta seu exemplar e comece hoje!',
      formattedHtml: defaultHtml
    };
  }
}
