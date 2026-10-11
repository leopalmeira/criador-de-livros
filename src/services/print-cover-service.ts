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
    genre?: string;
    pageCount: number;
    paperType?: PaperType;
    trimSize?: TrimSize;
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

    // Se a capa frontal ainda NÃO foi diagramada com tipografia, adicionamos a faixa
    if (!params.frontIsAlreadyDiagrammed) {
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
    }

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
  }): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 2400;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível obter contexto 2D para a contracapa');

    const isKids = Boolean(params.isKids);

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

    // Margens seguras KDP
    const marginX = 140;
    const maxTextW = canvas.width - (marginX * 2);

    // Dados da contracapa
    const backContent = this.generateSmartBackCover(params.title, params.synopsis, params.genre || 'Ficção');
    const headline = params.hookHeadline || backContent.hookHeadline;

    // 2. Gancho Comercial / Headline no topo
    ctx.textAlign = 'left';
    ctx.fillStyle = isKids ? '#fef08a' : '#f59e0b'; // Amarelo luminoso ou Âmbar dourado
    ctx.font = isKids ? 'bold 60px "Fredoka", "Quicksand", sans-serif' : 'bold 58px Georgia, serif';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 14;

    const headlineLines = this.quebrarLinhasTexto(ctx, headline, maxTextW);
    let y = 220;
    headlineLines.forEach(line => {
      ctx.fillText(line, marginX, y);
      y += 74;
    });

    // Linha ornamental sutil
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isKids ? 'rgba(254, 240, 138, 0.45)' : 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(marginX, y + 14);
    ctx.lineTo(marginX + 220, y + 14);
    ctx.stroke();
    y += 56;

    // 3. Sinopse da Obra
    const synopsis = params.synopsis || backContent.synopsisText;
    ctx.fillStyle = '#f1f5f9';
    ctx.font = isKids ? '500 42px "Quicksand", sans-serif' : '400 40px Georgia, serif';
    ctx.shadowBlur = 8;
    const synLines = this.quebrarLinhasTexto(ctx, synopsis, maxTextW);
    synLines.forEach(line => {
      if (y < 1280) {
        ctx.fillText(line, marginX, y);
        y += 58;
      }
    });

    y += 28;

    // 4. Benefícios / Destaques da Leitura (Bullet points)
    const benefits = params.benefits || backContent.readerBenefits;
    benefits.forEach(b => {
      if (y < 1720) {
        // Bullet circle
        ctx.fillStyle = isKids ? '#fef08a' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(marginX + 14, y - 12, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '500 36px sans-serif';
        const bLines = this.quebrarLinhasTexto(ctx, b, maxTextW - 50);
        bLines.forEach(bl => {
          ctx.fillText(bl, marginX + 40, y);
          y += 50;
        });
        y += 10;
      }
    });

    // 5. Rodapé Editorial / Autor
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 32px sans-serif';
    ctx.fillText(`${params.author.toUpperCase()}`, marginX, canvas.height - 270);
    ctx.fillStyle = '#64748b';
    ctx.font = '400 26px sans-serif';
    ctx.fillText('Edição Oficial Amazon KDP • Diagramação Editorial', marginX, canvas.height - 228);

    // 6. Área Oficial Reservada para Código de Barras KDP (2" x 1.2" / 50.8mm x 30.5mm)
    const barcodeW = 420;
    const barcodeH = 260;
    const barcodeX = canvas.width - marginX - barcodeW;
    const barcodeY = canvas.height - 160 - barcodeH;

    // Fundo branco do código de barras
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(barcodeX, barcodeY, barcodeW, barcodeH);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(barcodeX, barcodeY, barcodeW, barcodeH);

    // Linhas estilizadas do código de barras
    ctx.fillStyle = '#0f172a';
    const barStartY = barcodeY + 22;
    const barHeight = barcodeH - 80;
    const barSpacing = 7;
    for (let bx = barcodeX + 22; bx < barcodeX + barcodeW - 22; bx += barSpacing) {
      const w = (bx % 3 === 0) ? 4 : 2;
      ctx.fillRect(bx, barStartY, w, barHeight);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText('ÁREA RESERVADA KDP', barcodeX + (barcodeW / 2), barcodeY + barcodeH - 32);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('(Código de barras gerado pela Amazon)', barcodeX + (barcodeW / 2), barcodeY + barcodeH - 14);

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
