import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Bot, Send, Play, Pause, RefreshCw, CheckCircle2,
  BookOpen, ChevronRight, Copy, Check, Sliders, MessageSquare,
  AlertCircle, ArrowRight, Zap, Award, Edit3, Trash2, Eye,
  ShieldCheck, FileText, CornerDownLeft, Compass, RotateCw,
  Wrench, HeartHandshake, Layers, BookCheck, ClipboardCheck,
  ChevronDown, ChevronUp, Save, X, Key, Lightbulb, UserCheck
} from 'lucide-react';
import { chamarGeminiTexto, getAvailableApiKeys } from '../../../services/kdp-ai-engine';
import { ManuscriptIntegrityEngine } from '../../../services/manuscript-integrity-engine';
import {
  orchestrateEditorialPlan,
  buildFallbackEditorialPlan,
  type KdpEditorialPlan
} from '../../../services/kdp-agents-service';

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
  // Limpa possíveis tags estruturais da IA que não devem ser mostradas ao leitor
  const clean = text
    .replace(/<<<ALINHAMENTO_CONCLUIDO>>>[\s\S]*?<<<FIM_ALINHAMENTO>>>/g, '')
    .trim();

  const lines = clean.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lines.map((line, lIdx) => {
        if (!line.trim()) {
          return <div key={lIdx} style={{ height: 4 }} />;
        }

        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || /^\d+\.\s/.test(line.trim());
        const cleanLine = isBullet ? line.trim().replace(/^[•-]\s*|^\d+\.\s*/, '') : line;

        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

        const renderedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} style={{ fontWeight: 700, color: 'inherit' }}>
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={lIdx} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
              <span style={{ color: '#0284c7', fontWeight: 800 }}>•</span>
              <span style={{ flex: 1 }}>{renderedLine}</span>
            </div>
          );
        }

        return <div key={lIdx}>{renderedLine}</div>;
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
        padding: 16,
        marginBottom: 16,
        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
            }}
          >
            <Bot size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                Agente CoAuthor KDP
              </h3>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: '#0284c7',
                  background: '#e0f2fe',
                  padding: '2px 6px',
                  borderRadius: 4,
                  textTransform: 'uppercase'
                }}
              >
                Gemini AI Real
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
              Conversa real e estruturada com IA
            </p>
          </div>
        </div>

        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: temBriefing ? '#059669' : '#0284c7',
            background: temBriefing ? '#ecfdf5' : '#f0f9ff',
            padding: '2px 8px',
            borderRadius: 12,
            border: `1px solid ${temBriefing ? '#a7f3d0' : '#bae6fd'}`
          }}
        >
          {temBriefing ? '✓ Alinhado' : '🟢 Ativo'}
        </span>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 11, color: '#334155', lineHeight: 1.45 }}>
        O CoAuthor conversa com você via Gemini, compreende seu tema (técnico, autoajuda, guia ou ficção) sem respostas prontas e coescreve o livro com você.
      </p>

      {/* BOTÃO PRINCIPAL DE ENTRADA NO CHAT */}
      <button
        type="button"
        onClick={onStartCoAuthor}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '11px 16px',
          background: 'linear-gradient(135deg, #0284c7, #0369a1)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
          transition: 'all 0.15s ease'
        }}
      >
        <MessageSquare size={14} /> Abrir Chat com Agente CoAuthor
      </button>
    </div>
  );
};

// ============================================================================
// 2. COMPONENTE: CO-AUTHOR STUDIO WORKSPACE (LAYOUT PROFISSIONAL & IA REAL)
// ============================================================================

interface CoAuthorWorkspaceProps {
  contextData: CoAuthorContextData;
  bookState: CoAuthorBookState | null;
  onUpdateBookState: (newBook: CoAuthorBookState) => void;
  onSaveProgress: (livro: any) => void;
  onNavigateToPreview: () => void;
  onNavigateToCover: () => void;
  totalCapsDesejado: number;
  paginasAlvo: number;
}

export const CoAuthorWorkspace: React.FC<CoAuthorWorkspaceProps> = ({
  contextData,
  bookState,
  onUpdateBookState,
  onSaveProgress,
  onNavigateToPreview,
  onNavigateToCover,
  totalCapsDesejado,
  paginasAlvo
}) => {
  // Aba ativa interna: 'chat' ou 'revisao'
  const [internalTab, setInternalTab] = useState<'chat' | 'revisao'>('chat');

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

  // Modal para chave de API do Gemini do usuário
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(() => {
    try {
      return localStorage.getItem('kdp_gemini_api_key') || localStorage.getItem('gemini_api_key') || '';
    } catch {
      return '';
    }
  });

  // Estados para edição manual no painel de revisão editorial
  const [editingChapterIdx, setEditingChapterIdx] = useState<number | null>(null);
  const [editedChapterText, setEditedChapterText] = useState<string>('');
  const [expandedChapterIdx, setExpandedChapterIdx] = useState<number | null>(null);

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
    scrollToBottomInternal();
  }, [messages.length]);

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
      text: `Olá! Eu sou seu **Agente CoAuthor Editorial** do Book Engin, integrado diretamente com a inteligência do Gemini. 📚✨

Estou calibrado para o formato: **${nomeTipo}**.

Aqui conversamos de verdade: vou entender exatamente o que você quer construir, sem respostas genéricas ou roteiros fechados. Se o seu livro for **técnico ou de autoajuda**, nosso foco será **didática pura, zero enrolação, passo a passo e resolução prática de problemas**.

Para darmos o primeiro passo, me conte: **Qual é o tema, a ideia central ou o problema concreto que você quer resolver com este livro?**`,
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
        text: `🔄 **Perfil Editorial ajustado para: ${nomePerfil}**. A inteligência do Gemini agora calibrará tom, exemplos e estrutura especificamente para esse formato.`
      }
    ]);
  };

  // Salvar chave de API customizada
  const handleSaveCustomKey = () => {
    try {
      if (customKeyInput.trim()) {
        localStorage.setItem('kdp_gemini_api_key', customKeyInput.trim());
      } else {
        localStorage.removeItem('kdp_gemini_api_key');
      }
      setIsApiKeyModalOpen(false);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'system',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🔑 **Chave Gemini API atualizada com sucesso!** Suas conversas e capítulos usarão sua credencial configurada.`
        }
      ]);
    } catch (e) {
      console.error('Erro ao salvar chave:', e);
    }
  };

  // ENVIO DA MENSAGEM DO AUTOR COM PROCESSAMENTO REAL VIA GEMINI
  const handleSendUserInput = async () => {
    const texto = userInput.trim();
    if (!texto || isAiProcessing) return;

    setUserInput('');

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
    setAiLoadingStatus('CoAuthor está analisando seu pedido e formulando resposta com o Gemini...');

    try {
      // Constrói o histórico conversacional real para a IA
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

      const systemInstruction = `Você é o CoAuthor Editorial AI do Book Engin, um assistente editorial inteligente de altíssimo nível (como ChatGPT e Gemini) para autores que publicam na Amazon KDP.

PERFIL ATIVO: ${tipoLivro.toUpperCase()}
${diretrizEstilo}

SUA ATITUDE CONVERSACIONAL:
1. VOCÊ CONVERSA DE VERDADE COM O AUTOR:
   - Se o autor mandar uma saudação ("ola", "oi", "bom dia"), responda cordialmente e pergunte sobre o tema da obra. NUNCA finja que ele deu um briefing completo!
   - Se o autor disser "não é isso", "está errado" ou corrigir o rumo: compreenda a correção com elegância, adapte o foco e pergunte qual é a visão real dele.
   - Se o autor digitar algo muito curto ou vago (ex: apenas uma palavra sem sentido, uma letra ou "teste"): peça gentilmente para ele explicar melhor a ideia.
   - Se o autor trouxer uma ideia ou tema: comente os pontos fortes para o mercado Amazon KDP, sugira títulos comerciais e ajude a desenhar a estrutura dos capítulos.

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

3. LINGUAGEM: Sempre em Português do Brasil, profissional, estimulante, sem asteriscos ou formatações quebradas.`;

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
          { label: '🔄 Ajustar Tópicos ou Título', action: 'ajustar_briefing' }
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
          text: `⚠️ Houve uma instabilidade momentânea na conexão com o Gemini: ${err?.message || 'Falha de comunicação'}. Verifique sua chave de API ou tente novamente.`
        }
      ]);
    } finally {
      setIsAiProcessing(false);
      setAiLoadingStatus('');
    }
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

Agora você pode revisar todo o editorial da obra capítulo por capítulo, fazer ajustes no texto ou folhear o livro diagramado pronto para a Amazon KDP.`,
          suggestedActions: [
            { label: '📋 Abrir Revisão Editorial Completa', action: 'abrir_revisao', primary: true },
            { label: '📖 Folhear Livro Diagramado', action: 'ir_preview' },
            { label: '🎨 Gerar Capa KDP', action: 'ir_capa' }
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
      autor: 'Autor Book Engin',
      genero: tipoLivro === 'tecnico' ? 'Técnico' : (tipoLivro === 'autoajuda' ? 'Autoajuda' : 'Geral'),
      idioma: 'português',
      tipoLivro,
      capitulos: [],
      meta: { palavrasPorCap: 900, paginasAlvo: paginasAlvo || 80 }
    };

    try {
      let plano = editorialPlan;
      if (!plano) {
        setAiLoadingStatus('Estruturando plano de capítulos com o Gemini...');
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
              { label: '📋 Revisão Editorial da Obra', action: 'abrir_revisao' },
              { label: '📖 Ver no Livro Diagramado', action: 'ir_preview' }
            ]
          : [
              { label: '🎉 Obra Concluída! Abrir Revisão Editorial', action: 'abrir_revisao', primary: true },
              { label: '📖 Ver Livro Diagramado', action: 'ir_preview' },
              { label: '🎨 Gerar Capa KDP', action: 'ir_capa' }
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
    } else if (action === 'abrir_revisao') {
      setInternalTab('revisao');
    } else if (action === 'ir_preview') {
      onNavigateToPreview();
    } else if (action === 'ir_capa') {
      onNavigateToCover();
    } else if (action === 'pedir_mais_pratico') {
      setUserInput('Quero que o livro seja ainda mais prático e direto ao ponto, com passos numerados para resolver os problemas.');
    } else if (action === 'pedir_sumario') {
      setUserInput('Por favor, me mostre uma proposta detalhada de sumário com os títulos de cada capítulo antes de começarmos.');
    } else if (action === 'ajustar_briefing') {
      setUserInput('Gostei, mas quero fazer alguns ajustes na estrutura antes de começarmos.');
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
        display: 'flex',
        flexDirection: 'column',
        height: '730px',
        maxHeight: 'calc(100vh - 160px)',
        background: '#ffffff',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.07)',
        overflow: 'hidden',
        position: 'relative',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. TOP BAR DO ESTÚDIO PROFISSIONAL */}
      <div
        style={{
          flexShrink: 0,
          padding: '12px 18px',
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
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
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                CoAuthor Studio Pro
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  background: '#e0f2fe',
                  color: '#0284c7',
                  border: '1px solid #bae6fd',
                  padding: '1px 6px',
                  borderRadius: 4
                }}
              >
                Gemini 2.5 / Flash
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {capsConcluidos === 0
                ? 'Diálogo inteligente de alinhamento com IA em tempo real'
                : `${capsConcluidos} de ${totalCaps} capítulos prontos (${totalPalavras.toLocaleString()} palavras)`}
            </div>
          </div>
        </div>

        {/* CONTROLES: CHAVE API + ABAS DE VISUALIZAÇÃO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Botão Configurar Chave Gemini */}
          <button
            type="button"
            onClick={() => setIsApiKeyModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 10px',
              borderRadius: 6,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Configurar ou verificar sua chave de API do Gemini"
          >
            <Key size={12} color="#0284c7" />
            <span>API Key Gemini</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          </button>

          {/* Alternador Chat vs Revisão Editorial */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: 2, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setInternalTab('chat')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: internalTab === 'chat' ? '#ffffff' : 'transparent',
                color: internalTab === 'chat' ? '#0284c7' : '#64748b',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: internalTab === 'chat' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <MessageSquare size={13} /> Chat CoAuthor
            </button>

            <button
              type="button"
              onClick={() => setInternalTab('revisao')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: internalTab === 'revisao' ? '#ffffff' : 'transparent',
                color: internalTab === 'revisao' ? '#059669' : '#64748b',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: internalTab === 'revisao' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <BookCheck size={13} /> Revisão Editorial
              {capsConcluidos > 0 && (
                <span style={{ background: '#10b981', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 10 }}>
                  {capsConcluidos}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onNavigateToPreview}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 11px',
              borderRadius: 6,
              background: '#0284c7',
              border: 'none',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
            }}
          >
            <BookOpen size={13} /> Livro Diagramado
          </button>
        </div>
      </div>

      {/* SELETOR DE PERFIL EDITORIAL (SEGMENTED CONTROL MODERNO) */}
      <div
        style={{
          flexShrink: 0,
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto'
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>
          Perfil Editorial da Obra:
        </span>

        {[
          { id: 'tecnico' as CoAuthorBookType, label: '⚙️ Livro Técnico & Resolução de Problemas', desc: 'Didático, sem emoção' },
          { id: 'autoajuda' as CoAuthorBookType, label: '📘 Autoajuda & Desenvolvimento Pessoal', desc: 'Transformação e hábitos' },
          { id: 'pratico' as CoAuthorBookType, label: '🛠️ Guia Prático Passo a Passo (How-To)', desc: 'Instrução e checklists' },
          { id: 'ficcao' as CoAuthorBookType, label: '📖 Ficção & Narrativa', desc: 'História e enredo' }
        ].map(item => {
          const isSelected = tipoLivro === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={isAiProcessing}
              onClick={() => handleChangeTipoLivro(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: isAiProcessing ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                background: isSelected ? '#0284c7' : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                border: isSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                boxShadow: isSelected ? '0 1px 4px rgba(2, 132, 199, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title={item.desc}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* BARRA DE PROGRESSO DE CAPÍTULOS */}
      <div style={{ flexShrink: 0, width: '100%', height: 3, background: '#e2e8f0' }}>
        <div
          style={{
            height: '100%',
            width: `${progressoPercent}%`,
            background: 'linear-gradient(90deg, #0284c7, #059669)',
            transition: 'width 0.3s ease'
          }}
        />
      </div>

      {/* ==================================================================== */}
      {/* MODO 1: CHAT COM COAUTHOR (100% ESTÁTICO & INTELIGÊNCIA REAL GEMINI) */}
      {/* ==================================================================== */}
      {internalTab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* FEED DE MENSAGENS COM SCROLL ESTRITAMENTE INTERNO */}
          <div
            ref={chatScrollContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
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
                    maxWidth: msg.sender === 'user' ? '76%' : '88%',
                    background: msg.sender === 'user'
                      ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                      : msg.sender === 'system'
                      ? '#f1f5f9'
                      : '#ffffff',
                    color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                    padding: '14px 18px',
                    borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    fontSize: 13,
                    lineHeight: 1.6,
                    wordBreak: 'break-word'
                  }}
                >
                  {/* CABEÇALHO DO BALÃO */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 8,
                      fontSize: 11,
                      fontWeight: 800,
                      color: msg.sender === 'user' ? '#bae6fd' : '#64748b'
                    }}
                  >
                    {msg.sender === 'agent' && <Bot size={14} color="#0284c7" />}
                    <span>
                      {msg.sender === 'agent'
                        ? 'CoAuthor AI'
                        : msg.sender === 'user'
                        ? 'Você (Autor)'
                        : 'Sistema'}
                    </span>
                    <span>• {msg.timestamp}</span>
                  </div>

                  {/* CONTEÚDO FORMATADO */}
                  <div>{renderRichText(msg.text)}</div>

                  {/* CARD DE ALINHAMENTO CONCLUÍDO (SE GERADO PELO GEMINI) */}
                  {msg.alignmentCard && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 16,
                        background: '#f0fdf4',
                        border: '1.5px solid #10b981',
                        borderRadius: 10,
                        color: '#0f172a'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <CheckCircle2 size={18} color="#059669" />
                        <strong style={{ fontSize: 13, color: '#065f46' }}>
                          Estrutura Editorial Aprovada e Pronta para Escrita!
                        </strong>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                        <div><strong>Título:</strong> {msg.alignmentCard.titulo}</div>
                        {msg.alignmentCard.subtitulo && (
                          <div><strong>Subtítulo:</strong> {msg.alignmentCard.subtitulo}</div>
                        )}
                        <div><strong>Perfil:</strong> {msg.alignmentCard.tipo.toUpperCase()}</div>
                        <div><strong>Tema:</strong> {msg.alignmentCard.premissa}</div>
                        <div><strong>Capítulos Planejados:</strong> {msg.alignmentCard.totalCaps} capítulos</div>
                      </div>

                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleActionClick('iniciar_cap_1')}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
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
                        marginTop: 12,
                        padding: 14,
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        color: '#0f172a'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0284c7' }}>
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
                            gap: 4,
                            padding: '4px 10px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#475569'
                          }}
                        >
                          {isCopiedChapter === msg.chapterPreview.numero ? (
                            <>
                              <Check size={12} color="#059669" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copiar Texto
                            </>
                          )}
                        </button>
                      </div>

                      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#475569', fontStyle: 'italic', lineHeight: 1.5 }}>
                        "{msg.chapterPreview.resumo}"
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#059669',
                          background: '#ecfdf5',
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid #a7f3d0'
                        }}
                      >
                        <span>✓ Manuscrito Oficial KDP ({msg.chapterPreview.palavras} palavras)</span>
                        <button
                          type="button"
                          onClick={() => setInternalTab('revisao')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#059669',
                            fontWeight: 800,
                            fontSize: 11,
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Revisar no Editorial →
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
                        gap: 6,
                        marginTop: 12,
                        paddingTop: 10,
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
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: isAiProcessing ? 'not-allowed' : 'pointer',
                            background: act.primary
                              ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                              : '#ffffff',
                            color: act.primary ? '#ffffff' : '#334155',
                            border: '1px solid',
                            borderColor: act.primary ? '#0284c7' : '#cbd5e1',
                            boxShadow: act.primary ? '0 1px 4px rgba(2, 132, 199, 0.2)' : 'none',
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

            {/* INDICADOR DE CARREGAMENTO GIRATÓRIO EM TEMPO REAL */}
            {isAiProcessing && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 18px',
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1.5px solid #0284c7',
                  width: 'fit-content',
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.15)'
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: '3px solid #e0f2fe',
                    borderTopColor: '#0284c7',
                    animation: 'spin 0.8s linear infinite'
                  }}
                />
                <div>
                  <div style={{ fontSize: 12, color: '#0369a1', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={13} color="#0284c7" /> {aiLoadingStatus || 'Processando com inteligência Gemini...'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Consultando modelo Gemini e estruturando resposta sob medida.
                  </div>
                </div>

                {autoPilotActive && (
                  <button
                    type="button"
                    onClick={() => handleActionClick('parar_piloto')}
                    style={{
                      marginLeft: 12,
                      padding: '5px 12px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: '1px solid #fca5a5',
                      borderRadius: 6,
                      fontSize: 11,
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

          {/* BARRA INFERIOR DE CHAT E INPUT DO AUTOR (FIXA NA TELA) */}
          <div
            style={{
              flexShrink: 0,
              padding: '12px 18px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            {/* SUGESTÕES RÁPIDAS DE CONTINUAÇÃO */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {[
                '✍️ Escrever próximo capítulo',
                '💡 Quero um livro técnico e didático',
                '📘 Quero um livro de autoajuda e foco',
                '🛠️ Quero um guia prático passo a passo',
                '🔍 Sugira os títulos dos capítulos'
              ].map((sugestao, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isAiProcessing}
                  onClick={() => {
                    setUserInput(sugestao.replace(/^..\s*/, ''));
                  }}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: isAiProcessing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {sugestao}
                </button>
              ))}
            </div>

            {/* FORMULÁRIO DE ENVIO */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendUserInput();
              }}
              style={{ display: 'flex', gap: 8, alignItems: 'center' }}
            >
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isAiProcessing}
                placeholder={
                  isAiProcessing
                    ? 'Aguarde... o Agente CoAuthor está processando com o Gemini...'
                    : 'Digite sua mensagem ou instrução para o CoAuthor (ex: ideia do livro, correção ou pedido)...'
                }
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  background: isAiProcessing ? '#f1f5f9' : '#f8fafc',
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />

              <button
                type="submit"
                disabled={!userInput.trim() || isAiProcessing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '11px 20px',
                  borderRadius: 8,
                  background: !userInput.trim() || isAiProcessing
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: !userInput.trim() || isAiProcessing ? 'not-allowed' : 'pointer',
                  boxShadow: userInput.trim() && !isAiProcessing ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'
                }}
              >
                {isAiProcessing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Gerando...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Enviar
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODO 2: REVISÃO EDITORIAL COMPLETA DA OBRA (CAPÍTULO POR CAPÍTULO) */}
      {/* ==================================================================== */}
      {internalTab === 'revisao' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* HEADER DA REVISÃO EDITORIAL */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 18,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ClipboardCheck size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                  Revisão Editorial Completa da Obra
                </h3>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  padding: '2px 8px',
                  borderRadius: 6
                }}>
                  {tipoLivro.toUpperCase()}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                Revise, edite ou refine cada capítulo antes da diagramação final no Amazon KDP.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setInternalTab('chat')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ← Voltar ao Chat
              </button>

              <button
                type="button"
                onClick={onNavigateToPreview}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                }}
              >
                <BookOpen size={14} /> Ver Livro Diagramado
              </button>
            </div>
          </div>

          {/* MÉTRICAS EDITORIAIS GLOBAIS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, display: 'block' }}>Capítulos Produzidos:</span>
              <strong style={{ fontSize: 18, color: '#0f172a' }}>{capsConcluidos} de {totalCaps}</strong>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, display: 'block' }}>Volume Total de Palavras:</span>
              <strong style={{ fontSize: 18, color: '#0284c7' }}>{totalPalavras.toLocaleString()} palavras</strong>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, display: 'block' }}>Páginas Estimadas KDP:</span>
              <strong style={{ fontSize: 18, color: '#059669' }}>~{Math.max(24, Math.ceil(totalPalavras / 250))} páginas</strong>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, display: 'block' }}>Tempo Médio de Leitura:</span>
              <strong style={{ fontSize: 18, color: '#d97706' }}>~{Math.max(1, Math.ceil(totalPalavras / 200))} min</strong>
            </div>
          </div>

          {/* CHECKLIST DE CONFORMIDADE KDP */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
            <strong style={{ fontSize: 13, color: '#0f172a', display: 'block', marginBottom: 10 }}>
              Diretrizes de Qualidade Editorial Amazon KDP:
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, fontSize: 12, color: '#334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669' }}>
                <CheckCircle2 size={16} /> Tom 100% calibrado para {tipoLivro.toUpperCase()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669' }}>
                <CheckCircle2 size={16} /> Vocabulário popular e sem prolixidade
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669' }}>
                <CheckCircle2 size={16} /> Fechamento de parágrafos com ponto final (.)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669' }}>
                <CheckCircle2 size={16} /> Continuidade lógica entre capítulos
              </div>
            </div>
          </div>

          {/* LISTA DE CAPÍTULOS PARA REVISÃO E EDIÇÃO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <strong style={{ fontSize: 14, color: '#0f172a' }}>
              Manuscrito dos Capítulos ({capsConcluidos} disponíveis):
            </strong>

            {capsConcluidos === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', background: '#ffffff', borderRadius: 10, border: '1px dashed #cbd5e1', color: '#64748b' }}>
                Nenhum capítulo foi escrito ainda. Volte ao chat para começar a cocriação do livro com o Agente CoAuthor.
              </div>
            ) : (
              (bookState?.capitulos || []).map((cap, idx) => {
                const isExpanded = expandedChapterIdx === idx;
                const isEditing = editingChapterIdx === idx;
                const numPalavras = cap.texto.split(/\s+/).filter(Boolean).length;

                return (
                  <div
                    key={idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 16,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          background: '#e0f2fe',
                          color: '#0284c7',
                          fontWeight: 800,
                          fontSize: 12,
                          padding: '3px 8px',
                          borderRadius: 6
                        }}>
                          Cap. {idx + 1}
                        </span>
                        <div>
                          <strong style={{ fontSize: 14, color: '#0f172a' }}>{cap.titulo}</strong>
                          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>({numPalavras} palavras)</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedChapterIdx(null);
                            } else {
                              setExpandedChapterIdx(idx);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#334155'
                          }}
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          {isExpanded ? 'Recolher' : 'Ler Capítulo'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingChapterIdx(idx);
                            setEditedChapterText(cap.texto);
                            setExpandedChapterIdx(idx);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            background: '#ffffff',
                            border: '1px solid #0284c7',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#0284c7'
                          }}
                        >
                          <Edit3 size={13} /> Editar Texto
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(cap.texto);
                            setIsCopiedChapter(idx + 1);
                            setTimeout(() => setIsCopiedChapter(null), 2000);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#475569'
                          }}
                        >
                          {isCopiedChapter === idx + 1 ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                          {isCopiedChapter === idx + 1 ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#0284c7' }}>
                              ✏️ Editando texto do Capítulo {idx + 1}:
                            </span>
                            <textarea
                              rows={14}
                              value={editedChapterText}
                              onChange={(e) => setEditedChapterText(e.target.value)}
                              style={{
                                width: '100%',
                                padding: 12,
                                borderRadius: 8,
                                border: '1px solid #0284c7',
                                fontSize: 13,
                                lineHeight: 1.6,
                                color: '#0f172a',
                                outline: 'none',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box'
                              }}
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => setEditingChapterIdx(null)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: 6,
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  color: '#475569'
                                }}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedChapter(idx)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 16px',
                                  borderRadius: 6,
                                  background: '#059669',
                                  border: 'none',
                                  fontSize: 12,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  color: '#ffffff'
                                }}
                              >
                                <Save size={13} /> Salvar Alterações
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            background: '#f8fafc',
                            padding: 16,
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            fontSize: 13,
                            lineHeight: 1.7,
                            color: '#334155',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {cap.texto}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL PARA CONFIGURAÇÃO DA CHAVE GEMINI API DO USUÁRIO */}
      {/* ==================================================================== */}
      {isApiKeyModalOpen && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: 24,
            maxWidth: 480,
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #cbd5e1'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={18} color="#0284c7" />
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Chave Gemini API do Autor
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              O CoAuthor utiliza a inteligência do <strong>Google Gemini</strong> para conversar de forma real com você e escrever os capítulos. Se desejar usar sua própria chave de API (Google AI Studio), insira-a abaixo:
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', display: 'block', marginBottom: 6 }}>
                Sua Gemini API Key (ex: AIzaSy...):
              </label>
              <input
                type="text"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                placeholder="Cole sua chave AIzaSy... aqui (ou deixe em branco para chave padrão)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 4 }}>
                A chave é salva com segurança no armazenamento local do seu navegador (localStorage).
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCustomKey}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  color: '#ffffff'
                }}
              >
                Salvar Chave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
