// ================================================================
// TIPOS DO AUDIOBOOK STUDIO & MOTOR DE VOZ KOKORO TTS
// Book Intel KDP — AI Publishing Studio & Smart Sound Design
// ================================================================

export type VoiceGender = 'masculino' | 'feminino';

export type VoiceStyle = 
  | 'narrativa' 
  | 'jovem' 
  | 'madura' 
  | 'documental' 
  | 'dramatica' 
  | 'calma' 
  | 'suspense' 
  | 'energetica';

export interface NarratorVoice {
  id: string;
  name: string;
  gender: VoiceGender;
  style: VoiceStyle;
  language: string;
  description: string;
  sampleText: string;
  sampleAudioUrl?: string;
  kokoroVoiceId?: string; // Mapeamento para o modelo Kokoro (ex: 'af_heart', 'am_adam', etc.)
  previewPitch?: number;
  previewRate?: number;
}

export type NarrationSpeed = 0.8 | 0.9 | 1.0 | 1.1 | 1.2;

export type NarrationStyleMode = 
  | 'natural' 
  | 'cinematografico' 
  | 'suspense' 
  | 'dramatico' 
  | 'documental' 
  | 'calmo' 
  | 'emocional';

export interface NarrationSettings {
  voiceId: string;
  speed: NarrationSpeed;
  pauseMode: 'automaticas' | 'personalizadas';
  paragraphPauseMs: number;
  sentencePauseMs: number;
  styleMode: NarrationStyleMode;
}

// ================================================================
// TIPOS DO SMART SOUND DESIGN & BANCO DE EFEITOS
// ================================================================

export type SoundEffectCategory = 
  | 'nature' 
  | 'weather' 
  | 'doors' 
  | 'footsteps' 
  | 'vehicles' 
  | 'objects' 
  | 'people' 
  | 'technology' 
  | 'animals' 
  | 'environment' 
  | 'impacts' 
  | 'horror' 
  | 'cinematic';

export type SoundEffectPriority = 'essencial' | 'recomendado' | 'opcional';

export interface SoundEffectMetadata {
  id: string;
  name: string;
  category: SoundEffectCategory;
  origin: string;
  license: 'Creative Commons 0' | 'Public Domain' | 'Procedural Synthesis (CC0)';
  author: string;
  durationSeconds: number;
  defaultVolume: number;
  defaultFadeIn: number;
  defaultFadeOut: number;
  isAmbientLoop: boolean;
  synthesizerPreset?: string;
}

export interface SoundTimelineEvent {
  id: string;
  soundId: string;
  name: string;
  trackType: 'ambient' | 'sfx';
  startTimeSeconds: number;
  durationSeconds: number;
  volume: number; // 0.0 a 1.0
  fadeInSeconds: number;
  fadeOutSeconds: number;
  priority: SoundEffectPriority;
  triggerPhrase?: string;
  enabled: boolean;
}

// ================================================================
// CAPÍTULO DE AUDIOBOOK COM MULTI-TRACK TIMELINE
// ================================================================

export interface StudioChapterAudio {
  id: string;
  chapterIndex: number;
  title: string;
  fullText: string;
  wordCount: number;
  estimatedDurationSeconds: number;
  actualDurationSeconds?: number;
  voiceAudioBlob?: Blob;
  voiceAudioUrl?: string;
  mixedAudioBlob?: Blob;
  mixedAudioUrl?: string;
  timelineEvents: SoundTimelineEvent[];
  status: 'pendente' | 'gerando_voz' | 'analisando_sfx' | 'mixando' | 'pronto' | 'alterado' | 'erro';
  errorMessage?: string;
  updatedAt?: number;
}

// ================================================================
// INTERFACE MODULAR DE MOTORES DE VOZ (KOKORO / XTTS / F5-TTS)
// ================================================================

export interface VoiceEngineGenerateParams {
  text: string;
  voiceId: string;
  language: string;
  speed: number;
  styleMode: NarrationStyleMode;
  onProgress?: (progressPercent: number) => void;
}

export interface VoiceEngineResult {
  audioBlob: Blob;
  audioUrl: string;
  durationSeconds: number;
  engineName: string;
}

export interface VoiceEngine {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly isServerConnected: boolean;
  getVoices(): NarratorVoice[];
  generateVoice(params: VoiceEngineGenerateParams): Promise<VoiceEngineResult>;
}
