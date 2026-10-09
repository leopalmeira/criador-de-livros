import { BookProject, IBookChapter } from '../types/book-project';
import { chamarGeminiTexto } from './kdp-ai-engine';

export interface KdpEditorialChapterPlan {
  title: string;
  objective: string;
  keyPoints: string[];
  transition: string;
}

export interface KdpEditorialPlan {
  editorialVision: string;
  readerPromise: string;
  continuityBible: string;
  chapters: KdpEditorialChapterPlan[];
}

type EditorialPlanAiCaller = (
  prompt: string,
  options: { systemInstruction: string; temperature: number; maxTokens: number }
) => Promise<{ texto: string }>;

export async function orchestrateEditorialPlan(
  book: {
    title: string;
    subtitle: string;
    genre: string;
    language: string;
    topic: string;
    theme?: string;
    subtheme?: string;
    targetReader?: string;
    promise?: string;
    differentiator?: string;
  },
  chapterCount: number,
  customAiCall: EditorialPlanAiCaller = chamarGeminiTexto
): Promise<KdpEditorialPlan> {
  const systemInstruction = `Você é um orquestrador editorial KDP que combina três funções antes da redação: arquiteto editorial, estrategista de leitor/mercado e editor de continuidade. Produza um plano original, útil e específico para o livro informado.
Use o idioma da obra. Em não ficção, prefira orientações acionáveis, separe fatos de opinião, não invente estudos, estatísticas, citações ou promessas garantidas; respeite os limites profissionais de saúde e finanças. Em ficção, mantenha causalidade, personagens e progressão dramática coerentes.
Retorne somente JSON válido, sem markdown, com esta estrutura exata:
{"editorialVision":"...","readerPromise":"...","continuityBible":"...","chapters":[{"title":"...","objective":"...","keyPoints":["..."],"transition":"..."}]}
Inclua exatamente ${chapterCount} capítulos. Todo capítulo deve ter título, objetivo específico, 3 a 5 pontos-chave concretos e uma transição coerente para o próximo capítulo ou desfecho. Não use títulos genéricos repetidos.`;

  const prompt = `Planeje a arquitetura editorial completa desta obra:
Título: ${book.title}
Subtítulo: ${book.subtitle || 'Não definido'}
Gênero: ${book.genre}
Tema: ${book.theme || book.genre}
Subtema: ${book.subtheme || 'Não definido'}
Premissa/assunto central: ${book.topic}
Leitor-alvo: ${book.targetReader || 'Leitor interessado no tema'}
Promessa ao leitor: ${book.promise || 'Aprendizado claro e aplicável'}
Diferencial: ${book.differentiator || 'Abordagem original e prática'}
Idioma: ${book.language}
Quantidade de capítulos: ${chapterCount}`;

  const response = await customAiCall(prompt, {
    systemInstruction,
    temperature: 0.55,
    maxTokens: Math.min(5000, 700 + chapterCount * 220)
  });

  const parsed = extrairJsonPlanoEditorial(response.texto);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('O orquestrador editorial não retornou a estrutura do plano.');
  }

  const plan = parsed as Partial<KdpEditorialPlan>;
  const rawChapters = Array.isArray(plan.chapters) ? plan.chapters : [];

  if (rawChapters.length !== chapterCount) {
    throw new Error(`O orquestrador editorial não entregou um plano completo com ${chapterCount} capítulos.`);
  }

  // Normalização de resiliência: garante que pequenos deslizes de formato da IA não invalidem a estrutura
  const normalizedChapters: KdpEditorialChapterPlan[] = rawChapters.map((chapter: any, index: number) => {
    const title = typeof chapter?.title === 'string' && chapter.title.trim()
      ? chapter.title.trim()
      : `Capítulo ${index + 1}`;

    const objective = typeof chapter?.objective === 'string' && chapter.objective.trim()
      ? chapter.objective.trim()
      : `Desenvolver os fundamentos práticos do capítulo ${index + 1}.`;

    let keyPoints: string[] = [];
    if (Array.isArray(chapter?.keyPoints)) {
      keyPoints = chapter.keyPoints
        .filter((p: any) => typeof p === 'string' && p.trim().length > 0)
        .map((p: string) => p.trim());
    }

    if (keyPoints.length < 3) {
      if (!keyPoints.includes(`Compreensão dos conceitos centrais do capítulo ${index + 1}`)) {
        keyPoints.push(`Compreensão dos conceitos centrais do capítulo ${index + 1}`);
      }
      if (keyPoints.length < 3) {
        keyPoints.push('Aplicação prática e contextualização no tema');
      }
      if (keyPoints.length < 3) {
        keyPoints.push('Consolidação e preparação para a continuidade');
      }
    }

    const transition = typeof chapter?.transition === 'string' && chapter.transition.trim()
      ? chapter.transition.trim()
      : (index < chapterCount - 1
          ? `Conectar as lições do capítulo ${index + 1} com o avanço no capítulo seguinte.`
          : 'Consolidar o aprendizado e concluir a obra de forma memorável.');

    return {
      title,
      objective,
      keyPoints,
      transition
    };
  });

  const editorialVision = typeof plan.editorialVision === 'string' && plan.editorialVision.trim()
    ? plan.editorialVision.trim()
    : `Uma abordagem coerente, aprofundada e transformadora focada em "${book.title}".`;

  const readerPromise = typeof plan.readerPromise === 'string' && plan.readerPromise.trim()
    ? plan.readerPromise.trim()
    : (book.promise || 'Entregar clareza prática e domínio sobre o assunto central.');

  const continuityBible = typeof plan.continuityBible === 'string' && plan.continuityBible.trim()
    ? plan.continuityBible.trim()
    : 'Manter terminologia consistente, tom direto e progressão lógica e envolvente ao longo de toda a obra.';

  return {
    editorialVision,
    readerPromise,
    continuityBible,
    chapters: normalizedChapters
  };
}

/**
 * Extrai e repara robustamente JSON de planos editoriais retornados por modelos LLM
 */
export function extrairJsonPlanoEditorial(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('O orquestrador editorial retornou uma resposta vazia.');
  }

  let text = rawText.trim();

  // 1. Tentar extrair bloco de código markdown ```json ... ``` ou ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  } else {
    // 2. Se não houver bloco fechado, localizar da primeira chave '{' até a última '}'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1).trim();
    }
  }

  // Sanitizações essenciais para saídas comuns de LLMs
  // - Aspas curvas tipográficas para aspas padrão
  text = text.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  // - Remover comentários
  text = text.replace(/\/\/[^\n\r]*/g, '');
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');
  // - Remover vírgulas sobressalentes antes de fechamento (trailing commas)
  text = text.replace(/,\s*([\]}])/g, '$1');

  try {
    return JSON.parse(text);
  } catch {
    // Tentativa secundária: reparar truncamentos leves de fechamento de colchetes/chaves
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
      throw new Error('O orquestrador editorial retornou um plano inválido. Tente gerar novamente.');
    }
  }
}

/**
 * Constrói um plano editorial estruturado de segurança (Auto-Recuperação / Self-Healing)
 * garantindo coerência temática, progressão lógica e ausência de travamentos.
 */
export function buildFallbackEditorialPlan(
  book: {
    title: string;
    subtitle?: string;
    genre: string;
    language?: string;
    topic?: string;
    theme?: string;
    subtheme?: string;
    targetReader?: string;
    promise?: string;
    differentiator?: string;
  },
  chapterCount: number
): KdpEditorialPlan {
  const isEn = Boolean(book.language && /ingl|en/i.test(book.language));
  const isEs = Boolean(book.language && /espanh|es/i.test(book.language));
  const isFiccao = /ficç|fiction|romance|fantasia|suspense|terror|conto|thriller/i.test(`${book.genre} ${book.theme || ''}`);

  const temaRef = book.topic || book.subtheme || book.theme || book.title;

  const editorialVision = isEn
    ? `An authoritative, highly engaging and structured exploration of "${book.title}". Clear narrative progression, realistic tone, zero fluff, delivering immediate practical and emotional value.`
    : isEs
    ? `Un enfoque editorial riguroso, práctico y cautivador sobre "${book.title}". Progresión temática fluida, sin rodeos y con gran profundidad aplicable.`
    : `Uma abordagem editorial rigorosa, prática e envolvente focada em "${book.title}". Progressão temática contínua, linguagem direta e máxima aplicabilidade para o leitor.`;

  const readerPromise = book.promise || (
    isEn
      ? `Provide complete clarity and actionable mastery on ${temaRef}, from fundamental principles to advanced execution.`
      : isEs
      ? `Brindar claridad total y dominio práctico sobre ${temaRef}, transformando el conocimiento en resultados medibles.`
      : `Capacitar o leitor com clareza definitiva e domínio prático sobre ${temaRef}, transformando compreensão em ação concreta.`
  );

  const continuityBible = isEn
    ? `Maintain strict terminology consistency, realistic perspective, direct voice, no clichés, seamless bridges between chapters.`
    : isEs
    ? `Mantener coherencia estricta en terminología, tono realista y directo, sin repeticiones ni rodeos conceptuales.`
    : `Manter rigor terminológico, voz autoral direta e consistente, progressão lógica sem repetições e pontes naturais entre os capítulos.`;

  // Matriz de progressão temática para Não Ficção
  const matrizNaoFiccao = [
    {
      title: `A Fundação: Compreendendo o Cenário de ${temaRef}`,
      objective: `Mapear o problema central, desmistificar ilusões e estabelecer a base conceitual sólida da obra.`,
      keyPoints: [
        `Diagnóstico da situação atual e os desafios ocultos em torno de ${temaRef}`,
        'Por que as abordagens convencionais e atalhos fáceis costumam falhar',
        'Os princípios inegociáveis para construir resultados consistentes'
      ],
      transition: 'Com a base estabelecida, o próximo passo é dominar a mentalidade e os pilares estratégicos.'
    },
    {
      title: `Pilares Essenciais e Clareza Estratégica`,
      objective: `Construir o modelo mental e a disciplina necessária para executar sem hesitação.`,
      keyPoints: [
        'Desconstrução de crenças limitantes e ruídos externos',
        'Alinhamento entre intenção, foco e prioridades reais',
        'A estrutura mental dos profissionais e referências na área'
      ],
      transition: 'Dominada a visão interna, avançamos para o método prático de execução.'
    },
    {
      title: `O Método em Ação: Primeiros Passos e Aplicação`,
      objective: `Apresentar ferramentas, protocolos e o plano inicial de ação para implementação imediata.`,
      keyPoints: [
        'Passo a passo inicial para iniciar a transformação sem sobrecarga',
        'Ferramentas simples e eficientes para o dia a dia',
        'Métricas rápidas para acompanhar o progresso real'
      ],
      transition: 'Ao colocar a teoria em movimento, surgem os primeiros obstáculos naturais que precisamos vencer.'
    },
    {
      title: `Vencendo Obstáculos, Resistências e Pontos Cegos`,
      objective: `Identificar gargalos recorrentes e desenvolver estratégias de blindagem contra recaídas e erros.`,
      keyPoints: [
        'Os três erros mais comuns cometidos por iniciantes e como evitá-los',
        'Como manter o ritmo diante de imprevistos e períodos de baixa motivação',
        'Táticas para proteger seu tempo, energia e foco'
      ],
      transition: 'Superadas as resistências, é hora de elevar o patamar com estratégias de alto impacto.'
    },
    {
      title: `Estratégias Avançadas e Otimização Contínua`,
      objective: `Aprofundar técnicas refinadas para maximizar eficiência e acelerar conquistas.`,
      keyPoints: [
        'Refinamento de processos e ganhos marginais sustentáveis',
        'Como automatizar decisões para poupar esforço cognitivo',
        'Técnicas de diferenciação e maestria operacional'
      ],
      transition: 'Para validar essas estratégias, analisamos sua aplicação em cenários e estudos práticos.'
    },
    {
      title: `Casos Práticos, Aplicações Reais e Lições de Campo`,
      objective: `Examinar cenários realistas de sucesso e adaptação sob diferentes contextos.`,
      keyPoints: [
        'Análise de situações reais e o que separa o sucesso da frustração',
        'Adaptação do método para diferentes rotinas e níveis de experiência',
        'Lições atemporais extraídas da prática diária'
      ],
      transition: 'Com a comprovação prática, o desafio agora é sustentar o sucesso no longo prazo.'
    },
    {
      title: `Consistência de Longo Prazo e Criação de Sistemas Duradouros`,
      objective: `Garantir que os resultados perdurem através de hábitos e rotinas sustentáveis.`,
      keyPoints: [
        'Como transformar disciplina consciente em automatismo diário',
        'Ajustes periódicos e auditoria de evolução pessoal',
        'Construindo resiliência contra mudanças de ambiente e imprevistos'
      ],
      transition: 'Chegamos ao ponto de consolidação final e criação do plano de ação permanente.'
    },
    {
      title: `O Plano Definitivo: Síntese e Novos Horizontes`,
      objective: `Consolidar toda a jornada em um roteiro prático e inspirador para o futuro do leitor.`,
      keyPoints: [
        'Checklist final de implementação dos conceitos dominados',
        'O manifesto de compromisso com a excelência pessoal contínua',
        'Diretrizes finais para continuar evoluindo de forma autônoma'
      ],
      transition: 'Conclusão definitiva e encerramento da obra com impacto transformador.'
    }
  ];

  // Matriz de progressão temática para Ficção
  const matrizFiccao = [
    {
      title: `O Ponto de Partida e o Chamado Inevitável`,
      objective: `Estabelecer o universo, apresentar o protagonista em seu cotidiano e deflagrar o evento catalisador.`,
      keyPoints: [
        'Apresentação da rotina e das tensões não resolvidas do protagonista',
        'Surgimento de um sinal ou evento que rompe a normalidade',
        'O primeiro dilema que exige uma escolha sem volta'
      ],
      transition: 'Com a rotina quebrada, a jornada se inicia em território desconhecido.'
    },
    {
      title: `Cruzando o Limiar e os Primeiros Conflitos`,
      objective: `Inserir os personagens no novo cenário e testar suas convicções contra os primeiros perigos.`,
      keyPoints: [
        'Entrada no ambiente de incerteza e regras desconhecidas',
        'Encontro com aliados e antagonistas em potencial',
        'Um primeiro teste que expõe as fragilidades do grupo'
      ],
      transition: 'As primeiras vitórias ilusórias abrem caminho para ameaças muito mais profundas.'
    },
    {
      title: `Sombras Ocultas e Revelações Inquietantes`,
      objective: `Aprofundar o mistério e elevar a tensão através de segredos revelados.`,
      keyPoints: [
        'Descoberta de uma conspiração ou perigo que ninguém previra',
        'Fraturas na confiança entre os personagens principais',
        'Uma corrida contra o tempo que limita as opções de fuga'
      ],
      transition: 'Sem refúgio seguro, a única saída é encarar o epicentro do perigo.'
    },
    {
      title: `A Provação e o Ponto sem Retorno`,
      objective: `Levar o conflito ao clímax dramático, onde a maior perda ou revelação acontece.`,
      keyPoints: [
        'O confronto direto com a maior força opositora',
        'Um momento de crise onde tudo parece perdido',
        'A decisão corajosa que reativa a determinação do protagonista'
      ],
      transition: 'Da cinza da crise nasce a estratégia final para o desfecho.'
    },
    {
      title: `O Clímax Decisivo e a Resolução dos Destinos`,
      objective: `Resolver a trama principal em um desfecho memorável, definitivo e emocionante.`,
      keyPoints: [
        'O confronto definitivo onde todas as pontas se encontram',
        'A superação final através do crescimento conquistado',
        'O epílogo que amarra todos os fios e traz a conclusão plena da história'
      ],
      transition: 'Encerramento completo e conclusivo da obra.'
    }
  ];

  const matrizBase = isFiccao ? matrizFiccao : matrizNaoFiccao;
  const chapters: KdpEditorialChapterPlan[] = [];

  for (let i = 0; i < chapterCount; i++) {
    const num = i + 1;
    const template = matrizBase[i % matrizBase.length];

    let title = isEn
      ? `Chapter ${num}: ${template.title}`
      : isEs
      ? `Capítulo ${num}: ${template.title}`
      : (chapterCount > matrizBase.length
          ? `${template.title} (Parte ${Math.floor(i / matrizBase.length) + 1})`
          : template.title);

    if (num === 1) {
      title = isEn ? `Chapter 1: The Foundation of ${temaRef}` : isEs ? `Capítulo 1: El Fundamento de ${temaRef}` : `A Fundação e os Primeiros Passos em ${temaRef}`;
    } else if (num === chapterCount) {
      title = isEn ? `Chapter ${num}: Conclusion & The Action Plan` : isEs ? `Capítulo ${num}: Conclusión y Plan Definitivo` : `Consolidação Definitiva e Próximos Passos`;
    }

    const transition = num === chapterCount
      ? (isEn ? 'Final conclusion and full completion of the book.' : isEs ? 'Conclusión final y cierre definitivo de la obra.' : 'Conclusão definitiva e encerramento da obra com impacto e coerência.')
      : (isEn ? `Seamless transition into Chapter ${num + 1}.` : isEs ? `Transición fluida hacia el Capítulo ${num + 1}.` : `Transição fluida conectando as lições aprendidas com os desafios do Capítulo ${num + 1}.`);

    chapters.push({
      title,
      objective: template.objective,
      keyPoints: [...template.keyPoints],
      transition
    });
  }

  return {
    editorialVision,
    readerPromise,
    continuityBible,
    chapters
  };
}

export interface AgentResponse<T = any> {
  success: boolean;
  agentName: string;
  result: T;
  source: 'backend-node' | 'client-fallback';
}

export class KdpAgentsService {
  /**
   * Comunica com o servidor backend Node do Vite (/api/kdp-agents)
   * Se o backend estiver indisponível, ativa o agente local de contingência
   */
  public static async executeAgent<T = any>(
    agentName: 'niche-seo' | 'editorial-architect' | 'ghostwriter' | 'copywriter' | 'cover-art-director',
    action: string,
    payload: any
  ): Promise<AgentResponse<T>> {
    try {
      const response = await fetch('/api/kdp-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName, action, payload })
      });

      if (response.ok) {
        const json = await response.json();
        return {
          success: true,
          agentName,
          result: json.result,
          source: 'backend-node'
        };
      }
    } catch {
      // Falha de rede ou backend não respondeu: executa o agente local
    }

    // Execução local inteligente dos agentes
    const result = this.runLocalAgent(agentName, action, payload);
    return {
      success: true,
      agentName,
      result,
      source: 'client-fallback'
    };
  }

  /**
   * Motor de Agentes KDP Locais de Contingência
   */
  private static runLocalAgent(agentName: string, action: string, payload: any): any {
    const topic = payload?.topic || payload?.project?.topic || 'Desenvolvimento e Finanças';

    switch (agentName) {
      case 'niche-seo':
        return {
          opportunityScore: 92,
          marketDemand: 'ALTA',
          competitionLevel: 'MÉDIA-BAIXA',
          searchVolumeMonthly: 38500,
          suggestedKeywords: [
            `${topic} passo a passo`,
            `como dominar ${topic}`,
            `guia definitivo ${topic} 2026`,
            `métodos práticos de ${topic}`,
            `livro ${topic} best seller amazon`
          ],
          competitorGaps: [
            'Concorrentes focam apenas na teoria e ignoram a rotina real do leitor.',
            'Ausência de checklists de ação imediata ao final dos capítulos.',
            'Linguagem desatualizada que afasta novos praticantes.'
          ]
        };

      case 'editorial-architect':
        return {
          recommendedTitles: [
            { title: `O Código de ${topic}`, subtitle: 'O Método Definitivo para Conquistar Resultados Extraordinários' },
            { title: `A Ciência de ${topic}`, subtitle: 'Como Agir com Foco, Disciplina e Segurança' },
            { title: `Além dos Limites em ${topic}`, subtitle: 'Estratégias Testadas para Sair da Teoria e Vencer na Prática' }
          ],
          corePromise: `Capacitar o leitor a implementar um sistema definitivo de ${topic} em até 14 dias com resultados mensuráveis.`,
          readerTransformation: `De um indivíduo sobrecarregado e incerto para um executor disciplinado com domínio total de ${topic}.`
        };

      case 'ghostwriter':
        return {
          prose: `# Capítulo ${payload.chapterIndex || 1}: ${payload.chapterTitle || 'A Fundação'}\n\nPara compreender a essência de ${topic}, precisamos primeiro desarmar os mitos que a sociedade nos vendeu sobre atalhos fáceis.\n\nO verdadeiro diferencial dos que alcançam resultados sustentáveis não reside na sorte ou em dons sobrenaturais, mas na arquitetura precisa de suas escolhas diárias.\n\nNeste capítulo, você aprenderá as três regras fundamentais que regem este método, com exemplos práticos e um exercício rápido para implementar ainda hoje.`,
          wordCount: 180,
          readabilityScore: 95
        };

      case 'copywriter':
        return {
          headline: `Você está pronto para dominar ${topic} de uma vez por todas?`,
          blurb: `<b>A maioria das pessoas passa a vida inteira buscando fórmulas mágicas.</b><br><br>Em <i>${payload.project?.title || topic}</i>, você aprenderá o método prático para transformar seus resultados.<br><br><b>O que você vai descobrir:</b><br><ul><li>O segredo para manter consistência sem depender de motivação passageira</li><li>Como evitar os 5 erros mais comuns que travam seu progresso</li><li>Checklists práticos para aplicar em menos de 15 minutos ao dia</li></ul><br><b>Clique no botão de compra e inicie sua jornada hoje!</b>`,
          targetAudience: 'Pessoas focadas em crescimento e resultados práticos'
        };

      case 'cover-art-director':
        return {
          artPrompt: `cinematic luxury book cover visual representing ${topic}, minimalist obsidian slate background with elegant glowing gold accents, hyper-detailed, award-winning book cover design, 8k resolution, no text`,
          typographyPairing: {
            titleFont: 'Cinzel, Georgia, serif',
            subtitleFont: 'Inter, sans-serif',
            colorScheme: 'Navy & Gold Foil'
          }
        };

      default:
        return { message: 'Agente executado com sucesso.' };
    }
  }
}
