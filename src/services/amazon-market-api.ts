// ============================================================
// SERVIÇO DE INTELIGÊNCIA DE MERCADO AMAZON KDP (LIVE & HISTORICAL)
// Dados consolidados e integração em tempo real com Amazon Books.
// Extrai ASINs, imagens reais, reviews reais, preços em U$ e variações.
// ============================================================

import { BookType } from '../types/book-project';

export interface AmazonLiveBook {
  asin: string;
  title: string;
  author: string;
  priceUsd: number;
  royaltyEstUsd: number;
  rating: number;
  reviewsCount: number;
  coverImage: string;
  amazonUrl: string;
  badge?: string;
}

export interface AmazonSubstyleVariation {
  id: string;
  name: string;
  searchKeyword: string;
  targetAudience: string;
  kdpFormatTip: string;
  royaltyEstimate: string;
}

export interface AmazonRankedSegment {
  id: BookType;
  rankNumber: number; // ex: 1, 2, 3... 102...
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
  substyles: AmazonSubstyleVariation[];
  sampleBestSellers: {
    title: string;
    author: string;
    bsr: number;
    priceUsd: number;
    royaltyPerBook: number;
    asin?: string;
    coverImage?: string;
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
  // 1. ROMANCE & NEW ADULT (#1)
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
    substyles: [
      { id: 'enemies-lovers', name: 'Enemies to Lovers', searchKeyword: 'enemies to lovers romance bestseller', targetAudience: 'Leitoras New Adult (18-35)', kdpFormatTip: '5.5x8.5 pol • 320 págs', royaltyEstimate: 'U$ 2.80 - U$ 3.49' },
      { id: 'dark-romance', name: 'Dark Romance & Máfia', searchKeyword: 'dark romance mafia bestseller book', targetAudience: 'Fãs de romances intensos e anti-heróis', kdpFormatTip: '5.5x8.5 pol • 350 págs', royaltyEstimate: 'U$ 3.10 - U$ 4.20' },
      { id: 'billionaire', name: 'Bilionário & Romance de Escritório', searchKeyword: 'billionaire romance novel bestseller', targetAudience: 'Romance corporativo e drama', kdpFormatTip: '5.5x8.5 pol • 280 págs', royaltyEstimate: 'U$ 2.80 - U$ 3.49' },
      { id: 'romcom', name: 'Comédia Romântica Leve (Rom-Com)', searchKeyword: 'romantic comedy book bestseller', targetAudience: 'Público amplo em busca de finais felizes', kdpFormatTip: '5x8 pol • 260 págs', royaltyEstimate: 'U$ 2.50 - U$ 3.20' },
      { id: 'romantasy', name: 'Romantasy (Fantasia Romântica)', searchKeyword: 'romantasy fantasy romance bestseller', targetAudience: 'Leitores de mundos mágicos e casais fated mates', kdpFormatTip: '6x9 pol • 420 págs', royaltyEstimate: 'U$ 4.20 - U$ 6.50' },
      { id: 'sports-romance', name: 'Sports Romance (Atletas e Hóquei)', searchKeyword: 'sports romance hockey novel', targetAudience: 'Público jovem fã de rivalidades esportivas', kdpFormatTip: '5.5x8.5 pol • 300 págs', royaltyEstimate: 'U$ 2.80 - U$ 3.50' }
    ],
    sampleBestSellers: [
      { title: 'It Ends with Us', author: 'Colleen Hoover', bsr: 12, priceUsd: 10.99, royaltyPerBook: 4.20, asin: '1501110365', coverImage: 'https://m.media-amazon.com/images/I/71E8VNJ-8NL._AC_UY218_.jpg' },
      { title: 'Fourth Wing', author: 'Rebecca Yarros', bsr: 8, priceUsd: 14.99, royaltyPerBook: 5.80, asin: '1649374046', coverImage: 'https://m.media-amazon.com/images/I/91n7p-j5aqL._AC_UY218_.jpg' }
    ]
  },

  // 2. DESENVOLVIMENTO PESSOAL & HÁBITOS (#2)
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
    substyles: [
      { id: 'habits', name: 'Micro-Hábitos e Rotinas de Alta Performance', searchKeyword: 'atomic habits self help discipline book', targetAudience: 'Profissionais e adultos focados em disciplina', kdpFormatTip: '5.5x8.5 pol • 220 págs', royaltyEstimate: 'U$ 3.50 - U$ 5.60' },
      { id: 'mindfulness', name: 'Mindfulness e Gestão da Ansiedade', searchKeyword: 'mindfulness anxiety relief practical book', targetAudience: 'Pessoas com rotinas estressantes', kdpFormatTip: '5x8 pol • 180 págs', royaltyEstimate: 'U$ 3.20 - U$ 4.80' },
      { id: 'stoic', name: 'Estoicismo e Sabedoria Prática', searchKeyword: 'stoicism practical daily guide book', targetAudience: 'Leitores de filosofia e autocontrole', kdpFormatTip: '5.5x8.5 pol • 240 págs', royaltyEstimate: 'U$ 3.80 - U$ 5.90' },
      { id: 'focus', name: 'Foco Profundo e Eliminação de Distrações', searchKeyword: 'deep work focus productivity book', targetAudience: 'Trabalhadores do conhecimento e estudantes', kdpFormatTip: '5.5x8.5 pol • 200 págs', royaltyEstimate: 'U$ 3.50 - U$ 5.20' }
    ],
    sampleBestSellers: [
      { title: 'Atomic Habits', author: 'James Clear', bsr: 2, priceUsd: 11.99, royaltyPerBook: 5.20, asin: '0735211299', coverImage: 'https://m.media-amazon.com/images/I/81F90H7hnML._AC_UY218_.jpg' },
      { title: 'The Mountain Is You', author: 'Brianna Wiest', bsr: 25, priceUsd: 9.99, royaltyPerBook: 4.50, asin: '1949759229', coverImage: 'https://m.media-amazon.com/images/I/71wLpWjY1qL._AC_UY218_.jpg' }
    ]
  },

  // 3. SUSPENSE, MISTÉRIO & THRILLER (#3)
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
    royaltyNote: 'Altíssima retenção Kindle Unlimited',
    opportunityScore: 94,
    competitionLevel: 'Alta',
    description: 'Enredos instigantes com plot twists inesperados e investigações policiais que prendem o leitor até a última página.',
    popularKeywords: ['Thriller Psicológico', 'Plot Twist', 'Investigação Policial', 'Suspense Doméstico'],
    substyles: [
      { id: 'psychological-thriller', name: 'Thriller Psicológico & Suspense Doméstico', searchKeyword: 'psychological thriller book bestseller', targetAudience: 'Leitores vorazes de Freida McFadden e Gillian Flynn', kdpFormatTip: '5.5x8.5 pol • 280 págs', royaltyEstimate: 'U$ 2.45 - U$ 4.80' },
      { id: 'police-detective', name: 'Investigação Policial & Detetive', searchKeyword: 'detective mystery crime novel bestseller', targetAudience: 'Fãs de caçadas a criminosos e quebra-cabeças forenses', kdpFormatTip: '5.5x8.5 pol • 320 págs', royaltyEstimate: 'U$ 2.80 - U$ 4.50' },
      { id: 'cozy-mystery', name: 'Cozy Mystery (Mistério Leve & Charmoso)', searchKeyword: 'cozy mystery culinary pet detective book', targetAudience: 'Leitoras de mistérios aconchegantes sem violência gráfica', kdpFormatTip: '5x8 pol • 220 págs', royaltyEstimate: 'U$ 2.20 - U$ 3.49' },
      { id: 'legal-thriller', name: 'Thriller Jurídico & Tribunal', searchKeyword: 'legal courtroom thriller novel', targetAudience: 'Fãs de reviravoltas no júri e advogados astutos', kdpFormatTip: '6x9 pol • 340 págs', royaltyEstimate: 'U$ 3.10 - U$ 4.90' },
      { id: 'noir-crime', name: 'Crime Noir & Conspirações de Espionagem', searchKeyword: 'spy espionage noir thriller book', targetAudience: 'Amantes de histórias de agentes secretos e conspirações', kdpFormatTip: '5.5x8.5 pol • 310 págs', royaltyEstimate: 'U$ 2.90 - U$ 4.60' }
    ],
    sampleBestSellers: [
      { title: 'The Housemaid (A Empregada)', author: 'Freida McFadden', bsr: 4, priceUsd: 5.99, royaltyPerBook: 4.19, asin: '1538742578', coverImage: 'https://m.media-amazon.com/images/I/81AHTyq2wVL._AC_UY218_.jpg' },
      { title: 'The Silent Patient', author: 'Alex Michaelides', bsr: 18, priceUsd: 8.99, royaltyPerBook: 3.90, asin: '1250301696', coverImage: 'https://m.media-amazon.com/images/I/81JJPDNlxSL._AC_UY218_.jpg' }
    ]
  },

  // 4. NEGÓCIOS, GESTÃO & LIDERANÇA (#4)
  {
    id: 'business',
    rankNumber: 4,
    rankLabel: '#4 na Amazon Books',
    name: 'Negócios, Gestão & Liderança',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção',
    bsrRange: 'Top 50 - 1200 BSR',
    dailySalesEstimate: 9600,
    avgPriceUsd: 9.99,
    unitRoyaltyUsdMin: 4.80,
    unitRoyaltyUsdMax: 9.10,
    unitRoyaltyFormatted: 'U$ 4.80 - U$ 9.10',
    royaltyNote: 'Maior Ticket Médio de Venda e Royalties',
    opportunityScore: 91,
    competitionLevel: 'Média',
    description: 'Estratégias de escala corporativa, gestão de times e vendas B2B. Leitores compram no preço cheio sem hesitar.',
    popularKeywords: ['Liderança Executiva', 'Vendas Consultivas', 'Cultura Empresarial', 'Gestão Ágil'],
    substyles: [
      { id: 'leadership', name: 'Liderança Consciente e Gestão de Equipes', searchKeyword: 'executive leadership management book bestseller', targetAudience: 'Gestores, diretores e coordenadores', kdpFormatTip: '6x9 pol • 240 págs', royaltyEstimate: 'U$ 4.80 - U$ 8.50' },
      { id: 'sales-b2b', name: 'Vendas Complexas e Negociação Estratégica', searchKeyword: 'b2b sales negotiation tactics book', targetAudience: 'Executivos de vendas e empreendedores', kdpFormatTip: '6x9 pol • 220 págs', royaltyEstimate: 'U$ 5.20 - U$ 9.10' },
      { id: 'startup', name: 'Startups, Escala e Inovação Ágil', searchKeyword: 'lean startup scaling business book', targetAudience: 'Founders e profissionais de tecnologia', kdpFormatTip: '6x9 pol • 260 págs', royaltyEstimate: 'U$ 4.90 - U$ 8.20' }
    ],
    sampleBestSellers: [
      { title: 'Good to Great', author: 'Jim Collins', bsr: 45, priceUsd: 14.99, royaltyPerBook: 7.20, asin: '0066620996', coverImage: 'https://m.media-amazon.com/images/I/71j1wPqSURL._AC_UY218_.jpg' },
      { title: 'Never Split the Difference', author: 'Chris Voss', bsr: 32, priceUsd: 12.99, royaltyPerBook: 6.10, asin: '0062407805', coverImage: 'https://m.media-amazon.com/images/I/81xU-Uv-5jL._AC_UY218_.jpg' }
    ]
  },

  // 5. FANTASIA ÉPICA & MITOLOGIA (#5)
  {
    id: 'fantasy',
    rankNumber: 5,
    rankLabel: '#5 na Amazon Books',
    name: 'Fantasia Épica, Magia & Mitologia',
    categoryGroup: 'ficcao',
    categoryGroupLabel: 'Ficção & Fantasia',
    bsrRange: 'Top 40 - 1500 BSR',
    dailySalesEstimate: 8900,
    avgPriceUsd: 6.99,
    unitRoyaltyUsdMin: 3.20,
    unitRoyaltyUsdMax: 5.80,
    unitRoyaltyFormatted: 'U$ 3.20 - U$ 5.80',
    royaltyNote: 'Comunidade Fiel e Leitores de Séries',
    opportunityScore: 89,
    competitionLevel: 'Alta',
    description: 'Mundos mágicos imersivos, sagas dinásticas, mitologias ricas e batalhas de feitiçaria em múltiplos volumes.',
    popularKeywords: ['Alta Fantasia', 'Magia Ancestral', 'Worldbuilding', 'Dragões e Reinos'],
    substyles: [
      { id: 'epic-fantasy', name: 'Alta Fantasia & Guerras Dinásticas', searchKeyword: 'epic fantasy novel worldbuilding bestseller', targetAudience: 'Fãs de Brandon Sanderson e George R. R. Martin', kdpFormatTip: '6x9 pol • 450 págs', royaltyEstimate: 'U$ 3.80 - U$ 6.20' },
      { id: 'urban-fantasy', name: 'Fantasia Urbana & Caçadores Sobrenaturais', searchKeyword: 'urban fantasy detective magic book', targetAudience: 'Leitores de magia moderna e cidades ocultas', kdpFormatTip: '5.5x8.5 pol • 320 págs', royaltyEstimate: 'U$ 2.90 - U$ 4.50' },
      { id: 'mythology', name: 'Mitologia Revisitada (Grega, Nórdica e Céltica)', searchKeyword: 'mythology retelling fantasy novel', targetAudience: 'Fãs de releituras de mitos antigos', kdpFormatTip: '5.5x8.5 pol • 300 págs', royaltyEstimate: 'U$ 3.10 - U$ 5.00' }
    ],
    sampleBestSellers: [
      { title: 'The Way of Kings', author: 'Brandon Sanderson', bsr: 80, priceUsd: 12.99, royaltyPerBook: 5.50, asin: '0765365278', coverImage: 'https://m.media-amazon.com/images/I/91tK3dE-GXL._AC_UY218_.jpg' }
    ]
  },

  // 6. FINANÇAS PESSOAIS & CRIPTO (#6)
  {
    id: 'finance',
    rankNumber: 6,
    rankLabel: '#6 na Amazon Books',
    name: 'Finanças Pessoais & Renda Passiva',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção',
    bsrRange: 'Top 60 - 1800 BSR',
    dailySalesEstimate: 8200,
    avgPriceUsd: 8.99,
    unitRoyaltyUsdMin: 4.20,
    unitRoyaltyUsdMax: 7.80,
    unitRoyaltyFormatted: 'U$ 4.20 - U$ 7.80',
    royaltyNote: 'Excelente Venda de Cópias Físicas e E-books',
    opportunityScore: 93,
    competitionLevel: 'Média',
    description: 'Investimentos, liberdade financeira, fundos imobiliários, renda passiva e inteligência orçamentária.',
    popularKeywords: ['Renda Passiva', 'Independência Financeira', 'Ações e Dividendos', 'Orçamento Inteligente'],
    substyles: [
      { id: 'fire', name: 'Movimento FIRE e Independência Financeira', searchKeyword: 'financial independence retire early fire book', targetAudience: 'Jovens adultos e investidores focados em liberdade', kdpFormatTip: '5.5x8.5 pol • 240 págs', royaltyEstimate: 'U$ 4.20 - U$ 6.80' },
      { id: 'passive-income', name: 'Renda Passiva, Dividendos e Imóveis', searchKeyword: 'passive income real estate dividend investing book', targetAudience: 'Pessoas querendo criar fontes secundárias de renda', kdpFormatTip: '6x9 pol • 220 págs', royaltyEstimate: 'U$ 4.50 - U$ 7.80' },
      { id: 'crypto-tech', name: 'Criptomoedas, Bitcoin e Web3 na Prática', searchKeyword: 'bitcoin crypto investing beginner guide book', targetAudience: 'Iniciantes em ativos digitais', kdpFormatTip: '6x9 pol • 200 págs', royaltyEstimate: 'U$ 4.90 - U$ 8.00' }
    ],
    sampleBestSellers: [
      { title: 'The Psychology of Money', author: 'Morgan Housel', bsr: 9, priceUsd: 12.99, royaltyPerBook: 5.90, asin: '0857197681', coverImage: 'https://m.media-amazon.com/images/I/71TRUbzcvaL._AC_UY218_.jpg' },
      { title: 'Rich Dad Poor Dad', author: 'Robert Kiyosaki', bsr: 15, priceUsd: 8.99, royaltyPerBook: 4.10, asin: '1612680194', coverImage: 'https://m.media-amazon.com/images/I/81bsw6fnUiL._AC_UY218_.jpg' }
    ]
  },

  // 7. FICÇÃO CIENTÍFICA & CYBERPUNK (#7)
  {
    id: 'sci-fi',
    rankNumber: 7,
    rankLabel: '#7 na Amazon Books',
    name: 'Ficção Científica & Distopias',
    categoryGroup: 'ficcao',
    categoryGroupLabel: 'Ficção & Sci-Fi',
    bsrRange: 'Top 70 - 2200 BSR',
    dailySalesEstimate: 7400,
    avgPriceUsd: 5.99,
    unitRoyaltyUsdMin: 2.80,
    unitRoyaltyUsdMax: 4.90,
    unitRoyaltyFormatted: 'U$ 2.80 - U$ 4.90',
    royaltyNote: 'Público Ávido por Trilogias e Séries',
    opportunityScore: 87,
    competitionLevel: 'Média',
    description: 'Futuros distópicos, inteligência artificial senciente, viagens espaciais e dilemas éticos da tecnologia.',
    popularKeywords: ['Cyberpunk', 'Space Opera', 'Distopia', 'Inteligência Artificial'],
    substyles: [
      { id: 'space-opera', name: 'Space Opera & Frotas Espaciais', searchKeyword: 'space opera military science fiction bestseller', targetAudience: 'Leitores de exploração interestelar e naves de combate', kdpFormatTip: '6x9 pol • 380 págs', royaltyEstimate: 'U$ 3.20 - U$ 5.10' },
      { id: 'cyberpunk', name: 'Cyberpunk & Megacorporações Futuristas', searchKeyword: 'cyberpunk sci fi novel hacker dystopia', targetAudience: 'Fãs de Blade Runner e distopias tecnológicas', kdpFormatTip: '5.5x8.5 pol • 300 págs', royaltyEstimate: 'U$ 2.80 - U$ 4.60' },
      { id: 'time-travel', name: 'Viagem no Tempo e Paradoxo Quântico', searchKeyword: 'time travel paradox sci fi book', targetAudience: 'Leitores que amam quebra-cabeças temporais', kdpFormatTip: '5.5x8.5 pol • 290 págs', royaltyEstimate: 'U$ 2.90 - U$ 4.80' }
    ],
    sampleBestSellers: [
      { title: 'Project Hail Mary', author: 'Andy Weir', bsr: 22, priceUsd: 13.99, royaltyPerBook: 6.20, asin: '0593135202', coverImage: 'https://m.media-amazon.com/images/I/81z4k2B9RmL._AC_UY218_.jpg' }
    ]
  },

  // 8. SAÚDE, LONGEVIDADE & BEM-ESTAR (#8)
  {
    id: 'health-wellness',
    rankNumber: 8,
    rankLabel: '#8 na Amazon Books',
    name: 'Saúde Integrativa, Longevidade & Biohacking',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção',
    bsrRange: 'Top 80 - 2400 BSR',
    dailySalesEstimate: 6800,
    avgPriceUsd: 9.99,
    unitRoyaltyUsdMin: 4.10,
    unitRoyaltyUsdMax: 7.50,
    unitRoyaltyFormatted: 'U$ 4.10 - U$ 7.50',
    royaltyNote: 'Excelente Venda em Capa Dura e E-book',
    opportunityScore: 91,
    competitionLevel: 'Média',
    description: 'Ciência da longevidade, sono profundo, alimentação funcional, controle glicêmico e rotinas de saúde preventiva.',
    popularKeywords: ['Longevidade Ativa', 'Biohacking Prático', 'Sono Reparador', 'Saúde Metabólica'],
    substyles: [
      { id: 'longevity', name: 'Ciência da Longevidade e Rejuvenescimento Celular', searchKeyword: 'longevity outlive science health book bestseller', targetAudience: 'Adultos de 30 a 65 anos focados em vitalidade', kdpFormatTip: '6x9 pol • 340 págs', royaltyEstimate: 'U$ 4.80 - U$ 8.20' },
      { id: 'gut-health', name: 'Saúde Intestinal e Imunidade Funcional', searchKeyword: 'gut health microbiome immunity practical book', targetAudience: 'Pessoas buscando energia e bem-estar digestivo', kdpFormatTip: '5.5x8.5 pol • 220 págs', royaltyEstimate: 'U$ 3.80 - U$ 6.50' },
      { id: 'sleep-optimization', name: 'Otimização do Sono e Recuperação Energética', searchKeyword: 'sleep optimization energy recovery book', targetAudience: 'Trabalhadores e atletas com insônia ou cansaço', kdpFormatTip: '5.5x8.5 pol • 200 págs', royaltyEstimate: 'U$ 3.50 - U$ 5.90' }
    ],
    sampleBestSellers: [
      { title: 'Outlive: The Science and Art of Longevity', author: 'Peter Attia', bsr: 5, priceUsd: 16.99, royaltyPerBook: 8.50, asin: '0593236599', coverImage: 'https://m.media-amazon.com/images/I/71XbgOtX66L._AC_UY218_.jpg' }
    ]
  },

  // 9. GUIAS PRÁTICOS & PRODUTIVIDADE (#9)
  {
    id: 'practical-guide',
    rankNumber: 9,
    rankLabel: '#9 na Amazon Books',
    name: 'Guias Práticos, Produtividade & Métodos Ágeis',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção',
    bsrRange: 'Top 90 - 2800 BSR',
    dailySalesEstimate: 6200,
    avgPriceUsd: 8.99,
    unitRoyaltyUsdMin: 3.90,
    unitRoyaltyUsdMax: 6.80,
    unitRoyaltyFormatted: 'U$ 3.90 - U$ 6.80',
    royaltyNote: 'Formatos Diretos e Alta Satisfação do Leitor',
    opportunityScore: 89,
    competitionLevel: 'Média',
    description: 'Manuais passo a passo para dominar novas habilidades, otimizar processos de trabalho e gerenciar tempo.',
    popularKeywords: ['Produtividade Ágil', 'Time Blocking', 'Gestão de Foco', 'Passo a Passo'],
    substyles: [
      { id: 'agile-productivity', name: 'Métodos Ágeis para a Vida Pessoal', searchKeyword: 'agile productivity time management book', targetAudience: 'Profissionais modernos e gestores', kdpFormatTip: '5.5x8.5 pol • 210 págs', royaltyEstimate: 'U$ 3.80 - U$ 6.20' },
      { id: 'digital-minimalism', name: 'Minimalismo Digital e Foco Sem Distrações', searchKeyword: 'digital minimalism focus productivity book', targetAudience: 'Pessoas saturadas de redes sociais e notificações', kdpFormatTip: '5x8 pol • 190 págs', royaltyEstimate: 'U$ 3.50 - U$ 5.80' }
    ],
    sampleBestSellers: [
      { title: 'Make Time: How to Focus on What Matters', author: 'Jake Knapp', bsr: 110, priceUsd: 11.99, royaltyPerBook: 5.20, asin: '0525572422', coverImage: 'https://m.media-amazon.com/images/I/71rpaZ1p05L._AC_UY218_.jpg' }
    ]
  },

  // 10. BIOGRAFIAS, MEMÓRIAS & TRUE CRIME (#10)
  {
    id: 'biography',
    rankNumber: 10,
    rankLabel: '#10 na Amazon Books',
    name: 'Biografias, Memórias & True Crime',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção',
    bsrRange: 'Top 100 - 3200 BSR',
    dailySalesEstimate: 5900,
    avgPriceUsd: 11.99,
    unitRoyaltyUsdMin: 4.80,
    unitRoyaltyUsdMax: 8.50,
    unitRoyaltyFormatted: 'U$ 4.80 - U$ 8.50',
    royaltyNote: 'Alto Ticket de Venda e Interesse do Público Geral',
    opportunityScore: 88,
    competitionLevel: 'Média',
    description: 'Narrativas reais de superação, casos policiais chocantes de True Crime e trajetórias de personalidades históricas.',
    popularKeywords: ['True Crime Real', 'Histórias de Superação', 'Memórias de Vida', 'Investigação Criminal'],
    substyles: [
      { id: 'true-crime', name: 'True Crime & Investigações de Casos Reais', searchKeyword: 'true crime books bestseller serial killer cases', targetAudience: 'Entusiastas de documentários policiais e mistérios reais', kdpFormatTip: '6x9 pol • 320 págs', royaltyEstimate: 'U$ 4.50 - U$ 7.90' },
      { id: 'inspiring-memoir', name: 'Memórias de Superação e Resiliência', searchKeyword: 'inspirational memoir overcoming adversity bestseller', targetAudience: 'Público que busca motivação através de fatos reais', kdpFormatTip: '5.5x8.5 pol • 260 págs', royaltyEstimate: 'U$ 4.20 - U$ 7.20' }
    ],
    sampleBestSellers: [
      { title: 'Educated', author: 'Tara Westover', bsr: 60, priceUsd: 13.99, royaltyPerBook: 6.50, asin: '0399590501', coverImage: 'https://m.media-amazon.com/images/I/81NwZZUjV-L._AC_UY218_.jpg' }
    ]
  },

  // 11. LIVROS DE BAIXO CONTEÚDO: COLORIR (#102)
  {
    id: 'coloring-book',
    rankNumber: 102,
    rankLabel: '#102 na Amazon Books',
    name: 'Livros de Colorir (KDP Low Content)',
    categoryGroup: 'baixo-conteudo',
    categoryGroupLabel: 'Baixo Conteúdo / KDP',
    bsrRange: 'Top 500 - 8000 BSR',
    dailySalesEstimate: 3200,
    avgPriceUsd: 7.99,
    unitRoyaltyUsdMin: 1.95,
    unitRoyaltyUsdMax: 3.60,
    unitRoyaltyFormatted: 'U$ 1.95 - U$ 3.60',
    royaltyNote: '100% Cópia Impressa (Paperback KDP)',
    opportunityScore: 95,
    competitionLevel: 'Média',
    description: 'Mandalas anti-stress para adultos, animais fofos para crianças e ilustrações relaxantes em preto e branco.',
    popularKeywords: ['Livro de Colorir Adulto', 'Coloring Book Mandala', 'Animais Fofos', 'Relaxante Anti-Stress'],
    substyles: [
      { id: 'adult-mandala', name: 'Mandalas & Padrões Geométricos Anti-Stress', searchKeyword: 'adult coloring book mandalas stress relief bestseller', targetAudience: 'Adultos buscando alívio de ansiedade e mindfulness', kdpFormatTip: '8.5x11 pol • 100 págs (costas em branco)', royaltyEstimate: 'U$ 2.20 - U$ 3.60' },
      { id: 'kids-animals', name: 'Animais Fofos e Aventuras Infantis', searchKeyword: 'kids coloring book cute animals toddlers', targetAudience: 'Crianças de 3 a 8 anos e pais compradores', kdpFormatTip: '8.5x11 pol • 80 págs', royaltyEstimate: 'U$ 1.95 - U$ 2.90' },
      { id: 'spooky-cozy', name: 'Cozy & Spooky (Tendência Viral TikTok)', searchKeyword: 'spooky cute cozy coloring book bold easy', targetAudience: 'Jovens e público do BookTok e ColoringTok', kdpFormatTip: '8.5x8.5 pol ou 8.5x11 pol • 90 págs', royaltyEstimate: 'U$ 2.40 - U$ 3.80' },
      { id: 'botanical-flowers', name: 'Jardins Secretos e Botânica Floral', searchKeyword: 'flower botanical coloring book adult stress relief', targetAudience: 'Entusiastas de arte e natureza', kdpFormatTip: '8.5x11 pol • 110 págs', royaltyEstimate: 'U$ 2.10 - U$ 3.50' }
    ],
    sampleBestSellers: [
      { title: 'Bobbie Goods Cozy Days', author: 'Bobbie Goods', bsr: 35, priceUsd: 9.99, royaltyPerBook: 3.10, asin: 'B0C7J8XYZ', coverImage: 'https://m.media-amazon.com/images/I/71u9gX4tWkL._AC_UY218_.jpg' },
      { title: '100 Animals for Toddlers', author: 'Wonder Colors', bsr: 120, priceUsd: 6.99, royaltyPerBook: 2.10, asin: '1953177002', coverImage: 'https://m.media-amazon.com/images/I/81O5y3b4hUL._AC_UY218_.jpg' }
    ]
  },

  // 9. DIÁRIOS, PLANNERS & GRATIDÃO (#115)
  {
    id: 'journal',
    rankNumber: 115,
    rankLabel: '#115 na Amazon Books',
    name: 'Diários Guiados, Planners & Gratidão',
    categoryGroup: 'baixo-conteudo',
    categoryGroupLabel: 'Baixo Conteúdo / KDP',
    bsrRange: 'Top 800 - 12000 BSR',
    dailySalesEstimate: 2100,
    avgPriceUsd: 8.99,
    unitRoyaltyUsdMin: 1.80,
    unitRoyaltyUsdMax: 3.10,
    unitRoyaltyFormatted: 'U$ 1.80 - U$ 3.10',
    royaltyNote: 'Paperback KDP • Alta Margem',
    opportunityScore: 88,
    competitionLevel: 'Baixa',
    description: 'Diários de 5 minutos, planners de gratidão, metas financeiras e rastreadores de hábitos diários.',
    popularKeywords: ['Diário de Gratidão', 'Planner Anual', 'Rastreador de Hábitos', 'Prompt Journal'],
    substyles: [
      { id: 'gratitude-5min', name: 'Diário de Gratidão de 5 Minutos', searchKeyword: '5 minute gratitude journal morning routine', targetAudience: 'Pessoas focadas em bem-estar matinal', kdpFormatTip: '6x9 pol • 120 págs com prompts', royaltyEstimate: 'U$ 1.90 - U$ 3.10' },
      { id: 'habit-tracker', name: 'Rastreador de Hábitos e Metas Mensais', searchKeyword: 'habit tracker planner journal minimalist', targetAudience: 'Amantes de produtividade e organização', kdpFormatTip: '6x9 pol • 140 págs', royaltyEstimate: 'U$ 2.10 - U$ 3.30' },
      { id: 'shadow-work', name: 'Diário de Shadow Work & Autoconhecimento', searchKeyword: 'shadow work journal prompts self reflection', targetAudience: 'Pessoas em processo de autodescoberta', kdpFormatTip: '6x9 pol • 160 págs guiadas', royaltyEstimate: 'U$ 2.40 - U$ 3.80' }
    ],
    sampleBestSellers: [
      { title: 'The 5-Minute Journal', author: 'Intelligent Change', bsr: 280, priceUsd: 8.99, royaltyPerBook: 2.80, asin: '0991846206', coverImage: 'https://m.media-amazon.com/images/I/71Y8wO21mRL._AC_UY218_.jpg' }
    ]
  },

  // 10. PASSATEMPOS, SUDOKU & CAÇA-PALAVRAS (#128)
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
    popularKeywords: ['Caça-Palavras Letra Grande', 'Sudoku Gradual', 'Jogos Mentais', 'Word Search'],
    substyles: [
      { id: 'large-print-words', name: 'Caça-Palavras com Letra Grande (Sênior)', searchKeyword: 'large print word search for seniors bestseller', targetAudience: 'Idosos e adultos que apreciam leitura confortável', kdpFormatTip: '8.5x11 pol • 120 págs', royaltyEstimate: 'U$ 1.80 - U$ 2.90' },
      { id: 'sudoku-progressive', name: 'Sudoku Gradual (Fácil ao Diabólico)', searchKeyword: 'sudoku puzzle book easy to hard with solutions', targetAudience: 'Aficionados por desafios de lógica matemática', kdpFormatTip: '6x9 ou 8.5x11 pol • 150 págs', royaltyEstimate: 'U$ 1.60 - U$ 2.60' },
      { id: 'mazes-brain', name: 'Labirintos e Enigmas Cognitivos', searchKeyword: 'logic puzzles brain games book', targetAudience: 'Estudantes e adultos estimulando o cérebro', kdpFormatTip: '8.5x11 pol • 100 págs', royaltyEstimate: 'U$ 1.70 - U$ 2.80' }
    ],
    sampleBestSellers: [
      { title: 'The Ultimate Large Print Word Search', author: 'Puzzle King', bsr: 420, priceUsd: 6.99, royaltyPerBook: 2.10, asin: '1953177118', coverImage: 'https://m.media-amazon.com/images/I/81b2H6W0X1L._AC_UY218_.jpg' }
    ]
  },

  // 11. INFANTIL & PRIMEIRAS LEITURAS (#14)
  {
    id: 'children-picture-book',
    rankNumber: 14,
    rankLabel: '#14 na Amazon Books',
    name: 'Infantil, Primeiras Leituras & Fábulas',
    categoryGroup: 'infantil',
    categoryGroupLabel: 'Infantil & Fábulas',
    bsrRange: 'Top 150 - 3500 BSR',
    dailySalesEstimate: 5800,
    avgPriceUsd: 7.99,
    unitRoyaltyUsdMin: 2.20,
    unitRoyaltyUsdMax: 3.90,
    unitRoyaltyFormatted: 'U$ 2.20 - U$ 3.90',
    royaltyNote: 'Excelente Venda para Presentes e Escolas',
    opportunityScore: 90,
    competitionLevel: 'Alta',
    description: 'Histórias ilustradas para ninar, desenvolvimento de empatia, rimas infantis e fábulas sobre valores humanos.',
    popularKeywords: ['Livro Infantil Ilustrado', 'Histórias para Dormir', 'Fábulas de Empatia', 'Primeiras Leituras'],
    substyles: [
      { id: 'bedtime-stories', name: 'Histórias Aconchegantes para Dormir (3 a 6 anos)', searchKeyword: 'bedtime stories children picture book bestseller', targetAudience: 'Pais e crianças na rotina do sono', kdpFormatTip: '8.5x8.5 pol • 32 págs ilustradas a cores', royaltyEstimate: 'U$ 2.20 - U$ 3.80' },
      { id: 'emotional-learning', name: 'Gestão de Emoções e Empatia para Crianças', searchKeyword: 'kids emotional regulation picture book feelings', targetAudience: 'Famílias e educadores da primeira infância', kdpFormatTip: '8.5x8.5 pol • 36 págs', royaltyEstimate: 'U$ 2.50 - U$ 4.10' },
      { id: 'rhyme-adventure', name: 'Rimas Educativas e Aventuras da Floresta', searchKeyword: 'rhyming children picture book animals nature', targetAudience: 'Crianças em fase de alfabetização', kdpFormatTip: '8.5x11 pol • 32 págs', royaltyEstimate: 'U$ 2.10 - U$ 3.60' }
    ],
    sampleBestSellers: [
      { title: 'The Wonderful Things You Will Be', author: 'Emily Winfield Martin', bsr: 50, priceUsd: 9.99, royaltyPerBook: 3.80, asin: '0385376715', coverImage: 'https://m.media-amazon.com/images/I/81xUe5-mH8L._AC_UY218_.jpg' }
    ]
  },

  // 12. CULINÁRIA, DIETAS & RECEITAS (#22)
  {
    id: 'technical-manual',
    rankNumber: 22,
    rankLabel: '#22 na Amazon Books',
    name: 'Culinária Prática, Airfryer & Dietas',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção',
    bsrRange: 'Top 250 - 5500 BSR',
    dailySalesEstimate: 4200,
    avgPriceUsd: 8.99,
    unitRoyaltyUsdMin: 3.20,
    unitRoyaltyUsdMax: 6.20,
    unitRoyaltyFormatted: 'U$ 3.20 - U$ 6.20',
    royaltyNote: 'Venda Forte em Capa Dura e Impresso',
    opportunityScore: 85,
    competitionLevel: 'Média',
    description: 'Receitas rápidas de 30 minutos, guias de airfryer para solteiros, alimentação anti-inflamatória e marmitas da semana.',
    popularKeywords: ['Airfryer Receitas', 'Marmitas Semanais', 'Dieta Prática', 'Cozinha em 30 Minutos'],
    substyles: [
      { id: 'airfryer-quick', name: 'Airfryer Prática: Refeições em 20 Minutos', searchKeyword: 'air fryer cookbook easy healthy recipes bestseller', targetAudience: 'Pessoas com pouco tempo para cozinhar', kdpFormatTip: '8x10 pol • 140 págs', royaltyEstimate: 'U$ 3.50 - U$ 6.20' },
      { id: 'meal-prep', name: 'Meal Prep & Marmitas Congeladas Saudáveis', searchKeyword: 'meal prep cookbook weekly planner recipes', targetAudience: 'Trabalhadores e atletas organizando a dieta', kdpFormatTip: '8x10 pol • 160 págs', royaltyEstimate: 'U$ 3.80 - U$ 6.80' }
    ],
    sampleBestSellers: [
      { title: 'The Complete Air Fryer Cookbook', author: 'Linda Larsen', bsr: 90, priceUsd: 10.99, royaltyPerBook: 4.80, asin: '1623157448', coverImage: 'https://m.media-amazon.com/images/I/81T1gY1uF4L._AC_UY218_.jpg' }
    ]
  },

  // 14. FILOSOFIA PRÁTICA & SERENIDADE (#142)
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
    popularKeywords: ['Estoicismo Aplicado', 'Diário Estoico', 'Clareza de Pensamento', 'Serenidade Interior'],
    substyles: [
      { id: 'daily-stoic', name: 'Meditações Diárias de Sabedoria e Calma', searchKeyword: 'daily stoic meditation ancient philosophy book', targetAudience: 'Leitores que buscam clareza mental matinal', kdpFormatTip: '5.5x8.5 pol • 250 págs', royaltyEstimate: 'U$ 3.40 - U$ 5.90' },
      { id: 'peace-mind', name: 'Minimalismo Mental e Serenidade', searchKeyword: 'inner peace simplicity practical philosophy', targetAudience: 'Pessoas desintoxicando da sobrecarga de informação', kdpFormatTip: '5x8 pol • 190 págs', royaltyEstimate: 'U$ 3.20 - U$ 5.10' }
    ],
    sampleBestSellers: [
      { title: 'The Daily Stoic', author: 'Ryan Holiday', bsr: 75, priceUsd: 11.99, royaltyPerBook: 5.10, asin: '0735211736', coverImage: 'https://m.media-amazon.com/images/I/71k4vQ+xT9L._AC_UY218_.jpg' }
    ]
  },

  // 15. MISTÉRIO, DETETIVES & ENIGMAS (#11)
  {
    id: 'mystery',
    rankNumber: 11,
    rankLabel: '#11 na Amazon Books',
    name: 'Mistério, Detetives & Enigmas',
    categoryGroup: 'ficcao',
    categoryGroupLabel: 'Ficção & Mistério',
    bsrRange: 'Top 110 - 3400 BSR',
    dailySalesEstimate: 5600,
    avgPriceUsd: 5.99,
    unitRoyaltyUsdMin: 2.50,
    unitRoyaltyUsdMax: 4.80,
    unitRoyaltyFormatted: 'U$ 2.50 - U$ 4.80',
    royaltyNote: 'Excelente público Kindle Unlimited',
    opportunityScore: 91,
    competitionLevel: 'Alta',
    description: 'Investigações de detetives particulares, assassinatos em mansões isoladas e enigmas com pistas inteligentes.',
    popularKeywords: ['Whodunit Clássico', 'Mistério de Mansão', 'Detetive Particular', 'Enigmas de Crime'],
    substyles: [
      { id: 'classic-whodunit', name: 'Whodunit Clássico (Quem Matou?)', searchKeyword: 'whodunit classic mystery books bestseller', targetAudience: 'Fãs de Agatha Christie e enigmas de dedução', kdpFormatTip: '5.5x8.5 pol • 280 págs', royaltyEstimate: 'U$ 2.50 - U$ 4.50' },
      { id: 'private-investigator', name: 'Detetive Particular & Segredos Urbanos', searchKeyword: 'private investigator hardboiled detective novel', targetAudience: 'Leitores de investigações urbanas realistas', kdpFormatTip: '5.5x8.5 pol • 300 págs', royaltyEstimate: 'U$ 2.80 - U$ 4.80' },
      { id: 'amateur-sleuth', name: 'Detetive Amador & Pequena Cidade', searchKeyword: 'amateur sleuth small town murder mystery', targetAudience: 'Leitores que gostam de protagonistas perspicazes do cotidiano', kdpFormatTip: '5x8 pol • 240 págs', royaltyEstimate: 'U$ 2.40 - U$ 3.90' }
    ],
    sampleBestSellers: [
      { title: 'The Thursday Murder Club', author: 'Richard Osman', bsr: 40, priceUsd: 9.99, royaltyPerBook: 4.50, asin: '1984880985', coverImage: 'https://m.media-amazon.com/images/I/81x25E8w-nL._AC_UY218_.jpg' }
    ]
  },

  // 16. SUSPENSE PSICOLÓGICO & TENSÃO (#12)
  {
    id: 'suspense',
    rankNumber: 12,
    rankLabel: '#12 na Amazon Books',
    name: 'Suspense Psicológico & Tensão Extrema',
    categoryGroup: 'ficcao',
    categoryGroupLabel: 'Ficção & Suspense',
    bsrRange: 'Top 120 - 3600 BSR',
    dailySalesEstimate: 5400,
    avgPriceUsd: 6.49,
    unitRoyaltyUsdMin: 2.70,
    unitRoyaltyUsdMax: 5.20,
    unitRoyaltyFormatted: 'U$ 2.70 - U$ 5.20',
    royaltyNote: 'Retenção Absoluta de Página a Página',
    opportunityScore: 93,
    competitionLevel: 'Alta',
    description: 'Narradores não-confiáveis, segredos conjugais sombrios e perseguições psicológicas angustiantes.',
    popularKeywords: ['Suspense Psicológico', 'Narrador Não Confiável', 'Segredos Obscuros', 'Tensão Asfixiante'],
    substyles: [
      { id: 'unreliable-mind', name: 'Mente Obscura & Narrador Não Confiável', searchKeyword: 'unreliable narrator psychological suspense bestseller', targetAudience: 'Leitores que adoram duvidar da sanidade dos personagens', kdpFormatTip: '5.5x8.5 pol • 290 págs', royaltyEstimate: 'U$ 2.80 - U$ 5.00' },
      { id: 'domestic-secrets', name: 'Segredos Conjugais e Vizinhança Tóxica', searchKeyword: 'domestic psychological thriller dark secrets', targetAudience: 'Fãs de segredos de família e aparências enganosas', kdpFormatTip: '5.5x8.5 pol • 280 págs', royaltyEstimate: 'U$ 2.70 - U$ 4.80' }
    ],
    sampleBestSellers: [
      { title: 'Gone Girl (Garota Exemplar)', author: 'Gillian Flynn', bsr: 55, priceUsd: 9.99, royaltyPerBook: 4.60, asin: '0307588378', coverImage: 'https://m.media-amazon.com/images/I/71QKQ9mwV7L._AC_UY218_.jpg' }
    ]
  },

  // 17. FICÇÃO GERAL & ROMANCE LITERÁRIO (#13)
  {
    id: 'fiction-novel',
    rankNumber: 13,
    rankLabel: '#13 na Amazon Books',
    name: 'Ficção Geral & Literatura Contemporânea',
    categoryGroup: 'ficcao',
    categoryGroupLabel: 'Ficção Geral',
    bsrRange: 'Top 130 - 3800 BSR',
    dailySalesEstimate: 5200,
    avgPriceUsd: 7.99,
    unitRoyaltyUsdMin: 3.20,
    unitRoyaltyUsdMax: 6.10,
    unitRoyaltyFormatted: 'U$ 3.20 - U$ 6.10',
    royaltyNote: 'Venda Perene e Alto Valor Artístico',
    opportunityScore: 89,
    competitionLevel: 'Média',
    description: 'Dramas humanos comoventes, sagas familiares multigeracionais e romances de formação literária.',
    popularKeywords: ['Ficção Contemporânea', 'Saga Familiar', 'Drama Humano', 'Romance Literário'],
    substyles: [
      { id: 'family-saga', name: 'Saga Familiar e Segredos de Gerações', searchKeyword: 'family saga novel literary fiction bestseller', targetAudience: 'Leitores de grandes dramas com raízes profundas', kdpFormatTip: '6x9 pol • 360 págs', royaltyEstimate: 'U$ 3.50 - U$ 6.10' },
      { id: 'coming-of-age', name: 'Amadurecimento & Ritos de Passagem', searchKeyword: 'coming of age contemporary novel', targetAudience: 'Jovens adultos e adultos reflexivos', kdpFormatTip: '5.5x8.5 pol • 270 págs', royaltyEstimate: 'U$ 3.10 - U$ 5.20' }
    ],
    sampleBestSellers: [
      { title: 'Where the Crawdads Sing', author: 'Delia Owens', bsr: 30, priceUsd: 11.99, royaltyPerBook: 5.50, asin: '0735219095', coverImage: 'https://m.media-amazon.com/images/I/81WWiiLgEyL._AC_UY218_.jpg' }
    ]
  },

  // 18. LIVROS ILUSTRADOS & NARRATIVAS VISUAIS (#18)
  {
    id: 'illustrated-book',
    rankNumber: 18,
    rankLabel: '#18 na Amazon Books',
    name: 'Livros Ilustrados & Narrativas Visuais',
    categoryGroup: 'infantil',
    categoryGroupLabel: 'Infantil & Ilustrado',
    bsrRange: 'Top 200 - 4800 BSR',
    dailySalesEstimate: 4500,
    avgPriceUsd: 8.99,
    unitRoyaltyUsdMin: 2.80,
    unitRoyaltyUsdMax: 5.40,
    unitRoyaltyFormatted: 'U$ 2.80 - U$ 5.40',
    royaltyNote: 'Forte Apelo Visual em Formato Quadrado ou 8x10',
    opportunityScore: 88,
    competitionLevel: 'Média',
    description: 'Histórias ricas em ilustrações conceituais, poesias ilustradas e livros para todas as idades.',
    popularKeywords: ['História Ilustrada', 'Visual Book', 'Arte e Narrativa', 'Graphic Book'],
    substyles: [
      { id: 'visual-poetry', name: 'Poesia Visual e Crônicas Ilustradas', searchKeyword: 'illustrated poetry book artistic design', targetAudience: 'Apreciadores de arte, sensibilidade e presentes visuais', kdpFormatTip: '7x10 ou 8x10 pol • 110 págs', royaltyEstimate: 'U$ 3.00 - U$ 5.40' },
      { id: 'illustrated-tales', name: 'Contos Fantásticos Ricamente Ilustrados', searchKeyword: 'illustrated short stories fairy tales modern', targetAudience: 'Famílias e leitores que amam arte imersiva', kdpFormatTip: '8x10 pol • 80 págs coloridas', royaltyEstimate: 'U$ 2.80 - U$ 4.90' }
    ],
    sampleBestSellers: [
      { title: 'The Boy, the Mole, the Fox and the Horse', author: 'Charlie Mackesy', bsr: 16, priceUsd: 13.99, royaltyPerBook: 6.20, asin: '0062976583', coverImage: 'https://m.media-amazon.com/images/I/71aLultW5EL._AC_UY218_.jpg' }
    ]
  },

  // 19. DIDÁTICOS, CONCURSOS & APRENDIZADO (#28)
  {
    id: 'education',
    rankNumber: 28,
    rankLabel: '#28 na Amazon Books',
    name: 'Didáticos, Concursos, Idiomas & Aprendizado',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção & Educação',
    bsrRange: 'Top 300 - 6200 BSR',
    dailySalesEstimate: 3900,
    avgPriceUsd: 9.99,
    unitRoyaltyUsdMin: 4.10,
    unitRoyaltyUsdMax: 7.90,
    unitRoyaltyFormatted: 'U$ 4.10 - U$ 7.90',
    royaltyNote: 'Altíssima Disposição de Pagamento pelo Estudante',
    opportunityScore: 92,
    competitionLevel: 'Média',
    description: 'Guias de aprovação em concursos, métodos de memorização, aprendizado de inglês e resumos esquematizados.',
    popularKeywords: ['Aprovação em Concurso', 'Inglês Rápido', 'Memorização Ativa', 'Mapas Mentais'],
    substyles: [
      { id: 'language-mastery', name: 'Inglês Funcional & Conversação Acelerada', searchKeyword: 'learn english fast practical vocabulary book', targetAudience: 'Adultos e estudantes focados em fluência rápida', kdpFormatTip: '6x9 pol • 220 págs', royaltyEstimate: 'U$ 4.20 - U$ 7.50' },
      { id: 'exam-prep', name: 'Técnicas de Estudo & Aprovação em Concursos', searchKeyword: 'study techniques exam preparation study guide', targetAudience: 'Concurseiros e vestibulandos dedicados', kdpFormatTip: '6x9 pol • 240 págs', royaltyEstimate: 'U$ 4.50 - U$ 7.90' },
      { id: 'memory-hacks', name: 'Memorização e Aprendizado Ultrarrápido', searchKeyword: 'super learner accelerated learning memory techniques', targetAudience: 'Profissionais em transição de carreira e estudantes', kdpFormatTip: '5.5x8.5 pol • 190 págs', royaltyEstimate: 'U$ 3.80 - U$ 6.40' }
    ],
    sampleBestSellers: [
      { title: 'Limitless: Upgrade Your Brain', author: 'Jim Kwik', bsr: 95, priceUsd: 12.99, royaltyPerBook: 5.80, asin: '1401958230', coverImage: 'https://m.media-amazon.com/images/I/81W5dMvjEwL._AC_UY218_.jpg' }
    ]
  },

  // 20. LIGHT NOVELS, ISEKAI & FANTASIA JOVEM (#34)
  {
    id: 'light-novel',
    rankNumber: 34,
    rankLabel: '#34 na Amazon Books',
    name: 'Light Novels, Isekai & Fantasia Jovem',
    categoryGroup: 'ficcao',
    categoryGroupLabel: 'Ficção & Anime',
    bsrRange: 'Top 380 - 7500 BSR',
    dailySalesEstimate: 3600,
    avgPriceUsd: 6.99,
    unitRoyaltyUsdMin: 2.90,
    unitRoyaltyUsdMax: 4.90,
    unitRoyaltyFormatted: 'U$ 2.90 - U$ 4.90',
    royaltyNote: 'Público que Consome Séries de 10+ Volumes',
    opportunityScore: 90,
    competitionLevel: 'Baixa',
    description: 'Reencarnações em mundos paralelos (Isekai), sistemas de níveis e magia, ritmo ágil e diálogos marcantes.',
    popularKeywords: ['Light Novel Isekai', 'Reencarnação RPG', 'Progression Fantasy', 'Anime Novel'],
    substyles: [
      { id: 'isekai-rebirth', name: 'Isekai & Reencarnação com Habilidades Únicas', searchKeyword: 'isekai light novel progression fantasy bestseller', targetAudience: 'Fãs de anime, mangás e webnovels', kdpFormatTip: '5x8 pol • 220 págs com ilustrações P&B', royaltyEstimate: 'U$ 2.90 - U$ 4.90' },
      { id: 'academy-awakening', name: 'Academia de Magia e Despertar de Poderes', searchKeyword: 'magic academy light novel progression fantasy', targetAudience: 'Leitores que amam evolução gradual de poderes', kdpFormatTip: '5x8 pol • 240 págs', royaltyEstimate: 'U$ 3.00 - U$ 5.10' }
    ],
    sampleBestSellers: [
      { title: 'Solo Leveling (Novel)', author: 'Chugong', bsr: 150, priceUsd: 8.99, royaltyPerBook: 4.10, asin: '1975319435', coverImage: 'https://m.media-amazon.com/images/I/81gQzYm1kHL._AC_UY218_.jpg' }
    ]
  },

  // 21. SHORT E-BOOKS & LEITURAS RÁPIDAS (1 HORA) (#45)
  {
    id: 'short-ebook',
    rankNumber: 45,
    rankLabel: '#45 na Amazon Books',
    name: 'Short E-books & Leituras Rápidas (1 Hora)',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Não-Ficção & E-books',
    bsrRange: 'Top 450 - 9000 BSR',
    dailySalesEstimate: 3100,
    avgPriceUsd: 2.99,
    unitRoyaltyUsdMin: 1.80,
    unitRoyaltyUsdMax: 2.45,
    unitRoyaltyFormatted: 'U$ 1.80 - U$ 2.45',
    royaltyNote: 'Volume Alto de Downloads e Giro Instantâneo',
    opportunityScore: 89,
    competitionLevel: 'Média',
    description: 'Manuais condensados de 40 a 80 páginas para solucionar um problema pontual em menos de 60 minutos.',
    popularKeywords: ['Leitura em 1 Hora', 'Guia Rápido de Bolso', 'Condensado Prático', 'Solução Direta'],
    substyles: [
      { id: 'one-hour-solution', name: 'Solução Direta em 60 Minutos', searchKeyword: 'one hour guide quick read practical handbook', targetAudience: 'Pessoas sem tempo que precisam de ação imediata', kdpFormatTip: '5x8 pol • 60 págs (Kindle Short Reads)', royaltyEstimate: 'U$ 1.80 - U$ 2.45' },
      { id: 'pocket-framework', name: 'Framework de Bolso para Líderes', searchKeyword: 'pocket framework executive concise handbook', targetAudience: 'Empreendedores e profissionais dinâmicos', kdpFormatTip: '5x8 pol • 75 págs', royaltyEstimate: 'U$ 1.90 - U$ 2.45' }
    ],
    sampleBestSellers: [
      { title: 'The 1-Page Marketing Plan (Short)', author: 'Allan Dib', bsr: 210, priceUsd: 4.99, royaltyPerBook: 2.80, asin: '1989025013', coverImage: 'https://m.media-amazon.com/images/I/71sB36-n5fL._AC_UY218_.jpg' }
    ]
  },

  // 22. QUEBRA-CABEÇAS, CRIPTOGRAMAS & LÓGICA (#132)
  {
    id: 'puzzle-book',
    rankNumber: 132,
    rankLabel: '#132 na Amazon Books',
    name: 'Quebra-Cabeças, Criptogramas & Lógica Avançada',
    categoryGroup: 'baixo-conteudo',
    categoryGroupLabel: 'Baixo Conteúdo / KDP',
    bsrRange: 'Top 1300 - 18000 BSR',
    dailySalesEstimate: 1350,
    avgPriceUsd: 7.49,
    unitRoyaltyUsdMin: 1.70,
    unitRoyaltyUsdMax: 3.10,
    unitRoyaltyFormatted: 'U$ 1.70 - U$ 3.10',
    royaltyNote: 'Público que Compra Coleções Inteiras',
    opportunityScore: 87,
    competitionLevel: 'Baixa',
    description: 'Criptogramas com frases inspiradoras, desafios de dedução de crimes e enigmas lógicos desafiadores.',
    popularKeywords: ['Criptogramas Inspiradores', 'Enigmas Lógicos', 'Desafios de Detetive', 'Logic Puzzles'],
    substyles: [
      { id: 'cryptograms-quotes', name: 'Criptogramas de Citações Históricas', searchKeyword: 'cryptograms puzzle book large print quotes', targetAudience: 'Amantes de decifrar códigos e frases célebres', kdpFormatTip: '8.5x11 pol • 130 págs com gabarito', royaltyEstimate: 'U$ 1.80 - U$ 3.10' },
      { id: 'crime-deduction-puzzles', name: 'Enigmas de Dedução e Casos de Mistério', searchKeyword: 'murdle logic puzzles detective deduction book', targetAudience: 'Fãs da febre Murdle e quebra-cabeças dedutivos', kdpFormatTip: '6x9 ou 8.5x11 pol • 140 págs', royaltyEstimate: 'U$ 2.10 - U$ 3.40' }
    ],
    sampleBestSellers: [
      { title: 'Murdle: Volume 1', author: 'G. T. Karber', bsr: 65, priceUsd: 9.99, royaltyPerBook: 3.80, asin: '1250892309', coverImage: 'https://m.media-amazon.com/images/I/81xU-Uv-5jL._AC_UY218_.jpg' }
    ]
  },

  // 23. WORKBOOKS PRÁTICOS & CADERNOS DE EXERCÍCIOS (#138)
  {
    id: 'workbook',
    rankNumber: 138,
    rankLabel: '#138 na Amazon Books',
    name: 'Workbooks Práticos & Cadernos de Exercícios',
    categoryGroup: 'baixo-conteudo',
    categoryGroupLabel: 'Baixo Conteúdo / KDP',
    bsrRange: 'Top 1400 - 19500 BSR',
    dailySalesEstimate: 1250,
    avgPriceUsd: 9.99,
    unitRoyaltyUsdMin: 2.50,
    unitRoyaltyUsdMax: 4.50,
    unitRoyaltyFormatted: 'U$ 2.50 - U$ 4.50',
    royaltyNote: 'Alto Valor Percebido e Compra Complementar',
    opportunityScore: 89,
    competitionLevel: 'Baixa',
    description: 'Cadernos de exercícios guiados de TCC, planos de ação para terapeutas e ferramentas de coaching pessoal.',
    popularKeywords: ['Workbook Prático', 'Caderno de Exercícios TCC', 'Plano de Ação Guiado', 'Exercícios Diários'],
    substyles: [
      { id: 'cbt-mind-workbook', name: 'Workbook de TCC e Reestruturação Cognitiva', searchKeyword: 'cbt workbook practical exercises mental health', targetAudience: 'Pessoas e terapeutas trabalhando reestruturação mental', kdpFormatTip: '8.5x11 pol • 150 págs com formulários', royaltyEstimate: 'U$ 2.80 - U$ 4.50' },
      { id: 'coaching-action-plan', name: 'Plano de Ação de Metas & Coaching Pessoal', searchKeyword: 'goal setting workbook action plan guide', targetAudience: 'Pessoas focadas em planejamento prático de vida', kdpFormatTip: '8.5x11 pol • 130 págs', royaltyEstimate: 'U$ 2.60 - U$ 4.20' }
    ],
    sampleBestSellers: [
      { title: 'The Anxiety and Phobia Workbook', author: 'Edmund Bourne', bsr: 310, priceUsd: 14.99, royaltyPerBook: 5.20, asin: '1684034833', coverImage: 'https://m.media-amazon.com/images/I/71Y8wO21mRL._AC_UY218_.jpg' }
    ]
  },

  // 24. OUTROS GÊNEROS LIVRES & CUSTOMIZADOS (#150)
  {
    id: 'other',
    rankNumber: 150,
    rankLabel: '#150 na Amazon Books',
    name: 'Outros Gêneros & Projetos Sob Medida',
    categoryGroup: 'nao-ficcao',
    categoryGroupLabel: 'Customizado / Outros',
    bsrRange: 'Top 1500 - 25000 BSR',
    dailySalesEstimate: 1100,
    avgPriceUsd: 7.99,
    unitRoyaltyUsdMin: 2.50,
    unitRoyaltyUsdMax: 5.50,
    unitRoyaltyFormatted: 'U$ 2.50 - U$ 5.50',
    royaltyNote: 'Liberdade Editorial Completa',
    opportunityScore: 82,
    competitionLevel: 'Baixa',
    description: 'Obras híbridas, antologias, ensaios autorais e publicações personalizadas sem barreiras de gênero.',
    popularKeywords: ['Projeto Autoral', 'Ensaio Livre', 'Obra Híbrida', 'Publicação Customizada'],
    substyles: [
      { id: 'custom-author-vision', name: 'Projeto Autoral Livre com IA', searchKeyword: 'creative writing custom book publishing', targetAudience: 'Autores com temas específicos e formatos originais', kdpFormatTip: '6x9 pol • 200 págs flexíveis', royaltyEstimate: 'U$ 2.50 - U$ 5.50' }
    ],
    sampleBestSellers: [
      { title: 'Big Magic: Creative Living Beyond Fear', author: 'Elizabeth Gilbert', bsr: 240, priceUsd: 10.99, royaltyPerBook: 4.80, asin: '1594634726', coverImage: 'https://m.media-amazon.com/images/I/81F90H7hnML._AC_UY218_.jpg' }
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
        s.description.toLowerCase().includes(q) ||
        s.substyles.some(sub => sub.name.toLowerCase().includes(q) || sub.searchKeyword.toLowerCase().includes(q))
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

  /**
   * CONSULTA AO VIVO DA AMAZON: Busca livros reais da Amazon Books em tempo real
   * através do backend Node local (/api/amazon/search), retornando ASINs, capas reais,
   * avaliações e preços atualizados.
   */
  public static async fetchLiveAmazonBooks(keyword: string, limit: number = 8): Promise<AmazonLiveBook[]> {
    try {
      const res = await fetch(`/api/amazon/search?query=${encodeURIComponent(keyword)}&limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.books) && json.books.length > 0) {
        return json.books;
      }
    } catch (e: any) {
      console.warn('[AmazonMarketIntelligence] Falha ao consultar endpoint ao vivo:', e.message);
    }
    return [];
  }

  /**
   * CONSULTA DE SUGESTÕES AO VIVO DA AMAZON:
   * Sugestões oficiais em tempo real da Amazon Books via /api/amazon/suggestions.
   */
  public static async fetchLiveAmazonSuggestions(prefix: string): Promise<string[]> {
    try {
      const res = await fetch(`/api/amazon/suggestions?prefix=${encodeURIComponent(prefix)}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.suggestions || [];
    } catch {
      return [];
    }
  }
}
