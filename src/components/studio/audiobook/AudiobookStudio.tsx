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
  FileCheck,
  Sliders,
  Wand2,
  Music,
  Activity,
  Check,
  Radio,
  Volume1,
  Loader2
} from 'lucide-react';
import {
  AudiobookClient,
  AudiobookLanguage,
  AudiobookVoiceGender,
  AudiobookStatusResponse,
  AudiobookEngineStatus,
  AudiobookVoice,
  mapBookLanguageToAudiobook
} from '../../../services/audiobook/audiobook-client';
import { AudioTimeline } from './AudioTimeline';
import {
  analyzeChapterSoundDesign,
  SmartSoundDesignResult
} from '../../../services/audiobook/smart-sound-design';
import { mixChapterAudio, MixResult } from '../../../services/audiobook/audio-mixer';
import { SoundTimelineEvent } from '../../../types/audiobook-studio';


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

  // 6. Abas e Fluxo Profissional: Narração -> Sonorização/Timeline -> Mixer & Masterização
  const [activeTab, setActiveTab] = useState<'narration' | 'timeline' | 'player'>('narration');
  const [engineStatus, setEngineStatus] = useState<AudiobookEngineStatus | null>(null);

  // 7. Estado de Sonorização e Timeline Multi-track
  const [selectedTimelineChapter, setSelectedTimelineChapter] = useState<number>(0);
  const [chapterTimelineEvents, setChapterTimelineEvents] = useState<Record<number, SoundTimelineEvent[]>>({});
  const [soundDesignSummary, setSoundDesignSummary] = useState<Record<number, SmartSoundDesignResult['summary']>>({});
  const [isAnalyzingSoundDesign, setIsAnalyzingSoundDesign] = useState<boolean>(false);

  // 8. Estado de Mixagem com Auto-Ducking
  const [isMixing, setIsMixing] = useState<boolean>(false);
  const [mixProgress, setMixProgress] = useState<{ percent: number; status: string } | null>(null);
  const [chapterMixedAudio, setChapterMixedAudio] = useState<Record<number, { url: string; blob: Blob; duration: number }>>({});
  const [playMixedAudio, setPlayMixedAudio] = useState<boolean>(false);
  const mixedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Diagnóstico de motores TTS no backend
  useEffect(() => {
    AudiobookClient.fetchEngineStatus().then((st) => {
      if (st) setEngineStatus(st);
    });
  }, []);

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

  // Analisar sonorização inteligente para o capítulo selecionado
  const handleAnalyzeSoundDesign = (chapterIdx: number) => {
    const chapter = normalizedChapters[chapterIdx];
    if (!chapter || !chapter.text) return;

    setIsAnalyzingSoundDesign(true);
    try {
      const result = analyzeChapterSoundDesign(chapter.text);
      setChapterTimelineEvents(prev => ({
        ...prev,
        [chapterIdx]: result.detectedEvents
      }));
      setSoundDesignSummary(prev => ({
        ...prev,
        [chapterIdx]: result.summary
      }));
    } finally {
      setIsAnalyzingSoundDesign(false);
    }
  };

  // Mixar capítulo vocal com a timeline de efeitos multi-track (auto-ducking)
  const handleMixChapter = async (chapterIdx: number) => {
    const events = chapterTimelineEvents[chapterIdx] || [];
    if (events.length === 0) {
      alert('Nenhum efeito configurado na timeline para mixar. Clique em "✨ Gerar Sonorização Inteligente" ou adicione efeitos do banco.');
      return;
    }

    const chapterMeta = statusData?.chapters?.find(c => c.index === chapterIdx);
    if (!chapterMeta || !chapterMeta.file) {
      alert('A narração deste capítulo ainda não foi gravada. Gere a narração primeiro na aba "Narração & Vozes".');
      return;
    }

    setIsMixing(true);
    setMixProgress({ percent: 10, status: 'Carregando gravação vocal do capítulo...' });

    try {
      const voiceAudioUrl = AudiobookClient.getChapterAudioUrl(resolvedProjectId, chapterMeta.file);
      const res = await fetch(voiceAudioUrl);
      if (!res.ok) throw new Error('Não foi possível carregar a gravação vocal.');
      const voiceBlob = await res.blob();

      const mixResult = await mixChapterAudio(voiceBlob, events, (percent, status) => {
        setMixProgress({ percent, status });
      });

      setChapterMixedAudio(prev => ({
        ...prev,
        [chapterIdx]: {
          url: mixResult.mixedUrl,
          blob: mixResult.mixedBlob,
          duration: mixResult.durationSeconds
        }
      }));

      setPlayMixedAudio(true);
    } catch (err: any) {
      alert(`Falha na mixagem: ${err.message || 'Erro inesperado.'}`);
    } finally {
      setIsMixing(false);
      setMixProgress(null);
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

      {/* BARRA DE STATUS DO MOTOR TTS NEURAL */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '10px 16px',
          marginBottom: 16,
          fontSize: 12,
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Activity size={15} color="#059669" />
          <span style={{ fontWeight: 600, color: '#334155' }}>Motor Neural:</span>
          <span style={{
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 6,
            border: '1px solid #a7f3d0'
          }}>
            {engineStatus?.primaryEngine ? `✅ ${engineStatus.primaryEngine} (Pronto)` : '⚡ NeuralCloud / Kokoro TTS'}
          </span>
          <span style={{ color: '#64748b' }}>• FFmpeg: {engineStatus?.ffmpegInstalled ? 'Instalado' : 'Integrado (Zero dependência externa)'}</span>
        </div>
        <div style={{ color: '#64748b', fontSize: 11 }}>
          Biblioteca de Efeitos: <strong>CC0 / Public Domain</strong>
        </div>
      </div>

      {/* ABAS DO ESTÚDIO: NARRAÇÃO | SONORIZAÇÃO & TIMELINE | PLAYER & MASTER */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 20
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('narration')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: activeTab === 'narration' ? 700 : 500,
            color: activeTab === 'narration' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'narration' ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: -2,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Headphones size={16} /> 1. Narração & Vozes
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: activeTab === 'timeline' ? 700 : 500,
            color: activeTab === 'timeline' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'timeline' ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: -2,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Music size={16} /> 2. Sonorização & Timeline
          {Object.keys(chapterTimelineEvents).length > 0 && (
            <span style={{ fontSize: 10, background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
              {Object.values(chapterTimelineEvents).reduce((acc, curr) => acc + curr.length, 0)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('player')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: activeTab === 'player' ? 700 : 500,
            color: activeTab === 'player' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'player' ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: -2,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Radio size={16} /> 3. Player & Masterização
          {isCompleted && (
            <span style={{ fontSize: 10, background: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
              PRONTO
            </span>
          )}
        </button>
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
      {/* ABA 1: NARRAÇÃO & VOZES */}
      {/* ================================================================ */}
      {activeTab === 'narration' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {isCompleted && (
            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 14,
                padding: '18px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={24} color="#059669" />
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#065f46' }}>
                    Narração concluída com sucesso!
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#047857' }}>
                    {statusData?.bookChapters} capítulos gravados • Duração total: {formatTime(statusData?.durationSeconds || 0)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
                  }}
                >
                  <Music size={15} /> 2. Sonorização & Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('player')}
                  style={{
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 6px rgba(5,150,105,0.25)'
                  }}
                >
                  <Play size={15} /> 3. Ouvir no Player
                </button>
              </div>
            </div>
          )}

          {/* ESTADO 1: IDLE / CONFIGURAÇÃO (APENAS 2 ESCOLHAS DO USUÁRIO) */}
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
        </div>
      )}

      {/* ================================================================ */}
      {/* ABA 2: SONORIZAÇÃO & TIMELINE MULTI-TRACK */}
      {/* ================================================================ */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Seletor de Capítulos e Ação de Sonorização */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  🎛️ Sonorização & Design Sonoro Multi-track
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                  Análise semântica inteligente de cenas literárias (chuva, passos, portas, tensão) com auto-ducking estéreo.
                </p>
              </div>

              <button
                type="button"
                disabled={isAnalyzingSoundDesign || normalizedChapters.length === 0}
                onClick={() => handleAnalyzeSoundDesign(selectedTimelineChapter)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isAnalyzingSoundDesign ? 'wait' : 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                {isAnalyzingSoundDesign ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                <span>✨ Analisar Cenas & Gerar Sonorização</span>
              </button>
            </div>

            {/* Pílulas de seleção dos capítulos */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
              {normalizedChapters.map((ch, idx) => {
                const isSelected = selectedTimelineChapter === idx;
                const eventsCount = chapterTimelineEvents[idx]?.length || 0;
                const isMixed = Boolean(chapterMixedAudio[idx]);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedTimelineChapter(idx)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#1d4ed8' : '#334155',
                      fontSize: 12,
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span>{ch.title || `Capítulo ${idx + 1}`}</span>
                    {eventsCount > 0 && (
                      <span style={{
                        fontSize: 10,
                        backgroundColor: isSelected ? '#2563eb' : '#e2e8f0',
                        color: isSelected ? '#ffffff' : '#475569',
                        padding: '1px 6px',
                        borderRadius: 10,
                        fontWeight: 700
                      }}>
                        {eventsCount}
                      </span>
                    )}
                    {isMixed && <span title="Mixado com sucesso">🎵</span>}
                  </button>
                );
              })}
            </div>

            {/* Resumo da Análise Semântica */}
            {soundDesignSummary[selectedTimelineChapter] && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  gap: 16,
                  fontSize: 12,
                  color: '#475569',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <strong>Total detectado:</strong> {soundDesignSummary[selectedTimelineChapter].totalDetected} efeitos
                </div>
                <div>
                  <strong>Essenciais:</strong> <span style={{ color: '#b91c1c', fontWeight: 600 }}>{soundDesignSummary[selectedTimelineChapter].essentialCount}</span>
                </div>
                <div>
                  <strong>Recomendados:</strong> <span style={{ color: '#d97706', fontWeight: 600 }}>{soundDesignSummary[selectedTimelineChapter].recommendedCount}</span>
                </div>
                <div>
                  <strong>Ambiente:</strong> {soundDesignSummary[selectedTimelineChapter].ambientCount}
                </div>
                <div>
                  <strong>SFX:</strong> {soundDesignSummary[selectedTimelineChapter].sfxCount}
                </div>
              </div>
            )}
          </div>

          {/* Timeline Multi-track Interativa */}
          <AudioTimeline
            chapterDurationSeconds={
              statusData?.chapters?.find(c => c.index === selectedTimelineChapter)?.durationSeconds || 60
            }
            events={chapterTimelineEvents[selectedTimelineChapter] || []}
            onUpdateEvent={(updated) => {
              setChapterTimelineEvents(prev => ({
                ...prev,
                [selectedTimelineChapter]: (prev[selectedTimelineChapter] || []).map(e => e.id === updated.id ? updated : e)
              }));
            }}
            onDeleteEvent={(id) => {
              setChapterTimelineEvents(prev => ({
                ...prev,
                [selectedTimelineChapter]: (prev[selectedTimelineChapter] || []).filter(e => e.id !== id)
              }));
            }}
            onDuplicateEvent={(evt) => {
              const dup: SoundTimelineEvent = {
                ...evt,
                id: `${evt.id}_dup_${Date.now()}`,
                startTimeSeconds: Math.min(60, evt.startTimeSeconds + 3)
              };
              setChapterTimelineEvents(prev => ({
                ...prev,
                [selectedTimelineChapter]: [...(prev[selectedTimelineChapter] || []), dup]
              }));
            }}
            onAddEvent={(newEvent) => {
              setChapterTimelineEvents(prev => ({
                ...prev,
                [selectedTimelineChapter]: [...(prev[selectedTimelineChapter] || []), newEvent]
              }));
            }}
            currentTimeSeconds={currentTime}
          />

          {/* Painel de Mixagem e Masterização do Capítulo */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  Renderizar Mixagem do Capítulo com Auto-Ducking
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Gera a versão master multi-track atenuando a música e o ambiente em 80% durante as falas do narrador.
                </p>
              </div>

              <button
                type="button"
                disabled={isMixing || (chapterTimelineEvents[selectedTimelineChapter] || []).length === 0}
                onClick={() => handleMixChapter(selectedTimelineChapter)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: (chapterTimelineEvents[selectedTimelineChapter] || []).length === 0 ? '#cbd5e1' : '#059669',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: (chapterTimelineEvents[selectedTimelineChapter] || []).length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: (chapterTimelineEvents[selectedTimelineChapter] || []).length === 0 ? 'none' : '0 4px 10px rgba(5, 150, 105, 0.25)'
                }}
              >
                {isMixing ? <Loader2 size={18} className="animate-spin" /> : <Sliders size={18} />}
                <span>{isMixing ? 'Mixando Master...' : '🎚️ Renderizar Mixagem do Capítulo'}</span>
              </button>
            </div>

            {/* Barra de Progresso de Mixagem */}
            {isMixing && mixProgress && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  <span style={{ color: '#166534' }}>{mixProgress.status}</span>
                  <span style={{ color: '#15803d' }}>{mixProgress.percent}%</span>
                </div>
                <div style={{ width: '100%', height: 8, borderRadius: 999, backgroundColor: '#dcfce7', overflow: 'hidden' }}>
                  <div style={{ width: `${mixProgress.percent}%`, height: '100%', backgroundColor: '#16a34a', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}

            {/* Card do Master Mixado Pronto */}
            {chapterMixedAudio[selectedTimelineChapter] && (
              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 10,
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🎵</span>
                  <div>
                    <h5 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#065f46' }}>
                      Master Mixado do Capítulo Pronto!
                    </h5>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#047857' }}>
                      Duração: {formatTime(chapterMixedAudio[selectedTimelineChapter].duration)} • Faixas: Voz + Ambiente + SFX
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <audio controls src={chapterMixedAudio[selectedTimelineChapter].url} style={{ height: 38 }} />
                  <a
                    href={chapterMixedAudio[selectedTimelineChapter].url}
                    download={`master_capitulo_${selectedTimelineChapter + 1}.wav`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <Download size={14} /> Baixar Master (.WAV)
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* ABA 3: PLAYER & MASTERIZAÇÃO COMPLETA */}
      {/* ================================================================ */}
      {activeTab === 'player' && (
        <div>
          {!isCompleted ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: 36,
                textAlign: 'center'
              }}
            >
              <Headphones size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
                O audiobook ainda não foi finalizado
              </h3>
              <p style={{ margin: '6px 0 20px', fontSize: 13, color: '#64748b' }}>
                Gere a narração na aba 1 ou edite os efeitos na aba 2 para poder escutar no player.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('narration')}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 22px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Ir para 1. Narração & Vozes
              </button>
            </div>
          ) : (
            statusData && (
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
              src={
                playMixedAudio && chapterMixedAudio[activeChapterIndex]
                  ? chapterMixedAudio[activeChapterIndex].url
                  : AudiobookClient.getFinalAudioUrl(resolvedProjectId)
              }
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    {initialTitle || 'Audiobook Completo'}
                  </h4>
                  {chapterMixedAudio[activeChapterIndex] && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', padding: '2px 4px', borderRadius: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setPlayMixedAudio(false);
                          if (audioRef.current) {
                            audioRef.current.pause();
                            setIsPlaying(false);
                          }
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: !playMixedAudio ? 700 : 500,
                          backgroundColor: !playMixedAudio ? '#2563eb' : 'transparent',
                          color: !playMixedAudio ? '#ffffff' : '#64748b',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Voz Pura
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPlayMixedAudio(true);
                          if (audioRef.current) {
                            audioRef.current.pause();
                            setIsPlaying(false);
                          }
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: playMixedAudio ? 700 : 500,
                          backgroundColor: playMixedAudio ? '#059669' : 'transparent',
                          color: playMixedAudio ? '#ffffff' : '#64748b',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        🎵 Master Mixado
                      </button>
                    </div>
                  )}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Tocando:{' '}
                  <strong>
                    {statusData.chapters.find((c) => c.index === activeChapterIndex)?.label || 'Introdução'}
                  </strong>
                  {playMixedAudio && chapterMixedAudio[activeChapterIndex] && (
                    <span style={{ color: '#059669', marginLeft: 6, fontWeight: 600 }}>• Trilha Mixada com Auto-Ducking</span>
                  )}
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
            )
          )}
        </div>
      )}
    </div>
  );
};
