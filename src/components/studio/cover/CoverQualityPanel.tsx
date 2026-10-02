import React, { useState } from 'react';
import { BookProject, TrimSize, PaperType } from '../../../types/book-project';
import { 
  CoverQualityChecker, 
  CoverQualityAuditReport 
} from '../../../services/cover-studio/cover-quality-checker';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  Ruler, 
  FileCheck, 
  Maximize2,
  BookOpen
} from 'lucide-react';

interface Props {
  project: BookProject;
  title: string;
  subtitle: string;
  author: string;
  artUrl: string;
  badgeText: string;
  showBadge: boolean;
  trimSize: TrimSize;
  paperType: PaperType;
  pageCount: number;
}

export const CoverQualityPanel: React.FC<Props> = ({
  project,
  title,
  subtitle,
  author,
  artUrl,
  badgeText,
  showBadge,
  trimSize,
  paperType,
  pageCount
}) => {
  const audit: CoverQualityAuditReport = CoverQualityChecker.auditCover(
    title,
    subtitle,
    author,
    artUrl,
    trimSize,
    pageCount,
    paperType,
    showBadge
  );

  return (
    <div className="cover-subpanel-container">
      {/* CARD DO SCORE GERAL */}
      <div className="panel-section-card" style={{ marginBottom: 16 }}>
        <div className="audit-score-hero-row">
          <div className="audit-score-circle" style={{ borderColor: audit.isApprovedForKdp ? '#10b981' : '#f59e0b' }}>
            <span className="score-number">{audit.overallScore}%</span>
            <span className="score-label">Score KDP</span>
          </div>

          <div className="audit-score-text-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {audit.isApprovedForKdp ? (
                <span className="badge-tag-green" style={{ fontSize: 13, padding: '4px 10px' }}>
                  <ShieldCheck size={14} /> 100% Em Conformidade com Amazon KDP
                </span>
              ) : (
                <span className="badge-tag-amber" style={{ fontSize: 13, padding: '4px 10px' }}>
                  <AlertTriangle size={14} /> Requer Pequenos Ajustes para Impressão
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              Auditoria gráfica automatizada verificando proporção 1:1.6 (Kindle), espessura de lombada por tipo de papel, margens de sangria (0.125") e legibilidade mobile.
            </p>
          </div>
        </div>

        {/* MÉTRICAS GEOMÉTRICAS DA LOMBADA E CAPA ABERTA */}
        <div className="geometry-specs-grid">
          <div className="spec-item-box">
            <span className="spec-label">Formato do Livro (Trim Size):</span>
            <span className="spec-val">{audit.geometry.trimWidthInches}" x {audit.geometry.trimHeightInches}"</span>
          </div>
          <div className="spec-item-box">
            <span className="spec-label">Espessura da Lombada (Spine):</span>
            <span className="spec-val">{audit.geometry.spineWidthInches}" ({audit.geometry.spineWidthMm} mm)</span>
          </div>
          <div className="spec-item-box">
            <span className="spec-label">Capa Aberta com Sangria:</span>
            <span className="spec-val">{audit.geometry.totalCoverWidthInches}" x {audit.geometry.totalCoverHeightInches}"</span>
          </div>
          <div className="spec-item-box">
            <span className="spec-label">Resolução a 300 DPI:</span>
            <span className="spec-val">{audit.geometry.totalCoverWidthPixels300Dpi} x {audit.geometry.totalCoverHeightPixels300Dpi} px</span>
          </div>
        </div>
      </div>

      {/* CHECKLIST DETALHADO DE VALIDAÇÃO */}
      <div className="panel-section-card">
        <h4 className="panel-card-title" style={{ marginBottom: 14 }}>
          <FileCheck size={18} color="#2563eb" /> Checklist de Conformidade Gráfica Amazon KDP
        </h4>

        <div className="audit-checklist-list">
          {audit.checks.map((chk) => (
            <div key={chk.id} className={`audit-check-card ${chk.status.toLowerCase()}`}>
              <div className="check-card-left">
                {chk.status === 'PASS' && <CheckCircle size={18} color="#10b981" />}
                {chk.status === 'WARN' && <AlertTriangle size={18} color="#f59e0b" />}
                {chk.status === 'FAIL' && <AlertTriangle size={18} color="#ef4444" />}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="chk-label-title">{chk.label}</span>
                    <span className={`chk-status-pill ${chk.status.toLowerCase()}`}>{chk.status}</span>
                  </div>
                  <p className="chk-detail-text">{chk.detail}</p>
                  {chk.recommendation && (
                    <span className="chk-recommendation-text">💡 Dica: {chk.recommendation}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
