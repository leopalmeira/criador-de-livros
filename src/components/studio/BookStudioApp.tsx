import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { db } from '../../database/local-database';
import { BookProject } from '../../types/book-project';
import { BookOpportunityProposal } from '../../types/category-intelligence';
import {
  getAmazonBestSellersForSegment,
  AmazonBestSellerReference
} from '../../services/amazon-bestsellers-catalog';

// Modais e Componentes Principais
import { SettingsTab } from '../../dashboard/components/SettingsTab';
import { BookIntelDashboard } from './BookIntelDashboard';
import { SegmentSelectorModal } from './SegmentSelectorModal';
import { KdpBookGeneratorPro } from './generator/KdpBookGeneratorPro';
import { MultiplatformPublishingModal } from './publishing/MultiplatformPublishingModal';
import { KdpDirectPublishModal } from './publishing/KdpDirectPublishModal';
import { LoginPage } from './auth/LoginPage';
import { BatchBookGeneratorModal } from './batch/BatchBookGeneratorModal';
import { TechnicalManualsModal } from './manuals/TechnicalManualsModal';
import { AuthorAiGuideDrawer } from './ai-guide/AuthorAiGuideDrawer';
import { BestsellerCover10StylesModal } from './cover/BestsellerCover10StylesModal';
import { CoverStyleDefinition } from '../../services/amazon-cover-styles';
import { AuthenticatedUser, authClient } from '../../services/auth-client';
import '../../styles/book-intel-dashboard.css';

type AppMode = 'project-list' | 'settings' | 'kdp-generator';

export const BookStudioApp: React.FC = () => {
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [activeProject, setActiveProject] = useState<BookProject | null>(null);
  const authenticatedUserIdRef = useRef<string | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<AppMode>('project-list');
  const [isSegmentModalOpen, setIsSegmentModalOpen] = useState(false);
  const [isPublishingModalOpen, setIsPublishingModalOpen] = useState(false);
  const [publishingProject, setPublishingProject] = useState<BookProject | null>(null);

  // Novos Modais KDP
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isManualsModalOpen, setIsManualsModalOpen] = useState(false);
  const [isCover10StylesOpen, setIsCover10StylesOpen] = useState(false);
  const [isAiGuideOpen, setIsAiGuideOpen] = useState(false);

  // Estado para Publicação Direta KDP In-App
  const [isKdpPublishOpen, setIsKdpPublishOpen] = useState(false);
  const [kdpPublishTarget, setKdpPublishTarget] = useState<BookProject | null>(null);

  useEffect(() => {
    let isMounted = true;
    authClient.getSession()
      .then(user => {
        if (!isMounted) return;
        authenticatedUserIdRef.current = user?.id || null;
        db.setAuthenticatedUser(user?.id || null);
        setIsAuthenticated(Boolean(user));
      })
      .catch(error => {
        console.error('Não foi possível validar a sessão no servidor:', error);
        if (!isMounted) return;
        authenticatedUserIdRef.current = null;
        db.setAuthenticatedUser(null);
        setIsAuthenticated(false);
      })
      .finally(() => {
        if (isMounted) setIsAuthChecking(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authClient.logout();
    } catch (error) {
      console.error('Não foi possível encerrar a sessão no servidor:', error);
    }
    authenticatedUserIdRef.current = null;
    db.setAuthenticatedUser(null);
    setIsAuthenticated(false);
    setProjects([]);
    setActiveProject(null);
    setProjectLoadError(null);
  };

  // Sincronização de rotas com URL hash (#landing, #dashboard, #studio)
  useEffect(() => {
    const handleHash = () => {
      const h = (window.location.hash || '').toLowerCase();
      if (h.includes('dashboard') || h.includes('landing') || h === '' || h === '#') {
        setMode('project-list');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Carregar projetos do IndexedDB
  const reloadProjects = useCallback(async () => {
    if (!isAuthenticated) {
      setProjects([]);
      return;
    }
    const requestedUserId = authenticatedUserIdRef.current;
    try {
      const all = await db.getAllBookProjects();
      if (requestedUserId === authenticatedUserIdRef.current) {
        setProjects(all);
        setProjectLoadError(null);
      }
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
      if (requestedUserId === authenticatedUserIdRef.current) {
        setProjectLoadError(err instanceof Error ? err.message : 'Não foi possível carregar seus projetos.');
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) reloadProjects();
  }, [reloadProjects]);

  // Keep-Alive Ping no Render enquanto a aba estiver aberta (a cada 5 min)
  useEffect(() => {
    const doPing = () => {
      fetch('/ping').catch(() => {});
    };
    doPing();
    const timer = setInterval(doPing, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Abrir projeto existente diretamente no Gerador KDP Pro
  const openProject = async (projectId: string) => {
    const requestedUserId = authenticatedUserIdRef.current;
    let found = projects.find(p => p.id === projectId);
    if (!found) {
      try {
        const fromDb = await db.getBookProject(projectId);
        if (fromDb) {
          found = fromDb;
          setProjects(prev => [fromDb, ...prev.filter(p => p.id !== fromDb.id)]);
        }
      } catch (err) {
        console.warn('[BookStudioApp] Falha ao recuperar projeto do banco:', err);
      }
    }
    if (requestedUserId !== authenticatedUserIdRef.current) return;
    if (found) {
      setActiveProject(found);
      setMode('kdp-generator');
    }
  };

  const [newSessionId, setNewSessionId] = useState<string>(() => `sess_${Date.now()}`);

  // Iniciar criação de novo projeto
  const handleCreateNewProject = () => {
    setActiveProject(null);
    setNewSessionId(`sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    setMode('kdp-generator');
  };

  // Criar novo livro com seleção de segmento e modelo guiado da Amazon
  const handleConfirmNewSegmentProject = async (
    segment: any,
    topic: string,
    amazonRef?: AmazonBestSellerReference
  ) => {
    setIsSegmentModalOpen(false);

    const allBestSellers = getAmazonBestSellersForSegment(segment);
    const primaryRef = amazonRef || allBestSellers[0];

    const initialTitle = primaryRef?.suggestedTitle || topic;
    const initialSubtitle = primaryRef?.suggestedSubtitle || '';
    const initialAudience = primaryRef?.targetAudience || 'Público Geral Adulto';

    const newProject: BookProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'RASCUNHO',
      priority: 'ALTA',
      executionMode: 'assisted',
      title: initialTitle,
      subtitle: initialSubtitle,
      author: 'Leandro Palmeira',
      description: topic,
      language: 'Português',
      format: 'Capa Comum',
      trimSize: '6x9',
      paperType: 'bw-white',
      estimatedPages: 100,
      actualPages: 0,
      targetPrice: 39.90,
      currency: 'BRL',
      targetMarketplace: 'amazon.com.br',
      categories: [segment || 'Desenvolvimento Pessoal'],
      keywords: [],
      targetAudience: initialAudience,
      topic: topic,
      kdpBookType: 'business',
      kdpChapters: [],
      tasks: [],
      notes: `Iniciado via seleção de nicho Amazon: ${segment}.`,
      competitorsAsins: primaryRef ? [primaryRef.asin] : [],
      pipelineStage: 'research',
      pipelineProgress: 0,
      pipelineLog: [`Projeto criado com benchmark em ${primaryRef?.title || segment}.`]
    };

    await db.saveBookProject(newProject);
    setProjects(prev => [newProject, ...prev]);
    setActiveProject(newProject);
    setMode('kdp-generator');
  };

  // Criar projeto a partir de uma oportunidade da Inteligência Comercial por Gênero
  const handleSelectOpportunity = async (
    proposal: BookOpportunityProposal,
    genre: string,
    category: string,
    subcategory: string
  ) => {
    const newProject: BookProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'RASCUNHO',
      priority: 'ALTA',
      executionMode: 'assisted',
      title: proposal.title,
      subtitle: proposal.subtitle,
      author: 'Leandro Palmeira',
      description: proposal.positioning,
      language: 'Português',
      format: 'Capa Comum',
      trimSize: '6x9',
      paperType: 'bw-white',
      estimatedPages: 100,
      actualPages: 0,
      targetPrice: 39.90,
      currency: 'BRL',
      targetMarketplace: 'amazon.com.br',
      categories: [genre, category, subcategory].filter(Boolean),
      keywords: [],
      targetAudience: proposal.targetAudience,
      topic: proposal.commercialHook,
      kdpBookType: 'business',
      kdpChapters: [],
      tasks: [],
      notes: `Oportunidade KDP: Gênero ${genre}, Subcategoria ${subcategory}.`,
      competitorsAsins: [],
      pipelineStage: 'research',
      pipelineProgress: 0,
      pipelineLog: [`Projeto criado com base na oportunidade "${proposal.title}".`]
    };

    await db.saveBookProject(newProject);
    setProjects(prev => [newProject, ...prev]);
    setActiveProject(newProject);
    setMode('kdp-generator');
  };

  // Excluir projeto
  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este livro?')) return;
    await db.deleteBookProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProject?.id === id) {
      setActiveProject(null);
      setMode('project-list');
    }
  };

  // Duplicar projeto
  const duplicateProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const source = projects.find(p => p.id === id);
    if (!source) return;

    const copy: BookProject = {
      ...source,
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: `${source.title} (Cópia)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes: `Duplicado a partir do projeto ${source.id}. ${source.notes || ''}`
    };
    (copy as any).duplicatedFromProjectId = source.id;

    await db.saveBookProject(copy);
    setProjects(prev => [copy, ...prev]);
  };

  // Abrir Publicação Direta Amazon KDP In-App
  const handleOpenKdpPublish = (projectId?: string) => {
    if (projectId) {
      const p = projects.find(item => item.id === projectId);
      setKdpPublishTarget(p || null);
    } else {
      const defaultProj = projects.find(p => p.status === 'FINALIZADO') || projects[0] || null;
      setKdpPublishTarget(defaultProj);
    }
    setIsKdpPublishOpen(true);
  };

  // Abrir Publicação Multiplataforma a partir da Dashboard
  const handleOpenPublishing = (projectId?: string) => {
    if (projectId) {
      const p = projects.find(item => item.id === projectId);
      setPublishingProject(p || null);
    } else {
      const defaultProj = projects.find(p => p.status === 'FINALIZADO') || projects[0] || null;
      setPublishingProject(defaultProj);
    }
    setIsPublishingModalOpen(true);
  };

  // ============================================================
  // TELA 0: AUTENTICAÇÃO OBRIGATÓRIA (LOGIN DIRETO SEM LANDING PAGE)
  // ============================================================
  if (isAuthChecking) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        <span className="auth-loading-spinner" />
        <span>Verificando sua sessão segura…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(user: AuthenticatedUser) => {
          authenticatedUserIdRef.current = user.id;
          db.setAuthenticatedUser(user.id);
          setProjects([]);
          setActiveProject(null);
          setProjectLoadError(null);
          setIsAuthenticated(true);
          setMode('project-list');
        }}
      />
    );
  }

  if (projectLoadError) {
    return (
      <div className="auth-loading" role="alert">
        <div>
          <p>Não foi possível carregar os projetos da sua conta.</p>
          <p>{projectLoadError}</p>
          <button type="button" onClick={() => void reloadProjects()}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  // ============================================================
  // TELA 1: DASHBOARD BOOKENGIN (DESIGN PROFISSIONAL)
  // ============================================================
  if (mode === 'project-list') {
    const targetProjectForPublishing = publishingProject || projects[0] || {
      id: 'demo_studio',
      title: 'Meu Livro KDP',
      subtitle: 'Guia Editorial & Estratégia Comercial',
      author: 'Leandro Palmeira',
      capitulos: [],
      coverUrl: null
    };

    const targetKdpDirect = kdpPublishTarget || projects.find(p => p.status === 'FINALIZADO') || projects[0] || {
      id: 'demo_kdp',
      title: 'Meu Livro KDP Pro',
      subtitle: 'Edição Publicada Direta',
      author: 'Leandro Palmeira',
      description: '',
      categories: ['Não-Ficção / Desenvolvimento Pessoal'],
      keywords: [],
      capitulos: [],
      coverUrl: null,
      targetPrice: 39.90,
      currency: 'BRL',
      trimSize: '6x9'
    };

    return (
      <>
        <BookIntelDashboard
          projects={projects}
          onCreateNewProject={handleCreateNewProject}
          onOpenProject={openProject}
          onDuplicateProject={duplicateProject}
          onDeleteProject={deleteProject}
          onOpenSettings={() => setMode('settings')}
          onSelectOpportunity={handleSelectOpportunity}
          onOpenPublishing={handleOpenPublishing}
          onOpenKdpPublish={handleOpenKdpPublish}
          onOpenBatchGenerator={() => setIsBatchModalOpen(true)}
          onOpenTechnicalManuals={() => setIsManualsModalOpen(true)}
          onOpenCover10Styles={() => setIsCover10StylesOpen(true)}
          onOpenAiGuide={() => setIsAiGuideOpen(true)}
          onLogout={handleLogout}
        />
        <SegmentSelectorModal
          isOpen={isSegmentModalOpen}
          onClose={() => setIsSegmentModalOpen(false)}
          onConfirm={handleConfirmNewSegmentProject}
        />
        <MultiplatformPublishingModal
          isOpen={isPublishingModalOpen}
          onClose={() => setIsPublishingModalOpen(false)}
          project={{
            id: targetProjectForPublishing.id,
            title: targetProjectForPublishing.title || 'Livro Sem Título',
            subtitle: targetProjectForPublishing.subtitle,
            author: targetProjectForPublishing.author || 'Leandro Palmeira',
            capitulos: (targetProjectForPublishing as any).kdpChapters?.map((c: any) => ({
              titulo: c.title || c.titulo || 'Capítulo',
              texto: c.content || c.conteudo || ''
            })) || (targetProjectForPublishing as any).capitulos || [],
            coverUrl: (targetProjectForPublishing as any).coverUrl || (targetProjectForPublishing as any).capaFinal || (targetProjectForPublishing as any).coverImageUrl || null
          }}
        />
        <KdpDirectPublishModal
          isOpen={isKdpPublishOpen}
          onClose={() => setIsKdpPublishOpen(false)}
          project={{
            id: targetKdpDirect.id,
            title: targetKdpDirect.title || 'Livro Sem Título',
            subtitle: targetKdpDirect.subtitle,
            author: targetKdpDirect.author || 'Leandro Palmeira',
            description: targetKdpDirect.description,
            categories: targetKdpDirect.categories,
            keywords: targetKdpDirect.keywords,
            capitulos: (targetKdpDirect as any).kdpChapters?.map((c: any) => ({
              titulo: c.title || c.titulo || 'Capítulo',
              texto: c.content || c.conteudo || ''
            })) || (targetKdpDirect as any).capitulos || [],
            coverUrl: (targetKdpDirect as any).coverImageUrl || (targetKdpDirect as any).coverUrl || (targetKdpDirect as any).capaFinal || null,
            targetPrice: targetKdpDirect.targetPrice || 39.90,
            currency: targetKdpDirect.currency || 'BRL',
            trimSize: targetKdpDirect.trimSize || '6x9'
          }}
          onPublishSuccess={() => {
            reloadProjects();
          }}
        />

        {/* MODAL DO GERADOR EM LOTE (1 A 20 LIVROS COM AUTO-AUDITORIA) */}
        <BatchBookGeneratorModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          onBatchCompleted={() => reloadProjects()}
        />

        {/* MODAL DE MANUAIS TÉCNICOS COM IMAGENS E TEXTOS */}
        <TechnicalManualsModal
          isOpen={isManualsModalOpen}
          onClose={() => setIsManualsModalOpen(false)}
          onProjectCreated={(id) => {
            reloadProjects();
            openProject(id);
          }}
        />

        {/* MODAL DOS 10 ESTILOS DE CAPAS COM LINKS DA AMAZON E GRAU DE ACEITAÇÃO */}
        <BestsellerCover10StylesModal
          isOpen={isCover10StylesOpen}
          onClose={() => setIsCover10StylesOpen(false)}
          project={activeProject || projects[0] || null}
        />

        {/* IA GUIA DO AUTOR NO PAINEL */}
        <AuthorAiGuideDrawer
          isOpen={isAiGuideOpen}
          onClose={() => setIsAiGuideOpen(false)}
          onOpenManuals={() => {
            setIsAiGuideOpen(false);
            setIsManualsModalOpen(true);
          }}
          onOpenBatch={() => {
            setIsAiGuideOpen(false);
            setIsBatchModalOpen(true);
          }}
          onOpenCoverStudio={() => {
            setIsAiGuideOpen(false);
            setIsCover10StylesOpen(true);
          }}
        />
      </>
    );
  }

  // ============================================================
  // TELA 2: GERADOR DE LIVROS KDP PRO (GEMINI 3.8 / IMAGEN 3)
  // ============================================================
  if (mode === 'kdp-generator') {
    return (
      <KdpBookGeneratorPro
        key={activeProject ? activeProject.id : newSessionId}
        initialProject={activeProject}
        isNewProject={activeProject === null}
        onBackToDashboard={() => {
          setActiveProject(null);
          setMode('project-list');
          reloadProjects();
        }}
        onProjectSaved={(newProject) => {
          setProjects(prev => [newProject, ...prev]);
          reloadProjects();
        }}
      />
    );
  }

  // ============================================================
  // TELA 3: CONFIGURAÇÕES DA IA
  // ============================================================
  if (mode === 'settings') {
    return (
      <div className="app-layout">
        <div className="settings-page">
          <div className="settings-header">
            <button className="btn-back" onClick={() => setMode('project-list')}>
              <ChevronLeft size={18} /> Voltar à Dashboard
            </button>
            <h2>Configurações da Inteligência Artificial</h2>
          </div>
          <SettingsTab />
        </div>
      </div>
    );
  }

  return null;
};
