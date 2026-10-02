import { Marketplace } from './index';

export interface CategoryMarketMetrics {
  id: string;
  marketplace: Marketplace;
  category: string;
  subcategory: string;
  qualified_books: number;
  total_analyzed_books: number;
  min_bsr: number;
  max_bsr: number;
  avg_bsr: number;
  avg_rating: number;
  avg_review_count: number;
  avg_price: number;
  currency: 'USD' | 'BRL';
  avg_sales_day: number;
  avg_sales_month: number;
  avg_royalty_day: number;
  avg_royalty_month: number;
  avg_gross_revenue_day: number;
  avg_gross_revenue_month: number;
  collected_at: number;
}

export interface CategoryBookReference {
  asin: string;
  title: string;
  subtitle?: string;
  author: string;
  bsr: number;
  rating: number;
  reviewsCount: number;
  price: number;
  currency: 'USD' | 'BRL';
  format: 'Kindle' | 'Paperback' | 'Hardcover';
  coverUrl?: string;
  amazonUrl?: string;
  category: string;
  subcategory: string;
  estimatedDailySales: number;
  estimatedMonthlySales: number;
  estimatedDailyGrossRevenue: number;
  estimatedMonthlyGrossRevenue: number;
  estimatedDailyRoyalty: number | null;
  estimatedMonthlyRoyalty: number | null;
  royaltyNote: string;
  qualifies: boolean;
}

export interface CategoryPatternsAnalysis {
  titleStructures: string[];
  subtitleStructures: string[];
  recurringKeywords: string[];
  avgTitleLengthWords: number;
  corePromises: string[];
  mainBenefits: string[];
  targetAudiences: string[];
  coverVisualPatterns: string[];
  predominantPriceRange: string;
  dominantFormats: { format: string; percentage: number }[];
}

export interface BookOpportunityProposal {
  id: string;
  title: string;
  subtitle: string;
  positioning: string;
  commercialHook: string;
  coverArtDirection: string;
  targetAudience: string;
  suggestedPrice: number;
  currency: 'USD' | 'BRL';
  estimatedMonthlyRoyaltyPotential: number;
}

export interface CategoryIntelligenceReport {
  metrics: CategoryMarketMetrics;
  books: CategoryBookReference[];
  patterns: CategoryPatternsAnalysis;
  opportunities: BookOpportunityProposal[];
  filterCriteria: {
    maxBsr: number;
    minRating: number;
  };
}

export interface CategoryNode {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

export interface GenreHierarchy {
  id: string;
  name: string;
  categories: CategoryNode[];
}
