import { describe, it, expect } from 'vitest';
import { SudokuEngine } from '../src/services/sudoku-engine';
import { InvestigativeStoryGenerator } from '../src/services/investigative-story-generator';
import { InvestigativeValidator } from '../src/services/investigative-validator';
import { SudokuInvestigativeService } from '../src/services/sudoku-investigative-service';
import { SudokuKdpPdfBuilder } from '../src/services/sudoku-kdp-pdf-builder';
import { SudokuBookConfig, InvestigationCase } from '../src/types/sudoku-investigative';

describe('SudokuEngine', () => {
  it('deve gerar uma grade 9x9 válida com solução única', () => {
    const { puzzle, solution } = SudokuEngine.generatePuzzle('facil');
    
    expect(puzzle.length).toBe(9);
    expect(solution.length).toBe(9);
    expect(puzzle[0].length).toBe(9);
    expect(solution[0].length).toBe(9);

    // Validação da solução completa
    for (let r = 0; r < 9; r++) {
      const rowDigits = new Set<number>();
      for (let c = 0; c < 9; c++) {
        expect(solution[r][c]).toBeGreaterThanOrEqual(1);
        expect(solution[r][c]).toBeLessThanOrEqual(9);
        rowDigits.add(solution[r][c]);
      }
      expect(rowDigits.size).toBe(9);
    }

    // Contagem de soluções deve ser exatamente 1 (garantia matemática)
    const solutionsCount = SudokuEngine.countSolutions(puzzle, 2);
    expect(solutionsCount).toBe(1);
  });

  it('deve validar e resolver um tabuleiro corretamente com solver', () => {
    const { puzzle, solution } = SudokuEngine.generatePuzzle('medio');
    const solvedGrid = SudokuEngine.solveGrid(puzzle);
    expect(solvedGrid).not.toBeNull();
    expect(solvedGrid).toEqual(solution);
  });

  it('deve validar tabuleiro completo', () => {
    const { solution } = SudokuEngine.generatePuzzle('facil');
    expect(SudokuEngine.validateSolution(solution)).toBe(true);
  });
});

describe('InvestigativeStoryGenerator & InvestigativeValidator', () => {
  const sampleConfig: SudokuBookConfig = {
    title: 'O Enigma da Mansão Vane',
    subtitle: 'Mistério e Sudoku KDP',
    author: 'Leandro Palmeira',
    theme: 'assassinato',
    caseCount: 2,
    suspectsPerCase: 4,
    sudokusPerCase: 3,
    difficulty: 'medio',
    timePeriod: 'vitoriana',
    location: 'mansao',
    storyStyle: 'misterio_classico',
    trimFormat: '8.5x11',
    hasBleed: false
  };

  it('deve gerar casos investigativos consistentes com pistas atreladas a Sudokus', () => {
    const generatedCase = InvestigativeStoryGenerator.generateCase(sampleConfig, 1);

    expect(generatedCase.caseNumber).toBe(1);
    expect(generatedCase.suspects.length).toBe(sampleConfig.suspectsPerCase);
    expect(generatedCase.puzzles.length).toBe(sampleConfig.sudokusPerCase);
    expect(generatedCase.clues.length).toBe(sampleConfig.sudokusPerCase);
    expect(generatedCase.victim).toBeDefined();
    expect(generatedCase.crimeScene).toBeDefined();

    // O culpado deve estar entre os suspeitos
    const culpritSuspect = generatedCase.suspects.find(s => s.id === generatedCase.caseSolution.culprit.id);
    expect(culpritSuspect).toBeDefined();
    expect(culpritSuspect?.isCulprit).toBe(true);

    // Validação de consistência do caso
    const caseReport = InvestigativeValidator.validateCase(generatedCase);
    expect(caseReport.isValid).toBe(true);
    expect(caseReport.errors.length).toBe(0);
  });

  it('deve detectar inconsistência caso o culpado não seja válido', () => {
    const generatedCase = InvestigativeStoryGenerator.generateCase(sampleConfig, 1);
    const corruptedCase: InvestigationCase = {
      ...generatedCase,
      caseSolution: {
        ...generatedCase.caseSolution,
        culprit: {
          ...generatedCase.caseSolution.culprit,
          id: 'suspect_inexistente_999'
        }
      }
    };

    const caseReport = InvestigativeValidator.validateCase(corruptedCase);
    expect(caseReport.isValid).toBe(false);
    expect(caseReport.errors.length).toBeGreaterThan(0);
  });
});

describe('SudokuInvestigativeService & SudokuKdpPdfBuilder', () => {
  it('deve orquestrar a geração completa do livro com progresso', async () => {
    const progressSteps: string[] = [];

    const config: SudokuBookConfig = {
      title: 'Crimes na Névoa',
      subtitle: 'Enigmas de Sudoku KDP',
      author: 'Leandro Palmeira',
      theme: 'assassinato',
      caseCount: 2,
      suspectsPerCase: 4,
      sudokusPerCase: 2,
      difficulty: 'facil',
      timePeriod: 'anos1950',
      location: 'trem',
      storyStyle: 'policial_classico',
      trimFormat: '8.5x11',
      hasBleed: false
    };

    const result = await SudokuInvestigativeService.generateCompleteBook(
      config,
      (step, _percent) => {
        progressSteps.push(step);
      }
    );

    expect(result.cases.length).toBe(2);
    expect(result.validationReport.isValid).toBe(true);
    expect(progressSteps.length).toBeGreaterThan(0);
  });

  it('deve gerar o PDF interior e PDF de soluções com diagramação KDP 300 DPI', async () => {
    const config: SudokuBookConfig = {
      title: 'Teste de PDF KDP',
      subtitle: 'Interior e Gabarito',
      author: 'Leandro Palmeira',
      theme: 'roubo',
      caseCount: 1,
      suspectsPerCase: 3,
      sudokusPerCase: 2,
      difficulty: 'facil',
      timePeriod: 'atual',
      location: 'museu',
      storyStyle: 'noir',
      trimFormat: '8.5x11',
      hasBleed: false
    };

    const singleCase = InvestigativeStoryGenerator.generateCase(config, 1);
    const interiorResult = await SudokuKdpPdfBuilder.buildInteriorPdf(config, [singleCase]);
    const solutionsResult = await SudokuKdpPdfBuilder.buildSolutionsPdf(config, [singleCase]);

    expect(interiorResult.blob).toBeDefined();
    expect(interiorResult.totalPages).toBeGreaterThan(0);
    expect(solutionsResult.blob).toBeDefined();
  });
});
