import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Save, 
  Wand2, 
  Target, 
  BookOpen, 
  Lightbulb,
  RefreshCw,
  Info,
  Globe,
  Users,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { BookProject, StageContent } from '../../types/book-project';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';
import { AiAssistantService } from '../../services/ai-assistant-service';

interface ResearchViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  aiService: AiService;
}

const RESEARCH_FIELDS = [
  { key: 'topic', label: 'Tema Central', placeholder: 'Ex: Disciplina e alta performance', icon: BookOpen },
  { key: 'niche', label: 'Nicho de Mercado', placeholder: 'Ex: Desenvolvimento pessoal / Hábitos', icon: Target },
  { key: 'audience', label: 'Público-Alvo Detalhado', placeholder: 'Ex: Profissionais 25-40 anos que buscam produtividade', icon: Users },
  { key: 'language', label: 'Idioma', placeholder: 'Português (Brasil)', icon: Globe },
  { key: 'country', label: 'País/Mercado Principal', placeholder: 'Brasil', icon: Globe },
  { key: 'genre', label: 'Gênero/Categoria', placeholder: 'Autoajuda / Não-ficção', icon: BookOpen },
  { key: 'objective', label: 'Objetivo da Obra', placeholder: 'Ensinar sistema de hábitos sustentáveis', icon: Target },
  { key: 'competition', label: 'Análise de Concorrência', placeholder: 'Principais concorrentes e posicionamento', icon: TrendingUp },
  { key: 'references', label: 'Referências/Bibliografia', placeholder: 'Livros, artigos, estudos citados', icon: BookOpen },
  { key: 'trends', label: 'Tendências de Mercado', placeholder: 'O que está em alta no nicho', icon: TrendingUp },
  { key: 'opportunities', label: 'Oportunidades Identificadas', placeholder: 'Gaps de mercado não atendidos', icon: Lightbulb },
  { key: 'risks', label: 'Riscos/Desafios', placeholder: 'Barreiras de entrada, saturação', icon: AlertTriangle },
  { key: 'differentiators', label: 'Diferenciais Competitivos', placeholder: 'Por que este livro é único', icon: Sparkles },
  { key: 'keywords', label: 'Palavras-chave de Pesquisa', placeholder: 'Termos que leitores buscam', icon: Search },
  { key: 'questions', label: 'Perguntas Relevantes', placeholder: 'Dúvidas que o livro deve responder', icon: Lightbulb },
  { key: 'hypotheses', label: 'Hipóteses Editoriais', placeholder: 'Suposições a validar durante produção', icon: Target },
];

export const ResearchView: React.FC<ResearchViewProps> = ({
  project,
  onUpdateProject,
  aiService
}) => {
  const existingContent = project.stageContents?.find(c => c.stageKey === 'research');
  const [research, setResearch] = useState<Record<string, any>>(existingContent?.data || {
    topic: project.topic || project.kdpConcept?.title || '',
    niche: '',
    audience: project.targetAudience || '',
    language: project.language || 'Português (Brasil)',
    country: 'Brasil',
    genre: project.kdpBookType,
    objective: project.description || '',
    competition: '',
    references: [],
    trends: [],
    opportunities: [],
    risks: [],
    differentiators: [],
    keywords: [],
    questions: [],
    hypotheses: []
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestingField, setSuggestingField] = useState<string | null>(null);
  const [fieldIterations, setFieldIterations] = useState<Record<string, number>>({});

  const handleSave = () => {
    const updatedContent: StageContent = {
      stageKey: 'research',
      data: research,
      updatedAt: Date.now(),
      updatedBy: 'user',
      version: (existingContent?.version || 0) + 1
    };
    onUpdateProject({
      ...project,
      topic: research.topic,
      stageContents: [...(project.stageContents?.filter(c => c.stageKey !== 'research') || []), updatedContent],
      stageProgress: project.stageProgress.map(sp => 
        sp.stageKey === 'research' ? { ...sp, status: 'REVIEW' as const, progress: 100, lastUpdated: Date.now() } : sp
      ),
      stageApprovals: project.stageApprovals.map(sa => 
        sa.stageKey === 'research' ? { ...sa, status: 'REVIEW' as const, previousStatus: sa.status, approvedAt: undefined, approvedBy: undefined } : sa
      )
    });
  };

  const handleRegenerateResearch = async () => {
    if (!research.topic) return;
    setIsGenerating(true);
    try {
      const pipeline = new KdpBookPipeline(aiService);
      const analysis = await pipeline.analyzeIdea(research.topic, research.language);
      if (analysis) {
        setResearch(prev => ({
          ...prev,
          niche: analysis.niche,
          audience: analysis.targetAudience,
          genre: analysis.recommendedBookType,
          language: research.language,
          country: 'Brasil'
        }));
        onUpdateProject({
          ...project,
          kdpBookType: analysis.recommendedBookType,
          trimSize: analysis.recommendedTrim,
          estimatedPages: analysis.recommendedPages,
          targetAudience: analysis.targetAudience
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestField = async (field: string) => {
    setSuggestingField(field);
    try {
      const assistant = new AiAssistantService(aiService);
      const iteration = fieldIterations[field] || 0;
      const suggestion = await assistant.suggestField(field as any, project, undefined, iteration);
      setResearch(prev => ({ ...prev, [field]: suggestion }));
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
            <Search size={22} className="text-primary-accent" />
            <h3 className="text-xl font-bold">Etapa 01 - Research: Pesquisa Estruturada</h3>
          </div>
          <p className="text-xs text-muted">
            Organize a pesquisa de mercado, público, concorrência e referências. A IA pode analisar seu tema e preencher automaticamente.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary-action" onClick={handleRegenerateResearch} disabled={isGenerating || !research.topic}>
            <Wand2 size={15} className={isGenerating ? 'spin-animate' : ''} />
            {isGenerating ? 'Analisando...' : 'Analisar Tema com IA'}
          </button>
          <button className="btn-primary-glow" onClick={handleSave}>
            <Save size={15} /> Salvar Research
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {RESEARCH_FIELDS.map((field) => (
          <div key={field.key} className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                <field.icon size={14} className="text-primary-accent" />
                {field.label}
                <span className="cursor-help text-slate-400 hover:text-white" title="Campo obrigatório para contextualizar a IA nas próximas etapas">
                  <Info size={13} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleSuggestField(field.key)}
                disabled={suggestingField === field.key || !research.topic}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition-colors"
                title={`Gerar sugestão de ${field.label.toLowerCase()} com IA baseada no tema`}
              >
                {suggestingField === field.key ? (
                  <RefreshCw size={11} className="spin-animate" />
                ) : (
                  <Sparkles size={11} />
                )}
                {suggestingField === field.key ? 'Gerando...' : fieldIterations[field.key] ? 'Outra sugestão (↻)' : 'Sugerir com IA'}
              </button>
            </div>
            {Array.isArray(research[field.key]) ? (
              <textarea
                rows={3}
                className="textarea-standard"
                placeholder={field.placeholder}
                value={research[field.key]?.join('\n') || ''}
                onChange={(e) => setResearch(prev => ({ ...prev, [field.key]: e.target.value.split('\n').filter(Boolean) }))}
              />
            ) : (
              <input
                type="text"
                className="input-text-standard"
                placeholder={field.placeholder}
                value={research[field.key] || ''}
                onChange={(e) => setResearch(prev => ({ ...prev, [field.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>

      {/* AI INSIGHTS PANEL */}
      {research.topic && (
        <div className="mt-6 p-4 bg-surface-elevated rounded-xl border border-border-subtle">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            Insights da IA para as Próximas Etapas
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-slate-800/50 rounded">
              <span className="text-amber-300">Títulos sugeridos:</span> Baseado no nicho "{research.niche}" e público "{research.audience}", a IA gerará 3-5 opções na Etapa 03.
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <span className="text-amber-300">Persona do Autor:</span> A IA usará tom "{research.genre}" e diferencial "{research.differentiators?.[0] || 'a definir'}" na Etapa 05.
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <span className="text-amber-300">Propósito:</span> Promessa central derivada do objetivo: "{research.objective}" → Etapa 06.
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <span className="text-amber-300">Analytics:</span> {research.keywords.length} palavras-chave para busca Amazon na Etapa 02.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};