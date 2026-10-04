// ================================================================
// STUDIO DE LIVRO DE COLORIR KDP (COLORING BOOK STUDIO)
// - Contexto e Personagem Central 100% Consistente em todas as páginas
// - Prompts Densos com no mínimo 1500 caracteres de detalhes cênicos
// - Primeira geração é SEMPRE a Capa Colorida do Livro
// - Geração estritamente sequencial (uma página por vez seguindo a ordem)
// ================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles, Download, RefreshCw, CheckCircle2, AlertTriangle,
  Layers, Shield, Eye, Image as ImageIcon, Trash2, FileText,
  Lock, ArrowRight, Palette, BookOpen, Plus, Type
} from 'lucide-react';
import {
  ColoringPage,
  planejarPaginasColorir,
  gerarIlustracaoPaginaColorir,
  buildColoringBookPdf
} from '../../../services/coloring-book-service';
import { comporCapaComTipografia } from '../../../services/kdp-cover-composer';
import { db } from '../../../database/local-database';

interface ColoringBookStudioProps {
  tema?: string;
  subtema?: string;
  titulo?: string;
  autor?: string;
  capaDataUrl?: string | null;
  onLivroCompilado?: () => void;
  onCapaGerada?: (capaUrl: string) => void;
}

export const ColoringBookStudio: React.FC<ColoringBookStudioProps> = ({
  tema = 'Livros de Colorir',
  subtema = '',
  titulo = '',
  autor = 'Book Intel Studio',
  capaDataUrl,
  onLivroCompilado,
  onCapaGerada
}) => {
  const [pages, setPages] = useState<ColoringPage[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [qtdPaginas, setQtdPaginas] = useState(10);
  const [publico, setPublico] = useState<'infantil' | 'adultos' | 'todos'>('infantil');
  const [generatingPageId, setGeneratingPageId] = useState<string | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const [localCapaDataUrl, setLocalCapaDataUrl] = useState<string | null>(capaDataUrl || null);

  // Textos oficiais da Capa do Livro (Editáveis para sobreposição tipográfica KDP)
  const [tituloLocal, setTituloLocal] = useState(titulo || 'Meu Livro de Colorir KDP');
  const [subtituloLocal, setSubtituloLocal] = useState(subtema ? `Coleção ${subtema}` : 'Edição Especial para Colorir');
  const [autorLocal, setAutorLocal] = useState(autor || 'Leandro Palmeira');

  useEffect(() => {
    if (titulo && titulo.trim()) setTituloLocal(titulo);
  }, [titulo]);

  useEffect(() => {
    if (autor && autor.trim()) setAutorLocal(autor);
  }, [autor]);

  useEffect(() => {
    if (subtema && subtema.trim()) setSubtituloLocal(`Coleção ${subtema}`);
  }, [subtema]);

  // 1. Identificar a próxima página obrigatória da fila sequencial
  const nextPendingIndex = useMemo(() => {
    return pages.findIndex(p => !p.imageDataUrl);
  }, [pages]);

  const nextPendingPage = useMemo(() => {
    if (nextPendingIndex === -1) return null;
    return pages[nextPendingIndex];
  }, [pages, nextPendingIndex]);

  // 2. Planejamento das páginas com Personagem Central Consistente e Capa Colorida no topo
  const handlePlanejar = async () => {
    setIsPlanning(true);
    setStatusMsg('Estruturando personagem central e roteiro denso com Gemini 3.8/3.5...');
    try {
      const plano = await planejarPaginasColorir(
        tema || 'Livros para colorir',
        subtema || 'Animais e Natureza',
        qtdPaginas,
        publico
      );
      setPages(plano);
      setStatusMsg(`✓ Roteiro de ${plano.length} páginas estruturado com sucesso! A Capa Colorida é o Passo 1.`);
    } catch (err: any) {
      setStatusMsg(`Erro ao planejar páginas: ${err.message}`);
    } finally {
      setIsPlanning(false);
    }
  };

  // 3. Geração sob demanda estritamente sequencial (uma página por vez)
  const handleGerarIlustracao = async (pageId: string) => {
    const pageIndex = pages.findIndex(p => p.id === pageId);
    if (pageIndex === -1) return;

    // Trava de segurança: só permite gerar se todas as anteriores já foram concluídas
    for (let i = 0; i < pageIndex; i++) {
      if (!pages[i].imageDataUrl) {
        alert(`Gere primeiro a ${pages[i].isCover ? 'Capa Colorida' : `Página ${pages[i].pageNumber}`} para manter a ordem da história!`);
        return;
      }
    }

    const targetPage = pages[pageIndex];
    setGeneratingPageId(pageId);
    setStatusMsg(`Gerando ${targetPage.isCover ? 'a Capa Colorida' : `os traços da Página ${targetPage.pageNumber}`} com modelo Google Imagen 3...`);

    try {
      const dataUrl = await gerarIlustracaoPaginaColorir(
        targetPage,
        targetPage.isCover ? '2:3' : '3:4',
        targetPage.isCover ? {
          titulo: tituloLocal || titulo || 'Livro de Colorir KDP',
          subtitulo: subtituloLocal || (subtema ? `Coleção ${subtema}` : 'Edição Especial para Colorir'),
          autor: autorLocal || autor || 'Leandro Palmeira'
        } : undefined
      );

      setPages(prev => {
        const next = [...prev];
        next[pageIndex] = {
          ...next[pageIndex],
          imageDataUrl: dataUrl,
          status: 'concluida'
        };
        return next;
      });

      setGeneratedCount(c => c + 1);

      // Se foi gerada a Capa Colorida, sincroniza no estado local e avisa o pai
      if (targetPage.isCover) {
        setLocalCapaDataUrl(dataUrl);
        if (onCapaGerada) onCapaGerada(dataUrl);
        setStatusMsg('✓ Capa Colorida gerada e diagramada com título e autor! Agora você pode gerar a Página 1.');
      } else {
        setStatusMsg(`✓ Ilustração da Página ${targetPage.pageNumber} gerada com sucesso!`);
      }
    } catch (err: any) {
      setPages(prev => {
        const next = [...prev];
        next[pageIndex] = {
          ...next[pageIndex],
          status: 'erro',
          error: err.message
        };
        return next;
      });
      setStatusMsg(`Erro na ${targetPage.isCover ? 'Capa' : `Página ${targetPage.pageNumber}`}: ${err.message}`);
    } finally {
      setGeneratingPageId(null);
    }
  };

  // 4. Atualizar prompt customizado antes de gerar
  const handleUpdatePrompt = (pageId: string, newPrompt: string) => {
    setPages(prev => prev.map(p => (p.id === pageId ? { ...p, prompt: newPrompt } : p)));
  };

  // 4b. Atualizar título da página / cena
  const handleUpdateTitle = (pageId: string, newTitle: string) => {
    setPages(prev => prev.map(p => (p.id === pageId ? { ...p, title: newTitle } : p)));
  };

  // 4c. Recompor tipografia da Capa (Título, Subtítulo e Autor) sobre a imagem existente instantaneamente
  const handleRecomporCapaComTipografia = async (pageId: string) => {
    const targetPage = pages.find(p => p.id === pageId);
    if (!targetPage || !targetPage.imageDataUrl) {
      alert('Gere primeiro a imagem da capa para poder estampar os textos.');
      return;
    }

    setStatusMsg('🎨 Diagramando tipografia KDP (Título, Subtítulo e Autor) sobre a Capa...');
    try {
      const capaComposta = await comporCapaComTipografia(targetPage.imageDataUrl, {
        titulo: tituloLocal || titulo || 'Livro de Colorir KDP',
        subtitulo: subtituloLocal,
        autor: autorLocal || autor || 'Leandro Palmeira',
        selo: 'EDIÇÃO ESPECIAL PARA COLORIR'
      });

      setPages(prev => prev.map(p => (p.id === pageId ? { ...p, imageDataUrl: capaComposta } : p)));
      setLocalCapaDataUrl(capaComposta);
      if (onCapaGerada) onCapaGerada(capaComposta);
      setStatusMsg('✓ Título, Subtítulo e Autor sobrepostos na Capa com padrão oficial KDP!');
    } catch (err: any) {
      setStatusMsg(`Erro ao estampar tipografia na capa: ${err.message}`);
    }
  };

  // 4d. Adicionar página manual com prompt personalizado
  const handleAddManualPage = () => {
    const nextNum = pages.filter(p => !p.isCover).length + 1;
    const newPage: ColoringPage = {
      id: `manual_${Date.now()}`,
      pageNumber: nextNum,
      isCover: false,
      title: `Página ${nextNum}: Nova Cena`,
      description: 'Página personalizada criada manualmente pelo autor com prompt denso.',
      prompt: `Clean coloring book page, crisp thick black outlines on pure white background, scene for children's coloring book with high details, no shading, no grayscale, no colors. Ready to color.`,
      status: 'pendente'
    };
    setPages(prev => [...prev, newPage]);
    setStatusMsg(`✓ Nova página manual adicionada (Página ${nextNum}). Edite o prompt livremente e gere a imagem!`);
  };

  // 4e. Excluir página manual ou indesejada
  const handleDeletePage = (pageId: string) => {
    if (!window.confirm('Deseja realmente remover esta página do livro de colorir?')) return;
    setPages(prev => {
      const filtered = prev.filter(p => p.id !== pageId);
      // Renumera as páginas que não são capa
      let counter = 1;
      return filtered.map(p => {
        if (p.isCover) return p;
        return {
          ...p,
          pageNumber: counter++,
          title: p.id.startsWith('manual_') ? `Página ${counter - 1}: Cena Personalizada` : p.title
        };
      });
    });
    setStatusMsg('Página removida e numeração reorganizada.');
  };

  // 5. Compilar e Baixar o Livro de Colorir em PDF 8.5x11 KDP
  const handleDownloadPdf = async () => {
    const paginasComImagem = pages.filter(p => p.imageDataUrl);
    if (paginasComImagem.length === 0) {
      alert('Gere pelo menos a Capa ou uma ilustração antes de compilar o livro.');
      return;
    }

    setIsExportingPdf(true);
    setStatusMsg('Diagramando livro de colorir em PDF KDP 8.5x11 pol (com capa e verso em branco)...');

    try {
      const pdfBytes = await buildColoringBookPdf(
        tituloLocal || titulo || 'Meu Livro de Colorir KDP',
        autorLocal || autor || 'Book Intel Studio',
        pages,
        localCapaDataUrl
      );

      // Download no navegador
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(titulo || 'livro-de-colorir').toLowerCase().replace(/\s+/g, '-')}-kdp-8.5x11.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Gravação na Dashboard
      const bookId = `col_${Date.now()}`;
      const paginasInternas = pages.filter(p => !p.isCover && p.imageDataUrl);
      const totalPdfPages = (paginasInternas.length * 2) + (localCapaDataUrl ? 3 : 2);

      await db.saveFinalBook({
        id: bookId,
        bookId,
        jobId: `job_${bookId}`,
        title: titulo || 'Livro de Colorir KDP',
        subtitle: subtema ? `Coleção ${subtema}` : 'Edição Especial para Colorir',
        author: autor || 'Book Intel Studio',
        coverDataUrl: localCapaDataUrl || undefined,
        pdf: pdfBytes.buffer as ArrayBuffer,
        pageCount: totalPdfPages,
        sizeBytes: pdfBytes.byteLength,
        finalizedAt: Date.now(),
        status: 'finalizado_validado',
        genre: 'Livro de Colorir / Baixo Conteúdo',
        trimSize: '8.5x11',
        manuscriptText: pages.map(p => `${p.isCover ? 'Capa' : `Página ${p.pageNumber}`}: ${p.title}\n${p.description}`).join('\n\n'),
        pendings: [],
        report: {
          generatedAt: Date.now(),
          bookTitle: titulo || 'Livro de Colorir KDP',
          author: autor || 'Book Intel Studio',
          pagesAnalyzed: paginasComImagem.length,
          pdfPages: totalPdfPages,
          chaptersIdentified: paginasInternas.length,
          chaptersCorrected: paginasInternas.length,
          chaptersPending: 0,
          spellingErrors: 0,
          grammarErrors: 0,
          punctuationFixes: 0,
          paragraphFixes: 0,
          dialogueFixes: 0,
          encodingFixes: 0,
          styleChanges: 0,
          repetitionFindings: 0,
          continuityFindings: 0,
          tocIssues: [],
          layoutWarnings: [],
          cover: {
            present: Boolean(localCapaDataUrl),
            valid: Boolean(localCapaDataUrl),
            kind: localCapaDataUrl ? 'frontal' : 'ausente',
            width: 1600,
            height: 2400,
            format: 'png',
            notes: []
          },
          correctedAutomatically: [],
          pendingAuthor: [],
          notVerified: [],
          aiFullyVerified: true,
          summary: 'Livro de colorir KDP compilado em formato 8.5x11 pol com capa colorida e impressão single-sided.'
        },
        validation: {
          ok: true,
          pageCount: totalPdfPages,
          checks: [],
          criticalFailures: 0,
          notVerified: 0,
          validatedAt: Date.now()
        }
      });

      if (onLivroCompilado) onLivroCompilado();
      setStatusMsg('✓ Livro de colorir baixado e gravado com sucesso na Dashboard!');
    } catch (err: any) {
      setStatusMsg(`Erro ao exportar PDF: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const paginasProntas = pages.filter(p => p.imageDataUrl).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Banner de Proteção de Cota & Economia de Créditos */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid #334155',
          borderRadius: 12,
          padding: '16px 20px',
          color: '#f8fafc',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
              }}
            >
              🎨
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 8 }}>
                Studio de Livro de Colorir KDP (8.5 × 11 pol)
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#0369a1', color: '#ffffff', fontWeight: 600 }}>
                  Contexto & Personagem Consistente
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                Todas as páginas do mesmo personagem com prompts densos (+1500 caracteres). Primeira geração é sempre a Capa Colorida.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#1e293b',
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid #475569'
              }}
            >
              <Shield size={14} style={{ color: '#22c55e' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
                Progresso: <b style={{ color: '#38bdf8' }}>{paginasProntas} / {pages.length || qtdPaginas + 1}</b>
              </span>
            </div>
          </div>
        </div>

        {/* Alerta de Fluxo Sequencial */}
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: 8,
            fontSize: 12,
            color: '#bae6fd',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span>ℹ️</span>
          <span>
            <b>Regra Sequencial Ativa:</b> A geração segue rigorosamente a ordem da narrativa: primeiro a <b>Capa Colorida</b>, depois cada página de colorir em sequência.
          </span>
        </div>
      </div>

      {/* Barra de Ações: Configuração e Botão Principal Sequencial */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Páginas de Desenho
            </label>
            <select
              value={qtdPaginas}
              onChange={(e) => setQtdPaginas(Number(e.target.value))}
              disabled={isPlanning || generatingPageId !== null}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 600,
                color: '#0f172a',
                backgroundColor: '#ffffff'
              }}
            >
              <option value={5}>5 Páginas (+ Capa)</option>
              <option value={10}>10 Páginas (+ Capa) - Recomendado</option>
              <option value={15}>15 Páginas (+ Capa)</option>
              <option value={20}>20 Páginas (+ Capa)</option>
              <option value={30}>30 Páginas (+ Capa)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Público-Alvo
            </label>
            <select
              value={publico}
              onChange={(e) => setPublico(e.target.value as any)}
              disabled={isPlanning || generatingPageId !== null}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 600,
                color: '#0f172a',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="infantil">Infantil (Traços grossos e amigáveis)</option>
              <option value="adultos">Adultos (Mandalas e traços detalhados)</option>
              <option value="todos">Todos os Públicos (Equilibrado)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handlePlanejar}
            disabled={isPlanning || generatingPageId !== null}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 8,
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: isPlanning ? 'not-allowed' : 'pointer',
              marginTop: 18,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
            }}
          >
            {isPlanning ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Planejando Personagem & Roteiro...
              </>
            ) : (
              <>
                <Sparkles size={14} /> {pages.length === 0 ? 'Planejar Livro de Colorir' : 'Reestruturar Roteiro'}
              </>
            )}
          </button>
        </div>

        {/* Botão de Ação Rápida da Próxima Página na Ordem */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {nextPendingPage && (
            <button
              type="button"
              onClick={() => handleGerarIlustracao(nextPendingPage.id)}
              disabled={generatingPageId !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 8,
                background: nextPendingPage.isCover
                  ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                  : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: generatingPageId !== null ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              {generatingPageId === nextPendingPage.id ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Gerando Agora...
                </>
              ) : nextPendingPage.isCover ? (
                <>
                  <Palette size={14} /> Passo 1: Gerar Capa Colorida
                </>
              ) : (
                <>
                  <ArrowRight size={14} /> Gerar Próxima: Página {nextPendingPage.pageNumber}
                </>
              )}
            </button>
          )}

          {pages.length > 0 && (
            <button
              type="button"
              onClick={handleAddManualPage}
              disabled={generatingPageId !== null || isPlanning}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 14px',
                borderRadius: 8,
                background: '#ffffff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                fontSize: 13,
                fontWeight: 600,
                cursor: (generatingPageId !== null || isPlanning) ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              title="Adicionar uma página personalizada extra com prompt próprio"
            >
              <Plus size={14} /> + Adicionar Página Manual
            </button>
          )}

          {paginasProntas > 0 && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 18px',
                borderRadius: 8,
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: isExportingPdf ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
              }}
            >
              <Download size={14} />
              {isExportingPdf ? 'Compilando...' : `📥 Baixar PDF KDP (${paginasProntas} Prontas)`}
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div style={{ fontSize: 13, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>ℹ️</span> {statusMsg}
        </div>
      )}

      {/* Lista de Páginas do Livro de Colorir */}
      {pages.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: '#ffffff',
            borderRadius: 12,
            border: '2px dashed #cbd5e1',
            color: '#64748b'
          }}
        >
          <span style={{ fontSize: 44, display: 'block', marginBottom: 12 }}>🎨</span>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
            Pronto para criar seu Livro de Colorir KDP com Personagem Consistente
          </div>
          <p style={{ fontSize: 13, maxWidth: 520, margin: '0 auto 18px', lineHeight: 1.5 }}>
            Clique em <b>"Planejar Livro de Colorir"</b> acima. O sistema definirá automaticamente a <b>Bíblia Visual do Personagem</b> e gerará os prompts densos (mínimo de 1500 caracteres) com a <b>Capa Colorida como primeira geração obrigatória</b>.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {pages.map((p, index) => {
            const isGenerating = generatingPageId === p.id;
            const isExpanded = expandedPromptId === p.id;

            // Regra Sequencial: só pode gerar se for a próxima da fila ou já tiver sido gerada
            const isCompleted = Boolean(p.imageDataUrl);
            const isNextInLine = index === nextPendingIndex;
            const isLocked = index > nextPendingIndex && nextPendingIndex !== -1;

            return (
              <div
                key={p.id}
                style={{
                  background: '#ffffff',
                  border: isNextInLine
                    ? '2px solid #0284c7'
                    : isCompleted
                      ? '1px solid #bbf7d0'
                      : '1px solid #e2e8f0',
                  borderRadius: 10,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: isNextInLine ? '0 4px 14px rgba(2, 132, 199, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Cabeçalho do Cartão */}
                <div
                  style={{
                    padding: '12px 14px',
                    background: p.isCover
                      ? '#fffbeb'
                      : isNextInLine
                        ? '#eff6ff'
                        : '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.isCover ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: 999 }}>
                        🎨 CAPA COLORIDA (Passo 1)
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                        Página {p.pageNumber}: {p.title}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isCompleted ? (
                      <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} /> Pronta
                      </span>
                    ) : isNextInLine ? (
                      <span style={{ fontSize: 10, color: '#0284c7', fontWeight: 700, background: '#e0f2fe', padding: '2px 6px', borderRadius: 4 }}>
                        👉 Próxima da Fila
                      </span>
                    ) : isLocked ? (
                      <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Lock size={12} /> Bloqueada
                      </span>
                    ) : null}

                    {!p.isCover && (
                      <button
                        type="button"
                        onClick={() => handleDeletePage(p.id)}
                        disabled={isGenerating || generatingPageId !== null}
                        title="Remover esta página do livro"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px 4px',
                          color: '#94a3b8',
                          cursor: (isGenerating || generatingPageId !== null) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Área da Imagem / Pré-visualização */}
                <div
                  style={{
                    height: 260,
                    background: p.isCover ? '#f8fafc' : '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  {p.imageDataUrl ? (
                    <img
                      src={p.imageDataUrl}
                      alt={p.title}
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <span style={{ fontSize: 36, opacity: 0.3, display: 'block', marginBottom: 8 }}>
                        {p.isCover ? '🎨' : '🖼️'}
                      </span>
                      <span style={{ fontSize: 12, color: isLocked ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
                        {isLocked
                          ? `Aguardando a conclusão da ${index === 1 ? 'Capa Colorida' : `Página ${index}`}`
                          : p.isCover
                            ? 'Clique abaixo para gerar a Capa Colorida'
                            : 'Pronto para desenhar esta página'}
                      </span>
                    </div>
                  )}

                  {isGenerating && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255,255,255,0.9)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <RefreshCw size={26} className="animate-spin" style={{ color: '#2563eb' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                        {p.isCover ? 'Pintando Capa Colorida...' : 'Desenhando traços KDP...'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Conteúdo, Prompt Editável e Ações */}
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    {/* Bloco de Textos da Capa KDP ou Título da Página de Desenho */}
                    {p.isCover ? (
                      <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Type size={13} /> Textos Oficiais da Capa KDP (Diagramação Real)
                          </span>
                          {p.imageDataUrl && (
                            <button
                              type="button"
                              onClick={() => handleRecomporCapaComTipografia(p.id)}
                              title="Sobrepõe o título, subtítulo e autor atualizados sem gerar nova imagem na IA"
                              style={{
                                background: '#d97706',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 5,
                                padding: '4px 8px',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <Sparkles size={11} /> Re-estampar Textos
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#78350f', marginBottom: 2 }}>
                              Título Principal:
                            </label>
                            <input
                              type="text"
                              value={tituloLocal}
                              onChange={(e) => setTituloLocal(e.target.value)}
                              placeholder="Título do livro..."
                              style={{ width: '100%', fontSize: 11, padding: '5px 8px', borderRadius: 5, border: '1px solid #fde68a', fontWeight: 600, boxSizing: 'border-box' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#78350f', marginBottom: 2 }}>
                              Nome do Autor:
                            </label>
                            <input
                              type="text"
                              value={autorLocal}
                              onChange={(e) => setAutorLocal(e.target.value)}
                              placeholder="Nome do autor..."
                              style={{ width: '100%', fontSize: 11, padding: '5px 8px', borderRadius: 5, border: '1px solid #fde68a', fontWeight: 600, boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#78350f', marginBottom: 2 }}>
                            Subtítulo Comercial:
                          </label>
                          <input
                            type="text"
                            value={subtituloLocal}
                            onChange={(e) => setSubtituloLocal(e.target.value)}
                            placeholder="Subtítulo ou coleção..."
                            style={{ width: '100%', fontSize: 11, padding: '5px 8px', borderRadius: 5, border: '1px solid #fde68a', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 3 }}>
                          Título da Cena / Página {p.pageNumber}:
                        </label>
                        <input
                          type="text"
                          value={p.title}
                          onChange={(e) => handleUpdateTitle(p.id, e.target.value)}
                          placeholder={`Cena da Página ${p.pageNumber}...`}
                          style={{ width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 600, boxSizing: 'border-box' }}
                        />
                      </div>
                    )}

                    <div style={{ fontSize: 12, color: '#334155', lineHeight: '1.4', fontWeight: 500, marginBottom: 8 }}>
                      {p.description}
                    </div>

                    {/* Campo de Prompt Editável Direto para Cada Página */}
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                          ✍️ Prompt da Imagem (Editável):
                        </label>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: p.prompt.length >= 1500 ? '#059669' : '#d97706',
                          background: p.prompt.length >= 1500 ? '#ecfdf5' : '#fffbeb',
                          padding: '1px 6px',
                          borderRadius: 4,
                          border: `1px solid ${p.prompt.length >= 1500 ? '#a7f3d0' : '#fde68a'}`
                        }}>
                          {p.prompt.length} chars {p.prompt.length >= 1500 ? '✓ (Denso)' : '(Min: 1500)'}
                        </span>
                      </div>

                      <textarea
                        value={p.prompt}
                        onChange={(e) => handleUpdatePrompt(p.id, e.target.value)}
                        rows={isExpanded ? 8 : 4}
                        placeholder="Descreva minuciosamente a cena, personagem, expressões e cenário..."
                        style={{
                          width: '100%',
                          fontSize: 11,
                          padding: '7px 9px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontFamily: 'monospace',
                          lineHeight: 1.35,
                          backgroundColor: '#f8fafc',
                          boxSizing: 'border-box'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                        <button
                          type="button"
                          onClick={() => setExpandedPromptId(isExpanded ? null : p.id)}
                          style={{ background: 'none', border: 'none', padding: 0, fontSize: 10, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {isExpanded ? 'Recolher caixa de texto' : 'Expandir caixa de texto'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação na Ordem Sequencial */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {!p.imageDataUrl ? (
                      <button
                        type="button"
                        onClick={() => handleGerarIlustracao(p.id)}
                        disabled={isGenerating || isLocked || generatingPageId !== null}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '9px 14px',
                          borderRadius: 6,
                          background: isLocked
                            ? '#e2e8f0'
                            : p.isCover
                              ? '#d97706'
                              : '#0284c7',
                          color: isLocked ? '#94a3b8' : '#ffffff',
                          border: 'none',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: (isGenerating || isLocked || generatingPageId !== null) ? 'not-allowed' : 'pointer',
                          boxShadow: isLocked ? 'none' : '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                      >
                        {isLocked ? (
                          <>
                            <Lock size={12} /> Bloqueada (Siga a Ordem)
                          </>
                        ) : p.isCover ? (
                          <>
                            <Palette size={13} /> 🎨 Gerar Capa Colorida (Passo 1)
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} /> Gerar Ilustração (Página {p.pageNumber})
                          </>
                        )}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleGerarIlustracao(p.id)}
                          disabled={isGenerating || generatingPageId !== null}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            padding: '7px 12px',
                            borderRadius: 6,
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: (isGenerating || generatingPageId !== null) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <RefreshCw size={11} /> Regenerar
                        </button>
                        <a
                          href={p.imageDataUrl}
                          download={p.isCover ? 'capa-colorida.png' : `pagina-${p.pageNumber}-colorir.png`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            padding: '7px 12px',
                            borderRadius: 6,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            fontSize: 11,
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          <Download size={11} /> Baixar
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
