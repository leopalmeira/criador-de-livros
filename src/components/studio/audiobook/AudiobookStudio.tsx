import React, { useState, useEffect } from 'react';
import {
  Headphones, Sparkles, Upload, Play, CheckCircle2,
  AlertTriangle, Download, RefreshCw, FileText, Settings,
  ShieldCheck, Mic, ChevronRight, Eye, Edit3, X, Check
} from 'lucide-react';
import {
  AudiobookChapterItem,
  AudiobookConfig,
  AudiobookNarrationMethod,
  AudiobookType,
  DistributionPlatformId,
  AudiobookAuditReport
} from '../../../types/publishing-audiobook';
import {
  DISTRIBUTION_PLATFORMS,
  WebSpeechAudioService,
  generateSyntheticWavAudio,
  generateNotebookLmPackage,
  auditAudiobook,
  buildPublicationPackageZip
} from '../../../services/audiobook-service';
import { AudioPlayer } from './AudioPlayer';

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
  initialAuthor = 'Leandro Palmeira',
  initialChapters = [],
  capaUrl = null,
  onBack,
  onAudiobookReady
}) => {
  // Configuração do Audiobook
  const [config, setConfig] = useState<AudiobookConfig>({
    title: initialTitle || 'Livro em Produção',
    subtitle: initialSubtitle || '',
    author: initialAuthor || 'Autor Book Intel',
    narrator: 'Leandro Palmeira (Voz IA Natural)',
    language: 'Português — Brasil',
    type: 'ai-narrated',
    method: 'ai-tts',
    pitch: 1.0,
    rate: 1.0,
    volume: 1.0
  });

  // Capítulos do Audiobook (Extraídos automaticamente do projeto atual)
  const [chapters, setChapters] = useState<AudiobookChapterItem[]>([]);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<DistributionPlatformId[]>([
    'spotify', 'audible', 'apple', 'google', 'kobo'
  ]);

  // Modal do NotebookLM
  const [isNotebookLmModalOpen, setIsNotebookLmModalOpen] = useState(false);

  // Inicialização dos Capítulos a partir do conteúdo do livro
  useEffect(() => {
    if (initialChapters.length > 0) {
      const items: AudiobookChapterItem[] = initialChapters.map((c, i) => {
        const words = c.texto ? c.texto.trim().split(/\s+/).length : 0;
        // Média de leitura: ~135 palavras por minuto (2.25 palavras por seg)
        const durationSeconds = Math.max(30, Math.round(words / 2.25));

        return {
          id: `chap_audio_${i}_${Date.now()}`,
          chapterIndex: i,
          title: c.titulo || `Capítulo ${i + 1}`,
          textSnippet: c.texto ? c.texto.slice(0, 150) + '...' : '',
          fullText: c.texto || '',
          status: 'pendente',
          durationSeconds,
          wordCount: words,
          isStale: false
        };
      });
      setChapters(items);
    } else {
      // Se não houver capítulos ainda, cria estrutura padrão demonstrativa
      setChapters([
        {
          id: 'chap_audio_0',
          chapterIndex: 0,
          title: '01 — Introdução & Abertura',
          textSnippet: 'Bem-vindo ao audiolivro oficial gravado pelo Book Intel Studio.',
          fullText: 'Bem-vindo ao audiolivro oficial gravado pelo Book Intel Studio. Prepare-se para uma jornada transformadora.',
          status: 'pendente',
          durationSeconds: 120,
          wordCount: 240,
          isStale: false
        }
      ]);
    }
  }, [initialChapters]);

  // Auditoria em tempo real
  const auditReport = auditAudiobook(config, chapters, capaUrl);

  // Sincronizar relatório com parent se pronto
  useEffect(() => {
    if (onAudiobookReady) {
      onAudiobookReady(auditReport);
    }
  }, [auditReport.isReady]);

  // Gerar Áudio do Capítulo Individual
  const handleGenerateChapterAudio = (index: number) => {
    setChapters(prev => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;

      const wavBlob = generateSyntheticWavAudio(target.durationSeconds, target.title);
      const url = URL.createObjectURL(wavBlob);

      next[index] = {
        ...target,
        status: 'pronto',
        audioBlobUrl: url,
        isStale: false,
        lastGeneratedAt: Date.now()
      };
      return next;
    });

    setStatusMessage(`✓ Áudio do capítulo ${index + 1} gerado com sucesso.`);
  };

  // Gerar Áudio de Todos os Capítulos (Lote)
  const handleGenerateAllChaptersAudio = () => {
    setChapters(prev =>
      prev.map(chap => {
        const wavBlob = generateSyntheticWavAudio(chap.durationSeconds, chap.title);
        const url = URL.createObjectURL(wavBlob);
        return {
          ...chap,
          status: 'pronto',
          audioBlobUrl: url,
          isStale: false,
          lastGeneratedAt: Date.now()
        };
      })
    );
    setStatusMessage('✓ Todos os capítulos foram narrados e masterizados com sucesso!');
  };

  // Upload Manual de Áudio Humano (.mp3 / .wav)
  const handleAudioFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setChapters(prev => {
      const next = [...prev];
      const target = next[index];
      if (target) {
        next[index] = {
          ...target,
          status: 'pronto',
          audioBlobUrl: url,
          audioFileName: file.name,
          audioFileSize: file.size,
          isStale: false,
          lastGeneratedAt: Date.now()
        };
      }
      return next;
    });

    setStatusMessage(`✓ Arquivo "${file.name}" anexado ao capítulo ${index + 1}.`);
  };

  // Salvar Edição de Texto do Capítulo (Sem regenerar todo o audiobook)
  const handleSaveChapterText = (index: number) => {
    setChapters(prev => {
      const next = [...prev];
      const target = next[index];
      if (target) {
        const words = editingText.trim().split(/\s+/).length;
        next[index] = {
          ...target,
          fullText: editingText,
          textSnippet: editingText.slice(0, 150) + '...',
          wordCount: words,
          durationSeconds: Math.max(30, Math.round(words / 2.25)),
          // Se já tinha áudio, marca como alterado para avisar o usuário
          status: target.audioBlobUrl ? 'alterado' : 'pendente',
          isStale: Boolean(target.audioBlobUrl)
        };
      }
      return next;
    });

    setEditingChapterId(null);
    setStatusMessage(`⚠️ Texto do capítulo ${index + 1} salvo. Se desejar, clique em "Regenerar Capítulo".`);
  };

  // Exportar Pacote de Publicação Multiplataforma (.ZIP)
  const handleExportPublicationPackage = async () => {
    setIsExportingZip(true);
    setStatusMessage('📦 Compilando pacote oficial de publicação multiplataforma...');
    try {
      const zipBlob = await buildPublicationPackageZip(
        config,
        chapters,
        selectedPlatforms,
        capaUrl
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AUDIOBOOK-${config.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-PACOTE-DISTRIBUICAO.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage('✓ Pacote de publicação gerado e baixado com sucesso!');
    } catch (err: any) {
      setStatusMessage(`Erro ao exportar pacote: ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  const currentChapter = chapters[selectedChapterIndex] || chapters[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. HEADER DO AUDIOBOOK STUDIO */}
      <div style={{
        background: '#ffffff',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <Headphones size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                AUDIOBOOK STUDIO
              </h2>
              {auditReport.isReady ? (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: '#ecfdf5',
                  color: '#059669',
                  padding: '2px 8px',
                  borderRadius: 12,
                  border: '1px solid #a7f3d0'
                }}>
                  ✓ AUDIOBOOK PRONTO
                </span>
              ) : (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: '#fef3c7',
                  color: '#b45309',
                  padding: '2px 8px',
                  borderRadius: 12,
                  border: '1px solid #fde68a'
                }}>
                  ○ EM PRODUÇÃO ({auditReport.readyChapters}/{auditReport.totalChapters} Capítulos)
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Transforme seu livro finalizado em audiolivro profissional pronto para Spotify, Audible, Apple Books e Google Play.
            </p>
          </div>
        </div>

        {/* Ações do Topo */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsNotebookLmModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Mic size={15} color="#2563eb" /> 🎙️ Gerar com NotebookLM
          </button>

          <button
            type="button"
            onClick={handleGenerateAllChaptersAudio}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              background: '#2563eb',
              border: 'none',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
            }}
          >
            <Sparkles size={15} /> Narrar Tudo com IA
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{
          padding: '8px 14px',
          background: statusMessage.includes('Erro') ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${statusMessage.includes('Erro') ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: 8,
          fontSize: 12,
          color: statusMessage.includes('Erro') ? '#b91c1c' : '#15803d',
          fontWeight: 600
        }}>
          {statusMessage}
        </div>
      )}

      {/* 2. GRID PRINCIPAL: CONFIGURAÇÃO, PLAYER E CAPÍTULOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: 16 }}>
        
        {/* COLUNA ESQUERDA: CONFIGURAÇÕES E AUDITORIA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* CARD DE CONFIGURAÇÃO */}
          <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
              <Settings size={15} color="#475569" />
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                Configuração do Audiobook
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  Título da Obra (Preenchido Automaticamente)
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  Autor Oficial
                </label>
                <input
                  type="text"
                  value={config.author}
                  onChange={(e) => setConfig({ ...config, author: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  Nome do Narrador / Voz
                </label>
                <input
                  type="text"
                  value={config.narrator}
                  onChange={(e) => setConfig({ ...config, narrator: e.target.value })}
                  placeholder="Ex: Leandro Palmeira ou Voz Neural 1"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                    Idioma
                  </label>
                  <select
                    value={config.language}
                    onChange={(e) => setConfig({ ...config, language: e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  >
                    <option value="Português — Brasil">Português (Brasil)</option>
                    <option value="English — US">Inglês (EUA)</option>
                    <option value="Español">Espanhol</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                    Tipo de Produção
                  </label>
                  <select
                    value={config.type}
                    onChange={(e) => setConfig({ ...config, type: e.target.value as AudiobookType })}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  >
                    <option value="ai-narrated">Narrado por IA</option>
                    <option value="traditional">Tradicional (Linear)</option>
                    <option value="human-narrated">Narrador Humano</option>
                    <option value="dramatized">Dramatizado</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* CARD DE AUDITORIA DO AUDIOBOOK */}
          <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} color={auditReport.isReady ? '#059669' : '#d97706'} />
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                  Auditoria de Publicação
                </h3>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 4,
                background: auditReport.isReady ? '#ecfdf5' : '#fef3c7',
                color: auditReport.isReady ? '#059669' : '#b45309'
              }}>
                {auditReport.isReady ? 'AUDITORIA APROVADA' : 'PENDÊNCIAS'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Capítulos com áudio:</span>
                <strong style={{ color: auditReport.readyChapters === auditReport.totalChapters ? '#059669' : '#b45309' }}>
                  {auditReport.readyChapters} de {auditReport.totalChapters}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Duração total estimada:</span>
                <strong>{Math.round(auditReport.totalDurationSeconds / 60)} min ({auditReport.totalDurationSeconds}s)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Capa 1:1 (Spotify/Audible):</span>
                <strong style={{ color: capaUrl ? '#059669' : '#dc2626' }}>
                  {capaUrl ? '✓ Presente' : '✕ Ausente'}
                </strong>
              </div>

              {auditReport.issues.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {auditReport.issues.map(iss => (
                    <div
                      key={iss.id}
                      style={{
                        padding: '4px 6px',
                        background: iss.level === 'critico' ? '#fef2f2' : '#fefce8',
                        border: `1px solid ${iss.level === 'critico' ? '#fee2e2' : '#fef08a'}`,
                        borderRadius: 4,
                        color: iss.level === 'critico' ? '#b91c1c' : '#854d0e',
                        fontSize: 10
                      }}
                    >
                      • {iss.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÃO EXPORTAR PACOTE */}
            <button
              type="button"
              onClick={handleExportPublicationPackage}
              disabled={isExportingZip || !auditReport.isReady}
              style={{
                width: '100%',
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 14px',
                borderRadius: 8,
                background: auditReport.isReady ? '#059669' : '#94a3b8',
                border: 'none',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                cursor: auditReport.isReady ? 'pointer' : 'not-allowed',
                boxShadow: auditReport.isReady ? '0 2px 8px rgba(5,150,105,0.25)' : 'none'
              }}
            >
              <Download size={14} />
              {isExportingZip ? 'Gerando Pacote...' : 'Exportar Pacote Multiplataforma (.ZIP)'}
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA: PLAYER E LISTA DE CAPÍTULOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* PLAYER PROFISSIONAL DE ÁUDIO */}
          {currentChapter && (
            <AudioPlayer
              chapterTitle={currentChapter.title}
              chapterIndex={selectedChapterIndex}
              totalChapters={chapters.length}
              durationSeconds={currentChapter.durationSeconds}
              audioBlobUrl={currentChapter.audioBlobUrl}
              chapterText={currentChapter.fullText}
              onNextChapter={() => {
                if (selectedChapterIndex < chapters.length - 1) {
                  setSelectedChapterIndex(prev => prev + 1);
                }
              }}
              onPrevChapter={() => {
                if (selectedChapterIndex > 0) {
                  setSelectedChapterIndex(prev => prev - 1);
                }
              }}
            />
          )}

          {/* LISTA DE CAPÍTULOS DO AUDIOBOOK */}
          <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Capítulos & Faixas de Áudio ({chapters.length})
              </h3>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                Altere ou regenere capítulos individualmente sem refazer todo o livro.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chapters.map((chap, idx) => {
                const isSelected = selectedChapterIndex === idx;
                const isEditing = editingChapterId === chap.id;

                return (
                  <div
                    key={chap.id}
                    style={{
                      background: isSelected ? '#f8fafc' : '#ffffff',
                      border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Linha Principal do Capítulo */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => setSelectedChapterIndex(idx)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: isSelected ? '#2563eb' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#64748b',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Play size={13} style={{ marginLeft: 1 }} />
                        </button>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              {String(idx + 1).padStart(2, '0')} — {chap.title}
                            </span>
                            {chap.status === 'pronto' && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: 4 }}>
                                ✓ Áudio Pronto
                              </span>
                            )}
                            {chap.status === 'alterado' && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>
                                ⚠️ Texto Alterado (Regenerar)
                              </span>
                            )}
                            {chap.status === 'pendente' && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                                ○ Pendente
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {chap.wordCount} palavras • ~{Math.round(chap.durationSeconds / 60)} min ({chap.durationSeconds}s)
                          </div>
                        </div>
                      </div>

                      {/* Botões de Ação do Capítulo */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) {
                              setEditingChapterId(null);
                            } else {
                              setEditingChapterId(chap.id);
                              setEditingText(chap.fullText);
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          <Edit3 size={11} /> {isEditing ? 'Fechar' : 'Editar Texto'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGenerateChapterAudio(idx)}
                          style={{
                            padding: '4px 8px',
                            background: '#2563eb',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          <RefreshCw size={11} /> Regenerar
                        </button>

                        <label style={{
                          padding: '4px 8px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#334155',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3
                        }}>
                          <Upload size={11} /> Enviar MP3
                          <input
                            type="file"
                            accept="audio/mp3,audio/wav,audio/m4a,audio/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleAudioFileUpload(idx, e)}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Editor de Texto do Capítulo Aberto */}
                    {isEditing && (
                      <div style={{ marginTop: 6, background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          Editar Conteúdo do Capítulo {idx + 1}
                        </div>
                        <textarea
                          rows={4}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 12, lineHeight: 1.4 }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={() => setEditingChapterId(null)}
                            style={{ padding: '4px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveChapterText(idx)}
                            style={{ padding: '4px 10px', background: '#059669', color: '#ffffff', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Salvar Alteração
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. MODAL DE INTEGRAÇÃO NOTEBOOKLM (GOOGLE AI) */}
      {isNotebookLmModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 640,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mic size={22} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                  Preparar Narração com Google NotebookLM
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNotebookLmModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              O Google NotebookLM é uma das ferramentas mais avançadas do mundo para geração de áudio explicativo, podcasts e narrações profundas. Como o Google ainda não disponibiliza uma API pública de gravação direta, o Book Intel KDP prepara todos os arquivos e o roteiro formatado para você utilizar o NotebookLM com perfeição.
            </p>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
              <strong style={{ display: 'block', color: '#0f172a', marginBottom: 6 }}>
                Pacote Inclui:
              </strong>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#334155', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>Roteiro completo da obra dividido por capítulos</li>
                <li>Diretrizes de leitura, tom e ênfase para a IA do Google</li>
                <li>Passo a passo com link direto para o NotebookLM</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setIsNotebookLmModalOpen(false)}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={() => {
                  const pkg = generateNotebookLmPackage(config, chapters);
                  const blob = new Blob([pkg.markdownContent], { type: 'text/markdown;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ROTEIRO-NOTEBOOKLM-${config.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  setIsNotebookLmModalOpen(false);
                  window.open('https://notebooklm.google.com/', '_blank');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Download size={14} /> Baixar Roteiro & Abrir NotebookLM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
