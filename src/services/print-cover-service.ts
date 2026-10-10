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

    // Validação 4: Elegibilidade de texto na lombada (KDP exige mínimo de 79 páginas ou 6mm de espessura)
    const spineTextEligible = geometry.spineWidthMm >= 6.0;
    if (!spineTextEligible) {
      warnings.push(`Com ${safePageCount} páginas (${geometry.spineWidthMm}mm de lombada), a lombada é estreita demais para texto legível. O texto da lombada será omitido conforme diretriz KDP.`);
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
    pageCount: number;
    paperType?: PaperType;
    trimSize?: TrimSize;
    frontArtDataUrl?: string;
    backCoverContent?: BackCoverContent;
    primaryColorHex?: string;
  }): Promise<{ pdfBytes: Uint8Array; validation: PrintCoverValidationReport }> {
    const trimSize: TrimSize = params.trimSize || '6x9';
    const paperType: PaperType = params.paperType || 'bw-white';
    const safePageCount = Math.max(24, params.pageCount || 150);

    const validation = this.validatePrintCover({
      title: params.title,
      author: params.author,
      pageCount: safePageCount,
      paperType,
      trimSize,
      hasFrontArt: Boolean(params.frontArtDataUrl)
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

    // 1. Fundo Geral da Capa (Slate Escuro 900)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, totalWidthMm, totalHeightMm, 'F');

    // 2. Coordenadas dos Painéis
    const backCoverX = bleedMm;
    const spineX = bleedMm + trimWidthMm;
    const frontCoverX = spineX + spineWidthMm;

    // --- PAINEL FRONTAL (CAPA DIREITA) ---
    if (params.frontArtDataUrl && params.frontArtDataUrl.startsWith('data:image')) {
      try {
        const isPng = params.frontArtDataUrl.includes('image/png');
        doc.addImage(
          params.frontArtDataUrl,
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

    // Faixa tipográfica de contraste para o título na capa frontal
    doc.setFillColor(15, 23, 42);
    doc.setDrawColor(245, 158, 11); // Âmbar 500
    doc.setLineWidth(0.6);
    doc.rect(frontCoverX + 12, bleedMm + 24, trimWidthMm - 24, 52, 'F');
    doc.rect(frontCoverX + 12, bleedMm + 24, trimWidthMm - 24, 52, 'S');

    // Título Principal
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    const titleLines = doc.splitTextToSize(params.title, trimWidthMm - 30);
    doc.text(titleLines, frontCoverX + (trimWidthMm / 2), bleedMm + 42, { align: 'center' });

    // Subtítulo
    if (params.subtitle) {
      doc.setTextColor(226, 232, 240);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      const subLines = doc.splitTextToSize(params.subtitle, trimWidthMm - 32);
      doc.text(subLines, frontCoverX + (trimWidthMm / 2), bleedMm + 46 + (titleLines.length * 7), { align: 'center' });
    }

    // Autor
    doc.setFillColor(15, 23, 42);
    doc.rect(frontCoverX + 15, totalHeightMm - bleedMm - 38, trimWidthMm - 30, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text(params.author, frontCoverX + (trimWidthMm / 2), totalHeightMm - bleedMm - 25, { align: 'center' });

    // --- PAINEL CENTRAL (LOMBADA / SPINE) ---
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.3);
    doc.line(spineX, 0, spineX, totalHeightMm);
    doc.line(spineX + spineWidthMm, 0, spineX + spineWidthMm, totalHeightMm);

    // Texto da lombada se for elegível (>= 6mm)
    if (validation.spineTextEligible) {
      doc.saveGraphicsState();
      const spineCenterX = spineX + (spineWidthMm / 2);
      const spineCenterY = totalHeightMm / 2;

      doc.setTextColor(241, 245, 249);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(Math.min(9, spineWidthMm * 0.75));

      const spineText = `${params.title}   •   ${params.author}`;
      doc.text(spineText, spineCenterX, spineCenterY, { align: 'center', angle: 270 });
      doc.restoreGraphicsState();
    }

    // --- PAINEL TRASEIRO (CONTRACAPA ESQUERDA) ---
    const backContent = params.backCoverContent || this.generateSmartBackCover(params.title, '', 'Ficção');

    // Gancho Comercial
    doc.setTextColor(245, 158, 11); // Dourado / Âmbar
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const hookLines = doc.splitTextToSize(backContent.hookHeadline, trimWidthMm - 32);
    doc.text(hookLines, backCoverX + 16, bleedMm + 28);

    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.4);
    const hookY = bleedMm + 30 + (hookLines.length * 6);
    doc.line(backCoverX + 16, hookY, backCoverX + 65, hookY);

    // Texto da Sinopse
    doc.setTextColor(226, 232, 240); // Slate 200
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    const synLines = doc.splitTextToSize(backContent.synopsisText, trimWidthMm - 32);
    doc.text(synLines, backCoverX + 16, hookY + 8);

    // Benefícios da Leitura (Bullet points)
    let bulletY = hookY + 12 + (synLines.length * 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);

    backContent.readerBenefits.forEach(b => {
      if (bulletY < totalHeightMm - 60) {
        doc.setFillColor(245, 158, 11);
        doc.circle(backCoverX + 18, bulletY - 1, 1, 'F');
        const bLines = doc.splitTextToSize(b, trimWidthMm - 38);
        doc.text(bLines, backCoverX + 22, bulletY);
        bulletY += Math.max(7, bLines.length * 4.5);
      }
    });

    // Área Oficial Reservada para Código de Barras KDP (50.8mm x 30.5mm / 2" x 1.2")
    const barcodeWidth = 50.8;
    const barcodeHeight = 30.5;
    const barcodeX = backCoverX + 16;
    const barcodeY = totalHeightMm - bleedMm - barcodeHeight - 12;

    doc.setFillColor(255, 255, 255);
    doc.rect(barcodeX, barcodeY, barcodeWidth, barcodeHeight, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(barcodeX, barcodeY, barcodeWidth, barcodeHeight, 'S');

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Área Reservada KDP', barcodeX + (barcodeWidth / 2), barcodeY + (barcodeHeight / 2) - 2, { align: 'center' });
    doc.text('(Código de barras gerado pela Amazon)', barcodeX + (barcodeWidth / 2), barcodeY + (barcodeHeight / 2) + 3, { align: 'center' });

    const arrayBuffer = doc.output('arraybuffer');
    return {
      pdfBytes: new Uint8Array(arrayBuffer),
      validation
    };
  }
}
