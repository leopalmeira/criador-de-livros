// ============================================================================
// KDP TITLE & SUBTITLE SUGGESTION ENGINE (MOTOR EDITORIAL CONTEXTUALIZADO)
// Gera sugestões de títulos e subtítulos comerciais originais de alta conversão
// calibrados por nicho KDP, ganchos psicológicos e livros de referência da Amazon.
// ============================================================================

import type { MarketReference } from './project-state';

export interface TitleSuggestion {
  id: string;
  title: string;
  subtitle: string;
  theme: string;
  category: string;
  kind: 'ficcao' | 'nao-ficcao' | 'infantil' | 'atividades';
  inspiredByBook?: string;
  rationale: string;
  hookType: 'curiosidade' | 'promessa-forte' | 'autoridade' | 'reviravolta' | 'emocional';
  targetBsrEstimate: number;
  uniqueAngle: string;
  stance: string;
  keywords?: string[];
}

export interface TitleFormula {
  titleFn: (base: string) => string;
  subFn: (theme: string) => string;
  hook: 'curiosidade' | 'promessa-forte' | 'autoridade' | 'reviravolta' | 'emocional';
  rationale: string;
  stance: string;
}

// Fórmulas especializadas por categoria KDP
const FICTION_THRILLER_FORMULAS: TitleFormula[] = [
  {
    titleFn: (base: string) => `A Garota Que Sabia Demais`,
    subFn: (theme: string) => `Um thriller psicológico implacável onde toda verdade é uma armadilha perigosa`,
    hook: 'curiosidade',
    rationale: 'Gancho de suspense clássico de alta retenção no Kindle Unlimited.',
    stance: 'História com narrador não confiável e reviravoltas que desconstroem expectativas.'
  },
  {
    titleFn: (base: string) => `O Segredo do Chalé 7`,
    subFn: (theme: string) => `Eles prometeram nunca mais tocar no assunto. Até o corpo ser descoberto.`,
    hook: 'reviravolta',
    rationale: 'Fórmula de "crime em local fechado" com pacto entre amigos que desmorona.',
    stance: 'Suspense claustrofóbico focado no esfacelamento moral dos personagens sob pressão.'
  },
  {
    titleFn: (base: string) => `A Vizinha Perfeita`,
    subFn: (theme: string) => `Ela conhecia a rotina de todos no condomínio. E tinha um plano mortal para cada um.`,
    hook: 'curiosidade',
    rationale: 'Bestseller trope no estilo Freida McFadden e Gillian Flynn com ambientação doméstica.',
    stance: 'Desconstrução da fachada de normalidade suburbana com tensão psicológica crescente.'
  },
  {
    titleFn: (base: string) => `Antes Que Ela Desapareça`,
    subFn: (theme: string) => `Um mistério eletrizante onde ninguém é o que parece e o relógio está correndo`,
    hook: 'reviravolta',
    rationale: 'Urgência temporal combinada com rede de mentiras cruzadas.',
    stance: 'Ritmo acelerado com cortes rápidos de cena e revelações nos finais de capítulo.'
  },
  {
    titleFn: (base: string) => `A Última Mentira de Família`,
    subFn: (theme: string) => `Toda família tem segredos. Mas alguns são projetados para destruir quem os descobre.`,
    hook: 'emocional',
    rationale: 'Drama familiar com suspense investigativo de forte conexão com o leitor.',
    stance: 'Conflitos geracionais e traumas do passado que voltam para cobrar o preço.'
  }
];

const SELF_HELP_HABITS_FORMULAS: TitleFormula[] = [
  {
    titleFn: (base: string) => `O Efeito Micro-Vitória`,
    subFn: (theme: string) => `Como ações simples de 10 minutos diários vencem a procrastinação e constroem resultados extraordinários`,
    hook: 'promessa-forte',
    rationale: 'Promessa contra-intuitiva de baixo atrito para público cansado de rotinas exaustivas.',
    stance: 'Rejeita fórmulas radicais de motivação e foca no efeito composto de sistemas imperceptíveis.'
  },
  {
    titleFn: (base: string) => `Disciplina sem Esforço`,
    subFn: (theme: string) => `O método neurocientífico para reprogramar seus hábitos sem depender de força de vontade`,
    hook: 'autoridade',
    rationale: 'Aborda a dor central do leitor (falta de força de vontade) com respaldo científico.',
    stance: 'A força de vontade é um recurso biológico finito; o ambiente deve fazer o trabalho duro.'
  },
  {
    titleFn: (base: string) => `Foco Inabalável`,
    subFn: (theme: string) => `Como blindar sua mente contra distrações digitais e executar o dobro na metade do tempo`,
    hook: 'promessa-forte',
    rationale: 'Alta demanda por soluções contra sobrecarga de telas e notificações.',
    stance: 'Monopólio da atenção profunda como o ativo mais valioso e raro do século XXI.'
  },
  {
    titleFn: (base: string) => `O Algoritmo da Consistência`,
    subFn: (theme: string) => `Um passo a passo descomplicado para começar, manter o ritmo e nunca mais desistir pela metade`,
    hook: 'promessa-forte',
    rationale: 'Fórmula direta de conclusão de projetos que atrai quem começa e para.',
    stance: 'Consistência não é talento; é um checklist repetível com gatilhos automáticos.'
  }
];

const FINANCE_BUSINESS_FORMULAS: TitleFormula[] = [
  {
    titleFn: (base: string) => `A Máquina de Renda Passiva`,
    subFn: (theme: string) => `O guia prático para construir patrimônio e fluxo de dividendos começando com pouco dinheiro`,
    hook: 'promessa-forte',
    rationale: 'Gancho financeiro atemporal com apelo de independência financeira.',
    stance: 'Investimento desmistificado para pessoas comuns sem jargões de Wall Street.'
  },
  {
    titleFn: (base: string) => `O Código do Lucro Previsível`,
    subFn: (theme: string) => `Estratégias validadas de vendas, precificação e escala para pequenos negócios e autônomos`,
    hook: 'autoridade',
    rationale: 'Atrai empreendedores em busca de caixa saudável e clientes constantes.',
    stance: 'Faturamento é vaidade, lucro é sanidade e fluxo de caixa é sobrevivência real.'
  },
  {
    titleFn: (base: string) => `Liberdade Financeira em 30 Passos`,
    subFn: (theme: string) => `Como eliminar dívidas, blindar seu orçamento e fazer seu dinheiro trabalhar por você`,
    hook: 'promessa-forte',
    rationale: 'Estrutura sequencial em etapas que reduz ansiedade e gera ação imediata.',
    stance: 'Educação financeira comportamental focada em cortar desperdícios invisíveis.'
  }
];

const HEALTH_WELLNESS_FORMULAS: TitleFormula[] = [
  {
    titleFn: (base: string) => `O Relógio Metabólico`,
    subFn: (theme: string) => `Como regular sua insulina, recuperar a energia vital e conquistar longevidade real`,
    hook: 'autoridade',
    rationale: 'Fórmula alinhada com bestsellers de saúde preventiva e biohacking.',
    stance: 'A saúde duradoura começa na estabilização dos picos glicêmicos e no sono de qualidade.'
  },
  {
    titleFn: (base: string) => `Mente Calma em Tempos Caóticos`,
    subFn: (theme: string) => `Protocolos práticos de regulação do sistema nervoso para aliviar a ansiedade e o cansaço crônico`,
    hook: 'emocional',
    rationale: 'Forte apelo para leitores sofrendo com estresse do trabalho e insônia.',
    stance: 'O corpo fala através de sintomas; tratar a causa raiz supera mascarar o cansaço.'
  }
];

const ROMANCE_FORMULAS: TitleFormula[] = [
  {
    titleFn: (base: string) => `Contrato com o Inimigo`,
    subFn: (theme: string) => `Um romance enemies-to-lovers com namoro falso que saiu perigosamente do controle`,
    hook: 'curiosidade',
    rationale: 'A fórmula mais lucrativa do romance KDP (Fake Dating + Inimigos que se apaixonam).',
    stance: 'Convivência forçada onde a rivalidade profissional se transforma em paixão incontrolável.'
  },
  {
    titleFn: (base: string) => `Onde Nossos Caminhos Cruzam`,
    subFn: (theme: string) => `Um romance doce e apaixonante sobre segundas chances em uma pequena cidade à beira-mar`,
    hook: 'emocional',
    rationale: 'Comédia romântica aconchegante (Small Town Romance) de altíssima fidelização.',
    stance: 'Cura de corações partidos através de recomeços despretensiosos e conexões sinceras.'
  }
];

export class KdpTitleSuggestionEngine {
  /**
   * Identifica o gênero/tipo e retorna sugestões inteligentes imediatas para o segmento.
   */
  public static getSuggestionsForTheme(
    theme: string,
    subtheme?: string,
    referenceBooks: (MarketReference | { title: string; subtitle?: string; bsr?: number; [k: string]: any })[] = []
  ): TitleSuggestion[] {
    const norm = `${theme} ${subtheme || ''}`.toLowerCase();
    const isFiction = /thriller|mistério|misterio|suspense|crime|policial|ficção|ficcao|romance|fantasia|terror|horror/i.test(norm);
    const isRomance = /romance|namoro|amor|comédia romântica|paixão/i.test(norm);
    const isFinance = /finança|financa|invest|dinheiro|negócio|negocio|marketing|vendas|empresa/i.test(norm);
    const isHealth = /saúde|saude|nutrição|nutricao|sono|corpo|mente|ansiedade|longevidade|glicose/i.test(norm);

    let formulas: TitleFormula[] = SELF_HELP_HABITS_FORMULAS;
    let kind: 'ficcao' | 'nao-ficcao' = 'nao-ficcao';

    if (isRomance) {
      formulas = ROMANCE_FORMULAS;
      kind = 'ficcao';
    } else if (isFiction) {
      formulas = FICTION_THRILLER_FORMULAS;
      kind = 'ficcao';
    } else if (isFinance) {
      formulas = FINANCE_BUSINESS_FORMULAS;
    } else if (isHealth) {
      formulas = HEALTH_WELLNESS_FORMULAS;
    }

    const suggestions: TitleSuggestion[] = formulas.map((f, i) => {
      const title = f.titleFn(theme);
      const subtitle = f.subFn(theme);
      return {
        id: `sug_${i + 1}_${Date.now()}`,
        title,
        subtitle,
        theme,
        category: theme,
        kind,
        rationale: f.rationale,
        hookType: f.hook,
        targetBsrEstimate: Math.round(1800 + i * 1200),
        uniqueAngle: `Metodologia autoral focada em ${subtheme || theme}, eliminando clichês e com aplicação direta.`,
        stance: f.stance,
        keywords: [theme, subtheme || '', 'bestseller kdp', 'amazon kindle']
      };
    });

    // Se houver livros de referência fornecidos, gera títulos inspirados neles
    if (referenceBooks.length > 0) {
      referenceBooks.slice(0, 3).forEach((book, idx) => {
        const inspired = this.generateInspiredFromBook(book, theme);
        suggestions.unshift({
          id: `inspired_${idx}_${Date.now()}`,
          title: inspired.title,
          subtitle: inspired.subtitle,
          theme,
          category: theme,
          kind,
          inspiredByBook: book.title,
          rationale: `Inspirado no bestseller "${book.title}" (BSR #${book.bsr || 12000}) adaptado para originalidade total.`,
          hookType: 'curiosidade',
          targetBsrEstimate: book.bsr || 4500,
          uniqueAngle: inspired.uniqueAngle,
          stance: inspired.stance,
          keywords: [book.title, theme, 'livro de referencia']
        });
      });
    }

    return suggestions.slice(0, 6);
  }

  /**
   * Gera um título e subtítulo originais inspirados diretamente em um livro de referência concorrente.
   * Evita a fórmula genérica "O Novo Código de..." e respeita o gênero da obra.
   */
  public static generateInspiredFromBook(
    book: Partial<MarketReference> | { title: string; subtitle?: string; bsr?: number; [k: string]: any },
    themeContext?: string
  ): { title: string; subtitle: string; uniqueAngle: string; stance: string; rationale: string } {
    const rawTitle = (book.title || '').trim();
    const cleanTitle = rawTitle.split(/[:\-\–]/)[0].trim();
    const context = `${themeContext || ''} ${cleanTitle}`.toLowerCase();

    // 1. FICÇÃO / SUSPENSE / THRILLER (ex: Garota Exemplar, A Mulher na Janela, Não Conte a Ninguém)
    if (/garota|mulher|janela|ninguém|ninguem|assistente|segredo|morte|crime|silêncio|silencio|mentira|caso|psicopata|faca|noite|casa/i.test(context)) {
      const fictionOptions = [
        {
          title: `A Esposa Perfeita`,
          subtitle: `Um thriller psicológico implacável onde toda verdade é uma armadilha e ninguém é inocente`,
          uniqueAngle: `Narrador em primeira pessoa com quebra progressiva de sanidade e revelações a cada 3 capítulos.`,
          stance: `Desconstrói a perfeição das aparências para expor a teia psicológica de vingança e controle.`
        },
        {
          title: `O Segredo Que Ela Levou`,
          subtitle: `Algumas promessas deveriam permanecer enterradas no passado. Até a primeira testemunha falar.`,
          uniqueAngle: `Investigação em duas linhas temporais alternando passado e presente com ritmo cinematográfico.`,
          stance: `Aborda a culpa e as consequências devastadoras do silêncio cúmplice entre amigos de infância.`
        },
        {
          title: `A Vizinha do Chalé 9`,
          subtitle: `Ela viu o que não devia através da cerca. Agora eles sabem exatamente quem ela é.`,
          uniqueAngle: `Suspense claustrofóbico focado em paranoia e observação obsessiva em condomínio fechado.`,
          stance: `Explora o voyeurismo moderno e a linha tênue entre curiosidade inocente e perigo letal.`
        },
        {
          title: `Antes da Meia-Noite`,
          subtitle: `Um jogo de gato e rato em alta velocidade onde a única testemunha viva é a principal suspeita`,
          uniqueAngle: `Corrida contra o tempo com ponto de vista alternado entre investigadora e acusada.`,
          stance: `Rejeita maniqueísmos: a linha entre vítima e manipuladora é deliberadamente tênue.`
        }
      ];

      // Sorteia ou pega baseado no tamanho do título
      const picked = fictionOptions[Math.abs(cleanTitle.length) % fictionOptions.length];
      return {
        ...picked,
        rationale: `Fórmula de suspense e thriller inspirada no ritmo e tensão de "${cleanTitle}".`
      };
    }

    // 2. DESENVOLVIMENTO PESSOAL / HÁBITOS (ex: Hábitos Atômicos, O Poder do Hábito, Essencialismo)
    if (/hábito|habito|poder|essencial|foco|manhã|manha|milagre|disciplina|rotina|mental|regras|limites/i.test(context)) {
      const habitOptions = [
        {
          title: `Micro-Hábitos de Aço`,
          subtitle: `O método diário de 1% para reprogramar sua rotina, vencer a procrastinação e blindar sua disciplina`,
          uniqueAngle: `Sistemas progressivos de baixo atrito baseados em micro-ações acionáveis em menos de 10 minutos.`,
          stance: `A força de vontade falha quando você está cansado; seu ambiente e rotina devem fazer o trabalho por você.`
        },
        {
          title: `O Poder da Ação Mínima`,
          subtitle: `Como parar de planejar no papel e começar a executar resultados reais todos os dias`,
          uniqueAngle: `Fórmula de gatilhos automáticos para eliminar o atrito mental de começar tarefas difíceis.`,
          stance: `Resultados duradouros não vêm de saltos heróicos, mas da repetição imperceptível e cumulativa.`
        },
        {
          title: `Foco Radical`,
          subtitle: `A disciplinada arte de dizer não ao que rouba sua energia e executar apenas o que importa`,
          uniqueAngle: `Eliminação sistemática de distrações corporativas e reorganização de prioridades singulares.`,
          stance: `Se você não priorizar sua vida, alguém com certeza fará isso por você.`
        }
      ];

      const picked = habitOptions[Math.abs(cleanTitle.length) % habitOptions.length];
      return {
        ...picked,
        rationale: `Fórmula de alta conversão para não-ficção e produtividade inspirada em "${cleanTitle}".`
      };
    }

    // 3. FINANÇAS / INVESTIMENTOS (ex: Pai Rico, Os Segredos da Mente Milionária, A Psicologia Financeira)
    if (/rico|milion|dinheiro|invest|finan|patrimonio|lucro|moeda|capital/i.test(context)) {
      return {
        title: `A Máquina de Liberdade Financeira`,
        subtitle: `O mapa definitivo para construir patrimônio previsível e renda passiva partindo do zero`,
        uniqueAngle: `Metodologia de alocação de ativos simples, sem especulação de risco e com foco em dividendos sustentáveis.`,
        stance: `Enriquecimento sustentável é um processo lento, disciplinado e matemático, imune a modismos.`,
        rationale: `Fórmula de autoridade e segurança patrimonial inspirada em "${cleanTitle}".`
      };
    }

    // 4. PADRÃO ELEGANTE (NÃO REPETITIVO)
    return {
      title: `O Efeito ${cleanTitle.split(' ')[0] || 'Transformador'}`,
      subtitle: `Estratégias avançadas e método prático para alcançar resultados superiores com consistência`,
      uniqueAngle: `Abordagem pragmática que combina conceitos consagrados com execução passo a passo no dia a dia.`,
      stance: `Esta obra rejeita o conteúdo raso e entrega um roteiro denso e acionável para o leitor.`,
      rationale: `Direcionamento editorial inspirado nas forças mercadológicas de "${cleanTitle}".`
    };
  }
}
