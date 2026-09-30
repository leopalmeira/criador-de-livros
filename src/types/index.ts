// Definições de Tipos do BookIntel / Analisador Editorial

export type Marketplace = 
  | 'amazon.com.br' 
  | 'amazon.com' 
  | 'amazon.co.uk' 
  | 'amazon.es' 
  | 'amazon.de' 
  | 'amazon.fr' 
  | 'amazon.it' 
  | 'amazon.ca' 
  | 'amazon.com.mx'
  | 'amazon.co.jp'
  | 'amazon.in'
  | 'amazon.com.au'
  | 'amazon.nl'
  | 'amazon.pl'
  | 'amazon.se'
  | 'amazon.com.be'
  | 'amazon.ae'
  | 'amazon.sa'
  | 'amazon.sg'
  | 'amazon.eg'
  | 'amazon.com.tr'
  | 'amazon.co.za';

export type BookFormat = 
  | 'Kindle' 
  | 'Capa Comum' 
  | 'Capa Dura' 
  | 'Livro de Bolso' 
  | 'Audiobook' 
  | 'Espiral' 
  | 'Outro';

export type ConfidenceLevel = 'ALTA' | 'MÉDIA' | 'BAIXA';

export type TrendDirection = 'SUBINDO' | 'ESTÁVEL' | 'CAINDO' | 'INSUFICIENTE';

export type CompetitionLevel = 'BAIXA' | 'MÉDIA' | 'ALTA';

export type PageType = 
  | 'SEARCH_RESULTS' 
  | 'CATEGORY_BESTSELLERS' 
  | 'PRODUCT_PAGE' 
  | 'AUTHOR_PAGE' 
  | 'OTHER';

export interface BsrCategory {
  rank: number;
  category: string;
  link?: string;
}

export interface RawBookData {
  asin: string;
  title: string;
  subtitle?: string;
  author?: string;
  publisher?: string;
  publicationDate?: string; // string original extraída
  parsedDate?: string; // ISO yyyy-mm-dd
  language?: string;
  pages?: number;
  format?: BookFormat;
  price?: number;
  currency: string;
  rating?: number;
  reviewCount?: number;
  ratingsCount?: number;
  bsr?: number; // BSR geral
  bsrCategories?: BsrCategory[];
  isKindleUnlimited?: boolean;
  isAvailable?: boolean;
  coverImage?: string;
  url: string;
  marketplace: Marketplace;
  rawSelectorsUsed?: Record<string, string>;
}

export interface Book {
  asin: string;
  isbn10?: string;
  isbn13?: string;
  title: string;
  subtitle?: string;
  author: string;
  publisher?: string;
  publicationDate?: string;
  parsedDate?: string;
  ageDays?: number;
  ageFormatted?: string;
  language?: string;
  pages?: number;
  format: BookFormat;
  price?: number;
  currency: string;
  rating?: number;
  reviewCount?: number;
  coverImage?: string;
  url: string;
  marketplace: Marketplace;
  firstSeenAt: number;
  lastSeenAt: number;
}

export interface Observation {
  id?: number;
  asin: string;
  marketplace: Marketplace;
  timestamp: number;
  bsr?: number;
  bsrCategories?: BsrCategory[];
  price?: number;
  rating?: number;
  reviewCount?: number;
  estimatedDailySales?: number;
  estimatedMonthlySales?: number;
  estimatedDailyRevenue?: number;
  estimatedMonthlyRevenue?: number;
  estimatedDailyRoyalty?: number;
  estimatedMonthlyRoyalty?: number;
  confidence: ConfidenceLevel;
  opportunityScore?: number;
  modelVersion: string;
}

export interface BsrHistoryPoint {
  timestamp: number;
  bsr: number;
  price?: number;
  rating?: number;
  reviewCount?: number;
  dailySales?: number;
}

export interface BsrTrendAnalysis {
  currentBsr?: number;
  averageBsr?: number;
  bestBsr?: number;
  worstBsr?: number;
  variation7d?: number; // em % ou diferença
  variation30d?: number;
  direction: TrendDirection;
  summaryText: string;
  pointsCount: number;
}

export interface SalesCalibrationPoint {
  bsr: number;
  dailySales: number;
}

export interface SalesModelConfig {
  id: string;
  name: string;
  marketplace: Marketplace;
  format: BookFormat | 'Todos';
  points: SalesCalibrationPoint[];
  method: 'log-log' | 'logarithmic' | 'linear';
  version: string;
  isDefault?: boolean;
}

export interface SalesEstimateInput {
  marketplace: Marketplace;
  bsr?: number;
  format?: BookFormat;
  category?: string;
  price?: number;
}

export interface SalesEstimateResult {
  estimatedDailySales: number | null;
  estimatedMonthlySales: number | null;
  confidence: ConfidenceLevel;
  methodVersion: string;
  notes?: string;
}

export interface RoyaltySettings {
  kindleRateHigh: number; // 0.70
  kindleRateLow: number;  // 0.35
  kindleMinPriceForHighRate: number; // ex: 5.99 BRL ou 2.99 USD
  kindleMaxPriceForHighRate: number; // ex: 24.99 BRL ou 9.99 USD
  kindleDeliveryCostPerMb: number;   // ex: 0.30 BRL ou 0.15 USD
  paperbackFixedCost: number;       // ex: 5.00 BRL ou 1.00 USD
  paperbackPerPageCost: number;     // ex: 0.07 BRL ou 0.012 USD
  paperbackRoyaltyRate: number;     // ex: 0.60
  hardcoverFixedCost: number;       // ex: 12.00 BRL ou 5.00 USD
  hardcoverPerPageCost: number;     // ex: 0.08 BRL
  hardcoverRoyaltyRate: number;     // ex: 0.60
  audiobookRoyaltyRate: number;     // ex: 0.25 (ou 0.40 exclusivo)
}

export interface OpportunityScoreWeights {
  salesWeight: number;      // Peso de vendas estimadas (0-100)
  reviewBarrierWeight: number; // Peso de barreira de reviews (poucos reviews = maior oportunidade)
  ratingWeight: number;     // Peso de nota (qualidade de produto / espaço de melhoria)
  priceWeight: number;      // Peso de preço saudável
  recencyWeight: number;    // Peso de livros novos vencendo
}

export interface OpportunityScoreResult {
  score: number; // 0 a 100
  factors: {
    salesFactor: number;
    reviewFactor: number;
    ratingFactor: number;
    priceFactor: number;
    recencyFactor: number;
  };
  explanation: string;
}

export interface NicheSummary {
  keyword?: string;
  url: string;
  timestamp: number;
  marketplace: Marketplace;
  totalBooks: number;
  booksWithBsr: number;
  averageBsr: number | null;
  medianBsr: number | null;
  minBsr: number | null;
  maxBsr: number | null;
  stdDevBsr: number | null;
  averagePrice: number | null;
  medianPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  averageReviews: number | null;
  medianReviews: number | null;
  averageRating: number | null;
  averageAgeMonths: number | null;
  totalEstimatedDailySales: number;
  totalEstimatedMonthlySales: number;
  totalEstimatedMonthlyRevenue: number;
  concentrationTop3: number; // % de vendas nos top 3
  concentrationTop5: number;
  concentrationTop10: number;
  competitionLevel: CompetitionLevel;
  competitionScore: number; // 0 a 100
  competitionReasons: string[];
  newHighPerformersCount: number; // livros < 90 dias com BSR < 50k
  evergreenCount: number; // livros > 2 anos com BSR < 30k
}

export interface NicheSnapshot {
  id: string;
  name: string;
  keyword: string;
  timestamp: number;
  marketplace: Marketplace;
  summary: NicheSummary;
  books: {
    asin: string;
    title: string;
    author: string;
    bsr?: number;
    price?: number;
    rating?: number;
    reviews?: number;
    format?: BookFormat;
    dailySales?: number;
    monthlyRevenue?: number;
  }[];
}

export interface SnapshotComparison {
  previous: NicheSnapshot;
  current: NicheSnapshot;
  daysDifference: number;
  bsrAverageDiff: number;
  medianPriceDiff: number;
  monthlyRevenueDiff: number;
  newBooks: string[]; // ASINs
  droppedBooks: string[]; // ASINs
  summary: string;
}

export interface WatchlistItem {
  asin: string;
  marketplace: Marketplace;
  addedAt: number;
  title: string;
  author: string;
  coverImage?: string;
  currentBsr?: number;
  currentPrice?: number;
  currentDailySales?: number;
  notes?: string;
  tags?: string[];
}

export type ImageProviderType = 'builtin-flux' | 'fooocus' | 'sd-webui' | 'comfyui' | 'dalle3' | 'custom';

export interface AiSettings {
  provider: 'gemini' | 'openai' | 'openrouter' | 'anthropic' | 'azure' | 'ollama' | 'custom' | 'local-builtin';
  apiKey?: string;
  fallbackApiKey?: string;
  baseUrl?: string;
  model?: string;
  azureEndpoint?: string;
  azureApiKey?: string;
  azureImageEndpoint?: string;
  imageProvider?: ImageProviderType;
  imageEndpoint?: string;
  imageModel?: string;
  temperature?: number;
}

export interface AppSettings {
  defaultMarketplace: Marketplace;
  language: 'pt-BR' | 'en';
  theme: 'dark' | 'light' | 'auto';
  cacheTtlMinutes: number; // Padrão 30 min
  monthlyDaysMultiplier: 30 | 30.44;
  showOverlayOnCards: boolean;
  showProductPanel: boolean;
  showNicheBar: boolean;
  debugMode: boolean;
  opportunityWeights: OpportunityScoreWeights;
  royaltySettings: Record<string, RoyaltySettings>; // chave por moeda ou marketplace
  aiSettings?: AiSettings;
}

export interface DebugLogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  context: string;
  message: string;
  data?: any;
}

export type { 
  BookProject, 
  ProjectStatus, 
  ProjectPriority, 
  ProjectSummary,
  BookType,
  TrimSize,
  PaperType,
  IBookTypeConfig,
  IBookConcept,
  IBookCharacter,
  IBookLocation,
  IBookStyleGuide,
  IBookBible,
  IBookScene,
  IBookChapter,
  IBookEditorReport,
  IBookCoverDesign,
  IBookMetadataKdp,
  IBookQualityReport,
  QualityCheckItem,
  CoverGeometry,
  EditorialElements,
  BookMemory,
  BookVisualPage,
  BookVersionItem,
  PageLayoutSettings,
  TypographySettings,
  PipelineStage
} from './book-project';
export { BOOK_TYPE_CONFIGS } from './book-project';

