import { 
  NicheSummary, 
  Marketplace, 
  CompetitionLevel, 
  NicheSnapshot, 
  SnapshotComparison 
} from '../types';

export interface BookAnalyticsInput {
  asin: string;
  title: string;
  author: string;
  bsr?: number | null;
  price?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  ageDays?: number | null;
  estimatedDailySales?: number | null;
  estimatedMonthlySales?: number | null;
  estimatedMonthlyRevenue?: number | null;
}

export class NicheAnalytics {
  static analyze(
    books: BookAnalyticsInput[],
    keyword: string = '',
    url: string = '',
    marketplace: Marketplace = 'amazon.com.br'
  ): NicheSummary {
    const totalBooks = books.length;
    const booksWithBsr = books.filter(b => b.bsr && b.bsr > 0);
    const booksWithPrice = books.filter(b => b.price && b.price > 0);
    const booksWithReviews = books.filter(b => b.reviewCount !== null && b.reviewCount !== undefined);
    const booksWithRating = books.filter(b => b.rating && b.rating > 0);
    const booksWithAge = books.filter(b => b.ageDays !== null && b.ageDays !== undefined);

    // Cálculos de BSR
    const bsrValues = booksWithBsr.map(b => b.bsr as number).sort((a, b) => a - b);
    const averageBsr = bsrValues.length ? Math.round(this.average(bsrValues)) : null;
    const medianBsr = bsrValues.length ? Math.round(this.median(bsrValues)) : null;
    const minBsr = bsrValues.length ? bsrValues[0] : null;
    const maxBsr = bsrValues.length ? bsrValues[bsrValues.length - 1] : null;
    const stdDevBsr = bsrValues.length ? Math.round(this.standardDeviation(bsrValues)) : null;

    // Cálculos de Preço
    const priceValues = booksWithPrice.map(b => b.price as number).sort((a, b) => a - b);
    const averagePrice = priceValues.length ? Number(this.average(priceValues).toFixed(2)) : null;
    const medianPrice = priceValues.length ? Number(this.median(priceValues).toFixed(2)) : null;
    const minPrice = priceValues.length ? Number(priceValues[0].toFixed(2)) : null;
    const maxPrice = priceValues.length ? Number(priceValues[priceValues.length - 1].toFixed(2)) : null;

    // Cálculos de Avaliações / Reviews
    const reviewValues = booksWithReviews.map(b => b.reviewCount as number).sort((a, b) => a - b);
    const averageReviews = reviewValues.length ? Math.round(this.average(reviewValues)) : null;
    const medianReviews = reviewValues.length ? Math.round(this.median(reviewValues)) : null;

    // Nota média
    const ratingValues = booksWithRating.map(b => b.rating as number);
    const averageRating = ratingValues.length ? Number(this.average(ratingValues).toFixed(1)) : null;

    // Idade média (em meses)
    const ageDaysValues = booksWithAge.map(b => b.ageDays as number);
    const averageAgeMonths = ageDaysValues.length 
      ? Number((this.average(ageDaysValues) / 30.44).toFixed(1)) 
      : null;

    // Vendas e Receita Totais
    const totalDailySales = books.reduce((acc, b) => acc + (b.estimatedDailySales || 0), 0);
    const totalMonthlySales = books.reduce((acc, b) => acc + (b.estimatedMonthlySales || 0), 0);
    const totalMonthlyRevenue = books.reduce((acc, b) => acc + (b.estimatedMonthlyRevenue || 0), 0);

    // Concentração de Vendas (Top 3, Top 5, Top 10)
    const sortedBySales = [...books].sort((a, b) => (b.estimatedDailySales || 0) - (a.estimatedDailySales || 0));
    const top3Sales = sortedBySales.slice(0, 3).reduce((acc, b) => acc + (b.estimatedDailySales || 0), 0);
    const top5Sales = sortedBySales.slice(0, 5).reduce((acc, b) => acc + (b.estimatedDailySales || 0), 0);
    const top10Sales = sortedBySales.slice(0, 10).reduce((acc, b) => acc + (b.estimatedDailySales || 0), 0);

    const concentrationTop3 = totalDailySales > 0 ? Math.round((top3Sales / totalDailySales) * 100) : 0;
    const concentrationTop5 = totalDailySales > 0 ? Math.round((top5Sales / totalDailySales) * 100) : 0;
    const concentrationTop10 = totalDailySales > 0 ? Math.round((top10Sales / totalDailySales) * 100) : 0;

    // Destaques e Evergreens
    const newHighPerformersCount = books.filter(b => 
      b.ageDays !== null && b.ageDays !== undefined && b.ageDays <= 90 && b.bsr && b.bsr <= 50000
    ).length;

    const evergreenCount = books.filter(b => 
      b.ageDays !== null && b.ageDays !== undefined && b.ageDays >= 730 && b.bsr && b.bsr <= 30000
    ).length;

    // Nível de Concorrência
    const { competitionLevel, competitionScore, reasons } = this.calculateCompetition({
      medianReviews,
      concentrationTop3,
      medianBsr,
      totalBooks,
      newHighPerformersCount
    });

    return {
      keyword,
      url,
      timestamp: Date.now(),
      marketplace,
      totalBooks,
      booksWithBsr: booksWithBsr.length,
      averageBsr,
      medianBsr,
      minBsr,
      maxBsr,
      stdDevBsr,
      averagePrice,
      medianPrice,
      minPrice,
      maxPrice,
      averageReviews,
      medianReviews,
      averageRating,
      averageAgeMonths,
      totalEstimatedDailySales: Number(totalDailySales.toFixed(1)),
      totalEstimatedMonthlySales: Math.round(totalMonthlySales),
      totalEstimatedMonthlyRevenue: Number(totalMonthlyRevenue.toFixed(2)),
      concentrationTop3,
      concentrationTop5,
      concentrationTop10,
      competitionLevel,
      competitionScore,
      competitionReasons: reasons,
      newHighPerformersCount,
      evergreenCount
    };
  }

  static compareSnapshots(previous: NicheSnapshot, current: NicheSnapshot): SnapshotComparison {
    const daysDifference = Math.max(1, Math.round((current.timestamp - previous.timestamp) / (1000 * 60 * 60 * 24)));
    
    const prevBsr = previous.summary.averageBsr || 0;
    const currBsr = current.summary.averageBsr || 0;
    const bsrAverageDiff = currBsr - prevBsr;

    const prevPrice = previous.summary.medianPrice || 0;
    const currPrice = current.summary.medianPrice || 0;
    const medianPriceDiff = Number((currPrice - prevPrice).toFixed(2));

    const prevRev = previous.summary.totalEstimatedMonthlyRevenue || 0;
    const currRev = current.summary.totalEstimatedMonthlyRevenue || 0;
    const monthlyRevenueDiff = Number((currRev - prevRev).toFixed(2));

    const prevAsins = new Set(previous.books.map(b => b.asin));
    const currAsins = new Set(current.books.map(b => b.asin));

    const newBooks = current.books.filter(b => !prevAsins.has(b.asin)).map(b => b.asin);
    const droppedBooks = previous.books.filter(b => !currAsins.has(b.asin)).map(b => b.asin);

    let summary = `Comparação em intervalo de ${daysDifference} dia(s). `;
    if (newBooks.length > 0) summary += `${newBooks.length} novo(s) concorrente(s) na página. `;
    if (droppedBooks.length > 0) summary += `${droppedBooks.length} livro(s) saíram das primeiras posições. `;
    if (bsrAverageDiff < 0) summary += `BSR médio melhorou (mais vendas globais no nicho).`;
    else if (bsrAverageDiff > 0) summary += `BSR médio subiu numericamente (ritmo mais lento).`;

    return {
      previous,
      current,
      daysDifference,
      bsrAverageDiff,
      medianPriceDiff,
      monthlyRevenueDiff,
      newBooks,
      droppedBooks,
      summary
    };
  }

  private static calculateCompetition(params: {
    medianReviews: number | null;
    concentrationTop3: number;
    medianBsr: number | null;
    totalBooks: number;
    newHighPerformersCount: number;
  }): { competitionLevel: CompetitionLevel; competitionScore: number; reasons: string[] } {
    let score = 50;
    const reasons: string[] = [];

    const { medianReviews, concentrationTop3, medianBsr, newHighPerformersCount } = params;

    // Avaliação de Reviews
    if (medianReviews !== null) {
      if (medianReviews <= 60) {
        score -= 20;
        reasons.push(`Reviews medianos baixos (${medianReviews}), facilitando entrada de novos autores.`);
      } else if (medianReviews >= 400) {
        score += 25;
        reasons.push(`Alta barreira de autoridade: mediana de ${medianReviews} avaliações.`);
      } else {
        reasons.push(`Barreira moderada de avaliações (mediana de ${medianReviews}).`);
      }
    }

    // Avaliação de Concentração
    if (concentrationTop3 >= 70) {
      score += 20;
      reasons.push(`Mercado altamente concentrado: Top 3 dominam ${concentrationTop3}% das vendas.`);
    } else if (concentrationTop3 <= 40) {
      score -= 15;
      reasons.push(`Demanda bem distribuída entre os concorrentes (Top 3 tem apenas ${concentrationTop3}%).`);
    }

    // Presença de Novos Destaques
    if (newHighPerformersCount >= 2) {
      score -= 15;
      reasons.push(`${newHighPerformersCount} livro(s) recente(s) (<90d) vendendo bem: nicho dinâmico.`);
    }

    // BSR Mediano
    if (medianBsr !== null) {
      if (medianBsr <= 15000) {
        reasons.push(`Nicho de alto volume diário de vendas (BSR mediano #${medianBsr}).`);
      } else if (medianBsr >= 80000) {
        reasons.push(`Nicho com baixa velocidade de giro de vendas (BSR mediano #${medianBsr}).`);
      }
    }

    score = Math.max(10, Math.min(95, score));

    let competitionLevel: CompetitionLevel = 'MÉDIA';
    if (score < 40) competitionLevel = 'BAIXA';
    else if (score > 65) competitionLevel = 'ALTA';

    return { competitionLevel, competitionScore: score, reasons };
  }

  // Funções Estatísticas
  public static average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((a, b) => a + b, 0);
    return sum / numbers.length;
  }

  public static median(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  public static standardDeviation(numbers: number[]): number {
    if (numbers.length <= 1) return 0;
    const avg = this.average(numbers);
    const squareDiffs = numbers.map(val => Math.pow(val - avg, 2));
    const avgSquareDiff = this.average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
}
