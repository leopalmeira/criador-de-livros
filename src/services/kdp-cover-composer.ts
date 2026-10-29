// ================================================================
// COMPOSITOR EDITORIAL DE CAPAS KDP (COVER TYPOGRAPHY ENGINE)
// - Estampa Título do Livro, Subtítulo e Nome do Autor sobre a imagem gerada
// - Gradientes de legibilidade (topo e rodapé) para contraste impecável
// - Tipografia comercial KDP de alta resolução (1600x2400)
// - Transforma a imagem crua da IA em uma verdadeira Capa de Livro
// ================================================================

export interface CoverTypographyOptions {
  titulo: string;
  subtitulo?: string;
  autor: string;
  selo?: string; // ex: "EDIÇÃO ESPECIAL ILUSTRADA", "LIVRO DE COLORIR KDP"
  corTitulo?: string; // padrão '#ffffff' ou '#fef08a'
  posicaoTitulo?: 'topo' | 'centro' | 'inferior';
}

/**
 * Quebra o texto em múltiplas linhas para caber na largura máxima do canvas
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Compõe uma capa de livro editorial profissional sobrepondo tipografia,
 * contrastes e acabamento sobre a arte gerada pela IA.
 */
export async function comporCapaComTipografia(
  imagemBaseUrl: string,
  options: CoverTypographyOptions
): Promise<string> {
  // Se estiver em ambiente sem Canvas (como testes unitários Node puros), retorna a imagem base
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return imagemBaseUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const width = 1600;
        const height = 2400;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(imagemBaseUrl);
          return;
        }

        // 1. Desenha a imagem base centralizada e preenchendo o canvas
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let dw = width;
        let dh = height;
        let dx = 0;
        let dy = 0;

        if (imgRatio > canvasRatio) {
          dh = height;
          dw = height * imgRatio;
          dx = -(dw - width) / 2;
        } else {
          dw = width;
          dh = width / imgRatio;
          dy = -(dh - height) / 2;
        }

        ctx.drawImage(img, dx, dy, dw, dh);

        // 2. Vinheta Cinematográfica Sutil (Topo e Base) para Contraste de Leitura KDP
        // Preserva o centro da arte 100% nítido e cria profundidade nas zonas tipográficas
        const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.34);
        topGrad.addColorStop(0, 'rgba(6, 10, 22, 0.82)');
        topGrad.addColorStop(0.55, 'rgba(6, 10, 22, 0.38)');
        topGrad.addColorStop(1, 'rgba(6, 10, 22, 0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, width, height * 0.34);

        const botGrad = ctx.createLinearGradient(0, height * 0.62, 0, height);
        botGrad.addColorStop(0, 'rgba(6, 10, 22, 0)');
        botGrad.addColorStop(0.45, 'rgba(6, 10, 22, 0.55)');
        botGrad.addColorStop(1, 'rgba(6, 10, 22, 0.90)');
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, height * 0.62, width, height * 0.38);

        // 3. Moldura Dupla Editorial dentro da Margem de Segurança KDP G201113520 (0.25" da sangria)
        const frameOuter = 74;
        const frameInner = 90;
        ctx.save();
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.72)'; // Ouro editorial
        ctx.lineWidth = 3.5;
        ctx.strokeRect(frameOuter, frameOuter, width - frameOuter * 2, height - frameOuter * 2);

        ctx.strokeStyle = 'rgba(254, 240, 138, 0.32)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(frameInner, frameInner, width - frameInner * 2, height - frameInner * 2);

        // Cantoneiras clássicas nos 4 cantos da moldura interna
        const cornerLen = 36;
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.lineWidth = 5;
        const corners: Array<[number, number, number, number]> = [
          [frameInner, frameInner, 1, 1],
          [width - frameInner, frameInner, -1, 1],
          [frameInner, height - frameInner, 1, -1],
          [width - frameInner, height - frameInner, -1, -1],
        ];
        corners.forEach(([cx, cy, sx, sy]) => {
          ctx.beginPath();
          ctx.moveTo(cx, cy + sy * cornerLen);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx + sx * cornerLen, cy);
          ctx.stroke();
        });
        ctx.restore();

        // 4. Selo Editorial no Topo (Safe Zone KDP)
        ctx.textAlign = 'center';
        const seloTexto = (options.selo || 'EDIÇÃO ESPECIAL AMAZON KDP').toUpperCase();
        ctx.save();
        ctx.font = '700 24px "Trebuchet MS", "Helvetica Neue", sans-serif';
        ctx.letterSpacing = '6px';
        ctx.fillStyle = '#fde68a';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 12;
        ctx.fillText(seloTexto, width / 2, 162);

        // Linha dourada sob o selo
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 180, 184);
        ctx.lineTo(width / 2 + 180, 184);
        ctx.stroke();
        ctx.restore();

        // 5. Título Principal com Acabamento Rico (Relevo & Gradiente Marfim/Ouro)
        const cleanTitle = (options.titulo || 'OBRA EDITORIAL KDP').toUpperCase();
        const maxTitleWidth = width - frameInner * 2 - 90;

        let titleFontSize = 108;
        if (cleanTitle.length > 50) titleFontSize = 74;
        else if (cleanTitle.length > 35) titleFontSize = 84;
        else if (cleanTitle.length > 22) titleFontSize = 94;

        ctx.font = `900 ${titleFontSize}px "Cinzel", "Georgia", "Times New Roman", serif`;
        ctx.letterSpacing = '3px';
        ctx.textAlign = 'center';

        const titleLines = wrapCanvasText(ctx, cleanTitle, maxTitleWidth);
        const titleLineHeight = titleFontSize * 1.16;
        const totalTitleHeight = titleLines.length * titleLineHeight;

        // Posicionamento nobre conforme opção ou terço superior/central
        const targetCenterY = options.posicaoTitulo === 'topo' ? 520 : options.posicaoTitulo === 'inferior' ? 1480 : 940;
        let startY = Math.round(targetCenterY - (totalTitleHeight / 2) + (titleFontSize * 0.35));

        const titleGrad = ctx.createLinearGradient(0, startY - titleFontSize, 0, startY + totalTitleHeight);
        if (options.corTitulo) {
          titleGrad.addColorStop(0, '#ffffff');
          titleGrad.addColorStop(0.5, options.corTitulo);
          titleGrad.addColorStop(1, '#d97706');
        } else {
          titleGrad.addColorStop(0, '#ffffff');
          titleGrad.addColorStop(0.55, '#fef3c7');
          titleGrad.addColorStop(1, '#f59e0b');
        }

        titleLines.forEach((line) => {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 32;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 8;
          ctx.strokeStyle = 'rgba(4, 7, 17, 0.92)';
          ctx.lineWidth = 10;
          ctx.strokeText(line, width / 2, startY);

          ctx.fillStyle = titleGrad;
          ctx.fillText(line, width / 2, startY);
          ctx.restore();
          startY += titleLineHeight;
        });

        // 6. Ornamento Divisor Central (Losango Dourado + Linhas)
        const ornY = startY - titleLineHeight * 0.42;
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.fillStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 220, ornY);
        ctx.lineTo(width / 2 - 26, ornY);
        ctx.moveTo(width / 2 + 26, ornY);
        ctx.lineTo(width / 2 + 220, ornY);
        ctx.stroke();

        // Losango central
        ctx.beginPath();
        ctx.moveTo(width / 2, ornY - 11);
        ctx.lineTo(width / 2 + 11, ornY);
        ctx.lineTo(width / 2, ornY + 11);
        ctx.lineTo(width / 2 - 11, ornY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 7. Subtítulo Comercial (Elegante e Harmônico)
        if (options.subtitulo) {
          const subFontSize = Math.max(34, Math.min(44, Math.round(titleFontSize * 0.42)));
          ctx.save();
          ctx.font = `italic 600 ${subFontSize}px "Georgia", "Times New Roman", serif`;
          ctx.letterSpacing = '1px';
          ctx.fillStyle = '#f8fafc';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetY = 4;

          const subLines = wrapCanvasText(ctx, options.subtitulo, maxTitleWidth - 40);
          const subLineHeight = subFontSize * 1.28;
          let subY = Math.max(ornY + 68, height - 380 - (subLines.length - 1) * subLineHeight);

          subLines.forEach((sLine) => {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.lineWidth = 5;
            ctx.strokeText(sLine, width / 2, subY);
            ctx.fillText(sLine, width / 2, subY);
            subY += subLineHeight;
          });
          ctx.restore();
        }

        // 8. Pedestal do Autor no Rodapé (Respeitando a Margem de Segurança KDP G201113520)
        const autorText = (options.autor || 'AUTOR').toUpperCase();
        ctx.save();
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 140, height - 232);
        ctx.lineTo(width / 2 + 140, height - 232);
        ctx.stroke();

        ctx.font = '700 46px "Cinzel", "Trebuchet MS", sans-serif';
        ctx.letterSpacing = '9px';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 4;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
        ctx.lineWidth = 6;
        ctx.strokeText(autorText, width / 2, height - 165);
        ctx.fillText(autorText, width / 2, height - 165);
        ctx.restore();

        // 9. Exporta em DataURL PNG
        const composedDataUrl = canvas.toDataURL('image/png', 0.95);
        resolve(composedDataUrl);
      } catch (err) {
        console.warn('Falha na composição tipográfica da capa:', err);
        resolve(imagemBaseUrl);
      }
    };

    img.onerror = () => {
      resolve(imagemBaseUrl);
    };

    img.src = imagemBaseUrl;
  });
}
