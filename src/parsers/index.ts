import { BaseAmazonParser } from './amazon-parser';
import { AmazonBRParser } from './amazon-br-parser';
import { AmazonUSParser } from './amazon-us-parser';
import { Marketplace } from '../types';

export function getParserForUrl(url: string): BaseAmazonParser {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const marketplace = detectMarketplaceFromUrl(url);

    if (host.includes('amazon.com.br')) {
      const p = new AmazonBRParser();
      p.marketplace = marketplace;
      return p;
    }

    // Para amazon.com, amazon.co.uk, amazon.ca, amazon.de, amazon.es, amazon.in, etc.
    const p = new AmazonUSParser();
    p.marketplace = marketplace;
    return p;
  } catch {
    return new AmazonUSParser();
  }
}

export function detectMarketplaceFromUrl(url: string): Marketplace {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('amazon.com.br')) return 'amazon.com.br';
    if (host.includes('amazon.co.uk')) return 'amazon.co.uk';
    if (host.includes('amazon.es')) return 'amazon.es';
    if (host.includes('amazon.de')) return 'amazon.de';
    if (host.includes('amazon.fr')) return 'amazon.fr';
    if (host.includes('amazon.it')) return 'amazon.it';
    if (host.includes('amazon.ca')) return 'amazon.ca';
    if (host.includes('amazon.com.mx')) return 'amazon.com.mx';
    if (host.includes('amazon.co.jp')) return 'amazon.co.jp';
    if (host.includes('amazon.in')) return 'amazon.in';
    if (host.includes('amazon.com.au')) return 'amazon.com.au';
    if (host.includes('amazon.nl')) return 'amazon.nl';
    if (host.includes('amazon.pl')) return 'amazon.pl';
    if (host.includes('amazon.se')) return 'amazon.se';
    if (host.includes('amazon.com.be')) return 'amazon.com.be';
    if (host.includes('amazon.ae')) return 'amazon.ae';
    if (host.includes('amazon.sa')) return 'amazon.sa';
    if (host.includes('amazon.sg')) return 'amazon.sg';
    if (host.includes('amazon.eg')) return 'amazon.eg';
    if (host.includes('amazon.com.tr')) return 'amazon.com.tr';
    if (host.includes('amazon.co.za')) return 'amazon.co.za';
    if (host.includes('amazon.com')) return 'amazon.com';
  } catch {}
  return 'amazon.com';
}

export * from './amazon-parser';
export * from './amazon-br-parser';
export * from './amazon-us-parser';
export * from './amazon-selectors';
