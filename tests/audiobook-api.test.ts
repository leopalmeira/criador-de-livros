import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createAudiobookApi } from '../server/audiobook/api.js';
import { AudiobookService } from '../server/audiobook/service.js';
import { AudiobookStorage } from '../server/audiobook/storage.js';
import { TTSEngineManager } from '../server/audiobook/engine-manager.js';
import { TTSProvider } from '../server/audiobook/providers/tts-provider.js';

function dummyMp3Buffer(): Buffer {
  const frame = Buffer.alloc(144);
  frame[0] = 0xff;
  frame[1] = 0xf3;
  frame[2] = 0x64;
  frame[3] = 0xc0;
  return frame;
}

function silentWavBuffer(durationSeconds: number): Buffer {
  const sampleRate = 44_100;
  const dataSize = sampleRate * durationSeconds * 2;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);
  return wav;
}

class FastMockTTSProvider extends TTSProvider {
  constructor() {
    super({ name: 'fast-mock', priority: 100, honorsGender: true });
  }
  async isAvailable() { return true; }
  supports() { return true; }
  async synthesizeSegment() {
    return Buffer.concat([dummyMp3Buffer(), dummyMp3Buffer(), dummyMp3Buffer()]);
  }
}

describe('AudiobookStudio — Rotas e Protocolo HTTP (/api/audiobook)', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;
  let tmpDir: string;
  let service: AudiobookService;

  beforeAll(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kdp-audiobook-api-test-'));
    const storage = new AudiobookStorage(tmpDir);
    const engineManager = new TTSEngineManager({ registerDefaults: false });
    engineManager.register(new FastMockTTSProvider());
    service = new AudiobookService({ storage, engineManager, sleep: () => Promise.resolve() });

    const apiHandler = createAudiobookApi({ service });

    server = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url || '/', `http://localhost`);
      const handled = await apiHandler(req, res, reqUrl);
      if (!handled) {
        res.statusCode = 404;
        res.end('Not Found');
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        port = addr.port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    const closed = new Promise<void>((resolve) => server.close(() => resolve()));
    server.closeAllConnections();
    await closed;
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }, 20_000);

  it('1. GET /api/audiobook/languages retorna os idiomas suportados', async () => {
    const res = await fetch(`${baseUrl}/api/audiobook/languages`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.languages)).toBe(true);
    expect(data.languages.length).toBeGreaterThanOrEqual(6);
  });

  it('retorna status idle com coleção de capítulos vazia para uma obra ainda não gerada', async () => {
    const res = await fetch(`${baseUrl}/api/audiobook/status/proj_without_audiobook`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toMatchObject({
      status: 'idle',
      chapters: [],
      progressPercent: 0,
      finalReady: false
    });
  });

  it('recusa métodos diferentes de POST ao gerar o MP3 final', async () => {
    const wrongMethod = await fetch(`${baseUrl}/api/audiobook/render-mp3`);
    expect(wrongMethod.status).toBe(405);
  });

  it('rejeita entrada que não contém um cabeçalho WAV válido', async () => {
    const invalid = await fetch(`${baseUrl}/api/audiobook/render-mp3`, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/wav' },
      body: Buffer.from('not a wave file')
    });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).code).toBe('INVALID_FINAL_AUDIO');
  }, 15_000);

  it('converte a master WAV revisada em MP3 estéreo', async () => {
    const converted = await fetch(`${baseUrl}/api/audiobook/render-mp3`, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/wav' },
      body: silentWavBuffer(0.5)
    });
    expect(converted.status).toBe(200);
    expect(converted.headers.get('content-type')).toBe('audio/mpeg');
    expect((await converted.arrayBuffer()).byteLength).toBeGreaterThan(500);
  }, 30_000);

  it('2. Fluxo completo: POST manuscript -> POST generate -> GET status -> HTTP Range -> ZIP', async () => {
    const projectId = 'proj_api_test_01';

    // A. Enviar manuscrito
    const resManuscript = await fetch(`${baseUrl}/api/audiobook/manuscript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        title: 'Livro de Teste HTTP',
        chapters: [
          { title: 'Primeiro Capítulo', text: 'Era uma vez uma história contada por voz neural.' },
          { title: 'Segundo Capítulo', text: 'E assim o mistério foi solucionado com sucesso.' }
        ]
      })
    });
    expect(resManuscript.status).toBe(200);

    // B. Iniciar geração (enviando estritamente { projectId, language, voiceGender })
    const resGen = await fetch(`${baseUrl}/api/audiobook/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        language: 'pt-BR',
        voiceGender: 'male'
      })
    });
    expect(resGen.status).toBe(202);

    // C. Aguardar conclusão do job em background
    const finalJob = await service.waitForJob(projectId);
    expect(finalJob.status).toBe('completed');

    // D. GET status
    const resStatus = await fetch(`${baseUrl}/api/audiobook/status/${projectId}`);
    expect(resStatus.status).toBe(200);
    const statusData = await resStatus.json();
    expect(statusData.success).toBe(true);
    expect(statusData.status.status).toBe('completed');
    expect(statusData.status.finalReady).toBe(true);
    expect(statusData.status.chapters.length).toBe(3); // 1 intro + 2 capítulos

    // E. GET /file/:projectId/final com suporte a HTTP Range (206 Partial Content)
    const resRange = await fetch(`${baseUrl}/api/audiobook/file/${projectId}/final`, {
      headers: { Range: 'bytes=0-100' }
    });
    expect(resRange.status).toBe(206);
    expect(resRange.headers.get('content-range')).toMatch(/^bytes 0-100\//);
    const audioChunk = await resRange.arrayBuffer();
    expect(audioChunk.byteLength).toBe(101);

    // F. GET /download-chapters/:projectId (Download de ZIP dos capítulos)
    const resZip = await fetch(`${baseUrl}/api/audiobook/download-chapters/${projectId}`);
    expect(resZip.status).toBe(200);
    expect(resZip.headers.get('content-type')).toBe('application/zip');
    const zipBuf = await resZip.arrayBuffer();
    expect(zipBuf.byteLength).toBeGreaterThan(0);

    // G. POST /reset
    const resReset = await fetch(`${baseUrl}/api/audiobook/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    });
    expect(resReset.status).toBe(200);
    const resetData = await resReset.json();
    expect(resetData.status.status).toBe('idle');
  });
});
