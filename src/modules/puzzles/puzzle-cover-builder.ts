import jsPDF from 'jspdf';
import { PuzzleBookConfig, KdpCoverSpecs, TRIM_DIMENSIONS } from './types';

export class PuzzleCoverBuilder {
  /**
   * Calcula as especificações milimétricas exatas da capa KDP
   */
  public static calculateCoverSpecs(config: PuzzleBookConfig, pageCount: number): KdpCoverSpecs {
    const trim = TRIM_DIMENSIONS[config.trimSize];
    const trimWidth = trim.widthInches;
    const trimHeight = trim.heightInches;
    const bleed = 0.125; // 0.125 polegadas de sangria padrão KDP

    // Multiplicador de espessura de página KDP
    const spineMultiplier = config.paperColor === 'cream' ? 0.0025 : 0.002252;
    const spineWidth = Math.max(0.06, pageCount * spineMultiplier);

    const totalWidth = bleed + trimWidth + spineWidth + trimWidth + bleed;
    const totalHeight = bleed + trimHeight + bleed;

    // Regra oficial KDP: texto na lombada apenas se >= 79 páginas
    const hasSpineText = pageCount >= 79;

    // Área do código de barras: 2" x 1.2", situada na contracapa (lado esquerdo da capa aberta)
    // No canto inferior direito da contracapa:
    // Posição X da contracapa vai de bleed até bleed + trimWidth.
    // O código de barras fica perto da lombada inferior da contracapa.
    const barcodeWidth = 2.0;
    const barcodeHeight = 1.2;
    const backCoverRight = bleed + trimWidth;
    const barcodeX = backCoverRight - barcodeWidth - 0.25; // 0.25" de distância da dobra da lombada
    const barcodeY = totalHeight - bleed - barcodeHeight - 0.25; // 0.25" da margem inferior

    return {
      trimWidth,
      trimHeight,
      bleed,
      spineWidth,
      totalWidth,
      totalHeight,
      hasSpineText,
      pageCount,
      barcodeArea: {
        width: barcodeWidth,
        height: barcodeHeight,
        x: barcodeX,
        y: barcodeY
      }
    };
  }

  /**
   * Desenha a capa completa em um HTMLCanvasElement para renderização nítida e preview
   */
  public static renderCoverToCanvas(
    canvas: HTMLCanvasElement,
    config: PuzzleBookConfig,
    specs: KdpCoverSpecs,
    showGuides = false
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // DPI de renderização do preview (150 DPI para pré-visualização fluida e nítida)
    const dpi = 150;
    const w = Math.round(specs.totalWidth * dpi);
    const h = Math.round(specs.totalHeight * dpi);

    canvas.width = w;
    canvas.height = h;

    const toPx = (inches: number) => inches * dpi;

    const bleedPx = toPx(specs.bleed);
    const trimWPx = toPx(specs.trimWidth);
    const trimHPx = toPx(specs.trimHeight);
    const spineWPx = toPx(specs.spineWidth);

    // Coordenadas chaves
    const backCoverX = bleedPx;
    const spineX = bleedPx + trimWPx;
    const frontCoverX = spineX + spineWPx;
    const contentTop = bleedPx;

    // 1. FUNDO GERAL COM GRADIENTE OU COR BASE
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, config.coverPrimaryColor || '#1e1b4b');
    gradient.addColorStop(0.5, config.coverSecondaryColor || '#312e81');
    gradient.addColorStop(1, config.coverPrimaryColor || '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Detalhes estéticos abstratos de fundo (linhas geométricas / grid sutil de passatempos)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < w; x += toPx(0.5)) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += toPx(0.5)) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // -------------------------------------------------------------
    // 2. CAPA DA FRENTE (LADO DIREITO)
    // -------------------------------------------------------------
    const frontCenterX = frontCoverX + trimWPx / 2;

    // Badge Superior (ex: "KDP PRINT-READY • EDIÇÃO MASTER")
    const badgeText = (config.coverBadgeText || '★ GABARITO & RESPOSTAS INCLUÍDAS ★').toUpperCase();
    ctx.fillStyle = config.coverAccentColor || '#f59e0b';
    const badgeW = Math.min(trimWPx - toPx(1.5), toPx(5.5));
    const badgeH = toPx(0.45);
    const badgeY = contentTop + toPx(0.8);
    const badgeX = frontCenterX - badgeW / 2;

    this.roundRect(ctx, badgeX, badgeY, badgeW, badgeH, toPx(0.1));
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = `900 ${Math.round(toPx(0.18))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, frontCenterX, badgeY + badgeH / 2);

    // Título Principal em destaque
    ctx.fillStyle = config.coverTextColor || '#ffffff';
    ctx.font = `900 ${Math.round(toPx(0.68))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const titleY = badgeY + badgeH + toPx(0.4);
    this.wrapText(ctx, (config.title || 'LIVRO DE PASSATEMPOS').toUpperCase(), frontCenterX, titleY, trimWPx - toPx(1.2), Math.round(toPx(0.72)));

    // Subtítulo
    if (config.subtitle) {
      ctx.fillStyle = '#fde68a';
      ctx.font = `600 ${Math.round(toPx(0.24))}px sans-serif`;
      ctx.fillText(config.subtitle, frontCenterX, titleY + toPx(1.8));
    }

    // Ilustração Central de Tabuleiros (Miniaturas de Sudoku, Caça-Palavras e Labirinto)
    const illusY = titleY + toPx(2.4);
    const illusSize = toPx(2.8);
    const illusX = frontCenterX - illusSize / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.roundRect(ctx, illusX, illusY, illusSize, illusSize, toPx(0.15));
    ctx.fill();
    ctx.strokeStyle = config.coverAccentColor || '#f59e0b';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Grade interna ilustrativa de Sudoku dentro do card
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    const subCell = illusSize / 4;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(illusX + i * subCell, illusY);
      ctx.lineTo(illusX + i * subCell, illusY + illusSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(illusX, illusY + i * subCell);
      ctx.lineTo(illusX + illusSize, illusY + i * subCell);
      ctx.stroke();
    }

    // Números e letras decorativas no card central
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${Math.round(toPx(0.35))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('9', illusX + subCell * 0.5, illusY + subCell * 0.5);
    ctx.fillText('A', illusX + subCell * 1.5, illusY + subCell * 0.5);
    ctx.fillText('5', illusX + subCell * 2.5, illusY + subCell * 1.5);
    ctx.fillText('Z', illusX + subCell * 3.5, illusY + subCell * 2.5);

    // Selo de Quantidade de Puzzles
    const totalPuzzles =
      config.sudokuFacilCount +
      config.sudokuMedioCount +
      config.sudokuDificilCount +
      config.sudokuExtremoCount +
      config.wordSearchCount +
      config.mazeCount;

    const stampR = toPx(0.75);
    const stampX = illusX + illusSize - toPx(0.1);
    const stampY = illusY + illusSize - toPx(0.1);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(stampX, stampY, stampR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(toPx(0.32))}px sans-serif`;
    ctx.fillText(`+${totalPuzzles || 100}`, stampX, stampY - toPx(0.1));
    ctx.font = `bold ${Math.round(toPx(0.14))}px sans-serif`;
    ctx.fillText('PUZZLES', stampX, stampY + toPx(0.2));

    // Nome do Autor no rodapé da Capa
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(toPx(0.28))}px sans-serif`;
    ctx.fillText((config.author || 'AUTOR').toUpperCase(), frontCenterX, h - bleedPx - toPx(0.8));

    // -------------------------------------------------------------
    // 3. LOMBADA (SPINE)
    // -------------------------------------------------------------
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(spineX, 0, spineWPx, h);

    if (specs.hasSpineText && spineWPx >= toPx(0.2)) {
      ctx.save();
      ctx.translate(spineX + spineWPx / 2, h / 2);
      ctx.rotate(Math.PI / 2); // 90 graus para leitura da lombada de cima para baixo
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.min(spineWPx * 0.55, toPx(0.22))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const spineText = `${config.title.toUpperCase()}  •  ${(config.author || '').toUpperCase()}`;
      ctx.fillText(spineText, 0, 0);
      ctx.restore();
    }

    // -------------------------------------------------------------
    // 4. CONTRACAPA (LADO ESQUERDO)
    // -------------------------------------------------------------
    const backCenterX = backCoverX + trimWPx / 2;

    // Sinopse
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(toPx(0.32))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('DESAFIE SUA MENTE & RELAXE', backCenterX, contentTop + toPx(0.9));

    ctx.fillStyle = '#e2e8f0';
    ctx.font = `normal ${Math.round(toPx(0.18))}px sans-serif`;
    ctx.textAlign = 'left';
    const synY = contentTop + toPx(1.6);
    const synText =
      config.backCoverSynopsis ||
      'Desenvolva seu foco, memória e raciocínio lógico com esta coleção exclusiva de passatempos selecionados. Projetado com layout limpo e confortável para horas de entretenimento inteligente.';
    this.wrapText(ctx, synText, backCoverX + toPx(0.8), synY, trimWPx - toPx(1.6), Math.round(toPx(0.28)));

    // Benefícios em tópicos
    const bullets = config.backCoverBulletPoints || [
      '✓ Puzzles com dificuldade balanceada do iniciante ao avançado',
      '✓ Letras e números nítidos em alta definição',
      '✓ Gabarito e respostas completas no final do livro',
      '✓ Ótimo para foco mental, relaxamento e bem-estar'
    ];

    let bulletY = synY + toPx(1.8);
    ctx.font = `bold ${Math.round(toPx(0.17))}px sans-serif`;
    ctx.fillStyle = '#fde68a';
    for (const b of bullets) {
      ctx.fillText(b, backCoverX + toPx(0.8), bulletY);
      bulletY += toPx(0.38);
    }

    // Caixa de Reserva do Código de Barras KDP (2" x 1.2")
    const bcPx = {
      x: toPx(specs.barcodeArea.x),
      y: toPx(specs.barcodeArea.y),
      w: toPx(specs.barcodeArea.width),
      h: toPx(specs.barcodeArea.height)
    };

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bcPx.x, bcPx.y, bcPx.w, bcPx.h);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(bcPx.x, bcPx.y, bcPx.w, bcPx.h);

    ctx.fillStyle = '#64748b';
    ctx.font = `bold ${Math.round(toPx(0.12))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ÁREA DO CÓDIGO DE BARRAS KDP', bcPx.x + bcPx.w / 2, bcPx.y + bcPx.h / 2 - toPx(0.1));
    ctx.font = `normal ${Math.round(toPx(0.10))}px sans-serif`;
    ctx.fillText('(Inserido automaticamente pela Amazon)', bcPx.x + bcPx.w / 2, bcPx.y + bcPx.h / 2 + toPx(0.15));

    // -------------------------------------------------------------
    // 5. LINHAS GUIA KDP (OPCIONAL PARA VISUALIZAÇÃO)
    // -------------------------------------------------------------
    if (showGuides) {
      ctx.setLineDash([6, 4]);

      // Sangria (0.125" das bordas)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(bleedPx, bleedPx, w - 2 * bleedPx, h - 2 * bleedPx);

      // Linhas da Lombada
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(spineX, 0);
      ctx.lineTo(spineX, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(frontCoverX, 0);
      ctx.lineTo(frontCoverX, h);
      ctx.stroke();

      ctx.setLineDash([]);
    }
  }

  /**
   * Constrói o arquivo PDF de Capa Aberta (Full-Wrap Cover PDF) com dimensões milimétricas KDP
   */
  public static async buildCoverPdf(
    config: PuzzleBookConfig,
    specs: KdpCoverSpecs
  ): Promise<{ doc: jsPDF; blob: Blob; dataUrl: string }> {
    // 72 pontos por polegada
    const widthPt = specs.totalWidth * 72;
    const heightPt = specs.totalHeight * 72;

    const doc = new jsPDF({
      orientation: specs.totalWidth > specs.totalHeight ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [widthPt, heightPt]
    });

    // Renderiza em canvas offscreen em alta resolução (300 DPI) para conversão em imagem vetorial
    const canvas = document.createElement('canvas');
    this.renderCoverToCanvas(canvas, config, specs, false);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(dataUrl, 'JPEG', 0, 0, widthPt, heightPt);

    const blob = doc.output('blob');
    return { doc, blob, dataUrl };
  }

  // Auxiliares de desenho em canvas
  private static roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private static wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
  }
}
