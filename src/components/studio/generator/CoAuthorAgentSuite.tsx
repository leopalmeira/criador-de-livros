import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Bot, Send, Play, Pause, RefreshCw, CheckCircle2,
  BookOpen, ChevronRight, Copy, Check, MessageSquare,
  AlertCircle, ArrowRight, Zap, Award, Edit3, Trash2, Eye,
  ShieldCheck, FileText, Compass, RotateCw, Sliders,
  Wrench, HeartHandshake, Layers, BookCheck, ClipboardCheck,
  ChevronDown, ChevronUp, Save, X, Lightbulb, UserCheck,
  ArrowLeft, Download, Maximize2, Minimize2, CheckSquare, Search,
  FileCheck, ExternalLink, Bookmark, HelpCircle, Volume2, VolumeX,
  Lock, Mic, CheckCircle, TrendingUp, DollarSign, Filter, Star, SlidersHorizontal
} from 'lucide-react';
import {
  KdpMarketResearchService,
  type MarketBenchmarkBook,
  type MarketAnalysisResult,
  calculateEstimatesFromBsr
} from '../../../services/kdp-market-research';
import { chamarGeminiTexto } from '../../../services/kdp-ai-engine';
import { ManuscriptIntegrityEngine } from '../../../services/manuscript-integrity-engine';
import {
  orchestrateEditorialPlan,
  buildFallbackEditorialPlan,
  type KdpEditorialPlan
} from '../../../services/kdp-agents-service';
import { buildKdpPdf } from '../../../services/kdp-pdf-builder';
import { PublishingMetadataService } from '../../../services/publishing-metadata-service';
import { KdpBookVerifier } from '../../../services/kdp-book-verifier';
import { cleanChapterTitle } from '../../../services/kdp-editorial-review';
import { KdpHumanizerEngine } from '../../../services/kdp-humanizer-engine';
import { BookEnginLoader } from '../../common/BookEnginLoader';
import { BookEnginAnimatedBook } from '../../common/BookEnginAnimatedBook';
import {
  fetchAllReadyBooks,
  saveUpdatedBookToDb,
  reviewFullBookWithCoAuthor,
  enrichChaptersWithDeepContent,
  type ReadyBookRecord,
  type ChapterEnrichmentProposal,
  type GlobalReviewResult
} from '../../../services/ready-books-service';
import { coAuthorVoiceService } from '../../../services/coauthor-voice-service';
import { CoAuthorVoiceToggle } from './CoAuthorVoiceToggle';
import { CoAuthorVoiceModalBar } from './CoAuthorVoiceModalBar';
import { AmazonLiveService } from '../../../services/amazon-live-service';
import { BookArchitecturePanel, type BookArchitectureData } from './BookArchitecturePanel';

export type CoAuthorBookType = 'tecnico' | 'autoajuda' | 'pratico' | 'ficcao';

export interface CoAuthorContextData {
  premissaVisao: string;
  elementosChave: string;
  formulaBestseller: string;
  tipoLivro?: CoAuthorBookType;
}

export interface CoAuthorMessage {
  id: string;
  sender: 'agent' | 'user' | 'system';
  timestamp: string;
  text: string;
  stepPrompt?: number;
  chapterPreview?: {
    numero: number;
    titulo: string;
    resumo: string;
    palavras: number;
    trechoFinal: string;
    textoCompleto: string;
  };
  alignmentCard?: {
    titulo: string;
    subtitulo: string;
    tipo: CoAuthorBookType;
    premissa: string;
    elementos: string;
    diretriz: string;
    totalCaps: number;
  };
  fullBookReviewCard?: {
    summary: string;
    strengths?: string[];
    editorialGaps?: string[];
    chaptersEnrichment: ChapterEnrichmentProposal[];
    applied?: boolean;
  };
  editorialReport?: {
    tipo: 'enredo' | 'coesao' | 'diagramacao' | 'preparacao';
    titulo: string;
    score: number;
    destaques: string[];
    recomendacoes: string[];
    sinopseHtml?: string;
    palavrasChave?: string[];
    categoriasBisac?: string[];
  };
  suggestedActions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
}

export interface CoAuthorBookState {
  titulo: string;
  subtitulo: string;
  autor: string;
  genero: string;
  idioma: string;
  tipoLivro?: CoAuthorBookType;
  capitulos: Array<{
    titulo: string;
    texto: string;
    imagemDataUrl?: string | null;
  }>;
  meta: {
    palavrasPorCap: number;
    paginasAlvo: number;
  };
  sobrecapaTexto?: string;
  sobrecapaPaleta?: string;
  fraseDestaqueSobrecapa?: string;
}

// Exemplos pré-calibrados de alta conversão Amazon KDP para teste e inspiração
const EXEMPLOS_PRONTOS: Array<{
  nome: string;
  tipo: CoAuthorBookType;
  badge: string;
  promptInicial: string;
  premissa: string;
  elementos: string;
  formula: string;
}> = [
  {
    nome: 'Livro Técnico: Engenharia de Prompts & IA',
    tipo: 'tecnico',
    badge: '⚙️ Técnico / Resolução de Problemas',
    promptInicial: 'Quero escrever um livro técnico que ensina profissionais a usarem IA e engenharia de prompts para resolver problemas práticos de automação e dados, sem ficção ou floreios.',
    premissa: 'Um livro técnico e didático que ensina profissionais a resolverem problemas reais de automação, dados e fluxos de trabalho usando IA, sem jargões desnecessários.',
    elementos: 'Arquitetura de comandos estruturados, técnicas de Few-Shot e Chain-of-Thought, como evitar alucinações de dados, automação de tarefas repetitivas e resolução de erros comuns.',
    formula: 'Didática 100% direta e objetiva, sem ficção ou floreios. Cada capítulo apresenta um conceito, o passo a passo de aplicação, exemplos práticos e soluções para problemas frequentes.'
  },
  {
    nome: 'Autoajuda: Foco Profundo contra Distração',
    tipo: 'autoajuda',
    badge: '📘 Autoajuda & Desenvolvimento',
    promptInicial: 'Quero escrever um livro de desenvolvimento pessoal para ajudar pessoas a vencerem a distração digital, recuperando 4 horas de foco diário sem ansiedade.',
    premissa: 'Um livro de desenvolvimento pessoal focado em ajudar profissionais a vencerem a sobrecarga mental e reconquistarem 4 horas diárias de foco profundo com serenidade.',
    elementos: 'O método dos blocos de 45 minutos; rotinas matinais sem notificações; estudos de caso reais de superação; desintoxicação de dopamina rápida e checklists acionáveis.',
    formula: 'Linguagem popular, inspiradora e encorajadora. Cada capítulo traz um problema concreto do dia a dia e uma ferramenta prática aplicável nas próximas 24 horas.'
  },
  {
    nome: 'Guia Prático: Sair das Dívidas em 90 Dias',
    tipo: 'pratico',
    badge: '🛠️ Guia Prático Passo a Passo',
    promptInicial: 'Quero criar um guia prático passo a passo para pessoas que precisam sair das dívidas, renegociar com bancos e criar uma reserva de segurança em 90 dias.',
    premissa: 'Um guia prático e pragmático para diagnosticar vazamentos financeiros, negociar dívidas com credores e montar uma reserva de segurança sem fórmulas mágicas.',
    elementos: 'Planilha de diagnóstico em 3 passos; roteiro de negociação com bancos; cortes de gastos sem sofrimento; reestruturação de renda extra e plano blindado de 90 dias.',
    formula: 'Passo a passo numerado, orientações diretas ao ponto, advertências de armadilhas comuns e lista de verificação de ação imediata ao final de cada capítulo.'
  },
  {
    nome: 'Ficção & Mistério: O Diagnóstico Oculto',
    tipo: 'ficcao',
    badge: '📖 Ficção & Narrativa',
    promptInicial: 'Quero escrever um thriller médico sobre um cirurgião que descobre mortes suspeitas causadas por uma conspiração hospitalar, no estilo Dan Brown.',
    premissa: 'Um cirurgião descobre que o novo sistema de IA do hospital prevê a morte de pacientes antes dos sintomas, e sua própria filha é a próxima na lista.',
    elementos: 'A diretora ambiciosa ocultando falhas; invasão tensa ao data center subterrâneo; uma aliada na corregedoria; reviravoltas intensas e clímax conclusivo.',
    formula: 'Capítulos dinâmicos com cliffhangers intensos no final de cada um, ritmo acelerado estilo Dan Brown, vocabulário popular e desfecho 100% definitivo.'
  }
];

// Estágios da Esteira Editorial Sequencial (Só avança após conclusão do passo anterior)
export type EditorialStage = 1 | 2 | 3 | 4 | 5 | 6;
// 1 = Tema & Nicho Amazon KDP
// 2 = Título Comercial Magnético
// 3 = Subtítulo de Conversão com Promessa
// 4 = Sumário Estrutural dos Capítulos
// 5 = Redação dos Capítulos (Aprovação capítulo a capítulo)
// 6 = Capa Oficial KDP & Obra Concluída

export interface TemaAmazonOption {
  id: string;
  titulo: string;
  nicho: string;
  badge: string;
  descricao: string;
  perfil: CoAuthorBookType;
}

// Opções de Temas & Nichos de Alta Conversão na Amazon KDP
export const TEMAS_AMAZON_KDP: TemaAmazonOption[] = [
  {
    id: 'produtividade',
    titulo: 'Foco Profundo & Rotina Inabalável',
    nicho: 'Autoajuda & Desenvolvimento Pessoal',
    badge: '🔥 Bestseller Amazon #1',
    descricao: 'Como vencer a distração digital, recuperar 4 horas diárias de foco extremo e eliminar a procrastinação crônica.',
    perfil: 'autoajuda'
  },
  {
    id: 'ia_prompts',
    titulo: 'Engenharia de Prompts & IA Prática',
    nicho: 'Técnico & Automação Profissional',
    badge: '⚙️ Alta Demanda KDP',
    descricao: 'Guia definitivo e prático para automatizar tarefas de trabalho, análise de dados e rotinas com IA sem jargões.',
    perfil: 'tecnico'
  },
  {
    id: 'financas_90d',
    titulo: 'Liberdade Financeira em 90 Dias',
    nicho: 'Guia Prático Passo a Passo (Finanças)',
    badge: '💰 Alta Conversão KDP',
    descricao: 'Método comprovado para estancar dívidas, renegociar com bancos e montar reserva de emergência sem fórmulas mágicas.',
    perfil: 'pratico'
  },
  {
    id: 'inteligencia_emocional',
    titulo: 'Inteligência Emocional & Estoicismo',
    nicho: 'Desenvolvimento Pessoal & Filosofia Prática',
    badge: '🛡️ Tendência Global',
    descricao: 'Técnicas diárias para manter serenidade, controle mental inabalável sob pressão e resiliência psicológica.',
    perfil: 'autoajuda'
  },
  {
    id: 'saude_biohacking',
    titulo: 'Biohacking & Energia Vital Constante',
    nicho: 'Saúde, Hábitos & Longevidade',
    badge: '⚡ Alta Retenção Kindle',
    descricao: 'Protocolos de sono reparador, nutrição anti-inflamatória e clareza mental para alta performance biológica.',
    perfil: 'pratico'
  },
  {
    id: 'thriller_ficcao',
    titulo: 'O Diagnóstico Oculto: Thriller Médico',
    nicho: 'Ficção, Suspense & Mistério',
    badge: '📖 Ritmo Viciante Dan Brown',
    descricao: 'Um cirurgião descobre mortes suspeitas causadas pelo sistema do hospital antes que sua filha seja a próxima vítima.',
    perfil: 'ficcao'
  }
];

// Utilitário para renderizar texto formatado sem deixar asteriscos crus de markdown
function renderRichText(text: string): React.ReactNode {
  const clean = text
    .replace(/<<<ALINHAMENTO_CONCLUIDO>>>[\s\S]*?<<<FIM_ALINHAMENTO>>>/g, '')
    .trim();

  const lines = clean.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lines.map((line, lIdx) => {
        if (!line.trim()) {
          return <div key={lIdx} style={{ height: 6 }} />;
        }

        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || /^\d+\.\s/.test(line.trim());
        const cleanLine = isBullet ? line.trim().replace(/^[•-]\s*|^\d+\.\s*/, '') : line;

        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

        const renderedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} style={{ fontWeight: 800, color: 'inherit' }}>
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={lIdx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginLeft: 4 }}>
              <span style={{ color: '#0284c7', fontWeight: 900, fontSize: 16, lineHeight: '22px' }}>•</span>
              <span style={{ flex: 1, lineHeight: 1.65 }}>{renderedLine}</span>
            </div>
          );
        }

        return <div key={lIdx} style={{ lineHeight: 1.65 }}>{renderedLine}</div>;
      })}
    </div>
  );
}

// ============================================================================
// 1. COMPONENTE: CO-AUTHOR CARD (Para a barra lateral esquerda)
// ============================================================================

interface CoAuthorCardProps {
  contextData: CoAuthorContextData;
  onChangeContext: (data: CoAuthorContextData) => void;
  onStartCoAuthor: () => void;
  onApplyToStandardForm?: () => void;
  tituloAtual: string;
  subtituloAtual: string;
  generoAtual: string;
  idiomaAtual: string;
  onUpdateTitleSubtitle?: (titulo: string, subtitulo: string) => void;
  totalCaps: number;
}

export const CoAuthorCard: React.FC<CoAuthorCardProps> = ({
  contextData,
  onChangeContext,
  onStartCoAuthor,
  tituloAtual,
  generoAtual,
  idiomaAtual,
  totalCaps
}) => {
  const temBriefing = Boolean(
    contextData.premissaVisao.trim() &&
    contextData.elementosChave.trim() &&
    contextData.formulaBestseller.trim()
  );

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1.5px solid #0284c7',
        borderRadius: 12,
        padding: 18,
        marginBottom: 16,
        boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
            }}
          >
            <Bot size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                Agente CoAuthor KDP
              </h3>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#0284c7',
                  background: '#e0f2fe',
                  padding: '2px 7px',
                  borderRadius: 4,
                  textTransform: 'uppercase'
                }}
              >
                Ativo
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Coautoria Completa em Tela Imersiva
            </p>
          </div>
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: temBriefing ? '#059669' : '#0284c7',
            background: temBriefing ? '#ecfdf5' : '#f0f9ff',
            padding: '3px 10px',
            borderRadius: 12,
            border: `1px solid ${temBriefing ? '#a7f3d0' : '#bae6fd'}`
          }}
        >
          {temBriefing ? '✓ Estruturado' : '🟢 Pronto'}
        </span>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>
        O CoAuthor guia todo o processo do livro com você: tema, título, sumário, redação dos capítulos, checagem de enredo, coesão textual e preparação para o KDP.
      </p>

      {/* BOTÃO PRINCIPAL DE ENTRADA NO ESTÚDIO EM TELA CHEIA */}
      <button
        type="button"
        onClick={onStartCoAuthor}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          padding: '12px 18px',
          background: 'linear-gradient(135deg, #0284c7, #0369a1)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 3px 10px rgba(2, 132, 199, 0.28)',
          transition: 'all 0.15s ease'
        }}
      >
        <Maximize2 size={15} /> Abrir Estúdio CoAuthor em Tela Cheia
      </button>
    </div>
  );
};

// ============================================================================
// 2. COMPONENTE: CO-AUTHOR STUDIO WORKSPACE (TELA CHEIA IMERSIVA & PROCESSO COMPLETO)
// ============================================================================

export interface CoAuthorWorkspaceProps {
  contextData: CoAuthorContextData;
  bookState: CoAuthorBookState | null;
  onUpdateBookState: (newBook: CoAuthorBookState) => void;
  onSaveProgress: (livro: any) => void;
  onNavigateToPreview?: () => void;
  onNavigateToCover?: () => void;
  totalCapsDesejado: number;
  paginasAlvo: number;
  onClose?: () => void;
  capaDataUrl?: string | null;
  formato?: string;
  autorAtual?: string;
  generoAtual?: string;
  idiomaAtual?: string;
  onStartNewBook?: (perfil?: CoAuthorBookType) => any;
}

export const CoAuthorWorkspace: React.FC<CoAuthorWorkspaceProps> = ({
  contextData,
  bookState,
  onUpdateBookState,
  onSaveProgress,
  onNavigateToPreview,
  onNavigateToCover,
  totalCapsDesejado,
  paginasAlvo,
  onClose,
  capaDataUrl,
  formato = '6x9',
  autorAtual = 'Autor Book Engin',
  generoAtual = 'Geral',
  idiomaAtual = 'Português',
  onStartNewBook
}) => {
  // Aba ativa interna do estúdio: 'chat' | 'arquitetura' | 'diagramado' | 'revisao' (A CONVERSA É O EIXO CENTRAL)
  const [internalTab, setInternalTab] = useState<'chat' | 'arquitetura' | 'diagramado' | 'revisao'>('chat');

  // Estado da Esteira Editorial Sequencial Rígida (Passos 1 a 6: só passa para o próximo quando o atual for concluído)
  const [editorialStage, setEditorialStage] = useState<EditorialStage>(() => {
    const total = totalCapsDesejado || 8;
    const caps = bookState?.capitulos?.length || 0;
    if (caps >= total && caps > 0) return 6;
    if (caps > 0) return 5;
    if (bookState?.subtitulo && bookState.subtitulo.trim()) return 4;
    if (bookState?.titulo && bookState.titulo.trim() && bookState.titulo !== 'Nova Obra KDP') return 3;
    if (contextData?.premissaVisao?.trim()) return 2;
    return 1;
  });

  // Sugestões dinâmicas de Títulos e Subtítulos derivadas da Amazon KDP
  const [suggestedTitlesAmazon, setSuggestedTitlesAmazon] = useState<Array<{ title: string; rationale: string }>>([]);
  const [suggestedSubtitlesAmazon, setSuggestedSubtitlesAmazon] = useState<Array<{ subtitle: string; rationale: string }>>([]);
  const [isLoadingAmazonSuggestions, setIsLoadingAmazonSuggestions] = useState<boolean>(false);

  // Estados da Pesquisa de Mercado Amazon KDP (Passo 1: Tema, BSR, Reviews e Capas)
  const [marketThemeInput, setMarketThemeInput] = useState<string>(() => contextData.premissaVisao || 'Foco Profundo & Rotina Inabalável');
  const [marketMinBsr, setMarketMinBsr] = useState<number>(1);
  const [marketMaxBsr, setMarketMaxBsr] = useState<number>(80000);
  const [marketMinReviews, setMarketMinReviews] = useState<number>(20);
  const [marketPreset, setMarketPreset] = useState<'80k' | '20k-30k' | 'elite' | 'custom'>('80k');
  const [marketData, setMarketData] = useState<MarketAnalysisResult | null>(null);
  const [isSearchingMarket, setIsSearchingMarket] = useState<boolean>(false);

  const executeMarketAnalysis = async (
    themeParam?: string,
    minBsrParam?: number,
    maxBsrParam?: number,
    minReviewsParam?: number
  ) => {
    const t = themeParam !== undefined ? themeParam : marketThemeInput;
    const minB = minBsrParam !== undefined ? minBsrParam : marketMinBsr;
    const maxB = maxBsrParam !== undefined ? maxBsrParam : marketMaxBsr;
    const minR = minReviewsParam !== undefined ? minReviewsParam : marketMinReviews;

    setIsSearchingMarket(true);
    setAiLoadingStatus('Analisando livros na Amazon, BSR e faturamento estimado em USD...');

    try {
      const result = await KdpMarketResearchService.analyzeNiche({
        theme: t,
        minBsr: minB,
        maxBsr: maxB,
        minReviews: minR
      });
      setMarketData(result);
      if (result.suggestedTitles && result.suggestedTitles.length > 0) {
        setSuggestedTitlesAmazon(result.suggestedTitles);
      }
      if (result.suggestedSubtitles && result.suggestedSubtitles.length > 0) {
        setSuggestedSubtitlesAmazon(result.suggestedSubtitles);
      }
    } catch (err) {
      console.error('Erro na análise de mercado KDP:', err);
    } finally {
      setIsSearchingMarket(false);
      setAiLoadingStatus('');
    }
  };

  useEffect(() => {
    if (editorialStage === 1 && !marketData && !isSearchingMarket) {
      executeMarketAnalysis('Foco Profundo & Rotina Inabalável', 1, 80000, 20);
    }
  }, [editorialStage]);

  // Quantidade de Capítulos customizável antes e durante a produção da obra
  const [customTotalCaps, setCustomTotalCaps] = useState<number>(() => {
    return bookState?.capitulos?.length ? Math.max(bookState.capitulos.length, totalCapsDesejado || 8) : (totalCapsDesejado || 8);
  });

  // Bloqueio rigoroso de scroll do documento enquanto o estúdio em tela cheia estiver ativo
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Tipo de Livro Selecionado
  const [tipoLivro, setTipoLivro] = useState<CoAuthorBookType>(() => {
    return contextData.tipoLivro || bookState?.tipoLivro || 'tecnico';
  });

  const [messages, setMessages] = useState<CoAuthorMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiLoadingStatus, setAiLoadingStatus] = useState<string>('');
  const [autoPilotActive, setAutoPilotActive] = useState<boolean>(false);
  const [isCopiedChapter, setIsCopiedChapter] = useState<number | null>(null);
  const [editorialPlan, setEditorialPlan] = useState<KdpEditorialPlan | null>(null);

  // Estados para edição manual no painel de revisão editorial
  const [editingChapterIdx, setEditingChapterIdx] = useState<number | null>(null);
  const [editedChapterText, setEditedChapterText] = useState<string>('');
  const [selectedReaderChapter, setSelectedReaderChapter] = useState<number>(0);

  // Estados para exportação de PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Controle do Stepper Interativo do Processo Editorial (1: Tema, 2: Título, 3: Sumário, null: Chat)
  const [activeFlowStep, setActiveFlowStep] = useState<1 | 2 | 3 | null>(null);

  // Alerta de Divergência de Gênero (ex: escolheu Autoajuda mas tem capítulos de Ficção)
  const [genreMismatchModal, setGenreMismatchModal] = useState<{
    oldGenre: string;
    newGenre: CoAuthorBookType;
    count: number;
  } | null>(null);

  // Modal de confirmação para iniciar Novo Livro em Branco
  const [showNewBookConfirm, setShowNewBookConfirm] = useState<boolean>(false);

  // Estados do Motor de Humanização
  const [isHumanizingChapter, setIsHumanizingChapter] = useState<number | null>(null);
  const [humanizeSuccessToast, setHumanizeSuccessToast] = useState<string | null>(null);

  // Sugestões de Título geradas por IA no Passo 2
  const [isSuggestingTitles, setIsSuggestingTitles] = useState<boolean>(false);
  const [titleSuggestions, setTitleSuggestions] = useState<Array<{ title: string; subtitle: string; rationale: string }>>([]);

  // Estados dos campos de edição direta do fluxo
  const [flowTema, setFlowTema] = useState<string>(() => contextData.premissaVisao || '');
  const [flowTitulo, setFlowTitulo] = useState<string>(() => bookState?.titulo || '');
  const [flowSubtitulo, setFlowSubtitulo] = useState<string>(() => bookState?.subtitulo || '');
  const [flowPublico, setFlowPublico] = useState<string>('Público Geral KDP');

  // Integração com a Base de Livros Prontos/Escritos
  const [readyBooksList, setReadyBooksList] = useState<ReadyBookRecord[]>([]);
  const [showReadyBooksModal, setShowReadyBooksModal] = useState<boolean>(false);
  const [bookSearchFilter, setBookSearchFilter] = useState<string>('');

  // Controle de Áudio e Voz Feminina do CoAuthor
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = coAuthorVoiceService.subscribe((state) => {
      setCurrentlySpeakingId(state.isSpeaking ? state.currentMessageId : null);
    });

    return () => {
      unsubscribe();
      coAuthorVoiceService.stop();
    };
  }, []);

  const carregarLivrosProntos = async () => {
    try {
      const books = await fetchAllReadyBooks();
      setReadyBooksList(books);
    } catch (err) {
      console.warn('Erro ao carregar livros prontos na base:', err);
    }
  };

  useEffect(() => {
    carregarLivrosProntos();
  }, []);

  const handleSelectReadyBookInWorkspace = (book: ReadyBookRecord) => {
    setShowReadyBooksModal(false);
    setTipoLivro(book.tipoLivro);
    setFlowTema(book.subtitle || book.title);
    setFlowTitulo(book.title);
    setFlowSubtitulo(book.subtitle);

    const updatedState: CoAuthorBookState = {
      titulo: book.title,
      subtitulo: book.subtitle,
      autor: book.author,
      genero: book.genre,
      idioma: 'Português',
      tipoLivro: book.tipoLivro,
      capitulos: book.capitulos,
      meta: book.meta
    };

    onUpdateBookState(updatedState);
    onSaveProgress(updatedState);

    const msgCarregado: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Carreguei o livro **"${book.title}"** da nossa base aqui no estúdio! 📚\n\nA obra possui **${book.capitulos.length} capítulos** e cerca de **${book.totalWords.toLocaleString()} palavras escritas** no perfil **${book.tipoLivro.toUpperCase()}**.\n\nO que você quer trabalhar nela agora?\n- Fazer uma **Revisão Editorial Global** de ponta a ponta na obra inteira.\n- **Enriquecer com mais detalhes**, exemplos práticos ou profundidade dramática.\n- Focar na redação ou lapidação de um capítulo específico.`,
      suggestedActions: [
        { label: '📖 Revisar Obra Inteira de Uma Vez', action: 'acao_revisar_tudo_agora', primary: true },
        { label: book.tipoLivro === 'ficcao' ? '✨ Enriquecer História & Diálogos' : '⚙️ Enriquecer Conteúdo Técnico & Exemplos', action: 'acao_enriquecer_profundo' },
        { label: '📥 Baixar PDF KDP Diagramado', action: 'acao_baixar_pdf' }
      ]
    };

    setMessages(prev => [...prev, msgCarregado]);
    coAuthorVoiceService.speak(msgCarregado.text, msgCarregado.id);
  };

  // REVISÃO EDITORIAL GLOBAL DE TODA A OBRA DE UMA VEZ
  const handleExecuteFullBookReview = async (customBook?: ReadyBookRecord) => {
    let bookToReview: ReadyBookRecord | null = customBook || null;

    if (!bookToReview) {
      const caps = bookState?.capitulos || [];
      if (caps.length > 0 && bookState?.titulo) {
        const totalWords = caps.reduce((acc, c) => acc + (c.texto.split(/\s+/).filter(Boolean).length || 0), 0);
        bookToReview = {
          id: `book-${Date.now()}`,
          source: 'project',
          title: bookState.titulo,
          subtitle: bookState.subtitulo || '',
          author: bookState.autor || autorAtual,
          genre: bookState.genero || 'Geral',
          tipoLivro: bookState.tipoLivro || tipoLivro,
          chaptersCount: caps.length,
          totalWords,
          coverDataUrl: capaDataUrl || undefined,
          updatedAt: Date.now(),
          capitulos: caps,
          meta: bookState.meta || { palavrasPorCap: 900, paginasAlvo: 80 }
        };
      } else if (readyBooksList.length > 0) {
        setShowReadyBooksModal(true);
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'agent',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Abri sua lista de livros prontos para você escolher qual deseja revisar agora! Basta clicar em **"Revisar Obra"** no livro escolhido.`,
            suggestedActions: [
              { label: '📚 Ver Meus Livros Prontos', action: 'abrir_meus_livros', primary: true }
            ]
          }
        ]);
        return;
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'agent',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Ainda não temos capítulos escritos nesta obra nem livros salvos na base. Vamos começar escrevendo o primeiro capítulo ou alinhando o tema!`,
            suggestedActions: [
              { label: '✍️ Escrever Capítulo 1', action: 'iniciar_cap_1', primary: true }
            ]
          }
        ]);
        return;
      }
    }

    setIsAiProcessing(true);
    setAiLoadingStatus(`CoAuthor fazendo leitura e auditoria global de todos os ${bookToReview.capitulos.length} capítulos de "${bookToReview.title}"...`);

    const userPromptMsg: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Por favor, faça uma revisão editorial global de toda a obra "${bookToReview.title}", analisando todos os capítulos de uma só vez e indicando enriquecimentos de conteúdo e enredo.`
    };

    setMessages(prev => [...prev, userPromptMsg]);

    try {
      const reviewResult = await reviewFullBookWithCoAuthor(bookToReview, (st: string) => setAiLoadingStatus(st));

      const agentReply: CoAuthorMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Fiz uma leitura global de ponta a ponta em todos os **${bookToReview.capitulos.length} capítulos** de **"${bookToReview.title}"**!\n\nA obra tem uma excelente base no perfil **${bookToReview.tipoLivro.toUpperCase()}**. Preparei um plano com diagnósticos e acréscimos editoriais específicos para aprofundar a narrativa e o conteúdo técnico.\n\nVocê pode aplicar o enriquecimento na obra toda com 1 clique abaixo ou aprovar individualmente por capítulo:`,
        fullBookReviewCard: {
          summary: reviewResult.summary,
          strengths: reviewResult.strengths,
          editorialGaps: reviewResult.editorialGaps,
          chaptersEnrichment: reviewResult.chaptersReview,
          applied: false
        },
        suggestedActions: [
          { label: '✨ Aplicar Enriquecimento na Obra Toda', action: 'acao_aplicar_tudo', primary: true },
          { label: '📥 Baixar PDF Diagramado', action: 'acao_baixar_pdf' }
        ]
      };

      setMessages(prev => [...prev, agentReply]);
      coAuthorVoiceService.speak(agentReply.text, agentReply.id);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Tive uma oscilação na conexão ao auditar a obra: ${err?.message || 'Tente novamente em instantes'}.`
        }
      ]);
    } finally {
      setIsAiProcessing(false);
      setAiLoadingStatus('');
    }
  };

  // ENRIQUECIMENTO PROFUNDO DE TODA A OBRA (TÉCNICO OU FICÇÃO)
  const handleExecuteDeepBookEnrichment = async (customBook?: ReadyBookRecord) => {
    let bookToEnrich: ReadyBookRecord | null = customBook || null;

    if (!bookToEnrich) {
      const caps = bookState?.capitulos || [];
      if (caps.length > 0 && bookState?.titulo) {
        const totalWords = caps.reduce((acc, c) => acc + (c.texto.split(/\s+/).filter(Boolean).length || 0), 0);
        bookToEnrich = {
          id: `book-${Date.now()}`,
          source: 'project',
          title: bookState.titulo,
          subtitle: bookState.subtitulo || '',
          author: bookState.autor || autorAtual,
          genre: bookState.genero || 'Geral',
          tipoLivro: bookState.tipoLivro || tipoLivro,
          chaptersCount: caps.length,
          totalWords,
          coverDataUrl: capaDataUrl || undefined,
          updatedAt: Date.now(),
          capitulos: caps,
          meta: bookState.meta || { palavrasPorCap: 900, paginasAlvo: 80 }
        };
      } else {
        await handleExecuteFullBookReview();
        return;
      }
    }

    setIsAiProcessing(true);
    const isFiccao = bookToEnrich.tipoLivro === 'ficcao';
    setAiLoadingStatus(
      isFiccao
        ? 'CoAuthor enriquecendo ambientação sensorial, diálogos e ritmo dramático...'
        : 'CoAuthor enriquecendo com métodos práticos, passos estruturados e checklists técnicos...'
    );

    const userPromptMsg: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: isFiccao
        ? 'Quero enriquecer a obra com mais detalhes na história, ambientação viva e diálogos autênticos.'
        : 'Quero enriquecer a obra com mais profundidade técnica, exemplos práticos de mercado e checklists sem enrolação.'
    };
    setMessages(prev => [...prev, userPromptMsg]);

    try {
      const enrichmentProposals = await enrichChaptersWithDeepContent(bookToEnrich, undefined, (st: string) => setAiLoadingStatus(st));

      const agentReply: CoAuthorMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: isFiccao
          ? `Desenvolvi camadas extras de profundidade dramática, diálogos realistas e texturas sensoriais para os capítulos de **"${bookToEnrich.title}"**!`
          : `Desenvolvi novos frameworks de aplicação prática, passos detalhados e resoluções de problemas reais para os capítulos de **"${bookToEnrich.title}"**!`,
        fullBookReviewCard: {
          summary: isFiccao
            ? 'Enriquecimento narrativo focado em imersão sensorial, subtexto nos diálogos e ganchos dramáticos.'
            : 'Enriquecimento técnico focado em densidade de valor real, passos de execução e eliminação de jargões abstratos.',
          chaptersEnrichment: enrichmentProposals,
          applied: false
        },
        suggestedActions: [
          { label: '✨ Aplicar Enriquecimento na Obra Toda', action: 'acao_aplicar_tudo', primary: true },
          { label: '📖 Ver no Livro Diagramado', action: 'ir_diagramado' }
        ]
      };

      setMessages(prev => [...prev, agentReply]);
      coAuthorVoiceService.speak(agentReply.text, agentReply.id);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Erro ao enriquecer a obra: ${err?.message || 'Tente novamente'}.`
        }
      ]);
    } finally {
      setIsAiProcessing(false);
      setAiLoadingStatus('');
    }
  };

  // APLICAÇÃO EM LOTE DO ENRIQUECIMENTO A TODOS OS CAPÍTULOS
  const handleApplyFullEnrichment = async (msgId: string, enrichments: ChapterEnrichmentProposal[]) => {
    if (!bookState || !bookState.capitulos || bookState.capitulos.length === 0) return;

    const updatedCaps = bookState.capitulos.map((c, i) => {
      const capNum = i + 1;
      const proposal = enrichments.find(p => p.chapterNumber === capNum);
      if (proposal && proposal.additionText) {
        return {
          ...c,
          texto: `${c.texto}\n\n${proposal.additionText}`
        };
      }
      return c;
    });

    const updatedBook: CoAuthorBookState = {
      ...bookState,
      capitulos: updatedCaps
    };

    onUpdateBookState(updatedBook);
    onSaveProgress(updatedBook);

    // Salva no banco de dados local
    const bookRecord: ReadyBookRecord = {
      id: `book-${Date.now()}`,
      source: 'project',
      title: updatedBook.titulo,
      subtitle: updatedBook.subtitulo || '',
      author: updatedBook.autor,
      genre: updatedBook.genero,
      tipoLivro: updatedBook.tipoLivro || tipoLivro,
      chaptersCount: updatedCaps.length,
      totalWords: updatedCaps.reduce((a, c) => a + c.texto.split(/\s+/).filter(Boolean).length, 0),
      updatedAt: Date.now(),
      capitulos: updatedCaps,
      meta: updatedBook.meta
    };

    try {
      await saveUpdatedBookToDb(bookRecord);
    } catch (e) {
      console.warn('Erro ao salvar no banco local:', e);
    }

    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.fullBookReviewCard) {
        return {
          ...m,
          fullBookReviewCard: {
            ...m.fullBookReviewCard,
            applied: true,
            chaptersEnrichment: m.fullBookReviewCard.chaptersEnrichment.map(p => ({ ...p, applied: true }))
          }
        };
      }
      return m;
    }));

    setHumanizeSuccessToast(`✨ Obra "${bookState.titulo}" enriquecida e atualizada no banco com sucesso!`);
    setTimeout(() => setHumanizeSuccessToast(null), 4000);
  };

  // APLICAÇÃO INDIVIDUAL DE ENRIQUECIMENTO POR CAPÍTULO
  const handleApplySingleChapterEnrichment = async (msgId: string, capNum: number, additionText: string) => {
    if (!bookState || !bookState.capitulos || bookState.capitulos.length === 0) return;

    const updatedCaps = bookState.capitulos.map((c, i) => {
      if (i + 1 === capNum) {
        return {
          ...c,
          texto: `${c.texto}\n\n${additionText}`
        };
      }
      return c;
    });

    const updatedBook: CoAuthorBookState = {
      ...bookState,
      capitulos: updatedCaps
    };

    onUpdateBookState(updatedBook);
    onSaveProgress(updatedBook);

    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.fullBookReviewCard) {
        return {
          ...m,
          fullBookReviewCard: {
            ...m.fullBookReviewCard,
            chaptersEnrichment: m.fullBookReviewCard.chaptersEnrichment.map(p => {
              if (p.chapterNumber === capNum) return { ...p, applied: true };
              return p;
            })
          }
        };
      }
      return m;
    }));

    setHumanizeSuccessToast(`Capítulo ${capNum} enriquecido com sucesso!`);
    setTimeout(() => setHumanizeSuccessToast(null), 3000);
  };

  // Armazena o briefing alinhado
  const [respostasBriefing, setRespostasBriefing] = useState<{
    premissa: string;
    elementos: string;
    formula: string;
    tema?: string;
    subtema?: string;
  }>({
    premissa: contextData.premissaVisao || '',
    elementos: contextData.elementosChave || '',
    formula: contextData.formulaBestseller || ''
  });

  // REF APENAS PARA O SCROLL INTERNO DO CHAT (SEM MEXER NA TELA PRINCIPAL)
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const autoPilotStopRef = useRef<boolean>(false);

  // ROLAGEM EXCLUSIVAMENTE INTERNA (NUNCA usa scrollIntoView)
  const scrollToBottomInternal = () => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (internalTab === 'chat' && activeFlowStep === null) {
      scrollToBottomInternal();
    }
  }, [messages.length, isAiProcessing, internalTab, activeFlowStep]);

  // Mensagem de boas-vindas inicial natural
  useEffect(() => {
    if (messages.length === 0) {
      iniciarConversaNatural(tipoLivro);
    }
  }, []);

  const iniciarConversaNatural = (tipo: CoAuthorBookType) => {
    const nomeTipo =
      tipo === 'tecnico'
        ? 'Técnico / Didático'
        : tipo === 'autoajuda'
        ? 'Autoajuda & Hábitos'
        : tipo === 'pratico'
        ? 'Guia Prático Passo a Passo'
        : 'Ficção & Narrativa';

    const hasExistingBook = Boolean(bookState?.titulo && bookState.titulo !== 'Novo Livro' && bookState?.capitulos?.length);

    const msgInicial: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: hasExistingBook
        ? `E aí! Estou com seu livro **"${bookState!.titulo}"** aberto aqui na bancada (${bookState!.capitulos.length} capítulos, cerca de ${bookState!.capitulos.reduce((a, c) => a + c.texto.split(/\s+/).filter(Boolean).length, 0).toLocaleString()} palavras no perfil **${nomeTipo}**).\n\nPodemos fazer uma revisão de ponta a ponta na obra toda, enriquecer com mais detalhes e exemplos, ou partir para um capítulo específico. O que você prefere atacar agora?`
        : `E aí! Mesa de trabalho pronta. Estamos no modo **${nomeTipo}**.\n\nVocê pode puxar qualquer livro pronto da sua base pelo botão **"📚 Meus Livros"** acima para revisar e interagir, ou começarmos a desenhar uma nova obra aqui. Se for uma nova, me conta: qual é a ideia central ou o problema que seu livro vai resolver?`,
      suggestedActions: hasExistingBook ? [
        { label: '📖 Revisar Obra Inteira de Uma Vez', action: 'acao_revisar_tudo_agora', primary: true },
        { label: tipo === 'ficcao' ? '✨ Enriquecer História & Diálogos' : '⚙️ Enriquecer Conteúdo Técnico', action: 'acao_enriquecer_profundo' },
        { label: '📥 Baixar PDF Diagramado', action: 'acao_baixar_pdf' }
      ] : [
        { label: '⚙️ Livro Técnico & IA', action: 'exemplo_0' },
        { label: '📘 Autoajuda & Foco Diário', action: 'exemplo_1' },
        { label: '🛠️ Guia Prático Financeiro', action: 'exemplo_2' },
        { label: '📖 Ficção & Mistério', action: 'exemplo_3' }
      ]
    };

    setMessages([msgInicial]);
    coAuthorVoiceService.speak(msgInicial.text, msgInicial.id);
  };

  // Iniciar Nova Obra 100% Individualizada em Branco
  const handleStartNewBook = (novoPerfil?: CoAuthorBookType) => {
    const perfilFinal = novoPerfil || tipoLivro;
    const novoLivroCriado = onStartNewBook ? onStartNewBook(perfilFinal) : null;

    setTipoLivro(perfilFinal);
    setGenreMismatchModal(null);
    setShowNewBookConfirm(false);
    setEditorialPlan(null);
    setRespostasBriefing({ premissa: '', elementos: '', formula: '' });
    setFlowTema('');
    setFlowTitulo(novoLivroCriado?.titulo || (perfilFinal === 'autoajuda' ? 'O Poder da Transformação Pessoal' : 'Nova Obra KDP'));
    setFlowSubtitulo(novoLivroCriado?.subtitulo || '');
    setTitleSuggestions([]);

    if (!novoLivroCriado) {
      const novoLivro: CoAuthorBookState = {
        titulo: perfilFinal === 'autoajuda' ? 'O Poder da Transformação Pessoal' : 'Nova Obra KDP',
        subtitulo: '',
        autor: autorAtual,
        genero: perfilFinal === 'autoajuda' ? 'Autoajuda & Desenvolvimento Pessoal' : (perfilFinal === 'tecnico' ? 'Técnico' : 'Geral'),
        idioma: idiomaAtual,
        tipoLivro: perfilFinal,
        capitulos: [],
        meta: { palavrasPorCap: 900, paginasAlvo: paginasAlvo || 80 }
      };
      onUpdateBookState(novoLivro);
      onSaveProgress(novoLivro);
    }

    iniciarConversaNatural(perfilFinal);
    setActiveFlowStep(null);
    setInternalTab('arquitetura'); // Abre diretamente a Arquitetura da Obra, Capa & Sobrecapa
  };

  // Aplicação da Arquitetura Prévia da Obra definida pelo autor no painel
  const handleApplyArchitecture = (data: BookArchitectureData) => {
    setTipoLivro(data.tipoLivro);
    setFlowTitulo(data.titulo);
    setFlowSubtitulo(data.subtitulo);
    setCustomTotalCaps(data.totalCapitulos);
    if (data.tema) {
      setFlowTema(data.tema);
      setRespostasBriefing(prev => ({ ...prev, tema: data.tema }));
    } else if (data.premissa) {
      setFlowTema(data.premissa);
      setRespostasBriefing(prev => ({ ...prev, premissa: data.premissa }));
    }

    const atualizado: CoAuthorBookState = {
      ...(bookState || {
        titulo: data.titulo,
        subtitulo: data.subtitulo,
        autor: autorAtual,
        genero: data.tipoLivro,
        idioma: idiomaAtual,
        capitulos: [],
        meta: {
          palavrasPorCap: data.palavrasPorCapitulo,
          paginasAlvo: data.paginasEstimadas
        }
      }),
      titulo: data.titulo,
      subtitulo: data.subtitulo,
      tipoLivro: data.tipoLivro,
      meta: {
        palavrasPorCap: data.palavrasPorCapitulo,
        paginasAlvo: data.paginasEstimadas
      },
      sobrecapaTexto: data.sobrecapaTexto,
      sobrecapaPaleta: data.sobrecapaPaleta,
      fraseDestaqueSobrecapa: data.fraseDestaqueSobrecapa
    };

    onUpdateBookState(atualizado);
    onSaveProgress(atualizado);

    const msgConfirmacao: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Excelente! A arquitetura da obra foi configurada com maestria:\n\n` +
        (data.tema ? `🎯 **Tema Central:** ${data.tema}${data.subtema ? ` (${data.subtema})` : ''}\n` : '') +
        `📖 **Título:** ${data.titulo}\n` +
        (data.subtitulo ? `✨ **Subtítulo:** ${data.subtitulo}\n` : '') +
        `📐 **Estrutura:** ${data.totalCapitulos} capítulos com meta de ${data.palavrasPorCapitulo.toLocaleString('pt-BR')} palavras/capítulo\n` +
        `📄 **Projeção Impressa KDP:** ~${data.paginasEstimadas} páginas (Lombada estimada: ${(data.paginasEstimadas * 0.0572).toFixed(1)} mm)\n` +
        (data.sobrecapaTexto ? `🎨 **Sobrecapa em Sintonia:** Sinopse e gancho misterioso configurados para instigar o leitor.\n\n` : '\n') +
        `Podemos agora avançar para a produção do **Capítulo 1** ou refinar os tópicos estruturais?`,
      suggestedActions: [
        { label: '✍️ Começar Redação do Capítulo 1', action: 'iniciar_cap_1', primary: true },
        { label: '📋 Ver Sumário Estrutural', action: 'pedir_sumario' }
      ]
    };

    setMessages(prev => [...prev, msgConfirmacao]);
    setInternalTab('chat');
  };

  // Troca de Perfil Editorial pelo usuário com detecção inteligente de incompatibilidade
  const handleChangeTipoLivro = (novoTipo: CoAuthorBookType) => {
    const totalCapsAtuais = bookState?.capitulos?.length || 0;
    const generoAnterior = bookState?.tipoLivro || tipoLivro;

    // Se já existem capítulos escritos E o autor está trocando para um perfil diferente (ex: tinha Ficção e clicou em Autoajuda)
    if (totalCapsAtuais > 0 && generoAnterior !== novoTipo) {
      setGenreMismatchModal({
        oldGenre: generoAnterior,
        newGenre: novoTipo,
        count: totalCapsAtuais
      });
      return;
    }

    setTipoLivro(novoTipo);
    if (bookState) {
      const atualizado = {
        ...bookState,
        tipoLivro: novoTipo,
        genero: novoTipo === 'autoajuda' ? 'Autoajuda & Desenvolvimento Pessoal' : (novoTipo === 'tecnico' ? 'Técnico / Profissional' : (novoTipo === 'pratico' ? 'Guia Prático' : 'Ficção'))
      };
      onUpdateBookState(atualizado);
      onSaveProgress(atualizado);
    }

    const nomePerfil =
      novoTipo === 'tecnico'
        ? 'Livro Técnico & Didático (Resolução de Problemas)'
        : novoTipo === 'autoajuda'
        ? 'Autoajuda & Desenvolvimento Pessoal'
        : novoTipo === 'pratico'
        ? 'Guia Prático Passo a Passo (How-To)'
        : 'Ficção & Narrativa';

    setMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `🔄 **Perfil Editorial ajustado para: ${nomePerfil}**. A inteligência editorial agora calibrará tom, exemplos e estrutura especificamente para esse formato.`
      }
    ]);
  };

  // Humanização de Texto de Capítulo (Eliminação de clichês e ritmo humano autêntico)
  const handleHumanizeChapter = async (capIdx: number) => {
    if (!bookState || !bookState.capitulos || !bookState.capitulos[capIdx]) return;
    const cap = bookState.capitulos[capIdx];
    setIsHumanizingChapter(capIdx);
    setAiLoadingStatus(`✨ Humanizando Capítulo ${capIdx + 1} ("${cleanChapterTitle(cap.titulo)}")... Removendo clichês mecânicos de IA...`);

    try {
      const textoHumanizado = await KdpHumanizerEngine.humanizeContent(
        cap.texto,
        cleanChapterTitle(cap.titulo),
        {
          genre: tipoLivro === 'autoajuda' ? 'Autoajuda & Desenvolvimento Pessoal' : (tipoLivro === 'tecnico' ? 'Técnico' : tipoLivro),
          tone: tipoLivro === 'autoajuda' ? 'caloroso' : 'didatico-descontraido'
        }
      );

      const novosCaps = [...bookState.capitulos];
      novosCaps[capIdx] = {
        ...novosCaps[capIdx],
        texto: textoHumanizado
      };

      const livroAtualizado = { ...bookState, capitulos: novosCaps };
      onUpdateBookState(livroAtualizado);
      onSaveProgress(livroAtualizado);

      setHumanizeSuccessToast(`Capítulo ${capIdx + 1} humanizado com sucesso!`);
      setTimeout(() => setHumanizeSuccessToast(null), 3500);

      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'system',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `✨ **Capítulo ${capIdx + 1}: "${cleanChapterTitle(cap.titulo)}" Humanizado com Sucesso!**\nO texto foi refinado com ritmo autoral dinâmico, variação de frases e eliminação completa de clichês robóticos. A leitura agora soa autêntica e magnética para o leitor KDP.`
        }
      ]);
    } catch (err: any) {
      console.error('Erro na humanização:', err);
    } finally {
      setIsHumanizingChapter(null);
      setAiLoadingStatus('');
    }
  };

  // Gerador de Títulos Comerciais Bestseller com IA no Passo 2
  const handleGenerateTitleSuggestions = async () => {
    setIsSuggestingTitles(true);
    try {
      const promptTitles = `Você é um Consultor de Marketing Editorial e Especialista em Bestsellers da Amazon KDP.
Crie 5 propostas irresistíveis de TÍTULO e SUBTÍTULO para uma obra com estas características:
Gênero: ${tipoLivro}
Tema Central: ${respostasBriefing.premissa || flowTema || 'Desenvolvimento pessoal e alta produtividade'}
Público: ${flowPublico}

FORMATO EXATO OBRIGATÓRIO (retorne exatamente 5 opções):
[OPCAO 1]
TITULO: ...
SUBTITULO: ...
MOTIVO: Por que este título converte leitores na Amazon KDP
[/OPCAO]
[OPCAO 2]
TITULO: ...
SUBTITULO: ...
MOTIVO: ...
[/OPCAO]`;

      const res = await chamarGeminiTexto(promptTitles, {
        temperature: 0.85,
        maxTokens: 1200
      });

      const options: Array<{ title: string; subtitle: string; rationale: string }> = [];
      const regex = /\[OPCAO\s*\d+\][\s\S]*?TITULO:\s*(.+?)[\r\n]+SUBTITULO:\s*(.+?)[\r\n]+MOTIVO:\s*([\s\S]*?)\[\/OPCAO\]/gi;
      let m;
      while ((m = regex.exec(res.texto)) !== null) {
        options.push({
          title: m[1].trim(),
          subtitle: m[2].trim(),
          rationale: m[3].trim()
        });
      }

      if (options.length > 0) {
        setTitleSuggestions(options);
      }
    } catch (err) {
      console.error('Erro ao sugerir títulos:', err);
    } finally {
      setIsSuggestingTitles(false);
    }
  };

  // GERAÇÃO DE SUGESTÕES DE TÍTULOS ORIUNDOS DA AMAZON KDP (PASSO 2)
  const gerarSugestoesTitulosAmazon = async (tema: string, tipo: CoAuthorBookType) => {
    setIsLoadingAmazonSuggestions(true);
    setAiLoadingStatus('Pesquisando tendências e títulos de alta conversão na Amazon KDP...');

    try {
      let termosReais: string[] = [];
      try {
        const seed = tema.split(/\s+/).slice(0, 3).join(' ');
        termosReais = await AmazonLiveService.getLiveSuggestions(seed, 'br');
      } catch (e) {
        console.warn('Fallback amazon live keywords:', e);
      }

      const promptTitulos = `Você é o Estrategista de Bestsellers e Títulos Comerciais da Amazon KDP.
Tema do Livro: "${tema}"
Perfil Editorial: ${tipo}
Termos reais em alta na Amazon: ${termosReais.slice(0, 5).join(', ') || 'alta demanda KDP'}

Crie exatamente 5 TÍTULOS COMERCIAIS magnéticos, impactantes e curtos para capa na Amazon KDP.
Para cada título, apresente a justificativa estratégica (rationale) de por que ele gera cliques e atrai o leitor na Amazon.

Responda ESTRITAMENTE em formato JSON puro:
[
  { "title": "Título Magnético 1", "rationale": "Gatilho de autoridade e alta taxa de busca na Amazon" },
  { "title": "Título Magnético 2", "rationale": "Promessa de transformação imediata" },
  { "title": "Título Magnético 3", "rationale": "Curiosidade e retenção" },
  { "title": "Título Magnético 4", "rationale": "Método comprovado sem enrolação" },
  { "title": "Título Magnético 5", "rationale": "Forte apelo comercial e clareza total" }
]`;

      const res = await chamarGeminiTexto(promptTitulos, { temperature: 0.75, maxTokens: 1200 });
      const match = res.texto.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setSuggestedTitlesAmazon(parsed);
      } else {
        setSuggestedTitlesAmazon([
          { title: `O Poder de ${tema.slice(0, 32)}`, rationale: 'Padrão clássico de bestseller com alta taxa de conversão' },
          { title: 'Inabalável: O Método Definitivo', rationale: 'Gatilho de autoridade e segurança para o leitor' },
          { title: 'Do Caos à Maestria Diária', rationale: 'Promessa de transformação prática imediata' },
          { title: 'A Arte da Execução Implacável', rationale: 'Forte apelo comercial e foco em ação' },
          { title: 'Manual Prático de Alta Performance', rationale: 'Direto, pragmático e sem enrolação' }
        ]);
      }
    } catch (err) {
      console.error('Erro ao gerar títulos da Amazon:', err);
    } finally {
      setIsLoadingAmazonSuggestions(false);
      setAiLoadingStatus('');
    }
  };

  // GERAÇÃO DE SUGESTÕES DE SUBTÍTULOS COM PROMESSA CLARA (PASSO 3)
  const gerarSugestoesSubtitulosAmazon = async (titulo: string, tema: string, tipo: CoAuthorBookType) => {
    setIsLoadingAmazonSuggestions(true);
    setAiLoadingStatus('Gerando subtítulos de alta conversão no padrão Amazon KDP...');

    try {
      const promptSubtitulos = `Você é o Estrategista de Vendas e Copywriter da Amazon KDP.
Título Oficial: "${titulo}"
Tema da Obra: "${tema}"
Perfil Editorial: ${tipo}

Crie exatamente 5 SUBTÍTULOS DE ALTA CONVERSÃO KDP.
Cada subtítulo DEVE:
1. Conter a promessa explícita do que o leitor vai alcançar.
2. Eliminar uma grande dor ou objeção comum (ex: sem ansiedade, sem jargões, sem fórmulas mágicas).
3. Ter um formato magnético de bestseller comprovado na Amazon.

Responda ESTRITAMENTE em formato JSON puro:
[
  { "subtitle": "Como Vencer a Procrastinação e Ter 4 Horas de Foco Sem Ansiedade", "rationale": "Gatilho de quebra de objeção e promessa direta" },
  { "subtitle": "O Passo a Passo Prático Para Dominar Hábitos e Conquistar Resultados Reais", "rationale": "Estrutura pragmática de guia de ação" },
  { "subtitle": "O Guia Definitivo Para Transformar Sua Rotina e Destravar Alta Produtividade", "rationale": "Foco em resolução de problema" },
  { "subtitle": "Estratégias Reais Testadas no Campo de Batalha Para Blindar Sua Mente", "rationale": "Autoridade e aplicabilidade" },
  { "subtitle": "Um Método Simples e Eficaz Para Mudar de Vida em Menos de 30 Dias", "rationale": "Especificidade temporal e baixo atrito" }
]`;

      const res = await chamarGeminiTexto(promptSubtitulos, { temperature: 0.75, maxTokens: 1200 });
      const match = res.texto.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setSuggestedSubtitlesAmazon(parsed);
      } else {
        setSuggestedSubtitlesAmazon([
          { subtitle: 'Como Dominar Hábitos Práticos e Vencer a Procrastinação Sem Fórmulas Mágicas', rationale: 'Promessa direta com quebra de objeção' },
          { subtitle: 'O Passo a Passo Testado Para Conquistar Resultados Reais em 30 Dias', rationale: 'Gatilho de especificidade temporal' },
          { subtitle: 'O Guia Definitivo Para Profissionais Que Buscam Alta Performance', rationale: 'Posicionamento e público qualificado' },
          { subtitle: 'Estratégias Reais Para Blindar Sua Mente e Ter Foco Diário', rationale: 'Foco em resolução de dor' },
          { subtitle: 'Um Método Simplificado Para Transformar Sua Rotina Hoje Mesmo', rationale: 'Ação imediata sem atrito' }
        ]);
      }
    } catch (err) {
      console.error('Erro ao gerar subtítulos da Amazon:', err);
    } finally {
      setIsLoadingAmazonSuggestions(false);
      setAiLoadingStatus('');
    }
  };

  // PASSO 1 -> PASSO 2: ESCOLHER TEMA (SÓ AVANÇA APÓS SELEÇÃO)
  const handleSelectTema = async (temaTexto: string, perfilSugerido?: CoAuthorBookType) => {
    setFlowTema(temaTexto);
    if (perfilSugerido) {
      setTipoLivro(perfilSugerido);
    }
    setRespostasBriefing(prev => ({ ...prev, premissa: temaTexto }));

    if (bookState) {
      const atualizado = {
        ...bookState,
        tipoLivro: perfilSugerido || tipoLivro,
        genero: perfilSugerido === 'autoajuda' ? 'Autoajuda & Desenvolvimento Pessoal' : (perfilSugerido === 'tecnico' ? 'Técnico' : 'Geral')
      };
      onUpdateBookState(atualizado);
      onSaveProgress(atualizado);
    }

    setEditorialStage(2);

    const msg: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `🎯 **Passo 1 Concluído! Tema selecionado:**\n\n` +
        `📌 *"${temaTexto}"*\n\n` +
        `Excelente! Esse nicho possui alta tração e buscas no Amazon KDP.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 **Passo 2: Escolha o Título Comercial Bestseller**\n` +
        `Abaixo estão as 5 sugestões de títulos comerciais de busca da Amazon KDP. Você pode clicar no card para escolher ou ditar por voz:`,
      suggestedActions: []
    };

    setMessages(prev => [...prev, msg]);
    coAuthorVoiceService.speak(`Tema selecionado com sucesso! Agora, no Passo 2, escolha um dos títulos comerciais da Amazon abaixo ou diga o seu título por voz.`, msg.id);

    await gerarSugestoesTitulosAmazon(temaTexto, perfilSugerido || tipoLivro);
  };

  // PASSO 2 -> PASSO 3: ESCOLHER TÍTULO (SÓ AVANÇA APÓS SELEÇÃO)
  const handleSelectTitulo = async (tituloEscolhido: string) => {
    setFlowTitulo(tituloEscolhido);
    if (bookState) {
      const atualizado = {
        ...bookState,
        titulo: tituloEscolhido
      };
      onUpdateBookState(atualizado);
      onSaveProgress(atualizado);
    }

    setEditorialStage(3);

    const msg: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `📖 **Passo 2 Concluído! Título oficial definido:**\n\n` +
        `🏆 **"${tituloEscolhido}"**\n\n` +
        `Forte, magnético e com alto potencial de conversão na Amazon KDP!\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 **Passo 3: Escolha o Subtítulo de Conversão**\n` +
        `O subtítulo é o gatilho decisivo para convencer o leitor a comprar o livro na Amazon. Escolha uma das 5 opções abaixo ou dite por voz:`,
      suggestedActions: []
    };

    setMessages(prev => [...prev, msg]);
    coAuthorVoiceService.speak(`Título aprovado: "${tituloEscolhido}". Agora, no Passo 3, escolha o subtítulo de conversão abaixo ou dite por voz.`, msg.id);

    await gerarSugestoesSubtitulosAmazon(tituloEscolhido, flowTema || respostasBriefing.premissa, tipoLivro);
  };

  // PASSO 3 -> PASSO 4: ESCOLHER SUBTÍTULO (SÓ AVANÇA APÓS SELEÇÃO)
  const handleSelectSubtitulo = async (subtituloEscolhido: string) => {
    setFlowSubtitulo(subtituloEscolhido);
    if (bookState) {
      const atualizado = {
        ...bookState,
        subtitulo: subtituloEscolhido
      };
      onUpdateBookState(atualizado);
      onSaveProgress(atualizado);
    }

    setEditorialStage(4);

    const msg: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `✨ **Passo 3 Concluído! Subtítulo definido:**\n\n` +
        `💡 *"${subtituloEscolhido}"*\n\n` +
        `Promessa comercial forte e consolidada! Agora no **Passo 4**, estamos estruturando a arquitetura dos capítulos (Sumário da Obra)...`,
      suggestedActions: []
    };

    setMessages(prev => [...prev, msg]);
    coAuthorVoiceService.speak(`Subtítulo aprovado! Agora no Passo 4 estamos estruturando o sumário dos capítulos.`, msg.id);

    await gerarEstruturaSumario(flowTitulo, subtituloEscolhido, flowTema || respostasBriefing.premissa, tipoLivro);
  };

  // GERAÇÃO DA ESTRUTURA DO SUMÁRIO (PASSO 4)
  const gerarEstruturaSumario = async (titulo: string, subtitulo: string, tema: string, tipo: CoAuthorBookType) => {
    setIsAiProcessing(true);
    setAiLoadingStatus('Projetando sumário e capítulos estruturados para aprovação editorial...');

    try {
      const totalCaps = customTotalCaps || totalCapsDesejado || 8;
      const plano = await orchestrateEditorialPlan(
        {
          title: titulo,
          subtitle: subtitulo,
          genre: tipo === 'autoajuda' ? 'Autoajuda' : (tipo === 'tecnico' ? 'Técnico' : 'Geral'),
          language: idiomaAtual,
          topic: tema,
          promise: subtitulo,
          differentiator: `Padrão editorial bestseller Amazon KDP para ${tipo}`
        },
        totalCaps
      );

      setEditorialPlan(plano);

      const listaCaps = plano.chapters.map((ch, idx) =>
        `• **Capítulo ${idx + 1}:** ${cleanChapterTitle(ch.title)} — *${ch.objective}*`
      ).join('\n');

      const msgSumario: CoAuthorMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `📋 **Passo 4: Proposta de Sumário Estruturado (${plano.chapters.length} Capítulos)**\n\n` +
          `📖 **Obra:** ${titulo}\n` +
          `✨ **Subtítulo:** ${subtitulo}\n\n` +
          `${listaCaps}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Para começarmos a escrever o **Capítulo 1**, clique em **"Aprovar Sumário"** ou diga por voz: *"Aprovar sumário"* ou *"Pode começar"*.`,
        suggestedActions: [
          { label: '✅ Aprovar Sumário e Escrever Capítulo 1', action: 'aprovar_sumario', primary: true },
          { label: '🔄 Gerar Nova Proposta de Capítulos', action: 'regenerar_sumario' }
        ]
      };

      setMessages(prev => [...prev, msgSumario]);
      coAuthorVoiceService.speak(`Sumário com ${plano.chapters.length} capítulos projetado! Diga "Aprovar" ou clique no botão para começarmos a escrever o Capítulo 1.`, msgSumario.id);
    } catch (err: any) {
      console.error('Erro ao estruturar sumário:', err);
    } finally {
      setIsAiProcessing(false);
      setAiLoadingStatus('');
    }
  };

  // PASSO 4 -> PASSO 5: APROVAR SUMÁRIO E INICIAR REDAÇÃO
  const handleAprovarSumario = async () => {
    setEditorialStage(5);
    await executarEscritaCapitulo(1, {
      premissa: flowTema || respostasBriefing.premissa,
      elementos: respostasBriefing.elementos || 'Capítulos estruturados com passo a passo e resolução de problemas',
      formula: flowSubtitulo || respostasBriefing.formula || 'Bestseller Amazon KDP'
    });
  };

  // PASSO 5: APROVAR CAPÍTULO ATUAL E ESCREVER PRÓXIMO (OU CONCLUIR SE FOR O ÚLTIMO)
  const handleAprovarCapituloEAvancar = async () => {
    const capsAtuais = bookState?.capitulos?.length || 0;
    const totalCaps = customTotalCaps || totalCapsDesejado || 8;

    if (capsAtuais >= totalCaps) {
      // Obra concluída! Avança para o Passo 6 (Capa & Conclusão KDP)
      setEditorialStage(6);
      const msgFinal: CoAuthorMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `🎉 **PARABÉNS! OBRA 100% CONCLUÍDA E APROVADA!**\n\n` +
          `Todos os ${totalCaps} capítulos do livro **"${bookState?.titulo || flowTitulo}"** foram escritos e aprovados com sucesso!\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👉 **Passo 6: Capa Oficial KDP & Publicação Liberada**\n` +
          `A capa oficial diagramada e o PDF de publicação oficial no Amazon KDP estão prontos para download!`,
        suggestedActions: [
          { label: '📥 Baixar PDF Diagramado Oficial KDP', action: 'baixar_pdf', primary: true },
          { label: '📄 Baixar Manuscrito Completo (TXT)', action: 'baixar_txt' },
          { label: '📖 Folhear Livro Diagramado', action: 'ir_diagramado' },
          { label: '🛡️ Ver Revisão Editorial', action: 'ir_revisao' }
        ]
      };
      setMessages(prev => [...prev, msgFinal]);
      coAuthorVoiceService.speak(`Parabéns! Todos os capítulos foram aprovados com sucesso. Seu livro está completo e o PDF pronto para o Amazon KDP!`, msgFinal.id);
      return;
    }

    const proximoNum = capsAtuais + 1;
    await executarEscritaCapitulo(proximoNum, {
      premissa: flowTema || respostasBriefing.premissa,
      elementos: respostasBriefing.elementos || 'Capítulos estruturados com passo a passo e resolução de problemas',
      formula: flowSubtitulo || respostasBriefing.formula || 'Bestseller Amazon KDP'
    });
  };

  // Compatibilidade com ações diretas
  const handleApplyTitleSuggestion = (title: string, subtitle: string) => {
    handleSelectTitulo(title);
    if (subtitle) {
      handleSelectSubtitulo(subtitle);
    }
  };

  const handleSaveFlowTema = () => {
    if (flowTema.trim()) {
      handleSelectTema(flowTema.trim());
    }
  };

  const handleSaveFlowTitulo = () => {
    if (flowTitulo.trim()) {
      handleSelectTitulo(flowTitulo.trim());
    }
  };

  // ENVIO DA MENSAGEM DO AUTOR COM PROCESSAMENTO REAL VIA GEMINI
  const handleSendUserInput = async (forcedText?: string) => {
    const texto = (forcedText || userInput).trim();
    if (!texto || isAiProcessing) return;

    if (!forcedText) setUserInput('');

    // Mensagem do usuário
    const userMsg: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: texto
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setIsAiProcessing(true);
    setAiLoadingStatus('CoAuthor está analisando seu pedido e formulando a resposta editorial...');

    const textoLower = texto.toLowerCase();

    // ──────────────────────────────────────────────────────────────────────────
    // ESTEIRA EDITORIAL RIGIDAMENTE GUIADA (VOZ & TEXTO): PASSO A PASSO
    // ──────────────────────────────────────────────────────────────────────────

    // 1. PASSO 1: SELEÇÃO DE TEMA POR VOZ OU ESCRITA
    if (editorialStage === 1) {
      if (textoLower.includes('tema 1') || textoLower.includes('opção 1') || textoLower.includes('primeiro tema') || textoLower.includes('foco profundo')) {
        await handleSelectTema(TEMAS_AMAZON_KDP[0].descricao, TEMAS_AMAZON_KDP[0].perfil);
        return;
      }
      if (textoLower.includes('tema 2') || textoLower.includes('opção 2') || textoLower.includes('segundo tema') || textoLower.includes('engenharia de prompts') || textoLower.includes('ia')) {
        await handleSelectTema(TEMAS_AMAZON_KDP[1].descricao, TEMAS_AMAZON_KDP[1].perfil);
        return;
      }
      if (textoLower.includes('tema 3') || textoLower.includes('opção 3') || textoLower.includes('terceiro tema') || textoLower.includes('liberdade financeira') || textoLower.includes('finanças')) {
        await handleSelectTema(TEMAS_AMAZON_KDP[2].descricao, TEMAS_AMAZON_KDP[2].perfil);
        return;
      }
      if (textoLower.includes('tema 4') || textoLower.includes('opção 4') || textoLower.includes('quarto tema') || textoLower.includes('inteligência emocional') || textoLower.includes('estoicismo')) {
        await handleSelectTema(TEMAS_AMAZON_KDP[3].descricao, TEMAS_AMAZON_KDP[3].perfil);
        return;
      }
      if (textoLower.includes('tema 5') || textoLower.includes('opção 5') || textoLower.includes('quinto tema') || textoLower.includes('biohacking') || textoLower.includes('saúde')) {
        await handleSelectTema(TEMAS_AMAZON_KDP[4].descricao, TEMAS_AMAZON_KDP[4].perfil);
        return;
      }
      if (textoLower.includes('tema 6') || textoLower.includes('opção 6') || textoLower.includes('sexto tema') || textoLower.includes('thriller') || textoLower.includes('ficção')) {
        await handleSelectTema(TEMAS_AMAZON_KDP[5].descricao, TEMAS_AMAZON_KDP[5].perfil);
        return;
      }
      // O autor ditou uma ideia/tema personalizado:
      await handleSelectTema(texto, tipoLivro);
      return;
    }

    // 2. PASSO 2: SELEÇÃO DE TÍTULO POR VOZ OU ESCRITA
    if (editorialStage === 2) {
      if (suggestedTitlesAmazon.length > 0) {
        if (textoLower.includes('título 1') || textoLower.includes('titulo 1') || textoLower.includes('opção 1') || textoLower.includes('primeiro título')) {
          await handleSelectTitulo(suggestedTitlesAmazon[0].title);
          return;
        }
        if (textoLower.includes('título 2') || textoLower.includes('titulo 2') || textoLower.includes('opção 2') || textoLower.includes('segundo título')) {
          await handleSelectTitulo(suggestedTitlesAmazon[1]?.title || suggestedTitlesAmazon[0].title);
          return;
        }
        if (textoLower.includes('título 3') || textoLower.includes('titulo 3') || textoLower.includes('opção 3') || textoLower.includes('terceiro título')) {
          await handleSelectTitulo(suggestedTitlesAmazon[2]?.title || suggestedTitlesAmazon[0].title);
          return;
        }
        if (textoLower.includes('título 4') || textoLower.includes('titulo 4') || textoLower.includes('opção 4') || textoLower.includes('quarto título')) {
          await handleSelectTitulo(suggestedTitlesAmazon[3]?.title || suggestedTitlesAmazon[0].title);
          return;
        }
        if (textoLower.includes('título 5') || textoLower.includes('titulo 5') || textoLower.includes('opção 5') || textoLower.includes('quinto título')) {
          await handleSelectTitulo(suggestedTitlesAmazon[4]?.title || suggestedTitlesAmazon[0].title);
          return;
        }
      }
      // O autor ditou ou digitou um título próprio:
      await handleSelectTitulo(texto);
      return;
    }

    // 3. PASSO 3: SELEÇÃO DE SUBTÍTULO POR VOZ OU ESCRITA
    if (editorialStage === 3) {
      if (suggestedSubtitlesAmazon.length > 0) {
        if (textoLower.includes('subtítulo 1') || textoLower.includes('subtitulo 1') || textoLower.includes('opção 1') || textoLower.includes('primeiro subtítulo')) {
          await handleSelectSubtitulo(suggestedSubtitlesAmazon[0].subtitle);
          return;
        }
        if (textoLower.includes('subtítulo 2') || textoLower.includes('subtitulo 2') || textoLower.includes('opção 2') || textoLower.includes('segundo subtítulo')) {
          await handleSelectSubtitulo(suggestedSubtitlesAmazon[1]?.subtitle || suggestedSubtitlesAmazon[0].subtitle);
          return;
        }
        if (textoLower.includes('subtítulo 3') || textoLower.includes('subtitulo 3') || textoLower.includes('opção 3') || textoLower.includes('terceiro subtítulo')) {
          await handleSelectSubtitulo(suggestedSubtitlesAmazon[2]?.subtitle || suggestedSubtitlesAmazon[0].subtitle);
          return;
        }
        if (textoLower.includes('subtítulo 4') || textoLower.includes('subtitulo 4') || textoLower.includes('opção 4') || textoLower.includes('quarto subtítulo')) {
          await handleSelectSubtitulo(suggestedSubtitlesAmazon[3]?.subtitle || suggestedSubtitlesAmazon[0].subtitle);
          return;
        }
        if (textoLower.includes('subtítulo 5') || textoLower.includes('subtitulo 5') || textoLower.includes('opção 5') || textoLower.includes('quinto subtítulo')) {
          await handleSelectSubtitulo(suggestedSubtitlesAmazon[4]?.subtitle || suggestedSubtitlesAmazon[0].subtitle);
          return;
        }
      }
      // O autor ditou ou digitou um subtítulo próprio:
      await handleSelectSubtitulo(texto);
      return;
    }

    // 4. PASSO 4: APROVAÇÃO DO SUMÁRIO POR VOZ OU ESCRITA
    if (editorialStage === 4) {
      if (
        textoLower.includes('aprovar sumário') ||
        textoLower.includes('aprovar sumario') ||
        textoLower.includes('aprovar') ||
        textoLower.includes('aprovado') ||
        textoLower.includes('pode começar') ||
        textoLower.includes('pode escrever') ||
        textoLower.includes('vamos começar') ||
        textoLower.includes('escrever capítulo 1') ||
        textoLower.includes('escrever capitulo 1') ||
        textoLower.includes('iniciar escrita') ||
        textoLower.includes('concordo')
      ) {
        await handleAprovarSumario();
        return;
      }
      if (textoLower.includes('outra proposta') || textoLower.includes('gerar outro') || textoLower.includes('regenerar sumário')) {
        await gerarEstruturaSumario(flowTitulo, flowSubtitulo, flowTema || respostasBriefing.premissa, tipoLivro);
        return;
      }
    }

    // 5. PASSO 5: APROVAÇÃO DO CAPÍTULO E AVANÇO SEQUENCIAL
    if (editorialStage === 5) {
      if (
        textoLower.includes('aprovado') ||
        textoLower.includes('aprovar capítulo') ||
        textoLower.includes('aprovar capitulo') ||
        textoLower.includes('próximo capítulo') ||
        textoLower.includes('proximo capitulo') ||
        textoLower.includes('pode continuar') ||
        textoLower.includes('continuar') ||
        textoLower.includes('ficou ótimo') ||
        textoLower.includes('está aprovado')
      ) {
        await handleAprovarCapituloEAvancar();
        return;
      }
    }

    // ROTEAMENTO DIRETO: REVISÃO EDITORIAL GLOBAL DE TODA A OBRA DE UMA VEZ
    if (
      textoLower.includes('revisar todo') ||
      textoLower.includes('revisar toda') ||
      textoLower.includes('revisar o livro') ||
      textoLower.includes('revisar obra') ||
      textoLower.includes('revisar tudo') ||
      textoLower.includes('revisar todos')
    ) {
      await handleExecuteFullBookReview();
      return;
    }

    // ROTEAMENTO DIRETO: ENRIQUECIMENTO PROFUNDO DE CONTEÚDO / HISTÓRIA
    if (
      textoLower.includes('enriquecer') ||
      textoLower.includes('mais detalhes') ||
      textoLower.includes('mais conteudo') ||
      textoLower.includes('mais conteúdo') ||
      textoLower.includes('aprofundar')
    ) {
      await handleExecuteDeepBookEnrichment();
      return;
    }

    // CHECAGEM ESPECIALIZADA: ENREDO & COERÊNCIA NARRATIVA / DIDÁTICA
    if (textoLower.includes('enredo') || textoLower.includes('trama') || textoLower.includes('arco narrativo') || textoLower.includes('roteiro')) {
      await executarChecagemEnredo(newMsgs);
      return;
    }

    // CHECAGEM ESPECIALIZADA: COESÃO DO TEXTO, FLUIDEZ & GRAMÁTICA
    if (textoLower.includes('coesão') || textoLower.includes('coesao') || textoLower.includes('fluidez') || textoLower.includes('estilo') || textoLower.includes('clareza')) {
      await executarChecagemCoesao(newMsgs);
      return;
    }

    // CHECAGEM ESPECIALIZADA: PREPARAÇÃO PARA PUBLICAÇÃO KDP
    if (textoLower.includes('preparar') || textoLower.includes('publicar') || textoLower.includes('publicação') || textoLower.includes('metadados') || textoLower.includes('sinopse')) {
      await executarPreparacaoKdp(newMsgs);
      return;
    }

    // CHECAGEM ESPECIALIZADA: DIAGRAMAÇÃO DO LIVRO
    if (textoLower.includes('diagramar') || textoLower.includes('diagramação') || textoLower.includes('layout')) {
      await executarOrientacaoDiagramacao(newMsgs);
      return;
    }

    // CONVERSA PADRÃO DO PROCESSO DO LIVRO COM TOM HUMANO E FLUIDO
    try {
      const historicoRecente = newMsgs.slice(-8).map(m => {
        const autorTag = m.sender === 'user' ? 'AUTOR' : (m.sender === 'agent' ? 'COAUTHOR' : 'SISTEMA');
        return `${autorTag}: ${m.text}`;
      }).join('\n\n');

      let diretrizEstilo = '';
      if (tipoLivro === 'tecnico') {
        diretrizEstilo = `DIRETRIZ EDITORIAL: LIVRO TÉCNICO & RESOLUÇÃO DE PROBLEMAS
- Este livro NÃO É FICÇÃO. Não há personagens, dramas emocionais nem metáforas literárias.
- O objetivo é ENSINAR uma técnica, ferramenta ou método para resolver problemas reais.
- Didática clara, estrutura em tópicos, exemplos de casos reais, boas práticas e vocabulário popular e acessível.`;
      } else if (tipoLivro === 'autoajuda') {
        diretrizEstilo = `DIRETRIZ EDITORIAL: AUTOAJUDA & DESENVOLVIMENTO PESSOAL
- Foco em transformação pessoal, hábitos, clareza mental e superação.
- Linguagem encorajadora, sem poesia abstrata. Cada capítulo deve ter exercícios práticos e plano de ação imediato.`;
      } else if (tipoLivro === 'pratico') {
        diretrizEstilo = `DIRETRIZ EDITORIAL: GUIA PRÁTICO PASSO A PASSO (HOW-TO)
- Instrução direta e pragmática em etapas numeradas, macetes de execução e erros comuns a evitar.`;
      } else {
        diretrizEstilo = `DIRETRIZ EDITORIAL: FICÇÃO & NARRATIVA
- Personagens consistentes, ambientação sensorial sem metáforas prolixas, ganchos de retenção e desfecho conclusivo.`;
      }

      const systemInstruction = `Você é o CoAuthor parceiro, experiente e dedicado escritor/editor ao lado do autor nesta bancada de trabalho do Amazon KDP.

PERFIL ATIVO: ${tipoLivro.toUpperCase()}
${diretrizEstilo}

DIRETRIZES DE COMUNICAÇÃO NATURAL, HUMANA E FLUIDA:
1. NUNCA fale como um robô ou IA. É TERMINANTEMENTE PROIBIDO usar chavões como:
   - "Olá! Sou seu assistente de inteligência artificial..."
   - "Como seu agente editorial..."
   - "Estou aqui como sua IA..."
   - "Como posso ajudar você hoje?"
   - "Com certeza! Como seu coautor..."
2. CONVERSA FLUIDA E CONTÍNUA:
   - Se já existe conversa no histórico, NÃO reinicie com saudações formais ("Olá, que prazer falar com você hoje!").
   - Fale direto ao ponto, respondendo ou avançando sobre o que o autor acabou de dizer, como dois colegas que já estão trabalhando juntos na mesma mesa.
   - Linguagem natural, viva, confiante, perspicaz e acolhedora em Português do Brasil.
3. CONDUÇÃO EDITORIAL PRÁTICA:
   - Auxilie em tudo: ideias, títulos, estrutura de capítulos, redação, enriquecimento de detalhes e revisão da obra.
   - No perfil TÉCNICO/NÃO-FICÇÃO: mantenha a atenção em metodologias, passos práticos, exemplos reais e checklists úteis, sem firulas ficcionais.
   - No perfil FICÇÃO: concentre-se na ambientação sensorial, diálogos afiados e ritmo das cenas.
4. ALINHAMENTO EDITORIAL DE NOVA OBRA:
   Quando o tema e a estrutura estiverem bem desenhados (ou o autor pedir para iniciar), inclua no final:
   <<<ALINHAMENTO_CONCLUIDO>>>
   TITULO: [Título Comercial Sugerido]
   SUBTITULO: [Subtítulo de Alta Conversão]
   TIPO: [tecnico | autoajuda | pratico | ficcao]
   PREMISSA: [Resumo de 2 linhas do tema e promessa da obra]
   ELEMENTOS: [Tópicos-chave inegociáveis]
   DIRETRIZ: [Diretriz de escrita dos capítulos]
   TOTAL_CAPS: [Quantidade sugerida de capítulos, ex: 8]
   <<<FIM_ALINHAMENTO>>>`;

      const promptCompleto = `━━━ HISTÓRICO CONVERSACIONAL RECENTE ━━━
${historicoRecente}

━━━ ÚLTIMA MENSAGEM DO AUTOR ━━━
${texto}

Responda como o CoAuthor humano, parceiro e experiente:`;

      const resAi = await chamarGeminiTexto(promptCompleto, {
        temperature: 0.7,
        systemInstruction,
        onStatusUpdate: (st) => setAiLoadingStatus(st)
      });

      const respostaTexto = resAi.texto;

      // Verifica se houve alinhamento editorial completo
      let alignmentCardData: any = null;
      let suggestedActionsList: Array<{ label: string; action: string; primary?: boolean }> = [];

      const matchAlinhamento = respostaTexto.match(/<<<ALINHAMENTO_CONCLUIDO>>>([\s\S]*?)<<<FIM_ALINHAMENTO>>>/);

      if (matchAlinhamento) {
        const bloco = matchAlinhamento[1];
        const mTit = bloco.match(/TITULO:\s*(.+)/i);
        const mSub = bloco.match(/SUBTITULO:\s*(.+)/i);
        const mTipo = bloco.match(/TIPO:\s*(.+)/i);
        const mPrem = bloco.match(/PREMISSA:\s*(.+)/i);
        const mElem = bloco.match(/ELEMENTOS:\s*(.+)/i);
        const mDir = bloco.match(/DIRETRIZ:\s*(.+)/i);
        const mCaps = bloco.match(/TOTAL_CAPS:\s*(\d+)/i);

        const novoTitulo = mTit ? mTit[1].trim() : (bookState?.titulo || 'Nova Obra KDP');
        const novoSubtitulo = mSub ? mSub[1].trim() : (bookState?.subtitulo || '');
        const novoTipo = (mTipo ? mTipo[1].trim().toLowerCase() : tipoLivro) as CoAuthorBookType;
        const novaPremissa = mPrem ? mPrem[1].trim() : texto;
        const novosElementos = mElem ? mElem[1].trim() : 'Estrutura técnica e prática';
        const novaDiretriz = mDir ? mDir[1].trim() : 'Didática clara e popular';
        const capsSugeridos = mCaps ? parseInt(mCaps[1], 10) : (totalCapsDesejado || 8);

        alignmentCardData = {
          titulo: novoTitulo,
          subtitulo: novoSubtitulo,
          tipo: novoTipo,
          premissa: novaPremissa,
          elementos: novosElementos,
          diretriz: novaDiretriz,
          totalCaps: capsSugeridos
        };

        setRespostasBriefing({
          premissa: novaPremissa,
          elementos: novosElementos,
          formula: novaDiretriz
        });

        if (bookState) {
          onUpdateBookState({
            ...bookState,
            titulo: novoTitulo,
            subtitulo: novoSubtitulo,
            tipoLivro: novoTipo
          });
        }

        suggestedActionsList = [
          { label: '✍️ Iniciar Produção do Capítulo 1', action: 'iniciar_cap_1', primary: true },
          { label: '🔄 Ajustar Tópicos ou Título', action: 'ajustar_briefing' },
          { label: '📚 Ver Proposta de Sumário', action: 'pedir_sumario' }
        ];
      } else {
        suggestedActionsList = [
          { label: '💡 Pode começar a escrever!', action: 'iniciar_cap_1', primary: true },
          { label: '⚙️ Quero uma abordagem 100% prática', action: 'pedir_mais_pratico' },
          { label: '📚 Sugira os títulos dos capítulos', action: 'pedir_sumario' }
        ];
      }

      const msgResposta: CoAuthorMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: respostaTexto,
        alignmentCard: alignmentCardData,
        suggestedActions: suggestedActionsList
      };

      setMessages(prev => [...prev, msgResposta]);
      coAuthorVoiceService.speak(respostaTexto, msgResposta.id);
    } catch (err: any) {
      console.error('Erro na resposta conversacional do CoAuthor:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ Houve uma instabilidade momentânea na conexão: ${err?.message || 'Falha de comunicação'}. Por favor, tente novamente.`
        }
      ]);
    } finally {
      setIsAiProcessing(false);
      setAiLoadingStatus('');
    }
  };

  // CHECAGEM DE ENREDO & COERÊNCIA NARRATIVA / DIDÁTICA PELO AGENTE
  const executarChecagemEnredo = async (currentMsgs: CoAuthorMessage[]) => {
    setAiLoadingStatus('CoAuthor está auditando o enredo, coerência e progressão dos capítulos...');

    const capitulosExistentes = bookState?.capitulos || [];
    if (capitulosExistentes.length === 0) {
      setMessages([
        ...currentMsgs,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🔍 **Checagem de Enredo**: Ainda não há capítulos escritos para auditar o enredo. Vamos primeiro definir a estrutura e escrever o Capítulo 1!`,
          suggestedActions: [
            { label: '✍️ Escrever Capítulo 1', action: 'iniciar_cap_1', primary: true }
          ]
        }
      ]);
      setIsAiProcessing(false);
      setAiLoadingStatus('');
      return;
    }

    try {
      const resumoCapitulos = capitulosExistentes.map((c, i) =>
        `Capítulo ${i + 1} ("${c.titulo}"): ${c.texto.slice(0, 300)}...`
      ).join('\n\n');

      const promptAuditoria = `Você é o Auditor Editorial Chefe do Book Engin Amazon KDP.
Analise o enredo, a progressão das ideias e a coerência geral da obra:
Título: "${bookState?.titulo}"
Gênero/Perfil: ${tipoLivro}
Capítulos Escritos: ${capitulosExistentes.length}

Resumo dos Capítulos:
${resumoCapitulos}

Forneça um relatório completo de Enredo e Coerência:
1. Nota Editorial de Coerência (0 a 100).
2. Pontos Fortes do Enredo / Progressão Didática.
3. Alertas de Ritmo ou Lacunas de Informação.
4. Conclusão e recomendação para publicação na Amazon KDP.`;

      const res = await chamarGeminiTexto(promptAuditoria, {
        temperature: 0.4,
        onStatusUpdate: (st) => setAiLoadingStatus(st)
      });

      setMessages([
        ...currentMsgs,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🔍 **Relatório Oficial de Checagem de Enredo & Coerência**\n\n${res.texto}`,
          suggestedActions: [
            { label: '📖 Ver no Livro Diagramado', action: 'ir_diagramado', primary: true },
            { label: '✍️ Fazer Checagem de Coesão do Texto', action: 'pedir_coesao' },
            { label: '🚀 Preparar para Publicação KDP', action: 'pedir_preparacao' }
          ]
        }
      ]);
    } catch (e: any) {
      setMessages([
        ...currentMsgs,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ Não foi possível concluir a checagem de enredo no momento: ${e?.message || 'Erro inesperado'}.`
        }
      ]);
    } finally {
      setIsAiProcessing(false);
      setAiLoadingStatus('');
    }
  };

  // CHECAGEM DE COESÃO DO TEXTO & FLUIDEZ PELO AGENTE
  const executarChecagemCoesao = async (currentMsgs: CoAuthorMessage[]) => {
    setAiLoadingStatus('CoAuthor está analisando a coesão textual, clareza, tom e fluidez...');

    const capitulosExistentes = bookState?.capitulos || [];
    if (capitulosExistentes.length === 0) {
      setMessages([
        ...currentMsgs,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `✍️ **Checagem de Coesão**: Você ainda não escreveu os capítulos. Escreva pelo menos um capítulo para verificarmos a fluidez e coesão!`,
          suggestedActions: [
            { label: '✍️ Escrever Capítulo 1', action: 'iniciar_cap_1', primary: true }
          ]
        }
      ]);
      setIsAiProcessing(false);
      setAiLoadingStatus('');
      return;
    }

    try {
      const amostraTexto = capitulosExistentes.slice(0, 3).map((c, i) =>
        `[Capítulo ${i + 1}: ${c.titulo}]\n${c.texto.slice(0, 800)}`
      ).join('\n\n---\n\n');

      const promptCoesao = `Você é o Revisor Linguístico e Especialista em Coesão Textual do Book Engin KDP.
Analise a fluidez, coesão, gramática e concordância do texto:
Livro: "${bookState?.titulo}"
Perfil Editorial: ${tipoLivro}

Amostra dos Capítulos:
${amostraTexto}

Forneça:
1. Avaliação de Fluidez e Conexão entre Parágrafos.
2. Análise de Vocabulário e Adequação ao leitor da Amazon.
3. Recomendações práticas de aprimoramento de estilo.
4. Veredito de Qualidade Editorial KDP.`;

      const res = await chamarGeminiTexto(promptCoesao, {
        temperature: 0.3,
        onStatusUpdate: (st) => setAiLoadingStatus(st)
      });

      setMessages([
        ...currentMsgs,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `✍️ **Relatório de Coesão & Fluidez Textual**\n\n${res.texto}`,
          suggestedActions: [
            { label: '📖 Ver Livro Diagramado', action: 'ir_diagramado', primary: true },
            { label: '🚀 Preparar para Publicação KDP', action: 'pedir_preparacao' },
            { label: '📥 Baixar PDF KDP Oficial', action: 'baixar_pdf' }
          ]
        }
      ]);
    } catch (e: any) {
      setMessages([
        ...currentMsgs,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ Houve uma falha ao analisar a coesão: ${e?.message || 'Erro inesperado'}.`
        }
      ]);
    } finally {
      setIsAiProcessing(false);
      setAiLoadingStatus('');
    }
  };

  // PREPARAÇÃO COMPLETA PARA PUBLICAÇÃO AMAZON KDP
  const executarPreparacaoKdp = async (currentMsgs: CoAuthorMessage[]) => {
    setAiLoadingStatus('CoAuthor está gerando metadados de vendas, palavras-chave e sinopse comercial KDP...');

    try {
      const promptKdp = `Você é o Estrategista de Lançamento na Amazon KDP do Book Engin.
Crie a estratégia completa de publicação para a obra:
Título: "${bookState?.titulo || 'Obra Editorial'}"
Subtítulo: "${bookState?.subtitulo || ''}"
Perfil: ${tipoLivro}
Capítulos: ${bookState?.capitulos?.length || 0}

Gere exatamente:
1. **Sinopse Comercial Amazon (HTML)**: Formatação profissional com <h3>, <b> e <ul> com gatilhos mentais para vendas.
2. **7 Palavras-Chave Oficiais KDP**: Frases exatas de busca de alto tráfego sem violar as políticas da Amazon.
3. **2 Categorias BISAC Ideais**: Para posicionamento de bestseller.
4. **Preço Sugerido e Formato Recomendado**.`;

      const res = await chamarGeminiTexto(promptKdp, {
        temperature: 0.5,
        onStatusUpdate: (st) => setAiLoadingStatus(st)
      });

      setMessages([
        ...currentMsgs,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🚀 **Preparação Completa para Publicação Amazon KDP**\n\n${res.texto}`,
          suggestedActions: [
            { label: '📥 Baixar PDF Diagramado KDP', action: 'baixar_pdf', primary: true },
            { label: '📖 Folhear Livro Diagramado', action: 'ir_diagramado' },
            { label: '📋 Ver Painel de Revisão', action: 'ir_revisao' }
          ]
        }
      ]);
    } catch (e: any) {
      setMessages([
        ...currentMsgs,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ Erro ao preparar metadados KDP: ${e?.message || 'Falha de comunicação'}.`
        }
      ]);
    } finally {
      setIsAiProcessing(false);
      setAiLoadingStatus('');
    }
  };

  // ORIENTAÇÃO E ACIONAMENTO DE DIAGRAMAÇÃO
  const executarOrientacaoDiagramacao = async (currentMsgs: CoAuthorMessage[]) => {
    setMessages([
      ...currentMsgs,
      {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `📖 **Diagramação Editorial do Livro**\n\nO manuscrito segue rigorosamente os padrões oficiais de diagramação da **Amazon KDP**:\n• Recuo de primeira linha nos parágrafos.\n• Texto justificado e sem quebras de palavras indevidas.\n• Sumário automático com paginação real.\n• Margens espelhadas com folga de lombada para encadernação.\n\nVocê pode visualizar e ler a obra diagramada na íntegra agora mesmo clicando no botão abaixo ou na aba **Livro Diagramado** no topo!`,
        suggestedActions: [
          { label: '📖 Abrir Livro Diagramado Agora', action: 'ir_diagramado', primary: true },
          { label: '📥 Baixar PDF Diagramado KDP', action: 'baixar_pdf' }
        ]
      }
    ]);
    setIsAiProcessing(false);
    setAiLoadingStatus('');
  };

  // Carrega exemplo pronto de forma conversacional
  const aplicarExemploPronto = async (idx: number) => {
    const ex = EXEMPLOS_PRONTOS[idx];
    if (!ex) return;

    setTipoLivro(ex.tipo);
    setUserInput(ex.promptInicial);
  };

  // Motor de Escrita de Capítulos
  const executarEscritaCapitulo = async (
    numCapitulo: number,
    briefing: { premissa: string; elementos: string; formula: string },
    instrucaoDoAutor?: string
  ) => {
    if (isAiProcessing) return;

    const totalCaps = totalCapsDesejado || 8;

    if (numCapitulo > totalCaps) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🎉 **Obra concluída com sucesso! Todos os ${totalCaps} capítulos foram escritos com desfecho definitivo.**

Agora você pode revisar todo o editorial da obra capítulo por capítulo, pedir para fazer a checagem de enredo e coesão, folhear o livro diagramado ou baixar o PDF oficial pronto para o Amazon KDP.`,
          suggestedActions: [
            { label: '🔍 Fazer Checagem de Enredo', action: 'pedir_enredo', primary: true },
            { label: '✍️ Fazer Checagem de Coesão', action: 'pedir_coesao' },
            { label: '📖 Folhear Livro Diagramado', action: 'ir_diagramado' },
            { label: '📥 Baixar PDF Diagramado KDP', action: 'baixar_pdf' }
          ]
        }
      ]);
      setAutoPilotActive(false);
      return;
    }

    setIsAiProcessing(true);
    setAiLoadingStatus(`Escrevendo Capítulo ${numCapitulo} de ${totalCaps} (${tipoLivro.toUpperCase()})...`);

    const livroAtual = bookState || {
      titulo: 'Livro KDP Bestseller',
      subtitulo: '',
      autor: autorAtual,
      genero: tipoLivro === 'tecnico' ? 'Técnico' : (tipoLivro === 'autoajuda' ? 'Autoajuda' : 'Geral'),
      idioma: idiomaAtual,
      tipoLivro,
      capitulos: [],
      meta: { palavrasPorCap: 900, paginasAlvo: paginasAlvo || 80 }
    };

    try {
      let plano = editorialPlan;
      if (!plano) {
        setAiLoadingStatus('Estruturando plano de capítulos com a inteligência editorial...');
        try {
          plano = await orchestrateEditorialPlan(
            {
              title: livroAtual.titulo,
              subtitle: livroAtual.subtitulo,
              genre: livroAtual.genero,
              language: livroAtual.idioma,
              topic: `${briefing.premissa} | Elementos: ${briefing.elementos}`,
              promise: briefing.formula,
              differentiator: `Padrão editorial Amazon KDP para ${tipoLivro}`
            },
            totalCaps
          );
          setEditorialPlan(plano);
        } catch {
          plano = buildFallbackEditorialPlan(
            {
              title: livroAtual.titulo,
              subtitle: livroAtual.subtitulo,
              genre: livroAtual.genero,
              language: livroAtual.idioma,
              topic: `${briefing.premissa} | Elementos: ${briefing.elementos}`,
              promise: briefing.formula
            },
            totalCaps
          );
          setEditorialPlan(plano);
        }
      }

      setAiLoadingStatus(`Redigindo texto completo do Capítulo ${numCapitulo}...`);

      const diretrizCap = plano.chapters[numCapitulo - 1] || {
        title: `Capítulo ${numCapitulo}`,
        objective: `Desenvolver os ensinamentos do capítulo ${numCapitulo}`,
        keyPoints: ['Apresentar conceito central', 'Passo a passo prático', 'Exemplo de aplicação'],
        transition: 'Conectar ao próximo tópico'
      };

      const historicoEnredo = livroAtual.capitulos.length > 0
        ? livroAtual.capitulos.map((c, idx) => {
            const inicio = c.texto.slice(0, 140);
            const fim = c.texto.slice(-160);
            return `• Cap. ${idx + 1} ("${c.titulo}"): ${inicio}... [Conclusão: ${fim}]`;
          }).join('\n')
        : 'Início da obra.';

      const ultimoCap = livroAtual.capitulos[livroAtual.capitulos.length - 1];
      const ganchoImediato = ultimoCap
        ? `O Capítulo anterior encerrou com este trecho exato:\n"${ultimoCap.texto.slice(-280)}"`
        : 'Abertura do livro.';

      const isFinal = numCapitulo === totalCaps;

      let diretrizEstiloPorTipo = '';
      if (tipoLivro === 'tecnico') {
        diretrizEstiloPorTipo = `ESTILO OBRIGATÓRIO: LIVRO TÉCNICO & RESOLUÇÃO DE PROBLEMAS
- NÃO É FICÇÃO: Zero personagens fictícios, zero diálogos inventados e zero drama emocional.
- DIDÁTICA PURA: Explique conceitos técnicos de forma clara, lógica e estruturada. Use passos numerados, boas práticas e solução de problemas concretos.
- FOCO PRÁTICO: O leitor comprou o livro para aprender a fazer e resolver problemas. Cada explicação deve ser aplicável.
- ZERO METÁFORAS: Linguagem 100% literal, técnica e objetiva.`;
      } else if (tipoLivro === 'autoajuda') {
        diretrizEstiloPorTipo = `ESTILO OBRIGATÓRIO: AUTOAJUDA & DESENVOLVIMENTO PESSOAL
- FOCO EM TRANSFORMAÇÃO PESSOAL: Linguagem encorajadora, empática e orientada para a ação real.
- EXERCÍCIOS E HÁBITOS: Aborde um obstáculo, apresente a solução e entregue passos aplicáveis nas próximas 24 horas.
- ZERO METÁFORAS PROLIXAS: Sem poesia vazia. Direto e pragmático.`;
      } else if (tipoLivro === 'pratico') {
        diretrizEstiloPorTipo = `ESTILO OBRIGATÓRIO: GUIA PRÁTICO PASSO A PASSO (HOW-TO)
- INSTRUÇÃO DIRETA: Etapas claras, passos numerados, advertências de erros comuns e dicas de execução.`;
      } else {
        diretrizEstiloPorTipo = `ESTILO OBRIGATÓRIO: FICÇÃO & NARRATIVA
- Personagens consistentes, enredo dinâmico, ganchos de retenção e clímax conclusivo.`;
      }

      const systemInstruction = `Você é o Co-Autor e escritor especialista na Amazon KDP do Book Engin.
${diretrizEstiloPorTipo}
1. VOCABULÁRIO POPULAR: Palavras acessíveis, claras e sem jargões desnecessários sem explicação.
2. FECHAMENTO SEM CORTES: O último parágrafo DEVE terminar com frase 100% completa terminando com ponto final (.).
3. ${isFinal
  ? 'ESTE É O CAPÍTULO FINAL DA OBRA. Entregue um desfecho completo e conclusão definitiva com ponto final.'
  : 'Conecte suavemente o final do capítulo ao próximo tópico para manter a retenção no Kindle.'}
4. Texto puro pronto para diagramação KDP.

FORMATO ESTRITO:
TITULO: Capítulo ${numCapitulo}: Título
TEXTO:
(Parágrafos separados por linha em branco)`;

      let prompt = `━━━ CONTEXTO DA OBRA (${tipoLivro.toUpperCase()}) ━━━
Obra: "${livroAtual.titulo}"
Tema Central: ${briefing.premissa}
Tópicos Inegociáveis: ${briefing.elementos}
Fórmula Editorial: ${briefing.formula}

━━━ DIRETRIZ DO CAPÍTULO ${numCapitulo} DE ${totalCaps} ━━━
Título Planejado: ${diretrizCap.title}
Objetivo: ${diretrizCap.objective}
Pontos-Chave: ${(diretrizCap.keyPoints || []).join('; ')}
Transição: ${diretrizCap.transition}

━━━ CONEXÃO COM O CAPÍTULO ANTERIOR ━━━
${ganchoImediato}

━━━ HISTÓRICO DE CAPÍTULOS JÁ ESCRITOS ━━━
${historicoEnredo}`;

      if (instrucaoDoAutor) {
        prompt += `\n\n━━━ INSTRUÇÃO ESPECÍFICA DO AUTOR PARA ESTE CAPÍTULO ━━━\n${instrucaoDoAutor}`;
      }

      const palavrasMeta = livroAtual.meta?.palavrasPorCap || 900;
      const maxTokens = Math.max(4000, Math.round(palavrasMeta * 4.2));

      setAiLoadingStatus(`Finalizando escrita do Capítulo ${numCapitulo}...`);

      const res = await chamarGeminiTexto(prompt, {
        temperature: tipoLivro === 'tecnico' ? 0.65 : 0.85,
        maxTokens,
        systemInstruction,
        onStatusUpdate: (st) => setAiLoadingStatus(st)
      });

      const mt = res.texto.match(/TITULO:\s*(.+)/i);
      const mx = res.texto.match(/TEXTO:\s*([\s\S]+)/i);
      let textoLimpo = mx ? mx[1].trim() : res.texto.trim();
      textoLimpo = textoLimpo
        .replace(/^TITLE:\s*.+$/im, '')
        .replace(/^TEXT:\s*/im, '')
        .replace(/^TITULO:\s*.+$/im, '')
        .replace(/^TEXTO:\s*/im, '')
        .trim();

      const sanitizado = ManuscriptIntegrityEngine.sanitizeChapterContent(textoLimpo);
      let finalTexto = sanitizado.cleanText;

      if (!/[.!?…"”»]$/.test(finalTexto)) {
        finalTexto += '.';
      }

      const rawTituloCap = mt ? mt[1].trim() : `Capítulo ${numCapitulo}`;
      const tituloCap = cleanChapterTitle(rawTituloCap);
      const novoCap = { titulo: tituloCap, texto: finalTexto };

      // Se for o Capítulo 1 e os capítulos anteriores pertencerem a outra obra, inicia o manuscrito limpo
      const capitulosBase = (numCapitulo === 1 && livroAtual.capitulos.length > 0 && cleanChapterTitle(livroAtual.capitulos[0].titulo) !== tituloCap)
        ? []
        : livroAtual.capitulos;

      const livroAtualizado = {
        ...livroAtual,
        capitulos: [...capitulosBase, novoCap]
      };

      onUpdateBookState(livroAtualizado);
      onSaveProgress(livroAtualizado);

      const palavras = finalTexto.split(/\s+/).filter(Boolean).length;
      const primeiroParagrafo = finalTexto.split(/\n+/)[0] || '';
      const ultimoParagrafo = finalTexto.slice(-220);

      const msgFeedback =
        tipoLivro === 'tecnico'
          ? 'O conteúdo técnico foi estruturado com didática clara, foco em resolução de problemas e vocabulário acessível KDP.'
          : tipoLivro === 'autoajuda'
          ? 'O capítulo foi estruturado com foco em transformação prática, passos de ação e clareza de desenvolvimento pessoal.'
          : tipoLivro === 'pratico'
          ? 'As instruções passo a passo foram desenvolvidas com máxima aplicabilidade e dicas práticas de execução.'
          : 'A narrativa foi desenvolvida com continuidade total, vocabulário popular e gancho de retenção KDP.';

      const msgCapituloConcluido: CoAuthorMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `✨ **Capítulo ${numCapitulo}: "${tituloCap}" concluído com sucesso!**

${msgFeedback}

O que achou deste capítulo? Deseja fazer algum ajuste ou prosseguir para o próximo?`,
        chapterPreview: {
          numero: numCapitulo,
          titulo: tituloCap,
          resumo: `${primeiroParagrafo.slice(0, 160)}...`,
          palavras,
          trechoFinal: ultimoParagrafo,
          textoCompleto: finalTexto
        },
        suggestedActions: numCapitulo < totalCaps
          ? [
              { label: `✍️ Escrever Capítulo ${numCapitulo + 1}`, action: 'proximo_cap', primary: true },
              { label: '⚡ Continuar no Piloto Automático', action: 'piloto_automatico' },
              { label: '🔍 Checagem de Enredo', action: 'pedir_enredo' },
              { label: '📖 Ver no Livro Diagramado', action: 'ir_diagramado' }
            ]
          : [
              { label: '🎉 Obra Concluída! Fazer Checagem de Enredo', action: 'pedir_enredo', primary: true },
              { label: '✍️ Fazer Checagem de Coesão', action: 'pedir_coesao' },
              { label: '📖 Ver Livro Diagramado', action: 'ir_diagramado' },
              { label: '📥 Baixar PDF Diagramado KDP', action: 'baixar_pdf' }
            ]
      };

      setMessages(prev => [...prev, msgCapituloConcluido]);

      if (autoPilotActive && !autoPilotStopRef.current && numCapitulo < totalCaps) {
        setAiLoadingStatus('Aguardando 1.2s para iniciar o próximo capítulo do Piloto Automático...');
        setTimeout(() => {
          if (!autoPilotStopRef.current) {
            executarEscritaCapitulo(numCapitulo + 1, briefing);
          }
        }, 1200);
      } else if (numCapitulo >= totalCaps) {
        setAutoPilotActive(false);
      }
    } catch (err: any) {
      console.error('Erro na escrita do capítulo:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ Houve uma oscilação na conexão com a inteligência editorial: ${err?.message || 'Erro temporário'}.`,
          suggestedActions: [
            { label: '🔄 Tentar Novamente', action: 'proximo_cap', primary: true }
          ]
        }
      ]);
      setAutoPilotActive(false);
    } finally {
      setIsAiProcessing(false);
      setAiLoadingStatus('');
    }
  };

  // Disparo de ações sugeridas
  const handleActionClick = async (action: string) => {
    if (action.startsWith('exemplo_')) {
      const idx = parseInt(action.replace('exemplo_', ''), 10);
      await aplicarExemploPronto(idx);
    } else if (action === 'iniciar_cap_1') {
      await executarEscritaCapitulo(1, respostasBriefing);
    } else if (action === 'proximo_cap') {
      const proximo = (bookState?.capitulos?.length || 0) + 1;
      await executarEscritaCapitulo(proximo, respostasBriefing);
    } else if (action === 'piloto_automatico') {
      autoPilotStopRef.current = false;
      setAutoPilotActive(true);
      const proximo = (bookState?.capitulos?.length || 0) + 1;
      await executarEscritaCapitulo(proximo, respostasBriefing);
    } else if (action === 'parar_piloto') {
      autoPilotStopRef.current = true;
      setAutoPilotActive(false);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'system',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: '⏹ Piloto automático pausado. Você pode continuar a escrita quando desejar.'
        }
      ]);
    } else if (action === 'ir_diagramado') {
      setInternalTab('diagramado');
    } else if (action === 'ir_revisao') {
      setInternalTab('revisao');
    } else if (action === 'acao_revisar_tudo_agora') {
      await handleExecuteFullBookReview();
    } else if (action === 'acao_enriquecer_profundo') {
      await handleExecuteDeepBookEnrichment();
    } else if (action === 'abrir_meus_livros') {
      await carregarLivrosProntos();
      setShowReadyBooksModal(true);
    } else if (action === 'acao_aplicar_tudo') {
      // Localiza o card de revisão mais recente ainda não aplicado
      const msgCard = [...messages].reverse().find(m => m.fullBookReviewCard && !m.fullBookReviewCard.applied);
      if (msgCard && msgCard.fullBookReviewCard) {
        await handleApplyFullEnrichment(msgCard.id, msgCard.fullBookReviewCard.chaptersEnrichment);
      }
    } else if (action === 'aprovar_sumario') {
      await handleAprovarSumario();
    } else if (action === 'regenerar_sumario') {
      await gerarEstruturaSumario(flowTitulo, flowSubtitulo, flowTema || respostasBriefing.premissa, tipoLivro);
    } else if (action === 'baixar_pdf') {
      await handleDownloadPdf();
    } else if (action === 'baixar_txt') {
      if (bookState?.capitulos) {
        const manuscrito = bookState.capitulos.map((c, i) => `=== CAPÍTULO ${i + 1}: ${c.titulo} ===\n\n${c.texto}`).join('\n\n\n');
        const blob = new Blob([manuscrito], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(bookState.titulo || 'Livro').replace(/\s+/g, '_')}_Manuscrito.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } else if (action === 'pedir_enredo') {
      await handleSendUserInput('Por favor, faça uma checagem completa do enredo e coerência da obra.');
    } else if (action === 'pedir_coesao') {
      await handleSendUserInput('Por favor, faça uma verificação da coesão do texto e fluidez entre os capítulos.');
    } else if (action === 'pedir_preparacao') {
      await handleSendUserInput('Prepare a obra para publicação na Amazon KDP com sinopse, palavras-chave e categorias.');
    } else if (action === 'pedir_mais_pratico') {
      setUserInput('Quero que o livro seja ainda mais prático e direto ao ponto, com passos numerados para resolver os problemas.');
    } else if (action === 'pedir_sumario') {
      setUserInput('Por favor, me mostre uma proposta detalhada de sumário com os títulos de cada capítulo antes de começarmos.');
    } else if (action === 'ajustar_briefing') {
      setUserInput('Gostei, mas quero fazer alguns ajustes na estrutura antes de começarmos.');
    }
  };

  // GERAÇÃO DIRETA DO PDF KDP EM 1 CLIQUE
  const handleDownloadPdf = async () => {
    if (!bookState || !bookState.capitulos || bookState.capitulos.length === 0) {
      alert('Escreva ao menos 1 capítulo para gerar e baixar o PDF oficial diagramado.');
      return;
    }

    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);

    try {
      const pdfResult = await buildKdpPdf({
        livro: {
          titulo: bookState.titulo || 'Livro KDP',
          subtitulo: bookState.subtitulo || '',
          autor: bookState.autor || autorAtual,
          idioma: bookState.idioma || idiomaAtual,
          capitulos: bookState.capitulos
        },
        capaDataUrl: capaDataUrl || undefined,
        formato: formato || '6x9',
        optSumario: true,
        tamCapitulo: 18,
        corCapitulo: '#0f172a'
      });

      const blob = new Blob([pdfResult.bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (bookState.titulo || 'Livro_KDP').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanTitle}_KDP_Diagramado.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setPdfSuccessMessage(`PDF Diagramado oficial KDP (${pdfResult.pageCount} páginas) baixado com sucesso!`);
    } catch (e: any) {
      console.error('Erro ao gerar PDF KDP:', e);
      alert(`Não foi possível gerar o PDF: ${e?.message || 'Erro inesperado'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const capsConcluidos = bookState?.capitulos?.length || 0;
  const totalCaps = customTotalCaps;
  const totalPalavras = (bookState?.capitulos || []).reduce((acc, c) => acc + c.texto.split(/\s+/).filter(Boolean).length, 0);
  const progressoPercent = Math.min(100, Math.round((capsConcluidos / totalCaps) * 100));

  const handleSaveEditedChapter = (idx: number) => {
    if (!bookState) return;
    const novosCaps = [...bookState.capitulos];
    novosCaps[idx] = {
      ...novosCaps[idx],
      texto: editedChapterText
    };
    const livroAtualizado = { ...bookState, capitulos: novosCaps };
    onUpdateBookState(livroAtualizado);
    onSaveProgress(livroAtualizado);
    setEditingChapterIdx(null);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        width: '100vw',
        height: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        boxSizing: 'border-box',
        color: '#0f172a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* ==================================================================== */}
      {/* 1. SIDEBAR LATERAL ESQUERDA: MENU EXECUTIVO PROFISSIONAL */}
      {/* ==================================================================== */}
      <aside
        style={{
          width: 275,
          minWidth: 275,
          maxWidth: 275,
          height: '100%',
          background: '#0b1329',
          borderRight: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          boxSizing: 'border-box',
          zIndex: 50,
          userSelect: 'none',
          padding: '16px 14px',
          overflowY: 'auto'
        }}
      >
        {/* TOPO: VOLTAR AO PAINEL */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: 16,
              transition: 'all 0.15s ease'
            }}
            title="Voltar ao painel geral da obra"
          >
            <ArrowLeft size={15} color="#94a3b8" />
            <span>Voltar ao Painel</span>
          </button>
        )}

        {/* IDENTIDADE DO ESTÚDIO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 3px 10px rgba(2, 132, 199, 0.35)',
              flexShrink: 0
            }}
          >
            <Sparkles size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                CoAuthor Studio
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  background: 'rgba(2, 132, 199, 0.25)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '1px 5px',
                  borderRadius: 4,
                  textTransform: 'uppercase'
                }}
              >
                PRO
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, whiteSpace: 'nowrap' }}>
              Gemini Neural Inteligente
            </div>
          </div>
        </div>

        {/* CARD DA OBRA ATIVA */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 9,
            padding: '10px 12px',
            marginBottom: 16
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
            Obra em Andamento
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: 6
            }}
            title={bookState?.titulo || 'Novo Livro'}
          >
            {bookState?.titulo || 'Novo Livro'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', marginBottom: 5 }}>
            <span>{capsConcluidos} de {totalCaps} caps</span>
            <span style={{ fontWeight: 700, color: '#38bdf8' }}>{progressoPercent}%</span>
          </div>
          <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressoPercent}%`,
                background: 'linear-gradient(90deg, #0284c7, #10b981)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* NAVEGAÇÃO: FLUXO EDITORIAL KDP (6 PASSOS SEQUENCIAIS) */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: '#38bdf8',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 8,
              padding: '0 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>📚 ESTEIRA EDITORIAL KDP</span>
            <span style={{ fontSize: 9.5, color: '#94a3b8', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>
              Passo {editorialStage}/6
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* ETAPA 1: TEMA & MERCADO (BSR & $ USD) */}
            <button
              type="button"
              onClick={() => {
                setActiveFlowStep(null);
                setInternalTab('chat');
                setEditorialStage(1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: internalTab === 'chat' && editorialStage === 1 ? '1px solid #38bdf8' : '1px solid transparent',
                background: internalTab === 'chat' && editorialStage === 1 ? 'rgba(2, 132, 199, 0.22)' : 'transparent',
                color: internalTab === 'chat' && editorialStage === 1 ? '#ffffff' : '#cbd5e1',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: internalTab === 'chat' && editorialStage === 1 ? '#0284c7' : (editorialStage > 1 ? '#059669' : 'rgba(255, 255, 255, 0.08)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0
                }}
              >
                {editorialStage > 1 ? '✓' : '1'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: internalTab === 'chat' && editorialStage === 1 ? 800 : 600 }}>
                  Tema & Mercado KDP
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  Filtro BSR & Faturamento USD
                </div>
              </div>
            </button>

            {/* ETAPA 2: TÍTULO COMERCIAL */}
            <button
              type="button"
              onClick={() => {
                setActiveFlowStep(null);
                setInternalTab('chat');
                setEditorialStage(2);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: internalTab === 'chat' && editorialStage === 2 ? '1px solid #38bdf8' : '1px solid transparent',
                background: internalTab === 'chat' && editorialStage === 2 ? 'rgba(2, 132, 199, 0.22)' : 'transparent',
                color: internalTab === 'chat' && editorialStage === 2 ? '#ffffff' : '#cbd5e1',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: internalTab === 'chat' && editorialStage === 2 ? '#0284c7' : (editorialStage > 2 ? '#059669' : 'rgba(255, 255, 255, 0.08)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0
                }}
              >
                {editorialStage > 2 ? '✓' : '2'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: internalTab === 'chat' && editorialStage === 2 ? 800 : 600 }}>
                  Título Comercial
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  {flowTitulo && flowTitulo !== 'Nova Obra KDP' ? flowTitulo.slice(0, 22) + '...' : 'Gatilho de Bestseller'}
                </div>
              </div>
            </button>

            {/* ETAPA 3: SUBTÍTULO KDP */}
            <button
              type="button"
              onClick={() => {
                setActiveFlowStep(null);
                setInternalTab('chat');
                setEditorialStage(3);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: internalTab === 'chat' && editorialStage === 3 ? '1px solid #38bdf8' : '1px solid transparent',
                background: internalTab === 'chat' && editorialStage === 3 ? 'rgba(2, 132, 199, 0.22)' : 'transparent',
                color: internalTab === 'chat' && editorialStage === 3 ? '#ffffff' : '#cbd5e1',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: internalTab === 'chat' && editorialStage === 3 ? '#0284c7' : (editorialStage > 3 ? '#059669' : 'rgba(255, 255, 255, 0.08)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0
                }}
              >
                {editorialStage > 3 ? '✓' : '3'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: internalTab === 'chat' && editorialStage === 3 ? 800 : 600 }}>
                  Subtítulo de Conversão
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  Promessa e quebra de objeção
                </div>
              </div>
            </button>

            {/* ETAPA 4: SUMÁRIO & CAPÍTULOS */}
            <button
              type="button"
              onClick={() => {
                setActiveFlowStep(null);
                setInternalTab('chat');
                setEditorialStage(4);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: internalTab === 'chat' && editorialStage === 4 ? '1px solid #38bdf8' : '1px solid transparent',
                background: internalTab === 'chat' && editorialStage === 4 ? 'rgba(2, 132, 199, 0.22)' : 'transparent',
                color: internalTab === 'chat' && editorialStage === 4 ? '#ffffff' : '#cbd5e1',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: internalTab === 'chat' && editorialStage === 4 ? '#0284c7' : (editorialStage > 4 ? '#059669' : 'rgba(255, 255, 255, 0.08)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0
                }}
              >
                {editorialStage > 4 ? '✓' : '4'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: internalTab === 'chat' && editorialStage === 4 ? 800 : 600 }}>
                  Sumário & Arquitetura
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  {customTotalCaps} capítulos planejados
                </div>
              </div>
            </button>

            {/* ETAPA 5: REDAÇÃO & CHAT IA */}
            <button
              type="button"
              onClick={() => {
                setActiveFlowStep(null);
                setInternalTab('chat');
                setEditorialStage(5);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: internalTab === 'chat' && editorialStage === 5 ? '1px solid #38bdf8' : '1px solid transparent',
                background: internalTab === 'chat' && editorialStage === 5 ? 'rgba(2, 132, 199, 0.22)' : 'transparent',
                color: internalTab === 'chat' && editorialStage === 5 ? '#ffffff' : '#cbd5e1',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: internalTab === 'chat' && editorialStage === 5 ? '#0284c7' : (editorialStage > 5 ? '#059669' : 'rgba(255, 255, 255, 0.08)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0
                }}
              >
                {editorialStage > 5 ? '✓' : '5'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: internalTab === 'chat' && editorialStage === 5 ? 800 : 600 }}>
                  Redação & Chat IA
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  {capsConcluidos} de {totalCaps} capítulos
                </div>
              </div>
            </button>

            {/* ETAPA 6: CAPA & CONCLUSÃO KDP */}
            <button
              type="button"
              onClick={() => {
                setActiveFlowStep(null);
                setInternalTab('chat');
                setEditorialStage(6);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: internalTab === 'chat' && editorialStage === 6 ? '1px solid #10b981' : '1px solid transparent',
                background: internalTab === 'chat' && editorialStage === 6 ? 'rgba(16, 185, 129, 0.22)' : 'transparent',
                color: internalTab === 'chat' && editorialStage === 6 ? '#ffffff' : '#cbd5e1',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: internalTab === 'chat' && editorialStage === 6 ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0
                }}
              >
                6
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: internalTab === 'chat' && editorialStage === 6 ? 800 : 600 }}>
                  Capa & Conclusão KDP
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  Arte 3D & Publicação
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO: FERRAMENTAS & AUDITORIA */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: '#10b981',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 8,
              padding: '0 6px'
            }}
          >
            <span>🛡️ FERRAMENTAS & AUDITORIA</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* LIVRO DIAGRAMADO */}
            <button
              type="button"
              onClick={() => {
                setActiveFlowStep(null);
                setInternalTab('diagramado');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: internalTab === 'diagramado' ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid transparent',
                background: internalTab === 'diagramado' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                color: internalTab === 'diagramado' ? '#ffffff' : '#cbd5e1',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: internalTab === 'diagramado' ? '#059669' : 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: internalTab === 'diagramado' ? '#ffffff' : '#94a3b8',
                  flexShrink: 0
                }}
              >
                <BookOpen size={14} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: internalTab === 'diagramado' ? 800 : 600 }}>
                  Livro Diagramado
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  Visualização real & leitura
                </div>
              </div>
            </button>

            {/* REVISÃO EDITORIAL */}
            <button
              type="button"
              onClick={() => {
                setActiveFlowStep(null);
                setInternalTab('revisao');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: internalTab === 'revisao' ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid transparent',
                background: internalTab === 'revisao' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                color: internalTab === 'revisao' ? '#ffffff' : '#cbd5e1',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: internalTab === 'revisao' ? '#059669' : 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: internalTab === 'revisao' ? '#ffffff' : '#94a3b8',
                  flexShrink: 0
                }}
              >
                <ClipboardCheck size={14} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5, fontWeight: internalTab === 'revisao' ? 800 : 600 }}>
                    Revisão Editorial
                  </span>
                  {capsConcluidos > 0 && (
                    <span style={{ background: '#10b981', color: '#fff', borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>
                      {capsConcluidos}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  Auditoria ortográfica & KDP
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* RODAPÉ DA SIDEBAR: VOZ NEURAL + BIBLIOTECA + AÇÕES RÁPIDAS */}
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid #1e293b',
            paddingTop: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          {/* TOGGLE DE VOZ FEMININA DO COAUTHOR */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CoAuthorVoiceToggle />
          </div>

          {/* BOTÃO MEUS LIVROS */}
          <button
            type="button"
            onClick={async () => {
              await carregarLivrosProntos();
              setShowReadyBooksModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Acessar base de livros já prontos ou em andamento"
          >
            <BookOpen size={14} color="#818cf8" />
            <span>Meus Livros ({readyBooksList.length})</span>
          </button>

          {/* BOTÃO NOVO LIVRO */}
          <button
            type="button"
            onClick={() => setShowNewBookConfirm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(2, 132, 199, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Começar um novo livro individualizado do zero"
          >
            <Sparkles size={14} color="#38bdf8" />
            <span>Novo Livro</span>
          </button>

          {/* BOTÃO DOWNLOAD RÁPIDO PDF KDP */}
          {capsConcluidos > 0 && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 8,
                background: isGeneratingPdf ? '#0369a1' : 'linear-gradient(135deg, #0284c7, #0369a1)',
                border: 'none',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              {isGeneratingPdf ? <BookEnginAnimatedBook size="micro" /> : <Download size={14} />}
              <span>{isGeneratingPdf ? 'Gerando...' : '📥 Baixar PDF KDP'}</span>
            </button>
          )}
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* 2. ÁREA PRINCIPAL DO ESTÚDIO (MAIN CONTENT) */}
      {/* ==================================================================== */}
      <main
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
          position: 'relative'
        }}
      >
        {/* BARRA DE PROGRESSO VISUAL NO TOPO */}
        <div style={{ flexShrink: 0, width: '100%', height: 3, background: '#e2e8f0' }}>
          <div
            style={{
              height: '100%',
              width: `${progressoPercent}%`,
              background: 'linear-gradient(90deg, #0284c7, #10b981)',
              transition: 'width 0.3s ease'
            }}
          />
        </div>

      {/* TOAST DE NOTIFICAÇÃO DE HUMANIZAÇÃO */}
      {humanizeSuccessToast && (
        <div
          style={{
            position: 'fixed',
            top: 85,
            right: 30,
            zIndex: 10005,
            background: '#065f46',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13.5,
            fontWeight: 700
          }}
        >
          <Sparkles size={18} />
          <span>{humanizeSuccessToast}</span>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE INICIAR NOVO LIVRO EM BRANCO */}
      {showNewBookConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10006,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              maxWidth: 520,
              width: '100%',
              padding: 24,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7'
                }}
              >
                <Sparkles size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  Iniciar Novo Livro em Branco
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  Criação 100% individualizada e limpa
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.6 }}>
              Deseja iniciar um <strong>novo livro individualizado</strong>? Isso criará um manuscrito novo em folha no seu perfil selecionado (<strong>{tipoLivro.toUpperCase()}</strong>), sem misturar com nenhum capítulo de obras anteriores.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowNewBookConfirm(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleStartNewBook()}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                }}
              >
                ✨ Sim, Iniciar Livro em Branco
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALERTA DE DIVERGÊNCIA DE GÊNERO / LIVRO ANTERIOR */}
      {genreMismatchModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10006,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              maxWidth: 560,
              width: '100%',
              padding: 24,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706'
                }}
              >
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  Atenção: Capítulos Anteriores Detectados
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  Evite misturar livros de gêneros diferentes na mesma obra
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.6 }}>
              Você selecionou o perfil <strong>{genreMismatchModal.newGenre.toUpperCase()}</strong>, mas a sua tela atual possui <strong>{genreMismatchModal.count} capítulo(s)</strong> escritos no perfil <strong>{genreMismatchModal.oldGenre.toUpperCase()}</strong>.
              <br /><br />
              Para que os livros não fiquem misturados (ex: capítulos de terror em um livro de autoajuda), recomendamos iniciar uma <strong>Nova Obra em Branco</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => handleStartNewBook(genreMismatchModal.newGenre)}
                style={{
                  padding: '11px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>✨ Iniciar Novo Livro de {genreMismatchModal.newGenre.toUpperCase()} (Recomendado)</span>
                <span>→</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoLivro(genreMismatchModal.newGenre);
                  setGenreMismatchModal(null);
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                Manter capítulos atuais e apenas alterar o rótulo do perfil
              </button>

              <button
                type="button"
                onClick={() => setGenreMismatchModal(null)}
                style={{
                  padding: '7px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Cancelar troca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BIBLIOTECA DE LIVROS JÁ ESCRITOS & EM ANDAMENTO */}
      {showReadyBooksModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10007,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 780,
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              overflow: 'hidden'
            }}
          >
            {/* TOPO DO MODAL */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: '#e0e7ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4f46e5'
                  }}
                >
                  <BookOpen size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                    📚 Meus Livros Escritos & Em Andamento
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                    Puxe qualquer livro da sua base para revisar de uma só vez, enriquecer ou continuar escrevendo
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={carregarLivrosProntos}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 7,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Atualizar lista"
                >
                  <RotateCw size={14} /> Atualizar
                </button>
                <button
                  type="button"
                  onClick={() => setShowReadyBooksModal(false)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* BARRA DE PESQUISA */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  value={bookSearchFilter}
                  onChange={(e) => setBookSearchFilter(e.target.value)}
                  placeholder="Buscar livro por título, subtítulo ou gênero..."
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 8,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <span style={{ fontSize: 13, color: '#64748b', alignSelf: 'center', fontWeight: 600 }}>
                {readyBooksList.filter(b => !bookSearchFilter.trim() || b.title.toLowerCase().includes(bookSearchFilter.toLowerCase())).length} obra(s)
              </span>
            </div>

            {/* LISTAGEM DOS LIVROS */}
            <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {readyBooksList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <BookOpen size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#334155' }}>
                    Nenhum livro salvo encontrado na base ainda
                  </h4>
                  <p style={{ margin: 0, fontSize: 13 }}>
                    Inicie uma nova obra em branco ou gere capítulos no estúdio para compor sua biblioteca.
                  </p>
                </div>
              ) : (
                readyBooksList
                  .filter(b => !bookSearchFilter.trim() || b.title.toLowerCase().includes(bookSearchFilter.toLowerCase()) || b.genre.toLowerCase().includes(bookSearchFilter.toLowerCase()))
                  .map(book => (
                    <div
                      key={book.id}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: 48,
                            height: 64,
                            borderRadius: 6,
                            background: '#0f172a',
                            color: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            padding: 4,
                            textAlign: 'center'
                          }}
                        >
                          <BookCheck size={20} color="#38bdf8" />
                          <span style={{ fontSize: 9, fontWeight: 800, marginTop: 4, color: '#94a3b8' }}>KDP</span>
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {book.title}
                          </h4>
                          {book.subtitle && (
                            <p style={{ margin: '0 0 6px', fontSize: 12.5, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {book.subtitle}
                            </p>
                          )}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1' }}>
                              {book.tipoLivro.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: '#475569' }}>
                              {book.capitulos.length} capítulos
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: '#475569' }}>
                              ~{book.totalWords.toLocaleString()} palavras
                            </span>
                            <span style={{ fontSize: 11, color: '#94a3b8', padding: '2px 4px' }}>
                              {book.source === 'final_book' ? '✓ Obra Concluída' : 'Projeto em Andamento'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* BOTÕES DE AÇÃO DO LIVRO */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectReadyBookInWorkspace(book);
                            handleExecuteFullBookReview(book);
                          }}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 8,
                            border: '1px solid #10b981',
                            background: '#f0fdf4',
                            color: '#059669',
                            fontSize: 12.5,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                          title="Revisar toda a obra de uma vez com o CoAuthor"
                        >
                          <BookCheck size={14} /> Revisar Obra
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectReadyBookInWorkspace(book)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                            color: '#ffffff',
                            fontSize: 12.5,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                          }}
                        >
                          <ArrowRight size={14} /> Carregar no CoAuthor
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* RODAPÉ DO MODAL */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Os livros selecionados são carregados na bancada com todos os capítulos prontos para edição.
              </span>
              <button
                type="button"
                onClick={() => setShowReadyBooksModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. CONTEÚDO PRINCIPAL (COM CONTENÇÃO TOTAL DE SCROLL) */}
      {/* ==================================================================== */}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODO 0: ARQUITETURA DA OBRA, SLIDER DE PALAVRAS & CAPA/SOBRECAPA */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {internalTab === 'arquitetura' && (
        <BookArchitecturePanel
          initialTitle={bookState?.titulo || flowTitulo}
          initialSubtitle={bookState?.subtitulo || flowSubtitulo}
          initialAuthor={bookState?.autor || autorAtual}
          initialGenre={bookState?.genero || generoAtual}
          initialBookType={tipoLivro}
          initialChaptersCount={customTotalCaps}
          initialWordsPerChapter={bookState?.meta?.palavrasPorCap || 1200}
          initialPremise={respostasBriefing.premissa || flowTema}
          initialSobrecapaTexto={bookState?.sobrecapaTexto || ''}
          initialFraseDestaque={bookState?.fraseDestaqueSobrecapa || ''}
          coverDataUrl={capaDataUrl}
          initialTheme={flowTema || respostasBriefing.tema || ''}
          initialSubtheme={respostasBriefing.subtema || ''}
          onApplyArchitecture={handleApplyArchitecture}
          onNavigateToChat={() => setInternalTab('chat')}
        />
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODO 1: CHAT COAUTHOR (CRIAÇÃO, DIÁLOGO & COAUTORIA) */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {internalTab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          
          {/* BARRA SUPERIOR FIXA: STEPPER EDITORIAL SEQUENCIAL RIGOROSO (PASSOS 1 A 6) */}
          <div
            style={{
              flexShrink: 0,
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              padding: '12px 24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Esteira Editorial Amazon KDP
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 12, background: '#e0f2fe', color: '#0284c7' }}>
                  Passo {editorialStage} de 6
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  • Só passa para o próximo passo quando o anterior for concluído • Controle total por voz ou clique
                </span>
              </div>

              <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                {flowTitulo ? (
                  <span>Obra: <strong style={{ color: '#0f172a' }}>{flowTitulo}</strong></span>
                ) : (
                  <span>Nova Obra KDP</span>
                )}
              </div>
            </div>

            {/* OS 6 PASSOS SEQUENCIAIS DA ESTEIRA */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 8
              }}
            >
              {[
                { step: 1, label: '1. Tema & Nicho', desc: flowTema ? '✓ Definido' : 'Em seleção' },
                { step: 2, label: '2. Título Comercial', desc: flowTitulo && flowTitulo !== 'Nova Obra KDP' ? '✓ Definido' : (editorialStage >= 2 ? 'Em seleção' : 'Bloqueado') },
                { step: 3, label: '3. Subtítulo KDP', desc: flowSubtitulo ? '✓ Definido' : (editorialStage >= 3 ? 'Em seleção' : 'Bloqueado') },
                { step: 4, label: '4. Sumário & Caps', desc: editorialStage > 4 ? '✓ Aprovado' : (editorialStage === 4 ? 'Aprovação' : 'Bloqueado') },
                { step: 5, label: '5. Redação Caps', desc: (bookState?.capitulos?.length || 0) > 0 ? `${bookState?.capitulos?.length || 0}/${customTotalCaps} caps` : (editorialStage === 5 ? 'Escrevendo' : 'Bloqueado') },
                { step: 6, label: '6. Capa & Conclusão', desc: editorialStage === 6 ? '✓ Obra Pronta' : 'Bloqueado' }
              ].map((st) => {
                const isCurrent = editorialStage === st.step;
                const isCompleted = editorialStage > st.step;
                const isLocked = editorialStage < st.step;

                return (
                  <div
                    key={st.step}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: isCurrent
                        ? '1.5px solid #0284c7'
                        : isCompleted
                        ? '1px solid #a7f3d0'
                        : '1px solid #e2e8f0',
                      background: isCurrent
                        ? '#f0f9ff'
                        : isCompleted
                        ? '#ecfdf5'
                        : '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      opacity: isLocked ? 0.6 : 1,
                      cursor: isCompleted ? 'pointer' : 'default',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => {
                      if (isCompleted) {
                        setEditorialStage(st.step as EditorialStage);
                      }
                    }}
                    title={isLocked ? 'Conclua a etapa anterior para desbloquear' : (isCompleted ? 'Clique para revisitar' : 'Etapa ativa')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: isCurrent ? '#0284c7' : isCompleted ? '#065f46' : '#64748b'
                        }}
                      >
                        {st.label}
                      </span>
                      {isCompleted ? (
                        <CheckCircle size={13} color="#059669" />
                      ) : isLocked ? (
                        <Lock size={12} color="#94a3b8" />
                      ) : (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7' }} />
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: isCurrent ? '#0369a1' : isCompleted ? '#047857' : '#94a3b8',
                        fontWeight: 600
                      }}
                    >
                      {st.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FEED DE MENSAGENS COM SCROLL ESTRITAMENTE INTERNO */}
          <div
            ref={chatScrollContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              padding: '24px 20px',
              background: '#f8fafc'
            }}
          >
            {/* CONTAINER CENTRALIZADO PARA EVITAR QUE O TEXTO FIQUE ESTICADO ATÉ AS BORDAS */}
            <div
              style={{
                maxWidth: 960,
                margin: '0 auto',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 20
              }}
            >
              {/* CARD ATIVO INTERATIVO: PASSO 1 - TEMA, MERCADO AMAZON KDP & FILTRO DE BSR */}
              {editorialStage === 1 && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #0284c7',
                    borderRadius: 14,
                    padding: 24,
                    boxShadow: '0 4px 20px rgba(2, 132, 199, 0.09)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20
                  }}
                >
                  {/* CABEÇALHO DO PASSO 1 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          boxShadow: '0 3px 8px rgba(2, 132, 199, 0.3)'
                        }}
                      >
                        <TrendingUp size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                            Passo 1: Tema & Análise de Mercado Amazon KDP
                          </h4>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              padding: '2px 8px',
                              borderRadius: 12
                            }}
                          >
                            💵 $ USD em Tempo Real
                          </span>
                        </div>
                        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
                          Escolha o nicho, filtre a faixa de BSR e veja as capas reais e estimativas de faturamento em dólares.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '6px 12px', borderRadius: 8 }}>
                      <DollarSign size={15} color="#0284c7" />
                      <span>Benchmark KDP: <strong>BSR &lt; 80k ≈ $500 USD/mês</strong> | <strong>20k a 30k ≈ $1.200 a $1.800 USD/mês</strong></span>
                    </div>
                  </div>

                  {/* BARRA DE CONFIGURAÇÃO DE BUSCA: TEMA + PRESETS DE BSR + REVIEWS */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14
                    }}
                  >
                    {/* CAMPO DE TEMA / NICHO */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        🎯 Tema ou Nicho de Livro para Pesquisar na Amazon:
                      </label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
                          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
                          <input
                            type="text"
                            value={marketThemeInput}
                            onChange={(e) => setMarketThemeInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                executeMarketAnalysis(marketThemeInput, marketMinBsr, marketMaxBsr, marketMinReviews);
                              }
                            }}
                            placeholder="Ex: Foco Profundo, Inteligência Artificial, Finanças Pessoais, Rotina Matinal..."
                            style={{
                              width: '100%',
                              padding: '9px 12px 9px 36px',
                              borderRadius: 8,
                              border: '1px solid #cbd5e1',
                              fontSize: 13,
                              color: '#0f172a',
                              outline: 'none',
                              background: '#ffffff'
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => executeMarketAnalysis(marketThemeInput, marketMinBsr, marketMaxBsr, marketMinReviews)}
                          disabled={isSearchingMarket}
                          style={{
                            padding: '9px 18px',
                            borderRadius: 8,
                            border: 'none',
                            background: isSearchingMarket ? '#0369a1' : 'linear-gradient(135deg, #0284c7, #0369a1)',
                            color: '#ffffff',
                            fontSize: 13,
                            fontWeight: 800,
                            cursor: isSearchingMarket ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                          }}
                        >
                          <RotateCw size={14} className={isSearchingMarket ? 'animate-spin' : ''} />
                          <span>{isSearchingMarket ? 'Pesquisando...' : '🔍 Buscar Livros na Amazon'}</span>
                        </button>
                      </div>

                      {/* CHIPS DE NICHOS RÁPIDOS */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Sugestões rápidas:</span>
                        {[
                          { label: '🧠 Foco & Hábitos', theme: 'Hábitos e Foco Profundo' },
                          { label: '💰 Finanças & Investimentos', theme: 'Finanças Pessoais e Liberdade Financeira' },
                          { label: '🤖 Inteligência Artificial', theme: 'Inteligência Artificial Prática' },
                          { label: '🧘 Saúde Mental & Ansiedade', theme: 'Ansiedade e Controle Emocional' },
                          { label: '🚀 Negócios & Vendas', theme: 'Vendas e Negociação' }
                        ].map((chip, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setMarketThemeInput(chip.theme);
                              executeMarketAnalysis(chip.theme, marketMinBsr, marketMaxBsr, marketMinReviews);
                            }}
                            style={{
                              padding: '3px 9px',
                              borderRadius: 6,
                              border: marketThemeInput === chip.theme ? '1px solid #0284c7' : '1px solid #e2e8f0',
                              background: marketThemeInput === chip.theme ? '#e0f2fe' : '#ffffff',
                              color: marketThemeInput === chip.theme ? '#0284c7' : '#475569',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SELETOR DE FAIXA DE BSR E REVIEWS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, paddingTop: 6, borderTop: '1px solid #e2e8f0' }}>
                      {/* PRESETS DE BSR */}
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                          <SlidersHorizontal size={13} color="#0284c7" />
                          <span>Seletor de Faixa de BSR (Best Sellers Rank):</span>
                        </label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setMarketPreset('80k');
                              setMarketMinBsr(1);
                              setMarketMaxBsr(80000);
                              executeMarketAnalysis(marketThemeInput, 1, 80000, marketMinReviews);
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: marketPreset === '80k' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                              background: marketPreset === '80k' ? '#e0f2fe' : '#ffffff',
                              color: marketPreset === '80k' ? '#0369a1' : '#475569'
                            }}
                            title="Livros com BSR abaixo de 80.000 (Média de $500 USD/mês)"
                          >
                            🚀 BSR &lt; 80k (~$500 USD/mês)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMarketPreset('20k-30k');
                              setMarketMinBsr(20000);
                              setMarketMaxBsr(30000);
                              executeMarketAnalysis(marketThemeInput, 20000, 30000, marketMinReviews);
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: marketPreset === '20k-30k' ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                              background: marketPreset === '20k-30k' ? '#ecfdf5' : '#ffffff',
                              color: marketPreset === '20k-30k' ? '#047857' : '#475569'
                            }}
                            title="Faixa de 20.000 a 30.000 BSR (Média de $1.200 a $1.800 USD/mês)"
                          >
                            🔥 20k a 30k (~$1.400 USD/mês)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMarketPreset('elite');
                              setMarketMinBsr(1);
                              setMarketMaxBsr(20000);
                              executeMarketAnalysis(marketThemeInput, 1, 20000, marketMinReviews);
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: marketPreset === 'elite' ? '1.5px solid #8b5cf6' : '1px solid #cbd5e1',
                              background: marketPreset === 'elite' ? '#f5f3ff' : '#ffffff',
                              color: marketPreset === 'elite' ? '#6d28d9' : '#475569'
                            }}
                            title="Top Bestsellers Absolutos da Amazon (BSR abaixo de 20.000)"
                          >
                            ⭐ Top &lt; 20k BSR
                          </button>
                          <button
                            type="button"
                            onClick={() => setMarketPreset('custom')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: marketPreset === 'custom' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                              background: marketPreset === 'custom' ? '#f0f9ff' : '#ffffff',
                              color: marketPreset === 'custom' ? '#0284c7' : '#475569'
                            }}
                          >
                            ⚙️ Personalizado
                          </button>
                        </div>

                        {/* INPUTS DE BSR MÍNIMO E MÁXIMO */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 10, color: '#64748b' }}>BSR Mínimo:</span>
                            <input
                              type="number"
                              min={1}
                              value={marketMinBsr}
                              onChange={(e) => {
                                setMarketMinBsr(Number(e.target.value) || 1);
                                setMarketPreset('custom');
                              }}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#0f172a'
                              }}
                            />
                          </div>
                          <span style={{ color: '#94a3b8', marginTop: 14 }}>até</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 10, color: '#64748b' }}>BSR Máximo:</span>
                            <input
                              type="number"
                              min={100}
                              value={marketMaxBsr}
                              onChange={(e) => {
                                setMarketMaxBsr(Number(e.target.value) || 80000);
                                setMarketPreset('custom');
                              }}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#0f172a'
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* FILTRO DE REVIEWS POSITIVOS */}
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                          <Star size={13} color="#f59e0b" />
                          <span>Filtro de Avaliações Positivas (Mínimo 20):</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 12px' }}>
                          <span style={{ fontSize: 12, color: '#475569' }}>Mínimo de Reviews:</span>
                          <input
                            type="number"
                            min={20}
                            value={marketMinReviews}
                            onChange={(e) => setMarketMinReviews(Math.max(20, Number(e.target.value) || 20))}
                            style={{
                              width: 70,
                              padding: '4px 6px',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#0f172a',
                              textAlign: 'center'
                            }}
                          />
                          <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                            ✓ Exclusivo livros com &ge; 20 avaliações positivas (4.0+)
                          </span>
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b' }}>
                          Garante que o nicho analisado tem demanda real comprovada e aprovação do público leitor.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* BANNER DE KPIS ESTIMADOS EM DÓLARES (USD) */}
                  {marketData && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12
                      }}
                    >
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #065f46, #047857)',
                          color: '#ffffff',
                          padding: '14px 16px',
                          borderRadius: 10,
                          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
                        }}
                      >
                        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                          💰 Faturamento Estimado Médio
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>
                          ${marketData.metrics.averageRevenueUsd.toLocaleString()} USD<span style={{ fontSize: 13, fontWeight: 600 }}>/mês</span>
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                          ≈ R$ {(marketData.metrics.averageRevenueUsd * 5.6).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/mês na cotação atual
                        </div>
                      </div>

                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          padding: '14px 16px',
                          borderRadius: 10
                        }}
                      >
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                          📦 Vendas Estimadas do Nicho
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
                          ~{marketData.metrics.averageMonthlySales.toLocaleString()} livros<span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>/mês</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, marginTop: 2 }}>
                          Média de {Math.round(marketData.metrics.averageMonthlySales / 30)} exemplares vendidos por dia
                        </div>
                      </div>

                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          padding: '14px 16px',
                          borderRadius: 10
                        }}
                      >
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                          🏆 BSR Médio dos Concorrentes
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#0284c7', marginTop: 4 }}>
                          #{marketData.metrics.averageBsr.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          Faixa filtrada: #{marketData.metrics.bsrRange.min.toLocaleString()} a #{marketData.metrics.bsrRange.max.toLocaleString()}
                        </div>
                      </div>

                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          padding: '14px 16px',
                          borderRadius: 10
                        }}
                      >
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                          ⭐ Avaliação Média do Público
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#d97706', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>{marketData.metrics.averageRating.toFixed(1)}</span>
                          <span style={{ fontSize: 16 }}>★</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 2 }}>
                          {marketData.books.length} livros auditados com &ge; 20 reviews
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SHOWCASE DOS LIVROS BENCHMARK COM CAPAS REAIS */}
                  {marketData && marketData.books && marketData.books.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <BookOpen size={16} color="#0284c7" />
                          <span>Livros Benchmark Encontrados na Amazon ({marketData.books.length} livros na faixa de BSR):</span>
                        </div>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          Capas reais, faturamento estimado e volume de reviews
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                          gap: 14
                        }}
                      >
                        {marketData.books.map((book) => (
                          <div
                            key={book.id}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: 10,
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 6px 16px rgba(2, 132, 199, 0.15)';
                              e.currentTarget.style.borderColor = '#0284c7';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                          >
                            {/* IMAGEM DA CAPA */}
                            <div
                              style={{
                                width: '100%',
                                height: 210,
                                background: '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              {book.coverUrl ? (
                                <img
                                  src={book.coverUrl}
                                  alt={book.title}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : null}

                              {/* BADGE DE FATURAMENTO USD NA CAPA */}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  background: 'rgba(6, 95, 70, 0.95)',
                                  color: '#ffffff',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  backdropFilter: 'blur(4px)',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                }}
                              >
                                ~${book.estimatedMonthlyRevenueUsd} USD/mês
                              </div>

                              {/* BADGE DE BSR */}
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: 8,
                                  left: 8,
                                  background: 'rgba(15, 23, 42, 0.9)',
                                  color: '#38bdf8',
                                  padding: '3px 7px',
                                  borderRadius: 5,
                                  fontSize: 10,
                                  fontWeight: 800
                                }}
                              >
                                #{book.bsr.toLocaleString()} BSR
                              </div>
                            </div>

                            {/* DETALHES DO LIVRO */}
                            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', flex: 1, gap: 4 }}>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: '#0f172a',
                                  lineHeight: 1.3,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}
                                title={book.title}
                              >
                                {book.title}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                por {book.author}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#d97706', fontWeight: 700 }}>
                                  <span>{book.rating.toFixed(1)}</span>
                                  <span>★</span>
                                  <span style={{ color: '#64748b', fontWeight: 500 }}>({book.reviewsCount.toLocaleString()})</span>
                                </div>
                                <div style={{ color: '#059669', fontWeight: 700 }}>
                                  ~{book.estimatedMonthlySales} vendas/mês
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectTema(book.title, 'autoajuda');
                                  handleSelectTitulo(book.title);
                                }}
                                style={{
                                  marginTop: 8,
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #bae6fd',
                                  background: '#f0f9ff',
                                  color: '#0284c7',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 4
                                }}
                              >
                                <span>Modelar Este Livro</span>
                                <ArrowRight size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUGESTÕES DE TÍTULOS E SUBTÍTULOS DERIVADOS DOS LIVROS ENCONTRADOS */}
                  {marketData && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                      {/* 1. TÍTULOS PARECIDOS / INSPIRADOS */}
                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: 10,
                          padding: 16,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Award size={16} color="#0284c7" />
                            <span>5 Títulos Magnéticos Inspirados no Mercado:</span>
                          </div>
                          <span style={{ fontSize: 10.5, color: '#059669', fontWeight: 700, background: '#ecfdf5', padding: '1px 6px', borderRadius: 4 }}>
                            Padrão Bestseller
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(marketData.suggestedTitles && marketData.suggestedTitles.length > 0 ? marketData.suggestedTitles : suggestedTitlesAmazon).map((sug, idx) => (
                            <div
                              key={idx}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                                  {idx + 1}. {sug.title}
                                </div>
                                <div style={{ fontSize: 11, color: '#059669', marginTop: 2, fontStyle: 'italic' }}>
                                  💡 {sug.rationale}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectTema(marketThemeInput, 'autoajuda');
                                  handleSelectTitulo(sug.title);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  background: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: 11.5,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                              >
                                Escolher Título →
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 2. SUBTÍTULOS DE CONVERSÃO PRÓXIMOS */}
                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: 10,
                          padding: 16,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Lightbulb size={16} color="#059669" />
                            <span>5 Subtítulos de Alta Conversão Sugeridos:</span>
                          </div>
                          <span style={{ fontSize: 10.5, color: '#0284c7', fontWeight: 700, background: '#e0f2fe', padding: '1px 6px', borderRadius: 4 }}>
                            Promessa Clara
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(marketData.suggestedSubtitles && marketData.suggestedSubtitles.length > 0 ? marketData.suggestedSubtitles : suggestedSubtitlesAmazon).map((sug, idx) => (
                            <div
                              key={idx}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>
                                  {idx + 1}. {sug.subtitle}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>
                                  🎯 {sug.rationale}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectSubtitulo(sug.subtitle);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  background: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: 11.5,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                              >
                                Usar Subtítulo
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SELEÇÃO POR NICHOS PRONTOS CLÁSSICOS (COMPLEMENTAR) */}
                  <div style={{ paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                      Ou selecione diretamente um dos 4 nichos recomendados de alta demanda KDP:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                      {TEMAS_AMAZON_KDP.map((tema) => (
                        <div
                          key={tema.id}
                          onClick={() => {
                            setMarketThemeInput(tema.descricao);
                            handleSelectTema(tema.descricao, tema.perfil);
                          }}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#0284c7';
                            e.currentTarget.style.background = '#f0f9ff';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.background = '#f8fafc';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '1px 6px', borderRadius: 4 }}>
                              {tema.badge}
                            </span>
                            <span style={{ fontSize: 10, color: '#64748b' }}>{tema.nicho}</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                            {tema.titulo}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.35 }}>
                            {tema.descricao}
                          </div>
                          <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, color: '#0284c7', fontSize: 11.5, fontWeight: 700 }}>
                            <span>Avançar com este nicho</span> <ArrowRight size={12} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CARD ATIVO: PASSO 2 (TÍTULO COMERCIAL AMAZON KDP) */}
              {editorialStage === 2 && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #0284c7',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                        <Award size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                          Passo 2: Escolha o Título Comercial Bestseller (Amazon KDP)
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                          Tema ativo: <strong>{flowTema || 'Tema selecionado'}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => gerarSugestoesTitulosAmazon(flowTema || 'desenvolvimento pessoal', tipoLivro)}
                      disabled={isLoadingAmazonSuggestions}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 7,
                        border: '1px solid #bae6fd',
                        background: '#f0f9ff',
                        color: '#0284c7',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isLoadingAmazonSuggestions ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <RotateCw size={13} className={isLoadingAmazonSuggestions ? 'animate-spin' : ''} />
                      <span>{isLoadingAmazonSuggestions ? 'Buscando...' : 'Gerar outros títulos'}</span>
                    </button>
                  </div>

                  {isLoadingAmazonSuggestions ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                      <BookEnginAnimatedBook size="sm" />
                      <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600 }}>
                        Pesquisando títulos de alta conversão na Amazon KDP...
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                      {(suggestedTitlesAmazon.length > 0 ? suggestedTitlesAmazon : [
                        { title: `O Poder de ${flowTema ? flowTema.slice(0, 30) : 'Foco & Rotina'}`, rationale: 'Alta taxa de conversão em buscas da Amazon' },
                        { title: 'Inabalável: O Método Definitivo', rationale: 'Gatilho de autoridade e segurança' },
                        { title: 'Do Caos à Maestria Diária', rationale: 'Promessa de transformação imediata' },
                        { title: 'A Arte da Execução Implacável', rationale: 'Forte apelo comercial e foco em ação' },
                        { title: 'Manual Prático de Alta Performance', rationale: 'Direto, pragmático e sem enrolação' }
                      ]).map((sug, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectTitulo(sug.title)}
                          style={{
                            padding: '12px 16px',
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#0284c7';
                            e.currentTarget.style.background = '#f0f9ff';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.background = '#f8fafc';
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                              {idx + 1}. {sug.title}
                            </div>
                            <div style={{ fontSize: 12, color: '#059669', marginTop: 2, fontStyle: 'italic' }}>
                              💡 {sug.rationale}
                            </div>
                          </div>
                          <button
                            type="button"
                            style={{
                              padding: '6px 14px',
                              borderRadius: 6,
                              background: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            Escolher Título →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CARD ATIVO: PASSO 3 (SUBTÍTULO DE CONVERSÃO AMAZON KDP) */}
              {editorialStage === 3 && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #0284c7',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                        <FileCheck size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                          Passo 3: Escolha o Subtítulo de Conversão (Amazon KDP)
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                          Título ativo: <strong>{flowTitulo}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => gerarSugestoesSubtitulosAmazon(flowTitulo, flowTema || 'desenvolvimento pessoal', tipoLivro)}
                      disabled={isLoadingAmazonSuggestions}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 7,
                        border: '1px solid #bae6fd',
                        background: '#f0f9ff',
                        color: '#0284c7',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isLoadingAmazonSuggestions ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <RotateCw size={13} className={isLoadingAmazonSuggestions ? 'animate-spin' : ''} />
                      <span>{isLoadingAmazonSuggestions ? 'Buscando...' : 'Gerar outros subtítulos'}</span>
                    </button>
                  </div>

                  {isLoadingAmazonSuggestions ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                      <BookEnginAnimatedBook size="sm" />
                      <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600 }}>
                        Criando propostas de subtítulos de alta conversão...
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                      {(suggestedSubtitlesAmazon.length > 0 ? suggestedSubtitlesAmazon : [
                        { subtitle: 'Como Vencer a Procrastinação e Ter 4 Horas de Foco Sem Ansiedade', rationale: 'Promessa direta com quebra de objeção' },
                        { subtitle: 'O Passo a Passo Prático Para Dominar Hábitos e Conquistar Resultados Reais', rationale: 'Estrutura pragmática de guia de ação' },
                        { subtitle: 'O Guia Definitivo Para Transformar Sua Rotina e Destravar Alta Produtividade', rationale: 'Foco em resolução de problema' },
                        { subtitle: 'Estratégias Reais Testadas no Campo de Batalha Para Blindar Sua Mente', rationale: 'Autoridade e aplicabilidade' },
                        { subtitle: 'Um Método Simples e Eficaz Para Mudar de Vida em Menos de 30 Dias', rationale: 'Especificidade temporal e baixo atrito' }
                      ]).map((sug, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectSubtitulo(sug.subtitle)}
                          style={{
                            padding: '12px 16px',
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#0284c7';
                            e.currentTarget.style.background = '#f0f9ff';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.background = '#f8fafc';
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                              {idx + 1}. {sug.subtitle}
                            </div>
                            <div style={{ fontSize: 12, color: '#059669', marginTop: 2, fontStyle: 'italic' }}>
                              💡 {sug.rationale}
                            </div>
                          </div>
                          <button
                            type="button"
                            style={{
                              padding: '6px 14px',
                              borderRadius: 6,
                              background: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            Escolher Subtítulo →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CARD ATIVO: PASSO 4 (SUMÁRIO E CAPÍTULOS ESTRUTURADOS) */}
              {editorialStage === 4 && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #0284c7',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                        <Layers size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                          Passo 4: Sumário e Estrutura dos Capítulos
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                          Obra: <strong>{flowTitulo}</strong> {flowSubtitulo ? `— ${flowSubtitulo}` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAprovarSumario}
                      disabled={isAiProcessing}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 13.5,
                        fontWeight: 800,
                        cursor: isAiProcessing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>✅ Aprovar Sumário e Iniciar Capítulo 1</span>
                    </button>
                  </div>

                  <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}>
                    Revise os capítulos planejados para a sua obra. Você pode aprovar por voz dizendo <strong>"Aprovar sumário"</strong> ou <strong>"Pode começar"</strong>:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                    {(editorialPlan?.chapters || [
                      { title: 'A Crise da Atenção Moderna', objective: 'Compreender o cenário atual de dispersão' },
                      { title: 'A Biologia da Distração', objective: 'Descobrir por que o cérebro busca dopamina rápida' },
                      { title: 'O Método dos Blocos de Foco', objective: 'Como estruturar sprints inabaláveis de trabalho' },
                      { title: 'Eliminando Vazamentos Invisíveis', objective: 'Faxina digital prática e sem notificações' },
                      { title: 'Rotinas Matinais de Alto Impacto', objective: 'Construir as primeiras 2 horas perfeitas do dia' },
                      { title: 'Energia Vital e Resistência ao Cansaço', objective: 'Sono, hidratação e pausas estratégicas' },
                      { title: 'Superando Recaídas e Procrastinação', objective: 'Plano de emergência para dias caóticos' },
                      { title: 'A Vida com Foco Inabalável', objective: 'Consolidação e conclusão do método' }
                    ]).map((ch, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 900, color: '#0284c7', background: '#e0f2fe', width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                            {cleanChapterTitle(ch.title)}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                          {ch.objective}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CARD ATIVO: PASSO 5 (REDAÇÃO DOS CAPÍTULOS COM APROVAÇÃO RÍGIDA) */}
              {editorialStage === 5 && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #10b981',
                    borderRadius: 12,
                    padding: 18,
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: '#065f46' }}>
                          Passo 5: Redação Guiada ({capsConcluidos} de {customTotalCaps} capítulos escritos)
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b' }}>
                          Fluxo rígido: o CoAuthor só passa para o próximo capítulo após sua aprovação explícita (por voz ou clique).
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={handleAprovarCapituloEAvancar}
                        disabled={isAiProcessing}
                        style={{
                          padding: '9px 18px',
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: isAiProcessing ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                        }}
                      >
                        <CheckCircle2 size={15} />
                        <span>{capsConcluidos >= customTotalCaps ? '🎉 Concluir Obra' : `✅ Aprovar e Escrever Capítulo ${capsConcluidos + 1}`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD ATIVO: PASSO 6 (CAPA OFICIAL KDP & OBRA CONCLUÍDA) */}
              {editorialStage === 6 && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '2px solid #059669',
                    borderRadius: 14,
                    padding: 24,
                    boxShadow: '0 8px 24px rgba(5, 150, 105, 0.12)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                      <Award size={26} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#065f46' }}>
                        🎉 Passo 6: Obra Concluída & Capa Oficial KDP Pronta!
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                        Todos os capítulos foram escritos, revisados e aprovados no padrão oficial da Amazon KDP.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 18 }}>
                    {capaDataUrl ? (
                      <img
                        src={capaDataUrl}
                        alt="Capa Oficial KDP"
                        style={{ width: 100, height: 150, objectFit: 'cover', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                      />
                    ) : (
                      <div style={{ width: 100, height: 150, background: '#0f172a', color: '#38bdf8', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 8, textAlign: 'center' }}>
                        <BookCheck size={28} />
                        <span style={{ fontSize: 11, fontWeight: 800, marginTop: 8 }}>CAPA KDP 6x9</span>
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 240 }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 900, color: '#0f172a' }}>
                        {bookState?.titulo || flowTitulo}
                      </h4>
                      <p style={{ margin: '0 0 10px', fontSize: 13.5, color: '#64748b' }}>
                        {bookState?.subtitulo || flowSubtitulo}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#ecfdf5', color: '#065f46' }}>
                          ✓ {capsConcluidos} capítulos aprovados
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#e0f2fe', color: '#0369a1' }}>
                          ~{totalPalavras.toLocaleString()} palavras
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#f1f5f9', color: '#475569' }}>
                          ~{Math.max(24, Math.ceil((totalPalavras || 1) / 250))} páginas (Formato 6x9)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                      }}
                    >
                      {isGeneratingPdf ? <BookEnginAnimatedBook size="micro" /> : <Download size={17} />}
                      <span>{isGeneratingPdf ? 'Gerando Diagramação KDP...' : '📥 Baixar PDF Diagramado Oficial KDP'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleActionClick('baixar_txt')}
                      style={{
                        padding: '12px 20px',
                        borderRadius: 8,
                        background: '#ffffff',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        fontSize: 13.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7
                      }}
                    >
                      <FileText size={16} /> Baixar Manuscrito TXT
                    </button>

                    <button
                      type="button"
                      onClick={() => setInternalTab('diagramado')}
                      style={{
                        padding: '12px 20px',
                        borderRadius: 8,
                        background: '#f8fafc',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                        fontSize: 13.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7
                      }}
                    >
                      <BookOpen size={16} /> Folhear Livro Diagramado
                    </button>
                  </div>
                </div>
              )}
              {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                <div
                  style={{
                    maxWidth: msg.sender === 'user' ? '78%' : '88%',
                    background: msg.sender === 'user'
                      ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                      : msg.sender === 'system'
                      ? '#ffffff'
                      : '#ffffff',
                    color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                    padding: '18px 22px',
                    borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                    fontSize: 15,
                    lineHeight: 1.68,
                    wordBreak: 'break-word'
                  }}
                >
                  {/* CABEÇALHO DO BALÃO */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      marginBottom: 10,
                      fontSize: 12,
                      fontWeight: 800,
                      color: msg.sender === 'user' ? '#bae6fd' : '#64748b'
                    }}
                  >
                    {msg.sender === 'agent' && <Bot size={16} color="#0284c7" />}
                    <span>
                      {msg.sender === 'agent'
                        ? 'CoAuthor AI'
                        : msg.sender === 'user'
                        ? 'Você (Autor)'
                        : 'Sistema Editorial'}
                    </span>
                    <span>• {msg.timestamp}</span>
                    {msg.sender === 'agent' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (currentlySpeakingId === msg.id) {
                            coAuthorVoiceService.stop();
                          } else {
                            coAuthorVoiceService.speak(msg.text, msg.id, { forcePlay: true });
                          }
                        }}
                        style={{
                          background: currentlySpeakingId === msg.id ? '#fdf2f8' : '#f1f5f9',
                          border: currentlySpeakingId === msg.id ? '1px solid #fbcfe8' : '1px solid #cbd5e1',
                          color: currentlySpeakingId === msg.id ? '#db2777' : '#475569',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          marginLeft: 8,
                          transition: 'all 0.15s ease'
                        }}
                        title={currentlySpeakingId === msg.id ? 'Parar leitura de voz' : 'Ouvir resposta com a voz feminina do CoAuthor'}
                      >
                        {currentlySpeakingId === msg.id ? (
                          <>
                            <VolumeX size={13} color="#db2777" />
                            <span>Parar</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={13} color="#475569" />
                            <span>Ouvir</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* CONTEÚDO FORMATADO COM FONTES GRANDES E NÍTIDAS */}
                  <div>{renderRichText(msg.text)}</div>

                  {/* CARD DE ALINHAMENTO CONCLUÍDO (SE GERADO PELO GEMINI) */}
                  {msg.alignmentCard && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: 18,
                        background: '#f0fdf4',
                        border: '1.5px solid #10b981',
                        borderRadius: 10,
                        color: '#0f172a'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <CheckCircle2 size={20} color="#059669" />
                        <strong style={{ fontSize: 14.5, color: '#065f46' }}>
                          Estrutura Editorial Aprovada e Pronta para Escrita!
                        </strong>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13.5 }}>
                        <div><strong>Título:</strong> {msg.alignmentCard.titulo}</div>
                        {msg.alignmentCard.subtitulo && (
                          <div><strong>Subtítulo:</strong> {msg.alignmentCard.subtitulo}</div>
                        )}
                        <div><strong>Perfil:</strong> {msg.alignmentCard.tipo.toUpperCase()}</div>
                        <div><strong>Tema:</strong> {msg.alignmentCard.premissa}</div>
                        <div><strong>Capítulos Planejados:</strong> {msg.alignmentCard.totalCaps} capítulos</div>
                      </div>

                      <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => handleActionClick('iniciar_cap_1')}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '10px 18px',
                            borderRadius: 7,
                            fontSize: 13.5,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          ✍️ Iniciar Produção do Capítulo 1
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PRÉVIA DO CAPÍTULO CONCLUÍDO */}
                  {msg.chapterPreview && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 16,
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 10,
                        color: '#0f172a'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8
                        }}
                      >
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0284c7' }}>
                          Capítulo {msg.chapterPreview.numero}: {cleanChapterTitle(msg.chapterPreview.titulo)}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {/* BOTÃO DE HUMANIZAÇÃO ANTI-CLICHÊ */}
                          <button
                            type="button"
                            onClick={() => handleHumanizeChapter(msg.chapterPreview!.numero - 1)}
                            disabled={isHumanizingChapter === (msg.chapterPreview.numero - 1) || isAiProcessing}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '5px 11px',
                              background: '#f0fdf4',
                              border: '1px solid #86efac',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: (isHumanizingChapter === (msg.chapterPreview.numero - 1) || isAiProcessing) ? 'not-allowed' : 'pointer',
                              color: '#166534'
                            }}
                            title="Humaniza o texto removendo clichês de IA e aplicando técnicas de escrita autêntica de bestseller"
                          >
                            <Sparkles size={13} color="#16a34a" />
                            {isHumanizingChapter === (msg.chapterPreview.numero - 1) ? 'Humanizando...' : '✨ Humanizar (Anti-IA)'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (msg.chapterPreview?.textoCompleto) {
                                navigator.clipboard.writeText(msg.chapterPreview.textoCompleto);
                                setIsCopiedChapter(msg.chapterPreview.numero);
                                setTimeout(() => setIsCopiedChapter(null), 2000);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '5px 12px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              color: '#475569'
                            }}
                          >
                            {isCopiedChapter === msg.chapterPreview.numero ? (
                              <>
                                <Check size={14} color="#059669" /> Copiado!
                              </>
                            ) : (
                              <>
                                <Copy size={14} /> Copiar Capítulo
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <p style={{ margin: '0 0 10px', fontSize: 13.5, color: '#475569', fontStyle: 'italic', lineHeight: 1.6 }}>
                        "{msg.chapterPreview.resumo}"
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: '#059669',
                          background: '#ecfdf5',
                          padding: '7px 12px',
                          borderRadius: 6,
                          border: '1px solid #a7f3d0'
                        }}
                      >
                        <span>✓ Manuscrito Oficial KDP ({msg.chapterPreview.palavras} palavras)</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReaderChapter(msg.chapterPreview!.numero - 1);
                            setInternalTab('diagramado');
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#059669',
                            fontWeight: 800,
                            fontSize: 12.5,
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Ler no Livro Diagramado →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CARD DE REVISÃO GLOBAL DE TODA A OBRA */}
                  {msg.fullBookReviewCard && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: 18,
                        background: '#f8fafc',
                        border: '1.5px solid #6366f1',
                        borderRadius: 12,
                        color: '#0f172a'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 9,
                              background: '#e0e7ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#4f46e5'
                            }}
                          >
                            <BookCheck size={20} />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#312e81' }}>
                              Diagnóstico Editorial Global da Obra
                            </h4>
                            <span style={{ fontSize: 12, color: '#64748b' }}>
                              {msg.fullBookReviewCard.chaptersEnrichment.length} capítulo(s) com propostas de enriquecimento
                            </span>
                          </div>
                        </div>

                        {msg.fullBookReviewCard.applied ? (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 12.5,
                              fontWeight: 800,
                              color: '#16a34a',
                              background: '#dcfce7',
                              padding: '5px 12px',
                              borderRadius: 7,
                              border: '1px solid #86efac'
                            }}
                          >
                            <CheckCircle2 size={15} /> Obra Atualizada & Salva
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApplyFullEnrichment(msg.id, msg.fullBookReviewCard!.chaptersEnrichment)}
                            disabled={isAiProcessing}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 7,
                              padding: '8px 16px',
                              borderRadius: 8,
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: 13,
                              fontWeight: 800,
                              cursor: isAiProcessing ? 'not-allowed' : 'pointer',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            <Sparkles size={15} />
                            <span>✨ Aplicar Enriquecimento na Obra Toda</span>
                          </button>
                        )}
                      </div>

                      {/* RESUMO DO DIAGNÓSTICO */}
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: 12,
                          marginBottom: 12,
                          fontSize: 13,
                          color: '#334155',
                          lineHeight: 1.6
                        }}
                      >
                        {msg.fullBookReviewCard.summary}
                      </div>

                      {/* LISTA DE CAPÍTULOS PROPOSTOS PARA ENRIQUECIMENTO */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {msg.fullBookReviewCard.chaptersEnrichment.map((ch, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: 8,
                              padding: 12
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#1e293b' }}>
                                Capítulo {ch.chapterNumber}: {ch.chapterTitle}
                              </span>
                              {!msg.fullBookReviewCard?.applied && (
                                <button
                                  type="button"
                                  onClick={() => handleApplySingleChapterEnrichment(msg.id, ch.chapterNumber, ch.additionText)}
                                  disabled={ch.applied || isAiProcessing}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    border: ch.applied ? '1px solid #86efac' : '1px solid #cbd5e1',
                                    background: ch.applied ? '#f0fdf4' : '#f8fafc',
                                    color: ch.applied ? '#166534' : '#334155',
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    cursor: ch.applied ? 'default' : 'pointer'
                                  }}
                                >
                                  {ch.applied ? '✓ Aplicado' : '+ Aplicar Só Neste'}
                                </button>
                              )}
                            </div>
                            <p style={{ margin: '0 0 8px', fontSize: 12.5, color: '#4f46e5', fontWeight: 600 }}>
                              💡 {ch.rationale}
                            </p>
                            <div
                              style={{
                                background: '#f8fafc',
                                borderLeft: '3px solid #6366f1',
                                padding: '8px 10px',
                                fontSize: 12,
                                color: '#334155',
                                fontStyle: 'italic',
                                maxHeight: 120,
                                overflowY: 'auto'
                              }}
                            >
                              {ch.additionText}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BOTÕES DE AÇÕES RÁPIDAS SUGERIDAS */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: '1px solid',
                        borderColor: msg.sender === 'user' ? 'rgba(255, 255, 255, 0.2)' : '#f1f5f9'
                      }}
                    >
                      {msg.suggestedActions.map((act, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={isAiProcessing}
                          onClick={() => handleActionClick(act.action)}
                          style={{
                            padding: '8px 15px',
                            borderRadius: 7,
                            fontSize: 12.5,
                            fontWeight: 800,
                            cursor: isAiProcessing ? 'not-allowed' : 'pointer',
                            background: act.primary
                              ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                              : '#ffffff',
                            color: act.primary ? '#ffffff' : '#334155',
                            border: '1px solid',
                            borderColor: act.primary ? '#0284c7' : '#cbd5e1',
                            boxShadow: act.primary ? '0 2px 6px rgba(2, 132, 199, 0.2)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* INDICADOR DE CARREGAMENTO EM TEMPO REAL COM IDENTIDADE VISUAL BOOKENGIN */}
            {isAiProcessing && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  width: '100%',
                  maxWidth: 480,
                  margin: '8px 0'
                }}
              >
                <BookEnginLoader
                  variant="inline"
                  size="md"
                  title="CoAuthor KDP em Ação..."
                  message={aiLoadingStatus || 'Escrevendo e calibrando o conteúdo com voz autoral humana e ritmo de bestseller...'}
                  footerNote={autoPilotActive ? '⚡ Piloto Automático ativo — Escrevendo sequência da obra...' : 'O CoAuthor está gerando conteúdo de alta qualidade editorial para sua obra.'}
                />

                {autoPilotActive && (
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => handleActionClick('parar_piloto')}
                      style={{
                        padding: '6px 14px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      ⏹️ Pausar Piloto Automático
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>

          {/* BARRA INFERIOR DE CHAT E INPUT FIXA NA TELA */}
          <footer
            style={{
              flexShrink: 0,
              padding: '12px 24px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)'
            }}
          >
            {/* CONTAINER CENTRALIZADO DO FOOTER */}
            <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* SUGESTÕES RÁPIDAS COM SCROLL OCULTO / SUAVE */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  overflowX: 'auto',
                  paddingBottom: 2,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                {[
                  { label: '📖 Revisar Obra Inteira', action: () => handleActionClick('acao_revisar_tudo_agora') },
                  { label: tipoLivro === 'ficcao' ? '✨ Enriquecer História' : '⚙️ Enriquecer Conteúdo Técnico', action: () => handleActionClick('acao_enriquecer_profundo') },
                  { label: '📚 Meus Livros', action: () => handleActionClick('abrir_meus_livros') },
                  { label: '✍️ Escrever próximo capítulo', action: () => handleActionClick('proximo_cap') },
                  { label: '⚡ Piloto Automático', action: () => handleActionClick('piloto_automatico') },
                  { label: '🔍 Checagem de Enredo', action: () => handleActionClick('pedir_enredo') },
                  { label: '✍️ Verificar Coesão & Fluidez', action: () => handleActionClick('pedir_coesao') },
                  { label: '📖 Ver Diagramado', action: () => setInternalTab('diagramado') },
                  { label: '🚀 Preparar Publicação KDP', action: () => handleActionClick('pedir_preparacao') }
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAiProcessing}
                    onClick={sug.action}
                    style={{
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      padding: '5px 12px',
                      borderRadius: 20,
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: isAiProcessing ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#0284c7';
                      e.currentTarget.style.color = '#0284c7';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.color = '#334155';
                    }}
                  >
                    {sug.label}
                  </button>
                ))}
              </div>

              {/* FORMULÁRIO DE ENVIO COM BARRA DE VOZ HANDS-FREE E CAMPO DE TEXTO ERGONÔMICO */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}>
                {/* BARRA DE VOZ CONTÍNUA / HANDS-FREE COM CORTE IMEDIATO DE SOM (BARGE-IN) */}
                <div style={{ flexShrink: 0 }}>
                  <CoAuthorVoiceModalBar
                    onSendMessage={(transcript) => {
                      handleSendUserInput(transcript);
                    }}
                    isLoading={isAiProcessing}
                    disabled={isAiProcessing}
                  />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendUserInput();
                  }}
                  style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}
                >
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    disabled={isAiProcessing}
                    placeholder={
                      isAiProcessing
                        ? 'Aguarde... o Agente CoAuthor está processando...'
                        : 'Fale por voz no microfone ou digite: escolha temas, títulos, aprove sumário ou dê instruções...'
                    }
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 14.5,
                      background: isAiProcessing ? '#f1f5f9' : '#ffffff',
                      color: '#0f172a',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  />

                  <button
                    type="submit"
                    disabled={!userInput.trim() || isAiProcessing}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 22px',
                      borderRadius: 10,
                      background: !userInput.trim() || isAiProcessing
                        ? '#cbd5e1'
                        : 'linear-gradient(135deg, #0284c7, #0369a1)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: !userInput.trim() || isAiProcessing ? 'not-allowed' : 'pointer',
                      boxShadow: userInput.trim() && !isAiProcessing ? '0 3px 10px rgba(2, 132, 199, 0.3)' : 'none',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                  >
                    {isAiProcessing ? (
                      <>
                        <BookEnginAnimatedBook size="micro" /> Gerando...
                      </>
                    ) : (
                      <>
                        <Send size={15} /> Enviar
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODO 2: LIVRO DIAGRAMADO (LEITURA INTEGRAL NO PADRÃO KDP) */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {internalTab === 'diagramado' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#f8fafc' }}>
          {/* BARRA LATERAL COM SUMÁRIO DOS CAPÍTULOS */}
          <aside
            style={{
              width: 320,
              flexShrink: 0,
              background: '#ffffff',
              borderRight: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto'
            }}
          >
            <div style={{ padding: '20px 22px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                Sumário Oficial KDP
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                {capsConcluidos} capítulos prontos para leitura
              </p>
            </div>

            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {capsConcluidos === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  Nenhum capítulo escrito ainda. Abra o chat para iniciar a redação!
                </div>
              ) : (
                bookState?.capitulos.map((cap, idx) => {
                  const isSelected = selectedReaderChapter === idx;
                  const wordCount = cap.texto.split(/\s+/).filter(Boolean).length;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedReaderChapter(idx)}
                      style={{
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: isSelected ? '#e0f2fe' : '#ffffff',
                        border: isSelected ? '1px solid #bae6fd' : '1px solid #f1f5f9',
                        color: isSelected ? '#0369a1' : '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: 13.5, fontWeight: isSelected ? 800 : 700 }}>
                        Capítulo {idx + 1}: {cap.titulo.replace(/^Capítulo\s*\d+:\s*/i, '')}
                      </div>
                      <div style={{ fontSize: 11.5, color: isSelected ? '#0284c7' : '#94a3b8' }}>
                        {wordCount} palavras • ~{Math.max(1, Math.ceil(wordCount / 280))} páginas KDP
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ÁREA DE LEITURA DIAGRAMADA */}
          <main
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '40px 60px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 780,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '50px 60px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                boxSizing: 'border-box'
              }}
            >
              {capsConcluidos === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <BookOpen size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
                  <h3 style={{ fontSize: 18, color: '#0f172a', fontWeight: 800 }}>
                    Nenhum Capítulo Escrito Ainda
                  </h3>
                  <p style={{ fontSize: 14, color: '#64748b', maxWidth: 440, margin: '8px auto 20px' }}>
                    Utilize o Chat com o CoAuthor para definir a estrutura e coescrever seu livro.
                  </p>
                  <button
                    type="button"
                    onClick={() => setInternalTab('chat')}
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Abrir Chat com CoAuthor
                  </button>
                </div>
              ) : (
                (() => {
                  const capAtual = bookState?.capitulos[selectedReaderChapter];
                  if (!capAtual) return null;
                  const wordCount = capAtual.texto.split(/\s+/).filter(Boolean).length;

                  return (
                    <div>
                      {/* CABEÇALHO DO CAPÍTULO */}
                      <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 20, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {bookState?.titulo} • Capítulo {selectedReaderChapter + 1}
                          </div>
                          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '6px 0 0' }}>
                            {capAtual.titulo}
                          </h1>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(capAtual.texto);
                              setIsCopiedChapter(selectedReaderChapter + 1);
                              setTimeout(() => setIsCopiedChapter(null), 2000);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 14px',
                              borderRadius: 6,
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {isCopiedChapter === selectedReaderChapter + 1 ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                            <span>{isCopiedChapter === selectedReaderChapter + 1 ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>

                      {/* TEXTO DO CAPÍTULO EM TIPOGRAFIA EDITORIAL */}
                      <div
                        style={{
                          fontSize: 16,
                          lineHeight: 1.85,
                          color: '#1e293b',
                          fontFamily: "'Inter', Georgia, serif",
                          textAlign: 'justify'
                        }}
                      >
                        {capAtual.texto.split(/\n\s*\n/).map((paragrafo, pIdx) => {
                          const pTrim = paragrafo.trim();
                          if (!pTrim) return null;
                          if (pTrim === '* * *' || pTrim === '***') {
                            return (
                              <div key={pIdx} style={{ textAlign: 'center', margin: '24px 0', color: '#94a3b8', fontSize: 18, letterSpacing: '0.3em' }}>
                                * * *
                              </div>
                            );
                          }
                          return (
                            <p key={pIdx} style={{ margin: '0 0 16px', textIndent: '1.5em' }}>
                              {pTrim}
                            </p>
                          );
                        })}
                      </div>

                      {/* NAVEGAÇÃO ENTRE CAPÍTULOS */}
                      <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 36, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          type="button"
                          disabled={selectedReaderChapter === 0}
                          onClick={() => setSelectedReaderChapter(prev => Math.max(0, prev - 1))}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 6,
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: selectedReaderChapter === 0 ? 'not-allowed' : 'pointer',
                            opacity: selectedReaderChapter === 0 ? 0.5 : 1
                          }}
                        >
                          ← Capítulo Anterior
                        </button>

                        <span style={{ fontSize: 12.5, color: '#64748b' }}>
                          Capítulo {selectedReaderChapter + 1} de {capsConcluidos} ({wordCount} palavras)
                        </span>

                        <button
                          type="button"
                          disabled={selectedReaderChapter >= capsConcluidos - 1}
                          onClick={() => setSelectedReaderChapter(prev => Math.min(capsConcluidos - 1, prev + 1))}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 6,
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: selectedReaderChapter >= capsConcluidos - 1 ? 'not-allowed' : 'pointer',
                            opacity: selectedReaderChapter >= capsConcluidos - 1 ? 0.5 : 1
                          }}
                        >
                          Próximo Capítulo →
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </main>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODO 3: REVISÃO EDITORIAL DA OBRA (AUDITORIA & CHECAGENS) */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {internalTab === 'revisao' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px 40px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* BANNER DE REVISÃO */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <ClipboardCheck size={24} color="#059669" />
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                  Central de Revisão Editorial da Obra
                </h2>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    padding: '3px 10px',
                    borderRadius: 6
                  }}
                >
                  {tipoLivro.toUpperCase()}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: '#64748b' }}>
                Checagem completa de enredo, coesão, gramática, diagramação e preparação para o Amazon KDP.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setInternalTab('chat');
                  handleSendUserInput('Por favor, faça uma checagem completa de enredo e coerência.');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 18px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Search size={15} /> Auditar Enredo no Chat
              </button>

              <button
                type="button"
                onClick={() => {
                  setInternalTab('chat');
                  handleSendUserInput('Por favor, faça uma verificação de coesão textual e fluidez.');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 18px',
                  borderRadius: 8,
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <FileCheck size={15} /> Verificar Coesão no Chat
              </button>
            </div>
          </div>

          {/* CARDS DOS 4 PILARES DA REVISÃO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            <div style={{ background: '#ffffff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Compass size={18} color="#0284c7" />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>1. Enredo & Coerência</h4>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Verificação da narrativa ou didática para garantir transições perfeitas sem furos de roteiro ou contradições.
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CheckCircle2 size={18} color="#059669" />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>2. Coesão & Fluidez</h4>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Gramática, ritmo de leitura, conexões entre parágrafos e adaptação do vocabulário para o público-alvo KDP.
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <BookOpen size={18} color="#d97706" />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>3. Diagramação KDP</h4>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Parágrafos com recuo padronizado, sumário automatizado, quebras de página limpas e conformidade editorial.
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Award size={18} color="#0284c7" />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>4. Preparação KDP</h4>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Metadados comerciais, 7 palavras-chave oficiais de alta busca e sinopse em HTML para a página da Amazon.
              </p>
            </div>
          </div>

          {/* LISTA DE CAPÍTULOS PARA EDIÇÃO MANUAL */}
          <div style={{ background: '#ffffff', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Capítulos da Obra ({capsConcluidos} de {totalCaps})
            </h3>

            {capsConcluidos === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
                Nenhum capítulo disponível para revisão. Crie os capítulos pelo Chat CoAuthor.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bookState?.capitulos.map((cap, idx) => {
                  const isEditing = editingChapterIdx === idx;
                  const wordCount = cap.texto.split(/\s+/).filter(Boolean).length;

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: 18,
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div>
                          <strong style={{ fontSize: 15, color: '#0f172a' }}>
                            Capítulo {idx + 1}: {cap.titulo}
                          </strong>
                          <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>
                            ({wordCount} palavras)
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedChapter(idx)}
                                style={{
                                  padding: '6px 14px',
                                  background: '#10b981',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Salvar Alterações
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingChapterIdx(null)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  color: '#475569',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  cursor: 'pointer'
                                }}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChapterIdx(idx);
                                setEditedChapterText(cap.texto);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 12px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#334155',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <Edit3 size={13} /> Editar Texto
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <textarea
                          rows={12}
                          value={editedChapterText}
                          onChange={(e) => setEditedChapterText(e.target.value)}
                          style={{
                            width: '100%',
                            padding: 14,
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            fontSize: 14,
                            lineHeight: 1.6,
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: 13.5, color: '#475569', maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cap.texto.slice(0, 300)}...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      </main>
    </div>
  );
};
