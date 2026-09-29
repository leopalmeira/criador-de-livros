// Tipos para a Plataforma Profissional de Criação de Livros KDP (Book Engine)
// Arquitetura baseada nas referências ShonP/kdp-book, wesleyscholl/book-generator, libriscribe e Velith

export type ProjectStatus = 'IDEIA' | 'CONCEITO' | 'OUTLINE' | 'BIBLE' | 'ESCREVENDO' | 'REVISÃO' | 'DIAGRAMAÇÃO' | 'VALIDAÇÃO' | 'PUBLICADO' | 'ARQUIVADO';
export type ProjectPriority = 'ALTA' | 'MÉDIA' | 'BAIXA';
export type ExecutionMode = 'automatic' | 'assisted';

// --- TEMPLATES DE LIVROS ---
export type BookType = 
  | 'children-picture-book'
  | 'illustrated-book'
  | 'light-novel'
  | 'fiction-novel'
  | 'romance'
  | 'fantasy'
  | 'thriller'
  | 'suspense'
  | 'sci-fi'
  | 'self-help'
  | 'business'
  | 'finance'
  | 'health-wellness'
  | 'education'
  | 'practical-guide'
  | 'biography'
  | 'non-fiction'
  | 'technical-manual'
  | 'short-ebook';

export type TrimSize = '8.5x8.5' | '6x9' | '5.5x8.5' | '5x8' | '8.5x11' | '7x10' | '7.5x9.25';
export type PaperType = 'bw-white' | 'bw-cream' | 'color';

export interface IBookTypeConfig {
  id: BookType;
  label: string;
  category: 'Ficção' | 'Não-Ficção' | 'Infantil & Ilustrado' | 'Técnico & Guias';
  trimSize: TrimSize;
  paperType: PaperType;
  targetPages: number;
  chapterCount: [number, number];
  wordsPerChapter: [number, number];
  scenesPerChapter: [number, number];
  illustrationsPerChapter: number;
  coverArt: boolean;
  fullBleed: boolean;
  imageSize: string;
  hasCharacters: boolean;
  hasWorldbuilding: boolean;
  hasArtBible: boolean;
  hasFactCheck: boolean;
  description: string;
  editorialRules: string[];
}

export const BOOK_TYPE_CONFIGS: Record<BookType, IBookTypeConfig> = {
  // Infantil & Ilustrado
  'children-picture-book': {
    id: 'children-picture-book',
    label: 'Livro Infantil Ilustrado',
    category: 'Infantil & Ilustrado',
    trimSize: '8.5x8.5',
    paperType: 'color',
    targetPages: 32,
    chapterCount: [12, 16],
    wordsPerChapter: [50, 150],
    scenesPerChapter: [1, 1],
    illustrationsPerChapter: 1,
    coverArt: true,
    fullBleed: true,
    imageSize: '2048x2048',
    hasCharacters: true,
    hasWorldbuilding: false,
    hasArtBible: true,
    hasFactCheck: false,
    description: 'Quadrado 8.5"x8.5", colorido full-bleed, 32 páginas, texto simples e ilustrações ricas em todas as páginas.',
    editorialRules: ['Vocabulário infantil', 'Ritmo sonoro ou rimas', 'Moral afetiva']
  },
  'illustrated-book': {
    id: 'illustrated-book',
    label: 'Livro Ilustrado Geral / HQ',
    category: 'Infantil & Ilustrado',
    trimSize: '7x10',
    paperType: 'color',
    targetPages: 64,
    chapterCount: [8, 12],
    wordsPerChapter: [150, 400],
    scenesPerChapter: [2, 3],
    illustrationsPerChapter: 1,
    coverArt: true,
    fullBleed: true,
    imageSize: '2048x2048',
    hasCharacters: true,
    hasWorldbuilding: true,
    hasArtBible: true,
    hasFactCheck: false,
    description: 'Formato 7"x10", ilustrações vibrantes acompanhando parágrafos descritivos.',
    editorialRules: ['Equilíbrio entre arte e texto', 'Consistência de estilo visual']
  },

  // Não-Ficção & Desenvolvimento
  'self-help': {
    id: 'self-help',
    label: 'Desenvolvimento Pessoal / Hábitos',
    category: 'Não-Ficção',
    trimSize: '6x9',
    paperType: 'bw-white',
    targetPages: 160,
    chapterCount: [10, 14],
    wordsPerChapter: [2200, 3500],
    scenesPerChapter: [3, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Padrão editorial 6"x9", linguagem motivacional e prática, passos acionáveis e estudos de caso.',
    editorialRules: ['Exercícios no final do capítulo', 'Exemplos reais', 'Sem jargão excessivo']
  },
  'business': {
    id: 'business',
    label: 'Negócios, Gestão & Liderança',
    category: 'Não-Ficção',
    trimSize: '6x9',
    paperType: 'bw-white',
    targetPages: 180,
    chapterCount: [10, 15],
    wordsPerChapter: [2500, 4000],
    scenesPerChapter: [3, 5],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Livro executivo com metodologia de gestão, frameworks claros e aplicabilidade corporativa.',
    editorialRules: ['Frameworks conceituais', 'Estudos de caso reais', 'Métricas mensuráveis']
  },
  'finance': {
    id: 'finance',
    label: 'Finanças Pessoais & Investimentos',
    category: 'Não-Ficção',
    trimSize: '6x9',
    paperType: 'bw-white',
    targetPages: 170,
    chapterCount: [10, 14],
    wordsPerChapter: [2200, 3800],
    scenesPerChapter: [3, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Didática progressiva sobre dinheiro, mentalidade financeira, orçamento e investimentos.',
    editorialRules: ['Avisos legais de investimento', 'Simulações didáticas', 'Vocabulário financeiro acessível']
  },
  'health-wellness': {
    id: 'health-wellness',
    label: 'Saúde, Nutrição & Bem-Estar',
    category: 'Não-Ficção',
    trimSize: '6x9',
    paperType: 'bw-white',
    targetPages: 160,
    chapterCount: [8, 12],
    wordsPerChapter: [2200, 3600],
    scenesPerChapter: [3, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Orientações práticas de longevidade, rotina saudável, alimentação e equilíbrio mental.',
    editorialRules: ['Isenção médica clara', 'Base científica evidenciada']
  },
  'education': {
    id: 'education',
    label: 'Educação & Metodologia de Ensino',
    category: 'Não-Ficção',
    trimSize: '6x9',
    paperType: 'bw-white',
    targetPages: 200,
    chapterCount: [10, 16],
    wordsPerChapter: [2400, 4000],
    scenesPerChapter: [3, 5],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Didática para professores, estudantes ou pais sobre técnicas de aprendizagem eficazes.',
    editorialRules: ['Resumos de fixação', 'Bibliografia estruturada']
  },
  'practical-guide': {
    id: 'practical-guide',
    label: 'Guia Prático / Manual Passo a Passo',
    category: 'Técnico & Guias',
    trimSize: '6x9',
    paperType: 'bw-white',
    targetPages: 140,
    chapterCount: [8, 12],
    wordsPerChapter: [1800, 3200],
    scenesPerChapter: [3, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Manual de instruções práticas direto ao ponto, com checklists e passos numerados.',
    editorialRules: ['Passos numerados', 'Checklists de execução', 'Resolução de problemas comuns']
  },
  'biography': {
    id: 'biography',
    label: 'Biografia / Memórias',
    category: 'Não-Ficção',
    trimSize: '6x9',
    paperType: 'bw-cream',
    targetPages: 220,
    chapterCount: [12, 18],
    wordsPerChapter: [2500, 4500],
    scenesPerChapter: [3, 5],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: true,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Narrativa cronológica de vida, desafios, lições e legado inspirador.',
    editorialRules: ['Linha temporal consistente', 'Contexto histórico e factual']
  },
  'non-fiction': {
    id: 'non-fiction',
    label: 'Não-Ficção Geral',
    category: 'Não-Ficção',
    trimSize: '6x9',
    paperType: 'bw-white',
    targetPages: 180,
    chapterCount: [8, 14],
    wordsPerChapter: [2000, 4000],
    scenesPerChapter: [3, 5],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Padrão editorial 6"x9", didático e progressivo: do básico ao avançado com passos práticos.',
    editorialRules: ['Introdução instigante', 'Argumentação sólida', 'Conclusão aplicável']
  },

  // Ficção & Literatura
  'fiction-novel': {
    id: 'fiction-novel',
    label: 'Romance / Ficção Geral',
    category: 'Ficção',
    trimSize: '6x9',
    paperType: 'bw-cream',
    targetPages: 280,
    chapterCount: [18, 26],
    wordsPerChapter: [3000, 5500],
    scenesPerChapter: [2, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: true,
    hasWorldbuilding: true,
    hasArtBible: false,
    hasFactCheck: false,
    description: 'Formato romance 6"x9", papel creme, arco clássico de 3 atos (preparação, escalada, clímax e resolução).',
    editorialRules: ['Voz narrativa constante', 'Arco de transformação do protagonista']
  },
  'romance': {
    id: 'romance',
    label: 'Romance Amoroso / Drama Emocional',
    category: 'Ficção',
    trimSize: '5x8',
    paperType: 'bw-cream',
    targetPages: 250,
    chapterCount: [16, 24],
    wordsPerChapter: [2800, 5000],
    scenesPerChapter: [2, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: true,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: false,
    description: 'Foco na química entre personagens, conflitos internos, tensão emocional e final gratificante.',
    editorialRules: ['Química e conflitos bem desenvolvidos', 'Final feliz ou emocionalmente satisfatório']
  },
  'fantasy': {
    id: 'fantasy',
    label: 'Fantasia Épica / Alta Fantasia',
    category: 'Ficção',
    trimSize: '6x9',
    paperType: 'bw-cream',
    targetPages: 350,
    chapterCount: [20, 30],
    wordsPerChapter: [3500, 6500],
    scenesPerChapter: [3, 5],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: true,
    hasWorldbuilding: true,
    hasArtBible: false,
    hasFactCheck: false,
    description: 'Construção de mundo rica (Worldbuilding), magia, profecias, raças e jornada do herói.',
    editorialRules: ['Regras rígidas do sistema de magia', 'Histórico e facções detalhadas']
  },
  'thriller': {
    id: 'thriller',
    label: 'Thriller / Mistério Investigativo',
    category: 'Ficção',
    trimSize: '5.5x8.5',
    paperType: 'bw-cream',
    targetPages: 260,
    chapterCount: [22, 32],
    wordsPerChapter: [2200, 4200],
    scenesPerChapter: [2, 3],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: true,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: false,
    description: 'Pistas, reviravoltas (plot twists), perigo iminente e capítulos curtos com ganchos fortes.',
    editorialRules: ['Cliffhangers nos finais de capítulos', 'Sem furos de lógica investigativa']
  },
  'suspense': {
    id: 'suspense',
    label: 'Suspense Psicológico / Terror',
    category: 'Ficção',
    trimSize: '5.5x8.5',
    paperType: 'bw-cream',
    targetPages: 230,
    chapterCount: [18, 26],
    wordsPerChapter: [2500, 4500],
    scenesPerChapter: [2, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: true,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: false,
    description: 'Construção de atmosfera sombria, paranoia, ritmo opressivo e revelações chocantes.',
    editorialRules: ['Atmosfera densa', 'Incerteza psicológica']
  },
  'sci-fi': {
    id: 'sci-fi',
    label: 'Ficção Científica / Distopia',
    category: 'Ficção',
    trimSize: '6x9',
    paperType: 'bw-cream',
    targetPages: 300,
    chapterCount: [18, 26],
    wordsPerChapter: [3200, 5800],
    scenesPerChapter: [3, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: true,
    hasWorldbuilding: true,
    hasArtBible: false,
    hasFactCheck: false,
    description: 'Tecnologia futurista, dilemas sociais, inteligência artificial, espaço ou futuro distópico.',
    editorialRules: ['Coerência tecnológica', 'Comentário social subjacente']
  },
  'light-novel': {
    id: 'light-novel',
    label: 'Light Novel / Ficção Ágil',
    category: 'Ficção',
    trimSize: '5x8',
    paperType: 'bw-cream',
    targetPages: 240,
    chapterCount: [8, 14],
    wordsPerChapter: [3500, 6000],
    scenesPerChapter: [4, 6],
    illustrationsPerChapter: 1,
    coverArt: true,
    fullBleed: false,
    imageSize: '2048x2048',
    hasCharacters: true,
    hasWorldbuilding: true,
    hasArtBible: true,
    hasFactCheck: false,
    description: 'Tamanho 5"x8", papel creme, capítulos rápidos, ritmo dinâmico e diálogos envolventes.',
    editorialRules: ['Diálogos dinâmicos', 'Ilustrações de momentos chave']
  },

  // Guias Rápidos & Técnicos
  'technical-manual': {
    id: 'technical-manual',
    label: 'Livro Técnico / Programação / Engenharia',
    category: 'Técnico & Guias',
    trimSize: '7x10',
    paperType: 'bw-white',
    targetPages: 240,
    chapterCount: [10, 16],
    wordsPerChapter: [2500, 4500],
    scenesPerChapter: [3, 5],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Formato amplo 7"x10", blocos de código ou tabelas técnicas, arquitetura explicada passo a passo.',
    editorialRules: ['Exemplos de código completos', 'Diagramas textuais ou visuais']
  },
  'short-ebook': {
    id: 'short-ebook',
    label: 'E-book Curto / Relatório Especial',
    category: 'Técnico & Guias',
    trimSize: '5.5x8.5',
    paperType: 'bw-white',
    targetPages: 60,
    chapterCount: [5, 8],
    wordsPerChapter: [1500, 2500],
    scenesPerChapter: [2, 3],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: '1024x1024',
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Livro focado de alta densidade de valor, leitura de 1 a 2 horas para Kindle.',
    editorialRules: ['Densidade de conteúdo', 'Sem enrolação']
  }
};

// --- CALCULADORA DE PÁGINAS E PALAVRAS ---
export interface PageLayoutMetrics {
  trimSize: TrimSize;
  fontSizePt: number;
  lineSpacing: number;
  wordsPerPage: number;
  pageWidthInches: number;
  pageHeightInches: number;
  marginInnerInches: number;
  marginOuterInches: number;
  marginTopInches: number;
  marginBottomInches: number;
}

export const TRIM_SIZE_METRICS: Record<TrimSize, { widthInches: number; heightInches: number; defaultWordsPerPage: number }> = {
  '5x8': { widthInches: 5.0, heightInches: 8.0, defaultWordsPerPage: 220 },
  '5.5x8.5': { widthInches: 5.5, heightInches: 8.5, defaultWordsPerPage: 250 },
  '6x9': { widthInches: 6.0, heightInches: 9.0, defaultWordsPerPage: 280 },
  '7x10': { widthInches: 7.0, heightInches: 10.0, defaultWordsPerPage: 340 },
  '7.5x9.25': { widthInches: 7.5, heightInches: 9.25, defaultWordsPerPage: 360 },
  '8.5x8.5': { widthInches: 8.5, heightInches: 8.5, defaultWordsPerPage: 120 },
  '8.5x11': { widthInches: 8.5, heightInches: 11.0, defaultWordsPerPage: 450 }
};

export function calculateTargetWordsForPages(pages: number, trim: TrimSize = '6x9'): { targetWords: number; wordsPerPage: number } {
  const metric = TRIM_SIZE_METRICS[trim] || TRIM_SIZE_METRICS['6x9'];
  // Subtrai ~10 páginas para páginas preliminares e finais
  const netPages = Math.max(10, pages - 10);
  const targetWords = netPages * metric.defaultWordsPerPage;
  return {
    targetWords: Math.round(targetWords / 500) * 500,
    wordsPerPage: metric.defaultWordsPerPage
  };
}

export function estimateActualPagesFromWords(wordCount: number, trim: TrimSize = '6x9', frontMatterPages: number = 8): number {
  const metric = TRIM_SIZE_METRICS[trim] || TRIM_SIZE_METRICS['6x9'];
  const textPages = Math.ceil(wordCount / metric.defaultWordsPerPage);
  // Páginas do livro sempre devem ser pares para KDP paperback
  let total = textPages + frontMatterPages;
  if (total % 2 !== 0) total += 1;
  return total;
}

// --- SUBMODELOS EDITORAIS ---
export interface TitleOption {
  id: string;
  title: string;
  subtitle: string;
  hook: string;
  commercialAngle: string;
  targetAppeal: string;
}

export interface IBookCharacter {
  name: string;
  role: string;
  age?: string;
  appearance: string;
  costume?: string;
  palette?: string[];
  personality?: string;
  voice?: string;
  arc?: string;
  relationships?: string;
}

export interface IBookLocation {
  name: string;
  description: string;
  palette?: string[];
  mood?: string;
}

export interface IBookStyleGuide {
  artStyle: string;
  palette: string[];
  lineWeight?: string;
  lighting?: string;
  tone: string;
  inspirations?: string[];
}

export interface IBookBible {
  characters: IBookCharacter[];
  locations: IBookLocation[];
  styleGuide: IBookStyleGuide;
  // Campos para não-ficção
  coreConcepts?: Array<{ concept: string; explanation: string; practicalApplication: string }>;
  keyArguments?: string[];
  terminologyGlossary?: Array<{ term: string; definition: string }>;
  factualSources?: string[];
  rulesOfUniverse?: string[];
}

export interface IBookConcept {
  title: string;
  subtitle?: string;
  hook: string;
  audience: string;
  readingLevel?: string;
  tone: string;
  targetWordCount: number;
  targetChapterCount: number;
  targetPages: number;
  trimSize: TrimSize;
  paperType: PaperType;
  comparableTitles: string[];
  themes: string[];
  shortSynopsis: string;
  longSynopsis: string;
  promise: string;
  differentiator: string;
  titleOptions?: TitleOption[];
}

export interface IBookScene {
  index: number;
  title?: string;
  summary: string;
  setting?: string;
  characters?: string[];
  mood?: string;
  illustrationBrief?: string;
}

export interface ChapterVersion {
  id: string;
  chapterIndex: number;
  timestamp: number;
  prose: string;
  wordCount: number;
  summary: string;
  authorType: 'ai' | 'user';
  note?: string;
}

export interface IBookChapter {
  index: number;
  title: string;
  summary: string;
  objective?: string;
  pov?: string;
  targetWordCount: number;
  estimatedPages?: number;
  scenes: IBookScene[];
  subtopics?: string[];
  connectionPrev?: string;
  connectionNext?: string;
  prose?: string;
  wordCount?: number;
  notes?: string[];
  illustrations?: string[];
  versions?: ChapterVersion[];
  status?: 'PENDENTE' | 'ESCREVENDO' | 'RASCUNHO' | 'REVISADO' | 'APROVADO';
}

export interface ContinuityIssue {
  id: string;
  chapterIndex: number;
  severity: 'blocker' | 'warning' | 'info';
  category: 'character' | 'timeline' | 'location' | 'fact' | 'object' | 'tone';
  description: string;
  conflictingChapterIndex?: number;
  suggestedFix: string;
  status: 'pending' | 'fixed' | 'ignored';
}

export interface FactCheckItem {
  id: string;
  chapterIndex: number;
  claim: string;
  status: 'confirmed' | 'verify' | 'source_needed';
  sourceUrl?: string;
  notes?: string;
}

export interface IBookEditorReport {
  score: number;
  summary: string;
  strengths: string[];
  issues: Array<{
    chapterIndex?: number;
    severity: 'blocker' | 'important' | 'minor';
    category: 'consistency' | 'voice' | 'pacing' | 'grammar' | 'plot' | 'factual';
    note: string;
  }>;
  continuityIssues?: ContinuityIssue[];
  factCheckItems?: FactCheckItem[];
  chaptersToRevise: number[];
  plagiarismNote?: string;
}

export interface EditorialElements {
  halfTitle: string;
  titlePage: {
    title: string;
    subtitle: string;
    author: string;
    publisher: string;
    year: string;
  };
  copyrightNotice: string;
  isbn?: string;
  dedication?: string;
  epigraph?: string;
  preface?: string;
  foreword?: string;
  introduction?: string;
  conclusion?: string;
  acknowledgements?: string;
  aboutAuthor?: string;
  references?: string[];
  glossary?: Array<{ term: string; definition: string }>;
  appendices?: Array<{ title: string; content: string }>;
  discussionGuide?: string[];
}

export interface CoverGeometry {
  trimSize: TrimSize;
  pageCount: number;
  paperType: PaperType;
  spineWidthInches: number;
  totalCoverWidthInches: number;
  totalCoverHeightInches: number;
  bleedInches: number;
  spineText: string;
}

export interface IBookCoverDesign {
  frontPrompt: string;
  backPrompt?: string;
  title: string;
  subtitle?: string;
  author: string;
  backCoverBlurb: string;
  geometry: CoverGeometry;
  frontImageUrl?: string;
  backImageUrl?: string;
  fullWrapPdfGenerated?: boolean;
}

export interface IBookMetadataKdp {
  title: string;
  subtitle?: string;
  author: string;
  descriptionHtml: string;
  commercialShortDescription: string;
  commercialLongDescription: string;
  salesHooks: string[];
  keywords7: string[];
  categoriesPrimary: string[];
  categoriesSecondary: string[];
  language: string;
  targetAudience: string;
  ageRange?: string;
  seriesName?: string;
  seriesNumber?: number;
  priceSuggestedBrl: number;
  priceSuggestedUsd: number;
  isbn?: string;
}

export interface QualityCheckItem {
  id: string;
  name: string;
  category: 'Estrutura' | 'Manuscrito' | 'Metadados' | 'Capa' | 'Formatação';
  passed: boolean;
  details: string;
  severity: 'blocker' | 'warning';
}

export interface IBookQualityReport {
  overallScore: number;
  passed: boolean;
  isReadyForKdp: boolean;
  blockerCount: number;
  warningCount: number;
  checks: QualityCheckItem[];
  recommendations: string[];
  timestamp: number;
}

export interface GenerationCost {
  totalTokens: number;
  totalCalls: number;
  estimatedCostUsd: number;
  estimatedCostBrl: number;
  stageBreakdown: Record<string, { tokens: number; calls: number; costUsd: number; model: string }>;
}

export type PipelineStage = 
  | 'idle' 
  | 'analyzing' 
  | 'concept' 
  | 'title_selection' 
  | 'outline' 
  | 'bible' 
  | 'writing' 
  | 'continuity' 
  | 'editing' 
  | 'cover' 
  | 'editorial_matter' 
  | 'typesetting' 
  | 'metadata' 
  | 'quality_gate' 
  | 'packaging' 
  | 'completed' 
  | 'error';

// --- ENTIDADE PRINCIPAL DO PROJETO ---
export interface BookProject {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: ProjectStatus;
  priority: ProjectPriority;
  executionMode: ExecutionMode;
  
  // Metadados básicos
  title: string;
  subtitle?: string;
  author: string;
  description: string;
  language: string;
  format: 'Kindle' | 'Capa Comum' | 'Capa Dura';
  trimSize: TrimSize;
  paperType: PaperType;
  estimatedPages: number;
  actualPages?: number;
  targetPrice: number;
  currency: string;
  targetMarketplace: string;
  categories: string[];
  keywords: string[];
  targetAudience: string;
  
  // Pipeline Editorial
  topic: string;
  kdpBookType: BookType;
  kdpConcept?: IBookConcept;
  kdpBible?: IBookBible;
  kdpChapters?: IBookChapter[];
  kdpEditorReport?: IBookEditorReport;
  kdpCoverDesign?: IBookCoverDesign;
  kdpMetadata?: IBookMetadataKdp;
  kdpQualityReport?: IBookQualityReport;
  editorialElements?: EditorialElements;
  
  // Rastreabilidade e Custos
  generationCost?: GenerationCost;
  pipelineStage: PipelineStage;
  pipelineProgress: number;
  pipelineLog: string[];
  
  // Tarefas manuais e notas
  tasks: Array<{ id: string; text: string; completed: boolean; category: string; createdAt: number }>;
  notes: string;
  outline?: Array<{ id: string; order: number; title: string; description: string; wordCount?: number; status: string }>;
  competitorsAsins: string[];
}

export interface ProjectSummary {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  status: ProjectStatus;
  kdpBookType: BookType;
  chaptersCount: number;
  wordsTotal: number;
  pagesEstimated: number;
  updatedAt: number;
  qualityScore?: number;
  isReadyForKdp?: boolean;
}
