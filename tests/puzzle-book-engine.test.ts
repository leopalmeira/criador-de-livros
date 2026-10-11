import { describe, expect, it } from 'vitest';
import { SudokuEngine } from '../src/modules/puzzles/sudoku-engine';
import { WordSearchEngine, PRESET_WORD_THEMES, WORD_THEMES_BY_LANG } from '../src/modules/puzzles/wordsearch-engine';
import { MazeEngine } from '../src/modules/puzzles/maze-engine';
import { PuzzleCoverBuilder } from '../src/modules/puzzles/puzzle-cover-builder';
import { PuzzleInteriorPdfBuilder } from '../src/modules/puzzles/puzzle-interior-pdf-builder';
import { PuzzleCoverAiService } from '../src/modules/puzzles/puzzle-cover-ai-service';
import { PuzzleBookConfig } from '../src/modules/puzzles/types';

describe('Puzzle & Sudoku Book Engine Pro', () => {
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

  describe('WordSearchEngine (Trilíngue: PT, EN, ES)', () => {
    it('normaliza e remove acentos das palavras', () => {
      expect(WordSearchEngine.cleanWord('Maçã & Açaí!')).toBe('MACAACAI');
      expect(WordSearchEngine.cleanWord('Árvore-Grande')).toBe('ARVOREGRANDE');
    });

    it('fornece temas nativos em Português, Inglês e Espanhol', () => {
      const ptThemes = WordSearchEngine.getThemesForLanguage('pt');
      const enThemes = WordSearchEngine.getThemesForLanguage('en');
      const esThemes = WordSearchEngine.getThemesForLanguage('es');

      expect(ptThemes.length).toBeGreaterThanOrEqual(8);
      expect(enThemes.length).toBeGreaterThanOrEqual(8);
      expect(esThemes.length).toBeGreaterThanOrEqual(8);

      expect(ptThemes.some(t => t.themeName.includes('Animais'))).toBe(true);
      expect(enThemes.some(t => t.themeName.includes('Animals'))).toBe(true);
      expect(esThemes.some(t => t.themeName.includes('Animales'))).toBe(true);
    });

    it('gera grade adaptada e posiciona palavras no Caça-Palavras', () => {
      const theme = PRESET_WORD_THEMES[0];
      const puzzle = WordSearchEngine.generatePuzzle(1, theme.themeName, theme.words, 15);

      expect(puzzle.number).toBe(1);
      expect(puzzle.type).toBe('wordsearch');
      expect(puzzle.gridSize).toBe(15);
      expect(puzzle.grid).toHaveLength(15);
      expect(puzzle.grid[0]).toHaveLength(15);

      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          expect(puzzle.grid[r][c]).toMatch(/^[A-Z]$/);
        }
      }

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

      expect(maze.grid[0][0].top).toBe(false);
      expect(maze.grid[maze.height - 1][maze.width - 1].bottom).toBe(false);

      expect(maze.solutionPath.length).toBeGreaterThan(1);
      expect(maze.solutionPath[0]).toEqual({ row: 0, col: 0 });
      expect(maze.solutionPath[maze.solutionPath.length - 1]).toEqual({
        row: maze.height - 1,
        col: maze.width - 1
      });
    });
  });

  describe('PuzzleCoverBuilder (Cálculo KDP da Capa Aberta & Bestseller)', () => {
    const baseConfig: PuzzleBookConfig = {
      title: 'NEW WORD SEARCH & PUZZLE BOOK',
      subtitle: 'Large Print Puzzles for Adults and Seniors',
      author: 'Author Name',
      language: 'en',
      trimSize: '8.5x11',
      paperColor: 'white',
      sudokuFacilCount: 10,
      sudokuMedioCount: 10,
      sudokuDificilCount: 10,
      sudokuExtremoCount: 5,
      wordSearchCount: 10,
      wordSearchThemes: ['Wild Animals'],
      wordSearchGridSize: 15,
      mazeCount: 10,
      mazeDifficulty: 'medio',
      puzzlesPerPage: 2,
      solutionsPerPage: 6,
      coverPrimaryColor: '#7f1d1d',
      coverSecondaryColor: '#991b1b',
      coverAccentColor: '#fbbf24',
      coverTextColor: '#ffffff',
      coverStyleTheme: 'modern-bold',
      coverBadgeText: 'KDP PRINT-READY',
      backCoverSynopsis: 'Great synopsis',
      backCoverBulletPoints: ['Feature 1', 'Feature 2']
    };

    it('calcula a lombada (spine width) e dimensões totais com sangria de 0.125"', () => {
      const pageCount = 100;
      const specs = PuzzleCoverBuilder.calculateCoverSpecs(baseConfig, pageCount);

      expect(specs.spineWidth).toBeCloseTo(0.2252, 4);
      expect(specs.bleed).toBe(0.125);
      expect(specs.trimWidth).toBe(8.5);
      expect(specs.trimHeight).toBe(11.0);

      // Largura Total: 0.125 + 8.5 + 0.2252 + 8.5 + 0.125 = 17.4752"
      expect(specs.totalWidth).toBeCloseTo(17.4752, 3);
      expect(specs.totalHeight).toBe(11.25);
      expect(specs.hasSpineText).toBe(true);

      expect(specs.barcodeArea.width).toBe(2.0);
      expect(specs.barcodeArea.height).toBe(1.2);
    });

    it('calcula lombada para papel creme usando fator 0.0025"', () => {
      const creamConfig = { ...baseConfig, paperColor: 'cream' as const };
      const specs = PuzzleCoverBuilder.calculateCoverSpecs(creamConfig, 100);
      expect(specs.spineWidth).toBeCloseTo(0.25, 4);
    });

    it('gera prompt refinado para a IA Replicate sem artefatos ou tipografia distorcida', () => {
      const prompt = PuzzleCoverAiService.buildReplicatePrompt(baseConfig);
      expect(prompt).toContain('Commercial Amazon KDP bestseller cover illustration');
      expect(prompt).toContain('open paperback activity book');
      expect(prompt).toContain('sharpened wooden graphite pencils');
      expect(prompt).toContain('without any typography');
    });
  });

  describe('PuzzleInteriorPdfBuilder (Estimativa e Gutter KDP)', () => {
    it('garante no mínimo 24 páginas e número par para conformidade KDP', () => {
      const miniConfig: PuzzleBookConfig = {
        title: 'Mini Livro',
        subtitle: '',
        author: 'Autor',
        language: 'pt',
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
      expect(PuzzleInteriorPdfBuilder.calculateGutterPoints(100)).toBeCloseTo(27, 1);
      expect(PuzzleInteriorPdfBuilder.calculateGutterPoints(200)).toBeCloseTo(36, 1);
      expect(PuzzleInteriorPdfBuilder.calculateGutterPoints(350)).toBeCloseTo(45, 1);
    });
  });
});
