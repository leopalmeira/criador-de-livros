import { describe, it, expect } from 'vitest';
import { KdpWorkflowGatekeeper, type WorkflowStateSnapshot } from '../src/services/kdp-workflow-gatekeeper';

describe('KdpWorkflowGatekeeper — Guardião Sequencial das 10 Etapas', () => {
  it('1. Retorna nomes corretos para todas as 10 etapas', () => {
    for (let step = 1; step <= 10; step++) {
      const name = KdpWorkflowGatekeeper.getStepName(step);
      expect(name).toBeTruthy();
      expect(name).not.toBe(`Etapa ${step}`);
    }
  });

  it('2. autoFillStepRequirements preenche requisitos contextuais para Ficção/Thriller', () => {
    const snapshot: WorkflowStateSnapshot = {
      temaSelecionado: 'Thriller psicológico',
      subtemaSelecionado: 'Obsessão',
      wizardStep: 1,
      completedSteps: []
    };

    const patch1 = KdpWorkflowGatekeeper.autoFillStepRequirements(1, snapshot);
    expect(patch1.stanceTopic).toContain('tensão psicológica');

    const patch3 = KdpWorkflowGatekeeper.autoFillStepRequirements(3, snapshot);
    expect(patch3.titulo).toBeTruthy();
    expect(patch3.subtitulo).toBeTruthy();

    const patch4 = KdpWorkflowGatekeeper.autoFillStepRequirements(4, snapshot);
    expect(patch4.resourceNotes).toContain('cliffhangers');

    const patch5 = KdpWorkflowGatekeeper.autoFillStepRequirements(5, snapshot);
    expect(patch5.autor).toBeTruthy();
    expect(patch5.authorOfficialBio).toContain('mente humana');
    expect(patch5.authorBackground).toContain('psicologia humana');

    const patch6 = KdpWorkflowGatekeeper.autoFillStepRequirements(6, snapshot);
    expect(patch6.uniqueAngle).toBeTruthy();
    expect(patch6.bookPromise).toBeTruthy();
    expect(patch6.focusTags).toContain('Storytelling Imersivo');

    const patch7 = KdpWorkflowGatekeeper.autoFillStepRequirements(7, snapshot);
    expect(patch7.variedOutlinePreview?.length).toBeGreaterThanOrEqual(4);

    const patch9 = KdpWorkflowGatekeeper.autoFillStepRequirements(9, snapshot);
    expect(patch9.bookCommercialDescription).toContain('THRILLER');
  });

  it('3. autoFillStepRequirements preenche requisitos contextuais para Não-Ficção', () => {
    const snapshot: WorkflowStateSnapshot = {
      temaSelecionado: 'Desenvolvimento Pessoal',
      subtemaSelecionado: 'Hábitos Atômicos',
      wizardStep: 1,
      completedSteps: []
    };

    const patch1 = KdpWorkflowGatekeeper.autoFillStepRequirements(1, snapshot);
    expect(patch1.stanceTopic).toContain('rejeita o conteúdo raso');

    const patch4 = KdpWorkflowGatekeeper.autoFillStepRequirements(4, snapshot);
    expect(patch4.resourceNotes).toContain('Anti-Alucinação');

    const patch9 = KdpWorkflowGatekeeper.autoFillStepRequirements(9, snapshot);
    expect(patch9.bookCommercialDescription).toContain('método definitivo');
  });

  it('4. validateStep exige tema na Etapa 1 e título na Etapa 3', () => {
    const emptyState: WorkflowStateSnapshot = {
      temaSelecionado: '',
      genero: '',
      titulo: ''
    };

    const v1 = KdpWorkflowGatekeeper.validateStep(1, emptyState);
    expect(v1.ok).toBe(false);
    expect(v1.reason).toContain('Etapa 1 incompleta');

    const withTheme: WorkflowStateSnapshot = {
      temaSelecionado: 'Thriller psicológico',
      titulo: ''
    };
    const v3 = KdpWorkflowGatekeeper.validateStep(3, withTheme);
    expect(v3.ok).toBe(false);
    expect(v3.reason).toContain('Etapa 3 incompleta');

    const withTitle: WorkflowStateSnapshot = {
      temaSelecionado: 'Thriller psicológico',
      titulo: 'A Garota Que Sabia Demais'
    };
    const v3Ok = KdpWorkflowGatekeeper.validateStep(3, withTitle);
    expect(v3Ok.ok).toBe(true);
  });

  it('5. buildStructuredChaptersFromOutline gera capítulos densos e estruturados', () => {
    const state: WorkflowStateSnapshot = {
      temaSelecionado: 'Thriller psicológico',
      subtemaSelecionado: 'Obsessão',
      titulo: 'O Enigma Silencioso'
    };

    const chapters = KdpWorkflowGatekeeper.buildStructuredChaptersFromOutline(state);
    expect(chapters.length).toBeGreaterThanOrEqual(4);
    expect(chapters[0].titulo).toBeTruthy();
    expect(chapters[0].texto).toContain('O Enigma Silencioso');
  });
});
