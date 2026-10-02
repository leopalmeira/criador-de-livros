import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Type, 
  Image as ImageIcon, 
  FileText, 
  Sliders, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  Save, 
  Check, 
  AlertCircle, 
  AlignLeft, 
  AlignCenter, 
  AlignJustify,
  Maximize2,
  RefreshCw,
  HelpCircle,
  Quote,
  Layers,
  Wand2,
  X
} from 'lucide-react';
import { 
  BookProject, 
  BookVisualPage, 
  PageElement, 
  PageElementType, 
  TrimSize, 
  TRIM_SIZE_METRICS, 
  calculateKdpBindingMargin,
  IBookChapter
} from '../../types/book-project';
import { PageEngine } from '../../services/page-engine';
import { AiAssistantService, AiAssistAction } from '../../services/ai-assistant-service';
import { AiService } from '../../services/ai-service';
import { LocalAiEngine } from '../../services/local-ai-engine';
import { ShowMeTheStoryEngine } from '../../services/show-me-the-story-engine';
import { EditorialArtService } from '../../services/editorial-art-service';
import { WatermarkArtService } from '../../services/watermark-art-service';
import { ProgressivePageEngine } from '../../services/progressive-page-engine';
import { EditorialContextService } from '../../services/editorial-context-service';
import '../../styles/visual-book-editor.css';

interface VisualBookEditorProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  onOpenMemoryModal: () => void;
  onOpenPreview: () => void;
  initialChapterIndex?: number;
}

type RightPanelTab = 'elements' | 'page_settings' | 'typography' | 'ai_assistant';

export const VisualBookEditor: React.FC<VisualBookEditorProps> = ({
  project,
  onUpdateProject,
  onOpenMemoryModal,
  onOpenPreview,
  initialChapterIndex
}) => {
  const [pages, setPages] = useState<BookVisualPage[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<RightPanelTab>('elements');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showGuidelines, setShowGuidelines] = useState<boolean>(true);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [aiAnalysisNotes, setAiAnalysisNotes] = useState<string[]>([]);
  const [isAutosaving, setIsAutosaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // Estados de Geração Progressiva de Páginas (Seções 8, 9, 10, 11 e 14)
  const [isProgressiveGenerating, setIsProgressiveGenerating] = useState<boolean>(false);
  const [progressiveSuccessMsg, setProgressiveSuccessMsg] = useState<string>('');

  // Estados da Sombra Temática da História (0% a 5% de opacidade)
  const [enableWatermark, setEnableWatermark] = useState<boolean>(true);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(3.0);

  // Estados de Expansão de Capítulo com IA
  const [isExpandModalOpen, setIsExpandModalOpen] = useState<boolean>(false);
  const [expandMode, setExpandMode] = useState<'examples' | 'theory' | 'dialogues' | 'double_length' | 'custom'>('examples');
  const [expandCustomPrompt, setExpandCustomPrompt] = useState<string>('');
  const [isExpanding, setIsExpanding] = useState<boolean>(false);
  const [expandSuccessMessage, setExpandSuccessMessage] = useState<string>('');

  const aiAssistantRef = useRef<AiAssistantService | null>(null);

  // Inicializa o esqueleto de páginas editoriais reais progressivas
  useEffect(() => {
    let proj = PageEngine.ensureProjectSettings(project);
    let visualPages = proj.visualPages;

    // Se não houver páginas cadastradas, inicializa o esqueleto com os capítulos do sumário
    if (!visualPages || visualPages.length === 0) {
      visualPages = ProgressivePageEngine.initializeBookSkeleton(proj);
      proj = {
        ...proj,
        visualPages,
        actualPages: visualPages.length,
        lastGeneratedPage: 1
      };
      onUpdateProject(proj);
    }

    setPages(visualPages);
    if (initialChapterIndex !== undefined && visualPages.length > 0) {
      const targetIdx = visualPages.findIndex(p => p.chapterIndex === initialChapterIndex);
      if (targetIdx !== -1) {
        setSelectedPageIndex(targetIdx);
      } else if (selectedPageIndex >= visualPages.length) {
        setSelectedPageIndex(0);
      }
    } else if (selectedPageIndex >= visualPages.length) {
      setSelectedPageIndex(0);
    }

    const aiSettings = (project as any).aiSettings || { provider: 'local-builtin' };
    aiAssistantRef.current = new AiAssistantService(new AiService(aiSettings));
  }, [project.id]);

  // Executa a geração progressiva da página selecionada sob restrição de título e objetivo
  const handleGenerateCurrentPageProgressively = async () => {
    const pageToGen = pages[selectedPageIndex];
    if (isProgressiveGenerating || !pageToGen) return;

    setIsProgressiveGenerating(true);
    setProgressiveSuccessMsg('');
    setAiMessage(`⚡ Escrevendo e diagramando Página #${pageToGen.pageNumber} ("${pageToGen.title || 'Seção'}")...`);

    try {
      const aiSettings = (project as any).aiSettings || { provider: 'local-builtin' };
      const ai = new AiService(aiSettings);
      const { updatedProject, generatedPage } = await ProgressivePageEngine.generatePageProgressively(
        project,
        selectedPageIndex,
        ai
      );

      const newPages = updatedProject.visualPages || pages;
      setPages(newPages);
      onUpdateProject(updatedProject);
      setProgressiveSuccessMsg(`✅ Página #${generatedPage.pageNumber} gerada, diagramada e aprovada!`);
      setTimeout(() => setProgressiveSuccessMsg(''), 3500);
    } catch (err: any) {
      setAiMessage(`Erro na geração: ${err.message || 'Falha ao processar.'}`);
    } finally {
      setIsProgressiveGenerating(false);
      setTimeout(() => setAiMessage(''), 1800);
    }
  };

  // Regenera exclusivamente a página selecionada preservando contexto do livro
  const handleRegenerateCurrentPage = async () => {
    const pageToRegen = pages[selectedPageIndex];
    if (isProgressiveGenerating || !pageToRegen) return;

    setIsProgressiveGenerating(true);
    setProgressiveSuccessMsg('');
    setAiMessage(`🔄 Regenerando Página #${pageToRegen.pageNumber} mantendo contexto editorial...`);

    try {
      const aiSettings = (project as any).aiSettings || { provider: 'local-builtin' };
      const ai = new AiService(aiSettings);
      const { updatedProject, generatedPage } = await ProgressivePageEngine.regenerateSinglePage(
        project,
        selectedPageIndex,
        ai
      );

      const newPages = updatedProject.visualPages || pages;
      setPages(newPages);
      onUpdateProject(updatedProject);
      setProgressiveSuccessMsg(`✅ Página #${generatedPage.pageNumber} regenerada com sucesso!`);
      setTimeout(() => setProgressiveSuccessMsg(''), 3500);
    } catch (err: any) {
      setAiMessage(`Erro ao regenerar: ${err.message || 'Falha ao processar.'}`);
    } finally {
      setIsProgressiveGenerating(false);
      setTimeout(() => setAiMessage(''), 1800);
    }
  };

  // Função para gerar em lote com Show Me The Story (se desejado pelo autor)
  const handleGenerateFullBookManuscript = () => {
    setIsAiLoading(true);
    setAiMessage('⚡ Redigindo e diagramando todo o livro com Show Me The Story Engine...');
    try {
      const fullProj = ShowMeTheStoryEngine.generateStoryBook(project, project.estimatedPages || 150);
      setPages(fullProj.visualPages || []);
      setSelectedPageIndex(0);
      onUpdateProject(fullProj);
    } finally {
      setTimeout(() => {
        setIsAiLoading(false);
        setAiMessage('');
      }, 600);
    }
  };

  const currentPage = pages[selectedPageIndex] || pages[0];

  // Métricas de corte
  const currentTrim = project.pageSettings?.trimSize || project.trimSize || '6x9';
  const trimMetrics = TRIM_SIZE_METRICS[currentTrim] || TRIM_SIZE_METRICS['6x9'];
  const aspectRatio = trimMetrics.heightInches / trimMetrics.widthInches;

  // Margens atuais em porcentagem para exibição visual precisa
  const margins = project.pageSettings?.margins || { top: 0.75, bottom: 0.75, inside: 0.75, outside: 0.5 };
  const marginTopPct = (margins.top / trimMetrics.heightInches) * 100;
  const marginBottomPct = (margins.bottom / trimMetrics.heightInches) * 100;
  const isRightPage = currentPage ? currentPage.pageNumber % 2 !== 0 : true;
  const marginInsidePct = (margins.inside / trimMetrics.widthInches) * 100;
  const marginOutsidePct = (margins.outside / trimMetrics.widthInches) * 100;
  const marginLeftPct = isRightPage ? marginInsidePct : marginOutsidePct;
  const marginRightPct = isRightPage ? marginOutsidePct : marginInsidePct;

  // Tipografia atual
  const typography = project.typography || {
    fontFamily: 'Georgia, serif',
    fontSizePt: 11,
    lineHeight: 1.55,
    paragraphSpacingPt: 6,
    textAlign: 'justify',
    headingFont: 'Cinzel, Georgia, serif',
    bodyFont: 'Georgia, serif',
    dropCap: true
  };

  // Atualiza páginas e dispara save
  const commitPagesUpdate = (newPages: BookVisualPage[]) => {
    setPages(newPages);
    setIsAutosaving(true);
    const updated = {
      ...project,
      visualPages: newPages,
      actualPages: newPages.length,
      updatedAt: Date.now()
    };
    onUpdateProject(updated);
    setTimeout(() => {
      setIsAutosaving(false);
      setLastSavedTime(new Date().toLocaleTimeString());
    }, 400);
  };

  // Manipulação de Páginas
  const handleAddPage = () => {
    const newPages = PageEngine.addPage(pages, selectedPageIndex, currentPage?.chapterIndex);
    commitPagesUpdate(newPages);
    setSelectedPageIndex(selectedPageIndex + 1);
  };

  const handleDuplicatePage = () => {
    const newPages = PageEngine.duplicatePage(pages, selectedPageIndex);
    commitPagesUpdate(newPages);
    setSelectedPageIndex(selectedPageIndex + 1);
  };

  const handleDeletePage = () => {
    if (pages.length <= 1) return;
    const newPages = PageEngine.deletePage(pages, selectedPageIndex);
    commitPagesUpdate(newPages);
    setSelectedPageIndex(Math.max(0, selectedPageIndex - 1));
  };

  const handleMovePage = (direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? selectedPageIndex - 1 : selectedPageIndex + 1;
    if (targetIdx < 0 || targetIdx >= pages.length) return;
    const newPages = PageEngine.movePage(pages, selectedPageIndex, targetIdx);
    commitPagesUpdate(newPages);
    setSelectedPageIndex(targetIdx);
  };

  // Manipulação de Elementos na Página Selecionada
  const handleAddElement = (type: PageElementType) => {
    if (!currentPage) return;
    const newElem: PageElement = {
      id: `elem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      content: type === 'chapter-title' 
        ? 'Título do Capítulo' 
        : type === 'heading' 
          ? 'Subtítulo da Seção' 
          : type === 'quote' 
            ? 'Uma frase de reflexão ou citação inspiradora...' 
            : type === 'callout' 
              ? 'Destaque importante ou aviso prático para o leitor.' 
              : 'Novo parágrafo de texto editável...',
      alignment: type === 'chapter-title' || type === 'heading' ? 'center' : 'justify'
    };

    const updatedElements = [...currentPage.elements, newElem];
    const newPages = pages.map((p, idx) => idx === selectedPageIndex ? { ...p, elements: updatedElements } : p);
    commitPagesUpdate(newPages);
  };

  const handleUpdateElementContent = (elemId: string, content: string) => {
    if (!currentPage) return;
    const updatedElements = currentPage.elements.map(e => e.id === elemId ? { ...e, content } : e);
    const fullText = updatedElements.map(e => e.content).join('\n\n');

    // Atualiza a memória estruturada da página oficial editada manualmente (Regra 20)
    const updatedMemory = EditorialContextService.extractPageStructuredMemory(
      currentPage.pageNumber,
      currentPage.title || `Página ${currentPage.pageNumber}`,
      currentPage.goal || 'Desenvolvimento do conteúdo editorial',
      fullText,
      `Capítulo ${currentPage.chapterIndex || 1}`,
      currentPage.sectionTitle
    );

    const newPages = pages.map((p, idx) => 
      idx === selectedPageIndex 
        ? { ...p, elements: updatedElements, rawText: fullText, status: 'approved' as const, pageContext: updatedMemory } 
        : p
    );

    const updatedPageContexts = {
      ...(project.pageContexts || {}),
      [currentPage.pageNumber]: updatedMemory
    };

    setPages(newPages);
    setIsAutosaving(true);
    const updated: BookProject = {
      ...project,
      visualPages: newPages,
      actualPages: newPages.length,
      pageContexts: updatedPageContexts,
      updatedAt: Date.now()
    };
    onUpdateProject(updated);
    setTimeout(() => {
      setIsAutosaving(false);
      setLastSavedTime(new Date().toLocaleTimeString());
    }, 400);
  };

  const handleDeleteElement = (elemId: string) => {
    if (!currentPage) return;
    const updatedElements = currentPage.elements.filter(e => e.id !== elemId);
    const newPages = pages.map((p, idx) => idx === selectedPageIndex ? { ...p, elements: updatedElements } : p);
    commitPagesUpdate(newPages);
  };

  // Ações de IA Contextual — texto aplicado DIRETAMENTE na página (sem passo intermediário de "inserir")
  const handleRunAiAction = async (action: AiAssistAction) => {
    if (!currentPage || isAiLoading) return;
    setIsAiLoading(true);
    setAiMessage('Processando com a inteligência editorial...');
    setAiAnalysisNotes([]);

    try {
      const fullPageText = currentPage.elements.map(e => e.content).join('\n\n');
      const service = aiAssistantRef.current || new AiAssistantService(new AiService({ provider: 'local-builtin' }));
      
      const currentChapter = project.kdpChapters?.find(c => c.index === currentPage.chapterIndex);
      const res = await service.executeAction(action, fullPageText || 'Texto da página', project, currentChapter);

      if (res.analysisNotes && res.analysisNotes.length > 0) {
        setAiAnalysisNotes(res.analysisNotes);
        setAiMessage(res.text || 'Análise concluída com sucesso.');
      } else if (res.text) {
        if (action === 'continue' || action === 'expand') {
          // Adiciona novo parágrafo direto com o texto — sem elemento vazio intermediário
          const newElem = {
            id: `elem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type: 'paragraph' as const,
            content: res.text,
            alignment: 'justify' as const
          };
          const updatedElements = [...currentPage.elements, newElem];
          const newPages = pages.map((p, idx) =>
            idx === selectedPageIndex ? { ...p, elements: updatedElements } : p
          );
          commitPagesUpdate(newPages);
        } else {
          // Substitui o primeiro parágrafo selecionado diretamente
          if (currentPage.elements.length > 0) {
            handleUpdateElementContent(currentPage.elements[0].id, res.text);
          }
        }
        setAiMessage('✅ Texto aprimorado aplicado diretamente à página!');
      }
    } catch (err: any) {
      setAiMessage(`Erro na operação: ${err.message || 'Falha ao processar.'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Executa a expansão e enriquecimento do capítulo com IA
  // Texto inserido DIRETAMENTE nas páginas — modal fecha automático ao concluir
  const handleExecuteChapterExpansion = async () => {
    const targetChapter = project.kdpChapters?.find(c => c.index === currentPage?.chapterIndex) || project.kdpChapters?.[0];
    if (!targetChapter) return;
    setIsExpanding(true);
    setExpandSuccessMessage('');

    // Guarda índice da página atual para manter o foco após rediagramação
    const savedPageIndex = selectedPageIndex;

    try {
      const concept = project.kdpConcept || {
        title: project.title,
        subtitle: project.subtitle || '',
        hook: project.topic || project.title,
        audience: project.targetAudience || 'Geral',
        readingLevel: 'Intermediário',
        tone: 'Inspirador e prático',
        promise: project.description || project.title,
        differentiator: '',
        shortSynopsis: project.description || '',
        longSynopsis: project.description || '',
        targetWordCount: 25000,
        targetChapterCount: project.kdpChapters?.length || 10,
        targetPages: project.estimatedPages || 160,
        trimSize: project.trimSize || '6x9',
        paperType: project.paperType || 'bw-white',
        comparableTitles: [],
        themes: [project.topic || project.title],
        titleOptions: []
      };

      const bible = project.kdpBible || {
        characters: [],
        locations: [],
        styleGuide: { artStyle: '', palette: [], tone: '' }
      };

      const result = LocalAiEngine.expandChapterProse(
        concept,
        bible,
        targetChapter,
        project.kdpBookType || 'self-help',
        expandMode,
        expandCustomPrompt
      );

      const updatedChapters: IBookChapter[] = (project.kdpChapters || []).map(ch =>
        ch.index === targetChapter.index
          ? { ...ch, prose: result.prose, wordCount: result.totalWords, status: 'REVISADO' as const }
          : ch
      );

      let updatedProject: BookProject = {
        ...project,
        kdpChapters: updatedChapters
      };

      // Recalcula as páginas visuais com o novo texto
      const newPages = PageEngine.generateVisualPagesFromManuscript(updatedProject);
      updatedProject = {
        ...updatedProject,
        visualPages: newPages,
        actualPages: newPages.length,
        updatedAt: Date.now()
      };

      setPages(newPages);
      onUpdateProject(updatedProject);

      // Mantém o foco na mesma página (ou na última do capítulo expandido se saiu do range)
      const newIdx = Math.min(savedPageIndex, newPages.length - 1);
      setSelectedPageIndex(newIdx);

      // Fecha o modal automaticamente com mensagem de sucesso brevemente exibida
      setExpandSuccessMessage(`✅ +${result.addedWords} palavras adicionadas ao Capítulo (Total: ${result.totalWords} palavras). Páginas rediagramadas!`);
      setTimeout(() => {
        setIsExpandModalOpen(false);
        setExpandSuccessMessage('');
      }, 2200);
    } catch (err: any) {
      setExpandSuccessMessage(`Erro ao expandir: ${err.message || 'Falha ao processar.'}`);
    } finally {
      setIsExpanding(false);
    }
  };

  const activeChapterForExpand = project.kdpChapters?.find(c => c.index === currentPage?.chapterIndex) || project.kdpChapters?.[0];

  return (
    <div className="visual-editor-container">
      {/* TOOLBAR COMPACTA DO EDITOR VISUAL */}
      <header className="editor-top-toolbar">
        <div className="toolbar-left-group">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-white">
              Página {currentPage?.pageNumber || selectedPageIndex + 1} de {pages.length}
            </span>
            <span className="text-[11px] text-muted">
              • {currentPage?.type === 'chapter-opener' ? 'Abertura de Capítulo' : currentPage?.type === 'body' ? 'Corpo de Texto' : currentPage?.type || 'Página'}
            </span>
            <span className="badge-trim-size font-mono">{currentTrim}</span>
          </div>
        </div>

        <div className="toolbar-center-controls">
          {/* ZOOM */}
          <div className="zoom-controls-box">
            <button 
              className="btn-icon-subtle" 
              onClick={() => setZoomLevel(Math.max(60, zoomLevel - 15))}
              title="Reduzir Zoom"
            >
              <ZoomOut size={15} />
            </button>
            <span className="zoom-pct-label">{zoomLevel}%</span>
            <button 
              className="btn-icon-subtle" 
              onClick={() => setZoomLevel(Math.min(160, zoomLevel + 15))}
              title="Aumentar Zoom"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* LINHAS GUIA */}
          <button 
            className={`btn-toggle-guides ${showGuidelines ? 'active' : ''}`}
            onClick={() => setShowGuidelines(!showGuidelines)}
            title="Alternar Margens e Guias KDP"
          >
            <Sliders size={14} />
            <span>Guias KDP</span>
          </button>

          {/* MEMÓRIA DO LIVRO */}
          <button 
            className="btn-pill-memory"
            onClick={onOpenMemoryModal}
            title="Abrir Memória Contextual do Livro"
          >
            <Wand2 size={14} className="text-amber-400" />
            <span>Memória do Livro</span>
          </button>

          {/* NAVEGAÇÃO RÁPIDA ENTRE PÁGINAS */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5">
            <button
              type="button"
              className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => setSelectedPageIndex(Math.max(0, selectedPageIndex - 1))}
              disabled={selectedPageIndex === 0}
              title="Página Anterior"
            >
              ←
            </button>
            <span className="text-[11px] font-semibold text-slate-300 px-1">
              #{currentPage?.pageNumber || selectedPageIndex + 1}
            </span>
            <button
              type="button"
              className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => setSelectedPageIndex(Math.min(pages.length - 1, selectedPageIndex + 1))}
              disabled={selectedPageIndex >= pages.length - 1}
              title="Próxima Página"
            >
              →
            </button>
          </div>

          {/* BOTÃO PRINCIPAL: GERAÇÃO PROGRESSIVA DA PÁGINA (SEÇÕES 8, 9 E 10) */}
          {(!currentPage?.elements || currentPage.elements.filter(e => e.type === 'paragraph').length === 0 || currentPage.status === 'pending') ? (
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 border border-emerald-400/30 transition-all cursor-pointer disabled:opacity-50"
              onClick={handleGenerateCurrentPageProgressively}
              disabled={isProgressiveGenerating}
              title="Escrever e diagramar esta página respeitando o título e objetivo com IA"
            >
              {isProgressiveGenerating ? (
                <>
                  <RefreshCw size={14} className="spin-animate text-white" />
                  <span>Gerando #{currentPage?.pageNumber}...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-amber-200" />
                  <span>⚡ Gerar Página #{currentPage?.pageNumber || selectedPageIndex + 1} com IA</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/50 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              onClick={handleRegenerateCurrentPage}
              disabled={isProgressiveGenerating}
              title="Regenerar apenas o conteúdo desta página com IA"
            >
              <RefreshCw size={13} className={isProgressiveGenerating ? 'spin-animate text-blue-400' : 'text-slate-400'} />
              <span>Regenerar #{currentPage?.pageNumber}</span>
            </button>
          )}

          {/* FEEDBACK DE SUCESSO DA GERAÇÃO */}
          {progressiveSuccessMsg && (
            <span className="text-[11px] font-semibold text-emerald-400 animate-in fade-in">
              {progressiveSuccessMsg}
            </span>
          )}

          {/* GERAR E DIAGRAMAR TODO O LIVRO COM IA SEGUNDO META DE PÁGINAS */}
          <button 
            className="btn-generate-full-book"
            onClick={handleGenerateFullBookManuscript}
            title="Redigir e diagramar todas as páginas do livro de acordo com o total de páginas escolhido"
          >
            <Sparkles size={14} />
            <span>⚡ Livro Completo ({project.estimatedPages || 150} P.)</span>
          </button>
        </div>

        <div className="toolbar-right-group">
          {/* AUTOSAVE INDICATOR */}
          <div className="autosave-status-indicator">
            {isAutosaving ? (
              <span className="saving-text">
                <RefreshCw size={13} className="spin-animate text-blue-400" /> Salvando...
              </span>
            ) : (
              <span className="saved-text" title={`Último salvamento às ${lastSavedTime || 'recente'}`}>
                <Check size={14} className="text-emerald-400" /> Salvo ✓
              </span>
            )}
          </div>

          {/* CONTROLE DE SOMBRA / FILIGRANA TEMÁTICA DA HISTÓRIA (0 A 5%) */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs mr-2">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors font-semibold text-[11px] ${
                enableWatermark 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              onClick={() => setEnableWatermark(!enableWatermark)}
              title="Alterna a exibição da silhueta/sombra temática da história em cada página."
            >
              <Sparkles size={12} />
              <span>Sombra: {enableWatermark ? 'LIGADA' : 'DESLIGADA'}</span>
            </button>

            {enableWatermark && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
                <span className="text-[10px] text-slate-300 whitespace-nowrap">
                  <strong className="text-blue-400">{watermarkOpacity.toFixed(1)}%</strong>
                </span>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                  className="w-16 accent-blue-500 cursor-pointer h-1"
                  title="Ajuste a intensidade da sombra temática (0% a 5% de opacidade)"
                />
              </div>
            )}
          </div>

          {/* PREVIEW FULL SCREEN */}
          <button className="btn-editor-preview" onClick={onOpenPreview}>
            <Eye size={15} />
            <span>Visualizar</span>
          </button>
        </div>
      </header>

      {/* ÁREA DE TRABALHO DE 3 COLUNAS */}
      <div className="editor-workspace-grid">
        {/* COLUNA 1: MINIATURAS DAS PÁGINAS */}
        <aside className="editor-sidebar-thumbnails">
          <div className="thumbnails-header">
            <span className="thumbnails-count">Páginas ({pages.length})</span>
            <button className="btn-add-page-small" onClick={handleAddPage} title="Adicionar Página">
              <Plus size={14} /> Nova
            </button>
          </div>

          <div className="thumbnails-scroll-list">
            {pages.map((p, idx) => {
              const isSelected = idx === selectedPageIndex;
              const isRight = p.pageNumber % 2 !== 0;

              return (
                <div 
                  key={p.id} 
                  className={`thumbnail-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedPageIndex(idx)}
                >
                  <div className="thumbnail-card-header">
                    <span className="thumbnail-num">#{p.pageNumber}</span>
                    <span className="thumbnail-side-label">{isRight ? 'Dir (Ímpar)' : 'Esq (Par)'}</span>
                  </div>

                  <div className="thumbnail-canvas-mini" style={{ aspectRatio: `${1 / aspectRatio}` }}>
                    <div className="mini-page-content-preview">
                      <div className="mini-badge-type">{p.type}</div>
                      {p.elements.slice(0, 3).map((e, eIdx) => (
                        <div 
                          key={e.id || eIdx} 
                          className={`mini-line-preview ${e.type.includes('title') || e.type.includes('heading') ? 'title-line' : 'body-line'}`} 
                        />
                      ))}
                    </div>
                  </div>

                  <div className="thumbnail-actions-bar">
                    <button 
                      className="btn-tiny-action" 
                      onClick={(ev) => { ev.stopPropagation(); handleMovePage('up'); }} 
                      disabled={idx === 0}
                      title="Mover para Cima"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button 
                      className="btn-tiny-action" 
                      onClick={(ev) => { ev.stopPropagation(); handleMovePage('down'); }} 
                      disabled={idx === pages.length - 1}
                      title="Mover para Baixo"
                    >
                      <ArrowDown size={11} />
                    </button>
                    <button 
                      className="btn-tiny-action" 
                      onClick={(ev) => { ev.stopPropagation(); handleDuplicatePage(); }}
                      title="Duplicar Página"
                    >
                      <Copy size={11} />
                    </button>
                    <button 
                      className="btn-tiny-action text-rose-400" 
                      onClick={(ev) => { ev.stopPropagation(); handleDeletePage(); }} 
                      disabled={pages.length <= 1}
                      title="Excluir Página"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* COLUNA 2: PÁGINA CENTRAL EM TAMANHO / PROPORÇÃO REAL */}
        <main className="editor-center-stage">
          <div 
            className="book-page-canvas-wrapper" 
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            <div 
              className={`book-page-sheet ${project.paperType === 'bw-cream' ? 'paper-cream' : 'paper-white'}`}
              style={{
                width: '580px',
                minHeight: '870px',
                aspectRatio: `${1 / aspectRatio}`,
                padding: '3.75rem 3.25rem 3.5rem 3.25rem',
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              {/* LINHAS GUIA KDP */}
              {showGuidelines && (
                <div className="kdp-guidelines-overlay">
                  <div 
                    className="guide-inner-safe-box"
                    style={{
                      top: '20px',
                      bottom: '20px',
                      left: isRightPage ? '26px' : '20px',
                      right: isRightPage ? '20px' : '26px'
                    }}
                  >
                    <span className="guide-safe-label">Área de Impressão Segura KDP ({currentTrim})</span>
                  </div>
                  <div className="guide-bleed-outer" />
                </div>
              )}

              {/* SOMBRA / FILIGRANA TEMÁTICA DA HISTÓRIA (0% A 5% DE OPACIDADE, ROTATIVA E NUNCA SE REPETE) */}
              {enableWatermark && watermarkOpacity > 0 && (
                <div 
                  className="editor-sheet-watermark"
                  style={{
                    position: 'absolute',
                    inset: '20% 12% 12% 12%',
                    backgroundImage: `url("${WatermarkArtService.getWatermarkSvgDataUrl(selectedPageIndex + 1, currentPage?.chapterIndex || 1, watermarkOpacity)}")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    backgroundSize: 'contain',
                    pointerEvents: 'none',
                    zIndex: 1,
                    transition: 'opacity 0.2s ease'
                  }}
                  title={`Sombra temática: ${WatermarkArtService.getMotifForPage(selectedPageIndex + 1, currentPage?.chapterIndex || 1).name}`}
                />
              )}

              {/* CABEÇALHO CORRENTE (SEM NOME DO AUTOR) */}
              {currentPage?.headerText && currentPage?.type !== 'chapter-opener' && (
                <div className="page-running-header" style={{ fontFamily: typography.fontFamily, position: 'relative', zIndex: 2 }}>
                  <span>
                    {currentPage.headerText
                      .replace(new RegExp(`por\\s*${project.author || ''}`, 'i'), '')
                      .replace(new RegExp(`${project.author || ''}`, 'i'), '')
                      .trim() || project.title}
                  </span>
                </div>
              )}

              {/* CONTEÚDO EDITÁVEL DOS ELEMENTOS */}
              <div 
                className="page-elements-container"
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: `${typography.fontSizePt}pt`,
                  lineHeight: typography.lineHeight,
                  textAlign: typography.textAlign
                }}
              >
                {/* BANNER EDITORIAL DE PÁGINA PROGRESSIVA PENDENTE (SEÇÕES 8, 9, 10 E 15) */}
                {currentPage?.status === 'pending' && !currentPage.elements.some(e => e.type === 'paragraph') && (
                  <div className="pending-editorial-box my-4 p-5 rounded-xl border border-blue-200 bg-blue-50/70 text-slate-800 text-center shadow-sm">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold tracking-wide uppercase mb-2">
                      <Sparkles size={12} /> Restrição Editorial da Página
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      {currentPage.title || `Página #${currentPage.pageNumber}`}
                    </h3>
                    {currentPage.goal && (
                      <p className="text-xs text-slate-600 mb-4 max-w-md mx-auto leading-relaxed">
                        <strong>Objetivo:</strong> {currentPage.goal}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleGenerateCurrentPageProgressively}
                      disabled={isProgressiveGenerating}
                      className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isProgressiveGenerating ? (
                        <>
                          <RefreshCw size={14} className="spin-animate text-white" />
                          <span>Escrevendo e Diagramando Conteúdo Completo...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="text-amber-200" />
                          <span>⚡ Gerar Conteúdo Completo Desta Página</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Geração progressiva com memória estruturada e continuidade com a página anterior.
                    </p>
                  </div>
                )}

                {currentPage?.elements && currentPage.elements.length > 0 ? (
                  currentPage.elements.map((elem, elemIdx) => (
                    <div 
                      key={elem.id} 
                      className={`page-element-block block-type-${elem.type}`}
                      style={{ marginBottom: `${typography.paragraphSpacingPt}pt` }}
                    >
                      {elem.type === 'chapter-title' ? (
                        <div 
                          className="editorial-chapter-num"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleUpdateElementContent(elem.id, e.currentTarget.textContent || '')}
                          style={{
                            fontFamily: typography.headingFont || 'Cinzel, Georgia, serif',
                            letterSpacing: '0.25em',
                            textTransform: 'uppercase',
                            fontSize: '11pt',
                            color: '#64748b',
                            textAlign: 'center',
                            marginTop: '1.5rem',
                            marginBottom: '0.75rem',
                            outline: 'none',
                            cursor: 'text'
                          }}
                        >
                          {elem.content}
                        </div>
                      ) : elem.type === 'heading' ? (
                        <div 
                          className={currentPage?.type === 'chapter-opener' ? 'editorial-chapter-title' : 'editorial-section-heading'}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleUpdateElementContent(elem.id, e.currentTarget.textContent || '')}
                          style={{
                            fontFamily: typography.headingFont || 'Cinzel, Georgia, serif',
                            fontSize: currentPage?.type === 'chapter-opener' ? '18pt' : '12.5pt',
                            fontWeight: 700,
                            lineHeight: 1.35,
                            textAlign: currentPage?.type === 'chapter-opener' ? 'center' : 'left',
                            color: '#0f172a',
                            marginTop: currentPage?.type === 'chapter-opener' ? '0' : '1.5rem',
                            marginBottom: currentPage?.type === 'chapter-opener' ? '1.75rem' : '0.75rem',
                            borderBottom: currentPage?.type === 'chapter-opener' ? '1px solid #e2e8f0' : 'none',
                            paddingBottom: currentPage?.type === 'chapter-opener' ? '1.25rem' : '0',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            outline: 'none',
                            cursor: 'text'
                          }}
                        >
                          {elem.content}
                        </div>
                      ) : elem.type === 'quote' ? (
                        <div className="quote-box-display">
                          <Quote size={18} className="quote-icon" />
                          <div 
                            className="textarea-editable-quote"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => handleUpdateElementContent(elem.id, e.currentTarget.textContent || '')}
                            style={{ outline: 'none', cursor: 'text' }}
                          >
                            {elem.content}
                          </div>
                        </div>
                      ) : elem.type === 'callout' ? (
                        <div className="callout-box-display">
                          <div 
                            className="textarea-editable-callout"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => handleUpdateElementContent(elem.id, e.currentTarget.textContent || '')}
                            style={{ outline: 'none', cursor: 'text' }}
                          >
                            {elem.content}
                          </div>
                        </div>
                      ) : elem.type === 'image' && elem.imageUrl ? (
                        <div className="page-image-container my-3 p-1 rounded-lg border border-slate-200/80 bg-white/40 text-center shadow-sm">
                          <img 
                            src={elem.imageUrl} 
                            alt="Ilustração do Livro" 
                            className="w-full max-h-56 object-cover rounded-md mx-auto" 
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = EditorialArtService.getEditorialFallbackSvg(elem.caption || 'Ilustração do Livro', project.title);
                            }}
                          />
                          {elem.caption && <span className="image-caption-text block text-[10px] text-slate-500 italic mt-1.5 px-2">{elem.caption}</span>}
                        </div>
                      ) : (
                        <div 
                          className="editorial-paragraph-wrap"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleUpdateElementContent(elem.id, e.currentTarget.textContent || '')}
                          style={{
                            fontFamily: typography.fontFamily || 'Georgia, serif',
                            fontSize: `${typography.fontSizePt || 11}pt`,
                            lineHeight: typography.lineHeight || 1.75,
                            textAlign: 'justify',
                            textJustify: 'inter-word',
                            color: '#1e293b',
                            textIndent: (elemIdx === 0 && currentPage?.type === 'chapter-opener') ? '0' : '1.5em',
                            marginBottom: '0.5rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            hyphens: 'auto',
                            outline: 'none',
                            cursor: 'text'
                          }}
                        >
                          {elemIdx === 0 && typography.dropCap && currentPage?.type === 'chapter-opener' && elem.content.length > 3 ? (
                            <>
                              <span 
                                className="editorial-drop-cap"
                                style={{
                                  float: 'left',
                                  fontSize: '3.4em',
                                  lineHeight: 0.8,
                                  fontFamily: typography.headingFont || 'Cinzel, Georgia, serif',
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  marginRight: '0.15em',
                                  paddingTop: '0.05em'
                                }}
                              >
                                {elem.content.charAt(0)}
                              </span>
                              {elem.content.slice(1)}
                            </>
                          ) : (
                            elem.content
                          )}
                        </div>
                      )}

                      <button 
                        className="btn-remove-element" 
                        onClick={() => handleDeleteElement(elem.id)}
                        title="Remover Elemento"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-page-placeholder">
                    <p className="text-muted">Página em branco.</p>
                    <button className="btn-add-initial-text" onClick={() => handleAddElement('paragraph')}>
                      <Plus size={14} /> Adicionar Texto
                    </button>
                  </div>
                )}

                {/* AÇÕES DE CONTINUIDADE EDITORIAL DA PÁGINA (SEÇÕES 11, 15 E 21) */}
                {currentPage?.elements?.some(e => e.type === 'paragraph') && (
                  <div className="page-continuity-footer-bar mt-6 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={handleRegenerateCurrentPage}
                      disabled={isProgressiveGenerating}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer bg-transparent border-none text-[11px]"
                      title="Regenerar apenas esta página preservando o contexto editorial"
                    >
                      <RefreshCw size={11} className={isProgressiveGenerating ? 'spin-animate text-blue-500' : ''} />
                      <span>Regenerar esta página</span>
                    </button>

                    {selectedPageIndex < pages.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setSelectedPageIndex(selectedPageIndex + 1)}
                        className="flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer bg-transparent border-none text-[11px]"
                      >
                        <span>Avançar para Página #{selectedPageIndex + 2}</span>
                        <span>→</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* RODAPÉ E NÚMERO DA PÁGINA */}
              {currentPage?.footerText && (
                <div className="page-running-footer">
                  <span className="page-number-display">{currentPage.footerText}</span>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* COLUNA 3: PAINEL DE PROPRIEDADES E FERRAMENTAS */}
        <aside className="editor-properties-panel">
          <nav className="panel-tab-headers">
            <button 
              className={`panel-tab-btn ${activeTab === 'elements' ? 'active' : ''}`}
              onClick={() => setActiveTab('elements')}
            >
              <Plus size={14} /> Elementos
            </button>
            <button 
              className={`panel-tab-btn ${activeTab === 'page_settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('page_settings')}
            >
              <Sliders size={14} /> Página
            </button>
            <button 
              className={`panel-tab-btn ${activeTab === 'typography' ? 'active' : ''}`}
              onClick={() => setActiveTab('typography')}
            >
              <Type size={14} /> Fontes
            </button>
            <button 
              className={`panel-tab-btn ${activeTab === 'ai_assistant' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai_assistant')}
            >
              <Sparkles size={14} className="text-amber-400" /> IA
            </button>
          </nav>

          <div className="panel-content-body">
            {/* ABA: ELEMENTOS */}
            {activeTab === 'elements' && (
              <div className="tab-pane-elements">
                <h4 className="panel-section-title">Inserir na Página</h4>
                <div className="elements-button-grid">
                  <button className="btn-element-card" onClick={() => handleAddElement('chapter-title')}>
                    <Type size={16} />
                    <span>Título de Capítulo</span>
                  </button>
                  <button className="btn-element-card" onClick={() => handleAddElement('heading')}>
                    <Type size={16} />
                    <span>Subtítulo / Seção</span>
                  </button>
                  <button className="btn-element-card" onClick={() => handleAddElement('paragraph')}>
                    <FileText size={16} />
                    <span>Parágrafo de Texto</span>
                  </button>
                  <button className="btn-element-card" onClick={() => handleAddElement('quote')}>
                    <Quote size={16} />
                    <span>Citação em Bloco</span>
                  </button>
                  <button className="btn-element-card" onClick={() => handleAddElement('callout')}>
                    <Layers size={16} />
                    <span>Caixa de Destaque</span>
                  </button>
                </div>

                <div className="page-info-box mt-4">
                  <span className="font-semibold text-xs text-secondary">PÁGINA ATUAL</span>
                  <p className="text-xs text-muted">
                    Página #{currentPage?.pageNumber} ({currentPage?.type}) • {currentPage?.elements?.length || 0} elementos
                  </p>
                </div>
              </div>
            )}

            {/* ABA: CONFIGURAÇÃO DE PÁGINA & MARGENS */}
            {activeTab === 'page_settings' && (
              <div className="tab-pane-settings">
                <h4 className="panel-section-title">Configurações de Corte & Margens KDP</h4>

                {/* TRIM SIZE */}
                <div className="form-field-group">
                  <label className="field-label">Formato do Livro (Trim Size)</label>
                  <select 
                    className="select-field"
                    value={currentTrim}
                    onChange={(e) => {
                      const newTrim = e.target.value as TrimSize;
                      const updated = {
                        ...project,
                        trimSize: newTrim,
                        pageSettings: {
                          ...project.pageSettings!,
                          trimSize: newTrim
                        }
                      };
                      onUpdateProject(updated);
                    }}
                  >
                    <option value="6x9">6" x 9" (Padrão mais vendido KDP)</option>
                    <option value="5.5x8.5">5.5" x 8.5" (Trade Paperback)</option>
                    <option value="5x8">5" x 8" (Compacto ficção)</option>
                    <option value="5.25x8">5.25" x 8" (Romance clássico)</option>
                    <option value="7x10">7" x 10" (Técnico / Guias)</option>
                    <option value="8x10">8" x 10" (Livro didático / Apostila)</option>
                    <option value="8.5x11">8.5" x 11" (Workbook / Coloring)</option>
                    <option value="8.5x8.5">8.5" x 8.5" (Infantil Quadrado)</option>
                  </select>
                </div>

                {/* AUTO KDP BINDING MARGIN */}
                <div className="checkbox-field-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox"
                      checked={project.pageSettings?.autoKdpBindingMargin ?? true}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const pageCount = pages.length || 150;
                        const bindingMargin = checked ? calculateKdpBindingMargin(pageCount) : margins.inside;
                        const updated = {
                          ...project,
                          pageSettings: {
                            ...project.pageSettings!,
                            autoKdpBindingMargin: checked,
                            margins: {
                              ...margins,
                              inside: bindingMargin
                            }
                          }
                        };
                        onUpdateProject(updated);
                      }}
                    />
                    <span className="font-medium text-sm">Auto KDP Binding Margin</span>
                  </label>
                  <span className="field-hint">
                    Calcula a margem de encadernação KDP ({calculateKdpBindingMargin(pages.length)}" pol.) conforme a quantidade de páginas ({pages.length}).
                  </span>
                </div>

                {/* MARGENS MANUAIS */}
                <div className="margins-inputs-grid">
                  <div className="margin-input-col">
                    <label>Topo (pol)</label>
                    <input 
                      type="number" 
                      step="0.05"
                      min="0.25" 
                      max="2.0" 
                      value={margins.top}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0.75;
                        onUpdateProject({
                          ...project,
                          pageSettings: {
                            ...project.pageSettings!,
                            margins: { ...margins, top: val }
                          }
                        });
                      }}
                    />
                  </div>
                  <div className="margin-input-col">
                    <label>Base (pol)</label>
                    <input 
                      type="number" 
                      step="0.05"
                      min="0.25" 
                      max="2.0" 
                      value={margins.bottom}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0.75;
                        onUpdateProject({
                          ...project,
                          pageSettings: {
                            ...project.pageSettings!,
                            margins: { ...margins, bottom: val }
                          }
                        });
                      }}
                    />
                  </div>
                  <div className="margin-input-col">
                    <label>Gutter / Interna</label>
                    <input 
                      type="number" 
                      step="0.05"
                      min="0.375" 
                      max="2.0" 
                      value={margins.inside}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0.75;
                        onUpdateProject({
                          ...project,
                          pageSettings: {
                            ...project.pageSettings!,
                            autoKdpBindingMargin: false,
                            margins: { ...margins, inside: val }
                          }
                        });
                      }}
                    />
                  </div>
                  <div className="margin-input-col">
                    <label>Externa (pol)</label>
                    <input 
                      type="number" 
                      step="0.05"
                      min="0.25" 
                      max="2.0" 
                      value={margins.outside}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0.50;
                        onUpdateProject({
                          ...project,
                          pageSettings: {
                            ...project.pageSettings!,
                            margins: { ...margins, outside: val }
                          }
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ABA: TIPOGRAFIA */}
            {activeTab === 'typography' && (
              <div className="tab-pane-typography">
                <h4 className="panel-section-title">Estilos Globais de Tipografia</h4>

                <div className="form-field-group">
                  <label className="field-label">Família da Fonte (Corpo)</label>
                  <select 
                    className="select-field"
                    value={typography.fontFamily}
                    onChange={(e) => {
                      onUpdateProject({
                        ...project,
                        typography: { ...typography, fontFamily: e.target.value, bodyFont: e.target.value }
                      });
                    }}
                  >
                    <option value="Georgia, serif">Georgia (Elegante & Confortável)</option>
                    <option value="'Times New Roman', Times, serif">Times New Roman (Clássico Tradicional)</option>
                    <option value="'Garamond', serif">Garamond (Ficção Literária Refinada)</option>
                    <option value="'Inter', sans-serif">Inter (Moderno & Técnico)</option>
                    <option value="'Merriweather', serif">Merriweather (Livros Didáticos)</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="field-label">Fonte dos Títulos</label>
                  <select 
                    className="select-field"
                    value={typography.headingFont}
                    onChange={(e) => {
                      onUpdateProject({
                        ...project,
                        typography: { ...typography, headingFont: e.target.value }
                      });
                    }}
                  >
                    <option value="'Cinzel', Georgia, serif">Cinzel (Clássico & Dramático)</option>
                    <option value="'Montserrat', sans-serif">Montserrat (Executivo & Contemporâneo)</option>
                    <option value="Georgia, serif">Georgia Negrito</option>
                    <option value="'Space Grotesk', sans-serif">Space Grotesk (Ficção Científica)</option>
                  </select>
                </div>

                <div className="typography-sliders-grid">
                  <div className="slider-row">
                    <span>Tamanho ({typography.fontSizePt} pt)</span>
                    <input 
                      type="range" 
                      min="9" 
                      max="14" 
                      step="0.5"
                      value={typography.fontSizePt}
                      onChange={(e) => {
                        onUpdateProject({
                          ...project,
                          typography: { ...typography, fontSizePt: parseFloat(e.target.value) }
                        });
                      }}
                    />
                  </div>

                  <div className="slider-row">
                    <span>Entrelinha ({typography.lineHeight}x)</span>
                    <input 
                      type="range" 
                      min="1.2" 
                      max="2.0" 
                      step="0.05"
                      value={typography.lineHeight}
                      onChange={(e) => {
                        onUpdateProject({
                          ...project,
                          typography: { ...typography, lineHeight: parseFloat(e.target.value) }
                        });
                      }}
                    />
                  </div>

                  <div className="slider-row">
                    <span>Espaço Parágrafos ({typography.paragraphSpacingPt} pt)</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="16" 
                      step="1"
                      value={typography.paragraphSpacingPt}
                      onChange={(e) => {
                        onUpdateProject({
                          ...project,
                          typography: { ...typography, paragraphSpacingPt: parseInt(e.target.value) }
                        });
                      }}
                    />
                  </div>
                </div>

                {/* DROP CAP */}
                <div className="checkbox-field-group mt-3">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox"
                      checked={typography.dropCap}
                      onChange={(e) => {
                        onUpdateProject({
                          ...project,
                          typography: { ...typography, dropCap: e.target.checked }
                        });
                      }}
                    />
                    <span className="font-medium text-sm">Letra Capitular (Drop Cap no início do capítulo)</span>
                  </label>
                </div>
              </div>
            )}

            {/* ABA: ASSISTENTE DE IA */}
            {activeTab === 'ai_assistant' && (
              <div className="tab-pane-ai">
                <div className="ai-panel-header-badge">
                  <Sparkles size={16} className="text-amber-400" />
                  <span className="font-semibold text-sm">Coautor IA Editorial</span>
                </div>

                <p className="text-xs text-muted mb-3">
                  A IA utiliza as informações da <strong>Memória do Livro</strong> para manter coerência com personagens, locais e regras.
                </p>

                {/* GRUPO: GERAR & EXPANDIR */}
                <span className="ai-group-label">GERAR & EXPANDIR</span>
                <div className="ai-buttons-stack">
                  <button 
                    className="btn-ai-action" 
                    onClick={() => handleRunAiAction('continue')}
                    disabled={isAiLoading}
                  >
                    <Wand2 size={14} /> Continuar Escrita Desta Página
                  </button>
                  <button 
                    className="btn-ai-action" 
                    onClick={() => handleRunAiAction('expand')}
                    disabled={isAiLoading}
                  >
                    <Plus size={14} /> Expandir Detalhes e Exemplos
                  </button>
                </div>

                {/* GRUPO: MELHORAR & POLIR */}
                <span className="ai-group-label mt-3">MELHORAR & POLIR</span>
                <div className="ai-buttons-stack">
                  <button 
                    className="btn-ai-action" 
                    onClick={() => handleRunAiAction('improve_pro')}
                    disabled={isAiLoading}
                  >
                    <Sparkles size={14} /> Deixar Mais Profissional
                  </button>
                  <button 
                    className="btn-ai-action" 
                    onClick={() => handleRunAiAction('simplify')}
                    disabled={isAiLoading}
                  >
                    <Type size={14} /> Simplificar & Tornar Fluido
                  </button>
                  <button 
                    className="btn-ai-action" 
                    onClick={() => handleRunAiAction('fix_grammar')}
                    disabled={isAiLoading}
                  >
                    <Check size={14} /> Corrigir Gramática & Pontuação
                  </button>
                </div>

                {/* GRUPO: ANALISAR COERÊNCIA */}
                <span className="ai-group-label mt-3">ANALISAR & AUDITAR</span>
                <div className="ai-buttons-stack">
                  <button 
                    className="btn-ai-action" 
                    onClick={() => handleRunAiAction('check_consistency')}
                    disabled={isAiLoading}
                  >
                    <Eye size={14} /> Checar Coerência c/ Memória do Livro
                  </button>
                  <button 
                    className="btn-ai-action" 
                    onClick={() => handleRunAiAction('detect_repetition')}
                    disabled={isAiLoading}
                  >
                    <AlertCircle size={14} /> Detectar Repetições de Palavras
                  </button>
                </div>

                {/* FEEDBACK DA IA */}
                {(isAiLoading || aiMessage || aiAnalysisNotes.length > 0) && (
                  <div className="ai-feedback-result-box mt-3">
                    {isAiLoading && (
                      <div className="ai-loading-indicator">
                        <RefreshCw size={15} className="spin-animate text-amber-400" />
                        <span>{aiMessage || 'IA trabalhando...'}</span>
                      </div>
                    )}
                    {!isAiLoading && aiMessage && (
                      <p className="ai-result-message">{aiMessage}</p>
                    )}
                    {aiAnalysisNotes.length > 0 && (
                      <ul className="ai-notes-bullet-list">
                        {aiAnalysisNotes.map((note, nIdx) => (
                          <li key={nIdx}>• {note}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* MODAL DE AUMENTAR & EXPANDIR CAPÍTULO COM IA */}
      {isExpandModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in duration-200">
            {/* CABEÇALHO */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Aumentar & Aprofundar Capítulo com IA</h3>
                  <p className="text-xs text-slate-400">
                    Capítulo {activeChapterForExpand?.index}: <span className="text-white font-medium">{activeChapterForExpand?.title}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsExpandModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* STATUS ATUAL DO CAPÍTULO */}
            <div className="mt-4 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Extensão Atual do Capítulo:</span>
                <span className="font-bold text-base text-blue-400">
                  {activeChapterForExpand?.wordCount || 0} palavras
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Status:</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Check size={12} /> Pronto para Ampliação
                </span>
              </div>
            </div>

            {/* SELEÇÃO DO MODO DE EXPANSÃO */}
            <div className="mt-5">
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Como você deseja aumentar e enriquecer este capítulo?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* OPÇÃO 1: EXEMPLOS */}
                <div 
                  onClick={() => setExpandMode('examples')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${expandMode === 'examples' ? 'bg-blue-600/20 border-blue-500 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>📚</span> Exemplos & Casos Reais
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Adiciona 2 estudos de caso detalhados com passo a passo prático e diagnóstico de erros comuns (+500 palavras).
                  </p>
                </div>

                {/* OPÇÃO 2: TEORIA */}
                <div 
                  onClick={() => setExpandMode('theory')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${expandMode === 'theory' ? 'bg-blue-600/20 border-blue-500 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>🔬</span> Aprofundamento Teórico
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Insere modelos mentais, fundamentação científica, neurobiologia e princípios estruturais (+600 palavras).
                  </p>
                </div>

                {/* OPÇÃO 3: DIÁLOGOS */}
                <div 
                  onClick={() => setExpandMode('dialogues')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${expandMode === 'dialogues' ? 'bg-blue-600/20 border-blue-500 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>🎭</span> Diálogos & Mentoria
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Adiciona conversas de mentoria direta ou cenas narrativas de confronto e revelação (+500 palavras).
                  </p>
                </div>

                {/* OPÇÃO 4: DOBRAR TAMANHO */}
                <div 
                  onClick={() => setExpandMode('double_length')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${expandMode === 'double_length' ? 'bg-blue-600/20 border-blue-500 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>🚀</span> Dobrar Tamanho do Capítulo
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Amplia todas as seções existentes com checklists práticos e desdobramentos operacionais (+1.200 palavras).
                  </p>
                </div>
              </div>

              {/* OPÇÃO 5: PERSONALIZADA */}
              <div 
                onClick={() => setExpandMode('custom')}
                className={`mt-2.5 p-3.5 rounded-xl border cursor-pointer transition-all ${expandMode === 'custom' ? 'bg-blue-600/20 border-blue-500 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}
              >
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>✍️</span> Instrução Editorial Específica
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Digite exatamente o que você deseja acrescentar a este capítulo (cenas, tópicos, argumentos).
                </p>
                {expandMode === 'custom' && (
                  <textarea
                    rows={3}
                    className="w-full mt-3 p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Adicionar uma reflexão profunda sobre o impacto da disciplina na vida financeira e um método de autoavaliação diária..."
                    value={expandCustomPrompt}
                    onChange={(e) => setExpandCustomPrompt(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* MENSAGEM DE SUCESSO OU ERRO */}
            {expandSuccessMessage && (
              <div className={`mt-4 p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${expandSuccessMessage.startsWith('Sucesso') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}`}>
                {expandSuccessMessage.startsWith('Sucesso') ? <Check size={16} className="text-emerald-400 shrink-0" /> : <AlertCircle size={16} className="text-rose-400 shrink-0" />}
                <span>{expandSuccessMessage}</span>
              </div>
            )}

            {/* AÇÕES */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsExpandModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleExecuteChapterExpansion}
                disabled={isExpanding}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isExpanding ? (
                  <>
                    <RefreshCw size={14} className="spin-animate" />
                    <span>Redigindo e Rediagramando Páginas...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>⚡ Aplicar Ampliação ao Capítulo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
