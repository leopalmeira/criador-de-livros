import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Volume2, Sparkles, X, StopCircle } from 'lucide-react';
import {
  coAuthorSpeechService,
  SpeechRecognitionState
} from '../../../services/coauthor-speech-recognition-service';
import { coAuthorVoiceService } from '../../../services/coauthor-voice-service';

export interface CoAuthorVoiceModalBarProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const CoAuthorVoiceModalBar: React.FC<CoAuthorVoiceModalBarProps> = ({
  onSendMessage,
  isLoading,
  disabled = false
}) => {
  const [speechState, setSpeechState] = useState<SpeechRecognitionState>(() =>
    coAuthorSpeechService.getState()
  );
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);

  // BARGE-IN: Sempre que o usuário falar no microfone, se o CoAuthor estiver falando, a IA se cala na hora!
  useEffect(() => {
    coAuthorSpeechService.setOnUserInterrupted(() => {
      if (coAuthorVoiceService.isSpeaking()) {
        coAuthorVoiceService.stop();
      }
    });

    const unsubSpeech = coAuthorSpeechService.subscribe((st) => {
      setSpeechState(st);
    });

    coAuthorSpeechService.setOnSubmit((transcript) => {
      if (transcript && transcript.trim()) {
        onSendMessage(transcript.trim());
      }
    });

    return () => {
      unsubSpeech();
      coAuthorSpeechService.stopListening(false);
    };
  }, [onSendMessage]);

  // Ciclo Contínuo de Conversa Fluida:
  // Quando o CoAuthor termina de falar, o microfone reabre sozinho sem o usuário precisar clicar!
  useEffect(() => {
    const unsubVoice = coAuthorVoiceService.subscribe((voiceState) => {
      const speaking = voiceState.isSpeaking;
      setIsAssistantSpeaking(speaking);

      if (!speaking && speechState.isLiveSessionActive && !isLoading && !disabled) {
        const timer = setTimeout(() => {
          if (!coAuthorSpeechService.getState().isListening) {
            coAuthorSpeechService.startListening('pt-BR');
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    });

    return () => {
      unsubVoice();
    };
  }, [speechState.isLiveSessionActive, isLoading, disabled]);

  // Alterna o Modo de Conversa por Voz
  const handleToggleVoiceSession = () => {
    if (speechState.isLiveSessionActive || speechState.isListening) {
      // Encerra sessão de voz
      coAuthorSpeechService.setLiveSessionActive(false);
      coAuthorSpeechService.stopListening(true);
      if (isAssistantSpeaking) {
        coAuthorVoiceService.stop();
      }
    } else {
      // Inicia sessão contínua de voz (viva-voz hands-free ativo)
      if (isAssistantSpeaking) {
        coAuthorVoiceService.stop();
      }
      coAuthorSpeechService.setLiveSessionActive(true);
      coAuthorSpeechService.startListening('pt-BR');
    }
  };

  const currentTranscript = (speechState.finalTranscript + ' ' + speechState.interimTranscript).trim();

  // Equalizer visual inline
  const renderWaveBars = () => {
    const lvl = speechState.audioLevel;
    const bars = [
      Math.max(3, Math.round(lvl * 0.3)),
      Math.max(5, Math.round(lvl * 0.7)),
      Math.max(9, Math.round(lvl * 1.0)),
      Math.max(6, Math.round(lvl * 0.75)),
      Math.max(4, Math.round(lvl * 0.4))
    ];

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 14 }}>
        {bars.map((h, i) => (
          <span
            key={i}
            style={{
              width: 2.5,
              height: `${Math.min(14, Math.max(3, h * 0.2))}px`,
              backgroundColor: speechState.isSpeaking ? '#ef4444' : '#0284c7',
              borderRadius: 2,
              transition: 'height 0.08s ease'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {/* BOTÃO MESTRE DE CONVERSA POR VOZ */}
      <button
        type="button"
        onClick={handleToggleVoiceSession}
        disabled={isLoading || disabled}
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          background: speechState.isLiveSessionActive
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : '#f1f5f9',
          color: speechState.isLiveSessionActive ? '#ffffff' : '#334155',
          border: speechState.isLiveSessionActive ? '1.5px solid #b91c1c' : '1px solid #cbd5e1',
          cursor: isLoading || disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 700,
          fontSize: 11.5,
          transition: 'all 0.15s ease',
          boxShadow: speechState.isLiveSessionActive ? '0 0 14px rgba(239, 68, 68, 0.45)' : 'none'
        }}
        title={
          speechState.isLiveSessionActive
            ? 'Conversa por Voz Ativa (Barge-in ligado: fale a qualquer momento e o CoAuthor se cala para te ouvir). Clique para desligar o microfone.'
            : 'Ativar Conversa por Voz Contínua (Fale normalmente sem precisar clicar)'
        }
      >
        {speechState.isLiveSessionActive ? (
          <>
            <Mic size={15} color="#ffffff" />
            <span>Voz Ativa</span>
            {renderWaveBars()}
          </>
        ) : (
          <>
            <Mic size={15} color="#475569" />
            <span>Falar por Voz</span>
          </>
        )}
      </button>

      {/* STATUS INLINE DISCRETO QUANDO A CONVERSA POR VOZ ESTIVER ATIVA */}
      {speechState.isLiveSessionActive && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: speechState.isSpeaking ? '#dc2626' : (isAssistantSpeaking ? '#be185d' : '#0284c7'),
          fontWeight: 700,
          background: speechState.isSpeaking ? '#fef2f2' : (isAssistantSpeaking ? '#fdf2f8' : '#f0f9ff'),
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid currentColor',
          maxWidth: 220,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {speechState.isSpeaking ? (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
              <span>Ouvindo você...</span>
            </>
          ) : isAssistantSpeaking ? (
            <>
              <Volume2 size={12} color="#be185d" />
              <span>CoAuthor falando (fale para interromper)</span>
            </>
          ) : (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0284c7' }} />
              <span>Sua vez de falar...</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
