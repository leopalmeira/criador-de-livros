import { SudokuDifficulty, SudokuPuzzleItem } from './types';

export class SudokuEngine {
  /**
   * Verifica se é válido colocar `num` na posição (row, col)
   */
  public static isValid(board: number[][], row: number, col: number, num: number): boolean {
    // Linha e Coluna
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num && i !== col) return false;
      if (board[i][col] === num && i !== row) return false;
    }

    // Bloco 3x3
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const currR = startRow + r;
        const currC = startCol + c;
        if (board[currR][currC] === num && (currR !== row || currC !== col)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Gera uma grade 9x9 completa e válida usando backtracking aleatório
   */
  public static generateCompleteBoard(): number[][] {
    const board: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));

    const fillCell = (row: number, col: number): boolean => {
      if (row === 9) return true; // Concluído com sucesso
      const nextRow = col === 8 ? row + 1 : row;
      const nextCol = col === 8 ? 0 : col + 1;

      // Embaralha números de 1 a 9
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);

      for (const num of nums) {
        if (this.isValid(board, row, col, num)) {
          board[row][col] = num;
          if (fillCell(nextRow, nextCol)) return true;
          board[row][col] = 0;
        }
      }

      return false;
    };

    fillCell(0, 0);
    return board;
  }

  /**
   * Conta o número de soluções de um tabuleiro (para com count=2 para otimizar desempenho)
   */
  public static countSolutions(board: number[][], limit = 2): number {
    let count = 0;

    const solve = (row: number, col: number): void => {
      if (count >= limit) return;

      if (row === 9) {
        count++;
        return;
      }

      const nextRow = col === 8 ? row + 1 : row;
      const nextCol = col === 8 ? 0 : col + 1;

      if (board[row][col] !== 0) {
        solve(nextRow, nextCol);
      } else {
        for (let num = 1; num <= 9; num++) {
          if (this.isValid(board, row, col, num)) {
            board[row][col] = num;
            solve(nextRow, nextCol);
            board[row][col] = 0;
            if (count >= limit) return;
          }
        }
      }
    };

    // Clona para não modificar o original durante a checagem
    const clone = board.map(r => [...r]);
    solve(0, 0);
    return count;
  }

  /**
   * Define o número alvo de pistas por dificuldade
   */
  private static getTargetClues(difficulty: SudokuDifficulty): number {
    switch (difficulty) {
      case 'facil':
        // 36 a 40 números revelados
        return Math.floor(Math.random() * (40 - 36 + 1)) + 36;
      case 'medio':
        // 30 a 35 números revelados
        return Math.floor(Math.random() * (35 - 30 + 1)) + 30;
      case 'dificil':
        // 26 a 29 números revelados
        return Math.floor(Math.random() * (29 - 26 + 1)) + 26;
      case 'extremo':
        // 22 a 25 números revelados
        return Math.floor(Math.random() * (25 - 22 + 1)) + 22;
      default:
        return 32;
    }
  }

  /**
   * Gera um Sudoku com solução única e nível de dificuldade calibrado
   */
  public static generatePuzzle(number: number, difficulty: SudokuDifficulty): SudokuPuzzleItem {
    const solution = this.generateCompleteBoard();
    const puzzle = solution.map(r => [...r]);
    const targetClues = this.getTargetClues(difficulty);

    // Lista todas as 81 posições e embaralha
    const positions: Array<[number, number]> = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        positions.push([r, c]);
      }
    }
    positions.sort(() => Math.random() - 0.5);

    let currentClues = 81;

    for (const [r, c] of positions) {
      if (currentClues <= targetClues) break;

      const backup = puzzle[r][c];
      puzzle[r][c] = 0;

      // Verifica se a solução continua estritamente única
      if (this.countSolutions(puzzle, 2) === 1) {
        currentClues--;
      } else {
        // Se houver mais de uma solução, restaura o número
        puzzle[r][c] = backup;
      }
    }

    return {
      id: `sudoku_${difficulty}_${number}_${Date.now()}`,
      number,
      type: 'sudoku',
      difficulty,
      grid: puzzle,
      solution,
      cluesCount: currentClues
    };
  }
}
