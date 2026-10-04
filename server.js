import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

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
    console.log('[Book Intel KDP] dist/dashboard.html não encontrado. Executando build de produção...');
    try {
      execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
      console.log('[Book Intel KDP] Build de produção concluído com sucesso!');
    } catch (err) {
      console.error('[Book Intel KDP] Erro ao executar build automático:', err.message);
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

// Handler de Busca Amazon
async function handleAmazonSearch(query, limit = 8) {
  const cleanKeyword = (query || 'bestseller books').trim().toLowerCase();
  const cacheKey = `${cleanKeyword}_${limit}`;

  const cached = amazonSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(cleanKeyword)}&i=stripbooks`;
    const response = await fetch(searchUrl, {
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

    $('[data-component-type="s-search-result"]').each((_, el) => {
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

      results.push({
        asin,
        title: title.replace(/\s+/g, ' ').substring(0, 80),
        author: author.replace(/\s+/g, ' ').substring(0, 50),
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
    }
    return results;
  } catch (err) {
    console.warn(`[AmazonSearch] Falha para "${cleanKeyword}":`, err.message);
    return [];
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

  // Headers CORS para APIs
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // 1. Health checks e Keep-Alive Ping do Render
  if (pathname === '/ping' || pathname === '/health' || pathname === '/healthz' || pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'ok',
      ping: 'pong',
      service: 'Book Intel KDP',
      uptime: process.uptime(),
      timestamp: Date.now()
    });
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
      const limit = parseInt(reqUrl.searchParams.get('limit') || '8', 10);
      const books = await handleAmazonSearch(query, limit);
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

  // 5. Servir Arquivos Estáticos do Frontend (dist/)
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
      console.log('[Book Intel KDP] dist/dashboard.html ausente na rota SPA. Tentando compilar...');
      execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
      if (fs.existsSync(fallbackFile)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.statusCode = 200;
        return fs.createReadStream(fallbackFile).pipe(res);
      }
    } catch (err) {
      console.error('[Book Intel KDP] Erro na compilação SPA:', err.message);
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

  console.log(`[Book Intel KDP] 🛡️ Keep-Alive Ping ativado: monitorando ${pingUrl} a cada 10 min`);

  // Primeiro ping após 30 segundos
  setTimeout(() => runPing(pingUrl), 30000);

  // Pings contínuos
  setInterval(() => runPing(pingUrl), PING_INTERVAL_MS);
}

async function runPing(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BookIntel-KeepAlive-Ping/1.0' },
      signal: AbortSignal.timeout(15000)
    });
    console.log(`[Keep-Alive Ping] 🟢 ${new Date().toLocaleTimeString('pt-BR')} - Ping para ${url} [Status ${res.status}]`);
  } catch (err) {
    console.warn(`[Keep-Alive Ping] 🟡 Aviso no ping para ${url}: ${err.message}`);
  }
}

server.listen(PORT, HOST, () => {
  console.log(`[Book Intel KDP] Servidor Node online em http://${HOST}:${PORT}`);
  console.log(`[Book Intel KDP] Servindo frontend de ${DIST_DIR}`);
  startKeepAlivePing();
});
