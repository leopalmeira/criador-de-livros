import React from 'react';
import { CoverVisualConcept } from '../../../services/cover-studio/cover-ai-generator';

export type CoverTitlePosition = 'top' | 'center' | 'bottom';
export type CoverTextColorTheme = 'gold' | 'white' | 'silver' | 'contrast';

interface Props {
  concept: CoverVisualConcept;
  title: string;
  subtitle?: string;
  author: string;
  showBadge?: boolean;
  badgeText?: string;
  titlePosition?: CoverTitlePosition;
  textColorTheme?: CoverTextColorTheme;
  showKdpGuidelines?: boolean;
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
  titlePosition = 'top',
  textColorTheme = 'gold',
  showKdpGuidelines = false,
  className = '',
  style = {},
  interactive = false
}) => {
  const currentBadge = badgeText !== undefined ? badgeText : concept.badgeText;
  const scrimAlpha = (concept.scrimOpacity || 65) / 100;

  // Esquema de Cores Tipográficas
  const getColors = () => {
    switch (textColorTheme) {
      case 'gold':
        return {
          title: '#ffffff',
          subtitle: '#fde047',
          author: '#fef08a',
          badgeBg: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
          badgeText: '#ffffff',
          accent: '#d97706'
        };
      case 'silver':
        return {
          title: '#ffffff',
          subtitle: '#cbd5e1',
          author: '#e2e8f0',
          badgeBg: 'linear-gradient(135deg, #334155 0%, #475569 100%)',
          badgeText: '#f8fafc',
          accent: '#94a3b8'
        };
      case 'contrast':
        return {
          title: '#ffffff',
          subtitle: '#38bdf8',
          author: '#bae6fd',
          badgeBg: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
          badgeText: '#ffffff',
          accent: '#0284c7'
        };
      case 'white':
      default:
        return {
          title: '#ffffff',
          subtitle: '#f1f5f9',
          author: '#ffffff',
          badgeBg: 'rgba(15, 23, 42, 0.85)',
          badgeText: '#ffffff',
          accent: '#ffffff'
        };
    }
  };

  const colors = getColors();
  const fontFamily = concept.fontFamily || "'Cinzel', 'Playfair Display', Georgia, serif";

  // Gradiente Scrim de Alta Fidelidade (Adaptação conforme a posição do título)
  const getScrimGradient = () => {
    if (titlePosition === 'center') {
      return `linear-gradient(180deg, rgba(0,0,0,${scrimAlpha * 0.7}) 0%, rgba(0,0,0,${scrimAlpha * 0.85}) 45%, rgba(0,0,0,${scrimAlpha * 0.85}) 55%, rgba(0,0,0,${scrimAlpha * 0.95}) 100%)`;
    }
    if (titlePosition === 'bottom') {
      return `linear-gradient(180deg, rgba(0,0,0,${scrimAlpha * 0.75}) 0%, rgba(0,0,0,${scrimAlpha * 0.2}) 35%, rgba(0,0,0,${scrimAlpha * 0.85}) 70%, rgba(0,0,0,${Math.min(0.98, scrimAlpha * 1.3)}) 100%)`;
    }
    // Topo clássico (Padrão das Grandes Editoras)
    return `linear-gradient(180deg, rgba(0,0,0,${Math.min(0.96, scrimAlpha * 1.2)}) 0%, rgba(0,0,0,${scrimAlpha * 0.4}) 32%, rgba(0,0,0,${scrimAlpha * 0.3}) 65%, rgba(0,0,0,${Math.min(0.96, scrimAlpha * 1.2)}) 100%)`;
  };

  return (
    <div
      className={`cover-renderer-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '2 / 3',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.4), 0 10px 15px -5px rgba(0, 0, 0, 0.3)',
        backgroundImage: `url(${concept.artUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Camada de Gradiente Scrim (Protege a tipografia sem cobrir a arte) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: getScrimGradient(),
          display: 'flex',
          flexDirection: 'column',
          justifyContent: titlePosition === 'center' ? 'space-between' : 'space-between',
          padding: '24px 20px',
          boxSizing: 'border-box',
          textAlign: 'center'
        }}
      >
        {/* Bloco Superior: Selo + (Título se for top) ou Autor se for bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {showBadge && currentBadge && (
            <div
              style={{
                display: 'inline-block',
                padding: '3px 12px',
                borderRadius: 20,
                background: colors.badgeBg,
                color: colors.badgeText,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.2)',
                maxWidth: '85%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {currentBadge}
            </div>
          )}

          {titlePosition === 'bottom' && (
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                color: colors.author,
                fontSize: 'clamp(10px, 2.4cqw, 13px)',
                fontWeight: 800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                marginTop: 6
              }}
            >
              {author}
            </div>
          )}

          {titlePosition === 'top' && (
            <>
              <h2
                style={{
                  margin: '6px 0 0 0',
                  fontFamily,
                  color: colors.title,
                  fontSize: 'clamp(19px, 4.8cqw, 34px)',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: '0.04em',
                  textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 4px 25px rgba(0,0,0,0.8)',
                  wordBreak: 'break-word',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textTransform: 'uppercase'
                }}
              >
                {title}
              </h2>

              {subtitle && (
                <p
                  style={{
                    margin: '6px 0 0 0',
                    color: colors.subtitle,
                    fontSize: 'clamp(10px, 2.3cqw, 13px)',
                    fontWeight: 600,
                    lineHeight: 1.35,
                    letterSpacing: '0.02em',
                    textShadow: '0 1px 8px rgba(0,0,0,0.9)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    maxWidth: '92%'
                  }}
                >
                  {subtitle}
                </p>
              )}
            </>
          )}
        </div>

        {/* Bloco Central (se a posição for 'center') */}
        {titlePosition === 'center' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, margin: 'auto 0' }}>
            <h2
              style={{
                margin: 0,
                fontFamily,
                color: colors.title,
                fontSize: 'clamp(21px, 5.2cqw, 36px)',
                fontWeight: 900,
                lineHeight: 1.12,
                letterSpacing: '0.04em',
                textShadow: '0 3px 12px rgba(0,0,0,0.95), 0 6px 30px rgba(0,0,0,0.85)',
                wordBreak: 'break-word',
                textTransform: 'uppercase'
              }}
            >
              {title}
            </h2>

            {subtitle && (
              <p
                style={{
                  margin: '4px 0 0 0',
                  color: colors.subtitle,
                  fontSize: 'clamp(10px, 2.3cqw, 13px)',
                  fontWeight: 600,
                  lineHeight: 1.35,
                  letterSpacing: '0.02em',
                  textShadow: '0 2px 8px rgba(0,0,0,0.95)',
                  maxWidth: '90%'
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Bloco Inferior: Título (se for 'bottom') ou Nome do Autor (se for 'top' ou 'center') */}
        <div style={{ marginTop: 'auto', paddingTop: 14 }}>
          {titlePosition === 'bottom' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily,
                  color: colors.title,
                  fontSize: 'clamp(20px, 5cqw, 34px)',
                  fontWeight: 900,
                  lineHeight: 1.15,
                  letterSpacing: '0.03em',
                  textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 4px 20px rgba(0,0,0,0.85)',
                  textTransform: 'uppercase'
                }}
              >
                {title}
              </h2>
              {subtitle && (
                <p
                  style={{
                    margin: '4px 0 0 0',
                    color: colors.subtitle,
                    fontSize: 'clamp(10px, 2.2cqw, 12px)',
                    fontWeight: 600,
                    textShadow: '0 1px 6px rgba(0,0,0,0.9)'
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: colors.accent,
                  opacity: 0.6,
                  marginBottom: 4
                }}
              />
              <div
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  color: colors.author,
                  fontSize: 'clamp(11px, 2.6cqw, 15px)',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  textShadow: '0 2px 8px rgba(0,0,0,0.9)'
                }}
              >
                {author}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Linhas de Gabarito Técnico Amazon KDP (Opcional para inspeção editorial) */}
      {showKdpGuidelines && (
        <div
          style={{
            position: 'absolute',
            inset: 12,
            border: '1px dashed rgba(56, 189, 248, 0.65)',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              fontSize: 8,
              fontWeight: 800,
              color: '#38bdf8',
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '1px 4px',
              borderRadius: 2
            }}
          >
            ÁREA SEGURA KDP (0.25")
          </span>
        </div>
      )}

      {/* Acabamento de Verniz e Lombada Lateral (Efeito Livraria Física) */}
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
  format: 'png' | 'jpeg' = 'png',
  titlePosition: CoverTitlePosition = 'top',
  textColorTheme: CoverTextColorTheme = 'gold'
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

    // Cores tipográficas
    const colors = textColorTheme === 'silver'
      ? { title: '#ffffff', subtitle: '#cbd5e1', author: '#e2e8f0', accent: '#94a3b8' }
      : textColorTheme === 'contrast'
      ? { title: '#ffffff', subtitle: '#38bdf8', author: '#bae6fd', accent: '#0284c7' }
      : textColorTheme === 'white'
      ? { title: '#ffffff', subtitle: '#f1f5f9', author: '#ffffff', accent: '#ffffff' }
      : { title: '#ffffff', subtitle: '#fde047', author: '#fef08a', accent: '#d97706' };

    img.onload = () => {
      // 1. Desenha a imagem de fundo
      ctx.drawImage(img, 0, 0, 1600, 2400);

      // 2. Aplica gradiente de contraste (Scrim KDP) adaptativo
      const scrim = (concept.scrimOpacity || 65) / 100;
      const grad = ctx.createLinearGradient(0, 0, 0, 2400);

      if (titlePosition === 'center') {
        grad.addColorStop(0, `rgba(0,0,0,${scrim * 0.7})`);
        grad.addColorStop(0.45, `rgba(0,0,0,${scrim * 0.85})`);
        grad.addColorStop(0.55, `rgba(0,0,0,${scrim * 0.85})`);
        grad.addColorStop(1, `rgba(0,0,0,${scrim * 0.95})`);
      } else if (titlePosition === 'bottom') {
        grad.addColorStop(0, `rgba(0,0,0,${scrim * 0.75})`);
        grad.addColorStop(0.35, `rgba(0,0,0,${scrim * 0.2})`);
        grad.addColorStop(0.70, `rgba(0,0,0,${scrim * 0.85})`);
        grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.98, scrim * 1.3)})`);
      } else {
        grad.addColorStop(0, `rgba(0,0,0,${Math.min(0.96, scrim * 1.2)})`);
        grad.addColorStop(0.32, `rgba(0,0,0,${scrim * 0.4})`);
        grad.addColorStop(0.65, `rgba(0,0,0,${scrim * 0.3})`);
        grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.96, scrim * 1.2)})`);
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1600, 2400);

      // 3. Selo Editorial (Badge)
      const activeBadge = badgeText || concept.badgeText;
      if (showBadge && activeBadge) {
        ctx.save();
        ctx.font = 'bold 26px sans-serif';
        const textWidth = ctx.measureText(activeBadge.toUpperCase()).width;
        const badgeW = textWidth + 56;
        const badgeH = 50;
        const badgeX = (1600 - badgeW) / 2;
        const badgeY = 80;

        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 25);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeBadge.toUpperCase(), 800, badgeY + badgeH / 2);
        ctx.restore();
      }

      // 4. Quebra e cálculo de linhas de Título
      ctx.save();
      const isSerif = (concept.fontFamily || '').includes('Cinzel') || (concept.fontFamily || '').includes('Playfair');
      ctx.font = `bold 88px ${isSerif ? 'Georgia, serif' : 'sans-serif'}`;
      ctx.fillStyle = colors.title;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 4;

      const titleWords = title.split(' ');
      const titleLines: string[] = [];
      let currentTLine = '';
      for (let i = 0; i < titleWords.length; i++) {
        const testLine = currentTLine ? `${currentTLine} ${titleWords[i]}` : titleWords[i];
        if (ctx.measureText(testLine.toUpperCase()).width > 1320 && currentTLine) {
          titleLines.push(currentTLine.toUpperCase());
          currentTLine = titleWords[i];
        } else {
          currentTLine = testLine;
        }
      }
      if (currentTLine) titleLines.push(currentTLine.toUpperCase());

      const titleLineH = 104;
      const totalTH = titleLines.length * titleLineH;

      // Cálculo de posição Y do título conforme a diagramação
      let titleY = 220;
      if (titlePosition === 'center') {
        titleY = Math.round(1100 - (totalTH / 2));
      } else if (titlePosition === 'bottom') {
        titleY = Math.max(1600, 2050 - totalTH);
      }

      titleLines.forEach(l => {
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineWidth = 8;
        ctx.strokeText(l, 800, titleY);
        ctx.fillText(l, 800, titleY);
        titleY += titleLineH;
      });

      // 5. Subtítulo
      if (subtitle) {
        ctx.font = '600 36px sans-serif';
        ctx.fillStyle = colors.subtitle;
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
        let subY = titleY + 16;
        if (titlePosition === 'center') {
          subY = titleY + 14;
        } else if (titlePosition === 'bottom') {
          subY = titleY + 10;
        }

        subLines.forEach(sl => {
          ctx.strokeStyle = 'rgba(0,0,0,0.85)';
          ctx.lineWidth = 5;
          ctx.strokeText(sl, 800, subY);
          ctx.fillText(sl, 800, subY);
          subY += subLineH;
        });
      }
      ctx.restore();

      // 6. Nome do Autor
      ctx.save();
      ctx.font = 'bold 46px sans-serif';
      ctx.fillStyle = colors.author;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 22;

      if (titlePosition === 'bottom') {
        ctx.textBaseline = 'top';
        ctx.fillText(author.toUpperCase(), 800, 140);
      } else {
        ctx.textBaseline = 'bottom';
        // Linha divisória sutil
        ctx.fillStyle = colors.accent;
        ctx.fillRect(720, 2220, 160, 3);

        ctx.fillStyle = colors.author;
        ctx.fillText(author.toUpperCase(), 800, 2300);
      }
      ctx.restore();

      // 7. Efeito de Lombada Lateral Esquerda
      const spineSheen = ctx.createLinearGradient(0, 0, 32, 0);
      spineSheen.addColorStop(0, 'rgba(255,255,255,0.22)');
      spineSheen.addColorStop(0.5, 'rgba(0,0,0,0.18)');
      spineSheen.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = spineSheen;
      ctx.fillRect(0, 0, 32, 2400);

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
