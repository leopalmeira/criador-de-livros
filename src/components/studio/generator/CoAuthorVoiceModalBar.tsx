import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Radio, Check, X, Sparkles, Volume2 } from 'lucide-react';
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

  // Escuta mudanças de estado do reconhecimento de voz
  useEffect(() => {
    const unsubSpeech = coAuthorSpeechService.subscribe((st) => {
      setSpeechState(st);
    });

    // Registra callback de envio quando o silêncio é detectado após a fala
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

  // Escuta o término da fala do assistente para retomar escuta no Modo Contínuo (Viva-Voz)
  useEffect(() => {
    const unsubVoice = coAuthorVoiceService.subscribe((voiceState) => {
      const speaking = voiceState.isSpeaking;
      setIsAssistantSpeaking(speaking);

      // Se o assistente acabou de falar e o modo contínuo estiver ativado, reativa o microfone automaticamente!
      if (!speaking && speechState.continuousMode && !isLoading && !disabled) {
        // Pequeno intervalo suave de 350ms para transição natural
        const t = setTimeout(() => {
          if (!coAuthorSpeechService.getState().isListening) {
            coAuthorSpeechService.startListening('pt-BR');
          }
        }, 350);
        return () => clearTimeout(t);
      }
    });

    return () => {
      unsubVoice();
    };
  }, [speechState.continuousMode, isLoading, disabled]);

  const handleToggleMic = () => {
    if (speechState.isListening) {
      coAuthorSpeechService.stopListening(true);
    } else {
      // Se a IA estiver falando, para a voz dela antes de começar a ouvir
      if (isAssistantSpeaking) {
        coAuthorVoiceService.stop();
      }
      coAuthorSpeechService.startListening('pt-BR');
    }
  };

  const handleCommitNow = () => {
    coAuthorSpeechService.commitAndSubmit();
  };

  const handleCancel = () => {
    coAuthorSpeechService.cancel();
  };

  const handleToggleContinuous = (e: React.MouseEvent) => {
    e.stopPropagation();
    coAuthorSpeechService.toggleContinuousMode();
  };

  const currentTranscript = (speechState.finalTranscript + ' ' + speechState.interimTranscript).trim();

  // Equalizer visual de ondas sonoras baseado no volume real do microfone
  const renderWaveBars = () => {
    const lvl = speechState.audioLevel;
    const bars = [
      Math.max(4, Math.round((lvl * 0.4))),
      Math.max(6, Math.round((lvl * 0.8))),
      Math.max(10, Math.round(lvl)),
      Math.max(6, Math.round((lvl * 0.85))),
      Math.max(4, Math.round((lvl * 0.5)))
    ];

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 16 }}>
        {bars.map((h, i) => (
          <span
            key={i}
            style={{
              width: 3,
              height: `${Math.min(18, Math.max(3, h * 0.22))}px`,
              backgroundColor: speechState.isSpeaking ? '#ef4444' : '#0284c7',
              borderRadius: 2,
              transition: 'height 0.08s ease, background-color 0.15s ease'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* BANNER FLUTUANTE DE TRANSCRIÇÃO AO VIVO ENQUANTO ESTIVER ESCUTANDO */}
      {speechState.isListening && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#ffffff',
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(56, 189, 248, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            zIndex: 40,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: speechState.isSpeaking ? '#ef4444' : '#38bdf8',
                  boxShadow: speechState.isSpeaking ? '0 0 8px #ef4444' : '0 0 8px #38bdf8',
                  animation: 'pulse 1.2s infinite'
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 5 }}>
                {speechState.isSpeaking ? 'Ouvindo sua voz...' : 'Fale agora (microfone ativo)'}
              </span>
              {renderWaveBars()}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* INDICADOR DE CONTAGEM REGRESSIVA DE SILÊNCIO (ENVIO AUTOMÁTICO) */}
              {speechState.silenceCountdownMs !== null && currentTranscript && (
                <span
                  style={{
                    fontSize: 10,
                    background: 'rgba(56, 189, 248, 0.2)',
                    color: '#38bdf8',
                    padding: '2px 7px',
                    borderRadius: 12,
                    fontWeight: 700
                  }}
                  title="Pausa na fala detectada. Enviando para a IA..."
                >
                  Enviando em {Math.ceil(speechState.silenceCountdownMs / 1000)}s
                </span>
              )}

              {/* BOTAO ENVIAR AGORA */}
              {currentTranscript && (
                <button
                  type="button"
                  onClick={handleCommitNow}
                  style={{
                    background: '#0284c7',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                  title="Enviar mensagem imediatamente"
                >
                  <Check size={12} />
                  <span>Enviar</span>
                </button>
              )}

              {/* BOTAO CANCELAR */}
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: 6,
                  padding: '3px 6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Cancelar áudio"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* PRÉVIA DO TEXTO TRANSCREVENDO EM TEMPO REAL */}
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.4,
              color: currentTranscript ? '#f8fafc' : '#94a3b8',
              fontStyle: currentTranscript ? 'normal' : 'italic',
              maxHeight: 60,
              overflowY: 'auto',
              wordBreak: 'break-word',
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '6px 8px',
              borderRadius: 6
            }}
          >
            {currentTranscript || 'Aguardando sua fala... pode pedir para revisar o livro, criar capa ou enriquecer capítulos.'}
          </div>
        </div>
      )}

      {/* MENSAGEM DE ERRO (SE HOUVER) */}
      {speechState.error && !speechState.isListening && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 40
          }}
        >
          <span>{speechState.error}</span>
          <button
            type="button"
            onClick={() => coAuthorSpeechService.cancel()}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: 2 }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* BOTÕES DE CONTROLE EMBUTIDOS NA BARRA DE MENSAGEM */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* BOTÃO DO MICROFONE */}
        <button
          type="button"
          onClick={handleToggleMic}
          disabled={isLoading || disabled}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: speechState.isListening
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : '#f1f5f9',
            color: speechState.isListening ? '#ffffff' : '#475569',
            border: speechState.isListening ? '1.5px solid #b91c1c' : '1px solid #cbd5e1',
            cursor: isLoading || disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            transition: 'all 0.15s ease',
            boxShadow: speechState.isListening ? '0 0 12px rgba(239, 68, 68, 0.45)' : 'none'
          }}
          title={
            speechState.isListening
              ? 'Microfone ativo (clique para pausar ou finalizar fala)'
              : 'Falar com CoAuthor por voz (Microfone com transcrição em tempo real)'
          }
        >
          {speechState.isListening ? (
            <>
              <Mic size={15} color="#ffffff" />
              <span style={{ fontSize: 11, fontWeight: 800 }}>Ouvindo</span>
            </>
          ) : (
            <Mic size={15} />
          )}
        </button>

        {/* TOGGLE MODO CONVERSA CONTÍNUA (VIVA-VOZ / HANDS-FREE) */}
        <button
          type="button"
          onClick={handleToggleContinuous}
          style={{
            padding: '8px 8px',
            borderRadius: 8,
            background: speechState.continuousMode ? '#f0fdf4' : 'transparent',
            color: speechState.continuousMode ? '#16a34a' : '#94a3b8',
            border: speechState.continuousMode ? '1px solid #86efac' : '1px transparent solid',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            transition: 'all 0.15s ease'
          }}
          title={
            speechState.continuousMode
              ? 'Modo Conversa Fluida (Viva-Voz) ATIVADO: O microfone reabre sozinho assim que o CoAuthor terminar de responder.'
              : 'Ativar Modo Conversa Fluida (Viva-Voz): Conversa contínua e sem precisar clicar no microfone.'
          }
        >
          <Radio size={13} color={speechState.continuousMode ? '#16a34a' : '#94a3b8'} />
          <span style={{ fontSize: 10.5 }}>Viva-Voz</span>
        </button>
      </div>
    </div>
  );
};
