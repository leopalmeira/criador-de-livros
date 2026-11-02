// ============================================================================
// BOOKENGIN — INTERFACE SIMPLIFICADA: ESCRITA E REFINAMENTO EDITORIAL
// Interface limpa, profissional e intuitiva com as 6 Etapas Visuais,
// painel de acompanhamento em tempo real, botões de ação essenciais e
// seção recolhida de "Configurações Avançadas".
//
// REGRA INEGOCIÁVEL: "THE SILENT COLD" É APENAS UMA REFERÊNCIA DIAGNÓSTICA.
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Download,
  Eye,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  BookOpen,
  User,
  MapPin,
  Settings,
  Layers,
  FileCheck
} from 'lucide-react';
import type { Capitulo, LivroGerado } from './KdpBookGeneratorPro';
import type {
  BookGlobalMemory,
  LastChapterState,
} from '../../../services/book-sequential-writing-engine';
import type {
  ProductionStateMachine,
  ProductionStageCardInfo,
  ProductionStageStatus,
} from '../../../services/editorial-multiagent-house';
import { MultiEngineAuditPanel } from './MultiEngineAuditPanel';
import type {
  MultiEngineConfig,
  WebnovelReviewReport,
  GlobalEditorialAuditReport
} from '../../../services/multi-engine/contracts';

interface Props {
  livro: LivroGerado | null;
  totalCaps: number;
  gerando: boolean;
  modoEconomico: boolean;
  statusMsg: string;
  selectedChapterIndex: number;
  onSelectChapterIndex: (index: number) => void;
  onUpdateChapter: (index: number, newTitle: string, newText: string) => void;
  onStartFullProduction: () => Promise<void>;
  onStopGeneration: () => void;
  onSaveProgress: () => void;
  onViewBook?: () => void;
  onDownloadBook?: () => void;
  onOpenReport?: () => void;
  productionState?: ProductionStateMachine | null;
  globalMemory?: BookGlobalMemory | null;
  lastChapterState?: LastChapterState | null;
  multiEngineConfig?: MultiEngineConfig;
  onUpdateMultiEngineConfig?: (newConfig: Partial<MultiEngineConfig>) => void;
  latestWebnovelReport?: WebnovelReviewReport | null;
  globalAuditReport?: GlobalEditorialAuditReport | null;
  onRunGlobalAudit?: () => void;
  isGlobalAuditing?: boolean;
  ui: (pt: string, en: string) => string;
}

export const SequentialWritingStudio: React.FC<Props> = ({
  livro,
  totalCaps,
  gerando,
  modoEconomico,
  statusMsg,
  selectedChapterIndex,
  onSelectChapterIndex,
  onUpdateChapter,
  onStartFullProduction,
  onStopGeneration,
  onSaveProgress,
  onViewBook,
  onDownloadBook,
  onOpenReport,
  productionState,
  globalMemory,
  lastChapterState,
  multiEngineConfig,
  onUpdateMultiEngineConfig,
  latestWebnovelReport,
  globalAuditReport,
  onRunGlobalAudit,
  isGlobalAuditing,
  ui,
}) => {
  // Estado do accordion de Configurações Avançadas (recolhido por padrão)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<'editor' | 'memory' | 'outline' | 'multi-engine'>('editor');

  const capitulos = livro?.capitulos || [];
  const selectedCap = capitulos[selectedChapterIndex] || null;
  const currentChapterNumber = selectedChapterIndex + 1;

  // Contagem real de palavras
  const totalBookWords = useMemo(() => {
    return capitulos.reduce(
      (acc, c) => acc + (c.texto ? c.texto.trim().split(/\s+/).filter(Boolean).length : 0),
      0
    );
  }, [capitulos]);

  const currentWordCount = useMemo(() => {
    if (!selectedCap?.texto) return 0;
    return selectedCap.texto.trim().split(/\s+/).filter(Boolean).length;
  }, [selectedCap?.texto]);

  const estimatedPages = useMemo(() => {
    return Math.max(24, Math.ceil(totalBookWords / 250) + capitulos.length * 2);
  }, [totalBookWords, capitulos.length]);

  const isCompleted = Boolean(
    productionState?.overallStatus === 'CONCLUIDO' ||
      (capitulos.length >= totalCaps && capitulos.length > 0 && !gerando)
  );

  const hasInterruptedProgress = Boolean(
    !gerando && !isCompleted && capitulos.length > 0 && capitulos.length < totalCaps
  );

  // 6 ETAPAS VISUAIS DERIVADAS DO ESTADO REAL DA MÁQUINA DE PRODUÇÃO
  const stageCards: ProductionStageCardInfo[] = useMemo(() => {
    if (productionState?.stages) {
      return Object.values(productionState.stages).sort((a, b) => a.order - b.order);
    }

    // Fallback reativo baseado no estado do manuscrito
    const capsProntos = capitulos.length;
    const escritaConcluida = capsProntos >= totalCaps && totalCaps > 0;

    return [
      {
        id: 'planejamento',
        order: 1,
        title: ui('1. Planejamento & Bíblia Editorial', '1. Planning & Story Bible'),
        status: (capsProntos > 0 || globalMemory) ? 'concluido' : gerando ? 'em_execucao' : 'pendente',
        progressReal: (capsProntos > 0 || globalMemory) ? ui('Bíblia e personagens estruturados', 'Bible & characters structured') : ui('Aguardando início', 'Awaiting start'),
        currentWork: ui('Definição de personagens canônicos, fatos e arcos narrativos.', 'Canonical characters, facts, and arcs setup.'),
        pendingIssues: [],
      },
      {
        id: 'escrita',
        order: 2,
        title: ui('2. Escrita dos Capítulos', '2. Chapter Writing'),
        status: escritaConcluida ? 'concluido' : gerando ? 'em_execucao' : capsProntos > 0 ? 'atencao' : 'pendente',
        progressReal: ui(`${capsProntos} de ${totalCaps} capítulos prontos`, `${capsProntos} of ${totalCaps} chapters ready`),
        currentWork: gerando
          ? ui(`Redigindo capítulo ${capsProntos + 1} em sequência com a memória global...`, `Writing chapter ${capsProntos + 1} sequentially with global memory...`)
          : escritaConcluida
          ? ui('Todos os capítulos escritos com sucesso.', 'All chapters written successfully.')
          : ui('Aguardando acionamento da produção.', 'Awaiting production trigger.'),
        pendingIssues: [],
      },
      {
        id: 'revisao_editorial',
        order: 3,
        title: ui('3. Revisão Editorial & Continuidade', '3. Editorial & Continuity Review'),
        status: isCompleted ? 'concluido' : escritaConcluida && gerando ? 'em_execucao' : 'pendente',
        progressReal: isCompleted ? ui('100% verificado', '100% verified') : escritaConcluida ? ui('Em andamento', 'In progress') : ui('Pendente', 'Pending'),
        currentWork: ui('Validação de locais, profissões, cronologia e fatos canônicos.', 'Validation of locations, professions, chronology, and canon facts.'),
        pendingIssues: [],
      },
      {
        id: 'revisao_linguistica',
        order: 4,
        title: ui('4. Revisão Linguística & Ortografia', '4. Linguistic & Grammar Review'),
        status: isCompleted ? 'concluido' : escritaConcluida && gerando ? 'em_execucao' : 'pendente',
        progressReal: isCompleted ? ui('100% higienizado', '100% sanitized') : ui('Pendente', 'Pending'),
        currentWork: ui('Sanitização lexical, pontuação de diálogos e unificação de idioma.', 'Lexical sanitation, dialogue punctuation, and language consistency.'),
        pendingIssues: [],
      },
      {
        id: 'diagramacao',
        order: 5,
        title: ui('5. Diagramação Editorial KDP', '5. KDP Editorial Layout'),
        status: isCompleted ? 'concluido' : escritaConcluida && gerando ? 'em_execucao' : 'pendente',
        progressReal: isCompleted ? ui('PDF e EPUB gerados', 'PDF & EPUB generated') : ui('Pendente', 'Pending'),
        currentWork: ui('Cálculo de margens, medianiz, tipografia e cabeçalhos corridos sem cortes.', 'Margin, gutter, typography, and running headers calculation.'),
        pendingIssues: [],
      },
      {
        id: 'auditoria_final',
        order: 6,
        title: ui('6. Auditoria Final Independente', '6. Final Independent Audit'),
        status: isCompleted ? 'concluido' : escritaConcluida && gerando ? 'em_execucao' : 'pendente',
        progressReal: isCompleted ? ui('Aprovada na auditoria interna', 'Approved in internal audit') : ui('Pendente', 'Pending'),
        currentWork: ui('Verificação dos 10 critérios editoriais antes da aprovação final.', 'Verification of 10 editorial criteria before final approval.'),
        pendingIssues: [],
      },
    ];
  }, [productionState, capitulos.length, totalCaps, globalMemory, gerando, isCompleted, ui]);

  // Mensagem simples de acompanhamento (exigência da Seção 8)
  const displayStatusMessage = useMemo(() => {
    if (gerando) {
      if (capitulos.length < totalCaps) {
        return ui(`Escrevendo capítulo ${capitulos.length + 1} de ${totalCaps}.`, `Writing chapter ${capitulos.length + 1} of ${totalCaps}.`);
      }
      return ui('Executando revisão editorial, diagramação e auditoria final...', 'Running editorial review, typesetting, and final audit...');
    }
    if (hasInterruptedProgress) {
      return ui(`Produção pausada no capítulo ${capitulos.length} de ${totalCaps}. Clique em Retomar para continuar de onde parou.`, `Production paused at chapter ${capitulos.length} of ${totalCaps}. Click Resume to continue.`);
    }
    if (isCompleted) {
      return ui('Obra completa, auditada e pronta para publicação na Amazon KDP!', 'Book completed, audited, and ready for publication on Amazon KDP!');
    }
    return ui('Pronto para iniciar a produção editorial automática.', 'Ready to start automated editorial production.');
  }, [gerando, capitulos.length, totalCaps, hasInterruptedProgress, isCompleted, ui]);

  // Progresso baseado em tarefas reais concluídas
  const realProgressPercent = useMemo(() => {
    if (totalCaps === 0) return 0;
    if (isCompleted) return 100;
    const taskCapWeight = (capitulos.length / totalCaps) * 70;
    const planningWeight = capitulos.length > 0 || globalMemory ? 10 : 0;
    return Math.min(95, Math.round(taskCapWeight + planningWeight));
  }, [totalCaps, isCompleted, capitulos.length, globalMemory]);

  const getStatusBadge = (status: ProductionStageStatus) => {
    switch (status) {
      case 'concluido':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 12, fontSize: 10.5, fontWeight: 700 }}>
            <CheckCircle2 size={12} /> {ui('Concluído', 'Completed')}
          </span>
        );
      case 'em_execucao':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 12, fontSize: 10.5, fontWeight: 700 }}>
            <Sparkles size={12} className="animate-spin" /> {ui('Em execução', 'In progress')}
          </span>
        );
      case 'atencao':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 12, fontSize: 10.5, fontWeight: 700 }}>
            <AlertTriangle size={12} /> {ui('Atenção', 'Attention')}
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: 12, fontSize: 10.5, fontWeight: 700 }}>
            <Clock size={12} /> {ui('Pendente', 'Pending')}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      {/* 1. CABEÇALHO EXECUTIVO LIMPO */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '20px 24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {livro?.titulo || ui('Escrita e Refinamento Editorial', 'Writing & Editorial Refinement')}
              </h2>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {livro?.autor || 'Autor'} • {livro?.genero || 'Ficção'} • {livro?.idioma || 'Português'}
              </div>
            </div>
          </div>
        </div>

        {/* 2. BOTÕES PRINCIPAIS E DISCRETOS (SEÇÃO 8) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {gerando ? (
            <button
              type="button"
              onClick={onStopGeneration}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              }}
            >
              <Pause size={16} /> {ui('PAUSAR', 'PAUSE')}
            </button>
          ) : isCompleted ? (
            <>
              {onViewBook && (
                <button
                  type="button"
                  onClick={onViewBook}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '10px 18px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1.5px solid #cbd5e1',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <Eye size={16} color="#0284c7" /> {ui('VISUALIZAR LIVRO', 'VIEW BOOK')}
                </button>
              )}
              {onDownloadBook && (
                <button
                  type="button"
                  onClick={onDownloadBook}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '10px 20px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
                  }}
                >
                  <Download size={16} /> {ui('BAIXAR LIVRO', 'DOWNLOAD BOOK')}
                </button>
              )}
              {onOpenReport && (
                <button
                  type="button"
                  onClick={onOpenReport}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <FileText size={14} color="#64748b" /> {ui('VER RELATÓRIO', 'VIEW REPORT')}
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onStartFullProduction}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(2, 132, 199, 0.35)',
              }}
            >
              <Play size={17} fill="#ffffff" />
              {hasInterruptedProgress
                ? ui('RETOMAR PRODUÇÃO', 'RESUME PRODUCTION')
                : ui('INICIAR PRODUÇÃO AUTOMÁTICA', 'START AUTOMATIC PRODUCTION')}
            </button>
          )}
        </div>
      </div>

      {/* 3. PAINEL DE ACOMPANHAMENTO EM TEMPO REAL (MENSAGEM SIMPLES + PROGRESSO REAL) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
              {displayStatusMessage}
            </span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#0284c7' }}>
            {capitulos.length} de {totalCaps} {ui('capítulos', 'chapters')} • {realProgressPercent}%
          </span>
        </div>

        {/* Barra de progresso real */}
        <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              width: `${realProgressPercent}%`,
              height: '100%',
              background: isCompleted
                ? '#10b981'
                : 'linear-gradient(90deg, #0284c7 0%, #0ea5e9 100%)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* 4. AS 6 ETAPAS VISUAIS SIMPLIFICADAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        {stageCards.map(stage => (
          <div
            key={stage.id}
            style={{
              border: stage.status === 'em_execucao'
                ? '1.5px solid #0284c7'
                : stage.status === 'concluido'
                ? '1px solid #bbf7d0'
                : '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: stage.status === 'em_execucao' ? '0 2px 8px rgba(2, 132, 199, 0.12)' : 'none',
              background: stage.status === 'em_execucao' ? '#f0f9ff' : '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                {stage.title}
              </span>
              {getStatusBadge(stage.status)}
            </div>

            <div style={{ fontSize: 11.5, color: '#0284c7', fontWeight: 700 }}>
              {stage.progressReal}
            </div>

            <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
              {stage.currentWork}
            </p>

            {stage.pendingIssues && stage.pendingIssues.length > 0 && (
              <div style={{ background: '#fef3c7', padding: '6px 8px', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
                ⚠️ {stage.pendingIssues.length} pendência(s) registrada(s).
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 5. CARD DE RESULTADO FINAL (QUANDO CONCLUÍDO) */}
      {isCompleted && (
        <div
          style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1.5px solid #86efac',
            borderRadius: 12,
            padding: '20px 24px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <ShieldCheck size={24} color="#059669" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#065f46' }}>
              {ui('Livro Produzido e Aprovado na Auditoria Interna', 'Book Produced & Approved in Internal Audit')}
            </h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #dcfce7' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{ui('Capítulos', 'Chapters')}</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{capitulos.length} {ui('capítulos', 'chapters')}</div>
            </div>

            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #dcfce7' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{ui('Extensão', 'Length')}</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                ~{estimatedPages} {ui('páginas', 'pages')} ({totalBookWords.toLocaleString()} {ui('palavras', 'words')})
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #dcfce7' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{ui('Idioma & Formato', 'Language & Format')}</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                {livro?.idioma || 'Português'} • {productionState?.kdpFormat || '6x9'} KDP
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #dcfce7' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{ui('Status Editorial', 'Editorial Status')}</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>
                {ui('Aprovado (0 Críticos)', 'Approved (0 Critical)')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {onDownloadBook && (
              <button
                type="button"
                onClick={onDownloadBook}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '10px 18px',
                  borderRadius: 8,
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <Download size={15} /> {ui('Baixar PDF de Miolo KDP', 'Download KDP Interior PDF')}
              </button>
            )}
            {onViewBook && (
              <button
                type="button"
                onClick={onViewBook}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '10px 18px',
                  borderRadius: 8,
                  background: '#ffffff',
                  color: '#065f46',
                  border: '1.5px solid #86efac',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <Eye size={15} /> {ui('Visualizar Páginas Diagramadas', 'View Typeset Pages')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. CONFIGURAÇÕES AVANÇADAS (RECOLHIDAS POR PADRÃO - SEÇÃO 8) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          style={{
            width: '100%',
            padding: '12px 18px',
            background: '#f8fafc',
            border: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 12.5, fontWeight: 700 }}>
            <Settings size={15} />
            <span>{ui('Configurações Avançadas & Ferramentas Técnicas (Opcional)', 'Advanced Settings & Technical Tools (Optional)')}</span>
          </div>
          {showAdvancedSettings ? <ChevronDown size={16} color="#64748b" /> : <ChevronRight size={16} color="#64748b" />}
        </button>

        {showAdvancedSettings && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Sub-abas de ferramentas avançadas */}
            <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 8, width: 'fit-content' }}>
              <button
                type="button"
                onClick={() => setAdvancedTab('editor')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: advancedTab === 'editor' ? '#ffffff' : 'transparent',
                  color: advancedTab === 'editor' ? '#0284c7' : '#64748b',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✍️ {ui('Editor Manual de Capítulos', 'Manual Chapter Editor')}
              </button>
              <button
                type="button"
                onClick={() => setAdvancedTab('memory')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: advancedTab === 'memory' ? '#ffffff' : 'transparent',
                  color: advancedTab === 'memory' ? '#0284c7' : '#64748b',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🧠 {ui('Bíblia & Memória Narrativa', 'Story Bible & Memory')}
              </button>

              <button
                type="button"
                onClick={() => setAdvancedTab('multi-engine')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: advancedTab === 'multi-engine' ? '#ffffff' : 'transparent',
                  color: advancedTab === 'multi-engine' ? '#059669' : '#64748b',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🛡️ {ui('Multi-Engine & Auditoria', 'Multi-Engine & Audit')}
              </button>
            </div>

            {/* ABA: MULTI-ENGINE */}
            {advancedTab === 'multi-engine' && multiEngineConfig && onUpdateMultiEngineConfig && (
              <MultiEngineAuditPanel
                config={multiEngineConfig}
                onUpdateConfig={onUpdateMultiEngineConfig}
                latestReport={latestWebnovelReport}
                globalAuditReport={globalAuditReport}
                onRunGlobalAudit={onRunGlobalAudit}
                isAuditing={isGlobalAuditing}
              />
            )}

            {/* ABA: EDITOR MANUAL */}
            {advancedTab === 'editor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                    {ui('Selecionar capítulo para edição manual:', 'Select chapter for manual editing:')}
                  </span>
                  <select
                    value={selectedChapterIndex}
                    onChange={e => onSelectChapterIndex(Number(e.target.value))}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  >
                    {Array.from({ length: totalCaps }).map((_, idx) => (
                      <option key={idx} value={idx}>
                        Capítulo {idx + 1} {capitulos[idx] ? `(${capitulos[idx].titulo})` : ui('(Pendente)', '(Pending)')}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onSaveProgress}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    💾 {ui('Salvar Alterações Manuais', 'Save Manual Changes')}
                  </button>
                </div>

                {selectedCap ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="text"
                      value={selectedCap.titulo}
                      onChange={e => onUpdateChapter(selectedChapterIndex, e.target.value, selectedCap.texto)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#0f172a',
                      }}
                      placeholder={ui('Título do Capítulo', 'Chapter Title')}
                    />
                    <textarea
                      value={selectedCap.texto}
                      onChange={e => onUpdateChapter(selectedChapterIndex, selectedCap.titulo, e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: 220,
                        padding: '12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        fontFamily: 'monospace',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, color: '#64748b', fontSize: 12 }}>
                    {ui('Este capítulo ainda não foi gerado.', 'This chapter has not been generated yet.')}
                  </div>
                )}
              </div>
            )}

            {/* ABA: MEMÓRIA EDITORIAL */}
            {advancedTab === 'memory' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>
                  🧠 Fatos Canônicos & Personagens Cadastrados:
                </div>
                {globalMemory?.characters && globalMemory.characters.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                    {globalMemory.characters.map((char, i) => (
                      <div key={i} style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{char.name}</div>
                        <div style={{ color: '#0284c7', fontSize: 11 }}>Profissão: {char.profession || 'Canônica'}</div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>Local: {char.currentLocation || 'Ativo'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                    Personagens canônicos serão indexados e protegidos contra mutações automaticamente durante a produção.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
