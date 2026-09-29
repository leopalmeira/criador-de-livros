// Moldura e Card Estatístico Completo em Volta do Livro (Idêntico ao CoAuthor.ai)
// Envolve a capa de cada livro nos resultados de pesquisa com métricas reais de BSR, vendas, royalties, páginas e idade.

import { RawBookData } from '../types';
import { bsrResolver, ResolvedBookEstimate } from '../services/bsr-resolver';
import { formatCurrency, formatBsr, formatNumber, formatCompactAge } from '../utils/formatters';
import { DetailModal } from './detail-modal';

export class EstimateBox {
  public static inject(cardEl: Element, book: RawBookData) {
    if (!cardEl || !book || !book.asin) {
      return;
    }

    // Evita duplicações
    if (
      cardEl.classList.contains('bookintel-card-frame') ||
      cardEl.hasAttribute('data-bi-injected') ||
      cardEl.querySelector('.bookintel-card-frame') ||
      cardEl.closest('.bookintel-card-frame') ||
      document.querySelector(`.bookintel-card-frame[data-bi-asin="${book.asin}"]`)
    ) {
      return;
    }

    cardEl.setAttribute('data-bi-injected', 'true');

    // Localiza o container da imagem da capa do livro
    const imgContainer = this.findImageContainer(cardEl);

    // Formato e badges iniciais
    const isKindle = (book.format || '').toLowerCase().includes('kindle');
    const formatText = (book.format || (isKindle ? 'Kindle' : 'Paperback')).toUpperCase();
    const rankLabel = isKindle ? 'Kindle Rank' : 'Books BSR';
    const rankCategory = isKindle ? 'in Kindle Store' : 'in Books';

    // Cria a moldura completa envolta da capa
    const frame = document.createElement('div');
    frame.className = 'bookintel-card-frame';
    frame.setAttribute('data-bi-box', 'true');
    frame.setAttribute('data-bi-asin', book.asin);

    frame.innerHTML = `
      <!-- Topo: Header com Logo & Badge do Formato -->
      <div class="bi-frame-header">
        <div class="bi-frame-brand">
          <svg class="bi-frame-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#3b82f6" stroke="#2563eb"/>
          </svg>
          <span class="bi-frame-title">BookIntel<span style="color:#2563eb">.ai</span></span>
        </div>
        <span class="bi-frame-badge ${isKindle ? 'badge-kindle' : 'badge-paperback'}">
          ${formatText}
        </span>
      </div>

      <!-- Topo: Estatísticas de Rank, Vendas e Royalties -->
      <div class="bi-frame-kpi-block">
        <div class="bi-frame-rank-label">${rankLabel}</div>
        <div class="bi-frame-bsr-line">
          <span class="bi-frame-dot"></span>
          <span class="bi-frame-bsr-val">${book.bsr ? `#${formatNumber(book.bsr, 0)} ${rankCategory}` : '<span class="bi-calc-text">● analisando...</span>'}</span>
        </div>
        <div class="bi-frame-sales-val">
          <span class="bi-num-green">...</span> <span class="bi-label-sub">Sales/Day</span>
        </div>
        <div class="bi-frame-royalty-val">
          <span class="bi-num-gold">...</span> <span class="bi-label-sub">Royalty/Day</span>
        </div>
        <div class="bi-frame-revenue-bar" title="Estimativas de vendas e faturamento da semana e do mês">
          <span class="bi-frame-rev-tag"><span class="bi-rev-tag-lbl">Sem:</span> <strong class="bi-rev-sem-sales">...</strong></span>
          <span class="bi-frame-rev-tag"><span class="bi-rev-tag-lbl">Mês:</span> <strong class="bi-rev-mes-sales">...</strong></span>
          <span class="bi-frame-rev-tag"><span class="bi-rev-tag-lbl">Fat/mês:</span> <strong class="bi-rev-mes-fat">...</strong></span>
        </div>
      </div>

      <!-- Meio: Contêiner da Imagem da Capa do Livro -->
      <div class="bi-frame-middle" id="bi-frame-middle-${book.asin}">
        <!-- A imagem da Amazon será inserida aqui -->
      </div>

      <!-- Base: ASIN, Páginas, Idade e Botões de Ação -->
      <div class="bi-frame-bottom">
        <div class="bi-frame-asin-row">
          <span class="bi-frame-asin-text">ASIN: <strong>${book.asin}</strong></span>
          <button class="bi-frame-copy-btn" title="Copiar ASIN">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="bi-frame-link-btn" title="Abrir página do livro">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </button>
        </div>

        <div class="bi-frame-details-row">
          <span>Pages: <strong class="bi-details-pages">${book.pages || '...'}</strong></span>
          <span style="margin: 0 4px; color: #cbd5e1;">•</span>
          <span>Age: <strong class="bi-details-age">${formatCompactAge(book.publicationDate)?.compact || '...'}</strong></span>
        </div>

        <div class="bi-frame-buttons-row">
          <button class="bi-frame-btn bi-btn-trend">
            <span>📈</span>
            <span>BSR Trend</span>
          </button>
          <button class="bi-frame-btn bi-btn-analyze">
            <span>✨</span>
            <span>Analyze Book</span>
          </button>
        </div>
      </div>
    `;

    // Inserção da moldura envolvendo a capa do livro
    if (imgContainer && imgContainer.parentElement) {
      const parent = imgContainer.parentElement;
      parent.insertBefore(frame, imgContainer);
      const middleSlot = frame.querySelector(`#bi-frame-middle-${book.asin}`);
      if (middleSlot) {
        middleSlot.appendChild(imgContainer);
      }
    } else {
      // Fallback: insere no topo do card
      cardEl.prepend(frame);
    }

    // Configura eventos dos botões
    this.setupFrameEvents(frame, book);

    // Texto de "X compras no mês passado" se houver
    const boughtText = this.findBoughtPastMonthText(cardEl);

    // Dispara resolução real de BSR e metadados
    bsrResolver.resolve(
      book.asin,
      book.url,
      book.marketplace,
      book.price,
      book.currency,
      book.format,
      book.bsr,
      boughtText,
      (resolved: ResolvedBookEstimate) => {
        this.updateFrameContent(frame, resolved);
      }
    );
  }

  /**
   * Localiza o elemento da capa do livro no DOM da Amazon
   */
  private static findImageContainer(cardEl: Element): Element | null {
    // 1. Container de imagem do produto no padrão moderno da Amazon
    const primary = cardEl.querySelector(
      '.s-product-image-container, span[data-component-type="s-product-image"], .s-image-container, .a-section.a-spacing-base a.a-link-normal, a.a-link-normal.s-no-outline'
    );
    if (primary) return primary;

    // 2. Elemento img diretamente
    const img = cardEl.querySelector('img.s-image, img.s-access-image');
    if (img && img.parentElement) {
      return img.parentElement;
    }

    return null;
  }

  /**
   * Configuração de eventos interativos da moldura
   */
  private static setupFrameEvents(frame: HTMLElement, book: RawBookData) {
    // Copiar ASIN
    const copyBtn = frame.querySelector('.bi-frame-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(book.asin);
        copyBtn.innerHTML = '✓';
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
        }, 1200);
      });
    }

    // Link externo para a página do livro
    const linkBtn = frame.querySelector('.bi-frame-link-btn');
    if (linkBtn) {
      linkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = book.url || `${window.location.origin}/dp/${book.asin}`;
        window.open(url, '_blank');
      });
    }

    // Botão 📈 BSR Trend -> Abre modal analítico com o gráfico histórico
    const trendBtn = frame.querySelector('.bi-btn-trend');
    if (trendBtn) {
      trendBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        DetailModal.show(book);
      });
    }

    // Botão ✨ Analyze Book -> Abre o Dashboard completo na aba Criar Livro com o concorrente
    const analyzeBtn = frame.querySelector('.bi-btn-analyze');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'OPEN_DASHBOARD',
            tab: 'bookCreator',
            idea: `Livro concorrente inspirado no best-seller: "${book.title}"`,
            asin: book.asin
          });
        }
      });
    }
  }

  /**
   * Atualiza o conteúdo da moldura quando os dados reais chegam do resolver
   */
  private static updateFrameContent(frame: HTMLElement, data: ResolvedBookEstimate) {
    if (!frame || !frame.isConnected) return;

    // 1. Atualiza Badge de Formato
    const badge = frame.querySelector('.bi-frame-badge') as HTMLElement;
    if (badge) {
      const isKindle = (data.format || '').toLowerCase().includes('kindle');
      badge.textContent = (data.format || 'PAPERBACK').toUpperCase();
      badge.className = `bi-frame-badge ${isKindle ? 'badge-kindle' : 'badge-paperback'}`;
    }

    // 2. Atualiza Rótulo do Rank (Kindle Rank vs Books BSR)
    const rankLabel = frame.querySelector('.bi-frame-rank-label');
    if (rankLabel) {
      rankLabel.textContent = data.rankLabel || 'Books BSR';
    }

    // 3. Atualiza BSR e Categoria
    const bsrVal = frame.querySelector('.bi-frame-bsr-val');
    if (bsrVal && data.bsr) {
      bsrVal.innerHTML = `#${formatNumber(data.bsr, 0)} <span style="font-weight:400; color:#64748b;">${data.rankCategory}</span>`;
    }

    // 4. Atualiza Vendas Diárias (ex: 31-54 Sales/Day)
    const salesNum = frame.querySelector('.bi-num-green');
    if (salesNum) {
      salesNum.textContent = data.dailySalesRangeStr.replace(' Sales/Day', '');
    }

    // 5. Atualiza Royalties Diários (ex: $151-$252 Royalty/Day)
    const royNum = frame.querySelector('.bi-num-gold');
    if (royNum) {
      royNum.textContent = data.dailyRoyaltyRangeStr.replace(' Royalty/Day', '');
    }

    // 5.1 Atualiza Vendas Semanais, Mensais e Faturamento Mensal
    const semSalesEl = frame.querySelector('.bi-rev-sem-sales');
    if (semSalesEl) {
      const wSales = data.weeklySales || Math.round(data.dailySales * 7);
      semSalesEl.textContent = `${formatNumber(wSales, 0)}`;
    }

    const mesSalesEl = frame.querySelector('.bi-rev-mes-sales');
    if (mesSalesEl) {
      const mSales = data.monthlySales || Math.round(data.dailySales * 30);
      mesSalesEl.textContent = `${formatNumber(mSales, 0)}`;
    }

    const mesFatEl = frame.querySelector('.bi-rev-mes-fat');
    if (mesFatEl) {
      const sym = data.currency === 'BRL' ? 'R$' : data.currency === 'EUR' ? '€' : data.currency === 'GBP' ? '£' : '$';
      const mRev = data.monthlyRevenue || 0;
      mesFatEl.textContent = `${sym}${formatNumber(mRev, 0)}`;
    }

    // 6. Atualiza Páginas
    const pagesEl = frame.querySelector('.bi-details-pages');
    if (pagesEl) {
      pagesEl.textContent = data.pages ? data.pages.toString() : 'N/D';
    }

    // 7. Atualiza Idade
    const ageEl = frame.querySelector('.bi-details-age');
    if (ageEl) {
      ageEl.textContent = data.ageCompact || 'N/D';
    }
  }

  private static findBoughtPastMonthText(cardEl: Element): string | undefined {
    const textEls = cardEl.querySelectorAll(
      '.a-row.a-size-base .a-color-secondary, span.a-size-base.a-color-secondary, .s-item-bought-past-month, .a-size-base.a-color-secondary'
    );
    for (const el of Array.from(textEls)) {
      const text = (el.textContent || '').trim();
      if (
        /compras?\s+no\s+m[êe]s\s+passado/i.test(text) ||
        /bought\s+in\s+past\s+month/i.test(text) ||
        /comprado[s]?\s+el\s+mes\s+pasado/i.test(text) ||
        /im\s+letzten\s+Monat\s+gekauft/i.test(text) ||
        /achet[ée]s?\s+au\s+cours\s+du\s+mois/i.test(text) ||
        /acquistat[io]\s+nell.ultimo\s+mese/i.test(text)
      ) {
        return text;
      }
    }
    return undefined;
  }
}
