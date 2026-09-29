import { RawBookData, NicheSummary, Marketplace } from '../types';
import { NicheAnalytics, BookAnalyticsInput } from '../estimators/niche-analytics';
import { defaultSalesEstimator } from '../estimators/sales-estimation-model';
import { formatCurrency, formatNumber, formatBsr, calculateAge } from '../utils/formatters';
import { exportBooksToCsv } from '../utils/export-import';
import { db } from '../database/local-database';

export class NicheBar {
  private static instance: HTMLElement | null = null;
  private static currentSummary: NicheSummary | null = null;
  private static rawBooksList: RawBookData[] = [];

  public static update(books: RawBookData[], keyword: string, marketplace: Marketplace) {
    if (books.length === 0) return;
    this.rawBooksList = books;

    // Converte RawBookData em BookAnalyticsInput
    const analyticsInput: BookAnalyticsInput[] = books.map(b => {
      const age = calculateAge(b.publicationDate);
      const est = defaultSalesEstimator.estimate({
        marketplace: b.marketplace,
        bsr: b.bsr,
        format: b.format,
        price: b.price
      });

      return {
        asin: b.asin,
        title: b.title,
        author: b.author || 'Autor Não Identificado',
        bsr: b.bsr,
        price: b.price,
        rating: b.rating,
        reviewCount: b.reviewCount,
        ageDays: age?.ageDays,
        estimatedDailySales: est.estimatedDailySales,
        estimatedMonthlySales: est.estimatedMonthlySales,
        estimatedMonthlyRevenue: (est.estimatedMonthlySales && b.price) ? est.estimatedMonthlySales * b.price : undefined
      };
    });

    const summary = NicheAnalytics.analyze(analyticsInput, keyword, window.location.href, marketplace);
    this.currentSummary = summary;

    if (!this.instance) {
      this.createBar();
    }
    this.render(summary);
  }

  private static createBar() {
    const bar = document.createElement('div');
    bar.className = 'bookintel-niche-bar-floating';
    bar.id = 'bookintel-niche-bar';
    document.body.appendChild(bar);
    this.instance = bar;
  }

  private static render(summary: NicheSummary) {
    if (!this.instance) return;

    const compColor = 
      summary.competitionLevel === 'BAIXA' ? '#10b981' : 
      summary.competitionLevel === 'MÉDIA' ? '#f59e0b' : '#ef4444';

    this.instance.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
        <div style="border-right: 1px solid #2a3244; padding-right: 12px;">
          <div style="font-size: 11px; font-weight: 800; color: #3b82f6; display: flex; align-items: center; gap: 4px;">
            <span>⚡ NICHO:</span>
            <span style="color: #fff; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${summary.keyword || 'Página Atual'}
            </span>
          </div>
          <div style="font-size: 10px; color: #8b96ad; margin-top: 2px;">
            ${summary.totalBooks} livros analisados
          </div>
        </div>

        <div class="bookintel-niche-stat">
          <span class="bookintel-niche-stat-label">BSR Mediano</span>
          <span class="bookintel-niche-stat-val" style="color: #60a5fa;">
            ${summary.medianBsr ? formatBsr(summary.medianBsr) : 'N/D'}
          </span>
        </div>

        <div class="bookintel-niche-stat">
          <span class="bookintel-niche-stat-label">Preço Mediano</span>
          <span class="bookintel-niche-stat-val" style="color: #34d399;">
            ${summary.medianPrice ? formatCurrency(summary.medianPrice) : 'N/D'}
          </span>
        </div>

        <div class="bookintel-niche-stat">
          <span class="bookintel-niche-stat-label">Reviews Medianos</span>
          <span class="bookintel-niche-stat-val" style="color: #f0f3fa;">
            ${summary.medianReviews ? formatNumber(summary.medianReviews) : 'N/D'}
          </span>
        </div>

        <div class="bookintel-niche-stat">
          <span class="bookintel-niche-stat-label">Faturamento / Mês</span>
          <span class="bookintel-niche-stat-val" style="color: #c084fc;">
            ${formatCurrency(summary.totalEstimatedMonthlyRevenue)}
          </span>
        </div>

        <div class="bookintel-niche-stat" style="border-left: 1px solid #2a3244; padding-left: 12px;">
          <span class="bookintel-niche-stat-label">Concorrência</span>
          <span class="bookintel-niche-stat-val" style="color: ${compColor};">
            ${summary.competitionLevel} (${summary.competitionScore}/100)
          </span>
        </div>

        <div class="bookintel-niche-stat">
          <span class="bookintel-niche-stat-label">Concentração Top 3</span>
          <span class="bookintel-niche-stat-val" style="color: #f59e0b;">
            ${summary.concentrationTop3}% das vendas
          </span>
        </div>
      </div>

      <div style="display: flex; gap: 8px; align-items: center; border-left: 1px solid #2a3244; padding-left: 12px;">
        <button class="bookintel-btn" id="bookintel-niche-snapshot" title="Salvar Snapshot do Nicho para Comparação">
          📸 Snapshot
        </button>
        <button class="bookintel-btn" id="bookintel-niche-export" title="Exportar Todos os Livros em CSV">
          📥 Exportar
        </button>
        <button class="bookintel-btn" id="bookintel-niche-toggle" title="Minimizar">
          _
        </button>
      </div>
    `;

    // Eventos
    const snapshotBtn = this.instance.querySelector('#bookintel-niche-snapshot');
    if (snapshotBtn) {
      snapshotBtn.addEventListener('click', async () => {
        if (!this.currentSummary) return;
        const snapshotId = `snap_${Date.now()}`;
        await db.saveNicheSnapshot({
          id: snapshotId,
          name: this.currentSummary.keyword || `Pesquisa em ${new Date().toLocaleDateString('pt-BR')}`,
          keyword: this.currentSummary.keyword || 'sem_palavra_chave',
          timestamp: Date.now(),
          marketplace: this.currentSummary.marketplace,
          summary: this.currentSummary,
          books: this.rawBooksList.map(b => {
            const est = defaultSalesEstimator.estimate({
              marketplace: b.marketplace,
              bsr: b.bsr,
              format: b.format,
              price: b.price
            });
            return {
              asin: b.asin,
              title: b.title,
              author: b.author || 'Autor Não Identificado',
              bsr: b.bsr,
              price: b.price,
              rating: b.rating,
              reviews: b.reviewCount,
              format: b.format,
              dailySales: est.estimatedDailySales || undefined,
              monthlyRevenue: (est.estimatedMonthlySales && b.price) ? est.estimatedMonthlySales * b.price : undefined
            };
          })
        });
        snapshotBtn.textContent = '✓ Gravado!';
        setTimeout(() => {
          if (snapshotBtn) snapshotBtn.textContent = '📸 Snapshot';
        }, 2000);
      });
    }

    const exportBtn = this.instance.querySelector('#bookintel-niche-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        exportBooksToCsv(this.rawBooksList, `nicho-${(summary.keyword || 'pesquisa').replace(/\s+/g, '-')}.csv`);
      });
    }

    const toggleBtn = this.instance.querySelector('#bookintel-niche-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (this.instance) {
          this.instance.classList.toggle('minimized');
        }
      });
    }
  }
}
