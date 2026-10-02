import React from 'react';
import { Sparkles, Wand2, RefreshCw } from 'lucide-react';
import { BookProject } from '../../../types/book-project';
import { ResearchData } from '../../../types/stages';
import { BOOK_TYPE_CONFIGS, BookType } from '../../../types/book-project';
import { BoxSuggestionService } from '../../../services/box-suggestion-service';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
}

const TONE_OPTIONS = [
  'Conversacional e Prático',
  'Formal e Autoridade',
  'Inspirador e Motivacional',
  'Humorístico e Leve',
  'Acadêmico e Científico',
  'Direto e Objetivo',
  'Acolhedor e Empático',
  'Poético e Narrativo',
  'Estratégico para Negócios'
];

const AUDIENCE_OPTIONS = [
  'Público Geral Adulto',
  'Profissionais & Empreendedores',
  'Iniciantes / Leigos no Assunto',
  'Jovens Adultos (YA)',
  'Infantil / Família',
  'Acadêmicos & Especialistas',
  'Melhor Idade'
];

const GENRE_OPTIONS = Object.values(BOOK_TYPE_CONFIGS).map(c => ({
  value: c.id,
  label: c.label,
  category: c.category
}));

export const ResearchStage: React.FC<Props> = ({ project, onUpdateProject }) => {
  const data: ResearchData = project.stageData?.research || {
    bookTitle: project.title || '',
    authorName: project.author || '',
    genre: project.kdpBookType || 'non-fiction',
    topic: project.topic || '',
    stance: '',
    standout: '',
    authorTone: 'Conversacional e Prático',
    generalAudience: 'Público Geral Adulto',
    targetAudience: project.targetAudience || ''
  };

  const updateField = (field: keyof ResearchData, value: string) => {
    const updated = { ...data, [field]: value };
    const stageData = { ...(project.stageData || {}), research: updated };
    
    // Sincroniza campos essenciais no projeto raiz
    const projectUpdates: Partial<BookProject> = { stageData };
    if (field === 'bookTitle') projectUpdates.title = value;
    if (field === 'authorName') projectUpdates.author = value;
    if (field === 'topic') projectUpdates.topic = value;
    if (field === 'genre') projectUpdates.kdpBookType = value as BookType;
    if (field === 'targetAudience') projectUpdates.targetAudience = value;

    onUpdateProject({
      ...project,
      ...projectUpdates,
      stageStatuses: {
        ...(project.stageStatuses || {}),
        research: 'IN_PROGRESS'
      }
    } as BookProject);
  };

  const handleSuggestBox = (boxKey: string, field: keyof ResearchData) => {
    const nextVal = BoxSuggestionService.getNextSuggestion(boxKey, project, data);
    updateField(field, nextVal);
  };

  const handleAutofillEntireStage = () => {
    const enrichedProject: BookProject = {
      ...project,
      title: data.bookTitle || project.title,
      topic: data.topic || project.topic,
      kdpBookType: (data.genre as BookType) || project.kdpBookType
    };
    const filled = BoxSuggestionService.fillEntireStage('research', enrichedProject);
    onUpdateProject(filled);
  };

  return (
    <div className="stage-form-container">
      {/* CABEÇALHO COM BOTÃO DE AUTO-PREENCHIMENTO COMPLETO */}
      <div className="stage-intro-block">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3>Pesquisa & Definição Editorial</h3>
            <p>Defina as bases estruturais do seu livro. A IA utilizará estas informações para guiar a criação do sumário, capítulos e posicionamento comercial na Amazon.</p>
          </div>
          <button
            type="button"
            className="btn-create-sub"
            onClick={handleAutofillEntireStage}
            title="Preencher todos os campos desta etapa com sugestões profissionais da IA"
          >
            <Sparkles size={14} /> ⚡ Preenchimento Automático com IA
          </button>
        </div>
      </div>

      {/* Título Provisório */}
      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label">
            Título do Livro
            <span className="label-hint">Se ainda não tiver um título definitivo, pode deixar em branco. A IA gerará 10 opções na Etapa 3.</span>
          </label>
          <button
            type="button"
            className="btn-box-suggest"
            onClick={() => handleSuggestBox('research.bookTitle', 'bookTitle')}
            title="Sugerir com IA (clique de novo para outra opção)"
          >
            <Sparkles size={11} /> Sugerir com IA
          </button>
        </div>
        <input
          type="text"
          className="form-input"
          placeholder="Ex: Do Zero ao Primeiro Best-seller (ou deixe em branco)"
          value={data.bookTitle}
          onChange={(e) => updateField('bookTitle', e.target.value)}
        />
      </div>

      {/* Nome do Autor */}
      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label">
            Nome do Autor ou Pseudônimo
            <span className="label-hint">Nome que constará na capa, ficha catalográfica e Amazon Author Central.</span>
          </label>
          <button
            type="button"
            className="btn-box-suggest"
            onClick={() => handleSuggestBox('research.authorName', 'authorName')}
            title="Sugerir com IA"
          >
            <Sparkles size={11} /> Sugerir com IA
          </button>
        </div>
        <input
          type="text"
          className="form-input"
          placeholder="Ex: Leandro Palmeira ou Dr. Roberto Mendes"
          value={data.authorName}
          onChange={(e) => updateField('authorName', e.target.value)}
        />
      </div>

      {/* Gênero / Categoria KDP */}
      <div className="form-group">
        <label className="form-label">Gênero / Categoria Amazon KDP</label>
        <select
          className="form-select"
          value={data.genre}
          onChange={(e) => updateField('genre', e.target.value)}
        >
          {Object.entries(
            GENRE_OPTIONS.reduce((acc, g) => {
              if (!acc[g.category]) acc[g.category] = [];
              acc[g.category].push(g);
              return acc;
            }, {} as Record<string, typeof GENRE_OPTIONS>)
          ).map(([category, genres]) => (
            <optgroup key={category} label={category}>
              {genres.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Tópico Central */}
      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label">
            Tópico Central do Livro
            <span className="label-icon" title="O tema exato que o seu livro ensinará ou explorará">ⓘ</span>
          </label>
          <button
            type="button"
            className="btn-box-suggest"
            onClick={() => handleSuggestBox('research.topic', 'topic')}
            title="Sugerir com IA (clique de novo para outra opção)"
          >
            <Sparkles size={11} /> Sugerir com IA
          </button>
        </div>
        <input
          type="text"
          className="form-input"
          placeholder="Ex: Inteligência Emocional no Trabalho, Organização Financeira em 30 Dias, Hábitos de Alta Performance..."
          value={data.topic}
          onChange={(e) => updateField('topic', e.target.value)}
        />
      </div>

      {/* Posicionamento / Ponto de Vista */}
      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label">
            Seu Posicionamento ou Ângulo Exclusivo
            <span className="label-optional">(recomendado)</span>
          </label>
          <button
            type="button"
            className="btn-box-suggest"
            onClick={() => handleSuggestBox('research.stance', 'stance')}
            title="Sugerir com IA (clique de novo para outra opção)"
          >
            <Sparkles size={11} /> Sugerir com IA
          </button>
        </div>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Qual é a sua perspectiva única? Ex: A maioria dos livros foca em teorias complexas, enquanto nosso método foca em micro-hábitos de 5 minutos com retorno imediato."
          value={data.stance}
          onChange={(e) => updateField('stance', e.target.value)}
        />
      </div>

      {/* Diferencial Competitivo */}
      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label">
            O que Torna Este Livro Único no Mercado?
            <span className="label-optional">(recomendado)</span>
          </label>
          <button
            type="button"
            className="btn-box-suggest"
            onClick={() => handleSuggestBox('research.standout', 'standout')}
            title="Sugerir com IA (clique de novo para outra opção)"
          >
            <Sparkles size={11} /> Sugerir com IA
          </button>
        </div>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Por que os leitores escolherão este livro em vez dos concorrentes na Amazon? Ex: Inclui checklists de ação ao final de cada capítulo, estudos de caso brasileiros e linguagem 100% prática."
          value={data.standout}
          onChange={(e) => updateField('standout', e.target.value)}
        />
      </div>

      {/* Tom de Voz do Autor */}
      <div className="form-group">
        <label className="form-label">Tom de Voz da Narrativa</label>
        <select
          className="form-select"
          value={data.authorTone}
          onChange={(e) => updateField('authorTone', e.target.value)}
        >
          {TONE_OPTIONS.map(tone => (
            <option key={tone} value={tone}>{tone}</option>
          ))}
        </select>
      </div>

      {/* Perfil Geral do Leitor */}
      <div className="form-group">
        <label className="form-label">Faixa de Público Geral</label>
        <select
          className="form-select"
          value={data.generalAudience}
          onChange={(e) => updateField('generalAudience', e.target.value)}
        >
          {AUDIENCE_OPTIONS.map(aud => (
            <option key={aud} value={aud}>{aud}</option>
          ))}
        </select>
      </div>

      {/* Descrição Detalhada do Público-Alvo */}
      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label">
            Descrição Específica do Leitor Ideal (Avatar)
            <span className="label-hint">Descreva as dores, aspirações e perfil demográfico de quem vai comprar o livro.</span>
          </label>
          <button
            type="button"
            className="btn-box-suggest"
            onClick={() => handleSuggestBox('research.targetAudience', 'targetAudience')}
            title="Sugerir com IA (clique de novo para outra opção)"
          >
            <Sparkles size={11} /> Sugerir com IA
          </button>
        </div>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Ex: Profissionais entre 25 e 40 anos, sobrecarregados com demandas profissionais, que buscam organizar sua rotina e construir renda extra sem comprometer o tempo em família."
          value={data.targetAudience}
          onChange={(e) => updateField('targetAudience', e.target.value)}
        />
      </div>
    </div>
  );
};
