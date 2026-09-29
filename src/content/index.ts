import './content.css';
import { getParserForUrl, detectMarketplaceFromUrl } from '../parsers';
import { AMAZON_SELECTORS } from '../parsers/amazon-selectors';
import { EstimateBox } from './estimate-box';
import { ProductPanel } from './product-panel';
import { NicheBar } from './niche-bar';
import { db } from '../database/local-database';
import { RawBookData } from '../types';
import { defaultSalesEstimator } from '../estimators/sales-estimation-model';
import { defaultRoyaltyEstimator } from '../estimators/royalty-estimation-model';
import { defaultOpportunityCalculator } from '../estimators/opportunity-score';

class BookIntelContentApp {
  private parser = getParserForUrl(window.location.href);
  private marketplace = detectMarketplaceFromUrl(window.location.href);
  private observer: MutationObserver | null = null;
  private isProcessing = false;
  private processedAsins = new Set<string>();
  private collectedBooks: RawBookData[] = [];
  private currentProductBook: any = null;
  private debounceTimer: number | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private lastUrl = window.location.href;
  private urlCheckInterval: number | null = null;

  async init() {
    logger.info('ContentScript', `Iniciando BookIntel em ${window.location.href}`);

    try {
      this.lastUrl = window.location.href;
      this.parser = getParserForUrl(window.location.href);
      this.marketplace = detectMarketplaceFromUrl(window.location.href);

      const settings = await db.getSettings();
      logger.setDebugEnabled(!!settings.debugMode);

      const pageType = this.parser.detectPageType(window.location.href, document);
      logger.info('ContentScript', `Tipo de página detectada: ${pageType} (${this.marketplace})`);

      if (pageType === 'PRODUCT_PAGE') {
        if (settings.showProductPanel) {
          await this.waitForElement('#productTitle, #title, #ebooksProductTitle', 5000);
          this.processProductPage();
          this.setupProductPageWatchdog();
        }
      } else if (pageType === 'SEARCH_RESULTS' || pageType === 'CATEGORY_BESTSELLERS') {
        if (settings.showOverlayOnCards !== false) {
          this.processListingPage();
          this.setupMutationObserver();
          this.setupSearchPageWatchdog();
        }
      }

      this.setupUrlMonitoring();
      this.setupMessageListener(pageType);
    } catch (err: any) {
      logger.error('ContentScript', `Erro na inicialização: ${err.message}`, err);
    }
  }

  /**
   * Watchdog ativo para páginas de busca que garante que todos os cards recebam a moldura
   */
  private setupSearchPageWatchdog() {
    window.setInterval(() => {
      const unprocessed = document.querySelectorAll(
        '[data-component-type="s-search-result"]:not([data-bi-injected]), .s-result-item[data-asin]:not([data-asin=""]):not([data-bi-injected])'
      );
      if (unprocessed.length > 0) {
        this.processListingPage();
      }
    }, 700);
  }

  /**
   * Monitora continuamente a página de produto para garantir que o painel NUNCA suma
   */
  private setupProductPageWatchdog() {
    // 1. Observer no DOM que reinjeta se a Amazon apagar o painel durante re-render
    const observer = new MutationObserver(() => {
      const panel = document.getElementById('bookintel-product-panel');
      if (!panel && this.currentProductBook) {
        logger.info('ContentScript', 'Painel de produto reinstalado após modificação do DOM pela Amazon.');
        ProductPanel.inject(this.currentProductBook);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 2. Heartbeat de segurança a cada 1.5s
    window.setInterval(() => {
      const panel = document.getElementById('bookintel-product-panel');
      if (!panel && this.currentProductBook) {
        ProductPanel.inject(this.currentProductBook);
      }
    }, 1500);

    // 3. Monitora cliques em abas de formato (Kindle, Capa Comum, etc.)
    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement)?.closest(
        '#tmmSwatches .swatchElement, #formats_feature_div a, .a-button-toggle, .swatchElement, #tmmSwatches a'
      );
      if (target) {
        setTimeout(() => this.processProductPage(1), 500);
        setTimeout(() => this.processProductPage(1), 1200);
      }
    }, { passive: true });
  }

  /**
   * Monitora transições de página (paginação SPA, botão "Próxima", clique em filtros)
   */
  private setupUrlMonitoring() {
    if (this.urlCheckInterval) return;

    const handleNavigation = () => {
      if (window.location.href !== this.lastUrl) {
        logger.info('ContentScript', `Transição de URL detectada: de ${this.lastUrl} para ${window.location.href}`);
        this.lastUrl = window.location.href;
        this.reprocess();
      }
    };

    window.addEventListener('popstate', handleNavigation);

    // Intercepta history.pushState e replaceState usados pela Amazon
    const origPushState = history.pushState;
    history.pushState = function (...args) {
      const res = origPushState.apply(this, args);
      handleNavigation();
      return res;
    };

    const origReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      const res = origReplaceState.apply(this, args);
      handleNavigation();
      return res;
    };

    // Polling leve a cada 500ms como garantia absoluta
    this.urlCheckInterval = window.setInterval(handleNavigation, 500);

    // Monitora cliques em paginação (a.s-pagination-item, a.s-pagination-next, etc.)
    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement)?.closest(
        'a.s-pagination-item, .s-pagination-button, a[href*="page="], a[href*="sr_pg_"], a.s-pagination-next, a.s-pagination-previous'
      );
      if (target) {
        setTimeout(() => handleNavigation(), 300);
      }
    }, { passive: true });
  }

  private setupMessageListener(pageType: string) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg.type === 'REANALYZE_PAGE') {
          this.reprocess();
          sendResponse({ status: 'ok' });
        } else if (msg.type === 'GET_PAGE_STATUS') {
          let listingSummary = null;
          if (this.collectedBooks.length > 0) {
            const validPrices = this.collectedBooks.filter(b => b.price && b.price > 0).map(b => b.price!);
            const validBsrs = this.collectedBooks.filter(b => b.bsr && b.bsr > 0).map(b => b.bsr!);
            const validReviews = this.collectedBooks.filter(b => b.reviewCount && b.reviewCount >= 0).map(b => b.reviewCount!);

            const avgPrice = validPrices.length > 0 ? (validPrices.reduce((a, b) => a + b, 0) / validPrices.length) : 0;
            const avgBsr = validBsrs.length > 0 ? (validBsrs.reduce((a, b) => a + b, 0) / validBsrs.length) : 0;
            const avgReviews = validReviews.length > 0 ? (validReviews.reduce((a, b) => a + b, 0) / validReviews.length) : 0;

            listingSummary = {
              totalBooks: this.collectedBooks.length,
              avgPrice: Number(avgPrice.toFixed(2)),
              avgBsr: Math.round(avgBsr),
              avgReviews: Math.round(avgReviews),
              keyword: this.extractSearchKeyword() || 'Livros e Nichos',
              currency: this.collectedBooks[0]?.currency || 'R$',
              topBooks: this.collectedBooks.slice(0, 6).map(b => ({
                asin: b.asin,
                title: b.title,
                author: b.author,
                price: b.price,
                bsr: b.bsr,
                coverImage: b.coverImage,
                rating: b.rating,
                reviewCount: b.reviewCount
              }))
            };
          }

          sendResponse({
            pageType,
            marketplace: this.marketplace,
            booksCount: this.collectedBooks.length,
            url: window.location.href,
            productBook: this.currentProductBook,
            listingSummary
          });
        }
      });
    }
  }

  private waitForElement(selectors: string, timeoutMs: number = 5000): Promise<Element | null> {
    return new Promise((resolve) => {
      const el = document.querySelector(selectors);
      if (el) {
        resolve(el);
        return;
      }

      const obs = new MutationObserver(() => {
        const found = document.querySelector(selectors);
        if (found) {
          obs.disconnect();
          resolve(found);
        }
      });

      obs.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        obs.disconnect();
        resolve(document.querySelector(selectors));
      }, timeoutMs);
    });
  }

  private processProductPage(attempt: number = 1) {
    try {
      const bookData = this.parser.parseProductPage(document, window.location.href);
      
      if (bookData && bookData.asin) {
        logger.info('ContentScript', `Livro detectado: "${bookData.title}" (ASIN: ${bookData.asin}) - BSR: ${bookData.bsr || 'carregando...'}`);

        const salesEst = defaultSalesEstimator.estimate({
          marketplace: bookData.marketplace,
          bsr: bookData.bsr,
          format: bookData.format,
          price: bookData.price
        });

        const royaltyEst = defaultRoyaltyEstimator.calculate(
          bookData.price,
          bookData.format,
          bookData.pages,
          salesEst.estimatedDailySales,
          salesEst.estimatedMonthlySales
        );

        const oppScore = defaultOpportunityCalculator.calculate({
          bsr: bookData.bsr,
          estimatedDailySales: salesEst.estimatedDailySales,
          reviewCount: bookData.reviewCount,
          rating: bookData.rating,
          price: bookData.price
        });

        this.currentProductBook = {
          ...bookData,
          salesEst,
          royaltyEst,
          oppScore
        };

        db.saveBook({
          asin: bookData.asin,
          title: bookData.title,
          author: bookData.author || 'Autor Não Identificado',
          price: bookData.price,
          currency: bookData.currency,
          format: bookData.format || 'Kindle',
          pages: bookData.pages,
          publicationDate: bookData.publicationDate,
          parsedDate: bookData.parsedDate,
          rating: bookData.rating,
          reviewCount: bookData.reviewCount,
          coverImage: bookData.coverImage,
          url: bookData.url,
          marketplace: this.marketplace,
          firstSeenAt: Date.now(),
          lastSeenAt: Date.now()
        });

        ProductPanel.inject(bookData);

        // Se o BSR ainda não tiver sido capturado pelo DOM inicial, re-tenta até 5 vezes
        if (!bookData.bsr && attempt <= 5) {
          setTimeout(() => {
            this.processProductPage(attempt + 1);
          }, 600);
        }
      } else {
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          setTimeout(() => this.processProductPage(attempt + 1), 1500);
        }
      }
    } catch (err: any) {
      logger.error('ContentScript', `Erro na página de produto: ${err.message}`, err);
    }
  }

  private processListingPage() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const cardSelectors = [...AMAZON_SELECTORS.searchResultCard, ...AMAZON_SELECTORS.bestsellerCard].join(', ');
      const rawCards = Array.from(document.querySelectorAll(cardSelectors));
      const keyword = this.extractSearchKeyword();

      // Filtra nós legítimos da Amazon (ignora elementos do BookIntel)
      const cards = rawCards.filter(card => {
        if (
          card.classList.contains('bookintel-estimate-box') ||
          card.classList.contains('bookintel-card-frame') ||
          card.closest('.bookintel-estimate-box, .bookintel-card-frame') ||
          card.hasAttribute('data-bi-box')
        ) {
          return false;
        }
        return true;
      });

      let newBooksCount = 0;

      for (const card of cards) {
        const asin = this.parser.extractAsin('', card);
        if (!asin) continue;

        // Se já processamos este ASIN na página atual, pula
        if (this.processedAsins.has(asin)) {
          continue;
        }

        // Se o card já tem o box injetado ou foi marcado, pula
        if (
          card.hasAttribute('data-bi-injected') ||
          card.querySelector('.bookintel-estimate-box, .bookintel-card-frame') ||
          document.querySelector(`.bookintel-card-frame[data-bi-asin="${asin}"]`)
        ) {
          this.processedAsins.add(asin);
          continue;
        }

        const book = this.parser.parseSearchResultCard(card, window.location.href);
        if (book) {
          this.processedAsins.add(asin);
          
          // Adiciona à lista de livros se ainda não estiver
          if (!this.collectedBooks.some(b => b.asin === asin)) {
            this.collectedBooks.push(book);
          }
          newBooksCount++;

          // Injeta o novo box compacto e alinhado de estimativas
          EstimateBox.inject(card, book);

          // Salva no banco local
          db.saveBook({
            asin: book.asin,
            title: book.title,
            author: book.author || 'Autor Não Identificado',
            price: book.price,
            currency: book.currency,
            format: book.format || 'Kindle',
            rating: book.rating,
            reviewCount: book.reviewCount,
            coverImage: book.coverImage,
            url: book.url,
            marketplace: this.marketplace,
            firstSeenAt: Date.now(),
            lastSeenAt: Date.now()
          });
        }
      }

      if (newBooksCount > 0) {
        logger.info('ContentScript', `${newBooksCount} novos livros processados com EstimateBox. Total na página: ${this.collectedBooks.length}`);
      }

      // Atualiza barra flutuante de nicho no rodapé
      if (this.collectedBooks.length > 0) {
        NicheBar.update(this.collectedBooks, keyword, this.marketplace);
      }
    } catch (err: any) {
      logger.error('ContentScript', `Erro ao processar listagem: ${err.message}`, err);
    } finally {
      this.isProcessing = false;
    }
  }

  private extractSearchKeyword(): string {
    const searchInput = document.querySelector('input#twotabsearchtextbox') as HTMLInputElement;
    if (searchInput && searchInput.value) {
      return searchInput.value.trim();
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const k = urlParams.get('k');
      if (k) return decodeURIComponent(k);
    } catch {}

    const catTitle = document.querySelector('h1.a-size-base, span.a-color-state.a-text-bold, h1');
    if (catTitle && catTitle.textContent) {
      return catTitle.textContent.replace(/"/g, '').trim();
    }

    return '';
  }

  private setupMutationObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    // Observa o document.body e IGNORA mutações causadas pelo próprio BookIntel
    this.observer = new MutationObserver((mutations) => {
      let hasGenuineAmazonNodes = false;

      for (const m of mutations) {
        for (let i = 0; i < m.addedNodes.length; i++) {
          const node = m.addedNodes[i];
          if (node.nodeType === 1) { // Node.ELEMENT_NODE
            const el = node as HTMLElement;
            // Se for nó injetado pelo BookIntel, ignora
            if (
              el.classList?.contains('bookintel-estimate-box') ||
              el.classList?.contains('bookintel-card-frame') ||
              el.classList?.contains('bookintel-niche-bar-floating') ||
              el.classList?.contains('bookintel-product-panel') ||
              el.classList?.contains('bookintel-coauthor-card') ||
              el.classList?.contains('bookintel-modal-backdrop') ||
              el.hasAttribute?.('data-bi-box') ||
              el.querySelector?.('.bookintel-estimate-box, .bookintel-card-frame, [data-bi-box]')
            ) {
              continue;
            }

            // Apenas dispara se for card genuíno da Amazon adicionado (ex: paginação AJAX, scroll infinito)
            if (
              el.matches?.('[data-component-type="s-search-result"], .s-result-item, .zg-grid-general-faceout, #gridItemRoot') ||
              el.querySelector?.('[data-component-type="s-search-result"], .s-result-item, .zg-grid-general-faceout, #gridItemRoot')
            ) {
              hasGenuineAmazonNodes = true;
              break;
            }
          }
        }
        if (hasGenuineAmazonNodes) break;
      }

      if (hasGenuineAmazonNodes) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = window.setTimeout(() => {
          this.processListingPage();
        }, 400);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private reprocess() {
    this.processedAsins.clear();
    this.collectedBooks = [];
    this.retryCount = 0;
    document.querySelectorAll('[data-bi-injected]').forEach(el => el.removeAttribute('data-bi-injected'));
    document.querySelectorAll('.bookintel-estimate-box, .bookintel-card-frame, .bookintel-card-overlay, .bookintel-product-panel, .bookintel-coauthor-card, #bookintel-product-panel').forEach(el => el.remove());
    this.init();
  }
}

// Inicia aplicação
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new BookIntelContentApp().init();
  });
} else {
  new BookIntelContentApp().init();
}
