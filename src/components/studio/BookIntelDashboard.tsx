import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus,
  HelpCircle, ChevronDown, ArrowRight,
  Clock, Search, Copy, Trash2, Sparkles, CheckCircle2, Play,
  DollarSign, LogOut, Zap, RefreshCw, Shield,
  Headphones, FolderKanban, CheckCircle, Download, Layers, X
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
    <div className="book-intel-container" style={{ paddingTop: 18 }}>
      {/* CORPO PRINCIPAL COM NAVEGAÇÃO LATERAL ESQUERDA (HEADER SUPERIOR REMOVIDO PARA MÁXIMA LIMPEZA) */}
      <main className="book-intel-body" style={{ paddingTop: 0 }}>
        <div className="book-intel-wrapper">
          {/* NAVEGAÇÃO LATERAL ESQUERDA - UNIFICADA & CLEAN */}
          <aside className="book-intel-sidebar" aria-label="Navegação lateral BookEngin" style={{
            width: 268,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 18,
            padding: '22px 18px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}>
            {/* LOGOTIPO & MARCA BOOKENGIN INTEGRADO NA SIDEBAR */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              paddingBottom: 16,
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}>
                <BookOpen size={20} color="#ffffff" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                  BookEngin
                </span>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                  Estúdio Editorial KDP
                </span>
              </div>
            </div>

            {/* SEÇÃO 1: ESTÚDIO DE CRIAÇÃO */}
            <div className="sidebar-nav-section" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="sidebar-nav-title" style={{ marginBottom: 4, color: '#64748b', fontSize: 10.5, letterSpacing: '0.09em' }}>
                Ações de Criação
              </span>
              
              <button
                onClick={onCreateNewProject}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  color: '#ffffff',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: 10,
                  padding: '11px 14px',
                  fontSize: 13.5,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px rgba(37, 99, 235, 0.28)',
                  transition: 'all 0.18s ease',
                  textAlign: 'left'
                }}
                title={t('hero.btnNewBook')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus size={17} strokeWidth={2.5} />
                  <span>Criar Novo Projeto</span>
                </span>
                <ArrowRight size={14} style={{ opacity: 0.85 }} />
              </button>
            </div>

            {/* SEÇÃO 2: PROJETOS */}
            <div className="sidebar-nav-section">
              <span className="sidebar-nav-title" style={{ color: '#64748b', fontSize: 10.5, letterSpacing: '0.09em' }}>
                Acervo & Projetos
              </span>
              <button
                className="sidebar-nav-item"
                onClick={() => {
                  setLibraryActiveTab(finalizedProjects.length > 0 ? 'finalized' : 'drafts');
                  setIsLibraryModalOpen(true);
                }}
                title="Ver todos os projetos organizados no acervo"
                style={{ padding: '10px 12px', borderRadius: 10 }}
              >
                <FolderKanban size={16} color="#0284c7" />
                <span>Meus Projetos</span>
                <span className="sidebar-badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                  {projects.length}
                </span>
              </button>

              <button
                className="sidebar-nav-item"
                onClick={() => {
                  setLibraryActiveTab('drafts');
                  setIsLibraryModalOpen(true);
                }}
                title="Projetos em andamento"
                style={{ padding: '10px 12px', borderRadius: 10 }}
              >
                <Clock size={16} color="#d97706" />
                <span>Em andamento</span>
                <span className="sidebar-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
                  {draftProjects.length}
                </span>
              </button>

              <button
                className="sidebar-nav-item"
                onClick={() => {
                  setLibraryActiveTab('finalized');
                  setIsLibraryModalOpen(true);
                }}
                title="Projetos concluídos no acervo"
                style={{ padding: '10px 12px', borderRadius: 10 }}
              >
                <CheckCircle2 size={16} color="#059669" />
                <span>Concluídos</span>
                <span className="sidebar-badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                  {finalizedProjects.length}
                </span>
              </button>
            </div>

            {/* SEÇÃO 3: FERRAMENTAS */}
            <div className="sidebar-nav-section">
              <span className="sidebar-nav-title" style={{ color: '#64748b', fontSize: 10.5, letterSpacing: '0.09em' }}>
                Ferramentas de Estúdio
              </span>
              <button
                className="sidebar-nav-item"
                onClick={() => onQuickAction ? onQuickAction('niche') : setActiveModalAction('niche')}
                title="Pesquisa de Mercado & Nichos"
                style={{ padding: '10px 12px', borderRadius: 10 }}
              >
                <Search size={16} color="#0284c7" />
                <span>Pesquisa de Mercado</span>
              </button>

              <button
                className="sidebar-nav-item"
                onClick={() => {
                  if (projects.length > 0) {
                    onOpenProject(projects[0].id);
                  } else {
                    onCreateNewProject();
                  }
                }}
                title="Abrir Audiobook Neural & Vídeo Studio"
                style={{ padding: '10px 12px', borderRadius: 10 }}
              >
                <Headphones size={16} color="#0d9488" />
                <span>Audiobook & Vídeo IA</span>
                <span className="sidebar-badge" style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4', fontSize: 9.5 }}>
                  Ativo
                </span>
              </button>
            </div>

            {/* RODAPÉ DA SIDEBAR: CRÉDITOS, IDIOMA E PERFIL (ORGANIZADO & CLEAN) */}
            <div style={{
              marginTop: 'auto',
              paddingTop: 14,
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              {/* CRÉDITOS E IDIOMA */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <button
                  onClick={() => setIsCreditsModalOpen(true)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '7px 10px',
                    borderRadius: 8,
                    background: '#f0fdf4',
                    color: '#16a34a',
                    border: '1px solid #bbf7d0',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                  title="Saldo de créditos para gerar livros"
                >
                  <span>💳</span>
                  <span>{bookCredits} {bookCredits === 1 ? 'crédito' : 'créditos'}</span>
                </button>

                <LanguageSelector />
              </div>

              {/* PERFIL E LOGOUT */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}>
                <div
                  onClick={onOpenSettings}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0 }}
                  title="Abrir Configurações do Perfil"
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {((currentUser?.name || 'Leandro Palmeira').split(' ').map(n => n[0]).slice(0, 2).join('') || 'LP').toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentUser?.name || 'Leandro Palmeira'}
                    </span>
                    <span style={{ fontSize: 10, color: '#0284c7', fontWeight: 600 }}>
                      {currentUser?.plan === 'enterprise' ? 'Enterprise' : currentUser?.plan === 'pro' ? t('nav.proPlan') : 'Gratuito'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={onOpenSettings}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={t('nav.help')}
                  >
                    <HelpCircle size={15} />
                  </button>

                  {onLogout && (
                    <button
                      onClick={onLogout}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={t('nav.logout')}
                    >
                      <LogOut size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* ÁREA DE TRABALHO PRINCIPAL */}
          <div className="book-intel-main-area">
            <div className="book-intel-grid">
          
          {/* COLUNA PRINCIPAL */}
          <div className="intel-left-column" style={{ gap: 22 }}>
            
            {/* BANNER DE PROGRESSO DO LOTE EM EXECUÇÃO NO BACKEND (SE ATIVO) */}
            {batchState.isRunning && (
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: 16,
                padding: '18px 22px',
                marginBottom: 4,
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
                          🚀 Produção em Andamento: Livro {batchState.currentIndex} de {batchState.totalBooks}
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



            {/* CARD PRINCIPAL DE CRIAÇÃO EDITORIAL KDP - DESIGN CLEAN, MODERNO & DIRETO AO PONTO */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 18,
              padding: '32px 36px',
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              position: 'relative'
            }}>
              {/* CABEÇALHO DO CARD */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb'
                  }}>
                    <BookOpen size={24} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2 style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 800,
                      color: '#0f172a',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2
                    }}>
                      Livro Tradicional KDP
                    </h2>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                      Criação completa de livros de ficção e não-ficção com esteira editorial guiada
                    </span>
                  </div>
                </div>

                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0'
                }}>
                  ✓ Padrão Amazon 6×9" • 300 DPI Ready
                </span>
              </div>

              {/* DESCRIÇÃO EDITORIAL LIMPA */}
              <p style={{
                margin: 0,
                fontSize: 14,
                color: '#475569',
                lineHeight: 1.6,
                maxWidth: 900
              }}>
                Arquitetura editorial inteligente passo a passo: pesquisa com tese única (stance forte), curadoria de bestsellers de referência, biografia do autor, proposta de valor, sumário anti-IA com ritmo variado de capítulos e geração da capa e contracapa em total sintonia visual e temática.
              </p>

              {/* PÍLULAS DE RECURSOS EDITORIAIS */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8
              }}>
                {[
                  '🎯 Pesquisa & Tese Única',
                  '📊 Curadoria de Bestsellers',
                  '👤 Persona & Biografia',
                  '📐 Sumário Ritmo Variado',
                  '🎨 Capa & Contracapa em Sintonia',
                  '🎙️ Audiobook & Vídeo IA'
                ].map((pill, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '6px 13px',
                      borderRadius: 8,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    {pill}
                  </span>
                ))}
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                paddingTop: 12,
                borderTop: '1px solid #f1f5f9',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={onCreateNewProject}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '13px 28px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 6px 18px rgba(37, 99, 235, 0.28)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={18} strokeWidth={2.5} /> + Criar livro
                </button>

                {projects.length > 0 && (
                  <button
                    onClick={() => onOpenProject(projects[0].id)}
                    style={{
                      background: '#ffffff',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      padding: '12px 20px',
                      borderRadius: 10,
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Play size={14} color="#0284c7" /> Continuar Última Obra
                  </button>
                )}
              </div>
            </div>

            {/* SEÇÃO DO ACERVO DE LIVROS PUBLICADOS + VITRINE DIRETA DAS OBRAS */}
            {projects.length > 0 ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, #0b1120 0%, #0f172a 55%, #1e293b 100%)',
                  borderRadius: 20,
                  padding: '24px 28px',
                  marginBottom: 20,
                  border: '1px solid rgba(56, 189, 248, 0.28)',
                  boxShadow: '0 14px 34px rgba(2, 6, 23, 0.16)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                      flexShrink: 0
                    }}>
                      <BookOpen size={26} color="#ffffff" />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          background: 'rgba(56, 189, 248, 0.18)',
                          color: '#38bdf8',
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: '2px 9px',
                          borderRadius: 6,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase'
                        }}>
                          Biblioteca Editorial
                        </span>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          • {projects.length} {projects.length === 1 ? 'obra catalogada' : 'obras catalogadas'}
                        </span>
                      </div>

                      <h3 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.3px' }}>
                        Acervo de Livros Publicados & Obras Recentes
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setLibraryActiveTab(finalizedProjects.length > 0 ? 'finalized' : 'drafts');
                      setIsLibraryModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '11px 20px',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                      color: '#ffffff',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                    }}
                  >
                    <Layers size={16} /> Abrir Estante Completa ({projects.length}) <ArrowRight size={15} />
                  </button>
                </div>

                {/* GRADE DE ACESSO RÁPIDO ÀS 4 OBRAS MAIS RECENTES */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 14
                }}>
                  {projects.slice(0, 4).map((p) => {
                    const chapCount = p.kdpChapters?.length || 0;
                    const isDone = p.status === 'FINALIZADO' || p.pipelineStage === 'final';
                    return (
                      <div
                        key={p.id}
                        onClick={() => onOpenProject(p.id)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 12,
                          padding: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          cursor: 'pointer',
                          transition: 'all 0.18s ease'
                        }}
                      >
                        {/* Mini Capa ou Capa Tipográfica Elegante */}
                        <div style={{
                          width: 54,
                          height: 80,
                          borderRadius: 6,
                          overflow: 'hidden',
                          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                          border: '1px solid rgba(255, 255, 255, 0.22)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                          flexShrink: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: p.coverImageUrl ? 0 : 5,
                          textAlign: 'center'
                        }}>
                          {p.coverImageUrl ? (
                            <img src={p.coverImageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <>
                              <span style={{ fontSize: 6.5, color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>
                                EDIÇÃO
                              </span>
                              <span style={{
                                fontSize: 7.5,
                                fontWeight: 800,
                                color: '#f8fafc',
                                lineHeight: 1.15,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {p.title || 'Livro'}
                              </span>
                              <span style={{ fontSize: 6, color: '#94a3b8' }}>6×9"</span>
                            </>
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: isDone ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                              color: isDone ? '#34d399' : '#38bdf8'
                            }}>
                              {isDone ? '✓ Concluído' : 'Em Edição'}
                            </span>
                            <span style={{ fontSize: 10.5, color: '#94a3b8' }}>
                              {chapCount} caps
                            </span>
                          </div>

                          <div style={{
                            fontSize: 13.5,
                            fontWeight: 800,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginBottom: 2
                          }}>
                            {p.title || 'Obra Sem Título'}
                          </div>

                          <div style={{
                            fontSize: 11,
                            color: '#94a3b8',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginBottom: 6
                          }}>
                            {p.author || 'Autor Editorial'}
                          </div>

                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#38bdf8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            Abrir no Estúdio <ArrowRight size={11} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '36px 24px',
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: 16,
                textAlign: 'center',
                marginBottom: 24,
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <BookOpen size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  {t('catalog.emptyTitle')}
                </h4>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
                  Crie seu primeiro livro completo para inaugurar sua biblioteca editorial.
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
