import React, { useState } from 'react';
import { 
  ListOrdered, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Wand2, 
  Save, 
  BookOpen, 
  Edit3, 
  CheckCircle2, 
  Clock,
  Sparkles,
  RefreshCw,
  Info,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { BookProject, IBookChapter } from '../../types/book-project';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';
import { AiAssistantService } from '../../services/ai-assistant-service';
import { PageEngine } from '../../services/page-engine';
import { LocalAiEngine } from '../../services/local-ai-engine';

interface OutlinePlanningViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  onNavigateToEditorChapter: (chapterIndex: number) => void;
  aiService: AiService;
}

export const OutlinePlanningView: React.FC<OutlinePlanningViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToEditorChapter,
  aiService
}) => {
  const [chapters, setChapters] = useState<IBookChapter[]>(project.kdpChapters || []);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [suggestingField, setSuggestingField] = useState<string | null>(null);
  const [chapterIterations, setChapterIterations] = useState<Record<string, number>>({});

  // Estados de Expansão de Capítulo com IA
  const [expandModalChapter, setExpandModalChapter] = useState<IBookChapter | null>(null);
  const [expandMode, setExpandMode] = useState<'examples' | 'theory' | 'dialogues' | 'double_length' | 'custom'>('examples');
  const [expandCustomPrompt, setExpandCustomPrompt] = useState<string>('');
  const [isExpandingChapter, setIsExpandingChapter] = useState<boolean>(false);
  const [expandFeedbackMsg, setExpandFeedbackMsg] = useState<string>('');

  const handleExecuteExpand = async () => {
    if (!expandModalChapter) return;
    setIsExpandingChapter(true);
    setExpandFeedbackMsg('');
    try {
      const concept = project.kdpConcept || {
        title: project.title,
        subtitle: project.subtitle || '',
        hook: project.topic || project.title,
        audience: project.targetAudience || 'Geral',
        readingLevel: 'Intermediário',
        tone: 'Inspirador e prático',
        promise: project.description || project.title,
        differentiator: '',
        shortSynopsis: project.description || '',
        longSynopsis: project.description || '',
        targetWordCount: 25000,
        targetChapterCount: chapters.length,
        targetPages: project.estimatedPages || 160,
        trimSize: project.trimSize || '6x9',
        paperType: project.paperType || 'bw-white',
        comparableTitles: [],
        themes: [project.topic || project.title],
        titleOptions: []
      };

      const bible = project.kdpBible || {
        characters: [],
        locations: [],
        styleGuide: { artStyle: '', palette: [], tone: '' }
      };

      const res = LocalAiEngine.expandChapterProse(
        concept,
        bible,
        expandModalChapter,
        project.kdpBookType || 'self-help',
        expandMode,
        expandCustomPrompt
      );

      const updatedList: IBookChapter[] = chapters.map(c => 
        c.index === expandModalChapter.index 
          ? { ...c, prose: res.prose, wordCount: res.totalWords, status: 'REVISADO' as const }
          : c
      );

      setChapters(updatedList);
      setExpandModalChapter(prev => prev ? { ...prev, prose: res.prose, wordCount: res.totalWords } : null);

      let updatedProject: BookProject = {
        ...project,
        kdpChapters: updatedList
      };
      updatedProject.visualPages = PageEngine.generateVisualPagesFromManuscript(updatedProject);
      updatedProject.actualPages = updatedProject.visualPages.length;
      onUpdateProject(updatedProject);

      setExpandFeedbackMsg(`Capítulo expandido com sucesso! +${res.addedWords} palavras adicionadas (Total: ${res.totalWords}). As páginas visuais foram rediagramadas!`);
    } catch (err: any) {
      setExpandFeedbackMsg(`Erro ao expandir: ${err.message || 'Falha ao processar.'}`);
    } finally {
      setIsExpandingChapter(false);
    }
  };

  const totalWords = chapters.reduce((s, c) => s + (c.wordCount || 0), 0);
  const targetWords = chapters.reduce((s, c) => s + (c.targetWordCount || 2000), 0);

  const handleSave = () => {
    const updated = {
      ...project,
      kdpChapters: chapters,
      outline: chapters.map(c => ({
        id: `ch_${c.index}`,
        order: c.index,
        title: c.title,
        description: c.summary,
        wordCount: c.wordCount,
        status: c.prose && c.prose.trim().length > 100 ? 'PRONTO' : 'PENDENTE'
      }))
    };
    // Sincroniza também as páginas visuais
    updated.visualPages = PageEngine.generateVisualPagesFromManuscript(updated);
    onUpdateProject(updated);
  };

  const handleAddChapter = () => {
    const newIdx = chapters.length + 1;
    const newCh: IBookChapter = {
      index: newIdx,
      title: `Capítulo ${newIdx}: Novo Tópico`,
      summary: 'Resumo dos acontecimentos ou conceitos abordados neste capítulo.',
      targetWordCount: 2200,
      scenes: [],
      status: 'PENDENTE'
    };
    const updated = [...chapters, newCh];
    setChapters(updated);
    onUpdateProject({ ...project, kdpChapters: updated });
  };

  const handleDeleteChapter = (index: number) => {
    if (chapters.length <= 1) return;
    const filtered = chapters.filter(c => c.index !== index).map((c, i) => ({
      ...c,
      index: i + 1
    }));
    setChapters(filtered);
    onUpdateProject({ ...project, kdpChapters: filtered });
  };

  const handleMoveChapter = (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= chapters.length) return;

    const list = [...chapters];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    const renumbered = list.map((c, i) => ({ ...c, index: i + 1 }));
    setChapters(renumbered);
    onUpdateProject({ ...project, kdpChapters: renumbered });
  };

  const handleUpdateChapter = (idx: number, field: keyof IBookChapter, value: any) => {
    const updated = chapters.map((c, i) => i === idx ? { ...c, [field]: value } : c);
    setChapters(updated);
  };

  const handleRegenerateOutline = async () => {
    if (!project.kdpConcept) return;
    setIsGenerating(true);
    try {
      const pipeline = new KdpBookPipeline(aiService);
      const res = await pipeline.generateOutline(
        project.kdpConcept,
        project.kdpBookType,
        project.language
      );
      if (res && Array.isArray(res) && res.length > 0) {
        setChapters(res);
        const updated = {
          ...project,
          kdpChapters: res
        };
        updated.visualPages = PageEngine.generateVisualPagesFromManuscript(updated);
        onUpdateProject(updated);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestChapterField = async (chapterIdx: number, field: 'chapterTitle' | 'chapterSummary') => {
    const key = `${chapterIdx}_${field}`;
    setSuggestingField(key);
    try {
      const assistant = new AiAssistantService(aiService);
      const iteration = chapterIterations[key] || 0;
      const suggestion = await assistant.suggestField(field, project, chapterIdx, iteration);
      
      if (field === 'chapterTitle') {
        handleUpdateChapter(chapterIdx - 1, 'title', suggestion);
      } else {
        handleUpdateChapter(chapterIdx - 1, 'summary', suggestion);
      }
      setChapterIterations(prev => ({ ...prev, [key]: iteration + 1 }));
    } finally {
      setSuggestingField(null);
    }
  };

  return (
    <div className="outline-planning-view-container">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ListOrdered size={22} className="text-primary-accent" />
            <h3 className="text-xl font-bold">Estrutura & Sumário de Capítulos (Outline)</h3>
          </div>
          <p className="text-xs text-muted">
            Total: {chapters.length} capítulos planejados • {totalWords.toLocaleString()} palavras escritas (Meta: {targetWords.toLocaleString()}). Cada capítulo mantém a continuidade narrativa da obra.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            className="btn-primary-action" 
            onClick={handleRegenerateOutline}
            disabled={isGenerating}
            title="Recria toda a grade de capítulos em sequência lógica respeitando as regras do gênero e a Bíblia da obra."
          >
            <Wand2 size={15} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Gerando...' : 'Regerar Sumário com IA'}
          </button>
          <button 
            className="btn-subtle" 
            onClick={handleAddChapter}
            title="Adiciona um novo capítulo ao final do sumário."
          >
            <Plus size={15} /> Adicionar Capítulo
          </button>
          <button 
            className="btn-primary-glow" 
            onClick={handleSave}
            title="Salva a estrutura e sincroniza a diagramação de páginas."
          >
            <Save size={15} /> Salvar Estrutura
          </button>
        </div>
      </div>

      {/* LISTA DE CAPÍTULOS */}
      <div className="space-y-3">
        {chapters.map((ch, idx) => {
          const isDone = Boolean(ch.prose && ch.prose.trim().length > 100);
          const titleKey = `${ch.index}_chapterTitle`;
          const summaryKey = `${ch.index}_chapterSummary`;

          return (
            <div key={idx} className="p-4 bg-surface-elevated rounded-xl border border-border-subtle flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1 mr-4">
                  <div className="flex items-center gap-1.5" title={isDone ? 'Capítulo escrito com conteúdo substancial' : 'Capítulo ainda pendente de redação'}>
                    {isDone ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : (
                      <Clock size={18} className="text-amber-400" />
                    )}
                    <span className="font-bold text-sm text-primary-accent whitespace-nowrap">
                      Cap. {ch.index}
                    </span>
                  </div>

                  <div className="flex-1 flex items-center gap-2">
                    <input 
                      type="text" 
                      className="input-text-standard font-semibold text-sm flex-1"
                      value={ch.title}
                      onChange={(e) => handleUpdateChapter(idx, 'title', e.target.value)}
                      placeholder="Título do Capítulo..."
                      title="Título do capítulo: Deve antecipar a transformação e despertar curiosidade mantendo coerência com os anteriores."
                    />
                    <button
                      type="button"
                      onClick={() => handleSuggestChapterField(ch.index, 'chapterTitle')}
                      disabled={suggestingField === titleKey}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition-colors whitespace-nowrap"
                      title="Gera uma sugestão de título forte para este capítulo mantendo a ordem e continuidade da história. Clique novamente para gerar outra opção."
                    >
                      {suggestingField === titleKey ? (
                        <RefreshCw size={11} className="animate-spin" />
                      ) : (
                        <Sparkles size={11} />
                      )}
                      {suggestingField === titleKey ? 'Gerando...' : chapterIterations[titleKey] ? 'Outro título (↻)' : 'Sugerir Título'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span 
                    className="badge-words text-xs cursor-help"
                    title={`Progresso de palavras: ${ch.wordCount || 0} palavras escritas de uma meta estimada de ${ch.targetWordCount || 2000}.`}
                  >
                    {ch.wordCount || 0} / {ch.targetWordCount || 2000} palavras
                  </span>

                  <button 
                    className="btn-primary-action text-xs py-1 px-2.5"
                    onClick={() => onNavigateToEditorChapter(ch.index)}
                    title="Abre o editor visual focado na redação deste capítulo."
                  >
                    <Edit3 size={13} /> Escrever
                  </button>

                  <button 
                    className="flex items-center gap-1 text-xs py-1 px-2.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition-all font-medium whitespace-nowrap"
                    onClick={() => {
                      setExpandFeedbackMsg('');
                      setExpandModalChapter(ch);
                    }}
                    title="Aumentar o volume e profundidade do texto deste capítulo com IA (+ Exemplos, Casos Reais ou Teoria)"
                  >
                    <Sparkles size={12} className="text-amber-300" />
                    <span>+ Expandir Texto</span>
                  </button>

                  <button 
                    className="btn-icon-subtle"
                    onClick={() => handleMoveChapter(idx, 'up')}
                    disabled={idx === 0}
                    title="Mover capítulo para cima no sumário"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button 
                    className="btn-icon-subtle"
                    onClick={() => handleMoveChapter(idx, 'down')}
                    disabled={idx === chapters.length - 1}
                    title="Mover capítulo para baixo no sumário"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button 
                    className="btn-icon-danger"
                    onClick={() => handleDeleteChapter(ch.index)}
                    title="Excluir este capítulo do projeto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* OBJETIVO E RESUMO DO CAPÍTULO */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border-subtle">
                <div className="form-group-compact">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-muted flex items-center gap-1">
                      Resumo da Cena / Conteúdo:
                      <span title="Resumo essencial para a IA manter a continuidade da narrativa e evitar furos na história." className="cursor-help text-slate-400 hover:text-white">
                        <Info size={12} />
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSuggestChapterField(ch.index, 'chapterSummary')}
                      disabled={suggestingField === summaryKey}
                      className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-medium"
                      title="Sugerir novo resumo de cena coerente com os capítulos anteriores."
                    >
                      {suggestingField === summaryKey ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      {suggestingField === summaryKey ? 'Gerando...' : chapterIterations[summaryKey] ? 'Outro resumo (↻)' : 'Sugerir com IA'}
                    </button>
                  </div>
                  <textarea 
                    rows={2}
                    className="textarea-standard text-xs"
                    value={ch.summary}
                    onChange={(e) => handleUpdateChapter(idx, 'summary', e.target.value)}
                    placeholder="O que é ensinado ou narrado neste capítulo..."
                  />
                </div>

                <div className="form-group-compact">
                  <label className="text-[11px] text-muted flex items-center gap-1 mb-1">
                    Objetivo Dramático / Lição Central:
                    <span title="A revelação, aprendizado ou clímax deste capítulo que move a história adiante." className="cursor-help text-slate-400 hover:text-white">
                      <Info size={12} />
                    </span>
                  </label>
                  <textarea 
                    rows={2}
                    className="textarea-standard text-xs"
                    value={ch.objective || ''}
                    onChange={(e) => handleUpdateChapter(idx, 'objective', e.target.value)}
                    placeholder="Transformação que o leitor ou protagonista atinge..."
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE EXPANSÃO DE CAPÍTULO */}
      {expandModalChapter && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in duration-200">
            {/* CABEÇALHO */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Aumentar Texto do Capítulo com IA</h3>
                  <p className="text-xs text-slate-400">
                    Capítulo {expandModalChapter.index}: <span className="text-white font-medium">{expandModalChapter.title}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setExpandModalChapter(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* STATUS ATUAL DO CAPÍTULO */}
            <div className="mt-4 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Extensão Atual do Capítulo:</span>
                <span className="font-bold text-base text-blue-400">
                  {expandModalChapter.wordCount || 0} palavras
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Meta Estimada:</span>
                <span className="font-semibold text-xs text-slate-300">
                  {expandModalChapter.targetWordCount || 2000} palavras
                </span>
              </div>
            </div>

            {/* SELEÇÃO DO MODO DE EXPANSÃO */}
            <div className="mt-5">
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Selecione o tipo de conteúdo para acrescentar:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div 
                  onClick={() => setExpandMode('examples')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${expandMode === 'examples' ? 'bg-blue-600/20 border-blue-500 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>📚</span> Exemplos & Casos Reais
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Adiciona estudos de caso práticos, dinâmicas de mercado e diagnósticos (+500 palavras).
                  </p>
                </div>

                <div 
                  onClick={() => setExpandMode('theory')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${expandMode === 'theory' ? 'bg-blue-600/20 border-blue-500 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>🔬</span> Aprofundamento Teórico
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Adiciona neurobiologia, fundamentos metodológicos e modelos mentais (+600 palavras).
                  </p>
                </div>

                <div 
                  onClick={() => setExpandMode('dialogues')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${expandMode === 'dialogues' ? 'bg-blue-600/20 border-blue-500 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>🎭</span> Diálogos / Mentoria
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Adiciona perguntas e respostas de mentoria ou cenas de confronto e revelação (+500 palavras).
                  </p>
                </div>

                <div 
                  onClick={() => setExpandMode('double_length')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${expandMode === 'double_length' ? 'bg-blue-600/20 border-blue-500 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>🚀</span> Dobrar Tamanho do Capítulo
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Amplia todas as seções existentes com checklists e desdobramentos (+1.200 palavras).
                  </p>
                </div>
              </div>

              {/* OPÇÃO PERSONALIZADA */}
              <div 
                onClick={() => setExpandMode('custom')}
                className={`mt-2.5 p-3.5 rounded-xl border cursor-pointer transition-all ${expandMode === 'custom' ? 'bg-blue-600/20 border-blue-500 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}
              >
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>✍️</span> Instrução Editorial Específica
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Escreva exatamente o que deseja que a IA acrescente neste capítulo.
                </p>
                {expandMode === 'custom' && (
                  <textarea
                    rows={3}
                    className="w-full mt-3 p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Acrescentar uma análise detalhada sobre os efeitos a longo prazo..."
                    value={expandCustomPrompt}
                    onChange={(e) => setExpandCustomPrompt(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* MENSAGEM DE FEEDBACK */}
            {expandFeedbackMsg && (
              <div className={`mt-4 p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${expandFeedbackMsg.startsWith('Capítulo') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}`}>
                {expandFeedbackMsg.startsWith('Capítulo') ? <Check size={16} className="text-emerald-400 shrink-0" /> : <AlertCircle size={16} className="text-rose-400 shrink-0" />}
                <span>{expandFeedbackMsg}</span>
              </div>
            )}

            {/* BOTÕES */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setExpandModalChapter(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleExecuteExpand}
                disabled={isExpandingChapter}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isExpandingChapter ? (
                  <>
                    <RefreshCw size={14} className="spin-animate" />
                    <span>Ampliando Texto do Capítulo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>⚡ Aplicar Ampliação ao Capítulo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
