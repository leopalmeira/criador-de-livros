import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  X, 
  Send, 
  BookOpen, 
  Lightbulb, 
  ShieldCheck, 
  Wrench, 
  TrendingUp, 
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenManuals?: () => void;
  onOpenBatch?: () => void;
  onOpenCoverStudio?: () => void;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const AuthorAiGuideDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  onOpenManuals,
  onOpenBatch,
  onOpenCoverStudio
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: 'Olá, autor! Sou sua Inteligência Artificial Guia Editorial. Estou aqui para orientá-lo na criação de obras de alta conversão na Amazon, estruturação de manuais técnicos com diagramas cotados e estratégias de publicação em lote.',
      timestamp: 'Agora'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    // Resposta inteligente da IA orientada a Amazon KDP
    setTimeout(() => {
      let aiReply = '';
      const lower = text.toLowerCase();

      if (lower.includes('manual') || lower.includes('radio') || lower.includes('moveis') || lower.includes('como fazer')) {
        aiReply = '💡 Para manuais de "Como Fazer", a regra de ouro na Amazon é combinar texto conciso com diagramas técnicos esquemáticos (circuitos, cortes e vistas explodidas). O leitor KDP compra manuais pela promessa de clareza visual. Você pode abrir o módulo de "Manuais Técnicos" no painel para ver projetos prontos de rádio galena, marcenaria e energia solar!';
      } else if (lower.includes('capa') || lower.includes('70%') || lower.includes('estilo')) {
        aiReply = '🎨 O segredo da conversão de capas na Amazon é a escala da miniatura (thumbnail a 100px). Se o Grau de Aceitação for menor que 70%, nossa IA acusa risco de contraste ou tipografia ilegível. Sempre utilize um dos nossos 10 Estilos Direcionados de Best-Sellers (como Minimalista ou Bold Impact) inspirados em livros que já faturam milhões na Amazon.';
      } else if (lower.includes('lote') || lower.includes('paginas') || lower.includes('capitulo') || lower.includes('palavras')) {
        aiReply = '⚡ No Gerador em Lote, você pode selecionar múltiplos gêneros e de 1 a 20 livros por gênero. Para atingir exatamente a quantidade de páginas desejada: defina por exemplo 1.800 palavras por capítulo em 10 capítulos = ~82 páginas formatadas KDP (calculando 250 palavras/página). O sistema audita e aprova a obra 100% no automático!';
      } else {
        aiReply = `Compreendo perfeitamente sua estratégia sobre "${text}". O mercado editorial na Amazon KDP premia autores que publicam catálogos consistentes com design alinhado aos líderes da categoria. Recomendo utilizar nosso gerador em lote com auditoria automática ou criar um manual técnico visual. Como posso auxiliá-lo agora?`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: aiReply,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsTyping(false);
    }, 550);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: 420,
      maxWidth: '100vw',
      background: '#090d16',
      borderLeft: '1px solid #1e293b',
      zIndex: 9998,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.6)',
      color: '#f8fafc',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* CABEÇALHO DA GAVETA */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #1e293b',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #38bdf8, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Bot size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>IA Guia do Autor</span>
              <span style={{ fontSize: 9, fontWeight: 700, background: '#10b981', color: '#022c22', padding: '1px 6px', borderRadius: 4 }}>
                ONLINE
              </span>
            </div>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Mentor Editorial & Estrategista KDP</span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 6
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* ATALHOS RÁPIDOS DE ORIENTAÇÃO */}
      <div style={{ padding: '12px 16px', background: '#0c1322', borderBottom: '1px solid #1e293b', display: 'flex', gap: 8, overflowX: 'auto' }}>
        <button
          onClick={() => handleSendMessage('Como estruturar um manual prático de como fazer coisas com diagramas?')}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#38bdf8',
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: 'pointer'
          }}
        >
          🛠️ Manuais com Diagramas
        </button>

        <button
          onClick={() => handleSendMessage('Como funciona a regra dos 70% de aceitação nas capas KDP?')}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#fbbf24',
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: 'pointer'
          }}
        >
          🎨 Grau 70% nas Capas
        </button>

        <button
          onClick={() => handleSendMessage('Como configurar palavras por capítulo para atingir a meta de páginas no lote?')}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#34d399',
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: 'pointer'
          }}
        >
          ⚡ Geração em Lote
        </button>
      </div>

      {/* ÁREA DE CONVERSA */}
      <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((m) => {
          const isAi = m.sender === 'ai';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isAi ? 'flex-start' : 'flex-end'
              }}
            >
              <div style={{
                maxWidth: '88%',
                padding: '10px 14px',
                borderRadius: 12,
                background: isAi ? '#1e293b' : '#2563eb',
                color: isAi ? '#e2e8f0' : '#ffffff',
                border: isAi ? '1px solid #334155' : 'none',
                fontSize: 13,
                lineHeight: 1.5,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}>
                {m.text}
              </div>
              <span style={{ fontSize: 10, color: '#64748b', marginTop: 4, padding: '0 4px' }}>
                {m.timestamp}
              </span>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 12, fontStyle: 'italic' }}>
            <Sparkles size={14} /> IA formulando diretrizes editoriais...
          </div>
        )}
      </div>

      {/* AÇÕES DIRETAS RECOMENDADAS */}
      <div style={{ padding: '12px 16px', background: '#0f172a', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>Ações Rápidas no Painel:</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {onOpenManuals && (
            <button
              onClick={onOpenManuals}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 6,
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Wrench size={12} style={{ display: 'inline', marginRight: 4 }} /> Ver Manuais
            </button>
          )}

          {onOpenBatch && (
            <button
              onClick={onOpenBatch}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 6,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} /> Gerar em Lote
            </button>
          )}
        </div>
      </div>

      {/* CAMPO DE ENTRADA */}
      <div style={{ padding: 14, background: '#090d16', borderTop: '1px solid #1e293b' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{ display: 'flex', gap: 8 }}
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Pergunte à IA sobre manuais, capas ou livros..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#ffffff',
              fontSize: 13,
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: inputMessage.trim() ? '#2563eb' : '#334155',
              color: '#ffffff',
              border: 'none',
              cursor: inputMessage.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
