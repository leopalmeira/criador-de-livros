import React, { useState } from 'react';
import { 
  X, 
  History, 
  RotateCcw, 
  Copy, 
  Plus, 
  Save, 
  Clock, 
  Check 
} from 'lucide-react';
import { BookProject, BookVersionItem } from '../../types/book-project';

interface VersionHistoryModalProps {
  project: BookProject;
  isOpen: boolean;
  onClose: () => void;
  onRestoreVersion: (version: BookVersionItem) => void;
  onSaveNewVersion: (versionName: string, summary: string) => void;
  onDuplicateProject: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  project,
  isOpen,
  onClose,
  onRestoreVersion,
  onSaveNewVersion,
  onDuplicateProject
}) => {
  if (!isOpen) return null;

  const versions: BookVersionItem[] = project.versions || [];
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionSummary, setNewVersionSummary] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = () => {
    if (!newVersionName.trim()) return;
    onSaveNewVersion(newVersionName.trim(), newVersionSummary.trim());
    setNewVersionName('');
    setNewVersionSummary('');
    setIsCreating(false);
  };

  return (
    <div className="modal-backdrop-overlay">
      <div className="version-modal-card">
        {/* HEADER */}
        <div className="flex justify-between items-center pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <History size={18} className="text-primary-accent" />
            <h3 className="font-bold text-base">Histórico de Versões & Backup</h3>
          </div>
          <button className="btn-icon-subtle" onClick={onClose}><X size={16} /></button>
        </div>

        {/* AÇÕES DE DUPLICAR E CRIAR VERSÃO */}
        <div className="flex justify-between items-center mt-4 mb-4">
          <button className="btn-subtle" onClick={onDuplicateProject}>
            <Copy size={14} /> Duplicar Todo o Projeto
          </button>

          {!isCreating && (
            <button className="btn-primary-action" onClick={() => setIsCreating(true)}>
              <Plus size={14} /> Criar Ponto de Restauração
            </button>
          )}
        </div>

        {/* FORMULÁRIO DE NOVA VERSÃO */}
        {isCreating && (
          <div className="p-3 bg-surface-elevated rounded-xl border border-border-subtle mb-4">
            <h4 className="text-xs font-semibold mb-2">Salvar Ponto de Restauração Atual</h4>
            <div className="form-group-field mb-2">
              <label>Nome / Identificador da Versão</label>
              <input 
                type="text" 
                className="input-text-standard"
                placeholder="Ex: v1.1 - Capítulos 1 a 4 revisados"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
              />
            </div>
            <div className="form-group-field mb-3">
              <label>Resumo das Modificações</label>
              <textarea 
                rows={2}
                className="textarea-standard"
                placeholder="Principais mudanças feitas nesta versão..."
                value={newVersionSummary}
                onChange={(e) => setNewVersionSummary(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-subtle" onClick={() => setIsCreating(false)}>Cancelar</button>
              <button className="btn-primary-glow" onClick={handleSave}>
                <Save size={13} /> Gravar Versão
              </button>
            </div>
          </div>
        )}

        {/* LISTA DE VERSÕES GRAVADAS */}
        <div className="versions-list-stack">
          {versions.length > 0 ? (
            versions.map((ver) => (
              <div key={ver.id} className="version-item-card">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="badge-version-tag">{ver.versionTag}</span>
                    <h5 className="font-semibold text-sm">{ver.name}</h5>
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(ver.timestamp).toLocaleString()}
                  </span>
                </div>

                {ver.summary && <p className="text-xs text-muted mb-3">{ver.summary}</p>}

                <div className="flex justify-end">
                  <button 
                    className="btn-restore-version"
                    onClick={() => {
                      if (window.confirm(`Tem certeza que deseja restaurar a versão "${ver.name}"? O estado atual será substituído.`)) {
                        onRestoreVersion(ver);
                        onClose();
                      }
                    }}
                  >
                    <RotateCcw size={13} /> Restaurar Esta Versão
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-versions-box">
              <Clock size={36} className="text-muted mb-2" />
              <p className="text-xs text-muted">Nenhum ponto de restauração salvo ainda.</p>
              <p className="text-xs text-muted">Crie versões antes de grandes edições para ter segurança total.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
