import React, { useState, useEffect, useMemo } from 'react';
import { BookProject } from '../../../types/book-project';
import { getDefaultStageStatuses, StageId, StageStatus } from '../../../types/stages';
import { AiService } from '../../../services/ai-service';
import { ExportQualityView } from '../ExportQualityView';
import { ShowMeTheStoryEngine } from '../../../services/show-me-the-story-engine';
import { BookAuditService } from '../../../services/book-audit-service';
import { BookAuditReportView } from '../BookAuditReportView';
import { 
  Download, 
  FileText, 
  BookOpen, 
  CheckCircle, 
  Rocket, 
  Sparkles, 
  Award, 
  AlertCircle,
  RefreshCw,
  Lock,
  ShieldCheck
} from 'lucide-react';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  aiService: AiService;
}

export const FinishStage: React.FC<Props> = ({ project, onUpdateProject, aiService }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  // Execução Reativa da Auditoria Final Completa (Seção 44.1 & 44.20)
  const auditReport = useMemo(() => {
    return BookAuditService.runCompleteAudit(project);
  }, [
    project.title, 
    project.subtitle, 
    project.author, 
    project.genre,
    project.kdpChapters, 
    project.visualPages, 
    project.coverImageUrl, 
    project.kdpCoverDesign, 
    project.stageData,
    project.updatedAt
  ]);

  const targetPages = project.actualPages || project.estimatedPages || 150;

  // Sincroniza automaticamente coverImageUrl na raiz do projeto se ainda não estiver definido
  useEffect(() => {
    if (!project.coverImageUrl && (project.kdpCoverDesign?.frontImageUrl || project.stageData?.['book-cover']?.artUrl)) {
      const coverArt = project.kdpCoverDesign?.frontImageUrl || project.stageData?.['book-cover']?.artUrl;
      onUpdateProject({ ...project, coverImageUrl: coverArt });
    }
  }, [project.coverImageUrl, project.kdpCoverDesign?.frontImageUrl, project.stageData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Forçar reavaliação da auditoria
  const handleRefreshAudit = () => {
    onUpdateProject({ ...project, updatedAt: Date.now() });
    showToast('✓ Auditoria completa reexecutada com sucesso!');
  };

  // Ação de Publicar Livro (Seção 44.19 & 44.21)
  const handlePublishBook = () => {
    if (!auditReport.canFinalize) {
      showToast(`⚠️ Finalização bloqueada: resolva os ${auditReport.criticalCount} itens críticos antes de publicar.`);
      return;
    }

    const updatedStatuses: Record<StageId, StageStatus> = {
      ...(project.stageStatuses || getDefaultStageStatuses()),
      finish: 'COMPLETED'
    };

    const published: BookProject = {
      ...project,
      status: 'PUBLICADO',
      pipelineStage: 'completed',
      stageStatuses: updatedStatuses,
      publishedAt: Date.now(),
      updatedAt: Date.now()
    };

    onUpdateProject(published);
    showToast('🎉 Parabéns! Livro auditado e homologado como PUBLICADO com sucesso!');
  };

  // Ação de Enriquecer com Show Me The Story
  const handleEnrichWithStoryEngine = () => {
    setIsEnriching(true);
    try {
      const enriched = ShowMeTheStoryEngine.generateStoryBook(project, targetPages);
      const baseStatuses = enriched.stageStatuses || getDefaultStageStatuses();
      onUpdateProject({
        ...enriched,
        stageStatuses: {
          ...baseStatuses,
          outline: 'COMPLETED',
          write: 'COMPLETED',
          finish: 'COMPLETED'
        }
      });
      showToast(`⚡ Manuscrito completo gerado com sucesso para ${targetPages} páginas!`);
    } catch (err: any) {
      console.error(err);
      showToast('Ocorreu um erro ao enriquecer o manuscrito.');
    } finally {
      setIsEnriching(false);
    }
  };

  const isPublished = project.status === 'PUBLICADO';
  const canFinalize = auditReport.canFinalize;

  return (
    <div className="stage-form-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="toast-success-banner mb-4 animate-in">
          <Award size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header de Publicação com Controle de Auditoria (Seção 44.19) */}
      <div className={`p-6 rounded-xl border mb-6 transition-all ${
        isPublished 
          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/10' 
          : canFinalize
            ? 'bg-slate-900/60 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
            : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isPublished 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : canFinalize
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {isPublished 
                  ? '● LIVRO PUBLICADO' 
                  : canFinalize 
                    ? '● AUDITORIA APROVADA' 
                    : `● AUDITORIA PENDENTE (${auditReport.criticalCount} BLOQUEIO${auditReport.criticalCount > 1 ? 'S' : ''})`}
              </span>
              <span className="text-xs text-slate-400">Padrão Amazon KDP {project.trimSize || '6x9'}</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              {project.title || 'Título da Obra'}
            </h3>
            <p className="text-xs text-slate-400">
              {isPublished 
                ? 'Obra oficialmente finalizada, auditada e homologada para distribuição na Amazon KDP.' 
                : canFinalize
                  ? 'Todos os requisitos editoriais e técnicos foram aprovados. Você pode finalizar a obra e gerar os arquivos.'
                  : 'A finalização do livro requer aprovação de todos os requisitos críticos na auditoria abaixo.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleEnrichWithStoryEngine}
              disabled={isEnriching}
              className="px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition"
              title="Garante capítulos densos e páginas exatas via Show Me The Story"
            >
              <Sparkles size={14} className={isEnriching ? 'animate-spin text-amber-400' : 'text-amber-400'} />
              {isEnriching ? 'Gerando...' : `Recalibrar ${targetPages} Págs`}
            </button>

            {/* BOTÃO FINALIZAR LIVRO — REGRA 44.19 (BLOQUEADO ENQUANTO HOUVER CRÍTICOS) */}
            <button
              onClick={handlePublishBook}
              disabled={!canFinalize}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-lg ${
                isPublished
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : canFinalize
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/30 cursor-pointer animate-pulse-subtle'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-rose-900/40 opacity-75'
              }`}
              title={canFinalize ? 'Finalizar e homologar obra' : `Bloqueado: resolva ${auditReport.criticalCount} pendência(s) crítica(s)`}
            >
              {!canFinalize ? <Lock size={16} className="text-rose-400" /> : <Rocket size={16} />}
              {isPublished 
                ? '✓ Obra Já Publicada (Atualizar)' 
                : canFinalize 
                  ? 'Finalizar & Publicar Livro' 
                  : `Finalização Bloqueada (${auditReport.criticalCount})`}
            </button>
          </div>
        </div>
      </div>

      {/* PAINEL COMPLETO DA AUDITORIA FINAL DO LIVRO (SEÇÃO 44) */}
      <BookAuditReportView
        project={project}
        report={auditReport}
        onRefreshAudit={handleRefreshAudit}
        onUpdateProject={onUpdateProject}
      />

      {/* Seção de Exportação & Download Real KDP */}
      <div className="stage-wrapper mt-6" style={{ padding: 0 }}>
        <ExportQualityView
          project={project}
          onUpdateProject={onUpdateProject}
          aiService={aiService}
        />
      </div>
    </div>
  );
};
