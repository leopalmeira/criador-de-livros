// ================================================================
// 🎬 CINEMATIC SCENE AUDIO DIRECTOR — DIRETOR DE ÁUDIO AUTOMÁTICO
// Analisador Contextual Semântico & Motor Web Audio Procedural
// Gera som de fundo e trilha sonora automática de acordo com a cena
// ================================================================

import { CinematicPagePlan } from '../types/cinematic-novel';

export type SceneMoodType =
  | 'suspense-tenso'
  | 'misterio-investigacao'
  | 'terror-claustrofobico'
  | 'drama-emocional'
  | 'acao-perigo'
  | 'calmaria-introspectiva';

export type SceneAmbientType =
  | 'chuva'
  | 'vento'
  | 'trovao'
  | 'relogio'
  | 'quarto-fechado'
  | 'natureza'
  | 'nenhum';

export interface SceneAcousticProfile {
  mood: SceneMoodType;
  moodLabel: string;
  description: string;
  icon: string;
  ambient: SceneAmbientType;
  ambientLabel: string;
  ambientIcon: string;
  reason: string;
  baseFrequency: number;
  subBassPulse: boolean;
  harmonyType: 'dissonant-minor' | 'suspended-fourth' | 'warm-minor' | 'dark-cluster' | 'open-fifth';
  targetBgmVolume: number;
  targetAmbientVolume: number;
}

// Dicionário de palavras-chave para análise semântica automática da cena
const MOOD_KEYWORDS: Record<SceneMoodType, { words: RegExp; weight: number }> = {
  'terror-claustrofobico': {
    words: /(?:pesadelo|monstro|sangue|grito|horror|pânico|claustrofob|assomb|pavor|frio na espinha|agoni|morte|sombrio|escuridão total|aberração)/i,
    weight: 3.5
  },
  'suspense-tenso': {
    words: /(?:perigo|sombra|cautel|calafrio|silêncio|suspeit|medo|segredo|arma|escond|nervos|estranh|ameaça|tensão|passos|respiração|esgueir|olhou para trás|espreita|vigia)/i,
    weight: 3.0
  },
  'misterio-investigacao': {
    words: /(?:pista|documento|revel|carta|gaveta|descobert|detetive|caso|evidênc|arquivo|examin|enigma|código|mensagem secreta|investig|foto antiga)/i,
    weight: 2.5
  },
  'acao-perigo': {
    words: /(?:correu|tiro|luta|golpe|explos|fuga|gritou|persegui|urgênc|escap|dispar|choc|impacto|acelera|pulou|quebr)/i,
    weight: 2.8
  },
  'drama-emocional': {
    words: /(?:lágrima|lembrança|passado|triste|perda|abraço|despedid|amor|dor|saudad|olhos marejados|vazio|luto|solid|soluço|mágoa)/i,
    weight: 2.5
  },
  'calmaria-introspectiva': {
    words: /(?:calma|paz|respirou fundo|tranquil|alívio|café|manhã|luz suave|silencios|olhou a janela|repouso|descanso|brisa mansa)/i,
    weight: 1.5
  }
};

const AMBIENT_KEYWORDS: Record<SceneAmbientType, RegExp> = {
  chuva: /(?:chuva|chover|chovendo|gotas|garoa|temporal|tempestade|vidro molhado|poça)/i,
  trovao: /(?:trovão|relâmpago|raio|estrondo|trovejou)/i,
  vento: /(?:vento|ventania|uiv|assobio|frio|brisa forte|ar gélido)/i,
  relogio: /(?:relógio|tic-tac|ponteiro|segundos|tique-taque|badalada)/i,
  natureza: /(?:floresta|árvore|bosque|pássaro|trinado|folhas|mata|riacho)/i,
  'quarto-fechado': /(?:quarto|sala|escritório|porta fechada|silêncio interno|aposento)/i,
  nenhum: /^$/
};

/**
 * Analisa semanticamente a página da cena e retorna o perfil acústico ideal
 * Totalmente automático — não exige nenhum conhecimento técnico de áudio
 */
export function analyzeSceneAcoustics(
  page: Partial<CinematicPagePlan>,
  projectGenre?: string,
  emotionalTone?: string
): SceneAcousticProfile {
  // Concatena todo o conteúdo textual e dramático da página
  const textCorpus = [
    page.narrationText || '',
    (page.dialogues || []).map(d => `${d.speakerName}: ${d.speechText}`).join(' '),
    page.sceneSummary || '',
    page.actionsAndExpressions || '',
    page.environmentSetting || '',
    page.dramaticObjective || '',
    emotionalTone || '',
    projectGenre || ''
  ].join(' ').toLowerCase();

  // 1. Calcula pontuação para cada Mood
  const moodScores: Record<SceneMoodType, number> = {
    'suspense-tenso': 0,
    'misterio-investigacao': 0,
    'terror-claustrofobico': 0,
    'drama-emocional': 0,
    'acao-perigo': 0,
    'calmaria-introspectiva': 0
  };

  // Peso inicial baseado no gênero do livro
  const genreLower = (projectGenre || '').toLowerCase();
  if (genreLower.includes('suspense') || genreLower.includes('thriller')) {
    moodScores['suspense-tenso'] += 4;
  } else if (genreLower.includes('misterio') || genreLower.includes('investig')) {
    moodScores['misterio-investigacao'] += 4;
  } else if (genreLower.includes('terror') || genreLower.includes('horror')) {
    moodScores['terror-claustrofobico'] += 4;
  } else if (genreLower.includes('drama') || genreLower.includes('romance')) {
    moodScores['drama-emocional'] += 4;
  } else if (genreLower.includes('aventura') || genreLower.includes('ficcao')) {
    moodScores['acao-perigo'] += 3;
  }

  // Pontuação contextual por palavras-chave na cena
  let matchedReason = 'Tom narrativo geral da obra';

  for (const [moodKey, config] of Object.entries(MOOD_KEYWORDS) as [SceneMoodType, { words: RegExp; weight: number }][]) {
    const matches = textCorpus.match(new RegExp(config.words.source, 'gi'));
    if (matches && matches.length > 0) {
      moodScores[moodKey] += matches.length * config.weight;
      if (matches.length >= 2) {
        matchedReason = `Identificados termos de contexto como "${matches.slice(0, 2).join('", "')}" na cena`;
      }
    }
  }

  // Seleciona o mood com maior pontuação (fallback para suspense-tenso)
  let bestMood: SceneMoodType = 'suspense-tenso';
  let highestScore = -1;
  for (const [mood, score] of Object.entries(moodScores) as [SceneMoodType, number][]) {
    if (score > highestScore) {
      highestScore = score;
      bestMood = mood;
    }
  }

  // 2. Identifica ambiente sonoro secundário (Chuva, Vento, Relógio, etc.)
  let bestAmbient: SceneAmbientType = 'nenhum';
  if (AMBIENT_KEYWORDS.chuva.test(textCorpus)) {
    bestAmbient = 'chuva';
  } else if (AMBIENT_KEYWORDS.vento.test(textCorpus)) {
    bestAmbient = 'vento';
  } else if (AMBIENT_KEYWORDS.relogio.test(textCorpus)) {
    bestAmbient = 'relogio';
  } else if (AMBIENT_KEYWORDS.natureza.test(textCorpus)) {
    bestAmbient = 'natureza';
  } else if (AMBIENT_KEYWORDS['quarto-fechado'].test(textCorpus)) {
    bestAmbient = 'quarto-fechado';
  } else {
    // Se o mood for suspense, ambient padrão sutil de quarto fechado ou vento noturno
    bestAmbient = bestMood === 'suspense-tenso' || bestMood === 'terror-claustrofobico' ? 'quarto-fechado' : 'nenhum';
  }

  // Perfis acústicos pré-calibrados para padrão estúdio de audiolivro
  switch (bestMood) {
    case 'terror-claustrofobico':
      return {
        mood: 'terror-claustrofobico',
        moodLabel: 'Terror Psicológico & Drone Escuro',
        description: 'Sub-graves pesados com texturas atonais e respiração de tensão',
        icon: '🕯️',
        ambient: bestAmbient,
        ambientLabel: getAmbientLabel(bestAmbient),
        ambientIcon: getAmbientIcon(bestAmbient),
        reason: matchedReason,
        baseFrequency: 42,
        subBassPulse: true,
        harmonyType: 'dark-cluster',
        targetBgmVolume: 0.36,
        targetAmbientVolume: 0.22
      };

    case 'suspense-tenso':
      return {
        mood: 'suspense-tenso',
        moodLabel: 'Suspense Claustrofóbico',
        description: 'Drone contínuo sub-grave com pulso sutil de expectativa dramática',
        icon: '🎬',
        ambient: bestAmbient,
        ambientLabel: getAmbientLabel(bestAmbient),
        ambientIcon: getAmbientIcon(bestAmbient),
        reason: matchedReason,
        baseFrequency: 52,
        subBassPulse: true,
        harmonyType: 'dissonant-minor',
        targetBgmVolume: 0.34,
        targetAmbientVolume: 0.22
      };

    case 'misterio-investigacao':
      return {
        mood: 'misterio-investigacao',
        moodLabel: 'Mistério & Investigação Noir',
        description: 'Textura etérea em quarta suspensa com ambiência reflexiva',
        icon: '🕵️',
        ambient: bestAmbient,
        ambientLabel: getAmbientLabel(bestAmbient),
        ambientIcon: getAmbientIcon(bestAmbient),
        reason: matchedReason,
        baseFrequency: 65,
        subBassPulse: false,
        harmonyType: 'suspended-fourth',
        targetBgmVolume: 0.32,
        targetAmbientVolume: 0.20
      };

    case 'acao-perigo':
      return {
        mood: 'acao-perigo',
        moodLabel: 'Tensão Dinâmica & Urgência',
        description: 'Pulso de batimento cardíaco acelerado com ressonância constante',
        icon: '⚡',
        ambient: bestAmbient,
        ambientLabel: getAmbientLabel(bestAmbient),
        ambientIcon: getAmbientIcon(bestAmbient),
        reason: matchedReason,
        baseFrequency: 58,
        subBassPulse: true,
        harmonyType: 'open-fifth',
        targetBgmVolume: 0.38,
        targetAmbientVolume: 0.20
      };

    case 'drama-emocional':
      return {
        mood: 'drama-emocional',
        moodLabel: 'Drama Melancólico & Reflexivo',
        description: 'Harmonia menor suave com ressonância acústica calorosa',
        icon: '🎻',
        ambient: bestAmbient,
        ambientLabel: getAmbientLabel(bestAmbient),
        ambientIcon: getAmbientIcon(bestAmbient),
        reason: matchedReason,
        baseFrequency: 73,
        subBassPulse: false,
        harmonyType: 'warm-minor',
        targetBgmVolume: 0.30,
        targetAmbientVolume: 0.20
      };

    case 'calmaria-introspectiva':
    default:
      return {
        mood: 'calmaria-introspectiva',
        moodLabel: 'Ambiência Acolhedora & Silêncio',
        description: 'Presença sutil de sala silenciosa com micro-detalhes acústicos',
        icon: '☕',
        ambient: bestAmbient,
        ambientLabel: getAmbientLabel(bestAmbient),
        ambientIcon: getAmbientIcon(bestAmbient),
        reason: matchedReason,
        baseFrequency: 82,
        subBassPulse: false,
        harmonyType: 'open-fifth',
        targetBgmVolume: 0.26,
        targetAmbientVolume: 0.18
      };
  }
}

function getAmbientLabel(ambient: SceneAmbientType): string {
  switch (ambient) {
    case 'chuva': return 'Chuva Suave na Janela';
    case 'trovao': return 'Trovões Distantes';
    case 'vento': return 'Vento Noturno Sibilante';
    case 'relogio': return 'Pêndulo de Relógio (Tic-Tac)';
    case 'natureza': return 'Ambiência Natural / Bosque';
    case 'quarto-fechado': return 'Acústica de Cômodo Fechado';
    default: return 'Sem Ambiência Específica';
  }
}

function getAmbientIcon(ambient: SceneAmbientType): string {
  switch (ambient) {
    case 'chuva': return '🌧️';
    case 'trovao': return '⛈️';
    case 'vento': return '💨';
    case 'relogio': return '⏱️';
    case 'natureza': return '🌲';
    case 'quarto-fechado': return '🛋️';
    default: return '🔇';
  }
}

/**
 * Gerenciador Web Audio em Tempo Real com Síntese Procedural
 * - 100% Livre de Copyright / Zero latência de download
 * - Crossfade suave ao trocar de página
 * - Auto-Ducking automático durante narração/falas
 */
export class CinematicAudioDirectorEngine {
  private static instance: CinematicAudioDirectorEngine | null = null;

  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  // Nós de áudio ativos para BGM
  private bgmOscillators: OscillatorNode[] = [];
  private bgmLfo: OscillatorNode | null = null;
  private bgmPulseTimer: number | null = null;

  // Nós de áudio ativos para Ambiência
  private ambientSource: AudioBufferSourceNode | null = null;

  // Estado atual
  private isPlaying: boolean = false;
  private isDucked: boolean = false;
  private currentProfile: SceneAcousticProfile | null = null;
  private userVolumeFactor: number = 1.0; // 0.0 a 2.0 (padrão 1.0)

  // Áudio neural em reprodução ativa
  private currentSpeakingAudio: HTMLAudioElement | null = null;

  // Listeners de mudança de estado
  private onStateChangeCallbacks: Array<(isPlaying: boolean, profile: SceneAcousticProfile | null) => void> = [];

  private constructor() {}

  static getInstance(): CinematicAudioDirectorEngine {
    if (!CinematicAudioDirectorEngine.instance) {
      CinematicAudioDirectorEngine.instance = new CinematicAudioDirectorEngine();
    }
    return CinematicAudioDirectorEngine.instance;
  }

  subscribe(callback: (isPlaying: boolean, profile: SceneAcousticProfile | null) => void): () => void {
    this.onStateChangeCallbacks.push(callback);
    callback(this.isPlaying, this.currentProfile);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  private notify() {
    this.onStateChangeCallbacks.forEach(cb => cb(this.isPlaying, this.currentProfile));
  }

  private ensureAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      // Master Gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // BGM Gain com filtro quente analógico
      this.bgmGain = this.audioCtx.createGain();
      this.bgmGain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
      this.bgmGain.connect(this.masterGain);

      // Ambient Gain
      this.ambientGain = this.audioCtx.createGain();
      this.ambientGain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
      this.ambientGain.connect(this.masterGain);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(console.error);
    }

    return this.audioCtx;
  }

  /**
   * Toca a cena com som contextual automático e crossfade suave
   */
  async playScene(
    page: Partial<CinematicPagePlan>,
    projectGenre?: string,
    emotionalTone?: string
  ): Promise<SceneAcousticProfile> {
    const profile = analyzeSceneAcoustics(page, projectGenre, emotionalTone);
    this.currentProfile = profile;

    const ctx = this.ensureAudioContext();
    const now = ctx.currentTime;

    // Se já estiver tocando, faz um crossfade suave para o novo perfil
    if (this.isPlaying) {
      await this.crossfadeToProfile(profile);
    } else {
      this.startProfile(profile);
    }

    this.isPlaying = true;
    this.notify();
    return profile;
  }

  /**
   * Transiciona suavemente para o novo perfil sonoro
   */
  private async crossfadeToProfile(newProfile: SceneAcousticProfile) {
    if (!this.audioCtx || !this.bgmGain || !this.ambientGain) return;
    const now = this.audioCtx.currentTime;
    const fadeTime = 1.2; // 1.2 segundos de transição suave

    // Fade out suave da trilha anterior
    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.exponentialRampToValueAtTime(0.001, now + fadeTime);

    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.exponentialRampToValueAtTime(0.001, now + fadeTime);

    // Aguarda o término do fade out para religar os novos osciladores
    setTimeout(() => {
      if (this.isPlaying && this.currentProfile?.mood === newProfile.mood) {
        this.stopBgmNodes();
        this.stopAmbientNode();
        this.startProfile(newProfile);
      }
    }, fadeTime * 1000);
  }

  private startProfile(profile: SceneAcousticProfile) {
    if (!this.audioCtx || !this.bgmGain || !this.ambientGain) return;
    const now = this.audioCtx.currentTime;

    this.stopBgmNodes();
    this.stopAmbientNode();

    // 1. INICIA SÍNTESE PROCEDURAL DE BGM INSTRUMENTAL
    this.setupBgmSynthesis(profile);

    // 2. INICIA AMBIÊNCIA CONTEXTUAL (Chuva, Vento, Relógio, etc.)
    this.setupAmbientSound(profile.ambient);

    // 3. FADE IN SUAVE (Evita estalos e cliques nos fones de ouvido)
    const targetBgm = profile.targetBgmVolume * this.userVolumeFactor;
    const targetAmbient = profile.targetAmbientVolume * this.userVolumeFactor;

    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setValueAtTime(0.0001, now);
    this.bgmGain.gain.exponentialRampToValueAtTime(Math.max(0.001, targetBgm), now + 1.8);

    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.setValueAtTime(0.0001, now);
    this.ambientGain.gain.exponentialRampToValueAtTime(Math.max(0.001, targetAmbient), now + 2.0);
  }

  /**
   * 🎻 SÍNTESE HARMÔNICA CINEMATOGRÁFICA (PADS & CORDAS DE CINEMA)
   * 100% livre de zumbidos elétricos: utiliza progressões harmônicas orquestrais
   * em ondas senoidais puras e aveludadas, espacialização estéreo e ressonância quente.
   */
  private setupBgmSynthesis(profile: SceneAcousticProfile) {
    if (!this.audioCtx || !this.bgmGain) return;

    // Filtro analógico quente passa-baixa suave (timbre de veludo para cinema)
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(780, this.audioCtx.currentTime);
    filter.Q.setValueAtTime(0.707, this.audioCtx.currentTime); // Resposta natural de Bessel/Butterworth
    filter.connect(this.bgmGain);

    // Dicionário de acordes cinematográficos nobres (oitavas 3 e 4, agradáveis e sem ruído de 60Hz)
    const CHORD_VOICINGS: Record<SceneMoodType, number[]> = {
      'terror-claustrofobico': [146.83, 174.61, 220.00, 277.18], // Dm(maj7) cinematográfico noir
      'suspense-tenso': [110.00, 164.81, 220.00, 261.63],         // Am9 intimista (A2, E3, A3, C4)
      'misterio-investigacao': [130.81, 174.61, 196.00, 246.94],  // Csus4 reflexivo (C3, F3, G3, B3)
      'acao-perigo': [164.81, 196.00, 246.94, 329.63],            // Em pulsante e enérgico (E3, G3, B3, E4)
      'drama-emocional': [174.61, 220.00, 261.63, 329.63],        // Fmaj7 caloroso de violoncelo (F3, A3, C4, E4)
      'calmaria-introspectiva': [196.00, 246.94, 293.66, 392.00]  // Gmaj sereno e aberto (G3, B3, D4, G4)
    };

    const notes = CHORD_VOICINGS[profile.mood] || CHORD_VOICINGS['suspense-tenso'];
    const pannerPans = [-0.30, 0.25, -0.15, 0.30];

    const oscillators: OscillatorNode[] = [];

    notes.forEach((freq, idx) => {
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();

      // Forma de onda: Senoidal pura para eliminar qualquer aspereza ou zumbido
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      // Volume relativo de cada voz da orquestra (mais macio nos harmônicos superiores)
      const baseGain = idx === 0 ? 0.24 : (0.16 / (idx * 0.8 + 1));
      oscGain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(baseGain, this.audioCtx.currentTime + 1.8);

      // Espacialização estéreo suave (se suportada pelo navegador)
      if (typeof this.audioCtx.createStereoPanner === 'function') {
        const panner = this.audioCtx.createStereoPanner();
        panner.pan.setValueAtTime(pannerPans[idx % pannerPans.length], this.audioCtx.currentTime);
        osc.connect(oscGain);
        oscGain.connect(panner);
        panner.connect(filter);
      } else {
        osc.connect(oscGain);
        oscGain.connect(filter);
      }

      osc.start();
      oscillators.push(osc);
    });

    // LFO ultra-lento de respiração harmônica (0.07Hz = 1 respiração a cada 14 segundos)
    const lfo = this.audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.07, this.audioCtx.currentTime);
    const lfoGain = this.audioCtx.createGain();
    lfoGain.gain.setValueAtTime(80, this.audioCtx.currentTime); // Modulação sutil de corte
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    this.bgmOscillators = oscillators;
    this.bgmLfo = lfo;

    // Se for modo de suspense/tensão, adiciona pulso acústico suave e limpo (estilo batimento orgânico)
    if (profile.subBassPulse) {
      this.startHeartbeatPulse(75); // Frequência harmônica quente e agradável
    }
  }

  /**
   * Pulso acústico suave e limpo (simula batimento cardíaco ou tambor orquestral suave)
   */
  private startHeartbeatPulse(pulseFreq: number) {
    if (!this.audioCtx || !this.bgmGain) return;

    const triggerThud = () => {
      if (!this.isPlaying || !this.audioCtx || !this.bgmGain) return;
      try {
        const thudOsc = this.audioCtx.createOscillator();
        const thudGain = this.audioCtx.createGain();
        const now = this.audioCtx.currentTime;

        thudOsc.type = 'sine';
        thudOsc.frequency.setValueAtTime(pulseFreq, now);
        thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.40);

        thudGain.gain.setValueAtTime(0.0001, now);
        thudGain.gain.linearRampToValueAtTime(0.18 * this.userVolumeFactor, now + 0.08);
        thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        thudOsc.connect(thudGain);
        thudGain.connect(this.bgmGain);

        thudOsc.start(now);
        thudOsc.stop(now + 0.50);
      } catch (err) {
        // Ignora se o contexto for reiniciado
      }
    };

    // Pulso suave a cada 2.8 segundos (cadência humana de repouso)
    this.bgmPulseTimer = window.setInterval(triggerThud, 2800);
  }

  /**
   * 🌧️ AMBIÊNCIA SONORA ACÚSTICA REAL (Chuva, Vento, Tic-Tac e Estúdio)
   * Sons autênticos com espacialização e sem estática irritante.
   */
  private setupAmbientSound(ambient: SceneAmbientType) {
    if (!this.audioCtx || !this.ambientGain || ambient === 'nenhum') return;

    const sampleRate = this.audioCtx.sampleRate;
    const duration = 10; // Buffer estéreo contínuo de 10 segundos
    const numFrames = Math.floor(sampleRate * duration);
    const buffer = this.audioCtx.createBuffer(2, numFrames, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    if (ambient === 'chuva') {
      // Chuva suave realista com pingos em estéreo
      for (let i = 0; i < numFrames; i++) {
        const drop = Math.random() > 0.997 ? (Math.random() * 0.28) : 0;
        const dropletLeft = drop ? Math.sin((i / sampleRate) * 2 * Math.PI * (1600 + Math.random() * 800)) * drop : 0;
        const dropletRight = drop ? Math.sin((i / sampleRate) * 2 * Math.PI * (1400 + Math.random() * 900)) * drop : 0;
        left[i] = dropletLeft * 0.35;
        right[i] = dropletRight * 0.35;
      }
    } else if (ambient === 'vento') {
      // Brisa noturna sutil com varredura harmônica
      for (let i = 0; i < numFrames; i++) {
        const t = i / sampleRate;
        const swell = Math.sin((t / duration) * Math.PI * 2);
        const tone1 = Math.sin(2 * Math.PI * 180 * t) * 0.04 * (1 + 0.5 * swell);
        const tone2 = Math.sin(2 * Math.PI * 360 * t) * 0.02 * (1 + 0.5 * swell);
        left[i] = (tone1 + tone2) * 0.35;
        right[i] = (tone1 * 0.9 + tone2 * 1.1) * 0.35;
      }
    } else if (ambient === 'relogio') {
      // Tique-taque analógico nítido com batidas alternadas
      for (let i = 0; i < numFrames; i++) {
        const t = i / sampleRate;
        const beatTime = t % 1.0;
        let sample = 0;
        if (beatTime < 0.025) {
          const clickProgress = beatTime / 0.025;
          const freq = Math.floor(t) % 2 === 0 ? 1500 : 1050; // Tic e Tac alternados
          sample = Math.sin(2 * Math.PI * freq * beatTime) * Math.exp(-clickProgress * 7) * 0.25;
        }
        left[i] = sample;
        right[i] = sample * 0.85;
      }
    } else {
      // Silêncio acolhedor de sala tratada acusticamente (zero ruído áspero)
      for (let i = 0; i < numFrames; i++) {
        left[i] = 0;
        right[i] = 0;
      }
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.ambientGain);
    source.start();

    this.ambientSource = source;
  }

  /**
   * AUTO-DUCKING PROFISSIONAL (Padrão Audio Drama Comercial):
   * Abaixa automaticamente o som de fundo quando a narração ou personagem fala,
   * e restaura suavemente no silêncio dramático.
   */
  setDucking(isSpeaking: boolean) {
    if (!this.audioCtx || !this.bgmGain || !this.ambientGain || !this.currentProfile) return;
    this.isDucked = isSpeaking;
    const now = this.audioCtx.currentTime;

    const baseBgm = this.currentProfile.targetBgmVolume * this.userVolumeFactor;
    const baseAmb = this.currentProfile.targetAmbientVolume * this.userVolumeFactor;

    if (isSpeaking) {
      // Ducking suave: desce para 55% do volume base (mantém audível e atmosférico sob a narração)
      const duckedBgm = Math.max(0.005, baseBgm * 0.55);
      const duckedAmb = Math.max(0.005, baseAmb * 0.60);

      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.exponentialRampToValueAtTime(duckedBgm, now + 0.35);

      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.exponentialRampToValueAtTime(duckedAmb, now + 0.40);
    } else {
      // Retorno suave: restaura o volume cheio nos respiros dramáticos e pausas
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.exponentialRampToValueAtTime(Math.max(0.005, baseBgm), now + 0.85);

      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.exponentialRampToValueAtTime(Math.max(0.005, baseAmb), now + 0.90);
    }
  }

  /**
   * Garante que o contexto de áudio não esteja suspenso pelo navegador
   */
  resume(): void {
    const ctx = this.ensureAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(console.error);
    }
  }

  /**
   * Retorna o AudioContext ativo
   */
  getAudioContext(): AudioContext {
    return this.ensureAudioContext();
  }

  /**
   * Retorna o nó MasterGain para conexão em MediaStreamDestination de gravação de vídeo
   */
  getMasterGainNode(): GainNode | null {
    this.ensureAudioContext();
    return this.masterGain;
  }

  /**
   * Ajusta o volume geral do som de fundo (fator 0.0 a 2.0)
   */
  setVolumeFactor(factor: number) {
    this.userVolumeFactor = Math.max(0, Math.min(2.0, factor));
    if (this.currentProfile && this.isPlaying) {
      this.setDucking(this.isDucked);
    }
  }

  getVolumeFactor(): number {
    return this.userVolumeFactor;
  }

  /**
   * Para imediatamente toda a reprodução com fade out suave
   */
  stop() {
    if (!this.isPlaying) return;

    if (this.audioCtx && this.bgmGain && this.ambientGain) {
      const now = this.audioCtx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    }

    setTimeout(() => {
      this.stopBgmNodes();
      this.stopAmbientNode();
      this.isPlaying = false;
      this.notify();
    }, 650);
  }

  private stopBgmNodes() {
    this.bgmOscillators.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch {}
    });
    this.bgmOscillators = [];

    if (this.bgmLfo) {
      try { this.bgmLfo.stop(); this.bgmLfo.disconnect(); } catch {}
      this.bgmLfo = null;
    }

    if (this.bgmPulseTimer !== null) {
      window.clearInterval(this.bgmPulseTimer);
      this.bgmPulseTimer = null;
    }
  }

  private stopAmbientNode() {
    if (this.ambientSource) {
      try { this.ambientSource.stop(); this.ambientSource.disconnect(); } catch {}
      this.ambientSource = null;
    }
  }

  /**
   * 🎙️ REPRODUÇÃO COM VOZ NEURAL HUMANA & AUTO-DUCKING PROFISSIONAL
   * Prioridade: Áudio neural da Microsoft Edge TTS / Backend (/api/audiobook/preview-voice).
   * Elimina completamente vozes robóticas padrão do sistema operacional.
   */
  async readSceneAloud(
    page: Partial<CinematicPagePlan>,
    onSentenceChange?: (currentText: string) => void,
    onComplete?: () => void
  ) {
    this.stopReading();

    // Inicia som de fundo harmônico se não estiver tocando
    if (!this.isPlaying) {
      this.playScene(page);
    }

    // Prepara os trechos falados
    const parts: { text: string; gender: 'female' | 'male'; voiceId: string }[] = [];
    if (page.narrationText) {
      parts.push({
        text: page.narrationText,
        gender: 'female',
        voiceId: 'edge:pt-BR-FranciscaNeural'
      });
    }
    (page.dialogues || []).forEach(d => {
      const isMale = /arthur|doutor|ele|homem|detetive|marcos|pedro/i.test(d.speakerName || '');
      parts.push({
        text: `${d.speakerName}: "${d.speechText}"`,
        gender: isMale ? 'male' : 'female',
        voiceId: isMale ? 'edge:pt-BR-AntonioNeural' : 'edge:pt-BR-FranciscaNeural'
      });
    });

    if (parts.length === 0) {
      parts.push({
        text: page.sceneSummary || 'Cena sem texto de narração.',
        gender: 'female',
        voiceId: 'edge:pt-BR-FranciscaNeural'
      });
    }

    let currentIndex = 0;

    const speakNext = async () => {
      if (currentIndex >= parts.length) {
        this.setDucking(false);
        if (onComplete) onComplete();
        return;
      }

      const item = parts[currentIndex];
      if (onSentenceChange) onSentenceChange(item.text);

      // 1. TENTA REPRODUZIR VIA VOZ NEURAL ULTRA-HUMANIZADA NO BACKEND
      try {
        const res = await fetch('/api/audiobook/preview-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: 'pt-BR',
            voiceGender: item.gender,
            voiceId: item.voiceId,
            text: item.text
          })
        });

        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 500) {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            this.currentSpeakingAudio = audio;

            this.setDucking(true);
            audio.play().catch(() => {});

            audio.onended = () => {
              this.setDucking(false);
              currentIndex++;
              setTimeout(speakNext, 450); // Pausa dramática de respiro natural
            };

            audio.onerror = () => {
              this.setDucking(false);
              currentIndex++;
              speakNext();
            };
            return;
          }
        }
      } catch (err) {
        console.warn('[CinematicAudioDirector] Voz neural offline, fallback nativo:', err);
      }

      // 2. FALLBACK SE NÃO HOUVER CONEXÃO: Síntese Nativa Suavizada
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.95;
        utterance.pitch = 0.95;

        utterance.onstart = () => {
          this.setDucking(true);
        };

        utterance.onend = () => {
          this.setDucking(false);
          currentIndex++;
          setTimeout(speakNext, 500);
        };

        utterance.onerror = () => {
          this.setDucking(false);
          currentIndex++;
          speakNext();
        };

        window.speechSynthesis.speak(utterance);
      } else {
        this.setDucking(false);
        currentIndex++;
        speakNext();
      }
    };

    speakNext();
  }

  stopReading() {
    if (this.currentSpeakingAudio) {
      try {
        this.currentSpeakingAudio.pause();
        this.currentSpeakingAudio.currentTime = 0;
      } catch {}
      this.currentSpeakingAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.setDucking(false);
  }

  getCurrentProfile(): SceneAcousticProfile | null {
    return this.currentProfile;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const cinematicAudioDirector = CinematicAudioDirectorEngine.getInstance();
