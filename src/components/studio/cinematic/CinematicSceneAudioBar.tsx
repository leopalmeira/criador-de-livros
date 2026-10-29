import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2, VolumeX, Play, Square, Headphones, Sparkles,
  Info, Mic, Activity, RefreshCw
} from 'lucide-react';
import {
  cinematicAudioDirector,
  analyzeSceneAcoustics,
  SceneAcousticProfile
} from '../../../services/cinematic-audio-director';
import { CinematicPagePlan } from '../../../types/cinematic-novel';

interface CinematicSceneAudioBarProps {
  currentPage: CinematicPagePlan;
  projectGenre?: string;
  projectEmotionalTone?: string;
  className?: string;
}

export const CinematicSceneAudioBar: React.FC<CinematicSceneAudioBarProps> = ({
  currentPage,
  projectGenre,
  projectEmotionalTone,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [activeProfile, setActiveProfile] = useState<SceneAcousticProfile>(() =>
    analyzeSceneAcoustics(currentPage, projectGenre, projectEmotionalTone)
  );
  const [volumePercent, setVolumePercent] = useState<number>(100); // 100% do volume calibrado de audiolivro
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [spokenText, setSpokenText] = useState<string | null>(null);

  // Analisa o perfil acústico sempre que a página ou tom mudar
  useEffect(() => {
    const profile = analyzeSceneAcoustics(currentPage, projectGenre, projectEmotionalTone);
    setActiveProfile(profile);

    // Se já estiver tocando, faz crossfade suave para a nova página automaticamente!
    if (cinematicAudioDirector.getIsPlaying()) {
      cinematicAudioDirector.playScene(currentPage, projectGenre, projectEmotionalTone);
    }
  }, [currentPage?.id, currentPage?.pageNumber, currentPage?.narrationText, projectGenre, projectEmotionalTone]);

  // Se inscreve para atualizações do motor de áudio
  useEffect(() => {
    const unsubscribe = cinematicAudioDirector.subscribe((playing, profile) => {
      setIsPlaying(playing);
      if (profile) setActiveProfile(profile);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleTogglePlay = () => {
    if (isPlaying) {
      cinematicAudioDirector.stop();
      if (isReading) {
        cinematicAudioDirector.stopReading();
        setIsReading(false);
        setSpokenText(null);
      }
    } else {
      cinematicAudioDirector.playScene(currentPage, projectGenre, projectEmotionalTone);
    }
  };

  const handleToggleReadAloud = () => {
    if (isReading) {
      cinematicAudioDirector.stopReading();
      setIsReading(false);
      setSpokenText(null);
    } else {
      setIsReading(true);
      cinematicAudioDirector.readSceneAloud(
        currentPage,
        (currentSentence) => {
          setSpokenText(currentSentence);
        },
        () => {
          setIsReading(false);
          setSpokenText(null);
        }
      );
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolumePercent(val);
    cinematicAudioDirector.setVolumeFactor(val / 100);
  };

  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth: 580,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        userSelect: 'none',
        marginTop: 12
      }}
    >
      {/* LINHA 1: CONTROLES PRINCIPAIS & VIBE DA CENA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        
        {/* LADO ESQUERDO: BOTÕES DE REPRODUÇÃO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* BOTÃO PLAY/STOP TRILHA DE FUNDO */}
          <button
            onClick={handleTogglePlay}
            style={{
              background: isPlaying
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: isPlaying
                ? '0 0 16px rgba(239, 68, 68, 0.4)'
                : '0 0 14px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease'
            }}
            title={isPlaying ? 'Pausar som de fundo' : 'Tocar som de fundo automático desta cena'}
          >
            {isPlaying ? <Square size={15} fill="#fff" /> : <Play size={15} fill="#fff" />}
            <span>{isPlaying ? 'Pausar Áudio' : 'Ouvir Fundo da Cena'}</span>
          </button>

          {/* BOTÃO LER CENA EM VOZ ALTA (COM AUTO-DUCKING) */}
          <button
            onClick={handleToggleReadAloud}
            style={{
              background: isReading
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'rgba(255, 255, 255, 0.08)',
              color: isReading ? '#ffffff' : '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease'
            }}
            title="Narração falada com a música de fundo abaixando automaticamente nas falas"
          >
            <Mic size={14} />
            <span>{isReading ? 'Parar Narração' : 'Ler Cena (Audiolivro)'}</span>
          </button>
        </div>

        {/* LADO DIREITO: VIBE DETECTADA PELA IA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            onClick={() => setShowDetails(!showDetails)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '5px 10px',
              borderRadius: 6,
              cursor: 'pointer'
            }}
            title="Clique para ver detalhes do que a IA detectou nesta cena"
          >
            <span style={{ fontSize: 14 }}>{activeProfile.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
              {activeProfile.moodLabel}
            </span>
            {activeProfile.ambient !== 'nenhum' && (
              <span style={{
                fontSize: 11,
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                padding: '1px 6px',
                borderRadius: 4
              }}>
                {activeProfile.ambientIcon} {activeProfile.ambientLabel}
              </span>
            )}
            <Info size={12} color="#94a3b8" />
          </div>
        </div>
      </div>

      {/* LINHA 2: EQUALIZADOR VISUAL, SLIDER DE VOLUME & DUCKING */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: 11,
        color: '#94a3b8'
      }}>
        {/* ANIMAÇÃO DE ONDAS SONORAS QUANDO ATIVO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 14, width: 22 }}>
            <span style={{
              width: 3,
              height: isPlaying ? '100%' : '30%',
              background: isPlaying ? '#38bdf8' : '#64748b',
              borderRadius: 2,
              animation: isPlaying ? 'cinesound-pulse 0.8s ease-in-out infinite alternate' : 'none'
            }} />
            <span style={{
              width: 3,
              height: isPlaying ? '70%' : '20%',
              background: isPlaying ? '#38bdf8' : '#64748b',
              borderRadius: 2,
              animation: isPlaying ? 'cinesound-pulse 1.1s ease-in-out infinite alternate 0.2s' : 'none'
            }} />
            <span style={{
              width: 3,
              height: isPlaying ? '90%' : '40%',
              background: isPlaying ? '#38bdf8' : '#64748b',
              borderRadius: 2,
              animation: isPlaying ? 'cinesound-pulse 0.9s ease-in-out infinite alternate 0.4s' : 'none'
            }} />
            <span style={{
              width: 3,
              height: isPlaying ? '60%' : '25%',
              background: isPlaying ? '#38bdf8' : '#64748b',
              borderRadius: 2,
              animation: isPlaying ? 'cinesound-pulse 1.3s ease-in-out infinite alternate 0.1s' : 'none'
            }} />
          </div>

          <span style={{ color: isPlaying ? '#38bdf8' : '#94a3b8', fontWeight: 600 }}>
            {isPlaying ? 'Som de Fundo Ativo (Auto-Ducking Ligado)' : 'Som Automático Pronto'}
          </span>
        </div>

        {/* CONTROLE DE VOLUME DISCRETO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {volumePercent === 0 ? <VolumeX size={14} color="#94a3b8" /> : <Volume2 size={14} color="#cbd5e1" />}
          <input
            type="range"
            min="0"
            max="150"
            value={volumePercent}
            onChange={handleVolumeChange}
            style={{
              width: 80,
              accentColor: '#38bdf8',
              cursor: 'pointer'
            }}
            title="Ajuste o volume do som de fundo"
          />
          <span style={{ minWidth: 28, textAlign: 'right', fontWeight: 700 }}>{volumePercent}%</span>
        </div>
      </div>

      {/* LINHA 3 (OPCIONAL): DETALHES DA ANÁLISE SEMÂNTICA */}
      {showDetails && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 11,
          lineHeight: 1.5,
          color: '#cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <div>
            <strong style={{ color: '#f8fafc' }}>Por que esse som foi escolhido?</strong> {activeProfile.reason}.
          </div>
          <div style={{ color: '#94a3b8' }}>
            {activeProfile.description} • Volume pré-calibrado para 15% (evita sobrepor a fala).
          </div>
        </div>
      )}

      {/* STATUS DA LEITURA EM VOZ ALTA */}
      {isReading && spokenText && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 11,
          color: '#a7f3d0',
          fontStyle: 'italic'
        }}>
          🎙️ Narrando: "{spokenText.slice(0, 80)}{spokenText.length > 80 ? '...' : ''}"
        </div>
      )}

      {/* ESTILOS CSS INLINE PARA AS ONDAS */}
      <style>{`
        @keyframes cinesound-pulse {
          0% { height: 25%; }
          100% { height: 100%; }
        }
      `}</style>
    </div>
  );
};
