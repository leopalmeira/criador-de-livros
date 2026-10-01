import React, { useState, useRef } from 'react';
import { 
  Library, 
  Sparkles, 
  Save, 
  Plus, 
  Trash2, 
  FileText, 
  Link, 
  Image, 
  Download,
  RefreshCw,
  Eye,
  Paperclip,
  Globe,
  BookOpen
} from 'lucide-react';
import { BookProject, StageContent, BookImageItem } from '../../types/book-project';
import { AiService } from '../../services/ai-service';

type ResourceType = 'pdf' | 'docx' | 'txt' | 'image' | 'link' | 'note' | 'reference';

interface ResourcesViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  aiService: AiService;
}

const RESOURCE_TYPES = [
  { value: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-400' },
  { value: 'docx', label: 'DOCX', icon: FileText, color: 'text-blue-400' },
  { value: 'txt', label: 'TXT', icon: FileText, color: 'text-green-400' },
  { value: 'image', label: 'Imagem', icon: Image, color: 'text-purple-400' },
  { value: 'link', label: 'Link/URL', icon: Globe, color: 'text-amber-400' },
  { value: 'note', label: 'Nota', icon: BookOpen, color: 'text-cyan-400' },
  { value: 'reference', label: 'Referência', icon: Link, color: 'text-pink-400' },
];

export const ResourcesView: React.FC<ResourcesViewProps> = ({
  project,
  onUpdateProject,
  aiService
}) => {
  const existingContent = project.stageContents?.find(c => c.stageKey === 'resources');
  const [resources, setResources] = useState<any[]>(existingContent?.data?.resources || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [newResource, setNewResource] = useState({
    type: 'link' as ResourceType,
    name: '',
    url: '',
    content: '',
    tags: '',
    status: 'pending'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const updatedContent: StageContent = {
      stageKey: 'resources',
      data: { resources },
      updatedAt: Date.now(),
      updatedBy: 'user',
      version: (existingContent?.version || 0) + 1
    };
    onUpdateProject({
      ...project,
      stageContents: [...(project.stageContents?.filter(c => c.stageKey !== 'resources') || []), updatedContent],
      stageProgress: project.stageProgress.map(sp => 
        sp.stageKey === 'resources' ? { ...sp, status: 'REVIEW' as const, progress: 100, lastUpdated: Date.now() } : sp
      ),
      stageApprovals: project.stageApprovals.map(sa => 
        sa.stageKey === 'resources' ? { ...sa, status: 'REVIEW' as const, previousStatus: sa.status, approvedAt: undefined, approvedBy: undefined } : sa
      )
    });
  };

  const handleAddResource = () => {
    if (!newResource.name.trim()) return;
    const resource = {
      id: `res_${Date.now()}`,
      ...newResource,
      tags: newResource.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: Date.now(),
      projectId: project.id
    };
    setResources(prev => [resource, ...prev]);
    setNewResource({ type: 'link', name: '', url: '', content: '', tags: '', status: 'pending' });
    setShowAddModal(false);
  };

  const handleUpdateResource = (id: string, updates: any) => {
    setResources(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    setEditingResource(null);
  };

  const handleDeleteResource = (id: string) => {
    setResources(prev => prev.filter(r => r.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof reader.result !== 'string') return;
      const resource = {
        id: `res_${Date.now()}`,
        type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'docx',
        name: file.name,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        dataUrl: reader.result,
        tags: [],
        status: 'pending',
        createdAt: Date.now(),
        projectId: project.id
      };
      setResources(prev => [resource, ...prev]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getTypeConfig = (type: ResourceType) => RESOURCE_TYPES.find(t => t.value === type) || RESOURCE_TYPES[0];

  return (
    <div className="stage-page-layout">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Library size={22} className="text-primary-accent" />
            <h3 className="text-xl font-bold">Etapa 04 - Resources: Biblioteca de Recursos</h3>
          </div>
          <p className="text-xs text-muted">
            Adicione PDFs, documentos, links, imagens e notas. Recursos aprovados alimentam a IA nas etapas seguintes.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary-action" onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Adicionar Recurso
          </button>
          <button className="btn-primary-glow" onClick={handleSave}>
            <Save size={15} /> Salvar Biblioteca
          </button>
        </div>
      </div>

      {/* RESOURCES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {resources.map((resource) => {
          const typeConfig = getTypeConfig(resource.type);
          const Icon = typeConfig.icon;
          return (
            <div key={resource.id} className="p-4 bg-surface-elevated rounded-xl border border-border-subtle hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeConfig.color} bg-current/10`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{resource.name}</div>
                    <div className="text-[11px] text-muted capitalize">{typeConfig.label}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`badge-status ${resource.status === 'approved' ? 'status-approved' : resource.status === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                    {resource.status}
                  </span>
                </div>
              </div>

              {resource.type === 'link' && resource.url && (
                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mb-2 block truncate">
                  {resource.url}
                </a>
              )}
              {resource.type === 'note' && resource.content && (
                <p className="text-xs text-slate-300 mb-2 line-clamp-3">{resource.content}</p>
              )}
              {resource.type === 'reference' && resource.content && (
                <p className="text-xs text-slate-300 mb-2">{resource.content}</p>
              )}
              {(resource.type === 'pdf' || resource.type === 'docx' || resource.type === 'txt' || resource.type === 'image') && resource.dataUrl && (
                <div className="mb-2">
                  {resource.type === 'image' ? (
                    <img src={resource.dataUrl} alt={resource.name} className="w-full h-24 object-cover rounded" />
                  ) : (
                    <div className="p-2 bg-slate-800/50 rounded text-center text-xs text-muted">
                      Arquivo: {resource.fileName || resource.name} ({(resource.fileSize || 0 / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              )}

              {resource.tags?.length && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {resource.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 text-[10px] bg-slate-700 rounded text-slate-300">{tag}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                <div className="flex items-center gap-1">
                  {resource.type !== 'image' && resource.dataUrl && (
                    <button className="btn-icon-subtle" title="Baixar" onClick={() => {
                      const a = document.createElement('a');
                      a.href = resource.dataUrl;
                      a.download = resource.fileName || resource.name;
                      a.click();
                    }}>
                      <Download size={14} />
                    </button>
                  )}
                  {resource.type === 'image' && resource.dataUrl && (
                    <button className="btn-icon-subtle" title="Visualizar" onClick={() => window.open(resource.dataUrl, '_blank')}>
                      <Eye size={14} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <select 
                    className="select-standard text-xs py-1 px-2" 
                    value={resource.status} 
                    onChange={(e) => handleUpdateResource(resource.id, { status: e.target.value })}
                  >
                    <option value="pending">Pendente</option>
                    <option value="approved">Aprovado</option>
                    <option value="rejected">Rejeitado</option>
                  </select>
                  <button className="btn-icon-subtle" onClick={() => setEditingResource(resource)} title="Editar">
                    <Paperclip size={12} />
                  </button>
                  <button className="btn-icon-danger" onClick={() => handleDeleteResource(resource.id)} title="Excluir">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {resources.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Library size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-muted">Nenhum recurso adicionado ainda.</p>
            <button className="btn-primary-action mt-3" onClick={() => setShowAddModal(true)}>
              <Plus size={14} /> Adicionar Primeiro Recurso
            </button>
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      {(showAddModal || editingResource) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{editingResource ? 'Editar Recurso' : 'Adicionar Recurso'}</h3>
              <button onClick={() => { setShowAddModal(false); setEditingResource(null); }} className="text-slate-400 hover:text-white">
                <RefreshCw size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Tipo</label>
                <select className="select-standard" value={editingResource?.type || newResource.type} onChange={(e) => {
                  if (editingResource) handleUpdateResource(editingResource.id, { type: e.target.value });
                  else setNewResource(prev => ({ ...prev, type: e.target.value as ResourceType }));
                }}>
                  {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Nome *</label>
                <input 
                  type="text" 
                  className="input-text-standard" 
                  value={editingResource?.name || newResource.name} 
                  onChange={(e) => {
                    if (editingResource) handleUpdateResource(editingResource.id, { name: e.target.value });
                    else setNewResource(prev => ({ ...prev, name: e.target.value }));
                  }}
                  placeholder="Ex: Artigo sobre hábitos atômicos"
                />
              </div>

              {(editingResource?.type || newResource.type) === 'link' && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">URL</label>
                  <input 
                    type="url" 
                    className="input-text-standard" 
                    value={editingResource?.url || newResource.url} 
                    onChange={(e) => {
                      if (editingResource) handleUpdateResource(editingResource.id, { url: e.target.value });
                      else setNewResource(prev => ({ ...prev, url: e.target.value }));
                    }}
                    placeholder="https://exemplo.com/artigo"
                  />
                </div>
              )}

              {(editingResource?.type || newResource.type) === 'note' && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Conteúdo da Nota</label>
                  <textarea 
                    rows={4}
                    className="textarea-standard" 
                    value={editingResource?.content || newResource.content} 
                    onChange={(e) => {
                      if (editingResource) handleUpdateResource(editingResource.id, { content: e.target.value });
                      else setNewResource(prev => ({ ...prev, content: e.target.value }));
                    }}
                    placeholder="Sua anotação..."
                  />
                </div>
              )}

              {(editingResource?.type || newResource.type) === 'reference' && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Citação/Referência</label>
                  <textarea 
                    rows={3}
                    className="textarea-standard" 
                    value={editingResource?.content || newResource.content} 
                    onChange={(e) => {
                      if (editingResource) handleUpdateResource(editingResource.id, { content: e.target.value });
                      else setNewResource(prev => ({ ...prev, content: e.target.value }));
                    }}
                    placeholder="Ex: CLEAR, James. Hábitos Atômicos. 2018."
                  />
                </div>
              )}

              {['pdf', 'docx', 'txt', 'image'].includes(editingResource?.type || newResource.type) && !editingResource?.dataUrl && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Arquivo</label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="input-text-standard" 
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Tags (separadas por vírgula)</label>
                <input 
                  type="text" 
                  className="input-text-standard" 
                  value={editingResource?.tags?.join(', ') || newResource.tags} 
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    if (editingResource) handleUpdateResource(editingResource.id, { tags });
                    else setNewResource(prev => ({ ...prev, tags: e.target.value }));
                  }}
                  placeholder="hábitos, produtividade, neurociência"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button className="btn-subtle" onClick={() => { setShowAddModal(false); setEditingResource(null); }}>
                Cancelar
              </button>
              <button className="btn-primary-glow" onClick={editingResource ? () => setEditingResource(null) : handleAddResource}>
                {editingResource ? 'Concluído' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};