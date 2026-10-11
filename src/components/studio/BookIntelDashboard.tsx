import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus,
  HelpCircle, ChevronDown, ArrowRight,
  Clock, Search, Copy, Trash2, Sparkles, CheckCircle2, Play,
  DollarSign, Bot, LogOut, Zap, RefreshCw, Shield,
  GraduationCap, Headphones, FolderKanban, CheckCircle, Download, Layers, Grid3X3
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
  onCreatePuzzleBook?: () => void;
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
  onOpenLanding?: () => void;
  onOpenBatchGenerator?: () => void;
  onOpenAiGuide?: () => void;
  onLogout?: () => void;
}

export const BookIntelDashboard: React.FC<Props> = ({
  projects,
  currentUser,
  onCreateNewProject,
  onCreateCourseEbook,
  onCreatePuzzleBook,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
  onOpenSettings,
  onOpenAdmin,
  onQuickAction,
  onOpenLanding,
  onOpenBatchGenerator,
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

              <button
                className="sidebar-nav-item highlight-puzzle"
                onClick={() => {
                  if (onCreatePuzzleBook) onCreatePuzzleBook();
                  else onCreateNewProject();
                }}
                title="Criar Livro de Passatempos, Sudoku e Puzzles KDP"
              >
                <Grid3X3 size={16} color="#0284c7" />
                <span>Criar Livro de Puzzles</span>
                <span className="sidebar-badge new" style={{ background: '#0284c7', color: '#fff' }}>KDP</span>
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
                onClick={() => alert('Audiobook Studio: conversão neural de capítulos em áudio imersivo está em fase final de testes.')}
                title="Audiobook Studio (Em breve)"
              >
                <Headphones size={16} color="#8b5cf6" />
                <span>Audiobook Studio</span>
                <span className="sidebar-badge soon">Em breve</span>
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

                  {/* NOVO: BOTÃO DE DESTAQUE CRIAR E-BOOK DE CURSO */}
                  <button
                    className="btn-hero-cta"
                    onClick={() => {
                      if (onCreateCourseEbook) onCreateCourseEbook();
                      else onCreateNewProject();
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                    title="Criar E-book de Curso Profissionalizante com IA, pesquisa de mercado e Replicate"
                  >
                    <GraduationCap size={18} /> Criar E-book de Curso
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

                {/* CARD 5 — GERADOR DE PUZZLES & SUDOKU KDP (NOVO) */}
                <div style={{
                  background: '#ffffff',
                  border: '2px solid #0284c7',
                  borderRadius: 14,
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.12)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}>
                  {/* SELO / BADGE EXCLUSIVO */}
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: 4,
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                  }}>
                    ★ KDP PRINT-READY
                  </div>

                  <div>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'rgba(2, 132, 199, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12
                    }}>
                      <Grid3X3 size={24} color="#0284c7" />
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 900, color: '#0f172a' }}>
                      Gerador de Puzzles & Sudoku KDP
                    </h3>
                    <div style={{ fontSize: 12, color: '#0284c7', fontWeight: 600, fontStyle: 'italic', marginBottom: 8 }}>
                      Sudoku, Caça-Palavras e Labirintos com gabarito automático.
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                      Crie livros completos de Sudoku, Caça-palavras e Labirintos com gabarito automático e capa calculada para a Amazon KDP.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (onCreatePuzzleBook) onCreatePuzzleBook();
                      else onCreateNewProject();
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
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
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                    }}
                  >
                    <Grid3X3 size={16} /> Criar livro de puzzles
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
