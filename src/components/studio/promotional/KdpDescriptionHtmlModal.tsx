import React, { useState, useMemo } from 'react';
import {
  X, Copy, Check, Download, Code2, Globe, Eye,
  Sparkles, ExternalLink, ShieldCheck, CheckCircle2, Edit3, BookOpen
} from 'lucide-react';
import { KdpHtmlGenerator, BookHtmlDataInput } from '../../../services/kdp-html-generator';

export interface KdpDescriptionHtmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookHtmlDataInput;
}

export const KdpDescriptionHtmlModal: React.FC<KdpDescriptionHtmlModalProps> = ({
  isOpen,
  onClose,
  book
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'descricao' | 'landing_page'>('descricao');
  const [descViewMode, setDescViewMode] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState<boolean>(false);
  const [customHtml, setCustomHtml] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Gera o HTML da descrição da Amazon KDP
  const defaultDescHtml = useMemo(() => {
    return KdpHtmlGenerator.generateKdpDescriptionHtml(book);
  }, [book]);

  const activeDescHtml = customHtml || defaultDescHtml;

  // Gera o HTML da landing page promocional completa
  const landingPageHtml = useMemo(() => {
    return KdpHtmlGenerator.generateStandalonePromotionalPageHtml(book);
  }, [book]);

  // Copiar HTML para a área de transferência
  const handleCopy = async (text: string) => {
    const success = await KdpHtmlGenerator.copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Download do arquivo HTML
  const handleDownload = (type: 'descricao' | 'landing_page') => {
    const safeTitle = (book.title || 'Livro').replace(/\s+/g, '_');
    if (type === 'descricao') {
      KdpHtmlGenerator.downloadHtmlFile(`${safeTitle}_DESCRICAO_AMAZON_KDP.html`, activeDescHtml);
    } else {
      KdpHtmlGenerator.downloadHtmlFile(`${safeTitle}_PAGINA_PROMOCIONAL_WEB.html`, landingPageHtml);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 20px',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1040,
          height: '92vh',
          background: '#0f172a',
          borderRadius: 14,
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
      >
        {/* CABEÇALHO DO MODAL */}
        <div
          style={{
            padding: '16px 22px',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.35)'
              }}
            >
              <Code2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                  HTML da Descrição & Página de Promoção KDP
                </h3>
                <span
                  style={{
                    background: '#064e3b',
                    color: '#34d399',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <ShieldCheck size={12} /> Tags Oficiais Aceitas no KDP
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                <strong>{book.title}</strong> • Pronto para colar no campo <em>Descrição</em> da Amazon KDP
              </p>
            </div>
          </div>

          {/* SELETOR DE ABAS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f172a', padding: 4, borderRadius: 8, border: '1px solid #334155' }}>
            <button
              type="button"
              onClick={() => setActiveTab('descricao')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'descricao' ? '#ea580c' : 'transparent',
                color: activeTab === 'descricao' ? '#ffffff' : '#94a3b8',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Code2 size={14} /> 📝 Descrição KDP (HTML Oficial)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('landing_page')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'landing_page' ? '#ea580c' : 'transparent',
                color: activeTab === 'landing_page' ? '#ffffff' : '#94a3b8',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Globe size={14} /> 🌐 Página de Promoção (Web)
            </button>
          </div>

          {/* BOTÃO FECHAR */}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#334155',
              border: 'none',
              color: '#94a3b8',
              width: 34,
              height: 34,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* FEEDBACK DE COPIADO */}
        {copied && (
          <div
            style={{
              background: '#065f46',
              color: '#d1fae5',
              padding: '10px 22px',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid #047857'
            }}
          >
            <CheckCircle2 size={16} /> ✓ Código HTML copiado para a área de transferência! Cole diretamente no campo "Descrição" do Amazon KDP.
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeTab === 'descricao' ? (
            /* ABA 1: DESCRIÇÃO AMAZON KDP (HTML FORMATADO) */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* BANNER DE INSTRUÇÕES DA AMAZON */}
              <div
                style={{
                  padding: '12px 22px',
                  background: 'rgba(234, 88, 12, 0.08)',
                  borderBottom: '1px solid rgba(234, 88, 12, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#fed7aa' }}>
                  <Sparkles size={16} color="#fb923c" />
                  <span>
                    <strong>Como usar na Amazon KDP:</strong> Acesse seu painel no <em>kdp.amazon.com</em> &gt; <em>Detalhes do Livro</em> &gt; Cole este código diretamente na caixa de <strong>Descrição</strong>. A Amazon renderizará os títulos, negritos e tópicos automaticamente!
                  </span>
                </div>

                {/* ALTERNADOR DE MODO: PRÉVIA VISUAL VS CÓDIGO FONTE */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f172a', padding: 3, borderRadius: 6, border: '1px solid #334155' }}>
                  <button
                    type="button"
                    onClick={() => setDescViewMode('preview')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 4,
                      border: 'none',
                      background: descViewMode === 'preview' ? '#334155' : 'transparent',
                      color: descViewMode === 'preview' ? '#ffffff' : '#94a3b8',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={12} /> Prévia da Loja Amazon
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescViewMode('code')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 4,
                      border: 'none',
                      background: descViewMode === 'code' ? '#334155' : 'transparent',
                      color: descViewMode === 'code' ? '#ffffff' : '#94a3b8',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Code2 size={12} /> Código HTML
                  </button>
                </div>
              </div>

              {/* CORPO DE VISUALIZAÇÃO OU CÓDIGO */}
              <div style={{ flex: 1, padding: 22, overflowY: 'auto', background: '#0f172a' }}>
                {descViewMode === 'preview' ? (
                  /* SIMULADOR VISUAL DA AMAZON */
                  <div
                    style={{
                      maxWidth: 780,
                      margin: '0 auto',
                      background: '#ffffff',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      padding: '36px 44px',
                      color: '#0f172a',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>
                        Simulação: Como o leitor verá na página de compra da Amazon
                      </span>
                      <span style={{ fontSize: 11, color: '#f97316', fontWeight: 700 }}>
                        Amazon KDP Format
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '1.02rem',
                        lineHeight: 1.7
                      }}
                      dangerouslySetInnerHTML={{ __html: activeDescHtml }}
                    />
                  </div>
                ) : (
                  /* CÓDIGO FONTE HTML */
                  <div style={{ maxWidth: 840, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                        Código HTML Formatado para o campo Descrição (Tags suportadas pelo KDP):
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 10px',
                          borderRadius: 4,
                          background: '#1e293b',
                          color: '#e2e8f0',
                          border: '1px solid #475569',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={12} /> {isEditing ? 'Concluir Edição' : 'Editar Código'}
                      </button>
                    </div>

                    {isEditing ? (
                      <textarea
                        value={customHtml || defaultDescHtml}
                        onChange={(e) => setCustomHtml(e.target.value)}
                        style={{
                          flex: 1,
                          minHeight: 380,
                          width: '100%',
                          background: '#1e293b',
                          color: '#f8fafc',
                          fontFamily: 'Consolas, Monaco, monospace',
                          fontSize: 13,
                          lineHeight: 1.6,
                          padding: 16,
                          borderRadius: 8,
                          border: '1px solid #475569',
                          resize: 'vertical'
                        }}
                      />
                    ) : (
                      <pre
                        style={{
                          flex: 1,
                          margin: 0,
                          background: '#1e293b',
                          color: '#f8fafc',
                          fontFamily: 'Consolas, Monaco, monospace',
                          fontSize: 13,
                          lineHeight: 1.6,
                          padding: 18,
                          borderRadius: 8,
                          border: '1px solid #334155',
                          overflowY: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {activeDescHtml}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* BARRA DE AÇÕES INFERIOR */}
              <div
                style={{
                  padding: '14px 22px',
                  background: '#1e293b',
                  borderTop: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Total de caracteres: <strong>{activeDescHtml.length}</strong> (Limite KDP: 4.000 caracteres)
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => handleDownload('descricao')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 6,
                      background: '#334155',
                      color: '#e2e8f0',
                      border: '1px solid #475569',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={14} /> Baixar Arquivo .HTML
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(activeDescHtml)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 20px',
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(249, 115, 22, 0.4)'
                    }}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copied ? 'Copiado para o KDP!' : 'Copiar HTML para Amazon KDP'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ABA 2: PÁGINA PROMOCIONAL WEB (LANDING PAGE STANDALONE) */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '12px 22px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#bfdbfe' }}>
                  <Globe size={16} color="#60a5fa" />
                  <span>
                    Página promocional standalone completa: arquivo HTML independente com capa, cards e tema visual adaptativo para divulgar nas redes, site ou tráfego pago.
                  </span>
                </div>
              </div>

              {/* IFRAME DE PRÉVIA DA PÁGINA PROMOCIONAL COMPLETA */}
              <div style={{ flex: 1, background: '#1e293b', overflow: 'hidden' }}>
                <iframe
                  srcDoc={landingPageHtml}
                  title="Prévia da Página Promocional"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </div>

              {/* BARRA DE AÇÕES INFERIOR */}
              <div
                style={{
                  padding: '14px 22px',
                  background: '#1e293b',
                  borderTop: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10
                }}
              >
                <button
                  type="button"
                  onClick={() => handleCopy(landingPageHtml)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 6,
                    background: '#334155',
                    color: '#e2e8f0',
                    border: '1px solid #475569',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Copy size={14} /> Copiar Código HTML da Página
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('landing_page')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 20px',
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
                  }}
                >
                  <Download size={15} />
                  <span>Baixar Página Promocional (.html)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
