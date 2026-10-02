import React from 'react';
import { CoverVisualConcept } from '../../../services/cover-studio/cover-ai-generator';

interface Props {
  concept: CoverVisualConcept;
  title: string;
  subtitle?: string;
  author: string;
  showBadge?: boolean;
  badgeText?: string;
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
}

export const CoverCanvasRenderer: React.FC<Props> = ({
  concept,
  title,
  subtitle,
  author,
  showBadge = true,
  badgeText,
  className = '',
  style = {},
  interactive = false
}) => {
  const currentBadge = badgeText !== undefined ? badgeText : concept.badgeText;
  const scrimAlpha = (concept.scrimOpacity || 65) / 100;

  return (
    <div
      className={`cover-renderer-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '2 / 3',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        backgroundImage: `url(${concept.artUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Camada de Gradiente Scrim (Contraste Tipográfico KDP) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, rgba(0,0,0,${scrimAlpha}) 0%, rgba(0,0,0,${scrimAlpha * 0.25}) 35%, rgba(0,0,0,${scrimAlpha * 0.45}) 70%, rgba(0,0,0,${Math.min(0.95, scrimAlpha * 1.25)}) 100%)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 18px',
          boxSizing: 'border-box',
          textAlign: 'center'
        }}
      >
        {/* TOPO: SELO EDITORIAL & TÍTULO */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          {showBadge && currentBadge && (
            <div
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 20,
                background: concept.badgeBg || 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                maxWidth: '90%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {currentBadge}
            </div>
          )}

          {/* TÍTULO DA OBRA */}
          <h2
            style={{
              margin: '6px 0 0 0',
              fontFamily: concept.fontFamily || "'Cinzel', Georgia, serif",
              color: concept.titleColor || '#ffffff',
              fontSize: 'clamp(18px, 4.5cqw, 32px)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '0.02em',
              textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 4px 20px rgba(0,0,0,0.6)',
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {title}
          </h2>

          {/* SUBTÍTULO */}
          {subtitle && (
            <p
              style={{
                margin: '6px 0 0 0',
                color: concept.subtitleColor || '#fbbf24',
                fontSize: 'clamp(11px, 2.4cqw, 14px)',
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: '0.01em',
                textShadow: '0 1px 6px rgba(0,0,0,0.8)',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                maxWidth: '92%'
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* BASE: NOME DO AUTOR */}
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <div
            style={{
              fontFamily: "'Montserrat', sans-serif",
              color: concept.authorColor || '#f1f5f9',
              fontSize: 'clamp(11px, 2.6cqw, 15px)',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textShadow: '0 2px 8px rgba(0,0,0,0.85)'
            }}
          >
            {author}
          </div>
        </div>
      </div>

      {/* Efeito Visual de Verniz e Lombada Lateral (Acabamento Livraria) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 8,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.5) 100%)',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

/**
 * Utilitário para renderizar a capa completa em alta resolução (1600x2400 KDP)
 * usando HTML Canvas e retornar a Data URL para exportação em PNG ou JPG
 */
export async function exportCoverHighResCanvas(
  concept: CoverVisualConcept,
  title: string,
  subtitle: string,
  author: string,
  showBadge: boolean = true,
  badgeText: string = '',
  format: 'png' | 'jpeg' = 'png'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 2400;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = concept.artUrl;

    img.onload = () => {
      // 1. Desenha a imagem de fundo
      ctx.drawImage(img, 0, 0, 1600, 2400);

      // 2. Aplica gradiente de contraste (Scrim KDP)
      const scrim = (concept.scrimOpacity || 65) / 100;
      const grad = ctx.createLinearGradient(0, 0, 0, 2400);
      grad.addColorStop(0, `rgba(0,0,0,${scrim})`);
      grad.addColorStop(0.35, `rgba(0,0,0,${scrim * 0.25})`);
      grad.addColorStop(0.70, `rgba(0,0,0,${scrim * 0.45})`);
      grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.95, scrim * 1.25)})`);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1600, 2400);

      // 3. Selo Editorial (Badge)
      const activeBadge = badgeText || concept.badgeText;
      if (showBadge && activeBadge) {
        ctx.save();
        ctx.font = 'bold 28px sans-serif';
        const textWidth = ctx.measureText(activeBadge.toUpperCase()).width;
        const badgeW = textWidth + 60;
        const badgeH = 54;
        const badgeX = (1600 - badgeW) / 2;
        const badgeY = 90;

        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 27);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeBadge.toUpperCase(), 800, badgeY + badgeH / 2);
        ctx.restore();
      }

      // 4. Título da Obra
      ctx.save();
      const isSerif = concept.fontFamily.includes('Cinzel') || concept.fontFamily.includes('Playfair');
      ctx.font = `bold 82px ${isSerif ? 'Georgia, serif' : 'sans-serif'}`;
      ctx.fillStyle = concept.titleColor || '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 4;

      // Quebra de linha automática do título
      const titleWords = title.split(' ');
      let line = '';
      let titleY = showBadge && activeBadge ? 180 : 130;
      for (let i = 0; i < titleWords.length; i++) {
        const testLine = line + titleWords[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 1300 && i > 0) {
          ctx.fillText(line.trim(), 800, titleY);
          line = titleWords[i] + ' ';
          titleY += 100;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), 800, titleY);
      titleY += 105;

      // 5. Subtítulo
      if (subtitle) {
        ctx.font = '600 36px sans-serif';
        ctx.fillStyle = concept.subtitleColor || '#fbbf24';
        ctx.shadowBlur = 16;

        const subWords = subtitle.split(' ');
        let subLine = '';
        for (let i = 0; i < subWords.length; i++) {
          const testLine = subLine + subWords[i] + ' ';
          if (ctx.measureText(testLine).width > 1250 && i > 0) {
            ctx.fillText(subLine.trim(), 800, titleY);
            subLine = subWords[i] + ' ';
            titleY += 50;
          } else {
            subLine = testLine;
          }
        }
        ctx.fillText(subLine.trim(), 800, titleY);
      }
      ctx.restore();

      // 6. Nome do Autor
      ctx.save();
      ctx.font = 'bold 44px sans-serif';
      ctx.fillStyle = concept.authorColor || '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 20;
      ctx.fillText(author.toUpperCase(), 800, 2300);
      ctx.restore();

      // 7. Efeito de Lombada Lateral Esquerda
      const spineSheen = ctx.createLinearGradient(0, 0, 30, 0);
      spineSheen.addColorStop(0, 'rgba(255,255,255,0.25)');
      spineSheen.addColorStop(0.5, 'rgba(0,0,0,0.15)');
      spineSheen.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = spineSheen;
      ctx.fillRect(0, 0, 30, 2400);

      resolve(canvas.toDataURL(`image/${format}`, 0.95));
    };

    img.onerror = () => {
      // Fallback gracioso com gradiente
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1600, 2400);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 80px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, 800, 1000);
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(author, 800, 2200);
      resolve(canvas.toDataURL(`image/${format}`, 0.95));
    };
  });
}
