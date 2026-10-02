// ============================================================
// SERVIÇO DE INTELIGÊNCIA DE MERCADO AMAZON KDP (GITHUB API PATTERN)
// Dados consolidados de rankings BSR da Amazon, volume de vendas
// e estimativas de royalties líquidos em U$ por livro vendido.
// ============================================================

import { BookType } from '../types/book-project';

export interface AmazonRankedSegment {
  id: BookType;
  rankNumber: number; // ex: 3 para #Suspense, 102 para #Colorir
  rankLabel: string; // ex: "#3 na Amazon Books"
  name: string;
  categoryGroup: 'ficcao' | 'nao-ficcao' | 'baixo-conteudo' | 'infantil';
  categoryGroupLabel: string;
  bsrRange: string; // ex: "Top 50 - 500 BSR"
  dailySalesEstimate: number; // ex: 12800 vendas/dia
  avgPriceUsd: number; // ex: 5.99
  unitRoyaltyUsdMin: number; // ex: 2.45
  unitRoyaltyUsdMax: number; // ex: 4.80
  unitRoyaltyFormatted: string; // ex: "U$ 2.45 - U$ 4.80"
  royaltyNote: string; // ex: "Royalty 70% KDP"
  opportunityScore: number; // 0 - 100
  competitionLevel: 'Baixa' | 'Média' | 'Alta' | 'Explosiva';
  description: string;
  popularKeywords: string[];
  sampleBestSellers: {
    title: string;
    author: string;
    bsr: number;
    priceUsd: number;
    royaltyPerBook: number;
  }[];
}

export type SegmentFilterType = 
  | 'all' 
  | 'top10' 
  | 'high_royalty' 
  | 'low_content' 
  | 'fiction' 
  | 'non_fiction';

export const AMAZON_RANKED_SEGMENTS: AmazonRankedSegment[] = [
  {
    id: 'romance',
    rankNumber: 1,
    rankLabel: '#1 na Amazon Books',
    name: 'Romance & New Adult',
    categoryGroup: 'ficcao',
    categoryGroupLabel: 'Ficção & Drama',
    bsrRange: 'Top 1 - 250 BSR',
    dailySalesEstimate: 18500,
    avgPriceUsd: 4.99,
    unitRoyaltyUsdMin: 2.80,
    unitRoyaltyUsdMax: 3.49,
    unitRoyaltyFormatted: 'U$ 2.80 - U$ 3.49',
    royaltyNote: '70% KDP + Faturamento Kindle Unlimited',
    opportunityScore: 96,
    competitionLevel: 'Explosiva',
    description: 'Nicho líder absoluto em volume na Amazon. Leitoras vorazes de Enemies to Lovers, bilionários e romances intensos.',
    popularKeywords: ['Enemies to Lovers', 'Dark Romance', 'Fake Dating', 'Bilionário'],
    sampleBestSellers: [
      { title: 'It Ends with Us', author: 'Colleen Hoover', bsr: 12, priceUsd: 10.99, royaltyPerBook: 4.20 },
      { title: 'Fourth Wing', author: 'Rebecca Yarros', bsr: 8, priceUsd: 14.99, royaltyPerBook: 5.80 }
    ]
  },
  {
    id: 'self-help',
    rankNumber: 2,
    rankLabel: '#2 na Amazon Books',
    name: 'Desenvolvimento Pessoal & Hábitos',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção',
    bsrRange: 'Top 10 - 400 BSR',
    dailySalesEstimate: 14200,
    avgPriceUsd: 7.99,
    unitRoyaltyUsdMin: 3.50,
    unitRoyaltyUsdMax: 5.59,
    unitRoyaltyFormatted: 'U$ 3.50 - U$ 5.60',
    royaltyNote: '70% KDP Digital + Alta Margem Impressa',
    opportunityScore: 92,
    competitionLevel: 'Alta',
    description: 'Hábitos atômicos, disciplina e reprogramação mental. Alta busca orgânica constante ao longo de todo o ano.',
    popularKeywords: ['Micro-Hábitos', 'Foco Inabalável', 'Disciplina Diária', 'Inteligência Emocional'],
    sampleBestSellers: [
      { title: 'Atomic Habits', author: 'James Clear', bsr: 2, priceUsd: 11.99, royaltyPerBook: 5.20 },
      { title: 'The Mountain Is You', author: 'Brianna Wiest', bsr: 25, priceUsd: 9.99, royaltyPerBook: 4.50 }
    ]
  },
  {
    id: 'thriller',
    rankNumber: 3,
    rankLabel: '#3 na Amazon Books',
    name: 'Suspense, Mistério & Thriller',
    categoryGroup: 'ficcao',
    categoryGroupLabel: 'Ficção & Mistério',
    bsrRange: 'Top 15 - 550 BSR',
    dailySalesEstimate: 12800,
    avgPriceUsd: 5.99,
    unitRoyaltyUsdMin: 2.45,
    unitRoyaltyUsdMax: 4.80,
    unitRoyaltyFormatted: 'U$ 2.45 - U$ 4.80',
    royaltyNote: '70% KDP + Alta retenção de páginas no KU',
    opportunityScore: 94,
    competitionLevel: 'Alta',
    description: 'Enredos instigantes com plot twists inesperados e investigações policiais que prendem o leitor até a última página.',
    popularKeywords: ['Suspense Psicológico', 'Plot Twist', 'Detetive Particular', 'Conspiração'],
    sampleBestSellers: [
      { title: 'The Housemaid', author: 'Freida McFadden', bsr: 5, priceUsd: 6.99, royaltyPerBook: 3.80 },
      { title: 'The Silent Patient', author: 'Alex Michaelides', bsr: 22, priceUsd: 8.99, royaltyPerBook: 4.10 }
    ]
  },
  {
    id: 'business',
    rankNumber: 4,
    rankLabel: '#4 na Amazon Books',
    name: 'Negócios, Gestão & Liderança',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção',
    bsrRange: 'Top 30 - 700 BSR',
    dailySalesEstimate: 9600,
    avgPriceUsd: 12.99,
    unitRoyaltyUsdMin: 4.80,
    unitRoyaltyUsdMax: 9.09,
    unitRoyaltyFormatted: 'U$ 4.80 - U$ 9.10',
    royaltyNote: 'Ticket Médio Alto • Alto Valor Percebido',
    opportunityScore: 89,
    competitionLevel: 'Média',
    description: 'Estratégias de escala corporativa, gestão de times e vendas B2B. Leitores compram em formatos físicos e digitais.',
    popularKeywords: ['Gestão de Equipes', 'Empreendedorismo', 'Vendas B2B', 'Cultura de Alta Performance'],
    sampleBestSellers: [
      { title: 'Good to Great', author: 'Jim Collins', bsr: 65, priceUsd: 13.99, royaltyPerBook: 6.50 },
      { title: 'Zero to One', author: 'Peter Thiel', bsr: 82, priceUsd: 12.99, royaltyPerBook: 5.90 }
    ]
  },
  {
    id: 'finance',
    rankNumber: 5,
    rankLabel: '#5 na Amazon Books',
    name: 'Finanças Pessoais & Renda Passiva',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção',
    bsrRange: 'Top 40 - 800 BSR',
    dailySalesEstimate: 8900,
    avgPriceUsd: 11.99,
    unitRoyaltyUsdMin: 4.50,
    unitRoyaltyUsdMax: 8.39,
    unitRoyaltyFormatted: 'U$ 4.50 - U$ 8.40',
    royaltyNote: 'Maior Ticket Médio por Livro Vendido',
    opportunityScore: 91,
    competitionLevel: 'Média',
    description: 'Liberdade financeira, fluxo de caixa, investimentos e estratégias para criar patrimônio duradouro.',
    popularKeywords: ['Renda Passiva', 'Dividendos', 'Independência Financeira', 'Mentalidade Próspera'],
    sampleBestSellers: [
      { title: 'The Psychology of Money', author: 'Morgan Housel', bsr: 15, priceUsd: 11.99, royaltyPerBook: 5.40 },
      { title: 'Rich Dad Poor Dad', author: 'Robert Kiyosaki', bsr: 35, priceUsd: 9.99, royaltyPerBook: 4.60 }
    ]
  },
  {
    id: 'health-wellness',
    rankNumber: 6,
    rankLabel: '#6 na Amazon Books',
    name: 'Saúde, Sono & Longevidade',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção',
    bsrRange: 'Top 50 - 950 BSR',
    dailySalesEstimate: 7400,
    avgPriceUsd: 8.99,
    unitRoyaltyUsdMin: 3.20,
    unitRoyaltyUsdMax: 6.29,
    unitRoyaltyFormatted: 'U$ 3.20 - U$ 6.30',
    royaltyNote: 'Demanda Contínua • Forte em Paperback',
    opportunityScore: 88,
    competitionLevel: 'Média',
    description: 'Protocolos de sono restaurador, redução de estresse e biohacking para viver mais e com energia abundante.',
    popularKeywords: ['Sono Reparador', 'Desinflamação', 'Biohacking', 'Rotina Saudável'],
    sampleBestSellers: [
      { title: 'Why We Sleep', author: 'Matthew Walker', bsr: 45, priceUsd: 10.99, royaltyPerBook: 4.80 },
      { title: 'Outlive', author: 'Peter Attia', bsr: 18, priceUsd: 16.99, royaltyPerBook: 7.20 }
    ]
  },
  {
    id: 'fantasy',
    rankNumber: 7,
    rankLabel: '#7 na Amazon Books',
    name: 'Fantasia Épica & Romance Fantasia',
    categoryGroup: 'ficcao',
    categoryGroupLabel: 'Ficção & Magia',
    bsrRange: 'Top 60 - 1100 BSR',
    dailySalesEstimate: 6900,
    avgPriceUsd: 5.99,
    unitRoyaltyUsdMin: 2.90,
    unitRoyaltyUsdMax: 4.80,
    unitRoyaltyFormatted: 'U$ 2.90 - U$ 4.80',
    royaltyNote: 'Fidelidade Máxima de Séries Literárias',
    opportunityScore: 87,
    competitionLevel: 'Alta',
    description: 'Reinos ancestrais, sistemas de magia e sagas de múltiplos volumes que geram leitores fiéis de série.',
    popularKeywords: ['Fae Royals', 'Magic Academy', 'Sword & Sorcery', 'Dark Fantasy'],
    sampleBestSellers: [
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', bsr: 9, priceUsd: 9.99, royaltyPerBook: 4.50 }
    ]
  },
  {
    id: 'sci-fi',
    rankNumber: 8,
    rankLabel: '#8 na Amazon Books',
    name: 'Ficção Científica & Distopias',
    categoryGroup: 'ficcao',
    categoryGroupLabel: 'Ficção Científica',
    bsrRange: 'Top 80 - 1400 BSR',
    dailySalesEstimate: 5800,
    avgPriceUsd: 5.99,
    unitRoyaltyUsdMin: 3.00,
    unitRoyaltyUsdMax: 4.90,
    unitRoyaltyFormatted: 'U$ 3.00 - U$ 4.90',
    royaltyNote: 'Forte em E-book & Kindle Unlimited',
    opportunityScore: 85,
    competitionLevel: 'Média',
    description: 'Futuros distópicos, inteligência artificial senciente, viagens espaciais e tecnologia de fronteira.',
    popularKeywords: ['Cyberpunk', 'Space Opera', 'Distopia', 'Inteligência Artificial'],
    sampleBestSellers: [
      { title: 'Project Hail Mary', author: 'Andy Weir', bsr: 28, priceUsd: 11.99, royaltyPerBook: 5.10 }
    ]
  },
  {
    id: 'children-picture-book',
    rankNumber: 9,
    rankLabel: '#9 na Amazon Books',
    name: 'Livros Infantis & Fábulas Ilustradas',
    categoryGroup: 'infantil',
    categoryGroupLabel: 'Infantil & Ilustrado',
    bsrRange: 'Top 100 - 1800 BSR',
    dailySalesEstimate: 5100,
    avgPriceUsd: 6.99,
    unitRoyaltyUsdMin: 2.50,
    unitRoyaltyUsdMax: 4.20,
    unitRoyaltyFormatted: 'U$ 2.50 - U$ 4.20',
    royaltyNote: 'Vendas Diárias para Pais e Educadores',
    opportunityScore: 90,
    competitionLevel: 'Média',
    description: 'Histórias ilustradas para dormir, ensinamentos de amizade e valores humanos para os primeiros anos de vida.',
    popularKeywords: ['Histórias de Ninar', 'Valores & Emoções', 'Animais da Floresta', 'Autoconfiança Infantil'],
    sampleBestSellers: [
      { title: 'The Wonderful Things You Will Be', author: 'Emily Winfield Martin', bsr: 30, priceUsd: 8.99, royaltyPerBook: 3.80 }
    ]
  },
  {
    id: 'practical-guide',
    rankNumber: 10,
    rankLabel: '#10 na Amazon Books',
    name: 'Tecnologia, IA & Produtividade',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção Prática',
    bsrRange: 'Top 120 - 2200 BSR',
    dailySalesEstimate: 4600,
    avgPriceUsd: 9.99,
    unitRoyaltyUsdMin: 4.20,
    unitRoyaltyUsdMax: 7.90,
    unitRoyaltyFormatted: 'U$ 4.20 - U$ 7.90',
    royaltyNote: 'Alto Ticket • Crescimento Exponencial',
    opportunityScore: 93,
    competitionLevel: 'Baixa',
    description: 'Automações no trabalho, prompts para IA e novas ferramentas de tecnologia sem jargão inacessível.',
    popularKeywords: ['Inteligência Artificial Prática', 'Prompt Engineering', 'Automação no Trabalho'],
    sampleBestSellers: [
      { title: 'The AI Revolution Handbook', author: 'Tech Leaders', bsr: 110, priceUsd: 12.99, royaltyPerBook: 6.10 }
    ]
  },
  {
    id: 'biography',
    rankNumber: 14,
    rankLabel: '#14 na Amazon Books',
    name: 'Biografias & Histórias de Vida',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção',
    bsrRange: 'Top 150 - 2800 BSR',
    dailySalesEstimate: 3800,
    avgPriceUsd: 11.99,
    unitRoyaltyUsdMin: 4.80,
    unitRoyaltyUsdMax: 8.90,
    unitRoyaltyFormatted: 'U$ 4.80 - U$ 8.90',
    royaltyNote: 'Prestígio & Alto Preço de Capa',
    opportunityScore: 82,
    competitionLevel: 'Média',
    description: 'Trajetórias inspiradoras, superação de crises históricas e lições de vida de grandes mentes.',
    popularKeywords: ['Resiliência Real', 'Líderes Históricos', 'Memórias Inspiradoras'],
    sampleBestSellers: [
      { title: 'Steve Jobs', author: 'Walter Isaacson', bsr: 95, priceUsd: 14.99, royaltyPerBook: 6.80 }
    ]
  },
  {
    id: 'technical-manual',
    rankNumber: 22,
    rankLabel: '#22 na Amazon Books',
    name: 'Culinária, Dietas & Receitas Fáceis',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Guias Práticos',
    bsrRange: 'Top 250 - 4500 BSR',
    dailySalesEstimate: 3100,
    avgPriceUsd: 6.99,
    unitRoyaltyUsdMin: 3.20,
    unitRoyaltyUsdMax: 5.80,
    unitRoyaltyFormatted: 'U$ 3.20 - U$ 5.80',
    royaltyNote: 'Alta Conversão e Presente Ideal',
    opportunityScore: 84,
    competitionLevel: 'Média',
    description: 'Receitas rápidas na Air Fryer, marmitas saudáveis, cetogênica e confeitaria lucrativa.',
    popularKeywords: ['Air Fryer em 15 Min', 'Low Carb Fácil', 'Marmitas Saudáveis'],
    sampleBestSellers: [
      { title: 'The Easy Air Fryer Cookbook', author: 'Linda Larsen', bsr: 140, priceUsd: 9.99, royaltyPerBook: 4.10 }
    ]
  },
  {
    id: 'coloring-book',
    rankNumber: 102,
    rankLabel: '#102 na Amazon Books',
    name: 'Colorir & Arte Terapêutica (Anti-Estresse)',
    categoryGroup: 'baixo-conteudo',
    categoryGroupLabel: 'Baixo Conteúdo / KDP',
    bsrRange: 'Top 500 - 8500 BSR',
    dailySalesEstimate: 2200,
    avgPriceUsd: 6.99,
    unitRoyaltyUsdMin: 1.90,
    unitRoyaltyUsdMax: 3.20,
    unitRoyaltyFormatted: 'U$ 1.90 - U$ 3.20',
    royaltyNote: 'Royalty Líquido por Impressão Paperback',
    opportunityScore: 95,
    competitionLevel: 'Baixa',
    description: 'Ilustrações para alívio do estresse, mandalas e arte terapêutica. Criação ágil com altíssima escala no KDP.',
    popularKeywords: ['Mandalas Relaxantes', 'Padrões Antiestresse', 'Colorir para Adultos'],
    sampleBestSellers: [
      { title: 'Secret Garden: An Inky Treasure Hunt', author: 'Johanna Basford', bsr: 210, priceUsd: 9.99, royaltyPerBook: 3.10 },
      { title: 'Adult Coloring Book: Stress Relieving Patterns', author: 'Blue Star Press', bsr: 350, priceUsd: 7.99, royaltyPerBook: 2.40 }
    ]
  },
  {
    id: 'journal',
    rankNumber: 115,
    rankLabel: '#115 na Amazon Books',
    name: 'Planners & Diários Guiados',
    categoryGroup: 'baixo-conteudo',
    categoryGroupLabel: 'Baixo Conteúdo / KDP',
    bsrRange: 'Top 800 - 12000 BSR',
    dailySalesEstimate: 1850,
    avgPriceUsd: 7.99,
    unitRoyaltyUsdMin: 1.80,
    unitRoyaltyUsdMax: 3.10,
    unitRoyaltyFormatted: 'U$ 1.80 - U$ 3.10',
    royaltyNote: 'Paperback KDP • Alta Margem',
    opportunityScore: 88,
    competitionLevel: 'Baixa',
    description: 'Diários de 5 minutos, planners de gratidão, metas financeiras e rastreadores de hábitos.',
    popularKeywords: ['Diário de Gratidão', 'Planner Anual', 'Rastreador de Hábitos'],
    sampleBestSellers: [
      { title: 'The 5-Minute Journal', author: 'Intelligent Change', bsr: 280, priceUsd: 8.99, royaltyPerBook: 2.80 }
    ]
  },
  {
    id: 'activity-book',
    rankNumber: 128,
    rankLabel: '#128 na Amazon Books',
    name: 'Passatempos, Sudoku & Caça-Palavras',
    categoryGroup: 'baixo-conteudo',
    categoryGroupLabel: 'Baixo Conteúdo / KDP',
    bsrRange: 'Top 1200 - 16000 BSR',
    dailySalesEstimate: 1450,
    avgPriceUsd: 6.99,
    unitRoyaltyUsdMin: 1.60,
    unitRoyaltyUsdMax: 2.90,
    unitRoyaltyFormatted: 'U$ 1.60 - U$ 2.90',
    royaltyNote: 'Público Maduro Fiel • Impressão Contínua',
    opportunityScore: 86,
    competitionLevel: 'Baixa',
    description: 'Caça-palavras com letra grande para idosos, desafios lógicos e quebra-cabeças cognitivos.',
    popularKeywords: ['Caça-Palavras Letra Grande', 'Sudoku Gradual', 'Jogos Mentais'],
    sampleBestSellers: [
      { title: 'The Ultimate Large Print Word Search', author: 'Puzzle King', bsr: 420, priceUsd: 6.99, royaltyPerBook: 2.10 }
    ]
  },
  {
    id: 'non-fiction',
    rankNumber: 142,
    rankLabel: '#142 na Amazon Books',
    name: 'Filosofia Prática & Serenidade Mental',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção',
    bsrRange: 'Top 1500 - 21000 BSR',
    dailySalesEstimate: 1200,
    avgPriceUsd: 7.99,
    unitRoyaltyUsdMin: 3.40,
    unitRoyaltyUsdMax: 6.20,
    unitRoyaltyFormatted: 'U$ 3.40 - U$ 6.20',
    royaltyNote: 'Nicho Consolidado e Perene',
    opportunityScore: 81,
    competitionLevel: 'Baixa',
    description: 'Estoicismo para o dia a dia, ensaios sobre a clareza e reflexões éticas sem pedantismo acadêmico.',
    popularKeywords: ['Estoicismo Aplicado', 'Diário Estoico', 'Clareza de Pensamento'],
    sampleBestSellers: [
      { title: 'The Daily Stoic', author: 'Ryan Holiday', bsr: 75, priceUsd: 11.99, royaltyPerBook: 5.10 }
    ]
  }
];

export class AmazonMarketIntelligenceService {
  /**
   * Retorna os segmentos ordenados por escala de ranking na Amazon.
   */
  public static getRankedSegments(filter: SegmentFilterType = 'all', searchQuery: string = ''): AmazonRankedSegment[] {
    let list = [...AMAZON_RANKED_SEGMENTS];

    // Ordenação padrão por Rank Real na Amazon (1, 2, 3... 102...)
    list.sort((a, b) => a.rankNumber - b.rankNumber);

    // Filtros por grupo ou critério
    if (filter === 'top10') {
      list = list.filter(s => s.rankNumber <= 10);
    } else if (filter === 'high_royalty') {
      list = list.filter(s => s.unitRoyaltyUsdMax >= 6.0);
    } else if (filter === 'low_content') {
      list = list.filter(s => s.categoryGroup === 'baixo-conteudo');
    } else if (filter === 'fiction') {
      list = list.filter(s => s.categoryGroup === 'ficcao');
    } else if (filter === 'non_fiction') {
      list = list.filter(s => s.categoryGroup === 'nao-ficcao');
    }

    // Busca textual instantânea
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.rankLabel.toLowerCase().includes(q) ||
        s.popularKeywords.some(k => k.toLowerCase().includes(q)) ||
        s.description.toLowerCase().includes(q)
      );
    }

    return list;
  }

  /**
   * Busca detalhes consolidados de um segmento específico por ID.
   */
  public static getSegmentById(id: BookType): AmazonRankedSegment | undefined {
    return AMAZON_RANKED_SEGMENTS.find(s => s.id === id);
  }
}
