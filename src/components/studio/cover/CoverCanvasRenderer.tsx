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
  showBadge = false,
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
  showBadge: boolean = false,
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

      // 4. Título da Obra (LIGEIRAMENTE UM POUCO ACIMA DO MEIO DA CAPA)
      ctx.save();
      const isSerif = concept.fontFamily.includes('Cinzel') || concept.fontFamily.includes('Playfair');
      ctx.font = `bold 82px ${isSerif ? 'Georgia, serif' : 'sans-serif'}`;
      ctx.fillStyle = concept.titleColor || '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 4;

      // Quebra e cálculo de altura do título
      const titleWords = title.split(' ');
      const titleLines: string[] = [];
      let currentTLine = '';
      for (let i = 0; i < titleWords.length; i++) {
        const testLine = currentTLine ? `${currentTLine} ${titleWords[i]}` : titleWords[i];
        if (ctx.measureText(testLine).width > 1300 && currentTLine) {
          titleLines.push(currentTLine);
          currentTLine = titleWords[i];
        } else {
          currentTLine = testLine;
        }
      }
      if (currentTLine) titleLines.push(currentTLine);

      const titleLineH = 98;
      const totalTH = titleLines.length * titleLineH;
      // Posiciona o bloco verticalmente um pouco acima do meio da capa (1200px)
      let titleY = Math.round(1040 - (totalTH / 2));

      titleLines.forEach(l => {
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 6;
        ctx.strokeText(l, 800, titleY);
        ctx.fillText(l, 800, titleY);
        titleY += titleLineH;
      });

      // 5. Subtítulo (JÁ PERTO DA PARTE DE BAIXO DA CAPA, COM ESPAÇO PARA O AUTOR)
      if (subtitle) {
        ctx.font = '600 38px sans-serif';
        ctx.fillStyle = concept.subtitleColor || '#fbbf24';
        ctx.shadowBlur = 18;

        const subWords = subtitle.split(' ');
        const subLines: string[] = [];
        let currentSLine = '';
        for (let i = 0; i < subWords.length; i++) {
          const testLine = currentSLine ? `${currentSLine} ${subWords[i]}` : subWords[i];
          if (ctx.measureText(testLine).width > 1250 && currentSLine) {
            subLines.push(currentSLine);
            currentSLine = subWords[i];
          } else {
            currentSLine = testLine;
          }
        }
        if (currentSLine) subLines.push(currentSLine);

        const subLineH = 48;
        const totalSH = subLines.length * subLineH;
        // Ancorado perto da parte de baixo da capa, terminando em Y = 2120 (autor em 2280)
        let subY = Math.max(1780, 2120 - totalSH);

        subLines.forEach(sl => {
          ctx.strokeStyle = 'rgba(0,0,0,0.8)';
          ctx.lineWidth = 4;
          ctx.strokeText(sl, 800, subY);
          ctx.fillText(sl, 800, subY);
          subY += subLineH;
        });
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
