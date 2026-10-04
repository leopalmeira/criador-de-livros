// ================================================================
// MARKET INTELLIGENCE — referências, REFERENCE_SCORE, cache e honestidade de dados
// BSR (ranking de vendas) NÃO é posição de busca. Nunca inventa dado.
// ================================================================
import type { MarketReference } from './project-state';
export type { MarketReference };

export const DATA_UNAVAILABLE = 'Dado não disponível';

/** Normaliza qualquer item vindo da API existente, sem inventar campos ausentes. */
export function normalizeMarketItem(raw: any, ctx: { source: string; collectedAt?: number; rankField?: 'BSR' | 'SEARCH_POSITION' | 'UNKNOWN' }): MarketReference {
  const num = (v: any): number | null => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
  const bsr = num(raw?.bsr ?? raw?.salesRank ?? raw?.bestSellerRank);
  const pos = num(raw?.position ?? raw?.searchPosition ?? raw?.rank);
  let rankType: MarketReference['rankType'] = 'UNKNOWN';
  let rank: number | null = null;
  if (bsr !== null) { rankType = 'BSR'; rank = bsr; }
  else if (pos !== null) { rankType = ctx.rankField === 'BSR' ? 'BSR' : 'SEARCH_POSITION'; rank = pos; }
  return {
    asin: raw?.asin || undefined,
    title: String(raw?.title ?? ''),
    subtitle: raw?.subtitle || undefined,
    author: raw?.author || undefined,
    bsr: rankType === 'BSR' ? rank : null,
    rankType, rank,
    rating: num(raw?.rating),
    reviews: num(raw?.reviewCount ?? raw?.reviews),
    price: num(raw?.price),
    category: raw?.category || raw?.categoryTag || undefined,
    source: ctx.source,
    collectedAt: ctx.collectedAt ?? Date.now(),
  };
}

const tokenSet = (s: string) => new Set((s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 2));

/** REFERENCE_SCORE 0..100: relevância + força de ranking + avaliações + volume + formato + atualidade */
export function referenceScore(ref: MarketReference, opts: { query: string; formatHint?: string; nowYear?: number; publishedYear?: number | null }): number {
  const q = tokenSet(opts.query);
  const t = tokenSet(`${ref.title} ${ref.subtitle ?? ''} ${ref.category ?? ''}`);
  let hit = 0; q.forEach(w => { if (t.has(w)) hit++; });
  const relevance = q.size ? hit / q.size : 0;                                   // 0..1
  // força de ranking SÓ conta se for BSR real; posição de busca vale menos
  let rankStrength = 0;
  if (ref.rankType === 'BSR' && ref.bsr) rankStrength = Math.max(0, 1 - Math.log10(ref.bsr) / 6);
  else if (ref.rankType === 'SEARCH_POSITION' && ref.rank) rankStrength = Math.max(0, 0.6 - ref.rank / 400);
  const ratingQ = ref.rating ? Math.max(0, (ref.rating - 3) / 2) : 0;            // 3..5 → 0..1
  const volume = ref.reviews ? Math.min(1, Math.log10(ref.reviews + 1) / 4) : 0; // até ~10k
  const format = opts.formatHint && ref.category ? (tokenSet(ref.category).has(opts.formatHint.toLowerCase()) ? 1 : 0.5) : 0.5;
  const year = opts.nowYear ?? new Date().getFullYear();
  const recency = opts.publishedYear ? Math.max(0, 1 - (year - opts.publishedYear) / 10) : 0.4;
  const score = 100 * (0.3 * relevance + 0.2 * rankStrength + 0.15 * ratingQ + 0.15 * volume + 0.1 * format + 0.1 * recency);
  return Math.round(score);
}

/** Seleciona as N melhores referências (padrão 5), com score — referências, NÃO modelos para copiar. */
export function pickReferences(items: MarketReference[], opts: { query: string; formatHint?: string; limit?: number }): MarketReference[] {
  return items
    .filter(i => i.title)
    .map(i => ({ ...i, referenceScore: referenceScore(i, opts) }))
    .sort((a, b) => (b.referenceScore ?? 0) - (a.referenceScore ?? 0))
    .slice(0, opts.limit ?? 5);
}

/** Texto honesto para exibir um rank */
export function describeRank(ref: MarketReference): string {
  if (ref.rank === null || ref.rank === undefined) return DATA_UNAVAILABLE;
  return ref.rankType === 'BSR' ? `BSR #${ref.rank.toLocaleString('pt-BR')}` : ref.rankType === 'SEARCH_POSITION' ? `Posição na busca #${ref.rank} (não é BSR)` : `Rank #${ref.rank} (tipo não identificado)`;
}

export function displayField<T>(v: T | null | undefined): string {
  return v === null || v === undefined || (v as any) === '' ? DATA_UNAVAILABLE : String(v);
}

/** Estimativa sempre rotulada como ESTIMATIVA */
export function labelEstimate(value: number | null, unit: string): string {
  return value === null ? DATA_UNAVAILABLE : `ESTIMATIVA: ${Math.round(value).toLocaleString('pt-BR')} ${unit}`;
}

// ---------------------------------------------------------------
// CACHE por marketplace + categoria + query (+ timestamp), com idade visível
// ---------------------------------------------------------------
export interface CachedResearch { items: MarketReference[]; collectedAt: number }

export class MarketCache {
  private m = new Map<string, CachedResearch>();
  constructor(private ttlMs = 30 * 60 * 1000) {}
  static key(marketplace: string, category: string, query: string) {
    return `${marketplace.toLowerCase()}|${category.toLowerCase()}|${query.toLowerCase().trim()}`;
  }
  set(marketplace: string, category: string, query: string, items: MarketReference[]) {
    this.m.set(MarketCache.key(marketplace, category, query), { items, collectedAt: Date.now() });
  }
  /** nunca devolve cache expirado como se fosse atual */
  get(marketplace: string, category: string, query: string): (CachedResearch & { ageMs: number }) | null {
    const hit = this.m.get(MarketCache.key(marketplace, category, query));
    if (!hit) return null;
    const ageMs = Date.now() - hit.collectedAt;
    return ageMs > this.ttlMs ? null : { ...hit, ageMs };
  }
}

/**
 * Pesquisa de mercado usando a API existente do projeto (/api/amazon/search).
 * Retorna [] com erro explícito em vez de inventar dados.
 */
export async function researchMarket(
  query: string,
  opts: { marketplace?: string; category?: string; limit?: number; fetchImpl?: typeof fetch; cache?: MarketCache } = {},
): Promise<{ items: MarketReference[]; error?: string; fromCache?: boolean; collectedAt: number }> {
  const marketplace = opts.marketplace || 'amazon.com.br';
  const category = opts.category || 'stripbooks';
  const cached = opts.cache?.get(marketplace, category, query);
  if (cached) return { items: cached.items, fromCache: true, collectedAt: cached.collectedAt };
  const f = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!f) return { items: [], error: 'fetch indisponível neste ambiente', collectedAt: Date.now() };
  try {
    const res = await f(`/api/amazon/search?query=${encodeURIComponent(query)}&limit=${opts.limit ?? 40}`);
    if (!res.ok) return { items: [], error: `API Amazon retornou HTTP ${res.status}`, collectedAt: Date.now() };
    const data = await res.json();
    const now = Date.now();
    const items = (data?.books || []).map((b: any, i: number) =>
      normalizeMarketItem({ ...b, position: b.position ?? i + 1 }, { source: 'api/amazon/search (posição nos resultados)', collectedAt: now, rankField: 'SEARCH_POSITION' }));
    opts.cache?.set(marketplace, category, query, items);
    return { items, collectedAt: now, error: items.length ? undefined : 'A busca não retornou livros' };
  } catch (e: any) {
    return { items: [], error: e?.message || 'falha na pesquisa', collectedAt: Date.now() };
  }
}
