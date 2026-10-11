import { MazePuzzleItem } from './types';

interface Cell {
  row: number;
  col: number;
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
  visited: boolean;
}

export class MazeEngine {
  /**
   * Gera um labirinto usando DFS (Recursive Backtracking) e calcula o caminho de solução
   */
  public static generatePuzzle(
    number: number,
    difficulty: 'facil' | 'medio' | 'dificil' = 'medio'
  ): MazePuzzleItem {
    let size = 17; // Médio
    if (difficulty === 'facil') size = 13;
    if (difficulty === 'dificil') size = 23;

    const width = size;
    const height = size;

    // Inicializa a grade de células com todas as paredes erguidas
    const grid: Cell[][] = [];
    for (let r = 0; r < height; r++) {
      grid[r] = [];
      for (let c = 0; c < width; c++) {
        grid[r][c] = {
          row: r,
          col: c,
          top: true,
          right: true,
          bottom: true,
          left: true,
          visited: false
        };
      }
    }

    // Algoritmo DFS com pilha
    const stack: Cell[] = [];
    const startCell = grid[0][0];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors: Array<{ cell: Cell; dir: 'top' | 'right' | 'bottom' | 'left' }> = [];

      // Vizinho Norte
      if (current.row > 0 && !grid[current.row - 1][current.col].visited) {
        neighbors.push({ cell: grid[current.row - 1][current.col], dir: 'top' });
      }
      // Vizinho Leste
      if (current.col < width - 1 && !grid[current.row][current.col + 1].visited) {
        neighbors.push({ cell: grid[current.row][current.col + 1], dir: 'right' });
      }
      // Vizinho Sul
      if (current.row < height - 1 && !grid[current.row + 1][current.col].visited) {
        neighbors.push({ cell: grid[current.row + 1][current.col], dir: 'bottom' });
      }
      // Vizinho Oeste
      if (current.col > 0 && !grid[current.row][current.col - 1].visited) {
        neighbors.push({ cell: grid[current.row][current.col - 1], dir: 'left' });
      }

      if (neighbors.length > 0) {
        // Escolhe vizinho aleatório
        const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];

        // Remove parede entre current e chosen.cell
        if (chosen.dir === 'top') {
          current.top = false;
          chosen.cell.bottom = false;
        } else if (chosen.dir === 'right') {
          current.right = false;
          chosen.cell.left = false;
        } else if (chosen.dir === 'bottom') {
          current.bottom = false;
          chosen.cell.top = false;
        } else if (chosen.dir === 'left') {
          current.left = false;
          chosen.cell.right = false;
        }

        chosen.cell.visited = true;
        stack.push(chosen.cell);
      } else {
        stack.pop();
      }
    }

    // Abertura na entrada (topo) e na saída (fundo)
    grid[0][0].top = false;
    grid[height - 1][width - 1].bottom = false;

    // Calcula o caminho de solução (BFS de [0,0] para [height-1, width-1])
    const solutionPath = this.solveMaze(grid, width, height);

    // Converte para estrutura limpa (sem propriedade visited)
    const exportGrid = grid.map(row =>
      row.map(c => ({
        row: c.row,
        col: c.col,
        top: c.top,
        right: c.right,
        bottom: c.bottom,
        left: c.left
      }))
    );

    return {
      id: `maze_${difficulty}_${number}_${Date.now()}`,
      number,
      type: 'maze',
      difficulty,
      width,
      height,
      grid: exportGrid,
      start: { row: 0, col: 0 },
      end: { row: height - 1, col: width - 1 },
      solutionPath
    };
  }

  /**
   * Resolve o labirinto encontrando as coordenadas do caminho do início ao fim
   */
  private static solveMaze(
    grid: Cell[][],
    width: number,
    height: number
  ): Array<{ row: number; col: number }> {
    const queue: Array<{ row: number; col: number; path: Array<{ row: number; col: number }> }> = [
      { row: 0, col: 0, path: [{ row: 0, col: 0 }] }
    ];

    const visitedSet = new Set<string>();
    visitedSet.add('0,0');

    while (queue.length > 0) {
      const current = queue.shift()!;
      const { row, col, path } = current;

      if (row === height - 1 && col === width - 1) {
        return path;
      }

      const cell = grid[row][col];

      // Tenta mover Norte
      if (!cell.top && row > 0 && !visitedSet.has(`${row - 1},${col}`)) {
        visitedSet.add(`${row - 1},${col}`);
        queue.push({ row: row - 1, col, path: [...path, { row: row - 1, col }] });
      }
      // Tenta mover Leste
      if (!cell.right && col < width - 1 && !visitedSet.has(`${row},${col + 1}`)) {
        visitedSet.add(`${row},${col + 1}`);
        queue.push({ row, col: col + 1, path: [...path, { row, col: col + 1 }] });
      }
      // Tenta mover Sul
      if (!cell.bottom && row < height - 1 && !visitedSet.has(`${row + 1},${col}`)) {
        visitedSet.add(`${row + 1},${col}`);
        queue.push({ row: row + 1, col, path: [...path, { row: row + 1, col }] });
      }
      // Tenta mover Oeste
      if (!cell.left && col > 0 && !visitedSet.has(`${row},${col - 1}`)) {
        visitedSet.add(`${row},${col - 1}`);
        queue.push({ row, col: col - 1, path: [...path, { row, col: col - 1 }] });
      }
    }

    return [{ row: 0, col: 0 }, { row: height - 1, col: width - 1 }];
  }
}
