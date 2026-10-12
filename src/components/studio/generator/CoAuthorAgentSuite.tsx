import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Bot, Send, Play, Pause, RefreshCw, CheckCircle2,
  BookOpen, ChevronRight, Copy, Check, Sliders, MessageSquare,
  AlertCircle, ArrowRight, Zap, Award, Edit3, Trash2, Eye,
  ShieldCheck, FileText, CornerDownLeft, Compass, RotateCw
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

// Exemplos pré-calibrados de alta conversão Amazon KDP para teste instantâneo
const EXEMPLOS_PRONTOS = [
  {
    nome: 'Thriller Médico & IA',
    premissa: 'Um cirurgião descobre que o novo sistema de IA do hospital prevê a morte de pacientes antes dos sintomas, e sua própria filha é a próxima na lista.',
    elementos: 'A diretora ambiciosa ocultando falhas; invasão tensa ao data center subterrâneo; uma detetive que desconfia do médico mas se torna aliada.',
    formula: 'Capítulos curtos com cliffhangers intensos no final de cada um, ritmo acelerado estilo Dan Brown, vocabulário popular e clímax definitivo.'
  },
  {
    nome: 'Desenvolvimento Pessoal & Foco',
    premissa: 'Um guia prático para profissionais vencerem a distração digital e aplicarem blocos diários de foco profundo sem estresse ou ansiedade.',
    elementos: 'O método dos blocos de 45 minutos; rotinas matinais sem notificações; histórias de casos reais de superação; checklists acionáveis.',
    formula: 'Linguagem simples, popular e encorajadora. Cada capítulo traz um problema concreto e uma ferramenta aplicável nas próximas 24 horas.'
  },
  {
    nome: 'Romance & Segredos de Família',
    premissa: 'Ao herdar uma propriedade vinícola na serra, uma jovem arquiteta descobre um diário de 1968 que revela um amor proibido e o herdeiro rival.',
    elementos: 'Rivalidade histórica entre vinhedos; dinâmica enemies-to-lovers; cartas secretas reveladas gradualmente; redenção e conciliação familiar.',
    formula: 'Construção dramática envolvente, ganchos emocionais no final de cada capítulo, diálogos rápidos e desfecho marcante e conclusivo.'
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

        // Tópicos com bullet point
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        const cleanLine = isBullet ? line.trim().replace(/^[•-]\s*/, '') : line;

        // Processa partes em negrito (**texto**)
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
              Cocriação em 3 perguntas rápidas com IA
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
        O Agente Editorial faz 3 perguntas sobre a sua história e coescreve o livro inteiro com você, mantendo total coerência e ganchos da Amazon.
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
// 2. COMPONENTE: CO-AUTHOR STUDIO WORKSPACE (Ambiente de tela parada)
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
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiLoadingStatus, setAiLoadingStatus] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(1); // 1 = Premissa, 2 = Elementos, 3 = Formula, 4 = Escrita
  const [autoPilotActive, setAutoPilotActive] = useState<boolean>(false);
  const [isCopiedChapter, setIsCopiedChapter] = useState<number | null>(null);
  const [editorialPlan, setEditorialPlan] = useState<KdpEditorialPlan | null>(null);

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoPilotStopRef = useRef<boolean>(false);

  // Rolagem suave até a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiProcessing]);

  // Inicialização do Chat com a Primeira Pergunta Guiada
  useEffect(() => {
    if (messages.length === 0) {
      iniciarConversaGuiada();
    }
  }, []);

  const iniciarConversaGuiada = () => {
    const titulo = bookState?.titulo || 'Nova Obra KDP';
    const msg1: CoAuthorMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      stepPrompt: 1,
      text: `Olá! Eu sou seu **Agente CoAuthor Editorial** do Book Engin. 📚✨

Vou estruturar e coescrever seu livro com você aplicando os padrões de alta retenção da Amazon KDP. Para começarmos no caminho certo, responda à primeira pergunta abaixo:

**Pergunta 1 de 3: Sobre o que você gostaria de escrever?**
*(Me conte a ideia central do livro, quem é o protagonista ou especialista e qual é a grande transformação ou conflito que move a obra).*`,
      suggestedActions: [
        { label: '✨ Usar Exemplo de Thriller Médico', action: 'exemplo_0' },
        { label: '✨ Usar Exemplo de Desenvolvimento Pessoal', action: 'exemplo_1' },
        { label: '✨ Usar Exemplo de Romance', action: 'exemplo_2' }
      ]
    };

    setMessages([msg1]);
    setCurrentStep(1);
  };

  // Enviar resposta e avançar as 3 perguntas
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

    // FLUXO PASSO A PASSO (3 PERGUNTAS)
    if (currentStep === 1) {
      // Recebeu a Premissa (Passo 1) -> Pergunta Elementos-Chave (Passo 2)
      setRespostasBriefing(prev => ({ ...prev, premissa: texto }));
      setIsAiProcessing(true);
      setAiLoadingStatus('Analisando sua premissa e calibrando nicho KDP...');

      await new Promise(r => setTimeout(r, 600));
      setIsAiProcessing(false);

      const msg2: CoAuthorMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        stepPrompt: 2,
        text: `Excelente ideia! Já vejo um potencial de leitura contínua fantástico aqui. 💡

Agora vamos para o segundo ponto:

**Pergunta 2 de 3: Quais elementos-chave, personagens vitais, cenas marcantes ou tópicos inegociáveis NÃO podem faltar na obra?**
*(Cite segredos a desvendar, conflitos secundários, métodos práticos ou reviravoltas essenciais).*`
      };

      setMessages([...newMsgs, msg2]);
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      // Recebeu Elementos (Passo 2) -> Pergunta Fórmula Bestseller (Passo 3)
      setRespostasBriefing(prev => ({ ...prev, elementos: texto }));
      setIsAiProcessing(true);
      setAiLoadingStatus('Estruturando personagens e tópicos inegociáveis...');

      await new Promise(r => setTimeout(r, 600));
      setIsAiProcessing(false);

      const msg3: CoAuthorMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        stepPrompt: 3,
        text: `Os pilares centrais estão muito bem definidos! 🎯

Para fecharmos a arquitetura editorial:

**Pergunta 3 de 3: Qual deve ser o tom e o ritmo da leitura e como você quer que a história termine?**
*(Ex: ritmo acelerado com cliffhangers intensos no final de cada capítulo para prender o leitor no Kindle, vocabulário popular e direto, clímax bombástico e desfecho 100% definitivo).*`
      };

      setMessages([...newMsgs, msg3]);
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      // Recebeu a Fórmula Bestseller (Passo 3) -> Inicia a Escrita do Livro!
      const briefingFinal = {
        ...respostasBriefing,
        formula: texto
      };
      setRespostasBriefing(briefingFinal);
      setCurrentStep(4);

      // Mensagem de confirmação do Agente
      const msgInicioEscrita: CoAuthorMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Sensacional! Temos tudo o que precisamos. 🚀

Com as suas 3 respostas, estruturei a **Bíblia de Continuidade Narrativa** com os mesmos parâmetros rigorosos do motor KDP: **zero metáforas prolixas, vocabulário popular e natural, continuidade absoluta e encerramento com ponto final**.

**Estou orquestrando os capítulos e escrevendo o Capítulo 1 agora mesmo com o Book Engin...**`
      };

      setMessages([...newMsgs, msgInicioEscrita]);

      // Dispara a escrita do Capítulo 1
      await executarEscritaCapitulo(1, briefingFinal);
      return;
    }

    // Se já estiver no passo 4 (em coautoria contínua), processa instrução do autor para o próximo capítulo
    await executarEscritaCapitulo((bookState?.capitulos?.length || 0) + 1, respostasBriefing, texto);
  };

  // Carrega exemplo pronto e começa a escrever direto
  const aplicarExemploPronto = async (idx: number) => {
    const ex = EXEMPLOS_PRONTOS[idx];
    if (!ex) return;

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
      text: `✨ **Exemplo Carregado: "${ex.nome}"**

• **Premissa:** ${ex.premissa}
• **Elementos:** ${ex.elementos}
• **Fórmula Bestseller:** ${ex.formula}

**Iniciando a produção do Capítulo 1 com o Book Engin...**`
    };

    setMessages(prev => [...prev, msgExemplo]);
    await executarEscritaCapitulo(1, briefingFinal);
  };

  // Motor de Escrita Capítulo a Capítulo com Indicador Visual
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

Você pode visualizar o manuscrito diagramado no padrão KDP ou gerar a capa oficial da obra.`,
          suggestedActions: [
            { label: '📖 Folhear Livro Diagramado', action: 'ir_preview', primary: true },
            { label: '🎨 Gerar Capa KDP', action: 'ir_capa' }
          ]
        }
      ]);
      setAutoPilotActive(false);
      return;
    }

    setIsAiProcessing(true);
    setAiLoadingStatus(`Escrevendo Capítulo ${numCapitulo} de ${totalCaps} com o Book Engin...`);

    const livroAtual = bookState || {
      titulo: 'Livro KDP Bestseller',
      subtitulo: '',
      autor: 'Autor Book Engin',
      genero: 'Geral',
      idioma: 'português',
      capitulos: [],
      meta: { palavrasPorCap: 900, paginasAlvo: paginasAlvo || 80 }
    };

    try {
      // 1. Orquestração do Plano Editorial KDP se ainda não existir
      let plano = editorialPlan;
      if (!plano) {
        setAiLoadingStatus('Orquestrando arquitetura e ganchos de retenção da Amazon...');
        try {
          plano = await orchestrateEditorialPlan(
            {
              title: livroAtual.titulo,
              subtitle: livroAtual.subtitulo,
              genre: livroAtual.genero,
              language: livroAtual.idioma,
              topic: `${briefing.premissa} | Elementos: ${briefing.elementos}`,
              promise: briefing.formula,
              differentiator: 'Fórmula de retenção dos maiores bestsellers da Amazon KDP'
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

      setAiLoadingStatus(`Criando cena e diálogos do Capítulo ${numCapitulo}...`);

      const diretrizCap = plano.chapters[numCapitulo - 1] || {
        title: `Capítulo ${numCapitulo}`,
        objective: `Desenvolver os conflitos do capítulo ${numCapitulo}`,
        keyPoints: ['Avançar trama principal', 'Aprofundar motivações'],
        transition: 'Conectar ao próximo evento'
      };

      // Bíblia narrativa de continuidade acumulada
      const historicoEnredo = livroAtual.capitulos.length > 0
        ? livroAtual.capitulos.map((c, idx) => {
            const inicio = c.texto.slice(0, 140);
            const fim = c.texto.slice(-160);
            return `• Cap. ${idx + 1} ("${c.titulo}"): ${inicio}... [Desfecho: ${fim}]`;
          }).join('\n')
        : 'Início da obra.';

      const ultimoCap = livroAtual.capitulos[livroAtual.capitulos.length - 1];
      const ganchoImediato = ultimoCap
        ? `O Capítulo anterior terminou com este trecho exato:\n"${ultimoCap.texto.slice(-280)}"`
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
6. Texto puro pronto para diagramação KDP.

FORMATO ESTRITO:
TITULO: ${isEnBook ? `Chapter ${numCapitulo}: Title` : `Capítulo ${numCapitulo}: Título Criativo`}
TEXTO:
(Parágrafos separados por linha em branco)`;

      let prompt = `━━━ CONTEXTO DA COAUTORIA ━━━
Obra: "${livroAtual.titulo}"
Premissa Central: ${briefing.premissa}
Elementos Inegociáveis: ${briefing.elementos}
Fórmula Bestseller Desejada: ${briefing.formula}

━━━ DIRETRIZ DO CAPÍTULO ${numCapitulo} DE ${totalCaps} ━━━
Título Planejado: ${diretrizCap.title}
Objetivo: ${diretrizCap.objective}
Pontos-Chave: ${(diretrizCap.keyPoints || []).join('; ')}
Transição: ${diretrizCap.transition}

━━━ GANCHO DE CONTINUIDADE DO CAPÍTULO ANTERIOR ━━━
${ganchoImediato}

━━━ HISTÓRICO DE CONTINUIDADE ACUMULADO ━━━
${historicoEnredo}`;

      if (instrucaoDoAutor) {
        prompt += `\n\n━━━ INSTRUÇÃO ESPECÍFICA DO AUTOR PARA ESTE CAPÍTULO ━━━\n${instrucaoDoAutor}`;
      }

      const palavrasMeta = livroAtual.meta?.palavrasPorCap || 900;
      const maxTokens = Math.max(4000, Math.round(palavrasMeta * 4.2));

      setAiLoadingStatus(`Finalizando escrita do Capítulo ${numCapitulo}...`);

      const res = await chamarGeminiTexto(prompt, {
        temperature: 0.88,
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

      const msgCapituloConcluido: CoAuthorMessage = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `✨ **Capítulo ${numCapitulo}: "${tituloCap}" concluído com sucesso!**

A narrativa foi desenvolvida com **continuidade total**, vocabulário popular e gancho de retenção KDP.

O que achou deste capítulo? Quer ajustar algo ou avançar para o próximo?`,
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
              { label: '📖 Ver no Livro Diagramado', action: 'ir_preview' }
            ]
          : [
              { label: '🎉 Obra Concluída! Ver Livro Diagramado', action: 'ir_preview', primary: true },
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
    } else if (action === 'ir_preview') {
      onNavigateToPreview();
    } else if (action === 'ir_capa') {
      onNavigateToCover();
    }
  };

  const capsConcluidos = bookState?.capitulos?.length || 0;
  const totalCaps = totalCapsDesejado || 8;
  const totalPalavras = (bookState?.capitulos || []).reduce((acc, c) => acc + c.texto.split(/\s+/).filter(Boolean).length, 0);
  const progressoPercent = Math.min(100, Math.round((capsConcluidos / totalCaps) * 100));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '730px',
        maxHeight: 'calc(100vh - 170px)',
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #cbd5e1',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 1. CABEÇALHO FIXO DO AMBIENTE (TELA PARADA) */}
      <div
        style={{
          flexShrink: 0,
          padding: '12px 18px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b'
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

        {/* CONTROLES RÁPIDOS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={onNavigateToPreview}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 11px',
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

      {/* 2. FEED DE MENSAGENS COM SCROLL INTERNO (TELA PARADA) */}
      <div
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
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#059669',
                      background: '#ecfdf5',
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #a7f3d0'
                    }}
                  >
                    ✓ Salvo no Manuscrito Oficial KDP ({msg.chapterPreview.palavras} palavras)
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

        {/* 3. INDICADOR DE CARREGAMENTO GIRATÓRIO EM TEMPO REAL (SEMPRE ATIVO DURANTE O PROCESSAMENTO) */}
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
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.15)',
              animation: 'pulse 1.8s infinite'
            }}
          >
            {/* SPINNER GIRATÓRIO DE ALTA VISIBILIDADE */}
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
                O Book Engin está garantindo integridade e continuidade sem perda de contexto.
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

        <div ref={messagesEndRef} />
      </div>

      {/* 4. BARRA INFERIOR DE CHAT E INPUT DO AUTOR (FIXA NA TELA) */}
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
        {/* SUGESTÕES RÁPIDAS DEPENDENDO DA FASE */}
        {currentStep >= 4 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {[
              '✍️ Escrever próximo capítulo',
              '⚡ Mais suspense e ritmo rápido',
              '👥 Diálogos dinâmicos',
              '🔍 Revelação surpreendente',
              '🎯 Rumo ao clímax final'
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
                ? 'Aguarde... o Agente CoAuthor está gerando a narrativa...'
                : currentStep === 1
                ? 'Digite sua resposta: qual é a ideia central e o tema do seu livro?'
                : currentStep === 2
                ? 'Digite sua resposta: quais personagens e elementos inegociáveis?'
                : currentStep === 3
                ? 'Digite sua resposta: qual o ritmo e como deve ser o desfecho?'
                : 'Fale com o CoAuthor: peça ajustes, novas cenas ou continue o livro...'
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
  );
};
