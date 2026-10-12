import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ArrowRight, ArrowLeft, CheckCircle2, Download,
  Layers, Palette, Sparkles, RefreshCw, AlertCircle, FileText,
  Sliders, BookOpen, Grid3X3, Eye, ShieldCheck, Check, Globe, Wand2,
  Copy, CheckCheck, Star, Trash2, Plus, Info, ExternalLink
} from 'lucide-react';
import {
  PuzzleBookConfig,
  TrimSize,
  PaperColor,
  PuzzlesPerPage,
  SolutionsPerPage,
  TRIM_DIMENSIONS,
  CompilationResult,
  PuzzleLanguage,
  GeneratedPuzzleItem
} from '../../../modules/puzzles/types';
import { WordSearchEngine, WORD_THEMES_BY_LANG } from '../../../modules/puzzles/wordsearch-engine';
import { PuzzleInteriorPdfBuilder } from '../../../modules/puzzles/puzzle-interior-pdf-builder';
import { PuzzleCoverBuilder, I18N_COVER } from '../../../modules/puzzles/puzzle-cover-builder';
import { PuzzleBookCoordinator } from '../../../modules/puzzles/puzzle-book-coordinator';
import { PuzzleCoverAiService, PRESET_COVER_STYLES } from '../../../modules/puzzles/puzzle-cover-ai-service';
import {
  AMAZON_PUZZLE_BESTSELLERS,
  AmazonPuzzleBestseller,
  getBestsellersForLanguage
} from '../../../modules/puzzles/amazon-puzzle-bestsellers';
import { PuzzlePagePreviewer } from './PuzzlePagePreviewer';

interface Props {
  onBackToDashboard: () => void;
}

export interface CoverHistoryItem {
  id: string;
  url: string;
  prompt: string;
  createdAt: number;
  bestsellerTitle?: string;
}

const TEMPLATES_BY_LANG: Record<PuzzleLanguage, {
  title: string;
  subtitle: string;
  yearBadge: string;
  heroCountText: string;
  bannerTagText: string;
  backCoverSynopsis: string;
  backCoverBulletPoints: string[];
}> = {
  pt: {
    title: 'SUPER LIVRO DE PASSATEMPOS',
    subtitle: 'Sudoku, Caça-Palavras e Labirintos para Adultos e Idosos',
    yearBadge: 'NOVO 2026',
    heroCountText: '100+',
    bannerTagText: 'TEMAS VARIADOS PARA EXPLORAR',
    backCoverSynopsis: 'Estimule sua mente, aprimore o raciocínio lógico e divirta-se por horas com esta coletânea completa de Sudoku, Caça-Palavras e Labirintos. Diagramação em letras grandes para leitura confortável.',
    backCoverBulletPoints: [
      '✓ Mais de 100 desafios lógicos exclusivos',
      '✓ Letras grandes com máxima legibilidade',
      '✓ Sudoku com verificação de solução única',
      '✓ Respostas completas no final do livro'
    ]
  },
  en: {
    title: 'NEW WORD SEARCH & PUZZLE BOOK',
    subtitle: 'Large Print Word Find, Sudoku & Mazes for Adults & Seniors',
    yearBadge: 'NEW 2026',
    heroCountText: '10,000',
    bannerTagText: 'ENDLESS THEMES TO EXPLORE',
    backCoverSynopsis: 'Challenge your brain, improve memory and cognitive focus, and relax with this premium collection of Word Searches, Sudokus, and Mazes. Specially formatted with clear large print.',
    backCoverBulletPoints: [
      '✓ 100+ high-quality logic puzzles & games',
      '✓ Large print formatting for easy reading',
      '✓ Tested and verified unique Sudoku solutions',
      '✓ Complete answer keys in the back of the book'
    ]
  },
  es: {
    title: 'GRAN LIBRO DE PASATIEMPOS',
    subtitle: 'Sopa de Letras, Sudoku y Laberintos para Adultos y Mayores',
    yearBadge: 'NUEVO 2026',
    heroCountText: '10.000',
    bannerTagText: 'TEMAS ILIMITADOS PARA EXPLORAR',
    backCoverSynopsis: 'Estimula tu mente, mejora la memoria y relájate durante horas con esta cuidada selección de Sopas de Letras, Sudokus y Laberintos. Diagramado con letra grande para una lectura cómoda.',
    backCoverBulletPoints: [
      '✓ Más de 100 pasatiempos lógicos seleccionados',
      '✓ Tipografía en letra grande para máxima comodidad',
      '✓ Sudokus con garantía de solución única',
      '✓ Todas las respuestas y soluciones al final'
    ]
  }
};

export const PuzzleBookStudio: React.FC<Props> = ({ onBackToDashboard }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Configuração Geral do Livro
  const [config, setConfig] = useState<PuzzleBookConfig>({
    title: TEMPLATES_BY_LANG.pt.title,
    subtitle: TEMPLATES_BY_LANG.pt.subtitle,
    author: 'Leandro Palmeira',
    description: 'Livro de passatempos com Sudoku, Caça-Palavras e Labirintos para treino cognitivo e relaxamento.',
    language: 'pt',

    trimSize: '8.5x11',
    paperColor: 'white',

    sudokuFacilCount: 20,
    sudokuMedioCount: 20,
    sudokuDificilCount: 15,
    sudokuExtremoCount: 5,

    wordSearchCount: 20,
    wordSearchThemes: WORD_THEMES_BY_LANG.pt.slice(0, 6).map(t => t.themeName),
    wordSearchGridSize: 15,

    mazeCount: 20,
    mazeDifficulty: 'medio',

    puzzlesPerPage: 2,
    solutionsPerPage: 6,

    // Estilo Amazon Bestseller (Vinho Carmim com iluminação de estúdio)
    coverPrimaryColor: PRESET_COVER_STYLES[0].palettePrimary,
    coverSecondaryColor: PRESET_COVER_STYLES[0].paletteSecondary,
    coverAccentColor: PRESET_COVER_STYLES[0].paletteAccent,
    coverTextColor: '#ffffff',
    coverStyleTheme: 'modern-bold',
    coverBadgeText: '★ EDIÇÃO ESPECIAL KDP • GABARITO INCLUÍDO ★',
    yearBadge: TEMPLATES_BY_LANG.pt.yearBadge,
    heroCountText: TEMPLATES_BY_LANG.pt.heroCountText,
    bannerTagText: TEMPLATES_BY_LANG.pt.bannerTagText,
    largePrintBadge: true,
    coverIllustrationUrl: undefined,
    coverPrompt: undefined,

    backCoverSynopsis: TEMPLATES_BY_LANG.pt.backCoverSynopsis,
    backCoverBulletPoints: TEMPLATES_BY_LANG.pt.backCoverBulletPoints
  });

  // Referência de Bestseller Amazon & Palavras-chave
  const [selectedBestseller, setSelectedBestseller] = useState<AmazonPuzzleBestseller>(
    () => AMAZON_PUZZLE_BESTSELLERS[0]
  );
  const [copiedKeywords, setCopiedKeywords] = useState(false);

  // Histórico de Capas Geradas com IA
  const [coverHistory, setCoverHistory] = useState<CoverHistoryItem[]>([]);
  const [activeCoverHistoryId, setActiveCoverHistoryId] = useState<string | null>(null);

  // Gatilho de re-render do canvas quando imagem externa terminar de baixar
  const [coverRefreshTrigger, setCoverRefreshTrigger] = useState(0);

  // Estado do Canvas e Preview da Capa
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showCoverGuides, setShowCoverGuides] = useState(false);

  // Estado da Geração de Capa com IA (Replicate)
  const [isGeneratingAiCover, setIsGeneratingAiCover] = useState(false);
  const [aiPromptCustom, setAiPromptCustom] = useState(() => selectedBestseller.replicatePrompt);
  const [aiError, setAiError] = useState<string | null>(null);

  // Estado da Compilação Final & Progresso em Tempo Real
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationProgress, setCompilationProgress] = useState(0);
  const [compilationStatus, setCompilationStatus] = useState('');
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);
  const [compilationError, setCompilationError] = useState<string | null>(null);

  // Estado do Visualizador Interativo de Páginas
  const [previewPuzzles, setPreviewPuzzles] = useState<GeneratedPuzzleItem[]>([]);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Troca de Idioma e Atualização de Metadados
  const handleLanguageChange = (newLang: PuzzleLanguage) => {
    const t = TEMPLATES_BY_LANG[newLang] || TEMPLATES_BY_LANG.pt;
    const langThemes = WORD_THEMES_BY_LANG[newLang] || WORD_THEMES_BY_LANG.pt;
    const matchingBestsellers = getBestsellersForLanguage(newLang);
    const newBestseller = matchingBestsellers[0] || AMAZON_PUZZLE_BESTSELLERS[0];

    const updatedConfig: PuzzleBookConfig = {
      ...config,
      language: newLang,
      title: t.title,
      subtitle: t.subtitle,
      yearBadge: t.yearBadge,
      heroCountText: t.heroCountText,
      bannerTagText: t.bannerTagText,
      backCoverSynopsis: t.backCoverSynopsis,
      backCoverBulletPoints: t.backCoverBulletPoints,
      wordSearchThemes: langThemes.slice(0, 6).map(th => th.themeName),
      coverPrimaryColor: newBestseller.palettePrimary,
      coverSecondaryColor: newBestseller.paletteSecondary,
      coverAccentColor: newBestseller.paletteAccent
    };

    setConfig(updatedConfig);
    setSelectedBestseller(newBestseller);
    setAiPromptCustom(newBestseller.replicatePrompt || PuzzleCoverAiService.buildReplicatePrompt(updatedConfig));

    // Atualiza preview dos puzzles no novo idioma
    try {
      const updatedPuzzles = PuzzleBookCoordinator.generateAllPuzzles(updatedConfig);
      setPreviewPuzzles(updatedPuzzles);
    } catch (e) {
      console.warn('Erro ao atualizar amostra:', e);
    }
  };

  // Cálculo de páginas estimadas em tempo real
  const totalPuzzles =
    config.sudokuFacilCount +
    config.sudokuMedioCount +
    config.sudokuDificilCount +
    config.sudokuExtremoCount +
    config.wordSearchCount +
    config.mazeCount;

  const estimatedPages = PuzzleInteriorPdfBuilder.estimateTotalPages(config);
  const isKdpCompliant = estimatedPages >= 24;

  // Gera amostra inicial de puzzles para o visualizador
  useEffect(() => {
    if (previewPuzzles.length === 0) {
      try {
        const initial = PuzzleBookCoordinator.generateAllPuzzles(config);
        setPreviewPuzzles(initial);
      } catch (e) {
        console.warn('Falha ao gerar amostra inicial:', e);
      }
    }
  }, []);

  // Atualiza amostra manual de puzzles
  const handleRefreshPreviewPuzzles = () => {
    setIsGeneratingPreview(true);
    try {
      const refreshed = PuzzleBookCoordinator.generateAllPuzzles(config);
      setPreviewPuzzles(refreshed);
    } catch (err) {
      console.error('Erro ao atualizar preview dos puzzles:', err);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Renderiza o Canvas de Preview da Capa
  useEffect(() => {
    if (currentStep === 3 && canvasRef.current) {
      const specs = PuzzleCoverBuilder.calculateCoverSpecs(config, estimatedPages);
      PuzzleCoverBuilder.renderCoverToCanvas(
        canvasRef.current,
        config,
        specs,
        showCoverGuides,
        () => setCoverRefreshTrigger(prev => prev + 1)
      );
    }
  }, [currentStep, config, estimatedPages, showCoverGuides, coverRefreshTrigger]);

  // Função para Gerar Arte de Capa com IA Replicate
  const handleGenerateReplicateCover = async () => {
    setIsGeneratingAiCover(true);
    setAiError(null);
    try {
      const imageUrl = await PuzzleCoverAiService.generateCoverArtWithReplicate(config, aiPromptCustom);
      const newCoverItem: CoverHistoryItem = {
        id: `cover-${Date.now()}`,
        url: imageUrl,
        prompt: aiPromptCustom,
        createdAt: Date.now(),
        bestsellerTitle: selectedBestseller.title
      };

      setCoverHistory(prev => [newCoverItem, ...prev]);
      setActiveCoverHistoryId(newCoverItem.id);
      setConfig(prev => ({ ...prev, coverIllustrationUrl: imageUrl }));
    } catch (err: any) {
      console.error('Erro na geração da capa com Replicate:', err);
      setAiError(err?.message || 'Falha ao conectar à API do Replicate.');
    } finally {
      setIsGeneratingAiCover(false);
    }
  };

  const handleSelectHistoryCover = (item: CoverHistoryItem) => {
    setActiveCoverHistoryId(item.id);
    setConfig(prev => ({ ...prev, coverIllustrationUrl: item.url }));
  };

  const handleRemoveCoverArt = () => {
    setActiveCoverHistoryId(null);
    setConfig(prev => ({ ...prev, coverIllustrationUrl: undefined }));
  };

  const handleDeleteHistoryCover = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = coverHistory.filter(c => c.id !== id);
    setCoverHistory(remaining);
    if (activeCoverHistoryId === id) {
      if (remaining.length > 0) {
        setActiveCoverHistoryId(remaining[0].id);
        setConfig(prev => ({ ...prev, coverIllustrationUrl: remaining[0].url }));
      } else {
        setActiveCoverHistoryId(null);
        setConfig(prev => ({ ...prev, coverIllustrationUrl: undefined }));
      }
    }
  };

  const handleSelectBestseller = (bs: AmazonPuzzleBestseller) => {
    setSelectedBestseller(bs);
    setAiPromptCustom(bs.replicatePrompt);
    setConfig(prev => ({
      ...prev,
      coverPrimaryColor: bs.palettePrimary,
      coverSecondaryColor: bs.paletteSecondary,
      coverAccentColor: bs.paletteAccent
    }));
  };

  const handleCopyKeywords = () => {
    if (!selectedBestseller.keywords || selectedBestseller.keywords.length === 0) return;
    const textToCopy = selectedBestseller.keywords.join(', ');
    navigator.clipboard.writeText(textToCopy);
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2500);
  };

  // Compilação do Livro Completo com Rastreamento em Tempo Real
  const handleStartCompilation = async () => {
    setIsCompiling(true);
    setCompilationProgress(0);
    setCompilationStatus('Iniciando compilação matemática e vetorial KDP...');
    setCompilationError(null);
    setCompilationResult(null);

    try {
      // 1. Gera puzzles e atualiza o estado para permitir visualização de todas as páginas
      const generated = PuzzleBookCoordinator.generateAllPuzzles(config, (percent, status) => {
        setCompilationProgress(percent);
        setCompilationStatus(status);
      });
      setPreviewPuzzles(generated);

      // 2. Compila PDF do Miolo e da Capa
      const result = await PuzzleBookCoordinator.compileFullBook(config, (percent, status) => {
        setCompilationProgress(percent);
        setCompilationStatus(status);
      });
      setCompilationResult(result);
    } catch (err: any) {
      console.error('Erro durante a compilação do livro de puzzles:', err);
      setCompilationError(err?.message || 'Erro inesperado na geração do livro KDP.');
    } finally {
      setIsCompiling(false);
    }
  };

  // Downloads
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadInterior = () => {
    if (!compilationResult) return;
    const safeTitle = config.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    downloadBlob(compilationResult.interiorBlob, `${safeTitle}_interior_kdp.pdf`);
  };

  const handleDownloadCover = () => {
    if (!compilationResult) return;
    const safeTitle = config.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    downloadBlob(compilationResult.coverBlob, `${safeTitle}_cover_kdp.pdf`);
  };

  const handleDownloadZip = async () => {
    if (!compilationResult) return;
    const safeTitle = config.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const zipBlob = await PuzzleBookCoordinator.createZipPackage(compilationResult, config.title);
    downloadBlob(zipBlob, `${safeTitle}_kdp_pacote_completo.zip`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      {/* 1. TOP BAR DO ESTÚDIO (TEMA CLARO & ELEGANTE) */}
      <header style={{
        padding: '16px 28px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onBackToDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronLeft size={16} /> Voltar à Dashboard
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}>
              <Grid3X3 size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                Puzzle & Sudoku Book Engine Pro
              </h1>
              <span style={{ fontSize: 12, color: '#0284c7', fontWeight: 700 }}>
                Gerador de Livros de Passatempos • Formatos Bestseller Amazon KDP
              </span>
            </div>
          </div>
        </div>

        {/* BADGES DE CONFORMIDADE KDP & REPLICATE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            background: '#fffbeb',
            color: '#b45309',
            border: '1px solid #fde68a',
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <Sparkles size={14} color="#d97706" /> REPLICATE AI COVERS
          </span>

          <span style={{
            background: '#ecfdf5',
            color: '#059669',
            border: '1px solid #a7f3d0',
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <ShieldCheck size={14} color="#059669" /> KDP PRINT-READY (300 DPI)
          </span>
        </div>
      </header>

      {/* 2. BARRA DE ETAPAS (WIZARD DE 4 PASSOS EM TEMA CLARO) */}
      <nav style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        overflowX: 'auto',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
      }}>
        {[
          { step: 1, label: '1. Idioma & Formato KDP' },
          { step: 2, label: '2. Puzzles & Prévia das Páginas' },
          { step: 3, label: '3. Capa Bestseller & Replicate' },
          { step: 4, label: '4. Compilação & Download' }
        ].map(item => {
          const isActive = currentStep === item.step;
          const isPassed = currentStep > item.step;
          return (
            <button
              key={item.step}
              onClick={() => setCurrentStep(item.step as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: isActive
                  ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                  : (isPassed ? '#ecfdf5' : '#f8fafc'),
                color: isActive ? '#ffffff' : (isPassed ? '#059669' : '#64748b'),
                border: isActive
                  ? '1px solid #0284c7'
                  : (isPassed ? '1px solid #a7f3d0' : '1px solid #e2e8f0'),
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 8px rgba(2, 132, 199, 0.25)' : 'none'
              }}
            >
              {isPassed ? <Check size={14} /> : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. CONTEÚDO PRINCIPAL DO PASSO */}
      <main style={{ flex: 1, padding: '28px', maxWidth: 1260, width: '100%', margin: '0 auto' }}>
        {/* ======================================================== */}
        {/* PASSO 1: IDIOMA, FORMATO E METADADOS */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px', color: '#0f172a' }}>
                Passo 1: Idioma do Livro & Formato Físico KDP
              </h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                Selecione o idioma de publicação (Português, Inglês ou Espanhol) e as dimensões físicas dos livros mais bem vendidos na Amazon KDP.
              </p>
            </div>

            {/* SELETOR DE IDIOMA EM DESTAQUE */}
            <div style={{
              background: '#ffffff',
              border: '2px solid #bae6fd',
              borderRadius: 14,
              padding: 22,
              boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Globe size={22} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                  Escolha o Idioma do Livro (Miolo + Capa + Puzzles):
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {[
                  { code: 'pt' as PuzzleLanguage, flag: '🇧🇷', name: 'Português (Brasil)', desc: 'Caça-palavras e regras em Português' },
                  { code: 'en' as PuzzleLanguage, flag: '🇺🇸', name: 'English (US / UK)', desc: 'Word search and instructions in English' },
                  { code: 'es' as PuzzleLanguage, flag: '🇪🇸', name: 'Español', desc: 'Sopa de letras e instrucciones en Español' }
                ].map(lang => {
                  const isSelected = config.language === lang.code;
                  return (
                    <div
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      style={{
                        border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: isSelected ? '#f0f9ff' : '#ffffff',
                        padding: '16px 18px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 10px rgba(2, 132, 199, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 30 }}>{lang.flag}</span>
                        <div>
                          <strong style={{ display: 'block', fontSize: 15, color: isSelected ? '#0284c7' : '#0f172a' }}>
                            {lang.name}
                          </strong>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{lang.desc}</span>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 size={22} color="#0284c7" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FORMATO FÍSICO E COR DO PAPEL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* Trim Size (FORMATOS MAIS BEM VENDIDOS NA AMAZON) */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: 22,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Dimensões de Impressão (Trim Size):
                  </label>
                  <span style={{
                    fontSize: 11,
                    background: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontWeight: 800
                  }}>
                    Padrão Amazon KDP
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(['8.5x11', '6x9', '8.25x11'] as TrimSize[]).map(size => {
                    const info = TRIM_DIMENSIONS[size];
                    const selected = config.trimSize === size;
                    const isBestseller = size === '8.5x11';
                    return (
                      <div
                        key={size}
                        onClick={() => setConfig({ ...config, trimSize: size })}
                        style={{
                          border: selected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          background: selected ? '#f0f9ff' : (isBestseller ? '#fafafa' : '#ffffff'),
                          padding: '14px 16px',
                          borderRadius: 10,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s ease',
                          boxShadow: selected ? '0 2px 10px rgba(2, 132, 199, 0.15)' : 'none'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 900, color: selected ? '#0284c7' : '#0f172a', fontSize: 14 }}>
                              {info.name}
                            </span>
                            {isBestseller && (
                              <span style={{
                                fontSize: 10,
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: '#ffffff',
                                fontWeight: 900,
                                padding: '2px 8px',
                                borderRadius: 999,
                                letterSpacing: '0.04em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                ⭐ #1 MAIS VENDIDO NA AMAZON (85% das vendas)
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                            {size === '8.5x11'
                              ? 'Formato líder absoluto em vendas de livros de passatempos na Amazon KDP (Letras Grandes / Large Print para adultos e idosos).'
                              : (size === '6x9'
                                ? '#2 Mais vendido: Formato de Bolso / Viagem (Trade edition portátil).'
                                : 'Formato especial para edições de colecionador e revistas encadernadas.')}
                          </span>
                        </div>
                        {selected && <CheckCircle2 size={22} color="#0284c7" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cor do Papel */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: 22,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}>
                <label style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 12 }}>
                  Cor do Papel do Miolo (Interior KDP):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div
                    onClick={() => setConfig({ ...config, paperColor: 'white' })}
                    style={{
                      border: config.paperColor === 'white' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: config.paperColor === 'white' ? '#f0f9ff' : '#ffffff',
                      padding: 16,
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ width: 34, height: 34, background: '#ffffff', borderRadius: 8, margin: '0 auto 8px', border: '1.5px solid #cbd5e1' }} />
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', display: 'block' }}>Papel Branco</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Maior contraste e nitidez B&W (Recomendado)</span>
                  </div>

                  <div
                    onClick={() => setConfig({ ...config, paperColor: 'cream' })}
                    style={{
                      border: config.paperColor === 'cream' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: config.paperColor === 'cream' ? '#f0f9ff' : '#ffffff',
                      padding: 16,
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ width: 34, height: 34, background: '#fef3c7', borderRadius: 8, margin: '0 auto 8px', border: '1.5px solid #fde68a' }} />
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', display: 'block' }}>Papel Creme</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Aspecto clássico e leitura suave</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadados: Título, Subtítulo e Autor */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: 24,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: '0 0 16px', color: '#0f172a' }}>
                Metadados do Livro para Amazon KDP ({config.language.toUpperCase()})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                    Título Principal:
                  </label>
                  <input
                    type="text"
                    value={config.title}
                    onChange={e => setConfig({ ...config, title: e.target.value })}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', color: '#0f172a', fontSize: 14, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                    Subtítulo do Livro:
                  </label>
                  <input
                    type="text"
                    value={config.subtitle}
                    onChange={e => setConfig({ ...config, subtitle: e.target.value })}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', color: '#0f172a', fontSize: 14, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                    Nome do Autor / Marca Editorial:
                  </label>
                  <input
                    type="text"
                    value={config.author}
                    onChange={e => setConfig({ ...config, author: e.target.value })}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', color: '#0f172a', fontSize: 14, outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* BOTÃO AVANÇAR */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                onClick={() => setCurrentStep(2)}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '13px 26px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                }}
              >
                Avançar para Seleção de Puzzles & Páginas <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PASSO 2: SELEÇÃO DE PUZZLES E VISUALIZADOR DE PÁGINAS */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px', color: '#0f172a' }}>
                  Passo 2: Configuração dos Puzzles & Visualização de Páginas ({config.language.toUpperCase()})
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                  Personalize as quantidades de cada desafio e folheie as páginas do livro em tempo real com diagramação KDP.
                </p>
              </div>

              <button
                onClick={handleRefreshPreviewPuzzles}
                disabled={isGeneratingPreview}
                style={{
                  background: '#ffffff',
                  color: '#0284c7',
                  border: '1px solid #0284c7',
                  borderRadius: 8,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <RefreshCw size={14} className={isGeneratingPreview ? 'animate-spin' : ''} />
                {isGeneratingPreview ? 'Atualizando Páginas...' : 'Atualizar Amostra das Páginas'}
              </button>
            </div>

            {/* VISUALIZADOR REAL DE PÁGINAS DO LIVRO (NO TOPO / DESTAQUE) */}
            <PuzzlePagePreviewer
              config={config}
              puzzles={previewPuzzles}
              currentPage={previewPage}
              totalPages={estimatedPages}
              onPageChange={setPreviewPage}
              showGuidesDefault={false}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              {/* CONTROLES DOS PUZZLES */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 1. Sudoku Controls */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 22,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Grid3X3 size={20} color="#0284c7" />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                      Sudokus (Solução Única Garantida e Verificada)
                    </h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, fontWeight: 700 }}>Fácil (36-40 pistas):</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={config.sudokuFacilCount}
                        onChange={e => setConfig({ ...config, sudokuFacilCount: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', color: '#0f172a', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, fontWeight: 700 }}>Médio (30-35 pistas):</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={config.sudokuMedioCount}
                        onChange={e => setConfig({ ...config, sudokuMedioCount: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', color: '#0f172a', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, fontWeight: 700 }}>Difícil (26-29 pistas):</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={config.sudokuDificilCount}
                        onChange={e => setConfig({ ...config, sudokuDificilCount: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', color: '#0f172a', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, fontWeight: 700 }}>Extremo (22-25 pistas):</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={config.sudokuExtremoCount}
                        onChange={e => setConfig({ ...config, sudokuExtremoCount: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', color: '#0f172a', fontSize: 14 }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Caça-Palavras Controls */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 22,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <FileText size={20} color="#059669" />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                      Caça-Palavras ({config.language === 'en' ? 'Word Search' : (config.language === 'es' ? 'Sopa de Letras' : 'Caça-Palavras')})
                    </h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, fontWeight: 700 }}>Quantidade de Puzzles:</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={config.wordSearchCount}
                        onChange={e => setConfig({ ...config, wordSearchCount: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', color: '#0f172a', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, fontWeight: 700 }}>Tamanho da Grade:</label>
                      <select
                        value={config.wordSearchGridSize}
                        onChange={e => setConfig({ ...config, wordSearchGridSize: parseInt(e.target.value) as any })}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', color: '#0f172a', fontSize: 14 }}
                      >
                        <option value={15}>15 x 15 (Padrão Equilibrado)</option>
                        <option value={18}>18 x 18 (Médio Desafiador)</option>
                        <option value={20}>20 x 20 (Grande / Letras Densas)</option>
                      </select>
                    </div>
                  </div>

                  {/* Temas selecionáveis no idioma corrente */}
                  <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 8, fontWeight: 700 }}>
                    Temas Selecionados ({config.language === 'en' ? 'Inglês' : (config.language === 'es' ? 'Espanhol' : 'Português')}):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(WORD_THEMES_BY_LANG[config.language] || WORD_THEMES_BY_LANG.pt).map(theme => {
                      const isSelected = config.wordSearchThemes.includes(theme.themeName);
                      return (
                        <button
                          key={theme.themeName}
                          onClick={() => {
                            const updated = isSelected
                              ? config.wordSearchThemes.filter(t => t !== theme.themeName)
                              : [...config.wordSearchThemes, theme.themeName];
                            setConfig({ ...config, wordSearchThemes: updated });
                          }}
                          style={{
                            background: isSelected ? '#ecfdf5' : '#f8fafc',
                            color: isSelected ? '#059669' : '#64748b',
                            border: isSelected ? '1px solid #10b981' : '1px solid #cbd5e1',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}{theme.themeName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Labirintos Controls */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 22,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Layers size={20} color="#d97706" />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                      Labirintos (Resolução Vetorial DFS)
                    </h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, fontWeight: 700 }}>Quantidade de Labirintos:</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={config.mazeCount}
                        onChange={e => setConfig({ ...config, mazeCount: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', color: '#0f172a', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, fontWeight: 700 }}>Nível de Complexidade:</label>
                      <select
                        value={config.mazeDifficulty}
                        onChange={e => setConfig({ ...config, mazeDifficulty: e.target.value as any })}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', color: '#0f172a', fontSize: 14 }}
                      >
                        <option value="facil">Fácil (Grade 13x13)</option>
                        <option value="medio">Médio (Grade 17x17)</option>
                        <option value="dificil">Difícil (Grade 23x23)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Diagramação do Layout */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 22,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Sliders size={20} color="#7c3aed" />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                      Diagramação & Distribuição nas Páginas
                    </h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, fontWeight: 700 }}>Puzzles por Página:</label>
                      <select
                        value={config.puzzlesPerPage}
                        onChange={e => setConfig({ ...config, puzzlesPerPage: parseInt(e.target.value) as PuzzlesPerPage })}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', color: '#0f172a', fontSize: 14 }}
                      >
                        <option value={1}>1 por página (Letras Grandes / Máxima Legibilidade)</option>
                        <option value={2}>2 por página (Mais Econômico e Equilibrado)</option>
                        <option value={4}>4 por página (Ultra Compacto / Minibook)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, fontWeight: 700 }}>Soluções / Gabarito por Página:</label>
                      <select
                        value={config.solutionsPerPage}
                        onChange={e => setConfig({ ...config, solutionsPerPage: parseInt(e.target.value) as SolutionsPerPage })}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', color: '#0f172a', fontSize: 14 }}
                      >
                        <option value={4}>4 por página</option>
                        <option value={6}>6 por página (Recomendado KDP)</option>
                        <option value={9}>9 por página</option>
                        <option value={12}>12 por página (Máxima Economia de Impressão)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* RESUMO EM TEMPO REAL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  background: '#ffffff',
                  border: isKdpCompliant ? '2px solid #10b981' : '2px solid #f59e0b',
                  borderRadius: 14,
                  padding: 22,
                  boxShadow: isKdpCompliant ? '0 4px 16px rgba(16, 185, 129, 0.12)' : 'none'
                }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 900, color: '#0f172a' }}>
                    Auditoria KDP em Tempo Real
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#64748b' }}>Total de Puzzles:</span>
                      <strong style={{ color: '#0f172a' }}>{totalPuzzles}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#64748b' }}>Páginas de Puzzles:</span>
                      <strong style={{ color: '#0f172a' }}>{Math.ceil(totalPuzzles / config.puzzlesPerPage)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#64748b' }}>Páginas de Soluções:</span>
                      <strong style={{ color: '#0f172a' }}>{Math.ceil(totalPuzzles / config.solutionsPerPage)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#64748b' }}>Folha de Rosto & Regras:</span>
                      <strong style={{ color: '#0f172a' }}>2 págs</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#64748b' }}>Divisória de Gabarito:</span>
                      <strong style={{ color: '#0f172a' }}>1 pág</strong>
                    </div>

                    <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>Total Final do Livro:</span>
                      <strong style={{ color: '#0284c7', fontSize: 19 }}>{estimatedPages} págs</strong>
                    </div>
                  </div>

                  {isKdpCompliant ? (
                    <div style={{
                      background: '#ecfdf5',
                      border: '1px solid #10b981',
                      borderRadius: 8,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#059669',
                      fontSize: 12,
                      fontWeight: 700
                    }}>
                      <CheckCircle2 size={16} />
                      <span>Conforme com o mínimo KDP (24 páginas)!</span>
                    </div>
                  ) : (
                    <div style={{
                      background: '#fffbeb',
                      border: '1px solid #f59e0b',
                      borderRadius: 8,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#b45309',
                      fontSize: 12,
                      fontWeight: 700
                    }}>
                      <AlertCircle size={16} />
                      <span>Mínimo 24 páginas KDP complementado com páginas de anotações.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BOTÕES NAVEGAÇÃO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <button
                onClick={() => setCurrentStep(1)}
                style={{
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <ArrowLeft size={16} /> Voltar ao Formato
              </button>

              <button
                onClick={() => setCurrentStep(3)}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                }}
              >
                Avançar para Capa Bestseller com IA <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PASSO 3: DESIGN DA CAPA BESTSELLER & IA REPLICATE */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px', color: '#0f172a' }}>
                Passo 3: Capa Bestseller Amazon KDP & Geração com IA (Replicate)
              </h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                Layout profissional inspirado nos maiores best-sellers da Amazon com tipografia hierárquica, efeito de livro aberto 3D e renderização via Replicate.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: 24 }}>
              {/* CONTROLES DA CAPA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* 1. REFERÊNCIA BESTSELLER AMAZON (KDP TOP RANKED) */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 18,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Star size={18} color="#d97706" fill="#f59e0b" />
                      <strong style={{ fontSize: 14, color: '#0f172a' }}>Referência Bestseller Amazon:</strong>
                    </div>
                    <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 4, fontWeight: 800 }}>
                      KDP Top Ranked
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px', lineHeight: 1.4 }}>
                    Selecione o best-seller do mesmo nicho para absorver a identidade visual de sucesso, paleta cromática e prompt editorial de IA:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {getBestsellersForLanguage(config.language).map(bs => {
                      const isSelected = selectedBestseller.id === bs.id;
                      return (
                        <div
                          key={bs.id}
                          onClick={() => handleSelectBestseller(bs)}
                          style={{
                            background: isSelected ? '#f0f9ff' : '#f8fafc',
                            border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                            borderRadius: 8,
                            padding: '10px 12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <div>
                              <span style={{
                                fontSize: 10,
                                background: '#78350f',
                                color: '#fef3c7',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontWeight: 800,
                                marginRight: 6
                              }}>
                                {bs.badge}
                              </span>
                              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>ASIN: {bs.asin}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 3 }}>
                              <span style={{ width: 12, height: 12, borderRadius: '50%', background: bs.palettePrimary, display: 'inline-block' }} />
                              <span style={{ width: 12, height: 12, borderRadius: '50%', background: bs.paletteSecondary, display: 'inline-block' }} />
                              <span style={{ width: 12, height: 12, borderRadius: '50%', background: bs.paletteAccent, display: 'inline-block' }} />
                            </div>
                          </div>

                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
                            {bs.title}
                          </div>
                          <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.3 }}>
                            {bs.subtitle}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 11, color: '#d97706' }}>
                            <span>★ {bs.rating} ({bs.reviewsCount.toLocaleString()} avaliações)</span>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{ color: '#64748b' }}>Estilo: {bs.coverVisualTheme}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. PALAVRAS-CHAVE DO BESTSELLER PARA O KDP */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 16,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={16} color="#059669" />
                      <strong style={{ fontSize: 13, color: '#0f172a' }}>Palavras-Chave de Alta Conversão (Amazon SEO):</strong>
                    </div>
                    <button
                      onClick={handleCopyKeywords}
                      style={{
                        background: copiedKeywords ? '#ecfdf5' : '#f8fafc',
                        color: copiedKeywords ? '#059669' : '#475569',
                        border: copiedKeywords ? '1px solid #10b981' : '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {copiedKeywords ? <CheckCheck size={12} /> : <Copy size={12} />}
                      {copiedKeywords ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedBestseller.keywords.map((kw, i) => (
                      <span key={i} style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. GERADOR DE ARTE VIA REPLICATE */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 18,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Sparkles size={18} color="#0284c7" />
                    <strong style={{ fontSize: 14, color: '#0f172a' }}>Arte da Capa com IA (Replicate):</strong>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Prompt Editorial Personalizado:
                    </label>
                    <textarea
                      rows={3}
                      value={aiPromptCustom}
                      onChange={e => setAiPromptCustom(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '8px 10px',
                        color: '#0f172a',
                        fontSize: 12,
                        lineHeight: 1.4,
                        resize: 'vertical',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={handleGenerateReplicateCover}
                      disabled={isGeneratingAiCover}
                      style={{
                        background: isGeneratingAiCover ? '#94a3b8' : 'linear-gradient(135deg, #0284c7, #0369a1)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '9px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: isGeneratingAiCover ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Wand2 size={14} />
                      {isGeneratingAiCover ? 'Gerando com Replicate...' : 'Gerar Arte com Replicate'}
                    </button>

                    {config.coverIllustrationUrl && (
                      <button
                        onClick={handleRemoveCoverArt}
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fca5a5',
                          borderRadius: 8,
                          padding: '9px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Remover Arte
                      </button>
                    )}
                  </div>

                  {aiError && (
                    <div style={{ marginTop: 10, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 10px', color: '#b91c1c', fontSize: 11 }}>
                      {aiError}
                    </div>
                  )}

                  {/* Histórico de Capas */}
                  {coverHistory.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>
                        Variações Geradas ({coverHistory.length}):
                      </span>
                      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                        {coverHistory.map(item => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectHistoryCover(item)}
                            style={{
                              position: 'relative',
                              width: 54,
                              height: 72,
                              borderRadius: 6,
                              overflow: 'hidden',
                              border: activeCoverHistoryId === item.id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            <img src={item.url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              onClick={e => handleDeleteHistoryCover(item.id, e)}
                              style={{
                                position: 'absolute',
                                top: 2,
                                right: 2,
                                background: 'rgba(0,0,0,0.6)',
                                border: 'none',
                                borderRadius: 4,
                                color: '#fff',
                                padding: 2,
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. TIPOGRAFIA HIERÁRQUICA */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 16,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <ShieldCheck size={16} color="#0284c7" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      Tipografia Hierárquica da Capa (Anti-Estouro KDP):
                    </span>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Badge Superior de Novidade:
                    </label>
                    <input
                      type="text"
                      value={config.yearBadge || ''}
                      onChange={e => setConfig({ ...config, yearBadge: e.target.value })}
                      style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 10px', color: '#0f172a', fontSize: 12 }}
                    />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Número Hero em Destaque:
                    </label>
                    <input
                      type="text"
                      value={config.heroCountText || ''}
                      onChange={e => setConfig({ ...config, heroCountText: e.target.value })}
                      style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 10px', color: '#0f172a', fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      Banner Central Estilizado:
                    </label>
                    <input
                      type="text"
                      value={config.bannerTagText || ''}
                      onChange={e => setConfig({ ...config, bannerTagText: e.target.value })}
                      style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 10px', color: '#0f172a', fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>

              {/* PREVIEW EM CANVAS DA CAPA ABERTA */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    Pré-visualização da Capa Aberta Oficial KDP:
                  </span>

                  <button
                    onClick={() => setShowCoverGuides(!showCoverGuides)}
                    style={{
                      background: showCoverGuides ? '#fee2e2' : '#f8fafc',
                      color: showCoverGuides ? '#b91c1c' : '#475569',
                      border: showCoverGuides ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Eye size={14} /> {showCoverGuides ? 'Ocultar Linhas Guia KDP' : 'Exibir Linhas Guia KDP'}
                  </button>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  <canvas
                    ref={canvasRef}
                    style={{
                      width: '100%',
                      maxHeight: 480,
                      objectFit: 'contain',
                      borderRadius: 4,
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)'
                    }}
                  />
                </div>

                {/* Legenda das Guias */}
                {showCoverGuides && (
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, background: '#ef4444', display: 'inline-block', borderRadius: 2 }} /> Sangria de Corte (0.125")
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, background: '#0284c7', display: 'inline-block', borderRadius: 2 }} /> Dobras da Lombada
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, background: '#475569', display: 'inline-block', borderRadius: 2 }} /> Código de Barras KDP
                    </span>
                  </div>
                )}

                {/* Métricas Milimétricas Oficiais KDP */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10,
                  fontSize: 11
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Formato Fechado:</span>
                    <strong style={{ color: '#0f172a', fontSize: 12 }}>{config.trimSize}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Capa Aberta KDP:</span>
                    <strong style={{ color: '#0284c7', fontSize: 12 }}>
                      {PuzzleCoverBuilder.calculateCoverSpecs(config, estimatedPages).totalWidth.toFixed(2)}" x {PuzzleCoverBuilder.calculateCoverSpecs(config, estimatedPages).totalHeight.toFixed(2)}"
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Lombada (Spine):</span>
                    <strong style={{ color: '#d97706', fontSize: 12 }}>
                      {PuzzleCoverBuilder.calculateCoverSpecs(config, estimatedPages).spineWidth.toFixed(3)}"
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Status KDP:</span>
                    <strong style={{ color: '#059669', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={13} /> 100% Conforme
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÕES NAVEGAÇÃO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <button
                onClick={() => setCurrentStep(2)}
                style={{
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <ArrowLeft size={16} /> Voltar aos Puzzles
              </button>

              <button
                onClick={() => setCurrentStep(4)}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                }}
              >
                Avançar para Compilação Final <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PASSO 4: COMPILAÇÃO E DOWNLOADS COM VISUALIZADOR */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px', color: '#0f172a' }}>
                Passo 4: Compilação & Download dos Arquivos KDP
              </h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                Gere o Miolo em PDF vetorial 300 DPI, a Capa Aberta calculada com IA e o Pacote Completo no idioma {config.language.toUpperCase()}.
              </p>
            </div>

            {!compilationResult && !isCompiling && (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '36px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 20px rgba(2, 132, 199, 0.3)'
                }}>
                  <Sparkles size={34} color="#ffffff" />
                </div>

                <div style={{ maxWidth: 580 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 900, color: '#0f172a' }}>
                    Pronto para Compilar seu Livro KDP ({config.language.toUpperCase()})!
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
                    O motor processará {totalPuzzles} puzzles no idioma {config.language.toUpperCase()}, formatará as soluções cruzadas com Gutter KDP e montará o pacote pronto para publicação direta.
                  </p>
                </div>

                <button
                  onClick={handleStartCompilation}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '14px 34px',
                    fontSize: 16,
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <Sparkles size={18} /> Iniciar Compilação do Livro (Miolo + Capa)
                </button>
              </div>
            )}

            {isCompiling && (
              <div style={{
                background: '#ffffff',
                border: '2px solid #0284c7',
                borderRadius: 14,
                padding: '36px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20,
                boxShadow: '0 6px 24px rgba(2, 132, 199, 0.15)'
              }}>
                <RefreshCw size={38} color="#0284c7" className="animate-spin" />
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 900, color: '#0f172a' }}>
                    Compilando Livro de Passatempos ({config.language.toUpperCase()})...
                  </h3>
                  <span style={{ fontSize: 15, color: '#0284c7', fontWeight: 700 }}>
                    {compilationStatus}
                  </span>
                </div>

                <div style={{ width: '100%', maxWidth: 500, height: 12, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <div style={{
                    width: `${compilationProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                    borderRadius: 999,
                    transition: 'width 0.25s ease'
                  }} />
                </div>
                <span style={{ fontSize: 14, color: '#475569', fontWeight: 800 }}>
                  {compilationProgress}% Concluído • Processando algoritmo KDP
                </span>
              </div>
            )}

            {compilationError && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #ef4444',
                borderRadius: 10,
                padding: '16px 20px',
                color: '#b91c1c',
                fontSize: 14
              }}>
                <strong>Erro na compilação:</strong> {compilationError}
              </div>
            )}

            {compilationResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Banner de Sucesso */}
                <div style={{
                  background: '#ecfdf5',
                  border: '1.5px solid #10b981',
                  borderRadius: 14,
                  padding: '24px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      background: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}>
                      <CheckCircle2 size={30} color="#ffffff" />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 900, color: '#065f46' }}>
                        Livro Pronto para Publicação Direta na Amazon KDP!
                      </h3>
                      <span style={{ fontSize: 13, color: '#047857', fontWeight: 600 }}>
                        Idioma: {config.language.toUpperCase()} • {compilationResult.pageCount} páginas • Lombada: {compilationResult.coverSpecs.spineWidth.toFixed(4)}" • Formato {config.trimSize}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleStartCompilation}
                    style={{
                      background: '#ffffff',
                      color: '#059669',
                      border: '1px solid #10b981',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <RefreshCw size={13} /> Gerar Novamente
                  </button>
                </div>

                {/* VISUALIZADOR DE PÁGINAS GERADAS */}
                <PuzzlePagePreviewer
                  config={config}
                  puzzles={previewPuzzles}
                  currentPage={previewPage}
                  totalPages={compilationResult.pageCount || estimatedPages}
                  onPageChange={setPreviewPage}
                  showGuidesDefault={false}
                />

                {/* CARDS DE DOWNLOAD */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {/* Miolo */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}>
                    <div>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <FileText size={22} color="#0284c7" />
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Baixar Miolo ({config.language.toUpperCase()})</h4>
                      <p style={{ margin: 0, color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
                        Arquivo PDF com {compilationResult.pageCount} páginas, números e palavras em {config.language.toUpperCase()}, margem Gutter e gabarito final.
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadInterior}
                      style={{
                        background: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '11px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                      }}
                    >
                      <Download size={15} /> Baixar interior_kdp.pdf
                    </button>
                  </div>

                  {/* Capa */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}>
                    <div>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Palette size={22} color="#d97706" />
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Baixar Capa Bestseller PDF</h4>
                      <p style={{ margin: 0, color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
                        Capa aberta completa ({compilationResult.coverSpecs.totalWidth.toFixed(4)}" x {compilationResult.coverSpecs.totalHeight.toFixed(4)}") calculada milimetricamente para KDP.
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadCover}
                      style={{
                        background: '#d97706',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '11px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)'
                      }}
                    >
                      <Download size={15} /> Baixar cover_kdp.pdf
                    </button>
                  </div>

                  {/* Pacote Completo */}
                  <div style={{
                    background: '#ffffff',
                    border: '2px solid #10b981',
                    borderRadius: 14,
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15)'
                  }}>
                    <div>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Download size={22} color="#059669" />
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 900, color: '#065f46' }}>Pacote Completo (.ZIP)</h4>
                      <p style={{ margin: 0, color: '#475569', fontSize: 12, lineHeight: 1.5 }}>
                        Contém Miolo PDF, Capa Aberta PDF, metadados KDP em JSON e arquivo TXT com instruções completas.
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadZip}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '11px 16px',
                        fontSize: 13,
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      <Download size={15} /> Baixar Pacote (.ZIP)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VOLTAR À DASHBOARD */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <button
                onClick={() => setCurrentStep(3)}
                style={{
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <ArrowLeft size={16} /> Voltar ao Design
              </button>

              <button
                onClick={onBackToDashboard}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Concluir e Voltar ao Painel Principal
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
