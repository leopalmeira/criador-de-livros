import React, { useState } from 'react';
import { 
  X, 
  History, 
  RotateCcw, 
  Copy, 
  Plus, 
  Save, 
  Clock 
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
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div className="version-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-header-row">
          <div className="modal-title-group">
            <History size={20} className="modal-header-icon" />
            <div>
              <h3 className="modal-title">Histórico de Versões & Backups</h3>
              <p className="modal-subtitle">Grave pontos de restauração da obra para editar com tranquilidade total.</p>
            </div>
          </div>
          <button className="btn-modal-close" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>

        {/* AÇÕES DE DUPLICAR E CRIAR VERSÃO */}
        <div className="version-actions-bar">
          <button className="btn-subtle" onClick={onDuplicateProject}>
            <Copy size={14} /> Duplicar Todo o Projeto
          </button>

          {!isCreating && (
            <button className="btn-primary-action-sm" onClick={() => setIsCreating(true)}>
              <Plus size={14} /> Criar Ponto de Restauração
            </button>
          )}
        </div>

        {/* FORMULÁRIO DE NOVA VERSÃO */}
        {isCreating && (
          <div className="version-create-form">
            <h4 className="version-form-title">Gravar Ponto de Restauração Atual</h4>
            <div className="form-group mb-2">
              <label className="form-label-sm">Nome / Identificador da Versão</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="Ex: v1.1 - Revisão dos capítulos 1 a 4 concluída"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
              />
            </div>
            <div className="form-group mb-3">
              <label className="form-label-sm">Resumo das Modificações Realizadas</label>
              <textarea 
                rows={2}
                className="form-textarea"
                placeholder="Descreva brevemente o que foi alterado ou adicionado nesta etapa..."
                value={newVersionSummary}
                onChange={(e) => setNewVersionSummary(e.target.value)}
              />
            </div>
            <div className="version-form-buttons">
              <button className="btn-subtle" onClick={() => setIsCreating(false)}>Cancelar</button>
              <button className="btn-primary-action-sm" onClick={handleSave}>
                <Save size={14} /> Gravar Versão
              </button>
            </div>
          </div>
        )}

        {/* LISTA DE VERSÕES GRAVADAS */}
        <div className="versions-list-stack">
          {versions.length > 0 ? (
            versions.map((ver) => (
              <div key={ver.id} className="version-item-card">
                <div className="version-item-header">
                  <div className="version-item-left">
                    <span className="badge-version-tag">{ver.versionTag}</span>
                    <h5 className="version-item-title">{ver.name}</h5>
                  </div>
                  <span className="version-item-date">
                    {new Date(ver.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>

                {ver.summary && <p className="version-item-summary">{ver.summary}</p>}

                <div className="version-item-footer">
                  <button 
                    className="btn-restore-version"
                    onClick={() => {
                      if (window.confirm(`Tem certeza que deseja restaurar a versão "${ver.name}"? O estado atual do livro será substituído pelo conteúdo deste backup.`)) {
                        onRestoreVersion(ver);
                        onClose();
                      }
                    }}
                  >
                    <RotateCcw size={13} /> Restaurar Este Backup
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-versions-box">
              <Clock size={36} className="text-muted mb-2" />
              <p className="text-sm text-secondary font-medium">Nenhum ponto de restauração gravado ainda.</p>
              <p className="text-xs text-muted">Crie backups antes de grandes revisões para alternar livremente entre versões da obra.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
