// Tipos e Interfaces para o Gerador de Livro de Sudoku Investigativo (Murder Mystery Sudoku KDP)

export type InvestigationTheme =
  | 'assassinato'
  | 'roubo'
  | 'desaparecimento'
  | 'sequestro'
  | 'hotel'
  | 'mansao'
  | 'trem'
  | 'navio'
  | 'museu'
  | 'cidade'
  | 'historico'
  | 'policial'
  | 'outro';

export type TimePeriod =
  | 'atual'
  | 'anos2020'
  | 'anos2000'
  | 'anos1990'
  | 'anos1980'
  | 'anos1950'
  | 'vitoriana'
  | 'futurista'
  | 'personalizada';

export type LocationType =
  | 'mansao'
  | 'hotel'
  | 'trem'
  | 'navio'
  | 'museu'
  | 'restaurante'
  | 'fazenda'
  | 'escritorio'
  | 'universidade'
  | 'cidade_pequena'
  | 'cidade_grande'
  | 'ilha'
  | 'outro';

export type StoryStyle =
  | 'policial_classico'
  | 'noir'
  | 'thriller'
  | 'misterio_classico'
  | 'moderno'
  | 'historico'
  | 'suspense'
  | 'personalizado';

export type SudokuDifficulty =
  | 'facil'
  | 'medio'
  | 'dificil'
  | 'expert'
  | 'progressivo';

export type ClueType =
  | 'local'
  | 'horario'
  | 'numero_quarto'
  | 'telefone_ficticio'
  | 'codigo'
  | 'objeto'
  | 'arma'
  | 'veiculo'
  | 'iniciais'
  | 'suspeito'
  | 'testemunha'
  | 'sequencia'
  | 'documento_ficticio'
  | 'posicao'
  | 'evidencia'
  | 'combinacao'
  | 'senha_ficticia';

export type SudokuTrimFormat = '8.5x11' | '8x10' | '7.5x9.25' | '6x9';

export interface Victim {
  nome: string;
  idade: number;
  profissao: string;
  personalidade: string;
  historico: string;
  relacaoComSuspeitos: string;
}

export interface Suspect {
  id: string;
  numero: number;
  nome: string;
  idade: number;
  profissao: string;
  relacionamento: string;
  possivelMotivo: string;
  alibi: string;
  comportamento: string;
  segredo: string;
  evidenciasRelacionadas: string;
  infoVerdadeira: string;
  infoFalsa: string;
  isCulprit: boolean;
}

export interface CrimeScene {
  descricao: string;
  horaEncontrado: string;
  localDetalhado: string;
  pistasVisiveis: string[];
}

export interface InvestigationClue {
  id: string;
  clueNumber: number;
  clueType: ClueType;
  revelationText: string;
  contextDescription: string;
  pointsToCulpritReason: string;
  revealedBySudokuId: string;
}

export interface SudokuPuzzle {
  id: string;
  caseNumber: number;
  puzzleIndex: number;
  difficulty: 'facil' | 'medio' | 'dificil' | 'expert';
  grid: number[][]; // 9x9 com 0 para vazio
  solution: number[][]; // 9x9 completa
  clueCell: { row: number; col: number; targetDigit: number };
  associatedClue: InvestigationClue;
  instructions: string;
}

export interface CaseSolution {
  culprit: Suspect;
  motiveExplanation: string;
  howCrimeHappened: string;
  location: string;
  time: string;
  mainEvidences: string[];
  howCluesLedToSolution: string[];
}

export interface TimelineEvent {
  time: string;
  event: string;
  suspectInvolved?: string;
  verified: boolean;
}

export interface InvestigationCase {
  id: string;
  caseNumber: number;
  title: string;
  storyIntroduction: string;
  victim: Victim;
  crimeScene: CrimeScene;
  investigatorContext: string;
  suspects: Suspect[];
  initialEvidences: string[];
  timeline: TimelineEvent[];
  puzzles: SudokuPuzzle[];
  clues: InvestigationClue[];
  finalAccusationDeduction: string;
  caseSolution: CaseSolution;
}

export interface SudokuBookConfig {
  title: string;
  subtitle?: string;
  author: string;
  theme: InvestigationTheme;
  customTheme?: string;
  caseCount: number; // 5, 10, 15, 20, 25, 30
  suspectsPerCase: number; // 4, 5, 6, 8, 10
  sudokusPerCase: number; // 3, 5, 8, 10, 12
  difficulty: SudokuDifficulty;
  timePeriod: TimePeriod;
  customPeriod?: string;
  location: LocationType;
  customLocation?: string;
  storyStyle: StoryStyle;
  customStyle?: string;
  trimFormat: SudokuTrimFormat;
  hasBleed: boolean;
  coverArtUrl?: string;
}

export interface ValidationItem {
  passed: boolean;
  category: 'HISTÓRIA' | 'PISTAS' | 'SUDOKU';
  title: string;
  message: string;
}

export interface ConsistencyValidationReport {
  isValid: boolean;
  totalChecks: number;
  passedChecks: number;
  items: ValidationItem[];
  errors: string[];
  warnings: string[];
}

export interface SudokuGenerationProgress {
  isGenerating: boolean;
  currentStep: string;
  progressPercent: number;
  currentCaseIndex: number;
  totalCases: number;
  cases: InvestigationCase[];
  validationReport?: ConsistencyValidationReport;
  error?: string;
}
