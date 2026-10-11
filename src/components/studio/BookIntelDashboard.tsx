import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus,
  HelpCircle, ChevronDown, ArrowRight,
  Clock, Search, Copy, Trash2, Sparkles, CheckCircle2, Play,
  DollarSign, Bot, LogOut, Zap, RefreshCw, Shield,
  GraduationCap, Headphones, FolderKanban, CheckCircle, Download, Layers, Grid3X3, X
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
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryActiveTab, setLibraryActiveTab] = useState<'finalized' | 'drafts'>('finalized');

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
                  setLibraryActiveTab(finalizedProjects.length > 0 ? 'finalized' : 'drafts');
                  setIsLibraryModalOpen(true);
                }}
                title="Ver todos os projetos organizados no acervo"
              >
                <FolderKanban size={16} color="#64748b" />
                <span>Meus Projetos</span>
                <span className="sidebar-badge">{projects.length}</span>
              </button>

              <button
                className="sidebar-nav-item"
                onClick={() => {
                  setLibraryActiveTab('drafts');
                  setIsLibraryModalOpen(true);
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
                  setLibraryActiveTab('finalized');
                  setIsLibraryModalOpen(true);
                }}
                title="Projetos concluídos no acervo"
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

            {/* CARD EXCLUSIVO E ORGANIZADO: ACERVO DE LIVROS PUBLICADOS & OBRAS KDP */}
            {projects.length > 0 ? (
              <div
                onClick={() => {
                  setLibraryActiveTab(finalizedProjects.length > 0 ? 'finalized' : 'drafts');
                  setIsLibraryModalOpen(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  borderRadius: 16,
                  padding: '24px 28px',
                  marginBottom: 26,
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                className="library-hub-card"
              >
                {/* Glow decorativo sutil */}
                <div style={{
                  position: 'absolute',
                  top: -40,
                  right: -40,
                  width: 220,
                  height: 220,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 260 }}>
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                      flexShrink: 0
                    }}>
                      <BookOpen size={28} color="#ffffff" />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          background: 'rgba(56, 189, 248, 0.2)',
                          color: '#38bdf8',
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase'
                        }}>
                          Biblioteca Editorial KDP
                        </span>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          • {projects.length} {projects.length === 1 ? 'obra catalogada' : 'obras catalogadas'}
                        </span>
                      </div>

                      <h3 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.3px' }}>
                        Acervo de Livros Publicados & Obras KDP
                      </h3>

                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>
                        {finalizedProjects.length > 0 
                          ? `${finalizedProjects.length} ${finalizedProjects.length === 1 ? 'livro diagramado e auditado' : 'livros diagramados e auditados'} prontos com PDFs oficiais (miolo e capa aberta) e manuscrito.`
                          : 'Seus projetos estão salvos e organizados. Clique para abrir o acervo, ver, mexer e manipular suas obras.'}
                      </p>
                    </div>
                  </div>

                  {/* Showcase de miniaturas das capas organizadas */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    {projects.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        style={{
                          width: 40,
                          height: 58,
                          borderRadius: 4,
                          overflow: 'hidden',
                          background: '#334155',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                          flexShrink: 0
                        }}
                      >
                        {p.coverImageUrl ? (
                          <img src={p.coverImageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', color: '#94a3b8', fontSize: 8 }}>
                            KDP
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLibraryActiveTab(finalizedProjects.length > 0 ? 'finalized' : 'drafts');
                        setIsLibraryModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '11px 22px',
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <Layers size={16} /> Abrir Acervo de Livros ({projects.length}) <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '36px 24px',
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: 14,
                textAlign: 'center',
                marginBottom: 24,
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <BookOpen size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  {t('catalog.emptyTitle')}
                </h4>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
                  Crie seu primeiro livro tradicional, e-book de curso ou gere um lote automático para compor sua biblioteca.
                </p>
                <button
                  onClick={onCreateNewProject}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)'
                  }}
                >
                  <Plus size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {t('catalog.emptyAction')}
                </button>
              </div>
            )}

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

      {/* MODAL EXPANSIVO ORGANIZADO DO ACERVO DE LIVROS PUBLICADOS */}
      {isLibraryModalOpen && (
        <div
          className="modal-backdrop-overlay"
          onClick={() => setIsLibraryModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#f8fafc',
              borderRadius: 16,
              width: '100%',
              maxWidth: 1240,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            {/* Header do Modal com Botão de Fechar Bem Visível */}
            <div style={{
              padding: '18px 24px',
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #334155',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BookOpen size={20} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#ffffff' }}>
                    Acervo de Livros Publicados & Obras KDP
                  </h3>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    Selecione uma obra para ver, mexer, baixar miolo/capa ou editar no estúdio.
                  </span>
                </div>
              </div>

              {/* Botões de Ação do Topo: Abas + Fechar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', background: '#1e293b', borderRadius: 8, padding: 3, border: '1px solid #334155' }}>
                  <button
                    onClick={() => setLibraryActiveTab('finalized')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 6,
                      background: libraryActiveTab === 'finalized' ? '#0284c7' : 'transparent',
                      color: libraryActiveTab === 'finalized' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Livros Concluídos ({finalizedProjects.length})
                  </button>

                  <button
                    onClick={() => setLibraryActiveTab('drafts')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 6,
                      background: libraryActiveTab === 'drafts' ? '#0284c7' : 'transparent',
                      color: libraryActiveTab === 'drafts' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Em Andamento ({draftProjects.length})
                  </button>
                </div>

                {/* BOTÃO DE FECHAR DESTACADO */}
                <button
                  onClick={() => setIsLibraryModalOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Fechar Acervo de Livros"
                >
                  <X size={16} /> Fechar
                </button>
              </div>
            </div>

            {/* Conteúdo com rolagem do Modal */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1
            }}>
              {libraryActiveTab === 'finalized' ? (
                <div>
                  <FinalBooksShelf
                    onOpenProject={(id) => {
                      setIsLibraryModalOpen(false);
                      onOpenProject(id);
                    }}
                  />
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                        Obras em Andamento ({draftProjects.length})
                      </h4>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        Livros em processo de criação editorial
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setIsLibraryModalOpen(false);
                        onCreateNewProject();
                      }}
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
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={15} /> Criar Novo Livro
                    </button>
                  </div>

                  {draftProjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                      <p>Nenhuma obra em andamento. Todas as suas obras estão finalizadas no acervo!</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {draftProjects.map(p => {
                        const chapters = p.kdpChapters?.length || 0;
                        const words = p.kdpChapters?.reduce((s, c) => s + (c.wordCount || 0), 0) || 0;
                        const coverUrl = p.coverImageUrl;

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setIsLibraryModalOpen(false);
                              onOpenProject(p.id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 18px',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: 12,
                              gap: 16,
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                              <div style={{
                                width: 50,
                                height: 75,
                                borderRadius: 6,
                                overflow: 'hidden',
                                background: '#1e293b',
                                flexShrink: 0,
                                border: '1px solid #cbd5e1'
                              }}>
                                {coverUrl ? (
                                  <img src={coverUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 9 }}>
                                    KDP
                                  </div>
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                                  {p.title || 'Livro Sem Título'}
                                </h4>
                                {p.subtitle && (
                                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                                    {p.subtitle}
                                  </p>
                                )}
                                <span style={{ fontSize: 12, color: '#64748b' }}>
                                  {p.author || 'Autor'} • {chapters} capítulos • {words > 0 ? `${words.toLocaleString('pt-BR')} palavras` : 'Em criação'}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                              {chapters > 0 && (
                                <button
                                  onClick={(e) => handleQuickFinalize(p, e)}
                                  disabled={finalizingProjectId === p.id}
                                  title="Finalizar e disponibilizar para download"
                                  style={{
                                    padding: '7px 12px',
                                    borderRadius: 6,
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: '#059669',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Finalizar Obra
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setIsLibraryModalOpen(false);
                                  onOpenProject(p.id);
                                }}
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
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Continuar <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rodapé do Modal com Botão de Fechar */}
            <div style={{
              padding: '14px 24px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                BookEngin • Catálogo integrado Amazon KDP
              </span>

              <button
                onClick={() => setIsLibraryModalOpen(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Fechar Estante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
