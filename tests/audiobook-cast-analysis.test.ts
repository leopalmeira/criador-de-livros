import { describe, it, expect } from 'vitest';
import http from 'node:http';
import { createAudiobookApi } from '../server/audiobook/api.js';
import { ReplicateTextError } from '../server/replicate/api.js';

async function withApi(options: Record<string, unknown>, run: (baseUrl: string) => Promise<void>) {
  const handler = createAudiobookApi({ service: { engines: {} }, ...options } as any);
  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://localhost');
    const handled = await handler(req, res, reqUrl);
    if (!handled) {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('Audiobook AI cast backend routes', () => {
  it('rejects missing or empty chapter input before calling Replicate', async () => {
    let called = false;
    await withApi({
      generateReplicateText: async () => {
        called = true;
        return '{}';
      }
    }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/audiobook/analyze-cast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters: [{ text: '  ' }] })
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ success: false, code: 'EMPTY_CHAPTER' });
      expect(called).toBe(false);
    });
  });

  it('returns the actionable Replicate analysis error instead of a generic failure', async () => {
    await withApi({
      generateReplicateText: async () => {
        throw new ReplicateTextError('O serviço de análise respondeu HTTP 503.', 502, 'REPLICATE_REQUEST_FAILED');
      }
    }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/audiobook/analyze-cast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters: [{ text: 'Texto para analisar.' }] })
      });
      expect(response.status).toBe(502);
      expect(await response.json()).toMatchObject({
        success: false,
        error: 'O serviço de análise respondeu HTTP 503.',
        code: 'REPLICATE_REQUEST_FAILED'
      });
    });
  });

  it('enforces the per-chapter text bound', async () => {
    await withApi({}, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/audiobook/analyze-cast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters: [{ text: 'x'.repeat(20_001) }] })
      });
      expect(response.status).toBe(413);
      expect(await response.json()).toMatchObject({ success: false, code: 'CHAPTER_TOO_LARGE' });
    });
  });

  it('returns an unconfigured Fish Audio response without calling upstream or exposing a key', async () => {
    let called = false;
    await withApi({
      fishApiKey: '',
      fetchImpl: async () => {
        called = true;
        throw new Error('must not fetch');
      }
    }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/audiobook/fish-audio/models`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true, configured: false, voices: [] });
      expect(called).toBe(false);
    });
  });

  it('returns only normalized Fish Audio voice fields', async () => {
    const fishKey = 'fish-secret-not-for-client';
    let authorization = '';
    await withApi({
      fishApiKey: fishKey,
      fetchImpl: async (url: string, init: RequestInit) => {
        expect(url).toBe('https://api.fish.audio/model?self=true&page_size=100');
        authorization = String(init.headers && (init.headers as Record<string, string>).Authorization);
        return new Response(JSON.stringify({
          items: [
            { _id: 'voice-1', title: 'Narrator', languages: ['en', 'pt'], extra: 'private metadata' },
            { id: 'voice-2', title: 'Character', languages: ['pt'], secret: fishKey }
          ]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/audiobook/fish-audio/models`);
      expect(response.status).toBe(200);
      expect(authorization).toBe(`Bearer ${fishKey}`);
      const body = await response.json();
      expect(body).toEqual({
        success: true,
        configured: true,
        voices: [
          { id: 'voice-1', title: 'Narrator', languages: ['en', 'pt'] },
          { id: 'voice-2', title: 'Character', languages: ['pt'] }
        ]
      });
      expect(JSON.stringify(body)).not.toContain(fishKey);
    });
  });

  it('uses the server Replicate token and returns validated verbatim chapter segments and cast', async () => {
    const original = '“Olá,  Maria!”,\n disse João.';
    const expected = {
      cast: [
        { id: 'cast-1', name: 'Narrador', gender: 'male' },
        { id: 'cast-2', name: 'João', gender: 'male' }
      ],
      chapters: [{
        index: 0,
        segments: [{ segmentIndex: 0, speakerId: 'cast-2' }]
      }]
    };
    const replicateToken = 'replicate-server-secret';
    let authHeader = '';
    let sentPrompt = '';
    await withApi({
      replicateToken,
      fetchImpl: async (url: string, init: RequestInit = {}) => {
        expect(url).toBe('https://api.replicate.com/v1/models/meta/meta-llama-3-70b-instruct/predictions');
        authHeader = String(init.headers && (init.headers as Record<string, string>).Authorization);
        sentPrompt = String((JSON.parse(String(init.body)) as { input: { prompt: string } }).input.prompt);
        return new Response(JSON.stringify({
          status: 'succeeded',
          output: ['Resultado da análise:\n\n```json\n' + JSON.stringify(expected) + '\n```']
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/audiobook/analyze-cast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters: [{ id: 'ch-1', title: 'Capítulo', text: original }] })
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        success: true,
        cast: [
          { id: 'narrator', name: 'Narrador', gender: 'unknown' },
          { id: 'cast-2', name: 'João', gender: 'male' }
        ],
        chapters: [{
          index: 0,
          title: 'Capítulo',
          segments: [{ text: original, speakerId: 'cast-2', pauseAfterMs: 360, soundCue: null }]
        }]
      });
      expect(authHeader).toBe(`Token ${replicateToken}`);
      expect(sentPrompt).toContain(JSON.stringify(original));
    });
  });

  it('rebuilds source text verbatim even if the model tries to rewrite a segment', async () => {
    await withApi({
      generateReplicateText: async () => JSON.stringify({
        cast: [{ id: 'cast-1', name: 'Narrador', gender: 'unknown' }],
        chapters: [{
          index: 0,
          title: '',
          segments: [{ segmentIndex: 0, text: 'Texto reescrito', speakerId: 'cast-1' }]
        }]
      })
    }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/audiobook/analyze-cast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters: [{ text: 'Texto original' }] })
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        success: true,
        chapters: [{ segments: [{ text: 'Texto original', speakerId: 'narrator' }] }]
      });
    });
  });

  it('accepts previously identified speakers across analysis batches', async () => {
    await withApi({
      generateReplicateText: async (prompt: string) => {
        expect(prompt).toContain('"id":"cast-1","name":"Maria"');
        return JSON.stringify({
          cast: [{ id: 'narrator', name: 'Narrador', gender: 'unknown' }],
          chapters: [{
            index: 0,
            title: 'Parte 2',
            segments: [{ segmentIndex: 0, speakerId: 'cast-1' }]
          }]
        });
      }
    }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/audiobook/analyze-cast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapters: [{ text: 'Ela voltou.' }],
          knownCast: [{ id: 'cast-1', name: 'Maria', gender: 'female' }]
        })
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        success: true,
        cast: [
          { id: 'narrator', name: 'Narrador' },
          { id: 'cast-1', name: 'Maria', gender: 'female' }
        ],
        chapters: [{ segments: [{ text: 'Ela voltou.', speakerId: 'cast-1' }] }]
      });
    });
  });
});
