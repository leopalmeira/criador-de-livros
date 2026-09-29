import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './dashboard.css';
import { OverviewTab } from './components/OverviewTab';
import { WatchlistTab } from './components/WatchlistTab';
import { NichesTab } from './components/NichesTab';
import { ComparatorTab } from './components/ComparatorTab';
import { SalesModelTab } from './components/SalesModelTab';
import { SettingsTab } from './components/SettingsTab';
import { ExportBackupTab } from './components/ExportBackupTab';
import { PrivacyTab } from './components/PrivacyTab';
import { DebugLogsTab } from './components/DebugLogsTab';
import { BookCreatorTab } from './components/BookCreatorTab';
import { CoverStudioTab } from './components/CoverStudioTab';
import { RepositoriesTab } from './components/RepositoriesTab';
import { BsrHistoryChart } from './components/Charts';
import { db } from '../database/local-database';
import { Book, Observation } from '../types';
import { formatCurrency, formatBsr, formatNumber } from '../utils/formatters';
import { defaultSalesEstimator } from '../estimators/sales-estimation-model';
import { defaultRoyaltyEstimator } from '../estimators/royalty-estimation-model';
import { defaultOpportunityCalculator } from '../estimators/opportunity-score';

interface NavSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: string;
    badge?: string;
  }[];
}

export const DashboardApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('bookCreator');
  const [modalBook, setModalBook] = useState<Book | null>(null);
  const [modalHistory, setModalHistory] = useState<Observation[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetTab = params.get('tab');
    if (targetTab) {
      setActiveTab(targetTab === 'creator' ? 'bookCreator' : targetTab);
    }
    const targetAsin = params.get('asin');
    if (targetAsin && !targetTab) {
      handleSelectBook(targetAsin);
    }
  }, []);

  const handleSelectBook = async (asin: string) => {
    const book = await db.getBook(asin);
    if (book) {
      const history = await db.getObservationsForBook(asin);
      setModalBook(book);
      setModalHistory(history);
    }
  };

  const navSections: NavSection[] = [
    {
      title: 'Criação & Produção KDP',
      items: [
        { id: 'bookCreator', label: 'Fluxo de Criação de Livros', icon: '⚡', badge: 'PRO' },
        { id: 'coverStudio', label: 'Gerador de Capa KDP', icon: '🎨', badge: '3D' },
        { id: 'repositories', label: 'Repositórios & Motores', icon: '📦' }
      ]
    },
    {
      title: 'Inteligência & Mercado',
      items: [
        { id: 'overview', label: 'Visão Geral', icon: '📊' },
        { id: 'watchlist', label: 'Livros Salvos', icon: '📌' },
        { id: 'niches', label: 'Pesquisas & Nichos', icon: '🔍' },
        { id: 'comparator', label: 'Comparador', icon: '⚖️' },
        { id: 'salesModel', label: 'Modelo de Vendas', icon: '📈' }
      ]
    },
    {
      title: 'Sistema & Dados',
      items: [
        { id: 'settings', label: 'Configurações', icon: '⚙️' },
        { id: 'exportBackup', label: 'Exportar / Backup', icon: '💾' },
        { id: 'privacy', label: 'Privacidade', icon: '🛡️' },
        { id: 'debugLogs', label: 'Diagnóstico & Logs', icon: '📋' }
      ]
    }
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar de Navegação Categorizada */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">⚡</div>
          <div>
            <div className="brand-title">BookIntel</div>
            <div className="brand-sub">KDP Book Platform</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} style={{ marginBottom: '8px' }}>
              <div className="sidebar-section-label">{section.title}</div>
              {section.items.map(item => (
                <div
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span style={{ fontSize: '15px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && <span className="nav-badge-pill">{item.badge}</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div><strong>100% Local & Privado</strong></div>
          <div style={{ marginTop: '4px' }}>wesleyscholl & ShonP KDP Core</div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="dashboard-main">
        {activeTab === 'overview' && (
          <OverviewTab onSelectBook={handleSelectBook} onNavigateTab={setActiveTab} />
        )}
        {activeTab === 'bookCreator' && <BookCreatorTab />}
        {activeTab === 'coverStudio' && <CoverStudioTab />}
        {activeTab === 'repositories' && <RepositoriesTab />}
        {activeTab === 'watchlist' && (
          <WatchlistTab onSelectBook={handleSelectBook} />
        )}
        {activeTab === 'niches' && <NichesTab />}
        {activeTab === 'comparator' && <ComparatorTab />}
        {activeTab === 'salesModel' && <SalesModelTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'exportBackup' && <ExportBackupTab />}
        {activeTab === 'privacy' && <PrivacyTab />}
        {activeTab === 'debugLogs' && <DebugLogsTab />}
      </main>

      {/* Modal de Inspeção Profunda de Livro */}
      {modalBook && (
        <div className="bookintel-modal-backdrop" onClick={() => setModalBook(null)}>
          <div className="bookintel-modal-window" onClick={e => e.stopPropagation()}>
            <div className="bookintel-modal-header">
              <div>
                <span className="badge badge-blue">INSPEÇÃO DE LIVRO</span>
                <h2 style={{ margin: '6px 0 2px 0', fontSize: '18px', color: '#fff' }}>
                  {modalBook.title}
                </h2>
                <div style={{ fontSize: '12px', color: '#8b96ad' }}>
                  {modalBook.author} • ASIN: {modalBook.asin} • {modalBook.format}
                </div>
              </div>
              <button className="bookintel-close-btn" onClick={() => setModalBook(null)}>✕</button>
            </div>

            {/* Gráfico Histórico */}
            <div className="data-card" style={{ padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong style={{ fontSize: '13px', color: '#fff' }}>Evolução do BSR Observado</strong>
                <span style={{ fontSize: '11px', color: '#8b96ad' }}>{modalHistory.length} observações</span>
              </div>
              <BsrHistoryChart observations={modalHistory} />
            </div>

            {/* Informações detalhadas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#141822', padding: '10px', borderRadius: '8px', border: '1px solid #1f2633' }}>
                <div style={{ fontSize: '10px', color: '#8b96ad', textTransform: 'uppercase' }}>Preço</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                  {formatCurrency(modalBook.price, modalBook.currency)}
                </div>
              </div>

              <div style={{ background: '#141822', padding: '10px', borderRadius: '8px', border: '1px solid #1f2633' }}>
                <div style={{ fontSize: '10px', color: '#8b96ad', textTransform: 'uppercase' }}>Avaliações</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#f0f3fa', marginTop: '2px' }}>
                  {modalBook.reviewCount ? `${formatNumber(modalBook.reviewCount)} (${modalBook.rating || 'N/D'} ★)` : 'N/D'}
                </div>
              </div>

              <div style={{ background: '#141822', padding: '10px', borderRadius: '8px', border: '1px solid #1f2633' }}>
                <div style={{ fontSize: '10px', color: '#8b96ad', textTransform: 'uppercase' }}>Páginas</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#f0f3fa', marginTop: '2px' }}>
                  {modalBook.pages || 'N/D'}
                </div>
              </div>

              <div style={{ background: '#141822', padding: '10px', borderRadius: '8px', border: '1px solid #1f2633' }}>
                <div style={{ fontSize: '10px', color: '#8b96ad', textTransform: 'uppercase' }}>Publicação</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0f3fa', marginTop: '4px' }}>
                  {modalBook.publicationDate || 'N/D'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={() => window.open(modalBook.url, '_blank')}
              >
                Abrir na Amazon ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('dashboard-root')!);
root.render(<DashboardApp />);
