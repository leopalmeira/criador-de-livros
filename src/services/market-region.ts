const GEOLOCATION_ENDPOINT = 'https://ipapi.co/json/';
const GEOLOCATION_TIMEOUT_MS = 5000;

let visitorCountryRequest: Promise<string> | null = null;

const BRAZILIAN_TIMEZONES = new Set([
  'America/Sao_Paulo',
  'America/Bahia',
  'America/Fortaleza',
  'America/Recife',
  'America/Belem',
  'America/Manaus',
  'America/Cuiaba',
  'America/Porto_Velho',
  'America/Boa_Vista',
  'America/Rio_Branco',
  'America/Maceio',
  'America/Noronha',
  'America/Campo_Grande',
  'America/Araguaina',
  'America/Eirunepe',
  'America/Santarem'
]);

/**
 * Verifica se o fuso horário ou configuração regional do navegador indica o Brasil
 */
export function isBrowserInBrazil(): boolean {
  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') return false;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (BRAZILIAN_TIMEZONES.has(tz) || tz.toLowerCase().includes('sao_paulo') || tz.toLowerCase().includes('brazil')) {
      return true;
    }
  } catch {}
  return false;
}

async function requestVisitorCountry(fetcher: typeof fetch): Promise<string> {
  // Se estiver no browser e usando o fetch nativo, tenta primeiro o endpoint local rápido /api/geo
  if (typeof window !== 'undefined' && fetcher === fetch) {
    try {
      const geoRes = await fetch('/api/geo', { signal: AbortSignal.timeout(2000) });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData?.country && typeof geoData.country === 'string') {
          return geoData.country.toUpperCase();
        }
      }
    } catch {}
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOLOCATION_TIMEOUT_MS);
  try {
    const response = await fetcher(GEOLOCATION_ENDPOINT, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Geolocation provider returned HTTP ${response.status}.`);
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('country_code' in data)) {
      throw new Error('Geolocation provider returned an invalid country response.');
    }
    const countryCode = String(data.country_code).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      throw new Error('Geolocation provider returned an invalid country code.');
    }
    return countryCode;
  } finally {
    clearTimeout(timeout);
  }
}

export function detectVisitorCountry(fetcher: typeof fetch = fetch): Promise<string> {
  if (!visitorCountryRequest) {
    visitorCountryRequest = requestVisitorCountry(fetcher).catch(error => {
      visitorCountryRequest = null;
      // Se falhou e o fetcher foi o nativo, verifica a timezone local do usuário antes de desistir
      if (fetcher === fetch && isBrowserInBrazil()) {
        return 'BR';
      }
      console.warn('Visitor country detection failed; using the international default.', error);
      throw error;
    });
  }
  return visitorCountryRequest;
}

export function isBrazilianCountry(countryCode: string | null): boolean {
  if (countryCode === 'BR') return true;
  if (!countryCode && typeof window !== 'undefined' && isBrowserInBrazil()) return true;
  return false;
}

export function formatPlatformPrice(amount: number, isBrazil: boolean): string {
  if (isBrazil) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }
  return `US$ ${amount.toFixed(2)}`;
}

export function replacePlatformPrice(text: string, formattedPrice: string): string {
  return text.replace(/R\$\s*49,90|US\$\s*49\.90|49,90\s*€|US\$\s*25(?:\.00)?/g, formattedPrice);
}
