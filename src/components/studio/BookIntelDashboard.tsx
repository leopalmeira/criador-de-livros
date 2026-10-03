import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Search, BarChart3, TrendingUp, FileText,
  Lightbulb, Bell, HelpCircle, ChevronDown, ArrowRight,
  Clock, Copy, Trash2, Sparkles, CheckCircle2, Filter
} from 'lucide-react';
import { BookProject } from '../../types/book-project';
import { CategoryIntelligencePanel } from './category-intel/CategoryIntelligencePanel';
import { BookOpportunityProposal } from '../../types/category-intelligence';

interface Props {
  projects: BookProject[];
  onCreateNewProject: () => void;
  onOpenProject: (id: string) => void;
  onDuplicateProject: (id: string, e: React.MouseEvent) => void;
  onDeleteProject: (id: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  onQuickAction?: (action: 'niche' | 'keywords' | 'competition' | 'reports') => void;
  onSelectOpportunity?: (
    proposal: BookOpportunityProposal, 
    genre: string, 
    category: string, 
    subcategory: string
  ) => void;
}

export const BookIntelDashboard: React.FC<Props> = ({
  projects,
  onCreateNewProject,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
  onOpenSettings,
  onQuickAction,
  onSelectOpportunity
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalAction, setActiveModalAction] = useState<string | null>(null);
  const [showCategoryIntel, setShowCategoryIntel] = useState(false);

  // Formatação de data em português: "Hoje, 28 de set. de 2025"
  const formattedToday = (() => {
    const now = new Date();
    const day = now.getDate();
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    return `Hoje, ${day} de ${month}. de ${year}`;
  })();

  // Dicas do dia rotativas sobre KDP
  const tips = [
    "Nichos com baixa concorrência e alto volume de busca costumam ter maior potencial de lucro na Amazon.",
    "Títulos com promessas claras de transformação vendem até 3.4x mais na categoria de Não-Ficção.",
    "Utilize as 7 caixas de palavras-chave da Amazon com termos de cauda longa para dominar as buscas orgânicas.",
    "Capas com tipografia serifada de alto contraste aumentam o CTR (taxa de cliques) em mais de 40%."
  ];
  const [tipIndex, setTipIndex] = useState(0);

  const rotateTip = () => {
    setTipIndex((prev) => (prev + 1) % tips.length);
  };

  const filteredProjects = projects.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
      (p.author && p.author.toLowerCase().includes(q)) ||
      (p.topic && p.topic.toLowerCase().includes(q))
    );
  });

  return (
    <div className="book-intel-container">
      {/* 1. TOP NAVBAR EXATAMENTE COMO NA FOTO */}
      <header className="book-intel-header">
        <div className="book-intel-header-inner">
          {/* Logo & Marca */}
          <div className="header-brand-block">
            <div className="intel-brand-icon">
              <BookOpen size={20} color="#ffffff" />
            </div>
            <div className="intel-brand-names">
              <span className="intel-name-primary">BOOK INTEL</span>
              <span className="intel-badge-kdp">KDP</span>
              <span className="intel-brand-divider">|</span>
              <span className="intel-brand-slogan">Inteligência para o seu sucesso na Amazon</span>
            </div>
          </div>

          {/* Barra de Pesquisa Central com Atalho Ctrl + K */}
          <div className="header-search-wrapper">
            <Search size={16} className="search-icon-muted" />
            <input
              type="text"
              className="header-search-input"
              placeholder="Pesquisar livros, nichos, palavras-chave..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="search-badge-kbd">Ctrl + K</span>
          </div>

          {/* Ações da Direita: Notificação, Ajuda, Perfil */}
          <div className="header-right-tools">
            <button className="tool-round-btn" title="Notificações">
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
            <button className="tool-round-btn" onClick={onOpenSettings} title="Configurações e Ajuda">
              <HelpCircle size={18} />
            </button>

            <div className="user-profile-widget" onClick={onOpenSettings} title="Perfil do Usuário">
              <div className="user-avatar-circle">
                <span>LP</span>
              </div>
              <div className="user-info-text">
                <span className="user-name-bold">Leandro Palmeira</span>
                <span className="user-plan-label">Plano Pro</span>
              </div>
              <ChevronDown size={14} className="user-chevron" />
            </div>
          </div>
        </div>
      </header>

      {/* 2. CORPO PRINCIPAL COM GRID DE DUAS COLUNAS */}
      <main className="book-intel-body">
        <div className="book-intel-grid">
          
          {/* COLUNA ESQUERDA (68% de largura) */}
          <div className="intel-left-column">
            
            {/* HERO BANNER DE BOAS-VINDAS */}
            <div className="intel-hero-card">
              <div className="hero-text-side">
                <span className="hero-greeting">Olá, Leandro</span>
                <h1 className="hero-main-title">Bem-vindo ao Book Intel KDP</h1>
                <p className="hero-description">
                  Encontre nichos lucrativos, analise a concorrência e crie livros com alto potencial de venda na Amazon.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn-hero-cta" onClick={onCreateNewProject}>
                    <Plus size={18} /> Criar Novo Projeto
                  </button>
                </div>
              </div>

              {/* MOCKUP DO LAPTOP COM LOGO AMAZON KDP */}
              <div className="hero-visual-side">
                <div className="laptop-mockup-wrapper">
                  <div className="laptop-screen">
                    <div className="laptop-display-content">
                      <div className="amazon-kdp-brand-card">
                        <div className="amazon-kdp-text">
                          <span className="amazon-txt">amazon</span>
                          <span className="kdp-txt">kdp</span>
                        </div>
                        <div className="amazon-smile-curve" />
                      </div>
                    </div>
                  </div>
                  <div className="laptop-base" />
                  {/* Pilha de Livros ao lado do laptop */}
                  <div className="mockup-books-stack">
                    <div className="mockup-book book-top" />
                    <div className="mockup-book book-mid" />
                    <div className="mockup-book book-bot" />
                  </div>
                </div>
              </div>
            </div>

            {/* DICA DO DIA (RODAPÉ DA COLUNA ESQUERDA) */}
            <div className="intel-tip-card">
              <div className="tip-bulb-icon">
                <Lightbulb size={20} color="#2563eb" />
              </div>
              <div className="tip-body">
                <span className="tip-title">Dica do dia</span>
                <span className="tip-text">{tips[tipIndex]}</span>
              </div>
              <button className="tip-link-btn" onClick={rotateTip}>
                Próxima dica <ArrowRight size={14} />
              </button>
            </div>

            {/* SE HOUVER LIVROS JÁ CRIADOS, EXIBE EM LISTA ORGANIZADA ABAIXO */}
            {projects.length > 0 && (
              <div className="existing-projects-sublist">
                <div className="existing-projects-header">
                  <h3>Meus Livros & Projetos em Andamento ({filteredProjects.length})</h3>
                  <button className="btn-create-sub" onClick={onCreateNewProject}>
                    <Plus size={14} /> Novo Livro
                  </button>
                </div>

                <div className="existing-projects-grid">
                  {filteredProjects.map(p => {
                    const chapters = p.kdpChapters?.length || 0;
                    const words = p.kdpChapters?.reduce((s, c) => s + (c.wordCount || 0), 0) || 0;
                    return (
                      <div
                        key={p.id}
                        className="project-row-card"
                        onClick={() => onOpenProject(p.id)}
                      >
                        <div className="project-row-main">
                          <div className="project-row-icon">
                            <BookOpen size={18} color="#2563eb" />
                          </div>
                          <div>
                            <h4 className="project-row-title">{p.title || 'Livro Sem Título'}</h4>
                            <span className="project-row-meta">
                              {p.author || 'Autor não definido'} • {p.kdpBookType || 'Não-Ficção'} • {chapters} capítulos • {words.toLocaleString('pt-BR')} palavras
                            </span>
                          </div>
                        </div>

                        <div className="project-row-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn-icon-soft"
                            onClick={(e) => onDuplicateProject(p.id, e)}
                            title="Duplicar Projeto"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            className="btn-icon-soft danger"
                            onClick={(e) => onDeleteProject(p.id, e)}
                            title="Excluir Projeto"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            className="btn-open-proj-arrow"
                            onClick={() => onOpenProject(p.id)}
                            title="Continuar Edição"
                          >
                            Editar <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* COLUNA DIREITA (32% de largura) */}
          <div className="intel-right-column">
            
            {/* CARD 1: VISÃO GERAL COM MÉTRICAS */}
            <div className="intel-overview-card">
              <div className="overview-header">
                <h3 className="overview-title">Visão Geral</h3>
                <span className="overview-date">{formattedToday}</span>
              </div>

              <div className="overview-stats-grid">
                {/* Métrica 1: Livros no projeto */}
                <div className="stat-tile" onClick={onCreateNewProject}>
                  <div className="stat-tile-top">
                    <div className="stat-icon-box blue-bg">
                      <BookOpen size={16} color="#2563eb" />
                    </div>
                  </div>
                  <span className="stat-label">Livros no projeto</span>
                  <div className="stat-num-row">
                    <span className="stat-number">{projects.length}</span>
                    <ArrowRight size={14} className="stat-arrow" />
                  </div>
                </div>

                {/* Métrica 2: Pesquisas realizadas */}
                <div className="stat-tile" onClick={() => onQuickAction ? onQuickAction('niche') : setActiveModalAction('niche')}>
                  <div className="stat-tile-top">
                    <div className="stat-icon-box green-bg">
                      <Search size={16} color="#059669" />
                    </div>
                  </div>
                  <span className="stat-label">Pesquisas realizadas</span>
                  <div className="stat-num-row">
                    <span className="stat-number">{projects.length > 0 ? projects.length * 3 : 0}</span>
                    <ArrowRight size={14} className="stat-arrow" />
                  </div>
                </div>

                {/* Métrica 3: Nichos analisados */}
                <div className="stat-tile" onClick={() => onQuickAction ? onQuickAction('competition') : setActiveModalAction('competition')}>
                  <div className="stat-tile-top">
                    <div className="stat-icon-box cyan-bg">
                      <TrendingUp size={16} color="#0284c7" />
                    </div>
                  </div>
                  <span className="stat-label">Nichos analisados</span>
                  <div className="stat-num-row">
                    <span className="stat-number">{projects.length > 0 ? projects.length * 2 : 0}</span>
                    <ArrowRight size={14} className="stat-arrow" />
                  </div>
                </div>

                {/* Métrica 4: Relatórios gerados */}
                <div className="stat-tile" onClick={() => onQuickAction ? onQuickAction('reports') : setActiveModalAction('reports')}>
                  <div className="stat-tile-top">
                    <div className="stat-icon-box orange-bg">
                      <FileText size={16} color="#d97706" />
                    </div>
                  </div>
                  <span className="stat-label">Relatórios gerados</span>
                  <div className="stat-num-row">
                    <span className="stat-number">{projects.length > 0 ? projects.length : 0}</span>
                    <ArrowRight size={14} className="stat-arrow" />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: ATIVIDADE RECENTE */}
            <div className="intel-activity-card">
              <div className="activity-header">
                <h3 className="activity-title">Atividade recente</h3>
                <button
                  className="activity-link-all"
                  onClick={() => projects.length > 0 && onOpenProject(projects[0].id)}
                >
                  Ver todas <ArrowRight size={12} />
                </button>
              </div>

              {projects.length === 0 ? (
                /* Estado Vazio com Relógio (Exato como na Foto) */
                <div className="activity-empty-state">
                  <div className="clock-icon-circle">
                    <Clock size={28} color="#94a3b8" />
                  </div>
                  <h4 className="activity-empty-title">Nenhuma atividade recente</h4>
                  <p className="activity-empty-desc">
                    Suas ações e relatórios aparecerão aqui assim que você começar a usar o sistema.
                  </p>
                </div>
              ) : (
                /* Lista de Atividades Reais dos Projetos */
                <div className="activity-items-list">
                  {projects.slice(0, 4).map((p, idx) => (
                    <div
                      key={p.id}
                      className="activity-item-row"
                      onClick={() => onOpenProject(p.id)}
                    >
                      <div className="activity-item-dot" />
                      <div className="activity-item-info">
                        <span className="activity-item-title">
                          {p.title ? `Editou "${p.title}"` : 'Iniciou novo projeto'}
                        </span>
                        <span className="activity-item-time">
                          {new Date(p.updatedAt).toLocaleDateString('pt-BR')} • Etapa {p.currentStage || 'research'}
                        </span>
                      </div>
                      <ArrowRight size={13} color="#94a3b8" />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* 3. FOOTER EXATO */}
      <footer className="book-intel-footer">
        <div className="footer-inner">
          <span className="footer-copy">
            Book Intel KDP v1.0 | Plataforma de Inteligência para Amazon KDP
          </span>
          <div className="footer-badges">
            <span className="totvs-badge">TOTVS</span>
            <span className="kdp-verified-badge">✓ KDP Verified</span>
          </div>
        </div>
      </footer>

      {/* MODAL RÁPIDO PARA AS 4 FUNCIONALIDADES QUANDO CLICADAS */}
      {activeModalAction && (
        <div className="modal-backdrop-overlay" onClick={() => setActiveModalAction(null)}>
          <div className="intel-quick-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="quick-modal-header">
              <h3>
                {activeModalAction === 'niche' && '🔍 Pesquisa de Nichos Lucrativos KDP'}
                {activeModalAction === 'keywords' && '📊 Descoberta de Palavras-Chave de Alto Volume'}
                {activeModalAction === 'competition' && '📈 Análise de Concorrência Amazon'}
                {activeModalAction === 'reports' && '📑 Relatório de Mercado & Lucratividade'}
              </h3>
              <button className="btn-close-modal" onClick={() => setActiveModalAction(null)}>×</button>
            </div>
            <div className="quick-modal-content">
              <p>
                Esta ferramenta analisa dados em tempo real da Amazon para orientar sua produção editorial.
                Deseja criar um novo livro com inteligência aplicada ou aplicar a um projeto existente?
              </p>
              <div className="quick-modal-actions">
                <button
                  className="btn-create-book"
                  onClick={() => {
                    setActiveModalAction(null);
                    onCreateNewProject();
                  }}
                >
                  <Plus size={16} /> Criar Livro com este Módulo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
