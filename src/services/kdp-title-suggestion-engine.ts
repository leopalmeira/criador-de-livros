// ============================================================================
// KDP TITLE & SUBTITLE SUGGESTION ENGINE (MOTOR EDITORIAL CONTEXTUALIZADO)
// Gera sugestões de títulos e subtítulos comerciais originais de alta conversão
// calibrados por nicho KDP, ganchos psicológicos, títulos similares e livros concorrentes.
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

// Fórmulas especializadas de Ficção / Thriller / Mistério / Suspense
const FICTION_THRILLER_FORMULAS: TitleFormula[] = [
  {
    titleFn: () => `A Garota Que Sabia Demais`,
    subFn: () => `Um thriller psicológico implacável onde toda verdade é uma armadilha e ninguém é inocente`,
    hook: 'curiosidade',
    rationale: 'Gancho de suspense clássico de altíssima retenção de páginas no Kindle Unlimited.',
    stance: 'Narrador não confiável com segredos revelados progressivamente até a virada final.'
  },
  {
    titleFn: () => `O Segredo do Chalé 7`,
    subFn: () => `Eles prometeram nunca mais tocar no assunto. Até o primeiro corpo ser descoberto.`,
    hook: 'reviravolta',
    rationale: 'Fórmula de mistério claustrofóbico em local fechado com quebra de pacto moral.',
    stance: 'Tensão psicológica crescente sobre a paranoia e o colapso das aparências burguesas.'
  },
  {
    titleFn: () => `A Esposa Perfeita`,
    subFn: () => `Ela conhecia os passos de todos ao redor. Mas alguém sabia exatamente quem ela era no passado.`,
    hook: 'curiosidade',
    rationale: 'Bestseller trope no estilo Freida McFadden e Gillian Flynn com ambientação doméstica.',
    stance: 'Desconstrução da vida suburbana perfeita para expor jogos mentais de vingança.'
  },
  {
    titleFn: () => `Antes Que Ela Desapareça`,
    subFn: () => `Um mistério eletrizante onde o relógio está correndo e a única testemunha é a principal suspeita`,
    hook: 'reviravolta',
    rationale: 'Urgência temporal implacável com múltiplos pontos de vista e finais eletrizantes.',
    stance: 'Ritmo cinematográfico acelerado com revelações em cada final de capítulo.'
  },
  {
    titleFn: () => `O Preço da Obsessão`,
    subFn: () => `Um jogo psicológico perigoso onde o limite entre admiração e loucura deixa de existir`,
    hook: 'curiosidade',
    rationale: 'Forte apelo para fãs de suspense psicológico sombrio e relacionamentos tóxicos.',
    stance: 'Explora o voyeurismo e a decadência mental sob obsessão compulsiva.'
  },
  {
    titleFn: () => `A Vizinha do Lado`,
    subFn: () => `Você pensa que conhece as pessoas com quem convive. Até as cortinas se abrirem.`,
    hook: 'emocional',
    rationale: 'Suspense paranoico de vizinhança com apelo direto à curiosidade humana.',
    stance: 'O perigo mora ao lado: a fragilidade da sensação de segurança dentro da própria casa.'
  }
];

// Fórmulas de Desenvolvimento Pessoal / Hábitos / Produtividade
const SELF_HELP_HABITS_FORMULAS: TitleFormula[] = [
  {
    titleFn: () => `Micro-Hábitos de Aço`,
    subFn: () => `O método diário de 1% para reprogramar sua rotina, vencer a procrastinação e blindar sua disciplina`,
    hook: 'promessa-forte',
    rationale: 'Promessa contra-intuitiva de baixo atrito para leitores cansados de rotinas radicais.',
    stance: 'Rejeita motivação efêmera e foca no efeito cumulativo de sistemas imperceptíveis de 10 minutos.'
  },
  {
    titleFn: () => `Disciplina sem Esforço`,
    subFn: () => `O método neurocientífico para criar hábitos duradouros sem depender de força de vontade`,
    hook: 'autoridade',
    rationale: 'Aborda a dor crônica da inconsistência com respaldo científico comprovado.',
    stance: 'A força de vontade é finita; estruture seu ambiente para executar no piloto automático.'
  },
  {
    titleFn: () => `Foco Inabalável`,
    subFn: () => `Como blindar sua mente contra distrações digitais e executar o dobro na metade do tempo`,
    hook: 'promessa-forte',
    rationale: 'Alta demanda por soluções contra sobrecarga de telas, notificações e ansiedade.',
    stance: 'A atenção profunda é a habilidade mais rara e valiosa do mercado contemporâneo.'
  },
  {
    titleFn: () => `O Algoritmo da Consistência`,
    subFn: () => `Um passo a passo descomplicado para começar, manter o ritmo e nunca mais abandonar projetos pela metade`,
    hook: 'promessa-forte',
    rationale: 'Fórmula direta de conclusão de metas que atrai quem começa e para.',
    stance: 'Consistência não é dom ou vocação; é um checklist repetível com gatilhos automáticos.'
  }
];

// Fórmulas de Finanças / Negócios / Investimentos
const FINANCE_BUSINESS_FORMULAS: TitleFormula[] = [
  {
    titleFn: () => `A Máquina de Liberdade Financeira`,
    subFn: () => `O mapa definitivo para construir patrimônio previsível e fluxo de dividendos começando do zero`,
    hook: 'promessa-forte',
    rationale: 'Gancho financeiro com forte apelo de independência e segurança patrimonial.',
    stance: 'Investimento desmistificado para pessoas comuns sem especulações arriscadas.'
  },
  {
    titleFn: () => `O Código do Lucro Previsível`,
    subFn: () => `Estratégias validadas de precificação, posicionamento e vendas para pequenas empresas e autônomos`,
    hook: 'autoridade',
    rationale: 'Atrai empreendedores em busca de faturamento estável e clientes recorrentes.',
    stance: 'Faturamento é vaidade, lucro é sanidade e fluxo de caixa é sobrevivência real.'
  },
  {
    titleFn: () => `Patrimônio Blindado`,
    subFn: () => `Como cortar desperdícios invisíveis, eliminar dívidas e multiplicar renda de forma sustentável`,
    hook: 'promessa-forte',
    rationale: 'Estrutura sequencial em etapas que reduz o estresse financeiro.',
    stance: 'Educação financeira comportamental com foco em preservação e efeito composto.'
  }
];

// Fórmulas de Saúde / Bem-Estar / Longevidade
const HEALTH_WELLNESS_FORMULAS: TitleFormula[] = [
  {
    titleFn: () => `O Relógio Metabólico`,
    subFn: () => `Como equilibrar seus hormônios, restaurar a energia vital e queimar gordura com ciência`,
    hook: 'autoridade',
    rationale: 'Alinhado com as principais tendências de biohacking e saúde preventiva na Amazon.',
    stance: 'Saúde real começa na regulação do ritmo circadiano e na estabilização da glicose.'
  },
  {
    titleFn: () => `Mente Calma em Tempos Caóticos`,
    subFn: () => `Protocolos práticos de regulação do sistema nervoso para aliviar a ansiedade e o cansaço crônico`,
    hook: 'emocional',
    rationale: 'Forte apelo para quem sofre com estresse no trabalho, esgotamento e insônia.',
    stance: 'O corpo reage a gatilhos inconscientes; tratar a causa raiz supera mascarar os sintomas.'
  }
];

// Fórmulas de Romance / Ficção Romântica
const ROMANCE_FORMULAS: TitleFormula[] = [
  {
    titleFn: () => `Contrato com o Inimigo`,
    subFn: () => `Um romance enemies-to-lovers com namoro falso que saiu perigosamente do controle`,
    hook: 'curiosidade',
    rationale: 'O tropo mais lucrativo e buscado do romance KDP no Kindle Unlimited.',
    stance: 'Convivência forçada onde a antipatia inicial se transforma em paixão irresistível.'
  },
  {
    titleFn: () => `Onde Nossos Caminhos Cruzam`,
    subFn: () => `Uma história envolvente sobre segundas chances, recomeços e amores que curam feridas antigas`,
    hook: 'emocional',
    rationale: 'Comédia dramática romântica (Small Town Romance) de altíssima fidelização de leitores.',
    stance: 'A vulnerabilidade como ponte para conexões humanas autênticas e transformadoras.'
  }
];

function cleanTitleWords(raw: string): string[] {
  return raw
    .replace(/[:\-\–\(\)\[\]\.,!]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !/^(o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|em|no|na|nos|nas|por|para|com|como|sem|que|seu|sua|seus|suas|meu|minha)$/i.test(w));
}

export class KdpTitleSuggestionEngine {
  /**
   * Retorna se um contexto representa ficção/suspense/mistério/romance.
   */
  public static isFictionContext(theme: string = '', subtheme: string = '', text: string = ''): boolean {
    const combined = `${theme} ${subtheme} ${text}`.toLowerCase();
    return /thriller|mistério|misterio|suspense|crime|policial|ficção|ficcao|romance|terror|horror|obsessão|obsessao|psicopata|assassin|morte|fantasia/i.test(combined);
  }

  /**
   * Identifica o gênero/tipo e retorna sugestões inteligentes imediatas para o segmento.
   */
  public static getSuggestionsForTheme(
    theme: string,
    subtheme?: string,
    referenceBooks: (MarketReference | { title: string; subtitle?: string; bsr?: number; [k: string]: any })[] = []
  ): TitleSuggestion[] {
    const norm = `${theme} ${subtheme || ''}`.toLowerCase();
    const isFiction = this.isFictionContext(theme, subtheme || '');
    const isRomance = /romance|namoro|amor|paixão/i.test(norm);
    const isFinance = /finança|financa|invest|dinheiro|negócio|negocio|empresa|vendas/i.test(norm);
    const isHealth = /saúde|saude|nutrição|nutricao|sono|corpo|mente|ansiedade|longevidade/i.test(norm);

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
        uniqueAngle: `Abordagem focada em ${subtheme || theme}, eliminando clichês e com aplicação direta.`,
        stance: f.stance,
        keywords: [theme, subtheme || '', 'bestseller kdp', 'amazon kindle']
      };
    });

    // Se houver livros de referência fornecidos, inclui títulos inspirados de forma proporcional
    if (referenceBooks.length > 0) {
      referenceBooks.slice(0, 2).forEach((book, idx) => {
        const inspired = this.generateInspiredFromBook(book, theme);
        suggestions.splice(idx + 1, 0, {
          id: `inspired_${idx}_${Date.now()}`,
          title: inspired.title,
          subtitle: inspired.subtitle,
          theme,
          category: theme,
          kind,
          inspiredByBook: book.title,
          rationale: `Inspirado nos ganchos de "${book.title}" (BSR #${book.bsr || 12000}) adaptado para originalidade total.`,
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
   * Gera variações e títulos similares a partir de uma ideia livre digitada pelo usuário.
   */
  public static getSimilarTitles(
    userIdea: string,
    theme: string = '',
    subtheme: string = ''
  ): TitleSuggestion[] {
    const raw = (userIdea || '').trim();
    const effectiveTheme = theme || 'Desenvolvimento Pessoal';
    const isFiction = this.isFictionContext(effectiveTheme, subtheme, raw);
    const words = cleanTitleWords(raw.length > 0 ? raw : `${subtheme || effectiveTheme}`);
    const mainWord = words[0] || (isFiction ? 'Segredo' : 'Foco');
    const secondWord = words[1] || (isFiction ? 'Sombra' : 'Hábito');

    if (isFiction) {
      return [
        {
          id: `sim_fic_1_${Date.now()}`,
          title: `O Segredo de ${mainWord}`,
          subtitle: `Um thriller psicológico tenso onde algumas promessas deveriam permanecer enterradas no passado`,
          theme: effectiveTheme,
          category: effectiveTheme,
          kind: 'ficcao',
          rationale: `Variação de mistério investigativo construída a partir da ideia "${raw || mainWord}".`,
          hookType: 'curiosidade',
          targetBsrEstimate: 3200,
          uniqueAngle: `Tensão psicológica progressiva focada em desvendar o que realmente aconteceu.`,
          stance: `Narrativa claustrofóbica com revelações de tirar o fôlego a cada final de capítulo.`
        },
        {
          id: `sim_fic_2_${Date.now()}`,
          title: `A Última ${mainWord}`,
          subtitle: `Ela pensou que ninguém havia testemunhado. Mas o perigo já estava dentro de sua própria casa.`,
          theme: effectiveTheme,
          category: effectiveTheme,
          kind: 'ficcao',
          rationale: `Fórmula de suspense doméstico com alta retenção de leitores na Amazon KDP.`,
          hookType: 'reviravolta',
          targetBsrEstimate: 2800,
          uniqueAngle: `Conflito direto entre o instinto de sobrevivência e uma rede de mentiras cruzadas.`,
          stance: `Personagens moralmente complexos onde ninguém é puramente vítima ou vilão.`
        },
        {
          id: `sim_fic_3_${Date.now()}`,
          title: `O Preço de ${mainWord}`,
          subtitle: `Quando a obsessão pela verdade ultrapassa os limites e cobra um tributo que ninguém pode pagar`,
          theme: effectiveTheme,
          category: effectiveTheme,
          kind: 'ficcao',
          rationale: `Gancho psicológico focado nas consequências extremas de escolhas obsessivas.`,
          hookType: 'emocional',
          targetBsrEstimate: 3600,
          uniqueAngle: `Mergulho psicológico na mente do protagonista e na fragilidade da moralidade sob pressão.`,
          stance: `A verdade tem um custo alto; encará-la exige destruir a própria ilusão de inocência.`
        },
        {
          id: `sim_fic_4_${Date.now()}`,
          title: `${mainWord} Mortal`,
          subtitle: `Um jogo de gato e rato implacável onde toda verdade revelada é uma armadilha perigosa`,
          theme: effectiveTheme,
          category: effectiveTheme,
          kind: 'ficcao',
          rationale: `Variação eletrizante de alta tensão baseada em "${raw || mainWord}".`,
          hookType: 'curiosidade',
          targetBsrEstimate: 4100,
          uniqueAngle: `Ritmo acelerado com linha temporal não linear que surpreende o leitor.`,
          stance: `Quebra sistemática de clichês do gênero com desfecho imprevisível.`
        }
      ];
    }

    // Não-Ficção (Hábitos, Produtividade, Finanças, etc.)
    return [
      {
        id: `sim_nf_1_${Date.now()}`,
        title: `O Método ${mainWord}`,
        subtitle: `O passo a passo comprovado para dominar sua rotina, eliminar atritos e conquistar resultados sólidos`,
        theme: effectiveTheme,
        category: effectiveTheme,
        kind: 'nao-ficcao',
        rationale: `Fórmula de autoridade e processo claro derivado da ideia "${raw || mainWord}".`,
        hookType: 'autoridade',
        targetBsrEstimate: 2400,
        uniqueAngle: `Framework estruturado em pequenos passos acionáveis de menos de 15 minutos diários.`,
        stance: `Sistemas organizados superam força de vontade bruta em qualquer área da vida.`
      },
      {
        id: `sim_nf_2_${Date.now()}`,
        title: `O Poder de ${mainWord}`,
        subtitle: `Como pequenas mudanças intencionais transformam seus resultados e blindam sua consistência`,
        theme: effectiveTheme,
        category: effectiveTheme,
        kind: 'nao-ficcao',
        rationale: `Fórmula clássica de alta conversão para não-ficção comercial na Amazon KDP.`,
        hookType: 'promessa-forte',
        targetBsrEstimate: 1900,
        uniqueAngle: `Foco no efeito composto e na eliminação de desperdícios mentais invisíveis.`,
        stance: `Resultados extraordinários vêm da repetição disciplinada de princípios simples.`
      },
      {
        id: `sim_nf_3_${Date.now()}`,
        title: `${mainWord} Sem Segredos`,
        subtitle: `O guia definitivo e sem enrolação para aplicar na prática tudo o que realmente funciona`,
        theme: effectiveTheme,
        category: effectiveTheme,
        kind: 'nao-ficcao',
        rationale: `Gancho de clareza e desmistificação que atrai leitores frustrados com teorias vazias.`,
        hookType: 'promessa-forte',
        targetBsrEstimate: 3500,
        uniqueAngle: `Elimina jargões acadêmicos e entrega um checklist direto e executável.`,
        stance: `Pragmatismo radical: se não puder ser aplicado hoje, não entra nesta obra.`
      },
      {
        id: `sim_nf_4_${Date.now()}`,
        title: `O Algoritmo de ${mainWord}`,
        subtitle: `Como reprogramar seus comportamentos diários e blindar sua disciplina contra qualquer recaída`,
        theme: effectiveTheme,
        category: effectiveTheme,
        kind: 'nao-ficcao',
        rationale: `Gancho moderno de otimização comportamental e consistência sustentável.`,
        hookType: 'autoridade',
        targetBsrEstimate: 2900,
        uniqueAngle: `Gatilhos automáticos projetados para reduzir o esforço cognitivo de começar.`,
        stance: `Consistência é arquitetura comportamental, não sacrifício ou tortura mental.`
      }
    ];
  }

  /**
   * Gera um título e subtítulo originais inspirados diretamente em um livro de referência concorrente.
   * NUNCA produz fórmulas genéricas como "O Novo Código de..." ou concatenações quebradas ("O Efeito O").
   */
  public static generateInspiredFromBook(
    book: Partial<MarketReference> | { title: string; subtitle?: string; bsr?: number; [k: string]: any },
    themeContext?: string
  ): { title: string; subtitle: string; uniqueAngle: string; stance: string; rationale: string } {
    const rawTitle = (book.title || '').trim();
    const cleanWords = cleanTitleWords(rawTitle);
    const mainWord = cleanWords[0] || 'Segredo';
    const context = `${themeContext || ''} ${rawTitle}`.toLowerCase();
    const isFiction = this.isFictionContext(themeContext || '', '', rawTitle);

    // 1. FICÇÃO / SUSPENSE / THRILLER / ROMANCE
    if (isFiction) {
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
        },
        {
          title: `O Pacto das Sombras`,
          subtitle: `Eles juraram guardar o segredo até a morte. Mas o passado sempre encontra uma forma de cobrar o preço.`,
          uniqueAngle: `Tensão crescente de suspense psicológico com reviravolta dupla no clímax.`,
          stance: `A desintegração moral de personagens encurralados pela própria culpa.`
        }
      ];

      const picked = fictionOptions[Math.abs(rawTitle.length) % fictionOptions.length];
      return {
        ...picked,
        rationale: `Fórmula de suspense e thriller inspirada na atmosfera mercadológica de "${rawTitle}".`
      };
    }

    // 2. FINANÇAS / INVESTIMENTOS
    if (/rico|milion|dinheiro|invest|finan|patrimonio|lucro|moeda|capital/i.test(context)) {
      return {
        title: `A Máquina de Liberdade Financeira`,
        subtitle: `O mapa definitivo para construir patrimônio previsível e renda passiva partindo do zero`,
        uniqueAngle: `Metodologia de alocação de ativos simples, sem especulação de risco e com foco em dividendos sustentáveis.`,
        stance: `Enriquecimento sustentável é um processo lento, disciplinado e matemático, imune a modismos.`,
        rationale: `Fórmula de autoridade e segurança patrimonial inspirada em "${rawTitle}".`
      };
    }

    // 3. DESENVOLVIMENTO PESSOAL / HÁBITOS / PRODUTIVIDADE
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

    const picked = habitOptions[Math.abs(rawTitle.length) % habitOptions.length];
    return {
      ...picked,
      rationale: `Fórmula de alta conversão para não-ficção e produtividade inspirada em "${rawTitle}".`
    };
  }
}
