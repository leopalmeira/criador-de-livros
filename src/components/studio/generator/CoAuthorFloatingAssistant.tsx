import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, Sparkles, Send, X, Minimize2, Check, RefreshCw,
  BookOpen, ChevronRight, CheckCircle2, MessageSquare, Lightbulb,
  CornerDownLeft, ShieldCheck, Layers, Award, ArrowUpRight
} from 'lucide-react';
import { chamarGeminiTexto, getAvailableApiKeys } from '../../../services/kdp-ai-engine';

export interface CoAuthorFloatingAssistantProps {
  bookState: any | null;
  onApplyEnrichment: (chapterNumber: number, additionText: string) => void;
  onOpenFullStudio?: () => void;
}

interface Message {
  id: string;
  sender: 'agent' | 'user' | 'system';
  timestamp: string;
  text: string;
  suggestionCard?: {
    chapterNumber: number;
    additionText: string;
    rationale: string;
    applied?: boolean;
  };
}

export const CoAuthorFloatingAssistant: React.FC<CoAuthorFloatingAssistantProps> = ({
  bookState,
  onApplyEnrichment,
  onOpenFullStudio
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: 'Olá, autor! Sou o seu CoAuthor Editorial. O seu livro já está gerado na plataforma e estou aqui para analisar o enredo, o fechamento dos arcos, a profundidade das cenas e fazer sugestões de acréscimo sem quebrar o contexto da história. Como posso ajudar agora?'
    }
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Mantém scroll estrito dentro do container do chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const bookTitle = bookState?.titulo || 'Livro em Produção';
  const bookGenre = bookState?.genero || 'Ficção / Literatura';
  const chaptersCount = bookState?.capitulos?.length || 0;

  // Extrai resumo de capítulos para dar contexto completo ao Gemini
  const buildBookContextSummary = () => {
    if (!bookState || !bookState.capitulos || bookState.capitulos.length === 0) {
      return `Livro: "${bookTitle}" | Gênero: "${bookGenre}" (Capítulos ainda não gerados no editor principal).`;
    }

    const capsBrief = bookState.capitulos.map((c: any, i: number) => {
      const conteudoReal = c.texto || c.conteudo || '';
      const trecho = conteudoReal.slice(0, 400).replace(/\n+/g, ' ');
      const totalWords = conteudoReal.split(/\s+/).filter(Boolean).length;
      return `Capítulo ${i + 1}: "${c.titulo || 'Capítulo ' + (i + 1)}" (${totalWords} palavras) - Início: ${trecho}...`;
    }).join('\n');

    return `Obra: "${bookTitle}" por ${bookState.autor || 'Autor'}\nGênero: "${bookGenre}"\nTotal de Capítulos: ${chaptersCount}\n\nVisão Geral dos Capítulos:\n${capsBrief}`;
  };

  const handleSendMessage = async (userPrompt?: string, actionType?: 'enredo' | 'fechamento' | 'profundidade' | 'acrescimo') => {
    const textToSend = userPrompt || inputText.trim();
    if (!textToSend && !actionType) return;

    if (!userPrompt) {
      setInputText('');
    }

    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const bookContext = buildBookContextSummary();
      const currentChapterData = bookState?.capitulos?.[selectedChapter - 1];
      const chapterContentPreview = currentChapterData ? ((currentChapterData.texto || currentChapterData.conteudo || '')).slice(0, 1500) : '';

      const systemInstruction = `Você é um Consultor Editorial Sênior e Co-Autor de Elite para Amazon KDP.
Você está trabalhando diretamente sobre uma obra gerada:
${bookContext}

Suas atribuições como CoAuthor:
1. Analisar a solidez do enredo, coerência interna, consistência de ritmo e amarração das pontas soltas.
2. Analisar o fechamento da obra: se o desfecho cumpre a promessa ao leitor ou precisa de mais clímax e impacto.
3. Analisar a profundidade sensorial, psicológica e temática (ou didática e prática, se for não-ficção/técnico).
4. Sugerir ACRÉSCIMOS orgânicos de cenas, diálogos ou reflexões que enriquecem o texto SEM QUEBRAR o enredo já existente.

FORMATO ESPECIAL DE ACRÉSCIMO:
Quando fizer uma sugestão de acréscimo para um capítulo específico, formule o texto sugerido entre as tags:
<<<SUGESTAO_ACRESCIMO>>>
CAPITULO: ${selectedChapter}
JUSTIFICATIVA: [Por que este trecho enriquece o capítulo sem ferir o contexto]
TEXTO: [O texto pronto para ser inserido no capítulo]
<<<FIM_SUGESTAO>>>

Se for uma análise geral, responda com tom profissional, didático e acolhedor de um editor de bestsellers.`;

      const geminiPrompt = `[Contexto da Consulta do Autor]:
Mensagem do Autor: "${textToSend}"
Capítulo focado no momento: Capítulo ${selectedChapter} (Título: "${currentChapterData?.titulo || 'Capítulo ' + selectedChapter}")
Trecho atual do capítulo focado: "${chapterContentPreview}"`;

      const resultadoIA = await chamarGeminiTexto(geminiPrompt, {
        systemInstruction,
        temperature: 0.85,
        maxTokens: 3200
      });
      const respostaIA = (resultadoIA && resultadoIA.texto) ? resultadoIA.texto : '';

      // Verifica se a resposta contém uma sugestão estruturada de acréscimo
      let cleanText = respostaIA;
      let cardData: Message['suggestionCard'] | undefined = undefined;

      const cardMatch = respostaIA.match(/<<<SUGESTAO_ACRESCIMO>>>([\s\S]*?)<<<FIM_SUGESTAO>>>/);
      if (cardMatch) {
        const bloco = cardMatch[1];
        const capNumMatch = bloco.match(/CAPITULO:\s*(\d+)/i);
        const justMatch = bloco.match(/JUSTIFICATIVA:\s*([\s\S]*?)(?=TEXTO:|$)/i);
        const textoMatch = bloco.match(/TEXTO:\s*([\s\S]*)/i);

        const targetCap = capNumMatch ? parseInt(capNumMatch[1], 10) : selectedChapter;
        const rationale = justMatch ? justMatch[1].trim() : 'Enriquecimento narrativo e aprofundamento temático.';
        const addition = textoMatch ? textoMatch[1].trim() : '';

        if (addition) {
          cardData = {
            chapterNumber: targetCap,
            additionText: addition,
            rationale
          };
        }

        cleanText = respostaIA.replace(/<<<SUGESTAO_ACRESCIMO>>>[\s\S]*?<<<FIM_SUGESTAO>>>/, '').trim();
        if (!cleanText) {
          cleanText = `Analisei o contexto e formulei um acréscimo especial para o Capítulo ${targetCap}. Veja a sugestão abaixo e clique em aprovar para enriquecer o texto diretamente:`;
        }
      }

      const agentMsg: Message = {
        id: `msg_agent_${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: cleanText,
        suggestionCard: cardData
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg_err_${Date.now()}`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Não foi possível consultar o CoAuthor: ${err.message || 'Verifique sua conexão ou configure sua chave Gemini API'}.`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCardEnrichment = (card: NonNullable<Message['suggestionCard']>, msgId: string) => {
    onApplyEnrichment(card.chapterNumber, card.additionText);

    // Marca o card como aplicado
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.suggestionCard) {
        return {
          ...m,
          suggestionCard: { ...m.suggestionCard, applied: true }
        };
      }
      return m;
    }));

    const feedbackMsg: Message = {
      id: `msg_applied_${Date.now()}`,
      sender: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `✓ Acréscimo aprovado com sucesso! O novo trecho foi incorporado ao Capítulo ${card.chapterNumber} do seu livro preservando o enredo.`
    };
    setMessages(prev => [...prev, feedbackMsg]);
  };

  return (
    <>
      {/* BOTÃO FLUTUANTE FIXO NO RODAPÉ DA TELA */}
      {!isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 20px',
              borderRadius: 30,
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            title="Abrir Agente CoAuthor Editorial para analisar e enriquecer o livro gerado"
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)'
            }}>
              <Bot size={16} color="#ffffff" />
            </div>
            <span>Agente CoAuthor</span>
            {chaptersCount > 0 && (
              <span style={{
                background: '#059669',
                color: '#ffffff',
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 12,
                fontWeight: 800,
                letterSpacing: '0.3px'
              }}>
                {chaptersCount} Caps
              </span>
            )}
          </button>
        </div>
      )}

      {/* JANELA DE CHAT DO COAUTHOR (DOCK FLUTUANTE EXPANSÍVEL) */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 24,
          width: 480,
          maxWidth: 'calc(100vw - 32px)',
          height: isMinimized ? 56 : 640,
          maxHeight: 'calc(100vh - 40px)',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.08)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'height 0.25s ease'
        }}>
          {/* CABEÇALHO DO COAUTHOR */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#ffffff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={16} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  CoAuthor Editorial
                  <span style={{ fontSize: 9, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 6px', borderRadius: 10 }}>
                    IA KDP
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {bookTitle} ({chaptersCount} caps)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                <Minimize2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Fechar Chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* BARRA DE AÇÕES EDITORIAIS RÁPIDAS */}
              <div style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                    Ações de Análise do Livro:
                  </span>
                  {chaptersCount > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: '#64748b' }}>Foco no:</span>
                      <select
                        value={selectedChapter}
                        onChange={(e) => setSelectedChapter(Number(e.target.value))}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#0f172a'
                        }}
                      >
                        {Array.from({ length: chaptersCount }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>Capítulo {num}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('Faça uma análise crítica do enredo geral da obra, verificando a consistência dos arcos, o ritmo dos capítulos e se há furos ou quebras na história.', 'enredo')}
                    disabled={isLoading}
                    style={{
                      padding: '5px 9px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    🔍 Revisar Enredo
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage(`Analise especificamente o fechamento da história (último capítulo). O desfecho resolveu as tensões com impacto satisfatório ou precisa de um final mais marcante?`, 'fechamento')}
                    disabled={isLoading}
                    style={{
                      padding: '5px 9px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    🎯 Fechamento da Obra
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage(`Avalie a profundidade dos personagens, a carga dramática dos diálogos e a ambientação sensorial. Onde a narrativa pode ganhar mais profundidade sem desacelerar?`, 'profundidade')}
                    disabled={isLoading}
                    style={{
                      padding: '5px 9px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    🌊 Aprofundar História
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage(`Elabore uma sugestão de acréscimo rico e orgânico para o Capítulo ${selectedChapter}, adicionando uma nova camada de detalhe ou diálogo memorável sem quebrar o enredo.`, 'acrescimo')}
                    disabled={isLoading}
                    style={{
                      padding: '5px 9px',
                      borderRadius: 6,
                      background: '#eff6ff',
                      border: '1px solid #93c5fd',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#1d4ed8',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    💡 Sugerir Acréscimo
                  </button>
                </div>
              </div>

              {/* ÁREA DE MENSAGENS DO CHAT (ROLA APENAS DENTRO DO CHAT) */}
              <div
                ref={chatContainerRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  background: '#f8fafc'
                }}
              >
                {messages.map((msg) => {
                  const isAgent = msg.sender === 'agent';
                  const isSystem = msg.sender === 'system';

                  if (isSystem) {
                    return (
                      <div
                        key={msg.id}
                        style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: 8,
                          padding: '8px 12px',
                          fontSize: 11,
                          color: '#065f46',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <CheckCircle2 size={14} color="#059669" />
                        <span>{msg.text}</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAgent ? 'flex-start' : 'flex-end',
                        gap: 4
                      }}
                    >
                      <div style={{
                        maxWidth: '88%',
                        padding: '10px 14px',
                        borderRadius: isAgent ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                        background: isAgent ? '#ffffff' : '#0284c7',
                        color: isAgent ? '#1e293b' : '#ffffff',
                        fontSize: 12,
                        lineHeight: 1.5,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        border: isAgent ? '1px solid #e2e8f0' : 'none',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.text}

                        {/* CARD DE SUGESTÃO DE ACRÉSCIMO COM BOTÃO DE APROVAÇÃO */}
                        {msg.suggestionCard && (
                          <div style={{
                            marginTop: 10,
                            padding: 12,
                            borderRadius: 8,
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            color: '#0f172a'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                              <Lightbulb size={14} color="#16a34a" />
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#166534' }}>
                                Sugestão de Acréscimo para o Capítulo {msg.suggestionCard.chapterNumber}:
                              </span>
                            </div>

                            <p style={{ fontSize: 11, color: '#15803d', margin: '0 0 8px 0', fontStyle: 'italic' }}>
                              {msg.suggestionCard.rationale}
                            </p>

                            <div style={{
                              background: '#ffffff',
                              padding: 10,
                              borderRadius: 6,
                              border: '1px solid #bbf7d0',
                              fontSize: 11.5,
                              color: '#1e293b',
                              lineHeight: 1.5,
                              maxHeight: 160,
                              overflowY: 'auto',
                              marginBottom: 10
                            }}>
                              "{msg.suggestionCard.additionText}"
                            </div>

                            {msg.suggestionCard.applied ? (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                color: '#15803d',
                                fontSize: 11,
                                fontWeight: 700
                              }}>
                                <Check size={14} /> Incorporado ao Capítulo {msg.suggestionCard.chapterNumber}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleApplyCardEnrichment(msg.suggestionCard!, msg.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '7px 12px',
                                    borderRadius: 6,
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Sparkles size={13} /> Aprovar e Inserir no Capítulo {msg.suggestionCard.chapterNumber}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(`Por favor, refine ou crie uma variação diferente para o acréscimo do Capítulo ${msg.suggestionCard?.chapterNumber}.`)}
                                  style={{
                                    padding: '7px 10px',
                                    borderRadius: 6,
                                    background: '#ffffff',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  🔄 Outra Variação
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <span style={{ fontSize: 9.5, color: '#94a3b8', margin: '0 4px' }}>
                        {msg.timestamp}
                      </span>
                    </div>
                  );
                })}

                {isLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
                    <RefreshCw size={14} className="animate-spin" color="#0284c7" />
                    <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                      CoAuthor analisando o contexto da obra...
                    </span>
                  </div>
                )}
              </div>

              {/* INPUT DE MENSAGEM DO COAUTHOR */}
              <div style={{
                padding: '10px 12px',
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: 8,
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Pergunte ao CoAuthor sobre enredo, personagens, ritmo..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputText.trim()}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 8,
                    background: !inputText.trim() || isLoading ? '#94a3b8' : '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    cursor: !inputText.trim() || isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Enviar mensagem para o CoAuthor"
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
