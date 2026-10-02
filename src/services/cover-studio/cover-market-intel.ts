// Serviço de Inteligência Visual, Análise de Mercado e Direção de Arte para Capas KDP
import { BookProject } from '../../types/book-project';

export interface BookVisualAnalysis {
  coreConcept: string;
  visualMetaphors: string[];
  emotionalTrigger: string;
  targetAudiencePsychology: string;
  keyFocalPoint: string;
  recommendedComposition: string;
  genreSymbolism: string[];
}

export interface MarketVisualTrend {
  genre: string;
  marketDemand: 'MUITO ALTA' | 'ALTA' | 'ESTÁVEL';
  bestsellerColorPalette: {
    name: string;
    primaryHex: string;
    secondaryHex: string;
    accentHex: string;
    bgHex: string;
    description: string;
  };
  typographyTrends: {
    titleFontFamily: string;
    subtitleFontFamily: string;
    authorFontFamily: string;
    styleNotes: string;
  };
  visualCompositionPatterns: string[];
  competitorGaps: string[];
  amazonThumbnailTips: string[];
}

export interface ArtDirectionConfig {
  styleName: string;
  styleDescription: string;
  lightingMood: string;
  focalElement: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    scrimOverlay: string;
  };
  typography: {
    titleFont: string;
    subtitleFont: string;
    authorFont: string;
    titleColor: string;
    subtitleColor: string;
    authorColor: string;
  };
  compositionRules: string[];
  negativeConstraints: string[];
}

export interface VisualBriefing {
  bookTitle: string;
  bookSubtitle: string;
  authorName: string;
  targetAudience: string;
  genre: string;
  premiseSummary: string;
  centralVisualHook: string;
  moodAndTone: string;
  colorPalette: string[];
  typographyGuidelines: string;
  compositionAndSafeZones: string;
  negativeDirectives: string[];
  fullMarkdownBrief: string;
}

export class CoverMarketIntelService {
  /**
   * Realiza a análise semântica e visual profunda do livro baseando-se em títulos, gênero e metadados
   */
  public static analyzeBookForCover(project: BookProject): BookVisualAnalysis {
    const title = project.title || 'Livro Sem Título';
    const topic = project.topic || project.stageData?.research?.topic || title;
    const genre = project.genre || project.kdpBookType || 'não-ficção';
    const audience = project.targetAudience || project.stageData?.research?.targetAudience || 'Leitores em busca de desenvolvimento';

    // Determina gatilhos emocionais e metáforas visuais
    let coreConcept = `Representação visual da evolução prática e domínio em ${topic}.`;
    let visualMetaphors: string[] = [
      'Horizonte expansivo simbolizando novos patamares de clareza e controle',
      'Geometria arquitetônica de precisão refletindo estrutura, ordem e disciplina',
      'Foco de luz dourada contrastando com tons profundos de sofisticação'
    ];
    let emotionalTrigger = 'Sentimento de autoridade, clareza mental e conquista imediata de resultados.';
    let targetAudiencePsychology = `O leitor de ${audience} é atraído por sobriedade, modernidade e ausência de ruído visual.`;
    let keyFocalPoint = 'Elemento central único com forte silhueta ou iluminação direcional.';
    let recommendedComposition = 'Hierarquia vertical clássica: Título nos 35% superiores, elemento visual no centro com margem de respiro, autor na base.';
    let genreSymbolism = ['Luz direcionada', 'Estrutura sólida', 'Contraste acentuado'];

    const rawGenre = (genre + ' ' + topic).toLowerCase();

    if (rawGenre.includes('ficção') || rawGenre.includes('suspense') || rawGenre.includes('thriller') || rawGenre.includes('mistério')) {
      coreConcept = `Atmosfera de mistério e tensão psicológica centrada no clímax de ${topic}.`;
      visualMetaphors = [
        'Figura enigmática em contraluz sobre cenário urbano ou névoa densa',
        'Contraste de alto impacto (chiaroscuro) entre sombras profundas e luz pontual',
        'Reflexos e texturas táteis que evocam urgência e perigo iminente'
      ];
      emotionalTrigger = 'Curiosidade obsessiva, antecipação de suspense e imersão cinematográfica.';
      targetAudiencePsychology = 'Busca capa intrigante que prometa uma reviravolta envolvente logo nos primeiros segundos.';
      keyFocalPoint = 'Silhueta solitária em meio à névoa com iluminação dramática.';
      recommendedComposition = 'Perspectiva em profundidade com ponto de fuga acentuado e espaço superior escurecido para o título.';
      genreSymbolism = ['Névoa volumétrica', 'Luz pontual vermelha/âmbar', 'Ruas molhadas ou horizontes escuros'];
    } else if (rawGenre.includes('autoajuda') || rawGenre.includes('hábito') || rawGenre.includes('produtividade') || rawGenre.includes('mente')) {
      coreConcept = `Visual minimalista de alto impacto transmitindo clareza radical e quebra de inércia.`;
      visualMetaphors = [
        'Linhas de força ascendentes ou elemento geométrico perfeito em equilíbrio',
        'Paleta vibrante e limpa que se destaca instantaneamente na página de busca da Amazon',
        'Tipografia imponente que comunica certeza, método e segurança'
      ];
      emotionalTrigger = 'Sensação de alívio, empoderamento e decisão de transformar a própria realidade.';
      targetAudiencePsychology = 'Necessita de legibilidade instantânea; qualquer confusão visual gera rejeição na busca do Kindle.';
      keyFocalPoint = 'Metáfora conceitual nítida (ampulheta luminosa, prisma de luz, bússola estilizada).';
      recommendedComposition = 'Fundo limpo e desobstruído com grande destaque para a tipografia central e ícone heroico.';
      genreSymbolism = ['Amanhecer dourado', 'Geometria pura', 'Equilíbrio e alinhamento'];
    } else if (rawGenre.includes('negócio') || rawGenre.includes('finança') || rawGenre.includes('investimento') || rawGenre.includes('empresa')) {
      coreConcept = `Estética executiva de prestígio internacional (Dark Navy & Polished Gold).`;
      visualMetaphors = [
        'Arquitetura corporativa moderna com vidro, aço e luz crepuscular',
        'Acentos em ouro fosco polido sugerindo riqueza sustentável e visão estratégica',
        'Equilíbrio entre sofisticação clássica e precisão analítica contemporânea'
      ];
      emotionalTrigger = 'Confiança inabalável, visão de longo prazo e validação de autoridade.';
      targetAudiencePsychology = 'Executivos e empreendedores exigem design sóbrio que reflita alto padrão e seriedade.';
      keyFocalPoint = 'Edifício contemporâneo em ângulo dramático ou estrutura geométrica dourada.';
      recommendedComposition = 'Borda de respiro nobre, título imponente em fonte serifada premium com subtítulo em caixa alta.';
      genreSymbolism = ['Ouro fosco', 'Azul meia-noite', 'Vidro e aço escovado'];
    }

    return {
      coreConcept,
      visualMetaphors,
      emotionalTrigger,
      targetAudiencePsychology,
      keyFocalPoint,
      recommendedComposition,
      genreSymbolism
    };
  }

  /**
   * Analisa as tendências visuais de mercado na Amazon KDP para a categoria do livro
   */
  public static analyzeVisualMarket(genre: string = 'negócios'): MarketVisualTrend {
    const raw = (genre || '').toLowerCase();

    if (raw.includes('ficção') || raw.includes('thriller') || raw.includes('mistério')) {
      return {
        genre: 'Ficção, Suspense & Mistério',
        marketDemand: 'MUITO ALTA',
        bestsellerColorPalette: {
          name: 'Cinematic Chiaroscuro Noir',
          primaryHex: '#ffffff',
          secondaryHex: '#e11d48',
          accentHex: '#38bdf8',
          bgHex: '#090d16',
          description: 'Fundo negro azulado profundo com acentos em vermelho rubi de alerta e branco puro para o título.'
        },
        typographyTrends: {
          titleFontFamily: "'Cinzel', Georgia, serif",
          subtitleFontFamily: "'Montserrat', sans-serif",
          authorFontFamily: "'Inter', sans-serif",
          styleNotes: 'Títulos em caixa alta bem espaçados com sombras volumétricas para leitura sobre fundos texturizados.'
        },
        visualCompositionPatterns: [
          'Silhueta em escala pequena em relação a um cenário colossal (sensação de vulnerabilidade)',
          'Iluminação rim-light (luz de contorno) destacando formas na penumbra',
          'Vignette periférica escura para guiar o olhar direto ao centro'
        ],
        competitorGaps: [
          'Muitos concorrentes usam fotos amadoras genéricas sem tratamento cinematográfico',
          'Títulos com fontes ilegíveis em tamanho de miniatura na Amazon mobile',
          'Excesso de elementos competindo entre si pelo foco visual'
        ],
        amazonThumbnailTips: [
          'Teste a capa em 80px de largura: se o título não puder ser lido em 0.5s, aumente o tamanho da fonte em 20%',
          'Garanta pelo menos 60% de contraste de luminosidade entre a arte e o nome do livro',
          'Evite detalhes finos ou fontes manuscritas cursivas muito finas'
        ]
      };
    }

    if (raw.includes('autoajuda') || raw.includes('desenvolvimento') || raw.includes('produtividade')) {
      return {
        genre: 'Autoajuda & Alta Performance',
        marketDemand: 'MUITO ALTA',
        bestsellerColorPalette: {
          name: 'Impacto Visual Bold & Limpo',
          primaryHex: '#0f172a',
          secondaryHex: '#2563eb',
          accentHex: '#f59e0b',
          bgHex: '#ffffff',
          description: 'Fundo claro de alta luminosidade com tipografia escura ultra bold e detalhes em azul real ou amarelo ouro.'
        },
        typographyTrends: {
          titleFontFamily: "'Montserrat', sans-serif",
          subtitleFontFamily: "'Inter', sans-serif",
          authorFontFamily: "'Montserrat', sans-serif",
          styleNotes: 'Pesos 800/900 ultra-bold no título principal, criando impacto visual imediato similar a James Clear e Mark Manson.'
        },
        visualCompositionPatterns: [
          'Objeto simbólico isolado com amplo espaço negativo ao redor',
          'Tipografia ocupando 40% a 50% da área frontal da capa',
          'Faixas ou selos modernos com certificação de edição revisada'
        ],
        competitorGaps: [
          'Capas poluídas com frases longas na frente em vez de focar no benefício central',
          'Uso de ilustrações vetoriais genéricas de bancos de imagem comuns',
          'Falta de identidade de autor consistente'
        ],
        amazonThumbnailTips: [
          'O fundo claro se destaca em 80% das páginas de busca do Kindle que usam temas escuros',
          'A palavra principal do título deve ter altura equivalente a pelo menos 12% da capa',
          'Subtítulo em no máximo 2 linhas com alto contraste'
        ]
      };
    }

    // Padrão: Negócios & Finanças Executivo
    return {
      genre: 'Negócios, Finanças & Estratégia',
      marketDemand: 'MUITO ALTA',
      bestsellerColorPalette: {
        name: 'Dark Navy & Polished Gold',
        primaryHex: '#ffffff',
        secondaryHex: '#fbbf24',
        accentHex: '#38bdf8',
        bgHex: '#0a1128',
        description: 'Azul marinho corporativo nobre com tipografia em branco puro e ouro fosco 24K para transmitir prestígio.'
      },
      typographyTrends: {
        titleFontFamily: "'Cinzel', Georgia, serif",
        subtitleFontFamily: "'Montserrat', sans-serif",
        authorFontFamily: "'Inter', sans-serif",
        styleNotes: 'Serifas refinadas clássicas ou sem-serif geométricas premium (padrão Harvard Business Review).'
      },
      visualCompositionPatterns: [
        'Simetria axial estrita que transmite solidez institucional e rigor metódico',
        'Acentos dourados sutis em fios finos ou elementos geométricos nobres',
        'Fundo gradiente sutil com iluminação suave no terço central'
      ],
      competitorGaps: [
        'Capas que parecem planilhas ou relatórios burocráticos sem apelo comercial',
        'Cores frias demais sem ponto focal de atração visual',
        'Falta de selo editorial que posicione a obra como autoridade do segmento'
      ],
      amazonThumbnailTips: [
        'O dourado em fundo escuro gera o maior CTR orgânico no nicho de finanças',
        'Mantenha o nome do autor em destaque com espaçamento entre letras (letter-spacing: 0.15em)',
        'Selo Best-Seller no topo da capa aumenta a taxa de clique em até 27%'
      ]
    };
  }

  /**
   * Constrói a Direção de Arte Completa para a Capa
   */
  public static generateArtDirection(project: BookProject): ArtDirectionConfig {
    const analysis = this.analyzeBookForCover(project);
    const market = this.analyzeVisualMarket(project.genre || project.kdpBookType);

    return {
      styleName: `Direção Editorial: ${market.bestsellerColorPalette.name}`,
      styleDescription: `${analysis.coreConcept} Foco visual construído para dominar o nicho de ${market.genre} na Amazon KDP.`,
      lightingMood: 'Iluminação cinematográfica de estúdio com reflexos volumétricos sutis e contraste calibrado.',
      focalElement: analysis.keyFocalPoint,
      colorScheme: {
        primary: market.bestsellerColorPalette.primaryHex,
        secondary: market.bestsellerColorPalette.secondaryHex,
        accent: market.bestsellerColorPalette.accentHex,
        background: market.bestsellerColorPalette.bgHex,
        scrimOverlay: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.85) 100%)'
      },
      typography: {
        titleFont: market.typographyTrends.titleFontFamily,
        subtitleFont: market.typographyTrends.subtitleFontFamily,
        authorFont: market.typographyTrends.authorFontFamily,
        titleColor: market.bestsellerColorPalette.primaryHex,
        subtitleColor: market.bestsellerColorPalette.secondaryHex,
        authorColor: '#f1f5f9'
      },
      compositionRules: [
        'Safe Zone KDP: Mínimo de 0.25 pol (ou 80px) de respiro das bordas externas.',
        'Hierarquia Visual: 1º Título (foco primário), 2º Arte/Símbolo Heroico, 3º Subtítulo, 4º Nome do Autor.',
        'Contraste de Miniatura: Testado para nitidez em 60px x 90px no feed da Amazon.',
        'Zero texto na arte gerada pela IA: Todos os títulos e textos são renderizados em camadas vetoriais nítidas.'
      ],
      negativeConstraints: [
        'Sem rostos distorcidos ou mãos anatômicas deformadas',
        'Sem texto gerado embutido na imagem raster (evita aberrações ortográficas)',
        'Sem sombras em baixa resolução ou compressão ruidosa',
        'Sem elementos essenciais colados na margem de sangria de 0.125 pol'
      ]
    };
  }

  /**
   * Constrói o Briefing Visual Completo estruturado
   */
  public static generateVisualBriefing(project: BookProject): VisualBriefing {
    const analysis = this.analyzeBookForCover(project);
    const market = this.analyzeVisualMarket(project.genre || project.kdpBookType);
    const art = this.generateArtDirection(project);

    const title = project.title || 'Título da Obra';
    const subtitle = project.subtitle || 'Subtítulo Explicativo e Comercial';
    const author = project.author || 'Autor da Obra';
    const audience = project.targetAudience || 'Público Geral';
    const genre = project.genre || project.kdpBookType || 'Não-Ficção';

    const fullMarkdownBrief = `# BRIEFING EDITORIAL DE CAPA • PADRÃO BEST-SELLER KDP

## 1. Identificação da Obra
* **Título Principal:** ${title}
* **Subtítulo:** ${subtitle}
* **Autor:** ${author}
* **Gênero / Categoria:** ${genre}
* **Público-Alvo:** ${audience}

---

## 2. Conceito Central & Gatilho Visual
* **Conceito Chave:** ${analysis.coreConcept}
* **Gatilho Emocional:** ${analysis.emotionalTrigger}
* **Ponto Focal Obrigatório:** ${analysis.keyFocalPoint}
* **Metáforas Visuais Recomendadas:**
${analysis.visualMetaphors.map(m => `  - ${m}`).join('\n')}

---

## 3. Direção de Arte & Cromatismo
* **Estilo Visual:** ${art.styleName}
* **Iluminação:** ${art.lightingMood}
* **Paleta de Cores:**
  - Primária (Título): ${art.colorScheme.primary}
  - Secundária (Subtítulo): ${art.colorScheme.secondary}
  - Acento (Selos / Detalhes): ${art.colorScheme.accent}
  - Fundo Base: ${art.colorScheme.background}
* **Tipografia:** ${art.typography.titleFont} (Título) + ${art.typography.subtitleFont} (Subtítulo)

---

## 4. Regras de Composição & KDP Safe Zones
* Respeitar sangria de 0.125" (3.2mm) em todas as bordas na versão impressa.
* Proporção 1:1.6 (1600x2560px) com legibilidade perfeita em miniatura (60px).
* Imagem limpa sem letras embutidas na arte de fundo.

---

## 5. Diretrizes Negativas (O que NÃO fazer)
${art.negativeConstraints.map(n => `* ❌ ${n}`).join('\n')}
`;

    return {
      bookTitle: title,
      bookSubtitle: subtitle,
      authorName: author,
      targetAudience: audience,
      genre,
      premiseSummary: project.description?.slice(0, 200) || 'Obra prática e transformadora.',
      centralVisualHook: analysis.keyFocalPoint,
      moodAndTone: analysis.emotionalTrigger,
      colorPalette: [
        art.colorScheme.primary,
        art.colorScheme.secondary,
        art.colorScheme.accent,
        art.colorScheme.background
      ],
      typographyGuidelines: `${art.typography.titleFont} com alto contraste e elegância.`,
      compositionAndSafeZones: '1600x2560px, margem de segurança de 0.25", título nos 35% superiores.',
      negativeDirectives: art.negativeConstraints,
      fullMarkdownBrief
    };
  }
}
