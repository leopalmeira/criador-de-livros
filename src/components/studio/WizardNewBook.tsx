import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  BookOpen, 
  Check, 
  Sliders, 
  Layers, 
  FileText, 
  Palette, 
  Wand2, 
  HelpCircle,
  FolderPlus
} from 'lucide-react';
import { 
  BookType, 
  TrimSize, 
  PaperType, 
  BOOK_TYPE_CONFIGS, 
  BookProject, 
  TRIM_SIZE_METRICS, 
  calculateTargetWordsForPages 
} from '../../types/book-project';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';

interface WizardNewBookProps {
  onCancel: () => void;
  onCreateProject: (project: BookProject, autoRunStages: string[]) => void;
  aiService: AiService;
}

export const BOOK_CATEGORIES_CATALOG: Array<{
  id: BookType;
  title: string;
  category: string;
  desc: string;
  defaultTrim: TrimSize;
  defaultPages: number;
  iconName: string;
}> = [
  { id: 'fiction-novel', title: 'Ficção Literária', category: 'Ficção', desc: 'Romance literário, drama contemporâneo e arcos clássicos.', defaultTrim: '6x9', defaultPages: 260, iconName: 'BookOpen' },
  { id: 'mystery', title: 'Mistério & Investigação', category: 'Ficção', desc: 'Pistas inteligentes, enigmas policiais e deduções.', defaultTrim: '5.5x8.5', defaultPages: 250, iconName: 'Compass' },
  { id: 'thriller', title: 'Thriller & Suspense', category: 'Ficção', desc: 'Ritmo acelerado, perigo iminente e plot twists chocantes.', defaultTrim: '5.5x8.5', defaultPages: 260, iconName: 'Zap' },
  { id: 'romance', title: 'Romance Amoroso', category: 'Ficção', desc: 'Química apaixonante, conflitos de relacionamento e emoção.', defaultTrim: '5x8', defaultPages: 240, iconName: 'Heart' },
  { id: 'fantasy', title: 'Fantasia Épica', category: 'Ficção', desc: 'Construção de mundos mágicos, heróis lendários e lore.', defaultTrim: '6x9', defaultPages: 350, iconName: 'Sparkles' },
  { id: 'sci-fi', title: 'Ficção Científica', category: 'Ficção', desc: 'Futurismo, inteligência artificial, espaço e distopias.', defaultTrim: '6x9', defaultPages: 300, iconName: 'Cpu' },
  { id: 'children-picture-book', title: 'Livro Infantil Ilustrado', category: 'Infantil', desc: 'Formato quadrado colorido, poucas palavras e ricas ilustrações.', defaultTrim: '8.5x8.5', defaultPages: 32, iconName: 'Smile' },
  { id: 'non-fiction', title: 'Não Ficção Geral', category: 'Não Ficção', desc: 'Didático, informativo e progressivo com lições aplicáveis.', defaultTrim: '6x9', defaultPages: 180, iconName: 'FileText' },
  { id: 'self-help', title: 'Desenvolvimento Pessoal', category: 'Não Ficção', desc: 'Hábitos, mentalidade produtiva, finanças e superação.', defaultTrim: '6x9', defaultPages: 160, iconName: 'TrendingUp' },
  { id: 'biography', title: 'Biografia & Memórias', category: 'Não Ficção', desc: 'Narrativa real de vida, memórias históricas e legado.', defaultTrim: '6x9', defaultPages: 220, iconName: 'Award' },
  { id: 'practical-guide', title: 'Guia Prático / Manual', category: 'Técnico', desc: 'Passo a passo acionável com checklists e tutoriais.', defaultTrim: '6x9', defaultPages: 140, iconName: 'CheckSquare' },
  { id: 'workbook', title: 'Workbook / Livro de Exercícios', category: 'Atividades', desc: 'Páginas amplas para preenchimento, reflexão e exercícios.', defaultTrim: '8.5x11', defaultPages: 100, iconName: 'Edit3' },
  { id: 'coloring-book', title: 'Coloring Book (Colorir)', category: 'Atividades', desc: 'Linhas pretas para pintura e artes relaxantes.', defaultTrim: '8.5x11', defaultPages: 80, iconName: 'Palette' },
  { id: 'journal', title: 'Journal / Diário Guiado', category: 'Atividades', desc: 'Prompts diários de gratidão, metas e rotinas.', defaultTrim: '6x9', defaultPages: 150, iconName: 'Calendar' },
  { id: 'education', title: 'Livro Educativo / Didático', category: 'Educação', desc: 'Material pedagógico estruturado para estudantes e cursos.', defaultTrim: '7x10', defaultPages: 200, iconName: 'GraduationCap' },
  { id: 'puzzle-book', title: 'Puzzle / Caça-Palavras', category: 'Atividades', desc: 'Desafios lógicos, passatempos e quebra-cabeças.', defaultTrim: '8.5x11', defaultPages: 120, iconName: 'Grid' },
  { id: 'other', title: 'Outro Formato Personalizado', category: 'Custom', desc: 'Configure as dimensões e parâmetros livremente.', defaultTrim: '6x9', defaultPages: 150, iconName: 'Settings' }
];

export const WizardNewBook: React.FC<WizardNewBookProps> = ({
  onCancel,
  onCreateProject,
  aiService
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Etapa 1: Tipo de Livro
  const [selectedBookType, setSelectedBookType] = useState<BookType>('self-help');

  // Etapa 2: Informações da Obra
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('Autor Independente');
  const [language, setLanguage] = useState('Português');
  const [targetAudience, setTargetAudience] = useState('');
  const [ageRange, setAgeRange] = useState('Adulto (18+)');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [isAnalyzingIdea, setIsAnalyzingIdea] = useState(false);

  // Etapa 3: Configuração KDP
  const [trimSize, setTrimSize] = useState<TrimSize>('6x9');
  const [paperType, setPaperType] = useState<PaperType>('bw-white');
  const [estimatedPages, setEstimatedPages] = useState<number>(160);
  const [chapterCount, setChapterCount] = useState<number>(12);
  const [narrativeTone, setNarrativeTone] = useState('Inspirador e Prático');
  const [depthLevel, setDepthLevel] = useState('Equilibrado (Direto e Aprofundado)');

  // Etapa 4: Assistência e Automação da IA
  const [autonomousFullBook, setAutonomousFullBook] = useState(true);
  const [autoCreateConcept, setAutoCreateConcept] = useState(true);
  const [autoCreateOutline, setAutoCreateOutline] = useState(true);
  const [autoCreateBible, setAutoCreateBible] = useState(true);
  const [autoWriteAllChapters, setAutoWriteAllChapters] = useState(true);
  const [autoCreateCover, setAutoCreateCover] = useState(true);
  const [autoCreateIllustrations, setAutoCreateIllustrations] = useState(true);
  const [autoCreateMetadata, setAutoCreateMetadata] = useState(true);

  // Ao selecionar tipo de livro, ajusta defaults
  const handleSelectBookType = (typeId: BookType) => {
    setSelectedBookType(typeId);
    const catalogItem = BOOK_CATEGORIES_CATALOG.find(c => c.id === typeId);
    if (catalogItem) {
      setTrimSize(catalogItem.defaultTrim);
      setEstimatedPages(catalogItem.defaultPages);
      if (typeId === 'children-picture-book') {
        setPaperType('color');
        setChapterCount(12);
        setAgeRange('Infantil (4 a 8 anos)');
      } else if (typeId === 'fiction-novel' || typeId === 'fantasy' || typeId === 'romance') {
        setPaperType('bw-cream');
        setChapterCount(18);
        setAgeRange('Jovem Adulto / Adulto');
      } else {
        setPaperType('bw-white');
      }
    }
  };

  // Análise da Ideia com IA
  const handleAnalyzeIdeaWithAi = async () => {
    if (!ideaDescription.trim()) return;
    setIsAnalyzingIdea(true);
    try {
      const pipeline = new KdpBookPipeline(aiService);
      const analysis = await pipeline.analyzeIdea(ideaDescription, language);
      if (analysis) {
        if (!title) setTitle(analysis.niche || 'Livro Sem Título');
        if (analysis.targetAudience) setTargetAudience(analysis.targetAudience);
        if (analysis.tone) setNarrativeTone(analysis.tone);
        if (analysis.recommendedBookType) handleSelectBookType(analysis.recommendedBookType);
        if (analysis.recommendedPages) setEstimatedPages(analysis.recommendedPages);
      }
    } catch {
      // continua sem interromper
    } finally {
      setIsAnalyzingIdea(false);
    }
  };

  // Finalização do Wizard
  const handleFinalizeProject = () => {
    const finalTitle = title.trim() || 'Minha Nova Obra';
    const projId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const autoStages: string[] = [];
    if (autoCreateConcept) autoStages.push('concept');
    if (autoCreateOutline) autoStages.push('outline');
    if (autoCreateBible) autoStages.push('bible');
    if (autoWriteAllChapters) {
      autoStages.push('all_chapters');
    } else {
      autoStages.push('chapter_1');
    }
    if (autoCreateCover) autoStages.push('cover');
    if (autoCreateIllustrations) autoStages.push('illustrations');
    if (autoCreateMetadata) autoStages.push('metadata');
    if (autonomousFullBook) {
      autoStages.push('review');
      autoStages.push('quality');
      autoStages.push('export');
    }

    const newProject: BookProject = {
      id: projId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'IDEIA',
      priority: 'ALTA',
      executionMode: autoStages.length > 0 ? 'automatic' : 'assisted',
      title: finalTitle,
      subtitle: subtitle.trim(),
      author: author.trim() || 'Autor Independente',
      description: ideaDescription.trim() || `Livro sobre ${finalTitle}.`,
      language,
      format: 'Capa Comum',
      trimSize,
      paperType,
      estimatedPages,
      targetPrice: 29.90,
      currency: 'BRL',
      targetMarketplace: 'amazon.com.br',
      categories: [selectedBookType],
      keywords: [],
      targetAudience: targetAudience.trim() || 'Leitores interessados no tema',
      topic: ideaDescription.trim() || finalTitle,
      kdpBookType: selectedBookType,
      pipelineStage: 'idle',
      pipelineProgress: 0,
      pipelineLog: [`Projeto "${finalTitle}" iniciado no Book Studio em ${new Date().toLocaleDateString()}.`],
      tasks: [],
      notes: '',
      competitorsAsins: []
    };

    onCreateProject(newProject, autoStages);
  };

  const { targetWords } = calculateTargetWordsForPages(estimatedPages, trimSize);

  return (
    <div className="wizard-full-page">
      <div className="wizard-card-modal">
        {/* HEADER DO WIZARD COM PASSOS */}
        <div className="wizard-header">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary-accent" />
            <h2 className="wizard-title">Criar Novo Livro no Book Studio</h2>
          </div>

          <div className="wizard-stepper">
            {[1, 2, 3, 4].map((stepNum) => (
              <div 
                key={stepNum} 
                className={`wizard-step-bubble ${currentStep === stepNum ? 'active' : currentStep > stepNum ? 'completed' : ''}`}
              >
                <span>{stepNum}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CORPO DO WIZARD CONFORME O PASSO */}
        <div className="wizard-body">
          {/* PASSO 1: TIPO DE LIVRO */}
          {currentStep === 1 && (
            <div className="wizard-step-pane">
              <div className="step-intro">
                <h3 className="step-heading">Etapa 1: Qual é a categoria da sua obra?</h3>
                <p className="step-subheading">
                  Selecione o formato ideal para calibrar a estrutura de capítulos, densidade de texto e regras de publicação da Amazon KDP.
                </p>
              </div>

              <div className="book-types-catalog-grid">
                {BOOK_CATEGORIES_CATALOG.map((item) => {
                  const isSelected = selectedBookType === item.id;
                  return (
                    <div 
                      key={item.id} 
                      className={`book-type-choice-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectBookType(item.id)}
                    >
                      <div className="choice-header">
                        <span className="choice-badge">{item.category}</span>
                        {isSelected && <Check size={16} className="text-primary-accent" />}
                      </div>
                      <h4 className="choice-title">{item.title}</h4>
                      <p className="choice-desc">{item.desc}</p>
                      <div className="choice-specs">
                        <span>Padrão: {item.defaultTrim}</span>
                        <span>• ~{item.defaultPages} págs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASSO 2: INFORMAÇÕES DA OBRA */}
          {currentStep === 2 && (
            <div className="wizard-step-pane">
              <div className="step-intro">
                <h3 className="step-heading">Etapa 2: Informações e Ideia da Obra</h3>
                <p className="step-subheading">
                  Preencha os detalhes centrais ou utilize o consultor de IA para analisar sua ideia de livro.
                </p>
              </div>

              <div className="wizard-form-two-cols">
                <div className="form-left-col">
                  <div className="form-group-field">
                    <label>Título Provisório do Livro *</label>
                    <input 
                      type="text" 
                      className="input-text-standard"
                      placeholder="Ex: O Código da Alta Produtividade"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group-field">
                    <label>Subtítulo (Opcional)</label>
                    <input 
                      type="text" 
                      className="input-text-standard"
                      placeholder="Ex: Estratégias Práticas para Multiplicar seus Resultados"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group-field">
                      <label>Nome do Autor</label>
                      <input 
                        type="text" 
                        className="input-text-standard"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                      />
                    </div>
                    <div className="form-group-field">
                      <label>Idioma</label>
                      <select 
                        className="select-standard"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        <option value="Português">Português (Brasil)</option>
                        <option value="Inglês">Inglês (English)</option>
                        <option value="Espanhol">Espanhol (Español)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group-field">
                      <label>Público-Alvo</label>
                      <input 
                        type="text" 
                        className="input-text-standard"
                        placeholder="Ex: Jovens profissionais, empreendedores..."
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                      />
                    </div>
                    <div className="form-group-field">
                      <label>Faixa Etária</label>
                      <select 
                        className="select-standard"
                        value={ageRange}
                        onChange={(e) => setAgeRange(e.target.value)}
                      >
                        <option value="Infantil (4 a 8 anos)">Infantil (4 a 8 anos)</option>
                        <option value="Infantojuvenil (9 a 12 anos)">Infantojuvenil (9 a 12 anos)</option>
                        <option value="Jovem Adulto (13 a 17 anos)">Jovem Adulto (13 a 17 anos)</option>
                        <option value="Adulto (18+)">Adulto (18+)</option>
                        <option value="Livre / Todas as idades">Livre / Todas as idades</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-right-col">
                  <div className="form-group-field">
                    <div className="flex justify-between items-center mb-1">
                      <label>Descrição da Ideia / Sinopse Inicial *</label>
                      <button 
                        type="button"
                        className="btn-ai-assist-inline"
                        onClick={handleAnalyzeIdeaWithAi}
                        disabled={isAnalyzingIdea || !ideaDescription.trim()}
                      >
                        <Wand2 size={13} />
                        {isAnalyzingIdea ? 'Analisando...' : 'Analisar c/ IA'}
                      </button>
                    </div>
                    <textarea 
                      rows={8}
                      className="textarea-standard"
                      placeholder="Descreva sobre o que é o livro, o conflito principal ou a transformação que o leitor irá obter..."
                      value={ideaDescription}
                      onChange={(e) => setIdeaDescription(e.target.value)}
                    />
                    <span className="field-subnote">
                      Dica: Você pode colar apenas uma frase ou um parágrafo. A IA do Book Studio enriquecerá o conceito.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 3: CONFIGURAÇÃO KDP */}
          {currentStep === 3 && (
            <div className="wizard-step-pane">
              <div className="step-intro">
                <h3 className="step-heading">Etapa 3: Especificações Editoriais KDP</h3>
                <p className="step-subheading">
                  Dimensões de corte, papel, estimativa de páginas e tom narrativo da publicação.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="form-group-field">
                    <label>Formato de Impressão (Trim Size)</label>
                    <select 
                      className="select-standard"
                      value={trimSize}
                      onChange={(e) => setTrimSize(e.target.value as TrimSize)}
                    >
                      <option value="6x9">6" x 9" (Tamanho padrão de maior sucesso KDP)</option>
                      <option value="5.5x8.5">5.5" x 8.5" (Trade Paperback tradicional)</option>
                      <option value="5x8">5" x 8" (Compacto romance / bolso)</option>
                      <option value="5.25x8">5.25" x 8" (Literatura ficcional)</option>
                      <option value="7x10">7" x 10" (Didáticos e manuais técnicos)</option>
                      <option value="8x10">8" x 10" (Livro didático / Apostilas)</option>
                      <option value="8.5x11">8.5" x 11" (Workbook / Coloring Book)</option>
                      <option value="8.5x8.5">8.5" x 8.5" (Quadrado para livros infantis)</option>
                    </select>
                  </div>

                  <div className="form-group-field">
                    <label>Tipo de Papel Interior</label>
                    <div className="paper-choices-row">
                      <button 
                        type="button"
                        className={`paper-choice-pill ${paperType === 'bw-white' ? 'active' : ''}`}
                        onClick={() => setPaperType('bw-white')}
                      >
                        Branco Padrão (Não-Ficção / Guias)
                      </button>
                      <button 
                        type="button"
                        className={`paper-choice-pill ${paperType === 'bw-cream' ? 'active' : ''}`}
                        onClick={() => setPaperType('bw-cream')}
                      >
                        Creme Suave (Romances / Ficção)
                      </button>
                      <button 
                        type="button"
                        className={`paper-choice-pill ${paperType === 'color' ? 'active' : ''}`}
                        onClick={() => setPaperType('color')}
                      >
                        Colorido Premium (Infantis)
                      </button>
                    </div>
                  </div>

                  <div className="form-group-field">
                    <label>Tom Narrativo da Obra</label>
                    <input 
                      type="text" 
                      className="input-text-standard"
                      value={narrativeTone}
                      placeholder="Ex: Motivacional, sombrio, bem-humorado, acadêmico..."
                      onChange={(e) => setNarrativeTone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-surface-elevated p-4 rounded-xl border border-border-subtle">
                  <h4 className="text-sm font-semibold mb-3">Métricas Estimadas de Publicação</h4>

                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="text-xs text-muted block">Meta de Páginas</span>
                      <span className="text-xl font-bold">{estimatedPages} págs</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">Capítulos Planejados</span>
                      <span className="text-xl font-bold">{chapterCount}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">Volume Estimado</span>
                      <span className="text-xl font-bold text-primary-accent">{targetWords.toLocaleString()} palavras</span>
                    </div>
                  </div>

                  <div className="form-group-field">
                    <label>Ajustar Páginas Estimadas ({estimatedPages}):</label>
                    <input 
                      type="range" 
                      min="24" 
                      max="450" 
                      step="4"
                      value={estimatedPages}
                      onChange={(e) => setEstimatedPages(parseInt(e.target.value) || 160)}
                    />
                  </div>

                  <div className="form-group-field">
                    <label>Ajustar Número de Capítulos ({chapterCount}):</label>
                    <input 
                      type="range" 
                      min="3" 
                      max="32" 
                      step="1"
                      value={chapterCount}
                      onChange={(e) => setChapterCount(parseInt(e.target.value) || 12)}
                    />
                  </div>

                  <div className="form-group-field">
                    <label>Nível de Profundidade</label>
                    <select 
                      className="select-standard"
                      value={depthLevel}
                      onChange={(e) => setDepthLevel(e.target.value)}
                    >
                      <option value="Direto e Rápido (Kindle Short)">Direto e Rápido (Kindle Short)</option>
                      <option value="Equilibrado (Direto e Aprofundado)">Equilibrado (Direto e Aprofundado)</option>
                      <option value="Denso e Completo (Obra de Referência)">Denso e Completo (Obra de Referência)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 4: AUTONOMIA DA IA */}
          {currentStep === 4 && (
            <div className="wizard-step-pane">
              <div className="step-intro">
                <h3 className="step-heading">Etapa 4: Assistência e Pipeline Autônomo da IA</h3>
                <p className="step-subheading">
                  Você pode gerar o <strong>livro inteiro sozinho com IA</strong> (incluindo capa e ilustrações) e depois modificar, trocar e reescrever qualquer parte.
                </p>
              </div>

              {/* CARD DESTAQUE MODO AUTÔNOMO TOTAL */}
              <div 
                className={`autonomous-mode-hero-card ${autonomousFullBook ? 'active' : ''}`}
                onClick={() => {
                  const next = !autonomousFullBook;
                  setAutonomousFullBook(next);
                  setAutoCreateConcept(true);
                  setAutoCreateOutline(true);
                  setAutoCreateBible(true);
                  setAutoWriteAllChapters(next);
                  setAutoCreateCover(true);
                  setAutoCreateIllustrations(next);
                  setAutoCreateMetadata(true);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="hero-icon-sparkle">
                    <Sparkles size={22} className="text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-primary-accent flex items-center gap-1.5">
                        ⚡ MODO GERAÇÃO TOTALMENTE AUTÔNOMA COM IA
                        <span className="badge-kdp-gold text-[10px]">Recomendado</span>
                      </span>
                      <input 
                        type="checkbox" 
                        checked={autonomousFullBook}
                        onChange={() => {}} // tratado pelo card
                        className="scale-125 accent-amber-500"
                      />
                    </div>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      A IA gerará a <strong>obra completa de ponta a ponta</strong>: Conceito editorial, Sumário, Memória de Personagens, <strong>Redação de Todos os Capítulos</strong>, <strong>Capa Realista com IA</strong> e <strong>Ilustrações para Cada Capítulo</strong>.
                    </p>
                    <p className="text-xs text-secondary mt-1 font-medium">
                      ✏️ <em>Totalmente editável: após a geração, você pode trocar a capa, gerar novas variações de imagens, editar textos e diagramar livremente.</em>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-2">
                  Etapas do Pipeline Autônomo:
                </span>
                
                <div className="automation-checks-grid">
                  <label className="automation-checkbox-card">
                    <input 
                      type="checkbox" 
                      checked={autoCreateConcept}
                      onChange={(e) => setAutoCreateConcept(e.target.checked)}
                    />
                    <div>
                      <span className="font-semibold text-sm block">Criar Conceito & Promessa do Livro</span>
                      <span className="text-xs text-muted">Gera sinopse, diferencial competitivo e gancho de venda.</span>
                    </div>
                  </label>

                  <label className="automation-checkbox-card">
                    <input 
                      type="checkbox" 
                      checked={autoCreateOutline}
                      onChange={(e) => setAutoCreateOutline(e.target.checked)}
                    />
                    <div>
                      <span className="font-semibold text-sm block">Criar Estrutura & Sumário de Capítulos</span>
                      <span className="text-xs text-muted">Gera títulos e objetivos para cada um dos {chapterCount} capítulos.</span>
                    </div>
                  </label>

                  <label className="automation-checkbox-card">
                    <input 
                      type="checkbox" 
                      checked={autoCreateBible}
                      onChange={(e) => setAutoCreateBible(e.target.checked)}
                    />
                    <div>
                      <span className="font-semibold text-sm block">Criar Memória da Obra (Book Bible)</span>
                      <span className="text-xs text-muted">Estrutura personagens, locais e regras do universo para evitar furos.</span>
                    </div>
                  </label>

                  <label className="automation-checkbox-card">
                    <input 
                      type="checkbox" 
                      checked={autoWriteAllChapters}
                      onChange={(e) => setAutoWriteAllChapters(e.target.checked)}
                    />
                    <div>
                      <span className="font-semibold text-sm block">Redigir Todos os Capítulos com IA</span>
                      <span className="text-xs text-muted">Escreve o manuscrito completo mantendo continuidade narrativa.</span>
                    </div>
                  </label>

                  <label className="automation-checkbox-card">
                    <input 
                      type="checkbox" 
                      checked={autoCreateCover}
                      onChange={(e) => setAutoCreateCover(e.target.checked)}
                    />
                    <div>
                      <span className="font-semibold text-sm block">Gerar Arte Realista de Capa (FLUX.1)</span>
                      <span className="text-xs text-muted">Cria arte cinematográfica no tema do livro com cálculo de lombada.</span>
                    </div>
                  </label>

                  <label className="automation-checkbox-card">
                    <input 
                      type="checkbox" 
                      checked={autoCreateIllustrations}
                      onChange={(e) => setAutoCreateIllustrations(e.target.checked)}
                    />
                    <div>
                      <span className="font-semibold text-sm block">Gerar Ilustrações para Cada Capítulo</span>
                      <span className="text-xs text-muted">Gera ilustrações contextuais 300 DPI inseridas nas páginas do livro.</span>
                    </div>
                  </label>

                  <label className="automation-checkbox-card">
                    <input 
                      type="checkbox" 
                      checked={autoCreateMetadata}
                      onChange={(e) => setAutoCreateMetadata(e.target.checked)}
                    />
                    <div>
                      <span className="font-semibold text-sm block">Gerar Metadados KDP & 7 Keywords</span>
                      <span className="text-xs text-muted">Prepara a descrição comercial e tags de busca na Amazon.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="wizard-summary-box mt-5">
                <span className="text-xs text-secondary font-semibold">RESUMO DA OBRA:</span>
                <p className="text-sm">
                  <strong>{title || 'Nova Obra'}</strong> • {selectedBookType} • {trimSize} • {estimatedPages} págs (~{targetWords.toLocaleString()} palavras)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER DE NAVEGAÇÃO ENTRE PASSOS */}
        <div className="wizard-footer">
          <div>
            {currentStep > 1 && (
              <button 
                type="button" 
                className="btn-wizard-back" 
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                <ArrowLeft size={16} /> Voltar
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button type="button" className="btn-subtle" onClick={onCancel}>
              Cancelar
            </button>

            {currentStep < 4 ? (
              <button 
                type="button" 
                className="btn-primary-action"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                Próximo Passo <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                type="button" 
                className="btn-primary-glow"
                onClick={handleFinalizeProject}
              >
                <FolderPlus size={16} /> Criar Livro no Book Studio
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
