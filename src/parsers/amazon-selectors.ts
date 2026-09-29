/**
 * Seletores resilientes com múltiplas camadas de fallback para a Amazon.
 * Atualizado com seletores 2024/2025 para garantir captura real dos dados.
 */

export const AMAZON_SELECTORS = {
  // --- IDENTIFICAÇÃO DO PRODUTO (PÁGINA INDIVIDUAL) ---
  title: [
    '#productTitle',
    '#title',
    '#ebooksProductTitle',
    '#ebooksTitle',
    '.product-title-word-break',
    'h1.a-size-large',
    'h1#title',
    '#title_feature_div span',
    'span#productTitle',
    'meta[property="og:title"]',
    'meta[name="title"]'
  ],

  author: [
    '#bylineInfo .author a.a-link-normal',
    '#bylineInfo .author .a-link-normal',
    '#bylineInfo a.contributorNameID',
    '#bylineInfo .author',
    '#bylineInfo',
    'span.author a.a-link-normal',
    'span.author a',
    '.contributorNameID',
    '#authorFollow_feature_div .author',
    '.author a',
    '.author'
  ],

  price: [
    '#kindle-price',
    '#price',
    '.a-price .a-offscreen',
    '#corePrice_desktop .a-price .a-offscreen',
    '#corePrice_feature_div .a-price .a-offscreen',
    '#corePrice_desktop span.a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '#priceblock_saleprice',
    '.swatchElement.selected .slot-price span',
    '.swatchElement.selected .a-color-base',
    '#tmm-grid-swatch-KINDLE .slot-price',
    '#tmm-grid-swatch-PAPERBACK .slot-price',
    '#tmm-grid-swatch-HARDCOVER .slot-price',
    '#actualPriceValue',
    '#newBuyBoxPrice',
    '#tmmSwatches .selected .a-color-price',
    '.kindle-price .a-text-price .a-offscreen',
    'span[data-action="show-all-offers-display"] .a-offscreen'
  ],

  rating: [
    '#acrPopover span.a-icon-alt',
    '#acrPopover title',
    'i.a-icon-star span.a-icon-alt',
    '#averageCustomerReviews .a-icon-alt',
    'span[data-hook="rating-out-of-text"]',
    '#acrPopover .a-declarative .a-icon-alt',
    '#cmrsSummary-popover .a-icon-alt'
  ],

  reviewCount: [
    '#acrCustomerReviewText',
    '#averageCustomerReviews #acrCustomerReviewText',
    'span[data-hook="total-review-count"]',
    '#reviewsMedley [data-hook="total-review-count"]',
    '#acrCustomerReviewLink .a-size-base',
    '#ratings-summary .a-size-base'
  ],

  detailsBullets: [
    '#detailBullets_feature_div',
    '#detailBulletsWrapper_feature_div',
    '#productDetails_db_sections',
    '#productDetailsTable',
    '#detailBullets_secondary_view_div',
    '#detail-bullets',
    '#prodDetails',
    '#productDetails_techSpec_section_1',
    '#productDetails_techSpec_section_2'
  ],

  coverImage: [
    '#landingImage',
    '#ebooksLandingImage',
    '#imgBlkFront',
    '#main-image',
    '#ebooksImgBlkFront',
    '#imageBlock img',
    'img#landingImage',
    'meta[property="og:image"]'
  ],

  // --- RESULTADOS DE PESQUISA E CATEGORIAS ---
  searchResultCard: [
    'div[data-component-type="s-search-result"]',
    '.s-result-item[data-asin]:not([data-asin=""])',
    'div[data-asin]:not([data-asin=""]):not([data-asin=" "]):not(.bookintel-card-frame)',
    '.puis-card-container'
  ],

  cardTitle: [
    'h2 a span',
    'h2 a',
    '.a-size-medium.a-color-base.a-text-normal',
    '.a-size-base-plus.a-color-base.a-text-normal',
    'h2 .a-link-normal span',
    '.s-title-instructions-style span'
  ],

  cardAuthor: [
    '.a-row.a-size-base.a-color-secondary .a-size-base:first-child',
    '.a-row.a-size-base.a-color-secondary .a-size-base',
    '.a-row.a-size-base.a-color-secondary',
    'div.a-row .a-size-base+ .a-size-base',
    '.s-line-clamp-1 .a-size-base',
    '.a-color-secondary .a-size-base.a-link-normal'
  ],

  cardPrice: [
    '.a-price .a-offscreen',
    'span.a-price span.a-offscreen',
    '.a-color-price',
    '.a-price-whole',
    '.s-price-instructions-style .a-offscreen'
  ],

  cardRating: [
    'i.a-icon-star-small span.a-icon-alt',
    'i.a-icon-star span.a-icon-alt',
    '.a-icon-alt',
    '.a-icon-star-mini span.a-icon-alt'
  ],

  cardReviews: [
    'span.a-size-base.s-underline-text',
    'a[href*="#customerReviews"] span',
    'span.s-underline-text',
    '.a-size-base.s-underline-text'
  ],

  cardCover: [
    'img.s-image',
    '.s-product-image-container img',
    '.s-image-squish img',
    'img.s-latency-cf-section'
  ],

  cardFormatBadge: [
    '.a-row.a-size-base.a-color-base .a-text-bold',
    'a.a-size-base.a-link-normal.s-underline-text.s-underline-link-text.s-link-style.a-text-bold',
    '.a-badge-text',
    '.a-text-bold.a-size-base',
    '.s-link-centralized-style .a-text-bold'
  ],

  // Lista de Mais Vendidos (Best Sellers)
  bestsellerCard: [
    'div[id*="p13n-asin-index"]',
    '.zg-grid-general-faceout',
    'div[data-asin]:has(.zg-bdg-text)',
    '.a-cardui .zg-grid-general-faceout',
    '#gridItemRoot'
  ],

  bestsellerBadge: [
    '.zg-bdg-text',
    'span.zg-badge-text',
    'span.zg-banner',
    '.zg-badge-text'
  ]
};
