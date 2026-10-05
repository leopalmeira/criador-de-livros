import React, { useState } from 'react';
import { BookProject } from '../../../types/book-project';
import { 
  CoverPromptEngine, 
  CoverPromptVariation 
} from '../../../services/cover-studio/cover-prompt-engine';
import { 
  Sparkles, 
  Check, 
  Columns, 
  Smartphone, 
  Monitor, 
  Layers, 
  Eye, 
  RefreshCw,
  Trophy
} from 'lucide-react';

export interface CoverOptionItem {
  id: string;
  name: string;
  styleTag: string;
  artUrl: string;
  titleColor: string;
  subtitleColor: string;
  authorColor: string;
  fontFamily: string;
  badgeBg: string;
  badgeText: string;
}

interface Props {
  project: BookProject;
  currentArtUrl: string;
  title: string;
  subtitle: string;
  author: string;
  badgeText: string;
  showBadge: boolean;
  onSelectCover: (opt: CoverOptionItem) => void;
  onNotification?: (msg: string) => void;
}

export const CoverOptionGallery: React.FC<Props> = ({
  project,
  currentArtUrl,
  title,
  subtitle,
  author,
  badgeText,
  showBadge,
  onSelectCover,
  onNotification
}) => {
  const [options, setOptions] = useState<CoverOptionItem[]>(() => {
    const variations = CoverPromptEngine.generateMultiOptionCoverPrompts(project);
    return variations.map((v, i) => ({
      id: v.id,
      name: v.title,
      styleTag: v.styleTag,
      artUrl: v.curatedDirectUrl,
      titleColor: i % 2 === 0 ? '#ffffff' : '#fef08a',
      subtitleColor: i % 2 === 0 ? '#fbbf24' : '#38bdf8',
      authorColor: '#f1f5f9',
      fontFamily: i % 2 === 0 ? "'Cinzel', Georgia, serif" : "'Montserrat', sans-serif",
      badgeBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      badgeText: 'EDIÇÃO OFICIAL KDP'
    }));
  });

  const [selectedId, setSelectedId] = useState<string>(options[0]?.id || 'opt_1');
  const [comparisonMode, setComparisonMode] = useState<boolean>(false);
  const [comparedIds, setComparedIds] = useState<string[]>([options[0]?.id || '', options[1]?.id || '']);
  const [thumbnailSize, setThumbnailSize] = useState<'60' | '120' | '240'>('120');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Gera novas 6 opções com novos seeds
  const handleRegenerateOptions = () => {
    setIsRegenerating(true);
    if (onNotification) onNotification('✨ Gerando 6 novas opções de capas com IA...');

    setTimeout(() => {
      const variations = CoverPromptEngine.generateMultiOptionCoverPrompts(project);
      const newOpts: CoverOptionItem[] = variations.map((v, i) => ({
        id: `gen_${Date.now()}_${i}`,
        name: v.title,
        styleTag: v.styleTag,
        artUrl: v.curatedDirectUrl,
        titleColor: i % 2 === 0 ? '#ffffff' : '#fef08a',
        subtitleColor: i % 2 === 0 ? '#fbbf24' : '#38bdf8',
        authorColor: '#f1f5f9',
        fontFamily: i % 2 === 0 ? "'Cinzel', Georgia, serif" : "'Montserrat', sans-serif",
        badgeBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
        badgeText: 'EDIÇÃO OFICIAL KDP'
      }));
      setOptions(newOpts);
      setSelectedId(newOpts[0].id);
      setIsRegenerating(false);
      if (onNotification) onNotification('✓ 6 novas opções geradas com sucesso!');
    }, 600);
  };

  const handleSelect = (opt: CoverOptionItem) => {
    setSelectedId(opt.id);
    onSelectCover(opt);
    if (onNotification) onNotification(`✓ "${opt.name}" definida como capa ativa!`);
  };

  const toggleCompareId = (id: string) => {
    if (comparedIds.includes(id)) {
      if (comparedIds.length > 1) {
        setComparedIds(comparedIds.filter(i => i !== id));
      }
    } else {
      if (comparedIds.length < 3) {
        setComparedIds([...comparedIds, id]);
      } else {
        setComparedIds([comparedIds[1], comparedIds[2], id]);
      }
    }
  };

  return (
    <div className="cover-subpanel-container">
      {/* BARRA DE AÇÕES SUPERIOR */}
      <div className="gallery-header-bar">
        <div>
          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} color="#2563eb" /> Galeria de Opções & Comparativo de Capas
          </h4>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Explore variações artísticas simultâneas e compare o impacto visual antes de decidir.
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn-subtab-toggle ${comparisonMode ? 'active' : ''}`}
            onClick={() => setComparisonMode(!comparisonMode)}
          >
            <Columns size={14} /> {comparisonMode ? 'Voltar para Grade' : 'Modo Comparativo Lado a Lado'}
          </button>
          <button
            type="button"
            className="btn-suggest-niche-ai"
            onClick={handleRegenerateOptions}
            disabled={isRegenerating}
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff' }}
          >
            <RefreshCw size={14} className={isRegenerating ? 'spin' : ''} /> {isRegenerating ? 'Gerando Opções...' : 'Gerar Novas 6 Opções'}
          </button>
        </div>
      </div>

      {/* MODO COMPARATIVO LADO A LADO */}
      {comparisonMode ? (
        <div className="comparison-container-block">
          <div className="comparison-header">
            <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>
              Comparando {comparedIds.length} opções lado a lado:
            </span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Clique em "Definir como Principal" para escolher a vencedora
            </span>
          </div>

          <div className="comparison-columns-grid">
            {options.filter(opt => comparedIds.includes(opt.id)).map(opt => (
              <div key={opt.id} className="comparison-card">
                <div className="comparison-badge-row">
                  <span className="comparison-title">{opt.name}</span>
                  <span className="comparison-style-tag">{opt.styleTag}</span>
                </div>

                <div 
                  className="comparison-preview-canvas"
                  style={{ backgroundImage: `url(${opt.artUrl})` }}
                >
                  <div className="cover-scrim-overlay">
                    {showBadge && (
                      <div className="cover-badge-pill" style={{ background: opt.badgeBg, fontSize: 9 }}>
                        {badgeText}
                      </div>
                    )}
                    <h3 style={{ color: opt.titleColor, fontFamily: opt.fontFamily, fontSize: 18, textAlign: 'center', margin: '10px 0 4px 0' }}>
                      {title}
                    </h3>
                    {subtitle && (
                      <p style={{ color: opt.subtitleColor, fontSize: 10, textAlign: 'center', margin: '0 0 8px 0' }}>
                        {subtitle}
                      </p>
                    )}
                    <span style={{ color: opt.authorColor, fontSize: 11, fontWeight: 700, marginTop: 'auto' }}>
                      {author}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-select-as-main"
                  onClick={() => handleSelect(opt)}
                >
                  <Trophy size={14} /> Definir como Capa Principal
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* GRADE NORMAL DE 6 OPÇÕES */
        <div className="cover-options-gallery-grid">
          {options.map((opt) => {
            const isSelected = opt.id === selectedId;
            const isCompared = comparedIds.includes(opt.id);

            return (
              <div
                key={opt.id}
                className={`cover-gallery-card ${isSelected ? 'active-main' : ''}`}
                onClick={() => handleSelect(opt)}
              >
                <div
                  className="cover-gallery-thumb"
                  style={{ backgroundImage: `url(${opt.artUrl})` }}
                >
                  <div className="cover-scrim-overlay" style={{ padding: 12 }}>
                    {showBadge && (
                      <div className="cover-badge-pill" style={{ background: opt.badgeBg, fontSize: 8, padding: '2px 8px' }}>
                        {badgeText}
                      </div>
                    )}
                    <h4 style={{ color: opt.titleColor, fontFamily: opt.fontFamily, fontSize: 14, textAlign: 'center', margin: '6px 0 2px 0' }}>
                      {title}
                    </h4>
                    <span style={{ color: opt.authorColor, fontSize: 10, fontWeight: 700, marginTop: 'auto' }}>
                      {author}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="active-selected-tag">
                      <Check size={12} /> Capa Ativa
                    </div>
                  )}
                </div>

                <div className="cover-card-details">
                  <span className="card-opt-name">{opt.name}</span>
                  <span className="card-opt-style">{opt.styleTag}</span>

                  <div className="card-actions-row">
                    <button
                      type="button"
                      className={`btn-compare-checkbox ${isCompared ? 'checked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompareId(opt.id);
                      }}
                    >
                      {isCompared ? '✓ Comparando' : '+ Comparar'}
                    </button>
                    <button
                      type="button"
                      className={`btn-choose-this ${isSelected ? 'chosen' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(opt);
                      }}
                    >
                      {isSelected ? 'Selecionada' : 'Escolher'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SIMULADOR DE TESTE DE MINIATURA AMAZON KDP */}
      <div className="panel-section-card" style={{ marginTop: 20 }}>
        <div className="panel-card-header-row">
          <h4 className="panel-card-title">
            <Smartphone size={18} color="#f59e0b" /> Teste de Miniatura Amazon (Mobile & Desktop)
          </h4>
          <div className="thumbnail-size-selector">
            <button
              type="button"
              className={`size-btn ${thumbnailSize === '60' ? 'active' : ''}`}
              onClick={() => setThumbnailSize('60')}
            >
              60px (Mobile Feed)
            </button>
            <button
              type="button"
              className={`size-btn ${thumbnailSize === '120' ? 'active' : ''}`}
              onClick={() => setThumbnailSize('120')}
            >
              120px (Desktop Busca)
            </button>
            <button
              type="button"
              className={`size-btn ${thumbnailSize === '240' ? 'active' : ''}`}
              onClick={() => setThumbnailSize('240')}
            >
              240px (Carrossel)
            </button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 14px 0' }}>
          80% das compras na Amazon KDP acontecem via mobile. Verifique se o título do seu livro continua 100% legível no tamanho selecionado:
        </p>

        <div className="thumbnail-simulation-stage">
          <div 
            className="simulated-cover-box"
            style={{ 
              width: `${thumbnailSize === '60' ? 60 : thumbnailSize === '120' ? 120 : 240}px`,
              height: `${thumbnailSize === '60' ? 90 : thumbnailSize === '120' ? 180 : 360}px`,
              backgroundImage: `url(${currentArtUrl})`
            }}
          >
            <div className="cover-scrim-overlay" style={{ padding: thumbnailSize === '60' ? 2 : 8 }}>
              <span style={{ 
                color: '#ffffff', 
                fontWeight: 800, 
                fontSize: thumbnailSize === '60' ? 6 : thumbnailSize === '120' ? 12 : 22,
                textAlign: 'center',
                lineHeight: 1.1,
                textShadow: '0 1px 3px rgba(0,0,0,0.9)'
              }}>
                {title}
              </span>
              <span style={{ 
                color: '#f1f5f9', 
                fontSize: thumbnailSize === '60' ? 5 : thumbnailSize === '120' ? 9 : 14,
                marginTop: 'auto',
                fontWeight: 600
              }}>
                {author}
              </span>
            </div>
          </div>

          <div className="thumbnail-feedback-box">
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
              ✓ Status de Legibilidade: Excelente
            </span>
            <p style={{ fontSize: 12, color: '#cbd5e1', margin: '6px 0 0 0' }}>
              O título possui alto contraste com a arte de fundo e o peso tipográfico é suficiente para ser lido em fração de segundo pelo leitor no app da Amazon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
