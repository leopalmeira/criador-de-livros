import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, TrendingUp, FileText,
  HelpCircle, ChevronDown, ArrowRight,
  Clock, Copy, Trash2, Sparkles, CheckCircle2, Search, Globe, Play,
  Rocket, DollarSign, Bot, LogOut, Zap, Wrench, Palette, RefreshCw, Shield, Film,
  GraduationCap, Headphones, FolderKanban, CheckCircle, Download, Layers
} from 'lucide-react';
import { BookProject } from '../../types/book-project';
import { BookOpportunityProposal } from '../../types/category-intelligence';
import { FinalBooksShelf } from './FinalBooksShelf';
import { db } from '../../database/local-database';
import { useTranslation } from '../../services/i18n-service';
import { LanguageSelector } from './i18n/LanguageSelector';
import { batchBackgroundRunner, BatchRunnerState } from '../../services/batch-background-runner';
import { useBookCredits } from '../../services/kdp-credits-service';
import { PurchaseCreditsModal } from './credits/PurchaseCreditsModal';

import { AuthenticatedUser } from '../../services/auth-client';

interface Props {
  projects: BookProject[];
  currentUser?: AuthenticatedUser | null;
  onCreateNewProject: () => void;
  onCreateCourseEbook?: () => void;
  onCreateCinematicNovel?: () => void;
  onCreateColoringBook?: () => void;
  onOpenProject: (id: string) => void;
  onDuplicateProject: (id: string, e: React.MouseEvent) => void;
  onDeleteProject: (id: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  onOpenAdmin?: () => void;
  onQuickAction?: (action: 'niche' | 'keywords' | 'competition' | 'reports') => void;
  onSelectOpportunity?: (
    proposal: BookOpportunityProposal, 
    genre: string, 
    category: string, 
    subcategory: string
  ) => void;
  onOpenPublishing?: (projectId?: string) => void;
  onOpenKdpPublish?: (projectId?: string) => void;
  onOpenLanding?: () => void;
  onOpenBatchGenerator?: () => void;
  onOpenTechnicalManuals?: () => void;
  onOpenCover10Styles?: () => void;
  onOpenAiGuide?: () => void;
  onLogout?: () => void;
}

export const BookIntelDashboard: React.FC<Props> = ({
  projects,
  currentUser,
  onCreateNewProject,
  onCreateCourseEbook,
  onCreateCinematicNovel,
  onCreateColoringBook,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
  onOpenSettings,
  onOpenAdmin,
  onQuickAction,
  onOpenPublishing,
  onOpenKdpPublish,
  onOpenLanding,
  onOpenBatchGenerator,
  onOpenTechnicalManuals,
  onOpenCover10Styles,
  onOpenAiGuide,
  onLogout
}) => {
  const { t, currentLang } = useTranslation();
  const { balance: bookCredits } = useBookCredits();
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [activeModalAction, setActiveModalAction] = useState<string | null>(null);
  const [finalizingProjectId, setFinalizingProjectId] = useState<string | null>(null);
  const [batchState, setBatchState] = useState<BatchRunnerState>(batchBackgroundRunner.getState());

  // Ouve atualizações de progresso do lote em tempo real
  useEffect(() => {
    const unsub = batchBackgroundRunner.subscribe((state) => {
      setBatchState(state);
    });
    return unsub;
  }, []);

  // Identifica projetos em andamento / rascunhos (não finalizados)
  const draftProjects = projects.filter(p => 
    p.status !== 'FINALIZADO' && p.pipelineStage !== 'final'
  );

  const finalizedProjects = projects.filter(p => 
    p.status === 'FINALIZADO' || p.pipelineStage === 'final'
  );

  const projetoEmAndamento = draftProjects.find(p => 
    p.status === 'ESCREVENDO' || 
    p.status === 'RASCUNHO' || 
    (p.kdpChapters?.length || 0) > 0
  );

  // Formatação de data no idioma nativo selecionado
  const formattedToday = (() => {
    const now = new Date();
    try {
      return now.toLocaleDateString(currentLang, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return now.toLocaleDateString();
    }
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
              <span className="intel-name-primary" style={{ fontWeight: 900, letterSpacing: '-0.3px', color: '#ffffff' }}>
                BookEngin
              </span>
              <span className="intel-brand-divider">|</span>
              <span className="intel-brand-slogan">{t('nav.slogan')}</span>
            </div>
          </div>

          {/* Ações da Direita: Seletor de Idiomas Nativos, IA Guia do Autor, Configurações, Perfil e Logout */}
          <div className="header-right-tools" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* SELETOR DE IDIOMA COM BANDEIRAS E NOMES NATIVOS */}
            <LanguageSelector />

            {/* WIDGET DE CRÉDITOS DO AUTOR (US$ 3 POR LIVRO GERADO) */}
            <button
              onClick={() => setIsCreditsModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Saldo de créditos para gerar livros ($3 por livro)"
            >
              <span>💳</span>
              <span>{bookCredits} {bookCredits === 1 ? 'Crédito' : 'Créditos'}</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>($3/livro)</span>
            </button>

            {onOpenAiGuide && (
              <button
                onClick={onOpenAiGuide}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 8,
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title={t('aiGuide.title')}
              >
                <Bot size={15} /> {t('nav.aiGuide')}
              </button>
            )}

            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(109, 40, 217, 0.3) 100%)',
                  color: '#c084fc',
                  border: '1px solid rgba(168, 85, 247, 0.45)',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  boxShadow: '0 0 14px rgba(139, 92, 246, 0.25)',
                  transition: 'all 0.2s'
                }}
                title={t('admin.title', 'Painel de Controle Editorial & Clientes')}
              >
                <Shield size={15} />
                <span>{t('admin.badge', 'Painel Admin & Clientes')}</span>
              </button>
            )}

            <button className="tool-round-btn" onClick={onOpenSettings} title={t('nav.help')}>
              <HelpCircle size={18} />
            </button>

            <div className="user-profile-widget" onClick={onOpenSettings} title="Perfil do Usuário">
              <div className="user-avatar-circle">
                <span>{((currentUser?.name || 'Leandro Palmeira').split(' ').map(n => n[0]).slice(0, 2).join('') || 'LP').toUpperCase()}</span>
              </div>
              <div className="user-info-text">
                <span className="user-name-bold">{currentUser?.name || 'Leandro Palmeira'}</span>
                <span className="user-plan-label">
                  {currentUser?.plan === 'enterprise' ? 'Enterprise' : currentUser?.plan === 'pro' ? t('nav.proPlan') : 'Gratuito'}
                </span>
              </div>
              <ChevronDown size={14} className="user-chevron" />
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
                title={t('nav.logout')}
              >
                <LogOut size={14} /> {t('nav.logout')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. CORPO PRINCIPAL COM NAVEGAÇÃO LATERAL ESQUERDA E GRID DE DUAS COLUNAS */}
      <main className="book-intel-body">
        <div className="book-intel-wrapper">
          {/* NAVEGAÇÃO LATERAL ESQUERDA - SEÇÃO 2 DO BOOKENGIN */}
          <aside className="book-intel-sidebar" aria-label="Navegação lateral BookEngin">
            {/* SEÇÃO 1: ESTÚDIO DE CRIAÇÃO */}
            <div className="sidebar-nav-section">
              <span className="sidebar-nav-title">Estúdio de Criação</span>
              <button
                className="sidebar-nav-item"
                onClick={onCreateNewProject}
                title="Criar Livro Editorial Tradicional"
              >
                <BookOpen size={16} color="#0284c7" />
                <span>Criar Livro</span>
              </button>

              <button
                className="sidebar-nav-item highlight-course"
                onClick={() => {
                  if (onCreateCourseEbook) onCreateCourseEbook();
                  else onCreateNewProject();
                }}
                title="Criar E-book de Curso Profissionalizante com IA e Replicate"
              >
                <GraduationCap size={16} color="#059669" />
                <span>Criar E-book de Curso</span>
                <span className="sidebar-badge new">NOVO</span>
              </button>
            </div>

            {/* SEÇÃO 2: PROJETOS */}
            <div className="sidebar-nav-section">
              <span className="sidebar-nav-title">Projetos</span>
              <button
                className="sidebar-nav-item"
                onClick={() => {
                  const el = document.getElementById('section-projetos') || document.querySelector('.existing-projects-sublist') || document.querySelector('.final-shelf-container');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                title="Ver todos os projetos"
              >
                <FolderKanban size={16} color="#64748b" />
                <span>Meus Projetos</span>
                <span className="sidebar-badge">{projects.length}</span>
              </button>

              <button
                className="sidebar-nav-item"
                onClick={() => {
                  const el = document.querySelector('.existing-projects-sublist');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else if (projects.length > 0) onOpenProject(projects[0].id);
                }}
                title="Projetos em andamento"
              >
                <Clock size={16} color="#d97706" />
                <span>Em andamento</span>
                <span className="sidebar-badge">{draftProjects.length}</span>
              </button>

              <button
                className="sidebar-nav-item"
                onClick={() => {
                  const el = document.querySelector('.final-shelf-container');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                title="Projetos concluídos na estante"
              >
                <CheckCircle2 size={16} color="#059669" />
                <span>Concluídos</span>
                <span className="sidebar-badge">{finalizedProjects.length}</span>
              </button>
            </div>

            {/* SEÇÃO 3: FERRAMENTAS */}
            <div className="sidebar-nav-section">
              <span className="sidebar-nav-title">Ferramentas</span>
              <button
                className="sidebar-nav-item"
                onClick={() => onQuickAction ? onQuickAction('niche') : setActiveModalAction('niche')}
                title="Pesquisa de Mercado & Nichos"
              >
                <Search size={16} color="#0284c7" />
                <span>Pesquisa de Mercado</span>
              </button>

              <button
                className="sidebar-nav-item"
                onClick={() => onOpenCover10Styles ? onOpenCover10Styles() : null}
                title="Estúdio de Capas & Ilustrações"
              >
                <Palette size={16} color="#f59e0b" />
                <span>Capas e Ilustrações</span>
              </button>

              <button
                className="sidebar-nav-item"
                onClick={() => alert('Audiobook Studio: conversão neural de capítulos em áudio imersivo está em fase final de testes.')}
                title="Audiobook Studio (Em breve)"
              >
                <Headphones size={16} color="#8b5cf6" />
                <span>Audiobook Studio</span>
                <span className="sidebar-badge soon">Em breve</span>
              </button>

              <button
                className="sidebar-nav-item"
                onClick={() => onOpenPublishing ? onOpenPublishing() : (onOpenKdpPublish ? onOpenKdpPublish() : null)}
                title="Central de Exportações & Publicação"
              >
                <Download size={16} color="#10b981" />
                <span>Exportações</span>
              </button>
            </div>
          </aside>

          {/* ÁREA DE TRABALHO PRINCIPAL */}
          <div className="book-intel-main-area">
            <div className="book-intel-grid">
          
          {/* COLUNA ESQUERDA */}
          <div className="intel-left-column">
            
            {/* NOVO: BANNER DE PROGRESSO DO LOTE EM EXECUÇÃO NO BACKEND */}
            {batchState.isRunning && (
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: 16,
                padding: '18px 22px',
                marginBottom: 20,
                border: '1px solid #10b981',
                boxShadow: '0 10px 30px rgba(16, 185, 129, 0.18)',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                    }}>
                      <RefreshCw size={18} color="#ffffff" className="animate-spin" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                          🚀 Geração em Lote no Backend: Livro {batchState.currentIndex} de {batchState.totalBooks}
                        </h4>
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: 4
                        }}>
                          {batchState.currentStage}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 600 }}>
                        "{batchState.currentBookTitle}" • {batchState.currentGenre}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>
                      {batchState.percentage}%
                    </span>

                    {onOpenBatchGenerator && (
                      <button
                        onClick={onOpenBatchGenerator}
                        style={{
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Ver Detalhes
                      </button>
                    )}

                    <button
                      onClick={() => batchBackgroundRunner.cancelBatch()}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Pausar
                    </button>
                  </div>
                </div>

                {/* Barra de Progresso Animada */}
                <div style={{ width: '100%', height: 8, background: '#334155', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    width: `${batchState.percentage}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)',
                    borderRadius: 999,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            {/* HERO BANNER DE BOAS-VINDAS */}
            <div className="intel-hero-card">
              <div className="hero-text-side">
                <span className="hero-greeting">{t('hero.greeting')}</span>
                <h1 className="hero-main-title">{t('hero.welcome')}</h1>
                <p className="hero-description">
                  {t('hero.description')}
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn-hero-cta" onClick={onCreateNewProject}>
                    <Plus size={18} /> {t('hero.btnNewBook')}
                  </button>

                  {/* BOTÃO DE GERAR EM LOTE (1 A 20 LIVROS) */}
                  {onOpenBatchGenerator && (
                    <button
                      className="btn-hero-cta"
                      onClick={onOpenBatchGenerator}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        fontWeight: 700,
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                      }}
                      title={t('batch.subtitle')}
                    >
                      <Zap size={18} /> {t('hero.btnBatch')}
                    </button>
                  )}

                  {/* MANUAIS TÉCNICOS COMO FAZER COM DIAGRAMAS */}
                  {onOpenTechnicalManuals && (
                    <button
                      className="btn-hero-cta"
                      onClick={onOpenTechnicalManuals}
                      style={{
                        background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                        color: '#ffffff',
                        fontWeight: 700,
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                      }}
                      title={t('manuals.subtitle')}
                    >
                      <Wrench size={18} /> {t('hero.btnManuals')}
                    </button>
                  )}

                  {/* 10 ESTILOS DE CAPAS AMAZON */}
                  {onOpenCover10Styles && (
                    <button
                      className="btn-hero-cta"
                      onClick={onOpenCover10Styles}
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#0f172a',
                        fontWeight: 700,
                        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                      }}
                      title={t('covers.subtitle')}
                    >
                      <Palette size={18} /> {t('hero.btnCovers')}
                    </button>
                  )}

                  <button
                    className="btn-hero-cta"
                    onClick={() => onOpenKdpPublish && onOpenKdpPublish()}
                    style={{
                      background: 'linear-gradient(135deg, #334155, #1e293b)',
                      color: '#f8fafc',
                      fontWeight: 700,
                      border: '1px solid #475569'
                    }}
                    title="Publicar Livro Diretamente no Amazon KDP sem Sair da Plataforma"
                  >
                    <Rocket size={18} /> {t('hero.btnKdpDirect')}
                  </button>

                  <button
                    className="btn-hero-cta"
                    onClick={() => onOpenPublishing && onOpenPublishing()}
                    style={{
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                    }}
                    title="Central de Publicação Multiplataforma"
                  >
                    <Globe size={18} /> {t('hero.btnMultiplatform')} · Em breve
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

            {/* 3 CARDS EXCLUSIVOS DE MODALIDADES DE CRIAÇÃO EDITORIAL */}
            <div style={{ marginTop: 20, marginBottom: 26 }}>
              <div style={{ marginBottom: 14 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#f59e0b',
                  display: 'block',
                  marginBottom: 3
                }}>
                  MODALIDADES DE CRIAÇÃO EDITORIAL
                </span>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  Escolha o Formato da sua Nova Obra
                </h2>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16
              }}>
                {/* CARD 1 — LIVRO TRADICIONAL */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.2s ease'
                }}>
                  <div>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'rgba(56, 189, 248, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12
                    }}>
                      <BookOpen size={22} color="#0284c7" />
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      Livro Tradicional
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                      Criação convencional de ficção e não-ficção com texto estruturado, capítulos completos, pesquisa de mercado Amazon e diagramação para capa comum e Kindle.
                    </p>
                  </div>

                  <button
                    onClick={onCreateNewProject}
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Plus size={15} /> Criar livro
                  </button>
                </div>

                {/* CARD 2 — LIVRO DE COLORIR */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.2s ease'
                }}>
                  <div>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'rgba(16, 185, 129, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12
                    }}>
                      <Palette size={22} color="#059669" />
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      Livro de Colorir
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                      Ilustrações em preto e branco com traços vetoriais grossos, impressão em um único lado da folha, personagens consistentes e formato 8.5x11 pol KDP.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (onCreateColoringBook) onCreateColoringBook();
                      else onCreateNewProject();
                    }}
                    style={{
                      width: '100%',
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Palette size={15} /> Criar livro
                  </button>
                </div>

                {/* CARD 3 — ROMANCE CINEMATOGRÁFICO REALISTA (EXCLUSIVO) */}
                <div style={{
                  background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                  border: '2px solid #f59e0b',
                  borderRadius: 14,
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.18)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* SELO / BADGE EXCLUSIVO */}
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#0f172a',
                    fontSize: 10,
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: 4,
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
                  }}>
                    ★ MÓDULO EXCLUSIVO COM IA
                  </div>

                  <div>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12
                    }}>
                      <Film size={22} color="#f59e0b" />
                    </div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 900, color: '#ffffff' }}>
                      Foto Livro Realista
                    </h3>
                    <div style={{ fontSize: 12, color: '#fcd34d', fontWeight: 600, fontStyle: 'italic', marginBottom: 8 }}>
                      Crie foto livros cinematográficos com personagens realistas, imagens da API Replicate, narração densa e diálogos integrados.
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
                      Produza foto-livros com estética cinematográfica 35mm fotorrealista via Replicate, múltiplos painéis sequenciais por página, narração rica e sem fundos brancos genéricos.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (onCreateCinematicNovel) onCreateCinematicNovel();
                      else onCreateNewProject();
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#0f172a',
                      border: 'none',
                      padding: '11px 16px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                    }}
                  >
                    <Sparkles size={16} /> Criar livro
                  </button>
                </div>

                {/* CARD 4 — CRIAR E-BOOK DE CURSO PROFISSIONALIZANTE COM IA E REPLICATE */}
                <div style={{
                  background: '#ffffff',
                  border: '2px solid #10b981',
                  borderRadius: 14,
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.12)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}>
                  {/* SELO / BADGE EXCLUSIVO */}
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: 4,
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                  }}>
                    ★ NOVO: CURSOS COM REPLICATE
                  </div>

                  <div>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12
                    }}>
                      <GraduationCap size={24} color="#059669" />
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 900, color: '#0f172a' }}>
                      Criar E-book de Curso
                    </h3>
                    <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, fontStyle: 'italic', marginBottom: 8 }}>
                      Mais de 2.000 temas, dados reais da Hotmart e tutoriais passo a passo.
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                      Crie materiais didáticos completos para cursos livres e profissionalizantes com módulos, aulas detalhadas, lista de ferramentas, precauções de segurança, exercícios e ilustrações geradas pelo Replicate.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (onCreateCourseEbook) onCreateCourseEbook();
                      else onCreateNewProject();
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '11px 16px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <GraduationCap size={16} /> Criar E-book de Curso
                  </button>
                </div>
              </div>
            </div>

            {/* LISTAGEM DE OBRAS EM ANDAMENTO / RASCUNHOS (OCULTA QUANDO TODAS AS OBRAS JÁ ESTÃO FINALIZADAS NA ESTANTE) */}
            {draftProjects.length > 0 && (
              <div className="existing-projects-sublist" style={{ marginTop: 10, marginBottom: 24 }}>
                <div className="existing-projects-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}>
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                        Obras em Andamento ({draftProjects.length})
                      </h3>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        Projetos em fase de escrita, pesquisa ou diagramação
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn-create-sub"
                    onClick={onCreateNewProject}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 8,
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)'
                    }}
                  >
                    <Plus size={14} /> {t('catalog.btnNew')}
                  </button>
                </div>

                <div className="existing-projects-grid" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {draftProjects.map(p => {
                    const chapters = p.kdpChapters?.length || 0;
                    const words = p.kdpChapters?.reduce((s, c) => s + (c.wordCount || 0), 0) || 0;
                    const coverUrl = p.coverImageUrl;

                    return (
                      <div
                        key={p.id}
                        className="project-row-card"
                        onClick={() => onOpenProject(p.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          gap: 16,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                          {/* MINIATURA EXCLUSIVA DA CAPA DO LIVRO (PROPORÇÃO KDP 2:3) */}
                          <div
                            style={{
                              width: 54,
                              height: 80,
                              borderRadius: 6,
                              overflow: 'hidden',
                              flexShrink: 0,
                              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
                              border: '1px solid #cbd5e1',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative'
                            }}
                          >
                            {coverUrl ? (
                              <img
                                src={coverUrl}
                                alt={`Capa de ${p.title || 'Livro'}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ padding: 4, textAlign: 'center', color: '#ffffff' }}>
                                <span style={{ fontSize: 7, fontWeight: 800, color: '#38bdf8', letterSpacing: '0.5px' }}>
                                  KDP
                                </span>
                                <div style={{
                                  fontSize: 8,
                                  fontWeight: 700,
                                  lineHeight: 1.1,
                                  maxHeight: 38,
                                  overflow: 'hidden',
                                  marginTop: 2,
                                  color: '#f8fafc'
                                }}>
                                  {p.title || 'Obra'}
                                </div>
                                <div style={{ fontSize: 6, color: '#94a3b8', marginTop: 3 }}>
                                  {p.author ? p.author.split(' ')[0] : 'Autor'}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* INFORMAÇÕES DA OBRA */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                              <h4 style={{
                                margin: 0,
                                fontSize: 15,
                                fontWeight: 700,
                                color: '#0f172a',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {p.title || 'Livro Sem Título'}
                              </h4>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 600,
                                background: '#f8fafc',
                                color: '#475569',
                                padding: '2px 8px',
                                borderRadius: 4,
                                border: '1px solid #e2e8f0'
                              }}>
                                Em Andamento • {chapters} {chapters === 1 ? 'capítulo' : 'capítulos'}
                              </span>
                            </div>

                            {p.subtitle && (
                              <p style={{
                                margin: '0 0 3px 0',
                                fontSize: 12,
                                color: '#475569',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontStyle: 'italic'
                              }}>
                                {p.subtitle}
                              </p>
                            )}

                            <span style={{ fontSize: 12, color: '#64748b' }}>
                              {p.author || 'Autor não definido'} • {p.categories?.[0] || p.kdpBookType || 'Não-Ficção'} • {chapters} capítulos • {words > 0 ? `${words.toLocaleString('pt-BR')} palavras` : 'Em criação'}
                            </span>
                          </div>
                        </div>

                        {/* BOTÕES DE AÇÃO PROFISSIONAIS E SÓBRIOS */}
                        <div className="project-row-actions" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {chapters > 0 && (
                            <button
                              className="btn-icon-soft"
                              onClick={(e) => handleQuickFinalize(p, e)}
                              disabled={finalizingProjectId === p.id}
                              title="Finalizar Obra e Disponibilizar para Download"
                              style={{ color: '#0f172a', borderColor: '#cbd5e1' }}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          <button
                            className="btn-icon-soft"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenKdpPublish && onOpenKdpPublish(p.id);
                            }}
                            title="Publicar Direto no Amazon KDP In-App"
                            style={{ color: '#d97706', borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)' }}
                          >
                            <Rocket size={14} />
                          </button>
                          <button
                            className="btn-icon-soft"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPublishing && onOpenPublishing(p.id);
                            }}
                            title="Publicação Multiplataforma"
                            style={{ color: '#0f172a', borderColor: '#cbd5e1' }}
                          >
                            <Globe size={14} />
                          </button>
                          <button
                            className="btn-icon-soft"
                            onClick={(e) => onDuplicateProject(p.id, e)}
                            title="Duplicar Obra"
                            style={{ color: '#475569', borderColor: '#cbd5e1' }}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            className="btn-icon-soft danger"
                            onClick={(e) => onDeleteProject(p.id, e)}
                            title="Excluir"
                            style={{ color: '#dc2626', borderColor: '#fecaca' }}
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => onOpenProject(p.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 14px',
                              borderRadius: 6,
                              background: '#0f172a',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.2)'
                            }}
                          >
                            Continuar <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CASO NÃO HAJA NENHUM PROJETO CADASTRADO NO SISTEMA */}
            {projects.length === 0 && (
              <div style={{
                padding: '36px 24px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: 12,
                textAlign: 'center',
                marginBottom: 24
              }}>
                <BookOpen size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#475569' }}>
                  {t('catalog.emptyTitle')}
                </p>
                <button
                  onClick={onCreateNewProject}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t('catalog.emptyAction')}
                </button>
              </div>
            )}

            {/* ESTANTE DE LIVROS FINALIZADOS DISPONÍVEIS PARA BAIXAR */}
            <FinalBooksShelf onOpenProject={onOpenProject} />

          </div>

          {/* COLUNA DIREITA */}
          <div className="intel-right-column">
            
            {/* CARD 1: VISÃO GERAL COM MÉTRICAS */}
            <div className="intel-overview-card">
              <div className="overview-header">
                <h3 className="overview-title">{t('overview.title')}</h3>
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
                  <span className="stat-label">{t('metric.projectsCount')}</span>
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
                  <span className="stat-label">{t('metric.searchesCount')}</span>
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
                  <span className="stat-label">{t('metric.nichesCount')}</span>
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
                  <span className="stat-label">{t('metric.reportsCount')}</span>
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
                <h3 className="activity-title">{t('activity.title')}</h3>
                <button
                  className="activity-link-all"
                  onClick={() => projects.length > 0 && onOpenProject(projects[0].id)}
                >
                  {t('activity.viewAll')} <ArrowRight size={12} />
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="activity-empty-state">
                  <div className="clock-icon-circle">
                    <Clock size={28} color="#94a3b8" />
                  </div>
                  <h4 className="activity-empty-title">{t('activity.emptyTitle')}</h4>
                  <p className="activity-empty-desc">
                    {t('activity.emptyDesc')}
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
      </div>
    </div>
  </main>

      {/* 3. FOOTER CENTRALIZADO E VALORIZADO */}
      <footer className="book-intel-footer">
        <div className="footer-inner-centered">
          <div className="footer-brand-pill">
            <BookOpen size={16} className="footer-brand-icon" />
            <span className="footer-copy-bold">{t('footer.brand')}</span>
            <span className="footer-divider-dot">•</span>
            <span className="footer-copy-sub">{t('footer.desc')}</span>
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

      {/* MODAL DE COMPRA / RECARGA DE CRÉDITOS EDITORIAIS (US$ 3 POR LIVRO) */}
      <PurchaseCreditsModal
        isOpen={isCreditsModalOpen}
        onClose={() => setIsCreditsModalOpen(false)}
      />
    </div>
  );
};
