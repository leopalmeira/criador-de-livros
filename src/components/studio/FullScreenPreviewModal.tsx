import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Minimize, 
  BookOpen 
} from 'lucide-react';
import { EditorialArtService } from '../../services/editorial-art-service';
import { WatermarkArtService } from '../../services/watermark-art-service';
import { Sparkles, Layers } from 'lucide-react';
import { BookProject, BookVisualPage, PageElement, TRIM_SIZE_METRICS } from '../../types/book-project';
import { PageEngine } from '../../services/page-engine';

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
  if (!isOpen) return null;

  const pages: BookVisualPage[] = (project.visualPages && project.visualPages.length > 0)
    ? project.visualPages
    : PageEngine.generateVisualPagesFromManuscript(project);

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(Math.max(0, initialPageNumber - 1));
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Estados da Sombra Temática da História (Marca d'água de 0% a 5%)
  const [enableWatermark, setEnableWatermark] = useState<boolean>(true);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(3.0); // 0 a 5%

  const trim = project.pageSettings?.trimSize || project.trimSize || '6x9';
  const metric = TRIM_SIZE_METRICS[trim] || TRIM_SIZE_METRICS['6x9'];
  const aspectRatio = metric.heightInches / metric.widthInches;

  const currentPage = pages[currentPageIndex] || pages[0];

  // Teclado para navegar com setas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentPageIndex(prev => Math.min(pages.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPageIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
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

        {/* CONTROLE DE SOMBRA / FILIGRANA TEMÁTICA DA HISTÓRIA (0 A 5%) */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs">
          <button
            type="button"
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors font-semibold ${
              enableWatermark 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            onClick={() => setEnableWatermark(!enableWatermark)}
            title="Alterna a exibição da silhueta/sombra temática da história em cada página."
          >
            <Sparkles size={13} />
            <span>Sombra Temática: {enableWatermark ? 'LIGADA' : 'DESLIGADA'}</span>
          </button>

          {enableWatermark && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <span className="text-[11px] text-slate-300 whitespace-nowrap">
                Intensidade: <strong className="text-blue-400">{watermarkOpacity.toFixed(1)}%</strong>
              </span>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                className="w-24 accent-blue-500 cursor-pointer h-1.5"
                title="Deslize para ajustar a opacidade da sombra temática (de 0% a 5% de pixel)."
              />
            </div>
          )}
        </div>

        <div className="preview-page-counter">
          <span>Página {currentPageIndex + 1} de {pages.length}</span>
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

        {/* FOLHA DO LIVRO EDITORIAL REALISTA */}
        <div 
          className="preview-book-sheet"
          style={{
            transform: `scale(${zoomScale})`,
            maxWidth: '680px',
            width: '92%',
            minHeight: '840px',
            position: 'relative'
          }}
        >
          {/* SOMBRA / FILIGRANA TEMÁTICA DA HISTÓRIA (0% A 5% DE OPACIDADE, ROTATIVA E NUNCA SE REPETE) */}
          {enableWatermark && watermarkOpacity > 0 && (
            <div 
              className="preview-sheet-watermark"
              style={{
                position: 'absolute',
                inset: '20% 12% 12% 12%',
                backgroundImage: `url("${WatermarkArtService.getWatermarkSvgDataUrl(currentPageIndex + 1, currentPage?.chapterIndex || 1, watermarkOpacity)}")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundSize: 'contain',
                pointerEvents: 'none',
                zIndex: 1,
                transition: 'opacity 0.2s ease'
              }}
              title={`Sombra temática da página: ${WatermarkArtService.getMotifForPage(currentPageIndex + 1, currentPage?.chapterIndex || 1).name}`}
            />
          )}

          {/* CABEÇALHO DA PÁGINA (SEM NOME DO AUTOR) */}
          {currentPage?.headerText && (
            <div className="preview-sheet-header" style={{ position: 'relative', zIndex: 2 }}>
              <span>
                {currentPage.headerText
                  .replace(new RegExp(`por\\s*${project.author || ''}`, 'i'), '')
                  .replace(new RegExp(`${project.author || ''}`, 'i'), '')
                  .trim() || project.title}
              </span>
            </div>
          )}

          {/* CONTEÚDO EDITORIAL */}
          <div className="preview-sheet-elements" style={{ position: 'relative', zIndex: 2 }}>
            {currentPage?.elements?.map((elem: PageElement, idx: number) => (
              <div key={elem.id} className={`preview-elem elem-${elem.type}`}>
                {elem.type === 'chapter-title' ? (
                  <h3 className="preview-chapter-title">{elem.content}</h3>
                ) : elem.type === 'heading' ? (
                  <h4 className="preview-heading">{elem.content}</h4>
                ) : elem.type === 'quote' ? (
                  <blockquote className="preview-quote">{elem.content}</blockquote>
                ) : elem.type === 'callout' ? (
                  <div className="preview-callout">{elem.content}</div>
                ) : elem.type === 'image' && elem.imageUrl ? (
                  <div className="preview-img-box">
                    <img 
                      src={elem.imageUrl} 
                      alt={elem.caption || "Ilustração do Livro"} 
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = EditorialArtService.getEditorialFallbackSvg(elem.caption || 'Ilustração do Livro', project.title);
                      }}
                    />
                    {elem.caption && <span className="preview-img-caption">{elem.caption}</span>}
                  </div>
                ) : (
                  <p className="preview-paragraph">{elem.content}</p>
                )}
              </div>
            ))}
          </div>

          {/* NÚMERO DA PÁGINA */}
          {currentPage?.footerText && (
            <div className="preview-sheet-footer">
              <span>{currentPage.footerText}</span>
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO DIREITA */}
        <button 
          className="btn-nav-page-floating nav-right" 
          onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
          disabled={currentPageIndex >= pages.length - 1}
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </div>
  );
};
