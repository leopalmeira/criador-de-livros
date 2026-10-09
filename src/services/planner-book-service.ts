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

  const parsed = extrairJsonPlannerPages(response.texto);
  const rawPages = (parsed as { pages?: unknown } | null)?.pages;

  if (!Array.isArray(rawPages) || rawPages.length !== pageCount) {
    throw new Error(`O plano precisa conter exatamente ${pageCount} páginas válidas para o planner.`);
  }

  // Normalização defensiva: garante que pequenos desvios de layout ou prompts da IA sejam reparados
  const normalizedPages: PlannerPagePlan[] = rawPages.map((page: any, index: number) => {
    const pageNumber = index + 1;
    const title = typeof page?.title === 'string' && page.title.trim()
      ? page.title.trim()
      : `Página ${pageNumber}: ${track.label}`;

    const purpose = typeof page?.purpose === 'string' && page.purpose.trim()
      ? page.purpose.trim()
      : `Registro e acompanhamento para ${track.label}.`;

    let prompts: string[] = [];
    if (Array.isArray(page?.prompts)) {
      prompts = page.prompts
        .filter((p: any) => typeof p === 'string' && p.trim().length > 0)
        .map((p: string) => p.trim());
    }

    if (prompts.length < 2) {
      prompts.push('Prioridades e objetivos imediatos');
      prompts.push('Notas e observações de progresso');
    }

    const layoutCandidate = typeof page?.layout === 'string' ? page.layout.toLowerCase() : '';
    const layout: PlannerLayout = VALID_LAYOUTS.has(layoutCandidate as PlannerLayout)
      ? (layoutCandidate as PlannerLayout)
      : (trackId.includes('daily') ? 'daily'
         : trackId.includes('weekly') ? 'weekly'
         : trackId.includes('monthly') ? 'monthly'
         : trackId.includes('tracker') ? 'tracker'
         : trackId.includes('journal') ? 'reflection'
         : trackId.includes('budget') ? 'budget'
         : trackId.includes('project') ? 'project' : 'notes');

    return {
      pageNumber,
      title,
      purpose,
      prompts,
      layout
    };
  });

  return normalizedPages;
}

/**
 * Extrai e repara robustamente JSON retornado pela IA para páginas de planner
 */
export function extrairJsonPlannerPages(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('A IA retornou um plano de páginas vazio.');
  }

  let text = rawText.trim();
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  } else {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1).trim();
    }
  }

  text = text.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  text = text.replace(/\/\/[^\n\r]*/g, '');
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');
  text = text.replace(/,\s*([\]}])/g, '$1');

  try {
    return JSON.parse(text);
  } catch {
    try {
      let repaired = text;
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;

      if (repaired.endsWith(',')) repaired = repaired.slice(0, -1);
      for (let i = 0; i < (openBrackets - closeBrackets); i++) repaired += ']';
      for (let i = 0; i < (openBraces - closeBraces); i++) repaired += '}';
      repaired = repaired.replace(/,\s*([\]}])/g, '$1');

      return JSON.parse(repaired);
    } catch {
      throw new Error('A IA retornou um plano de páginas inválido. Gere novamente.');
    }
  }
}

/**
 * Construtor determinístico de páginas para planners e diários (Auto-Recuperação)
 */
export function buildFallbackPlannerPages(
  trackId: PlannerTrackId,
  title: string,
  pageCount: number
): PlannerPagePlan[] {
  const track = PLANNER_TRACKS.find(item => item.id === trackId) || PLANNER_TRACKS[0];

  const templatesPorTrack: Record<PlannerTrackId, Array<{ title: string; purpose: string; prompts: string[]; layout: PlannerLayout }>> = {
    'daily-planner': [
      {
        title: 'Planejamento Diário & Foco Principal',
        purpose: 'Definir as 3 maiores vitórias do dia e organizar blocos de tempo.',
        prompts: ['Top 3 Prioridades Inegociáveis', 'Blocos de Horários (Manhã / Tarde / Noite)', 'Tarefas Secundárias', 'Notas e Aprendizados do Dia'],
        layout: 'daily'
      },
      {
        title: 'Rotina Diária & Execução',
        purpose: 'Mapear compromissos com precisão e controlar energia.',
        prompts: ['Compromissos Agendados', 'Checklist de Atividades Rápidas', 'Hábitos & Hidratação', 'Vitória do Dia'],
        layout: 'daily'
      }
    ],
    'weekly-planner': [
      {
        title: 'Visão da Semana & Grande Objetivo',
        purpose: 'Alinhar metas semanais e distribuir esforços de segunda a domingo.',
        prompts: ['Meta Mestra da Semana', 'Projetos em Andamento', 'Prioridades de Segunda a Quarta', 'Prioridades de Quinta a Domingo'],
        layout: 'weekly'
      },
      {
        title: 'Revisão Semanal & Ajustes',
        purpose: 'Avaliar o que funcionou e preparar a próxima semana.',
        prompts: ['O Que Foi Concluído com Sucesso', 'Gargalos e O Que Ficou Pendente', 'Hábitos Mantidos', 'Melhoria para a Próxima Semana'],
        layout: 'weekly'
      }
    ],
    'monthly-planner': [
      {
        title: 'Panorama Mensal & Metas Estratégicas',
        purpose: 'Planejar o mês com foco em objetivos claros e datas importantes.',
        prompts: ['Objetivos Principais do Mês', 'Prazos e Datas Críticas', 'Projetos Pessoais e Profissionais', 'Orçamento e Metas Financeiras'],
        layout: 'monthly'
      },
      {
        title: 'Fechamento do Mês & Conquistas',
        purpose: 'Auditar evolução e celebrar conquistas.',
        prompts: ['Maiores Conquistas do Mês', 'Lições Aprendidas', 'Hábitos mais Consistentes', 'Metas Prioritárias para o Próximo Mês'],
        layout: 'monthly'
      }
    ],
    'academic-planner': [
      {
        title: 'Aulas, Leituras & Prazos Acadêmicos',
        purpose: 'Organizar disciplinas, capítulos e entregas.',
        prompts: ['Aulas & Seminários da Semana', 'Leituras e Fichamentos Obrigatórios', 'Prazos de Trabalhos', 'Dúvidas para Tirar com Professores'],
        layout: 'project'
      },
      {
        title: 'Preparação para Provas & Revisão Espaçada',
        purpose: 'Cronograma de estudos e autoavaliação.',
        prompts: ['Tópicos Difíceis a Revisar', 'Exercícios e Questões Práticas', 'Cronograma de Provas', 'Pontos Fortes e Fracos'],
        layout: 'tracker'
      }
    ],
    'project-planner': [
      {
        title: 'Escopo do Projeto & Entregáveis',
        purpose: 'Definir claramente o resultado esperado e os marcos.',
        prompts: ['Objetivo Final e Critérios de Sucesso', 'Marcos Principais (Milestones)', 'Recursos e Ferramentas Necessárias', 'Primeiros Passos Imediatos'],
        layout: 'project'
      },
      {
        title: 'Acompanhamento de Etapas & Riscos',
        purpose: 'Gerenciar progresso diário e antecipar bloqueios.',
        prompts: ['Etapas Concluídas', 'Próximos Passos Críticos', 'Gargalos e Riscos Identificados', 'Plano de Ação Corretivo'],
        layout: 'project'
      }
    ],
    'habit-tracker': [
      {
        title: 'Matriz Mensal de Hábitos',
        purpose: 'Rastrear consistência diária de rotinas chave.',
        prompts: ['Hábitos Fundamentais (Corpo, Mente, Foco)', 'Gatilho / Momento de Execução', 'Recompensa e Reforço Positivo', 'Sequência Máxima Atingida'],
        layout: 'tracker'
      },
      {
        title: 'Análise de Consistência & Ajustes',
        purpose: 'Descobrir padrões de recaída e fortalecer a disciplina.',
        prompts: ['Hábitos com 80%+ de Adesão', 'Onde Houve Maior Resistência e Por Quê', 'Ajuste de Ambiente ou Horário', 'Compromisso Renovado'],
        layout: 'tracker'
      }
    ],
    'gratitude-journal': [
      {
        title: 'Diário de Gratidão & Conexão',
        purpose: 'Cultivar presença e apreço pelas pequenas vitórias.',
        prompts: ['3 Motivos pelos Quais Sou Grato Hoje', 'Uma Pessoa que Fez Minha Vida Melhor Hoje', 'O Momento Mais Pacífico do Dia', 'Uma Bênção Inesperada'],
        layout: 'reflection'
      },
      {
        title: 'Reflexão Noturna & Serenidade',
        purpose: 'Encerrar o dia com pensamentos positivos e paz mental.',
        prompts: ['O Que Deu Certo Hoje', 'Uma Lição Valiosa que Aprendi', 'Como Fui Gentil Comigo e com os Outros', 'Afirmação Positiva para Amanhã'],
        layout: 'reflection'
      }
    ],
    'self-reflection-journal': [
      {
        title: 'Autoconhecimento & Clareza Interna',
        purpose: 'Mapear sentimentos, valores e direções de vida.',
        prompts: ['Como Estou Me Sentindo Realmente Hoje', 'O Que Me Trouxe Energia vs O Que Me Drenou', 'Um Limite que Precisei Impor', 'O Que Minha Voz Interna Está Dizendo'],
        layout: 'reflection'
      },
      {
        title: 'Crescimento Pessoal & Decisões',
        purpose: 'Analisar dilemas e reafirmar identidade.',
        prompts: ['Um Desafio Recente e Como Respondi', 'O Que Me Dá Medo e Por Quê', 'Uma Atitude Corajosa que Devo Tomar', 'Quem Desejo Me Tornar nos Próximos Meses'],
        layout: 'reflection'
      }
    ],
    'wellness-journal': [
      {
        title: 'Registro de Bem-Estar & Saúde Integral',
        purpose: 'Monitorar sono, disposição, nutrição e humor.',
        prompts: ['Qualidade do Sono & Nível de Energia ao Acordar', 'Alimentação Consciente & Hidratação', 'Movimento Corporal / Exercício', 'Momento de Silêncio e Respiração'],
        layout: 'reflection'
      },
      {
        title: 'Equilíbrio Emocional & Autocuidado',
        purpose: 'Cuidar da mente e desacelerar o ritmo.',
        prompts: ['Nível de Estresse (1 a 10) e Causas', 'O Que Fiz por Mim Hoje', 'Sintomas Físicos ou Tensões Observadas', 'Intenção Saudável para Amanhã'],
        layout: 'reflection'
      }
    ],
    'budget-planner': [
      {
        title: 'Planejamento Financeiro & Orçamento',
        purpose: 'Mapear entradas, custos essenciais e meta de poupança.',
        prompts: ['Receitas Previstas do Período', 'Despesas Fixas Essenciais', 'Despesas Variáveis Limite', 'Meta de Aporte / Poupança'],
        layout: 'budget'
      },
      {
        title: 'Auditoria de Gastos & Metas Financeiras',
        purpose: 'Analisar fluxo de caixa real e cortar desperdícios.',
        prompts: ['Gastos Supérfluos Identificados', 'Economias Alcançadas', 'Progresso na Meta Financeira', 'Ajustes para o Próximo Mês'],
        layout: 'budget'
      }
    ]
  };

  const lista = templatesPorTrack[trackId] || templatesPorTrack['weekly-planner'];
  const pages: PlannerPagePlan[] = [];

  for (let i = 0; i < pageCount; i++) {
    const tmpl = lista[i % lista.length];
    const sufixo = pageCount > lista.length ? ` (Semana ${Math.floor(i / lista.length) + 1})` : '';
    pages.push({
      pageNumber: i + 1,
      title: `${tmpl.title}${sufixo}`,
      purpose: tmpl.purpose,
      prompts: [...tmpl.prompts],
      layout: tmpl.layout
    });
  }

  return pages;
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
