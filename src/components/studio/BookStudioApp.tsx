import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, Settings as SettingsIcon, ChevronLeft, ChevronRight,
  Wand2, History, Eye, RefreshCw, Check, LogOut, Search, BarChart3,
  Type, FolderOpen, User, Target, FileText, PenTool, AlignLeft,
  Image as ImageIcon, BookMarked, Download, Trash2, Copy, Sparkles, Trophy, Zap
} from 'lucide-react';
import { db } from '../../database/local-database';
import { BookProject, BookVersionItem, BookMemory, IBookChapter } from '../../types/book-project';
import { StageId, STAGES, getNextStage, getPrevStage, getStageNumber, getStageLabel, getDefaultStageStatuses } from '../../types/stages';
import type { StageStatus } from '../../types/stages';
import { AiService } from '../../services/ai-service';
import { PageEngine } from '../../services/page-engine';
import { BookOpportunityProposal } from '../../types/category-intelligence';
import {
  getAmazonBestSellersForSegment,
  AmazonBestSellerReference
} from '../../services/amazon-bestsellers-catalog';

// Componentes das Etapas
import { ResearchStage } from './stages/ResearchStage';
import { BookTitlesStage } from './stages/BookTitlesStage';
import { ResourcesStage } from './stages/ResourcesStage';
import { AuthorPersonaStage } from './stages/AuthorPersonaStage';
import { PurposeStage } from './stages/PurposeStage';
import { BookDetailsStage } from './stages/BookDetailsStage';
import { AuthorBioStage } from './stages/AuthorBioStage';
import { OutlineStage } from './stages/OutlineStage';
import { WriteStage } from './stages/WriteStage';
import { DescriptionStage } from './stages/DescriptionStage';
import { BookCoverStage } from './stages/BookCoverStage';
import { FinishStage } from './stages/FinishStage';

// Modais e Componentes Principais
import { BookMemoryModal } from './BookMemoryModal';
import { FullScreenPreviewModal } from './FullScreenPreviewModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { SettingsTab } from '../../dashboard/components/SettingsTab';
import { BookIntelDashboard } from './BookIntelDashboard';
import { SegmentSelectorModal } from './SegmentSelectorModal';
import { BoxSuggestionService } from '../../services/box-suggestion-service';
import '../../styles/book-intel-dashboard.css';
import { AlertTriangle } from 'lucide-react';
import { PublishSuccessModal } from './PublishSuccessModal';
import { AssistedGenerationPanel } from './AssistedGenerationPanel';
import { FullBookGeneratorModal } from './FullBookGeneratorModal';
import { GeminiBookGeneratorService } from '../../services/gemini-book-generator';
import { ColoringBookStudio } from './coloring-book/ColoringBookStudio';
import { SudokuInvestigativeStudio } from './sudoku-investigative/SudokuInvestigativeStudio';

// Ícones por estágio
const STAGE_ICONS: Record<StageId, React.ReactNode> = {
  'research': <Search size={15} />,
  'analytics': <BarChart3 size={15} />,
  'book-titles': <Type size={15} />,
  'resources': <FolderOpen size={15} />,
  'author-persona': <User size={15} />,
  'purpose': <Target size={15} />,
  'book-details': <FileText size={15} />,
  'author-bio': <PenTool size={15} />,
  'outline': <AlignLeft size={15} />,
  'write': <BookOpen size={15} />,
  'description': <BookMarked size={15} />,
  'book-cover': <ImageIcon size={15} />,
  'finish': <Download size={15} />,
};

type AppMode = 'project-list' | 'project-editor' | 'settings' | 'coloring-book' | 'sudoku-investigativo';

const isColoringRoute = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/coloring-book' ||
         window.location.pathname.startsWith('/coloring-book') ||
         window.location.hash === '#/coloring-book';
};

const isSudokuRoute = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/sudoku-investigativo' ||
         window.location.pathname.startsWith('/sudoku-investigativo') ||
         window.location.hash === '#/sudoku-investigativo';
};

export const BookStudioApp: React.FC = () => {
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [activeProject, setActiveProject] = useState<BookProject | null>(null);
  const [currentStage, setCurrentStage] = useState<StageId>('research');
  const [mode, setMode] = useState<AppMode>(() => {
    if (isColoringRoute()) return 'coloring-book';
    if (isSudokuRoute()) return 'sudoku-investigativo';
    return 'project-list';
  });
  const [selectedEditorChapter, setSelectedEditorChapter] = useState<number | undefined>(undefined);
  const [aiService, setAiService] = useState<AiService>(() => new AiService({ provider: 'local-builtin' }));

  // Modais de ferramentas
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isSegmentModalOpen, setIsSegmentModalOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationWarningReason, setValidationWarningReason] = useState('');
  const [isPublishSuccessModalOpen, setIsPublishSuccessModalOpen] = useState(false);
  const [isFullBookModalOpen, setIsFullBookModalOpen] = useState(false);
  const [isAutoGeneratingStage, setIsAutoGeneratingStage] = useState(false);

  // Status de salvamento automático
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState('');

  // Redireciona caso o projeto antigo ou estado esteja em 'analytics'
  useEffect(() => {
    if (activeProject && (activeProject.currentStage === 'analytics' || currentStage === 'analytics')) {
      setCurrentStage('book-titles');
      handleUpdateProject({ ...activeProject, currentStage: 'book-titles' });
    }
  }, [activeProject?.id, activeProject?.currentStage, currentStage]);

  // Carregar projetos do IndexedDB
  const reloadProjects = useCallback(async () => {
    try {
      const all = await db.getAllBookProjects();
      setProjects(all);
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
    }
  }, []);

  useEffect(() => {
    reloadProjects();
    db.getSettings().then(st => {
      if (st?.aiSettings) setAiService(new AiService(st.aiSettings));
    }).catch(() => {});
  }, [reloadProjects]);

  // Sincronização de Rota com o Navegador (/coloring-book e /sudoku-investigativo)
  useEffect(() => {
    const handlePopState = () => {
      if (isColoringRoute()) {
        setMode('coloring-book');
      } else if (isSudokuRoute()) {
        setMode('sudoku-investigativo');
      } else if (mode === 'coloring-book' || mode === 'sudoku-investigativo') {
        setMode('project-list');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [mode]);

  const navigateToColoringBook = () => {
    if (window.location.pathname !== '/coloring-book') {
      window.history.pushState({}, '', '/coloring-book');
    }
    setMode('coloring-book');
  };

  const navigateToSudokuInvestigative = () => {
    if (window.location.pathname !== '/sudoku-investigativo') {
      window.history.pushState({}, '', '/sudoku-investigativo');
    }
    setMode('sudoku-investigativo');
  };

  const navigateToProjectList = () => {
    if (window.location.pathname === '/coloring-book' || window.location.pathname === '/sudoku-investigativo') {
      window.history.pushState({}, '', '/');
    }
    setMode('project-list');
    reloadProjects();
  };

  // Atualizar projeto com salvamento automático
  const handleUpdateProject = async (updated: BookProject) => {
    setActiveProject(updated);
    setIsAutosaving(true);
    try {
      await db.saveBookProject(updated);
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      setLastSavedTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setTimeout(() => setIsAutosaving(false), 250);
    }
  };

  // Gerar conteúdo automático para a etapa ativa com IA Gemini (com fallback local robusto)
  const handleAutoGenerateCurrentStage = async () => {
    if (!activeProject) return;
    setIsAutoGeneratingStage(true);
    try {
      const generator = new GeminiBookGeneratorService(aiService);
      let res: any;

      if (currentStage === 'write') {
        const targetChapter = selectedEditorChapter ?? 0;
        res = await generator.generateChapterContent(activeProject, targetChapter);
      } else {
        res = await generator.generateForStage(activeProject, currentStage);
      }

      if (res && res.success && res.data) {
        const updated = generator.applyResultToProject(activeProject, res);
        await handleUpdateProject(updated);
      } else {
        const filled = BoxSuggestionService.fillEntireStage(currentStage, activeProject);
        await handleUpdateProject(filled);
      }
    } catch (err) {
      console.warn('[AutoGenerate] Erro, aplicando fallback local:', err);
      const filled = BoxSuggestionService.fillEntireStage(currentStage, activeProject);
      await handleUpdateProject(filled);
    } finally {
      setIsAutoGeneratingStage(false);
    }
  };

  // Abrir projeto existente
  const openProject = (projectId: string) => {
    const found = projects.find(p => p.id === projectId);
    if (found) {
      const ensured = PageEngine.ensureProjectSettings(found);
      if (!ensured.stageStatuses) {
        ensured.stageStatuses = getDefaultStageStatuses();
      }
      setActiveProject(ensured);
      setCurrentStage(ensured.currentStage || 'research');
      setMode('project-editor');
    }
  };

  // Criar novo livro com seleção de segmento e modelo guiado da Amazon
  const handleConfirmNewSegmentProject = async (
    segment: any,
    topic: string,
    amazonRef?: AmazonBestSellerReference
  ) => {
    setIsSegmentModalOpen(false);

    // Obtém o pool de referências reais da Amazon para este segmento
    const allBestSellers = getAmazonBestSellersForSegment(segment);
    const primaryRef = amazonRef || allBestSellers[0];

    const initialTitle = primaryRef?.suggestedTitle || topic;
    const initialSubtitle = primaryRef?.suggestedSubtitle || '';
    const initialAudience = primaryRef?.targetAudience || 'Público Geral Adulto';
    const initialHook = primaryRef?.suggestedProjectHook || topic;

    // Constrói referências de mercado enriquecidas para a Etapa 2 (Análise de Mercado)
    const marketReferences = allBestSellers.map((b, idx) => ({
      id: b.id || `mref_${idx}`,
      title: b.title,
      author: b.author,
      bsr: idx === 0 ? 1 : (idx + 1) * 6,
      rating: b.rating,
      reviewCount: b.reviewCount,
      price: b.price,
      format: b.format,
      selectionReason: idx === 0 ? 'Livro Âncora / Modelo de Sucesso Selecionado' : 'Concorrente Direto no Topo do Nicho',
      commercialPositioning: b.categoryTag,
      narrativeStructure: b.narrativeStructure,
      openingHook: b.successFormula,
      ethicalInspirationGuideline: 'Inspirar-se no posicionamento de autoridade e retenção sem plagiar conteúdos ou termos registrados.',
      collectedAt: Date.now()
    }));

    const newProject: BookProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'IDEIA',
      priority: 'MÉDIA',
      executionMode: 'assisted',
      title: initialTitle,
      subtitle: initialSubtitle,
      author: 'Leandro Palmeira',
      description: primaryRef?.successFormula || '',
      language: 'Português',
      format: 'Capa Comum',
      trimSize: '6x9',
      paperType: 'bw-white',
      estimatedPages: 160,
      targetPrice: 39.90,
      currency: 'BRL',
      targetMarketplace: 'amazon.com.br',
      categories: [primaryRef?.categoryTag || 'Não-Ficção'],
      keywords: [],
      targetAudience: initialAudience,
      topic: initialHook,
      kdpBookType: segment,
      amazonReference: primaryRef ? {
        asin: primaryRef.asin,
        title: primaryRef.title,
        subtitle: primaryRef.subtitle,
        author: primaryRef.author,
        rankBadge: primaryRef.rankBadge,
        rating: primaryRef.rating,
        reviewCount: primaryRef.reviewCount,
        price: primaryRef.price,
        categoryTag: primaryRef.categoryTag,
        successFormula: primaryRef.successFormula,
        suggestedProjectHook: primaryRef.suggestedProjectHook,
        suggestedTitle: primaryRef.suggestedTitle,
        suggestedSubtitle: primaryRef.suggestedSubtitle,
        targetAudience: primaryRef.targetAudience,
        narrativeStructure: primaryRef.narrativeStructure,
        competitiveEdge: primaryRef.competitiveEdge
      } : undefined,
      guidedProjectLine: primaryRef ? `Projeto Guiado baseado no Best Seller "${primaryRef.title}" (${primaryRef.author})` : undefined,
      pipelineStage: 'idle',
      pipelineProgress: 0,
      pipelineLog: [
        `Projeto iniciado com base no modelo Best Seller da Amazon: "${primaryRef?.title || topic}"`
      ],
      tasks: [],
      notes: '',
      competitorsAsins: allBestSellers.map(b => b.asin),
      stageStatuses: {
        ...getDefaultStageStatuses(),
        research: 'IN_PROGRESS'
      },
      stageData: {
        research: {
          bookTitle: initialTitle,
          authorName: 'Leandro Palmeira',
          genre: segment,
          topic: initialHook,
          stance: primaryRef ? `Abordagem de autoridade e valor prático inspirada em "${primaryRef.title}": ${primaryRef.successFormula}` : '',
          standout: primaryRef ? (primaryRef.competitiveEdge || primaryRef.suggestedSubtitle) : '',
          authorTone: 'Conversacional e Prático',
          generalAudience: 'Público Geral Adulto',
          targetAudience: initialAudience
        },
        analytics: {
          marketReferences,
          analysisNotes: primaryRef ? `Projeto guiado com linha editorial ancorada em "${primaryRef.title}" de ${primaryRef.author} (${primaryRef.rankBadge}).` : '',
          aiAnalysisSummary: primaryRef ? `O nicho de ${segment} possui alta tração no KDP com forte preferência por frameworks aplicáveis e escrita fluida.` : ''
        },
        'book-titles': {
          selectedTitleId: 'title-1',
          customTitle: initialTitle,
          customSubtitle: initialSubtitle,
          generatedTitles: [
            {
              id: 'title-1',
              title: initialTitle,
              subtitle: initialSubtitle
            },
            {
              id: 'title-2',
              title: `O Código de ${initialTitle}`,
              subtitle: `Framework Comprovado para Resultados Previsíveis no Nicho de ${segment}`
            },
            {
              id: 'title-3',
              title: `A Arte da ${initialTitle}`,
              subtitle: `Estratégias Práticas Validadas para ${initialAudience}`
            }
          ]
        },
        purpose: {
          focusTags: [segment, 'Best Seller KDP', 'Projeto Guiado'],
          customTags: [segment, 'Amazon Books'],
          generatedProposal: primaryRef ? `Proposta editorial inspirada no modelo Best Seller de "${primaryRef.title}" (${primaryRef.author}): ${primaryRef.successFormula}` : 'Proposta editorial orientada a alto valor percebido e relevância comercial.',
          uniqueSellingPoint: primaryRef?.competitiveEdge || 'Abordagem prática, direta e sem enrolação orientada a resultados rápidos.',
          competitiveLandscape: primaryRef ? `Posicionado no topo da categoria com benchmark em "${primaryRef.title}" (${primaryRef.rankBadge}).` : 'Mercado competitivo no KDP com demanda ativa por conteúdos estruturados.',
          keySellingPoints: [
            primaryRef?.successFormula || 'Metodologia acionável e testada',
            'Linguagem acessível e envolvente',
            'Foco na transformação real do leitor'
          ],
          proposedAudience: initialAudience,
          proposedTone: 'Conversacional e Prático',
          bookPromise: primaryRef ? primaryRef.successFormula : 'Entregar valor prático e transformação real para o leitor.',
          transformation: `Levar o leitor do estado de dúvida para clareza e aplicação prática no nicho de ${segment}.`,
          authorMotivation: 'Construir uma obra de referência no catálogo KDP com base nos mais altos padrões do mercado da Amazon.'
        }
      },
      currentStage: 'research'
    };

    await db.saveBookProject(newProject);
    setProjects(prev => [newProject, ...prev]);
    setActiveProject(newProject);
    setCurrentStage('research');
    setMode('project-editor');
  };

  // Criar projeto a partir de uma oportunidade da Inteligência Comercial por Gênero
  const handleSelectOpportunity = async (
    proposal: BookOpportunityProposal,
    genre: string,
    category: string,
    subcategory: string
  ) => {
    const isFiction = (
      genre.toLowerCase().includes('romance') ||
      genre.toLowerCase().includes('ficção') ||
      genre.toLowerCase().includes('fiction') ||
      genre.toLowerCase().includes('fantasia') ||
      genre.toLowerCase().includes('thriller') ||
      genre.toLowerCase().includes('mistério')
    );

    const newProject: BookProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'IDEIA',
      priority: 'ALTA',
      executionMode: 'assisted',
      title: proposal.title,
      subtitle: proposal.subtitle,
      author: 'Leandro Palmeira',
      description: proposal.commercialHook || proposal.positioning,
      language: 'Português',
      format: 'Capa Comum',
      trimSize: '6x9',
      paperType: 'bw-white',
      estimatedPages: 160,
      targetPrice: 39.90,
      currency: 'BRL',
      targetMarketplace: 'amazon.com',
      categories: [genre, category, subcategory].filter(Boolean),
      keywords: [],
      targetAudience: proposal.targetAudience,
      topic: `${genre} > ${category} > ${subcategory}`,
      kdpBookType: isFiction ? 'romance' : 'non-fiction',
      pipelineStage: 'idle',
      pipelineProgress: 0,
      pipelineLog: [],
      tasks: [],
      notes: `Oportunidade originada do Book Intel KDP (${genre} > ${category} > ${subcategory}).\nPosicionamento: ${proposal.positioning}\nDireção de Capa: ${proposal.coverArtDirection}`,
      competitorsAsins: [],
      stageStatuses: getDefaultStageStatuses(),
      stageData: {
        research: {
          bookTitle: proposal.title,
          authorName: 'Leandro Palmeira',
          genre: genre,
          topic: `${category} - ${subcategory}`,
          stance: proposal.positioning,
          standout: proposal.commercialHook,
          authorTone: 'Envolvente e Profissional',
          generalAudience: proposal.targetAudience,
          targetAudience: proposal.targetAudience
        },
        'book-titles': {
          generatedTitles: [{ id: proposal.id, title: proposal.title, subtitle: proposal.subtitle }],
          selectedTitleId: proposal.id,
          customTitle: proposal.title,
          customSubtitle: proposal.subtitle
        },
        purpose: {
          focusTags: [genre, category],
          customTags: [],
          generatedProposal: proposal.positioning,
          uniqueSellingPoint: proposal.positioning,
          competitiveLandscape: `Segmento analisado com BSR competitivo na Amazon`,
          keySellingPoints: [proposal.commercialHook],
          proposedAudience: proposal.targetAudience,
          proposedTone: 'Envolvente e Profissional'
        }
      },
      currentStage: 'research'
    };

    await db.saveBookProject(newProject);
    setProjects(prev => [newProject, ...prev]);
    setActiveProject(newProject);
    setCurrentStage('research');
    setMode('project-editor');
  };

  // Excluir projeto
  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este livro?')) return;
    await db.deleteBookProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProject?.id === id) {
      setActiveProject(null);
      setMode('project-list');
    }
  };

  // Duplicar projeto
  const duplicateProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const source = projects.find(p => p.id === id);
    if (!source) return;
    const dup: BookProject = {
      ...source,
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: `${source.title || 'Livro'} (Cópia)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.saveBookProject(dup);
    await reloadProjects();
  };

  // Validação obrigatória da etapa atual
  const isCurrentStageCompleted = (): { isValid: boolean; reason?: string } => {
    if (!activeProject) return { isValid: true };
    const data = activeProject.stageData || {};

    switch (currentStage) {
      case 'research': {
        const topic = data.research?.topic?.trim() || activeProject.topic?.trim();
        if (!topic) return { isValid: false, reason: 'O tópico ou tema central do livro é obrigatório na Etapa 1.' };
        return { isValid: true };
      }
      case 'book-titles': {
        const t = data['book-titles']?.customTitle?.trim() || data['book-titles']?.selectedTitleId || activeProject.title?.trim();
        if (!t) return { isValid: false, reason: 'Selecione ou digite um título definitivo para a obra.' };
        return { isValid: true };
      }
      case 'author-persona': {
        const tone = data['author-persona']?.tone?.trim() || data['author-persona']?.authorDescription?.trim();
        if (!tone) return { isValid: false, reason: 'Defina o tom de voz da narrativa para orientar a IA.' };
        return { isValid: true };
      }
      case 'purpose': {
        const p = data.purpose?.generatedProposal?.trim() || data.purpose?.uniqueSellingPoint?.trim() || data.purpose?.corePromise?.trim();
        if (!p) return { isValid: false, reason: 'Defina a proposta editorial ou promessa central do livro.' };
        return { isValid: true };
      }
      case 'outline': {
        const chs = activeProject.kdpChapters || [];
        if (chs.length < 2) return { isValid: false, reason: 'Gere pelo menos 2 capítulos estruturados no sumário.' };
        return { isValid: true };
      }
      case 'write': {
        const chs = activeProject.kdpChapters || [];
        const hasContent = chs.some(c => c.prose && c.prose.trim().length > 30);
        if (!hasContent) return { isValid: false, reason: 'Escreva ou gere o conteúdo de pelo menos um capítulo.' };
        return { isValid: true };
      }
      case 'description': {
        const d = data.description?.fullDescription?.trim() || activeProject.description?.trim();
        if (!d || d.length < 20) return { isValid: false, reason: 'Gere a sinopse comercial do livro para a Amazon KDP.' };
        return { isValid: true };
      }
      default:
        return { isValid: true };
    }
  };

  // Navegar entre etapas com bloqueio de validação
  const goToNextStage = () => {
    const check = isCurrentStageCompleted();
    if (!check.isValid) {
      setValidationWarningReason(check.reason || 'Preencha os campos obrigatórios desta etapa antes de avançar.');
      setIsValidationModalOpen(true);
      return;
    }

    if (activeProject) {
      const baseStatuses = activeProject.stageStatuses || getDefaultStageStatuses();
      const updatedStatuses: Record<StageId, StageStatus> = { ...baseStatuses, [currentStage]: 'COMPLETED' };
      const next = getNextStage(currentStage);
      if (next) {
        handleUpdateProject({ ...activeProject, currentStage: next, stageStatuses: updatedStatuses });
        setCurrentStage(next);
      }
    }
  };

  // Publicar Livro Oficialmente KDP
  const handlePublishBook = async () => {
    if (!activeProject) return;

    const baseStatuses = activeProject.stageStatuses || getDefaultStageStatuses();
    const updatedStatuses: Record<StageId, StageStatus> = { ...baseStatuses, finish: 'COMPLETED' };

    const published: BookProject = {
      ...activeProject,
      status: 'PUBLICADO',
      pipelineStage: 'completed',
      stageStatuses: updatedStatuses,
      publishedAt: Date.now(),
      updatedAt: Date.now()
    };

    await handleUpdateProject(published);
    setIsPublishSuccessModalOpen(true);
  };

  const handleAutofillCurrentStageAndAdvance = () => {
    if (!activeProject) return;
    const filled = BoxSuggestionService.fillEntireStage(currentStage, activeProject);
    const next = getNextStage(currentStage) || currentStage;
    filled.currentStage = next;
    handleUpdateProject(filled);
    setCurrentStage(next);
    setIsValidationModalOpen(false);
  };

  const goToPrevStage = () => {
    const prev = getPrevStage(currentStage);
    if (prev) {
      setCurrentStage(prev);
      if (activeProject) {
        handleUpdateProject({ ...activeProject, currentStage: prev });
      }
    }
  };

  const exitProject = () => {
    setActiveProject(null);
    setMode('project-list');
    reloadProjects();
  };

  // Versões e backups
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
    await handleUpdateProject({
      ...activeProject,
      versions: [newVer, ...(activeProject.versions || [])]
    });
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

  const getStatus = (stageId: StageId): StageStatus => {
    return activeProject?.stageStatuses?.[stageId] || 'NOT_STARTED';
  };

  // Renderizador do conteúdo da etapa ativa
  const renderStageContent = () => {
    if (!activeProject) return null;

    switch (currentStage) {
      case 'research':
        return <ResearchStage project={activeProject} onUpdateProject={handleUpdateProject} />;
      case 'book-titles':
        return <BookTitlesStage project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />;
      case 'resources':
        return <ResourcesStage project={activeProject} onUpdateProject={handleUpdateProject} />;
      case 'author-persona':
        return <AuthorPersonaStage project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />;
      case 'purpose':
        return <PurposeStage project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />;
      case 'book-details':
        return <BookDetailsStage project={activeProject} onUpdateProject={handleUpdateProject} />;
      case 'author-bio':
        return <AuthorBioStage project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />;
      case 'outline':
        return (
          <OutlineStage
            project={activeProject}
            onUpdateProject={handleUpdateProject}
            aiService={aiService}
            onNavigateToWrite={(chapterIndex) => {
              if (chapterIndex !== undefined) setSelectedEditorChapter(chapterIndex);
              setCurrentStage('write');
            }}
          />
        );
      case 'write':
        return (
          <WriteStage
            project={activeProject}
            onUpdateProject={handleUpdateProject}
            onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
            onOpenPreview={() => setIsPreviewModalOpen(true)}
            initialChapterIndex={selectedEditorChapter}
          />
        );
      case 'description':
        return <DescriptionStage project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />;
      case 'book-cover':
        return (
          <BookCoverStage
            project={activeProject}
            onUpdateProject={handleUpdateProject}
            onContinue={() => setCurrentStage('finish')}
          />
        );
      case 'finish':
        return <FinishStage project={activeProject} onUpdateProject={handleUpdateProject} aiService={aiService} />;
      default:
        return null;
    }
  };

  // ============================================================
  // TELA 1: DASHBOARD BOOK INTEL KDP (DESIGN PROFISSIONAL)
  // ============================================================
  if (mode === 'project-list') {
    return (
      <>
        <BookIntelDashboard
          projects={projects}
          onCreateNewProject={() => setIsSegmentModalOpen(true)}
          onOpenProject={openProject}
          onDuplicateProject={duplicateProject}
          onDeleteProject={deleteProject}
          onOpenSettings={() => setMode('settings')}
          onOpenColoringBook={navigateToColoringBook}
          onOpenSudokuInvestigative={navigateToSudokuInvestigative}
          onSelectOpportunity={handleSelectOpportunity}
        />
        <SegmentSelectorModal
          isOpen={isSegmentModalOpen}
          onClose={() => setIsSegmentModalOpen(false)}
          onConfirm={handleConfirmNewSegmentProject}
          onOpenColoringBook={() => {
            setIsSegmentModalOpen(false);
            navigateToColoringBook();
          }}
          onOpenSudokuInvestigative={() => {
            setIsSegmentModalOpen(false);
            navigateToSudokuInvestigative();
          }}
        />
      </>
    );
  }

  // ============================================================
  // TELA: GERADOR DE LIVROS PARA COLORIR (/coloring-book)
  // ============================================================
  if (mode === 'coloring-book') {
    return (
      <ColoringBookStudio
        onBackToDashboard={navigateToProjectList}
        onOpenProject={async (projId) => {
          await reloadProjects();
          navigateToProjectList();
          openProject(projId);
        }}
      />
    );
  }

  // ============================================================
  // TELA: GERADOR DE LIVRO DE SUDOKU INVESTIGATIVO (/sudoku-investigativo)
  // ============================================================
  if (mode === 'sudoku-investigativo') {
    return (
      <SudokuInvestigativeStudio
        onBackToDashboard={navigateToProjectList}
        onOpenProject={async (projId) => {
          await reloadProjects();
          navigateToProjectList();
          openProject(projId);
        }}
      />
    );
  }

  // ============================================================
  // TELA 2: CONFIGURAÇÕES DA IA
  // ============================================================
  if (mode === 'settings') {
    return (
      <div className="app-layout">
        <div className="settings-page">
          <div className="settings-header">
            <button className="btn-back" onClick={() => setMode('project-list')}>
              <ChevronLeft size={18} /> Voltar aos Livros
            </button>
            <h2>Configurações da Inteligência Artificial</h2>
          </div>
          <SettingsTab />
        </div>
      </div>
    );
  }

  // ============================================================
  // TELA 3: EDITOR COMPLETO (Sidebar + Header + Estágios)
  // ============================================================
  const stageNum = getStageNumber(currentStage);
  const stageLabel = getStageLabel(currentStage);
  const completedCount = STAGES.filter(s => getStatus(s.id) === 'COMPLETED').length;
  const progressPercent = Math.round((completedCount / STAGES.length) * 100);

  return (
    <div className="app-layout editor-layout">
      {/* ===== SIDEBAR ESQUERDA (ETAPAS COAUTHOR) ===== */}
      <aside className="editor-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-step-badge">Etapa {stageNum} de {STAGES.length}</div>
          <span className="sidebar-stage-name">{stageLabel}</span>
          <div className="sidebar-progress-track" title={`${completedCount} de ${STAGES.length} etapas concluídas`}>
            <div className="sidebar-progress-bar" style={{ width: `${Math.max(6, progressPercent)}%` }} />
          </div>
          <span className="sidebar-progress-text">{progressPercent}% concluído</span>
        </div>

        <nav className="sidebar-nav">
          {STAGES.map(stage => {
            const status = getStatus(stage.id);
            const isActive = stage.id === currentStage;
            const isPast = stage.number < stageNum;

            return (
              <button
                key={stage.id}
                className={`sidebar-stage-btn ${isActive ? 'active' : ''} ${isPast ? 'past' : ''} status-${status.toLowerCase()}`}
                onClick={() => {
                  if (stage.number > stageNum) {
                    const check = isCurrentStageCompleted();
                    if (!check.isValid) {
                      setValidationWarningReason(check.reason || 'Conclua a etapa atual antes de avançar para as seguintes.');
                      setIsValidationModalOpen(true);
                      return;
                    }
                  }
                  setCurrentStage(stage.id);
                }}
              >
                <span className={`stage-dot ${isActive ? 'active' : ''} ${status === 'COMPLETED' ? 'completed' : ''}`}>
                  {status === 'COMPLETED' ? <Check size={11} strokeWidth={3} /> : stage.number}
                </span>
                <span className="stage-label">{stage.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="btn-exit-book" onClick={exitProject}>
            <LogOut size={15} /> Sair do Livro
          </button>
        </div>
      </aside>

      {/* ===== ÁREA PRINCIPAL ===== */}
      <div className="editor-main">
        {/* Cabeçalho de Navegação e Ferramentas */}
        <header className="editor-header">
          <div className="header-left">
            <button
              className="btn-nav-header"
              onClick={goToPrevStage}
              disabled={stageNum <= 1}
            >
              <ChevronLeft size={16} /> Voltar
            </button>
          </div>

          <div className="header-stage-info">
            <span className="header-stage-badge">Etapa {stageNum} de {STAGES.length}</span>
            <h2 className="header-stage-title">{stageLabel}</h2>
          </div>

          <div className="header-right">
            {/* Indicador de Salvamento Automático */}
            <span className="autosave-indicator">
              {isAutosaving ? (
                <><RefreshCw size={13} className="spin" /> Salvando...</>
              ) : lastSavedTime ? (
                <><Check size={13} /> Salvo às {lastSavedTime}</>
              ) : null}
            </span>

            {/* As 3 Ferramentas Rápidas do Topo */}
            {activeProject && (
              <div className="header-quick-tools">
                <button
                  className="btn-icon-header"
                  onClick={() => setIsMemoryModalOpen(true)}
                  title="Memória do Livro (Personagens, Cenários e Regras)"
                >
                  <Wand2 size={16} />
                </button>
                <button
                  className="btn-icon-header"
                  onClick={() => setIsVersionModalOpen(true)}
                  title="Histórico de Versões & Backups"
                >
                  <History size={16} />
                </button>
                <button
                  className="btn-icon-header"
                  onClick={() => setIsPreviewModalOpen(true)}
                  title="Pré-visualização do Livro Diagramado"
                >
                  <Eye size={16} />
                </button>
              </div>
            )}

            {/* BOTÃO GERAR ETAPA COM IA (GEMINI OU FALLBACK INTELIGENTE) */}
            {activeProject && currentStage !== 'finish' && (
              <button
                className="btn-header-ai-generate"
                onClick={handleAutoGenerateCurrentStage}
                disabled={isAutoGeneratingStage}
                title="Preencher ou gerar dados desta etapa automaticamente com IA"
              >
                {isAutoGeneratingStage ? (
                  <>
                    <RefreshCw size={13} className="spin" />
                    <span>Gerando Etapa...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Gerar com IA</span>
                  </>
                )}
              </button>
            )}

            {/* BOTÃO GERAR TODO O LIVRO AUTOMATICAMENTE */}
            {activeProject && (
              <button
                className="btn-header-full-auto"
                onClick={() => setIsFullBookModalOpen(true)}
                title="Gerador Editorial Automático: criar todo o livro com IA"
              >
                <Zap size={13} />
                <span>Gerar Todo o Livro</span>
              </button>
            )}

            {stageNum === STAGES.length ? (
              <button
                className="btn-nav-publish"
                onClick={handlePublishBook}
                title="Finalizar e Publicar Obra na Amazon KDP"
              >
                <Check size={16} /> Finalizar & Publicar
              </button>
            ) : (
              <button
                className="btn-nav-next"
                onClick={goToNextStage}
              >
                Avançar <ChevronRight size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Banner do Fluxo de Produção Guiado por Best Seller da Amazon */}
        {activeProject?.amazonReference && (
          <div className="guided-flow-pipeline-bar">
            <div className="guided-flow-left">
              <span className="guided-flow-badge">
                <Trophy size={12} color="#f59e0b" /> PROJETO GUIADO AMAZON KDP
              </span>
              <span className="guided-flow-title">
                <strong>Benchmark:</strong> {activeProject.amazonReference.title} <em>({activeProject.amazonReference.author})</em>
              </span>
              <span className="guided-flow-divider">•</span>
              <span className="guided-flow-hook" title={activeProject.amazonReference.successFormula}>
                {activeProject.amazonReference.successFormula}
              </span>
            </div>
            <div className="guided-flow-right">
              <span className="guided-flow-status">
                <Check size={12} /> Linha de Raciocínio Conectada ({STAGES.length} Etapas)
              </span>
            </div>
          </div>
        )}

        {/* Conteúdo da Etapa */}
        <main className="editor-content">
          {renderStageContent()}

          {/* PAINEL DE GERAÇÃO ASSISTIDA POR IA GEMINI */}
          {activeProject && (
            <AssistedGenerationPanel
              project={activeProject}
              onUpdateProject={handleUpdateProject}
              aiService={aiService}
              currentStage={currentStage}
              onNavigateToStage={(stage) => setCurrentStage(stage)}
              onOpenSettings={() => setMode('settings')}
            />
          )}
        </main>
      </div>

      {/* ===== OS 3 MODAIS GLOBAIS COM DESIGN IMPECÁVEL ===== */}
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
            onDuplicateProject={() => {
              if (activeProject) duplicateProject(activeProject.id, { stopPropagation: () => {} } as any);
            }}
          />
        </>
      )}

      {/* MODAL DE SELEÇÃO DE SEGUIMENTO */}
      <SegmentSelectorModal
        isOpen={isSegmentModalOpen}
        onClose={() => setIsSegmentModalOpen(false)}
        onConfirm={handleConfirmNewSegmentProject}
        onOpenColoringBook={() => {
          setIsSegmentModalOpen(false);
          navigateToColoringBook();
        }}
        onOpenSudokuInvestigative={() => {
          setIsSegmentModalOpen(false);
          navigateToSudokuInvestigative();
        }}
      />

      {/* MODAL DE PUBLICAÇÃO BEM-SUCEDIDA */}
      {activeProject && (
        <PublishSuccessModal
          isOpen={isPublishSuccessModalOpen}
          onClose={() => setIsPublishSuccessModalOpen(false)}
          project={activeProject}
          onReturnToDashboard={exitProject}
        />
      )}

      {/* MODAL DE GERAÇÃO AUTOMÁTICA DO LIVRO COMPLETO (GEMINI AI) */}
      {activeProject && (
        <FullBookGeneratorModal
          isOpen={isFullBookModalOpen}
          onClose={() => setIsFullBookModalOpen(false)}
          project={activeProject}
          onUpdateProject={handleUpdateProject}
          aiService={aiService}
          onNavigateToStage={(stage) => setCurrentStage(stage)}
        />
      )}

      {/* MODAL DE VALIDAÇÃO OBRIGATÓRIA DA ETAPA */}
      {isValidationModalOpen && (
        <div className="modal-backdrop-overlay" onClick={() => setIsValidationModalOpen(false)}>
          <div className="validation-warning-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="warning-header-row">
              <div className="warning-icon-box">
                <AlertTriangle size={22} color="#d97706" />
              </div>
              <div>
                <h3 className="warning-title">Etapa Incompleta</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Conclua esta etapa para desbloquear a próxima</span>
              </div>
            </div>

            <p className="warning-body-text">
              {validationWarningReason}
            </p>

            <div className="warning-actions-row">
              <button
                className="btn-cancel-modal"
                onClick={() => setIsValidationModalOpen(false)}
              >
                Preencher Manualmente
              </button>
              <button
                className="btn-confirm-segment"
                onClick={handleAutofillCurrentStageAndAdvance}
              >
                <Sparkles size={14} /> ⚡ Preencher com IA & Avançar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
