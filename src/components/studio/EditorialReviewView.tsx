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
  FileText
} from 'lucide-react';
import { BookProject, IBookEditorReport } from '../../types/book-project';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';

interface EditorialReviewViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  onNavigateToChapter: (chapterIndex: number) => void;
  aiService: AiService;
}

export const EditorialReviewView: React.FC<EditorialReviewViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToChapter,
  aiService
}) => {
  const [report, setReport] = useState<IBookEditorReport | null>(project.kdpEditorReport || null);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);

  const handleRunReview = async () => {
    setIsReviewing(true);
    try {
      const pipeline = new KdpBookPipeline(aiService);
      const generated = await pipeline.reviewManuscript(
        project.kdpConcept || {
          title: project.title,
          hook: '',
          audience: project.targetAudience,
          tone: '',
          targetWordCount: 25000,
          targetChapterCount: 10,
          targetPages: project.estimatedPages,
          trimSize: project.trimSize,
          paperType: project.paperType,
          comparableTitles: [],
          themes: [],
          shortSynopsis: project.description,
          longSynopsis: project.description,
          promise: project.title,
          differentiator: ''
        },
        project.kdpChapters || [],
        project.kdpBible || { characters: [], locations: [], styleGuide: { artStyle: '', palette: [], tone: '' } },
        project.language
      );

      if (generated) {
        setReport(generated);
        onUpdateProject({
          ...project,
          kdpEditorReport: generated
        });
      }
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="editorial-review-view-container">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Edit3 size={22} className="text-pink-400" />
            <h3 className="text-xl font-bold">Revisão Editorial & Leitura Crítica</h3>
          </div>
          <p className="text-xs text-muted">
            Auditoria heurística de continuidade, ritmo, voz narrativa e furos de consistência.
          </p>
        </div>

        <button 
          className="btn-primary-action" 
          onClick={handleRunReview}
          disabled={isReviewing}
        >
          <Wand2 size={15} />
          {isReviewing ? 'Examinando Manuscrito...' : 'Executar Leitura Crítica com IA'}
        </button>
      </div>

      {report ? (
        <div className="space-y-6">
          {/* PLACAR EDITORIAL */}
          <div className="p-5 bg-surface-elevated rounded-xl border border-border-subtle flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/40 flex items-center justify-center font-bold text-2xl">
                {report.score || 85}
              </div>
              <div>
                <h4 className="font-bold text-base">Parecer do Editor Executivo</h4>
                <p className="text-xs text-muted max-w-xl">{report.summary}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-muted block mb-1">Capítulos para Revisão</span>
              <span className="font-bold text-lg text-amber-400">
                {report.chaptersToRevise?.length || 0} capítulos
              </span>
            </div>
          </div>

          {/* PONTOS FORTES */}
          {report.strengths && report.strengths.length > 0 && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <h4 className="font-bold text-sm text-emerald-400 mb-2">Pontos Fortes da Obra</h4>
              <ul className="text-xs text-slate-300 space-y-1">
                {report.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* LISTA DE APONTAMENTOS / ISSUES */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm">Apontamentos Críticos ({report.issues?.length || 0})</h4>
            {report.issues?.map((issue, idx) => (
              <div key={idx} className="p-3.5 bg-surface-elevated border border-border-subtle rounded-lg flex justify-between items-center">
                <div className="flex items-start gap-3">
                  {issue.severity === 'blocker' ? (
                    <XCircle size={18} className="text-rose-400 mt-0.5" />
                  ) : issue.severity === 'important' ? (
                    <AlertTriangle size={18} className="text-amber-400 mt-0.5" />
                  ) : (
                    <CheckCircle2 size={18} className="text-blue-400 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {issue.chapterIndex && (
                        <span className="badge-cap">Cap. {issue.chapterIndex}</span>
                      )}
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">
                        {issue.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200">{issue.note}</p>
                  </div>
                </div>

                {issue.chapterIndex && (
                  <button 
                    className="btn-tiny-action text-blue-400 font-semibold text-xs whitespace-nowrap ml-3"
                    onClick={() => onNavigateToChapter(issue.chapterIndex!)}
                  >
                    Abrir Cap. {issue.chapterIndex} →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-surface-elevated border border-border-subtle rounded-xl">
          <Edit3 size={40} className="text-muted mx-auto mb-3" />
          <h4 className="font-bold text-base mb-1">Nenhuma leitura crítica realizada ainda</h4>
          <p className="text-xs text-muted mb-4 max-w-md mx-auto">
            Execute a leitura crítica para auditar o ritmo de parágrafos, consistência com personagens e coesão dos capítulos.
          </p>
          <button className="btn-primary-action mx-auto" onClick={handleRunReview}>
            <Wand2 size={14} /> Iniciar Auditoria Editorial
          </button>
        </div>
      )}
    </div>
  );
};
