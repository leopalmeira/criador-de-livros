// ================================================================
// AUDIOBOOK STUDIO — ESTÚDIO DE GERAÇÃO 100% AUTOMÁTICO
// Book Intel KDP — O usuário escolhe apenas Idioma + Voz (Masc/Fem)
// Todo o processamento técnico, particionamento e junção são automáticos.
// ================================================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Headphones,
  Play,
  Pause,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Volume2,
  VolumeX,
  ArrowLeft,
  Sparkles,
  Layers,
  FileCheck
} from 'lucide-react';
import {
  AudiobookClient,
  AudiobookLanguage,
  AudiobookVoiceGender,
  AudiobookStatusResponse,
  mapBookLanguageToAudiobook
} from '../../../services/audiobook/audiobook-client';

export interface AudiobookStudioProps {
  projectId?: string;
  initialTitle?: string;
  initialSubtitle?: string;
  initialAuthor?: string;
  initialChapters?: Array<{
    titulo?: string;
    title?: string;
    texto?: string;
    text?: string;
  }>;
  capaUrl?: string | null;
  bookLanguage?: string;
  onBack?: () => void;
  onAudiobookReady?: (report?: any) => void;
}

const FALLBACK_LANGUAGES: AudiobookLanguage[] = [
  { id: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { id: 'en-US', label: 'Inglês', flag: '🇺🇸' },
  { id: 'es-ES', label: 'Espanhol', flag: '🇪🇸' },
  { id: 'fr-FR', label: 'Francês', flag: '🇫🇷' },
  { id: 'de-DE', label: 'Alemão', flag: '🇩🇪' },
  { id: 'it-IT', label: 'Italiano', flag: '🇮🇹' }
];

function formatTime(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}min`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const AudiobookStudio: React.FC<AudiobookStudioProps> = ({
  projectId: propProjectId,
  initialTitle = '',
  initialSubtitle = '',
  initialAuthor = '',
  initialChapters = [],
  capaUrl = null,
  bookLanguage = 'português',
  onBack,
  onAudiobookReady
}) => {
  // 1. Identificar projeto de forma estável
  const resolvedProjectId = useMemo(() => {
    if (propProjectId && propProjectId.trim()) return propProjectId.trim();
    if (typeof window !== 'undefined') {
      const fromUrl = new URLSearchParams(window.location.search).get('projectId');
      if (fromUrl) return fromUrl;
      const fromHash = window.location.hash.match(/[?&]projectId=([^&]+)/)?.[1];
      if (fromHash) return decodeURIComponent(fromHash);
      const saved = sessionStorage.getItem('kdp_current_project_id');
      if (saved) return saved;
    }
    const cleanTitle = (initialTitle || 'obra').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    return `proj_${cleanTitle || 'audiobook'}`;
  }, [propProjectId, initialTitle]);

  // 2. Normalizar capítulos para o formato do manuscrito
  const normalizedChapters = useMemo(() => {
    return (initialChapters || [])
      .map((c) => ({
        title: String(c.title || c.titulo || '').trim(),
        text: String(c.text || c.texto || '').trim()
      }))
      .filter((c) => c.text.length > 0);
  }, [initialChapters]);

  // 3. Escolhas do usuário (apenas Idioma e Gênero da Voz)
  const [languages, setLanguages] = useState<AudiobookLanguage[]>(FALLBACK_LANGUAGES);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() =>
    mapBookLanguageToAudiobook(bookLanguage)
  );
  const [selectedVoice, setSelectedVoice] = useState<AudiobookVoiceGender>('male');

  // 4. Estado da geração e comunicação com backend
  const [statusData, setStatusData] = useState<AudiobookStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollingTimerRef = useRef<any>(null);

  // 5. Estado do Player Integrado
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);

  // Carregar idiomas disponíveis
  useEffect(() => {
    let mounted = true;
    AudiobookClient.fetchLanguages().then((langs) => {
      if (mounted && langs.length > 0) setLanguages(langs);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Consultar status inicial do projeto
  const checkStatus = useCallback(async () => {
    if (!resolvedProjectId) return;
    try {
      const data = await AudiobookClient.getStatus(resolvedProjectId);
      setStatusData(data);
      if (data.language?.id) setSelectedLanguage(data.language.id);
      if (data.voiceGender) setSelectedVoice(data.voiceGender);
      return data;
    } catch {
      // Projeto ainda sem metadados (normal no primeiro acesso)
      return null;
    } finally {
      setIsLoadingStatus(false);
    }
  }, [resolvedProjectId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Polling enquanto o status for 'generating'
  useEffect(() => {
    if (statusData?.status === 'generating') {
      pollingTimerRef.current = setInterval(async () => {
        const latest = await checkStatus();
        if (latest && latest.status === 'completed' && onAudiobookReady) {
          onAudiobookReady({
            title: latest.title,
            duration: latest.durationSeconds,
            totalChapters: latest.bookChapters
          });
        }
      }, 1500);
    } else {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    }
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [statusData?.status, checkStatus, onAudiobookReady]);

  // Sincronizar e Iniciar / Retomar a geração
  const handleStartGeneration = async () => {
    if (!resolvedProjectId) return;
    if (normalizedChapters.length === 0) {
      setErrorMessage('O livro precisa ter ao menos um capítulo escrito para gerar a narração.');
      return;
    }

    setErrorMessage(null);
    setIsStarting(true);

    try {
      // 1. Sincronizar manuscrito atual do livro com o estúdio
      await AudiobookClient.syncManuscript(resolvedProjectId, {
        title: initialTitle || 'Livro Sem Título',
        subtitle: initialSubtitle || '',
        author: initialAuthor || 'Autor',
        preface: '',
        chapters: normalizedChapters
      });

      // 2. Disparar a geração no backend (somente projectId, language e voiceGender)
      const res = await AudiobookClient.startGeneration(resolvedProjectId, selectedLanguage, selectedVoice);
      setStatusData(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Não foi possível iniciar a gravação. Tente novamente.');
    } finally {
      setIsStarting(false);
    }
  };

  // Reiniciar tudo (com confirmação)
  const handleReset = async () => {
    if (!window.confirm('Deseja realmente gerar um novo audiobook? Isso apagará os áudios atuais.')) {
      return;
    }
    setErrorMessage(null);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      const res = await AudiobookClient.resetAudiobook(resolvedProjectId);
      setStatusData(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao reiniciar o estúdio.');
    }
  };

  // Controles do Player de Áudio
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Pular para o capítulo específico dentro do audiobook
  const jumpToChapter = (chapter: any) => {
    if (!audioRef.current) return;
    const start = chapter.startSeconds || 0;
    audioRef.current.currentTime = start;
    setCurrentTime(start);
    setActiveChapterIndex(chapter.index);
    if (!isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Atualizar capítulo ativo com base no tempo atual
  useEffect(() => {
    if (!statusData?.chapters || statusData.chapters.length === 0) return;
    const chs = statusData.chapters;
    for (let i = chs.length - 1; i >= 0; i--) {
      if (currentTime >= (chs[i].startSeconds || 0)) {
        setActiveChapterIndex(chs[i].index);
        break;
      }
    }
  }, [currentTime, statusData?.chapters]);

  // Alerta de idioma diferente do livro
  const bookLangNorm = mapBookLanguageToAudiobook(bookLanguage);
  const isLanguageDifferent = selectedLanguage !== bookLangNorm;

  const currentStatus = statusData?.status || 'idle';
  const isGenerating = currentStatus === 'generating' || isStarting;
  const isCompleted = currentStatus === 'completed' && statusData?.finalReady;
  const isPartial = currentStatus === 'partial' || currentStatus === 'interrupted';

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        padding: 24,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* CABEÇALHO LIMPO E INTUITIVO */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 20,
          marginBottom: 24
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              backgroundColor: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)'
            }}
          >
            <Headphones size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                🎧 AUDIOBOOKSTUDIO
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  padding: '2px 8px',
                  borderRadius: 12,
                  border: '1px solid #a7f3d0'
                }}
              >
                100% AUTOMÁTICO
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              Transforme seu livro em um audiobook completo automaticamente.
            </p>
          </div>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: '#475569',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={14} /> Voltar
          </button>
        )}
      </div>

      {/* RESUMO DO LIVRO ATUAL */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 24
        }}
      >
        {capaUrl ? (
          <img
            src={capaUrl}
            alt="Capa do Livro"
            style={{ width: 44, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #cbd5e1' }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 60,
              borderRadius: 4,
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8'
            }}
          >
            <BookOpen size={20} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {initialTitle || 'Obra sem Título'}
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
            {initialAuthor ? `Por ${initialAuthor} • ` : ''}
            {normalizedChapters.length}{' '}
            {normalizedChapters.length === 1 ? 'capítulo identificado' : 'capítulos identificados'}
          </p>
        </div>
      </div>

      {/* MENSAGEM DE ERRO (CASO OCORRA) */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#b91c1c',
            fontSize: 13,
            marginBottom: 20
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* CASO: NENHUM CAPÍTULO ESCRITO */}
      {normalizedChapters.length === 0 && (
        <div
          style={{
            padding: '24px 20px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 12,
            color: '#92400e',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20
          }}
        >
          <BookOpen size={22} style={{ flexShrink: 0, color: '#d97706' }} />
          <div>
            <strong>Nenhum capítulo disponível para narração.</strong>
            <p style={{ margin: '4px 0 0', color: '#b45309' }}>
              Volte à etapa de criação ou edição do livro para escrever ou gerar seus capítulos antes de criar o audiobook.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* ESTADO 1: IDLE / CONFIGURAÇÃO (APENAS 2 ESCOLHAS DO USUÁRIO) */}
      {/* ================================================================ */}
      {!isGenerating && !isCompleted && !isPartial && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 24
          }}
        >
          {/* 1. SELEÇÃO DE IDIOMA */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 8
              }}
            >
              IDIOMA:
            </label>
            <div style={{ position: 'relative', maxWidth: 360 }}>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                  appearance: 'none',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
              <span
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748b',
                  fontSize: 12
                }}
              >
                ▼
              </span>
            </div>

            {isLanguageDifferent && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#f59e0b' }}>
                💡 <strong>Dica:</strong> O livro foi escrito originalmente em português. Selecionar outro idioma narrará as palavras com pronúncia adaptada, sem tradução do texto.
              </p>
            )}
          </div>

          {/* 2. SELEÇÃO DE VOZ (MASCULINA OU FEMININA) */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 10
              }}
            >
              VOZ:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, maxWidth: 500 }}>
              {/* Opção Masculina */}
              <button
                type="button"
                onClick={() => setSelectedVoice('male')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 18px',
                  borderRadius: 12,
                  border: selectedVoice === 'male' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: selectedVoice === 'male' ? '#eff6ff' : '#ffffff',
                  color: selectedVoice === 'male' ? '#1d4ed8' : '#334155',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                  boxShadow: selectedVoice === 'male' ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none'
                }}
              >
                <span style={{ fontSize: 24 }}>👨</span>
                <span>MASCULINA</span>
                {selectedVoice === 'male' && <CheckCircle2 size={18} style={{ marginLeft: 'auto', color: '#2563eb' }} />}
              </button>

              {/* Opção Feminina */}
              <button
                type="button"
                onClick={() => setSelectedVoice('female')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 18px',
                  borderRadius: 12,
                  border: selectedVoice === 'female' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: selectedVoice === 'female' ? '#eff6ff' : '#ffffff',
                  color: selectedVoice === 'female' ? '#1d4ed8' : '#334155',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                  boxShadow: selectedVoice === 'female' ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none'
                }}
              >
                <span style={{ fontSize: 24 }}>👩</span>
                <span>FEMININA</span>
                {selectedVoice === 'female' && <CheckCircle2 size={18} style={{ marginLeft: 'auto', color: '#2563eb' }} />}
              </button>
            </div>
          </div>

          {/* BOTÃO PRINCIPAL: GERAR AUDIOBOOK */}
          <div style={{ paddingTop: 8 }}>
            <button
              type="button"
              disabled={isStarting || normalizedChapters.length === 0}
              onClick={handleStartGeneration}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 32px',
                borderRadius: 12,
                border: 'none',
                backgroundColor: normalizedChapters.length === 0 ? '#cbd5e1' : '#059669',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 700,
                cursor: normalizedChapters.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: normalizedChapters.length === 0 ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <Headphones size={20} />
              <span>🎧 GERAR AUDIOBOOK</span>
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* ESTADO 2: PROGRESSO DA GERAÇÃO (CONFORME ESPECIFICAÇÃO EXATA) */}
      {/* ================================================================ */}
      {isGenerating && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            padding: 28,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Headphones size={24} style={{ color: '#2563eb' }} />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              🎧 Gerando audiobook...
            </h3>
          </div>

          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#475569', marginBottom: 20 }}>
            <div>
              <strong>Idioma:</strong> {statusData?.language?.label || (selectedLanguage === 'pt-BR' ? 'Português (Brasil)' : selectedLanguage)}
            </div>
            <div>
              <strong>Voz:</strong> {statusData?.voiceLabel || (selectedVoice === 'male' ? 'Masculina' : 'Feminina')}
            </div>
          </div>

          {/* BARRA DE PROGRESSO COM % */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              <span style={{ color: '#334155' }}>Progresso geral</span>
              <span style={{ color: '#2563eb' }}>{statusData?.progressPercent ?? 0}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: 12,
                borderRadius: 999,
                backgroundColor: '#e2e8f0',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${statusData?.progressPercent ?? 0}%`,
                  backgroundColor: '#2563eb',
                  borderRadius: 999,
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>

          {/* DETALHES DE ANDAMENTO */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 20
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Capítulo atual:
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                {statusData?.current?.label || 'Iniciando narração...'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Capítulos concluídos:
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#059669', marginTop: 4 }}>
                {statusData?.completedCount ?? 0} / {statusData?.totalUnits ?? (normalizedChapters.length + 1)}
              </div>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
            ☕ A narração está sendo gravada automaticamente capítulo por capítulo. Se fechar ou atualizar esta tela, o processo continuará de onde parou.
          </p>
        </div>
      )}

      {/* ================================================================ */}
      {/* ESTADO 3: PARCIAL / INTERROMPIDO (RETOMADA TRANSPARENTE) */}
      {/* ================================================================ */}
      {isPartial && !isGenerating && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            border: '1px solid #fde68a',
            padding: 24,
            marginBottom: 20
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#b45309', marginBottom: 12 }}>
            <AlertCircle size={22} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Geração parcial disponível ({statusData?.completedCount || 0} de {statusData?.totalUnits || 0} prontos)
            </h3>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 18px' }}>
            A gravação foi pausada ou encontrou uma instabilidade temporária. Os capítulos já gravados foram salvos e não serão refeitos.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={handleStartGeneration}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 10,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Play size={16} /> Continuar de onde parou
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 10,
                backgroundColor: '#ffffff',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} /> Começar do zero
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* ESTADO 4: FINALIZAÇÃO (🎉 AUDIOBOOK CONCLUÍDO + PLAYER COMPLETO) */}
      {/* ================================================================ */}
      {isCompleted && statusData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* CARD DE CONCLUSÃO */}
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 14,
              padding: 24
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>🎉</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#065f46' }}>
                AUDIOBOOK CONCLUÍDO
              </h3>
            </div>

            {/* DETALHES DO AUDIOBOOK PRONTO */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
                backgroundColor: '#ffffff',
                border: '1px solid #d1fae5',
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 20
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Título</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{initialTitle || 'Livro'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Idioma</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {statusData.language?.label || 'Português (Brasil)'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Voz</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {statusData.voiceLabel || (statusData.voiceGender === 'female' ? 'Feminina' : 'Masculina')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Duração</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {formatTime(statusData.durationSeconds)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Capítulos</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {statusData.bookChapters} capítulos (+ intro)
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO EXIGIDOS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button
                type="button"
                onClick={togglePlayPause}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 22px',
                  borderRadius: 10,
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
                }}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <span>{isPlaying ? 'PAUSAR AUDIOBOOK' : '▶ OUVIR AUDIOBOOK'}</span>
              </button>

              <a
                href={AudiobookClient.getFinalAudioUrl(resolvedProjectId, true)}
                download={`audiobook_${resolvedProjectId}.mp3`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: 10,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                <Download size={16} />
                <span>⬇ BAIXAR AUDIOBOOK</span>
              </a>

              <a
                href={AudiobookClient.getDownloadAllChaptersUrl(resolvedProjectId)}
                download={`audiobook_${resolvedProjectId}_capitulos.zip`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: 10,
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                <Download size={16} />
                <span>⬇ BAIXAR CAPÍTULOS (.ZIP)</span>
              </a>

              <button
                type="button"
                onClick={handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 18px',
                  borderRadius: 10,
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                <RotateCcw size={14} />
                <span>🔄 GERAR NOVAMENTE</span>
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* PLAYER INTEGRADO COM CONTROLES COMPLETOS */}
          {/* ============================================================ */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              padding: 24,
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            {/* ELEMENTO AUDIO OCULTO */}
            <audio
              ref={audioRef}
              src={AudiobookClient.getFinalAudioUrl(resolvedProjectId)}
              preload="metadata"
              onTimeUpdate={() => {
                if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (audioRef.current) setAudioDuration(audioRef.current.duration || statusData.durationSeconds || 0);
              }}
              onEnded={() => setIsPlaying(false)}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  backgroundColor: '#f1f5f9',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Headphones size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  {initialTitle || 'Audiobook Completo'}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Tocando:{' '}
                  <strong>
                    {statusData.chapters.find((c) => c.index === activeChapterIndex)?.label || 'Introdução'}
                  </strong>
                </p>
              </div>
            </div>

            {/* BARRA DE PROGRESSO DO PLAYER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', minWidth: 45 }}>
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={audioDuration || statusData.durationSeconds || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                style={{
                  flex: 1,
                  accentColor: '#2563eb',
                  cursor: 'pointer',
                  height: 6
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', minWidth: 45, textAlign: 'right' }}>
                {formatTime(audioDuration || statusData.durationSeconds)}
              </span>
            </div>

            {/* CONTROLES: PLAY, VOLUME E SELETOR */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              {/* PLAY / PAUSE */}
              <button
                type="button"
                onClick={togglePlayPause}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
                }}
              >
                {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 2 }} />}
              </button>

              {/* CONTROLE DE VOLUME */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={toggleMute}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  style={{ width: 80, accentColor: '#2563eb', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* LISTA / SELEÇÃO DE CAPÍTULOS */}
            <div style={{ marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>
                SELEÇÃO DE CAPÍTULOS ({statusData.chapters.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {statusData.chapters.map((ch) => {
                  const isActive = ch.index === activeChapterIndex;
                  return (
                    <div
                      key={ch.file}
                      onClick={() => jumpToChapter(ch)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 8,
                        backgroundColor: isActive ? '#eff6ff' : '#f8fafc',
                        border: isActive ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{ fontSize: 12, color: isActive ? '#2563eb' : '#94a3b8' }}>
                          {isActive && isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        </span>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#1d4ed8' : '#1e293b' }}>
                            {ch.label}
                          </span>
                          {ch.title && ch.title !== ch.label && (
                            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                              • {ch.title}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {formatTime(ch.durationSeconds)}
                        </span>
                        <a
                          href={AudiobookClient.getChapterAudioUrl(resolvedProjectId, ch.file, true)}
                          download={ch.file}
                          onClick={(e) => e.stopPropagation()}
                          title="Baixar capítulo individual"
                          style={{
                            color: '#64748b',
                            padding: 4,
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
