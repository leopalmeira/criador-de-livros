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

        // ZERO BLUR ARTIFICIAL: A arte é preservada 100% nítida e natural.
        // Contraste tipográfico obtido estritamente via sombras projetadas e contorno (strokeText).

        // Título do Livro (LIGEIRAMENTE UM POUCO ACIMA DO MEIO DA CAPA)
        const cleanTitle = (options.titulo || 'LIVRO ILUSTRADO').toUpperCase();
        const maxTitleWidth = width * 0.86;

        // Ajuste dinâmico de tamanho de fonte conforme comprimento do título
        let titleFontSize = 100;
        if (cleanTitle.length > 50) titleFontSize = 72;
        else if (cleanTitle.length > 35) titleFontSize = 82;
        else if (cleanTitle.length > 20) titleFontSize = 90;

        ctx.font = `900 ${titleFontSize}px "Georgia", "Cinzel", "Times New Roman", serif`;
        ctx.letterSpacing = '2px';
        ctx.fillStyle = options.corTitulo || '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 28;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;

        const titleLines = wrapCanvasText(ctx, cleanTitle, maxTitleWidth);
        const titleLineHeight = titleFontSize * 1.18;
        const totalTitleHeight = titleLines.length * titleLineHeight;

        // Centro alvo: Y ≈ 1040px (ligeiramente um pouco acima do meio de 2400)
        let startY = Math.round(1040 - (totalTitleHeight / 2) + (titleFontSize * 0.35));

        titleLines.forEach((line) => {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.lineWidth = 6;
          ctx.strokeText(line, width / 2, startY);
          ctx.fillText(line, width / 2, startY);
          startY += titleLineHeight;
        });

        // 7. Subtítulo Comercial (JÁ PERTO DA PARTE DE BAIXO DA CAPA, COM ESPAÇO PARA O AUTOR)
        if (options.subtitulo) {
          const subFontSize = Math.max(34, Math.min(44, Math.round(titleFontSize * 0.44)));
          ctx.font = `italic 600 ${subFontSize}px "Georgia", serif`;
          ctx.letterSpacing = '1px';
          ctx.fillStyle = '#f8fafc';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 4;

          const subLines = wrapCanvasText(ctx, options.subtitulo, width * 0.84);
          const subLineHeight = subFontSize * 1.25;
          const totalSubHeight = subLines.length * subLineHeight;

          // Ancorado na parte de baixo da capa, terminando acima do autor (autor em height - 160)
          const yBaseSub = height - 280;
          let subY = Math.max(height * 0.74, yBaseSub - totalSubHeight + subFontSize);

          subLines.forEach((sLine) => {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 4;
            ctx.strokeText(sLine, width / 2, subY);
            ctx.fillText(sLine, width / 2, subY);
            subY += subLineHeight;
          });
        }

        // Nome do Autor no Rodapé (Apenas nome do autor, com contorno nítido)
        const autorText = (options.autor || 'AUTOR').toUpperCase();
        ctx.font = '700 44px "Trebuchet MS", sans-serif';
        ctx.letterSpacing = '8px';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 4;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.90)';
        ctx.lineWidth = 5;
        ctx.strokeText(autorText, width / 2, height - 150);
        ctx.fillText(autorText, width / 2, height - 150);

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
