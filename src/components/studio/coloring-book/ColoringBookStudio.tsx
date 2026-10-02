import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, Sparkles, Download, Save, RefreshCw, Eye, BookOpen,
  Layers, CheckCircle, AlertCircle, Palette, FileText, Settings,
  ShieldCheck, HelpCircle, X, ExternalLink
} from 'lucide-react';
import { 
  ColoringBookConfig, 
  GeneratedColoringPage, 
  IllustrationStyle, 
  DifficultyLevel, 
  KdpTrimFormat, 
  ColoringAiProvider,
  LineArtMethod 
} from '../../../types/coloring-book';
import { COLORING_THEMES } from '../../../services/coloring-themes-catalog';
import { ColoringBookService } from '../../../services/coloring-book-service';
import '../../../styles/coloring-book-studio.css';

interface Props {
  onBackToDashboard: () => void;
  onOpenProject?: (projectId: string) => void;
}

export const ColoringBookStudio: React.FC<Props> = ({ onBackToDashboard, onOpenProject }) => {
  // Configurações do Livro
  const [config, setConfig] = useState<ColoringBookConfig>({
    title: 'Mandalas Sagradas & Zen',
    subtitle: 'Livro de Colorir para Alívio do Estresse e Foco',
    theme: 'mandalas',
    customThemePrompt: '',
    style: 'adult',
    difficulty: 'medium',
    pageCount: 30,
    trimFormat: '8.5x11',
    hasBleed: false,
    blankPageInterleaving: true,
    includeBelongsToPage: true,
    provider: 'pollinations',
    apiKey: '',
    lineArtMethod: 'enhanced'
  });

  // Estados de Execução e Galeria
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('Pronto para iniciar');
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentDrawingIndex, setCurrentDrawingIndex] = useState(0);
  const [pages, setPages] = useState<GeneratedColoringPage[]>([]);
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [isPdfBuilding, setIsPdfBuilding] = useState(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Modal de Zoom
  const [selectedZoomPage, setSelectedZoomPage] = useState<GeneratedColoringPage | null>(null);

  // Referência para cancelamento se necessário
  const abortControllerRef = useRef<boolean>(false);

  // Inicializa com um tema padrão caso mude no dropdown
  const handleThemeChange = (newThemeId: string) => {
    const selected = COLORING_THEMES.find(t => t.id === newThemeId);
    if (selected) {
      setConfig(prev => ({
        ...prev,
        theme: newThemeId,
        title: selected.name.split(' (')[0],
        subtitle: `Livro de Colorir Especial • ${selected.description.slice(0, 50)}...`
      }));
    } else {
      setConfig(prev => ({ ...prev, theme: newThemeId }));
    }
  };

  // Cálculo de páginas totais no PDF
  const totalBookPages = (() => {
    let count = pages.length > 0 ? pages.length : config.pageCount;
    if (config.blankPageInterleaving) {
      count = count * 2;
    }
    if (config.includeBelongsToPage) {
      count += config.blankPageInterleaving ? 2 : 1;
    }
    return count;
  })();

  // INICIAR GERAÇÃO EM LOTE DO LIVRO
  const handleStartGeneration = async () => {
    setIsGenerating(true);
    abortControllerRef.current = false;
    setProgressPercent(5);
    setCurrentStep('Inicializando motor de ilustrações KDP...');
    setPdfDownloadUrl(null);
    setSavedProjectId(null);

    // Gera lista inicial de placeholders
    const initialPages: GeneratedColoringPage[] = Array.from({ length: config.pageCount }).map((_, idx) => {
      const bookPg = config.includeBelongsToPage 
        ? (config.blankPageInterleaving ? (idx * 2) + 3 : idx + 2)
        : (config.blankPageInterleaving ? (idx * 2) + 1 : idx + 1);

      return {
        id: `page_${idx + 1}_${Date.now()}`,
        pageNumber: idx + 1,
        bookPageNumber: bookPg,
        prompt: ColoringBookService.buildPagePrompt(config, idx),
        imageUrl: '',
        status: 'pending',
        seed: Math.floor(Math.random() * 999999)
      };
    });

    setPages(initialPages);

    // 1. Gera a Capa do Livro em paralelo
    setCurrentStep('Gerando arte de capa KDP em alta definição...');
    try {
      const generatedCover = await ColoringBookService.generateCoverImage(config);
      setCoverUrl(generatedCover);
    } catch (err) {
      console.warn('Erro ao gerar capa:', err);
    }

    // 2. Loop de geração sequencial com proteção de Rate-Limit
    const updatedPages: GeneratedColoringPage[] = [...initialPages];

    for (let i = 0; i < config.pageCount; i++) {
      if (abortControllerRef.current) break;

      setCurrentDrawingIndex(i + 1);
      setCurrentStep(`Gerando página ${i + 1} de ${config.pageCount}: aplicando traços puros...`);
      updatedPages[i].status = 'generating';
      setPages([...updatedPages]);

      try {
        const pagePrompt = ColoringBookService.buildPagePrompt(config, i);
        const imageUrl = await ColoringBookService.generateSinglePageImage(
          pagePrompt,
          config,
          updatedPages[i].seed
        );

        updatedPages[i].imageUrl = imageUrl;
        updatedPages[i].status = 'completed';
        updatedPages[i].qualityPassed = true;
      } catch (err) {
        console.error(`Erro ao gerar página ${i + 1}:`, err);
        updatedPages[i].status = 'failed';
        updatedPages[i].error = String(err);
      }

      const percent = Math.round(((i + 1) / config.pageCount) * 85);
      setProgressPercent(percent);
      setPages([...updatedPages]);

      // Pausa estratégica de 1.2s para evitar limites de requisição
      await new Promise(r => setTimeout(r, 1200));
    }

    // 3. Montagem do PDF para KDP
    setCurrentStep('Compilando PDF Interior em 300 DPI com intercalação em branco...');
    setProgressPercent(92);
    setIsPdfBuilding(true);

    try {
      const completedPages = updatedPages.filter(p => p.status === 'completed' && p.imageUrl);
      const pdfResult = await ColoringBookService.generateKdpPdf(completedPages, config, coverUrl);
      setPdfDownloadUrl(pdfResult.url);
      setProgressPercent(100);
      setCurrentStep('Livro gerado e diagramado com sucesso para o Amazon KDP!');
    } catch (err) {
      console.error('Erro ao compilar PDF:', err);
      setCurrentStep('Erro ao gerar o PDF');
    } finally {
      setIsPdfBuilding(false);
      setIsGenerating(false);
    }
  };

  // REGENERAR PÁGINA INDIVIDUAL
  const handleRegenerateSinglePage = async (pageIdx: number) => {
    if (regeneratingIndex !== null) return;
    setRegeneratingIndex(pageIdx);

    try {
      const targetPage = pages[pageIdx];
      const newSeed = Math.floor(Math.random() * 999999);
      const prompt = ColoringBookService.buildPagePrompt(config, pageIdx);
      
      const newImageUrl = await ColoringBookService.generateSinglePageImage(
        prompt,
        config,
        newSeed
      );

      setPages(prev => {
        const copy = [...prev];
        copy[pageIdx] = {
          ...copy[pageIdx],
          imageUrl: newImageUrl,
          seed: newSeed,
          status: 'completed',
          qualityPassed: true
        };
        return copy;
      });

      // Se já houver PDF gerado, invalida para forçar novo download atualizado
      setPdfDownloadUrl(null);
    } catch (err) {
      console.error('Erro ao regenerar página:', err);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // BAIXAR PDF PRONTO PARA O KDP
  const handleDownloadPdf = async () => {
    if (pdfDownloadUrl) {
      const link = document.createElement('a');
      link.href = pdfDownloadUrl;
      link.download = `${config.title.replace(/\s+/g, '_')}_KDP_Interior.pdf`;
      link.click();
      return;
    }

    // Se ainda não compilou o PDF, compila agora sob demanda
    setIsPdfBuilding(true);
    try {
      const completed = pages.filter(p => p.status === 'completed' && p.imageUrl);
      const res = await ColoringBookService.generateKdpPdf(completed, config, coverUrl);
      setPdfDownloadUrl(res.url);

      const link = document.createElement('a');
      link.href = res.url;
      link.download = `${config.title.replace(/\s+/g, '_')}_KDP_Interior.pdf`;
      link.click();
    } catch (e) {
      alert('Erro ao baixar PDF: ' + e);
    } finally {
      setIsPdfBuilding(false);
    }
  };

  // SALVAR NO PROJETO ATUAL
  const handleSaveToProject = async () => {
    try {
      const completed = pages.filter(p => p.status === 'completed');
      if (completed.length === 0) {
        alert('Gere pelo menos uma página antes de salvar como projeto.');
        return;
      }
      const project = await ColoringBookService.saveToBookProject(config, completed, coverUrl);
      setSavedProjectId(project.id);
      alert(`Projeto "${project.title}" salvo com sucesso no Book Intel KDP!`);
      if (onOpenProject) {
        onOpenProject(project.id);
      }
    } catch (err) {
      alert('Erro ao salvar projeto: ' + err);
    }
  };

  return (
    <div className="cbs-wrapper">
      {/* 1. TOP NAVBAR */}
      <header className="cbs-header">
        <div className="cbs-header-inner">
          <div className="cbs-brand-group">
            <button className="cbs-btn-back" onClick={onBackToDashboard} title="Retornar à Home">
              <ChevronLeft size={16} /> Home
            </button>
            <div className="cbs-brand-title">
              <BookOpen size={20} color="#3b82f6" />
              <span>Gerador de Livros para Colorir</span>
              <span className="cbs-badge-new">Automação KDP</span>
            </div>
          </div>

          <div className="cbs-header-badges">
            <div className="cbs-kdp-pill" title="Padrão KDP 300 DPI com margem anti-sangramento">
              <ShieldCheck size={14} />
              <span>KDP 300 DPI Ready</span>
            </div>
            {config.blankPageInterleaving && (
              <div className="cbs-kdp-pill" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.1)' }}>
                <Layers size={14} />
                <span>Intercalação Anti-Sangramento</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. CORPO PRINCIPAL COM GRID DE CONFIGURAÇÃO E PRÉVIA */}
      <main className="cbs-main">
        <div className="cbs-grid">
          
          {/* COLUNA ESQUERDA: FORMULÁRIO DE CONFIGURAÇÃO */}
          <aside className="cbs-config-card">
            <h2 className="cbs-card-title">
              <Settings size={18} color="#3b82f6" />
              Configurações do Livro
            </h2>
            <p className="cbs-card-subtitle">
              Defina o tema, regras de impressão e motor de IA para criar seu livro de colorir pronto para o KDP.
            </p>

            {/* Título */}
            <div className="cbs-form-group">
              <label className="cbs-label">Título da Obra</label>
              <input
                type="text"
                className="cbs-input"
                value={config.title}
                onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Mandalas Místicas para Relaxar"
              />
            </div>

            {/* Subtítulo */}
            <div className="cbs-form-group">
              <label className="cbs-label">Subtítulo Comercial</label>
              <input
                type="text"
                className="cbs-input"
                value={config.subtitle || ''}
                onChange={e => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Ex: 50 Ilustrações Exclusivas com Traços Limpos"
              />
            </div>

            {/* Tema & Nicho (17 Temas ElliottSax + Custom) */}
            <div className="cbs-form-group">
              <label className="cbs-label">
                <span>Tema & Nicho KDP</span>
                <span style={{ fontSize: 10, color: '#38bdf8' }}>17 Temas Validados</span>
              </label>
              <select
                className="cbs-select"
                value={config.theme}
                onChange={e => handleThemeChange(e.target.value)}
              >
                {COLORING_THEMES.map(theme => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name} ({theme.prompts.length} modelos)
                  </option>
                ))}
                <option value="custom">★ Outro Nicho Personalizado...</option>
              </select>
            </div>

            {/* Campo Customizado caso selecione custom */}
            {config.theme === 'custom' && (
              <div className="cbs-form-group">
                <label className="cbs-label">Prompt do Nicho Personalizado</label>
                <textarea
                  className="cbs-textarea"
                  rows={2}
                  value={config.customThemePrompt || ''}
                  onChange={e => setConfig(prev => ({ ...prev, customThemePrompt: e.target.value }))}
                  placeholder="Ex: cute baby dragons playing in magical gardens, whimsical style"
                />
              </div>
            )}

            {/* Estilo de Ilustração & Dificuldade */}
            <div className="cbs-form-group">
              <label className="cbs-label">Estilo & Dificuldade</label>
              <div className="cbs-segmented-group">
                <button
                  type="button"
                  className={`cbs-seg-btn ${config.style === 'kids' ? 'active' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, style: 'kids' }))}
                >
                  Infantil
                </button>
                <button
                  type="button"
                  className={`cbs-seg-btn ${config.style === 'adult' ? 'active' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, style: 'adult' }))}
                >
                  Adulto
                </button>
                <button
                  type="button"
                  className={`cbs-seg-btn ${config.style === 'detailed' ? 'active' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, style: 'detailed' }))}
                >
                  Detalhado
                </button>
              </div>
            </div>

            {/* Quantidade de Páginas */}
            <div className="cbs-form-group">
              <label className="cbs-label">
                <span>Quantidade de Ilustrações</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{config.pageCount} desenhos</span>
              </label>
              <div className="cbs-segmented-group" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[20, 30, 40, 60].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`cbs-seg-btn ${config.pageCount === n ? 'active' : ''}`}
                    onClick={() => setConfig(prev => ({ ...prev, pageCount: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Formato KDP */}
            <div className="cbs-form-group">
              <label className="cbs-label">Formato Físico (Trim Size)</label>
              <select
                className="cbs-select"
                value={config.trimFormat}
                onChange={e => setConfig(prev => ({ ...prev, trimFormat: e.target.value as KdpTrimFormat }))}
              >
                <option value="8.5x11">8.5 x 11 pol (Padrão Ouro KDP - 21.59 x 27.94 cm)</option>
                <option value="8.25x8.25">8.25 x 8.25 pol (Quadrado Moderno - 20.95 x 20.95 cm)</option>
                <option value="8.5x8.5">8.5 x 8.5 pol (Quadrado Infantil - 21.59 x 21.59 cm)</option>
                <option value="8x10">8 x 10 pol (Trade Paperback - 20.32 x 25.40 cm)</option>
              </select>
            </div>

            {/* INTERCALAÇÃO DE PÁGINAS EM BRANCO (ANTI-SANGRAMENTO) */}
            <div className="cbs-toggle-box">
              <div className="cbs-toggle-info">
                <span className="cbs-toggle-title">Intercalar Páginas em Branco</span>
                <span className="cbs-toggle-desc">
                  Essencial no KDP: deixa o verso de cada desenho vazio para canetinhas não vazarem na folha seguinte.
                </span>
              </div>
              <label className="cbs-switch">
                <input
                  type="checkbox"
                  checked={config.blankPageInterleaving}
                  onChange={e => setConfig(prev => ({ ...prev, blankPageInterleaving: e.target.checked }))}
                />
                <span className="cbs-slider" />
              </label>
            </div>

            {/* FOLHA DE ROSTO: ESTE LIVRO PERTENCE A */}
            <div className="cbs-toggle-box">
              <div className="cbs-toggle-info">
                <span className="cbs-toggle-title">Folha de Rosto ("Pertence a:")</span>
                <span className="cbs-toggle-desc">
                  Inclui página inicial clássica de dedicatória com borda decorativa.
                </span>
              </div>
              <label className="cbs-switch">
                <input
                  type="checkbox"
                  checked={config.includeBelongsToPage}
                  onChange={e => setConfig(prev => ({ ...prev, includeBelongsToPage: e.target.checked }))}
                />
                <span className="cbs-slider" />
              </label>
            </div>

            {/* Provedor de IA */}
            <div className="cbs-form-group">
              <label className="cbs-label">Motor de Geração de Imagem</label>
              <select
                className="cbs-select"
                value={config.provider}
                onChange={e => setConfig(prev => ({ ...prev, provider: e.target.value as ColoringAiProvider }))}
              >
                <option value="pollinations">Pollinations AI (Flux - Grátis, sem API key)</option>
                <option value="openai">OpenAI (DALL-E 3 - Requer API Key)</option>
              </select>
            </div>

            {config.provider === 'openai' && (
              <div className="cbs-form-group">
                <label className="cbs-label">Chave de API OpenAI</label>
                <input
                  type="password"
                  className="cbs-input"
                  value={config.apiKey || ''}
                  onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-..."
                />
              </div>
            )}

            {/* BOTÃO DISPARAR GERAÇÃO */}
            <button
              className="cbs-btn-start"
              disabled={isGenerating}
              onClick={handleStartGeneration}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={16} className="spin-anim" />
                  <span>Gerando ({currentDrawingIndex}/{config.pageCount})...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Gerar Livro de Colorir Completo</span>
                </>
              )}
            </button>
          </aside>

          {/* COLUNA DIREITA: EXECUÇÃO, PRÉVIA & GALERIA */}
          <section className="cbs-preview-area">
            
            {/* STATUS & PROGRESSO EM TEMPO REAL */}
            <div className="cbs-status-card">
              <div className="cbs-status-header">
                <span className="cbs-status-title">
                  {isGenerating ? <RefreshCw size={18} className="spin-anim" color="#3b82f6" /> : <Palette size={18} color="#10b981" />}
                  {currentStep}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>
                  {progressPercent}%
                </span>
              </div>

              <div className="cbs-progress-bar-bg">
                <div className="cbs-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="cbs-progress-meta">
                <span>
                  {pages.filter(p => p.status === 'completed').length} de {config.pageCount} ilustrações geradas
                </span>
                <span>
                  Total no PDF Físico KDP: <b>{totalBookPages} páginas</b>
                </span>
              </div>

              {/* Faixa de Especificações KDP */}
              <div className="cbs-specs-strip">
                <div className="cbs-spec-item">
                  <span className="cbs-spec-label">Resolução KDP</span>
                  <span className="cbs-spec-val">300 DPI</span>
                </div>
                <div className="cbs-spec-item">
                  <span className="cbs-spec-label">Dimensão</span>
                  <span className="cbs-spec-val">{config.trimFormat} pol</span>
                </div>
                <div className="cbs-spec-item">
                  <span className="cbs-spec-label">Intercalação</span>
                  <span className="cbs-spec-val" style={{ color: config.blankPageInterleaving ? '#10b981' : '#94a3b8' }}>
                    {config.blankPageInterleaving ? 'Ativada' : 'Desativada'}
                  </span>
                </div>
                <div className="cbs-spec-item">
                  <span className="cbs-spec-label">Traço</span>
                  <span className="cbs-spec-val">P&B Puro</span>
                </div>
              </div>
            </div>

            {/* BARRA DE AÇÕES (DOWNLOAD PDF & SALVAR PROJETO) */}
            <div className="cbs-action-toolbar">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="cbs-btn-download-pdf"
                  onClick={handleDownloadPdf}
                  disabled={pages.filter(p => p.status === 'completed').length === 0 || isPdfBuilding}
                >
                  {isPdfBuilding ? (
                    <>
                      <RefreshCw size={15} className="spin-anim" /> Formatando PDF...
                    </>
                  ) : (
                    <>
                      <Download size={15} /> Baixar PDF Pronto para o KDP
                    </>
                  )}
                </button>

                {coverUrl && (
                  <a
                    href={coverUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="cbs-btn-save-project"
                    style={{ textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} /> Ver Arte da Capa
                  </a>
                )}
              </div>

              <button
                className="cbs-btn-save-project"
                onClick={handleSaveToProject}
                disabled={pages.filter(p => p.status === 'completed').length === 0}
              >
                <Save size={15} /> Salvar no Projeto Atual
              </button>
            </div>

            {/* GALERIA DE MINIATURAS DAS PÁGINAS GERADAS */}
            <div className="cbs-gallery-grid">
              {pages.map((page, index) => {
                const isRegenerating = regeneratingIndex === index;

                return (
                  <div key={page.id} className="cbs-page-card">
                    {/* Imagem / Placeholder */}
                    <div
                      className="cbs-card-img-wrap"
                      onClick={() => page.imageUrl && setSelectedZoomPage(page)}
                    >
                      {page.imageUrl ? (
                        <img
                          src={page.imageUrl}
                          alt={`Página ${page.pageNumber}`}
                          className="cbs-card-img"
                          loading="lazy"
                        />
                      ) : (
                        <div style={{ textAlign: 'center', padding: 16 }}>
                          {page.status === 'generating' ? (
                            <RefreshCw size={26} className="spin-anim" color="#3b82f6" />
                          ) : (
                            <Palette size={26} color="#64748b" />
                          )}
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                            {page.status === 'generating' ? 'Desenhando...' : 'Aguardando fila...'}
                          </div>
                        </div>
                      )}

                      <span className="cbs-page-badge">
                        Pág. {page.bookPageNumber}
                      </span>

                      {page.status === 'completed' && (
                        <span className="cbs-page-status-badge completed">
                          Pronto
                        </span>
                      )}
                    </div>

                    {/* Rodapé do Card da Página */}
                    <div className="cbs-page-body">
                      <div className="cbs-page-desc" title={page.prompt}>
                        {page.prompt}
                      </div>

                      <div className="cbs-page-footer">
                        <span className="cbs-interleaving-pill">
                          <Layers size={11} /> Verso em branco
                        </span>

                        <button
                          className="cbs-btn-regen"
                          onClick={() => handleRegenerateSinglePage(index)}
                          disabled={isRegenerating || isGenerating}
                          title="Gerar uma nova variação deste desenho"
                        >
                          <RefreshCw size={12} className={isRegenerating ? 'spin-anim' : ''} />
                          {isRegenerating ? 'Gerando...' : 'Regenerar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ESTADO INICIAL VAZIO */}
            {pages.length === 0 && !isGenerating && (
              <div style={{
                background: 'rgba(19, 27, 46, 0.7)',
                border: '1px dashed #334155',
                borderRadius: 16,
                padding: '60px 24px',
                textAlign: 'center'
              }}>
                <Palette size={48} color="#3b82f6" style={{ margin: '0 auto 16px auto', display: 'block' }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#f8fafc' }}>
                  Nenhum livro de colorir gerado nesta sessão
                </h3>
                <p style={{ margin: '0 auto 20px auto', fontSize: 13, color: '#94a3b8', maxWidth: 440 }}>
                  Selecione o tema na barra lateral esquerda e clique em <b>"Gerar Livro de Colorir Completo"</b> para criar as páginas em alta resolução e o PDF formatado para o Amazon KDP.
                </p>
                <button className="cbs-btn-start" style={{ width: 'auto', display: 'inline-flex' }} onClick={handleStartGeneration}>
                  <Sparkles size={16} /> Começar Geração
                </button>
              </div>
            )}

          </section>

        </div>
      </main>

      {/* MODAL DE ZOOM NA PÁGINA */}
      {selectedZoomPage && (
        <div className="cbs-modal-overlay" onClick={() => setSelectedZoomPage(null)}>
          <div className="cbs-modal-card" onClick={e => e.stopPropagation()}>
            <div className="cbs-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                  Ilustração #{selectedZoomPage.pageNumber} • Página {selectedZoomPage.bookPageNumber} no KDP
                </span>
                <span className="cbs-badge-new">300 DPI</span>
              </div>
              <button
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => setSelectedZoomPage(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="cbs-modal-content">
              <img
                src={selectedZoomPage.imageUrl}
                alt="Zoom"
                className="cbs-modal-img"
              />
              <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', maxWidth: 600 }}>
                <b>Prompt Utilizado:</b> {selectedZoomPage.prompt}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
