// ============================================================================
// 🎬 CINEMATIC TRANSITIONS ENGINE (INSPIRADO EM GL-TRANSITIONS & REMOTION)
// Transições de nível cinematográfico profissional para vídeo em HTML5 Canvas:
// - Zoom-Through Óptico (Remotion CrossZoom)
// - Film Burn 35mm / Light Leak (Película Analógica de Cinema)
// - Whip-Pan Dinâmico (Movimento Rápido com Motion Streaks estilo TikTok/BookTok)
// - Luma Dissolve (Wipe de Luminosidade)
// - Dip to Black / Shutter Teatral
// - Crossfade com Curva Bézier Cúbica (Sem cortes bruscos ou transições lineares)
// ============================================================================

export type CinematicTransitionStyle =
  | 'adaptiveCinema' // Escolha inteligente automática baseada na intensidade da cena
  | 'zoomThrough'    // Remotion CrossZoom / Zoom Óptico estilo Hollywood
  | 'filmBurn'       // Queima de Película 35mm & Light Leak Dourado
  | 'whipPan'        // Chicote de Câmera (Whip-Pan) com desfoque de movimento
  | 'lumaDissolve'   // Dissolve por luminância de alta definição
  | 'dipToBlack'     // Corte teatral com escurecimento cinematográfico
  | 'smoothBezier';  // Crossfade suave com interpolação Bézier cúbica

export interface TransitionRenderOptions {
  style?: CinematicTransitionStyle;
  direction?: 'left' | 'right' | 'up' | 'down';
  accentColor?: string; // Cor do flash/light leak (padrão dourado âmbar #f59e0b)
  intensity?: number;   // 0.5 a 1.5
}

export class CinematicTransitionsEngine {
  // --------------------------------------------------------------------------
  // Curvas de Interpolação Bézier (Remotion / Easing Standard)
  // --------------------------------------------------------------------------

  /**
   * Easing cúbico suave (padrão Remotion cubic-bezier(0.4, 0, 0.2, 1))
   */
  public static easeInOutCubic(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped < 0.5
      ? 4 * clamped * clamped * clamped
      : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
  }

  /**
   * Easing quintic super fluido para whip-pan e movimentos rápidos
   */
  public static easeInOutQuint(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped < 0.5
      ? 16 * clamped * clamped * clamped * clamped * clamped
      : 1 - Math.pow(-2 * clamped + 2, 5) / 2;
  }

  /**
   * Smoothstep clássico de shaders GLSL (gl-transitions)
   */
  public static smoothStep(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3 - 2 * clamped);
  }

  /**
   * Resolve a transição adaptativa de acordo com o índice do take ou contexto
   */
  public static resolveStyle(
    requestedStyle: CinematicTransitionStyle,
    takeIndex: number = 0,
    sceneIndex: number = 0
  ): Exclude<CinematicTransitionStyle, 'adaptiveCinema'> {
    if (requestedStyle !== 'adaptiveCinema') {
      return requestedStyle;
    }

    // Direção Adaptativa:
    // Take 1 -> Take 2 (Ambiente para Ação): Zoom-Through dramático
    // Take 2 -> Take 3 (Ação para Detalhe/Close): Whip-Pan ou Film Burn
    // Troca de Cena (Cena X para Cena X+1): Dip to Black ou Film Burn elegante
    if (takeIndex === 0) {
      return 'zoomThrough';
    } else if (takeIndex === 1) {
      return (sceneIndex % 2 === 0) ? 'filmBurn' : 'whipPan';
    } else {
      return 'dipToBlack';
    }
  }

  /**
   * Renderiza a transição cinematográfica no Canvas com aceleração 2D
   */
  public static renderTransition(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fromImg: HTMLImageElement | null,
    toImg: HTMLImageElement | null,
    rawProgress: number, // 0.0 a 1.0
    options: TransitionRenderOptions = {}
  ): void {
    const progress = Math.max(0, Math.min(1, rawProgress));
    const style = options.style || 'zoomThrough';

    switch (style) {
      case 'zoomThrough':
        this.renderZoomThrough(ctx, w, h, fromImg, toImg, progress, options);
        break;
      case 'filmBurn':
        this.renderFilmBurn(ctx, w, h, fromImg, toImg, progress, options);
        break;
      case 'whipPan':
        this.renderWhipPan(ctx, w, h, fromImg, toImg, progress, options);
        break;
      case 'dipToBlack':
        this.renderDipToBlack(ctx, w, h, fromImg, toImg, progress, options);
        break;
      case 'lumaDissolve':
        this.renderLumaDissolve(ctx, w, h, fromImg, toImg, progress, options);
        break;
      case 'smoothBezier':
      default:
        this.renderSmoothBezier(ctx, w, h, fromImg, toImg, progress, options);
        break;
    }
  }

  // --------------------------------------------------------------------------
  // 1. ZOOM-THROUGH CINEMATOGRÁFICO (REMOTION CROSSZOOM / HOLLYWOOD)
  // A imagem A dá um zoom expansivo suave enquanto a imagem B surge de um scale menor
  // com um sutil clarão luminoso no ápice (0.5)
  // --------------------------------------------------------------------------
  private static renderZoomThrough(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fromImg: HTMLImageElement | null,
    toImg: HTMLImageElement | null,
    progress: number,
    options: TransitionRenderOptions
  ): void {
    const eased = this.easeInOutCubic(progress);

    // Imagem A (Saindo): Zoom de 1.0 até 1.30 com fade out
    if (fromImg && eased < 1) {
      const fromScale = 1.0 + (eased * 0.30);
      const fromAlpha = Math.max(0, 1 - (eased * 1.3));
      this.drawCover(ctx, fromImg, w, h, fromScale, 0, 0, fromAlpha);
    }

    // Imagem B (Entrando): Começa em 0.88 e estabiliza em 1.00 com fade in
    if (toImg && eased > 0) {
      const toScale = 0.88 + (eased * 0.12);
      const toAlpha = Math.min(1, eased * 1.4);
      this.drawCover(ctx, toImg, w, h, toScale, 0, 0, toAlpha);
    }

    // Flash/Bloom óptico suave no centro do corte (entre 0.35 e 0.65)
    const flashCenter = 1 - Math.abs(progress - 0.5) * 2; // 0 nas pontas, 1 no meio
    if (flashCenter > 0.05) {
      const flashAlpha = Math.pow(flashCenter, 2) * 0.35 * (options.intensity || 1);
      ctx.save();
      const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
      grad.addColorStop(0.5, `rgba(251, 191, 36, ${flashAlpha * 0.4})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // 2. FILM BURN 35MM / LIGHT LEAK (PELÍCULA ANALÓGICA DE CINEMA)
  // Simula o vazamento de luz dourada orgânica na abertura do obturador
  // --------------------------------------------------------------------------
  private static renderFilmBurn(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fromImg: HTMLImageElement | null,
    toImg: HTMLImageElement | null,
    progress: number,
    options: TransitionRenderOptions
  ): void {
    const eased = this.smoothStep(progress);

    // Crossfade base com micro-zoom orgânico
    if (fromImg) {
      this.drawCover(ctx, fromImg, w, h, 1.0 + (progress * 0.05), 0, 0, 1 - eased);
    }
    if (toImg) {
      this.drawCover(ctx, toImg, w, h, 1.05 - (progress * 0.05), 0, 0, eased);
    }

    // Feixe de luz de película (Light Leak) no meio da transição
    const burnIntensity = Math.sin(progress * Math.PI); // pico senoidal perfeito
    if (burnIntensity > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const burnX = w * (0.2 + progress * 0.6);
      const burnY = h * (0.3 + (1 - progress) * 0.4);
      const radius = Math.max(w, h) * (0.6 + burnIntensity * 0.4);

      const leakGrad = ctx.createRadialGradient(burnX, burnY, 20, burnX, burnY, radius);
      const alpha = burnIntensity * 0.75 * (options.intensity || 1);
      leakGrad.addColorStop(0, `rgba(255, 245, 210, ${alpha})`);
      leakGrad.addColorStop(0.3, `rgba(245, 158, 11, ${alpha * 0.7})`);
      leakGrad.addColorStop(0.65, `rgba(239, 68, 68, ${alpha * 0.35})`);
      leakGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = leakGrad;
      ctx.fillRect(0, 0, w, h);

      // Linha de queima vertical simulando obturador analógico 35mm
      const shutterWidth = w * 0.15;
      const shutterX = (w * progress * 1.5) - shutterWidth;
      const shutterGrad = ctx.createLinearGradient(shutterX, 0, shutterX + shutterWidth, 0);
      shutterGrad.addColorStop(0, 'rgba(255,255,255,0)');
      shutterGrad.addColorStop(0.5, `rgba(255, 230, 150, ${alpha * 0.4})`);
      shutterGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shutterGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // 3. WHIP-PAN DINÂMICO (TIKTOK / BOOKTOK VIRAL FAST SHUTTER)
  // Chicote veloz horizontal com desfoque direcional e linhas de velocidade
  // --------------------------------------------------------------------------
  private static renderWhipPan(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fromImg: HTMLImageElement | null,
    toImg: HTMLImageElement | null,
    progress: number,
    options: TransitionRenderOptions
  ): void {
    const eased = this.easeInOutQuint(progress);
    const dir = options.direction === 'right' ? 1 : -1;

    // Deslocamento horizontal veloz
    const fromOffsetX = dir * eased * w * 1.15;
    const toOffsetX = dir * (eased - 1) * w * 1.15;

    if (fromImg) {
      this.drawCover(ctx, fromImg, w, h, 1.04, fromOffsetX, 0, 1 - (eased * 0.85));
    }
    if (toImg) {
      this.drawCover(ctx, toImg, w, h, 1.04, toOffsetX, 0, eased);
    }

    // Motion streaks horizontais no pico da velocidade (progress 0.3 a 0.7)
    const speed = 1 - Math.abs(progress - 0.5) * 2;
    if (speed > 0.15) {
      ctx.save();
      ctx.globalAlpha = speed * 0.35 * (options.intensity || 1);
      ctx.fillStyle = '#ffffff';

      // 4 linhas de velocidade translúcidas horizontais
      const lineY1 = h * 0.25;
      const lineY2 = h * 0.50;
      const lineY3 = h * 0.75;
      const hLine = h * 0.02;

      ctx.fillRect(0, lineY1, w, hLine);
      ctx.fillRect(0, lineY2, w, hLine * 1.5);
      ctx.fillRect(0, lineY3, w, hLine);
      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // 4. DIP TO BLACK TEATRAL (CORTE DRAMÁTICO / SUSPENSE)
  // Escurece suavemente para o preto cinematográfico e sobe para a nova imagem
  // --------------------------------------------------------------------------
  private static renderDipToBlack(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fromImg: HTMLImageElement | null,
    toImg: HTMLImageElement | null,
    progress: number,
    _options: TransitionRenderOptions
  ): void {
    // 0..0.5: escurece Imagem A | 0.5..1.0: clareia Imagem B
    if (progress < 0.5) {
      const p = progress / 0.5;
      const eased = this.easeInOutCubic(p);
      if (fromImg) {
        this.drawCover(ctx, fromImg, w, h, 1.0 + (p * 0.03), 0, 0, 1 - (eased * 0.95));
      }
      ctx.fillStyle = `rgba(5, 5, 10, ${eased})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      const p = (progress - 0.5) / 0.5;
      const eased = this.easeInOutCubic(p);
      if (toImg) {
        this.drawCover(ctx, toImg, w, h, 1.03 - (p * 0.03), 0, 0, eased);
      }
      ctx.fillStyle = `rgba(5, 5, 10, ${1 - eased})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // --------------------------------------------------------------------------
  // 5. LUMA DISSOLVE (WIPE POR LUMINOSIDADE)
  // As altas luzes e contraste transicionam com prioridade
  // --------------------------------------------------------------------------
  private static renderLumaDissolve(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fromImg: HTMLImageElement | null,
    toImg: HTMLImageElement | null,
    progress: number,
    _options: TransitionRenderOptions
  ): void {
    const eased = this.smoothStep(progress);

    if (fromImg) {
      this.drawCover(ctx, fromImg, w, h, 1.0 + (eased * 0.04), 0, 0, 1.0);
    }

    if (toImg) {
      ctx.save();
      ctx.globalAlpha = eased;
      this.drawCover(ctx, toImg, w, h, 1.04 - (eased * 0.04), 0, 0, 1.0);

      // Realce de contraste de alta luminosidade no limiar
      if (eased > 0.1 && eased < 0.9) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - Math.abs(eased - 0.5) * 2) * 0.25;
        this.drawCover(ctx, toImg, w, h, 1.0, 0, 0, 1.0);
      }
      ctx.restore();
    }
  }

  // --------------------------------------------------------------------------
  // 6. CROSSFADE BÉZIER CÚBICO SUAVE (REMOTION EASING)
  // Elimina transições duras com curva S perfeita e micro-deriva de escala
  // --------------------------------------------------------------------------
  private static renderSmoothBezier(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fromImg: HTMLImageElement | null,
    toImg: HTMLImageElement | null,
    progress: number,
    _options: TransitionRenderOptions
  ): void {
    const eased = this.easeInOutCubic(progress);

    if (fromImg) {
      const fromScale = 1.0 + (eased * 0.04);
      this.drawCover(ctx, fromImg, w, h, fromScale, 0, 0, 1 - (eased * 0.98));
    }

    if (toImg) {
      const toScale = 1.04 - (eased * 0.04);
      this.drawCover(ctx, toImg, w, h, toScale, 0, 0, eased);
    }
  }

  // --------------------------------------------------------------------------
  // Helper: Desenha imagem mantendo proporção de preenchimento (Object-Fit: Cover)
  // --------------------------------------------------------------------------
  private static drawCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    canvasW: number,
    canvasH: number,
    scale: number = 1.0,
    offsetX: number = 0,
    offsetY: number = 0,
    alpha: number = 1.0
  ): void {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = canvasW / canvasH;

    let drawW = canvasW;
    let drawH = canvasH;

    if (imgAspect > canvasAspect) {
      drawH = canvasH;
      drawW = canvasH * imgAspect;
    } else {
      drawW = canvasW;
      drawH = canvasW / imgAspect;
    }

    drawW *= scale;
    drawH *= scale;

    const drawX = ((canvasW - drawW) / 2) + offsetX;
    const drawY = ((canvasH - drawH) / 2) + offsetY;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }
}
