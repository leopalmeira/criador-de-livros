// Tipos e Interfaces para o Gerador de Livros de Colorir Amazon KDP
// Baseado na arquitetura e parâmetros de ElliottSax/coloring-books

export type IllustrationStyle = 'kids' | 'adult' | 'detailed';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type KdpTrimFormat = '8.5x11' | '8.25x8.25' | '8.5x8.5' | '8x10';
export type LineArtMethod = 'enhanced' | 'standard' | 'detailed';
export type ColoringAiProvider = 'pollinations' | 'openai' | 'sdxl' | 'mock';

export interface ColoringTheme {
  id: string;
  name: string;
  category: 'Geral' | 'Natureza' | 'Padrões' | 'Épico & Fantasia' | 'Sazonal' | 'Cultura';
  description: string;
  coverPromptDetails: string;
  prompts: string[];
}

export interface ColoringBookConfig {
  title: string;
  subtitle?: string;
  theme: string;
  customThemePrompt?: string;
  style: IllustrationStyle;
  difficulty: DifficultyLevel;
  pageCount: number;
  trimFormat: KdpTrimFormat;
  hasBleed: boolean;
  blankPageInterleaving: boolean; // Intercalação de páginas em branco anti-sangramento
  includeBelongsToPage: boolean; // Página de abertura "Este livro pertence a:"
  provider: ColoringAiProvider;
  apiKey?: string;
  lineArtMethod: LineArtMethod;
}

export interface GeneratedColoringPage {
  id: string;
  pageNumber: number; // Índice do desenho (1..N)
  bookPageNumber: number; // Número da página no PDF KDP impresso (ímpar)
  prompt: string;
  imageUrl: string;
  rawUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
  seed: number;
  qualityPassed?: boolean;
}

export interface ColoringBookJobState {
  isGenerating: boolean;
  isPdfBuilding: boolean;
  currentStep: string;
  currentItem: number;
  totalItems: number;
  percent: number;
  pages: GeneratedColoringPage[];
  coverUrl?: string;
  pdfBlob?: Blob;
  pdfUrl?: string;
  error?: string;
}
