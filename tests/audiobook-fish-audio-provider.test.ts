import { afterEach, describe, expect, it, vi } from 'vitest';
import { FishAudioProvider } from '../server/audiobook/providers/fish-audio-provider.js';

function dummyMp3Buffer(): Buffer {
  const frame = Buffer.alloc(144);
  frame[0] = 0xff;
  frame[1] = 0xf3;
  frame[2] = 0x64;
  frame[3] = 0xc0;
  return frame;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FishAudioProvider', () => {
  it('requires a backend key and voice model ID', async () => {
    const unconfigured = new FishAudioProvider({});
    expect(await unconfigured.isAvailable()).toBe(false);

    const configured = new FishAudioProvider({
      FISH_API_KEY: 'test-key',
      FISH_VOICE_ID_MALE: 'male-model',
      FISH_VOICE_ID_FEMALE: 'female-model'
    });
    expect(await configured.isAvailable()).toBe(true);
    expect(configured.supports('pt-BR', 'male')).toBe(true);
    expect(configured.supports('unknown', 'male')).toBe(false);
    expect(configured.honorsGender).toBe(true);
  });

  it('sends Fish Audio’s TTS request with a backend bearer token and returns MP3', async () => {
    const fetchMock = vi.fn(async (url: string, _options: RequestInit) =>
      url === 'https://api.fish.audio/model?self=true&page_size=100'
        ? new Response(JSON.stringify({ items: [{ _id: 'female-model' }] }), { status: 200 })
        : new Response(dummyMp3Buffer(), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = new FishAudioProvider({
      FISH_API_KEY: 'test-key',
      FISH_VOICE_ID_MALE: 'male-model',
      FISH_VOICE_ID_FEMALE: 'female-model'
    });
    const audio = await provider.synthesizeSegment('Hello there.', 'en-US', 'female');

    expect(audio).toEqual(dummyMp3Buffer());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [modelsUrl, modelsOptions] = fetchMock.mock.calls[0];
    expect(modelsUrl).toBe('https://api.fish.audio/model?self=true&page_size=100');
    expect(modelsOptions?.headers).toMatchObject({
      Authorization: expect.stringMatching(/^Bearer /)
    });
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe('https://api.fish.audio/v1/tts');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({
      Authorization: 'Bearer test-key',
      model: 's2.1-pro-free'
    });
    expect(JSON.parse(String(options?.body))).toMatchObject({
      text: 'Hello there.',
      reference_id: 'female-model',
      format: 'mp3',
      mp3_bitrate: 128
    });
  });
});
