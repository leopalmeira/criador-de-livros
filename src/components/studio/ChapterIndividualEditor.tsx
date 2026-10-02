import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Save, 
  CheckCircle2, 
  RefreshCw, 
  History, 
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight,
  FileText,
  Lock,
  Layers,
  FastForward,
  RotateCcw,
  Check
} from 'lucide-react';
import { BookProject, IBookChapter, ChapterVersion } from '../../types/book-project';
import { EditorialControlBar } from './EditorialControlBar';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  onNavigateToPreview?: () => void;
  onNavigateToReview?: () => void;
  initialChapterIndex?: number;
}

export const ChapterIndividualEditor: React.FC<Props> = ({
  project,
  onUpdateProject,
  onNavigateToPreview,
  initialChapterIndex = 0
}) => {
  const chapters = project.kdpChapters || [];
  const [selectedIdx, setSelectedIdx] = useState<number>(() => {
    return Math.max(0, Math.min(initialChapterIndex, chapters.length - 1));
  });

  const activeChapter = chapters[selectedIdx] || null;
  const [editedProse, setEditedProse] = useState<string>(activeChapter?.prose || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [chapterVersions, setChapterVersions] = useState<ChapterVersion[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sincroniza o texto do editor quando muda o capítulo ativo
  useEffect(() => {
    if (activeChapter) {
      setEditedProse(activeChapter.prose || '');
      setHasUnsavedChanges(false);
      loadChapterVersions(selectedIdx);
    }
  }, [selectedIdx, activeChapter?.title]);

  const loadChapterVersions = async (chIdx: number) => {
    // 1. Tenta carregar do backend
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/chapters/${chIdx}/versions`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.versions)) {
          setChapterVersions(json.versions);
          return;
        }
      }
    } catch {}

    // 2. Fallback para as versões em memória do projeto
    const inMem = activeChapter?.versions || [];
    setChapterVersions(inMem);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedProse(e.target.value);
    setHasUnsavedChanges(true);
  };

  // Salvar Edição Manual criando versão
  const handleSaveManualEdit = async () => {
    if (!activeChapter) return;
    const words = editedProse.split(/\s+/).filter(Boolean).length;

    const newVersion: ChapterVersion = {
      id: `ver_man_${Date.now()}`,
      chapterIndex: selectedIdx,
      versionNumber: (activeChapter.versions?.length || 0) + 1,
      type: 'manual_edit',
      timestamp: Date.now(),
      prose: editedProse,
      wordCount: words,
      summary: activeChapter.summary || '',
      authorType: 'user',
      note: 'Edição manual do autor'
    };

    const updatedChapters = [...chapters];
    updatedChapters[selectedIdx] = {
      ...activeChapter,
      prose: editedProse,
      wordCount: words,
      hasManualEdits: true,
      status: 'EDITANDO',
      versions: [newVersion, ...(activeChapter.versions || [])]
    };

    const updatedProj: BookProject = {
      ...project,
      kdpChapters: updatedChapters
    };

    // Sincronizar no servidor
    try {
      await fetch(`/api/projects/${encodeURIComponent(project.id)}/chapters/${selectedIdx}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVersion)
      });
    } catch {}

    onUpdateProject(updatedProj);
    setHasUnsavedChanges(false);
    loadChapterVersions(selectedIdx);
  };

  // Geração individual com chamada segura ao Backend
  const handleGenerateChapter = async (targetIdx: number = selectedIdx) => {
    const ch = chapters[targetIdx];
    if (!ch) return;

    // Proteção contra perda de edição manual
    if (ch.hasManualEdits && editedProse.trim().length > 100) {
      const choice = window.prompt(
        `Este capítulo possui edições manuais salvas.\n\nEscolha uma opção:\n1. Digite "NOVA" para arquivar sua versão atual e gerar outra.\n2. Digite "CANCELAR" para não alterar.`,
        'NOVA'
      );
      if (!choice || choice.toUpperCase() !== 'NOVA') {
        return;
      }
      // Salva versão antes de substituir
      await handleSaveManualEdit();
    }

    setIsGenerating(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/chapters/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterIndex: targetIdx })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.chapter) {
          const updatedChapters = [...chapters];
          updatedChapters[targetIdx] = data.chapter;
          const updatedProj = { ...project, kdpChapters: updatedChapters };
          onUpdateProject(updatedProj);
          if (targetIdx === selectedIdx) {
            setEditedProse(data.chapter.prose || '');
            setHasUnsavedChanges(false);
          }
        }
      } else {
        alert('Erro ao gerar capítulo via backend.');
      }
    } catch (err: any) {
      alert(`Falha na geração: ${err.message}`);
    } finally {
      setIsGenerating(false);
      loadChapterVersions(targetIdx);
    }
  };

  // Aprovação individual obrigatória
  const handleApproveChapter = async (targetIdx: number = selectedIdx) => {
    const ch = chapters[targetIdx];
    if (!ch || !ch.prose || ch.prose.trim().length < 50) {
      alert('Gere ou escreva o texto completo do capítulo antes de aprovar.');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/chapters/${targetIdx}/approve`, {
        method: 'POST'
      });

      const updatedChapters = [...chapters];
      updatedChapters[targetIdx] = {
        ...ch,
        prose: editedProse,
        wordCount: editedProse.split(/\s+/).filter(Boolean).length,
        status: 'APROVADO',
        approvedAt: Date.now()
      };

      const updatedProj: BookProject = {
        ...project,
        kdpChapters: updatedChapters,
        chapterApprovals: {
          ...(project.chapterApprovals || {}),
          [targetIdx]: true
        }
      };

      onUpdateProject(updatedProj);
    } catch (err: any) {
      alert(`Erro ao aprovar capítulo: ${err.message}`);
    }
  };

  // Modo Lote: Gerar próximos capítulos pendentes sequencialmente
  const handleGenerateNextBatch = async () => {
    const unapprovedIndices: number[] = [];
    chapters.forEach((c, idx) => {
      if (c.status !== 'APROVADO' && (!c.prose || c.prose.trim().length < 200)) {
        unapprovedIndices.push(idx);
      }
    });

    if (unapprovedIndices.length === 0) {
      alert('Todos os capítulos já possuem conteúdo gerado ou estão aprovados!');
      return;
    }

    const confirm = window.confirm(
      `Modo em Lote: ${unapprovedIndices.length} capítulo(s) não aprovados serão gerados sequencialmente.\nOs capítulos já aprovados permanecerão IMUTÁVEIS.\n\nDeseja iniciar?`
    );
    if (!confirm) return;

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: unapprovedIndices.length });

    for (let i = 0; i < unapprovedIndices.length; i++) {
      const targetIdx = unapprovedIndices[i];
      setBatchProgress({ current: i + 1, total: unapprovedIndices.length });
      setSelectedIdx(targetIdx);

      try {
        await handleGenerateChapter(targetIdx);
      } catch (err) {
        console.error(`Erro no lote ao gerar capítulo ${targetIdx + 1}:`, err);
        alert(`O lote foi INTERROMPIDO no Capítulo ${targetIdx + 1} devido a um erro. Os capítulos anteriores foram preservados com segurança.`);
        break;
      }
    }

    setIsBatchGenerating(false);
    setBatchProgress(null);
  };

  // Restaurar Versão Anterior
  const handleRestoreVersion = (ver: ChapterVersion) => {
    const confirm = window.confirm(`Deseja restaurar esta versão gravada em ${new Date(ver.timestamp).toLocaleString()}?`);
    if (!confirm) return;

    setEditedProse(ver.prose);
    setHasUnsavedChanges(true);
    setShowVersionModal(false);
  };

  const wordCount = editedProse.split(/\s+/).filter(Boolean).length;
  const estimatedPages = Math.max(1, Math.round(wordCount / 250));
  const isApproved = activeChapter?.status === 'APROVADO';
  const hasText = editedProse.trim().length > 100;
  const canGenerateNext = isApproved && selectedIdx < chapters.length - 1;

  return (
    <div className="chapter-individual-editor space-y-5">
      {/* SELETOR DE CAPÍTULOS HORIZONTAL COM STATUS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2">
          {chapters.map((ch, idx) => {
            const isSel = idx === selectedIdx;
            const isChApproved = ch.status === 'APROVADO';
            const hasProse = (ch.prose || '').trim().length > 100;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`px-3 py-2 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                  isSel
                    ? 'bg-blue-600 text-white shadow-md'
                    : isChApproved
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/50'
                    : hasProse
                    ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-900/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {isChApproved ? (
                  <Check size={13} strokeWidth={3} className="text-emerald-400" />
                ) : (
                  <span>Cap. {idx + 1}</span>
                )}
                <span className="truncate max-w-[120px]">{ch.title.replace(/^Capítulo\s*\d+\s*:\s*/i, '')}</span>
              </button>
            );
          })}
        </div>

        {/* Botão de Geração em Lote */}
        <button
          type="button"
          onClick={handleGenerateNextBatch}
          disabled={isBatchGenerating || isGenerating}
          className="px-3.5 py-2 rounded-lg text-xs font-bold bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-500/40 shrink-0 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Gera os capítulos que ainda não foram aprovados em sequência com parada atômica em erro"
        >
          <FastForward size={13} />
          {isBatchGenerating ? `Gerando Lote (${batchProgress?.current}/${batchProgress?.total})...` : 'Gerar Próximos em Lote'}
        </button>
      </div>

      {activeChapter && (
        <>
          {/* BARRA DE CONTROLE EDITORIAL DO CAPÍTULO */}
          <EditorialControlBar
            stageId={`chapter_${selectedIdx}`}
            stageLabel={`Capítulo ${selectedIdx + 1}: ${activeChapter.title}`}
            status={(activeChapter.editorialStatus || (activeChapter.status as any) || 'PENDENTE') as any}
            isApproved={isApproved}
            canApprove={hasText}
            hasManualEdits={activeChapter.hasManualEdits}
            approveButtonText={isApproved ? `✓ CAPÍTULO ${selectedIdx + 1} APROVADO (IMUTÁVEL)` : `APROVAR CAPÍTULO ${selectedIdx + 1}`}
            onPrev={selectedIdx > 0 ? () => setSelectedIdx(selectedIdx - 1) : undefined}
            onNext={selectedIdx < chapters.length - 1 ? () => setSelectedIdx(selectedIdx + 1) : undefined}
            onRegenerate={() => handleGenerateChapter(selectedIdx)}
            onApprove={() => handleApproveChapter(selectedIdx)}
          />

          {/* CABEÇALHO DO CAPÍTULO & METADADOS */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Capítulo {selectedIdx + 1} de {chapters.length}
                </span>
                {isApproved && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Lock size={10} /> Imutável nesta versão
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                {activeChapter.title}
              </h3>
              <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
                {activeChapter.purpose || activeChapter.summary || 'Desenvolvimento narrativo e prático do livro.'}
              </p>
            </div>

            {/* Métricas e Botões Rápidos */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-bold text-white">{wordCount.toLocaleString()} palavras</div>
                <div className="text-xs text-slate-400">~{estimatedPages} páginas diagramadas</div>
              </div>

              <button
                type="button"
                onClick={() => setShowVersionModal(true)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Histórico de versões deste capítulo"
              >
                <History size={16} />
              </button>

              <button
                type="button"
                onClick={handleSaveManualEdit}
                disabled={!hasUnsavedChanges}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  hasUnsavedChanges
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
                title="Salvar alterações manuais feitas no texto"
              >
                <Save size={13} />
                {hasUnsavedChanges ? 'Salvar Edição' : 'Salvo'}
              </button>
            </div>
          </div>

          {/* ÁREA DE TEXTO COMPLETO DO CAPÍTULO */}
          <div className="relative">
            <textarea
              className="w-full h-[520px] bg-slate-950 border border-slate-800 rounded-xl p-5 text-sm text-slate-200 leading-relaxed font-serif focus:outline-none focus:border-blue-500 resize-y shadow-inner"
              placeholder={`Escreva ou gere o texto COMPLETO do Capítulo ${selectedIdx + 1}...\n\nClique no botão "Regenerar com IA" na barra superior para compor a prosa completa guiada pela Bíblia do Livro.`}
              value={editedProse}
              onChange={handleTextChange}
            />

            {!hasText && !isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm rounded-xl p-6 text-center">
                <BookOpen size={48} className="text-blue-400 mb-3 opacity-80" />
                <h4 className="text-base font-bold text-white mb-1">
                  Texto Completo do Capítulo Não Gerado
                </h4>
                <p className="text-xs text-slate-400 max-w-md mb-4">
                  A IA gerará a prosa integral com base no propósito deste capítulo, na Bíblia do Livro e nos acontecimentos dos capítulos anteriores.
                </p>
                <button
                  type="button"
                  onClick={() => handleGenerateChapter(selectedIdx)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
                >
                  <Sparkles size={14} /> GERAR TEXTO COMPLETO DO CAPÍTULO {selectedIdx + 1}
                </button>
              </div>
            )}
          </div>

          {/* RODAPÉ DO EDITOR: PRÓXIMO PASSO */}
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">
              {isApproved ? (
                <strong className="text-emerald-400">✓ Capítulo aprovado. Pronto para o próximo capítulo ou revisão consolidada.</strong>
              ) : (
                'Revise o texto acima e clique em "Aprovar Capítulo" para torná-lo imutável.'
              )}
            </span>

            {canGenerateNext && (
              <button
                type="button"
                onClick={() => setSelectedIdx(selectedIdx + 1)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                Ir para o Capítulo {selectedIdx + 2} <ArrowRight size={14} />
              </button>
            )}
          </div>
        </>
      )}

      {/* MODAL DE HISTÓRICO DE VERSÕES DO CAPÍTULO */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <History size={18} className="text-blue-400" />
                Histórico de Versões • Capítulo {selectedIdx + 1}
              </h3>
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {chapterVersions.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Nenhuma versão gravada ainda para este capítulo.</p>
              ) : (
                chapterVersions.map((v, i) => (
                  <div key={v.id || i} className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                          {v.type === 'ia_generated' ? 'Geração IA' : v.type === 'manual_edit' ? 'Edição Manual' : 'Revisão'}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {v.wordCount} palavras
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {new Date(v.timestamp).toLocaleString()} • {v.note || 'Sem anotações'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(v)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-1 transition-colors"
                      title="Restaurar o texto desta versão no editor"
                    >
                      <RotateCcw size={12} /> Restaurar
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-800 pt-3 text-right">
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
