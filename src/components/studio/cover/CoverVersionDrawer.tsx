import React from 'react';
import { 
  History, 
  RotateCcw, 
  Trash2, 
  Plus, 
  Clock, 
  CheckCircle,
  Sparkles
} from 'lucide-react';

export interface SavedCoverVersion {
  id: string;
  name: string;
  timestamp: number;
  artUrl: string;
  title: string;
  subtitle: string;
  author: string;
  badgeText: string;
  fontFamily: string;
  titleColor: string;
  subtitleColor: string;
  authorColor: string;
}

interface Props {
  versions: SavedCoverVersion[];
  currentVersionId?: string;
  onRestoreVersion: (version: SavedCoverVersion) => void;
  onSaveCurrentAsVersion: () => void;
  onDeleteVersion: (id: string) => void;
}

export const CoverVersionDrawer: React.FC<Props> = ({
  versions,
  currentVersionId,
  onRestoreVersion,
  onSaveCurrentAsVersion,
  onDeleteVersion
}) => {
  return (
    <div className="cover-subpanel-container">
      <div className="panel-section-card" style={{ marginBottom: 16 }}>
        <div className="panel-card-header-row">
          <h4 className="panel-card-title">
            <History size={18} color="#2563eb" /> Gerenciamento de Versões & Histórico de Capas
          </h4>
          <button
            type="button"
            className="btn-create-sub"
            onClick={onSaveCurrentAsVersion}
          >
            <Plus size={14} /> Salvar Capa Atual no Histórico
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0 0' }}>
          Todas as iterações e refinamentos ficam registrados aqui. Você pode alternar entre versões anteriores a qualquer momento sem perder o trabalho.
        </p>
      </div>

      {versions.length === 0 ? (
        <div className="empty-versions-placeholder">
          <History size={36} color="#64748b" style={{ marginBottom: 8 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>Nenhuma versão gravada ainda</span>
          <span style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Clique no botão acima para salvar um ponto de restauração da capa atual.
          </span>
        </div>
      ) : (
        <div className="versions-timeline-grid">
          {versions.map((ver) => {
            const isCurrent = ver.id === currentVersionId;
            const dateStr = new Date(ver.timestamp).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div key={ver.id} className={`version-item-card ${isCurrent ? 'active' : ''}`}>
                <div
                  className="version-thumb-preview"
                  style={{ backgroundImage: `url(${ver.artUrl})` }}
                >
                  <div className="cover-scrim-overlay" style={{ padding: 6 }}>
                    <span style={{ color: ver.titleColor, fontSize: 10, fontWeight: 700, textAlign: 'center' }}>
                      {ver.title}
                    </span>
                  </div>
                </div>

                <div className="version-info-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="version-card-name">{ver.name}</span>
                    <span className="version-date-tag">
                      <Clock size={11} /> {dateStr}
                    </span>
                  </div>

                  <span className="version-meta-snippet">
                    Fonte: {ver.fontFamily.split(',')[0].replace(/['"]/g, '')} • {ver.badgeText}
                  </span>

                  <div className="version-actions-row">
                    <button
                      type="button"
                      className="btn-restore-version"
                      onClick={() => onRestoreVersion(ver)}
                    >
                      <RotateCcw size={13} /> Restaurar Esta Versão
                    </button>
                    <button
                      type="button"
                      className="btn-delete-version"
                      onClick={() => onDeleteVersion(ver.id)}
                      title="Excluir do Histórico"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
