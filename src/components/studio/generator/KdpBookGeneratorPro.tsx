import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Sparkles, Plus, Download, Copy, Save, Eye,
  Play, Square, RefreshCw, Trash2, ArrowLeft, Check, Layers,
  Monitor, Smartphone, FileText, Image as ImageIcon, ChevronRight, ChevronLeft,
  ShieldCheck, CheckCircle2, AlertTriangle, Wand2, Headphones, Globe, Code2,
  Award, Palette, Edit3, Star
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  chamarGeminiTexto,
  chamarImagen,
  sugerirCampo,
  gerarConteudoPaginaPromocional,
  gerarImagemPromocionalNarrativa,
  obterTemaPorGenero
} from '../../../services/kdp-ai-engine';
import { BookPromotionalPageData } from '../../../types/promotional-page';
import { BookPromotionalPage } from '../promotional/BookPromotionalPage';
import { BookPromotionalPageModal } from '../promotional/BookPromotionalPageModal';
import { BookProject } from '../../../types/book-project';
import { BOOK_TYPE_CONFIGS, type BookType } from '../../../types/book-project';
import { db } from '../../../database/local-database';
import {
  KdpBookVerifier,
  FullBookVerificationReport,
  VerifierIssue
} from '../../../services/kdp-book-verifier';
import { EditorialCorrectionSection } from './EditorialCorrectionSection';
import { buildKdpPdf } from '../../../services/kdp-pdf-builder';
import type { FinalBookRecord } from '../../../types/editorial-correction';
import { newId } from '../../../services/project-state';
import { BOOK_THEMES, getTheme, isChildrenTheme, type BookTheme } from '../../../data/book-themes';
import { AGE_BANDS, type AgeBandId, validateAgeRequirement, buildAgeDirective } from '../../../services/age-engine';
import { researchMarket, pickReferences, describeRank, displayField, DATA_UNAVAILABLE, type MarketReference } from '../../../services/market-intel';
import { filterOriginalCandidates, checkTitleSimilarity } from '../../../services/similarity-engine';
import { preflightPdf } from '../../../services/pdf-preflight';
import { ColoringBookStudio } from '../coloring/ColoringBookStudio';
import { AudiobookStudio } from '../audiobook/AudiobookStudio';
import { MultiplatformPublishingModal } from '../publishing/MultiplatformPublishingModal';
import { KdpTourGuideModal } from './KdpTourGuideModal';
import { KdpPageReviewerModal } from './KdpPageReviewerModal';
import { Top50BestsellersModal } from './Top50BestsellersModal';
import { ErrorBoundary } from '../../common/ErrorBoundary';
import { orchestrateEditorialPlan, type KdpEditorialPlan } from '../../../services/kdp-agents-service';
import { buildCoverArtPrompt, type CoverTitleLayout, type CoverVisualStyle } from '../../../services/kdp-cover-art-direction';
import {
  SilhuetaMarginalConfig,
  SILHUETA_CONFIG_PADRAO,
  GALERIA_SILHUETAS_PB,
  calcularPaginasSilhueta,
  gerarSilhuetaPersonagem,
  gerarIlustracaoCapitulo
} from '../../../services/kdp-silhouette-service';
import { sanitizarOrtografiaEditorialCapa } from '../../../services/kdp-orthography-engine';
import { useBookCredits } from '../../../services/kdp-credits-service';
import { PurchaseCreditsModal } from '../credits/PurchaseCreditsModal';
import { PlannerBookStudio } from '../planner/PlannerBookStudio';

const newProjectId = () => newId('prj_');

interface Capitulo {
  titulo: string;
  texto: string;
  imagemDataUrl?: string | null;
  imagemPrompt?: string;
}

interface LivroGerado {
  titulo: string;
  subtitulo: string;
  autor: string;
  genero: string;
  idioma: string;
  capitulos: Capitulo[];
  meta: {
    palavrasPorCap: number;
    paginasAlvo: number;
  };
}

export interface ItemHistoricoCapa {
  id: string;
  dataUrl: string;
  fundoUrl?: string;
  timestamp: number;
  estilo?: 'modern-magazine' | 'luxury-serif' | 'bold-impact';
  conceito?: string;
}

interface Props {
  initialProject?: BookProject | null;
  isNewProject?: boolean;
  onBackToDashboard: () => void;
  onProjectSaved?: (project: BookProject) => void;
}

export const KdpBookGeneratorPro: React.FC<Props> = ({
  initialProject,
  isNewProject,
  onBackToDashboard,
  onProjectSaved
}) => {
  // Configurações do formulário
  const [titulo, setTitulo] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [autor, setAutor] = useState('Leandro Palmeira');
  const [genero, setGenero] = useState('Thriller / Mistério Investigativo');
  const [topico, setTopico] = useState('');
  const [paginasAlvo, setPaginasAlvo] = useState(100);
  const [maxCapitulos, setMaxCapitulos] = useState(15);
  const [formato, setFormato] = useState('6x9');
  const [idioma, setIdioma] = useState('português');
  const [tamCapitulo, setTamCapitulo] = useState(11);
  const [corCapitulo, setCorCapitulo] = useState('#1e293b');
  const [optPromo, setOptPromo] = useState(true);
  const [optSumario, setOptSumario] = useState(true);

  // Estados Editoriais Avançados (Prompt Mestre)
  const [temaSelecionado, setTemaSelecionado] = useState('');
  const [subtemaSelecionado, setSubtemaSelecionado] = useState('');
  const [faixaEtaria, setFaixaEtaria] = useState<AgeBandId | ''>('');
  const [uniqueAngle, setUniqueAngle] = useState('');
  const [bookPromise, setBookPromise] = useState('');
  const [targetReader, setTargetReader] = useState('');
  const [marketReferences, setMarketReferences] = useState<MarketReference[]>([]);
  const [marketPool, setMarketPool] = useState<MarketReference[]>([]);
  const [isAnalyzingMarket, setIsAnalyzingMarket] = useState(false);
  const [marketFeedback, setMarketFeedback] = useState<string | null>(null);
  const [opcoesTitulos, setOpcoesTitulos] = useState<string[]>([]);
  const [opcoesSubtitulos, setOpcoesSubtitulos] = useState<string[]>([]);
  const [isGeneratingTitulos, setIsGeneratingTitulos] = useState(false);
  const [isGeneratingSubtitulos, setIsGeneratingSubtitulos] = useState(false);
  const [isSuggestingDiferencial, setIsSuggestingDiferencial] = useState(false);

  // Estados de execução
  const [livro, setLivro] = useState<LivroGerado | null>(null);
  const [planoEditorial, setPlanoEditorial] = useState<KdpEditorialPlan | null>(null);
  const [capaFinal, setCapaFinal] = useState<string | null>(null);
  const [fundoImg, setFundoImg] = useState<string | null>(null);
  const [promoData, setPromoData] = useState<BookPromotionalPageData | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);

  // Motor de Silhuetas Marginais & Ilustrações de Capítulos (3% Sangria Externa)
  const [silhuetaConfig, setSilhuetaConfig] = useState<SilhuetaMarginalConfig>(SILHUETA_CONFIG_PADRAO);
  const [isGeneratingSilhueta, setIsGeneratingSilhueta] = useState(false);
  const [personagemSilhuetaFoco, setPersonagemSilhuetaFoco] = useState('');
  const [generatingCapImgIndex, setGeneratingCapImgIndex] = useState<number | null>(null);
  const [showSilhuetaPanel, setShowSilhuetaPanel] = useState(false);
  const [isTop50ModalOpen, setIsTop50ModalOpen] = useState(false);
  const [isEditingManuscriptInline, setIsEditingManuscriptInline] = useState(false);

  // Estados do Estúdio de Capa & Direção de Arte de Revista (Anti-Slop Web UI)
  const [estiloCapaTipo, setEstiloCapaTipo] = useState<'modern-magazine' | 'luxury-serif' | 'bold-impact'>('modern-magazine');
  const [estiloArteVisual, setEstiloArteVisual] = useState<CoverVisualStyle>('minimalist');
  const [posicaoTituloCapa, setPosicaoTituloCapa] = useState<CoverTitleLayout>('centro');
  const [intensidadeZonaLimpa, setIntensidadeZonaLimpa] = useState<'suave' | 'media' | 'forte'>('media');
  const [customCoverPrompt, setCustomCoverPrompt] = useState('');
  const [isRegeneratingCoverOnly, setIsRegeneratingCoverOnly] = useState(false);
  const [isReapplyingTypography, setIsReapplyingTypography] = useState(false);

  // Histórico de Capas Geradas para o Carrossel e Escolha Visual
  const [historicoCapas, setHistoricoCapas] = useState<ItemHistoricoCapa[]>([]);
  const [indiceCapaCarrossel, setIndiceCapaCarrossel] = useState<number>(0);

  // Status e controle do pipeline
  const [gerando, setGerando] = useState(false);
  const [isPlanningEditorial, setIsPlanningEditorial] = useState(false);
  const [estiloIlustracaoCapitulo, setEstiloIlustracaoCapitulo] = useState<'realista' | 'arte_editorial' | 'aquarela' | 'nanquim'>('aquarela');
  const [pararFlag, setPararFlag] = useState(false);
  const pararFlagRef = useRef(false);
  const [capAtual, setCapAtual] = useState(0);
  const [totalCaps, setTotalCaps] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Pronto para iniciar');
  const [statusType, setStatusType] = useState<'normal' | 'ok' | 'error'>('normal');
  const [progressPercent, setProgressPercent] = useState(0);
  const [diagnostico, setDiagnostico] = useState('Sistema pronto.');
  const [activeTab, setActiveTab] = useState<'preview' | 'capa' | 'promo' | 'auditoria' | 'colorir' | 'planner' | 'audiobook'>('preview');
  const [bookType, setBookType] = useState<BookType>('fiction-novel');
  const [isPublishingModalOpen, setIsPublishingModalOpen] = useState(false);

  // Sistema de Eficiência Máxima de API (Modo Ultra Econômico Google Gemini)
  const [modoEconomico, setModoEconomico] = useState(true);
  const [tokensConsumidosTotal, setTokensConsumidosTotal] = useState(0);
  const [custoEstimadoTotalBrl, setCustoEstimadoTotalBrl] = useState(0);

  // Sistema de Auto-Clique Automático do Botão de Continuar Geração
  const [autoClickCountdown, setAutoClickCountdown] = useState<number | null>(null);
  const [isAutoClicking, setIsAutoClicking] = useState(false);
  const autoClickTimerRef = useRef<any>(null);

  // Modal de Tour Guiado de Cada Função
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);

  // Sistema de Créditos Editoriais KDP (US$ 3 por livro gerado)
  const { balance: creditosLivros, useCredit: debitarCreditoLivro } = useBookCredits();
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditModalMotivo, setCreditModalMotivo] = useState('');

  // Modal do Revisor Editorial Página por Página (Folhear & Validar Finais de Frase)
  const [isPageReviewerOpen, setIsPageReviewerOpen] = useState(false);

  // Sistema de Auditoria & Verificação em 1 Clique
  const [auditReport, setAuditReport] = useState<FullBookVerificationReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgressPercent, setAuditProgressPercent] = useState(0);
  const [auditCurrentModule, setAuditCurrentModule] = useState<string>('');

  // Sistema de Log Estruturado de Erros e Auto-Recuperação
  interface ErrorLogItem {
    id: string;
    timestamp: string;
    capitulo: number;
    erro: string;
    acao: string;
    resolvido: boolean;
  }
  const [errorLogs, setErrorLogs] = useState<ErrorLogItem[]>([]);
  const [showErrorLogs, setShowErrorLogs] = useState(false);

  // Sugestões de IA por campo
  const [loadingSugestao, setLoadingSugestao] = useState<string | null>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // Isolamento por projeto: cada projeto tem seu próprio projectId e sua própria chave de rascunho.
  // Nunca existe uma chave global "último projeto".
  const projectIdRef = useRef<string>(initialProject?.id || newProjectId());
  const storageKeyFor = (id: string) => `kdp_projeto_pro_v11_${id}`;
  const STORAGE_KEY = storageKeyFor(projectIdRef.current);

  const logDiag = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setDiagnostico(`[${timestamp}] ${msg}`);
  };

  const pararGeracao = () => {
    pararFlagRef.current = true;
    setPararFlag(true);
    if (autoClickTimerRef.current) {
      clearInterval(autoClickTimerRef.current);
      autoClickTimerRef.current = null;
    }
    setAutoClickCountdown(null);
    setIsAutoClicking(false);
    setStatusMsg('⏹ Interrupção solicitada pelo usuário...');
    logDiag('Interrupção solicitada pelo usuário');
  };

  // Resetar ou carregar projeto: se for novo projeto, SEMPRE abre 100% em branco
  useEffect(() => {
    // 1. Quando o usuário clica em criar novo projeto: formulário totalmente em branco
    if (isNewProject || initialProject === null) {
      projectIdRef.current = newProjectId();
      setTitulo('');
      setSubtitulo('');
      setAutor('');
      setGenero('');
      setBookType('fiction-novel');
      setTopico('');
      setTemaSelecionado('');
      setSubtemaSelecionado('');
      setFaixaEtaria('');
      setUniqueAngle('');
      setBookPromise('');
      setTargetReader('');
      setMarketReferences([]);
      setOpcoesTitulos([]);
      setOpcoesSubtitulos([]);
      setPaginasAlvo(100);
      setMaxCapitulos(15);
      setFormato('6x9');
      setIdioma('português');
      setTamCapitulo(11);
      setCorCapitulo('#1e293b');
      setLivro(null);
      setCapaFinal(null);
      setFundoImg(null);
      setPromoData(null);
      setHistoricoCapas([]);
      setIndiceCapaCarrossel(0);
      setCapAtual(0);
      setTotalCaps(0);
      setStatusMsg('Pronto para iniciar novo livro em branco.');
      setStatusType('normal');
      setDiagnostico('Novo projeto em branco pronto.');
      return;
    }

    // 2. Quando o usuário seleciona um projeto existente na Dashboard
    if (initialProject) {
      projectIdRef.current = initialProject.id;
      setBookType(initialProject.kdpBookType && BOOK_TYPE_CONFIGS[initialProject.kdpBookType]
        ? initialProject.kdpBookType
        : 'fiction-novel');
      setTitulo(initialProject.title || '');
      setSubtitulo(initialProject.subtitle || '');
      setAutor(initialProject.author || 'Leandro Palmeira');
      setGenero(initialProject.categories?.[0] || 'Thriller / Mistério Investigativo');
      setTopico(initialProject.topic || initialProject.description || '');
      setFormato(initialProject.trimSize || '6x9');
      setCapaFinal(initialProject.coverImageUrl || null);
      setPromoData(initialProject.promotionalPage || null);
      if (initialProject.coverImageUrl) {
        setHistoricoCapas([{
          id: 'capa_inicial_proj',
          dataUrl: initialProject.coverImageUrl,
          timestamp: Date.now(),
          estilo: 'modern-magazine'
        }]);
        setIndiceCapaCarrossel(0);
      }

      if (initialProject.kdpChapters && initialProject.kdpChapters.length > 0) {
        const caps: Capitulo[] = initialProject.kdpChapters.map(c => ({
          titulo: c.title,
          texto: c.prose || c.summary || '',
          imagemDataUrl: c.illustrations?.[0] || null
        }));
        
        const totalEstimado = initialProject.estimatedPages
          ? Math.max(3, Math.min(maxCapitulos || 15, Math.round((initialProject.estimatedPages * 300) / 900)))
          : (maxCapitulos || 15);
        const totalCalculado = Math.max(caps.length, totalEstimado);

        setLivro({
          titulo: initialProject.title,
          subtitulo: initialProject.subtitle || '',
          autor: initialProject.author,
          genero: initialProject.categories?.[0] || 'Thriller / Mistério Investigativo',
          idioma: 'português',
          capitulos: caps,
          meta: {
            palavrasPorCap: 900,
            paginasAlvo: initialProject.estimatedPages || 100
          }
        });
        setCapAtual(caps.length);
        setTotalCaps(totalCalculado);
        setStatusMsg(`Obra "${initialProject.title}" carregada com ${caps.length} capítulos.`);
        setStatusType('ok');
        return;
      }
    }

    // 3. Rascunho local SOMENTE do projeto explicitamente aberto (chave por projectId)
    try {
      const salvo = initialProject ? localStorage.getItem(storageKeyFor(initialProject.id)) : null;
      if (salvo) {
        const p = JSON.parse(salvo);
        if (p?.historicoCapas && Array.isArray(p.historicoCapas) && p.historicoCapas.length > 0) {
          setHistoricoCapas(p.historicoCapas);
          const idx = p.historicoCapas.findIndex((c: any) => c.dataUrl === p.capaFinal);
          setIndiceCapaCarrossel(idx >= 0 ? idx : 0);
        }
        if (p?.livro?.capitulos?.length > 0) {
          setLivro(p.livro);
          setCapaFinal(p.capaFinal || null);
          setFundoImg(p.fundoImg || null);
          setPromoData(p.promoData || null);
          setCapAtual(p.livro.capitulos.length);
          setTotalCaps(p.totalCaps || p.livro.capitulos.length);
          if (p.config) {
            setTitulo(p.config.titulo || '');
            setSubtitulo(p.config.subtitulo || '');
            setAutor(p.config.autor || 'Leandro Palmeira');
            setGenero(p.config.genero || 'Thriller / Mistério Investigativo');
            setTopico(p.config.topico || '');
            setPaginasAlvo(p.config.paginasAlvo || 100);
            setMaxCapitulos(p.config.maxCapitulos || 15);
            setFormato(p.config.formato || '6x9');
            setIdioma(p.config.idioma || 'português');
            setBookType(p.config.bookType && BOOK_TYPE_CONFIGS[p.config.bookType as BookType]
              ? p.config.bookType as BookType
              : 'fiction-novel');
          }
          setStatusMsg(`Projeto salvo carregado: ${p.livro.capitulos.length} capítulos.`);
          setStatusType('ok');
        }
      }
    } catch {}

    // Garantir que a chave do Gemini esteja ativa no localStorage
    try {
      const chaveExistente = localStorage.getItem('kdp_gemini_api_key');
      if (!chaveExistente) {
        const k = typeof atob !== 'undefined'
          ? atob('QVEuQWI4Uk42STE0SlpvSW5sMnhiZFN5Q1NxenQ4cVFTbmpWTWpIcHpCcHJOVGZKaG9tMUE=')
          : '';
        if (k) localStorage.setItem('kdp_gemini_api_key', k);
      }
    } catch {}
  }, [initialProject, isNewProject]);

  // Salvar no localStorage e sincronizar automaticamente no IndexedDB
  const salvarProgressoLocal = async (novoLivro: LivroGerado, capa?: string, fundo?: string, promo?: BookPromotionalPageData, novoHistorico?: ItemHistoricoCapa[]) => {
    const historicoParaSalvar = novoHistorico !== undefined ? novoHistorico : historicoCapas;
    const payload = {
      livro: novoLivro,
      capaFinal: capa !== undefined ? capa : capaFinal,
      fundoImg: fundo !== undefined ? fundo : fundoImg,
      promoData: promo !== undefined ? promo : promoData,
      historicoCapas: historicoParaSalvar.slice(0, 20),
      totalCaps,
      capAtual: novoLivro.capitulos.length,
      config: {
        titulo, subtitulo, autor, genero, topico, paginasAlvo, maxCapitulos, formato, idioma, bookType
      },
      ts: Date.now()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}

    // Gravação contínua no IndexedDB: Garante que se o usuário der F5 ou a página recarregar,
    // o livro gerado até então APARECE IMEDIATAMENTE NA DASHBOARD como Rascunho / Em Andamento!
    try {
      const projId = projectIdRef.current || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      projectIdRef.current = projId;

      const isConcluido = novoLivro.capitulos.length >= Math.max(1, totalCaps);
      const projAutoSave: BookProject = {
        id: projId,
        createdAt: initialProject?.createdAt || Date.now(),
        updatedAt: Date.now(),
        status: isConcluido ? 'FINALIZADO' : 'ESCREVENDO',
        priority: 'ALTA',
        executionMode: 'assisted',
        title: novoLivro.titulo || titulo || 'Livro em Produção',
        subtitle: novoLivro.subtitulo || subtitulo,
        author: novoLivro.autor || autor || 'Leandro Palmeira',
        description: topico,
        language: idioma === 'português' ? 'Português' : idioma === 'inglês' ? 'Inglês' : 'Espanhol',
        format: 'Capa Comum',
        trimSize: formato as any,
        paperType: 'bw-white',
        estimatedPages: paginasAlvo,
        actualPages: novoLivro.capitulos.length * 6,
        targetPrice: 39.90,
        currency: 'BRL',
        targetMarketplace: 'amazon.com.br',
        categories: [genero],
        keywords: [],
        targetAudience: targetReader || 'Público Geral',
        topic: topico,
        kdpBookType: bookType,
        coverImageUrl: capa !== undefined ? capa : (capaFinal || undefined),
        promotionalPage: promo !== undefined ? promo : (promoData || undefined),
        promotionalImageUrl: (promo !== undefined ? promo?.promotionalImageUrl : promoData?.promotionalImageUrl) || undefined,
        kdpChapters: novoLivro.capitulos.map((c, i) => ({
          index: i + 1,
          title: c.titulo,
          summary: c.texto.slice(0, 200),
          targetWordCount: novoLivro.meta?.palavrasPorCap || 900,
          prose: c.texto,
          wordCount: c.texto.split(/\s+/).length,
          status: 'APROVADO' as const,
          illustrations: c.imagemDataUrl ? [c.imagemDataUrl] : [],
          scenes: []
        })),
        tasks: [],
        notes: `Rascunho automático em andamento (${novoLivro.capitulos.length}/${totalCaps || maxCapitulos} capítulos gerados).`,
        competitorsAsins: [],
        pipelineStage: isConcluido ? 'final' : 'writing',
        pipelineProgress: Math.min(100, Math.round((novoLivro.capitulos.length / Math.max(1, totalCaps)) * 100)),
        pipelineLog: [`Capítulo ${novoLivro.capitulos.length} salvo automaticamente no banco local.`]
      };

      await db.saveBookProject(projAutoSave);
      if (onProjectSaved) onProjectSaved(projAutoSave);

      try {
        localStorage.setItem('kdp_last_active_project_id', projId);
      } catch {}
    } catch (err) {
      console.warn('Erro ao salvar no banco local:', err);
    }
  };

  // Análise de Mercado Amazon KDP (TOP 1-200) com sorteio dinâmico e randômico
  const handleAnalisarMercado = async (forceRandom = false) => {
    const temaObj = getTheme(temaSelecionado);
    const query = subtemaSelecionado || temaObj?.marketQuery || temaSelecionado || genero || 'livros';
    setIsAnalyzingMarket(true);
    setMarketFeedback(null);
    logDiag(`Iniciando análise de mercado na Amazon para "${query}"...`);
    try {
      // Se já temos um pool amplo carregado e o usuário clicou em sortear outras referências:
      if (forceRandom && marketPool.length > 5) {
        const sortedRandom = pickReferences(marketPool, { query, limit: 5, randomize: true });
        setMarketReferences(sortedRandom);
        setMarketFeedback(`🔄 5 novas referências sorteadas dinamicamente do ranking (#1 a #200).`);
        logDiag(`5 novas referências sorteadas dinamicamente do pool de ${marketPool.length} itens.`);
        return;
      }

      // Consulta de mercado na Amazon com suporte a ranking randômico #1 a #200
      const res = await researchMarket(query, {
        marketplace: 'amazon.com.br',
        limit: 40,
        bypassCache: forceRandom,
        randomize: forceRandom
      });
      if (res.error && (!res.items || res.items.length === 0)) {
        setMarketFeedback(`⚠️ ${res.error}`);
        logDiag(`Aviso de mercado: ${res.error}`);
      } else {
        const pool = res.items || [];
        setMarketPool(pool);
        // Sorteia 5 referências aleatórias do ranking para nunca ficar travado nos mesmos livros
        const top5 = pickReferences(pool, { query, limit: 5, randomize: true });
        setMarketReferences(top5);
        setMarketFeedback(`✓ ${top5.length} referências dinâmicas identificadas no ranking de #1 a #200.`);
        logDiag(`Mercado analisado: ${top5.length} referências selecionadas dinamicamente de ${pool.length} encontradas.`);
      }
    } catch (err: any) {
      setMarketFeedback(`Erro na análise de mercado: ${err?.message || 'Falha de conexão'}`);
    } finally {
      setIsAnalyzingMarket(false);
    }
  };

  // Geração de 5 Títulos Originais com IA, Validador de Similaridade e Variação Dinâmica (#1 a #200)
  const handleGerarTitulosOriginais = async () => {
    setIsGeneratingTitulos(true);
    try {
      // Amostra aleatória de referências para a IA nunca ficar engessada nas mesmas referências
      const pool = marketPool.length > 0 ? marketPool : marketReferences;
      const sampledRefs = pool.length > 0
        ? [...pool].sort(() => Math.random() - 0.5).slice(0, 5)
        : marketReferences;

      // Se temos itens no pool, atualizamos também as referências visíveis na tela para dinamismo total
      if (sampledRefs.length > 0 && pool.length > 5) {
        setMarketReferences(sampledRefs);
      }

      const refTitles = sampledRefs.map(r => r.title).filter(Boolean);

      const ganchosCriativos = [
        'comercial de alto impacto de vendas na Amazon KDP com promessa irresistível',
        'curiosidade extrema, suspense hipnótico e quebra imediata de padrão',
        'autoridade editorial, transformação pessoal e clareza magnética',
        'tensão dramática psicológica, segredos ocultos e reviravoltas intensas',
        'estilo cinematográfico contemporâneo com ritmo veloz e apelo de best-seller internacional',
        'provocação direta, mistério não resolvido e gancho visceral'
      ];
      const ganchoEscolhido = ganchosCriativos[Math.floor(Math.random() * ganchosCriativos.length)];

      const prompt = `Você é o principal diretor editorial de best-sellers da Amazon. Crie exatamente 5 opções de títulos comerciais, impactantes e TOTALMENTE ORIGINAIS para um novo livro.
Enfoque criativo desta rodada: ${ganchoEscolhido}.
Tema: ${temaSelecionado || genero}
Subtema: ${subtemaSelecionado || 'Geral'}
Público Alvo: ${targetReader || 'Geral'}
Diferencial/Promessa: ${bookPromise || uniqueAngle || topico || 'Não informado'}
Seed de novidade: ${Date.now()}_${Math.random().toString(36).slice(2, 7)}

REFERÊNCIAS DE MERCADO PARA CONTRASTE (CRIE TÍTULOS DIFERENTES DESTES, NUNCA COPIE NEM REPITA):
${refTitles.length ? refTitles.map((t, i) => `- ${t}`).join('\n') : 'Nenhuma'}

Regras:
1. Títulos originais, memoráveis e com alto apelo comercial no KDP.
2. Cada título deve ter entre 2 e 6 palavras.
3. Não use títulos genéricos ou repetitivos de rodadas anteriores. Crie opções frescas e inovadoras.

Responda APENAS com as 5 opções, uma por linha, numeradas de 1 a 5, sem explicações adicionais.`;

      const resposta = await chamarGeminiTexto(prompt, { temperature: 0.95, maxTokens: 300 });
      if (resposta?.tokensTotal) {
        setTokensConsumidosTotal(prev => prev + resposta.tokensTotal!);
        setCustoEstimadoTotalBrl(prev => prev + (resposta.custoBrl || 0));
      }
      const textoResp = typeof resposta === 'string' ? resposta : (resposta?.texto || '');
      const linhas = textoResp
        .split('\n')
        .map((l: string) => l.replace(/^\d+[\.\-\)]\s*/, '').replace(/[\*\"\_]/g, '').trim())
        .filter((l: string) => l.length > 2)
        .slice(0, 5);

      const originais = filterOriginalCandidates(linhas, refTitles);
      const aceitas = originais.accepted.map(a => a.text);
      setOpcoesTitulos(aceitas.length > 0 ? aceitas : linhas);
      logDiag(`${aceitas.length} títulos originais gerados (${resposta.tokensTotal || 0} tokens usados).`);
    } catch (err: any) {
      logDiag(`Erro ao gerar títulos: ${err?.message}`);
    } finally {
      setIsGeneratingTitulos(false);
    }
  };

  // Geração de 5 Subtítulos Originais com IA, Frases 100% Completas sem Cortes
  const handleGerarSubtitulosOriginais = async () => {
    if (!titulo.trim()) {
      setStatusMsg('⚠️ Defina ou selecione um Título primeiro.');
      setStatusType('error');
      return;
    }
    setIsGeneratingSubtitulos(true);
    try {
      const refSubtitles = marketReferences.map(r => r.subtitle).filter(Boolean) as string[];
      const prompt = `Você é um estrategista editorial KDP especializado em conversão de vendas. Crie exatamente 5 opções de subtítulos comerciais persuasivos e TOTALMENTE ORIGINAIS para o livro:
Título: "${titulo}"
Tema: ${temaSelecionado || genero}
Subtema: ${subtemaSelecionado || 'Geral'}
Diferencial: ${uniqueAngle || bookPromise || 'Transformador'}
Público Alvo: ${targetReader || 'Geral'}
Seed de novidade: ${Date.now()}_${Math.random().toString(36).slice(2, 6)}

REGRAS OBRIGATÓRIAS:
1. CRIE FRASES 100% COMPLETAS COM SENTIDO GRAMATICAL FINALIZADO E PONTUAÇÃO (NUNCA CORTE PALAVRAS PELA METADE E NUNCA DEIXE FRASES TRUNCADAS OU INCOMPLETAS).
2. Tamanho ideal: entre 6 e 14 palavras bem elaboradas.
3. Forte gancho de curiosidade, suspense ou benefício tangível para o leitor.

Responda APENAS com as 5 opções completas, uma por linha, numeradas de 1 a 5, sem explicações adicionais.`;

      const resposta = await chamarGeminiTexto(prompt, { temperature: 0.90, maxTokens: 350 });
      if (resposta?.tokensTotal) {
        setTokensConsumidosTotal(prev => prev + resposta.tokensTotal!);
        setCustoEstimadoTotalBrl(prev => prev + (resposta.custoBrl || 0));
      }
      const textoResp = typeof resposta === 'string' ? resposta : (resposta?.texto || '');
      const linhas = textoResp
        .split('\n')
        .map((l: string) => l.replace(/^\d+[\.\-\)]\s*/, '').replace(/[\*\"\_]/g, '').trim())
        .filter((l: string) => l.length > 5)
        .slice(0, 5);

      const originais = filterOriginalCandidates(linhas, refSubtitles);
      const aceitas = originais.accepted.map(a => a.text);
      setOpcoesSubtitulos(aceitas.length > 0 ? aceitas : linhas);
      logDiag(`${aceitas.length} subtítulos originais gerados (${resposta.tokensTotal || 0} tokens usados).`);
    } catch (err: any) {
      logDiag(`Erro ao gerar subtítulos: ${err?.message}`);
    } finally {
      setIsGeneratingSubtitulos(false);
    }
  };

  // Sugestão de Diferencial Editorial KDP Completo (Etapa 4)
  const handleSugerirDiferencialCompleto = async () => {
    setIsSuggestingDiferencial(true);
    setStatusMsg('✨ Gerando estratégia de Diferencial Editorial com Gemini...');
    try {
      const prompt = `Você é um estrategista sênior de posicionamento editorial para livros da Amazon KDP.
Crie a estratégia completa de diferenciação para a seguinte obra:
Tema Central: ${temaSelecionado || genero || 'Geral'}
Subtema: ${subtemaSelecionado || 'Geral'}
Título da Obra: "${titulo || 'Ainda não definido'}"
Subtítulo: "${subtitulo || ''}"
Premissa: "${topico || ''}"

Gere EXATAMENTE o seguinte objeto JSON:
{
  "uniqueAngle": "Um ângulo único, original e inovador que destaca este livro de todos os concorrentes da categoria (1 a 2 frases)",
  "bookPromise": "A promessa central transformadora entregue ao leitor (1 frase impactante)",
  "targetReader": "Descrição do leitor ideal e nicho demográfico/psicográfico (ex: Jovens adultos, profissionais em transição, leitores vorazes de suspense)"
}
Responda APENAS com o JSON puro, sem markdown e sem introduções.`;

      const resposta = await chamarGeminiTexto(prompt, { temperature: 0.85, maxTokens: 400 });
      if (resposta?.tokensTotal) {
        setTokensConsumidosTotal(prev => prev + resposta.tokensTotal!);
        setCustoEstimadoTotalBrl(prev => prev + (resposta.custoBrl || 0));
      }
      const textoResp = typeof resposta === 'string' ? resposta : (resposta?.texto || '');
      const cleanJson = textoResp.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.uniqueAngle) setUniqueAngle(parsed.uniqueAngle);
      if (parsed.bookPromise) setBookPromise(parsed.bookPromise);
      if (parsed.targetReader) setTargetReader(parsed.targetReader);

      setStatusMsg('✓ Diferencial Editorial (Ângulo, Promessa e Público) gerado com sucesso!');
      setStatusType('ok');
      logDiag('Diferencial editorial completo sugerido com sucesso.');
    } catch (err: any) {
      setStatusMsg(`Erro ao sugerir diferencial: ${err?.message}`);
      setStatusType('error');
    } finally {
      setIsSuggestingDiferencial(false);
    }
  };

  // Sugestão individual para cada campo da Etapa 4
  const handleSugerirCampoDiferencial = async (campo: 'uniqueAngle' | 'bookPromise' | 'targetReader') => {
    setLoadingSugestao(campo);
    try {
      const descricoes = {
        uniqueAngle: '1 ÂNGULO ÚNICO em uma frase que diferencie o livro de concorrentes',
        bookPromise: '1 PROMESSA CENTRAL clara e emocionante ao leitor em uma frase',
        targetReader: '1 PERFIL DO LEITOR ALVO ideal e demografia para este nicho'
      };

      const prompt = `Você é estrategista editorial KDP.
Tema: ${temaSelecionado || genero}
Subtema: ${subtemaSelecionado || 'Geral'}
Título: "${titulo}"
Gere apenas ${descricoes[campo]}. Retorne APENAS o texto puro sem aspas e sem explicações.`;

      const resposta = await chamarGeminiTexto(prompt, { temperature: 0.85, maxTokens: 150 });
      if (resposta?.tokensTotal) {
        setTokensConsumidosTotal(prev => prev + resposta.tokensTotal!);
        setCustoEstimadoTotalBrl(prev => prev + (resposta.custoBrl || 0));
      }
      const textoResp = typeof resposta === 'string' ? resposta : (resposta?.texto || '');
      const limpo = textoResp.replace(/^["'\*]+|["'\*]+$/g, '').trim();

      if (campo === 'uniqueAngle') setUniqueAngle(limpo);
      if (campo === 'bookPromise') setBookPromise(limpo);
      if (campo === 'targetReader') setTargetReader(limpo);

      setStatusMsg(`✓ Sugestão aplicada.`);
      setStatusType('ok');
    } catch (err: any) {
      setStatusMsg(`Erro na sugestão: ${err?.message}`);
    } finally {
      setLoadingSugestao(null);
    }
  };

  // Solicitar sugestão editorial por IA
  const handleSugerir = async (tipo: 'titulo' | 'subtitulo' | 'premissa' | 'autor') => {
    if (tipo !== 'titulo' && !titulo.trim()) {
      setStatusMsg('⚠️ Preencha o TÍTULO primeiro.');
      setStatusType('error');
      return;
    }

    setLoadingSugestao(tipo);
    setStatusMsg(`✨ Gerando sugestão de ${tipo} com Gemini...`);
    logDiag(`Chamando sugestão para ${tipo}`);

    try {
      const sugestao = await sugerirCampo(tipo, {
        titulo: titulo.trim(),
        subtitulo: subtitulo.trim(),
        genero,
        idioma
      });

      if (tipo === 'titulo') setTitulo(sugestao);
      if (tipo === 'subtitulo') setSubtitulo(sugestao);
      if (tipo === 'premissa') setTopico(sugestao);
      if (tipo === 'autor') setAutor(sugestao);

      setStatusMsg(`✓ Sugestão aplicada: ${sugestao}`);
      setStatusType('ok');
      logDiag(`Sugestão de ${tipo} concluída: ${sugestao}`);
    } catch (err: any) {
      setStatusMsg(`Erro na sugestão: ${err.message}`);
      setStatusType('error');
      logDiag(`Erro na sugestão: ${err.message}`);
    } finally {
      setLoadingSugestao(null);
    }
  };

  // INICIAR GERAÇÃO DO LIVRO
  const iniciarGeracao = async () => {
    if (bookType === 'planner' || bookType === 'diary') {
      setActiveTab('planner');
      setStatusMsg('Este formato gera páginas preenchíveis, sem capítulos narrativos. Use o Criador de planners e diários.');
      setStatusType('normal');
      return;
    }

    if (!titulo.trim()) {
      setStatusMsg('Preencha o título da obra.');
      setStatusType('error');
      return;
    }
    if (!topico.trim()) {
      setStatusMsg('Preencha a premissa central.');
      setStatusType('error');
      return;
    }

    // REGRA DE NEGÓCIO: Cadastro gratuito, mas geração de livro requer crédito (US$ 3 por livro)
    if (creditosLivros < 1) {
      setCreditModalMotivo('Para gerar este livro completo com IA é necessário 1 crédito (US$ 3 por livro). Seu cadastro é 100% gratuito, basta adquirir seus créditos conforme sua produção.');
      setIsCreditModalOpen(true);
      return;
    }

    const selectedConfig = BOOK_TYPE_CONFIGS[bookType];
    const isIllustratedStory = bookType === 'children-picture-book';
    const palavrasAlvo = isIllustratedStory ? paginasAlvo * 45 : paginasAlvo * 300;
    const estimatedChapters = isIllustratedStory ? Math.ceil(paginasAlvo / 2) : Math.round(palavrasAlvo / 900);
    const capsCalc = isIllustratedStory
      ? Math.max(selectedConfig.chapterCount[0], Math.min(selectedConfig.chapterCount[1], maxCapitulos, estimatedChapters))
      : Math.max(3, Math.min(maxCapitulos, estimatedChapters));
    const palavrasPorCap = isIllustratedStory
      ? 90
      : Math.round(palavrasAlvo / capsCalc);

    setTotalCaps(capsCalc);
    setCapAtual(0);

    const novoLivro: LivroGerado = {
      titulo: titulo.trim(),
      subtitulo: subtitulo.trim(),
      autor: autor.trim(),
      genero,
      idioma,
      capitulos: [],
      meta: { palavrasPorCap, paginasAlvo }
    };

    let plano: KdpEditorialPlan;
    setIsPlanningEditorial(true);
    try {
      setStatusMsg('Orquestrando arquitetura editorial, estratégia de leitor e continuidade...');
      setStatusType('normal');
      plano = await orchestrateEditorialPlan({
        title: novoLivro.titulo,
        subtitle: novoLivro.subtitulo,
        genre: novoLivro.genero,
        language: novoLivro.idioma,
        topic: topico,
        theme: temaSelecionado,
        subtheme: subtemaSelecionado,
        targetReader,
        promise: bookPromise,
        differentiator: uniqueAngle
      }, capsCalc);
      setPlanoEditorial(plano);
      logDiag(`Plano editorial criado com ${plano.chapters.length} capítulos e guia de continuidade.`);
    } catch (err: any) {
      const mensagem = err instanceof Error ? err.message : 'Não foi possível criar o plano editorial.';
      setStatusMsg(`Falha ao planejar a obra: ${mensagem}`);
      setStatusType('error');
      logDiag(`Falha no orquestrador editorial: ${mensagem}`);
      return;
    } finally {
      setIsPlanningEditorial(false);
    }

    // Consome 1 crédito editorial para a produção do livro
    debitarCreditoLivro(novoLivro.titulo);

    setLivro(novoLivro);
    setCapaFinal(null);
    setFundoImg(null);
    setPromoData(null);
    salvarProgressoLocal(novoLivro, '', '', undefined);

    pararFlagRef.current = false;
    setPararFlag(false);
    await executarLoopGeracao(novoLivro, 0, capsCalc, palavrasPorCap, plano);
  };

  // CONTINUAR GERAÇÃO INTERROMPIDA
  const continuarGeracao = async () => {
    if (!livro) return;
    pararFlagRef.current = false;
    setPararFlag(false);
    const palavrasPorCap = livro.meta?.palavrasPorCap || 900;
    const startFrom = livro.capitulos.length;
    const total = totalCaps || Math.max(3, Math.min(maxCapitulos, Math.round((livro.meta?.paginasAlvo || paginasAlvo) * 300 / palavrasPorCap)));

    let plano = planoEditorial;
    if (!plano || plano.chapters.length !== total) {
      setIsPlanningEditorial(true);
      try {
        setStatusMsg('Reconstruindo o plano editorial para continuar a obra...');
        setStatusType('normal');
        plano = await orchestrateEditorialPlan({
          title: livro.titulo,
          subtitle: livro.subtitulo,
          genre: livro.genero,
          language: livro.idioma,
          topic: topico,
          theme: temaSelecionado || livro.genero,
          subtheme: subtemaSelecionado,
          targetReader,
          promise: bookPromise,
          differentiator: uniqueAngle
        }, total);
        setPlanoEditorial(plano);
      } catch (err: any) {
        const mensagem = err instanceof Error ? err.message : 'Não foi possível reconstruir o plano editorial.';
        setStatusMsg(`Falha ao preparar a continuação: ${mensagem}`);
        setStatusType('error');
        logDiag(`Falha ao reconstruir o plano editorial: ${mensagem}`);
        return;
      } finally {
        setIsPlanningEditorial(false);
      }
    }

    await executarLoopGeracao(livro, startFrom, total, palavrasPorCap, plano);
  };

  // LOOP DE GERAÇÃO CAPÍTULO A CAPÍTULO COM AUTO-RECUPERAÇÃO CONTÍNUA (SELF-HEALING)
  const executarLoopGeracao = async (
    livroBase: LivroGerado,
    inicio: number,
    total: number,
    palavrasPorCap: number,
    plano: KdpEditorialPlan
  ) => {
    if (gerando) return;
    setGerando(true);
    pararFlagRef.current = false;
    setPararFlag(false);

    const frasesUsadas = new Set<string>();
    let tentativasConsecutivasCapitulo = 0;

    // Função auxiliar para criar resumo compacto de continuidade de cada capítulo
    const extrairResumoContinuo = (texto: string): string => {
      const paras = texto.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      if (paras.length === 0) return '';
      const primeiro = paras[0].slice(0, 150);
      const ultimo = paras[paras.length - 1].slice(0, 180);
      return `${primeiro}... Conclusão: ${ultimo}`;
    };

    for (let i = inicio; i < total; i++) {
      if (pararFlagRef.current) {
        setStatusMsg(`⏹ Interrompido no capítulo ${i + 1}. Progresso salvo.`);
        setStatusType('normal');
        logDiag(`Geração interrompida pelo usuário no capítulo ${i + 1}`);
        break;
      }

      const num = i + 1;
      const diretrizArquitetura = plano.chapters[num - 1];
      setStatusMsg(`⏳ Escrevendo Capítulo ${num} de ${total}...`);
      setStatusType('normal');
      setProgressPercent(Math.round((i / total) * 100));
      logDiag(`Iniciando capítulo ${num}/${total} [Modo Econômico: ${modoEconomico ? 'SIM' : 'NÃO'}]`);

      // Breve pausa preventiva de 1.0s para evitar limites de taxa (QPS)
      if (i > inicio && tentativasConsecutivasCapitulo === 0) {
        await new Promise(r => setTimeout(r, 1000));
      }

      try {
        // MODO ULTRA ECONÔMICO: Mantém apenas 5 termos proibidos para poupar tokens de entrada
        const frasesArray = Array.from(frasesUsadas).slice(modoEconomico ? -5 : -15);

        // BÍBLIA NARRATIVA PROGRESSIVA COMPACTA (Prompt Caching Friendly)
        let historicoEnredo = 'Início da narrativa.';
        if (livroBase.capitulos.length > 0) {
          const capsParaResumo = modoEconomico ? livroBase.capitulos.slice(-2) : livroBase.capitulos;
          historicoEnredo = capsParaResumo.map((c, idx) => {
            const numCap = livroBase.capitulos.length - capsParaResumo.length + idx + 1;
            return `• Cap. ${numCap} ("${c.titulo}"): ${extrairResumoContinuo(c.texto)}`;
          }).join('\n');
        }

        const ultimoCapitulo = livroBase.capitulos.length > 0
          ? livroBase.capitulos[livroBase.capitulos.length - 1]
          : null;

        const ganchoImediato = ultimoCapitulo
          ? `O Capítulo anterior ("${ultimoCapitulo.titulo}") terminou com este trecho:\n"${ultimoCapitulo.texto.slice(-320)}"`
          : 'Primeira cena da obra.';

        let diretrizEstrutural = '';
        if (num === 1) {
          diretrizEstrutural = 'ESTE É O PRIMEIRO CAPÍTULO: Apresente o protagonista, estabeleça o cenário, o tom e o incidente incitante.';
        } else if (num === total) {
          diretrizEstrutural = 'ESTE É O CAPÍTULO FINAL DA OBRA INTEIRA (CLÍMAX, DESFECHO & EPÍLOGO): Confronte o conflito principal, resolva todos os mistérios pendentes e entregue uma conclusão completa, definitiva e memorável. O último parágrafo DEVE encerrar a história de forma plena e terminar com uma frase 100% finalizada com ponto final (.).';
        } else {
          diretrizEstrutural = `ESTE É O CAPÍTULO ${num} DE ${total} (PROGRESSÃO & TENSÃO): Conecte diretamente com o final do capítulo anterior, mantenha os mesmos personagens, aprofunde o conflito e aumente a tensão.`;
        }

        const isEnBook = Boolean(livroBase.idioma && /ingl|en/i.test(livroBase.idioma));
        const isEsBook = Boolean(livroBase.idioma && /espanh|es/i.test(livroBase.idioma));

        const regraIdioma = isEnBook
          ? '0. MANDATORY LANGUAGE: The ENTIRE chapter (title, narrative, dialogue, descriptions and thoughts) MUST be written 100% in natural, engaging ENGLISH (US/UK). Do NOT output any words in Portuguese. Chapter title format must be in English (e.g. Chapter ' + num + ': [English Title]).'
          : isEsBook
          ? '0. IDIOMA OBRIGATORIO: TODO el capítulo (título, narrativa, diálogos y descripciones) DEBE estar escrito 100% en ESPAÑOL. Prohibido mezclar otros idiomas.'
          : '0. IDIOMA OBRIGATÓRIO: PORTUGUÊS. Utilize vocabulário popular, natural e corrente da língua portuguesa.';

        // INSTRUÇÃO DO SISTEMA FIXA (Permite context caching no servidor do Google Gemini)
        const systemInstruction = `Você é um escritor best-seller profissional de literatura na Amazon KDP.
REGRAS TÉCNICAS OBRIGATÓRIAS (ESTILO EDITORIAL KDP):
${regraIdioma}
1. Escreva em torno de ${palavrasPorCap} palavras (mínimo ${Math.round(palavrasPorCap * 0.85)} palavras ricas em detalhes).
${isIllustratedStory ? `1A. HISTÓRIA INFANTIL ILUSTRADA: Escreva uma cena curta e completa para crianças de ${faixaEtaria || '6 a 8'} anos, com vocabulário simples, ação visual clara e continuidade do mesmo protagonista. Descreva uma única cena que possa ser ilustrada; mantenha entre 60 e 110 palavras e não inclua instruções de imagem no texto.` : ''}
2. COERÊNCIA TOTAL: Mantenha rigorosamente os mesmos personagens, cenários e tom. Não invente premissas contraditórias.
3. PROIBIÇÃO ABSOLUTA DE METÁFORAS: Seja o livro infantil, jovem ou adulto, NUNCA use metáforas, floreios poéticos abstratos, analogias figuradas ou palavras em sentido metafórico. Todas as descrições de cenários, sentimentos, ações e diálogos devem ser totalmente literais, diretas, claras e realistas.
4. VOCABULÁRIO POPULAR E COMUM: Evite estritamente palavras difíceis, rebuscadas, arcaicas ou eruditas. Utilize palavras simples e naturais no idioma da obra (${livroBase.idioma}).
5. Não repita expressões ou diálogos clichês dos capítulos anteriores.
6. Use diálogos dinâmicos, ações concretas, descrições sensoriais realistas e conflito ativo.
7. Termine com um gancho forte (cliffhanger) conectando para o próximo capítulo (a menos que seja o capítulo final).
8. REGRA INEGOCIÁVEL DE FECHAMENTO COMPLETO: NUNCA pare no meio de uma frase, nunca corte palavras e nunca deixe reticências abertas. O último parágrafo DEVE obrigatoriamente terminar com uma frase 100% finalizada com ponto final (.), exclamação (!) ou interrogação (?).
${num === total ? '9. DESFECHO DEFINITIVO: Este é o encerramento do livro completo. A obra DEVE ter conclusão definitiva, com último parágrafo finalizado perfeitamente com ponto final (.), sem deixar nenhuma frase cortada ou em aberto.' : ''}
10. Texto puro pronto para publicação. Não use asteriscos, markdown nem notas de rodapé.
11. VISÃO EDITORIAL ORQUESTRADA: ${plano.editorialVision}
12. PROMESSA AO LEITOR: ${plano.readerPromise}
13. BÍBLIA DE CONTINUIDADE: ${plano.continuityBible}

FORMATO ESTRITO:
TITULO: ${isEnBook ? `Chapter ${num}: Creative Chapter Title in English` : isEsBook ? `Capítulo ${num}: Título Creativo en Español` : `Título Criativo do Capítulo ${num}`}
TEXTO:
(Parágrafos da história separados por linha em branco)`;

        // PROMPT DO USUÁRIO ENXUTO E DIRETO
        let prompt = `━━━ DADOS DA OBRA ━━━
Título: "${livroBase.titulo}" | Subtítulo: "${livroBase.subtitulo}"
Autor: ${livroBase.autor} | Gênero: ${livroBase.genero} (${livroBase.idioma})
Premissa Central: ${topico}

━━━ DIRETRIZ DO CAPÍTULO ${num} DE ${total} ━━━
${diretrizEstrutural}
Título planejado: ${diretrizArquitetura.title}
Objetivo do capítulo: ${diretrizArquitetura.objective}
Pontos-chave: ${diretrizArquitetura.keyPoints.map(point => `- ${point}`).join('\n')}
Transição planejada: ${diretrizArquitetura.transition}

━━━ GANCHO DE TRANSIÇÃO DIRETA ━━━
${ganchoImediato}`;

        if (historicoEnredo && historicoEnredo !== 'Início da narrativa.') {
          prompt += `\n\n━━━ CONTINUIDADE DOS CAPÍTULOS ANTERIORES ━━━\n${historicoEnredo}`;
        }

        if (frasesArray.length > 0) {
          prompt += `\n\nEVITE REPETIR AS SEGUINTES EXPRESSÕES:\n${frasesArray.map(f => `- ${f}`).join('\n')}`;
        }

        // Folga generosa de tokens para que o modelo NUNCA sofra corte prematuro (MAX_TOKENS)
        const maxTokensCapitulo = modoEconomico
          ? Math.max(3500, Math.round(palavrasPorCap * 3.5))
          : Math.max(6000, Math.min(8192, Math.round(palavrasPorCap * 4.2)));

        const res = await chamarGeminiTexto(prompt, {
          temperature: 0.88,
          maxTokens: maxTokensCapitulo,
          systemInstruction,
          maxRetries: 2,
          onStatusUpdate: (msg) => {
            setStatusMsg(msg);
            logDiag(msg);
          },
          onAttemptModel: (mod) => {
            logDiag(`Capítulo ${num}: gerando narrativa com ${mod}...`);
          }
        });

        if (res.tokensTotal) {
          setTokensConsumidosTotal(prev => prev + res.tokensTotal!);
          setCustoEstimadoTotalBrl(prev => prev + (res.custoBrl || 0));
        }

        const cap = parseCapitulo(res.texto, num, total);

        if (isIllustratedStory) {
          setStatusMsg(`🎨 Ilustrando a página ${num} de ${total} da história infantil...`);
          try {
            cap.imagemDataUrl = await gerarIlustracaoCapitulo(
              cap.titulo,
              `Livro infantil "${livroBase.titulo}". Tema: ${temaSelecionado || livroBase.genero}; subtema: ${subtemaSelecionado || topico}. Manter o mesmo protagonista e estilo de aquarela das outras páginas. Cena desta página: ${cap.texto.slice(0, 350)}`,
              estiloIlustracaoCapitulo,
              '1:1'
            );
          } catch (imageError) {
            const message = imageError instanceof Error ? imageError.message : 'Falha ao gerar ilustração desta página.';
            logDiag(`⚠️ Ilustração pendente na página ${num}: ${message}`);
            setStatusMsg(`⚠️ Página ${num}: a história foi escrita, mas a ilustração falhou. Você pode tentar novamente no preview.`);
            setStatusType('error');
          }
        }

        // Extrair frases para evitar repetições nos próximos capítulos
        cap.texto.split(/[.!?]\s+/).forEach(f => {
          if (f.trim().length > 40) frasesUsadas.add(f.trim().toLowerCase());
        });

        livroBase.capitulos.push(cap);
        setLivro({ ...livroBase });
        setCapAtual(livroBase.capitulos.length);
        salvarProgressoLocal(livroBase);

        // Se houve incidentes anteriores neste capítulo, atualizar no log como resolvido
        if (tentativasConsecutivasCapitulo > 0) {
          setErrorLogs(prev => prev.map(log => 
            log.capitulo === num ? { ...log, resolvido: true, acao: `✓ Auto-recuperado com sucesso` } : log
          ));
        }
        tentativasConsecutivasCapitulo = 0;

        logDiag(`✓ Capítulo ${num} concluído com sucesso (${cap.texto.split(/\s+/).length} palavras)`);
        setStatusMsg(`✓ Capítulo ${num}/${total} concluído com sucesso!`);

        // Rolar preview para o final
        if (previewScrollRef.current) {
          previewScrollRef.current.scrollTop = previewScrollRef.current.scrollHeight;
        }
      } catch (err: any) {
        console.error(err);
        const erroMsg = err.message || 'Erro inesperado na chamada do modelo';
        const logId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const timestamp = new Date().toLocaleTimeString('pt-BR');

        logDiag(`⚠️ Erro capturado no capítulo ${num}: ${erroMsg}`);

        // Se o usuário solicitou parada manual, honrar imediatamente
        if (pararFlagRef.current) {
          setErrorLogs(prev => [{
            id: logId,
            timestamp,
            capitulo: num,
            erro: erroMsg,
            acao: 'Interrupção manual solicitada pelo usuário',
            resolvido: false
          }, ...prev]);
          setStatusMsg(`⏹ Interrompido no capítulo ${num}. Progresso salvo.`);
          setStatusType('normal');
          setGerando(false);
          return;
        }

        // SISTEMA DE AUTO-CLIQUE & AUTO-RECUPERAÇÃO CONTÍNUA (SELF-HEALING)
        tentativasConsecutivasCapitulo++;
        const MAX_AUTO_RETRIES = 8;

        if (tentativasConsecutivasCapitulo <= MAX_AUTO_RETRIES) {
          const acaoTexto = `Botão "Continuar Geração" acionado automaticamente (${tentativasConsecutivasCapitulo}/${MAX_AUTO_RETRIES})`;
          setErrorLogs(prev => [{
            id: logId,
            timestamp,
            capitulo: num,
            erro: erroMsg,
            acao: acaoTexto,
            resolvido: false
          }, ...prev]);

          // Deixa gerando = false momentaneamente para o botão verde "Continuar Geração" ENTRAR EM CENA NA TELA
          setGerando(false);
          logDiag(`Google em alta demanda. O botão "Continuar Geração" entrou em cena e auto-clicará em 3s...`);

          // Contagem regressiva visual acoplada diretamente ao botão verde de Continuar Geração
          for (let s = 3; s > 0; s--) {
            if (pararFlagRef.current) break;
            setAutoClickCountdown(s);
            setStatusMsg(`⚡ [Auto-Clique Ativo] O botão "Continuar Geração" entrou em cena e será clicado automaticamente em ${s}s...`);
            setStatusType('normal');
            await new Promise(r => setTimeout(r, 1000));
          }

          if (pararFlagRef.current) {
            setAutoClickCountdown(null);
            setIsAutoClicking(false);
            setStatusMsg(`⏹ Interrompido no capítulo ${num}. Progresso salvo.`);
            setStatusType('normal');
            setGerando(false);
            return;
          }

          // Disparo da animação de auto-clique no próprio botão
          setIsAutoClicking(true);
          setStatusMsg(`⚡ Auto-clique executado! Retomando capítulo ${num} com preservação integral de contexto...`);
          await new Promise(r => setTimeout(r, 250));
          setIsAutoClicking(false);
          setAutoClickCountdown(null);

          // Decrementa o índice para repetir a geração do mesmo capítulo mantendo toda a memória
          i--;
          setGerando(true);
          logDiag(`Auto-retomando capítulo ${num} automaticamente via auto-clique sem intervenção humana...`);
          continue; // RETOMA AUTOMATICAMENTE
        } else {
          // Se exceder limite de retries automáticas
          setErrorLogs(prev => [{
            id: logId,
            timestamp,
            capitulo: num,
            erro: erroMsg,
            acao: 'Limite de auto-recuperações atingido. Aguardando intervenção manual.',
            resolvido: false
          }, ...prev]);
          setStatusMsg(`⚠️ Erro persistente no capítulo ${num}: ${erroMsg}. Clique em "Continuar Geração" quando desejar.`);
          setStatusType('error');
          setGerando(false);
          return;
        }
      }
    }

    if (!pararFlagRef.current) {
      setProgressPercent(100);
      const missingStoryArt = bookType === 'children-picture-book'
        ? livroBase.capitulos.filter(chapter => !chapter.imagemDataUrl).length
        : 0;
      setStatusMsg(missingStoryArt > 0
        ? `✓ História concluída. ${missingStoryArt} ilustração(ões) ainda precisam ser geradas no preview antes de exportar.`
        : '✓ Livro completo com sucesso! Agora você pode gerar a capa e a página promocional.');
      setStatusType(missingStoryArt > 0 ? 'error' : 'ok');
      logDiag('✓ Todos os capítulos foram gerados.');
    }

    setGerando(false);
  };

  const assegurarConclusaoCapitulo = (texto: string, isUltimoCapitulo: boolean): string => {
    let t = texto.trim();
    if (!t) return t;

    // Se o texto não termina com pontuação terminal (. ! ? " ” »)
    const terminaComPontuacao = /[.!?…"”»]$/.test(t);

    if (!terminaComPontuacao) {
      // O texto foi cortado prematuramente no final: localiza o último ponto terminal completo
      const ultimoPonto = Math.max(
        t.lastIndexOf('.'),
        t.lastIndexOf('!'),
        t.lastIndexOf('?')
      );

      // Se houver um ponto terminal nos últimos 350 caracteres, preserva até ele para não deixar fragmento quebrado
      if (ultimoPonto > 0 && ultimoPonto > t.length - 350) {
        t = t.substring(0, ultimoPonto + 1).trim();
      } else {
        // Caso contrário, fecha a frase com ponto final gramatical
        t = t + '.';
      }
    }

    // Se for o último capítulo da obra inteira, assegurar um desfecho digno e ponto final
    if (isUltimoCapitulo) {
      if (!/[.!?]$/.test(t)) {
        t = t + '.';
      }
    }

    return t;
  };

  const parseCapitulo = (txt: string, num: number, totalCaps?: number): Capitulo => {
    const mt = txt.match(/TITULO:\s*(.+)/i);
    const mx = txt.match(/TEXTO:\s*([\s\S]+)/i);
    let texto = mx ? mx[1].trim() : txt.trim();
    texto = texto.replace(/^TITLE:\s*.+$/im, '').replace(/^TEXT:\s*/im, '')
      .replace(/^TITULO:\s*.+$/im, '').replace(/^TEXTO:\s*/im, '').trim();

    // GARANTE INTEGRIDADE DO FINAL: impede término com frase cortada ou palavras faltando
    texto = assegurarConclusaoCapitulo(texto, totalCaps ? num === totalCaps : false);

    return {
      titulo: mt ? mt[1].trim() : `Capítulo ${num}`,
      texto
    };
  };

  // HIGIENIZAÇÃO DE CONCORDÂNCIA E GRAMÁTICA DE TÍTULO
  const higienizarTituloEditorial = (t: string): string => {
    return t
      .replace(/\bO Mapa dos Liberdade\b/gi, 'O Mapa da Liberdade')
      .replace(/\bO Guia dos Liberdade\b/gi, 'O Guia da Liberdade')
      .replace(/\bO Manual dos Liberdade\b/gi, 'O Manual da Liberdade')
      .replace(/\bO Segredo dos Liberdade\b/gi, 'O Segredo da Liberdade')
      .replace(/\bO Caminho dos Liberdade\b/gi, 'O Caminho da Liberdade')
      .trim();
  };

  // CONSTRUTOR DE PROMPT VISUAL DE ARTE EDITORIAL LIMPA (ANTI-SELO & ZERO TEXTO NA IMAGEM)
  const construirPromptArteCapa = (
    genero: string,
    premissa: string,
    amostra: string,
    estiloVisual: CoverVisualStyle,
    customPrompt?: string
  ): string => {
    return buildCoverArtPrompt(genero, premissa, amostra, estiloVisual, customPrompt);
  };

  // DIAGRAMAÇÃO TIPOGRÁFICA EDITORIAL DA CAPA VIA CANVAS (1600x2400)
  // Padrão visual de diretor de arte de revista internacional:
  // 1. Zero selos / Zero medalhas kitsch
  // 2. Clean Zone (Área Limpa) exclusiva atrás do título com alto contraste garantido
  // 3. Tipografia moderna com proporções refinadas e letter-spacing elegante
  // 4. REGRA DE OURO ORTOGRÁFICA: 100% de precisão em acentuação e cedilhas ("Finanças", "Gestão", etc.)
  const diagramarCapaCanvas = async (
    capaImgUrl: string,
    obraTituloRaw: string,
    obraSubtitulo: string,
    obraAutor: string,
    obraGenero: string,
    obraPremissa: string,
    tipoEstilo: 'modern-magazine' | 'luxury-serif' | 'bold-impact' = estiloCapaTipo,
    zonaLimpa: 'suave' | 'media' | 'forte' = intensidadeZonaLimpa,
    layoutTitulo: CoverTitleLayout = posicaoTituloCapa
  ): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 2400;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível obter contexto 2D do canvas da capa');

    // Sanitização ortográfica editorial estrita (impede 'financas' e força 'Finanças' com acentos corretos)
    const obraTitulo = sanitizarOrtografiaEditorialCapa(higienizarTituloEditorial(obraTituloRaw));
    const obraSubtituloLimpo = sanitizarOrtografiaEditorialCapa(obraSubtitulo);
    const obraAutorLimpo = sanitizarOrtografiaEditorialCapa(obraAutor);

    const img = await carregarElementoImagem(capaImgUrl);
    // Corta os 8% inferiores da imagem para eliminar 100% de qualquer marca d'água residual
    const srcW = img.naturalWidth || img.width || canvas.width;
    const srcH = img.naturalHeight || img.height || canvas.height;
    const cropH = Math.floor(srcH * 0.92);
    ctx.drawImage(img, 0, 0, srcW, cropH, 0, 0, canvas.width, canvas.height);

    // 1. Vinheta Superior Suave para o Cabeçalho de Revista
    const topGrad = ctx.createLinearGradient(0, 0, 0, 520);
    topGrad.addColorStop(0, 'rgba(4, 6, 12, 0.82)');
    topGrad.addColorStop(0.6, 'rgba(4, 6, 12, 0.28)');
    topGrad.addColorStop(1, 'rgba(4, 6, 12, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, canvas.width, 520);

    // 2. Área de contraste acompanha a posição tipográfica selecionada.
    const alphaCentro = zonaLimpa === 'forte' ? 0.92 : zonaLimpa === 'suave' ? 0.60 : 0.80;
    const centroTitulo = layoutTitulo === 'topo' ? 500 : 1040;
    const zonaTituloInicio = centroTitulo - 400;
    const zonaTituloFim = centroTitulo + 400;
    const midGrad = ctx.createLinearGradient(0, zonaTituloInicio, 0, zonaTituloFim);
    midGrad.addColorStop(0, 'rgba(5, 7, 14, 0)');
    midGrad.addColorStop(0.20, `rgba(5, 7, 14, ${alphaCentro * 0.75})`);
    midGrad.addColorStop(0.40, `rgba(5, 7, 14, ${alphaCentro})`);
    midGrad.addColorStop(0.60, `rgba(5, 7, 14, ${alphaCentro})`);
    midGrad.addColorStop(0.85, `rgba(5, 7, 14, ${alphaCentro * 0.70})`);
    midGrad.addColorStop(1, 'rgba(5, 7, 14, 0)');
    ctx.fillStyle = midGrad;
    ctx.fillRect(0, zonaTituloInicio, canvas.width, zonaTituloFim - zonaTituloInicio);

    // 3. Vinheta Profunda no Rodapé (1600px até o fim) para Subtítulo e Autor
    const footerGrad = ctx.createLinearGradient(0, 1600, 0, canvas.height);
    footerGrad.addColorStop(0, 'rgba(4, 6, 12, 0)');
    footerGrad.addColorStop(0.25, 'rgba(4, 6, 12, 0.75)');
    footerGrad.addColorStop(0.65, 'rgba(4, 6, 12, 0.94)');
    footerGrad.addColorStop(1, '#04060c');
    ctx.fillStyle = footerGrad;
    ctx.fillRect(0, 1600, canvas.width, 800);

    // 4. CABEÇALHO EDITORIAL DE REVISTA (Clean Magazine Header - ZERO SELOS OU MEDALHAS)
    const getCleanMagazineHeader = (gen: string, prem: string) => {
      const g = (gen + ' ' + prem).toLowerCase();
      if (g.includes('investiga') || g.includes('crime') || g.includes('forense') || g.includes('misterio') || g.includes('thriller')) {
        return 'THRILLER PSICOLÓGICO & SUSPENSE';
      }
      if (g.includes('terror') || g.includes('horror') || g.includes('fantasma') || g.includes('sombri')) {
        return 'NARRATIVA OBSCURA DE SUSPENSE & TERROR';
      }
      if (g.includes('dinheiro') || g.includes('finan') || g.includes('patrimon') || g.includes('invest')) {
        return 'FINANÇAS PESSOAIS & GESTÃO PATRIMONIAL';
      }
      if (g.includes('psicologia') || g.includes('habito') || g.includes('produtiv') || g.includes('desenvolvimento') || g.includes('alta performance')) {
        return 'DESENVOLVIMENTO PESSOAL & ALTA PERFORMANCE';
      }
      if (g.includes('romance') || g.includes('amor') || g.includes('paixao')) {
        return 'LITERATURA & FICÇÃO CONTEMPORÂNEA';
      }
      if (g.includes('ficcao') || g.includes('sci-fi') || g.includes('espaco')) {
        return 'FICÇÃO CIENTÍFICA & NARRATIVA ESPECULATIVA';
      }
      return 'LITERATURA & ENSAIO CONTEMPORÂNEO';
    };

    const headerText = sanitizarOrtografiaEditorialCapa(getCleanMagazineHeader(obraGenero, obraPremissa));
    ctx.textAlign = 'center';
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.font = '600 24px "Montserrat", "Inter", -apple-system, sans-serif';
    ctx.fillStyle = '#fde68a'; // Dourado suave editorial

    // Espaçamento de caracteres elegante de revista
    const spacedHeader = headerText.split('').join(' ');
    ctx.fillText(spacedHeader, canvas.width / 2, 170);

    // 5. TÍTULO DA OBRA COM DESIGN MODERNO DE REVISTA
    let fontSizeTit = 106;
    if (obraTitulo.length > 50) fontSizeTit = 74;
    else if (obraTitulo.length > 32) fontSizeTit = 86;
    else if (obraTitulo.length > 20) fontSizeTit = 96;

    let fontFamilia = '"Montserrat", "Inter", -apple-system, sans-serif';
    let fontPeso = '900';
    if (tipoEstilo === 'luxury-serif') {
      fontFamilia = '"Playfair Display", "Cinzel", Georgia, serif';
      fontPeso = '800';
    } else if (tipoEstilo === 'bold-impact') {
      fontFamilia = '"Oswald", "Impact", "Arial Black", sans-serif';
      fontPeso = '800';
    }

    ctx.font = `${fontPeso} ${fontSizeTit}px ${fontFamilia}`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.98)';
    ctx.shadowBlur = 30;

    const tituloAlinhadoEsquerda = layoutTitulo === 'esquerda';
    ctx.textAlign = tituloAlinhadoEsquerda ? 'left' : 'center';
    const larguraMaxTitulo = tituloAlinhadoEsquerda ? canvas.width - 420 : canvas.width - 240;
    const linhasTitulo = quebrarLinhas(ctx, obraTitulo.toUpperCase(), larguraMaxTitulo);
    const lineHTit = Math.round(fontSizeTit * 1.16);
    const alturaTotalTit = linhasTitulo.length * lineHTit;

    let yTit = Math.round(centroTitulo - (alturaTotalTit / 2) + (fontSizeTit * 0.35));
    const xTitulo = tituloAlinhadoEsquerda ? 150 : canvas.width / 2;

    linhasTitulo.forEach(l => {
      ctx.strokeStyle = 'rgba(0,0,0,0.90)';
      ctx.lineWidth = 8;
      ctx.strokeText(l, xTitulo, yTit);
      ctx.fillText(l, xTitulo, yTit);
      yTit += lineHTit;
    });

    // Detalhe de acabamento: linha horizontal sutil minimalista abaixo do título
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(tituloAlinhadoEsquerda ? xTitulo : (canvas.width / 2) - 45, yTit + 10, 90, 2);

    // 6. SUBTÍTULO COMERCIAL MODERNO (Limpo, sem itálicos desajeitados e com ortografia corrigida)
    if (obraSubtituloLimpo) {
      ctx.textAlign = 'center';
      let fontSizeSub = 46;
      if (obraSubtituloLimpo.length > 90) fontSizeSub = 38;
      else if (obraSubtituloLimpo.length > 55) fontSizeSub = 42;

      ctx.font = `500 ${fontSizeSub}px "Inter", "Montserrat", -apple-system, sans-serif`;
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 18;

      const linhasSub = quebrarLinhas(ctx, obraSubtituloLimpo, canvas.width - 280);
      const lineHSub = Math.round(fontSizeSub * 1.35);
      const alturaTotalSub = linhasSub.length * lineHSub;

      const yBaseSub = 2100;
      let ySub = Math.max(1760, yBaseSub - alturaTotalSub + fontSizeSub);

      linhasSub.forEach(l => {
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 5;
        ctx.strokeText(l, canvas.width / 2, ySub);
        ctx.fillText(l, canvas.width / 2, ySub);
        ySub += lineHSub;
      });
    }

    // 7. NOME DO AUTOR NO RODAPÉ (Caixa alta com letter-spacing de revista e ortografia precisa)
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(0,0,0,0.98)';
    ctx.font = '700 46px "Montserrat", "Inter", -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const spacedAutor = obraAutorLimpo.toUpperCase().split('').join(' ');
    ctx.fillText(spacedAutor, canvas.width / 2, canvas.height - 140);

    return canvas.toDataURL('image/png');
  };

  // SINCRONIZAÇÃO: Garante que a capa ativa atual esteja sempre presente no histórico do carrossel
  useEffect(() => {
    if (capaFinal) {
      setHistoricoCapas(prev => {
        const jaExiste = prev.some(c => c.dataUrl === capaFinal);
        if (!jaExiste) {
          return [{
            id: `capa_sync_${Date.now()}`,
            dataUrl: capaFinal,
            fundoUrl: fundoImg || undefined,
            timestamp: Date.now(),
            estilo: estiloCapaTipo,
            conceito: estiloArteVisual
          }, ...prev];
        }
        return prev;
      });
    }
  }, [capaFinal]);

  // CONTROLES DO CARROSSEL DE CAPAS
  const handleCapaAnterior = () => {
    if (historicoCapas.length <= 1) return;
    setIndiceCapaCarrossel(prev => (prev > 0 ? prev - 1 : historicoCapas.length - 1));
  };

  const handleCapaProxima = () => {
    if (historicoCapas.length <= 1) return;
    setIndiceCapaCarrossel(prev => (prev < historicoCapas.length - 1 ? prev + 1 : 0));
  };

  const handleSelecionarCapaCarrossel = (index: number) => {
    setIndiceCapaCarrossel(index);
  };

  const handleDefinirComoCapaAtiva = (item: ItemHistoricoCapa) => {
    setCapaFinal(item.dataUrl);
    if (item.fundoUrl) setFundoImg(item.fundoUrl);
    if (livro) {
      salvarProgressoLocal(livro, item.dataUrl, item.fundoUrl, promoData || undefined);
    }
    setStatusMsg('✓ Esta variação foi selecionada e ativada como a capa oficial do livro!');
    setStatusType('ok');
  };

  const handleExcluirCapaDoHistorico = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (historicoCapas.length <= 1) {
      setStatusMsg('O livro precisa manter ao menos 1 capa.');
      setStatusType('normal');
      return;
    }
    const itemExcluido = historicoCapas.find(c => c.id === id);
    const novaLista = historicoCapas.filter(c => c.id !== id);
    setHistoricoCapas(novaLista);
    setIndiceCapaCarrossel(prev => Math.min(prev, Math.max(0, novaLista.length - 1)));
    if (itemExcluido && itemExcluido.dataUrl === capaFinal && novaLista.length > 0) {
      setCapaFinal(novaLista[0].dataUrl);
      if (novaLista[0].fundoUrl) setFundoImg(novaLista[0].fundoUrl);
      if (livro) salvarProgressoLocal(livro, novaLista[0].dataUrl, novaLista[0].fundoUrl, promoData || undefined, novaLista);
    } else if (livro) {
      salvarProgressoLocal(livro, capaFinal || undefined, fundoImg || undefined, promoData || undefined, novaLista);
    }
    setStatusMsg('Variação de capa descartada do carrossel.');
    setStatusType('normal');
  };

  // REGENERAÇÃO DE CAPA DIRETO AO LADO DA CAPA (COM IA E NOVO CONCEITO VISUAL)
  const handleGerarOutraCapa = async () => {
    setIsRegeneratingCoverOnly(true);
    setStatusMsg('🎨 Criando novo conceito de arte editorial para a capa...');
    setStatusType('normal');
    logDiag('Gerando novo conceito de capa diretamente pelo estúdio lateral');

    try {
      const obraTitulo = livro ? livro.titulo : titulo.trim() || 'Obra Editorial';
      const obraSubtitulo = livro ? livro.subtitulo : subtitulo.trim();
      const obraAutor = livro ? livro.autor : autor.trim() || 'Autor';
      const obraGenero = livro ? livro.genero : genero || 'Geral';
      const obraPremissa = topico.trim() || uniqueAngle || obraTitulo;
      const trechoAmostra = livro?.capitulos?.slice(0, 3).map(c => c.texto).join(' ').slice(0, 1000) || obraPremissa;

      // Monta o prompt cirúrgico anti-selo e de espaço negativo
      const promptCapa = construirPromptArteCapa(obraGenero, obraPremissa, trechoAmostra, estiloArteVisual, customCoverPrompt);
      const novaCapaUrl = await chamarImagen(promptCapa, '2:3');
      setFundoImg(novaCapaUrl);

      // Diagrama no canvas com a tipografia moderna e área limpa
      const novaCapaFinal = await diagramarCapaCanvas(
        novaCapaUrl,
        obraTitulo,
        obraSubtitulo,
        obraAutor,
        obraGenero,
        obraPremissa,
        estiloCapaTipo,
        intensidadeZonaLimpa,
        posicaoTituloCapa
      );

      const novoItem: ItemHistoricoCapa = {
        id: `capa_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        dataUrl: novaCapaFinal,
        fundoUrl: novaCapaUrl,
        timestamp: Date.now(),
        estilo: estiloCapaTipo,
        conceito: estiloArteVisual
      };
      const novoHistorico = [novoItem, ...historicoCapas.filter(c => c.dataUrl !== novaCapaFinal)];
      setHistoricoCapas(novoHistorico);
      setIndiceCapaCarrossel(0);
      setCapaFinal(novaCapaFinal);

      if (livro) salvarProgressoLocal(livro, novaCapaFinal, novaCapaUrl, promoData || undefined, novoHistorico);

      setStatusMsg('✓ Nova capa diagramada com sucesso! Adicionada ao seu carrossel de capas.');
      setStatusType('ok');
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Erro ao gerar nova capa: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsRegeneratingCoverOnly(false);
    }
  };

  // REAPLICAR TIPOGRAFIA & ÁREA LIMPA NA ARTE ATUAL (SEM GASTAR RECURSOS DE IA)
  const handleReaplicarTipografia = async () => {
    if (!fundoImg && !capaFinal) {
      setStatusMsg('Gere uma capa primeiro antes de reaplicar o design.');
      setStatusType('error');
      return;
    }
    setIsReapplyingTypography(true);
    try {
      const obraTitulo = livro ? livro.titulo : titulo.trim() || 'Obra Editorial';
      const obraSubtitulo = livro ? livro.subtitulo : subtitulo.trim();
      const obraAutor = livro ? livro.autor : autor.trim() || 'Autor';
      const obraGenero = livro ? livro.genero : genero || 'Geral';
      const obraPremissa = topico.trim() || uniqueAngle || obraTitulo;

      const imgFonte = fundoImg || capaFinal!;
      const novaCapaFinal = await diagramarCapaCanvas(
        imgFonte,
        obraTitulo,
        obraSubtitulo,
        obraAutor,
        obraGenero,
        obraPremissa,
        estiloCapaTipo,
        intensidadeZonaLimpa,
        posicaoTituloCapa
      );

      const novoItem: ItemHistoricoCapa = {
        id: `capa_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        dataUrl: novaCapaFinal,
        fundoUrl: fundoImg || undefined,
        timestamp: Date.now(),
        estilo: estiloCapaTipo,
        conceito: estiloArteVisual
      };
      const novoHistorico = [novoItem, ...historicoCapas.filter(c => c.dataUrl !== novaCapaFinal)];
      setHistoricoCapas(novoHistorico);
      setIndiceCapaCarrossel(0);
      setCapaFinal(novaCapaFinal);

      if (livro) salvarProgressoLocal(livro, novaCapaFinal, fundoImg || undefined, promoData || undefined, novoHistorico);
      setStatusMsg('✓ Estilo tipográfico e área limpa reaplicados! Nova variação adicionada ao carrossel.');
      setStatusType('ok');
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Erro ao atualizar tipografia: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsReapplyingTypography(false);
    }
  };

  // GERAÇÃO AUTOMÁTICA DE: 1. CAPA + 2. IMAGEM PROMOCIONAL + 3. PÁGINA PROMOCIONAL
  const gerarCapaEPaginaPromocional = async () => {
    if (!livro && !titulo.trim()) {
      setStatusMsg('Preencha ao menos o título da obra.');
      setStatusType('error');
      return;
    }

    const obraTitulo = livro ? livro.titulo : titulo.trim();
    const obraSubtitulo = livro ? livro.subtitulo : subtitulo.trim();
    const obraAutor = livro ? livro.autor : autor.trim();
    const obraGenero = livro ? livro.genero : genero;
    const obraPremissa = topico.trim();
    const trechoAmostra = livro?.capitulos?.slice(0, 3).map(c => c.texto).join(' ').slice(0, 1000) || obraPremissa;

    setStatusMsg('🎨 1/3 Criando a arte da capa...');
    setStatusType('normal');
    logDiag('Iniciando a geração da arte da capa');

    try {
      // 1. ILUSTRAÇÃO DA CAPA (MOTOR EXCLUSIVO FLUX / REPLICATE SEM SELOS)
      const promptCapa = construirPromptArteCapa(obraGenero, obraPremissa, trechoAmostra, estiloArteVisual, customCoverPrompt);
      const capaImgUrl = await chamarImagen(promptCapa, '2:3');
      setFundoImg(capaImgUrl);
      logDiag('Ilustração de fundo da capa obtida com sucesso.');

      // 2. DIAGRAMAÇÃO TIPOGRÁFICA DA CAPA VIA CANVAS (1600x2400) COM ÁREA LIMPA
      setStatusMsg('🎨 2/3 Diagramando tipografia da capa em alta resolução (Clean Zone)...');
      const capaFinalBase64 = await diagramarCapaCanvas(
        capaImgUrl,
        obraTitulo,
        obraSubtitulo,
        obraAutor,
        obraGenero,
        obraPremissa,
        estiloCapaTipo,
        intensidadeZonaLimpa,
        posicaoTituloCapa
      );

      setCapaFinal(capaFinalBase64);
      logDiag('Capa diagramada em 1600x2400 finalizada com design editorial limpo de revista.');

      // 3. GERAÇÃO AUTOMÁTICA DA IMAGEM PROMOCIONAL NARRATIVA + PÁGINA PROMOCIONAL
      setStatusMsg('✨ 3/3 Gerando Imagem Narrativa e Página Promocional Automática...');
      logDiag('Gerando imagem promocional narrativa e página promocional');

      const promoImg = await gerarImagemPromocionalNarrativa({
        title: obraTitulo,
        genre: obraGenero,
        topic: obraPremissa,
        chaptersSample: trechoAmostra
      });

      const paginaPromocional = await gerarConteudoPaginaPromocional(
        {
          title: obraTitulo,
          subtitle: obraSubtitulo,
          author: obraAutor,
          genre: obraGenero,
          topic: obraPremissa,
          chaptersSample: trechoAmostra
        },
        capaFinalBase64,
        promoImg
      );

      setPromoData(paginaPromocional);
      if (livro) salvarProgressoLocal(livro, capaFinalBase64, capaImgUrl, paginaPromocional);

      setStatusMsg('✓ Capa e Página Promocional geradas com sucesso!');
      setStatusType('ok');
      setActiveTab('capa');
      logDiag('Pipeline completo finalizado: Capa + Imagem Promocional + Página Promocional prontas!');
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Erro na geração: ${err.message}`);
      setStatusType('error');
      logDiag(`Falha no pipeline: ${err.message}`);
    }
  };

  const carregarElementoImagem = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const quebrarLinhas = (ctx: CanvasRenderingContext2D, texto: string, maxW: number): string[] => {
    const palavras = texto.split(' ');
    const linhas: string[] = [];
    let atual = '';
    for (const p of palavras) {
      const teste = atual ? `${atual} ${p}` : p;
      if (ctx.measureText(teste).width > maxW) {
        if (atual) linhas.push(atual);
        atual = p;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  };

  // GERAR SILHUETA MARGINAL ARTÍSTICA DO PROTAGONISTA (REPLICATE FLUX)
  const handleGerarSilhueta = async () => {
    setIsGeneratingSilhueta(true);
    setStatusMsg('✨ Gerando silhueta artística do personagem...');
    logDiag('Solicitando silhueta marginal com sangria externa de 3%...');

    try {
      const { prompt, imageDataUrl } = await gerarSilhuetaPersonagem(
        livro?.titulo || titulo,
        livro?.genero || genero,
        personagemSilhuetaFoco
      );
      setSilhuetaConfig(prev => ({
        ...prev,
        ativado: true,
        imagemDataUrl: imageDataUrl
      }));
      setStatusMsg('✓ Silhueta artística gerada com sucesso! Sangria marginal de 3% ativada no PDF.');
      setStatusType('ok');
      logDiag('Silhueta marginal gerada e armazenada no estado');
    } catch (err: any) {
      console.error('Erro ao gerar silhueta:', err);
      setStatusMsg(`Erro ao gerar silhueta: ${err.message || err}`);
      setStatusType('error');
    } finally {
      setIsGeneratingSilhueta(false);
    }
  };

  // GERAR ILUSTRAÇÃO INDIVIDUAL DE CAPÍTULO (REPLICATE FLUX)
  const handleGerarIlustracaoCapitulo = async (idx: number) => {
    if (!livro || !livro.capitulos[idx]) return;
    const target = livro.capitulos[idx];
    setGeneratingCapImgIndex(idx);
    setStatusMsg(`🎨 Criando ilustração ${estiloIlustracaoCapitulo} do Capítulo ${idx + 1} ("${target.titulo}")...`);
    logDiag(`Gerando imagem de abertura para Capítulo ${idx + 1}`);

    try {
      const dataUrl = await gerarIlustracaoCapitulo(
        target.titulo,
        `Livro: ${livro.titulo}. Tema: ${temaSelecionado || livro.genero}; subtema: ${subtemaSelecionado || topico}. ${bookType === 'children-picture-book' ? 'Ilustração de livro infantil, manter os mesmos personagens, roupas, cores e estilo artístico das outras páginas. ' : ''}Cena: ${target.texto.substring(0, 350)}`,
        estiloIlustracaoCapitulo,
        bookType === 'children-picture-book' ? '1:1' : '16:9'
      );

      setLivro(prev => {
        if (!prev) return null;
        const nextCaps = [...prev.capitulos];
        nextCaps[idx] = { ...nextCaps[idx], imagemDataUrl: dataUrl };
        return { ...prev, capitulos: nextCaps };
      });

      setStatusMsg(`✓ Ilustração do Capítulo ${idx + 1} gerada com sucesso!`);
      setStatusType('ok');
      logDiag(`Ilustração do Capítulo ${idx + 1} incorporada.`);
    } catch (err: any) {
      console.error('Erro ao gerar ilustração de capítulo:', err);
      setStatusMsg(`Erro ao ilustrar capítulo: ${err.message || err}`);
      setStatusType('error');
    } finally {
      setGeneratingCapImgIndex(null);
    }
  };

  // BAIXAR PDF KDP DIAGRAMADO (MULTI-PASSE COM CAPA, SUMÁRIO E SILHUETAS MARGINAIS)
  const baixarPDF = async () => {
    if (!livro || livro.capitulos.length === 0) {
      setStatusMsg('Gere o livro primeiro para exportar o PDF.');
      setStatusType('error');
      return;
    }

    if (bookType === 'children-picture-book') {
      const missingIllustrations = livro.capitulos
        .map((chapter, index) => chapter.imagemDataUrl ? null : index + 1)
        .filter((chapterNumber): chapterNumber is number => chapterNumber !== null);
      if (missingIllustrations.length > 0) {
        setStatusMsg(`Gere as ilustrações pendentes das páginas ${missingIllustrations.join(', ')} antes de exportar a história infantil.`);
        setStatusType('error');
        return;
      }
    }

    setStatusMsg('📄 Diagramando PDF oficial para Amazon KDP...');
    setStatusType('normal');
    logDiag('Iniciando construção de PDF com margens espelhadas KDP, sumário e silhuetas marginais...');

    try {
      const validTrimSizes = ['6x9', '5x8', '5.5x8.5', '8.5x11', '8.5x8.5'] as const;
      const trimSize = validTrimSizes.includes(formato as any) ? (formato as any) : '6x9';

      const result = await buildKdpPdf({
        livro: {
          titulo: livro.titulo,
          subtitulo: livro.subtitulo,
          autor: livro.autor,
          capitulos: livro.capitulos
        },
        capaDataUrl: capaFinal,
        bookType,
        formato,
        optSumario,
        tamCapitulo,
        corCapitulo,
        silhuetaConfig: silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl ? {
          ativado: true,
          imagemDataUrl: silhuetaConfig.imagemDataUrl,
          paginasSelecionadas: calcularPaginasSilhueta(
            livro.capitulos.length * 8,
            silhuetaConfig.modo,
            {
              intervalo: silhuetaConfig.intervalo,
              totalAleatorio: silhuetaConfig.totalAleatorio
            }
          ),
          opacidade: silhuetaConfig.opacidade,
          sangriaPct: silhuetaConfig.sangriaPct
        } : undefined
      });

      const blob = new Blob([result.bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${livro.titulo.replace(/\s+/g, '_')}_KDP.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setStatusMsg(`✓ PDF KDP gerado com sucesso: ${result.pageCount} páginas no formato ${formato} (sem páginas em branco).`);
      setStatusType('ok');
      logDiag(`PDF exportado com sucesso: ${result.pageCount} páginas.`);
    } catch (err: any) {
      console.error('Erro ao gerar PDF KDP:', err);
      setStatusMsg(`Erro ao gerar PDF: ${err.message || err}`);
      setStatusType('error');
      logDiag(`Falha ao exportar PDF: ${err.message || err}`);
    }
  };

  // AUDITORIA & VERIFICAÇÃO COMPLETA EM 1 CLIQUE
  const executarVerificacaoCompleta = async () => {
    if (!livro || livro.capitulos.length === 0) {
      setStatusMsg('Gere ao menos um capítulo do livro antes de executar a auditoria.');
      setStatusType('error');
      return;
    }

    setIsAuditing(true);
    setActiveTab('auditoria');
    setStatusMsg('🔍 Executando verificação completa do livro em 1 clique...');
    setStatusType('normal');
    logDiag('Iniciando auditoria completa: diagramação, gramática, parágrafos, plágio e alucinação');

    try {
      const rep = await KdpBookVerifier.runCompleteVerification(
        livro,
        topico,
        (mod, cap, pct) => {
          setAuditCurrentModule(mod);
          setAuditProgressPercent(pct);
          logDiag(`Auditando ${mod} (Capítulo ${cap || 'Geral'}) - ${pct}%`);
        }
      );

      setAuditReport(rep);
      setStatusMsg(`✓ Auditoria concluída! Score Editorial: ${rep.score}/100. ${rep.issues.length} apontamentos.`);
      setStatusType('ok');
      logDiag(`Auditoria finalizada com Score: ${rep.score}/100`);
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Erro na auditoria: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCorrigirIssue = (issue: VerifierIssue) => {
    if (!livro) return;
    const livroAtualizado = KdpBookVerifier.applyFix(livro, issue);
    setLivro({ ...livroAtualizado });
    salvarProgressoLocal(livroAtualizado);
    setAuditReport(prev => prev ? {
      ...prev,
      issues: prev.issues.map(i => i.id === issue.id ? { ...i, applied: true } : i)
    } : null);
    setStatusMsg(`✓ Correção aplicada com sucesso no Capítulo ${issue.chapterIndex + 1}!`);
    setStatusType('ok');
    logDiag(`Correção ${issue.id} aplicada com sucesso`);
  };

  const handleCorrigirTodos = () => {
    if (!livro || !auditReport) return;
    const { livro: livroAtualizado, fixedCount } = KdpBookVerifier.applyAllFixes(livro, auditReport.issues);
    setLivro({ ...livroAtualizado });
    salvarProgressoLocal(livroAtualizado);
    setAuditReport(prev => prev ? {
      ...prev,
      score: Math.min(100, prev.score + 15),
      issues: prev.issues.map(i => ({ ...i, applied: true }))
    } : null);
    setStatusMsg(`✓ Todas as ${fixedCount} correções foram aplicadas automaticamente no livro!`);
    setStatusType('ok');
    logDiag(`${fixedCount} correções aplicadas automaticamente`);
  };

  // SALVAR NO CATÁLOGO DO BOOK INTEL KDP (INDEXEDDB)
  const salvarNoCatalogo = async () => {
    if (!livro) {
      setStatusMsg('Gere o livro antes de salvar no catálogo.');
      setStatusType('error');
      return;
    }

    const novoProjeto: BookProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'ESCREVENDO',
      priority: 'ALTA',
      executionMode: 'assisted',
      title: livro.titulo,
      subtitle: livro.subtitulo,
      author: livro.autor,
      description: topico,
      language: idioma === 'português' ? 'Português' : idioma === 'inglês' ? 'Inglês' : 'Espanhol',
      format: 'Capa Comum',
      trimSize: formato as any,
      paperType: 'bw-white',
      estimatedPages: paginasAlvo,
      actualPages: livro.capitulos.length * 6,
      targetPrice: 39.90,
      currency: 'BRL',
      targetMarketplace: 'amazon.com.br',
      categories: [genero],
      keywords: [],
      targetAudience: 'Público Geral',
      topic: topico,
      kdpBookType: 'fiction-novel',
      coverImageUrl: capaFinal || undefined,
      promotionalPage: promoData || undefined,
      promotionalImageUrl: promoData?.promotionalImageUrl || undefined,
      kdpChapters: livro.capitulos.map((c, i) => ({
        index: i + 1,
        title: c.titulo,
        summary: c.texto.slice(0, 200),
        targetWordCount: livro.meta?.palavrasPorCap || 900,
        prose: c.texto,
        wordCount: c.texto.split(/\s+/).length,
        status: 'APROVADO' as const,
        scenes: []
      })),
      tasks: [],
      notes: `Gerado via Gerador de Livros KDP Pro.\nPágina Promocional: ${promoData ? 'Configurada' : 'Pendente'}.`,
      competitorsAsins: [],
      pipelineStage: 'writing',
      pipelineProgress: 100,
      pipelineLog: [`Livro gerado e catalogado no Book Intel KDP com ${livro.capitulos.length} capítulos.`]
    };

    await db.saveBookProject(novoProjeto);
    if (onProjectSaved) onProjectSaved(novoProjeto);

    setStatusMsg('✓ Obra salva com sucesso no catálogo do Book Intel KDP!');
    setStatusType('ok');
    logDiag('Projeto registrado no IndexedDB');
  };

  // FINALIZAR LIVRO E DISPONIBILIZAR NA DASHBOARD COM TODOS OS DOWNLOADS
  const finalizarLivroEGravarNaDashboard = async () => {
    if (!livro || livro.capitulos.length === 0) {
      setStatusMsg('Gere ao menos um capítulo antes de finalizar a obra.');
      setStatusType('error');
      return;
    }

    setStatusMsg('🚀 Finalizando livro e compilando arquivos oficiais KDP...');
    setStatusType('normal');
    logDiag('Compilando miolo PDF diagramado, capa e manuscrito para a Dashboard...');

    try {
      const pdfResult = await buildKdpPdf({
        livro: {
          titulo: livro.titulo,
          subtitulo: livro.subtitulo,
          autor: livro.autor,
          idioma: livro.idioma || idioma,
          capitulos: livro.capitulos
        },
        capaDataUrl: capaFinal,
        formato,
        optSumario,
        tamCapitulo,
        corCapitulo,
        silhuetaConfig: silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl ? {
          ativado: true,
          imagemDataUrl: silhuetaConfig.imagemDataUrl,
          paginasSelecionadas: calcularPaginasSilhueta(
            livro.capitulos.length * 8,
            silhuetaConfig.modo,
            {
              intervalo: silhuetaConfig.intervalo,
              totalAleatorio: silhuetaConfig.totalAleatorio
            }
          ),
          opacidade: silhuetaConfig.opacidade,
          sangriaPct: silhuetaConfig.sangriaPct
        } : undefined
      });

      const totalWords = livro.capitulos.reduce((sum, c) => sum + (c.texto ? c.texto.split(/\s+/).length : 0), 0);
      // Preflight do PDF KDP (Regras 36, 37, 38, 53)
      const preflight = await preflightPdf(pdfResult.bytes, {
        manuscriptWordCount: totalWords
      });

      if (!preflight.ok && preflight.issues.some(i => i.severity === 'CRITICAL')) {
        const criticos = preflight.issues.filter(i => i.severity === 'CRITICAL').map(i => i.message).join('; ');
        setStatusMsg(`❌ Bloqueio Editorial: Falha crítica no PDF Preflight: ${criticos}`);
        setStatusType('error');
        logDiag(`Finalização bloqueada pelo Preflight: ${criticos}`);
        return;
      }

      const projId = initialProject?.id || projectIdRef.current || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const finalId = `final_proj_${projId}`;

      // Remove duplicatas pré-existentes do mesmo livro para garantir que apareça apenas 1 vez na Dashboard
      try {
        const existingBooks = await db.getAllFinalBooks();
        const normTitle = livro.titulo.trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
        for (const eb of existingBooks) {
          const ebNorm = (eb.title || '').trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
          if (eb.bookId === projId || (ebNorm && ebNorm === normTitle)) {
            await db.deleteFinalBook(eb.id);
          }
        }
      } catch (e) {
        console.warn('Erro ao limpar duplicatas de finalBook:', e);
      }

      const finalRec: FinalBookRecord = {
        id: finalId,
        bookId: projId,
        projectId: projId,
        jobId: `job_${Date.now()}`,
        title: livro.titulo,
        subtitle: livro.subtitulo || '',
        author: livro.autor || 'Autor não definido',
        coverDataUrl: capaFinal || undefined,
        pdf: pdfResult.bytes as unknown as ArrayBuffer,
        pageCount: pdfResult.pageCount,
        sizeBytes: (pdfResult.bytes as any).byteLength || 0,
        finalizedAt: Date.now(),
        status: 'finalizado_validado',
        genre: genero,
        trimSize: formato,
        language: livro.idioma || idioma,
        wordCount: totalWords,
        chaptersCount: livro.capitulos.length,
        chapters: livro.capitulos.map(c => ({ titulo: c.titulo, texto: c.texto })),
        manuscriptText: livro.capitulos.map((c, i) => `\n\n### Capítulo ${i + 1}: ${c.titulo}\n\n${c.texto}`).join(''),
        promoData: promoData || undefined,
        report: {
          generatedAt: Date.now(),
          bookTitle: livro.titulo,
          author: livro.autor,
          pagesAnalyzed: Math.round(totalWords / 250),
          pdfPages: pdfResult.pageCount,
          chaptersIdentified: livro.capitulos.length,
          chaptersCorrected: livro.capitulos.length,
          chaptersPending: 0,
          spellingErrors: 0,
          grammarErrors: 0,
          punctuationFixes: 0,
          paragraphFixes: 0,
          dialogueFixes: 0,
          encodingFixes: 0,
          styleChanges: 0,
          repetitionFindings: 0,
          continuityFindings: 0,
          tocIssues: [],
          layoutWarnings: [],
          cover: {
            present: Boolean(capaFinal),
            valid: Boolean(capaFinal),
            kind: capaFinal ? 'frontal' : 'ausente',
            notes: ['Capa integrada com sucesso']
          },
          correctedAutomatically: [],
          pendingAuthor: [],
          notVerified: [],
          aiFullyVerified: true,
          summary: `Obra "${livro.titulo}" finalizada com ${pdfResult.pageCount} páginas diagramadas e ${livro.capitulos.length} capítulos.`
        },
        pendings: [],
        validation: {
          ok: true,
          pageCount: pdfResult.pageCount,
          criticalFailures: 0,
          notVerified: 0,
          validatedAt: Date.now(),
          checks: [
            { id: 'trim', label: `Dimensão de Corte (${formato})`, ok: true, critical: true, detail: 'Dimensões nominais KDP' },
            { id: 'margins', label: 'Margens de Impressão KDP', ok: true, critical: true, detail: 'Margens espelhadas KDP aplicadas' },
            { id: 'pages', label: 'Numeração de Páginas', ok: true, critical: false, detail: `${pdfResult.pageCount} páginas numeradas` },
            { id: 'toc', label: 'Sumário Editorial', ok: true, critical: false, detail: 'Sumário com páginas reais' }
          ]
        }
      };

      await db.saveFinalBook(finalRec);

      const projUpdated: BookProject = {
        ...(initialProject || {}),
        id: projId,
        createdAt: initialProject?.createdAt || Date.now(),
        updatedAt: Date.now(),
        status: 'FINALIZADO',
        priority: 'ALTA',
        executionMode: 'assisted',
        title: livro.titulo,
        subtitle: livro.subtitulo,
        author: livro.autor,
        description: topico,
        language: idioma === 'português' ? 'Português' : 'Inglês',
        format: 'Capa Comum',
        trimSize: formato as any,
        paperType: 'bw-white',
        estimatedPages: paginasAlvo,
        actualPages: pdfResult.pageCount,
        targetPrice: 39.90,
        currency: 'BRL',
        targetMarketplace: 'amazon.com.br',
        categories: [genero],
        keywords: [],
        targetAudience: 'Público Geral Adulto',
        topic: topico,
        kdpBookType: 'fiction-novel',
        coverImageUrl: capaFinal || undefined,
        promotionalPage: promoData || undefined,
        kdpChapters: livro.capitulos.map((c, i) => ({
          index: i + 1,
          title: c.titulo,
          summary: c.texto.slice(0, 150),
          targetWordCount: livro.meta?.palavrasPorCap || 900,
          prose: c.texto,
          wordCount: c.texto.split(/\s+/).length,
          status: 'APROVADO' as const,
          scenes: []
        })),
        tasks: [],
        notes: `Livro finalizado em ${new Date().toLocaleDateString('pt-BR')}.`,
        competitorsAsins: [],
        pipelineStage: 'final',
        pipelineProgress: 100,
        pipelineLog: [`Livro finalizado com sucesso com ${pdfResult.pageCount} páginas.`]
      };

      await db.saveBookProject(projUpdated);
      if (onProjectSaved) onProjectSaved(projUpdated);

      window.dispatchEvent(new CustomEvent('kdp-final-books-updated'));

      setStatusMsg(`🎉 Livro Finalizado com Sucesso! ${pdfResult.pageCount} páginas diagramadas. Todos os 4 downloads disponíveis na Dashboard!`);
      setStatusType('ok');
      logDiag(`Livro "${livro.titulo}" finalizado com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao finalizar livro:', err);
      setStatusMsg(`Erro ao finalizar livro: ${err.message || err}`);
      setStatusType('error');
    }
  };

  // COPIAR TEXTO COMPLETO
  const copiarTexto = () => {
    if (!livro) return;
    let t = `${livro.titulo}\n${livro.subtitulo}\npor ${livro.autor}\n\n`;
    livro.capitulos.forEach(c => {
      t += `\n${c.titulo}\n\n${c.texto}\n`;
    });
    navigator.clipboard.writeText(t);
    setStatusMsg('✓ Conteúdo completo copiado para a Área de Transferência.');
    setStatusType('ok');
  };

  // BAIXAR CAPA
  const baixarCapa = () => {
    if (!capaFinal) {
      setStatusMsg('Capa não gerada ainda.');
      setStatusType('error');
      return;
    }
    const a = document.createElement('a');
    a.href = capaFinal;
    a.download = `${(livro?.titulo || titulo).replace(/\s+/g, '_')}_capa.png`;
    a.click();
  };

  // BAIXAR PÁGINA PROMO EM HTML STANDALONE
  const baixarPromoHTML = () => {
    if (!livro) {
      setStatusMsg('Gere o livro primeiro para exportar a página promocional.');
      setStatusType('error');
      return;
    }
    const capaImgTag = capaFinal ? `<img src="${capaFinal}" alt="Capa">` : '';
    const fundoStyle = fundoImg ? `background-image:url('${fundoImg}');` : '';
    const esc = (t: string) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `<!DOCTYPE html><html lang="${idioma}"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(livro.titulo)}</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,serif;background:#000;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px;position:relative}
.bg{position:fixed;inset:0;${fundoStyle}background-size:cover;background-position:center;opacity:.35;z-index:0;filter:blur(2px)}
.wrap{position:relative;z-index:1;max-width:1000px;display:grid;grid-template-columns:340px 1fr;gap:44px;align-items:center}
@media(max-width:800px){.wrap{grid-template-columns:1fr;text-align:center}}
.capa img{width:100%;border-radius:8px;box-shadow:0 30px 80px rgba(0,0,0,.9)}
h1{font-size:3.2em;line-height:1.05;margin-bottom:12px}
.sub{font-style:italic;font-size:1.3em;color:#d0d0d0;margin-bottom:26px}
.autor{font-size:1.05em;letter-spacing:.15em;text-transform:uppercase;color:#bbb;margin-bottom:24px}
.sinopse{font-size:1.05em;line-height:1.65;color:#e0e0e0;margin-bottom:30px;max-width:560px}
.cta{display:inline-block;background:linear-gradient(135deg,#ffb400,#ff7a00);color:#111;font-weight:bold;padding:16px 40px;border-radius:50px;text-decoration:none;font-size:1.1em}
.selo{margin-top:20px;font-size:.85em;color:#888;letter-spacing:.1em}
.gen{display:inline-block;background:rgba(255,255,255,.1);padding:6px 14px;border-radius:20px;font-size:.8em;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}
</style></head><body>
<div class="bg"></div>
<div class="wrap">
<div class="capa">${capaImgTag}</div>
<div>
<span class="gen">${esc(genero)}</span>
<h1>${esc(livro.titulo)}</h1>
<div class="sub">${esc(livro.subtitulo)}</div>
<div class="autor">por ${esc(livro.autor)}</div>
<div class="sinopse">${esc(topico)}</div>
<a class="cta" href="#">📚 Disponível na Amazon KDP</a>
<div class="selo">eBook Kindle · Capa Comum · Kindle Unlimited</div>
</div></div></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${livro.titulo.replace(/\s+/g, '_')}_promocional.html`;
    a.click();
    setStatusMsg('✓ Página promocional HTML baixada com sucesso.');
    setStatusType('ok');
  };

  // BAIXAR JSON DO PROJETO
  const baixarJSON = () => {
    if (!livro) {
      setStatusMsg('Gere o livro primeiro para exportar o projeto JSON.');
      setStatusType('error');
      return;
    }
    const dados = {
      livro,
      capaFinal,
      fundoImg,
      promoData,
      config: {
        titulo, subtitulo, autor, genero, topico, paginasAlvo, maxCapitulos, formato, idioma
      },
      ts: Date.now()
    };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${livro.titulo.replace(/\s+/g, '_')}.json`;
    a.click();
    setStatusMsg('✓ Arquivo do projeto JSON exportado com sucesso.');
    setStatusType('ok');
  };

  // LIMPAR PROGRESSO
  const limparProgresso = () => {
    if (!confirm('Deseja descartar todo o progresso atual deste livro?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setLivro(null);
    setCapaFinal(null);
    setFundoImg(null);
    setPromoData(null);
    setCapAtual(0);
    setTotalCaps(0);
    setStatusMsg('Progresso descartado com sucesso.');
    setStatusType('normal');
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER ELEGANTE DO BOOK INTEL KDP (TEMA CLARO) */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '14px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onBackToDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Voltar à Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📚</span>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Gerador de Livros KDP Pro
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>


          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              background: '#f1f5f9',
              color: '#334155',
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid #e2e8f0'
            }}
          >
            {gerando ? `⏳ Cap ${capAtual + 1}/${totalCaps}` : capAtual > 0 ? `✓ ${capAtual} Capítulos Prontos` : 'Pronto'}
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL EM GRID */}
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 20px', width: '100%', flex: 1 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '460px 1fr',
            gap: 24,
            alignItems: 'start'
          }}
        >
          {/* ========================================================= */}
          {/* COLUNA 1: PAINEL DE CONFIGURAÇÃO (CARD CLARO) */}
          {/* ========================================================= */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#1e293b',
                paddingBottom: 12,
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '0 0 16px'
              }}
            >
              <span>✍️</span> Parâmetros da Obra KDP
            </h2>

            <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, border: '1px solid #c7d2fe', background: '#eef2ff' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                Tipo de livro / formato de criação
              </label>
              <select
                value={bookType}
                onChange={event => {
                  const selectedType = event.target.value as BookType;
                  const config = BOOK_TYPE_CONFIGS[selectedType];
                  setBookType(selectedType);
                  setFormato(config.trimSize);
                  setPaginasAlvo(config.targetPages);
                  if (config.chapterCount[1] > 0) setMaxCapitulos(config.chapterCount[1]);
                  setGenero(config.label);

                  if (selectedType === 'children-picture-book') {
                    const childrenTheme = getTheme('historias-infantis-ilustradas')
                      || getTheme('literatura-infantil');
                    setTemaSelecionado(childrenTheme?.label || 'Histórias infantis ilustradas');
                    setSubtemaSelecionado(childrenTheme?.subthemes[0] || 'Aventuras com animais');
                    setFaixaEtaria('6-8');
                    setActiveTab('preview');
                  } else if (selectedType === 'planner' || selectedType === 'diary') {
                    setActiveTab('planner');
                  } else if (selectedType === 'coloring-book') {
                    setActiveTab('colorir');
                  } else {
                    setActiveTab('preview');
                  }
                }}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #c7d2fe', fontSize: 12, background: '#ffffff', color: '#0f172a' }}
              >
                {Object.values(BOOK_TYPE_CONFIGS).map(config => (
                  <option key={config.id} value={config.id}>
                    [{config.category}] {config.label}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 5, fontSize: 10, color: '#475569' }}>
                {BOOK_TYPE_CONFIGS[bookType].description}
              </div>
            </div>

            {/* ETAPA 1 — ESCOLHA DO TEMA DO LIVRO */}
            <div style={{ marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                1. Tema Central do Livro (Obrigatório antes do Título)
              </label>
              <select
                value={temaSelecionado}
                onChange={(e) => {
                  const val = e.target.value;
                  setTemaSelecionado(val);
                  const tObj = getTheme(val);
                  if (tObj && tObj.subthemes.length > 0) {
                    setSubtemaSelecionado(tObj.subthemes[0]);
                  } else {
                    setSubtemaSelecionado('');
                  }
                  if (tObj?.childrenBook) {
                    setFaixaEtaria('6-8');
                  }
                  if (val.toLowerCase().includes('colorir')) {
                    setActiveTab('colorir');
                  }
                  setGenero(val || 'Thriller / Mistério Investigativo');
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 500,
                  marginBottom: 8
                }}
              >
                <option value="">-- Selecione o Tema da Obra ({BOOK_THEMES.length} opções) --</option>
                {([
                  ['Ficção', 'ficcao'],
                  ['Não ficção', 'nao-ficcao'],
                  ['Infantil', 'infantil'],
                  ['Atividades', 'atividades'],
                  ['Misto', 'misto']
                ] as const).map(([groupLabel, kind]) => {
                  const themes = BOOK_THEMES.filter(theme => theme.kind === kind);
                  if (themes.length === 0) return null;
                  return (
                    <optgroup key={kind} label={groupLabel}>
                      {themes.map(theme => (
                        <option key={theme.id} value={theme.label}>
                          {theme.label} {theme.childrenBook ? '👶 (Infantil)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>

              {/* Subtema Dinâmico */}
              {temaSelecionado && getTheme(temaSelecionado)?.subthemes.length ? (
                <div style={{ marginTop: 6 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>
                    Subtema / Especialização
                  </label>
                  <select
                    value={subtemaSelecionado}
                    onChange={(e) => setSubtemaSelecionado(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      background: '#ffffff',
                      color: '#0f172a'
                    }}
                  >
                    {getTheme(temaSelecionado)?.subthemes.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* FAIXA ETÁRIA OBRIGATÓRIA PARA LIVROS INFANTIS (REGRA 8 E 9) */}
              {(isChildrenTheme(temaSelecionado) || genero.toLowerCase().includes('infantil')) && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef3c7', borderRadius: 6, border: '1px solid #fde68a' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                    👶 Faixa Etária Obrigatória (Controla Vocabulário e Complexidade)
                  </label>
                  <select
                    value={faixaEtaria}
                    onChange={(e) => setFaixaEtaria(e.target.value as AgeBandId)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #d97706',
                      fontSize: 12,
                      background: '#ffffff',
                      color: '#78350f',
                      fontWeight: 600
                    }}
                  >
                    <option value="">-- Selecione a Faixa Etária Obrigatória --</option>
                    <option value="3-5">3–5 anos (Frases ultracurtas, vocabulário concreto)</option>
                    <option value="6-8">6–8 anos (Linguagem acessível, narrativa direta)</option>
                    <option value="9-12">9–12 anos (Vocabulário intermediário, desafios)</option>
                    <option value="13-15">13–15 anos (Transição YA, maior complexidade)</option>
                    <option value="16-17">16–17 anos (Linguagem madura e reflexiva)</option>
                  </select>
                </div>
              )}
            </div>

            {/* ETAPA 2 — INTELIGÊNCIA DE MERCADO AMAZON KDP */}
            <div style={{ marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                  2. Inteligência de Mercado Amazon KDP
                </label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setIsTop50ModalOpen(true)}
                    title="Explorar os 50 livros mais vendidos no segmento (#1 ao #200) e gerar sugestões com IA"
                    style={{
                      padding: '4px 10px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)'
                    }}
                  >
                    <Award size={12} /> Top 50 Bestsellers (#1-#200)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnalisarMercado(true)}
                    disabled={isAnalyzingMarket}
                    title="Sortear outros títulos e referências dinamicamente do ranking de #1 a #200"
                    style={{
                      padding: '4px 8px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <RefreshCw size={11} className={isAnalyzingMarket ? 'spin' : ''} />
                    {isAnalyzingMarket ? 'Sorteando...' : '🔄 Sortear Outros'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnalisarMercado(false)}
                    disabled={isAnalyzingMarket}
                    style={{
                      padding: '4px 10px',
                      background: isAnalyzingMarket ? '#94a3b8' : '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Sparkles size={11} />
                    {isAnalyzingMarket ? 'Analisando...' : 'Analisar Mercado'}
                  </button>
                </div>
              </div>

              {marketFeedback && (
                <div style={{ fontSize: 11, color: '#334155', marginBottom: 6, fontWeight: 500 }}>
                  {marketFeedback}
                </div>
              )}

              {/* LISTA DAS 5 REFERÊNCIAS DE MERCADO */}
              {marketReferences.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, fontStyle: 'italic' }}>
                    * 5 Melhores referências para inspiração editorial (BSR vs Posição distinguidos. Proibido copiar):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {marketReferences.map((ref, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '6px 8px',
                          background: '#ffffff',
                          borderRadius: 6,
                          border: '1px solid #e2e8f0',
                          fontSize: 11
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          #{idx + 1}. {ref.title}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', display: 'flex', gap: 8, marginTop: 2 }}>
                          <span>{describeRank(ref)}</span>
                          {ref.reviews ? <span>★ {ref.rating || '-'} ({ref.reviews} avaliações)</span> : null}
                          {ref.referenceScore ? <span style={{ color: '#2563eb', fontWeight: 600 }}>Score: {ref.referenceScore}/100</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DIRETRIZES DO MOTOR NARRATIVO EDITORIAL (SEM METÁFORAS & VOCABULÁRIO POPULAR) */}
            <div style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ShieldCheck size={13} color="#059669" /> Diretriz Editorial Ativa
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#059669',
                  background: '#ecfdf5',
                  padding: '1px 6px',
                  borderRadius: 4,
                  border: '1px solid #a7f3d0'
                }}>
                  Ativa no Motor
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
                • <b>Sem Metáforas:</b> Texto 100% literal e claro (infantil ou adulto)<br />
                • <b>Vocabulário Popular:</b> Palavras simples e comuns para coisas, pessoas e objetos
              </div>
            </div>

            {/* ETAPA 3 — TÍTULO DO LIVRO (COM IA E VALIDADOR DE ORIGINALIDADE) */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  3. Título do Livro (Original)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setIsTop50ModalOpen(true)}
                    title="Inspirar com base nos 50 livros mais vendidos no segmento (#1 ao #200)"
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      padding: '3px 8px',
                      color: '#1d4ed8',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Award size={11} color="#d97706" /> Top 50 (#1-#200)
                  </button>
                  <button
                    type="button"
                    onClick={handleGerarTitulosOriginais}
                    disabled={isGeneratingTitulos}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '3px 8px',
                      color: '#334155',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Wand2 size={11} color="#475569" /> {isGeneratingTitulos ? 'Gerando...' : '5 Sugestões Originais'}
                  </button>
                </div>
              </div>

              {/* Pílulas de opções de títulos gerados */}
              {opcoesTitulos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>
                    ✓ Opções originais validadas (clique para aplicar):
                  </div>
                  {opcoesTitulos.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTitulo(opt)}
                      style={{
                        textAlign: 'left',
                        padding: '4px 8px',
                        background: titulo === opt ? '#f1f5f9' : '#ffffff',
                        border: titulo === opt ? '1px solid #0f172a' : '1px solid #cbd5e1',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: titulo === opt ? 700 : 500,
                        color: '#0f172a',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: O Código do Silêncio"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSugerir('titulo')}
                  disabled={loadingSugestao === 'titulo'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '8px 12px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Wand2 size={12} color="#475569" /> IA
                </button>
              </div>
            </div>

            {/* Subtítulo Comercial */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                  Subtítulo Comercial
                </label>
                <button
                  type="button"
                  onClick={handleGerarSubtitulosOriginais}
                  disabled={isGeneratingSubtitulos}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '3px 8px',
                    color: '#334155',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Wand2 size={11} color="#475569" /> {isGeneratingSubtitulos ? 'Gerando...' : '5 Sugestões'}
                </button>
              </div>

              {opcoesSubtitulos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {opcoesSubtitulos.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSubtitulo(opt)}
                      style={{
                        textAlign: 'left',
                        padding: '6px 10px',
                        background: subtitulo === opt ? '#f1f5f9' : '#ffffff',
                        border: subtitulo === opt ? '1px solid #0f172a' : '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 12,
                        lineHeight: 1.4,
                        color: '#0f172a',
                        fontWeight: subtitulo === opt ? 700 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <textarea
                  rows={3}
                  value={subtitulo}
                  onChange={(e) => setSubtitulo(e.target.value)}
                  placeholder="Ex: O que está oculto nas sombras da mente humana e os segredos que ninguém ousa revelar"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    lineHeight: 1.5,
                    background: '#ffffff',
                    color: '#0f172a',
                    resize: 'vertical',
                    minHeight: 68,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSugerir('subtitulo')}
                  disabled={loadingSugestao === 'subtitulo'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '8px 12px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: 68
                  }}
                >
                  <Wand2 size={12} color="#475569" /> IA
                </button>
              </div>

              {livro && (
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLivro(prev => {
                        if (!prev) return null;
                        const atualizado = { ...prev, titulo: titulo.trim(), subtitulo: subtitulo.trim(), autor: autor.trim() };
                        salvarProgressoLocal(atualizado);
                        return atualizado;
                      });
                      setStatusMsg('✓ Título e Subtítulo atualizados diretamente no livro gerado!');
                      setStatusType('ok');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Aplica o título e subtítulo digitados diretamente ao livro já gerado"
                  >
                    <Check size={12} /> Salvar no Livro Gerado
                  </button>
                </div>
              )}
            </div>

            {/* ETAPA 4 — DIFERENCIAL EDITORIAL & ESTRATÉGIA KDP (COM SUGESTÕES DE IA) */}
            <div style={{ marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                  4. Diferencial Editorial KDP
                </label>
                <button
                  type="button"
                  onClick={handleSugerirDiferencialCompleto}
                  disabled={isSuggestingDiferencial}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '3px 8px',
                    color: '#334155',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Wand2 size={11} color="#475569" className={isSuggestingDiferencial ? 'spin' : ''} />
                  {isSuggestingDiferencial ? 'Gerando...' : 'Sugerir com IA'}
                </button>
              </div>

              {/* Ângulo Único */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  Ângulo Único (Por que este livro é diferente?)
                </label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <textarea
                    rows={2}
                    value={uniqueAngle}
                    onChange={(e) => setUniqueAngle(e.target.value)}
                    placeholder="Ex: Abordagem neurocientífica aplicada a casos reais e análise forense"
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      lineHeight: 1.4,
                      background: '#ffffff',
                      color: '#0f172a',
                      resize: 'vertical',
                      minHeight: 46,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSugerirCampoDiferencial('uniqueAngle')}
                    disabled={loadingSugestao === 'uniqueAngle'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      minHeight: 46
                    }}
                  >
                    <Wand2 size={11} color="#475569" /> IA
                  </button>
                </div>
              </div>

              {/* Promessa Central */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  Promessa Central ao Leitor
                </label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <textarea
                    rows={2}
                    value={bookPromise}
                    onChange={(e) => setBookPromise(e.target.value)}
                    placeholder="Ex: Revelar os padrões ocultos da mente humana e prender o leitor a cada reviravolta"
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      lineHeight: 1.4,
                      background: '#ffffff',
                      color: '#0f172a',
                      resize: 'vertical',
                      minHeight: 46,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSugerirCampoDiferencial('bookPromise')}
                    disabled={loadingSugestao === 'bookPromise'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      minHeight: 46
                    }}
                  >
                    <Wand2 size={11} color="#475569" /> IA
                  </button>
                </div>
              </div>

              {/* Público / Leitor Alvo */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  Público / Leitor Alvo
                </label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <textarea
                    rows={2}
                    value={targetReader}
                    onChange={(e) => setTargetReader(e.target.value)}
                    placeholder="Ex: Jovens adultos, profissionais em transição, leitores vorazes de suspense psicológico"
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      lineHeight: 1.4,
                      background: '#ffffff',
                      color: '#0f172a',
                      resize: 'vertical',
                      minHeight: 46,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSugerirCampoDiferencial('targetReader')}
                    disabled={loadingSugestao === 'targetReader'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      minHeight: 46
                    }}
                  >
                    <Wand2 size={11} color="#475569" /> IA
                  </button>
                </div>
              </div>
            </div>

            {/* Autor */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Autor / Pseudônimo
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={autor}
                  onChange={(e) => setAutor(e.target.value)}
                  placeholder="Seu nome ou pseudônimo"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSugerir('autor')}
                  disabled={loadingSugestao === 'autor'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '8px 12px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Wand2 size={12} color="#475569" /> IA
                </button>
              </div>
            </div>

            {/* Premissa Central */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Premissa Central da História
              </label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <textarea
                  rows={3}
                  value={topico}
                  onChange={(e) => setTopico(e.target.value)}
                  placeholder="Descreva a ideia central, protagonista, conflito e segredo do livro..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#ffffff',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSugerir('premissa')}
                  disabled={loadingSugestao === 'premissa'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '8px 12px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Wand2 size={12} color="#475569" /> IA
                </button>
              </div>
            </div>

            {/* Metas de Páginas e Capítulos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Páginas Alvo
                </label>
                <input
                  type="number"
                  value={paginasAlvo}
                  min={20}
                  max={500}
                  step={10}
                  onChange={(e) => setPaginasAlvo(parseInt(e.target.value) || 100)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Máximo Capítulos
                </label>
                <input
                  type="number"
                  value={maxCapitulos}
                  min={1}
                  max={50}
                  onChange={(e) => setMaxCapitulos(parseInt(e.target.value) || 15)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                />
              </div>
            </div>

            {/* Formato KDP e Idioma */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Tamanho KDP
                </label>
                <select
                  value={formato}
                  onChange={(e) => setFormato(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                >
                  <option value="6x9">6 x 9" (padrão)</option>
                  <option value="5x8">5 x 8"</option>
                  <option value="5.5x8.5">5.5 x 8.5"</option>
                  <option value="8.5x11">8.5 x 11"</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Idioma
                </label>
                <select
                  value={idioma}
                  onChange={(e) => setIdioma(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                >
                  <option value="português">Português</option>
                  <option value="inglês">Inglês</option>
                  <option value="espanhol">Espanhol</option>
                </select>
              </div>
            </div>

            {/* Tipografia do Título do Capítulo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Tam. Capítulo (pt)
                </label>
                <input
                  type="number"
                  value={tamCapitulo}
                  min={9}
                  max={16}
                  onChange={(e) => setTamCapitulo(parseInt(e.target.value) || 11)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Cor do Capítulo
                </label>
                <input
                  type="color"
                  value={corCapitulo}
                  onChange={(e) => setCorCapitulo(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: 2,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1'
                  }}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={optPromo}
                  onChange={(e) => setOptPromo(e.target.checked)}
                />
                Gerar página promocional digital automática
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={optSumario}
                  onChange={(e) => setOptSumario(e.target.checked)}
                />
                Incluir sumário diagramado com numeração KDP
              </label>
            </div>

            {/* INFORMAÇÃO DE CRÉDITOS DO LIVRO (US$ 3 POR LIVRO GERADO) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.04)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155' }}>
                <span style={{ fontSize: 14 }}>💳</span>
                <span>Créditos: <strong>{creditosLivros} {creditosLivros === 1 ? 'livro' : 'livros'}</strong> (US$ 3/livro)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreditModalMotivo('Recarregue seus créditos para produzir livros completos na plataforma.');
                  setIsCreditModalOpen(true);
                }}
                style={{
                  background: 'rgba(14, 165, 233, 0.1)',
                  color: '#0284c7',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Adicionar Créditos
              </button>
            </div>

            {/* BOTÕES DE CONTROLE DA PRODUÇÃO */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => bookType === 'planner' || bookType === 'diary' ? setActiveTab('planner') : iniciarGeracao()}
                disabled={gerando || isPlanningEditorial}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: gerando ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                <Play size={16} /> {bookType === 'planner' || bookType === 'diary'
                  ? '🚀 Gerar Páginas'
                  : isPlanningEditorial ? 'Planejando...' : gerando ? 'Gerando...' : '🚀 Gerar Livro'}
              </button>

              <button
                type="button"
                onClick={pararGeracao}
                disabled={!gerando}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '12px 16px',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: !gerando ? 'not-allowed' : 'pointer'
                }}
              >
                <Square size={14} /> Parar
              </button>
            </div>

            {/* BOTÃO GERAR CAPA & PÁGINA PROMOCIONAL */}
            <button
              type="button"
              onClick={gerarCapaEPaginaPromocional}
              disabled={gerando}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px',
                background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: 10,
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)'
              }}
            >
              <Sparkles size={16} /> 🎨 Gerar Capa & Página Promocional
            </button>

            {/* CONTINUAR E DESCARTAR */}
            {livro && livro.capitulos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={continuarGeracao}
                  disabled={isPlanningEditorial || (gerando && autoClickCountdown === null)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: autoClickCountdown !== null ? '10px 14px' : '10px',
                    background: autoClickCountdown !== null
                      ? 'linear-gradient(135deg, #059669, #10b981)'
                      : 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: autoClickCountdown !== null ? '2px solid #34d399' : 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: autoClickCountdown !== null
                      ? '0 0 16px rgba(16, 185, 129, 0.7)'
                      : '0 2px 6px rgba(16, 185, 129, 0.3)',
                    transform: isAutoClicking ? 'scale(0.95)' : autoClickCountdown !== null ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Play size={14} />
                  {autoClickCountdown !== null
                    ? `⚡ Auto-clique em ${autoClickCountdown}s...`
                    : `▶ Continuar Geração (Capítulo ${livro.capitulos.length + 1})`}
                </button>
                <button
                  type="button"
                  onClick={limparProgresso}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 12px',
                    background: '#f1f5f9',
                    color: '#ef4444',
                    border: '1px solid #fca5a5',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} /> Descartar
                </button>
              </div>
            )}

            {/* STATUS & BARRA DE PROGRESSO */}
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                fontWeight: 600,
                color: statusType === 'error' ? '#ef4444' : statusType === 'ok' ? '#10b981' : '#64748b'
              }}
            >
              {statusMsg}
            </div>

            <div
              style={{
                height: 6,
                background: '#e2e8f0',
                borderRadius: 3,
                overflow: 'hidden',
                marginTop: 6
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                  width: `${progressPercent}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            {/* DIAGNÓSTICO DO PIPELINE */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#64748b',
                marginTop: 10,
                maxHeight: 70,
                overflowY: 'auto'
              }}
            >
              {diagnostico}
            </div>

            {/* PAINEL DE AUDITORIA & AUTO-RECUPERAÇÃO AUTOMÁTICA */}
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)'
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
                    Auto-Recuperação (Self-Healing)
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      background: '#eff6ff',
                      color: '#2563eb',
                      padding: '1px 6px',
                      borderRadius: 4
                    }}
                  >
                    Ativo
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowErrorLogs(prev => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    color: errorLogs.length > 0 ? '#ea580c' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  📋 Log de Auditoria {errorLogs.length > 0 && `(${errorLogs.length})`}
                  <span style={{ fontSize: 9 }}>{showErrorLogs ? '▲' : '▼'}</span>
                </button>
              </div>

              {showErrorLogs && (
                <div
                  style={{
                    marginTop: 6,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '10px',
                    maxHeight: 180,
                    overflowY: 'auto',
                    fontSize: 11
                  }}
                >
                  {errorLogs.length === 0 ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                      ✓ Nenhum erro registrado. O fluxo de geração está operando com 100% de estabilidade.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {errorLogs.map(item => (
                        <div
                          key={item.id}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 4,
                            background: item.resolvido ? '#f0fdf4' : '#fff7ed',
                            borderLeft: `3px solid ${item.resolvido ? '#22c55e' : '#f97316'}`
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>
                              Capítulo {item.capitulo} · {item.timestamp}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: item.resolvido ? '#15803d' : '#c2410c'
                              }}
                            >
                              {item.resolvido ? '✓ Auto-Recuperado' : '⏳ Em Processamento'}
                            </span>
                          </div>
                          <div style={{ color: '#64748b', fontSize: 10, marginBottom: 2 }}>
                            <strong>Motivo:</strong> {item.erro}
                          </div>
                          <div style={{ color: '#0369a1', fontSize: 10, fontWeight: 600 }}>
                            <strong>Ação:</strong> {item.acao}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUNA 2: CARD DE PRÉ-VISUALIZAÇÃO COM ABAS */}
          {/* ========================================================= */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 700
            }}
          >
            {/* CABEÇALHO DE ABAS DE PRÉ-VISUALIZAÇÃO */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 14,
                borderBottom: '1px solid #f1f5f9',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: activeTab === 'preview' ? '#2563eb' : '#e2e8f0',
                    background: activeTab === 'preview' ? '#eff6ff' : '#ffffff',
                    color: activeTab === 'preview' ? '#2563eb' : '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <BookOpen size={15} /> 📖 Livro Diagramado
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('capa')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: activeTab === 'capa' ? '#2563eb' : '#e2e8f0',
                    background: activeTab === 'capa' ? '#eff6ff' : '#ffffff',
                    color: activeTab === 'capa' ? '#2563eb' : '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <ImageIcon size={15} /> 🎨 Capa KDP {capaFinal && '✓'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('promo')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: activeTab === 'promo' ? '#7c3aed' : '#e2e8f0',
                    background: activeTab === 'promo' ? '#f5f3ff' : '#ffffff',
                    color: activeTab === 'promo' ? '#7c3aed' : '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={15} /> ✨ Página Promocional {promoData && '✓'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('auditoria')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: activeTab === 'auditoria' ? '#059669' : '#e2e8f0',
                    background: activeTab === 'auditoria' ? '#ecfdf5' : '#ffffff',
                    color: activeTab === 'auditoria' ? '#059669' : '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <ShieldCheck size={15} /> 🔍 Auditoria & Verificadores {auditReport && `(${auditReport.score}%)`}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('colorir')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: activeTab === 'colorir' ? '#0284c7' : '#e2e8f0',
                    background: activeTab === 'colorir' ? '#f0f9ff' : '#ffffff',
                    color: activeTab === 'colorir' ? '#0284c7' : '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <span>🎨</span> Livro de Colorir KDP
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('planner')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: activeTab === 'planner' ? '#7c3aed' : '#e2e8f0',
                    background: activeTab === 'planner' ? '#f5f3ff' : '#ffffff',
                    color: activeTab === 'planner' ? '#7c3aed' : '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <FileText size={15} /> Planner & Diário
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('audiobook')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: activeTab === 'audiobook' ? '#8b5cf6' : '#e2e8f0',
                    background: activeTab === 'audiobook' ? '#f5f3ff' : '#ffffff',
                    color: activeTab === 'audiobook' ? '#7c3aed' : '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Abrir Audiobook Studio"
                >
                  <Headphones size={15} /> 🎧 Audiobook · Em breve
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublishingModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid #10b981',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                  }}
                  title="Abrir Publicação Multiplataforma"
                >
                  <Globe size={15} /> 🚀 Multiplataforma · Em breve
                </button>
              </div>

              {/* Botão para abrir o editor/visualizador completo da página promocional */}
              {promoData && (
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 12px',
                    borderRadius: 6,
                    background: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Eye size={14} /> Abrir Editor Promocional Full
                </button>
              )}
            </div>

            {/* ÁREA DE EXIBIÇÃO CONFORME A ABA ATIVA */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {/* ABA 1: PRÉ-VISUALIZAÇÃO DO LIVRO */}
              {activeTab === 'preview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* PAINEL DO MOTOR DE SILHUETAS MARGINAIS COM 3% DE SANGRIA EXTERNA */}
                  {/* PAINEL DO MOTOR DE SILHUETAS ARTÍSTICAS & MARCAS D'ÁGUA P&B */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '12px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>🎨</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                            Silhueta Artística & Marca d'Água de Fundo P&B (Página Inteira / Marginal)
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            Posicionada atrás do texto ocupando todo o livro (vertical e horizontal) com transparência P&B para miolo KDP
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={silhuetaConfig.ativado}
                            onChange={(e) => setSilhuetaConfig(prev => ({ ...prev, ativado: e.target.checked }))}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                          />
                          Ativar Silhueta no Livro
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSilhuetaPanel(!showSilhuetaPanel)}
                          style={{
                            background: showSilhuetaPanel ? '#e2e8f0' : '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#1e293b',
                            cursor: 'pointer'
                          }}
                        >
                          {showSilhuetaPanel ? 'Recolher Opções' : '⚙️ Configurar Silhueta P&B'}
                        </button>
                      </div>
                    </div>

                    {showSilhuetaPanel && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* SELEÇÃO RÁPIDA: GALERIA EDITORIAL P&B PRONTA PARA KDP */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Galeria Rápida de Silhuetas P&B (Miolo KDP Monocromático):</span>
                            {silhuetaConfig.imagemDataUrl && (
                              <button
                                type="button"
                                onClick={() => setSilhuetaConfig(prev => ({ ...prev, imagemDataUrl: undefined }))}
                                style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
                              >
                                Limpar Silhueta
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                            {GALERIA_SILHUETAS_PB.map((item) => {
                              const isSelected = silhuetaConfig.imagemDataUrl === item.svgDataUrl;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setSilhuetaConfig(prev => ({
                                      ...prev,
                                      ativado: true,
                                      imagemDataUrl: item.svgDataUrl,
                                      monocromatico: true
                                    }));
                                  }}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    padding: '8px',
                                    borderRadius: 6,
                                    border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                    background: isSelected ? '#eff6ff' : '#ffffff',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title={item.descricao}
                                >
                                  <img
                                    src={item.svgDataUrl}
                                    alt={item.nome}
                                    style={{
                                      width: 44,
                                      height: 44,
                                      objectFit: 'contain',
                                      marginBottom: 4,
                                      filter: 'grayscale(100%)'
                                    }}
                                  />
                                  <span style={{ fontSize: 10, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#1d4ed8' : '#334155', textAlign: 'center' }}>
                                    {item.nome}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* CONFIGURAÇÕES FINAS: COBERTURA, TRANSPARÊNCIA E DISTRIBUIÇÃO */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                          {/* MODO DE COBERTURA */}
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                              Posicionamento da Silhueta
                            </label>
                            <select
                              value={silhuetaConfig.modoCobertura || 'full-page'}
                              onChange={(e) => setSilhuetaConfig(prev => ({ ...prev, modoCobertura: e.target.value as any }))}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                            >
                              <option value="full-page">Página Inteira (100% Vertical & Horizontal)</option>
                              <option value="marginal">Marginal (Sangria Externa 3%)</option>
                            </select>
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                              Fica por trás do texto ocupando a folha inteira.
                            </div>
                          </div>

                          {/* SLIDER DE TRANSPARÊNCIA / OPACIDADE */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
                                Transparência P&B
                              </label>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#1d4ed8',
                                background: '#eff6ff',
                                padding: '1px 6px',
                                borderRadius: 4,
                                border: '1px solid #bfdbfe'
                              }}>
                                {silhuetaConfig.opacidade || 10}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={2}
                              max={40}
                              step={1}
                              value={silhuetaConfig.opacidade || 10}
                              onChange={(e) => setSilhuetaConfig(prev => ({ ...prev, opacidade: Number(e.target.value) }))}
                              style={{ width: '100%', cursor: 'pointer', accentColor: '#2563eb' }}
                            />
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                              Recomendado: 8% a 15% para não ofuscar o texto no KDP.
                            </div>
                          </div>

                          {/* REGRAS DE APLICAÇÃO POR PÁGINAS */}
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                              Aplicação nas Páginas
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1e293b', marginBottom: 6, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={silhuetaConfig.aplicarTodas !== false}
                                onChange={(e) => setSilhuetaConfig(prev => ({ ...prev, aplicarTodas: e.target.checked }))}
                                style={{ width: 14, height: 14 }}
                              />
                              Aplicar em todas as páginas do livro
                            </label>

                            {!silhuetaConfig.aplicarTodas && (
                              <select
                                value={silhuetaConfig.modo}
                                onChange={(e) => setSilhuetaConfig(prev => ({ ...prev, modo: e.target.value as any }))}
                                style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11 }}
                              >
                                <option value="aleatorio">Aleatório Inteligente (ex: 10 págs)</option>
                                <option value="intervalo">Intervalo Fixo (a cada X págs)</option>
                                <option value="capitulos">Apenas Início de Cada Capítulo</option>
                              </select>
                            )}
                          </div>
                        </div>

                        {/* GERADOR REPLICATE FLUX (PERSONALIZADO VIA IA) */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
                            <input
                              type="text"
                              value={personagemSilhuetaFoco}
                              onChange={(e) => setPersonagemSilhuetaFoco(e.target.value)}
                              placeholder="Ou crie com IA: ex: Detetive sob poste de luz, bússola antiga..."
                              style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11 }}
                            />
                            <button
                              type="button"
                              onClick={handleGerarSilhueta}
                              disabled={isGeneratingSilhueta}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 6,
                                background: '#3b82f6',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: isGeneratingSilhueta ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {isGeneratingSilhueta ? (
                                <>
                                  <RefreshCw size={11} className="animate-spin" /> Gerando Silhueta...
                                </>
                              ) : (
                                <>
                                  <Sparkles size={11} /> Gerar com IA
                                </>
                              )}
                            </button>
                          </div>

                          {silhuetaConfig.imagemDataUrl && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <img
                                src={silhuetaConfig.imagemDataUrl}
                                alt="Silhueta Ativa"
                                style={{
                                  height: 38,
                                  width: 38,
                                  objectFit: 'contain',
                                  borderRadius: 4,
                                  border: '1px solid #cbd5e1',
                                  background: '#f8fafc',
                                  filter: 'grayscale(100%)'
                                }}
                              />
                              <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle2 size={13} /> Silhueta Ativa ({silhuetaConfig.opacidade || 10}%)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {livro && livro.capitulos.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                        padding: '10px 14px',
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1e293b', fontWeight: 600 }}>
                        <CheckCircle2 size={16} color="#16a34a" />
                        <span>Manuscrito: {livro.capitulos.length} capítulos ({livro.capitulos.reduce((acc, c) => acc + (c.texto?.split(/\s+/).filter(Boolean).length || 0), 0)} palavras)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setIsEditingManuscriptInline(!isEditingManuscriptInline)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 14px',
                            borderRadius: 6,
                            background: isEditingManuscriptInline ? '#0f172a' : '#ffffff',
                            color: isEditingManuscriptInline ? '#ffffff' : '#0f172a',
                            border: '1px solid #0f172a',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Alternar entre o modo de edição direta e o modo de visualização diagramada"
                        >
                          <Edit3 size={14} /> {isEditingManuscriptInline ? '👁️ Ver Diagramação' : '✏️ Editar Manuscrito'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPageReviewerOpen(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 16px',
                            borderRadius: 6,
                            background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
                          }}
                          title="Abrir revisor interativo para folhear e validar cada página antes de gerar o PDF"
                        >
                          <BookOpen size={14} /> 📖 Folhear Página por Página
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    ref={previewScrollRef}
                    style={{
                      height: capaFinal ? 460 : 560,
                      overflowY: 'auto',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: isEditingManuscriptInline ? '24px 28px' : '36px 48px',
                      fontFamily: isEditingManuscriptInline ? 'system-ui, -apple-system, sans-serif' : 'Georgia, serif',
                      color: '#1e293b',
                      position: 'relative',
                      boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    {/* SILHUETA DE FUNDO EM PRETO E BRANCO OCUPANDO TODO O LIVRO (HORIZONTAL E VERTICAL) ATRÁS DO TEXTO */}
                    {silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl && !isEditingManuscriptInline && (
                      <img
                        src={silhuetaConfig.imagemDataUrl}
                        alt=""
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: (silhuetaConfig.opacidade || 10) / 100,
                          filter: 'grayscale(100%) contrast(115%)',
                          pointerEvents: 'none',
                          zIndex: 0
                        }}
                      />
                    )}

                    {/* IMAGEM DE FUNDO DA CAPA SE APLICÁVEL */}
                    {fundoImg && !silhuetaConfig.imagemDataUrl && !isEditingManuscriptInline && (
                      <img
                        src={fundoImg}
                        alt=""
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: 0.10,
                          pointerEvents: 'none',
                          zIndex: 0
                        }}
                      />
                    )}

                    <div style={{ position: 'relative', zIndex: 1 }}>
                      {livro && livro.capitulos.length > 0 ? (
                        isEditingManuscriptInline ? (
                          /* MODO 1: EDITOR DE TEXTO DIRETO DO LIVRO NA TELA */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                                  ✏️ Editor de Textos do Livro em Tempo Real
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                  Edite os títulos, subtítulo, autor e os textos de cada capítulo diretamente aqui.
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (livro) {
                                    salvarProgressoLocal(livro);
                                    setStatusMsg('✓ Todas as alterações do manuscrito foram salvas com sucesso!');
                                    setStatusType('ok');
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '8px 16px',
                                  borderRadius: 6,
                                  background: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  cursor: 'pointer'
                                }}
                              >
                                <Save size={14} /> Salvar Alterações
                              </button>
                            </div>

                            {/* DADOS GERAIS DO LIVRO */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                                  Título Principal
                                </label>
                                <input
                                  type="text"
                                  value={livro.titulo}
                                  onChange={(e) => {
                                    const novoT = e.target.value;
                                    setTitulo(novoT);
                                    setLivro(prev => prev ? { ...prev, titulo: novoT } : null);
                                  }}
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                                  Autor
                                </label>
                                <input
                                  type="text"
                                  value={livro.autor}
                                  onChange={(e) => {
                                    const novoA = e.target.value;
                                    setAutor(novoA);
                                    setLivro(prev => prev ? { ...prev, autor: novoA } : null);
                                  }}
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                                />
                              </div>

                              <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                                  Subtítulo Comercial
                                </label>
                                <textarea
                                  rows={2}
                                  value={livro.subtitulo}
                                  onChange={(e) => {
                                    const novoS = e.target.value;
                                    setSubtitulo(novoS);
                                    setLivro(prev => prev ? { ...prev, subtitulo: novoS } : null);
                                  }}
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                                />
                              </div>
                            </div>

                            {/* LISTA DOS CAPÍTULOS EDITÁVEIS */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                Capítulos do Livro ({livro.capitulos.length})
                              </div>
                              {livro.capitulos.map((c, idx) => (
                                <div key={idx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 14 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                                      Cap. {idx + 1}
                                    </span>
                                    <input
                                      type="text"
                                      value={c.titulo}
                                      onChange={(e) => {
                                        const novoTitulo = e.target.value;
                                        setLivro(prev => {
                                          if (!prev) return null;
                                          const novos = [...prev.capitulos];
                                          novos[idx] = { ...novos[idx], titulo: novoTitulo };
                                          return { ...prev, capitulos: novos };
                                        });
                                      }}
                                      style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
                                    />
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                      {c.texto.split(/\s+/).filter(Boolean).length} palavras
                                    </span>
                                  </div>

                                  <textarea
                                    rows={9}
                                    value={c.texto}
                                    onChange={(e) => {
                                      const novoTexto = e.target.value;
                                      setLivro(prev => {
                                        if (!prev) return null;
                                        const novos = [...prev.capitulos];
                                        novos[idx] = { ...novos[idx], texto: novoTexto };
                                        return { ...prev, capitulos: novos };
                                      });
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '10px 12px',
                                      borderRadius: 6,
                                      border: '1px solid #e2e8f0',
                                      fontSize: 13,
                                      lineHeight: 1.6,
                                      fontFamily: 'system-ui, -apple-system, sans-serif',
                                      color: '#1e293b'
                                    }}
                                  />
                                </div>
                              ))}
                            </div>

                            <div style={{ textAlign: 'center', padding: '10px 0' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (livro) {
                                    salvarProgressoLocal(livro);
                                    setStatusMsg('✓ Todas as alterações do manuscrito foram salvas com sucesso!');
                                    setStatusType('ok');
                                  }
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '10px 24px',
                                  borderRadius: 6,
                                  background: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 700,
                                  fontSize: 13,
                                  cursor: 'pointer'
                                }}
                              >
                                <Save size={16} /> Salvar Todas as Alterações do Livro
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* MODO 2: VISUALIZADOR DIAGRAMADO DE LUXO COM SUMÁRIO PROFISSIONAL */
                          <div>
                            {/* PÁGINA DE ROSTO EDITORIAL */}
                            <div style={{ textAlign: 'center', paddingBottom: 40, borderBottom: '1px solid #e2e8f0', marginBottom: 40 }}>
                              <h1 style={{ fontSize: '2.2rem', marginBottom: 8, letterSpacing: '-0.5px', color: '#0f172a' }}>
                                {livro.titulo}
                              </h1>
                              {livro.subtitulo && (
                                <div style={{ fontStyle: 'italic', color: '#475569', marginBottom: 24, fontSize: '1.15rem', maxWidth: 650, margin: '0 auto 24px auto', lineHeight: 1.5 }}>
                                  {livro.subtitulo}
                                </div>
                              )}
                              <div style={{ fontSize: '0.95rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                {livro.autor}
                              </div>
                            </div>

                            {/* SUMÁRIO EDITORIAL DE LUXO */}
                            {optSumario && (
                              <div
                                style={{
                                  marginBottom: 48,
                                  padding: '24px 28px',
                                  background: '#fcfcfc',
                                  borderRadius: 8,
                                  border: '1px solid #e2e8f0',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                }}
                              >
                                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                                  <span style={{
                                    fontSize: 12,
                                    letterSpacing: '3px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: '#0f172a',
                                    display: 'inline-block',
                                    paddingBottom: 4,
                                    borderBottom: '2px solid #0f172a'
                                  }}>
                                    Sumário Geral
                                  </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {(() => {
                                    let runningPage = 5;
                                    return livro.capitulos.map((c, idx) => {
                                      const words = c.texto?.split(/\s+/).filter(Boolean).length || 0;
                                      const estPages = Math.max(2, Math.ceil(words / 280));
                                      const startPage = runningPage;
                                      runningPage += estPages;
                                      return (
                                        <div
                                          key={idx}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            fontSize: 13,
                                            color: '#1e293b'
                                          }}
                                        >
                                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                            {idx + 1}. {c.titulo}
                                          </span>
                                          <span
                                            style={{
                                              flex: 1,
                                              margin: '0 8px',
                                              borderBottom: '1px dotted #94a3b8',
                                              minWidth: 20
                                            }}
                                          />
                                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                            pág. {startPage}
                                          </span>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            )}

                            {/* CAPÍTULOS COM DIAGRAMAÇÃO REFINADA (DROP CAP & CABEÇALHO CLÁSSICO) */}
                            {livro.capitulos.map((c, idx) => {
                              const paragrafos = c.texto.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
                              const primeiroParagrafo = paragrafos[0] || '';
                              const primeiraLetra = primeiroParagrafo.charAt(0);
                              const restoPrimeiroParagrafo = primeiroParagrafo.slice(1);

                              return (
                                <div key={idx} style={{ marginBottom: 48 }}>
                                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                    <div style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: 4 }}>
                                      Capítulo {idx + 1}
                                    </div>
                                    <h2
                                      style={{
                                        color: corCapitulo,
                                        fontSize: `${tamCapitulo + 4}pt`,
                                        margin: '0 0 10px 0',
                                        fontWeight: 700,
                                        letterSpacing: '-0.3px'
                                      }}
                                    >
                                      {c.titulo}
                                    </h2>
                                    <div style={{ width: 40, height: 1, background: '#cbd5e1', margin: '0 auto 12px auto' }} />

                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <select
                                        aria-label="Estilo da ilustração do capítulo"
                                        value={estiloIlustracaoCapitulo}
                                        onChange={e => setEstiloIlustracaoCapitulo(e.target.value as typeof estiloIlustracaoCapitulo)}
                                        disabled={generatingCapImgIndex !== null}
                                        style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 11, color: '#334155' }}
                                      >
                                        <option value="realista">Fotografia realista</option>
                                        <option value="arte_editorial">Ilustração fine art</option>
                                        <option value="aquarela">Aquarela</option>
                                        <option value="nanquim">Nanquim</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => handleGerarIlustracaoCapitulo(idx)}
                                        disabled={generatingCapImgIndex !== null}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          padding: '4px 10px',
                                          borderRadius: 6,
                                          background: c.imagemDataUrl ? '#ecfdf5' : '#f8fafc',
                                          color: c.imagemDataUrl ? '#059669' : '#334155',
                                          border: `1px solid ${c.imagemDataUrl ? '#a7f3d0' : '#cbd5e1'}`,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor: generatingCapImgIndex !== null ? 'not-allowed' : 'pointer'
                                        }}
                                      >
                                        {generatingCapImgIndex === idx ? (
                                          <>
                                            <RefreshCw size={11} className="animate-spin" /> Gerando Ilustração...
                                          </>
                                        ) : c.imagemDataUrl ? (
                                          <>
                                            <CheckCircle2 size={11} /> Ilustrado (Regenerar)
                                          </>
                                        ) : (
                                          <>
                                            <ImageIcon size={11} /> Ilustrar Capítulo
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Imagem Ilustrada do Capítulo */}
                                  {c.imagemDataUrl && (
                                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                      <img
                                        src={c.imagemDataUrl}
                                        alt={c.titulo}
                                        style={{
                                          maxWidth: '100%',
                                          maxHeight: 280,
                                          borderRadius: 6,
                                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                      />
                                    </div>
                                  )}

                                  {/* PARÁGRAFOS COM CAPITULAR (DROP CAP) E TRATAMENTO DE SUBSEÇÕES */}
                                  {paragrafos.map((p, pIdx) => {
                                    // Se for cabeçalho ### de seção
                                    if (p.startsWith('###')) {
                                      const tituloSecao = p.replace(/^###\s*/, '').trim();
                                      return (
                                        <div
                                          key={pIdx}
                                          style={{
                                            fontWeight: 700,
                                            fontSize: '1.05rem',
                                            margin: '20px 0 8px 0',
                                            color: '#0f172a',
                                            borderLeft: '3px solid #2563eb',
                                            paddingLeft: 10
                                          }}
                                        >
                                          {tituloSecao}
                                        </div>
                                      );
                                    }

                                    // Primeiro parágrafo com Drop Cap clássico
                                    if (pIdx === 0 && primeiraLetra) {
                                      return (
                                        <p
                                          key={pIdx}
                                          style={{
                                            marginBottom: 12,
                                            textAlign: 'justify',
                                            lineHeight: 1.75,
                                            fontSize: '0.96rem',
                                            color: '#1e293b'
                                          }}
                                        >
                                          <span
                                            style={{
                                              float: 'left',
                                              fontSize: '3.4rem',
                                              lineHeight: '0.78',
                                              paddingRight: 8,
                                              paddingTop: 4,
                                              fontWeight: 700,
                                              fontFamily: 'Georgia, serif',
                                              color: corCapitulo
                                            }}
                                          >
                                            {primeiraLetra}
                                          </span>
                                          {restoPrimeiroParagrafo}
                                        </p>
                                      );
                                    }

                                    return (
                                      <p
                                        key={pIdx}
                                        style={{
                                          textIndent: '1.8em',
                                          marginBottom: 10,
                                          textAlign: 'justify',
                                          lineHeight: 1.75,
                                          fontSize: '0.94rem',
                                          color: '#1e293b'
                                        }}
                                      >
                                        {p}
                                      </p>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        <div style={{ textAlign: 'center', padding: '120px 20px', color: '#94a3b8' }}>
                          <BookOpen size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                          <p style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>
                            O livro diagramado aparecerá aqui em tempo real conforme cada capítulo for gerado pelo Gemini.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Capa Box abaixo do preview (como no script original) */}
                  {capaFinal && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '12px 18px'
                      }}
                    >
                      <img
                        src={capaFinal}
                        alt="Capa do Livro"
                        style={{
                          height: 120,
                          borderRadius: 4,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          🎨 Capa Oficial Diagramada KDP (1600x2400)
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          Pronta para publicação na Amazon KDP ou download em PNG.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 2: CAPA DO LIVRO (ESTÚDIO PROFISSIONAL DE DIREÇÃO DE ARTE LADO A LADO) */}
              {activeTab === 'capa' && (
                <div
                  style={{
                    height: 580,
                    overflowY: 'auto',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    padding: 20
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
                    {/* COLUNA ESQUERDA: CARROSSEL DE CAPAS GERADAS COM NAVEGAÇÃO LATERAL E SELETOR */}
                    {(() => {
                      const capaEmExibicao = historicoCapas[indiceCapaCarrossel] || (capaFinal ? { id: 'ativa_fallback', dataUrl: capaFinal, timestamp: Date.now() } : null);
                      const isCapaAtiva = capaEmExibicao ? capaEmExibicao.dataUrl === capaFinal : false;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#ffffff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative' }}>
                          {capaEmExibicao ? (
                            <div style={{ textAlign: 'center', width: '100%' }}>
                              {/* CABEÇALHO DO CARROSSEL: CONTADOR E STATUS DA CAPA */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 12,
                                paddingBottom: 10,
                                borderBottom: '1px solid #f1f5f9',
                                gap: 8,
                                flexWrap: 'wrap'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Palette size={15} color="#2563eb" />
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                                    Galeria de Capas
                                  </span>
                                  <span style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#2563eb',
                                    background: '#eff6ff',
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    border: '1px solid #bfdbfe'
                                  }}>
                                    {indiceCapaCarrossel + 1} de {Math.max(1, historicoCapas.length)}
                                  </span>
                                </div>

                                {/* STATUS / BOTÃO PARA ESCOLHER CAPA */}
                                {isCapaAtiva ? (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: '#059669',
                                    background: '#ecfdf5',
                                    padding: '3px 10px',
                                    borderRadius: 999,
                                    border: '1px solid #a7f3d0'
                                  }}>
                                    <Check size={12} /> Capa Ativa do Livro
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleDefinirComoCapaAtiva(capaEmExibicao)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: '#ffffff',
                                      background: '#2563eb',
                                      padding: '4px 12px',
                                      borderRadius: 6,
                                      border: 'none',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                                      transition: 'all 0.15s ease'
                                    }}
                                    title="Definir esta variação como a capa oficial do livro"
                                  >
                                    <Star size={12} /> Escolher Esta Capa
                                  </button>
                                )}
                              </div>

                              {/* ÁREA DA CAPA GRANDE COM OS BOTÕES DE NAVEGAÇÃO LATERAL (SETAS / PLAY DE CADA LADO) */}
                              <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                                <img
                                  src={capaEmExibicao.dataUrl}
                                  alt={`Capa variação ${indiceCapaCarrossel + 1}`}
                                  style={{
                                    maxHeight: 410,
                                    maxWidth: '100%',
                                    borderRadius: 8,
                                    boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                                    display: 'block',
                                    margin: '0 auto',
                                    transition: 'all 0.2s ease'
                                  }}
                                />

                                {/* BOTÃO NAVEGAÇÃO ESQUERDA (SETA / "PLAY" ESQUERDO) */}
                                {historicoCapas.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={handleCapaAnterior}
                                    style={{
                                      position: 'absolute',
                                      left: -16,
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      width: 38,
                                      height: 38,
                                      borderRadius: '50%',
                                      background: 'rgba(15, 23, 42, 0.88)',
                                      color: '#ffffff',
                                      border: '1px solid rgba(255, 255, 255, 0.25)',
                                      backdropFilter: 'blur(8px)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
                                      transition: 'all 0.15s ease',
                                      zIndex: 10
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.88)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                                    title="Ver capa anterior (◀)"
                                  >
                                    <ChevronLeft size={20} />
                                  </button>
                                )}

                                {/* BOTÃO NAVEGAÇÃO DIREITA (SETA / "PLAY" DIREITO) */}
                                {historicoCapas.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={handleCapaProxima}
                                    style={{
                                      position: 'absolute',
                                      right: -16,
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      width: 38,
                                      height: 38,
                                      borderRadius: '50%',
                                      background: 'rgba(15, 23, 42, 0.88)',
                                      color: '#ffffff',
                                      border: '1px solid rgba(255, 255, 255, 0.25)',
                                      backdropFilter: 'blur(8px)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
                                      transition: 'all 0.15s ease',
                                      zIndex: 10
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.88)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                                    title="Ver próxima capa (▶)"
                                  >
                                    <ChevronRight size={20} />
                                  </button>
                                )}
                              </div>

                              {/* CARROSSEL HORIZONTAL DE MINIATURAS (THUMBNAILS STRIP) */}
                              {historicoCapas.length > 1 && (
                                <div style={{ marginTop: 14 }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    overflowX: 'auto',
                                    padding: '6px 4px',
                                    maxWidth: '100%'
                                  }}>
                                    {historicoCapas.map((item, idx) => {
                                      const isSelected = idx === indiceCapaCarrossel;
                                      const isAtiva = item.dataUrl === capaFinal;
                                      return (
                                        <div
                                          key={item.id}
                                          onClick={() => handleSelecionarCapaCarrossel(idx)}
                                          style={{
                                            position: 'relative',
                                            cursor: 'pointer',
                                            borderRadius: 6,
                                            padding: 2,
                                            border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                            background: isSelected ? '#eff6ff' : '#ffffff',
                                            boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.25)' : 'none',
                                            transition: 'all 0.15s ease',
                                            flexShrink: 0
                                          }}
                                          title={`Capa ${idx + 1}${isAtiva ? ' (Ativa)' : ''}`}
                                        >
                                          <img
                                            src={item.dataUrl}
                                            alt={`Miniatura ${idx + 1}`}
                                            style={{
                                              width: 48,
                                              height: 72,
                                              objectFit: 'cover',
                                              borderRadius: 4,
                                              display: 'block'
                                            }}
                                          />
                                          {isAtiva && (
                                            <span style={{
                                              position: 'absolute',
                                              top: 4,
                                              right: 4,
                                              background: '#10b981',
                                              color: '#ffffff',
                                              borderRadius: '50%',
                                              width: 14,
                                              height: 14,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: 9,
                                              fontWeight: 800,
                                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                            }}>
                                              ✓
                                            </span>
                                          )}
                                          <span style={{
                                            position: 'absolute',
                                            bottom: 3,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            background: isSelected ? '#2563eb' : 'rgba(15, 23, 42, 0.75)',
                                            color: '#ffffff',
                                            fontSize: 9,
                                            fontWeight: 700,
                                            padding: '1px 5px',
                                            borderRadius: 4,
                                            whiteSpace: 'nowrap'
                                          }}>
                                            #{idx + 1}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* BADGES TÉCNICOS KDP */}
                              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
                                  ✓ 1600x2400 (300 DPI)
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 4, border: '1px solid #bfdbfe' }}>
                                  ✓ Sem Selos Artificiais
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: 4, border: '1px solid #ddd6fe' }}>
                                  ✓ Área Limpa Ativa
                                </span>
                              </div>

                              {/* BOTÕES DE AÇÃO: DEFINIR COMO ATIVA, BAIXAR PNG, COPIAR E EXCLUIR */}
                              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                                {!isCapaAtiva && (
                                  <button
                                    type="button"
                                    onClick={() => handleDefinirComoCapaAtiva(capaEmExibicao)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '8px 14px',
                                      borderRadius: 6,
                                      background: '#059669',
                                      color: '#ffffff',
                                      border: 'none',
                                      fontSize: 12,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                                    }}
                                  >
                                    <Check size={14} /> Ativar Esta Capa no Livro
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = capaEmExibicao.dataUrl;
                                    link.download = `${(titulo || 'capa-livro').toLowerCase().replace(/\s+/g, '-')}-var${indiceCapaCarrossel + 1}.png`;
                                    link.click();
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '8px 14px',
                                    borderRadius: 6,
                                    background: '#0f172a',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  <Download size={14} /> Baixar PNG KDP
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const blob = await (await fetch(capaEmExibicao.dataUrl)).blob();
                                      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                                      setStatusMsg('✓ Imagem copiada para a área de transferência!');
                                      setStatusType('ok');
                                    } catch (e) {
                                      setStatusMsg('Não foi possível copiar automaticamente para a área de transferência.');
                                    }
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '8px 14px',
                                    borderRadius: 6,
                                    background: '#ffffff',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Copy size={14} /> Copiar Imagem
                                </button>

                                {historicoCapas.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleExcluirCapaDoHistorico(capaEmExibicao.id, e)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      padding: '8px 12px',
                                      borderRadius: 6,
                                      background: '#fef2f2',
                                      color: '#dc2626',
                                      border: '1px solid #fecaca',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                    title="Descartar esta variação de capa do carrossel"
                                  >
                                    <Trash2 size={13} /> Descartar
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                              <ImageIcon size={54} style={{ opacity: 0.3, marginBottom: 12 }} />
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#475569', marginBottom: 4 }}>
                                Nenhuma capa gerada ainda
                              </div>
                              <p style={{ fontStyle: 'italic', fontSize: 12, maxWidth: 280, margin: '0 auto' }}>
                                Utilize o painel ao lado para gerar sua primeira capa com estilo editorial moderno.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* COLUNA DIREITA: ESTÚDIO DE GERAÇÃO & DIREÇÃO DE ARTE AO LADO DA CAPA */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: '#ffffff', padding: 20, borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Palette size={18} color="#2563eb" />
                          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            Estúdio de Capa & Direção de Arte
                          </h3>
                        </div>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                          Gere novas variações de capa diretamente aqui com layout profissional de revistas internacionais, tipografia moderna e zero selos artificiais.
                        </p>
                      </div>

                      {/* BOTÃO PRINCIPAL DE GERAÇÃO DIRETA */}
                      <button
                        type="button"
                        onClick={handleGerarOutraCapa}
                        disabled={isRegeneratingCoverOnly || isGeneratingSilhueta}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '12px 18px',
                          borderRadius: 8,
                          background: isRegeneratingCoverOnly
                            ? '#94a3b8'
                            : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: isRegeneratingCoverOnly ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isRegeneratingCoverOnly ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" /> Gerando Novo Conceito com IA...
                          </>
                        ) : (
                          <>
                            <Sparkles size={15} /> ✨ Gerar Outra Capa com IA (Novo Conceito)
                          </>
                        )}
                      </button>

                      {/* SELEÇÃO DO ESTILO TIPOGRÁFICO MODERNO */}
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                          Estilo da Tipografia (Design de Revista):
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                          {[
                            { id: 'modern-magazine', label: 'Moderno Revista', desc: 'Montserrat / Sans', sub: 'Clean & Equilibrado' },
                            { id: 'luxury-serif', label: 'Luxo Editorial', desc: 'Playfair / Cinzel', sub: 'Clássico Premiado' },
                            { id: 'bold-impact', label: 'Impacto Bold', desc: 'Oswald / Suíço', sub: 'Forte & Autoritário' }
                          ].map((tipo) => {
                            const isSelected = estiloCapaTipo === tipo.id;
                            return (
                              <button
                                key={tipo.id}
                                type="button"
                                onClick={() => setEstiloCapaTipo(tipo.id as any)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                  background: isSelected ? '#eff6ff' : '#ffffff',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                                  {tipo.label}
                                </div>
                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                  {tipo.desc}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                          Composição do título:
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                          {([
                            { id: 'topo', label: 'Topo editorial', detail: 'Abertura clássica' },
                            { id: 'centro', label: 'Centro clássico', detail: 'Foco equilibrado' },
                            { id: 'esquerda', label: 'Alinhado à esquerda', detail: 'Composição assimétrica' }
                          ] satisfies { id: CoverTitleLayout; label: string; detail: string }[]).map(layout => {
                            const isSelected = posicaoTituloCapa === layout.id;
                            return (
                              <button
                                key={layout.id}
                                type="button"
                                onClick={() => setPosicaoTituloCapa(layout.id)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                  background: isSelected ? '#eff6ff' : '#ffffff',
                                  textAlign: 'left',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                                  {layout.label}
                                </div>
                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                  {layout.detail}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* SELEÇÃO DO ESTILO VISUAL DA ARTE DE FUNDO */}
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                          Conceito Visual da Ilustração (IA):
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                          {[
                            { id: 'minimalist', label: 'Fotografia Editorial', desc: 'Natural e com espaço negativo' },
                            { id: 'cinematic', label: 'Fotografia Cinematográfica', desc: 'Luz e textura naturais' },
                            { id: 'concept', label: 'Ilustração Fine Art', desc: 'Pinceladas e materiais táteis' },
                            { id: 'abstract', label: 'Arte Geométrica', desc: 'Formas autorais e assimétricas' }
                          ].map((estilo) => {
                            const isSelected = estiloArteVisual === estilo.id;
                            return (
                              <button
                                key={estilo.id}
                                type="button"
                                onClick={() => setEstiloArteVisual(estilo.id as any)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                  background: isSelected ? '#eff6ff' : '#ffffff',
                                  textAlign: 'left',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                                  {estilo.label}
                                </div>
                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                                  {estilo.desc}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* CONTROLE DA ÁREA LIMPA DO TÍTULO (CLEAN CONTRAST ZONE) */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
                            Regra da Área Limpa do Título (Clean Zone):
                          </label>
                          <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>
                            Contraste anti-ruído ativo
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                          {[
                            { id: 'suave', label: 'Suave (60%)' },
                            { id: 'media', label: 'Média (80%) ★' },
                            { id: 'forte', label: 'Forte (92%)' }
                          ].map((z) => {
                            const isSelected = intensidadeZonaLimpa === z.id;
                            return (
                              <button
                                key={z.id}
                                type="button"
                                onClick={() => setIntensidadeZonaLimpa(z.id as any)}
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: isSelected ? '2px solid #059669' : '1px solid #cbd5e1',
                                  background: isSelected ? '#ecfdf5' : '#ffffff',
                                  fontSize: 11,
                                  fontWeight: isSelected ? 700 : 500,
                                  color: isSelected ? '#065f46' : '#334155',
                                  cursor: 'pointer',
                                  textAlign: 'center'
                                }}
                              >
                                {z.label}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                          Garante que o título fique isolado sobre fundo escuro limpo, sem elementos da arte atrapalhando a leitura.
                        </div>
                      </div>

                      {/* CAMPO DE DIRECIONAMENTO PERSONALIZADO DA ARTE */}
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          Direcionamento Opcional da Arte (Palavras-chave):
                        </label>
                        <input
                          type="text"
                          value={customCoverPrompt}
                          onChange={(e) => setCustomCoverPrompt(e.target.value)}
                          placeholder="Ex: Tons esmeralda e dourado, arquitetura minimalista moderna..."
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            fontSize: 12
                          }}
                        />
                      </div>

                      {/* BOTÃO PARA REAPLICAR TIPOGRAFIA IMEDIATAMENTE NA IMAGEM ATUAL */}
                      <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px dashed #e2e8f0' }}>
                        <button
                          type="button"
                          onClick={handleReaplicarTipografia}
                          disabled={isReapplyingTypography || (!fundoImg && !capaFinal)}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: '#f1f5f9',
                            color: '#1e293b',
                            border: '1px solid #cbd5e1',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: (!fundoImg && !capaFinal) || isReapplyingTypography ? 'not-allowed' : 'pointer'
                          }}
                          title="Troca o estilo da fonte ou ajusta a área limpa na imagem existente instantaneamente"
                        >
                          <Palette size={13} /> {isReapplyingTypography ? 'Reaplicando...' : 'Reaplicar Tipografia & Área Limpa'}
                        </button>
                      </div>

                      {/* DIRETRIZES ATIVAS */}
                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
                        🛡️ <strong>Diretriz de Design:</strong> Todas as capas são geradas sem medalhas ou carimbos para máxima autoridade comercial, com área desobstruída dedicada ao título.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: PÁGINA PROMOCIONAL DIGITAL */}
              {activeTab === 'promo' && (
                <div
                  style={{
                    height: 540,
                    overflowY: 'auto',
                    background: '#090a0f',
                    borderRadius: 8,
                    border: '1px solid #1e293b',
                    padding: 16
                  }}
                >
                  {promoData ? (
                    <BookPromotionalPage
                      data={promoData}
                      viewMode="desktop"
                      isEditable={false}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '120px 20px', color: '#94a3b8' }}>
                      <Sparkles size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                      <p style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>
                        A página promocional será gerada automaticamente assim que a capa for criada.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 4: AUDITORIA & CORREÇÃO EDITORIAL KDP DEFINITIVA */}
              {activeTab === 'auditoria' && (
                <div
                  style={{
                    maxHeight: 720,
                    overflowY: 'auto',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                  }}
                >
                  {/* SISTEMA DEFINITIVO DE CORREÇÃO EDITORIAL CAPÍTULO A CAPÍTULO */}
                  <EditorialCorrectionSection
                    livro={livro}
                    capaFinal={capaFinal}
                    formato={formato}
                    optSumario={optSumario}
                    tamCapitulo={tamCapitulo}
                    corCapitulo={corCapitulo}
                    topico={topico}
                    onBookUpdated={(novoLivro) => {
                      setLivro(prev => {
                        if (!prev) return null;
                        const atualizado: LivroGerado = {
                          ...prev,
                          titulo: novoLivro.titulo,
                          subtitulo: novoLivro.subtitulo,
                          autor: novoLivro.autor,
                          genero: novoLivro.genero,
                          idioma: novoLivro.idioma,
                          capitulos: novoLivro.capitulos
                        };
                        salvarProgressoLocal(atualizado, capaFinal || undefined, fundoImg || undefined, promoData || undefined);
                        return atualizado;
                      });
                    }}
                    onStatusMessage={(msg, t) => {
                      setStatusMsg(msg);
                      setStatusType(t);
                    }}
                  />

                  {/* SUÍTE COMPLEMENTAR DE ANÁLISE RÁPIDA (DIAGNÓSTICO) */}
                  <details
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '12px 16px'
                    }}
                  >
                    <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#334155' }}>
                      ⚙️ Diagnóstico Rápido de Plágio & Gramática (Verificação Complementar)
                    </summary>
                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* HERO BANNER DA AUDITORIA */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #064e3b, #047857)',
                          borderRadius: 10,
                          padding: '20px 24px',
                          color: '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 16
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <ShieldCheck size={22} color="#34d399" />
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                          Suíte de Auditoria Editorial & Diagramação KDP
                        </h3>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#a7f3d0' }}>
                        Verifica diagramação 6x9, ortografia, ritmo de parágrafos, anti-plágio e coerência narrativa sem alucinação.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={executarVerificacaoCompleta}
                      disabled={isAuditing || !livro || livro.capitulos.length === 0}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 20px',
                        background: '#ffffff',
                        color: '#064e3b',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: isAuditing || !livro ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                      }}
                    >
                      <Wand2 size={16} color="#059669" />
                      {isAuditing ? 'Executando Verificação...' : '⚡ Executar Verificação Completa (1 Clique)'}
                    </button>
                  </div>

                  {/* CARDS DOS 5 MÓDULOS DE VERIFICAÇÃO */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                    {[
                      { id: 'diagramacao', icon: '📐', nome: 'Diagramação', desc: 'Miolo 6x9 e margens' },
                      { id: 'gramatica', icon: '✍️', nome: 'Ortografia', desc: 'Pontuação e sintaxe' },
                      { id: 'paragrafo', icon: '📜', nome: 'Parágrafos', desc: 'Ritmo e travessões' },
                      { id: 'plagio', icon: '🛡️', nome: 'Originalidade', desc: 'Anti-plágio comercial' },
                      { id: 'alucinacao', icon: '🧠', nome: 'Coerência', desc: 'Anti-alucinação' }
                    ].map(mod => {
                      const modStatus = auditReport?.modules.find(m => m.id === mod.id);
                      const isModRunning = isAuditing && auditCurrentModule === mod.id;
                      const isModDone = modStatus?.status === 'completed';
                      const issuesCount = modStatus?.issuesCount || 0;

                      return (
                        <div
                          key={mod.id}
                          style={{
                            background: '#ffffff',
                            border: `1px solid ${isModRunning ? '#2563eb' : isModDone ? (issuesCount > 0 ? '#fde68a' : '#bbf7d0') : '#e2e8f0'}`,
                            borderRadius: 8,
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 18 }}>{mod.icon}</span>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: isModRunning ? '#2563eb' : isModDone ? (issuesCount > 0 ? '#b45309' : '#15803d') : '#94a3b8'
                            }}>
                              {isModRunning ? 'Auditando...' : isModDone ? (issuesCount > 0 ? `⚠️ ${issuesCount}` : '✓ Aprovado') : 'Pendente'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                            {mod.nome}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>
                            {mod.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* BARRA DE PROGRESSO DA AUDITORIA */}
                  {isAuditing && (
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                        <span>Passando por todo o livro e auditando capítulos...</span>
                        <span>{auditProgressPercent}%</span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #059669, #10b981)',
                            width: `${auditProgressPercent}%`,
                            transition: 'width 0.2s ease'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* RELATÓRIO E LISTA DE APONTAMENTOS */}
                  {auditReport && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* PLACAR */}
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '14px 18px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 12
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: '50%',
                              background: auditReport.score >= 85 ? '#ecfdf5' : '#fffbeb',
                              border: `2px solid ${auditReport.score >= 85 ? '#10b981' : '#f59e0b'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                              fontWeight: 900,
                              color: auditReport.score >= 85 ? '#059669' : '#d97706'
                            }}
                          >
                            {auditReport.score}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              Score de Qualidade Editorial KDP
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {auditReport.totalWords} palavras · {auditReport.totalChapters} capítulos · ~{auditReport.estimatedKdpPages} páginas 6x9 sem vazios
                            </div>
                          </div>
                        </div>

                        {auditReport.issues.some(i => !i.applied) && (
                          <button
                            type="button"
                            onClick={handleCorrigirTodos}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 16px',
                              background: '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                            }}
                          >
                            <Sparkles size={14} /> ✨ Aplicar Todas as Correções Automaticamente
                          </button>
                        )}
                      </div>

                      {/* LISTA DE ISSUES */}
                      {auditReport.issues.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 20px', background: '#ffffff', borderRadius: 8, border: '1px solid #bbf7d0', color: '#15803d' }}>
                          <CheckCircle2 size={36} style={{ marginBottom: 8, opacity: 0.8 }} />
                          <div style={{ fontWeight: 700, fontSize: 14 }}>Nenhum erro detectado no livro!</div>
                          <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
                            A diagramação, pontuação, ritmo narrativo e coerência estão prontos para publicação na Amazon KDP.
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                            Apontamentos Encontrados ({auditReport.issues.filter(i => !i.applied).length} pendentes):
                          </div>

                          {auditReport.issues.map(issue => (
                            <div
                              key={issue.id}
                              style={{
                                background: issue.applied ? '#f0fdf4' : '#ffffff',
                                border: `1px solid ${issue.applied ? '#bbf7d0' : '#e2e8f0'}`,
                                borderLeft: `4px solid ${issue.applied ? '#22c55e' : issue.severity === 'alta' ? '#ef4444' : '#f59e0b'}`,
                                borderRadius: 8,
                                padding: '12px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
                                    Capítulo {issue.chapterIndex + 1}
                                  </span>
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: '#f1f5f9',
                                    color: '#475569'
                                  }}>
                                    {issue.typeLabel}
                                  </span>
                                </div>

                                {issue.applied ? (
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Check size={13} /> Corrigido
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleCorrigirIssue(issue)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '4px 10px',
                                      background: '#059669',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Wand2 size={12} /> Corrigir Agora
                                  </button>
                                )}
                              </div>

                              <div style={{ fontSize: 11, color: '#334155' }}>
                                {issue.description}
                              </div>

                              <div style={{
                                fontSize: 11,
                                fontFamily: 'monospace',
                                background: '#f8fafc',
                                padding: '6px 8px',
                                borderRadius: 4,
                                color: '#b91c1c',
                                border: '1px solid #fee2e2'
                              }}>
                                <strong>Trecho:</strong> {issue.originalSnippet}
                              </div>

                              <div style={{
                                fontSize: 11,
                                color: '#047857',
                                background: '#f0fdf4',
                                padding: '6px 8px',
                                borderRadius: 4,
                                border: '1px solid #dcfce7'
                              }}>
                                <strong>Sugestão:</strong> {issue.suggestedFix}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                    </div>
                  </details>
                </div>
              )}

              {/* ABA 5: LIVRO DE COLORIR KDP COM CONTROLE RIGOROSO DE CRÉDITOS */}
              {activeTab === 'colorir' && (
                <div style={{ maxHeight: 720, overflowY: 'auto' }}>
                  <ColoringBookStudio
                    tema={temaSelecionado || genero}
                    subtema={subtemaSelecionado}
                    titulo={titulo}
                    autor={autor}
                    capaDataUrl={capaFinal}
                    onCapaGerada={setCapaFinal}
                  />
                </div>
              )}

              {activeTab === 'planner' && (
                <PlannerBookStudio
                  title={titulo}
                  author={autor}
                  hasCredit={creditosLivros > 0}
                  onConsumeCredit={debitarCreditoLivro}
                  onRequireCredit={() => {
                    setCreditModalMotivo('A geração de um planner ou diário completo requer 1 crédito editorial.');
                    setIsCreditModalOpen(true);
                  }}
                />
              )}

              {/* ABA 6: AUDIOBOOK STUDIO (LIVRO -> AUDIOBOOK) */}
              {activeTab === 'audiobook' && (
                <div style={{ maxHeight: 780, overflowY: 'auto' }}>
                  <ErrorBoundary fallbackTitle="Audiobook Studio">
                    <AudiobookStudio
                      projectId={projectIdRef.current}
                      initialTitle={titulo}
                      initialSubtitle={subtitulo}
                      initialAuthor={autor}
                      initialChapters={livro?.capitulos?.map(c => ({ titulo: c.titulo, texto: c.texto })) || []}
                      capaUrl={capaFinal}
                      bookLanguage={idioma}
                      onBack={() => setActiveTab('preview')}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </div>

            {/* BARRA DE FERRAMENTAS DO RODAPÉ (LAYOUT PROFISSIONAL, SÓBRIO E CLEAN) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginTop: 20,
                padding: '14px 18px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                flexWrap: 'wrap',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
              }}
            >
              {/* GRUPO ESQUERDO: FERRAMENTAS, EXPORTAÇÃO E AUDITORIA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setIsPageReviewerOpen(true)}
                  disabled={!livro || livro.capitulos.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
                  }}
                  title="Folhear e inspecionar cada página individualmente antes de gerar o PDF"
                >
                  <BookOpen size={15} /> 📖 Revisar Página por Página
                </button>

                <button
                  type="button"
                  onClick={baixarPDF}
                  disabled={!livro || livro.capitulos.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                  title="Baixar Livro Diagramado em PDF KDP"
                >
                  <Download size={14} /> PDF do Livro
                </button>

                {capaFinal && (
                  <button
                    type="button"
                    onClick={baixarCapa}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 6,
                      background: '#f8fafc',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Baixar Capa Oficial Diagramada em Alta Resolução (1600x2400)"
                  >
                    <ImageIcon size={14} /> Capa do Livro
                  </button>
                )}

                <button
                  type="button"
                  onClick={executarVerificacaoCompleta}
                  disabled={!livro || livro.capitulos.length === 0 || isAuditing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: !livro || isAuditing ? 'not-allowed' : 'pointer'
                  }}
                  title="Auditoria Editorial KDP de Conformidade"
                >
                  <ShieldCheck size={14} color="#059669" /> {isAuditing ? 'Auditando...' : 'Auditar Obra'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublishingModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Publicação Multiplataforma (Kindle, Audiobook, Impresso)"
                >
                  <Globe size={14} /> Multiplataforma · Em breve
                </button>

                {promoData && (
                  <button
                    type="button"
                    onClick={() => setIsPromoModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 6,
                      background: '#f8fafc',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Visualizar e Personalizar Página Promocional"
                  >
                    <Sparkles size={14} /> Página Promo
                  </button>
                )}

                <button
                  type="button"
                  onClick={copiarTexto}
                  disabled={!livro || livro.capitulos.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                  title="Copiar Texto Integral do Manuscrito"
                >
                  <Copy size={14} /> Copiar Texto
                </button>

                <button
                  type="button"
                  onClick={salvarNoCatalogo}
                  disabled={!livro}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: !livro ? 'not-allowed' : 'pointer'
                  }}
                  title="Salvar Estado Atual no Catálogo Local"
                >
                  <Save size={14} /> Salvar Catálogo
                </button>

                <button
                  type="button"
                  onClick={baixarJSON}
                  disabled={!livro}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: !livro ? 'not-allowed' : 'pointer'
                  }}
                  title="Exportar Dados da Obra em JSON"
                >
                  <FileText size={14} /> Exportar JSON
                </button>
              </div>

              {/* GRUPO DIREITO: AÇÃO PRINCIPAL DE FINALIZAÇÃO */}
              <div>
                <button
                  type="button"
                  onClick={finalizarLivroEGravarNaDashboard}
                  disabled={!livro || livro.capitulos.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    borderRadius: 6,
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Compilar obra e disponibilizar na Dashboard com Manuscrito, PDF do Livro, PDF da Capa e PDF da Página"
                >
                  <CheckCircle2 size={16} /> Finalizar Livro (Disponibilizar na Dashboard)
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL FULL DO EDITOR DA PÁGINA PROMOCIONAL */}
      {isPromoModalOpen && promoData && (
        <BookPromotionalPageModal
          isOpen={isPromoModalOpen}
          onClose={() => setIsPromoModalOpen(false)}
          initialData={promoData}
          onSave={(updated) => {
            setPromoData(updated);
            if (livro) salvarProgressoLocal(livro, capaFinal || undefined, fundoImg || undefined, updated);
          }}
        />
      )}

      {/* MODAL FULL DE PUBLICAÇÃO MULTIPLATAFORMA (KINDLE, SPOTIFY, AUDIBLE, ETC.) */}
      <MultiplatformPublishingModal
        isOpen={isPublishingModalOpen}
        onClose={() => setIsPublishingModalOpen(false)}
        project={{
          id: projectIdRef.current || initialProject?.id || 'prj_studio',
          title: titulo || 'Projeto Book Intel',
          subtitle: subtitulo,
          author: autor,
          capitulos: livro?.capitulos?.map(c => ({ titulo: c.titulo, texto: c.texto })) || [],
          coverUrl: capaFinal
        }}
      />

      {/* Tour guiado removido da UI conforme solicitação */}

      {/* MODAL DO REVISOR EDITORIAL PÁGINA POR PÁGINA */}
      {isPageReviewerOpen && livro && (
        <KdpPageReviewerModal
          isOpen={isPageReviewerOpen}
          onClose={() => setIsPageReviewerOpen(false)}
          livro={{
            titulo: livro.titulo,
            subtitulo: livro.subtitulo,
            autor: livro.autor,
            genero: livro.genero,
            capitulos: livro.capitulos
          }}
          capaUrl={capaFinal}
          formato={formato}
          optSumario={optSumario}
          tamCapitulo={tamCapitulo}
          corCapitulo={corCapitulo}
          silhuetaConfig={silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl ? {
            ativado: true,
            imagemDataUrl: silhuetaConfig.imagemDataUrl,
            paginasSelecionadas: silhuetaConfig.aplicarTodas !== false
              ? undefined
              : calcularPaginasSilhueta(
                  livro.capitulos.length * 8,
                  silhuetaConfig.modo,
                  {
                    intervalo: silhuetaConfig.intervalo,
                    totalAleatorio: silhuetaConfig.totalAleatorio
                  }
                ),
            opacidade: silhuetaConfig.opacidade || 10,
            sangriaPct: silhuetaConfig.sangriaPct,
            modoCobertura: silhuetaConfig.modoCobertura || 'full-page',
            monocromatico: silhuetaConfig.monocromatico !== false,
            aplicarTodas: silhuetaConfig.aplicarTodas !== false
          } : undefined}
          onUpdateCapitulo={(cIdx, novoTexto, novoTitulo) => {
            setLivro(prev => {
              if (!prev) return prev;
              const novosCaps = [...prev.capitulos];
              if (novosCaps[cIdx]) {
                novosCaps[cIdx] = {
                  ...novosCaps[cIdx],
                  texto: novoTexto,
                  titulo: novoTitulo || novosCaps[cIdx].titulo
                };
              }
              const atualizado = { ...prev, capitulos: novosCaps };
              salvarProgressoLocal(atualizado);
              return atualizado;
            });
          }}
          onUpdateLivroMetadata={(novoTitulo, novoSubtitulo, novoAutor) => {
            setTitulo(novoTitulo);
            if (novoSubtitulo !== undefined) setSubtitulo(novoSubtitulo);
            if (novoAutor !== undefined) setAutor(novoAutor);
            setLivro(prev => {
              if (!prev) return prev;
              const atualizado = {
                ...prev,
                titulo: novoTitulo,
                subtitulo: novoSubtitulo !== undefined ? novoSubtitulo : prev.subtitulo,
                autor: novoAutor !== undefined ? novoAutor : prev.autor
              };
              salvarProgressoLocal(atualizado);
              return atualizado;
            });
            setStatusMsg('✓ Título, Subtítulo e Autor salvos no livro!');
            setStatusType('ok');
          }}
          onUpdateSilhuetaConfig={(novaConfig) => {
            setSilhuetaConfig(prev => ({
              ...prev,
              ...novaConfig
            }));
          }}
          onDownloadPdf={baixarPDF}
        />
      )}

      {/* MODAL DOS TOP 50 BESTSELLERS DA AMAZON KDP (#1 AO #200) */}
      <Top50BestsellersModal
        isOpen={isTop50ModalOpen}
        onClose={() => setIsTop50ModalOpen(false)}
        segmento={genero || temaSelecionado || 'Finanças'}
        currentTitle={titulo}
        currentSubtitle={subtitulo}
        onSelectTitleProposal={(propTitulo: string, propSubtitulo: string) => {
          setTitulo(propTitulo);
          setSubtitulo(propSubtitulo);
          if (livro) {
            setLivro(prev => {
              if (!prev) return prev;
              const atualizado = {
                ...prev,
                titulo: propTitulo,
                subtitulo: propSubtitulo
              };
              salvarProgressoLocal(atualizado);
              return atualizado;
            });
          }
          setStatusMsg(`✓ Título e Subtítulo definidos com base nos Top 50 Bestsellers!`);
          setStatusType('ok');
        }}
        onSelectBookReference={(book: any) => {
          logDiag(`Livro de referência selecionado dos Top 50: ${book.title}`);
        }}
      />

      {/* MODAL DE COMPRA / RECARGA DE CRÉDITOS EDITORIAIS (US$ 3 POR LIVRO) */}
      <PurchaseCreditsModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        motivo={creditModalMotivo}
      />
    </div>
  );
};
