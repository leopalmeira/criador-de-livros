import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  Sparkles, 
  Save, 
  Wand2, 
  Search, 
  Filter,
  Download,
  TrendingUp,
  DollarSign,
  Award,
  BookOpen,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Table
} from 'lucide-react';
import { BookProject, StageContent, MarketReference } from '../../types/book-project';
import { BookFormat } from '../../types';
import { db } from '../../database/local-database';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';
import { defaultRoyaltyEstimator } from '../../estimators/royalty-estimation-model';
import { defaultSalesEstimator } from '../../estimators/sales-estimation-model';
import { formatCurrency, formatCompactNumber } from '../../utils/formatters';

interface AnalyticsViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  aiService: AiService;
}

interface MarketRefInput {
  title: string;
  author: string;
  asin?: string;
  bsr: number;
  rating: number;
  reviewCount: number;
  price: number;
  format: BookFormat;
  pageCount: number;
  category: string;
  marketplace: string;
  url?: string;
}

const DEFAULT_MARKETPLACE = 'amazon.com.br';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  project,
  onUpdateProject,
  aiService
}) => {
  const existingContent = project.stageContents?.find(c => c.stageKey === 'analytics');
  const [marketRefs, setMarketRefs] = useState<MarketReference[]>(existingContent?.data?.marketReferences || []);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bsrFilter, setBsrFilter] = useState(80);
  const [ratingFilter, setRatingFilter] = useState(4.1);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorSales, setSimulatorSales] = useState(100);
  const [searchMessage, setSearchMessage] = useState('');

  const validRefs = marketRefs.filter((r): r is MarketReference & { bsr: number; rating: number } =>
    typeof r.bsr === 'number' && r.bsr <= bsrFilter &&
    typeof r.rating === 'number' && r.rating >= ratingFilter
  );
  
  const avgBsr = validRefs.length ? Math.round(validRefs.reduce((s, r) => s + r.bsr, 0) / validRefs.length) : 0;
  const avgRating = validRefs.length ? (validRefs.reduce((s, r) => s + r.rating, 0) / validRefs.length).toFixed(1) : '0.0';
  const avgReviews = validRefs.length ? Math.round(validRefs.reduce((s, r) => s + (r.reviewCount || 0), 0) / validRefs.length) : 0;
  const avgPrice = validRefs.length ? (validRefs.reduce((s, r) => s + (r.price || 0), 0) / validRefs.length).toFixed(2) : '0.00';
  const avgPages = validRefs.length ? Math.round(validRefs.reduce((s, r) => s + (r.pageCount || 0), 0) / validRefs.length) : 0;

  const royaltyData = validRefs.flatMap(r => {
    if (!r.price || r.currency !== 'BRL') return [];
    if (r.format !== 'Kindle' && !r.pageCount) return [];
    if (!['Kindle', 'Capa Comum', 'Capa Dura'].includes(r.format || '')) return [];
    const royalty = defaultRoyaltyEstimator.calculate(
      r.price, 
      r.format as BookFormat,
      r.pageCount, 
      undefined,
      undefined
    );
    if (royalty.unitRoyalty === null) return [];
    return {
      ...r,
      royaltyPerSale: royalty.unitRoyalty
    };
  });

  const refsWithRoyalty = royaltyData;
  const avgRoyalty = royaltyData.length 
    ? (royaltyData.length >= 3
        ? (royaltyData.reduce((s, r) => s + r.royaltyPerSale, 0) / royaltyData.length).toFixed(2)
        : 'Amostra insuficiente')
    : 'N/D';
  const minRoyalty = royaltyData.length 
    ? (royaltyData.length >= 3 ? Math.min(...royaltyData.map(r => r.royaltyPerSale)).toFixed(2) : 'N/D')
    : 'N/D';
  const maxRoyalty = royaltyData.length 
    ? (royaltyData.length >= 3 ? Math.max(...royaltyData.map(r => r.royaltyPerSale)).toFixed(2) : 'N/D')
    : 'N/D';

  const handleSave = () => {
    const updatedContent: StageContent = {
      stageKey: 'analytics',
      data: { 
        marketReferences: marketRefs,
        bsrFilter,
        ratingFilter
      },
      updatedAt: Date.now(),
      updatedBy: 'user',
      version: (existingContent?.version || 0) + 1
    };
    onUpdateProject({
      ...project,
      stageContents: [...(project.stageContents?.filter(c => c.stageKey !== 'analytics') || []), updatedContent],
      stageProgress: project.stageProgress.map(sp => 
        sp.stageKey === 'analytics' ? { ...sp, status: 'REVIEW' as const, progress: 100, lastUpdated: Date.now() } : sp
      ),
      stageApprovals: project.stageApprovals.map(sa => 
        sa.stageKey === 'analytics' ? { ...sa, status: 'REVIEW' as const, previousStatus: sa.status, approvedAt: undefined, approvedBy: undefined } : sa
      )
    });
  };

  const handleAddReference = (ref: MarketRefInput) => {
    const newRef: MarketReference = {
      id: `ref_${Date.now()}`,
      projectId: project.id,
      source: 'manual',
      sourceUrl: ref.url || '',
      marketplace: ref.marketplace as any,
      title: ref.title,
      author: ref.author,
      category: ref.category,
      bsr: ref.bsr,
      rating: ref.rating,
      reviewCount: ref.reviewCount,
      price: ref.price,
      format: ref.format,
      pageCount: ref.pageCount,
      currency: 'BRL',
      trimSize: '6x9',
      inkType: 'bw-white',
      collectedAt: Date.now(),
      selectionReason: 'Manual entry',
      relationToProject: 'Concorrente direto'
    };
    setMarketRefs(prev => [newRef, ...prev]);
  };

  const handleRemoveReference = (id: string) => {
    setMarketRefs(prev => prev.filter(r => r.id !== id));
  };

  const handleSearchAmazon = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setSearchMessage('');
    try {
      const [books, observations] = await Promise.all([
        db.getAllBooks(),
        db.getAllObservations()
      ]);
      const normalizedQuery = searchQuery.trim().toLocaleLowerCase('pt-BR');
      const matchingBooks = books.filter(book =>
        `${book.title} ${book.author} ${book.subtitle || ''}`
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedQuery)
      );
      const latestObservation = new Map<string, typeof observations[number]>();
      observations.forEach(observation => {
        const key = `${observation.marketplace}:${observation.asin}`;
        const previous = latestObservation.get(key);
        if (!previous || observation.timestamp > previous.timestamp) {
          latestObservation.set(key, observation);
        }
      });
      const observedRefs: MarketReference[] = matchingBooks.map(book => {
        const observation = latestObservation.get(`${book.marketplace}:${book.asin}`);
        return {
          id: `amazon_${book.marketplace}_${book.asin}`,
          projectId: project.id,
          source: 'amazon-browser-observation',
          sourceUrl: book.url,
          marketplace: book.marketplace,
          title: book.title,
          author: book.author,
          category: observation?.bsrCategories?.[0]?.category,
          bsr: observation?.bsr,
          rating: observation?.rating ?? book.rating,
          reviewCount: observation?.reviewCount ?? book.reviewCount,
          price: observation?.price ?? book.price,
          currency: book.currency,
          format: book.format,
          pageCount: book.pages,
          collectedAt: observation?.timestamp ?? book.lastSeenAt,
          selectionReason: `Encontrado nos dados salvos para "${searchQuery}"`,
          relationToProject: 'Referência de mercado'
        };
      });
      const existingIds = new Set(marketRefs.map(ref => ref.id));
      const newRefs = observedRefs.filter(ref => !existingIds.has(ref.id));
      setMarketRefs(prev => [...newRefs, ...prev]);
      setSearchMessage(
        newRefs.length
          ? `${newRefs.length} referência(s) observada(s) adicionada(s). BSR e outros campos dependem da captura salva.`
          : 'Nenhum dado salvo corresponde à busca. Navegue pelas páginas da Amazon para registrar referências; esta busca não consulta a Amazon diretamente.'
      );
    } catch {
      setSearchMessage('Não foi possível consultar os dados de mercado salvos neste navegador.');
    } finally {
      setIsLoading(false);
    }
  };

  const sortedRefs = [...marketRefs].sort((a, b) => (a.bsr || 999999) - (b.bsr || 999999));

  return (
    <div className="stage-page-layout">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={22} className="text-primary-accent" />
            <h3 className="text-xl font-bold">Etapa 02 - Analytics: Inteligência de Mercado</h3>
          </div>
            <p className="text-xs text-muted">
            Referências observadas no navegador (BSR ≤ 80, avaliação ≥ 4.1). BSR é um indicador relativo, não uma contagem de vendas.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary-glow" onClick={handleSave}>
            <Save size={15} /> Salvar Analytics
          </button>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1" style={{ minWidth: '250px' }}>
            <label className="text-xs text-muted block mb-1">Buscar Referências Amazon</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-text-standard flex-1"
                placeholder='Ex: "hábitos produtividade", "disciplina", "autoajuda"'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn-primary-action" onClick={handleSearchAmazon} disabled={isLoading}>
                <Search size={15} /> {isLoading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-xs text-muted block mb-1">Filtro BSR ≤</label>
              <input type="number" className="input-text-standard" style={{ width: '80px' }} value={bsrFilter} onChange={(e) => setBsrFilter(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Filtro Rating ≥</label>
              <input type="number" step="0.1" className="input-text-standard" style={{ width: '80px' }} value={ratingFilter} onChange={(e) => setRatingFilter(Number(e.target.value))} />
            </div>
          </div>
        </div>
      </div>

      {/* METRICS DASHBOARD */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle">
          <div className="text-xs text-muted">Referências salvas</div>
          <div className="text-2xl font-bold text-primary-accent">{marketRefs.length}</div>
          <div className="text-xs text-amber-400">Filtradas: {validRefs.length}</div>
        </div>
        <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle">
          <div className="text-xs text-muted">Média BSR</div>
          <div className="text-2xl font-bold">{avgBsr || '—'}</div>
        </div>
        <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle">
          <div className="text-xs text-muted">Média Rating</div>
          <div className="text-2xl font-bold text-amber-400">{avgRating}</div>
        </div>
        <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle">
          <div className="text-xs text-muted">Média Reviews</div>
          <div className="text-2xl font-bold">{formatCompactNumber(avgReviews)}</div>
        </div>
        <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle">
          <div className="text-xs text-muted">Média Preço</div>
          <div className="text-2xl font-bold text-emerald-400">R$ {avgPrice}</div>
        </div>
        <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle">
          <div className="text-xs text-muted">Média Páginas</div>
          <div className="text-2xl font-bold">{avgPages}</div>
        </div>
      </div>

      {/* ROYALTY INTELLIGENCE PANEL */}
      {refsWithRoyalty.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl mb-6">
          <h4 className="font-bold text-emerald-400 mb-3 flex items-center gap-2">
            <DollarSign size={18} /> Royalty Intelligence - Painel de Rentabilidade Estimada
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-3 bg-slate-800/50 rounded">
              <div className="text-xs text-muted">Refs c/ Royalty</div>
              <div className="text-xl font-bold">{refsWithRoyalty.length}</div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded">
              <div className="text-xs text-muted">Royalty Médio</div>
              <div className="text-xl font-bold text-emerald-400">{avgRoyalty === 'Amostra insuficiente' ? avgRoyalty : `R$ ${avgRoyalty}`}</div>
              <div className="text-[10px] text-muted">/ venda (estimado)</div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded">
              <div className="text-xs text-muted">Menor Royalty</div>
              <div className="text-lg font-bold">R$ {minRoyalty}</div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded">
              <div className="text-xs text-muted">Maior Royalty</div>
              <div className="text-lg font-bold">R$ {maxRoyalty}</div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded">
              <div className="text-xs text-muted">% Dados Completos</div>
              <div className="text-xl font-bold">{marketRefs.length ? Math.round((refsWithRoyalty.length / marketRefs.length) * 100) : 0}%</div>
            </div>
          </div>

          {/* SIMULADOR */}
          <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <label className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">Simulador de Receita (vendas/mês):</span>
              <select 
                className="select-standard" 
                style={{ width: '100px' }} 
                value={simulatorSales} 
                onChange={(e) => setSimulatorSales(Number(e.target.value))}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
                <option value={1000}>1.000</option>
              </select>
              <span className="text-emerald-400 font-bold">
                {royaltyData.length >= 3
                  ? `Estimativa mensal: R$ ${(Number(avgRoyalty) * simulatorSales).toFixed(2)} | anual: R$ ${(Number(avgRoyalty) * simulatorSales * 12).toFixed(2)}`
                  : 'Simulação disponível após reunir 3 referências calculáveis'}
              </span>
              <span className="text-[10px] text-rose-400 ml-2">(Não é lucro líquido - exclui impostos, ads, custos ops)</span>
            </label>
          </div>
        </div>
      )}

      {/* MARKET REFERENCES TABLE */}
      <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold">Referências de Mercado ({marketRefs.length})</h4>
          <button className="btn-primary-action" onClick={() => handleAddReference({
            title: '', author: '', bsr: 0, rating: 0, reviewCount: 0, price: 0, format: 'Capa Comum', pageCount: 0, category: '', marketplace: DEFAULT_MARKETPLACE
          })}> 
            <Plus size={14} /> Adicionar Manual
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border-subtle">
                <th className="pb-2">Livro</th>
                <th className="pb-2">BSR</th>
                <th className="pb-2">Coletado</th>
                <th className="pb-2">Rating</th>
                <th className="pb-2">Reviews</th>
                <th className="pb-2">Preço</th>
                <th className="pb-2">Formato</th>
                <th className="pb-2">Páginas</th>
                <th className="pb-2">Royalty Est.</th>
                <th className="pb-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedRefs.map((ref) => {
                const passesFilters = ref.bsr && ref.bsr <= bsrFilter && ref.rating && ref.rating >= ratingFilter;
                const royalty = defaultRoyaltyEstimator.calculate(
                  ref.price, ref.format as BookFormat, ref.pageCount, undefined, undefined
                );
                return (
                  <tr key={ref.id} className={`border-b border-border-subtle ${!passesFilters ? 'opacity-40' : ''}`}>
                    <td className="py-2">
                      <div className="font-medium">{ref.title}</div>
                      <div className="text-xs text-muted">{ref.author}</div>
                    </td>
                    <td className="py-2 font-mono">{typeof ref.bsr === 'number' ? `#${ref.bsr.toLocaleString()}` : 'N/D'}</td>
                    <td className="py-2">{new Date(ref.collectedAt).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2">{ref.rating ? `⭐ ${ref.rating.toFixed(1)}` : 'N/A'}</td>
                    <td className="py-2">{formatCompactNumber(ref.reviewCount || 0)}</td>
                    <td className="py-2">{ref.price != null ? `${ref.currency || 'BRL'} ${ref.price.toFixed(2)}` : 'N/D'}</td>
                    <td className="py-2 text-xs">{ref.format}</td>
                    <td className="py-2">{ref.pageCount || 'N/A'}</td>
                    <td className="py-2 text-emerald-400 font-medium">
                      {royalty.unitRoyalty !== null && ref.currency === 'BRL' && ref.price != null &&
                        (ref.format === 'Kindle' || typeof ref.pageCount === 'number')
                        ? `ESTIMATIVA: R$ ${royalty.unitRoyalty.toFixed(2)}/venda`
                        : 'Não calculável: faltam dados/regras'}
                    </td>
                    <td className="py-2">
                      <button className="btn-icon-danger" onClick={() => handleRemoveReference(ref.id)} title="Remover">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {marketRefs.length === 0 && (
          <div className="text-center py-8 text-muted">
            <Search size={32} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma referência adicionada. Use a busca Amazon ou adicione manualmente.</p>
          </div>
        )}
      </div>

      {/* MARKET COMPARISON ANALYSIS */}
      {validRefs.length >= 3 && (
        <div className="mt-6 p-4 bg-surface-elevated rounded-xl border border-border-subtle">
          <h4 className="font-bold mb-3 flex items-center gap-2">
            <Table size={18} /> Análise Comparativa de Padrões de Mercado
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-amber-300">Faixa de Preço:</span> R$ {Math.min(...validRefs.map(r => r.price || 0)).toFixed(2)} - R$ {Math.max(...validRefs.map(r => r.price || 0)).toFixed(2)}
            </div>
            <div>
              <span className="text-amber-300">Faixa de Páginas:</span> {Math.min(...validRefs.map(r => r.pageCount || 0))} - {Math.max(...validRefs.map(r => r.pageCount || 0))}
            </div>
            <div>
              <span className="text-amber-300">Formatos:</span> {[...new Set(validRefs.map(r => r.format))].join(', ')}
            </div>
            <div>
              <span className="text-amber-300">Categorias Comuns:</span> {[...new Set(validRefs.map(r => r.category))].slice(0, 3).join(', ')}
            </div>
          </div>
          <p className="text-xs text-muted mt-3">
            <strong>Padrões Observados:</strong> Livros com melhor posicionamento (BSR ≤ 80) no nicho tendem a ter 
            {avgPages} páginas em média, preço médio de R$ {avgPrice}, formato {validRefs[0]?.format || 'N/D'}.
            Isso sugere que seu projeto ({project.estimatedPages} págs, {project.trimSize}, {project.paperType}) 
            {Math.abs(project.estimatedPages - avgPages) < 30 ? 'está alinhado' : 'pode precisar de ajuste'} com o mercado.
          </p>
        </div>
      )}
    </div>
  );
};