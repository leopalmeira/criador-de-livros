import React, { useState } from 'react';
import { 
  DERIVED_ASSET_TEMPLATES, 
  CoverDerivedAssetsService, 
  DerivedAssetDefinition 
} from '../../../services/cover-studio/cover-derived-assets';
import { 
  Download, 
  Layers, 
  Smartphone, 
  Share2, 
  BookOpen, 
  Headphones, 
  Sparkles,
  Check
} from 'lucide-react';

interface Props {
  title: string;
  subtitle: string;
  author: string;
  badgeText: string;
  artUrl: string;
  titleColor?: string;
  subtitleColor?: string;
  authorColor?: string;
  fontFamily?: string;
  onNotification?: (msg: string) => void;
}

export const CoverDerivedAssetsPanel: React.FC<Props> = ({
  title,
  subtitle,
  author,
  badgeText,
  artUrl,
  titleColor = '#ffffff',
  subtitleColor = '#fbbf24',
  authorColor = '#f1f5f9',
  fontFamily = "'Cinzel', Georgia, serif",
  onNotification
}) => {
  const [renderingAssetId, setRenderingAssetId] = useState<string | null>(null);

  const handleDownloadAsset = async (asset: DerivedAssetDefinition) => {
    try {
      setRenderingAssetId(asset.id);
      if (onNotification) onNotification(`Renderizando ${asset.name} em alta resolução...`);

      const dataUrl = await CoverDerivedAssetsService.renderDerivedAsset(
        asset.id,
        title,
        subtitle,
        author,
        badgeText,
        artUrl,
        titleColor,
        subtitleColor,
        authorColor,
        fontFamily
      );

      const filename = `${asset.id}-${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      CoverDerivedAssetsService.triggerDownload(dataUrl, filename);

      if (onNotification) onNotification(`✓ ${asset.name} baixado com sucesso!`);
    } catch (err: any) {
      if (onNotification) onNotification(`Erro ao renderizar material: ${err.message}`);
    } finally {
      setRenderingAssetId(null);
    }
  };

  const getIconForCategory = (cat: string) => {
    switch (cat) {
      case '3D_MOCKUP': return <BookOpen size={16} color="#38bdf8" />;
      case 'SOCIAL_MEDIA': return <Share2 size={16} color="#ec4899" />;
      case 'AMAZON_APLUS': return <Layers size={16} color="#f59e0b" />;
      case 'AUDIOBOOK': return <Headphones size={16} color="#a855f7" />;
      default: return <Sparkles size={16} color="#10b981" />;
    }
  };

  return (
    <div className="cover-subpanel-container">
      <div className="panel-section-card" style={{ marginBottom: 16 }}>
        <h4 className="panel-card-title">
          <Sparkles size={18} color="#2563eb" /> Materiais Visuais Comerciais Derivados da Capa
        </h4>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0 0' }}>
          Gere instantaneamente peças publicitárias prontas, mockups tridimensionais, banners para redes sociais e A+ Content oficial Amazon a partir da capa ativa do seu livro.
        </p>
      </div>

      <div className="derived-assets-grid">
        {DERIVED_ASSET_TEMPLATES.map((asset) => {
          const isRendering = renderingAssetId === asset.id;

          return (
            <div key={asset.id} className="derived-asset-card">
              <div className="asset-card-top-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getIconForCategory(asset.category)}
                  <span className="asset-name-title">{asset.name}</span>
                </div>
                <span className="asset-dimensions-pill">{asset.dimensionsLabel}</span>
              </div>

              <p className="asset-desc-text">{asset.description}</p>

              <button
                type="button"
                className="btn-download-derived"
                onClick={() => handleDownloadAsset(asset)}
                disabled={isRendering}
              >
                <Download size={14} /> {isRendering ? 'Renderizando HD...' : `Baixar ${asset.dimensionsLabel}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
