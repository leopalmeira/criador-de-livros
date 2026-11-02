// ============================================================================
// BOOKENGIN MULTI-ENGINE — AUTONOMOUS CORRECTOR
// Motor de autocorreção contextual em loop com revalidação de segunda auditoria
// ============================================================================

import {
  WebnovelReviewReport,
  CorrectionCycleResult,
  WebnovelReviewIssue
} from './contracts';
import { WebnovelAuditEngine } from './webnovel-audit-engine';
import { NarrativeMemoryStore } from './narrative-memory-store';
import { chamarGeminiTexto, chamarOpenRouterTexto } from '../kdp-ai-engine';

export interface AutonomousCorrectionResult {
  finalText: string;
  cycles: CorrectionCycleResult[];
  resolved: boolean;
  requiresManualReview: boolean;
  totalCyclesExecuted: number;
}

export class AutonomousCorrector {
  private auditEngine: WebnovelAuditEngine;
  private memoryStore: NarrativeMemoryStore;

  constructor(auditEngine: WebnovelAuditEngine, memoryStore: NarrativeMemoryStore) {
    this.auditEngine = auditEngine;
    this.memoryStore = memoryStore;
  }

  /**
   * Executa a autocorreção em loop de até maxCycles com revalidação imediata
   */
  public async correctChapter(
    chapterNumber: number,
    chapterTitle: string,
    initialText: string,
    initialReport: WebnovelReviewReport,
    maxCycles: number = 3
  ): Promise<AutonomousCorrectionResult> {
    let currentText = initialText;
    let currentReport = initialReport;
    const cycleHistory: CorrectionCycleResult[] = [];

    if (!currentReport.hasBlocking) {
      return {
        finalText: initialText,
        cycles: [],
        resolved: true,
        requiresManualReview: false,
        totalCyclesExecuted: 0
      };
    }

    for (let cycle = 1; cycle <= maxCycles; cycle++) {
      const blockingIssues = currentReport.issues.filter(i => i.blocking);
      if (blockingIssues.length === 0) break;

      const correctedText = await this.applyContextualFix(
        currentText,
        blockingIssues,
        chapterNumber,
        chapterTitle
      );

      // SEGUNDA AUDITORIA INDEPENDENTE IMEDIATA
      const secondAudit = await this.auditEngine.auditChapter(
        chapterNumber,
        chapterTitle,
        correctedText
      );

      // Compara para verificar se introduziu novos problemas
      const previousDescriptions = new Set(blockingIssues.map(i => i.description));
      const newIssuesIntroduced = secondAudit.issues.some(
        newIssue => newIssue.blocking && !previousDescriptions.has(newIssue.description)
      );

      const fixedIssues = blockingIssues
        .filter(oldIssue => !secondAudit.issues.some(newI => newI.description === oldIssue.description))
        .map(i => i.description);

      const cycleResult: CorrectionCycleResult = {
        cycle,
        originalText: currentText,
        correctedText,
        fixedIssues,
        secondAudit,
        success: !secondAudit.hasBlocking,
        introducedNewIssues: newIssuesIntroduced
      };

      cycleHistory.push(cycleResult);
      currentText = correctedText;
      currentReport = secondAudit;

      if (!secondAudit.hasBlocking) {
        return {
          finalText: currentText,
          cycles: cycleHistory,
          resolved: true,
          requiresManualReview: false,
          totalCyclesExecuted: cycle
        };
      }
    }

    // Se esgotou os ciclos configurados e ainda tem bloqueios
    return {
      finalText: currentText,
      cycles: cycleHistory,
      resolved: false,
      requiresManualReview: true,
      totalCyclesExecuted: maxCycles
    };
  }

  /**
   * Aplica a correção pontual nos parágrafos afetados
   */
  private async applyContextualFix(
    text: string,
    issues: WebnovelReviewIssue[],
    chapterNumber: number,
    chapterTitle: string
  ): Promise<string> {
    let workingText = text;

    for (const issue of issues) {
      // 1. Correções determinísticas de alta precisão
      if (issue.category === 'setting' && issue.description.includes('Contradição de localização do objeto')) {
        // Ex: retirou as chaves do bolso -> foi até a estante e pegou as chaves
        workingText = workingText.replace(
          /(?:tirou|retirou|puxou|sacou)\s+(?:as?|os?|suas?|seus?)?\s*([a-zá-ú]+)\s+(?:do bolso|da gaveta)/i,
          (match, objName) => `caminhou até onde havia deixado e pegou as ${objName}`
        );
        continue;
      }

      if (issue.category === 'character' && issue.description.includes('faleceu no capítulo')) {
        // Ex: personagem morto agindo -> transforma em memória ou remove interação viva
        const deadNameMatch = issue.description.match(/personagem\s+([A-Z][a-z]+)/i);
        if (deadNameMatch) {
          const charName = deadNameMatch[1];
          const regexAction = new RegExp(`${charName}\\s+(?:disse|falou|caminhou|respondeu)[^.]+?\\.`, 'gi');
          workingText = workingText.replace(
            regexAction,
            `A memória da voz de ${charName} ainda ecoava em sua mente como um aviso silencioso.`
          );
        }
        continue;
      }

      if (issue.category === 'character' && issue.description.includes('Violação do Limite de Conhecimento')) {
        // Ex: segredo citado por quem não sabe -> substitui a citação direta por suspeita vaga
        workingText = workingText.replace(
          /[-—"'][^"'-]*(?:assassino|segredo|verdade oculta)[^"'-]*[-—"']/i,
          `"— Há algo sombrio acontecendo aqui e precisamos descobrir a verdade — alertou, sem suspeitar de quem realmente estava por trás de tudo."`
        );
        continue;
      }

      if (issue.category === 'timeline' && issue.description.includes('Incompatibilidade temporal')) {
        // Adiciona transição de viagem temporal entre cidades
        workingText = workingText.replace(
          /\n\s*\n/,
          `\n\nApós um longo voo noturno de conexão internacional e horas de espera exaustivas nos aeroportos, o desembarque finalmente aconteceu.\n\n`
        );
        continue;
      }

      // 2. Correção com IA para casos complexos
      try {
        const promptFix = `
Você é o Revisor Editorial Especialista do BookEngin.
Corrija cirurgicamente o trecho a seguir para eliminar a contradição narrada pelo auditor.

PROBLEMA APONTADO PELO AUDITOR:
${issue.description}
EVIDÊNCIA: ${issue.evidence}
DIRETRIZ DE CORREÇÃO: ${issue.fixHint}

TEXTO ORIGINAL DO TRECHO:
"""
${issue.location}
"""

REGRAS:
1. Preserve o estilo, a voz dos personagens e o tom literário.
2. Modifique apenas o necessário para eliminar a inconsistência canônica.
3. Retorne APENAS o trecho corrigido, sem explicações nem aspas extras.
`.trim();

        const res = await chamarGeminiTexto(promptFix, { temperature: 0.4, maxTokens: 800 });
        if (res.texto && res.texto.trim()) {
          // Substitui no texto se encontrar trecho compatível
          const snippetClean = issue.location.replace(/^Parágrafo\s+\d+:\s*"|"\.\.\.$/g, '');
          if (snippetClean.length > 20 && workingText.includes(snippetClean)) {
            workingText = workingText.replace(snippetClean, res.texto.trim());
          }
        }
      } catch (err) {
        console.warn('[AutonomousCorrector] Falha na chamada da IA de correção:', err);
      }
    }

    return workingText;
  }
}
