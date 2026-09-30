import React, { useState } from 'react';
import { 
  Upload, 
  Sparkles, 
  Trash2, 
  Image as ImageIcon, 
  Check, 
  Eye, 
  Wand2,
  RefreshCw,
  Download,
  BookOpen,
  Palette,
  Layers,
  Filter,
  ArrowRight,
  Sliders,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { BookProject, BookImageItem, IBookChapter } from '../../types/book-project';
import { 
  ImageGenerationService, 
  ART_STYLE_PRESETS, 
  ArtStyleOption 
} from '../../services/image-generation-service';
import { PageEngine } from '../../services/page-engine';

interface ImageLibraryViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  onInsertIntoPage?: (imageId: string, pageNumber: number) => void;
  onNavigateToEditor?: (chapterIndex?: number) => void;
}

type FilterCategory = 'all' | 'chapters' | 'cover' | 'uploads';

export const ImageLibraryView: React.FC<ImageLibraryViewProps> = ({
  project,
  onUpdateProject,
  onInsertIntoPage,
  onNavigateToEditor
}) => {
  const [images, setImages] = useState<BookImageItem[]>(project.images || []);
  const [selectedImage, setSelectedImage] = useState<BookImageItem | null>(null);
  
  // Controles de Geração de IA
  const [selectedStyle, setSelectedStyle] = useState<ArtStyleOption>('realistic-photo');
  const [targetChapterIdx, setTargetChapterIdx] = useState<number | 'cover' | 'free'>('cover');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<string>('');
  const [variationSeed, setVariationSeed] = useState<number>(() => Math.floor(Math.random() * 899999) + 100000);
  const [filterCat, setFilterCat] = useState<FilterCategory>('all');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Estados dos Motores de IA (ComfyUI / Black Forest Labs FLUX / Nuvem)
  const [selectedEngine, setSelectedEngine] = useState<'cloud-flux' | 'comfyui' | 'flux-local' | 'auto'>('auto');
  const [comfyStatus, setComfyStatus] = useState<{ online: boolean; gpuName?: string; vramFreeGb?: number; checked: boolean }>({ online: false, checked: false });
  const [fluxLocalStatus, setFluxLocalStatus] = useState<{ online: boolean; model?: string; checked: boolean }>({ online: false, checked: false });
  const [isCheckingEngines, setIsCheckingEngines] = useState<boolean>(false);
  const [engineMessage, setEngineMessage] = useState<string>('');

  const chapters = project.kdpChapters || [];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Testa conexão com os motores locais na máquina
  const handleCheckLocalEngines = async () => {
    setIsCheckingEngines(true);
    setEngineMessage('Verificando portas locais (8188 ComfyUI e 8080 FLUX)...');
    try {
      const [comfy, flux] = await Promise.all([
        ImageGenerationService.checkComfyUIStatus(),
        ImageGenerationService.checkFluxLocalStatus()
      ]);
      setComfyStatus({ ...comfy, checked: true });
      setFluxLocalStatus({ ...flux, checked: true });

      if (comfy.online && flux.online) {
        setEngineMessage(`🟢 Motores locais detectados! ComfyUI (${comfy.gpuName || 'GPU'}) e FLUX Local ativos.`);
      } else if (comfy.online) {
        setEngineMessage(`🟢 ComfyUI Local detectado na porta 8188 (${comfy.gpuName || 'GPU'})! Pronto para gerar offline.`);
      } else if (flux.online) {
        setEngineMessage(`🟢 FLUX Local detectado na porta 8080! Pronto para gerar offline.`);
      } else {
        setEngineMessage(`ℹ️ Motores locais offline. O motor FLUX.1 Neural Cloud (Instantâneo) está pronto para uso imediato.`);
      }
    } finally {
      setIsCheckingEngines(false);
    }
  };

  // Sugerir prompt contextualizado automaticamente com base no capítulo ou capa
  const handleAutoSuggestPrompt = () => {
    if (targetChapterIdx === 'cover') {
      const suggested = ImageGenerationService.buildCoverPrompt(project, selectedStyle, '', variationSeed);
      setAiPrompt(suggested);
      showToast('Prompt profissional para Capa KDP gerado!');
    } else if (typeof targetChapterIdx === 'number') {
      const ch = chapters.find(c => c.index === targetChapterIdx);
      if (ch) {
        const suggested = ImageGenerationService.buildChapterPrompt(ch, project, selectedStyle, variationSeed);
        setAiPrompt(suggested);
        showToast(`Prompt contextualizado para o Capítulo ${ch.index} gerado!`);
      }
    } else {
      const topic = project.topic || project.title || 'livro profissional';
      setAiPrompt(`Cena editorial dramática e realista representando ${topic}, composição de cinema`);
      showToast('Prompt sugerido baseado no tema da obra!');
    }
  };

  // Gerar Arte Realista com IA (Híbrido: FLUX.1 / ComfyUI Local)
  const handleGenerateRealisticArt = async (overrideSeed?: number) => {
    setIsGeneratingAi(true);
    const seed = overrideSeed !== undefined ? overrideSeed : variationSeed;

    try {
      let finalPrompt = aiPrompt.trim();
      let chIndex: number | undefined = undefined;
      let imgName = '';

      if (targetChapterIdx === 'cover') {
        if (!finalPrompt) {
          finalPrompt = ImageGenerationService.buildCoverPrompt(project, selectedStyle, '', seed);
        }
        imgName = `Capa: ${project.title.slice(0, 25)}`;
      } else if (typeof targetChapterIdx === 'number') {
        const ch = chapters.find(c => c.index === targetChapterIdx);
        if (!finalPrompt && ch) {
          finalPrompt = ImageGenerationService.buildChapterPrompt(ch, project, selectedStyle, seed);
        }
        chIndex = targetChapterIdx;
        imgName = `Capítulo ${targetChapterIdx}: ${ch ? ch.title.slice(0, 25) : 'Cena'}`;
      } else {
        if (!finalPrompt) {
          finalPrompt = `Editorial scene representing ${project.title}, atmospheric lighting, photorealistic 8k`;
        }
        imgName = `Ilustração: ${finalPrompt.slice(0, 25)}`;
      }

      const width = targetChapterIdx === 'cover' ? 1200 : 1024;
      const height = targetChapterIdx === 'cover' ? 1800 : 1024;

      const smartRes = await ImageGenerationService.generateSmartImage({
        prompt: finalPrompt,
        style: selectedStyle,
        width,
        height,
        seed,
        preferredEngine: selectedEngine,
        onProgress: (msg) => showToast(msg)
      });

      const newImage: BookImageItem = {
        id: `img_ai_${Date.now()}_${seed}`,
        name: imgName,
        dataUrl: smartRes.dataUrl,
        source: 'ai-generated',
        prompt: smartRes.prompt,
        chapterIndex: chIndex,
        createdAt: Date.now()
      };

      const updatedImages = [newImage, ...images];
      setImages(updatedImages);

      let updatedProject: BookProject = {
        ...project,
        images: updatedImages
      };

      // Se for capa, atualiza também a capa do livro
      if (targetChapterIdx === 'cover') {
        updatedProject.coverImageUrl = smartRes.dataUrl;
      }

      // Se for capítulo, regenera páginas para inserir a arte visualmente
      if (chIndex !== undefined) {
        updatedProject.visualPages = PageEngine.generateVisualPagesFromManuscript(updatedProject);
      }

      onUpdateProject(updatedProject);
      setSelectedImage(newImage);
      setVariationSeed(Math.floor(Math.random() * 899999) + 100000);
      showToast('✨ Nova ilustração realista gerada com sucesso pelo motor FLUX.1!');
    } catch (err: any) {
      alert(`Erro ao gerar imagem: ${err.message || err}`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Gerar Nova Variação da Imagem Atual
  const handleRegenerateVariation = (basePrompt?: string, chIdx?: number) => {
    const nextSeed = Math.floor(Math.random() * 899999) + 100000;
    setVariationSeed(nextSeed);
    if (basePrompt) {
      setAiPrompt(basePrompt);
    }
    if (chIdx !== undefined) {
      setTargetChapterIdx(chIdx);
    }
    handleGenerateRealisticArt(nextSeed);
  };

  // Gerar Ilustrações Realistas para TODOS os Capítulos com 1 Clique
  const handleBatchGenerateAllChapters = async () => {
    if (chapters.length === 0) {
      alert('Nenhum capítulo encontrado no projeto. Crie ou estruture capítulos primeiro no Planejamento.');
      return;
    }

    setIsBatchGenerating(true);
    setBatchProgress(`Gerando capa e ilustrações para ${chapters.length} capítulos com IA...`);

    try {
      const generated = ImageGenerationService.generateInitialIllustrationsForProject(project, selectedStyle);

      // Mescla com imagens existentes sem duplicar IDs
      const existingIds = new Set(images.map(i => i.id));
      const newOnly = generated.filter(g => !existingIds.has(g.id));
      const updatedList = [...newOnly, ...images];

      setImages(updatedList);

      // Atualiza projeto e páginas visuais para incorporar imediatamente as artes nos cabeçalhos de capítulos
      let updatedProject: BookProject = {
        ...project,
        images: updatedList,
        coverImageUrl: generated[0]?.dataUrl || project.coverImageUrl
      };
      updatedProject.visualPages = PageEngine.generateVisualPagesFromManuscript(updatedProject);

      onUpdateProject(updatedProject);
      showToast(`✨ Sucesso! ${generated.length} ilustrações profissionais geradas e inseridas no livro!`);
    } catch (err: any) {
      alert(`Falha na geração em lote: ${err.message || err}`);
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress('');
    }
  };

  // Upload local de imagem
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newImg: BookImageItem = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        dataUrl,
        source: 'upload',
        createdAt: Date.now()
      };

      const updated = [newImg, ...images];
      setImages(updated);
      onUpdateProject({ ...project, images: updated });
      showToast('Imagem carregada com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  // Vincular imagem a um capítulo específico
  const handleAssignToChapter = (img: BookImageItem, chIdx: number) => {
    const updated = images.map(i => i.id === img.id ? { ...i, chapterIndex: chIdx } : i);
    setImages(updated);

    let updatedProject: BookProject = {
      ...project,
      images: updated
    };
    updatedProject.visualPages = PageEngine.generateVisualPagesFromManuscript(updatedProject);
    onUpdateProject(updatedProject);
    showToast(`Ilustração vinculada ao Capítulo ${chIdx} com sucesso!`);
  };

  // Definir imagem como capa principal
  const handleSetAsCover = (img: BookImageItem) => {
    const updatedProject: BookProject = {
      ...project,
      coverImageUrl: img.dataUrl
    };
    onUpdateProject(updatedProject);
    showToast('Imagem definida como Capa Principal do Livro!');
  };

  // Excluir imagem
  const handleDeleteImage = (imgId: string) => {
    const updated = images.filter(i => i.id !== imgId);
    setImages(updated);
    if (selectedImage?.id === imgId) setSelectedImage(null);

    let updatedProject: BookProject = {
      ...project,
      images: updated
    };
    updatedProject.visualPages = PageEngine.generateVisualPagesFromManuscript(updatedProject);
    onUpdateProject(updatedProject);
    showToast('Imagem removida.');
  };

  // Download da imagem HD
  const handleDownloadHd = (img: BookImageItem) => {
    const link = document.createElement('a');
    link.href = img.dataUrl;
    link.download = `${img.name || 'ilustracao_kdp'}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Download iniciado!');
  };

  // Filtro de exibição
  const filteredImages = images.filter(img => {
    if (filterCat === 'chapters') return img.chapterIndex !== undefined;
    if (filterCat === 'cover') return img.id.includes('cover') || img.dataUrl === project.coverImageUrl;
    if (filterCat === 'uploads') return img.source === 'upload';
    return true;
  });

  return (
    <div className="image-library-container">
      {/* TOAST NOTIFICAÇÃO */}
      {toastMessage && (
        <div className="studio-toast-banner">
          <Sparkles size={16} className="text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER DA BIBLIOTECA COM AÇÕES RÁPIDAS */}
      <div className="library-top-bar">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold">Estúdio de Ilustrações & Imagens com IA</h3>
            <span className="badge-kdp-gold">FLUX.1 8K Realista</span>
          </div>
          <p className="text-xs text-muted mt-1">
            Gere ilustrações hiper-realistas, renders 3D e artes de capa no contexto exato de cada capítulo da obra <strong>{project.title}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* BOTÃO 1-CLIQUE PARA TODOS OS CAPÍTULOS */}
          <button 
            className="btn-batch-generate-all"
            onClick={handleBatchGenerateAllChapters}
            disabled={isBatchGenerating || isGeneratingAi}
            title="Gera ilustrações contextuais automáticas para a capa e todos os capítulos com 1 clique"
          >
            <Sparkles size={15} className="text-amber-300" />
            {isBatchGenerating ? batchProgress : '✨ Gerar Artes para Todos os Capítulos (1 Clique)'}
          </button>

          <label className="btn-upload-secondary cursor-pointer">
            <Upload size={14} /> Upload Local
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {/* PAINEL DE GERAÇÃO COM IA REALISTA */}
      <div className="ai-art-generator-studio-card">
        <div className="generator-card-header">
          <div className="flex items-center gap-2">
            <Wand2 size={18} className="text-amber-400" />
            <span className="font-bold text-sm">Motor de Geração de Imagens Realistas & Artísticas</span>
          </div>
          <span className="text-xs text-muted">Zero texto chapado • Imagens cinematográficas com continuidade de estilo</span>
        </div>

        {/* SELETOR DE MOTOR DE IA: COMFYUI LOCAL / FLUX LOCAL / NUVEM */}
        <div className="engine-selector-box mb-4 p-3 bg-slate-900/90 rounded-xl border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-blue-400" />
              <span className="text-xs font-bold text-white">Motor de Geração de Imagem:</span>
            </div>

            <button
              type="button"
              onClick={handleCheckLocalEngines}
              disabled={isCheckingEngines}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-colors"
              title="Testar se o ComfyUI ou FLUX estão rodando no seu computador"
            >
              <RefreshCw size={11} className={isCheckingEngines ? 'animate-spin' : ''} />
              <span>{isCheckingEngines ? 'Testando Conexões...' : 'Testar Motores Locais (GPU)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {/* OPÇÃO 0: AUTO */}
            <button
              type="button"
              onClick={() => setSelectedEngine('auto')}
              className={`p-2.5 rounded-lg border text-left transition-all ${selectedEngine === 'auto' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'}`}
            >
              <div className="flex items-center justify-between font-semibold text-xs">
                <span>🔄 Automático</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">Recomendado</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Usa GPU local se ativo; senão, usa FLUX Nuvem.</p>
            </button>

            {/* OPÇÃO 1: FLUX.1 NEURAL CLOUD */}
            <button
              type="button"
              onClick={() => setSelectedEngine('cloud-flux')}
              className={`p-2.5 rounded-lg border text-left transition-all ${selectedEngine === 'cloud-flux' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'}`}
            >
              <div className="flex items-center justify-between font-semibold text-xs">
                <span>☁️ FLUX.1 Nuvem</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Ativo</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Instantâneo, 0 consumo de GPU local, 8K ultra nítido.</p>
            </button>

            {/* OPÇÃO 2: COMFYUI LOCAL */}
            <button
              type="button"
              onClick={() => setSelectedEngine('comfyui')}
              className={`p-2.5 rounded-lg border text-left transition-all ${selectedEngine === 'comfyui' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'}`}
            >
              <div className="flex items-center justify-between font-semibold text-xs">
                <span>🖥️ ComfyUI (8188)</span>
                {comfyStatus.checked && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${comfyStatus.online ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {comfyStatus.online ? 'Online' : 'Offline'}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">100% offline no seu PC, ilimitado, SDXL e FLUX GGUF.</p>
            </button>

            {/* OPÇÃO 3: FLUX LOCAL NATIVO */}
            <button
              type="button"
              onClick={() => setSelectedEngine('flux-local')}
              className={`p-2.5 rounded-lg border text-left transition-all ${selectedEngine === 'flux-local' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'}`}
            >
              <div className="flex items-center justify-between font-semibold text-xs">
                <span>⚡ FLUX Local (8080)</span>
                {fluxLocalStatus.checked && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${fluxLocalStatus.online ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {fluxLocalStatus.online ? 'Online' : 'Offline'}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Servidor nativo Black Forest Labs FLUX.1.</p>
            </button>
          </div>

          {engineMessage && (
            <p className="text-[11px] text-slate-300 mt-2 px-1">{engineMessage}</p>
          )}
        </div>

        {/* SELETOR DE ESTILO ARTÍSTICO */}
        <div className="style-selector-row">
          <label className="text-xs font-semibold text-secondary flex items-center gap-1">
            <Palette size={13} /> Estilo Visual:
          </label>
          <div className="style-chips-scroll">
            {ART_STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`style-chip-button ${selectedStyle === preset.id ? 'active' : ''}`}
                onClick={() => setSelectedStyle(preset.id)}
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* LINHA DE CONTROLES: DESTINO, PROMPT E AÇÕES */}
        <div className="generator-controls-grid">
          {/* SELETOR DE DESTINO (CAPÍTULO OU CAPA) */}
          <div className="form-group-compact">
            <label className="text-xs text-muted font-medium">Destino da Arte:</label>
            <select
              className="select-field-compact"
              value={targetChapterIdx}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'cover') setTargetChapterIdx('cover');
                else if (val === 'free') setTargetChapterIdx('free');
                else setTargetChapterIdx(parseInt(val, 10));
              }}
            >
              <option value="cover">🎨 Capa Principal do Livro</option>
              {chapters.map((ch, idx) => (
                <option key={ch.index || idx + 1} value={ch.index || idx + 1}>
                  📖 Capítulo {ch.index || idx + 1}: {ch.title.slice(0, 30)}
                </option>
              ))}
              <option value="free">🖼️ Ilustração Avulsa / Biblioteca</option>
            </select>
          </div>

          {/* INPUT DO PROMPT */}
          <div className="form-group-prompt">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-muted font-medium">Descrição Visual da Cena (Prompt):</label>
              <button
                type="button"
                className="btn-text-magic"
                onClick={handleAutoSuggestPrompt}
                title="Cria um prompt profissional automaticamente lendo o tema do livro e o capítulo"
              >
                <Sparkles size={12} className="text-amber-400" /> Sugerir Cena com IA
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-text-standard flex-1"
                placeholder={
                  targetChapterIdx === 'cover' 
                    ? `Ex: Visual dramático, arquitetura moderna ao nascer do sol, raios dourados, tema ${project.topic || project.title}...`
                    : `Descreva a cena visual do capítulo ou clique em 'Sugerir Cena com IA' para gerar automaticamente...`
                }
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              
              {/* BOTÃO GERAR */}
              <button
                className="btn-primary-generate"
                onClick={() => handleGenerateRealisticArt()}
                disabled={isGeneratingAi || isBatchGenerating}
              >
                {isGeneratingAi ? (
                  <>
                    <RefreshCw size={14} className="spin-animate" />
                    Gerando Arte...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Gerar Arte Realista
                  </>
                )}
              </button>

              {/* BOTÃO NOVA VARIAÇÃO */}
              <button
                className="btn-variation-cycle"
                onClick={() => handleRegenerateVariation(aiPrompt, typeof targetChapterIdx === 'number' ? targetChapterIdx : undefined)}
                disabled={isGeneratingAi || isBatchGenerating}
                title="Gera uma nova variação da cena com outro ângulo e iluminação mantendo o estilo"
              >
                <RefreshCw size={14} />
                Nova Variação (↻)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS E CONTAGEM */}
      <div className="library-filter-bar">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted" />
          <span className="text-xs font-semibold text-secondary">Filtrar:</span>
          <div className="filter-pills-group">
            <button 
              className={`filter-pill ${filterCat === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCat('all')}
            >
              Todas ({images.length})
            </button>
            <button 
              className={`filter-pill ${filterCat === 'chapters' ? 'active' : ''}`}
              onClick={() => setFilterCat('chapters')}
            >
              Capítulos ({images.filter(i => i.chapterIndex !== undefined).length})
            </button>
            <button 
              className={`filter-pill ${filterCat === 'cover' ? 'active' : ''}`}
              onClick={() => setFilterCat('cover')}
            >
              Capas
            </button>
            <button 
              className={`filter-pill ${filterCat === 'uploads' ? 'active' : ''}`}
              onClick={() => setFilterCat('uploads')}
            >
              Uploads ({images.filter(i => i.source === 'upload').length})
            </button>
          </div>
        </div>

        {onNavigateToEditor && (
          <button 
            className="btn-link-action"
            onClick={() => onNavigateToEditor()}
          >
            <BookOpen size={14} /> Ver no Editor Visual de Páginas <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* GRID DE IMAGENS */}
      <div className="library-images-grid">
        {filteredImages.length > 0 ? (
          filteredImages.map((img) => (
            <div 
              key={img.id} 
              className={`image-card-premium ${selectedImage?.id === img.id ? 'selected' : ''}`}
              onClick={() => setSelectedImage(img)}
            >
              <div className="image-card-thumb-wrap">
                <img 
                  src={img.dataUrl} 
                  alt={img.name} 
                  className="image-card-thumb" 
                  loading="lazy"
                />
                
                {/* BADGE DE DESTINO */}
                {img.chapterIndex !== undefined ? (
                  <span className="image-chapter-badge">Capítulo {img.chapterIndex}</span>
                ) : img.dataUrl === project.coverImageUrl ? (
                  <span className="image-cover-badge">Capa Ativa</span>
                ) : (
                  <span className="image-source-badge">{img.source === 'upload' ? 'Upload' : 'IA FLUX'}</span>
                )}

                {/* OVERLAY DE AÇÕES RÁPIDAS NO HOVER */}
                <div className="image-hover-actions">
                  <button 
                    className="btn-hover-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(img);
                    }}
                    title="Visualizar em Tela Cheia"
                  >
                    <Eye size={14} />
                  </button>
                  <button 
                    className="btn-hover-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRegenerateVariation(img.prompt, img.chapterIndex);
                    }}
                    title="Gerar Nova Variação com IA"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button 
                    className="btn-hover-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadHd(img);
                    }}
                    title="Baixar em Alta Definição (300 DPI)"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>

              {/* RODAPÉ DO CARD */}
              <div className="image-card-info">
                <span className="image-name-text" title={img.name}>{img.name}</span>
                
                <div className="image-card-actions-row">
                  {/* SELETOR RÁPIDO DE CAPÍTULO */}
                  <select
                    className="select-mini-chapter"
                    value={img.chapterIndex !== undefined ? img.chapterIndex : ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) handleAssignToChapter(img, val);
                    }}
                    title="Vincular esta ilustração a um capítulo do livro"
                  >
                    <option value="">+ Vincular a Capítulo</option>
                    {chapters.map(c => (
                      <option key={c.index} value={c.index}>Capítulo {c.index}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      className="btn-icon-subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetAsCover(img);
                      }}
                      title="Usar como Capa Principal"
                    >
                      <Palette size={13} />
                    </button>
                    <button 
                      className="btn-icon-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(img.id);
                      }}
                      title="Excluir Imagem"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="library-empty-state">
            <div className="empty-state-icon-circle">
              <ImageIcon size={36} className="text-muted" />
            </div>
            <h4 className="text-base font-bold mt-3">Nenhuma ilustração nesta categoria</h4>
            <p className="text-xs text-muted max-w-md mt-1">
              Use o botão <strong>"Gerar Artes para Todos os Capítulos"</strong> acima para criar automaticamente ilustrações fotorrealistas para cada capítulo do seu livro, ou gere imagens individuais personalizadas.
            </p>
            <button 
              className="btn-hero-primary mt-4"
              onClick={handleBatchGenerateAllChapters}
              disabled={isBatchGenerating}
            >
              <Sparkles size={15} />
              Gerar Ilustrações com IA Agora
            </button>
          </div>
        )}
      </div>

      {/* MODAL / DETALHE DE IMAGEM SELECIONADA EM ALTA DEFINIÇÃO */}
      {selectedImage && (
        <div className="modal-backdrop-overlay" onClick={() => setSelectedImage(null)}>
          <div className="image-preview-modal-card-pro" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-pro">
              <div>
                <h4 className="font-bold text-base">{selectedImage.name}</h4>
                <span className="text-xs text-muted">
                  Resolução KDP HD • {selectedImage.source === 'ai-generated' ? 'Motor FLUX.1 Neural' : 'Arquivo Enviado'}
                </span>
              </div>
              <button className="btn-close-modal" onClick={() => setSelectedImage(null)}>✕</button>
            </div>

            <div className="preview-large-box-pro">
              <img 
                src={selectedImage.dataUrl} 
                alt={selectedImage.name} 
                className="preview-img-full" 
              />
            </div>

            <div className="preview-modal-details-bar">
              <div className="text-xs text-muted flex-1 pr-4">
                {selectedImage.prompt && (
                  <p className="italic bg-surface p-2 rounded border border-border text-[11px] leading-relaxed">
                    <strong>Prompt Utilizado:</strong> "{selectedImage.prompt}"
                  </p>
                )}
                {selectedImage.chapterIndex && (
                  <p className="mt-1 text-amber-400 font-semibold text-xs">
                    Vinculada ao Capítulo {selectedImage.chapterIndex} (exibida na abertura do capítulo no livro impresso)
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary-action"
                  onClick={() => handleRegenerateVariation(selectedImage.prompt, selectedImage.chapterIndex)}
                >
                  <RefreshCw size={14} />
                  Nova Variação (↻)
                </button>

                <button
                  className="btn-secondary-action"
                  onClick={() => handleSetAsCover(selectedImage)}
                >
                  <Palette size={14} />
                  Definir como Capa
                </button>

                <button 
                  className="btn-primary-action"
                  onClick={() => handleDownloadHd(selectedImage)}
                >
                  <Download size={14} />
                  Baixar Imagem HD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

