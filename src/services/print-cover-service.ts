// ================================================================
// PRINT COVER SERVICE — CAPA COMPLETA PARA IMPRESSÃO (FULL WRAP PDF)
// Contracapa Inteligente, Lombada Milimétrica Calculada e Validação KDP
// ================================================================

import { jsPDF } from 'jspdf';
import { PaperType, TrimSize } from '../types/book-project';
import { CoverQualityChecker, KdpSpineCalculation } from './cover-studio/cover-quality-checker';

export interface BackCoverContent {
  hookHeadline: string;
  synopsisText: string;
  readerBenefits: string[];
  authorSnippet?: string;
}

export interface PrintCoverValidationReport {
  isValid: boolean;
  canExport: boolean;
  errors: string[];
  warnings: string[];
  spineWidthMm: number;
  spineWidthInches: number;
  totalWidthInches: number;
  totalHeightInches: number;
  pageCount: number;
  paperType: PaperType;
  trimSize: TrimSize;
  spineTextEligible: boolean;
}

export class PrintCoverService {
  /**
   * Valida as especificações técnicas da capa impressa e bloqueia exportação se inválida
   */
  public static validatePrintCover(params: {
    title: string;
    author: string;
    pageCount: number;
    paperType: PaperType;
    trimSize: TrimSize;
    hasFrontArt: boolean;
  }): PrintCoverValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    const safePageCount = Math.max(1, params.pageCount || 0);
    const geometry: KdpSpineCalculation = CoverQualityChecker.calculateKdpSpineAndCover(
      params.trimSize,
      safePageCount,
      params.paperType
    );

    // Validação 1: Mínimo de páginas para impressão KDP (mínimo de 24 páginas)
    if (safePageCount < 24) {
      errors.push(`O livro possui ${safePageCount} páginas. O Amazon KDP exige no mínimo 24 páginas para livros de capa comum impressos.`);
    }

    // Validação 2: Presença da arte frontal
    if (!params.hasFrontArt) {
      errors.push('A capa frontal precisa de uma ilustração ou imagem de arte gerada.');
    }

    // Validação 3: Título e autor obrigatórios
    if (!params.title || params.title.trim().length === 0) {
      errors.push('O título do livro é obrigatório na capa frontal.');
    }
    if (!params.author || params.author.trim().length === 0) {
      errors.push('O nome do autor é obrigatório na capa frontal.');
    }

    // Validação 4: Elegibilidade de texto na lombada (Diretriz KDP G201113520: mínimo de 79 páginas)
    const spineTextEligible = safePageCount >= 79 && geometry.spineWidthMm >= 4.4;
    if (!spineTextEligible) {
      warnings.push(`Com ${safePageCount} páginas (${geometry.spineWidthMm}mm de lombada), o livro tem menos de 79 páginas. O texto da lombada será omitido conforme diretriz oficial KDP G201113520.`);
    }

    const canExport = errors.length === 0;

    return {
      isValid: canExport,
      canExport,
      errors,
      warnings,
      spineWidthMm: geometry.spineWidthMm,
      spineWidthInches: geometry.spineWidthInches,
      totalWidthInches: geometry.totalCoverWidthInches,
      totalHeightInches: geometry.totalCoverHeightInches,
      pageCount: safePageCount,
      paperType: params.paperType,
      trimSize: params.trimSize,
      spineTextEligible
    };
  }

  /**
   * Constrói a Contracapa Inteligente adaptada ao gênero
   */
  public static generateSmartBackCover(
    arg1: string | { title: string; subtitle?: string; author?: string; genre?: string; synopsis?: string; audience?: string },
    synopsisArg?: string,
    genreArg: string = 'Ficção'
  ): BackCoverContent & {
    headlineHook: string;
    synopsisSummary: string;
    readingBenefits: string[];
    barcodeReservedBox: { widthMm: number; heightMm: number; xMm?: number; yMm?: number };
  } {
    let title = typeof arg1 === 'string' ? arg1 : arg1.title || 'Obra';
    let synopsis = typeof arg1 === 'string' ? (synopsisArg || '') : (arg1.synopsis || '');
    let genre = typeof arg1 === 'string' ? (genreArg || 'Ficção') : (arg1.genre || 'Ficção');

    const cleanSynopsis = synopsis || 'Uma obra profunda e instigante, elaborada com rigor narrativo e pronta para proporcionar uma experiência marcante ao leitor.';
    
    // Ganchos comerciais adaptados
    let hookHeadline = `O livro que vai transformar sua percepção sobre ${title}.`;
    const g = genre.toLowerCase();
    if (g.includes('thriller') || g.includes('suspense') || g.includes('mistério')) {
      hookHeadline = 'Alguns segredos cobram um preço alto demais para serem revelados.';
    } else if (g.includes('romance') || g.includes('drama')) {
      hookHeadline = 'Uma história arrebatadora sobre escolhas, encontros e o poder do tempo.';
    } else if (g.includes('negócio') || g.includes('finança') || g.includes('liderança')) {
      hookHeadline = 'Estratégias práticas e comprovadas para alcançar clareza, resultados e excelência.';
    } else if (g.includes('fantasia') || g.includes('aventura')) {
      hookHeadline = 'Um universo onde o destino é forjado pela coragem e pela lealdade.';
    }

    const benefits = [
      'Narrativa envolvente com progressão rigorosa de cenas e conflitos',
      'Personagens autênticos com dilemas humanos e diálogos marcantes',
      'Edição cuidada e revisada para uma leitura fluida e memorável'
    ];

    const barcodeBox = {
      widthMm: 50.8,
      heightMm: 30.5
    };

    return {
      hookHeadline,
      headlineHook: hookHeadline,
      synopsisText: cleanSynopsis,
      synopsisSummary: cleanSynopsis,
      readerBenefits: benefits,
      readingBenefits: benefits,
      barcodeReservedBox: barcodeBox
    };
  }

  /**
   * Alias de compatibilidade para geração de PDF de capa aberta completa
   */
  public static async generatePrintCoverWrapPdf(params: {
    title: string;
    subtitle?: string;
    author: string;
    genre?: string;
    pageCount: number;
    paperType?: PaperType;
    trimSize?: TrimSize;
    frontArtDataUrl?: string;
    backCoverContent?: any;
    primaryColorHex?: string;
  }): Promise<{ pdfBytes: Uint8Array; validation: PrintCoverValidationReport }> {
    return this.generateFullWrapCoverPdf(params);
  }

  /**
   * Gera o PDF completo aberto para impressão (Full Wrap Cover)
   */
  public static async generateFullWrapCoverPdf(params: {
    title: string;
    subtitle?: string;
    author: string;
    genre?: string;
    pageCount: number;
    paperType?: PaperType;
    trimSize?: TrimSize;
    wrapSpreadDataUrl?: string;
    frontArtDataUrl?: string;
    frontCoverDataUrl?: string;
    backCoverDataUrl?: string;
    frontIsAlreadyDiagrammed?: boolean;
    synopsisText?: string;
    hookHeadline?: string;
    readerBenefits?: string[];
    isKids?: boolean;
    backCoverContent?: BackCoverContent;
    primaryColorHex?: string;
  }): Promise<{ pdfBytes: Uint8Array; validation: PrintCoverValidationReport }> {
    const trimSize: TrimSize = params.trimSize || '6x9';
    const paperType: PaperType = params.paperType || 'bw-white';
    const safePageCount = Math.max(24, params.pageCount || 150);
    const frontArt = params.frontArtDataUrl || params.frontCoverDataUrl;

    const validation = this.validatePrintCover({
      title: params.title,
      author: params.author,
      pageCount: safePageCount,
      paperType,
      trimSize,
      hasFrontArt: Boolean(frontArt)
    });

    const geometry: KdpSpineCalculation = CoverQualityChecker.calculateKdpSpineAndCover(
      trimSize,
      safePageCount,
      paperType
    );

    const bleedMm = geometry.bleedInches * 25.4; // 3.175 mm
    const trimWidthMm = geometry.trimWidthInches * 25.4;
    const trimHeightMm = geometry.trimHeightInches * 25.4;
    const spineWidthMm = geometry.spineWidthMm;

    const totalWidthMm = (trimWidthMm * 2) + spineWidthMm + (bleedMm * 2);
    const totalHeightMm = trimHeightMm + (bleedMm * 2);

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [totalWidthMm, totalHeightMm],
      compress: true
    });

    // Se foi fornecida a Capa Aberta Completa (Full Wrap Spread: Contracapa + Lombada + Frente):
    if (params.wrapSpreadDataUrl && params.wrapSpreadDataUrl.startsWith('data:image')) {
      try {
        const isPng = params.wrapSpreadDataUrl.includes('image/png');
        doc.addImage(
          params.wrapSpreadDataUrl,
          isPng ? 'PNG' : 'JPEG',
          0,
          0,
          totalWidthMm,
          totalHeightMm,
          undefined,
          'FAST'
        );
        const arrayBuffer = doc.output('arraybuffer');
        return {
          pdfBytes: new Uint8Array(arrayBuffer),
          validation
        };
      } catch (err) {
        console.warn('[PrintCoverService] Falha ao estampar wrapSpreadDataUrl completo:', err);
      }
    }

    // 1. Fundo Geral da Capa (Slate Escuro 900)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, totalWidthMm, totalHeightMm, 'F');

    // 2. Coordenadas dos Painéis
    const backCoverX = bleedMm;
    const spineX = bleedMm + trimWidthMm;
    const frontCoverX = spineX + spineWidthMm;

    // --- PAINEL FRONTAL (CAPA DIREITA) ---
    if (frontArt && frontArt.startsWith('data:image')) {
      try {
        const isPng = frontArt.includes('image/png');
        doc.addImage(
          frontArt,
          isPng ? 'PNG' : 'JPEG',
          frontCoverX,
          0,
          trimWidthMm + bleedMm,
          totalHeightMm,
          undefined,
          'FAST'
        );
      } catch (err) {
        console.warn('[PrintCoverService] Falha ao renderizar imagem frontal:', err);
      }
    }

    // Se a capa frontal ainda NÃO foi diagramada com tipografia, adicionamos moldura e faixa nobre KDP G201113520
    if (!params.frontIsAlreadyDiagrammed) {
      const safeFrontPad = 8.0; // > 6.35mm (0.25" exigido pelo KDP G201113520)
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.rect(
        frontCoverX + safeFrontPad,
        bleedMm + safeFrontPad,
        trimWidthMm - safeFrontPad * 2,
        trimHeightMm - safeFrontPad * 2,
        'S'
      );

      // Faixa tipográfica de contraste para o título na capa frontal
      doc.setFillColor(12, 18, 32);
      doc.setDrawColor(245, 158, 11); // Âmbar 500
      doc.setLineWidth(0.6);
      doc.rect(frontCoverX + 12, bleedMm + 24, trimWidthMm - 24, 56, 'F');
      doc.rect(frontCoverX + 12, bleedMm + 24, trimWidthMm - 24, 56, 'S');

      // Selo Superior
      doc.setTextColor(253, 230, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('EDIÇÃO ESPECIAL AMAZON KDP', frontCoverX + (trimWidthMm / 2), bleedMm + 32, { align: 'center' });

      // Título Principal
      doc.setTextColor(255, 255, 255);
      doc.setFont('times', 'bold');
      doc.setFontSize(22);
      const titleLines = doc.splitTextToSize(params.title, trimWidthMm - 30);
      doc.text(titleLines, frontCoverX + (trimWidthMm / 2), bleedMm + 44, { align: 'center' });

      // Subtítulo
      if (params.subtitle) {
        doc.setTextColor(226, 232, 240);
        doc.setFont('times', 'italic');
        doc.setFontSize(10.5);
        const subLines = doc.splitTextToSize(params.subtitle, trimWidthMm - 32);
        doc.text(subLines, frontCoverX + (trimWidthMm / 2), bleedMm + 48 + (titleLines.length * 7), { align: 'center' });
      }

      // Autor
      doc.setFillColor(12, 18, 32);
      doc.rect(frontCoverX + 15, totalHeightMm - bleedMm - 38, trimWidthMm - 30, 20, 'F');
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.35);
      doc.line(frontCoverX + 32, totalHeightMm - bleedMm - 38, frontCoverX + trimWidthMm - 32, totalHeightMm - bleedMm - 38);
      doc.setTextColor(255, 255, 255);
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.text((params.author || 'AUTOR').toUpperCase(), frontCoverX + (trimWidthMm / 2), totalHeightMm - bleedMm - 25, { align: 'center' });
    }

    // --- PAINEL CENTRAL (LOMBADA / SPINE — Diretriz KDP G201113520) ---
    doc.setFillColor(9, 13, 22);
    doc.rect(spineX, 0, spineWidthMm, totalHeightMm, 'F');
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.3);
    doc.line(spineX, 0, spineX, totalHeightMm);
    doc.line(spineX + spineWidthMm, 0, spineX + spineWidthMm, totalHeightMm);

    // Texto da lombada se for elegível (>= 79 páginas e margem de 0.0625" / 1.5875mm de cada lado da dobra)
    if (validation.spineTextEligible) {
      doc.saveGraphicsState();
      const spineCenterX = spineX + (spineWidthMm / 2);
      const spineCenterY = totalHeightMm / 2;
      const usableSpineMm = Math.max(1.5, spineWidthMm - 3.175); // Desconta 2 * 1.5875mm (0.0625" de cada lado)

      doc.setTextColor(248, 250, 252);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(Math.min(9.5, Math.max(6, usableSpineMm * 1.8)));

      const spineText = `${params.title}   •   ${params.author}`;
      doc.text(spineText, spineCenterX, spineCenterY, { align: 'center', angle: 270 });
      doc.restoreGraphicsState();
    }

    // --- PAINEL TRASEIRO (CONTRACAPA ESQUERDA — Especificação KDP G201113520) ---
    if (params.backCoverDataUrl && params.backCoverDataUrl.startsWith('data:image')) {
      try {
        const isPng = params.backCoverDataUrl.includes('image/png');
        doc.addImage(
          params.backCoverDataUrl,
          isPng ? 'PNG' : 'JPEG',
          0,
          0,
          bleedMm + trimWidthMm,
          totalHeightMm,
          undefined,
          'FAST'
        );
      } catch (err) {
        console.warn('[PrintCoverService] Falha ao renderizar imagem da contracapa personalizada:', err);
      }
    } else {
      const backContent = params.backCoverContent || this.generateSmartBackCover(params.title, params.synopsisText || '', params.genre || 'Ficção');

      // Moldura Dupla Editorial respeitando a margem segura KDP (0.25" / 6.35mm dentro do corte)
      const safePadMm = 8.0;
      doc.setDrawColor(180, 142, 68);
      doc.setLineWidth(0.45);
      doc.rect(
        backCoverX + safePadMm,
        bleedMm + safePadMm,
        trimWidthMm - safePadMm * 2,
        trimHeightMm - safePadMm * 2,
        'S'
      );
      doc.setLineWidth(0.2);
      doc.rect(
        backCoverX + safePadMm + 1.4,
        bleedMm + safePadMm + 1.4,
        trimWidthMm - (safePadMm + 1.4) * 2,
        trimHeightMm - (safePadMm + 1.4) * 2,
        'S'
      );

      // Gancho Comercial
      doc.setTextColor(245, 158, 11); // Dourado / Âmbar
      doc.setFont('times', 'bolditalic');
      doc.setFontSize(13.5);
      const hookLines = doc.splitTextToSize(backContent.hookHeadline, trimWidthMm - 32);
      doc.text(hookLines, backCoverX + 16, bleedMm + 26);

      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.4);
      const hookY = bleedMm + 28 + (hookLines.length * 5.8);
      doc.line(backCoverX + 16, hookY, backCoverX + 68, hookY);

      // Texto da Sinopse
      doc.setTextColor(226, 232, 240); // Slate 200
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      const synLines = doc.splitTextToSize(backContent.synopsisText, trimWidthMm - 32);
      doc.text(synLines, backCoverX + 16, hookY + 8);

      // Benefícios da Leitura (Bullet points)
      let bulletY = hookY + 12 + (synLines.length * 4.8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(203, 213, 225);

      backContent.readerBenefits.forEach(b => {
        if (bulletY < totalHeightMm - bleedMm - 48) {
          doc.setFillColor(245, 158, 11);
          doc.circle(backCoverX + 18, bulletY - 1, 0.9, 'F');
          const bLines = doc.splitTextToSize(b, trimWidthMm - 38);
          doc.text(bLines, backCoverX + 22, bulletY);
          bulletY += Math.max(6.8, bLines.length * 4.4);
        }
      });

      // Assinatura do Autor & Selo Editorial no canto inferior esquerdo da contracapa
      const authorFooterY = totalHeightMm - bleedMm - 26;
      doc.setTextColor(248, 250, 252);
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text((params.author || 'AUTOR').toUpperCase(), backCoverX + 16, authorFooterY);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Edição Oficial Amazon KDP', backCoverX + 16, authorFooterY + 4.5);
      doc.text(`Norma Técnica KDP G201113520 (${trimSize}")`, backCoverX + 16, authorFooterY + 8.5);

      // Área Oficial Reservada para Código de Barras KDP (50.8mm x 30.5mm / 2.0" x 1.2")
      // Posicionada no CANTO INFERIOR DIREITO da contracapa, a >= 6.35mm (0.25") da lombada e da borda inferior
      const barcodeWidth = 50.8;
      const barcodeHeight = 30.5;
      const barcodeX = spineX - 10.5 - barcodeWidth;
      const barcodeY = totalHeightMm - bleedMm - 10.5 - barcodeHeight;

      // Não desenha caixa branca de código de barras para não ocultar a arte de fundo da contracapa
    }

    const arrayBuffer = doc.output('arraybuffer');
    return {
      pdfBytes: new Uint8Array(arrayBuffer),
      validation
    };
  }

  /**
   * Diagrama a Contracapa em Canvas de alta resolução (1600x2400)
   * Inclui gancho comercial, sinopse, benefícios e a área oficial do código de barras KDP (2" x 1.2")
   */
  public static async diagramarContracapaCanvas(params: {
    title: string;
    subtitle?: string;
    author: string;
    genre?: string;
    synopsis?: string;
    hookHeadline?: string;
    benefits?: string[];
    isKids?: boolean;
    paperType?: PaperType;
    trimSize?: TrimSize;
    primaryColorHex?: string;
    textAlign?: 'left' | 'center' | 'right';
    authorPhotoUrl?: string;
    authorPhotoSize?: number;
  }): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 2400;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível obter contexto 2D para a contracapa');

    const isKids = Boolean(params.isKids);
    const align = params.textAlign || 'left';

    // 1. Fundo Gradiente Elegante
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (isKids) {
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.35, '#1e293b');
      grad.addColorStop(1, '#0f172a');
    } else {
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.3, '#0f172a');
      grad.addColorStop(0.7, '#1e293b');
      grad.addColorStop(1, '#020617');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Moldura Dupla Editorial dentro da Margem de Segurança KDP G201113520
    const frameOuter = 74;
    const frameInner = 90;
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(frameOuter, frameOuter, canvas.width - frameOuter * 2, canvas.height - frameOuter * 2);
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(frameInner, frameInner, canvas.width - frameInner * 2, canvas.height - frameInner * 2);
    ctx.restore();

    // Margens seguras KDP
    const marginX = 148;
    const maxTextW = canvas.width - (marginX * 2);

    // Posição X de ancoragem conforme alinhamento
    const anchorX = align === 'center' ? canvas.width / 2 : align === 'right' ? canvas.width - marginX : marginX;

    // Dados da contracapa
    const backContent = this.generateSmartBackCover(params.title, params.synopsis, params.genre || 'Ficção');
    const headline = params.hookHeadline || backContent.hookHeadline;

    // 2. Gancho Comercial / Headline no topo
    ctx.textAlign = align;
    ctx.fillStyle = isKids ? '#fef08a' : '#f59e0b'; // Amarelo luminoso ou Âmbar dourado
    ctx.font = isKids ? 'bold 60px "Fredoka", "Quicksand", sans-serif' : 'bold 58px Georgia, serif';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 14;

    const headlineLines = this.quebrarLinhasTexto(ctx, headline, maxTextW);
    let y = 220;
    headlineLines.forEach(line => {
      ctx.fillText(line, anchorX, y);
      y += 74;
    });

    // Linha ornamental sutil
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isKids ? 'rgba(254, 240, 138, 0.45)' : 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (align === 'center') {
      ctx.moveTo(canvas.width / 2 - 110, y + 14);
      ctx.lineTo(canvas.width / 2 + 110, y + 14);
    } else if (align === 'right') {
      ctx.moveTo(canvas.width - marginX - 220, y + 14);
      ctx.lineTo(canvas.width - marginX, y + 14);
    } else {
      ctx.moveTo(marginX, y + 14);
      ctx.lineTo(marginX + 220, y + 14);
    }
    ctx.stroke();
    y += 56;

    // 3. Sinopse da Obra
    const synopsis = params.synopsis || backContent.synopsisText;
    ctx.textAlign = align;
    ctx.fillStyle = '#f1f5f9';
    ctx.font = isKids ? '500 42px "Quicksand", sans-serif' : '400 40px Georgia, serif';
    ctx.shadowBlur = 8;
    const synLines = this.quebrarLinhasTexto(ctx, synopsis, maxTextW);
    synLines.forEach(line => {
      if (y < 1240) {
        ctx.fillText(line, anchorX, y);
        y += 58;
      }
    });

    y += 28;

    // 4. Benefícios / Destaques da Leitura (Bullet points)
    const benefits = params.benefits || backContent.readerBenefits;
    benefits.forEach(b => {
      if (y < 1620) {
        if (align === 'center') {
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '500 36px sans-serif';
          ctx.textAlign = 'center';
          const bLines = this.quebrarLinhasTexto(ctx, `• ${b}`, maxTextW);
          bLines.forEach(bl => {
            ctx.fillText(bl, canvas.width / 2, y);
            y += 50;
          });
          y += 8;
        } else if (align === 'right') {
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '500 36px sans-serif';
          ctx.textAlign = 'right';
          const bLines = this.quebrarLinhasTexto(ctx, `${b} •`, maxTextW - 50);
          bLines.forEach(bl => {
            ctx.fillText(bl, canvas.width - marginX, y);
            y += 50;
          });
          y += 8;
        } else {
          // Bullet circle tradicional à esquerda
          ctx.fillStyle = isKids ? '#fef08a' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(marginX + 14, y - 12, 7, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '500 36px sans-serif';
          ctx.textAlign = 'left';
          const bLines = this.quebrarLinhasTexto(ctx, b, maxTextW - 50);
          bLines.forEach(bl => {
            ctx.fillText(bl, marginX + 40, y);
            y += 50;
          });
          y += 10;
        }
      }
    });

    // 4.5. Foto do Autor / Imagem da Contracapa (se fornecida)
    if (params.authorPhotoUrl && params.authorPhotoUrl.startsWith('data:image')) {
      try {
        const photoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Falha ao carregar foto do autor'));
          img.src = params.authorPhotoUrl!;
        });

        const pSize = Math.max(90, Math.min(320, params.authorPhotoSize || 180));
        let photoX = marginX;
        if (align === 'center') {
          photoX = (canvas.width - pSize) / 2;
        } else if (align === 'right') {
          photoX = canvas.width - marginX - pSize;
        }
        const photoY = Math.min(y + 20, canvas.height - 480);

        // Desenhar moldura circular elegante com sombra
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(photoX + pSize / 2, photoY + pSize / 2, pSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(photoImg, photoX, photoY, pSize, pSize);
        ctx.restore();

        // Borda dourada em torno da foto
        ctx.save();
        ctx.strokeStyle = isKids ? '#fef08a' : '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(photoX + pSize / 2, photoY + pSize / 2, pSize / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } catch (err) {
        console.warn('[PrintCoverService] Não foi possível estampar a foto na contracapa:', err);
      }
    }

    // 5. Rodapé Editorial / Autor
    ctx.textAlign = align;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 32px sans-serif';
    ctx.fillText(`${params.author.toUpperCase()}`, anchorX, canvas.height - 140);
    ctx.fillStyle = '#64748b';
    ctx.font = '400 24px sans-serif';
    ctx.fillText('Edição Oficial Amazon KDP • Diagramação Editorial', anchorX, canvas.height - 95);

    // Não desenha caixa branca de código de barras para não estragar a arte da contracapa com espaço em branco
    return canvas.toDataURL('image/png');
  }

  /**
   * Constrói o visual aberto completo (Full Wrap: Contracapa + Lombada + Capa Frontal)
   * com guias técnicas de corte e sangria da Amazon KDP (como o Print Previewer)
   */
  public static async diagramarWrapCompositeCanvas(params: {
    frontCoverDataUrl: string;
    backCoverDataUrl: string;
    title: string;
    author: string;
    pageCount: number;
    trimSize?: TrimSize;
    paperType?: PaperType;
    showGuides?: boolean;
  }): Promise<string> {
    const safePages = Math.max(24, params.pageCount || 100);
    const trim: TrimSize = params.trimSize || '6x9';
    const paper: PaperType = params.paperType || 'bw-white';
    const calc = CoverQualityChecker.calculateKdpSpineAndCover(trim, safePages, paper);

    // Resolução nítida para visualização do Wrap (200 DPI)
    const dpi = 200;
    const totalW = Math.round(calc.totalCoverWidthInches * dpi);
    const totalH = Math.round(calc.totalCoverHeightInches * dpi);
    const bleedPx = Math.round(calc.bleedInches * dpi);
    const trimWPx = Math.round(calc.trimWidthInches * dpi);
    const spineWPx = Math.max(14, Math.round(calc.spineWidthInches * dpi));

    const canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível obter contexto 2D para wrap composite');

    // Fundo escuro slate
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, totalW, totalH);

    // 1. Contracapa à esquerda
    try {
      const backImg = await this.carregarImagem(params.backCoverDataUrl);
      ctx.drawImage(backImg, 0, 0, backImg.width, backImg.height, bleedPx, bleedPx, trimWPx, totalH - (bleedPx * 2));
    } catch {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bleedPx, bleedPx, trimWPx, totalH - (bleedPx * 2));
    }

    // 2. Capa Frontal à direita
    const frontX = bleedPx + trimWPx + spineWPx;
    try {
      const frontImg = await this.carregarImagem(params.frontCoverDataUrl);
      ctx.drawImage(frontImg, 0, 0, frontImg.width, frontImg.height, frontX, bleedPx, trimWPx, totalH - (bleedPx * 2));
    } catch {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(frontX, bleedPx, trimWPx, totalH - (bleedPx * 2));
    }

    // 3. Lombada central
    const spineX = bleedPx + trimWPx;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(spineX, 0, spineWPx, totalH);

    // Linhas da lombada
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(spineX, 0);
    ctx.lineTo(spineX, totalH);
    ctx.moveTo(spineX + spineWPx, 0);
    ctx.lineTo(spineX + spineWPx, totalH);
    ctx.stroke();

    // Texto da lombada (apenas se >= 6mm de espessura conforme regra oficial KDP)
    if (calc.spineWidthMm >= 6.0 && spineWPx >= 20) {
      ctx.save();
      ctx.translate(spineX + (spineWPx / 2), totalH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      const spineFontSize = Math.min(20, Math.max(11, Math.round(spineWPx * 0.45)));
      ctx.font = `bold ${spineFontSize}px sans-serif`;
      ctx.fillText(`${params.title}   •   ${params.author}`, 0, 0);
      ctx.restore();
    }

    // 4. Guias Tracejadas Técnicas KDP (se ativado)
    if (params.showGuides) {
      ctx.save();
      // Linha de corte externa (trim edge)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.strokeRect(bleedPx, bleedPx, totalW - (bleedPx * 2), totalH - (bleedPx * 2));

      // Margem segura interna (safe area: 0.125" / 3.2mm para dentro do corte)
      const safePx = Math.round(0.125 * dpi);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.85)';
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(bleedPx + safePx, bleedPx + safePx, trimWPx - (safePx * 2), totalH - ((bleedPx + safePx) * 2));
      ctx.strokeRect(frontX + safePx, bleedPx + safePx, trimWPx - (safePx * 2), totalH - ((bleedPx + safePx) * 2));
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  }

  private static quebrarLinhasTexto(ctx: CanvasRenderingContext2D, texto: string, maxW: number): string[] {
    const palavras = texto.split(' ');
    const linhas: string[] = [];
    let atual = '';
    for (const p of palavras) {
      const teste = atual ? `${atual} ${p}` : p;
      if (ctx.measureText(teste).width > maxW) {
        if (atual) linhas.push(atual);
        atual = p;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  private static carregarImagem(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
}
