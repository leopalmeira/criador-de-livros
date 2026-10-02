import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  X,
  Search,
  DollarSign,
  Trophy,
  Star,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Flame,
  Brain,
  ShieldAlert,
  Briefcase,
  Heart,
  BookOpen,
  Rocket,
  Smile,
  Palette,
  Compass,
  Cpu,
  Feather,
  Utensils,
  Puzzle,
  ExternalLink,
  Layers,
  Check,
  TrendingUp,
  BarChart2,
  CheckCircle2
} from 'lucide-react';
import { BookType } from '../../types/book-project';
import { 
  AmazonMarketIntelligenceService, 
  AmazonRankedSegment, 
  AmazonSubstyleVariation,
  AmazonLiveBook,
  SegmentFilterType 
} from '../../services/amazon-market-api';
import { 
  AmazonBestSellerReference,
  getRandomAmazonSuggestionForSegment 
} from '../../services/amazon-bestsellers-catalog';
import '../../styles/amazon-segment-modal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (segment: BookType, topic: string, amazonRef?: AmazonBestSellerReference) => void;
}

const SEGMENT_ICONS: Record<string, React.ReactNode> = {
  'romance': <Flame size={15} className="amazon-icon-romance" />,
  'self-help': <Brain size={15} className="amazon-icon-selfhelp" />,
  'thriller': <ShieldAlert size={15} className="amazon-icon-thriller" />,
  'business': <Briefcase size={15} className="amazon-icon-business" />,
  'finance': <DollarSign size={15} className="amazon-icon-finance" />,
  'health-wellness': <Heart size={15} className="amazon-icon-health" />,
  'fantasy': <BookOpen size={15} className="amazon-icon-fantasy" />,
  'sci-fi': <Rocket size={15} className="amazon-icon-scifi" />,
  'children-picture-book': <Smile size={15} className="amazon-icon-children" />,
  'practical-guide': <Cpu size={15} className="amazon-icon-guide" />,
  'biography': <Feather size={15} className="amazon-icon-bio" />,
  'technical-manual': <Utensils size={15} className="amazon-icon-tech" />,
  'coloring-book': <Palette size={15} className="amazon-icon-coloring" />,
  'journal': <Sparkles size={15} className="amazon-icon-journal" />,
  'activity-book': <Puzzle size={15} className="amazon-icon-activity" />,
  'non-fiction': <Compass size={15} className="amazon-icon-nonfiction" />,
};

const FILTER_OPTIONS: { id: SegmentFilterType; label: string }[] = [
  { id: 'all', label: 'Todos os Nichos' },
  { id: 'top10', label: 'Top 10 BSR' },
  { id: 'high_royalty', label: 'Maior Royalty (U$)' },
  { id: 'low_content', label: 'Baixo Conteúdo / KDP' },
  { id: 'fiction', label: 'Ficção' },
  { id: 'non_fiction', label: 'Não-Ficção' },
];

export const SegmentSelectorModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  const [selectedSegmentId, setSelectedSegmentId] = useState<BookType>('thriller');
  const [selectedSubstyleId, setSelectedSubstyleId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SegmentFilterType>('all');
  const [topicInput, setTopicInput] = useState('');
  const [selectedAmazonRef, setSelectedAmazonRef] = useState<AmazonBestSellerReference | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Livros reais consultados ao vivo da Amazon
  const [liveBooks, setLiveBooks] = useState<AmazonLiveBook[]>([]);
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);
  const [selectedLiveAsin, setSelectedLiveAsin] = useState<string>('');

  // Lista ranqueada da Amazon
  const rankedSegments = useMemo(() => {
    return AmazonMarketIntelligenceService.getRankedSegments(activeFilter, searchQuery);
  }, [activeFilter, searchQuery]);

  // Segmento selecionado
  const currentSegment = useMemo(() => {
    return AmazonMarketIntelligenceService.getSegmentById(selectedSegmentId) || rankedSegments[0];
  }, [selectedSegmentId, rankedSegments]);

  // Subestilos do segmento
  const substyles = useMemo(() => {
    return currentSegment?.substyles || [];
  }, [currentSegment]);

  // Subestilo ativo
  const currentSubstyle = useMemo(() => {
    if (!substyles.length) return null;
    return substyles.find(s => s.id === selectedSubstyleId) || substyles[0];
  }, [substyles, selectedSubstyleId]);

  // Consulta ao vivo na Amazon Books
  useEffect(() => {
    if (!isOpen || !currentSegment) return;

    let isMounted = true;
    const searchTarget = currentSubstyle?.searchKeyword || `${currentSegment.name} bestseller books`;

    setIsLiveLoading(true);
    AmazonMarketIntelligenceService.fetchLiveAmazonBooks(searchTarget, 5)
      .then((books) => {
        if (!isMounted) return;
        if (books && books.length > 0) {
          setLiveBooks(books);
          // Se nenhum ASIN selecionado ainda, foca no primeiro
          if (!selectedLiveAsin || !books.some(b => b.asin === selectedLiveAsin)) {
            const topBook = books[0];
            setSelectedLiveAsin(topBook.asin);
            if (!topicInput || topicInput.startsWith('Projeto focado em') || topicInput.startsWith('Livro de')) {
              setTopicInput(`${topBook.title} — Inspirado nas melhores práticas comerciais de ${currentSegment.name}`);
            }
          }
        } else {
          setLiveBooks([]);
        }
      })
      .finally(() => {
        if (isMounted) setIsLiveLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentSegment?.id, currentSubstyle?.id]);

  // Selecionar segmento
  const handleSelectSegment = useCallback((seg: AmazonRankedSegment) => {
    setSelectedSegmentId(seg.id);
    const firstSub = seg.substyles[0];
    if (firstSub) {
      setSelectedSubstyleId(firstSub.id);
      setTopicInput(`Projeto focado em ${firstSub.name} (${seg.name})`);
    } else {
      setSelectedSubstyleId('');
      setTopicInput(`Livro de alto padrão em ${seg.name}`);
    }
  }, []);

  // Selecionar subestilo
  const handleSelectSubstyle = (sub: AmazonSubstyleVariation) => {
    setSelectedSubstyleId(sub.id);
    setTopicInput(`Livro de ${sub.name}: focado em ${sub.targetAudience}`);
  };

  // Selecionar livro real
  const handleSelectLiveBook = (book: AmazonLiveBook) => {
    setSelectedLiveAsin(book.asin);
    setTopicInput(`${book.title} (Referência ASIN ${book.asin})`);
    
    setSelectedAmazonRef({
      id: book.asin,
      asin: book.asin,
      title: book.title,
      author: book.author,
      rankBadge: `#1 em ${currentSegment?.name || 'Amazon'}`,
      categoryTag: currentSegment?.name || 'KDP Bestseller',
      rating: book.rating,
      reviewCount: book.reviewsCount,
      price: book.priceUsd,
      format: 'Kindle',
      successFormula: `Livro best-seller na Amazon com alta demanda e ${book.reviewsCount.toLocaleString()} avaliações.`,
      suggestedProjectHook: `Livro estruturado no padrão comercial de ${book.title}`,
      suggestedTitle: book.title,
      suggestedSubtitle: `Inspirado no sucesso editorial da Amazon KDP`,
      targetAudience: currentSubstyle?.targetAudience || 'Público leitor de Best Sellers da Amazon',
      narrativeStructure: 'Estrutura comercial moderna com capítulos objetivos e alta retenção.',
      competitiveEdge: `Diferencial competitivo com foco em resolver dores reais e superar concorrentes no BSR.`
    });
  };

  // Selecionar livro do catálogo de amostra
  const handleSelectSampleBook = (sample: { title: string; author: string; bsr: number; priceUsd: number; royaltyPerBook: number; asin?: string }) => {
    const asin = sample.asin || `BSR-${sample.bsr}`;
    setSelectedLiveAsin(asin);
    setTopicInput(`${sample.title} — Inspirado no BSR #${sample.bsr}`);
    setSelectedAmazonRef({
      id: asin,
      asin: asin,
      title: sample.title,
      author: sample.author,
      rankBadge: `#${sample.bsr} na Amazon Books`,
      categoryTag: currentSegment?.name || 'KDP Bestseller',
      rating: 4.8,
      reviewCount: 1250,
      price: sample.priceUsd,
      format: 'Kindle',
      successFormula: `Best-seller consolidado no nicho de ${currentSegment?.name}.`,
      suggestedProjectHook: `Livro estruturado no modelo de ${sample.title}`,
      suggestedTitle: sample.title,
      suggestedSubtitle: `Proposta editorial competitiva na Amazon`,
      targetAudience: currentSubstyle?.targetAudience || 'Leitores do nicho',
      narrativeStructure: 'Estrutura comercial de alta retenção.',
      competitiveEdge: 'Abordagem focada nas principais lacunas do gênero.'
    });
  };

  // Sugestão de tema com IA
  const handleSuggestAiTopic = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      const { topic } = getRandomAmazonSuggestionForSegment(selectedSegmentId, new Set());
      setTopicInput(topic);
      setIsGeneratingAi(false);
    }, 200);
  };

  // Confirmar e avançar
  const handleContinue = () => {
    const fallback = topicInput.trim() || `Livro Profissional de ${currentSegment?.name}`;
    onConfirm(selectedSegmentId, fallback, selectedAmazonRef || undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="amazon-modal-backdrop" onClick={onClose}>
      <div className="amazon-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* ================= 1. CABEÇALHO SUPERIOR ================= */}
        <header className="amazon-modal-header">
          <div className="amazon-header-info">
            <div className="amazon-status-badge">
              <span className="amazon-status-dot" />
              <span>AMAZON KDP INTELLIGENCE • MERCADO EDITORIAL EM TEMPO REAL</span>
            </div>
            <h2 className="amazon-modal-title">Escolha o Segmento do seu Livro</h2>
            <p className="amazon-modal-subtitle">
              Selecione o nicho com base nos rankings de venda da Amazon, avalie royalties por exemplar e escolha sua referência comercial.
            </p>
          </div>
          <button 
            type="button" 
            className="btn-amazon-close" 
            onClick={onClose} 
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </header>

        {/* ================= 2. BARRA DE FILTROS & BUSCA ================= */}
        <section className="amazon-modal-toolbar">
          <div className="amazon-search-box">
            <Search size={14} className="amazon-search-icon" />
            <input
              type="text"
              placeholder="Buscar por categoria, estilo ou palavra-chave (ex: Suspense, Negócios, Hábitos)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="amazon-search-input"
            />
            {searchQuery && (
              <button 
                type="button" 
                className="amazon-search-clear" 
                onClick={() => setSearchQuery('')}
                title="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="amazon-chips-container" role="tablist">
            {FILTER_OPTIONS.map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveFilter(f.id)}
                  className={`amazon-chip-btn ${isActive ? 'active' : ''}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ================= 3. ÁREA MASTER-DETAIL ================= */}
        <main className="amazon-master-detail-grid">
          
          {/* PAINEL ESQUERDO: LISTA DOS NICHOS */}
          <div className="amazon-segments-scroll-col">
            <div className="amazon-table-header-row">
              <span className="col-header-name">Segmento & Classificação na Amazon</span>
              <span className="col-header-stats">Royalty / Livro</span>
            </div>

            <div className="amazon-segments-list">
              {rankedSegments.map((seg) => {
                const isSelected = selectedSegmentId === seg.id;
                const isTop3 = seg.rankNumber <= 3;
                const isTop10 = seg.rankNumber <= 10;
                const rankTierClass = isTop3 ? 'tier-top3' : isTop10 ? 'tier-top10' : 'tier-standard';

                return (
                  <div
                    key={seg.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectSegment(seg)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSelectSegment(seg);
                      }
                    }}
                    className={`amazon-segment-row-card ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="amazon-segment-left-info">
                      {/* BADGE DE RANK */}
                      <div className={`amazon-rank-pill ${rankTierClass}`}>
                        <Trophy size={11} className="amazon-rank-icon" />
                        <span>#{seg.rankNumber}</span>
                      </div>

                      <div className="amazon-segment-meta">
                        <div className="amazon-segment-name-line">
                          <span className="amazon-segment-icon-wrap">
                            {SEGMENT_ICONS[seg.id] || <BookOpen size={14} />}
                          </span>
                          <span className="amazon-segment-title-text">{seg.name}</span>
                          <span className="amazon-category-tag">{seg.categoryGroupLabel}</span>
                        </div>
                        <p className="amazon-segment-desc-line">{seg.description}</p>
                      </div>
                    </div>

                    {/* ROYALTIES & VENDAS */}
                    <div className="amazon-segment-right-stats">
                      <span className="amazon-royalty-value">
                        {seg.unitRoyaltyFormatted}
                      </span>
                      <span className="amazon-sales-volume">
                        ~{seg.dailySalesEstimate.toLocaleString()} vendas/dia
                      </span>
                    </div>
                  </div>
                );
              })}

              {rankedSegments.length === 0 && (
                <div className="amazon-empty-state">
                  <BookOpen size={28} className="amazon-empty-icon" />
                  <p className="amazon-empty-text">
                    Nenhum nicho encontrado para "<strong>{searchQuery}</strong>".
                  </p>
                  <button 
                    type="button" 
                    className="amazon-empty-reset-btn"
                    onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
                  >
                    Ver todos os nichos
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PAINEL DIREITO: INSPIRAÇÃO EDITORIAL & LIVROS AO VIVO */}
          <div className="amazon-details-panel">
            
            {/* 1. SÍNTESE DO NICHO SELECIONADO */}
            <div className="amazon-active-segment-box">
              <div className="amazon-active-top-row">
                <span className="amazon-rank-tag-detail">
                  <TrendingUp size={12} />
                  {currentSegment?.rankLabel}
                </span>
                <div className="amazon-score-badge">
                  <span className="score-label">Score KDP</span>
                  <span className="score-value">{currentSegment?.opportunityScore}/100</span>
                </div>
              </div>

              <h3 className="amazon-active-title">{currentSegment?.name}</h3>
              <p className="amazon-active-desc">{currentSegment?.description}</p>

              {/* MÉTRICAS UNIFICADAS EM GRADE MODERNA */}
              <div className="amazon-metrics-grid">
                <div className="amazon-metric-cell">
                  <span className="metric-label">Royalty Médio / Livro</span>
                  <span className="metric-value accent-green">{currentSegment?.unitRoyaltyFormatted}</span>
                </div>
                <div className="amazon-metric-cell">
                  <span className="metric-label">Demanda Diária Estimada</span>
                  <span className="metric-value accent-blue">~{currentSegment?.dailySalesEstimate.toLocaleString()} vendas</span>
                </div>
                <div className="amazon-metric-cell">
                  <span className="metric-label">Grau de Concorrência</span>
                  <span className="metric-value">{currentSegment?.competitionLevel}</span>
                </div>
              </div>
            </div>

            {/* 2. VARIAÇÕES E SUBNICHOS DA AMAZON */}
            {substyles.length > 0 && (
              <div className="amazon-substyles-section">
                <div className="amazon-section-header">
                  <div className="amazon-section-title-wrap">
                    <Layers size={13} className="amazon-section-icon" />
                    <span className="amazon-section-title">
                      Subnichos & Estilos Validados ({substyles.length})
                    </span>
                  </div>
                  <span className="amazon-section-hint">
                    Selecione para refinar o público
                  </span>
                </div>

                <div className="amazon-substyles-chips">
                  {substyles.map((sub) => {
                    const isActive = (currentSubstyle?.id === sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSelectSubstyle(sub)}
                        className={`amazon-substyle-chip ${isActive ? 'active' : ''}`}
                      >
                        {isActive ? <Check size={11} className="substyle-check" /> : null}
                        <span>{sub.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. BEST SELLERS REAIS DA AMAZON BOOKS */}
            <div className="amazon-refs-container">
              <div className="amazon-section-header">
                <div className="amazon-section-title-wrap">
                  <Trophy size={13} className="amazon-section-icon text-amber" />
                  <span className="amazon-section-title">
                    Best Sellers em Tempo Real na Amazon
                  </span>
                </div>
                {isLiveLoading && (
                  <span className="amazon-live-loading-tag">
                    <RefreshCw size={11} className="spin-anim" /> Consultando Amazon...
                  </span>
                )}
              </div>

              {isLiveLoading && liveBooks.length === 0 && (
                <div className="amazon-live-skeleton">
                  <RefreshCw size={14} className="spin-anim" />
                  <span>Conectando com o catálogo ao vivo da Amazon Books...</span>
                </div>
              )}

              {/* LISTA DE LIVROS REAIS / CATALOGADOS */}
              <div className="amazon-live-books-list">
                {liveBooks.map((book) => {
                  const isSelected = selectedLiveAsin === book.asin;
                  return (
                    <div
                      key={book.asin}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectLiveBook(book)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleSelectLiveBook(book);
                        }
                      }}
                      className={`amazon-live-book-card ${isSelected ? 'selected' : ''}`}
                    >
                      {/* CAPA DO LIVRO */}
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="amazon-book-cover-thumb"
                          loading="lazy"
                        />
                      ) : (
                        <div className="amazon-book-cover-placeholder">
                          <BookOpen size={16} />
                        </div>
                      )}

                      <div className="amazon-book-info-col">
                        <div className="amazon-book-title-row">
                          <h5 className="amazon-book-title" title={book.title}>
                            {book.title}
                          </h5>
                          <a
                            href={book.amazonUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="amazon-book-ext-link"
                            title="Ver página oficial na Amazon.com"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>

                        <p className="amazon-book-author">por {book.author}</p>

                        <div className="amazon-book-stats-row">
                          <span className="amazon-book-asin-tag">ASIN: {book.asin}</span>
                          <span className="amazon-book-price-tag">U$ {book.priceUsd.toFixed(2)}</span>
                          <span className="amazon-book-royalty-tag">Royalty: U$ {book.royaltyEstUsd.toFixed(2)}</span>
                          <span className="amazon-book-rating-tag">
                            <Star size={10} fill="#f59e0b" color="#f59e0b" />
                            {book.rating.toFixed(1)}
                          </span>
                          <span className="amazon-book-reviews-tag">
                            ({book.reviewsCount.toLocaleString()})
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="amazon-selected-check-indicator" title="Referência ativa">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {!isLiveLoading && liveBooks.length === 0 && currentSegment?.sampleBestSellers && (
                  currentSegment.sampleBestSellers.map((sample, idx) => {
                    const isSelected = selectedLiveAsin === (sample.asin || `BSR-${sample.bsr}`);
                    return (
                      <div 
                        key={idx} 
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectSampleBook(sample)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleSelectSampleBook(sample);
                          }
                        }}
                        className={`amazon-live-book-card ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="amazon-book-cover-placeholder">
                          <BookOpen size={16} />
                        </div>
                        <div className="amazon-book-info-col">
                          <h5 className="amazon-book-title">{sample.title}</h5>
                          <p className="amazon-book-author">por {sample.author}</p>
                          <div className="amazon-book-stats-row">
                            <span className="amazon-book-asin-tag">BSR #{sample.bsr}</span>
                            <span className="amazon-book-price-tag">U$ {sample.priceUsd.toFixed(2)}</span>
                            <span className="amazon-book-royalty-tag">Royalty: U$ {sample.royaltyPerBook.toFixed(2)}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="amazon-selected-check-indicator">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 4. DEFINIÇÃO DA PROPOSTA EDITORIAL DO PROJETO */}
            <div className="amazon-topic-block">
              <div className="amazon-topic-label-row">
                <label htmlFor="amazon-topic-input" className="amazon-topic-label">
                  Proposta Editorial ou Tema Inicial do Projeto
                </label>
                <button
                  type="button"
                  onClick={handleSuggestAiTopic}
                  disabled={isGeneratingAi}
                  className="btn-amazon-ai-suggest"
                  title="Gerar sugestão inteligente adaptada a este nicho"
                >
                  <Sparkles size={12} className={isGeneratingAi ? 'spin-anim' : ''} />
                  <span>Sugerir com IA</span>
                </button>
              </div>
              <textarea
                id="amazon-topic-input"
                rows={2}
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder={`Ex: Proposta editorial para ${currentSubstyle?.name || currentSegment?.name}...`}
                className="amazon-topic-textarea"
              />
            </div>

          </div>

        </main>

        {/* ================= 4. RODAPÉ FIXO DO MODAL ================= */}
        <footer className="amazon-modal-footer">
          <div className="amazon-footer-summary">
            <span className="footer-summary-label">Configuração Atual:</span>
            <div className="footer-summary-tags">
              <span className="footer-pill-nicho">{currentSegment?.name}</span>
              {currentSubstyle && (
                <span className="footer-pill-substyle">› {currentSubstyle.name}</span>
              )}
              {selectedAmazonRef && (
                <span className="footer-pill-ref" title={selectedAmazonRef.title}>
                  Ref: {selectedAmazonRef.title.length > 28 ? `${selectedAmazonRef.title.slice(0, 28)}...` : selectedAmazonRef.title}
                </span>
              )}
            </div>
          </div>

          <div className="amazon-footer-buttons">
            <button 
              type="button" 
              className="btn-amazon-cancel" 
              onClick={onClose}
            >
              Cancelar
            </button>

            <button 
              type="button" 
              className="btn-amazon-create" 
              onClick={handleContinue}
            >
              <span>Confirmar e Iniciar Livro</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};
