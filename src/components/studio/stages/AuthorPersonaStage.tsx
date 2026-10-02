import React, { useState } from 'react';
import { BookProject } from '../../../types/book-project';
import { AuthorPersonaData, getDefaultStageStatuses } from '../../../types/stages';
import { AiService } from '../../../services/ai-service';
import { Sparkles, Save, Check } from 'lucide-react';
import { EditorialControlBar } from '../EditorialControlBar';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  aiService: AiService;
  onContinue?: () => void;
  onPrev?: () => void;
}

export const AuthorPersonaStage: React.FC<Props> = ({ project, onUpdateProject, aiService, onContinue, onPrev }) => {
  const data: AuthorPersonaData = project.stageData?.['author-persona'] || {
    inspirationAuthors: '',
    authorDescription: '',
    writingSample: '',
    generatedPersona: '',
    tone: '',
    mood: '',
    perspective: '',
    pacingStyle: '',
    savedPersonaName: ''
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const updateData = (updates: Partial<AuthorPersonaData>) => {
    const updated = { ...data, ...updates };
    onUpdateProject({
      ...project,
      stageData: { ...(project.stageData || {}), 'author-persona': updated },
      stageStatuses: { ...(project.stageStatuses || {}), 'author-persona': 'IN_PROGRESS' }
    } as BookProject);
  };

  const generatePersona = async () => {
    setIsGenerating(true);
    try {
      // Tenta usar Gemini se disponível
      if (aiService.getProvider() === 'gemini') {
        const { GeminiBookGeneratorService } = await import('../../../services/gemini-book-generator');
        const generator = new GeminiBookGeneratorService(aiService);
        const result = await generator.generateAuthorPersona(project);
        if (result.success && result.data) {
          updateData(result.data);
          return;
        }
      }

      // Fallback: prompt direto
      const prompt = `Crie uma persona de escrita autoral profunda e coesa para um livro.
Autores de inspiração: ${data.inspirationAuthors || 'James Clear, Malcolm Gladwell, Dale Carnegie'}
Descrição do autor: ${data.authorDescription || 'Especialista prático e empático focado em transformação real'}
Amostra de escrita: ${data.writingSample || 'Não informada'}
Gênero da obra: ${project.kdpBookType || 'não-ficção'}
Tópico: ${project.topic || 'desenvolvimento e resultados'}

Gere um perfil autoral minucioso em Português detalhando: tom de voz, ritmo e cadência das frases, abordagem narrativa, escolhas de vocabulário, uso de metáforas e presença de autoridade acolhedora.
Escreva como um parágrafo editorial contínuo e diretivo que a IA utilizará para emular com exatidão a voz do autor em todos os capítulos.`;

      const response = await aiService.generateText(prompt);
      updateData({ generatedPersona: response });
    } catch (err) {
      console.error('Erro ao gerar persona:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const isApproved = project.stageStatuses?.['author-persona'] === 'APROVADO' ||
                     project.editorialStageApprovals?.['author-persona']?.status === 'APROVADO';

  const handleSavePersona = () => {
    updateData({ savedPersonaName: data.savedPersonaName || 'Persona Autoral' });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleApprovePersona = () => {
    if (!data.generatedPersona?.trim()) {
      alert('Gere ou escreva a persona autoral antes de aprovar esta etapa.');
      return;
    }

    onUpdateProject({
      ...project,
      stageStatuses: {
        ...(project.stageStatuses || getDefaultStageStatuses()),
        'author-persona': 'COMPLETED'
      },
      editorialStageApprovals: {
        ...(project.editorialStageApprovals || {}),
        'author-persona': {
          stageId: 'author-persona',
          status: 'APROVADO',
          approvedAt: Date.now(),
          approvedBy: 'user',
          notes: 'Voz e persona editorial aprovadas pelo autor.'
        }
      }
    });
  };

  return (
    <div className="stage-form-container">
      <EditorialControlBar
        stageId="author-persona"
        stageLabel="Voz & Persona do Autor"
        status={isApproved ? 'APROVADO' : data.generatedPersona ? 'AGUARDANDO_APROVACAO' : 'PENDENTE'}
        isApproved={isApproved}
        canApprove={!!data.generatedPersona}
        approveButtonText={isApproved ? '✓ VOZ & PERSONA APROVADA' : 'APROVAR VOZ'}
        approvalWarning={!data.generatedPersona ? 'Gere ou escreva a persona antes de aprovar.' : undefined}
        onPrev={onPrev}
        onNext={isApproved ? onContinue : undefined}
        onRegenerate={generatePersona}
        onApprove={handleApprovePersona}
      />

      <div className="stage-intro-block">
        <h3>Voz Editorial & Persona do Autor</h3>
        <p>Defina a personalidade da escrita do seu livro. A persona calibrada garante consistência de tom, profundidade narrativa e conexão humana genuína ao longo de todos os capítulos.</p>
      </div>

      <div className="form-group">
        <label className="form-label">
          Autores de Inspiração
          <span className="label-hint">Cite autores consagrados cujo estilo de escrita você admira</span>
        </label>
        <input
          type="text"
          className="form-input"
          placeholder="Ex: James Clear, Malcolm Gladwell, Yuval Noah Harari, Brené Brown..."
          value={data.inspirationAuthors}
          onChange={(e) => updateData({ inspirationAuthors: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          Perfil & Biografia Resumida do Autor
          <span className="label-hint">Quem é o narrador? Qual é a sua autoridade e vivência prática?</span>
        </label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Ex: Consultor com mais de 10 anos na área corporativa que desenvolveu uma metodologia prática após atender centenas de equipes sobrecarregadas..."
          value={data.authorDescription}
          onChange={(e) => updateData({ authorDescription: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          Amostra de Texto / Frases Típicas
          <span className="label-optional">(opcional)</span>
          <span className="label-hint">Cole um trecho do seu próprio estilo para a IA calibrar a entonação</span>
        </label>
        <textarea
          className="form-textarea"
          rows={4}
          placeholder="Cole aqui um ou dois parágrafos escritos por você para calibrar o vocabulário e estilo..."
          value={data.writingSample}
          onChange={(e) => updateData({ writingSample: e.target.value })}
        />
      </div>

      <div className="stage-action-center">
        <button className="btn-primary-action" onClick={generatePersona} disabled={isGenerating}>
          {isGenerating ? (
            <><span className="spinner" /> Calibrando voz e persona autoral...</>
          ) : (
            <><Sparkles size={16} /> Gerar Síntese da Persona com IA</>
          )}
        </button>
      </div>

      {data.generatedPersona && (
        <div className="generated-content-block">
          <h4>Voz Editorial Sintetizada</h4>
          <div className="generated-text-preview">
            {data.generatedPersona}
          </div>
          <div className="form-group mt-4">
            <label className="form-label">Salvar Identidade Autoral Como</label>
            <div className="inline-save-row">
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Mentor Prático e Inspirador"
                value={data.savedPersonaName}
                onChange={(e) => updateData({ savedPersonaName: e.target.value })}
              />
              <button className="btn-sm-outline" onClick={handleSavePersona}>
                {savedSuccess ? <><Check size={14} /> Salvo</> : <><Save size={14} /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
