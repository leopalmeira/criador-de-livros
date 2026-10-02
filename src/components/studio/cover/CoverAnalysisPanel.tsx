import React, { useState } from 'react';
import { BookProject } from '../../../types/book-project';
import { 
  CoverMarketIntelService, 
  BookVisualAnalysis, 
  MarketVisualTrend, 
  VisualBriefing 
} from '../../../services/cover-studio/cover-market-intel';
import { 
  Compass, 
  TrendingUp, 
  Palette, 
  FileText, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';

interface Props {
  project: BookProject;
  onApplyArtDirection?: (palette: any, typography: any) => void;
}

export const CoverAnalysisPanel: React.FC<Props> = ({ project, onApplyArtDirection }) => {
  const [copiedBrief, setCopiedBrief] = useState(false);

  const analysis: BookVisualAnalysis = CoverMarketIntelService.analyzeBookForCover(project);
  const marketTrend: MarketVisualTrend = CoverMarketIntelService.analyzeVisualMarket(project.genre || project.kdpBookType);
  const briefing: VisualBriefing = CoverMarketIntelService.generateVisualBriefing(project);

  const handleCopyBriefing = () => {
    navigator.clipboard.writeText(briefing.fullMarkdownBrief);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 3000);
  };

  return (
    <div className="cover-subpanel-container">
      {/* 1. ANÁLISE CONCEITUAL DO LIVRO */}
      <div className="panel-section-card" style={{ marginBottom: 16 }}>
        <div className="panel-card-header-row">
          <h4 className="panel-card-title">
            <Compass size={18} color="#2563eb" /> 1. Análise Semântica & Conceitual do Livro
          </h4>
          <span className="badge-tag-blue">Conceito Central</span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
          {analysis.coreConcept}
        </p>

        <div className="analysis-grid-2col">
          <div className="analysis-metric-box">
            <span className="metric-box-label">Gatilho Emocional do Leitor:</span>
            <span className="metric-box-value">{analysis.emotionalTrigger}</span>
          </div>
          <div className="analysis-metric-box">
            <span className="metric-box-label">Ponto Focal Recomendado:</span>
            <span className="metric-box-value">{analysis.keyFocalPoint}</span>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}>
            Metáforas Visuais Recomendadas para Composição:
          </span>
          <ul className="metaphors-list">
            {analysis.visualMetaphors.map((m, idx) => (
              <li key={idx}><Sparkles size={12} color="#fbbf24" /> {m}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 2. ANÁLISE VISUAL DE MERCADO KDP */}
      <div className="panel-section-card" style={{ marginBottom: 16 }}>
        <div className="panel-card-header-row">
          <h4 className="panel-card-title">
            <TrendingUp size={18} color="#10b981" /> 2. Inteligência Visual de Mercado • Nicho: {marketTrend.genre}
          </h4>
          <span className="badge-tag-green">Demanda: {marketTrend.marketDemand}</span>
        </div>

        {/* Paleta Best-Seller */}
        <div className="palette-preview-card">
          <div className="palette-info-row">
            <span style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc' }}>
              Paleta Vencedora: {marketTrend.bestsellerColorPalette.name}
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Padrão Best-Seller Amazon</span>
          </div>
          <p style={{ fontSize: 12, color: '#cbd5e1', margin: '4px 0 10px 0' }}>
            {marketTrend.bestsellerColorPalette.description}
          </p>
          <div className="swatches-bar">
            <div className="swatch-item" style={{ background: marketTrend.bestsellerColorPalette.primaryHex }} title="Primária (Título)" />
            <div className="swatch-item" style={{ background: marketTrend.bestsellerColorPalette.secondaryHex }} title="Secundária (Subtítulo)" />
            <div className="swatch-item" style={{ background: marketTrend.bestsellerColorPalette.accentHex }} title="Acento (Selo)" />
            <div className="swatch-item" style={{ background: marketTrend.bestsellerColorPalette.bgHex }} title="Fundo Escuro" />
          </div>
        </div>

        {/* Gaps de Concorrentes */}
        <div style={{ marginTop: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>
            Falhas Comuns dos Concorrentes (Como se Destacar):
          </span>
          <ul className="competitor-gaps-list">
            {marketTrend.competitorGaps.map((gap, idx) => (
              <li key={idx}>⚠️ {gap}</li>
            ))}
          </ul>
        </div>

        {/* Dicas para Miniatura na Busca Mobile */}
        <div style={{ marginTop: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
            Regras de Conversão na Miniatura da Amazon (Thumbnail):
          </span>
          <ul className="thumbnail-tips-list">
            {marketTrend.amazonThumbnailTips.map((tip, idx) => (
              <li key={idx}>💡 {tip}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. BRIEFING VISUAL PROFISSIONAL */}
      <div className="panel-section-card">
        <div className="panel-card-header-row">
          <h4 className="panel-card-title">
            <FileText size={18} color="#a855f7" /> 3. Briefing Visual Completo para IA & Direção de Arte
          </h4>
          <button 
            type="button" 
            className="btn-copy-brief"
            onClick={handleCopyBriefing}
          >
            {copiedBrief ? <><Check size={14} /> Briefing Copiado!</> : <><Copy size={14} /> Copiar Briefing Markdown</>}
          </button>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10 }}>
          Este briefing estruturado contém todos os parâmetros editoriais para criar a capa com IA ou instruir um designer.
        </p>
        <pre className="briefing-pre-box">
          {briefing.fullMarkdownBrief}
        </pre>
      </div>
    </div>
  );
};
