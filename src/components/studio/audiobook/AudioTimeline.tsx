// ================================================================
// TIMELINE DE ÁUDIO VISUAL — MULTI-TRACK AUDIO EDITOR
// BookEngin — Trilhas: VOICE | AMBIENTE | SFX
// ================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2, Trash2, Copy, Sliders, Plus, CheckCircle,
  EyeOff, Play, Info, Sparkles, Music, Mic, CloudRain, Clock,
  Search, Pause, Loader2, Volume1, DownloadCloud
} from 'lucide-react';
import {
  SoundTimelineEvent,
  SoundEffectPriority,
  SpeechTimelineCue
} from '../../../types/audiobook-studio';
import {
  SOUND_EFFECTS_CATALOG,
  SoundEffectItem
} from '../../../services/audiobook/sound-effects-catalog';
import {
  AudiobookClient,
  SFXItem
} from '../../../services/audiobook/audiobook-client';

interface AudioTimelineProps {
  chapterDurationSeconds: number;
  events: SoundTimelineEvent[];
  onUpdateEvent: (updatedEvent: SoundTimelineEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onDuplicateEvent: (event: SoundTimelineEvent) => void;
  onAddEvent: (event: SoundTimelineEvent) => void;
  speechCues?: SpeechTimelineCue[];
  onUpdateSpeechCue?: (cue: SpeechTimelineCue) => void;
  currentTimeSeconds?: number;
}

export const AudioTimeline: React.FC<AudioTimelineProps> = ({
  chapterDurationSeconds,
  events,
  onUpdateEvent,
  onDeleteEvent,
  onDuplicateEvent,
  onAddEvent,
  speechCues = [],
  onUpdateSpeechCue,
  currentTimeSeconds = 0
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedSpeechCueId, setSelectedSpeechCueId] = useState<string | null>(null);
  const selectedSpeechCue = speechCues.find(c => c.id === selectedSpeechCueId) || null;

  // Estados de busca e preview de efeitos reais
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [remoteResults, setRemoteResults] = useState<SFXItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [previewingSoundId, setPreviewingSoundId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const safeEvents = Array.isArray(events) ? events : [];
  const totalDuration = Math.max(30, chapterDurationSeconds || 60);
  const markerStep = totalDuration > 120 ? 30 : 15;
  const numMarkers = Math.ceil(totalDuration / markerStep);
  const markers = Array.from({ length: numMarkers + 1 }, (_, i) => i * markerStep);
  const ambientEvents = safeEvents.filter(e => e && e.trackType === 'ambient');
  const sfxEvents = safeEvents.filter(e => e && e.trackType === 'sfx');

  // Busca efeitos no backend / cache / Freesound ao abrir ou digitar
  useEffect(() => {
    if (!isAddModalOpen) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewingSoundId(null);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await AudiobookClient.searchSFX(searchQuery);
        if (active) {
          setRemoteResults(res.results || []);
        }
      } catch {
        if (active) setRemoteResults([]);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, isAddModalOpen]);

  const handleTogglePreview = (soundId: string, previewUrl?: string | null) => {
    if (previewingSoundId === soundId) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewingSoundId(null);
      return;
    }
    const url = previewUrl || `/api/audiobook/sfx/file/${encodeURIComponent(soundId)}`;
    if (previewAudioRef.current) {
      previewAudioRef.current.src = url;
      previewAudioRef.current.play().then(() => {
        setPreviewingSoundId(soundId);
      }).catch(() => {
        setPreviewingSoundId(null);
      });
    }
  };

  const handleAddSound = (sound: {
    id: string;
    name: string;
    durationSeconds: number;
    freesoundId?: number;
    isAmbient?: boolean;
    category?: string;
  }) => {
    if (sound.freesoundId) {
      AudiobookClient.downloadSFX(sound.freesoundId).catch(() => {});
    }

    const isAmbient = sound.isAmbient ?? (
      sound.id.includes('rain') ||
      sound.id.includes('wind') ||
      sound.id.includes('river') ||
      sound.id.includes('birds') ||
      sound.id.includes('tension') ||
      sound.id.includes('clock')
    );

    const newEvent: SoundTimelineEvent = {
      id: `evt_manual_${sound.id}_${Date.now()}`,
      soundId: sound.id,
      name: sound.name,
      trackType: isAmbient ? 'ambient' : 'sfx',
      startTimeSeconds: Math.min(totalDuration - 5, Math.max(0, Math.round(currentTimeSeconds))),
      durationSeconds: Math.max(1.5, sound.durationSeconds || 5),
      volume: isAmbient ? 0.20 : 0.30,
      fadeInSeconds: isAmbient ? 1.5 : 0.1,
      fadeOutSeconds: isAmbient ? 2.0 : 0.5,
      priority: 'recomendado',
      triggerPhrase: 'Adicionado manualmente pelo autor',
      enabled: true
    };
    onAddEvent(newEvent);
    setIsAddModalOpen(false);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setPreviewingSoundId(null);
  };

  const getPriorityBadge = (p: SoundEffectPriority) => {
    switch (p) {
      case 'essencial':
        return { label: 'ESSENCIAL', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
      case 'recomendado':
        return { label: 'RECOMENDADO', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' };
      case 'opcional':
        return { label: 'OPCIONAL', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  return (
    <div style={{
      background: '#0f172a',
      borderRadius: 12,
      padding: 16,
      color: '#f8fafc',
      border: '1px solid #1e293b',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }}>
      {/* CABEÇALHO DA TIMELINE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Music size={18} color="#38bdf8" />
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Timeline de Sonorização Multi-track
          </h4>
          <span style={{ fontSize: 11, background: '#1e293b', padding: '2px 8px', borderRadius: 12, color: '#94a3b8' }}>
            {events.length} efeitos cadastrados
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Plus size={14} /> Adicionar Efeito do Banco
        </button>
      </div>

      {/* ÁREA DA TIMELINE COM RÉGUA DE TEMPO */}
      <div style={{
        background: '#020617',
        borderRadius: 8,
        padding: '12px 14px',
        border: '1px solid #1e293b',
        overflowX: 'auto'
      }}>
        {/* RÉGUA DE TEMPO */}
        <div style={{
          position: 'relative',
          height: 24,
          borderBottom: '1px solid #334155',
          marginBottom: 10,
          minWidth: 600
        }}>
          {markers.map(m => {
            const leftPct = (m / totalDuration) * 100;
            if (leftPct > 100) return null;
            return (
              <div
                key={m}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: 0,
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                  {Math.floor(m / 60)}:{String(m % 60).padStart(2, '0')}
                </span>
                <div style={{ width: 1, height: 6, background: '#475569', marginTop: 2 }} />
              </div>
            );
          })}

          {/* CURSOR DE TEMPO ATUAL */}
          {currentTimeSeconds > 0 && currentTimeSeconds <= totalDuration && (
            <div style={{
              position: 'absolute',
              left: `${(currentTimeSeconds / totalDuration) * 100}%`,
              top: 0,
              bottom: -150,
              width: 2,
              background: '#ef4444',
              zIndex: 10,
              pointerEvents: 'none',
              boxShadow: '0 0 6px rgba(239,68,68,0.8)'
            }} />
          )}
        </div>

        {/* FAIXA 1: NARRAÇÃO COM MARCADORES DE FALA */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, minWidth: 600 }}>
          <div style={{
            width: 90,
            fontSize: 11,
            fontWeight: 700,
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Mic size={13} /> VOICE
          </div>
          <div style={{
            flex: 1,
            minHeight: 32,
            background: 'linear-gradient(90deg, rgba(14,165,233,0.25), rgba(59,130,246,0.25))',
            border: '1px solid rgba(56,189,248,0.4)',
            borderRadius: 6,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            color: '#bae6fd',
            fontSize: 11,
            fontWeight: 600
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
              🎙️ Vozes e pausas dirigidas por IA
            </span>
            {speechCues.map((cue, index) => {
              const leftPct = (cue.startTimeSeconds / totalDuration) * 100;
              const widthPct = Math.min(100 - leftPct, (cue.durationSeconds / totalDuration) * 100);
              const colors = ['#0284c7', '#7c3aed', '#db2777', '#059669', '#d97706'];
              return (
                <button
                  key={cue.id}
                  type="button"
                  onClick={() => setSelectedSpeechCueId(cue.id)}
                  title={`${cue.speakerName}: ${cue.text}\nInício estimado ${cue.startTimeSeconds.toFixed(1)}s • ${cue.pauseAfterMs}ms de pausa`}
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    width: `${Math.max(2, widthPct)}%`,
                    top: 2,
                    bottom: 2,
                    padding: '0 4px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    border: selectedSpeechCueId === cue.id ? '2px solid white' : '1px solid rgba(255,255,255,0.65)',
                    borderRadius: 4,
                    background: colors[index % colors.length],
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {cue.speakerName}
                </button>
              );
            })}
          </div>
        </div>
        <p style={{ margin: '-4px 0 8px 90px', color: '#94a3b8', fontSize: 10 }}>
          Os marcadores de fala são estimativas guiadas pelo texto e pelas pausas sintetizadas; selecione um para ajustar a referência e alinhar efeitos.
        </p>

        {/* FAIXA 2: TRILHA DE AMBIENTE */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 10, minWidth: 600 }}>
          <div style={{
            width: 90,
            fontSize: 11,
            fontWeight: 700,
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            paddingTop: 8
          }}>
            <CloudRain size={13} /> AMBIENTE
          </div>
          <div style={{
            flex: 1,
            minHeight: 40,
            background: '#0f172a',
            border: '1px dashed #334155',
            borderRadius: 6,
            position: 'relative'
          }}>
            {ambientEvents.length === 0 ? (
              <div style={{ padding: 10, fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                Nenhum som de ambiente ativado. Clique em &quot;Analisar Cenas&quot; ou adicione manualmente.
              </div>
            ) : (
              ambientEvents.map(evt => {
                const leftPct = (evt.startTimeSeconds / totalDuration) * 100;
                const widthPct = Math.min(100 - leftPct, (evt.durationSeconds / totalDuration) * 100);
                const badge = getPriorityBadge(evt.priority);
                const isSelected = selectedEventId === evt.id;

                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEventId(isSelected ? null : evt.id)}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${Math.max(12, widthPct)}%`,
                      top: 4,
                      bottom: 4,
                      background: evt.enabled
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(5,150,105,0.45))'
                        : 'rgba(51,65,85,0.4)',
                      border: isSelected ? '2px solid #34d399' : '1px solid #10b981',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 8px',
                      fontSize: 11,
                      color: evt.enabled ? '#a7f3d0' : '#64748b',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis'
                    }}
                    title={`${evt.name} (${Math.round(evt.durationSeconds)}s) • Volume: ${Math.round(evt.volume * 100)}%`}
                  >
                    <span style={{ fontWeight: 600 }}>{evt.name}</span>
                    <span style={{ fontSize: 9, background: badge.bg, color: badge.color, padding: '1px 4px', borderRadius: 3 }}>
                      {Math.round(evt.volume * 100)}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* FAIXA 3: TRILHA DE SFX (EFEITOS PONTUAIS) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 600 }}>
          <div style={{
            width: 90,
            fontSize: 11,
            fontWeight: 700,
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            paddingTop: 8
          }}>
            <Sparkles size={13} /> SFX
          </div>
          <div style={{
            flex: 1,
            minHeight: 46,
            background: '#0f172a',
            border: '1px dashed #334155',
            borderRadius: 6,
            position: 'relative'
          }}>
            {sfxEvents.length === 0 ? (
              <div style={{ padding: 12, fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                Nenhum efeito sonoro pontual neste trecho.
              </div>
            ) : (
              sfxEvents.map(evt => {
                const leftPct = (evt.startTimeSeconds / totalDuration) * 100;
                const widthPct = Math.min(100 - leftPct, (Math.max(6, evt.durationSeconds) / totalDuration) * 100);
                const badge = getPriorityBadge(evt.priority);
                const isSelected = selectedEventId === evt.id;

                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEventId(isSelected ? null : evt.id)}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${Math.max(14, widthPct)}%`,
                      top: 4,
                      bottom: 4,
                      background: evt.enabled
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(217,119,6,0.45))'
                        : 'rgba(51,65,85,0.4)',
                      border: isSelected ? '2px solid #fbbf24' : '1px solid #d97706',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 8px',
                      fontSize: 11,
                      color: evt.enabled ? '#fde68a' : '#64748b',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis'
                    }}
                    title={`${evt.name} (${Math.round(evt.durationSeconds)}s) • Início: ${Math.round(evt.startTimeSeconds)}s`}
                  >
                    <span style={{ fontWeight: 600 }}>{evt.name}</span>
                    <span style={{ fontSize: 9, background: badge.bg, color: badge.color, padding: '1px 4px', borderRadius: 3 }}>
                      {Math.round(evt.startTimeSeconds)}s
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedSpeechCue && onUpdateSpeechCue && (
        <div style={{
          background: '#082f49',
          border: '1px solid #0369a1',
          borderRadius: 8,
          padding: 12,
          color: '#e0f2fe',
          display: 'grid',
          gap: 8
        }}>
          <strong style={{ fontSize: 12 }}>Referência de fala: {selectedSpeechCue.speakerName}</strong>
          <span style={{ fontSize: 11, color: '#bae6fd' }}>{selectedSpeechCue.text.slice(0, 180)}</span>
          <label style={{ display: 'grid', gridTemplateColumns: '150px 1fr 55px', alignItems: 'center', gap: 10, fontSize: 11 }}>
            Posição de referência
            <input
              type="range"
              min={0}
              max={Math.max(0, totalDuration - selectedSpeechCue.durationSeconds)}
              step={0.1}
              value={Math.min(selectedSpeechCue.startTimeSeconds, Math.max(0, totalDuration - selectedSpeechCue.durationSeconds))}
              onChange={(event) => onUpdateSpeechCue({
                ...selectedSpeechCue,
                startTimeSeconds: Number(event.target.value)
              })}
            />
            <span>{selectedSpeechCue.startTimeSeconds.toFixed(1)}s</span>
          </label>
          <span style={{ fontSize: 10, color: '#7dd3fc' }}>
            Ajustar este marcador ajuda a alinhar efeitos; não desloca nem regrava a fala sintetizada.
          </span>
        </div>
      )}

      {/* EDITOR DETALHADO DO EVENTO SELECIONADO NA TIMELINE */}
      {selectedEventId && (() => {
        const evt = events.find(e => e.id === selectedEventId);
        if (!evt) return null;
        const badge = getPriorityBadge(evt.priority);

        return (
          <div style={{
            background: '#1e293b',
            borderRadius: 8,
            padding: 12,
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc' }}>{evt.name}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                  padding: '1px 6px',
                  borderRadius: 4
                }}>
                  {badge.label}
                </span>
                {evt.triggerPhrase && (
                  <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                    &quot;{evt.triggerPhrase}&quot;
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => onUpdateEvent({ ...evt, enabled: !evt.enabled })}
                  style={{
                    background: evt.enabled ? '#059669' : '#475569',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {evt.enabled ? '✓ Ativo na Mixagem' : 'Desativado'}
                </button>

                <button
                  type="button"
                  onClick={() => onDuplicateEvent(evt)}
                  title="Duplicar efeito"
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: 4,
                    padding: 6,
                    cursor: 'pointer'
                  }}
                >
                  <Copy size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDeleteEvent(evt.id);
                    setSelectedEventId(null);
                  }}
                  title="Excluir efeito"
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 4,
                    padding: 6,
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* CONTROLES DE VOLUME, POSIÇÃO E FADES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  Início na Timeline: <b>{Math.round(evt.startTimeSeconds)}s</b>
                </label>
                <input
                  type="range"
                  min="0"
                  max={totalDuration}
                  step="0.5"
                  value={evt.startTimeSeconds}
                  onChange={(e) => onUpdateEvent({ ...evt, startTimeSeconds: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  Volume: <b>{Math.round(evt.volume * 100)}%</b>
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.05"
                  value={evt.volume}
                  onChange={(e) => onUpdateEvent({ ...evt, volume: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  Fade In: <b>{evt.fadeInSeconds.toFixed(1)}s</b>
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="4.0"
                  step="0.1"
                  value={evt.fadeInSeconds}
                  onChange={(e) => onUpdateEvent({ ...evt, fadeInSeconds: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  Fade Out: <b>{evt.fadeOutSeconds.toFixed(1)}s</b>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={evt.fadeOutSeconds}
                  onChange={(e) => onUpdateEvent({ ...evt, fadeOutSeconds: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL / SELETOR DE EFEITOS DO BANCO */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            color: '#1e293b',
            borderRadius: 12,
            maxWidth: 680,
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
          }}>
            {/* Elemento de áudio para pré-escuta de efeitos */}
            <audio
              ref={previewAudioRef}
              onEnded={() => setPreviewingSoundId(null)}
              style={{ display: 'none' }}
            />

            {/* Header Modal com Barra de Busca */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    Biblioteca de Efeitos Sonoros Reais (/audio-effects)
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                    Áudios reais e CC0 livres de direitos autorais para uso comercial
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    if (previewAudioRef.current) previewAudioRef.current.pause();
                    setPreviewingSoundId(null);
                  }}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Fechar
                </button>
              </div>

              {/* Barra de Busca de Efeitos */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar efeito sonoro (ex: chuva, passos, porta, vento, relógio)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {isSearching && (
                  <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#2563eb' }} />
                )}
              </div>
            </div>

            {/* Lista de Efeitos Sonoros com Preview e Botão de Adicionar */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {remoteResults.length > 0 ? (
                remoteResults.map((sound) => {
                  const isPreviewing = previewingSoundId === sound.id;
                  return (
                    <div
                      key={sound.id}
                      style={{
                        border: isPreviewing ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: isPreviewing ? '#eff6ff' : '#f8fafc',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, paddingRight: 10 }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePreview(sound.id, sound.previewUrl)}
                          title={isPreviewing ? 'Pausar prévia' : 'Ouvir prévia'}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            backgroundColor: isPreviewing ? '#2563eb' : '#ffffff',
                            color: isPreviewing ? '#ffffff' : '#2563eb',
                            border: '1px solid #bfdbfe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {isPreviewing ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
                        </button>
                        <div style={{ minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sound.name}
                          </h4>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                            Duração: {sound.durationSeconds}s • {sound.category || 'estúdio'}
                          </p>
                          <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>
                            ✓ {sound.license || 'CC0 / Public Domain'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddSound(sound)}
                        style={{
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexShrink: 0
                        }}
                      >
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>
                  );
                })
              ) : (
                SOUND_EFFECTS_CATALOG.map((sound) => {
                  const isPreviewing = previewingSoundId === sound.id;
                  return (
                    <div
                      key={sound.id}
                      style={{
                        border: isPreviewing ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: isPreviewing ? '#eff6ff' : '#f8fafc',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, paddingRight: 10 }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePreview(sound.id, `/api/audiobook/sfx/file/${sound.id}`)}
                          title={isPreviewing ? 'Pausar prévia' : 'Ouvir prévia'}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            backgroundColor: isPreviewing ? '#2563eb' : '#ffffff',
                            color: isPreviewing ? '#ffffff' : '#2563eb',
                            border: '1px solid #bfdbfe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {isPreviewing ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
                        </button>
                        <div style={{ minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                            {sound.icon} {sound.name}
                          </h4>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                            {sound.description} • Duração: {sound.durationSeconds}s
                          </p>
                          <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>
                            ✓ {sound.license}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddSound(sound)}
                        style={{
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexShrink: 0
                        }}
                      >
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
