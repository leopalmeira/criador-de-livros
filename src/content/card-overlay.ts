import { RawBookData, TrendDirection } from '../types';
import { db } from '../database/local-database';
import { formatCurrency, formatNumber, formatBsr, calculateAge, ESTIMATE_TOOLTIP_TEXT } from '../utils/formatters';
import { defaultSalesEstimator } from '../estimators/sales-estimation-model';
import { defaultRoyaltyEstimator } from '../estimators/royalty-estimation-model';
import { DetailModal } from './detail-modal';

export class CardOverlay {
  public static inject(cardEl: Element, book: RawBookData) {
    // Evita duplicar injeção no mesmo card
    if (cardEl.querySelector('.bookintel-card-overlay')) {
      return;
    }

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

    const age = calculateAge(book.publicationDate);

    const overlay = document.createElement('div');
    overlay.className = 'bookintel-card-overlay';
    overlay.setAttribute('data-asin', book.asin);

    overlay.innerHTML = `
      <div class="bookintel-header-row">
        <div class="bookintel-brand-tag">
          <span>⚡ BookEngin</span>
          <span class="bookintel-badge bookintel-badge-obs">OBSERVADO</span>
        </div>
        <div class="bookintel-tooltip-wrapper">
          <span class="bookintel-badge bookintel-badge-est">ESTIMATIVAS ⓘ</span>
          <div class="bookintel-tooltip-content">${ESTIMATE_TOOLTIP_TEXT}</div>
        </div>
      </div>

      <div class="bookintel-grid">
        <div class="bookintel-stat-item">
          <span class="bookintel-stat-label">BSR Amazon</span>
          <span class="bookintel-stat-value primary">${formatBsr(book.bsr)}</span>
        </div>

        <div class="bookintel-stat-item">
          <span class="bookintel-stat-label">Vendas Est.</span>
          <span class="bookintel-stat-value success">
            ${salesEst.estimatedMonthlySales ? `≈ ${formatNumber(salesEst.estimatedMonthlySales)}/mês` : 'N/D'}
          </span>
        </div>

        <div class="bookintel-stat-item">
          <span class="bookintel-stat-label">Receita Bruta</span>
          <span class="bookintel-stat-value accent">
            ${(salesEst.estimatedMonthlySales && book.price) 
              ? formatCurrency(salesEst.estimatedMonthlySales * book.price, book.currency) 
              : 'N/D'}
          </span>
        </div>

        <div class="bookintel-stat-item">
          <span class="bookintel-stat-label">Royalties Est.</span>
          <span class="bookintel-stat-value" style="color: #f59e0b;">
            ${formatCurrency(royaltyEst.estimatedMonthlyRoyalty, book.currency)}
          </span>
        </div>
      </div>

      <div class="bookintel-actions-row">
        <button class="bookintel-btn bookintel-btn-analyze" title="Analisar Livro em Detalhes">
          🔍 Analisar
        </button>
        <button class="bookintel-btn bookintel-btn-trend" title="Verificar Tendência">
          📈 Trend: <span class="trend-label">...</span>
        </button>
        <button class="bookintel-btn bookintel-btn-save" title="Salvar na Watchlist">
          📌 Salvar
        </button>
        <button class="bookintel-btn bookintel-btn-compare" title="Adicionar ao Comparador">
          ⚖️ Comparar
        </button>
      </div>
    `;

    // Localiza o melhor ponto de injeção no card da Amazon
    // Geralmente abaixo do bloco de preço ou no final do card
    const targetContainer = 
      cardEl.querySelector('.s-card-container, .a-section.a-spacing-base, .sg-col-inner, .p13n-sc-uncoverable-faceout') || 
      cardEl;

    targetContainer.appendChild(overlay);

    // Carrega status da Watchlist e Tendência
    this.bindEvents(overlay, book, salesEst.estimatedDailySales);
  }

  private static async bindEvents(overlay: HTMLElement, book: RawBookData, dailySales: number | null) {
    const analyzeBtn = overlay.querySelector('.bookintel-btn-analyze');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        DetailModal.show(book);
      });
    }

    const saveBtn = overlay.querySelector('.bookintel-btn-save') as HTMLButtonElement;
    if (saveBtn) {
      const isSaved = await db.isWatchlisted(book.asin);
      if (isSaved) {
        saveBtn.classList.add('active');
        saveBtn.innerText = '★ Salvo';
      }

      saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentlySaved = await db.isWatchlisted(book.asin);
        if (currentlySaved) {
          await db.removeFromWatchlist(book.asin);
          saveBtn.classList.remove('active');
          saveBtn.innerText = '📌 Salvar';
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
            currentDailySales: dailySales || undefined
          });
          saveBtn.classList.add('active');
          saveBtn.innerText = '★ Salvo';
        }
      });
    }

    // Calcula tendência histórica com base nas observações reais gravadas
    const trendLabel = overlay.querySelector('.trend-label') as HTMLElement;
    if (trendLabel) {
      const history = await db.getObservationsForBook(book.asin);
      const trend = this.calculateTrend(history, book.bsr);
      trendLabel.innerText = trend;
      if (trend === 'SUBINDO') trendLabel.style.color = '#10b981'; // Posição melhorando
      else if (trend === 'CAINDO') trendLabel.style.color = '#ef4444'; // Posição piorando
      else trendLabel.style.color = '#94a3b8';
    }

    // Botão Comparar
    const compareBtn = overlay.querySelector('.bookintel-btn-compare') as HTMLButtonElement;
    if (compareBtn) {
      compareBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const queueKey = 'bookintel_compare_queue';
        const currentQueue: string[] = JSON.parse(sessionStorage.getItem(queueKey) || '[]');
        if (!currentQueue.includes(book.asin)) {
          currentQueue.push(book.asin);
          sessionStorage.setItem(queueKey, JSON.stringify(currentQueue));
          compareBtn.classList.add('active');
          compareBtn.innerText = '✓ Na Fila';
        } else {
          const filtered = currentQueue.filter(id => id !== book.asin);
          sessionStorage.setItem(queueKey, JSON.stringify(filtered));
          compareBtn.classList.remove('active');
          compareBtn.innerText = '⚖️ Comparar';
        }
      });
    }
  }

  private static calculateTrend(history: any[], currentBsr?: number): TrendDirection {
    if (!currentBsr || history.length < 2) return 'INSUFICIENTE';

    // Pega a observação mais antiga relevante (últimos 7 a 30 dias)
    const previous = history[0];
    if (!previous || !previous.bsr) return 'INSUFICIENTE';

    const diff = currentBsr - previous.bsr;
    // LEMBRAR: BSR MENOR representa posição MELHOR!
    // Se BSR passou de 30.000 para 15.000 (diff < 0), tendência é SUBINDO no ranking
    if (diff <= -500 || (diff < 0 && Math.abs(diff) / previous.bsr > 0.1)) {
      return 'SUBINDO';
    } else if (diff >= 500 || (diff > 0 && diff / previous.bsr > 0.1)) {
      return 'CAINDO';
    }
    return 'ESTÁVEL';
  }
}
