import React, { useState } from 'react';
import { 
  Type, 
  Sparkles, 
  Save, 
  Wand2, 
  Check, 
  Lightbulb,
  RefreshCw,
  Info,
  ArrowRight
} from 'lucide-react';
import { BookProject, IBookConcept, TitleOption, StageContent } from '../../types/book-project';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';
import { AiAssistantService } from '../../services/ai-assistant-service';

interface TitlesViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  aiService: AiService;
}

export const TitlesView: React.FC<TitlesViewProps> = ({
  project,
  onUpdateProject,
  aiService
}) => {
  const existingContent = project.stageContents?.find(c => c.stageKey === 'titles');
  const concept = project.kdpConcept;
  const [titles, setTitles] = useState<TitleOption[]>(existingContent?.data?.titleOptions || concept?.titleOptions || []);
  const [selectedTitleId, setSelectedTitleId] = useState(existingContent?.data?.selectedTitleId || titles[0]?.id || '');
  const [customTitle, setCustomTitle] = useState(project.title || '');
  const [customSubtitle, setCustomSubtitle] = useState(project.subtitle || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestingField, setSuggestingField] = useState<string | null>(null);
  const [fieldIterations, setFieldIterations] = useState<Record<string, number>>({});

  const handleSave = () => {
    const selected = titles.find(t => t.id === selectedTitleId);
    const finalTitle = selected?.title || customTitle;
    const finalSubtitle = selected?.subtitle || customSubtitle;
    
    const updatedContent: StageContent = {
      stageKey: 'titles',
      data: { 
        titleOptions: titles,
        selectedTitleId,
        customTitle: finalTitle,
        customSubtitle: finalSubtitle
      },
      updatedAt: Date.now(),
      updatedBy: 'user',
      version: (existingContent?.version || 0) + 1
    };
    onUpdateProject({
      ...project,
      title: finalTitle,
      subtitle: finalSubtitle,
      kdpConcept: concept ? { ...concept, title: finalTitle, subtitle: finalSubtitle } : undefined,
      stageContents: [...(project.stageContents?.filter(c => c.stageKey !== 'titles') || []), updatedContent],
      stageProgress: project.stageProgress.map(sp => 
        sp.stageKey === 'titles' ? { ...sp, status: 'REVIEW' as const, progress: 100, lastUpdated: Date.now() } : sp
      ),
      stageApprovals: project.stageApprovals.map(sa => 
        sa.stageKey === 'titles' ? { ...sa, status: 'REVIEW' as const, previousStatus: sa.status, approvedAt: undefined, approvedBy: undefined } : sa
      )
    });
  };

  const handleRegenerateTitles = async () => {
    if (!project.kdpConcept) return;
    setIsGenerating(true);
    try {
      const pipeline = new KdpBookPipeline(aiService);
      const newConcept = await pipeline.generateConcept(
        project.topic || project.title,
        project.kdpBookType,
        project.language,
        project.author,
        project.estimatedPages
      );
      if (newConcept?.titleOptions) {
        setTitles(newConcept.titleOptions);
        setSelectedTitleId(newConcept.titleOptions[0]?.id || '');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectTitle = (title: TitleOption) => {
    setSelectedTitleId(title.id);
  };

  const handleSuggestField = async (field: 'title' | 'subtitle') => {
    setSuggestingField(field);
    try {
      const assistant = new AiAssistantService(aiService);
      const iteration = fieldIterations[field] || 0;
      const suggestion = await assistant.suggestField(field, project, undefined, iteration);
      if (field === 'title') setCustomTitle(suggestion);
      else setCustomSubtitle(suggestion);
      setFieldIterations(prev => ({ ...prev, [field]: iteration + 1 }));
    } finally {
      setSuggestingField(null);
    }
  };

  return (
    <div className="stage-page-layout">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Type size={22} className="text-primary-accent" />
            <h3 className="text-xl font-bold">Etapa 03 - Book Titles: Títulos Comerciais</h3>
          </div>
          <p className="text-xs text-muted">
            Gere, compare e aprove o título principal e subtítulo. O título aprovado não deve ser alterado por outras etapas.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary-action" onClick={handleRegenerateTitles} disabled={isGenerating || !project.kdpConcept}>
            <Wand2 size={15} className={isGenerating ? 'spin-animate' : ''} />
            {isGenerating ? 'Gerando...' : 'Regerar Títulos com IA'}
          </button>
          <button className="btn-primary-glow" onClick={handleSave}>
            <Save size={15} /> Salvar & Aprovar Título
          </button>
        </div>
      </div>

      {/* TITLE OPTIONS CARDS */}
      {titles.length > 0 && (
        <div className="mb-6 p-4 bg-surface-elevated rounded-xl border border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-400" />
              <h4 className="font-bold text-sm">Opções de Títulos Geradas pela IA</h4>
            </div>
            <span className="text-[11px] text-muted">Clique para selecionar • Título aprovado será usado em todas as etapas seguintes</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {titles.map((opt) => (
              <div 
                key={opt.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedTitleId === opt.id ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-border-subtle bg-surface hover:border-slate-600'}`}
                onClick={() => handleSelectTitle(opt)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-sm text-white">{opt.title}</span>
                  {selectedTitleId === opt.id && <Check size={16} className="text-blue-400" />}
                </div>
                {opt.subtitle && <p className="text-xs text-muted mb-2">{opt.subtitle}</p>}
                <div className="text-[11px] text-amber-300/90 font-medium mb-1">Gancho: "{opt.hook}"</div>
                <div className="text-[10px] text-slate-400">Ângulo: {opt.commercialAngle}</div>
                <div className="text-[10px] text-slate-400">Atratividade: {opt.targetAppeal}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CUSTOM TITLE INPUT */}
      <div className="mb-6 p-4 bg-surface-elevated rounded-xl border border-border-subtle">
        <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
          <Type size={16} /> Título Personalizado (sobrescreve seleção acima)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                Título Principal
                <span className="cursor-help text-slate-400 hover:text-white" title="Título de alto impacto para KDP: memorável, com palavra-chave principal">
                  <Info size={13} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleSuggestField('title')}
                disabled={suggestingField === 'title'}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md"
              >
                {suggestingField === 'title' ? <RefreshCw size={11} className="spin-animate" /> : <Sparkles size={11} />}
                {suggestingField === 'title' ? 'Gerando...' : fieldIterations['title'] ? 'Outra (↻)' : 'Sugerir IA'}
              </button>
            </div>
            <input
              type="text"
              className="input-text-standard"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Ex: A Arquitetura da Disciplina"
            />
          </div>
          <div className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                Subtítulo Comercial
                <span className="cursor-help text-slate-400 hover:text-white" title="Explica benefício tangível e transformação do leitor">
                  <Info size={13} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleSuggestField('subtitle')}
                disabled={suggestingField === 'subtitle'}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md"
              >
                {suggestingField === 'subtitle' ? <RefreshCw size={11} className="spin-animate" /> : <Sparkles size={11} />}
                {suggestingField === 'subtitle' ? 'Gerando...' : fieldIterations['subtitle'] ? 'Outra (↻)' : 'Sugerir IA'}
              </button>
            </div>
            <input
              type="text"
              className="input-text-standard"
              value={customSubtitle}
              onChange={(e) => setCustomSubtitle(e.target.value)}
              placeholder="Ex: Como construir hábitos inabaláveis e multiplicar resultados"
            />
          </div>
        </div>
      </div>

      {/* CONTEXT PREVIEW */}
      <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl">
        <h4 className="font-bold text-blue-400 mb-3">Como o Título Alimenta as Próximas Etapas</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2 bg-slate-800/50 rounded">
            <span className="text-amber-300">Outline (Etapa 09):</span> Capítulos derivados da promessa do título
          </div>
          <div className="p-2 bg-slate-800/50 rounded">
            <span className="text-amber-300">Write (Etapa 10):</span> Voz e tom alinhados ao ângulo comercial
          </div>
          <div className="p-2 bg-slate-800/50 rounded">
            <span className="text-amber-300">Cover (Etapa 12):</span> Design da capa baseado no título/subtítulo
          </div>
          <div className="p-2 bg-slate-800/50 rounded">
            <span className="text-amber-300">Description (Etapa 11):</span> Keywords e SEO derivados do título
          </div>
        </div>
      </div>
    </div>
  );
};