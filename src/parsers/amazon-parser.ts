import { 
  RawBookData, 
  Marketplace, 
  PageType, 
  BookFormat, 
  BsrCategory 
} from '../types';
import { AMAZON_SELECTORS } from './amazon-selectors';
import { parseDateString } from '../utils/formatters';

export abstract class BaseAmazonParser {
  abstract marketplace: Marketplace;
  abstract bsrRegex: RegExp;
  abstract bsrCategoryRegex: RegExp;
  abstract reviewCountRegex: RegExp;
  abstract ratingRegex: RegExp;
  abstract formatKeywords: Record<string, BookFormat>;

  /**
   * Extrai dados estruturados em JSON-LD se presentes na página
   */
  protected extractJsonLd(doc: Document): any | null {
    try {
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (const s of Array.from(scripts)) {
        if (!s.textContent) continue;
        const parsed = JSON.parse(s.textContent);
        if (parsed['@type'] === 'Book' || parsed['@type'] === 'Product') {
          return parsed;
        }
        if (Array.isArray(parsed)) {
          const bookItem = parsed.find(item => item['@type'] === 'Book' || item['@type'] === 'Product');
          if (bookItem) return bookItem;
        }
      }
    } catch {
      // Falha segura se JSON-LD for inválido
    }
    return null;
  }

  /**
   * Extrai ASIN a partir da URL ou de elementos da página
   */
  public extractAsin(url: string, el?: Element): string | null {
    // 1. Regex de URL: /dp/B0..., /gp/product/B0..., /ASIN
    const urlMatches = [
      /\/dp\/([A-Z0-9]{10})/i,
      /\/gp\/product\/([A-Z0-9]{10})/i,
      /\/product\/([A-Z0-9]{10})/i,
      /\/ASIN\/([A-Z0-9]{10})/i,
      /\/([A-Z0-9]{10})(?:[/?]|$)/i
    ];

    for (const regex of urlMatches) {
      const match = url.match(regex);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }

    // 2. Elemento DOM
    if (el) {
      const asinAttr = el.getAttribute('data-asin') || el.getAttribute('data-csa-c-item-id');
      if (asinAttr && asinAttr.trim().length === 10) {
        return asinAttr.trim().toUpperCase();
      }

      const childWithAsin = el.querySelector('[data-asin]:not([data-asin=""]), [data-csa-c-item-id]');
      if (childWithAsin) {
        const val = childWithAsin.getAttribute('data-asin') || childWithAsin.getAttribute('data-csa-c-item-id');
        if (val && val.trim().length === 10) return val.trim().toUpperCase();
      }

      const dpLink = el.querySelector('a[href*="/dp/"]') as HTMLAnchorElement;
      if (dpLink && dpLink.href) {
        const m = dpLink.href.match(/\/dp\/([A-Z0-9]{10})/i);
        if (m && m[1]) return m[1].toUpperCase();
      }

      const parentWithAsin = el.closest('[data-asin]:not([data-asin=""])');
      if (parentWithAsin) {
        const pVal = parentWithAsin.getAttribute('data-asin');
        if (pVal && pVal.trim().length === 10) return pVal.trim().toUpperCase();
      }

      const asinInput = el.querySelector('input#ASIN, input[name="ASIN"]') as HTMLInputElement;
      if (asinInput && asinInput.value) {
        return asinInput.value.toUpperCase();
      }
    }

    return null;
  }

  /**
   * Identifica o tipo de página que o usuário está visualizando
   */
  public detectPageType(url: string, doc: Document): PageType {
    if (url.includes('/s?') || url.includes('/s/')) {
      return 'SEARCH_RESULTS';
    }

    if (
      url.includes('/gp/bestsellers') || 
      url.includes('/best-sellers') || 
      url.includes('/zgbs') || 
      url.includes('/gp/new-releases') || 
      url.includes('/gp/movers-and-shakers') ||
      url.includes('/b?') || 
      url.includes('/b/')
    ) {
      return 'CATEGORY_BESTSELLERS';
    }

    if (url.includes('/dp/') || url.includes('/gp/product/') || doc.querySelector('#productTitle')) {
      return 'PRODUCT_PAGE';
    }

    if (url.includes('/author/') || url.includes('/e/')) {
      return 'AUTHOR_PAGE';
    }

    return 'OTHER';
  }

  /**
   * Helper para tentar múltiplos seletores em cascata
   */
  protected queryFirst(parent: Element | Document, selectors: string[]): Element | null {
    for (const sel of selectors) {
      try {
        const el = parent.querySelector(sel);
        if (el) return el;
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Extrai valor numérico de preço e moeda
   */
  public parsePrice(priceText?: string): { price?: number; currency: string } {
    if (!priceText) return { currency: 'BRL' };

    const text = priceText.trim();
    let currency = 'USD'; // default

    // Currency detection
    if (text.includes('R$') || text.includes('BRL')) currency = 'BRL';
    else if (text.includes('€') || text.includes('EUR')) currency = 'EUR';
    else if (text.includes('£') || text.includes('GBP')) currency = 'GBP';
    else if (text.includes('¥') || text.includes('￥') || text.includes('JPY')) currency = 'JPY';
    else if (text.includes('₹') || text.includes('INR')) currency = 'INR';
    else if (text.includes('CA$') || text.includes('C$') || text.includes('CAD')) currency = 'CAD';
    else if (text.includes('A$') || text.includes('AU$') || text.includes('AUD')) currency = 'AUD';
    else if (text.includes('MX$') || text.includes('MXN')) currency = 'MXN';
    else if (text.includes('$') || text.includes('US$') || text.includes('USD')) currency = 'USD';

    // For JPY/INR - often integers without decimals
    if (currency === 'JPY' || currency === 'INR') {
      const intMatch = text.match(/([0-9,]+)/);
      if (intMatch) {
        const val = parseInt(intMatch[1].replace(/[^0-9]/g, ''), 10);
        if (!isNaN(val) && val > 0) return { price: val, currency };
      }
    }

    // Standard decimal price: "39,90" or "12.99" or "1.234,56" or "1,234.56"
    // Handle European thousands separator first: "1.234,56"
    const euroThousands = text.match(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{1,2})/);
    if (euroThousands) {
      const normalized = euroThousands[1].replace(/\./g, '').replace(',', '.');
      const val = parseFloat(normalized);
      if (!isNaN(val) && val > 0) return { price: val, currency };
    }

    // Handle US thousands separator: "1,234.56"
    const usThousands = text.match(/([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{1,2})/);
    if (usThousands) {
      const normalized = usThousands[1].replace(/,/g, '');
      const val = parseFloat(normalized);
      if (!isNaN(val) && val > 0) return { price: val, currency };
    }

    // Simple decimal: "39,90" or "12.99"
    const numMatch = text.match(/([0-9]+[.,][0-9]{1,2})/);
    if (numMatch) {
      const normalized = numMatch[1].replace(',', '.');
      const val = parseFloat(normalized);
      if (!isNaN(val)) return { price: val, currency };
    }

    // Integer: "R$ 45", "$9"
    const intMatch = text.match(/([0-9]+)/);
    if (intMatch) {
      const val = parseInt(intMatch[1], 10);
      if (!isNaN(val) && val > 0) return { price: val, currency };
    }

    return { currency };
  }

  /**
   * Extrai nota média (0 a 5)
   */
  public parseRating(text?: string): number | undefined {
    if (!text) return undefined;
    const match = text.match(this.ratingRegex);
    if (match) {
      const val = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(val) && val >= 0 && val <= 5) return val;
    }
    return undefined;
  }

  /**
   * Extrai quantidade de avaliações / reviews
   */
  public parseReviewCount(text?: string): number | undefined {
    if (!text) return undefined;
    const match = text.match(this.reviewCountRegex);
    if (match) {
      // Remove pontos ou vírgulas de milhar: "1.450" -> "1450"
      const clean = match[1].replace(/[.,]/g, '');
      const count = parseInt(clean, 10);
      if (!isNaN(count)) return count;
    }
    return undefined;
  }

  /**
   * Detecta formato do livro a partir de strings
   */
  public parseFormat(text?: string): BookFormat {
    if (!text) return 'Kindle';
    const lower = text.toLowerCase();

    for (const [kw, fmt] of Object.entries(this.formatKeywords)) {
      if (lower.includes(kw)) {
        return fmt;
      }
    }

    if (lower.includes('kindle') || lower.includes('ebook')) return 'Kindle';
    if (lower.includes('capa comum') || lower.includes('paperback') || lower.includes('brochura')) return 'Capa Comum';
    if (lower.includes('capa dura') || lower.includes('hardcover')) return 'Capa Dura';
    if (lower.includes('audible') || lower.includes('audiobook')) return 'Audiobook';
    if (lower.includes('bolso')) return 'Livro de Bolso';

    return 'Kindle';
  }

  /**
   * Parse detalhado da página individual do produto
   */
  public parseProductPage(doc: Document, currentUrl: string): RawBookData | null {
    const asin = this.extractAsin(currentUrl, doc.body);
    if (!asin) return null;

    const selectorsUsed: Record<string, string> = {};

    // 1. Título
    let title = '';
    const titleEl = this.queryFirst(doc, AMAZON_SELECTORS.title);
    if (titleEl) {
      title = (titleEl.textContent || '').trim();
      selectorsUsed.title = titleEl.tagName.toLowerCase();
    }

    // 2. JSON-LD como enriquecedor prioritário
    const jsonLd = this.extractJsonLd(doc);
    if (jsonLd) {
      if (!title && jsonLd.name) title = jsonLd.name;
    }

    // 3. Autor
    let author = '';
    const authorEl = this.queryFirst(doc, AMAZON_SELECTORS.author);
    if (authorEl) {
      author = (authorEl.textContent || '').replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
      // Remove prefixos como "por", "by", "(Autor)"
      author = author.replace(/^(?:por|by)\s+/i, '').replace(/\(Autor.*?\)/i, '').trim();
      selectorsUsed.author = 'author-selector';
    }
    if (!author && jsonLd && jsonLd.author) {
      if (typeof jsonLd.author === 'string') author = jsonLd.author;
      else if (jsonLd.author.name) author = jsonLd.author.name;
      else if (Array.isArray(jsonLd.author) && jsonLd.author[0]) {
        author = jsonLd.author[0].name || jsonLd.author[0];
      }
    }

    // 4. Preço e Moeda
    let price: number | undefined;
    let currency = 'BRL';
    const priceEl = this.queryFirst(doc, AMAZON_SELECTORS.price);
    if (priceEl) {
      const parsedPrice = this.parsePrice(priceEl.textContent || '');
      price = parsedPrice.price;
      currency = parsedPrice.currency;
      selectorsUsed.price = 'price-selector';
    }

    // 5. Avaliações e Nota
    let rating: number | undefined;
    const ratingEl = this.queryFirst(doc, AMAZON_SELECTORS.rating);
    if (ratingEl) {
      rating = this.parseRating(ratingEl.textContent || '');
    }

    let reviewCount: number | undefined;
    const reviewEl = this.queryFirst(doc, AMAZON_SELECTORS.reviewCount);
    if (reviewEl) {
      reviewCount = this.parseReviewCount(reviewEl.textContent || '');
    }

    // 6. BSR Geral e Categorias
    const { bsr, bsrCategories, pages, publicationDate, publisher, language } = 
      this.extractDetailsBullets(doc);

    // 7. Imagem da capa
    let coverImage = '';
    const coverEl = this.queryFirst(doc, AMAZON_SELECTORS.coverImage) as HTMLImageElement;
    if (coverEl) {
      coverImage = coverEl.src || coverEl.getAttribute('data-old-hires') || coverEl.getAttribute('data-a-dynamic-image') || '';
      // Caso venha JSON no data-a-dynamic-image
      if (coverImage.startsWith('{')) {
        try {
          const keys = Object.keys(JSON.parse(coverImage));
          if (keys.length > 0) coverImage = keys[0];
        } catch {}
      }
    }

    // 8. Formato
    const format = this.detectProductPageFormat(doc);

    // 9. Kindle Unlimited
    const kuBadge = doc.querySelector('.ku-badge, img[alt*="Kindle Unlimited"], #kindleUnlimitedBadge');
    const isKindleUnlimited = !!kuBadge;

    return {
      asin,
      title: title || 'Título Indisponível',
      author: author || 'Autor Não Identificado',
      price,
      currency,
      rating,
      reviewCount,
      bsr,
      bsrCategories,
      pages,
      publicationDate,
      parsedDate: publicationDate ? (parseDateString(publicationDate)?.toISOString().split('T')[0]) : undefined,
      publisher,
      language,
      format,
      isKindleUnlimited,
      coverImage,
      url: currentUrl,
      marketplace: this.marketplace,
      rawSelectorsUsed: selectorsUsed
    };
  }

  /**
   * Extração nos blocos de Detalhes do Produto (Tabelas ou Listas)
   */
  protected abstract extractDetailsBullets(doc: Document): {
    bsr?: number;
    bsrCategories: BsrCategory[];
    pages?: number;
    publicationDate?: string;
    publisher?: string;
    language?: string;
  };

  /**
   * Extrai dados de um card individual em página de pesquisa ou lista de mais vendidos
   */
  public parseSearchResultCard(cardEl: Element, pageUrl: string): RawBookData | null {
    const asin = this.extractAsin('', cardEl);
    if (!asin) return null;

    // Título
    let title = '';
    const titleEl = this.queryFirst(cardEl, AMAZON_SELECTORS.cardTitle);
    if (titleEl) {
      title = (titleEl.textContent || '').trim();
    }

    // Autor
    let author = '';
    const authorEl = this.queryFirst(cardEl, AMAZON_SELECTORS.cardAuthor);
    if (authorEl) {
      author = (authorEl.textContent || '').replace(/^(?:por|by)\s+/i, '').replace(/[\n\r]/g, ' ').trim();
    }

    // Preço
    let price: number | undefined;
    let currency = 'BRL';
    const priceEl = this.queryFirst(cardEl, AMAZON_SELECTORS.cardPrice);
    if (priceEl) {
      const parsed = this.parsePrice(priceEl.textContent || '');
      price = parsed.price;
      currency = parsed.currency;
    }

    // Nota
    let rating: number | undefined;
    const ratingEl = this.queryFirst(cardEl, AMAZON_SELECTORS.cardRating);
    if (ratingEl) {
      rating = this.parseRating(ratingEl.textContent || '');
    }

    // Reviews
    let reviewCount: number | undefined;
    const reviewEl = this.queryFirst(cardEl, AMAZON_SELECTORS.cardReviews);
    if (reviewEl) {
      reviewCount = this.parseReviewCount(reviewEl.textContent || '');
    }

    // Capa
    let coverImage = '';
    const coverEl = this.queryFirst(cardEl, AMAZON_SELECTORS.cardCover) as HTMLImageElement;
    if (coverEl) {
      coverImage = coverEl.src || coverEl.getAttribute('data-src') || '';
    }

    // Formato
    let formatText = '';
    const formatEl = this.queryFirst(cardEl, AMAZON_SELECTORS.cardFormatBadge);
    if (formatEl) {
      formatText = formatEl.textContent || '';
    }
    const format = this.parseFormat(formatText || title);

    // Se for página de Mais Vendidos (Best Sellers), pode ter badge de posição no ranking (ex: #1, #2)
    let bsr: number | undefined;
    const badgeEl = this.queryFirst(cardEl, AMAZON_SELECTORS.bestsellerBadge);
    if (badgeEl && badgeEl.textContent) {
      const badgeMatch = badgeEl.textContent.match(/#([0-9.,]+)/);
      if (badgeMatch) {
        bsr = parseInt(badgeMatch[1].replace(/[.,]/g, ''), 10);
      }
    }

    // Link do livro
    let bookUrl = '';
    const linkEl = cardEl.querySelector('a.a-link-normal[href*="/dp/"]') as HTMLAnchorElement;
    if (linkEl && linkEl.href) {
      bookUrl = linkEl.href;
    } else {
      bookUrl = `https://${this.marketplace}/dp/${asin}`;
    }

    return {
      asin,
      title: title || 'Livro da Amazon',
      author: author || 'Autor Desconhecido',
      price,
      currency,
      rating,
      reviewCount,
      bsr,
      format,
      coverImage,
      url: bookUrl,
      marketplace: this.marketplace
    };
  }

  protected detectProductPageFormat(doc: Document): BookFormat {
    // Verifica tabs ou seletores de formato selecionados
    const selectedFormatEl = doc.querySelector(
      '.swatchElement.selected, #tmmSwatches .selected, .inline-twister-expander-header'
    );
    if (selectedFormatEl && selectedFormatEl.textContent) {
      return this.parseFormat(selectedFormatEl.textContent);
    }

    // Checa títulos de seções
    const pageText = (doc.querySelector('#titleSection, #booksTitle')?.textContent || '').toLowerCase();
    return this.parseFormat(pageText);
  }
}
