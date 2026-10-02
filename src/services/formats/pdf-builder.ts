// Gerador profissional de PDF Interior e Capa Full-Wrap para Amazon KDP usando jsPDF
import { jsPDF } from 'jspdf';
import { BookProject, TrimSize, PaperType } from '../../types/book-project';
import { ShowMeTheStoryEngine } from '../show-me-the-story-engine';

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
    // Fórmula oficial Amazon KDP:
    // Papel Branco: páginas * 0.002252 pol
    // Papel Creme: páginas * 0.0025 pol
    const inches = paperType === 'bw-cream' ? pages * 0.0025 : pages * 0.002252;
    return inches * 25.4;
  }

  /**
   * Gera o PDF do Miolo (Interior.pdf) diagramado de acordo com as normas KDP
   * com garantia de manuscrito denso, sem páginas em branco soltas e tipografia profissional.
   */
  public static async buildInteriorPdf(project: BookProject): Promise<Blob> {
    const targetPages = project.actualPages || project.estimatedPages || 150;

    // 1. BACKEND SPECIALIST CHECK: Assegura que o projeto possua prosa substancial e calibrada
    let activeProject = { ...project };
    const chapters = activeProject.kdpChapters || [];
    const needsStoryEnrichment = chapters.length === 0 || chapters.some(c => !c.prose || c.prose.trim().length < 350);

    if (needsStoryEnrichment) {
      activeProject = ShowMeTheStoryEngine.generateStoryBook(activeProject, targetPages);
    }

    const [widthMm, heightMm] = this.getTrimDimensionsMm(activeProject.trimSize || '6x9');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [widthMm, heightMm]
    });

    // Margens KDP oficiais:
    // Gutter (margem interna de encadernação): 19mm a 22mm
    // Margem externa: 13mm
    const marginInside = targetPages > 150 ? 21 : 19;
    const marginOutside = 13;
    const marginTop = 18;
    const marginBottom = 18;
    const printableWidth = widthMm - marginInside - marginOutside;

    // Rastreia quais páginas são aberturas de capítulo para omitir cabeçalho corrente
    const chapterStartPages = new Set<number>();
    const tocEntries: { title: string; page: number }[] = [];

    // Helper para obter margem esquerda conforme página par/ímpar (páginas espelhadas KDP)
    const getLeftMargin = (pageNum: number) => {
      // Página ímpar (reto - direita): lombada fica à esquerda -> marginInside
      // Página par (verso - esquerda): lombada fica à direita -> marginOutside
      return pageNum % 2 !== 0 ? marginInside : marginOutside;
    };

    // ==========================================
    // PÁGINA 1: FOLHA DE ROSTO OFICIAL (Lado Ímpar)
    // ==========================================
    chapterStartPages.add(1);
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    const titleLines = doc.splitTextToSize(activeProject.title || 'Livro KDP', printableWidth);
    doc.text(titleLines, widthMm / 2, heightMm * 0.28, { align: 'center' });

    if (activeProject.subtitle) {
      doc.setFont('times', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      const subLines = doc.splitTextToSize(activeProject.subtitle, printableWidth);
      doc.text(subLines, widthMm / 2, heightMm * 0.38, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }

    // Linha de ornamento gráfico clássico
    doc.setFont('times', 'normal');
    doc.setFontSize(14);
    doc.text('― ◆ ―', widthMm / 2, heightMm * 0.48, { align: 'center' });

    // Nome do autor
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text((activeProject.author || 'Autor').toUpperCase(), widthMm / 2, heightMm * 0.65, { align: 'center' });

    // Rodapé de edição
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text('1ª Edição • Publicação Independente Amazon KDP', widthMm / 2, heightMm - marginBottom, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // ==========================================
    // PÁGINA 2: FICHA CATALOGRÁFICA & COPYRIGHT (Verso)
    // ==========================================
    doc.addPage();
    chapterStartPages.add(2);
    const year = new Date().getFullYear();
    const cipY = heightMm * 0.48;
    const cipWidth = printableWidth;
    const cipHeight = 65;
    const cipX = getLeftMargin(2);

    // Moldura elegante da Ficha Catalográfica CIP
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.3);
    doc.rect(cipX, cipY, cipWidth, cipHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Dados Internacionais de Catalogação na Publicação (CIP)', cipX + (cipWidth / 2), cipY + 6, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    const cipText = [
      `${activeProject.author || 'Autor'}, ${year}`,
      `   ${activeProject.title || 'Título'}: ${activeProject.subtitle || 'Edição Independente'} / ${activeProject.author || 'Autor'}.`,
      `   Formato: Amazon KDP Paperback (${activeProject.trimSize || '6x9'}). Idioma: ${activeProject.language || 'Português'}.`,
      `   1. Desenvolvimento e Metodologia  2. Gestão e Foco  3. Liderança e Crescimento.`,
      `   CDD - 158.1`,
      `   Impresso no Brasil / Fabricado sob demanda via Amazon Kindle Direct Publishing.`
    ];
    doc.text(cipText, cipX + 4, cipY + 14, { maxWidth: cipWidth - 8 });

    // Direitos Autorais abaixo da moldura CIP
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    const legalLines = [
      `© ${year} por ${activeProject.author || 'Autor'}. Todos os direitos reservados.`,
      'Nenhuma parte deste livro pode ser reproduzida ou transmitida sem prévia autorização por escrito.',
      'Publicação independente registrada para distribuição mundial via Amazon KDP.'
    ];
    doc.text(legalLines, cipX, heightMm - marginBottom - 8, { maxWidth: printableWidth });
    doc.setTextColor(0, 0, 0);

    // ==========================================
    // PÁGINA 3: SUMÁRIO EDITORIAL
    // ==========================================
    doc.addPage();
    chapterStartPages.add(3);
    const tocPage = 3;
    const tocLeft = getLeftMargin(3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('SUMÁRIO', widthMm / 2, marginTop + 10, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(widthMm / 2 - 20, marginTop + 14, widthMm / 2 + 20, marginTop + 14);

    let tocY = marginTop + 26;
    const tocPageRef = doc.getCurrentPageInfo().pageNumber;

    // Espaço reservado para o sumário (será preenchido no final com as páginas exatas)

    // ==========================================
    // PÁGINA 4+: DEDICATÓRIA OU INTRODUÇÃO
    // ==========================================
    const dedication = activeProject.editorialElements?.dedication;
    if (dedication) {
      doc.addPage();
      chapterStartPages.add(doc.getNumberOfPages());
      const pNum = doc.getNumberOfPages();
      const pLeft = getLeftMargin(pNum);

      doc.setFont('times', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const dedLines = doc.splitTextToSize(`“${dedication}”`, printableWidth * 0.75);
      doc.text(dedLines, pLeft + (printableWidth * 0.25), heightMm * 0.45);
      doc.setTextColor(0, 0, 0);
    }

    // --- INTRODUÇÃO ---
    const introText = activeProject.editorialElements?.introduction ||
      `Vivemos em um período caracterizado pela sobrecarga de informações e pela escassez de métodos práticos e testados. Esta obra foi concebida para oferecer clareza cirúrgica e sistemas acionáveis.\n\nAo longo dos próximos capítulos, você encontrará a fundamentação teórica conectada diretamente a planos de ação imediatos. Leia com atenção, reflita sobre os conceitos e, acima de tudo, aplique os passos propostos ao término de cada seção.`;

    doc.addPage();
    const introStartPage = doc.getNumberOfPages();
    chapterStartPages.add(introStartPage);
    tocEntries.push({ title: 'Introdução', page: introStartPage });

    this.renderDenseSection(
      doc,
      'INTRODUÇÃO',
      introText,
      widthMm,
      heightMm,
      marginInside,
      marginOutside,
      marginTop,
      marginBottom,
      printableWidth,
      chapterStartPages
    );

    // ==========================================
    // CAPÍTULOS PRINCIPAIS DO LIVRO
    // ==========================================
    const activeChapters = activeProject.kdpChapters || [];

    activeChapters.forEach((ch, idx) => {
      doc.addPage();
      const chStartPage = doc.getNumberOfPages();
      chapterStartPages.add(chStartPage);
      const cleanTitle = ch.title.replace(/^Capítulo\s*\d+\s*:\s*/i, '').trim();
      tocEntries.push({ title: `Capítulo ${ch.index || idx + 1}: ${cleanTitle}`, page: chStartPage });

      const heading = `CAPÍTULO ${ch.index || idx + 1}\n${cleanTitle}`;
      const prose = ch.prose || ch.summary || 'Conteúdo do capítulo em desenvolvimento.';

      this.renderDenseSection(
        doc,
        heading,
        prose,
        widthMm,
        heightMm,
        marginInside,
        marginOutside,
        marginTop,
        marginBottom,
        printableWidth,
        chapterStartPages,
        true
      );
    });

    // ==========================================
    // CONCLUSÃO & EPÍLOGO
    // ==========================================
    const conclusionText = activeProject.editorialElements?.conclusion ||
      `A conclusão deste livro marca o verdadeiro início da sua jornada prática. Nenhum conhecimento teórico substitui a consistência diária de execução.\n\nRetome os planos de ação desenhados, estabeleça métricas claras para as próximas semanas e mantenha o compromisso inegociável com a sua evolução contínua.`;

    doc.addPage();
    const conclusionPage = doc.getNumberOfPages();
    chapterStartPages.add(conclusionPage);
    tocEntries.push({ title: 'Conclusão: O Plano de Ação', page: conclusionPage });

    this.renderDenseSection(
      doc,
      'CONCLUSÃO: O PLANO DE AÇÃO',
      conclusionText,
      widthMm,
      heightMm,
      marginInside,
      marginOutside,
      marginTop,
      marginBottom,
      printableWidth,
      chapterStartPages
    );

    // ==========================================
    // SOBRE O AUTOR
    // ==========================================
    const aboutAuthor = activeProject.editorialElements?.aboutAuthor ||
      `${activeProject.author || 'O Autor'} é pesquisador, estrategista e autor comprometido com a produção de conteúdos de alta relevância prática e impacto duradouro. Dedica-se a decodificar métodos complexos em frameworks acessíveis e transformadores para o público contemporâneo.`;

    doc.addPage();
    const aboutPage = doc.getNumberOfPages();
    chapterStartPages.add(aboutPage);
    tocEntries.push({ title: 'Sobre o Autor', page: aboutPage });

    this.renderDenseSection(
      doc,
      'SOBRE O AUTOR',
      aboutAuthor,
      widthMm,
      heightMm,
      marginInside,
      marginOutside,
      marginTop,
      marginBottom,
      printableWidth,
      chapterStartPages
    );

    // ==========================================
    // GARANTIA KDP: TOTAL DE PÁGINAS PAR
    // ==========================================
    // A gráfica Amazon KDP exige número par de páginas para encadernação
    if (doc.getNumberOfPages() % 2 !== 0) {
      doc.addPage();
      const notesPage = doc.getNumberOfPages();
      chapterStartPages.add(notesPage);
      const notesLeft = getLeftMargin(notesPage);

      doc.setFont('times', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(120, 120, 120);
      doc.text('ANOTAÇÕES & INSIGHTS DO LEITOR', widthMm / 2, marginTop + 10, { align: 'center' });

      // Linhas pautadas para anotações do leitor
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      for (let y = marginTop + 22; y <= heightMm - marginBottom - 10; y += 9) {
        doc.line(notesLeft, y, notesLeft + printableWidth, y);
      }
      doc.setTextColor(0, 0, 0);
    }

    // ==========================================
    // PASSE 2: PREENCHIMENTO DO SUMÁRIO (TOC)
    // ==========================================
    doc.setPage(tocPage);
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    let entryY = tocY;

    tocEntries.forEach((entry) => {
      if (entryY <= heightMm - marginBottom - 12) {
        const titleSnippet = doc.splitTextToSize(entry.title, printableWidth - 20)[0] || entry.title;
        doc.text(titleSnippet, tocLeft, entryY);

        // Pontilhados líderes conectando o título ao número de página
        doc.setFont('courier', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(150, 150, 150);
        const dots = '. '.repeat(26);
        doc.text(dots, widthMm - marginOutside - 32, entryY, { align: 'right' });

        doc.setFont('times', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(0, 0, 0);
        doc.text(`${entry.page}`, widthMm - marginOutside, entryY, { align: 'right' });

        entryY += 7.5;
        doc.setFont('times', 'normal');
        doc.setFontSize(10);
      }
    });

    // ==========================================
    // PASSE 3: CABEÇALHOS CORRENTES & NUMERAÇÃO DE PÁGINAS
    // ==========================================
    const totalPages = doc.getNumberOfPages();

    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      // Não numera folha de rosto nem ficha catalográfica (páginas 1 e 2)
      if (p <= 2) continue;

      const isOdd = p % 2 !== 0;
      const leftMarg = isOdd ? marginInside : marginOutside;
      const rightEdge = isOdd ? widthMm - marginOutside : widthMm - marginInside;

      // 1. Número da página no rodapé
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(90, 90, 90);
      doc.text(`${p}`, widthMm / 2, heightMm - 8, { align: 'center' });

      // 2. Cabeçalho corrente no topo (omitido em páginas de início de capítulo)
      if (!chapterStartPages.has(p)) {
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.15);
        doc.line(leftMarg, 13, rightEdge, 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(110, 110, 110);

        if (!isOdd) {
          // Verso (Página Par): Título do Livro em caixa alta sutil (sem nome de autor)
          const headerLeft = (activeProject.title || 'LIVRO KDP').toUpperCase();
          doc.text(headerLeft, leftMarg, 11);
        } else {
          // Reto (Página Ímpar): Subtítulo do Livro ou Título Editorial (sem nome do autor)
          const headerRight = (activeProject.subtitle || activeProject.title || 'EDIÇÃO KDP').toUpperCase();
          doc.text(headerRight, rightEdge, 11, { align: 'right' });
        }
      }
    }

    doc.setTextColor(0, 0, 0);
    return doc.output('blob');
  }

  /**
   * Renderiza seções de prosa densa com tipografia editorial (Drop Cap, recuo de parágrafo,
   * quebras de linha automáticas e preenchimento fluido de páginas).
   */
  private static renderDenseSection(
    doc: jsPDF,
    heading: string,
    bodyText: string,
    widthMm: number,
    heightMm: number,
    marginInside: number,
    marginOutside: number,
    marginTop: number,
    marginBottom: number,
    printableWidth: number,
    chapterStartPages: Set<number>,
    isChapter: boolean = false
  ) {
    let currentPageNum = doc.getCurrentPageInfo().pageNumber;
    let leftMargin = currentPageNum % 2 !== 0 ? marginInside : marginOutside;
    let currentY = marginTop + 14;

    // --- TÍTULO DA SEÇÃO / CAPÍTULO ---
    if (isChapter) {
      const parts = heading.split('\n');
      const capLabel = parts[0] || 'CAPÍTULO';
      const capTitle = parts[1] || '';

      // Rótulo "CAPÍTULO X" em caixa alta espaçada
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(capLabel, widthMm / 2, currentY, { align: 'center' });
      currentY += 8;

      // Título do Capítulo em serifa encorpada
      doc.setFont('times', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(15, 23, 42);
      const titleLines = doc.splitTextToSize(capTitle, printableWidth - 10);
      doc.text(titleLines, widthMm / 2, currentY, { align: 'center' });
      currentY += titleLines.length * 7 + 4;

      // Ornamento sutil separador
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(140, 140, 140);
      doc.text('― ✦ ―', widthMm / 2, currentY, { align: 'center' });
      currentY += 12;
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text(heading, widthMm / 2, currentY, { align: 'center' });
      currentY += 14;
    }

    doc.setTextColor(0, 0, 0);

    // --- PARÁGRAFOS DO CORPO DO TEXTO ---
    const paragraphs = bodyText
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const firstLineIndent = 5; // 5mm de recuo na primeira linha (padrão editorial)
    const lineHeight = 5.2; // entrelinha balanceada para leitura confortável

    paragraphs.forEach((paragraph, pIdx) => {
      doc.setFont('times', 'normal');
      doc.setFontSize(10.5);

      // Primeiro parágrafo tem capitular (Drop Cap) ou sem recuo
      const isFirstParagraph = pIdx === 0;

      if (isFirstParagraph && paragraph.length > 20) {
        // Renderiza Capitular (Drop Cap) elegante
        const firstLetter = paragraph[0];
        const restOfParagraph = paragraph.slice(1);

        doc.setFont('times', 'bold');
        doc.setFontSize(26);
        const dropCapWidth = doc.getTextWidth(firstLetter) + 1.5;
        doc.text(firstLetter, leftMargin, currentY + 4.5);

        // Linhas ao lado da capitular
        doc.setFont('times', 'normal');
        doc.setFontSize(10.5);
        const sideLines = doc.splitTextToSize(restOfParagraph, printableWidth - dropCapWidth);
        const firstTwoLines = sideLines.slice(0, 2);
        const remainingLines = doc.splitTextToSize(sideLines.slice(2).join(' '), printableWidth);

        // Desenha as primeiras duas linhas ao lado da capitular
        if (firstTwoLines.length > 0) {
          doc.text(firstTwoLines[0], leftMargin + dropCapWidth, currentY);
          currentY += lineHeight;
        }
        if (firstTwoLines.length > 1) {
          doc.text(firstTwoLines[1], leftMargin + dropCapWidth, currentY);
          currentY += lineHeight;
        }

        // Desenha as linhas restantes em largura cheia
        remainingLines.forEach((line: string) => {
          if (currentY + lineHeight > heightMm - marginBottom) {
            doc.addPage();
            currentPageNum = doc.getCurrentPageInfo().pageNumber;
            leftMargin = currentPageNum % 2 !== 0 ? marginInside : marginOutside;
            currentY = marginTop + 4;
            doc.setFont('times', 'normal');
            doc.setFontSize(10.5);
          }
          doc.text(line, leftMargin, currentY);
          currentY += lineHeight;
        });

        currentY += 3.5; // Espaçamento entre parágrafos
      } else {
        // Parágrafos regulares com recuo na primeira linha
        const lines = doc.splitTextToSize(paragraph, printableWidth);

        lines.forEach((line: string, lineIdx: number) => {
          if (currentY + lineHeight > heightMm - marginBottom) {
            doc.addPage();
            currentPageNum = doc.getCurrentPageInfo().pageNumber;
            leftMargin = currentPageNum % 2 !== 0 ? marginInside : marginOutside;
            currentY = marginTop + 4;
            doc.setFont('times', 'normal');
            doc.setFontSize(10.5);
          }

          // Aplica recuo apenas na primeira linha do parágrafo
          const lineX = lineIdx === 0 ? leftMargin + firstLineIndent : leftMargin;
          doc.text(line, lineX, currentY);
          currentY += lineHeight;
        });

        currentY += 3.5; // Espaçamento suave entre parágrafos
      }
    });
  }

  /**
   * Gera o PDF de Capa Completa KDP Paperback (Capa-Full-Wrap.pdf: Contracapa + Lombada + Capa)
   * em alta fidelidade e rigor dimensional.
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

    // 1. Fundo Geral da Capa (Slate escuro elegante)
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, totalWidthMm, totalHeightMm, 'F');

    // 2. Coordenadas dos Painéis
    const backCoverX = bleedMm;
    const spineX = bleedMm + trimWidthMm;
    const frontCoverX = spineX + spineWidthMm;

    // --- PAINEL FRONTAL (CAPA DIREITA) ---
    const coverArtUrl = project.coverImageUrl || project.kdpCoverDesign?.frontImageUrl || project.stageData?.['book-cover']?.artUrl;

    if (coverArtUrl) {
      try {
        let imgData = coverArtUrl;
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
            // Continua com background padrão caso falhe o fetch de URL externa
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

    // Caixa de título elegante na Capa Frontal com semitransparência escura para contraste
    doc.setFillColor(15, 23, 42);
    doc.setDrawColor(234, 179, 8); // Gold 500
    doc.setLineWidth(0.6);
    doc.rect(frontCoverX + 10, bleedMm + 24, trimWidthMm - 20, 52, 'F');
    doc.rect(frontCoverX + 10, bleedMm + 24, trimWidthMm - 20, 52, 'S');

    // Título Principal
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    const titleLines = doc.splitTextToSize(project.title || 'Título do Livro', trimWidthMm - 26);
    doc.text(titleLines, frontCoverX + (trimWidthMm / 2), bleedMm + 42, { align: 'center' });

    // Subtítulo
    if (project.subtitle) {
      doc.setTextColor(226, 232, 240); // Slate 200
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      const subLines = doc.splitTextToSize(project.subtitle, trimWidthMm - 30);
      doc.text(subLines, frontCoverX + (trimWidthMm / 2), bleedMm + 44 + (titleLines.length * 8), { align: 'center' });
    }

    // Autor na Capa Frontal
    doc.setFillColor(15, 23, 42);
    doc.rect(frontCoverX + 15, totalHeightMm - bleedMm - 38, trimWidthMm - 30, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text(project.author || 'Autor', frontCoverX + (trimWidthMm / 2), totalHeightMm - bleedMm - 25, { align: 'center' });

    // --- PAINEL CENTRAL (LOMBADA / SPINE) ---
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.3);
    doc.line(spineX, 0, spineX, totalHeightMm);
    doc.line(spineX + spineWidthMm, 0, spineX + spineWidthMm, totalHeightMm);

    // Texto da lombada (se a lombada tiver mais de 6mm)
    if (spineWidthMm >= 6) {
      doc.saveGraphicsState();
      const spineCenterX = spineX + (spineWidthMm / 2);
      const spineCenterY = totalHeightMm / 2;

      doc.setTextColor(241, 245, 249);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(Math.min(9, spineWidthMm * 0.8));

      const spineText = `${project.title || 'Livro KDP'}   •   ${project.author || 'Autor'}`;
      doc.text(spineText, spineCenterX, spineCenterY, { align: 'center', angle: 270 });
      doc.restoreGraphicsState();
    }

    // --- PAINEL TRASEIRO (CONTRACAPA ESQUERDA) ---
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('SOBRE ESTA OBRA', backCoverX + 15, bleedMm + 28);

    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.4);
    doc.line(backCoverX + 15, bleedMm + 31, backCoverX + 60, bleedMm + 31);

    // Texto de Sinopse / Blurb na contracapa
    doc.setTextColor(203, 213, 225); // Slate 300
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    const blurb = project.kdpConcept?.longSynopsis || project.description || 'Uma obra transformadora desenvolvida com rigor editorial e pronta para o leitor moderno.';
    const blurbLines = doc.splitTextToSize(blurb, trimWidthMm - 30);
    doc.text(blurbLines, backCoverX + 15, bleedMm + 40);

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
