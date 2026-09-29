// Gerador profissional de PDF Interior e Capa Full-Wrap para Amazon KDP usando jsPDF
import { jsPDF } from 'jspdf';
import { BookProject, TrimSize, PaperType } from '../../types/book-project';

export class PdfBuilder {
  /**
   * Converte TrimSize para milímetros [largura, altura]
   */
  public static getTrimDimensionsMm(trim: TrimSize = '6x9'): [number, number] {
    switch (trim) {
      case '5x8': return [127, 203.2];
      case '5.5x8.5': return [139.7, 215.9];
      case '6x9': return [152.4, 228.6];
      case '7x10': return [177.8, 254];
      case '7.5x9.25': return [190.5, 235];
      case '8.5x8.5': return [215.9, 215.9];
      case '8.5x11': return [215.9, 279.4];
      default: return [152.4, 228.6];
    }
  }

  /**
   * Calcula a largura de lombada da Amazon KDP em milímetros
   */
  public static calculateSpineWidthMm(pageCount: number, paperType: PaperType = 'bw-white'): number {
    const pages = Math.max(24, pageCount);
    // Fórmula KDP: Branco = páginas * 0.002252 pol, Creme = páginas * 0.0025 pol
    const inches = paperType === 'bw-cream' ? pages * 0.0025 : pages * 0.002252;
    return inches * 25.4;
  }

  /**
   * Gera o PDF do Miolo (Interior.pdf) diagramado de acordo com as normas KDP
   */
  public static async buildInteriorPdf(project: BookProject): Promise<Blob> {
    const [widthMm, heightMm] = this.getTrimDimensionsMm(project.trimSize);
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [widthMm, heightMm]
    });

    const marginInner = 19; // 0.75" margem interna (gutter)
    const marginOuter = 13; // 0.5" margem externa
    const marginTop = 15;
    const marginBottom = 15;
    const printableWidth = widthMm - marginInner - marginOuter;

    let currentPage = 1;

    // --- PÁGINA 1: FOLHA DE MEIO-ROSTO ---
    doc.setFont('times', 'normal');
    doc.setFontSize(22);
    doc.text(project.title || 'Livro KDP', widthMm / 2, heightMm / 3, { align: 'center', maxWidth: printableWidth });

    // --- PÁGINA 2: PÁGINA EM BRANCO OU CRÉDITOS ---
    doc.addPage();
    currentPage++;

    // --- PÁGINA 3: FOLHA DE ROSTO COMPLETA ---
    doc.addPage();
    currentPage++;
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.text(project.title || 'Livro KDP', widthMm / 2, heightMm * 0.28, { align: 'center', maxWidth: printableWidth });

    if (project.subtitle) {
      doc.setFont('times', 'italic');
      doc.setFontSize(13);
      doc.text(project.subtitle, widthMm / 2, heightMm * 0.38, { align: 'center', maxWidth: printableWidth });
    }

    doc.setFont('times', 'normal');
    doc.setFontSize(14);
    doc.text(project.author || 'Autor', widthMm / 2, heightMm * 0.72, { align: 'center' });

    // --- PÁGINA 4: COPYRIGHT ---
    doc.addPage();
    currentPage++;
    const year = new Date().getFullYear();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const copyrightLines = [
      `© ${year} ${project.author || 'Autor'}. Todos os direitos reservados.`,
      '',
      'Nenhuma parte deste livro pode ser reproduzida, distribuída ou transmitida por qualquer forma ou por qualquer meio sem prévia permissão por escrito do autor.',
      '',
      `Título Original: ${project.title}`,
      `Formato: KDP Paperback (${project.trimSize})`,
      'Edição Independente.'
    ];
    doc.text(copyrightLines, marginOuter, heightMm * 0.65, { maxWidth: printableWidth });

    // --- PÁGINA 5: SUMÁRIO ---
    doc.addPage();
    currentPage++;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Sumário', widthMm / 2, marginTop + 10, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    let tocY = marginTop + 25;
    const chapters = project.kdpChapters || [];

    if (project.editorialElements?.introduction) {
      doc.text('Introdução', marginInner, tocY);
      doc.text('7', widthMm - marginOuter, tocY, { align: 'right' });
      tocY += 8;
    }

    chapters.forEach((ch, idx) => {
      if (tocY > heightMm - marginBottom - 10) {
        doc.addPage();
        currentPage++;
        tocY = marginTop + 10;
      }
      doc.text(`Capítulo ${ch.index || idx + 1}: ${ch.title}`, marginInner, tocY, { maxWidth: printableWidth - 15 });
      tocY += 8;
    });

    if (project.editorialElements?.conclusion) {
      doc.text('Conclusão', marginInner, tocY);
      tocY += 8;
    }
    if (project.editorialElements?.aboutAuthor) {
      doc.text('Sobre o Autor', marginInner, tocY);
      tocY += 8;
    }

    // Garante que o primeiro capítulo comece em página ímpar (direita)
    if (currentPage % 2 !== 0) {
      doc.addPage();
      currentPage++;
    }

    // --- INTRODUÇÃO ---
    if (project.editorialElements?.introduction) {
      doc.addPage();
      currentPage++;
      this.renderTextSection(doc, 'Introdução', project.editorialElements.introduction, widthMm, heightMm, marginInner, marginOuter, marginTop, marginBottom, printableWidth, currentPage);
    }

    // --- CAPÍTULOS ---
    chapters.forEach((ch) => {
      doc.addPage();
      currentPage++;
      const fullText = ch.prose || ch.summary || 'Capítulo em elaboração.';
      const chapterHeading = `Capítulo ${ch.index}\n${ch.title}`;
      this.renderTextSection(doc, chapterHeading, fullText, widthMm, heightMm, marginInner, marginOuter, marginTop, marginBottom, printableWidth, currentPage, true);
    });

    // --- CONCLUSÃO ---
    if (project.editorialElements?.conclusion) {
      doc.addPage();
      currentPage++;
      this.renderTextSection(doc, 'Conclusão', project.editorialElements.conclusion, widthMm, heightMm, marginInner, marginOuter, marginTop, marginBottom, printableWidth, currentPage);
    }

    // --- SOBRE O AUTOR ---
    if (project.editorialElements?.aboutAuthor) {
      doc.addPage();
      currentPage++;
      this.renderTextSection(doc, 'Sobre o Autor', project.editorialElements.aboutAuthor, widthMm, heightMm, marginInner, marginOuter, marginTop, marginBottom, printableWidth, currentPage);
    }

    // Garante total de páginas par
    if (doc.getNumberOfPages() % 2 !== 0) {
      doc.addPage();
    }

    return doc.output('blob');
  }

  /**
   * Renderiza seções de texto com paginação e cabeçalhos automáticos
   */
  private static renderTextSection(
    doc: jsPDF,
    heading: string,
    bodyText: string,
    widthMm: number,
    heightMm: number,
    marginInner: number,
    marginOuter: number,
    marginTop: number,
    marginBottom: number,
    printableWidth: number,
    startPage: number,
    isChapter: boolean = false
  ) {
    let currentY = marginTop + 15;

    // Título da Seção
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isChapter ? 17 : 18);
    const headingLines = doc.splitTextToSize(heading, printableWidth);
    doc.text(headingLines, widthMm / 2, currentY, { align: 'center' });
    currentY += headingLines.length * 8 + 12;

    // Parágrafos do Corpo
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    const paragraphs = bodyText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

    paragraphs.forEach((p) => {
      const lines = doc.splitTextToSize(p, printableWidth);
      const paragraphHeight = lines.length * 5.2;

      // Verifica quebra de página
      if (currentY + paragraphHeight > heightMm - marginBottom) {
        doc.addPage();
        currentY = marginTop + 10;
        // Cabeçalho corrente na nova página
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text(heading.replace(/\n.*/, ''), widthMm / 2, marginTop - 4, { align: 'center' });
        doc.setFont('times', 'normal');
        doc.setFontSize(10.5);
      }

      // Indentação da primeira linha
      doc.text(lines, marginInner, currentY);
      currentY += paragraphHeight + 4;
    });

    // Numeração de página no rodapé
    const total = doc.getNumberOfPages();
    for (let p = startPage; p <= total; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`${p}`, widthMm / 2, heightMm - 8, { align: 'center' });
    }
  }

  /**
   * Gera o PDF de Capa Completa KDP Paperback (Capa-Full-Wrap.pdf: Contracapa + Lombada + Capa)
   */
  public static async buildCoverWrapPdf(project: BookProject, actualPagesCount: number = 150): Promise<Blob> {
    const [trimWidthMm, trimHeightMm] = this.getTrimDimensionsMm(project.trimSize);
    const spineWidthMm = this.calculateSpineWidthMm(actualPagesCount, project.paperType);
    const bleedMm = 3.175; // 0.125 polegadas de sangria padrão KDP

    const totalWidthMm = (trimWidthMm * 2) + spineWidthMm + (bleedMm * 2);
    const totalHeightMm = trimHeightMm + (bleedMm * 2);

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [totalWidthMm, totalHeightMm]
    });

    // 1. Fundo Geral da Capa (Cor corporativa elegante)
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, totalWidthMm, totalHeightMm, 'F');

    // 2. Coordenadas dos Painéis
    const backCoverX = bleedMm;
    const spineX = bleedMm + trimWidthMm;
    const frontCoverX = spineX + spineWidthMm;

    // --- PAINEL FRONTAL (CAPA DIREITA) ---
    // Imagem de arte gerada por IA na Capa Frontal (se disponível)
    if (project.kdpCoverDesign?.frontImageUrl) {
      try {
        let imgData = project.kdpCoverDesign.frontImageUrl;
        if (imgData.startsWith('http')) {
          try {
            const resp = await fetch(imgData);
            if (resp.ok) {
              const blob = await resp.blob();
              imgData = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            }
          } catch {
            // Continua com background padrão caso falhe o fetch
          }
        }
        if (imgData && imgData.startsWith('data:image')) {
          const format = imgData.includes('image/png') ? 'PNG' : 'JPEG';
          doc.addImage(imgData, format, frontCoverX, 0, trimWidthMm + bleedMm, totalHeightMm, undefined, 'FAST');
        }
      } catch (imgErr) {
        console.warn('[PdfBuilder] Erro ao embutir imagem de capa:', imgErr);
      }
    }

    // Faixa decorativa / Moldura elegante
    doc.setFillColor(15, 23, 42); // Fundo escuro semitranslúcido ou sólido para legibilidade
    doc.setDrawColor(59, 130, 246); // Blue 500
    doc.setLineWidth(0.8);
    // Desenha caixa de título elegante
    doc.rect(frontCoverX + 10, bleedMm + 20, trimWidthMm - 20, 50, 'F');
    doc.rect(frontCoverX + 10, bleedMm + 20, trimWidthMm - 20, 50, 'S');

    // Título Principal
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    const titleLines = doc.splitTextToSize(project.title || 'Título do Livro', trimWidthMm - 30);
    doc.text(titleLines, frontCoverX + (trimWidthMm / 2), bleedMm + 45, { align: 'center' });

    // Subtítulo
    if (project.subtitle) {
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const subLines = doc.splitTextToSize(project.subtitle, trimWidthMm - 35);
      doc.text(subLines, frontCoverX + (trimWidthMm / 2), bleedMm + 45 + (titleLines.length * 9) + 4, { align: 'center' });
    }

    // Autor na Capa Frontal
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(project.author || 'Autor', frontCoverX + (trimWidthMm / 2), totalHeightMm - bleedMm - 35, { align: 'center' });

    // --- PAINEL CENTRAL (LOMBADA / SPINE) ---
    // Linha divisória suave
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.3);
    doc.line(spineX, 0, spineX, totalHeightMm);
    doc.line(spineX + spineWidthMm, 0, spineX + spineWidthMm, totalHeightMm);

    // Texto da lombada (se a lombada tiver mais de 6mm)
    if (spineWidthMm >= 6) {
      doc.saveGraphicsState();
      // Rotaciona 90 graus para texto vertical ao longo da lombada
      const spineCenterX = spineX + (spineWidthMm / 2);
      const spineCenterY = totalHeightMm / 2;
      
      doc.setTextColor(241, 245, 249);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(Math.min(9, spineWidthMm * 0.8));
      
      const spineText = `${project.title || 'Livro KDP'}  •  ${project.author || 'Autor'}`;
      doc.text(spineText, spineCenterX, spineCenterY, { align: 'center', angle: 270 });
      doc.restoreGraphicsState();
    }

    // --- PAINEL TRASEIRO (CONTRACAPA ESQUERDA) ---
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SOBRE ESTA OBRA', backCoverX + 15, bleedMm + 30);

    // Texto de Sinopse / Blurb na contracapa
    doc.setTextColor(203, 213, 225); // Slate 300
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    const blurb = project.kdpConcept?.longSynopsis || project.description || 'Uma obra transformadora desenvolvida com rigor editorial e pronta para o leitor moderno.';
    const blurbLines = doc.splitTextToSize(blurb, trimWidthMm - 30);
    doc.text(blurbLines, backCoverX + 15, bleedMm + 42);

    // Placeholder oficial de código de barras KDP (KDP barcode safe zone 50.8mm x 30.5mm)
    const barcodeWidth = 50.8;
    const barcodeHeight = 30.5;
    const barcodeX = backCoverX + 15;
    const barcodeY = totalHeightMm - bleedMm - barcodeHeight - 12;

    doc.setFillColor(255, 255, 255);
    doc.rect(barcodeX, barcodeY, barcodeWidth, barcodeHeight, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Área Reservada KDP', barcodeX + (barcodeWidth / 2), barcodeY + (barcodeHeight / 2) - 2, { align: 'center' });
    doc.text('(Código de barras impresso pela Amazon)', barcodeX + (barcodeWidth / 2), barcodeY + (barcodeHeight / 2) + 3, { align: 'center' });

    return doc.output('blob');
  }
}
