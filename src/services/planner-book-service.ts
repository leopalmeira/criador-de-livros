import { jsPDF } from 'jspdf';
import { chamarGeminiTexto } from './kdp-ai-engine';

export const PLANNER_TRACKS = [
  { id: 'daily-planner', label: 'Agenda diária', description: 'Prioridades, compromissos, horários e notas.' },
  { id: 'weekly-planner', label: 'Planner semanal', description: 'Visão da semana, metas e tarefas por dia.' },
  { id: 'monthly-planner', label: 'Planner mensal', description: 'Calendário, metas do mês e acompanhamento.' },
  { id: 'academic-planner', label: 'Planner acadêmico', description: 'Aulas, provas, leituras e prazos.' },
  { id: 'project-planner', label: 'Planner de projetos', description: 'Etapas, responsáveis, prazos e próximos passos.' },
  { id: 'habit-tracker', label: 'Rastreador de hábitos', description: 'Hábitos, frequência, metas e revisão.' },
  { id: 'gratitude-journal', label: 'Diário de gratidão', description: 'Registros e reflexões diárias de gratidão.' },
  { id: 'self-reflection-journal', label: 'Diário de autoconhecimento', description: 'Perguntas de reflexão, valores e aprendizados.' },
  { id: 'wellness-journal', label: 'Diário de bem-estar', description: 'Humor, sono, autocuidado e rotina saudável.' },
  { id: 'budget-planner', label: 'Planner financeiro', description: 'Orçamento, despesas, metas e revisão financeira.' }
] as const;

export type PlannerTrackId = typeof PLANNER_TRACKS[number]['id'];
export type PlannerLayout = 'daily' | 'weekly' | 'monthly' | 'tracker' | 'reflection' | 'budget' | 'project' | 'notes';

export interface PlannerPagePlan {
  pageNumber: number;
  title: string;
  purpose: string;
  prompts: string[];
  layout: PlannerLayout;
}

export interface PlannerAiCaller {
  (prompt: string, options: { systemInstruction: string; temperature: number; maxTokens: number }): Promise<{ texto: string }>;
}

const VALID_LAYOUTS = new Set<PlannerLayout>([
  'daily', 'weekly', 'monthly', 'tracker', 'reflection', 'budget', 'project', 'notes'
]);

export async function planPlannerPages(
  trackId: PlannerTrackId,
  title: string,
  pageCount: number,
  language = 'português',
  aiCaller: PlannerAiCaller = chamarGeminiTexto
): Promise<PlannerPagePlan[]> {
  const track = PLANNER_TRACKS.find(item => item.id === trackId);
  if (!track) throw new Error('Selecione um tipo de planner válido.');
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 120) {
    throw new Error('A quantidade de páginas precisa estar entre 1 e 120.');
  }

  const response = await aiCaller(
    `Planeje exatamente ${pageCount} páginas internas para "${title}".
Tipo: ${track.label}. Foco: ${track.description}
Idioma: ${language}.
As páginas devem ser utilizáveis e variadas, sem repetir o mesmo conjunto de prompts. Cada página precisa de título, objetivo curto, 2 a 5 rótulos ou perguntas breves e um layout permitido.
Retorne somente JSON válido no formato {"pages":[{"pageNumber":1,"title":"...","purpose":"...","prompts":["..."],"layout":"daily"}]}.
Layouts permitidos: daily, weekly, monthly, tracker, reflection, budget, project, notes.
Não crie capítulos, prólogo, sumário ou texto corrido. Gere somente as páginas para preencher.`,
    {
      systemInstruction: `Você é um designer editorial de planners e diários impressos. Crie páginas claras, úteis, variadas e prontas para impressão KDP. Preserve áreas amplas em branco para escrita. Use português natural quando esse for o idioma informado. Nunca invente datas fixas ou feriados.`,
      temperature: 0.45,
      maxTokens: Math.min(7000, 500 + pageCount * 95)
    }
  );

  const jsonText = response.texto.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('A IA retornou um plano de páginas inválido. Gere novamente.');
  }

  const pages = (parsed as { pages?: unknown } | null)?.pages;
  if (
    !Array.isArray(pages)
    || pages.length !== pageCount
    || pages.some((page, index) => {
      const item = page as Partial<PlannerPagePlan> | null;
      return !item
        || item.pageNumber !== index + 1
        || typeof item.title !== 'string'
        || typeof item.purpose !== 'string'
        || !Array.isArray(item.prompts)
        || item.prompts.length < 2
        || item.prompts.some(prompt => typeof prompt !== 'string')
        || !VALID_LAYOUTS.has(item.layout as PlannerLayout);
    })
  ) {
    throw new Error(`O plano precisa conter exatamente ${pageCount} páginas válidas para o planner.`);
  }

  return pages as PlannerPagePlan[];
}

export function buildPlannerPdf(
  title: string,
  author: string,
  trackId: PlannerTrackId,
  pages: PlannerPagePlan[]
): Uint8Array {
  const track = PLANNER_TRACKS.find(item => item.id === trackId);
  if (!track || pages.length === 0) throw new Error('Gere as páginas do planner antes de exportar.');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', compress: true });
  const width = 612;
  const height = 792;
  const margin = 42;

  pages.forEach((page, index) => {
    if (index > 0) doc.addPage();
    doc.setFillColor(250, 250, 248);
    doc.rect(0, 0, width, height, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(margin, 38, width - margin, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(track.label.toUpperCase(), margin, 30);
    doc.text(title.slice(0, 52), width - margin, 30, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(21);
    doc.setTextColor(30, 41, 59);
    const titleLines = doc.splitTextToSize(page.title, width - margin * 2);
    doc.text(titleLines.slice(0, 2), margin, 78);
    let y = 92 + Math.min(2, titleLines.length) * 23;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    const purposeLines = doc.splitTextToSize(page.purpose, width - margin * 2);
    doc.text(purposeLines.slice(0, 2), margin, y);
    y += Math.max(34, purposeLines.slice(0, 2).length * 14 + 12);

    const usableBottom = height - 54;
    const labels = page.prompts.slice(0, 5);
    const sectionHeight = Math.max(94, (usableBottom - y) / Math.max(labels.length, 1));

    labels.forEach((label, labelIndex) => {
      const labelY = y + labelIndex * sectionHeight;
      if (labelY > usableBottom - 18) return;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(label, width - margin * 2).slice(0, 1), margin, labelY + 12);

      const startY = labelY + 26;
      const endY = Math.min(labelY + sectionHeight - 8, usableBottom);
      if (page.layout === 'tracker' || page.layout === 'budget') {
        const columns = page.layout === 'budget' ? 3 : 7;
        const cellWidth = (width - margin * 2) / columns;
        doc.setDrawColor(203, 213, 225);
        for (let col = 0; col <= columns; col++) {
          doc.line(margin + col * cellWidth, startY, margin + col * cellWidth, endY);
        }
        for (let rowY = startY; rowY <= endY; rowY += 25) {
          doc.line(margin, rowY, width - margin, rowY);
        }
      } else {
        doc.setDrawColor(226, 232, 240);
        const step = page.layout === 'daily' ? 24 : 27;
        for (let lineY = startY; lineY <= endY; lineY += step) {
          doc.line(margin, lineY, width - margin, lineY);
        }
      }
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${author}  •  ${page.pageNumber}`, width / 2, height - 24, { align: 'center' });
  });

  return new Uint8Array(doc.output('arraybuffer'));
}
