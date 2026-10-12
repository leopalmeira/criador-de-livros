import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Bot, Send, Play, Pause, RefreshCw, CheckCircle2,
  BookOpen, ChevronRight, Copy, Check, Sliders, MessageSquare,
  AlertCircle, ArrowRight, Zap, Award, Edit3, Trash2, Eye,
  ShieldCheck, FileText, CornerDownLeft, Compass, RotateCw,
  Wrench, HeartHandshake, Layers, BookCheck, ClipboardCheck,
  ChevronDown, ChevronUp, Save, X
} from 'lucide-react';
import { chamarGeminiTexto } from '../../../services/kdp-ai-engine';
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
  stepPrompt?: number; // 1 = premissa, 2 = elementos, 3 = formula
  chapterPreview?: {
    numero: number;
    titulo: string;
    resumo: string;
    palavras: number;
    trechoFinal: string;
    textoCompleto: string;
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

// Exemplos pré-calibrados de alta conversão Amazon KDP para diferentes tipos de livro
const EXEMPLOS_PRONTOS: Array<{
  nome: string;
  tipo: CoAuthorBookType;
  badge: string;
  premissa: string;
  elementos: string;
  formula: string;
}> = [
  {
    nome: 'Livro Técnico: Engenharia de Prompts & IA',
    tipo: 'tecnico',
    badge: '⚙️ Técnico / Resolução de Problemas',
    premissa: 'Um livro técnico e didático que ensina profissionais a resolverem problemas reais de automação, dados e fluxos de trabalho usando IA, sem jargões desnecessários.',
    elementos: 'Arquitetura de comandos estruturados, técnicas de Few-Shot e Chain-of-Thought, como evitar alucinações de dados, automação de tarefas repetitivas e resolução de erros comuns.',
    formula: 'Didática 100% direta e objetiva, sem ficção ou floreios. Cada capítulo apresenta um conceito, o passo a passo de aplicação, exemplos práticos e soluções para problemas frequentes.'
  },
  {
    nome: 'Autoajuda & Foco: Vencendo a Distração Digital',
    tipo: 'autoajuda',
    badge: '📘 Autoajuda & Desenvolvimento',
    premissa: 'Um livro de desenvolvimento pessoal focado em ajudar profissionais a vencerem a sobrecarga mental e reconquistarem 4 horas diárias de foco profundo com serenidade.',
    elementos: 'O método dos blocos de 45 minutos; rotinas matinais sem notificações; estudos de caso reais de superação; desintoxicação de dopamina rápida e checklists acionáveis.',
    formula: 'Linguagem popular, inspiradora e encorajadora. Cada capítulo traz um problema concreto do dia a dia e uma ferramenta prática aplicável nas próximas 24 horas.'
  },
  {
    nome: 'Guia Prático: Como Sair das Dívidas em 90 Dias',
    tipo: 'pratico',
    badge: '🛠️ Guia Prático Passo a Passo',
    premissa: 'Um guia prático e pragmático para diagnosticar vazamentos financeiros, negociar dívidas com credores e montar uma reserva de segurança sem fórmulas mágicas.',
    elementos: 'Planilha de diagnóstico em 3 passos; roteiro de negociação com bancos; cortes de gastos sem sofrimento; reestruturação de renda extra e plano blindado de 90 dias.',
    formula: 'Passo a passo numerado, orientações diretas ao ponto, advertências de armadilhas comuns e lista de verificação de ação imediata ao final de cada capítulo.'
  },
  {
    nome: 'Thriller Médico & Conspiração: O Diagnóstico Oculto',
    tipo: 'ficcao',
    badge: '📖 Ficção & Narrativa',
    premissa: 'Um cirurgião descobre que o novo sistema de IA do hospital prevê a morte de pacientes antes dos sintomas, e sua própria filha é a próxima na lista.',
    elementos: 'A diretora ambiciosa ocultando falhas; invasão tensa ao data center subterrâneo; uma aliada na corregedoria; reviravoltas intensas e clímax conclusivo.',
    formula: 'Capítulos dinâmicos com cliffhangers intensos no final de cada um, ritmo acelerado estilo Dan Brown, vocabulário popular e desfecho 100% definitivo.'
  }
];

// Utilitário para renderizar texto formatado sem deixar asteriscos crus de markdown
function renderRichText(text: string): React.ReactNode {
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lines.map((line, lIdx) => {
        if (!line.trim()) {
          return <div key={lIdx} style={{ height: 4 }} />;
        }

        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        const cleanLine = isBullet ? line.trim().replace(/^[•-]\s*/, '') : line;

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
            <div key={lIdx} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ color: '#0284c7', fontWeight: 700 }}>•</span>
              <span>{renderedLine}</span>
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
        background: 'linear-gradient(145deg, #ffffff 0%, #f0f9ff 100%)',
        border: '1.5px solid #0284c7',
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
            }}
          >
            <Bot size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                Agente CoAuthor KDP
              </h3>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#0369a1',
                  background: '#e0f2fe',
                  padding: '2px 5px',
                  borderRadius: 4,
                  textTransform: 'uppercase'
                }}
              >
                Chat Guiado
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
              Técnico, Autoajuda, Prático ou Ficção
            </p>
          </div>
        </div>

        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: temBriefing ? '#059669' : '#0284c7',
            background: temBriefing ? '#ecfdf5' : '#f0f9ff',
            padding: '2px 7px',
            borderRadius: 12,
            border: `1px solid ${temBriefing ? '#a7f3d0' : '#bae6fd'}`
          }}
        >
          {temBriefing ? '✓ Configurado' : '🟢 Pronto'}
        </span>
      </div>

      <p style={{ margin: '0 0 10px', fontSize: 11, color: '#334155', lineHeight: 1.4 }}>
        O CoAuthor calibra o tom para o seu tipo de livro (sem emoção ou drama em obras técnicas, focado em resolver problemas) e coescreve com você capítulo a capítulo.
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
          padding: '10px 14px',
          background: 'linear-gradient(135deg, #0284c7, #0369a1)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
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
// 2. COMPONENTE: CO-AUTHOR STUDIO WORKSPACE (AMBIENTE DE TELA PARADA & ESTÁTICA)
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

  // Tipo de Livro Selecionado (Técnico, Autoajuda, Guia Prático, Ficção)
  const [tipoLivro, setTipoLivro] = useState<CoAuthorBookType>(() => {
    return contextData.tipoLivro || bookState?.tipoLivro || 'tecnico';
  });

  const [messages, setMessages] = useState<CoAuthorMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiLoadingStatus, setAiLoadingStatus] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(1); // 1 = Premissa, 2 = Elementos, 3 = Formula, 4 = Escrita
  const [autoPilotActive, setAutoPilotActive] = useState<boolean>(false);
  const [isCopiedChapter, setIsCopiedChapter] = useState<number | null>(null);
  const [editorialPlan, setEditorialPlan] = useState<KdpEditorialPlan | null>(null);

  // Estados para edição manual no painel de revisão editorial
  const [editingChapterIdx, setEditingChapterIdx] = useState<number | null>(null);
  const [editedChapterText, setEditedChapterText] = useState<string>('');
  const [expandedChapterIdx, setExpandedChapterIdx] = useState<number | null>(null);

  // Armazena temporariamente as respostas das 3 perguntas
  const [respostasBriefing, setRespostasBriefing] = useState<{
    premissa: string;
    elementos: string;
    formula: string;
  }>({
    premissa: contextData.premissaVisao || '',
    elementos: contextData.elementosChave || '',
    formula: contextData.formulaBestseller || ''
  });

  // REF APENAS PARA O SCROLL INTERNO DO CHAT (SEM MEXER NA TELA OU NA JANELA)
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const autoPilotStopRef = useRef<boolean>(false);

  // ROLAGEM EXCLUSIVAMENTE INTERNA: nunca usa scrollIntoView para não movimentar a tela principal
  const scrollToBottomInternal = () => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Só rola o container interno quando uma nova mensagem é adicionada
    scrollToBottomInternal();
  }, [messages.length]);

  // Inicialização do Chat Guiado
  useEffect(() => {
    if (messages.length === 0) {
      iniciarConversaGuiada(tipoLivro);
    }
  }, []);

  // Textos das perguntas adaptados ao Tipo de Livro
  const getPergunta1Texto = (tipo: CoAuthorBookType) => {
    switch (tipo) {
      case 'tecnico':
        return `**Pergunta 1 de 3: Qual é o tema técnico ou problema prático que o livro ensinará a resolver?**
*(Me diga qual conceito, ferramenta, método ou habilidade você vai ensinar e para qual nível de leitor: iniciante, intermediário ou profissional).*`;
      case 'autoajuda':
        return `**Pergunta 1 de 3: Qual é a grande transformação pessoal que o livro proporciona ao leitor?**
*(Qual dor, hábito nocivo, ansiedade ou obstáculo mental a obra ensina a superar e qual é o método central).*`;
      case 'pratico':
        return `**Pergunta 1 de 3: Qual processo passo a passo ou tarefa prática a obra ensinará a executar do início ao fim?**
*(Qual é o objetivo concreto, quais ferramentas/materiais serão usados e qual o resultado esperado).*`;
      case 'ficcao':
      default:
        return `**Pergunta 1 de 3: Sobre o que é a história e quem são os protagonistas?**
*(Me conte a ideia central do enredo, quem são os personagens principais e o grande conflito da obra).*`;
    }
  };

  const getPergunta2Texto = (tipo: CoAuthorBookType) => {
    switch (tipo) {
      case 'tecnico':
        return `**Pergunta 2 de 3: Quais conceitos fundamentais, métodos práticos, ferramentas e erros comuns NÃO podem faltar nos capítulos?**
*(Cite metodologias, boas práticas, casos práticos de resolução de problemas e advertências essenciais).*`;
      case 'autoajuda':
        return `**Pergunta 2 de 3: Quais princípios, hábitos, lições práticas e exercícios NÃO podem faltar na obra?**
*(Cite estudos de caso reais de superação, rotinas diárias e ferramentas de autodomínio que o leitor precisa aplicar).*`;
      case 'pratico':
        return `**Pergunta 2 de 3: Quais etapas sequenciais, instruções práticas e advertências NÃO podem faltar?**
*(Cite passos essenciais, macetes de execução, materiais e erros comuns que o leitor deve evitar).*`;
      case 'ficcao':
      default:
        return `**Pergunta 2 de 3: Quais personagens vitais, cenas marcantes ou reviravoltas NÃO podem faltar na obra?**
*(Cite segredos a desvendar, antagonistas, conflitos secundários e clímax esperado).*`;
    }
  };

  const getPergunta3Texto = (tipo: CoAuthorBookType) => {
    switch (tipo) {
      case 'tecnico':
        return `**Pergunta 3 de 3: Qual abordagem didática você prefere para os capítulos?**
*(Ex: 100% direto ao ponto sem enrolação, com passos numerados, explicações claras de cada termo e dicas de como diagnosticar e resolver erros comuns).*`;
      case 'autoajuda':
        return `**Pergunta 3 de 3: Qual o tom da obra e formato de aplicação diária?**
*(Ex: Tom encorajador e pragmático, sem metáforas abstratas, com um plano de ação imediato para as próximas 24 horas ao final de cada capítulo).*`;
      case 'pratico':
        return `**Pergunta 3 de 3: Como você quer que as instruções sejam entregues?**
*(Ex: Passo a passo claro com tópicos de ação rápida, dicas de especialista e checklist de verificação final).*`;
      case 'ficcao':
      default:
        return `**Pergunta 3 de 3: Qual o ritmo da leitura e como você quer que a história termine?**
*(Ex: Ritmo dinâmico, ganchos nos finais de cada capítulo para o Kindle e desfecho 100% definitivo com ponto final).*`;
    }
  };

  const iniciarConversaGuiada = (tipoAtivo: CoAuthorBookType) => {
    const nomePerfil =
      tipoAtivo === 'tecnico'
        ? 'Livro Técnico / Didático (Resolução de Problemas)'
        : tipoAtivo === 'autoajuda'
        ? 'Autoajuda & Desenvolvimento Pessoal'
        : tipoAtivo === 'pratico'
        ? 'Guia Prático Passo a Passo (How-To)'
        : 'Ficção & Narrativa';

    const msg1: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      stepPrompt: 1,
      text: `Olá! Eu sou seu **Agente CoAuthor Editorial** do Book Engin. 📚✨

Estou calibrado para o perfil: **${nomePerfil}**. Aqui os capítulos são desenvolvidos com **linguagem direta, sem floreios desnecessários e 100% focados no objetivo da sua obra**.

Para começarmos a arquitetura editorial do seu livro, responda à primeira pergunta abaixo:

${getPergunta1Texto(tipoAtivo)}`,
      suggestedActions: [
        { label: '⚙️ Exemplo: Livro Técnico & IA', action: 'exemplo_0' },
        { label: '📘 Exemplo: Autoajuda & Foco', action: 'exemplo_1' },
        { label: '🛠️ Exemplo: Guia Prático Financeiro', action: 'exemplo_2' },
        { label: '📖 Exemplo: Ficção & Mistério', action: 'exemplo_3' }
      ]
    };

    setMessages([msg1]);
    setCurrentStep(1);
  };

  // Troca manual do Perfil Editorial pelo usuário
  const handleChangeTipoLivro = (novoTipo: CoAuthorBookType) => {
    setTipoLivro(novoTipo);
    if (bookState) {
      onUpdateBookState({ ...bookState, tipoLivro: novoTipo });
    }

    const nomePerfil =
      novoTipo === 'tecnico'
        ? 'Livro Técnico & Didático'
        : novoTipo === 'autoajuda'
        ? 'Autoajuda & Desenvolvimento Pessoal'
        : novoTipo === 'pratico'
        ? 'Guia Prático Passo a Passo'
        : 'Ficção & Narrativa';

    setMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `🔄 **Perfil Editorial alterado para: ${nomePerfil}**. A inteligência do CoAuthor agora calibrará o tom, regras de escrita e ganchos especificamente para este formato.`
      }
    ]);
  };

  // Enviar resposta do usuário
  const handleSendUserInput = async () => {
    const texto = userInput.trim();
    if (!texto || isAiProcessing) return;

    setUserInput('');

    const userMsg: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: texto
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);

    // FLUXO PASSO A PASSO (3 PERGUNTAS)
    if (currentStep === 1) {
      setRespostasBriefing(prev => ({ ...prev, premissa: texto }));
      setIsAiProcessing(true);
      setAiLoadingStatus('Analisando o tema e calibrando a estrutura da obra...');

      await new Promise(r => setTimeout(r, 400));
      setIsAiProcessing(false);

      const msg2: CoAuthorMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        stepPrompt: 2,
        text: `Excelente tema! O foco da obra está muito bem delineado. 💡

Vamos para o segundo ponto:

${getPergunta2Texto(tipoLivro)}`
      };

      setMessages([...newMsgs, msg2]);
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      setRespostasBriefing(prev => ({ ...prev, elementos: texto }));
      setIsAiProcessing(true);
      setAiLoadingStatus('Estruturando os pilares fundamentais dos capítulos...');

      await new Promise(r => setTimeout(r, 400));
      setIsAiProcessing(false);

      const msg3: CoAuthorMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        stepPrompt: 3,
        text: `Perfeito! Os tópicos centrais já formam uma espinha dorsal sólida. 🎯

Para fecharmos o alinhamento editorial:

${getPergunta3Texto(tipoLivro)}`
      };

      setMessages([...newMsgs, msg3]);
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      const briefingFinal = {
        ...respostasBriefing,
        formula: texto
      };
      setRespostasBriefing(briefingFinal);
      setCurrentStep(4);

      const tipoNome =
        tipoLivro === 'tecnico'
          ? 'Livro Técnico'
          : tipoLivro === 'autoajuda'
          ? 'Autoajuda'
          : tipoLivro === 'pratico'
          ? 'Guia Prático'
          : 'Ficção';

      const msgInicioEscrita: CoAuthorMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Sensacional! Com as suas 3 respostas, a **Bíblia Editorial da Obra** está 100% calibrada. 🚀

• **Formato:** ${tipoNome}
• **Diretriz de Escrita:** Linguagem clara e popular, sem metáforas abstratas, foco total em entregar valor e encerramento de frases com ponto final.

**Escrevendo o Capítulo 1 agora mesmo com o Book Engin...**`
      };

      setMessages([...newMsgs, msgInicioEscrita]);
      await executarEscritaCapitulo(1, briefingFinal);
      return;
    }

    // Se já estiver no passo 4 (em coautoria contínua), processa instrução do autor para o próximo capítulo
    await executarEscritaCapitulo((bookState?.capitulos?.length || 0) + 1, respostasBriefing, texto);
  };

  // Carrega exemplo pronto
  const aplicarExemploPronto = async (idx: number) => {
    const ex = EXEMPLOS_PRONTOS[idx];
    if (!ex) return;

    setTipoLivro(ex.tipo);
    const briefingFinal = {
      premissa: ex.premissa,
      elementos: ex.elementos,
      formula: ex.formula
    };

    setRespostasBriefing(briefingFinal);
    setCurrentStep(4);

    const msgExemplo: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `✨ **Exemplo Carregado: "${ex.nome}"** (${ex.badge})

• **Tema Central:** ${ex.premissa}
• **Tópicos Inegociáveis:** ${ex.elementos}
• **Diretriz Editorial:** ${ex.formula}

**Iniciando a produção do Capítulo 1 com o Book Engin...**`
    };

    setMessages(prev => [...prev, msgExemplo]);
    await executarEscritaCapitulo(1, briefingFinal);
  };

  // Motor de Escrita Capítulo a Capítulo com Calibração Específica por Perfil
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

Agora você pode revisar todo o editorial da obra capítulo por capítulo, ajustar detalhes ou folhear o livro diagramado pronto para a Amazon KDP.`,
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
      // 1. Orquestração do Plano Editorial KDP se ainda não existir
      let plano = editorialPlan;
      if (!plano) {
        setAiLoadingStatus('Orquestrando arquitetura e tópicos estruturados...');
        try {
          plano = await orchestrateEditorialPlan(
            {
              title: livroAtual.titulo,
              subtitle: livroAtual.subtitulo,
              genre: livroAtual.genero,
              language: livroAtual.idioma,
              topic: `${briefing.premissa} | Elementos: ${briefing.elementos}`,
              promise: briefing.formula,
              differentiator: `Padrão de alta conversão Amazon KDP para ${tipoLivro}`
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

      setAiLoadingStatus(`Redigindo conteúdo com didática do Capítulo ${numCapitulo}...`);

      const diretrizCap = plano.chapters[numCapitulo - 1] || {
        title: `Capítulo ${numCapitulo}`,
        objective: `Desenvolver os ensinamentos do capítulo ${numCapitulo}`,
        keyPoints: ['Apresentar conceito central', 'Passo a passo prático', 'Exemplo de aplicação'],
        transition: 'Conectar ao próximo tópico'
      };

      // Histórico de continuidade
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

      const isEnBook = /ingl|en/i.test(livroAtual.idioma);
      const isEsBook = /espanh|es/i.test(livroAtual.idioma);

      const regraIdioma = isEnBook
        ? 'MANDATORY LANGUAGE: 100% natural, clear ENGLISH (US/UK).'
        : isEsBook
        ? 'IDIOMA OBRIGATORIO: 100% en ESPAÑOL.'
        : 'IDIOMA OBRIGATÓRIO: PORTUGUÊS. Utilize vocabulário popular e corrente.';

      const isFinal = numCapitulo === totalCaps;

      // PROMPT CALIBRADO CONFORME O TIPO DE LIVRO
      let diretrizEstiloPorTipo = '';

      if (tipoLivro === 'tecnico') {
        diretrizEstiloPorTipo = `ESTILO OBRIGATÓRIO: LIVRO TÉCNICO & RESOLUÇÃO DE PROBLEMAS
- NÃO É FICÇÃO: Zero personagens inventados, zero diálogos ficcionais e zero emoção dramática artificial.
- DIDÁTICA PURA: Explique conceitos técnicos de forma clara, lógica e estruturada. Use passos numerados, boas práticas e solução de problemas concretos.
- FOCO PRÁTICO: O leitor comprou o livro para aprender a fazer e resolver problemas. Cada explicação deve ser aplicável.
- ZERO METÁFORAS: Linguagem 100% literal, técnica e objetiva.`;
      } else if (tipoLivro === 'autoajuda') {
        diretrizEstiloPorTipo = `ESTILO OBRIGATÓRIO: AUTOAJUDA & DESENVOLVIMENTO PESSOAL
- FOCO EM TRANSFORMAÇÃO PESSOAL: Linguagem encorajadora, empática e orientada para a ação real na vida do leitor.
- EXERCÍCIOS E HÁBITOS: Cada capítulo deve abordar um obstáculo mental, apresentar uma solução comprovada e entregar passos aplicáveis nas próximas 24 horas.
- ZERO METÁFORAS PROLIXAS: Sem poesia vazia ou abstrações. Seja direto e pragmático.`;
      } else if (tipoLivro === 'pratico') {
        diretrizEstiloPorTipo = `ESTILO OBRIGATÓRIO: GUIA PRÁTICO PASSO A PASSO (HOW-TO)
- INSTRUÇÃO DIRETA: Estrutura em etapas claras, passos numerados, advertências de erros comuns e macetes de execução.
- PRAGMATISMO TOTAL: Vá direto ao ponto. Explique o que fazer, como fazer e como verificar se deu certo.`;
      } else {
        diretrizEstiloPorTipo = `ESTILO OBRIGATÓRIO: FICÇÃO & NARRATIVA
- PERSONAGENS CONSISTENTES: Mantenha rigorosamente os nomes, personalidades e tom dos personagens.
- CONTINUIDADE: Desenvolva a cena com ritmo e ganchos de retenção.
- ZERO METÁFORAS: Linguagem visual e realista sem floreios poéticos rebuscados.`;
      }

      const systemInstruction = `Você é o Co-Autor e escritor especialista na Amazon KDP do Book Engin.
REGRAS OBRIGATÓRIAS INEGOCIÁVEIS:
${regraIdioma}
${diretrizEstiloPorTipo}
1. VOCABULÁRIO POPULAR: Palavras acessíveis, claras e sem jargões desnecessários sem explicação.
2. FECHAMENTO SEM CORTES: O último parágrafo DEVE terminar com frase 100% completa terminando com ponto final (.).
3. ${isFinal
  ? 'ESTE É O CAPÍTULO FINAL DA OBRA. Entregue um desfecho completo, encerre todos os ensinamentos/tramas com uma conclusão definitiva.'
  : 'Conecte suavemente o final do capítulo ao próximo tópico para manter a retenção no Kindle.'}
4. Texto puro pronto para diagramação KDP.

FORMATO ESTRITO:
TITULO: ${isEnBook ? `Chapter ${numCapitulo}: Title` : `Capítulo ${numCapitulo}: Título`}
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

      // Sanitização e fechamento íntegro
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

      // Piloto automático com pausa suave de 1.2s entre capítulos
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
          text: `⚠️ Houve uma breve oscilação na conexão com a inteligência editorial: ${err?.message || 'Erro temporário'}.`,
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
    }
  };

  // Sugestões de mensagens rápidas no chat calibradas por tipo de livro
  const getSugestoesPorTipo = (tipo: CoAuthorBookType) => {
    switch (tipo) {
      case 'tecnico':
        return [
          '✍️ Escrever próximo capítulo',
          '🛠️ Adicionar passo a passo de resolução',
          '💡 Exemplo prático de aplicação no mundo real',
          '🔍 Aprofundar conceitos técnicos essenciais',
          '⚠️ Alertas de erros comuns e como diagnosticar',
          '📋 Resumo dos pontos-chave deste capítulo'
        ];
      case 'autoajuda':
        return [
          '✍️ Escrever próximo capítulo',
          '🎯 Exercício prático para o leitor',
          '💡 Estudo de caso real de superação',
          '⚡ Plano de ação para as próximas 24 horas',
          '🧠 Mudança de mentalidade prática',
          '📋 Resumo e compromisso pessoal do leitor'
        ];
      case 'pratico':
        return [
          '✍️ Escrever próximo capítulo',
          '🛠️ Passo a passo detalhado numerado',
          '⚠️ O que NUNCA fazer (erros frequentes)',
          '🔍 Dica de especialista para acelerar',
          '📋 Checklist de execução imediata'
        ];
      case 'ficcao':
      default:
        return [
          '✍️ Escrever próximo capítulo',
          '⚡ Mais suspense e ritmo rápido',
          '👥 Diálogos dinâmicos',
          '🔍 Revelação surpreendente',
          '🎯 Rumo ao clímax final'
        ];
    }
  };

  const capsConcluidos = bookState?.capitulos?.length || 0;
  const totalCaps = totalCapsDesejado || 8;
  const totalPalavras = (bookState?.capitulos || []).reduce((acc, c) => acc + c.texto.split(/\s+/).filter(Boolean).length, 0);
  const progressoPercent = Math.min(100, Math.round((capsConcluidos / totalCaps) * 100));

  // Salvar edição manual de um capítulo
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
        borderRadius: 12,
        border: '1px solid #cbd5e1',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
        position: 'relative',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. CABEÇALHO FIXO DO AMBIENTE (TELA 100% ESTÁTICA) */}
      <div
        style={{
          flexShrink: 0,
          padding: '12px 18px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}
          >
            <Bot size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                CoAuthor Agent · Estúdio Interativo
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#0284c7',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: 4
                }}
              >
                Amazon Bestseller Mode
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {currentStep < 4
                ? `Fase de Calibração: Pergunta ${currentStep} de 3`
                : `${capsConcluidos} de ${totalCaps} Capítulos Escritos (${totalPalavras.toLocaleString()} palavras)`}
            </div>
          </div>
        </div>

        {/* CONTROLES E ABAS DO COAUTHOR (CHAT OU REVISÃO EDITORIAL) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setInternalTab('chat')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 6,
              background: internalTab === 'chat' ? '#0284c7' : 'rgba(255, 255, 255, 0.1)',
              border: internalTab === 'chat' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <MessageSquare size={13} /> Chat com CoAuthor
          </button>

          <button
            type="button"
            onClick={() => setInternalTab('revisao')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 6,
              background: internalTab === 'revisao' ? '#059669' : 'rgba(255, 255, 255, 0.1)',
              border: internalTab === 'revisao' ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <BookCheck size={13} /> Revisão Editorial da Obra
            {capsConcluidos > 0 && (
              <span style={{ background: '#10b981', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 10 }}>
                {capsConcluidos}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onNavigateToPreview}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 11px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <BookOpen size={13} /> Livro Diagramado
          </button>
        </div>
      </div>

      {/* SELETOR DE PERFIL EDITORIAL (TÉCNICO, AUTOAJUDA, GUIA PRÁTICO, FICÇÃO) */}
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
          Perfil Editorial do Livro:
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
                padding: '4px 10px',
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
      {/* MODO 1: CHAT COM COAUTHOR (100% ESTÁTICO, ROLAGEM APENAS INTERNA) */}
      {/* ==================================================================== */}
      {internalTab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* FEED DE MENSAGENS COM SCROLL ESTRITAMENTE INTERNO */}
          <div
            ref={chatScrollContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
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
                    maxWidth: msg.sender === 'user' ? '76%' : '86%',
                    background: msg.sender === 'user'
                      ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                      : msg.sender === 'system'
                      ? '#f1f5f9'
                      : '#ffffff',
                    color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                    fontSize: 13,
                    lineHeight: 1.5,
                    wordBreak: 'break-word'
                  }}
                >
                  {/* CABEÇALHO DO BALÃO */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      color: msg.sender === 'user' ? '#bae6fd' : '#64748b'
                    }}
                  >
                    {msg.sender === 'agent' && <Bot size={12} color="#0284c7" />}
                    <span>
                      {msg.sender === 'agent'
                        ? 'Agente CoAuthor'
                        : msg.sender === 'user'
                        ? 'Você'
                        : 'Sistema'}
                    </span>
                    <span>• {msg.timestamp}</span>
                  </div>

                  {/* CONTEÚDO FORMATADO */}
                  <div>{renderRichText(msg.text)}</div>

                  {/* PRÉVIA DO CAPÍTULO CONCLUÍDO */}
                  {msg.chapterPreview && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 12,
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
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>
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
                            padding: '3px 8px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: '#475569'
                          }}
                        >
                          {isCopiedChapter === msg.chapterPreview.numero ? (
                            <>
                              <Check size={11} color="#059669" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy size={11} /> Copiar Texto
                            </>
                          )}
                        </button>
                      </div>

                      <p style={{ margin: '0 0 6px', fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
                        "{msg.chapterPreview.resumo}"
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#059669',
                          background: '#ecfdf5',
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: '1px solid #a7f3d0'
                        }}
                      >
                        <span>✓ Salvo no Manuscrito Oficial KDP ({msg.chapterPreview.palavras} palavras)</span>
                        <button
                          type="button"
                          onClick={() => setInternalTab('revisao')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#059669',
                            fontWeight: 700,
                            fontSize: 10,
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
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: '1px solid',
                        borderColor: msg.sender === 'user' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0'
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
                            fontWeight: 700,
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
                  gap: 10,
                  padding: '12px 16px',
                  background: '#ffffff',
                  borderRadius: 10,
                  border: '1.5px solid #0284c7',
                  width: 'fit-content',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.15)'
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
                  <div style={{ fontSize: 12, color: '#0369a1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={13} color="#0284c7" /> {aiLoadingStatus || 'Processando com inteligência editorial...'}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                    O Book Engin está mantendo integridade e calibração de estilo ({tipoLivro.toUpperCase()}).
                  </div>
                </div>

                {autoPilotActive && (
                  <button
                    type="button"
                    onClick={() => handleActionClick('parar_piloto')}
                    style={{
                      marginLeft: 10,
                      padding: '4px 10px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: '1px solid #fca5a5',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
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
            {/* SUGESTÕES RÁPIDAS CALIBRADAS POR PERFIL */}
            {currentStep >= 4 && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {getSugestoesPorTipo(tipoLivro).map((sugestao, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAiProcessing}
                    onClick={() => {
                      setUserInput(sugestao.replace(/^..\s*/, ''));
                    }}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '4px 9px',
                      borderRadius: 4,
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: isAiProcessing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
            )}

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
                    ? 'Aguarde... o Agente CoAuthor está gerando o conteúdo...'
                    : currentStep === 1
                    ? 'Digite sua resposta: qual é a ideia central e o tema do seu livro?'
                    : currentStep === 2
                    ? 'Digite sua resposta: quais tópicos ou elementos inegociáveis?'
                    : currentStep === 3
                    ? 'Digite sua resposta: qual deve ser a abordagem e tom dos capítulos?'
                    : 'Fale com o CoAuthor: peça ajustes, novos tópicos ou continue o livro...'
                }
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: isAiProcessing ? '#f1f5f9' : '#f8fafc',
                  color: '#0f172a',
                  outline: 'none'
                }}
              />

              <button
                type="submit"
                disabled={!userInput.trim() || isAiProcessing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 18px',
                  borderRadius: 8,
                  background: !userInput.trim() || isAiProcessing
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !userInput.trim() || isAiProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                {isAiProcessing ? (
                  <>
                    <RefreshCw size={14} className="spin" /> Gerando...
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
                  fontWeight: 700,
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
                  fontWeight: 700,
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
                    {/* LINHA DE TÍTULO DO CAPÍTULO */}
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
                            fontWeight: 600,
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
                            fontWeight: 600,
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
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: '#475569'
                          }}
                        >
                          {isCopiedChapter === idx + 1 ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                          {isCopiedChapter === idx + 1 ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>

                    {/* CONTEÚDO EXPANDIDO / MODO DE EDIÇÃO */}
                    {isExpanded && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7' }}>
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
                                  fontWeight: 600,
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
                                  fontWeight: 700,
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
    </div>
  );
};
