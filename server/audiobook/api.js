// ================================================================
// AUDIOBOOK STUDIO — API HTTP (/api/audiobook/...)
// - GET  /languages
// - POST /manuscript
// - POST /generate   (recebe estritamente: { projectId, language, voiceGender })
// - GET  /status/:projectId
// - POST /reset
// - GET  /file/:projectId/final         (suporte a HTTP Range e ?download=1)
// - GET  /file/:projectId/chapters/:file (suporte a HTTP Range e ?download=1)
// - GET  /download-chapters/:projectId  (gera ZIP com todos os capítulos)
// ================================================================

import fs from 'node:fs';
import JSZip from 'jszip';
import { getDefaultAudiobookService, AudiobookError } from './service.js';
import { listPublicLanguages } from './languages.js';
import { getEngineStatus, getAvailableVoices } from './engine-diagnostics.js';
import { getDefaultSFXProvider } from './sfx-provider.js';

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(body);
}

function parseBody(req, maxBytes = 35 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        req.destroy();
        reject(new AudiobookError('Manuscrito excede o limite máximo suportado.', 413, 'PAYLOAD_TOO_LARGE'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        const text = Buffer.concat(chunks).toString('utf-8');
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new AudiobookError('JSON inválido na requisição.', 400, 'INVALID_JSON'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

/**
 * Serve um arquivo com suporte a HTTP Range (206 Partial Content) para permitir seek suave no player.
 */
function streamAudioFile(filePath, req, res, downloadFilename = null) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return sendJson(res, 404, { success: false, error: 'Arquivo de áudio não encontrado.' });
  }

  const fileSize = stat.size;
  const rangeHeader = req.headers.range;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');
  const isWav = filePath.toLowerCase().endsWith('.wav');
  res.setHeader('Content-Type', isWav ? 'audio/wav' : 'audio/mpeg');

  if (downloadFilename) {
    const safeName = downloadFilename.replace(/["\r\n]/g, '').trim() || 'audiobook.mp3';
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  }

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
      res.statusCode = 416; // Range Not Satisfiable
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunkLength = end - start + 1;
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkLength);

    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('error', () => {
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    });
    return stream.pipe(res);
  }

  res.statusCode = 200;
  res.setHeader('Content-Length', fileSize);
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) res.statusCode = 500;
    res.end();
  });
  return stream.pipe(res);
}

export function createAudiobookApi(options = {}) {
  const service = options.service || getDefaultAudiobookService();

  return async function handleAudiobookApi(req, res, reqUrl) {
    const pathname = reqUrl.pathname || '';
    if (!pathname.startsWith('/api/audiobook')) {
      return false;
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      res.statusCode = 204;
      res.end();
      return true;
    }

    const sub = pathname.replace(/^\/api\/audiobook/, '') || '/';

    try {
      // 1. GET /languages
      if (req.method === 'GET' && (sub === '/languages' || sub === '/languages/')) {
        sendJson(res, 200, { success: true, languages: listPublicLanguages() });
        return true;
      }

      // 1b. GET /engine-status — Diagnóstico completo dos motores TTS
      if (req.method === 'GET' && (sub === '/engine-status' || sub === '/engine-status/')) {
        const status = await getEngineStatus(service.engines);
        sendJson(res, 200, { success: true, ...status });
        return true;
      }

      // 1c. GET /voices?language=pt-BR — Vozes reais disponíveis por idioma
      if (req.method === 'GET' && (sub === '/voices' || sub === '/voices/')) {
        const language = reqUrl.searchParams?.get('language') || 'pt-BR';
        const result = await getAvailableVoices(language, service.engines);
        sendJson(res, 200, { success: true, ...result });
        return true;
      }

      // 2. POST /manuscript
      if (req.method === 'POST' && (sub === '/manuscript' || sub === '/manuscript/')) {
        const body = await parseBody(req);
        const projectId = String(body?.projectId ?? '').trim();
        if (!projectId) {
          throw new AudiobookError('Identificador do projeto é obrigatório.', 400, 'MISSING_PROJECT_ID');
        }
        const result = await service.saveManuscript(projectId, body);
        sendJson(res, 200, { success: true, ...result });
        return true;
      }

      // 3. POST /generate
      if (req.method === 'POST' && (sub === '/generate' || sub === '/generate/')) {
        const body = await parseBody(req);
        const projectId = String(body?.projectId ?? '').trim();
        const language = String(body?.language ?? '').trim();
        const voiceGender = String(body?.voiceGender ?? '').trim();

        if (!projectId) {
          throw new AudiobookError('Identificador do projeto é obrigatório.', 400, 'MISSING_PROJECT_ID');
        }

        const status = await service.startGeneration({ projectId, language, voiceGender });
        sendJson(res, 202, { success: true, status });
        return true;
      }

      // 4. GET /status/:projectId
      if (req.method === 'GET' && sub.startsWith('/status/')) {
        const projectId = decodeURIComponent(sub.replace('/status/', '').split('/')[0].split('?')[0]);
        const status = await service.getStatus(projectId);
        sendJson(res, 200, { success: true, status });
        return true;
      }

      // 5. POST /reset
      if (req.method === 'POST' && (sub === '/reset' || sub === '/reset/')) {
        const body = await parseBody(req);
        const projectId = String(body?.projectId ?? '').trim();
        if (!projectId) {
          throw new AudiobookError('Identificador do projeto é obrigatório.', 400, 'MISSING_PROJECT_ID');
        }
        const status = await service.reset(projectId);
        sendJson(res, 200, { success: true, status });
        return true;
      }

      // 6. GET /file/:projectId/final
      if (req.method === 'GET' && /^\/file\/[^/]+\/final\/?$/.test(sub)) {
        const m = sub.match(/^\/file\/([^/]+)\/final/);
        const projectId = decodeURIComponent(m[1]);
        const resolved = await service.resolveFile(projectId, 'final');
        if (!resolved) {
          return sendJson(res, 404, { success: false, error: 'O audiobook final ainda não foi gerado.' });
        }
        const isDownload = reqUrl.searchParams?.get('download') === '1';
        const filename = isDownload ? (resolved.downloadName || `audiobook_${projectId}.mp3`) : null;
        streamAudioFile(resolved.path, req, res, filename);
        return true;
      }

      // 7. GET /file/:projectId/chapters/:file
      if (req.method === 'GET' && /^\/file\/[^/]+\/chapters\/[^/]+$/.test(sub)) {
        const m = sub.match(/^\/file\/([^/]+)\/chapters\/([^/?]+)/);
        const projectId = decodeURIComponent(m[1]);
        const chapterFile = decodeURIComponent(m[2]);
        const resolved = await service.resolveFile(projectId, chapterFile);
        if (!resolved) {
          return sendJson(res, 404, { success: false, error: 'Capítulo de áudio não encontrado.' });
        }
        const isDownload = reqUrl.searchParams?.get('download') === '1';
        const filename = isDownload ? (resolved.downloadName || chapterFile) : null;
        streamAudioFile(resolved.path, req, res, filename);
        return true;
      }

      // 8. GET /download-chapters/:projectId
      if (req.method === 'GET' && sub.startsWith('/download-chapters/')) {
        const projectId = decodeURIComponent(sub.replace('/download-chapters/', '').split('/')[0].split('?')[0]);
        const files = await service.listDoneChapterFiles(projectId);
        if (!files || files.length === 0) {
          return sendJson(res, 404, { success: false, error: 'Nenhum capítulo disponível para download.' });
        }

        const zip = new JSZip();
        for (const f of files) {
          try {
            const buf = await fs.promises.readFile(f.absPath);
            zip.file(f.file, buf);
          } catch {}
        }

        const zipBuffer = await zip.generateAsync({
          type: 'nodebuffer',
          compression: 'STORE' // MP3 já é comprimido
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="audiobook_${projectId}_capitulos.zip"`);
        res.setHeader('Content-Length', zipBuffer.length);
        res.statusCode = 200;
        res.end(zipBuffer);
        return true;
      }

      // 9. GET /sfx/search?query=rain&maxDuration=15 — Busca efeitos sonoros reais
      if (req.method === 'GET' && sub.startsWith('/sfx/search')) {
        const query = reqUrl.searchParams?.get('query') || 'ambient';
        const maxDuration = parseFloat(reqUrl.searchParams?.get('maxDuration') || '30');
        const minDuration = parseFloat(reqUrl.searchParams?.get('minDuration') || '0.5');
        const sfxProvider = getDefaultSFXProvider();
        const result = await sfxProvider.search(query, { maxDuration, minDuration });
        sendJson(res, 200, { success: true, ...result });
        return true;
      }

      // 10. POST /sfx/download — Baixa e armazena um efeito sonoro no cache local
      if (req.method === 'POST' && (sub === '/sfx/download' || sub === '/sfx/download/')) {
        const body = await parseBody(req);
        const freesoundId = parseInt(body?.freesoundId || body?.id || '0', 10);
        if (!freesoundId) {
          throw new AudiobookError('ID do efeito sonoro é obrigatório.', 400, 'MISSING_SFX_ID');
        }
        const sfxProvider = getDefaultSFXProvider();
        const result = await sfxProvider.download(freesoundId);
        sendJson(res, 200, { success: true, ...result, freesoundId });
        return true;
      }

      // 11. GET /sfx/cached — Lista efeitos já baixados no cache local
      if (req.method === 'GET' && (sub === '/sfx/cached' || sub === '/sfx/cached/')) {
        const sfxProvider = getDefaultSFXProvider();
        const cached = sfxProvider.listCached();
        sendJson(res, 200, { success: true, count: cached.length, effects: cached });
        return true;
      }

      // 12. GET /sfx/file/:id — Serve um arquivo de efeito sonoro do cache
      if (req.method === 'GET' && sub.startsWith('/sfx/file/')) {
        const sfxId = decodeURIComponent(sub.replace('/sfx/file/', '').split('?')[0]);
        const sfxProvider = getDefaultSFXProvider();
        const sfxPath = sfxProvider.getCachePath(sfxId);
        if (!sfxProvider.isCached(sfxId)) {
          return sendJson(res, 404, { success: false, error: 'Efeito sonoro não encontrado no cache.' });
        }
        streamAudioFile(sfxPath, req, res, null);
        return true;
      }

      // Rota não encontrada dentro de /api/audiobook
      sendJson(res, 404, { success: false, error: 'Endpoint do AudiobookStudio não encontrado.' });
      return true;
    } catch (err) {
      if (err instanceof AudiobookError) {
        sendJson(res, err.status, { success: false, error: err.message, code: err.code });
        return true;
      }
      console.error('[AudiobookApi] Erro interno:', err);
      sendJson(res, 500, { success: false, error: 'Ocorreu um erro interno no estúdio de audiobook.' });
      return true;
    }
  };
}

let defaultApiHandler = null;
export async function handleAudiobookApi(req, res, reqUrl) {
  if (!defaultApiHandler) {
    defaultApiHandler = createAudiobookApi();
  }
  return defaultApiHandler(req, res, reqUrl);
}
