import { PuzzleLanguage } from './types';

export interface AmazonPuzzleBestseller {
  id: string;
  asin: string;
  title: string;
  subtitle: string;
  author: string;
  language: PuzzleLanguage;
  badge: string;
  rating: number;
  reviewsCount: number;
  coverVisualTheme: string;
  palettePrimary: string;
  paletteSecondary: string;
  paletteAccent: string;
  bannerColor: string;
  badgeColor: string;
  keywords: string[];
  replicatePrompt: string;
}

export const AMAZON_PUZZLE_BESTSELLERS: AmazonPuzzleBestseller[] = [
  {
    id: 'bestseller-word-search-2027',
    asin: 'B0FTWW8XTL', // Referência oficial exata do print do usuário
    title: 'New Word Search Book for Adults',
    subtitle: 'Large Print Word Find Puzzles for Seniors with 10000 Unique Words, Endless Themes to Explore',
    author: 'My Brain Is Busy',
    language: 'en',
    badge: '#1 Best Seller em Word Search Games',
    rating: 4.8,
    reviewsCount: 12450,
    coverVisualTheme: 'Carmim Borgonha Profundo com Livro Aberto 3D e Lápis',
    palettePrimary: '#5f1212',
    paletteSecondary: '#7f1d1d',
    paletteAccent: '#f59e0b',
    bannerColor: '#1e3a8a',
    badgeColor: '#1e1b4b',
    keywords: [
      'word search for adults',
      'large print word find',
      'word search for seniors',
      '10000 unique words',
      'endless themes to explore',
      'brain games for memory',
      'dementia prevention activity book',
      'relaxing puzzle book for women and men'
    ],
    replicatePrompt: 'Commercial Amazon KDP bestseller cover photograph for a word search puzzle book. High-end professional product photography of an open paperback book lying on a rich mahogany desk, showing sharp printed word search puzzle grids, two sharpened wooden yellow graphite pencils resting on the pages, soft realistic drop shadow, clean solid deep burgundy wine background gradient, warm studio lighting, 8k resolution, completely clean of text or typography.'
  },
  {
    id: 'bestseller-ultimate-brain-puzzles',
    asin: 'B09X8QY71Z',
    title: 'The Ultimate Brain Health Puzzle Book for Adults',
    subtitle: 'Crosswords, Sudoku, Cryptograms & Word Searches for Cognitive Fitness',
    author: 'Logic Master Press',
    language: 'en',
    badge: 'Top 5 Amazon BSR Puzzles',
    rating: 4.7,
    reviewsCount: 8900,
    coverVisualTheme: 'Azul Meia-Noite & Dourado Real com Elementos 3D',
    palettePrimary: '#0f172a',
    paletteSecondary: '#1e3a8a',
    paletteAccent: '#fbbf24',
    bannerColor: '#0284c7',
    badgeColor: '#0c4a6e',
    keywords: [
      'sudoku puzzle book',
      'brain health games',
      'cognitive stimulation for seniors',
      'large print puzzles',
      'logic challenges for adults',
      'mind workout',
      'variety puzzle book'
    ],
    replicatePrompt: 'High-end commercial Amazon KDP book cover art for adult logic puzzle book, rich navy blue and ambient warm gold rim lighting, modern open book mockup with clean sudoku grids on pages, studio product photography, clean background, ultra sharp focus, 8k, pure photography without words.'
  },
  {
    id: 'bestseller-caca-palavras-brasil',
    asin: 'B08F9K4M88',
    title: 'Super Livro de Caça-Palavras e Sudoku Letras Grandes',
    subtitle: 'Desafios Lógicos e Cognitivos para Adultos e Terceira Idade com Gabarito Completo',
    author: 'Mente Ativa Editorial',
    language: 'pt',
    badge: '#1 Mais Vendido em Passatempos Amazon Brasil',
    rating: 4.9,
    reviewsCount: 6520,
    coverVisualTheme: 'Laranja Energia & Tabuleiro Clássico',
    palettePrimary: '#431407',
    paletteSecondary: '#9a3412',
    paletteAccent: '#fbbf24',
    bannerColor: '#0369a1',
    badgeColor: '#1e293b',
    keywords: [
      'caca palavras letras grandes',
      'sudoku com gabarito',
      'passatempos para terceira idade',
      'estimulacao cognitiva idosos',
      'livro de atividades para a mente',
      'exercicios de memoria',
      'passatempos logicos adultos'
    ],
    replicatePrompt: 'Professional commercial book cover photography for adult puzzle and crosswords book, warm amber and dark mahogany ambient lighting, an open book displaying puzzle grids, wooden pencil resting diagonally, elegant shadow and depth, 8k resolution, photorealistic studio lighting, no text.'
  },
  {
    id: 'bestseller-sopa-letras-espanol',
    asin: 'B09Y2K7R99',
    title: 'Gran Libro de Sopa de Letras y Pasatiempos para Adultos',
    subtitle: 'Letra Grande, Mente Activa y Estimulación Cognitiva para Mayores',
    author: 'Editorial Mente Ágil',
    language: 'es',
    badge: '#1 Bestseller en Pasatiempos Amazon España',
    rating: 4.8,
    reviewsCount: 5120,
    coverVisualTheme: 'Verde Esmeralda Zen & Tipografía Bestseller',
    palettePrimary: '#064e3b',
    paletteSecondary: '#047857',
    paletteAccent: '#34d399',
    bannerColor: '#0f766e',
    badgeColor: '#134e4a',
    keywords: [
      'sopa de letras letra grande',
      'pasatiempos adultos mayores',
      'sudoku facil a dificil',
      'entrenamiento mental',
      'estimulacion cognitiva adultos',
      'juegos de logica con respuestas'
    ],
    replicatePrompt: 'Award winning book cover product photography for a senior word puzzle book, deep emerald green background, open puzzle book on studio table, elegant soft shadows, high contrast pages, sharp focus, 8k, professional book packaging, no typography.'
  }
];

export function getBestsellersForLanguage(lang: PuzzleLanguage): AmazonPuzzleBestseller[] {
  const matching = AMAZON_PUZZLE_BESTSELLERS.filter(b => b.language === lang);
  return matching.length > 0 ? matching : AMAZON_PUZZLE_BESTSELLERS;
}
