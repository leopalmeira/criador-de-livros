import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, RotateCcw, RotateCw, Volume2,
  VolumeX, FastForward, Headphones
} from 'lucide-react';
import { WebSpeechAudioService } from '../../../services/audiobook-service';

interface AudioPlayerProps {
  chapterTitle: string;
  chapterIndex: number;
  totalChapters: number;
  durationSeconds: number;
  audioBlobUrl?: string;
  chapterText?: string;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  onPlaybackEnded?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  chapterTitle,
  chapterIndex,
  totalChapters,
  durationSeconds,
  audioBlobUrl,
  chapterText,
  onNextChapter,
  onPrevChapter,
  onPlaybackEnded
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  // Parar áudio ao trocar de capítulo
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    WebSpeechAudioService.stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [chapterIndex, audioBlobUrl]);

  // Formatação MM:SS
  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const m = Math.floor(s / 60);
    const restS = s % 60;
    return `${String(m).padStart(2, '0')}:${String(restS).padStart(2, '0')}`;
  };

  const totalTime = durationSeconds || 180;

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (audioBlobUrl && audioRef.current) {
        audioRef.current.pause();
      } else {
        WebSpeechAudioService.pause();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setIsPlaying(true);
      if (audioBlobUrl && audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.volume = isMuted ? 0 : volume;
        audioRef.current.play().catch(() => {});
      } else if (chapterText) {
        WebSpeechAudioService.speakText(chapterText, {
          rate: playbackRate,
          volume: isMuted ? 0 : volume,
          onEnd: () => {
            setIsPlaying(false);
            setCurrentTime(totalTime);
            if (onPlaybackEnded) onPlaybackEnded();
          }
        });
      }

      // Contador de progresso visual
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalTime) {
            clearInterval(timerRef.current);
            setIsPlaying(false);
            if (onPlaybackEnded) onPlaybackEnded();
            return totalTime;
          }
          return prev + 1;
        });
      }, 1000 / playbackRate);
    }
  };

  // Seek bar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioBlobUrl && audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Pular 15 segundos
  const handleSkip = (seconds: number) => {
    const nextTime = Math.min(Math.max(0, currentTime + seconds), totalTime);
    setCurrentTime(nextTime);
    if (audioBlobUrl && audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  // Alternar velocidade (0.75x, 1.0x, 1.25x, 1.5x, 2.0x)
  const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
  const cycleSpeed = () => {
    const curIdx = speeds.indexOf(playbackRate);
    const nextSpeed = speeds[(curIdx + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    if (audioBlobUrl && audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: 12,
      padding: '16px 20px',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      {/* Elemento de áudio invisível se tiver blob */}
      {audioBlobUrl && (
        <audio
          ref={audioRef}
          src={audioBlobUrl}
          onEnded={() => {
            setIsPlaying(false);
            if (onPlaybackEnded) onPlaybackEnded();
          }}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
        />
      )}

      {/* Topo: Identificação do Capítulo e Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa'
          }}>
            <Headphones size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              Capítulo {chapterIndex + 1} de {totalChapters}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
              {chapterTitle || 'Sem título'}
            </div>
          </div>
        </div>

        <div style={{
          fontSize: 11,
          padding: '3px 8px',
          borderRadius: 6,
          background: audioBlobUrl ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
          color: audioBlobUrl ? '#34d399' : '#93c5fd',
          fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {audioBlobUrl ? 'Áudio em Disco' : 'Síntese Neural AI'}
        </div>
      </div>

      {/* Barra de Progresso e Timer */}
      <div>
        <input
          type="range"
          min={0}
          max={totalTime}
          step={0.5}
          value={currentTime}
          onChange={handleSeek}
          style={{
            width: '100%',
            height: 5,
            accentColor: '#3b82f6',
            cursor: 'pointer'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalTime)}</span>
        </div>
      </div>

      {/* Controles Principais */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Velocidade */}
        <button
          type="button"
          onClick={cycleSpeed}
          title="Velocidade de Reprodução"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#93c5fd',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {playbackRate}x
        </button>

        {/* Botões Centrais (Retroceder, Play/Pause, Avançar) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => handleSkip(-15)}
            title="Voltar 15 segundos"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontSize: 11
            }}
          >
            <RotateCcw size={16} /> 15s
          </button>

          <button
            type="button"
            onClick={handleTogglePlay}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
            }}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
          </button>

          <button
            type="button"
            onClick={() => handleSkip(15)}
            title="Avançar 15 segundos"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontSize: 11
            }}
          >
            15s <RotateCw size={16} />
          </button>
        </div>

        {/* Volume Mute/Unmute */}
        <button
          type="button"
          onClick={() => setIsMuted(prev => !prev)}
          title={isMuted ? 'Desmutar' : 'Mutar'}
          style={{
            background: 'transparent',
            border: 'none',
            color: isMuted ? '#f87171' : '#94a3b8',
            cursor: 'pointer',
            padding: 4
          }}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </div>
  );
};
