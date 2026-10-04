// ================================================================
// AUDIOBOOK STUDIO — ESTÚDIO PROFISSIONAL DE PRODUÇÃO DE AUDIOBOOKS
// Book Intel KDP — Motor Kokoro TTS & Smart Sound Design Cinematográfico
// ================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones, Sparkles, Play, Pause, CheckCircle2,
  AlertTriangle, Download, RefreshCw, FileText, Settings,
  ShieldCheck, Mic, ChevronRight, Eye, Edit3, X, Check,
  Volume2, FastForward, RotateCcw, RotateCw, Wand2, Music,
  Sliders, Layers, Radio, ExternalLink
} from 'lucide-react';
import {
  AudiobookChapterItem,
  AudiobookConfig,
  DistributionPlatformId,
  AudiobookAuditReport
} from '../../../types/publishing-audiobook';
import {
  NarrationSpeed,
  NarrationStyleMode,
  NarratorVoice,
  SoundTimelineEvent
} from '../../../types/audiobook-studio';
import {
  kokoroVoiceEngine,
  KOKORO_NARRATOR_VOICES
} from '../../../services/audiobook/voice-engine';
import {
  analyzeChapterSoundDesign,
  SmartSoundDesignResult
} from '../../../services/audiobook/smart-sound-design';
import {
  mixChapterAudio,
  concatenateCompleteAudiobook
} from '../../../services/audiobook/audio-mixer';
import {
  auditAudiobook,
  buildPublicationPackageZip,
  generateNotebookLmPackage
} from '../../../services/audiobook-service';
import { AudioTimeline } from './AudioTimeline';

interface AudiobookStudioProps {
  initialTitle?: string;
  initialSubtitle?: string;
  initialAuthor?: string;
  initialChapters?: Array<{ titulo: string; texto: string }>;
  capaUrl?: string | null;
  onBack?: () => void;
  onAudiobookReady?: (report: AudiobookAuditReport) => void;
}

export const AudiobookStudio: React.FC<AudiobookStudioProps> = ({
  initialTitle = '',
  initialSubtitle = '',
  initialAuthor = 'Autor Book Intel',
  initialChapters = [],
  capaUrl = null,
  onBack,
  onAudiobookReady
}) => {
  // 1. CONFIGURAÇÕES DA OBRA & MOTOR DE VOZ KOKORO
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(KOKORO_NARRATOR_VOICES[0].id);
  const [speed, setSpeed] = useState<NarrationSpeed>(1.0);
  const [styleMode, setStyleMode] = useState<NarrationStyleMode>('natural');
  const [pauseMode, setPauseMode] = useState<'automaticas' | 'personalizadas'>('automaticas');
  const [paragraphPauseMs, setParagraphPauseMs] = useState(650);
  const [sentencePauseMs, setSentencePauseMs] = useState(350);

  // 2. CAPÍTULOS EXTRAÍDOS DO PROJETO ATUAL
  const [chapters, setChapters] = useState<AudiobookChapterItem[]>([]);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);

  // 3. ESTADOS DE PROCESSAMENTO
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isAnalyzingSfx, setIsAnalyzingSfx] = useState(false);
  const [isMixingAudio, setIsMixingAudio] = useState(false);
  const [isGeneratingFullBook, setIsGeneratingFullBook] = useState(false);
  const [fullBookUrl, setFullBookUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  // 4. PREVIEW DUAL-MODE (VOZ PURA vs CINEMATOGRÁFICO COM EFEITOS)
  const [previewMode, setPreviewMode] = useState<'mixed' | 'voice-only'>('mixed');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [samplePlayingVoiceId, setSamplePlayingVoiceId] = useState<string | null>(null);

  // 5. EDIÇÃO DE TEXTO DO CAPÍTULO
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // 6. MODAL DO NOTEBOOKLM E EXPORTAÇÃO
  const [isNotebookLmModalOpen, setIsNotebookLmModalOpen] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  // Elementos de áudio nativos
  const playerAudioRef = useRef<HTMLAudioElement | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sincroniza capítulos a partir das props da obra ATUAL (Garante que nunca venham dados de outro projeto)
  useEffect(() => {
    if (initialChapters && initialChapters.length > 0) {
      const items: AudiobookChapterItem[] = initialChapters.map((c, i) => {
        const words = c.texto ? c.texto.trim().split(/\s+/).length : 0;
        const durationSeconds = Math.max(30, Math.round(words / (2.25 * speed)));

        return {
          id: `chap_audio_${i}_${Date.now()}`,
          chapterIndex: i,
          title: c.titulo || `Capítulo ${i + 1}`,
          textSnippet: c.texto ? c.texto.slice(0, 160) + '...' : '',
          fullText: c.texto || '',
          status: 'pendente',
          durationSeconds,
          wordCount: words,
          isStale: false,
          timelineEvents: []
        };
      });
      setChapters(items);
      setSelectedChapterIndex(0);
    } else {
      setChapters([
        {
          id: 'chap_audio_0',
          chapterIndex: 0,
          title: '01 — Introdução & Abertura',
          textSnippet: 'Uma forte chuva batia contra as janelas da casa...',
          fullText: 'Uma forte chuva batia contra as janelas. Maria caminhou lentamente pelo corredor. Então a porta se abriu com um rangido inesperado, quebrando o silêncio da noite.',
          status: 'pendente',
          durationSeconds: 45,
          wordCount: 29,
          isStale: false,
          timelineEvents: []
        }
      ]);
    }
  }, [initialChapters]);

  const currentChapter = chapters[selectedChapterIndex] || chapters[0];
  const activeVoice = KOKORO_NARRATOR_VOICES.find(v => v.id === selectedVoiceId) || KOKORO_NARRATOR_VOICES[0];

  // Cálculo dos totais da obra atual
  const totalBookWords = chapters.reduce((acc, c) => acc + c.wordCount, 0);
  const totalBookDurationSeconds = chapters.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
  const completedChaptersCount = chapters.filter(c => c.status === 'pronto').length;
  const overallProgressPercent = chapters.length > 0
    ? Math.round((completedChaptersCount / chapters.length) * 100)
    : 0;

  // Auditoria do Audiobook
  const audiobookConfig: AudiobookConfig = {
    title: initialTitle || 'Livro Sem Título',
    subtitle: initialSubtitle || '',
    author: initialAuthor || 'Autor Book Intel',
    narrator: activeVoice.name,
    language: 'Português — Brasil',
    type: 'ai-narrated',
    method: 'ai-tts',
    pitch: activeVoice.previewPitch || 1.0,
    rate: speed,
    volume: 1.0
  };
  const auditReport = auditAudiobook(audiobookConfig, chapters, capaUrl);

  useEffect(() => {
    if (onAudiobookReady) {
      onAudiobookReady(auditReport);
    }
  }, [auditReport.isReady, completedChaptersCount]);

  // Player de Áudio Principal (acompanha posição de reprodução)
  useEffect(() => {
    const audioEl = playerAudioRef.current;
    if (!audioEl) return;

    const handleTimeUpdate = () => {
      setPlaybackCurrentTime(audioEl.currentTime);
    };

    const handleEnded = () => {
      setIsPlayingPreview(false);
      setPlaybackCurrentTime(0);
    };

    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('ended', handleEnded);

    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Troca de fonte do player ao alternar entre "Voz pura" e "Mixagem com efeitos"
  useEffect(() => {
    if (!currentChapter) return;
    const targetUrl = previewMode === 'voice-only'
      ? (currentChapter.voiceBlobUrl || currentChapter.audioBlobUrl)
      : (currentChapter.mixedBlobUrl || currentChapter.voiceBlobUrl || currentChapter.audioBlobUrl);

    if (playerAudioRef.current && targetUrl) {
      const wasPlaying = isPlayingPreview;
      playerAudioRef.current.src = targetUrl;
      if (wasPlaying) {
        playerAudioRef.current.play().catch(() => {});
      }
    }
  }, [previewMode, currentChapter?.voiceBlobUrl, currentChapter?.mixedBlobUrl]);

  // ================================================================
  // AÇÕES DO MOTOR KOKORO TTS & FLUXO POR CAPÍTULO
  // ================================================================

  // 1. Tocar amostra de voz
  const handlePlayVoiceSample = async (voice: NarratorVoice) => {
    if (samplePlayingVoiceId === voice.id) {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
      }
      setSamplePlayingVoiceId(null);
      return;
    }

    try {
      setSamplePlayingVoiceId(voice.id);
      setStatusMessage(`🎙️ Carregando amostra de voz de ${voice.name}...`);
      
      const result = await kokoroVoiceEngine.generateVoice({
        text: voice.sampleText,
        voiceId: voice.id,
        language: voice.language,
        speed: 1.0,
        styleMode: 'natural'
      });

      if (sampleAudioRef.current) {
        sampleAudioRef.current.src = result.audioUrl;
        sampleAudioRef.current.play();
        sampleAudioRef.current.onended = () => {
          setSamplePlayingVoiceId(null);
        };
      }
      setStatusMessage(null);
    } catch (err: any) {
      setStatusMessage(`Erro ao reproduzir amostra: ${err.message}`);
      setSamplePlayingVoiceId(null);
    }
  };

  // 2. Gerar Áudio da Voz do Capítulo Individual (Kokoro TTS)
  const handleGenerateChapterVoice = async (index: number) => {
    const target = chapters[index];
    if (!target) return;

    setIsGeneratingVoice(true);
    setProcessingProgress(15);
    setStatusMessage(`🎙️ Kokoro TTS: Sintetizando voz do Capítulo ${index + 1}...`);

    try {
      const result = await kokoroVoiceEngine.generateVoice({
        text: target.fullText || target.textSnippet || target.title,
        voiceId: selectedVoiceId,
        language: 'Português — Brasil',
        speed,
        styleMode,
        onProgress: (pct) => setProcessingProgress(pct)
      });

      // Atualiza o capítulo com o áudio da voz gerado
      setChapters(prev => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          voiceBlob: result.audioBlob,
          voiceBlobUrl: result.audioUrl,
          audioBlobUrl: result.audioUrl, // Fallback retrocompatível
          durationSeconds: result.durationSeconds,
          status: 'pronto',
          isStale: false,
          lastGeneratedAt: Date.now()
        };
        return next;
      });

      setStatusMessage(`✓ Voz do Capítulo ${index + 1} gerada com sucesso via ${result.engineName}!`);
    } catch (err: any) {
      setStatusMessage(`Erro na síntese da voz: ${err.message}`);
    } finally {
      setIsGeneratingVoice(false);
      setProcessingProgress(0);
    }
  };

  // 3. Smart Sound Design: Análise Semântica de Cenas Literárias
  const handleAnalyzeChapterSoundDesign = (index: number) => {
    const target = chapters[index];
    if (!target) return;

    setIsAnalyzingSfx(true);
    setStatusMessage(`🎬 Analisando texto do Capítulo ${index + 1} para identificar eventos sonoros contextuais...`);

    setTimeout(() => {
      try {
        const analysis = analyzeChapterSoundDesign(target.fullText, speed);

        setChapters(prev => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            timelineEvents: analysis.detectedEvents,
            soundDesignAnalyzed: true
          };
          return next;
        });

        setStatusMessage(
          `✓ Smart Sound Design: ${analysis.summary.totalDetected} eventos detectados (${analysis.summary.essentialCount} essenciais, ${analysis.summary.recommendedCount} recomendados).`
        );
      } catch (err: any) {
        setStatusMessage(`Erro na análise de som: ${err.message}`);
      } finally {
        setIsAnalyzingSfx(false);
      }
    }, 400);
  };

  // 4. Mixagem Automática com Auto-Ducking
  const handleMixChapter = async (index: number) => {
    const target = chapters[index];
    if (!target) return;

    if (!target.voiceBlob && !target.voiceBlobUrl && !target.audioBlobUrl) {
      setStatusMessage('⚠️ Gere primeiro a narração da voz do capítulo antes de mixar.');
      return;
    }

    setIsMixingAudio(true);
    setStatusMessage(`⚡ Mixando multi-track do Capítulo ${index + 1} com auto-ducking e normalização...`);

    try {
      // Se não temos o blob em memória, buscamos da URL
      let vBlob = target.voiceBlob;
      if (!vBlob) {
        const url = target.voiceBlobUrl || target.audioBlobUrl!;
        const res = await fetch(url);
        vBlob = await res.blob();
      }

      const events = target.timelineEvents || [];
      const mixResult = await mixChapterAudio(vBlob, events, (pct, msg) => {
        setProcessingProgress(pct);
        setStatusMessage(msg);
      });

      setChapters(prev => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          mixedBlob: mixResult.mixedBlob,
          mixedBlobUrl: mixResult.mixedUrl,
          audioBlobUrl: mixResult.mixedUrl, // URL principal de reprodução
          durationSeconds: mixResult.durationSeconds,
          status: 'pronto',
          isStale: false
        };
        return next;
      });

      setPreviewMode('mixed');
      setStatusMessage(`✓ Mixagem do Capítulo ${index + 1} concluída com sucesso!`);
    } catch (err: any) {
      setStatusMessage(`Erro na mixagem: ${err.message}`);
    } finally {
      setIsMixingAudio(false);
      setProcessingProgress(0);
    }
  };

  // 5. Gerar Audiobook Completo (Masterização & Concatenação)
  const handleGenerateCompleteAudiobook = async () => {
    const readyChapters = chapters.filter(c => Boolean(c.mixedBlob || c.voiceBlob || c.audioBlobUrl));
    if (readyChapters.length === 0) {
      setStatusMessage('⚠️ Nenhum capítulo possui áudio pronto para compilar o audiobook.');
      return;
    }

    setIsGeneratingFullBook(true);
    setStatusMessage('🎧 Masterizando compilação completa do audiobook...');

    try {
      const blobs: Blob[] = [];
      for (const chap of readyChapters) {
        if (chap.mixedBlob) {
          blobs.push(chap.mixedBlob);
        } else if (chap.voiceBlob) {
          blobs.push(chap.voiceBlob);
        } else {
          const res = await fetch(chap.audioBlobUrl!);
          blobs.push(await res.blob());
        }
      }

      const master = await concatenateCompleteAudiobook(blobs, (pct, msg) => {
        setProcessingProgress(pct);
        setStatusMessage(msg);
      });

      setFullBookUrl(master.mixedUrl);
      setStatusMessage(`✓ Audiobook Completo gerado com sucesso! (${Math.round(master.durationSeconds / 60)} minutos de duração total)`);

      // Dispara o download automático do Audiobook Completo
      const a = document.createElement('a');
      a.href = master.mixedUrl;
      a.download = `Audiobook_Completo_${(initialTitle || 'livro').replace(/[^a-z0-9]/gi, '_')}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setStatusMessage(`Erro na masterização completa: ${err.message}`);
    } finally {
      setIsGeneratingFullBook(false);
      setProcessingProgress(0);
    }
  };

  // 6. Download individual de capítulo
  const handleDownloadChapter = (index: number) => {
    const chap = chapters[index];
    const url = chap?.mixedBlobUrl || chap?.voiceBlobUrl || chap?.audioBlobUrl;
    if (!url) {
      setStatusMessage('⚠️ Este capítulo ainda não possui áudio gerado.');
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `Capitulo_${String(index + 1).padStart(2, '0')}_${chap.title.replace(/[^a-z0-9]/gi, '_')}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 7. Salvar edição de texto
  const handleSaveChapterText = (index: number) => {
    setChapters(prev => {
      const next = [...prev];
      const target = next[index];
      if (target) {
        const words = editingText.trim().split(/\s+/).length;
        next[index] = {
          ...target,
          fullText: editingText,
          textSnippet: editingText.slice(0, 160) + '...',
          wordCount: words,
          durationSeconds: Math.max(30, Math.round(words / (2.25 * speed))),
          status: target.voiceBlobUrl ? 'alterado' : 'pendente',
          isStale: Boolean(target.voiceBlobUrl)
        };
      }
      return next;
    });

    setEditingChapterId(null);
    setStatusMessage(`⚠️ Texto do Capítulo ${index + 1} atualizado. Clique em "Gerar Áudio" para atualizar a narração.`);
  };

  // Exportação do Pacote Multiplataforma (.ZIP)
  const handleExportPublicationPackage = async () => {
    setIsExportingZip(true);
    setStatusMessage('📦 Compilando pacote oficial de publicação...');
    try {
      const zipBlob = await buildPublicationPackageZip(
        audiobookConfig,
        chapters,
        ['spotify', 'audible', 'apple', 'google', 'kobo'],
        capaUrl
      );
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AUDIOBOOK-${(initialTitle || 'livro').toLowerCase().replace(/[^a-z0-9]/g, '-')}-PACOTE.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('✓ Pacote de distribuição baixado com sucesso!');
    } catch (err: any) {
      setStatusMessage(`Erro na exportação: ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Atualização dos eventos da Timeline pelo editor
  const handleUpdateTimelineEvent = (updated: SoundTimelineEvent) => {
    setChapters(prev => {
      const next = [...prev];
      const current = next[selectedChapterIndex];
      if (!current) return prev;
      const updatedEvents = (current.timelineEvents || []).map(e => e.id === updated.id ? updated : e);
      next[selectedChapterIndex] = {
        ...current,
        timelineEvents: updatedEvents,
        isStale: Boolean(current.mixedBlobUrl) // Precisa remixar se alterou os efeitos
      };
      return next;
    });
  };

  const handleDeleteTimelineEvent = (eventId: string) => {
    setChapters(prev => {
      const next = [...prev];
      const current = next[selectedChapterIndex];
      if (!current) return prev;
      next[selectedChapterIndex] = {
        ...current,
        timelineEvents: (current.timelineEvents || []).filter(e => e.id !== eventId),
        isStale: Boolean(current.mixedBlobUrl)
      };
      return next;
    });
  };

  const handleDuplicateTimelineEvent = (event: SoundTimelineEvent) => {
    const duplicated: SoundTimelineEvent = {
      ...event,
      id: `evt_dup_${Date.now()}`,
      startTimeSeconds: Math.min(currentChapter.durationSeconds - 2, event.startTimeSeconds + 3)
    };
    handleAddTimelineEvent(duplicated);
  };

  const handleAddTimelineEvent = (newEvent: SoundTimelineEvent) => {
    setChapters(prev => {
      const next = [...prev];
      const current = next[selectedChapterIndex];
      if (!current) return prev;
      next[selectedChapterIndex] = {
        ...current,
        timelineEvents: [...(current.timelineEvents || []), newEvent],
        isStale: Boolean(current.mixedBlobUrl)
      };
      return next;
    });
  };

  // Toggle do player preview
  const handleTogglePlayPreview = () => {
    const audioEl = playerAudioRef.current;
    if (!audioEl) return;

    if (isPlayingPreview) {
      audioEl.pause();
      setIsPlayingPreview(false);
    } else {
      audioEl.play().then(() => {
        setIsPlayingPreview(true);
      }).catch(err => {
        setStatusMessage(`Falha ao tocar áudio: ${err.message}`);
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Elemento de áudio invisível para amostras de vozes */}
      <audio ref={sampleAudioRef} style={{ display: 'none' }} />
      {/* Elemento de áudio invisível para reprodução principal */}
      <audio ref={playerAudioRef} style={{ display: 'none' }} />

      {/* ================================================================ */}
      {/* 1. BANNER: PROJETO ATUAL (LIVRO PRODUZIDO) */}
      {/* ================================================================ */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Headphones size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '2px 8px',
                  borderRadius: 12,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  PROJETO ATUAL
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Motor: Kokoro TTS (Open Source Neural)
                </span>
              </div>
              <h2 style={{ margin: '4px 0 2px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                {initialTitle || 'Livro em Produção'}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Por <b>{initialAuthor || 'Autor Book Intel'}</b>
                {initialSubtitle ? ` • ${initialSubtitle}` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                Voltar à Edição
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerateCompleteAudiobook}
              disabled={isGeneratingFullBook}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: isGeneratingFullBook ? 'wait' : 'pointer',
                boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
              }}
            >
              <Headphones size={15} />
              {isGeneratingFullBook ? 'Masterizando...' : '🎧 GERAR AUDIOBOOK COMPLETO'}
            </button>
          </div>
        </div>

        {/* METAS E ESTATÍSTICAS DA PRODUÇÃO */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12,
          padding: 12,
          background: '#f8fafc',
          borderRadius: 8,
          border: '1px solid #f1f5f9'
        }}>
          <div>
            <span style={{ fontSize: 11, color: '#64748b' }}>Capítulos da Obra</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {chapters.length} capítulos
            </div>
          </div>

          <div>
            <span style={{ fontSize: 11, color: '#64748b' }}>Total de Palavras</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {totalBookWords.toLocaleString('pt-BR')} palavras
            </div>
          </div>

          <div>
            <span style={{ fontSize: 11, color: '#64748b' }}>Tempo Estimado</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb' }}>
              ~{Math.max(1, Math.round(totalBookDurationSeconds / 60))} min
            </div>
          </div>

          <div>
            <span style={{ fontSize: 11, color: '#64748b' }}>Status da Produção</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: completedChaptersCount === chapters.length ? '#10b981' : '#f59e0b' }}>
              {completedChaptersCount} de {chapters.length} prontos ({overallProgressPercent}%)
            </div>
          </div>
        </div>

        {/* BARRA DE PROGRESSO GLOBAL */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
            <span>PROGRESSO DO AUDIOBOOK: CAPÍTULO {completedChaptersCount} / {chapters.length}</span>
            <span>{overallProgressPercent}% CONCLUÍDO</span>
          </div>
          <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${overallProgressPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #10b981)',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      </div>

      {/* MENSAGEM DE STATUS EM DESTAQUE */}
      {statusMessage && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#1e40af',
          fontSize: 13
        }}>
          <Sparkles size={16} />
          <span style={{ flex: 1 }}>{statusMessage}</span>
          {processingProgress > 0 && (
            <span style={{ fontWeight: 700 }}>{processingProgress}%</span>
          )}
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* 2. ESCOLHA DA VOZ (🎙️ VOZ DO NARRADOR) */}
      {/* ================================================================ */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              🎙️ VOZ DO NARRADOR (10 Perfis Neuris Kokoro)
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Selecione o timbre ideal para a atmosfera literária da sua obra. Cada perfil possui prosódia customizada.
            </p>
          </div>
          <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
            Voz Ativa: {activeVoice.name}
          </span>
        </div>

        {/* GRID DOS 10 CARDS DE VOZES */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12
        }}>
          {KOKORO_NARRATOR_VOICES.map(voice => {
            const isSelected = selectedVoiceId === voice.id;
            const isPlayingSample = samplePlayingVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                style={{
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 14,
                  background: isSelected ? '#f0f7ff' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 10,
                  boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.1)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: voice.gender === 'masculino' ? '#dbeafe' : '#fce7f3',
                      color: voice.gender === 'masculino' ? '#1e40af' : '#9d174d'
                    }}>
                      {voice.gender} • {voice.style}
                    </span>
                    {isSelected && (
                      <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Check size={13} /> Ativa
                      </span>
                    )}
                  </div>

                  <h4 style={{ margin: '4px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    {voice.name}
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.35 }}>
                    {voice.description}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => handlePlayVoiceSample(voice)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      background: isPlayingSample ? '#ef4444' : '#f1f5f9',
                      color: isPlayingSample ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '6px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isPlayingSample ? <Pause size={12} /> : <Play size={12} />}
                    {isPlayingSample ? 'Pausar' : '▶ Ouvir amostra'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVoiceId(voice.id);
                      setStatusMessage(`Voz "${voice.name}" definida como narrador oficial.`);
                    }}
                    style={{
                      flex: 1,
                      background: isSelected ? '#2563eb' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#2563eb',
                      border: isSelected ? 'none' : '1px solid #2563eb',
                      borderRadius: 6,
                      padding: '6px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isSelected ? '✓ Selecionada' : 'Selecionar voz'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 3. CONFIGURAÇÕES DA NARRAÇÃO */}
      {/* ================================================================ */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: '18px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Settings size={16} /> CONFIGURAÇÕES DA NARRAÇÃO
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {/* VELOCIDADE */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              Velocidade da Narração
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {([0.8, 0.9, 1.0, 1.1, 1.2] as NarrationSpeed[]).map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSpeed(val)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    border: speed === val ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    borderRadius: 6,
                    background: speed === val ? '#2563eb' : '#f8fafc',
                    color: speed === val ? '#ffffff' : '#334155',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {val.toFixed(1)}x
                </button>
              ))}
            </div>
          </div>

          {/* PAUSAS */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              Pausas entre Parágrafos & Pontuação
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setPauseMode('automaticas')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  border: pauseMode === 'automaticas' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: 6,
                  background: pauseMode === 'automaticas' ? '#2563eb' : '#f8fafc',
                  color: pauseMode === 'automaticas' ? '#ffffff' : '#334155',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Automáticas
              </button>
              <button
                type="button"
                onClick={() => setPauseMode('personalizadas')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  border: pauseMode === 'personalizadas' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: 6,
                  background: pauseMode === 'personalizadas' ? '#2563eb' : '#f8fafc',
                  color: pauseMode === 'personalizadas' ? '#ffffff' : '#334155',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Personalizadas
              </button>
            </div>
            {pauseMode === 'personalizadas' && (
              <div style={{ marginTop: 8, display: 'flex', gap: 10, fontSize: 11, color: '#64748b' }}>
                <span>Pausa parágrafo: {paragraphPauseMs}ms</span>
                <span>Pausa frase: {sentencePauseMs}ms</span>
              </div>
            )}
          </div>

          {/* ESTILO NARRATIVO */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              Estilo Narrativo
            </label>
            <select
              value={styleMode}
              onChange={(e) => setStyleMode(e.target.value as NarrationStyleMode)}
              style={{
                width: '100%',
                padding: '7px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 13,
                color: '#1e293b',
                background: '#ffffff'
              }}
            >
              <option value="natural">Natural (Fluidez Neutra)</option>
              <option value="cinematografico">Cinematográfico (Imersivo & Envolvente)</option>
              <option value="suspense">Suspense (Tensão & Pausas Calculadas)</option>
              <option value="dramatico">Dramático (Expressão Enérgica)</option>
              <option value="documental">Documental (Precisão & Autoridade)</option>
              <option value="calmo">Calmo (Voz Suave & Terapêutica)</option>
              <option value="emocional">Emocional (Sensibilidade & Afeto)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 4. GERAÇÃO POR CAPÍTULO & NAVEGAÇÃO */}
      {/* ================================================================ */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              PRODUÇÃO CAPÍTULO POR CAPÍTULO
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Trabalhe cada capítulo individualmente para calibrar a voz, eventos sonoros e mixagem.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => handleGenerateChapterVoice(selectedChapterIndex)}
              disabled={isGeneratingVoice}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: isGeneratingVoice ? 'wait' : 'pointer'
              }}
            >
              <Mic size={14} />
              {isGeneratingVoice ? 'Gerando Narração...' : '🎙️ Gerar Voz do Capítulo'}
            </button>

            <button
              type="button"
              onClick={() => handleAnalyzeChapterSoundDesign(selectedChapterIndex)}
              disabled={isAnalyzingSfx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#7c3aed',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: isAnalyzingSfx ? 'wait' : 'pointer'
              }}
            >
              <Sparkles size={14} />
              {isAnalyzingSfx ? 'Analisando...' : '🎬 SMART SOUND DESIGN'}
            </button>

            <button
              type="button"
              onClick={() => handleMixChapter(selectedChapterIndex)}
              disabled={isMixingAudio}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: isMixingAudio ? 'wait' : 'pointer'
              }}
            >
              <Layers size={14} />
              {isMixingAudio ? 'Mixando...' : '⚡ Mixar Trilha'}
            </button>
          </div>
        </div>

        {/* SELETOR DE CAPÍTULOS HORIZONTAL COM BADGES DE STATUS */}
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 6
        }}>
          {chapters.map((chap, idx) => {
            const isCurrent = idx === selectedChapterIndex;
            const isReady = Boolean(chap.mixedBlobUrl || chap.voiceBlobUrl || chap.audioBlobUrl);

            return (
              <button
                key={chap.id || idx}
                type="button"
                onClick={() => setSelectedChapterIndex(idx)}
                style={{
                  minWidth: 160,
                  textAlign: 'left',
                  border: isCurrent ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  background: isCurrent ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? '#2563eb' : '#64748b' }}>
                    CAP. {String(idx + 1).padStart(2, '0')}
                  </span>
                  {isReady ? (
                    <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>✓ Pronto</span>
                  ) : (
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>Pendente</span>
                  )}
                </div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1e293b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {chap.title}
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  {chap.wordCount} palavras • ~{Math.round(chap.durationSeconds)}s
                </div>
              </button>
            );
          })}
        </div>

        {/* TEXTO DO CAPÍTULO ATUAL E EDITOR */}
        <div style={{
          background: '#f8fafc',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          padding: 14
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
              Texto do Capítulo Selecionado ({currentChapter.wordCount} palavras)
            </span>
            {editingChapterId === currentChapter.id ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handleSaveChapterText(selectedChapterIndex)}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Salvar Alteração
                </button>
                <button
                  type="button"
                  onClick={() => setEditingChapterId(null)}
                  style={{
                    background: '#cbd5e1',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingChapterId(currentChapter.id);
                  setEditingText(currentChapter.fullText);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={12} /> Editar Texto
              </button>
            )}
          </div>

          {editingChapterId === currentChapter.id ? (
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              rows={5}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 13,
                fontFamily: 'inherit',
                lineHeight: 1.5
              }}
            />
          ) : (
            <p style={{
              margin: 0,
              fontSize: 13,
              color: '#334155',
              lineHeight: 1.6,
              maxHeight: 110,
              overflowY: 'auto'
            }}>
              {currentChapter.fullText || currentChapter.textSnippet || 'Nenhum texto associado a este capítulo.'}
            </p>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 5. TIMELINE VISUAL DE ÁUDIO (MULTI-TRACK COM SMART SOUND DESIGN) */}
      {/* ================================================================ */}
      <AudioTimeline
        chapterDurationSeconds={currentChapter.durationSeconds || 60}
        events={currentChapter.timelineEvents || []}
        onUpdateEvent={handleUpdateTimelineEvent}
        onDeleteEvent={handleDeleteTimelineEvent}
        onDuplicateEvent={handleDuplicateTimelineEvent}
        onAddEvent={handleAddTimelineEvent}
        currentTimeSeconds={playbackCurrentTime}
      />

      {/* ================================================================ */}
      {/* 6. DUAL PREVIEW PLAYER (VOZ PURA vs CINEMATOGRÁFICO) */}
      {/* ================================================================ */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: '18px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              PREVIEW & COMPARAÇÃO EM TEMPO REAL
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Compare a narração da voz pura com a versão cinematográfica sonorizada com auto-ducking.
            </p>
          </div>

          {/* CHAVE SELETORA DUAL-MODE */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: 3,
            borderRadius: 8,
            border: '1px solid #cbd5e1'
          }}>
            <button
              type="button"
              onClick={() => setPreviewMode('voice-only')}
              style={{
                border: 'none',
                background: previewMode === 'voice-only' ? '#ffffff' : 'transparent',
                color: previewMode === 'voice-only' ? '#2563eb' : '#64748b',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: previewMode === 'voice-only' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              🎙️ Ouvir somente voz
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('mixed')}
              style={{
                border: 'none',
                background: previewMode === 'mixed' ? '#ffffff' : 'transparent',
                color: previewMode === 'mixed' ? '#059669' : '#64748b',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: previewMode === 'mixed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              🎬 Ouvir voz + efeitos (Cinematográfico)
            </button>
          </div>
        </div>

        {/* CONTROLES DO PLAYER */}
        <div style={{
          background: '#0f172a',
          borderRadius: 8,
          padding: 14,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <button
            type="button"
            onClick={handleTogglePlayPreview}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#2563eb',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {isPlayingPreview ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
          </button>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
              <span>
                {currentChapter.title} • {previewMode === 'mixed' ? 'Mixagem Cinematográfica' : 'Voz Pura Kokoro'}
              </span>
              <span>
                {Math.floor(playbackCurrentTime / 60)}:{String(Math.floor(playbackCurrentTime % 60)).padStart(2, '0')} / {Math.floor((currentChapter.durationSeconds || 60) / 60)}:{String(Math.floor((currentChapter.durationSeconds || 60) % 60)).padStart(2, '0')}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={currentChapter.durationSeconds || 60}
              step="0.5"
              value={playbackCurrentTime}
              onChange={(e) => {
                const newT = parseFloat(e.target.value);
                setPlaybackCurrentTime(newT);
                if (playerAudioRef.current) {
                  playerAudioRef.current.currentTime = newT;
                }
              }}
              style={{ width: '100%', accentColor: '#2563eb' }}
            />
          </div>

          <button
            type="button"
            onClick={() => handleDownloadChapter(selectedChapterIndex)}
            title="Baixar MP3 deste capítulo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <Download size={13} /> Baixar Capítulo
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 7. PAINEL DE EXPORTAÇÃO E INTEGRAÇÕES MULTIPLATAFORMA */}
      {/* ================================================================ */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: '18px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
            Distribuição Multiplataforma (Spotify, Audible, Apple Books)
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
            Auditoria técnica ACX e pacote oficial para publicação mundial.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setIsNotebookLmModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <ExternalLink size={14} /> Pacote NotebookLM
          </button>

          <button
            type="button"
            onClick={handleExportPublicationPackage}
            disabled={isExportingZip}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: isExportingZip ? 'wait' : 'pointer'
            }}
          >
            <Download size={14} />
            {isExportingZip ? 'Exportando ZIP...' : 'Exportar Pacote (.ZIP)'}
          </button>
        </div>
      </div>

      {/* MODAL NOTEBOOKLM PRESERVADO */}
      {isNotebookLmModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            maxWidth: 580,
            width: '100%',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              Guia de Narração com Google NotebookLM
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Você também pode exportar os capítulos formatados para o Google NotebookLM e usar a ferramenta Audio Overview para podcasts e análises complementares da sua obra.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsNotebookLmModalOpen(false)}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
