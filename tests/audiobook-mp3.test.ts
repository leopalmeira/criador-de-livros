import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  audioStartOffset,
  stripId3,
  mp3DurationSeconds,
  concatMp3Buffers,
  concatMp3Files,
  isMp3,
  createSilenceMp3,
  hasFfmpeg
} from '../server/audiobook/mp3.js';

// Cria frame MPEG-2 Layer III válido: 24kHz, 48kbps, mono -> 144 bytes por frame = 0.024s
function createValidMpeg2L3Frame(): Buffer {
  const frame = Buffer.alloc(144);
  frame[0] = 0xff;
  frame[1] = 0xf3; // MPEG-2, Layer III, no CRC
  frame[2] = 0x64; // 48kbps (index 6), 24kHz (index 1), no padding
  frame[3] = 0xc0; // mono
  return frame;
}

describe('AudiobookStudio — Processamento de Áudio MP3', () => {
  it('1. Detecta MP3 válido e ignora dados corrompidos', () => {
    const frame = createValidMpeg2L3Frame();
    expect(isMp3(frame)).toBe(true);

    const corrupt = Buffer.from('RIFF1234WAVEfmt ');
    expect(isMp3(corrupt)).toBe(false);
  });

  it('2. Calcula a duração exata a partir dos frames MPEG Layer III sem ffmpeg', () => {
    // 50 frames de 144 bytes = 50 * 0.024s = 1.2 segundos exatos
    const frames = Buffer.concat(Array.from({ length: 50 }, () => createValidMpeg2L3Frame()));
    const duration = mp3DurationSeconds(frames);
    expect(duration).toBeCloseTo(1.2, 2);
  });

  it('3. audioStartOffset e stripId3 removem metadados ID3v2 e ID3v1 sem corromper o áudio', () => {
    const frame = createValidMpeg2L3Frame();

    // Cria cabeçalho ID3v2 sintético de 10 bytes + 20 bytes de tag = 30 bytes
    const id3v2Header = Buffer.alloc(30);
    id3v2Header.write('ID3', 0);
    id3v2Header[3] = 4; // v2.4
    id3v2Header[4] = 0;
    id3v2Header[5] = 0;
    // size (syncsafe): 20
    id3v2Header[6] = 0;
    id3v2Header[7] = 0;
    id3v2Header[8] = 0;
    id3v2Header[9] = 20;

    // Tag ID3v1 ao final (128 bytes)
    const id3v1Footer = Buffer.alloc(128);
    id3v1Footer.write('TAG', 0);

    const fullBuffer = Buffer.concat([id3v2Header, frame, id3v1Footer]);

    expect(audioStartOffset(fullBuffer)).toBe(30);
    const cleaned = stripId3(fullBuffer);
    expect(cleaned.length).toBe(frame.length);
    expect(cleaned[0]).toBe(0xff);
    expect(cleaned[1]).toBe(0xf3);
  });

  it('4. concatMp3Buffers e concatMp3Files unem múltiplos arquivos em um audiobook contínuo', async () => {
    const frame1 = Buffer.concat(Array.from({ length: 25 }, () => createValidMpeg2L3Frame())); // 0.6s
    const frame2 = Buffer.concat(Array.from({ length: 25 }, () => createValidMpeg2L3Frame())); // 0.6s

    const mergedBuf = concatMp3Buffers([frame1, frame2]);
    expect(mp3DurationSeconds(mergedBuf)).toBeCloseTo(1.2, 2);

    // Concatenação em disco (streaming)
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kdp-mp3-test-'));
    const file1 = path.join(tmpDir, 'ch1.mp3');
    const file2 = path.join(tmpDir, 'ch2.mp3');
    const outFinal = path.join(tmpDir, 'audiobook_final.mp3');

    await fs.promises.writeFile(file1, frame1);
    await fs.promises.writeFile(file2, frame2);

    await concatMp3Files([file1, file2], outFinal);

    const finalBuf = await fs.promises.readFile(outFinal);
    expect(mp3DurationSeconds(finalBuf)).toBeCloseTo(1.2, 2);

    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('gera pausas MP3 com duração real usando o binário empacotado', async () => {
    expect(await hasFfmpeg()).toBe(true);
    const silence = await createSilenceMp3(500);
    expect(isMp3(silence)).toBe(true);
    expect(mp3DurationSeconds(silence)).toBeGreaterThanOrEqual(0.45);
    expect(mp3DurationSeconds(silence)).toBeLessThanOrEqual(0.6);
  });
});
