import React, { useState } from 'react';
import { BookProject } from '../../../types/book-project';
import { BookTitlesData, TitleOption, getDefaultStageStatuses } from '../../../types/stages';
import { AiService } from '../../../services/ai-service';
import { Sparkles, Check } from 'lucide-react';
import { BoxSuggestionService } from '../../../services/box-suggestion-service';
import { EditorialControlBar } from '../EditorialControlBar';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  aiService: AiService;
  onContinue?: () => void;
  onPrev?: () => void;
}

export const BookTitlesStage: React.FC<Props> = ({ project, onUpdateProject, aiService, onContinue, onPrev }) => {
  const data: BookTitlesData = project.stageData?.['book-titles'] || {
    generatedTitles: [],
    selectedTitleId: '',
    customTitle: project.title || '',
    customSubtitle: project.subtitle || ''
  };
  const [isGenerating, setIsGenerating] = useState(false);

  const updateData = (updates: Partial<BookTitlesData>) => {
    const updated = { ...data, ...updates };
    onUpdateProject({
      ...project,
      stageData: { ...(project.stageData || {}), 'book-titles': updated },
      stageStatuses: { ...(project.stageStatuses || {}), 'book-titles': 'IN_PROGRESS' },
      title: updates.customTitle !== undefined ? updates.customTitle : (updated.customTitle || project.title),
      subtitle: updates.customSubtitle !== undefined ? updates.customSubtitle : (updated.customSubtitle || project.subtitle)
    } as BookProject);
  };

  const generateTitles = async () => {
    setIsGenerating(true);
    try {
      // Tenta usar Gemini se disponível
      if (aiService.getProvider() === 'gemini') {
        const { GeminiBookGeneratorService } = await import('../../../services/gemini-book-generator');
        const generator = new GeminiBookGeneratorService(aiService);
        const result = await generator.generateTitles(project);
        if (result.success && result.data) {
          updateData(result.data);
          return;
        }
      }

      // Fallback: prompt direto via aiService
      const research = project.stageData?.research;
      const topic = research?.topic || project.topic || 'Negócios e Alta Performance';
      const genre = research?.genre || project.kdpBookType || 'não-ficção';
      const stance = research?.stance || '';
      
      const prompt = `Gere 10 opções de títulos e subtítulos de altíssimo impacto e apelo comercial (estilo Best-Seller Amazon) para um livro de ${genre} sobre "${topic}".
${stance ? `Ponto de vista e diferencial do autor: "${stance}"` : ''}
Cada opção DEVE ter um título principal forte (memorável, instigante) e um subtítulo explicativo com promessa clara de transformação para o leitor.
Retorne exclusivamente em Português como um JSON array com os campos: title, subtitle.
Apenas o array JSON, sem introdução ou texto extra.`;

      const response = await aiService.generateText(prompt);
      const parsed = JSON.parse(response.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
      const titles: TitleOption[] = (Array.isArray(parsed) ? parsed : []).map((item: any, i: number) => ({
        id: `title_${Date.now()}_${i}`,
        title: item.title || '',
        subtitle: item.subtitle || ''
      }));
      updateData({ generatedTitles: titles });
    } catch (err) {
      console.error('Erro ao gerar títulos:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectTitle = (t: TitleOption) => {
    updateData({
      selectedTitleId: t.id,
      customTitle: t.title,
      customSubtitle: t.subtitle
    });
  };

  const isApproved = project.stageStatuses?.['book-titles'] === 'APROVADO' ||
                     project.editorialStageApprovals?.['book-titles']?.status === 'APROVADO';

  const handleApproveTitle = () => {
    if (!data.customTitle.trim()) {
      alert('Selecione ou digite um título para aprovar esta etapa.');
      return;
    }

    onUpdateProject({
      ...project,
      title: data.customTitle.trim(),
      subtitle: data.customSubtitle?.trim() || project.subtitle,
      stageStatuses: {
        ...(project.stageStatuses || getDefaultStageStatuses()),
        'book-titles': 'COMPLETED'
      },
      editorialStageApprovals: {
        ...(project.editorialStageApprovals || {}),
        'book-titles': {
          stageId: 'book-titles',
          status: 'APROVADO',
          approvedAt: Date.now(),
          approvedBy: 'user',
          notes: `Título aprovado: "${data.customTitle.trim()}"`
        }
      }
    });
  };

  return (
    <div className="stage-form-container">
      <EditorialControlBar
        stageId="book-titles"
        stageLabel="Títulos & Subtítulos"
        status={isApproved ? 'APROVADO' : data.customTitle.trim() ? 'AGUARDANDO_APROVACAO' : 'PENDENTE'}
        isApproved={isApproved}
        canApprove={!!data.customTitle.trim()}
        approveButtonText={isApproved ? '✓ TÍTULO APROVADO' : 'APROVAR TÍTULO'}
        approvalWarning={!data.customTitle.trim() ? 'Digite ou selecione um título para aprovar.' : undefined}
        onPrev={onPrev}
        onNext={isApproved ? onContinue : undefined}
        onRegenerate={generateTitles}
        onApprove={handleApproveTitle}
      />

      <div className="stage-intro-block">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3>Títulos & Subtítulos de Alto Impacto</h3>
            <p>O título é o elemento número 1 na decisão de clique do leitor na Amazon. Digite seu título ideal ou deixe a IA gerar 10 fórmulas comprovadas de best-seller.</p>
          </div>
          <button
            type="button"
            className="btn-create-sub"
            onClick={() => {
              const filled = BoxSuggestionService.fillEntireStage('book-titles', project);
              onUpdateProject(filled);
            }}
          >
            <Sparkles size={14} /> ⚡ Preenchimento Automático com IA
          </button>
        </div>
      </div>

      {/* Título Principal */}
      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label">Título Principal do Livro</label>
          <button
            type="button"
            className="btn-box-suggest"
            onClick={() => {
              const next = BoxSuggestionService.getNextSuggestion('book-titles.mainTitle', project);
              updateData({ customTitle: next });
            }}
            title="Sugerir com IA (clique de novo para outra opção)"
          >
            <Sparkles size={11} /> Sugerir com IA
          </button>
        </div>
        <input
          type="text"
          className="form-input"
          placeholder="Ex: O Código da Clareza"
          value={data.customTitle}
          onChange={(e) => updateData({ customTitle: e.target.value })}
        />
      </div>

      {/* Subtítulo */}
      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label">
            Subtítulo Comercial
            <span className="label-hint">Explique o benefício direto ou o método ensinado na obra.</span>
          </label>
          <button
            type="button"
            className="btn-box-suggest"
            onClick={() => {
              const next = BoxSuggestionService.getNextSuggestion('book-titles.subtitle', project);
              updateData({ customSubtitle: next });
            }}
            title="Sugerir com IA (clique de novo para outra opção)"
          >
            <Sparkles size={11} /> Sugerir com IA
          </button>
        </div>
        <input
          type="text"
          className="form-input"
          placeholder="Ex: Como Eliminar o Ruído Mental e Tomar Decisões Certeiras em um Mundo Caótico"
          value={data.customSubtitle}
          onChange={(e) => updateData({ customSubtitle: e.target.value })}
        />
      </div>

      <div className="divider-or">
        <span>OU ESCOLHA UMA OPÇÃO GERADA POR IA</span>
      </div>

      {/* Gerar Títulos */}
      <div className="stage-action-center">
        <button className="btn-primary-action" onClick={generateTitles} disabled={isGenerating}>
          {isGenerating ? (
            <><span className="spinner" /> Criando 10 opções de títulos best-seller...</>
          ) : (
            <><Sparkles size={16} /> Gerar 10 Sugestões de Títulos com IA</>
          )}
        </button>
      </div>

      {/* Lista de Opções */}
      {data.generatedTitles.length > 0 && (
        <div className="title-options-grid">
          {data.generatedTitles.map((t) => (
            <div
              key={t.id}
              className={`title-option-card ${data.selectedTitleId === t.id ? 'selected' : ''}`}
              onClick={() => selectTitle(t)}
            >
              <div className="title-option-check">
                {data.selectedTitleId === t.id && <Check size={16} />}
              </div>
              <div className="title-option-text">
                <strong>{t.title}</strong>
                {t.subtitle && <span>{t.subtitle}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
