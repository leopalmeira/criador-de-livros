import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Minimize, 
  BookOpen,
  Printer
} from 'lucide-react';
import type { PageViewMode } from '@vivliostyle/core';
import { BookProject } from '../../types/book-project';
import { EditorialHtmlBuilder } from '../../services/formats/editorial-html';

const LazyRenderer = React.lazy(async () => {
  const { Renderer } = await import('@vivliostyle/react');
  return { default: Renderer };
});

interface FullScreenPreviewModalProps {
  project: BookProject;
  isOpen: boolean;
  onClose: () => void;
  initialPageNumber?: number;
}

export const FullScreenPreviewModal: React.FC<FullScreenPreviewModalProps> = ({
  project,
  isOpen,
  onClose,
  initialPageNumber = 1
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(Math.max(0, initialPageNumber - 1));
  const [pageCount, setPageCount] = useState(0);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [source, setSource] = useState('');
  const [previewError, setPreviewError] = useState('');

  const trim = project.pageSettings?.trimSize || project.trimSize || '6x9';

  useEffect(() => {
    const html = EditorialHtmlBuilder.build(project);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    setSource(url);
    setPageCount(0);
    setPreviewError('');
    return () => URL.revokeObjectURL(url);
  }, [project]);

  useEffect(() => {
    if (isOpen) setCurrentPageIndex(Math.max(0, initialPageNumber - 1));
  }, [isOpen, initialPageNumber]);

  // Teclado para navegar com setas
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentPageIndex(prev => Math.min(pageCount - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPageIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, pageCount]);

  if (!isOpen) return null;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handlePrint = async () => {
    try {
      const { printHTML } = await import('@vivliostyle/core');
      printHTML(EditorialHtmlBuilder.build(project), {
        title: project.title || 'Livro',
        hideIframe: true,
        removeIframe: true,
        errorCallback: setPreviewError,
        printCallback: (printWindow) => printWindow.print()
      });
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Falha ao preparar impressão.');
    }
  };

  return (
    <div className="preview-fullscreen-overlay">
      {/* BARRA SUPERIOR DE CONTROLES */}
      <div className="preview-top-controls">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-primary-accent" />
          <span className="font-semibold text-sm">{project.title}</span>
          <span className="text-xs text-muted">({trim})</span>
        </div>

        <div className="preview-page-counter">
          <span>{pageCount ? `Página ${Math.min(currentPageIndex + 1, pageCount)} de ${pageCount}` : 'Calculando páginas...'}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* ZOOM */}
          <button 
            className="btn-icon-subtle" 
            onClick={() => setZoomScale(Math.max(0.7, zoomScale - 0.15))}
            title="Reduzir Zoom"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs">{Math.round(zoomScale * 100)}%</span>
          <button 
            className="btn-icon-subtle" 
            onClick={() => setZoomScale(Math.min(1.5, zoomScale + 0.15))}
            title="Aumentar Zoom"
          >
            <ZoomIn size={16} />
          </button>

          {/* FULLSCREEN */}
          <button className="btn-icon-subtle ml-2" onClick={toggleFullscreen} title="Tela Cheia">
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>

          <button className="btn-icon-subtle ml-2" onClick={handlePrint} title="Imprimir ou salvar como PDF" disabled={!source}>
            <Printer size={16} />
          </button>

          {/* FECHAR */}
          <button className="btn-icon-subtle ml-2" onClick={onClose} title="Sair do Preview">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ÁREA CENTRAL DO LIVRO (LEITURA) */}
      <div className="preview-reading-stage">
        {/* NAVEGAÇÃO ESQUERDA */}
        <button 
          className="btn-nav-page-floating nav-left" 
          onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
          disabled={currentPageIndex === 0}
        >
          <ChevronLeft size={32} />
        </button>

        <div className="vivliostyle-preview-frame" style={{ transform: `scale(${zoomScale})` }}>
          {source && (
            <React.Suspense fallback={<p className="preview-loading-message">Carregando motor de paginação...</p>}>
              <LazyRenderer
                source={source}
                page={currentPageIndex + 1}
                zoom={1}
                bookMode={false}
                renderAllPages
                pageViewMode={'singlePage' as PageViewMode}
                fitToScreen
                background="#090c10"
                style={{ width: 'min(92vw, 900px)', height: 'calc(100vh - 8rem)', minHeight: '420px' }}
                onLoad={(state) => setPageCount(state.epageCount)}
                onNavigation={(state) => setCurrentPageIndex(Math.max(0, state.epage))}
                onError={setPreviewError}
              />
            </React.Suspense>
          )}
          {previewError && <p role="alert" className="preview-error-message">{previewError}</p>}
          {source && !pageCount && !previewError && <p className="preview-loading-message">Diagramando páginas...</p>}
        </div>

        {/* NAVEGAÇÃO DIREITA */}
        <button 
          className="btn-nav-page-floating nav-right" 
          onClick={() => setCurrentPageIndex(Math.min(pageCount - 1, currentPageIndex + 1))}
          disabled={!pageCount || currentPageIndex >= pageCount - 1}
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </div>
  );
};
