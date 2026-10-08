import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Mic2, Pause, Play, RefreshCw, Users } from 'lucide-react';
import {
  AudiobookCastAnalysis,
  AudiobookClient,
  AudiobookSelectableVoice
} from '../../../services/audiobook/audiobook-client';

interface AudiobookCastPanelProps {
  chapters: Array<{ title: string; text: string }>;
  language: string;
  onChange: (analysis: AudiobookCastAnalysis | null) => void;
}

const languageMatch = (voice: AudiobookSelectableVoice, language: string) => {
  if (voice.languages.length === 0) return true;
  const base = language.toLowerCase().split('-')[0];
  const names: Record<string, string> = {
    de: 'german',
    en: 'english',
    es: 'spanish',
    fr: 'french',
    it: 'italian',
    pt: 'portuguese'
  };
  return voice.languages.some((item) => {
    const normalized = item.toLowerCase().trim();
    return normalized === base || normalized.startsWith(`${base}-`) || normalized === names[base];
  });
};

export const AudiobookCastPanel: React.FC<AudiobookCastPanelProps> = ({
  chapters,
  language,
  onChange
}) => {
  const [voices, setVoices] = useState<AudiobookSelectableVoice[]>([]);
  const [analysis, setAnalysis] = useState<AudiobookCastAnalysis | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [previewingMemberId, setPreviewingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const voiceOptions = useMemo(
    () => voices.filter((voice) => languageMatch(voice, language)),
    [voices, language]
  );

  useEffect(() => {
    let active = true;
    setIsLoadingVoices(true);
    AudiobookClient.listAudiobookVoices(language)
      .then((items) => {
        if (active) setVoices(items);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setIsLoadingVoices(false);
      });
    return () => {
      active = false;
    };
  }, [language]);

  useEffect(() => {
    if (!analysis) return;
    const availableIds = new Set(voiceOptions.map((voice) => voice.id));
    if (analysis.cast.every((member) => !member.voiceId || availableIds.has(member.voiceId))) return;
    const updated = {
      ...analysis,
      cast: analysis.cast.map((member) =>
        member.voiceId && !availableIds.has(member.voiceId)
          ? { ...member, voiceId: undefined }
          : member
      )
    };
    setAnalysis(updated);
    onChange(updated);
  }, [analysis, onChange, voiceOptions]);

  const analyze = async () => {
    setError(null);
    setIsAnalyzing(true);
    setAnalysisProgress('');
    try {
      const result = await AudiobookClient.analyzeAudiobookCast(chapters, (currentBatch, totalBatches) => {
        setAnalysisProgress(`Analisando lote ${currentBatch} de ${totalBatches}...`);
      });
      if (!Array.isArray(result.cast) || !Array.isArray(result.chapters)) {
        throw new Error('A análise retornou um formato inválido. Tente novamente.');
      }
      setAnalysis(result);
      onChange(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao analisar o elenco.');
      setAnalysis(null);
      onChange(null);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  const setMemberVoice = (memberId: string, voiceId: string) => {
    if (!analysis) return;
    const updated = {
      ...analysis,
      cast: analysis.cast.map((member) =>
        member.id === memberId ? { ...member, voiceId } : member
      )
    };
    setAnalysis(updated);
    onChange(updated);
  };

  const allVoicesAssigned =
    Boolean(analysis?.cast.length) && analysis.cast.every((member) => Boolean(member.voiceId));

  const toggleVoicePreview = async (member: AudiobookCastAnalysis['cast'][number]) => {
    const currentAudio = previewAudioRef.current;
    if (previewingMemberId === member.id) {
      currentAudio?.pause();
      setPreviewingMemberId(null);
      return;
    }
    if (!member.voiceId) return;

    currentAudio?.pause();
    const gender = member.gender === 'female' ? 'female' : 'male';
    const audio = new Audio(AudiobookClient.getVoicePreviewUrl(language, gender, member.voiceId));
    previewAudioRef.current = audio;
    audio.onended = () => setPreviewingMemberId(null);
    audio.onerror = () => {
      setPreviewingMemberId(null);
      setError(`Não foi possível gerar a amostra da voz de ${member.name}.`);
    };
    setError(null);
    try {
      await audio.play();
      setPreviewingMemberId(member.id);
    } catch {
      setPreviewingMemberId(null);
      setError(`Não foi possível reproduzir a amostra da voz de ${member.name}.`);
    }
  };

  useEffect(() => () => {
    previewAudioRef.current?.pause();
  }, []);

  return (
    <section
      aria-labelledby="audiobook-cast-title"
      style={{
        border: '1px solid #c7d2fe',
        borderRadius: 12,
        background: '#f8faff',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Users size={19} color="#4f46e5" style={{ marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <h4 id="audiobook-cast-title" style={{ margin: 0, color: '#172554', fontSize: 15 }}>
            Elenco de vozes e interlocutores
          </h4>
          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 12, lineHeight: 1.5 }}>
            A IA identifica narrador e personagens. Revise o elenco e associe cada papel a uma voz
            neural natural antes de gerar.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={analyze}
          disabled={isAnalyzing || chapters.length === 0}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '9px 13px',
            border: 0,
            borderRadius: 8,
            background: '#4f46e5',
            color: 'white',
            fontWeight: 700,
            cursor: isAnalyzing || chapters.length === 0 ? 'wait' : 'pointer'
          }}
        >
          {isAnalyzing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {analysis ? 'Reanalisar elenco com IA' : 'Identificar elenco com IA'}
        </button>
        {isLoadingVoices && (
          <span style={{ color: '#64748b', fontSize: 12 }}>Carregando vozes disponíveis...</span>
        )}
      </div>
      {isAnalyzing && analysisProgress && (
        <span role="status" style={{ color: '#4338ca', fontSize: 12 }}>
          {analysisProgress} Os capítulos longos são processados em partes para preservar o texto.
        </span>
      )}

      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            padding: 10,
            background: '#fff7ed',
            color: '#9a3412',
            border: '1px solid #fed7aa',
            borderRadius: 8,
            fontSize: 12
          }}
        >
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}

      {analysis && (
        <>
          {voiceOptions.length === 0 && (
            <div
              role="alert"
              style={{
                padding: 10,
                color: '#9a3412',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 8,
                fontSize: 12
              }}
            >
              Nenhuma voz natural compatível foi encontrada. Confira sua conexão ou escolha outro idioma.
            </div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {analysis.cast.map((member) => (
              <label
                key={member.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(120px, 1fr) minmax(180px, 2fr)',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8
                }}
              >
                <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 700 }}>
                  <Mic2 size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                  {member.name}
                  <small style={{ display: 'block', color: '#64748b', fontWeight: 500, margin: '3px 0 0 22px' }}>
                    {member.id === 'narrator'
                      ? 'Narrador'
                      : member.gender === 'unknown'
                        ? 'Personagem'
                        : member.gender === 'female'
                          ? 'Personagem feminina'
                          : 'Personagem masculino'}
                  </small>
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <select
                    aria-label={`Voz de ${member.name}`}
                    value={member.voiceId || ''}
                    onChange={(event) => setMemberVoice(member.id, event.target.value)}
                    disabled={voiceOptions.length === 0}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 7,
                      background: 'white',
                      color: '#0f172a'
                    }}
                  >
                    <option value="">Selecione uma voz</option>
                    {voiceOptions.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.title} {voice.provider === 'neural-cloud' ? '— Natural' : '— Fish Audio'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!member.voiceId}
                    onClick={() => toggleVoicePreview(member)}
                    style={{
                      alignSelf: 'flex-start',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 8px',
                      border: '1px solid #c7d2fe',
                      borderRadius: 6,
                      background: '#eef2ff',
                      color: '#4338ca',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: member.voiceId ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {previewingMemberId === member.id ? <Pause size={13} /> : <Play size={13} />}
                    {previewingMemberId === member.id ? 'Parar amostra' : 'Testar voz'}
                  </button>
                </div>
              </label>
            ))}
          </div>
          <p style={{ margin: 0, color: allVoicesAssigned ? '#047857' : '#b45309', fontSize: 12 }}>
            {allVoicesAssigned
              ? `${analysis.cast.length} vozes associadas. As falas identificadas serão sintetizadas por personagem.`
              : 'Associe uma voz a cada papel para habilitar a gravação com elenco.'}
          </p>
        </>
      )}
    </section>
  );
};
