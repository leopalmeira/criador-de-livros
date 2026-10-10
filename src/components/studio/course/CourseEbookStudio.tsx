import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GraduationCap, Search, Filter, ArrowRight, ArrowLeft,
  CheckCircle2, AlertTriangle, AlertCircle, Sparkles, RefreshCw,
  Download, Eye, Edit3, Plus, Trash2, Shield, Wrench, BookOpen,
  Image as ImageIcon, DollarSign, ExternalLink, Play, Layers, HelpCircle
} from 'lucide-react';
import {
  CourseTheme,
  CourseEbookData,
  CourseDifficultyLevel,
  CourseImageProfile,
  CourseVisualArtStyle,
  CoursePedagogicalPlan,
  CourseModule,
  CourseLesson,
  CourseImagePlan,
  HotmartMarketReference,
  CourseAuditReport
} from '../../../types/course-ebook';
import { BookProject } from '../../../types/book-project';
import { db } from '../../../database/local-database';
import {
  searchCourseThemes,
  COURSE_CATEGORIES,
  addCustomCourseTheme
} from '../../../data/course-themes-catalog';
import { CourseMarketService } from '../../../services/course-market-service';
import { CoursePedagogicalService } from '../../../services/course-pedagogical-service';
import { CourseVisualDirector } from '../../../services/course-visual-director';
import { CourseAuditorService } from '../../../services/course-auditor-service';
import { CoursePdfExporter } from '../../../services/course-pdf-exporter';
import './course-studio.css';

interface Props {
  initialProject?: BookProject | null;
  onBackToDashboard: () => void;
  onProjectSaved?: (project: BookProject) => void;
}

export const CourseEbookStudio: React.FC<Props> = ({
  initialProject,
  onBackToDashboard,
  onProjectSaved
}) => {
  // Estado Principal da Etapa (1 a 10)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    return initialProject?.courseData?.currentStep || 1;
  });

  // Projeto e Dados do Curso
  const [courseData, setCourseData] = useState<CourseEbookData>(() => {
    if (initialProject?.courseData) {
      return initialProject.courseData;
    }
    return {
      id: initialProject?.id || `course_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      themeTitle: initialProject?.title || 'Como Fazer Móveis Planejados do Zero',
      category: initialProject?.categories?.[0] || 'Marcenaria, móveis planejados e montagem',
      difficultyLevel: 'iniciante',
      targetAudience: initialProject?.targetAudience || 'Iniciantes e entusiastas que desejam aprender marcenaria prática e economizar ou prestar serviços.',
      primarySkill: 'Construção e montagem de móveis em MDF',
      learningObjective: 'Capacitar o aluno a medir, cortar, aplicar bordas e montar armários e módulos com acabamento profissional.',
      prerequisites: 'Nenhum conhecimento prévio exigido.',
      language: 'Português',
      toneStyle: 'Didático, prático e objetivo com foco na segurança',
      modulesCount: 4,
      approximateLessonsCount: 12,
      imageProfile: 'equilibrado',
      visualStyle: 'fotografia-tecnica-instrucional',
      estimatedImagesCount: 9,
      estimatedReplicateCostUsd: 0.035,
      marketReferences: [],
      currentStep: 1,
      generationStage: 'config',
      progressPercentage: 10,
      statusMessage: 'Pronto para iniciar a configuração do curso.',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });

  // Estado da Busca de Temas (Etapa 1)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<CourseDifficultyLevel | 'todos'>('todos');
  const [catalogPage, setCatalogPage] = useState(1);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(courseData.themeId || null);
  const [isCustomThemeModalOpen, setIsCustomThemeModalOpen] = useState(false);
  const [customThemeInput, setCustomThemeInput] = useState({
    title: '',
    category: COURSE_CATEGORIES[0],
    description: '',
    targetAudience: '',
    taughtSkill: '',
    difficultyLevel: 'iniciante' as CourseDifficultyLevel
  });

  // Estado da Pesquisa de Mercado Hotmart (Etapa 2)
  const [isSearchingMarket, setIsSearchingMarket] = useState(false);
  const [marketAnalysis, setMarketAnalysis] = useState<any>(null);

  // Estado da Geração de Conteúdo (Etapa 6)
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const cancelGenerationRef = useRef(false);

  // Estado da Geração de Imagens (Etapa 7)
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);

  // Estado do Editor de Aulas (Etapa 8)
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [regeneratingImageId, setRegeneratingImageId] = useState<string | null>(null);

  // Estado da Auditoria (Etapa 9)
  const [auditReport, setAuditReport] = useState<CourseAuditReport | null>(courseData.auditReport || null);

  // Salvar automaticamente alterações no banco de dados local
  const persistCourseProject = async (updatedData: CourseEbookData) => {
    setCourseData(updatedData);

    const chapters = (updatedData.pedagogicalPlan?.modules || []).flatMap((mod) =>
      mod.lessons.map((les) => {
        const primaryImage = les.images?.find(img => Boolean(img.imageDataUrl || img.imageUrl));
        const stepText = (les.stepByStepInstructions || [])
          .map(s => `**Passo ${s.stepNumber}: ${s.title}**\n${s.instruction}\n*Dica Técnica:* ${s.technicalNote || 'N/A'}`)
          .join('\n\n');

        const fullContent = `# ${les.title}\n\n**Objetivo:** ${les.objective}\n\n${les.introduction}\n\n${les.didacticExplanation}\n\n## Instruções Práticas Passo a Passo\n\n${stepText}\n\n## Atividade Prática\n\n${les.exercise?.description || ''}\n\n**Resultado Esperado:** ${les.exercise?.expectedOutcome || ''}`;

        return {
          id: les.id,
          number: les.lessonNumber,
          title: `Módulo ${mod.moduleNumber}: ${les.title}`,
          content: fullContent,
          summary: les.summary || les.objective,
          wordCount: fullContent.split(/\s+/).filter(Boolean).length,
          status: 'ESCRITO' as const,
          imagemDataUrl: primaryImage?.imageDataUrl || primaryImage?.imageUrl || null
        };
      })
    );

    const bookProject: BookProject = {
      id: updatedData.id,
      createdAt: updatedData.createdAt,
      updatedAt: Date.now(),
      status: updatedData.currentStep >= 9 ? 'FINALIZADO' : 'ESCREVENDO',
      priority: 'ALTA',
      executionMode: 'assisted',
      title: updatedData.pedagogicalPlan?.courseTitle || updatedData.themeTitle,
      subtitle: updatedData.pedagogicalPlan?.courseSubtitle || 'E-book de Curso Profissional com Didática Prática',
      author: initialProject?.author || 'Especialista BookEngin',
      description: updatedData.learningObjective,
      language: updatedData.language || 'Português',
      format: 'Capa Comum',
      trimSize: '8.5x11',
      paperType: 'color',
      estimatedPages: (updatedData.pedagogicalPlan?.modules?.length || 4) * 16,
      actualPages: chapters.length * 2,
      targetPrice: 49.90,
      currency: 'BRL',
      targetMarketplace: 'Hotmart / Amazon KDP',
      categories: ['Curso Profissional', updatedData.category],
      keywords: ['curso profissional', 'passo a passo ilustrado', updatedData.category, updatedData.primarySkill],
      targetAudience: updatedData.targetAudience,
      topic: updatedData.themeTitle,
      kdpBookType: 'course-ebook',
      chapters,
      coverImageUrl: updatedData.coverImageUrl,
      courseData: updatedData,
      pipelineStage: updatedData.currentStep >= 9 ? 'final' : 'writing',
      pipelineProgress: Math.min(100, updatedData.currentStep * 10),
      pipelineLog: [`Curso atualizado na etapa ${updatedData.currentStep}`],
      tasks: [],
      notes: `Curso Profissional criado pelo módulo BookEngin: ${updatedData.category}`,
      competitorsAsins: []
    };

    try {
      await db.saveBookProject(bookProject);
      if (onProjectSaved) onProjectSaved(bookProject);
    } catch (err) {
      console.warn('[CourseEbookStudio] Erro ao persistir projeto no banco:', err);
    }
  };

  // 1. Pesquisa no catálogo de 2.000 temas
  const searchResults = useMemo(() => {
    return searchCourseThemes({
      query: searchQuery,
      category: selectedCategoryFilter,
      difficultyLevel: selectedLevelFilter,
      page: catalogPage,
      pageSize: 12
    });
  }, [searchQuery, selectedCategoryFilter, selectedLevelFilter, catalogPage]);

  // Handler de Seleção de Tema
  const handleSelectTheme = (theme: CourseTheme) => {
    setSelectedThemeId(theme.id);
    const updated: CourseEbookData = {
      ...courseData,
      themeId: theme.id,
      themeTitle: theme.title,
      category: theme.category,
      difficultyLevel: theme.difficultyLevel,
      targetAudience: theme.targetAudience,
      primarySkill: theme.taughtSkill,
      learningObjective: theme.learningObjective,
      updatedAt: Date.now()
    };
    persistCourseProject(updated);
  };

  // Handler para Criar Tema Personalizado
  const handleSaveCustomTheme = () => {
    if (!customThemeInput.title.trim()) return;
    const newTheme = addCustomCourseTheme({
      title: customThemeInput.title.trim(),
      category: customThemeInput.category,
      description: customThemeInput.description || 'Tema de curso personalizado pelo usuário.',
      targetAudience: customThemeInput.targetAudience || 'Profissionais e interessados no tema.',
      difficultyLevel: customThemeInput.difficultyLevel,
      taughtSkill: customThemeInput.taughtSkill || customThemeInput.title,
      learningObjective: 'Dominar os fundamentos práticos e execução autônoma.',
      suggestedModules: ['Módulo 1: Introdução e Ferramentas', 'Módulo 2: Procedimentos Práticos', 'Módulo 3: Finalização'],
      suggestedFormat: 'E-book Ilustrado Passo a Passo',
      commercialReferences: ['Cursos Profissionalizantes de Mercado']
    });
    handleSelectTheme(newTheme);
    setIsCustomThemeModalOpen(false);
  };

  // 2. Pesquisa de Mercado Hotmart Real
  const handleTriggerMarketSearch = async () => {
    setIsSearchingMarket(true);
    try {
      const resp = await CourseMarketService.searchMarket(courseData.themeTitle, courseData.category);
      const updated: CourseEbookData = {
        ...courseData,
        marketReferences: resp.items,
        marketSearchQuery: courseData.themeTitle,
        marketResearchStatus: 'completed',
        marketOpportunitySummary: resp.opportunityAnalysis?.observedDemand,
        updatedAt: Date.now()
      };
      setMarketAnalysis(resp.opportunityAnalysis);
      persistCourseProject(updated);
    } catch (err) {
      console.warn('Erro na busca de mercado:', err);
    } finally {
      setIsSearchingMarket(false);
    }
  };

  // 4. Configuração Estrutural
  const handleUpdateEstimates = (profile: CourseImageProfile, modules: number) => {
    const est = CoursePedagogicalService.estimateImagesAndCost(modules, 3, profile);
    const updated: CourseEbookData = {
      ...courseData,
      imageProfile: profile,
      modulesCount: modules,
      estimatedImagesCount: est.totalImages,
      estimatedReplicateCostUsd: est.estimatedCostUsd,
      updatedAt: Date.now()
    };
    persistCourseProject(updated);
  };

  // 5. Planejar Grade Pedagógica
  const [isPlanning, setIsPlanning] = useState(false);
  const handleGeneratePedagogicalPlan = async () => {
    setIsPlanning(true);
    try {
      const plan = await CoursePedagogicalService.planPedagogicalCurriculum({
        themeTitle: courseData.themeTitle,
        category: courseData.category,
        targetAudience: courseData.targetAudience,
        difficultyLevel: courseData.difficultyLevel,
        primarySkill: courseData.primarySkill,
        learningObjective: courseData.learningObjective,
        prerequisites: courseData.prerequisites,
        modulesCount: courseData.modulesCount,
        imageProfile: courseData.imageProfile,
        marketReferences: courseData.marketReferences
      });

      const updated: CourseEbookData = {
        ...courseData,
        pedagogicalPlan: plan,
        updatedAt: Date.now()
      };
      persistCourseProject(updated);
    } catch (err) {
      console.error('Erro no planejamento pedagógico:', err);
    } finally {
      setIsPlanning(false);
    }
  };

  // 6. Geração de Conteúdo Didático das Aulas
  const handleGenerateAllLessons = async () => {
    if (!courseData.pedagogicalPlan) return;
    setIsGeneratingContent(true);
    setGenerationProgress(5);
    cancelGenerationRef.current = false;

    const plan = { ...courseData.pedagogicalPlan };
    const totalModules = plan.modules.length;
    let totalLessonsCount = 0;
    plan.modules.forEach(m => { totalLessonsCount += m.lessons.length; });

    let processedLessons = 0;
    let previousSummary = '';

    for (let mIdx = 0; mIdx < totalModules; mIdx++) {
      const mod = plan.modules[mIdx];
      for (let lIdx = 0; lIdx < mod.lessons.length; lIdx++) {
        if (cancelGenerationRef.current) break;

        const les = mod.lessons[lIdx];
        setGenerationStatus(`Escrevendo Aula ${lIdx + 1} do Módulo ${mIdx + 1}: "${les.title}"...`);

        try {
          const writtenLesson = await CoursePedagogicalService.writeDidacticLesson({
            courseTitle: plan.courseTitle,
            category: plan.themeCategory,
            difficultyLevel: plan.difficultyLevel,
            moduleNumber: mod.moduleNumber,
            moduleTitle: mod.title,
            lessonNumber: les.lessonNumber,
            lessonTitle: les.title,
            lessonObjective: les.objective,
            previousLessonSummary: previousSummary
          });

          // Monta o plano visual de imagens via Replicate
          writtenLesson.images = CourseVisualDirector.buildImagePlanForLesson(
            writtenLesson,
            plan.courseTitle,
            plan.themeCategory,
            courseData.imageProfile,
            courseData.visualStyle
          );

          mod.lessons[lIdx] = writtenLesson;
          previousSummary = writtenLesson.summary || writtenLesson.objective;
        } catch (err) {
          console.warn(`Erro na redação da aula ${les.title}:`, err);
        }

        processedLessons++;
        const pct = Math.round((processedLessons / totalLessonsCount) * 100);
        setGenerationProgress(pct);
      }
    }

    const updated: CourseEbookData = {
      ...courseData,
      pedagogicalPlan: plan,
      updatedAt: Date.now()
    };
    await persistCourseProject(updated);
    setIsGeneratingContent(false);
    setGenerationStatus('Todas as aulas e planos visuais foram gerados com sucesso!');
  };

  // 7. Geração de Imagens via Replicate FLUX.1 Schnell
  const handleGenerateReplicateImages = async () => {
    if (!courseData.pedagogicalPlan) return;
    setIsGeneratingImages(true);
    setImageProgress(5);

    const plan = { ...courseData.pedagogicalPlan };

    // 1. Gera Capa se ainda não tiver
    if (!courseData.coverImageUrl) {
      setGenerationStatus('Gerando capa do curso no Replicate (FLUX.1 Schnell)...');
      const coverPlan = CourseVisualDirector.buildCoverImagePlan(
        plan.courseTitle,
        plan.courseSubtitle,
        plan.themeCategory,
        courseData.visualStyle
      );
      const coverRes = await CourseVisualDirector.generateImage(coverPlan);
      if (coverRes.success && coverRes.imageUrl) {
        courseData.coverImageUrl = coverRes.imageUrl;
        courseData.coverImageDataUrl = coverRes.imageDataUrl;
      }
    }

    // 2. Gera Imagens das Aulas
    const allImagesToGen: CourseImagePlan[] = [];
    plan.modules.forEach(m => {
      m.lessons.forEach(l => {
        (l.images || []).forEach(img => {
          if (img.status !== 'completed') allImagesToGen.push(img);
        });
      });
    });

    let completed = 0;
    for (const imgPlan of allImagesToGen) {
      setGenerationStatus(`Gerando imagem Replicate: "${imgPlan.title}"...`);
      await CourseVisualDirector.generateImage(imgPlan);
      completed++;
      setImageProgress(Math.round((completed / (allImagesToGen.length || 1)) * 100));
    }

    const updated: CourseEbookData = {
      ...courseData,
      pedagogicalPlan: plan,
      coverImageUrl: courseData.coverImageUrl,
      coverImageDataUrl: courseData.coverImageDataUrl,
      updatedAt: Date.now()
    };
    await persistCourseProject(updated);
    setIsGeneratingImages(false);
    setGenerationStatus('Imagens concluídas pelo Replicate!');
  };

  // 8. Regeneração Granular de Imagem
  const handleRegenerateImage = async (imagePlan: CourseImagePlan) => {
    setRegeneratingImageId(imagePlan.id);
    await CourseVisualDirector.regenerateSingleImage(imagePlan);
    setRegeneratingImageId(null);
    if (courseData.pedagogicalPlan) {
      persistCourseProject({ ...courseData });
    }
  };

  // 9. Executar Auditoria
  const handleRunAudit = () => {
    if (!courseData.pedagogicalPlan) return;
    const report = CourseAuditorService.auditCourse(courseData.pedagogicalPlan);
    setAuditReport(report);
    persistCourseProject({
      ...courseData,
      auditReport: report,
      updatedAt: Date.now()
    });
  };

  // Auto-correção em 1 clique
  const handleAutoFix = (issueId: string) => {
    if (!courseData.pedagogicalPlan) return;
    const fixed = CourseAuditorService.autoFixIssue(courseData.pedagogicalPlan, issueId);
    if (fixed) {
      handleRunAudit();
    }
  };

  // 10. Exportação do PDF
  const handleExportPdf = () => {
    if (!courseData.pedagogicalPlan) return;
    CoursePdfExporter.downloadCoursePdf(courseData.pedagogicalPlan, {
      authorName: initialProject?.author || 'Especialista BookEngin',
      coverDataUrl: courseData.coverImageDataUrl || courseData.coverImageUrl
    });
  };

  // Stepper Config
  const stepsConfig = [
    { num: 1, label: 'Tema' },
    { num: 2, label: 'Mercado' },
    { num: 3, label: 'Público' },
    { num: 4, label: 'Estrutura' },
    { num: 5, label: 'Grade' },
    { num: 6, label: 'Conteúdo' },
    { num: 7, label: 'Imagens' },
    { num: 8, label: 'Editor' },
    { num: 9, label: 'Auditoria' },
    { num: 10, label: 'Exportar' }
  ];

  return (
    <div className="course-studio-wrapper">
      {/* 1. HEADER DO ESTÚDIO */}
      <header className="course-studio-header">
        <div className="course-header-left">
          <button className="btn-course-back" onClick={onBackToDashboard}>
            <ArrowLeft size={16} /> Voltar ao Painel
          </button>
          <div className="course-brand-title">
            <GraduationCap size={22} color="#f59e0b" />
            <div>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#ffffff' }}>
                Estúdio de E-books de Cursos
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8', display: 'block' }}>
                {courseData.themeTitle}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="course-badge-pill">FLUX.1 Schnell & Hotmart</span>
          <button
            className="btn-course-cta"
            onClick={() => persistCourseProject(courseData)}
            style={{ padding: '8px 14px', fontSize: 12 }}
          >
            Salvar Progresso
          </button>
        </div>
      </header>

      {/* 2. STEPPER COM 10 ETAPAS */}
      <nav className="course-stepper-bar">
        <div className="course-stepper-inner">
          {stepsConfig.map((s) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <button
                key={s.num}
                className={`step-item-pill ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => setCurrentStep(s.num)}
              >
                <span className="step-number-circle">
                  {isCompleted ? '✓' : s.num}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. CONTEÚDO PRINCIPAL (RENDERIZADO CONFORME ETAPA) */}
      <main className="course-studio-main">
        {/* ========================================================= */}
        {/* ETAPA 1: SELEÇÃO DE TEMA (CATÁLOGO COM 2.000+ OPÇÕES) */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <div className="course-card-section">
            <div className="course-card-header">
              <div>
                <h2>Etapa 1 — Selecione o Tema Profissional do Curso</h2>
                <p>
                  Explore mais de 2.000 temas didáticos organizados em 40 categorias com aplicação comercial comprovada.
                </p>
              </div>
              <button
                className="btn-course-secondary"
                onClick={() => setIsCustomThemeModalOpen(true)}
              >
                <Plus size={15} /> Inserir Tema Personalizado
              </button>
            </div>

            {/* Barra de Filtros */}
            <div className="theme-search-bar-row">
              <div className="theme-search-input-wrap">
                <Search size={16} className="theme-search-icon" />
                <input
                  type="text"
                  placeholder="Pesquisar por habilidade, ferramenta ou palavra-chave (ex: marcenaria, bolos, elétrica)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCatalogPage(1);
                  }}
                />
              </div>

              <select
                className="theme-filter-select"
                value={selectedCategoryFilter}
                onChange={(e) => {
                  setSelectedCategoryFilter(e.target.value);
                  setCatalogPage(1);
                }}
              >
                <option value="">Todas as 40 Categorias ({COURSE_CATEGORIES.length})</option>
                {COURSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                className="theme-filter-select"
                style={{ minWidth: 150 }}
                value={selectedLevelFilter}
                onChange={(e) => {
                  setSelectedLevelFilter(e.target.value as any);
                  setCatalogPage(1);
                }}
              >
                <option value="todos">Todos os Níveis</option>
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </select>
            </div>

            {/* Contagem */}
            <div style={{ marginBottom: 14, fontSize: 13, color: '#64748b' }}>
              Exibindo {searchResults.themes.length} de {searchResults.total} temas catalogados
            </div>

            {/* Grid de Temas */}
            <div className="themes-grid-cards">
              {searchResults.themes.map((theme) => {
                const isSelected = selectedThemeId === theme.id || courseData.themeTitle === theme.title;
                return (
                  <div
                    key={theme.id}
                    className={`theme-card-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectTheme(theme)}
                  >
                    <div>
                      <div className="theme-card-top-category">
                        <span className="theme-cat-tag">{theme.category}</span>
                        <span className="theme-level-tag">{theme.difficultyLevel}</span>
                      </div>
                      <h3 className="theme-card-title">{theme.title}</h3>
                      <p className="theme-card-desc">{theme.description}</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {theme.marketIndicators?.demandLevel === 'muito-alta' ? '🔥 Alta demanda' : '✓ Validado'}
                      </span>
                      <button
                        className="btn-course-secondary"
                        style={{
                          padding: '5px 12px',
                          fontSize: 12,
                          background: isSelected ? '#f59e0b' : '#ffffff',
                          color: isSelected ? '#0f172a' : '#0f172a',
                          fontWeight: 700
                        }}
                      >
                        {isSelected ? '✓ Selecionado' : 'Selecionar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            <div className="catalog-pagination-row">
              <button
                className="btn-page-nav"
                disabled={catalogPage <= 1}
                onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                Página {searchResults.page} de {searchResults.totalPages}
              </span>
              <button
                className="btn-page-nav"
                disabled={catalogPage >= searchResults.totalPages}
                onClick={() => setCatalogPage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>

            {/* Ações da Etapa */}
            <div className="course-actions-footer">
              <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>
                Tema Atual: <span style={{ color: '#0284c7' }}>{courseData.themeTitle}</span>
              </div>
              <button className="btn-course-cta" onClick={() => setCurrentStep(2)}>
                Avançar para Pesquisa de Mercado <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ETAPA 2: PESQUISA REAL DE MERCADO NA HOTMART */}
        {/* ========================================================= */}
        {currentStep === 2 && (
          <div className="course-card-section">
            <div className="course-card-header">
              <div>
                <h2>Etapa 2 — Pesquisa Real de Mercado na Hotmart</h2>
                <p>
                  Consulte referências comerciais reais e descubra o que o mercado procura para criar uma obra original e competitiva.
                </p>
              </div>
              <button
                className="btn-course-cta amber"
                onClick={handleTriggerMarketSearch}
                disabled={isSearchingMarket}
              >
                {isSearchingMarket ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                {isSearchingMarket ? 'Consultando Hotmart...' : 'Pesquisar na Hotmart'}
              </button>
            </div>

            {/* Alerta Ético e Legal */}
            <div className="ethical-disclaimer-box">
              <strong>Transparência e Conformidade de Dados:</strong> O BookEngin coleta apenas informações públicas acessíveis no marketplace da Hotmart (título, produtor, descrição pública e avaliações). Indicadores de faturamento e quantidade exata de vendas são confidenciais da plataforma e não são inventados. O objetivo desta análise é inspirar um curso autoral e original, sem copiar apostilas ou conteúdos de terceiros.
            </div>

            {/* Resumo da Oportunidade */}
            {marketAnalysis && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: '#166534' }}>
                  💡 Análise Estratégica de Oportunidades:
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#14532d', lineHeight: 1.6 }}>
                  {marketAnalysis.recurringNeeds?.map((need: string, idx: number) => (
                    <li key={idx}><strong>Demanda do Público:</strong> {need}</li>
                  ))}
                  {marketAnalysis.marketGaps?.map((gap: string, idx: number) => (
                    <li key={`gap_${idx}`}><strong>Lacuna no Mercado:</strong> {gap}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lista de Referências Reais da Hotmart */}
            {courseData.marketReferences.length > 0 ? (
              <div className="market-refs-grid">
                {courseData.marketReferences.map((ref) => (
                  <div key={ref.productId} className="market-ref-card">
                    <div className="ref-card-header">
                      {ref.avatarUrl && (
                        <img src={ref.avatarUrl} alt="" className="ref-avatar" />
                      )}
                      <div className="ref-info-text">
                        <h4>{ref.title}</h4>
                        <span className="ref-producer">Produtor: {ref.producerName}</span>
                        <div className="ref-metrics-pills">
                          <span className="ref-pill verified">
                            ★ {ref.verifiedData.publicRating} ({ref.verifiedData.publicReviewsCount} avaliações)
                          </span>
                          <span className="ref-pill">Cat: {ref.category}</span>
                          <span className="ref-pill confidential">Vendas: Confidencial</span>
                        </div>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                      {ref.description.slice(0, 160)}...
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <a
                        href={ref.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}
                      >
                        Ver na Hotmart <ExternalLink size={12} />
                      </a>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        Consulta: {new Date(ref.queryDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                <Search size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
                  Clique no botão acima para pesquisar referências comerciais da Hotmart para "{courseData.themeTitle}".
                </p>
              </div>
            )}

            {/* Ações da Etapa */}
            <div className="course-actions-footer">
              <button className="btn-course-secondary" onClick={() => setCurrentStep(1)}>
                <ArrowLeft size={16} /> Voltar ao Tema
              </button>
              <button className="btn-course-cta" onClick={() => setCurrentStep(3)}>
                Continuar para Definição do Público <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ETAPA 3: DEFINIR O PÚBLICO E DIRETRIZES DIDÁTICAS */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <div className="course-card-section">
            <div className="course-card-header">
              <div>
                <h2>Etapa 3 — Definição do Público-Alvo e Objetivos de Aprendizagem</h2>
                <p>Personalize o tom didático, pré-requisitos e a promessa central da capacitação.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Nome do Curso:
                </label>
                <input
                  type="text"
                  value={courseData.themeTitle}
                  onChange={(e) => persistCourseProject({ ...courseData, themeTitle: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Nível de Dificuldade:
                </label>
                <select
                  value={courseData.difficultyLevel}
                  onChange={(e) => persistCourseProject({ ...courseData, difficultyLevel: e.target.value as any })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                >
                  <option value="iniciante">Iniciante (Do zero absoluto)</option>
                  <option value="intermediario">Intermediário (Aperfeiçoamento técnico)</option>
                  <option value="avancado">Avançado (Especialização comercial)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Público-Alvo:
                </label>
                <input
                  type="text"
                  value={courseData.targetAudience}
                  onChange={(e) => persistCourseProject({ ...courseData, targetAudience: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Objetivo Central de Aprendizagem:
                </label>
                <textarea
                  rows={3}
                  value={courseData.learningObjective}
                  onChange={(e) => persistCourseProject({ ...courseData, learningObjective: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Conhecimento Prévio / Pré-Requisitos:
                </label>
                <input
                  type="text"
                  value={courseData.prerequisites}
                  onChange={(e) => persistCourseProject({ ...courseData, prerequisites: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Estilo de Linguagem / Tom:
                </label>
                <input
                  type="text"
                  value={courseData.toneStyle}
                  onChange={(e) => persistCourseProject({ ...courseData, toneStyle: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                />
              </div>
            </div>

            <div className="course-actions-footer">
              <button className="btn-course-secondary" onClick={() => setCurrentStep(2)}>
                <ArrowLeft size={16} /> Voltar
              </button>
              <button className="btn-course-cta" onClick={() => setCurrentStep(4)}>
                Avançar para Estrutura do Curso <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ETAPA 4: CONFIGURAÇÃO DA ESTRUTURA E PERFIL DE IMAGENS */}
        {/* ========================================================= */}
        {currentStep === 4 && (
          <div className="course-card-section">
            <div className="course-card-header">
              <div>
                <h2>Etapa 4 — Estrutura do Curso e Perfil de Ilustrações</h2>
                <p>Defina a quantidade de módulos, estilo visual e cobertura fotográfica com o Replicate.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 24 }}>
              {/* Quantidade de Módulos */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, background: '#ffffff' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800 }}>Quantidade de Módulos</h4>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>
                  Cada módulo agrupa 2 a 3 aulas práticas progressivas.
                </p>
                <select
                  value={courseData.modulesCount}
                  onChange={(e) => handleUpdateEstimates(courseData.imageProfile, Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                >
                  <option value={3}>3 Módulos (Curso Intensivo Rápido)</option>
                  <option value={4}>4 Módulos (Padrão Recomendado)</option>
                  <option value={5}>5 Módulos (Curso Completo)</option>
                  <option value={6}>6 Módulos (Formação Profissional Avançada)</option>
                </select>
              </div>

              {/* Perfil de Imagens Replicate */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, background: '#ffffff' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800 }}>Perfil Visual de Ilustrações</h4>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>
                  Determina a densidade de imagens práticas geradas pelo Replicate.
                </p>
                <select
                  value={courseData.imageProfile}
                  onChange={(e) => handleUpdateEstimates(e.target.value as any, courseData.modulesCount)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                >
                  <option value="economico">Econômico (1 ilustração essencial por aula)</option>
                  <option value="equilibrado">Equilibrado (2 ilustrações passo a passo por aula)</option>
                  <option value="ilustrado">Ilustrado (3+ ilustrações detalhadas de cada etapa)</option>
                </select>
              </div>

              {/* Estilo Visual de Arte */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, background: '#ffffff' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800 }}>Estilo Fotográfico do Replicate</h4>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>
                  Direção de arte aplicada ao modelo FLUX.1 Schnell.
                </p>
                <select
                  value={courseData.visualStyle}
                  onChange={(e) => persistCourseProject({ ...courseData, visualStyle: e.target.value as any })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                >
                  <option value="fotografia-tecnica-instrucional">Fotografia Técnica Instrucional (Padrão Manual)</option>
                  <option value="workshop-profissional-realista">Workshop e Oficina Realista</option>
                  <option value="estudio-culinario-iluminado">Estúdio Culinário / Gastronômico Iluminado</option>
                  <option value="macro-detalhes-passo-a-passo">Macro Detalhes e Close-Up de Ferramentas</option>
                  <option value="manual-didatico-moderno">Manual Didático Editorial Moderno</option>
                  <option value="diagrama-infografico-vetorial">Diagramação Técnica / Isométrica</option>
                </select>
              </div>
            </div>

            {/* Estimativa de Custos e Imagens Replicate */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={20} color="#0284c7" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>
                    Estimativa da API Replicate (FLUX.1 Schnell):
                  </h4>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {courseData.estimatedImagesCount} imagens previstas (Capa + Etapas Técnicas) • Custo estimado: ~US$ {courseData.estimatedReplicateCostUsd.toFixed(3)}
                  </span>
                </div>
              </div>

              <span style={{ fontSize: 11, color: '#059669', background: '#ecfdf5', padding: '4px 10px', borderRadius: 6, fontWeight: 700 }}>
                API Conectada via Backend Seguro
              </span>
            </div>

            <div className="course-actions-footer">
              <button className="btn-course-secondary" onClick={() => setCurrentStep(3)}>
                <ArrowLeft size={16} /> Voltar
              </button>
              <button className="btn-course-cta" onClick={() => setCurrentStep(5)}>
                Avançar para Planejamento da Grade <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ETAPA 5: PLANEJAMENTO PEDAGÓGICO DA GRADE */}
        {/* ========================================================= */}
        {currentStep === 5 && (
          <div className="course-card-section">
            <div className="course-card-header">
              <div>
                <h2>Etapa 5 — Planejamento Pedagógico (Grade Curricular)</h2>
                <p>Revise e ajuste os módulos e aulas planejadas antes de iniciar a escrita integral.</p>
              </div>
              <button
                className="btn-course-cta amber"
                onClick={handleGeneratePedagogicalPlan}
                disabled={isPlanning}
              >
                {isPlanning ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isPlanning ? 'Planejando Grade...' : (courseData.pedagogicalPlan ? 'Regerar Grade com IA' : 'Planejar Grade com IA')}
              </button>
            </div>

            {courseData.pedagogicalPlan ? (
              <div>
                <div style={{ marginBottom: 18, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>
                    {courseData.pedagogicalPlan.courseTitle}
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                    {courseData.pedagogicalPlan.courseSubtitle}
                  </p>
                </div>

                {courseData.pedagogicalPlan.modules.map((mod, mIdx) => (
                  <div key={mod.id || mIdx} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 14, background: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                        Módulo {mod.moduleNumber}: {mod.title}
                      </h4>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {mod.lessons.length} aulas planejadas
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {mod.lessons.map((les, lIdx) => (
                        <div key={les.id || lIdx} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '10px 14px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                              Aula {les.lessonNumber}: {les.title}
                            </span>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                              {les.objective}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                <BookOpen size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
                  Clique no botão acima para acionar o Agente de Planejamento Pedagógico e estruturar os módulos e aulas.
                </p>
              </div>
            )}

            <div className="course-actions-footer">
              <button className="btn-course-secondary" onClick={() => setCurrentStep(4)}>
                <ArrowLeft size={16} /> Voltar
              </button>
              <button
                className="btn-course-cta"
                disabled={!courseData.pedagogicalPlan}
                onClick={() => setCurrentStep(6)}
              >
                Avançar para Geração de Conteúdo <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ETAPA 6: GERAÇÃO DE CONTEÚDO DIDÁTICO */}
        {/* ========================================================= */}
        {currentStep === 6 && (
          <div className="course-card-section">
            <div className="course-card-header">
              <div>
                <h2>Etapa 6 — Geração do Conteúdo Didático das Aulas</h2>
                <p>O Agente de Escrita Didática redige as instruções passo a passo, materiais, dicas e exercícios.</p>
              </div>
            </div>

            <div style={{ padding: '24px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24, textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>
                {isGeneratingContent ? 'Produzindo Material Didático por Módulos...' : 'Pronto para Escrever as Aulas'}
              </h3>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>
                {generationStatus || 'Clique abaixo para gerar o texto integral das aulas com encadeamento de contexto pedagógico.'}
              </p>

              {/* Barra de Progresso */}
              <div style={{ width: '100%', height: 10, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ width: `${generationProgress}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #10b981)', transition: 'width 0.3s' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                {!isGeneratingContent ? (
                  <button className="btn-course-cta amber" onClick={handleGenerateAllLessons}>
                    <Play size={16} /> Iniciar Geração de Aulas
                  </button>
                ) : (
                  <button
                    className="btn-course-secondary"
                    onClick={() => { cancelGenerationRef.current = true; }}
                  >
                    Pausar Geração
                  </button>
                )}
              </div>
            </div>

            <div className="course-actions-footer">
              <button className="btn-course-secondary" onClick={() => setCurrentStep(5)}>
                <ArrowLeft size={16} /> Voltar
              </button>
              <button className="btn-course-cta" onClick={() => setCurrentStep(7)}>
                Avançar para Geração de Imagens <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ETAPA 7: GERAÇÃO DE IMAGENS VIA REPLICATE */}
        {/* ========================================================= */}
        {currentStep === 7 && (
          <div className="course-card-section">
            <div className="course-card-header">
              <div>
                <h2>Etapa 7 — Geração de Imagens Técnicas com Replicate</h2>
                <p>Todas as ilustrações didáticas são processadas oficialmente via API do Replicate (FLUX.1 Schnell).</p>
              </div>
              <button
                className="btn-course-cta amber"
                onClick={handleGenerateReplicateImages}
                disabled={isGeneratingImages}
              >
                {isGeneratingImages ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGeneratingImages ? 'Processando no Replicate...' : 'Gerar Imagens com Replicate'}
              </button>
            </div>

            <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  {generationStatus || 'Aguardando início da geração visual.'}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b' }}>
                  {imageProgress}%
                </span>
              </div>
              <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${imageProgress}%`, height: '100%', background: '#f59e0b', transition: 'width 0.3s' }} />
              </div>
            </div>

            {/* Capa Gerada (Prévia) */}
            {courseData.coverImageUrl && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800 }}>Capa Oficial Gerada:</h4>
                <div style={{ maxWidth: 280, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                  <img src={courseData.coverImageUrl} alt="Capa do Curso" style={{ width: '100%', display: 'block' }} />
                </div>
              </div>
            )}

            <div className="course-actions-footer">
              <button className="btn-course-secondary" onClick={() => setCurrentStep(6)}>
                <ArrowLeft size={16} /> Voltar
              </button>
              <button className="btn-course-cta" onClick={() => setCurrentStep(8)}>
                Avançar para Editor e Revisão <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ETAPA 8: EDITOR DE AULAS E IMAGENS (SPLIT-VIEW) */}
        {/* ========================================================= */}
        {currentStep === 8 && (
          <div className="course-card-section">
            <div className="course-card-header">
              <div>
                <h2>Etapa 8 — Editor e Revisão de Aulas e Imagens</h2>
                <p>Navegue pelos módulos, revise o conteúdo e regenere imagens individuais conforme necessário.</p>
              </div>
            </div>

            {courseData.pedagogicalPlan && courseData.pedagogicalPlan.modules.length > 0 ? (
              <div className="course-editor-split">
                {/* Lateral Esquerda: Módulos e Aulas */}
                <div className="editor-sidebar-modules">
                  {courseData.pedagogicalPlan.modules.map((mod, mIdx) => (
                    <div key={mod.id || mIdx} className="sidebar-module-group">
                      <div className="sidebar-module-title">
                        MÓDULO {mod.moduleNumber}: {mod.title.slice(0, 24)}...
                      </div>
                      {mod.lessons.map((les, lIdx) => {
                        const isSelected = activeModuleIndex === mIdx && activeLessonIndex === lIdx;
                        const hasImg = (les.images || []).some(i => i.status === 'completed' || Boolean(i.imageDataUrl || i.imageUrl));
                        return (
                          <button
                            key={les.id || lIdx}
                            className={`sidebar-lesson-btn ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              setActiveModuleIndex(mIdx);
                              setActiveLessonIndex(lIdx);
                            }}
                          >
                            <span>Aula {les.lessonNumber}: {les.title.slice(0, 20)}...</span>
                            <span style={{ fontSize: 10 }}>{hasImg ? '🖼️' : '📝'}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Área Central: Aula Ativa */}
                {(() => {
                  const activeMod = courseData.pedagogicalPlan.modules[activeModuleIndex] || courseData.pedagogicalPlan.modules[0];
                  const activeLes = activeMod?.lessons[activeLessonIndex] || activeMod?.lessons[0];
                  if (!activeLes) return <div>Nenhuma aula selecionada</div>;

                  return (
                    <div className="editor-content-area">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
                            Módulo {activeMod.moduleNumber} • Aula {activeLes.lessonNumber}
                          </span>
                          <h3 style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800 }}>
                            {activeLes.title}
                          </h3>
                        </div>
                      </div>

                      {/* Objetivo */}
                      <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, marginBottom: 16, border: '1px solid #e2e8f0' }}>
                        <strong style={{ fontSize: 12, color: '#0284c7' }}>Objetivo: </strong>
                        <span style={{ fontSize: 13, color: '#334155' }}>{activeLes.objective}</span>
                      </div>

                      {/* Explicação Didática */}
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800 }}>Explicação Didática:</h4>
                        <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                          {activeLes.didacticExplanation}
                        </p>
                      </div>

                      {/* Imagens Associadas à Aula */}
                      {activeLes.images && activeLes.images.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800 }}>Ilustrações da Aula:</h4>
                          {activeLes.images.map((img) => (
                            <div key={img.id} className="lesson-image-preview-card">
                              {img.imageDataUrl || img.imageUrl ? (
                                <img src={img.imageDataUrl || img.imageUrl} alt={img.title} />
                              ) : (
                                <div style={{ padding: 30, color: '#94a3b8', fontSize: 13 }}>
                                  Imagem ainda não gerada para esta etapa
                                </div>
                              )}
                              <div className="lesson-image-footer">
                                <span>{img.title}</span>
                                <button
                                  className="btn-course-secondary"
                                  style={{ padding: '4px 10px', fontSize: 11 }}
                                  disabled={regeneratingImageId === img.id}
                                  onClick={() => handleRegenerateImage(img)}
                                >
                                  {regeneratingImageId === img.id ? 'Gerando...' : 'Regenerar Imagem'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Passo a Passo */}
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800 }}>Instruções Passo a Passo:</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {activeLes.stepByStepInstructions?.map((step) => (
                            <div key={step.stepNumber} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#f8fafc' }}>
                              <strong style={{ fontSize: 13, color: '#0f172a' }}>
                                Passo {step.stepNumber}: {step.title}
                              </strong>
                              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
                                {step.instruction}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Exercício */}
                      {activeLes.exercise && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
                          <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: '#166534' }}>
                            Exercício: {activeLes.exercise.title}
                          </h4>
                          <p style={{ margin: 0, fontSize: 12.5, color: '#14532d' }}>
                            {activeLes.exercise.description}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div>Nenhum conteúdo disponível para edição</div>
            )}

            <div className="course-actions-footer">
              <button className="btn-course-secondary" onClick={() => setCurrentStep(7)}>
                <ArrowLeft size={16} /> Voltar
              </button>
              <button className="btn-course-cta" onClick={() => setCurrentStep(9)}>
                Avançar para Auditoria Automática <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ETAPA 9: AUDITORIA AUTOMÁTICA DE QUALIDADE E SEGURANÇA */}
        {/* ========================================================= */}
        {currentStep === 9 && (
          <div className="course-card-section">
            <div className="course-card-header">
              <div>
                <h2>Etapa 9 — Auditoria Automática de Qualidade e Segurança</h2>
                <p>Verificação de completude, sequência pedagógica, segurança técnica e imagens.</p>
              </div>
              <button className="btn-course-cta amber" onClick={handleRunAudit}>
                <Shield size={16} /> Executar Auditoria Completa
              </button>
            </div>

            {auditReport ? (
              <div>
                {/* Banner de Status */}
                <div className={`audit-report-banner ${auditReport.passed ? 'passed' : 'blocked'}`}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
                      Nota Geral de Qualidade: {auditReport.overallScore}/100
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                      {auditReport.summaryNote}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      {auditReport.criticalCount} Crítico(s) • {auditReport.warningCount} Alerta(s)
                    </span>
                  </div>
                </div>

                {/* Lista de Problemas Detectados */}
                <div className="audit-issues-list">
                  {auditReport.issues.map((iss) => (
                    <div key={iss.id} className="audit-issue-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {iss.severity === 'critico' ? (
                          <AlertCircle size={20} color="#dc2626" />
                        ) : iss.severity === 'atencao' ? (
                          <AlertTriangle size={20} color="#d97706" />
                        ) : (
                          <HelpCircle size={20} color="#0284c7" />
                        )}
                        <div>
                          <strong style={{ fontSize: 13, color: '#0f172a' }}>
                            {iss.description}
                          </strong>
                          <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>
                            Sugestão: {iss.suggestedFix}
                          </span>
                        </div>
                      </div>

                      <button
                        className="btn-course-secondary"
                        style={{ padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                        onClick={() => handleAutoFix(iss.id)}
                      >
                        Corrigir em 1 Clique
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                <Shield size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
                  Clique no botão acima para inspecionar todas as aulas e gerar o relatório de conformidade.
                </p>
              </div>
            )}

            <div className="course-actions-footer">
              <button className="btn-course-secondary" onClick={() => setCurrentStep(8)}>
                <ArrowLeft size={16} /> Voltar ao Editor
              </button>
              <button
                className="btn-course-cta"
                disabled={auditReport?.hasCriticalIssues}
                onClick={() => setCurrentStep(10)}
              >
                Avançar para Exportação do PDF <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ETAPA 10: EXPORTAÇÃO DO E-BOOK DIDÁTICO */}
        {/* ========================================================= */}
        {currentStep === 10 && (
          <div className="course-card-section">
            <div className="course-card-header">
              <div>
                <h2>Etapa 10 — Exportação do E-book de Curso em PDF</h2>
                <p>Gere o PDF didático final diagramado com capa, sumário, imagens do Replicate e checklists.</p>
              </div>
              <button className="btn-course-cta amber" onClick={handleExportPdf}>
                <Download size={16} /> Baixar E-book Completo em PDF
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <CheckCircle2 size={32} />
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>
                Seu Material Didático Está Pronto!
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', maxWidth: 500, marginInline: 'auto' }}>
                O e-book de <strong>"{courseData.themeTitle}"</strong> foi compilado com diagramação técnica, sumário multi-passe, ilustrações do Replicate e critérios pedagógicos completos.
              </p>

              <button className="btn-course-cta" style={{ margin: '0 auto' }} onClick={handleExportPdf}>
                <Download size={16} /> Baixar Arquivo em PDF
              </button>
            </div>

            <div className="course-actions-footer">
              <button className="btn-course-secondary" onClick={() => setCurrentStep(9)}>
                <ArrowLeft size={16} /> Voltar à Auditoria
              </button>
              <button className="btn-course-secondary" onClick={onBackToDashboard}>
                Concluir e Voltar ao Painel
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PARA INSERIR TEMA PERSONALIZADO */}
      {isCustomThemeModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 520, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 800 }}>Inserir Tema Personalizado</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Título do Curso:</label>
                <input
                  type="text"
                  placeholder="Ex: Como Fazer Joias em Prata 950 Artesanais"
                  value={customThemeInput.title}
                  onChange={(e) => setCustomThemeInput({ ...customThemeInput, title: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Categoria:</label>
                <select
                  value={customThemeInput.category}
                  onChange={(e) => setCustomThemeInput({ ...customThemeInput, category: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, marginTop: 4 }}
                >
                  {COURSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Público-Alvo:</label>
                <input
                  type="text"
                  placeholder="Ex: Iniciantes em joalheria de bancada"
                  value={customThemeInput.targetAudience}
                  onChange={(e) => setCustomThemeInput({ ...customThemeInput, targetAudience: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Nível:</label>
                <select
                  value={customThemeInput.difficultyLevel}
                  onChange={(e) => setCustomThemeInput({ ...customThemeInput, difficultyLevel: e.target.value as any })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, marginTop: 4 }}
                >
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn-course-secondary" onClick={() => setIsCustomThemeModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn-course-cta" onClick={handleSaveCustomTheme}>
                Adicionar e Selecionar Tema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
