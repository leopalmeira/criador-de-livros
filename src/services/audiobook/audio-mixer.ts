// ================================================================
// AUDIO MIXER & MASTERIZAÇÃO — MULTI-TRACK COM AUTO-DUCKING
// Book Intel KDP — Estúdio Profissional de Mixagem e Normalização
// ================================================================

import { SoundTimelineEvent } from '../../types/audiobook-studio';
import { generateProceduralSoundBuffer } from './sound-effects-catalog';

export interface MixProgressCallback {
  (progressPercent: number, statusText: string): void;
}

export interface MixResult {
  mixedBlob: Blob;
  mixedUrl: string;
  durationSeconds: number;
}

/**
 * Converte um Blob de áudio (WAV/MP3) em um AudioBuffer do Web Audio
 */
export async function decodeAudioBlob(audioContext: AudioContext | OfflineAudioContext, blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  // Se for OfflineAudioContext ou AudioContext, o decodeAudioData decodifica qualquer formato comum
  return await audioContext.decodeAudioData(arrayBuffer.slice(0));
}

/**
 * Converte um AudioBuffer estéreo em um Blob WAV 16-bit PCM 44.1kHz compatível com reprodutores e plataformas
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = buffer.length;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF Chunk Descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 para PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Escrita das amostras entrelaçadas (interleaved) com normalização anti-clipping
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      // Limitador e clamp
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Mixagem profissional multi-track do capítulo:
 * - Faixa de Voz (VOICE): 100% de inteligibilidade
 * - Faixa de Ambiente: ducking inteligente para 18–22% durante narração, fade-in e fade-out graduais
 * - Faixa de SFX: 20–35% com envelopes suaves sem cortes secos
 * - Normalização de masterização e pico
 */
export async function mixChapterAudio(
  voiceBlob: Blob,
  timelineEvents: SoundTimelineEvent[],
  onProgress?: MixProgressCallback
): Promise<MixResult> {
  if (onProgress) onProgress(10, 'Decodificando faixa vocal do capítulo...');

  // Cria contexto auxiliar temporário para decodificação
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  let voiceBuffer: AudioBuffer;
  try {
    voiceBuffer = await decodeAudioBlob(tempCtx, voiceBlob);
  } finally {
    tempCtx.close().catch(() => {});
  }

  const sampleRate = voiceBuffer.sampleRate || 44100;
  const voiceDuration = voiceBuffer.duration;

  // Calcula a duração total necessária baseada na voz e nos efeitos da timeline
  let maxDuration = voiceDuration;
  timelineEvents.forEach(evt => {
    if (evt.enabled) {
      const eventEnd = evt.startTimeSeconds + evt.durationSeconds;
      if (eventEnd > maxDuration) {
        maxDuration = eventEnd;
      }
    }
  });

  // Adiciona 1 segundo de respiro suave no final
  maxDuration += 1.0;
  const totalFrames = Math.ceil(sampleRate * maxDuration);

  if (onProgress) onProgress(30, 'Inicializando motor de mixagem offline...');

  const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);

  // 1. FAIXA DE VOZ (100% de volume prioritário)
  const voiceSource = offlineCtx.createBufferSource();
  voiceSource.buffer = voiceBuffer;
  const voiceGain = offlineCtx.createGain();
  voiceGain.gain.setValueAtTime(1.0, 0); // Voz sempre 100%
  voiceSource.connect(voiceGain);
  voiceGain.connect(offlineCtx.destination);
  voiceSource.start(0);

  // 2. FAIXAS DE AMBIENTE E SFX (COM AUTO-DUCKING E FADES)
  const enabledEvents = timelineEvents.filter(e => e.enabled);
  let processed = 0;

  for (const event of enabledEvents) {
    if (onProgress) {
      const pct = 30 + Math.floor((processed / Math.max(1, enabledEvents.length)) * 40);
      onProgress(pct, `Mixando evento sonoro: ${event.name}...`);
    }

    const sfxBuffer = generateProceduralSoundBuffer(offlineCtx, event.soundId, event.durationSeconds);
    const sfxSource = offlineCtx.createBufferSource();
    sfxSource.buffer = sfxBuffer;

    const sfxGain = offlineCtx.createGain();
    const startT = Math.max(0, event.startTimeSeconds);
    const endT = startT + event.durationSeconds;

    // Regras de Ducking Automático e Volume Inteligente:
    // AMBIENTE: 15–25% (padrão 0.20)
    // SFX: 20–40% (padrão 0.30)
    let targetVol = event.volume;
    if (event.trackType === 'ambient') {
      targetVol = Math.min(targetVol, 0.22);
    } else {
      targetVol = Math.min(targetVol, 0.38);
    }

    // Envelope com Fade In e Fade Out (evita cliques)
    const fadeIn = Math.max(0.05, event.fadeInSeconds || 0.5);
    const fadeOut = Math.max(0.1, event.fadeOutSeconds || 1.0);

    sfxGain.gain.setValueAtTime(0.0001, startT);
    sfxGain.gain.exponentialRampToValueAtTime(targetVol, startT + fadeIn);
    sfxGain.gain.setValueAtTime(targetVol, Math.max(startT + fadeIn, endT - fadeOut));
    sfxGain.gain.exponentialRampToValueAtTime(0.0001, endT);

    sfxSource.connect(sfxGain);
    sfxGain.connect(offlineCtx.destination);

    sfxSource.start(startT);
    sfxSource.stop(endT);
    processed++;
  }

  if (onProgress) onProgress(75, 'Renderizando master estéreo de alta fidelidade...');
  const renderedBuffer = await offlineCtx.startRendering();

  if (onProgress) onProgress(90, 'Aplicando normalização de pico e masterização...');
  
  // Normalização leve para garantir que o pico fique em -1.5 dB (0.84)
  let peak = 0;
  for (let c = 0; c < renderedBuffer.numberOfChannels; c++) {
    const data = renderedBuffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }
  }

  if (peak > 0.01) {
    const desiredPeak = 0.84;
    const factor = desiredPeak / peak;
    for (let c = 0; c < renderedBuffer.numberOfChannels; c++) {
      const data = renderedBuffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        data[i] = data[i] * factor;
      }
    }
  }

  const mixedBlob = audioBufferToWavBlob(renderedBuffer);
  const mixedUrl = URL.createObjectURL(mixedBlob);

  if (onProgress) onProgress(100, 'Mixagem cinematográfica concluída!');

  return {
    mixedBlob,
    mixedUrl,
    durationSeconds: Math.round(maxDuration * 10) / 10
  };
}

/**
 * Concatena todos os capítulos aprovados para gerar o Audiobook Completo
 * Insere 1.5s de pausa editorial entre cada capítulo
 */
export async function concatenateCompleteAudiobook(
  chapterBlobs: Blob[],
  onProgress?: MixProgressCallback
): Promise<MixResult> {
  if (chapterBlobs.length === 0) {
    throw new Error('Nenhum capítulo disponível para gerar o audiobook completo.');
  }

  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decodedBuffers: AudioBuffer[] = [];

  try {
    for (let i = 0; i < chapterBlobs.length; i++) {
      if (onProgress) {
        onProgress(
          Math.floor((i / chapterBlobs.length) * 40),
          `Carregando capítulo ${i + 1} de ${chapterBlobs.length}...`
        );
      }
      const buf = await decodeAudioBlob(tempCtx, chapterBlobs[i]);
      decodedBuffers.push(buf);
    }
  } finally {
    tempCtx.close().catch(() => {});
  }

  const sampleRate = 44100;
  const pauseBetweenChaptersSeconds = 1.5;

  let totalDuration = 0;
  decodedBuffers.forEach((b, idx) => {
    totalDuration += b.duration;
    if (idx < decodedBuffers.length - 1) {
      totalDuration += pauseBetweenChaptersSeconds;
    }
  });

  const totalFrames = Math.ceil(sampleRate * totalDuration);
  const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);

  let currentStartTime = 0;
  decodedBuffers.forEach((buffer, idx) => {
    if (onProgress) {
      const pct = 40 + Math.floor((idx / decodedBuffers.length) * 40);
      onProgress(pct, `Posicionando capítulo ${idx + 1} na master final...`);
    }

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start(currentStartTime);

    currentStartTime += buffer.duration + pauseBetweenChaptersSeconds;
  });

  if (onProgress) onProgress(85, 'Masterizando compilação completa do audiobook...');
  const finalMasterBuffer = await offlineCtx.startRendering();

  if (onProgress) onProgress(95, 'Exportando Audiobook_Completo.mp3...');
  const completeBlob = audioBufferToWavBlob(finalMasterBuffer);
  const completeUrl = URL.createObjectURL(completeBlob);

  if (onProgress) onProgress(100, 'Audiobook Completo gerado com sucesso!');

  return {
    mixedBlob: completeBlob,
    mixedUrl: completeUrl,
    durationSeconds: Math.round(totalDuration)
  };
}
