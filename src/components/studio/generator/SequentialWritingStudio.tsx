// ============================================================================
// BOOKENGIN — MÓDULO 1: ESCRITA DOS CAPÍTULOS & MOTOR SEQUENCIAL
// Interface dedicada para escrita sequencial de capítulos interligados,
// Bíblia Editorial Global persistente, indicador de continuidade,
// resumo do capítulo anterior, objetivo do capítulo e validação local.
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Save,
  Search,
  ShieldCheck,
  AlertTriangle,
  FileText,
  User,
  MapPin,
  Bookmark,
  Layers,
  ChevronRight,
  RefreshCw,
  Play,
  Square,
  Eye,
  Info
} from 'lucide-react';
import type { Capitulo, LivroGerado } from './KdpBookGeneratorPro';
import type {
  BookGlobalMemory,
  LastChapterState,
  LocalContinuityAuditResult,
  ContinuityAuditIssue
} from '../../../services/book-sequential-writing-engine';
import {
  BookSequentialWritingEngine,
  StoryArcController
} from '../../../services/book-sequential-writing-engine';
import type { KdpEditorialPlan } from '../../../services/kdp-agents-service';

interface Props {
  livro: LivroGerado | null;
  totalCaps: number;
  gerando: boolean;
  modoEconomico: boolean;
  statusMsg: string;
  selectedChapterIndex: number;
  onSelectChapterIndex: (index: number) => void;
  onUpdateChapter: (index: number, newTitle: string, newText: string) => void;
  onGenerateNextChapter: () => Promise<void>;
  onStopGeneration: () => void;
  onSaveProgress: () => void;
  editorialPlan?: KdpEditorialPlan | null;
  globalMemory?: BookGlobalMemory | null;
  lastChapterState?: LastChapterState | null;
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
  onGenerateNextChapter,
  onStopGeneration,
  onSaveProgress,
  editorialPlan,
  globalMemory,
  lastChapterState,
  ui
}) => {
  const [activeSideDrawer, setActiveSideDrawer] = useState<'memory' | 'continuity' | 'outline'>('continuity');
  const [localAudit, setLocalAudit] = useState<LocalContinuityAuditResult | null>(null);
  const [isAuditingLocal, setIsAuditingLocal] = useState(false);
  const [autoFixSuccessMsg, setAutoFixSuccessMsg] = useState('');

  const capitulos = livro?.capitulos || [];
  const selectedCap = capitulos[selectedChapterIndex] || null;
  const currentChapterNumber = selectedChapterIndex + 1;

  // Contagem de palavras do capítulo selecionado
  const currentWordCount = useMemo(() => {
    if (!selectedCap?.texto) return 0;
    return selectedCap.texto.trim().split(/\s+/).filter(Boolean).length;
  }, [selectedCap?.texto]);

  // Contagem total de palavras da obra
  const totalBookWords = useMemo(() => {
    return capitulos.reduce((acc, c) => acc + (c.texto ? c.texto.trim().split(/\s+/).filter(Boolean).length : 0), 0);
  }, [capitulos]);

  // Diretriz arquitetural do capítulo selecionado (Outline)
  const outlineDirective = useMemo(() => {
    if (editorialPlan?.chapters && editorialPlan.chapters[selectedChapterIndex]) {
      return editorialPlan.chapters[selectedChapterIndex];
    }
    return {
      title: `Capítulo ${currentChapterNumber}`,
      objective: `Desenvolver a progressão narrativa e desdobramentos do capítulo ${currentChapterNumber}.`,
      keyPoints: [
        'Aprofundar os conflitos centrais e relacionamentos',
        'Introduzir pistas e consequências dos atos passados',
        'Construir o gancho de continuidade para a próxima etapa'
      ],
      transition: currentChapterNumber === totalCaps
        ? 'Concluir a obra de forma definitiva e satisfatória.'
        : `Conectar de forma orgânica com o capítulo ${currentChapterNumber + 1}.`
    };
  }, [editorialPlan, selectedChapterIndex, currentChapterNumber, totalCaps]);

  // Estágio do Arco Narrativo
  const arcInfo = useMemo(() => {
    return StoryArcController.getArcStage(currentChapterNumber, totalCaps);
  }, [currentChapterNumber, totalCaps]);

  // Executa validação de continuidade local no capítulo selecionado
  const handleValidateContinuity = () => {
    if (!selectedCap || !globalMemory) return;
    setIsAuditingLocal(true);
    setAutoFixSuccessMsg('');

    const prevChapter = selectedChapterIndex > 0 ? capitulos[selectedChapterIndex - 1] : null;
    const tempLastState: LastChapterState | null = prevChapter ? {
      chapterNumber: selectedChapterIndex,
      title: prevChapter.titulo,
      factualSummary: prevChapter.texto.slice(0, 160),
      openingScene: prevChapter.texto.slice(0, 100),
      closingScene: prevChapter.texto.slice(-180),
      endingLocation: {
        name: globalMemory.locations[0]?.name || 'Ambiente do capítulo anterior',
        floor: globalMemory.locations[0]?.floor ? String(globalMemory.locations[0].floor) : undefined,
        description: prevChapter.texto.slice(-140)
      },
      dateTime: {},
      charactersPresent: globalMemory.characters.map(c => c.name),
      characterStates: [],
      revealedInformation: [],
      hiddenSecrets: [],
      ongoingConflicts: [],
      pendingConsequences: [],
      cliffhangerHook: prevChapter.texto.slice(-120),
      nextPlannedEvent: `Conectar com capítulo ${currentChapterNumber}`
    } : (lastChapterState ?? null);

    const res = BookSequentialWritingEngine.validateChapterContinuity({
      chapterText: selectedCap.texto,
      chapterTitle: selectedCap.titulo,
      chapterNumber: currentChapterNumber,
      totalChapters: totalCaps,
      memory: globalMemory,
      lastChapterState: tempLastState
    });

    setLocalAudit(res);
    setIsAuditingLocal(false);
  };

  // Aplica auto-correção nas inconsistências locais detectadas
  const handleAutoFixLocal = () => {
    if (!selectedCap || !localAudit || localAudit.issues.length === 0) return;
    const { fixedText, fixedCount } = BookSequentialWritingEngine.autoFixContinuityIssues(
      selectedCap.texto,
      localAudit.issues
    );

    if (fixedCount > 0) {
      onUpdateChapter(selectedChapterIndex, selectedCap.titulo, fixedText);
      setAutoFixSuccessMsg(`✓ ${fixedCount} inconsistência(s) de continuidade corrigida(s) e alinhada(s) à Bíblia Editorial!`);
      // Re-valida
      setTimeout(() => {
        handleValidateContinuity();
      }, 300);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {/* 1. CABEÇALHO DO MOTOR SEQUENCIAL */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
            }}
          >
            <BookOpen size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {ui('Motor de Escrita Sequencial & Bíblia Editorial', 'Sequential Writing Engine & Editorial Bible')}
              </h2>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0'
                }}
              >
                ✓ {ui('Memória Ativa & Persistente', 'Persistent Active Memory')}
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: '#64748b', margin: '2px 0 0' }}>
              {ui(
                `Cada capítulo conhece o passado da história, respeita a identidade canônica e prepara o futuro sem encerramentos prematuros. (${capitulos.length}/${totalCaps} prontos • ${totalBookWords.toLocaleString()} palavras totais)`,
                `Every chapter knows past story events, respects canonical identity, and prepares future scenes without premature endings. (${capitulos.length}/${totalCaps} ready • ${totalBookWords.toLocaleString()} total words)`
              )}
            </p>
          </div>
        </div>

        {/* BARRA DE AÇÕES GERAIS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {gerando ? (
            <button
              type="button"
              onClick={onStopGeneration}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 6,
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              <Square size={14} /> {ui('Parar Geração', 'Stop Generation')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onGenerateNextChapter}
              disabled={capitulos.length >= totalCaps}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 15px',
                borderRadius: 6,
                background: capitulos.length >= totalCaps ? '#94a3b8' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: 12,
                cursor: capitulos.length >= totalCaps ? 'not-allowed' : 'pointer',
                boxShadow: capitulos.length >= totalCaps ? 'none' : '0 2px 6px rgba(2, 132, 199, 0.3)'
              }}
            >
              <Sparkles size={14} />
              {capitulos.length === 0
                ? ui('Escrever Capítulo 1 (Ato I)', 'Write Chapter 1 (Act I)')
                : capitulos.length < totalCaps
                ? ui(`Escrever Cap. ${capitulos.length + 1} Sequencial`, `Write Chapter ${capitulos.length + 1} Sequentially`)
                : ui('Todos os Capítulos Prontos', 'All Chapters Completed')}
            </button>
          )}

          <button
            type="button"
            onClick={onSaveProgress}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 6,
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            <Save size={14} /> {ui('Salvar Tudo', 'Save All')}
          </button>
        </div>
      </div>

      {/* 2. ÁREA PRINCIPAL DIVIDIDA EM 2 COLUNAS: LISTA DE CAPÍTULOS + PALCO EDITORIAL */}
      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 14, minHeight: 620 }}>
        {/* COLUNA ESQUERDA: LISTA DE CAPÍTULOS E GAVETAS DE MEMÓRIA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* SELETOR DE ABAS DA COLUNA ESQUERDA */}
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => setActiveSideDrawer('continuity')}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: 6,
                border: 'none',
                background: activeSideDrawer === 'continuity' ? '#ffffff' : 'transparent',
                color: activeSideDrawer === 'continuity' ? '#0284c7' : '#64748b',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer',
                boxShadow: activeSideDrawer === 'continuity' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              📑 {ui('Capítulos', 'Chapters')} ({capitulos.length}/{totalCaps})
            </button>
            <button
              type="button"
              onClick={() => setActiveSideDrawer('memory')}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: 6,
                border: 'none',
                background: activeSideDrawer === 'memory' ? '#ffffff' : 'transparent',
                color: activeSideDrawer === 'memory' ? '#0284c7' : '#64748b',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer',
                boxShadow: activeSideDrawer === 'memory' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              🧠 {ui('Bíblia & Memória', 'Bible & Memory')}
            </button>
            <button
              type="button"
              onClick={() => setActiveSideDrawer('outline')}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: 6,
                border: 'none',
                background: activeSideDrawer === 'outline' ? '#ffffff' : 'transparent',
                color: activeSideDrawer === 'outline' ? '#0284c7' : '#64748b',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer',
                boxShadow: activeSideDrawer === 'outline' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              🎯 {ui('Outline', 'Outline')}
            </button>
          </div>

          {/* CONTEÚDO DA COLUNA ESQUERDA */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 10,
              flex: 1,
              maxHeight: 650,
              overflowY: 'auto'
            }}
          >
            {activeSideDrawer === 'continuity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Array.from({ length: totalCaps }).map((_, idx) => {
                  const capNum = idx + 1;
                  const c = capitulos[idx];
                  const isSelected = selectedChapterIndex === idx;
                  const words = c?.texto ? c.texto.trim().split(/\s+/).filter(Boolean).length : 0;
                  const isReady = Boolean(c && c.texto && c.texto.length > 50);

                  return (
                    <div
                      key={idx}
                      onClick={() => onSelectChapterIndex(idx)}
                      style={{
                        padding: '9px 11px',
                        borderRadius: 8,
                        border: isSelected
                          ? '1.5px solid #0284c7'
                          : isReady
                          ? '1px solid #e2e8f0'
                          : '1px dashed #cbd5e1',
                        background: isSelected
                          ? '#f0f9ff'
                          : isReady
                          ? '#ffffff'
                          : '#fafafa',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: isSelected ? '#0369a1' : '#334155' }}>
                          Cap. {capNum}
                        </span>
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: isReady ? '#ecfdf5' : '#f1f5f9',
                            color: isReady ? '#059669' : '#64748b'
                          }}
                        >
                          {isReady ? `✓ ${words} pal.` : ui('Pendente', 'Pending')}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {c?.titulo || editorialPlan?.chapters?.[idx]?.title || `Capítulo ${capNum}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeSideDrawer === 'memory' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 11.5 }}>
                {/* FATOS CANÔNICOS */}
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={14} color="#059669" /> Fatos Canônicos Imutáveis ({globalMemory?.canonicalFacts?.length || 0})
                  </div>
                  {globalMemory?.canonicalFacts && globalMemory.canonicalFacts.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 16, color: '#334155', lineHeight: 1.4 }}>
                      {globalMemory.canonicalFacts.map((f, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: '#0284c7' }}>[{f.category}]</span> {f.fact}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                      Nenhum fato canônico isolado cadastrado. O motor extrairá fatos automaticamente conforme cada capítulo é validado.
                    </p>
                  )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

                {/* PERSONAGENS CANÔNICOS */}
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={14} color="#0284c7" /> Personagens Ativos ({globalMemory?.characters?.length || 0})
                  </div>
                  {globalMemory?.characters && globalMemory.characters.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {globalMemory.characters.map((c, i) => (
                        <div key={i} style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</span>
                          {c.profession && <span style={{ color: '#64748b' }}> • {c.profession}</span>}
                          {c.currentLocation && <div style={{ fontSize: 10.5, color: '#0284c7' }}>Local: {c.currentLocation}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', margin: 0, fontStyle: 'italic' }}>Personagens ativos serão consolidados organicamente.</p>
                  )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

                {/* LOCAIS CANÔNICOS */}
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={14} color="#d97706" /> Locais Canônicos ({globalMemory?.locations?.length || 0})
                  </div>
                  {globalMemory?.locations && globalMemory.locations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {globalMemory.locations.map((loc, i) => (
                        <div key={i} style={{ background: '#fffbeb', padding: '6px 8px', borderRadius: 6, border: '1px solid #fde68a' }}>
                          <span style={{ fontWeight: 700, color: '#92400e' }}>{loc.name}</span>
                          {loc.floor && <span style={{ color: '#b45309' }}> • {loc.floor}</span>}
                          <div style={{ fontSize: 10.5, color: '#78350f' }}>{loc.city}, {loc.state}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', margin: 0, fontStyle: 'italic' }}>Locais canônicos serão indexados.</p>
                  )}
                </div>
              </div>
            )}

            {activeSideDrawer === 'outline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11.5 }}>
                <div style={{ background: '#f0f9ff', padding: '8px 10px', borderRadius: 6, border: '1px solid #bae6fd' }}>
                  <div style={{ fontWeight: 800, color: '#0369a1', marginBottom: 2 }}>{arcInfo.label}</div>
                  <div style={{ color: '#0284c7', lineHeight: 1.35 }}>{arcInfo.directive}</div>
                </div>

                <div style={{ fontWeight: 800, color: '#0f172a' }}>Objetivo do Capítulo:</div>
                <div style={{ color: '#334155', lineHeight: 1.4 }}>{outlineDirective.objective}</div>

                <div style={{ fontWeight: 800, color: '#0f172a', marginTop: 4 }}>Pontos-Chave Planejados:</div>
                <ul style={{ margin: 0, paddingLeft: 16, color: '#334155', lineHeight: 1.4 }}>
                  {(outlineDirective.keyPoints || []).map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>

                <div style={{ fontWeight: 800, color: '#0f172a', marginTop: 4 }}>Transição Planejada:</div>
                <div style={{ color: '#64748b', lineHeight: 1.35, fontStyle: 'italic' }}>{outlineDirective.transition}</div>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: PALCO EDITORIAL DO CAPÍTULO SELECIONADO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          {/* BANNER DE CONTINUIDADE DO CAPÍTULO ANTERIOR */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="#0284c7" />
                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#0f172a' }}>
                  {selectedChapterIndex === 0
                    ? ui('Abertura da Obra (Ato I)', 'Book Opening (Act I)')
                    : ui(`Resumo de Continuidade do Cap. ${selectedChapterIndex}`, `Continuity Summary from Chapter ${selectedChapterIndex}`)}
                </span>
              </div>

              {/* BOTÃO DE REVISÃO E AUDITORIA LOCAL */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={handleValidateContinuity}
                  disabled={!selectedCap || isAuditingLocal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 9px',
                    borderRadius: 5,
                    background: '#f1f5f9',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: selectedCap ? 'pointer' : 'not-allowed'
                  }}
                >
                  <RefreshCw size={12} className={isAuditingLocal ? 'animate-spin' : ''} />
                  {ui('Validar Continuidade Local', 'Validate Local Continuity')}
                </button>
              </div>
            </div>

            {/* CONTEÚDO DO RESUMO DO CAPÍTULO ANTERIOR */}
            <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.45 }}>
              {selectedChapterIndex === 0 ? (
                <span>Primeiro capítulo da obra completa. Apresenta o mundo canônico, personagens e premissa.</span>
              ) : lastChapterState ? (
                <span>
                  <strong>Terminou em:</strong> {lastChapterState.endingLocation.name}
                  {lastChapterState.endingLocation.floor ? ` (${lastChapterState.endingLocation.floor})` : ''}.{' '}
                  <strong>Gancho:</strong> "{lastChapterState.cliffhangerHook}"
                </span>
              ) : capitulos[selectedChapterIndex - 1] ? (
                <span>
                  <strong>Cap. {selectedChapterIndex} fechou com:</strong> "
                  {capitulos[selectedChapterIndex - 1].texto.slice(-160).replace(/\n/g, ' ')}"
                </span>
              ) : (
                <span>Nenhum resumo anterior disponível.</span>
              )}
            </div>
          </div>

          {/* ALERTA DE AUDITORIA LOCAL / AUTO-FIX */}
          {localAudit && localAudit.issues.length > 0 && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#92400e', fontWeight: 800, fontSize: 12 }}>
                  <AlertTriangle size={15} color="#d97706" />
                  {localAudit.issues.length} {ui('Inconsistência(s) de Continuidade Detectada(s)', 'Continuity Inconsistencies Detected')} (Score: {localAudit.score}/100)
                </div>
                <button
                  type="button"
                  onClick={handleAutoFixLocal}
                  style={{
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 5,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {ui('Aplicar Correções Automáticas Seguras', 'Apply Safe Auto-Fixes')}
                </button>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: '#78350f', lineHeight: 1.4 }}>
                {localAudit.issues.map((iss, i) => (
                  <li key={i}>
                    <strong>[{iss.category}]</strong> {iss.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {autoFixSuccessMsg && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 11.5,
                fontWeight: 700
              }}
            >
              {autoFixSuccessMsg}
            </div>
          )}

          {/* EDITOR DE TEXTO DO CAPÍTULO SELECIONADO */}
          {selectedCap ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                flex: 1
              }}
            >
              {/* TÍTULO DO CAPÍTULO */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                  {ui('TÍTULO DO CAPÍTULO', 'CHAPTER TITLE')}
                </label>
                <input
                  type="text"
                  value={selectedCap.titulo}
                  onChange={(e) => onUpdateChapter(selectedChapterIndex, e.target.value, selectedCap.texto)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* CORPO DE TEXTO DO CAPÍTULO */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                    {ui('MANUSCRITO DO CAPÍTULO', 'CHAPTER MANUSCRIPT')}
                  </label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7' }}>
                    {currentWordCount.toLocaleString()} {ui('palavras', 'words')} • ~{Math.ceil(currentWordCount / 200)} min de leitura
                  </span>
                </div>
                <textarea
                  value={selectedCap.texto}
                  onChange={(e) => onUpdateChapter(selectedChapterIndex, selectedCap.titulo, e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 420,
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: '#1e293b',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: 10,
                padding: 40,
                textAlign: 'center',
                color: '#64748b'
              }}
            >
              <BookOpen size={40} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                {ui(`Capítulo ${currentChapterNumber} ainda não foi escrito`, `Chapter ${currentChapterNumber} has not been written yet`)}
              </h3>
              <p style={{ fontSize: 12, margin: '0 0 16px 0' }}>
                {ui(
                  'Clique no botão abaixo para escrever este capítulo utilizando a Bíblia Editorial e o estado factual do capítulo anterior.',
                  'Click the button below to write this chapter using the Editorial Bible and previous chapter factual state.'
                )}
              </p>
              <button
                type="button"
                onClick={onGenerateNextChapter}
                disabled={gerando}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  borderRadius: 6,
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <Sparkles size={16} /> {ui(`Escrever Cap. ${currentChapterNumber} Agora`, `Write Chapter ${currentChapterNumber} Now`)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
