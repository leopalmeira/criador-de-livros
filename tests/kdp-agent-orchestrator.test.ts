import { describe, expect, it } from 'vitest';
import { orchestrateEditorialPlan } from '../src/services/kdp-agents-service';
import { BOOK_THEMES } from '../src/data/book-themes';

const validPlan = (chapterCount: number) => ({
  editorialVision: 'Uma abordagem original, prática e progressiva.',
  readerPromise: 'O leitor aplicará os conceitos com segurança.',
  continuityBible: 'Manter termos, exemplos e progressão coerentes.',
  chapters: Array.from({ length: chapterCount }, (_, index) => ({
    title: `Capítulo ${index + 1}`,
    objective: `Desenvolver o objetivo ${index + 1}.`,
    keyPoints: ['Ponto A', 'Ponto B', 'Ponto C'],
    transition: 'Preparar o próximo passo.'
  }))
});

describe('Orquestrador editorial KDP', () => {
  it('oferece Autoajuda como tema específico para o painel de criação', () => {
    const theme = BOOK_THEMES.find(item => item.label === 'Autoajuda');

    expect(theme?.kind).toBe('nao-ficcao');
    expect(theme?.subthemes).toContain('Hábitos e disciplina');
  });

  it('produz um plano validado e envia o contexto completo ao arquiteto', async () => {
    let capturedPrompt = '';
    const plan = validPlan(3);
    const result = await orchestrateEditorialPlan({
      title: 'Hábitos com Propósito',
      subtitle: 'Um método simples',
      genre: 'Autoajuda',
      language: 'português',
      topic: 'Construção de hábitos',
      theme: 'Autoajuda',
      subtheme: 'Hábitos e disciplina',
      targetReader: 'Adultos',
      promise: 'Criar uma rotina consistente',
      differentiator: 'Exercícios curtos'
    }, 3, async (prompt, options) => {
      capturedPrompt = `${prompt}\n${options.systemInstruction}`;
      return { texto: `\`\`\`json\n${JSON.stringify(plan)}\n\`\`\`` };
    });

    expect(result.chapters).toHaveLength(3);
    expect(capturedPrompt).toContain('Autoajuda');
    expect(capturedPrompt).toContain('Hábitos e disciplina');
    expect(capturedPrompt).toContain('exatamente 3 capítulos');
  });

  it('rejeita planos que não correspondem à quantidade solicitada', async () => {
    await expect(orchestrateEditorialPlan({
      title: 'Plano incompleto',
      subtitle: '',
      genre: 'Autoajuda',
      language: 'português',
      topic: 'Hábitos'
    }, 3, async () => ({ texto: JSON.stringify(validPlan(2)) })))
      .rejects.toThrow('não entregou um plano completo com 3 capítulos');
  });
});
