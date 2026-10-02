import React, { useState } from 'react';
import { 
  Sliders, 
  Type, 
  Palette, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Sun, 
  Contrast, 
  Layers 
} from 'lucide-react';

export interface CoverFiltersState {
  brightness: number; // 50 - 150 (default 100)
  contrast: number;   // 50 - 150 (default 100)
  saturate: number;   // 0 - 200 (default 100)
  blur: number;       // 0 - 10 (default 0)
  vignette: number;   // 0 - 100 (default 40)
  scrimOpacity: number; // 0 - 100 (default 70)
}

interface Props {
  title: string;
  subtitle: string;
  author: string;
  badgeText: string;
  showBadge: boolean;
  titleColor: string;
  subtitleColor: string;
  authorColor: string;
  fontFamily: string;
  filters: CoverFiltersState;
  onUpdateTitle: (v: string) => void;
  onUpdateSubtitle: (v: string) => void;
  onUpdateAuthor: (v: string) => void;
  onUpdateBadgeText: (v: string) => void;
  onToggleBadge: (v: boolean) => void;
  onUpdateColors: (titleC: string, subC: string, authorC: string) => void;
  onUpdateFont: (font: string) => void;
  onUpdateFilters: (f: CoverFiltersState) => void;
  onSave: () => void;
}

const FONTS_LIST = [
  { id: "'Cinzel', Georgia, serif", name: 'Cinzel (Nobre & Dramático)' },
  { id: "'Playfair Display', Georgia, serif", name: 'Playfair Display (Literário Refinado)' },
  { id: "'Montserrat', sans-serif", name: 'Montserrat (Moderno Best-Seller)' },
  { id: "'Inter', sans-serif", name: 'Inter (Minimalista Contemporâneo)' },
  { id: "Georgia, serif", name: 'Georgia (Clássico Editorial)' }
];

export const CoverRefineEditor: React.FC<Props> = ({
  title,
  subtitle,
  author,
  badgeText,
  showBadge,
  titleColor,
  subtitleColor,
  authorColor,
  fontFamily,
  filters,
  onUpdateTitle,
  onUpdateSubtitle,
  onUpdateAuthor,
  onUpdateBadgeText,
  onToggleBadge,
  onUpdateColors,
  onUpdateFont,
  onUpdateFilters,
  onSave
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'text' | 'image' | 'colors'>('text');

  const handleResetFilters = () => {
    onUpdateFilters({
      brightness: 100,
      contrast: 100,
      saturate: 100,
      blur: 0,
      vignette: 40,
      scrimOpacity: 70
    });
  };

  return (
    <div className="cover-subpanel-container">
      {/* SELETOR DE SUB-ABA */}
      <div className="refine-tabs-nav">
        <button
          type="button"
          className={`refine-tab-btn ${activeSubTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('text')}
        >
          <Type size={14} /> Textos & Tipografia
        </button>
        <button
          type="button"
          className={`refine-tab-btn ${activeSubTab === 'image' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('image')}
        >
          <Sliders size={14} /> Filtros de Imagem & Scrim
        </button>
        <button
          type="button"
          className={`refine-tab-btn ${activeSubTab === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('colors')}
        >
          <Palette size={14} /> Cores & Paleta
        </button>
      </div>

      {/* 1. ABA DE TEXTOS & TIPOGRAFIA */}
      {activeSubTab === 'text' && (
        <div className="panel-section-card">
          <h4 className="panel-card-title" style={{ marginBottom: 14 }}>
            <Type size={16} /> Ajuste Fino de Tipografia & Textos
          </h4>

          {/* Fonte Principal */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Família Tipográfica Principal</label>
            <select
              className="form-select"
              value={fontFamily}
              onChange={(e) => onUpdateFont(e.target.value)}
            >
              {FONTS_LIST.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Título da Obra</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => onUpdateTitle(e.target.value)}
            />
          </div>

          {/* Subtítulo */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Subtítulo da Capa</label>
            <input
              type="text"
              className="form-input"
              value={subtitle}
              onChange={(e) => onUpdateSubtitle(e.target.value)}
            />
          </div>

          {/* Nome do Autor */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Nome do Autor</label>
            <input
              type="text"
              className="form-input"
              value={author}
              onChange={(e) => onUpdateAuthor(e.target.value)}
            />
          </div>

          {/* Selo Promocional */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="form-label" style={{ margin: 0 }}>Selo de Autoridade</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showBadge}
                  onChange={(e) => onToggleBadge(e.target.checked)}
                />
                Exibir Selo
              </label>
            </div>
            {showBadge && (
              <input
                type="text"
                className="form-input"
                value={badgeText}
                onChange={(e) => onUpdateBadgeText(e.target.value)}
                placeholder="Ex: BEST-SELLER AMAZON"
              />
            )}
          </div>
        </div>
      )}

      {/* 2. ABA DE FILTROS DE IMAGEM */}
      {activeSubTab === 'image' && (
        <div className="panel-section-card">
          <div className="panel-card-header-row">
            <h4 className="panel-card-title">
              <Sliders size={16} /> Ajustes e Filtros de Iluminação
            </h4>
            <button
              type="button"
              className="btn-box-suggest"
              onClick={handleResetFilters}
            >
              <RotateCcw size={12} /> Redefinir
            </button>
          </div>

          {/* Brilho */}
          <div className="slider-control-row">
            <div className="slider-label-row">
              <span>Brilho</span>
              <span>{filters.brightness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={filters.brightness}
              onChange={(e) => onUpdateFilters({ ...filters, brightness: Number(e.target.value) })}
            />
          </div>

          {/* Contraste */}
          <div className="slider-control-row">
            <div className="slider-label-row">
              <span>Contraste</span>
              <span>{filters.contrast}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={filters.contrast}
              onChange={(e) => onUpdateFilters({ ...filters, contrast: Number(e.target.value) })}
            />
          </div>

          {/* Saturação */}
          <div className="slider-control-row">
            <div className="slider-label-row">
              <span>Saturação de Cor</span>
              <span>{filters.saturate}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={filters.saturate}
              onChange={(e) => onUpdateFilters({ ...filters, saturate: Number(e.target.value) })}
            />
          </div>

          {/* Intensidade do Scrim Escuro (Legibilidade do Título) */}
          <div className="slider-control-row">
            <div className="slider-label-row">
              <span>Degradê de Legibilidade (Scrim Escuro)</span>
              <span>{filters.scrimOpacity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.scrimOpacity}
              onChange={(e) => onUpdateFilters({ ...filters, scrimOpacity: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {/* 3. ABA DE CORES & PALETA */}
      {activeSubTab === 'colors' && (
        <div className="panel-section-card">
          <h4 className="panel-card-title" style={{ marginBottom: 14 }}>
            <Palette size={16} /> Paleta de Cores da Tipografia
          </h4>

          <div className="color-pickers-row">
            <div className="color-field">
              <label>Cor do Título</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={titleColor}
                  onChange={(e) => onUpdateColors(e.target.value, subtitleColor, authorColor)}
                />
                <span style={{ fontSize: 12 }}>{titleColor}</span>
              </div>
            </div>

            <div className="color-field">
              <label>Cor do Subtítulo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={subtitleColor}
                  onChange={(e) => onUpdateColors(titleColor, e.target.value, authorColor)}
                />
                <span style={{ fontSize: 12 }}>{subtitleColor}</span>
              </div>
            </div>

            <div className="color-field">
              <label>Cor do Autor</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={authorColor}
                  onChange={(e) => onUpdateColors(titleColor, subtitleColor, e.target.value)}
                />
                <span style={{ fontSize: 12 }}>{authorColor}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTÃO FIXO DE SALVAR */}
      <button
        type="button"
        className="btn-confirm-segment"
        style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
        onClick={onSave}
      >
        <Check size={16} /> Salvar Refinamentos na Capa Oficial
      </button>
    </div>
  );
};
