import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Bot, Send, Play, Pause, RefreshCw, CheckCircle2,
  BookOpen, ChevronRight, ChevronDown, ChevronUp, Copy, Check,
  Sliders, MessageSquare, AlertCircle, ArrowRight, Zap, Award,
  Edit3, Trash2, Eye, ShieldCheck, FileText, CornerDownLeft
} from 'lucide-react';
import { chamarGeminiTexto } from '../../../services/kdp-ai-engine';
import { ManuscriptIntegrityEngine } from '../../../services/manuscript-integrity-engine';
import {
  orchestrateEditorialPlan,
  buildFallbackEditorialPlan,
  type KdpEditorialPlan
} from '../../../services/kdp-agents-service';

export interface CoAuthorContextData {
  premissaVisao: string;
  elementosChave: string;
  formulaBestseller: string;
}

export interface CoAuthorMessage {
  id: string;
  sender: 'agent' | 'user' | 'system';
  timestamp: string;
  text: string;
  chapterPreview?: {
    numero: number;
    titulo: string;
    resumo: string;
    palavras: number;
    trechoFinal: string;
    textoCompleto: string;
  };
  planPreview?: KdpEditorialPlan;
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

// Exemplos pré-calibrados de alta conversão Amazon KDP
const EXEMPLOS_BESTSELLER: Array<{
  nome: string;
  titulo: string;
  subtitulo: string;
  genero: string;
  dados: CoAuthorContextData;
}> = [
  {
    nome: 'Thriller Psicológico Amazon Top 10',
    titulo: 'O Algoritmo do Silêncio',
    subtitulo: 'Um suspense médico onde cada diagnóstico prevê o inevitável',
    genero: 'Thriller / Mistério Investigativo',
    dados: {
      premissaVisao: 'Um conceituado neurocirurgião descobre que o novo sistema de IA recém-instalado no hospital prediz a morte de pacientes antes que qualquer sintoma apareça. Quando o nome de sua própria filha é inserido na fila de previsões fatais para daqui a 7 dias, ele inicia uma corrida desesperada contra o relógio para descobrir quem alimenta o código.',
      elementosChave: 'A diretora do hospital protegendo o investimento bilionário a todo custo; uma detetive cética que inicialmente desconfia do protagonista; invasão tensa ao servidor subterrâneo; revelação de que mortes foram provocadas para validar os acertos da IA; dilema ético entre cumprir o juramento médico ou agir à margem da lei.',
      formulaBestseller: 'Ritmo implacável estilo Harlan Coben e Dan Brown. Capítulos enxutos e dinâmicos terminando sempre com cliffhangers inegociáveis para o leitor não conseguir largar o Kindle. Zero metáforas prolixas, foco total em ações imediatas, tensão crescente e um clímax bombástico com desfecho 100% conclusivo.'
    }
  },
  {
    nome: 'Desenvolvimento Pessoal Bestseller KDP',
    titulo: 'Foco Inabalável',
    subtitulo: 'O método prático para dominar sua atenção em um mundo de distrações',
    genero: 'Desenvolvimento Pessoal / Hábitos',
    dados: {
      premissaVisao: 'Um guia prático e direto ao ponto para profissionais, estudantes e criadores que sentem a mente sobrecarregada pelo excesso de estímulos digitais. O livro ensina um protocolo diário de 4 blocos de atenção profunda para multiplicar a produtividade sem burnout nem ansiedade.',
      elementosChave: 'A rotina da primeira hora do dia sem celular; o método dos blocos de 45 minutos com recompensa neurológica; exemplos reais do cotidiano de quem trabalha em casa ou no escritório; passo a passo para eliminar vícios de notificação; checklists de fechamento do dia.',
      formulaBestseller: 'Linguagem popular, clara e acessível (sem jargões acadêmicos herméticos). Cada capítulo traz um problema real imediato do leitor, uma solução aplicável nas próximas 24 horas e um resumo acionável no final conectando ao próximo pilar. Foco em retenção contínua e valor percebido imediato na Amazon.'
    }
  },
  {
    nome: 'Romance & Segredos de Família',
    titulo: 'O Último Segredo da Villa Aurora',
    subtitulo: 'Entre vinhedos esquecidos e uma promessa que o tempo não apagou',
    genero: 'Romance Contemporâneo / Drama',
    dados: {
      premissaVisao: 'Após herdar uma propriedade vinícola decadente na serra gaúcha, uma jovem arquiteta em crise profissional encontra um diário oculto de 1968 que revela um amor proibido e o desaparecimento não solucionado da sua avó. Ao restaurar a propriedade, ela se depara com o herdeiro da família rival.',
      elementosChave: 'A rivalidade histórica entre as famílias vinícolas; cartas antigas reveladas aos poucos; o romance proibido de transição enemies-to-lovers com química intensa e diálogos ágeis; a descoberta da verdadeira herança da terra; redenção e reconciliação familiar.',
      formulaBestseller: 'Construção emocional forte com ganchos dramáticos ao final de cada capítulo. Vocabulário popular e afetuoso, ritmo envolvente com segredos desvendados em doses calculadas, e um epílogo reconfortante e inesquecível que encanta leitores vorazes de romance na Amazon.'
    }
  }
];

// ============================================================================
// 1. COMPONENTE: CO-AUTHOR CARD (Para a barra lateral / painel do livro)
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
  onApplyToStandardForm,
  tituloAtual,
  subtituloAtual,
  generoAtual,
  idiomaAtual,
  onUpdateTitleSubtitle,
  totalCaps
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeExemploIdx, setActiveExemploIdx] = useState<number>(0);

  const handleCarregarExemplo = (idx: number) => {
    const ex = EXEMPLOS_BESTSELLER[idx];
    if (!ex) return;
    setActiveExemploIdx(idx);
    onChangeContext({ ...ex.dados });
    if (onUpdateTitleSubtitle && (!tituloAtual.trim() || tituloAtual === 'Livro Sem Título')) {
      onUpdateTitleSubtitle(ex.titulo, ex.subtitulo);
    }
  };

  const isFormFilled = Boolean(
    contextData.premissaVisao.trim() &&
    contextData.elementosChave.trim() &&
    contextData.formulaBestseller.trim()
  );

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        border: '1.5px solid #38bdf8',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        boxShadow: '0 4px 16px rgba(14, 165, 233, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Faixa decorativa no topo */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #0284c7, #6366f1, #a855f7)'
        }}
      />

      {/* CABEÇALHO DO CARD */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0284c7, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
            }}
          >
            <Bot size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                Agente CoAuthor · Cocriação KDP
              </h3>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#4338ca',
                  background: '#e0e7ff',
                  padding: '2px 6px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px'
                }}
              >
                Bestseller IA
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
              Escreva a quatro mãos com o agente editorial via 3 caixas de contexto
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={isExpanded ? 'Recolher' : 'Expandir'}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* CONTEÚDO EXPANDIDO */}
      {isExpanded && (
        <div style={{ marginTop: 14 }}>
          {/* BARRA DE BOTÕES DE EXEMPLO RÁPIDO */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              padding: '6px 8px',
              background: '#f1f5f9',
              borderRadius: 6
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={11} color="#0284c7" /> Inspirar com Fórmula Bestseller:
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {EXEMPLOS_BESTSELLER.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCarregarExemplo(idx);
                  }}
                  title={ex.nome}
                  style={{
                    padding: '2px 7px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    background: activeExemploIdx === idx && isFormFilled ? '#0284c7' : '#ffffff',
                    color: activeExemploIdx === idx && isFormFilled ? '#ffffff' : '#334155',
                    border: '1px solid',
                    borderColor: activeExemploIdx === idx && isFormFilled ? '#0284c7' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Exemplo {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* CAIXA 1: VISÃO & PREMISSA */}
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 4
              }}
            >
              1. Visão & Premissa da Obra <span style={{ color: '#0284c7' }}>(Ideia Central & Protagonista)</span>
            </label>
            <textarea
              rows={3}
              value={contextData.premissaVisao}
              onChange={(e) =>
                onChangeContext({ ...contextData, premissaVisao: e.target.value })
              }
              placeholder="Explique a ideia central do livro, quem é o protagonista (ou especialista), o cenário inicial e o grande conflito que move a obra..."
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                lineHeight: 1.4,
                background: '#ffffff',
                color: '#0f172a',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* CAIXA 2: ELEMENTOS CHAVE */}
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 4
              }}
            >
              2. Elementos-Chave & Tópicos Inegociáveis <span style={{ color: '#0284c7' }}>(Cenas, Personagens & Segredos)</span>
            </label>
            <textarea
              rows={3}
              value={contextData.elementosChave}
              onChange={(e) =>
                onChangeContext({ ...contextData, elementosChave: e.target.value })
              }
              placeholder="Quais personagens secundários, reviravoltas essenciais, cenários marcantes ou conceitos práticos NÃO podem faltar de jeito nenhum?"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                lineHeight: 1.4,
                background: '#ffffff',
                color: '#0f172a',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* CAIXA 3: FÓRMULA BESTSELLER AMAZON */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 4
              }}
            >
              3. Fórmula Bestseller Amazon & Desfecho <span style={{ color: '#0284c7' }}>(Ritmo, Cliffhangers & Conclusão)</span>
            </label>
            <textarea
              rows={3}
              value={contextData.formulaBestseller}
              onChange={(e) =>
                onChangeContext({ ...contextData, formulaBestseller: e.target.value })
              }
              placeholder="Como deve ser a experiência de leitura? (Ex: capítulos ágeis com ganchos intensos para não largar o Kindle, sem metáforas prolixas, vocabulário popular e clímax definitivo com ponto final)."
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                lineHeight: 1.4,
                background: '#ffffff',
                color: '#0f172a',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* TAGS DE PARÂMETROS SINCRONIZADOS */}
          <div
            style={{
              padding: '8px 10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              marginBottom: 12,
              fontSize: 11,
              color: '#475569',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center'
            }}
          >
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Parâmetros ativos da obra:</span>
            <span style={{ background: '#ffffff', padding: '2px 6px', borderRadius: 4, border: '1px solid #cbd5e1' }}>
              📚 {generoAtual || 'Gênero KDP'}
            </span>
            <span style={{ background: '#ffffff', padding: '2px 6px', borderRadius: 4, border: '1px solid #cbd5e1' }}>
              🌐 {idiomaAtual}
            </span>
            <span style={{ background: '#ffffff', padding: '2px 6px', borderRadius: 4, border: '1px solid #cbd5e1' }}>
              📑 {totalCaps} Capítulos
            </span>
            <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 6px', borderRadius: 4, border: '1px solid #a7f3d0', fontWeight: 600 }}>
              ✓ Sem Metáforas / Vocabulário Popular
            </span>
          </div>

          {/* BOTÕES DE DISPARO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                background: 'linear-gradient(135deg, #0284c7, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(2, 132, 199, 0.28)',
                transition: 'transform 0.15s ease'
              }}
            >
              <Bot size={16} /> Iniciar Conversa com Agente CoAuthor
            </button>

            {onApplyToStandardForm && (
              <button
                type="button"
                onClick={onApplyToStandardForm}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Copia os dados das 3 caixas diretamente para a premissa e diferencial do formulário tradicional"
              >
                <ArrowRight size={13} /> Sincronizar com o Painel Tradicional KDP
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. COMPONENTE: CO-AUTHOR STUDIO WORKSPACE (Área conversacional completa)
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
  const [messages, setMessages] = useState<CoAuthorMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isAiWriting, setIsAiWriting] = useState<boolean>(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string>('');
  const [autoPilotActive, setAutoPilotActive] = useState<boolean>(false);
  const [isCopiedChapter, setIsCopiedChapter] = useState<number | null>(null);
  const [editorialPlan, setEditorialPlan] = useState<KdpEditorialPlan | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoPilotStopRef = useRef<boolean>(false);

  // Rolagem suave até a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiWriting]);

  // Mensagem inicial de recepção e análise de mercado da obra
  useEffect(() => {
    if (messages.length === 0) {
      inicializarSessaoCoAuthor();
    }
  }, []);

  const inicializarSessaoCoAuthor = async () => {
    const caps = totalCapsDesejado || 8;
    const titulo = bookState?.titulo || 'Nova Obra KDP';
    const genero = bookState?.genero || 'Geral';
    const idioma = bookState?.idioma || 'português';

    // Monta a mensagem de abertura do Agente
    const msgBoasVindas: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Olá! Eu sou seu **Agente CoAuthor Editorial** do Book Engin. 📚✨

Analisei atentamente o contexto das suas **3 caixas de briefing** para a obra **"${titulo}"** (${genero}):

• **Premissa Central:** ${contextData.premissaVisao.slice(0, 160)}...
• **Pontos Inegociáveis:** ${contextData.elementosChave.slice(0, 140)}...
• **Fórmula Bestseller Amazon:** ${contextData.formulaBestseller.slice(0, 140)}...

Apliquei os mesmos parâmetros de ouro do motor editorial KDP: **texto 100% literal sem metáforas prolixas, vocabulário popular e natural, bíblia narrativa progressiva contínua** e **fechamento sem frases cortadas**.

Como prefere conduzir a nossa coautoria agora?`,
      suggestedActions: [
        { label: '✍️ Escrever Capítulo 1 Agora', action: 'gerar_cap_1', primary: true },
        { label: '📋 Ver Estrutura dos Capítulos KDP', action: 'ver_roteiro' },
        { label: '🚀 Piloto Automático: Escrever Livro Completo', action: 'piloto_automatico' }
      ]
    };

    setMessages([msgBoasVindas]);
  };

  // Garante plano editorial arquitetado
  const obterOuCriarPlano = async (): Promise<KdpEditorialPlan> => {
    if (editorialPlan) return editorialPlan;

    const total = totalCapsDesejado || 8;
    const title = bookState?.titulo || 'Obra Editorial KDP';
    const subtitle = bookState?.subtitulo || '';
    const genre = bookState?.genero || 'Ficção';
    const language = bookState?.idioma || 'português';

    setAiStatusMessage('Orquestrando plano de capítulos e ganchos de retenção KDP...');

    try {
      const plano = await orchestrateEditorialPlan(
        {
          title,
          subtitle,
          genre,
          language,
          topic: `${contextData.premissaVisao} | Elementos-Chave: ${contextData.elementosChave}`,
          promise: contextData.formulaBestseller,
          differentiator: 'Fórmula de retenção dos maiores bestsellers da Amazon KDP'
        },
        total
      );
      setEditorialPlan(plano);
      return plano;
    } catch {
      const fallback = buildFallbackEditorialPlan(
        {
          title,
          subtitle,
          genre,
          language,
          topic: `${contextData.premissaVisao} | Elementos: ${contextData.elementosChave}`,
          promise: contextData.formulaBestseller
        },
        total
      );
      setEditorialPlan(fallback);
      return fallback;
    }
  };

  // Escrever o próximo capítulo específico
  const escreverProximoCapitulo = async (instrucaoEspecial?: string) => {
    if (isAiWriting) return;

    const livroAtual = bookState || {
      titulo: 'Livro KDP Bestseller',
      subtitulo: '',
      autor: 'Autor Book Engin',
      genero: 'Geral',
      idioma: 'português',
      capitulos: [],
      meta: { palavrasPorCap: 900, paginasAlvo: paginasAlvo || 80 }
    };

    const numCapitulo = livroAtual.capitulos.length + 1;
    const totalCaps = totalCapsDesejado || 8;

    if (numCapitulo > totalCaps) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🎉 **Todos os ${totalCaps} capítulos da sua obra já foram concluídos com sucesso!** O manuscrito está 100% finalizado com desfecho definitivo. Você já pode folhear o livro diagramado ou gerar a capa KDP.`,
          suggestedActions: [
            { label: '📖 Folhear Livro Diagramado', action: 'ir_preview', primary: true },
            { label: '🎨 Gerar Capa KDP Agora', action: 'ir_capa' }
          ]
        }
      ]);
      return;
    }

    setIsAiWriting(true);
    setAiStatusMessage(`Coescrevendo Capítulo ${numCapitulo} de ${totalCaps} com o motor Book Engin...`);

    try {
      const plano = await obterOuCriarPlano();
      const diretrizCapitulo = plano.chapters[numCapitulo - 1] || {
        title: `Capítulo ${numCapitulo}`,
        objective: `Desenvolver a progressão do capítulo ${numCapitulo}`,
        keyPoints: ['Avançar o conflito central', 'Aprofundar os personagens'],
        transition: 'Conectar ao próximo estágio'
      };

      // Resumo contínuo de capítulos anteriores (Bíblia de Continuidade sem perder contexto)
      const historicoEnredo = livroAtual.capitulos.length > 0
        ? livroAtual.capitulos.map((c, idx) => {
            const primeiro = c.texto.slice(0, 140);
            const ultimo = c.texto.slice(-160);
            return `• Cap. ${idx + 1} ("${c.titulo}"): ${primeiro}... [Desfecho: ${ultimo}]`;
          }).join('\n')
        : 'Início da obra.';

      const ultimoCapitulo = livroAtual.capitulos[livroAtual.capitulos.length - 1];
      const ganchoImediato = ultimoCapitulo
        ? `O Capítulo anterior terminou com este parágrafo exato:\n"${ultimoCapitulo.texto.slice(-300)}"`
        : 'Primeira cena da obra.';

      const isEnBook = /ingl|en/i.test(livroAtual.idioma);
      const isEsBook = /espanh|es/i.test(livroAtual.idioma);

      const regraIdioma = isEnBook
        ? 'MANDATORY LANGUAGE: 100% natural, engaging ENGLISH (US/UK).'
        : isEsBook
        ? 'IDIOMA OBRIGATORIO: 100% en ESPAÑOL.'
        : 'IDIOMA OBRIGATÓRIO: PORTUGUÊS. Utilize vocabulário popular e corrente.';

      const isFinal = numCapitulo === totalCaps;

      const systemInstruction = `Você é o Co-Autor e escritor best-seller de literatura na Amazon KDP do Book Engin.
REGRAS OBRIGATÓRIAS INEGOCIÁVEIS:
${regraIdioma}
1. ZERO METÁFORAS: Seja o livro infantil, jovem ou adulto, NUNCA use metáforas, floreios poéticos abstratos ou analogias figuradas. Toda a narrativa, descrições e sentimentos devem ser totalmente literais, realistas e diretos.
2. VOCABULÁRIO POPULAR: Palavras simples, comuns e acessíveis a todos os leitores.
3. COERÊNCIA RIGOROSA: Mantenha rigorosamente os mesmos personagens, nomes, tom e regras do mundo. Nunca invente dados contraditórios.
4. GANCHO DE RETENÇÃO AMAZON: ${isFinal
  ? 'ESTE É O CAPÍTULO FINAL DA OBRA INTEIRA. Entregue um clímax memorável, resolva todos os mistérios e encerre com uma conclusão completa e definitiva terminada com ponto final (.).'
  : 'Termine o capítulo com um cliffhanger ou gancho forte para o leitor não conseguir largar o livro no Kindle.'}
5. FECHAMENTO SEM CORTES: O último parágrafo DEVE terminar com frase 100% completa com ponto final (.).
6. Texto puro para diagramação direta. Sem asteriscos e sem notas.

FORMATO ESTRITO:
TITULO: ${isEnBook ? `Chapter ${numCapitulo}: Title` : `Capítulo ${numCapitulo}: Título Criativo`}
TEXTO:
(Parágrafos separados por linha em branco)`;

      let prompt = `━━━ CONTEXTO DA COAUTORIA ━━━
Obra: "${livroAtual.titulo}"
Premissa Original: ${contextData.premissaVisao}
Elementos Inegociáveis: ${contextData.elementosChave}
Fórmula Bestseller Desejada: ${contextData.formulaBestseller}

━━━ DIRETRIZ DO CAPÍTULO ${numCapitulo} DE ${totalCaps} ━━━
Título Planejado: ${diretrizCapitulo.title}
Objetivo: ${diretrizCapitulo.objective}
Pontos-Chave: ${(diretrizCapitulo.keyPoints || []).join('; ')}
Transição: ${diretrizCapitulo.transition}

━━━ GANCHO DE CONTINUIDADE DO CAPÍTULO ANTERIOR ━━━
${ganchoImediato}

━━━ HISTÓRICO DE CONTINUIDADE ACUMULADO ━━━
${historicoEnredo}`;

      if (instrucaoEspecial) {
        prompt += `\n\n━━━ INSTRUÇÃO ESPECÍFICA DO AUTOR PARA ESTE CAPÍTULO ━━━\n${instrucaoEspecial}`;
      }

      const palavrasMeta = livroAtual.meta?.palavrasPorCap || 900;
      const maxTokens = Math.max(4000, Math.round(palavrasMeta * 4.2));

      const res = await chamarGeminiTexto(prompt, {
        temperature: 0.88,
        maxTokens,
        systemInstruction,
        onStatusUpdate: (st) => setAiStatusMessage(st)
      });

      // Extrai e sanitiza o capítulo
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

      // Assegura pontuação terminal sem cortes
      if (!/[.!?…"”»]$/.test(finalTexto)) {
        finalTexto += '.';
      }

      const tituloCap = mt ? mt[1].trim() : `Capítulo ${numCapitulo}`;

      const novoCap = {
        titulo: tituloCap,
        texto: finalTexto
      };

      const livroAtualizado = {
        ...livroAtual,
        capitulos: [...livroAtual.capitulos, novoCap]
      };

      onUpdateBookState(livroAtualizado);
      onSaveProgress(livroAtualizado);

      // Resumo e preview para o chat
      const palavras = finalTexto.split(/\s+/).filter(Boolean).length;
      const primeiroParagrafo = finalTexto.split(/\n+/)[0] || '';
      const ultimoParagrafo = finalTexto.slice(-220);

      const msgResposta: CoAuthorMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `✨ **Capítulo ${numCapitulo} ("${tituloCap}") coescrito com sucesso!**

Desenvolvemos a narrativa mantendo **continuidade absoluta**, sem metáforas e com vocabulário popular direto.

📊 **Extensão:** ${palavras} palavras  
🔗 **Gancho de Fechamento:** "${ultimoParagrafo.slice(-140)}"`,
        chapterPreview: {
          numero: numCapitulo,
          titulo: tituloCap,
          resumo: `${primeiroParagrafo.slice(0, 180)}...`,
          palavras,
          trechoFinal: ultimoParagrafo,
          textoCompleto: finalTexto
        },
        suggestedActions: numCapitulo < totalCaps
          ? [
              { label: `✍️ Escrever Capítulo ${numCapitulo + 1}`, action: 'proximo_cap', primary: true },
              { label: '⚡ Continuar no Piloto Automático', action: 'piloto_automatico' },
              { label: '📖 Ver no Livro Diagramado', action: 'ir_preview' }
            ]
          : [
              { label: '🎉 Obra Concluída! Ver Livro Diagramado', action: 'ir_preview', primary: true },
              { label: '🎨 Criar Capa KDP Oficial', action: 'ir_capa' }
            ]
      };

      setMessages(prev => [...prev, msgResposta]);

      // Piloto automático sequencial
      if (autoPilotActive && !autoPilotStopRef.current && numCapitulo < totalCaps) {
        setAiStatusMessage(`Pausa de 1s para o próximo capítulo do Piloto Automático...`);
        setTimeout(() => {
          if (!autoPilotStopRef.current) {
            escreverProximoCapitulo();
          }
        }, 1200);
      } else if (numCapitulo >= totalCaps) {
        setAutoPilotActive(false);
      }
    } catch (err: any) {
      console.error('Erro na coautoria:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ Tive uma breve oscilação na conexão com a inteligência editorial: ${err?.message || 'Erro temporário'}. Vamos tentar novamente?`,
          suggestedActions: [
            { label: '🔄 Tentar Novamente', action: 'proximo_cap', primary: true }
          ]
        }
      ]);
      setAutoPilotActive(false);
    } finally {
      setIsAiWriting(false);
      setAiStatusMessage('');
    }
  };

  // Enviar instrução do usuário no chat
  const handleSendMessage = async () => {
    const text = userInput.trim();
    if (!text || isAiWriting) return;

    setUserInput('');

    // Adiciona mensagem do autor
    const userMsg: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text
    };

    setMessages(prev => [...prev, userMsg]);

    // Responde contextualmente e executa
    await escreverProximoCapitulo(text);
  };

  // Dispara ações rápidas sugeridas
  const handleAction = async (action: string) => {
    if (action === 'gerar_cap_1' || action === 'proximo_cap') {
      await escreverProximoCapitulo();
    } else if (action === 'piloto_automatico') {
      autoPilotStopRef.current = false;
      setAutoPilotActive(true);
      await escreverProximoCapitulo();
    } else if (action === 'parar_piloto') {
      autoPilotStopRef.current = true;
      setAutoPilotActive(false);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'system',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: '⏹ Piloto automático pausado. Você pode continuar quando quiser.'
        }
      ]);
    } else if (action === 'ver_roteiro') {
      setIsAiWriting(true);
      setAiStatusMessage('Carregando roteiro editorial dos capítulos...');
      const plano = await obterOuCriarPlano();
      setIsAiWriting(false);

      const roteiroMsg: CoAuthorMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `📋 **Roteiro dos ${plano.chapters.length} Capítulos Bestseller:**\n\n` +
          plano.chapters.map((c, i) => `**Cap. ${i + 1}: ${c.title}**\n• *Objetivo:* ${c.objective}\n• *Gancho:* ${c.transition}`).join('\n\n'),
        suggestedActions: [
          { label: '✍️ Começar a Escrever', action: 'proximo_cap', primary: true }
        ]
      };
      setMessages(prev => [...prev, roteiroMsg]);
    } else if (action === 'ir_preview') {
      onNavigateToPreview();
    } else if (action === 'ir_capa') {
      onNavigateToCover();
    }
  };

  // Contadores da obra
  const capsConcluidos = bookState?.capitulos?.length || 0;
  const totalCaps = totalCapsDesejado || 8;
  const totalPalavras = (bookState?.capitulos || []).reduce((acc, c) => acc + c.texto.split(/\s+/).filter(Boolean).length, 0);
  const progressoPercent = Math.min(100, Math.round((capsConcluidos / totalCaps) * 100));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 650,
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
      }}
    >
      {/* BARRA SUPERIOR DO ESTÚDIO COAUTHOR */}
      <div
        style={{
          padding: '12px 18px',
          background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0284c7, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Bot size={18} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.2px' }}>
                CoAuthor Agent · Estúdio Editorial
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#0284c7',
                  color: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: 4
                }}
              >
                Amazon KDP Mode
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Coescrita de alta fidelidade baseada nas 3 caixas de contexto
            </div>
          </div>
        </div>

        {/* METRICS & QUICK BUTTONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right', fontSize: 11 }}>
            <div style={{ fontWeight: 700, color: '#38bdf8' }}>
              {capsConcluidos} de {totalCaps} Capítulos ({progressoPercent}%)
            </div>
            <div style={{ color: '#94a3b8', fontSize: 10 }}>
              {totalPalavras.toLocaleString()} palavras acumuladas
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToPreview}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 10px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <BookOpen size={13} /> Livro Diagramado
          </button>
        </div>
      </div>

      {/* BARRA DE PROGRESSO VISUAL */}
      <div style={{ width: '100%', height: 3, background: '#e2e8f0' }}>
        <div
          style={{
            height: '100%',
            width: `${progressoPercent}%`,
            background: 'linear-gradient(90deg, #0284c7, #10b981)',
            transition: 'width 0.3s ease'
          }}
        />
      </div>

      {/* FEED DE MENSAGENS (CHAT COM O AGENTE) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: '#f8fafc'
        }}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '100%'
            }}
          >
            {/* BALÃO DA MENSAGEM */}
            <div
              style={{
                maxWidth: msg.sender === 'user' ? '78%' : '88%',
                background: msg.sender === 'user'
                  ? 'linear-gradient(135deg, #0284c7, #2563eb)'
                  : msg.sender === 'system'
                  ? '#f1f5f9'
                  : '#ffffff',
                color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                padding: '12px 16px',
                borderRadius: 10,
                border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                fontSize: 13,
                lineHeight: 1.5,
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap'
              }}
            >
              {/* Remetente e Timestamp */}
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
                    ? 'Você (Autor)'
                    : 'Sistema'}
                </span>
                <span>• {msg.timestamp}</span>
              </div>

              {/* Texto principal */}
              <div>{msg.text}</div>

              {/* PRÉVIA DO CAPÍTULO GERADO */}
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
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#059669',
                      background: '#ecfdf5',
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #a7f3d0'
                    }}
                  >
                    ✓ Adicionado ao Manuscrito Oficial KDP ({msg.chapterPreview.palavras} palavras)
                  </div>
                </div>
              )}

              {/* BOTÕES DE AÇÕES SUGERIDAS */}
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
                      disabled={isAiWriting}
                      onClick={() => handleAction(act.action)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: isAiWriting ? 'not-allowed' : 'pointer',
                        background: act.primary
                          ? 'linear-gradient(135deg, #0284c7, #2563eb)'
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

        {/* INDICADOR DE ESCRITA DA IA EM TEMPO REAL */}
        {isAiWriting && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #bae6fd',
              width: 'fit-content',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.1)'
            }}
          >
            <RefreshCw size={14} color="#0284c7" className="spin" />
            <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>
              {aiStatusMessage || 'O Agente CoAuthor está escrevendo com o Book Engin...'}
            </div>
            {autoPilotActive && (
              <button
                type="button"
                onClick={() => handleAction('parar_piloto')}
                style={{
                  marginLeft: 8,
                  padding: '2px 8px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Pausar Piloto
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* BARRA INFERIOR DE CHAT E INPUT DO AUTOR */}
      <div
        style={{
          padding: '12px 18px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}
      >
        {/* SUGESTÕES RÁPIDAS DE INSTRUÇÃO */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            '✍️ Escrever próximo capítulo',
            '⚡ Aumentar ritmo e tensão',
            '🔍 Adicionar revelação surpreendente',
            '👥 Diálogos mais afiados e rápidos',
            '🎯 Preparar clímax memorável'
          ].map((sugestao, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isAiWriting}
              onClick={() => {
                setUserInput(sugestao.replace(/^..\s*/, ''));
              }}
              style={{
                whiteSpace: 'nowrap',
                padding: '4px 8px',
                borderRadius: 4,
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {sugestao}
            </button>
          ))}
        </div>

        {/* CAMPO DE ENTRADA E BOTÃO ENVIAR */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isAiWriting}
            placeholder={
              isAiWriting
                ? 'Aguarde a finalização do capítulo...'
                : 'Fale com o CoAuthor: peça ajustes, novas cenas ou direcione o próximo capítulo...'
            }
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              background: '#f8fafc',
              color: '#0f172a',
              outline: 'none'
            }}
          />

          <button
            type="submit"
            disabled={!userInput.trim() || isAiWriting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              borderRadius: 8,
              background: !userInput.trim() || isAiWriting
                ? '#cbd5e1'
                : 'linear-gradient(135deg, #0284c7, #2563eb)',
              color: '#ffffff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: !userInput.trim() || isAiWriting ? 'not-allowed' : 'pointer'
            }}
          >
            <Send size={14} /> Enviar
          </button>
        </form>
      </div>
    </div>
  );
};
