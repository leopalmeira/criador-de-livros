// Serviço de Geração de Materiais Visuais Derivados Exclusivamente da Capa
import { jsPDF } from 'jspdf';

export interface DerivedAssetDefinition {
  id: string;
  name: string;
  category: '3D_MOCKUP' | 'SOCIAL_MEDIA' | 'AMAZON_APLUS' | 'AUDIOBOOK' | 'PRINT_INSERT';
  dimensionsLabel: string;
  width: number;
  height: number;
  description: string;
}

export const DERIVED_ASSET_TEMPLATES: DerivedAssetDefinition[] = [
  {
    id: 'mockup-3d-hardcover',
    name: 'Mockup 3D Capa Dura com Sombra',
    category: '3D_MOCKUP',
    dimensionsLabel: '1800 x 1400 px',
    width: 1800,
    height: 1400,
    description: 'Apresentação tridimensional premium para landing pages e campanhas de lançamento.'
  },
  {
    id: 'mockup-3d-paperback',
    name: 'Mockup 3D Livro Brochura Realista',
    category: '3D_MOCKUP',
    dimensionsLabel: '1600 x 1400 px',
    width: 1600,
    height: 1400,
    description: 'Visualização da versão impressa padrão KDP com curvatura de páginas e reflexo de luz.'
  },
  {
    id: 'instagram-feed',
    name: 'Banner Instagram Feed (1:1 Quadrado)',
    category: 'SOCIAL_MEDIA',
    dimensionsLabel: '1080 x 1080 px',
    width: 1080,
    height: 1080,
    description: 'Arte promocional com mockup 3D, selo de lançamento e chamada de ação para venda.'
  },
  {
    id: 'instagram-stories',
    name: 'Banner Stories & Reels (9:16 Vertical)',
    category: 'SOCIAL_MEDIA',
    dimensionsLabel: '1080 x 1920 px',
    width: 1080,
    height: 1920,
    description: 'Layout vertical impactante ideal para stories do Instagram, WhatsApp e TikTok.'
  },
  {
    id: 'amazon-aplus-hero',
    name: 'Amazon A+ Content — Hero Banner',
    category: 'AMAZON_APLUS',
    dimensionsLabel: '970 x 300 px',
    width: 970,
    height: 300,
    description: 'Banner horizontal oficial da Amazon KDP para a seção "Do Editor" na página do produto.'
  },
  {
    id: 'amazon-aplus-square',
    name: 'Amazon A+ Content — Módulo Destaque',
    category: 'AMAZON_APLUS',
    dimensionsLabel: '300 x 300 px',
    width: 300,
    height: 300,
    description: 'Ícone visual para comparação de obras e destaques visuais do livro.'
  },
  {
    id: 'audiobook-square',
    name: 'Capa Quadrada para Audiobook (Audible)',
    category: 'AUDIOBOOK',
    dimensionsLabel: '2400 x 2400 px HD',
    width: 2400,
    height: 2400,
    description: 'Adaptação 1:1 rigorosamente nas dimensões exigidas pelo Audible e Apple Books.'
  }
];

export class CoverDerivedAssetsService {
  /**
   * Renderiza e exporta em alta resolução qualquer um dos materiais derivados a partir da capa
   */
  public static async renderDerivedAsset(
    assetId: string,
    title: string,
    subtitle: string,
    author: string,
    badgeText: string,
    artUrl: string,
    titleColor: string = '#ffffff',
    subtitleColor: string = '#fbbf24',
    authorColor: string = '#f1f5f9',
    fontFamily: string = "'Cinzel', Georgia, serif"
  ): Promise<string> {
    const asset = DERIVED_ASSET_TEMPLATES.find(a => a.id === assetId) || DERIVED_ASSET_TEMPLATES[0];

    const canvas = document.createElement('canvas');
    canvas.width = asset.width;
    canvas.height = asset.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível obter contexto 2D do Canvas.');

    // Carrega a imagem da capa antes de compor
    const img = await this.loadImageSafe(artUrl);

    // Renderizadores específicos por categoria
    switch (asset.id) {
      case 'mockup-3d-hardcover':
        this.draw3DHardcover(ctx, canvas.width, canvas.height, img, title, author, badgeText, titleColor, fontFamily);
        break;

      case 'mockup-3d-paperback':
        this.draw3DPaperback(ctx, canvas.width, canvas.height, img, title, subtitle, author, badgeText, titleColor, subtitleColor, authorColor, fontFamily);
        break;

      case 'instagram-feed':
        this.drawInstagramFeed(ctx, canvas.width, canvas.height, img, title, subtitle, author, badgeText, titleColor, subtitleColor, fontFamily);
        break;

      case 'instagram-stories':
        this.drawInstagramStories(ctx, canvas.width, canvas.height, img, title, subtitle, author, badgeText, titleColor, subtitleColor, fontFamily);
        break;

      case 'amazon-aplus-hero':
        this.drawAmazonAPlusHero(ctx, canvas.width, canvas.height, img, title, subtitle, author, badgeText, titleColor, subtitleColor, fontFamily);
        break;

      case 'audiobook-square':
        this.drawAudiobookSquare(ctx, canvas.width, canvas.height, img, title, subtitle, author, badgeText, titleColor, subtitleColor, authorColor, fontFamily);
        break;

      default:
        this.drawGenericCard(ctx, canvas.width, canvas.height, img, title, author);
        break;
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Baixa a imagem gerada diretamente para o computador
   */
  public static triggerDownload(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- MÉTODOS DE DESENHO GRÁFICO (CANVAS 2D) ---

  private static draw3DHardcover(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    img: HTMLImageElement | null,
    title: string,
    author: string,
    badgeText: string,
    titleColor: string,
    fontFamily: string
  ): void {
    // Fundo elegante de estúdio em gradiente radial escuro
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, w / 1.4);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Sombra de contato projetada no piso
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(w * 0.52, h * 0.85, 340, 45, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.filter = 'blur(16px)';
    ctx.fill();
    ctx.restore();

    // Livro 3D Isométrico
    const bookX = w * 0.36;
    const bookY = h * 0.16;
    const bookW = 540;
    const bookH = 820;

    // Páginas laterais
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(bookX + bookW, bookY + 15);
    ctx.lineTo(bookX + bookW + 45, bookY + 40);
    ctx.lineTo(bookX + bookW + 45, bookY + bookH - 5);
    ctx.lineTo(bookX + bookW, bookY + bookH - 25);
    ctx.closePath();
    ctx.fill();

    // Lombada 3D
    const spineGrad = ctx.createLinearGradient(bookX - 55, bookY, bookX, bookY);
    spineGrad.addColorStop(0, '#0f172a');
    spineGrad.addColorStop(0.5, '#334155');
    spineGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = spineGrad;
    ctx.beginPath();
    ctx.moveTo(bookX - 55, bookY + 25);
    ctx.lineTo(bookX, bookY);
    ctx.lineTo(bookX, bookY + bookH);
    ctx.lineTo(bookX - 55, bookY + bookH + 20);
    ctx.closePath();
    ctx.fill();

    // Frente do Livro
    ctx.save();
    ctx.beginPath();
    ctx.rect(bookX, bookY, bookW, bookH);
    ctx.clip();

    if (img) {
      ctx.drawImage(img, bookX, bookY, bookW, bookH);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bookX, bookY, bookW, bookH);
    }

    // Scrim escuro para legibilidade
    const scrim = ctx.createLinearGradient(bookX, bookY, bookX, bookY + bookH);
    scrim.addColorStop(0, 'rgba(0,0,0,0.7)');
    scrim.addColorStop(0.4, 'rgba(0,0,0,0.15)');
    scrim.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = scrim;
    ctx.fillRect(bookX, bookY, bookW, bookH);

    // Selo
    if (badgeText) {
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(bookX + bookW / 2 - 140, bookY + 45, 280, 42, 21);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, bookX + bookW / 2, bookY + 72);
    }

    // Título
    ctx.font = `bold 42px ${fontFamily}`;
    ctx.fillStyle = titleColor;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 15;
    ctx.fillText(title, bookX + bookW / 2, bookY + 200, bookW - 60);

    // Autor
    ctx.font = 'bold 24px Montserrat, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(author, bookX + bookW / 2, bookY + bookH - 60);

    // Brilho de Iluminação Especular (Sheen)
    const sheen = ctx.createLinearGradient(bookX, bookY, bookX + bookW, bookY + bookH);
    sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(255,255,255,0.12)');
    ctx.fillStyle = sheen;
    ctx.fillRect(bookX, bookY, bookW, bookH);

    ctx.restore();
  }

  private static draw3DPaperback(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    img: HTMLImageElement | null,
    title: string,
    subtitle: string,
    author: string,
    badgeText: string,
    titleColor: string,
    subtitleColor: string,
    authorColor: string,
    fontFamily: string
  ): void {
    // Fundo limpo claro para visualização de brochura
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    this.draw3DHardcover(ctx, w, h, img, title, author, badgeText, titleColor, fontFamily);
  }

  private static drawInstagramFeed(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    img: HTMLImageElement | null,
    title: string,
    subtitle: string,
    author: string,
    badgeText: string,
    titleColor: string,
    subtitleColor: string,
    fontFamily: string
  ): void {
    // Fundo escuro com gradiente de alta conversão
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0a1128');
    bg.addColorStop(1, '#1c2541');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Tag Superior de Lançamento
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(80, 70, 260, 48, 24);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚀 LANÇAMENTO OFICIAL', 210, 101);

    // Capa do Livro à Direita
    const cvW = 390;
    const cvH = 585;
    const cvX = w - cvW - 80;
    const cvY = 240;

    // Sombra da Capa
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.filter = 'blur(20px)';
    ctx.fillRect(cvX + 15, cvY + 25, cvW, cvH);
    ctx.restore();

    if (img) {
      ctx.drawImage(img, cvX, cvY, cvW, cvH);
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillRect(cvX, cvY, cvW, cvH);
    }

    // Textos Promocionais à Esquerda
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px Montserrat, sans-serif';
    ctx.fillText('DISPONÍVEL NA', 80, 260);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('AMAZON KINDLE', 80, 315);

    // Título do Livro
    ctx.fillStyle = titleColor;
    ctx.font = `bold 36px ${fontFamily}`;
    ctx.fillText(title, 80, 420, 480);

    // Subtítulo
    if (subtitle) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px Inter, sans-serif';
      ctx.fillText(subtitle, 80, 490, 460);
    }

    // Autor
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 22px Montserrat, sans-serif';
    ctx.fillText(`Por ${author}`, 80, 600);

    // Botão de Chamada para Ação
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.roundRect(80, 880, 420, 68, 34);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GARANTA SEU EXEMPLAR ➔', 290, 922);
  }

  private static drawInstagramStories(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    img: HTMLImageElement | null,
    title: string,
    subtitle: string,
    author: string,
    badgeText: string,
    titleColor: string,
    subtitleColor: string,
    fontFamily: string
  ): void {
    // Fundo vertical
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#090d16');
    bg.addColorStop(0.5, '#1e1b4b');
    bg.addColorStop(1, '#030712');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Topo: Selo
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AMAZON BEST-SELLER • EDIÇÃO 2026', w / 2, 140);

    // Capa do Livro Centralizada
    const cvW = 540;
    const cvH = 810;
    const cvX = (w - cvW) / 2;
    const cvY = 320;

    // Sombra
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.filter = 'blur(25px)';
    ctx.fillRect(cvX, cvY + 30, cvW, cvH);
    ctx.restore();

    if (img) {
      ctx.drawImage(img, cvX, cvY, cvW, cvH);
    }

    // Título em destaque inferior
    ctx.font = `bold 52px ${fontFamily}`;
    ctx.fillStyle = titleColor;
    ctx.fillText(title, w / 2, 1300, w - 160);

    // Autor
    ctx.font = 'bold 30px Montserrat, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(author, w / 2, 1400);

    // Swipe-Up / Link
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.roundRect((w - 500) / 2, 1650, 500, 90, 45);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px Montserrat, sans-serif';
    ctx.fillText('CLIQUE PARA LER NO KINDLE', w / 2, 1705);
  }

  private static drawAmazonAPlusHero(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    img: HTMLImageElement | null,
    title: string,
    subtitle: string,
    author: string,
    badgeText: string,
    titleColor: string,
    subtitleColor: string,
    fontFamily: string
  ): void {
    // 970 x 300 Padrão Amazon A+
    const bg = ctx.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0, '#0a1128');
    bg.addColorStop(0.7, '#1c2541');
    bg.addColorStop(1, '#0f172a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Capa à Esquerda
    const cvW = 160;
    const cvH = 240;
    const cvX = 50;
    const cvY = 30;

    if (img) {
      ctx.drawImage(img, cvX, cvY, cvW, cvH);
    }

    // Textos à Direita
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 15px Montserrat, sans-serif';
    ctx.fillText('DESTAQUE EDITORIAL AMAZON KDP', 250, 65);

    ctx.fillStyle = titleColor;
    ctx.font = `bold 32px ${fontFamily}`;
    ctx.fillText(title, 250, 115, 680);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px Inter, sans-serif';
    const cleanSub = subtitle || 'Um guia prático e definitivo desenvolvido com metodologia de alta performance.';
    ctx.fillText(cleanSub, 250, 160, 680);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px Montserrat, sans-serif';
    ctx.fillText(`Obra de referência por ${author}`, 250, 230);
  }

  private static drawAudiobookSquare(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    img: HTMLImageElement | null,
    title: string,
    subtitle: string,
    author: string,
    badgeText: string,
    titleColor: string,
    subtitleColor: string,
    authorColor: string,
    fontFamily: string
  ): void {
    // 2400 x 2400 Quadrado Audible
    if (img) {
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
    }

    // Scrim escuro para contraste
    const scrim = ctx.createLinearGradient(0, 0, 0, h);
    scrim.addColorStop(0, 'rgba(0,0,0,0.75)');
    scrim.addColorStop(0.5, 'rgba(0,0,0,0.3)');
    scrim.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h);

    // Selo de Audiobook
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect((w - 700) / 2, 180, 700, 80, 40);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AUDIOBOOK • EDIÇÃO INTEGRAL', w / 2, 234);

    // Título Central
    ctx.font = `bold 120px ${fontFamily}`;
    ctx.fillStyle = titleColor;
    ctx.fillText(title, w / 2, 850, w - 240);

    if (subtitle) {
      ctx.font = '54px Inter, sans-serif';
      ctx.fillStyle = subtitleColor;
      ctx.fillText(subtitle, w / 2, 1150, w - 300);
    }

    // Autor e Narrador
    ctx.font = 'bold 70px Montserrat, sans-serif';
    ctx.fillStyle = authorColor;
    ctx.fillText(`Escrito por ${author}`, w / 2, 2050);
  }

  private static drawGenericCard(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    img: HTMLImageElement | null,
    title: string,
    author: string
  ): void {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    if (img) ctx.drawImage(img, 0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, h / 2);
  }

  private static loadImageSafe(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      if (!src) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
}
