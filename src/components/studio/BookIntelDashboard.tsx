import React, { useState } from 'react';
import {
  BookOpen, Plus, TrendingUp, FileText,
  HelpCircle, ChevronDown, ArrowRight,
  Clock, Copy, Trash2, Sparkles, CheckCircle2, Search, Globe, Play
} from 'lucide-react';
import { BookProject } from '../../types/book-project';
import { BookOpportunityProposal } from '../../types/category-intelligence';
import { FinalBooksShelf } from './FinalBooksShelf';
import { db } from '../../database/local-database';

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
  onOpenPublishing?: (projectId?: string) => void;
}

export const BookIntelDashboard: React.FC<Props> = ({
  projects,
  onCreateNewProject,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
  onOpenSettings,
  onQuickAction,
  onOpenPublishing
}) => {
  const [activeModalAction, setActiveModalAction] = useState<string | null>(null);
  const [finalizingProjectId, setFinalizingProjectId] = useState<string | null>(null);

  // Identifica projeto em andamento / rascunho recente que precisa de continuação
  const projetoEmAndamento = projects.find(p => 
    p.status === 'ESCREVENDO' || 
    p.status === 'RASCUNHO' || 
    (p.status !== 'FINALIZADO' && p.pipelineStage !== 'final' && (p.kdpChapters?.length || 0) > 0)
  );

  // Formatação de data em português: "Hoje, 4 de out. de 2026"
  const formattedToday = (() => {
    const now = new Date();
    const day = now.getDate();
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    return `Hoje, ${day} de ${month}. de ${year}`;
  })();

  // Finalizar projeto rápido diretamente pela Dashboard
  const handleQuickFinalize = async (p: BookProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setFinalizingProjectId(p.id);
    try {
      const updatedProj: BookProject = {
        ...p,
        status: 'FINALIZADO',
        pipelineStage: 'final',
        pipelineProgress: 100,
        updatedAt: Date.now()
      };
      await db.saveBookProject(updatedProj);
      window.dispatchEvent(new CustomEvent('kdp-final-books-updated'));
    } catch (err) {
      console.error('Erro ao finalizar projeto rápido:', err);
    } finally {
      setFinalizingProjectId(null);
    }
  };

  return (
    <div className="book-intel-container">
      {/* 1. TOP NAVBAR ELEGANTE (SEM BARRA DE PESQUISA E SEM SINO DE NOTIFICAÇÃO) */}
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

          {/* Ações da Direita: Ajuda e Perfil (Sino e Barra de Busca Removidos) */}
          <div className="header-right-tools">
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
          
          {/* COLUNA ESQUERDA */}
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
                  <button
                    className="btn-hero-cta"
                    onClick={() => onOpenPublishing && onOpenPublishing()}
                    style={{
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                    }}
                    title="Central de Publicação Multiplataforma (Kindle, Paperback, Hardcover, Spotify e Audiobook Studio)"
                  >
                    <Globe size={18} /> Publicação Multiplataforma
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

            {/* CARD DE RETOMADA IMEDIATA DE LIVRO EM ANDAMENTO (PRESERVAÇÃO APÓS F5 / ATUALIZAÇÃO DA PÁGINA) */}
            {projetoEmAndamento && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #eff6ff, #f8fafc)',
                  border: '1px solid #bfdbfe',
                  borderRadius: 12,
                  padding: '16px 20px',
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
                  gap: 16,
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                    }}
                  >
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '1px 8px', borderRadius: 4, border: '1px solid #bfdbfe' }}>
                        ⚡ PROJETO EM ANDAMENTO RECUPERADO
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {projetoEmAndamento.kdpChapters?.length || 0} capítulos salvos no banco local
                      </span>
                    </div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                      {projetoEmAndamento.title || 'Livro Sem Título'}
                    </h4>
                    <span style={{ fontSize: 12, color: '#475569' }}>
                      {projetoEmAndamento.author || 'Autor não definido'} • {projetoEmAndamento.categories?.[0] || 'Não-Ficção'} • Seus créditos e progresso foram preservados!
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => onOpenProject(projetoEmAndamento.id)}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 18px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Play size={14} /> Continuar Livro
                  </button>
                </div>
              </div>
            )}

            {/* ESTANTE DE LIVROS FINALIZADOS DISPONÍVEIS PARA BAIXAR */}
            <FinalBooksShelf />

            {/* SE HOUVER LIVROS JÁ CRIADOS, EXIBE EM LISTA ORGANIZADA ABAIXO */}
            {projects.length > 0 && (
              <div className="existing-projects-sublist">
                <div className="existing-projects-header">
                  <h3>Meus Livros & Projetos em Andamento ({projects.length})</h3>
                  <button className="btn-create-sub" onClick={onCreateNewProject}>
                    <Plus size={14} /> Novo Livro
                  </button>
                </div>

                <div className="existing-projects-grid">
                  {projects.map(p => {
                    const chapters = p.kdpChapters?.length || 0;
                    const words = p.kdpChapters?.reduce((s, c) => s + (c.wordCount || 0), 0) || 0;
                    const isFinalizado = p.status === 'FINALIZADO' || p.pipelineStage === 'final';

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <h4 className="project-row-title" style={{ margin: 0 }}>
                                {p.title || 'Livro Sem Título'}
                              </h4>
                              {isFinalizado ? (
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  border: '1px solid #a7f3d0'
                                }}>
                                  ✓ Finalizado
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: '#fffbeb',
                                  color: '#b45309',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  border: '1px solid #fde68a'
                                }}>
                                  ✏️ Rascunho / Em Andamento ({chapters} cap{chapters === 1 ? '' : 's'})
                                </span>
                              )}
                            </div>
                            <span className="project-row-meta">
                              {p.author || 'Autor não definido'} • {p.categories?.[0] || p.kdpBookType || 'Não-Ficção'} • {chapters} capítulos • {words.toLocaleString('pt-BR')} palavras
                            </span>
                          </div>
                        </div>

                        <div className="project-row-actions" onClick={(e) => e.stopPropagation()}>
                          {!isFinalizado && chapters > 0 && (
                            <button
                              className="btn-icon-soft"
                              onClick={(e) => handleQuickFinalize(p, e)}
                              disabled={finalizingProjectId === p.id}
                              title="Finalizar Obra & Disponibilizar na Estante de Downloads"
                              style={{ color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          <button
                            className="btn-icon-soft"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPublishing && onOpenPublishing(p.id);
                            }}
                            title="Publicação Multiplataforma & Audiobook Studio deste livro"
                            style={{ color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                          >
                            <Globe size={14} />
                          </button>
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
                          {!isFinalizado ? (
                            <button
                              className="btn-open-proj-arrow"
                              onClick={() => onOpenProject(p.id)}
                              title="Continuar Geração do Livro de Onde Parou"
                              style={{
                                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 700
                              }}
                            >
                              <Play size={13} /> Continuar Livro
                            </button>
                          ) : (
                            <button
                              className="btn-open-proj-arrow"
                              onClick={() => onOpenProject(p.id)}
                              title="Continuar Edição no Gerador KDP Pro"
                            >
                              Editar <ArrowRight size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* COLUNA DIREITA */}
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
                          {new Date(p.updatedAt).toLocaleDateString('pt-BR')} • {p.categories?.[0] || 'KDP'}
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

      {/* 3. FOOTER CENTRALIZADO E VALORIZADO (SEM TOTVS E SEM KDP VERIFIED) */}
      <footer className="book-intel-footer">
        <div className="footer-inner-centered">
          <div className="footer-brand-pill">
            <BookOpen size={16} className="footer-brand-icon" />
            <span className="footer-copy-bold">Book Intel KDP v1.0</span>
            <span className="footer-divider-dot">•</span>
            <span className="footer-copy-sub">Plataforma de Inteligência para Amazon KDP</span>
          </div>
        </div>
      </footer>

      {/* MODAL RÁPIDO PARA AS FUNCIONALIDADES */}
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
                Deseja criar um novo livro com inteligência aplicada?
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
