import React, { useState, useEffect, useCallback } from 'react';
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
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { db } from '../../database/local-database';
import { BookProject, BookVersionItem, BookMemory, TrimSize, IBookChapter } from '../../types/book-project';
import { AiService } from '../../services/ai-service';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { PageEngine } from '../../services/page-engine';
import { ImageGenerationService } from '../../services/image-generation-service';
import { DashboardView } from './DashboardView';
import { WizardNewBook } from './WizardNewBook';
import { ProductionTreeView } from './ProductionTreeView';
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

export type StudioView = 
  | 'dashboard' 
  | 'wizard' 
  | 'tree' 
  | 'concept'
  | 'outline'
  | 'editor' 
  | 'revision'
  | 'cover' 
  | 'images' 
  | 'metadata' 
  | 'export' 
  | 'settings';

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

  // Abrir projeto específico
  const handleOpenProject = (projectId: string, targetView: StudioView = 'tree') => {
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
    setActiveView('tree');
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
    let proj = PageEngine.ensureProjectSettings(newProject);
    proj.visualPages = PageEngine.generateVisualPagesFromManuscript(proj);

    await db.saveBookProject(proj);
    setActiveProject(proj);
    setProjects(prev => [proj, ...prev]);

    if (autoStages.length > 0) {
      setActiveView('tree');
      executeAutoPipeline(proj, autoStages);
    } else {
      setActiveView('tree');
    }
  };

  // Executa pipeline de IA de forma modular com feedback ao vivo
  const executeAutoPipeline = async (projectToRun: BookProject, stages: string[]) => {
    setIsPipelineRunning(true);
    setPipelinePercent(10);
    let workingProject = { ...projectToRun };
    const pipeline = new KdpBookPipeline(aiService);

    try {
      // 1. CONCEITO
      if (stages.includes('concept')) {
        setPipelineStageName('Criando conceito editorial e promessa...');
        setPipelinePercent(25);
        const concept = await pipeline.generateConcept(
          workingProject.topic || workingProject.title,
          workingProject.kdpBookType,
          workingProject.language,
          workingProject.author,
          workingProject.estimatedPages
        );
        workingProject.kdpConcept = concept;
        workingProject.title = concept.title;
        workingProject.subtitle = concept.subtitle;
        workingProject.description = concept.longSynopsis || concept.shortSynopsis;
        await handleUpdateProject(workingProject);
      }

      // 2. OUTLINE / ESTRUTURA
      if (stages.includes('outline') && workingProject.kdpConcept) {
        setPipelineStageName('Gerando estrutura e sumário de capítulos...');
        setPipelinePercent(45);
        const chapters = await pipeline.generateOutline(
          workingProject.kdpConcept,
          workingProject.kdpBookType,
          workingProject.language
        );
        workingProject.kdpChapters = chapters;
        workingProject.outline = chapters.map((c: IBookChapter) => ({
          id: `out_${c.index}`,
          order: c.index,
          title: c.title,
          description: c.summary,
          status: 'PENDENTE'
        }));
        await handleUpdateProject(workingProject);
      }

      // 3. BOOK BIBLE / MEMÓRIA
      if (stages.includes('bible') && workingProject.kdpConcept) {
        setPipelineStageName('Construindo Memória da Obra e personagens...');
        setPipelinePercent(60);
        const bible = await pipeline.generateBible(
          workingProject.kdpConcept,
          workingProject.kdpChapters || [],
          workingProject.kdpBookType,
          workingProject.language
        );
        workingProject.kdpBible = bible;
        workingProject.bookMemory = {
          characters: bible.characters.map((c, i) => ({
            id: `char_${i}`,
            name: c.name,
            role: c.role,
            appearance: c.appearance,
            personality: c.personality || '',
            arc: c.arc || ''
          })),
          locations: bible.locations.map((l, i) => ({
            id: `loc_${i}`,
            name: l.name,
            description: l.description,
            mood: l.mood || ''
          })),
          events: [],
          rules: (bible.rulesOfUniverse || []).map((r, i) => ({
            id: `rule_${i}`,
            category: 'Geral',
            rule: r
          })),
          concepts: (bible.coreConcepts || []).map((c, i) => ({
            id: `conc_${i}`,
            term: c.concept,
            definition: c.explanation,
            application: c.practicalApplication
          }))
        };
        await handleUpdateProject(workingProject);
      }

      // 4. REDAÇÃO DOS CAPÍTULOS COM CONTINUIDADE NARRATIVA
      if (stages.includes('all_chapters') && workingProject.kdpConcept && workingProject.kdpChapters?.length) {
        const total = workingProject.kdpChapters.length;
        let prevSummary = '';
        for (let i = 0; i < total; i++) {
          const ch = workingProject.kdpChapters[i];
          setPipelineStageName(`Redigindo com IA: Capítulo ${ch.index || i + 1} de ${total} ("${ch.title.slice(0, 25)}")...`);
          setPipelinePercent(Math.round(65 + (i / total) * 18));
          const writtenResult = await pipeline.writeChapter(
            workingProject.kdpConcept,
            workingProject.kdpBible || { characters: [], locations: [], styleGuide: { artStyle: '', palette: [], tone: '' } },
            workingProject.kdpChapters || [],
            ch,
            workingProject.kdpBookType,
            prevSummary,
            workingProject.language
          );
          workingProject.kdpChapters[i] = {
            ...ch,
            prose: writtenResult.prose,
            wordCount: writtenResult.wordCount,
            notes: writtenResult.notes
          };
          prevSummary = writtenResult.prose.slice(-400);
          await handleUpdateProject(workingProject);
        }
      } else if (stages.includes('chapter_1') && workingProject.kdpConcept && workingProject.kdpChapters?.[0]) {
        setPipelineStageName('Redigindo Capítulo 1 inicial...');
        setPipelinePercent(75);
        const firstChapter = workingProject.kdpChapters[0];
        const writtenResult = await pipeline.writeChapter(
          workingProject.kdpConcept,
          workingProject.kdpBible || { characters: [], locations: [], styleGuide: { artStyle: '', palette: [], tone: '' } },
          workingProject.kdpChapters || [],
          firstChapter,
          workingProject.kdpBookType,
          '',
          workingProject.language
        );
        workingProject.kdpChapters[0] = {
          ...firstChapter,
          prose: writtenResult.prose,
          wordCount: writtenResult.wordCount,
          notes: writtenResult.notes
        };
        await handleUpdateProject(workingProject);
      }

      // 5. METADADOS KDP
      if (stages.includes('metadata') && workingProject.kdpConcept) {
        setPipelineStageName('Otimizando metadados KDP e 7 keywords...');
        setPipelinePercent(85);
        const meta = await pipeline.generateMetadataKdp(
          workingProject.kdpConcept,
          workingProject.kdpChapters || [],
          workingProject.author,
          workingProject.language
        );
        workingProject.kdpMetadata = meta;
        await handleUpdateProject(workingProject);
      }

      // 6. CAPA KDP COM ARTE REALISTA (FLUX.1)
      if (stages.includes('cover') && workingProject.kdpConcept) {
        setPipelineStageName('Gerando Arte Realista de Capa (FLUX.1) e Geometria KDP...');
        setPipelinePercent(90);
        const cover = await pipeline.generateCoverDesign(
          workingProject.kdpConcept,
          workingProject.kdpBible || { characters: [], locations: [], styleGuide: { artStyle: '', palette: [], tone: '' } },
          workingProject.author,
          workingProject.estimatedPages
        );
        const coverPrompt = ImageGenerationService.buildCoverPrompt(workingProject, 'realistic-photo', '', 42);
        const coverUrl = ImageGenerationService.getPollinationsUrl(coverPrompt, 1200, 1800, 42);
        cover.frontImageUrl = coverUrl;
        workingProject.kdpCoverDesign = cover;
        workingProject.coverImageUrl = coverUrl;
        await handleUpdateProject(workingProject);
      }

      // 7. ILUSTRAÇÕES REALISTAS PARA OS CAPÍTULOS (FLUX.1)
      if (stages.includes('illustrations')) {
        setPipelineStageName('Gerando Ilustrações Realistas para cada Capítulo (FLUX.1)...');
        setPipelinePercent(96);
        const generatedImages = ImageGenerationService.generateInitialIllustrationsForProject(workingProject, 'realistic-photo');
        workingProject.images = generatedImages;
        await handleUpdateProject(workingProject);
      }

      // 8. DIAGRAMAÇÃO EDITORIAL COMPLETA DAS PÁGINAS VISUAIS
      setPipelineStageName('Formatando diagramação das páginas impressas KDP...');
      workingProject.visualPages = PageEngine.generateVisualPagesFromManuscript(workingProject);
      await handleUpdateProject(workingProject);
      setPipelinePercent(100);
    } catch (err: any) {
      console.warn('Erro no pipeline:', err);
    } finally {
      setTimeout(() => {
        setIsPipelineRunning(false);
        setPipelineStageName('');
      }, 600);
    }
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
      {/* BARRA SUPERIOR GLOBAL DO BOOK STUDIO */}
      <header className="studio-topbar">
        {/* LOGO E PROJETO ATIVO */}
        <div className="topbar-left-zone">
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
              <span className="selector-prefix">Obra:</span>
              <select 
                className="select-active-book"
                value={activeProject.id}
                onChange={(e) => handleOpenProject(e.target.value, activeView)}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO DE FLUXO EDITORIAL */}
        <nav className="studio-nav-tabs">
          <button 
            className={`studio-nav-btn ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <Home size={15} />
            <span>Dashboard</span>
          </button>

          {activeProject && (
            <>
              <button 
                className={`studio-nav-btn ${activeView === 'tree' ? 'active' : ''}`}
                onClick={() => setActiveView('tree')}
              >
                <GitFork size={15} />
                <span>Linha de Produção</span>
              </button>

              <button 
                className={`studio-nav-btn ${activeView === 'editor' ? 'active' : ''}`}
                onClick={() => setActiveView('editor')}
              >
                <Layers size={15} />
                <span>Editor Visual</span>
              </button>

              <button 
                className={`studio-nav-btn ${activeView === 'cover' ? 'active' : ''}`}
                onClick={() => setActiveView('cover')}
              >
                <Palette size={15} />
                <span>Capa KDP</span>
              </button>

              <button 
                className={`studio-nav-btn ${activeView === 'images' ? 'active' : ''}`}
                onClick={() => setActiveView('images')}
              >
                <ImageIcon size={15} />
                <span>Imagens</span>
              </button>

              <button 
                className={`studio-nav-btn ${activeView === 'metadata' ? 'active' : ''}`}
                onClick={() => setActiveView('metadata')}
              >
                <Tag size={15} />
                <span>Metadados</span>
              </button>

              <button 
                className={`studio-nav-btn ${activeView === 'export' ? 'active' : ''}`}
                onClick={() => setActiveView('export')}
              >
                <Download size={15} />
                <span>Exportar</span>
              </button>
            </>
          )}

          <button 
            className={`studio-nav-btn ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveView('settings')}
          >
            <SettingsIcon size={15} />
            <span>Configurações</span>
          </button>
        </nav>

        {/* GRUPO DIREITO: AÇÕES GLOBAIS */}
        <div className="topbar-right-zone">
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

          {/* MEMÓRIA DO LIVRO */}
          {activeProject && (
            <button 
              className="btn-topbar-action" 
              onClick={() => setIsMemoryModalOpen(true)}
              title="Abrir Memória Contextual do Livro"
            >
              <Wand2 size={15} className="text-amber-400" />
              <span>Memória</span>
            </button>
          )}

          {/* HISTÓRICO DE VERSÕES */}
          {activeProject && (
            <button 
              className="btn-topbar-action" 
              onClick={() => setIsVersionModalOpen(true)}
              title="Histórico de Versões e Backups"
            >
              <History size={15} />
            </button>
          )}

          {/* PREVIEW COMPLETO */}
          {activeProject && (
            <button 
              className="btn-topbar-action" 
              onClick={() => setIsPreviewModalOpen(true)}
              title="Modo Leitura em Tela Cheia"
            >
              <Eye size={15} />
            </button>
          )}

          {/* NOVO LIVRO */}
          <button 
            className="btn-new-book-accent" 
            onClick={() => setActiveView('wizard')}
          >
            <Plus size={15} />
            <span>Novo Livro</span>
          </button>
        </div>
      </header>

      {/* BARRA DE PROGRESSO DO PIPELINE DE IA (QUANDO ATIVO) */}
      {isPipelineRunning && (
        <div className="global-pipeline-indicator-bar">
          <div className="pipeline-info-row">
            <div className="flex items-center gap-2">
              <RefreshCw size={14} className="spin-animate text-amber-400" />
              <span className="pipeline-stage-text">{pipelineStageName}</span>
            </div>
            <span className="pipeline-pct-text">{pipelinePercent}%</span>
          </div>
          <div className="pipeline-track">
            <div className="pipeline-fill" style={{ width: `${pipelinePercent}%` }} />
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL DINÂMICA CONFORME activeView */}
      <main className="studio-main-content">
        {activeView === 'dashboard' && (
          <DashboardView
            projects={projects}
            onOpenProject={(id) => handleOpenProject(id, 'tree')}
            onCreateNewBook={() => setActiveView('wizard')}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
            onSelectTemplate={(tmplId) => {
              setActiveView('wizard');
            }}
          />
        )}

        {activeView === 'wizard' && (
          <WizardNewBook
            onCancel={() => setActiveView(activeProject ? 'tree' : 'dashboard')}
            onCreateProject={handleCreateProjectFromWizard}
            aiService={aiService}
          />
        )}

        {activeView === 'tree' && activeProject && (
          <div className="stage-page-layout">
            <ProductionTreeView
              project={activeProject}
              onNavigateToStage={(stageId, param) => {
                if (stageId === 'concept') setActiveView('concept');
                else if (stageId === 'outline') setActiveView('outline');
                else if (stageId === 'revision') setActiveView('revision');
                else if (stageId === 'editor') {
                  if (param) setSelectedEditorChapter(param);
                  setActiveView('editor');
                }
                else if (stageId === 'cover') setActiveView('cover');
                else if (stageId === 'metadata') setActiveView('metadata');
                else if (stageId === 'quality' || stageId === 'export') setActiveView('export');
                else if (stageId === 'memory') setIsMemoryModalOpen(true);
              }}
            />
          </div>
        )}

        {activeView === 'concept' && activeProject && (
          <div className="stage-page-layout p-6">
            <ConceptPlanningView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
              aiService={aiService}
            />
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

        {activeView === 'editor' && activeProject && (
          <VisualBookEditor
            project={activeProject}
            onUpdateProject={handleUpdateProject}
            onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
            onOpenPreview={() => setIsPreviewModalOpen(true)}
            initialChapterIndex={selectedEditorChapter}
          />
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

        {activeView === 'metadata' && activeProject && (
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
      </main>

      {/* MODAIS FLUTUANTES GLOBAIS */}
      {activeProject && (
        <>
          <BookMemoryModal
            project={activeProject}
            isOpen={isMemoryModalOpen}
            onClose={() => setIsMemoryModalOpen(false)}
            onSave={(updatedMemory) => {
              handleUpdateProject({ ...activeProject, bookMemory: updatedMemory });
            }}
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
