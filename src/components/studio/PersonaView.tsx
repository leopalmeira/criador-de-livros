import React, { useState } from 'react';
import { 
  User, 
  Sparkles, 
  Save, 
  Wand2, 
  RefreshCw,
  Info,
  Target,
  Mic,
  PenTool,
  Brain
} from 'lucide-react';
import { BookProject, StageContent, MemoryCharacter } from '../../types/book-project';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';
import { AiAssistantService } from '../../services/ai-assistant-service';

interface PersonaViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  aiService: AiService;
}

const PERSONA_FIELDS = [
  { key: 'name', label: 'Nome da Persona', placeholder: 'Ex: Dr. Alexandre Mentor', icon: User },
  { key: 'experience', label: 'Experiência/Credenciais', placeholder: 'PhD em Neurociência Comportamental, 20 anos clínica', icon: Brain },
  { key: 'personality', label: 'Personalidade', placeholder: 'Analítico, empático, direto, inspirador', icon: Target },
  { key: 'style', label: 'Estilo de Escrita', placeholder: 'Claro, baseado em evidências, prático', icon: PenTool },
  { key: 'tone', label: 'Tom de Voz', placeholder: 'Autoritativo mas acessível, conversacional', icon: Mic },
  { key: 'voice', label: 'Voz/Vocabulário', placeholder: 'Termos técnicos explicados, analogias do cotidiano', icon: Mic },
  { key: 'positioning', label: 'Posicionamento', placeholder: 'Mentor científico que transforma complexidade em ação', icon: Target },
  { key: 'audience', label: 'Público da Persona', placeholder: 'Profissionais que querem resultados baseados em ciência', icon: User },
  { key: 'characteristics', label: 'Características Marcantes', placeholder: 'Sempre usa framework de 3 passos, cita estudos', icon: Brain },
];

export const PersonaView: React.FC<PersonaViewProps> = ({
  project,
  onUpdateProject,
  aiService
}) => {
  const existingContent = project.stageContents?.find(c => c.stageKey === 'persona');
  const bookMemory = project.bookMemory;
  const [persona, setPersona] = useState<Record<string, any>>(existingContent?.data || {
    name: project.author,
    experience: '',
    personality: '',
    style: '',
    tone: project.kdpConcept?.tone || 'Inspirador e prático',
    voice: '',
    positioning: '',
    audience: project.targetAudience || '',
    characteristics: []
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestingField, setSuggestingField] = useState<string | null>(null);
  const [fieldIterations, setFieldIterations] = useState<Record<string, number>>({});

  const handleSave = () => {
    const updatedMemory = bookMemory ? {
      ...bookMemory,
      characters: [
        ...bookMemory.characters.filter(c => c.role !== 'Author Persona'),
        {
          id: 'author_persona',
          name: persona.name,
          role: 'Author Persona',
          appearance: '',
          personality: persona.personality,
          arc: '',
          notes: `Experiência: ${persona.experience}\nEstilo: ${persona.style}\nTom: ${persona.tone}\nVoz: ${persona.voice}\nPosicionamento: ${persona.positioning}`
        }
      ]
    } : undefined;

    const updatedContent: StageContent = {
      stageKey: 'persona',
      data: persona,
      updatedAt: Date.now(),
      updatedBy: 'user',
      version: (existingContent?.version || 0) + 1
    };
    onUpdateProject({
      ...project,
      bookMemory: updatedMemory,
      stageContents: [...(project.stageContents?.filter(c => c.stageKey !== 'persona') || []), updatedContent],
      stageProgress: project.stageProgress.map(sp => 
        sp.stageKey === 'persona' ? { ...sp, status: 'REVIEW' as const, progress: 100, lastUpdated: Date.now() } : sp
      ),
      stageApprovals: project.stageApprovals.map(sa => 
        sa.stageKey === 'persona' ? { ...sa, status: 'REVIEW' as const, previousStatus: sa.status, approvedAt: undefined, approvedBy: undefined } : sa
      )
    });
  };

  const handleGeneratePersona = async () => {
    if (!project.kdpConcept) return;
    setIsGenerating(true);
    try {
      const pipeline = new KdpBookPipeline(aiService);
      const bible = await pipeline.generateBible(
        project.kdpConcept,
        project.kdpChapters || [],
        project.kdpBookType,
        project.language
      );
      setPersona(prev => ({
        ...prev,
        name: project.author,
        experience: `Especialista em ${project.kdpBookType}`,
        personality: bible.styleGuide?.tone || 'Profissional e acessível',
        style: bible.styleGuide?.artStyle || 'Claro e estruturado',
        tone: project.kdpConcept?.tone || 'Inspirador',
        voice: 'Conversacional com autoridade técnica',
        positioning: bible.styleGuide?.tone || 'Mentor prático',
        audience: project.targetAudience,
        characteristics: ['Baseado em evidências', 'Foco em aplicação prática', 'Linguagem direta']
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
      setPersona(prev => ({ ...prev, [field]: suggestion }));
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
            <User size={22} className="text-primary-accent" />
            <h3 className="text-xl font-bold">Etapa 05 - Author Persona: Persona Editorial do Autor</h3>
          </div>
          <p className="text-xs text-muted">
            Defina a voz, tom, estilo e personalidade do autor. A IA usará esta persona para manter consistência em toda a obra.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary-action" onClick={handleGeneratePersona} disabled={isGenerating || !project.kdpConcept}>
            <Wand2 size={15} className={isGenerating ? 'spin-animate' : ''} />
            {isGenerating ? 'Gerando...' : 'Gerar Persona com IA (via Bible)'}
          </button>
          <button className="btn-primary-glow" onClick={handleSave}>
            <Save size={15} /> Salvar Persona
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {PERSONA_FIELDS.map((field) => (
          <div key={field.key} className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                <field.icon size={14} className="text-primary-accent" />
                {field.label}
                <span className="cursor-help text-slate-400 hover:text-white" title="Usado pela IA para manter voz consistente em todos os capítulos">
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
            {field.key === 'characteristics' ? (
              <textarea
                rows={3}
                className="textarea-standard"
                placeholder={field.placeholder}
                value={persona[field.key]?.join('\n') || ''}
                onChange={(e) => setPersona(prev => ({ ...prev, [field.key]: e.target.value.split('\n').filter(Boolean) }))}
              />
            ) : (
              <input
                type="text"
                className="input-text-standard"
                placeholder={field.placeholder}
                value={persona[field.key] || ''}
                onChange={(e) => setPersona(prev => ({ ...prev, [field.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>

      {/* VOICE SAMPLE PREVIEW */}
      <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle mb-6">
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Mic size={16} className="text-amber-400" />
          Prévia de Voz (como a persona escreveria uma abertura)
        </h4>
        <div className="p-3 bg-slate-800/50 rounded border border-slate-700 text-sm italic text-slate-300">
          {persona.name ? `"Olá, sou ${persona.name}. ${persona.experience ? `Com minha experiência em ${persona.experience}, ` : ''}vou te guiar por uma jornada ${persona.tone?.toLowerCase()} onde ${persona.positioning?.toLowerCase() || 'transformamos conhecimento em ação'}. Meu estilo é ${persona.style?.toLowerCase()} e meu tom, ${persona.tone?.toLowerCase()}."` : 'Preencha os campos acima para ver a prévia da voz da persona.'}
        </div>
      </div>

      {/* INTEGRATION WITH BOOK MEMORY */}
      {bookMemory?.characters?.length && (
        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl">
          <h4 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
            <Brain size={16} /> Integrado à Memória do Livro
          </h4>
          <p className="text-xs text-slate-300">
            Esta persona foi adicionada como <strong>Character</strong> na Book Memory (role: "Author Persona"). 
            A IA consultará esta persona em <strong>todas as etapas</strong> (Write, Cover, Description) para manter consistência de voz.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <span>✓ Usada no Write (Etapa 10) para tom consistente</span>
            <span>✓ Usada no Cover (Etapa 12) para estilo visual</span>
            <span>✓ Usada na Description (Etapa 11) para copy de venda</span>
            <span>✓ Usada no Outline (Etapa 09) para estrutura</span>
          </div>
        </div>
      )}
    </div>
  );
};