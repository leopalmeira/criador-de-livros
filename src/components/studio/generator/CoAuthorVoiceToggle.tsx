import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { coAuthorVoiceService, VoiceGender } from '../../../services/coauthor-voice-service';

export interface CoAuthorVoiceToggleProps {
  compact?: boolean;
  style?: React.CSSProperties;
}

export const CoAuthorVoiceToggle: React.FC<CoAuthorVoiceToggleProps> = ({ compact = false, style }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => coAuthorVoiceService.isVoiceEnabled());
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [gender, setGender] = useState<VoiceGender>(() => coAuthorVoiceService.getVoiceGender());

  useEffect(() => {
    const unsubscribe = coAuthorVoiceService.subscribe((state) => {
      setIsEnabled(state.isEnabled);
      setIsSpeaking(state.isSpeaking);
      setGender(state.gender);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggle = () => {
    const newState = coAuthorVoiceService.toggleVoice();
    setIsEnabled(newState);
  };

  const handleStopSpeaking = (e: React.MouseEvent) => {
    e.stopPropagation();
    coAuthorVoiceService.stop();
  };

  const handleToggleGender = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextGender: VoiceGender = gender === 'female' ? 'male' : 'female';
    coAuthorVoiceService.setVoiceGender(nextGender);
    setGender(nextGender);
  };

  const voiceName = gender === 'female' ? 'Francisca (Feminina)' : 'Antônio (Masculino)';

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 8,
          border: isEnabled ? '1.5px solid #ec4899' : '1px solid #cbd5e1',
          background: isEnabled ? '#fdf2f8' : '#f8fafc',
          color: isEnabled ? '#db2777' : '#64748b',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isSpeaking ? '0 0 10px rgba(236, 72, 153, 0.35)' : 'none',
          ...style
        }}
        title={
          isEnabled
            ? `Voz Neural Humana Ativada [${voiceName}]: O assistente fala as respostas em tempo real com voz natural e expressiva. Clique para silenciar.`
            : 'Voz Desativada: O assistente está no modo silencioso. Clique para ativar a voz neural humana.'
        }
      >
        {isEnabled ? (
          <>
            <Volume2 size={15} color="#db2777" />
            {isSpeaking ? (
              <span
                onClick={handleStopSpeaking}
                title="Parar fala atual"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  color: '#be185d',
                  fontWeight: 800
                }}
              >
                <span className="coauthor-voice-pulse-dot" />
                Falando...
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700 }}>Neural</span>
            )}
          </>
        ) : (
          <VolumeX size={15} color="#94a3b8" />
        )}
      </button>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        ...style
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 13px',
          borderRadius: 8,
          border: isEnabled ? '1.5px solid #ec4899' : '1px solid #cbd5e1',
          background: isEnabled ? 'linear-gradient(135deg, #fdf2f8, #fce7f3)' : '#f8fafc',
          color: isEnabled ? '#be185d' : '#64748b',
          fontSize: 12.5,
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isSpeaking ? '0 0 12px rgba(236, 72, 153, 0.4)' : '0 1px 3px rgba(0,0,0,0.04)'
        }}
        title={
          isEnabled
            ? `Voz Neural Humana Ativada [${voiceName}]: O assistente usa a voz neural natural da plataforma. Clique para silenciar.`
            : 'Áudio Silenciado: Clique para ativar a voz neural humana do assistente.'
        }
      >
        {isEnabled ? (
          <>
            <Volume2 size={16} color="#db2777" />
            <span>{isSpeaking ? '🗣️ Falando...' : `🔊 Voz Neural (${gender === 'female' ? 'Francisca' : 'Antônio'})`}</span>
          </>
        ) : (
          <>
            <VolumeX size={16} color="#94a3b8" />
            <span>🔇 Voz OFF</span>
          </>
        )}
      </button>

      {/* SELETOR RÁPIDO ENTRE VOZ FEMININA / MASCULINA DA PLATAFORMA */}
      {isEnabled && (
        <button
          type="button"
          onClick={handleToggleGender}
          style={{
            padding: '5px 8px',
            borderRadius: 6,
            border: '1px solid #fbcfe8',
            background: '#ffffff',
            color: '#9d174d',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
          title={`Alternar voz neural (Atual: ${voiceName}). Clique para alternar entre Francisca e Antônio.`}
        >
          <Sparkles size={12} color="#ec4899" />
          {gender === 'female' ? 'Mudar p/ Antônio' : 'Mudar p/ Francisca'}
        </button>
      )}

      {/* BOTÃO PARA INTERROMPER FALA IMEDIATAMENTE */}
      {isSpeaking && (
        <button
          type="button"
          onClick={handleStopSpeaking}
          style={{
            padding: '5px 9px',
            borderRadius: 6,
            border: '1px solid #fbcfe8',
            background: '#ffffff',
            color: '#be185d',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer'
          }}
          title="Interromper fala agora"
        >
          ⏹ Parar
        </button>
      )}

      <style>{`
        .coauthor-voice-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #db2777;
          animation: coauthorPulse 1s infinite alternate ease-in-out;
        }
        @keyframes coauthorPulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
