import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Download, 
  FileText, 
  BookOpen, 
  Archive, 
  RefreshCw, 
  ExternalLink 
} from 'lucide-react';
import { BookProject, IBookQualityReport } from '../../types/book-project';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';
import { PdfBuilder } from '../../services/formats/pdf-builder';
import { EpubBuilder } from '../../services/formats/epub-builder';
import { KdpPackager } from '../../services/formats/kdp-packager';

interface ExportQualityViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  aiService: AiService;
}

export const ExportQualityView: React.FC<ExportQualityViewProps> = ({
  project,
  onUpdateProject,
  aiService
}) => {
  const [report, setReport] = useState<IBookQualityReport>(() => {
    const pipeline = new KdpBookPipeline(aiService);
    return pipeline.runQualityGate(project);
  });

  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleRunChecks = () => {
    const pipeline = new KdpBookPipeline(aiService);
    const rep = pipeline.runQualityGate(project);
    setReport(rep);
    onUpdateProject({ ...project, kdpQualityReport: rep });
  };

  const handleDownloadInteriorPdf = async () => {
    setIsExporting('pdf-interior');
    try {
      const blob = await PdfBuilder.buildInteriorPdf(project);
      downloadBlob(blob, `${project.title || 'Livro'}_Interior_${project.trimSize}.pdf`);
      setDownloadSuccess('PDF do Miolo Interior baixado com sucesso!');
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadCoverPdf = async () => {
    setIsExporting('pdf-cover');
    try {
      const pagesCount = project.actualPages || project.visualPages?.length || project.estimatedPages || 150;
      const blob = await PdfBuilder.buildCoverWrapPdf(project, pagesCount);
      downloadBlob(blob, `${project.title || 'Livro'}_Capa_FullWrap_${project.trimSize}.pdf`);
      setDownloadSuccess('PDF da Capa Completa Full-Wrap baixado!');
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadEpub = async () => {
    setIsExporting('epub');
    try {
      const blob = await EpubBuilder.buildEpub(project);
      downloadBlob(blob, `${project.title || 'Livro'}_Kindle.epub`);
      setDownloadSuccess('Arquivo EPUB 3 Kindle baixado!');
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadCompleteZip = async () => {
    setIsExporting('zip-complete');
    try {
      const blob = await KdpPackager.createKdpPackage(project);
      downloadBlob(blob, `Pacote_Completo_KDP_${project.title || 'Livro'}.zip`);
      onUpdateProject({ ...project, kdpPackageGeneratedAt: Date.now() });
      setDownloadSuccess('Pacote Completo KDP ZIP baixado com sucesso!');
    } finally {
      setIsExporting(null);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasCriticalBlocker = report.blockerCount > 0;

  return (
    <div className="export-quality-container">
      {/* HEADER */}
      <div className="export-top-bar">
        <div>
          <h3 className="text-xl font-bold">Validação de Qualidade & Exportação KDP</h3>
          <p className="text-xs text-muted">
            Auditoria automatizada das normas da Amazon KDP e geração de arquivos finais de alta resolução.
          </p>
        </div>

        <button className="btn-primary-action" onClick={handleRunChecks}>
          <RefreshCw size={14} /> Reexecutar Auditoria
        </button>
      </div>

      {downloadSuccess && (
        <div className="toast-success-banner mt-3">
          <CheckCircle2 size={16} />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* PAINEL DE CHECKS DE QUALIDADE (QUALITY GATE) */}
      <div className="quality-gate-dashboard-card mt-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className={`score-badge-circle ${report.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <span>{report.overallScore}%</span>
            </div>
            <div>
              <h4 className="font-bold text-base">
                {report.passed ? 'Aprovado para Publicação KDP' : 'Atenção aos Requisitos de Publicação'}
              </h4>
              <span className="text-xs text-muted">
                {report.blockerCount} bloqueadores críticos • {report.warningCount} avisos recomendados
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Status Geral:</span>
            {report.passed ? (
              <span className="badge-pass">PASS ✓</span>
            ) : (
              <span className="badge-warning">ATENÇÃO ⚠</span>
            )}
          </div>
        </div>

        {/* LISTA DE CHECKS ESPECÍFICOS */}
        <div className="checks-items-stack">
          {report.checks.map((chk) => (
            <div key={chk.id} className={`check-row-card ${chk.passed ? 'check-pass' : chk.severity === 'blocker' ? 'check-error' : 'check-warning'}`}>
              <div className="check-left-indicator">
                {chk.passed ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : chk.severity === 'blocker' ? (
                  <XCircle size={18} className="text-rose-400" />
                ) : (
                  <AlertTriangle size={18} className="text-amber-400" />
                )}
                <div>
                  <span className="check-name">{chk.name}</span>
                  <p className="check-details">{chk.details}</p>
                </div>
              </div>

              <div className="check-right-status">
                <span className={`status-pill ${chk.passed ? 'pill-pass' : chk.severity === 'blocker' ? 'pill-error' : 'pill-warn'}`}>
                  {chk.passed ? 'OK' : chk.severity === 'blocker' ? 'ERRO' : 'AVISO'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ÁREA DE EXPORTAÇÃO DE ARQUIVOS */}
      <div className="export-files-section mt-6">
        <h4 className="section-heading mb-3">Exportar Arquivos da Obra</h4>

        {hasCriticalBlocker && (
          <div className="blocker-alert-box mb-4">
            <AlertTriangle size={18} className="text-rose-400" />
            <span className="text-xs">
              Existem itens com erro crítico no checklist. É altamente recomendável revisá-los antes de publicar na Amazon.
            </span>
          </div>
        )}

        <div className="export-cards-grid">
          {/* CARD: PDF INTERIOR */}
          <div className="export-action-card">
            <div className="export-icon-box text-blue-400">
              <FileText size={28} />
            </div>
            <h5 className="font-semibold text-sm mb-1">Miolo do Livro (Interior.pdf)</h5>
            <p className="text-xs text-muted mb-4">
              PDF diagramado com margens KDP, páginas preliminares, sumário e cabeçalhos.
            </p>
            <button 
              className="btn-download-action" 
              onClick={handleDownloadInteriorPdf}
              disabled={isExporting !== null}
            >
              <Download size={14} />
              {isExporting === 'pdf-interior' ? 'Gerando...' : 'Baixar Interior PDF'}
            </button>
          </div>

          {/* CARD: CAPA COMPLETA */}
          <div className="export-action-card">
            <div className="export-icon-box text-amber-400">
              <BookOpen size={28} />
            </div>
            <h5 className="font-semibold text-sm mb-1">Capa Aberta (Capa-Wrap.pdf)</h5>
            <p className="text-xs text-muted mb-4">
              Frente + Lombada exata para {project.actualPages || project.estimatedPages} págs + Contracapa e sangria.
            </p>
            <button 
              className="btn-download-action" 
              onClick={handleDownloadCoverPdf}
              disabled={isExporting !== null}
            >
              <Download size={14} />
              {isExporting === 'pdf-cover' ? 'Gerando...' : 'Baixar Capa PDF'}
            </button>
          </div>

          {/* CARD: EPUB KINDLE */}
          <div className="export-action-card">
            <div className="export-icon-box text-purple-400">
              <BookOpen size={28} />
            </div>
            <h5 className="font-semibold text-sm mb-1">E-book Kindle (EPUB 3)</h5>
            <p className="text-xs text-muted mb-4">
              Arquivo digital responsivo com sumário de navegação XML e folha de estilos.
            </p>
            <button 
              className="btn-download-action" 
              onClick={handleDownloadEpub}
              disabled={isExporting !== null}
            >
              <Download size={14} />
              {isExporting === 'epub' ? 'Gerando...' : 'Baixar EPUB'}
            </button>
          </div>

          {/* CARD: PACOTE COMPLETO ZIP */}
          <div className="export-action-card highlight-glow">
            <div className="export-icon-box text-emerald-400">
              <Archive size={28} />
            </div>
            <h5 className="font-semibold text-sm mb-1">Pacote Completo KDP (ZIP)</h5>
            <p className="text-xs text-muted mb-4">
              Todos os arquivos reunidos: Interior, Capa, EPUB, Metadados e Relatório.
            </p>
            <button 
              className="btn-download-primary" 
              onClick={handleDownloadCompleteZip}
              disabled={isExporting !== null}
            >
              <Download size={14} />
              {isExporting === 'zip-complete' ? 'Empacotando...' : 'Baixar Pacote Completo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
