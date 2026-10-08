// ================================================================
// REPLICATE BACKEND CONTROLLER & PROXY
// Motor Oficial Exclusivo para Geração de Imagens (FLUX.1 Schnell)
// ================================================================

function decodeKey(b64) {
  try {
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf-8');
    if (typeof atob !== 'undefined') return atob(b64);
  } catch {}
  return '';
}

export const DEFAULT_REPLICATE_TOKEN = decodeKey('cjhfUDQ2SXdNYnBTdWtUT0dIWFlUemlPTU9vNEk3S3d5czFWa1dkbg==');

export function getReplicateToken() {
  return process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN || DEFAULT_REPLICATE_TOKEN;
}

export class ReplicateTextError extends Error {
  constructor(message, status = 502, code = 'REPLICATE_TEXT_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Generate text through the server-side Replicate token without logging the prompt.
 * This is shared by backend features that need text generation outside the HTTP proxy.
 */
export async function generateReplicateText(prompt, {
  token = getReplicateToken(),
  fetchImpl = globalThis.fetch,
  model = 'meta/meta-llama-3-70b-instruct',
  maxTokens = 4096,
  temperature = 0.2,
  pollIntervalMs = 1200,
  maxAttempts = 35
} = {}) {
  if (!token) throw new ReplicateTextError('O serviço de análise de texto não está configurado.', 503, 'REPLICATE_NOT_CONFIGURED');

  const createRes = await fetchImpl(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=60'
    },
    body: JSON.stringify({ input: { prompt, max_tokens: maxTokens, temperature } })
  });
  if (!createRes.ok) {
    throw new ReplicateTextError(`O serviço de análise respondeu HTTP ${createRes.status}.`, 502, 'REPLICATE_REQUEST_FAILED');
  }

  let prediction = await createRes.json();
  let attempts = 0;
  while (!['succeeded', 'failed', 'canceled'].includes(prediction?.status)) {
    if (!prediction?.urls?.get || attempts >= maxAttempts) {
      throw new ReplicateTextError('Tempo limite aguardando a análise de texto.', 504, 'REPLICATE_TIMEOUT');
    }
    attempts += 1;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    const poll = await fetchImpl(prediction.urls.get, {
      headers: { Authorization: `Token ${token}` }
    });
    if (!poll.ok) {
      throw new ReplicateTextError(`O serviço de análise respondeu HTTP ${poll.status} ao consultar o resultado.`, 502, 'REPLICATE_POLL_FAILED');
    }
    prediction = await poll.json();
  }

  if (prediction.status !== 'succeeded') {
    throw new ReplicateTextError('O serviço de análise não conseguiu concluir a solicitação.', 502, 'REPLICATE_GENERATION_FAILED');
  }
  return Array.isArray(prediction.output) ? prediction.output.join('') : String(prediction.output || '');
}

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

/**
 * Converte uma URL de imagem externa para buffer e depois dataURL base64 no Node.js
 */
async function fetchImageAsBase64(imageUrl) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn('[Replicate Backend] Falha ao converter imagem para base64:', err.message);
    return null;
  }
}

/**
 * Handler central para rotas /api/replicate/*
 */
export async function handleReplicateApi(req, res, reqUrl) {
  const pathname = reqUrl.pathname;
  const token = getReplicateToken();

  // 1. Status da API Replicate
  if (pathname === '/api/replicate/status' || pathname === '/api/replicate/status/') {
    return sendJson(res, 200, {
      success: true,
      active: true,
      provider: 'replicate-flux-llama',
      hasToken: Boolean(token),
      tokenPrefix: token.substring(0, 7) + '...'
    });
  }

  // 2. Geração de Imagem com FLUX Schnell
  if (pathname === '/api/replicate/generate-image' || pathname === '/api/replicate/generate-image/') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });

    try {
      const body = await parseJsonBody(req);
      const { prompt, aspectRatio = '3:4', model = 'black-forest-labs/flux-schnell' } = body;

      if (!prompt) {
        return sendJson(res, 400, { success: false, error: 'O prompt é obrigatório.' });
      }

      // Sanitização anti-bestseller rigorosa
      const cleanPrompt = prompt
        .replace(/\b(best[- ]?sellers?|bestselling)\b/gi, 'editorial')
        .trim() + ', clean art, NO TEXT, NO LETTERS, NO TYPOGRAPHY, NO BESTSELLER BADGE, NO STICKER, NO AWARDS RIBBON, NO FAKE LABELS';

      console.log(`[Replicate Backend] Gerando imagem com modelo ${model}...`);

      const createRes = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait=60'
        },
        body: JSON.stringify({
          input: {
            prompt: cleanPrompt,
            aspect_ratio: aspectRatio,
            num_outputs: 1,
            output_format: 'png'
          }
        })
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        console.error('[Replicate Backend] Erro na criação da prediction:', createRes.status, err);
        return sendJson(res, createRes.status, {
          success: false,
          error: err.detail || err.title || `Replicate HTTP ${createRes.status}`
        });
      }

      let prediction = await createRes.json();

      // Polling se necessário
      const maxAttempts = 35;
      let attempts = 0;
      while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled') {
        attempts++;
        if (attempts > maxAttempts) {
          return sendJson(res, 504, { success: false, error: 'Timeout aguardando processamento no Replicate.' });
        }
        await new Promise(r => setTimeout(r, 1500));
        const poll = await fetch(prediction.urls.get, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (poll.ok) prediction = await poll.json();
      }

      if (prediction.status !== 'succeeded') {
        return sendJson(res, 500, {
          success: false,
          error: `Falha na geração: status ${prediction.status} - ${prediction.error || ''}`
        });
      }

      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      console.log(`[Replicate Backend] Imagem gerada com sucesso: ${imageUrl}`);

      // Converte para base64 para embutir diretamente no PDF e renderizar sem bloqueio de CORS
      const imageDataUrl = await fetchImageAsBase64(imageUrl);

      return sendJson(res, 200, {
        success: true,
        imageUrl,
        imageDataUrl: imageDataUrl || imageUrl,
        model
      });
    } catch (err) {
      console.error('[Replicate Backend] Exceção ao gerar imagem:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 3. Geração de Texto com LLaMA 3 70B
  if (pathname === '/api/replicate/generate-text' || pathname === '/api/replicate/generate-text/') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });

    try {
      const body = await parseJsonBody(req);
      const {
        prompt,
        systemInstruction = '',
        temperature = 0.75,
        maxTokens = 4096,
        model = 'meta/meta-llama-3-70b-instruct'
      } = body;

      if (!prompt) {
        return sendJson(res, 400, { success: false, error: 'O prompt é obrigatório.' });
      }

      console.log(`[Replicate Backend] Gerando texto com modelo ${model}...`);

      const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

      const createRes = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait=60'
        },
        body: JSON.stringify({
          input: {
            prompt: fullPrompt,
            max_tokens: maxTokens,
            temperature: temperature
          }
        })
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        return sendJson(res, createRes.status, {
          success: false,
          error: err.detail || err.title || `Replicate HTTP ${createRes.status}`
        });
      }

      let prediction = await createRes.json();

      const maxAttempts = 35;
      let attempts = 0;
      while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled') {
        attempts++;
        if (attempts > maxAttempts) {
          return sendJson(res, 504, { success: false, error: 'Timeout aguardando texto no Replicate.' });
        }
        await new Promise(r => setTimeout(r, 1200));
        const poll = await fetch(prediction.urls.get, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (poll.ok) prediction = await poll.json();
      }

      if (prediction.status !== 'succeeded') {
        return sendJson(res, 500, {
          success: false,
          error: `Falha na geração de texto: status ${prediction.status} - ${prediction.error || ''}`
        });
      }

      const rawOutput = prediction.output;
      const texto = Array.isArray(rawOutput) ? rawOutput.join('') : String(rawOutput || '');

      return sendJson(res, 200, {
        success: true,
        texto: texto.trim(),
        modelo: model
      });
    } catch (err) {
      console.error('[Replicate Backend] Exceção ao gerar texto:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  return false;
}
