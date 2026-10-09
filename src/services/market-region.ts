const GEOLOCATION_ENDPOINT = 'https://ipapi.co/json/';
const GEOLOCATION_TIMEOUT_MS = 5000;

let visitorCountryRequest: Promise<string> | null = null;

async function requestVisitorCountry(fetcher: typeof fetch): Promise<string> {
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
      console.warn('Visitor country detection failed; using the international default.', error);
      throw error;
    });
  }
  return visitorCountryRequest;
}

export function isBrazilianCountry(countryCode: string | null): boolean {
  return countryCode === 'BR';
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
