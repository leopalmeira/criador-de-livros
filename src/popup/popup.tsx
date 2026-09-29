import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';
import { db } from '../database/local-database';
import { AppSettings, Marketplace } from '../types';
import { BookProject } from '../types/book-project';
import { formatCurrency, formatNumber, formatBsr } from '../utils/formatters';

interface ProductBookData {
  asin: string;
  title: string;
  author?: string;
  price?: number;
  currency?: string;
  format?: string;
  pages?: number;
  rating?: number;
  reviewCount?: number;
  bsr?: number;
  bsrCategories?: Array<{ category: string; rank: number }>;
  coverImage?: string;
  salesEst?: {
    estimatedDailySales: number;
    estimatedMonthlySales: number;
    confidence: string;
  };
  royaltyEst?: {
    estimatedDailyRoyalty: number;
    estimatedMonthlyRoyalty: number;
  };
  oppScore?: {
    overallScore: number;
    salesScore: number;
    reviewBarrierScore: number;
  };
}

interface ListingSummaryData {
  totalBooks: number;
  avgPrice: number;
  avgBsr: number;
  avgReviews: number;
  keyword: string;
  currency: string;
  topBooks: Array<{
    asin: string;
    title: string;
    author?: string;
    price?: number;
    bsr?: number;
    coverImage?: string;
    rating?: number;
    reviewCount?: number;
  }>;
}

interface PageStatusResponse {
  pageType: string;
  marketplace: string;
  booksCount: number;
  url: string;
  productBook?: ProductBookData | null;
  listingSummary?: ListingSummaryData | null;
}

const MARKETPLACE_FLAGS: Record<string, string> = {
  'amazon.com.br': '🇧🇷 Brasil',
  'amazon.com': '🇺🇸 EUA',
  'amazon.co.uk': '🇬🇧 UK',
  'amazon.de': '🇩🇪 Alemanha',
  'amazon.es': '🇪🇸 Espanha',
  'amazon.fr': '🇫🇷 França',
  'amazon.it': '🇮🇹 Itália',
  'amazon.ca': '🇨🇦 Canadá',
  'amazon.co.jp': '🇯🇵 Japão',
  'amazon.com.mx': '🇲🇽 México'
};

export const PopupApp: React.FC = () => {
  const [isAmazon, setIsAmazon] = useState(false);
  const [detectedMarketplace, setDetectedMarketplace] = useState<string>('amazon.com.br');
  const [pageInfo, setPageInfo] = useState<PageStatusResponse | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'monitor' | 'settings'>('monitor');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recentProject, setRecentProject] = useState<BookProject | null>(null);

  // Consulta aba ativa, projetos e content script
  useEffect(() => {
    db.getSettings().then(setSettings);
    db.getAllBookProjects().then(projs => {
      if (projs && projs.length > 0) {
        setRecentProject(projs[projs.length - 1]);
      }
    });

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.url && tab.url.includes('amazon.')) {
          setIsAmazon(true);
          const match = tab.url.match(/amazon\.[a-z.]+/i);
          if (match) setDetectedMarketplace(match[0].toLowerCase());

          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_STATUS' }, (res) => {
              setIsLoading(false);
              if (chrome.runtime.lastError) {
                return;
              }
              if (res) {
                setPageInfo(res);
              }
            });
          } else {
            setIsLoading(false);
          }
        } else {
          setIsAmazon(false);
          setIsLoading(false);
        }
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const openDashboard = (params: string = '') => {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        const url = chrome.runtime.getURL(`dashboard.html${params ? '?' + params : ''}`);
        chrome.tabs.create({ url });
        window.close();
        return;
      }
    } catch (e) {
      console.error(e);
    }
    window.open(`dashboard.html${params ? '?' + params : ''}`, '_blank');
  };

  const reanalyzePage = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'REANALYZE_PAGE' }, () => {
            window.location.reload();
          });
        }
      });
    }
  };

  const handleToggle = async (key: keyof AppSettings) => {
    if (!settings) return;
    const updated = await db.saveSettings({ [key]: !settings[key] });
    setSettings(updated);
  };

  const openAmazonStore = (domain: string) => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: `https://www.${domain}/` });
      window.close();
    } else {
      window.open(`https://www.${domain}/`, '_blank');
    }
  };

  const pb = pageInfo?.productBook;
  const ls = pageInfo?.listingSummary;

  return (
    <div className="popup-container">
      {/* HEADER TOTVS / ENTERPRISE */}
      <div className="popup-header">
        <div className="popup-logo" onClick={() => openDashboard()} style={{ cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>⚡</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: '14px', letterSpacing: '-0.3px', color: '#ffffff' }}>
              BookIntel Pro
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
              KDP Market Intelligence
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`status-badge ${isAmazon ? 'active' : 'inactive'}`}>
            {isAmazon ? (MARKETPLACE_FLAGS[detectedMarketplace] || detectedMarketplace) : 'Fora da Amazon'}
          </span>
          <button 
            className="btn-header-action" 
            onClick={() => openDashboard()} 
            title="Abrir Dashboard Geral"
          >
            📊 Painel
          </button>
        </div>
      </div>

      {/* SUB-NAV */}
      <div className="popup-subnav">
        <button 
          className={`subnav-btn ${activeTab === 'monitor' ? 'active' : ''}`}
          onClick={() => setActiveTab('monitor')}
        >
          <span>👁️</span> Monitor ao Vivo
        </button>
        <button 
          className={`subnav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span>⚙️</span> Ajustes & Overlays
        </button>
      </div>

      {/* CONTEÚDO PRINCIPAL: MONITOR AO VIVO */}
      {activeTab === 'monitor' && (
        <div className="popup-body">
          {/* BANNER DO LIVRO ATIVO EM PRODUÇÃO */}
          {recentProject && (
            <div className="popup-active-project-card" style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '1px solid #3b82f640',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '14px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⚡ Livro em Produção
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#3b82f625',
                  color: '#60a5fa'
                }}>
                  {recentProject.status}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {recentProject.title}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', margin: '6px 0 8px 0' }}>
                <span>Capítulos: <strong>{recentProject.kdpChapters?.filter(c => !!c.prose).length || 0}/{recentProject.kdpChapters?.length || 0}</strong></span>
                <span>Palavras: <strong>{(recentProject.kdpChapters?.reduce((s, c) => s + (c.wordCount || 0), 0) || 0).toLocaleString()}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => openDashboard('tab=bookCreator')}
                  style={{
                    flex: 1,
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🚀 Continuar Livro
                </button>
                <button
                  onClick={() => openDashboard('tab=bookCreator')}
                  style={{
                    background: '#1e293b',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    borderRadius: '5px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Estúdio
                </button>
              </div>
            </div>
          )}

          {/* CASO 1: PÁGINA INDIVIDUAL DE LIVRO NA AMAZON */}
          {isAmazon && pb && (
            <div className="product-monitor-card">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                {pb.coverImage ? (
                  <img src={pb.coverImage} alt="Capa" className="book-thumb" />
                ) : (
                  <div className="book-thumb-placeholder">📖</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="badge-tag">PÁGINA DO LIVRO DETECTADA</div>
                  <h4 className="book-title" title={pb.title}>{pb.title}</h4>
                  <div className="book-author">Por <strong>{pb.author || 'Autor'}</strong></div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <span className="book-format">{pb.format || 'Kindle'}</span>
                    <span className="book-price">
                      {pb.price ? formatCurrency(pb.price, pb.currency || 'BRL') : 'Preço n/d'}
                    </span>
                    <span className="book-asin">ASIN: {pb.asin}</span>
                  </div>
                </div>
              </div>

              {/* GRADE DE MÉTRICAS AO VIVO */}
              <div className="metrics-grid">
                <div className="metric-box">
                  <div className="metric-lbl">🏆 BSR (Ranking)</div>
                  <div className="metric-val highlight">
                    {pb.bsr ? formatBsr(pb.bsr) : 'Não listado'}
                  </div>
                  <div className="metric-sub">
                    {pb.bsr && pb.bsr < 5000 ? '🔥 Alta Demanda' : pb.bsr && pb.bsr < 30000 ? '✅ Demanda Média' : 'Demanda Baixa'}
                  </div>
                </div>

                <div className="metric-box">
                  <div className="metric-lbl">📦 Vendas / Mês</div>
                  <div className="metric-val">
                    {pb.salesEst?.estimatedMonthlySales 
                      ? `${formatNumber(pb.salesEst.estimatedMonthlySales)} ex.` 
                      : (pb.bsr ? '~15-30 ex.' : '—')}
                  </div>
                  <div className="metric-sub">
                    {pb.salesEst?.estimatedDailySales ? `~${pb.salesEst.estimatedDailySales} ex./dia` : 'Estimativa diária'}
                  </div>
                </div>

                <div className="metric-box">
                  <div className="metric-lbl">💰 Faturamento / Mês</div>
                  <div className="metric-val green">
                    {pb.salesEst?.estimatedMonthlySales && pb.price
                      ? formatCurrency(pb.salesEst.estimatedMonthlySales * pb.price, pb.currency || 'BRL')
                      : '—'}
                  </div>
                  <div className="metric-sub">Receita Bruta Est.</div>
                </div>

                <div className="metric-box">
                  <div className="metric-lbl">💵 Royalties KDP / Mês</div>
                  <div className="metric-val purple">
                    {pb.royaltyEst?.estimatedMonthlyRoyalty
                      ? formatCurrency(pb.royaltyEst.estimatedMonthlyRoyalty, pb.currency || 'BRL')
                      : '—'}
                  </div>
                  <div className="metric-sub">Lucro Líquido Est.</div>
                </div>
              </div>

              {/* OPPORTUNITY SCORE BAR */}
              <div className="opp-score-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#f8fafc' }}>
                    Opportunity Score KDP:
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: (pb.oppScore?.overallScore || 50) >= 70 ? '#34d399' : '#f59e0b' }}>
                    {pb.oppScore?.overallScore || 75} / 100
                  </span>
                </div>
                <div className="opp-progress-track">
                  <div 
                    className="opp-progress-fill" 
                    style={{ 
                      width: `${pb.oppScore?.overallScore || 75}%`,
                      background: (pb.oppScore?.overallScore || 50) >= 70 ? '#10b981' : '#f59e0b'
                    }}
                  />
                </div>
              </div>

              {/* BOTÕES DE AÇÃO IMEDIATA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                <button 
                  className="btn-create-competitor"
                  onClick={() => openDashboard(`tab=creator&idea=${encodeURIComponent(`Livro concorrente sobre ${pb.title}`)}`)}
                >
                  <span>🚀</span> Criar Livro Concorrente deste Nicho com IA
                </button>

                <button 
                  className="btn-view-details"
                  onClick={() => openDashboard(`asin=${pb.asin}`)}
                >
                  <span>📈</span> Ver Análise Aprofundada no Dashboard
                </button>
              </div>
            </div>
          )}

          {/* CASO 2: PÁGINA DE BUSCA OU MAIS VENDIDOS NA AMAZON */}
          {isAmazon && !pb && ls && (
            <div className="listing-monitor-card">
              <div className="badge-tag">NICHO / LISTAGEM IDENTIFICADA</div>
              <h3 style={{ margin: '4px 0 10px 0', fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                "{ls.keyword}"
              </h3>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px' }}>
                <strong>{ls.totalBooks}</strong> livros analisados em tempo real nesta página
              </div>

              {/* BENCHMARKS DO NICHO */}
              <div className="metrics-grid">
                <div className="metric-box">
                  <div className="metric-lbl">🏷️ Preço Médio</div>
                  <div className="metric-val">{formatCurrency(ls.avgPrice, ls.currency)}</div>
                </div>

                <div className="metric-box">
                  <div className="metric-lbl">📊 BSR Médio</div>
                  <div className="metric-val highlight">
                    {ls.avgBsr > 0 ? `#${formatNumber(ls.avgBsr)}` : 'Múltiplos'}
                  </div>
                </div>

                <div className="metric-box">
                  <div className="metric-lbl">⭐ Reviews Médios</div>
                  <div className="metric-val">{formatNumber(ls.avgReviews)} reviews</div>
                </div>

                <div className="metric-box">
                  <div className="metric-lbl">⚡ Barreira de Entrada</div>
                  <div className="metric-val green">
                    {ls.avgReviews < 100 ? 'Muito Baixa' : ls.avgReviews < 500 ? 'Moderada' : 'Alta'}
                  </div>
                </div>
              </div>

              {/* MINI RANKING DOS TOP LIVROS */}
              {ls.topBooks.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Top Livros do Nicho na Página:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {ls.topBooks.slice(0, 3).map((b, idx) => (
                      <div key={b.asin || idx} className="mini-book-item">
                        <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '11px', width: '18px' }}>#{idx + 1}</span>
                        {b.coverImage && <img src={b.coverImage} alt="" style={{ width: '22px', height: '30px', objectFit: 'cover', borderRadius: '2px' }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.title}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                            {b.price ? formatCurrency(b.price, ls.currency) : ''} {b.bsr ? `• BSR #${formatNumber(b.bsr)}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                className="btn-create-competitor"
                style={{ marginTop: '16px' }}
                onClick={() => openDashboard(`tab=creator&idea=${encodeURIComponent(ls.keyword)}`)}
              >
                <span>⚡</span> Criar Livro para Dominar este Nicho com IA
              </button>
            </div>
          )}

          {/* CASO 3: NA AMAZON MAS CARREGANDO OU PÁGINA GENÉRICA */}
          {isAmazon && !pb && !ls && (
            <div style={{ padding: '16px', textAlign: 'center', background: '#1e293b', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '13px' }}>
                Monitorando Página da Amazon...
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.5 }}>
                Abra uma página de livro individual ou faça uma pesquisa de livros para ver as análises completas ao vivo.
              </div>
              <button 
                onClick={reanalyzePage}
                style={{ marginTop: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                🔄 Reprocessar Página Agora
              </button>
            </div>
          )}

          {/* CASO 4: FORA DA AMAZON */}
          {!isAmazon && (
            <div className="not-amazon-card">
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌐</div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                Abra a Amazon para Monitorar
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                O BookIntel monitora automaticamente BSR, faturamento, royalties e concorrência enquanto você navega. Escolha uma loja:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <button className="btn-store" onClick={() => openAmazonStore('amazon.com.br')}>
                  🇧🇷 Amazon Brasil
                </button>
                <button className="btn-store" onClick={() => openAmazonStore('amazon.com')}>
                  🇺🇸 Amazon EUA
                </button>
                <button className="btn-store" onClick={() => openAmazonStore('amazon.co.uk')}>
                  🇬🇧 Reino Unido
                </button>
                <button className="btn-store" onClick={() => openAmazonStore('amazon.de')}>
                  🇩🇪 Alemanha
                </button>
              </div>

              <button className="btn-open-creator" onClick={() => openDashboard('tab=creator')}>
                <span>⚡</span> Abrir Criador de Livros KDP com IA
              </button>
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO: AJUSTES & OVERLAYS */}
      {activeTab === 'settings' && settings && (
        <div className="popup-body">
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '10px' }}>
              Comportamento Visual na Amazon
            </div>

            <div className="switch-row">
              <div>
                <div className="switch-label">Overlays nos Resultados de Busca</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Exibe caixa com BSR e vendas em cada card de livro</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showOverlayOnCards}
                  onChange={() => handleToggle('showOverlayOnCards')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="switch-row">
              <div>
                <div className="switch-label">Painel Lateral na Página do Livro</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Exibe métricas detalhadas e simulador de royalties</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showProductPanel}
                  onChange={() => handleToggle('showProductPanel')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="switch-row">
              <div>
                <div className="switch-label">Barra Superior de Análise de Nicho</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Exibe médias e oportunidade no topo da busca</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showNicheBar}
                  onChange={() => handleToggle('showNicheBar')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="switch-row">
              <div>
                <div className="switch-label">Modo Diagnóstico Técnico</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Registra logs detalhados de seletores no console</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.debugMode}
                  onChange={() => handleToggle('debugMode')}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <button 
            className="btn-primary" 
            style={{ marginTop: '16px' }} 
            onClick={() => openDashboard('tab=settings')}
          >
            ⚙️ Abrir Configurações Completas
          </button>
        </div>
      )}

      {/* FOOTER CORPORATIVO */}
      <div className="popup-footer">
        <button className="btn-full-dashboard" onClick={() => openDashboard()}>
          📊 Abrir Plataforma Editorial & Dashboard Completo ➔
        </button>
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#64748b', marginTop: '8px' }}>
          BookIntel Enterprise v1.0 • 100% Local • KDP Ready
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('popup-root')!);
root.render(<PopupApp />);
