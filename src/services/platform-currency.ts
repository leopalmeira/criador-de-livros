// ============================================================================
// BOOKENGIN — REGRA CENTRAL DE MOEDA DA PLATAFORMA
// ----------------------------------------------------------------------------
// Fonte única de verdade para exibir preços da própria plataforma
// (assinatura, pacotes de créditos e qualquer valor comercial do BookEngin).
//
// Regra:
//   • Visitante no Brasil  → BRL, formato pt-BR  (ex.: R$ 49,90)
//   • Qualquer outro país  → USD, formato en-US  (ex.: $25.00)
//
// O país vem da detecção feita pelo servidor (/api/geo, cabeçalhos de CDN),
// com fallback para provedor de geolocalização e, por último, fuso horário.
// O idioma escolhido NÃO define a moeda: um brasileiro usando a interface em
// inglês continua vendo valores em reais.
//
// Importante: valores de mercado da Amazon (preço de capa, royalties por
// marketplace) NÃO passam por aqui — eles seguem a moeda do marketplace.
// ============================================================================

export type DisplayCurrency = 'BRL' | 'USD';

const CURRENCY_LOCALE: Record<DisplayCurrency, string> = {
  BRL: 'pt-BR',
  USD: 'en-US'
};

/**
 * Moedas que o processamento de pagamento aceita cobrar.
 * Se um dia o gateway não suportar BRL, basta remover 'BRL' daqui: a
 * interface continuará exibindo reais como referência, mas avisará que a
 * cobrança será feita em dólares.
 */
export const SUPPORTED_CHARGE_CURRENCIES: readonly DisplayCurrency[] = ['BRL', 'USD'];

/**
 * Regra de preço regional para o Brasil (não é câmbio livre).
 * BRL = arredonda (USD × fator) para cima e termina em ,90.
 * Ex.: US$ 25 → R$ 49,90 · US$ 3 → R$ 5,90 · US$ 15 → R$ 29,90.
 */
export const BRL_REGIONAL_PRICE_FACTOR = 2;

export function regionalBrlPrice(usdAmount: number): number {
  if (!Number.isFinite(usdAmount) || usdAmount <= 0) return 0;
  const rounded = Math.ceil(usdAmount * BRL_REGIONAL_PRICE_FACTOR) - 0.1;
  return Math.round(Math.max(0.9, rounded) * 100) / 100;
}

export type PlatformProductId = 'subscription_monthly' | 'pack_1' | 'pack_5' | 'pack_10';

/**
 * Tabela comercial explícita por moeda. Valores BRL seguem a regra regional
 * acima e estão fixados aqui para que nenhuma tela calcule preços por conta própria.
 */
export const PLATFORM_PRICE_TABLE: Record<PlatformProductId, Record<DisplayCurrency, number>> = {
  subscription_monthly: { USD: 25.0, BRL: 49.9 },
  pack_1: { USD: 3.0, BRL: 5.9 },
  pack_5: { USD: 15.0, BRL: 29.9 },
  pack_10: { USD: 30.0, BRL: 59.9 }
};

export function resolveDisplayCurrency(countryCode: string | null | undefined): DisplayCurrency {
  return typeof countryCode === 'string' && countryCode.trim().toUpperCase() === 'BR' ? 'BRL' : 'USD';
}

export function currencyFromBrazilFlag(isBrazil: boolean): DisplayCurrency {
  return isBrazil ? 'BRL' : 'USD';
}

/**
 * Moeda efetivamente cobrada. Nunca promete uma moeda que o gateway não aceita.
 */
export function resolveChargeCurrency(displayCurrency: DisplayCurrency): DisplayCurrency {
  return SUPPORTED_CHARGE_CURRENCIES.includes(displayCurrency) ? displayCurrency : 'USD';
}

const formatterCache = new Map<DisplayCurrency, Intl.NumberFormat>();

export function formatMoney(amount: number, currency: DisplayCurrency): string {
  let formatter = formatterCache.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    formatterCache.set(currency, formatter);
  }
  return formatter.format(Number.isFinite(amount) ? amount : 0);
}

export function getPlatformPrice(productId: PlatformProductId, currency: DisplayCurrency): number {
  return PLATFORM_PRICE_TABLE[productId][currency];
}

export function formatPlatformProductPrice(productId: PlatformProductId, currency: DisplayCurrency): string {
  return formatMoney(getPlatformPrice(productId, currency), currency);
}

/**
 * Converte um valor comercial definido em USD para a moeda de exibição,
 * usando a tabela quando o valor corresponde a um produto conhecido e a regra
 * regional nos demais casos.
 */
export function formatUsdBasedPrice(usdAmount: number, currency: DisplayCurrency): string {
  if (currency === 'USD') return formatMoney(usdAmount, 'USD');
  const known = (Object.keys(PLATFORM_PRICE_TABLE) as PlatformProductId[])
    .find(id => PLATFORM_PRICE_TABLE[id].USD === usdAmount);
  return formatMoney(known ? PLATFORM_PRICE_TABLE[known].BRL : regionalBrlPrice(usdAmount), 'BRL');
}
