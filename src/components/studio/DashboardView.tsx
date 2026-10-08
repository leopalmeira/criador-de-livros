import React, { useState } from 'react';
import { 
  Plus, 
  BookOpen, 
  Sparkles, 
  Clock, 
  Folder, 
  CheckCircle2, 
  MoreVertical, 
  Copy, 
  Trash2, 
  Download, 
  ArrowRight,
  TrendingUp,
  Layers,
  Palette,
  Search,
  BookMarked
} from 'lucide-react';
import { BookProject, BOOK_TYPE_CONFIGS, BookType, ProjectStatus } from '../../types/book-project';

interface DashboardViewProps {
  projects: BookProject[];
  onOpenProject: (projectId: string) => void;
  onCreateNewBook: () => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onSelectTemplate: (templateId: string) => void;
}

type FilterTab = 'all' | 'recent' | 'drafts' | 'completed' | 'templates';

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  onOpenProject,
  onCreateNewBook,
  onDuplicateProject,
  onDeleteProject,
  onSelectTemplate
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);

  // Filtra projetos
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kdpBookType.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'drafts') return p.status === 'IDEIA' || p.status === 'ESCREVENDO';
    if (activeFilter === 'completed') return p.status === 'PUBLICADO' || p.kdpPackageGeneratedAt;
    if (activeFilter === 'recent') {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return p.updatedAt > sevenDaysAgo;
    }
    return true;
  });

  // Métricas gerais
  const totalWords = projects.reduce((sum, p) => {
    const chs = p.kdpChapters || [];
    return sum + chs.reduce((s, c) => s + (c.wordCount || 0), 0);
  }, 0);
  const totalReady = projects.filter(p => p.kdpPackageGeneratedAt || p.kdpQualityReport?.passed).length;

  const calculateProjectProgress = (p: BookProject): number => {
    const chapters = p.kdpChapters || [];
    const completedChapters = chapters.filter(c => c.prose && c.prose.trim().length > 100).length;
    let score = 0;
    if (p.kdpConcept?.title) score += 15;
    if (p.kdpBible || p.bookMemory) score += 15;
    if (chapters.length > 0) score += 10;
    if (chapters.length > 0) score += Math.round((completedChapters / chapters.length) * 35);
    if (p.kdpCoverDesign?.geometry) score += 15;
    if (p.kdpPackageGeneratedAt) score += 10;
    return Math.min(100, score);
  };

  return (
    <div className="studio-dashboard-container">
      {/* HERO SECTION DE BOAS-VINDAS & AÇÃO PRINCIPAL */}
      <section className="dashboard-hero-banner">
        <div className="hero-content-left">
          <div className="hero-badge">
            <Sparkles size={14} className="text-amber-400" />
            <span>Fábrica Digital de Livros KDP</span>
          </div>
          <h1 className="hero-heading">Bem-vindo ao Book Studio</h1>
          <p className="hero-subtext">
            Transforme ideias em livros diagramados e prontos para publicação na Amazon KDP com inteligência editorial completa.
          </p>

          <div className="hero-actions-row">
            <button className="btn-hero-primary" onClick={onCreateNewBook}>
              <Plus size={18} /> Novo Livro
            </button>
            <button className="btn-hero-secondary" onClick={() => setActiveFilter('templates')}>
              <Layers size={16} /> Explorar Templates
            </button>
          </div>
        </div>

        {/* MÉTRICAS EM CARDS */}
        <div className="hero-metrics-grid">
          <div className="metric-box-card">
            <div className="metric-icon-wrap bg-blue-500/10 text-blue-400">
              <BookOpen size={20} />
            </div>
            <div>
              <span className="metric-value">{projects.length}</span>
              <span className="metric-label">Obras no Acervo</span>
            </div>
          </div>

          <div className="metric-box-card">
            <div className="metric-icon-wrap bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="metric-value">{totalReady}</span>
              <span className="metric-label">Prontos para KDP</span>
            </div>
          </div>

          <div className="metric-box-card">
            <div className="metric-icon-wrap bg-purple-500/10 text-purple-400">
              <TrendingUp size={20} />
            </div>
            <div>
              <span className="metric-value">{totalWords.toLocaleString()}</span>
              <span className="metric-label">Palavras Escritas</span>
            </div>
          </div>
        </div>
      </section>

      {/* BARRA DE FILTROS & PESQUISA */}
      <div className="dashboard-toolbar-filter">
        <div className="filter-tabs-group">
          <button 
            className={`filter-pill-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            Meus Livros ({projects.length})
          </button>
          <button 
            className={`filter-pill-btn ${activeFilter === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveFilter('recent')}
          >
            Recentes
          </button>
          <button 
            className={`filter-pill-btn ${activeFilter === 'drafts' ? 'active' : ''}`}
            onClick={() => setActiveFilter('drafts')}
          >
            Rascunhos
          </button>
          <button 
            className={`filter-pill-btn ${activeFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveFilter('completed')}
          >
            Concluídos ({totalReady})
          </button>
          <button 
            className={`filter-pill-btn ${activeFilter === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveFilter('templates')}
          >
            Templates
          </button>
        </div>

        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por título, autor ou gênero..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* GRID DE CARDS DOS PROJETOS */}
      {activeFilter !== 'templates' ? (
        <div className="books-cards-grid">
          {filteredProjects.map((p) => {
            const progress = calculateProjectProgress(p);
            const isMenuOpen = openMenuProjectId === p.id;
            const coverImage = p.kdpCoverDesign?.frontImageUrl;

            return (
              <div key={p.id} className="book-project-card">
                {/* TOPO: CAPA DO LIVRO */}
                <div 
                  className="book-card-cover-wrapper"
                  onClick={() => onOpenProject(p.id)}
                >
                  {coverImage ? (
                    <img src={coverImage} alt={p.title} className="card-cover-image" />
                  ) : (
                    <div className="card-cover-styled-placeholder">
                      <div className="cover-art-frame">
                        <BookMarked size={32} className="cover-art-icon" />
                        <span className="cover-placeholder-title">{p.title}</span>
                        <span className="cover-placeholder-author">{p.author}</span>
                      </div>
                    </div>
                  )}

                  <div className="cover-overlay-badge-trim">
                    <span>{p.trimSize || '6x9'}</span>
                  </div>
                </div>

                {/* CORPO DO CARD */}
                <div className="book-card-body">
                  <div className="flex justify-between items-start mb-1">
                    <span className="badge-genre">{p.kdpBookType}</span>
                    <div className="relative">
                      <button 
                        className="btn-icon-subtle" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuProjectId(isMenuOpen ? null : p.id);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <div className="card-context-menu">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateProject(p.id);
                              setOpenMenuProjectId(null);
                            }}
                          >
                            <Copy size={13} /> Duplicar Projeto
                          </button>
                          <button 
                            className="text-rose-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProject(p.id);
                              setOpenMenuProjectId(null);
                            }}
                          >
                            <Trash2 size={13} /> Excluir Obra
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="book-card-title" onClick={() => onOpenProject(p.id)} title={p.title}>
                    {p.title}
                  </h3>
                  <span className="book-card-author">Por {p.author}</span>

                  {/* BARRA DE PROGRESSO */}
                  <div className="card-progress-section">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted">Produção Editorial</span>
                      <span className="font-semibold text-secondary">{progress}%</span>
                    </div>
                    <div className="progress-track-bg">
                      <div className="progress-bar-indicator" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* FOOTER DO CARD */}
                  <div className="book-card-footer">
                    <span className="card-updated-date">
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </span>
                    <button className="btn-continue-reading" onClick={() => onOpenProject(p.id)}>
                      Continuar <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* CARD DE ADICIONAR NOVO LIVRO */}
          <div className="book-project-card card-create-new-dashed" onClick={onCreateNewBook}>
            <div className="card-dashed-inner">
              <div className="plus-icon-circle">
                <Plus size={24} />
              </div>
              <h4>Criar Novo Livro</h4>
              <p>Iniciar planejamento e escrita com assistência de IA</p>
            </div>
          </div>
        </div>
      ) : (
        /* SEÇÃO DE TEMPLATES */
        <div className="templates-catalog-section">
          <div className="mb-4">
            <h3 className="text-lg font-bold">Templates Prontos para Produção</h3>
            <p className="text-xs text-muted">
              Escolha entre modelos de ficção, não ficção, livros infantis ilustrados, atividades, planners e diários.
            </p>
          </div>

          <div className="templates-grid">
            {([
              'romance', 'fiction-novel', 'mystery', 'thriller', 'fantasy', 'sci-fi',
              'self-help', 'business', 'finance', 'practical-guide', 'children-picture-book',
              'illustrated-book', 'workbook', 'activity-book', 'coloring-book', 'planner',
              'diary', 'puzzle-book', 'biography'
            ] as BookType[]).map((id) => {
              const config = BOOK_TYPE_CONFIGS[id];
              return (
              <div key={id} className="template-card-item">
                <div className="flex justify-between items-start mb-2">
                  <span className="badge-tmpl-pill">{config.category}</span>
                  <span className="text-xs text-muted">{config.trimSize}</span>
                </div>
                <h4 className="font-semibold text-base mb-1">{config.label}</h4>
                <p className="text-xs text-muted mb-4">{config.description}</p>
                <button 
                  className="btn-use-template-full"
                  onClick={() => onSelectTemplate(id)}
                >
                  Usar Este Template →
                </button>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
