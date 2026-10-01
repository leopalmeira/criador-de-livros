import React, { useState } from 'react';
import { 
  Target, 
  Sparkles, 
  Save, 
  Wand2, 
  RefreshCw,
  Info,
  Lightbulb,
  Flag,
  Heart,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { BookProject, StageContent, IBookConcept } from '../../types/book-project';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';
import { AiAssistantService } from '../../services/ai-assistant-service';

interface PurposeViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  aiService: AiService;
}

const PURPOSE_FIELDS = [
  { key: 'objective', label: 'Objetivo Central', placeholder: 'O que o livro deve realizar para o leitor?', icon: Target },
  { key: 'promise', label: 'Promessa de Transformação', placeholder: 'Ao terminar, o leitor será capaz de...', icon: Flag },
  { key: 'problem', label: 'Problema que Resolve', placeholder: 'Qual dor, frustração ou gap o livro endereça?', icon: Heart },
  { key: 'transformation', label: 'Transformação Entregue', placeholder: 'De onde o leitor sai para onde chega?', icon: RotateCcw },
  { key: 'expectedResult', label: 'Resultado Esperado', placeholder: 'Resultado tangível/mensurável após a leitura', icon: Flag },
  { key: 'audience', label: 'Público Beneficiado', placeholder: 'Quem especificamente se beneficia?', icon: Heart },
  { key: 'valueProposition', label: 'Proposta de Valor Única', placeholder: 'Por que este livro e não outro?', icon: Lightbulb },
];

export const PurposeView: React.FC<PurposeViewProps> = ({
  project,
  onUpdateProject,
  aiService
}) => {
  const existingContent = project.stageContents?.find(c => c.stageKey === 'purpose');
  const concept = project.kdpConcept;
  const [purpose, setPurpose] = useState<Record<string, any>>(existingContent?.data || {
    objective: concept?.promise || '',
    promise: concept?.promise || '',
    problem: '',
    transformation: concept?.promise || '',
    expectedResult: '',
    audience: project.targetAudience || '',
    valueProposition: concept?.differentiator || ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestingField, setSuggestingField] = useState<string | null>(null);
  const [fieldIterations, setFieldIterations] = useState<Record<string, number>>({});

  const handleSave = () => {
    const updatedContent: StageContent = {
      stageKey: 'purpose',
      data: purpose,
      updatedAt: Date.now(),
      updatedBy: 'user',
      version: (existingContent?.version || 0) + 1
    };
    onUpdateProject({
      ...project,
      stageContents: [...(project.stageContents?.filter(c => c.stageKey !== 'purpose') || []), updatedContent],
      stageProgress: project.stageProgress.map(sp => 
        sp.stageKey === 'purpose' ? { ...sp, status: 'REVIEW' as const, progress: 100, lastUpdated: Date.now() } : sp
      ),
      stageApprovals: project.stageApprovals.map(sa => 
        sa.stageKey === 'purpose' ? { ...sa, status: 'REVIEW' as const, previousStatus: sa.status, approvedAt: undefined, approvedBy: undefined } : sa
      )
    });
  };

  const handleGeneratePurpose = async () => {
    if (!concept) return;
    setIsGenerating(true);
    try {
      setPurpose(prev => ({
        ...prev,
        objective: concept.promise,
        promise: concept.promise,
        problem: concept.promise?.includes('procrastinação') ? 'Procrastinação crônica e falta de consistência' : 'Falta de sistema para resultados consistentes',
        transformation: `De alguém que ${concept.promise?.includes('procrastinação') ? 'procrastina' : 'tenta sem sistema'} para alguém que executa com consistência`,
        expectedResult: 'Sistema de hábitos funcionando em 30 dias',
        audience: project.targetAudience,
        valueProposition: concept.differentiator
      }));
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
      setPurpose(prev => ({ ...prev, [field]: suggestion }));
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
            <Target size={22} className="text-primary-accent" />
            <h3 className="text-xl font-bold">Etapa 06 - Purpose: Propósito & Promessa</h3>
          </div>
          <p className="text-xs text-muted">
            Defina a promessa central, o problema resolvido e a transformação entregue. Estes dados alimentam Título, Outline, Write, Cover e Description.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary-action" onClick={handleGeneratePurpose} disabled={isGenerating || !concept}>
            <Wand2 size={15} className={isGenerating ? 'spin-animate' : ''} />
            {isGenerating ? 'Gerando...' : 'Derivar do Conceito (IA)'}
          </button>
          <button className="btn-primary-glow" onClick={handleSave}>
            <Save size={15} /> Salvar Propósito
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {PURPOSE_FIELDS.map((field) => (
          <div key={field.key} className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                <field.icon size={14} className="text-primary-accent" />
                {field.label}
                <span className="cursor-help text-slate-400 hover:text-white" title="Campo crítico: usado em Título, Outline, Write, Cover, Description">
                  <Info size={13} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleSuggestField(field.key)}
                disabled={suggestingField === field.key}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md"
              >
                {suggestingField === field.key ? <RefreshCw size={11} className="spin-animate" /> : <Sparkles size={11} />}
                {suggestingField === field.key ? 'Gerando...' : fieldIterations[field.key] ? 'Outra (↻)' : 'Sugerir IA'}
              </button>
            </div>
            <textarea
              rows={3}
              className="textarea-standard"
              placeholder={field.placeholder}
              value={purpose[field.key] || ''}
              onChange={(e) => setPurpose(prev => ({ ...prev, [field.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {/* PURPOSE CANVAS VISUALIZATION */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl mb-6">
        <h4 className="font-bold text-amber-400 mb-3 flex items-center gap-2">
          <Flag size={16} /> Canvas do Propósito (Visualização Rápida)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-slate-800/50 rounded border-l-4 border-amber-500">
            <div className="text-xs text-amber-400 uppercase tracking-wider mb-1">PROBLEMA</div>
            <div className="text-sm">{purpose.problem || 'Não definido'}</div>
          </div>
          <div className="p-3 bg-slate-800/50 rounded border-l-4 border-orange-500">
            <div className="text-xs text-orange-400 uppercase tracking-wider mb-1">PROMESSA</div>
            <div className="text-sm">{purpose.promise || 'Não definida'}</div>
          </div>
          <div className="p-3 bg-slate-800/50 rounded border-l-4 border-emerald-500">
            <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1">TRANSFORMAÇÃO</div>
            <div className="text-sm">{purpose.transformation || 'Não definida'}</div>
          </div>
        </div>
        <div className="mt-3 p-3 bg-slate-800/50 rounded border-l-4 border-blue-500">
          <div className="text-xs text-blue-400 uppercase tracking-wider mb-1">PROPOSTA DE VALOR</div>
          <div className="text-sm">{purpose.valueProposition || 'Não definida'}</div>
        </div>
      </div>

      {/* IMPACT MAP */}
      <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle">
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
          <ArrowRight size={16} className="text-blue-400" />
          Mapa de Impacto: Como o Propósito Alimenta as Etapas
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">03</span>
            <span><strong>Títulos:</strong> Gancho e subtítulo derivados da Promessa ({purpose.promise?.slice(0, 40)}...)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">09</span>
            <span><strong>Outline:</strong> Capítulos estruturados para entregar a Transformação ({purpose.transformation?.slice(0, 40)}...)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[10px] font-bold">10</span>
            <span><strong>Write:</strong> Cada capítulo avança em direção ao Resultado Esperado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">12</span>
            <span><strong>Cover:</strong> Visual comunica a Proposta de Valor ({purpose.valueProposition?.slice(0, 40)}...)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[10px] font-bold">11</span>
            <span><strong>Description:</strong> Keywords e copy baseados no Problema + Promessa</span>
          </div>
        </div>
      </div>
    </div>
  );
};