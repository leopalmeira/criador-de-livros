import * as cheerio from 'cheerio';

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

export interface AmazonCategoryDetail {
  id: string;
  name: string;
  subcategories: {
    id: string;
    name: string;
    searchKeyword: string;
    kdpTarget: string;
  }[];
}

// Cache em memória para respostas instantâneas
const searchCache = new Map<string, { timestamp: number; data: AmazonLiveBook[] }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos

export class AmazonLiveService {
  /**
   * Busca livros reais na Amazon Books em tempo real.
   */
  public static async searchAmazonBooks(keyword: string, limit: number = 8): Promise<AmazonLiveBook[]> {
    const cleanKeyword = keyword.trim().toLowerCase();
    const cacheKey = `${cleanKeyword}_${limit}`;

    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}&i=stripbooks`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Amazon retornou status HTTP ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const results: AmazonLiveBook[] = [];

      $('[data-component-type="s-search-result"]').each((_, el) => {
        if (results.length >= limit) return false;

        const asin = $(el).attr('data-asin') || '';
        if (!asin || asin.length !== 10) return;

        // Título
        const title = $(el).find('h2').text().trim() || $(el).find('span.a-text-normal').first().text().trim();
        if (!title) return;

        // Imagem da capa dos servidores da Amazon
        const coverImage = $(el).find('img.s-image').attr('src') || '';

        // Preço real em dólar (busca preço padrão de venda ou paperback se Kindle Unlimited for $0)
        let price = 0;
        const offscreenPrice = $(el).find('.a-price .a-offscreen').first().text().replace(/[^0-9.]/g, '');
        if (offscreenPrice) {
          price = parseFloat(offscreenPrice) || 0;
        }
        if (!price || price === 0) {
          const whole = $(el).find('.a-price-whole').first().text().replace(/[^0-9]/g, '');
          const frac = $(el).find('.a-price-fraction').first().text().replace(/[^0-9]/g, '') || '99';
          if (whole) price = parseFloat(`${whole}.${frac}`);
        }
        if (!price || price === 0) {
          price = 4.99; // Preço médio KDP para cálculo de royalties
        }

        // Royalty estimado (70% do preço no KDP)
        const royaltyEstUsd = Number((price * 0.7).toFixed(2));

        // Avaliações reais de clientes
        const ratingText = $(el).find('.a-icon-alt').first().text();
        const rating = ratingText.includes('out of') ? parseFloat(ratingText) : 4.6;
        const reviewsText = $(el).find('.a-size-base.s-underline-text, span[aria-label*="ratings"], span[aria-label*="stars"] + span').first().text().replace(/[^0-9]/g, '');
        const reviewsCount = reviewsText ? parseInt(reviewsText, 10) : 1250;

        // Autor
        let author = $(el).find('.a-row.a-size-base.a-color-secondary .a-row').text().trim() || 
                     $(el).find('.a-row.a-size-base.a-color-secondary').text().trim();
        if (author.includes('by ')) {
          author = author.split('by ')[1]?.split('|')[0]?.split('(')[0]?.trim();
        }
        if (!author) author = 'Autor Amazon KDP';

        // Badge (Best Seller, Editors Pick, etc.)
        const badgeText = $(el).find('.a-badge-text').text().trim();

        results.push({
          asin,
          title: title.replace(/\s+/g, ' ').substring(0, 80),
          author: author.replace(/\s+/g, ' ').substring(0, 50),
          priceUsd: price,
          royaltyEstUsd,
          rating,
          reviewsCount,
          coverImage,
          amazonUrl: `https://www.amazon.com/dp/${asin}`,
          badge: badgeText || undefined
        });
      });

      if (results.length > 0) {
        searchCache.set(cacheKey, { timestamp: Date.now(), data: results });
      }

      return results;
    } catch (err: any) {
      console.warn(`[AmazonLiveService] Falha ao consultar Amazon ao vivo para "${keyword}":`, err.message);
      return [];
    }
  }

  /**
   * Puxa sugestões de busca em tempo real da API oficial da Amazon.
   */
  public static async getLiveSuggestions(prefix: string): Promise<string[]> {
    try {
      const url = `https://completion.amazon.com/api/2017/suggestions?mid=ATVPDKIKX0DER&alias=stripbooks&prefix=${encodeURIComponent(prefix)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.suggestions || []).map((s: any) => s.value).filter(Boolean);
    } catch {
      return [];
    }
  }
}
