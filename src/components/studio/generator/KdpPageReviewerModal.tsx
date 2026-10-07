import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, Edit3, Check, X,
  Download, AlertTriangle, Sparkles, RefreshCw, CheckCircle2,
  FileText, ArrowRight, Eye, ShieldCheck, Layers, Maximize2,
  Sliders, Image as ImageIcon, SlidersHorizontal, Save, RotateCcw,
  Sparkle, Compass, Palette
} from 'lucide-react';
import { chamarGeminiTexto } from '../../../services/kdp-ai-engine';
import { buildKdpPdf } from '../../../services/kdp-pdf-builder';
import { GALERIA_SILHUETAS_PB, SilhuetaMarginalConfig } from '../../../services/kdp-silhouette-service';

export interface PageReviewerChapter {
  titulo: string;
  texto: string;
  imagemDataUrl?: string | null;
}

export interface KdpPageReviewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  livro: {
    titulo: string;
    subtitulo?: string;
    autor: string;
    genero?: string;
    capitulos: PageReviewerChapter[];
  };
  capaUrl?: string | null;
  formato?: string;
  optSumario?: boolean;
  tamCapitulo?: number;
  corCapitulo?: string;
  silhuetaConfig?: {
    ativado: boolean;
    imagemDataUrl?: string | null;
    paginasSelecionadas?: number[];
    opacidade?: number;
    sangriaPct?: number;
    modoCobertura?: 'full-page' | 'marginal';
    monocromatico?: boolean;
    aplicarTodas?: boolean;
    nomeSilhueta?: string;
  };
  onUpdateCapitulo: (chapterIndex: number, novoTexto: string, novoTitulo?: string) => void;
  onUpdateLivroMetadata?: (novoTitulo: string, novoSubtitulo: string, novoAutor: string) => void;
  onUpdateSilhuetaConfig?: (novaConfig: any) => void;
  onDownloadPdf: () => Promise<void>;
}

interface SimulatedPage {
  pageNumber: number;
  kind: 'capa' | 'rosto' | 'sumario' | 'capitulo';
  chapterIndex?: number;
  chapterTitle?: string;
  isFirstOfChapter?: boolean;
  isLastOfChapter?: boolean;
  isLastOfBook?: boolean;
  chapterImage?: string | null;
  paragraphs: string[];
  hasIncompleteEnd?: boolean;
  totalWordsInPage: number;
}

export const KdpPageReviewerModal: React.FC<KdpPageReviewerModalProps> = ({
  isOpen,
  onClose,
  livro,
  capaUrl,
  formato = '6x9',
  optSumario = true,
  tamCapitulo = 16,
  corCapitulo = '#1e3a8a',
  silhuetaConfig: initialSilhuetaConfig,
  onUpdateCapitulo,
  onUpdateLivroMetadata,
  onUpdateSilhuetaConfig,
  onDownloadPdf
}) => {
  if (!isOpen) return null;

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'leitor' | 'pdf_real'>('leitor');
  const [viewMode, setViewMode] = useState<'single' | 'spread'>('single');
  
  // Edição de capítulo
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');
  const [editedChapterTitle, setEditedChapterTitle] = useState<string>('');
  
  // Edição de metadados do livro (Título, Subtítulo, Autor)
  const [isEditingMetadata, setIsEditingMetadata] = useState<boolean>(false);
  const [editedBookTitle, setEditedBookTitle] = useState<string>(livro.titulo);
  const [editedBookSubtitle, setEditedBookSubtitle] = useState<string>(livro.subtitulo || '');
  const [editedBookAuthor, setEditedBookAuthor] = useState<string>(livro.autor);

  // Controle de silhueta interativa em preto e branco por página
  const [localSilhueta, setLocalSilhueta] = useState<{
    ativado: boolean;
    imagemDataUrl: string | null;
    opacidade: number;
    paginasSelecionadas: number[];
    aplicarTodas: boolean;
    nomeSilhueta: string;
  }>({
    ativado: initialSilhuetaConfig?.ativado ?? false,
    imagemDataUrl: initialSilhuetaConfig?.imagemDataUrl ?? GALERIA_SILHUETAS_PB[0].svgDataUrl,
    opacidade: initialSilhuetaConfig?.opacidade ?? 0.10,
    paginasSelecionadas: initialSilhuetaConfig?.paginasSelecionadas ?? [],
    aplicarTodas: initialSilhuetaConfig?.aplicarTodas ?? true,
    nomeSilhueta: initialSilhuetaConfig?.nomeSilhueta ?? 'Montanhas & Horizonte Profundo'
  });
  const [showSilhuetaDrawer, setShowSilhuetaDrawer] = useState<boolean>(false);

  const [isCompletingWithAi, setIsCompletingWithAi] = useState<boolean>(false);
  const [aiCompletionSuccess, setAiCompletionSuccess] = useState<string | null>(null);
  const [compiledPdfUrl, setCompiledPdfUrl] = useState<string | null>(null);
  const [isBuildingPdf, setIsBuildingPdf] = useState<boolean>(false);

  // Sincroniza metadados quando livro muda
  useEffect(() => {
    setEditedBookTitle(livro.titulo);
    setEditedBookSubtitle(livro.subtitulo || '');
    setEditedBookAuthor(livro.autor);
  }, [livro]);

  // Sincroniza silhueta recebida via props
  useEffect(() => {
    if (initialSilhuetaConfig) {
      setLocalSilhueta(prev => ({
        ...prev,
        ativado: initialSilhuetaConfig.ativado ?? prev.ativado,
        imagemDataUrl: initialSilhuetaConfig.imagemDataUrl ?? prev.imagemDataUrl,
        opacidade: initialSilhuetaConfig.opacidade ?? prev.opacidade,
        paginasSelecionadas: initialSilhuetaConfig.paginasSelecionadas ?? prev.paginasSelecionadas,
        aplicarTodas: initialSilhuetaConfig.aplicarTodas ?? prev.aplicarTodas
      }));
    }
  }, [initialSilhuetaConfig]);

  // Divide os capítulos em páginas simuladas fiéis ao KDP (~260 palavras por página)
  const pages: SimulatedPage[] = useMemo(() => {
    const list: SimulatedPage[] = [];
    let pNum = 1;

    // 1. Capa Oficial (Página 1)
    if (capaUrl) {
      list.push({
        pageNumber: pNum++,
        kind: 'capa',
        paragraphs: [],
        totalWordsInPage: 0
      });
    }

    // 2. Folha de Rosto (Página 2)
    list.push({
      pageNumber: pNum++,
      kind: 'rosto',
      paragraphs: [],
      totalWordsInPage: 0
    });

    // 3. Sumário Oficial KDP (Página 3)
    if (optSumario && livro.capitulos.length > 0) {
      list.push({
        pageNumber: pNum++,
        kind: 'sumario',
        paragraphs: [],
        totalWordsInPage: 0
      });
    }

    // 4. Miolo do Livro (Capítulos divididos em páginas de leitura)
    const WORDS_PER_PAGE = 260;

    livro.capitulos.forEach((chap, cIdx) => {
      const isLastChapter = cIdx === livro.capitulos.length - 1;
      const rawParas = (chap.texto || '')
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

      if (rawParas.length === 0) {
        // Capítulo vazio
        list.push({
          pageNumber: pNum++,
          kind: 'capitulo',
          chapterIndex: cIdx,
          chapterTitle: chap.titulo,
          isFirstOfChapter: true,
          isLastOfChapter: true,
          isLastOfBook: isLastChapter,
          chapterImage: chap.imagemDataUrl,
          paragraphs: ['(Capítulo sem conteúdo textual)'],
          hasIncompleteEnd: false,
          totalWordsInPage: 0
        });
        return;
      }

      let currentPageParas: string[] = [];
      let currentWordCount = 0;
      let chapterPagesCreated = 0;

      for (let i = 0; i < rawParas.length; i++) {
        const para = rawParas[i];
        const paraWords = para.split(/\s+/).filter(Boolean).length;

        if (currentWordCount > 0 && currentWordCount + paraWords > WORDS_PER_PAGE) {
          chapterPagesCreated++;
          list.push({
            pageNumber: pNum++,
            kind: 'capitulo',
            chapterIndex: cIdx,
            chapterTitle: chap.titulo,
            isFirstOfChapter: chapterPagesCreated === 1,
            isLastOfChapter: false,
            isLastOfBook: false,
            chapterImage: chapterPagesCreated === 1 ? chap.imagemDataUrl : null,
            paragraphs: [...currentPageParas],
            hasIncompleteEnd: false,
            totalWordsInPage: currentWordCount
          });
          currentPageParas = [para];
          currentWordCount = paraWords;
        } else {
          currentPageParas.push(para);
          currentWordCount += paraWords;
        }
      }

      if (currentPageParas.length > 0) {
        chapterPagesCreated++;
        const lastPara = currentPageParas[currentPageParas.length - 1];
        const hasValidEnd = /[.!?…"”»]$/.test(lastPara);

        list.push({
          pageNumber: pNum++,
          kind: 'capitulo',
          chapterIndex: cIdx,
          chapterTitle: chap.titulo,
          isFirstOfChapter: chapterPagesCreated === 1,
          isLastOfChapter: true,
          isLastOfBook: isLastChapter,
          chapterImage: chapterPagesCreated === 1 ? chap.imagemDataUrl : null,
          paragraphs: [...currentPageParas],
          hasIncompleteEnd: !hasValidEnd,
          totalWordsInPage: currentWordCount
        });
      }
    });

    return list;
  }, [livro, capaUrl, optSumario]);

  const currentPage = pages[currentPageIndex] || pages[0];
  const totalPages = pages.length;

  // Mapeia a página inicial real exata de cada capítulo para o sumário de luxo
  const chapterStartPages = useMemo(() => {
    const map: Record<number, number> = {};
    pages.forEach(p => {
      if (p.kind === 'capitulo' && p.chapterIndex !== undefined && p.isFirstOfChapter) {
        map[p.chapterIndex] = p.pageNumber;
      }
    });
    return map;
  }, [pages]);

  // Atualiza texto para edição quando muda de página
  useEffect(() => {
    if (currentPage && currentPage.kind === 'capitulo' && currentPage.chapterIndex !== undefined) {
      const fullText = livro.capitulos[currentPage.chapterIndex]?.texto || '';
      const chapTitle = livro.capitulos[currentPage.chapterIndex]?.titulo || '';
      setEditedText(fullText);
      setEditedChapterTitle(chapTitle);
    }
    setIsEditing(false);
    setIsEditingMetadata(false);
    setAiCompletionSuccess(null);
  }, [currentPageIndex, livro]);

  // Teclado: Seta Esquerda e Direita para navegar, ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing || isEditingMetadata) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPageIndex(prev => Math.min(totalPages - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPageIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, isEditing, isEditingMetadata, onClose]);

  // Compilação do PDF Real sob demanda
  useEffect(() => {
    if (activeTab === 'pdf_real') {
      let cancelled = false;
      setIsBuildingPdf(true);

      const generate = async () => {
        try {
          const result = await buildKdpPdf({
            livro: {
              titulo: livro.titulo,
              subtitulo: livro.subtitulo,
              autor: livro.autor,
              capitulos: livro.capitulos
            },
            capaDataUrl: capaUrl,
            formato,
            optSumario,
            tamCapitulo,
            corCapitulo,
            silhuetaConfig: localSilhueta.ativado && localSilhueta.imagemDataUrl ? {
              ativado: true,
              imagemDataUrl: localSilhueta.imagemDataUrl,
              paginasSelecionadas: localSilhueta.paginasSelecionadas,
              opacidade: localSilhueta.opacidade,
              sangriaPct: 0.03,
              modoCobertura: 'full-page',
              monocromatico: true,
              aplicarTodas: localSilhueta.aplicarTodas
            } : undefined
          });

          if (!cancelled) {
            const blob = new Blob([result.bytes as any], { type: 'application/pdf' });
            if (compiledPdfUrl) URL.revokeObjectURL(compiledPdfUrl);
            const newUrl = URL.createObjectURL(blob);
            setCompiledPdfUrl(newUrl);
          }
        } catch (err: any) {
          console.error('[PageReviewer] Erro ao compilar PDF real:', err);
        } finally {
          if (!cancelled) setIsBuildingPdf(false);
        }
      };

      generate();

      return () => {
        cancelled = true;
      };
    }
  }, [activeTab, livro, capaUrl, formato, optSumario, tamCapitulo, corCapitulo, localSilhueta]);

  // Salvar metadados do livro (Título, Subtítulo, Autor)
  const handleSaveMetadata = () => {
    if (onUpdateLivroMetadata) {
      onUpdateLivroMetadata(editedBookTitle.trim(), editedBookSubtitle.trim(), editedBookAuthor.trim());
    }
    setIsEditingMetadata(false);
    setAiCompletionSuccess('✓ Metadados da obra (Título e Subtítulo) atualizados com sucesso!');
    setTimeout(() => setAiCompletionSuccess(null), 3500);
  };

  // Salvar edição manual feita no capítulo
  const handleSaveEdit = () => {
    if (currentPage && currentPage.chapterIndex !== undefined) {
      onUpdateCapitulo(currentPage.chapterIndex, editedText, editedChapterTitle.trim() || undefined);
      setIsEditing(false);
      setAiCompletionSuccess('✓ Texto e título do capítulo salvos com sucesso!');
      setTimeout(() => setAiCompletionSuccess(null), 3500);
    }
  };

  // Alterna exibição da silhueta na página atual
  const handleToggleSilhuetaCurrentPage = () => {
    const pNum = currentPage.pageNumber;
    setLocalSilhueta(prev => {
      let novasPaginas: number[];
      if (prev.paginasSelecionadas.includes(pNum)) {
        novasPaginas = prev.paginasSelecionadas.filter(p => p !== pNum);
      } else {
        novasPaginas = [...prev.paginasSelecionadas, pNum];
      }
      const atualizada = {
        ...prev,
        paginasSelecionadas: novasPaginas,
        aplicarTodas: false
      };
      if (onUpdateSilhuetaConfig) onUpdateSilhuetaConfig(atualizada);
      return atualizada;
    });
  };

  // Atualiza opacidade percentual da silhueta
  const handleChangeSilhuetaOpacidade = (novaOpacidade: number) => {
    setLocalSilhueta(prev => {
      const atualizada = { ...prev, opacidade: novaOpacidade };
      if (onUpdateSilhuetaConfig) onUpdateSilhuetaConfig(atualizada);
      return atualizada;
    });
  };

  // Alterna toggle geral da silhueta
  const handleToggleSilhuetaGeral = (ativar: boolean) => {
    setLocalSilhueta(prev => {
      const atualizada = { ...prev, ativado: ativar };
      if (onUpdateSilhuetaConfig) onUpdateSilhuetaConfig(atualizada);
      return atualizada;
    });
  };

  // Seleciona silhueta da galeria monocromática
  const handleSelectGaleriaSilhueta = (sil: typeof GALERIA_SILHUETAS_PB[0]) => {
    setLocalSilhueta(prev => {
      const atualizada = {
        ...prev,
        imagemDataUrl: sil.svgDataUrl,
        nomeSilhueta: sil.nome,
        ativado: true
      };
      if (onUpdateSilhuetaConfig) onUpdateSilhuetaConfig(atualizada);
      return atualizada;
    });
    setAiCompletionSuccess(`✓ Silhueta "${sil.nome}" aplicada ao fundo do miolo!`);
    setTimeout(() => setAiCompletionSuccess(null), 3000);
  };

  // Verifica se a silhueta deve ser exibida na página atual
  const shouldShowSilhuetaOnPage = (pNum: number): boolean => {
    if (!localSilhueta.ativado || !localSilhueta.imagemDataUrl) return false;
    if (currentPage.kind === 'capa') return false; // Capa colorida não recebe marca d'água
    if (localSilhueta.aplicarTodas) return true;
    return localSilhueta.paginasSelecionadas.includes(pNum);
  };

  // Completar com IA frase cortada no final do capítulo ou livro
  const handleCompletarComIa = async () => {
    if (!currentPage || currentPage.chapterIndex === undefined) return;
    const cIdx = currentPage.chapterIndex;
    const currentChap = livro.capitulos[cIdx];
    if (!currentChap) return;

    setIsCompletingWithAi(true);
    setAiCompletionSuccess(null);

    try {
      const trechoFinal = currentChap.texto.slice(-350);
      const isUltimo = cIdx === livro.capitulos.length - 1;

      const prompt = `Você é um editor literário sênior especialista em fechamento narrativo para livros na Amazon KDP.
O seguinte trecho do ${isUltimo ? 'ÚLTIMO CAPÍTULO (DESFECHO DO LIVRO)' : 'final de um capítulo'} de "${livro.titulo}" terminou de forma abrupta ou com frase cortada:
"${trechoFinal}"

SUA TAREFA:
Escreva a conclusão perfeita desta frase (1 a 2 períodos no máximo), finalizando obrigatoriamente com ponto final (.).
Retorne APENAS a frase de continuação e fechamento, sem introdução e sem aspas.`;

      const res = await chamarGeminiTexto(prompt, {
        temperature: 0.7,
        maxTokens: 250,
        systemInstruction: 'Retorne apenas a frase finalizadora com ponto final, sem introdução.'
      });

      let conclusao = res.texto.trim().replace(/^["']|["']$/g, '');
      if (!/[.!?]$/.test(conclusao)) conclusao += '.';

      const textoFinal = `${currentChap.texto.trim()} ${conclusao}`;
      onUpdateCapitulo(cIdx, textoFinal);
      setEditedText(textoFinal);
      setAiCompletionSuccess('✓ Frase final concluída e aperfeiçoada com IA!');
      setTimeout(() => setAiCompletionSuccess(null), 4000);
    } catch (err: any) {
      console.error('Erro ao completar com IA:', err);
      alert(`Falha ao completar frase: ${err.message || err}`);
    } finally {
      setIsCompletingWithAi(false);
    }
  };

  const lastPageIndex = pages.length - 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 16px',
        overflow: 'hidden'
      }}
    >
      {/* PAINEL PRINCIPAL DO MODAL */}
      <div
        style={{
          width: '100%',
          maxWidth: 1280,
          height: '100%',
          background: '#0f172a',
          borderRadius: 14,
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* BARRA SUPERIOR (HEADER) */}
        <div
          style={{
            padding: '12px 20px',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          {/* IDENTIFICAÇÃO DO LIVRO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)'
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                  Revisor Editorial Página por Página
                </h3>
                <span
                  style={{
                    background: '#334155',
                    color: '#94a3b8',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12
                  }}
                >
                  Formato KDP {formato}
                </span>
                <span
                  style={{
                    background: '#064e3b',
                    color: '#34d399',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <ShieldCheck size={12} /> Validação Ativa
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                <strong>{livro.titulo}</strong> • por {livro.autor} • {livro.capitulos.length} capítulos ({totalPages} páginas calculadas)
              </p>
            </div>
          </div>

          {/* FERRAMENTAS: SILHUETA P&B, ABAS E FECHAR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* BOTÃO DE CONTROLE DA SILHUETA P&B */}
            <button
              type="button"
              onClick={() => setShowSilhuetaDrawer(!showSilhuetaDrawer)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: localSilhueta.ativado ? '#1e3a8a' : '#1e293b',
                color: localSilhueta.ativado ? '#93c5fd' : '#94a3b8',
                border: `1px solid ${localSilhueta.ativado ? '#3b82f6' : '#475569'}`,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Configurar Silhueta Monocromática e Transparência por Página"
            >
              <Palette size={14} />
              <span>Silhueta P&B {localSilhueta.ativado ? `(${Math.round(localSilhueta.opacidade * 100)}%)` : 'Desativada'}</span>
            </button>

            {/* ABAS: LEITOR INTERATIVO VS PDF REAL */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0f172a', padding: 3, borderRadius: 8, border: '1px solid #334155' }}>
              <button
                type="button"
                onClick={() => setActiveTab('leitor')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: activeTab === 'leitor' ? '#3b82f6' : 'transparent',
                  color: activeTab === 'leitor' ? '#ffffff' : '#94a3b8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Layers size={14} /> Folhear Páginas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pdf_real')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: activeTab === 'pdf_real' ? '#3b82f6' : 'transparent',
                  color: activeTab === 'pdf_real' ? '#ffffff' : '#94a3b8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <FileText size={14} /> PDF Compilado Real
              </button>
            </div>

            {/* BAIXAR PDF */}
            <button
              type="button"
              onClick={onDownloadPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.35)'
              }}
            >
              <Download size={14} /> Baixar PDF KDP
            </button>

            {/* FECHAR */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#334155',
                border: 'none',
                color: '#f8fafc',
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Fechar Revisor"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* GAVETA DE CONFIGURAÇÃO DA SILHUETA P&B */}
        {showSilhuetaDrawer && (
          <div
            style={{
              padding: '12px 20px',
              background: '#090d16',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Palette size={16} color="#38bdf8" /> Configuração da Silhueta Monocromática (Preto & Branco)
                </span>

                {/* TOGGLE GERAL */}
                <button
                  type="button"
                  onClick={() => handleToggleSilhuetaGeral(!localSilhueta.ativado)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: localSilhueta.ativado ? '#059669' : '#334155',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {localSilhueta.ativado ? '✓ Silhueta Ativa no Livro' : 'Silhueta Desativada'}
                </button>
              </div>

              {/* CONTROLES DE TRANSPARÊNCIA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#cbd5e1' }}>
                    Transparência / Opacidade: <strong>{Math.round(localSilhueta.opacidade * 100)}%</strong>
                  </span>
                  <input
                    type="range"
                    min={2}
                    max={40}
                    value={Math.round(localSilhueta.opacidade * 100)}
                    onChange={(e) => handleChangeSilhuetaOpacidade(Number(e.target.value) / 100)}
                    style={{ width: 120, cursor: 'pointer', accentColor: '#38bdf8' }}
                  />
                </div>

                {/* BOTAO PARA ALTERNAR NA PAGINA ATUAL */}
                <button
                  type="button"
                  onClick={handleToggleSilhuetaCurrentPage}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    background: shouldShowSilhuetaOnPage(currentPage.pageNumber) ? '#1e3a8a' : '#334155',
                    color: shouldShowSilhuetaOnPage(currentPage.pageNumber) ? '#93c5fd' : '#cbd5e1',
                    border: '1px solid #475569',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {shouldShowSilhuetaOnPage(currentPage.pageNumber)
                    ? `✓ Nesta Pág. #${currentPage.pageNumber}: Ligada`
                    : `Nesta Pág. #${currentPage.pageNumber}: Desligada`}
                </button>
              </div>
            </div>

            {/* MINI GALERIA DE SILHUETAS P&B PRONTAS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>Silhuetas de Miolo P&B:</span>
              {GALERIA_SILHUETAS_PB.map((sil) => {
                const isSelected = localSilhueta.nomeSilhueta === sil.nome;
                return (
                  <button
                    key={sil.id}
                    type="button"
                    onClick={() => handleSelectGaleriaSilhueta(sil)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: isSelected ? '#1e40af' : '#1e293b',
                      color: isSelected ? '#ffffff' : '#cbd5e1',
                      border: `1px solid ${isSelected ? '#60a5fa' : '#334155'}`,
                      fontSize: 11,
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{sil.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* NOTIFICAÇÃO DE SUCESSO DE IA OU SALVAMENTO */}
        {aiCompletionSuccess && (
          <div
            style={{
              background: '#065f46',
              color: '#d1fae5',
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid #047857'
            }}
          >
            <CheckCircle2 size={16} /> {aiCompletionSuccess}
          </div>
        )}

        {/* CORPO DO REVISOR */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeTab === 'pdf_real' ? (
            /* VISUALIZAÇÃO DO PDF COMPILADO REAL EM IFRAME */
            <div style={{ flex: 1, position: 'relative', background: '#1e293b' }}>
              {isBuildingPdf ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                  <RefreshCw size={32} className="animate-spin" style={{ marginBottom: 12, color: '#38bdf8' }} />
                  <p style={{ fontSize: 14, fontWeight: 600 }}>Diagramando e compilando páginas em formato KDP real...</p>
                </div>
              ) : compiledPdfUrl ? (
                <iframe
                  src={compiledPdfUrl}
                  title="PDF Oficial KDP Diagramado"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                  Não foi possível compilar a pré-visualização do PDF.
                </div>
              )}
            </div>
          ) : (
            /* VISUALIZAÇÃO DO LEITOR INTERATIVO PÁGINA POR PÁGINA */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* ÁREA CENTRAL COM O SIMULADOR DE PÁGINA FÍSICA */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  background: '#0f172a',
                  overflowY: 'auto'
                }}
              >
                {/* CARTÃO DA PÁGINA DE LIVRO FÍSICO */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: 580,
                    minHeight: 640,
                    maxHeight: '100%',
                    background: '#fdfbf7',
                    borderRadius: 4,
                    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.45), inset 0 0 40px rgba(0, 0, 0, 0.02)',
                    border: '1px solid #e2d9cc',
                    padding: '40px 48px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    fontFamily: 'Georgia, serif',
                    color: '#1e293b',
                    overflowY: 'auto'
                  }}
                >
                  {/* CAMADA DE SILHUETA DE FUNDO EM PRETO E BRANCO OCUPANDO TODO O LIVRO POR TRÁS DO TEXTO */}
                  {shouldShowSilhuetaOnPage(currentPage.pageNumber) && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 0,
                        overflow: 'hidden',
                        borderRadius: 'inherit'
                      }}
                    >
                      <img
                        src={localSilhueta.imagemDataUrl!}
                        alt="Silhueta de Fundo"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: localSilhueta.opacidade,
                          filter: 'grayscale(100%) contrast(115%)'
                        }}
                      />
                    </div>
                  )}

                  {/* CAMADA DE CONTEÚDO EDITORIAL DO LIVRO (SOBREPOSTA À SILHUETA COM Z-INDEX 1) */}
                  <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>

                    {/* 1. SE FOR CAPA COLORIDA */}
                    {currentPage.kind === 'capa' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {capaUrl ? (
                          <div style={{ textAlign: 'center' }}>
                            <img
                              src={capaUrl}
                              alt="Capa Oficial"
                              style={{
                                maxWidth: '100%',
                                maxHeight: 520,
                                objectFit: 'contain',
                                borderRadius: 4,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                border: '1px solid #cbd5e1'
                              }}
                            />
                            <p style={{ marginTop: 12, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                              Página 1: Capa Frontal Oficial de Alta Resolução (Amazon KDP)
                            </p>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                            <BookOpen size={48} style={{ opacity: 0.4, marginBottom: 8 }} />
                            <p>Nenhuma arte de capa vinculada ainda.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. SE FOR FOLHA DE ROSTO (COM MODO DE EDIÇÃO INTEGRADO DE TÍTULO & SUBTÍTULO) */}
                    {currentPage.kind === 'rosto' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 10px' }}>
                        {!isEditingMetadata ? (
                          <>
                            <div style={{ alignSelf: 'flex-end', marginBottom: 12 }}>
                              <button
                                type="button"
                                onClick={() => setIsEditingMetadata(true)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  background: '#e2e8f0',
                                  color: '#1e293b',
                                  border: '1px solid #cbd5e1',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <Edit3 size={12} /> Editar Título & Subtítulo
                              </button>
                            </div>

                            <span style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#64748b', marginBottom: 24 }}>
                              Publicação Editorial Amazon KDP
                            </span>

                            <h1 style={{ fontSize: '2.1rem', fontWeight: 700, margin: '0 0 14px 0', color: '#0f172a', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
                              {livro.titulo}
                            </h1>

                            {livro.subtitulo && (
                              <p style={{ fontSize: '1.05rem', fontStyle: 'italic', color: '#475569', margin: '0 0 36px 0', maxWidth: 440, lineHeight: 1.45 }}>
                                {livro.subtitulo}
                              </p>
                            )}

                            <div style={{ width: 60, height: 2, background: '#cbd5e1', marginBottom: 36 }} />

                            <p style={{ fontSize: '1.05rem', color: '#1e293b', margin: 0, fontWeight: 600 }}>
                              por {livro.autor}
                            </p>

                            <div style={{ marginTop: 'auto', paddingTop: 50, fontSize: 11, color: '#94a3b8' }}>
                              Todos os direitos reservados • Formato oficial {formato}
                            </div>
                          </>
                        ) : (
                          /* FORMULÁRIO DE EDIÇÃO DE TÍTULO, SUBTÍTULO E AUTOR */
                          <div style={{ width: '100%', textAlign: 'left', background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Edit3 size={15} color="#2563eb" /> Editar Dados Principais da Obra
                            </h4>

                            <div style={{ marginBottom: 10 }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                                Título do Livro:
                              </label>
                              <input
                                type="text"
                                value={editedBookTitle}
                                onChange={(e) => setEditedBookTitle(e.target.value)}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
                              />
                            </div>

                            <div style={{ marginBottom: 10 }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                                Subtítulo Comercial:
                              </label>
                              <textarea
                                value={editedBookSubtitle}
                                onChange={(e) => setEditedBookSubtitle(e.target.value)}
                                rows={3}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                              />
                            </div>

                            <div style={{ marginBottom: 14 }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                                Autor / Pseudônimo:
                              </label>
                              <input
                                type="text"
                                value={editedBookAuthor}
                                onChange={(e) => setEditedBookAuthor(e.target.value)}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                              />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => setIsEditingMetadata(false)}
                                style={{ padding: '6px 12px', borderRadius: 6, background: '#e2e8f0', color: '#475569', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveMetadata}
                                style={{ padding: '6px 16px', borderRadius: 6, background: '#10b981', color: '#ffffff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                              >
                                <Save size={13} /> Salvar Alterações
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. SE FOR SUMÁRIO EDITORIAL DE LUXO */}
                    {currentPage.kind === 'sumario' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                          <span style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 4 }}>
                            Í n d i c e   G e r a l
                          </span>
                          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '0.05em' }}>
                            SUMÁRIO
                          </h2>
                          <div style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0 0' }}>
                            — ❦ —
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                          {livro.capitulos.map((c, i) => {
                            const startP = chapterStartPages[i] || (i + 1) * 8;
                            return (
                              <div
                                key={i}
                                onClick={() => {
                                  const targetIdx = pages.findIndex(p => p.chapterIndex === i && p.isFirstOfChapter);
                                  if (targetIdx !== -1) setCurrentPageIndex(targetIdx);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'baseline',
                                  justifyContent: 'space-between',
                                  fontSize: '0.92rem',
                                  cursor: 'pointer',
                                  padding: '3px 6px',
                                  borderRadius: 4,
                                  transition: 'background 0.15s'
                                }}
                                title={`Pular diretamente para o Capítulo ${i + 1}`}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1ece1')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <span style={{ color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Cap. {i + 1}</span>
                                  <span>{c.titulo}</span>
                                </span>

                                <span style={{ flex: 1, borderBottom: '1px dotted #94a3b8', margin: '0 8px 3px 8px' }} />

                                <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 600, minWidth: 44, textAlign: 'right' }}>
                                  pág. {startP}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: 20, textAlign: 'center', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                          * Toque em qualquer capítulo para folhear diretamente até a página de abertura.
                        </div>
                      </div>
                    )}

                    {/* 4. SE FOR PÁGINA DE CAPÍTULO DO MIOLO */}
                    {currentPage.kind === 'capitulo' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* CABEÇALHO CORRIDO SUPERIOR DO LIVRO */}
                        <div
                          style={{
                            textAlign: 'center',
                            fontSize: 11,
                            color: '#64748b',
                            fontStyle: 'italic',
                            borderBottom: '1px solid #e2e8f0',
                            paddingBottom: 8,
                            marginBottom: 20
                          }}
                        >
                          {currentPage.isFirstOfChapter ? '' : currentPage.chapterTitle || livro.titulo}
                        </div>

                        {/* INÍCIO DO CAPÍTULO (SE FOR A 1ª PÁGINA) */}
                        {currentPage.isFirstOfChapter && (
                          <div style={{ marginBottom: 24, textAlign: 'center' }}>
                            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748b', display: 'block', marginBottom: 6 }}>
                              Capítulo {(currentPage.chapterIndex || 0) + 1}
                            </span>
                            <h2
                              style={{
                                color: corCapitulo,
                                fontSize: `${tamCapitulo + 2}pt`,
                                margin: '0 0 16px 0',
                                fontWeight: 700,
                                lineHeight: 1.25
                              }}
                            >
                              {currentPage.chapterTitle}
                            </h2>

                            {/* IMAGEM ILUSTRADA DO CAPÍTULO */}
                            {currentPage.chapterImage && (
                              <div style={{ textAlign: 'center', margin: '14px 0 20px 0' }}>
                                <img
                                  src={currentPage.chapterImage}
                                  alt={currentPage.chapterTitle}
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: 220,
                                    borderRadius: 4,
                                    boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* TEXTO DA PÁGINA COM CAPITULAR (DROP CAP) E DIAGRAMAÇÃO REFINADA */}
                        <div style={{ flex: 1 }}>
                          {currentPage.paragraphs.map((p, pIdx) => {
                            // Se for subtítulo de seção dentro do capítulo (ex: começou com ###)
                            if (p.startsWith('###')) {
                              const cleanHeading = p.replace(/^###\s*/, '');
                              return (
                                <h3
                                  key={pIdx}
                                  style={{
                                    fontSize: '1.05rem',
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    margin: '18px 0 8px 0',
                                    lineHeight: 1.35,
                                    borderLeft: '3px solid #3b82f6',
                                    paddingLeft: 8
                                  }}
                                >
                                  {cleanHeading}
                                </h3>
                              );
                            }

                            // Capitular na primeira letra da primeira página do capítulo
                            const isFirstDropCap = currentPage.isFirstOfChapter && pIdx === 0 && p.length > 2;
                            if (isFirstDropCap) {
                              const firstLetter = p.charAt(0);
                              const restText = p.slice(1);
                              return (
                                <p
                                  key={pIdx}
                                  style={{
                                    marginBottom: 12,
                                    textAlign: 'justify',
                                    lineHeight: 1.75,
                                    fontSize: '0.96rem',
                                    color: '#1e293b'
                                  }}
                                >
                                  <span
                                    style={{
                                      float: 'left',
                                      fontSize: '3.4rem',
                                      lineHeight: 0.8,
                                      paddingTop: 4,
                                      paddingRight: 8,
                                      paddingBottom: 2,
                                      fontWeight: 700,
                                      fontFamily: 'Georgia, serif',
                                      color: corCapitulo
                                    }}
                                  >
                                    {firstLetter}
                                  </span>
                                  {restText}
                                </p>
                              );
                            }

                            return (
                              <p
                                key={pIdx}
                                style={{
                                  textIndent: '1.8em',
                                  marginBottom: 12,
                                  textAlign: 'justify',
                                  lineHeight: 1.75,
                                  fontSize: '0.96rem',
                                  color: '#1e293b'
                                }}
                              >
                                {p}
                              </p>
                            );
                          })}
                        </div>

                        {/* DESTAQUE DE ÚLTIMA PÁGINA DO LIVRO / FINAL */}
                        {currentPage.isLastOfBook && (
                          <div
                            style={{
                              marginTop: 20,
                              padding: '12px 16px',
                              background: '#eff6ff',
                              borderRadius: 8,
                              border: '1px solid #bfdbfe',
                              textAlign: 'center'
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', display: 'block' }}>
                              🏆 FIM DA OBRA • DESFECHO CONCLUÍDO
                            </span>
                            <span style={{ fontSize: 11, color: '#3b82f6', marginTop: 2, display: 'block' }}>
                              Esta é a última página do manuscrito impresso.
                            </span>
                          </div>
                        )}

                        {/* ALERTA DE FRASE CORTADA OU INCOMPLETA */}
                        {currentPage.hasIncompleteEnd && (
                          <div
                            style={{
                              marginTop: 16,
                              padding: '10px 14px',
                              background: '#fef2f2',
                              borderRadius: 6,
                              border: '1px solid #fecaca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c', fontSize: 12, fontWeight: 600 }}>
                              <AlertTriangle size={15} />
                              <span>Frase final incompleta (faltando palavras ou ponto).</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleCompletarComIa}
                              disabled={isCompletingWithAi}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 10px',
                                borderRadius: 4,
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: isCompletingWithAi ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {isCompletingWithAi ? (
                                <>
                                  <RefreshCw size={11} className="animate-spin" /> Concluindo...
                                </>
                              ) : (
                                <>
                                  <Sparkles size={11} /> Concluir com IA
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* RODAPÉ COM NUMERAÇÃO DE PÁGINA */}
                        <div
                          style={{
                            textAlign: 'center',
                            fontSize: 11,
                            color: '#64748b',
                            marginTop: 18,
                            paddingTop: 8,
                            borderTop: '1px solid #e2e8f0'
                          }}
                        >
                          {currentPage.pageNumber}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BARRA DE CONTROLE INFERIOR / NAVEGAÇÃO PÁGINA POR PÁGINA */}
              <div
                style={{
                  padding: '12px 20px',
                  background: '#1e293b',
                  borderTop: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                {/* BOTÃO PÁGINA ANTERIOR */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentPageIndex === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 6,
                      background: currentPageIndex === 0 ? '#334155' : '#3b82f6',
                      color: currentPageIndex === 0 ? '#64748b' : '#ffffff',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronLeft size={16} /> Página Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentPageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                    disabled={currentPageIndex === totalPages - 1}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 6,
                      background: currentPageIndex === totalPages - 1 ? '#334155' : '#3b82f6',
                      color: currentPageIndex === totalPages - 1 ? '#64748b' : '#ffffff',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: currentPageIndex === totalPages - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Próxima Página <ChevronRight size={16} />
                  </button>
                </div>

                {/* SELETOR DE PÁGINA CENTRAL */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>
                    Página <strong>{currentPageIndex + 1}</strong> de <strong>{totalPages}</strong>
                  </span>

                  <input
                    type="range"
                    min={0}
                    max={totalPages - 1}
                    value={currentPageIndex}
                    onChange={(e) => setCurrentPageIndex(Number(e.target.value))}
                    style={{
                      width: 140,
                      cursor: 'pointer',
                      accentColor: '#3b82f6'
                    }}
                  />

                  {/* DROP DOWN DE SALTO RÁPIDO PARA CAPÍTULOS */}
                  <select
                    value={currentPage.chapterIndex !== undefined ? currentPage.chapterIndex : ''}
                    onChange={(e) => {
                      const cIdx = Number(e.target.value);
                      const targetP = pages.findIndex(p => p.chapterIndex === cIdx);
                      if (targetP !== -1) setCurrentPageIndex(targetP);
                    }}
                    style={{
                      background: '#0f172a',
                      color: '#f8fafc',
                      border: '1px solid #475569',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    <option value="" disabled>Pular para Capítulo...</option>
                    {livro.capitulos.map((c, i) => (
                      <option key={i} value={i}>
                        Cap. {i + 1}: {c.titulo.slice(0, 24)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* BOTÕES DE EDIÇÃO AO VIVO E FINALIZAÇÃO */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {currentPage.kind === 'rosto' && (
                    <button
                      type="button"
                      onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 12px',
                        borderRadius: 6,
                        background: isEditingMetadata ? '#475569' : '#334155',
                        color: '#f8fafc',
                        border: '1px solid #64748b',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Edit3 size={14} /> {isEditingMetadata ? 'Fechar Edição' : 'Editar Título & Subtítulo'}
                    </button>
                  )}

                  {currentPage.kind === 'capitulo' && currentPage.chapterIndex !== undefined && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 12px',
                        borderRadius: 6,
                        background: isEditing ? '#475569' : '#334155',
                        color: '#f8fafc',
                        border: '1px solid #64748b',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Edit3 size={14} /> {isEditing ? 'Cancelar Edição' : 'Editar Capítulo'}
                    </button>
                  )}

                  {currentPage.hasIncompleteEnd && (
                    <button
                      type="button"
                      onClick={handleCompletarComIa}
                      disabled={isCompletingWithAi}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 6,
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isCompletingWithAi ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Sparkles size={14} /> Concluir Frase com IA
                    </button>
                  )}
                </div>
              </div>

              {/* MODAL / PAINEL DE EDIÇÃO DO CAPÍTULO (SE ATIVADO) */}
              {isEditing && currentPage.chapterIndex !== undefined && (
                <div
                  style={{
                    padding: '16px 20px',
                    background: '#0f172a',
                    borderTop: '2px solid #3b82f6',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>
                      ✏️ Editando: Capítulo {(currentPage.chapterIndex || 0) + 1}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      As alterações serão salvas imediatamente no projeto e refletidas no PDF.
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1' }}>
                      Título do Capítulo:
                    </label>
                    <input
                      type="text"
                      value={editedChapterTitle}
                      onChange={(e) => setEditedChapterTitle(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid #475569',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1' }}>
                      Texto do Capítulo:
                    </label>
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      rows={6}
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid #475569',
                        borderRadius: 8,
                        padding: 12,
                        fontFamily: 'Georgia, serif',
                        fontSize: 13,
                        lineHeight: 1.6,
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        background: '#334155',
                        color: '#94a3b8',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 16px',
                        borderRadius: 6,
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Check size={14} /> Salvar Alterações
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
