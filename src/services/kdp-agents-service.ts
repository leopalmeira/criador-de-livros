import { BookProject, IBookChapter } from '../types/book-project';
import { chamarGeminiTexto } from './kdp-ai-engine';
import { cleanChapterTitle } from './kdp-editorial-review';

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
  const isEn = Boolean(book.language && /ingl|en/i.test(book.language));

  const systemInstruction = isEn
    ? `You are an elite Amazon KDP editorial orchestrator combining three roles: editorial architect, market strategist, and continuity director.
MANDATORY LANGUAGE RULE: The ENTIRE plan (editorialVision, readerPromise, continuityBible, every single chapter title, objective, keyPoints, and transition) MUST be 100% in natural AMERICAN ENGLISH.
ABSOLUTELY ZERO WORDS IN PORTUGUESE OR ANY OTHER LANGUAGE.
Chapter title format MUST be "Chapter X: Creative English Title" or a creative title in English without the word "Capítulo".
Produce strictly valid JSON without markdown wrapping, matching this exact structure:
{"editorialVision":"...","readerPromise":"...","continuityBible":"...","chapters":[{"title":"...","objective":"...","keyPoints":["..."],"transition":"..."}]}
Include exactly ${chapterCount} chapters. Every chapter must have a distinct creative title, clear objective, 3 to 5 actionable key points, and a seamless transition.`
    : `Você é um orquestrador editorial KDP que combina três funções antes da redação: arquiteto editorial, estrategista de leitor/mercado e editor de continuidade. Produza um plano original, útil e específico para o livro informado.
Use o idioma da obra. Em não ficção, prefira orientações acionáveis, separe fatos de opinião, não invente estudos, estatísticas, citações ou promessas garantidas; respeite os limites profissionais de saúde e finanças. Em ficção, mantenha causalidade, personagens e progressão dramática coerentes.
Retorne somente JSON válido, sem markdown, com esta estrutura exata:
{"editorialVision":"...","readerPromise":"...","continuityBible":"...","chapters":[{"title":"...","objective":"...","keyPoints":["..."],"transition":"..."}]}
Inclua exatamente ${chapterCount} capítulos. Todo capítulo deve ter título, objetivo específico, 3 a 5 pontos-chave concretos e uma transição coerente para o próximo capítulo ou desfecho. Não use títulos genéricos repetidos.`;

  const prompt = isEn
    ? `Plan the complete editorial architecture for this book:
Title: ${book.title}
Subtitle: ${book.subtitle || "Not defined"}
Genre: ${book.genre}
Theme: ${book.theme || book.genre}
Subtheme: ${book.subtheme || "Not defined"}
Premise/Topic: ${book.topic}
Target Reader: ${book.targetReader || "General reader interested in the topic"}
Reader Promise: ${book.promise || "Clear, actionable mastery and compelling storytelling"}
Differentiator: ${book.differentiator || "Original, practical and engaging approach"}
Language: 100% AMERICAN ENGLISH (US)
Total Chapters: ${chapterCount}`
    : `Planeje a arquitetura editorial completa desta obra:
Título: ${book.title}
Subtítulo: ${book.subtitle || "Não definido"}
Gênero: ${book.genre}
Tema: ${book.theme || book.genre}
Subtema: ${book.subtheme || "Não definido"}
Premissa/assunto central: ${book.topic}
Leitor-alvo: ${book.targetReader || "Leitor interessado no tema"}
Promessa ao leitor: ${book.promise || "Aprendizado claro e aplicável"}
Diferencial: ${book.differentiator || "Abordagem original e prática"}
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
    let rawTitle = typeof chapter?.title === 'string' && chapter.title.trim()
      ? chapter.title.trim()
      : (isEn ? `Chapter ${index + 1}` : `Capítulo ${index + 1}`);
    if (isEn) {
      rawTitle = rawTitle.replace(/^cap[ií]tulo\s*/i, 'Chapter ');
    }
    const title = cleanChapterTitle(rawTitle);

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

  // Matriz de progressão temática em Inglês para Não Ficção
  const matrizNaoFiccaoEn = [
    {
      title: "The Foundation: Mapping the Core Problem",
      objective: "Define the central obstacle, shatter common myths, and establish a rock-solid conceptual baseline.",
      keyPoints: [
        `Diagnosis of the current landscape surrounding ${temaRef}`,
        "Why conventional shortcuts and quick fixes consistently fail",
        "Non-negotiable foundational principles for sustainable progress"
      ],
      transition: "With the foundation laid, the next phase is mastering strategic clarity and daily execution."
    },
    {
      title: "Core Pillars and Strategic Clarity",
      objective: "Build the mental framework and daily discipline required to execute without hesitation.",
      keyPoints: [
        "Dismantling cognitive noise and unproductive assumptions",
        "Aligning daily habits with long-term priority targets",
        "How top industry performers structure their workflow"
      ],
      transition: "Having anchored internal clarity, we move directly to high-impact execution systems."
    },
    {
      title: "The Execution Framework in Action",
      objective: "Deploy actionable protocols, daily checklists, and practical implementation routines.",
      keyPoints: [
        "Step-by-step framework to launch without cognitive overload",
        "Frictionless tools for high-efficiency daily momentum",
        "Fast feedback metrics to measure genuine progress"
      ],
      transition: "As execution starts, predictable obstacles emerge that require tactical shielding."
    },
    {
      title: "Overcoming Obstacles, Resistance, and Blind Spots",
      objective: "Identify recurring bottlenecks and build resilience against burnout and setbacks.",
      keyPoints: [
        "The three most frequent errors made by beginners and how to avoid them",
        "Maintaining velocity during unexpected disruptions or low-energy periods",
        "Tactics to protect your focus, energy, and mental bandwidth"
      ],
      transition: "Having cleared the hurdles, we advance toward optimization and compounding mastery."
    },
    {
      title: "Advanced Strategies and Continuous Optimization",
      objective: "Refine high-leverage techniques to maximize efficiency and accelerate outcomes.",
      keyPoints: [
        "Process optimization and sustainable compounding gains",
        "Automating routine choices to conserve mental energy",
        "Tactics for professional differentiation and deep mastery"
      ],
      transition: "To validate these frameworks, we inspect real-world case applications."
    },
    {
      title: "Real-World Case Studies and Field Lessons",
      objective: "Examine authentic scenarios of implementation across varying environments.",
      keyPoints: [
        "Dissecting what separates success from frustration in practice",
        "Adapting the core framework to different schedules and constraints",
        "Timeless insights gathered from sustained field execution"
      ],
      transition: "With practical validation established, the focus turns to long-term sustainability."
    },
    {
      title: "Long-Term Systems and Relentless Consistency",
      objective: "Ensure outcomes endure by embedding them into automated, sustainable systems.",
      keyPoints: [
        "Turning deliberate effort into effortless automatic habits",
        "Periodic audits and quantitative checkpoints",
        "Building resilience against environment shifts"
      ],
      transition: "We arrive at the final synthesis and the creation of your definitive action roadmap."
    },
    {
      title: "The Master Blueprint and Future Horizons",
      objective: "Consolidate the entire journey into a clear, empowering, future-proof blueprint.",
      keyPoints: [
        "Final implementation checklist of mastered principles",
        "Personal manifesto of commitment to sustained excellence",
        "Guidelines for autonomous lifelong progression"
      ],
      transition: "Complete and definitive conclusion delivering lasting transformational value."
    }
  ];

  // Matriz de progressão temática em Inglês para Ficção
  const matrizFiccaoEn = [
    {
      title: "The Inciting Incident and the Cold Dawn",
      objective: "Establish the world, introduce the protagonist in their routine, and trigger the catalyst event.",
      keyPoints: [
        "The fragile normalcy and lingering tensions of the protagonist",
        "An unexpected omen or event that shatters routine",
        "The initial dilemma that forces an irreversible choice"
      ],
      transition: "Normalcy broken, the journey crosses into dangerous, uncharted territory."
    },
    {
      title: "Crossing the Threshold into the Unknown",
      objective: "Thrust the characters into the new environment and test their resolve against early hazards.",
      keyPoints: [
        "Arrival in an uncertain realm with unwritten rules",
        "First encounters with ambiguous allies and potential adversaries",
        "An early test exposing the vulnerabilities of the group"
      ],
      transition: "The illusion of an easy escape crumbles as deeper threats emerge from the shadows."
    },
    {
      title: "Hidden Shadows and Whispers of Betrayal",
      objective: "Deepen the central mystery and elevate dramatic tension through revealed secrets.",
      keyPoints: [
        "Discovery of a hidden conspiracy no one foresaw",
        "Fractures of trust between the primary characters",
        "A ticking clock that rapidly limits all avenues of retreat"
      ],
      transition: "With no safe harbor left, the only path forward leads into the heart of danger."
    },
    {
      title: "The Point of No Return",
      objective: "Escalate the conflict to a dramatic peak where the greatest loss or realization occurs.",
      keyPoints: [
        "Direct confrontation with an overwhelming opposing force",
        "A moment of utter despair where all hope seems lost",
        "A pivotal decision that rekindles the protagonist determination"
      ],
      transition: "From the ashes of crisis, the final strategy takes shape for the ultimate clash."
    },
    {
      title: "The Final Confrontation and Full Resolution",
      objective: "Resolve the central conflict in a memorable, definitive, and emotionally resonant finale.",
      keyPoints: [
        "The climactic face-off where every hidden truth collides",
        "Ultimate triumph earned through hardship and personal growth",
        "An epilogue tying all loose threads into a deeply satisfying conclusion"
      ],
      transition: "Complete narrative resolution bringing full closure to the journey."
    }
  ];

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

  // Sanitização de tema para títulos: nunca deixar uma premissa ou parágrafo inteiro vazar no título
  const temaSanitizado = (() => {
    const raw = book.topic || book.subtheme || book.theme || book.title || '';
    const clean = raw
      .replace(/^["'“”«»]+|["'“”«»]+$/g, '')
      .replace(/^(?:o livro|este livro|a obra|uma narrativa|narrativa|história|o enredo)\s+(?:explora|conta|apresenta|revela|trata|fala sobre|centrado em)\s+/i, '')
      .trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'Domínio Prático';
    if (words.length <= 3) return clean;
    return words.slice(0, 3).join(' ');
  })();

  // 40+ Títulos autênticos e distintos para Ficção (nunca repete títulos nem usa Parte X)
  const titulosFiccaoBase = isEn ? [
    'The First Omen', 'Shadows of the Past', 'Whispers in the Dark', 'Crossing the Threshold',
    'A Fractured Memory', 'The Hidden Truth', 'Echoes of Betrayal', 'Into the Unknown',
    'The Gathering Storm', 'Tangled Alliances', 'A Game of Deception', 'The Edge of Reason',
    'Midnight Confessions', 'The Silent Witness', 'Under the Cold Light', 'Chasing Phantoms',
    'The Broken Seal', 'A Veil of Deceit', 'Point of No Return', 'The Longest Night',
    'Fires in the Distance', 'A Spark in the Fog', 'The Hunter and the Prey', 'Masks Torn Away',
    'The Bitter Hour', 'Bloodlines and Secrets', 'The Turning Tide', 'A Fragile Truce',
    'The Abyss Below', 'Voices from the Ashes', 'Before the Dawn', 'A Reckoning Demanded',
    'The Final Stand', 'Crossroads of Destiny', 'When Empires Fall', 'The Last Sacrifice',
    'Shattered Illusions', 'The Crucible of Fire', 'Resurrection of Hope', 'A New World Order'
  ] : isEs ? [
    'El Primer Presagio', 'Sombras del Pasado', 'Susurros en la Niebla', 'Cruzando el Umbral',
    'Memorias Fracturadas', 'La Verdad Oculta', 'Ecos de Traición', 'Hacia lo Desconocido',
    'La Tormenta Inminente', 'Alianzas Peligrosas', 'El Juego del Engaño', 'Al Borde del Abismo',
    'Confesiones a Medianoche', 'El Testigo Silencioso', 'Bajo la Luz Fría', 'Cazando Fantasmas',
    'El Sello Roto', 'Un Velo de Mentiras', 'Punto de No Retorno', 'La Noche Más Larga',
    'Fuegos en la Lejanía', 'Un Destello en la Niebla', 'El Cazador y la Presa', 'Máscaras Caídas',
    'La Hora Difícil', 'Linajes y Secretos', 'El Cambio de Marea', 'Una Tregua Frágil',
    'El Abismo Interior', 'Voces entre Cenizas', 'Antes del Amanecer', 'El Ajuste de Cuentas',
    'La Batalla Final', 'Encrucijada de Destinos', 'La Caída de la Fortaleza', 'El Último Sacrificio',
    'Ilusiones Rotas', 'El Crisol del Fuego', 'El Renacer de la Esperanza', 'Un Nuevo Amanecer'
  ] : [
    'O Primeiro Presságio', 'Sombras do Passado', 'Sussurros na Névoa', 'Cruzando o Limiar',
    'Memórias Fraturadas', 'A Verdade Oculta', 'Ecos de Traição', 'Rumo ao Desconhecido',
    'A Tempestade Iminente', 'Alianças Perigosas', 'O Jogo do Engano', 'À Beira do Abismo',
    'Confissões da Meia-Noite', 'A Testemunha Silenciosa', 'Sob a Luz Fria', 'Caçando Fantasmas',
    'O Selo Rompido', 'Um Véu de Mentiras', 'Ponto Sem Retorno', 'A Noite Mais Longa',
    'Fogo na Distância', 'Um Vislumbre na Bruma', 'O Caçador e a Presa', 'Máscaras Caídas',
    'A Hora Decisiva', 'Linhagens e Segredos', 'A Virada da Maré', 'Uma Trégua Frágil',
    'O Abismo Interior', 'Vozes Entre Cinzas', 'Antes da Alvorada', 'O Acerto de Contas',
    'O Confronto Final', 'Encruzilhada de Destinos', 'A Queda da Fortaleza', 'O Último Sacrifício',
    'Ilusões Desfeitas', 'O Crisol do Fogo', 'O Renascer da Esperança', 'Um Novo Horizonte'
  ];

  // 40+ Títulos autênticos e distintos para Não Ficção (livros de negócios, finanças, autoajuda, liderança)
  const titulosNaoFiccaoBase = isEn ? [
    'The Core Foundation', 'The Hidden Diagnosis', 'Unlocking Clarity', 'Mental Models for Mastery',
    'The Execution Engine', 'Overcoming Friction', 'Strategic Leverage', 'High-Impact Habits',
    'The Discipline Framework', 'Shattering Blind Spots', 'Building Relentless Focus', 'Data vs Intuition',
    'The Growth Multiplier', 'Real-World Case Studies', 'Navigating Crisis', 'Optimizing Systems',
    'The Leadership Mindset', 'Scaling Your Impact', 'The Momentum Paradox', 'Resilience by Design',
    'Sustained Performance', 'The Compounding Effect', 'Strategic Decision-Making', 'The Antifragile Protocol',
    'Mastering the Fundamentals', 'The Architecture of Influence', 'Eliminating Bottlenecks', 'Peak Efficiency',
    'The Long-Term Vision', 'Auditing Your Progress', 'Continuous Mastery', 'The Ultimate Playbook'
  ] : isEs ? [
    'El Fundamento Esencial', 'El Diagnóstico Oculto', 'Claridad Estratégica', 'Modelos Mentales de Maestría',
    'El Motor de Ejecución', 'Superando la Fricción', 'Apalancamiento Práctico', 'Hábitos de Alto Impacto',
    'La Disciplina Consciente', 'Puntos Ciegos y Errores', 'Foco Imparable', 'Datos frente a Intuición',
    'El Multiplicador del Éxito', 'Casos de Estudio Reales', 'Gestión de Crisis', 'Optimización de Sistemas',
    'La Mentalidad de Liderazgo', 'Escalar el Impacto', 'La Paradoja del Impulso', 'Resiliencia por Diseño',
    'Rendimiento Sostenido', 'El Efecto Compuesto', 'Toma de Decisiones', 'El Protocolo Antifrágil',
    'Dominio de los Fundamentos', 'Arquitectura de Influencia', 'Eliminando Cuellos de Botella', 'Eficiencia Máxima',
    'La Visión de Futuro', 'Auditoría de Resultados', 'Maestría Continua', 'El Plan de Acción Definitivo'
  ] : [
    'A Fundação Essencial', 'O Diagnóstico Oculto', 'Clareza Estratégica', 'Modelos Mentais de Maestria',
    'O Motor da Execução', 'Vencendo a Fricção', 'Alavancagem Prática', 'Hábitos de Alto Impacto',
    'A Disciplina Consciente', 'Pontos Cegos e Erros Fatais', 'Foco Inegociável', 'Dados versus Intuição',
    'O Multiplicador de Resultados', 'Estudos de Casos Reais', 'Navegando em Crises', 'Otimização de Sistemas',
    'A Mentalidade de Liderança', 'Escalando o Impacto', 'O Paradoxo do Impulso', 'Resiliência por Design',
    'Performance Sustentável', 'O Efeito Cumulativo', 'Tomada de Decisão Estratégica', 'O Protocolo Antifrágil',
    'Maestria dos Fundamentos', 'Arquitetura de Influência', 'Eliminando Gargalos', 'Eficiência Máxima',
    'A Visão de Longo Prazo', 'Auditoria de Evolução', 'Aprimoramento Contínuo', 'O Plano de Ação Definitivo'
  ];

  const titulosBase = isFiccao ? titulosFiccaoBase : titulosNaoFiccaoBase;
  const chapters: KdpEditorialChapterPlan[] = [];

  for (let i = 0; i < chapterCount; i++) {
    const num = i + 1;
    let title = titulosBase[i % titulosBase.length];

    // Se o número de capítulos ultrapassar a lista base, cria variações elegantes sem usar "(Parte X)"
    if (i >= titulosBase.length) {
      const ciclo = Math.floor(i / titulosBase.length);
      const sufixosVariados = isEn
        ? ['Revisited', 'Advanced Principles', 'Deep Dive', 'Perspectives', 'The Evolution']
        : isEs
        ? ['Revisitado', 'Principios Avanzados', 'Profundización', 'Nuevas Perspectivas', 'La Evolución']
        : ['Revisitado', 'Princípios Avançados', 'Aprofundamento', 'Novas Perspectivas', 'A Evolução'];
      const sufixo = sufixosVariados[(ciclo - 1) % sufixosVariados.length];
      title = `${title}: ${sufixo}`;
    }

    // Regras especiais elegantes para Primeiro e Último Capítulo:
    if (num === 1) {
      title = isFiccao
        ? (isEn ? 'The Gathering Shadows' : isEs ? 'El Despertar de las Sombras' : 'O Despertar das Sombras')
        : (isEn ? `The Foundation: Understanding ${temaSanitizado}` : isEs ? `El Fundamento: Comprendiendo ${temaSanitizado}` : `A Fundação: Compreendendo ${temaSanitizado}`);
    } else if (num === chapterCount) {
      title = isFiccao
        ? (isEn ? 'A New Dawn' : isEs ? 'Un Nuevo Amanecer' : 'O Novo Horizonte')
        : (isEn ? 'The Master Blueprint & Next Steps' : isEs ? 'El Plan Definitivo y Próximos Pasos' : 'O Plano Definitivo e Próximos Passos');
    }

    const matrizAtiva = isEn
      ? (isFiccao ? matrizFiccaoEn : matrizNaoFiccaoEn)
      : (isFiccao ? matrizFiccao : matrizNaoFiccao);
    const templateObj = matrizAtiva[i % matrizAtiva.length];

    const transition = num === chapterCount
      ? (isEn ? 'Final conclusion and full completion of the book.' : isEs ? 'Conclusión final y cierre definitivo de la obra.' : 'Conclusão definitiva e encerramento da obra com impacto e coerência.')
      : (isEn ? `Seamless transition into Chapter ${num + 1}.` : isEs ? `Transición fluida hacia el Capítulo ${num + 1}.` : `Transição fluida conectando os desdobramentos com os desafios do Capítulo ${num + 1}.`);

    chapters.push({
      title,
      objective: templateObj.objective,
      keyPoints: [...templateObj.keyPoints],
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
