export function formatCurrency(value: number | undefined | null, currency: string = 'BRL'): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/D';
  }

  const currencyMap: Record<string, { locale: string; currency: string }> = {
    'BRL': { locale: 'pt-BR', currency: 'BRL' },
    'R$': { locale: 'pt-BR', currency: 'BRL' },
    'USD': { locale: 'en-US', currency: 'USD' },
    '$': { locale: 'en-US', currency: 'USD' },
    'EUR': { locale: 'de-DE', currency: 'EUR' },
    '€': { locale: 'de-DE', currency: 'EUR' },
    'GBP': { locale: 'en-GB', currency: 'GBP' },
    '£': { locale: 'en-GB', currency: 'GBP' },
    'CAD': { locale: 'en-CA', currency: 'CAD' },
    'AUD': { locale: 'en-AU', currency: 'AUD' },
    'MXN': { locale: 'es-MX', currency: 'MXN' },
    'JPY': { locale: 'ja-JP', currency: 'JPY' },
    '¥': { locale: 'ja-JP', currency: 'JPY' },
    'INR': { locale: 'en-IN', currency: 'INR' },
    '₹': { locale: 'en-IN', currency: 'INR' },
    'PLN': { locale: 'pl-PL', currency: 'PLN' },
    'zł': { locale: 'pl-PL', currency: 'PLN' },
    'SEK': { locale: 'sv-SE', currency: 'SEK' },
    'kr': { locale: 'sv-SE', currency: 'SEK' },
    'AED': { locale: 'ar-AE', currency: 'AED' },
    'SAR': { locale: 'ar-SA', currency: 'SAR' },
    'SGD': { locale: 'en-SG', currency: 'SGD' },
    'EGP': { locale: 'ar-EG', currency: 'EGP' },
    'TRY': { locale: 'tr-TR', currency: 'TRY' },
    'TL': { locale: 'tr-TR', currency: 'TRY' },
    '₺': { locale: 'tr-TR', currency: 'TRY' },
    'ZAR': { locale: 'en-ZA', currency: 'ZAR' }
  };

  const config = currencyMap[currency.toUpperCase()] || { locale: 'pt-BR', currency: 'BRL' };

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatNumber(value: number | undefined | null, decimals: number = 0): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/D';
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatCompactNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/D';
  }

  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toString();
}

export function formatBsr(bsr: number | undefined | null): string {
  if (bsr === undefined || bsr === null || isNaN(bsr) || bsr <= 0) {
    return 'N/D';
  }
  return `#${formatNumber(bsr, 0)}`;
}

export function calculateAge(dateStr: string | undefined): { ageDays: number; formatted: string } | null {
  if (!dateStr) return null;

  const date = parseDateString(dateStr);
  if (!date || isNaN(date.getTime())) return null;

  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - date.getTime());
  const ageDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (ageDays < 30) {
    return { ageDays, formatted: `${ageDays} dia${ageDays === 1 ? '' : 's'}` };
  }

  const months = Math.floor(ageDays / 30.44);
  if (months < 12) {
    return { ageDays, formatted: `${months} m${months === 1 ? 'ês' : 'eses'}` };
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return { ageDays, formatted: `${years} ano${years === 1 ? '' : 's'}` };
  }

  return { 
    ageDays, 
    formatted: `${years} ano${years === 1 ? '' : 's'} e ${remainingMonths} m${remainingMonths === 1 ? 'ês' : 'eses'}` 
  };
}

export function formatCompactAge(dateStr: string | undefined): { compact: string; formattedDate: string } | null {
  if (!dateStr) return null;
  const date = parseDateString(dateStr);
  if (!date || isNaN(date.getTime())) return null;

  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - date.getTime());
  const ageDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const months = Math.floor(ageDays / 30.44);
  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  let compact = '';
  if (years > 0) {
    compact = `${years}y ${remMonths}mo`;
  } else if (months > 0) {
    compact = `${months}mo`;
  } else {
    compact = `${ageDays}d`;
  }

  const enMonthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${enMonthsShort[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

  return { compact, formattedDate };
}

export function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  // Testar formato ISO simples
  const iso = new Date(clean);
  if (!isNaN(iso.getTime()) && iso.getFullYear() > 1900 && iso.getFullYear() < 2100) {
    return iso;
  }

  // Português: "15 de janeiro de 2023", "20 mar. 2022", "12/05/2021"
  const ptMonths: Record<string, number> = {
    janeiro: 0, jan: 0,
    fevereiro: 1, fev: 1,
    março: 2, marco: 2, mar: 2,
    abril: 3, abr: 3,
    maio: 4, mai: 4,
    junho: 5, jun: 5,
    julho: 6, jul: 6,
    agosto: 7, ago: 7,
    setembro: 8, set: 8,
    outubro: 9, out: 9,
    novembro: 10, nov: 10,
    dezembro: 11, dez: 11
  };

  const ptMatch = clean.match(/(\d{1,2})\s+(?:de\s+)?([a-zçãé]+)\.?(?:\s+de)?\s+(\d{4})/i);
  if (ptMatch) {
    const day = parseInt(ptMatch[1], 10);
    const monthName = ptMatch[2].toLowerCase();
    const year = parseInt(ptMatch[3], 10);
    const month = ptMonths[monthName];
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  // Inglês: "January 15, 2023", "15 Jan 2023"
  const enMonths: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11
  };

  const enMatch = clean.match(/([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/i);
  if (enMatch) {
    const monthName = enMatch[1].toLowerCase();
    const day = parseInt(enMatch[2], 10);
    const year = parseInt(enMatch[3], 10);
    const month = enMonths[monthName];
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  // Formato dd/mm/yyyy
  const slashMatch = clean.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
  if (slashMatch) {
    const d = parseInt(slashMatch[1], 10);
    const m = parseInt(slashMatch[2], 10) - 1;
    const y = parseInt(slashMatch[3], 10);
    return new Date(y, m, d);
  }

  // Apenas o ano: "2021"
  const yearMatch = clean.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1], 10), 0, 1);
  }

  return null;
}

export const ESTIMATE_TOOLTIP_TEXT = 
  "Este valor é uma estimativa calculada a partir do BSR e parâmetros do modelo de vendas. Não representa informação oficial ou confirmada pela Amazon.";
