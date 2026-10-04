// ================================================================
// AUDIOBOOK STUDIO — UTILITÁRIOS DE ÁUDIO MP3
// - duração exata por varredura de frames (sem depender de ffmpeg)
// - limpeza de ID3 e concatenação em streaming (livros longos)
// - conversão opcional WAV → MP3 via ffmpeg (quando disponível)
// ================================================================

import fs from 'node:fs';
import { spawn } from 'node:child_process';

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

/** Retorna o offset do primeiro byte de áudio (pula tag ID3v2, se houver). */
export function audioStartOffset(buf) {
  if (buf.length > 10 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    return 10 + size;
  }
  return 0;
}

/** Remove ID3v2 do início e ID3v1 do final. */
export function stripId3(buf) {
  let start = audioStartOffset(buf);
  let end = buf.length;
  if (end - start > 128 && buf[end - 128] === 0x54 && buf[end - 127] === 0x41 && buf[end - 126] === 0x47) end -= 128;
  return start === 0 && end === buf.length ? buf : buf.subarray(start, end);
}

/** Calcula a duração (segundos) percorrendo os frames MPEG Layer III. */
export function mp3DurationSeconds(buf) {
  let pos = audioStartOffset(buf);
  let seconds = 0;
  let frames = 0;
  while (pos + 4 <= buf.length) {
    if (buf[pos] !== 0xff || (buf[pos + 1] & 0xe0) !== 0xe0) {
      pos += 1;
      continue;
    }
    const versionBits = (buf[pos + 1] >> 3) & 0x3;
    const layerBits = (buf[pos + 1] >> 1) & 0x3;
    const bitrateIndex = (buf[pos + 2] >> 4) & 0xf;
    const sampleIndex = (buf[pos + 2] >> 2) & 0x3;
    const padding = (buf[pos + 2] >> 1) & 0x1;
    if (versionBits === 1 || layerBits !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) {
      pos += 1;
      continue;
    }
    const isV1 = versionBits === 3;
    const bitrate = (isV1 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex] * 1000;
    const sampleRate = SAMPLE_RATES[versionBits][sampleIndex];
    const frameLength = Math.floor(((isV1 ? 144 : 72) * bitrate) / sampleRate) + padding;
    if (frameLength < 8) {
      pos += 1;
      continue;
    }
    seconds += (isV1 ? 1152 : 576) / sampleRate;
    frames += 1;
    pos += frameLength;
  }
  if (frames === 0) return 0;
  return Math.round(seconds * 1000) / 1000;
}

/** Une vários buffers MP3 (já com ID3 removido) em um único buffer contínuo. */
export function concatMp3Buffers(buffers) {
  return Buffer.concat(buffers.map((b) => stripId3(b)));
}

/** Concatena arquivos MP3 em streaming (não carrega o livro inteiro na memória). */
export async function concatMp3Files(files, outputPath) {
  const tmp = `${outputPath}.tmp`;
  const out = fs.createWriteStream(tmp);
  try {
    for (const file of files) {
      const raw = await fs.promises.readFile(file); // um capítulo por vez
      const clean = stripId3(raw);
      if (!out.write(clean)) await new Promise((r) => out.once('drain', r));
    }
    await new Promise((resolve, reject) => {
      out.end((err) => (err ? reject(err) : resolve()));
    });
    await fs.promises.rename(tmp, outputPath);
  } catch (err) {
    out.destroy();
    await fs.promises.rm(tmp, { force: true });
    throw err;
  }
}

let ffmpegChecked = null;
/** Verifica (uma única vez) se o ffmpeg está disponível no servidor. */
export function hasFfmpeg() {
  if (ffmpegChecked) return ffmpegChecked;
  ffmpegChecked = new Promise((resolve) => {
    try {
      const p = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
      p.on('error', () => resolve(false));
      p.on('exit', (code) => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
  return ffmpegChecked;
}

/** Converte qualquer áudio (ex.: WAV) em MP3 mono 24 kHz via ffmpeg. */
export async function convertToMp3(input) {
  if (!(await hasFfmpeg())) {
    const err = new Error('Conversor de áudio indisponível');
    err.code = 'FFMPEG_MISSING';
    throw err;
  }
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '24000', '-b:a', '64k', '-f', 'mp3', 'pipe:1']);
    const chunks = [];
    const errors = [];
    p.stdout.on('data', (c) => chunks.push(c));
    p.stderr.on('data', (c) => errors.push(c));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0 && chunks.length) resolve(Buffer.concat(chunks));
      else reject(new Error(`Falha na conversão de áudio: ${Buffer.concat(errors).toString().slice(0, 200)}`));
    });
    p.stdin.on('error', () => {});
    p.stdin.end(input);
  });
}

export const isMp3 = (buf) => {
  const s = audioStartOffset(buf);
  return buf.length > s + 2 && buf[s] === 0xff && (buf[s + 1] & 0xe0) === 0xe0;
};
