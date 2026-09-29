import { RawBookData, Observation } from '../types';
import { db } from '../database/local-database';
import { formatCurrency, formatNumber, formatBsr, calculateAge, ESTIMATE_TOOLTIP_TEXT } from '../utils/formatters';
import { defaultSalesEstimator } from '../estimators/sales-estimation-model';
import { defaultRoyaltyEstimator } from '../estimators/royalty-estimation-model';
import { defaultOpportunityCalculator } from '../estimators/opportunity-score';
import { exportBsrHistoryToCsv } from '../utils/export-import';

export class DetailModal {
  private static activeModalEl: HTMLElement | null = null;

  public static async show(book: RawBookData) {
    this.close();

    const age = calculateAge(book.publicationDate);
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

    const history = await db.getObservationsForBook(book.asin);
    const isSaved = await db.isWatchlisted(book.asin);

    const backdrop = document.createElement('div');
    backdrop.className = 'bookintel-modal-backdrop';
    backdrop.id = 'bookintel-active-modal';

    const modalWindow = document.createElement('div');
    modalWindow.className = 'bookintel-modal-window';

    // SVG Chart do histórico de BSR
    const chartSvg = this.generateBsrChartSvg(history, book.bsr);

    modalWindow.innerHTML = `
      <div class="bookintel-modal-header">
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px;">
            BookIntel • Análise Detalhada
          </div>
          <h2 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #fff; line-height: 1.3;">
            ${this.escape(book.title)}
          </h2>
          <div style="font-size: 13px; color: #8b96ad; margin-top: 4px;">
            por <strong style="color: #cbd5e1;">${this.escape(book.author || 'Autor')}</strong>
          </div>
        </div>
        <button class="bookintel-close-btn" id="bookintel-modal-close" title="Fechar">✕</button>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;">
        ${book.coverImage ? `
          <div style="flex-shrink: 0; text-align: center;">
            <img src="${book.coverImage}" alt="Capa" style="width: 120px; height: auto; border-radius: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); border: 1px solid #2a3244;" />
          </div>
        ` : ''}

        <div style="flex: 1; min-width: 250px;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: #1a1e28; padding: 14px; border-radius: 8px; border: 1px solid #2a3244;">
            <div>
              <span style="font-size: 10px; color: #8b96ad; text-transform: uppercase;">ASIN</span>
              <div style="font-size: 13px; font-weight: 700; color: #f0f3fa;">${book.asin}</div>
            </div>
            <div>
              <span style="font-size: 10px; color: #8b96ad; text-transform: uppercase;">Formato</span>
              <div style="font-size: 13px; font-weight: 700; color: #60a5fa;">${book.format || 'Kindle'}</div>
            </div>
            <div>
              <span style="font-size: 10px; color: #8b96ad; text-transform: uppercase;">Preço</span>
              <div style="font-size: 13px; font-weight: 700; color: #34d399;">${formatCurrency(book.price, book.currency)}</div>
            </div>
            <div>
              <span style="font-size: 10px; color: #8b96ad; text-transform: uppercase;">Páginas</span>
              <div style="font-size: 13px; font-weight: 700; color: #f0f3fa;">${book.pages ? `${book.pages} pág.` : 'N/D'}</div>
            </div>
            <div>
              <span style="font-size: 10px; color: #8b96ad; text-transform: uppercase;">Avaliações</span>
              <div style="font-size: 13px; font-weight: 700; color: #f0f3fa;">
                ${book.reviewCount ? `${formatNumber(book.reviewCount)} (${book.rating || 'N/D'} ★)` : 'N/D'}
              </div>
            </div>
            <div>
              <span style="font-size: 10px; color: #8b96ad; text-transform: uppercase;">Idade do Livro</span>
              <div style="font-size: 13px; font-weight: 700; color: #f0f3fa;">${age?.formatted || 'N/D'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estimativas Principais -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: #1a1e28; padding: 12px; border-radius: 8px; border: 1px solid #2a3244;">
          <div style="font-size: 10px; color: #8b96ad; display: flex; justify-content: space-between;">
            <span>BSR GERAL</span>
            <span class="bookintel-badge bookintel-badge-obs">OBSERVADO</span>
          </div>
          <div style="font-size: 16px; font-weight: 800; color: #60a5fa; margin-top: 4px;">
            ${formatBsr(book.bsr)}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">na Amazon</div>
        </div>

        <div style="background: #1a1e28; padding: 12px; border-radius: 8px; border: 1px solid #2a3244;">
          <div style="font-size: 10px; color: #8b96ad; display: flex; justify-content: space-between;">
            <span>VENDAS EST.</span>
            <span class="bookintel-badge bookintel-badge-est">ESTIMATIVA</span>
          </div>
          <div style="font-size: 16px; font-weight: 800; color: #34d399; margin-top: 4px;">
            ${salesEst.estimatedMonthlySales ? `≈ ${formatNumber(salesEst.estimatedMonthlySales)}/mês` : 'N/D'}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            ${salesEst.estimatedDailySales ? `≈ ${formatNumber(salesEst.estimatedDailySales, 1)}/dia` : ''}
          </div>
        </div>

        <div style="background: #1a1e28; padding: 12px; border-radius: 8px; border: 1px solid #2a3244;">
          <div style="font-size: 10px; color: #8b96ad; display: flex; justify-content: space-between;">
            <span>FATURAMENTO</span>
            <span class="bookintel-badge bookintel-badge-est">ESTIMATIVA</span>
          </div>
          <div style="font-size: 16px; font-weight: 800; color: #c084fc; margin-top: 4px;">
            ${(salesEst.estimatedMonthlySales && book.price) 
              ? formatCurrency(salesEst.estimatedMonthlySales * book.price, book.currency) 
              : 'N/D'}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">por mês</div>
        </div>

        <div style="background: #1a1e28; padding: 12px; border-radius: 8px; border: 1px solid #2a3244;">
          <div style="font-size: 10px; color: #8b96ad; display: flex; justify-content: space-between;">
            <span>ROYALTY EST.</span>
            <span class="bookintel-badge bookintel-badge-est">ESTIMATIVA</span>
          </div>
          <div style="font-size: 16px; font-weight: 800; color: #f59e0b; margin-top: 4px;">
            ${formatCurrency(royaltyEst.estimatedMonthlyRoyalty, book.currency)}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${royaltyEst.royaltyRateFormatted}</div>
        </div>
      </div>

      <!-- Opportunity Score -->
      <div style="background: #1a1e28; padding: 14px; border-radius: 8px; border: 1px solid #2a3244; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <span style="font-size: 12px; font-weight: 700; color: #fff;">Opportunity Score:</span>
            <span style="font-size: 15px; font-weight: 800; color: ${oppScore.score >= 70 ? '#10b981' : oppScore.score >= 40 ? '#f59e0b' : '#ef4444'}; margin-left: 6px;">
              ${oppScore.score}/100
            </span>
          </div>
          <span style="font-size: 11px; color: #8b96ad;">${oppScore.explanation}</span>
        </div>
        <div class="bookintel-score-bar-bg">
          <div class="bookintel-score-bar-fill" style="width: ${oppScore.score}%; background: ${oppScore.score >= 70 ? '#10b981' : oppScore.score >= 40 ? '#f59e0b' : '#ef4444'};"></div>
        </div>
      </div>

      <!-- Histórico de BSR -->
      <div style="background: #1a1e28; padding: 14px; border-radius: 8px; border: 1px solid #2a3244; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #fff;">
            📈 Histórico de Posição (BSR)
          </h4>
          <span style="font-size: 11px; color: #8b96ad;">
            ${history.length} observação(ões) registrada(s)
          </span>
        </div>
        ${chartSvg}
        <div style="font-size: 10px; color: #64748b; margin-top: 8px; text-align: center;">
          * Histórico construído estritamente a partir das observações realizadas no seu navegador. Nenhum dado inventado.
        </div>
      </div>

      <!-- Ações do Modal -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding-top: 10px; border-top: 1px solid #2a3244;">
        <div style="display: flex; gap: 8px;">
          <button class="bookintel-btn ${isSaved ? 'active' : ''}" id="bookintel-modal-save">
            ${isSaved ? '★ Salvo na Watchlist' : '☆ Salvar na Watchlist'}
          </button>
          <button class="bookintel-btn" id="bookintel-modal-export">
            📥 Exportar Histórico (CSV)
          </button>
        </div>

        <button class="bookintel-btn" id="bookintel-modal-dash" style="background: #3b82f6; color: #fff; border-color: #2563eb;">
          Abrir no Dashboard ➔
        </button>
      </div>
    `;

    backdrop.appendChild(modalWindow);
    document.body.appendChild(backdrop);
    this.activeModalEl = backdrop;

    // Event Listeners
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    const closeBtn = modalWindow.querySelector('#bookintel-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const saveBtn = modalWindow.querySelector('#bookintel-modal-save') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const currentlySaved = await db.isWatchlisted(book.asin);
        if (currentlySaved) {
          await db.removeFromWatchlist(book.asin);
          saveBtn.classList.remove('active');
          saveBtn.innerText = '☆ Salvar na Watchlist';
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
          saveBtn.classList.add('active');
          saveBtn.innerText = '★ Salvo na Watchlist';
        }
      });
    }

    const exportBtn = modalWindow.querySelector('#bookintel-modal-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        exportBsrHistoryToCsv(history, book.asin);
      });
    }

    const dashBtn = modalWindow.querySelector('#bookintel-modal-dash');
    if (dashBtn) {
      dashBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD', asin: book.asin });
        }
      });
    }
  }

  public static close() {
    if (this.activeModalEl) {
      this.activeModalEl.remove();
      this.activeModalEl = null;
    }
  }

  private static escape(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  private static generateBsrChartSvg(history: Observation[], currentBsr?: number): string {
    const points = [...history];
    if (points.length === 0 && currentBsr) {
      points.push({
        asin: '',
        marketplace: 'amazon.com.br',
        timestamp: Date.now(),
        bsr: currentBsr,
        confidence: 'ALTA',
        modelVersion: 'v1'
      });
    }

    if (points.length < 2) {
      return `
        <div style="padding: 30px; text-align: center; color: #8b96ad; font-size: 12px; background: #12151c; border-radius: 6px;">
          Primeira observação registrada para este livro (BSR: ${currentBsr ? formatBsr(currentBsr) : 'N/D'}).<br/>
          O gráfico histórico será traçado à medida que novas observações forem feitas.
        </div>
      `;
    }

    const width = 680;
    const height = 160;
    const padding = 30;

    const validPoints = points.filter(p => p.bsr && p.bsr > 0);
    if (validPoints.length < 2) {
      return `<div style="padding: 20px; text-align: center; color: #8b96ad;">Histórico insuficiente de BSR.</div>`;
    }

    const bsrValues = validPoints.map(p => p.bsr as number);
    const minBsr = Math.min(...bsrValues);
    const maxBsr = Math.max(...bsrValues);

    const minTime = validPoints[0].timestamp;
    const maxTime = validPoints[validPoints.length - 1].timestamp;
    const timeDiff = Math.max(1, maxTime - minTime);

    // EIXO INVERTIDO: BSR menor no topo (y menor = rank melhor)
    const getY = (bsr: number) => {
      if (maxBsr === minBsr) return height / 2;
      return padding + ((bsr - minBsr) / (maxBsr - minBsr)) * (height - padding * 2);
    };

    const getX = (time: number) => {
      return padding + ((time - minTime) / timeDiff) * (width - padding * 2);
    };

    const svgPoints = validPoints.map(p => `${getX(p.timestamp)},${getY(p.bsr as number)}`).join(' ');

    return `
      <div style="background: #12151c; border-radius: 6px; padding: 10px; overflow-x: auto;">
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block;">
          <!-- Linhas de grade e referências -->
          <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="#2a3244" stroke-dasharray="3" />
          <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#2a3244" stroke-dasharray="3" />
          
          <!-- Rótulos do Eixo Y (BSR Invertido) -->
          <text x="${padding}" y="${padding - 8}" fill="#10b981" font-size="10" font-weight="700">Melhor: #${formatNumber(minBsr)}</text>
          <text x="${padding}" y="${height - padding + 16}" fill="#ef4444" font-size="10" font-weight="700">Pior: #${formatNumber(maxBsr)}</text>

          <!-- Linha do Gráfico -->
          <polyline fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${svgPoints}" />

          <!-- Círculos nos pontos -->
          ${validPoints.map(p => `
            <circle cx="${getX(p.timestamp)}" cy="${getY(p.bsr as number)}" r="4" fill="#60a5fa" stroke="#12151c" stroke-width="2" />
          `).join('')}
        </svg>
      </div>
    `;
  }
}
