import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, Copy, Check, MessageSquare, Lightbulb, ExternalLink } from 'lucide-react';
import { chamarGeminiTexto } from '../../../services/kdp-ai-engine';
import { CoAuthorProjectState } from '../../../services/coauthor-workflow-service';

interface Props {
  project: CoAuthorProjectState;
  onApplySnippet?: (text: string, targetField?: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

export const CoAuthorWritingAssistantDrawer: React.FC<Props> = ({ project, onApplySnippet }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Olá! Sou seu **Writing Assistant do CoAuthor**. Estou acompanhando o desenvolvimento de **"${project.bookTitle || project.bookTopic || 'Seu Livro'}"**.\n\nComo posso ajudar você agora? Posso sugerir formas de se destacar dos concorrentes, refinar títulos, pesquisar dados de mercado ou indicar referências para o seu livro!`,
      timestamp: 'Agora',
      suggestions: [
        'Como fazer meu livro se destacar dos concorrentes?',
        'Dê 5 ideias de subtítulos magnéticos com números',
        'Quais são os 3 maiores blogs/sites do nicho para eu usar como fonte?',
        'Sugira uma história real emocionante para ilustrar o capítulo 1'
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    const stepNames: Record<number, string> = {
      1: 'Research (Pesquisa e Posicionamento)',
      2: 'Analysis (Análise de Mercado e Bestsellers)',
      3: 'Book Title (Titulação)',
      4: 'Resources (Fontes e Documentos)',
      5: 'Author Persona (Voz e Estilo do Autor)',
      6: 'Proposed Book (USP e Proposta de Valor)',
      7: 'Details (Parâmetros Técnicos)',
      8: 'Author Bio (Biografia)',
      9: 'Outline (Sumário Dinâmico)',
      10: 'Write (Escrita do Conteúdo)',
      11: 'Description (Sinopse e Copy KDP)',
      12: 'Book Cover (Capa do Livro)',
      13: 'Finish (Finalização)'
    };

    const currentStepName = stepNames[project.currentStep] || `Etapa ${project.currentStep}`;

    const prompt = `Você é o WRITING ASSISTANT & MENTOR EDITORIAL DO COAUTHOR.AI (Metodologia Sean Dollwet).
Você é um estrategista editorial de elite que ajuda autores a escreverem best-sellers autênticos na Amazon KDP em tempo recorde.

## CONTEXTO DO PROJETO ATUAL:
- ETAPA ATUAL DO COAUTHOR: ${currentStepName}
- TÍTULO: ${project.bookTitle || project.selectedTitle || 'Ainda não definido'}
- TEMA: ${project.bookTopic}
- GÊNERO: ${project.genre}
- AUTOR: ${project.authorName} (${project.authorPersona.isPenName ? 'Pseudônimo' : 'Nome Real'})
- STANCE (OPINIÃO ÚNICA): ${project.topicStance}
- DIFERENCIAL (STANDOUT): ${project.uniqueStandout}
- PÚBLICO: ${project.targetAudience}

## PERGUNTA DO AUTOR:
"${text}"

## DIRETRIZES DE RESPOSTA DO ASSISTENTE COAUTHOR:
1. Seja direto, prático, encorajador e altamente perspicaz.
2. Dê respostas formatadas com bullets claros para que o autor possa copiar e colar direto nos campos do livro.
3. Se for pedido de títulos ou diferenciais, dê sugestões concretas e imediatas.
4. Responda em português brasileiro impecável e fluído.`;

    try {
      const res = await chamarGeminiTexto(prompt, { temperature: 0.7, maxTokens: 1800 });
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: res.texto.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          sender: 'assistant',
          text: `Desculpe, tive uma instabilidade temporária ao consultar a IA. Mas posso te ajudar a revisar o texto ou sugerir títulos com base na estrutura de bestsellers!`,
          timestamp: 'Agora'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* BOTÃO FLUTUANTE DO COAUTHOR ASSISTANT (EXATAMENTE COMO O PRINT 2) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 28,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 9999,
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          title="Abrir CoAuthor Writing Assistant"
        >
          <Bot size={24} color="#38bdf8" />
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid #ffffff'
            }}
          />
        </button>
      )}

      {/* GAVETA LATERAL DO CHAT ASSISTANT (EXPANSÍVEL E ULTRA CLEAN) */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 24,
            width: 420,
            maxWidth: 'calc(100vw - 32px)',
            height: 600,
            maxHeight: 'calc(100vh - 40px)',
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 48px -12px rgba(15, 23, 42, 0.25), 0 0 1px 1px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10000,
            overflow: 'hidden',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* TOPO DA GAVETA */}
          <div
            style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bot size={18} color="#38bdf8" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                  CoAuthor Assistant
                  <span style={{ fontSize: 10, background: '#0284c7', color: '#ffffff', padding: '2px 6px', borderRadius: 999 }}>
                    IA
                  </span>
                </h3>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                  Etapa {project.currentStep} de 13
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              title="Fechar Assistente"
            >
              <X size={18} />
            </button>
          </div>

          {/* HISTÓRICO DE MENSAGENS */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  gap: 4
                }}
              >
                <div
                  style={{
                    maxWidth: '88%',
                    padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: msg.sender === 'user' ? '#0f172a' : '#ffffff',
                    color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                    border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    boxShadow: msg.sender === 'user' ? '0 2px 6px rgba(15, 23, 42, 0.15)' : '0 1px 4px rgba(0, 0, 0, 0.04)',
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.text}

                  {/* Sugestões rápidas se houver */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        💡 Sugestões rápidas para esta etapa:
                      </span>
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(sug)}
                          style={{
                            textAlign: 'left',
                            padding: '6px 10px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 11,
                            color: '#0f172a',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.15s'
                          }}
                        >
                          <Lightbulb size={12} color="#f59e0b" style={{ flexShrink: 0 }} />
                          <span>{sug}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.sender === 'assistant' && (
                  <div style={{ display: 'flex', gap: 8, paddingLeft: 4 }}>
                    <button
                      onClick={() => copyToClipboard(msg.text, msg.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedId === msg.id ? '#10b981' : '#94a3b8',
                        cursor: 'pointer',
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 4px'
                      }}
                    >
                      {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === msg.id ? 'Copiado!' : 'Copiar resposta'}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 12, padding: 8 }}>
                <Sparkles size={16} className="animate-spin text-sky-500" />
                <span>CoAuthor pensando na melhor estratégia...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* CAMPO DE ENTRADA */}
          <div
            style={{
              padding: 12,
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: 8,
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Pergunte ao CoAuthor (ideias, títulos, dados)..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
                color: '#0f172a'
              }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !inputMessage.trim() ? 0.5 : 1
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
