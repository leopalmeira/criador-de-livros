import jsPDF from 'jspdf';
import {
  PuzzleBookConfig,
  GeneratedPuzzleItem,
  SudokuPuzzleItem,
  WordSearchPuzzleItem,
  MazePuzzleItem,
  TRIM_DIMENSIONS
} from './types';

export class PuzzleInteriorPdfBuilder {
  /**
   * Calcula o gutter KDP (em pontos) com base no total de páginas
   */
  public static calculateGutterPoints(pageCount: number): number {
    if (pageCount <= 150) {
      return 0.375 * 72; // 27 pt
    } else if (pageCount <= 300) {
      return 0.500 * 72; // 36 pt
    } else {
      return 0.625 * 72; // 45 pt
    }
  }

  /**
   * Estima o total de páginas com base na configuração
   */
  public static estimateTotalPages(config: PuzzleBookConfig): number {
    const totalPuzzles =
      config.sudokuFacilCount +
      config.sudokuMedioCount +
      config.sudokuDificilCount +
      config.sudokuExtremoCount +
      config.wordSearchCount +
      config.mazeCount;

    if (totalPuzzles === 0) return 24;

    const puzzlePages = Math.ceil(totalPuzzles / config.puzzlesPerPage);
    const solutionPages = Math.ceil(totalPuzzles / config.solutionsPerPage);

    // 1 (título/pertence a) + 1 (regras/copyright) + puzzlePages + 1 (divisória soluções) + solutionPages
    let total = 2 + puzzlePages + 1 + solutionPages;

    // KDP exige páginas pares e no mínimo 24
    if (total % 2 !== 0) total += 1;
    if (total < 24) total = 24;

    return total;
  }

  /**
   * Constrói o PDF do miolo completo pronto para impressão Amazon KDP
   */
  public static async buildInteriorPdf(
    config: PuzzleBookConfig,
    puzzles: GeneratedPuzzleItem[],
    onProgress?: (percent: number, status: string) => void
  ): Promise<{ doc: jsPDF; pageCount: number; blob: Blob }> {
    const trim = TRIM_DIMENSIONS[config.trimSize];
    const widthPt = trim.widthPoints;
    const heightPt = trim.heightPoints;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [widthPt, heightPt]
    });

    onProgress?.(5, 'Iniciando diagramação vetorial KDP...');

    // Cálculos preliminares de páginas para referência cruzada
    const totalPuzzles = puzzles.length;
    const puzzlePagesCount = Math.ceil(totalPuzzles / config.puzzlesPerPage);
    const dividerPageIndex = 2 + puzzlePagesCount + 1; // Página da divisória
    const solutionsStartPage = dividerPageIndex + 1;

    // Mapa de número do puzzle -> página da solução
    const solutionPageMap = new Map<number, number>();
    for (let i = 0; i < totalPuzzles; i++) {
      const pNum = puzzles[i].number;
      const solPageOffset = Math.floor(i / config.solutionsPerPage);
      solutionPageMap.set(pNum, solutionsStartPage + solPageOffset);
    }

    const estimatedPages = this.estimateTotalPages(config);
    const gutterPt = this.calculateGutterPoints(estimatedPages);
    const outerMarginPt = 0.375 * 72; // 27 pt
    const topMarginPt = 0.45 * 72; // margem superior com espaço para cabeçalho
    const bottomMarginPt = 0.45 * 72; // margem inferior com rodapé

    let currentPageNumber = 1;

    // Função utilitária para obter a área útil da página considerando o Gutter KDP
    const getPageContentBounds = (pageIndex: number) => {
      const isOdd = pageIndex % 2 !== 0; // Ímpar = gutter à esquerda; Par = gutter à direita
      const left = isOdd ? gutterPt : outerMarginPt;
      const right = isOdd ? widthPt - outerMarginPt : widthPt - gutterPt;
      const top = topMarginPt;
      const bottom = heightPt - bottomMarginPt;
      return { left, right, top, bottom, width: right - left, height: bottom - top };
    };

    // -------------------------------------------------------------
    // PÁGINA 1: TÍTULO & "ESTE LIVRO PERTENCE A:"
    // -------------------------------------------------------------
    onProgress?.(10, 'Montando folha de rosto...');
    const b1 = getPageContentBounds(1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text(config.title.toUpperCase(), (b1.left + b1.right) / 2, b1.top + 80, { align: 'center', maxWidth: b1.width - 40 });

    if (config.subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.text(config.subtitle, (b1.left + b1.right) / 2, b1.top + 130, { align: 'center', maxWidth: b1.width - 40 });
    }

    // Caixa estilizada "Este livro pertence a:"
    const boxY = b1.top + 240;
    const boxW = Math.min(b1.width - 60, 320);
    const boxX = (b1.left + b1.right) / 2 - boxW / 2;

    doc.setLineWidth(1.5);
    doc.setDrawColor(40, 40, 40);
    doc.rect(boxX, boxY, boxW, 110);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('ESTE LIVRO PERTENCE A:', (b1.left + b1.right) / 2, boxY + 30, { align: 'center' });

    doc.setLineWidth(0.8);
    doc.line(boxX + 25, boxY + 70, boxX + boxW - 25, boxY + 70);

    // Autor no rodapé da folha de rosto
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.text(`Criado por: ${config.author || 'Autor'}`, (b1.left + b1.right) / 2, b1.bottom - 40, { align: 'center' });

    // -------------------------------------------------------------
    // PÁGINA 2: COPYRIGHT & REGRAS / INSTRUÇÕES
    // -------------------------------------------------------------
    currentPageNumber++;
    doc.addPage([widthPt, heightPt]);
    onProgress?.(15, 'Montando regras e direitos autorais...');
    const b2 = getPageContentBounds(2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('COMO JOGAR & REGRAS', (b2.left + b2.right) / 2, b2.top + 40, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let ruleY = b2.top + 80;

    // Sudoku
    doc.setFont('helvetica', 'bold');
    doc.text('• SUDOKU:', b2.left + 20, ruleY);
    ruleY += 15;
    doc.setFont('helvetica', 'normal');
    const sudokuText = 'Preencha as linhas, colunas e blocos 3x3 com os números de 1 a 9 sem repetir nenhum número. Use raciocínio lógico e eliminação para descobrir as posições corretas.';
    doc.text(sudokuText, b2.left + 20, ruleY, { maxWidth: b2.width - 40 });
    ruleY += 45;

    // Caça-Palavras
    doc.setFont('helvetica', 'bold');
    doc.text('• CAÇA-PALAVRAS:', b2.left + 20, ruleY);
    ruleY += 15;
    doc.setFont('helvetica', 'normal');
    const wsText = 'Encontre as palavras listadas na grade de letras. As palavras podem estar posicionadas na horizontal, vertical ou diagonal, em ordem direta ou invertida.';
    doc.text(wsText, b2.left + 20, ruleY, { maxWidth: b2.width - 40 });
    ruleY += 45;

    // Labirintos
    doc.setFont('helvetica', 'bold');
    doc.text('• LABIRINTOS:', b2.left + 20, ruleY);
    ruleY += 15;
    doc.setFont('helvetica', 'normal');
    const mazeText = 'Trace um caminho contínuo desde a ENTRADA indicada no topo até a SAÍDA na base do labirinto, sem atravessar nenhuma parede.';
    doc.text(mazeText, b2.left + 20, ruleY, { maxWidth: b2.width - 40 });
    ruleY += 60;

    // Copyright
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(`© ${new Date().getFullYear()} ${config.author || 'Book Engine'}. Todos os direitos reservados.`, (b2.left + b2.right) / 2, b2.bottom - 40, { align: 'center' });
    doc.text('Formatado e otimizado com conformidade direta para publicação Amazon KDP.', (b2.left + b2.right) / 2, b2.bottom - 25, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // -------------------------------------------------------------
    // PÁGINAS DE PUZZLES (LAYOUTS: 1, 2 OU 4 POR PÁGINA)
    // -------------------------------------------------------------
    let puzzleIdx = 0;
    while (puzzleIdx < puzzles.length) {
      currentPageNumber++;
      doc.addPage([widthPt, heightPt]);

      const percent = Math.min(80, Math.round(20 + (puzzleIdx / puzzles.length) * 50));
      onProgress?.(percent, `Desenhando puzzles (${puzzleIdx + 1}/${puzzles.length})...`);

      const bounds = getPageContentBounds(currentPageNumber);

      // Rodapé com número de página
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${currentPageNumber}`, (bounds.left + bounds.right) / 2, bounds.bottom + 18, { align: 'center' });

      // Desenha os puzzles alocados para esta página
      const perPage = config.puzzlesPerPage;
      const pagePuzzles = puzzles.slice(puzzleIdx, puzzleIdx + perPage);

      this.renderPuzzlesOnPage(doc, pagePuzzles, bounds, perPage, solutionPageMap);

      puzzleIdx += perPage;
    }

    // -------------------------------------------------------------
    // PÁGINA DIVISÓRIA: SOLUÇÕES / RESPOSTAS
    // -------------------------------------------------------------
    currentPageNumber++;
    doc.addPage([widthPt, heightPt]);
    onProgress?.(82, 'Criando página divisória de gabaritos...');
    const bDiv = getPageContentBounds(currentPageNumber);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.text('SOLUÇÕES', (bDiv.left + bDiv.right) / 2, bDiv.top + bDiv.height / 2 - 20, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text('Gabarito completo de todos os passatempos', (bDiv.left + bDiv.right) / 2, bDiv.top + bDiv.height / 2 + 15, { align: 'center' });

    doc.setLineWidth(2);
    doc.line((bDiv.left + bDiv.right) / 2 - 80, bDiv.top + bDiv.height / 2 + 35, (bDiv.left + bDiv.right) / 2 + 80, bDiv.top + bDiv.height / 2 + 35);

    // -------------------------------------------------------------
    // PÁGINAS DE SOLUÇÕES (LAYOUTS: 4, 6, 9 OU 12 POR PÁGINA)
    // -------------------------------------------------------------
    let solIdx = 0;
    while (solIdx < puzzles.length) {
      currentPageNumber++;
      doc.addPage([widthPt, heightPt]);

      const percent = Math.min(95, Math.round(85 + (solIdx / puzzles.length) * 10));
      onProgress?.(percent, `Renderizando gabaritos (${solIdx + 1}/${puzzles.length})...`);

      const bounds = getPageContentBounds(currentPageNumber);

      // Cabeçalho da página de soluções
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('GABARITO DE SOLUÇÕES', (bounds.left + bounds.right) / 2, bounds.top - 10, { align: 'center' });

      // Rodapé com número de página
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${currentPageNumber}`, (bounds.left + bounds.right) / 2, bounds.bottom + 18, { align: 'center' });

      const solPerPage = config.solutionsPerPage;
      const pageSolutions = puzzles.slice(solIdx, solIdx + solPerPage);

      this.renderSolutionsOnPage(doc, pageSolutions, bounds, solPerPage);

      solIdx += solPerPage;
    }

    // -------------------------------------------------------------
    // GARANTIR CONFORMIDADE KDP: MÍNIMO 24 PÁGINAS E NÚMERO PAR
    // -------------------------------------------------------------
    while (currentPageNumber < 24 || currentPageNumber % 2 !== 0) {
      currentPageNumber++;
      doc.addPage([widthPt, heightPt]);
      const bNotes = getPageContentBounds(currentPageNumber);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('ANOTAÇÕES & RASCUNHOS', (bNotes.left + bNotes.right) / 2, bNotes.top + 40, { align: 'center' });

      // Linhas pautadas para anotações do jogador
      doc.setLineWidth(0.5);
      doc.setDrawColor(180, 180, 180);
      let lineY = bNotes.top + 80;
      while (lineY < bNotes.bottom - 40) {
        doc.line(bNotes.left + 20, lineY, bNotes.right - 20, lineY);
        lineY += 25;
      }
      doc.setDrawColor(0, 0, 0);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${currentPageNumber}`, (bNotes.left + bNotes.right) / 2, bNotes.bottom + 18, { align: 'center' });
    }

    onProgress?.(100, 'Miolo compilado com sucesso!');

    const blob = doc.output('blob');
    return { doc, pageCount: currentPageNumber, blob };
  }

  /**
   * Renderiza os puzzles na página conforme o layout (1, 2 ou 4 por página)
   */
  private static renderPuzzlesOnPage(
    doc: jsPDF,
    items: GeneratedPuzzleItem[],
    bounds: { left: number; right: number; top: number; bottom: number; width: number; height: number },
    perPage: 1 | 2 | 4,
    solutionMap: Map<number, number>
  ): void {
    if (perPage === 1 && items[0]) {
      this.drawSinglePuzzle(doc, items[0], bounds.left, bounds.top, bounds.width, bounds.height, solutionMap);
    } else if (perPage === 2) {
      const halfH = bounds.height / 2;
      if (items[0]) {
        this.drawSinglePuzzle(doc, items[0], bounds.left, bounds.top, bounds.width, halfH - 15, solutionMap);
      }
      if (items[1]) {
        this.drawSinglePuzzle(doc, items[1], bounds.left, bounds.top + halfH + 15, bounds.width, halfH - 15, solutionMap);
      }
    } else if (perPage === 4) {
      const halfW = bounds.width / 2;
      const halfH = bounds.height / 2;
      const slots = [
        { x: bounds.left, y: bounds.top },
        { x: bounds.left + halfW + 10, y: bounds.top },
        { x: bounds.left, y: bounds.top + halfH + 10 },
        { x: bounds.left + halfW + 10, y: bounds.top + halfH + 10 }
      ];
      items.forEach((item, idx) => {
        if (slots[idx]) {
          this.drawSinglePuzzle(doc, item, slots[idx].x, slots[idx].y, halfW - 10, halfH - 10, solutionMap);
        }
      });
    }
  }

  /**
   * Desenha um puzzle individual com seu cabeçalho
   */
  private static drawSinglePuzzle(
    doc: jsPDF,
    puzzle: GeneratedPuzzleItem,
    x: number,
    y: number,
    w: number,
    h: number,
    solutionMap: Map<number, number>
  ): void {
    const solPage = solutionMap.get(puzzle.number);

    // Cabeçalho do Puzzle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    let titleStr = `Puzzle #${puzzle.number}`;
    if (puzzle.type === 'sudoku') {
      titleStr += ` - Sudoku (${puzzle.difficulty.toUpperCase()})`;
    } else if (puzzle.type === 'wordsearch') {
      titleStr += ` - Caça-Palavras: ${puzzle.theme}`;
    } else if (puzzle.type === 'maze') {
      titleStr += ` - Labirinto (${puzzle.difficulty.toUpperCase()})`;
    }

    doc.text(titleStr, x + w / 2, y + 16, { align: 'center', maxWidth: w - 20 });

    if (solPage) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`(Solução na página ${solPage})`, x + w / 2, y + 28, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }

    const contentTop = y + 36;
    const contentH = h - 42;

    if (puzzle.type === 'sudoku') {
      this.drawSudokuBoard(doc, puzzle.grid, x, contentTop, w, contentH);
    } else if (puzzle.type === 'wordsearch') {
      this.drawWordSearchBoard(doc, puzzle, x, contentTop, w, contentH);
    } else if (puzzle.type === 'maze') {
      this.drawMazeBoard(doc, puzzle, x, contentTop, w, contentH, false);
    }
  }

  /**
   * Desenha tabuleiro de Sudoku de forma vetorial
   */
  private static drawSudokuBoard(
    doc: jsPDF,
    grid: number[][],
    x: number,
    y: number,
    maxW: number,
    maxH: number
  ): void {
    const boardSize = Math.min(maxW - 20, maxH - 20, 360);
    const startX = x + (maxW - boardSize) / 2;
    const startY = y + (maxH - boardSize) / 2;
    const cellSize = boardSize / 9;

    // Fundo limpo
    doc.setFillColor(255, 255, 255);
    doc.rect(startX, startY, boardSize, boardSize, 'F');

    // Linhas finas internas
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.4);
    for (let i = 1; i < 9; i++) {
      if (i % 3 !== 0) {
        doc.line(startX + i * cellSize, startY, startX + i * cellSize, startY + boardSize);
        doc.line(startX, startY + i * cellSize, startX + boardSize, startY + i * cellSize);
      }
    }

    // Linhas grossas das caixas 3x3 e borda externa
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.6);
    doc.rect(startX, startY, boardSize, boardSize);

    for (let i = 3; i < 9; i += 3) {
      doc.line(startX + i * cellSize, startY, startX + i * cellSize, startY + boardSize);
      doc.line(startX, startY + i * cellSize, startX + boardSize, startY + i * cellSize);
    }

    // Números das pistas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(9, Math.floor(cellSize * 0.65)));

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = grid[r][c];
        if (val !== 0) {
          const textX = startX + c * cellSize + cellSize / 2;
          const textY = startY + r * cellSize + cellSize / 2 + cellSize * 0.22;
          doc.text(`${val}`, textX, textY, { align: 'center' });
        }
      }
    }
  }

  /**
   * Desenha tabuleiro de Caça-Palavras com lista de palavras embaixo
   */
  private static drawWordSearchBoard(
    doc: jsPDF,
    puzzle: WordSearchPuzzleItem,
    x: number,
    y: number,
    maxW: number,
    maxH: number
  ): void {
    const listH = Math.min(80, maxH * 0.28);
    const gridMaxH = maxH - listH - 10;
    const boardSize = Math.min(maxW - 10, gridMaxH, 320);
    const startX = x + (maxW - boardSize) / 2;
    const startY = y + 5;
    const cellSize = boardSize / puzzle.gridSize;

    // Borda da grade
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(1);
    doc.rect(startX, startY, boardSize, boardSize);

    // Letras da grade
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(Math.max(7.5, Math.floor(cellSize * 0.72)));

    for (let r = 0; r < puzzle.gridSize; r++) {
      for (let c = 0; c < puzzle.gridSize; c++) {
        const char = puzzle.grid[r][c];
        const textX = startX + c * cellSize + cellSize / 2;
        const textY = startY + r * cellSize + cellSize / 2 + cellSize * 0.24;
        doc.text(char, textX, textY, { align: 'center' });
      }
    }

    // Lista de palavras abaixo da grade
    const listTop = startY + boardSize + 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PALAVRAS A ENCONTRAR:', x + maxW / 2, listTop, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const cols = maxW > 350 ? 4 : 3;
    const colW = (maxW - 20) / cols;
    puzzle.words.forEach((w, idx) => {
      const colIdx = idx % cols;
      const rowIdx = Math.floor(idx / cols);
      const wordX = x + 15 + colIdx * colW;
      const wordY = listTop + 12 + rowIdx * 11;
      doc.text(`• ${w}`, wordX, wordY);
    });
  }

  /**
   * Desenha tabuleiro de Labirinto de forma vetorial
   */
  private static drawMazeBoard(
    doc: jsPDF,
    puzzle: MazePuzzleItem,
    x: number,
    y: number,
    maxW: number,
    maxH: number,
    isSolution: boolean
  ): void {
    const mazeSize = Math.min(maxW - 30, maxH - 30, 320);
    const startX = x + (maxW - mazeSize) / 2;
    const startY = y + (maxH - mazeSize) / 2;
    const cellW = mazeSize / puzzle.width;
    const cellH = mazeSize / puzzle.height;

    // Paredes
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.2);

    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        const cell = puzzle.grid[r][c];
        const cx = startX + c * cellW;
        const cy = startY + r * cellH;

        if (cell.top) doc.line(cx, cy, cx + cellW, cy);
        if (cell.right) doc.line(cx + cellW, cy, cx + cellW, cy + cellH);
        if (cell.bottom) doc.line(cx, cy + cellH, cx + cellW, cy + cellH);
        if (cell.left) doc.line(cx, cy, cx, cy + cellH);
      }
    }

    // Indicadores de Início e Fim
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ENTRADA ↓', startX + cellW / 2, startY - 5, { align: 'center' });
    doc.text('SAÍDA ↓', startX + puzzle.width * cellW - cellW / 2, startY + mazeSize + 10, { align: 'center' });

    // Se for o gabarito, traça a linha de solução
    if (isSolution && puzzle.solutionPath.length > 1) {
      doc.setDrawColor(180, 0, 0); // Linha destacada (ou cinza forte para B&W KDP)
      doc.setLineWidth(1.8);
      for (let i = 0; i < puzzle.solutionPath.length - 1; i++) {
        const p1 = puzzle.solutionPath[i];
        const p2 = puzzle.solutionPath[i + 1];
        const x1 = startX + p1.col * cellW + cellW / 2;
        const y1 = startY + p1.row * cellH + cellH / 2;
        const x2 = startX + p2.col * cellW + cellW / 2;
        const y2 = startY + p2.row * cellH + cellH / 2;
        doc.line(x1, y1, x2, y2);
      }
      doc.setDrawColor(0, 0, 0);
    }
  }

  /**
   * Renderiza os gabaritos em grade compacta (4, 6, 9 ou 12 por página)
   */
  private static renderSolutionsOnPage(
    doc: jsPDF,
    items: GeneratedPuzzleItem[],
    bounds: { left: number; right: number; top: number; bottom: number; width: number; height: number },
    solPerPage: 4 | 6 | 9 | 12
  ): void {
    let cols = 2;
    let rows = 2;
    if (solPerPage === 6) { cols = 2; rows = 3; }
    if (solPerPage === 9) { cols = 3; rows = 3; }
    if (solPerPage === 12) { cols = 3; rows = 4; }

    const cellW = bounds.width / cols;
    const cellH = bounds.height / rows;

    items.forEach((item, idx) => {
      const c = idx % cols;
      const r = Math.floor(idx / cols);
      const slotX = bounds.left + c * cellW;
      const slotY = bounds.top + r * cellH;

      // Título compacto
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`Solução #${item.number}`, slotX + cellW / 2, slotY + 12, { align: 'center' });

      const innerTop = slotY + 18;
      const innerH = cellH - 24;

      if (item.type === 'sudoku') {
        this.drawSudokuBoard(doc, item.solution, slotX, innerTop, cellW, innerH);
      } else if (item.type === 'wordsearch') {
        this.drawWordSearchSolutionBoard(doc, item, slotX, innerTop, cellW, innerH);
      } else if (item.type === 'maze') {
        this.drawMazeBoard(doc, item, slotX, innerTop, cellW, innerH, true);
      }
    });
  }

  /**
   * Desenha o gabarito do Caça-Palavras com destaque nas letras certas
   */
  private static drawWordSearchSolutionBoard(
    doc: jsPDF,
    puzzle: WordSearchPuzzleItem,
    x: number,
    y: number,
    maxW: number,
    maxH: number
  ): void {
    const boardSize = Math.min(maxW - 10, maxH - 10, 140);
    const startX = x + (maxW - boardSize) / 2;
    const startY = y + (maxH - boardSize) / 2;
    const cellSize = boardSize / puzzle.gridSize;

    // Conjunto de coordenadas pertencentes a palavras
    const wordCoords = new Set<string>();
    puzzle.placements.forEach(p => {
      const dRow = p.endRow === p.startRow ? 0 : (p.endRow > p.startRow ? 1 : -1);
      const dCol = p.endCol === p.startCol ? 0 : (p.endCol > p.startCol ? 1 : -1);
      for (let i = 0; i < p.word.length; i++) {
        wordCoords.add(`${p.startRow + dRow * i},${p.startCol + dCol * i}`);
      }
    });

    doc.rect(startX, startY, boardSize, boardSize);
    doc.setFontSize(Math.max(5.5, Math.floor(cellSize * 0.7)));

    for (let r = 0; r < puzzle.gridSize; r++) {
      for (let c = 0; c < puzzle.gridSize; c++) {
        const isTarget = wordCoords.has(`${r},${c}`);
        const char = puzzle.grid[r][c];
        const textX = startX + c * cellSize + cellSize / 2;
        const textY = startY + r * cellSize + cellSize / 2 + cellSize * 0.22;

        if (isTarget) {
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(220, 220, 220);
          doc.rect(startX + c * cellSize + 0.5, startY + r * cellSize + 0.5, cellSize - 1, cellSize - 1, 'F');
          doc.text(char, textX, textY, { align: 'center' });
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(150, 150, 150);
          doc.text(char, textX, textY, { align: 'center' });
          doc.setTextColor(0, 0, 0);
        }
      }
    }
  }
}
