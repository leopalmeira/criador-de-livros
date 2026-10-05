// ================================================================
// AUDIOBOOK STUDIO — GERADOR DE EFEITOS SONOROS REAIS EMBUTIDOS
// Cria arquivos WAV reais em data/audio-effects/ para a biblioteca padrão
// Licença: Creative Commons 0 (Domínio Público)
// ================================================================

import fs from 'node:fs';
import path from 'node:path';

const SFX_CACHE_DIR = path.join(process.cwd(), 'data', 'audio-effects');

/**
 * Escreve um arquivo WAV PCM 16-bit estéreo a 44100Hz
 */
function createWavBuffer(samplesLeft, samplesRight, sampleRate = 44100) {
  const numChannels = 2;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = samplesLeft.length;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buf = Buffer.alloc(totalSize);

  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(totalSize - 8, 4);
  buf.write('WAVE', 8);

  // fmt chunk
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // subchunk 1 size (16 for PCM)
  buf.writeUInt16LE(1, 20); // audio format (1 = PCM)
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitDepth, 34);

  // data chunk
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Clamp sample between -1 and 1
    const sl = Math.max(-1, Math.min(1, samplesLeft[i]));
    const sr = Math.max(-1, Math.min(1, samplesRight[i]));

    const intL = sl < 0 ? sl * 0x8000 : sl * 0x7FFF;
    const intR = sr < 0 ? sr * 0x8000 : sr * 0x7FFF;

    buf.writeInt16LE(Math.floor(intL), offset);
    buf.writeInt16LE(Math.floor(intR), offset + 2);
    offset += 4;
  }

  return buf;
}

// Sintetizadores de ondas acústicas para cada efeito
const SOUND_GENERATORS = {
  sfx_weather_rain_soft: (duration = 10, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);
    let b0L = 0, b1L = 0, b2L = 0;
    let b0R = 0, b1R = 0, b2R = 0;

    for (let i = 0; i < numFrames; i++) {
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;
      // Filtro rosa suave
      b0L = 0.99886 * b0L + whiteL * 0.0555179;
      b1L = 0.99332 * b1L + whiteL * 0.0750759;
      b2L = 0.96900 * b2L + whiteL * 0.1538520;
      const pinkL = (b0L + b1L + b2L + whiteL * 0.5362) * 0.08;

      b0R = 0.99886 * b0R + whiteR * 0.0555179;
      b1R = 0.99332 * b1R + whiteR * 0.0750759;
      b2R = 0.96900 * b2R + whiteR * 0.1538520;
      const pinkR = (b0R + b1R + b2R + whiteR * 0.5362) * 0.08;

      // Gotas esparsas batendo no vidro
      let drip = 0;
      if (Math.random() < 0.0015) {
        drip = (Math.random() * 2 - 1) * 0.25;
      }
      left[i] = pinkL + drip;
      right[i] = pinkR + drip * 0.8;
    }
    return { left, right };
  },

  sfx_weather_thunder_distant: (duration = 4.5, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);
    let lastNoise = 0;

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 0.9) * (t < 0.08 ? t / 0.08 : 1);
      const sub = Math.sin(2 * Math.PI * (42 - t * 4) * t) * 0.6;
      const rumble = Math.sin(2 * Math.PI * (68 - t * 6) * t) * 0.35;
      const white = Math.random() * 2 - 1;
      lastNoise = (lastNoise + (0.04 * white)) / 1.04;
      const sample = (sub + rumble + lastNoise * 0.3) * env;
      left[i] = sample * 0.7;
      right[i] = sample * 0.68;
    }
    return { left, right };
  },

  sfx_weather_wind_howl: (duration = 10, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      const mod = Math.sin(2 * Math.PI * 0.15 * t);
      const centerFreq = 340 + mod * 120;
      const osc = Math.sin(2 * Math.PI * centerFreq * t) * 0.12;
      const breath = (Math.random() * 2 - 1) * 0.08 * (0.6 + 0.4 * mod);
      left[i] = (osc + breath) * 0.45;
      right[i] = (osc * 0.9 + breath * 1.1) * 0.45;
    }
    return { left, right };
  },

  sfx_doors_creak_open: (duration = 2.2, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      const env = Math.sin((t / duration) * Math.PI);
      const jitter = Math.sin(2 * Math.PI * 38 * t) * 15;
      const freq = 190 + (t * 80) + jitter;
      const squeak = Math.sin(2 * Math.PI * freq * t) * 0.28;
      const friction = (Math.random() * 2 - 1) * 0.07;
      const sample = (squeak + friction) * env;
      left[i] = sample * 0.7;
      right[i] = sample * 0.65;
    }
    return { left, right };
  },

  sfx_doors_slam_heavy: (duration = 1.8, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 7.5);
      const thud = Math.sin(2 * Math.PI * 55 * t) * 0.7;
      const latch = (Math.sin(2 * Math.PI * 800 * t) + Math.sin(2 * Math.PI * 1200 * t)) * 0.2 * Math.exp(-t * 28);
      const body = (Math.random() * 2 - 1) * 0.25 * env;
      const sample = (thud + latch + body) * env;
      left[i] = sample * 0.8;
      right[i] = sample * 0.78;
    }
    return { left, right };
  },

  sfx_footsteps_wood_slow: (duration = 3.5, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);
    const stepTimes = [0.2, 1.1, 2.0, 2.9];

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      let sample = 0;
      stepTimes.forEach(st => {
        if (t >= st && t < st + 0.35) {
          const stepT = t - st;
          const env = Math.sin((stepT / 0.35) * Math.PI);
          const thud = Math.sin(2 * Math.PI * 85 * stepT) * 0.45;
          const scuff = (Math.random() * 2 - 1) * 0.2;
          sample += (thud + scuff) * env;
        }
      });
      left[i] = sample * 0.65;
      right[i] = sample * 0.62;
    }
    return { left, right };
  },

  sfx_footsteps_gravel_run: (duration = 3.0, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);
    const stepTimes = [0.1, 0.5, 0.9, 1.3, 1.7, 2.1, 2.5];

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      let sample = 0;
      stepTimes.forEach(st => {
        if (t >= st && t < st + 0.25) {
          const stepT = t - st;
          const env = Math.sin((stepT / 0.25) * Math.PI);
          const crunch = (Math.random() * 2 - 1) * 0.45;
          const bass = Math.sin(2 * Math.PI * 110 * stepT) * 0.3;
          sample += (crunch + bass) * env;
        }
      });
      left[i] = sample * 0.6;
      right[i] = sample * 0.58;
    }
    return { left, right };
  },

  sfx_nature_birds_forest: (duration = 10, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      // Cantos de pássaro periódicos com modulação FM
      const chirpMod = Math.sin(2 * Math.PI * 4.5 * t);
      const chirpFreq = 2600 + chirpMod * 800;
      let chirp = 0;
      const cycle = t % 2.5;
      if (cycle < 0.6) {
        chirp = Math.sin(2 * Math.PI * chirpFreq * t) * 0.18 * Math.sin((cycle / 0.6) * Math.PI);
      }
      // Vento suave de folhas ao fundo
      const leaves = (Math.random() * 2 - 1) * 0.04;
      left[i] = chirp + leaves;
      right[i] = chirp * 0.85 + leaves;
    }
    return { left, right };
  },

  sfx_nature_river_stream: (duration = 10, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);
    let lowL = 0, lowR = 0;

    for (let i = 0; i < numFrames; i++) {
      const wL = Math.random() * 2 - 1;
      const wR = Math.random() * 2 - 1;
      lowL = (lowL + wL * 0.08) / 1.08;
      lowR = (lowR + wR * 0.08) / 1.08;
      // Borbulhas
      let bubble = 0;
      if (Math.random() < 0.002) {
        bubble = Math.sin(2 * Math.PI * 650 * (i / sr)) * 0.15;
      }
      left[i] = (lowL * 0.4 + bubble) * 0.6;
      right[i] = (lowR * 0.4 + bubble * 0.8) * 0.6;
    }
    return { left, right };
  },

  sfx_vehicles_car_pass: (duration = 4.2, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      const progress = t / duration;
      const env = Math.sin(progress * Math.PI);
      const freq = 140 - (progress * 60); // Efeito Doppler
      const motor = Math.sin(2 * Math.PI * freq * t) * 0.35;
      const whoosh = (Math.random() * 2 - 1) * 0.25 * env;
      const sample = (motor + whoosh) * env;
      left[i] = sample * (1 - progress * 0.4) * 0.7;
      right[i] = sample * (0.6 + progress * 0.4) * 0.7;
    }
    return { left, right };
  },

  sfx_vehicles_siren_distant: (duration = 5.0, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      const freq = 650 + Math.sin(2 * Math.PI * 0.5 * t) * 200;
      const osc = Math.sin(2 * Math.PI * freq * t) * 0.22;
      left[i] = osc * 0.6;
      right[i] = osc * 0.55;
    }
    return { left, right };
  },

  sfx_objects_glass_shatter: (duration = 2.0, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 8.5);
      const highChime = (Math.sin(2 * Math.PI * 2200 * t) + Math.sin(2 * Math.PI * 3400 * t)) * 0.28;
      const shatter = (Math.random() * 2 - 1) * 0.42 * env;
      const sample = (highChime + shatter) * env;
      left[i] = sample * 0.8;
      right[i] = sample * 0.76;
    }
    return { left, right };
  },

  sfx_objects_clock_tick: (duration = 8.0, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      const cycle = t % 1.0;
      let tick = 0;
      if (cycle < 0.04) {
        const tickT = cycle / 0.04;
        tick = Math.sin(2 * Math.PI * 1800 * cycle) * Math.exp(-tickT * 5) * 0.35;
      }
      left[i] = tick * 0.6;
      right[i] = tick * 0.6;
    }
    return { left, right };
  },

  sfx_tech_phone_ring: (duration = 3.8, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      const cycle = t % 1.8;
      let ring = 0;
      if (cycle < 0.4 || (cycle > 0.6 && cycle < 1.0)) {
        ring = (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t)) * 0.25;
      }
      left[i] = ring * 0.7;
      right[i] = ring * 0.7;
    }
    return { left, right };
  },

  sfx_cinematic_sub_tension: (duration = 10.0, sr = 44100) => {
    const numFrames = Math.floor(duration * sr);
    const left = new Float32Array(numFrames);
    const right = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const t = i / sr;
      const sub = Math.sin(2 * Math.PI * 55 * t) * 0.42;
      const fifth = Math.sin(2 * Math.PI * 82.5 * t) * 0.28;
      const pulse = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.4 * t);
      const sample = (sub + fifth) * pulse * 0.5;
      left[i] = sample * 0.75;
      right[i] = sample * 0.72;
    }
    return { left, right };
  }
};

const METADATA_MAP = {
  sfx_weather_rain_soft: { name: 'Chuva Suave na Janela', duration: 10, category: 'weather', isAmbient: true },
  sfx_weather_thunder_distant: { name: 'Trovão Distante', duration: 4.5, category: 'weather', isAmbient: false },
  sfx_weather_wind_howl: { name: 'Vento Noturno Sibilante', duration: 10, category: 'weather', isAmbient: true },
  sfx_doors_creak_open: { name: 'Porta de Madeira Abrindo', duration: 2.2, category: 'doors', isAmbient: false },
  sfx_doors_slam_heavy: { name: 'Porta Batendo com Força', duration: 1.8, category: 'doors', isAmbient: false },
  sfx_footsteps_wood_slow: { name: 'Passos Cautelosos no Assoalho', duration: 3.5, category: 'footsteps', isAmbient: false },
  sfx_footsteps_gravel_run: { name: 'Corrida Rápida no Cascalho', duration: 3.0, category: 'footsteps', isAmbient: false },
  sfx_nature_birds_forest: { name: 'Pássaros Matinais na Floresta', duration: 10, category: 'nature', isAmbient: true },
  sfx_nature_river_stream: { name: 'Correnteza de Rio Suave', duration: 10, category: 'nature', isAmbient: true },
  sfx_vehicles_car_pass: { name: 'Carro Passando na Rua', duration: 4.2, category: 'vehicles', isAmbient: false },
  sfx_vehicles_siren_distant: { name: 'Sirene de Polícia Distante', duration: 5.0, category: 'vehicles', isAmbient: false },
  sfx_objects_glass_shatter: { name: 'Copo / Vidro Quebrando', duration: 2.0, category: 'objects', isAmbient: false },
  sfx_objects_clock_tick: { name: 'Pêndulo de Relógio (Tic-Tac)', duration: 8.0, category: 'objects', isAmbient: true },
  sfx_tech_phone_ring: { name: 'Telefone Chamando', duration: 3.8, category: 'tech', isAmbient: false },
  sfx_cinematic_sub_tension: { name: 'Drone de Tensão Sub-grave', duration: 10.0, category: 'cinematic', isAmbient: true }
};

/**
 * Garante que os arquivos WAV e metadados existam no diretório de efeitos
 */
export function ensureBuiltinSFX() {
  try {
    fs.mkdirSync(SFX_CACHE_DIR, { recursive: true });
  } catch {}

  let createdCount = 0;

  for (const [id, generator] of Object.entries(SOUND_GENERATORS)) {
    const wavPath = path.join(SFX_CACHE_DIR, `${id}.wav`);
    const jsonPath = path.join(SFX_CACHE_DIR, `${id}.json`);

    if (!fs.existsSync(wavPath) || fs.statSync(wavPath).size < 1000) {
      try {
        const meta = METADATA_MAP[id] || { name: id, duration: 5, category: 'misc' };
        const { left, right } = generator(meta.duration);
        const wavBuffer = createWavBuffer(left, right, 44100);

        fs.writeFileSync(wavPath, wavBuffer);

        fs.writeFileSync(jsonPath, JSON.stringify({
          id,
          name: meta.name,
          category: meta.category,
          duration: meta.duration,
          isAmbient: meta.isAmbient,
          license: 'CC0 / Public Domain',
          source: 'builtin',
          createdAt: Date.now()
        }, null, 2));

        createdCount++;
      } catch (err) {
        console.warn(`[BuiltinSFX] Falha ao criar efeito ${id}:`, err.message);
      }
    }
  }

  if (createdCount > 0) {
    console.log(`[BuiltinSFX] ✅ ${createdCount} efeitos sonoros de estúdio inicializados em ${SFX_CACHE_DIR}`);
  }
}
