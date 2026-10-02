// Gerador Profissional de PDF KDP para Livros de Sudoku Investigativo usando jsPDF
import { jsPDF } from 'jspdf';
import { 
  SudokuBookConfig, 
  InvestigationCase, 
  SudokuPuzzle, 
  SudokuTrimFormat 
} from '../types/sudoku-investigative';

export class SudokuKdpPdfBuilder {
  /**
   * Converte Trim Size para milímetros [largura, altura]
   */
  public static getDimensionsMm(format: SudokuTrimFormat): [number, number] {
    switch (format) {
      case '8.5x11': return [215.9, 279.4];
      case '8x10': return [203.2, 254.0];
      case '7.5x9.25': return [190.5, 235.0];
      case '6x9': return [152.4, 228.6];
      default: return [215.9, 279.4];
    }
  }

  /**
   * Compila o PDF do Miolo Completo (Interior.pdf)
   */
  public static async buildInteriorPdf(
    config: SudokuBookConfig,
    cases: InvestigationCase[]
  ): Promise<{ blob: Blob; url: string; totalPages: number; doc?: jsPDF }> {
    const [widthMm, heightMm] = this.getDimensionsMm(config.trimFormat);
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [widthMm, heightMm]
    });

    let pageNum = 1;

    // 1. FOLHA DE ROSTO: ESTE LIVRO PERTENCE A
    this.drawBelongsToPage(doc, config, widthMm, heightMm);

    // 2. ÍNDICE DOS CASOS
    doc.addPage([widthMm, heightMm], 'portrait');
    pageNum++;
    this.drawTableOfContents(doc, cases, widthMm, heightMm);

    // 3. CASOS INVESTIGATIVOS
    for (const c of cases) {
      // Página 1 do Caso: Apresentação e Vítima
      doc.addPage([widthMm, heightMm], 'portrait');
      pageNum++;
      this.drawCaseIntroPage(doc, c, widthMm, heightMm, pageNum);

      // Página 2 do Caso: Cena do Crime e Suspeitos
      doc.addPage([widthMm, heightMm], 'portrait');
      pageNum++;
      this.drawCrimeSceneAndSuspectsPage(doc, c, widthMm, heightMm, pageNum);

      // Página 3 do Caso: Quadro de Investigação & Tabela de Suspeitos (Ficha interativa para o leitor)
      doc.addPage([widthMm, heightMm], 'portrait');
      pageNum++;
      this.drawInvestigationWorksheet(doc, c, widthMm, heightMm, pageNum);

      // Página 4 do Caso: Linha do Tempo do Inquérito
      doc.addPage([widthMm, heightMm], 'portrait');
      pageNum++;
      this.drawTimelinePage(doc, c, widthMm, heightMm, pageNum);

      // Páginas dos Sudokus
      for (const puzzle of c.puzzles) {
        doc.addPage([widthMm, heightMm], 'portrait');
        pageNum++;
        this.drawSudokuPage(doc, c, puzzle, widthMm, heightMm, pageNum);
      }

      // Página de Acusação
      doc.addPage([widthMm, heightMm], 'portrait');
      pageNum++;
      this.drawAccusationPage(doc, c, widthMm, heightMm, pageNum);
    }

    // 4. SEÇÃO FINAL: GABARITO & SOLUÇÃO DOS CASOS
    doc.addPage([widthMm, heightMm], 'portrait');
    pageNum++;
    this.drawSolutionsSection(doc, cases, widthMm, heightMm);

    const blob = doc.output('blob');
    let url = '';
    try {
      url = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : '';
    } catch {
      url = '';
    }

    return {
      blob,
      url,
      totalPages: pageNum,
      doc
    };
  }

  /**
   * Compila um PDF separado apenas com as Soluções e Gabarito (Gabarito.pdf)
   */
  public static async buildSolutionsOnlyPdf(
    config: SudokuBookConfig,
    cases: InvestigationCase[]
  ): Promise<{ blob: Blob; url: string; doc: jsPDF }> {
    const [widthMm, heightMm] = this.getDimensionsMm(config.trimFormat);
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [widthMm, heightMm]
    });

    this.drawSolutionsSection(doc, cases, widthMm, heightMm);

    const blob = doc.output('blob');
    let url = '';
    try {
      url = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : '';
    } catch {
      url = '';
    }
    return { blob, url, doc };
  }

  public static async buildSolutionsPdf(
    config: SudokuBookConfig,
    cases: InvestigationCase[]
  ): Promise<{ blob: Blob; url: string; doc: jsPDF }> {
    return this.buildSolutionsOnlyPdf(config, cases);
  }

  // =========================================================================
  // MÉTODOS DE DESENHO DE PÁGINAS INDIVIDUAIS
  // =========================================================================

  private static drawBelongsToPage(doc: jsPDF, config: SudokuBookConfig, w: number, h: number) {
    // Moldura elegante
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(1.2);
    doc.rect(14, 14, w - 28, h - 28);
    doc.setLineWidth(0.4);
    doc.rect(17, 17, w - 34, h - 34);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(config.title.toUpperCase(), w / 2, h * 0.28, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text(config.subtitle || 'LIVRO DE SUDOKU INVESTIGATIVO • EDIÇÃO ESPECIAL KDP', w / 2, h * 0.34, { align: 'center' });

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Este dossiê investigativo pertence a:', w / 2, h * 0.52, { align: 'center' });

    doc.setLineWidth(0.8);
    doc.line(w * 0.22, h * 0.60, w * 0.78, h * 0.60);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Instruções: Resolva cada Sudoku para desbloquear pistas cruciais.', w / 2, h * 0.75, { align: 'center' });
    doc.text('Preencha os quadros de evidências e descubra o assassino antes de checar a solução.', w / 2, h * 0.79, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Publicado via Book Intel KDP • Todos os direitos reservados', w / 2, h * 0.92, { align: 'center' });
  }

  private static drawTableOfContents(doc: jsPDF, cases: InvestigationCase[], w: number, h: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ÍNDICE DOS CASOS CRIMINAIS', w / 2, 28, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Consulte a lista de casos abaixo e conduza os inquéritos em ordem cronológica:', 20, 42);

    let y = 56;
    cases.forEach((c) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`CASO #${c.caseNumber.toString().padStart(3, '0')} — ${c.victim.nome}`, 20, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`${c.crimeScene.localDetalhado} • ${c.puzzles.length} Sudokus de Investigação`, 20, y + 5);

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(20, y + 8, w - 20, y + 8);

      y += 14;
    });

    doc.setFont('helvetica', 'bold');
    doc.text('SEÇÃO DE GABARITO & SOLUÇÕES FINAIS ............................................ Final do Livro', 20, y + 8);
  }

  private static drawCaseIntroPage(doc: jsPDF, c: InvestigationCase, w: number, h: number, pageNum: number) {
    // Cabeçalho do Caso
    doc.setFillColor(15, 23, 42);
    doc.rect(18, 18, w - 36, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(c.title.toUpperCase(), w / 2, 29, { align: 'center' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(15);
    doc.text('1. INTRODUÇÃO DA HISTÓRIA', 20, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const splitStory = doc.splitTextToSize(c.storyIntroduction, w - 40);
    doc.text(splitStory, 20, 58);

    const storyBottom = 58 + splitStory.length * 5.2;

    // Ficha da Vítima
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('2. PERFIL DA VÍTIMA', 20, storyBottom + 10);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(20, storyBottom + 14, w - 40, 52, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nome: ${c.victim.nome}`, 25, storyBottom + 22);
    doc.text(`Idade: ${c.victim.idade} anos`, 110, storyBottom + 22);
    doc.text(`Profissão: ${c.victim.profissao}`, 25, storyBottom + 28);

    doc.setFont('helvetica', 'normal');
    doc.text(`Personalidade: ${c.victim.personalidade}`, 25, storyBottom + 35);
    doc.text(`Histórico: ${c.victim.historico}`, 25, storyBottom + 43);
    doc.text(`Relação: ${c.victim.relacaoComSuspeitos}`, 25, storyBottom + 51);

    // Rodapé de Página
    this.drawFooter(doc, w, h, pageNum);
  }

  private static drawCrimeSceneAndSuspectsPage(doc: jsPDF, c: InvestigationCase, w: number, h: number, pageNum: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('3. A CENA DO CRIME', 20, 26);

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(20, 30, w - 40, 36, 'FD');

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Horário do Descoberta: ${c.crimeScene.horaEncontrado} • Local: ${c.crimeScene.localDetalhado}`, 24, 38);

    doc.setFont('helvetica', 'normal');
    const splitScene = doc.splitTextToSize(c.crimeScene.descricao, w - 48);
    doc.text(splitScene, 24, 45);

    // Lista de Suspeitos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('4. LISTA DE SUSPEITOS & ÁLIBIS INICIAIS', 20, 78);

    let y = 86;
    c.suspects.slice(0, 5).forEach((s) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Suspeito #${s.numero}: ${s.nome} (${s.idade} anos, ${s.profissao})`, 22, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Relação: ${s.relacionamento}`, 26, y + 4.5);
      doc.text(`Álibi Declarado: "${s.alibi}"`, 26, y + 9);
      doc.text(`Comportamento: ${s.comportamento}`, 26, y + 13.5);

      doc.setDrawColor(226, 232, 240);
      doc.line(22, y + 16, w - 22, y + 16);

      y += 20;
    });

    this.drawFooter(doc, w, h, pageNum);
  }

  private static drawInvestigationWorksheet(doc: jsPDF, c: InvestigationCase, w: number, h: number, pageNum: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('QUADRO DE INVESTIGAÇÃO (ANOTAÇÕES DO DETETIVE)', w / 2, 24, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text('Preencha os campos abaixo conforme resolve os Sudokus do caso e descobre pistas:', 20, 32);

    // Tabela de Suspeitos interativa
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.setFillColor(241, 245, 249);
    doc.rect(20, 38, w - 40, 10, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Suspeito', 24, 44);
    doc.text('Motivo Aparente', 65, 44);
    doc.text('Álibi Confirmado?', 120, 44);
    doc.text('Culpado? [Sim/Não]', w - 50, 44);

    let y = 48;
    c.suspects.forEach((s) => {
      doc.setDrawColor(203, 213, 225);
      doc.rect(20, y, w - 40, 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`#${s.numero} ${s.nome}`, 22, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('[                            ]', 65, y + 7);
      doc.text('[  ] Sim   [  ] Não', 120, y + 7);
      doc.text('[  ] Culpado', w - 48, y + 7);

      y += 12;
    });

    // Bloco de Notas de Pistas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PISTAS DECODIFICADAS DOS SUDOKUS:', 20, y + 12);

    let py = y + 16;
    for (let i = 1; i <= c.puzzles.length; i++) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Pista #${i} (Sudoku #${i}):`, 22, py + 4);
      doc.setDrawColor(180, 180, 180);
      doc.line(65, py + 5, w - 22, py + 5);
      py += 10;
    }

    this.drawFooter(doc, w, h, pageNum);
  }

  private static drawTimelinePage(doc: jsPDF, c: InvestigationCase, w: number, h: number, pageNum: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('LINHA DO TEMPO DA INVESTIGAÇÃO', w / 2, 24, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text('Reconstitua a ordem cronológica dos acontecimentos para apontar contradições nos depoimentos:', 20, 32);

    let y = 46;
    const hours = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00'];

    hours.forEach((hStr) => {
      // Círculo de Horário
      doc.setFillColor(37, 99, 235);
      doc.circle(28, y, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(hStr, 28, y + 2, { align: 'center' });

      // Linha guia
      doc.setTextColor(15, 23, 42);
      doc.setDrawColor(203, 213, 225);
      doc.line(38, y, w - 22, y);

      // Evento se houver
      const matching = c.timeline.find(t => t.time.startsWith(hStr.slice(0, 2)));
      if (matching) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.text(`(Registrado): ${matching.event}`, 40, y - 2);
      }

      y += 22;
    });

    this.drawFooter(doc, w, h, pageNum);
  }

  private static drawSudokuPage(doc: jsPDF, c: InvestigationCase, p: SudokuPuzzle, w: number, h: number, pageNum: number) {
    // Cabeçalho do Enigma
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`CASO #${c.caseNumber.toString().padStart(3, '0')} • SUDOKU #${p.puzzleIndex} (${p.difficulty.toUpperCase()})`, w / 2, 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(p.instructions, w / 2, 28, { align: 'center' });

    // Desenho vetorial da grade 9x9 do Sudoku
    const gridSize = Math.min(w * 0.72, 135);
    const startX = (w - gridSize) / 2;
    const startY = 36;
    const cellSize = gridSize / 9;

    // Fundo da célula de pista destacada (Linha 5, Col 5)
    doc.setFillColor(254, 240, 138); // Amarelo suave
    doc.rect(
      startX + p.clueCell.col * cellSize,
      startY + p.clueCell.row * cellSize,
      cellSize,
      cellSize,
      'F'
    );

    // Linhas finas e grossas
    for (let i = 0; i <= 9; i++) {
      const isThick = i % 3 === 0;
      doc.setLineWidth(isThick ? 0.9 : 0.25);
      doc.setDrawColor(isThick ? 0 : 120, isThick ? 0 : 120, isThick ? 0 : 120);

      // Horizontais
      doc.line(startX, startY + i * cellSize, startX + gridSize, startY + i * cellSize);
      // Verticais
      doc.line(startX + i * cellSize, startY, startX + i * cellSize, startY + gridSize);
    }

    // Preenchimento dos dígitos iniciais do Puzzle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);

    for (let r = 0; r < 9; r++) {
      for (let col = 0; col < 9; col++) {
        const val = p.grid[r][col];
        if (val !== 0) {
          const cx = startX + col * cellSize + cellSize / 2;
          const cy = startY + r * cellSize + cellSize * 0.72;
          doc.text(val.toString(), cx, cy, { align: 'center' });
        }
      }
    }

    // Caixa de Pista Revelada no Rodapé do Puzzle
    const boxY = startY + gridSize + 10;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.6);
    doc.roundedRect(startX, boxY, gridSize, 32, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(`🔎 PISTA DECODIFICADA #${p.puzzleIndex}:`, startX + 6, boxY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Ao encontrar o número na célula central destacada, anote a pista:', startX + 6, boxY + 14);

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(startX + 6, boxY + 24, startX + gridSize - 6, boxY + 24);

    this.drawFooter(doc, w, h, pageNum);
  }

  private static drawAccusationPage(doc: jsPDF, c: InvestigationCase, w: number, h: number, pageNum: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ACUSAÇÃO FINAL & CONCLUSÃO DO CASO', w / 2, 28, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Você reuniu todas as pistas através dos Sudokus. Agora tome a sua decisão:', 20, 38);

    doc.setDrawColor(15, 23, 42);
    doc.rect(20, 46, w - 40, 90);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('EU ACUSO FORMALMENTE:', 26, 56);
    doc.line(80, 57, w - 26, 57);

    doc.text('MOTIVO IDENTIFICADO:', 26, 72);
    doc.line(80, 73, w - 26, 73);

    doc.text('ARMA DO CRIME:', 26, 88);
    doc.line(80, 89, w - 26, 89);

    doc.text('EVIDÊNCIA DECISIVA:', 26, 104);
    doc.line(80, 105, w - 26, 105);

    doc.text('COMO O ÁLIBI FOI DERRUBADO:', 26, 120);
    doc.line(26, 128, w - 26, 128);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Após preencher esta declaração, consulte as páginas de SOLUÇÕES no final do livro.', w / 2, 150, { align: 'center' });

    this.drawFooter(doc, w, h, pageNum);
  }

  private static drawSolutionsSection(doc: jsPDF, cases: InvestigationCase[], w: number, h: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('SOLUÇÕES & GABARITO COMPLETO', w / 2, 28, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text('Confira aqui as grades completas dos Sudokus e o desfecho de cada inquérito:', 20, 38);

    let y = 48;
    cases.forEach((c) => {
      if (y > h - 70) {
        doc.addPage([w, h], 'portrait');
        y = 28;
      }

      doc.setFillColor(15, 23, 42);
      doc.rect(20, y, w - 40, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`SOLUÇÃO DO CASO #${c.caseNumber}: O MISTÉRIO DE ${c.crimeScene.localDetalhado.toUpperCase()}`, 24, y + 5.5);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.text(`ASSASSINO: ${c.caseSolution.culprit.nome} (${c.caseSolution.culprit.profissao})`, 22, y + 14);
      doc.text(`MOTIVO: ${c.caseSolution.motiveExplanation}`, 22, y + 19);
      doc.text(`COMO OCORREU: ${c.caseSolution.howCrimeHappened}`, 22, y + 24);

      doc.setFont('helvetica', 'bold');
      doc.text('PISTAS REVELADAS PELOS SUDOKUS:', 22, y + 32);
      doc.setFont('helvetica', 'normal');

      let py = y + 37;
      c.clues.forEach(cl => {
        doc.text(`• Sudoku #${cl.clueNumber}: ${cl.revelationText} — ${cl.pointsToCulpritReason}`, 26, py);
        py += 4.5;
      });

      y = py + 8;
    });
  }

  private static drawFooter(doc: jsPDF, w: number, h: number, pageNum: number) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Book Intel KDP • Sudoku Investigativo`, 20, h - 10);
    doc.text(`Página ${pageNum}`, w - 20, h - 10, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }
}
