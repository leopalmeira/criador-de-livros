import React, { useState, useMemo } from 'react';
import { 
  Search, 
  BarChart2, 
  Type, 
  Library, 
  User, 
  Target, 
  BookOpen, 
  PenTool, 
  ListOrdered, 
  FileText, 
  Image, 
  CheckCircle2,
  ChevronRight,
  Check,
  Clock,
  AlertTriangle,
  Circle,
  Lock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { 
  BookProject, 
  StageProgress, 
  StageApproval,
  EditorialStageKey,
  EDITORIAL_STAGES,
  StageStatus
} from '../../types/book-project';

interface EditorialSidebarProps {
  project: BookProject;
  onNavigateToStage: (stageKey: EditorialStageKey) => void;
  onExecuteStage: (stageKey: EditorialStageKey) => void;
  onApproveStage: (stageKey: EditorialStageKey) => void;
  onRequestChangesStage: (stageKey: EditorialStageKey) => void;
  onViewResult: (stageKey: EditorialStageKey) => void;
  currentStage: EditorialStageKey;
  isRunning?: boolean;
}

const STAGE_ICONS: Record<EditorialStageKey, any> = {
  research: Search,
  analytics: BarChart2,
  titles: Type,
  resources: Library,
  persona: User,
  purpose: Target,
  details: BookOpen,
  bio: PenTool,
  outline: ListOrdered,
  write: PenTool,
  description: FileText,
  cover: Image,
  finish: CheckCircle2
};

const STATUS_COLORS: Record<StageStatus, string> = {
  NOT_STARTED: 'text-slate-500',
  IN_PROGRESS: 'text-amber-400',
  REVIEW: 'text-blue-400',
  APPROVED: 'text-emerald-400',
  COMPLETED: 'text-emerald-400',
  DRAFT: 'text-slate-400',
  GENERATING: 'text-amber-400',
  GENERATED: 'text-blue-400',
  REJECTED: 'text-rose-400',
  ERROR: 'text-rose-500'
};

export const EditorialSidebar: React.FC<EditorialSidebarProps> = ({
  project,
  onNavigateToStage,
  onExecuteStage,
  onApproveStage,
  onRequestChangesStage,
  onViewResult,
  currentStage,
  isRunning = false
}) => {
  const [expandedStage, setExpandedStage] = useState<EditorialStageKey | null>(currentStage);

  const stageProgressMap = useMemo(() => {
    const map = new Map<EditorialStageKey, StageProgress>();
    project.stageProgress?.forEach(sp => map.set(sp.stageKey, sp));
    return map;
  }, [project.stageProgress]);

  const stageApprovalMap = useMemo(() => {
    const map = new Map<EditorialStageKey, StageApproval>();
    project.stageApprovals?.forEach(sa => map.set(sa.stageKey, sa));
    return map;
  }, [project.stageApprovals]);

  const getStageStatus = (stageKey: EditorialStageKey): StageStatus => {
    return stageProgressMap.get(stageKey)?.status || 'NOT_STARTED';
  };

  const getStageProgress = (stageKey: EditorialStageKey): number => {
    return stageProgressMap.get(stageKey)?.progress || 0;
  };

  const canAccessStage = (stageKey: EditorialStageKey): boolean => {
    const stageOrder: EditorialStageKey[] = [
      'research', 'analytics', 'titles', 'resources',
      'persona', 'purpose', 'details', 'bio',
      'outline', 'write', 'description', 'cover', 'finish'
    ];
    const currentIndex = stageOrder.indexOf(currentStage);
    const targetIndex = stageOrder.indexOf(stageKey);
    return targetIndex <= currentIndex + 1;
  };

  const isStageCompleted = (stageKey: EditorialStageKey): boolean => {
    const status = getStageStatus(stageKey);
    return ['APPROVED', 'COMPLETED'].includes(status);
  };

  const renderStatusIcon = (stageKey: EditorialStageKey) => {
    const status = getStageStatus(stageKey);
    const progress = getStageProgress(stageKey);
    const isCurrent = stageKey === currentStage;
    
    if (status === 'COMPLETED' || status === 'APPROVED') {
      return <Check size={14} className="text-emerald-400" />;
    }
    if (status === 'IN_PROGRESS' || status === 'GENERATING') {
      return <Clock size={14} className="text-amber-400 animate-pulse" />;
    }
    if (status === 'REVIEW') {
      return <AlertTriangle size={14} className="text-blue-400" />;
    }
    if (status === 'ERROR' || status === 'REJECTED') {
      return <AlertTriangle size={14} className="text-rose-500" />;
    }
    if (isCurrent) {
      return <Sparkles size={14} className="text-primary-accent animate-pulse" />;
    }
    return <Circle size={14} className="text-slate-500" />;
  };

  const handleStageClick = (stageKey: EditorialStageKey) => {
    if (!canAccessStage(stageKey)) return;
    setExpandedStage(prev => prev === stageKey ? null : stageKey);
    onNavigateToStage(stageKey);
  };

  const handleExecuteStage = (e: React.MouseEvent, stageKey: EditorialStageKey) => {
    e.stopPropagation();
    if (!canAccessStage(stageKey)) return;
    onExecuteStage(stageKey);
  };

  return (
    <div className="editorial-sidebar">
      {/* PROJECT HEADER */}
      <div className="sidebar-project-header">
        <div className="project-info">
          <div className="project-title-row">
            <span className="project-title">{project.title || 'Livro Sem Título'}</span>
            {project.subtitle && <span className="project-subtitle">{project.subtitle}</span>}
          </div>
          <div className="project-meta-row">
            <span className="project-type-badge">{project.kdpBookType}</span>
            <span className="project-format">{project.trimSize} • {project.paperType}</span>
          </div>
        </div>
        
        {/* OVERALL PROGRESS */}
        <div className="sidebar-overall-progress">
          <div className="progress-header">
            <span className="progress-label">Progresso Geral</span>
            <span className="progress-value">{project.pipelineProgress}%</span>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${project.pipelineProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 13 STAGES LIST */}
      <nav className="sidebar-stages-nav" role="navigation" aria-label="Etapas editoriais">
        <ul className="stages-list">
          {EDITORIAL_STAGES.map((stageDef, index) => {
            const stageKey = stageDef.key;
            const status = getStageStatus(stageKey);
            const progress = getStageProgress(stageKey);
            const accessible = canAccessStage(stageKey);
            const completed = isStageCompleted(stageKey);
            const isCurrent = stageKey === currentStage;
            const isExpanded = expandedStage === stageKey;
            const Icon = STAGE_ICONS[stageKey];
            const approval = stageApprovalMap.get(stageKey);

            return (
              <li 
                key={stageKey} 
                className={`stage-item ${isCurrent ? 'current' : ''} ${completed ? 'completed' : ''} ${!accessible ? 'locked' : ''} ${status === 'IN_PROGRESS' ? 'in-progress' : ''}`}
              >
                {/* MAIN STAGE BUTTON */}
                <div
                  className="stage-main-button"
                  role="button"
                  tabIndex={accessible ? 0 : -1}
                  aria-disabled={!accessible}
                  onClick={() => handleStageClick(stageKey)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleStageClick(stageKey);
                    }
                  }}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-expanded={isExpanded}
                >
                  <div className="stage-indicator">
                    <span className="stage-number">{stageDef.id}</span>
                    {renderStatusIcon(stageKey)}
                  </div>
                  
                  <div className="stage-content">
                    <div className="stage-header">
                      <Icon size={16} className={`stage-icon ${STATUS_COLORS[status]}`} />
                      <span className="stage-label">{stageDef.label}</span>
                      {isCurrent && <span className="current-badge">ATUAL</span>}
                    </div>
                    <span className="stage-description">{stageDef.description}</span>
                    {progress > 0 && progress < 100 && (
                      <div className="stage-mini-progress">
                        <div className="mini-progress-bar">
                          <div className="mini-progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="mini-progress-text">{progress}%</span>
                      </div>
                    )}
                  </div>

                  <div className="stage-actions">
                    {accessible && !completed && (
                      <button
                        className="stage-execute-btn"
                        onClick={(e) => handleExecuteStage(e, stageKey)}
                        disabled={isRunning}
                        title={`Executar ${stageDef.label} com IA`}
                      >
                        <Sparkles size={12} className="text-amber-400" />
                      </button>
                    )}
                    <ChevronRight 
                      size={14} 
                      className={`chevron ${isExpanded ? 'expanded' : ''} ${STATUS_COLORS[status]}`}
                    />
                  </div>
                </div>

                {/* EXPANDED DETAILS */}
                {isExpanded && accessible && (
                  <div className="stage-expanded-panel">
                    <div className="expanded-status">
                      <span className={`status-pill ${status.toLowerCase()}`}>
                        {status.replace('_', ' ')}
                      </span>
                      {approval?.reviewNotes && (
                        <span className="review-notes">💬 {approval.reviewNotes}</span>
                      )}
                    </div>

                    <div className="expanded-actions">
                      {status === 'NOT_STARTED' && accessible && (
                        <button 
                          className="btn-start-stage"
                          onClick={(e) => { e.stopPropagation(); onExecuteStage(stageKey); }}
                        >
                          <Sparkles size={13} /> Iniciar com IA
                        </button>
                      )}
                      {status === 'IN_PROGRESS' && (
                        <span className="in-progress-label">
                          <Clock size={12} className="animate-pulse" /> Em andamento...
                        </span>
                      )}
                      {status === 'REVIEW' && (
                        <div className="review-actions">
                          <button className="btn-approve" onClick={(e) => { e.stopPropagation(); onApproveStage(stageKey); }}>
                            <Check size={13} /> Aprovar
                          </button>
                          <button className="btn-request-changes" onClick={(e) => { e.stopPropagation(); onRequestChangesStage(stageKey); }}>
                            Solicitar alterações
                          </button>
                        </div>
                      )}
                      {['APPROVED', 'COMPLETED'].includes(status) && (
                        <button className="btn-view-result" onClick={(e) => { e.stopPropagation(); onViewResult(stageKey); }}>
                          <ArrowRight size={13} /> Ver resultado
                        </button>
                      )}
                    </div>

                    {/* QUICK STATS */}
                    <div className="expanded-stats">
                      {progress > 0 && <span>Progresso: {progress}%</span>}
                      {approval?.approvedAt && <span>Aprovado em: {new Date(approval.approvedAt).toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* AI DIRECTOR BANNER (when not 100%) */}
      {project.pipelineProgress < 100 && (
        <div className="ai-director-banner-sidebar">
          <div className="ai-director-info">
            <Sparkles size={18} className="text-amber-400" />
            <div>
              <strong>Diretor Editorial IA</strong>
              <p>Pode concluir etapas restantes automaticamente</p>
            </div>
          </div>
          <button 
            className="btn-ai-complete-all"
            onClick={() => onExecuteStage('research')} // Will trigger complete_all in parent
            disabled={isRunning}
          >
            ⚡ Concluir Tudo
          </button>
        </div>
      )}

      {project.pipelineProgress === 100 && (
        <div className="completion-banner-sidebar">
          <CheckCircle2 size={20} className="text-emerald-400" />
          <span>Obra 100% concluída!</span>
        </div>
      )}
    </div>
  );
};

export default EditorialSidebar;