import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, Edit3, Check, X,
  Download, AlertTriangle, Sparkles, RefreshCw, CheckCircle2,
  FileText, ArrowRight, Eye, ShieldCheck, Layers, Maximize2
} from 'lucide-react';
import { chamarGeminiTexto } from '../../../services/kdp-ai-engine';
import { buildKdpPdf } from '../../../services/kdp-pdf-builder';

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
  };
  onUpdateCapitulo: (chapterIndex: number, novoTexto: string, novoTitulo?: string) => void;
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
  silhuetaConfig,
  onUpdateCapitulo,
  onDownloadPdf
}) => {
  if (!isOpen) return null;

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'leitor' | 'pdf_real'>('leitor');
  const [viewMode, setViewMode] = useState<'single' | 'spread'>('single');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');
  const [isCompletingWithAi, setIsCompletingWithAi] = useState<boolean>(false);
  const [aiCompletionSuccess, setAiCompletionSuccess] = useState<string | null>(null);
  const [compiledPdfUrl, setCompiledPdfUrl] = useState<string | null>(null);
  const [isBuildingPdf, setIsBuildingPdf] = useState<boolean>(false);

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

      // Fatiar os parágrafos em blocos que caibam em páginas
      let currentPageParas: string[] = [];
      let currentWordCount = 0;
      let chapterPagesCreated = 0;

      for (let i = 0; i < rawParas.length; i++) {
        const para = rawParas[i];
        const paraWords = para.split(/\s+/).filter(Boolean).length;

        // Se o parágrafo atual somado exceder a página e a página já tiver texto
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

      // Última página do capítulo
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

  // Atualiza texto para edição quando muda de página
  useEffect(() => {
    if (currentPage && currentPage.kind === 'capitulo' && currentPage.chapterIndex !== undefined) {
      const fullText = livro.capitulos[currentPage.chapterIndex]?.texto || '';
      setEditedText(fullText);
    }
    setIsEditing(false);
    setAiCompletionSuccess(null);
  }, [currentPageIndex, livro]);

  // Teclado: Seta Esquerda e Direita para navegar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return; // Não interfere na digitação
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
  }, [totalPages, isEditing, onClose]);

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
            silhuetaConfig: silhuetaConfig?.ativado && silhuetaConfig.imagemDataUrl ? {
              ativado: true,
              imagemDataUrl: silhuetaConfig.imagemDataUrl,
              paginasSelecionadas: silhuetaConfig.paginasSelecionadas || [],
              opacidade: silhuetaConfig.opacidade,
              sangriaPct: silhuetaConfig.sangriaPct
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
  }, [activeTab, livro, capaUrl, formato, optSumario, tamCapitulo, corCapitulo, silhuetaConfig]);

  // Salvar edição manual feita no capítulo
  const handleSaveEdit = () => {
    if (currentPage && currentPage.chapterIndex !== undefined) {
      onUpdateCapitulo(currentPage.chapterIndex, editedText);
      setIsEditing(false);
      setAiCompletionSuccess('Texto do capítulo salvo e atualizado com sucesso!');
      setTimeout(() => setAiCompletionSuccess(null), 3500);
    }
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
O seguinte trecho do ${isUltimo ? 'ÚLTIMO CAPÍTULO (DESFECHO DO LIVRO)' : 'final de um capítulo'} de "${livro.titulo}" terminou de forma abrupta ou com frase cortada faltando palavras:
"${trechoFinal}"

SUA TAREFA:
Escreva a continuação e conclusão perfeita desta última frase (1 a 2 períodos no máximo), finalizando obrigatoriamente com ponto final (.).
${isUltimo ? 'Garanta que seja uma frase memorável e comovente de encerramento definitivo da obra.' : 'Garanta que conclua o pensamento com clareza literária e naturalidade.'}
Retorne APENAS a frase de continuação e fechamento, sem introdução, sem aspas e sem comentários.`;

      const res = await chamarGeminiTexto(prompt, {
        temperature: 0.7,
        maxTokens: 250,
        systemInstruction: 'Retorne apenas a frase finalizadora com ponto final, sem introdução nem explicações.'
      });

      let conclusao = res.texto.trim().replace(/^["']|["']$/g, '');
      if (!/[.!?]$/.test(conclusao)) conclusao += '.';

      // Concatena a conclusão ao texto
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

  // Encontrar o índice da última página do livro
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
        padding: '16px 20px',
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
            padding: '14px 20px',
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

          {/* ABAS: LEITOR INTERATIVO VS PDF REAL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f172a', padding: 4, borderRadius: 8, border: '1px solid #334155' }}>
            <button
              type="button"
              onClick={() => setActiveTab('leitor')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'leitor' ? '#3b82f6' : 'transparent',
                color: activeTab === 'leitor' ? '#ffffff' : '#94a3b8',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <BookOpen size={14} /> 📖 Folhear Páginas (Interativo)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pdf_real')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'pdf_real' ? '#3b82f6' : 'transparent',
                color: activeTab === 'pdf_real' ? '#ffffff' : '#94a3b8',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <FileText size={14} /> 📄 PDF Compilado Real
            </button>
          </div>

          {/* BOTÕES DE AÇÃO: BAIXAR PDF E FECHAR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setCurrentPageIndex(lastPageIndex)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 12px',
                borderRadius: 6,
                background: '#334155',
                color: '#e2e8f0',
                border: '1px solid #475569',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Saltar diretamente para a última página do livro para checar a conclusão"
            >
              <ArrowRight size={13} /> Ir para o Final do Livro
            </button>

            <button
              type="button"
              onClick={onDownloadPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 16px',
                borderRadius: 6,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Download size={14} /> Baixar PDF KDP
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#334155',
                border: 'none',
                color: '#94a3b8',
                width: 34,
                height: 34,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Fechar Revisor"
            >
              <X size={18} />
            </button>
          </div>
        </div>

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
                  padding: '24px 20px',
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
                  {/* SE FOR CAPA COLORIDA */}
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

                  {/* SE FOR FOLHA DE ROSTO */}
                  {currentPage.kind === 'rosto' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 10px' }}>
                      <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#64748b', marginBottom: 24 }}>
                        Publicação Editorial Amazon KDP
                      </span>
                      <h1 style={{ fontSize: '2.1rem', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a', lineHeight: 1.2 }}>
                        {livro.titulo}
                      </h1>
                      {livro.subtitulo && (
                        <p style={{ fontSize: '1.1rem', fontStyle: 'italic', color: '#475569', margin: '0 0 40px 0', maxWidth: 440 }}>
                          {livro.subtitulo}
                        </p>
                      )}
                      <div style={{ width: 60, height: 2, background: '#cbd5e1', marginBottom: 40 }} />
                      <p style={{ fontSize: '1rem', color: '#1e293b', margin: 0, fontWeight: 600 }}>
                        por {livro.autor}
                      </p>
                      <div style={{ marginTop: 'auto', paddingTop: 60, fontSize: 11, color: '#94a3b8' }}>
                        Todos os direitos reservados • Formato oficial {formato}
                      </div>
                    </div>
                  )}

                  {/* SE FOR SUMÁRIO */}
                  {currentPage.kind === 'sumario' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h2 style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700, marginBottom: 28, color: '#0f172a' }}>
                        Sumário
                      </h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {livro.capitulos.map((c, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              justifyContent: 'space-between',
                              fontSize: 13,
                              borderBottom: '1px dotted #cbd5e1',
                              paddingBottom: 4
                            }}
                          >
                            <span style={{ color: '#1e293b', fontWeight: 600 }}>
                              {i + 1}. {c.titulo}
                            </span>
                            <span style={{ color: '#64748b', fontSize: 12 }}>
                              Cap. {i + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SE FOR PÁGINA DE CAPÍTULO DO MIOLO */}
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

                      {/* TEXTO DA PÁGINA */}
                      <div style={{ flex: 1 }}>
                        {currentPage.paragraphs.map((p, pIdx) => (
                          <p
                            key={pIdx}
                            style={{
                              textIndent: currentPage.isFirstOfChapter && pIdx === 0 ? '0' : '1.8em',
                              marginBottom: 10,
                              textAlign: 'justify',
                              lineHeight: 1.65,
                              fontSize: '0.94rem',
                              color: '#1e293b'
                            }}
                          >
                            {p}
                          </p>
                        ))}
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

              {/* MODAL DE EDIÇÃO AO VIVO (SE ATIVADO) */}
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
                      ✏️ Editando: Capítulo {(currentPage.chapterIndex || 0) + 1} — {currentPage.chapterTitle}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      As alterações serão salvas imediatamente no projeto e refletidas no PDF.
                    </span>
                  </div>

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
