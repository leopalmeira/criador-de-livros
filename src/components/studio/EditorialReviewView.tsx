import React, { useState } from 'react';
import { 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wand2, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck, 
  FileText,
  Check,
  X,
  Sparkles,
  Lock
} from 'lucide-react';
import { BookProject, ChapterReviewSuggestion } from '../../types/book-project';
import { EditorialControlBar } from './EditorialControlBar';
import { EditorialReviewEngine } from '../../services/editorial-review-engine';

interface EditorialReviewViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  onNavigateToChapter?: (chapterIndex: number) => void;
  onNavigateToLayout?: () => void;
  onContinueToLayout?: () => void;
}

export const EditorialReviewView: React.FC<EditorialReviewViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToChapter,
  onContinueToLayout
}) => {
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<ChapterReviewSuggestion[]>(
    project.reviewSuggestions || []
  );

  const isApproved = project.manuscriptApprovedAt !== undefined || 
                     project.editorialStageApprovals?.['manuscript']?.status === 'APROVADO';

  const handleRunReview = async () => {
    setIsReviewing(true);
    try {
      let results: ChapterReviewSuggestion[] = [];
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/review`, {
          method: 'POST'
        });
        if (res.ok) {
          const json = await res.json();
          results = json.suggestions || [];
        }
      } catch {}

      if (results.length === 0) {
        results = EditorialReviewEngine.reviewManuscript(project);
      }

      setSuggestions(results);
      onUpdateProject({
        ...project,
        reviewSuggestions: results
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleAcceptSuggestion = (id: string) => {
    const target = suggestions.find(s => s.id === id);
    if (!target) return;

    // Aplica a sugestão no capítulo correspondente se houver substituição direta
    const chapters = [...(project.kdpChapters || [])];
    const ch = chapters[target.chapterIndex];
    if (ch && ch.prose && target.snippet && target.suggestion) {
      // Se a sugestão for substituição direta de termo
      if (target.snippet.includes('...')) {
        const cleanSnippet = target.snippet.replace(/\.\.\./g, '').trim();
        if (cleanSnippet && ch.prose.includes(cleanSnippet)) {
          const rep = target.suggestion.replace(/^Substituir por [^"]*"([^"]+)".*$/, '$1');
          ch.prose = ch.prose.replace(cleanSnippet, rep);
          ch.hasManualEdits = true;
        }
      }
    }

    const updatedSuggestions = suggestions.map(s => 
      s.id === id ? { ...s, status: 'accepted' as const } : s
    );

    setSuggestions(updatedSuggestions);
    onUpdateProject({
      ...project,
      kdpChapters: chapters,
      reviewSuggestions: updatedSuggestions
    });
  };

  const handleIgnoreSuggestion = (id: string) => {
    const updated = suggestions.map(s => 
      s.id === id ? { ...s, status: 'ignored' as const } : s
    );
    setSuggestions(updated);
    onUpdateProject({
      ...project,
      reviewSuggestions: updated
    });
  };

  const handleAcceptAll = () => {
    suggestions.forEach(s => {
      if (s.status === 'pending') {
        handleAcceptSuggestion(s.id);
      }
    });
  };

  const handleApproveManuscript = () => {
    const unreviewed = suggestions.filter(s => s.status === 'pending');
    if (unreviewed.length > 0) {
      const confirm = window.confirm(
        `Existem ${unreviewed.length} apontamento(s) pendentes de decisão (Aceitar/Ignorar).\nDeseja aprovar o manuscrito assim mesmo?`
      );
      if (!confirm) return;
    }

    const updated: BookProject = {
      ...project,
      manuscriptApprovedAt: Date.now(),
      editorialStageApprovals: {
        ...(project.editorialStageApprovals || {}),
        manuscript: {
          stageId: 'manuscript',
          status: 'APROVADO',
          approvedAt: Date.now(),
          approvedBy: 'user',
          notes: 'Revisão ortográfica, gramatical e de continuidade aprovada pelo autor.'
        }
      }
    };

    onUpdateProject(updated);
  };

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  return (
    <div className="editorial-review-view-container space-y-6">
      {/* BARRA DE CONTROLE EDITORIAL */}
      <EditorialControlBar
        stageId="manuscript_review"
        stageLabel="Revisão Ortográfica & Continuidade Literária"
        status={isApproved ? 'APROVADO' : suggestions.length > 0 ? 'AGUARDANDO_APROVACAO' : 'PENDENTE'}
        isApproved={isApproved}
        canApprove={suggestions.length > 0 || (project.kdpChapters || []).length > 0}
        approveButtonText={isApproved ? '✓ MANUSCRITO REVISADO & APROVADO' : 'APROVAR MANUSCRITO REVISADO'}
        onNext={isApproved ? onContinueToLayout : undefined}
        onRegenerate={handleRunReview}
        onApprove={handleApproveManuscript}
      />

      {/* HEADER DE REVISÃO */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Edit3 size={20} className="text-pink-400" />
            <h3 className="text-base font-bold text-white">Auditoria Editorial PT-BR & Continuidade da Bíblia</h3>
          </div>
          <p className="text-xs text-slate-400">
            A IA não altera o manuscrito automaticamente. Cada sugestão é submetida à sua decisão individual.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-3.5 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors"
            >
              Aceitar Todas as Sugestões
            </button>
          )}

          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            onClick={handleRunReview}
            disabled={isReviewing}
          >
            <Wand2 size={14} className={isReviewing ? 'animate-spin' : ''} />
            {isReviewing ? 'Examinando Manuscrito...' : 'Executar Revisão Geral'}
          </button>
        </div>
      </div>

      {/* RESULTADOS DA AUDITORIA */}
      {suggestions.length > 0 ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>
              Total de apontamentos: <strong className="text-white">{suggestions.length}</strong>
            </span>
            <span>
              Pendentes de decisão: <strong className={pendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}>{pendingCount}</strong>
            </span>
          </div>

          <div className="space-y-3">
            {suggestions.map((item, idx) => {
              const isAccepted = item.status === 'accepted';
              const isIgnored = item.status === 'ignored';

              return (
                <div
                  key={item.id || idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isAccepted
                      ? 'bg-emerald-950/20 border-emerald-500/40 opacity-75'
                      : isIgnored
                      ? 'bg-slate-900/40 border-slate-800 opacity-50'
                      : 'bg-slate-900 border-slate-700/80 shadow-md'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Capítulo {item.chapterIndex + 1}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.type === 'continuity'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : item.type === 'style'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {item.type === 'continuity' ? 'Continuidade da Bíblia' : item.type === 'style' ? 'Estilo / Clichê' : 'Gramática / Ortografia'}
                        </span>
                        {isAccepted && (
                          <span className="text-[10px] font-bold text-emerald-400">✓ Aceito</span>
                        )}
                        {isIgnored && (
                          <span className="text-[10px] font-bold text-slate-500">Ignorado</span>
                        )}
                      </div>

                      <div className="text-xs text-slate-300">
                        <strong className="text-slate-400">Problema detectado:</strong> {item.problem}
                      </div>

                      {item.snippet && (
                        <div className="text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-slate-400">
                          "{item.snippet}"
                        </div>
                      )}

                      <div className="text-xs text-emerald-400">
                        <strong className="text-slate-300">Sugestão editorial:</strong> {item.suggestion}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    {!isAccepted && !isIgnored && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAcceptSuggestion(item.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow transition-colors"
                          title="Aceitar e aplicar a sugestão no capítulo"
                        >
                          <Check size={13} /> Aceitar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleIgnoreSuggestion(item.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
                          title="Ignorar esta sugestão"
                        >
                          <X size={13} /> Ignorar
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateToChapter && onNavigateToChapter(item.chapterIndex)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-medium border border-slate-700 transition-colors"
                          title="Abrir no editor individual"
                        >
                          Editar no Cap. {item.chapterIndex + 1} →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <Edit3 size={40} className="text-slate-600 mx-auto" />
          <h4 className="font-bold text-base text-white">Nenhuma revisão executada ainda</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Clique no botão abaixo para rodar a auditoria em todos os capítulos aprovados. A análise verifica ortografia, gramática, clichês e consistência com os fatos da Bíblia do Livro.
          </p>
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg"
            onClick={handleRunReview}
          >
            <Wand2 size={14} /> Executar Revisão Geral do Manuscrito
          </button>
        </div>
      )}
    </div>
  );
};
