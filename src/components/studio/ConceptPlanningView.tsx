import React, { useState } from 'react';
import { 
  Compass, 
  Sparkles, 
  Save, 
  Check, 
  Wand2, 
  Target, 
  BookOpen, 
  Lightbulb,
  RefreshCw,
  Info
} from 'lucide-react';
import { BookProject, IBookConcept, TitleOption } from '../../types/book-project';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';
import { AiAssistantService } from '../../services/ai-assistant-service';

interface ConceptPlanningViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  aiService: AiService;
}

export const ConceptPlanningView: React.FC<ConceptPlanningViewProps> = ({
  project,
  onUpdateProject,
  aiService
}) => {
  const initialConcept: IBookConcept = project.kdpConcept || {
    title: project.title,
    subtitle: project.subtitle,
    hook: '',
    audience: project.targetAudience || 'Geral',
    tone: 'Inspirador e Prático',
    targetWordCount: 25000,
    targetChapterCount: 12,
    targetPages: project.estimatedPages || 160,
    trimSize: project.trimSize || '6x9',
    paperType: project.paperType || 'bw-white',
    comparableTitles: [],
    themes: [project.kdpBookType],
    shortSynopsis: project.description,
    longSynopsis: project.description,
    promise: `Transformar o leitor através de conhecimentos aplicados em ${project.title}.`,
    differentiator: 'Metodologia direta e prática sem jargões complexos.',
    titleOptions: []
  };

  const [concept, setConcept] = useState<IBookConcept>(initialConcept);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [suggestingField, setSuggestingField] = useState<string | null>(null);
  const [fieldIterations, setFieldIterations] = useState<Record<string, number>>({});
  const [selectedTitleId, setSelectedTitleId] = useState<string>('');

  const handleSave = () => {
    onUpdateProject({
      ...project,
      title: concept.title,
      subtitle: concept.subtitle,
      description: concept.longSynopsis || concept.shortSynopsis,
      kdpConcept: concept
    });
  };

  const handleRegenerateConcept = async () => {
    setIsGenerating(true);
    try {
      const pipeline = new KdpBookPipeline(aiService);
      const generated = await pipeline.generateConcept(
        project.topic || project.title,
        project.kdpBookType,
        project.language,
        project.author,
        project.estimatedPages
      );

      if (generated) {
        setConcept(generated);
        onUpdateProject({
          ...project,
          title: generated.title,
          subtitle: generated.subtitle,
          description: generated.longSynopsis || generated.shortSynopsis,
          kdpConcept: generated
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestField = async (field: 'title' | 'subtitle' | 'hook' | 'promise' | 'differentiator' | 'shortSynopsis' | 'longSynopsis') => {
    setSuggestingField(field);
    try {
      const assistant = new AiAssistantService(aiService);
      const iteration = fieldIterations[field] || 0;
      const suggestion = await assistant.suggestField(field, project, undefined, iteration);
      
      const updated = { ...concept, [field]: suggestion };
      setConcept(updated);
      setFieldIterations(prev => ({ ...prev, [field]: iteration + 1 }));

      if (field === 'title' || field === 'subtitle') {
        onUpdateProject({
          ...project,
          [field]: suggestion,
          kdpConcept: updated
        });
      }
    } finally {
      setSuggestingField(null);
    }
  };

  const handleSelectTitleOption = (opt: TitleOption) => {
    setSelectedTitleId(opt.id);
    const updated = {
      ...concept,
      title: opt.title,
      subtitle: opt.subtitle,
      hook: opt.hook
    };
    setConcept(updated);
    onUpdateProject({
      ...project,
      title: opt.title,
      subtitle: opt.subtitle,
      kdpConcept: updated
    });
  };

  return (
    <div className="concept-planning-view-container">
      {/* HEADER DA VISÃO COM AÇÕES RÁPIDAS */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass size={22} className="text-primary-accent" />
            <h3 className="text-xl font-bold">Planejamento & Conceito Editorial da Obra</h3>
          </div>
          <p className="text-xs text-muted">
            Defina o gancho magnético, a promessa central e o posicionamento da obra no mercado KDP. Passe o mouse sobre os ícones para entender a função de cada item.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            className="btn-primary-action" 
            onClick={handleRegenerateConcept}
            disabled={isGenerating}
            title="Recria toda a estratégia de posicionamento, ganchos e títulos da obra com IA baseando-se no tema original."
          >
            <Wand2 size={15} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Analisando...' : 'Regerar Conceito com IA'}
          </button>
          <button 
            className="btn-primary-glow" 
            onClick={handleSave}
            title="Salva as alterações deste conceito na base de dados do projeto."
          >
            <Save size={15} /> Salvar Conceito
          </button>
        </div>
      </div>

      {/* SELEÇÃO DE TÍTULOS COMERCIAIS (SE DISPONÍVEL) */}
      {concept.titleOptions && concept.titleOptions.length > 0 && (
        <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-400" />
              <h4 className="font-bold text-sm">Opções de Títulos e Ganchos Comerciais Prontos</h4>
            </div>
            <span className="text-[11px] text-muted">Clique em um cartão para aplicar imediatamente</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {concept.titleOptions.map((opt) => (
              <div 
                key={opt.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedTitleId === opt.id ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-border-subtle bg-surface hover:border-slate-600'}`}
                onClick={() => handleSelectTitleOption(opt)}
                title={`Clique para aplicar "${opt.title}" como título principal e gancho da obra.`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm text-white">{opt.title}</span>
                  {selectedTitleId === opt.id && <Check size={14} className="text-blue-400" />}
                </div>
                {opt.subtitle && <p className="text-xs text-muted mb-2">{opt.subtitle}</p>}
                <div className="text-[11px] text-amber-300/90 font-medium mb-1">Gancho: "{opt.hook}"</div>
                <div className="text-[10px] text-slate-400">Ângulo: {opt.commercialAngle}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORMULÁRIO DO CONCEITO EDITORIAL COM BOTÕES DE IA POR CAMPO */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* TÍTULO PRINCIPAL */}
          <div className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                Título Principal da Obra
                <span 
                  title="Título de Alto Impacto para KDP: Deve ser memorável, conter a palavra-chave principal da busca do leitor e despertar curiosidade imediata na Amazon."
                  className="cursor-help text-slate-400 hover:text-white"
                >
                  <Info size={13} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleSuggestField('title')}
                disabled={suggestingField === 'title'}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition-colors"
                title="Gera uma nova variação de título forte mantendo coerência com o tema e a continuidade da história. Clique novamente para ver outra opção."
              >
                {suggestingField === 'title' ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <Sparkles size={11} />
                )}
                {suggestingField === 'title' ? 'Gerando...' : fieldIterations['title'] ? 'Outra sugestão (↻)' : 'Sugerir com IA'}
              </button>
            </div>
            <input 
              type="text" 
              className="input-text-standard"
              value={concept.title}
              placeholder="Ex: A Arte da Disciplina Inabalável"
              onChange={(e) => setConcept({ ...concept, title: e.target.value })}
            />
          </div>

          {/* SUBTÍTULO COMERCIAL */}
          <div className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                Subtítulo Comercial
                <span 
                  title="Subtítulo Comercial KDP: Explica o benefício tangível da leitura, o método ou a transformação que o leitor viverá."
                  className="cursor-help text-slate-400 hover:text-white"
                >
                  <Info size={13} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleSuggestField('subtitle')}
                disabled={suggestingField === 'subtitle'}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition-colors"
                title="Gera um subtítulo comercial magnético focado em benefícios de leitura. Clique novamente para alternar."
              >
                {suggestingField === 'subtitle' ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <Sparkles size={11} />
                )}
                {suggestingField === 'subtitle' ? 'Gerando...' : fieldIterations['subtitle'] ? 'Outra sugestão (↻)' : 'Sugerir com IA'}
              </button>
            </div>
            <input 
              type="text" 
              className="input-text-standard"
              value={concept.subtitle || ''}
              placeholder="Ex: Como estruturar hábitos permanentes e multiplicar sua produtividade sem esforço"
              onChange={(e) => setConcept({ ...concept, subtitle: e.target.value })}
            />
          </div>

          {/* PROMESSA CENTRAL */}
          <div className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                A Promessa Central do Livro (O que o leitor conquista?)
                <span 
                  title="Promessa Central da Obra: O compromisso inegociável do livro com o leitor. Ao terminar as páginas, o leitor deve ser capaz de realizar ou sentir exatamente o que foi prometido aqui."
                  className="cursor-help text-slate-400 hover:text-white"
                >
                  <Info size={13} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleSuggestField('promise')}
                disabled={suggestingField === 'promise'}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition-colors"
                title="Gera uma promessa central de transformação para a obra. Clique novamente para gerar outra opção."
              >
                {suggestingField === 'promise' ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <Sparkles size={11} />
                )}
                {suggestingField === 'promise' ? 'Gerando...' : fieldIterations['promise'] ? 'Outra sugestão (↻)' : 'Sugerir com IA'}
              </button>
            </div>
            <textarea 
              rows={3}
              className="textarea-standard"
              value={concept.promise}
              placeholder="Ex: Ao concluir a leitura, o leitor dominará o passo a passo para construir hábitos automáticos..."
              onChange={(e) => setConcept({ ...concept, promise: e.target.value })}
            />
          </div>

          {/* DIFERENCIAL COMPETITIVO */}
          <div className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                Diferencial Competitivo (Por que este livro é único?)
                <span 
                  title="Posicionamento Único: O que faz seu livro se destacar contra os 10 maiores concorrentes da categoria na Amazon (ex: neurociência prática, estudos de caso brasileiros, linguagem direta sem enrolação)."
                  className="cursor-help text-slate-400 hover:text-white"
                >
                  <Info size={13} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleSuggestField('differentiator')}
                disabled={suggestingField === 'differentiator'}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition-colors"
                title="Gera um posicionamento diferencial competitivo único. Clique de novo para ver outro ângulo."
              >
                {suggestingField === 'differentiator' ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <Sparkles size={11} />
                )}
                {suggestingField === 'differentiator' ? 'Gerando...' : fieldIterations['differentiator'] ? 'Outra sugestão (↻)' : 'Sugerir com IA'}
              </button>
            </div>
            <textarea 
              rows={3}
              className="textarea-standard"
              value={concept.differentiator}
              placeholder="Ex: Focado em engenharia de ambiente e neurobiologia em vez de discursos clichês..."
              onChange={(e) => setConcept({ ...concept, differentiator: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* PÚBLICO-ALVO */}
            <div className="form-group-field">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200 mb-1">
                Público-Alvo Específico
                <span 
                  title="Avatar do Leitor: Faixa etária, profissão, nível de instrução e dor principal que buscam resolver com a leitura."
                  className="cursor-help text-slate-400 hover:text-white"
                >
                  <Info size={13} />
                </span>
              </label>
              <input 
                type="text" 
                className="input-text-standard"
                value={concept.audience}
                placeholder="Ex: Adultos de 25 a 45 anos"
                onChange={(e) => setConcept({ ...concept, audience: e.target.value })}
              />
            </div>

            {/* TOM NARRATIVO */}
            <div className="form-group-field">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200 mb-1">
                Tom Narrativo / Voz
                <span 
                  title="Tom Narrativo: Estilo e personalidade da voz do autor ao longo de todos os capítulos (ex: direto, empático, investigativo, motivador, formal)."
                  className="cursor-help text-slate-400 hover:text-white"
                >
                  <Info size={13} />
                </span>
              </label>
              <input 
                type="text" 
                className="input-text-standard"
                value={concept.tone}
                placeholder="Ex: Direto, empático e prático"
                onChange={(e) => setConcept({ ...concept, tone: e.target.value })}
              />
            </div>
          </div>

          {/* GANCHO DE ABERTURA / HOOK */}
          <div className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                Gancho de Abertura / Pitch Rápido (Hook)
                <span 
                  title="Gancho Magnético: Frase de abertura de altíssimo impacto para prender o olhar do leitor nos primeiros 3 segundos."
                  className="cursor-help text-slate-400 hover:text-white"
                >
                  <Info size={13} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleSuggestField('hook')}
                disabled={suggestingField === 'hook'}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition-colors"
                title="Gera ganchos comerciais provocativos e envolventes mantendo continuidade narrativa. Clique para gerar outros ganchos."
              >
                {suggestingField === 'hook' ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <Sparkles size={11} />
                )}
                {suggestingField === 'hook' ? 'Gerando...' : fieldIterations['hook'] ? 'Outra sugestão (↻)' : 'Sugerir com IA'}
              </button>
            </div>
            <textarea 
              rows={2}
              className="textarea-standard"
              value={concept.hook}
              placeholder="Ex: Você já se perguntou por que a maioria das pessoas desiste antes de 30 dias?"
              onChange={(e) => setConcept({ ...concept, hook: e.target.value })}
            />
          </div>

          {/* SINOPSE EDITORIAL */}
          <div className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                Sinopse Editorial Completa
                <span 
                  title="Sinopse e Descrição Editorial: O texto de venda principal que vai na contracapa e na página do produto na Amazon, convertendo visitantes em compradores."
                  className="cursor-help text-slate-400 hover:text-white"
                >
                  <Info size={13} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleSuggestField('longSynopsis')}
                disabled={suggestingField === 'longSynopsis'}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition-colors"
                title="Gera uma sinopse persuasiva de alta conversão para vendas. Clique novamente para gerar nova versão."
              >
                {suggestingField === 'longSynopsis' ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <Sparkles size={11} />
                )}
                {suggestingField === 'longSynopsis' ? 'Gerando...' : fieldIterations['longSynopsis'] ? 'Outra sugestão (↻)' : 'Sugerir com IA'}
              </button>
            </div>
            <textarea 
              rows={6}
              className="textarea-standard"
              value={concept.longSynopsis}
              placeholder="Ex: Em um mundo repleto de distrações, a verdadeira disciplina..."
              onChange={(e) => setConcept({ ...concept, longSynopsis: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
