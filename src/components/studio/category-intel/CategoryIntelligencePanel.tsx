import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  BookOpen, 
  Star, 
  Layers, 
  Sparkles, 
  Filter, 
  ChevronRight, 
  Info, 
  CheckCircle2, 
  Rocket, 
  RefreshCw,
  Award,
  ExternalLink,
  Copy,
  Check,
  Eye,
  X
} from 'lucide-react';
import { 
  CategoryIntelligenceReport, 
  BookOpportunityProposal, 
  GenreHierarchy,
  CategoryBookReference
} from '../../../types/category-intelligence';
import { Marketplace } from '../../../types';
import { 
  categoryIntelligenceService, 
  GENRE_HIERARCHIES 
} from '../../../services/category-intelligence-service';
import '../../../styles/category-intelligence.css';

interface Props {
  initialMarketplace?: Marketplace;
  initialCategory?: string;
  initialSubcategory?: string;
  onSelectOpportunity?: (
    proposal: BookOpportunityProposal, 
    genre: string, 
    category: string, 
    subcategory: string
  ) => void;
  compact?: boolean;
}

export const CategoryIntelligencePanel: React.FC<Props> = ({
  initialMarketplace = 'amazon.com',
  initialCategory,
  initialSubcategory,
  onSelectOpportunity,
  compact = false
}) => {
  // 1. Estados de Marketplace e Hierarquia
  const [marketplace, setMarketplace] = useState<Marketplace>(initialMarketplace);
  const [selectedGenreId, setSelectedGenreId] = useState<string>(GENRE_HIERARCHIES[0].id);
  
  const currentGenre = GENRE_HIERARCHIES.find(g => g.id === selectedGenreId) || GENRE_HIERARCHIES[0];
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialCategory || currentGenre.categories[0].id
  );

  const currentCategory = currentGenre.categories.find(c => c.id === selectedCategoryId) || currentGenre.categories[0];
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>(
    initialSubcategory || (currentCategory.subcategories[0]?.name || currentCategory.name)
  );

  // 2. Filtros solicitados: BSR <= 80 e Rating >= 4.1 por padrão
  const [maxBsr, setMaxBsr] = useState<number>(80);
  const [minRating, setMinRating] = useState<number>(4.1);

  // 3. Estado de Relatório e Carregamento
  const [report, setReport] = useState<CategoryIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appliedToast, setAppliedToast] = useState<string | null>(null);
  const [inspectingBook, setInspectingBook] = useState<CategoryBookReference | null>(null);
  const [copiedAsin, setCopiedAsin] = useState<string | null>(null);

  const handleCopyAsin = (asin: string) => {
    navigator.clipboard.writeText(asin);
    setCopiedAsin(asin);
    setTimeout(() => setCopiedAsin(null), 2500);
  };

  // Atualiza categorias quando o gênero muda
  const handleGenreChange = (newGenreId: string) => {
    setSelectedGenreId(newGenreId);
    const g = GENRE_HIERARCHIES.find(item => item.id === newGenreId) || GENRE_HIERARCHIES[0];
    const firstCat = g.categories[0];
    setSelectedCategoryId(firstCat.id);
    setSelectedSubcategoryId(firstCat.subcategories[0]?.name || firstCat.name);
  };

  const handleCategoryChange = (newCatId: string) => {
    setSelectedCategoryId(newCatId);
    const cat = currentGenre.categories.find(c => c.id === newCatId);
    if (cat) {
      setSelectedSubcategoryId(cat.subcategories[0]?.name || cat.name);
    }
  };

  // Carrega e calcula métricas da categoria
  const loadIntelligence = async () => {
    setIsLoading(true);
    try {
      const rep = await categoryIntelligenceService.analyzeCategory(
        currentCategory.name,
        selectedSubcategoryId,
        marketplace,
        { maxBsr, minRating }
      );
      setReport(rep);
    } catch (err) {
      console.error('Erro ao carregar inteligência da categoria:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIntelligence();
  }, [marketplace, selectedGenreId, selectedCategoryId, selectedSubcategoryId, maxBsr, minRating]);

  const handleApplyOpp = (opp: BookOpportunityProposal) => {
    if (onSelectOpportunity) {
      onSelectOpportunity(opp, currentGenre.name, currentCategory.name, selectedSubcategoryId);
      setAppliedToast(`✓ Oportunidade "${opp.title}" selecionada para seu livro!`);
      setTimeout(() => setAppliedToast(null), 3500);
    }
  };

  const isUs = marketplace === 'amazon.com';
  const currencySymbol = isUs ? 'US$' : 'R$';

  return (
    <div className="cat-intel-wrapper">
      {/* TOAST DE FEEDBACK */}
      {appliedToast && (
        <div className="toast-success-banner mb-3 animate-in">
          <Award size={16} className="text-emerald-400" />
          <span>{appliedToast}</span>
        </div>
      )}

      {/* 1. BARRA SUPERIOR: TÍTULO, BREADCRUMB E SELETOR DE MERCADO [ 🇺🇸 EUA ] [ 🇧🇷 BR ] */}
      <div className="cat-intel-top-bar">
        <div className="cat-intel-title-area">
          <h2>
            <BarChart3 size={22} className="text-blue-500" />
            INTELIGÊNCIA COMERCIAL DA CATEGORIA
          </h2>
          <div className="cat-intel-breadcrumb">
            <span>{currentGenre.name}</span>
            <ChevronRight size={13} />
            <span>{currentCategory.name}</span>
            <ChevronRight size={13} />
            <strong>{selectedSubcategoryId}</strong>
          </div>
        </div>

        {/* SELETOR DE MERCADO DA SEÇÃO 8 */}
        <div className="market-selector-switch">
          <button
            className={`market-switch-btn ${marketplace === 'amazon.com' ? 'active' : ''}`}
            onClick={() => setMarketplace('amazon.com')}
            title="Amazon Estados Unidos (USD)"
          >
            🇺🇸 EUA (Amazon.com)
          </button>
          <button
            className={`market-switch-btn ${marketplace === 'amazon.com.br' ? 'active' : ''}`}
            onClick={() => setMarketplace('amazon.com.br')}
            title="Amazon Brasil (BRL)"
          >
            🇧🇷 BR (Amazon.com.br)
          </button>
        </div>
      </div>

      {/* 2. SELETORES EM CASCATA: GÊNERO > CATEGORIA > SUBCATEGORIA */}
      <div className="cat-intel-controls-grid">
        <div className="control-field-box">
          <label>1. Gênero Principal</label>
          <select
            className="control-select-input"
            value={selectedGenreId}
            onChange={(e) => handleGenreChange(e.target.value)}
          >
            {GENRE_HIERARCHIES.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="control-field-box">
          <label>2. Categoria</label>
          <select
            className="control-select-input"
            value={selectedCategoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            {currentGenre.categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="control-field-box">
          <label>3. Subcategoria / Nicho</label>
          <select
            className="control-select-input"
            value={selectedSubcategoryId}
            onChange={(e) => setSelectedSubcategoryId(e.target.value)}
          >
            {currentCategory.subcategories.map(sub => (
              <option key={sub.id} value={sub.name}>{sub.name}</option>
            ))}
          </select>
        </div>

        {/* CONTROLES DE FILTRO (SEÇÃO 10): BSR <= 80 E RATING >= 4.1 */}
        <div className="control-field-box">
          <label>Filtro BSR Máximo (≤ {maxBsr})</label>
          <input
            type="range"
            min={20}
            max={150}
            step={5}
            value={maxBsr}
            onChange={(e) => setMaxBsr(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>

        <div className="control-field-box">
          <label>Rating Mínimo (≥ {minRating})</label>
          <input
            type="range"
            min={3.8}
            max={4.8}
            step={0.1}
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>
      </div>

      {/* STATUS DOS FILTROS E CONTAGEM DE QUALIFICADOS */}
      {report && (
        <div className="filter-badge-row">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">
              {report.metrics.qualified_books} livros qualificados
            </span>
            <span className="text-slate-400">•</span>
            <span>Filtros ativos: <strong>BSR ≤ {maxBsr}</strong> e <strong>Rating ≥ {minRating}</strong></span>
          </div>

          <div className="text-xs text-slate-400">
            Marketplace: <strong className="text-white">{marketplace}</strong> ({currencySymbol})
          </div>
        </div>
      )}

      {/* 3. PAINEL DA CATEGORIA (CARDS DOS INDICADORES - SEÇÃO 2 E 3) */}
      {report && (
        <div className="cat-intel-metrics-grid">
          {/* CARD 1: BSR MÉDIO */}
          <div className="cat-metric-card accent-bsr">
            <div className="metric-header-row">
              <span className="metric-title">BSR Médio</span>
              <span className="metric-sub-badge">Top Best Sellers</span>
            </div>
            <div className="metric-value-huge text-blue-400">
              #{report.metrics.avg_bsr}
            </div>
            <div className="metric-subtext-detail">
              Menor BSR: <strong>#{report.metrics.min_bsr}</strong> • Maior: <strong>#{report.metrics.max_bsr}</strong>
            </div>
          </div>

          {/* CARD 2: VENDAS ESTIMADAS / DIA */}
          <div className="cat-metric-card accent-sales">
            <div className="metric-header-row">
              <span className="metric-title">Vendas Estimadas / Dia</span>
              <span className="metric-sub-badge bg-emerald-500/10 text-emerald-400">Estimativa</span>
            </div>
            <div className="metric-value-huge text-emerald-400">
              ~{report.metrics.avg_sales_day.toLocaleString()}
            </div>
            <div className="metric-subtext-detail">
              Média diária dos qualificados
            </div>
          </div>

          {/* CARD 3: VENDAS ESTIMADAS / MÊS */}
          <div className="cat-metric-card accent-sales">
            <div className="metric-header-row">
              <span className="metric-title">Vendas Estimadas / Mês</span>
              <span className="metric-sub-badge bg-emerald-500/10 text-emerald-400">Estimativa</span>
            </div>
            <div className="metric-value-huge text-emerald-300">
              ~{report.metrics.avg_sales_month.toLocaleString()}
            </div>
            <div className="metric-subtext-detail">
              Volume projetado mensal
            </div>
          </div>

          {/* CARD 4: ROYALTY MÉDIO ESTIMADO / DIA (INDICADOR PRINCIPAL) */}
          <div className="cat-metric-card accent-royalty">
            <div className="metric-header-row">
              <span className="metric-title text-amber-300">Royalty Médio / Dia</span>
              <span className="metric-sub-badge bg-amber-500/20 text-amber-300">Principal</span>
            </div>
            <div className="metric-value-huge text-amber-400">
              ~{currencySymbol} {report.metrics.avg_royalty_day.toFixed(2)}
            </div>
            <div className="metric-subtext-detail">
              Líquido após deduções KDP
            </div>
          </div>

          {/* CARD 5: ROYALTY MÉDIO ESTIMADO / MÊS */}
          <div className="cat-metric-card accent-royalty">
            <div className="metric-header-row">
              <span className="metric-title text-amber-300">Royalty Médio / Mês</span>
              <span className="metric-sub-badge bg-amber-500/20 text-amber-300">Principal</span>
            </div>
            <div className="metric-value-huge text-amber-300">
              ~{currencySymbol} {report.metrics.avg_royalty_month.toLocaleString()}
            </div>
            <div className="metric-subtext-detail">
              Projeção de royalty líquido
            </div>
          </div>

          {/* CARD 6: PREÇO MÉDIO & AVALIAÇÕES */}
          <div className="cat-metric-card accent-stats">
            <div className="metric-header-row">
              <span className="metric-title">Preço & Satisfação</span>
              <span className="metric-sub-badge">Geral</span>
            </div>
            <div className="metric-value-huge text-purple-300">
              {currencySymbol} {report.metrics.avg_price.toFixed(2)}
            </div>
            <div className="metric-subtext-detail flex items-center justify-between">
              <span>★ {report.metrics.avg_rating}</span>
              <span>{report.metrics.avg_review_count.toLocaleString()} avaliações</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. AVISO LEGAL OBRIGATÓRIO (SEÇÃO 11) */}
      <div className="cat-intel-disclaimer-box">
        <Info size={14} className="inline mr-1 text-slate-400" />
        <strong>Nota metodológica:</strong> Os valores de vendas e royalties são estimativas calculadas a partir de dados de ranking (BSR), preço de capa, formato e faixas de compensação da Amazon KDP. Eles não representam vendas ou royalties reais divulgados pela Amazon.
      </div>

      {/* 5. LIVROS DE REFERÊNCIA QUALIFICADOS (SEÇÃO 12) */}
      {report && report.books.length > 0 && (
        <div className="ref-books-section">
          <div className="cat-section-header">
            <h3>
              <BookOpen size={18} className="text-blue-400" />
              LIVROS DE REFERÊNCIA QUALIFICADOS ({report.books.length})
            </h3>
            <span className="text-xs text-slate-400">
              Best Sellers com BSR ≤ {maxBsr} e Nota ≥ {minRating}
            </span>
          </div>

          <div className="ref-books-grid">
            {report.books.map(book => (
              <div key={book.asin} className="ref-book-card">
                <img
                  src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600'}
                  alt={book.title}
                  className="ref-book-cover"
                />

                <div className="ref-book-body">
                  <h4 className="ref-book-title" title={book.title}>{book.title}</h4>
                  {book.subtitle && <p className="ref-book-sub" title={book.subtitle}>{book.subtitle}</p>}
                  <div className="ref-book-author">Por {book.author}</div>

                  <div className="ref-book-badges">
                    <span className="badge-tag-bsr">BSR #{book.bsr}</span>
                    <span className="badge-tag-rating">★ {book.rating} ({book.reviewsCount.toLocaleString()})</span>
                    <span className="badge-tag-fmt">{book.format}</span>
                    <span className="text-xs font-bold text-white ml-auto">
                      {currencySymbol} {book.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="ref-book-metrics-strip">
                    <div className="strip-item">
                      <strong>~{book.estimatedDailySales}/dia</strong>
                      <span>Vendas Diárias</span>
                    </div>
                    <div className="strip-item highlight-royalty">
                      <strong>~{currencySymbol} {book.estimatedDailyRoyalty?.toFixed(2)}/dia</strong>
                      <span>Royalty Est.</span>
                    </div>
                    <div className="strip-item">
                      <strong>~{book.estimatedMonthlySales.toLocaleString()}/mês</strong>
                      <span>Vendas Mensais</span>
                    </div>
                    <div className="strip-item highlight-royalty">
                      <strong>~{currencySymbol} {book.estimatedMonthlyRoyalty?.toLocaleString()}/mês</strong>
                      <span>Royalty Mês</span>
                    </div>
                  </div>

                  {/* BARRA DE AÇÕES DO LIVRO: INSPEÇÃO E LINK REAL DA AMAZON */}
                  <div className="ref-book-actions-footer">
                    <button
                      type="button"
                      className="btn-inspect-book"
                      onClick={() => setInspectingBook(book)}
                      title="Abrir painel de inspeção com WebView e metadados KDP"
                    >
                      <Eye size={13} />
                      <span>Inspecionar (WebView)</span>
                    </button>

                    <a
                      href={book.amazonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-amazon-link"
                      title="Abrir anúncio oficial na Amazon"
                    >
                      <span>Amazon</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ANÁLISE DE PADRÕES: O QUE O MERCADO ESTÁ FAZENDO (SEÇÃO 13) */}
      {report && (
        <div className="patterns-section mb-6">
          <div className="cat-section-header">
            <h3>
              <Layers size={18} className="text-sky-400" />
              O QUE O MERCADO ESTÁ FAZENDO (ANÁLISE DE PADRÕES)
            </h3>
            <span className="text-xs text-slate-400">Inteligência agregada dos Best Sellers</span>
          </div>

          <div className="patterns-grid">
            {/* ESTRUTURAS DE TÍTULOS */}
            <div className="pattern-card">
              <h4>Estruturas de Títulos & Subtítulos</h4>
              <ul className="pattern-bullets">
                {report.patterns.titleStructures.map((s, i) => <li key={i}>{s}</li>)}
                <li>Tamanho médio: ~<strong>{report.patterns.avgTitleLengthWords} palavras</strong> por título.</li>
              </ul>
            </div>

            {/* PALAVRAS RECORRENTES */}
            <div className="pattern-card">
              <h4>Palavras Recorrentes no Nicho</h4>
              <p className="text-xs text-slate-400 mb-2">Termos de alta tração de busca orgânica:</p>
              <div className="keywords-tag-cloud">
                {report.patterns.recurringKeywords.map((kw, i) => (
                  <span key={i} className="keyword-tag-pill">{kw}</span>
                ))}
              </div>
            </div>

            {/* PROMESSAS & BENEFÍCIOS */}
            <div className="pattern-card">
              <h4>Promessas & Benefícios Mapeados</h4>
              <ul className="pattern-bullets">
                {report.patterns.corePromises.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>

            {/* PÚBLICO & CAPAS */}
            <div className="pattern-card">
              <h4>Público-Alvo & Padrões Visuais</h4>
              <ul className="pattern-bullets">
                {report.patterns.targetAudiences.map((a, i) => <li key={i}>{a}</li>)}
                <li><strong>Faixa de Preço:</strong> {report.patterns.predominantPriceRange}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 7. OPORTUNIDADES PARA SEU LIVRO (SEÇÃO 13) */}
      {report && (
        <div className="opportunities-section">
          <div className="cat-section-header">
            <h3>
              <Sparkles size={18} className="text-amber-400" />
              OPORTUNIDADES PARA SEU LIVRO
            </h3>
            <span className="text-xs text-slate-400">Propostas originais geradas a partir dos padrões do nicho</span>
          </div>

          <div className="opportunities-grid">
            {report.opportunities.map((opp, idx) => (
              <div key={opp.id} className="opportunity-card">
                <div>
                  <div className="opp-badge">OPORTUNIDADE #{idx + 1}</div>
                  <h4 className="opp-title">{opp.title}</h4>
                  <p className="opp-sub">{opp.subtitle}</p>

                  <div className="opp-detail-box">
                    <strong>Posicionamento:</strong> {opp.positioning}
                  </div>

                  <div className="opp-detail-box">
                    <strong>Gancho Comercial:</strong> {opp.commercialHook}
                  </div>

                  <div className="opp-detail-box">
                    <strong>Direção de Capa:</strong> {opp.coverArtDirection}
                  </div>
                </div>

                <div>
                  <div className="opp-royalty-preview">
                    <span className="opp-royalty-label">Potencial Mensal Estimado:</span>
                    <span className="opp-royalty-val">
                      ~{currencySymbol} {opp.estimatedMonthlyRoyaltyPotential.toLocaleString()}/mês
                    </span>
                  </div>

                  {onSelectOpportunity && (
                    <button
                      className="btn-apply-opportunity"
                      onClick={() => handleApplyOpp(opp)}
                    >
                      <Rocket size={15} /> Criar Livro com Esta Oportunidade
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. MODAL DE INSPEÇÃO E SIMULADOR WEBVIEW DA AMAZON */}
      {inspectingBook && (
        <div className="cat-webview-modal-overlay" onClick={() => setInspectingBook(null)}>
          <div className="cat-webview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cat-webview-modal-header">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-blue-400" />
                <h3 className="text-base font-bold text-white">Inspeção de Livro & Inteligência KDP</h3>
                <span className="badge-tag-bsr">BSR #{inspectingBook.bsr}</span>
              </div>
              <button 
                type="button" 
                className="btn-icon-close"
                onClick={() => setInspectingBook(null)}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cat-webview-modal-body">
              {/* COLUNA ESQUERDA: CAPA E DADOS KDP */}
              <div className="cat-webview-book-overview">
                <img 
                  src={inspectingBook.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600'} 
                  alt={inspectingBook.title}
                  className="cat-webview-cover"
                />

                <div className="cat-webview-asin-box">
                  <span className="text-xs text-slate-400">ASIN KDP:</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <code className="text-sm font-bold text-amber-300">{inspectingBook.asin}</code>
                    <button
                      type="button"
                      className="btn-copy-asin"
                      onClick={() => handleCopyAsin(inspectingBook.asin)}
                      title="Copiar ASIN"
                    >
                      {copiedAsin === inspectingBook.asin ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedAsin === inspectingBook.asin ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <a 
                  href={inspectingBook.amazonUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-open-amazon-official"
                >
                  <span>Abrir na Loja Oficial Amazon</span>
                  <ExternalLink size={14} />
                </a>
              </div>

              {/* COLUNA DIREITA: ANÁLISE METROLÓGICA E METADADOS */}
              <div className="cat-webview-details-pane">
                <h2 className="text-lg font-bold text-white leading-tight">{inspectingBook.title}</h2>
                {inspectingBook.subtitle && (
                  <p className="text-sm text-slate-300 mt-1">{inspectingBook.subtitle}</p>
                )}
                <div className="text-xs text-slate-400 mt-2">
                  Autor: <strong className="text-slate-200">{inspectingBook.author}</strong> • Formato: <span className="text-blue-400 font-semibold">{inspectingBook.format}</span>
                </div>

                {/* PAINEL DE MÉTRICAS */}
                <div className="cat-webview-metrics-grid">
                  <div className="webview-metric-card">
                    <span className="wv-label">Ranking BSR</span>
                    <strong className="wv-val text-blue-400">#{inspectingBook.bsr}</strong>
                    <span className="wv-sub">Top da Categoria</span>
                  </div>

                  <div className="webview-metric-card">
                    <span className="wv-label">Avaliação & Social</span>
                    <strong className="wv-val text-amber-400">★ {inspectingBook.rating}</strong>
                    <span className="wv-sub">{inspectingBook.reviewsCount.toLocaleString()} avaliações</span>
                  </div>

                  <div className="webview-metric-card">
                    <span className="wv-label">Preço de Tabela</span>
                    <strong className="wv-val text-purple-300">{currencySymbol} {inspectingBook.price.toFixed(2)}</strong>
                    <span className="wv-sub">Preço KDP</span>
                  </div>

                  <div className="webview-metric-card">
                    <span className="wv-label">Vendas Estimadas / Dia</span>
                    <strong className="wv-val text-emerald-400">~{inspectingBook.estimatedDailySales}</strong>
                    <span className="wv-sub">unidades/dia</span>
                  </div>

                  <div className="webview-metric-card">
                    <span className="wv-label">Vendas Estimadas / Mês</span>
                    <strong className="wv-val text-emerald-300">~{inspectingBook.estimatedMonthlySales.toLocaleString()}</strong>
                    <span className="wv-sub">unidades/mês</span>
                  </div>

                  <div className="webview-metric-card highlight-royalty">
                    <span className="wv-label text-amber-300">Royalty Líquido Estimado</span>
                    <strong className="wv-val text-amber-400">~{currencySymbol} {inspectingBook.estimatedMonthlyRoyalty?.toLocaleString()}/mês</strong>
                    <span className="wv-sub text-amber-200">~{currencySymbol} {inspectingBook.estimatedDailyRoyalty?.toFixed(2)}/dia</span>
                  </div>
                </div>

                {/* NOTA DE ROYALTIES KDP */}
                {inspectingBook.royaltyNote && (
                  <div className="cat-webview-royalty-note">
                    <Info size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Cálculo KDP:</strong> {inspectingBook.royaltyNote}</span>
                  </div>
                )}

                {/* SIMULADOR DE VISUALIZAÇÃO WEBVIEW DO PRODUTO */}
                <div className="cat-webview-frame-container">
                  <div className="webview-browser-bar">
                    <div className="browser-dots">
                      <span className="dot red" />
                      <span className="dot yellow" />
                      <span className="dot green" />
                    </div>
                    <div className="browser-address">
                      🔒 {inspectingBook.amazonUrl}
                    </div>
                  </div>

                  <div className="webview-mock-content">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-3">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">Best Seller #1</span>
                        <h4 className="text-sm font-bold text-white mt-0.5">{inspectingBook.title}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Preço Kindle</span>
                        <div className="text-base font-bold text-white">{currencySymbol} {inspectingBook.price.toFixed(2)}</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Esta obra lidera o ranking de vendas da categoria com alta retenção de leitores e relevância contínua na Amazon. 
                      Os dados metrológicos acima revelam os pontos de tração do algoritmo KDP, fornecendo um benchmark comprovado para o desenvolvimento do seu novo livro.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
