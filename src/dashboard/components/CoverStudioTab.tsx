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
  BookOpen,
  Palette,
  ShieldCheck,
  Grid,
  FileCheck2,
  FileImage,
  Box,
  Layout,
  Type,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd
} from 'lucide-react';
import { CoverVisualConcept } from '../../services/cover-studio/cover-ai-generator';
import { 
  CoverCanvasRenderer, 
  CoverTitlePosition, 
  CoverTextColorTheme,
  exportCoverHighResCanvas 
} from '../../components/studio/cover/CoverCanvasRenderer';

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
  { id: 'cinzel', name: 'Cinzel (Nobre & Dramático - Best-Seller)', font: "'Cinzel', Georgia, serif" },
  { id: 'playfair', name: 'Playfair (Editorial Literário Clássico)', font: "'Playfair Display', Georgia, serif" },
  { id: 'montserrat', name: 'Montserrat (Moderno Comercial / Negócios)', font: "'Montserrat', sans-serif" },
  { id: 'garamond', name: 'Garamond (Ficção Atemporal & Memórias)', font: "'Garamond', Georgia, serif" },
  { id: 'inter', name: 'Inter (Minimalista Contemporâneo / Tech)', font: "'Inter', sans-serif" }
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
  const [showBadge, setShowBadge] = useState(false);
  
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
  
  // Controles de Diagramação Editorial
  const [titlePosition, setTitlePosition] = useState<CoverTitlePosition>('top');
  const [textColorTheme, setTextColorTheme] = useState<CoverTextColorTheme>('gold');
  const [showKdpGuidelines, setShowKdpGuidelines] = useState<boolean>(false);
  
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
    setBadgeText(p.kdpCoverDesign?.badgeText || 'EDIÇÃO OFICIAL KDP');
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
    try {
      showToast('Renderizando imagem em alta resolução (300 DPI)...');

      if (viewMode === 'front') {
        const concept: CoverVisualConcept = {
          id: 'export-front',
          optionNumber: 1,
          directionName: 'Direção do Autor',
          conceptDescription: customArtPrompt || title,
          artisticRationale: 'Diagramação editorial',
          visualPrompt: customArtPrompt,
          artUrl: coverImageUrl,
          fontFamily: currentFont.font,
          titleColor: '#ffffff',
          subtitleColor: textColorTheme === 'gold' ? '#fde047' : textColorTheme === 'contrast' ? '#38bdf8' : '#cbd5e1',
          authorColor: '#ffffff',
          badgeText: badgeText,
          badgeBg: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
          scrimOpacity: useDarkScrim ? 65 : 20
        };

        const dataUrl = await exportCoverHighResCanvas(
          concept,
          title,
          subtitle,
          author,
          showBadge,
          badgeText,
          'png',
          titlePosition,
          textColorTheme
        );
        const link = document.createElement('a');
        link.download = `capa-kdp-frontal-300dpi-${title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'livro'}.png`;
        link.href = dataUrl;
        link.click();
        showToast('✓ Imagem Frontal 1600x2400 (300 DPI) baixada!');
        return;
      }

      // Modo Jaqueta Aberta KDP
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
        if (titlePosition === 'bottom') {
          scrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
          scrimGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
          scrimGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.85)');
          scrimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        } else if (titlePosition === 'center') {
          scrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
          scrimGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.8)');
          scrimGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.8)');
          scrimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        } else {
          scrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
          scrimGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.2)');
          scrimGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.3)');
          scrimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
        }
        ctx.fillStyle = scrimGrad;
        ctx.fillRect(frontX, 0, frontWidth, fullHeight);
      }

      // Configurações de cores
      const titleColor = '#ffffff';
      const subtitleColor = textColorTheme === 'gold' ? '#fde047' : textColorTheme === 'contrast' ? '#38bdf8' : '#cbd5e1';
      const authorColor = textColorTheme === 'gold' ? '#fef08a' : '#f8fafc';

      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 24;

      const titleY = titlePosition === 'center' ? fullHeight * 0.46 : titlePosition === 'bottom' ? fullHeight * 0.65 : 440;
      const subtitleY = titleY + 120;
      const authorY = titlePosition === 'bottom' ? fullHeight - 160 : fullHeight - 180;

      // Selo se ativado
      if (showBadge && badgeText && titlePosition !== 'top') {
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(badgeText.toUpperCase(), frontX + frontWidth / 2, 280);
      }

      // Título
      ctx.font = `bold 76px ${currentFont.font}`;
      ctx.fillStyle = titleColor;
      ctx.fillText(title, frontX + frontWidth / 2, titleY, frontWidth - 120);

      // Subtítulo
      if (subtitle) {
        ctx.font = '34px Inter, sans-serif';
        ctx.fillStyle = subtitleColor;
        ctx.fillText(subtitle, frontX + frontWidth / 2, subtitleY, frontWidth - 140);
      }

      // Autor
      ctx.font = `bold 44px ${currentFont.font}`;
      ctx.fillStyle = authorColor;
      ctx.fillText(author.toUpperCase(), frontX + frontWidth / 2, authorY);

      // Lombada
      const spineCenterX = Math.round((0.125 + trimCfg.widthInches + spineWidthInches / 2) * 300);
      ctx.save();
      ctx.translate(spineCenterX, fullHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = 'bold 30px Inter, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`${title} • ${author}`, 0, 0);
      ctx.restore();

      // Contracapa
      ctx.shadowBlur = 0;
      ctx.font = 'bold 36px Inter, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.fillText('SOBRE A OBRA', 140, 320);

      ctx.font = '28px Inter, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      const lines = backSynopsis.split('\n');
      lines.forEach((l, idx) => {
        ctx.fillText(l.substring(0, 52), 140, 380 + idx * 44);
      });

      const link = document.createElement('a');
      link.download = `capa-kdp-fullwrap-${title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'livro'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('✓ Arquivo Full-Wrap 300 DPI de alta definição baixado!');
    } catch (e: any) {
      showToast(`Erro ao exportar PNG: ${e.message}`);
    }
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

      {/* CONCEITO VISUAL ATIVO */}
      {(() => {
        const activeConcept: CoverVisualConcept = {
          id: 'studio-active-concept',
          optionNumber: 1,
          directionName: 'Direção do Autor',
          conceptDescription: customArtPrompt || title,
          artisticRationale: 'Diagramação editorial KDP de alta resolução',
          visualPrompt: customArtPrompt,
          artUrl: coverImageUrl,
          fontFamily: currentFont.font,
          titleColor: '#ffffff',
          subtitleColor: textColorTheme === 'gold' ? '#fde047' : textColorTheme === 'contrast' ? '#38bdf8' : '#cbd5e1',
          authorColor: textColorTheme === 'gold' ? '#fef08a' : '#f8fafc',
          badgeText: badgeText,
          badgeBg: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
          scrimOpacity: useDarkScrim ? 65 : 20
        };

        return (
          <>
            {/* HEADER DO ATELIER DE DESIGN EDITORIAL */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '18px 24px',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
                }}>
                  <BookOpen size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>
                      BookEngin Cover Atelier
                    </h2>
                    <span style={{
                      fontSize: '10px',
                      background: 'rgba(217, 119, 6, 0.15)',
                      color: '#fbbf24',
                      border: '1px solid rgba(217, 119, 6, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      letterSpacing: '0.5px'
                    }}>
                      PADRÃO GRÁFICO KDP
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    Direção de arte com IA neural (FLUX.1), diagramação editorial e cálculo milimétrico de lombada 300 DPI.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
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
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <Save size={14} /> {isSaving ? 'Salvando...' : 'Salvar no Projeto'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPng}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#047857',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <Download size={14} /> Baixar PNG 300 DPI
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <FileCheck2 size={14} /> PDF Full-Wrap KDP
                </button>
              </div>
            </div>

            {/* GRID PRINCIPAL: CONTROLES À ESQUERDA & VISUALIZADOR À DIREITA */}
            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px' }}>
              
              {/* COLUNA ESQUERDA: CONTROLES DO ATELIER */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* 1. SELETOR DE LIVRO / PROJETO */}
                <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    Obra Ativa no Estúdio:
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={e => handleProjectSelect(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#131b2e',
                      color: '#f8fafc',
                      border: '1px solid #1e293b',
                      borderRadius: '6px',
                      padding: '9px 12px',
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

                {/* 2. DIREÇÃO DE ARTE REALISTA COM IA (FLUX.1) */}
                <div style={{ background: '#090d16', border: '1px solid rgba(2, 132, 199, 0.3)', borderRadius: '10px', padding: '16px', boxShadow: '0 4px 20px rgba(2, 132, 199, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wand2 size={16} color="#38bdf8" />
                      <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                        Direção de Arte com IA (FLUX.1)
                      </h3>
                    </div>
                    <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      Cinematográfico 8K
                    </span>
                  </div>

                  {/* PRESETS DE ESTILO */}
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                    Estilo Artístico da Composição:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '12px' }}>
                    {ART_STYLE_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedArtStyle(preset.id)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: `1px solid ${selectedArtStyle === preset.id ? '#0284c7' : '#1e293b'}`,
                          background: selectedArtStyle === preset.id ? 'rgba(2, 132, 199, 0.2)' : '#131b2e',
                          color: selectedArtStyle === preset.id ? '#38bdf8' : '#cbd5e1',
                          fontSize: '11px',
                          fontWeight: selectedArtStyle === preset.id ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s'
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
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Conceito Visual da Cena (Prompt):</label>
                      <button
                        type="button"
                        onClick={handleAutoPrompt}
                        style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Sparkles size={11} /> Prompt Sugerido do Livro
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={customArtPrompt}
                      onChange={e => setCustomArtPrompt(e.target.value)}
                      placeholder="Ex: Cinematic dramatic lighting, executive office with sunrise backdrop, minimalist luxury, award-winning book cover art..."
                      style={{
                        width: '100%',
                        background: '#131b2e',
                        color: '#f8fafc',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        fontSize: '11px',
                        lineHeight: 1.4,
                        boxSizing: 'border-box'
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
                        background: 'linear-gradient(135deg, #0284c7, #0369a1)',
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
                      {isGeneratingAiArt ? 'Renderizando...' : 'Gerar Arte com IA'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateRealisticArt(Math.floor(Math.random() * 900000) + 100000)}
                      disabled={isGeneratingAiArt}
                      style={{
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid #334155',
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
                      title="Gera uma nova ilustração com um seed aleatório"
                    >
                      <RefreshCw size={13} className={isGeneratingAiArt ? 'spin-animate' : ''} />
                      Nova Variação
                    </button>
                  </div>

                  {/* HISTÓRICO DE VARIAÇÕES RECENTES */}
                  {artHistory.length > 1 && (
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        Variações salvas na sessão (clique para alternar):
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
                              border: `2px solid ${coverImageUrl === url ? '#38bdf8' : '#1e293b'}`,
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. PARÂMETROS GRÁFICOS KDP & LOMBADA */}
                <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Layout size={15} color="#fbbf24" />
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                      Formato & Cálculo de Lombada KDP
                    </h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Tamanho de Corte:</label>
                      <select
                        value={trimSize}
                        onChange={e => setTrimSize(e.target.value as TrimSize)}
                        style={{ width: '100%', background: '#131b2e', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', fontSize: '11px' }}
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
                        style={{ width: '100%', background: '#131b2e', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', fontSize: '11px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '6px', padding: '10px 12px', fontSize: '11px', color: '#cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Lombada Exata (Spine):</span>
                      <strong style={{ color: '#38bdf8' }}>{spineWidthInches.toFixed(3)}" ({spineWidthMm} mm)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Jaqueta Aberta:</span>
                      <strong style={{ color: '#34d399' }}>{totalCoverWidthInches.toFixed(2)}" x {totalCoverHeightInches.toFixed(2)}"</strong>
                    </div>
                  </div>
                </div>

                {/* 4. DIAGRAMAÇÃO EDITORIAL & TIPOGRAFIA */}
                <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <Type size={15} color="#a78bfa" />
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                      Diagramação & Tipografia Editorial
                    </h3>
                  </div>

                  {/* FONTE PRINCIPAL */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Família Tipográfica:</label>
                    <select
                      value={selectedFontId}
                      onChange={e => setSelectedFontId(e.target.value)}
                      style={{ width: '100%', background: '#131b2e', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', fontSize: '12px', fontWeight: 600 }}
                    >
                      {TYPOGRAPHY_PRESETS.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* POSIÇÃO DO TÍTULO */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                      Posição do Título na Capa:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setTitlePosition('top')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '7px 4px',
                          borderRadius: '6px',
                          border: `1px solid ${titlePosition === 'top' ? '#0284c7' : '#1e293b'}`,
                          background: titlePosition === 'top' ? 'rgba(2, 132, 199, 0.2)' : '#131b2e',
                          color: titlePosition === 'top' ? '#38bdf8' : '#cbd5e1',
                          fontSize: '11px',
                          fontWeight: titlePosition === 'top' ? 700 : 500,
                          cursor: 'pointer'
                        }}
                      >
                        <AlignVerticalJustifyStart size={13} /> Topo
                      </button>

                      <button
                        type="button"
                        onClick={() => setTitlePosition('center')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '7px 4px',
                          borderRadius: '6px',
                          border: `1px solid ${titlePosition === 'center' ? '#0284c7' : '#1e293b'}`,
                          background: titlePosition === 'center' ? 'rgba(2, 132, 199, 0.2)' : '#131b2e',
                          color: titlePosition === 'center' ? '#38bdf8' : '#cbd5e1',
                          fontSize: '11px',
                          fontWeight: titlePosition === 'center' ? 700 : 500,
                          cursor: 'pointer'
                        }}
                      >
                        <AlignVerticalJustifyCenter size={13} /> Centro
                      </button>

                      <button
                        type="button"
                        onClick={() => setTitlePosition('bottom')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '7px 4px',
                          borderRadius: '6px',
                          border: `1px solid ${titlePosition === 'bottom' ? '#0284c7' : '#1e293b'}`,
                          background: titlePosition === 'bottom' ? 'rgba(2, 132, 199, 0.2)' : '#131b2e',
                          color: titlePosition === 'bottom' ? '#38bdf8' : '#cbd5e1',
                          fontSize: '11px',
                          fontWeight: titlePosition === 'bottom' ? 700 : 500,
                          cursor: 'pointer'
                        }}
                      >
                        <AlignVerticalJustifyEnd size={13} /> Base
                      </button>
                    </div>
                  </div>

                  {/* PALETA TIPOGRÁFICA */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                      Acabamento Tipográfico:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setTextColorTheme('gold')}
                        style={{
                          padding: '7px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${textColorTheme === 'gold' ? '#d97706' : '#1e293b'}`,
                          background: textColorTheme === 'gold' ? 'rgba(217, 119, 6, 0.2)' : '#131b2e',
                          color: textColorTheme === 'gold' ? '#fbbf24' : '#cbd5e1',
                          fontSize: '11px',
                          fontWeight: textColorTheme === 'gold' ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        ✦ Ouro Nobre
                      </button>

                      <button
                        type="button"
                        onClick={() => setTextColorTheme('white')}
                        style={{
                          padding: '7px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${textColorTheme === 'white' ? '#f8fafc' : '#1e293b'}`,
                          background: textColorTheme === 'white' ? 'rgba(248, 250, 252, 0.15)' : '#131b2e',
                          color: textColorTheme === 'white' ? '#ffffff' : '#cbd5e1',
                          fontSize: '11px',
                          fontWeight: textColorTheme === 'white' ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        ✧ Branco Puro
                      </button>

                      <button
                        type="button"
                        onClick={() => setTextColorTheme('silver')}
                        style={{
                          padding: '7px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${textColorTheme === 'silver' ? '#94a3b8' : '#1e293b'}`,
                          background: textColorTheme === 'silver' ? 'rgba(148, 163, 184, 0.2)' : '#131b2e',
                          color: textColorTheme === 'silver' ? '#e2e8f0' : '#cbd5e1',
                          fontSize: '11px',
                          fontWeight: textColorTheme === 'silver' ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        ◈ Prata Editorial
                      </button>

                      <button
                        type="button"
                        onClick={() => setTextColorTheme('contrast')}
                        style={{
                          padding: '7px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${textColorTheme === 'contrast' ? '#0284c7' : '#1e293b'}`,
                          background: textColorTheme === 'contrast' ? 'rgba(2, 132, 199, 0.2)' : '#131b2e',
                          color: textColorTheme === 'contrast' ? '#38bdf8' : '#cbd5e1',
                          fontSize: '11px',
                          fontWeight: textColorTheme === 'contrast' ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        ◉ Alto Contraste
                      </button>
                    </div>
                  </div>

                  {/* TOGGLES TÉCNICOS: GABARITO KDP & SCRIM */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', background: '#131b2e', padding: '10px 12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#f8fafc', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={showKdpGuidelines}
                        onChange={e => setShowKdpGuidelines(e.target.checked)}
                      />
                      <span>Gabarito Técnico KDP (Linhas de Sangria 0.125" e Corte)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={useDarkScrim}
                        onChange={e => setUseDarkScrim(e.target.checked)}
                      />
                      <span>Contraste Suave (Scrim Adaptativo sobre a Foto)</span>
                    </label>
                  </div>

                  {/* TEXTOS */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Título da Obra:</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      style={{ width: '100%', background: '#131b2e', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', fontSize: '12px', fontWeight: 700, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Subtítulo:</label>
                    <textarea
                      rows={2}
                      value={subtitle}
                      onChange={e => setSubtitle(e.target.value)}
                      style={{ width: '100%', background: '#131b2e', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', fontSize: '11px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Autor:</label>
                      <input
                        type="text"
                        value={author}
                        onChange={e => setAuthor(e.target.value)}
                        style={{ width: '100%', background: '#131b2e', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', fontSize: '11px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>
                        <input
                          type="checkbox"
                          checked={showBadge}
                          onChange={e => setShowBadge(e.target.checked)}
                        />
                        Selo Editorial:
                      </label>
                      <input
                        type="text"
                        value={badgeText}
                        onChange={e => setBadgeText(e.target.value)}
                        placeholder="EDIÇÃO DEFINITIVA"
                        style={{ width: '100%', background: '#131b2e', color: '#fbbf24', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', fontSize: '11px', fontWeight: 700, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Sinopse da Contracapa (Back Cover):</label>
                    <textarea
                      rows={3}
                      value={backSynopsis}
                      onChange={e => setBackSynopsis(e.target.value)}
                      style={{ width: '100%', background: '#131b2e', color: '#cbd5e1', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', fontSize: '11px', lineHeight: 1.4, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: VISUALIZADOR DA CAPA */}
              <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                
                {/* Seletor de Modo de Exibição */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setViewMode('wrap')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: viewMode === 'wrap' ? '#2563eb' : '#131b2e',
                        color: viewMode === 'wrap' ? '#ffffff' : '#94a3b8',
                        border: `1px solid ${viewMode === 'wrap' ? '#3b82f6' : '#1e293b'}`,
                        borderRadius: '6px',
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Layers size={14} /> Jaqueta Completa KDP
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode('front')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: viewMode === 'front' ? '#2563eb' : '#131b2e',
                        color: viewMode === 'front' ? '#ffffff' : '#94a3b8',
                        border: `1px solid ${viewMode === 'front' ? '#3b82f6' : '#1e293b'}`,
                        borderRadius: '6px',
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <FileImage size={14} /> Capa Frontal
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode('3d')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: viewMode === '3d' ? '#2563eb' : '#131b2e',
                        color: viewMode === '3d' ? '#ffffff' : '#94a3b8',
                        border: `1px solid ${viewMode === '3d' ? '#3b82f6' : '#1e293b'}`,
                        borderRadius: '6px',
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Box size={14} /> Mockup 3D
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleGenerateRealisticArt(Math.floor(Math.random() * 900000) + 100000)}
                      disabled={isGeneratingAiArt}
                      style={{
                        background: '#131b2e',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <RefreshCw size={12} className={isGeneratingAiArt ? 'spin-animate' : ''} />
                      Nova Arte
                    </button>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {trimCfg.widthInches}" x {trimCfg.heightInches}" • 300 DPI
                    </span>
                  </div>
                </div>

                {/* MODO 1: JAQUETA COMPLETA */}
                {viewMode === 'wrap' && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto', padding: '10px 0' }}>
                    <div style={{
                      display: 'flex',
                      background: '#090d16',
                      border: showKdpGuidelines ? '1px dashed #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
                      height: '520px',
                      position: 'relative'
                    }}>
                      {/* Guia KDP Tag */}
                      {showKdpGuidelines && (
                        <div style={{
                          position: 'absolute',
                          top: '-18px',
                          left: 0,
                          fontSize: '9px',
                          fontWeight: 700,
                          color: '#ef4444',
                          letterSpacing: '0.5px'
                        }}>
                          GABARITO TÉCNICO KDP (LINHAS DE CORTE E SANGRIA 0.125")
                        </div>
                      )}

                      {/* 1.1 Quarta-Capa (Back Cover) */}
                      <div style={{
                        width: '320px',
                        height: '100%',
                        padding: '30px 24px',
                        borderRight: showKdpGuidelines ? '1px dashed #ef4444' : '1px dashed rgba(255, 255, 255, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                        background: '#0c1220'
                      }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
                            SOBRE A OBRA
                          </div>
                          <div style={{
                            fontSize: '11px',
                            lineHeight: 1.6,
                            color: '#cbd5e1',
                            whiteSpace: 'pre-line',
                            fontFamily: 'Inter, sans-serif'
                          }}>
                            {backSynopsis || 'Apresente a essência do livro na contracapa para impactar os leitores.'}
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
                            padding: '6px 12px',
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
                        borderRight: showKdpGuidelines ? '1px dashed #ef4444' : '1px dashed rgba(255, 255, 255, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '24px 0',
                        boxSizing: 'border-box',
                        background: '#070b14'
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

                      {/* 1.3 Capa Frontal */}
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
                        {/* Scrim Adaptativo */}
                        {useDarkScrim && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: titlePosition === 'bottom'
                              ? 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.95) 100%)'
                              : titlePosition === 'center'
                              ? 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 45%, rgba(0,0,0,0.8) 55%, rgba(0,0,0,0.9) 100%)'
                              : 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.85) 100%)',
                            pointerEvents: 'none'
                          }} />
                        )}

                        {/* Conteúdo Tipográfico Integrado */}
                        <div style={{
                          position: 'relative',
                          zIndex: 2,
                          padding: '28px 22px',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: titlePosition === 'center' ? 'center' : 'space-between',
                          boxSizing: 'border-box',
                          textAlign: 'center'
                        }}>
                          {/* Bloco Superior (Quando título no topo ou badge) */}
                          <div style={{ order: titlePosition === 'bottom' ? 2 : 1 }}>
                            {showBadge && badgeText && (
                              <span style={{
                                display: 'inline-block',
                                background: 'rgba(0, 0, 0, 0.75)',
                                border: '1px solid #fbbf24',
                                color: '#fbbf24',
                                fontSize: '9px',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '20px',
                                letterSpacing: '0.8px',
                                backdropFilter: 'blur(4px)',
                                marginBottom: '10px'
                              }}>
                                {badgeText}
                              </span>
                            )}

                            {titlePosition !== 'bottom' && (
                              <>
                                <h1 style={{
                                  margin: '8px 0 6px 0',
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
                                    color: textColorTheme === 'gold' ? '#fde047' : textColorTheme === 'contrast' ? '#38bdf8' : '#cbd5e1',
                                    lineHeight: 1.3,
                                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)'
                                  }}>
                                    {subtitle}
                                  </p>
                                )}
                              </>
                            )}
                          </div>

                          {/* Bloco Inferior (Autor e Título quando na Base) */}
                          <div style={{ order: titlePosition === 'bottom' ? 1 : 2, marginTop: titlePosition === 'bottom' ? 'auto' : 0 }}>
                            {titlePosition === 'bottom' && (
                              <>
                                <h1 style={{
                                  margin: '0 0 6px 0',
                                  fontSize: '22px',
                                  fontWeight: 900,
                                  lineHeight: 1.15,
                                  color: '#ffffff',
                                  fontFamily: currentFont.font,
                                  textShadow: '0 2px 14px rgba(0, 0, 0, 0.95)'
                                }}>
                                  {title}
                                </h1>

                                {subtitle && (
                                  <p style={{
                                    margin: '0 0 12px 0',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    color: textColorTheme === 'gold' ? '#fde047' : textColorTheme === 'contrast' ? '#38bdf8' : '#cbd5e1',
                                    lineHeight: 1.3,
                                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)'
                                  }}>
                                    {subtitle}
                                  </p>
                                )}
                              </>
                            )}

                            <div style={{
                              fontSize: '13px',
                              fontWeight: 800,
                              color: textColorTheme === 'gold' ? '#fef08a' : '#ffffff',
                              fontFamily: currentFont.font,
                              letterSpacing: '1.5px',
                              textTransform: 'uppercase',
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
                    <CoverCanvasRenderer
                      concept={activeConcept}
                      title={title}
                      subtitle={subtitle}
                      author={author}
                      showBadge={showBadge}
                      badgeText={badgeText}
                      titlePosition={titlePosition}
                      textColorTheme={textColorTheme}
                      showKdpGuidelines={showKdpGuidelines}
                      style={{
                        width: '360px',
                        height: '540px',
                        borderRadius: '8px',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    />
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
                      {/* Scrim Adaptativo 3D */}
                      {useDarkScrim && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: titlePosition === 'bottom'
                            ? 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.95) 100%)'
                            : titlePosition === 'center'
                            ? 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 45%, rgba(0,0,0,0.8) 55%, rgba(0,0,0,0.9) 100%)'
                            : 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.85) 100%)'
                        }} />
                      )}

                      <div style={{
                        position: 'relative',
                        zIndex: 2,
                        padding: '26px 20px',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: titlePosition === 'center' ? 'center' : 'space-between',
                        boxSizing: 'border-box',
                        textAlign: 'center'
                      }}>
                        <div style={{ order: titlePosition === 'bottom' ? 2 : 1 }}>
                          {showBadge && badgeText && (
                            <span style={{
                              display: 'inline-block',
                              background: 'rgba(0, 0, 0, 0.75)',
                              border: '1px solid #fbbf24',
                              color: '#fbbf24',
                              fontSize: '9px',
                              fontWeight: 800,
                              padding: '3px 10px',
                              borderRadius: '20px',
                              marginBottom: '8px'
                            }}>
                              {badgeText}
                            </span>
                          )}

                          {titlePosition !== 'bottom' && (
                            <>
                              <h2 style={{
                                margin: '8px 0 6px 0',
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
                                <p style={{
                                  margin: 0,
                                  fontSize: '11px',
                                  color: textColorTheme === 'gold' ? '#fde047' : textColorTheme === 'contrast' ? '#38bdf8' : '#cbd5e1',
                                  textShadow: '0 2px 8px #000'
                                }}>
                                  {subtitle}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        <div style={{ order: titlePosition === 'bottom' ? 1 : 2, marginTop: titlePosition === 'bottom' ? 'auto' : 0 }}>
                          {titlePosition === 'bottom' && (
                            <>
                              <h2 style={{
                                margin: '0 0 6px 0',
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
                                <p style={{
                                  margin: '0 0 10px 0',
                                  fontSize: '11px',
                                  color: textColorTheme === 'gold' ? '#fde047' : textColorTheme === 'contrast' ? '#38bdf8' : '#cbd5e1',
                                  textShadow: '0 2px 8px #000'
                                }}>
                                  {subtitle}
                                </p>
                              )}
                            </>
                          )}

                          <div style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: textColorTheme === 'gold' ? '#fef08a' : '#ffffff',
                            fontFamily: currentFont.font,
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                            textShadow: '0 2px 10px #000'
                          }}>
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
          </>
        );
      })()}
    </div>
  );
};
