import React, { useState } from 'react';
import { db } from '../../database/local-database';
import { exportBooksToCsv, downloadBlob } from '../../utils/export-import';

export const ExportBackupTab: React.FC = () => {
  const [statusMsg, setStatusMsg] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const handleExportAllBooks = async () => {
    const books = await db.getAllBooks();
    exportBooksToCsv(books, 'catalogo-completo-bookengin.csv');
  };

  const handleExportFullBackup = async () => {
    const backup = await db.exportAllData();
    const jsonStr = JSON.stringify(backup, null, 2);
    downloadBlob(jsonStr, `bookengin-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    setStatusMsg('✓ Arquivo de backup completo gerado e baixado com sucesso!');
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        const success = await db.importBackupData(json);
        if (success) {
          setStatusMsg('✓ Backup restaurado com sucesso no banco local! Recarregue a página.');
        } else {
          setStatusMsg('Formato de arquivo de backup inválido.');
        }
      } catch (err: any) {
        setStatusMsg(`Erro ao restaurar: ${err.message}`);
      } finally {
        setIsRestoring(false);
        setTimeout(() => setStatusMsg(''), 5000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="header-banner">
        <div>
          <h2 className="page-title">Exportação & Backup de Dados</h2>
          <div className="page-subtitle">Exporte planilhas para Excel/Google Sheets ou crie um backup completo dos seus dados locais</div>
        </div>
      </div>

      {statusMsg && (
        <div style={{ padding: '14px 18px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', borderRadius: '8px', color: '#60a5fa', marginBottom: '24px', fontWeight: 600 }}>
          {statusMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Exportação em CSV */}
        <div className="data-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#fff' }}>
            📊 Exportação em Planilhas (CSV)
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#8b96ad', lineHeight: 1.4 }}>
            Exporte tabelas estruturadas compatíveis com Excel, Numbers e Google Sheets, incluindo título, autor, BSR, estimativas e links.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={handleExportAllBooks}>
              📥 Exportar Catálogo Completo de Livros (CSV)
            </button>
          </div>
        </div>

        {/* Backup Completo JSON */}
        <div className="data-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#fff' }}>
            💾 Backup & Restauração Completa (JSON)
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#8b96ad', lineHeight: 1.4 }}>
            Gere uma cópia exata de todo o seu banco IndexedDB (livros, observações de BSR, watchlist, modelos de vendas e configurações).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleExportFullBackup}>
              Fazer Backup Completo (JSON)
            </button>

            <label className="btn btn-secondary" style={{ cursor: 'pointer', textAlign: 'center', justifyContent: 'center' }}>
              {isRestoring ? 'Restaurando...' : 'Restaurar Arquivo de Backup (JSON)'}
              <input type="file" accept=".json" onChange={handleRestoreBackup} style={{ display: 'none' }} disabled={isRestoring} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
