import React from 'react';
import { 
  CheckCircle2, 
  RefreshCw, 
  ArrowLeft, 
  ArrowRight, 
  AlertTriangle, 
  Clock, 
  Wand2, 
  Sparkles,
  Lock,
  Edit3
} from 'lucide-react';
import { EditorialStateStatus } from '../../types/book-project';
import { StageStatus } from '../../types/stages';

interface EditorialControlBarProps {
  stageId: string;
  stageLabel: string;
  status: StageStatus | EditorialStateStatus;
  isGenerating?: boolean;
  canApprove?: boolean;
  isApproved?: boolean;
  hasManualEdits?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onRegenerate?: () => void;
  onApprove: () => void;
  approveButtonText?: string;
  approvalWarning?: string;
}

export const EditorialControlBar: React.FC<EditorialControlBarProps> = ({
  stageId,
  stageLabel,
  status,
  isGenerating = false,
  canApprove = true,
  isApproved = false,
  hasManualEdits = false,
  onPrev,
  onNext,
  onRegenerate,
  onApprove,
  approveButtonText,
  approvalWarning
}) => {
  const currentStatus = (status as string).toUpperCase();
  const approved = isApproved || currentStatus === 'APROVADO' || currentStatus === 'COMPLETED';

  const getStatusBadge = () => {
    if (isGenerating || currentStatus === 'GERANDO' || currentStatus === 'REGENERANDO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
          <RefreshCw size={12} className="animate-spin" />
          GERANDO COM IA...
        </span>
      );
    }
    if (approved) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 size={12} />
          APROVADO PELO AUTOR
        </span>
      );
    }
    if (currentStatus === 'EDITANDO' || hasManualEdits) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
          <Edit3 size={12} />
          EDIÇÃO MANUAL PERSISTIDA
        </span>
      );
    }
    if (currentStatus === 'AGUARDANDO_APROVACAO' || currentStatus === 'REVIEW') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Clock size={12} />
          AGUARDANDO SUA APROVAÇÃO
        </span>
      );
    }
    if (currentStatus === 'ERRO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <AlertTriangle size={12} />
          ERRO NA OPERAÇÃO
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600">
        <Clock size={12} />
        PENDENTE DE AÇÃO
      </span>
    );
  };

  const handleRegenerateClick = () => {
    if (hasManualEdits) {
      const confirm = window.confirm(
        'Este item possui edições manuais que foram salvas.\nRegenerar poderá sobrescrever as alterações manuais não arquivadas.\n\nDeseja prosseguir com a regeneração?'
      );
      if (!confirm) return;
    }
    onRegenerate?.();
  };

  return (
    <div className="editorial-control-bar bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 my-4 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
      {/* Lado Esquerdo: Identificação e Status */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Controle Editorial • {stageLabel}
          </span>
          <div className="mt-1 flex items-center gap-2">
            {getStatusBadge()}
          </div>
        </div>
      </div>

      {/* Lado Direito: Ações Editoriais */}
      <div className="flex items-center flex-wrap gap-2.5">
        {onPrev && (
          <button
            type="button"
            className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
            onClick={onPrev}
            title="Voltar à etapa anterior"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
        )}

        {onRegenerate && (
          <button
            type="button"
            className="px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            onClick={handleRegenerateClick}
            disabled={isGenerating}
            title="Regenerar sugestão da IA mantendo o histórico de versões"
          >
            <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Processando...' : 'Regenerar com IA'}
          </button>
        )}

        {/* Botão Principal de Aprovação Explícita */}
        <button
          type="button"
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
            approved
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-600/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400 hover:scale-[1.02]'
          } disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed`}
          onClick={onApprove}
          disabled={!canApprove || isGenerating}
          title={approvalWarning || 'Aprovar formalmente esta etapa editorial para desbloquear a sequência'}
        >
          <CheckCircle2 size={15} />
          {approved ? '✓ ETAPA APROVADA' : (approveButtonText || `APROVAR ${stageLabel.toUpperCase()}`)}
        </button>

        {onNext && (
          <button
            type="button"
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              approved
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
            onClick={approved ? onNext : undefined}
            disabled={!approved}
            title={approved ? 'Avançar para a próxima etapa' : 'Aprovação necessária antes de avançar'}
          >
            Continuar <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
