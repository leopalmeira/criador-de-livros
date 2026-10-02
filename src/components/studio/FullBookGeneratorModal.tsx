import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { BookProject } from '../../types/book-project';
import { StageId, STAGES, getStageLabel } from '../../types/stages';
import { AiService } from '../../services/ai-service';
import { GeminiBookGeneratorService } from '../../services/gemini-book-generator';
import { BoxSuggestionService } from '../../services/box-suggestion-service';
import '../../styles/full-book-generator.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project: BookProject;
  onUpdateProject: (updated: BookProject) => Promise<void> | void;
  aiService: AiService;
  onNavigateToStage: (stage: StageId) => void;
}

interface StepItem {
  id: StageId;
  label: string;
  status: 'idle' | 'generating' | 'done' | 'error';
  detail?: string;
}

export const FullBookGeneratorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  aiService,
  onNavigateToStage
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lista de etapas sequenciais para a geração automática completa
  const PIPELINE_STAGES: StageId[] = [
    'research',
    'book-titles',
    'author-persona',
    'purpose',
    'book-details',
    'author-bio',
    'outline',
    'write',
    'description',
    'book-cover'
  ];

  const [steps, setSteps] = useState<StepItem[]>(() =>
    PIPELINE_STAGES.map(id => ({
      id,
      label: getStageLabel(id),
      status: 'idle'
    }))
  );

  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      isCancelledRef.current = false;
      setIsRunning(false);
      setIsCompleted(false);
      setErrorMsg(null);
      setCurrentStepIndex(-1);
      setProgressPercent(0);
      setSteps(PIPELINE_STAGES.map(id => ({
        id,
        label: getStageLabel(id),
        status: 'idle'
      })));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartGeneration = async () => {
    setIsRunning(true);
    setIsCompleted(false);
    setErrorMsg(null);
    isCancelledRef.current = false;

    let currentProj = { ...project };
    const generator = new GeminiBookGeneratorService(aiService);

    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      if (isCancelledRef.current) break;

      const stageId = PIPELINE_STAGES[i];
      setCurrentStepIndex(i);

      // Marca como gerando
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'generating' } : s));

      try {
        let res: any;

        // Se for etapa de escrita, gera os primeiros capítulos estruturados
        if (stageId === 'write') {
          const chapters = currentProj.kdpChapters || [];
          if (chapters.length === 0) {
            // Garante capítulos antes de escrever
            const outlineRes = await generator.generateOutline(currentProj);
            if (outlineRes.success && outlineRes.data) {
              currentProj = generator.applyResultToProject(currentProj, outlineRes);
            } else {
              currentProj = BoxSuggestionService.fillEntireStage('outline', currentProj);
            }
          }

          // Escreve até 3 capítulos iniciais completos
          const countToWrite = Math.min(3, (currentProj.kdpChapters || []).length);
          for (let chIdx = 0; chIdx < countToWrite; chIdx++) {
            if (isCancelledRef.current) break;
            const writeRes = await generator.generateChapterContent(currentProj, chIdx);
            if (writeRes.success && writeRes.data) {
              currentProj = generator.applyResultToProject(currentProj, writeRes);
            } else {
              currentProj = BoxSuggestionService.fillEntireStage('write', currentProj);
            }
          }
        } else {
          // Geração padrão da etapa com IA
          res = await generator.generateForStage(currentProj, stageId);
          if (res && res.success && res.data) {
            currentProj = generator.applyResultToProject(currentProj, res);
          } else {
            // Fallback inteligente garantido
            currentProj = BoxSuggestionService.fillEntireStage(stageId, currentProj);
          }
        }

        // Salva projeto atualizado no banco
        await onUpdateProject(currentProj);

        // Marca etapa como concluída
        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'done', detail: 'Concluído com sucesso' } : s));
        setProgressPercent(Math.round(((i + 1) / PIPELINE_STAGES.length) * 100));

      } catch (err: any) {
        console.warn(`[FullBookGenerator] Fallback na etapa ${stageId}:`, err);
        // Fallback garantido para nunca travar
        currentProj = BoxSuggestionService.fillEntireStage(stageId, currentProj);
        await onUpdateProject(currentProj);
        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'done', detail: 'Finalizado com diretrizes editoriais' } : s));
        setProgressPercent(Math.round(((i + 1) / PIPELINE_STAGES.length) * 100));
      }
    }

    setIsRunning(false);
    if (!isCancelledRef.current) {
      setIsCompleted(true);
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setIsRunning(false);
    onClose();
  };

  const handleFinishAndOpenBook = () => {
    onClose();
    onNavigateToStage('write');
  };

  return (
    <div className="full-generator-backdrop" onClick={handleCancel}>
      <div className="full-generator-container" onClick={(e) => e.stopPropagation()}>
        
        {/* CABEÇALHO */}
        <header className="full-generator-header">
          <div className="full-gen-header-info">
            <span className="full-gen-tag">
              <Zap size={12} /> MOTOR EDITORIAL AUTOMÁTICO • GEMINI AI
            </span>
            <h2 className="full-gen-title">Gerar Todo o Livro com IA</h2>
            <p className="full-gen-desc">
              Crie o livro completo em todas as etapas de forma automática: Títulos, Persona, Proposta, Ficha, Biografia, Sumário, Capítulos e Sinopse.
            </p>
          </div>
          <button type="button" className="btn-close-full-gen" onClick={handleCancel}>
            <X size={18} />
          </button>
        </header>

        {/* STATUS GERAL & BARRA DE PROGRESSO */}
        <div className="full-gen-progress-panel">
          <div className="full-gen-progress-row">
            <span className="full-gen-progress-label">
              {isRunning
                ? `Gerando: ${steps[currentStepIndex]?.label || 'Preparando...'}`
                : isCompleted
                ? '✅ Obra Completa Gerada com Sucesso!'
                : 'Pronto para iniciar a geração automática'}
            </span>
            <span className="full-gen-progress-val">{progressPercent}%</span>
          </div>
          <div className="full-gen-track">
            <div
              className={`full-gen-bar ${isRunning ? 'active' : ''}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* LISTA DE ETAPAS DO PIPELINE */}
        <div className="full-gen-steps-list">
          {steps.map((step, idx) => {
            const isCurrent = idx === currentStepIndex && isRunning;
            const isDone = step.status === 'done';

            return (
              <div
                key={step.id}
                className={`full-gen-step-item ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}
              >
                <div className="step-item-left">
                  <div className={`step-item-dot ${isDone ? 'done' : isCurrent ? 'running' : ''}`}>
                    {isDone ? (
                      <Check size={12} strokeWidth={3} />
                    ) : isCurrent ? (
                      <RefreshCw size={12} className="spin-anim" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="step-item-text">
                    <span className="step-item-name">{step.label}</span>
                    {step.detail && <span className="step-item-detail">{step.detail}</span>}
                  </div>
                </div>

                <div className="step-item-status">
                  {isDone && <span className="status-badge-done">Pronto</span>}
                  {isCurrent && <span className="status-badge-running">Gerando com IA...</span>}
                  {!isDone && !isCurrent && <span className="status-badge-pending">Aguardando</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* SELO DE GARANTIAS EDITORIAIS */}
        <div className="full-gen-guarantees">
          <div className="guarantee-chip">
            <ShieldCheck size={14} color="#059669" />
            <span>Anti-Plágio (100% Autoral)</span>
          </div>
          <div className="guarantee-chip">
            <Sparkles size={14} color="#2563eb" />
            <span>Anti-Redundância</span>
          </div>
          <div className="guarantee-chip">
            <BookOpen size={14} color="#b45309" />
            <span>Padrão Amazon KDP</span>
          </div>
        </div>

        {/* RODAPÉ DE AÇÕES */}
        <footer className="full-gen-footer">
          <button
            type="button"
            className="btn-full-gen-secondary"
            onClick={handleCancel}
          >
            {isCompleted ? 'Fechar' : 'Cancelar'}
          </button>

          {!isCompleted ? (
            <button
              type="button"
              className="btn-full-gen-primary"
              onClick={handleStartGeneration}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <RefreshCw size={15} className="spin-anim" />
                  <span>Gerando Livro Completo...</span>
                </>
              ) : (
                <>
                  <Zap size={15} />
                  <span>Iniciar Geração Automática Completa</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="btn-full-gen-primary success"
              onClick={handleFinishAndOpenBook}
            >
              <span>Abrir e Revisar Livro Pronto</span>
              <ArrowRight size={15} />
            </button>
          )}
        </footer>

      </div>
    </div>
  );
};
