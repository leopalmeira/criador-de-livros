import React, { useEffect, useState } from 'react';
import { SalesModelConfig, SalesCalibrationPoint } from '../../types';
import { db } from '../../database/local-database';
import { CalibrationCurveChart } from './Charts';
import { parseCalibrationCsv, downloadBlob } from '../../utils/export-import';

export const SalesModelTab: React.FC = () => {
  const [models, setModels] = useState<SalesModelConfig[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [activeModel, setActiveModel] = useState<SalesModelConfig | null>(null);
  const [newBsr, setNewBsr] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [recalcStatus, setRecalcStatus] = useState<string>('');

  const loadModels = async () => {
    const list = await db.getSalesModels();
    setModels(list);
    if (list.length > 0) {
      const active = selectedModelId ? list.find(m => m.id === selectedModelId) || list[0] : list[0];
      setSelectedModelId(active.id);
      setActiveModel(JSON.parse(JSON.stringify(active)));
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleSelectModel = (id: string) => {
    setSelectedModelId(id);
    const m = models.find(mod => mod.id === id);
    if (m) setActiveModel(JSON.parse(JSON.stringify(m)));
  };

  const handleAddPoint = () => {
    if (!activeModel) return;
    const bsrNum = parseInt(newBsr, 10);
    const salesNum = parseFloat(newSales.replace(',', '.'));

    if (isNaN(bsrNum) || isNaN(salesNum) || bsrNum <= 0 || salesNum < 0) {
      alert('Insira valores válidos para BSR e Vendas Diárias.');
      return;
    }

    const updatedPoints = [...activeModel.points.filter(p => p.bsr !== bsrNum), { bsr: bsrNum, dailySales: salesNum }];
    updatedPoints.sort((a, b) => a.bsr - b.bsr);

    setActiveModel({ ...activeModel, points: updatedPoints });
    setNewBsr('');
    setNewSales('');
  };

  const handleRemovePoint = (bsr: number) => {
    if (!activeModel) return;
    const updatedPoints = activeModel.points.filter(p => p.bsr !== bsr);
    setActiveModel({ ...activeModel, points: updatedPoints });
  };

  const handlePointChange = (index: number, field: 'bsr' | 'dailySales', val: string) => {
    if (!activeModel) return;
    const updated = [...activeModel.points];
    const num = field === 'bsr' ? parseInt(val, 10) : parseFloat(val.replace(',', '.'));
    if (!isNaN(num)) {
      updated[index] = { ...updated[index], [field]: num };
      setActiveModel({ ...activeModel, points: updated });
    }
  };

  const handleSaveModel = async () => {
    if (!activeModel) return;
    await db.saveSalesModel(activeModel);
    setSaveStatus('✓ Modelo salvo com sucesso!');
    setTimeout(() => setSaveStatus(''), 3000);
    loadModels();
  };

  const handleResetDefaults = async () => {
    if (confirm('Deseja restaurar as curvas e tabelas de calibração padrão? Suas alterações serão substituídas.')) {
      await db.resetSalesModels();
      setSaveStatus('✓ Modelos restaurados para os padrões.');
      setTimeout(() => setSaveStatus(''), 3000);
      loadModels();
    }
  };

  const handleExportCsv = () => {
    if (!activeModel) return;
    const lines = ['BSR,vendas_dia', ...activeModel.points.map(p => `${p.bsr},${p.dailySales}`)];
    downloadBlob(lines.join('\r\n'), `calibracao-${activeModel.id}.csv`);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeModel) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsedPoints = parseCalibrationCsv(text);
      if (parsedPoints.length > 0) {
        setActiveModel({ ...activeModel, points: parsedPoints });
        setSaveStatus(`✓ ${parsedPoints.length} pontos importados do CSV. Clique em Salvar.`);
      } else {
        alert('Não foi possível reconhecer linhas válidas no formato BSR,vendas_dia.');
      }
    };
    reader.readAsText(file);
  };

  const handleRecalculateAll = () => {
    setRecalcStatus('Recalculando estimativas...');
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'RECALCULATE_ESTIMATES' }, (res) => {
        if (res && res.status === 'ok') {
          setRecalcStatus(`✓ Sucesso! ${res.recalculated} observações recalculadas com o novo modelo.`);
        } else {
          setRecalcStatus('Erro ao recalcular observações.');
        }
        setTimeout(() => setRecalcStatus(''), 5000);
      });
    } else {
      setRecalcStatus('Simulação local: observações recalculadas.');
      setTimeout(() => setRecalcStatus(''), 3000);
    }
  };

  return (
    <div>
      <div className="header-banner">
        <div>
          <h2 className="page-title">Calibração do Modelo de Vendas (BSR ➔ Vendas)</h2>
          <div className="page-subtitle">Configure e ajuste a curva matemática de estimativa de vendas para cada marketplace</div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleResetDefaults}>
            Restaurar Padrão
          </button>
          <button className="btn btn-primary" onClick={handleSaveModel}>
            Salvar Alterações
          </button>
        </div>
      </div>

      {saveStatus && (
        <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px', color: '#34d399', marginBottom: '20px', fontWeight: 600 }}>
          {saveStatus}
        </div>
      )}

      {/* Seleção do Modelo Ativo */}
      <div className="data-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label">Selecione o Modelo / Marketplace:</label>
            <select
              className="input-field"
              value={selectedModelId}
              onChange={(e) => handleSelectModel(e.target.value)}
              style={{ width: '320px' }}
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.version})</option>
              ))}
            </select>
          </div>

          {activeModel && (
            <div>
              <label className="form-label">Método de Interpolação:</label>
              <select
                className="input-field"
                value={activeModel.method}
                onChange={(e: any) => setActiveModel({ ...activeModel, method: e.target.value })}
              >
                <option value="log-log">Regressão / Interpolação Log-Log (Recomendado para BSR)</option>
                <option value="linear">Interpolação Linear</option>
              </select>
            </div>
          )}

          {activeModel && (
            <div>
              <label className="form-label">Versão do Modelo:</label>
              <input
                type="text"
                className="input-field"
                value={activeModel.version}
                onChange={(e) => setActiveModel({ ...activeModel, version: e.target.value })}
                style={{ width: '180px' }}
              />
            </div>
          )}
        </div>
      </div>

      {activeModel && (
        <>
          {/* Gráfico da Curva */}
          <div className="data-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <CalibrationCurveChart points={activeModel.points} />
          </div>

          {/* Tabela de Calibração BSR x Vendas */}
          <div className="data-card">
            <div className="data-card-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                  Pontos de Calibração ({activeModel.points.length} pontos definidos)
                </h3>
                <span style={{ fontSize: '12px', color: '#8b96ad' }}>
                  A relação BSR vs Vendas Diárias é interpolada em espaço logarítmico entre estes pares.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={handleExportCsv}>
                  📥 Exportar CSV
                </button>
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  📤 Importar CSV
                  <input type="file" accept=".csv,.txt" onChange={handleImportCsv} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {/* Inserção de novo ponto */}
            <div style={{ padding: '16px 20px', background: '#10131a', borderBottom: '1px solid #1f2633', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#8b96ad' }}>Adicionar Ponto:</span>
              <input
                type="number"
                className="input-field"
                placeholder="BSR (ex: 1500)"
                value={newBsr}
                onChange={(e) => setNewBsr(e.target.value)}
                style={{ width: '140px' }}
              />
              <input
                type="text"
                className="input-field"
                placeholder="Vendas/dia (ex: 8.5)"
                value={newSales}
                onChange={(e) => setNewSales(e.target.value)}
                style={{ width: '140px' }}
              />
              <button className="btn btn-primary" onClick={handleAddPoint}>
                + Adicionar Ponto
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>BSR (Rank)</th>
                    <th>Vendas Estimadas / Dia</th>
                    <th>Vendas Estimadas / Mês (×30)</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {activeModel.points.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#60a5fa' }}>
                        #{p.bsr}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input-field"
                          value={p.dailySales}
                          onChange={(e) => handlePointChange(idx, 'dailySales', e.target.value)}
                          style={{ width: '90px', padding: '4px 8px' }}
                        />
                      </td>
                      <td style={{ color: '#34d399', fontWeight: 700 }}>
                        ≈ {Math.round(p.dailySales * 30)} vendas/mês
                      </td>
                      <td>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          onClick={() => handleRemovePoint(p.bsr)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recalcular Estimativas Históricas */}
          <div className="data-card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>
              🔄 Recalcular Observações Históricas
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94a3b8', lineHeight: 1.4 }}>
              Atualizou os pontos de calibração? Você pode reprocessar todas as estimativas calculadas no passado utilizando a nova fórmula. <strong>Seu BSR histórico original nunca será modificado</strong>, apenas as projeções de vendas, receita e royalties derivadas.
            </p>

            <button className="btn btn-primary" onClick={handleRecalculateAll}>
              Recalcular Todas as Estimativas com Este Modelo
            </button>

            {recalcStatus && (
              <span style={{ marginLeft: '14px', fontSize: '13px', color: '#60a5fa', fontWeight: 600 }}>
                {recalcStatus}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};
