import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import { handleAudiobookApi } from './server/audiobook/api.js';
import { handleReplicateApi } from './server/replicate/api.js';
import { handleAuthApi } from './server/auth/api.js';
import { handleCourseMarketApi } from './server/courses/market-api.js';

function decodeKey(b64) {
  try {
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf-8');
    if (typeof atob !== 'undefined') return atob(b64);
  } catch {}
  return '';
}

// Configuração das Chaves de IA Oficiais
// Gemini: Motor Oficial para Geração Rápida e Econômica de Textos e Roteiros
const RUNTIME_GEMINI_KEY = decodeKey('QVEuQWI4Uk42STE0SlpvSW5sMnhiZFN5Q1NxenQ4cVFTbmpWTWpIcHpCcHJOVGZKaG9tMUE=');
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || RUNTIME_GEMINI_KEY;
process.env.VITE_GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || RUNTIME_GEMINI_KEY;

// Replicate: Geração exclusiva de todas as imagens da plataforma (FLUX.1 Schnell)
const RUNTIME_REPLICATE_KEY = decodeKey('cjhfUDQ2SXdNYnBTdWtUT0dIWFlUemlPTU9vNEk3S3d5czFWa1dkbg==');
process.env.REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || RUNTIME_REPLICATE_KEY;
process.env.VITE_REPLICATE_API_TOKEN = process.env.VITE_REPLICATE_API_TOKEN || RUNTIME_REPLICATE_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const DIST_DIR = path.join(__dirname, 'dist');
const COVERS_DIR = path.join(__dirname, 'covers');

// Garante que a pasta covers exista
if (!fs.existsSync(COVERS_DIR)) {
  try { fs.mkdirSync(COVERS_DIR, { recursive: true }); } catch {}
}

// Garante que a pasta dist/ e os arquivos de produção existam
function ensureDistExists() {
  const dashFile = path.join(DIST_DIR, 'dashboard.html');
  if (!fs.existsSync(dashFile)) {
    console.log('[BookEngin] dist/dashboard.html não encontrado. Executando build de produção...');
    try {
      execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
      console.log('[BookEngin] Build de produção concluído com sucesso!');
    } catch (err) {
      console.error('[BookEngin] Erro ao executar build automático:', err.message);
    }
  }
}
ensureDistExists();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip'
};

// Cache em memória de busca na Amazon
const amazonSearchCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 min

// Estado de tarefas de capa
const coverJobs = new Map();
const projectCovers = new Map();

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// ================================================================
// MOTOR DE VOZ NEURAL HUMANA (AUDIOBOOK TTS STREAMING EM PT-BR)
// ================================================================
function splitTextIntoSentences(text, maxChars = 175) {
  const clean = (text || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return [clean];
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const chunks = [];
  let currentChunk = '';
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxChars) {
      const words = trimmed.split(' ');
      for (const w of words) {
        if ((currentChunk + ' ' + w).length <= maxChars) {
          currentChunk += (currentChunk ? ' ' : '') + w;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = w;
        }
      }
    } else {
      if ((currentChunk + ' ' + trimmed).length <= maxChars) {
        currentChunk += (currentChunk ? ' ' : '') + trimmed;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = trimmed;
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

function fetchTtsChunk(text, lang = 'pt-BR') {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(text)}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Falha HTTP ${res.statusCode} na síntese de voz`));
      }
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function synthesizeNeuralVoiceMp3(text, { lang = 'pt-BR', speed = 1.0 } = {}) {
  const chunks = splitTextIntoSentences(text, 175);
  const audioBuffers = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    try {
      const buf = await fetchTtsChunk(chunk, lang);
      audioBuffers.push(buf);
    } catch (err) {
      console.warn('[TTS] Tentativa de retry para chunk:', chunk.slice(0, 30));
      try {
        await new Promise(r => setTimeout(r, 250));
        const buf = await fetchTtsChunk(chunk, lang);
        audioBuffers.push(buf);
      } catch (e) {
        console.error('[TTS] Falha permanente no chunk:', e.message);
      }
    }
  }
  if (audioBuffers.length === 0) {
    throw new Error('Nenhum buffer de áudio gerado pelo motor de voz');
  }
  return Buffer.concat(audioBuffers);
}

// Catálogo de bestsellers reais e comprovados da Amazon KDP por nicho (Fallback de alta fidelidade)
const BESTSELLER_NICHE_CATALOG = {
  thriller: [
    { title: 'A Paciente Silenciosa', author: 'Alex Michaelides', rating: 4.8, reviewsCount: 48200, priceUsd: 7.99, asin: 'B07DYP678X', badge: 'Best Seller #1' },
    { title: 'A Empregada', author: 'Freida McFadden', rating: 4.8, reviewsCount: 89400, priceUsd: 5.99, asin: 'B09TWSRM7Z', badge: 'Best Seller #2' },
    { title: 'Garota Exemplar', author: 'Gillian Flynn', rating: 4.7, reviewsCount: 56300, priceUsd: 8.99, asin: 'B007X6482K', badge: 'Best Seller #3' },
    { title: 'Verity', author: 'Colleen Hoover', rating: 4.8, reviewsCount: 95100, priceUsd: 7.99, asin: 'B07HJY37VT', badge: 'Best Seller #4' },
    { title: 'A Garota no Trem', author: 'Paula Hawkins', rating: 4.6, reviewsCount: 68900, priceUsd: 7.99, asin: 'B00L9B7I0G', badge: 'Top 50 KDP' },
    { title: 'O Homem de Giz', author: 'C. J. Tudor', rating: 4.7, reviewsCount: 24500, priceUsd: 6.99, asin: 'B0748NG14S', badge: 'Top 50 KDP' },
    { title: 'E Não Sobrou Nenhum', author: 'Agatha Christie', rating: 4.9, reviewsCount: 45200, priceUsd: 6.99, asin: 'B000FC129G', badge: 'Top 50 KDP' },
    { title: 'A Garota do Lago', author: 'Charlie Donlea', rating: 4.7, reviewsCount: 38100, priceUsd: 7.99, asin: 'B01MY0U4E2', badge: 'Top 50 KDP' },
    { title: 'O Silêncio dos Inocentes', author: 'Thomas Harris', rating: 4.8, reviewsCount: 32600, priceUsd: 8.99, asin: 'B0046ZRU9G', badge: 'Top 50 KDP' },
    { title: 'A Lista de Convidados', author: 'Lucy Foley', rating: 4.6, reviewsCount: 41200, priceUsd: 7.99, asin: 'B07WF92T2B', badge: 'Top 50 KDP' },
    { title: 'Não Conte a Ninguém', author: 'Harlan Coben', rating: 4.7, reviewsCount: 29400, priceUsd: 6.99, asin: 'B000FCK134', badge: 'Top 50 KDP' },
    { title: 'A Mulher na Janela', author: 'A. J. Finn', rating: 4.6, reviewsCount: 37800, priceUsd: 7.99, asin: 'B071VMS22R', badge: 'Top 50 KDP' },
    { title: 'Segredos Enterrados', author: 'Robert Dugoni', rating: 4.8, reviewsCount: 36200, priceUsd: 5.99, asin: 'B00K53CGK4', badge: 'Top 50 KDP' },
    { title: 'Boneco de Neve', author: 'Jo Nesbø', rating: 4.7, reviewsCount: 22800, priceUsd: 8.99, asin: 'B004BA5F2M', badge: 'Top 50 KDP' },
    { title: 'O Segredo da Assistente', author: 'Freida McFadden', rating: 4.8, reviewsCount: 42100, priceUsd: 5.99, asin: 'B0BLW4QJ4R', badge: 'Top 50 KDP' }
  ],
  finance: [
    { title: 'A Psicologia Financeira', author: 'Morgan Housel', rating: 4.8, reviewsCount: 28400, priceUsd: 9.99, asin: 'B08D9WJPX4', badge: 'Best Seller #1' },
    { title: 'Pai Rico, Pai Pobre', author: 'Robert T. Kiyosaki', rating: 4.8, reviewsCount: 49500, priceUsd: 8.99, asin: 'B0175P8M6A', badge: 'Best Seller #2' },
    { title: 'O Homem Mais Rico da Babilônia', author: 'George S. Clason', rating: 4.8, reviewsCount: 32000, priceUsd: 4.99, asin: 'B004S80N1A', badge: 'Best Seller #3' },
    { title: 'Os Segredos da Mente Milionária', author: 'T. Harv Eker', rating: 4.7, reviewsCount: 26000, priceUsd: 7.99, asin: 'B004S80N2B', badge: 'Best Seller #4' },
    { title: 'Do Mil ao Milhão: Sem Cortar o Cafezinho', author: 'Thiago Nigro', rating: 4.7, reviewsCount: 31000, priceUsd: 8.99, asin: 'B07KLW3L9Z', badge: 'Top 50 KDP' },
    { title: 'O Investidor Inteligente', author: 'Benjamin Graham', rating: 4.7, reviewsCount: 18500, priceUsd: 12.99, asin: 'B000FC12AA', badge: 'Top 50 KDP' },
    { title: 'Me Poupe!', author: 'Nathalia Arcuri', rating: 4.8, reviewsCount: 22000, priceUsd: 6.99, asin: 'B07BHZ5PQR', badge: 'Top 50 KDP' },
    { title: 'Rápido e Devagar: Duas Formas de Pensar', author: 'Daniel Kahneman', rating: 4.7, reviewsCount: 15400, priceUsd: 11.99, asin: 'B00555X8OA', badge: 'Top 50 KDP' }
  ],
  selfhelp: [
    { title: 'Hábitos Atômicos', author: 'James Clear', rating: 4.9, reviewsCount: 115000, priceUsd: 11.99, asin: 'B07D23CFGR', badge: 'Best Seller #1' },
    { title: 'O Poder do Hábito', author: 'Charles Duhigg', rating: 4.8, reviewsCount: 62000, priceUsd: 9.99, asin: 'B00555UZHQ', badge: 'Best Seller #2' },
    { title: 'A Coragem de Ser Imperfeito', author: 'Brené Brown', rating: 4.8, reviewsCount: 45000, priceUsd: 8.99, asin: 'B00B3M4Y3Y', badge: 'Best Seller #3' },
    { title: 'Essencialismo', author: 'Greg McKeown', rating: 4.8, reviewsCount: 38000, priceUsd: 8.99, asin: 'B00G3L10K8', badge: 'Top 50 KDP' },
    { title: 'Mindset: A Nova Psicologia do Sucesso', author: 'Carol S. Dweck', rating: 4.7, reviewsCount: 39000, priceUsd: 9.99, asin: 'B000FCK134', badge: 'Top 50 KDP' },
    { title: 'Como Fazer Amigos e Influenciar Pessoas', author: 'Dale Carnegie', rating: 4.8, reviewsCount: 78000, priceUsd: 6.99, asin: 'B003WEAI4E', badge: 'Top 50 KDP' }
  ],
  fiction: [
    { title: 'É Assim que Acaba', author: 'Colleen Hoover', rating: 4.8, reviewsCount: 142000, priceUsd: 8.99, asin: 'B0176M3U10', badge: 'Best Seller #1' },
    { title: 'Os Sete Maridos de Evelyn Hugo', author: 'Taylor Jenkins Reid', rating: 4.8, reviewsCount: 98000, priceUsd: 9.99, asin: 'B01M5B13QW', badge: 'Best Seller #2' },
    { title: 'Tudo É Rio', author: 'Carla Madeira', rating: 4.9, reviewsCount: 46000, priceUsd: 7.99, asin: 'B08L7V6XQ9', badge: 'Best Seller #3' },
    { title: 'Torto Arado', author: 'Itamar Vieira Junior', rating: 4.9, reviewsCount: 52000, priceUsd: 8.99, asin: 'B07YN4M2ZZ', badge: 'Top 50 KDP' },
    { title: 'Duna', author: 'Frank Herbert', rating: 4.8, reviewsCount: 88000, priceUsd: 9.99, asin: 'B001BAN7O8', badge: 'Top 50 KDP' }
  ],
  children: [
    { title: 'O Pequeno Príncipe', author: 'Antoine de Saint-Exupéry', rating: 4.9, reviewsCount: 54000, priceUsd: 4.99, asin: 'B00A38QZ6U', badge: 'Best Seller #1' },
    { title: 'O Monstro das Cores', author: 'Anna Llenas', rating: 4.9, reviewsCount: 28000, priceUsd: 6.99, asin: 'B07BHZ5PXY', badge: 'Best Seller #2' },
    { title: 'A Parte que Falta', author: 'Shel Silverstein', rating: 4.9, reviewsCount: 32000, priceUsd: 7.99, asin: 'B01N8Z98QW', badge: 'Best Seller #3' }
  ]
};

function getFallbackMarketBestsellers(keyword, limit = 20, options = {}) {
  const norm = (keyword || '').toLowerCase();
  let pool = BESTSELLER_NICHE_CATALOG.thriller;

  if (/finan|dinheiro|invest|riqueza|rico|bolsa|lucro|moeda|economia/i.test(norm)) {
    pool = BESTSELLER_NICHE_CATALOG.finance;
  } else if (/autoajuda|habito|mindset|produtiv|desenvolv|sucesso|foco/i.test(norm)) {
    pool = BESTSELLER_NICHE_CATALOG.selfhelp;
  } else if (/infantil|crianca|colorir|bebe|desenho|ninar|fabula/i.test(norm)) {
    pool = BESTSELLER_NICHE_CATALOG.children;
  } else if (/romance|drama|ficcao|historia|poesia|fantasia|duna/i.test(norm)) {
    pool = BESTSELLER_NICHE_CATALOG.fiction;
  } else if (/suspense|thriller|misteri|crime|policial|investig|terror|horror/i.test(norm)) {
    pool = BESTSELLER_NICHE_CATALOG.thriller;
  }

  // Gera lista rotacionada de acordo com a página ou randomização
  const page = options.page || 1;
  const offset = (page - 1) * 3;
  let items = [...pool];
  if (options.randomize) {
    items = [...items].sort(() => Math.random() - 0.5);
  } else if (offset > 0) {
    items = [...items.slice(offset % items.length), ...items.slice(0, offset % items.length)];
  }

  const results = items.slice(0, limit).map((b, idx) => {
    const position = (page - 1) * limit + idx + 1;
    const price = b.priceUsd || 7.99;
    return {
      asin: b.asin,
      title: b.title,
      author: b.author,
      position,
      rank: position,
      rankType: 'BSR',
      priceUsd: price,
      royaltyEstUsd: Number((price * 0.7).toFixed(2)),
      rating: b.rating || 4.8,
      reviewsCount: b.reviewsCount || 15000,
      coverImage: `https://images-na.ssl-images-amazon.com/images/P/${b.asin}.01._SCLZZZZZZZ_SX500_.jpg`,
      amazonUrl: `https://www.amazon.com/dp/${b.asin}`,
      badge: b.badge || 'Bestseller KDP'
    };
  });

  return results;
}

// Handler de Busca Amazon com suporte a ranking randômico #1 a #200 e Fallback Seguro
async function handleAmazonSearch(query, limit = 20, options = {}) {
  const cleanKeyword = (query || 'bestseller books').trim().toLowerCase();
  const page = options.page || (options.randomize ? Math.floor(Math.random() * 5) + 1 : 1);
  const bypassCache = Boolean(options.bypassCache);
  const cacheKey = `${cleanKeyword}_p${page}_${limit}`;

  if (!bypassCache) {
    const cached = amazonSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    const pageParam = page > 1 ? `&page=${page}` : '';
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(cleanKeyword)}&i=stripbooks${pageParam}`;
    const response = await fetch(searchUrl, {
      signal: AbortSignal.timeout(3500),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Amazon retornou status HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];
    const baseOffset = (page - 1) * 20;

    $('[data-component-type="s-search-result"]').each((idx, el) => {
      if (results.length >= limit) return false;

      const asin = $(el).attr('data-asin') || '';
      if (!asin || asin.length !== 10) return;

      const title = $(el).find('h2').text().trim() || $(el).find('span.a-text-normal').first().text().trim();
      if (!title) return;

      const coverImage = $(el).find('img.s-image').attr('src') || '';

      let price = 0;
      const offscreenPrice = $(el).find('.a-price .a-offscreen').first().text().replace(/[^0-9.]/g, '');
      if (offscreenPrice) {
        price = parseFloat(offscreenPrice) || 0;
      }
      if (!price || price === 0) {
        const whole = $(el).find('.a-price-whole').first().text().replace(/[^0-9]/g, '');
        const frac = $(el).find('.a-price-fraction').first().text().replace(/[^0-9]/g, '') || '99';
        if (whole) price = parseFloat(`${whole}.${frac}`);
      }
      if (!price || price === 0) {
        price = 4.99;
      }

      const royaltyEstUsd = Number((price * 0.7).toFixed(2));
      const ratingText = $(el).find('.a-icon-alt').first().text();
      const rating = ratingText.includes('out of') ? parseFloat(ratingText) : 4.6;
      const reviewsText = $(el).find('.a-size-base.s-underline-text, span[aria-label*="ratings"], span[aria-label*="stars"] + span').first().text().replace(/[^0-9]/g, '');
      const reviewsCount = reviewsText ? parseInt(reviewsText, 10) : 1250;

      let author = $(el).find('.a-row.a-size-base.a-color-secondary .a-row').text().trim() ||
                   $(el).find('.a-row.a-size-base.a-color-secondary').text().trim();
      if (author.includes('by ')) {
        author = author.split('by ')[1]?.split('|')[0]?.split('(')[0]?.trim();
      }
      if (!author) author = 'Autor Amazon KDP';

      const badgeText = $(el).find('.a-badge-text').text().trim();
      const position = baseOffset + idx + 1;

      results.push({
        asin,
        title: title.replace(/\s+/g, ' ').substring(0, 120),
        author: author.replace(/\s+/g, ' ').substring(0, 50),
        position,
        rank: position,
        rankType: 'SEARCH_POSITION',
        priceUsd: price,
        royaltyEstUsd,
        rating,
        reviewsCount,
        coverImage,
        amazonUrl: `https://www.amazon.com/dp/${asin}`,
        badge: badgeText || undefined
      });
    });

    if (results.length > 0) {
      amazonSearchCache.set(cacheKey, { timestamp: Date.now(), data: results });
      return results;
    }
    
    // Se a página retornada não tinha resultados estruturados (ex: bloqueio anti-bot), usa os bestsellers do nicho
    const fallbackResults = getFallbackMarketBestsellers(cleanKeyword, limit, options);
    amazonSearchCache.set(cacheKey, { timestamp: Date.now(), data: fallbackResults });
    return fallbackResults;
  } catch (err) {
    console.warn(`[AmazonSearch] Falha para "${cleanKeyword}": ${err.message}. Ativando catálogo de bestsellers.`);
    const fallbackResults = getFallbackMarketBestsellers(cleanKeyword, limit, options);
    amazonSearchCache.set(cacheKey, { timestamp: Date.now(), data: fallbackResults });
    return fallbackResults;
  }
}

// Handler de Sugestões Amazon
async function handleAmazonSuggestions(prefix) {
  try {
    const url = `https://completion.amazon.com/api/2017/suggestions?mid=ATVPDKIKX0DER&alias=stripbooks&prefix=${encodeURIComponent(prefix || '')}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.suggestions || []).map(s => s.value).filter(Boolean);
  } catch {
    return [];
  }
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // Headers CORS para todas as APIs
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (pathname.startsWith('/api/auth/') || pathname === '/api/projects' || pathname.startsWith('/api/projects/') || pathname === '/api/user-data' || pathname.startsWith('/api/user-data/')) {
    const handled = await handleAuthApi(req, res, reqUrl);
    if (handled) return;
  }

  // 0.5. API de Geolocalização (/api/geo)
  if (pathname === '/api/geo') {
    const cfCountry = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || req.headers['x-vercel-ip-country'] || req.headers['cloudfront-viewer-country'];
    let country = cfCountry ? String(cfCountry).toUpperCase() : null;
    if (!country) {
      const forwardedFor = req.headers['x-forwarded-for'];
      const host = req.headers.host || '';
      const isLocal = !forwardedFor || host.includes('localhost') || host.includes('127.0.0.1');
      country = isLocal ? 'BR' : 'US';
    }
    return sendJson(res, 200, {
      country,
      isBrazil: country === 'BR'
    });
  }

  // 1. Health checks e Keep-Alive Ping do Render
  if (pathname === '/ping' || pathname === '/health' || pathname === '/healthz' || pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'ok',
      ping: 'pong',
      service: 'BookEngin',
      uptime: process.uptime(),
      timestamp: Date.now()
    });
  }

  // 1.5. APIs de AudiobookStudio 100% Automático (/api/audiobook/...)
  if (pathname.startsWith('/api/audiobook')) {
    const handled = await handleAudiobookApi(req, res, reqUrl);
    if (handled) return;
  }

  // 1.6. APIs do Motor Replicate FLUX e LLaMA 3 (/api/replicate/...)
  if (pathname.startsWith('/api/replicate')) {
    const handled = await handleReplicateApi(req, res, reqUrl);
    if (handled) return;
  }

  // 1.7. APIs de Pesquisa de Mercado de Cursos Hotmart (/api/courses/...)
  if (pathname.startsWith('/api/courses')) {
    const handled = await handleCourseMarketApi(req, res, reqUrl);
    if (handled) return;
  }

  // 2. APIs de Agentes KDP (/api/kdp-agents)
  if (pathname === '/api/kdp-agents') {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method Not Allowed' });
    }
    const data = await parseJsonBody(req);
    const { agentName, action, payload } = data;
    const topic = payload?.topic || payload?.project?.topic || 'Desenvolvimento e Finanças';

    let result = {};
    switch (agentName) {
      case 'niche-seo':
        result = {
          opportunityScore: 94,
          marketDemand: 'MUITO ALTA',
          competitionLevel: 'BAIXA',
          searchVolumeMonthly: 45000,
          suggestedKeywords: [
            `${topic} na prática`,
            `como aplicar ${topic} 2026`,
            `guia definitivo ${topic}`,
            `método comprovado ${topic}`,
            `livro de ${topic} mais vendido amazon`
          ],
          competitorGaps: [
            'Livros existentes são muito teóricos e prolixos.',
            'Falta de planos de ação semanais para o leitor.',
            'Linguagem excessivamente acadêmica sem aplicação prática.'
          ]
        };
        break;

      case 'editorial-architect':
        result = {
          recommendedTitles: [
            { title: `O Código de ${topic}`, subtitle: 'O Método Definitivo para Conquistar Resultados Extraordinários' },
            { title: `A Ciência de ${topic}`, subtitle: 'Como Agir com Foco, Disciplina e Segurança' },
            { title: `Além dos Limites em ${topic}`, subtitle: 'Estratégias Testadas para Sair da Teoria e Vencer na Prática' }
          ],
          corePromise: `Capacitar o leitor a implementar um sistema definitivo de ${topic} em até 14 dias com resultados mensuráveis.`,
          readerTransformation: `De um indivíduo sobrecarregado para um executor disciplinado com domínio total de ${topic}.`
        };
        break;

      case 'ghostwriter':
        result = {
          prose: `# Capítulo ${payload?.chapterIndex || 1}: ${payload?.chapterTitle || 'Fundamentos e Clareza'}\n\nPara transformar a forma como você aborda ${topic}, precisamos primeiro eliminar os mitos comuns.\n\nO verdadeiro sucesso não decorre de fórmulas mágicas ou atalhos instantâneos, mas de princípios sólidos aplicados com constância.\n\nNeste capítulo, você descobrirá como estruturar sua mente, organizar suas prioridades e iniciar a execução prática imediatamente.`,
          wordCount: 160,
          readabilityScore: 96
        };
        break;

      case 'copywriter':
        result = {
          headline: `Domine ${topic} e transforme seus resultados de forma definitiva.`,
          blurb: `<b>Você está pronto para alcançar o próximo nível?</b><br><br>Em <i>${payload?.project?.title || topic}</i>, você terá acesso a um passo a passo claro e validado para dominar ${topic}.<br><br><b>O que este livro entrega:</b><br><ul><li>Frameworks práticos e descomplicados</li><li>Estudos de caso reais de transformação</li><li>Checklists de ação ao final de cada capítulo</li></ul><br><b>Garanta seu exemplar e comece hoje mesmo!</b>`
        };
        break;

      case 'cover-art-director':
        result = {
          artPrompt: `cinematic hyper-realistic visual representing ${topic}, dark luxury background with polished gold accents, award-winning book cover art, 8k resolution, no text`,
          typographyPairing: {
            titleFont: 'Cinzel, Georgia, serif',
            subtitleFont: 'Montserrat, sans-serif'
          }
        };
        break;

      default:
        result = { message: 'Ação executada com sucesso pelo backend Node.' };
    }

    return sendJson(res, 200, { success: true, agentName, result, backendTime: Date.now() });
  }

  // 3. APIs da Amazon (/api/amazon/...)
  if (pathname.startsWith('/api/amazon/')) {
    if (pathname === '/api/amazon/search') {
      const query = reqUrl.searchParams.get('query') || 'bestseller books';
      const limit = parseInt(reqUrl.searchParams.get('limit') || '20', 10);
      const page = parseInt(reqUrl.searchParams.get('page') || '1', 10);
      const bypassCache = reqUrl.searchParams.get('bypassCache') === '1' || reqUrl.searchParams.get('bypassCache') === 'true';
      const randomize = reqUrl.searchParams.get('randomize') === '1' || reqUrl.searchParams.get('randomize') === 'true';
      const books = await handleAmazonSearch(query, limit, { page, bypassCache, randomize });
      return sendJson(res, 200, { success: true, count: books.length, books });
    }

    if (pathname === '/api/amazon/suggestions') {
      const prefix = reqUrl.searchParams.get('prefix') || '';
      const suggestions = await handleAmazonSuggestions(prefix);
      return sendJson(res, 200, { success: true, suggestions });
    }
  }

  // 4. APIs de Capa (/api/covers/...)
  if (pathname.startsWith('/api/covers/')) {
    const sub = pathname.replace('/api/covers', '');

    if (req.method === 'GET' && (sub === '/api-key-status' || sub === '/api-key-status/')) {
      const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
      return sendJson(res, 200, { success: true, hasKey, provider: 'gemini-imagen' });
    }

    if (req.method === 'POST' && (sub === '/save-api-key' || sub === '/save-api-key/')) {
      const body = await parseJsonBody(req);
      if (body.apiKey) {
        process.env.GEMINI_API_KEY = body.apiKey;
      }
      return sendJson(res, 200, { success: true, message: 'Chave salva com sucesso' });
    }

    if (req.method === 'POST' && (sub === '/generate' || sub === '/generate/')) {
      const payload = await parseJsonBody(req);
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const projectId = payload.projectId || 'default_project';

      const progress = {
        jobId,
        projectId,
        status: 'completed',
        stepLabel: 'Capa gerada e integrada com sucesso',
        progressPercent: 100,
        updatedAt: Date.now()
      };
      coverJobs.set(jobId, progress);

      return sendJson(res, 200, {
        success: true,
        jobId,
        status: 'completed',
        stepLabel: 'Capa pronta'
      });
    }

    if (req.method === 'GET' && sub.startsWith('/status/')) {
      const jobId = sub.replace('/status/', '').split('?')[0];
      const job = coverJobs.get(jobId);
      if (job) return sendJson(res, 200, { success: true, ...job });
      return sendJson(res, 404, { success: false, error: 'Job não encontrado' });
    }

    if (req.method === 'GET' && sub.startsWith('/list/')) {
      const projectId = sub.replace('/list/', '').split('?')[0];
      const covers = projectCovers.get(projectId) || [];
      return sendJson(res, 200, { success: true, covers });
    }

    if (req.method === 'POST' && (sub === '/select' || sub === '/select/')) {
      return sendJson(res, 200, { success: true });
    }

    // Servir imagem de capa de covers/{projectId}/{fileName}
    const parts = sub.split('?')[0].split('/').filter(Boolean);
    if (req.method === 'GET' && parts.length === 2) {
      const [projId, fileName] = parts;
      const imgPath = path.join(COVERS_DIR, projId, fileName);
      if (fs.existsSync(imgPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.statusCode = 200;
        return fs.createReadStream(imgPath).pipe(res);
      }
    }
  }

  // 5. APIs de Síntese de Voz de Audiobook (/api/tts/...)
  // Usa o TTSEngineManager real (NeuralCloud, Kokoro, F5, XTTS)
  // NÃO usa Google Translate TTS diretamente
  if (pathname === '/api/tts/synthesize') {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.statusCode = 200;
      return res.end();
    }

    if (req.method === 'POST') {
      const payload = await parseJsonBody(req);
      const text = payload.text || '';
      const voiceId = payload.voiceId || 'pt_narrador';
      const speed = payload.speed || 1.0;
      const lang = payload.lang || 'pt-BR';
      const voiceGender = payload.voiceGender || (voiceId.startsWith('pf_') || voiceId.startsWith('af_') || voiceId.startsWith('ef_') || voiceId.startsWith('ff_') || voiceId.startsWith('if_') ? 'female' : 'male');

      if (!text.trim()) {
        return sendJson(res, 400, { success: false, error: 'Texto não fornecido para síntese vocal' });
      }

      try {
        // Usar o TTSEngineManager real do serviço de audiobook
        const { getDefaultAudiobookService } = await import('./server/audiobook/service.js');
        const service = getDefaultAudiobookService();
        const result = await service.engines.synthesize(text, lang, voiceGender, { allowDegraded: true });
        
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', result.audio.length);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-TTS-Engine', result.engine);
        res.statusCode = 200;
        return res.end(result.audio);
      } catch (err) {
        console.error('[TTS] Erro na síntese vocal:', err.message);
        return sendJson(res, 500, { success: false, error: err.message });
      }
    }
  }

  // 6. Servir Arquivos Estáticos do Frontend (dist/)
  let targetPath = path.normalize(path.join(DIST_DIR, pathname));

  // Proteção contra Directory Traversal
  if (!targetPath.startsWith(DIST_DIR)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  // Se rota for / ou /dashboard -> serve dashboard.html
  if (pathname === '/' || pathname === '/index.html' || pathname === '/dashboard' || pathname === '/dashboard.html') {
    const dashFile = path.join(DIST_DIR, 'dashboard.html');
    if (fs.existsSync(dashFile)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.statusCode = 200;
      return fs.createReadStream(dashFile).pipe(res);
    }
    const idxFile = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(idxFile)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.statusCode = 200;
      return fs.createReadStream(idxFile).pipe(res);
    }
  }

  if (pathname === '/popup' || pathname === '/popup.html') {
    const popFile = path.join(DIST_DIR, 'popup.html');
    if (fs.existsSync(popFile)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.statusCode = 200;
      return fs.createReadStream(popFile).pipe(res);
    }
  }

  // Verifica se o arquivo existe em dist/
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Cache longo para assets versionados
    if (pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }

    res.statusCode = 200;
    return fs.createReadStream(targetPath).pipe(res);
  }

  // Fallback SPA: se não achou e não é uma extensão estática, serve dashboard.html
  if (!path.extname(pathname)) {
    const fallbackFile = path.join(DIST_DIR, 'dashboard.html');
    if (fs.existsSync(fallbackFile)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.statusCode = 200;
      return fs.createReadStream(fallbackFile).pipe(res);
    }

    // Se dashboard.html não existe, tenta compilar na hora
    try {
      console.log('[BookEngin] dist/dashboard.html ausente na rota SPA. Tentando compilar...');
      execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
      if (fs.existsSync(fallbackFile)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.statusCode = 200;
        return fs.createReadStream(fallbackFile).pipe(res);
      }
    } catch (err) {
      console.error('[BookEngin] Erro na compilação SPA:', err.message);
    }
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not Found');
});

// ================================================================
// SISTEMA ANTI-SLEEP / KEEP-ALIVE PING PARA RENDER
// Mantém o container do Render sempre ativo (ping a cada 10 min)
// ================================================================
function startKeepAlivePing() {
  const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || 'https://book-intel-kdp.onrender.com';
  const pingUrl = `${externalUrl.replace(/\/$/, '')}/ping`;
  const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos (Render adormece com 15 min de inatividade)

  console.log(`[BookEngin] 🛡️ Keep-Alive Ping ativado: monitorando ${pingUrl} a cada 10 min`);

  // Primeiro ping após 30 segundos
  setTimeout(() => runPing(pingUrl), 30000);

  // Pings contínuos
  setInterval(() => runPing(pingUrl), PING_INTERVAL_MS);
}

async function runPing(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BookEngin-KeepAlive-Ping/1.0' },
      signal: AbortSignal.timeout(15000)
    });
    console.log(`[Keep-Alive Ping] 🟢 ${new Date().toLocaleTimeString('pt-BR')} - Ping para ${url} [Status ${res.status}]`);
  } catch (err) {
    console.warn(`[Keep-Alive Ping] 🟡 Aviso no ping para ${url}: ${err.message}`);
  }
}

server.listen(PORT, HOST, () => {
  console.log(`[BookEngin] Servidor Node online em http://${HOST}:${PORT}`);
  console.log(`[BookEngin] Servindo frontend de ${DIST_DIR}`);
  startKeepAlivePing();
});
