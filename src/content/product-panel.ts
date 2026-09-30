import { RawBookData, TrendDirection, Observation } from '../types';
import { db } from '../database/local-database';
import { 
  formatCurrency, 
  formatNumber, 
  formatBsr, 
  calculateAge, 
  formatCompactAge,
  ESTIMATE_TOOLTIP_TEXT 
} from '../utils/formatters';
import { defaultSalesEstimator } from '../estimators/sales-estimation-model';
import { defaultRoyaltyEstimator } from '../estimators/royalty-estimation-model';
import { defaultOpportunityCalculator } from '../estimators/opportunity-score';
import { DetailModal } from './detail-modal';

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'All';

export class ProductPanel {
  private static currentTimeRange: TimeRange = '3M';
  private static cachedObservations: Observation[] = [];
  private static currentBook: RawBookData | null = null;

  public static async inject(book: RawBookData) {
    this.currentBook = book;

    const age = calculateAge(book.publicationDate);
    const compactAge = formatCompactAge(book.publicationDate);

    const salesEst = defaultSalesEstimator.estimate({
      marketplace: book.marketplace,
      bsr: book.bsr,
      format: book.format,
      price: book.price
    });

    const royaltyEst = defaultRoyaltyEstimator.calculate(
      book.price,
      book.format,
      book.pages,
      salesEst.estimatedDailySales,
      salesEst.estimatedMonthlySales
    );

    const oppScore = defaultOpportunityCalculator.calculate({
      bsr: book.bsr,
      estimatedDailySales: salesEst.estimatedDailySales,
      reviewCount: book.reviewCount,
      rating: book.rating,
      price: book.price,
      ageDays: age?.ageDays
    });

    // Registra observação atual no banco se houver BSR ou preço
    if (book.bsr || book.price) {
      await db.recordObservation({
        asin: book.asin,
        marketplace: book.marketplace,
        timestamp: Date.now(),
        bsr: book.bsr,
        bsrCategories: book.bsrCategories,
        price: book.price,
        rating: book.rating,
        reviewCount: book.reviewCount,
        estimatedDailySales: salesEst.estimatedDailySales || undefined,
        estimatedMonthlySales: salesEst.estimatedMonthlySales || undefined,
        estimatedDailyRevenue: (salesEst.estimatedDailySales && book.price) ? Number((salesEst.estimatedDailySales * book.price).toFixed(2)) : undefined,
        estimatedMonthlyRevenue: (salesEst.estimatedMonthlySales && book.price) ? Number((salesEst.estimatedMonthlySales * book.price).toFixed(2)) : undefined,
        estimatedDailyRoyalty: royaltyEst.estimatedDailyRoyalty || undefined,
        estimatedMonthlyRoyalty: royaltyEst.estimatedMonthlyRoyalty || undefined,
        confidence: salesEst.confidence,
        opportunityScore: oppScore.score,
        modelVersion: salesEst.methodVersion
      });
    }

    this.cachedObservations = await db.getObservationsForBook(book.asin);
    const isSaved = await db.isWatchlisted(book.asin);

    // Cálculos de faixas idênticas ao CoAuthor.ai
    const baseDailySales = salesEst.estimatedDailySales || 0;
    let minDaily = 0;
    let maxDaily = 0;
    if (baseDailySales > 0) {
      minDaily = Math.max(1, Math.floor(baseDailySales * 0.75));
      maxDaily = Math.max(minDaily + 1, Math.ceil(baseDailySales * 1.35));
    }

    const price = book.price || 2.99;
    const currency = book.currency || 'USD';
    const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

    // Royalties faixa
    let minDailyRoyalty = '0';
    let maxDailyRoyalty = '0';
    if (minDaily > 0) {
      const royaltyPerBook = (royaltyEst.estimatedDailyRoyalty && baseDailySales)
        ? (royaltyEst.estimatedDailyRoyalty / baseDailySales)
        : (price * 0.70);
      minDailyRoyalty = (minDaily * royaltyPerBook).toFixed(1).replace('.0', '');
      maxDailyRoyalty = Math.ceil(maxDaily * royaltyPerBook).toString();
    }

    // Monthly revenue faixa
    let minMonthlyRev = '0';
    let maxMonthlyRev = '0';
    if (minDaily > 0) {
      minMonthlyRev = Math.round(minDaily * 30 * price).toString();
      maxMonthlyRev = Math.round(maxDaily * 30 * price).toString();
    }

    // Formato do rank (ex: KINDLE RANK (KINDLE STORE) ou BOOK RANK)
    const isKindle = (book.format || '').toLowerCase().includes('kindle') || (book.format || '').toLowerCase().includes('ebook');
    const rankLabel = isKindle ? 'KINDLE RANK (KINDLE STORE)' : 'AMAZON BOOK RANK';
    const formatBadgeText = (book.format || 'KINDLE').toUpperCase();

    // Páginas estimadas / reais
    const pagesDisplay = book.pages ? book.pages.toString() : 'N/D';

    // Age format
    const ageDisplay = compactAge ? compactAge.compact : (age?.formatted || 'N/D');
    const dateSubDisplay = compactAge ? compactAge.formattedDate : (book.publicationDate || '');

    // Verifica se painel já existe
    let panel = document.getElementById('bookintel-product-panel') as HTMLDivElement | null;
    const isNew = !panel;
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'bookintel-product-panel';
      panel.className = 'bookintel-coauthor-card';
    }

    panel.setAttribute('data-asin', book.asin);

    panel.innerHTML = `
      <!-- Topo: Logo & Badge do Formato -->
      <div class="bi-ca-header">
        <div class="bi-ca-brand">
          <svg class="bi-ca-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#3b82f6" stroke="#2563eb"/>
          </svg>
          <span class="bi-ca-title">BookIntel<span style="color:#2563eb">.ai</span></span>
        </div>
        <div class="bi-ca-header-right">
          <span class="bi-ca-badge">${formatBadgeText}</span>
          <button class="bi-ca-btn-icon" id="bi-ca-save-btn" title="${isSaved ? 'Remover dos salvos' : 'Salvar livro'}">
            ${isSaved ? '★' : '☆'}
          </button>
          <button class="bi-ca-btn-icon" id="bi-ca-dash-btn" title="Abrir Dashboard Completa">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </button>
        </div>
      </div>

      <!-- Linha de Estatísticas Chave (6 Colunas) -->
      <div class="bi-ca-metrics-row">
        <div class="bi-ca-metric-col">
          <div class="bi-ca-metric-label">${rankLabel}</div>
          <div class="bi-ca-metric-val bi-ca-val-dark">
            ${book.bsr ? `#${formatNumber(book.bsr, 0)}` : 'N/D'}
          </div>
        </div>

        <div class="bi-ca-metric-col">
          <div class="bi-ca-metric-label">DAILY SALES</div>
          <div class="bi-ca-metric-val bi-ca-val-green">
            ${minDaily > 0 ? `${minDaily}-${maxDaily}` : 'N/D'}
          </div>
        </div>

        <div class="bi-ca-metric-col">
          <div class="bi-ca-metric-label">DAILY ROYALTIES</div>
          <div class="bi-ca-metric-val bi-ca-val-gold">
            ${minDaily > 0 ? `${currencySymbol}${minDailyRoyalty}-${currencySymbol}${maxDailyRoyalty}` : 'N/D'}
          </div>
        </div>

        <div class="bi-ca-metric-col">
          <div class="bi-ca-metric-label">MONTHLY REVENUE</div>
          <div class="bi-ca-metric-val bi-ca-val-gold">
            ${minDaily > 0 ? `${currencySymbol}${minMonthlyRev}-${currencySymbol}${maxMonthlyRev}` : 'N/D'}
          </div>
        </div>

        <div class="bi-ca-metric-col">
          <div class="bi-ca-metric-label">PAGES</div>
          <div class="bi-ca-metric-val bi-ca-val-dark">
            ${pagesDisplay}
          </div>
        </div>

        <div class="bi-ca-metric-col">
          <div class="bi-ca-metric-label">AGE</div>
          <div class="bi-ca-metric-val bi-ca-val-dark">
            ${ageDisplay}
          </div>
          ${dateSubDisplay ? `<div class="bi-ca-metric-sub">${dateSubDisplay}</div>` : ''}
        </div>
      </div>

      <!-- Linha Secundária: Vendas Semanais, Mensais e Faturamento Diário e Mensal -->
      <div class="bi-ca-submetrics-row">
        <div class="bi-ca-submetric-item">
          <span class="bi-sub-lbl">Vendas Semana:</span>
          <strong class="bi-sub-val" style="color:#16a34a;">${minDaily > 0 ? `${formatNumber(minDaily * 7, 0)}-${formatNumber(maxDaily * 7, 0)} un` : 'N/D'}</strong>
        </div>
        <div class="bi-ca-submetric-item">
          <span class="bi-sub-lbl">Vendas Mês:</span>
          <strong class="bi-sub-val" style="color:#16a34a;">${minDaily > 0 ? `${formatNumber(minDaily * 30, 0)}-${formatNumber(maxDaily * 30, 0)} un` : 'N/D'}</strong>
        </div>
        <div class="bi-ca-submetric-item">
          <span class="bi-sub-lbl">Faturamento Dia:</span>
          <strong class="bi-sub-val" style="color:#d97706;">${minDaily > 0 ? `${currencySymbol}${formatNumber(minDaily * price, 0)}-${currencySymbol}${formatNumber(maxDaily * price, 0)}` : 'N/D'}</strong>
        </div>
        <div class="bi-ca-submetric-item">
          <span class="bi-sub-lbl">Faturamento Mês:</span>
          <strong class="bi-sub-val" style="color:#d97706;">${minDaily > 0 ? `${currencySymbol}${formatNumber(Number(minMonthlyRev), 0)}-${currencySymbol}${formatNumber(Number(maxMonthlyRev), 0)}` : 'N/D'}</strong>
        </div>
      </div>

      <!-- Seção do Gráfico BSR History -->
      <div class="bi-ca-chart-section">
        <div class="bi-ca-chart-header">
          <div class="bi-ca-chart-title">Histórico de BSR observado</div>
          <div class="bi-ca-time-filters" id="bi-ca-time-filters">
            <button class="bi-ca-time-btn ${this.currentTimeRange === '1M' ? 'active' : ''}" data-range="1M">1M</button>
            <button class="bi-ca-time-btn ${this.currentTimeRange === '3M' ? 'active' : ''}" data-range="3M">3M</button>
            <button class="bi-ca-time-btn ${this.currentTimeRange === '6M' ? 'active' : ''}" data-range="6M">6M</button>
            <button class="bi-ca-time-btn ${this.currentTimeRange === '1Y' ? 'active' : ''}" data-range="1Y">1Y</button>
            <button class="bi-ca-time-btn ${this.currentTimeRange === 'All' ? 'active' : ''}" data-range="All">All</button>
          </div>
        </div>

        <!-- Container do Canvas / SVG Gráfico -->
        <div class="bi-ca-chart-canvas-wrap" id="bi-ca-chart-container">
          <!-- Renderizado via renderBsrHistoryChart() -->
        </div>
      </div>

      <!-- Botão de Ação Inferior (Full-Width) -->
      <button class="bi-ca-cta-btn" id="bi-ca-cta-create">
        <span class="bi-ca-cta-sparkle">✨</span>
        <span>Create your competitive edge on this topic</span>
      </button>
    `;

    // Inserção no local ideal (posicionamento idêntico ao CoAuthor.ai)
    if (isNew) {
      this.attachPanelToDOM(panel);
    }

    // Renderiza o gráfico de BSR
    this.renderBsrHistoryChart(panel, book.bsr || 150000, this.currentTimeRange);

    // Eventos
    this.setupEventListeners(panel, book, salesEst, isSaved);
  }

  /**
   * Localiza o melhor ponto de injeção no DOM para ficar exatamente como o concorrente
   */
  private static attachPanelToDOM(panel: HTMLElement) {
    // 1. Tenta colocar logo após o seletor de formatos (Kindle, Paperback, etc.)
    const swatches = document.querySelector('#tmmSwatches') || document.querySelector('#formats_feature_div');
    if (swatches && swatches.parentNode) {
      swatches.parentNode.insertBefore(panel, swatches.nextSibling);
      return;
    }

    // 2. Tenta após reviews/estrelas ou autor
    const reviewsDiv = document.querySelector('#averageCustomerReviews_feature_div') || document.querySelector('#bylineInfo_feature_div');
    if (reviewsDiv && reviewsDiv.parentNode) {
      reviewsDiv.parentNode.insertBefore(panel, reviewsDiv.nextSibling);
      return;
    }

    // 3. Tenta dentro do #centerCol
    const centerCol = document.querySelector('#centerCol');
    if (centerCol) {
      const priceDiv = centerCol.querySelector('#unifiedPrice_feature_div, #booksTitle');
      if (priceDiv && priceDiv.parentNode) {
        priceDiv.parentNode.insertBefore(panel, priceDiv.nextSibling);
      } else {
        centerCol.prepend(panel);
      }
      return;
    }

    // 4. Fallback no #dp-container
    const dpContainer = document.querySelector('#dp-container') || document.querySelector('#dp');
    if (dpContainer) {
      dpContainer.prepend(panel);
      return;
    }

    document.body.prepend(panel);
  }

  /**
   * Renderiza o gráfico de degrau histórico de BSR idêntico ao do concorrente
   */
  private static renderBsrHistoryChart(panel: HTMLElement, currentBsr: number, range: TimeRange) {
    const container = panel.querySelector('#bi-ca-chart-container');
    if (!container) return;

    // Determina o número de pontos e período
    let days = 90;
    if (range === '1M') days = 30;
    else if (range === '3M') days = 90;
    else if (range === '6M') days = 180;
    else if (range === '1Y') days = 365;
    else if (range === 'All') days = 730;

    // Gera pontos apenas a partir de observações reais salvas.
    const points = this.generateHistoricalPoints(currentBsr, days, this.cachedObservations);
    if (points.length === 0) {
      container.innerHTML = '<p class="bi-ca-chart-empty">Ainda não há observações suficientes para exibir o histórico de BSR. Os dados coletados aparecerão aqui.</p>';
      return;
    }

    // Dimensões do SVG
    const width = 640;
    const height = 180;
    const paddingLeft = 70;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 20;

    // Calcula min e max de BSR (inverso: BSR menor fica no topo do gráfico!)
    const allBsrs = points.map(p => p.bsr);
    const minBsr = Math.max(1, Math.min(...allBsrs) * 0.7);
    const maxBsr = Math.max(...allBsrs) * 1.35;

    // 4 Níveis do Eixo Y (marcas de referência)
    const yLevels = [
      Math.round(minBsr + (maxBsr - minBsr) * 0.1),
      Math.round(minBsr + (maxBsr - minBsr) * 0.35),
      Math.round(minBsr + (maxBsr - minBsr) * 0.65),
      Math.round(minBsr + (maxBsr - minBsr) * 0.95)
    ];

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const getX = (index: number) => paddingLeft + (index / (points.length - 1 || 1)) * plotWidth;
    const getY = (bsrVal: number) => paddingTop + ((bsrVal - minBsr) / (maxBsr - minBsr || 1)) * plotHeight;

    // Constrói caminho da linha em degraus (step-after / stepped curve como no CoAuthor)
    let pathD = '';
    let areaD = '';

    for (let i = 0; i < points.length; i++) {
      const x = getX(i);
      const y = getY(points[i].bsr);

      if (i === 0) {
        pathD = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        areaD = `M ${x.toFixed(1)} ${height - paddingBottom} L ${x.toFixed(1)} ${y.toFixed(1)}`;
      } else {
        const prevX = getX(i - 1);
        const currentY = y;
        // Step horizontal then vertical
        pathD += ` L ${x.toFixed(1)} ${getY(points[i-1].bsr).toFixed(1)} L ${x.toFixed(1)} ${currentY.toFixed(1)}`;
        areaD += ` L ${x.toFixed(1)} ${getY(points[i-1].bsr).toFixed(1)} L ${x.toFixed(1)} ${currentY.toFixed(1)}`;
      }
    }

    const lastX = getX(points.length - 1);
    areaD += ` L ${lastX.toFixed(1)} ${height - paddingBottom} Z`;

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" class="bi-ca-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bi-ca-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.01"/>
          </linearGradient>
        </defs>

        <!-- Linhas de Grade e Eixo Y -->
        ${yLevels.map(lvl => {
          const yPos = getY(lvl);
          return `
            <line x1="${paddingLeft}" y1="${yPos.toFixed(1)}" x2="${width - paddingRight}" y2="${yPos.toFixed(1)}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
            <text x="${paddingLeft - 10}" y="${(yPos + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#94a3b8" font-family="-apple-system, sans-serif">
              #${formatNumber(lvl, 0)}
            </text>
          `;
        }).join('')}

        <!-- Área Preenchida com Gradiente -->
        <path d="${areaD}" fill="url(#bi-ca-gradient)" />

        <!-- Linha de Degraus do BSR -->
        <path d="${pathD}" fill="none" stroke="#1e3a8a" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
      </svg>
    `;

    container.innerHTML = svg;
  }

  /**
   * Gera pontos históricos coerentes
   */
  private static generateHistoricalPoints(currentBsr: number, days: number, realObs: Observation[]): { date: number; bsr: number }[] {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Se temos observações reais gravadas
    const sortedObs = [...realObs]
      .filter(o => o.bsr && o.timestamp >= (now - days * dayMs))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Exibe apenas observações reais: não inventa histórico quando os dados ainda são escassos.
    return sortedObs.map(o => ({ date: o.timestamp, bsr: o.bsr! }));
  }

  /**
   * Configuração de Eventos do Card
   */
  private static setupEventListeners(panel: HTMLElement, book: RawBookData, salesEst: any, isSaved: boolean) {
    // Filtros de tempo do Gráfico
    const filterButtons = panel.querySelectorAll('.bi-ca-time-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const range = target.getAttribute('data-range') as TimeRange;
        if (range && range !== this.currentTimeRange) {
          this.currentTimeRange = range;
          filterButtons.forEach(b => b.classList.remove('active'));
          target.classList.add('active');
          this.renderBsrHistoryChart(panel, book.bsr || 150000, this.currentTimeRange);
        }
      });
    });

    // Botão Salvar
    const saveBtn = panel.querySelector('#bi-ca-save-btn') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const currentlySaved = await db.isWatchlisted(book.asin);
        if (currentlySaved) {
          await db.removeFromWatchlist(book.asin);
          saveBtn.innerText = '☆';
          saveBtn.title = 'Salvar livro';
        } else {
          await db.addToWatchlist({
            asin: book.asin,
            marketplace: book.marketplace,
            addedAt: Date.now(),
            title: book.title,
            author: book.author || 'Autor Não Identificado',
            coverImage: book.coverImage,
            currentBsr: book.bsr,
            currentPrice: book.price,
            currentDailySales: salesEst.estimatedDailySales || undefined
          });
          saveBtn.innerText = '★';
          saveBtn.title = 'Salvo nos favoritos!';
        }
      });
    }

    // Botão Abrir Dashboard
    const dashBtn = panel.querySelector('#bi-ca-dash-btn');
    if (dashBtn) {
      dashBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD', asin: book.asin });
        }
      });
    }

    // Botão de Ação Inferior: ✨ Create your competitive edge on this topic
    const ctaBtn = panel.querySelector('#bi-ca-cta-create');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', async () => {
        // Salva nos favoritos automaticamente para garantir referência
        try {
          await db.addToWatchlist({
            asin: book.asin,
            marketplace: book.marketplace,
            addedAt: Date.now(),
            title: book.title,
            author: book.author || 'Autor Não Identificado',
            coverImage: book.coverImage,
            currentBsr: book.bsr,
            currentPrice: book.price,
            currentDailySales: salesEst.estimatedDailySales || undefined
          });
        } catch {}

        // Envia mensagem para abrir o Book Creator já pré-configurado
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'OPEN_DASHBOARD',
            tab: 'bookCreator',
            idea: `Livro de alta performance para competir no nicho de: "${book.title}"`,
            asin: book.asin
          });
        }
      });
    }
  }
}
