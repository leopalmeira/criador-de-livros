import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BookOpen, 
  Home, 
  GitFork, 
  Layers, 
  Palette, 
  Image as ImageIcon, 
  Tag, 
  ShieldCheck, 
  Download, 
  Settings as SettingsIcon, 
  Plus, 
  Eye, 
  History, 
  Wand2, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { db } from '../../database/local-database';
import { BookProject, BookVersionItem, BookMemory, TrimSize, IBookChapter, EditorialStageKey, StageStatus } from '../../types/book-project';
import { AiService } from '../../services/ai-service';
import { PageEngine } from '../../services/page-engine';
import { FullBookRunner } from '../../services/full-book-runner';
import { DashboardView } from './DashboardView';
import { WizardNewBook } from './WizardNewBook';
import { EditorialSidebar } from './EditorialSidebar';
import { VisualBookEditor } from './VisualBookEditor';
import { ImageLibraryView } from './ImageLibraryView';
import { MetadataPublishView } from './MetadataPublishView';
import { ExportQualityView } from './ExportQualityView';
import { BookMemoryModal } from './BookMemoryModal';
import { FullScreenPreviewModal } from './FullScreenPreviewModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { CoverStudioTab } from '../../dashboard/components/CoverStudioTab';
import { SettingsTab } from '../../dashboard/components/SettingsTab';
import { ConceptPlanningView } from './ConceptPlanningView';
import { OutlinePlanningView } from './OutlinePlanningView';
import { EditorialReviewView } from './EditorialReviewView';
import { ResearchView } from './ResearchView';
import { AnalyticsView } from './AnalyticsView';
import { TitlesView } from './TitlesView';
import { ResourcesView } from './ResourcesView';
import { PersonaView } from './PersonaView';
import { PurposeView } from './PurposeView';
import { DetailsView } from './DetailsView';
import { BioView } from './BioView';

export type StudioView = 
  | 'dashboard' 
  | 'wizard' 
  | 'research'
  | 'analytics'
  | 'titles'
  | 'resources'
  | 'persona'
  | 'purpose'
  | 'details'
  | 'bio'
  | 'outline'
  | 'editor' 
  | 'revision'
  | 'cover' 
  | 'images' 
  | 'description'
  | 'export' 
  | 'settings';

const EDITORIAL_STAGE_VIEWS: Record<EditorialStageKey, StudioView> = {
  research: 'research',
  analytics: 'analytics',
  titles: 'titles',
  resources: 'resources',
  persona: 'persona',
  purpose: 'purpose',
  details: 'details',
  bio: 'bio',
  outline: 'outline',
  write: 'editor',
  description: 'description',
  cover: 'cover',
  finish: 'export'
};

const getEditorialStageForView = (view: StudioView, fallback: EditorialStageKey): EditorialStageKey => {
  return (Object.entries(EDITORIAL_STAGE_VIEWS).find(([, stageView]) => stageView === view)?.[0] as EditorialStageKey | undefined)
    || fallback;
};

export const BookStudioApp: React.FC = () => {
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [activeProject, setActiveProject] = useState<BookProject | null>(null);
  const [activeView, setActiveView] = useState<StudioView>('dashboard');
  const [selectedEditorChapter, setSelectedEditorChapter] = useState<number | undefined>(undefined);
  const [aiService, setAiService] = useState<AiService>(() => new AiService({ provider: 'local-builtin' }));

  // Modais globais
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  // Status de autosave
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState('');

  // Status de execução do pipeline modular de IA
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineStageName, setPipelineStageName] = useState('');
  const [pipelinePercent, setPipelinePercent] = useState(0);
  const [pipelineRunSummary, setPipelineRunSummary] = useState<{ written: number; failed: number } | null>(null);
  const cancelRunRef = useRef(false);

  // Carrega projetos e configurações do IndexedDB
  const reloadProjects = useCallback(async () => {
    try {
      const all = await db.getAllBookProjects();
      setProjects(all);
      if (all.length > 0 && !activeProject) {
        setActiveProject(all[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
    }
  }, [activeProject]);

  useEffect(() => {
    reloadProjects();
    db.getSettings().then(st => {
      if (st?.aiSettings) {
        setAiService(new AiService(st.aiSettings));
      }
    }).catch(() => {});
  }, [reloadProjects]);

  // Atualização de projeto com persistência automática no IndexedDB
  const handleUpdateProject = async (updated: BookProject) => {
    setActiveProject(updated);
    setIsAutosaving(true);
    try {
      await db.saveBookProject(updated);
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      setLastSavedTime(new Date().toLocaleTimeString());
    } finally {
      setTimeout(() => setIsAutosaving(false), 300);
    }
  };

  const handleUpdateStageStatus = async (
    stageKey: EditorialStageKey,
    status: StageStatus,
    reviewNotes?: string
  ) => {
    if (!activeProject) return;
    const now = Date.now();
    const previousProgress = activeProject.stageProgress || [];
    const previousApprovals = activeProject.stageApprovals || [];
    const currentProgress = previousProgress.find(stage => stage.stageKey === stageKey);
    const currentApproval = previousApprovals.find(stage => stage.stageKey === stageKey);
    const previousStatus = currentApproval?.status || currentProgress?.status || 'NOT_STARTED';
    const updatedProgress = currentProgress
      ? previousProgress.map(stage => stage.stageKey === stageKey
          ? { ...stage, status, progress: status === 'APPROVED' ? 100 : stage.progress, lastUpdated: now }
          : stage)
      : [...previousProgress, {
          stageKey,
          status,
          progress: status === 'APPROVED' ? 100 : 0,
          lastUpdated: now
        }];
    const updatedApprovals = currentApproval
      ? previousApprovals.map(stage => stage.stageKey === stageKey
          ? {
              ...stage,
              status,
              previousStatus,
              approvedAt: status === 'APPROVED' ? now : undefined,
              approvedBy: status === 'APPROVED' ? 'user' : undefined,
              reviewNotes
            }
          : stage)
      : [...previousApprovals, {
          stageKey,
          status,
          previousStatus,
          approvedAt: status === 'APPROVED' ? now : undefined,
          approvedBy: status === 'APPROVED' ? 'user' : undefined,
          reviewNotes
        }];

    await handleUpdateProject({
      ...activeProject,
      currentStage: stageKey,
      stageProgress: updatedProgress,
      stageApprovals: updatedApprovals
    });
  };

  // Abrir projeto específico
  const handleOpenProject = (projectId: string, targetView: StudioView = 'research') => {
    const found = projects.find(p => p.id === projectId);
    if (found) {
      const ensured = PageEngine.ensureProjectSettings(found);
      setActiveProject(ensured);
      setActiveView(targetView);
    }
  };

  // Duplicar projeto
  const handleDuplicateProject = async (projectId: string) => {
    const source = projects.find(p => p.id === projectId);
    if (!source) return;

    const duplicated: BookProject = {
      ...source,
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: `${source.title} (Cópia)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.saveBookProject(duplicated);
    await reloadProjects();
    setActiveProject(duplicated);
    setActiveView('research');
  };

  // Excluir projeto
  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta obra?')) return;
    await db.deleteBookProject(projectId);
    await reloadProjects();
    if (activeProject?.id === projectId) {
      const remaining = projects.filter(p => p.id !== projectId);
      setActiveProject(remaining.length > 0 ? remaining[0] : null);
      setActiveView('dashboard');
    }
  };

  // Criar novo projeto a partir do Wizard
  const handleCreateProjectFromWizard = async (newProject: BookProject, autoStages: string[]) => {
    const proj = PageEngine.ensureProjectSettings(newProject);

    await db.saveBookProject(proj);
    setActiveProject(proj);
    setProjects(prev => [proj, ...prev]);
    setActiveView('research');

    if (autoStages.includes('full_book') || autoStages.length === 0) {
      executeAutoPipeline(proj, ['complete_all']);
    } else {
      executeAutoPipeline(proj, autoStages);
    }
  };

  // Executa a produção autônoma com o orquestrador: retomável e isolado por etapa
  const executeAutoPipeline = async (projectToRun: BookProject, stages: string[], force = false) => {
    cancelRunRef.current = false;
    setIsPipelineRunning(true);
    setPipelinePercent(0);
    setPipelineRunSummary(null);
    setPipelineStageName(
      stages.includes('complete_all')
        ? 'Preparando a produção completa da obra...'
        : 'Preparando o pipeline editorial...'
    );

    const runner = new FullBookRunner(
      projectToRun,
      aiService,
      {
        stages,
        force,
        reviewEachChapter: true,
        downloadPackage: stages.includes('complete_all')
      },
      {
        onProgress: (percent, label) => {
          setPipelinePercent(percent);
          setPipelineStageName(label);
        },
        shouldCancel: () => cancelRunRef.current,
        onProjectChange: async (updated) => {
          await handleUpdateProject(updated);
        },
        onDownload: (blob, filename) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        onFinished: (_updated, summary) => {
          setPipelineRunSummary({
            written: summary.chaptersWritten,
            failed: summary.failedStages.length
          });
        }
      }
    );

    try {
      await runner.run();
    } catch (err: any) {
      console.warn('Falha ao executar a produção autônoma:', err);
      await handleUpdateProject(runner.project);
    } finally {
      setTimeout(() => {
        setIsPipelineRunning(false);
        setPipelineStageName('');
      }, 900);
    }
  };

  // Botão "Concluir toda a produção" da linha de produção
  const handleCompleteProduction = (projectToRun: BookProject) => {
    executeAutoPipeline(projectToRun, ['complete_all']);
  };

  // Restauração e Criação de Versões
  const handleSaveNewVersion = async (name: string, summary: string) => {
    if (!activeProject) return;
    const count = (activeProject.versions || []).length + 1;
    const newVer: BookVersionItem = {
      id: `ver_${Date.now()}`,
      versionTag: `v1.${count}`,
      name,
      timestamp: Date.now(),
      summary,
      snapshotJson: JSON.stringify(activeProject)
    };
    const updated = {
      ...activeProject,
      versions: [newVer, ...(activeProject.versions || [])]
    };
    await handleUpdateProject(updated);
  };

  const handleRestoreVersion = async (ver: BookVersionItem) => {
    try {
      const restored = JSON.parse(ver.snapshotJson) as BookProject;
      restored.updatedAt = Date.now();
      await handleUpdateProject(restored);
    } catch {
      alert('Erro ao restaurar versão.');
    }
  };

  return (
    <div className="book-studio-workspace">
      {/* TOP BAR - MINIMAL */}
      <header className="studio-topbar-minimal">
        <div className="topbar-left">
          <div className="studio-brand-logo" onClick={() => setActiveView('dashboard')}>
            <div className="brand-logo-icon">
              <BookOpen size={20} />
            </div>
            <div className="brand-titles">
              <span className="brand-name">BOOK STUDIO</span>
              <span className="brand-edition">KDP Edition</span>
            </div>
          </div>

          {activeProject && (
            <div className="topbar-project-selector">
              <select 
                className="select-active-book"
                value={activeProject.id}
                onChange={(e) => handleOpenProject(e.target.value, 'research')}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="topbar-right">
          {/* AUTOSAVE */}
          {activeProject && (
            <div className="autosave-tag" title={`Último salvamento: ${lastSavedTime || 'recente'}`}>
              {isAutosaving ? (
                <span className="text-blue-400 flex items-center gap-1">
                  <RefreshCw size={12} className="spin-animate" /> Salvando...
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check size={13} /> Salvo ✓
                </span>
              )}
            </div>
          )}

          {/* PIPELINE PROGRESS */}
          {isPipelineRunning && (
            <div className="pipeline-mini-bar">
              <RefreshCw size={14} className="spin-animate text-amber-400" />
              <span className="pipeline-stage-text">{pipelineStageName}</span>
              <span className="pipeline-pct-text">{pipelinePercent}%</span>
              <button className="btn-pipeline-cancel" onClick={() => { cancelRunRef.current = true; }}>
                Parar
              </button>
            </div>
          )}

          {/* GLOBAL ACTIONS */}
          {activeProject && (
            <>
              <button className="btn-topbar-action" onClick={() => setIsMemoryModalOpen(true)} title="Memória Contextual">
                <Wand2 size={15} className="text-amber-400" />
              </button>
              <button className="btn-topbar-action" onClick={() => setIsVersionModalOpen(true)} title="Histórico de Versões">
                <History size={15} />
              </button>
              <button className="btn-topbar-action" onClick={() => setIsPreviewModalOpen(true)} title="Preview Tela Cheia">
                <Eye size={15} />
              </button>
            </>
          )}

          <button className="btn-new-book-accent" onClick={() => setActiveView('wizard')}>
            <Plus size={15} />
            <span>Novo Livro</span>
          </button>
        </div>
      </header>

      {/* PIPELINE RESULT BANNER */}
      {!isPipelineRunning && pipelineRunSummary && (
        <div className={`pipeline-result-banner ${pipelineRunSummary.failed > 0 ? 'has-failures' : ''}`}>
          {pipelineRunSummary.failed > 0 ? (
            <>
              <AlertTriangle size={14} className="text-amber-400" />
              <span>Produção concluída com {pipelineRunSummary.failed} pendência(s). Clique em "Concluir Tudo" na sidebar para retomar.</span>
            </>
          ) : (
            <>
              <Check size={14} className="text-emerald-400" />
              <span>Obra finalizada: {pipelineRunSummary.written > 0 ? `${pipelineRunSummary.written} capítulo(s)` : ''}. Arquivos prontos em Exportar.</span>
            </>
          )}
          <button className="btn-pipeline-dismiss" onClick={() => setPipelineRunSummary(null)}>Fechar</button>
        </div>
      )}

      {/* MAIN LAYOUT: SIDEBAR + CONTENT */}
      <div className="studio-main-layout">
        {/* EDITORIAL SIDEBAR - 13 STAGES */}
        {activeProject && (
          <aside className="editorial-sidebar-container">
            <EditorialSidebar
              project={activeProject}
              onNavigateToStage={(stageKey) => setActiveView(EDITORIAL_STAGE_VIEWS[stageKey])}
              onApproveStage={(stageKey) => { void handleUpdateStageStatus(stageKey, 'APPROVED'); }}
              onRequestChangesStage={(stageKey) => {
                const notes = window.prompt('Descreva as alterações solicitadas:');
                if (notes !== null) void handleUpdateStageStatus(stageKey, 'REJECTED', notes.trim());
              }}
              onViewResult={(stageKey) => setActiveView(EDITORIAL_STAGE_VIEWS[stageKey])}
              onExecuteStage={(stageKey) => {
                if (stageKey === 'research') {
                  handleCompleteProduction(activeProject);
                }
              }}
              currentStage={getEditorialStageForView(activeView, activeProject.currentStage)}
              isRunning={isPipelineRunning}
            />
          </aside>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="studio-main-content">
          {!activeProject && activeView !== 'wizard' ? (
            <DashboardView
              projects={projects}
              onOpenProject={(id) => handleOpenProject(id, 'research')}
              onCreateNewBook={() => setActiveView('wizard')}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
              onSelectTemplate={() => setActiveView('wizard')}
            />
          ) : (
            <>
              {activeView === 'wizard' && (
                <WizardNewBook
                  onCancel={() => setActiveView('dashboard')}
                  onCreateProject={handleCreateProjectFromWizard}
                  aiService={aiService}
                />
              )}

              {/* STAGE VIEWS - mapped to 13 stages */}
              {activeView === 'research' && activeProject && (
                <div className="stage-page-layout p-6">
                  <ResearchView project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />
                </div>
              )}

              {activeView === 'analytics' && activeProject && (
                <div className="stage-page-layout p-6">
                  <AnalyticsView project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />
                </div>
              )}

              {activeView === 'titles' && activeProject && (
                <div className="stage-page-layout p-6">
                  <TitlesView project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />
                </div>
              )}

              {activeView === 'resources' && activeProject && (
                <div className="stage-page-layout p-6">
                  <ResourcesView project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />
                </div>
              )}

              {activeView === 'persona' && activeProject && (
                <div className="stage-page-layout p-6">
                  <PersonaView project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />
                </div>
              )}

              {activeView === 'purpose' && activeProject && (
                <div className="stage-page-layout p-6">
                  <PurposeView project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />
                </div>
              )}

              {activeView === 'details' && activeProject && (
                <div className="stage-page-layout p-6">
                  <DetailsView project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />
                </div>
              )}

              {activeView === 'bio' && activeProject && (
                <div className="stage-page-layout p-6">
                  <BioView project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />
                </div>
              )}

              {activeView === 'outline' && activeProject && (
                <div className="stage-page-layout p-6">
                  <OutlinePlanningView
                    project={activeProject}
                    onUpdateProject={handleUpdateProject}
                    onNavigateToEditorChapter={(chapterIndex) => {
                      setSelectedEditorChapter(chapterIndex);
                      setActiveView('editor');
                    }}
                    aiService={aiService}
                  />
                </div>
              )}

              {activeView === 'editor' && activeProject && (
                <VisualBookEditor
                  project={activeProject}
                  onUpdateProject={handleUpdateProject}
                  onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
                  onOpenPreview={() => setIsPreviewModalOpen(true)}
                  initialChapterIndex={selectedEditorChapter}
                />
              )}

              {activeView === 'revision' && activeProject && (
                <div className="stage-page-layout p-6">
                  <EditorialReviewView
                    project={activeProject}
                    onUpdateProject={handleUpdateProject}
                    onNavigateToChapter={(chapterIndex) => {
                      setSelectedEditorChapter(chapterIndex);
                      setActiveView('editor');
                    }}
                    aiService={aiService}
                  />
                </div>
              )}

              {activeView === 'cover' && activeProject && (
                <div className="stage-page-layout p-4">
                  <CoverStudioTab
                    initialProjectId={activeProject.id}
                    onOpenBookCreator={() => setActiveView('editor')}
                  />
                </div>
              )}

              {activeView === 'images' && activeProject && (
                <div className="stage-page-layout p-6">
                  <ImageLibraryView
                    project={activeProject}
                    onUpdateProject={handleUpdateProject}
                    onNavigateToEditor={() => setActiveView('editor')}
                  />
                </div>
              )}

              {activeView === 'description' && activeProject && (
                <div className="stage-page-layout p-6">
                  <MetadataPublishView
                    project={activeProject}
                    onUpdateProject={handleUpdateProject}
                    aiService={aiService}
                  />
                </div>
              )}

              {activeView === 'export' && activeProject && (
                <div className="stage-page-layout p-6">
                  <ExportQualityView
                    project={activeProject}
                    onUpdateProject={handleUpdateProject}
                    aiService={aiService}
                  />
                </div>
              )}

              {activeView === 'settings' && (
                <div className="stage-page-layout p-6">
                  <SettingsTab />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* GLOBAL MODALS */}
      {activeProject && (
        <>
          <BookMemoryModal
            project={activeProject}
            isOpen={isMemoryModalOpen}
            onClose={() => setIsMemoryModalOpen(false)}
            onSave={(updatedMemory) => handleUpdateProject({ ...activeProject, bookMemory: updatedMemory })}
          />

          <FullScreenPreviewModal
            project={activeProject}
            isOpen={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
          />

          <VersionHistoryModal
            project={activeProject}
            isOpen={isVersionModalOpen}
            onClose={() => setIsVersionModalOpen(false)}
            onRestoreVersion={handleRestoreVersion}
            onSaveNewVersion={handleSaveNewVersion}
            onDuplicateProject={() => handleDuplicateProject(activeProject.id)}
          />
        </>
      )}
    </div>
  );
};
