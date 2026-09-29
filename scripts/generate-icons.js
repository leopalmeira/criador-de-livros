import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, r, g, b) {
  // Cria PNG mínimo válido com cor sólida/gradiente
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: 2 (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data: filter byte (0) + width * 3 bytes per scanline
  const scanlineLength = 1 + width * 3;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const offset = y * scanlineLength;
    rawData[offset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pixelOffset = offset + 1 + x * 3;
      // Gradiente azul para roxo com relâmpago no centro
      const isCenter = Math.abs(x - width / 2) < width * 0.25 && Math.abs(y - height / 2) < height * 0.35;
      if (isCenter) {
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
      } else {
        rawData[pixelOffset] = Math.min(255, Math.floor(r + (x / width) * 40));
        rawData[pixelOffset + 1] = Math.min(255, Math.floor(g + (y / height) * 30));
        rawData[pixelOffset + 2] = Math.min(255, Math.floor(b + (x / width) * 20));
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Tabela CRC32 padrão
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const iconsDir = path.join(process.cwd(), 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon16.png'), createPng(16, 16, 59, 130, 246));
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), createPng(48, 48, 59, 130, 246));
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), createPng(128, 128, 59, 130, 246));

console.log('Ícones 16, 48 e 128 criados com sucesso em public/icons/');
