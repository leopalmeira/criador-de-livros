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
  PuzzleLanguage
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

  // Estado da Compilação Final
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationProgress, setCompilationProgress] = useState(0);
  const [compilationStatus, setCompilationStatus] = useState('');
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);
  const [compilationError, setCompilationError] = useState<string | null>(null);

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

  // Função para Gerar Arte de Capa com IA Replicate (Primeira vez ou Nova Variação)
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

  // Seleciona uma capa do histórico
  const handleSelectHistoryCover = (item: CoverHistoryItem) => {
    setActiveCoverHistoryId(item.id);
    setConfig(prev => ({ ...prev, coverIllustrationUrl: item.url }));
  };

  // Remove a arte da capa e volta para a renderização vetorial pura
  const handleRemoveCoverArt = () => {
    setActiveCoverHistoryId(null);
    setConfig(prev => ({ ...prev, coverIllustrationUrl: undefined }));
  };

  // Remove uma capa do histórico
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

  // Seleciona um Bestseller de Referência da Amazon
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

  // Copia as palavras-chave do Bestseller para a área de transferência
  const handleCopyKeywords = () => {
    if (!selectedBestseller.keywords || selectedBestseller.keywords.length === 0) return;
    const textToCopy = selectedBestseller.keywords.join(', ');
    navigator.clipboard.writeText(textToCopy);
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2500);
  };

  // Compilação do Livro Completo
  const handleStartCompilation = async () => {
    setIsCompiling(true);
    setCompilationProgress(0);
    setCompilationStatus('Iniciando compilação matemática e vetorial KDP...');
    setCompilationError(null);
    setCompilationResult(null);

    try {
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
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* 1. TOP BAR DO ESTÚDIO */}
      <header style={{
        padding: '16px 28px',
        background: '#111827',
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onBackToDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={16} /> Voltar à Dashboard
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
            }}>
              <Grid3X3 size={20} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#ffffff' }}>
                Puzzle & Sudoku Book Engine Pro
              </h1>
              <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 600 }}>
                Capas com IA Replicate & Miolo Trilíngue (PT / EN / ES)
              </span>
            </div>
          </div>
        </div>

        {/* BADGES DE CONFORMIDADE KDP & REPLICATE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <Sparkles size={14} /> REPLICATE AI COVERS
          </span>

          <span style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <ShieldCheck size={14} /> KDP PRINT-READY
          </span>
        </div>
      </header>

      {/* 2. BARRA DE ETAPAS (WIZARD DE 4 PASSOS) */}
      <nav style={{
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        overflowX: 'auto'
      }}>
        {[
          { step: 1, label: '1. Idioma & Formato KDP' },
          { step: 2, label: '2. Puzzles & Estimativa' },
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
                background: isActive ? 'linear-gradient(135deg, #0284c7, #0369a1)' : (isPassed ? 'rgba(16, 185, 129, 0.15)' : 'transparent'),
                color: isActive ? '#ffffff' : (isPassed ? '#34d399' : '#64748b'),
                border: isActive ? '1px solid #38bdf8' : (isPassed ? '1px solid #059669' : '1px solid transparent'),
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isPassed ? <Check size={14} /> : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. CONTEÚDO PRINCIPAL DO PASSO */}
      <main style={{ flex: 1, padding: '28px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        {/* ======================================================== */}
        {/* PASSO 1: IDIOMA, FORMATO E METADADOS */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>
                Passo 1: Idioma do Livro & Formato Físico KDP
              </h2>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
                Selecione o idioma de publicação (Português, Inglês ou Espanhol). O miolo e a capa serão gerados 100% no idioma escolhido.
              </p>
            </div>

            {/* SELETOR DE IDIOMA EM DESTAQUE */}
            <div style={{
              background: 'linear-gradient(145deg, #131b2e 0%, #1e293b 100%)',
              border: '2px solid #38bdf8',
              borderRadius: 14,
              padding: 22,
              boxShadow: '0 4px 20px rgba(56, 189, 248, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Globe size={20} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#ffffff' }}>
                  Escolha o Idioma do Livro (Miolo + Capa + Puzzles):
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
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
                        border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                        background: isSelected ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
                        padding: '14px 18px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 28 }}>{lang.flag}</span>
                        <div>
                          <strong style={{ display: 'block', fontSize: 14, color: isSelected ? '#38bdf8' : '#ffffff' }}>
                            {lang.name}
                          </strong>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{lang.desc}</span>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 size={20} color="#38bdf8" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FORMATO FÍSICO E COR DO PAPEL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              {/* Trim Size */}
              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: 10 }}>
                  Dimensões de Impressão (Trim Size):
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(['8.5x11', '6x9', '8.25x11'] as TrimSize[]).map(size => {
                    const info = TRIM_DIMENSIONS[size];
                    const selected = config.trimSize === size;
                    return (
                      <div
                        key={size}
                        onClick={() => setConfig({ ...config, trimSize: size })}
                        style={{
                          border: selected ? '2px solid #0284c7' : '1px solid #334155',
                          background: selected ? 'rgba(2, 132, 199, 0.12)' : '#0f172a',
                          padding: '12px 16px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 800, color: selected ? '#38bdf8' : '#ffffff', fontSize: 14, display: 'block' }}>
                            {info.name}
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {size === '8.5x11' ? 'Ideal para jogos, letras grandes e passatempos.' : 'Formato compacto e prático.'}
                          </span>
                        </div>
                        {selected && <CheckCircle2 size={18} color="#0284c7" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cor do Papel */}
              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: 10 }}>
                  Cor do Papel do Miolo (Interior):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div
                    onClick={() => setConfig({ ...config, paperColor: 'white' })}
                    style={{
                      border: config.paperColor === 'white' ? '2px solid #0284c7' : '1px solid #334155',
                      background: config.paperColor === 'white' ? 'rgba(2, 132, 199, 0.12)' : '#0f172a',
                      padding: 16,
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ width: 32, height: 32, background: '#ffffff', borderRadius: 6, margin: '0 auto 8px', border: '1px solid #ccc' }} />
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#ffffff', display: 'block' }}>Papel Branco</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Maior contraste e nitidez B&W</span>
                  </div>

                  <div
                    onClick={() => setConfig({ ...config, paperColor: 'cream' })}
                    style={{
                      border: config.paperColor === 'cream' ? '2px solid #0284c7' : '1px solid #334155',
                      background: config.paperColor === 'cream' ? 'rgba(2, 132, 199, 0.12)' : '#0f172a',
                      padding: 16,
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ width: 32, height: 32, background: '#fef3c7', borderRadius: 6, margin: '0 auto 8px', border: '1px solid #fde68a' }} />
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#ffffff', display: 'block' }}>Papel Creme</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Aspecto vintage e leitura suave</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadados: Título, Subtítulo e Autor */}
            <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: 12, padding: 22 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>
                Metadados do Livro para Amazon KDP ({config.language.toUpperCase()})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                    Título Principal:
                  </label>
                  <input
                    type="text"
                    value={config.title}
                    onChange={e => setConfig({ ...config, title: e.target.value })}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#ffffff', fontSize: 14, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                    Subtítulo do Livro:
                  </label>
                  <input
                    type="text"
                    value={config.subtitle}
                    onChange={e => setConfig({ ...config, subtitle: e.target.value })}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#ffffff', fontSize: 14, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                    Nome do Autor / Marca Editorial:
                  </label>
                  <input
                    type="text"
                    value={config.author}
                    onChange={e => setConfig({ ...config, author: e.target.value })}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#ffffff', fontSize: 14, outline: 'none' }}
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
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
                }}
              >
                Avançar para Seleção de Puzzles <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PASSO 2: SELEÇÃO DE PUZZLES E TEMAS POR IDIOMA */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>
                Passo 2: Configuração dos Puzzles no Idioma {config.language === 'en' ? 'Inglês' : (config.language === 'es' ? 'Espanhol' : 'Português')}
              </h2>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
                Personalize a quantidade de Sudokus, Caça-Palavras com temas no idioma correto e Labirintos.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              {/* CONTROLES DOS PUZZLES */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 1. Sudoku Controls */}
                <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Grid3X3 size={18} color="#38bdf8" />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Sudokus (Solução Única Garantida)</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Fácil (36-40 pistas):</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={config.sudokuFacilCount}
                        onChange={e => setConfig({ ...config, sudokuFacilCount: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Médio (30-35 pistas):</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={config.sudokuMedioCount}
                        onChange={e => setConfig({ ...config, sudokuMedioCount: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Difícil (26-29 pistas):</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={config.sudokuDificilCount}
                        onChange={e => setConfig({ ...config, sudokuDificilCount: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Extremo (22-25 pistas):</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={config.sudokuExtremoCount}
                        onChange={e => setConfig({ ...config, sudokuExtremoCount: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 14 }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Caça-Palavras Controls */}
                <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <FileText size={18} color="#34d399" />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                      Caça-Palavras ({config.language === 'en' ? 'Word Search' : (config.language === 'es' ? 'Sopa de Letras' : 'Caça-Palavras')})
                    </h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Quantidade de Puzzles:</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={config.wordSearchCount}
                        onChange={e => setConfig({ ...config, wordSearchCount: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Tamanho da Grade:</label>
                      <select
                        value={config.wordSearchGridSize}
                        onChange={e => setConfig({ ...config, wordSearchGridSize: parseInt(e.target.value) as any })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 14 }}
                      >
                        <option value={15}>15 x 15 (Padrão Equilibrado)</option>
                        <option value={18}>18 x 18 (Médio Desafiador)</option>
                        <option value={20}>20 x 20 (Grande / Letras Densas)</option>
                      </select>
                    </div>
                  </div>

                  {/* Temas selecionáveis no idioma corrente */}
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8 }}>
                    Temas Disponíveis em {config.language === 'en' ? 'Inglês' : (config.language === 'es' ? 'Espanhol' : 'Português')}:
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
                            background: isSelected ? 'rgba(16, 185, 129, 0.2)' : '#0f172a',
                            color: isSelected ? '#34d399' : '#64748b',
                            border: isSelected ? '1px solid #10b981' : '1px solid #334155',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
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
                <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Layers size={18} color="#f59e0b" />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Labirintos (Resolução Vetorial DFS)</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Quantidade de Labirintos:</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={config.mazeCount}
                        onChange={e => setConfig({ ...config, mazeCount: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Nível de Complexidade:</label>
                      <select
                        value={config.mazeDifficulty}
                        onChange={e => setConfig({ ...config, mazeDifficulty: e.target.value as any })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 14 }}
                      >
                        <option value="facil">Fácil (Grade 13x13)</option>
                        <option value="medio">Médio (Grade 17x17)</option>
                        <option value="dificil">Difícil (Grade 23x23)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Diagramação do Layout */}
                <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Sliders size={18} color="#c084fc" />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Diagramação & Distribuição nas Páginas</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Puzzles por Página:</label>
                      <select
                        value={config.puzzlesPerPage}
                        onChange={e => setConfig({ ...config, puzzlesPerPage: parseInt(e.target.value) as PuzzlesPerPage })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 14 }}
                      >
                        <option value={1}>1 por página (Letras Grandes / Máxima Legibilidade)</option>
                        <option value={2}>2 por página (Mais Econômico e Equilibrado)</option>
                        <option value={4}>4 por página (Ultra Compacto / Minibook)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Soluções / Gabarito por Página:</label>
                      <select
                        value={config.solutionsPerPage}
                        onChange={e => setConfig({ ...config, solutionsPerPage: parseInt(e.target.value) as SolutionsPerPage })}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 14 }}
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
                  background: '#131b2e',
                  border: isKdpCompliant ? '1px solid #10b981' : '1px solid #f59e0b',
                  borderRadius: 12,
                  padding: 22,
                  boxShadow: isKdpCompliant ? '0 4px 20px rgba(16, 185, 129, 0.12)' : 'none'
                }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 800 }}>
                    Auditoria KDP em Tempo Real
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#94a3b8' }}>Total de Puzzles:</span>
                      <strong style={{ color: '#ffffff' }}>{totalPuzzles}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#94a3b8' }}>Páginas de Puzzles:</span>
                      <strong style={{ color: '#ffffff' }}>{Math.ceil(totalPuzzles / config.puzzlesPerPage)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#94a3b8' }}>Páginas de Soluções:</span>
                      <strong style={{ color: '#ffffff' }}>{Math.ceil(totalPuzzles / config.solutionsPerPage)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#94a3b8' }}>Folha de Rosto & Regras:</span>
                      <strong style={{ color: '#ffffff' }}>2 págs</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#94a3b8' }}>Divisória de Gabarito:</span>
                      <strong style={{ color: '#ffffff' }}>1 pág</strong>
                    </div>

                    <div style={{ height: 1, background: '#334155', margin: '4px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                      <span style={{ fontWeight: 800 }}>Total Final Estimado:</span>
                      <strong style={{ color: '#38bdf8', fontSize: 18 }}>{estimatedPages} págs</strong>
                    </div>
                  </div>

                  {isKdpCompliant ? (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10b981',
                      borderRadius: 8,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#34d399',
                      fontSize: 12,
                      fontWeight: 700
                    }}>
                      <CheckCircle2 size={16} />
                      <span>Conforme com o mínimo KDP (24 páginas)!</span>
                    </div>
                  ) : (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid #f59e0b',
                      borderRadius: 8,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#fcd34d',
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
                  background: 'transparent',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
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
                <ArrowLeft size={16} /> Voltar
              </button>

              <button
                onClick={() => setCurrentStep(3)}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
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
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>
                Passo 3: Capa Bestseller Amazon KDP & Geração com IA (Replicate)
              </h2>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
                Layout profissional inspirado nos maiores best-sellers da Amazon com tipografia hierárquica, efeito de livro aberto 3D e renderização via Replicate.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: 24 }}>
              {/* CONTROLES DA CAPA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* 1. REFERÊNCIA BESTSELLER AMAZON (KDP TOP RANKED) */}
                <div style={{
                  background: 'linear-gradient(145deg, #131b2e 0%, #0f172a 100%)',
                  border: '1px solid #1e293b',
                  borderRadius: 12,
                  padding: 18,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Star size={18} color="#fbbf24" fill="#fbbf24" />
                      <strong style={{ fontSize: 14, color: '#ffffff' }}>Referência Bestseller Amazon (Segmento KDP):</strong>
                    </div>
                    <span style={{ fontSize: 11, background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid #d97706', padding: '2px 8px', borderRadius: 4, fontWeight: 800 }}>
                      KDP Top Ranked
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px', lineHeight: 1.4 }}>
                    Selecione o best-seller do mesmo nicho para absorver a identidade visual de sucesso, paleta cromática, prompt editorial de IA e palavras-chave ranqueadas na Amazon:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {getBestsellersForLanguage(config.language).map(bs => {
                      const isSelected = selectedBestseller.id === bs.id;
                      return (
                        <div
                          key={bs.id}
                          onClick={() => handleSelectBestseller(bs)}
                          style={{
                            background: isSelected ? 'rgba(56, 189, 248, 0.12)' : '#0b1120',
                            border: isSelected ? '2px solid #38bdf8' : '1px solid #1e293b',
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
                              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>ASIN: {bs.asin}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 3 }}>
                              <span style={{ width: 12, height: 12, borderRadius: '50%', background: bs.palettePrimary, display: 'inline-block' }} />
                              <span style={{ width: 12, height: 12, borderRadius: '50%', background: bs.paletteSecondary, display: 'inline-block' }} />
                              <span style={{ width: 12, height: 12, borderRadius: '50%', background: bs.paletteAccent, display: 'inline-block' }} />
                            </div>
                          </div>

                          <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', marginBottom: 2 }}>
                            {bs.title}
                          </div>
                          <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.3 }}>
                            {bs.subtitle}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 11, color: '#fbbf24' }}>
                            <span>★ {bs.rating} ({bs.reviewsCount.toLocaleString()} avaliações)</span>
                            <span style={{ color: '#64748b' }}>•</span>
                            <span style={{ color: '#94a3b8' }}>Estilo: {bs.coverVisualTheme}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. PALAVRAS-CHAVE DO BESTSELLER PARA O KDP */}
                <div style={{
                  background: '#131b2e',
                  border: '1px solid #1e293b',
                  borderRadius: 12,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={16} color="#34d399" />
                      <strong style={{ fontSize: 13, color: '#ffffff' }}>Palavras-Chave de Alta Conversão (Amazon SEO):</strong>
                    </div>
                    <button
                      onClick={handleCopyKeywords}
                      style={{
                        background: copiedKeywords ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.15)',
                        color: copiedKeywords ? '#34d399' : '#38bdf8',
                        border: copiedKeywords ? '1px solid #10b981' : '1px solid #0284c7',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.2s'
                      }}
                    >
                      {copiedKeywords ? <CheckCheck size={13} /> : <Copy size={13} />}
                      {copiedKeywords ? 'Palavras Copiadas!' : 'Copiar Palavras-Chave'}
                    </button>
                  </div>

                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 10px' }}>
                    Palavras-chave extraídas dos termos de busca reais do bestseller para indexação direta no cadastro da Amazon KDP:
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedBestseller.keywords.map(kw => (
                      <span
                        key={kw}
                        style={{
                          background: '#0b1120',
                          border: '1px solid #334155',
                          borderRadius: 4,
                          padding: '3px 8px',
                          fontSize: 11,
                          color: '#e2e8f0',
                          fontWeight: 600
                        }}
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. MÓDULO REPLICATE AI COM BOTÃO DE GERAR OUTRA CAPA & HISTÓRICO */}
                <div style={{
                  background: 'linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%)',
                  border: '2px solid #818cf8',
                  borderRadius: 12,
                  padding: 18,
                  boxShadow: '0 4px 18px rgba(129, 140, 248, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Wand2 size={18} color="#818cf8" />
                      <strong style={{ fontSize: 14, color: '#ffffff' }}>Arte de Fundo com IA (Replicate):</strong>
                    </div>
                    <span style={{ fontSize: 11, background: '#4338ca', color: '#c7d2fe', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                      FLUX.1 Schnell
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: '#c7d2fe', margin: '0 0 10px', lineHeight: 1.4 }}>
                    Gera renderização fotográfica 3D realista de livro aberto com lápis e iluminação de estúdio limpa, perfeitamente alinhada com as margens seguras KDP.
                  </p>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                        Prompt Editorial da IA:
                      </label>
                      <button
                        onClick={() => setAiPromptCustom(selectedBestseller.replicatePrompt)}
                        style={{
                          background: 'transparent',
                          color: '#818cf8',
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Restaurar Prompt do Bestseller
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={aiPromptCustom}
                      onChange={e => setAiPromptCustom(e.target.value)}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #4338ca', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 11, resize: 'vertical' }}
                    />
                  </div>

                  {/* BOTÕES DE GERAÇÃO: GERAR ARTE OU GERAR OUTRA CAPA */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={handleGenerateReplicateCover}
                      disabled={isGeneratingAiCover}
                      style={{
                        width: '100%',
                        background: isGeneratingAiCover
                          ? '#4338ca'
                          : (coverHistory.length > 0
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'),
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 18px',
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: isGeneratingAiCover ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: coverHistory.length > 0
                          ? '0 4px 14px rgba(16, 185, 129, 0.4)'
                          : '0 4px 14px rgba(99, 102, 241, 0.4)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isGeneratingAiCover ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Gerando Arte no Replicate FLUX (aguarde)...</span>
                        </>
                      ) : (
                        coverHistory.length > 0 ? (
                          <>
                            <RefreshCw size={16} />
                            <span>🔄 Gerar Outra Capa (Nova Variação com IA)</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>✨ Gerar Arte de Capa com Replicate</span>
                          </>
                        )
                      )}
                    </button>

                    {/* Botão de apoio para alternar ou remover arte */}
                    {config.coverIllustrationUrl && (
                      <button
                        onClick={handleRemoveCoverArt}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#cbd5e1',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        🎨 Usar Apenas Layout Vetorial Puro (Sem Imagem IA)
                      </button>
                    )}
                  </div>

                  {aiError && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#fca5a5' }}>
                      {aiError}
                    </div>
                  )}

                  {/* HISTÓRICO DE VARIAÇÕES DE CAPAS GERADAS */}
                  {coverHistory.length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #312e81' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e0e7ff' }}>
                          Galeria de Variações ({coverHistory.length} geradas):
                        </span>
                        <span style={{ fontSize: 10, color: '#a5b4fc' }}>
                          Clique para alternar a capa
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
                        {coverHistory.map((item, idx) => {
                          const isCurrent = config.coverIllustrationUrl === item.url;
                          const variationNumber = coverHistory.length - idx;
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleSelectHistoryCover(item)}
                              style={{
                                position: 'relative',
                                minWidth: 90,
                                width: 90,
                                height: 115,
                                borderRadius: 8,
                                overflow: 'hidden',
                                border: isCurrent ? '2px solid #38bdf8' : '1px solid #4338ca',
                                boxShadow: isCurrent ? '0 0 12px rgba(56, 189, 248, 0.5)' : 'none',
                                cursor: 'pointer',
                                background: '#0b1120',
                                flexShrink: 0
                              }}
                            >
                              <img
                                src={item.url}
                                alt={`Variação ${variationNumber}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'rgba(0, 0, 0, 0.75)',
                                padding: '2px 4px',
                                fontSize: 9,
                                fontWeight: 700,
                                color: '#ffffff',
                                textAlign: 'center'
                              }}>
                                {isCurrent ? '✓ Ativa' : `Var. #${variationNumber}`}
                              </div>

                              <button
                                onClick={(e) => handleDeleteHistoryCover(item.id, e)}
                                title="Excluir variação"
                                style={{
                                  position: 'absolute',
                                  top: 3,
                                  right: 3,
                                  background: 'rgba(239, 68, 68, 0.85)',
                                  border: 'none',
                                  borderRadius: 4,
                                  width: 18,
                                  height: 18,
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. ESTILOS DE COR BESTSELLER AMAZON */}
                <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: 12, padding: 18 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: 12 }}>
                    Estilos Cromáticos Bestseller Amazon:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {PRESET_COVER_STYLES.map(style => {
                      const isSelected = config.coverPrimaryColor === style.palettePrimary;
                      return (
                        <div
                          key={style.id}
                          onClick={() => setConfig({
                            ...config,
                            coverPrimaryColor: style.palettePrimary,
                            coverSecondaryColor: style.paletteSecondary,
                            coverAccentColor: style.paletteAccent
                          })}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: isSelected ? 'rgba(56, 189, 248, 0.12)' : '#0f172a',
                            border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>{style.name}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: style.palettePrimary }} />
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: style.paletteSecondary }} />
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: style.paletteAccent }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. TIPOGRAFIA HIERÁRQUICA DA CAPA (PROTEÇÃO ANTI-ESTOURO) */}
                <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: 12, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <ShieldCheck size={16} color="#38bdf8" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>
                      Tipografia Hierárquica da Capa (Anti-Estouro KDP):
                    </span>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                      Badge Superior de Novidade (ex: NEW 2026 / NOVO 2026):
                    </label>
                    <input
                      type="text"
                      value={config.yearBadge || ''}
                      onChange={e => setConfig({ ...config, yearBadge: e.target.value })}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '7px 10px', color: '#fff', fontSize: 12 }}
                    />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                      Número Hero em Destaque (ex: 10,000 / 100+):
                    </label>
                    <input
                      type="text"
                      value={config.heroCountText || ''}
                      onChange={e => setConfig({ ...config, heroCountText: e.target.value })}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '7px 10px', color: '#fff', fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                      Banner Central Estilizado (Faixa Azul):
                    </label>
                    <input
                      type="text"
                      value={config.bannerTagText || ''}
                      onChange={e => setConfig({ ...config, bannerTagText: e.target.value })}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '7px 10px', color: '#fff', fontSize: 12 }}
                    />
                  </div>

                  <div style={{
                    marginTop: 12,
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    fontSize: 11,
                    color: '#93c5fd',
                    lineHeight: 1.4
                  }}>
                    🛡️ <strong>Algoritmo Anti-Estouro Ativo:</strong> Todo texto é auto-escalonado matematicamente dentro da Safe Zone KDP. Zero corte nas bordas e zero vazamento na lombada.
                  </div>
                </div>
              </div>

              {/* PREVIEW EM CANVAS DA CAPA ABERTA */}
              <div style={{
                background: '#131b2e',
                border: '1px solid #1e293b',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#cbd5e1' }}>
                    Pré-visualização da Capa Aberta Oficial KDP:
                  </span>

                  <button
                    onClick={() => setShowCoverGuides(!showCoverGuides)}
                    style={{
                      background: showCoverGuides ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      color: showCoverGuides ? '#f87171' : '#cbd5e1',
                      border: showCoverGuides ? '1px solid #ef4444' : '1px solid #334155',
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
                  background: '#0a0e17',
                  border: '1px solid #1f2937',
                  borderRadius: 8,
                  padding: 10,
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
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
                    }}
                  />
                </div>

                {/* Legenda das Guias */}
                {showCoverGuides && (
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#94a3b8' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, background: '#ef4444', display: 'inline-block', borderRadius: 2 }} /> Sangria de Corte (0.125")
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, background: '#38bdf8', display: 'inline-block', borderRadius: 2 }} /> Dobras da Lombada
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, background: '#ffffff', display: 'inline-block', borderRadius: 2 }} /> Reserva Código de Barras KDP (2"x1.2")
                    </span>
                  </div>
                )}

                {/* Métricas Milimétricas Oficiais KDP */}
                <div style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10,
                  fontSize: 11
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Formato Fechado:</span>
                    <strong style={{ color: '#ffffff', fontSize: 12 }}>{config.trimSize}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Capa Aberta KDP:</span>
                    <strong style={{ color: '#38bdf8', fontSize: 12 }}>
                      {PuzzleCoverBuilder.calculateCoverSpecs(config, estimatedPages).totalWidth.toFixed(2)}" x {PuzzleCoverBuilder.calculateCoverSpecs(config, estimatedPages).totalHeight.toFixed(2)}"
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Lombada (Spine):</span>
                    <strong style={{ color: '#fbbf24', fontSize: 12 }}>
                      {PuzzleCoverBuilder.calculateCoverSpecs(config, estimatedPages).spineWidth.toFixed(3)}" ({ (PuzzleCoverBuilder.calculateCoverSpecs(config, estimatedPages).spineWidth * 25.4).toFixed(1) }mm)
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Status KDP:</span>
                    <strong style={{ color: '#34d399', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
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
                  background: 'transparent',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
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
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
                }}
              >
                Avançar para Compilação Final <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PASSO 4: COMPILAÇÃO E DOWNLOADS */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>
                Passo 4: Compilação & Download dos Arquivos KDP
              </h2>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
                Gere o Miolo em PDF vetorial 300 DPI, a Capa Aberta calculada com IA e o Pacote Completo no idioma {config.language.toUpperCase()}.
              </p>
            </div>

            {!compilationResult && !isCompiling && (
              <div style={{
                background: '#131b2e',
                border: '1px solid #1e293b',
                borderRadius: 14,
                padding: '36px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16
              }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 20px rgba(2, 132, 199, 0.4)'
                }}>
                  <Sparkles size={32} color="#ffffff" />
                </div>

                <div style={{ maxWidth: 540 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>
                    Pronto para Compilar seu Livro KDP ({config.language.toUpperCase()})!
                  </h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>
                    O motor processará {totalPuzzles} puzzles no idioma selecionado, montará as soluções cruzadas com Gutter KDP e gerará a capa aberta com acabamento de best-seller.
                  </p>
                </div>

                <button
                  onClick={handleStartCompilation}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '14px 32px',
                    fontSize: 16,
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: '0 6px 24px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  <Sparkles size={18} /> Iniciar Compilação do Livro
                </button>
              </div>
            )}

            {isCompiling && (
              <div style={{
                background: '#131b2e',
                border: '1px solid #0284c7',
                borderRadius: 14,
                padding: '36px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20
              }}>
                <RefreshCw size={36} color="#38bdf8" className="animate-spin" />
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                    Compilando Livro de Passatempos ({config.language.toUpperCase()})...
                  </h3>
                  <span style={{ fontSize: 14, color: '#38bdf8', fontWeight: 600 }}>
                    {compilationStatus}
                  </span>
                </div>

                <div style={{ width: '100%', maxWidth: 480, height: 10, background: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    width: `${compilationProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                    borderRadius: 999,
                    transition: 'width 0.2s ease'
                  }} />
                </div>
                <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 700 }}>
                  {compilationProgress}% Concluído
                </span>
              </div>
            )}

            {compilationError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: 10,
                padding: '16px 20px',
                color: '#fca5a5',
                fontSize: 14
              }}>
                <strong>Erro:</strong> {compilationError}
              </div>
            )}

            {compilationResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.3) 100%)',
                  border: '1px solid #10b981',
                  borderRadius: 14,
                  padding: '24px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <CheckCircle2 size={28} color="#ffffff" />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 900, color: '#ffffff' }}>
                        Livro Pronto para Publicação Direta na Amazon KDP!
                      </h3>
                      <span style={{ fontSize: 13, color: '#a7f3d0' }}>
                        Idioma: {config.language.toUpperCase()} • {compilationResult.pageCount} páginas • Lombada: {compilationResult.coverSpecs.spineWidth.toFixed(4)}" • Formato {config.trimSize}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleStartCompilation}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                  {/* Miolo */}
                  <div style={{
                    background: '#131b2e',
                    border: '1px solid #1e293b',
                    borderRadius: 12,
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16
                  }}>
                    <div>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <FileText size={20} color="#38bdf8" />
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800 }}>Baixar Miolo ({config.language.toUpperCase()})</h4>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>
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
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <Download size={15} /> Baixar interior_kdp.pdf
                    </button>
                  </div>

                  {/* Capa */}
                  <div style={{
                    background: '#131b2e',
                    border: '1px solid #1e293b',
                    borderRadius: 12,
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16
                  }}>
                    <div>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <Palette size={20} color="#f59e0b" />
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800 }}>Baixar Capa Bestseller PDF</h4>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>
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
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <Download size={15} /> Baixar cover_kdp.pdf
                    </button>
                  </div>

                  {/* Pacote Completo */}
                  <div style={{
                    background: 'linear-gradient(145deg, #131b2e 0%, #1e293b 100%)',
                    border: '2px solid #10b981',
                    borderRadius: 12,
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)'
                  }}>
                    <div>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <Download size={20} color="#34d399" />
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 900, color: '#ffffff' }}>Pacote Completo (.ZIP)</h4>
                      <p style={{ margin: 0, color: '#cbd5e1', fontSize: 12, lineHeight: 1.5 }}>
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
                        padding: '10px 16px',
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
                  background: 'transparent',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
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
                  background: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid #475569',
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
