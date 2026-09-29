import React, { useEffect, useState } from 'react';
import { NicheSnapshot, SnapshotComparison } from '../../types';
import { db } from '../../database/local-database';
import { formatCurrency, formatBsr, formatNumber } from '../../utils/formatters';
import { NicheAnalytics } from '../../estimators/niche-analytics';
import { exportBooksToCsv } from '../../utils/export-import';

export const NichesTab: React.FC = () => {
  const [snapshots, setSnapshots] = useState<NicheSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<NicheSnapshot | null>(null);
  const [comparePrevId, setComparePrevId] = useState<string>('');
  const [compareCurrId, setCompareCurrId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<SnapshotComparison | null>(null);

  const loadSnapshots = async () => {
    const list = await db.getNicheSnapshots();
    setSnapshots(list);
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  const handleDelete = async (id: string) => {
    await db.deleteSnapshot(id);
    if (selectedSnapshot?.id === id) setSelectedSnapshot(null);
    loadSnapshots();
  };

  const handleCompare = () => {
    const prev = snapshots.find(s => s.id === comparePrevId);
    const curr = snapshots.find(s => s.id === compareCurrId);
    if (prev && curr) {
      const res = NicheAnalytics.compareSnapshots(prev, curr);
      setComparisonResult(res);
    }
  };

  return (
    <div>
      <div className="header-banner">
        <div>
          <h2 className="page-title">Pesquisas & Nichos Salvos</h2>
          <div className="page-subtitle">Snapshots do mercado editorial e análise comparativa temporal</div>
        </div>
      </div>

      {/* Seletor de Comparação Temporal */}
      {snapshots.length >= 2 && (
        <div className="data-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 800, color: '#fff' }}>
            ⚖️ Comparador Temporal de Snapshots
          </h3>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#8b96ad', display: 'block', marginBottom: '4px' }}>Snapshot Anterior</span>
              <select className="input-field" value={comparePrevId} onChange={e => setComparePrevId(e.target.value)}>
                <option value="">Selecione um snapshot...</option>
                {snapshots.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.keyword} ({new Date(s.timestamp).toLocaleDateString('pt-BR')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#8b96ad', display: 'block', marginBottom: '4px' }}>Snapshot Mais Recente</span>
              <select className="input-field" value={compareCurrId} onChange={e => setCompareCurrId(e.target.value)}>
                <option value="">Selecione um snapshot...</option>
                {snapshots.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.keyword} ({new Date(s.timestamp).toLocaleDateString('pt-BR')})
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: '18px' }}
              onClick={handleCompare}
              disabled={!comparePrevId || !compareCurrId || comparePrevId === compareCurrId}
            >
              Comparar Snapshots
            </button>
          </div>

          {comparisonResult && (
            <div style={{ marginTop: '20px', padding: '16px', background: '#10131a', borderRadius: '8px', border: '1px solid #1f2633' }}>
              <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: '8px' }}>
                {comparisonResult.summary}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#8b96ad' }}>Variação BSR Médio</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: comparisonResult.bsrAverageDiff < 0 ? '#10b981' : '#ef4444' }}>
                    {comparisonResult.bsrAverageDiff < 0 ? `Melhorou ${Math.abs(comparisonResult.bsrAverageDiff)} posições` : `Subiu ${comparisonResult.bsrAverageDiff} posições`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#8b96ad' }}>Variação Preço Mediano</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#f0f3fa' }}>
                    {comparisonResult.medianPriceDiff >= 0 ? `+ R$ ${comparisonResult.medianPriceDiff}` : `- R$ ${Math.abs(comparisonResult.medianPriceDiff)}`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#8b96ad' }}>Novos Concorrentes</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#34d399' }}>
                    {comparisonResult.newBooks.length} livro(s)
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#8b96ad' }}>Títulos que Saíram</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#f87171' }}>
                    {comparisonResult.droppedBooks.length} livro(s)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabela de Snapshots Salvos */}
      <div className="data-card">
        <div className="data-card-header">
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#fff' }}>
            Snapshots Registrados
          </h3>
          <span className="badge badge-blue">{snapshots.length} salvo(s)</span>
        </div>

        {snapshots.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#8b96ad' }}>
            Nenhum snapshot de nicho salvo ainda. Quando estiver pesquisando na Amazon, clique em "📸 Snapshot" na barra flutuante.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Palavra-chave / Nicho</th>
                  <th>Livros</th>
                  <th>BSR Mediano</th>
                  <th>Preço Mediano</th>
                  <th>Concorrência</th>
                  <th>Faturamento Est. / Mês</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map(s => {
                  const compColor = 
                    s.summary.competitionLevel === 'BAIXA' ? 'badge-green' : 
                    s.summary.competitionLevel === 'MÉDIA' ? 'badge-yellow' : 'badge-red';

                  return (
                    <tr key={s.id}>
                      <td style={{ fontSize: '12px', color: '#8b96ad' }}>
                        {new Date(s.timestamp).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#fff' }}>
                        {s.keyword || 'Página de Livros'}
                      </td>
                      <td>{s.summary.totalBooks}</td>
                      <td style={{ fontWeight: 700, color: '#60a5fa' }}>
                        {s.summary.medianBsr ? formatBsr(s.summary.medianBsr) : 'N/D'}
                      </td>
                      <td style={{ fontWeight: 700, color: '#34d399' }}>
                        {s.summary.medianPrice ? formatCurrency(s.summary.medianPrice) : 'N/D'}
                      </td>
                      <td>
                        <span className={`badge ${compColor}`}>
                          {s.summary.competitionLevel} ({s.summary.competitionScore})
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#c084fc' }}>
                        {formatCurrency(s.summary.totalEstimatedMonthlyRevenue)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => exportBooksToCsv(s.books, `snapshot-${s.keyword}.csv`)}
                            title="Exportar Livros deste Snapshot em CSV"
                          >
                            📥 CSV
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => handleDelete(s.id)}
                            title="Excluir Snapshot"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
