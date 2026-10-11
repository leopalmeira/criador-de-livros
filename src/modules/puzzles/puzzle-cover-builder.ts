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
    const bleed = 0.125; // 0.125" sangria padrão KDP

    const spineMultiplier = config.paperColor === 'cream' ? 0.0025 : 0.002252;
    const spineWidth = Math.max(0.06, pageCount * spineMultiplier);

    const totalWidth = bleed + trimWidth + spineWidth + trimWidth + bleed;
    const totalHeight = bleed + trimHeight + bleed;

    const hasSpineText = pageCount >= 79;

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
   * Desenha a capa completa em um HTMLCanvasElement com auto-fit rigoroso
   * Garantia total anti-estouro: nenhum texto ultrapassa as margens de segurança KDP!
   */
  private static imageCache = new Map<string, HTMLImageElement>();

  /**
   * Desenha a capa completa em um HTMLCanvasElement com auto-fit rigoroso
   * Garantia total anti-estouro: nenhum texto ultrapassa as margens de segurança KDP!
   */
  public static renderCoverToCanvas(
    canvas: HTMLCanvasElement,
    config: PuzzleBookConfig,
    specs: KdpCoverSpecs,
    showGuides = false,
    onImageLoaded?: () => void
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

    // MARGEM DE SEGURANÇA KDP: 0.375" (56px) para dentro das bordas
    const safeMarginPx = toPx(0.375);
    const safeContentWidth = trimWPx - 2 * safeMarginPx;

    const lang = config.language || 'pt';
    const i18n = I18N_COVER[lang] || I18N_COVER.pt;

    // -------------------------------------------------------------
    // 1. FUNDO GERAL COM GRADIENTE EDITORIAL
    // -------------------------------------------------------------
    const primaryColor = config.coverPrimaryColor || '#5f1212';
    const secondaryColor = config.coverSecondaryColor || '#7f1d1d';

    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, primaryColor);
    bgGrad.addColorStop(0.5, secondaryColor);
    bgGrad.addColorStop(1, '#3b0a0a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Efeito de vinheta suave
    const radGlow = ctx.createRadialGradient(
      frontCoverX + trimWPx / 2,
      contentTop + toPx(3),
      10,
      frontCoverX + trimWPx / 2,
      contentTop + toPx(3),
      trimWPx
    );
    radGlow.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    radGlow.addColorStop(1, 'rgba(0, 0, 0, 0.40)');
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, w, h);

    // Se houver imagem gerada pelo Replicate, desenha com carregamento seguro e crossOrigin
    if (config.coverIllustrationUrl) {
      try {
        let img = this.imageCache.get(config.coverIllustrationUrl);
        if (!img) {
          img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = config.coverIllustrationUrl;
          this.imageCache.set(config.coverIllustrationUrl, img);
          img.onload = () => {
            if (onImageLoaded) onImageLoaded();
          };
        }

        if (img.complete && img.naturalWidth > 0) {
          const imgH = trimWPx * 0.92;
          const imgY = h - bleedPx - imgH - toPx(0.35);
          const imgX = frontCoverX + safeMarginPx + toPx(0.1);
          const imgW = safeContentWidth - toPx(0.2);

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 8;
          this.roundRect(ctx, imgX, imgY, imgW, imgH, toPx(0.12));
          ctx.clip();
          ctx.drawImage(img, imgX, imgY, imgW, imgH);
          ctx.restore();
        }
      } catch (err) {
        console.warn('Erro ao desenhar imagem do Replicate no canvas:', err);
      }
    }

    // -------------------------------------------------------------
    // 2. CAPA FRONTAL (LADO DIREITO) - TEXTO RIGOROSAMENTE SEM ESTOURO
    // -------------------------------------------------------------
    const frontCenterX = frontCoverX + trimWPx / 2;

    // A) BADGE SUPERIOR ESTILIZADO ("NEW 2026 | WORD SEARCH & SUDOKU")
    const yearText = config.yearBadge || i18n.yearBadge;
    const catText = i18n.categoryTag;

    const topBadgeW = Math.min(safeContentWidth - toPx(0.4), toPx(5.4));
    const topBadgeH = toPx(0.72);
    const topBadgeY = contentTop + safeMarginPx + toPx(0.2);
    const topBadgeX = frontCenterX - topBadgeW / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#1e1b4b';
    this.roundRect(ctx, topBadgeX, topBadgeY, topBadgeW, topBadgeH, toPx(0.12));
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Ano em destaque (esquerda do badge)
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(toPx(0.28))}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(yearText, topBadgeX + toPx(0.22), topBadgeY + topBadgeH / 2);

    // Divisor vertical
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(topBadgeX + toPx(1.85), topBadgeY + toPx(0.12));
    ctx.lineTo(topBadgeX + toPx(1.85), topBadgeY + topBadgeH - toPx(0.12));
    ctx.stroke();

    // Categoria auto-ajustada dentro do espaço restante do badge
    ctx.fillStyle = '#fde68a';
    this.drawAutoFitText(
      ctx,
      catText,
      topBadgeX + toPx(2.0),
      topBadgeY + topBadgeH / 2,
      topBadgeW - toPx(2.2),
      Math.round(toPx(0.18)),
      Math.round(toPx(0.11)),
      '800',
      'left',
      'middle'
    );

    // B) TEXTO HERO EM DESTAQUE COM AUTO-FIT TOTALMENTE SEGURO
    // Extrai número e sufixo para evitar duplicações como "10,000 UNIQUE WORDS" seguido de "UNIQUE WORDS"
    const rawHero = (config.heroCountText || i18n.heroNumber).trim();
    let displayHeroNum = rawHero;
    let displayHeroTxt = i18n.heroText;

    // Se o usuário digitou número + palavras no campo heroCountText (ex: "10,000 UNIQUE WORDS" ou "100+ DESAFIOS")
    const matchHeroSplit = rawHero.match(/^([0-9.,+]+)\s*(.*)$/i);
    if (matchHeroSplit && matchHeroSplit[2]) {
      displayHeroNum = matchHeroSplit[1].trim();
      displayHeroTxt = matchHeroSplit[2].trim();
    } else if (rawHero.toUpperCase().includes(i18n.heroText.toUpperCase())) {
      displayHeroNum = rawHero.replace(new RegExp(i18n.heroText, 'gi'), '').trim() || i18n.heroNumber;
      displayHeroTxt = i18n.heroText;
    }

    const heroY = topBadgeY + topBadgeH + toPx(0.35);

    // 1. Número Hero (Branco com sombra 3D, restrito a safeContentWidth)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#ffffff';
    const usedHeroNumSize = this.drawAutoFitText(
      ctx,
      displayHeroNum,
      frontCenterX,
      heroY,
      safeContentWidth - toPx(0.3), // Espaço com folga segura
      Math.round(toPx(0.75)),       // Tamanho inicial proporcional seguro
      Math.round(toPx(0.30)),       // Mínimo seguro
      '900',
      'center',
      'top'
    );
    ctx.restore();

    // 2. Texto Hero Secundário (Amarelo Dourado com sombra 3D)
    const heroTxtY = heroY + usedHeroNumSize + toPx(0.08);
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#fbbf24';
    const usedHeroTxtSize = this.drawAutoFitText(
      ctx,
      displayHeroTxt,
      frontCenterX,
      heroTxtY,
      safeContentWidth - toPx(0.3),
      Math.round(toPx(0.38)),
      Math.round(toPx(0.18)),
      '900',
      'center',
      'top'
    );
    ctx.restore();

    // C) BANNER / FITA ESTILIZADA (ENDLESS THEMES TO EXPLORE)
    const bannerText = config.bannerTagText || i18n.bannerTag;
    const bannerW = Math.min(safeContentWidth - toPx(0.2), toPx(5.4));
    const bannerH = toPx(0.44);
    const bannerY = heroTxtY + usedHeroTxtSize + toPx(0.20);
    const bannerX = frontCenterX - bannerW / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
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
    this.drawAutoFitText(
      ctx,
      bannerText,
      frontCenterX,
      bannerY + bannerH / 2,
      bannerW - toPx(0.4),
      Math.round(toPx(0.17)),
      Math.round(toPx(0.11)),
      '800',
      'center',
      'middle'
    );

    // D) METADE INFERIOR: LIVRO ABERTO REALISTA (SE NÃO HOUVER ARTE REPLICATE)
    const bookY = bannerY + bannerH + toPx(0.35);
    if (!config.coverIllustrationUrl) {
      this.drawCleanOpenBookSpread(ctx, frontCenterX, bookY, safeContentWidth - toPx(0.6), toPx(2.5));
    }

    // E) PÍLULA DE DESTAQUE: "LARGE PRINT / LETRAS GRANDES"
    const pillText = i18n.largePrint;
    const pillW = Math.min(safeContentWidth * 0.55, toPx(2.5));
    const pillH = toPx(0.42);
    const pillY = bookY + toPx(2.1);
    const pillX = frontCenterX - pillW / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#1e1b4b';
    this.roundRect(ctx, pillX, pillY, pillW, pillH, toPx(0.21));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    this.drawAutoFitText(
      ctx,
      pillText,
      frontCenterX,
      pillY + pillH / 2,
      pillW - toPx(0.3),
      Math.round(toPx(0.18)),
      Math.round(toPx(0.11)),
      '900',
      'center',
      'middle'
    );

    // F) CRÉDITO DE AUTOR NO RODAPÉ
    ctx.fillStyle = '#ffffff';
    const authorLine = `${i18n.byAuthor} ${config.author || 'Author'}`;
    this.drawAutoFitText(
      ctx,
      authorLine,
      frontCenterX,
      h - bleedPx - safeMarginPx,
      safeContentWidth,
      Math.round(toPx(0.19)),
      Math.round(toPx(0.12)),
      'bold',
      'center',
      'bottom'
    );

    // -------------------------------------------------------------
    // 3. LOMBADA (SPINE) COM RELEVO E TEXTO VERTICAL SE >= 79 PÁGINAS
    // -------------------------------------------------------------
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
      const spineText = `${config.title.toUpperCase()}  •  ${(config.author || '').toUpperCase()}`;
      const spineMaxW = h - 2 * bleedPx - 2 * safeMarginPx;
      this.drawAutoFitText(
        ctx,
        spineText,
        0,
        0,
        spineMaxW,
        Math.min(spineWPx * 0.55, toPx(0.20)),
        Math.min(spineWPx * 0.35, toPx(0.10)),
        'bold',
        'center',
        'middle'
      );
      ctx.restore();
    }

    // -------------------------------------------------------------
    // 4. CONTRACAPA (LADO ESQUERDO) - 100% CONTIDA NA SAFE ZONE
    // -------------------------------------------------------------
    const backCenterX = backCoverX + trimWPx / 2;

    // A) Cabeçalho da Contracapa
    ctx.fillStyle = '#fbbf24';
    const backTitleY = contentTop + safeMarginPx;
    this.drawAutoFitText(
      ctx,
      i18n.backTitle,
      backCenterX,
      backTitleY,
      safeContentWidth - toPx(0.2),
      Math.round(toPx(0.34)),
      Math.round(toPx(0.18)),
      '900',
      'center',
      'top'
    );

    ctx.fillStyle = '#ffffff';
    const backSubY = backTitleY + toPx(0.42);
    this.drawAutoFitText(
      ctx,
      i18n.backSubtitle,
      backCenterX,
      backSubY,
      safeContentWidth - toPx(0.2),
      Math.round(toPx(0.21)),
      Math.round(toPx(0.13)),
      '700',
      'center',
      'top'
    );

    // Pílula Central ("LARGE PRINT")
    const backPillW = Math.min(safeContentWidth * 0.5, toPx(2.2));
    const backPillH = toPx(0.34);
    const backPillY = backSubY + toPx(0.36);
    const backPillX = backCenterX - backPillW / 2;

    ctx.fillStyle = '#1e3a8a';
    this.roundRect(ctx, backPillX, backPillY, backPillW, backPillH, toPx(0.17));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    this.drawAutoFitText(
      ctx,
      i18n.largePrint,
      backCenterX,
      backPillY + backPillH / 2,
      backPillW - toPx(0.2),
      Math.round(toPx(0.15)),
      Math.round(toPx(0.10)),
      '900',
      'center',
      'middle'
    );

    // Linha de Destaque Sem Estouro (quebrada em 2 linhas se necessário)
    ctx.fillStyle = '#ffffff';
    const subHighlightY = backPillY + backPillH + toPx(0.18);
    const highlightText = `${i18n.heroNumber} ${i18n.heroText} • ${i18n.bannerTag}`;
    this.drawAutoFitText(
      ctx,
      highlightText,
      backCenterX,
      subHighlightY,
      safeContentWidth - toPx(0.2),
      Math.round(toPx(0.18)),
      Math.round(toPx(0.12)),
      '800',
      'center',
      'top'
    );

    // B) 3 Caixas de Bônus / Destaques com Moldura Elegante
    const bonusGap = toPx(0.12);
    const bonusW = (safeContentWidth - 2 * bonusGap) / 3;
    const bonusH = toPx(1.05);
    const bonusY = subHighlightY + toPx(0.42);

    i18n.bonusCards.forEach((b, idx) => {
      const bx = backCoverX + safeMarginPx + idx * (bonusW + bonusGap);

      ctx.fillStyle = '#ffffff';
      this.roundRect(ctx, bx, bonusY, bonusW, bonusH, toPx(0.08));
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Topo do card
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + toPx(0.1), bonusY + toPx(0.1), bonusW - toPx(0.2), toPx(0.42));

      ctx.fillStyle = '#ffffff';
      this.drawAutoFitText(
        ctx,
        b.tag,
        bx + bonusW / 2,
        bonusY + toPx(0.31),
        bonusW - toPx(0.25),
        Math.round(toPx(0.12)),
        Math.round(toPx(0.08)),
        'bold',
        'center',
        'middle'
      );

      // Texto descritivo
      ctx.fillStyle = '#0f172a';
      this.drawAutoFitText(
        ctx,
        b.title,
        bx + bonusW / 2,
        bonusY + toPx(0.75),
        bonusW - toPx(0.15),
        Math.round(toPx(0.11)),
        Math.round(toPx(0.08)),
        'bold',
        'center',
        'middle'
      );
    });

    // C) Ilustração Limpa das Páginas Abertas
    this.drawCleanOpenBookSpread(
      ctx,
      backCenterX,
      bonusY + bonusH + toPx(0.25),
      safeContentWidth - toPx(0.6),
      toPx(2.0)
    );

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
    this.drawAutoFitText(
      ctx,
      i18n.barcodeText,
      bcPx.x + bcPx.w / 2,
      bcPx.y + bcPx.h / 2 - toPx(0.1),
      bcPx.w - 10,
      Math.round(toPx(0.11)),
      Math.round(toPx(0.08)),
      'bold',
      'center',
      'middle'
    );
    this.drawAutoFitText(
      ctx,
      '(Amazon KDP Barcode)',
      bcPx.x + bcPx.w / 2,
      bcPx.y + bcPx.h / 2 + toPx(0.14),
      bcPx.w - 10,
      Math.round(toPx(0.09)),
      Math.round(toPx(0.07)),
      'normal',
      'center',
      'middle'
    );

    // -------------------------------------------------------------
    // 5. LINHAS GUIA KDP (OPCIONAL)
    // -------------------------------------------------------------
    if (showGuides) {
      ctx.setLineDash([6, 4]);

      // Sangria
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(bleedPx, bleedPx, w - 2 * bleedPx, h - 2 * bleedPx);

      // Margem Segura (Safe Zone KDP)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        frontCoverX + safeMarginPx,
        contentTop + safeMarginPx,
        safeContentWidth,
        h - 2 * bleedPx - 2 * safeMarginPx
      );
      ctx.strokeRect(
        backCoverX + safeMarginPx,
        contentTop + safeMarginPx,
        safeContentWidth,
        h - 2 * bleedPx - 2 * safeMarginPx
      );

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
   * Função utilitária anti-estouro: ajusta dinamicamente a fonte até que caiba rigorosamente na largura máxima sem cortar
   */
  private static drawAutoFitText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    idealFontSize: number,
    minFontSize: number = 8,
    fontWeight: string = 'bold',
    textAlign: CanvasTextAlign = 'center',
    textBaseline: CanvasTextBaseline = 'middle',
    fontFamily: string = 'Impact, "Montserrat", "Arial Black", sans-serif'
  ): number {
    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;

    let fontSize = idealFontSize;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    let measuredWidth = ctx.measureText(text).width;

    // Redução proporcional rápida e exata com folga de segurança de 3%
    const targetWidth = maxWidth * 0.97;
    if (measuredWidth > targetWidth && measuredWidth > 0) {
      const scale = targetWidth / measuredWidth;
      fontSize = Math.max(minFontSize, Math.floor(fontSize * scale));
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      measuredWidth = ctx.measureText(text).width;
    }

    // Loop fino caso o kerning ou fonte não linear precise de ajuste de 1px
    while (measuredWidth > targetWidth && fontSize > minFontSize) {
      fontSize -= 1;
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      measuredWidth = ctx.measureText(text).width;
    }

    // Garantia absoluta: se no minFontSize o texto ainda exceder maxWidth, comprime suavemente no eixo horizontal
    if (measuredWidth > maxWidth && measuredWidth > 0) {
      ctx.save();
      const compressFactor = targetWidth / measuredWidth;
      ctx.translate(x, y);
      ctx.scale(compressFactor, 1);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(text, x, y);
    }

    return fontSize;
  }

  /**
   * Desenha representação limpa de livro aberto sem traços tortos ou fora de escala
   */
  private static drawCleanOpenBookSpread(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    topY: number,
    width: number,
    height: number
  ): void {
    ctx.save();
    const w = width * 0.92;
    const h = height * 0.82;
    const x = centerX - w / 2;

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    this.roundRect(ctx, x, topY, w, h, 6);
    ctx.fill();

    // Vinco central
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(centerX - 8, topY, 16, h);

    // Linhas representativas nítidas
    ctx.fillStyle = '#64748b';
    const colW = w / 2 - 24;
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(x + 12, topY + 14 + i * (h / 8), colW, 3);
      ctx.fillRect(centerX + 12, topY + 14 + i * (h / 8), colW, 3);
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
