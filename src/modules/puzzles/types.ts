export type PuzzleType = 'sudoku' | 'wordsearch' | 'maze';

export type SudokuDifficulty = 'facil' | 'medio' | 'dificil' | 'extremo';

export type TrimSize = '8.5x11' | '6x9' | '8.25x11';

export type PaperColor = 'white' | 'cream';

export type PuzzlesPerPage = 1 | 2 | 4;

export type SolutionsPerPage = 4 | 6 | 9 | 12;

export interface TrimSizeDimensions {
  name: string;
  widthInches: number;
  heightInches: number;
  widthPoints: number;
  heightPoints: number;
}

export const TRIM_DIMENSIONS: Record<TrimSize, TrimSizeDimensions> = {
  '8.5x11': {
    name: '8.5" x 11" (Padrão KDP Passatempos)',
    widthInches: 8.5,
    heightInches: 11.0,
    widthPoints: 8.5 * 72,
    heightPoints: 11.0 * 72
  },
  '6x9': {
    name: '6" x 9" (Tamanho de Bolso / Trade)',
    widthInches: 6.0,
    heightInches: 9.0,
    widthPoints: 6.0 * 72,
    heightPoints: 9.0 * 72
  },
  '8.25x11': {
    name: '8.25" x 11" (Formato Especial Grande)',
    widthInches: 8.25,
    heightInches: 11.0,
    widthPoints: 8.25 * 72,
    heightPoints: 11.0 * 72
  }
};

export interface SudokuPuzzleItem {
  id: string;
  number: number;
  type: 'sudoku';
  difficulty: SudokuDifficulty;
  grid: number[][]; // 9x9, 0 para espaços vazios
  solution: number[][]; // 9x9 resolvido
  cluesCount: number;
}

export interface WordSearchPuzzleItem {
  id: string;
  number: number;
  type: 'wordsearch';
  theme: string;
  gridSize: number; // ex: 15, 18, 20
  grid: string[][]; // matriz de caracteres
  words: string[]; // palavras a encontrar
  placements: Array<{
    word: string;
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
    direction: string;
  }>;
}

export interface MazePuzzleItem {
  id: string;
  number: number;
  type: 'maze';
  difficulty: 'facil' | 'medio' | 'dificil';
  width: number;
  height: number;
  // Paredes: células representadas por nós com conexões norte, sul, leste, oeste
  grid: Array<Array<{
    row: number;
    col: number;
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  }>>;
  start: { row: number; col: number };
  end: { row: number; col: number };
  solutionPath: Array<{ row: number; col: number }>;
}

export type GeneratedPuzzleItem = SudokuPuzzleItem | WordSearchPuzzleItem | MazePuzzleItem;

export interface PuzzleBookConfig {
  // Metadados
  title: string;
  subtitle: string;
  author: string;
  description?: string;

  // Formato Físico
  trimSize: TrimSize;
  paperColor: PaperColor;

  // Quantidades de Puzzles
  sudokuFacilCount: number;
  sudokuMedioCount: number;
  sudokuDificilCount: number;
  sudokuExtremoCount: number;

  wordSearchCount: number;
  wordSearchThemes: string[];
  wordSearchGridSize: 15 | 18 | 20;

  mazeCount: number;
  mazeDifficulty: 'facil' | 'medio' | 'dificil';

  // Diagramação
  puzzlesPerPage: PuzzlesPerPage;
  solutionsPerPage: SolutionsPerPage;

  // Estilo da Capa
  coverPrimaryColor: string;
  coverSecondaryColor: string;
  coverAccentColor: string;
  coverTextColor: string;
  coverStyleTheme: 'modern-bold' | 'vibrant-gradient' | 'classic-elegant' | 'dark-neon' | 'minimal-clean';
  coverBadgeText: string;
  backCoverSynopsis: string;
  backCoverBulletPoints: string[];
}

export interface KdpCoverSpecs {
  trimWidth: number;
  trimHeight: number;
  bleed: number;
  spineWidth: number;
  totalWidth: number;
  totalHeight: number;
  hasSpineText: boolean;
  pageCount: number;
  barcodeArea: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

export interface CompilationResult {
  interiorBlob: Blob;
  coverBlob: Blob;
  coverDataUrl: string;
  pageCount: number;
  puzzleCount: number;
  coverSpecs: KdpCoverSpecs;
  metadataJson: string;
  instructionsTxt: string;
}
