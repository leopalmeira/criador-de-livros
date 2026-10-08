import { describe, expect, it } from 'vitest';
import { BOOK_TYPE_CONFIGS } from '../src/types/book-project';
import {
  buildPlannerPdf,
  planPlannerPages,
  PLANNER_TRACKS,
  type PlannerPagePlan
} from '../src/services/planner-book-service';

const mockPages = (count: number): PlannerPagePlan[] => Array.from({ length: count }, (_, index) => ({
  pageNumber: index + 1,
  title: `Página ${index + 1}`,
  purpose: 'Organizar a semana.',
  prompts: ['Prioridades', 'Notas', 'Tarefas'],
  layout: 'weekly'
}));

describe('Criação de planners e diários', () => {
  it('disponibiliza pelo menos dez seguimentos e templates específicos de planner e diário', () => {
    expect(PLANNER_TRACKS.length).toBeGreaterThanOrEqual(10);
    expect(BOOK_TYPE_CONFIGS.planner.chapterCount).toEqual([0, 0]);
    expect(BOOK_TYPE_CONFIGS.diary.chapterCount).toEqual([0, 0]);
  });

  it('gera somente a quantidade solicitada de páginas individuais', async () => {
    const planned = mockPages(3);
    const result = await planPlannerPages(
      'weekly-planner',
      'Minha semana',
      3,
      'português',
      async (prompt) => {
        expect(prompt).toContain('somente as páginas para preencher');
        return { texto: JSON.stringify({ pages: planned }) };
      }
    );

    expect(result).toHaveLength(3);
    expect(result.map(page => page.pageNumber)).toEqual([1, 2, 3]);
  });

  it('rejeita plano de páginas incompleto', async () => {
    await expect(planPlannerPages(
      'daily-planner',
      'Agenda diária',
      3,
      'português',
      async () => ({ texto: JSON.stringify({ pages: mockPages(2) }) })
    )).rejects.toThrow('exatamente 3 páginas válidas');
  });

  it('exporta as páginas preenchíveis planejadas em PDF', () => {
    const bytes = buildPlannerPdf('Meu planner', 'Autora', 'weekly-planner', mockPages(2));
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('%PDF');
  });
});
