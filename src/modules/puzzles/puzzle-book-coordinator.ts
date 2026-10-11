import JSZip from 'jszip';
import {
  PuzzleBookConfig,
  GeneratedPuzzleItem,
  CompilationResult
} from './types';
import { SudokuEngine } from './sudoku-engine';
import { WordSearchEngine, PRESET_WORD_THEMES } from './wordsearch-engine';
import { MazeEngine } from './maze-engine';
import { PuzzleInteriorPdfBuilder } from './puzzle-interior-pdf-builder';
import { PuzzleCoverBuilder } from './puzzle-cover-builder';

export class PuzzleBookCoordinator {
  /**
   * Gera a lista completa de puzzles conforme a configuração
   */
  public static generateAllPuzzles(
    config: PuzzleBookConfig,
    onProgress?: (percent: number, status: string) => void
  ): GeneratedPuzzleItem[] {
    const list: GeneratedPuzzleItem[] = [];
    let puzzleNumber = 1;

    const totalToGenerate =
      config.sudokuFacilCount +
      config.sudokuMedioCount +
      config.sudokuDificilCount +
      config.sudokuExtremoCount +
      config.wordSearchCount +
      config.mazeCount;

    let generatedCount = 0;
    const reportStep = (type: string) => {
      generatedCount++;
      const p = Math.round((generatedCount / totalToGenerate) * 20);
      onProgress?.(p, `Gerando algoritmos de ${type} (${generatedCount}/${totalToGenerate})...`);
    };

    // 1. Sudokus Fáceis
    for (let i = 0; i < config.sudokuFacilCount; i++) {
      list.push(SudokuEngine.generatePuzzle(puzzleNumber++, 'facil'));
      reportStep('Sudoku Fácil');
    }

    // 2. Sudokus Médios
    for (let i = 0; i < config.sudokuMedioCount; i++) {
      list.push(SudokuEngine.generatePuzzle(puzzleNumber++, 'medio'));
      reportStep('Sudoku Médio');
    }

    // 3. Sudokus Difíceis
    for (let i = 0; i < config.sudokuDificilCount; i++) {
      list.push(SudokuEngine.generatePuzzle(puzzleNumber++, 'dificil'));
      reportStep('Sudoku Difícil');
    }

    // 4. Sudokus Extremos
    for (let i = 0; i < config.sudokuExtremoCount; i++) {
      list.push(SudokuEngine.generatePuzzle(puzzleNumber++, 'extremo'));
      reportStep('Sudoku Extremo');
    }

    // 5. Caça-Palavras no idioma selecionado
    const langThemes = WordSearchEngine.getThemesForLanguage(config.language || 'pt');
    const themes = config.wordSearchThemes && config.wordSearchThemes.length > 0
      ? config.wordSearchThemes
      : langThemes.map(t => t.themeName);

    for (let i = 0; i < config.wordSearchCount; i++) {
      const themeName = themes[i % themes.length];
      const preset = langThemes.find(p => p.themeName === themeName) || langThemes[0];
      list.push(
        WordSearchEngine.generatePuzzle(
          puzzleNumber++,
          preset.themeName,
          preset.words,
          config.wordSearchGridSize || 15
        )
      );
      reportStep('Caça-Palavras');
    }

    // 6. Labirintos
    for (let i = 0; i < config.mazeCount; i++) {
      list.push(MazeEngine.generatePuzzle(puzzleNumber++, config.mazeDifficulty || 'medio'));
      reportStep('Labirinto');
    }

    return list;
  }

  /**
   * Compila o livro completo (Miolo PDF + Capa Aberta PDF + Metadados KDP)
   */
  public static async compileFullBook(
    config: PuzzleBookConfig,
    onProgress?: (percent: number, status: string) => void
  ): Promise<CompilationResult> {
    onProgress?.(2, 'Iniciando motores de geração matemática...');

    // 1. Gera todos os puzzles
    const puzzles = this.generateAllPuzzles(config, onProgress);

    // 2. Compila o Interior PDF
    const interiorResult = await PuzzleInteriorPdfBuilder.buildInteriorPdf(
      config,
      puzzles,
      (percent, status) => {
        onProgress?.(percent, status);
      }
    );

    const actualPageCount = interiorResult.pageCount;

    // 3. Calcula especificações milimétricas da capa com base no total de páginas exato
    onProgress?.(92, 'Calculando dimensões milimétricas da lombada KDP...');
    const coverSpecs = PuzzleCoverBuilder.calculateCoverSpecs(config, actualPageCount);

    // 4. Compila a Capa PDF
    onProgress?.(95, 'Renderizando capa aberta de alta resolução...');
    const coverResult = await PuzzleCoverBuilder.buildCoverPdf(config, coverSpecs);

    // 5. Gera metadados e instruções de publicação Amazon KDP
    const metadataJson = JSON.stringify(
      {
        kdpSpecification: {
          title: config.title,
          subtitle: config.subtitle,
          author: config.author,
          language: config.language === 'en' ? 'en-US' : (config.language === 'es' ? 'es-ES' : 'pt-BR'),
          trimSize: config.trimSize,
          paperColor: config.paperColor === 'cream' ? 'Creme' : 'Branco',
          inkType: 'Preto e Branco',
          pageCount: actualPageCount,
          bleed: 'No Bleed (Interior)',
          coverBleed: '0.125 pol em todas as bordas',
          spineWidthInches: coverSpecs.spineWidth.toFixed(4),
          totalCoverWidthInches: coverSpecs.totalWidth.toFixed(4),
          totalCoverHeightInches: coverSpecs.totalHeight.toFixed(4),
          categories: config.language === 'en'
            ? ['Puzzle & Activity Books', 'Sudoku & Logic Games', 'Word Search for Seniors & Adults']
            : (config.language === 'es'
              ? ['Libros de Pasatiempos y Rompecabezas', 'Sudokus y Juegos Lógicos', 'Sopas de Letras para Adultos']
              : ['Livros de Passatempos e Quebra-Cabeças', 'Jogos Lógicos e Sudoku', 'Atividades para Adultos e Terceira Idade']),
          keywords: config.language === 'en'
            ? ['word search book', 'large print sudoku', 'brain puzzles for adults', 'word find for seniors', 'logic games with solutions']
            : (config.language === 'es'
              ? ['libro de sopa de letras', 'sudoku letra grande', 'pasatiempos adultos mayores', 'juegos logicos con respuestas']
              : ['livro de sudoku', 'caca palavras grande', 'passatempos logicos', 'labirintos adultos', 'livro para idosos mente ativa'])
        },
        compilationDate: new Date().toISOString()
      },
      null,
      2
    );

    const instructionsTxt = `GUIA RÁPIDO DE PUBLICAÇÃO NO AMAZON KDP
==============================================
Livro: ${config.title}
Autor: ${config.author}

1. CONFIGURAÇÃO DE IMPRESSÃO (KDP PRINT):
- Formato de acabamento (Trim Size): ${coverSpecs.trimWidth}" x ${coverSpecs.trimHeight}"
- Cor do miolo: Preto e branco com papel ${config.paperColor === 'cream' ? 'creme' : 'branco'}
- Sangria do Miolo: SEM sangria (No Bleed)
- Total de páginas do arquivo: ${actualPageCount} páginas

2. ENVIO DA CAPA (COVER):
- Arquivo: cover_kdp.pdf
- Formato: Capa aberta completa (Full Wrap)
- Dimensões enviadas: ${coverSpecs.totalWidth.toFixed(4)}" x ${coverSpecs.totalHeight.toFixed(4)}"
- Lombada calculada: ${coverSpecs.spineWidth.toFixed(4)}"
- O código de barras é impresso automaticamente pela Amazon no canto inferior esquerdo reservado.

3. CONFORMIDADE:
- O miolo contém margens de segurança ampliadas (gutter) para encadernação perfeita.
- Todos os traços e números foram renderizados de forma vetorial em alta resolução.
==============================================
Book Engine - Puzzle & Sudoku KDP
`;

    onProgress?.(100, 'Livro concluído com sucesso!');

    return {
      interiorBlob: interiorResult.blob,
      coverBlob: coverResult.blob,
      coverDataUrl: coverResult.dataUrl,
      pageCount: actualPageCount,
      puzzleCount: puzzles.length,
      coverSpecs,
      metadataJson,
      instructionsTxt
    };
  }

  /**
   * Empacota Miolo, Capa e Metadados em um arquivo .ZIP
   */
  public static async createZipPackage(compilation: CompilationResult, title: string): Promise<Blob> {
    const zip = new JSZip();
    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'puzzle_book';

    zip.file(`${safeTitle}_interior_kdp.pdf`, compilation.interiorBlob);
    zip.file(`${safeTitle}_cover_kdp.pdf`, compilation.coverBlob);
    zip.file('metadata_kdp.json', compilation.metadataJson);
    zip.file('instrucoes_publicacao_kdp.txt', compilation.instructionsTxt);

    return await zip.generateAsync({ type: 'blob' });
  }
}
