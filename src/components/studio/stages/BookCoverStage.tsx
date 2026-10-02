import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, Check, ArrowRight, RefreshCw, CheckCircle2,
  AlertTriangle, BookOpen, Layers, ShieldCheck, Download,
  Key, ExternalLink, Info, Palette
} from 'lucide-react';
import { BookProject } from '../../../types/book-project';
import { getDefaultStageStatuses } from '../../../types/stages';
import { EditorialContextService } from '../../../services/editorial-context-service';
import './../cover/cover-ai-studio.css';

export interface CoverItemMetadata {
  id: string;
  projectId: string;
  version: number;
  fileUrl: string;
  filePath: string;
  prompt: string;
  status: 'completed' | 'failed';
  createdAt: number;
  selected: boolean;
  artStyle: string;
  title: string;
  author: string;
}

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  onContinue?: () => void;
}

export const BookCoverStage: React.FC<Props> = ({ project, onUpdateProject, onContinue }) => {
  // Dados fundamentais do livro
  const title = project.title || 'Livro Sem Título';
  const subtitle = project.subtitle || '';
  const author = project.author || 'Autor da Obra';
  const genre = project.genre || project.kdpBookType || 'Não-Ficção';
  const audience = project.targetAudience || 'Público Geral';
  const topic = project.topic || title;

  // Cover Brief & 3 Direções Visuais Integradas (Seções 24, 27, 28, 29)
  const coverBriefData = useRef(EditorialContextService.buildCoverBriefAndProposals(project)).current;
  const [showBriefPanel, setShowBriefPanel] = useState<boolean>(false);

  // Estados locais da etapa
  const [covers, setCovers] = useState<CoverItemMetadata[]>([]);
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(project.cover_id || null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [stepLabel, setStepLabel] = useState<string>('Iniciando...');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Status da API do Google AI Studio (Imagen 3)
  const [apiKeyStatus, setApiKeyStatus] = useState<{ hasKey: boolean; keyPreview: string; provider: string }>({
    hasKey: false,
    keyPreview: '',
    provider: 'Google AI Studio (Imagen 3)'
  });
  const [showApiKeyPanel, setShowApiKeyPanel] = useState<boolean>(false);
  const [inputApiKey, setInputApiKey] = useState<string>('');
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);

  const pollIntervalRef = useRef<any>(null);

  // Lista de 5 fases de progresso exigidas pela especificação
  const progressPhases = [
    'Analisando o livro',
    'Preparando direção artística',
    'Gerando imagem com título integrado',
    'Processando capa',
    'Finalizando'
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carrega status da chave de API do Google AI Studio
  const loadApiKeyStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/covers/api-key-status');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setApiKeyStatus(data);
        }
      }
    } catch {}
  }, []);

  // Salva a chave de API diretamente no backend/.env
  const handleSaveApiKey = async () => {
    if (!inputApiKey.trim()) return;
    setIsSavingKey(true);
    try {
      const res = await fetch('/api/covers/save-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: inputApiKey.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✓ Chave do Google AI Studio salva com sucesso!');
        setShowApiKeyPanel(false);
        setInputApiKey('');
        loadApiKeyStatus();
      } else {
        alert(data.message || 'Erro ao salvar chave.');
      }
    } catch {
      alert('Erro de conexão ao salvar chave.');
    } finally {
      setIsSavingKey(false);
    }
  };

  // Carrega as capas existentes do backend para este projeto
  const loadProjectCovers = useCallback(async () => {
    try {
      const res = await fetch(`/api/covers/list/${project.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.covers)) {
        setCovers(data.covers);
        // Identifica capa selecionada
        const currentSelected = data.covers.find((c: CoverItemMetadata) => c.selected);
        if (currentSelected) {
          setSelectedCoverId(currentSelected.id);
          // Sincroniza com o projeto caso ainda não estivesse vinculado
          if (project.cover_id !== currentSelected.id || project.coverImageUrl !== currentSelected.fileUrl) {
            onUpdateProject({
              ...project,
              cover_id: currentSelected.id,
              coverImageUrl: currentSelected.fileUrl,
              stageStatuses: {
                ...(project.stageStatuses || getDefaultStageStatuses()),
                'book-cover': 'COMPLETED'
              }
            });
          }
        } else if (data.covers.length > 0 && !selectedCoverId) {
          // Se houver capas mas nenhuma marcada como selected, seleciona a primeira
          const first = data.covers[0];
          setSelectedCoverId(first.id);
          onUpdateProject({
            ...project,
            cover_id: first.id,
            coverImageUrl: first.fileUrl,
            stageStatuses: {
              ...(project.stageStatuses || getDefaultStageStatuses()),
              'book-cover': 'COMPLETED'
            }
          });
        }
      }
    } catch (err) {
      console.warn('Não foi possível carregar capas do backend:', err);
    }
  }, [project, selectedCoverId, onUpdateProject]);

  useEffect(() => {
    loadProjectCovers();
    loadApiKeyStatus();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Inicia a geração da capa 100% no backend orientada pelo Cover Brief (Seções 24, 27, 28 e 30)
  const handleStartGeneration = async (
    variant?: 'minimalist' | 'cinematic' | 'luxury-illustration',
    targetVersion?: number
  ) => {
    if (isGenerating) return; // Regra 21: Evitar duplicidade

    setIsGenerating(true);
    setErrorMessage(null);
    setStepLabel('Compilando Cover Brief e analisando tendências visuais...');
    setProgressPercent(10);
    setActiveStepIndex(0);

    const versionToUse = targetVersion || (covers.length + 1);
    const variantToUse = variant || (
      versionToUse === 1 ? 'minimalist' : versionToUse === 2 ? 'cinematic' : 'luxury-illustration'
    );

    try {
      const payload = {
        projectId: project.id,
        version: versionToUse,
        title,
        subtitle,
        author,
        genre,
        category: project.categories?.[0] || genre,
        targetAudience: audience,
        synopsis: coverBriefData.brief.synopsis || project.description || topic,
        context: coverBriefData.brief.editorialIdentity || topic,
        topic,
        tone: coverBriefData.brief.tone,
        keywords: project.keywords || [genre, 'bestseller'],
        apiKey: inputApiKey.trim() || undefined,
        artDirectionVariant: variantToUse
      };

      const res = await fetch('/api/covers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao solicitar geração no backend.');
      }

      const { jobId } = data;

      // Inicia polling de status a cada 750ms
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/covers/status/${jobId}`);
          if (!statusRes.ok) return;
          const statusData = await statusRes.json();

          if (statusData.success) {
            setStepLabel(statusData.stepLabel || 'Processando...');
            setProgressPercent(statusData.progressPercent || 20);

            // Mapeia o índice do progresso visual
            if (statusData.progressPercent < 25) setActiveStepIndex(0);
            else if (statusData.progressPercent < 50) setActiveStepIndex(1);
            else if (statusData.progressPercent < 75) setActiveStepIndex(2);
            else if (statusData.progressPercent < 90) setActiveStepIndex(3);
            else setActiveStepIndex(4);

            if (statusData.status === 'completed') {
              clearInterval(pollIntervalRef.current);
              setIsGenerating(false);

              if (statusData.cover) {
                const newCover = statusData.cover;
                setCovers(prev => [...prev, newCover]);
                setSelectedCoverId(newCover.id);

                // Vincula imediatamente ao projeto
                const updated: BookProject = {
                  ...project,
                  cover_id: newCover.id,
                  coverImageUrl: newCover.fileUrl,
                  stageStatuses: {
                    ...(project.stageStatuses || getDefaultStageStatuses()),
                    'book-cover': 'COMPLETED'
                  }
                };
                onUpdateProject(updated);
                showToast('✨ Capa profissional gerada com sucesso e adicionada ao livro!');
              }
            } else if (statusData.status === 'failed') {
              clearInterval(pollIntervalRef.current);
              setIsGenerating(false);
              setErrorMessage(statusData.error || 'Falha na geração da capa no backend.');
            }
          }
        } catch (pollErr: any) {
          console.warn('Erro na consulta do status da capa:', pollErr.message);
        }
      }, 750);
    } catch (err: any) {
      setIsGenerating(false);
      setErrorMessage(err.message || 'Erro ao conectar ao backend.');
    }
  };

  // Seleciona uma capa como oficial (Regra 17 & 18: não regera, não perde a imagem)
  const handleSelectCover = async (cover: CoverItemMetadata) => {
    setSelectedCoverId(cover.id);

    try {
      await fetch('/api/covers/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, coverId: cover.id })
      });
    } catch {
      // tolerância de rede
    }

    setCovers(prev => prev.map(c => ({ ...c, selected: c.id === cover.id })));

    // Vincula a capa escolhida ao projeto
    const updated: BookProject = {
      ...project,
      cover_id: cover.id,
      coverImageUrl: cover.fileUrl,
      stageStatuses: {
        ...(project.stageStatuses || getDefaultStageStatuses()),
        'book-cover': 'COMPLETED'
      }
    };
    onUpdateProject(updated);
    showToast(`✓ "${cover.title}" selecionada como capa oficial do livro!`);
  };

  // Avança para a próxima etapa (Regra 18 & 19: capa acompanha o livro)
  const handleContinue = () => {
    if (!selectedCoverId && covers.length > 0) {
      handleSelectCover(covers[0]);
    }
    if (onContinue) {
      onContinue();
    }
  };

  const selectedCover = covers.find(c => c.id === selectedCoverId) || covers[0] || null;

  return (
    <div className="cover-ai-studio-root" style={{ padding: '8px 0 32px 0' }}>
      {/* Toast de Notificação */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 10,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 9999,
          fontSize: 13,
          fontWeight: 600,
          border: '1px solid #334155'
        }}>
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CABEÇALHO DA ETAPA */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#2563eb',
            letterSpacing: '0.08em',
            background: '#eff6ff',
            padding: '3px 8px',
            borderRadius: 4,
            display: 'inline-block',
            marginBottom: 4
          }}>
            ETAPA 12: CAPA DO LIVRO
          </span>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '2px 0 4px 0' }}>
            Capa do Livro
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Escolha a capa que representa melhor o seu livro.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Status da Chave Google AI Studio */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: apiKeyStatus.hasKey ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${apiKeyStatus.hasKey ? '#bbf7d0' : '#fde68a'}`,
            padding: '7px 12px',
            borderRadius: 8,
            fontSize: 12
          }}>
            <Key size={14} color={apiKeyStatus.hasKey ? '#16a34a' : '#d97706'} />
            <span style={{ fontWeight: 600, color: apiKeyStatus.hasKey ? '#15803d' : '#92400e' }}>
              {apiKeyStatus.hasKey
                ? `Google AI Studio Conectado (${apiKeyStatus.keyPreview})`
                : 'Chave Google AI Studio'}
            </span>
            <button
              onClick={() => setShowApiKeyPanel(!showApiKeyPanel)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2563eb',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '2px 4px'
              }}
            >
              {apiKeyStatus.hasKey ? 'Alterar' : 'Configurar'}
            </button>
          </div>

          {selectedCover && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '8px 14px',
              borderRadius: 10
            }}>
              <CheckCircle2 size={18} color="#16a34a" />
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', display: 'block' }}>
                  Capa Oficial Vinculada ao Projeto
                </span>
                <span style={{ fontSize: 12, color: '#15803d', fontWeight: 500 }}>
                  Capa {selectedCover.version} ({title})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PAINEL RETRÁTIL: CONFIGURAÇÃO DE CHAVE DO GOOGLE AI STUDIO */}
      {showApiKeyPanel && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: 12,
          padding: '16px 20px',
          margin: '12px 0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Configuração da API do Google AI Studio (Imagen 3)
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                Cole sua API Key do Google AI Studio para gerar capas comerciais em alta resolução com Imagen 3.
              </p>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: '#2563eb',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>Obter Chave no Google AI Studio</span>
              <ExternalLink size={13} />
            </a>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="password"
              placeholder="Cole sua chave AIzaSy... aqui"
              value={inputApiKey}
              onChange={(e) => setInputApiKey(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontFamily: 'monospace'
              }}
            />
            <button
              onClick={handleSaveApiKey}
              disabled={isSavingKey || !inputApiKey.trim()}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: isSavingKey || !inputApiKey.trim() ? 'not-allowed' : 'pointer',
                opacity: isSavingKey || !inputApiKey.trim() ? 0.6 : 1
              }}
            >
              {isSavingKey ? 'Salvando...' : 'Salvar e Ativar Chave'}
            </button>
            <button
              onClick={() => setShowApiKeyPanel(false)}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MENSAGEM DE ERRO (CASO OCORRA) */}
      {errorMessage && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#991b1b',
          fontSize: 13
        }}>
          <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Atenção:</strong> {errorMessage}
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          ESTADO 1: GERANDO SUA CAPA (PROCESSAMENTO NO BACKEND)
          ========================================================================= */}
      {isGenerating && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #bfdbfe',
          borderRadius: 16,
          padding: '40px 32px',
          boxShadow: '0 12px 32px rgba(37, 99, 235, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 24,
          margin: '12px auto',
          maxWidth: 680,
          width: '100%'
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RefreshCw size={26} color="#2563eb" className="spin-anim" />
          </div>

          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              Gerando sua capa...
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              {stepLabel}
            </p>
          </div>

          {/* Barra de Progresso */}
          <div style={{ width: '100%', maxWidth: 460, background: '#f1f5f9', height: 8, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.max(12, progressPercent)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* Lista das 5 Fases Exigidas pela Especificação */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: '100%',
            maxWidth: 360,
            textAlign: 'left',
            marginTop: 8
          }}>
            {progressPhases.map((phase, idx) => {
              const isPast = idx < activeStepIndex;
              const isCurrent = idx === activeStepIndex;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 13,
                    color: isPast ? '#059669' : isCurrent ? '#2563eb' : '#94a3b8',
                    fontWeight: isCurrent ? 700 : isPast ? 600 : 400
                  }}
                >
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: isPast ? '#ecfdf5' : isCurrent ? '#eff6ff' : '#f8fafc',
                    border: `1.5px solid ${isPast ? '#10b981' : isCurrent ? '#2563eb' : '#cbd5e1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11
                  }}>
                    {isPast ? (
                      <Check size={12} color="#10b981" strokeWidth={3} />
                    ) : isCurrent ? (
                      <RefreshCw size={11} color="#2563eb" className="spin-anim" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span>{phase}</span>
                </div>
              );
            })}
          </div>

          <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            O processamento ocorre com total privacidade no backend. Por favor, aguarde.
          </span>
        </div>
      )}

      {/* =========================================================================
          ESTADO 2: NENHUMA CAPA GERADA AINDA (TELA DE BOAS-VINDAS COM 3 DIREÇÕES)
          ========================================================================= */}
      {!isGenerating && covers.length === 0 && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: '40px 28px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            width: 58,
            height: 58,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(37, 99, 235, 0.12)'
          }}>
            <Palette size={28} color="#2563eb" />
          </div>

          <div style={{ maxWidth: 620 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#2563eb',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: '#eff6ff',
              padding: '4px 10px',
              borderRadius: 6
            }}>
              Projeto Editorial Integrado • Seções 24 a 30
            </span>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '10px 0 8px 0' }}>
              Gerador de até 3 Capas Originais com IA
            </h3>
            <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.55, margin: 0 }}>
              A partir do <strong>Cover Brief</strong> exclusivo deste livro (Sinopse, Prefácio, Sumário e Tom), o sistema preparou 3 direções artísticas autênticas e comerciais sem cópia de referências:
            </p>
          </div>

          {/* 3 DIREÇÕES ARTÍSTICAS ORIGINAIS PREPARADAS PELO COVER BRIEF (SEÇÕES 27, 28 E 29) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
            width: '100%',
            maxWidth: 780,
            textAlign: 'left'
          }}>
            {coverBriefData.proposals.map((prop, pIdx) => {
              const variantKey = pIdx === 0 ? 'minimalist' : pIdx === 1 ? 'cinematic' : 'luxury-illustration';
              const badges = ['Direção A', 'Direção B', 'Direção C'];
              const icons = ['✨', '🎬', '🎨'];

              return (
                <div
                  key={prop.directionId}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 4 }}>
                        {badges[pIdx]}
                      </span>
                      <span style={{ fontSize: 14 }}>{icons[pIdx]}</span>
                    </div>
                    <h4 style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                      {prop.directionName}
                    </h4>
                    <p style={{ fontSize: 11.5, color: '#64748b', margin: 0, lineHeight: 1.45 }}>
                      {prop.visualConcept}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartGeneration(variantKey as any, pIdx + 1)}
                    disabled={isGenerating}
                    style={{
                      background: '#ffffff',
                      color: '#2563eb',
                      border: '1.5px solid #bfdbfe',
                      borderRadius: 8,
                      padding: '7px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ⚡ Gerar {badges[pIdx]}
                  </button>
                </div>
              );
            })}
          </div>

          {/* BOTÃO PRINCIPAL: GERAR OPÇÃO 1 (DIREÇÃO A) */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => handleStartGeneration('minimalist', 1)}
              disabled={isGenerating}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '14px 32px',
                fontSize: 15,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              <Sparkles size={18} /> GERAR CAPA (DIREÇÃO VISUAL A)
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          ESTADO 3: GALERIA DE CAPAS GERADAS (CAPA 1, CAPA 2, CAPA 3...)
          ========================================================================= */}
      {!isGenerating && covers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Grid de Capas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24
          }}>
            {covers.map((c) => {
              const isSelected = c.id === selectedCoverId;

              return (
                <div
                  key={c.id}
                  style={{
                    background: '#ffffff',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    borderRadius: 16,
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    boxShadow: isSelected
                      ? '0 12px 30px rgba(37, 99, 235, 0.16)'
                      : '0 4px 14px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {/* Topo do Card */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: isSelected ? '#1d4ed8' : '#475569',
                      background: isSelected ? '#eff6ff' : '#f1f5f9',
                      padding: '3px 10px',
                      borderRadius: 6
                    }}>
                      CAPA {c.version}
                    </span>

                    {isSelected && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#16a34a',
                        background: '#dcfce7',
                        padding: '3px 8px',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <Check size={12} strokeWidth={3} /> Selecionada
                      </span>
                    )}
                  </div>

                  {/* Imagem da Capa em Proporção 2:3 Vertical */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '2 / 3',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: '#090d16',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    position: 'relative'
                  }}>
                    <img
                      src={c.fileUrl}
                      alt={`Capa ${c.version} - ${title}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                      onError={(e) => {
                        // Fallback de imagem caso o path local ainda esteja em sync
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Metadados da Capa */}
                  <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 12 }}>{c.title}</span>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>{c.artStyle || `Capa ${c.version}`}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Proporção 2:3 Vertical KDP • Título Oficial Integrado</span>
                  </div>

                  {/* BOTÃO USAR ESTA CAPA (Regra 17) */}
                  <button
                    onClick={() => handleSelectCover(c)}
                    style={{
                      background: isSelected ? '#10b981' : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '11px 16px',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSelected ? (
                      <><Check size={15} strokeWidth={3} /> CAPA OFICIAL SELECIONADA</>
                    ) : (
                      <><CheckCircle2 size={15} /> USAR ESTA CAPA</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* BARRA DE AÇÕES INFERIOR */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {covers.length < 3 ? (
                <button
                  onClick={() => {
                    const nextVariant = covers.length === 1 ? 'cinematic' : 'luxury-illustration';
                    handleStartGeneration(nextVariant, covers.length + 1);
                  }}
                  disabled={isGenerating}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '11px 22px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Sparkles size={16} /> GERAR OPÇÃO {covers.length + 1} ({covers.length === 1 ? 'DIREÇÃO B: CINEMATOGRÁFICO' : 'DIREÇÃO C: ILUSTRAÇÃO'})
                </button>
              ) : (
                <button
                  onClick={() => handleStartGeneration('minimalist')}
                  disabled={isGenerating}
                  style={{
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '11px 22px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Sparkles size={16} color="#2563eb" /> GERAR NOVA OPÇÃO
                </button>
              )}
            </div>

            {/* BOTÃO CONTINUAR (Regra 18: avança para a próxima etapa sem perder a capa) */}
            <button
              onClick={handleContinue}
              disabled={covers.length === 0}
              style={{
                background: selectedCoverId ? '#16a34a' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                padding: '12px 28px',
                fontSize: 14,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                boxShadow: selectedCoverId ? '0 8px 18px rgba(22, 163, 74, 0.28)' : '0 8px 18px rgba(37, 99, 235, 0.28)',
                transition: 'all 0.15s ease'
              }}
            >
              CONTINUAR <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
