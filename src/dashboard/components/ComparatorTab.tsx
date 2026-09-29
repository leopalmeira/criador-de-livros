import React, { useEffect, useState } from 'react';
import { Book, Observation } from '../../types';
import { db } from '../../database/local-database';
import { formatCurrency, formatBsr, formatNumber } from '../../utils/formatters';
import { defaultSalesEstimator } from '../../estimators/sales-estimation-model';
import { defaultRoyaltyEstimator } from '../../estimators/royalty-estimation-model';
import { defaultOpportunityCalculator } from '../../estimators/opportunity-score';
import { exportBooksToCsv } from '../../utils/export-import';

export const ComparatorTab: React.FC = () => {
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [selectedAsins, setSelectedAsins] = useState<string[]>([]);
  const [comparedData, setComparedData] = useState<any[]>([]);
  const [sortField, setSortField] = useState<string>('opportunityScore');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      const books = await db.getAllBooks();
      setAllBooks(books);

      // Carrega ASINs selecionados na sessão
      const queued = JSON.parse(sessionStorage.getItem('bookintel_compare_queue') || '[]');
      if (queued.length > 0) {
        setSelectedAsins(queued);
      } else if (books.length > 0) {
        // Seleciona os primeiros 3 como padrão
        setSelectedAsins(books.slice(0, 3).map(b => b.asin));
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function buildComparison() {
      const list: any[] = [];
      for (const asin of selectedAsins) {
        const book = allBooks.find(b => b.asin === asin);
        if (!book) continue;

        const observations = await db.getObservationsForBook(asin);
        const latestObs = observations[observations.length - 1];
        const bsr = latestObs?.bsr || undefined;

        const sales = defaultSalesEstimator.estimate({
          marketplace: book.marketplace,
          bsr,
          format: book.format,
          price: book.price
        });

        const royalty = defaultRoyaltyEstimator.calculate(
          book.price,
          book.format,
          book.pages,
          sales.estimatedDailySales,
          sales.estimatedMonthlySales
        );

        const opp = defaultOpportunityCalculator.calculate({
          bsr,
          estimatedDailySales: sales.estimatedDailySales,
          reviewCount: book.reviewCount,
          rating: book.rating,
          price: book.price
        });

        list.push({
          asin: book.asin,
          title: book.title,
          author: book.author,
          coverImage: book.coverImage,
          format: book.format,
          price: book.price,
          currency: book.currency,
          bsr: bsr || null,
          dailySales: sales.estimatedDailySales || 0,
          monthlySales: sales.estimatedMonthlySales || 0,
          monthlyRevenue: (sales.estimatedMonthlySales && book.price) ? sales.estimatedMonthlySales * book.price : 0,
          monthlyRoyalty: royalty.estimatedMonthlyRoyalty || 0,
          reviews: book.reviewCount || 0,
          rating: book.rating || 0,
          pages: book.pages || null,
          ageFormatted: book.ageFormatted || 'N/D',
          opportunityScore: opp.score,
          url: book.url
        });
      }
      setComparedData(list);
    }

    buildComparison();
  }, [selectedAsins, allBooks]);

  const handleToggleAsin = (asin: string) => {
    if (selectedAsins.includes(asin)) {
      setSelectedAsins(selectedAsins.filter(a => a !== asin));
    } else {
      setSelectedAsins([...selectedAsins, asin]);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedList = [...comparedData].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (valA === valB) return 0;
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;
    return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
  });

  return (
    <div>
      <div className="header-banner">
        <div>
          <h2 className="page-title">Comparador de Livros</h2>
          <div className="page-subtitle">Avalie lado a lado métricas de BSR, vendas, faturamento e barreira de concorrência</div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => exportBooksToCsv(comparedData, 'comparacao-livros.csv')}
          disabled={comparedData.length === 0}
        >
          📥 Exportar Comparação (CSV)
        </button>
      </div>

      {/* Seletor de Livros */}
      <div className="data-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#8b96ad', textTransform: 'uppercase', marginBottom: '8px' }}>
          Selecione livros do seu catálogo ({selectedAsins.length} selecionado(s)):
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '100px', overflowY: 'auto' }}>
          {allBooks.map(b => (
            <button
              key={b.asin}
              className={`btn ${selectedAsins.includes(b.asin) ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '4px 8px' }}
              onClick={() => handleToggleAsin(b.asin)}
            >
              {b.title.substring(0, 30)}...
            </button>
          ))}
        </div>
      </div>

      {/* Tabela Comparativa Ordenável */}
      <div className="data-card">
        {sortedList.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#8b96ad' }}>
            Nenhum livro selecionado para comparação. Clique nos botões acima ou use "⚖️ Comparar" nos cards da Amazon.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Capa</th>
                  <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>Título & Autor ⇕</th>
                  <th onClick={() => handleSort('bsr')} style={{ cursor: 'pointer' }}>BSR ⇕</th>
                  <th onClick={() => handleSort('dailySales')} style={{ cursor: 'pointer' }}>Vendas/Dia ⇕</th>
                  <th onClick={() => handleSort('monthlyRevenue')} style={{ cursor: 'pointer' }}>Faturamento/Mês ⇕</th>
                  <th onClick={() => handleSort('monthlyRoyalty')} style={{ cursor: 'pointer' }}>Royalty/Mês ⇕</th>
                  <th onClick={() => handleSort('price')} style={{ cursor: 'pointer' }}>Preço ⇕</th>
                  <th onClick={() => handleSort('reviews')} style={{ cursor: 'pointer' }}>Reviews ⇕</th>
                  <th onClick={() => handleSort('rating')} style={{ cursor: 'pointer' }}>Nota ⇕</th>
                  <th onClick={() => handleSort('opportunityScore')} style={{ cursor: 'pointer' }}>Score ⇕</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedList.map((item) => (
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
                      <div style={{ fontSize: '11px', color: '#8b96ad' }}>{item.author} • {item.format}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#60a5fa' }}>
                      {formatBsr(item.bsr)}
                    </td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>
                      {item.dailySales ? `≈ ${formatNumber(item.dailySales, 1)}` : 'N/D'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#c084fc' }}>
                      {item.monthlyRevenue ? formatCurrency(item.monthlyRevenue, item.currency) : 'N/D'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                      {item.monthlyRoyalty ? formatCurrency(item.monthlyRoyalty, item.currency) : 'N/D'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#f0f3fa' }}>
                      {formatCurrency(item.price, item.currency)}
                    </td>
                    <td>{formatNumber(item.reviews)}</td>
                    <td>{item.rating ? `${item.rating} ★` : 'N/D'}</td>
                    <td>
                      <span className={`badge ${item.opportunityScore >= 70 ? 'badge-green' : item.opportunityScore >= 40 ? 'badge-yellow' : 'badge-red'}`}>
                        {item.opportunityScore} / 100
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => handleToggleAsin(item.asin)}
                        title="Remover da Comparação"
                      >
                        ✕
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
