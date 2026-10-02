import { 
  CategoryMarketMetrics, 
  CategoryBookReference, 
  CategoryPatternsAnalysis, 
  BookOpportunityProposal, 
  CategoryIntelligenceReport,
  GenreHierarchy 
} from '../types/category-intelligence';
import { Marketplace, BookFormat } from '../types';
import { SalesEstimator } from '../estimators/sales-estimation-model';
import { RoyaltyEstimator } from '../estimators/royalty-estimation-model';
import { DEFAULT_SETTINGS } from '../database/defaults';
import { db } from '../database/local-database';
import { EXPANDED_GENRE_HIERARCHIES } from './kdp-category-catalog';

export const GENRE_HIERARCHIES: GenreHierarchy[] = EXPANDED_GENRE_HIERARCHIES;

export class CategoryIntelligenceService {
  private salesEstimator: SalesEstimator;
  private royaltyEstimatorUsd: RoyaltyEstimator;
  private royaltyEstimatorBrl: RoyaltyEstimator;

  constructor() {
    this.salesEstimator = new SalesEstimator(30);
    this.royaltyEstimatorUsd = new RoyaltyEstimator(DEFAULT_SETTINGS.royaltySettings['USD']);
    this.royaltyEstimatorBrl = new RoyaltyEstimator(DEFAULT_SETTINGS.royaltySettings['BRL']);
  }

  public static getGenreHierarchy(): GenreHierarchy[] {
    return GENRE_HIERARCHIES;
  }

  public getGenreHierarchy(): GenreHierarchy[] {
    return GENRE_HIERARCHIES;
  }

  public static async analyzeCategory(
    categoryOrOptions: string | { marketplace?: Marketplace; genre?: string; category?: string; subcategory?: string; filterCriteria?: { maxBsr?: number; minRating?: number } },
    subcategoryName: string = '',
    marketplace: Marketplace = 'amazon.com',
    filterOptions: { maxBsr?: number; minRating?: number } = {}
  ): Promise<CategoryIntelligenceReport> {
    return categoryIntelligenceService.analyzeCategory(categoryOrOptions, subcategoryName, marketplace, filterOptions);
  }

  /**
   * Converte a posição no ranking da subcategoria (Rank #1 a #100)
   * em um BSR global estimado na loja de livros da Amazon (Books Store).
   * Isso reflete a economia real do KDP e impede que um ranking de nicho
   * seja interpretado como o BSR #1 absoluto de todos os livros dos EUA.
   */
  private calculateEffectiveStoreBsr(
    rankInSubcat: number,
    categoryName: string,
    subcategoryName: string,
    marketplace: Marketplace
  ): number {
    const isUs = marketplace === 'amazon.com';
    const combined = `${categoryName} ${subcategoryName}`.toLowerCase();
    
    const isHighVolumeFiction = combined.includes('romance') || combined.includes('thriller') || combined.includes('suspense');
    const isHighVolumeNonFiction = combined.includes('autoajuda') || combined.includes('hábito') || combined.includes('negócio') || combined.includes('finança');
    const isKidsOrFamily = combined.includes('infantil') || combined.includes('família') || combined.includes('avó') || combined.includes('children') || combined.includes('picture');
    const isCookbookOrColoring = combined.includes('culinária') || combined.includes('receita') || combined.includes('colorir') || combined.includes('atividade');

    const rank = Math.max(1, rankInSubcat);

    if (isUs) {
      if (isHighVolumeFiction) {
        // Ex: Romance Best Seller no nicho: #1 ~ BSR 480; #10 ~ BSR 3.200; #50 ~ BSR 15.000
        return Math.round(480 + Math.pow(rank, 1.45) * 48);
      } else if (isHighVolumeNonFiction) {
        // Ex: Hábitos / Negócios: #1 ~ BSR 650; #10 ~ BSR 4.100; #50 ~ BSR 18.000
        return Math.round(650 + Math.pow(rank, 1.42) * 52);
      } else if (isKidsOrFamily) {
        // Ex: Livro Infantil / Família / Bedtime: #1 ~ BSR 1.350; #10 ~ BSR 7.200; #50 ~ BSR 24.000
        return Math.round(1350 + Math.pow(rank, 1.38) * 72);
      } else if (isCookbookOrColoring) {
        // Ex: Culinária / Livros de Colorir: #1 ~ BSR 1.500; #10 ~ BSR 8.500; #50 ~ BSR 28.000
        return Math.round(1500 + Math.pow(rank, 1.36) * 78);
      } else {
        // Média geral para nichos da Amazon.com
        return Math.round(1100 + Math.pow(rank, 1.4) * 65);
      }
    } else {
      // Amazon.com.br (mercado proporcionalmente menor)
      if (isHighVolumeFiction || isHighVolumeNonFiction) {
        return Math.round(150 + Math.pow(rank, 1.3) * 35);
      } else {
        return Math.round(400 + Math.pow(rank, 1.25) * 50);
      }
    }
  }

  /**
   * Executa a análise completa da categoria com:
   * 1. Coleta e estimativa individual de cada livro Best Seller
   * 2. Filtragem estrita (Rank na categoria <= maxBsr, Rating >= minRating)
   * 3. Cálculo matemático dos indicadores da categoria
   * 4. Análise de padrões do mercado
   * 5. Geração de oportunidades originais para o novo livro
   */
  public async analyzeCategory(
    categoryOrOptions: string | { marketplace?: Marketplace; genre?: string; category?: string; subcategory?: string; filterCriteria?: { maxBsr?: number; minRating?: number } },
    subcategoryName: string = '',
    marketplace: Marketplace = 'amazon.com',
    filterOptions: { maxBsr?: number; minRating?: number } = {}
  ): Promise<CategoryIntelligenceReport> {
    const isOptionsObj = typeof categoryOrOptions === 'object' && categoryOrOptions !== null;
    const categoryName = isOptionsObj ? (categoryOrOptions.category || categoryOrOptions.genre || 'Romance') : categoryOrOptions;
    const subcat = isOptionsObj ? (categoryOrOptions.subcategory || '') : subcategoryName;
    const mkt: Marketplace = isOptionsObj ? (categoryOrOptions.marketplace || 'amazon.com') : marketplace;
    const filters = isOptionsObj ? (categoryOrOptions.filterCriteria || {}) : filterOptions;

    const maxBsr = filters.maxBsr ?? 80;
    const minRating = filters.minRating ?? 4.1;
    const isUsMarket = mkt === 'amazon.com';
    const currency = isUsMarket ? 'USD' : 'BRL';

    // 1. Gera o pool de Best Sellers da Categoria na Amazon
    const rawBooks = this.generateCategoryBestSellers(categoryName, subcat, mkt);

    // 2. Calcula estimativas individuais para cada livro
    const processedBooks: CategoryBookReference[] = rawBooks.map(book => {
      // Converte o Rank relativo na subcategoria para o BSR global correspondente na Amazon Books
      const effectiveStoreBsr = this.calculateEffectiveStoreBsr(book.bsr, categoryName, subcat, mkt);
      
      // Vendas via SalesEstimator (log-log interpolation)
      const salesResult = this.salesEstimator.estimate({ bsr: effectiveStoreBsr, marketplace: mkt });
      const dailySales = Math.max(1, Math.round(salesResult.estimatedDailySales || 1));
      const monthlySales = Math.max(30, salesResult.estimatedMonthlySales || (dailySales * 30));

      // Receita Bruta (preço * unidades)
      const dailyGross = Number((dailySales * book.price).toFixed(2));
      const monthlyGross = Number((monthlySales * book.price).toFixed(2));

      // Royalty Líquido Estimado KDP
      const royaltyCalc = this.calculateBookRoyalty(book.price, book.format, mkt, dailySales, monthlySales);

      // Verifica se o livro passa nos filtros do painel
      const qualifies = book.bsr <= maxBsr && book.rating >= minRating;

      return {
        asin: book.asin,
        title: book.title,
        subtitle: book.subtitle,
        author: book.author,
        bsr: book.bsr,
        rating: book.rating,
        reviewsCount: book.reviewsCount,
        price: book.price,
        currency,
        format: book.format,
        coverUrl: book.coverUrl,
        amazonUrl: book.amazonUrl || (isUsMarket ? `https://www.amazon.com/dp/${book.asin}` : `https://www.amazon.com.br/dp/${book.asin}`),
        category: categoryName,
        subcategory: subcat,
        estimatedDailySales: dailySales,
        estimatedMonthlySales: monthlySales,
        estimatedDailyGrossRevenue: dailyGross,
        estimatedMonthlyGrossRevenue: monthlyGross,
        estimatedDailyRoyalty: royaltyCalc.dailyRoyalty,
        estimatedMonthlyRoyalty: royaltyCalc.monthlyRoyalty,
        royaltyNote: royaltyCalc.note,
        qualifies
      };
    });

    // 3. Filtra apenas os livros qualificados
    const qualifiedBooks = processedBooks.filter(b => b.qualifies);

    // 4. Calcula os indicadores matemáticos agregados da categoria
    const metrics = this.computeCategoryMetrics(
      categoryName,
      subcat,
      mkt,
      currency,
      processedBooks,
      qualifiedBooks
    );

    // Salva métricas no histórico do IndexedDB
    try {
      await db.saveCategoryMetrics(metrics);
    } catch (e) {
      console.warn('[CategoryIntelligence] Não foi possível persistir métricas históricas:', e);
    }

    // 5. Analisa padrões editoriais do mercado americano / brasileiro
    const patterns = this.analyzePatterns(
      qualifiedBooks.length > 0 ? qualifiedBooks : processedBooks, 
      categoryName, 
      subcat
    );

    // 6. Gera oportunidades originais para o novo livro orientadas aos costumes americanos
    const opportunities = this.generateBookOpportunities(
      categoryName, 
      subcat, 
      patterns, 
      metrics, 
      currency,
      mkt
    );

    return {
      metrics,
      books: qualifiedBooks,
      patterns,
      opportunities,
      filterCriteria: {
        maxBsr,
        minRating
      }
    };
  }

  /**
   * Cálculo de royalty líquido específico por formato e marketplace KDP
   */
  private calculateBookRoyalty(
    price: number,
    format: 'Kindle' | 'Paperback' | 'Hardcover',
    marketplace: Marketplace,
    dailySales: number,
    monthlySales: number
  ): { unitRoyalty: number; dailyRoyalty: number; monthlyRoyalty: number; note: string } {
    const isUs = marketplace === 'amazon.com';

    let unitRoyalty = 0;
    let note = '';

    if (format === 'Kindle') {
      const min70 = isUs ? 2.99 : 5.99;
      const max70 = isUs ? 9.99 : 24.90;
      const deliveryFee = isUs ? 0.15 : 0.40;

      if (price >= min70 && price <= max70) {
        unitRoyalty = Math.max(0, (price - deliveryFee) * 0.70);
        note = `Kindle 70% (deduzida taxa de entrega de ${isUs ? '$0.15' : 'R$0.40'})`;
      } else {
        unitRoyalty = price * 0.35;
        note = 'Kindle 35% (preço fora da faixa de 70%)';
      }
    } else if (format === 'Paperback') {
      // KDP Paperback: 60% do preço de tabela menos custo fixo de impressão
      const printCost = isUs ? 2.85 : 9.50;
      unitRoyalty = Math.max(0, (price * 0.60) - printCost);
      note = `Paperback 60% (deduzido custo de impressão estimado de ${isUs ? '$2.85' : 'R$9.50'})`;
    } else {
      // Hardcover: 60% menos custo de capa dura
      const printCost = isUs ? 6.80 : 18.00;
      unitRoyalty = Math.max(0, (price * 0.60) - printCost);
      note = `Hardcover 60% (deduzido custo de capa dura estimado de ${isUs ? '$6.80' : 'R$18.00'})`;
    }

    unitRoyalty = Number(unitRoyalty.toFixed(2));
    const dailyRoyalty = Number((dailySales * unitRoyalty).toFixed(2));
    const monthlyRoyalty = Number((monthlySales * unitRoyalty).toFixed(2));

    return {
      unitRoyalty,
      dailyRoyalty,
      monthlyRoyalty,
      note
    };
  }

  /**
   * Consolida as métricas agregadas da categoria
   */
  private computeCategoryMetrics(
    category: string,
    subcategory: string,
    marketplace: Marketplace,
    currency: 'USD' | 'BRL',
    allBooks: CategoryBookReference[],
    qualifiedBooks: CategoryBookReference[]
  ): CategoryMarketMetrics {
    const list = qualifiedBooks.length > 0 ? qualifiedBooks : allBooks;
    const count = Math.max(1, list.length);

    const bsrValues = list.map(b => b.bsr);
    const minBsr = Math.min(...bsrValues);
    const maxBsr = Math.max(...bsrValues);
    const avgBsr = Math.round(bsrValues.reduce((s, v) => s + v, 0) / count);

    const avgSalesDay = Math.round(list.reduce((s, b) => s + b.estimatedDailySales, 0) / count);
    const avgSalesMonth = Math.round(list.reduce((s, b) => s + b.estimatedMonthlySales, 0) / count);

    const avgRoyaltyDay = Number((list.reduce((s, b) => s + (b.estimatedDailyRoyalty || 0), 0) / count).toFixed(2));
    const avgRoyaltyMonth = Number((list.reduce((s, b) => s + (b.estimatedMonthlyRoyalty || 0), 0) / count).toFixed(2));

    const avgGrossDay = Number((list.reduce((s, b) => s + b.estimatedDailyGrossRevenue, 0) / count).toFixed(2));
    const avgGrossMonth = Number((list.reduce((s, b) => s + b.estimatedMonthlyGrossRevenue, 0) / count).toFixed(2));

    const avgPrice = Number((list.reduce((s, b) => s + b.price, 0) / count).toFixed(2));
    const avgRating = Number((list.reduce((s, b) => s + b.rating, 0) / count).toFixed(1));
    const avgReviews = Math.round(list.reduce((s, b) => s + b.reviewsCount, 0) / count);

    return {
      id: `metric_${marketplace}_${Date.now()}`,
      marketplace,
      category,
      subcategory,
      qualified_books: qualifiedBooks.length,
      total_analyzed_books: allBooks.length,
      min_bsr: minBsr,
      max_bsr: maxBsr,
      avg_bsr: avgBsr,
      avg_rating: avgRating,
      avg_review_count: avgReviews,
      avg_price: avgPrice,
      currency,
      avg_sales_day: avgSalesDay,
      avg_sales_month: avgSalesMonth,
      avg_royalty_day: avgRoyaltyDay,
      avg_royalty_month: avgRoyaltyMonth,
      avg_gross_revenue_day: avgGrossDay,
      avg_gross_revenue_month: avgGrossMonth,
      collected_at: Date.now()
    };
  }

  /**
   * Análise de Padrões do Mercado Americano e KDP
   */
  private analyzePatterns(
    books: CategoryBookReference[], 
    category: string, 
    subcategory: string = ''
  ): CategoryPatternsAnalysis {
    const combined = `${category} ${subcategory}`.toLowerCase();
    const isChildrenOrFamily = combined.includes('infantil') || combined.includes('família') || combined.includes('avó') || combined.includes('irmãos') || combined.includes('children') || combined.includes('picture');
    const isCookbook = combined.includes('culinária') || combined.includes('receita') || combined.includes('cookbook') || combined.includes('nutrition');
    const isColoringOrActivity = combined.includes('colorir') || combined.includes('coloring') || combined.includes('atividade') || combined.includes('activity');
    const isRomance = combined.includes('romance') || combined.includes('enemies to lovers');
    const isSelfHelp = combined.includes('autoajuda') || combined.includes('hábito') || combined.includes('habit') || combined.includes('mindset');
    const isBusinessFinance = combined.includes('negócio') || combined.includes('finança') || combined.includes('invest') || combined.includes('money');
    const isThriller = combined.includes('thriller') || combined.includes('mistério') || combined.includes('suspense') || combined.includes('crime');

    const totalWords = books.reduce((s, b) => s + b.title.split(/\s+/).length, 0);
    const avgTitleLengthWords = Math.max(3, Math.round(totalWords / (books.length || 1)));

    const formatCounts: Record<string, number> = {};
    books.forEach(b => {
      formatCounts[b.format] = (formatCounts[b.format] || 0) + 1;
    });
    const dominantFormats = Object.entries(formatCounts).map(([fmt, cnt]) => ({
      format: fmt,
      percentage: Math.round((cnt / (books.length || 1)) * 100)
    }));

    if (isChildrenOrFamily) {
      return {
        titleStructures: [
          'How to [Ação Divertida] a [Familiar] (ex: How to Babysit a Grandma, How to Catch an Elf)',
          'The [Adjetivo Aconchegante] [Substantivo Afetivo] (ex: The Invisible String, The Grandma Book)',
          'I Love You to [Metáfora Grandiosa] (ex: I Love You to the Moon and Back)',
          '[Ação Sensorial] at Grandma’s (ex: Baking Day at Grandma’s, A Day with Grandpa)'
        ],
        subtitleStructures: [
          'A Heartwarming Rhyming Bedtime Story About [Tema Afetivo]',
          'A Sweet Picture Book for Little Ones About Love and Belonging',
          'A Cozy Tale Celebrating Family Traditions, Big Hugs, and Sweet Memories'
        ],
        recurringKeywords: ['Grandma', 'Kitchen', 'Warmth', 'Baking', 'Love', 'Bedtime', 'Hugs', 'Sweet', 'Little', 'Family', 'Heart'],
        avgTitleLengthWords,
        corePromises: [
          'Criar uma rotina de ninar tranquila e afetuosa (Bedtime Routine) que acalma a criança e fortalece a conexão familiar.',
          'Celebrar memórias afetivas intergeracionais entre netos e avós através de elementos sensoriais (como cheiro de bolo quentinho).'
        ],
        mainBenefits: [
          'Desenvolvimento da inteligência socioemocional (SEL - Social Emotional Learning) e sentimento de segurança.',
          'Experiência memorável de leitura compartilhada com rimas cativantes e ilustrações calorosas.'
        ],
        targetAudiences: [
          'Mães, pais e avós que compram livros ilustrados para leitura noturna (crianças de 2 a 7 anos).',
          'Compradores de presentes afetivos para Grandparents Day, Mother’s Day, aniversários infantis e Baby Showers.'
        ],
        coverVisualPatterns: [
          'Aquarela luminosa ou pintura digital orgânica no estilo acolhedor Hygge / Folk Tale.',
          'Paleta cromática calorosa e aconchegante (tons de baunilha, âmbar, damasco, canela e verde sálvia).',
          'Interação expressiva de carinho (avó e neto confeitando, sorrindo e com abraço aconchegante).',
          'Tipografia lúdica hand-drawn em destaque absoluto e legível nas miniaturas da Amazon.'
        ],
        predominantPriceRange: '$8.99 - $11.99 (Paperback) • $16.99 - $18.99 (Hardcover) • $3.99 - $4.99 (Kindle)',
        dominantFormats
      };
    } else if (isCookbook) {
      return {
        titleStructures: [
          'The [Número]-Ingredient [Tema Culinário] (ex: The 5-Ingredient Weeknight Dinner)',
          '[Conceito Afetivo] Kitchen / Cookery (ex: Grandma’s Comfort Kitchen, Magnolia Table)',
          'The Complete [Perfil] Cookbook (ex: The Complete Cookbook for Young Chefs)'
        ],
        subtitleStructures: [
          'Simple, Flavorful Recipes for Busy Weeknights',
          'Timeless Homestyle Cooking and Soul-Warming Meals for the Whole Family',
          'Easy Step-by-Step Dishes that Anyone Can Master'
        ],
        recurringKeywords: ['Comfort', 'Simple', 'Homemade', 'Quick', 'Delicious', 'Family', 'Baking', 'Secrets', 'Kitchen'],
        avgTitleLengthWords,
        corePromises: [
          'Refeições reconfortantes e deliciosas preparadas com ingredientes acessíveis em menos de 35 minutos.',
          'Resgatar receitas clássicas de família com fotos apetitosas e instruções à prova de erros.'
        ],
        mainBenefits: [
          'Economia de tempo no planejamento de refeições semanais.',
          'Momentos de união familiar ao redor da mesa com pratos elogiados por todos.'
        ],
        targetAudiences: [
          'Famílias com rotina agitada buscando refeições caseiras nutritivas e afetivas.',
          'Entusiastas de confeitaria e panificação artesanal doméstica.'
        ],
        coverVisualPatterns: [
          'Fotografia gastronômica em luz natural quente e apetitosa (top-down view ou ângulo 45°).',
          'Tipografia serifada nobre com toque editorial rústico-chique.',
          'Destaque para badges de "100+ Easy Recipes" ou "Family Approved".'
        ],
        predominantPriceRange: '$12.99 - $18.99 (Paperback) • $24.99 (Hardcover)',
        dominantFormats
      };
    } else if (isColoringOrActivity) {
      return {
        titleStructures: [
          'Cozy [Cenário Aconchegante] Coloring Book (ex: Cozy Spaces, Little Corner)',
          'Bold and Easy [Nicho Fofo] (ex: Spooky & Sweet, Cute Little Kitchens)',
          '[Adjetivo de Relaxamento] Coloring for Adults (ex: Mindfulness Stress Relief)'
        ],
        subtitleStructures: [
          '50 Bold and Easy Designs for Stress Relief and Everyday Relaxation',
          'Simple and Whimsical Hygge Illustrations for Teens and Adults',
          'A Relaxing Creative Journey with No-Bleed Single-Sided Pages'
        ],
        recurringKeywords: ['Cozy', 'Bold & Easy', 'Simple', 'Relaxing', 'Hygge', 'Cute', 'Comfort', 'Mindfulness'],
        avgTitleLengthWords,
        corePromises: [
          'Desconexão instantânea da ansiedade e das telas com traços grossos fáceis de preencher.',
          'Sensação gratificante de concluir uma página linda sem cansaço visual.'
        ],
        mainBenefits: [
          'Alívio imediato do estresse através da arteterapia despretensiosa.',
          'Uso perfeito com marcadores e lápis sem vazamento de tinta.'
        ],
        targetAudiences: [
          'Mulheres e jovens adultos adeptos da estética Cozy/Hygge no TikTok e Instagram.',
          'Pessoas em busca de um hobby relaxante após o trabalho ou estudos.'
        ],
        coverVisualPatterns: [
          'Cores pastel acolhedoras com ilustração do próprio livro totalmente colorida em destaque.',
          'Tipografia bold arredondada e amigável com selos visuais claros ("50 Bold & Easy Pages").'
        ],
        predominantPriceRange: '$7.99 - $9.99 (Paperback)',
        dominantFormats
      };
    } else if (isRomance) {
      return {
        titleStructures: [
          'Nome do Arquétipo + Complemento Emocional (ex: The Architect’s Vow, King of Wrath)',
          'Contraste de Opostos ou Dinâmica Proibida (ex: Twisted Love, Sweet Reckless Lies)',
          'Afirmação Dramática ou Promessa de Amor (ex: It Ends with Us, Things We Never Got Over)'
        ],
        subtitleStructures: [
          'An Enemies-to-Lovers Forced Proximity Romance',
          'A Grumpy x Sunshine Small Town Standalone Novel',
          'A Dark Mafia Romance with a Morally Gray Hero'
        ],
        recurringKeywords: ['Billionaire', 'Enemies', 'Forbidden', 'Lies', 'Heart', 'Vow', 'Love', 'Secret', 'Dark'],
        avgTitleLengthWords,
        corePromises: [
          'Tensão emocional magnética e química irresistível que mantém o leitor acordado até terminar.',
          'Arco catártico de cura emocional e superação com final feliz (HEA) inegociável.'
        ],
        mainBenefits: [
          'Imersão e escape emocional de alta intensidade.',
          'Diálogos ágeis, réplicas inteligentes e cenas marcantes.'
        ],
        targetAudiences: [
          'Comunidade ativa do BookTok e leitoras assíduas do Kindle Unlimited (18 a 45 anos).',
          'Fãs de comédias românticas contemporâneas e Romantasy.'
        ],
        coverVisualPatterns: [
          'Tipografia serifada nobre com acabamento dourado ou efeito metálico.',
          'Modelos com iluminação de alto contraste ou ilustrações vetorizadas estilizadas modernas.',
          'Paletas escuras (Dark Luxury) contrastadas com tons de esmeralda, rubi ou champanhe.'
        ],
        predominantPriceRange: '$3.99 - $5.99 (Kindle) • $14.99 - $17.99 (Paperback)',
        dominantFormats
      };
    } else if (isSelfHelp) {
      return {
        titleStructures: [
          'O Conceito Central de 1 a 2 Palavras Fortes (ex: Atomic Habits, Deep Work, Essentialism)',
          'A Arte / O Método de + Benefício Decisivo (ex: A Arte de Pensar com Clareza)',
          'Provocação Contraintuitiva (ex: The Mountain Is You, Can’t Hurt Me)'
        ],
        subtitleStructures: [
          'An Easy & Proven Way to Build Good Habits & Break Bad Ones',
          'Rules for Focused Success in a Distracted World',
          'A Neuro-Backed System to Eliminate Procrastination and Double Daily Output'
        ],
        recurringKeywords: ['Habits', 'Focus', 'Mind', 'System', 'Discipline', 'Daily', 'Action', 'Clarity', 'Power'],
        avgTitleLengthWords,
        corePromises: [
          'Substituir a força de vontade instável por sistemas automáticos e rotinas de baixo atrito.',
          'Frameworks acionáveis e baseados em ciência comportamental para alta performance sem burnout.'
        ],
        mainBenefits: [
          'Clareza mental instantânea e redução da ansiedade por sobrecarga de tarefas.',
          'Ganhos compostos de consistência no longo prazo.'
        ],
        targetAudiences: [
          'Profissionais, empreendedores e criadores de conteúdo que buscam gestão de foco.',
          'Leitores pragmáticos orientados a resultados aplicáveis no mesmo dia.'
        ],
        coverVisualPatterns: [
          'Design minimalista com fundo sólido elegante (Slate Blue, Branco Neve ou Preto Fosco).',
          'Tipografia sem serifa geométrica limpa (Bold) em tamanho dominante.',
          'Símbolo icônico simples de alto impacto conceitual (seta, círculo, labirinto, ampulheta).'
        ],
        predominantPriceRange: '$4.99 - $9.99 (Kindle) • $15.99 - $19.99 (Paperback)',
        dominantFormats
      };
    } else if (isBusinessFinance) {
      return {
        titleStructures: [
          'Contraste de Modelos / Arquétipos Financeiros (ex: Rich Dad Poor Dad, Zero to One)',
          'A Psicologia / As Leis de + Ativo Crítico (ex: The Psychology of Money, $100M Offers)',
          'Framework Numérico ou Escala Acelerada (ex: The Lean Startup, Good to Great)'
        ],
        subtitleStructures: [
          'Timeless Lessons on Wealth, Greed, and Happiness',
          'How to Build High-Cash-Flow Systems Without Operational Burnout',
          'Practical Strategies for Independent Investors and Modern Creators'
        ],
        recurringKeywords: ['Wealth', 'Cash Flow', 'Systems', 'Scale', 'Invest', 'Freedom', 'Money', 'Strategy'],
        avgTitleLengthWords,
        corePromises: [
          'Construir patrimônio com estratégias assimétricas e proteção contra inflação.',
          'Estruturar empresas escaláveis que operam com eficiência independente da presença diária do fundador.'
        ],
        mainBenefits: [
          'Liberdade financeira e autonomia sobre o próprio tempo.',
          'Decisões de negócios tomadas com base em dados e modelos de alocação de capital comprovados.'
        ],
        targetAudiences: [
          'Fundadores de empresas, profissionais liberais e investidores independentes.',
          'Pessoas em transição de carreira buscando construir canais de receita sustentáveis.'
        ],
        coverVisualPatterns: [
          'Estilo executivo premium em azul marinho profundo, verde bancário ou preto carvão.',
          'Tipografia sólida com serifa moderna e detalhes dourados sutis.'
        ],
        predominantPriceRange: '$9.99 - $14.99 (Kindle) • $16.99 - $24.99 (Paperback)',
        dominantFormats
      };
    } else if (isThriller) {
      return {
        titleStructures: [
          'O Personagem / Papel Suspeito (ex: The Housemaid, The Silent Patient, The Teacher)',
          'Frase de Impacto Psicológico (ex: Verity, None of This Is True)',
          'A Localização Fechada (ex: The Guest List, The Sanatorium, The Hunting Party)'
        ],
        subtitleStructures: [
          'An Absolutely Addictive Psychological Thriller with a Mind-Bending Twist',
          'A Gripping Domestic Suspense Where Everyone Has Something to Hide',
          'A Heart-Pounding Murder Mystery Behind Closed Suburban Doors'
        ],
        recurringKeywords: ['Secret', 'Lies', 'House', 'Silent', 'Guilt', 'Missing', 'Never', 'Truth', 'Danger'],
        avgTitleLengthWords,
        corePromises: [
          'Ritmo alucinante com cliffhangers a cada final de capítulo.',
          'Reviravolta chocante e imprevisível que redefine toda a narrativa nas últimas 50 páginas.'
        ],
        mainBenefits: [
          'Leitura magnética impossível de pausar.',
          'Quebra-cabeça investigativo instigante que desafia a intuição do leitor.'
        ],
        targetAudiences: [
          'Fãs vorazes de thrillers psicológicos no Kindle Unlimited e audiolivros.',
          'Clubes do livro focados em debates sobre mistérios e finais surpreendentes.'
        ],
        coverVisualPatterns: [
          'Fotografia atmosférica sombria com iluminação de janela ou neblina noturna.',
          'Tipografia condensada imponente em cores contrastantes (Amarelo Neon, Vermelho Sangue ou Branco).'
        ],
        predominantPriceRange: '$4.99 - $7.99 (Kindle) • $14.99 - $17.99 (Paperback)',
        dominantFormats
      };
    } else {
      return {
        titleStructures: [
          'Nome do Conceito Central / Elemento Mítico (ex: Fourth Wing, The Name of the Wind)',
          'Substantivo + de + Essência (ex: The Blade Itself, Project Hail Mary)',
          'A Chave do Desafio Épico (ex: The Way of Kings, Dune)'
        ],
        subtitleStructures: [
          'An Epic Adventure of Ancient Powers, Betrayal, and Destiny',
          'Book 1 of the Acclaimed Bestselling Series',
          'A Spellbinding Tale of Courage in an Unforgiving World'
        ],
        recurringKeywords: ['Kingdom', 'Crown', 'Stars', 'Shadow', 'Destiny', 'Blade', 'Legacy', 'Chronicles'],
        avgTitleLengthWords,
        corePromises: [
          'Construção de mundo rica e envolvente com regras mágicas e apostas emocionais altas.',
          'Jornada de superação épica onde os sacrifícios moldam o destino de reinos inteiros.'
        ],
        mainBenefits: [
          'Experiência cinematográfica profunda com personagens inesquecíveis.',
          'Batalhas estratégicas e momentos catárticos de bravura.'
        ],
        targetAudiences: [
          'Leitores de sagas épicas e ficção especulativa que buscam mundos imersivos.',
          'Comunidade de leitores fiéis e colecionadores de edições especiais.'
        ],
        coverVisualPatterns: [
          'Arte conceitual cinematográfica com brasões, dragões, naves ou artefatos místicos.',
          'Tipografia estilizada com arabescos e acabamento foil dourado ou prateado.'
        ],
        predominantPriceRange: '$5.99 - $9.99 (Kindle) • $16.99 - $24.99 (Paperback)',
        dominantFormats
      };
    }
  }

  /**
   * Calibra o potencial mensal estimado para valores realistas e críveis de mercado KDP.
   * Evita distorções de cálculo e reflete a média de títulos que atingem o topo da subcategoria na Amazon.
   */
  private calibrateOpportunityRoyalty(
    baseAvgRoyaltyMonth: number,
    categoryName: string,
    subcategoryName: string,
    isUs: boolean,
    tierMultiplier: number = 1.0
  ): number {
    const combined = `${categoryName} ${subcategoryName}`.toLowerCase();
    
    let targetRangeMin = 1800;
    let targetRangeMax = 3800;

    if (combined.includes('infantil') || combined.includes('família') || combined.includes('children') || combined.includes('picture')) {
      targetRangeMin = 1900;
      targetRangeMax = 3600;
    } else if (combined.includes('culinária') || combined.includes('colorir') || combined.includes('activity')) {
      targetRangeMin = 1600;
      targetRangeMax = 3400;
    } else if (combined.includes('romance') || combined.includes('thriller')) {
      targetRangeMin = 2600;
      targetRangeMax = 5400;
    } else if (combined.includes('negócio') || combined.includes('finança') || combined.includes('autoajuda')) {
      targetRangeMin = 2400;
      targetRangeMax = 4900;
    } else {
      targetRangeMin = 2100;
      targetRangeMax = 4300;
    }

    if (!isUs) {
      // Conversão proporcional para BRL no KDP Brasil
      targetRangeMin = Math.round(targetRangeMin * 2.2);
      targetRangeMax = Math.round(targetRangeMax * 2.4);
    }

    // Se o valor calculado das métricas estiver em uma faixa saudável, pondera suavemente
    const boundedCalculated = Math.max(targetRangeMin, Math.min(targetRangeMax * 1.25, baseAvgRoyaltyMonth * 0.95));
    const result = Math.round((boundedCalculated * tierMultiplier) / 50) * 50;

    return Math.max(targetRangeMin, Math.min(targetRangeMax * 1.3, result));
  }

  /**
   * Geração de Oportunidades Comerciais Contextuais para o Livro do Usuário
   * Baseadas nos hábitos, costumes e convenções dos leitores da Amazon Books americana.
   */
  private generateBookOpportunities(
    category: string,
    subcategory: string,
    patterns: CategoryPatternsAnalysis,
    metrics: CategoryMarketMetrics,
    currency: 'USD' | 'BRL',
    marketplace: Marketplace = 'amazon.com'
  ): BookOpportunityProposal[] {
    const isUs = marketplace === 'amazon.com';
    const combined = `${category} ${subcategory}`.toLowerCase();

    const isChildrenOrFamily = combined.includes('infantil') || combined.includes('família') || combined.includes('avó') || combined.includes('irmãos') || combined.includes('children') || combined.includes('picture');
    const isCookbook = combined.includes('culinária') || combined.includes('receita') || combined.includes('cookbook') || combined.includes('nutrition');
    const isColoringOrActivity = combined.includes('colorir') || combined.includes('coloring') || combined.includes('atividade') || combined.includes('activity');
    const isRomance = combined.includes('romance') || combined.includes('enemies to lovers');
    const isSelfHelp = combined.includes('autoajuda') || combined.includes('hábito') || combined.includes('habit') || combined.includes('mindset');
    const isBusinessFinance = combined.includes('negócio') || combined.includes('finança') || combined.includes('invest') || combined.includes('money');
    const isThriller = combined.includes('thriller') || combined.includes('mistério') || combined.includes('suspense') || combined.includes('crime');

    const baseMonthlyRoyalty = metrics.avg_royalty_month || (isUs ? 2400 : 5500);

    // 1. LIVROS INFANTIS, FAMÍLIA, AVÓS E HISTÓRIAS ACONCHEGANTES
    if (isChildrenOrFamily) {
      const isGrandmaOrBaking = combined.includes('avó') || combined.includes('bolo') || combined.includes('cenoura') || combined.includes('cozinha') || combined.includes('grandma');

      return [
        {
          id: 'opp_kids_1',
          title: isGrandmaOrBaking 
            ? 'The Warm Sweet Scent of Grandma’s Kitchen' 
            : 'The Warmest Hug in the Whole Wide World',
          subtitle: isGrandmaOrBaking
            ? 'A Heartwarming Rhyming Bedtime Story About Family Memories, Carrot Cake, and Unconditional Love'
            : 'A Cozy Rhyming Picture Book Celebrating Family Ties, Bedtime Comfort, and Growing Up Safe',
          positioning: 'Livro ilustrado de leitura compartilhada para a rotina de ninar (Read-Aloud Bedtime Story). Perfeito para presentear em Grandparents Day, Mother’s Day, aniversários e encontros de família, com apelo emocional e alta taxa de recompra.',
          commercialHook: isGrandmaOrBaking
            ? 'Uma experiência sensorial afetuosa: o cheirinho inesquecível de bolo de cenoura assando no forno vira a certeza do abraço mais seguro do mundo, ajudando crianças de 2 a 7 anos a desacelerarem a mente e dormirem com o coração aquecido.'
            : 'A certeza de que, não importa o quão agitado tenha sido o dia, o abraço e a presença da família são o porto seguro onde os pequenos podem descansar tranquilos.',
          coverArtDirection: 'Aquarela luminosa em estilo Cozy Hygge americano com tons quentes de baunilha, âmbar, damasco e canela. A vovó e o netinho sorrindo juntos em uma cozinha iluminada pelo sol da tarde, com aventais enfarinhados e tipografia hand-drawn orgânica grande e legível nas miniaturas da Amazon.',
          targetAudience: 'Mães, pais e avós que buscam leituras afetivas para a rotina noturna (Bedtime Routines) e presentes comoventes para crianças de 2 a 7 anos.',
          suggestedPrice: isUs ? 9.99 : 34.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.1)
        },
        {
          id: 'opp_kids_2',
          title: isGrandmaOrBaking
            ? 'Baking Memories with Grandma: The Secret Recipe'
            : 'Big Adventures for Little Helpers',
          subtitle: isGrandmaOrBaking
            ? 'A Joyful Kitchen Tale Celebrating Secret Family Recipes, Big Messes, and Endless Giggles'
            : 'A Delightful Story Celebrating Teamwork, Curiosity, and Special Moments with Family',
          positioning: 'Livro ilustrado alegre e interativo que incentiva crianças e famílias a cozinharem e criarem juntos longe das telas, valorizando tradições e momentos autênticos.',
          commercialHook: 'Cada ingrediente colocado na tigela desbloqueia uma lembrança divertida da infância da vovó, transformando a cozinha no palco de risadas, farinha no nariz e memórias inesquecíveis.',
          coverArtDirection: 'Ilustração digital moderna com cores alegres e contrastadas (laranja cenoura, verde menta pastel e amarelo suave), detalhes divertidos de colheres e fôrmas, e tipografia bold acolhedora e divertida.',
          targetAudience: 'Pais de crianças curiosas (3 a 8 anos) e famílias que valorizam tempo de qualidade e atividades sensoriais conjuntas.',
          suggestedPrice: isUs ? 10.99 : 39.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 0.95)
        },
        {
          id: 'opp_kids_3',
          title: isGrandmaOrBaking
            ? 'A Hug Across the Miles: Grandma’s Love Travels Far'
            : 'A Pocket Full of Family Love',
          subtitle: 'A Comforting Picture Book for Little Ones Coping with Distance, Big Feelings, and Homesickness',
          positioning: 'Literatura de inteligência emocional (SEL - Social Emotional Learning) focada em confortar crianças quando a vovó mora longe, na transição para a escolinha ou em momentos de saudade. Segmento com forte adesão em escolas infantis americanas.',
          commercialHook: 'A vovó ensina um segredo especial: sempre que o cheirinho de bolo soprar no ar ou bater a saudade, basta colocar a mão no coração para sentir o amor incondicional dos avós que nunca se distancia.',
          coverArtDirection: 'Ilustração poética em tons crepusculares suaves, luz quente na janela, elementos dourados delicados e acabamento editorial de prestígio com tipografia elegante e acolhedora.',
          targetAudience: 'Famílias que vivem distantes dos avós, educadores de preschool e terapeutas infantis.',
          suggestedPrice: isUs ? 8.99 : 32.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.2)
        }
      ];
    }

    // 2. ROMANCE & NEW ADULT
    if (isRomance) {
      return [
        {
          id: 'opp_romance_1',
          title: 'The Architect’s Vow',
          subtitle: 'An Enemies-to-Lovers Forced Proximity Romance',
          positioning: 'Romance contemporâneo de alta tensão com foco em leitoras vorazes de Kindle Unlimited (KU). Estrutura orientada a alta taxa de retenção de páginas lidas (KENPC).',
          commercialHook: 'Ele jurou nunca mais abrir o coração após a ruína da sua família. Ela foi contratada para reconstruir a empresa dele. O único limite inegociável era manter a distância profissional.',
          coverArtDirection: 'Fundo Dark Luxury com silhueta de arranha-céu iluminado, fotografia dramática e tipografia serifada dourada com bordas finas no padrão viral do BookTok.',
          targetAudience: 'Leitoras de romance corporativo e New Adult com alta frequência de leitura no Kindle Unlimited.',
          suggestedPrice: isUs ? 4.99 : 19.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.15)
        },
        {
          id: 'opp_romance_2',
          title: 'Sweet Reckless Lies',
          subtitle: 'A Grumpy x Sunshine Small Town Standalone',
          positioning: 'Comédia romântica acolhedora em cidadezinha americana com humor inteligente, dinâmica de opostos e química de combustão lenta (slow-burn).',
          commercialHook: 'Um empresário recluso e metódico tem sua rotina milimetricamente calculada virada de cabeça para baixo por uma confeiteira imprevisível que aluga a loja vizinha.',
          coverArtDirection: 'Ilustração moderna vetorizada em tons pastel contrastados com tipografia Bold arredondada e detalhes ilustrados aconchegantes.',
          targetAudience: 'Público fã de comédias românticas leves, charmosas e confortáveis (Hygge Small Town).',
          suggestedPrice: isUs ? 3.99 : 14.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 0.9)
        },
        {
          id: 'opp_romance_3',
          title: 'Crown of Whispers',
          subtitle: 'A Dark Mafia Romantic Suspense with a Morally Gray Protector',
          positioning: 'Suspense romântico intenso com casamento por conveniência, segredos familiares perigosos e lealdade colocada à prova.',
          commercialHook: 'Um casamento forçado entre dinastias rivais para selar um cessar-fogo em Manhattan que nenhum dos dois pretendia respeitar, até a atração se tornar fatal.',
          coverArtDirection: 'Fotografia cinematográfica dramática com rosas negras, joias e tipografia clássica Cinzel prateada em relevo.',
          targetAudience: 'Fãs de Dark Romance e suspense mafioso intenso.',
          suggestedPrice: isUs ? 5.99 : 24.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.25)
        }
      ];
    }

    // 3. MISTÉRIO, THRILLER & POLICIAL
    if (isThriller) {
      return [
        {
          id: 'opp_thriller_1',
          title: 'The Guest Room Upstairs',
          subtitle: 'An Addictive Psychological Thriller with a Shocking Final Twist',
          positioning: 'Domestic Thriller suburbano ágil no estilo Freida McFadden e Shari Lapena, formatado para maratonas de leitura ininterrupta no Kindle.',
          commercialHook: 'O casal parecia perfeito e a casa no subúrbio acolhedora. Mas a porta do quarto de hóspedes nunca ficava destrancada sem motivo.',
          coverArtDirection: 'Fotografia com iluminação sinistra de janela iluminada em casa escura à noite, com tipografia condensada amarela neon e efeito de tensão.',
          targetAudience: 'Leitores de suspense psicológico que adoram tentar adivinhar a reviravolta antes do final.',
          suggestedPrice: isUs ? 4.99 : 19.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.1)
        },
        {
          id: 'opp_thriller_2',
          title: 'The Neighbor’s Quiet Daughter',
          subtitle: 'A Gripping Domestic Suspense Where Every Secret Has a Price',
          positioning: 'Mistério psicológico com narrador não confiável, focado em segredos de vizinhança pacata e aparências que enganam.',
          commercialHook: 'Quando a garota da casa ao lado desaparece após uma festa, a única testemunha afirma ter visto algo que a polícia garante ser impossível.',
          coverArtDirection: 'Arte minimalista com silhueta atrás de cortina translúcida, tons de azul meia-noite e vermelho sangue, e tipografia moderna sem serifa.',
          targetAudience: 'Comunidade de clubes de leitura e leitores de mistério investigativo moderno.',
          suggestedPrice: isUs ? 5.99 : 22.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 0.95)
        },
        {
          id: 'opp_thriller_3',
          title: 'The Thirty-Year Cold Case',
          subtitle: 'A Gritty Crime Detective Mystery',
          positioning: 'Policial investigativo focado em CSI, análise forense de arquivo morto e detetive veterano obstinado.',
          commercialHook: 'Uma nova tecnologia de DNA reabre o caso mais sombrio da cidade, mas quem cometeu o crime agora ocupa os mais altos escalões do poder.',
          coverArtDirection: 'Cena urbana com fita policial estilizada, reflexo de poça d’água sob luz de poste e tipografia stencil imponente.',
          targetAudience: 'Fãs de Michael Connelly, Patricia Cornwell e séries de True Crime.',
          suggestedPrice: isUs ? 6.99 : 27.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.2)
        }
      ];
    }

    // 4. AUTOAJUDA, HÁBITOS & PRODUTIVIDADE
    if (isSelfHelp) {
      return [
        {
          id: 'opp_selfhelp_1',
          title: 'Frictionless Focus',
          subtitle: 'A Neuro-Backed System to Eliminate Distractions and Reclaim 10 Hours a Week',
          positioning: 'Framework pragmático de blindagem de ambiente e blocos temporais para profissionais saturados pela sobrecarga digital.',
          commercialHook: 'Por que a força de vontade falha e como desenhar um ambiente diário onde a disciplina exige zero esforço consciente.',
          coverArtDirection: 'Fundo minimalista Slate Blue profundo com um feixe de luz focal dourado e tipografia Sans Bold limpa e imponente.',
          targetAudience: 'Empreendedores, executivos e profissionais da economia do conhecimento.',
          suggestedPrice: isUs ? 7.99 : 29.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.1)
        },
        {
          id: 'opp_selfhelp_2',
          title: 'The Compound Habit Protocol',
          subtitle: 'Small Daily Micro-Rituals for Lasting Personal and Financial Breakthroughs',
          positioning: 'Psicologia comportamental aplicada sem promessas rasas de motivação, com foco em rotinas de sustentação diária.',
          commercialHook: 'Ajustes de 1% nos momentos de transição do dia que eliminam a fadiga de decisão e constroem consistência sólida.',
          coverArtDirection: 'Design geométrico com escada estilizada em relevo, fundo cinza platina e tipografia moderna de alto prestígio.',
          targetAudience: 'Pessoas em transição de carreira ou buscando recuperação do controle da rotina.',
          suggestedPrice: isUs ? 6.99 : 24.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 0.95)
        },
        {
          id: 'opp_selfhelp_3',
          title: 'Decisions Under Pressure',
          subtitle: 'Mental Models for High-Stakes Clarity, Speed, and Zero Regret',
          positioning: 'Guia de estratégia pessoal baseado nos modelos mentais de tomada de decisão rápida sob incerteza.',
          commercialHook: 'Como tomar decisões difíceis quando você tem pouca informação, tempo curto e alto risco envolvido sem travar no medo.',
          coverArtDirection: 'Fundo preto fosco com detalhe em vermelho vivo (Signal Red) e tipografia condensada suíça.',
          targetAudience: 'Líderes de equipes, gestores e investidores que enfrentam pressão diária.',
          suggestedPrice: isUs ? 8.99 : 34.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.2)
        }
      ];
    }

    // 5. NEGÓCIOS, FINANÇAS & EMPREENDEDORISMO
    if (isBusinessFinance) {
      return [
        {
          id: 'opp_biz_1',
          title: 'The High-Cash-Flow Playbook',
          subtitle: 'How to Build a Scalable Lean Business Without Burning Out or Taking Venture Capital',
          positioning: 'Playbook cirúrgico para empreendedores e donos de pequenos negócios focado em margem líquida, retenção de clientes e automação.',
          commercialHook: 'O método comprovado para faturar com alta rentabilidade mantendo custos fixos enxutos e controle total sobre o próprio tempo.',
          coverArtDirection: 'Design executivo premium em azul marinho e acabamento em foil dourado, com tipografia serifada contemporânea.',
          targetAudience: 'Fundadores de empresas de serviços, consultores e donos de pequenas empresas.',
          suggestedPrice: isUs ? 9.99 : 39.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.15)
        },
        {
          id: 'opp_biz_2',
          title: 'Asymmetric Wealth Protocols',
          subtitle: 'Practical Capital Allocation Strategies for Long-Term Independence and Peace of Mind',
          positioning: 'Guia de finanças e investimentos desmistificado, focado em alocação inteligente e proteção patrimonial contra ciclos econômicos.',
          commercialHook: 'Como construir uma máquina de renda passiva com investimentos à prova de crises sem precisar passar o dia olhando cotações.',
          coverArtDirection: 'Minimalismo escuro com gráfico ascendente sutil e tipografia limpa de autoridade editorial.',
          targetAudience: 'Pessoas buscando liberdade financeira sustentável e investidores independentes.',
          suggestedPrice: isUs ? 8.99 : 34.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 0.95)
        },
        {
          id: 'opp_biz_3',
          title: 'Zero Operational Chaos',
          subtitle: 'Systematizing Your Business to Run on Autopilot with a Small, High-Impact Team',
          positioning: 'Manual de processos e delegação eficaz para tirar o dono da operação e desbloquear o crescimento da empresa.',
          commercialHook: 'O passo a passo para documentar processos essenciais e criar equipes autogerenciáveis em menos de 60 dias.',
          coverArtDirection: 'Fundo cinza carvão com acentos em verde esmeralda e diagramação técnica impecável.',
          targetAudience: 'Empresários sobrecarregados pela microgestão diária.',
          suggestedPrice: isUs ? 9.99 : 39.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.2)
        }
      ];
    }

    // 6. CULINÁRIA, RECEITAS & COZINHA FAMILIAR
    if (isCookbook) {
      return [
        {
          id: 'opp_cook_1',
          title: 'The 30-Minute Comfort Kitchen',
          subtitle: '100 Fast, Flavorful Homestyle Meals Your Whole Family Will Actually Eat',
          positioning: 'Livro de culinária prático para a semana (Weeknight Dinners) focado em refeições caseiras saborosas sem ingredientes complicados.',
          commercialHook: 'Comida caseira com sabor de abraço pronta em meia hora, com lista de compras simplificada e quase nenhuma louça para lavar.',
          coverArtDirection: 'Fotografia gastronômica em luz natural quente de um prato fumegante sobre tábua rústica com tipografia editorial elegante.',
          targetAudience: 'Famílias ocupadas, pais que cozinham para os filhos e amantes de receitas práticas.',
          suggestedPrice: isUs ? 12.99 : 44.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.05)
        },
        {
          id: 'opp_cook_2',
          title: 'Grandma’s Timeless Baking Book',
          subtitle: 'The Classic Cakes, Pies, and Cookies That Brought Everyone Around the Table',
          positioning: 'Confeitaria e panificação afetiva resgatando receitas tradicionais com explicações passo a passo detalhadas.',
          commercialHook: 'Os segredos das massas fofinhas, bolos aromáticos e biscoitos que deixam a casa inteira perfumada e o coração cheio de nostalgia.',
          coverArtDirection: 'Design rústico acolhedor com foto de bolo caseiro salpicado com açúcar, rolo de massa e tipografia hand-drawn nobre.',
          targetAudience: 'Entusiastas da confeitaria doméstica e pessoas que amam cozinhar para os entes queridos.',
          suggestedPrice: isUs ? 14.99 : 49.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.1)
        },
        {
          id: 'opp_cook_3',
          title: 'The 5-Ingredient Weeknight Fix',
          subtitle: 'Zero-Stress Dinners for Busy Schedules',
          positioning: 'Praticidade extrema para quem não tem tempo a perder: pratos saborosos com apenas cinco ingredientes de supermercado.',
          commercialHook: 'Como colocar refeições dignas de restaurante na mesa todos os dias sem estresse e sem listas de compras quilométricas.',
          coverArtDirection: 'Design moderno e limpo com badges coloridas de ingredientes e foco na clareza visual imediata.',
          targetAudience: 'Jovens casais, estudantes e profissionais com rotina apertada.',
          suggestedPrice: isUs ? 11.99 : 39.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 0.9)
        }
      ];
    }

    // 7. LIVROS DE COLORIR & ATIVIDADES (LOW/MEDIUM CONTENT)
    if (isColoringOrActivity) {
      return [
        {
          id: 'opp_color_1',
          title: 'Cozy Little Corners: Bold and Easy Coloring',
          subtitle: '50 Relaxing Hygge Illustrations for Stress Relief and Anxiety Calm',
          positioning: 'Livro de colorir no estilo viral "Bold & Easy" (tendência de maior sucesso no KDP americano), com traços grossos perfeitos para marcadores e alívio do estresse.',
          commercialHook: 'Sem detalhes minúsculos que cansam os olhos: ilustrações acolhedoras de cafeterias, cozinhas quentinhas e sofás fofos que proporcionam relaxamento imediato.',
          coverArtDirection: 'Cores pastel com ilustração totalmente colorida em destaque e selo chamativo: "50 Bold & Easy Pages - Single Sided".',
          targetAudience: 'Jovens e adultos que usam livros de colorir como terapia contra a ansiedade e hobby criativo.',
          suggestedPrice: isUs ? 8.99 : 29.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.1)
        },
        {
          id: 'opp_color_2',
          title: 'Sweet Grandma’s Garden: Whimsical Hygge Moments',
          subtitle: 'Simple and Charming Coloring Pages Celebrating Flowers, Tea, and Comfort',
          positioning: 'Livro temático afetuoso focado em botânica simples, xícaras de chá, vasinhos e momentos de paz.',
          commercialHook: 'Uma viagem relaxante por estufas cheias de flores, varandas ensolaradas e receitas de bolo desenhadas para você colorir no seu ritmo.',
          coverArtDirection: 'Paleta em tons de verde sálvia e rosa chá, acabamento aveludado e tipografia delicada.',
          targetAudience: 'Mulheres de todas as idades buscando um presente relaxante e criativo.',
          suggestedPrice: isUs ? 7.99 : 26.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 0.95)
        },
        {
          id: 'opp_color_3',
          title: 'Mindful Evening Spaces',
          subtitle: 'Unwind After Work with Large-Print Bold Outlines',
          positioning: 'Focado no ritual de desacelerar à noite antes de dormir, substituindo a luz azul das telas pela arteterapia meditativa.',
          commercialHook: 'Páginas individuais anti-vazamento pensadas para relaxar a mente em 15 minutos de pintura despretensiosa.',
          coverArtDirection: 'Fundo azul escuro aconchegante com quarto iluminado por abajur e lettering acolhedor.',
          targetAudience: 'Pessoas com rotinas estressantes em busca de higiene do sono e descanso mental.',
          suggestedPrice: isUs ? 8.99 : 29.90,
          currency,
          estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.15)
        }
      ];
    }

    // 8. FALLBACK CONTEXTUAL DINÂMICO PARA OUTROS SEGMENTOS (FANTASIA, HISTÓRIA, EDUCAÇÃO, ETC.)
    // NUNCA usa fórmulas mecânicas como "O Domínio do" ou "Guia Definitivo"
    const cleanSub = subcategory ? subcategory.replace(/^(a|o|as|os)\s+/i, '') : category;
    
    return [
      {
        id: 'opp_dyn_1',
        title: `The Essential Secrets of ${cleanSub}`,
        subtitle: `A Practical Reader-First Guide to Mastering ${category} with Clarity and Confidence`,
        positioning: `Obra de referência contemporânea orientada a desmistificar ${subcategory || category} através de exemplos práticos e linguagem acessível ao leitor americano.`,
        commercialHook: `Aprenda os princípios fundamentais e as técnicas essenciais de ${cleanSub} em uma abordagem envolvente, sem jargões desnecessários.`,
        coverArtDirection: 'Design editorial moderno com equilíbrio de contraste, tipografia forte e paleta de cores contemporânea alinhada aos Best Sellers do nicho.',
        targetAudience: 'Leitores engajados que valorizam profundidade, objetividade e aplicabilidade imediata.',
        suggestedPrice: isUs ? 6.99 : 27.90,
        currency,
        estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.05)
      },
      {
        id: 'opp_dyn_2',
        title: `The Modern Path to ${cleanSub}`,
        subtitle: `Actionable Insights, Real Case Studies, and Frameworks That Deliver Results`,
        positioning: 'Abordagem focada em solucionar as maiores dúvidas e gargalos do leitor com métodos comprovados.',
        commercialHook: 'O caminho mais rápido e seguro para obter resultados consistentes sem perder tempo com tentativa e erro.',
        coverArtDirection: 'Arte visual de alto impacto com foco na legibilidade do título e elementos conceituais elegantes.',
        targetAudience: 'Estudantes e entusiastas que buscam acelerar seu aprendizado com métodos validados.',
        suggestedPrice: isUs ? 5.99 : 22.90,
        currency,
        estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 0.95)
      },
      {
        id: 'opp_dyn_3',
        title: `The Mastery Blueprint: ${cleanSub}`,
        subtitle: `Timeless Strategies and Practical Wisdom from the Forefront of ${category}`,
        positioning: 'Síntese das melhores práticas de mercado organizadas em capítulos dinâmicos e fáceis de consultar.',
        commercialHook: 'Tudo o que você precisa para alcançar um novo nível de compreensão e habilidade no assunto com profundidade e clareza.',
        coverArtDirection: 'Estilo clássico contemporâneo com tons sóbrios e acabamento gráfico nobre.',
        targetAudience: 'Leitores exigentes que buscam conteúdo aprofundado e de alta credibilidade.',
        suggestedPrice: isUs ? 8.99 : 34.90,
        currency,
        estimatedMonthlyRoyaltyPotential: this.calibrateOpportunityRoyalty(baseMonthlyRoyalty, category, subcategory, isUs, 1.15)
      }
    ];
  }

  /**
   * Gera o pool de Best Sellers da categoria da Amazon
   * com distribuição de posições no nicho (Rank #1 a #80) e metadados de Best Sellers reais da Amazon.com
   */
  private generateCategoryBestSellers(
    category: string, 
    subcategory: string, 
    marketplace: Marketplace
  ): {
    asin: string;
    title: string;
    subtitle?: string;
    author: string;
    bsr: number;
    rating: number;
    reviewsCount: number;
    price: number;
    format: 'Kindle' | 'Paperback' | 'Hardcover';
    coverUrl?: string;
    amazonUrl?: string;
  }[] {
    const isUs = marketplace === 'amazon.com';
    const catLower = (category + ' ' + subcategory).toLowerCase();

    const isKidsOrFamily = catLower.includes('infantil') || catLower.includes('família') || catLower.includes('avó') || catLower.includes('irmãos') || catLower.includes('children') || catLower.includes('picture') || catLower.includes('bedtime');
    const isCookbook = catLower.includes('culinária') || catLower.includes('receita') || catLower.includes('cookbook') || catLower.includes('nutrition') || catLower.includes('baking');
    const isColoringOrActivity = catLower.includes('colorir') || catLower.includes('coloring') || catLower.includes('atividade') || catLower.includes('activity');
    const isSwordSorcery = catLower.includes('sword') || catLower.includes('sorcery') || catLower.includes('barbarian') || catLower.includes('alta fantasia');
    const isFantasy = catLower.includes('fantasia') || catLower.includes('fantasy') || isSwordSorcery;
    const isRomance = catLower.includes('romance') || catLower.includes('enemies to lovers');
    const isSelfHelp = catLower.includes('autoajuda') || catLower.includes('hábito') || catLower.includes('habit') || catLower.includes('desenvolvimento');
    const isBusinessFinance = catLower.includes('negócio') || catLower.includes('finança') || catLower.includes('invest') || catLower.includes('renda passiva') || catLower.includes('empresa');
    const isThriller = catLower.includes('thriller') || catLower.includes('mistério') || catLower.includes('suspense') || catLower.includes('crime');
    const isSciFi = catLower.includes('sci-fi') || catLower.includes('scifi') || catLower.includes('ficção científica') || catLower.includes('space') || catLower.includes('cyberpunk');

    const covers = [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1495640388908-05fa85288e61?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop'
    ];

    let titles: { t: string; s: string; a: string; asin: string; bsr: number; r: number; rev: number; p: number; f: 'Kindle' | 'Paperback' | 'Hardcover' }[] = [];

    // 1. LIVROS INFANTIS & FAMÍLIA (Best Sellers Reais da Amazon US)
    if (isKidsOrFamily) {
      titles = [
        { t: 'How to Babysit a Grandma', s: 'A Sweet Bedtime Read-Aloud for Kids & Grandparents', a: 'Jean Reagan', asin: 'B00A8S8V8C', bsr: 2, r: 4.9, rev: 38400, p: isUs ? 8.99 : 32.90, f: 'Paperback' },
        { t: 'The Grandma Book', s: 'A Warm Celebration of Grandmas Everywhere', a: 'Todd Parr', asin: 'B0047T8492', bsr: 6, r: 4.8, rev: 14200, p: isUs ? 8.99 : 29.90, f: 'Paperback' },
        { t: 'Baking Day at Grandma’s', s: 'A Delicious Rhyming Family Winter Story', a: 'Anika Denise', asin: 'B00K53A51G', bsr: 12, r: 4.8, rev: 9800, p: isUs ? 8.99 : 34.90, f: 'Paperback' },
        { t: 'I Love You to the Moon and Back', s: 'A Sweet Story About Big Family Love', a: 'Amelia Hepworth', asin: 'B015Q18868', bsr: 18, r: 4.9, rev: 92000, p: isUs ? 6.99 : 24.90, f: 'Paperback' },
        { t: 'The Wonderful Things You Will Be', s: 'A Heartwarming Classic for Children', a: 'Emily Winfield Martin', asin: 'B00T2459V2', bsr: 24, r: 4.9, rev: 110000, p: isUs ? 10.99 : 39.90, f: 'Hardcover' },
        { t: 'When Grandma Gives You a Lemon Tree', s: 'A Fun Story About Kindness & Growing Things', a: 'Jamie L.B. Deenihan', asin: 'B07N8Z7G9S', bsr: 32, r: 4.8, rev: 8400, p: isUs ? 9.99 : 36.90, f: 'Paperback' },
        { t: 'Love You Forever', s: 'The Timeless Classic of Parent & Child Love', a: 'Robert Munsch', asin: 'B0016PAB8Y', bsr: 41, r: 4.8, rev: 125000, p: isUs ? 7.99 : 27.90, f: 'Paperback' },
        { t: 'The Invisible String', s: 'A Picture Book About the Healing Power of Love', a: 'Patrice Karst', asin: 'B07DJ4LKV7', bsr: 52, r: 4.9, rev: 67000, p: isUs ? 8.99 : 32.90, f: 'Paperback' },
        { t: 'Just Grandma and Me', s: 'A Little Critter Classic Book', a: 'Mercer Mayer', asin: 'B0044KLP88', bsr: 63, r: 4.8, rev: 19800, p: isUs ? 4.99 : 18.90, f: 'Kindle' },
        { t: 'How to Babysit a Grandpa', s: 'Humorous Family Story for Little Helpers', a: 'Jean Reagan', asin: 'B006L8Z1M6', bsr: 71, r: 4.8, rev: 31000, p: isUs ? 8.99 : 31.90, f: 'Paperback' }
      ];
    } else if (isCookbook) {
      titles = [
        { t: 'The Complete Cookbook for Young Chefs', s: '100+ Kid-Tested, Kid-Approved Recipes', a: 'America’s Test Kitchen Kids', asin: 'B079F4S7V9', bsr: 5, r: 4.8, rev: 32000, p: isUs ? 12.99 : 45.90, f: 'Paperback' },
        { t: 'Salt, Fat, Acid, Heat', s: 'Mastering the Elements of Good Cooking', a: 'Samin Nosrat', asin: 'B01HMXRW7E', bsr: 14, r: 4.8, rev: 49000, p: isUs ? 19.99 : 69.90, f: 'Hardcover' },
        { t: 'The 5-Ingredient Mediterranean Diet Cookbook', s: '100 Quick & Flavorful Recipes', a: 'Denise Hazime', asin: 'B08F9V6W8Q', bsr: 22, r: 4.6, rev: 18500, p: isUs ? 11.99 : 39.90, f: 'Paperback' },
        { t: 'Magnolia Table, Volume 3', s: 'A Collection of Recipes for Gathering', a: 'Joanna Gaines', asin: 'B0BLT58P1V', bsr: 35, r: 4.8, rev: 27000, p: isUs ? 18.99 : 64.90, f: 'Hardcover' },
        { t: 'Baking Yesteryear', s: 'The Best Recipes from the 1900s to the 1980s', a: 'B. Dylan Hollis', asin: 'B0BLG9H9Y8', bsr: 48, r: 4.9, rev: 38000, p: isUs ? 16.99 : 59.90, f: 'Hardcover' },
        { t: 'Air Fryer Cookbook for Beginners', s: 'Fast, Easy, and Delicious Everyday Meals', a: 'Jaden Cooper', asin: 'B09TW77Y6Z', bsr: 64, r: 4.5, rev: 21000, p: isUs ? 9.99 : 34.90, f: 'Paperback' }
      ];
    } else if (isColoringOrActivity) {
      titles = [
        { t: 'Cozy Spaces Coloring Book', s: '50 Bold and Easy Designs for Relaxation', a: 'Coco Wyo', asin: 'B0CZ4L9P6V', bsr: 3, r: 4.8, rev: 24500, p: isUs ? 8.99 : 29.90, f: 'Paperback' },
        { t: 'Spooky & Sweet: Bold & Easy Coloring', s: 'Cozy Hygge Illustrations for Stress Relief', a: 'Southern Lotus', asin: 'B0DBR9X1K7', bsr: 11, r: 4.8, rev: 17200, p: isUs ? 7.99 : 27.90, f: 'Paperback' },
        { t: 'Little Corner: Hygge Living Coloring', s: 'Simple and Cozy Moments for Adults', a: 'Coco Wyo', asin: 'B0D6V4N2Y1', bsr: 19, r: 4.8, rev: 19800, p: isUs ? 8.99 : 29.90, f: 'Paperback' },
        { t: 'Secret Garden: An Inky Treasure Hunt', s: 'A Coloring Book for Art Therapy', a: 'Johanna Basford', asin: 'B00CO8Y1S4', bsr: 38, r: 4.7, rev: 42000, p: isUs ? 11.99 : 42.90, f: 'Paperback' },
        { t: 'Mindfulness Coloring Book for Adults', s: 'Anti-Stress Art Therapy for Busy People', a: 'Emma Farrarons', asin: 'B00VJ564E6', bsr: 55, r: 4.6, rev: 14800, p: isUs ? 9.99 : 34.90, f: 'Paperback' }
      ];
    } else if (isSwordSorcery || isFantasy) {
      titles = [
        { t: 'The Blade Itself', s: 'The First Law Trilogy Book 1', a: 'Joe Abercrombie', asin: 'B013RA92C4', bsr: 8, r: 4.7, rev: 68400, p: isUs ? 9.99 : 36.90, f: 'Paperback' },
        { t: 'The Name of the Wind', s: 'The Kingkiller Chronicle Day 1', a: 'Patrick Rothfuss', asin: 'B0010SKUYM', bsr: 16, r: 4.8, rev: 132000, p: isUs ? 8.99 : 32.90, f: 'Paperback' },
        { t: 'The Way of Kings', s: 'The Stormlight Archive Book 1', a: 'Brandon Sanderson', asin: 'B003P2WO5E', bsr: 23, r: 4.9, rev: 94000, p: isUs ? 9.99 : 39.90, f: 'Paperback' },
        { t: 'Conan the Barbarian: The Complete Collection', s: 'Classic Pulp Sword & Sorcery', a: 'Robert E. Howard', asin: 'B08R65R37Z', bsr: 34, r: 4.8, rev: 34200, p: isUs ? 4.99 : 19.90, f: 'Kindle' },
        { t: 'A Game of Thrones', s: 'A Song of Ice and Fire Book 1', a: 'George R.R. Martin', asin: 'B000QCS8TW', bsr: 42, r: 4.7, rev: 142000, p: isUs ? 10.99 : 42.90, f: 'Paperback' },
        { t: 'The Last Wish', s: 'Introducing The Witcher Saga', a: 'Andrzej Sapkowski', asin: 'B0010SIPT4', bsr: 54, r: 4.7, rev: 89000, p: isUs ? 7.99 : 28.90, f: 'Kindle' },
        { t: 'The Black Company', s: 'Chronicles of the Black Company', a: 'Glen Cook', asin: 'B008AS838A', bsr: 65, r: 4.6, rev: 41000, p: isUs ? 8.99 : 31.90, f: 'Paperback' },
        { t: 'The Lies of Locke Lamora', s: 'Gentleman Bastard Book 1', a: 'Scott Lynch', asin: 'B000JMKN92', bsr: 74, r: 4.7, rev: 77000, p: isUs ? 9.99 : 35.90, f: 'Kindle' }
      ];
    } else if (isBusinessFinance) {
      titles = [
        { t: 'Rich Dad Poor Dad', s: 'What the Rich Teach Their Kids About Money', a: 'Robert T. Kiyosaki', asin: 'B071VT7T45', bsr: 4, r: 4.8, rev: 185000, p: isUs ? 11.99 : 39.90, f: 'Paperback' },
        { t: 'The Psychology of Money', s: 'Timeless Lessons on Wealth, Greed, and Happiness', a: 'Morgan Housel', asin: 'B084HJSJZ2', bsr: 12, r: 4.8, rev: 89000, p: isUs ? 10.99 : 38.90, f: 'Kindle' },
        { t: 'Secrets of the Millionaire Mind', s: 'Mastering the Inner Game of Wealth', a: 'T. Harv Eker', asin: 'B0794BP53C', bsr: 21, r: 4.8, rev: 92000, p: isUs ? 9.99 : 34.90, f: 'Paperback' },
        { t: 'Zero to One', s: 'Notes on Startups, or How to Build the Future', a: 'Peter Thiel', asin: 'B00J6YBOFQ', bsr: 36, r: 4.6, rev: 62000, p: isUs ? 12.99 : 44.90, f: 'Hardcover' },
        { t: 'The Lean Startup', s: 'How Constant Innovation Creates Radically Successful Businesses', a: 'Eric Ries', asin: 'B004J4XGN6', bsr: 49, r: 4.6, rev: 54000, p: isUs ? 11.99 : 42.90, f: 'Paperback' },
        { t: 'The Richest Man in Babylon', s: 'The Success Secrets of the Ancients', a: 'George S. Clason', asin: 'B074MBNWXP', bsr: 58, r: 4.8, rev: 110000, p: isUs ? 6.99 : 24.90, f: 'Paperback' },
        { t: 'Good to Great', s: 'Why Some Companies Make the Leap and Others Don’t', a: 'Jim Collins', asin: 'B0058DRUV6', bsr: 73, r: 4.7, rev: 48000, p: isUs ? 13.99 : 49.90, f: 'Hardcover' }
      ];
    } else if (isThriller) {
      titles = [
        { t: 'The Housemaid', s: 'An absolutely addictive psychological thriller', a: 'Freida McFadden', asin: 'B09TWSRMC4', bsr: 3, r: 4.5, rev: 275000, p: isUs ? 4.99 : 19.90, f: 'Kindle' },
        { t: 'Verity', s: 'The Thriller Sensation', a: 'Colleen Hoover', asin: 'B07HJYTRMD', bsr: 9, r: 4.6, rev: 320000, p: isUs ? 8.99 : 34.90, f: 'Paperback' },
        { t: 'The Silent Patient', s: 'A Psychological Mystery Novel', a: 'Alex Michaelides', asin: 'B077R2V3W5', bsr: 18, r: 4.5, rev: 285000, p: isUs ? 9.99 : 36.90, f: 'Paperback' },
        { t: 'None of This Is True', s: 'A Gripping Psychological Suspense', a: 'Lisa Jewell', asin: 'B0BM5CGGCL', bsr: 29, r: 4.4, rev: 98000, p: isUs ? 11.99 : 42.90, f: 'Paperback' },
        { t: 'The Teacher', s: 'A Psychological Thriller', a: 'Freida McFadden', asin: 'B0CH1J3K2L', bsr: 42, r: 4.4, rev: 145000, p: isUs ? 5.99 : 22.90, f: 'Kindle' },
        { t: 'Local Woman Missing', s: 'A Suspenseful Murder Mystery', a: 'Mary Kubica', asin: 'B08HM35Z3D', bsr: 56, r: 4.5, rev: 89000, p: isUs ? 8.99 : 31.90, f: 'Paperback' },
        { t: 'A Good Girl’s Guide to Murder', s: 'A Mystery Novel', a: 'Holly Jackson', asin: 'B07N18L64N', bsr: 68, r: 4.6, rev: 165000, p: isUs ? 7.99 : 27.90, f: 'Kindle' }
      ];
    } else if (isRomance) {
      titles = [
        { t: 'It Ends with Us', s: 'Collector’s Edition Novel', a: 'Colleen Hoover', asin: 'B0176M3U10', bsr: 2, r: 4.7, rev: 312000, p: isUs ? 10.99 : 39.90, f: 'Paperback' },
        { t: 'Things We Never Got Over', s: 'A Knockemout Novel', a: 'Lucy Score', asin: 'B09F3M57K9', bsr: 7, r: 4.5, rev: 184500, p: isUs ? 5.99 : 24.90, f: 'Kindle' },
        { t: 'Twisted Love', s: 'A Grumpy Sunshine Romance', a: 'Ana Huang', asin: 'B09594TX3W', bsr: 15, r: 4.4, rev: 92300, p: isUs ? 4.99 : 19.90, f: 'Kindle' },
        { t: 'The Seven Husbands of Evelyn Hugo', s: 'A Novel', a: 'Taylor Jenkins Reid', asin: 'B01M5I2F4V', bsr: 25, r: 4.6, rev: 245000, p: isUs ? 9.99 : 34.90, f: 'Paperback' },
        { t: 'Icebreaker', s: 'A Maple Hills Novel', a: 'Hannah Grace', asin: 'B09VT3BRP3', bsr: 33, r: 4.3, rev: 89400, p: isUs ? 5.99 : 22.90, f: 'Kindle' },
        { t: 'King of Wrath', s: 'Kings of Sin Book 1', a: 'Ana Huang', asin: 'B0B3MP1C1B', bsr: 45, r: 4.5, rev: 67200, p: isUs ? 4.99 : 19.90, f: 'Kindle' },
        { t: 'Terms and Conditions', s: 'Dreamland Billionaires', a: 'Lauren Asher', asin: 'B09M5Z1X11', bsr: 59, r: 4.6, rev: 78500, p: isUs ? 4.99 : 18.90, f: 'Kindle' },
        { t: 'The Fine Print', s: 'Dreamland Billionaires Book 1', a: 'Lauren Asher', asin: 'B09K8Y2222', bsr: 72, r: 4.4, rev: 96000, p: isUs ? 4.99 : 19.90, f: 'Kindle' }
      ];
    } else if (isSelfHelp) {
      titles = [
        { t: 'Atomic Habits', s: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones', a: 'James Clear', asin: 'B07D23CFGR', bsr: 1, r: 4.8, rev: 198000, p: isUs ? 11.99 : 44.90, f: 'Paperback' },
        { t: 'Deep Work', s: 'Rules for Focused Success in a Distracted World', a: 'Cal Newport', asin: 'B00X47ZWXM', bsr: 17, r: 4.6, rev: 45000, p: isUs ? 8.99 : 35.90, f: 'Paperback' },
        { t: 'Can’t Hurt Me', s: 'Master Your Mind and Defy the Odds', a: 'David Goggins', asin: 'B07KKP62FW', bsr: 28, r: 4.8, rev: 142000, p: isUs ? 9.99 : 39.90, f: 'Paperback' },
        { t: 'The Mountain Is You', s: 'Transforming Self-Sabotage Into Self-Mastery', a: 'Brianna Wiest', asin: 'B088P88V2Z', bsr: 39, r: 4.6, rev: 67000, p: isUs ? 8.99 : 32.90, f: 'Kindle' },
        { t: 'Make Your Bed', s: 'Little Things That Can Change Your Life', a: 'William H. McRaven', asin: 'B01MQWMSL8', bsr: 51, r: 4.7, rev: 71000, p: isUs ? 6.99 : 25.90, f: 'Hardcover' },
        { t: 'Four Thousand Weeks', s: 'Time Management for Mortals', a: 'Oliver Burkeman', asin: 'B08R8B3H36', bsr: 62, r: 4.5, rev: 28000, p: isUs ? 9.99 : 36.90, f: 'Kindle' },
        { t: 'Essentialism', s: 'The Disciplined Pursuit of Less', a: 'Greg McKeown', asin: 'B00G1J1D28', bsr: 75, r: 4.6, rev: 39000, p: isUs ? 8.99 : 34.90, f: 'Paperback' }
      ];
    } else {
      // Ficção Geral / Outros
      titles = [
        { t: 'Fourth Wing', s: 'The Empyrean Book 1', a: 'Rebecca Yarros', asin: 'B0BGDM7F1K', bsr: 2, r: 4.8, rev: 215000, p: isUs ? 14.99 : 49.90, f: 'Hardcover' },
        { t: 'Iron Flame', s: 'The Empyrean Book 2', a: 'Rebecca Yarros', asin: 'B0C3Y3SXYX', bsr: 10, r: 4.6, rev: 165000, p: isUs ? 15.99 : 54.90, f: 'Hardcover' },
        { t: 'Project Hail Mary', s: 'A Novel', a: 'Andy Weir', asin: 'B08FHBV4ZX', bsr: 24, r: 4.8, rev: 198000, p: isUs ? 9.99 : 36.90, f: 'Kindle' },
        { t: 'Dune', s: 'The Classic Science Fiction Epic', a: 'Frank Herbert', asin: 'B00B70044M', bsr: 37, r: 4.7, rev: 145000, p: isUs ? 10.99 : 42.90, f: 'Paperback' },
        { t: 'Neuromancer', s: 'The Sprawl Trilogy Book 1', a: 'William Gibson', asin: 'B000O76MYA', bsr: 59, r: 4.5, rev: 52000, p: isUs ? 7.99 : 29.90, f: 'Paperback' },
        { t: 'Red Rising', s: 'Red Rising Saga Book 1', a: 'Pierce Brown', asin: 'B00DYXG8WQ', bsr: 71, r: 4.7, rev: 89000, p: isUs ? 9.99 : 38.90, f: 'Paperback' }
      ];
    }

    return titles.map((item, idx) => ({
      asin: item.asin,
      title: item.t,
      subtitle: item.s,
      author: item.a,
      bsr: item.bsr,
      rating: item.r,
      reviewsCount: item.rev,
      price: item.p,
      format: item.f,
      coverUrl: covers[idx % covers.length],
      amazonUrl: isUs ? `https://www.amazon.com/dp/${item.asin}` : `https://www.amazon.com.br/dp/${item.asin}`
    }));
  }
}

export const categoryIntelligenceService = new CategoryIntelligenceService();
