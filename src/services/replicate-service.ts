// ================================================================
// MOTOR DE IMAGEM REPLICATE (FLUX.1 SCHNELL / DEV)
// Geração Exclusiva de Imagens da Plataforma em Altíssima Fidelidade
// ================================================================

function decodeKey(b64: string): string {
  try {
    if (typeof atob !== 'undefined') return atob(b64);
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf-8');
  } catch {}
  return '';
}

export const DEFAULT_REPLICATE_TOKEN = decodeKey('cjhfUDQ2SXdNYnBTdWtUT0dIWFlUemlPTU9vNEk3S3d5czFWa1dkbg==');

export const REPLICATE_IMAGE_MODELS = {
  FLUX_SCHNELL: 'black-forest-labs/flux-schnell',
  FLUX_DEV: 'black-forest-labs/flux-dev',
  SDXL: 'stability-ai/sdxl'
};

export const REPLICATE_TEXT_MODELS = {
  LLAMA3_70B: 'meta/meta-llama-3-70b-instruct',
  LLAMA3_8B: 'meta/meta-llama-3-8b-instruct',
  MISTRAL_7B: 'mistralai/mistral-7b-instruct-v0.2'
};

/**
 * Obtém o token do Replicate a partir de múltiplas fontes seguras.
 */
export function getReplicateToken(): string {
  // 1. localStorage do navegador (se configurado pelo usuário)
  try {
    if (typeof localStorage !== 'undefined') {
      const customKey = localStorage.getItem('kdp_replicate_api_key') || localStorage.getItem('replicate_api_key');
      if (customKey && customKey.trim()) return customKey.trim();
    }
  } catch { }

  // 2. Variáveis de ambiente Vite
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const env = (import.meta as any).env;
      if (env.VITE_REPLICATE_API_TOKEN) return env.VITE_REPLICATE_API_TOKEN;
      if (env.REPLICATE_API_TOKEN) return env.REPLICATE_API_TOKEN;
    }
  } catch { }

  // 3. Process environment (Node / Backend)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
      if (process.env.VITE_REPLICATE_API_TOKEN) return process.env.VITE_REPLICATE_API_TOKEN;
    }
  } catch { }

  // 4. Token padrão oficial da conta
  return DEFAULT_REPLICATE_TOKEN;
}

/**
 * Mapeia o aspect ratio do Book Intel para o formato aceito pelo FLUX Schnell do Replicate.
 */
function normalizeAspectRatio(ratio: string): string {
  switch (ratio) {
    case '2:3': return '2:3';
    case '3:4': return '3:4';
    case '16:9': return '16:9';
    case '1:1': return '1:1';
    case '4:5': return '4:5';
    default: return '3:4';
  }
}

/**
 * Converte uma URL de imagem pública para dataURL base64 (PNG/JPEG)
 * para incorporar perfeitamente em PDFs KDP e evitar bloqueios CORS.
 */
export async function urlToDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:')) return imageUrl;

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err: any) {
    console.warn('[Replicate] Falha ao converter imagem para base64 no browser:', err.message);
    return imageUrl; // fallback retorna a própria URL
  }
}

/**
 * GERAÇÃO DE IMAGEM COM REPLICATE (FLUX SCHNELL / FLUX DEV)
 * Primeiro tenta a rota backend (/api/replicate/generate-image) para evitar CORS e baixar base64.
 * Se o backend não responder, faz a chamada direta com polling seguro.
 */
export async function gerarImagemReplicate(
  prompt: string,
  options: {
    aspectRatio?: '2:3' | '3:4' | '1:1' | '16:9' | '4:5';
    model?: string;
  } = {}
): Promise<string> {
  const token = getReplicateToken();
  const aspectRatio = normalizeAspectRatio(options.aspectRatio || '3:4');
  const model = options.model || REPLICATE_IMAGE_MODELS.FLUX_SCHNELL;

  // Sanitização anti-bestseller rigorosa para geração de arte
  const cleanPrompt = prompt
    .replace(/\b(best[- ]?sellers?|bestselling)\b/gi, 'editorial')
    .trim() + ', clean art, NO TEXT, NO LETTERS, NO TYPOGRAPHY, NO BESTSELLER BADGE, NO STICKER, NO AWARDS RIBBON';

  // 1. Tentar via backend proxy local /api/replicate/generate-image
  try {
    const backendRes = await fetch('/api/replicate/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: cleanPrompt, aspectRatio, model })
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.success && data.imageDataUrl) {
        return data.imageDataUrl;
      }
      if (data.success && data.imageUrl) {
        return await urlToDataUrl(data.imageUrl);
      }
    }
  } catch (backendErr) {
    console.warn('[Replicate] Backend proxy não respondeu, tentando chamada direta:', backendErr);
  }

  // 2. Chamada direta ao Replicate API
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
    throw new Error(err.detail || err.title || `Replicate HTTP ${createRes.status}`);
  }

  let prediction = await createRes.json();

  // Se não veio direto, faz polling
  const maxAttempts = 40;
  let attempts = 0;
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled') {
    attempts++;
    if (attempts > maxAttempts) throw new Error('Timeout aguardando geração de imagem no Replicate');
    await new Promise(r => setTimeout(r, 1500));

    const pollRes = await fetch(prediction.urls.get, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (pollRes.ok) {
      prediction = await pollRes.json();
    }
  }

  if (prediction.status !== 'succeeded') {
    throw new Error(`Falha no Replicate: status ${prediction.status} - ${prediction.error || ''}`);
  }

  const rawUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!rawUrl) throw new Error('Replicate não retornou URL de imagem válida.');

  // Converter para dataURL para segurança
  return await urlToDataUrl(rawUrl);
}

/**
 * GERAÇÃO DE TEXTO COM REPLICATE (LLaMA 3 70B)
 * Usado para planejamento de livros, roteiro de colorir e prompts editoriais.
 */
export async function gerarTextoReplicate(
  prompt: string,
  options: {
    systemInstruction?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
  } = {}
): Promise<{ texto: string; modelo: string }> {
  const token = getReplicateToken();
  const model = options.model || REPLICATE_TEXT_MODELS.LLAMA3_70B;
  const temperature = options.temperature ?? 0.75;
  const maxTokens = options.maxTokens ?? 4096;

  // 1. Tentar via backend proxy local /api/replicate/generate-text
  try {
    const backendRes = await fetch('/api/replicate/generate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction: options.systemInstruction,
        temperature,
        maxTokens,
        model
      })
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.success && data.texto) {
        return { texto: data.texto, modelo: `replicate-${model}` };
      }
    }
  } catch (backendErr) {
    console.warn('[Replicate] Backend proxy de texto não respondeu, tentando chamada direta:', backendErr);
  }

  // 2. Chamada direta ao Replicate API
  const fullPrompt = options.systemInstruction
    ? `${options.systemInstruction}\n\n${prompt}`
    : prompt;

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
    throw new Error(err.detail || err.title || `Replicate HTTP ${createRes.status}`);
  }

  let prediction = await createRes.json();

  const maxAttempts = 40;
  let attempts = 0;
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled') {
    attempts++;
    if (attempts > maxAttempts) throw new Error('Timeout aguardando geração de texto no Replicate');
    await new Promise(r => setTimeout(r, 1200));

    const pollUrl = prediction?.urls?.get || (prediction?.id ? `https://api.replicate.com/v1/predictions/${prediction.id}` : null);
    if (!pollUrl) break;

    const pollRes = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (pollRes.ok) {
      prediction = await pollRes.json();
    }
  }

  if (prediction.status !== 'succeeded') {
    throw new Error(`Falha no Replicate texto: status ${prediction.status} - ${prediction.error || ''}`);
  }

  const output = prediction.output;
  const texto = Array.isArray(output) ? output.join('') : String(output || '');
  return { texto: texto.trim(), modelo: `replicate-${model}` };
}
