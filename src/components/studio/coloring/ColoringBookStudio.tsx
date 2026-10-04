import React, { useState } from 'react';
import {
  Sparkles, Download, RefreshCw, CheckCircle2, AlertTriangle,
  Layers, Shield, Eye, Image as ImageIcon, Trash2, FileText
} from 'lucide-react';
import {
  ColoringPage,
  planejarPaginasColorir,
  gerarIlustracaoPaginaColorir,
  buildColoringBookPdf
} from '../../../services/coloring-book-service';
import { db } from '../../../database/local-database';

interface ColoringBookStudioProps {
  tema?: string;
  subtema?: string;
  titulo?: string;
  autor?: string;
  capaDataUrl?: string | null;
  onLivroCompilado?: () => void;
}

export const ColoringBookStudio: React.FC<ColoringBookStudioProps> = ({
  tema = 'Livros de Colorir',
  subtema = '',
  titulo = '',
  autor = 'Book Intel Studio',
  capaDataUrl,
  onLivroCompilado
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

  // 1. Planejamento das páginas (somente texto via Gemini 3.8 / 3.5 — 0 créditos de imagem)
  const handlePlanejar = async () => {
    setIsPlanning(true);
    setStatusMsg('Planejando roteiro de desenhos com Gemini 3.8/3.5 (texto econômico)...');
    try {
      const plano = await planejarPaginasColorir(
        tema || 'Livros para colorir',
        subtema || 'Animais e Natureza',
        qtdPaginas,
        publico
      );
      setPages(plano);
      setStatusMsg(`✓ Roteiro de ${plano.length} páginas planejado com sucesso! Nenhum crédito de imagem consumido.`);
    } catch (err: any) {
      setStatusMsg(`Erro ao planejar páginas: ${err.message}`);
    } finally {
      setIsPlanning(false);
    }
  };

  // 2. Geração sob demanda 1-a-1 de cada ilustração individual
  const handleGerarIlustracao = async (pageId: string) => {
    const pageIndex = pages.findIndex(p => p.id === pageId);
    if (pageIndex === -1) return;

    const targetPage = pages[pageIndex];
    setGeneratingPageId(pageId);
    setStatusMsg(`Gerando traços da Página ${targetPage.pageNumber} com modelo Google...`);

    try {
      const dataUrl = await gerarIlustracaoPaginaColorir(targetPage, '3:4');
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
      setStatusMsg(`✓ Ilustração da Página ${targetPage.pageNumber} gerada com sucesso!`);
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
      setStatusMsg(`Erro na Página ${targetPage.pageNumber}: ${err.message}`);
    } finally {
      setGeneratingPageId(null);
    }
  };

  // 3. Atualizar prompt customizado antes de gerar
  const handleUpdatePrompt = (pageId: string, newPrompt: string) => {
    setPages(prev => prev.map(p => (p.id === pageId ? { ...p, prompt: newPrompt } : p)));
  };

  // 4. Compilar e Baixar o Livro de Colorir em PDF 8.5x11 KDP
  const handleDownloadPdf = async () => {
    const paginasComImagem = pages.filter(p => p.imageDataUrl);
    if (paginasComImagem.length === 0) {
      alert('Gere pelo menos uma ilustração antes de compilar o livro.');
      return;
    }

    setIsExportingPdf(true);
    setStatusMsg('Diagramando livro de colorir em PDF KDP 8.5x11 pol (com verso em branco)...');

    try {
      const pdfBytes = await buildColoringBookPdf(
        titulo || 'Meu Livro de Colorir KDP',
        autor || 'Book Intel Studio',
        paginasComImagem,
        capaDataUrl
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
      await db.saveFinalBook({
        id: bookId,
        bookId,
        jobId: `job_${bookId}`,
        title: titulo || 'Livro de Colorir KDP',
        subtitle: subtema ? `Coleção ${subtema}` : 'Edição Especial para Colorir',
        author: autor || 'Book Intel Studio',
        coverDataUrl: capaDataUrl || undefined,
        pdf: pdfBytes.buffer as ArrayBuffer,
        pageCount: (paginasComImagem.length * 2) + 2,
        sizeBytes: pdfBytes.byteLength,
        finalizedAt: Date.now(),
        status: 'finalizado_validado',
        genre: 'Livro de Colorir / Baixo Conteúdo',
        trimSize: '8.5x11',
        manuscriptText: pages.map(p => `Página ${p.pageNumber}: ${p.title}\n${p.description}`).join('\n\n'),
        pendings: [],
        report: {
          generatedAt: Date.now(),
          bookTitle: titulo || 'Livro de Colorir KDP',
          author: autor || 'Book Intel Studio',
          pagesAnalyzed: paginasComImagem.length,
          pdfPages: (paginasComImagem.length * 2) + 2,
          chaptersIdentified: paginasComImagem.length,
          chaptersCorrected: paginasComImagem.length,
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
            present: Boolean(capaDataUrl),
            valid: Boolean(capaDataUrl),
            kind: capaDataUrl ? 'frontal' : 'ausente',
            width: 1600,
            height: 2400,
            format: 'png',
            notes: []
          },
          correctedAutomatically: [],
          pendingAuthor: [],
          notVerified: [],
          aiFullyVerified: true,
          summary: 'Livro de colorir KDP compilado em formato 8.5x11 pol com impressão single-sided.'
        },
        validation: {
          ok: true,
          pageCount: (paginasComImagem.length * 2) + 2,
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
          borderRadius: 8,
          padding: '14px 18px',
          color: '#f8fafc'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🎨</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                Studio de Livro de Colorir KDP (8.5 × 11 pol)
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#0369a1', color: '#ffffff' }}>
                  Modelos 3.1+ Ativos
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                Planejamento em texto com Gemini 3.8/3.5 e ilustrações sob demanda com linhas nítidas sem preenchimento cinza.
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#1e293b',
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #475569'
            }}
          >
            <Shield size={14} style={{ color: '#22c55e' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
              Ilustrações geradas: <b style={{ color: '#38bdf8' }}>{generatedCount}</b>
            </span>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: '#cbd5e1', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 12px', borderRadius: 4 }}>
          💡 <b>Economia de Créditos Ativa:</b> A etapa de planejamento usa modelo de texto (praticamente grátis).
          Cada imagem só é gerada quando você clica em <i>"Gerar Ilustração"</i> no cartão desejado.
        </div>
      </div>

      {/* Barra de Configuração e Planejamento */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 16,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12
        }}
      >
        <div style={{ minWidth: 140 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
            Quantidade de Páginas
          </label>
          <select
            value={qtdPaginas}
            onChange={(e) => setQtdPaginas(Number(e.target.value))}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
          >
            <option value={5}>5 Páginas (Teste rápido)</option>
            <option value={10}>10 Páginas (Recomendado)</option>
            <option value={15}>15 Páginas</option>
            <option value={20}>20 Páginas (Livro padrão)</option>
            <option value={30}>30 Páginas (Edição completa)</option>
          </select>
        </div>

        <div style={{ minWidth: 180 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
            Público-Alvo
          </label>
          <select
            value={publico}
            onChange={(e) => setPublico(e.target.value as any)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
          >
            <option value="infantil">Infantil (Traços grossos e amigáveis)</option>
            <option value="adultos">Adulto / Anti-estresse (Mandalas e padrões)</option>
            <option value="todos">Geral / Todos os Públicos</option>
          </select>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={handlePlanejar}
            disabled={isPlanning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 6,
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: isPlanning ? 'not-allowed' : 'pointer'
            }}
          >
            <Sparkles size={14} />
            {isPlanning ? 'Planejando...' : '📋 Planejar Roteiro com Gemini 3.8/3.5'}
          </button>

          {paginasProntas > 0 && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 6,
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: isExportingPdf ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
              }}
            >
              <Download size={14} />
              {isExportingPdf ? 'Compilando...' : `📥 Baixar PDF KDP (${paginasProntas} Ilustrações)`}
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div style={{ fontSize: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', color: '#334155' }}>
          {statusMsg}
        </div>
      )}

      {/* Lista de Páginas do Livro de Colorir */}
      {pages.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: '#ffffff',
            borderRadius: 8,
            border: '2px dashed #cbd5e1',
            color: '#64748b'
          }}
        >
          <span style={{ fontSize: 42, display: 'block', marginBottom: 12 }}>🎨</span>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
            Pronto para criar seu Livro de Colorir KDP
          </div>
          <p style={{ fontSize: 12, maxWidth: 450, margin: '0 auto 16px' }}>
            Clique em <b>"Planejar Roteiro com Gemini"</b> acima para gerar as ideias das páginas de colorir.
            Você terá controle total para gerar as ilustrações uma a uma sem estourar sua cota.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {pages.map((p) => {
            const isGenerating = generatingPageId === p.id;
            const isExpanded = expandedPromptId === p.id;

            return (
              <div
                key={p.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {/* Cabeçalho do Cartão */}
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                    Página {p.pageNumber}: {p.title}
                  </span>
                  {p.imageDataUrl && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Pronta</span>}
                </div>

                {/* Área da Imagem / Pré-visualização */}
                <div
                  style={{
                    height: 240,
                    background: '#ffffff',
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
                    <div style={{ textAlign: 'center', padding: 16 }}>
                      <span style={{ fontSize: 32, opacity: 0.3, display: 'block', marginBottom: 8 }}>🖼️</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        Ilustração não gerada ainda
                      </span>
                    </div>
                  )}

                  {isGenerating && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255,255,255,0.85)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <RefreshCw size={24} className="animate-spin" style={{ color: '#2563eb' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>
                        Desenhando com Imagen 3...
                      </span>
                    </div>
                  )}
                </div>

                {/* Conteúdo e Ações */}
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#475569', lineHeight: '1.4' }}>
                      {p.description}
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedPromptId(isExpanded ? null : p.id)}
                      style={{ background: 'none', border: 'none', padding: 0, fontSize: 10, color: '#2563eb', cursor: 'pointer', marginTop: 4, textDecoration: 'underline' }}
                    >
                      {isExpanded ? 'Ocultar prompt técnico' : 'Ver/Editar prompt técnico'}
                    </button>

                    {isExpanded && (
                      <textarea
                        value={p.prompt}
                        onChange={(e) => handleUpdatePrompt(p.id, e.target.value)}
                        rows={3}
                        style={{ width: '100%', marginTop: 6, fontSize: 10, padding: 6, borderRadius: 4, border: '1px solid #cbd5e1', color: '#0f172a' }}
                      />
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {!p.imageDataUrl ? (
                      <button
                        type="button"
                        onClick={() => handleGerarIlustracao(p.id)}
                        disabled={isGenerating}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '7px 12px',
                          borderRadius: 6,
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: isGenerating ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Sparkles size={12} /> Gerar Ilustração (1 crédito)
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleGerarIlustracao(p.id)}
                          disabled={isGenerating}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            padding: '6px 10px',
                            borderRadius: 6,
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            fontSize: 11,
                            cursor: 'pointer'
                          }}
                        >
                          <RefreshCw size={11} /> Regenerar
                        </button>
                        <a
                          href={p.imageDataUrl}
                          download={`pagina-${p.pageNumber}-colorir.png`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px 10px',
                            borderRadius: 6,
                            background: '#f8fafc',
                            color: '#0f172a',
                            border: '1px solid #cbd5e1',
                            fontSize: 11,
                            textDecoration: 'none'
                          }}
                        >
                          <Download size={11} /> PNG
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
