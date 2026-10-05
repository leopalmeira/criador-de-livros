// ================================================================
// AUDIOBOOK STUDIO — FREESOUND SFX PROVIDER (BACKEND)
// Busca e download de efeitos sonoros reais via Freesound.org API
// 
// Regras:
// - Apenas sons CC0 / Public Domain (licenças 0 e 4 no Freesound)
// - Cache local em data/audio-effects/ para reuso offline
// - Nenhuma chave de API exposta no frontend
// - Fallback para biblioteca embutida e síntese acústica
// ================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fetchWithTimeout } from './providers/tts-provider.js';
import { ensureBuiltinSFX } from './builtin-sfx.js';

const FREESOUND_BASE = 'https://freesound.org/apiv2';
const SAFE_LICENSE_FILTER = 'license:"Creative Commons 0"';

const SFX_CACHE_DIR = path.join(process.cwd(), 'data', 'audio-effects');

// Garante que o cache e efeitos embutidos existem
try {
  fs.mkdirSync(SFX_CACHE_DIR, { recursive: true });
  ensureBuiltinSFX();
} catch (err) {
  console.warn('[FreesoundSFX] Erro ao inicializar diretório de efeitos:', err.message);
}

/**
 * Provedor de efeitos sonoros reais via Freesound.org + Cache Local
 */
export class FreesoundSFXProvider {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.FREESOUND_API_KEY || '';
    this.cacheDir = options.cacheDir || SFX_CACHE_DIR;
    this.maxResults = options.maxResults || 12;
    this.logger = options.logger || console;
  }

  get isConfigured() {
    return Boolean(this.apiKey);
  }

  /**
   * Busca efeitos sonoros locais e no Freesound por texto.
   * @param {string} query - Termo de busca (ex: "rain", "chuva", "door", "passos")
   * @param {Object} options - Opções de busca
   * @returns {Promise<{results: Array, total: number, source: string, error?: string}>}
   */
  async search(query, options = {}) {
    const qLower = (query || '').toLowerCase().trim();
    const maxResults = options.maxResults || this.maxResults;
    const minDuration = options.minDuration || 0.5;
    const maxDuration = options.maxDuration || 60;

    // 1. Sempre busca na biblioteca local em cache primeiro
    const allCached = this.listCached();
    const localMatches = qLower
      ? allCached.filter(s =>
          s.name.toLowerCase().includes(qLower) ||
          s.id.toLowerCase().includes(qLower) ||
          (s.category && s.category.toLowerCase().includes(qLower))
        )
      : allCached;

    const formattedLocal = localMatches.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description || `Efeito sonoro (${s.category || 'estúdio'})`,
      durationSeconds: s.duration,
      license: s.license || 'CC0 / Public Domain',
      previewUrl: `/api/audiobook/sfx/file/${encodeURIComponent(s.id)}`,
      downloadUrl: `/api/audiobook/sfx/file/${encodeURIComponent(s.id)}`,
      category: s.category || 'local',
      tags: [s.category, 'local'].filter(Boolean),
      source: 'local',
      cached: true
    }));

    // Se a API key do Freesound não estiver configurada, retorna os locais
    if (!this.apiKey) {
      return {
        results: formattedLocal.slice(0, maxResults),
        total: formattedLocal.length,
        source: 'local',
        freesoundConfigured: false
      };
    }

    // 2. Se a API key estiver configurada, consulta também a API do Freesound
    try {
      const params = new URLSearchParams({
        query: query,
        filter: `duration:[${minDuration} TO ${maxDuration}] ${SAFE_LICENSE_FILTER}`,
        fields: 'id,name,description,duration,license,previews,tags,avg_rating,num_ratings,download',
        sort: 'rating_desc',
        page_size: String(maxResults),
        token: this.apiKey
      });

      const res = await fetchWithTimeout(
        `${FREESOUND_BASE}/search/text/?${params}`,
        { headers: { 'Accept': 'application/json' } },
        10000
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        this.logger.warn?.(`[FreesoundSFX] API respondeu HTTP ${res.status}: ${errText.slice(0, 200)}`);
        return {
          results: formattedLocal.slice(0, maxResults),
          total: formattedLocal.length,
          source: 'local_fallback',
          error: `Freesound API: HTTP ${res.status}`,
          freesoundConfigured: true
        };
      }

      const data = await res.json();
      const freesoundResults = (data.results || []).map(sound => {
        const soundId = `freesound_${sound.id}`;
        const isAlreadyCached = this.isCached(soundId);
        return {
          id: soundId,
          freesoundId: sound.id,
          name: sound.name || 'Efeito Sonoro',
          description: (sound.description || '').slice(0, 200),
          durationSeconds: Math.round((sound.duration || 0) * 10) / 10,
          license: sound.license || 'CC0',
          previewUrl: isAlreadyCached
            ? `/api/audiobook/sfx/file/${encodeURIComponent(soundId)}`
            : sound.previews?.['preview-lq-mp3'] || sound.previews?.['preview-hq-mp3'] || null,
          downloadUrl: sound.download || null,
          tags: Array.isArray(sound.tags) ? sound.tags.slice(0, 10) : [],
          rating: sound.avg_rating || 0,
          ratingCount: sound.num_ratings || 0,
          source: 'freesound',
          cached: isAlreadyCached
        };
      });

      // Mescla resultados locais com remotos do Freesound
      const combined = [...formattedLocal, ...freesoundResults].slice(0, maxResults);

      return {
        results: combined,
        total: formattedLocal.length + (data.count || freesoundResults.length),
        source: 'freesound',
        freesoundConfigured: true
      };
    } catch (err) {
      this.logger.warn?.(`[FreesoundSFX] Erro na busca remota: ${err.message}`);
      return {
        results: formattedLocal.slice(0, maxResults),
        total: formattedLocal.length,
        source: 'local',
        error: err.message,
        freesoundConfigured: true
      };
    }
  }

  /**
   * Baixa um efeito sonoro do Freesound e armazena no cache local.
   * @param {number|string} freesoundId - ID do som no Freesound
   * @returns {Promise<{path: string, cached: boolean, size: number, id: string}>}
   */
  async download(freesoundId) {
    const rawId = parseInt(String(freesoundId).replace('freesound_', ''), 10);
    if (!rawId) {
      throw new Error(`ID do som inválido: ${freesoundId}`);
    }

    const cacheId = `freesound_${rawId}`;
    const cachedPath = this.getCachePath(cacheId);

    // Se já estiver no cache, retorna direto
    if (this.isCached(cacheId)) {
      const stat = fs.statSync(cachedPath);
      return { path: cachedPath, cached: true, size: stat.size, id: cacheId };
    }

    if (!this.apiKey) {
      throw new Error('Freesound API key não configurada para downloads remotos.');
    }

    // Baixa o preview MP3 de alta qualidade (livre de autenticação OAuth para previews públicos)
    try {
      const metaRes = await fetchWithTimeout(
        `${FREESOUND_BASE}/sounds/${rawId}/?token=${this.apiKey}&fields=previews,name,duration,license`,
        { headers: { 'Accept': 'application/json' } },
        8000
      );

      if (!metaRes.ok) throw new Error(`Metadados do som: HTTP ${metaRes.status}`);
      const meta = await metaRes.json();

      const previewUrl = meta.previews?.['preview-hq-mp3'] || meta.previews?.['preview-lq-mp3'];
      if (!previewUrl) throw new Error('Nenhum preview de áudio disponível para este som.');

      const audioRes = await fetchWithTimeout(previewUrl, {}, 30000);
      if (!audioRes.ok) throw new Error(`Download do áudio: HTTP ${audioRes.status}`);

      const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
      if (audioBuffer.length < 100) throw new Error('Arquivo de áudio muito pequeno ou corrompido.');

      // Salva no cache
      const mp3Target = path.join(this.cacheDir, `${cacheId}.mp3`);
      fs.mkdirSync(path.dirname(mp3Target), { recursive: true });
      fs.writeFileSync(mp3Target, audioBuffer);

      // Salva metadados
      const metaPath = path.join(this.cacheDir, `${cacheId}.json`);
      fs.writeFileSync(metaPath, JSON.stringify({
        id: cacheId,
        freesoundId: rawId,
        name: meta.name || 'Efeito Sonoro',
        duration: Math.round((meta.duration || 0) * 10) / 10,
        downloadedAt: Date.now(),
        license: meta.license || 'CC0',
        source: 'freesound'
      }, null, 2));

      return { path: mp3Target, cached: false, size: audioBuffer.length, id: cacheId };
    } catch (err) {
      this.logger.error?.(`[FreesoundSFX] Erro ao baixar som ${rawId}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Lista efeitos já disponíveis no cache local (WAV e MP3)
   */
  listCached() {
    try {
      const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.wav') || f.endsWith('.mp3'));
      const seen = new Set();
      const result = [];

      for (const f of files) {
        const id = f.replace(/\.(wav|mp3)$/, '');
        if (seen.has(id)) continue;
        seen.add(id);

        const metaPath = path.join(this.cacheDir, `${id}.json`);
        let meta = {};
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        } catch {}

        result.push({
          id,
          file: f,
          path: path.join(this.cacheDir, f),
          name: meta.name || id.replace(/^sfx_/, '').replace(/_/g, ' '),
          duration: meta.duration || 5,
          category: meta.category || 'sound_effects',
          isAmbient: Boolean(meta.isAmbient),
          license: meta.license || 'CC0 / Public Domain',
          source: meta.source || 'local',
          downloadedAt: meta.downloadedAt || meta.createdAt || 0
        });
      }

      return result;
    } catch {
      return [];
    }
  }

  /**
   * Caminho completo do arquivo no cache
   */
  getCachePath(id) {
    const safeName = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const wavPath = path.join(this.cacheDir, `${safeName}.wav`);
    if (fs.existsSync(wavPath)) return wavPath;
    return path.join(this.cacheDir, `${safeName}.mp3`);
  }

  /**
   * Verifica se o efeito já está salvo e íntegro no cache
   */
  isCached(id) {
    try {
      const p = this.getCachePath(id);
      return fs.existsSync(p) && fs.statSync(p).size > 100;
    } catch {
      return false;
    }
  }
}

// Singleton
let defaultProvider = null;
export function getDefaultSFXProvider() {
  if (!defaultProvider) defaultProvider = new FreesoundSFXProvider();
  return defaultProvider;
}
