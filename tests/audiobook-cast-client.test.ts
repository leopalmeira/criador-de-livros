import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudiobookClient } from '../src/services/audiobook/audiobook-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Audiobook cast analysis batching', () => {
  it('splits long chapters into bounded requests and reconstructs the original text', async () => {
    const text = ('Maria entrou na sala e disse: olá! ').repeat(1_200);
    const requests: Array<{ chapters: Array<{ text: string }>; knownCast: Array<{ name: string }> }> = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      requests.push(body);
      const cast = [
        { id: 'narrator', name: 'Narrador', gender: 'unknown' },
        { id: 'speaker-1', name: 'Maria', gender: 'female' }
      ];
      return new Response(JSON.stringify({
        success: true,
        cast,
        chapters: body.chapters.map((chapter: { title: string; text: string }, index: number) => ({
          index,
          title: chapter.title,
          segments: [{ speakerId: 'speaker-1', text: chapter.text }]
        }))
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));

    const progress: Array<[number, number]> = [];
    const result = await AudiobookClient.analyzeAudiobookCast(
      [{ title: 'Capítulo longo', text }],
      (current, total) => progress.push([current, total])
    );

    expect(requests.length).toBeGreaterThan(1);
    expect(requests.every((request) =>
      request.chapters.length <= 20 &&
      request.chapters.reduce((sum, chapter) => sum + chapter.text.length, 0) <= 35_000
    )).toBe(true);
    expect(requests[1].knownCast).toContainEqual(expect.objectContaining({ name: 'Maria' }));
    expect(result.cast).toHaveLength(2);
    expect(result.chapters[0].segments.map((segment) => segment.text).join('')).toBe(text);
    expect(result.chapters[0].segments.every((segment) => segment.speakerId === result.cast[1].id)).toBe(true);
    expect(progress.at(-1)).toEqual([requests.length, requests.length]);
  });
});
