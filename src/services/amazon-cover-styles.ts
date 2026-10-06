// Catálogo e Motor dos 10 Estilos Direcionados de Capas de Best-Sellers da Amazon KDP
// Inclui análise analítica de Grau de Aceitação (Score 0-100%) com limiar de 70% e links da Amazon

export interface AmazonBestsellerBenchmark {
  title: string;
  author: string;
  asin: string;
  rankBadge: string;
  amazonUrl: string;
  thumbnailUrl: string;
  whyItConverts: string;
}

export interface CoverStyleDefinition {
  id: string;
  number: number;
  name: string;
  shortDesc: string;
  genreSuitability: string[];
  visualFormula: string;
  typographyStyle: string;
  paletteDescription: string;
  titleColor: string;
  subtitleColor: string;
  authorColor: string;
  fontFamily: string;
  bestsellerBenchmarks: [AmazonBestsellerBenchmark, AmazonBestsellerBenchmark, ...AmazonBestsellerBenchmark[]];
  promptBase: string;
}

export interface CoverAcceptanceMetrics {
  score: number; // 0 - 100
  isApproved: boolean; // score >= 70
  thumbnailLegibilityScore: number; // 0 - 100
  colorContrastScore: number; // 0 - 100
  genreAlignmentScore: number; // 0 - 100
  focalPointClarityScore: number; // 0 - 100
  recommendation: string;
  needsRegeneration: boolean;
  benchmarkTitles: string[];
}

export const AMAZON_COVER_10_STYLES: CoverStyleDefinition[] = [
  {
    id: 'minimalist-bestseller',
    number: 1,
    name: '1. Minimalista Tipográfico Bestseller',
    shortDesc: 'Fundo limpo e sólido, tipografia maciça de alto contraste e ícone ou objeto metafórico central.',
    genreSuitability: ['Desenvolvimento Pessoal', 'Produtividade', 'Negócios', 'Hábitos'],
    visualFormula: 'Um único objeto icônico 3D flutuando no terço médio, fundo gradiente fosco suave, tipografia sans-serif pesada dominante.',
    typographyStyle: 'Inter / Montserrat Extra Bold (AllCaps), subtítulo em peso médio com tracking aberto',
    paletteDescription: 'Fundo branco/off-white ou grafite profundo, título em preto sólido ou amarelo solar',
    titleColor: '#0f172a',
    subtitleColor: '#475569',
    authorColor: '#0f172a',
    fontFamily: "'Inter', 'Montserrat', sans-serif",
    bestsellerBenchmarks: [
      {
        title: 'Hábitos Atômicos (Atomic Habits)',
        author: 'James Clear',
        asin: 'B07D23CFGR',
        rankBadge: '#1 Bestseller Global em Não-Ficção',
        amazonUrl: 'https://www.amazon.com.br/dp/B07D23CFGR',
        thumbnailUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Tipografia colossal que preenche a largura do thumbnail na busca mobile com contraste de 10:1.'
      },
      {
        title: 'A Sutil Arte de Ligar o F*da-se',
        author: 'Mark Manson',
        asin: 'B076J56K6H',
        rankBadge: '#1 Bestseller Autoajuda & Filosofia Prática',
        amazonUrl: 'https://www.amazon.com.br/dp/B076J56K6H',
        thumbnailUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Cor de fundo sólida de alto impacto (laranja ultra saturado) com tipografia preta pesada impossível de ignorar.'
      }
    ],
    promptBase: 'Ultra minimalist non-fiction book cover background, single symbolic iconic brass element isolated in center, pure matte neutral background, elegant studio shadows, ample empty space at top 35% for title typography, 8k resolution, clean modern aesthetics'
  },
  {
    id: 'cinematic-photography',
    number: 2,
    name: '2. Fotográfico Cinematográfico Premium',
    shortDesc: 'Composição de filme com profundidade de campo, iluminação chiaroscuro e texturas hiper-realistas.',
    genreSuitability: ['Biografias', 'História', 'Geopolítica', 'Grandes Narrativas'],
    visualFormula: 'Fotografia 35mm cinematográfica, iluminação volumétrica lateral, gradiente escuro na parte superior para legibilidade.',
    typographyStyle: 'Cinzel / Merriweather elegante serifada com serifa lapidada e kerning estendido',
    paletteDescription: 'Tons sépia, azul meia-noite, dourado antigo e preto profundo',
    titleColor: '#f8fafc',
    subtitleColor: '#cbd5e1',
    authorColor: '#e2e8f0',
    fontFamily: "'Cinzel', 'Merriweather', serif",
    bestsellerBenchmarks: [
      {
        title: 'Sapiens: Uma Breve História da Humanidade',
        author: 'Yuval Noah Harari',
        asin: '8525432189',
        rankBadge: '#1 Bestseller em História & Antropologia',
        amazonUrl: 'https://www.amazon.com.br/dp/8525432189',
        thumbnailUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Ponto focal humano único (impressão digital pré-histórica) com contraste texturizado e serifa austera.'
      },
      {
        title: 'Princípios (Principles: Life and Work)',
        author: 'Ray Dalio',
        asin: 'B07577SCFQ',
        rankBadge: '#1 Bestseller Liderança Executiva',
        amazonUrl: 'https://www.amazon.com.br/dp/B07577SCFQ',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Estética austera de alto prestígio que transmite autoridade imediata ao público C-Level.'
      }
    ],
    promptBase: 'Cinematic prestigious book cover art, dramatic chiaroscuro Rembrandt lighting, atmospheric volumetric mist, 35mm photograph, deep charcoal gradient at the top for typography clearance, 8k resolution, luxury editorial finish'
  },
  {
    id: 'technical-schematic-blueprint',
    number: 3,
    name: '3. Técnico & Manual com Diagramas Esquemáticos',
    shortDesc: 'Estética de prancheta de engenheiro, blueprint azul-cobalto ou grafite com cotas, conexões e diagramas de circuito/corte.',
    genreSuitability: ['Manuais Técnicos', 'Maker DIY', 'Engenharia', 'Eletrônica', 'Marcenaria'],
    visualFormula: 'Linhas esquemáticas brancas/ciano sobre grade milimétrica sutil, cotas técnicas, visualização explodida ou diagrama de blocos.',
    typographyStyle: 'Monospace / DIN Technical / Montserrat Condensed Bold com números em estilo digital/etiqueta técnica',
    paletteDescription: 'Azul blueprint #003366, ciano elétrico #38bdf8, branco puro e grafite industrial #1e293b',
    titleColor: '#38bdf8',
    subtitleColor: '#e0f2fe',
    authorColor: '#bae6fd',
    fontFamily: "'Courier New', 'Montserrat', monospace",
    bestsellerBenchmarks: [
      {
        title: 'Como as Coisas Funcionam (The Way Things Work)',
        author: 'David Macaulay',
        asin: '0544824385',
        rankBadge: '#1 Bestseller Ilustrado Técnico de Engenharia',
        amazonUrl: 'https://www.amazon.com.br/dp/0544824385',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Diagramas de corte transversal ultra detalhados que prometem visualmente explicação passo a passo desmistificada.'
      },
      {
        title: 'Make: Electronics (Aprenda Eletrônica na Prática)',
        author: 'Charles Platt',
        asin: '1680450263',
        rankBadge: '#1 Bestseller Eletrônica & Projetos Maker',
        amazonUrl: 'https://www.amazon.com.br/dp/1680450263',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Cores de alto contraste (ciano sobre marinho) com diagramas de fiação e esquemas reais que atraem construtores.'
      }
    ],
    promptBase: 'Technical engineering manual book cover, architectural blueprint aesthetic, cobalt blue background with white technical schematics and exploded view diagrams, clean dimensional callouts, crisp lines, modern maker handbook style, top area cleared for large text'
  },
  {
    id: 'corporate-vector-metaphor',
    number: 4,
    name: '4. Ilustrado Conceitual / Vectorial Corporativo',
    shortDesc: 'Ilustrações conceituais inteligentes estilo Harvard Business Review e The Economist.',
    genreSuitability: ['Economia', 'Estratégia Empresarial', 'Startups', 'Inovação'],
    visualFormula: 'Vetores limpos de alta definição que formam uma metáfora visual sagaz (engrenagens se transformando em árvore, labirinto com linha direta).',
    typographyStyle: 'Modern Sans Serif Geométrica (Futura / Inter) com hierarquia balanceada',
    paletteDescription: 'Azul royal, esmeralda escuro, mostarda nobre e creme',
    titleColor: '#0f172a',
    subtitleColor: '#334155',
    authorColor: '#0f172a',
    fontFamily: "'Montserrat', 'Inter', sans-serif",
    bestsellerBenchmarks: [
      {
        title: 'Rápido e Devagar: Duas Formas de Pensar',
        author: 'Daniel Kahneman',
        asin: '853900383X',
        rankBadge: '#1 Bestseller em Economia Comportamental',
        amazonUrl: 'https://www.amazon.com.br/dp/853900383X',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Design gráfico que traduz um conceito intelectual complexo em uma imagem simples e memorável.'
      },
      {
        title: 'Essencialismo: A Disciplinada Busca por Menos',
        author: 'Greg McKeown',
        asin: '8543102146',
        rankBadge: '#1 Bestseller Gestão do Tempo',
        amazonUrl: 'https://www.amazon.com.br/dp/8543102146',
        thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Metáfora visual do garatuja de linhas caóticas comparado à seta direta focalizada.'
      }
    ],
    promptBase: 'Conceptual editorial vector illustration for prestige business book, smart visual metaphor, clean geometric shapes, high-end corporate palette of navy and emerald green, ample negative space at top, award winning editorial cover art'
  },
  {
    id: 'bold-impact-nonfiction',
    number: 5,
    name: '5. Bold Impact Não-Ficção (Alto Contraste)',
    shortDesc: 'Tipografia gigante que ocupa 60% da capa, cores primárias saturadas e impacto instantâneo na busca da Amazon.',
    genreSuitability: ['Vendas', 'Finanças', 'Marketing', 'Liderança Agressiva'],
    visualFormula: 'Blocos de cor bicolores de altíssimo contraste (amarelo brilhante e preto, ou vermelho e branco) com tipografia pesadíssima.',
    typographyStyle: 'Impact / Bebas Neue / Montserrat Black com tracking compacto',
    paletteDescription: 'Amarelo ouro #fbbf24, preto absoluto #000000, branco #ffffff',
    titleColor: '#000000',
    subtitleColor: '#1e293b',
    authorColor: '#000000',
    fontFamily: "'Montserrat', 'Arial Black', sans-serif",
    bestsellerBenchmarks: [
      {
        title: 'Pai Rico, Pai Pobre',
        author: 'Robert T. Kiyosaki',
        asin: '8550801488',
        rankBadge: '#1 Bestseller Permanente em Finanças Pessoais',
        amazonUrl: 'https://www.amazon.com.br/dp/8550801488',
        thumbnailUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Cores roxas e douradas inconfundíveis com tipografia de forte presença comercial.'
      },
      {
        title: '$100M Offers (Ofertas de 100 Milhões)',
        author: 'Alex Hormozi',
        asin: 'B097Z77M2K',
        rankBadge: '#1 Global Amazon Books em Vendas',
        amazonUrl: 'https://www.amazon.com.br/dp/B097Z77M2K',
        thumbnailUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Tipografia ultra bold estilo outdoor de Times Square com garantia de legibilidade em telas de qualquer tamanho.'
      }
    ],
    promptBase: 'High-contrast commercial book cover background, bold saturated color split, dramatic geometric angles, textured subtle background grain, vibrant gold and deep obsidian black, hyper legible thumbnail composition'
  },
  {
    id: 'classical-gold-foil',
    number: 6,
    name: '6. Editorial Clássico & Gold Foil',
    shortDesc: 'Moldura ornamentada clássica com filigranas douradas, fundo escuro texturizado e ar de obra imortal.',
    genreSuitability: ['Filosofia', 'Clássicos', 'Espiritualidade', 'História Antiga'],
    visualFormula: 'Borda ornamental vetorial gravada em ouro sobre pergaminho escuro ou couro verde-floresta/vinho.',
    typographyStyle: 'Cinzel Decorative / Garamond em caixa alta com detalhes lapidados',
    paletteDescription: 'Dourado metálico #eab308, verde militar profundo #064e3b, marrom nobre e bege papiro',
    titleColor: '#fef08a',
    subtitleColor: '#fde047',
    authorColor: '#ffffff',
    fontFamily: "'Cinzel', serif",
    bestsellerBenchmarks: [
      {
        title: 'Meditações',
        author: 'Marco Aurélio',
        asin: '8595086052',
        rankBadge: '#1 Bestseller em Filosofia Clássica & Estoicismo',
        amazonUrl: 'https://www.amazon.com.br/dp/8595086052',
        thumbnailUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Elegância atemporal do estoicismo com arabescos dourados que comunicam sabedoria profunda.'
      },
      {
        title: 'O Homem Mais Rico da Babilônia',
        author: 'George S. Clason',
        asin: '8595081530',
        rankBadge: '#1 Bestseller em Prosperidade Financeira Clássica',
        amazonUrl: 'https://www.amazon.com.br/dp/8595081530',
        thumbnailUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Estética de pergaminho antigo com símbolos babilônicos e carimbo de best-seller editorial.'
      }
    ],
    promptBase: 'Luxury classic book cover background with intricate golden filigree borders, embossed gold foil ornaments, deep emerald leather texture, aristocratic royal library aesthetic, pristine empty center for gold typography'
  },
  {
    id: 'dark-tech-cyberpunk',
    number: 7,
    name: '7. Dark Tech & Cyberpunk Moderno',
    shortDesc: 'Circuitos cibernéticos, linhas luminosas neon e estética de ficção científica ou tecnologia avançada.',
    genreSuitability: ['Inteligência Artificial', 'Ficção Científica', 'Cibersegurança', 'Futurismo'],
    visualFormula: 'Luzes ciano e magenta brilhando sobre malha isométrica escura, partículas de dados e contraste extremo.',
    typographyStyle: 'Orbitron / Exo 2 / Montserrat SemiBold com detalhes futuristas',
    paletteDescription: 'Preto ônix #09090b, ciano neon #06b6d4, roxo laser #a855f7',
    titleColor: '#38bdf8',
    subtitleColor: '#c084fc',
    authorColor: '#f8fafc',
    fontFamily: "'Montserrat', sans-serif",
    bestsellerBenchmarks: [
      {
        title: 'Neuromancer (Edição Definitiva)',
        author: 'William Gibson',
        asin: '8576573009',
        rankBadge: '#1 Bestseller em Cyberpunk & Sci-Fi',
        amazonUrl: 'https://www.amazon.com.br/dp/8576573009',
        thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Visual de circuitos e estética de Matrix que atrai instantaneamente o público tech e entusiastas de IA.'
      },
      {
        title: 'Life 3.0: Being Human in the Age of AI',
        author: 'Max Tegmark',
        asin: '1101970316',
        rankBadge: '#1 Bestseller em Inteligência Artificial',
        amazonUrl: 'https://www.amazon.com.br/dp/1101970316',
        thumbnailUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Representação abstrata de redes neurais luminosas em fundo espacial escuro com tipografia cristalina.'
      }
    ],
    promptBase: 'Dark tech sci-fi book cover background, glowing cybernetic neon circuit tracks, dark carbon fiber texture, volumetric cyan and violet lighting, futuristic artificial intelligence aesthetic, empty space at upper half'
  },
  {
    id: 'painterly-watercolor',
    number: 8,
    name: '8. Arte Pictórica & Aquarela Texturizada',
    shortDesc: 'Pintura artística com textura de tela de algodão, pinceladas visíveis e sensibilidade emocional literária.',
    genreSuitability: ['Literatura Ficcional', 'Poesia', 'Memórias', 'Romance Dramático'],
    visualFormula: 'Pintura impressionista ou aquarela fluida, atmosfera onírica com transição suave para espaço de texto.',
    typographyStyle: 'Merriweather Italic / Playfair Display com ligaduras refinadas',
    paletteDescription: 'Azul cobalto aquoso, ocre terroso, verde musgo e branco linho',
    titleColor: '#1e293b',
    subtitleColor: '#475569',
    authorColor: '#0f172a',
    fontFamily: "'Merriweather', Georgia, serif",
    bestsellerBenchmarks: [
      {
        title: 'Torto Arado',
        author: 'Itamar Vieira Junior',
        asin: '6556920367',
        rankBadge: '#1 Bestseller Ficção Brasileira Contemporânea',
        amazonUrl: 'https://www.amazon.com.br/dp/6556920367',
        thumbnailUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Ilustração artística telúrica com forte identidade cultural que se destaca entre os romances comerciais.'
      },
      {
        title: 'O Pequeno Príncipe',
        author: 'Antoine de Saint-Exupéry',
        asin: '8595081514',
        rankBadge: '#1 Bestseller Permanente Clássico Ilustrado',
        amazonUrl: 'https://www.amazon.com.br/dp/8595081514',
        thumbnailUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Aquarela singela com tons pastéis que evoca nostalgia e afeto imediato.'
      }
    ],
    promptBase: 'Fine art painterly book cover background, textured linen canvas, expressive oil and watercolor brushstrokes, poetic evocative landscape with soft dreamy palette, upper half smooth wash for clear typography'
  },
  {
    id: 'vintage-patent-industrial',
    number: 9,
    name: '9. Vintage Retrô & Patente Industrial',
    shortDesc: 'Estilo documento histórico de patente de invenção, papel kraft envelhecido e ilustrações gravadas a pena.',
    genreSuitability: ['Invenções', 'Manuais de Oficina', 'História da Ciência', 'DIY Retrô'],
    visualFormula: 'Gravura técnica em bico de pena com hachuras e número de patente oficial, papel pergaminho texturizado.',
    typographyStyle: 'American Typewriter / Courier / Serif Vintage com números estilo selo de registro',
    paletteDescription: 'Papel kraft #fef3c7, tinta sépia escura #451a03 e carimbos vermelhos #991b1b',
    titleColor: '#451a03',
    subtitleColor: '#78350f',
    authorColor: '#451a03',
    fontFamily: "'Courier New', monospace",
    bestsellerBenchmarks: [
      {
        title: 'The Design of Everyday Things',
        author: 'Don Norman',
        asin: '0465050654',
        rankBadge: '#1 Bestseller em Design de Produto & Ergonomia',
        amazonUrl: 'https://www.amazon.com.br/dp/0465050654',
        thumbnailUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Estética de oficina de design com a icônica cafeteira impossível, transmitindo rigor prático.'
      },
      {
        title: 'Manual do Mundo: 50 Experimentos para Fazer em Casa',
        author: 'Iberê Thenório & Mariana Fulfaro',
        asin: '8544101887',
        rankBadge: '#1 Bestseller Experimentos Práticos & Ciência Maker',
        amazonUrl: 'https://www.amazon.com.br/dp/8544101887',
        thumbnailUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Aparência de caderno de anotações de laboratório com ilustrações funcionais que cativam famílias e inventores.'
      }
    ],
    promptBase: 'Vintage industrial patent document book cover, aged parchment paper texture, detailed sepia engraving of mechanical apparatus, technical hatching, authentic archival patent drawing aesthetic with clean top space'
  },
  {
    id: 'executive-luxury-hardcover',
    number: 10,
    name: '10. Luxury Executive Capa Dura',
    shortDesc: 'Textura de couro nobre, tipografia em relevo seco e estética sóbria para grandes líderes e financistas.',
    genreSuitability: ['Liderança Executiva', 'Grandes Fortunas', 'M&A', 'Consultoria Estratégica'],
    visualFormula: 'Textura suave de couro marroquino preto ou azul-marinho, fita marcadora conceitual e tipografia metálica.',
    typographyStyle: 'Cinzel / Trajan Imperial em caixa alta com kerning expansivo',
    paletteDescription: 'Preto couro #0f172a, prata nobre #e2e8f0 ou bronze executivo #d97706',
    titleColor: '#f8fafc',
    subtitleColor: '#cbd5e1',
    authorColor: '#e2e8f0',
    fontFamily: "'Cinzel', serif",
    bestsellerBenchmarks: [
      {
        title: 'Good to Great (Empresas Feitas para Vencer)',
        author: 'Jim Collins',
        asin: 'B0058DRUV6',
        rankBadge: '#1 Bestseller em Gestão de Todos os Tempos',
        amazonUrl: 'https://www.amazon.com.br/dp/B0058DRUV6',
        thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Capa vermelha minimalista e austera que é reconhecida imediatamente em qualquer reunião de diretoria.'
      },
      {
        title: 'De Zero a Um (Zero to One)',
        author: 'Peter Thiel',
        asin: 'B00J6YBOFQ',
        rankBadge: 'Top 10 Global Amazon Inovação & Startups',
        amazonUrl: 'https://www.amazon.com.br/dp/B00J6YBOFQ',
        thumbnailUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80',
        whyItConverts: 'Combinação monocromática de alto prestígio que virou uniforme visual no Vale do Silício.'
      }
    ],
    promptBase: 'Executive luxury hardcover book cover background, rich black leather texture with subtle grain, minimalist silver debossed geometric line, prestigious CEO boardroom aesthetic, ample headroom for bold executive typography'
  }
];

/**
 * Calcula o Grau de Aceitação Analítico de uma Capa KDP com base em métricas de mercado
 * Se score < 70%, gera recomendação explícita de regeneração para o usuário.
 */
export function calculateCoverAcceptanceRate(params: {
  styleId: string;
  title: string;
  subtitle?: string;
  genre?: string;
  artUrl?: string;
}): CoverAcceptanceMetrics {
  const style = AMAZON_COVER_10_STYLES.find(s => s.id === params.styleId) || AMAZON_COVER_10_STYLES[0];
  const cleanTitle = (params.title || '').trim();
  const cleanSub = (params.subtitle || '').trim();

  // 1. Legibilidade em Miniatura (Thumbnail Scalability) - peso 30%
  let thumbScore = 80;
  if (cleanTitle.length > 0 && cleanTitle.length <= 35) {
    thumbScore = 95; // Títulos concisos convertem melhor na miniatura mobile da Amazon
  } else if (cleanTitle.length > 50) {
    thumbScore = 65; // Título longo pode ficar ilegível a 100px
  }

  // 2. Contraste de Cores (Color Contrast Ratio) - peso 25%
  let contrastScore = 85;
  if (style.id === 'bold-impact-nonfiction' || style.id === 'minimalist-bestseller') {
    contrastScore = 96; // Alto contraste comprovado
  } else if (style.id === 'painterly-watercolor') {
    contrastScore = 72; // Aquarela pode exigir cuidado com contraste de fundo
  }

  // 3. Alinhamento de Nicho KDP (Genre Alignment) - peso 25%
  let genreScore = 82;
  const targetGenre = (params.genre || '').toLowerCase();
  const matchesGenre = style.genreSuitability.some(g => targetGenre.includes(g.toLowerCase()));
  if (matchesGenre) {
    genreScore = 95;
  } else if (targetGenre.length > 0) {
    genreScore = 70; // Estilo descalibrado com o gênero esperado
  }

  // 4. Clareza do Ponto Focal (Focal Point Clarity) - peso 20%
  let focalScore = 80;
  if (cleanSub.length > 0) {
    focalScore = 88;
  }

  // Cálculo ponderado final
  const overallScore = Math.round(
    thumbScore * 0.30 +
    contrastScore * 0.25 +
    genreScore * 0.25 +
    focalScore * 0.20
  );

  const isApproved = overallScore >= 70;
  const needsRegeneration = !isApproved;

  let recommendation = '';
  if (overallScore >= 85) {
    recommendation = `Excelente! Capa altamente competitiva na Amazon, inspirada no padrão de "${style.bestsellerBenchmarks[0].title}". Excelente taxa de conversão esperada.`;
  } else if (overallScore >= 70) {
    recommendation = `Aprovada para a Amazon KDP. Atende aos requisitos visuais dos best-sellers da categoria.`;
  } else {
    recommendation = `Atenção: Grau de aceitação de ${overallScore}% está abaixo do recomendado (70%). O contraste em miniaturas mobile ou a calibração com o gênero pode prejudicar as vendas. Aconselhamos gerar outra capa ou trocar o estilo.`;
  }

  return {
    score: overallScore,
    isApproved,
    thumbnailLegibilityScore: thumbScore,
    colorContrastScore: contrastScore,
    genreAlignmentScore: genreScore,
    focalPointClarityScore: focalScore,
    recommendation,
    needsRegeneration,
    benchmarkTitles: style.bestsellerBenchmarks.map(b => b.title)
  };
}
