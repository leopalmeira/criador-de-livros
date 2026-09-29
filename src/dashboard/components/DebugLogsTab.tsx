import React, { useEffect, useState } from 'react';
import { DebugLogEntry } from '../../types';
import { db } from '../../database/local-database';
import { logger } from '../../utils/logger';

export const DebugLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [copied, setCopied] = useState<boolean>(false);

  const loadLogs = async () => {
    const list = await db.getDebugLogs(200);
    setLogs(list);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleCopyLogs = () => {
    const text = logs.map(l => {
      const time = new Date(l.timestamp).toISOString();
      const dataStr = l.data ? ` | ${JSON.stringify(l.data)}` : '';
      return `[${time}] [${l.level.toUpperCase()}] [${l.context}] ${l.message}${dataStr}`;
    }).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleClearLogs = async () => {
    await db.clearDebugLogs();
    setLogs([]);
  };

  const filteredLogs = logs.filter(l => {
    if (filterLevel === 'all') return true;
    return l.level === filterLevel;
  });

  return (
    <div>
      <div className="header-banner">
        <div>
          <h2 className="page-title">Logs de Diagnóstico & Debug</h2>
          <div className="page-subtitle">Verifique seletores utilizados, eventos de processamento e diagnósticos de erros</div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleClearLogs}>
            Limpar Logs
          </button>
          <button className="btn btn-primary" onClick={handleCopyLogs}>
            {copied ? '✓ Copiado!' : '📋 Copiar Todos os Logs'}
          </button>
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#8b96ad' }}>Nível de Log:</span>
            <select
              className="input-field"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
            >
              <option value="all">Todos os Níveis</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          <span className="badge badge-blue">{filteredLogs.length} registro(s)</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8b96ad' }}>
            Nenhum registro de log encontrado. Se desejar coletar eventos detalhados da página, ative o "Modo Debug" em Configurações.
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Horário</th>
                  <th style={{ width: '80px' }}>Nível</th>
                  <th style={{ width: '140px' }}>Contexto</th>
                  <th>Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: '11px', color: '#8b96ad' }}>
                      {new Date(l.timestamp).toLocaleTimeString('pt-BR')}
                    </td>
                    <td>
                      <span className={`badge ${
                        l.level === 'error' ? 'badge-red' : 
                        l.level === 'warn' ? 'badge-yellow' : 
                        l.level === 'debug' ? 'badge-blue' : 'badge-green'
                      }`}>
                        {l.level.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#f0f3fa' }}>{l.context}</td>
                    <td>
                      <div style={{ color: '#cbd5e1' }}>{l.message}</div>
                      {l.data && (
                        <pre style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8', background: '#0b0e14', padding: '6px', borderRadius: '4px', overflowX: 'auto' }}>
                          {JSON.stringify(l.data, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
