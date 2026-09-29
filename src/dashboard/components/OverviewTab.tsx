import React, { useEffect, useState } from 'react';
import { Book, Observation, WatchlistItem, NicheSnapshot } from '../../types';
import { db } from '../../database/local-database';
import { formatCurrency, formatBsr, formatNumber } from '../../utils/formatters';

interface OverviewTabProps {
  onSelectBook: (asin: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onSelectBook, onNavigateTab }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [snapshots, setSnapshots] = useState<NicheSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('amazon.com.br');
  const [searchQuery, setSearchQuery] = useState<string>('livros');

  useEffect(() => {
    async function loadData() {
      const [allBooks, wl, obs, snaps] = await Promise.all([
        db.getAllBooks(),
        db.getWatchlist(),
        db.getAllObservations(),
        db.getNicheSnapshots()
      ]);
      setBooks(allBooks);
      setWatchlist(wl);
      setObservations(obs);
      setSnapshots(snaps);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <div style={{ color: '#8b96ad', padding: '40px' }}>Carregando dados da extensão...</div>;
  }

  // Ordena livros vistos recentemente
  const recentBooks = [...books].sort((a, b) => b.lastSeenAt - a.lastSeenAt).slice(0, 8);

  const AMAZON_MARKETPLACES = [
    { code: 'amazon.com.br', name: 'Brasil', flag: '🇧🇷', domain: 'amazon.com.br' },
    { code: 'amazon.com', name: 'Estados Unidos', flag: '🇺🇸', domain: 'amazon.com' },
    { code: 'amazon.co.uk', name: 'Reino Unido', flag: '🇬🇧', domain: 'amazon.co.uk' },
    { code: 'amazon.de', name: 'Alemanha', flag: '🇩🇪', domain: 'amazon.de' },
    { code: 'amazon.es', name: 'Espanha', flag: '🇪🇸', domain: 'amazon.es' },
    { code: 'amazon.fr', name: 'França', flag: '🇫🇷', domain: 'amazon.fr' },
    { code: 'amazon.it', name: 'Itália', flag: '🇮🇹', domain: 'amazon.it' },
    { code: 'amazon.ca', name: 'Canadá', flag: '🇨🇦', domain: 'amazon.ca' },
    { code: 'amazon.co.jp', name: 'Japão', flag: '🇯🇵', domain: 'amazon.co.jp' },
    { code: 'amazon.com.mx', name: 'México', flag: '🇲🇽', domain: 'amazon.com.mx' },
    { code: 'amazon.in', name: 'Índia', flag: '🇮🇳', domain: 'amazon.in' },
    { code: 'amazon.com.au', name: 'Austrália', flag: '🇦🇺', domain: 'amazon.com.au' },
    { code: 'amazon.nl', name: 'Holanda', flag: '🇳🇱', domain: 'amazon.nl' },
    { code: 'amazon.pl', name: 'Polônia', flag: '🇵🇱', domain: 'amazon.pl' },
    { code: 'amazon.se', name: 'Suécia', flag: '🇸🇪', domain: 'amazon.se' },
    { code: 'amazon.com.be', name: 'Bélgica', flag: '🇧🇪', domain: 'amazon.com.be' },
    { code: 'amazon.ae', name: 'Emirados Árabes', flag: '🇦🇪', domain: 'amazon.ae' },
    { code: 'amazon.sa', name: 'Arábia Saudita', flag: '🇸🇦', domain: 'amazon.sa' },
    { code: 'amazon.sg', name: 'Singapura', flag: '🇸🇬', domain: 'amazon.sg' },
    { code: 'amazon.eg', name: 'Egito', flag: '🇪🇬', domain: 'amazon.eg' },
    { code: 'amazon.com.tr', name: 'Turquia', flag: '🇹🇷', domain: 'amazon.com.tr' },
    { code: 'amazon.co.za', name: 'África do Sul', flag: '🇿🇦', domain: 'amazon.co.za' }
  ];

  const handleOpenAmazon = (mktCode?: string) => {
    const code = mktCode || selectedMarketplace;
    const term = encodeURIComponent(searchQuery.trim() || 'livros');
    window.open(`https://www.${code}/s?k=${term}`, '_blank');
  };

  const selectedMktObj = AMAZON_MARKETPLACES.find(m => m.code === selectedMarketplace) || AMAZON_MARKETPLACES[0];

  return (
    <div>
      {/* Banner de Boas-vindas com Navegação Global para Todas as 22 Amazons */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        padding: '22px 24px',
        marginBottom: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              BookIntel Enterprise • Cobertura Global (22 Marketplaces)
            </div>
            <h3 style={{ margin: '4px 0 6px 0', fontSize: '20px', fontWeight: 800, color: '#fff' }}>
              Pesquisa & Inteligência de Mercado Editorial
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', maxWidth: '700px', lineHeight: 1.5 }}>
              Pesquise qualquer nicho na Amazon global. A extensão detectará automaticamente BSR, faturamento, royalties e concorrência nos resultados de busca e páginas de produto.
            </p>
          </div>

          {/* Seletor do Marketplace + Botão de Abertura */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Palavra-Chave / Nicho:</label>
              <input
                type="text"
                className="input-field"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: disciplina, true crime, romance..."
                style={{ width: '200px', fontSize: '12px', padding: '6px 10px', background: '#0f172a', borderColor: '#334155', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Marketplace da Amazon:</label>
              <select
                className="input-field"
                value={selectedMarketplace}
                onChange={(e) => setSelectedMarketplace(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 10px', background: '#0f172a', borderColor: '#334155', color: '#fff', minWidth: '180px' }}
              >
                {AMAZON_MARKETPLACES.map(m => (
                  <option key={m.code} value={m.code}>
                    {m.flag} {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => handleOpenAmazon()}
              style={{ alignSelf: 'flex-end', height: '35px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Abrir {selectedMktObj.flag} Amazon {selectedMktObj.name}</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        {/* Atalhos Rápidos com as Principais Lojas */}
        <div style={{ borderTop: '1px solid rgba(51, 65, 85, 0.6)', paddingTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
            Acesso Rápido:
          </span>
          {[
            { code: 'amazon.com.br', flag: '🇧🇷', label: 'Brasil' },
            { code: 'amazon.com', flag: '🇺🇸', label: 'EUA (.com)' },
            { code: 'amazon.co.uk', flag: '🇬🇧', label: 'UK' },
            { code: 'amazon.de', flag: '🇩🇪', label: 'Alemanha' },
            { code: 'amazon.es', flag: '🇪🇸', label: 'Espanha' },
            { code: 'amazon.fr', flag: '🇫🇷', label: 'França' },
            { code: 'amazon.it', flag: '🇮🇹', label: 'Itália' },
            { code: 'amazon.ca', flag: '🇨🇦', label: 'Canadá' },
            { code: 'amazon.co.jp', flag: '🇯🇵', label: 'Japão' },
            { code: 'amazon.com.mx', flag: '🇲🇽', label: 'México' }
          ].map(shortcut => (
            <button
              key={shortcut.code}
              onClick={() => {
                setSelectedMarketplace(shortcut.code);
                handleOpenAmazon(shortcut.code);
              }}
              style={{
                background: selectedMarketplace === shortcut.code ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                border: `1px solid ${selectedMarketplace === shortcut.code ? '#3b82f6' : '#334155'}`,
                color: '#e2e8f0',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
              title={`Abrir ${shortcut.label} em nova aba`}
            >
              <span>{shortcut.flag}</span>
              <span>{shortcut.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => onNavigateTab('watchlist')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span>Watchlist</span>
            <span>📌</span>
          </div>
          <div className="kpi-value">{watchlist.length}</div>
          <div className="kpi-footer">Livros monitorados</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span>Catálogo Local</span>
            <span>📚</span>
          </div>
          <div className="kpi-value">{books.length}</div>
          <div className="kpi-footer">Livros identificados</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span>Observações BSR</span>
            <span>📈</span>
          </div>
          <div className="kpi-value">{observations.length}</div>
          <div className="kpi-footer">Histórico acumulado</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigateTab('niches')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span>Nichos Salvos</span>
            <span>📸</span>
          </div>
          <div className="kpi-value">{snapshots.length}</div>
          <div className="kpi-footer">Snapshots de pesquisas</div>
        </div>
      </div>

      {/* Últimos Livros Analisados */}
      <div className="data-card">
        <div className="data-card-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#fff' }}>
              Últimos Livros Observados
            </h3>
            <span style={{ fontSize: '12px', color: '#8b96ad' }}>
              Livros capturados durante sua navegação na Amazon
            </span>
          </div>
          <span className="badge badge-blue">{books.length} total no banco</span>
        </div>

        {recentBooks.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8b96ad', fontSize: '13px' }}>
            Nenhum livro detectado ainda. Navegue pela Amazon para começar a coletar dados automaticamente!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Capa</th>
                  <th>Título & Autor</th>
                  <th>Formato</th>
                  <th>Preço</th>
                  <th>Avaliações</th>
                  <th>Visto em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {recentBooks.map((b) => (
                  <tr key={b.asin}>
                    <td style={{ width: '48px' }}>
                      {b.coverImage ? (
                        <img
                          src={b.coverImage}
                          alt="Capa"
                          style={{ width: '36px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      ) : (
                        <div style={{ width: '36px', height: '50px', background: '#1f2633', borderRadius: '4px' }} />
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{b.title}</div>
                      <div style={{ fontSize: '11px', color: '#8b96ad' }}>{b.author} • ASIN: {b.asin}</div>
                    </td>
                    <td><span className="badge badge-blue">{b.format}</span></td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>
                      {formatCurrency(b.price, b.currency)}
                    </td>
                    <td>
                      {b.reviewCount ? `${formatNumber(b.reviewCount)} (${b.rating || 'N/D'} ★)` : 'N/D'}
                    </td>
                    <td style={{ fontSize: '11px', color: '#8b96ad' }}>
                      {new Date(b.lastSeenAt).toLocaleString('pt-BR')}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => onSelectBook(b.asin)}
                      >
                        🔍 Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
