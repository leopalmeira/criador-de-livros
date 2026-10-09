// Tipos para o Módulo Romance Cinematográfico Realista (Cinematic Illustrated Novel)
// Arquitetura de Foto Livro / Graphic Novel Realista com narração e diálogos integrados na imagem

export type CinematicGenre = 
  | 'suspense-psicologico'
  | 'misterio'
  | 'thriller-criminal'
  | 'romance-dramatico'
  | 'terror'
  | 'ficcao-cientifica'
  | 'fantasia'
  | 'aventura'
  | 'drama'
  | 'ficcao-historica'
  | 'personalizado';

export type CinematicVisualFraming = 
  | 'plano-detalhe'
  | 'close-up-dramatico'
  | 'primeiro-plano'
  | 'plano-medio'
  | 'plano-americano'
  | 'plano-geral-estabelecedor'
  | 'angulo-holandes'
  | 'contra-plongee'
  | 'plongee'
  | 'ponto-de-vista-subjetivo';

export type SpeechBubbleType = 'speech' | 'thought' | 'whisper' | 'document';

export interface CinematicCharacter {
  id: string;
  name: string;
  age: string;
  role: 'protagonista' | 'antagonista' | 'coadjuvante' | 'mencionado';
  faceShape: string;
  skinTone: string;
  eyes: string;
  hair: string;
  heightAndBuild: string;
  distinctiveMarks: string;
  costumes: string[];
  accessories: string[];
  personality: string;
  speakingStyle: string;
  relationships: Record<string, string>;
  referenceImageUrl?: string;
  referencePrompt?: string;
  isApproved: boolean;
}

export interface CinematicStoryBible {
  synopsis: string;
  premise: string;
  centralConflict: string;
  plannedResolution: string;
  chapterSummaries: Array<{
    chapterNumber: number;
    title: string;
    summary: string;
    keyHappenings: string[];
    timeline: string;
    location: string;
  }>;
  currentLocations: Record<string, string>; // characterId -> local
  characterKnowledge: Record<string, string[]>; // characterId -> segredos que ele sabe
  unrevealedSecrets: string[];
  importantObjects: string[];
  characterOutfits: Record<string, string>; // characterId -> traje atual
  physicalChangesOrInjuries: Record<string, string>;
  timelineSequence: string; // ex: '06:17 da manhã de terça-feira, chuva fraca'
  activeConflicts: string[];
  upcomingEvents: string[];
}

export interface CinematicDialogueItem {
  id: string;
  speakerId: string;
  speakerName: string;
  speechText: string;
  speechType: SpeechBubbleType;
  // Posicionamento relativo dentro do painel ou página (0-100%)
  position?: {
    top: number; // porcentagem do topo
    left: number; // porcentagem da esquerda
  };
}

export interface CinematicPanel {
  id: string;
  panelIndex: number;
  framing: CinematicVisualFraming;
  sceneDescription: string;
  visualPrompt: string;
  negativePrompt?: string;
  imageUrl?: string;
  narrationText?: string;
  dialogues: CinematicDialogueItem[];
  // Destaque de documento ou bilhete na cena
  documentInset?: {
    text: string;
    textureType: 'bilhete-pardo' | 'carta' | 'tela-digital' | 'jornal';
  };
}

export interface CinematicPagePlan {
  id: string;
  bookId: string;
  chapterNumber: number;
  chapterTitle: string;
  pageNumber: number;
  
  // 22 CAMPOS OBRIGATÓRIOS DO PAGE GENERATION PIPELINE
  sceneSummary: string;
  previousNarrativeContext: string;
  dramaticObjective: string;
  charactersPresent: string[]; // IDs
  mandatoryVisualReferences: string[];
  charactersAppearance: string;
  costumeAndProps: string;
  environmentSetting: string;
  timeAndLighting: string;
  actionsAndExpressions: string;
  cameraFraming: CinematicVisualFraming;
  imageComposition: string;
  requiredElements: string[];
  persistentElements: string[];
  narrationText: string;
  dialogues: CinematicDialogueItem[];
  speechAttribution: string;
  textPlacementPlan: string;
  reservedVisualSpace: string;
  validationCriteria: string[];
  
  // RENDERIZAÇÃO E MOTOR DE IMAGEM
  visualPrompt: string; // Prompt individual específico DESTA página
  negativePrompt: string;
  imageUrl?: string;
  
  // LAYOUT EDITORIAL (Página inteira cinematográfica ou grade de quadros)
  layoutType: 'single_hero' | 'multi_panel';
  panels?: CinematicPanel[];
  
  // STATUS E CONTROLE
  isApproved: boolean;
  validationStatus: 'planejado' | 'gerando' | 'gerado' | 'aprovado' | 'necessita_revisao';
  validationNotes?: string[];
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface CinematicChecklistTask {
  id: string;
  number: number;
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt?: number;
}

export interface CinematicNovelProjectData {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  genre: CinematicGenre;
  subgenre: string;
  language: string;
  targetAudience: string;
  premise: string;
  totalChaptersPlanned: number;
  approximatePages: number;
  visualStyle: string;
  emotionalTone: string;
  endingType: string;
  narrativePov: string;
  
  storyBible: CinematicStoryBible;
  characters: CinematicCharacter[];
  pages: CinematicPagePlan[];
  checklist: CinematicChecklistTask[];
  
  coverImageUrl?: string;
  coverTitle?: string;
  coverSubtitle?: string;
  
  status: 'ideia' | 'roteiro' | 'personagens' | 'paginas_planejadas' | 'em_geracao' | 'revisao' | 'concluido';
  createdAt: number;
  updatedAt: number;
}

export const INITIAL_CINEMATIC_CHECKLIST: CinematicChecklistTask[] = [
  { id: 't1', number: 1, title: 'Conceito aprovado', description: 'Gênero, premissa e tom dramático definidos.', isCompleted: false },
  { id: 't2', number: 2, title: 'Gênero definido', description: 'Diretrizes artísticas e atmosfera cinematográfica escolhidas.', isCompleted: false },
  { id: 't3', number: 3, title: 'Story Bible criada', description: 'Bíblia de continuidade narrativa com linha do tempo e fatos estabelecida.', isCompleted: false },
  { id: 't4', number: 4, title: 'Personagens definidos', description: 'Fichas detalhadas de protagonistas e elenco secundário configuradas.', isCompleted: false },
  { id: 't5', number: 5, title: 'Referências visuais aprovadas', description: 'Fotos-referência fotorrealistas de cada personagem geradas e aprovadas.', isCompleted: false },
  { id: 't6', number: 6, title: 'Roteiro completo aprovado', description: 'Sinopse, conflito central e atos dramáticos revisados pelo autor.', isCompleted: false },
  { id: 't7', number: 7, title: 'Capítulos estruturados', description: 'Divisão em capítulos e ganchos dramáticos estabelecidos.', isCompleted: false },
  { id: 't8', number: 8, title: 'Cenas planejadas', description: 'Sequência de acontecimentos e arcos de cena organizados.', isCompleted: false },
  { id: 't9', number: 9, title: 'Prompts individuais das páginas preparados', description: 'Cada página com seu prompt visual exclusivo de 22 parâmetros.', isCompleted: false },
  { id: 't10', number: 10, title: 'Imagens geradas', description: 'Fotografia cinematográfica de todas as páginas produzida com IA.', isCompleted: false },
  { id: 't11', number: 11, title: 'Textos integrados', description: 'Narração e diálogos sobrepostos na composição gráfica sem fundo branco.', isCompleted: false },
  { id: 't12', number: 12, title: 'Continuidade narrativa verificada', description: 'Conferência de linha de tempo, locais e segredos mantidos.', isCompleted: false },
  { id: 't13', number: 13, title: 'Consistência visual revisada', description: 'Rostos, cabelos, marcas e roupas comparados com as fichas.', isCompleted: false },
  { id: 't14', number: 14, title: 'Páginas aprovadas', description: 'Revisão individual de cada página pelo autor.', isCompleted: false },
  { id: 't15', number: 15, title: 'Livro completo revisado', description: 'Leitura completa da graphic novel de ponta a ponta.', isCompleted: false },
  { id: 't16', number: 16, title: 'Arquivo final exportado', description: 'PDF Full-Bleed 300 DPI e pacote digital gerados.', isCompleted: false },
  { id: 't17', number: 17, title: 'Checklist de publicação concluído', description: 'Validação oficial de margens e padrões Amazon KDP.', isCompleted: false }
];
