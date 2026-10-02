import React, { useState } from 'react';
import { BookProject } from '../../../types/book-project';
import { DescriptionData, getDefaultStageStatuses } from '../../../types/stages';
import { AiService } from '../../../services/ai-service';
import { Sparkles, Copy, Check } from 'lucide-react';
import { BoxSuggestionService } from '../../../services/box-suggestion-service';
import { EditorialControlBar } from '../EditorialControlBar';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  aiService: AiService;
  onContinue?: () => void;
  onPrev?: () => void;
}

export const DescriptionStage: React.FC<Props> = ({ project, onUpdateProject, aiService, onContinue, onPrev }) => {
  const data: DescriptionData = project.stageData?.description || {
    headline: '',
    relateSection: '',
    bulletPoints: [],
    overcomingObjections: '',
    callToAction: '',
    fullDescription: project.description || ''
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const isApproved = project.stageStatuses?.description === 'APROVADO' ||
                     project.editorialStageApprovals?.description?.status === 'APROVADO';

  const handleApprove = () => {
    const updated: BookProject = {
      ...project,
      description: data.fullDescription || project.description,
      stageStatuses: {
        ...(project.stageStatuses || getDefaultStageStatuses()),
        description: 'COMPLETED'
      },
      editorialStageApprovals: {
        ...(project.editorialStageApprovals || {}),
        description: {
          stageId: 'description',
          status: 'APROVADO',
          approvedAt: Date.now(),
          approvedBy: 'user',
          notes: 'Sinopse comercial e copy KDP aprovadas.'
        }
      }
    };
    onUpdateProject(updated);
  };

  const updateData = (updates: Partial<DescriptionData>) => {
    const updated = { ...data, ...updates };
    onUpdateProject({
      ...project,
      stageData: { ...(project.stageData || {}), description: updated },
      stageStatuses: { ...(project.stageStatuses || {}), description: 'IN_PROGRESS' },
      description: updates.fullDescription !== undefined ? updates.fullDescription : (updated.fullDescription || project.description)
    } as BookProject);
  };

  const generateDescription = async () => {
    setIsGenerating(true);
    try {
      // Tenta usar a API Gemini se o provider for gemini
      if (aiService.getProvider() === 'gemini') {
        const { GeminiBookGeneratorService } = await import('../../../services/gemini-book-generator');
        const generator = new GeminiBookGeneratorService(aiService);
        const result = await generator.generateDescription(project);
        if (result.success && result.data) {
          updateData(result.data);
          return;
        }
      }
      // Fallback local
      const next = BoxSuggestionService.getNextSuggestion('description.blurb', project);
      updateData({ fullDescription: next });
    } catch (err) {
      console.error('Erro ao gerar descrição:', err);
      // Fallback local em caso de erro
      const next = BoxSuggestionService.getNextSuggestion('description.blurb', project);
      updateData({ fullDescription: next });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!data.fullDescription) return;
    navigator.clipboard.writeText(data.fullDescription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="stage-form-container">
      {/* BARRA DE CONTROLE EDITORIAL */}
      <EditorialControlBar
        stageId="description"
        stageLabel="Sinopse Comercial Amazon KDP"
        status={isApproved ? 'APROVADO' : data.fullDescription?.trim().length > 30 ? 'AGUARDANDO_APROVACAO' : 'PENDENTE'}
        isApproved={isApproved}
        canApprove={Boolean(data.fullDescription && data.fullDescription.trim().length > 30)}
        approveButtonText={isApproved ? '✓ SINOPSE APROVADA' : 'APROVAR SINOPSE & COPY KDP'}
        onPrev={onPrev}
        onNext={isApproved ? onContinue : undefined}
        onRegenerate={generateDescription}
        onApprove={handleApprove}
      />

      <div className="stage-intro-block" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3>Sinopse & Copy de Vendas para Amazon KDP</h3>
            <p>A descrição na Amazon é a página de vendas do seu livro. Gere uma copy profissional com ganchos emocionais, benefícios claros e chamada para ação imediata.</p>
          </div>
          <button
            type="button"
            className="btn-create-sub"
            onClick={() => {
              const filled = BoxSuggestionService.fillEntireStage('description', project);
              onUpdateProject(filled);
            }}
          >
            <Sparkles size={14} /> ⚡ Preenchimento Automático com IA
          </button>
        </div>
      </div>

      <div className="stage-action-center">
        <button className="btn-primary-action" onClick={generateDescription} disabled={isGenerating}>
          {isGenerating ? (
            <><span className="spinner" /> Redigindo copy de vendas para a Amazon...</>
          ) : (
            <><Sparkles size={16} /> Gerar Nova Sinopse Persuasiva com IA</>
          )}
        </button>
      </div>

      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label">Texto Completo da Sinopse Formatada (HTML KDP)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-box-suggest"
              onClick={() => {
                const next = BoxSuggestionService.getNextSuggestion('description.blurb', project);
                updateData({ fullDescription: next });
              }}
              title="Sugerir outra versão de copy"
            >
              <Sparkles size={11} /> Nova Opção sem Repetir
            </button>
            {data.fullDescription && (
              <button className="btn-sm-outline" onClick={handleCopy}>
                {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar para Amazon KDP</>}
              </button>
            )}
          </div>
        </div>
        <textarea
          className="form-textarea form-textarea-lg"
          rows={14}
          placeholder="A descrição do seu livro aparecerá aqui após ser gerada. Você também pode redigir ou ajustar o texto livremente."
          value={data.fullDescription}
          onChange={(e) => updateData({ fullDescription: e.target.value })}
        />
      </div>
    </div>
  );
};
