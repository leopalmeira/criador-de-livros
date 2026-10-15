import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { coAuthorVoiceService } from '../../../services/coauthor-voice-service';

export interface CoAuthorVoiceToggleProps {
  compact?: boolean;
  style?: React.CSSProperties;
}

export const CoAuthorVoiceToggle: React.FC<CoAuthorVoiceToggleProps> = ({ compact = false, style }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => coAuthorVoiceService.isVoiceEnabled());
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    // Garante que a voz padrão seja sempre a feminina Francisca (suave e natural)
    coAuthorVoiceService.setVoiceGender('female');

    const unsubscribe = coAuthorVoiceService.subscribe((state) => {
      setIsEnabled(state.isEnabled);
      setIsSpeaking(state.isSpeaking);
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
            ? 'Voz Neural Francisca Ativada: O assistente fala as respostas em tempo real. Clique para silenciar.'
            : 'Voz Desativada: O assistente está em modo silencioso. Clique para ativar a voz neural.'
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
              <span style={{ fontSize: 11, fontWeight: 700 }}>Voz Ativa</span>
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
            ? 'Voz Neural Francisca Ativada: O assistente fala as respostas em tempo real. Clique para silenciar.'
            : 'Áudio Silenciado: Clique para ativar a voz neural do assistente.'
        }
      >
        {isEnabled ? (
          <>
            <Volume2 size={16} color="#db2777" />
            <span>{isSpeaking ? '🗣️ Falando...' : '🔊 Voz Neural (Francisca)'}</span>
          </>
        ) : (
          <>
            <VolumeX size={16} color="#94a3b8" />
            <span>🔇 Voz OFF</span>
          </>
        )}
      </button>

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
