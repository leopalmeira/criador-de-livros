// Motor Matemático de Geração e Validação de Sudoku 9x9 com Solução Única Garantida
// Calibrado para livros impressos Amazon KDP

export class SudokuEngine {
  /**
   * Verifica se um número pode ser colocado na posição (row, col)
   */
  public static isValidMove(grid: number[][], row: number, col: number, num: number): boolean {
    // Checa linha
    for (let c = 0; c < 9; c++) {
      if (grid[row][c] === num) return false;
    }

    // Checa coluna
    for (let r = 0; r < 9; r++) {
      if (grid[r][col] === num) return false;
    }

    // Checa quadrante 3x3
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[startRow + r][startCol + c] === num) return false;
      }
    }

    return true;
  }

  /**
   * Resolve o Sudoku utilizando backtracking e preenche a matriz
   */
  public static solve(grid: number[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of numbers) {
            if (this.isValidMove(grid, row, col, num)) {
              grid[row][col] = num;
              if (this.solve(grid)) return true;
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Retorna uma cópia resolvida do tabuleiro ou null se insolúvel
   */
  public static solveGrid(grid: number[][]): number[][] | null {
    const copy = grid.map(r => [...r]);
    const solved = this.solve(copy);
    return solved ? copy : null;
  }

  /**
   * Conta a quantidade de soluções possíveis para garantir unicidade
   */
  public static countSolutions(
    grid: number[][], 
    countOrLimit: { value: number } | number = { value: 0 }, 
    maxCount = 2
  ): number {
    const count = typeof countOrLimit === 'object' ? countOrLimit : { value: 0 };
    const limit = typeof countOrLimit === 'number' ? countOrLimit : maxCount;

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (this.isValidMove(grid, row, col, num)) {
              grid[row][col] = num;
              this.countSolutions(grid, count, limit);
              grid[row][col] = 0;
              if (count.value >= limit) return count.value;
            }
          }
          return count.value;
        }
      }
    }
    count.value++;
    return count.value;
  }

  /**
   * Gera uma grade completa válida (9x9)
   */
  public static generateCompletedGrid(): number[][] {
    const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
    this.solve(grid);
    return grid;
  }

  /**
   * Cria um Sudoku com solução única baseado no nível de dificuldade
   * - Fácil: 42 pistas restantes
   * - Médio: 35 pistas restantes
   * - Difícil: 29 pistas restantes
   * - Expert: 24 pistas restantes
   */
  public static generatePuzzle(difficulty: 'facil' | 'medio' | 'dificil' | 'expert'): {
    puzzle: number[][];
    solution: number[][];
    isUnique: boolean;
  } {
    const solution = this.generateCompletedGrid();
    const puzzle: number[][] = solution.map(row => [...row]);

    let targetClues = 35;
    switch (difficulty) {
      case 'facil':
        targetClues = 42;
        break;
      case 'medio':
        targetClues = 35;
        break;
      case 'dificil':
        targetClues = 29;
        break;
      case 'expert':
        targetClues = 24;
        break;
    }

    const cellsToRemove = 81 - targetClues;
    const positions: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        positions.push([r, c]);
      }
    }
    const shuffledPositions = this.shuffleArray(positions);

    let removed = 0;
    for (const [r, c] of shuffledPositions) {
      if (removed >= cellsToRemove) break;

      const temp = puzzle[r][c];
      puzzle[r][c] = 0;

      // Verifica se a solução continua estritamente única
      const copy = puzzle.map(row => [...row]);
      const solutionCount = this.countSolutions(copy, { value: 0 }, 2);

      if (solutionCount !== 1) {
        // Se perdeu a unicidade, reverte
        puzzle[r][c] = temp;
      } else {
        removed++;
      }
    }

    return {
      puzzle,
      solution,
      isUnique: true
    };
  }

  /**
   * Valida se uma grade fornecida é matematicamente válida
   */
  public static validateSolution(grid: number[][]): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = grid[r][c];
        if (val < 1 || val > 9) return false;
        grid[r][c] = 0;
        const valid = this.isValidMove(grid, r, c, val);
        grid[r][c] = val;
        if (!valid) return false;
      }
    }
    return true;
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
