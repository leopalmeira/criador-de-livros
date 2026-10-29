import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Download, Sparkles, RefreshCw,
  Eye, CheckCircle2, ShieldCheck, Camera, Film, BookOpen, Layers,
  FileText, MessageSquare, Plus, Trash2, Edit3, Check, AlertCircle,
  Copy, Bookmark, ExternalLink, Image as ImageIcon, Sliders
} from 'lucide-react';
import JSZip from 'jszip';
import {
  CinematicNovelProjectData,
  CinematicPagePlan,
  CinematicDialogueItem
} from '../../../types/cinematic-novel';
import { CinematicNovelService } from '../../../services/cinematic-novel-service';
import {
  getRealisticCinematicSvgDataUrl,
  generateFrameVisualWithReplicate,
  generateCoverVisualWithReplicate
} from '../../../services/cinematic-frame-generator';
import { CinematicSceneAudioBar } from './CinematicSceneAudioBar';
import { cinematicAudioDirector } from '../../../services/cinematic-audio-director';

interface CinematicNovelEditorProps {
  project: CinematicNovelProjectData;
  onUpdateProject: (updated: CinematicNovelProjectData) => void;
  onBackToDashboard: () => void;
}

export const CinematicNovelEditor: React.FC<CinematicNovelEditorProps> = ({
  project,
  onUpdateProject,
  onBackToDashboard
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'paginas' | 'capa' | 'roteiro' | 'personagens' | 'exportar'>('paginas');
  
  // Estados de geração e carregamento
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState<boolean>(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Estados de edição inline da página
  const [editingNarration, setEditingNarration] = useState<boolean>(false);
  const [narrationDraft, setNarrationDraft] = useState<string>('');
  const [editingPrompt, setEditingPrompt] = useState<boolean>(false);
  const [promptDraft, setPromptDraft] = useState<string>('');

  // Estados de diálogo
  const [isAddingDialogue, setIsAddingDialogue] = useState<boolean>(false);
  const [dialogueSpeaker, setDialogueSpeaker] = useState<string>('');
  const [dialogueText, setDialogueText] = useState<string>('');

  // Referência para canvas de alta resolução
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showCanvasHd, setShowCanvasHd] = useState<boolean>(false);

  // Garante que as páginas e personagens sempre sejam arrays válidos
  const safePages = (project?.pages && Array.isArray(project.pages) && project.pages.length > 0)
    ? project.pages
    : CinematicNovelService.createDefaultInitialPages(project);

  const safePageIndex = Math.max(0, Math.min(currentPageIndex, safePages.length - 1));
  const currentPage: CinematicPagePlan = safePages[safePageIndex] || safePages[0];

  // Se o projeto recebido não tinha páginas, salva com as páginas seguras
  useEffect(() => {
    if (!project?.pages || !Array.isArray(project.pages) || project.pages.length === 0) {
      onUpdateProject({
        ...project,
        pages: safePages,
        updatedAt: Date.now()
      });
    }
  }, []);
  // Garante que todo som de fundo seja pausado ao sair da tela
  useEffect(() => {
    return () => {
      cinematicAudioDirector.stop();
      cinematicAudioDirector.stopReading();
    };
  }, []);

  const handleBack = () => {
    cinematicAudioDirector.stop();
    cinematicAudioDirector.stopReading();
    onBackToDashboard();
  };

  useEffect(() => {
    if (currentPage) {
      setNarrationDraft(currentPage.narrationText || '');
      setPromptDraft(currentPage.visualPrompt || '');
      setEditingNarration(false);
      setEditingPrompt(false);
      setIsAddingDialogue(false);
    }
  }, [currentPageIndex, currentPage?.id]);

  // Renderiza canvas de alta resolução quando requisitado
  useEffect(() => {
    if (showCanvasHd && previewCanvasRef.current && currentPage) {
      CinematicNovelService.renderPageToCanvas(
        previewCanvasRef.current,
        currentPage,
        project.title,
        700,
        1000
      ).catch(console.error);
    }
  }, [showCanvasHd, currentPageIndex, currentPage?.imageUrl, currentPage?.narrationText, currentPage?.dialogues]);

  const showNotice = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4500);
  };

  const goToPage = (idx: number) => {
    if (idx >= 0 && idx < safePages.length) {
      setCurrentPageIndex(idx);
    }
  };

  // ============================================================
  // 1. GERAÇÃO DE OUTRA FOTO COM REPLICATE FLUX (CENA ATUAL)
  // ============================================================
  const handleGenerateAnotherPhoto = async () => {
    if (!currentPage) return;
    setIsGeneratingPhoto(true);
    setStatusMessage('Gerando nova variação fotográfica 35mm via Replicate FLUX...');

    try {
      const promptToUse = promptDraft || currentPage.visualPrompt || currentPage.sceneSummary;
      const newImageUrl = await generateFrameVisualWithReplicate(
        promptToUse,
        currentPage.sceneSummary || 'cinematic',
        '3:4'
      );

      const currentHistory = currentPage.imageHistory || (currentPage.imageUrl ? [currentPage.imageUrl] : []);
      const updatedHistory = [newImageUrl, ...currentHistory.filter(url => url !== newImageUrl)];

      const updatedPages = [...safePages];
      updatedPages[safePageIndex] = {
        ...currentPage,
        imageUrl: newImageUrl,
        imageHistory: updatedHistory,
        visualPrompt: promptToUse,
        validationStatus: 'gerado',
        updatedAt: Date.now()
      };

      onUpdateProject({
        ...project,
        pages: updatedPages,
        updatedAt: Date.now()
      });

      showNotice('✓ Nova fotografia 35mm gerada com Replicate FLUX!');
    } catch (err: any) {
      alert(`Falha ao gerar foto: ${err?.message || 'Erro de conexão com Replicate'}`);
    } finally {
      setIsGeneratingPhoto(false);
    }
  };

  // Alterna para uma fotografia anterior do histórico da página
  const handleSelectHistoryImage = (imageUrl: string) => {
    if (!currentPage) return;
    const updatedPages = [...safePages];
    updatedPages[safePageIndex] = {
      ...currentPage,
      imageUrl,
      updatedAt: Date.now()
    };
    onUpdateProject({
      ...project,
      pages: updatedPages,
      updatedAt: Date.now()
    });
    showNotice('✓ Fotografia alterada para variação selecionada.');
  };

  // ============================================================
  // 2. GERAÇÃO DE OUTRA CAPA COM REPLICATE FLUX (CAPA ABERTA)
  // ============================================================
  const handleGenerateAnotherCover = async () => {
    setIsGeneratingCover(true);
    setStatusMessage('Gerando nova arte de capa cinematográfica via Replicate FLUX...');

    try {
      const newCoverUrl = await generateCoverVisualWithReplicate(
        project.title,
        project.genre,
        project.visualStyle
      );

      const currentHistory = project.coverImageHistory || (project.coverImageUrl ? [project.coverImageUrl] : []);
      const updatedHistory = [newCoverUrl, ...currentHistory.filter(url => url !== newCoverUrl)];

      onUpdateProject({
        ...project,
        coverImageUrl: newCoverUrl,
        coverImageHistory: updatedHistory,
        updatedAt: Date.now()
      });

      showNotice('✓ Nova Capa Cinematográfica gerada com sucesso via Replicate FLUX!');
    } catch (err: any) {
      alert(`Falha ao gerar capa: ${err?.message || 'Erro de conexão'}`);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleSelectHistoryCover = (coverUrl: string) => {
    onUpdateProject({
      ...project,
      coverImageUrl: coverUrl,
      updatedAt: Date.now()
    });
    showNotice('✓ Capa selecionada alterada.');
  };

  // ============================================================
  // 3. EDIÇÃO DE TEXTO DA PÁGINA (NARRAÇÃO E DIÁLOGOS)
  // ============================================================
  const handleSaveNarration = () => {
    if (!currentPage) return;
    const updatedPages = [...safePages];
    updatedPages[safePageIndex] = {
      ...currentPage,
      narrationText: narrationDraft,
      updatedAt: Date.now()
    };
    onUpdateProject({
      ...project,
      pages: updatedPages,
      updatedAt: Date.now()
    });
    setEditingNarration(false);
    showNotice('✓ Narração atualizada diretamente sobre a fotografia.');
  };

  const handleAddDialogue = () => {
    if (!currentPage || !dialogueText.trim()) return;
    const speaker = dialogueSpeaker.trim() || 'Personagem';
    const newDialogue: CinematicDialogueItem = {
      id: `dial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      speakerId: 'custom',
      speakerName: speaker,
      speechText: dialogueText.trim(),
      speechType: 'speech'
    };

    const currentDialogues = currentPage.dialogues || [];
    const updatedPages = [...safePages];
    updatedPages[safePageIndex] = {
      ...currentPage,
      dialogues: [...currentDialogues, newDialogue],
      updatedAt: Date.now()
    };

    onUpdateProject({
      ...project,
      pages: updatedPages,
      updatedAt: Date.now()
    });

    setDialogueText('');
    setIsAddingDialogue(false);
    showNotice(`✓ Diálogo de ${speaker} adicionado à fotografia.`);
  };

  const handleRemoveDialogue = (dialId: string) => {
    if (!currentPage) return;
    const updatedDialogues = (currentPage.dialogues || []).filter(d => d.id !== dialId);
    const updatedPages = [...safePages];
    updatedPages[safePageIndex] = {
      ...currentPage,
      dialogues: updatedDialogues,
      updatedAt: Date.now()
    };
    onUpdateProject({
      ...project,
      pages: updatedPages,
      updatedAt: Date.now()
    });
    showNotice('✓ Diálogo removido.');
  };

  const handleSavePrompt = () => {
    if (!currentPage) return;
    const updatedPages = [...safePages];
    updatedPages[safePageIndex] = {
      ...currentPage,
      visualPrompt: promptDraft,
      updatedAt: Date.now()
    };
    onUpdateProject({
      ...project,
      pages: updatedPages,
      updatedAt: Date.now()
    });
    setEditingPrompt(false);
    showNotice('✓ Prompt visual 35mm salvo. Clique em "Gerar Outra Foto" para aplicar.');
  };

  // ============================================================
  // 4. ADICIONAR / EXCLUIR PÁGINA
  // ============================================================
  const handleAddNewPage = () => {
    const newPageNumber = safePages.length + 1;
    const newPage: CinematicPagePlan = {
      id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      bookId: project.id,
      chapterNumber: currentPage?.chapterNumber || 1,
      chapterTitle: currentPage?.chapterTitle || 'Capítulo 1',
      pageNumber: newPageNumber,
      sceneSummary: `Nova cena fotográfica cinematográfica da página ${newPageNumber}`,
      previousNarrativeContext: 'Continuação imediata da cena anterior',
      dramaticObjective: 'Aprofundar a tensão e a atmosfera realista',
      charactersPresent: [],
      mandatoryVisualReferences: [],
      charactersAppearance: 'Consistente com a Character Bible',
      costumeAndProps: 'Roupas cotidianas realistas de cena',
      environmentSetting: 'Ambiente realista detalhado',
      timeAndLighting: 'Iluminação cinematográfica 35mm com sombras suaves',
      actionsAndExpressions: 'Expressão dramática natural',
      cameraFraming: 'plano-medio',
      imageComposition: 'Regra dos terços com espaço limpo para tipografia',
      requiredElements: [],
      persistentElements: [],
      narrationText: 'O silêncio preencheu o espaço enquanto as decisões tomadas começavam a cobrar o seu preço inescapável.',
      dialogues: [],
      speechAttribution: 'Direta na fotografia',
      textPlacementPlan: 'Base da imagem com sombra cinematográfica profunda',
      reservedVisualSpace: 'Terço inferior com gradiente de contraste',
      validationCriteria: ['Fotografia nítida', 'Texto integrado sem caixa branca'],
      visualPrompt: `${project.title}, cena dramática 35mm, ${project.visualStyle}, fotografia realista, 8k, cinematográfico`,
      negativePrompt: 'desenho, 3d, anime, caixa branca, balao de fala, watermark, blurry',
      layoutType: 'single_hero',
      isApproved: false,
      validationStatus: 'planejado',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updatedPages = [...safePages, newPage];
    onUpdateProject({
      ...project,
      pages: updatedPages,
      approximatePages: updatedPages.length,
      updatedAt: Date.now()
    });

    setCurrentPageIndex(updatedPages.length - 1);
    showNotice(`✓ Página ${newPageNumber} adicionada com sucesso!`);
  };

  const handleDeletePage = (pageIdx: number) => {
    if (safePages.length <= 1) {
      alert('O Foto Livro precisa ter no mínimo 1 página.');
      return;
    }
    if (!confirm(`Tem certeza que deseja excluir a página ${pageIdx + 1}?`)) return;

    const remainingPages = safePages.filter((_, idx) => idx !== pageIdx).map((p, idx) => ({
      ...p,
      pageNumber: idx + 1
    }));

    onUpdateProject({
      ...project,
      pages: remainingPages,
      approximatePages: remainingPages.length,
      updatedAt: Date.now()
    });

    if (currentPageIndex >= remainingPages.length) {
      setCurrentPageIndex(remainingPages.length - 1);
    }
    showNotice('✓ Página removida e numeração reordenada.');
  };

  // ============================================================
  // 5. EXPORTAÇÃO COMPLETA KDP (PDF 300 DPI + CAPA + PACOTE ZIP)
  // ============================================================
  const handleExportPdfFullBleed = async () => {
    setIsExporting(true);
    setStatusMessage('Compilando Foto Livro Realista em PDF Full Bleed 300 DPI (sem caixas brancas)...');
    try {
      const blob = await CinematicNovelService.exportPdfFullBleed({ ...project, pages: safePages });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_MIOLO_FOTOLIVRO_300DPI_KDP.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showNotice('✓ Miolo PDF Full Bleed baixado com sucesso!');
    } catch (err: any) {
      alert(`Erro ao compilar PDF: ${err?.message || 'Falha na compilação'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCoverPdf = async () => {
    setIsExporting(true);
    setStatusMessage('Compilando Capa Aberta KDP (Full-Wrap Cover) com lombada calculada...');
    try {
      const blob = await CinematicNovelService.exportCoverPdf({ ...project, pages: safePages });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_CAPA_ABERTA_KDP.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showNotice('✓ Capa Aberta KDP baixada com sucesso!');
    } catch (err: any) {
      alert(`Erro ao compilar Capa: ${err?.message || 'Falha na compilação'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportFullZip = async () => {
    setIsExporting(true);
    setStatusMessage('Gerando Pacote Completo KDP (Miolo PDF + Capa Aberta + Metadados)...');
    try {
      const zip = new JSZip();

      // 1. Miolo PDF
      const interiorBlob = await CinematicNovelService.exportPdfFullBleed({ ...project, pages: safePages });
      zip.file(`${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_MIOLO_KDP.pdf`, interiorBlob);

      // 2. Capa PDF
      const coverBlob = await CinematicNovelService.exportCoverPdf({ ...project, pages: safePages });
      zip.file(`${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_CAPA_ABERTA_KDP.pdf`, coverBlob);

      // 3. Ficha Técnica e Palavras-Chave Amazon KDP
      const metadataTxt = `=====================================================
FICHA DE PUBLICAÇÃO AMAZON KDP • FOTO LIVRO REALISTA
=====================================================

Título: ${project.title}
Subtítulo: ${project.subtitle}
Autor: ${project.author}
Gênero: ${project.genre} (${project.subgenre})
Idioma: ${project.language}
Faixa Etária: ${project.targetAudience}

FORMATO DE IMPRESSÃO:
- Dimensões de Corte: 7 x 10 polegadas (17,78 x 25,4 cm)
- Acabamento do Miolo: Colorido Premium (Sangria / Bleed: ATIVADA)
- Tipo de Capa: Capa Comum com Brilho / Fosco
- Total de Páginas: ${project.pages.length}

DESCRIÇÃO / SINOPSE PARA O KDP:
${project.storyBible?.synopsis || project.premise}

7 PALAVRAS-CHAVE ESTRATÉGICAS KDP:
1. Foto Livro Realista
2. Romance Fotográfico 35mm
3. ${project.genre}
4. Fotografia Cinematográfica
5. Graphic Novel Realista
6. Livro Ilustrado Adulto
7. Livro de Ficção Visual

CATEGORIAS RECOMENDADAS:
- Ficção > Suspense & Mistério
- Artes & Fotografia > Fotografia Cinematográfica
`;
      zip.file('METADADOS_E_PALAVRAS_CHAVE_KDP.txt', metadataTxt);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_PACOTE_COMPLETO_KDP.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showNotice('✓ Pacote Completo KDP gerado com sucesso!');
    } catch (err: any) {
      alert(`Erro ao gerar ZIP: ${err?.message || 'Falha no empacotamento'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Fallback seguro de imagem fotográfica que nunca quebra
  const fallbackSvg = getRealisticCinematicSvgDataUrl(
    currentPage.visualPrompt || currentPage.sceneSummary,
    currentPage.sceneSummary || 'bedroom'
  );
  const activeImage = currentPage.imageUrl || fallbackSvg;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090d16',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* ============================================================ */}
      {/* 1. HEADER DO ESTÚDIO DO FOTO LIVRO REALISTA */}
      {/* ============================================================ */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={handleBack}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              padding: '7px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600
            }}
          >
            <ArrowLeft size={16} /> Dashboard
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#0f172a',
                fontSize: 10,
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: 4,
                letterSpacing: '0.05em'
              }}>
                FOTO LIVRO REALISTA • 35MM
              </span>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#ffffff' }}>
                {project.title}
              </h2>
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {project.genre} • {safePages.length} Páginas Fotográficas • Formato KDP 7x10" Full-Bleed Colorido
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS PRINCIPAIS */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(0, 0, 0, 0.4)', padding: 4, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setActiveTab('paginas')}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'paginas' ? '#2563eb' : 'transparent',
              color: activeTab === 'paginas' ? '#ffffff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Eye size={14} /> 📸 Páginas Fotográficas
          </button>

          <button
            onClick={() => setActiveTab('capa')}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'capa' ? '#2563eb' : 'transparent',
              color: activeTab === 'capa' ? '#ffffff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <BookOpen size={14} /> 🎨 Capa Bestseller KDP
          </button>

          <button
            onClick={() => setActiveTab('roteiro')}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'roteiro' ? '#2563eb' : 'transparent',
              color: activeTab === 'roteiro' ? '#ffffff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <FileText size={14} /> 📖 Premissa & Roteiro
          </button>

          <button
            onClick={() => setActiveTab('personagens')}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'personagens' ? '#2563eb' : 'transparent',
              color: activeTab === 'personagens' ? '#ffffff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Layers size={14} /> 👥 Personagens ({project.characters?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('exportar')}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'exportar' ? '#10b981' : 'transparent',
              color: activeTab === 'exportar' ? '#ffffff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Download size={14} /> 🚀 Compilação & Download
          </button>
        </div>

        {/* BOTÃO RÁPIDO DE EXPORTAÇÃO */}
        <button
          onClick={handleExportPdfFullBleed}
          disabled={isExporting}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#0f172a',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
          }}
        >
          <Download size={15} /> {isExporting ? 'Processando...' : 'Exportar PDF 300 DPI'}
        </button>
      </header>

      {/* NOTIFICAÇÃO DE STATUS */}
      {statusMessage && (
        <div style={{
          background: 'linear-gradient(90deg, #1e293b, #0f172a)',
          color: '#38bdf8',
          borderBottom: '1px solid #38bdf8',
          padding: '8px 24px',
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'center',
          letterSpacing: '0.02em'
        }}>
          {statusMessage}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. CORPO PRINCIPAL COM CONTEÚDO DAS ABAS */}
      {/* ============================================================ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ============================================================ */}
        {/* ABA 1: PÁGINAS FOTOGRÁFICAS (TEXTO DENTRO DA IMAGEM SEM CAIXA BRANCA) */}
        {/* ============================================================ */}
        {activeTab === 'paginas' && (
          <div style={{ flex: 1, display: 'flex', gap: 24, padding: 24, overflowY: 'auto' }}>
            
            {/* COLUNA ESQUERDA: PÁGINA COM TEXTO DENTRO DA FOTOGRAFIA */}
            <div style={{ flex: '0 0 620px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {/* CARTÃO DA PÁGINA (PADRÃO 7X10" KDP FULL BLEED) */}
              <div style={{
                width: 580,
                height: 820,
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.12)',
                background: '#020617',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* 1. A FOTOGRAFIA REALISTA 35MM OCUPA 100% DA PÁGINA */}
                <img
                  src={activeImage}
                  alt={currentPage.sceneSummary}
                  onError={(e) => {
                    if (e.currentTarget.src !== fallbackSvg) {
                      e.currentTarget.src = fallbackSvg;
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />

                {/* 2. VINHETA / FADE NATURAL NA BASE (SEM NENHUMA CAIXA BRANCA OU BOX SEPARADO!) */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: '55%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0) 100%)',
                  pointerEvents: 'none'
                }} />

                {/* 3. TÍTULO DO CAPÍTULO / LIVRO NO TOPO DIRETAMENTE SOBRE A FOTO */}
                <div style={{
                  position: 'relative',
                  zIndex: 2,
                  padding: '24px 28px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div>
                    <h3 style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 900,
                      color: '#ffffff',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      fontFamily: 'Merriweather, Georgia, serif',
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.95)'
                    }}>
                      {project.title}
                    </h3>
                    <span style={{
                      fontSize: 12,
                      color: '#cbd5e1',
                      fontStyle: 'italic',
                      textShadow: '0 2px 6px rgba(0, 0, 0, 0.95)'
                    }}>
                      {currentPage.chapterTitle || `Capítulo ${currentPage.chapterNumber}`}
                    </span>
                  </div>

                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.8)',
                    background: 'rgba(0, 0, 0, 0.5)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    backdropFilter: 'blur(4px)'
                  }}>
                    Pág. {currentPage.pageNumber}
                  </span>
                </div>

                {/* 4. TEXTO LITERÁRIO E DIÁLOGOS DIRETAMENTE DENTRO DA IMAGEM NA BASE */}
                <div style={{
                  position: 'relative',
                  zIndex: 2,
                  marginTop: 'auto',
                  padding: '20px 28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  {/* NARRAÇÃO LITERÁRIA DIRETA NA FOTOGRAFIA (ZERO CAIXA BRANCA, ZERO BOX!) */}
                  {currentPage.narrationText && (
                    <div style={{
                      color: '#f8fafc',
                      fontFamily: 'Merriweather, Georgia, serif',
                      fontSize: 14.5,
                      lineHeight: 1.65,
                      textShadow: '0 2px 10px rgba(0, 0, 0, 0.98), 0 1px 3px rgba(0, 0, 0, 0.9)'
                    }}>
                      {currentPage.narrationText}
                    </div>
                  )}

                  {/* DIÁLOGOS DIRETOS SOBRE A FOTOGRAFIA (ZERO BALÕES DE FALA!) */}
                  {currentPage.dialogues && currentPage.dialogues.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {currentPage.dialogues.map((dial) => (
                        <div key={dial.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{
                            color: '#fde68a',
                            fontWeight: 800,
                            fontSize: 13,
                            fontFamily: 'Merriweather, Georgia, serif',
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.95)',
                            textTransform: 'uppercase'
                          }}>
                            {dial.speakerName}:
                          </span>
                          <span style={{
                            color: '#ffffff',
                            fontStyle: 'italic',
                            fontSize: 14,
                            fontFamily: 'Merriweather, Georgia, serif',
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.95)',
                            lineHeight: 1.45
                          }}>
                            "{dial.speechText}"
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* RODAPÉ EDITORIAL COM NÚMERO DA PÁGINA */}
                  <div style={{
                    marginTop: 6,
                    textAlign: 'center',
                    fontSize: 11,
                    color: 'rgba(255, 255, 255, 0.65)',
                    fontWeight: 700,
                    letterSpacing: '0.1em'
                  }}>
                    — {currentPage.pageNumber} —
                  </div>
                </div>
              </div>

              {/* CONTROLES DE NAVEGAÇÃO DE PÁGINAS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
                <button
                  onClick={() => goToPage(currentPageIndex - 1)}
                  disabled={currentPageIndex === 0}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: 8,
                    cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    opacity: currentPageIndex === 0 ? 0.35 : 1
                  }}
                >
                  <ChevronLeft size={16} /> Anterior
                </button>

                <span style={{ fontSize: 13, fontWeight: 800, color: '#94a3b8' }}>
                  Página {safePageIndex + 1} de {safePages.length}
                </span>

                <button
                  onClick={() => goToPage(safePageIndex + 1)}
                  disabled={safePageIndex >= safePages.length - 1}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: 8,
                    cursor: safePageIndex >= safePages.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    opacity: safePageIndex >= safePages.length - 1 ? 0.35 : 1
                  }}
                >
                  Próxima <ChevronRight size={16} />
                </button>

                <button
                  onClick={handleAddNewPage}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    padding: '8px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700
                  }}
                  title="Adicionar nova página fotográfica"
                >
                  <Plus size={15} /> Nova Página
                </button>
              </div>

              {/* BARRA DE ÁUDIO CINEMATOGRÁFICO AUTOMÁTICO (SOM DE FUNDO & AUDIOLIVRO) */}
              <CinematicSceneAudioBar
                currentPage={currentPage}
                projectGenre={project.genre}
                projectEmotionalTone={project.emotionalTone}
              />

              {/* MODAL / VISUALIZADOR HD CANVAS */}
              {showCanvasHd && (
                <div style={{ marginTop: 16, width: '100%', textAlign: 'center' }}>
                  <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    Canvas de Renderização HD 300 DPI:
                  </span>
                  <canvas
                    ref={previewCanvasRef}
                    style={{
                      maxWidth: '100%',
                      borderRadius: 8,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
                    }}
                  />
                </div>
              )}
            </div>

            {/* COLUNA DIREITA: FERRAMENTAS REPLICATE FLUX, EDIÇÃO DE TEXTO E HISTÓRICO */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* 1. CARD PRINCIPAL DE GERAÇÃO COM REPLICATE FLUX */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
                borderRadius: 14,
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#38bdf8'
                    }}>
                      MOTOR DE FOTOGRAFIA 35MM
                    </span>
                    <h3 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 800, color: '#ffffff' }}>
                      Cena da Página {currentPage.pageNumber}
                    </h3>
                  </div>

                  <button
                    onClick={() => setShowCanvasHd(!showCanvasHd)}
                    style={{
                      background: showCanvasHd ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      padding: '5px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {showCanvasHd ? 'Ocultar Canvas HD' : 'Ver Canvas HD'}
                  </button>
                </div>

                {/* BOTÃO PROEMINENTE: GERAR OUTRA FOTO COM REPLICATE FLUX */}
                <button
                  onClick={handleGenerateAnotherPhoto}
                  disabled={isGeneratingPhoto}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '12px 20px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: isGeneratingPhoto ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    boxShadow: '0 4px 18px rgba(37, 99, 235, 0.4)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <RefreshCw size={17} className={isGeneratingPhoto ? 'animate-spin' : ''} />
                  {isGeneratingPhoto ? 'Gerando Fotografia no Replicate FLUX...' : '🔄 Gerar Outra Foto com Replicate FLUX'}
                </button>

                {/* HISTÓRICO DE VARIAÇÕES DESTA PÁGINA */}
                {currentPage.imageHistory && currentPage.imageHistory.length > 1 && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 8 }}>
                      Variações fotográficas geradas para esta página ({currentPage.imageHistory.length}):
                    </span>
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
                      {currentPage.imageHistory.map((histUrl, hIdx) => {
                        const isSelected = histUrl === currentPage.imageUrl;
                        return (
                          <div
                            key={hIdx}
                            onClick={() => handleSelectHistoryImage(histUrl)}
                            style={{
                              width: 64,
                              height: 84,
                              borderRadius: 6,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
                              boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.5)' : 'none',
                              flexShrink: 0,
                              position: 'relative'
                            }}
                            title={`Variação ${hIdx + 1}`}
                          >
                            <img
                              src={histUrl}
                              alt={`Variação ${hIdx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {isSelected && (
                              <div style={{
                                position: 'absolute',
                                bottom: 2,
                                right: 2,
                                background: '#38bdf8',
                                color: '#0f172a',
                                borderRadius: 999,
                                width: 14,
                                height: 14,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 9,
                                fontWeight: 900
                              }}>
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. CARD DE EDIÇÃO DIRETA DO TEXTO (NARRAÇÃO E DIÁLOGOS) */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.75)',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
                    ✍️ Textos Sobrepostos na Fotografia
                  </h4>
                  <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>
                    100% Sem Caixa Branca
                  </span>
                </div>

                {/* CAMPO DE NARRAÇÃO */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                      Narração Literária da Cena:
                    </label>
                    {editingNarration ? (
                      <button
                        onClick={handleSaveNarration}
                        style={{
                          background: '#10b981',
                          border: 'none',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Salvar
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingNarration(true)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11
                        }}
                      >
                        <Edit3 size={12} /> Editar
                      </button>
                    )}
                  </div>

                  {editingNarration ? (
                    <textarea
                      rows={4}
                      value={narrationDraft}
                      onChange={(e) => setNarrationDraft(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#090d16',
                        border: '1px solid #38bdf8',
                        borderRadius: 8,
                        color: '#f8fafc',
                        padding: 10,
                        fontSize: 13,
                        lineHeight: 1.5,
                        boxSizing: 'border-box'
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => setEditingNarration(true)}
                      style={{
                        background: '#0a0f1d',
                        border: '1px solid #1e293b',
                        borderRadius: 8,
                        padding: '10px 14px',
                        fontSize: 13,
                        color: '#cbd5e1',
                        lineHeight: 1.5,
                        cursor: 'pointer'
                      }}
                    >
                      {currentPage.narrationText || <em style={{ color: '#64748b' }}>Clique para adicionar narração à fotografia...</em>}
                    </div>
                  )}
                </div>

                {/* DIÁLOGOS DA CENA */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
                      Diálogos dos Personagens:
                    </label>
                    <button
                      onClick={() => setIsAddingDialogue(!isAddingDialogue)}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: '#38bdf8',
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Plus size={12} /> {isAddingDialogue ? 'Cancelar' : 'Adicionar Fala'}
                    </button>
                  </div>

                  {/* FORMULÁRIO DE NOVO DIÁLOGO */}
                  {isAddingDialogue && (
                    <div style={{
                      background: '#0a0f1d',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      marginBottom: 10
                    }}>
                      <input
                        type="text"
                        placeholder="Nome do Personagem (ex: HELENA)"
                        value={dialogueSpeaker}
                        onChange={(e) => setDialogueSpeaker(e.target.value)}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          color: '#fff',
                          padding: '6px 10px',
                          fontSize: 12
                        }}
                      />
                      <textarea
                        rows={2}
                        placeholder="Fala do personagem..."
                        value={dialogueText}
                        onChange={(e) => setDialogueText(e.target.value)}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          color: '#fff',
                          padding: '6px 10px',
                          fontSize: 12
                        }}
                      />
                      <button
                        onClick={handleAddDialogue}
                        style={{
                          alignSelf: 'flex-end',
                          background: '#2563eb',
                          border: 'none',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Inserir Diálogo na Foto
                      </button>
                    </div>
                  )}

                  {/* LISTA DE DIÁLOGOS ATUAIS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(currentPage.dialogues || []).length === 0 ? (
                      <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                        Nenhum diálogo nesta cena (somente narração fotográfica).
                      </span>
                    ) : (
                      currentPage.dialogues.map((dial) => (
                        <div
                          key={dial.id}
                          style={{
                            background: '#0a0f1d',
                            border: '1px solid #1e293b',
                            borderRadius: 6,
                            padding: '8px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ fontSize: 12 }}>
                            <strong style={{ color: '#fde68a' }}>{dial.speakerName}:</strong>{' '}
                            <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>"{dial.speechText}"</span>
                          </div>
                          <button
                            onClick={() => handleRemoveDialogue(dial.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: 4
                            }}
                            title="Remover fala"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* CAMPO DE PROMPT VISUAL 35MM DO REPLICATE */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#a855f7' }}>
                      Prompt Visual 35mm (Replicate FLUX):
                    </label>
                    {editingPrompt ? (
                      <button
                        onClick={handleSavePrompt}
                        style={{
                          background: '#9333ea',
                          border: 'none',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Salvar Prompt
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingPrompt(true)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11
                        }}
                      >
                        <Edit3 size={12} /> Editar
                      </button>
                    )}
                  </div>

                  {editingPrompt ? (
                    <textarea
                      rows={3}
                      value={promptDraft}
                      onChange={(e) => setPromptDraft(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#090d16',
                        border: '1px solid #a855f7',
                        borderRadius: 8,
                        color: '#f8fafc',
                        padding: 10,
                        fontSize: 12,
                        lineHeight: 1.4,
                        fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => setEditingPrompt(true)}
                      style={{
                        background: '#0a0f1d',
                        border: '1px solid #1e293b',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 12,
                        color: '#94a3b8',
                        fontFamily: 'monospace',
                        lineHeight: 1.4,
                        cursor: 'pointer'
                      }}
                    >
                      {currentPage.visualPrompt}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. GRADE DE TODAS AS PÁGINAS DO LIVRO */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px 20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 800 }}>
                    Grade de Páginas ({safePages.length})
                  </span>
                  {safePages.length > 1 && (
                    <button
                      onClick={() => handleDeletePage(safePageIndex)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11
                      }}
                    >
                      <Trash2 size={12} /> Excluir Pág. {currentPage.pageNumber}
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: 8 }}>
                  {safePages.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => goToPage(idx)}
                      style={{
                        height: 52,
                        borderRadius: 6,
                        border: idx === safePageIndex ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: idx === safePageIndex ? '#2563eb' : '#1e293b',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2
                      }}
                      title={`Página ${p.pageNumber}: ${p.sceneSummary}`}
                    >
                      <span>{p.pageNumber}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 2: CAPA BESTSELLER KDP (FULL-WRAP COVER COM REPLICATE) */}
        {/* ============================================================ */}
        {activeTab === 'capa' && (
          <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
            <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: 11,
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: 4
                  }}>
                    PADRÃO BEST-SELLER AMAZON KDP
                  </span>
                  <h3 style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 900, color: '#ffffff' }}>
                    Capa Aberta Completa (Full-Wrap Cover)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                    Composta por Contracapa, Lombada milimétrica e Capa Frontal fotográfica em 300 DPI, sem bordas brancas ou caixas de texto cortadas.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleGenerateAnotherCover}
                    disabled={isGeneratingCover}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                      border: 'none',
                      color: '#fff',
                      padding: '10px 18px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: isGeneratingCover ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                    }}
                  >
                    <RefreshCw size={15} className={isGeneratingCover ? 'animate-spin' : ''} />
                    {isGeneratingCover ? 'Gerando no Replicate...' : '🔄 Gerar Outra Capa com Replicate FLUX'}
                  </button>

                  <button
                    onClick={handleExportCoverPdf}
                    disabled={isExporting}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      border: 'none',
                      color: '#0f172a',
                      padding: '10px 18px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <Download size={15} /> Baixar Capa Aberta PDF KDP
                  </button>
                </div>
              </div>

              {/* PRÉVIA VISUAL DA CAPA ABERTA (CONTRACAPA + LOMBADA + CAPA FRONTAL) */}
              <div style={{
                background: '#090d16',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
                overflow: 'hidden',
                display: 'flex',
                height: 520,
                position: 'relative'
              }}>
                {/* 1. CONTRACAPA (LADO ESQUERDO) */}
                <div style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                  padding: '36px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRight: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div>
                    <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b', fontWeight: 800 }}>
                      Foto Livro Realista • Edição de Colecionador
                    </span>
                    <h4 style={{ margin: '10px 0', fontSize: 20, fontWeight: 900, color: '#fef3c7', fontFamily: 'Merriweather, serif' }}>
                      UMA NARRATIVA CINEMATOGRÁFICA
                    </h4>
                    <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, fontFamily: 'Merriweather, serif' }}>
                      {project.storyBible?.synopsis || project.premise}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 16 }}>
                    <div>
                      <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>Gênero: {project.genre}</span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>Fotografia 35mm Realista</span>
                    </div>
                    {/* ESPAÇO RESERVADO DE CÓDIGO DE BARRAS KDP */}
                    <div style={{
                      background: '#ffffff',
                      color: '#000',
                      padding: '8px 12px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      textAlign: 'center'
                    }}>
                      [ CÓDIGO DE BARRAS KDP ]
                    </div>
                  </div>
                </div>

                {/* 2. LOMBADA (SPINE MILIMÉTRICA) */}
                <div style={{
                  width: 38,
                  background: '#090d16',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: '1px solid rgba(255, 255, 255, 0.15)',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  padding: '20px 0',
                  gap: 16
                }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#ffffff', letterSpacing: '0.08em' }}>
                    {project.title.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>
                    {project.author}
                  </span>
                </div>

                {/* 3. CAPA FRONTAL (LADO DIREITO - DESTAQUE FOTOGRÁFICO SEM CAIXA BRANCA) */}
                <div style={{
                  flex: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '36px 32px'
                }}>
                  {/* FOTOGRAFIA DE CAPA VIA REPLICATE */}
                  {project.coverImageUrl ? (
                    <img
                      src={project.coverImageUrl}
                      alt={project.title}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle at center, #1e1b4b 0%, #020617 100%)'
                    }} />
                  )}

                  {/* GRADIENTE SUAVE PARA O TÍTULO */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '55%',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                    pointerEvents: 'none'
                  }} />

                  {/* GRADIENTE SUAVE PARA O AUTOR NA BASE */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '40%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                    pointerEvents: 'none'
                  }} />

                  {/* TÍTULO E SUBTÍTULO SOBRE A FOTOGRAFIA */}
                  <div style={{ position: 'relative', zIndex: 2 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: '#fbbf24',
                      textShadow: '0 2px 6px rgba(0, 0, 0, 0.95)'
                    }}>
                      ROMANCE CINEMATOGRÁFICO
                    </span>
                    <h1 style={{
                      margin: '6px 0 0',
                      fontSize: 32,
                      fontWeight: 900,
                      color: '#ffffff',
                      letterSpacing: '-0.02em',
                      fontFamily: 'Merriweather, Georgia, serif',
                      lineHeight: 1.15,
                      textShadow: '0 2px 14px rgba(0, 0, 0, 0.98), 0 0 30px rgba(0,0,0,0.8)'
                    }}>
                      {project.title.toUpperCase()}
                    </h1>
                    <span style={{
                      fontSize: 14,
                      color: '#fef3c7',
                      fontStyle: 'italic',
                      fontFamily: 'Merriweather, Georgia, serif',
                      display: 'block',
                      marginTop: 4,
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.95)'
                    }}>
                      {project.subtitle || 'Foto Livro Realista'}
                    </span>
                  </div>

                  {/* AUTOR NO RODAPÉ */}
                  <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: '#f8fafc',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.95)'
                    }}>
                      {project.author || 'Leandro Palmeira'}
                    </span>
                  </div>
                </div>
              </div>

              {/* HISTÓRICO DE CAPAS GERADAS */}
              {project.coverImageHistory && project.coverImageHistory.length > 1 && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderRadius: 12,
                  padding: 18,
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 10 }}>
                    Variações de Capa Salvas no Histórico ({project.coverImageHistory.length}):
                  </span>
                  <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }}>
                    {project.coverImageHistory.map((cUrl, idx) => {
                      const isSelected = cUrl === project.coverImageUrl;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectHistoryCover(cUrl)}
                          style={{
                            width: 100,
                            height: 140,
                            borderRadius: 8,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: isSelected ? '3px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: isSelected ? '0 0 16px rgba(245, 158, 11, 0.5)' : 'none',
                            flexShrink: 0,
                            position: 'relative'
                          }}
                        >
                          <img
                            src={cUrl}
                            alt={`Capa ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              background: '#f59e0b',
                              color: '#0f172a',
                              borderRadius: 999,
                              width: 18,
                              height: 18,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 900
                            }}>
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 3: PREMISSA & ROTEIRO */}
        {/* ============================================================ */}
        {activeTab === 'roteiro' && (
          <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
            <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 18
              }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                  📖 Premissa & Parâmetros Narrativos
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                      Título do Foto Livro:
                    </label>
                    <input
                      type="text"
                      value={project.title}
                      onChange={(e) => onUpdateProject({ ...project, title: e.target.value })}
                      style={{
                        width: '100%',
                        background: '#090d16',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        color: '#fff',
                        padding: '8px 12px',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                      Autor(a):
                    </label>
                    <input
                      type="text"
                      value={project.author}
                      onChange={(e) => onUpdateProject({ ...project, author: e.target.value })}
                      style={{
                        width: '100%',
                        background: '#090d16',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        color: '#fff',
                        padding: '8px 12px',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Estilo Visual Fotográfico:
                  </label>
                  <input
                    type="text"
                    value={project.visualStyle}
                    onChange={(e) => onUpdateProject({ ...project, visualStyle: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#090d16',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#fff',
                      padding: '8px 12px',
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Premissa & Sinopse da História:
                  </label>
                  <textarea
                    rows={6}
                    value={project.premise}
                    onChange={(e) => onUpdateProject({ ...project, premise: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#090d16',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#fff',
                      padding: '10px 12px',
                      fontSize: 13,
                      lineHeight: 1.5,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 4: PERSONAGENS COM CONSISTÊNCIA VISUAL */}
        {/* ============================================================ */}
        {activeTab === 'personagens' && (
          <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
            <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
                  Fichas de Consistência Visual dos Personagens
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                  Garante a consistência de rosto, corte de cabelo e vestimenta ao gerar imagens com o Replicate FLUX.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 18 }}>
                {(project.characters || []).map((char) => (
                  <div
                    key={char.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.85)',
                      borderRadius: 12,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      padding: 18,
                      display: 'flex',
                      gap: 16
                    }}
                  >
                    <div style={{
                      width: 110,
                      height: 150,
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '#1e293b',
                      flexShrink: 0
                    }}>
                      {char.referenceImageUrl ? (
                        <img src={char.referenceImageUrl} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          <Camera size={24} />
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 15, color: '#fff' }}>{char.name}</strong>
                        <span style={{ fontSize: 10, background: '#2563eb', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>
                          {char.role}
                        </span>
                      </div>
                      <div style={{ color: '#cbd5e1' }}><strong>Idade:</strong> {char.age} • {char.heightAndBuild}</div>
                      <div style={{ color: '#cbd5e1' }}><strong>Rosto & Olhos:</strong> {char.faceShape}, {char.eyes}</div>
                      <div style={{ color: '#cbd5e1' }}><strong>Cabelo:</strong> {char.hair}</div>
                      <div style={{ color: '#94a3b8', marginTop: 'auto' }}><em>{char.personality}</em></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 5: COMPILAÇÃO & DOWNLOAD KDP */}
        {/* ============================================================ */}
        {activeTab === 'exportar' && (
          <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
            <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 4
                }}>
                  PRONTO PARA PUBLICAÇÃO IMEDIATA
                </span>
                <h3 style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 900, color: '#ffffff' }}>
                  Pacote Oficial Amazon KDP (Colorido Premium)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                  Arquivos formatados estritamente nas regras oficiais do KDP: 7x10 polegadas, sangria ativa de 0.125", resolução de 300 DPI e textos sobrepostos na fotografia sem caixas brancas.
                </p>
              </div>

              {/* CARD DOS 3 BOTÕES DE DOWNLOAD */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <button
                  onClick={handleExportPdfFullBleed}
                  disabled={isExporting}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#fff',
                    padding: '16px 24px',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Download size={20} />
                    <div style={{ textAlign: 'left' }}>
                      <div>📥 Baixar Miolo PDF Full Bleed (300 DPI)</div>
                      <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 500 }}>
                        {project.pages.length} páginas fotográficas com textos sobrepostos sem caixas brancas
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} />
                </button>

                <button
                  onClick={handleExportCoverPdf}
                  disabled={isExporting}
                  style={{
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    border: 'none',
                    color: '#fff',
                    padding: '16px 24px',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 16px rgba(217, 119, 6, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <BookOpen size={20} />
                    <div style={{ textAlign: 'left' }}>
                      <div>🎨 Baixar Capa Aberta PDF KDP (Full-Wrap Cover)</div>
                      <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 500 }}>
                        Lombada calculada milimetricamente, contracapa e capa frontal Replicate FLUX
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} />
                </button>

                <button
                  onClick={handleExportFullZip}
                  disabled={isExporting}
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    border: 'none',
                    color: '#fff',
                    padding: '16px 24px',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 16px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Layers size={20} />
                    <div style={{ textAlign: 'left' }}>
                      <div>📦 Baixar Pacote Completo ZIP (Miolo + Capa + Metadados KDP)</div>
                      <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 500 }}>
                        Tudo empacotado com as 7 palavras-chave estratégicas para publicação na Amazon
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* CHECKLIST DE CONFORMIDADE KDP */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: 20
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
                  ✓ Checklist de Validação Técnica Amazon KDP
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#34d399', fontWeight: 900 }}>✓</span>
                    <span>Zero caixas brancas, caixas cinzas ou balões de quadrinhos (texto impresso direto na foto).</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#34d399', fontWeight: 900 }}>✓</span>
                    <span>Resolução de impressão a 300 DPI ultra-nítida.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#34d399', fontWeight: 900 }}>✓</span>
                    <span>Sangria (Bleed) de 0,125 polegadas milimetricamente integrada.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#34d399', fontWeight: 900 }}>✓</span>
                    <span>Lombada calculada automaticamente pelo número de páginas.</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
