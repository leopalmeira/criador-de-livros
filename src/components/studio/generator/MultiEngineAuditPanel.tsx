// ============================================================================
// BOOKENGIN MULTI-ENGINE — PAINEL DE CONTROLE E AUDITORIA NARRATIVA
// Toggles de orquestração InkOS, memória estruturada e auditor Webnovel Writer
// ============================================================================

import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Layers,
  Wrench,
  Search,
  BookOpen
} from 'lucide-react';
import {
  MultiEngineConfig,
  WebnovelReviewReport,
  WebnovelReviewIssue,
  GlobalEditorialAuditReport
} from '../../../services/multi-engine/contracts';

interface Props {
  config: MultiEngineConfig;
  onUpdateConfig: (newConfig: Partial<MultiEngineConfig>) => void;
  latestReport?: WebnovelReviewReport | null;
  globalAuditReport?: GlobalEditorialAuditReport | null;
  onRunGlobalAudit?: () => void;
  isAuditing?: boolean;
}

export const MultiEngineAuditPanel: React.FC<Props> = ({
  config,
  onUpdateConfig,
  latestReport,
  globalAuditReport,
  onRunGlobalAudit,
  isAuditing = false
}) => {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [selectedDimensionFilter, setSelectedDimensionFilter] = useState<string>('all');

  const issues = latestReport?.issues || [];
  const filteredIssues = selectedDimensionFilter === 'all'
    ? issues
    : issues.filter(i => i.category === selectedDimensionFilter);

  const confirmedContradictions = issues.filter(i => i.confidence === 'confirmed' && i.blocking);
  const possibleInconsistencies = issues.filter(i => i.confidence === 'possible' || !i.blocking);

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '18px 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
      {/* 1. CABEÇALHO DO MULTI-ENGINE & STATUS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #0284c7, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Cpu size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              Motor Multi-Engine: InkOS + Webnovel Writer
            </h3>
            <span style={{ fontSize: 11.5, color: '#64748b' }}>
              Orquestração de agentes, memória contínua determinística e auditoria em 5 dimensões
            </span>
          </div>
        </div>

        {onRunGlobalAudit && (
          <button
            type="button"
            onClick={onRunGlobalAudit}
            disabled={isAuditing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: isAuditing ? 'not-allowed' : 'pointer'
            }}
          >
            <Search size={14} /> {isAuditing ? 'Auditando Obra...' : 'Auditar Livro Completo (0 a 100)'}
          </button>
        )}
      </div>

      {/* 2. TOGGLES DE CONTROLE REAL DO BACKEND */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 10,
        background: '#f8fafc',
        padding: 12,
        borderRadius: 10,
        border: '1px solid #e2e8f0'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.inkosOrchestrationEnabled}
            onChange={(e) => onUpdateConfig({ inkosOrchestrationEnabled: e.target.checked })}
          />
          <Layers size={14} color="#0284c7" />
          <span>InkOS: Orquestrador Ativo</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.narrativeMemoryEnabled}
            onChange={(e) => onUpdateConfig({ narrativeMemoryEnabled: e.target.checked })}
          />
          <Database size={14} color="#059669" />
          <span>Memória Narrativa Ativa</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.webnovelAuditorEnabled}
            onChange={(e) => onUpdateConfig({ webnovelAuditorEnabled: e.target.checked })}
          />
          <ShieldAlert size={14} color="#d97706" />
          <span>Auditor Webnovel (5D)</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={config.autoCorrectionEnabled}
            onChange={(e) => onUpdateConfig({ autoCorrectionEnabled: e.target.checked })}
          />
          <Wrench size={14} color="#7c3aed" />
          <span>Autocorreção (Máx 3 Ciclos)</span>
        </label>
      </div>

      {/* 3. RELATÓRIO GLOBAL OU DO CAPÍTULO */}
      {globalAuditReport && (
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 10,
          padding: '14px 18px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>
                Auditoria Global da Obra Completa
              </span>
              <span style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 4,
                background: globalAuditReport.score >= 80 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                color: globalAuditReport.score >= 80 ? '#4ade80' : '#facc15',
                fontWeight: 800
              }}>
                {globalAuditReport.approvalStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
              {globalAuditReport.totalChaptersAudited} capítulos auditados ({globalAuditReport.totalWordsAudited} palavras) • {globalAuditReport.unresolvedContradictions.length} pendências críticas.
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#38bdf8' }}>
              {globalAuditReport.score}<span style={{ fontSize: 14, color: '#94a3b8' }}>/100</span>
            </div>
            <span style={{ fontSize: 10.5, color: '#94a3b8' }}>Pontuação Editorial KDP</span>
          </div>
        </div>
      )}

      {/* 4. PAINEL DE MÉTRICAS EM TEMPO REAL */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 10
      }}>
        <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>Capítulo Aprovado</span>
          <div style={{ fontSize: 16, fontWeight: 900, color: latestReport?.approved ? '#16a34a' : '#dc2626', marginTop: 2 }}>
            {latestReport ? (latestReport.approved ? '✓ Sim' : '❌ Não') : '—'}
          </div>
        </div>

        <div style={{ background: '#fef2f2', padding: 10, borderRadius: 8, border: '1px solid #fecaca', textAlign: 'center' }}>
          <span style={{ fontSize: 10.5, color: '#991b1b', fontWeight: 700 }}>Contradições Críticas</span>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#b91c1c', marginTop: 2 }}>
            {confirmedContradictions.length}
          </div>
        </div>

        <div style={{ background: '#fffbeb', padding: 10, borderRadius: 8, border: '1px solid #fde68a', textAlign: 'center' }}>
          <span style={{ fontSize: 10.5, color: '#92400e', fontWeight: 700 }}>Inconsistências Leves</span>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#d97706', marginTop: 2 }}>
            {possibleInconsistencies.length}
          </div>
        </div>

        <div style={{ background: '#f0fdf4', padding: 10, borderRadius: 8, border: '1px solid #bbf7d0', textAlign: 'center' }}>
          <span style={{ fontSize: 10.5, color: '#166534', fontWeight: 700 }}>Dimensões Passadas</span>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#15803d', marginTop: 2 }}>
            {latestReport ? Object.values(latestReport.dimensionResults).filter(d => d.conclusion === 'pass').length : 5}/5
          </div>
        </div>
      </div>

      {/* 5. LISTA DE PROBLEMAS E EVIDÊNCIAS AUDITADAS */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
            Problemas Narrativos & Evidências Textuais
          </span>

          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'setting', 'timeline', 'continuity', 'character', 'logic'].map((dim) => (
              <button
                key={dim}
                type="button"
                onClick={() => setSelectedDimensionFilter(dim)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  border: selectedDimensionFilter === dim ? '1px solid #0f172a' : '1px solid #cbd5e1',
                  background: selectedDimensionFilter === dim ? '#0f172a' : '#ffffff',
                  color: selectedDimensionFilter === dim ? '#ffffff' : '#475569',
                  cursor: 'pointer'
                }}
              >
                {dim.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', color: '#166534', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>Nenhum problema de continuidade detectado nesta seção. Coerência canônica preservada.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredIssues.map((issue) => {
              const isExpanded = expandedIssueId === issue.id;
              return (
                <div
                  key={issue.id}
                  style={{
                    background: issue.blocking ? '#fff5f5' : '#fffbeb',
                    border: issue.blocking ? '1px solid #fecaca' : '1px solid #fde68a',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 11.5
                  }}
                >
                  <div
                    onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', gap: 8 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      {issue.blocking ? (
                        <AlertTriangle size={15} color="#dc2626" />
                      ) : (
                        <ShieldAlert size={15} color="#d97706" />
                      )}
                      <span style={{ fontWeight: 800, color: issue.blocking ? '#991b1b' : '#92400e' }}>
                        [{issue.category.toUpperCase()}] {issue.description}
                      </span>
                    </div>

                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div>
                        <strong style={{ color: '#0f172a' }}>Local:</strong> {issue.location}
                      </div>
                      <div>
                        <strong style={{ color: '#0f172a' }}>Evidência Canônica Conflitante:</strong>
                        <div style={{ background: '#ffffff', padding: 6, borderRadius: 4, border: '1px solid #e2e8f0', marginTop: 2, fontFamily: 'monospace', fontSize: 10.5, color: '#334155' }}>
                          {issue.evidence}
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: '#059669' }}>Sugestão de Correção Editorial:</strong> {issue.fixHint}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

