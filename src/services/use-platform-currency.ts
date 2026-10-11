import { useTranslation } from './i18n-service';
import {
  DisplayCurrency,
  PlatformProductId,
  currencyFromBrazilFlag,
  formatMoney,
  formatPlatformProductPrice,
  formatUsdBasedPrice,
  resolveChargeCurrency
} from './platform-currency';

/**
 * Hook React que expõe a moeda de exibição do visitante (BRL no Brasil, USD
 * nos demais países) e formatadores prontos para qualquer tela da plataforma.
 */
export function usePlatformCurrency() {
  const { isBrazil, regionResolved } = useTranslation();
  const currency: DisplayCurrency = currencyFromBrazilFlag(isBrazil);
  const chargeCurrency = resolveChargeCurrency(currency);

  return {
    currency,
    chargeCurrency,
    chargeDiffersFromDisplay: chargeCurrency !== currency,
    regionResolved,
    formatAmount: (amount: number) => formatMoney(amount, currency),
    formatProduct: (productId: PlatformProductId) => formatPlatformProductPrice(productId, currency),
    formatUsdBased: (usdAmount: number) => formatUsdBasedPrice(usdAmount, currency)
  };
}
