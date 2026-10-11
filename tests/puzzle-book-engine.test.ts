import { describe, expect, it } from 'vitest';
import { SudokuEngine } from '../src/modules/puzzles/sudoku-engine';
import { WordSearchEngine, PRESET_WORD_THEMES } from '../src/modules/puzzles/wordsearch-engine';
import { MazeEngine } from '../src/modules/puzzles/maze-engine';
import { PuzzleCoverBuilder } from '../src/modules/puzzles/puzzle-cover-builder';
import { PuzzleInteriorPdfBuilder } from '../src/modules/puzzles/puzzle-interior-pdf-builder';
import { PuzzleBookConfig } from '../src/modules/puzzles/types';

describe('Puzzle & Sudoku Book Engine', () => {
  describe('SudokuEngine', () => {
    it('gera um tabuleiro 9x9 completo válido com todos os números de 1 a 9', () => {
      const board = SudokuEngine.generateCompleteBoard();
      expect(board).toHaveLength(9);
      for (let r = 0; r < 9; r++) {
        expect(board[r]).toHaveLength(9);
        const set = new Set(board[r]);
        expect(set.size).toBe(9);
        expect(set.has(0)).toBe(false);
      }
    });

    it('gera um puzzle com pistas controladas e solução estritamente única', () => {
      const puzzle = SudokuEngine.generatePuzzle(1, 'facil');
      expect(puzzle.number).toBe(1);
      expect(puzzle.type).toBe('sudoku');
      expect(puzzle.difficulty).toBe('facil');
      expect(puzzle.grid).toHaveLength(9);
      expect(puzzle.solution).toHaveLength(9);

      // Quantidade de pistas do nível fácil deve estar entre 36 e 40
      expect(puzzle.cluesCount).toBeGreaterThanOrEqual(36);
      expect(puzzle.cluesCount).toBeLessThanOrEqual(40);

      // Solução única
      const solutionsCount = SudokuEngine.countSolutions(puzzle.grid, 2);
      expect(solutionsCount).toBe(1);
    });

    it('gera puzzle de nível difícil com pistas entre 26 e 29', () => {
      const puzzle = SudokuEngine.generatePuzzle(2, 'dificil');
      expect(puzzle.difficulty).toBe('dificil');
      expect(puzzle.cluesCount).toBeGreaterThanOrEqual(26);
      expect(puzzle.cluesCount).toBeLessThanOrEqual(29);
      expect(SudokuEngine.countSolutions(puzzle.grid, 2)).toBe(1);
    });
  });

  describe('WordSearchEngine', () => {
    it('normaliza e remove acentos das palavras', () => {
      expect(WordSearchEngine.cleanWord('Maçã & Açaí!')).toBe('MACAACAI');
      expect(WordSearchEngine.cleanWord('Árvore-Grande')).toBe('ARVOREGRANDE');
    });

    it('gera grade adaptada e posiciona palavras no Caça-Palavras', () => {
      const theme = PRESET_WORD_THEMES[0];
      const puzzle = WordSearchEngine.generatePuzzle(1, theme.themeName, theme.words, 15);

      expect(puzzle.number).toBe(1);
      expect(puzzle.type).toBe('wordsearch');
      expect(puzzle.gridSize).toBe(15);
      expect(puzzle.grid).toHaveLength(15);
      expect(puzzle.grid[0]).toHaveLength(15);

      // Todas as células devem conter letras maiúsculas
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          expect(puzzle.grid[r][c]).toMatch(/^[A-Z]$/);
        }
      }

      // Deve ter posicionado palavras e registrado no gabarito
      expect(puzzle.words.length).toBeGreaterThan(0);
      expect(puzzle.placements.length).toBe(puzzle.words.length);
      expect(puzzle.placements[0]).toHaveProperty('startRow');
      expect(puzzle.placements[0]).toHaveProperty('direction');
    });
  });

  describe('MazeEngine', () => {
    it('gera labirinto via DFS com entrada aberta no topo e saída na base', () => {
      const maze = MazeEngine.generatePuzzle(1, 'facil');

      expect(maze.number).toBe(1);
      expect(maze.type).toBe('maze');
      expect(maze.difficulty).toBe('facil');
      expect(maze.width).toBe(13);
      expect(maze.height).toBe(13);

      // Entrada e saída abertas
      expect(maze.grid[0][0].top).toBe(false);
      expect(maze.grid[maze.height - 1][maze.width - 1].bottom).toBe(false);

      // Deve ter caminho de solução válido conectando início e fim
      expect(maze.solutionPath.length).toBeGreaterThan(1);
      expect(maze.solutionPath[0]).toEqual({ row: 0, col: 0 });
      expect(maze.solutionPath[maze.solutionPath.length - 1]).toEqual({
        row: maze.height - 1,
        col: maze.width - 1
      });
    });
  });

  describe('PuzzleCoverBuilder (Cálculo KDP da Capa Aberta)', () => {
    const baseConfig: PuzzleBookConfig = {
      title: 'Livro de Puzzles',
      subtitle: 'Passatempos Inteligentes',
      author: 'Autor Teste',
      trimSize: '8.5x11',
      paperColor: 'white',
      sudokuFacilCount: 10,
      sudokuMedioCount: 10,
      sudokuDificilCount: 10,
      sudokuExtremoCount: 5,
      wordSearchCount: 10,
      wordSearchThemes: ['Animais Selvagens'],
      wordSearchGridSize: 15,
      mazeCount: 10,
      mazeDifficulty: 'medio',
      puzzlesPerPage: 2,
      solutionsPerPage: 6,
      coverPrimaryColor: '#0f172a',
      coverSecondaryColor: '#1e3a8a',
      coverAccentColor: '#38bdf8',
      coverTextColor: '#ffffff',
      coverStyleTheme: 'modern-bold',
      coverBadgeText: 'KDP PRINT-READY',
      backCoverSynopsis: 'Sinopse teste',
      backCoverBulletPoints: ['Ponto 1', 'Ponto 2']
    };

    it('calcula a lombada (spine width) e dimensões totais com sangria de 0.125"', () => {
      const pageCount = 100;
      const specs = PuzzleCoverBuilder.calculateCoverSpecs(baseConfig, pageCount);

      // Papel branco: 100 * 0.002252 = 0.2252 polegadas
      expect(specs.spineWidth).toBeCloseTo(0.2252, 4);
      expect(specs.bleed).toBe(0.125);
      expect(specs.trimWidth).toBe(8.5);
      expect(specs.trimHeight).toBe(11.0);

      // Largura Total: 0.125 + 8.5 + 0.2252 + 8.5 + 0.125 = 17.4752"
      expect(specs.totalWidth).toBeCloseTo(17.4752, 3);

      // Altura Total: 0.125 + 11.0 + 0.125 = 11.25"
      expect(specs.totalHeight).toBe(11.25);

      // Se >= 79 páginas, tem texto na lombada
      expect(specs.hasSpineText).toBe(true);

      // Área do código de barras deve ser 2" x 1.2"
      expect(specs.barcodeArea.width).toBe(2.0);
      expect(specs.barcodeArea.height).toBe(1.2);
    });

    it('calcula lombada para papel creme usando fator 0.0025"', () => {
      const creamConfig = { ...baseConfig, paperColor: 'cream' as const };
      const specs = PuzzleCoverBuilder.calculateCoverSpecs(creamConfig, 100);
      expect(specs.spineWidth).toBeCloseTo(0.25, 4);
    });
  });

  describe('PuzzleInteriorPdfBuilder (Estimativa e Gutter KDP)', () => {
    it('garante no mínimo 24 páginas e número par para conformidade KDP', () => {
      const miniConfig: PuzzleBookConfig = {
        title: 'Mini Livro',
        subtitle: '',
        author: 'Autor',
        trimSize: '8.5x11',
        paperColor: 'white',
        sudokuFacilCount: 2,
        sudokuMedioCount: 0,
        sudokuDificilCount: 0,
        sudokuExtremoCount: 0,
        wordSearchCount: 0,
        wordSearchThemes: [],
        wordSearchGridSize: 15,
        mazeCount: 0,
        mazeDifficulty: 'facil',
        puzzlesPerPage: 2,
        solutionsPerPage: 6,
        coverPrimaryColor: '#000',
        coverSecondaryColor: '#111',
        coverAccentColor: '#222',
        coverTextColor: '#fff',
        coverStyleTheme: 'modern-bold',
        coverBadgeText: '',
        backCoverSynopsis: '',
        backCoverBulletPoints: []
      };

      const estimated = PuzzleInteriorPdfBuilder.estimateTotalPages(miniConfig);
      expect(estimated).toBeGreaterThanOrEqual(24);
      expect(estimated % 2).toBe(0);
    });

    it('calcula o gutter dinamicamente baseado no total de páginas', () => {
      // <= 150 páginas: 0.375" (27 pt)
      expect(PuzzleInteriorPdfBuilder.calculateGutterPoints(100)).toBeCloseTo(27, 1);
      // 151 a 300 páginas: 0.500" (36 pt)
      expect(PuzzleInteriorPdfBuilder.calculateGutterPoints(200)).toBeCloseTo(36, 1);
      // > 300 páginas: 0.625" (45 pt)
      expect(PuzzleInteriorPdfBuilder.calculateGutterPoints(350)).toBeCloseTo(45, 1);
    });
  });
});
