import React, { useState, useEffect, useRef } from 'react';
import {
  X, Play, Pause, Download, Sparkles, RefreshCw, Volume2,
  Film, ChevronRight, CheckCircle2, Clock, Wand2,
  Users, Image as ImageIcon, Music, Plus, Trash2, Edit3, ChevronLeft
} from 'lucide-react';
import {
  TikTokStoryVideoService,
  type TikTokScene,
  type TikTokSceneImage,
  type TikTokVoiceOption,
  AVAILABLE_TIKTOK_VOICES
} from '../../../services/tiktok-story-video-service';
import { coAuthorVoiceService, type VoiceGender } from '../../../services/coauthor-voice-service';
import { BookEnginAnimatedBook } from '../../common/BookEnginAnimatedBook';
import {
  cinematicAudioDirector,
  analyzeSceneAcoustics,
  type SceneAcousticProfile
} from '../../../services/cinematic-audio-director';
import {
  CinematicTransitionsEngine,
  type CinematicTransitionStyle
} from '../../../services/cinematic-transitions-engine';
import {
  GoogleImageStudioService,
  type VisualContinuityBible,
  type VisualImageEngine
} from '../../../services/google-image-studio-service';
import { VideoDirectorAgent, type ProductionPlan } from '../../../services/agents/video-director-agent';
import { SpecialEffectsAgent, type VisualEffectType } from '../../../services/agents/special-effects-agent';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chapterIndex: number;
  chapterTitle: string;
  chapterText: string;
  bookTitle: string;
  bookGenre?: string;
  allChapters?: Array<{
    titulo?: string;
    title?: string;
    texto?: string;
    text?: string;
  }>;
  onSelectChapter?: (idx: number) => void;
}

// ============================================================
// 🎬 ESTÚDIO DE VÍDEO — INTERFACE ULTRA-SIMPLES DE 3 ETAPAS
// Tudo automatizado: vozes, trilha, imagens, transições
// ============================================================

type StudioStep = 'setup' | 'scenes' | 'export';

export const KdpTikTokStoryStudio: React.FC<Props> = ({
  isOpen,
  onClose,
  chapterIndex,
  chapterTitle,
  chapterText,
  bookTitle,
  bookGenre = 'Ficção',
  allChapters,
  onSelectChapter
}) => {
  // ── ETAPA DO FLUXO ──
  const [currentStep, setCurrentStep] = useState<StudioStep>('setup');

  // ── CAPÍTULO ──
  const [currentChapterIdx, setCurrentChapterIdx] = useState<number>(chapterIndex);
  useEffect(() => { setCurrentChapterIdx(chapterIndex); }, [chapterIndex]);

  const activeChapterData = (allChapters && allChapters[currentChapterIdx]) ? {
    title: allChapters[currentChapterIdx].titulo || allChapters[currentChapterIdx].title || `Capítulo ${currentChapterIdx + 1}`,
    text: allChapters[currentChapterIdx].texto || allChapters[currentChapterIdx].text || ''
  } : {
    title: chapterTitle,
    text: chapterText
  };

  // ── CENAS & AGENTES AUTÔNOMOS ──
  const [scenes, setScenes] = useState<TikTokScene[]>([]);
  const [targetScenesCount, setTargetScenesCount] = useState<number>(5);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [productionPlan, setProductionPlan] = useState<ProductionPlan | null>(null);
  const [agentStatusText, setAgentStatusText] = useState<string>('');
  const [agentProgressPercent, setAgentProgressPercent] = useState<number>(0);

  // ── GERAÇÃO ──
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generatingProgressText, setGeneratingProgressText] = useState('');
  const [generatingTakeKey, setGeneratingTakeKey] = useState<string | null>(null);

  // ── EDIÇÃO DE CENA ──
  const [editingSceneIdx, setEditingSceneIdx] = useState<number | null>(null);

  // ── PLAYER DE VÍDEO ──
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [activeTakeIndex, setActiveTakeIndex] = useState<0 | 1 | 2>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // ── GRAVAÇÃO/EXPORTAÇÃO ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [recordStatus, setRecordStatus] = useState('');
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);

  // ── AUTOMATIZAÇÕES INTERNAS (INVISÍVEIS AO USUÁRIO) ──
  const [visualBible, setVisualBible] = useState<VisualContinuityBible>(() =>
    GoogleImageStudioService.createDefaultVisualBible(bookTitle, bookGenre)
  );
  const imageEngine: VisualImageEngine = 'google-imagen';
  const transitionStyle: CinematicTransitionStyle = 'adaptiveCinema';
  const showSubtitles = true;
  const showTopHeader = true;
  const aspectRatio: '9:16' | '16:9' = '9:16';

  // ── REFS ──
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const sceneStartTimeRef = useRef<number>(0);
  const preloadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Limpeza ao fechar
  useEffect(() => {
    if (!isOpen) {
      stopPlayback();
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    return () => { cinematicAudioDirector.stop(); };
  }, []);

  // Pré-carregamento de imagens
  useEffect(() => {
    scenes.forEach((s) => {
      s.images?.forEach((take) => {
        if (take.url && !preloadedImagesRef.current.has(take.id)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = take.url;
          img.onload = () => {
            preloadedImagesRef.current.set(take.id, img);
            renderCanvasFrame(activeSceneIndex, playbackProgress);
          };
        }
      });
    });
  }, [scenes]);

  // ── ANÁLISE DE CENAS + ORQUESTRAÇÃO PELOS 4 AGENTES AUTÔNOMOS ──
  const handleCreateScenes = async () => {
    setIsAnalyzing(true);
    setAgentStatusText('🎬 Analisando narrativa e personagens...');
    setAgentProgressPercent(10);
    stopPlayback();
    try {
      // 1. Extração inicial da estrutura de cenas
      const result = await TikTokStoryVideoService.analyzeChapterIntoScenes(
        bookTitle || 'Obra Editorial',
        activeChapterData.title || `Capítulo ${currentChapterIdx + 1}`,
        activeChapterData.text,
        bookGenre,
        targetScenesCount
      );
      const extracted = Array.isArray(result) ? result : (result?.scenes || []);
      const bible = (result as any)?.visualBible || GoogleImageStudioService.createDefaultVisualBible(bookTitle, bookGenre);

      // 2. Orquestração completa pelos 4 Agentes Autônomos de Cinema:
      // - Diretor de Cenas (Fotografia alinhada, sem alucinações)
      // - Diretor de Áudio (Vozes fluidas, pausas naturais, sem tom robótico)
      // - Agente de Efeitos Especiais (Trilha, auto-ducking, SFX Foley e VFX)
      // - Diretor Geral de Vídeo (Revisão final de qualidade)
      const { scenes: directedScenes, plan } = await VideoDirectorAgent.produceVideo(
        extracted,
        bible,
        bookTitle,
        bookGenre,
        (msg, pct) => {
          setAgentStatusText(msg);
          setAgentProgressPercent(pct);
        }
      );

      setScenes(directedScenes);
      setVisualBible(bible);
      setProductionPlan(plan);
      setActiveSceneIndex(0);
      setActiveTakeIndex(0);
      setCurrentStep('scenes');
    } catch (e) {
      console.warn('Erro ao orquestrar com agentes:', e);
    } finally {
      setIsAnalyzing(false);
      setAgentStatusText('');
      setAgentProgressPercent(0);
    }
  };

  // Re-orquestrar cenas existentes com os 4 Agentes
  const handleReOrchestrateWithAgents = async () => {
    if (scenes.length === 0) return;
    setIsAnalyzing(true);
    setAgentStatusText('🎬 Diretor Geral re-orquestrando produção com os 4 Agentes...');
    setAgentProgressPercent(10);
    try {
      const { scenes: directedScenes, plan } = await VideoDirectorAgent.produceVideo(
        scenes,
        visualBible,
        bookTitle,
        bookGenre,
        (msg, pct) => {
          setAgentStatusText(msg);
          setAgentProgressPercent(pct);
        }
      );
      setScenes(directedScenes);
      setProductionPlan(plan);
    } catch (e) {
      console.warn('Erro ao re-orquestrar:', e);
    } finally {
      setIsAnalyzing(false);
      setAgentStatusText('');
      setAgentProgressPercent(0);
    }
  };

  // ── TROCA DE CAPÍTULO ──
  const handleSwitchChapter = (newIdx: number) => {
    setCurrentChapterIdx(newIdx);
    if (onSelectChapter) onSelectChapter(newIdx);
    stopPlayback();
    setScenes([]);
    setCurrentStep('setup');
  };

  // ── GERENCIAR CENAS ──
  const handleAddScene = () => {
    const updated = TikTokStoryVideoService.addScene(scenes);
    setScenes(updated);
    setTargetScenesCount(updated.length);
  };

  const handleRemoveScene = (sIdx: number) => {
    const updated = TikTokStoryVideoService.removeScene(scenes, sIdx);
    setScenes(updated);
    setTargetScenesCount(updated.length);
    if (activeSceneIndex >= updated.length) {
      setActiveSceneIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleUpdateSceneText = (sIdx: number, newText: string) => {
    setScenes((prev) => {
      const copy = [...prev];
      copy[sIdx] = {
        ...copy[sIdx],
        text: newText,
        speechText: coAuthorVoiceService.cleanTextForSpeech(newText),
        audioUrl: undefined
      };
      return copy;
    });
  };

  // ── GERAR IMAGEM DE UM TAKE ──
  const handleGenerateTakeImage = async (sceneIdx: number, takeNumber: 1 | 2 | 3) => {
    const s = scenes[sceneIdx];
    if (!s) return;
    const take = s.images.find((t) => t.takeNumber === takeNumber);
    if (!take) return;

    const key = `${sceneIdx}-${takeNumber}`;
    setGeneratingTakeKey(key);

    try {
      const { url, audit, engineUsed, isRealPhoto } = await TikTokStoryVideoService.generateSceneImage(
        take.prompt, aspectRatio, s.text, take.label, bookGenre, imageEngine, visualBible, takeNumber, sceneIdx + 1
      );

      setScenes((prev) => {
        const copy = [...prev];
        const sceneCopy = { ...copy[sceneIdx] };
        sceneCopy.images = sceneCopy.images.map((t) =>
          t.takeNumber === takeNumber
            ? { ...t, url, isAudited: true, auditScore: audit.consistencyScore, auditNotes: audit.auditNotes, engineUsed, isRealPhoto }
            : t
        );
        if (takeNumber === 1) sceneCopy.imageUrl = url;
        copy[sceneIdx] = sceneCopy;
        return copy;
      });
    } catch (e) {
      console.warn(`Erro ao gerar take ${takeNumber} da cena ${sceneIdx + 1}:`, e);
    } finally {
      setGeneratingTakeKey(null);
    }
  };

  // ── SINTETIZAR VOZ DE UMA CENA ──
  const handleSynthesizeSceneVoice = async (sceneIdx: number) => {
    const s = scenes[sceneIdx];
    if (!s) return;

    const voice = s.voiceId || 'edge:pt-BR-FranciscaNeural';
    const gender: VoiceGender = voice.includes('Antonio') || voice.includes('Fabio') || voice.includes('Donato') ? 'male' : 'female';

    try {
      const { audioUrl, durationSec } = await TikTokStoryVideoService.synthesizeSceneAudio(
        s.text, gender, 'pt-BR', voice
      );
      setScenes((prev) => {
        const copy = [...prev];
        copy[sceneIdx] = { ...copy[sceneIdx], audioUrl, audioDurationSec: durationSec };
        return copy;
      });
    } catch (e) {
      console.warn(`Erro ao sintetizar voz da cena ${sceneIdx + 1}:`, e);
    }
  };

  // ── OUVIR UMA CENA COM TRILHA DE FUNDO HARMÔNICA E VOZ NEURAL ──
  const handlePlaySingleScene = async (sceneIdx: number) => {
    const s = scenes[sceneIdx];
    if (!s) return;

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Trilha sonora cinematográfica harmônica suave (zero zumbidos)
    const fx = (s as any).specialEffects;
    cinematicAudioDirector.resume();
    cinematicAudioDirector.setVolumeFactor(0.7);
    cinematicAudioDirector.playScene(
      {
        narrationText: s.text,
        sceneSummary: s.text,
        mood: fx?.bgmMood,
        ambientSound: fx?.ambientSound
      },
      bookGenre
    );
    cinematicAudioDirector.setDucking(true);

    if (s.audioUrl) {
      const audio = new Audio(s.audioUrl);
      currentAudioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => { cinematicAudioDirector.setDucking(false); };
    } else {
      // Síntese sob demanda com voz neural humana oficial do estúdio (Edge TTS Francisca/Antonio)
      try {
        const isMale = /arthur|doutor|ele|homem|detetive|marcos|pedro/i.test(s.speakerName || '');
        const voice = s.voiceId || (isMale ? 'edge:pt-BR-AntonioNeural' : 'edge:pt-BR-FranciscaNeural');
        const gender: VoiceGender = isMale ? 'male' : 'female';

        const { audioUrl, durationSec } = await TikTokStoryVideoService.synthesizeSceneAudio(s.text, gender, 'pt-BR', voice);
        if (audioUrl) {
          s.audioUrl = audioUrl;
          s.audioDurationSec = durationSec;
          setScenes([...scenes]);

          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          audio.play().catch(() => {});
          audio.onended = () => { cinematicAudioDirector.setDucking(false); };
          return;
        }
      } catch (err) {
        console.warn('[Studio] Falha na síntese instantânea da voz neural:', err);
      }

      // Se síntese falhar, usa leitor neural do diretor de áudio
      cinematicAudioDirector.readSceneAloud({ narrationText: s.text }, undefined, () => {
        cinematicAudioDirector.setDucking(false);
      });
    }
  };

  // ── GERAR TUDO: IMAGENS (3 TAKES POR CENA) + VOZES NEURAIS + TRILHA ──
  const handleGenerateAll = async () => {
    if (scenes.length === 0) return;
    setIsGeneratingAll(true);
    setGeneratingProgressText('Iniciando produção audiovisual completa...');

    const workingScenes = scenes.map(s => ({
      ...s,
      images: s.images.map(img => ({ ...img }))
    }));

    for (let sIdx = 0; sIdx < workingScenes.length; sIdx++) {
      const s = workingScenes[sIdx];
      setGeneratingProgressText(`Produzindo Cena ${sIdx + 1} de ${workingScenes.length} (${s.speakerName || 'Narrador'} — 3 Takes + Voz Neural)...`);

      // Dispara os 3 takes de imagem + síntese de voz da cena em paralelo para máxima velocidade
      const takePromises = s.images.map(async (take) => {
        if (!take.url) {
          try {
            const { url, audit, engineUsed, isRealPhoto } = await TikTokStoryVideoService.generateSceneImage(
              take.prompt, aspectRatio, s.text, take.label, bookGenre, imageEngine, visualBible, take.takeNumber, sIdx + 1
            );
            take.url = url;
            take.isAudited = true;
            take.auditScore = audit.consistencyScore;
            take.engineUsed = engineUsed;
            take.isRealPhoto = isRealPhoto;
            if (take.takeNumber === 1) s.imageUrl = url;
          } catch (e) {
            console.warn(e);
          }
        }
      });

      const voicePromise = (async () => {
        if (!s.audioUrl) {
          const voice = s.voiceId || 'edge:pt-BR-FranciscaNeural';
          const gender: VoiceGender = voice.includes('Antonio') || voice.includes('Fabio') || voice.includes('Donato') ? 'male' : 'female';
          try {
            const { audioUrl, durationSec } = await TikTokStoryVideoService.synthesizeSceneAudio(s.text, gender, 'pt-BR', voice);
            s.audioUrl = audioUrl;
            s.audioDurationSec = durationSec;
          } catch (e) {
            console.warn(e);
          }
        }
      })();

      await Promise.all([...takePromises, voicePromise]);
      setScenes([...workingScenes]);
    }

    setGeneratingProgressText('');
    setIsGeneratingAll(false);
    setCurrentStep('export');
  };

  // ── RENDERIZAÇÃO DO CANVAS ──
  const renderCanvasFrame = (sIdx: number, sceneProgress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scene = scenes[sIdx];
    if (!scene) {
      ctx.fillStyle = '#05050a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const takes = scene.images || [];
    let takeIdx: 0 | 1 | 2 = 0;
    let curTake: TikTokSceneImage | undefined = takes[0];
    let nxtTake: TikTokSceneImage | undefined = takes[1];
    let takeProgress = 0;
    let transitionAlpha = 0;

    if (sceneProgress < 0.333) {
      takeIdx = 0;
      takeProgress = sceneProgress / 0.333;
      curTake = takes[0]; nxtTake = takes[1];
      if (takeProgress > 0.72) transitionAlpha = (takeProgress - 0.72) / 0.28;
    } else if (sceneProgress < 0.666) {
      takeIdx = 1;
      takeProgress = (sceneProgress - 0.333) / 0.333;
      curTake = takes[1] || takes[0]; nxtTake = takes[2] || takes[0];
      if (takeProgress > 0.72) transitionAlpha = (takeProgress - 0.72) / 0.28;
    } else {
      takeIdx = 2;
      takeProgress = (sceneProgress - 0.666) / 0.334;
      curTake = takes[2] || takes[0];
      const nextScene = sIdx + 1 < scenes.length ? scenes[sIdx + 1] : null;
      nxtTake = nextScene?.images?.[0];
      if (takeProgress > 0.72 && nxtTake) transitionAlpha = (takeProgress - 0.72) / 0.28;
    }

    setActiveTakeIndex(takeIdx);

    const curImg = curTake?.url ? preloadedImagesRef.current.get(curTake.id) || null : null;
    const nxtImg = nxtTake?.url ? preloadedImagesRef.current.get(nxtTake.id) || null : null;

    const effectiveTransition = (scene as any).transitionStyle || transitionStyle;
    const vfxList: VisualEffectType[] = (scene as any).specialEffects?.visualEffects || [];

    TikTokStoryVideoService.renderVideoFrame(
      ctx, canvas, curImg, nxtImg, takeProgress, transitionAlpha,
      scene.text, bookTitle, sIdx, scenes.length, takeIdx,
      {
        showSubtitles,
        showTopHeader,
        speakerName: scene.speakerName,
        transitionStyle: effectiveTransition,
        visualEffects: vfxList
      }
    );
  };

  // ── PLAYBACK ──
  const startPlayback = (startSceneIdx: number = activeSceneIndex) => {
    stopPlayback();
    if (scenes.length === 0) return;

    const s = scenes[startSceneIdx];
    if (!s) return;

    setActiveSceneIndex(startSceneIdx);
    setIsPlaying(true);
    setPlaybackProgress(0);

    const durationSec = s.audioDurationSec || s.timeEstimateSec || 9;
    const durationMs = durationSec * 1000;
    sceneStartTimeRef.current = performance.now();

    // Trilha de fundo automática com auto-ducking orquestrado pelo Agente de Efeitos Especiais
    const fx = (s as any).specialEffects;
    if (fx?.bgmVolume) {
      cinematicAudioDirector.setVolumeFactor(Math.min(1.0, fx.bgmVolume * 2.2));
    } else {
      cinematicAudioDirector.setVolumeFactor(0.8);
    }
    cinematicAudioDirector.playScene(
      {
        narrationText: s.text,
        sceneSummary: s.text,
        mood: fx?.bgmMood,
        ambientSound: fx?.ambientSound
      },
      bookGenre
    );
    cinematicAudioDirector.setDucking(true);

    if (s.audioUrl) {
      try {
        const audio = new Audio(s.audioUrl);
        currentAudioRef.current = audio;
        audio.play().catch(() => {});
        audio.onended = () => { cinematicAudioDirector.setDucking(false); };
      } catch (e) { console.warn(e); }
    }

    const loop = (now: number) => {
      const elapsed = now - sceneStartTimeRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      setPlaybackProgress(progress);
      renderCanvasFrame(startSceneIdx, progress);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        if (startSceneIdx + 1 < scenes.length) {
          startPlayback(startSceneIdx + 1);
        } else {
          stopPlayback();
          setPlaybackProgress(0);
          renderCanvasFrame(0, 0);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const stopPlayback = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (currentAudioRef.current) {
      try { currentAudioRef.current.pause(); currentAudioRef.current.currentTime = 0; } catch {}
      currentAudioRef.current = null;
    }
    cinematicAudioDirector.stop();
    setIsPlaying(false);
  };

  // ── EXPORTAR VÍDEO ──
  const handleExportVideo = async () => {
    if (scenes.length === 0) return;
    stopPlayback();
    setIsRecording(true);
    setRecordProgress(5);
    setRecordStatus('Iniciando gravação HD...');

    try {
      const blob = await TikTokStoryVideoService.recordAndExportVideo(
        scenes, bookTitle,
        (pct, msg) => { setRecordProgress(pct); setRecordStatus(msg); },
        { showSubtitles, showTopHeader, transitionStyle, isBgmActive: true, bookGenre }
      );

      const url = URL.createObjectURL(blob);
      setExportedVideoUrl(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${bookTitle.toLowerCase().replace(/\s+/g, '-')}-cap${currentChapterIdx + 1}-video.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      console.warn('Erro ao exportar vídeo:', e);
      setRecordStatus(`Erro: ${e.message}`);
    } finally {
      setIsRecording(false);
    }
  };

  if (!isOpen) return null;

  // ── HELPERS DE VOZ ──
  const getVoiceLabel = (voiceId?: string): string => {
    const v = AVAILABLE_TIKTOK_VOICES.find(v => v.id === voiceId);
    return v ? `${v.gender === 'female' ? '👩' : '👨'} ${v.name}` : '🎙️ Voz Neural';
  };

  const getSpeakerColor = (type?: string): string => {
    if (type === 'character_female') return '#ec4899';
    if (type === 'character_male') return '#3b82f6';
    return '#a78bfa';
  };

  const totalDuration = scenes.reduce((acc, s) => acc + (s.audioDurationSec || s.timeEstimateSec || 8), 0);
  const uniqueSpeakers = [...new Set(scenes.map(s => s.speakerName || 'Narrador'))];

  // ════════════════════════════════════════════
  //               RENDER
  // ════════════════════════════════════════════
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(5, 5, 12, 0.92)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        width: '96%', maxWidth: 1100, maxHeight: '92vh',
        background: '#0f172a', border: '1px solid #334155', borderRadius: 20,
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.8)',
        color: '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>

        {/* ═══════ CABEÇALHO LIMPO ═══════ */}
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
          borderBottom: '1px solid #334155',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(236, 72, 153, 0.4)'
            }}>
              <Film size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#f8fafc' }}>
                🎬 Estúdio de Vídeo
              </h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
                {bookTitle} • Capítulo {currentChapterIdx + 1}: <b>{activeChapterData.title}</b>
              </p>
            </div>
          </div>

          {/* Indicador de Etapa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(['setup', 'scenes', 'export'] as StudioStep[]).map((step, i) => {
              const labels = ['Configurar', 'Cenas', 'Exportar'];
              const icons = ['📋', '🎬', '📥'];
              const isActive = currentStep === step;
              const isPast = (['setup', 'scenes', 'export'].indexOf(currentStep) > i);
              return (
                <React.Fragment key={step}>
                  {i > 0 && <ChevronRight size={14} color="#475569" />}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 8,
                    background: isActive ? 'rgba(236, 72, 153, 0.2)' : isPast ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    border: `1px solid ${isActive ? '#ec4899' : isPast ? '#10b981' : '#334155'}`,
                    color: isActive ? '#f472b6' : isPast ? '#34d399' : '#64748b',
                    fontSize: 12, fontWeight: 700, cursor: isPast ? 'pointer' : 'default',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    if (isPast) setCurrentStep(step);
                  }}>
                    {isPast ? <CheckCircle2 size={13} /> : <span>{icons[i]}</span>}
                    {labels[i]}
                  </div>
                </React.Fragment>
              );
            })}

            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
              padding: 8, color: '#94a3b8', cursor: 'pointer', marginLeft: 8
            }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ═══════ CORPO — ETAPA 1: CONFIGURAR ═══════ */}
        {currentStep === 'setup' && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 40
          }}>
            <div style={{
              width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column',
              gap: 24, alignItems: 'center'
            }}>
              {/* Ícone grande */}
              <div style={{
                width: 80, height: 80, borderRadius: 24,
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(236, 72, 153, 0.4)',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                <Wand2 size={36} color="#ffffff" />
              </div>

              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', margin: '0 0 8px' }}>
                  Criar Vídeo do Capítulo
                </h2>
                <p style={{ fontSize: 14, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                  A IA vai analisar o capítulo, detectar os personagens e diálogos automaticamente,
                  e atribuir vozes diferentes para cada um.
                </p>
              </div>

              {/* Seletor de capítulo */}
              {allChapters && allChapters.length > 0 && (
                <div style={{ width: '100%' }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>
                    📖 Capítulo
                  </label>
                  <select
                    value={currentChapterIdx}
                    onChange={(e) => handleSwitchChapter(Number(e.target.value))}
                    style={{
                      width: '100%', background: '#1e293b', color: '#f8fafc',
                      border: '1px solid #475569', borderRadius: 10,
                      padding: '12px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {allChapters.map((cap, cIdx) => (
                      <option key={cIdx} value={cIdx}>
                        Capítulo {cIdx + 1}: {(cap.titulo || cap.title || `Capítulo ${cIdx + 1}`).slice(0, 50)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantidade de cenas */}
              <div style={{ width: '100%' }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>
                  🎬 Quantidade de Cenas
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min={3}
                    max={20}
                    value={targetScenesCount}
                    onChange={(e) => setTargetScenesCount(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#ec4899' }}
                  />
                  <span style={{
                    background: '#1e293b', border: '1px solid #475569', borderRadius: 8,
                    padding: '8px 16px', fontSize: 18, fontWeight: 800, color: '#f8fafc',
                    minWidth: 50, textAlign: 'center'
                  }}>
                    {targetScenesCount}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: '6px 0 0' }}>
                  Mais cenas = vídeo mais longo e detalhado
                </p>
              </div>

              {/* Botão principal com status dos 4 Agentes */}
              <button
                onClick={handleCreateScenes}
                disabled={isAnalyzing || !activeChapterData.text}
                style={{
                  width: '100%', padding: '16px 24px', borderRadius: 14,
                  background: isAnalyzing
                    ? 'linear-gradient(135deg, #475569, #334155)'
                    : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                  color: '#ffffff', border: 'none', fontWeight: 800, fontSize: 16,
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  boxShadow: isAnalyzing ? 'none' : '0 6px 24px rgba(236, 72, 153, 0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all 0.3s ease'
                }}
              >
                {isAnalyzing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BookEnginAnimatedBook size="micro" />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        {agentStatusText || 'Orquestrando com 4 Agentes Autônomos...'}
                      </span>
                    </div>
                    {agentProgressPercent > 0 && (
                      <div style={{ width: '80%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${agentProgressPercent}%`, height: '100%',
                          background: 'linear-gradient(90deg, #ec4899, #8b5cf6)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Criar Vídeo com 4 Agentes Autônomos de Cinema
                  </>
                )}
              </button>

              {/* Infos automáticas */}
              <div style={{
                width: '100%', background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 12,
                padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>✅ Tudo orquestrado por 4 Agentes de IA:</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>• 🎬 <b>Diretor de Cenas:</b> Enquadramentos 100% coesos com a fala (sem alucinações)</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>• 🎵 <b>Diretor de Áudio:</b> Vozes humanizadas, sem pausas robóticas mecânicas</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>• ✨ <b>Diretor de Efeitos Especiais:</b> Trilha procedural com auto-ducking e VFX 35mm</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>• 🏆 <b>Diretor Geral:</b> Revisão executiva de qualidade de cinema</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ CORPO — ETAPA 2: CENAS ═══════ */}
        {currentStep === 'scenes' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Banner da Equipe de 4 Agentes Autônomos de Direção */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  width: 34, height: 34, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}>
                  <Sparkles size={16} color="#ffffff" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>
                      Orquestração de Cinema • 4 Agentes Autônomos
                    </span>
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.2)', color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800
                    }}>
                      Qualidade {productionPlan?.qualityScore || 95}/100
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap', fontSize: 11, color: '#94a3b8' }}>
                    <span>🎬 <b>Cenas:</b> Prompts alinhados à fala</span>
                    <span>🎵 <b>Áudio:</b> Vozes humanizadas</span>
                    <span>✨ <b>FX:</b> Trilha com auto-ducking</span>
                    <span>🏆 <b>Diretor:</b> Corte aprovado</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleReOrchestrateWithAgents}
                disabled={isAnalyzing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.4)',
                  fontSize: 12, fontWeight: 700, cursor: isAnalyzing ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={12} className={isAnalyzing ? 'animate-spin' : ''} />
                Re-orquestrar com 4 Agentes
              </button>
            </div>

            {/* Resumo do elenco */}
            <div style={{
              background: '#1e293b', borderRadius: 12, padding: '14px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                  {scenes.length} cenas • ~{Math.round(totalDuration)}s
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {uniqueSpeakers.map(name => {
                    const scene = scenes.find(s => s.speakerName === name);
                    return (
                      <span key={name} style={{
                        background: `${getSpeakerColor(scene?.speakerType)}20`,
                        color: getSpeakerColor(scene?.speakerType),
                        border: `1px solid ${getSpeakerColor(scene?.speakerType)}40`,
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700
                      }}>
                        {name} — {getVoiceLabel(scene?.voiceId)}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleAddScene}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 14px', borderRadius: 8,
                    background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <Plus size={13} /> Adicionar Cena
                </button>

                <button
                  onClick={handleGenerateAll}
                  disabled={isGeneratingAll || scenes.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 18px', borderRadius: 8,
                    background: isGeneratingAll
                      ? 'linear-gradient(135deg, #475569, #334155)'
                      : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                    color: '#ffffff', border: 'none', fontWeight: 800, fontSize: 13,
                    cursor: isGeneratingAll ? 'not-allowed' : 'pointer',
                    boxShadow: isGeneratingAll ? 'none' : '0 3px 12px rgba(236, 72, 153, 0.3)'
                  }}
                >
                  {isGeneratingAll ? (
                    <><BookEnginAnimatedBook size="micro" /> {generatingProgressText || 'Gerando...'}</>
                  ) : (
                    <><Sparkles size={14} /> Gerar Tudo (Imagens + Vozes)</>
                  )}
                </button>
              </div>
            </div>

            {/* Lista de cenas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {scenes.map((s, idx) => (
                <div key={s.id} style={{
                  background: '#1e293b', border: '1px solid #334155', borderRadius: 14,
                  padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
                  transition: 'all 0.2s ease'
                }}>
                  {/* Cabeçalho da cena */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: getSpeakerColor(s.speakerType),
                        color: '#ffffff', fontSize: 11, fontWeight: 800,
                        padding: '3px 10px', borderRadius: 6
                      }}>
                        Cena {idx + 1}
                      </span>
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: getSpeakerColor(s.speakerType)
                      }}>
                        {s.speakerName || 'Narrador'}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {getVoiceLabel(s.voiceId)}
                      </span>
                      <span style={{ fontSize: 11, color: '#475569' }}>
                        ⏱️ ~{Math.round(s.audioDurationSec || s.timeEstimateSec || 8)}s
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => setEditingSceneIdx(editingSceneIdx === idx ? null : idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 6,
                          background: editingSceneIdx === idx ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.06)',
                          color: editingSceneIdx === idx ? '#38bdf8' : '#94a3b8',
                          border: `1px solid ${editingSceneIdx === idx ? '#38bdf8' : '#334155'}`,
                          fontSize: 11, fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={11} /> {editingSceneIdx === idx ? 'Fechar' : 'Editar'}
                      </button>

                      <button
                        onClick={() => handlePlaySingleScene(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 6,
                          background: 'rgba(236, 72, 153, 0.15)',
                          color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        <Volume2 size={11} /> Ouvir
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Remover Cena ${idx + 1}?`)) handleRemoveScene(idx);
                        }}
                        disabled={scenes.length <= 1}
                        style={{
                          display: 'flex', alignItems: 'center',
                          padding: '4px 8px', borderRadius: 6,
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)',
                          fontSize: 11, cursor: scenes.length <= 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Texto da cena */}
                  {editingSceneIdx === idx ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        value={s.text}
                        onChange={(e) => handleUpdateSceneText(idx, e.target.value)}
                        rows={3}
                        style={{
                          width: '100%', background: '#0f172a', border: '1px solid #ec4899',
                          borderRadius: 8, padding: '10px 14px', color: '#f8fafc',
                          fontSize: 13, lineHeight: 1.5, outline: 'none', resize: 'vertical'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingSceneIdx(null)}
                          style={{
                            padding: '5px 14px', borderRadius: 6,
                            background: '#10b981', color: '#ffffff', border: 'none',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{
                      fontSize: 13, lineHeight: 1.6, color: '#e2e8f0', margin: 0,
                      padding: '0 4px', fontStyle: s.speakerType !== 'narrator' ? 'italic' : 'normal'
                    }}>
                      {s.speakerType !== 'narrator' && <span style={{ color: getSpeakerColor(s.speakerType), fontWeight: 700 }}>"{s.text}"</span>}
                      {s.speakerType === 'narrator' && s.text}
                    </p>
                  )}

                  {/* Badges de Direção dos Agentes */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {(s as any).specialEffects?.bgmMood && (
                      <span style={{
                        background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700
                      }}>
                        🎵 Trilha: {(s as any).specialEffects.bgmMood}
                      </span>
                    )}
                    {(s as any).specialEffects?.ambientSound && (s as any).specialEffects.ambientSound !== 'nenhum' && (
                      <span style={{
                        background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700
                      }}>
                        🌧️ Ambiente: {(s as any).specialEffects.ambientSound}
                      </span>
                    )}
                    {(s as any).transitionStyle && (
                      <span style={{
                        background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700
                      }}>
                        ✂️ Transição: {(s as any).transitionStyle}
                      </span>
                    )}
                    {((s as any).specialEffects?.visualEffects || []).length > 0 && (
                      <span style={{
                        background: 'rgba(236, 72, 153, 0.12)', color: '#f472b6',
                        border: '1px solid rgba(236, 72, 153, 0.25)',
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700
                      }}>
                        ✨ VFX: {((s as any).specialEffects.visualEffects).join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Miniaturas dos 3 takes */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {s.images.map((take) => {
                      const isBusy = generatingTakeKey === `${idx}-${take.takeNumber}`;
                      const shortTakeLabel = take.takeNumber === 1
                        ? 'Take 1 • Plano Aberto'
                        : take.takeNumber === 2
                          ? 'Take 2 • Plano Médio'
                          : 'Take 3 • Close-up';
                      return (
                        <div key={take.id} style={{
                          background: '#0f172a', border: '1px solid #1e293b',
                          borderRadius: 8, overflow: 'hidden', position: 'relative'
                        }}>
                          <div style={{
                            width: '100%', height: 94, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: '#020617'
                          }}>
                            {take.url ? (
                              <img src={take.url} alt={take.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : isBusy ? (
                              <BookEnginAnimatedBook size="micro" />
                            ) : (
                              <ImageIcon size={16} color="#334155" />
                            )}
                          </div>
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            background: 'linear-gradient(to top, rgba(2,6,23,0.92), rgba(2,6,23,0.0))',
                            padding: '10px 6px 4px', fontSize: 9, fontWeight: 700, color: '#cbd5e1',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                          }}>
                            <span>{shortTakeLabel}</span>
                            {take.url && !isBusy && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleGenerateTakeImage(idx, take.takeNumber); }}
                                title="Regerar este take"
                                style={{
                                  background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.18)',
                                  color: '#e2e8f0', borderRadius: 4, padding: '1px 5px', fontSize: 9,
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2
                                }}
                              >
                                <RefreshCw size={8} />
                              </button>
                            )}
                          </div>
                          {take.url && (
                            <div style={{
                              position: 'absolute', top: 4, right: 4,
                              background: 'rgba(16, 185, 129, 0.9)',
                              borderRadius: 4, padding: '1px 4px'
                            }}>
                              <CheckCircle2 size={10} color="#ffffff" />
                            </div>
                          )}
                          {!take.url && !isBusy && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleGenerateTakeImage(idx, take.takeNumber); }}
                              style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0.5)', border: 'none',
                                color: '#f472b6', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 700, gap: 3
                              }}
                            >
                              <Sparkles size={10} /> Gerar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Botão avançar para exportação */}
            {!isGeneratingAll && scenes.some(s => s.images.some(t => t.url)) && (
              <button
                onClick={() => setCurrentStep('export')}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff', border: 'none', fontWeight: 800, fontSize: 15,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
                }}
              >
                Avançar para Exportação <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}

        {/* ═══════ CORPO — ETAPA 3: EXPORTAR ═══════ */}
        {currentStep === 'export' && (
          <div style={{
            flex: 1, overflowY: 'auto', padding: 24,
            display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24
          }}>
            {/* Player */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 300, height: 533, background: '#000',
                borderRadius: 24, border: '6px solid #1e293b',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                position: 'relative', overflow: 'hidden'
              }}>
                <canvas
                  ref={canvasRef}
                  width={720} height={1280}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {!isPlaying && (
                  <button
                    onClick={() => startPlayback(0)}
                    style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'rgba(236, 72, 153, 0.9)',
                      border: 'none', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', boxShadow: '0 6px 24px rgba(0,0,0,0.5)'
                    }}
                  >
                    <Play size={28} style={{ marginLeft: 4 }} />
                  </button>
                )}

                {/* Barra de progresso */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: 4, background: 'rgba(255,255,255,0.2)'
                }}>
                  <div style={{
                    height: '100%', width: `${playbackProgress * 100}%`,
                    background: '#ec4899', transition: 'width 0.1s linear'
                  }} />
                </div>

                {/* Info do speaker atual */}
                {scenes[activeSceneIndex] && (
                  <div style={{
                    position: 'absolute', top: 10, left: 10,
                    background: 'rgba(0,0,0,0.75)', borderRadius: 6,
                    padding: '3px 8px', fontSize: 10, fontWeight: 700,
                    color: getSpeakerColor(scenes[activeSceneIndex].speakerType)
                  }}>
                    {scenes[activeSceneIndex].speakerName || 'Narrador'}
                  </div>
                )}
              </div>

              {/* Controles do player */}
              <div style={{ display: 'flex', gap: 8, width: 300 }}>
                <button
                  onClick={isPlaying ? stopPlayback : () => startPlayback(activeSceneIndex)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '11px', borderRadius: 10,
                    background: isPlaying ? '#f59e0b' : '#ec4899',
                    color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer'
                  }}
                >
                  {isPlaying ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> Assistir</>}
                </button>

                <button
                  onClick={handleExportVideo}
                  disabled={isRecording || scenes.length === 0}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '11px', borderRadius: 10,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff', border: 'none', fontWeight: 700, fontSize: 14,
                    cursor: isRecording ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Download size={16} /> {isRecording ? 'Gravando...' : 'Baixar'}
                </button>
              </div>

              {/* Barra de progresso de gravação */}
              {isRecording && (
                <div style={{
                  width: 300, background: '#1e293b', borderRadius: 10,
                  padding: 12, border: '1px solid #334155'
                }}>
                  <div style={{ fontSize: 11, color: '#f8fafc', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{recordStatus}</span>
                    <b>{recordProgress}%</b>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${recordProgress}%`, height: '100%', background: '#10b981', transition: 'width 0.2s ease' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Lista de cenas no export */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 4
              }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                  Linha do Tempo ({scenes.length} cenas • ~{Math.round(totalDuration)}s)
                </h4>
                <button
                  onClick={() => setCurrentStep('scenes')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 12px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
                    border: '1px solid #334155', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <ChevronLeft size={13} /> Voltar às Cenas
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 480, overflowY: 'auto' }}>
                {scenes.map((s, idx) => {
                  const isActive = activeSceneIndex === idx && isPlaying;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setActiveSceneIndex(idx);
                        renderCanvasFrame(idx, 0);
                      }}
                      style={{
                        background: isActive ? 'rgba(236, 72, 153, 0.1)' : '#1e293b',
                        border: `1px solid ${isActive ? '#ec4899' : '#334155'}`,
                        borderRadius: 10, padding: '10px 14px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        cursor: 'pointer', transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Miniatura */}
                      <div style={{
                        width: 48, height: 48, borderRadius: 8, background: '#020617',
                        overflow: 'hidden', flexShrink: 0
                      }}>
                        {s.images[0]?.url ? (
                          <img src={s.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Film size={16} color="#334155" />
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 800,
                            color: getSpeakerColor(s.speakerType)
                          }}>
                            Cena {idx + 1} • {s.speakerName || 'Narrador'}
                          </span>
                          <span style={{ fontSize: 10, color: '#475569' }}>
                            ~{Math.round(s.audioDurationSec || s.timeEstimateSec || 8)}s
                          </span>
                        </div>
                        <p style={{
                          fontSize: 11, color: '#94a3b8', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {s.text}
                        </p>
                      </div>

                      {/* Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {s.images.every(t => t.url) && <CheckCircle2 size={14} color="#10b981" />}
                        {s.audioUrl && <Volume2 size={14} color="#8b5cf6" />}
                        {isActive && <Play size={14} color="#ec4899" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
