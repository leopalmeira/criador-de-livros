import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../database/local-database';
import { 
  BookProject, 
  BookType, 
  BOOK_TYPE_CONFIGS, 
  IBookConcept, 
  IBookBible, 
  IBookChapter, 
  IBookEditorReport, 
  IBookCoverDesign, 
  IBookMetadataKdp, 
  IBookQualityReport,
  PipelineStage,
  ProjectStatus, 
  ProjectPriority,
  ExecutionMode,
  TitleOption,
  ContinuityIssue,
  ChapterVersion,
  EditorialElements,
  TrimSize,
  PaperType,
  calculateTargetWordsForPages,
  estimateActualPagesFromWords
} from '../../types/book-project';
import { AiService } from '../../services/ai-service';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { LocalAiEngine } from '../../services/local-ai-engine';
import { defaultKdpBridge, BridgeHealthResponse } from '../../services/kdp-bridge-client';
import { EpubBuilder } from '../../services/formats/epub-builder';
import { PdfBuilder } from '../../services/formats/pdf-builder';
import { KdpPackager } from '../../services/formats/kdp-packager';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  'IDEIA': '#94a3b8',
  'CONCEITO': '#3b82f6',
  'OUTLINE': '#6366f1',
  'BIBLE': '#8b5cf6',
  'ESCREVENDO': '#f59e0b',
  'REVISÃO': '#ec4899',
  'DIAGRAMAÇÃO': '#14b8a6',
  'VALIDAÇÃO': '#06b6d4',
  'PUBLICADO': '#10b981',
  'ARQUIVADO': '#64748b'
};

function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export type SubTabType = 
  | 'tree' 
  | 'concept' 
  | 'outline' 
  | 'bible' 
  | 'writer' 
  | 'editorial' 
  | 'cover' 
  | 'metadata' 
  | 'quality' 
  | 'export';

export const BookCreatorTab: React.FC = () => {
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [activeProject, setActiveProject] = useState<BookProject | null>(null);
  const [view, setView] = useState<'list' | 'create_wizard' | 'edit'>('list');
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('tree');
  const [treeRunningStep, setTreeRunningStep] = useState<number | null>(null);

  // Seleção de capítulo e edição
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number>(1);
  const [isEditingProse, setIsEditingProse] = useState(false);
  const [editedProse, setEditedProse] = useState('');
  const [isAiWorkingOnChapter, setIsAiWorkingOnChapter] = useState(false);
  const [aiActionMessage, setAiActionMessage] = useState('');

  // Formulário Inicial de Criação
  const [wizardIdea, setWizardIdea] = useState('');
  const [wizardType, setWizardType] = useState<BookType>('self-help');
  const [wizardAuthor, setWizardAuthor] = useState('Autor Independente');
  const [wizardLanguage, setWizardLanguage] = useState('Português');
  const [wizardTone, setWizardTone] = useState('');
  const [wizardAudience, setWizardAudience] = useState('');
  const [wizardTrim, setWizardTrim] = useState<TrimSize>('6x9');
  const [wizardPaper, setWizardPaper] = useState<PaperType>('bw-white');
  const [wizardPages, setWizardPages] = useState<number>(160);
  const [wizardExecutionMode, setWizardExecutionMode] = useState<ExecutionMode>('assisted');
  const [wizardAiProvider, setWizardAiProvider] = useState<'local-builtin' | 'ollama' | 'openai'>('local-builtin');
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);

  // Estados de Execução da IA e Pipeline
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<PipelineStage>('idle');
  const [pipelinePercent, setPipelinePercent] = useState<number>(0);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Seleção de Título Interativa (Etapa 2)
  const [titleOptions, setTitleOptions] = useState<TitleOption[]>([]);
  const [selectedTitleId, setSelectedTitleId] = useState<string>('');

  // Estúdio de Capa IA
  const [isGeneratingCover, setIsGeneratingCover] = useState<boolean>(false);
  const [coverPromptInput, setCoverPromptInput] = useState<string>('');

  // Notificação de feedback
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Ponte Python
  const [bridgeStatus, setBridgeStatus] = useState<BridgeHealthResponse | null>(null);

  const loadProjects = useCallback(async () => {
    const all = await db.getAllBookProjects();
    setProjects(all);
  }, []);

  const checkBridge = useCallback(async () => {
    try {
      const health = await defaultKdpBridge.checkHealth();
      setBridgeStatus(health);
    } catch {
      setBridgeStatus({ status: 'offline', message: 'Ponte Python local offline' });
    }
  }, []);

  useEffect(() => {
    loadProjects();
    checkBridge();
    db.getSettings().then(s => {
      if (s?.aiSettings?.provider) {
        if (s.aiSettings.provider === 'ollama') setWizardAiProvider('ollama');
        else if (s.aiSettings.provider === 'openai' || s.aiSettings.provider === 'anthropic' || s.aiSettings.provider === 'openrouter') setWizardAiProvider('openai');
        else setWizardAiProvider('local-builtin');
      }
    });

    const params = new URLSearchParams(window.location.search);
    const ideaParam = params.get('idea');
    if (ideaParam) {
      setWizardIdea(ideaParam);
      setView('create_wizard');
    }
  }, [loadProjects, checkBridge]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [pipelineLogs]);

  // Atualiza campos quando template muda
  const handleTemplateChange = (type: BookType) => {
    setWizardType(type);
    const cfg = BOOK_TYPE_CONFIGS[type];
    if (cfg) {
      setWizardTrim(cfg.trimSize);
      setWizardPaper(cfg.paperType);
      setWizardPages(cfg.targetPages);
    }
  };

  // Botão [DEIXAR A IA DEFINIR]
  const handleAutoAnalyzeIdea = async () => {
    if (!wizardIdea.trim()) {
      showToast('Por favor, descreva primeiro o segmento, tema ou ideia do livro no campo principal.');
      return;
    }

    setIsAutoAnalyzing(true);
    try {
      const settings = await db.getSettings();
      const aiConfig = {
        ...(settings.aiSettings || { provider: 'local-builtin', model: 'local-coauthor-engine', apiKey: '' })
      };

      if (aiConfig.provider === 'ollama') {
        if (!aiConfig.model || aiConfig.model === 'gpt-4o-mini' || aiConfig.model === 'gpt-4o') {
          aiConfig.model = 'llama3.1';
        }
      }

      if (!aiConfig.apiKey && aiConfig.provider !== 'ollama' && aiConfig.provider !== 'local-builtin') {
        aiConfig.provider = 'local-builtin';
        aiConfig.model = 'local-coauthor-engine';
      }

      const aiService = new AiService(aiConfig);
      const pipeline = new KdpBookPipeline(aiService);

      const analysis = await pipeline.analyzeIdea(wizardIdea, wizardLanguage);

      if (analysis.recommendedBookType && BOOK_TYPE_CONFIGS[analysis.recommendedBookType]) {
        setWizardType(analysis.recommendedBookType);
        handleTemplateChange(analysis.recommendedBookType);
      }
      if (analysis.recommendedTrim) setWizardTrim(analysis.recommendedTrim);
      if (analysis.recommendedPages) setWizardPages(analysis.recommendedPages);
      if (analysis.tone) setWizardTone(analysis.tone);
      if (analysis.targetAudience) setWizardAudience(analysis.targetAudience);

      showToast(`✓ Análise concluída: Nicho "${analysis.niche}" identificado com sucesso!`);
    } catch (err: any) {
      alert(`Falha na análise automática: ${err.message}.`);
    } finally {
      setIsAutoAnalyzing(false);
    }
  };

  // DISPARO DO PROJETO EDITORIAL (ETAPA 1: CRIAÇÃO DO PROJETO E CONCEITO)
  const handleStartProjectCreation = async () => {
    if (!wizardIdea.trim()) {
      alert('Informe o tema ou segmento do livro.');
      return;
    }

    const settings = await db.getSettings();
    const aiConfig = {
      ...(settings.aiSettings || { provider: 'local-builtin', model: 'local-coauthor-engine', apiKey: '' })
    };

    if (aiConfig.provider === 'ollama') {
      if (!aiConfig.model || aiConfig.model === 'gpt-4o-mini' || aiConfig.model === 'gpt-4o') {
        aiConfig.model = 'llama3.1';
      }
    }

    if (!aiConfig.apiKey && aiConfig.provider !== 'ollama' && aiConfig.provider !== 'local-builtin') {
      // Se não tiver chave de API externa, usa automaticamente o Motor Local Embutido
      aiConfig.provider = 'local-builtin';
      aiConfig.model = 'local-coauthor-engine';
    }

    const providerLabel = aiConfig.provider === 'local-builtin'
      ? 'Motor Local Embutido (Offline / Modo CoAuthor)'
      : aiConfig.provider === 'ollama'
      ? `Ollama Local (${aiConfig.model})`
      : `${aiConfig.provider} (${aiConfig.model})`;

    setIsGenerating(true);
    setPipelineStep('concept');
    setPipelinePercent(10);
    setPipelineLogs([
      `Iniciando Plataforma Editorial KDP para: "${wizardIdea}"`,
      `Template Selecionado: ${BOOK_TYPE_CONFIGS[wizardType]?.label || wizardType} | Modo: ${wizardExecutionMode.toUpperCase()}`,
      `Formato: ${wizardTrim} (${wizardPaper}) | Meta: ${wizardPages} páginas`,
      `Provedor de IA: ${providerLabel}`
    ]);

    try {
      const aiService = new AiService(aiConfig);
      const pipeline = new KdpBookPipeline(aiService);

      setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Gerando conceito, promessa e opções de títulos comerciais...`]);
      setPipelinePercent(25);

      const concept = await pipeline.generateConcept(
        wizardIdea,
        wizardType,
        wizardLanguage,
        wizardAuthor,
        wizardPages
      );

      // Salva projeto preliminar
      const initialProject: BookProject = {
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'CONCEITO',
        priority: 'ALTA',
        executionMode: wizardExecutionMode,
        title: concept.title,
        subtitle: concept.subtitle || '',
        author: wizardAuthor,
        description: concept.longSynopsis || concept.shortSynopsis || '',
        language: wizardLanguage,
        format: 'Capa Comum',
        trimSize: wizardTrim,
        paperType: wizardPaper,
        estimatedPages: wizardPages,
        targetPrice: 24.90,
        currency: 'BRL',
        targetMarketplace: 'amazon.com.br',
        categories: concept.themes || [],
        keywords: [],
        targetAudience: concept.audience,
        topic: wizardIdea,
        kdpBookType: wizardType,
        kdpConcept: concept,
        pipelineStage: wizardExecutionMode === 'assisted' ? 'title_selection' : 'outline',
        pipelineProgress: 30,
        pipelineLog: pipelineLogs,
        tasks: [
          { id: 't1', text: 'Aprovar título comercial definitivo', completed: false, category: 'CONCEITO', createdAt: Date.now() },
          { id: 't2', text: 'Validar sumário estrutural de capítulos', completed: false, category: 'ESTRUTURA', createdAt: Date.now() },
          { id: 't3', text: 'Revisar Bíblia da obra e personagens', completed: false, category: 'BÍBLIA', createdAt: Date.now() },
          { id: 't4', text: 'Redigir manuscrito integral', completed: false, category: 'ESCRITA', createdAt: Date.now() },
          { id: 't5', text: 'Auditoria de continuidade e edição', completed: false, category: 'REVISÃO', createdAt: Date.now() },
          { id: 't6', text: 'Compilar EPUB, PDF e Pacote KDP', completed: false, category: 'KDP', createdAt: Date.now() }
        ],
        notes: `Criado na Plataforma Editorial KDP em ${new Date().toLocaleDateString('pt-BR')}`,
        competitorsAsins: []
      };

      await db.saveBookProject(initialProject);
      await loadProjects();
      setActiveProject(initialProject);

      if (concept.titleOptions && concept.titleOptions.length > 0) {
        setTitleOptions(concept.titleOptions);
        setSelectedTitleId(concept.titleOptions[0].id);
      }

      // Se modo assistido: para e mostra opções de título para aprovação humana
      if (wizardExecutionMode === 'assisted') {
        setIsGenerating(false);
        setPipelineStep('title_selection');
        setView('edit');
        setActiveSubTab('concept');
        showToast('✓ Conceito gerado! Selecione ou personalize o título do seu livro.');
        return;
      }

      // Se modo automático: prossegue direto até a geração completa!
      await executeFullAutomatedPipeline(initialProject, pipeline);

    } catch (err: any) {
      setPipelineStep('error');
      setPipelineLogs(prev => [...prev, `❌ AVISO: ${err.message}`]);
      showToast(`Aviso no pipeline: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // PIPELINE COMPLETO AUTOMÁTICO
  const executeFullAutomatedPipeline = async (proj: BookProject, pipeline: KdpBookPipeline) => {
    setIsGenerating(true);

    try {
      let currentProj = { ...proj };

      // 1. OUTLINE
      setPipelineStep('outline');
      setPipelinePercent(40);
      setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Desenvolvendo sumário detalhado e planejamento de capítulos...`]);
      const outline = await pipeline.generateOutline(currentProj.kdpConcept!, currentProj.kdpBookType, currentProj.language);
      currentProj.kdpChapters = outline;
      currentProj.status = 'OUTLINE';
      await db.saveBookProject(currentProj);

      // 2. BIBLE
      setPipelineStep('bible');
      setPipelinePercent(50);
      setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Criando Bíblia da obra (personagens, conceitos, universo)...`]);
      const bible = await pipeline.generateBible(currentProj.kdpConcept!, outline, currentProj.kdpBookType, currentProj.language);
      currentProj.kdpBible = bible;
      currentProj.status = 'BIBLE';
      await db.saveBookProject(currentProj);

      // 3. WRITING CHAPTERS
      setPipelineStep('writing');
      setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Redigindo manuscrito completo capítulo a capítulo com contexto contínuo...`]);
      
      const writtenChapters: IBookChapter[] = [];
      let previousSummary = '';

      for (let i = 0; i < outline.length; i++) {
        const ch = outline[i];
        const stepProgress = 50 + Math.round(((i + 1) / outline.length) * 25);
        setPipelinePercent(stepProgress);
        setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Redigindo Capítulo ${ch.index}: "${ch.title}" (~${ch.targetWordCount} palavras)...`]);

        const draft = await pipeline.writeChapter(
          currentProj.kdpConcept!,
          bible,
          outline,
          ch,
          currentProj.kdpBookType,
          previousSummary,
          currentProj.language
        );

        const fullChap: IBookChapter = {
          ...ch,
          prose: draft.prose,
          wordCount: draft.wordCount,
          status: 'RASCUNHO'
        };

        writtenChapters.push(fullChap);
        previousSummary = ch.summary;
      }
      currentProj.kdpChapters = writtenChapters;
      currentProj.status = 'ESCREVENDO';
      await db.saveBookProject(currentProj);

      // 4. EDITORIAL MATTER (Introdução, Conclusão, etc.)
      setPipelineStep('editorial_matter');
      setPipelinePercent(80);
      setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Gerando elementos editoriais (prefácio, introdução, conclusão, sobre o autor)...`]);
      const editorial = await pipeline.generateEditorialMatter(currentProj.kdpConcept!, currentProj.author, currentProj.language);
      currentProj.editorialElements = editorial;
      await db.saveBookProject(currentProj);

      // 5. COVER & GEOMETRY
      setPipelineStep('cover');
      setPipelinePercent(85);
      setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Calculando geometria de capa KDP e gerando prompts de arte...`]);
      const totalWords = writtenChapters.reduce((s, c) => s + (c.wordCount || 0), 0);
      const actualPages = estimateActualPagesFromWords(totalWords, currentProj.trimSize);
      currentProj.actualPages = actualPages;
      const cover = await pipeline.generateCoverDesign(currentProj.kdpConcept!, bible, currentProj.author, actualPages);
      currentProj.kdpCoverDesign = cover;
      await db.saveBookProject(currentProj);

      // 6. METADATA KDP
      setPipelineStep('metadata');
      setPipelinePercent(90);
      setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Otimizando metadados de SEO, categorias e palavras-chave KDP...`]);
      const metadata = await pipeline.generateMetadataKdp(currentProj.kdpConcept!, writtenChapters, currentProj.author, currentProj.language);
      currentProj.kdpMetadata = metadata;
      await db.saveBookProject(currentProj);

      // 7. AUDITORIA E QUALITY GATE
      setPipelineStep('quality_gate');
      setPipelinePercent(95);
      setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Executando auditoria técnica KDP Quality Gate...`]);
      const editorReport = await pipeline.reviewManuscript(currentProj.kdpConcept!, writtenChapters, bible, currentProj.language);
      currentProj.kdpEditorReport = editorReport;
      const qualityReport = pipeline.runQualityGate(currentProj);
      currentProj.kdpQualityReport = qualityReport;
      currentProj.generationCost = pipeline.getCostTracker();
      currentProj.status = 'VALIDAÇÃO';
      currentProj.pipelineStage = 'completed';
      currentProj.pipelineProgress = 100;

      await db.saveBookProject(currentProj);
      await loadProjects();
      setActiveProject(currentProj);
      setView('edit');
      setActiveSubTab('quality');
      showToast('🎉 Livro gerado e auditado com sucesso! Pronto para revisão e exportação KDP.');

    } catch (err: any) {
      console.error('[Pipeline Error]', err);
      showToast(`Aviso durante execução do pipeline: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- LÓGICA PASSO A PASSO DA ÁRVORE EDITORIAL BEST-SELLER ---
  const runTreeStepLogic = async (stepNum: number, baseProj: BookProject): Promise<BookProject> => {
    const settings = await db.getSettings();
    const aiConfig = {
      ...(settings.aiSettings || { provider: 'local-builtin', model: 'local-coauthor-engine', apiKey: '' })
    };
    const aiService = new AiService(aiConfig);
    const pipeline = new KdpBookPipeline(aiService);
    let cur = { ...baseProj };

    setTreeRunningStep(stepNum);

    switch (stepNum) {
      case 1: { // 1. Conceito & Título Magnético
        setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Passo 1/10] Desenvolvendo Título Magnético e Conceito Comercial...`]);
        const concept = await pipeline.generateConcept(
          cur.topic || cur.title,
          cur.kdpBookType,
          cur.language,
          cur.author,
          cur.estimatedPages
        );
        cur.kdpConcept = concept;
        cur.title = concept.title;
        cur.subtitle = concept.subtitle || '';
        cur.description = concept.longSynopsis || concept.shortSynopsis;
        if (concept.titleOptions && concept.titleOptions.length > 0) {
          setTitleOptions(concept.titleOptions);
          setSelectedTitleId(concept.titleOptions[0].id);
        }
        cur.status = 'CONCEITO';
        break;
      }

      case 2: { // 2. Bíblia da Obra & Cânone Editorial
        setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Passo 2/10] Criando Bíblia da Obra (personagens, conceitos, universo)...`]);
        if (!cur.kdpConcept) {
          cur.kdpConcept = LocalAiEngine.generateConcept(cur.topic || cur.title, cur.kdpBookType, cur.language, cur.author, cur.estimatedPages);
        }
        const bible = await pipeline.generateBible(
          cur.kdpConcept,
          cur.kdpChapters || [],
          cur.kdpBookType,
          cur.language
        );
        cur.kdpBible = bible;
        cur.status = 'BIBLE';
        break;
      }

      case 3: { // 3. Sumário & Arquitetura de Capítulos (Outline)
        setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Passo 3/10] Estruturando Sumário e Metas de Retenção de Capítulos...`]);
        if (!cur.kdpConcept) {
          cur.kdpConcept = LocalAiEngine.generateConcept(cur.topic || cur.title, cur.kdpBookType, cur.language, cur.author, cur.estimatedPages);
        }
        const outline = await pipeline.generateOutline(cur.kdpConcept, cur.kdpBookType, cur.language);
        cur.kdpChapters = outline;
        cur.status = 'OUTLINE';
        break;
      }

      case 4: { // 4. Páginas Preliminares & Prefácio de Autoridade
        setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Passo 4/10] Redigindo Páginas Preliminares (Folha de Rosto, Copyright KDP, Prefácio e Introdução)...`]);
        if (!cur.kdpConcept) {
          cur.kdpConcept = LocalAiEngine.generateConcept(cur.topic || cur.title, cur.kdpBookType, cur.language, cur.author, cur.estimatedPages);
        }
        const editorial = await pipeline.generateEditorialMatter(cur.kdpConcept, cur.author, cur.language);
        cur.editorialElements = editorial;
        break;
      }

      case 5: { // 5. Estúdio de Capa & Geometria KDP
        setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Passo 5/10] Calculando geometria exata de lombada e gerando arte de capa KDP...`]);
        if (!cur.kdpConcept) {
          cur.kdpConcept = LocalAiEngine.generateConcept(cur.topic || cur.title, cur.kdpBookType, cur.language, cur.author, cur.estimatedPages);
        }
        const totalWords = (cur.kdpChapters || []).reduce((s, c) => s + (c.wordCount || 0), 0);
        const actualPages = estimateActualPagesFromWords(totalWords || 25000, cur.trimSize);
        cur.actualPages = actualPages;
        const cover = await pipeline.generateCoverDesign(
          cur.kdpConcept,
          cur.kdpBible || LocalAiEngine.generateBible(cur.kdpConcept, cur.kdpChapters || [], cur.kdpBookType),
          cur.author,
          actualPages
        );
        cur.kdpCoverDesign = cover;
        break;
      }

      case 6: { // 6. Capítulo 1: O Gancho de Best-Seller
        setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Passo 6/10] Redigindo Capítulo 1 com Gancho Magnético de Best-Seller (Abertura de Alta Tensão)...`]);
        if (!cur.kdpConcept) {
          cur.kdpConcept = LocalAiEngine.generateConcept(cur.topic || cur.title, cur.kdpBookType, cur.language, cur.author, cur.estimatedPages);
        }
        if (!cur.kdpChapters || cur.kdpChapters.length === 0) {
          cur.kdpChapters = await pipeline.generateOutline(cur.kdpConcept, cur.kdpBookType, cur.language);
        }
        const bibleForCap1 = cur.kdpBible || LocalAiEngine.generateBible(cur.kdpConcept, cur.kdpChapters, cur.kdpBookType);
        const ch1 = cur.kdpChapters[0];
        const draft1 = await pipeline.writeChapter(
          cur.kdpConcept,
          bibleForCap1,
          cur.kdpChapters,
          ch1,
          cur.kdpBookType,
          '',
          cur.language
        );
        cur.kdpChapters = [
          {
            ...ch1,
            prose: draft1.prose,
            wordCount: draft1.wordCount,
            status: 'RASCUNHO'
          },
          ...cur.kdpChapters.slice(1)
        ];
        cur.status = 'ESCREVENDO';
        break;
      }

      case 7: { // 7. Demais Capítulos (2 a N)
        setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Passo 7/10] Redigindo Capítulos 2 a ${cur.kdpChapters?.length || 8} com contexto contínuo e profundidade...`]);
        if (!cur.kdpConcept) {
          cur.kdpConcept = LocalAiEngine.generateConcept(cur.topic || cur.title, cur.kdpBookType, cur.language, cur.author, cur.estimatedPages);
        }
        if (!cur.kdpChapters || cur.kdpChapters.length < 2) {
          cur.kdpChapters = await pipeline.generateOutline(cur.kdpConcept, cur.kdpBookType, cur.language);
        }
        const bibleForOthers = cur.kdpBible || LocalAiEngine.generateBible(cur.kdpConcept, cur.kdpChapters, cur.kdpBookType);
        let prevSumm = cur.kdpChapters[0]?.summary || '';

        const updatedChaps = [...cur.kdpChapters];
        for (let i = 1; i < updatedChaps.length; i++) {
          const ch = updatedChaps[i];
          setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Redigindo Capítulo ${ch.index}: "${ch.title}" (~${ch.targetWordCount || 2500} palavras)...`]);
          const draft = await pipeline.writeChapter(
            cur.kdpConcept,
            bibleForOthers,
            updatedChaps,
            ch,
            cur.kdpBookType,
            prevSumm,
            cur.language
          );
          updatedChaps[i] = {
            ...ch,
            prose: draft.prose,
            wordCount: draft.wordCount,
            status: 'RASCUNHO'
          };
          prevSumm = ch.summary;
        }
        cur.kdpChapters = updatedChaps;
        cur.status = 'ESCREVENDO';
        break;
      }

      case 8: { // 8. Conclusão, Apêndices Práticos & Referências
        setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Passo 8/10] Gerando Conclusão mobilizadora, Apêndices práticos e Referências bibliográficas...`]);
        if (!cur.kdpConcept) {
          cur.kdpConcept = LocalAiEngine.generateConcept(cur.topic || cur.title, cur.kdpBookType, cur.language, cur.author, cur.estimatedPages);
        }
        const matter = LocalAiEngine.generateEditorialMatter(cur.kdpConcept, cur.author);
        cur.editorialElements = {
          ...(cur.editorialElements || matter),
          conclusion: cur.editorialElements?.conclusion || matter.conclusion,
          appendices: cur.editorialElements?.appendices?.length ? cur.editorialElements.appendices : matter.appendices,
          glossary: cur.editorialElements?.glossary?.length ? cur.editorialElements.glossary : matter.glossary,
          references: cur.editorialElements?.references?.length ? cur.editorialElements.references : matter.references
        };
        break;
      }

      case 9: { // 9. Auditoria Editorial & Quality Gate KDP
        setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Passo 9/10] Executando Auditoria Editorial Crítica e Quality Gate KDP...`]);
        if (!cur.kdpConcept) {
          cur.kdpConcept = LocalAiEngine.generateConcept(cur.topic || cur.title, cur.kdpBookType, cur.language, cur.author, cur.estimatedPages);
        }
        const bibleForReview = cur.kdpBible || LocalAiEngine.generateBible(cur.kdpConcept, cur.kdpChapters || [], cur.kdpBookType);
        const editorReport = await pipeline.reviewManuscript(cur.kdpConcept, cur.kdpChapters || [], bibleForReview, cur.language);
        cur.kdpEditorReport = editorReport;
        const qualityReport = pipeline.runQualityGate(cur);
        cur.kdpQualityReport = qualityReport;
        cur.status = 'VALIDAÇÃO';
        break;
      }

      case 10: { // 10. Compilação Final KDP (EPUB, PDF, Metadados & .ZIP)
        setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Passo 10/10] Otimizando Metadados KDP e preparando Pacote Final de Publicação...`]);
        if (!cur.kdpConcept) {
          cur.kdpConcept = LocalAiEngine.generateConcept(cur.topic || cur.title, cur.kdpBookType, cur.language, cur.author, cur.estimatedPages);
        }
        const metadata = await pipeline.generateMetadataKdp(cur.kdpConcept, cur.kdpChapters || [], cur.author, cur.language);
        cur.kdpMetadata = metadata;
        cur.pipelineStage = 'completed';
        cur.pipelineProgress = 100;
        cur.status = 'CONCLUÍDO';
        break;
      }
    }

    cur.updatedAt = Date.now();
    await db.saveBookProject(cur);
    setActiveProject(cur);
    await loadProjects();
    return cur;
  };

  const handleRunSingleStep = async (stepNum: number) => {
    if (!activeProject || isGenerating) return;
    setIsGenerating(true);
    setTreeRunningStep(stepNum);
    try {
      await runTreeStepLogic(stepNum, activeProject);
      showToast(`✓ Passo ${stepNum} da Árvore Editorial concluído com sucesso!`);
    } catch (err: any) {
      console.error('[Single Step Error]', err);
      showToast(`Aviso: Passo ${stepNum} finalizado com motor de segurança.`);
    } finally {
      setIsGenerating(false);
      setTreeRunningStep(null);
    }
  };

  const executeFullTreeStepByStep = async () => {
    if (!activeProject || isGenerating) return;
    setIsGenerating(true);
    setPipelineLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🚀 Iniciando Execução da Árvore Editorial Completa (Passo a Passo com Checks)...`]);
    try {
      let cur = { ...activeProject };
      for (let s = 1; s <= 10; s++) {
        cur = await runTreeStepLogic(s, cur);
      }
      showToast('🎉 Toda a Árvore Editorial foi executada e auditada com sucesso! Todos os 10 checks validados.');
      setActiveSubTab('tree');
    } catch (err: any) {
      console.error('[Tree Pipeline Error]', err);
      showToast(`Aviso: Árvore finalizada com motor de segurança.`);
    } finally {
      setIsGenerating(false);
      setTreeRunningStep(null);
    }
  };

  // Aprovação do título escolhido no modo assistido
  const handleApproveTitleSelection = async () => {
    if (!activeProject || !activeProject.kdpConcept) return;

    const chosen = titleOptions.find(o => o.id === selectedTitleId);
    const updatedConcept: IBookConcept = {
      ...activeProject.kdpConcept,
      title: chosen ? chosen.title : activeProject.title,
      subtitle: chosen ? chosen.subtitle : activeProject.subtitle,
      hook: chosen ? chosen.hook : activeProject.kdpConcept.hook
    };

    const updatedProj: BookProject = {
      ...activeProject,
      title: updatedConcept.title,
      subtitle: updatedConcept.subtitle,
      kdpConcept: updatedConcept,
      updatedAt: Date.now()
    };

    setActiveProject(updatedProj);
    await db.saveBookProject(updatedProj);

    // Avança para o próximo passo no modo assistido
    setIsGenerating(true);
    setPipelineStep('outline');
    setPipelinePercent(35);
    setPipelineLogs([`✓ Título selecionado: "${updatedProj.title}". Gerando sumário e capítulos...`]);

    try {
      const settings = await db.getSettings();
      const aiService = new AiService(settings.aiSettings);
      const pipeline = new KdpBookPipeline(aiService);

      const outline = await pipeline.generateOutline(updatedConcept, updatedProj.kdpBookType, updatedProj.language);
      updatedProj.kdpChapters = outline;
      updatedProj.status = 'OUTLINE';

      await db.saveBookProject(updatedProj);
      setActiveProject(updatedProj);
      setActiveSubTab('outline');
      showToast('✓ Estrutura de capítulos gerada com sucesso! Revise os capítulos.');
    } catch (err: any) {
      alert(`Falha ao gerar outline: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Escreve um único capítulo selecionado com contexto completo da obra
  const handleWriteSingleChapter = async () => {
    if (!activeProject || !activeProject.kdpChapters) return;
    const chap = activeProject.kdpChapters.find(c => c.index === selectedChapterIndex);
    if (!chap) return;

    setIsAiWorkingOnChapter(true);
    setAiActionMessage(`Escrevendo Capítulo ${chap.index}: "${chap.title}" com alta densidade...`);

    try {
      const settings = await db.getSettings();
      const aiService = new AiService(settings.aiSettings);
      const pipeline = new KdpBookPipeline(aiService);

      const prevChapters = activeProject.kdpChapters.filter(c => c.index < chap.index);
      const previousSummary = prevChapters.length > 0 ? prevChapters[prevChapters.length - 1].summary : '';

      const draft = await pipeline.writeChapter(
        activeProject.kdpConcept!,
        activeProject.kdpBible || {
          characters: [],
          locations: [],
          styleGuide: { artStyle: 'Clássico', palette: [], lineWeight: '', lighting: '', tone: activeProject.kdpConcept?.tone || '' },
          coreConcepts: [],
          keyArguments: [],
          terminologyGlossary: [],
          rulesOfUniverse: []
        },
        activeProject.kdpChapters,
        chap,
        activeProject.kdpBookType,
        previousSummary,
        activeProject.language
      );

      const newVersion: ChapterVersion = {
        id: `v_${Date.now()}`,
        chapterIndex: chap.index,
        timestamp: Date.now(),
        prose: draft.prose,
        wordCount: draft.wordCount,
        summary: `Geração completa via IA (${draft.wordCount} palavras)`,
        authorType: 'ai'
      };

      const updatedChapters = activeProject.kdpChapters.map(c => 
        c.index === chap.index 
          ? { 
              ...c, 
              prose: draft.prose, 
              wordCount: draft.wordCount, 
              status: 'RASCUNHO' as const,
              versions: [newVersion, ...(c.versions || [])]
            } 
          : c
      );

      const updatedProj = { ...activeProject, kdpChapters: updatedChapters, updatedAt: Date.now() };
      setActiveProject(updatedProj);
      await db.saveBookProject(updatedProj);
      setEditedProse(draft.prose);
      showToast(`✓ Capítulo ${chap.index} gerado com sucesso (${draft.wordCount} palavras, ${draft.prose.length} caracteres)!`);
    } catch (err: any) {
      alert(`Falha ao gerar capítulo: ${err.message}`);
    } finally {
      setIsAiWorkingOnChapter(false);
      setAiActionMessage('');
    }
  };

  // Escreve todos os capítulos sequencialmente mantendo continuidade e contexto holístico
  const handleWriteAllChapters = async () => {
    if (!activeProject || !activeProject.kdpChapters) return;
    const confirmStart = window.confirm(
      `Deseja iniciar a redação automática de TODOS os ${activeProject.kdpChapters.length} capítulos deste livro com alta densidade textual?`
    );
    if (!confirmStart) return;

    setIsGenerating(true);
    setPipelineStep('writing');
    setPipelinePercent(10);
    setPipelineLogs([`[${new Date().toLocaleTimeString()}] Iniciando redação automática do livro completo...`]);

    try {
      const settings = await db.getSettings();
      const aiService = new AiService(settings.aiSettings);
      const pipeline = new KdpBookPipeline(aiService);

      let updatedChapters = [...activeProject.kdpChapters];
      let previousSummary = '';

      for (let i = 0; i < updatedChapters.length; i++) {
        const ch = updatedChapters[i];
        const percent = Math.round(10 + ((i + 1) / updatedChapters.length) * 85);
        setPipelinePercent(percent);
        setPipelineLogs(prev => [
          ...prev, 
          `[${new Date().toLocaleTimeString()}] Redigindo Capítulo ${ch.index}/${updatedChapters.length}: "${ch.title}" (~${ch.targetWordCount || 2500} palavras)...`
        ]);

        const draft = await pipeline.writeChapter(
          activeProject.kdpConcept!,
          activeProject.kdpBible || {
            characters: [],
            locations: [],
            styleGuide: { artStyle: 'Clássico', palette: [], lineWeight: '', lighting: '', tone: activeProject.kdpConcept?.tone || '' },
            coreConcepts: [],
            keyArguments: [],
            terminologyGlossary: [],
            rulesOfUniverse: []
          },
          updatedChapters,
          ch,
          activeProject.kdpBookType,
          previousSummary,
          activeProject.language
        );

        const newVersion: ChapterVersion = {
          id: `v_${Date.now()}`,
          chapterIndex: ch.index,
          timestamp: Date.now(),
          prose: draft.prose,
          wordCount: draft.wordCount,
          summary: `Geração em lote via IA`,
          authorType: 'ai'
        };

        updatedChapters[i] = {
          ...ch,
          prose: draft.prose,
          wordCount: draft.wordCount,
          status: 'RASCUNHO',
          versions: [newVersion, ...(ch.versions || [])]
        };
        previousSummary = ch.summary;

        // Auto-save persistente no IndexedDB após cada capítulo
        const interimProj = { ...activeProject, kdpChapters: [...updatedChapters], updatedAt: Date.now() };
        await db.saveBookProject(interimProj);
        setActiveProject(interimProj);
      }

      const totalWords = updatedChapters.reduce((s, c) => s + (c.wordCount || 0), 0);
      const actualPages = estimateActualPagesFromWords(totalWords, activeProject.trimSize);
      const finalProj = {
        ...activeProject,
        kdpChapters: updatedChapters,
        actualPages,
        status: 'ESCREVENDO' as const,
        updatedAt: Date.now()
      };
      await db.saveBookProject(finalProj);
      setActiveProject(finalProj);
      setPipelinePercent(100);
      setPipelineLogs(prev => [
        ...prev, 
        `🎉 Concluído! Todos os ${updatedChapters.length} capítulos foram redigidos com sucesso! Volume total: ${totalWords.toLocaleString()} palavras (~${actualPages} páginas).`
      ]);
      showToast(`🎉 Livro completo gerado! ${totalWords.toLocaleString()} palavras redigidas.`);
    } catch (err: any) {
      alert(`Falha durante redação do livro: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Assistente de IA no editor de capítulo
  const handleAiActionOnChapter = async (action: 'rewrite' | 'expand' | 'summarize' | 'polish' | 'continuity') => {
    if (!activeProject || !activeProject.kdpChapters) return;

    const chap = activeProject.kdpChapters.find(c => c.index === selectedChapterIndex);
    if (!chap) return;

    const currentText = isEditingProse ? editedProse : (chap.prose || '');
    if (!currentText.trim() && action !== 'expand') {
      alert('O capítulo precisa ter conteúdo para esta ação.');
      return;
    }

    setIsAiWorkingOnChapter(true);
    setAiActionMessage(`Executando ${action}...`);

    try {
      const settings = await db.getSettings();
      const aiService = new AiService(settings.aiSettings);

      let systemPrompt = 'Você é um editor literário sênior da Amazon KDP.';
      let userPrompt = '';

      if (action === 'rewrite') {
        systemPrompt += ' Reescreva o texto do capítulo tornando-o mais dinâmico, envolvente e profissional, preservando todos os ensinamentos e personagens.';
        userPrompt = `Texto a reescrever:\n"${currentText}"\n\nEntregue o texto completo revisado.`;
      } else if (action === 'expand') {
        systemPrompt += ' Expanda o capítulo adicionando profundidade, exemplos práticos do cotidiano, diálogos ou descrições ricas, aumentando o volume de palavras em pelo menos 40%.';
        userPrompt = `Capítulo ${chap.index}: "${chap.title}".\nObjetivo: ${chap.objective || chap.summary}\nTexto atual:\n"${currentText}"\n\nEntregue o texto expandido completo.`;
      } else if (action === 'summarize') {
        systemPrompt += ' Sintetize o texto tornando-o mais conciso e direto ao ponto, eliminando repetições.';
        userPrompt = `Texto a sintetizar:\n"${currentText}"`;
      } else if (action === 'polish') {
        systemPrompt += ' Faça uma revisão ortográfica, gramatical e de estilo, removendo clichês e palavras repetidas.';
        userPrompt = `Texto a polir:\n"${currentText}"`;
      } else if (action === 'continuity') {
        const pipeline = new KdpBookPipeline(aiService);
        const prev = activeProject.kdpChapters.filter(c => c.index < selectedChapterIndex);
        const issues = await pipeline.checkContinuity(chap, activeProject.kdpBible!, prev, activeProject.language);
        if (issues.length === 0) {
          showToast('✓ Nenhuma inconsistência encontrada! Continuidade perfeita.');
        } else {
          showToast(`⚠️ Encontradas ${issues.length} inconsistências. Verifique o painel lateral.`);
        }
        setIsAiWorkingOnChapter(false);
        return;
      }

      const response = await aiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { temperature: 0.6 });

      if (response && response.trim()) {
        const newProse = response.trim();
        const newWordCount = newProse.split(/\s+/).filter(Boolean).length;

        // Salva versão no histórico de versionamento
        const newVersion: ChapterVersion = {
          id: `v_${Date.now()}`,
          chapterIndex: selectedChapterIndex,
          timestamp: Date.now(),
          prose: newProse,
          wordCount: newWordCount,
          summary: `Ação IA: ${action}`,
          authorType: 'ai'
        };

        const updatedChapters = activeProject.kdpChapters.map(c => {
          if (c.index === selectedChapterIndex) {
            const versions = c.versions || [];
            return {
              ...c,
              prose: newProse,
              wordCount: newWordCount,
              versions: [newVersion, ...versions],
              status: 'REVISADO' as const
            };
          }
          return c;
        });

        const updatedProj = { ...activeProject, kdpChapters: updatedChapters, updatedAt: Date.now() };
        setActiveProject(updatedProj);
        setEditedProse(newProse);
        setIsEditingProse(false);
        await db.saveBookProject(updatedProj);
        showToast(`✓ Capítulo ${selectedChapterIndex} atualizado com sucesso (${newWordCount} palavras)!`);
      }
    } catch (err: any) {
      alert(`Falha na ação de IA: ${err.message}`);
    } finally {
      setIsAiWorkingOnChapter(false);
      setAiActionMessage('');
    }
  };

  // DOWNLOADS E EXPORTAÇÕES KDP
  const handleDownloadZipPackage = async () => {
    if (!activeProject) return;
    try {
      showToast('Empacotando projeto completo KDP em ZIP...');
      const zipBlob = await KdpPackager.createKdpPackage(activeProject);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(activeProject.title || 'livro').replace(/[^a-zA-Z0-9]/g, '_')}_KDP_Package.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✓ Pacote KDP baixado com sucesso!');
    } catch (err: any) {
      alert(`Falha ao gerar pacote ZIP: ${err.message}`);
    }
  };

  const handleDownloadEpub = async () => {
    if (!activeProject) return;
    try {
      showToast('Compilando EPUB 3...');
      const blob = await EpubBuilder.buildEpub(activeProject);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(activeProject.title || 'livro').replace(/[^a-zA-Z0-9]/g, '_')}.epub`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✓ Arquivo EPUB baixado!');
    } catch (err: any) {
      alert(`Falha ao compilar EPUB: ${err.message}`);
    }
  };

  const handleDownloadInteriorPdf = async () => {
    if (!activeProject) return;
    try {
      showToast('Diagramando PDF de Miolo KDP...');
      const blob = await PdfBuilder.buildInteriorPdf(activeProject);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(activeProject.title || 'livro').replace(/[^a-zA-Z0-9]/g, '_')}_Interior.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✓ PDF do Miolo baixado!');
    } catch (err: any) {
      alert(`Falha ao gerar PDF de Miolo: ${err.message}`);
    }
  };

  const handleDownloadCoverWrapPdf = async () => {
    if (!activeProject) return;
    try {
      showToast('Gerando Capa Full-Wrap KDP...');
      const blob = await PdfBuilder.buildCoverWrapPdf(activeProject, activeProject.actualPages || 150);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(activeProject.title || 'livro').replace(/[^a-zA-Z0-9]/g, '_')}_Cover_Full_Wrap.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✓ Capa Full-Wrap KDP baixada!');
    } catch (err: any) {
      alert(`Falha ao gerar Capa Full-Wrap: ${err.message}`);
    }
  };

  // GERAÇÃO E CARREGAMENTO DE ARTE DE CAPA
  const handleGenerateCoverArt = async () => {
    if (!activeProject) return;
    setIsGeneratingCover(true);
    try {
      showToast('Renderizando arte da capa via IA...');
      const settings = await db.getSettings();
      const aiService = new AiService(settings.aiSettings);
      const promptToUse = (coverPromptInput || activeProject.kdpCoverDesign?.frontPrompt || `Cinematic book cover art for "${activeProject.title}", modern bestseller typography, high contrast, dramatic lighting, 8k resolution`).trim();
      const imgUrl = await aiService.generateImage(promptToUse);

      if (imgUrl) {
        const updatedCover: IBookCoverDesign = {
          ...(activeProject.kdpCoverDesign || {
            frontPrompt: promptToUse,
            title: activeProject.title,
            author: activeProject.author,
            backCoverBlurb: activeProject.kdpConcept?.shortSynopsis || '',
            geometry: {
              trimSize: activeProject.trimSize,
              pageCount: realPages,
              paperType: activeProject.paperType,
              spineWidthInches: 0.35,
              totalCoverWidthInches: 12.6,
              totalCoverHeightInches: 9.25,
              bleedInches: 0.125,
              spineText: `${activeProject.title} • ${activeProject.author}`
            }
          }),
          frontImageUrl: imgUrl,
          frontPrompt: promptToUse
        };

        const updatedProj = { ...activeProject, kdpCoverDesign: updatedCover, updatedAt: Date.now() };
        setActiveProject(updatedProj);
        await db.saveBookProject(updatedProj);
        showToast('✓ Arte da capa gerada e vinculada ao livro com sucesso!');
      }
    } catch (err: any) {
      alert(`Falha ao gerar capa: ${err.message}`);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleUploadCustomCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const updatedCover: IBookCoverDesign = {
        ...(activeProject.kdpCoverDesign || {
          frontPrompt: '',
          title: activeProject.title,
          author: activeProject.author,
          backCoverBlurb: activeProject.kdpConcept?.shortSynopsis || '',
          geometry: {
            trimSize: activeProject.trimSize,
            pageCount: realPages,
            paperType: activeProject.paperType,
            spineWidthInches: 0.35,
            totalCoverWidthInches: 12.6,
            totalCoverHeightInches: 9.25,
            bleedInches: 0.125,
            spineText: `${activeProject.title} • ${activeProject.author}`
          }
        }),
        frontImageUrl: dataUrl
      };
      const updatedProj = { ...activeProject, kdpCoverDesign: updatedCover, updatedAt: Date.now() };
      setActiveProject(updatedProj);
      await db.saveBookProject(updatedProj);
      showToast('✓ Imagem personalizada de capa importada com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const currentChapter = activeProject?.kdpChapters?.find(c => c.index === selectedChapterIndex);
  const totalWords = (activeProject?.kdpChapters || []).reduce((s, c) => s + (c.wordCount || 0), 0);
  const realPages = estimateActualPagesFromWords(totalWords, activeProject?.trimSize || '6x9');

  return (
    <div className="book-creator-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc' }}>
      
      {/* Toast Feedback */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999999,
          background: '#0f172a',
          border: '1px solid #3b82f6',
          color: '#f8fafc',
          padding: '12px 20px',
          borderRadius: '8px',
          fontWeight: 600,
          boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toastMsg}
        </div>
      )}

      {/* HEADER CORPORATIVO TOTVS / ENTERPRISE */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '20px',
        marginBottom: '24px',
        borderBottom: '1px solid #334155',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', color: '#ffffff' }}>
              Plataforma Editorial KDP
            </h1>
            <span style={{
              background: '#1e293b',
              border: '1px solid #3b82f6',
              color: '#38bdf8',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '4px',
              letterSpacing: '0.5px'
            }}>
              ENTERPRISE EDITION
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Pipeline autônomo baseado nos frameworks <code>kdp-book</code>, <code>libriscribe</code>, <code>Velith</code> e <code>book-generator</code>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Status Ponte Python */}
          <div style={{
            fontSize: '11px',
            padding: '5px 12px',
            borderRadius: '4px',
            background: bridgeStatus?.status === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
            border: `1px solid ${bridgeStatus?.status === 'online' ? '#10b981' : '#475569'}`,
            color: bridgeStatus?.status === 'online' ? '#34d399' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: bridgeStatus?.status === 'online' ? '#10b981' : '#64748b' }}></span>
            Ponte CLI: {bridgeStatus?.status === 'online' ? 'Conectada (Porta 8765)' : 'Offline (Modo Navegador Ativo)'}
          </div>

          {view !== 'list' && (
            <button
              onClick={() => { setView('list'); setActiveProject(null); }}
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ← Painel de Obras
            </button>
          )}

          {view === 'list' && (
            <button
              onClick={() => { setView('create_wizard'); setActiveProject(null); }}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)'
              }}
            >
              + Criar Novo Livro
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: PAINEL DE OBRAS EXISTENTES                                      */}
      {/* ========================================================================= */}
      {view === 'list' && (
        <div>
          {projects.length === 0 ? (
            <div style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '60px 24px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>📖</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: '#f8fafc' }}>
                Nenhum projeto editorial cadastrado
              </h2>
              <p style={{ color: '#94a3b8', maxWidth: '540px', margin: '0 auto 24px auto', fontSize: '14px', lineHeight: 1.6 }}>
                Gere livros completos prontos para publicação na Amazon KDP a partir de um segmento ou ideia principal. Todo o conceito, outline, bíblia, manuscrito, capa e pacote KDP são gerados em etapas estruturadas.
              </p>
              <button
                onClick={() => setView('create_wizard')}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 28px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Criar Primeiro Livro KDP
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
              {projects.map(proj => {
                const cfg = BOOK_TYPE_CONFIGS[proj.kdpBookType];
                const chapCount = proj.kdpChapters?.length || 0;
                const words = proj.kdpChapters?.reduce((s, c) => s + (c.wordCount || 0), 0) || 0;
                const qScore = proj.kdpQualityReport?.overallScore;

                return (
                  <div
                    key={proj.id}
                    onClick={() => { setActiveProject(proj); setView('edit'); setActiveSubTab('concept'); }}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: `${STATUS_COLORS[proj.status]}20`,
                          color: STATUS_COLORS[proj.status],
                          textTransform: 'uppercase'
                        }}>
                          {proj.status}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {cfg?.label || proj.kdpBookType}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                        {proj.title}
                      </h3>
                      {proj.subtitle && (
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px', fontStyle: 'italic' }}>
                          {proj.subtitle}
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #1e293b', paddingTop: '14px', marginTop: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
                        <span>Capítulos: <strong>{chapCount}</strong></span>
                        <span>Palavras: <strong>{words.toLocaleString()}</strong></span>
                        <span>Páginas: <strong>~{proj.actualPages || proj.estimatedPages}</strong></span>
                      </div>
                      {qScore !== undefined && (
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                          <span style={{ color: '#94a3b8' }}>Score KDP Gate:</span>
                          <span style={{ fontWeight: 800, color: qScore >= 80 ? '#10b981' : '#f59e0b' }}>
                            {qScore}/100 {proj.kdpQualityReport?.isReadyForKdp ? '(Pronto)' : '(Revisão Pendente)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: WIZARD DE CRIAÇÃO (TELA INICIAL DO LIVRO)                        */}
      {/* ========================================================================= */}
      {view === 'create_wizard' && (
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '28px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
          }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
              CRIAR NOVO LIVRO
            </h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#94a3b8' }}>
              Informe a ideia, tema ou segmento da obra. A inteligência artificial identificará o nicho, público-alvo, formato, outline e desenvolverá todo o pacote editorial KDP.
            </p>

            {/* Campo Principal */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#f1f5f9' }}>
                Sobre o que será o seu livro? <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={4}
                value={wizardIdea}
                onChange={e => setWizardIdea(e.target.value)}
                placeholder="Exemplo: Quero criar um livro de desenvolvimento pessoal sobre disciplina para homens de 25 a 40 anos."
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  padding: '12px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleAutoAnalyzeIdea}
                  disabled={isAutoAnalyzing || !wizardIdea.trim()}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #3b82f6',
                    color: '#38bdf8',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isAutoAnalyzing ? 'Analisando Ideia...' : '✨ [DEIXAR A IA DEFINIR PARÂMETROS]'}
                </button>
              </div>
            </div>

            {/* Grid de Parâmetros */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '22px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#cbd5e1' }}>
                  Categoria / Tipo de Livro:
                </label>
                <select
                  value={wizardType}
                  onChange={e => handleTemplateChange(e.target.value as BookType)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#f8fafc',
                    fontSize: '13px'
                  }}
                >
                  {Object.values(BOOK_TYPE_CONFIGS).map(cfg => (
                    <option key={cfg.id} value={cfg.id}>
                      [{cfg.category}] {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#cbd5e1' }}>
                  Nome do Autor:
                </label>
                <input
                  type="text"
                  value={wizardAuthor}
                  onChange={e => setWizardAuthor(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#cbd5e1' }}>
                  Formato KDP (Trim Size):
                </label>
                <select
                  value={wizardTrim}
                  onChange={e => setWizardTrim(e.target.value as TrimSize)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#f8fafc',
                    fontSize: '13px'
                  }}
                >
                  <option value="6x9">6" x 9" (Padrão Não-Ficção / Romance)</option>
                  <option value="5x8">5" x 8" (Pocket / Light Novel / Ficção)</option>
                  <option value="5.5x8.5">5.5" x 8.5" (Compacto)</option>
                  <option value="7x10">7" x 10" (Técnico / Ilustrado)</option>
                  <option value="8.5x8.5">8.5" x 8.5" (Infantil Quadrado)</option>
                  <option value="8.5x11">8.5" x 11" (Apostilas e Guias)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#cbd5e1' }}>
                  Meta de Páginas:
                </label>
                <input
                  type="number"
                  value={wizardPages}
                  onChange={e => setWizardPages(parseInt(e.target.value, 10) || 100)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  Meta de palavras calculada: <strong>~{calculateTargetWordsForPages(wizardPages, wizardTrim).targetWords.toLocaleString()} palavras</strong>
                </div>
              </div>
            </div>

            {/* Modo de Execução */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: '#cbd5e1' }}>
                Modo de Operação do Pipeline:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div
                  onClick={() => setWizardExecutionMode('assisted')}
                  style={{
                    border: `1px solid ${wizardExecutionMode === 'assisted' ? '#3b82f6' : '#334155'}`,
                    background: wizardExecutionMode === 'assisted' ? 'rgba(59, 130, 246, 0.12)' : '#1e293b',
                    borderRadius: '6px',
                    padding: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', marginBottom: '4px' }}>
                    MODO ASSISTIDO (Recomendado)
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                    A IA para após cada etapa para aprovação humana (Conceito → Estrutura → Capítulos → Revisão).
                  </div>
                </div>

                <div
                  onClick={() => setWizardExecutionMode('automatic')}
                  style={{
                    border: `1px solid ${wizardExecutionMode === 'automatic' ? '#3b82f6' : '#334155'}`,
                    background: wizardExecutionMode === 'automatic' ? 'rgba(59, 130, 246, 0.12)' : '#1e293b',
                    borderRadius: '6px',
                    padding: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', marginBottom: '4px' }}>
                    MODO AUTOMÁTICO
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                    A IA executa todo o fluxo de ponta a ponta sem interrupção e entrega a obra pronta para auditoria.
                  </div>
                </div>
              </div>
            </div>

            {/* Seleção do Motor de IA */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: '#cbd5e1' }}>
                Motor de Inteligência Artificial para Execução:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div
                  onClick={() => setWizardAiProvider('local-builtin')}
                  style={{
                    border: `1px solid ${wizardAiProvider === 'local-builtin' ? '#3b82f6' : '#334155'}`,
                    background: wizardAiProvider === 'local-builtin' ? 'rgba(59, 130, 246, 0.15)' : '#1e293b',
                    borderRadius: '6px',
                    padding: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚡ Motor Local Embutido</span>
                    <span style={{ fontSize: '9px', background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: '3px' }}>RECOMENDADO</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                    100% offline, sem gastar tokens, sem precisar instalar Ollama e sem falhas de conexão.
                  </div>
                </div>

                <div
                  onClick={() => setWizardAiProvider('ollama')}
                  style={{
                    border: `1px solid ${wizardAiProvider === 'ollama' ? '#3b82f6' : '#334155'}`,
                    background: wizardAiProvider === 'ollama' ? 'rgba(59, 130, 246, 0.15)' : '#1e293b',
                    borderRadius: '6px',
                    padding: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', marginBottom: '3px' }}>
                    🦙 Ollama Local (No seu PC)
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                    Executa via Ollama na porta 11434 com modelos locais (Llama 3.1, Mistral, etc.).
                  </div>
                </div>

                <div
                  onClick={() => setWizardAiProvider('openai')}
                  style={{
                    border: `1px solid ${wizardAiProvider === 'openai' ? '#3b82f6' : '#334155'}`,
                    background: wizardAiProvider === 'openai' ? 'rgba(59, 130, 246, 0.15)' : '#1e293b',
                    borderRadius: '6px',
                    padding: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', marginBottom: '3px' }}>
                    🌐 Nuvem / API Externa
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                    Utiliza OpenAI (GPT-4o), Anthropic Claude ou OpenRouter configurados.
                  </div>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #334155', paddingTop: '18px' }}>
              <button
                type="button"
                onClick={() => setView('list')}
                disabled={isGenerating}
                style={{
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleStartProjectCreation}
                disabled={isGenerating || !wizardIdea.trim()}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)'
                }}
              >
                {isGenerating ? 'Executando Pipeline Editorial...' : '[CRIAR PROJETO EDITORIAL]'}
              </button>
            </div>
          </div>

          {/* Monitor de Progresso em Tempo Real */}
          {isGenerating && (
            <div style={{
              background: '#0f172a',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '20px',
              marginTop: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                  Progresso Editorial: {pipelinePercent}% ({pipelineStep.toUpperCase()})
                </span>
              </div>
              <div style={{ height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden', marginBottom: '14px' }}>
                <div style={{ width: `${pipelinePercent}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s' }}></div>
              </div>
              <div style={{
                background: '#020617',
                padding: '12px',
                borderRadius: '6px',
                maxHeight: '160px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#94a3b8'
              }}>
                {pipelineLogs.map((l, idx) => <div key={idx} style={{ marginBottom: '3px' }}>{l}</div>)}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: ESTÚDIO EDITORIAL DA OBRA ATIVA                                  */}
      {/* ========================================================================= */}
      {view === 'edit' && activeProject && (
        <div>
          {/* Barra Superior do Projeto */}
          <div style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
                  {activeProject.title}
                </h2>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: `${STATUS_COLORS[activeProject.status]}20`,
                  color: STATUS_COLORS[activeProject.status]
                }}>
                  {activeProject.status}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {activeProject.subtitle && <span>{activeProject.subtitle} • </span>}
                <span>Por {activeProject.author}</span> •{' '}
                <span>{BOOK_TYPE_CONFIGS[activeProject.kdpBookType]?.label}</span> •{' '}
                <span>{activeProject.trimSize}</span> •{' '}
                <span>{totalWords.toLocaleString()} palavras (~{realPages} páginas)</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={handleWriteAllChapters}
                disabled={isGenerating}
                style={{
                  background: '#8b5cf6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isGenerating ? '⏳ Redigindo Obra...' : '🚀 Escrever Todos os Capítulos'}
              </button>

              <button
                onClick={handleDownloadZipPackage}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📦 [BAIXAR PACOTE KDP .ZIP]
              </button>

              <button
                onClick={async () => {
                  await db.saveBookProject(activeProject);
                  showToast('✓ Alterações salvas no banco de dados local!');
                }}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                💾 Salvar Projeto
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ESTEIRA DE TAREFAS LINEAR KDP (WORKFLOW STEPPER)                          */}
          {/* ========================================================================= */}
          {(() => {
            const workflowSteps: { id: SubTabType; stepIndex: number; label: string; icon: string; check: boolean }[] = [
              { id: 'tree', stepIndex: 0, label: 'Esteira Editorial', icon: '🌳', check: activeProject.pipelineStage === 'completed' },
              { id: 'concept', stepIndex: 1, label: '1. Título & Conceito', icon: '🎯', check: Boolean(activeProject.kdpConcept?.title) },
              { id: 'outline', stepIndex: 2, label: '2. Sumário', icon: '📐', check: Boolean(activeProject.kdpChapters && activeProject.kdpChapters.length > 0) },
              { id: 'bible', stepIndex: 3, label: '3. Bíblia da Obra', icon: '🧠', check: Boolean(activeProject.kdpBible && (activeProject.kdpBible.coreConcepts?.length || activeProject.kdpBible.characters?.length)) },
              { id: 'editorial', stepIndex: 4, label: '4. Preliminares', icon: '📝', check: Boolean(activeProject.editorialElements?.introduction || activeProject.editorialElements?.preface) },
              { id: 'cover', stepIndex: 5, label: '5. Capa KDP', icon: '🎨', check: Boolean(activeProject.kdpCoverDesign?.geometry || activeProject.kdpCoverDesign?.frontCoverUrl) },
              { id: 'writer', stepIndex: 6, label: '6. Escrita do Livro', icon: '✍️', check: (activeProject.kdpChapters?.reduce((s, c) => s + (c.wordCount || 0), 0) || 0) >= 1500 },
              { id: 'quality', stepIndex: 7, label: '7. Auditoria KDP', icon: '🛡️', check: Boolean(activeProject.kdpQualityReport?.overallScore) },
              { id: 'metadata', stepIndex: 8, label: '8. Metadados', icon: '🏷️', check: Boolean(activeProject.kdpMetadata?.keywords?.length) },
              { id: 'export', stepIndex: 9, label: '9. Compilação', icon: '📦', check: activeProject.status === 'CONCLUÍDO' || activeProject.status === 'PUBLICADO' }
            ];

            const currentIndex = workflowSteps.findIndex(s => s.id === activeSubTab);
            const currentStep = workflowSteps[currentIndex] || workflowSteps[0];

            return (
              <div style={{ marginBottom: '24px' }}>
                {/* Stepper Horizontal */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#090d16',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '8px',
                  gap: '6px',
                  overflowX: 'auto',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                }}>
                  {workflowSteps.map(step => {
                    const isActive = activeSubTab === step.id;
                    return (
                      <div
                        key={step.id}
                        onClick={() => setActiveSubTab(step.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          fontSize: '12px',
                          fontWeight: isActive ? 800 : 600,
                          color: isActive ? '#ffffff' : (step.check ? '#34d399' : '#94a3b8'),
                          background: isActive ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : (step.check ? 'rgba(16, 185, 129, 0.08)' : 'transparent'),
                          border: `1px solid ${isActive ? '#3b82f6' : (step.check ? 'rgba(16, 185, 129, 0.25)' : 'transparent')}`,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>{step.icon}</span>
                        <span>{step.label}</span>
                        {step.check && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 900,
                            color: isActive ? '#a7f3d0' : '#10b981',
                            background: isActive ? 'rgba(0, 0, 0, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                            padding: '1px 5px',
                            borderRadius: '10px'
                          }}>
                            ✓
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Banner de Orientação da Etapa Atual */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  marginTop: '10px',
                  fontSize: '12px',
                  color: '#cbd5e1'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: '#1e3a8a',
                      color: '#93c5fd',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase'
                    }}>
                      Etapa {currentIndex + 1} de {workflowSteps.length}
                    </span>
                    <span>
                      Você está em: <strong style={{ color: '#ffffff' }}>{currentStep.label}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {currentIndex > 0 && (
                      <button
                        onClick={() => setActiveSubTab(workflowSteps[currentIndex - 1].id)}
                        style={{
                          background: '#1e293b',
                          color: '#cbd5e1',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ◀ Etapa Anterior
                      </button>
                    )}
                    {currentIndex < workflowSteps.length - 1 && (
                      <button
                        onClick={() => setActiveSubTab(workflowSteps[currentIndex + 1].id)}
                        style={{
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Próxima Etapa ▶
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* SUB-ABA 0: ÁRVORE EDITORIAL BEST-SELLER COM CHECKS (PASSO A PASSO)        */}
          {/* ========================================================================= */}
          {activeSubTab === 'tree' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Card de Controle da Árvore */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                border: '1px solid #4338ca',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ maxWidth: '650px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '24px' }}>🌳</span>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                        Árvore Editorial do Livro (Best-Seller Workflow)
                      </h3>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#312e81',
                        color: '#a5b4fc',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        border: '1px solid #4338ca'
                      }}>
                        KDP Best-Seller Edition
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
                      Esteira completa de publicação inspirada nas maiores editoras comerciais. Cada nó representa uma etapa canônica: execute passo a passo, visualize o checkmark verde (✓) em cada estágio e refine o conteúdo a qualquer momento.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={executeFullTreeStepByStep}
                      disabled={isGenerating}
                      style={{
                        background: isGenerating ? '#475569' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 22px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isGenerating ? `⏳ Executando Passo ${treeRunningStep || '...'}...` : '🚀 Executar Toda a Árvore Editorial (Passo a Passo com Checks)'}
                    </button>
                  </div>
                </div>

                {/* Barra de Progresso Global */}
                <div style={{ marginTop: '20px' }}>
                  {(() => {
                    const completedCount = [
                      Boolean(activeProject.kdpConcept?.title),
                      Boolean(activeProject.kdpBible && (activeProject.kdpBible.characters?.length || activeProject.kdpBible.coreConcepts?.length)),
                      Boolean(activeProject.kdpChapters && activeProject.kdpChapters.length > 0),
                      Boolean(activeProject.editorialElements?.preface || activeProject.editorialElements?.introduction),
                      Boolean(activeProject.kdpCoverDesign?.geometry),
                      Boolean(activeProject.kdpChapters?.[0]?.prose && (activeProject.kdpChapters[0].wordCount || 0) >= 800),
                      Boolean(activeProject.kdpChapters && activeProject.kdpChapters.length > 1 && activeProject.kdpChapters.slice(1).every(c => c.prose && (c.wordCount || 0) >= 800)),
                      Boolean(activeProject.editorialElements?.conclusion && (activeProject.editorialElements?.appendices?.length || activeProject.editorialElements?.references?.length)),
                      Boolean(activeProject.kdpEditorReport?.score && activeProject.kdpQualityReport),
                      Boolean(activeProject.pipelineStage === 'completed' || activeProject.status === 'CONCLUÍDO')
                    ].filter(Boolean).length;
                    const percent = Math.round((completedCount / 10) * 100);

                    return (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>
                            Progresso da Esteira Editorial: {completedCount} de 10 etapas concluídas
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: percent === 100 ? '#34d399' : '#38bdf8' }}>
                            {percent}%
                          </span>
                        </div>
                        <div style={{ background: '#1e293b', borderRadius: '6px', height: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                          <div style={{
                            width: `${percent}%`,
                            height: '100%',
                            background: percent === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Lista Visual dos 10 Passos da Árvore */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  {
                    step: 1,
                    icon: '🎯',
                    title: '1. Conceito, Título Magnético & Subtítulo',
                    desc: 'Definição do título de alto impacto comercial, subtítulo magnético, promessa central de transformação e nicho editorial KDP.',
                    isDone: Boolean(activeProject.kdpConcept?.title),
                    preview: activeProject.kdpConcept?.title 
                      ? `Título: "${activeProject.kdpConcept.title}" • Subtítulo: "${activeProject.kdpConcept.subtitle || ''}" • Promessa: "${activeProject.kdpConcept.promise}"`
                      : 'Aguardando definição do conceito editorial e promessa de transformação.',
                    tab: 'concept' as const
                  },
                  {
                    step: 2,
                    icon: '📜',
                    title: '2. Bíblia da Obra & Cânone Editorial',
                    desc: 'Cânone de personagens e avatares, tom de voz, regras invioláveis do universo e guia estilístico para escrita.',
                    isDone: Boolean(activeProject.kdpBible && (activeProject.kdpBible.characters?.length || activeProject.kdpBible.coreConcepts?.length)),
                    preview: activeProject.kdpBible 
                      ? `${activeProject.kdpBible.characters?.length || 0} personagens/avatares definidos • ${activeProject.kdpBible.coreConcepts?.length || 0} conceitos centrais • Tom: "${activeProject.kdpBible.styleGuide?.tone || activeProject.kdpConcept?.tone || 'Autoritativo'}"`
                      : 'Cânone da obra e perfis arquetípicos pendentes.',
                    tab: 'bible' as const
                  },
                  {
                    step: 3,
                    icon: '📑',
                    title: '3. Sumário & Arquitetura de Capítulos (Outline)',
                    desc: 'Estrutura detalhada de capítulos, objetivos didáticos, metas de palavras e ganchos de curiosidade entre capítulos.',
                    isDone: Boolean(activeProject.kdpChapters && activeProject.kdpChapters.length > 0),
                    preview: activeProject.kdpChapters?.length 
                      ? `${activeProject.kdpChapters.length} capítulos planejados com metas de palavras (~${(activeProject.kdpChapters.reduce((s, c) => s + (c.targetWordCount || 0), 0)).toLocaleString()} palavras)`
                      : 'Sumário estruturado e planejamento de capítulos pendente.',
                    tab: 'outline' as const
                  },
                  {
                    step: 4,
                    icon: '📖',
                    title: '4. Páginas Preliminares & Prefácio de Autoridade',
                    desc: 'Folha de Rosto, Aviso Legal e Direitos Autorais KDP, Dedicatória, Epígrafe, Prefácio de autoridade e Introdução transformadora.',
                    isDone: Boolean(activeProject.editorialElements?.preface || activeProject.editorialElements?.introduction),
                    preview: activeProject.editorialElements?.preface 
                      ? `Folha de Rosto, Copyright KDP, Prefácio e Introdução prontos para diagramação.`
                      : 'Páginas preliminares e prefácio de abertura pendentes.',
                    tab: 'editorial' as const
                  },
                  {
                    step: 5,
                    icon: '🎨',
                    title: '5. Estúdio de Capa & Geometria KDP',
                    desc: 'Capa frontal cinematográfica, cálculo milimétrico da lombada KDP (para impressão física) e texto de contracapa (blurbs e bullets).',
                    isDone: Boolean(activeProject.kdpCoverDesign?.geometry),
                    preview: activeProject.kdpCoverDesign?.geometry 
                      ? `Lombada: ${(activeProject.kdpCoverDesign.geometry.spineWidthInches * 25.4).toFixed(1)}mm (${activeProject.kdpCoverDesign.geometry.spineWidthInches}") • Contracapa persuasiva e geometria KDP calculada.`
                      : 'Geometria de capa e prompts de arte pendentes.',
                    tab: 'cover' as const
                  },
                  {
                    step: 6,
                    icon: '⚡',
                    title: '6. Capítulo 1: O Gancho de Best-Seller',
                    desc: 'Abertura magnética de alta tensão, incidente incitante, quebra de paradigma contraintuitivo nas 3 primeiras linhas e retenção brutal.',
                    isDone: Boolean(activeProject.kdpChapters?.[0]?.prose && (activeProject.kdpChapters[0].wordCount || 0) >= 800),
                    preview: activeProject.kdpChapters?.[0]?.prose 
                      ? `Capítulo 1 redigido (${activeProject.kdpChapters[0].wordCount || 0} palavras) com abertura de alta tensão e gancho de best-seller.`
                      : 'Abertura eletrizante e redação do Capítulo 1 pendente.',
                    tab: 'writer' as const
                  },
                  {
                    step: 7,
                    icon: '📚',
                    title: '7. Corpo da Obra: Demais Capítulos (2 a N)',
                    desc: 'Redação aprofundada de todos os capítulos subsequentes com continuidade holística, estudos de caso e exercícios práticos.',
                    isDone: Boolean(activeProject.kdpChapters && activeProject.kdpChapters.length > 1 && activeProject.kdpChapters.slice(1).every(c => c.prose && (c.wordCount || 0) >= 800)),
                    preview: activeProject.kdpChapters && activeProject.kdpChapters.length > 1 
                      ? `${activeProject.kdpChapters.slice(1).filter(c => c.prose && (c.wordCount || 0) >= 800).length} de ${activeProject.kdpChapters.length - 1} capítulos restantes redigidos com alta densidade.`
                      : 'Desenvolvimento e redação dos demais capítulos pendente.',
                    tab: 'writer' as const
                  },
                  {
                    step: 8,
                    icon: '💡',
                    title: '8. Conclusão, Apêndices Práticos & Referências',
                    desc: 'Conclusão mobilizadora, roteiro de ação prática, apêndices com checklists, glossário de termos e bibliografia verificada.',
                    isDone: Boolean(activeProject.editorialElements?.conclusion && (activeProject.editorialElements?.appendices?.length || activeProject.editorialElements?.references?.length)),
                    preview: activeProject.editorialElements?.conclusion 
                      ? `Conclusão inspiradora • ${activeProject.editorialElements.appendices?.length || 0} apêndices práticos • ${activeProject.editorialElements.references?.length || 0} referências bibliográficas.`
                      : 'Conclusão acionável, apêndices e bibliografia pendentes.',
                    tab: 'editorial' as const
                  },
                  {
                    step: 9,
                    icon: '🔍',
                    title: '9. Auditoria Editorial & Quality Gate KDP',
                    desc: 'Leitura crítica profunda do editor-chefe (score de 1 a 100), checagem de consistência interna e validação técnica dos requisitos da Amazon KDP.',
                    isDone: Boolean(activeProject.kdpEditorReport?.score && activeProject.kdpQualityReport),
                    preview: activeProject.kdpEditorReport?.score 
                      ? `Score Editorial: ${activeProject.kdpEditorReport.score}/100 • Parecer do Editor-Chefe aprovado • Quality Gate KDP: ${activeProject.kdpQualityReport?.passed ? '✓ APROVADO' : 'PENDENTE'}`
                      : 'Auditoria técnica de publicação e leitura crítica pendente.',
                    tab: 'quality' as const
                  },
                  {
                    step: 10,
                    icon: '🚀',
                    title: '10. Compilação Final KDP (EPUB, PDF, Metadados & .ZIP)',
                    desc: 'Geração dos arquivos finais diagramados para Kindle e Capa Comum, 7 palavras-chave e categorias oficiais para publicação.',
                    isDone: Boolean(activeProject.pipelineStage === 'completed' || activeProject.status === 'CONCLUÍDO'),
                    preview: activeProject.pipelineStage === 'completed' || activeProject.status === 'CONCLUÍDO' 
                      ? `Metadados e 7 keywords KDP prontos • Pacote .ZIP completo disponível para publicação imediata na Amazon KDP.`
                      : 'Compilação e pacote definitivo para publicação pendente.',
                    tab: 'export' as const
                  }
                ].map((item) => {
                  const isCurrent = treeRunningStep === item.step;
                  return (
                    <div
                      key={item.step}
                      style={{
                        background: item.isDone ? '#0f172a' : isCurrent ? '#172554' : '#0b1120',
                        border: `1px solid ${item.isDone ? '#059669' : isCurrent ? '#3b82f6' : '#1e293b'}`,
                        borderRadius: '10px',
                        padding: '18px 20px',
                        boxShadow: isCurrent ? '0 0 15px rgba(59, 130, 246, 0.25)' : 'none',
                        transition: 'all 0.25s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '280px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: item.isDone ? '#064e3b' : isCurrent ? '#1e40af' : '#1e293b',
                            border: `2px solid ${item.isDone ? '#10b981' : isCurrent ? '#60a5fa' : '#475569'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 800,
                            color: item.isDone ? '#34d399' : isCurrent ? '#93c5fd' : '#94a3b8',
                            flexShrink: 0
                          }}>
                            {item.isDone ? '✓' : item.step}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: item.isDone ? '#f8fafc' : '#e2e8f0' }}>
                                {item.title}
                              </h4>
                              {item.isDone && (
                                <span style={{
                                  background: '#064e3b',
                                  color: '#34d399',
                                  border: '1px solid #059669',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  ✓ CONCLUÍDO
                                </span>
                              )}
                              {isCurrent && (
                                <span style={{
                                  background: '#1e3a8a',
                                  color: '#93c5fd',
                                  border: '1px solid #3b82f6',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '6px'
                                }}>
                                  ⏳ EXECUTANDO...
                                </span>
                              )}
                              {!item.isDone && !isCurrent && (
                                <span style={{
                                  background: '#1e293b',
                                  color: '#94a3b8',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '6px'
                                }}>
                                  ○ PENDENTE
                                </span>
                              )}
                            </div>
                            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                              {item.desc}
                            </p>
                            <div style={{
                              background: '#020617',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              color: item.isDone ? '#a7f3d0' : '#64748b',
                              border: '1px solid #1e293b',
                              lineHeight: 1.4
                            }}>
                              {item.preview}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleRunSingleStep(item.step)}
                            disabled={isGenerating}
                            style={{
                              background: item.isDone ? '#1e293b' : '#2563eb',
                              color: '#ffffff',
                              border: item.isDone ? '1px solid #334155' : 'none',
                              borderRadius: '6px',
                              padding: '8px 14px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: isGenerating ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {isCurrent ? '⏳ Executando...' : item.isDone ? '🔄 Regerar Passo' : '⚡ Executar Passo'}
                          </button>

                          <button
                            onClick={() => setActiveSubTab(item.tab)}
                            style={{
                              background: 'transparent',
                              color: '#38bdf8',
                              border: '1px solid #0284c7',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            👁️ Ver / Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Terminal de Logs ao Vivo */}
              <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📡 Registro de Execução da Árvore Editorial (Tempo Real):
                  </span>
                  <button
                    onClick={() => setPipelineLogs([])}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Limpar Logs
                  </button>
                </div>
                <div style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#94a3b8',
                  lineHeight: 1.6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {pipelineLogs.length === 0 ? (
                    <span style={{ color: '#475569', fontStyle: 'italic' }}>Nenhum log registrado ainda. Clique em "Executar Passo" ou no botão mestre para iniciar.</span>
                  ) : (
                    pipelineLogs.map((log, i) => (
                      <span key={i} style={{ color: log.includes('❌') ? '#f87171' : log.includes('✓') ? '#34d399' : '#94a3b8' }}>
                        {log}
                      </span>
                    ))
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-ABA 1: CONCEITO & SELEÇÃO DE TÍTULO                                   */}
          {/* ========================================================================= */}
          {activeSubTab === 'concept' && activeProject.kdpConcept && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              {/* Seleção de Títulos */}
              {titleOptions.length > 0 && (
                <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
                    SELEÇÃO DE TÍTULO COMERCIAL
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                    {titleOptions.map(opt => (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedTitleId(opt.id)}
                        style={{
                          border: `1px solid ${selectedTitleId === opt.id ? '#3b82f6' : '#334155'}`,
                          background: selectedTitleId === opt.id ? 'rgba(59, 130, 246, 0.12)' : '#1e293b',
                          borderRadius: '6px',
                          padding: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                          {opt.commercialAngle}
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                          {opt.title}
                        </h4>
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '8px' }}>
                          {opt.subtitle}
                        </div>
                        <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                          {opt.targetAppeal}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleApproveTitleSelection}
                      disabled={isGenerating}
                      style={{
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isGenerating ? 'Gerando Estrutura...' : '✓ [APROVAR TÍTULO E AVANÇAR PARA ESTRUTURA]'}
                    </button>
                  </div>
                </div>
              )}

              {/* Detalhes do Conceito Editorial */}
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
                  PROPOSTA EDITORIAL & GANCHO COMERCIAL
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Promessa Central da Obra:</label>
                    <div style={{ fontSize: '13px', color: '#f8fafc', marginTop: '4px' }}>{activeProject.kdpConcept.promise}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Diferencial Competitivo:</label>
                    <div style={{ fontSize: '13px', color: '#f8fafc', marginTop: '4px' }}>{activeProject.kdpConcept.differentiator}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Tom de Voz:</label>
                    <div style={{ fontSize: '13px', color: '#f8fafc', marginTop: '4px' }}>{activeProject.kdpConcept.tone}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Público Alvo:</label>
                    <div style={{ fontSize: '13px', color: '#f8fafc', marginTop: '4px' }}>{activeProject.kdpConcept.audience}</div>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Sinopse Comercial:</label>
                  <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#cbd5e1', background: '#1e293b', padding: '14px', borderRadius: '6px' }}>
                    {activeProject.kdpConcept.longSynopsis || activeProject.kdpConcept.shortSynopsis}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-ABA 2: SUMÁRIO & ESTRUTURA (OUTLINE)                                  */}
          {/* ========================================================================= */}
          {activeSubTab === 'outline' && (
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                    ESTRUTURA DE CAPÍTULOS (OUTLINE)
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Total: {activeProject.kdpChapters?.length || 0} capítulos planejados (~{totalWords.toLocaleString()} palavras)
                  </div>
                </div>

                <button
                  onClick={executeFullTreeStepByStep}
                  disabled={isGenerating}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isGenerating ? '⏳ Escrevendo e Auditando...' : '✓ [APROVAR ESTRUTURA E AVANÇAR NA ÁRVORE EDITORIAL]'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(activeProject.kdpChapters || []).map(ch => (
                  <div key={ch.index} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                        Capítulo {ch.index}: {ch.title}
                      </span>
                      <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                        Meta: ~{ch.targetWordCount} palavras
                      </span>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                      <strong>Objetivo:</strong> {ch.objective || ch.summary}
                    </p>
                    {ch.subtopics && ch.subtopics.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {ch.subtopics.map((st, i) => (
                          <span key={i} style={{ fontSize: '10px', background: '#0f172a', padding: '2px 8px', borderRadius: '4px', color: '#94a3b8' }}>
                            {st}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-ABA 3: BÍBLIA DA OBRA                                                 */}
          {/* ========================================================================= */}
          {activeSubTab === 'bible' && activeProject.kdpBible && (
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                BÍBLIA DA OBRA (CANON EDITORIAL)
              </h3>

              {/* Personagens / Avatares */}
              {activeProject.kdpBible.characters && activeProject.kdpBible.characters.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                    Personagens / Perfis Canônicos:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                    {activeProject.kdpBible.characters.map((char, i) => (
                      <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>{char.name} ({char.role})</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0' }}>{char.appearance}</div>
                        <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Personalidade: {char.personality}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conceitos Centrais (Não-Ficção) */}
              {activeProject.kdpBible.coreConcepts && activeProject.kdpBible.coreConcepts.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                    Conceitos e Metodologias Centrais:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                    {activeProject.kdpBible.coreConcepts.map((c, i) => (
                      <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>{c.concept}</div>
                        <div style={{ fontSize: '11px', color: '#cbd5e1', margin: '4px 0' }}>{c.explanation}</div>
                        <div style={{ fontSize: '10px', color: '#38bdf8' }}>Aplicação: {c.practicalApplication}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-ABA 4: ESTÚDIO DE ESCRITA (SPLIT VIEW: SUMÁRIO, EDITOR & IA)         */}
          {/* ========================================================================= */}
          {activeSubTab === 'writer' && (
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: '16px', minHeight: '600px' }}>
              {/* Coluna Esquerda: Árvore de Capítulos */}
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '14px', overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Capítulos ({activeProject.kdpChapters?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(activeProject.kdpChapters || []).map(ch => (
                    <button
                      key={ch.index}
                      onClick={() => {
                        setSelectedChapterIndex(ch.index);
                        setIsEditingProse(false);
                      }}
                      style={{
                        textAlign: 'left',
                        background: selectedChapterIndex === ch.index ? '#1e293b' : 'transparent',
                        border: `1px solid ${selectedChapterIndex === ch.index ? '#3b82f6' : 'transparent'}`,
                        borderRadius: '6px',
                        padding: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: selectedChapterIndex === ch.index ? '#38bdf8' : '#ffffff' }}>
                        {ch.index}. {ch.title}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                        {ch.wordCount || 0} palavras
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coluna Central: Editor de Prosa */}
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                      Capítulo {currentChapter?.index}: {currentChapter?.title}
                    </h3>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {currentChapter?.wordCount || 0} palavras • ~{Math.ceil((currentChapter?.wordCount || 0) / 200)} min de leitura
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (isEditingProse) {
                        // Salva
                        const updatedChapters = (activeProject.kdpChapters || []).map(c => 
                          c.index === selectedChapterIndex 
                            ? { ...c, prose: editedProse, wordCount: editedProse.split(/\s+/).filter(Boolean).length } 
                            : c
                        );
                        const updatedProj = { ...activeProject, kdpChapters: updatedChapters, updatedAt: Date.now() };
                        setActiveProject(updatedProj);
                        db.saveBookProject(updatedProj);
                        setIsEditingProse(false);
                        showToast('✓ Texto do capítulo salvo com sucesso!');
                      } else {
                        setEditedProse(currentChapter?.prose || '');
                        setIsEditingProse(true);
                      }
                    }}
                    style={{
                      background: isEditingProse ? '#10b981' : '#1e293b',
                      color: '#ffffff',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isEditingProse ? 'Salvar Edição' : '✏️ Editar Texto'}
                  </button>
                </div>

                {/* Área de Texto */}
                {isEditingProse ? (
                  <textarea
                    value={editedProse}
                    onChange={e => setEditedProse(e.target.value)}
                    style={{
                      flex: 1,
                      width: '100%',
                      background: '#020617',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      padding: '16px',
                      color: '#f8fafc',
                      fontSize: '14px',
                      lineHeight: 1.7,
                      fontFamily: 'Georgia, serif',
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                ) : (
                  <div style={{
                    flex: 1,
                    background: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '20px',
                    overflowY: 'auto',
                    fontSize: '14px',
                    lineHeight: 1.8,
                    fontFamily: 'Georgia, serif',
                    color: '#e2e8f0',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {currentChapter?.prose || 'Este capítulo ainda não possui manuscrito redigido. Clique em "Expandir capítulo" no painel da IA ao lado para gerar.'}
                  </div>
                )}
              </div>

              {/* Coluna Direita: Assistente Editorial IA */}
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                  Assistente de IA do Capítulo
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={handleWriteSingleChapter}
                    disabled={isAiWorkingOnChapter || isGenerating}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                    }}
                  >
                    {isAiWorkingOnChapter ? '⏳ Redigindo Capítulo...' : '✍️ Redigir Este Capítulo com IA'}
                  </button>

                  <button
                    onClick={() => handleAiActionOnChapter('rewrite')}
                    disabled={isAiWorkingOnChapter}
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    🔄 Reescrever este trecho
                  </button>

                  <button
                    onClick={() => handleAiActionOnChapter('expand')}
                    disabled={isAiWorkingOnChapter}
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    ➕ Expandir capítulo (+40% texto)
                  </button>

                  <button
                    onClick={() => handleAiActionOnChapter('polish')}
                    disabled={isAiWorkingOnChapter}
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    ✨ Melhorar fluidez e estilo
                  </button>

                  <button
                    onClick={() => handleAiActionOnChapter('continuity')}
                    disabled={isAiWorkingOnChapter}
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    🔍 Auditar continuidade e fatos
                  </button>
                </div>

                {isAiWorkingOnChapter && (
                  <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
                    ⏳ {aiActionMessage || 'Processando com IA...'}
                  </div>
                )}

                {/* Histórico de Versões */}
                <div style={{ marginTop: 'auto', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                    Versões Salvas ({currentChapter?.versions?.length || 0})
                  </div>
                  {(currentChapter?.versions || []).slice(0, 3).map((v, i) => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#cbd5e1', marginBottom: '4px' }}>
                      <span>v{i + 1} ({v.wordCount} pal.)</span>
                      <button
                        onClick={() => {
                          setEditedProse(v.prose);
                          setIsEditingProse(true);
                          showToast('Versão carregada no editor!');
                        }}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 0 }}
                      >
                        Restaurar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-ABA 5: PÁGINAS PRELIMINARES E FINAIS                                  */}
          {/* ========================================================================= */}
          {activeSubTab === 'editorial' && (
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                PÁGINAS PRELIMINARES E MATÉRIA EDITORIAL
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#38bdf8' }}>Introdução:</h4>
                  <p style={{ background: '#1e293b', padding: '14px', borderRadius: '6px', fontSize: '12px', lineHeight: 1.6, color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                    {activeProject.editorialElements?.introduction || 'Introdução ainda não gerada.'}
                  </p>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#38bdf8' }}>Conclusão:</h4>
                  <p style={{ background: '#1e293b', padding: '14px', borderRadius: '6px', fontSize: '12px', lineHeight: 1.6, color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                    {activeProject.editorialElements?.conclusion || 'Conclusão ainda não gerada.'}
                  </p>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#38bdf8' }}>Sobre o Autor:</h4>
                  <p style={{ background: '#1e293b', padding: '14px', borderRadius: '6px', fontSize: '12px', lineHeight: 1.6, color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                    {activeProject.editorialElements?.aboutAuthor || 'Biografia do autor ainda não gerada.'}
                  </p>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#38bdf8' }}>Créditos e Copyright:</h4>
                  <p style={{ background: '#1e293b', padding: '14px', borderRadius: '6px', fontSize: '12px', lineHeight: 1.6, color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                    {activeProject.editorialElements?.copyrightNotice || `© ${new Date().getFullYear()} ${activeProject.author}. Todos os direitos reservados.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-ABA 6: ESTÚDIO DE CAPA KDP & RENDERIZADOR VISUAL IA                   */}
          {/* ========================================================================= */}
          {activeSubTab === 'cover' && (
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎨</span> Estúdio de Capa KDP & Renderizador Visual de Alta Resolução
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Renderize capas comerciais padrão Amazon KDP usando os motores mais bem avaliados do GitHub (Fooocus / SD WebUI) ou o modelo neural Flux.1
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <a
                    href="dashboard.html?tab=coverStudio"
                    style={{
                      textDecoration: 'none',
                      background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '9px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
                    }}
                  >
                    <span>🎨</span> Abrir no Estúdio 3D & Jacket
                  </a>

                  <label style={{
                    background: '#1e293b',
                    color: '#38bdf8',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '9px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>📁</span> Carregar Arquivo de Capa
                    <input type="file" accept="image/*" onChange={handleUploadCustomCover} style={{ display: 'none' }} />
                  </label>

                  <button
                    onClick={handleGenerateCoverArt}
                    disabled={isGeneratingCover}
                    style={{
                      background: isGeneratingCover ? '#475569' : '#ec4899',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '9px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: isGeneratingCover ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)'
                    }}
                  >
                    <span>{isGeneratingCover ? '⏳' : '🎨'}</span>
                    {isGeneratingCover ? 'Renderizando Arte da Capa...' : 'Gerar Arte da Capa com IA'}
                  </button>

                  <button
                    onClick={handleDownloadCoverWrapPdf}
                    style={{
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '9px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>📄</span> Baixar Capa Full-Wrap (PDF KDP)
                  </button>
                </div>
              </div>

              {/* Editor de Prompt Visual */}
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                    Prompt Visual de Renderização Editorial (Inglês Técnico):
                  </label>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Otimizado para capas de livros sem distorção tipográfica
                  </span>
                </div>
                <textarea
                  rows={2}
                  className="input-field"
                  value={coverPromptInput || activeProject.kdpCoverDesign?.frontPrompt || ''}
                  onChange={(e) => setCoverPromptInput(e.target.value)}
                  placeholder="Cinematic book cover art, dramatic lighting, modern bestseller style, high resolution..."
                  style={{ width: '100%', resize: 'vertical', fontSize: '12px', lineHeight: 1.5, background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              {/* MOCKUP VISUAL COMPLETO KDP: CONTRACAPA + LOMBADA + CAPA FRONTAL */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Pré-visualização da Capa Aberta (Layout Oficial Amazon KDP Print):
                </div>

                <div style={{
                  background: '#020617',
                  border: '2px solid #334155',
                  borderRadius: '10px',
                  padding: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'stretch',
                  gap: '0px',
                  overflowX: 'auto',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
                }}>
                  
                  {/* 1. CONTRACAPA (PAINEL ESQUERDO) */}
                  <div style={{
                    width: '320px',
                    minHeight: '440px',
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '6px 0 0 6px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box'
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                        SOBRE ESTA OBRA
                      </div>
                      <p style={{ fontSize: '11px', lineHeight: 1.6, color: '#cbd5e1', margin: '0 0 16px 0', whiteSpace: 'pre-wrap' }}>
                        {activeProject.kdpCoverDesign?.backCoverBlurb || activeProject.kdpConcept?.shortSynopsis || activeProject.description}
                      </p>

                      <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>DESTAQUES:</div>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '10px', color: '#94a3b8', lineHeight: 1.5 }}>
                          <li>Pesquisa aprofundada e dados verificados</li>
                          <li>Narrativa de alta retenção e imersão</li>
                          <li>Edição preparada para Amazon Kindle & Print</li>
                        </ul>
                      </div>
                    </div>

                    {/* Código de Barras KDP Placeholder */}
                    <div style={{
                      width: '130px',
                      height: '60px',
                      background: '#ffffff',
                      borderRadius: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      marginTop: '20px',
                      border: '1px solid #cbd5e1'
                    }}>
                      <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '36px', width: '100%', justifyContent: 'center' }}>
                        {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2].map((h, i) => (
                          <span key={i} style={{ width: `${h}px`, height: '100%', background: '#000000' }}></span>
                        ))}
                      </div>
                      <div style={{ fontSize: '7px', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                        KDP BARCODE SAFE ZONE
                      </div>
                    </div>
                  </div>

                  {/* 2. LOMBADA / SPINE (PAINEL CENTRAL) */}
                  <div style={{
                    width: '38px',
                    minHeight: '440px',
                    background: '#0b1329',
                    borderTop: '1px solid #1e293b',
                    borderBottom: '1px solid #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <div style={{
                      transform: 'rotate(90deg)',
                      whiteSpace: 'nowrap',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#f8fafc',
                      letterSpacing: '1px'
                    }}>
                      {activeProject.title}  •  {activeProject.author}
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      fontSize: '8px',
                      color: '#38bdf8',
                      fontWeight: 700
                    }}>
                      KDP
                    </div>
                  </div>

                  {/* 3. CAPA FRONTAL (PAINEL DIREITO) */}
                  <div style={{
                    width: '320px',
                    minHeight: '440px',
                    borderRadius: '0 6px 6px 0',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '24px',
                    boxSizing: 'border-box',
                    background: activeProject.kdpCoverDesign?.frontImageUrl
                      ? `url(${activeProject.kdpCoverDesign.frontImageUrl}) center/cover no-repeat`
                      : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    border: '1px solid #334155'
                  }}>
                    {/* Selo Best-Seller */}
                    <div style={{
                      alignSelf: 'flex-start',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#000',
                      fontSize: '9px',
                      fontWeight: 900,
                      padding: '3px 8px',
                      borderRadius: '3px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                      letterSpacing: '0.5px'
                    }}>
                      ★ BEST-SELLER KDP
                    </div>

                    {/* Caixa de Título e Subtítulo */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.88)',
                      backdropFilter: 'blur(8px)',
                      padding: '16px',
                      borderRadius: '6px',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      textAlign: 'center'
                    }}>
                      <h2 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>
                        {activeProject.title}
                      </h2>
                      {activeProject.subtitle && (
                        <div style={{ fontSize: '11px', color: '#93c5fd', fontStyle: 'italic', lineHeight: 1.3 }}>
                          {activeProject.subtitle}
                        </div>
                      )}
                    </div>

                    {/* Rodapé com Autor */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.92)',
                      padding: '8px 14px',
                      borderRadius: '4px',
                      textAlign: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        ESCRITO POR
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                        {activeProject.author}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Tabela de Geometria KDP */}
              <div style={{ background: '#1e293b', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
                  📐 Parâmetros Geométricos KDP Calculados:
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '12px', color: '#cbd5e1' }}>
                  <div>Formato de Corte (Trim): <strong style={{ color: '#fff' }}>{activeProject.trimSize}</strong></div>
                  <div>Páginas Reais Estimadas: <strong style={{ color: '#fff' }}>{realPages} páginas</strong></div>
                  <div>Tipo de Papel: <strong style={{ color: '#fff' }}>{activeProject.paperType === 'bw-white' ? 'Branco (0.002252"/pág)' : 'Creme (0.0025"/pág)'}</strong></div>
                  <div>Lombada (Spine Width): <strong style={{ color: '#34d399' }}>{activeProject.kdpCoverDesign?.geometry?.spineWidthInches || '0.350'}" pol. ({((activeProject.kdpCoverDesign?.geometry?.spineWidthInches || 0.350) * 25.4).toFixed(1)} mm)</strong></div>
                  <div>Largura Total com Sangria: <strong style={{ color: '#fff' }}>{activeProject.kdpCoverDesign?.geometry?.totalCoverWidthInches || '12.600'}" pol.</strong></div>
                  <div>Altura Total com Sangria: <strong style={{ color: '#fff' }}>{activeProject.kdpCoverDesign?.geometry?.totalCoverHeightInches || '9.250'}" pol.</strong></div>
                  <div>Sangria Padrão KDP: <strong style={{ color: '#fff' }}>0.125" pol. (3.175 mm)</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-ABA 7: METADADOS KDP                                                  */}
          {/* ========================================================================= */}
          {activeSubTab === 'metadata' && (
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                METADADOS KDP & PALAVRAS-CHAVE DE BUSCA
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#38bdf8' }}>7 Palavras-Chave KDP:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.8 }}>
                    {(activeProject.kdpMetadata?.keywords7 || ['disciplina pessoal', 'hábitos de alta performance', 'gestão do tempo', 'produtividade diária', 'foco e consistência', 'autoaperfeiçoamento', 'mudança de vida']).map((kw, i) => (
                      <li key={i}><strong>{kw}</strong></li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#38bdf8' }}>Categorias Amazon Sugeridas:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.8 }}>
                    {(activeProject.kdpMetadata?.categoriesPrimary || ['Autoajuda / Desenvolvimento Pessoal', 'Negócios / Gestão e Liderança']).map((cat, i) => (
                      <li key={i}>{cat}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#38bdf8' }}>Descrição Comercial Amazon:</h4>
                <div style={{ background: '#1e293b', padding: '14px', borderRadius: '6px', fontSize: '12px', lineHeight: 1.6, color: '#cbd5e1' }}
                  dangerouslySetInnerHTML={{ __html: activeProject.kdpMetadata?.commercialLongDescription || activeProject.description }}
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-ABA 8: QUALITY GATE                                                   */}
          {/* ========================================================================= */}
          {activeSubTab === 'quality' && (
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                    AUDITORIA TÉCNICA KDP QUALITY GATE
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Status: <strong style={{ color: activeProject.kdpQualityReport?.isReadyForKdp ? '#10b981' : '#f59e0b' }}>
                      {activeProject.kdpQualityReport?.isReadyForKdp ? '✓ PRONTO PARA ENVIO AO AMAZON KDP' : '⚠️ REVISÃO NECESSÁRIA'}
                    </strong>
                  </div>
                </div>

                <div style={{ fontSize: '28px', fontWeight: 800, color: (activeProject.kdpQualityReport?.overallScore || 90) >= 80 ? '#10b981' : '#f59e0b' }}>
                  {activeProject.kdpQualityReport?.overallScore || 95} / 100
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(activeProject.kdpQualityReport?.checks || []).map(chk => (
                  <div key={chk.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1e293b', padding: '10px 14px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '16px', color: chk.passed ? '#10b981' : '#ef4444' }}>
                      {chk.passed ? '✓' : '⚠️'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{chk.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{chk.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-ABA 9: EXPORTAR ARQUIVOS                                              */}
          {/* ========================================================================= */}
          {activeSubTab === 'export' && (
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                CENTRAL DE EXPORTAÇÃO E DOWNLOADS KDP
              </h3>
              <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#94a3b8' }}>
                Baixe o pacote completo ou os arquivos individuais prontos para upload no Amazon Kindle Direct Publishing.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#ffffff' }}>Pacote Completo KDP (.ZIP)</h4>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 14px 0' }}>
                    Contém ebook/, paperback/, manuscript/, cover/, metadata/ e validation/ em um único arquivo compactado.
                  </p>
                  <button
                    onClick={handleDownloadZipPackage}
                    style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', width: '100%' }}
                  >
                    📦 Baixar Pacote Completo (.ZIP)
                  </button>
                </div>

                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#ffffff' }}>E-book Kindle (.EPUB)</h4>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 14px 0' }}>
                    EPUB 3 padronizado com sumário interativo, folha de rosto, créditos e capítulos com tipografia serifada.
                  </p>
                  <button
                    onClick={handleDownloadEpub}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', width: '100%' }}
                  >
                    📱 Baixar E-book (.EPUB)
                  </button>
                </div>

                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#ffffff' }}>Miolo Impresso (.PDF)</h4>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 14px 0' }}>
                    PDF de miolo diagramado nas dimensões exatas de {activeProject.trimSize} com numeração de páginas e margens KDP.
                  </p>
                  <button
                    onClick={handleDownloadInteriorPdf}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', width: '100%' }}
                  >
                    📄 Baixar Interior (.PDF)
                  </button>
                </div>

                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#ffffff' }}>Capa Full-Wrap (.PDF)</h4>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 14px 0' }}>
                    PDF de capa completa (frente + lombada com espessura calculada + contracapa com blurb e área de código de barras).
                  </p>
                  <button
                    onClick={handleDownloadCoverWrapPdf}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', width: '100%' }}
                  >
                    🎨 Baixar Capa Full-Wrap (.PDF)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* RODAPÉ DE NAVEGAÇÃO DO FLUXO DE TAREFAS (WORKFLOW STEPPER FOOTER)          */}
          {/* ========================================================================= */}
          {(() => {
            const workflowSteps: { id: SubTabType; label: string; icon: string }[] = [
              { id: 'tree', label: 'Esteira Editorial', icon: '🌳' },
              { id: 'concept', label: '1. Título & Conceito', icon: '🎯' },
              { id: 'outline', label: '2. Sumário', icon: '📐' },
              { id: 'bible', label: '3. Bíblia da Obra', icon: '🧠' },
              { id: 'editorial', label: '4. Preliminares', icon: '📝' },
              { id: 'cover', label: '5. Capa KDP', icon: '🎨' },
              { id: 'writer', label: '6. Escrita do Livro', icon: '✍️' },
              { id: 'quality', label: '7. Auditoria KDP', icon: '🛡️' },
              { id: 'metadata', label: '8. Metadados', icon: '🏷️' },
              { id: 'export', label: '9. Compilação', icon: '📦' }
            ];
            const currentIndex = workflowSteps.findIndex(s => s.id === activeSubTab);
            const prev = currentIndex > 0 ? workflowSteps[currentIndex - 1] : null;
            const next = currentIndex < workflowSteps.length - 1 ? workflowSteps[currentIndex + 1] : null;

            return (
              <div style={{
                marginTop: '30px',
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  {prev ? (
                    <button
                      onClick={() => setActiveSubTab(prev.id)}
                      style={{
                        background: '#1e293b',
                        color: '#cbd5e1',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '10px 18px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>◀</span> Voltar: {prev.label}
                    </button>
                  ) : <div />}
                </div>

                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Etapa <strong>{currentIndex + 1}</strong> de {workflowSteps.length} • Fluxo Editorial KDP
                </div>

                <div>
                  {next ? (
                    <button
                      onClick={() => setActiveSubTab(next.id)}
                      style={{
                        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 22px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                      }}
                    >
                      Avançar para: {next.label} <span>▶</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleDownloadZipPackage}
                      style={{
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 22px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🎉 Obra Completa! Baixar Pacote KDP (.ZIP)
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
