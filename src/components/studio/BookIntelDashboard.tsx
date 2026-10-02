import React, { useState } from 'react';
import {
  BookOpen, Plus, Bell, HelpCircle, ChevronDown, ArrowRight,
  Clock, Copy, Trash2, BarChart3
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
  onSelectOpportunity
}) => {
  const [showCategoryIntel, setShowCategoryIntel] = useState(false);

  // Formatação de data em português: "Hoje, 28 de set. de 2026"
  const formattedToday = (() => {
    const now = new Date();
    const day = now.getDate();
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    return `Hoje, ${day} de ${month}. de ${year}`;
  })();

  return (
    <div className="book-intel-container">
      {/* 1. TOP NAVBAR LIMPA (SEM BARRA DE PESQUISA) */}
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
                  Crie e publique livros profissionais para a Amazon KDP com apoio de inteligência artificial de ponta a ponta.
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

            {/* PAINEL EXPANSÍVEL: BOOK INTEL KDP - INTELIGÊNCIA COMERCIAL POR GÊNERO */}
            {showCategoryIntel && (
              <div style={{ marginBottom: 28, animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart3 size={18} color="#3b82f6" />
                    Camada de Inteligência Comercial (Amazon KDP)
                  </h3>
                  <button
                    onClick={() => setShowCategoryIntel(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #334155',
                      color: '#94a3b8',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Fechar Painel
                  </button>
                </div>
                <CategoryIntelligencePanel
                  onSelectOpportunity={onSelectOpportunity}
                />
              </div>
            )}

            {/* SEÇÃO PRINCIPAL DE LIVROS EM PROJETO */}
            <div className="existing-projects-sublist" style={{ marginTop: 0 }}>
              <div className="existing-projects-header">
                <h3>Meus Livros & Projetos ({projects.length})</h3>
                <button className="btn-create-sub" onClick={onCreateNewProject}>
                  <Plus size={14} /> Novo Livro
                </button>
              </div>

              {projects.length === 0 ? (
                <div style={{
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto'
                  }}>
                    <BookOpen size={28} color="#2563eb" />
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 16, color: '#0f172a', fontWeight: 700 }}>
                    Nenhum livro criado ainda
                  </h4>
                  <p style={{ margin: '0 auto 20px auto', fontSize: 13, color: '#64748b', maxWidth: 420 }}>
                    Clique no botão abaixo para escolher o gênero e gerar seu primeiro livro com inteligência editorial e dados da Amazon KDP.
                  </p>
                  <button className="btn-hero-cta" onClick={onCreateNewProject} style={{ margin: '0 auto' }}>
                    <Plus size={16} /> Começar Novo Livro
                  </button>
                </div>
              ) : (
                <div className="existing-projects-grid">
                  {projects.map(p => {
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
              )}
            </div>

          </div>

          {/* COLUNA DIREITA (32% de largura) */}
          <div className="intel-right-column">
            
            {/* CARD 1: VISÃO GERAL COM APENAS LIVROS NO PROJETO */}
            <div className="intel-overview-card">
              <div className="overview-header">
                <h3 className="overview-title">Visão Geral</h3>
                <span className="overview-date">{formattedToday}</span>
              </div>

              <div className="overview-stats-grid" style={{ gridTemplateColumns: '1fr' }}>
                {/* Métrica Única: Livros no projeto */}
                <div className="stat-tile" onClick={onCreateNewProject} style={{ cursor: 'pointer' }}>
                  <div className="stat-tile-top">
                    <div className="stat-icon-box blue-bg">
                      <BookOpen size={20} color="#2563eb" />
                    </div>
                  </div>
                  <span className="stat-label">Livros no projeto</span>
                  <div className="stat-num-row">
                    <span className="stat-number" style={{ fontSize: '28px', fontWeight: 800 }}>{projects.length}</span>
                    <ArrowRight size={16} className="stat-arrow" />
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
                /* Estado Vazio com Relógio */
                <div className="activity-empty-state">
                  <div className="clock-icon-circle">
                    <Clock size={28} color="#94a3b8" />
                  </div>
                  <h4 className="activity-empty-title">Nenhuma atividade recente</h4>
                  <p className="activity-empty-desc">
                    Seus livros em andamento e atualizações aparecerão aqui.
                  </p>
                </div>
              ) : (
                /* Lista de Atividades Reais dos Projetos */
                <div className="activity-items-list">
                  {projects.slice(0, 4).map((p) => (
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
    </div>
  );
};
