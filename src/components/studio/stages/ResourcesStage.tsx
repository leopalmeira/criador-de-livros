import React, { useState } from 'react';
import { BookProject } from '../../../types/book-project';
import { ResourcesData, ResourceItem } from '../../../types/stages';
import { Plus, Trash2, Link, FileText, AlignLeft } from 'lucide-react';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
}

export const ResourcesStage: React.FC<Props> = ({ project, onUpdateProject }) => {
  const data: ResourcesData = project.stageData?.resources || { items: [] };
  const [newType, setNewType] = useState<'link' | 'text'>('link');
  const [newContent, setNewContent] = useState('');
  const [newName, setNewName] = useState('');

  const updateData = (updates: Partial<ResourcesData>) => {
    const updated = { ...data, ...updates };
    onUpdateProject({
      ...project,
      stageData: { ...(project.stageData || {}), resources: updated },
      stageStatuses: { ...(project.stageStatuses || {}), resources: 'IN_PROGRESS' }
    } as BookProject);
  };

  const addResource = () => {
    if (!newContent.trim()) return;
    const item: ResourceItem = {
      id: `res_${Date.now()}`,
      name: newName || (newType === 'link' ? newContent : 'Anotação de Pesquisa'),
      type: newType,
      content: newContent,
      url: newType === 'link' ? newContent : undefined,
      addedAt: Date.now(),
      tags: []
    };
    updateData({ items: [...data.items, item] });
    setNewContent('');
    setNewName('');
  };

  const removeResource = (id: string) => {
    updateData({ items: data.items.filter(r => r.id !== id) });
  };

  return (
    <div className="stage-form-container">
      <div className="stage-intro-block">
        <h3>Fontes, Notas & Materiais de Apoio</h3>
        <p>Adicione links de pesquisas, transcrições, artigos, entrevistas ou anotações que servirão de base para a redação dos capítulos. Quanto mais contexto real, mais profundo será o seu livro.</p>
      </div>

      {/* Formulário de Adicionar Recurso */}
      <div className="resource-add-form">
        <div className="resource-type-tabs">
          <button
            className={`type-tab ${newType === 'link' ? 'active' : ''}`}
            onClick={() => setNewType('link')}
          >
            <Link size={14} /> Link da Web / Artigo
          </button>
          <button
            className={`type-tab ${newType === 'text' ? 'active' : ''}`}
            onClick={() => setNewType('text')}
          >
            <AlignLeft size={14} /> Texto / Resumo Próprio
          </button>
        </div>

        <input
          type="text"
          className="form-input"
          placeholder="Título ou identificação desta fonte (ex: Pesquisa de Harvard sobre hábitos)..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ marginBottom: 10 }}
        />

        {newType === 'link' ? (
          <input
            type="url"
            className="form-input"
            placeholder="Cole o link completo aqui (https://...)"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addResource()}
          />
        ) : (
          <textarea
            className="form-textarea"
            rows={4}
            placeholder="Cole aqui textos, citações, dados estatísticos, estudos ou ideias soltas que devem entrar no livro..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn-primary-action btn-sm" onClick={addResource}>
            <Plus size={14} /> Adicionar aos Materiais
          </button>
        </div>
      </div>

      {/* Lista de Recursos Cadastrados */}
      {data.items.length > 0 && (
        <div className="resource-list">
          {data.items.map(item => (
            <div key={item.id} className="resource-item-card">
              <div className="resource-item-icon">
                {item.type === 'link' ? <Link size={16} /> : <FileText size={16} />}
              </div>
              <div className="resource-item-info">
                <span className="resource-item-name">{item.name}</span>
                <span className="resource-item-preview">
                  {item.content.length > 120 ? item.content.slice(0, 120) + '...' : item.content}
                </span>
              </div>
              <button className="btn-icon-sm danger" onClick={() => removeResource(item.id)} title="Remover item">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {data.items.length === 0 && (
        <div className="empty-state-hint">
          <p>Nenhuma fonte adicionada ainda. Você pode colar links de referência ou digitar apontamentos para enriquecer o vocabulário e dados dos capítulos.</p>
        </div>
      )}
    </div>
  );
};
