import { afterEach, describe, expect, it, vi } from 'vitest';

describe('market region helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('validates Brazil using the country code, independently of language', async () => {
    const { isBrazilianCountry } = await import('../src/services/market-region');

    expect(isBrazilianCountry('BR')).toBe(true);
    expect(isBrazilianCountry('US')).toBe(false);
    expect(isBrazilianCountry(null)).toBe(false);
  });

  it('formats platform prices in BRL in Brazil and USD elsewhere', async () => {
    const { formatPlatformPrice } = await import('../src/services/market-region');

    expect(formatPlatformPrice(49.9, true)).toContain('49,90');
    expect(formatPlatformPrice(49.9, false)).toBe('US$ 49.90');
  });

  it('normalizes the detected country code and permits retry after failure', async () => {
    const { detectVisitorCountry } = await import('../src/services/market-region');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failedFetcher = vi.fn(async () => new Response(null, { status: 503 }));
    const successfulFetcher = vi.fn(async () => new Response(
      JSON.stringify({ country_code: 'br' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    await expect(detectVisitorCountry(failedFetcher)).rejects.toThrow('HTTP 503');
    expect(await detectVisitorCountry(successfulFetcher)).toBe('BR');
    expect(failedFetcher).toHaveBeenCalledTimes(1);
    expect(successfulFetcher).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
