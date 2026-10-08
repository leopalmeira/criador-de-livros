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
import { spawn } from 'node:child_process';
import { Transform } from 'node:stream';
import JSZip from 'jszip';
import { getDefaultAudiobookService, AudiobookError } from './service.js';
import { listPublicLanguages } from './languages.js';
import { getEngineStatus, getAvailableVoices } from './engine-diagnostics.js';
import { getDefaultSFXProvider } from './sfx-provider.js';
import { getFfmpegPath, hasFfmpeg } from './mp3.js';
import { generateReplicateText, ReplicateTextError } from '../replicate/api.js';

const previewCache = new Map();
const MAX_CAST_ANALYSIS_BODY_BYTES = 160 * 1024;
const MAX_CAST_ANALYSIS_CHAPTERS = 20;
const MAX_CAST_ANALYSIS_CHAPTER_CHARS = 20_000;
const MAX_CAST_ANALYSIS_TOTAL_CHARS = 40_000;
const MAX_FINAL_WAV_BYTES = 1024 * 1024 * 1024;
const SOUND_CUE_TYPES = new Set([
  'rain', 'thunder', 'wind', 'door', 'footsteps', 'impact',
  'clock', 'phone', 'birds', 'river', 'vehicle', 'tension'
]);

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
    let settled = false;
    req.on('data', (chunk) => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > maxBytes) {
        settled = true;
        reject(new AudiobookError('Manuscrito excede o limite máximo suportado.', 413, 'PAYLOAD_TOO_LARGE'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      if (chunks.length === 0) return resolve({});
      try {
        const text = Buffer.concat(chunks).toString('utf-8');
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new AudiobookError('JSON inválido na requisição.', 400, 'INVALID_JSON'));
      }
    });
    req.on('error', (err) => {
      if (!settled) reject(err);
    });
  });
}

function streamFinalMp3(req, res) {
  const ffmpeg = spawn(getFfmpegPath(), [
    '-hide_banner', '-loglevel', 'error',
    '-i', 'pipe:0',
    '-ac', '2', '-ar', '44100', '-b:a', '128k',
    '-f', 'mp3', 'pipe:1'
  ]);
  const errors = [];
  let receivedBytes = 0;
  let header = Buffer.alloc(0);
  let streamError = null;
  let outputStarted = false;
  const inputGuard = new Transform({
    transform(chunk, _encoding, callback) {
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_FINAL_WAV_BYTES) {
        streamError = new AudiobookError('O WAV final excede o limite de 1 GB.', 413, 'FINAL_AUDIO_TOO_LARGE');
        callback(streamError);
        return;
      }
      if (header.length < 12) {
        header = Buffer.concat([header, chunk.subarray(0, 12 - header.length)]);
        if (header.length >= 12 &&
            (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE')) {
          streamError = new AudiobookError('O arquivo enviado não é um WAV válido.', 400, 'INVALID_FINAL_AUDIO');
          callback(streamError);
          return;
        }
      }
      callback(null, chunk);
    },
    flush(callback) {
      if (header.length < 12) {
        streamError = new AudiobookError('O arquivo WAV está vazio ou incompleto.', 400, 'INVALID_FINAL_AUDIO');
        callback(streamError);
        return;
      }
      callback();
    }
  });

  ffmpeg.stderr.on('data', (chunk) => errors.push(chunk));
  ffmpeg.stdout.on('data', (chunk) => {
    if (!outputStarted) {
      outputStarted = true;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="audiobook-final.mp3"');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.write(chunk);
  });
  inputGuard.on('error', () => ffmpeg.kill());
  ffmpeg.stdin.on('error', () => {});
  ffmpeg.on('error', (error) => {
    if (!res.headersSent) {
      sendJson(res, 500, { success: false, error: error.message, code: 'MP3_RENDER_FAILED' });
    } else {
      res.destroy(error);
    }
  });
  ffmpeg.on('close', (code) => {
    if (code === 0 && outputStarted) {
      res.end();
    } else if (!res.headersSent) {
      const error = streamError || new AudiobookError(
        `Falha ao gerar o MP3 final${errors.length ? `: ${Buffer.concat(errors).toString().slice(0, 200)}` : '.'}`,
        500,
        'MP3_RENDER_FAILED'
      );
      sendJson(res, error.status, { success: false, error: error.message, code: error.code });
    } else {
      res.destroy();
    }
  });
  req.on('aborted', () => ffmpeg.kill());
  req.pipe(inputGuard).pipe(ffmpeg.stdin);
}

function parseCastAnalysisOutput(raw) {
  const text = String(raw || '').trim();
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index++) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === '{') depth++;
      else if (char === '}' && --depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(start, index + 1));
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch {
          break;
        }
      }
    }
  }
  throw new AudiobookError(
    'A IA não retornou a análise estruturada. Tente novamente; nenhum trecho do livro foi descartado.',
    502,
    'INVALID_ANALYSIS_RESPONSE'
  );
}

function splitCastAnalysisText(text) {
  const segments = [];
  let start = 0;
  const sentenceEnds = /[.!?…]["”')\]]*(?=\s|$)/gu;
  for (const match of text.matchAll(sentenceEnds)) {
    const end = match.index + match[0].length;
    if (end > start) segments.push(text.slice(start, end));
    start = end;
  }
  if (start < text.length) segments.push(text.slice(start));
  return segments.length > 0 ? segments : [text];
}

function validateCastAnalysis(result, chapters, knownCast = []) {
  if (!result || !Array.isArray(result.cast) || !Array.isArray(result.chapters) ||
      result.cast.length > 100 || result.chapters.length !== chapters.length) {
    throw new AudiobookError('A análise retornou uma estrutura incompleta ou inválida.', 502, 'INVALID_ANALYSIS_RESPONSE');
  }

  const castIds = new Set(['narrator', ...knownCast.map(({ id }) => id)]);
  const knownById = new Map(knownCast.map((member) => [member.id, member]));
  const speakerIdAliases = new Map();
  const cast = [
    { id: 'narrator', name: 'Narrador', gender: 'unknown' },
    ...knownCast.filter((member) => member.id !== 'narrator')
  ];
  for (const person of result.cast) {
    const id = typeof person?.id === 'string' ? person.id.trim() : '';
    const name = typeof person?.name === 'string' ? person.name.trim() : '';
    const gender = person?.gender;
    if (!id || id.length > 100 || !name || name.length > 100 ||
        !['male', 'female', 'unknown'].includes(gender)) {
      throw new AudiobookError('A análise retornou um elenco inválido.', 502, 'INVALID_ANALYSIS_RESPONSE');
    }
    if (id === 'narrator' || name.toLocaleLowerCase() === 'narrador') {
      speakerIdAliases.set(id, 'narrator');
      continue;
    }
    if (castIds.has(id)) {
      const knownMember = knownById.get(id);
      if (!knownMember || knownMember.name.toLocaleLowerCase() !== name.toLocaleLowerCase()) {
        throw new AudiobookError('A análise retornou IDs de elenco duplicados.', 502, 'INVALID_ANALYSIS_RESPONSE');
      }
      speakerIdAliases.set(id, id);
      continue;
    }
    if (cast.length >= 100) {
      throw new AudiobookError('A análise retornou um elenco muito grande.', 502, 'INVALID_ANALYSIS_RESPONSE');
    }
    castIds.add(id);
    cast.push({ id, name, gender });
  }

  const analyzedChapters = result.chapters.map((chapter, index) => {
    const expected = chapters[index];
    if (!chapter || chapter.index !== index || !Array.isArray(chapter.segments) || chapter.segments.length > 2_000) {
      throw new AudiobookError('A análise retornou capítulos fora de ordem ou inválidos.', 502, 'INVALID_ANALYSIS_RESPONSE');
    }
    const speakerBySegment = new Map();
    chapter.segments.forEach((segment, outputIndex) => {
      const segmentIndex = Number.isInteger(segment?.segmentIndex)
        ? segment.segmentIndex
        : outputIndex;
      const suppliedSpeakerId = typeof segment?.speakerId === 'string' ? segment.speakerId : '';
      const speakerId = speakerIdAliases.get(suppliedSpeakerId) || suppliedSpeakerId;
      if (segmentIndex < 0 || segmentIndex >= expected.analysisSegments.length || !castIds.has(speakerId)) {
        throw new AudiobookError('A análise retornou segmentos ou narradores inválidos.', 502, 'INVALID_ANALYSIS_RESPONSE');
      }
      if (!speakerBySegment.has(segmentIndex)) {
        const requestedPause = Number(segment?.pauseAfterMs);
        const pauseAfterMs = Number.isFinite(requestedPause)
          ? Math.max(0, Math.min(2500, Math.round(requestedPause)))
          : 0;
        const soundCue = SOUND_CUE_TYPES.has(segment?.soundCue) ? segment.soundCue : null;
        speakerBySegment.set(segmentIndex, { speakerId, pauseAfterMs, soundCue });
      }
    });
    const segments = expected.analysisSegments.map((text, segmentIndex) => {
      const analysis = speakerBySegment.get(segmentIndex);
      const next = speakerBySegment.get(segmentIndex + 1);
      const punctuationPause = /[?!”»]$/.test(text.trim())
        ? 520
        : /[.!…]$/.test(text.trim())
          ? 360
          : 0;
      const speakerChangePause = next && analysis && next.speakerId !== analysis.speakerId ? 350 : 0;
      return {
        speakerId: analysis?.speakerId || 'narrator',
        text,
        pauseAfterMs: Math.max(analysis?.pauseAfterMs || 0, punctuationPause, speakerChangePause),
        soundCue: analysis?.soundCue || null
      };
    });
    return { index, title: expected.title, segments };
  });

  return { cast, chapters: analyzedChapters };
}

function createCastAnalysisPrompt(chapters, knownCast = []) {
  const schema = {
    chapters: chapters.map(({ index }) => ({
      index,
      segments: [{
        segmentIndex: 0,
        speakerId: 'ID do integrante do elenco',
        pauseAfterMs: 450,
        soundCue: 'door|footsteps|rain|thunder|wind|impact|clock|phone|birds|river|vehicle|tension|null'
      }]
    })),
    cast: [
      { id: 'narrator', name: 'Narrador', gender: 'unknown' },
      { id: 'cast-1', name: 'Nome do personagem', gender: 'male|female|unknown' }
    ]
  };
  return [
    'Coordene a direção de áudio dos trechos numerados: identifique quem fala, defina pausas naturais e escolha no máximo um efeito sonoro pertinente por trecho. Responda exclusivamente com JSON válido, sem markdown, seguindo exatamente este formato:',
    JSON.stringify(schema),
    'Cada trecho de entrada já possui um índice fixo. Devolva exatamente um item por trecho, sem alterar os índices; não devolva nem copie os textos. O servidor reconstrói os segmentos diretamente do original. pauseAfterMs deve ficar entre 0 e 2500: use cerca de 250-450 ms após uma frase normal, 500-800 ms após pergunta/exclamação, 700-1200 ms em transição de interlocutor ou pausa dramática, e 0 quando a frase continua. Não exagere nas pausas.',
    'soundCue deve ser um dos valores enumerados no schema ou null. Use somente para eventos audíveis explícitos ou mudança clara de ambiente, não para metáforas; prefira null a inventar ou inserir efeito em toda frase. Limite a 4 cues por capítulo.',
    'O cast deve sempre conter a entrada {id:"narrator", name:"Narrador", gender:"unknown"} para a voz narrativa. Inclua os demais speakers com ids únicos como "cast-1", "cast-2", nome e gender ("male", "female" ou "unknown"). Cada speakerId precisa apontar para um integrante do cast. Atribua falas explícitas ao personagem que as diz e a narração ao "narrator"; se não for possível identificar, use "narrator".',
    knownCast.length > 0
      ? `Elenco já identificado em partes anteriores (reutilize o mesmo id e nome para estas pessoas quando aparecerem novamente): ${JSON.stringify(knownCast)}`
      : '',
    'Capítulos de entrada:',
    JSON.stringify(chapters.map(({ index, title, analysisSegments }) => ({
      index,
      title,
      segments: analysisSegments.map((text, segmentIndex) => ({ segmentIndex, text }))
    })))
  ].join('\n\n');
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

      // 1d. POST /render-mp3 — Converte a master WAV revisada em MP3 estéreo final
      if (sub === '/render-mp3' || sub === '/render-mp3/') {
        if (req.method !== 'POST') {
          sendJson(res, 405, { success: false, error: 'Método não permitido.', code: 'METHOD_NOT_ALLOWED' });
          return true;
        }
        if (!(await hasFfmpeg())) {
          sendJson(res, 503, { success: false, error: 'O conversor MP3 não está disponível no servidor.', code: 'FFMPEG_MISSING' });
          return true;
        }
        if (Number(req.headers['content-length']) > MAX_FINAL_WAV_BYTES) {
          sendJson(res, 413, { success: false, error: 'O WAV final excede o limite de 1 GB.', code: 'FINAL_AUDIO_TOO_LARGE' });
          return true;
        }
        streamFinalMp3(req, res);
        return true;
      }

      // 1d. GET /fish-audio/models — Vozes do usuário autenticado no Fish Audio
      if (sub === '/fish-audio/models' || sub === '/fish-audio/models/') {
        if (req.method !== 'GET') {
          sendJson(res, 405, { success: false, error: 'Método não permitido.', code: 'METHOD_NOT_ALLOWED' });
          return true;
        }
        const apiKey = String(options.fishApiKey ?? process.env.FISH_API_KEY ?? '').trim();
        if (!apiKey) {
          sendJson(res, 200, { success: true, configured: false, voices: [] });
          return true;
        }
        const fetchImpl = options.fetchImpl || globalThis.fetch;
        const response = await fetchImpl('https://api.fish.audio/model?self=true&page_size=100', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (!response.ok) {
          sendJson(res, 502, {
            success: false,
            error: response.status === 401 || response.status === 403
              ? 'Fish Audio recusou as credenciais configuradas.'
              : `Fish Audio respondeu HTTP ${response.status}.`,
            code: response.status === 401 || response.status === 403 ? 'FISH_AUDIO_AUTH_FAILED' : 'FISH_AUDIO_UPSTREAM_ERROR'
          });
          return true;
        }
        const data = await response.json();
        const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : []);
        const voices = items.map((model) => {
          const id = (typeof model?._id === 'string' ? model._id : typeof model?.id === 'string' ? model.id : '').slice(0, 200);
          const title = typeof model?.title === 'string' ? model.title.slice(0, 300) : '';
          const languages = Array.isArray(model?.languages)
            ? model.languages.filter((language) => typeof language === 'string').slice(0, 100).map((language) => language.slice(0, 50))
            : [];
          return { id, title, languages };
        }).filter((model) => model.id && model.title);
        sendJson(res, 200, { success: true, configured: true, voices });
        return true;
      }

      // 1e. POST /analyze-cast — Segmenta capítulos e identifica personagens via Replicate
      if (sub === '/analyze-cast' || sub === '/analyze-cast/') {
        if (req.method !== 'POST') {
          sendJson(res, 405, { success: false, error: 'Método não permitido.', code: 'METHOD_NOT_ALLOWED' });
          return true;
        }
        const body = await parseBody(req, MAX_CAST_ANALYSIS_BODY_BYTES);
        if (!Array.isArray(body?.chapters) || body.chapters.length < 1 || body.chapters.length > MAX_CAST_ANALYSIS_CHAPTERS) {
          throw new AudiobookError(`Envie entre 1 e ${MAX_CAST_ANALYSIS_CHAPTERS} capítulos.`, 400, 'INVALID_CHAPTERS');
        }
        let totalChars = 0;
        const chapters = body.chapters.map((chapter, index) => {
          const text = typeof chapter?.text === 'string' ? chapter.text : '';
          const title = typeof chapter?.title === 'string' ? chapter.title.slice(0, 300) : '';
          const suppliedId = typeof chapter?.id === 'string' ? chapter.id.trim() : '';
          const id = suppliedId.slice(0, 100) || `chapter-${index + 1}`;
          if (!text.trim()) throw new AudiobookError(`O capítulo ${index + 1} não contém texto.`, 400, 'EMPTY_CHAPTER');
          if (text.length > MAX_CAST_ANALYSIS_CHAPTER_CHARS) {
            throw new AudiobookError(`O capítulo ${index + 1} excede o limite de ${MAX_CAST_ANALYSIS_CHAPTER_CHARS} caracteres.`, 413, 'CHAPTER_TOO_LARGE');
          }
          totalChars += text.length;
          return { id, index, title, text, analysisSegments: splitCastAnalysisText(text) };
        });
        if (new Set(chapters.map(({ id }) => id)).size !== chapters.length) {
          throw new AudiobookError('Os identificadores dos capítulos devem ser únicos.', 400, 'DUPLICATE_CHAPTER_ID');
        }
        if (totalChars > MAX_CAST_ANALYSIS_TOTAL_CHARS) {
          throw new AudiobookError(`O texto total excede o limite de ${MAX_CAST_ANALYSIS_TOTAL_CHARS} caracteres.`, 413, 'ANALYSIS_TEXT_TOO_LARGE');
        }
        const suppliedKnownCast = body.knownCast === undefined ? [] : body.knownCast;
        if (!Array.isArray(suppliedKnownCast) || suppliedKnownCast.length > 99) {
          throw new AudiobookError('O elenco de contexto é inválido.', 400, 'INVALID_KNOWN_CAST');
        }
        const knownCast = suppliedKnownCast.map((member) => {
          if (typeof member?.id !== 'string' || !member.id.trim() || member.id.length > 100 ||
              typeof member?.name !== 'string' || !member.name.trim() || member.name.length > 100 ||
              !['male', 'female', 'unknown'].includes(member.gender)) {
            throw new AudiobookError('O elenco de contexto é inválido.', 400, 'INVALID_KNOWN_CAST');
          }
          return { id: member.id.trim(), name: member.name.trim(), gender: member.gender };
        });
        if (new Set(knownCast.map(({ id }) => id)).size !== knownCast.length ||
            knownCast.some((member) => member.id === 'narrator' && member.name !== 'Narrador')) {
          throw new AudiobookError('O elenco de contexto contém identificadores duplicados ou inválidos.', 400, 'INVALID_KNOWN_CAST');
        }

        const analyzeText = options.generateReplicateText || generateReplicateText;
        let raw;
        try {
          raw = await analyzeText(createCastAnalysisPrompt(chapters, knownCast), {
            token: options.replicateToken,
            fetchImpl: options.fetchImpl,
            maxTokens: 4096,
            temperature: 0.1
          });
        } catch (error) {
          if (error instanceof ReplicateTextError) {
            throw new AudiobookError(error.message, error.status, error.code);
          }
          throw error;
        }
        const analysis = validateCastAnalysis(parseCastAnalysisOutput(raw), chapters, knownCast);
        sendJson(res, 200, { success: true, ...analysis });
        return true;
      }

      // 1f. GET ou POST /preview-voice — Sintetiza uma amostra curta para teste de voz antes da geração
      if ((req.method === 'GET' || req.method === 'POST') && (sub === '/preview-voice' || sub === '/preview-voice/')) {
        let language = 'pt-BR';
        let voiceGender = 'male';
        let voiceId = '';
        let text = '';
        if (req.method === 'POST') {
          const body = await parseBody(req);
          language = String(body?.language || 'pt-BR');
          voiceGender = String(body?.voiceGender || 'male');
          voiceId = String(body?.voiceId || '');
          text = String(body?.text || '');
        } else {
          language = String(reqUrl.searchParams?.get('language') || 'pt-BR');
          voiceGender = String(reqUrl.searchParams?.get('voiceGender') || 'male');
          voiceId = String(reqUrl.searchParams?.get('voiceId') || '');
          text = String(reqUrl.searchParams?.get('text') || '');
        }

        const sampleText = text.trim() || (
          language.startsWith('en')
            ? 'Hello! This is a preview of the neural voice that will narrate your book.'
            : language.startsWith('es')
            ? '¡Hola! Esta es una vista previa de la voz neuronal para su audiolibro.'
            : language.startsWith('fr')
            ? 'Bonjour! Ceci est un aperçu de la voix neuronale pour votre livre audio.'
            : language.startsWith('de')
            ? 'Hallo! Dies ist eine Vorschau der neuronalen Stimme für Ihr Hörbuch.'
            : language.startsWith('it')
            ? 'Ciao! Questa è un anteprima della voce neurale per il tuo audiolibro.'
            : 'Olá! Esta é uma demonstração da voz neural selecionada para narrar o seu livro com fidelidade.'
        );

        const cacheKey = `${language}_${voiceGender}_${voiceId}_${sampleText}`;
        if (previewCache.has(cacheKey)) {
          const cached = previewCache.get(cacheKey);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', cached.length);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.end(cached);
          return true;
        }

        try {
          const synthRes = await service.engines.synthesize(sampleText, language, voiceGender, {
            allowDegraded: !voiceId,
            voiceId: voiceId || undefined
          });
          if (synthRes && synthRes.audio) {
            previewCache.set(cacheKey, synthRes.audio);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', synthRes.audio.length);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.end(synthRes.audio);
            return true;
          }
          throw new Error('Falha na síntese do áudio de prévia');
        } catch (err) {
          sendJson(res, 500, { success: false, error: err.message || 'Erro ao gerar amostra de voz' });
          return true;
        }
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
      sendJson(res, 500, {
        success: false,
        error: 'Ocorreu um erro interno no estúdio de audiobook.',
        code: 'AUDIOBOOK_INTERNAL_ERROR'
      });
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
