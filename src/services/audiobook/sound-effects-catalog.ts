// ================================================================
// BANCO DE EFEITOS SONOROS (/audio-effects) & SÍNTESE PROCEDURAL
// Book Intel KDP — Smart Sound Design (100% Livre de Copyright / CC0)
// ================================================================

import { SoundEffectCategory, SoundEffectMetadata } from '../../types/audiobook-studio';

export interface SoundEffectItem extends SoundEffectMetadata {
  description: string;
  icon: string;
  tags: string[];
}

// Catálogo com todas as categorias especificadas
export const SOUND_EFFECTS_CATALOG: SoundEffectItem[] = [
  // /weather
  {
    id: 'sfx_weather_rain_soft',
    name: 'Chuva Suave na Janela',
    category: 'weather',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 15,
    defaultVolume: 0.20,
    defaultFadeIn: 2.0,
    defaultFadeOut: 3.0,
    isAmbientLoop: true,
    description: 'Chuva constante e aconchegante com gotas batendo em vidro.',
    icon: '🌧️',
    tags: ['chuva', 'chover', 'temporal', 'gotas', 'janela', 'garoa']
  },
  {
    id: 'sfx_weather_thunder_distant',
    name: 'Trovão Distante com Relâmpago',
    category: 'weather',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 4.5,
    defaultVolume: 0.35,
    defaultFadeIn: 0.1,
    defaultFadeOut: 1.8,
    isAmbientLoop: false,
    description: 'Ressonância grave de trovão ecoando no horizonte.',
    icon: '⛈️',
    tags: ['trovão', 'relâmpago', 'raio', 'tempestade', 'estondo']
  },
  {
    id: 'sfx_weather_wind_howl',
    name: 'Vento Noturno Sibilante',
    category: 'weather',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 12,
    defaultVolume: 0.18,
    defaultFadeIn: 2.5,
    defaultFadeOut: 3.0,
    isAmbientLoop: true,
    description: 'Brisa fria e misteriosa passando por frestas e galhos.',
    icon: '💨',
    tags: ['vento', 'brisa', 'ventania', 'frio', 'assovio']
  },

  // /nature
  {
    id: 'sfx_nature_birds_forest',
    name: 'Pássaros Matinais na Floresta',
    category: 'nature',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 12,
    defaultVolume: 0.15,
    defaultFadeIn: 1.5,
    defaultFadeOut: 2.0,
    isAmbientLoop: true,
    description: 'Trinados suaves da natureza em bosque ensolarado.',
    icon: '🐦',
    tags: ['pássaros', 'floresta', 'bosque', 'manhã', 'árvores', 'natureza']
  },
  {
    id: 'sfx_nature_river_stream',
    name: 'Correnteza de Rio Suave',
    category: 'nature',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 12,
    defaultVolume: 0.16,
    defaultFadeIn: 2.0,
    defaultFadeOut: 2.5,
    isAmbientLoop: true,
    description: 'Água corrente e límpida fluindo entre pedras.',
    icon: '🌊',
    tags: ['rio', 'água', 'riacho', 'correnteza', 'fonte']
  },

  // /doors
  {
    id: 'sfx_doors_creak_open',
    name: 'Porta de Madeira Abrindo com Rangido',
    category: 'doors',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 2.2,
    defaultVolume: 0.32,
    defaultFadeIn: 0.05,
    defaultFadeOut: 0.4,
    isAmbientLoop: false,
    description: 'Rangido de dobradiça antiga abrindo lentamente.',
    icon: '🚪',
    tags: ['porta', 'abriu', 'abrir', 'rangido', 'dobradiça', 'madeira']
  },
  {
    id: 'sfx_doors_slam_heavy',
    name: 'Porta Batendo com Força',
    category: 'doors',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 1.8,
    defaultVolume: 0.38,
    defaultFadeIn: 0.02,
    defaultFadeOut: 0.6,
    isAmbientLoop: false,
    description: 'Batida seca e definitiva de porta pesada se fechando.',
    icon: '🚪💥',
    tags: ['bateu a porta', 'porta bateu', 'fechou com força', 'estrondo']
  },

  // /footsteps
  {
    id: 'sfx_footsteps_wood_slow',
    name: 'Passos Cautelosos em Assoalho',
    category: 'footsteps',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 3.5,
    defaultVolume: 0.28,
    defaultFadeIn: 0.1,
    defaultFadeOut: 0.5,
    isAmbientLoop: false,
    description: 'Passos compassados e discretos sobre assoalho de madeira.',
    icon: '👣',
    tags: ['passos', 'caminhou', 'andou', 'corredor', 'pegadas', 'aproximou-se']
  },
  {
    id: 'sfx_footsteps_gravel_run',
    name: 'Corrida Rápida no Cascalho',
    category: 'footsteps',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 3.0,
    defaultVolume: 0.30,
    defaultFadeIn: 0.1,
    defaultFadeOut: 0.4,
    isAmbientLoop: false,
    description: 'Passos apressados triturando pedrinhas sob pressão.',
    icon: '🏃',
    tags: ['correu', 'correndo', 'fuga', 'cascalho', 'terra', 'pressa']
  },

  // /vehicles
  {
    id: 'sfx_vehicles_car_pass',
    name: 'Carro Passando na Rua Úmida',
    category: 'vehicles',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 4.2,
    defaultVolume: 0.25,
    defaultFadeIn: 1.0,
    defaultFadeOut: 1.5,
    isAmbientLoop: false,
    description: 'Motor acelerando suavemente e som de pneus no asfalto.',
    icon: '🚗',
    tags: ['carro', 'veículo', 'rua', 'estrada', 'motor', 'pneus', 'automóvel']
  },
  {
    id: 'sfx_vehicles_siren_distant',
    name: 'Sirene de Polícia / Emergência Distante',
    category: 'vehicles',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 5.0,
    defaultVolume: 0.22,
    defaultFadeIn: 1.2,
    defaultFadeOut: 1.8,
    isAmbientLoop: false,
    description: 'Giroflex e sirene ao longe cortando a madrugada.',
    icon: '🚨',
    tags: ['sirene', 'polícia', 'ambulância', 'viatura', 'alarme']
  },

  // /objects
  {
    id: 'sfx_objects_glass_shatter',
    name: 'Copo / Vidro Caindo e Quebrando',
    category: 'objects',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 2.0,
    defaultVolume: 0.34,
    defaultFadeIn: 0.01,
    defaultFadeOut: 0.5,
    isAmbientLoop: false,
    description: 'Estilhaços agudos e impacto de vidro partindo no chão.',
    icon: '🥛💥',
    tags: ['copo', 'vidro', 'caiu', 'quebrou', 'estilhaços', 'louça']
  },
  {
    id: 'sfx_objects_clock_tick',
    name: 'Pêndulo de Relógio Antigo (Tic-Tac)',
    category: 'objects',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 10,
    defaultVolume: 0.16,
    defaultFadeIn: 1.0,
    defaultFadeOut: 1.5,
    isAmbientLoop: true,
    description: 'Cadência hipnótica de ponteiro mecânico de parede.',
    icon: '⏱️',
    tags: ['relógio', 'tic-tac', 'tempo', 'segundos', 'pêndulo', 'silêncio']
  },

  // /technology
  {
    id: 'sfx_tech_phone_ring',
    name: 'Telefone Chamando / Vibração',
    category: 'technology',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 3.8,
    defaultVolume: 0.28,
    defaultFadeIn: 0.1,
    defaultFadeOut: 0.4,
    isAmbientLoop: false,
    description: 'Toque eletrônico discreto de chamada ou aparelho fixo.',
    icon: '📞',
    tags: ['telefone', 'celular', 'tocou', 'chamada', 'mensagem', 'notificação']
  },

  // /environment & /cinematic
  {
    id: 'sfx_env_room_ambience',
    name: 'Silêncio Noturno de Quarto Fechado',
    category: 'environment',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 15,
    defaultVolume: 0.12,
    defaultFadeIn: 2.0,
    defaultFadeOut: 2.5,
    isAmbientLoop: true,
    description: 'Presença e acústica sutil de sala silenciosa.',
    icon: '🛋️',
    tags: ['quarto', 'sala', 'silêncio', 'interior', 'noite', 'casa']
  },
  {
    id: 'sfx_cinematic_sub_tension',
    name: 'Drone de Tensão Cinematográfica',
    category: 'cinematic',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 8.0,
    defaultVolume: 0.24,
    defaultFadeIn: 2.0,
    defaultFadeOut: 2.0,
    isAmbientLoop: true,
    description: 'Frequência sub-grave cinematográfica que acentua mistério e perigo.',
    icon: '🎬',
    tags: ['tensão', 'mistério', 'medo', 'perigo', 'clímax', 'suspense', 'segredo']
  },
  {
    id: 'sfx_impacts_heavy_drop',
    name: 'Impacto Seco e Pesado',
    category: 'impacts',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 1.5,
    defaultVolume: 0.35,
    defaultFadeIn: 0.01,
    defaultFadeOut: 0.4,
    isAmbientLoop: false,
    description: 'Baque grave no chão com ressonância curta.',
    icon: '🔨',
    tags: ['baque', 'impacto', 'queda', 'caiu com peso', 'golpe']
  },
  {
    id: 'sfx_people_whisper_gasp',
    name: 'Respiração Suspensa / Sobressalto',
    category: 'people',
    origin: 'Book Intel Audio Lab',
    license: 'Procedural Synthesis (CC0)',
    author: 'Audiobook Sound Engine',
    durationSeconds: 1.6,
    defaultVolume: 0.22,
    defaultFadeIn: 0.1,
    defaultFadeOut: 0.3,
    isAmbientLoop: false,
    description: 'Inalação súbita de ar diante de uma surpresa.',
    icon: '😮',
    tags: ['respiração', 'ofegante', 'suspiro', 'sobressalto', 'choque']
  }
];

// Gerador de Áudio Procedural em WebAudio (Zero Copyright / 100% Comercial)
// Garante reprodução instantânea sem precisar baixar arquivos externos pesados
export function generateProceduralSoundBuffer(
  audioCtx: AudioContext | OfflineAudioContext,
  effectId: string,
  targetDurationSeconds?: number
): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  const item = SOUND_EFFECTS_CATALOG.find(e => e.id === effectId) || SOUND_EFFECTS_CATALOG[0];
  const duration = targetDurationSeconds || item.durationSeconds;
  const numFrames = Math.floor(sampleRate * duration);
  const buffer = audioCtx.createBuffer(2, numFrames, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Síntese específica pelo tipo de efeito
  if (effectId.includes('rain')) {
    // Ruído rosa filtrado com microestalos de gotas
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < numFrames; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      const pink = (b0 + b1 + b2 + white * 0.5362) * 0.15;
      const drop = Math.random() > 0.9985 ? (Math.random() * 0.4) : 0;
      const sample = (pink + drop) * 0.4;
      left[i] = sample;
      right[i] = sample * (0.9 + Math.random() * 0.2);
    }
  } else if (effectId.includes('thunder')) {
    // Ruído grave com envelope de decaimento lento e ressonância sub
    for (let i = 0; i < numFrames; i++) {
      const t = i / sampleRate;
      const envelope = Math.max(0, Math.min(1, t / 0.15)) * Math.exp(-t / 1.6);
      const lowOsc = Math.sin(2 * Math.PI * 45 * t) * 0.4;
      const rumble = (Math.random() * 2 - 1) * 0.3 * Math.exp(-t / 1.2);
      const sample = (lowOsc + rumble) * envelope * 0.7;
      left[i] = sample;
      right[i] = sample * 0.95;
    }
  } else if (effectId.includes('creak')) {
    // Frequência modulada imitando rangido de madeira
    for (let i = 0; i < numFrames; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin((t / duration) * Math.PI);
      const freq = 380 + Math.sin(t * 35) * 180 + Math.sin(t * 9) * 80;
      const creakSample = Math.sin(2 * Math.PI * freq * t) * 0.3;
      const frictionNoise = (Math.random() * 2 - 1) * 0.15;
      const sample = (creakSample + frictionNoise) * envelope;
      left[i] = sample;
      right[i] = sample * 0.9;
    }
  } else if (effectId.includes('footsteps')) {
    // Passos discretos com atrito
    for (let i = 0; i < numFrames; i++) {
      const t = i / sampleRate;
      let sample = 0;
      const stepTimes = [0.4, 1.3, 2.2];
      stepTimes.forEach(st => {
        if (t >= st && t < st + 0.35) {
          const stepT = t - st;
          const env = Math.sin((stepT / 0.35) * Math.PI);
          const thud = Math.sin(2 * Math.PI * 85 * stepT) * 0.4;
          const scuff = (Math.random() * 2 - 1) * 0.2;
          sample += (thud + scuff) * env;
        }
      });
      left[i] = sample * 0.6;
      right[i] = sample * 0.58;
    }
  } else if (effectId.includes('car_pass')) {
    // Efeito Doppler e motor passando
    for (let i = 0; i < numFrames; i++) {
      const t = i / sampleRate;
      const progress = t / duration; // 0 a 1
      const env = Math.sin(progress * Math.PI);
      const freq = 140 - (progress * 60); // Doppler shift
      const motor = Math.sin(2 * Math.PI * freq * t) * 0.3;
      const whoosh = (Math.random() * 2 - 1) * 0.2 * env;
      const sample = (motor + whoosh) * env;
      left[i] = sample * (1 - progress * 0.4);
      right[i] = sample * (0.6 + progress * 0.4);
    }
  } else if (effectId.includes('glass')) {
    // Impacto e estilhaços agudos
    for (let i = 0; i < numFrames; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 8);
      const highChime = (Math.sin(2 * Math.PI * 2200 * t) + Math.sin(2 * Math.PI * 3400 * t)) * 0.25;
      const shatter = (Math.random() * 2 - 1) * 0.4 * env;
      const sample = (highChime + shatter) * env;
      left[i] = sample;
      right[i] = sample * 0.95;
    }
  } else if (effectId.includes('phone')) {
    // Beep de chamada telefônica
    for (let i = 0; i < numFrames; i++) {
      const t = i / sampleRate;
      const cycle = t % 1.8;
      let sample = 0;
      if (cycle < 0.4 || (cycle > 0.6 && cycle < 1.0)) {
        sample = (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t)) * 0.2;
      }
      left[i] = sample;
      right[i] = sample;
    }
  } else if (effectId.includes('tension') || effectId.includes('cinematic')) {
    // Drone cinematográfico grave
    for (let i = 0; i < numFrames; i++) {
      const t = i / sampleRate;
      const sub = Math.sin(2 * Math.PI * 55 * t) * 0.4;
      const fifth = Math.sin(2 * Math.PI * 82.5 * t + Math.sin(t * 0.5)) * 0.25;
      const pulse = 0.8 + 0.2 * Math.sin(t * 1.5);
      const sample = (sub + fifth) * pulse * 0.5;
      left[i] = sample;
      right[i] = sample * 0.95;
    }
  } else {
    // Silêncio / sala aconchegante
    let last = 0;
    for (let i = 0; i < numFrames; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + (0.02 * white)) / 1.02;
      left[i] = last * 0.15;
      right[i] = last * 0.15;
    }
  }

  return buffer;
}
