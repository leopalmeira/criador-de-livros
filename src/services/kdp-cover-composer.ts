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

        // 2. Vinheta e Gradiente Superior (Garante legibilidade total do Título)
        const topGradient = ctx.createLinearGradient(0, 0, 0, height * 0.42);
        topGradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
        topGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
        topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = topGradient;
        ctx.fillRect(0, 0, width, height * 0.42);

        // 3. Gradiente Inferior (Garante legibilidade total do Nome do Autor)
        const bottomGradient = ctx.createLinearGradient(0, height * 0.72, 0, height);
        bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        bottomGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.55)');
        bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
        ctx.fillStyle = bottomGradient;
        ctx.fillRect(0, height * 0.72, width, height * 0.28);

        // 4. Selo / Categoria Superior
        const seloText = (options.selo || 'COLEÇÃO EXCLUSIVA KDP').toUpperCase();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fef08a';
        ctx.font = '700 32px "Trebuchet MS", sans-serif';
        ctx.letterSpacing = '6px';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;
        ctx.fillText(seloText, width / 2, 140);

        // 5. Linha divisória ornamental superior
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 120, 165);
        ctx.lineTo(width / 2 + 120, 165);
        ctx.stroke();

        // 6. Título do Livro (Grande, imponente, com sombra cinematográfica)
        const cleanTitle = (options.titulo || 'LIVRO ILUSTRADO').toUpperCase();
        const maxTitleWidth = width * 0.88;

        // Ajuste dinâmico de tamanho de fonte conforme comprimento do título
        let titleFontSize = 100;
        if (cleanTitle.length > 50) titleFontSize = 74;
        else if (cleanTitle.length > 35) titleFontSize = 84;
        else if (cleanTitle.length > 20) titleFontSize = 92;

        ctx.font = `900 ${titleFontSize}px "Georgia", "Cinzel", "Times New Roman", serif`;
        ctx.letterSpacing = '2px';
        ctx.fillStyle = options.corTitulo || '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;

        const titleLines = wrapCanvasText(ctx, cleanTitle, maxTitleWidth);
        const titleLineHeight = titleFontSize * 1.15;
        let startY = 250;

        titleLines.forEach((line) => {
          // Borda preta sutil para contraste máximo
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.lineWidth = 6;
          ctx.strokeText(line, width / 2, startY);
          // Preenchimento
          ctx.fillText(line, width / 2, startY);
          startY += titleLineHeight;
        });

        // 7. Subtítulo Comercial (se houver)
        if (options.subtitulo) {
          const subFontSize = Math.max(34, Math.min(46, Math.round(titleFontSize * 0.45)));
          ctx.font = `italic 600 ${subFontSize}px "Georgia", serif`;
          ctx.letterSpacing = '1px';
          ctx.fillStyle = '#f1f5f9';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = 4;

          const subLines = wrapCanvasText(ctx, options.subtitulo, width * 0.84);
          startY += 15;
          subLines.forEach((sLine) => {
            ctx.fillText(sLine, width / 2, startY);
            startY += subFontSize * 1.25;
          });
        }

        // 8. Nome do Autor no Rodapé
        const autorText = (options.autor ? `POR ${options.autor}` : 'BOOK INTEL KDP').toUpperCase();
        ctx.font = '700 44px "Trebuchet MS", sans-serif';
        ctx.letterSpacing = '8px';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 4;
        ctx.fillText(autorText, width / 2, height - 160);

        // Linha divisória ornamental inferior
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 90, height - 120);
        ctx.lineTo(width / 2 + 90, height - 120);
        ctx.stroke();

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
