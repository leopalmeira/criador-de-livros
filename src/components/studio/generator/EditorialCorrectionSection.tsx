// ================================================================
// SEÇÃO: CORREÇÃO EDITORIAL AUTOMÁTICA — CAPÍTULO POR CAPÍTULO
// Interface completa com progresso real, status por capítulo,
// indicadores de capa/sumário/diagramação/PDF, relatório e download.
// ================================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wand2, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw,
  Pause, Play, Download, Eye, FileText, ShieldCheck, BookOpen,
  ChevronRight, Sparkles, X, Check, ArrowRight
} from 'lucide-react';
import type {
  EditorialJob,
  EditorialReport,
  FinalBookRecord,
  ChapterRecord,
  CorrectionChange,
  PendingItem,
  JobStatus
} from '../../../types/editorial-correction';
import {
  runEditorialPipeline,
  indexedDbStore,
  computeBookId,
  type PipelineLivro,
  type PipelineConfig,
  type PipelineProgress
} from '../../../services/kdp-editorial-pipeline';
import { defaultAiCall } from '../../../services/kdp-editorial-corrector';
import { db } from '../../../database/local-database';

interface Props {
  livro: PipelineLivro | null;
  capaFinal: string | null;
  formato: string;
  optSumario: boolean;
  tamCapitulo: number;
  corCapitulo: string;
  topico?: string;
  onBookUpdated: (livroAtualizado: PipelineLivro) => void;
  onStatusMessage?: (msg: string, type: 'normal' | 'ok' | 'error') => void;
}

export const EditorialCorrectionSection: React.FC<Props> = ({
  livro,
  capaFinal,
  formato,
  optSumario,
  tamCapitulo,
  corCapitulo,
  topico,
  onBookUpdated,
  onStatusMessage
}) => {
  const [job, setJob] = useState<EditorialJob | null>(null);
  const [finalBook, setFinalBook] = useState<FinalBookRecord | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStageMessage, setCurrentStageMessage] = useState('');
  const [selectedChapterDetails, setSelectedChapterDetails] = useState<ChapterRecord | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPendingsModal, setShowPendingsModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const shouldStopRef = useRef(false);
  const bookId = computeBookId(livro);

  // Carrega job existente e livro finalizado ao montar ou mudar livro
  const loadExistingState = useCallback(async () => {
    try {
      const existingJob = await indexedDbStore.loadJob(bookId);
      if (existingJob) {
        setJob(existingJob);
        if (existingJob.finalBookId) {
          const fb = await db.getFinalBook(existingJob.finalBookId);
          if (fb) setFinalBook(fb);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar estado editorial:', e);
    }
  }, [bookId]);

  useEffect(() => {
    loadExistingState();
  }, [loadExistingState]);

  const pipelineConfig: PipelineConfig = {
    formato,
    optSumario,
    tamCapitulo,
    corCapitulo
  };

  // EXECUTA A CORREÇÃO EDITORIAL COMPLETA (OU CONTINUA DE ONDE PAROU)
  const handleStartCorrection = async (forceRestart = false) => {
    if (!livro || livro.capitulos.length === 0) {
      onStatusMessage?.('O livro deve conter capítulos antes de iniciar a correção.', 'error');
      return;
    }

    shouldStopRef.current = false;
    setIsRunning(true);
    setProgressPercent(forceRestart ? 1 : (job ? Math.round((job.chapters.filter(c => c.status === 'corrigido_salvo' || c.status === 'pendente_autor').length / Math.max(1, job.chapters.length)) * 60) : 1));
    setCurrentStageMessage('Iniciando pipeline de correção editorial capítulo a capítulo...');

    try {
      const res = await runEditorialPipeline({
        livro,
        capaDataUrl: capaFinal,
        config: pipelineConfig,
        premissa: topico,
        ai: defaultAiCall,
        store: indexedDbStore,
        forceRestart,
        shouldStop: () => shouldStopRef.current,
        onProgress: (p: PipelineProgress) => {
          setProgressPercent(p.percent);
          setCurrentStageMessage(p.message);
          setJob({ ...p.job });
        }
      });

      setJob({ ...res.job });

      if (res.livroCorrigido) {
        onBookUpdated(res.livroCorrigido);
      }

      if (res.final) {
        setFinalBook(res.final);
      }

      if (res.outcome === 'concluido') {
        onStatusMessage?.('LIVRO CORRIGIDO E FINALIZADO COM SUCESSO! PDF validado e salvo.', 'ok');
      } else if (res.outcome === 'interrompido') {
        onStatusMessage?.('Processo pausado. Todos os capítulos concluídos até aqui foram salvos.', 'normal');
      } else if (res.outcome === 'aguardando_capa') {
        onStatusMessage?.(res.message, 'normal');
      } else if (res.outcome === 'erro_ia') {
        onStatusMessage?.(res.message, 'error');
      } else {
        onStatusMessage?.(res.message, 'error');
      }
    } catch (err: any) {
      console.error('Falha no pipeline editorial:', err);
      onStatusMessage?.(`Erro no processamento editorial: ${err.message || err}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  // APENAS REVALIDA O LIVRO CORRIGIDO (DIAGRAMAÇÃO E PDF)
  const handleValidateOnly = async () => {
    if (!livro || !job || job.chapters.length === 0) {
      onStatusMessage?.('Execute a correção dos capítulos antes de validar o livro final.', 'error');
      return;
    }

    shouldStopRef.current = false;
    setIsRunning(true);
    setCurrentStageMessage('Revalidando diagramação e integridade do PDF...');

    try {
      const res = await runEditorialPipeline({
        livro,
        capaDataUrl: capaFinal,
        config: pipelineConfig,
        premissa: topico,
        ai: null,
        store: indexedDbStore,
        onlyFinalize: true,
        shouldStop: () => shouldStopRef.current,
        onProgress: (p: PipelineProgress) => {
          setProgressPercent(p.percent);
          setCurrentStageMessage(p.message);
          setJob({ ...p.job });
        }
      });

      setJob({ ...res.job });
      if (res.final) setFinalBook(res.final);

      if (res.outcome === 'concluido') {
        onStatusMessage?.('LIVRO CORRIGIDO E FINALIZADO COM SUCESSO! PDF validado e salvo.', 'ok');
      } else {
        onStatusMessage?.(res.message, 'error');
      }
    } catch (err: any) {
      console.error(err);
      onStatusMessage?.(`Erro na validação do livro: ${err.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    shouldStopRef.current = true;
    setCurrentStageMessage('Interrompendo processo... Salvando até o último capítulo concluído.');
  };

  // RESTAURAR MANUSCRITO ORIGINAL
  const handleRestoreOriginal = async () => {
    if (!job?.original) return;
    if (confirm('Tem certeza de que deseja restaurar o manuscrito original? As correções atuais deste livro serão descartadas.')) {
      await db.deleteEditorialJob(bookId);
      if (finalBook) await db.deleteFinalBook(finalBook.id);
      onBookUpdated({
        titulo: job.original.titulo,
        subtitulo: job.original.subtitulo,
        autor: job.original.autor,
        genero: job.original.genero,
        idioma: job.original.idioma,
        capitulos: job.original.capitulos.map(c => ({ titulo: c.titulo, texto: c.texto }))
      });
      setJob(null);
      setFinalBook(null);
      setProgressPercent(0);
      onStatusMessage?.('Manuscrito original restaurado com sucesso.', 'normal');
    }
  };

  // BAIXAR PDF FINAL
  const handleDownloadFinalPdf = () => {
    if (!finalBook) return;
    const blob = new Blob([finalBook.pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(livro?.titulo || 'Livro').replace(/\s+/g, '_')}_KDP_FINAL.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // VISUALIZAR PDF
  const handleOpenPdfPreview = () => {
    if (!finalBook) return;
    const blob = new Blob([finalBook.pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPdfPreviewUrl(url);
  };

  // ESTATÍSTICAS
  const totalChapters = job?.chapters.length || livro?.capitulos?.length || 0;
  const doneChapters = job?.chapters.filter(c => c.status === 'corrigido_salvo' || c.status === 'pendente_autor').length || 0;
  const isComplete = job?.status === 'concluido' && !!finalBook;
  const totalErrorsFixed = job?.chapters.reduce((s, c) => s + c.errorsFixed, 0) || 0;
  const totalPendings = (job?.chapters.reduce((s, c) => s + c.pendings.length, 0) || 0) + (job?.crossReview?.findings.length || 0);

  const getStatusBadge = (status: ChapterRecord['status']) => {
    switch (status) {
      case 'corrigido_salvo':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>✓ Corrigido e salvo</span>;
      case 'pendente_autor':
        return <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>⚠️ Pendente de validação</span>;
      case 'corrigindo':
        return <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>⚡ Corrigindo...</span>;
      case 'validando':
        return <span style={{ background: '#fef9c3', color: '#a16207', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>🔍 Validando...</span>;
      case 'em_analise':
        return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>Analisando...</span>;
      case 'erro':
        return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>✗ Erro</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>Aguardando</span>;
    }
  };

  if (!livro || livro.capitulos.length === 0) {
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '36px 24px',
        textAlign: 'center',
        color: '#64748b'
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✍️</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
          Nenhum manuscrito disponível para correção editorial
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', maxWidth: 480, margin: '0 auto' }}>
          Gere o livro ou ao menos um capítulo na aba principal para ativar a suíte editorial profissional capítulo a capítulo.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: 12,
      padding: '20px 24px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
      {/* 1. CABEÇALHO DA SEÇÃO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>✍️</span>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
              CORREÇÃO EDITORIAL AUTOMÁTICA — CAPÍTULO POR CAPÍTULO
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
            Fluxo editorial KDP: preservação do manuscrito original, correção sequencial com salvamento por capítulo,
            registro de continuidade, revisão cruzada, reconstrução de sumário com páginas reais e validação do PDF.
          </p>
        </div>

        {/* BOTÕES DE CONTROLE PRINCIPAIS */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isRunning ? (
            <button
              type="button"
              onClick={handleStop}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Pause size={14} /> Pausar Processo
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleStartCorrection(false)}
                disabled={livro.capitulos.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
                }}
              >
                <Sparkles size={14} /> {doneChapters > 0 && doneChapters < totalChapters ? '▶ Continuar Correção' : '🚀 Corrigir Livro Completo'}
              </button>

              {job && doneChapters > 0 && (
                <button
                  type="button"
                  onClick={handleValidateOnly}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 14px',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Gera e valida o PDF a partir dos capítulos já corrigidos"
                >
                  <ShieldCheck size={14} color="#059669" /> Validar Livro Corrigido
                </button>
              )}

              {job && (
                <button
                  type="button"
                  onClick={handleRestoreOriginal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '9px 12px',
                    background: '#ffffff',
                    color: '#94a3b8',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Restaura o texto original de antes das correções"
                >
                  <RefreshCw size={12} /> Restaurar Original
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. BARRA DE PROGRESSO REAL */}
      {(isRunning || progressPercent > 0) && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
              {currentStageMessage || 'Processando correção editorial...'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>
              {progressPercent}%
            </span>
          </div>
          <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #10b981, #059669)',
                width: `${progressPercent}%`,
                transition: 'width 0.25s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* 3. BANNER COMEMORATIVO — SÓ DEPOIS QUE O PDF FOI GERADO E VALIDADO */}
      {isComplete && (
        <div style={{
          background: 'linear-gradient(135deg, #064e3b, #047857)',
          color: '#ffffff',
          borderRadius: 10,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          boxShadow: '0 4px 14px rgba(6, 78, 59, 0.25)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <CheckCircle2 size={20} color="#34d399" />
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                LIVRO CORRIGIDO E FINALIZADO COM SUCESSO!
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#a7f3d0' }}>
              PDF de {finalBook.pageCount} páginas com capa frontal incorporada, sumário diagramado e 11 verificações estruturais aprovadas.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleOpenPdfPreview}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: '#ffffff',
                color: '#064e3b',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Eye size={13} color="#059669" /> Visualizar PDF
            </button>

            <button
              type="button"
              onClick={handleDownloadFinalPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              <Download size={13} /> Baixar PDF Validado
            </button>

            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <FileText size={13} /> Relatório Completo
            </button>
          </div>
        </div>
      )}

      {/* 4. CARDS DE STATUS E MÉTRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {/* Capítulos */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Capítulos</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
            {doneChapters} / {totalChapters}
          </div>
          <div style={{ fontSize: 10, color: doneChapters === totalChapters && totalChapters > 0 ? '#15803d' : '#94a3b8' }}>
            {doneChapters === totalChapters && totalChapters > 0 ? '✓ Todos salvos' : 'Em andamento'}
          </div>
        </div>

        {/* Correções automáticas */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Corrigidos</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', marginTop: 2 }}>
            {totalErrorsFixed}
          </div>
          <div style={{ fontSize: 10, color: '#15803d' }}>
            Alterações reais
          </div>
        </div>

        {/* Pendências do autor */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Pendências</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: totalPendings > 0 ? '#d97706' : '#64748b', marginTop: 2 }}>
            {totalPendings}
          </div>
          {totalPendings > 0 ? (
            <button
              type="button"
              onClick={() => setShowPendingsModal(true)}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 10, color: '#b45309', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Ver pendências
            </button>
          ) : (
            <div style={{ fontSize: 10, color: '#94a3b8' }}>Nenhuma pendente</div>
          )}
        </div>

        {/* Capa */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Capa Frontal</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: capaFinal ? '#15803d' : '#b45309', marginTop: 4 }}>
            {capaFinal ? '✓ Presente' : '⚠️ Ausente'}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>
            {capaFinal ? 'Dimensões KDP' : 'Gere na aba Capa'}
          </div>
        </div>

        {/* Sumário */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Sumário</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: job?.toc?.length ? '#15803d' : '#64748b', marginTop: 4 }}>
            {job?.toc?.length ? `✓ ${job.toc.length} itens` : (optSumario ? 'Automático' : 'Desativado')}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>
            {job?.toc?.length ? 'Páginas reais' : 'Reconstrução'}
          </div>
        </div>

        {/* Validação PDF */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Validação PDF</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: finalBook?.validation?.ok ? '#15803d' : '#64748b', marginTop: 4 }}>
            {finalBook?.validation?.ok ? '✓ Aprovado' : 'Aguardando'}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>
            {finalBook?.pageCount ? `${finalBook.pageCount} páginas` : 'Estrutura e texto'}
          </div>
        </div>
      </div>

      {/* 5. TABELA DE CAPÍTULOS COM STATUS INDIVIDUAL */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
            Capítulos do Livro ({totalChapters})
          </div>
          {job?.lastRunAt && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Última execução: {new Date(job.lastRunAt).toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          {livro.capitulos.map((c, idx) => {
            const chRecord = job?.chapters?.find(r => r.index === idx);
            const status = chRecord?.status || 'aguardando';
            const changesCount = chRecord?.errorsFixed || 0;
            const pendingsCount = chRecord?.pendings?.length || 0;

            return (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                  borderBottom: idx === livro.capitulos.length - 1 ? 'none' : '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', width: 45 }}>
                    Cap. {idx + 1}
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {c.titulo || `Capítulo ${idx + 1}`}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {changesCount > 0 && (
                    <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                      +{changesCount} correções
                    </span>
                  )}

                  {pendingsCount > 0 && (
                    <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>
                      {pendingsCount} pendências
                    </span>
                  )}

                  {getStatusBadge(status)}

                  {chRecord && (chRecord.changes.length > 0 || chRecord.pendings.length > 0) && (
                    <button
                      type="button"
                      onClick={() => setSelectedChapterDetails(chRecord)}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        padding: '3px 8px',
                        fontSize: 11,
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      Ver detalhes
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: DETALHES DE ALTERAÇÕES DO CAPÍTULO */}
      {selectedChapterDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 720,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  Capítulo {selectedChapterDetails.index + 1}: {selectedChapterDetails.title}
                </h4>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {selectedChapterDetails.changes.length} alterações reais • {selectedChapterDetails.pendings.length} pendências
                </span>
              </div>
              <button
                onClick={() => setSelectedChapterDetails(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                Lista de Alterações Aplicadas no Texto:
              </div>

              {selectedChapterDetails.changes.length === 0 ? (
                <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                  Nenhuma alteração pontual foi necessária neste capítulo.
                </div>
              ) : (
                selectedChapterDetails.changes.map(ch => (
                  <div
                    key={ch.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ fontWeight: 700, color: '#059669' }}>
                        {ch.type.toUpperCase()} ({ch.source})
                      </span>
                      <span style={{ color: '#64748b' }}>{ch.reason}</span>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#b91c1c', background: '#fee2e2', padding: '4px 6px', borderRadius: 4 }}>
                      <strong>Original:</strong> {ch.original}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#15803d', background: '#dcfce7', padding: '4px 6px', borderRadius: 4 }}>
                      <strong>Corrigido:</strong> {ch.corrected}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                onClick={() => setSelectedChapterDetails(null)}
                style={{ padding: '6px 14px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RELATÓRIO EDITORIAL COMPLETO */}
      {showReportModal && finalBook?.report && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 720,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Relatório Editorial Completo & Diagramação KDP
                </h4>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {livro.titulo} • por {livro.autor}
                </span>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
                <strong>Resumo:</strong> {finalBook.report.summary}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                {[
                  { label: 'Páginas PDF', v: finalBook.pageCount, c: '#2563eb' },
                  { label: 'Capítulos', v: finalBook.report.chaptersIdentified, c: '#059669' },
                  { label: 'Ortografia / Acento', v: finalBook.report.spellingErrors, c: '#0891b2' },
                  { label: 'Gramática', v: finalBook.report.grammarErrors, c: '#7c3aed' },
                  { label: 'Pontuação / Espaço', v: finalBook.report.punctuationFixes, c: '#d97706' },
                  { label: 'Parágrafos / Falas', v: finalBook.report.paragraphFixes + finalBook.report.dialogueFixes, c: '#16a34a' }
                ].map((st, i) => (
                  <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{st.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: st.c }}>{st.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                Verificação Estrutural do PDF (pdf.js):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {finalBook.validation.checks.map(c => (
                  <div
                    key={c.id}
                    style={{
                      fontSize: 11,
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: c.ok === true ? '#f0fdf4' : c.ok === false ? '#fef2f2' : '#f8fafc',
                      border: `1px solid ${c.ok === true ? '#bbf7d0' : c.ok === false ? '#fecaca' : '#e2e8f0'}`,
                      color: c.ok === true ? '#166534' : c.ok === false ? '#991b1b' : '#64748b'
                    }}
                  >
                    <strong>{c.ok === true ? '✓' : c.ok === false ? '✗' : 'ℹ'} {c.label}:</strong> {c.detail}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                onClick={() => setShowReportModal(false)}
                style={{ padding: '6px 14px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PENDÊNCIAS DO LIVRO */}
      {showPendingsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 680,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  Pendências para Validação do Autor
                </h4>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Alterações que afetam sentido, títulos ou continuidade para sua aprovação
                </span>
              </div>
              <button
                onClick={() => setShowPendingsModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {finalBook?.pendings && finalBook.pendings.length > 0 ? (
                finalBook.pendings.map(p => (
                  <div
                    key={p.id}
                    style={{
                      background: p.resolution === 'PENDENTE_VALIDACAO_AUTOR' ? '#fffbeb' : '#f8fafc',
                      border: `1px solid ${p.resolution === 'PENDENTE_VALIDACAO_AUTOR' ? '#fde68a' : '#e2e8f0'}`,
                      borderRadius: 6,
                      padding: '10px 12px'
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 2 }}>
                      {p.resolution === 'PENDENTE_VALIDACAO_AUTOR' ? '⚠️ PENDENTE DO AUTOR' : 'ℹ️ NÃO FOI POSSÍVEL VERIFICAR'}
                      {p.chapterIndex >= 0 ? ` (Capítulo ${p.chapterIndex + 1})` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#1e293b' }}>{p.description}</div>
                    {p.snippet && (
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569', background: '#ffffff', padding: 6, borderRadius: 4, marginTop: 4 }}>
                        {p.snippet}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: '#166534', fontWeight: 700 }}>
                  <CheckCircle2 size={32} style={{ marginBottom: 6 }} />
                  <div>Nenhuma pendência crítica para validação.</div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                onClick={() => setShowPendingsModal(false)}
                style={{ padding: '6px 14px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAÇÃO DO PDF */}
      {pdfPreviewUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          padding: 24
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px 12px 0 0',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              Visualizador do PDF KDP Diagramado & Validado
            </h4>
            <button
              onClick={() => {
                URL.revokeObjectURL(pdfPreviewUrl);
                setPdfPreviewUrl(null);
              }}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}
            >
              Fechar
            </button>
          </div>
          <div style={{ flex: 1, background: '#334155', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            <iframe
              src={pdfPreviewUrl}
              title="Pré-visualização do PDF"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
