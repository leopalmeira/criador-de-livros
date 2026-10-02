import React, { useState, useMemo, useCallback } from 'react';
import {
  X,
  Search,
  TrendingUp,
  DollarSign,
  Trophy,
  Star,
  CheckCircle2,
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
  Puzzle
} from 'lucide-react';
import { BookType } from '../../types/book-project';
import { 
  AmazonMarketIntelligenceService, 
  AmazonRankedSegment, 
  SegmentFilterType 
} from '../../services/amazon-market-api';
import { 
  getAmazonBestSellersForSegment, 
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SegmentFilterType>('all');
  const [topicInput, setTopicInput] = useState('');
  const [selectedAmazonRef, setSelectedAmazonRef] = useState<AmazonBestSellerReference | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Lista ranqueada em escala da Amazon
  const rankedSegments = useMemo(() => {
    return AmazonMarketIntelligenceService.getRankedSegments(activeFilter, searchQuery);
  }, [activeFilter, searchQuery]);

  // Segmento atualmente selecionado
  const currentSegment = useMemo(() => {
    return AmazonMarketIntelligenceService.getSegmentById(selectedSegmentId) || rankedSegments[0];
  }, [selectedSegmentId, rankedSegments]);

  // Best sellers de referência do nicho
  const bestSellers = useMemo(() => {
    return getAmazonBestSellersForSegment(selectedSegmentId);
  }, [selectedSegmentId]);

  // Selecionar segmento
  const handleSelectSegment = useCallback((seg: AmazonRankedSegment) => {
    setSelectedSegmentId(seg.id);
    const refs = getAmazonBestSellersForSegment(seg.id);
    const topRef = refs[0] || null;
    setSelectedAmazonRef(topRef);
    setTopicInput(topRef ? topRef.suggestedProjectHook : `Livro profissional de ${seg.name}`);
  }, []);

  // Selecionar um Best Seller específico
  const handleSelectBookRef = (book: AmazonBestSellerReference) => {
    setSelectedAmazonRef(book);
    setTopicInput(book.suggestedProjectHook);
  };

  // Sugestão de IA ancorada na Amazon
  const handleSuggestAiTopic = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      const { topic, reference } = getRandomAmazonSuggestionForSegment(selectedSegmentId, new Set());
      setTopicInput(topic);
      if (reference) setSelectedAmazonRef(reference);
      setIsGeneratingAi(false);
    }, 250);
  };

  const handleContinue = () => {
    const fallback = selectedAmazonRef?.suggestedProjectHook || currentSegment?.name || 'Novo Projeto';
    const finalTopic = topicInput.trim() || fallback;
    onConfirm(selectedSegmentId, finalTopic, selectedAmazonRef || undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="amazon-modal-backdrop" onClick={onClose}>
      <div className="amazon-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* CABEÇALHO DO MODAL */}
        <div className="amazon-modal-header">
          <div>
            <span className="amazon-badge-kdp">● AMAZON BOOKS MARKETPLACE</span>
            <h2 className="amazon-modal-title">Escolha o Seguimento do seu Livro</h2>
            <p className="amazon-modal-subtitle">
              Selecione o nicho com base na escala de rankings reais da Amazon e estimativa de royalty em U$ por exemplar vendido.
            </p>
          </div>
          <button className="btn-amazon-close" onClick={onClose} title="Fechar modal">
            <X size={20} />
          </button>
        </div>

        {/* BARRA DE BUSCA E FILTROS RÁPIDOS */}
        <div className="amazon-search-filter-bar">
          <div className="amazon-search-box">
            <Search size={15} className="amazon-search-icon" />
            <input
              type="text"
              placeholder="Buscar segmento (ex: Suspense, Colorir, Negócios, Romance...)"
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
              { id: 'low_content', label: '🚀 Baixo Conteúdo / KDP' },
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

              {/* BEST SELLERS DE REFERÊNCIA (COMPACTOS) */}
              <div className="amazon-refs-container">
                <div className="amazon-refs-title">
                  <Trophy size={13} color="#b45309" />
                  Best Sellers de Referência (Amazon Books)
                </div>

                {bestSellers.slice(0, 2).map((book) => {
                  const isSelected = selectedAmazonRef?.id === book.id;
                  return (
                    <div
                      key={book.id}
                      onClick={() => handleSelectBookRef(book)}
                      className={`amazon-ref-item-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="amazon-ref-title-line">
                        <span className="amazon-ref-book-name">{book.title}</span>
                        <span className="amazon-badge-kdp" style={{ fontSize: 9.5, padding: '2px 5px' }}>
                          {book.rankBadge}
                        </span>
                      </div>
                      <div className="amazon-ref-author-line">
                        <span>por {book.author}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#b45309', fontWeight: 600 }}>
                          <Star size={10} fill="#f59e0b" color="#f59e0b" /> {book.rating}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TEMA DO LIVRO COM SUGESTÃO IA */}
              <div className="amazon-topic-block">
                <div className="amazon-topic-label-row">
                  <label className="amazon-topic-label">
                    Tema ou Título do Projeto
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
                  placeholder={`Ex: Proposta editorial para ${currentSegment?.name}...`}
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
