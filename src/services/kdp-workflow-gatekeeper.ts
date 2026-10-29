// ============================================================================
// KDP WORKFLOW GATEKEEPER (GUARDIÃO SEQUENCIAL DAS 10 ETAPAS EDITORIAIS)
// Garante que o fluxo de criação do livro respeite rigorosamente a ordem
// das etapas (1 a 10), só liberando a próxima etapa quando a atual estiver
// concluída, e oferecendo preenchimento inteligente contextualizado por gênero
// (Ficção/Thriller vs Não-Ficção) para um avanço fluido e sem travamentos.
// ============================================================================

import { KdpTitleSuggestionEngine } from './kdp-title-suggestion-engine';
import type { MarketReference } from './project-state';

export interface WorkflowOutlineChapter {
  num: number;
  title: string;
  sectionsCount: number;
  targetWords: number;
  focus: string;
}

export interface WorkflowStateSnapshot {
  wizardStep?: number;
  completedSteps?: number[];
  temaSelecionado?: string;
  subtemaSelecionado?: string;
  genero?: string;
  idioma?: string;
  estadoEua?: string;
  faixaEtaria?: string;
  stanceTopic?: string;
  authorTone?: string;
  selectedInspirationAsins?: string[];
  marketReferences?: MarketReference[];
  titulo?: string;
  subtitulo?: string;
  resourceNotes?: string;
  autor?: string;
  authorType?: string;
  authorBackground?: string;
  authorOfficialBio?: string;
  uniqueAngle?: string;
  bookPromise?: string;
  targetReader?: string;
  focusTags?: string[];
  proposedBookSummary?: string;
  topico?: string;
  paginasAlvo?: number;
  maxCapitulos?: number;
  variedOutlinePreview?: WorkflowOutlineChapter[];
  hasGeneratedChapters?: boolean;
  chaptersCount?: number;
  capitulosCount?: number;
  bookCommercialDescription?: string;
  hasCover?: boolean;
  hasBackCover?: boolean;
}

export interface StepValidationResult {
  ok: boolean;
  step: number;
  stepName: string;
  reason?: string;
  autoFilledPatches?: Partial<WorkflowStateSnapshot>;
}

export const KDP_WORKFLOW_STEPS: Array<{ step: number; name: string; sub: string }> = [
  { step: 1, name: 'Pesquisa & Tese', sub: 'Tema & Stance' },
  { step: 2, name: 'Análise Top 100', sub: 'Bestsellers KDP' },
  { step: 3, name: 'Título do Livro', sub: 'Título & Subtítulo' },
  { step: 4, name: 'Recursos & Fontes', sub: 'Links & Notas' },
  { step: 5, name: 'Persona & Bio', sub: 'Autor & Histórico' },
  { step: 6, name: 'Proposta & Foco', sub: 'Diferencial & Tags' },
  { step: 7, name: 'Detalhes & Sumário', sub: 'Estrutura Anti-IA' },
  { step: 8, name: 'Escrita & Dados', sub: 'Capítulos & Estudos' },
  { step: 9, name: 'Descrição', sub: 'Sinopse Comercial' },
  { step: 10, name: 'Capa & Contracapa', sub: 'Prompts em Sintonia' }
];

export class KdpWorkflowGatekeeper {
  /**
   * Retorna o nome amigável da etapa (1 a 10).
   */
  public static getStepName(step: number): string {
    return KDP_WORKFLOW_STEPS.find(s => s.step === step)?.name || `Etapa ${step}`;
  }

  /**
   * Preenche automaticamente os requisitos mínimos e inteligentes de uma etapa
   * para permitir o avanço seguro do fluxo de 1 a 10 sem travar a esteira.
   */
  public static autoFillStepRequirements(
    step: number,
    state: WorkflowStateSnapshot
  ): Partial<WorkflowStateSnapshot> {
    const patches: Partial<WorkflowStateSnapshot> = {};
    const theme = (state.temaSelecionado || state.genero || 'Desenvolvimento Pessoal').trim();
    const sub = (state.subtemaSelecionado || '').trim();
    const isFiction = KdpTitleSuggestionEngine.isFictionContext(theme, sub, state.titulo || '');

    switch (step) {
      case 1: {
        if (!state.temaSelecionado) patches.temaSelecionado = theme;
        if (!state.subtemaSelecionado) patches.subtemaSelecionado = sub || (isFiction ? 'Obsessão & Manipulação' : 'Hábitos & Foco');
        if (!state.stanceTopic || state.stanceTopic.trim().length < 8) {
          patches.stanceTopic = isFiction
            ? `Narrativa focada em tensão psicológica crescente, personagens moralmente ambíguos e reviravoltas imprevisíveis.`
            : `Esta obra rejeita o conteúdo raso e entrega um roteiro denso e acionável para o leitor.`;
        }
        break;
      }

      case 2: {
        const asins = state.selectedInspirationAsins || [];
        if (asins.length === 0) {
          patches.selectedInspirationAsins = ['B08W5B4YV8'];
        }
        break;
      }

      case 3: {
        if (!state.titulo || state.titulo.trim().length < 2) {
          const suggestions = KdpTitleSuggestionEngine.getSimilarTitles(sub || theme, theme, sub);
          patches.titulo = suggestions[0]?.title || `O Novo Código de ${sub || theme}`;
          patches.subtitulo = suggestions[0]?.subtitle || 'Como alcançar resultados superiores com o método definitivo';
        } else if (!state.subtitulo || state.subtitulo.trim().length < 3) {
          const suggestions = KdpTitleSuggestionEngine.getSimilarTitles(state.titulo, theme, sub);
          patches.subtitulo = suggestions[0]?.subtitle || 'Como alcançar resultados superiores com o método definitivo';
        }
        break;
      }

      case 4: {
        if (!state.resourceNotes || state.resourceNotes.trim().length < 10) {
          patches.resourceNotes = this.buildGenreResourceNotes(state);
        }
        break;
      }

      case 5: {
        const bio = this.buildGenreAuthorBio(state);
        if (!state.autor || state.autor.trim().length < 2) patches.autor = bio.autor;
        if (!state.authorBackground || state.authorBackground.trim().length < 3) patches.authorBackground = bio.background;
        if (!state.authorOfficialBio || state.authorOfficialBio.trim().length < 15) patches.authorOfficialBio = bio.bio;
        break;
      }

      case 6: {
        const prop = this.buildGenreProposalAndFocus(state);
        if (!state.uniqueAngle || state.uniqueAngle.trim().length < 5) patches.uniqueAngle = prop.uniqueAngle;
        if (!state.bookPromise || state.bookPromise.trim().length < 5) patches.bookPromise = prop.bookPromise;
        if (!state.targetReader || state.targetReader.trim().length < 5) patches.targetReader = prop.targetReader;
        if (!state.proposedBookSummary || state.proposedBookSummary.trim().length < 10) patches.proposedBookSummary = prop.proposedBookSummary;
        if (!state.focusTags || state.focusTags.length === 0) patches.focusTags = prop.focusTags;
        break;
      }

      case 7: {
        const prop = this.buildGenreProposalAndFocus(state);
        if (!state.topico || state.topico.trim().length < 5) {
          patches.topico = `${state.stanceTopic || prop.uniqueAngle} — ${prop.bookPromise}`.trim();
        }
        if (!state.variedOutlinePreview || state.variedOutlinePreview.length < 3) {
          patches.variedOutlinePreview = this.buildGenreVariedOutline(
            theme,
            sub,
            state.titulo || '',
            state.maxCapitulos || 8,
            state.paginasAlvo || 120
          );
        }
        break;
      }

      case 8: {
        patches.chaptersCount = state.chaptersCount || state.capitulosCount || 8;
        break;
      }

      case 9: {
        if (!state.bookCommercialDescription || state.bookCommercialDescription.trim().length < 20) {
          patches.bookCommercialDescription = this.buildGenreCommercialDescription(state);
        }
        break;
      }

      case 10: {
        patches.hasCover = true;
        patches.hasBackCover = true;
        break;
      }
    }

    return patches;
  }

  /**
   * Gera um Sumário Estruturado com Ritmo Variado 100% coerente com o gênero (Ficção/Thriller vs Não-Ficção).
   */
  public static buildGenreVariedOutline(
    themeOrGenre: string,
    subtheme: string = '',
    bookTitle: string = '',
    numCaps: number = 8,
    paginasAlvo: number = 120
  ): WorkflowOutlineChapter[] {
    const isFiction = KdpTitleSuggestionEngine.isFictionContext(themeOrGenre, subtheme, bookTitle);
    const safeCaps = Math.max(4, Math.min(20, numCaps || 8));
    const baseWords = Math.round(((paginasAlvo || 120) * 260) / safeCaps);

    if (isFiction) {
      const thrillerTemplates = [
        { title: 'O Silêncio Antes da Tempestade', secs: 3, mult: 0.9, focus: 'Apresentação atmosférica da protagonista, rotina aparentemente perfeita e o primeiro detalhe perturbador.' },
        { title: 'A Fresta na Porta Trancada', secs: 3, mult: 1.0, focus: 'Descoberta de uma pista contraditória dentro de casa que desperta a desconfiança inicial.' },
        { title: 'O Que Ninguém Viu naquela Noite', secs: 4, mult: 1.15, focus: 'Flashback revelador sobre o pacto do passado e introdução do segundo ponto de vista.' },
        { title: 'Sinais de Observação Oculta', secs: 3, mult: 0.95, focus: 'Escalada de paranoia psicológica: objetos fora do lugar e mensagens anônimas.' },
        { title: 'O Álibi Quebrado', secs: 4, mult: 1.2, focus: 'Confronto tenso onde a pessoa de maior confiança mente deliberadamente sobre onde estava.' },
        { title: 'A Primeira Virada: A Vítima Não Era Quem Parecia', secs: 4, mult: 1.25, focus: 'Plot twist de meio de livro que inverte a percepção entre caçador e presa.' },
        { title: 'Encurralada nas Próprias Mentiras', secs: 3, mult: 1.0, focus: 'Cerco se fecha; o relógio corre contra a protagonista enquanto evidências a incriminam.' },
        { title: 'A Última Revelação Depois da Meia-Noite', secs: 4, mult: 1.15, focus: 'Clímax claustrofóbico com acerto de contas visceral e a verdade nua por trás da obsessão.' },
        { title: 'Cinzas e Segredos que Resta Guardar', secs: 2, mult: 0.85, focus: 'Desfecho eletrizante com gancho psicológico final que permanece na mente do leitor.' },
        { title: 'O Eco da Última Testemunha', secs: 3, mult: 0.95, focus: 'Consequências irreversíveis da noite decisiva e a nova face dos sobreviventes.' }
      ];

      return Array.from({ length: safeCaps }, (_, i) => {
        const tpl = thrillerTemplates[i % thrillerTemplates.length];
        return {
          num: i + 1,
          title: i < thrillerTemplates.length ? tpl.title : `Ato ${i + 1}: ${tpl.title}`,
          sectionsCount: tpl.secs,
          targetWords: Math.round(baseWords * tpl.mult),
          focus: tpl.focus
        };
      });
    }

    // Não-Ficção (Desenvolvimento Pessoal, Finanças, Saúde, Negócios)
    const nonFictionTemplates = [
      { title: 'O Ponto Cego: Desconstrução do Mito e Fundação Factual', secs: 3, mult: 0.9, focus: 'Apresentação do dilema central com evidências científicas e quebra da crença convencional.' },
      { title: 'A Anatomia Oculta: Por que Abordagens Tradicionais Falham', secs: 3, mult: 1.0, focus: 'Diagnóstico preciso dos erros invisíveis que drenam energia e travam resultados.' },
      { title: 'O Ponto de Inflexão: A Nova Metodologia Comprovada', secs: 4, mult: 1.2, focus: 'Arquitetura passo a passo do sistema central acionável no cotidiano.' },
      { title: 'Micro-Vitórias: Aplicação Diária em Menos de 15 Minutos', secs: 3, mult: 0.95, focus: 'Protocolo prático de baixo atrito para implementação imediata sem resistência.' },
      { title: 'Os 7 Erros Fatais que Sabotam a Consistência', secs: 3, mult: 1.0, focus: 'Identificação preventiva de armadilhas mentais, emocionais e de ambiente.' },
      { title: 'Estudos de Caso Reais & Aceleradores de Performance', secs: 4, mult: 1.15, focus: 'Análise prática de resultados mensuráveis e alavancas de multiplicação.' },
      { title: 'Construindo o Efeito Composto e Blindagem de Longo Prazo', secs: 3, mult: 1.05, focus: 'Sustentabilidade, revisão semanal e proteção contra recaídas.' },
      { title: 'O Manifesto & Plano de Ação dos Próximos 30 Dias', secs: 3, mult: 0.9, focus: 'Checklist executável dia a dia para consolidar a transformação definitiva.' }
    ];

    return Array.from({ length: safeCaps }, (_, i) => {
      const tpl = nonFictionTemplates[i % nonFictionTemplates.length];
      return {
        num: i + 1,
        title: i < nonFictionTemplates.length ? tpl.title : `Etapa ${i + 1}: ${tpl.title}`,
        sectionsCount: tpl.secs,
        targetWords: Math.round(baseWords * tpl.mult),
        focus: tpl.focus
      };
    });
  }

  /**
   * Gera recursos/fontes contextuais para a Etapa 4 se o autor desejar avançar sem digitar manualmente.
   */
  public static buildGenreResourceNotes(state: WorkflowStateSnapshot): string {
    const theme = state.temaSelecionado || state.genero || 'Desenvolvimento Pessoal';
    const sub = state.subtemaSelecionado || '';
    const isFiction = KdpTitleSuggestionEngine.isFictionContext(theme, sub, state.titulo);
    const refNames = (state.marketReferences || []).slice(0, 3).map(r => r.title).filter(Boolean).join(', ');

    if (isFiction) {
      return [
        `• Diretrizes de Narrativa e Suspense (${theme}${sub ? ` — ${sub}` : ''}): construir tensão psicológica progressiva e ganchos (cliffhangers) ao final de cada capítulo.`,
        `• Modelagem de Ritmo Editorial inspirada em bestsellers do gênero (${refNames || 'A Paciente Silenciosa, A Empregada, Garota Exemplar'}): capítulos ágeis, diálogos afiados e pistas plantadas com sutileza.`,
        `• Psicologia de Personagens: explorar motivações ambíguas, segredos domésticos e reviravoltas verossímeis sem clichês previsíveis.`
      ].join('\n');
    }

    return [
      `• Base Factual e Metodológica (${theme}${sub ? ` — ${sub}` : ''}): priorizar passos acionáveis, protocolos de 10 a 15 minutos e exemplos reais aplicáveis hoje.`,
      `• Referências de Posicionamento Competitivo (${refNames || 'Bestsellers Top 100 Amazon KDP'}): linguagem clara, direta e focada em transformação mensurável do leitor.`,
      `• Estrutura Anti-Alucinação: cada capítulo deve entregar um conceito central, um estudo de caso prático e um checklist imediato.`
    ].join('\n');
  }

  /**
   * Gera a Biografia Oficial do Autor para a Etapa 5 se ainda estiver em branco.
   */
  public static buildGenreAuthorBio(state: WorkflowStateSnapshot): { autor: string; bio: string; background: string } {
    const autorName = (state.autor || '').trim() || 'Leandro Palmeira';
    const theme = state.temaSelecionado || state.genero || 'Desenvolvimento Pessoal';
    const sub = state.subtemaSelecionado || '';
    const isFiction = KdpTitleSuggestionEngine.isFictionContext(theme, sub, state.titulo);

    if (isFiction) {
      return {
        autor: autorName,
        background: state.authorBackground || `Romancista e estudioso da psicologia humana aplicado a tramas de ${theme}`,
        bio: `${autorName} é escritor dedicado a explorar as camadas mais profundas e inquietantes da mente humana. Fascinado pelos segredos que se escondem por trás de rotinas aparentemente perfeitas, constrói narrativas de ${theme.toLowerCase()} marcadas por tensão psicológica, personagens moralmente complexos e reviravoltas que desafiam o leitor até a última página.`
      };
    }

    return {
      autor: autorName,
      background: state.authorBackground || `Pesquisador e estrategista dedicado ao domínio prático de ${theme}`,
      bio: `${autorName} dedica sua trajetória a traduzir conceitos complexos de ${theme.toLowerCase()} em sistemas práticos, acessíveis e de alto impacto. Com foco em resultados reais e consistência sustentável, suas obras ajudam leitores a eliminar o excesso de teoria e implementar mudanças duradouras no dia a dia.`
    };
  }

  /**
   * Gera Proposta, Ângulo Único, Promessa e Público-Alvo para a Etapa 6.
   */
  public static buildGenreProposalAndFocus(state: WorkflowStateSnapshot): {
    uniqueAngle: string;
    bookPromise: string;
    targetReader: string;
    proposedBookSummary: string;
    focusTags: string[];
  } {
    const theme = state.temaSelecionado || state.genero || 'Desenvolvimento Pessoal';
    const sub = state.subtemaSelecionado || '';
    const title = state.titulo || 'Esta Obra';
    const isFiction = KdpTitleSuggestionEngine.isFictionContext(theme, sub, title);

    if (isFiction) {
      const uniqueAngle = (state.uniqueAngle || '').trim() || `Narrativa de ${theme.toLowerCase()} com foco em ${sub || 'tensão psicológica doméstica'}, pistas plantadas a cada capítulo e virada dupla no clímax.`;
      const bookPromise = (state.bookPromise || '').trim() || `Prender o leitor em um jogo psicológico eletrizante onde cada capítulo revela uma nova camada do segredo central.`;
      const targetReader = (state.targetReader || '').trim() || `Leitores vorazes de suspense psicológico, mistério investigativo e thrillers domésticos no Kindle Unlimited.`;
      const focusTags = (state.focusTags && state.focusTags.length > 0) ? state.focusTags : ['Storytelling Imersivo', 'Quebra de Mitos', 'Exemplos da Vida Real'];
      const proposedBookSummary = (state.proposedBookSummary || '').trim() || `"${title}" posiciona-se no topo do segmento de ${theme} ao combinar ritmo cinematográfico ágil com profundidade psicológica real. A obra prende a atenção desde a primeira página e entrega uma reviravolta memorável que gera forte recomendação boca a boca na Amazon KDP.`;
      return { uniqueAngle, bookPromise, targetReader, proposedBookSummary, focusTags };
    }

    const uniqueAngle = (state.uniqueAngle || '').trim() || `Abordagem prática e contraintuitiva sobre ${sub || theme}, substituindo teorias abstratas por micro-ações diárias de resultado imediato.`;
    const bookPromise = (state.bookPromise || '').trim() || `Entregar um roteiro claro, validado e repetível para dominar ${sub || theme} sem depender de força de vontade extrema.`;
    const targetReader = (state.targetReader || '').trim() || `Profissionais, estudantes e leitores que buscam evolução prática, clareza e resultados consistentes em ${theme.toLowerCase()}.`;
    const focusTags = (state.focusTags && state.focusTags.length > 0) ? state.focusTags : ['Estratégias Práticas', 'Ganhos Rápidos Diários', 'Passo a Passo Simples'];
    const proposedBookSummary = (state.proposedBookSummary || '').trim() || `"${title}" diferencia-se no mercado de ${theme} ao rejeitar conselhos genéricos e fornecer um método estruturado em passos simples. Combinando ${focusTags.join(', ')}, guia o leitor da estagnação à execução consistente logo nos primeiros capítulos.`;
    return { uniqueAngle, bookPromise, targetReader, proposedBookSummary, focusTags };
  }

  /**
   * Gera a Descrição Comercial (Sinopse de Vendas KDP) para a Etapa 9.
   */
  public static buildGenreCommercialDescription(state: WorkflowStateSnapshot): string {
    const title = state.titulo || 'Nova Obra Editorial';
    const subtitle = state.subtitulo || '';
    const theme = state.temaSelecionado || state.genero || 'Desenvolvimento Pessoal';
    const sub = state.subtemaSelecionado || '';
    const isFiction = KdpTitleSuggestionEngine.isFictionContext(theme, sub, title);
    const outline = (state.variedOutlinePreview && state.variedOutlinePreview.length > 0)
      ? state.variedOutlinePreview
      : this.buildGenreVariedOutline(theme, sub, title, state.maxCapitulos || 8, state.paginasAlvo || 120);

    if (isFiction) {
      return [
        `🔥 ${title.toUpperCase()}: ${subtitle || 'Até onde você iria para proteger um segredo que nunca deveria vir à tona?'}`,
        ``,
        `Por trás de portas fechadas e sorrisos perfeitos, ninguém é exatamente quem diz ser. Em "${title}", uma descoberta inesperada desencadeia uma espiral de paranoia, mentiras cruzadas e tensão psicológica onde confiar na pessoa errada pode custar tudo.`,
        ``,
        `O QUE ESPERA POR VOCÊ NESTE THRILLER ELETRIZANTE:`,
        `• Uma trama claustrofóbica e imersiva sobre ${sub || theme} que desafia suas suspeitas a cada capítulo;`,
        `• Personagens densos e moralmente ambíguos — onde a linha entre vítima e culpado é deliberadamente tênue;`,
        `• Capítulos curtos e magnéticos projetados para você não conseguir largar a leitura até a madrugada;`,
        `• Uma reviravolta final chocante que reconstrói todas as peças do quebra-cabeça.`,
        ``,
        `Se você é fã de thrillers psicológicos intensos no estilo de Freida McFadden, Gillian Flynn e Alex Michaelides, prepare-se para uma leitura visceral.`,
        ``,
        `👉 Garanta seu exemplar agora e descubra a verdade antes que seja tarde demais!`
      ].join('\n');
    }

    const topChapters = outline.slice(0, 4).map(c => `✓ ${c.title}: ${c.focus}`).join('\n');

    return [
      `🚀 ${title.toUpperCase()}: ${subtitle || `O método definitivo para transformar seus resultados em ${theme}`}`,
      ``,
      `Por que tantas pessoas tentam evoluir em ${sub || theme} mas acabam travadas no excesso de informação e na falta de consistência? A resposta está na ausência de um sistema prático desenhado para a vida real.`,
      ``,
      `${state.stanceTopic || state.bookPromise || `Em "${title}", você terá em mãos um passo a passo direto ao ponto, livre de enrolação teórica e focado no que gera impacto imediato.`}`,
      ``,
      `O QUE VOCÊ VAI DESCOBRIR NESTA OBRA:`,
      topChapters,
      `✓ Um plano de ação prático de 30 dias para consolidar resultados duradouros.`,
      ``,
      `PARA QUEM É ESTE LIVRO:`,
      `${state.targetReader || `Ideal para quem busca clareza, ferramentas práticas e execução consistente em ${theme}.`}`,
      ``,
      `👉 Clique em "Comprar Agora" e comece hoje mesmo sua jornada com "${title}"!`
    ].join('\n');
  }

  /**
   * Materializa capítulos estruturados iniciais a partir do Sumário Planejado (Etapa 8),
   * permitindo que o autor avance com manuscrito real sem bloqueios caso ainda não tenha rodado a IA paga.
   */
  public static buildStructuredChaptersFromOutline(state: WorkflowStateSnapshot): Array<{ titulo: string; texto: string; imagemDataUrl: null }> {
    const theme = state.temaSelecionado || state.genero || 'Desenvolvimento Pessoal';
    const sub = state.subtemaSelecionado || '';
    const bookTitle = state.titulo || 'Obra em Produção';
    const isFiction = KdpTitleSuggestionEngine.isFictionContext(theme, sub, bookTitle);
    const outline = (state.variedOutlinePreview && state.variedOutlinePreview.length > 0)
      ? state.variedOutlinePreview
      : this.buildGenreVariedOutline(theme, sub, bookTitle, state.maxCapitulos || 8, state.paginasAlvo || 120);

    return outline.map((item, idx) => {
      if (isFiction) {
        const texto = [
          `A sensação de que algo estava fora de lugar começou de forma quase imperceptível, como um detalhe silencioso que a mente tenta ignorar, mas o instinto se recusa a esquecer. No universo de "${bookTitle}", cada gesto cotidiano carregava o peso do que não podia ser dito em voz alta.`,
          `### ${item.title}`,
          `${item.focus} As sombras do passado projetavam-se sobre as decisões do presente. Quando a primeira contradição veio à tona, ficou evidente que o silêncio ao redor não era coincidência — era proteção. Alguém conhecia exatamente cada passo dado até ali.`,
          `À medida que as horas avançavam, a linha entre suspeita e certeza tornou-se cada vez mais tênue. O que parecia um acaso isolado revelou-se a peça central de um jogo psicológico onde recuar já não era uma opção.`
        ].join('\n\n');
        return { titulo: item.title, texto, imagemDataUrl: null };
      }

      const texto = [
        `Compreender a estrutura real por trás de ${sub || theme} exige abandonar promessas superficiais e observar o que realmente sustenta resultados consistentes. Em "${bookTitle}", este capítulo estabelece o alicerce prático para transformar intenção em execução mensurável.`,
        `### ${item.title}`,
        `${item.focus} ${state.stanceTopic || 'Quando substituímos o esforço desordenado por processos claros e repetíveis, eliminamos o atrito que paralisa a maioria das pessoas logo nas primeiras semanas.'}`,
        `Ao aplicar este princípio no seu cotidiano, concentre-se primeiro na clareza do próximo passo. Pequenas vitórias acumuladas diariamente criam a tração necessária para consolidar o método completo apresentado ao longo desta obra.`
      ].join('\n\n');
      return { titulo: item.title, texto, imagemDataUrl: null };
    });
  }

  /**
   * Valida rigorosamente se uma etapa (1 a 10) está concluída ou pode ser finalizada com suporte inteligente.
   */
  public static validateStep(step: number, state: WorkflowStateSnapshot): StepValidationResult {
    const stepName = this.getStepName(step);
    const patches: Partial<WorkflowStateSnapshot> = {};

    switch (step) {
      case 1: {
        // Etapa 1: Pesquisa, Tema & Tese Única
        const hasTheme = Boolean((state.temaSelecionado || '').trim() || (state.genero || '').trim());
        if (!hasTheme) {
          return {
            ok: false,
            step: 1,
            stepName,
            reason: '⚠️ Etapa 1 incompleta: Selecione primeiro o Tema Central do Livro antes de avançar para a Etapa 2.'
          };
        }
        const isFiction = KdpTitleSuggestionEngine.isFictionContext(state.temaSelecionado || state.genero, state.subtemaSelecionado, state.titulo);
        if (!state.stanceTopic || state.stanceTopic.trim().length < 8) {
          patches.stanceTopic = isFiction
            ? `Narrativa de ${state.temaSelecionado || state.genero} focada em tensão psicológica crescente, personagens moralmente ambíguos e reviravoltas imprevisíveis.`
            : `Esta obra rejeita teorias genéricas sobre ${state.temaSelecionado || state.genero} e entrega um sistema prático de micro-ações diárias com resultados reais.`;
        }
        if (isFiction && (state.authorTone || '').includes('Conversacional')) {
          patches.authorTone = 'Narrativo cinematográfico, imersivo e visceral';
        }
        return { ok: true, step: 1, stepName, autoFilledPatches: patches };
      }

      case 2: {
        // Etapa 2: Análise Top 100 & Referências Bestsellers
        const hasRefs = (state.selectedInspirationAsins || []).length > 0 || (state.marketReferences || []).length > 0;
        if (!hasRefs) {
          return {
            ok: false,
            step: 2,
            stepName,
            reason: '⚠️ Etapa 2 incompleta: Selecione pelo menos 1 livro bestseller de referência para inspirar sua obra antes de ir para a Etapa 3.'
          };
        }
        return { ok: true, step: 2, stepName, autoFilledPatches: patches };
      }

      case 3: {
        // Etapa 3: Título & Subtítulo do Livro (Rigoroso: exige que o autor tenha definido ou escolhido o título)
        const cleanTitle = (state.titulo || '').trim();
        if (cleanTitle.length < 3) {
          return {
            ok: false,
            step: 3,
            stepName,
            reason: '⚠️ Etapa 3 incompleta: Digite o Título do seu livro ou escolha uma das sugestões antes de avançar para a Etapa 4.'
          };
        }
        let cleanSub = (state.subtitulo || '').trim();
        if (cleanSub.length < 5) {
          // Gera subtítulo complementar contextualizado com o título digitado pelo autor
          const sim = KdpTitleSuggestionEngine.getSimilarTitles(cleanTitle, state.temaSelecionado || state.genero, state.subtemaSelecionado);
          cleanSub = sim[0]?.subtitle || `Uma abordagem transformadora sobre ${state.subtemaSelecionado || state.temaSelecionado || state.genero}`;
          patches.subtitulo = cleanSub;
        }
        return { ok: true, step: 3, stepName, autoFilledPatches: patches };
      }

      case 4: {
        // Etapa 4: Recursos & Fontes
        if (!state.resourceNotes || state.resourceNotes.trim().length < 10) {
          patches.resourceNotes = this.buildGenreResourceNotes(state);
        }
        return { ok: true, step: 4, stepName, autoFilledPatches: patches };
      }

      case 5: {
        // Etapa 5: Persona & Biografia do Autor
        const bioData = this.buildGenreAuthorBio(state);
        if (!state.autor || state.autor.trim().length < 2) {
          patches.autor = bioData.autor;
        }
        if (!state.authorBackground || state.authorBackground.trim().length < 3) {
          patches.authorBackground = bioData.background;
        }
        if (!state.authorOfficialBio || state.authorOfficialBio.trim().length < 15) {
          patches.authorOfficialBio = bioData.bio;
        }
        return { ok: true, step: 5, stepName, autoFilledPatches: patches };
      }

      case 6: {
        // Etapa 6: Proposta do Livro, Diferencial & Foco
        const prop = this.buildGenreProposalAndFocus(state);
        if (!state.uniqueAngle || state.uniqueAngle.trim().length < 5) patches.uniqueAngle = prop.uniqueAngle;
        if (!state.bookPromise || state.bookPromise.trim().length < 5) patches.bookPromise = prop.bookPromise;
        if (!state.targetReader || state.targetReader.trim().length < 5) patches.targetReader = prop.targetReader;
        if (!state.proposedBookSummary || state.proposedBookSummary.trim().length < 10) patches.proposedBookSummary = prop.proposedBookSummary;
        if (!state.focusTags || state.focusTags.length === 0) patches.focusTags = prop.focusTags;
        return { ok: true, step: 6, stepName, autoFilledPatches: patches };
      }

      case 7: {
        // Etapa 7: Detalhes, Estrutura & Sumário Variado
        if (!state.topico || state.topico.trim().length < 10) {
          const prop = this.buildGenreProposalAndFocus(state);
          patches.topico = `${state.stanceTopic || prop.uniqueAngle} — ${prop.bookPromise}`.trim();
        }
        if (!state.variedOutlinePreview || state.variedOutlinePreview.length < 3) {
          patches.variedOutlinePreview = this.buildGenreVariedOutline(
            state.temaSelecionado || state.genero || 'Desenvolvimento Pessoal',
            state.subtemaSelecionado || '',
            state.titulo || '',
            state.maxCapitulos || 8,
            state.paginasAlvo || 120
          );
        }
        return { ok: true, step: 7, stepName, autoFilledPatches: patches };
      }

      case 8: {
        // Etapa 8: Escrita & Produção dos Capítulos
        // (Quando validado via botão de avanço da Etapa 8, se ainda não houver capítulos gerados,
        // o componente materializa a estrutura de capítulos do sumário para nunca deixar o livro vazio).
        return { ok: true, step: 8, stepName, autoFilledPatches: patches };
      }

      case 9: {
        // Etapa 9: Descrição Comercial
        if (!state.bookCommercialDescription || state.bookCommercialDescription.trim().length < 20) {
          patches.bookCommercialDescription = this.buildGenreCommercialDescription(state);
        }
        return { ok: true, step: 9, stepName, autoFilledPatches: patches };
      }

      case 10:
      default:
        return { ok: true, step: 10, stepName, autoFilledPatches: patches };
    }
  }
}
