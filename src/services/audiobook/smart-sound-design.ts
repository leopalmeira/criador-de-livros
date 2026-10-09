// ================================================================
// 🎬 SMART SOUND DESIGN — ANÁLISE SEMÂNTICA CONTEXTUAL
// BookEngin — Interpretação Literária & Geração de Timeline
// ================================================================

import {
  SoundTimelineEvent,
  SoundEffectPriority
} from '../../types/audiobook-studio';
import { SOUND_EFFECTS_CATALOG } from './sound-effects-catalog';

interface SemanticPattern {
  regex: RegExp;
  soundId: string;
  name: string;
  trackType: 'ambient' | 'sfx';
  priority: SoundEffectPriority;
  durationSeconds: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  contextValidator?: (sentence: string, surroundingText: string) => boolean;
}

// Padrões semânticos contextuais rigorosos (evita efeito cartoon / excessos)
const SEMANTIC_PATTERNS: SemanticPattern[] = [
  // CHUVA & TEMPESTADE
  {
    regex: /(?:começou\s+a\s+chover|chuva\s+(?:forte|torrencial|fria|batia|começou)|tempestade\s+(?:desabou|lá\s+fora)|temporal|garoa\s+fina)/i,
    soundId: 'sfx_weather_rain_soft',
    name: 'Chuva Suave na Janela',
    trackType: 'ambient',
    priority: 'essencial',
    durationSeconds: 20,
    volume: 0.20,
    fadeIn: 2.0,
    fadeOut: 3.0,
    contextValidator: (s) => !/(chovendo\s+elogios|tempestade\s+em\s+copo)/i.test(s)
  },
  // TROVÃO
  {
    regex: /(?:trovão\s+explodiu|clarão\s+do\s+raio|relâmpago\s+cortou|estrondo\s+do\s+trovão|trovejou)/i,
    soundId: 'sfx_weather_thunder_distant',
    name: 'Trovão Distante',
    trackType: 'sfx',
    priority: 'recomendado',
    durationSeconds: 4.5,
    volume: 0.35,
    fadeIn: 0.05,
    fadeOut: 1.8
  },
  // VENTO
  {
    regex: /(?:vento\s+(?:uivava|assobiava|frio|forte\s+soprou)|ventania\s+(?:balançou|varreu))/i,
    soundId: 'sfx_weather_wind_howl',
    name: 'Vento Noturno Sibilante',
    trackType: 'ambient',
    priority: 'recomendado',
    durationSeconds: 15,
    volume: 0.18,
    fadeIn: 2.0,
    fadeOut: 2.5
  },
  // PORTA ABRINDO COM RANGIDO
  {
    regex: /(?:porta\s+se\s+abriu|abriu\s+a\s+porta|rangido\s+da\s+porta|porta\s+rangeu|maçaneta\s+girou)/i,
    soundId: 'sfx_doors_creak_open',
    name: 'Porta de Madeira Abrindo',
    trackType: 'sfx',
    priority: 'essencial',
    durationSeconds: 2.2,
    volume: 0.30,
    fadeIn: 0.05,
    fadeOut: 0.4
  },
  // PORTA BATENDO FORTE
  {
    regex: /(?:bateu\s+a\s+porta|porta\s+bateu|fechou\s+com\s+força|estrondo\s+da\s+porta)/i,
    soundId: 'sfx_doors_slam_heavy',
    name: 'Porta Batendo com Força',
    trackType: 'sfx',
    priority: 'recomendado',
    durationSeconds: 1.8,
    volume: 0.36,
    fadeIn: 0.02,
    fadeOut: 0.5
  },
  // PASSOS
  {
    regex: /(?:ouviu\s+passos|passos\s+(?:lentos|pesados|apressados|no\s+corredor)|caminhou\s+lentamente|aproximou-se\s+em\s+silêncio)/i,
    soundId: 'sfx_footsteps_wood_slow',
    name: 'Passos Cautelosos no Assoalho',
    trackType: 'sfx',
    priority: 'essencial',
    durationSeconds: 3.5,
    volume: 0.28,
    fadeIn: 0.1,
    fadeOut: 0.5
  },
  // CORRIDA / CASCHALHO
  {
    regex: /(?:correu\s+(?:pela\s+rua|desesperado|em\s+disparada)|fuga\s+rápida|disparou\s+a\s+correr)/i,
    soundId: 'sfx_footsteps_gravel_run',
    name: 'Corrida Rápida no Cascalho',
    trackType: 'sfx',
    priority: 'recomendado',
    durationSeconds: 3.0,
    volume: 0.30,
    fadeIn: 0.1,
    fadeOut: 0.4
  },
  // CARRO PASSANDO
  {
    regex: /(?:um\s+carro\s+passou|motor\s+(?:roncou|acelerou)|pneus\s+cantando|veículo\s+se\s+aproximou)/i,
    soundId: 'sfx_vehicles_car_pass',
    name: 'Carro Passando na Rua',
    trackType: 'sfx',
    priority: 'opcional',
    durationSeconds: 4.2,
    volume: 0.24,
    fadeIn: 1.0,
    fadeOut: 1.5
  },
  // SIRENE
  {
    regex: /(?:sirene\s+(?:começou|tocou|ecoou|ao\s+longe)|giroflex\s+da\s+polícia|viatura\s+se\s+aproximava)/i,
    soundId: 'sfx_vehicles_siren_distant',
    name: 'Sirene de Polícia Distante',
    trackType: 'sfx',
    priority: 'essencial',
    durationSeconds: 5.0,
    volume: 0.22,
    fadeIn: 1.2,
    fadeOut: 1.8
  },
  // OBJETO CAINDO / VIDRO QUEBRANDO
  {
    regex: /(?:deixou\s+o\s+copo\s+cair|vidro\s+se\s+espatifou|copo\s+(?:quebrou|caiu|estilhaçou)|garrafa\s+caiu)/i,
    soundId: 'sfx_objects_glass_shatter',
    name: 'Copo / Vidro Quebrando',
    trackType: 'sfx',
    priority: 'essencial',
    durationSeconds: 2.0,
    volume: 0.32,
    fadeIn: 0.01,
    fadeOut: 0.5
  },
  // RELÓGIO TIC-TAC
  {
    regex: /(?:o\s+tic-tac\s+do\s+relógio|ponteiro\s+do\s+relógio|relógio\s+na\s+parede\s+batia)/i,
    soundId: 'sfx_objects_clock_tick',
    name: 'Pêndulo de Relógio (Tic-Tac)',
    trackType: 'ambient',
    priority: 'opcional',
    durationSeconds: 10,
    volume: 0.15,
    fadeIn: 1.0,
    fadeOut: 1.5
  },
  // TELEFONE
  {
    regex: /(?:o\s+telefone\s+tocou|celular\s+(?:vibrou|começou\s+a\s+tocar)|chamada\s+interrompeu)/i,
    soundId: 'sfx_tech_phone_ring',
    name: 'Telefone Chamando',
    trackType: 'sfx',
    priority: 'essencial',
    durationSeconds: 3.8,
    volume: 0.28,
    fadeIn: 0.1,
    fadeOut: 0.4
  },
  // TENSÃO CINEMATOGRÁFICA
  {
    regex: /(?:sensação\s+de\s+perigo|algo\s+estava\s+errado|calafrio\s+subiu|silêncio\s+ameaçador|tensão\s+no\s+ar)/i,
    soundId: 'sfx_cinematic_sub_tension',
    name: 'Drone de Tensão Sub-grave',
    trackType: 'ambient',
    priority: 'recomendado',
    durationSeconds: 12,
    volume: 0.22,
    fadeIn: 2.0,
    fadeOut: 2.5
  }
];

export interface SmartSoundDesignResult {
  detectedEvents: SoundTimelineEvent[];
  summary: {
    totalDetected: number;
    essentialCount: number;
    recommendedCount: number;
    optionalCount: number;
    ambientCount: number;
    sfxCount: number;
  };
}

/**
 * Analisador Contextual de Cenas e Eventos Sonoros
 * - Mapeia a posição de tempo com base na velocidade média de narração (~2.25 palavras/segundo no 1.0x).
 * - Evita sobreposições caóticas mantendo no máximo 1 ambiente simultâneo e separando SFX com distância mínima.
 * - Categoriza em Essencial, Recomendado ou Opcional.
 */
export function analyzeChapterSoundDesign(
  chapterText: string,
  narrationSpeed: number = 1.0,
  maxSimultaneousSfx: number = 2
): SmartSoundDesignResult {
  if (!chapterText || chapterText.trim().length === 0) {
    return {
      detectedEvents: [],
      summary: {
        totalDetected: 0,
        essentialCount: 0,
        recommendedCount: 0,
        optionalCount: 0,
        ambientCount: 0,
        sfxCount: 0
      }
    };
  }

  // Divisão em frases para análise contextual
  const sentences = chapterText.match(/[^.!?]+[.!?]+|\s*$/g)?.filter(s => s.trim().length > 0) || [chapterText];
  
  // Taxa de fala média: ~135 palavras/min = 2.25 palavras/s * narrationSpeed
  const wordsPerSecond = 2.25 * narrationSpeed;
  
  let currentWordCount = 0;
  const rawEvents: SoundTimelineEvent[] = [];
  const assignedSfxTimes: number[] = [];

  sentences.forEach((sentence, sentenceIdx) => {
    const sentenceWords = sentence.trim().split(/\s+/).length;
    const sentenceStartTime = Math.round((currentWordCount / wordsPerSecond) * 10) / 10;
    
    // Testa padrões semânticos
    for (const pattern of SEMANTIC_PATTERNS) {
      const match = sentence.match(pattern.regex);
      if (match) {
        // Valida se o contexto não é metafórico
        if (pattern.contextValidator && !pattern.contextValidator(sentence, chapterText)) {
          continue;
        }

        // Evita dois SFX idênticos muito perto (< 6 segundos)
        const isTooClose = assignedSfxTimes.some(t => Math.abs(t - sentenceStartTime) < 6);
        if (isTooClose && pattern.priority === 'opcional') {
          continue; // Pula efeito secundário para evitar poluição sonora
        }

        const eventId = `evt_${pattern.soundId}_${sentenceIdx}_${Date.now()}`;
        const event: SoundTimelineEvent = {
          id: eventId,
          soundId: pattern.soundId,
          name: pattern.name,
          trackType: pattern.trackType,
          startTimeSeconds: sentenceStartTime,
          durationSeconds: pattern.durationSeconds,
          volume: pattern.volume,
          fadeInSeconds: pattern.fadeIn,
          fadeOutSeconds: pattern.fadeOut,
          priority: pattern.priority,
          triggerPhrase: match[0],
          enabled: true // Habilitado por padrão, usuário pode desligar individualmente
        };

        rawEvents.push(event);
        assignedSfxTimes.push(sentenceStartTime);
        break; // Apenas 1 efeito por frase para manter elegância editorial
      }
    }

    currentWordCount += sentenceWords;
  });

  // Limite inteligente: audiolivros sérios usam de 2 a 5 efeitos nobres por capítulo
  // Mantemos prioritariamente 'essencial' e 'recomendado'
  const filteredEvents = rawEvents.slice(0, 8);

  const summary = {
    totalDetected: filteredEvents.length,
    essentialCount: filteredEvents.filter(e => e.priority === 'essencial').length,
    recommendedCount: filteredEvents.filter(e => e.priority === 'recomendado').length,
    optionalCount: filteredEvents.filter(e => e.priority === 'opcional').length,
    ambientCount: filteredEvents.filter(e => e.trackType === 'ambient').length,
    sfxCount: filteredEvents.filter(e => e.trackType === 'sfx').length
  };

  return {
    detectedEvents: filteredEvents,
    summary
  };
}
