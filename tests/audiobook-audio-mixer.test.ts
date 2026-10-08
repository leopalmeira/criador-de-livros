import { describe, expect, it } from 'vitest';
import { concatenateWavBlobs } from '../src/services/audiobook/audio-mixer';

function createPcmWav({
  channels = 2,
  sampleRate = 24000,
  bitsPerSample = 16,
  frames = 4
}: {
  channels?: number;
  sampleRate?: number;
  bitsPerSample?: number;
  frames?: number;
} = {}): Blob {
  const bytesPerFrame = channels * (bitsPerSample / 8);
  const dataBytes = frames * bytesPerFrame;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, dataBytes + 36, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerFrame, true);
  view.setUint16(32, bytesPerFrame, true);
  view.setUint16(34, bitsPerSample, true);
  text(36, 'data');
  view.setUint32(40, dataBytes, true);
  return new Blob([header, new Uint8Array(dataBytes)], { type: 'audio/wav' });
}

describe('Audiobook PCM master concatenation', () => {
  it('joins mastered chapters with silence without decoding the full book', async () => {
    const first = createPcmWav();
    const second = createPcmWav();
    const result = await concatenateWavBlobs([first, second], 0.5);

    const header = await result.mixedBlob.slice(0, 44).arrayBuffer();
    const view = new DataView(header);
    const expectedDataBytes = 16 + (24000 * 0.5 * 4) + 16;
    expect(view.getUint32(24, true)).toBe(24000);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(40, true)).toBe(expectedDataBytes);
    expect(result.mixedBlob.size).toBe(44 + expectedDataBytes);
    expect(result.durationSeconds).toBeCloseTo(expectedDataBytes / (24000 * 4), 1);
    URL.revokeObjectURL(result.mixedUrl);
  });

  it('rejects chapter masters that do not share the same PCM format', async () => {
    await expect(
      concatenateWavBlobs([createPcmWav(), createPcmWav({ sampleRate: 44100 })])
    ).rejects.toThrow(/formatos de áudio diferentes/i);
  });
});
