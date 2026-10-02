import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Rocket, 
  Archive, 
  FileText, 
  BookOpen, 
  Download, 
  ExternalLink, 
  Home, 
  X,
  Award,
  Sparkles
} from 'lucide-react';
import { BookProject } from '../../types/book-project';
import { PdfBuilder } from '../../services/formats/pdf-builder';
import { EpubBuilder } from '../../services/formats/epub-builder';
import { KdpPackager } from '../../services/formats/kdp-packager';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project: BookProject;
  onReturnToDashboard: () => void;
}

export const PublishSuccessModal: React.FC<Props> = ({
  isOpen,
  onClose,
  project,
  onReturnToDashboard
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetPages = project.actualPages || project.estimatedPages || 150;

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    setDownloadingId('zip');
    try {
      const blob = await KdpPackager.createKdpPackage(project);
      triggerDownload(blob, `Pacote_Completo_KDP_${project.title || 'Livro'}.zip`);
      setDownloadSuccessMsg('Pacote Completo KDP ZIP baixado com sucesso!');
    } catch (err: any) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadInterior = async () => {
    setDownloadingId('interior');
    try {
      const blob = await PdfBuilder.buildInteriorPdf(project);
      triggerDownload(blob, `${project.title || 'Livro'}_Interior_${project.trimSize || '6x9'}.pdf`);
      setDownloadSuccessMsg('PDF do Miolo Interior baixado!');
    } catch (err: any) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadCover = async () => {
    setDownloadingId('cover');
    try {
      const blob = await PdfBuilder.buildCoverWrapPdf(project, targetPages);
      triggerDownload(blob, `${project.title || 'Livro'}_Capa_FullWrap_${project.trimSize || '6x9'}.pdf`);
      setDownloadSuccessMsg('PDF da Capa Full-Wrap baixado!');
    } catch (err: any) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadEpub = async () => {
    setDownloadingId('epub');
    try {
      const blob = await EpubBuilder.buildEpub(project);
      triggerDownload(blob, `${project.title || 'Livro'}_Kindle.epub`);
      setDownloadSuccessMsg('Arquivo EPUB Kindle baixado!');
    } catch (err: any) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div className="publish-success-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Topo do Modal */}
        <div className="flex justify-between items-start mb-3">
          <span className="publish-badge-pill">
            <Award size={14} /> PUBLICADO NA AMAZON KDP
          </span>
          <button 
            className="text-slate-400 hover:text-white p-1 rounded-md transition" 
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Título & Mensagem de Parabéns */}
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <span>🎉 Obra Finalizada com Sucesso!</span>
        </h2>
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          O seu livro <strong className="text-white">“{project.title || 'Sem título'}”</strong> por <strong className="text-white">{project.author || 'Autor'}</strong> foi auditado, diagramado e gerado em total conformidade com as normas editoriais e de impressão da Amazon KDP.
        </p>

        {/* Card Resumo do Livro */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Formato KDP</span>
            <strong className="text-white font-semibold">{project.trimSize || '6x9'} pol.</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Volume de Páginas</span>
            <strong className="text-white font-semibold">{targetPages} páginas</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Capítulos</span>
            <strong className="text-white font-semibold">{(project.kdpChapters || []).length} capítulos</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Status Geral</span>
            <span className="text-emerald-400 font-bold">100% Homologado</span>
          </div>
        </div>

        {downloadSuccessMsg && (
          <div className="toast-success-banner mb-3 py-2 px-3 text-xs">
            <CheckCircle2 size={14} />
            <span>{downloadSuccessMsg}</span>
          </div>
        )}

        {/* Seção de Downloads */}
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
          Baixar Arquivos Finais Prontos para Publicação:
        </span>

        <div className="publish-download-grid">
          {/* PACOTE COMPLETO ZIP */}
          <button 
            className="publish-download-btn primary-zip"
            onClick={handleDownloadZip}
            disabled={downloadingId !== null}
          >
            <div className="publish-download-icon">
              <Archive size={20} className={downloadingId === 'zip' ? 'animate-spin' : ''} />
            </div>
            <div>
              <strong className="block text-sm">Pacote Completo KDP (.ZIP)</strong>
              <span className="text-xs text-blue-100">
                {downloadingId === 'zip' ? 'Gerando pacote...' : 'Miolo PDF + Capa + EPUB + Metadados + Sinopse'}
              </span>
            </div>
          </button>

          {/* MIOLO INTERIOR PDF */}
          <button 
            className="publish-download-btn"
            onClick={handleDownloadInterior}
            disabled={downloadingId !== null}
          >
            <div className="publish-download-icon text-emerald-400">
              <FileText size={18} className={downloadingId === 'interior' ? 'animate-spin' : ''} />
            </div>
            <div>
              <strong className="block text-sm">PDF do Miolo Interior</strong>
              <span className="text-xs text-slate-400">
                {downloadingId === 'interior' ? 'Diagramando...' : 'Formatado para impressão KDP'}
              </span>
            </div>
          </button>

          {/* CAPA FULL-WRAP PDF */}
          <button 
            className="publish-download-btn"
            onClick={handleDownloadCover}
            disabled={downloadingId !== null}
          >
            <div className="publish-download-icon text-amber-400">
              <Download size={18} className={downloadingId === 'cover' ? 'animate-spin' : ''} />
            </div>
            <div>
              <strong className="block text-sm">PDF da Capa Full-Wrap</strong>
              <span className="text-xs text-slate-400">
                {downloadingId === 'cover' ? 'Renderizando...' : 'Capa + Lombada + Contracapa KDP'}
              </span>
            </div>
          </button>

          {/* KINDLE EPUB */}
          <button 
            className="publish-download-btn"
            onClick={handleDownloadEpub}
            disabled={downloadingId !== null}
          >
            <div className="publish-download-icon text-indigo-400">
              <BookOpen size={18} className={downloadingId === 'epub' ? 'animate-spin' : ''} />
            </div>
            <div>
              <strong className="block text-sm">E-book Kindle (.EPUB)</strong>
              <span className="text-xs text-slate-400">
                {downloadingId === 'epub' ? 'Empacotando...' : 'Pronto para Kindle Direct Publishing'}
              </span>
            </div>
          </button>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-800 mt-2">
          <button
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
            onClick={onReturnToDashboard}
          >
            <Home size={14} /> Voltar aos Meus Livros
          </button>

          <button
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
            onClick={onClose}
          >
            Fechar e Continuar no Studio
          </button>
        </div>
      </div>
    </div>
  );
};
