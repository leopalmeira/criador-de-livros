import jsPDF from 'jspdf';
import {
  PuzzleBookConfig,
  GeneratedPuzzleItem,
  SudokuPuzzleItem,
  WordSearchPuzzleItem,
  MazePuzzleItem,
  TRIM_DIMENSIONS,
  PuzzleLanguage
} from './types';

export const I18N_INTERIOR: Record<PuzzleLanguage, {
  belongsTo: string;
  createdBy: string;
  howToPlay: string;
  sudokuTitle: string;
  sudokuRules: string;
  wsTitle: string;
  wsRules: string;
  mazeTitle: string;
  mazeRules: string;
  copyrightAllRights: string;
  kdpOptimized: string;
  solutionsTitle: string;
  solutionsSubtitle: string;
  solutionsHeader: string;
  solutionNumber: string;
  solutionOnPage: string;
  wordsToFind: string;
  entry: string;
  exit: string;
  notesTitle: string;
  puzzleWord: string;
  diff: { facil: string; medio: string; dificil: string; extremo: string };
}> = {
  pt: {
    belongsTo: 'ESTE LIVRO PERTENCE A:',
    createdBy: 'Criado por:',
    howToPlay: 'COMO JOGAR & REGRAS',
    sudokuTitle: '• SUDOKU:',
    sudokuRules: 'Preencha as linhas, colunas e blocos 3x3 com os números de 1 a 9 sem repetir nenhum número. Use raciocínio lógico e eliminação para descobrir as posições corretas.',
    wsTitle: '• CAÇA-PALAVRAS:',
    wsRules: 'Encontre as palavras listadas na grade de letras. As palavras podem estar posicionadas na horizontal, vertical ou diagonal, em ordem direta ou invertida.',
    mazeTitle: '• LABIRINTOS:',
    mazeRules: 'Trace um caminho contínuo desde a ENTRADA indicada no topo até a SAÍDA na base do labirinto, sem atravessar nenhuma parede.',
    copyrightAllRights: 'Todos os direitos reservados.',
    kdpOptimized: 'Formatado e otimizado com conformidade direta para publicação Amazon KDP.',
    solutionsTitle: 'SOLUÇÕES',
    solutionsSubtitle: 'Gabarito completo de todos os passatempos',
    solutionsHeader: 'GABARITO DE SOLUÇÕES',
    solutionNumber: 'Solução #{num}',
    solutionOnPage: '(Solução na página {page})',
    wordsToFind: 'PALAVRAS A ENCONTRAR:',
    entry: 'ENTRADA ↓',
    exit: 'SAÍDA ↓',
    notesTitle: 'ANOTAÇÕES & RASCUNHOS',
    puzzleWord: 'Puzzle',
    diff: { facil: 'FÁCIL', medio: 'MÉDIO', dificil: 'DIFÍCIL', extremo: 'EXTREMO' }
  },
  en: {
    belongsTo: 'THIS BOOK BELONGS TO:',
    createdBy: 'Created by:',
    howToPlay: 'HOW TO PLAY & INSTRUCTIONS',
    sudokuTitle: '• SUDOKU:',
    sudokuRules: 'Fill every row, column, and 3x3 block with numbers 1 to 9 without repeating any number. Use pure logic and elimination to discover the correct positions.',
    wsTitle: '• WORD SEARCH:',
    wsRules: 'Find the words hidden in the letter grid. Words can be positioned horizontally, vertically, or diagonally, forwards or backwards.',
    mazeTitle: '• MAZES:',
    mazeRules: 'Draw a single continuous line from the START at the top to the FINISH at the bottom of the maze without crossing any walls.',
    copyrightAllRights: 'All rights reserved.',
    kdpOptimized: 'Formatted and verified for direct Amazon KDP print-on-demand publishing.',
    solutionsTitle: 'SOLUTIONS',
    solutionsSubtitle: 'Complete answer key for all puzzle challenges',
    solutionsHeader: 'SOLUTIONS & ANSWER KEY',
    solutionNumber: 'Solution #{num}',
    solutionOnPage: '(Solution on page {page})',
    wordsToFind: 'WORDS TO FIND:',
    entry: 'START ↓',
    exit: 'FINISH ↓',
    notesTitle: 'NOTES & SKETCHES',
    puzzleWord: 'Puzzle',
    diff: { facil: 'EASY', medio: 'MEDIUM', dificil: 'HARD', extremo: 'EXTREME' }
  },
  es: {
    belongsTo: 'ESTE LIBRO PERTENECE A:',
    createdBy: 'Creado por:',
    howToPlay: 'CÓMO JUGAR & REGLAS',
    sudokuTitle: '• SUDOKU:',
    sudokuRules: 'Completa cada fila, columna y cuadrícula de 3x3 con los números del 1 al 9 sin repetir ninguno. Usa la lógica y la deducción para resolverlo.',
    wsTitle: '• SOPA DE LETRAS:',
    wsRules: 'Encuentra las palabras ocultas en la cuadrícula de letras. Pueden situarse en horizontal, vertical o diagonal, en orden normal o invertido.',
    mazeTitle: '• LABERINTOS:',
    mazeRules: 'Traza un camino continuo desde la ENTRADA arriba hasta la SALIDA abajo del laberinto sin cruzar paredes.',
    copyrightAllRights: 'Todos los derechos reservados.',
    kdpOptimized: 'Formateado y optimizado para publicación directa en Amazon KDP.',
    solutionsTitle: 'SOLUCIONES',
    solutionsSubtitle: 'Guía de respuestas completa para todos los pasatiempos',
    solutionsHeader: 'GUÍA DE SOLUCIONES',
    solutionNumber: 'Solución #{num}',
    solutionOnPage: '(Solución en la página {page})',
    wordsToFind: 'PALABRAS A ENCONTRAR:',
    entry: 'ENTRADA ↓',
    exit: 'SALIDA ↓',
    notesTitle: 'NOTAS & APUNTES',
    puzzleWord: 'Puzzle',
    diff: { facil: 'FÁCIL', medio: 'MEDIO', dificil: 'DIFÍCIL', extremo: 'EXTREMO' }
  }
};

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

    let total = 2 + puzzlePages + 1 + solutionPages;

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

    const lang = config.language || 'pt';
    const i18n = I18N_INTERIOR[lang] || I18N_INTERIOR.pt;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [widthPt, heightPt]
    });

    onProgress?.(5, 'Iniciando diagramação vetorial KDP...');

    const totalPuzzles = puzzles.length;
    const puzzlePagesCount = Math.ceil(totalPuzzles / config.puzzlesPerPage);
    const dividerPageIndex = 2 + puzzlePagesCount + 1;
    const solutionsStartPage = dividerPageIndex + 1;

    const solutionPageMap = new Map<number, number>();
    for (let i = 0; i < totalPuzzles; i++) {
      const pNum = puzzles[i].number;
      const solPageOffset = Math.floor(i / config.solutionsPerPage);
      solutionPageMap.set(pNum, solutionsStartPage + solPageOffset);
    }

    const estimatedPages = this.estimateTotalPages(config);
    const gutterPt = this.calculateGutterPoints(estimatedPages);
    const outerMarginPt = 0.375 * 72;
    const topMarginPt = 0.45 * 72;
    const bottomMarginPt = 0.45 * 72;

    let currentPageNumber = 1;

    const getPageContentBounds = (pageIndex: number) => {
      const isOdd = pageIndex % 2 !== 0;
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

    const boxY = b1.top + 240;
    const boxW = Math.min(b1.width - 60, 320);
    const boxX = (b1.left + b1.right) / 2 - boxW / 2;

    doc.setLineWidth(1.5);
    doc.setDrawColor(40, 40, 40);
    doc.rect(boxX, boxY, boxW, 110);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(i18n.belongsTo, (b1.left + b1.right) / 2, boxY + 30, { align: 'center' });

    doc.setLineWidth(0.8);
    doc.line(boxX + 25, boxY + 70, boxX + boxW - 25, boxY + 70);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.text(`${i18n.createdBy} ${config.author || 'Autor'}`, (b1.left + b1.right) / 2, b1.bottom - 40, { align: 'center' });

    // -------------------------------------------------------------
    // PÁGINA 2: COPYRIGHT & REGRAS / INSTRUÇÕES
    // -------------------------------------------------------------
    currentPageNumber++;
    doc.addPage([widthPt, heightPt]);
    onProgress?.(15, 'Montando regras e direitos autorais...');
    const b2 = getPageContentBounds(2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(i18n.howToPlay, (b2.left + b2.right) / 2, b2.top + 40, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let ruleY = b2.top + 80;

    // Sudoku
    doc.setFont('helvetica', 'bold');
    doc.text(i18n.sudokuTitle, b2.left + 20, ruleY);
    ruleY += 15;
    doc.setFont('helvetica', 'normal');
    doc.text(i18n.sudokuRules, b2.left + 20, ruleY, { maxWidth: b2.width - 40 });
    ruleY += 45;

    // Caça-Palavras
    doc.setFont('helvetica', 'bold');
    doc.text(i18n.wsTitle, b2.left + 20, ruleY);
    ruleY += 15;
    doc.setFont('helvetica', 'normal');
    doc.text(i18n.wsRules, b2.left + 20, ruleY, { maxWidth: b2.width - 40 });
    ruleY += 45;

    // Labirintos
    doc.setFont('helvetica', 'bold');
    doc.text(i18n.mazeTitle, b2.left + 20, ruleY);
    ruleY += 15;
    doc.setFont('helvetica', 'normal');
    doc.text(i18n.mazeRules, b2.left + 20, ruleY, { maxWidth: b2.width - 40 });
    ruleY += 60;

    // Copyright
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(`© ${new Date().getFullYear()} ${config.author || 'Book Engine'}. ${i18n.copyrightAllRights}`, (b2.left + b2.right) / 2, b2.bottom - 40, { align: 'center' });
    doc.text(i18n.kdpOptimized, (b2.left + b2.right) / 2, b2.bottom - 25, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // -------------------------------------------------------------
    // PÁGINAS DE PUZZLES (1, 2 OU 4 POR PÁGINA)
    // -------------------------------------------------------------
    let puzzleIdx = 0;
    while (puzzleIdx < puzzles.length) {
      currentPageNumber++;
      doc.addPage([widthPt, heightPt]);

      const percent = Math.min(80, Math.round(20 + (puzzleIdx / puzzles.length) * 50));
      onProgress?.(percent, `Desenhando puzzles (${puzzleIdx + 1}/${puzzles.length})...`);

      const bounds = getPageContentBounds(currentPageNumber);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${currentPageNumber}`, (bounds.left + bounds.right) / 2, bounds.bottom + 18, { align: 'center' });

      const perPage = config.puzzlesPerPage;
      const pagePuzzles = puzzles.slice(puzzleIdx, puzzleIdx + perPage);

      this.renderPuzzlesOnPage(doc, pagePuzzles, bounds, perPage, solutionPageMap, i18n);

      puzzleIdx += perPage;
    }

    // -------------------------------------------------------------
    // PÁGINA DIVISÓRIA: SOLUÇÕES / GABARITO
    // -------------------------------------------------------------
    currentPageNumber++;
    doc.addPage([widthPt, heightPt]);
    onProgress?.(82, 'Criando página divisória de gabaritos...');
    const bDiv = getPageContentBounds(currentPageNumber);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.text(i18n.solutionsTitle, (bDiv.left + bDiv.right) / 2, bDiv.top + bDiv.height / 2 - 20, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text(i18n.solutionsSubtitle, (bDiv.left + bDiv.right) / 2, bDiv.top + bDiv.height / 2 + 15, { align: 'center' });

    doc.setLineWidth(2);
    doc.line((bDiv.left + bDiv.right) / 2 - 80, bDiv.top + bDiv.height / 2 + 35, (bDiv.left + bDiv.right) / 2 + 80, bDiv.top + bDiv.height / 2 + 35);

    // -------------------------------------------------------------
    // PÁGINAS DE SOLUÇÕES (4, 6, 9 OU 12 POR PÁGINA)
    // -------------------------------------------------------------
    let solIdx = 0;
    while (solIdx < puzzles.length) {
      currentPageNumber++;
      doc.addPage([widthPt, heightPt]);

      const percent = Math.min(95, Math.round(85 + (solIdx / puzzles.length) * 10));
      onProgress?.(percent, `Renderizando gabaritos (${solIdx + 1}/${puzzles.length})...`);

      const bounds = getPageContentBounds(currentPageNumber);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(i18n.solutionsHeader, (bounds.left + bounds.right) / 2, bounds.top - 10, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${currentPageNumber}`, (bounds.left + bounds.right) / 2, bounds.bottom + 18, { align: 'center' });

      const solPerPage = config.solutionsPerPage;
      const pageSolutions = puzzles.slice(solIdx, solIdx + solPerPage);

      this.renderSolutionsOnPage(doc, pageSolutions, bounds, solPerPage, i18n);

      solIdx += solPerPage;
    }

    // -------------------------------------------------------------
    // GARANTIR CONFORMIDADE KDP: MÍNIMO 24 PÁGINAS
    // -------------------------------------------------------------
    while (currentPageNumber < 24 || currentPageNumber % 2 !== 0) {
      currentPageNumber++;
      doc.addPage([widthPt, heightPt]);
      const bNotes = getPageContentBounds(currentPageNumber);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(i18n.notesTitle, (bNotes.left + bNotes.right) / 2, bNotes.top + 40, { align: 'center' });

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
   * Renderiza os puzzles na página conforme o layout
   */
  private static renderPuzzlesOnPage(
    doc: jsPDF,
    items: GeneratedPuzzleItem[],
    bounds: { left: number; right: number; top: number; bottom: number; width: number; height: number },
    perPage: 1 | 2 | 4,
    solutionMap: Map<number, number>,
    i18n: typeof I18N_INTERIOR['pt']
  ): void {
    if (perPage === 1 && items[0]) {
      this.drawSinglePuzzle(doc, items[0], bounds.left, bounds.top, bounds.width, bounds.height, solutionMap, i18n);
    } else if (perPage === 2) {
      const halfH = bounds.height / 2;
      if (items[0]) {
        this.drawSinglePuzzle(doc, items[0], bounds.left, bounds.top, bounds.width, halfH - 15, solutionMap, i18n);
      }
      if (items[1]) {
        this.drawSinglePuzzle(doc, items[1], bounds.left, bounds.top + halfH + 15, bounds.width, halfH - 15, solutionMap, i18n);
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
          this.drawSinglePuzzle(doc, item, slots[idx].x, slots[idx].y, halfW - 10, halfH - 10, solutionMap, i18n);
        }
      });
    }
  }

  /**
   * Desenha um puzzle individual com seu cabeçalho traduzido
   */
  private static drawSinglePuzzle(
    doc: jsPDF,
    puzzle: GeneratedPuzzleItem,
    x: number,
    y: number,
    w: number,
    h: number,
    solutionMap: Map<number, number>,
    i18n: typeof I18N_INTERIOR['pt']
  ): void {
    const solPage = solutionMap.get(puzzle.number);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    let titleStr = `${i18n.puzzleWord} #${puzzle.number}`;

    if (puzzle.type === 'sudoku') {
      const diffLabel = i18n.diff[puzzle.difficulty] || puzzle.difficulty.toUpperCase();
      titleStr += ` - Sudoku (${diffLabel})`;
    } else if (puzzle.type === 'wordsearch') {
      titleStr += ` - ${puzzle.theme}`;
    } else if (puzzle.type === 'maze') {
      const diffLabel = i18n.diff[puzzle.difficulty] || puzzle.difficulty.toUpperCase();
      titleStr += ` - ${i18n.mazeTitle.replace('• ', '')} (${diffLabel})`;
    }

    doc.text(titleStr, x + w / 2, y + 16, { align: 'center', maxWidth: w - 20 });

    if (solPage) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      const solText = i18n.solutionOnPage.replace('{page}', String(solPage));
      doc.text(solText, x + w / 2, y + 28, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }

    const contentTop = y + 36;
    const contentH = h - 42;

    if (puzzle.type === 'sudoku') {
      this.drawSudokuBoard(doc, puzzle.grid, x, contentTop, w, contentH);
    } else if (puzzle.type === 'wordsearch') {
      this.drawWordSearchBoard(doc, puzzle, x, contentTop, w, contentH, i18n);
    } else if (puzzle.type === 'maze') {
      this.drawMazeBoard(doc, puzzle, x, contentTop, w, contentH, false, i18n);
    }
  }

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

    doc.setFillColor(255, 255, 255);
    doc.rect(startX, startY, boardSize, boardSize, 'F');

    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.4);
    for (let i = 1; i < 9; i++) {
      if (i % 3 !== 0) {
        doc.line(startX + i * cellSize, startY, startX + i * cellSize, startY + boardSize);
        doc.line(startX, startY + i * cellSize, startX + boardSize, startY + i * cellSize);
      }
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.6);
    doc.rect(startX, startY, boardSize, boardSize);

    for (let i = 3; i < 9; i += 3) {
      doc.line(startX + i * cellSize, startY, startX + i * cellSize, startY + boardSize);
      doc.line(startX, startY + i * cellSize, startX + boardSize, startY + i * cellSize);
    }

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

  private static drawWordSearchBoard(
    doc: jsPDF,
    puzzle: WordSearchPuzzleItem,
    x: number,
    y: number,
    maxW: number,
    maxH: number,
    i18n: typeof I18N_INTERIOR['pt']
  ): void {
    const listH = Math.min(80, maxH * 0.28);
    const gridMaxH = maxH - listH - 10;
    const boardSize = Math.min(maxW - 10, gridMaxH, 320);
    const startX = x + (maxW - boardSize) / 2;
    const startY = y + 5;
    const cellSize = boardSize / puzzle.gridSize;

    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(1);
    doc.rect(startX, startY, boardSize, boardSize);

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

    const listTop = startY + boardSize + 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(i18n.wordsToFind, x + maxW / 2, listTop, { align: 'center' });

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

  private static drawMazeBoard(
    doc: jsPDF,
    puzzle: MazePuzzleItem,
    x: number,
    y: number,
    maxW: number,
    maxH: number,
    isSolution: boolean,
    i18n: typeof I18N_INTERIOR['pt']
  ): void {
    const mazeSize = Math.min(maxW - 30, maxH - 30, 320);
    const startX = x + (maxW - mazeSize) / 2;
    const startY = y + (maxH - mazeSize) / 2;
    const cellW = mazeSize / puzzle.width;
    const cellH = mazeSize / puzzle.height;

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

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(i18n.entry, startX + cellW / 2, startY - 5, { align: 'center' });
    doc.text(i18n.exit, startX + puzzle.width * cellW - cellW / 2, startY + mazeSize + 10, { align: 'center' });

    if (isSolution && puzzle.solutionPath.length > 1) {
      doc.setDrawColor(180, 0, 0);
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

  private static renderSolutionsOnPage(
    doc: jsPDF,
    items: GeneratedPuzzleItem[],
    bounds: { left: number; right: number; top: number; bottom: number; width: number; height: number },
    solPerPage: 4 | 6 | 9 | 12,
    i18n: typeof I18N_INTERIOR['pt']
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

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      const solLabel = i18n.solutionNumber.replace('{num}', String(item.number));
      doc.text(solLabel, slotX + cellW / 2, slotY + 12, { align: 'center' });

      const innerTop = slotY + 18;
      const innerH = cellH - 24;

      if (item.type === 'sudoku') {
        this.drawSudokuBoard(doc, item.solution, slotX, innerTop, cellW, innerH);
      } else if (item.type === 'wordsearch') {
        this.drawWordSearchSolutionBoard(doc, item, slotX, innerTop, cellW, innerH);
      } else if (item.type === 'maze') {
        this.drawMazeBoard(doc, item, slotX, innerTop, cellW, innerH, true, i18n);
      }
    });
  }

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
