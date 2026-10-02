import React, { useState } from 'react';
import { BookProject } from '../../../types/book-project';
import { AuthorBioData } from '../../../types/stages';
import { AiService } from '../../../services/ai-service';
import { Sparkles, RefreshCw, UserCheck, Copy, Check } from 'lucide-react';
import { BoxSuggestionService } from '../../../services/box-suggestion-service';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  aiService: AiService;
}

export const AuthorBioStage: React.FC<Props> = ({ project, onUpdateProject, aiService }) => {
  const data: AuthorBioData = project.stageData?.['author-bio'] || {
    personalDetails: '',
    nameType: 'pen-name',
    background: '',
    achievements: '',
    generatedBio: ''
  };
  const [authorName, setAuthorName] = useState<string>(project.author || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedBio, setCopiedBio] = useState(false);

  const updateData = (updates: Partial<AuthorBioData>) => {
    const updated = { ...data, ...updates };
    onUpdateProject({
      ...project,
      author: authorName.trim() || project.author,
      stageData: { ...(project.stageData || {}), 'author-bio': updated },
      stageStatuses: { ...(project.stageStatuses || {}), 'author-bio': 'IN_PROGRESS' }
    } as BookProject);
  };

  const handleSuggestPenName = () => {
    const suggested = BoxSuggestionService.getNextSuggestion('author-bio.penName', project, {
      bookTitle: project.title,
      topic: project.topic,
      genre: project.kdpBookType || (project as any).genre || project.stageData?.research?.genre
    });
    setAuthorName(suggested);
    onUpdateProject({
      ...project,
      author: suggested,
      stageData: {
        ...(project.stageData || {}),
        'author-bio': { ...data, penName: suggested }
      }
    });
  };

  const handleSuggestField = (field: 'background' | 'achievements' | 'personalDetails') => {
    const key = `author-bio.${field}`;
    const suggested = BoxSuggestionService.getNextSuggestion(key, project, {
      bookTitle: project.title,
      topic: project.topic,
      genre: project.kdpBookType || (project as any).genre || project.stageData?.research?.genre
    });
    updateData({ [field]: suggested });
  };

  const generateBio = async () => {
    setIsGenerating(true);
    try {
      const currentAuthor = authorName.trim() || project.author || 'Autor da Obra';
      const prompt = `Escreva uma biografia editorial de autor oficial para a página de Autor Central da Amazon KDP e para a orelha/contracapa do livro:
Nome do Autor: ${currentAuthor}
Tipo: ${data.nameType === 'pen-name' ? 'Pseudônimo Fictício de Ficção/Gênero' : 'Nome Real do Especialista'}
Gênero do Livro: ${project.kdpBookType || (project as any).genre || 'Ficção & Fantasia'}
Título da Obra: ${project.title || ''}
Trajetória & Vivência: ${data.background || 'Escritor dedicado à pesquisa e construção de narrativas imersivas'}
Conquistas & Reconhecimento: ${data.achievements || 'Livros aclamados por comunidades de leitores e leituras no Kindle Unlimited'}
Detalhes Pessoais & Hobbies: ${data.personalDetails || 'Apreciador de café forte, noites de leitura e mundos fantásticos'}

Diretrizes:
- Redija em 3ª pessoa profissional, em tom acolhedor, elegante e envolvente.
- 3 parágrafos fluídos que conectem a paixão do autor com a experiência do leitor.
- NÃO descreva regras de persona, escreva diretamente a biografia pronta para publicação.`;

      const response = await aiService.generateText(prompt);
      updateData({ generatedBio: response });
    } catch (err) {
      console.error('Erro ao gerar biografia:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyBio = () => {
    if (!data.generatedBio) return;
    navigator.clipboard.writeText(data.generatedBio);
    setCopiedBio(true);
    setTimeout(() => setCopiedBio(false), 2500);
  };

  return (
    <div className="stage-form-container">
      <div className="stage-intro-block">
        <h3>Biografia do Autor & Credenciais</h3>
        <p>Crie a biografia que constará na orelha do livro, contracapa e no perfil oficial do autor na Amazon KDP.</p>
      </div>

      {/* CAMPO NOME DO AUTOR / PSEUDÔNIMO FICTÍCIO COM IA */}
      <div className="form-group mb-5 p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl">
        <div className="flex justify-between items-center mb-1">
          <label className="form-label font-bold text-sm text-white mb-0">
            Nome do Autor ou Pseudônimo Fictício
            <span className="text-xs text-slate-400 font-normal block">
              Consta na capa, folha de rosto, ficha catalográfica e Amazon Author Central.
            </span>
          </label>
          <button
            type="button"
            className="btn-suggest-ia"
            onClick={handleSuggestPenName}
            title="Gera pseudônimos fictícios de alto prestígio alinhados ao gênero do livro sem repetição."
          >
            <Sparkles size={12} />
            <span>Sugerir Pseudônimo Fictício</span>
          </button>
        </div>
        <input
          type="text"
          className="form-input text-base font-semibold"
          placeholder="Ex: Thorne Blackwood, Penelope Ward, L. K. Vance..."
          value={authorName}
          onChange={(e) => {
            setAuthorName(e.target.value);
            onUpdateProject({ ...project, author: e.target.value });
          }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Tipo de Identidade Autoral</label>
        <div className="radio-inline-group">
          {[
            { id: 'pen-name', label: 'Pseudônimo Editorial Fictício' },
            { id: 'personal-name', label: 'Nome Pessoal Real' },
            { id: 'brand-name', label: 'Selo / Marca Editorial' }
          ].map(type => (
            <label key={type.id} className={`radio-inline ${data.nameType === type.id ? 'selected' : ''}`}>
              <input
                type="radio"
                name="nameType"
                value={type.id}
                checked={data.nameType === type.id}
                onChange={() => updateData({ nameType: type.id as any })}
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <div className="flex justify-between items-center mb-1">
          <label className="form-label mb-0">
            Histórico & Trajetória
            <span className="label-hint">Vivência ou especialidade que fundamenta a obra</span>
          </label>
          <button
            type="button"
            className="btn-suggest-ia"
            onClick={() => handleSuggestField('background')}
          >
            <Sparkles size={11} />
            <span>Sugerir com IA</span>
          </button>
        </div>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Ex: Escritor independente com anos de pesquisa sobre história antiga e combates medievais..."
          value={data.background}
          onChange={(e) => updateData({ background: e.target.value })}
        />
      </div>

      <div className="form-group">
        <div className="flex justify-between items-center mb-1">
          <label className="form-label mb-0">
            Conquistas, Resultados & Marcos
            <span className="label-hint">Prêmios, números expressivos, publicações ou marcos de leitura</span>
          </label>
          <button
            type="button"
            className="btn-suggest-ia"
            onClick={() => handleSuggestField('achievements')}
          >
            <Sparkles size={11} />
            <span>Sugerir com IA</span>
          </button>
        </div>
        <textarea
          className="form-textarea"
          rows={2}
          placeholder="Ex: Top 10 Bestseller em Fantasia Heroica no Kindle Unlimited com milhares de leitores..."
          value={data.achievements}
          onChange={(e) => updateData({ achievements: e.target.value })}
        />
      </div>

      <div className="form-group">
        <div className="flex justify-between items-center mb-1">
          <label className="form-label mb-0">
            Detalhes Pessoais & Hobbies
            <span className="label-optional">(cria conexão humana com os leitores)</span>
          </label>
          <button
            type="button"
            className="btn-suggest-ia"
            onClick={() => handleSuggestField('personalDetails')}
          >
            <Sparkles size={11} />
            <span>Sugerir com IA</span>
          </button>
        </div>
        <textarea
          className="form-textarea"
          rows={2}
          placeholder="Ex: Aprecia café forte, campanhas de RPG e noites de tempestade escrevendo novos mundos..."
          value={data.personalDetails}
          onChange={(e) => updateData({ personalDetails: e.target.value })}
        />
      </div>

      <div className="stage-action-center">
        <button className="btn-primary-action" onClick={generateBio} disabled={isGenerating}>
          {isGenerating ? (
            <><span className="spinner" /> Redigindo biografia editorial...</>
          ) : (
            <><Sparkles size={16} /> Gerar Biografia com IA</>
          )}
        </button>
      </div>

      {data.generatedBio && (
        <div className="generated-content-block">
          <div className="flex justify-between items-center mb-3">
            <h4 className="mb-0">Biografia Oficial para Amazon & Contracapa</h4>
            <button
              type="button"
              className="btn-sm-outline flex items-center gap-1.5 text-xs py-1 px-3"
              onClick={handleCopyBio}
            >
              {copiedBio ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedBio ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
          </div>
          <div className="generated-text-preview whitespace-pre-wrap leading-relaxed text-sm">
            {data.generatedBio}
          </div>
        </div>
      )}
    </div>
  );
};
