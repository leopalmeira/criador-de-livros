import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../database/local-database';
import { BookProject, TrimSize, PaperType } from '../../types/book-project';
import { jsPDF } from 'jspdf';
import { 
  ImageGenerationService, 
  ART_STYLE_PRESETS, 
  ArtStyleOption 
} from '../../services/image-generation-service';
import { 
  Sparkles, 
  RefreshCw, 
  Download, 
  Save, 
  Layers, 
  Eye, 
  Sliders, 
  Wand2, 
  Check, 
  ExternalLink,
  BookOpen
} from 'lucide-react';

interface CoverStudioProps {
  initialProjectId?: string;
  onOpenBookCreator?: (projectId: string) => void;
}

const TRIM_DIMENSIONS: Record<string, { widthInches: number; heightInches: number; label: string }> = {
  '5x8': { widthInches: 5.0, heightInches: 8.0, label: '5" x 8" (Compacto / Literatura)' },
  '5.25x8': { widthInches: 5.25, heightInches: 8.0, label: '5.25" x 8" (Pocket Premium)' },
  '5.5x8.5': { widthInches: 5.5, heightInches: 8.5, label: '5.5" x 8.5" (Trade Paperback)' },
  '6x9': { widthInches: 6.0, heightInches: 9.0, label: '6" x 9" (Padrão KDP Mais Vendido)' },
  '7x10': { widthInches: 7.0, heightInches: 10.0, label: '7" x 10" (Didático / Guias Técnicos)' },
  '7.5x9.25': { widthInches: 7.5, heightInches: 9.25, label: '7.5" x 9.25" (Manual / Compêndio)' },
  '8x10': { widthInches: 8.0, heightInches: 10.0, label: '8" x 10" (Livro Ilustrado Grande)' },
  '8.5x8.5': { widthInches: 8.5, heightInches: 8.5, label: '8.5" x 8.5" (Quadrado / Infantil)' },
  '8.5x11': { widthInches: 8.5, heightInches: 11.0, label: '8.5" x 11" (Workbook / Apostilas)' },
  'custom': { widthInches: 6.0, heightInches: 9.0, label: 'Personalizado' },
  'kindle-ebook': { widthInches: 5.33, heightInches: 8.53, label: 'Kindle eBook (1600 x 2560 px)' }
};

const TYPOGRAPHY_PRESETS = [
  { id: 'cinzel', name: 'Cinzel (Nobre & Dramático)', font: "'Cinzel', Georgia, serif" },
  { id: 'playfair', name: 'Playfair (Editorial Literário)', font: "'Playfair Display', Georgia, serif" },
  { id: 'montserrat', name: 'Montserrat (Best-Seller Moderno)', font: "'Montserrat', sans-serif" },
  { id: 'garamond', name: 'Garamond (Clássico Refinado)', font: "'Garamond', Georgia, serif" },
  { id: 'inter', name: 'Inter (Minimalista Tecnológico)', font: "'Inter', sans-serif" }
];

async function resolveCoverImageData(source: string): Promise<string> {
  if (source.startsWith('data:image/')) return source;
  const response = await fetch(source);
  if (!response.ok) throw new Error('Não foi possível carregar a imagem da capa.');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Não foi possível preparar a imagem para exportação.'));
    reader.readAsDataURL(blob);
  });
}

export const CoverStudioTab: React.FC<CoverStudioProps> = ({ initialProjectId, onOpenBookCreator }) => {
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || '');
  
  // Dados da Capa
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [badgeText, setBadgeText] = useState('EDIÇÃO DEFINITIVA');
  const [showBadge, setShowBadge] = useState(true);
  
  // Contracapa & Lombada
  const [backSynopsis, setBackSynopsis] = useState('');
  const [authorBio, setAuthorBio] = useState('');
  const [isbnCode, setIsbnCode] = useState('');
  
  // Parâmetros Técnicos KDP
  const [trimSize, setTrimSize] = useState<TrimSize>('6x9');
  const [paperType, setPaperType] = useState<PaperType>('bw-white');
  const [pageCount, setPageCount] = useState<number>(180);
  const [selectedFontId, setSelectedFontId] = useState<string>('cinzel');
  const [useDarkScrim, setUseDarkScrim] = useState<boolean>(true);
  
  // Geração de Imagem Realista com IA (FLUX.1)
  const [selectedArtStyle, setSelectedArtStyle] = useState<ArtStyleOption>('realistic-photo');
  const [customArtPrompt, setCustomArtPrompt] = useState<string>('');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [aiVariationSeed, setAiVariationSeed] = useState<number>(() => Math.floor(Math.random() * 900000) + 100000);
  const [isGeneratingAiArt, setIsGeneratingAiArt] = useState(false);
  const [artHistory, setArtHistory] = useState<string[]>([]);
  
  // Modo de Visualização
  const [viewMode, setViewMode] = useState<'wrap' | 'front' | '3d'>('wrap');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const loadFromProject = (p: BookProject) => {
    setSelectedProjectId(p.id);
    setTitle(p.title || 'Título da Obra');
    setSubtitle(p.subtitle || '');
    setAuthor(p.author || 'Autor da Obra');
    setTrimSize(p.trimSize || '6x9');
    setPaperType(p.paperType || 'bw-white');
    setPageCount(p.actualPages || p.estimatedPages || 160);
    
    setBackSynopsis(p.kdpCoverDesign?.backCoverBlurb || p.kdpConcept?.shortSynopsis || p.description || '');
    setAuthorBio(p.kdpCoverDesign?.authorBio || '');
    setIsbnCode(p.kdpCoverDesign?.isbnCode || '');
    setPublisher(p.kdpCoverDesign?.publisher || 'Publicação Independente');
    setBadgeText(p.kdpCoverDesign?.badgeText || 'BEST-SELLER KDP');
    setShowBadge(p.kdpCoverDesign?.showBadge ?? true);

    const savedCoverImage = p.kdpCoverDesign?.frontImageUrl || (p.kdpCoverDesign as any)?.frontCoverUrl;
    if (savedCoverImage) {
      setCoverImageUrl(savedCoverImage);
      if (!artHistory.includes(savedCoverImage)) {
        setArtHistory(prev => [savedCoverImage, ...prev].slice(0, 8));
      }
    } else {
      // Se não tiver capa salva, inicializa com uma arte realista baseada no tema
      const autoPrompt = ImageGenerationService.buildCoverPrompt(p, 'realistic-photo', '', 42);
      const initialUrl = ImageGenerationService.getPollinationsUrl(autoPrompt, 1200, 1800, 42);
      setCoverImageUrl(initialUrl);
      setArtHistory([initialUrl]);
    }
  };

  useEffect(() => {
    db.getAllBookProjects().then(all => {
      setProjects(all);
      if (initialProjectId) {
        const found = all.find(p => p.id === initialProjectId);
        if (found) loadFromProject(found);
      } else if (all.length > 0 && !selectedProjectId) {
        loadFromProject(all[0]);
      }
    });
  }, [initialProjectId]);

  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    if (!id) return;
    const p = projects.find(x => x.id === id);
    if (p) loadFromProject(p);
  };

  // Cálculo da espessura de lombada KDP (Spine Width)
  const spineMultiplier = paperType === 'bw-cream' ? 0.0025 : 0.002252; // polegadas por página
  const spineWidthInches = Math.max(0.06, pageCount * spineMultiplier);
  const spineWidthMm = (spineWidthInches * 25.4).toFixed(2);
  const trimCfg = TRIM_DIMENSIONS[trimSize] || TRIM_DIMENSIONS['6x9'];
  const totalCoverWidthInches = (trimCfg.widthInches * 2) + spineWidthInches + 0.25; // 0.125 bleed em cada lado
  const totalCoverHeightInches = trimCfg.heightInches + 0.25; // 0.125 bleed topo e rodapé

  const currentFont = TYPOGRAPHY_PRESETS.find(f => f.id === selectedFontId) || TYPOGRAPHY_PRESETS[0];

  // GERAÇÃO REAL DE ILUSTRAÇÃO/ARTE COM IA (FLUX.1)
  const handleGenerateRealisticArt = async (customSeed?: number) => {
    const proj = projects.find(p => p.id === selectedProjectId) || {
      title,
      topic: title,
      kdpBookType: 'non-fiction'
    } as any;

    setIsGeneratingAiArt(true);
    const nextSeed = customSeed !== undefined ? customSeed : Math.floor(Math.random() * 900000) + 100000;
    setAiVariationSeed(nextSeed);

    try {
      const prompt = ImageGenerationService.buildCoverPrompt(proj, selectedArtStyle, customArtPrompt, nextSeed);
      const imageUrl = ImageGenerationService.getPollinationsUrl(prompt, 1200, 1800, nextSeed);
      
      // Pré-carrega a imagem
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = resolve;
        img.onerror = resolve; // fallback gracioso
        img.src = imageUrl;
      });

      setCoverImageUrl(imageUrl);
      setArtHistory(prev => [imageUrl, ...prev.filter(u => u !== imageUrl)].slice(0, 8));
      showToast('✓ Nova ilustração realista gerada com sucesso pela IA!');
    } catch (e: any) {
      showToast(`Falha ao gerar arte: ${e.message}`);
    } finally {
      setIsGeneratingAiArt(false);
    }
  };

  const handleAutoPrompt = () => {
    const proj = projects.find(p => p.id === selectedProjectId);
    const topic = proj?.topic || title || 'Sucesso e Transformação';
    setCustomArtPrompt(`cinematic hyper-realistic visual concept symbolizing ${topic}, dramatic atmospheric lighting, 8k resolution, award-winning book cover art`);
    showToast('Prompt de alta conversão gerado para a capa!');
  };

  // Salva no projeto selecionado
  const handleSaveToProject = async () => {
    if (!selectedProjectId) {
      alert('Por favor, selecione um projeto de livro para salvar a capa.');
      return;
    }
    const proj = projects.find(p => p.id === selectedProjectId);
    if (!proj) return;

    setIsSaving(true);
    try {
      proj.kdpCoverDesign = {
        frontPrompt: customArtPrompt,
        backPrompt: backSynopsis,
        title,
        subtitle,
        author,
        backCoverBlurb: backSynopsis,
        authorBio,
        isbnCode,
        publisher,
        badgeText,
        showBadge,
        frontImageUrl: coverImageUrl,
        geometry: {
          trimSize,
          pageCount,
          paperType,
          spineWidthInches: parseFloat(spineWidthInches.toFixed(3)),
          totalCoverWidthInches: parseFloat(totalCoverWidthInches.toFixed(3)),
          totalCoverHeightInches: parseFloat(totalCoverHeightInches.toFixed(3)),
          bleedInches: 0.125,
          spineText: `${title} — ${author}`
        }
      };

      await db.saveBookProject(proj);
      setProjects(prev => prev.map(p => p.id === proj.id ? proj : p));
      showToast('✓ Capa e arte hiper-realista salvas no projeto!');
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Exporta imagem em alta resolução (300 DPI)
  const handleDownloadPng = async () => {
    showToast('Renderizando imagem em alta resolução (300 DPI)...');
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(totalCoverWidthInches * 300);
    canvas.height = Math.round(totalCoverHeightInches * 300);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fundo escuro base
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const frontX = Math.round((0.125 + trimCfg.widthInches + spineWidthInches) * 300);
    const frontWidth = Math.round(trimCfg.widthInches * 300);
    const fullHeight = canvas.height;

    // Renderiza arte frontal
    if (coverImageUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = coverImageUrl;
        });
        ctx.drawImage(img, frontX, 0, frontWidth, fullHeight);
      } catch {
        // mantém fundo sólido
      }
    }

    // Scrim escuro para legibilidade da tipografia
    if (useDarkScrim) {
      const scrimGrad = ctx.createLinearGradient(0, 0, 0, fullHeight);
      scrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      scrimGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.15)');
      scrimGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
      scrimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = scrimGrad;
      ctx.fillRect(frontX, 0, frontWidth, fullHeight);
    }

    // Tipografia Frontal
    ctx.font = `bold 72px ${currentFont.font}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 20;
    ctx.fillText(title, frontX + frontWidth / 2, 450, frontWidth - 100);

    if (subtitle) {
      ctx.font = '32px Inter, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(subtitle, frontX + frontWidth / 2, 580, frontWidth - 140);
    }

    ctx.font = 'bold 44px Inter, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(author, frontX + frontWidth / 2, fullHeight - 200);

    // Lombada
    const spineCenterX = Math.round((0.125 + trimCfg.widthInches + spineWidthInches / 2) * 300);
    ctx.save();
    ctx.translate(spineCenterX, fullHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`${title} • ${author}`, 0, 0);
    ctx.restore();

    // Contracapa
    ctx.shadowBlur = 0;
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText('SOBRE A OBRA', 120, 300);

    ctx.font = '26px Inter, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    const lines = backSynopsis.split('\n');
    lines.forEach((l, idx) => {
      ctx.fillText(l.substring(0, 55), 120, 360 + idx * 40);
    });

    const link = document.createElement('a');
    link.download = `capa-kdp-fullwrap-${title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'livro'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('✓ Arquivo PNG 300 DPI de alta definição baixado!');
  };

  // Exporta PDF Full-Wrap Pronto para Impressão KDP
  const handleDownloadPdf = async () => {
    try {
      showToast('Gerando PDF Full-Wrap KDP...');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: [totalCoverWidthInches, totalCoverHeightInches]
      });

      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, totalCoverWidthInches, totalCoverHeightInches, 'F');

      const frontX = 0.125 + trimCfg.widthInches + spineWidthInches;

      if (coverImageUrl) {
        try {
          const imageData = await resolveCoverImageData(coverImageUrl);
          const imageFormat = imageData.includes('image/png') ? 'PNG' : 'JPEG';
          pdf.addImage(imageData, imageFormat, frontX, 0, trimCfg.widthInches, totalCoverHeightInches);
        } catch {
          // ignora
        }
      }
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(26);
      pdf.text(title, frontX + (trimCfg.widthInches / 2), 2.8, { align: 'center', maxWidth: trimCfg.widthInches - 1 });

      if (subtitle) {
        pdf.setFontSize(13);
        pdf.setTextColor(251, 191, 36);
        pdf.text(subtitle, frontX + (trimCfg.widthInches / 2), 3.8, { align: 'center', maxWidth: trimCfg.widthInches - 1 });
      }

      pdf.setTextColor(248, 250, 252);
      pdf.setFontSize(16);
      pdf.text(author, frontX + (trimCfg.widthInches / 2), trimCfg.heightInches - 1.2, { align: 'center' });

      // Contracapa
      pdf.setFontSize(11);
      pdf.setTextColor(203, 213, 225);
      pdf.text(backSynopsis, 0.125 + 0.6, 2.0, { maxWidth: trimCfg.widthInches - 1.2 });

      // Lombada
      pdf.setFontSize(10);
      const spineCenterX = 0.125 + trimCfg.widthInches + (spineWidthInches / 2);
      pdf.text(`${title} — ${author}`, spineCenterX, totalCoverHeightInches / 2, { angle: 90, align: 'center' });

      pdf.save(`capa-kdp-${title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'livro'}.pdf`);
      showToast('✓ PDF da capa exportado no padrão de impressão KDP!');
    } catch (e: any) {
      showToast(`Falha ao gerar PDF: ${e.message}`);
    }
  };

  return (
    <div className="cover-studio-container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 12px 40px 12px' }}>
      {/* Toast Feedback */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#047857',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          fontWeight: 700,
          fontSize: '13px'
        }}>
          {toastMsg}
        </div>
      )}

      {/* HEADER DO ESTÚDIO DE CAPA */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px 24px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <BookOpen size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
              Estúdio Profissional de Capas KDP com IA Realista
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              Geração de artes cinematográficas 8K via FLUX.1 / SDXL, cálculo milimétrico de lombada e exportação 300 DPI.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleSaveToProject}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Save size={14} /> {isSaving ? 'Salvando...' : 'Salvar Capa'}
          </button>

          <button
            onClick={handleDownloadPng}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> Baixar PNG 300 DPI
          </button>

          <button
            onClick={handleDownloadPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#334155',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> PDF para Impressão KDP
          </button>
        </div>
      </div>

      {/* GRID DE DUAS COLUNAS */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px' }}>
        
        {/* COLUNA ESQUERDA: CONTROLES E GERADOR DE ARTE IA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 1. SELETOR DE LIVRO / PROJETO */}
          <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
              Obra Ativa:
            </label>
            <select
              value={selectedProjectId}
              onChange={e => handleProjectSelect(e.target.value)}
              style={{
                width: '100%',
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <option value="">-- Selecione uma Obra --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* 2. GERADOR DE ILUSTRAÇÃO REALISTA COM IA (FLUX.1) */}
          <div style={{ background: '#0f172a', border: '1px solid #3b82f6', borderRadius: '10px', padding: '16px', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} className="text-amber-400" />
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                  Arte Realista com IA (FLUX.1)
                </h3>
              </div>
              <span style={{ fontSize: '10px', background: '#2563eb22', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                Hiper-Realismo 8K
              </span>
            </div>

            {/* SELETOR DE ESTILOS REALISTAS */}
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
              Estilo Artístico da Imagem:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '12px' }}>
              {ART_STYLE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedArtStyle(preset.id)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '6px',
                    border: `1px solid ${selectedArtStyle === preset.id ? '#3b82f6' : '#334155'}`,
                    background: selectedArtStyle === preset.id ? '#1e3a8a' : '#1e293b',
                    color: selectedArtStyle === preset.id ? '#ffffff' : '#cbd5e1',
                    fontSize: '11px',
                    fontWeight: selectedArtStyle === preset.id ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* PROMPT CONTEXTUAL */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>Conceito Visual da Cena:</label>
                <button
                  type="button"
                  onClick={handleAutoPrompt}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}
                >
                  ✨ Prompt Automático do Livro
                </button>
              </div>
              <textarea
                rows={3}
                value={customArtPrompt}
                onChange={e => setCustomArtPrompt(e.target.value)}
                placeholder="Ex: Sala executiva com vista panorâmica para o nascer do sol, iluminação dramática, relógio de areia..."
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '11px',
                  lineHeight: 1.4
                }}
              />
            </div>

            {/* BOTÕES DE GERAÇÃO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => handleGenerateRealisticArt()}
                disabled={isGeneratingAiArt}
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: isGeneratingAiArt ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isGeneratingAiArt ? (
                  <RefreshCw size={13} className="spin-animate" />
                ) : (
                  <Wand2 size={13} />
                )}
                {isGeneratingAiArt ? 'Gerando Arte...' : 'Gerar Arte Realista'}
              </button>

              <button
                type="button"
                onClick={() => handleGenerateRealisticArt(Math.floor(Math.random() * 900000) + 100000)}
                disabled={isGeneratingAiArt}
                style={{
                  background: '#334155',
                  color: '#ffffff',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  padding: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: isGeneratingAiArt ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                title="Gera uma imagem totalmente diferente com um novo seed de inteligência artificial"
              >
                <RefreshCw size={13} className={isGeneratingAiArt ? 'spin-animate' : ''} />
                Nova Imagem (↻)
              </button>
            </div>

            {/* HISTÓRICO DE VARIAÇÕES RECENTES */}
            {artHistory.length > 1 && (
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Variações geradas (clique para alternar):
                </span>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {artHistory.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Variação ${idx + 1}`}
                      onClick={() => setCoverImageUrl(url)}
                      style={{
                        width: '42px',
                        height: '56px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: `2px solid ${coverImageUrl === url ? '#3b82f6' : '#334155'}`,
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. PARÂMETROS GRÁFICOS KDP & LOMBADA */}
          <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
              📐 Formato & Cálculo de Lombada KDP
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Tamanho de Corte:</label>
                <select
                  value={trimSize}
                  onChange={e => setTrimSize(e.target.value as TrimSize)}
                  style={{ width: '100%', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '7px', fontSize: '11px' }}
                >
                  {Object.entries(TRIM_DIMENSIONS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Nº de Páginas:</label>
                <input
                  type="number"
                  min="24"
                  max="828"
                  value={pageCount}
                  onChange={e => setPageCount(parseInt(e.target.value) || 24)}
                  style={{ width: '100%', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '7px', fontSize: '11px' }}
                />
              </div>
            </div>

            <div style={{ background: '#1e293b', borderRadius: '6px', padding: '8px 10px', fontSize: '11px', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Lombada Exata (Spine):</span>
                <strong style={{ color: '#38bdf8' }}>{spineWidthInches.toFixed(3)}" ({spineWidthMm} mm)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Jaqueta Aberta:</span>
                <strong style={{ color: '#a7f3d0' }}>{totalCoverWidthInches.toFixed(2)}" x {totalCoverHeightInches.toFixed(2)}"</strong>
              </div>
            </div>
          </div>

          {/* 4. TEXTOS DA CAPA E TIPOGRAFIA */}
          <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
              ✍️ Textos & Tipografia Editorial
            </h3>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Fonte Principal:</label>
              <select
                value={selectedFontId}
                onChange={e => setSelectedFontId(e.target.value)}
                style={{ width: '100%', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '7px', fontSize: '12px', fontWeight: 600 }}
              >
                {TYPOGRAPHY_PRESETS.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Título do Livro:</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ width: '100%', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '7px', fontSize: '12px', fontWeight: 700 }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Subtítulo:</label>
              <textarea
                rows={2}
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                style={{ width: '100%', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '7px', fontSize: '11px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Autor:</label>
                <input
                  type="text"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  style={{ width: '100%', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '7px', fontSize: '11px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Selo / Badge:</label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={e => setBadgeText(e.target.value)}
                  style={{ width: '100%', background: '#1e293b', color: '#fbbf24', border: '1px solid #334155', borderRadius: '6px', padding: '7px', fontSize: '11px', fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useDarkScrim}
                  onChange={e => setUseDarkScrim(e.target.checked)}
                />
                Contraste Automático (Protege o texto com gradiente suave sobre a foto)
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Sinopse da Contracapa (Back Cover):</label>
              <textarea
                rows={3}
                value={backSynopsis}
                onChange={e => setBackSynopsis(e.target.value)}
                style={{ width: '100%', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '6px', padding: '7px', fontSize: '11px', lineHeight: 1.4 }}
              />
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: VISUALIZADOR DA CAPA */}
        <div style={{ background: '#0a0e17', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Seletor de Modo de Exibição */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setViewMode('wrap')}
                style={{
                  background: viewMode === 'wrap' ? '#2563eb' : '#1e293b',
                  color: viewMode === 'wrap' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📐 Jaqueta Completa KDP
              </button>

              <button
                onClick={() => setViewMode('front')}
                style={{
                  background: viewMode === 'front' ? '#2563eb' : '#1e293b',
                  color: viewMode === 'front' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🖼️ Capa Frontal
              </button>

              <button
                onClick={() => setViewMode('3d')}
                style={{
                  background: viewMode === '3d' ? '#2563eb' : '#1e293b',
                  color: viewMode === '3d' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📖 Mockup 3D
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => handleGenerateRealisticArt(Math.floor(Math.random() * 900000) + 100000)}
                disabled={isGeneratingAiArt}
                style={{
                  background: '#1e293b',
                  color: '#38bdf8',
                  border: '1px solid #38bdf844',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RefreshCw size={12} className={isGeneratingAiArt ? 'spin-animate' : ''} />
                Trocar Imagem (↻)
              </button>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Dimensões KDP 300 DPI
              </span>
            </div>
          </div>

          {/* MODO 1: JAQUETA COMPLETA */}
          {viewMode === 'wrap' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto', padding: '10px 0' }}>
              <div style={{
                display: 'flex',
                background: '#090d16',
                border: '1px dashed #38bdf8',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
                height: '520px',
                position: 'relative'
              }}>
                {/* 1.1 Quarta-Capa (Back Cover) */}
                <div style={{
                  width: '320px',
                  height: '100%',
                  padding: '28px 22px',
                  borderRight: '1px dashed rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                  background: '#0a0e1a'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
                      SOBRE A OBRA
                    </div>
                    <div style={{
                      fontSize: '11px',
                      lineHeight: 1.5,
                      color: '#cbd5e1',
                      whiteSpace: 'pre-line',
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      {backSynopsis}
                    </div>
                  </div>

                  <div>
                    {authorBio && (
                      <div style={{ fontSize: '10px', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '8px', marginBottom: '10px' }}>
                        <strong>Sobre o autor:</strong> {authorBio}
                      </div>
                    )}

                    <div style={{
                      background: '#ffffff',
                      color: '#000000',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      fontFamily: 'monospace',
                      fontSize: '9px'
                    }}>
                      <div>{isbnCode ? `ISBN ${isbnCode}` : 'Área reservada para código de barras KDP'}</div>
                    </div>
                  </div>
                </div>

                {/* 1.2 Lombada (Spine) */}
                <div style={{
                  width: Math.max(34, Math.min(80, spineWidthInches * 60)) + 'px',
                  height: '100%',
                  borderRight: '1px dashed rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '24px 0',
                  boxSizing: 'border-box',
                  background: '#060911'
                }}>
                  <div style={{ fontSize: '9px', color: '#fbbf24', fontWeight: 700 }}>
                    {publisher.substring(0, 10)}
                  </div>

                  <div style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    transform: 'rotate(180deg)',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    color: '#f8fafc',
                    whiteSpace: 'nowrap',
                    maxHeight: '340px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {title} — {author}
                  </div>

                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }}></div>
                </div>

                {/* 1.3 Capa Frontal com Arte Realista */}
                <div style={{
                  width: '320px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                  backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Gradiente Scrim para Proteger o Texto */}
                  {useDarkScrim && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%)',
                      pointerEvents: 'none'
                    }} />
                  )}

                  {/* Conteúdo Frontal sobreposto */}
                  <div style={{ position: 'relative', zIndex: 2, padding: '24px 20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                    {/* Topo: Selo */}
                    <div style={{ textAlign: 'center' }}>
                      {showBadge && badgeText && (
                        <span style={{
                          display: 'inline-block',
                          background: 'rgba(0, 0, 0, 0.7)',
                          border: '1px solid #fbbf24',
                          color: '#fbbf24',
                          fontSize: '9px',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          letterSpacing: '0.8px',
                          backdropFilter: 'blur(4px)'
                        }}>
                          {badgeText}
                        </span>
                      )}

                      <h1 style={{
                        margin: '16px 0 6px 0',
                        fontSize: '22px',
                        fontWeight: 900,
                        lineHeight: 1.15,
                        color: '#ffffff',
                        fontFamily: currentFont.font,
                        textShadow: '0 2px 14px rgba(0, 0, 0, 0.95)',
                        letterSpacing: '-0.3px'
                      }}>
                        {title}
                      </h1>

                      {subtitle && (
                        <p style={{
                          margin: 0,
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#fbbf24',
                          lineHeight: 1.3,
                          textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)',
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          {subtitle}
                        </p>
                      )}
                    </div>

                    {/* Rodapé: Autor */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#cbd5e1', textShadow: '0 1px 4px #000' }}>
                        OBRA ESCRITA POR
                      </span>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: '#ffffff',
                        fontFamily: 'Montserrat, sans-serif',
                        letterSpacing: '0.5px',
                        textShadow: '0 2px 10px rgba(0, 0, 0, 0.95)'
                      }}>
                        {author}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODO 2: CAPA FRONTAL */}
          {viewMode === 'front' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
              <div style={{
                width: '360px',
                height: '540px',
                backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
                borderRadius: '8px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {useDarkScrim && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%)',
                    pointerEvents: 'none'
                  }} />
                )}

                <div style={{ position: 'relative', zIndex: 2, padding: '30px 24px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                  <div style={{ textAlign: 'center' }}>
                    {showBadge && badgeText && (
                      <span style={{
                        display: 'inline-block',
                        background: 'rgba(0, 0, 0, 0.75)',
                        border: '1px solid #fbbf24',
                        color: '#fbbf24',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: '20px',
                        letterSpacing: '1px',
                        backdropFilter: 'blur(6px)'
                      }}>
                        {badgeText}
                      </span>
                    )}

                    <h1 style={{
                      margin: '20px 0 8px 0',
                      fontSize: '26px',
                      fontWeight: 900,
                      lineHeight: 1.15,
                      color: '#ffffff',
                      fontFamily: currentFont.font,
                      textShadow: '0 2px 16px rgba(0, 0, 0, 0.95)'
                    }}>
                      {title}
                    </h1>

                    {subtitle && (
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#fbbf24',
                        lineHeight: 1.35,
                        textShadow: '0 2px 10px rgba(0, 0, 0, 0.9)'
                      }}>
                        {subtitle}
                      </p>
                    )}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#cbd5e1', textShadow: '0 1px 4px #000' }}>
                      OBRA ESCRITA POR
                    </span>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#ffffff',
                      fontFamily: 'Montserrat, sans-serif',
                      letterSpacing: '0.5px',
                      textShadow: '0 2px 12px rgba(0, 0, 0, 0.95)'
                    }}>
                      {author}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODO 3: MOCKUP 3D */}
          {viewMode === '3d' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 0' }}>
              <div style={{
                position: 'relative',
                transform: 'perspective(1200px) rotateY(-26deg) rotateX(8deg)',
                transformStyle: 'preserve-3d',
                boxShadow: '25px 25px 60px rgba(0, 0, 0, 0.9), -5px 0 20px rgba(0, 0, 0, 0.4)',
                borderRadius: '4px',
                width: '320px',
                height: '480px',
                backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                overflow: 'hidden'
              }}>
                {useDarkScrim && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%)'
                  }} />
                )}

                <div style={{ position: 'relative', zIndex: 2, padding: '24px 20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                  <div style={{ textAlign: 'center' }}>
                    {showBadge && badgeText && (
                      <span style={{
                        display: 'inline-block',
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: '1px solid #fbbf24',
                        color: '#fbbf24',
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '20px'
                      }}>
                        {badgeText}
                      </span>
                    )}

                    <h2 style={{
                      margin: '16px 0 6px 0',
                      fontSize: '22px',
                      fontWeight: 900,
                      lineHeight: 1.15,
                      color: '#ffffff',
                      fontFamily: currentFont.font,
                      textShadow: '0 2px 14px rgba(0, 0, 0, 0.95)'
                    }}>
                      {title}
                    </h2>

                    {subtitle && (
                      <p style={{ margin: 0, fontSize: '11px', color: '#fbbf24', textShadow: '0 2px 8px #000' }}>
                        {subtitle}
                      </p>
                    )}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', textShadow: '0 2px 10px #000' }}>
                      {author}
                    </div>
                  </div>
                </div>

                {/* Efeito de Páginas 3D na lateral direita */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '18px',
                  height: '100%',
                  background: 'repeating-linear-gradient(to right, #e2e8f0 0px, #cbd5e1 1px, #f8fafc 2px)',
                  boxShadow: 'inset 2px 0 5px rgba(0, 0, 0, 0.3)',
                  opacity: 0.8
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
