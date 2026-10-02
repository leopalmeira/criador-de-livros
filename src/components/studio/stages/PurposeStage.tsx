import React, { useState } from 'react';
import { BookProject } from '../../../types/book-project';
import { PurposeData } from '../../../types/stages';
import { AiService } from '../../../services/ai-service';
import { Sparkles, Tag, Plus } from 'lucide-react';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  aiService: AiService;
}

const SUGGESTED_TAGS = [
  'Estratégias Práticas', 'Transformação de Hábitos', 'Guia Passo a Passo',
  'Linguagem Descomplicada', 'Rotina Sem Estresse', 'Estudos de Caso Reais',
  'Para Iniciantes', 'Técnicas Avançadas', 'Resultados Rápidos',
  'Baseado em Evidências', 'Histórias Inspiradoras', 'Checklists Acionáveis',
  'Alta Densidade de Valor', 'Metodologia Própria', 'Clareza & Foco'
];

export const PurposeStage: React.FC<Props> = ({ project, onUpdateProject, aiService }) => {
  const data: PurposeData = project.stageData?.purpose || {
    focusTags: [],
    customTags: [],
    generatedProposal: '',
    uniqueSellingPoint: '',
    competitiveLandscape: '',
    keySellingPoints: [],
    proposedAudience: '',
    proposedTone: ''
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  const updateData = (updates: Partial<PurposeData>) => {
    const updated = { ...data, ...updates };
    onUpdateProject({
      ...project,
      stageData: { ...(project.stageData || {}), purpose: updated },
      stageStatuses: { ...(project.stageStatuses || {}), purpose: 'IN_PROGRESS' }
    } as BookProject);
  };

  const toggleTag = (tag: string) => {
    const tags = data.focusTags.includes(tag)
      ? data.focusTags.filter(t => t !== tag)
      : [...data.focusTags, tag];
    updateData({ focusTags: tags });
  };

  const addCustomTag = () => {
    if (!customTagInput.trim()) return;
    updateData({ customTags: [...data.customTags, customTagInput.trim()] });
    setCustomTagInput('');
  };

  const generateProposal = async () => {
    setIsGenerating(true);
    try {
      // Tenta usar Gemini se disponível
      if (aiService.getProvider() === 'gemini') {
        const { GeminiBookGeneratorService } = await import('../../../services/gemini-book-generator');
        const generator = new GeminiBookGeneratorService(aiService);
        const result = await generator.generatePurpose(project);
        if (result.success && result.data) {
          updateData(result.data);
          return;
        }
      }

      // Fallback: prompt direto
      const research = project.stageData?.research;
      const analytics = project.stageData?.analytics;
      const selectedTags = [...data.focusTags, ...data.customTags];

      const prompt = `Gere uma Proposta Editorial e Posicionamento de Mercado completa em Português para o livro:
Título: "${project.title || 'Sem título'}"
Tópico: "${research?.topic || project.topic || ''}"
Gênero: ${research?.genre || project.kdpBookType || ''}
Posicionamento do Autor: "${research?.stance || ''}"
Diferenciais: "${research?.standout || ''}"
Áreas de foco / Pilares: ${selectedTags.join(', ')}
Referências de mercado: ${analytics?.marketReferences?.map((r: any) => r.title).join(', ') || 'Best-sellers da categoria'}

Estruture a proposta com clareza nos seguintes blocos:
1. Proposta Única de Valor (USP - Unique Selling Point) - Por que este livro precisa existir agora.
2. Paisagem Competitiva - O que este livro oferece que os concorrentes deixam a desejar.
3. Principais Pontos de Venda (5 a 7 tópicos bala de transformação para o leitor).
4. Perfil do Leitor Ideal (Dores, ambições e momento de vida).
5. Tom e Promessa Editorial Central.

Retorne em formato legível, profissional e inspirador.`;

      const response = await aiService.generateText(prompt);
      updateData({ generatedProposal: response });
    } catch (err) {
      console.error('Erro ao gerar proposta editorial:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="stage-form-container">
      <div className="stage-intro-block">
        <h3>Proposta Editorial & Pilares de Valor</h3>
        <p>Selecione as áreas de ênfase da sua obra e gere uma proposta de alto nível. Este documento servirá como bússola para garantir que cada capítulo cumpra a promessa de transformação do livro.</p>
      </div>

      {/* Tags de Foco */}
      <div className="form-group">
        <label className="form-label">
          <Tag size={14} /> Pilares de Foco e Ênfase
          <span className="label-hint">Clique para selecionar os atributos principais que o livro deve valorizar</span>
        </label>
        <div className="tag-grid">
          {SUGGESTED_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              className={`tag-chip ${data.focusTags.includes(tag) ? 'selected' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="add-tag-row">
          <input
            type="text"
            className="form-input form-input-sm"
            placeholder="Adicionar pilar ou tema personalizado..."
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
          />
          <button className="btn-sm-outline" onClick={addCustomTag}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
        {data.customTags.length > 0 && (
          <div className="tag-grid mt-2">
            {data.customTags.map(tag => (
              <span key={tag} className="tag-chip selected">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="stage-action-center">
        <button className="btn-primary-action" onClick={generateProposal} disabled={isGenerating}>
          {isGenerating ? (
            <><span className="spinner" /> Sintetizando proposta editorial com IA...</>
          ) : (
            <><Sparkles size={16} /> Gerar Proposta do Livro com Foco</>
          )}
        </button>
      </div>

      {data.generatedProposal && (
        <div className="generated-content-block">
          <h4>Proposta Editorial & Diferencial Competitivo</h4>
          <div className="generated-text-preview whitespace-pre-wrap">
            {data.generatedProposal}
          </div>
        </div>
      )}
    </div>
  );
};
