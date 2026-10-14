import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Bot, Send, Play, Pause, RefreshCw, CheckCircle2,
  BookOpen, ChevronRight, Copy, Check, MessageSquare,
  AlertCircle, ArrowRight, Zap, Award, Edit3, Trash2, Eye,
  ShieldCheck, FileText, Compass, RotateCw,
  Wrench, HeartHandshake, Layers, BookCheck, ClipboardCheck,
  ChevronDown, ChevronUp, Save, X, Lightbulb, UserCheck,
  ArrowLeft, Download, Maximize2, Minimize2, CheckSquare, Search,
  FileCheck, ExternalLink, Bookmark, HelpCircle
} from 'lucide-react';
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
  idiomaAtual = 'Português'
}) => {
  // Aba ativa interna do estúdio: 'chat' | 'diagramado' | 'revisao' | 'exportar'
  const [internalTab, setInternalTab] = useState<'chat' | 'diagramado' | 'revisao' | 'exportar'>('chat');

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

  // Armazena o briefing alinhado
  const [respostasBriefing, setRespostasBriefing] = useState<{
    premissa: string;
    elementos: string;
    formula: string;
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
    if (internalTab === 'chat') {
      scrollToBottomInternal();
    }
  }, [messages.length, isAiProcessing, internalTab]);

  // Mensagem de boas-vindas inicial natural
  useEffect(() => {
    if (messages.length === 0) {
      iniciarConversaNatural(tipoLivro);
    }
  }, []);

  const iniciarConversaNatural = (tipo: CoAuthorBookType) => {
    const nomeTipo =
      tipo === 'tecnico'
        ? 'Livro Técnico / Didático (Foco em Resolução de Problemas)'
        : tipo === 'autoajuda'
        ? 'Autoajuda & Desenvolvimento Pessoal'
        : tipo === 'pratico'
        ? 'Guia Prático Passo a Passo (How-To)'
        : 'Ficção & Narrativa';

    const msgInicial: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Olá! Eu sou o seu **Agente CoAuthor Editorial** do Book Engin. 📚✨

Esta tela foi desenhada exclusivamente para você criar seu livro do início ao fim com tranquilidade, sem poluição visual e com foco total na sua obra.

Perfil atual: **${nomeTipo}**.

Nós vamos cumprir todas as etapas do processo base editorial:
1. **Tema & Ideia**: Definir o conceito central, público-alvo e nicho KDP.
2. **Título & Subtítulo**: Formulação comercial de alto impacto.
3. **Sumário de Capítulos**: Estruturar a espinha dorsal da obra.
4. **Redação & Coautoria**: Escrever capítulo por capítulo com máxima qualidade.
5. **Revisão & Checagem Editorial**: Enredo, coesão do texto, diagramação e preparação para o Amazon KDP.

Para começarmos o primeiro passo: **Qual é o tema central, a ideia ou o problema concreto que seu livro vai resolver?**`,
      suggestedActions: [
        { label: '⚙️ Livro Técnico & IA', action: 'exemplo_0' },
        { label: '📘 Autoajuda & Foco Diário', action: 'exemplo_1' },
        { label: '🛠️ Guia Prático Financeiro', action: 'exemplo_2' },
        { label: '📖 Ficção & Mistério', action: 'exemplo_3' }
      ]
    };

    setMessages([msgInicial]);
  };

  // Troca de Perfil Editorial pelo usuário
  const handleChangeTipoLivro = (novoTipo: CoAuthorBookType) => {
    setTipoLivro(novoTipo);
    if (bookState) {
      onUpdateBookState({ ...bookState, tipoLivro: novoTipo });
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

    // CONVERSA PADRÃO DO PROCESSO DO LIVRO
    try {
      const historicoRecente = newMsgs.slice(-8).map(m => {
        const autorTag = m.sender === 'user' ? 'AUTOR' : (m.sender === 'agent' ? 'COAUTHOR_EDITORIAL' : 'SISTEMA');
        return `${autorTag}: ${m.text}`;
      }).join('\n\n');

      let diretrizEstilo = '';
      if (tipoLivro === 'tecnico') {
        diretrizEstilo = `DIRETRIZ EDITORIAL: LIVRO TÉCNICO & RESOLUÇÃO DE PROBLEMAS
- Este livro NÃO É FICÇÃO. Não há personagens, dramas emocionais nem metáforas literárias.
- O objetivo é ENSINAR uma técnica, ferramenta ou método para resolver problemas reais.
- Didática clara, estrutura em tópicos, boas práticas e vocabulário popular e acessível.`;
      } else if (tipoLivro === 'autoajuda') {
        diretrizEstilo = `DIRETRIZ EDITORIAL: AUTOAJUDA & DESENVOLVIMENTO PESSOAL
- Foco em transformação pessoal, hábitos, clareza mental e superação.
- Linguagem encorajadora, sem poesia abstrata. Cada capítulo deve ter exercícios práticos e plano de ação imediato.`;
      } else if (tipoLivro === 'pratico') {
        diretrizEstilo = `DIRETRIZ EDITORIAL: GUIA PRÁTICO PASSO A PASSO (HOW-TO)
- Instrução direta e pragmática em etapas numeradas, macetes de execução e erros comuns a evitar.`;
      } else {
        diretrizEstilo = `DIRETRIZ EDITORIAL: FICÇÃO & NARRATIVA
- Personagens consistentes, ambientação visual sem metáforas prolixas, ganchos de retenção e desfecho conclusivo.`;
      }

      const systemInstruction = `Você é o CoAuthor Editorial AI do Book Engin, um assistente editorial inteligente de altíssimo nível para autores que publicam na Amazon KDP.

PERFIL ATIVO: ${tipoLivro.toUpperCase()}
${diretrizEstilo}

SUA ATITUDE CONVERSACIONAL:
1. VOCÊ CONVERSA DE VERDADE COM O AUTOR:
   - Se o autor mandar uma saudação ("ola", "oi", "bom dia"), responda cordialmente e pergunte sobre o tema da obra.
   - Se o autor trouxer uma ideia ou tema: comente os pontos fortes para o mercado Amazon KDP, sugira títulos comerciais e ajude a desenhar a estrutura dos capítulos.
   - Conduza o processo base do livro: Tema -> Título/Subtítulo -> Sumário de Capítulos -> Redação.

2. QUANDO HOUVER ALINHAMENTO COMPLETO:
   Quando o tema, os tópicos e a estrutura estiverem bem definidos (ou quando o autor disser "pode começar", "escreva o capítulo 1" ou similar), inclua no final da sua resposta o bloco estruturado:
   <<<ALINHAMENTO_CONCLUIDO>>>
   TITULO: [Título Comercial Sugerido]
   SUBTITULO: [Subtítulo de Alta Conversão]
   TIPO: [tecnico | autoajuda | pratico | ficcao]
   PREMISSA: [Resumo de 2 linhas do tema e promessa da obra]
   ELEMENTOS: [Tópicos-chave inegociáveis]
   DIRETRIZ: [Diretriz de escrita dos capítulos]
   TOTAL_CAPS: [Quantidade sugerida de capítulos, ex: 8]
   <<<FIM_ALINHAMENTO>>>

3. LINGUAGEM: Sempre em Português do Brasil, profissional, estimulante, elegante e clara.`;

      const promptCompleto = `━━━ HISTÓRICO CONVERSACIONAL RECENTE ━━━
${historicoRecente}

━━━ ÚLTIMA MENSAGEM DO AUTOR ━━━
${texto}

Responda como o CoAuthor AI, compreendendo o pedido do autor e avançando o alinhamento editorial:`;

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

      const tituloCap = mt ? mt[1].trim() : `Capítulo ${numCapitulo}`;
      const novoCap = { titulo: tituloCap, texto: finalTexto };

      const livroAtualizado = {
        ...livroAtual,
        capitulos: [...livroAtual.capitulos, novoCap]
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
    } else if (action === 'baixar_pdf') {
      setInternalTab('exportar');
      await handleDownloadPdf();
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
  const totalCaps = totalCapsDesejado || 8;
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
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        color: '#0f172a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* ==================================================================== */}
      {/* 1. TOP BAR EXECUTIVA DO ESTÚDIO EM TELA CHEIA */}
      {/* ==================================================================== */}
      <header
        style={{
          flexShrink: 0,
          height: 72,
          padding: '0 24px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
          zIndex: 10
        }}
      >
        {/* LADO ESQUERDO: VOLTAR AO PAINEL + IDENTIDADE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 15px',
                borderRadius: 8,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Voltar ao painel geral da obra (salva tudo automaticamente)"
            >
              <ArrowLeft size={16} />
              <span>Voltar ao Painel</span>
            </button>
          )}

          <div style={{ height: 28, width: 1, background: '#e2e8f0' }} />

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
              boxShadow: '0 3px 10px rgba(2, 132, 199, 0.28)'
            }}
          >
            <Sparkles size={22} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                CoAuthor Studio Pro
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  background: '#e0f2fe',
                  color: '#0284c7',
                  border: '1px solid #bae6fd',
                  padding: '2px 8px',
                  borderRadius: 5,
                  textTransform: 'uppercase'
                }}
              >
                Gemini Neural
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 1, fontWeight: 500 }}>
              {capsConcluidos === 0
                ? 'Coautoria completa: da ideia inicial à publicação KDP'
                : `${capsConcluidos} de ${totalCaps} capítulos prontos • ${totalPalavras.toLocaleString()} palavras escritas`}
            </div>
          </div>
        </div>

        {/* LADO DIREITO: NAVEGAÇÃO DE ABAS INTEGRADAS + AÇÃO RÁPIDA DE PDF */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: 3,
              borderRadius: 9,
              border: '1px solid #e2e8f0'
            }}
          >
            <button
              type="button"
              onClick={() => setInternalTab('chat')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 15px',
                borderRadius: 7,
                border: 'none',
                background: internalTab === 'chat' ? '#ffffff' : 'transparent',
                color: internalTab === 'chat' ? '#0284c7' : '#64748b',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: internalTab === 'chat' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <MessageSquare size={15} /> Chat CoAuthor
            </button>

            <button
              type="button"
              onClick={() => setInternalTab('diagramado')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 15px',
                borderRadius: 7,
                border: 'none',
                background: internalTab === 'diagramado' ? '#ffffff' : 'transparent',
                color: internalTab === 'diagramado' ? '#0284c7' : '#64748b',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: internalTab === 'diagramado' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <BookOpen size={15} /> Livro Diagramado
            </button>

            <button
              type="button"
              onClick={() => setInternalTab('revisao')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 15px',
                borderRadius: 7,
                border: 'none',
                background: internalTab === 'revisao' ? '#ffffff' : 'transparent',
                color: internalTab === 'revisao' ? '#059669' : '#64748b',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: internalTab === 'revisao' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <ClipboardCheck size={15} /> Revisão Editorial
              {capsConcluidos > 0 && (
                <span style={{ background: '#10b981', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                  {capsConcluidos}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setInternalTab('exportar')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 15px',
                borderRadius: 7,
                border: 'none',
                background: internalTab === 'exportar' ? '#ffffff' : 'transparent',
                color: internalTab === 'exportar' ? '#d97706' : '#64748b',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: internalTab === 'exportar' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Download size={15} /> Exportar KDP
            </button>
          </div>

          {/* BOTÃO RÁPIDO DE DOWNLOAD DE PDF DIAGRAMADO */}
          {capsConcluidos > 0 && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 8,
                background: isGeneratingPdf ? '#cbd5e1' : '#0284c7',
                border: 'none',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 800,
                cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.28)',
                transition: 'all 0.15s ease'
              }}
            >
              {isGeneratingPdf ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
              <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF KDP'}</span>
            </button>
          )}
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. SUB-BAR: ETAPAS EDITORIAIS DA OBRA & SELETOR DE PERFIL */}
      {/* ==================================================================== */}
      <div
        style={{
          flexShrink: 0,
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          overflowX: 'auto'
        }}
      >
        {/* ETAPAS DA OBRA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: '#475569' }}>
            Processo Editorial:
          </span>

          {[
            { num: 1, label: 'Tema & Ideia', done: Boolean(respostasBriefing.premissa) },
            { num: 2, label: 'Título & Subtítulo', done: Boolean(bookState?.titulo && bookState.titulo !== 'Novo Livro') },
            { num: 3, label: 'Sumário & Capítulos', done: capsConcluidos > 0 },
            { num: 4, label: 'Redação & Coautoria', done: capsConcluidos >= totalCaps },
            { num: 5, label: 'Revisão KDP', done: capsConcluidos >= totalCaps }
          ].map((etapa, idx) => (
            <div key={etapa.num} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  background: etapa.done ? '#10b981' : '#e2e8f0',
                  color: etapa.done ? '#ffffff' : '#475569'
                }}
              >
                {etapa.done ? '✓' : etapa.num}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: etapa.done ? 700 : 500, color: etapa.done ? '#0f172a' : '#64748b' }}>
                {etapa.label}
              </span>
              {idx < 4 && <ChevronRight size={13} color="#cbd5e1" />}
            </div>
          ))}
        </div>

        {/* SELETOR DE PERFIL EDITORIAL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: '#475569' }}>
            Perfil:
          </span>

          {[
            { id: 'tecnico' as CoAuthorBookType, label: '⚙️ Técnico' },
            { id: 'autoajuda' as CoAuthorBookType, label: '📘 Autoajuda' },
            { id: 'pratico' as CoAuthorBookType, label: '🛠️ Guia Prático' },
            { id: 'ficcao' as CoAuthorBookType, label: '📖 Ficção' }
          ].map(item => {
            const isSelected = tipoLivro === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={isAiProcessing}
                onClick={() => handleChangeTipoLivro(item.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isAiProcessing ? 'not-allowed' : 'pointer',
                  background: isSelected ? '#0284c7' : '#f8fafc',
                  color: isSelected ? '#ffffff' : '#475569',
                  border: isSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                  transition: 'all 0.15s ease'
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BARRA DE PROGRESSO VISUAL */}
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

      {/* ==================================================================== */}
      {/* 3. CONTEÚDO PRINCIPAL (COM CONTENÇÃO TOTAL DE SCROLL) */}
      {/* ==================================================================== */}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODO 1: CHAT COAUTHOR (CRIAÇÃO, DIÁLOGO & COAUTORIA) */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {internalTab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {/* FEED DE MENSAGENS COM SCROLL ESTRITAMENTE INTERNO */}
          <div
            ref={chatScrollContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              background: '#f8fafc'
            }}
          >
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
                          Capítulo {msg.chapterPreview.numero}: {msg.chapterPreview.titulo}
                        </span>
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

            {/* INDICADOR DE CARREGAMENTO EM TEMPO REAL */}
            {isAiProcessing && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 22px',
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1.5px solid #0284c7',
                  width: 'fit-content',
                  boxShadow: '0 4px 18px rgba(2, 132, 199, 0.16)'
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: '3px solid #e0f2fe',
                    borderTopColor: '#0284c7',
                    animation: 'spin 0.8s linear infinite'
                  }}
                />
                <div>
                  <div style={{ fontSize: 13.5, color: '#0369a1', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Sparkles size={15} color="#0284c7" /> {aiLoadingStatus || 'Processando com inteligência editorial...'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                    O CoAuthor está gerando conteúdo de alta qualidade editorial para sua obra.
                  </div>
                </div>

                {autoPilotActive && (
                  <button
                    type="button"
                    onClick={() => handleActionClick('parar_piloto')}
                    style={{
                      marginLeft: 14,
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
                    Pausar Piloto
                  </button>
                )}
              </div>
            )}
          </div>

          {/* BARRA INFERIOR DE CHAT E INPUT FIXA NA TELA */}
          <footer
            style={{
              flexShrink: 0,
              padding: '14px 28px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)'
            }}
          >
            {/* SUGESTÕES RÁPIDAS DE CONTINUAÇÃO E COMANDOS EDITORIAIS */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {[
                { label: '✍️ Escrever próximo capítulo', action: () => handleActionClick('proximo_cap') },
                { label: '⚡ Piloto Automático', action: () => handleActionClick('piloto_automatico') },
                { label: '🔍 Checagem de Enredo & Coerência', action: () => handleActionClick('pedir_enredo') },
                { label: '✍️ Verificar Coesão & Fluidez', action: () => handleActionClick('pedir_coesao') },
                { label: '📖 Ver Livro Diagramado', action: () => setInternalTab('diagramado') },
                { label: '🚀 Preparar Publicação KDP', action: () => handleActionClick('pedir_preparacao') }
              ].map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isAiProcessing}
                  onClick={sug.action}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '6px 14px',
                    borderRadius: 7,
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: isAiProcessing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {sug.label}
                </button>
              ))}
            </div>

            {/* FORMULÁRIO DE ENVIO COM CAMPO DE TEXTO GRANDE E ERGONÔMICO */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendUserInput();
              }}
              style={{ display: 'flex', gap: 10, alignItems: 'center' }}
            >
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isAiProcessing}
                placeholder={
                  isAiProcessing
                    ? 'Aguarde... o Agente CoAuthor está processando...'
                    : 'Converse com o CoAuthor: dê instruções, peça ajustes, solicite checagem de enredo ou capítulos...'
                }
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 15,
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
                  padding: '14px 24px',
                  borderRadius: 10,
                  background: !userInput.trim() || isAiProcessing
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 14.5,
                  fontWeight: 800,
                  cursor: !userInput.trim() || isAiProcessing ? 'not-allowed' : 'pointer',
                  boxShadow: userInput.trim() && !isAiProcessing ? '0 3px 10px rgba(2, 132, 199, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {isAiProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Gerando...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Enviar
                  </>
                )}
              </button>
            </form>
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODO 4: PREPARAÇÃO & EXPORTAÇÃO KDP (DOWNLOAD DIRETO DO PDF) */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {internalTab === 'exportar' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '36px 48px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 28,
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Download size={26} color="#0284c7" />
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                  Exportação & Publicação Oficial Amazon KDP
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
                  Gere o PDF com a diagramação definitiva pronto para impressão ou submissão no KDP.
                </p>
              </div>
            </div>

            {pdfSuccessMessage && (
              <div
                style={{
                  margin: '16px 0',
                  padding: '14px 18px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 8,
                  color: '#065f46',
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <CheckCircle2 size={18} color="#059669" />
                <span>{pdfSuccessMessage}</span>
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || capsConcluidos === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 28px',
                  borderRadius: 10,
                  background: isGeneratingPdf || capsConcluidos === 0
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: isGeneratingPdf || capsConcluidos === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                }}
              >
                {isGeneratingPdf ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                <span>{isGeneratingPdf ? 'Gerando Diagramação KDP...' : '📥 Baixar PDF Diagramado Oficial KDP'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!bookState?.capitulos) return;
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
                }}
                disabled={capsConcluidos === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 22px',
                  borderRadius: 10,
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: capsConcluidos === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <FileText size={16} /> Baixar Manuscrito Completo (TXT)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
