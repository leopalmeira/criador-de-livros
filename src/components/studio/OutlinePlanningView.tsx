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
import { GeminiBookGeneratorService } from '../../services/gemini-book-generator';
import { BoxSuggestionService } from '../../services/box-suggestion-service';
import '../../styles/outline-planning.css';

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
    setIsGenerating(true);
    try {
      // 1. Tenta gerar via GeminiBookGeneratorService (IA Gemini com regras anti-plágio)
      const generator = new GeminiBookGeneratorService(aiService);
      const geminiRes = await generator.generateOutline(project);

      if (geminiRes && geminiRes.success && geminiRes.data?.kdpChapters?.length > 0) {
        const newChapters = geminiRes.data.kdpChapters;
        setChapters(newChapters);
        const updated = {
          ...project,
          kdpChapters: newChapters
        };
        updated.visualPages = PageEngine.generateVisualPagesFromManuscript(updated);
        onUpdateProject(updated);
        return;
      }

      // 2. Se project.kdpConcept existir, tenta via pipeline KDP
      if (project.kdpConcept) {
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
          return;
        }
      }

      // 3. Fallback inteligente imediato e garantido
      const filled = BoxSuggestionService.fillEntireStage('outline', project);
      if (filled.kdpChapters && filled.kdpChapters.length > 0) {
        setChapters(filled.kdpChapters);
        filled.visualPages = PageEngine.generateVisualPagesFromManuscript(filled);
        onUpdateProject(filled);
      }
    } catch (err) {
      console.warn('[Outline] Fallback na geração de sumário:', err);
      const filled = BoxSuggestionService.fillEntireStage('outline', project);
      if (filled.kdpChapters && filled.kdpChapters.length > 0) {
        setChapters(filled.kdpChapters);
        filled.visualPages = PageEngine.generateVisualPagesFromManuscript(filled);
        onUpdateProject(filled);
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
    <div className="outline-view-container">
      {/* 1. TOPO: BARRA DE STATUS GLOBAL DO SUMÁRIO */}
      <div className="outline-top-summary-bar">
        <div className="outline-stats-group">
          <div className="outline-stat-item">
            <span className="stat-label">Capítulos Planejados</span>
            <span className="stat-value">{chapters.length} <span>capítulos</span></span>
          </div>
          <div className="outline-stat-item">
            <span className="stat-label">Volume de Palavras</span>
            <span className="stat-value">
              {totalWords.toLocaleString()} <span>/ {targetWords.toLocaleString()} meta</span>
            </span>
          </div>
        </div>

        <div className="outline-top-actions">
          <button 
            className="btn-outline-action secondary" 
            onClick={handleAddChapter}
            title="Adiciona um novo capítulo ao final do sumário."
          >
            <Plus size={14} /> Adicionar Capítulo
          </button>
          <button 
            className="btn-outline-action accent" 
            onClick={handleRegenerateOutline}
            disabled={isGenerating}
            title="Recria toda a grade de capítulos em sequência lógica respeitando as regras do gênero."
          >
            <Wand2 size={14} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Gerando...' : 'Regerar Sumário com IA'}
          </button>
          <button 
            className="btn-outline-action primary" 
            onClick={handleSave}
            title="Salva a estrutura e sincroniza a diagramação de páginas."
          >
            <Save size={14} /> Salvar Estrutura
          </button>
        </div>
      </div>

      {/* 2. LISTA DE CARDS DE CAPÍTULO */}
      <div className="outline-chapters-stack">
        {chapters.map((ch, idx) => {
          const isDone = Boolean(ch.prose && ch.prose.trim().length > 100);
          const titleKey = `${ch.index}_chapterTitle`;
          const summaryKey = `${ch.index}_chapterSummary`;

          return (
            <div 
              key={idx} 
              className={`chapter-planning-card ${isDone ? 'done' : 'pending'}`}
            >
              {/* LINHA 1: TÍTULO DO CAPÍTULO & ORDENAÇÃO */}
              <div className="chapter-header-row">
                <div className="chapter-title-group">
                  <div 
                    className="chapter-index-pill" 
                    title={isDone ? 'Capítulo com texto substancial' : 'Capítulo aguardando redação'}
                  >
                    {isDone ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      <Clock size={14} className="text-amber-400" />
                    )}
                    <span>Cap. {ch.index}</span>
                  </div>

                  <div className="chapter-title-input-wrapper">
                    <input 
                      type="text" 
                      className="chapter-title-input"
                      value={ch.title}
                      onChange={(e) => handleUpdateChapter(idx, 'title', e.target.value)}
                      placeholder="Título do Capítulo..."
                      title="Título do capítulo: Deve antecipar o conflito/aprendizado e despertar curiosidade."
                    />
                    <button
                      type="button"
                      onClick={() => handleSuggestChapterField(ch.index, 'chapterTitle')}
                      disabled={suggestingField === titleKey}
                      className="btn-suggest-title-pill"
                      title="Gera uma sugestão de título coerente com o contexto da história. Clique novamente para alternar."
                    >
                      {suggestingField === titleKey ? (
                        <RefreshCw size={11} className="animate-spin" />
                      ) : (
                        <Sparkles size={11} />
                      )}
                      <span>{suggestingField === titleKey ? 'Gerando...' : chapterIterations[titleKey] ? 'Outro título (↻)' : 'Sugerir Título'}</span>
                    </button>
                  </div>
                </div>

                {/* BOTÕES DE ORDENAÇÃO E EXCLUSÃO */}
                <div className="chapter-order-actions">
                  <button 
                    className="btn-icon-order"
                    onClick={() => handleMoveChapter(idx, 'up')}
                    disabled={idx === 0}
                    title="Mover capítulo para cima"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button 
                    className="btn-icon-order"
                    onClick={() => handleMoveChapter(idx, 'down')}
                    disabled={idx === chapters.length - 1}
                    title="Mover capítulo para baixo"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button 
                    className="btn-icon-order danger"
                    onClick={() => handleDeleteChapter(ch.index)}
                    title="Excluir este capítulo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* LINHA 2: PROGRESSO DE PALAVRAS & AÇÕES DE REDAÇÃO */}
              <div className="chapter-meta-action-bar">
                <div className="chapter-word-counter">
                  <BookOpen size={14} className="text-blue-400" />
                  <span className="counter-pill">{ch.wordCount || 0}</span>
                  <span className="target-pill">/ {ch.targetWordCount || 2000} palavras estimadas</span>
                </div>

                <div className="chapter-cta-group">
                  <button 
                    className="btn-chapter-write"
                    onClick={() => onNavigateToEditorChapter(ch.index)}
                    title="Abre o editor visual de manuscrito focado neste capítulo."
                  >
                    <Edit3 size={13} /> Escrever Capítulo
                  </button>

                  <button 
                    className="btn-chapter-expand"
                    onClick={() => {
                      setExpandFeedbackMsg('');
                      setExpandModalChapter(ch);
                    }}
                    title="Aumentar extensão e profundidade do texto com IA"
                  >
                    <Sparkles size={13} className="text-amber-300" />
                    <span>+ Expandir Texto</span>
                  </button>
                </div>
              </div>

              {/* LINHA 3: RESUMO DA CENA & OBJETIVO DRAMÁTICO (GRID 2 COLUNAS) */}
              <div className="chapter-details-grid">
                <div className="chapter-field-box">
                  <div className="chapter-field-header">
                    <label className="chapter-field-label">
                      Resumo da Cena / Conteúdo:
                      <span title="Guia essencial para a IA manter a continuidade da narrativa." className="cursor-help text-slate-400">
                        <Info size={11} />
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSuggestChapterField(ch.index, 'chapterSummary')}
                      disabled={suggestingField === summaryKey}
                      className="btn-field-ai-suggest"
                      title="Sugerir novo resumo de cena coerente com os capítulos anteriores."
                    >
                      {suggestingField === summaryKey ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      <span>{suggestingField === summaryKey ? 'Gerando...' : chapterIterations[summaryKey] ? 'Outro resumo (↻)' : 'Sugerir com IA'}</span>
                    </button>
                  </div>
                  <textarea 
                    rows={2}
                    className="chapter-field-textarea"
                    value={ch.summary}
                    onChange={(e) => handleUpdateChapter(idx, 'summary', e.target.value)}
                    placeholder="O que é ensinado ou narrado neste capítulo..."
                  />
                </div>

                <div className="chapter-field-box">
                  <div className="chapter-field-header">
                    <label className="chapter-field-label">
                      Objetivo Dramático / Lição Central:
                      <span title="A revelação ou clímax deste capítulo que move a narrativa adiante." className="cursor-help text-slate-400">
                        <Info size={11} />
                      </span>
                    </label>
                  </div>
                  <textarea 
                    rows={2}
                    className="chapter-field-textarea"
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
