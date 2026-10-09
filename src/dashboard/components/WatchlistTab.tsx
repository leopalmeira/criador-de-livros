import React, { useEffect, useState } from 'react';
import { WatchlistItem, Book } from '../../types';
import { db } from '../../database/local-database';
import { formatCurrency, formatBsr, formatNumber } from '../../utils/formatters';
import { exportBooksToCsv } from '../../utils/export-import';

interface WatchlistTabProps {
  onSelectBook: (asin: string) => void;
}

export const WatchlistTab: React.FC<WatchlistTabProps> = ({ onSelectBook }) => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [booksMap, setBooksMap] = useState<Record<string, Book>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'addedAt' | 'bsr' | 'sales'>('addedAt');

  const loadData = async () => {
    const list = await db.getWatchlist();
    const allBooks = await db.getAllBooks();
    const map: Record<string, Book> = {};
    for (const b of allBooks) map[b.asin] = b;
    setItems(list);
    setBooksMap(map);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRemove = async (asin: string) => {
    await db.removeFromWatchlist(asin);
    loadData();
  };

  const handleExport = () => {
    const exportable = items.map(item => {
      const book = booksMap[item.asin] || {};
      return {
        ...book,
        asin: item.asin,
        title: item.title,
        author: item.author,
        bsr: item.currentBsr,
        price: item.currentPrice,
        dailySales: item.currentDailySales
      };
    });
    exportBooksToCsv(exportable, 'watchlist-bookengin.csv');
  };

  const filtered = items.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.asin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  filtered.sort((a, b) => {
    if (sortBy === 'addedAt') return b.addedAt - a.addedAt;
    if (sortBy === 'bsr') return (a.currentBsr || 999999) - (b.currentBsr || 999999);
    if (sortBy === 'sales') return (b.currentDailySales || 0) - (a.currentDailySales || 0);
    return 0;
  });

  return (
    <div>
      <div className="header-banner">
        <div>
          <h2 className="page-title">Livros Monitorados (Watchlist)</h2>
          <div className="page-subtitle">Acompanhe a evolução de vendas e BSR dos seus títulos de interesse</div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            📥 Exportar Watchlist (CSV)
          </button>
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Filtrar por título, autor ou ASIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '280px' }}
            />

            <select
              className="input-field"
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
            >
              <option value="addedAt">Adicionados Recentemente</option>
              <option value="bsr">Melhor BSR (Menor)</option>
              <option value="sales">Maiores Vendas Estimadas</option>
            </select>
          </div>

          <span className="badge badge-blue">{filtered.length} livro(s)</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#8b96ad' }}>
            {searchTerm ? 'Nenhum livro encontrado com esses termos.' : 'Sua Watchlist está vazia. Clique em "Salvar" nos cards da Amazon para monitorar livros aqui.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Capa</th>
                  <th>Título & Autor</th>
                  <th>BSR Atual</th>
                  <th>Vendas Est. / Dia</th>
                  <th>Preço</th>
                  <th>Salvo em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.asin}>
                    <td style={{ width: '48px' }}>
                      {item.coverImage ? (
                        <img
                          src={item.coverImage}
                          alt="Capa"
                          style={{ width: '36px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      ) : (
                        <div style={{ width: '36px', height: '50px', background: '#1f2633', borderRadius: '4px' }} />
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{item.title}</div>
                      <div style={{ fontSize: '11px', color: '#8b96ad' }}>{item.author} • ASIN: {item.asin}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#60a5fa' }}>
                      {formatBsr(item.currentBsr)}
                    </td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>
                      {item.currentDailySales ? `≈ ${formatNumber(item.currentDailySales, 1)}` : 'N/D'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#f0f3fa' }}>
                      {formatCurrency(item.currentPrice)}
                    </td>
                    <td style={{ fontSize: '11px', color: '#8b96ad' }}>
                      {new Date(item.addedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => onSelectBook(item.asin)}
                        >
                          🔍 Detalhes
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleRemove(item.asin)}
                          title="Remover da Watchlist"
                        >
                          ✕
                        </button>
                      </div>
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
