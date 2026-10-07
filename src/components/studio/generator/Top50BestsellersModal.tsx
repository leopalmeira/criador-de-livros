import React, { useState, useEffect } from 'react';
import {
  X, Sparkles, TrendingUp, BookOpen, Star, Award,
  ArrowRight, Search, RefreshCw, Check, CheckCircle2,
  ExternalLink, Lightbulb, Compass, Filter
} from 'lucide-react';
import {
  BestsellerRankItem,
  getTop50BestsellersForSegment,
  generateBestsellerProposalsFromTop50
} from '../../../services/top50-bestsellers-catalog';
import { MarketReference } from '../../../services/project-state';

export interface Top50BestsellersModalProps {
  isOpen: boolean;
  onClose: () => void;
  genreName?: string;
  segmento?: string;
  currentTopic?: string;
  currentTitle?: string;
  currentSubtitle?: string;
  marketReferences?: MarketReference[];
  onSelectTitleProposal: (titulo: string, subtitulo: string) => void;
  onSelectBookReference?: (book: BestsellerRankItem) => void;
}

export const Top50BestsellersModal: React.FC<Top50BestsellersModalProps> = ({
  isOpen,
  onClose,
  genreName = '',
  segmento = '',
  currentTopic = '',
  currentTitle = '',
  currentSubtitle = '',
  marketReferences = [],
  onSelectTitleProposal,
  onSelectBookReference
}) => {
  const activeGenre = genreName || segmento || 'Finanças Pessoais, Investimentos & Liberdade';
  if (!isOpen) return null;

  const [top50Books, setTop50Books] = useState<BestsellerRankItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiProposals, setAiProposals] = useState<Array<{ titulo: string; subtitulo: string; formula: string; gancho: string }>>([]);
  const [appliedProposal, setAppliedProposal] = useState<string | null>(null);
  const [selectedBookForInsp, setSelectedBookForInsp] = useState<BestsellerRankItem | null>(null);

  // Carrega os 50 livros mais publicados e vendidos do segmento
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getTop50BestsellersForSegment(activeGenre, marketReferences)
      .then(books => {
        if (isMounted) {
          setTop50Books(books);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Erro ao carregar top 50:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [activeGenre, marketReferences]);

  // Dispara a geração de propostas com IA baseadas nos Top 50
  const handleGerarPropostasComIa = async () => {
    setIsGeneratingAi(true);
    setAppliedProposal(null);
    try {
      const result = await generateBestsellerProposalsFromTop50(genreName, top50Books, currentTopic);
      setAiProposals(result.titulos || []);
      setAiAnalysis(result.analiseMercado || null);
    } catch (err: any) {
      console.error('Erro ao gerar com IA:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const filteredBooks = top50Books.filter(b => {
    const q = searchTerm.toLowerCase();
    return b.title.toLowerCase().includes(q) ||
      (b.subtitle && b.subtitle.toLowerCase().includes(q)) ||
      (b.author && b.author.toLowerCase().includes(q)) ||
      (b.dominantHook && b.dominantHook.toLowerCase().includes(q));
  });

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
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          maxHeight: '92vh',
          background: '#0f172a',
          borderRadius: 16,
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.75)'
        }}
      >
        {/* HEADER MODAL */}
        <div
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)'
              }}
            >
              <Award size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>
                  Top 50 Bestsellers Amazon KDP (#1 ao #200)
                </h2>
                <span
                  style={{
                    background: '#334155',
                    color: '#f59e0b',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    border: '1px solid #475569'
                  }}
                >
                  Segmento: {genreName}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                Benchmark editorial dos 50 livros mais publicados e com maior volume de vendas no seu nicho.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handleGerarPropostasComIa}
              disabled={isGeneratingAi}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: isGeneratingAi ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
              }}
            >
              {isGeneratingAi ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Analisando 50 Obras...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Sugerir Títulos com IA dos Top 50
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                width: 36,
                height: 36,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ÁREA DE SUGESTÕES GERADAS COM IA (SE HOUVER) */}
        {aiProposals.length > 0 && (
          <div
            style={{
              padding: '16px 24px',
              background: '#131d36',
              borderBottom: '1px solid #2d3b60',
              maxHeight: 240,
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>
                <Sparkles size={15} /> 5 Fórmulas de Títulos Extraídas do Top 50
              </div>
              {aiAnalysis && (
                <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', maxWidth: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {aiAnalysis}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
              {aiProposals.map((prop, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#1e293b',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #334155',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Opção #{idx + 1} • {prop.formula}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
                      {prop.titulo}
                    </h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: 12, color: '#cbd5e1', lineHeight: 1.3 }}>
                      {prop.subtitulo}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectTitleProposal(prop.titulo, prop.subtitulo);
                      setAppliedProposal(prop.titulo);
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: appliedProposal === prop.titulo ? '#059669' : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {appliedProposal === prop.titulo ? (
                      <>
                        <Check size={12} /> Aplicado no Livro!
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} /> Usar Este Título & Subtítulo
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BARRA DE PESQUISA E FILTROS */}
        <div
          style={{
            padding: '12px 24px',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 10, color: '#64748b' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar nos 50 livros (título, autor ou fórmula)..."
              style={{
                width: '100%',
                padding: '7px 12px 7px 36px',
                borderRadius: 8,
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#f8fafc',
                fontSize: 12,
                outline: 'none'
              }}
            />
          </div>

          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            Exibindo <strong>{filteredBooks.length}</strong> de 50 obras ranqueadas (#1 ao #200)
          </div>
        </div>

        {/* LISTA DOS 50 LIVROS */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, color: '#94a3b8' }}>
              <RefreshCw size={28} className="animate-spin" style={{ color: '#38bdf8', marginBottom: 12 }} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>Carregando dados dos 50 Bestsellers Amazon KDP...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredBooks.map((book, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#1e293b',
                    borderRadius: 10,
                    border: '1px solid #334155',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* RANK E DETALHES PRINCIPAIS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                    {/* BADGE DE RANKING #1 A #50 */}
                    <div
                      style={{
                        minWidth: 44,
                        height: 44,
                        borderRadius: 8,
                        background: (book.rankPosition || idx + 1) <= 3
                          ? 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)'
                          : (book.rankPosition || idx + 1) <= 10
                            ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                            : '#334155',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: 800,
                        boxShadow: (book.rankPosition || idx + 1) <= 3 ? '0 2px 8px rgba(245, 158, 11, 0.4)' : 'none'
                      }}
                    >
                      <span style={{ fontSize: 9, opacity: 0.8, textTransform: 'uppercase', lineHeight: 1 }}>RANK</span>
                      <span style={{ fontSize: 15, lineHeight: 1.1 }}>#{book.rankPosition || idx + 1}</span>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                          {book.title}
                        </h4>
                        {book.dominantHook && (
                          <span
                            style={{
                              background: '#0f172a',
                              color: '#38bdf8',
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 4,
                              border: '1px solid #1e40af'
                            }}
                          >
                            {book.dominantHook}
                          </span>
                        )}
                      </div>

                      {book.subtitle && (
                        <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                          {book.subtitle}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 11, color: '#64748b' }}>
                        <span>Autor: <strong style={{ color: '#cbd5e1' }}>{book.author || 'Autor Best-seller'}</strong></span>
                        {book.rating && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#fbbf24' }}>
                            <Star size={11} fill="#fbbf24" /> {book.rating} ({book.reviews?.toLocaleString('pt-BR') || 0} avaliações)
                          </span>
                        )}
                        {book.estimatedMonthlyUnits && (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>
                            ~{book.estimatedMonthlyUnits.toLocaleString('pt-BR')} cópias/mês
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AÇÕES DE CADA LIVRO */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTitleProposal(book.title, book.subtitle || '');
                        setAppliedProposal(book.title);
                      }}
                      title="Utilizar título e subtítulo deste best-seller como modelo de inspiração para a obra"
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: '#334155',
                        color: '#f8fafc',
                        border: '1px solid #475569',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Lightbulb size={12} color="#fbbf24" /> Usar Estrutura
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div
          style={{
            padding: '12px 24px',
            background: '#1e293b',
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: 11, color: '#64748b' }}>
            * Amostragem de inteligência baseada nos padrões de conversão do algoritmo Amazon A10 para KDP Books.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              background: '#0f172a',
              color: '#94a3b8',
              border: '1px solid #334155',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
