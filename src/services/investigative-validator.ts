// Validador Rigoroso de Consistência Narrativa, Pistas e Sudokus (KDP Quality Gate)
import { 
  InvestigationCase, 
  ConsistencyValidationReport, 
  ValidationItem 
} from '../types/sudoku-investigative';
import { SudokuEngine } from './sudoku-engine';

export class InvestigativeValidator {
  /**
   * Executa a auditoria completa de um conjunto de casos investigativos
   */
  public static validateAllCases(cases: InvestigationCase[]): ConsistencyValidationReport {
    const items: ValidationItem[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!cases || cases.length === 0) {
      return {
        isValid: false,
        totalChecks: 1,
        passedChecks: 0,
        items: [{
          category: 'HISTÓRIA',
          passed: false,
          title: 'Casos Inexistentes',
          message: 'Nenhum caso foi gerado para validação.'
        }],
        errors: ['O livro não contém nenhum caso criminal.'],
        warnings: []
      };
    }

    cases.forEach((c) => {
      // 1. CHECAGEM DA HISTÓRIA
      const hasVictim = !!(c.victim && c.victim.nome && c.victim.profissao);
      items.push({
        category: 'HISTÓRIA',
        passed: hasVictim,
        title: `Caso #${c.caseNumber}: Vítima Definida`,
        message: hasVictim ? `Vítima identificada: ${c.victim.nome} (${c.victim.profissao})` : 'Vítima não definida.'
      });
      if (!hasVictim) errors.push(`Caso #${c.caseNumber}: Vítima ausente ou incompleta.`);

      const culpritInSuspects = !!(c.caseSolution?.culprit && c.suspects?.some(s => s.id === c.caseSolution.culprit.id && s.isCulprit));
      const hasCulprit = !!(c.caseSolution && c.caseSolution.culprit && c.caseSolution.culprit.isCulprit && culpritInSuspects);
      items.push({
        category: 'HISTÓRIA',
        passed: hasCulprit,
        title: `Caso #${c.caseNumber}: Assassino Definido`,
        message: hasCulprit ? `Culpado identificado e consistente: ${c.caseSolution.culprit.nome}` : 'Assassino não identificado ou não consta na lista de suspeitos.'
      });
      if (!hasCulprit) errors.push(`Caso #${c.caseNumber}: Assassino não definido ou ausente da lista de suspeitos.`);

      const hasMotive = !!(c.caseSolution && c.caseSolution.motiveExplanation);
      items.push({
        category: 'HISTÓRIA',
        passed: hasMotive,
        title: `Caso #${c.caseNumber}: Motivo Definido`,
        message: hasMotive ? 'Motivo do crime estruturado com clareza.' : 'Motivo ausente.'
      });
      if (!hasMotive) errors.push(`Caso #${c.caseNumber}: Motivo ausente.`);

      const hasLocationAndTime = !!(c.crimeScene && c.crimeScene.localDetalhado && c.crimeScene.horaEncontrado);
      items.push({
        category: 'HISTÓRIA',
        passed: hasLocationAndTime,
        title: `Caso #${c.caseNumber}: Local e Horário`,
        message: hasLocationAndTime ? `${c.crimeScene.localDetalhado} às ${c.crimeScene.horaEncontrado}` : 'Local ou horário ausentes.'
      });
      if (!hasLocationAndTime) errors.push(`Caso #${c.caseNumber}: Local ou horário não definidos.`);

      const hasSuspects = Array.isArray(c.suspects) && c.suspects.length >= 2;
      items.push({
        category: 'HISTÓRIA',
        passed: hasSuspects,
        title: `Caso #${c.caseNumber}: Lista de Suspeitos`,
        message: hasSuspects ? `${c.suspects.length} suspeitos registrados com álibis e segredos.` : 'Quantidade insuficiente de suspeitos.'
      });
      if (!hasSuspects) errors.push(`Caso #${c.caseNumber}: Quantidade insuficiente de suspeitos.`);

      // 2. CHECAGEM DE PISTAS
      const hasClues = Array.isArray(c.clues) && c.clues.length >= 1;
      items.push({
        category: 'PISTAS',
        passed: hasClues,
        title: `Caso #${c.caseNumber}: Pistas Mapeadas`,
        message: hasClues ? `${c.clues.length} pistas conectadas aos puzzles.` : 'Pistas insuficientes.'
      });
      if (!hasClues) errors.push(`Caso #${c.caseNumber}: Pistas insuficientes.`);

      const cluesHaveMeaning = c.clues.length > 0 && c.clues.every(clue => clue.revelationText && clue.pointsToCulpritReason);
      items.push({
        category: 'PISTAS',
        passed: cluesHaveMeaning,
        title: `Caso #${c.caseNumber}: Significado das Pistas`,
        message: cluesHaveMeaning ? 'Todas as pistas possuem implicação lógica no inquérito.' : 'Existem pistas vazias ou sem contexto.'
      });
      if (!cluesHaveMeaning) errors.push(`Caso #${c.caseNumber}: Pistas com significado incompleto.`);

      // 3. CHECAGEM DOS SUDOKUS
      const hasPuzzles = Array.isArray(c.puzzles) && c.puzzles.length === c.clues.length;
      items.push({
        category: 'SUDOKU',
        passed: hasPuzzles,
        title: `Caso #${c.caseNumber}: Sudokus Pareados`,
        message: hasPuzzles ? `${c.puzzles.length} Sudokus perfeitamente associados às pistas.` : 'Inconsistência entre Sudokus e pistas.'
      });
      if (!hasPuzzles) errors.push(`Caso #${c.caseNumber}: Quantidade de Sudokus difere da quantidade de pistas.`);

      // Verifica solução de cada Sudoku
      let allGridsValid = true;
      for (const p of c.puzzles) {
        if (!SudokuEngine.validateSolution(p.solution)) {
          allGridsValid = false;
          break;
        }
      }
      items.push({
        category: 'SUDOKU',
        passed: allGridsValid,
        title: `Caso #${c.caseNumber}: Validação Matemática dos Sudokus`,
        message: allGridsValid ? 'Todas as grades possuem solução matemática única e válida.' : 'Falha matemática em uma ou mais grades de Sudoku.'
      });
      if (!allGridsValid) errors.push(`Caso #${c.caseNumber}: Sudoku com grade inválida.`);
    });

    const passedChecks = items.filter(i => i.passed).length;
    const isValid = errors.length === 0;

    return {
      isValid,
      totalChecks: items.length,
      passedChecks,
      items,
      errors,
      warnings
    };
  }

  public static validateCase(c: InvestigationCase): ConsistencyValidationReport {
    return this.validateAllCases([c]);
  }

  public static validateBookConsistency(cases: InvestigationCase[]): ConsistencyValidationReport {
    return this.validateAllCases(cases);
  }
}
