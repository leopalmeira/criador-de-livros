import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Info,
  Wand2,
  ChevronDown,
  ChevronUp,
  FileCheck2
} from 'lucide-react';
import { BookProject } from '../../types/book-project';
import { BookAuditReport } from '../../types/book-audit';
import { BookAuditService } from '../../services/book-audit-service';
import '../../styles/book-audit.css';

interface Props {
  project: BookProject;
  report: BookAuditReport;
  onRefreshAudit: () => void;
  onUpdateProject: (p: BookProject) => void;
}

export const BookAuditReportView: React.FC<Props> = ({
  project,
  report,
  onRefreshAudit,
  onUpdateProject
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'important' | 'passed'>('all');
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);

  const handleApplyFix = (action: string) => {
    const fixed = BookAuditService.applyAutoFix(project, action);
    onUpdateProject(fixed);
    onRefreshAudit();
  };

  const filteredChecks = report.checks.filter(chk => {
    if (filterSeverity === 'all') return true;
    if (filterSeverity === 'critical') return !chk.passed && chk.severity === 'critical';
    if (filterSeverity === 'important') return !chk.passed && chk.severity === 'important';
    if (filterSeverity === 'passed') return chk.passed;
    return true;
  });

  const getStatusBadge = () => {
    if (report.overallStatus === 'approved') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
          <CheckCircle2 size={13} />
          APROVADO
        </span>
      );
    }
    if (report.overallStatus === 'blocked') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}>
          <XCircle size={13} />
          BLOQUEADO ({report.criticalCount} Crítico{report.criticalCount > 1 ? 's' : ''})
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>
        <AlertTriangle size={13} />
        ATENÇÃO ({report.importantCount + report.warningCount} Avisos)
      </span>
    );
  };

  const shieldClass = report.overallStatus === 'approved' ? 'approved' : report.overallStatus === 'blocked' ? 'blocked' : 'warning';

  return (
    <div className="book-audit-container">
      {/* HEADER DA AUDITORIA */}
      <div className="audit-header-row">
        <div className="audit-header-left">
          <div className={`audit-icon-shield ${shieldClass}`}>
            <ShieldCheck size={28} />
          </div>

          <div className="audit-title-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {getStatusBadge()}
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Auditoria Final KDP • {report.passedCount}/{report.totalChecks} Requisitos Concluídos
              </span>
            </div>
            <h3>Auditoria Final Completa do Livro</h3>
            <p>Controle de qualidade editorial antes da geração dos arquivos finais para publicação.</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Índice Editorial</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: report.score >= 90 ? '#059669' : report.score >= 70 ? '#d97706' : '#e11d48' }}>
              {report.score}%
            </span>
          </div>

          <button
            onClick={onRefreshAudit}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer' }}
            title="Executa novamente todas as verificações do checklist editorial"
          >
            <RefreshCw size={13} />
            Revalidar Livro
          </button>
        </div>
      </div>

      {/* ESTATÍSTICAS REAIS DA VERSÃO FINAL (SEÇÃO 44.15) */}
      <div className="audit-stats-grid">
        <div className="audit-stat-card">
          <span className="audit-stat-label">Capítulos</span>
          <span className="audit-stat-val">{report.realStats.chaptersCount}</span>
        </div>
        <div className="audit-stat-card">
          <span className="audit-stat-label">Seções</span>
          <span className="audit-stat-val">{report.realStats.sectionsCount}</span>
        </div>
        <div className="audit-stat-card">
          <span className="audit-stat-label">Páginas Reais</span>
          <span className="audit-stat-val">{report.realStats.pagesCount}</span>
        </div>
        <div className="audit-stat-card">
          <span className="audit-stat-label">Palavras</span>
          <span className="audit-stat-val">{report.realStats.wordsCount.toLocaleString()}</span>
        </div>
        <div className="audit-stat-card">
          <span className="audit-stat-label">Caracteres</span>
          <span className="audit-stat-val">{report.realStats.charactersCount.toLocaleString()}</span>
        </div>
        <div className="audit-stat-card">
          <span className="audit-stat-label">Imagens</span>
          <span className="audit-stat-val">{report.realStats.imagesCount}</span>
        </div>
      </div>

      {/* ANÁLISE DE SIMILARIDADE & ORIGINALIDADE (SEÇÃO 44.11) */}
      <div className={`audit-similarity-banner ${report.similarityRisk}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileCheck2 size={18} color="#2563eb" />
          <div>
            <strong style={{ fontSize: 12.5, color: '#0f172a', display: 'block' }}>
              {report.similaritySummary}
            </strong>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Índice estocástico de originalidade conforme padrões da Seção 44.11.
            </span>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)' }}>
          Risco: {report.similarityRisk.toUpperCase()} (~{report.similarityPercentage}%)
        </span>
      </div>

      {/* FILTROS RÁPIDOS */}
      <div className="audit-filter-row">
        <button
          onClick={() => setFilterSeverity('all')}
          className={`audit-filter-btn ${filterSeverity === 'all' ? 'active' : ''}`}
        >
          Todos ({report.totalChecks})
        </button>
        <button
          onClick={() => setFilterSeverity('critical')}
          className={`audit-filter-btn ${filterSeverity === 'critical' ? 'active' : ''}`}
        >
          Críticos ({report.criticalCount})
        </button>
        <button
          onClick={() => setFilterSeverity('important')}
          className={`audit-filter-btn ${filterSeverity === 'important' ? 'active' : ''}`}
        >
          Avisos ({report.importantCount + report.warningCount})
        </button>
        <button
          onClick={() => setFilterSeverity('passed')}
          className={`audit-filter-btn ${filterSeverity === 'passed' ? 'active' : ''}`}
        >
          Aprovados ({report.passedCount})
        </button>
      </div>

      {/* LISTA DE ITENS DO CHECKLIST */}
      <div className="audit-checks-stack">
        {filteredChecks.map((chk) => {
          const isExpanded = expandedCheckId === chk.id;
          const cardClass = chk.passed ? 'pass' : chk.severity === 'critical' ? 'critical' : 'warning';

          return (
            <div key={chk.id} className={`audit-check-card ${cardClass}`}>
              <div className="audit-check-main-row">
                <div className="audit-check-left">
                  {chk.passed ? (
                    <CheckCircle2 size={16} color="#059669" />
                  ) : chk.severity === 'critical' ? (
                    <XCircle size={16} color="#e11d48" />
                  ) : (
                    <AlertTriangle size={16} color="#d97706" />
                  )}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="audit-check-title">{chk.name}</span>
                      <span className="audit-check-tag">{chk.categoryLabel}</span>
                    </div>
                    <p className="audit-check-details">{chk.details}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {!chk.passed && chk.autoFixAvailable && chk.fixAction && (
                    <button
                      onClick={() => handleApplyFix(chk.fixAction!)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f59e0b', color: '#0f172a', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Wand2 size={11} /> Corrigir
                    </button>
                  )}

                  <button
                    onClick={() => setExpandedCheckId(isExpanded ? null : chk.id)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isExpanded && chk.suggestion && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: 12, color: '#475569', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <Info size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block', marginBottom: 2 }}>Diretriz Editorial:</strong>
                    <span>{chk.suggestion}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ACHADOS ANTI-ALUCINAÇÃO (SEÇÃO 44.10) */}
      {report.hallucinationFindings.length > 0 && (
        <div style={{ marginTop: 20, padding: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={15} color="#d97706" />
            <strong style={{ fontSize: 12, color: '#92400e', textTransform: 'uppercase' }}>
              Afirmações Factuais Sinalizadas para Conferência (Anti-Alucinação)
            </strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.hallucinationFindings.map((finding, idx) => (
              <div key={idx} style={{ padding: '8px 10px', background: '#ffffff', border: '1px solid #fef3c7', borderRadius: 6, fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong>"{finding.item}"</strong>
                  <span style={{ color: '#64748b', display: 'block', marginTop: 2 }}>{finding.location} • {finding.reason}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: '#fef3c7', color: '#b45309', borderRadius: 4 }}>
                  VERIFICAR
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
