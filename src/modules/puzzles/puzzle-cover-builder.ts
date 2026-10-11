import jsPDF from 'jspdf';
import { PuzzleBookConfig, KdpCoverSpecs, TRIM_DIMENSIONS, PuzzleLanguage } from './types';

export const I18N_COVER: Record<PuzzleLanguage, {
  yearBadge: string;
  categoryTag: string;
  heroNumber: string;
  heroText: string;
  bannerTag: string;
  largePrint: string;
  byAuthor: string;
  backTitle: string;
  backSubtitle: string;
  bonusCards: Array<{ tag: string; title: string }>;
  barcodeText: string;
}> = {
  pt: {
    yearBadge: 'NOVO 2026',
    categoryTag: 'PASSATEMPOS & SUDOKU',
    heroNumber: '100+',
    heroText: 'DESAFIOS EXCLUSIVOS',
    bannerTag: 'TEMAS VARIADOS PARA EXPLORAR',
    largePrint: 'LETRAS GRANDES',
    byAuthor: 'Por:',
    backTitle: 'COLETÂNEA DE PASSATEMPOS',
    backSubtitle: 'PARA ADULTOS E TERCEIRA IDADE',
    bonusCards: [
      { tag: 'GABARITO', title: 'Soluções Completas' },
      { tag: 'NÍVEIS', title: 'Fácil a Extremo' },
      { tag: 'MENTE', title: 'Foco & Relaxamento' }
    ],
    barcodeText: 'ÁREA DO CÓDIGO DE BARRAS KDP'
  },
  en: {
    yearBadge: 'NEW 2026',
    categoryTag: 'WORD SEARCH & SUDOKU',
    heroNumber: '10,000',
    heroText: 'UNIQUE WORDS',
    bannerTag: 'ENDLESS THEMES TO EXPLORE',
    largePrint: 'LARGE PRINT',
    byAuthor: 'By:',
    backTitle: 'WORD FIND PUZZLE BOOK',
    backSubtitle: 'FOR SENIORS & ADULTS',
    bonusCards: [
      { tag: 'ANSWERS', title: 'Full Solutions Key' },
      { tag: 'LEVELS', title: 'Easy to Extreme' },
      { tag: 'BRAIN', title: 'Memory & Focus' }
    ],
    barcodeText: 'KDP BARCODE RESERVED AREA'
  },
  es: {
    yearBadge: 'NUEVO 2026',
    categoryTag: 'SOPA DE LETRAS & SUDOKU',
    heroNumber: '10.000',
    heroText: 'PALABRAS ÚNICAS',
    bannerTag: 'TEMAS ILIMITADOS PARA EXPLORAR',
    largePrint: 'LETRA GRANDE',
    byAuthor: 'Por:',
    backTitle: 'LIBRO DE PASATIEMPOS',
    backSubtitle: 'PARA ADULTOS Y MAYORES',
    bonusCards: [
      { tag: 'GABARITO', title: 'Soluciones Claras' },
      { tag: 'NIVELES', title: 'Fácil a Extremo' },
      { tag: 'MENTE', title: 'Memoria y Enfoque' }
    ],
    barcodeText: 'ÁREA DEL CÓDIGO DE BARRAS KDP'
  }
};

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

    // Código de barras: 2" x 1.2" na contracapa (lado esquerdo)
    const barcodeWidth = 2.0;
    const barcodeHeight = 1.2;
    const backCoverRight = bleed + trimWidth;
    const barcodeX = backCoverRight - barcodeWidth - 0.25;
    const barcodeY = totalHeight - bleed - barcodeHeight - 0.25;

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
   * Desenha a capa completa em um HTMLCanvasElement com estética Amazon Bestseller 3D
   */
  public static renderCoverToCanvas(
    canvas: HTMLCanvasElement,
    config: PuzzleBookConfig,
    specs: KdpCoverSpecs,
    showGuides = false
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpi = 150;
    const w = Math.round(specs.totalWidth * dpi);
    const h = Math.round(specs.totalHeight * dpi);

    canvas.width = w;
    canvas.height = h;

    const toPx = (inches: number) => inches * dpi;

    const bleedPx = toPx(specs.bleed);
    const trimWPx = toPx(specs.trimWidth);
    const spineWPx = toPx(specs.spineWidth);

    const backCoverX = bleedPx;
    const spineX = bleedPx + trimWPx;
    const frontCoverX = spineX + spineWPx;
    const contentTop = bleedPx;

    const lang = config.language || 'pt';
    const i18n = I18N_COVER[lang] || I18N_COVER.pt;

    // -------------------------------------------------------------
    // 1. FUNDO GERAL COM ILUMINAÇÃO EDITORIAL
    // -------------------------------------------------------------
    const primaryColor = config.coverPrimaryColor || '#7f1d1d'; // Tom padrão carmim bestseller
    const secondaryColor = config.coverSecondaryColor || '#991b1b';

    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, primaryColor);
    bgGrad.addColorStop(0.5, secondaryColor);
    bgGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Efeito de vinheta e iluminação suave no topo
    const radGlow = ctx.createRadialGradient(frontCoverX + trimWPx / 2, contentTop + toPx(3), 10, frontCoverX + trimWPx / 2, contentTop + toPx(3), trimWPx);
    radGlow.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    radGlow.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, w, h);

    // Se houver imagem gerada pelo Replicate, desenha na metade inferior
    if (config.coverIllustrationUrl) {
      try {
        const img = new Image();
        img.src = config.coverIllustrationUrl;
        if (img.complete && img.naturalWidth > 0) {
          const imgH = trimWPx * 1.1;
          const imgY = h - bleedPx - imgH;
          ctx.drawImage(img, frontCoverX, imgY, trimWPx, imgH);

          // Gradiente de transição suave sobre a imagem
          const fadeGrad = ctx.createLinearGradient(0, imgY, 0, imgY + toPx(1.5));
          fadeGrad.addColorStop(0, primaryColor);
          fadeGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = fadeGrad;
          ctx.fillRect(frontCoverX, imgY, trimWPx, toPx(1.5));
        }
      } catch (err) {
        console.warn('Erro ao desenhar imagem do Replicate no canvas:', err);
      }
    }

    // -------------------------------------------------------------
    // 2. CAPA FRONTAL (LADO DIREITO) - ESTILO BESTSELLER AMAZON
    // -------------------------------------------------------------
    const frontCenterX = frontCoverX + trimWPx / 2;

    // A) BADGE SUPERIOR ESTILIZADO ("NEW 2026 / NOVO 2026")
    const yearText = config.yearBadge || i18n.yearBadge;
    const catText = i18n.categoryTag;

    const topBadgeW = Math.min(trimWPx - toPx(1.4), toPx(5.2));
    const topBadgeH = toPx(0.85);
    const topBadgeY = contentTop + toPx(0.65);
    const topBadgeX = frontCenterX - topBadgeW / 2;

    // Fundo do badge superior (azul marinho profundo / roxo meia-noite)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#1e1b4b';
    this.roundRect(ctx, topBadgeX, topBadgeY, topBadgeW, topBadgeH, toPx(0.12));
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Ano em destaque (esquerda do badge)
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(toPx(0.34))}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(yearText, topBadgeX + toPx(0.25), topBadgeY + topBadgeH / 2);

    // Divisor vertical sutil
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(topBadgeX + toPx(2.0), topBadgeY + toPx(0.15));
    ctx.lineTo(topBadgeX + toPx(2.0), topBadgeY + topBadgeH - toPx(0.15));
    ctx.stroke();

    // Categoria do puzzle (direita do badge)
    ctx.fillStyle = '#fde68a';
    ctx.font = `800 ${Math.round(toPx(0.18))}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(catText, topBadgeX + toPx(2.2), topBadgeY + topBadgeH / 2);

    // B) TEXTO HERO GIGANTE EM DESTAQUE ("10 000 / 100+ DESAFIOS")
    const heroNum = config.heroCountText || i18n.heroNumber;
    const heroTxt = i18n.heroText;

    const heroY = topBadgeY + topBadgeH + toPx(0.5);

    // Número gigante branco com sombra 3D profunda
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(toPx(0.92))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(heroNum, frontCenterX, heroY);
    ctx.restore();

    // Texto hero secundário em amarelo ouro vibrante
    const heroTxtY = heroY + toPx(0.95);
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#fbbf24';
    ctx.font = `900 ${Math.round(toPx(0.48))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(heroTxt, frontCenterX, heroTxtY);
    ctx.restore();

    // C) BANNER / FITA ESTILIZADA ("ENDLESS THEMES TO EXPLORE")
    const bannerText = config.bannerTagText || i18n.bannerTag;
    const bannerW = Math.min(trimWPx - toPx(1.2), toPx(5.6));
    const bannerH = toPx(0.48);
    const bannerY = heroTxtY + toPx(0.65);
    const bannerX = frontCenterX - bannerW / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    // Gradiente da faixa azul escuro
    const bannerGrad = ctx.createLinearGradient(bannerX, 0, bannerX + bannerW, 0);
    bannerGrad.addColorStop(0, '#1e3a8a');
    bannerGrad.addColorStop(0.5, '#2563eb');
    bannerGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = bannerGrad;
    this.roundRect(ctx, bannerX, bannerY, bannerW, bannerH, toPx(0.08));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(toPx(0.18))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bannerText, frontCenterX, bannerY + bannerH / 2);

    // D) METADE INFERIOR: RENDER DO LIVRO ABERTO 3D (SE NÃO HOUVER IMAGEM DO REPLICATE)
    const bookY = bannerY + bannerH + toPx(0.5);
    if (!config.coverIllustrationUrl) {
      this.drawRealisticOpenBookGraphic(ctx, frontCenterX, bookY, trimWPx - toPx(1.6), toPx(2.8));
    }

    // E) PÍLULA DE DESTAQUE: "LARGE PRINT / LETRAS GRANDES"
    const pillText = i18n.largePrint;
    const pillW = toPx(2.4);
    const pillH = toPx(0.46);
    const pillY = bookY + toPx(2.3);
    const pillX = frontCenterX - pillW / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#1e1b4b';
    this.roundRect(ctx, pillX, pillY, pillW, pillH, toPx(0.23));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(toPx(0.20))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillText, frontCenterX, pillY + pillH / 2);

    // F) CRÉDITO DE AUTOR NO RODAPÉ
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(toPx(0.20))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${i18n.byAuthor} ${config.author || 'Author'}`, frontCenterX, h - bleedPx - toPx(0.4));

    // -------------------------------------------------------------
    // 3. LOMBADA (SPINE) COM EFEITO DE DOBRA 3D
    // -------------------------------------------------------------
    // Sombra das dobras da lombada
    const spineGrad = ctx.createLinearGradient(spineX, 0, spineX + spineWPx, 0);
    spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    spineGrad.addColorStop(0.2, 'rgba(0, 0, 0, 0.1)');
    spineGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.1)');
    spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(spineX, 0, spineWPx, h);

    if (specs.hasSpineText && spineWPx >= toPx(0.2)) {
      ctx.save();
      ctx.translate(spineX + spineWPx / 2, h / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.min(spineWPx * 0.55, toPx(0.22))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const spineText = `${config.title.toUpperCase()}  •  ${(config.author || '').toUpperCase()}`;
      ctx.fillText(spineText, 0, 0);
      ctx.restore();
    }

    // -------------------------------------------------------------
    // 4. CONTRACAPA (LADO ESQUERDO) - PADRÃO BESTSELLER DA REFERÊNCIA
    // -------------------------------------------------------------
    const backCenterX = backCoverX + trimWPx / 2;

    // A) Cabeçalho da Contracapa
    ctx.fillStyle = '#fbbf24';
    ctx.font = `900 ${Math.round(toPx(0.36))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(i18n.backTitle, backCenterX, contentTop + toPx(0.8));

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(toPx(0.22))}px sans-serif`;
    ctx.fillText(i18n.backSubtitle, backCenterX, contentTop + toPx(1.3));

    // Pílula central na contracapa ("LARGE PRINT")
    const backPillW = toPx(2.2);
    const backPillH = toPx(0.36);
    const backPillY = contentTop + toPx(1.75);
    const backPillX = backCenterX - backPillW / 2;

    ctx.fillStyle = '#1e3a8a';
    this.roundRect(ctx, backPillX, backPillY, backPillW, backPillH, toPx(0.18));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(toPx(0.16))}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(i18n.largePrint, backCenterX, backPillY + backPillH / 2);

    // Texto de Destaque
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(toPx(0.22))}px sans-serif`;
    ctx.fillText(`${i18n.heroNumber} ${i18n.heroText} • ${i18n.bannerTag}`, backCenterX, backPillY + backPillH + toPx(0.25));

    // B) 3 Caixas de Bônus / Destaques com Moldura Elegante
    const bonusW = (trimWPx - toPx(1.8)) / 3;
    const bonusH = toPx(1.2);
    const bonusY = backPillY + backPillH + toPx(0.55);

    i18n.bonusCards.forEach((b, idx) => {
      const bx = backCoverX + toPx(0.9) + idx * (bonusW + toPx(0.15));

      ctx.fillStyle = '#ffffff';
      this.roundRect(ctx, bx, bonusY, bonusW, bonusH, toPx(0.08));
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mini grade representativa dentro da caixinha
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + toPx(0.15), bonusY + toPx(0.15), bonusW - toPx(0.3), toPx(0.5));

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(toPx(0.12))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(b.tag, bx + bonusW / 2, bonusY + toPx(0.4));

      // Texto do benefício
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.round(toPx(0.11))}px sans-serif`;
      ctx.fillText(b.title, bx + bonusW / 2, bonusY + toPx(0.85));
    });

    // C) Ilustração do Livro Aberto com Miolo na Base da Contracapa
    this.drawOpenBookPagesSpread(ctx, backCenterX, bonusY + bonusH + toPx(0.3), trimWPx - toPx(1.8), toPx(2.2));

    // D) Reserva do Código de Barras KDP (2" x 1.2")
    const bcPx = {
      x: toPx(specs.barcodeArea.x),
      y: toPx(specs.barcodeArea.y),
      w: toPx(specs.barcodeArea.width),
      h: toPx(specs.barcodeArea.height)
    };

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bcPx.x, bcPx.y, bcPx.w, bcPx.h);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(bcPx.x, bcPx.y, bcPx.w, bcPx.h);

    ctx.fillStyle = '#64748b';
    ctx.font = `bold ${Math.round(toPx(0.11))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i18n.barcodeText, bcPx.x + bcPx.w / 2, bcPx.y + bcPx.h / 2 - toPx(0.1));
    ctx.font = `normal ${Math.round(toPx(0.09))}px sans-serif`;
    ctx.fillText('(Amazon KDP Barcode)', bcPx.x + bcPx.w / 2, bcPx.y + bcPx.h / 2 + toPx(0.15));

    // -------------------------------------------------------------
    // 5. LINHAS GUIA KDP (OPCIONAL)
    // -------------------------------------------------------------
    if (showGuides) {
      ctx.setLineDash([6, 4]);

      // Sangria
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(bleedPx, bleedPx, w - 2 * bleedPx, h - 2 * bleedPx);

      // Dobras da lombada
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
   * Desenha uma renderização vetorial 3D de livro aberto com páginas e lápis de madeira
   */
  private static drawRealisticOpenBookGraphic(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    topY: number,
    width: number,
    height: number
  ): void {
    ctx.save();

    // Sombra do livro
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;

    const bookW = width * 0.95;
    const bookH = height * 0.85;
    const bookX = centerX - bookW / 2;
    const bookY = topY + 10;

    // Páginas brancas do livro aberto (Folha Esquerda e Direita)
    ctx.fillStyle = '#ffffff';
    this.roundRect(ctx, bookX, bookY, bookW, bookH, 8);
    ctx.fill();

    // Vinco central da encadernação
    const spineGrad = ctx.createLinearGradient(centerX - 15, 0, centerX + 15, 0);
    spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
    spineGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
    spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(centerX - 12, bookY, 24, bookH);

    // Linhas simuladas de Caça-Palavras e Sudoku nas duas páginas
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;

    // Grade Página Esquerda (Sudoku / Caça-Palavras)
    const p1X = bookX + 15;
    const p1W = bookW / 2 - 30;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const dotX = p1X + c * (p1W / 8) + 4;
        const dotY = bookY + 15 + r * (bookH / 9);
        ctx.fillRect(dotX, dotY, 4, 4);
      }
    }

    // Grade Página Direita
    const p2X = centerX + 15;
    const p2W = bookW / 2 - 30;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const dotX = p2X + c * (p2W / 8) + 4;
        const dotY = bookY + 15 + r * (bookH / 9);
        ctx.fillRect(dotX, dotY, 4, 4);
      }
    }

    // Desenho de 2 Lápis de Madeira com Grafite repousando sobre o livro
    ctx.restore();
    ctx.save();

    // Lápis 1 (Inclinado)
    ctx.translate(centerX - 40, bookY + bookH / 2);
    ctx.rotate(-0.35);

    // Corpo de madeira
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-60, -5, 120, 10);
    // Ponta apontada
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(60, -5);
    ctx.lineTo(75, 0);
    ctx.lineTo(60, 5);
    ctx.fill();
    // Grafite preto
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(70, -2);
    ctx.lineTo(75, 0);
    ctx.lineTo(70, 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Desenha a abertura dupla de páginas no verso da capa
   */
  private static drawOpenBookPagesSpread(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    topY: number,
    width: number,
    height: number
  ): void {
    ctx.save();
    const w = width * 0.9;
    const h = height * 0.9;
    const x = centerX - w / 2;

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    this.roundRect(ctx, x, topY, w, h, 6);
    ctx.fill();

    // Vinco central
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(centerX - 6, topY, 12, h);

    // Simulação de texto impresso nas duas páginas
    ctx.fillStyle = '#64748b';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(x + 12, topY + 15 + i * 14, w / 2 - 25, 4);
      ctx.fillRect(centerX + 12, topY + 15 + i * 14, w / 2 - 25, 4);
    }

    ctx.restore();
  }

  /**
   * Constrói o arquivo PDF de Capa Aberta (Full-Wrap Cover PDF) com dimensões milimétricas KDP
   */
  public static async buildCoverPdf(
    config: PuzzleBookConfig,
    specs: KdpCoverSpecs
  ): Promise<{ doc: jsPDF; blob: Blob; dataUrl: string }> {
    const widthPt = specs.totalWidth * 72;
    const heightPt = specs.totalHeight * 72;

    const doc = new jsPDF({
      orientation: specs.totalWidth > specs.totalHeight ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [widthPt, heightPt]
    });

    const canvas = document.createElement('canvas');
    this.renderCoverToCanvas(canvas, config, specs, false);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(dataUrl, 'JPEG', 0, 0, widthPt, heightPt);

    const blob = doc.output('blob');
    return { doc, blob, dataUrl };
  }

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
}
