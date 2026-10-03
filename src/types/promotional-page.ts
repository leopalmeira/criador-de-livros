export interface PromotionalFeatureCard {
  title: string;
  subtitle: string;
  description: string;
  icon?: string;
}

export interface GenreVisualTheme {
  name: string;
  bodyBg: string;
  cardBg: string;
  borderColor: string;
  accentColor: string;
  accentGradient: string;
  textPrimary: string;
  textSecondary: string;
  fontFamilyTitle: string;
  fontFamilyBody: string;
  atmosphereBadgeBg: string;
  atmosphereBadgeColor: string;
  moodTag: string;
}

export interface BookPromotionalPageData {
  // Metadados básicos
  title: string;
  subtitle: string;
  author: string;
  genre: string;
  subgenre?: string;
  
  // Imagens
  coverImageUrl: string;
  promotionalImageUrl: string;

  // 1. Hero Principal
  heroHook: string;

  // 2. Apresentação do Livro
  headline: string;
  synopsis: string;

  // 3. Frase de Impacto
  impactQuote: string;

  // 4. Características do Livro (3 blocos/cards contextuais)
  features: PromotionalFeatureCard[];

  // 5. Experiência / Universo do Livro
  experienceTitle: string;
  experienceDescription: string;
  experienceItems: string[];

  // 6. Encerramento & CTA
  closingQuestion: string;
  closingCtaText: string;
  closingBadges: string;

  // Tema visual adaptativo
  genreTheme: GenreVisualTheme;
  
  // Metadados do sistema
  generatedAt: number;
  lastUpdatedAt: number;
}
