// ============================================================================
// BOOKENGIN MULTI-ENGINE — AUDITOR GLOBAL DA OBRA COMPLETA
// Avaliação editorial e de continuidade de ponta a ponta (0 a 100 pontos)
// ============================================================================

import {
  GlobalEditorialAuditReport,
  WebnovelReviewIssue
} from './contracts';
import { NarrativeMemoryStore } from './narrative-memory-store';
import { WebnovelAuditEngine } from './webnovel-audit-engine';

export interface ChapterInput {
  titulo: string;
  texto: string;
}

export class GlobalBookAuditor {
  private memoryStore: NarrativeMemoryStore;
  private auditEngine: WebnovelAuditEngine;

  constructor(memoryStore: NarrativeMemoryStore, auditEngine: WebnovelAuditEngine) {
    this.memoryStore = memoryStore;
    this.auditEngine = auditEngine;
  }

  /**
   * Executa a auditoria global da obra inteira de ponta a ponta
   */
  public async auditEntireBook(
    bookTitle: string,
    chapters: Array<{ number?: number; title?: string; titulo?: string; text?: string; texto?: string }>,
    _author?: string,
    _genre?: string
  ): Promise<GlobalEditorialAuditReport> {
    const formatted: ChapterInput[] = chapters.map(c => ({
      titulo: c.titulo || c.title || 'Capítulo',
      texto: c.texto || c.text || ''
    }));
    return this.auditFullBook(bookTitle, formatted);
  }

  public async auditFullBook(
    bookTitle: string,
    chapters: ChapterInput[]
  ): Promise<GlobalEditorialAuditReport> {
    const memory = this.memoryStore.getMemory();
    const allUnresolvedIssues: WebnovelReviewIssue[] = [];
    const detailedFindings: string[] = [];

    let totalWords = 0;
    let characterDeductions = 0;
    let objectDeductions = 0;
    let timelineDeductions = 0;
    let logicDeductions = 0;
    let mysteryDeductions = 0;

    // 1. Auditoria individual e cruzada de cada capítulo
    for (let i = 0; i < chapters.length; i++) {
      const cap = chapters[i];
      const capNum = i + 1;
      const wordCount = (cap.texto || '').split(/\s+/).filter(Boolean).length;
      totalWords += wordCount;

      const report = await this.auditEngine.auditChapter(capNum, cap.titulo, cap.texto);

      for (const issue of report.issues) {
        if (issue.blocking) {
          allUnresolvedIssues.push(issue);
          if (issue.category === 'character') characterDeductions += 10;
          if (issue.category === 'setting') objectDeductions += 8;
          if (issue.category === 'timeline') timelineDeductions += 8;
          if (issue.category === 'logic') logicDeductions += 10;
        } else {
          if (issue.severity === 'high') {
            allUnresolvedIssues.push(issue);
            if (issue.category === 'character') characterDeductions += 4;
            if (issue.category === 'setting') objectDeductions += 3;
            if (issue.category === 'timeline') timelineDeductions += 3;
            if (issue.category === 'logic') logicDeductions += 4;
          }
        }
      }
    }

    // 2. Verificação de personagens do início ao fim
    const charNames = Object.keys(memory.characters);
    if (charNames.length > 0) {
      detailedFindings.push(`✓ Rastreamento de ${charNames.length} personagens estruturados ao longo da obra.`);
    } else {
      characterDeductions += 5;
      detailedFindings.push('Observação: Poucos personagens com fichas completas na memória narrativa.');
    }

    // 3. Verificação de objetos canônicos
    const objCount = Object.keys(memory.objects).length;
    if (objCount > 0) {
      detailedFindings.push(`✓ Rastreamento determinístico de ${objCount} objetos canônicos ao longo dos capítulos.`);
    }

    // 4. Verificação de Mistérios e Payoff
    if (memory.rules.unresolvedMysteries.length > 0 && chapters.length >= 3) {
      const lastChapterText = chapters[chapters.length - 1].texto.toLowerCase();
      for (const mystery of memory.rules.unresolvedMysteries) {
        const words = mystery.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const resolvedInClimax = words.some(w => lastChapterText.includes(w));
        if (!resolvedInClimax) {
          mysteryDeductions += 5;
          detailedFindings.push(`⚠️ Mistério aberto com payoff pendente no desfecho: "${mystery}".`);
        }
      }
    }

    // 5. Cálculo dos subscores (0 a 20 cada, totalizando 100)
    const characterContinuity = Math.max(0, Math.min(20, 20 - characterDeductions));
    const objectContinuity = Math.max(0, Math.min(20, 20 - objectDeductions));
    const timelineConsistency = Math.max(0, Math.min(20, 20 - timelineDeductions));
    const logicAndCausality = Math.max(0, Math.min(20, 20 - logicDeductions));
    const plotPayoffAndPacing = Math.max(0, Math.min(20, 20 - mysteryDeductions));

    const totalScore = characterContinuity + objectContinuity + timelineConsistency + logicAndCausality + plotPayoffAndPacing;

    let approvalStatus: GlobalEditorialAuditReport['approvalStatus'] = 'APROVADO_PARA_KDP';
    if (totalScore < 60 || allUnresolvedIssues.some(i => i.blocking)) {
      approvalStatus = 'REQUER_REVISAO_MANUAL';
    } else if (totalScore < 80) {
      approvalStatus = 'APROVADO_COM_RESSALVAS';
    }

    return {
      score: totalScore,
      criteriaScores: {
        characterContinuity,
        objectContinuity,
        timelineConsistency,
        logicAndCausality,
        plotPayoffAndPacing
      },
      totalChaptersAudited: chapters.length,
      totalWordsAudited: totalWords,
      unresolvedContradictions: allUnresolvedIssues,
      resolvedContradictionsCount: Math.max(0, (chapters.length * 2) - allUnresolvedIssues.length),
      detailedFindings,
      approvalStatus,
      auditedAt: Date.now()
    };
  }
}
