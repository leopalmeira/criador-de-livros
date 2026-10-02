// ============================================================
// STAGE DEFINITIONS — 12 Etapas Editoriais Fixas
// ============================================================

export type StageId =
  | 'research'
  | 'book-titles'
  | 'resources'
  | 'author-persona'
  | 'purpose'
  | 'book-details'
  | 'author-bio'
  | 'outline'
  | 'write'
  | 'description'
  | 'book-cover'
  | 'finish';

export type StageStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'APPROVED'
  | 'COMPLETED';

export interface StageDefinition {
  id: StageId;
  number: number;
  label: string;
}

export const STAGES: StageDefinition[] = [
  { id: 'research',       number: 1,  label: 'Pesquisa & Tópico' },
  { id: 'book-titles',    number: 2,  label: 'Títulos & Subtítulos' },
  { id: 'resources',      number: 3,  label: 'Fontes & Materiais' },
  { id: 'author-persona', number: 4,  label: 'Voz & Persona' },
  { id: 'purpose',        number: 5,  label: 'Proposta Editorial' },
  { id: 'book-details',   number: 6,  label: 'Ficha Editorial' },
  { id: 'author-bio',     number: 7,  label: 'Biografia do Autor' },
  { id: 'outline',        number: 8,  label: 'Sumário & Estrutura' },
  { id: 'write',          number: 9,  label: 'Escrever & Diagramar' },
  { id: 'description',    number: 10, label: 'Sinopse Amazon KDP' },
  { id: 'book-cover',     number: 11, label: 'Capa do Livro' },
  { id: 'finish',         number: 12, label: 'Finalizar & Publicar' },
];

// ============================================================
// STAGE DATA INTERFACES
// ============================================================

export interface ResearchData {
  bookTitle: string;
  authorName: string;
  genre: string;
  topic: string;
  stance: string;
  standout: string;
  authorTone: string;
  generalAudience: string;
  targetAudience: string;
}

export interface AnalyticsData {
  marketReferences: MarketReference[];
  analysisNotes: string;
  aiAnalysisSummary: string;
  [key: string]: any;
}

export interface MarketReference {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  description?: string;
  bsr?: number;
  rating?: number;
  reviewCount?: number;
  price?: number;
  format?: string;
  pageCount?: number;
  marketplace?: string;
  url?: string;
  collectedAt: number;
  selectionReason?: string;
  // Dados de desenvolvimento editorial e inspiração ética (sem plágio)
  narrativeStructure?: string;       // Estrutura Narrativa / Arquitetura Metodológica
  openingHook?: string;              // Gancho de Abertura & Retenção
  commercialPositioning?: string;    // Posicionamento no KDP / Nicho
  ethicalInspirationGuideline?: string; // Diretriz de inspiração ética sem plágio (100% autoral)
  [key: string]: any;
}

export interface BookTitlesData {
  generatedTitles: TitleOption[];
  selectedTitleId: string;
  customTitle: string;
  customSubtitle: string;
  [key: string]: any;
}

export interface TitleOption {
  id: string;
  title: string;
  subtitle: string;
  [key: string]: any;
}

export interface ResourcesData {
  items: ResourceItem[];
  [key: string]: any;
}

export interface ResourceItem {
  id: string;
  name: string;
  type: 'link' | 'text' | 'file';
  content: string;
  url?: string;
  addedAt: number;
  tags: string[];
}

export interface AuthorPersonaData {
  inspirationAuthors: string;
  authorDescription: string;
  writingSample: string;
  generatedPersona: string;
  tone: string;
  mood: string;
  perspective: string;
  pacingStyle: string;
  savedPersonaName: string;
  [key: string]: any;
}

export interface PurposeData {
  focusTags: string[];
  customTags: string[];
  generatedProposal: string;
  uniqueSellingPoint: string;
  competitiveLandscape: string;
  keySellingPoints: string[];
  proposedAudience: string;
  proposedTone: string;
  [key: string]: any;
}

export interface BookDetailsData {
  wordCount: string;
  chapterCount: number;
  bookStructure: string;
  additionalNotes: string;
  [key: string]: any;
}

export interface AuthorBioData {
  personalDetails: string;
  nameType: 'pen-name' | 'brand-name' | 'personal-name';
  background: string;
  achievements: string;
  generatedBio: string;
  [key: string]: any;
}

export interface DescriptionData {
  headline: string;
  relateSection: string;
  bulletPoints: string[];
  overcomingObjections: string;
  callToAction: string;
  fullDescription: string;
  [key: string]: any;
}

export interface FinishData {
  checklist: FinishCheckItem[];
  exportFormat: 'pdf' | 'docx' | 'epub';
  isReady: boolean;
}

export interface FinishCheckItem {
  id: string;
  label: string;
  category: string;
  checked: boolean;
}

// Combined stage data stored in project
export interface StageDataMap {
  research?: ResearchData;
  analytics?: AnalyticsData;
  'book-titles'?: BookTitlesData;
  resources?: ResourcesData;
  'author-persona'?: AuthorPersonaData;
  purpose?: PurposeData;
  'book-details'?: BookDetailsData;
  'author-bio'?: AuthorBioData;
  outline?: any;
  write?: any;
  description?: DescriptionData;
  'book-cover'?: any;
  finish?: FinishData;
  [key: string]: any;
}

// ============================================================
// HELPERS
// ============================================================

export function getDefaultStageStatuses(): Record<StageId, StageStatus> {
  const statuses: Record<string, StageStatus> = {};
  STAGES.forEach(s => { statuses[s.id] = 'NOT_STARTED'; });
  return statuses as Record<StageId, StageStatus>;
}

export function getStageByNumber(num: number): StageDefinition | undefined {
  return STAGES.find(s => s.number === num);
}

export function getNextStage(currentId: StageId): StageId | null {
  const idx = STAGES.findIndex(s => s.id === currentId);
  if (idx < 0 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1].id;
}

export function getPrevStage(currentId: StageId): StageId | null {
  const idx = STAGES.findIndex(s => s.id === currentId);
  if (idx <= 0) return null;
  return STAGES[idx - 1].id;
}

export function getStageNumber(id: StageId): number {
  return STAGES.find(s => s.id === id)?.number || 1;
}

export function getStageLabel(id: StageId): string {
  return STAGES.find(s => s.id === id)?.label || '';
}
