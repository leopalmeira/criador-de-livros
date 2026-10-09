import { describe, expect, it } from 'vitest';
import {
  orchestrateEditorialPlan,
  extrairJsonPlanoEditorial,
  buildFallbackEditorialPlan
} from '../src/services/kdp-agents-service';
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

  it('oferece Não ficção como categoria selecionável com subtemas abrangentes', () => {
    const theme = BOOK_THEMES.find(item => item.label === 'Não ficção');

    expect(theme?.kind).toBe('nao-ficcao');
    expect(theme?.subthemes).toContain('Autoajuda e desenvolvimento pessoal');
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

  it('extrai JSON com texto conversacional antes e depois do bloco markdown', async () => {
    const raw = `Certamente! Aqui está a arquitetura planejada para o seu livro:
\`\`\`json
${JSON.stringify(validPlan(3))}
\`\`\`
Espero que este plano seja útil para a sua produção editorial!`;

    const result = await orchestrateEditorialPlan({
      title: 'Hábitos com Propósito',
      subtitle: 'Um método simples',
      genre: 'Autoajuda',
      language: 'português',
      topic: 'Construção de hábitos'
    }, 3, async () => ({ texto: raw }));

    expect(result.chapters).toHaveLength(3);
    expect(result.chapters[0].title).toBe('Capítulo 1');
  });

  it('tolera trailing commas e normaliza capítulos com keyPoints incompletos', async () => {
    const jsonWithTrailingComma = `{
      "editorialVision": "Visão clara.",
      "readerPromise": "Promessa sólida.",
      "continuityBible": "Continuidade impecável.",
      "chapters": [
        {
          "title": "Capítulo 1",
          "objective": "Objetivo 1",
          "keyPoints": ["Ponto único"],
          "transition": "Próximo passo",
        },
      ],
    }`;

    const parsed = extrairJsonPlanoEditorial(jsonWithTrailingComma);
    expect(parsed.chapters).toHaveLength(1);
    expect(parsed.chapters[0].title).toBe('Capítulo 1');
  });

  it('gera plano editorial de segurança consistente via buildFallbackEditorialPlan', () => {
    const fallback = buildFallbackEditorialPlan({
      title: 'O Poder da Disciplina',
      subtitle: 'Como Vencer a Procrastinação',
      genre: 'Autoajuda',
      language: 'português',
      topic: 'Disciplina diária',
      theme: 'Autoajuda',
      targetReader: 'Jovens adultos e profissionais'
    }, 5);

    expect(fallback.chapters).toHaveLength(5);
    expect(fallback.editorialVision).toContain('O Poder da Disciplina');
    expect(fallback.chapters[0].keyPoints.length).toBeGreaterThanOrEqual(3);
    expect(fallback.chapters[4].transition).toContain('Conclusão');
  });
});
