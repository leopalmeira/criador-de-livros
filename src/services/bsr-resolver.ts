// Resolvedor de BSR e Metadados Editoriais em segundo plano para resultados de pesquisa da Amazon
// Extrai BSR real, formato exato, páginas, data de publicação, idade e faixas de vendas/royalties

import { db } from '../database/local-database';
import { defaultSalesEstimator } from '../estimators/sales-estimation-model';
import { defaultRoyaltyEstimator } from '../estimators/royalty-estimation-model';
import { formatCompactAge, formatNumber, formatCurrency } from '../utils/formatters';
import { Marketplace } from '../types';

export interface ResolvedBookEstimate {
  asin: string;
  bsr?: number;
  rankCategory: string; // ex: "in Kindle Store" ou "in Books"
  rankLabel: string; // ex: "Kindle Rank" ou "Books BSR"
  format: string; // "Kindle" | "Paperback" | "Hardcover"
  pages?: number;
  publicationDate?: string;
  ageCompact?: string; // ex: "3y 1mo"
  minDailySales: number;
  maxDailySales: number;
  dailySalesRangeStr: string; // ex: "31-54 Sales/Day"
  minDailyRoyalty: string;
  maxDailyRoyalty: string;
  dailyRoyaltyRangeStr: string; // ex: "$151-$252 Royalty/Day"
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  monthlyRoyalty: number;
  currency: string;
  source: 'cache' | 'dom' | 'fetched' | 'bought_badge';
}

type ResolveCallback = (data: ResolvedBookEstimate) => void;

class BsrResolverService {
  private memoryCache = new Map<string, ResolvedBookEstimate>();
  private pendingQueue: Array<{
    asin: string;
    url: string;
    marketplace: Marketplace;
    price?: number;
    currency?: string;
    format?: any;
    callback: ResolveCallback;
  }> = [];
  private activeWorkers = 0;
  private maxConcurrency = 3;
  private isProcessing = false;

  /**
   * Resolve a estimativa para um livro. Se já estiver no cache, retorna imediatamente.
   * Caso contrário, enfileira a busca em segundo plano do BSR real e metadados.
   */
  public resolve(
    asin: string,
    url: string,
    marketplace: Marketplace,
    price: number | undefined,
    currency: string = 'USD',
    format: any = 'Paperback',
    initialBsr: number | undefined,
    boughtPastMonthText: string | undefined,
    callback: ResolveCallback
  ) {
    // 1. Se já está no cache de memória
    if (this.memoryCache.has(asin)) {
      callback(this.memoryCache.get(asin)!);
      return;
    }

    // 2. Se o BSR já foi extraído diretamente do DOM da Amazon (ex: lista de mais vendidos)
    if (initialBsr && initialBsr > 0) {
      const estimate = this.calculateEstimate(asin, initialBsr, price, currency, format, 'dom');
      this.memoryCache.set(asin, estimate);
      callback(estimate);
      return;
    }

    // 3. Tenta buscar no cache do IndexedDB de observações anteriores
    db.getObservationsForBook(asin, 1).then((observations) => {
      const lastObs = observations.length > 0 ? observations[observations.length - 1] : null;
      if (lastObs && lastObs.bsr && lastObs.bsr > 0) {
        const estimate = this.calculateEstimate(
          asin,
          lastObs.bsr,
          price || lastObs.price,
          currency || 'USD',
          format,
          'cache'
        );
        this.memoryCache.set(asin, estimate);
        callback(estimate);
        return;
      }

      // 4. Se a Amazon exibe "X compras no mês passado", usa isso como estimativa imediata
      if (boughtPastMonthText) {
        const boughtEstimate = this.parseBoughtPastMonth(boughtPastMonthText, asin, price, currency, format);
        if (boughtEstimate) {
          callback(boughtEstimate);
        }
      }

      // 5. Enfileira busca do BSR real na página do livro (/dp/ASIN)
      this.enqueueFetch(asin, url, marketplace, price, currency, format, callback);
    }).catch(() => {
      this.enqueueFetch(asin, url, marketplace, price, currency, format, callback);
    });
  }

  private enqueueFetch(
    asin: string,
    url: string,
    marketplace: Marketplace,
    price: number | undefined,
    currency: string = 'USD',
    format: any,
    callback: ResolveCallback
  ) {
    if (this.pendingQueue.some(item => item.asin === asin)) {
      return;
    }

    this.pendingQueue.push({ asin, url, marketplace, price, currency, format, callback });
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.pendingQueue.length > 0 && this.activeWorkers < this.maxConcurrency) {
      const item = this.pendingQueue.shift();
      if (!item) break;

      this.activeWorkers++;
      this.fetchBookDetails(item.asin, item.url, item.marketplace, item.price, item.currency, item.format, item.callback)
        .finally(() => {
          this.activeWorkers--;
          setTimeout(() => this.processQueue(), 120);
        });
    }

    this.isProcessing = false;
  }

  private async fetchBookDetails(
    asin: string,
    url: string,
    marketplace: Marketplace,
    price: number | undefined,
    currency: string = 'USD',
    format: any,
    callback: ResolveCallback
  ) {
    try {
      let targetUrl = url;
      if (!targetUrl || !targetUrl.includes('/dp/')) {
        targetUrl = `${window.location.origin}/dp/${asin}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'Cache-Control': 'no-cache'
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) return;

      const html = await res.text();
      const meta = this.extractBookMetadataFromHtml(html);

      if (meta.bsr && meta.bsr > 0) {
        let resolvedPrice = price;
        if (!resolvedPrice) {
          resolvedPrice = this.extractPriceFromHtml(html);
        }

        const estimate = this.calculateEstimate(
          asin,
          meta.bsr,
          resolvedPrice,
          currency,
          meta.format || format,
          'fetched',
          meta.category,
          meta.pages,
          meta.publicationDate
        );

        this.memoryCache.set(asin, estimate);

        // Salva observação no banco local
        db.recordObservation({
          asin,
          marketplace: marketplace || 'amazon.com',
          bsr: meta.bsr,
          price: resolvedPrice,
          estimatedDailySales: estimate.dailySales,
          estimatedMonthlySales: estimate.monthlySales,
          estimatedMonthlyRevenue: estimate.monthlyRevenue,
          timestamp: Date.now(),
          confidence: 'ALTA',
          modelVersion: 'bsr-resolver-v2'
        }).catch(() => {});

        callback(estimate);
      }
    } catch {
      // Ignora falhas de rede silenciosamente
    }
  }

  private extractBookMetadataFromHtml(html: string): {
    bsr?: number;
    category: string;
    format: string;
    pages?: number;
    publicationDate?: string;
  } {
    let bsr: number | undefined;
    let category = 'in Books';
    let format = 'Paperback';
    let pages: number | undefined;
    let publicationDate: string | undefined;

    // 1. Detecção de Formato
    const lowerHtml = html.toLowerCase();
    if (lowerHtml.includes('kindle edition') || lowerHtml.includes('edição kindle') || lowerHtml.includes('ebooksproducttitle')) {
      format = 'Kindle';
      category = 'in Kindle Store';
    } else if (lowerHtml.includes('hardcover') || lowerHtml.includes('capa dura')) {
      format = 'Hardcover';
      category = 'in Books';
    } else if (lowerHtml.includes('paperback') || lowerHtml.includes('capa comum') || lowerHtml.includes('brochura')) {
      format = 'Paperback';
      category = 'in Books';
    }

    // 2. Extração de BSR e Categoria
    const bsrPatterns = [
      /(?:Best Sellers Rank|Amazon Best Sellers Rank|Posição no ranking|Ranking dos mais vendidos)[^#\d]*#\s*([0-9.,]+)\s+(?:in|em|en|dans)\s+([^(\n<]+)/i,
      /#\s*([0-9.,]+)\s+in\s+([A-Za-z\s&–\-]+)/i,
      /(?:N[º°]|#)\s*([0-9.,]+)\s+em\s+(?:Livros|Loja Kindle)/i,
      /#\s*([0-9.,]+)\s+in\s+(?:Books|Kindle Store)/i
    ];

    for (const pat of bsrPatterns) {
      const match = html.match(pat);
      if (match) {
        const numOnly = match[1].replace(/[^0-9]/g, '');
        if (numOnly) {
          bsr = parseInt(numOnly, 10);
          if (match[2]) {
            const catName = match[2].trim().toLowerCase();
            if (catName.includes('kindle')) {
              category = 'in Kindle Store';
              format = 'Kindle';
            } else {
              category = 'in Books';
            }
          }
          break;
        }
      }
    }

    // 3. Extração de Páginas
    const pagesMatch = html.match(/Print length[^:]*:\s*([0-9]+)/i)
      || html.match(/([0-9]+)\s+pages/i)
      || html.match(/Número de páginas[^:]*:\s*([0-9]+)/i)
      || html.match(/([0-9]+)\s+páginas/i)
      || html.match(/pages[^0-9]*([0-9]{2,4})/i);
    if (pagesMatch) {
      pages = parseInt(pagesMatch[1], 10);
    }

    // 4. Data de publicação
    const dateMatch = html.match(/(?:Publication date|Data da publicação)[^:\w]*[:\s]+([^;\n\r<()]+)/i);
    if (dateMatch) {
      publicationDate = dateMatch[1].trim();
    }

    return { bsr, category, format, pages, publicationDate };
  }

  private extractPriceFromHtml(html: string): number | undefined {
    const pricePatterns = [
      /class="[^"]*a-price[^"]*"[^>]*>.*?class="a-offscreen">([^<]+)<\/span>/is,
      /id="kindle-price"[^>]*>\s*([^<]+)/i,
      /id="price"[^>]*>\s*([^<]+)/i,
      /class="a-color-price"[^>]*>\s*([^<]+)/i
    ];

    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match) {
        const text = match[1].trim();
        const numMatch = text.match(/([0-9]+[.,][0-9]{1,2})/)
          || text.match(/([0-9]+[.,][0-9]{3})/)
          || text.match(/([0-9]+)/);
        if (numMatch) {
          let cleaned = numMatch[1];
          if (/^[0-9]{1,3},[0-9]{2}$/.test(cleaned)) {
            cleaned = cleaned.replace(',', '.');
          } else {
            cleaned = cleaned.replace(',', '.');
          }
          const val = parseFloat(cleaned);
          if (!isNaN(val) && val > 0 && val < 100000) return val;
        }
      }
    }
    return undefined;
  }

  private parseBoughtPastMonth(
    text: string,
    asin: string,
    price?: number,
    currency: string = 'USD',
    format: string = 'Paperback'
  ): ResolvedBookEstimate | null {
    let count = 0;
    const kMatch = text.match(/([0-9.,\s]+)\s*(k|mil)\+?\s*(?:compras|bought|comprado|Mal|achet|acquistat)/i);
    if (kMatch) {
      count = parseFloat(kMatch[1].replace(/[^0-9.,]/g, '').replace(',', '.')) * 1000;
    }

    if (count === 0) {
      const numMatch = text.match(/([0-9.,]+)\+?\s*(?:compras|bought|comprados)/i);
      if (numMatch) {
        count = parseInt(numMatch[1].replace(/[^0-9]/g, ''), 10);
      }
    }

    if (count > 0) {
      const monthlySales = Math.round(count);
      const dailySales = Math.max(1, Math.round(monthlySales / 30));
      const weeklySales = Math.round(dailySales * 7);
      const effectiveP = price || 14.99;
      const dailyRevenue = Math.round(dailySales * effectiveP);
      const weeklyRevenue = Math.round(weeklySales * effectiveP);
      const monthlyRevenue = Math.round(monthlySales * effectiveP);
      const royaltyEst = defaultRoyaltyEstimator.calculate(price, format as any, 100, dailySales, monthlySales);

      const minDailySales = Math.max(1, Math.floor(dailySales * 0.75));
      const maxDailySales = Math.max(minDailySales + 1, Math.ceil(dailySales * 1.35));

      const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
      const royaltyPerBook = price ? price * 0.6 : 2.0;

      return {
        asin,
        rankCategory: 'in Books',
        rankLabel: 'Books BSR',
        format,
        minDailySales,
        maxDailySales,
        dailySalesRangeStr: `${minDailySales}-${maxDailySales} Sales/Day`,
        minDailyRoyalty: (minDailySales * royaltyPerBook).toFixed(1).replace('.0', ''),
        maxDailyRoyalty: Math.ceil(maxDailySales * royaltyPerBook).toString(),
        dailyRoyaltyRangeStr: `${currencySymbol}${(minDailySales * royaltyPerBook).toFixed(1).replace('.0', '')}-${currencySymbol}${Math.ceil(maxDailySales * royaltyPerBook)} Royalty/Day`,
        dailySales,
        weeklySales,
        monthlySales,
        dailyRevenue,
        weeklyRevenue,
        monthlyRevenue,
        monthlyRoyalty: royaltyEst.estimatedMonthlyRoyalty ?? 0,
        currency,
        source: 'bought_badge'
      };
    }
    return null;
  }

  public calculateEstimate(
    asin: string,
    bsr: number,
    price: number | undefined,
    currency: string,
    format: any,
    source: 'cache' | 'dom' | 'fetched',
    categoryOverride?: string,
    pages?: number,
    publicationDate?: string
  ): ResolvedBookEstimate {
    const host = window.location.hostname.toLowerCase();
    let marketplace: string = 'amazon.com';
    if (host.includes('amazon.com.br')) marketplace = 'amazon.com.br';
    else if (host.includes('amazon.co.uk')) marketplace = 'amazon.co.uk';
    else if (host.includes('amazon.de')) marketplace = 'amazon.de';
    else if (host.includes('amazon.es')) marketplace = 'amazon.es';
    else if (host.includes('amazon.fr')) marketplace = 'amazon.fr';
    else if (host.includes('amazon.it')) marketplace = 'amazon.it';
    else if (host.includes('amazon.ca')) marketplace = 'amazon.ca';
    else if (host.includes('amazon.com.mx')) marketplace = 'amazon.com.mx';
    else if (host.includes('amazon.co.jp')) marketplace = 'amazon.co.jp';
    else if (host.includes('amazon.in')) marketplace = 'amazon.in';
    else if (host.includes('amazon.com.au')) marketplace = 'amazon.com.au';
    else if (host.includes('amazon.nl')) marketplace = 'amazon.nl';
    else if (host.includes('amazon.com')) marketplace = 'amazon.com';

    const isKindle = (format || '').toLowerCase().includes('kindle') || (categoryOverride || '').toLowerCase().includes('kindle');
    const resolvedFormat = isKindle ? 'Kindle' : (format || 'Paperback');
    const rankLabel = isKindle ? 'Kindle Rank' : 'Books BSR';
    const rankCategory = categoryOverride || (isKindle ? 'in Kindle Store' : 'in Books');

    const salesEst = defaultSalesEstimator.estimate({
      marketplace: marketplace as any,
      bsr,
      format: resolvedFormat,
      price
    });

    const dailySales = salesEst.estimatedDailySales || 1;
    const weeklySales = Math.round(dailySales * 7);
    const monthlySales = salesEst.estimatedMonthlySales || Math.round(dailySales * 30);
    const effectivePrice = price || (isKindle ? 3.99 : 14.99);
    const dailyRevenue = Math.round(dailySales * (price || effectivePrice));
    const weeklyRevenue = Math.round(weeklySales * (price || effectivePrice));
    const monthlyRevenue = price ? Math.round(monthlySales * price) : Math.round(monthlySales * effectivePrice);

    const royaltyEst = defaultRoyaltyEstimator.calculate(
      price,
      resolvedFormat,
      pages || 150,
      dailySales,
      monthlySales
    );

    // Faixas idênticas ao CoAuthor.ai
    let minDailySales = 0;
    let maxDailySales = 1;
    let dailySalesRangeStr = '0-1 Sales/Day';

    if (dailySales >= 1) {
      minDailySales = Math.max(1, Math.floor(dailySales * 0.78));
      maxDailySales = Math.max(minDailySales + 1, Math.ceil(dailySales * 1.35));
      dailySalesRangeStr = `${minDailySales}-${maxDailySales} Sales/Day`;
    } else {
      minDailySales = 0;
      maxDailySales = 1;
      dailySalesRangeStr = '0-1 Sales/Day';
    }

    const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    const royaltyPerBook = isKindle ? effectivePrice * 0.70 : Math.max(1.0, effectivePrice * 0.60 - 2.5);

    let minDailyRoyalty = '0.3';
    let maxDailyRoyalty = '0.4';
    let dailyRoyaltyRangeStr = `${currencySymbol}0.3-${currencySymbol}0.4 Royalty/Day`;

    if (minDailySales > 0) {
      minDailyRoyalty = (minDailySales * royaltyPerBook).toFixed(1).replace('.0', '');
      maxDailyRoyalty = Math.ceil(maxDailySales * royaltyPerBook).toString();
      dailyRoyaltyRangeStr = `${currencySymbol}${minDailyRoyalty}-${currencySymbol}${maxDailyRoyalty} Royalty/Day`;
    } else {
      // Sub-1 sale per day
      const minSub = (0.2 * royaltyPerBook).toFixed(1);
      const maxSub = (0.5 * royaltyPerBook).toFixed(1);
      minDailyRoyalty = minSub;
      maxDailyRoyalty = maxSub;
      dailyRoyaltyRangeStr = `${currencySymbol}${minSub}-${currencySymbol}${maxSub} Royalty/Day`;
    }

    // Compact Age
    const ageCompactInfo = formatCompactAge(publicationDate);
    const ageCompact = ageCompactInfo?.compact;

    return {
      asin,
      bsr,
      rankCategory,
      rankLabel,
      format: resolvedFormat,
      pages,
      publicationDate,
      ageCompact,
      minDailySales,
      maxDailySales,
      dailySalesRangeStr,
      minDailyRoyalty,
      maxDailyRoyalty,
      dailyRoyaltyRangeStr,
      dailySales,
      weeklySales,
      monthlySales,
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      monthlyRoyalty: royaltyEst.estimatedMonthlyRoyalty ?? 0,
      currency,
      source
    };
  }
}

export const bsrResolver = new BsrResolverService();
