// ============================================================
// PAINEL DE GERAÇÃO ASSISTIDA POR IA (Gemini)
// Componente que permite ao autor controlar o fluxo de geração
// etapa por etapa, aprovando/editando antes de avançar.
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Sparkles, Play, Check, AlertTriangle, ChevronRight,
  Pause, RotateCcw, Zap, BookOpen, Shield, Eye,
  CheckCircle2, XCircle, Loader2, ArrowRight, Settings
} from 'lucide-react';
import { BookProject } from '../../types/book-project';
import { StageId, STAGES, getStageLabel } from '../../types/stages';
import { AiService } from '../../services/ai-service';
import { GeminiBookGeneratorService, GenerationStepResult } from '../../services/gemini-book-generator';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  aiService: AiService;
  currentStage: StageId;
  onNavigateToStage: (stage: StageId) => void;
  onOpenSettings: () => void;
}

interface StepStatus {
  stageId: StageId;
  status: 'pending' | 'generating' | 'preview' | 'approved' | 'error' | 'skipped';
  result?: GenerationStepResult;
  error?: string;
}

export const AssistedGenerationPanel: React.FC<Props> = ({
  project,
  onUpdateProject,
  aiService,
  currentStage,
  onNavigateToStage,
  onOpenSettings
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeminiReady, setIsGeminiReady] = useState<boolean | null>(null);
  const [geminiMessage, setGeminiMessage] = useState('');
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<StageId | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewStage, setPreviewStage] = useState<StageId | null>(null);
  const [chapterWriteIndex, setChapterWriteIndex] = useState(0);
  const generatorRef = useRef<GeminiBookGeneratorService | null>(null);

  // Stages que suportam geração IA
  const AI_GENERATABLE_STAGES: StageId[] = [
    'research', 'book-titles',
    'author-persona', 'purpose', 'author-bio',
    'outline', 'write', 'description'
  ];

  useEffect(() => {
    generatorRef.current = new GeminiBookGeneratorService(aiService);
    checkGeminiStatus();
  }, [aiService]);

  const checkGeminiStatus = async () => {
    if (!generatorRef.current) return;
    const status = await generatorRef.current.isGeminiReady();
    setIsGeminiReady(status.ready);
    setGeminiMessage(status.message);
  };

  // Gerar conteúdo para a etapa atual
  const handleGenerateForStage = useCallback(async (stageId: StageId) => {
    if (!generatorRef.current) return;

    setActiveGeneration(stageId);
    updateStepStatus(stageId, 'generating');

    try {
      let result: GenerationStepResult;

      if (stageId === 'write') {
        // Escrita capítulo por capítulo
        result = await generatorRef.current.generateChapterContent(project, chapterWriteIndex);
      } else {
        result = await generatorRef.current.generateForStage(project, stageId);
      }

      if (result.success) {
        setPreviewData(result.data);
        setPreviewStage(stageId);
        updateStepStatus(stageId, 'preview', result);
      } else {
        updateStepStatus(stageId, 'error', result, result.error);
      }
    } catch (err: any) {
      updateStepStatus(stageId, 'error', undefined, err.message);
    } finally {
      setActiveGeneration(null);
    }
  }, [project, chapterWriteIndex]);

  // Aprovar e aplicar resultado
  const handleApproveResult = useCallback((stageId: StageId) => {
    if (!generatorRef.current || !previewData) return;

    const result: GenerationStepResult = {
      stageId,
      success: true,
      data: previewData
    };

    const updatedProject = generatorRef.current.applyResultToProject(project, result);
    onUpdateProject(updatedProject);
    updateStepStatus(stageId, 'approved');
    setPreviewData(null);
    setPreviewStage(null);

    // Se for escrita, avança para o próximo capítulo
    if (stageId === 'write') {
      const totalChapters = (project.kdpChapters || []).length;
      if (chapterWriteIndex + 1 < totalChapters) {
        setChapterWriteIndex(prev => prev + 1);
      }
    }
  }, [project, previewData, chapterWriteIndex, onUpdateProject]);

  // Rejeitar resultado e regenerar
  const handleRejectResult = useCallback((stageId: StageId) => {
    setPreviewData(null);
    setPreviewStage(null);
    updateStepStatus(stageId, 'pending');
  }, []);

  const updateStepStatus = (stageId: StageId, status: StepStatus['status'], result?: GenerationStepResult, error?: string) => {
    setStepStatuses(prev => {
      const existing = prev.find(s => s.stageId === stageId);
      if (existing) {
        return prev.map(s => s.stageId === stageId ? { ...s, status, result, error } : s);
      }
      return [...prev, { stageId, status, result, error }];
    });
  };

  const getStepStatus = (stageId: StageId): StepStatus['status'] => {
    const found = stepStatuses.find(s => s.stageId === stageId);
    if (found) return found.status;
    // Verifica se a etapa já foi completada no projeto
    const stageStatus = project.stageStatuses?.[stageId];
    if (stageStatus === 'COMPLETED' || stageStatus === 'APPROVED') return 'approved';
    return 'pending';
  };

  const isStageGeneratable = (stageId: StageId) => AI_GENERATABLE_STAGES.includes(stageId);

  // Renderiza ícone de status
  const renderStatusIcon = (status: StepStatus['status']) => {
    switch (status) {
      case 'approved': return <CheckCircle2 size={14} className="text-emerald-400" />;
      case 'generating': return <Loader2 size={14} className="text-blue-400 animate-spin" />;
      case 'preview': return <Eye size={14} className="text-amber-400" />;
      case 'error': return <XCircle size={14} className="text-red-400" />;
      case 'skipped': return <ArrowRight size={14} className="text-slate-500" />;
      default: return <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-600" />;
    }
  };

  // Preview do conteúdo gerado
  const renderPreview = () => {
    if (!previewData || !previewStage) return null;

    const previewContent = typeof previewData === 'string'
      ? previewData
      : JSON.stringify(previewData, null, 2);

    // Extrai resumo legível para apresentação
    const getSummary = (): string => {
      if (typeof previewData === 'string') return previewData.substring(0, 500);
      if (previewData.prose) return previewData.prose.substring(0, 800);
      if (previewData.generatedBio) return previewData.generatedBio;
      if (previewData.generatedPersona) return previewData.generatedPersona;
      if (previewData.generatedProposal) return previewData.generatedProposal;
      if (previewData.fullDescription) return previewData.fullDescription;
      if (previewData.aiAnalysisSummary) return previewData.aiAnalysisSummary;
      if (previewData.topic) return `Tópico: ${previewData.topic}\nPosicionamento: ${previewData.stance || ''}\nDiferencial: ${previewData.standout || ''}`;
      if (previewData.customTitle) return `Título: ${previewData.customTitle}\nSubtítulo: ${previewData.customSubtitle || ''}`;
      if (previewData.kdpChapters) return previewData.kdpChapters.map((ch: any, i: number) => `${i + 1}. ${ch.title}`).join('\n');
      return previewContent.substring(0, 500);
    };

    return (
      <div className="mt-3 p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Prévia — {getStageLabel(previewStage)}
            </span>
          </div>
          <span className="text-xs text-slate-500">Revise antes de aprovar</span>
        </div>

        <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto mb-4 p-3 bg-slate-900/60 rounded-lg border border-slate-700/40">
          {getSummary()}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleApproveResult(previewStage)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/20"
          >
            <Check size={13} /> Aprovar e Aplicar
          </button>
          <button
            onClick={() => handleRejectResult(previewStage)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
          >
            <RotateCcw size={13} /> Regenerar
          </button>
          <button
            onClick={() => { setPreviewData(null); setPreviewStage(null); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  // Botão flutuante quando painel está fechado
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-2xl shadow-blue-600/30 transition-all hover:scale-105 border border-blue-400/20"
        title="Abrir Geração Assistida por IA Gemini"
      >
        <Sparkles size={16} className="text-amber-300" />
        Geração Assistida IA
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[85vh] flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-900/60 to-purple-900/40 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-400" />
          <span className="text-sm font-bold text-white">Geração Assistida — Gemini</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition"
            title="Configurações da IA"
          >
            <Settings size={14} />
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Status da API */}
      <div className={`px-4 py-2 flex items-center gap-2 text-xs border-b ${
        isGeminiReady === true ? 'bg-emerald-950/30 border-emerald-800/30 text-emerald-400' :
        isGeminiReady === false ? 'bg-red-950/30 border-red-800/30 text-red-400' :
        'bg-slate-800/60 border-slate-700/40 text-slate-500'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isGeminiReady === true ? 'bg-emerald-400 animate-pulse' :
          isGeminiReady === false ? 'bg-red-400' :
          'bg-slate-600'
        }`} />
        {isGeminiReady === null ? 'Verificando API Gemini...' :
         isGeminiReady ? 'Gemini Conectado e Pronto' :
         'API Gemini Desconectada'}
        {isGeminiReady === false && (
          <button
            onClick={onOpenSettings}
            className="ml-auto text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Configurar
          </button>
        )}
      </div>

      {/* Lista de Etapas */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {STAGES.filter(s => s.id !== 'resources').map(stage => {
          const status = getStepStatus(stage.id);
          const isGeneratable = isStageGeneratable(stage.id);
          const isCurrentlyGenerating = activeGeneration === stage.id;
          const isActive = currentStage === stage.id;
          const hasPreview = previewStage === stage.id;

          return (
            <div key={stage.id}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition cursor-pointer ${
                  isActive ? 'bg-blue-900/30 border border-blue-700/40' :
                  hasPreview ? 'bg-amber-900/20 border border-amber-700/30' :
                  'hover:bg-slate-800/60 border border-transparent'
                }`}
                onClick={() => onNavigateToStage(stage.id)}
              >
                {renderStatusIcon(status)}

                <span className={`text-xs font-medium flex-1 ${
                  isActive ? 'text-blue-300' :
                  status === 'approved' ? 'text-emerald-300' :
                  'text-slate-400'
                }`}>
                  {stage.number}. {stage.label}
                  {stage.id === 'write' && (project.kdpChapters || []).length > 0 && (
                    <span className="ml-1 text-slate-500">
                      ({(project.kdpChapters || []).filter(ch => ch.prose && ch.prose.length > 100).length}/{(project.kdpChapters || []).length} caps)
                    </span>
                  )}
                </span>

                {isGeneratable && !isCurrentlyGenerating && status !== 'preview' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateForStage(stage.id);
                    }}
                    disabled={isGeminiReady !== true || activeGeneration !== null}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                      isGeminiReady !== true || activeGeneration !== null
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-blue-600/80 hover:bg-blue-500 text-white shadow shadow-blue-600/20'
                    }`}
                    title={`Gerar com IA Gemini`}
                  >
                    <Zap size={10} />
                    {status === 'approved' ? 'Regenerar' : 'Gerar'}
                  </button>
                )}

                {isCurrentlyGenerating && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-900/40 text-blue-400">
                    <Loader2 size={10} className="animate-spin" /> Gerando...
                  </span>
                )}
              </div>

              {/* Seletor de capítulo para etapa de escrita */}
              {stage.id === 'write' && isActive && (project.kdpChapters || []).length > 0 && (
                <div className="ml-8 mt-1 mb-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-500">Capítulo:</span>
                  <select
                    value={chapterWriteIndex}
                    onChange={(e) => setChapterWriteIndex(parseInt(e.target.value))}
                    className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-0.5"
                  >
                    {(project.kdpChapters || []).map((ch, i) => (
                      <option key={i} value={i}>
                        {i + 1}. {ch.title?.substring(0, 30) || `Cap. ${i + 1}`}
                        {ch.prose && ch.prose.length > 100 ? ' ✓' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Preview inline quando ativo */}
              {hasPreview && renderPreview()}

              {/* Erro */}
              {status === 'error' && (
                <div className="ml-8 mt-1 mb-2 flex items-center gap-1.5 text-[10px] text-red-400 bg-red-950/20 px-2.5 py-1.5 rounded-lg border border-red-900/30">
                  <AlertTriangle size={11} />
                  {stepStatuses.find(s => s.stageId === stage.id)?.error || 'Erro desconhecido'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer com ações */}
      <div className="px-4 py-3 border-t border-slate-700/60 bg-slate-800/40">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Shield size={10} />
            Anti-Plágio • Anti-Redundância • Anti-Alucinação
          </div>
        </div>
      </div>
    </div>
  );
};
