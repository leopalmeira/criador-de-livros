import type { AppSettings, SalesModelConfig } from '../types/index';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultMarketplace: 'amazon.com.br',
  language: 'pt-BR',
  theme: 'dark',
  cacheTtlMinutes: 30,
  monthlyDaysMultiplier: 30,
  showOverlayOnCards: true,
  showProductPanel: true,
  showNicheBar: true,
  debugMode: false,
  opportunityWeights: {
    salesWeight: 35,
    reviewBarrierWeight: 25,
    ratingWeight: 15,
    priceWeight: 15,
    recencyWeight: 10
  },
  royaltySettings: {
    'BRL': {
      kindleRateHigh: 0.70,
      kindleRateLow: 0.35,
      kindleMinPriceForHighRate: 5.99,
      kindleMaxPriceForHighRate: 24.99,
      kindleDeliveryCostPerMb: 0.30,
      paperbackFixedCost: 5.00,
      paperbackPerPageCost: 0.07,
      paperbackRoyaltyRate: 0.60,
      hardcoverFixedCost: 14.00,
      hardcoverPerPageCost: 0.08,
      hardcoverRoyaltyRate: 0.60,
      audiobookRoyaltyRate: 0.25
    },
    'USD': {
      kindleRateHigh: 0.70,
      kindleRateLow: 0.35,
      kindleMinPriceForHighRate: 2.99,
      kindleMaxPriceForHighRate: 9.99,
      kindleDeliveryCostPerMb: 0.15,
      paperbackFixedCost: 1.00,
      paperbackPerPageCost: 0.012,
      paperbackRoyaltyRate: 0.60,
      hardcoverFixedCost: 6.00,
      hardcoverPerPageCost: 0.015,
      hardcoverRoyaltyRate: 0.60,
      audiobookRoyaltyRate: 0.25
    },
    'EUR': {
      kindleRateHigh: 0.70,
      kindleRateLow: 0.35,
      kindleMinPriceForHighRate: 2.69,
      kindleMaxPriceForHighRate: 9.99,
      kindleDeliveryCostPerMb: 0.12,
      paperbackFixedCost: 0.90,
      paperbackPerPageCost: 0.012,
      paperbackRoyaltyRate: 0.60,
      hardcoverFixedCost: 5.50,
      hardcoverPerPageCost: 0.015,
      hardcoverRoyaltyRate: 0.60,
      audiobookRoyaltyRate: 0.25
    },
    'GBP': {
      kindleRateHigh: 0.70,
      kindleRateLow: 0.35,
      kindleMinPriceForHighRate: 1.99,
      kindleMaxPriceForHighRate: 9.99,
      kindleDeliveryCostPerMb: 0.10,
      paperbackFixedCost: 0.85,
      paperbackPerPageCost: 0.010,
      paperbackRoyaltyRate: 0.60,
      hardcoverFixedCost: 5.00,
      hardcoverPerPageCost: 0.014,
      hardcoverRoyaltyRate: 0.60,
      audiobookRoyaltyRate: 0.25
    }
  },
  aiSettings: {
    provider: 'gemini',
    apiKey: '',
    fallbackApiKey: '',
    baseUrl: '',
    model: 'gemini-2.0-flash',
    azureEndpoint: '',
    azureApiKey: '',
    azureImageEndpoint: '',
    imageProvider: 'builtin-flux',
    imageEndpoint: 'http://127.0.0.1:7865',
    imageModel: 'flux',
    temperature: 0.7
  }
};

export const DEFAULT_SALES_MODELS: SalesModelConfig[] = [
  {
    id: 'br-books-default-v1',
    name: 'Amazon Brasil - Livros e Kindle (Padrão)',
    marketplace: 'amazon.com.br',
    format: 'Todos',
    method: 'log-log',
    version: 'sales-model-br-v1.0',
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 320 },
      { bsr: 10, dailySales: 130 },
      { bsr: 50, dailySales: 60 },
      { bsr: 100, dailySales: 38 },
      { bsr: 500, dailySales: 16 },
      { bsr: 1000, dailySales: 9.5 },
      { bsr: 2500, dailySales: 5.0 },
      { bsr: 5000, dailySales: 3.0 },
      { bsr: 10000, dailySales: 1.7 },
      { bsr: 20000, dailySales: 1.0 },
      { bsr: 50000, dailySales: 0.45 },
      { bsr: 100000, dailySales: 0.20 },
      { bsr: 250000, dailySales: 0.07 },
      { bsr: 500000, dailySales: 0.02 }
    ]
  },
  {
    id: 'us-books-default-v1',
    name: 'Amazon EUA - Books & Kindle (Padrão)',
    marketplace: 'amazon.com',
    format: 'Todos',
    method: 'log-log',
    version: 'sales-model-us-v1.0',
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 3500 },
      { bsr: 10, dailySales: 1250 },
      { bsr: 50, dailySales: 520 },
      { bsr: 100, dailySales: 310 },
      { bsr: 500, dailySales: 125 },
      { bsr: 1000, dailySales: 65 },
      { bsr: 2500, dailySales: 35 },
      { bsr: 5000, dailySales: 20 },
      { bsr: 10000, dailySales: 11 },
      { bsr: 25000, dailySales: 5.0 },
      { bsr: 50000, dailySales: 2.5 },
      { bsr: 100000, dailySales: 1.2 },
      { bsr: 250000, dailySales: 0.4 },
      { bsr: 500000, dailySales: 0.15 },
      { bsr: 1000000, dailySales: 0.04 }
    ]
  },
  {
    id: 'uk-books-default-v1',
    name: 'Amazon UK - Books & Kindle',
    marketplace: 'amazon.co.uk',
    format: 'Todos',
    method: 'log-log',
    version: 'sales-model-uk-v1.0',
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 700 },
      { bsr: 10, dailySales: 260 },
      { bsr: 50, dailySales: 110 },
      { bsr: 100, dailySales: 70 },
      { bsr: 500, dailySales: 28 },
      { bsr: 1000, dailySales: 16 },
      { bsr: 5000, dailySales: 5.5 },
      { bsr: 10000, dailySales: 3.0 },
      { bsr: 50000, dailySales: 0.7 },
      { bsr: 100000, dailySales: 0.3 }
    ]
  },
  {
    id: 'de-books-default-v1',
    name: 'Amazon Deutschland - Bücher & Kindle',
    marketplace: 'amazon.de' as any,
    format: 'Todos',
    method: 'log-log',
    version: 'sales-model-de-v1.0',
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 800 },
      { bsr: 10, dailySales: 300 },
      { bsr: 50, dailySales: 130 },
      { bsr: 100, dailySales: 80 },
      { bsr: 500, dailySales: 30 },
      { bsr: 1000, dailySales: 17 },
      { bsr: 5000, dailySales: 6.0 },
      { bsr: 10000, dailySales: 3.2 },
      { bsr: 50000, dailySales: 0.8 },
      { bsr: 100000, dailySales: 0.35 }
    ]
  },
  {
    id: 'es-books-default-v1',
    name: 'Amazon España - Libros & Kindle',
    marketplace: 'amazon.es' as any,
    format: 'Todos',
    method: 'log-log',
    version: 'sales-model-es-v1.0',
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 350 },
      { bsr: 10, dailySales: 140 },
      { bsr: 50, dailySales: 60 },
      { bsr: 100, dailySales: 40 },
      { bsr: 500, dailySales: 16 },
      { bsr: 1000, dailySales: 9 },
      { bsr: 5000, dailySales: 3.0 },
      { bsr: 10000, dailySales: 1.6 },
      { bsr: 50000, dailySales: 0.4 },
      { bsr: 100000, dailySales: 0.18 }
    ]
  },
  {
    id: 'fr-books-default-v1',
    name: 'Amazon France - Livres & Kindle',
    marketplace: 'amazon.fr' as any,
    format: 'Todos',
    method: 'log-log',
    version: 'sales-model-fr-v1.0',
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 500 },
      { bsr: 10, dailySales: 190 },
      { bsr: 50, dailySales: 80 },
      { bsr: 100, dailySales: 52 },
      { bsr: 500, dailySales: 20 },
      { bsr: 1000, dailySales: 12 },
      { bsr: 5000, dailySales: 4.0 },
      { bsr: 10000, dailySales: 2.2 },
      { bsr: 50000, dailySales: 0.55 },
      { bsr: 100000, dailySales: 0.22 }
    ]
  },
  {
    id: 'it-books-default-v1',
    name: 'Amazon Italia - Libri & Kindle',
    marketplace: 'amazon.it' as any,
    format: 'Todos',
    method: 'log-log',
    version: 'sales-model-it-v1.0',
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 350 },
      { bsr: 10, dailySales: 130 },
      { bsr: 50, dailySales: 55 },
      { bsr: 100, dailySales: 35 },
      { bsr: 500, dailySales: 14 },
      { bsr: 1000, dailySales: 8 },
      { bsr: 5000, dailySales: 2.7 },
      { bsr: 10000, dailySales: 1.5 },
      { bsr: 50000, dailySales: 0.35 },
      { bsr: 100000, dailySales: 0.15 }
    ]
  },
  {
    id: 'ca-books-default-v1',
    name: 'Amazon Canada - Books & Kindle',
    marketplace: 'amazon.ca' as any,
    format: 'Todos',
    method: 'log-log',
    version: 'sales-model-ca-v1.0',
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 400 },
      { bsr: 10, dailySales: 150 },
      { bsr: 50, dailySales: 65 },
      { bsr: 100, dailySales: 42 },
      { bsr: 500, dailySales: 17 },
      { bsr: 1000, dailySales: 10 },
      { bsr: 5000, dailySales: 3.3 },
      { bsr: 10000, dailySales: 1.8 },
      { bsr: 50000, dailySales: 0.45 },
      { bsr: 100000, dailySales: 0.2 }
    ]
  },
  {
    id: 'mx-books-default-v1',
    name: 'Amazon México - Libros & Kindle',
    marketplace: 'amazon.com.mx' as any,
    format: 'Todos',
    method: 'log-log',
    version: 'sales-model-mx-v1.0',
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 200 },
      { bsr: 10, dailySales: 80 },
      { bsr: 50, dailySales: 35 },
      { bsr: 100, dailySales: 22 },
      { bsr: 500, dailySales: 9 },
      { bsr: 1000, dailySales: 5 },
      { bsr: 5000, dailySales: 1.7 },
      { bsr: 10000, dailySales: 0.9 },
      { bsr: 50000, dailySales: 0.2 },
      { bsr: 100000, dailySales: 0.08 }
    ]
  }
];
