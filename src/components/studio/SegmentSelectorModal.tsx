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
  Check
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
  'romance': <Flame size={16} color="#e11d48" />,
  'self-help': <Brain size={16} color="#7c3aed" />,
  'thriller': <ShieldAlert size={16} color="#dc2626" />,
  'business': <Briefcase size={16} color="#2563eb" />,
  'finance': <DollarSign size={16} color="#16a34a" />,
  'health-wellness': <Heart size={16} color="#059669" />,
  'fantasy': <BookOpen size={16} color="#9333ea" />,
  'sci-fi': <Rocket size={16} color="#0d9488" />,
  'children-picture-book': <Smile size={16} color="#f59e0b" />,
  'practical-guide': <Cpu size={16} color="#0284c7" />,
  'biography': <Feather size={16} color="#475569" />,
  'technical-manual': <Utensils size={16} color="#15803d" />,
  'coloring-book': <Palette size={16} color="#db2777" />,
  'journal': <Sparkles size={16} color="#ca8a04" />,
  'activity-book': <Puzzle size={16} color="#0891b2" />,
  'non-fiction': <Compass size={16} color="#334155" />,
};

export const SegmentSelectorModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  const [selectedSegmentId, setSelectedSegmentId] = useState<BookType>('thriller'); // Padrão: Suspense Rank #3
  const [selectedSubstyleId, setSelectedSubstyleId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SegmentFilterType>('all');
  const [topicInput, setTopicInput] = useState('');
  const [selectedAmazonRef, setSelectedAmazonRef] = useState<AmazonBestSellerReference | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Estado dos livros reais consultados ao vivo na Amazon
  const [liveBooks, setLiveBooks] = useState<AmazonLiveBook[]>([]);
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);
  const [selectedLiveAsin, setSelectedLiveAsin] = useState<string>('');

  // Lista ranqueada em escala da Amazon
  const rankedSegments = useMemo(() => {
    return AmazonMarketIntelligenceService.getRankedSegments(activeFilter, searchQuery);
  }, [activeFilter, searchQuery]);

  // Segmento atualmente selecionado
  const currentSegment = useMemo(() => {
    return AmazonMarketIntelligenceService.getSegmentById(selectedSegmentId) || rankedSegments[0];
  }, [selectedSegmentId, rankedSegments]);

  // Subestilos do segmento atual
  const substyles = useMemo(() => {
    return currentSegment?.substyles || [];
  }, [currentSegment]);

  // Subestilo ativo
  const currentSubstyle = useMemo(() => {
    if (!substyles.length) return null;
    return substyles.find(s => s.id === selectedSubstyleId) || substyles[0];
  }, [substyles, selectedSubstyleId]);

  // Consulta ao vivo na Amazon quando o segmento ou subestilo muda
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
          // Se nenhum ASIN selecionado ainda, foca no top 1
          if (!selectedLiveAsin || !books.some(b => b.asin === selectedLiveAsin)) {
            const topBook = books[0];
            setSelectedLiveAsin(topBook.asin);
            if (!topicInput || topicInput.startsWith('Livro de')) {
              setTopicInput(`${topBook.title} — Projeto inspirado nas melhores práticas de ${currentSegment.name}`);
            }
          }
        } else {
          // Fallback para os best-sellers de referência catalogados
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

  // Selecionar variação / subestilo
  const handleSelectSubstyle = (sub: AmazonSubstyleVariation) => {
    setSelectedSubstyleId(sub.id);
    setTopicInput(`Livro de ${sub.name}: ${sub.targetAudience}`);
  };

  // Selecionar um livro real da Amazon
  const handleSelectLiveBook = (book: AmazonLiveBook) => {
    setSelectedLiveAsin(book.asin);
    setTopicInput(`${book.title} (Referência ASIN ${book.asin})`);
    
    // Mapeia para referência editorial
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

  // Sugestão com IA ancorada no nicho
  const handleSuggestAiTopic = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      const { topic } = getRandomAmazonSuggestionForSegment(selectedSegmentId, new Set());
      setTopicInput(topic);
      setIsGeneratingAi(false);
    }, 200);
  };

  const handleContinue = () => {
    const fallback = topicInput.trim() || `Livro Profissional de ${currentSegment?.name}`;
    onConfirm(selectedSegmentId, fallback, selectedAmazonRef || undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="amazon-modal-backdrop" onClick={onClose}>
      <div className="amazon-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* CABEÇALHO DO MODAL */}
        <div className="amazon-modal-header">
          <div>
            <span className="amazon-badge-kdp">● AMAZON BOOKS MARKETPLACE • DADOS EM TEMPO REAL</span>
            <h2 className="amazon-modal-title">Escolha o Seguimento do seu Livro</h2>
            <p className="amazon-modal-subtitle">
              Selecione o nicho com base nos rankings reais da Amazon, explore todas as variações de estilos e analise os Best Sellers em tempo real.
            </p>
          </div>
          <button className="btn-amazon-close" onClick={onClose} title="Fechar modal">
            <X size={20} />
          </button>
        </div>

        {/* BARRA DE FILTROS E BUSCA */}
        <div className="amazon-modal-toolbar">
          <div className="amazon-search-box">
            <Search size={15} className="amazon-search-icon" />
            <input
              type="text"
              placeholder="Buscar categoria ou estilo (ex: Suspense, Colorir, Negócios, Enemies to Lovers...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="amazon-search-input"
            />
          </div>

          <div className="amazon-chips-container">
            {[
              { id: 'all', label: 'Todos os Nichos' },
              { id: 'top10', label: '🔥 Top 10 Mais Vendidos' },
              { id: 'high_royalty', label: '💰 Maior Royalty (U$)' },
              { id: 'low_content', label: '🎨 Baixo Conteúdo / KDP' },
              { id: 'fiction', label: '📖 Ficção' },
              { id: 'non_fiction', label: '🧠 Não-Ficção' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as SegmentFilterType)}
                className={`amazon-chip-btn ${activeFilter === f.id ? 'active' : ''}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* CORPO MASTER-DETAIL */}
        <div className="amazon-master-detail-grid">
          
          {/* LADO ESQUERDO: LISTA DOS NICHOS COM RANK E ROYALTIES EM U$ */}
          <div className="amazon-segments-scroll-col">
            <div className="amazon-table-header-row">
              <span>Segmento & Classificação na Amazon</span>
              <span>Royalty Estimado / Livro</span>
            </div>

            {rankedSegments.map(seg => {
              const isSelected = selectedSegmentId === seg.id;
              const isTop3 = seg.rankNumber <= 3;
              const isTop10 = seg.rankNumber <= 10;
              const badgeClass = isTop3 ? 'top-3' : isTop10 ? 'top-10' : 'standard';

              return (
                <div
                  key={seg.id}
                  onClick={() => handleSelectSegment(seg)}
                  className={`amazon-segment-row-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="amazon-segment-left-info">
                    {/* BADGE DE RANK EM DESTAQUE (#3 Suspense, #102 Colorir) */}
                    <div className={`amazon-rank-badge ${badgeClass}`}>
                      <Trophy size={11} />
                      <span>#{seg.rankNumber}</span>
                    </div>

                    <div className="amazon-segment-meta">
                      <div className="amazon-segment-name-line">
                        <span>{SEGMENT_ICONS[seg.id] || <BookOpen size={15} />}</span>
                        <h4 className="amazon-segment-title-text">{seg.name}</h4>
                        <span className="amazon-category-tag">{seg.categoryGroupLabel}</span>
                      </div>
                      <p className="amazon-segment-desc-line">{seg.description}</p>
                    </div>
                  </div>

                  {/* ROYALTIES EM U$ POR EXEMPLAR */}
                  <div className="amazon-segment-right-stats">
                    <span className="amazon-royalty-value">
                      <DollarSign size={13} />
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
              <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: 13 }}>
                Nenhum segmento encontrado para a busca "{searchQuery}".
              </div>
            )}
          </div>

          {/* LADO DIREITO: PAINEL EDITORIAL DO NICHO SELECIONADO */}
          <div className="amazon-details-panel">
            <div>
              {/* RESUMO DO NICHO ATIVO */}
              <div className="amazon-active-segment-box">
                <div className="amazon-active-top-row">
                  <span className="amazon-badge-kdp">
                    {currentSegment?.rankLabel}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Score KDP: <strong style={{ color: '#059669' }}>{currentSegment?.opportunityScore}/100</strong>
                  </span>
                </div>

                <h3 className="amazon-active-title">{currentSegment?.name}</h3>
                <p className="amazon-active-desc">{currentSegment?.description}</p>

                {/* MÉTRICAS EM 3 CARDS */}
                <div className="amazon-metrics-3grid">
                  <div className="amazon-metric-mini-card">
                    <span className="amazon-metric-mini-label">Royalty / Livro</span>
                    <span className="amazon-metric-mini-val accent-green">{currentSegment?.unitRoyaltyFormatted}</span>
                  </div>
                  <div className="amazon-metric-mini-card">
                    <span className="amazon-metric-mini-label">Vendas Diárias</span>
                    <span className="amazon-metric-mini-val accent-blue">~{currentSegment?.dailySalesEstimate.toLocaleString()}</span>
                  </div>
                  <div className="amazon-metric-mini-card">
                    <span className="amazon-metric-mini-label">Concorrência</span>
                    <span className="amazon-metric-mini-val">{currentSegment?.competitionLevel}</span>
                  </div>
                </div>
              </div>

              {/* SEÇÃO DE VARIAÇÕES / SUBESTILOS DO NICHO */}
              {substyles.length > 0 && (
                <div className="amazon-substyles-section">
                  <div className="amazon-substyles-header">
                    <span className="amazon-substyles-title">
                      <Layers size={13} color="#2563eb" />
                      Variações & Subnichos da Amazon ({substyles.length})
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      Clique para ver livros ao vivo
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
                          {isActive && <Check size={11} />}
                          <span>{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LIVROS REAIS AO VIVO DA AMAZON COM FOTOS E PREÇOS */}
              <div className="amazon-refs-container" style={{ marginTop: 14 }}>
                <div className="amazon-refs-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trophy size={13} color="#b45309" />
                    Best Sellers em Tempo Real na Amazon Books
                  </span>
                  {isLiveLoading && (
                    <span style={{ fontSize: 11, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <RefreshCw size={11} className="spin-anim" /> Consultando Amazon...
                    </span>
                  )}
                </div>

                {isLiveLoading && liveBooks.length === 0 && (
                  <div className="amazon-live-loading-indicator">
                    <RefreshCw size={13} className="spin-anim" />
                    <span>Conectando com a Amazon Books para carregar Best Sellers reais...</span>
                  </div>
                )}

                {/* LISTAGEM DE LIVROS REAIS */}
                <div className="amazon-live-books-list">
                  {liveBooks.map((book) => {
                    const isSelected = selectedLiveAsin === book.asin;
                    return (
                      <div
                        key={book.asin}
                        onClick={() => handleSelectLiveBook(book)}
                        className={`amazon-live-book-card ${isSelected ? 'selected' : ''}`}
                      >
                        {/* CAPA REAL DO SERVIDOR AMAZON */}
                        {book.coverImage ? (
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            className="amazon-book-cover-thumb"
                            loading="lazy"
                          />
                        ) : (
                          <div className="amazon-book-cover-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={16} color="#94a3b8" />
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
                              title="Ver produto na Amazon.com"
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>

                          <p className="amazon-book-author">por {book.author}</p>

                          <div className="amazon-book-stats-row">
                            <span className="amazon-book-asin-tag">ASIN: {book.asin}</span>
                            <span className="amazon-book-price-tag">U$ {book.priceUsd.toFixed(2)}</span>
                            <span className="amazon-book-royalty-tag">Royalty: U$ {book.royaltyEstUsd.toFixed(2)}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#b45309', fontWeight: 600 }}>
                              <Star size={10} fill="#f59e0b" color="#f59e0b" /> {book.rating.toFixed(1)}
                            </span>
                            <span style={{ color: '#94a3b8' }}>({book.reviewsCount.toLocaleString()} reviews)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {!isLiveLoading && liveBooks.length === 0 && currentSegment?.sampleBestSellers && (
                    currentSegment.sampleBestSellers.map((sample, idx) => (
                      <div key={idx} className="amazon-live-book-card selected">
                        <div className="amazon-book-cover-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BookOpen size={16} color="#94a3b8" />
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
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* TEMA DO LIVRO COM SUGESTÃO IA */}
              <div className="amazon-topic-block" style={{ marginTop: 14 }}>
                <div className="amazon-topic-label-row">
                  <label className="amazon-topic-label">
                    Tema ou Título do Projeto Selecionado
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestAiTopic}
                    disabled={isGeneratingAi}
                    className="btn-amazon-ai-suggest"
                  >
                    <RefreshCw size={11} className={isGeneratingAi ? 'spin-anim' : ''} />
                    Sugerir com IA
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder={`Ex: Proposta editorial para ${currentSubstyle?.name || currentSegment?.name}...`}
                  className="amazon-topic-textarea"
                />
              </div>
            </div>

            {/* BOTÕES DE AÇÃO NO RODAPÉ */}
            <div className="amazon-footer-actions">
              <button type="button" className="btn-amazon-cancel" onClick={onClose}>
                Cancelar
              </button>

              <button type="button" className="btn-amazon-create" onClick={handleContinue}>
                <span>Criar Projeto no Nicho #{currentSegment?.rankNumber}</span>
                <ArrowRight size={15} />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
