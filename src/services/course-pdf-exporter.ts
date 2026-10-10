// ================================================================
// EXPORTADOR DE PDF DE E-BOOKS DE CURSOS PROFISSIONAIS
// BookEngin — Diagramação Pedagógica Completa com Antes & Depois e Tipografia Otimizada
// ================================================================

import { jsPDF } from 'jspdf';
import { CoursePedagogicalPlan, CourseLesson } from '../types/course-ebook';

export interface CoursePdfExportOptions {
  authorName?: string;
  coverDataUrl?: string;
  includeChecklists?: boolean;
  includeGlossary?: boolean;
}

export class CoursePdfExporter {
  /**
   * Constrói e retorna o objeto jsPDF do curso diagramado
   */
  static generateCoursePdfDoc(
    plan: CoursePedagogicalPlan,
    options: CoursePdfExportOptions = {}
  ): jsPDF {
    // Formato Letter / A4 padrão para apostilas e cursos técnicos (8.5 x 11 polegadas)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: [8.5, 11]
    });

    const author = options.authorName || 'Especialista BookEngin';
    const pageWidth = 8.5;
    const pageHeight = 11;
    const marginX = 0.75;
    const marginY = 0.75;
    const contentWidth = pageWidth - (marginX * 2);
    const bottomLimit = pageHeight - marginY; // 10.25 polegadas

    let currentPage = 1;
    let y = marginY;

    // Helper para adicionar nova página com cabeçalho e rodapé limpos
    const addPage = (headerText: string = '') => {
      doc.addPage([8.5, 11], 'portrait');
      currentPage++;
      y = marginY;

      // Cabeçalho discreto superior
      if (headerText) {
        doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(148, 163, 184);
        const cleanHeader = doc.splitTextToSize(headerText, contentWidth)[0] || headerText;
        doc.text(cleanHeader, marginX, 0.45);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.01);
        doc.line(marginX, 0.52, pageWidth - marginX, 0.52);
      }

      // Rodapé com número de página
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100, 116, 139);
      doc.text(String(currentPage), pageWidth / 2, 10.55, { align: 'center' });
    };

    // Helper para checar se há espaço vertical antes de renderizar um bloco
    const ensureSpace = (neededHeight: number, headerText: string = ''): void => {
      if (y + neededHeight > bottomLimit) {
        addPage(headerText);
      }
    };

    // Helper para imprimir blocos de texto multilinha divididos com segurança de quebra de página
    const printParagraph = (
      text: string,
      fontSize: number = 11,
      lineHeight: number = 0.22,
      textColor: [number, number, number] = [51, 65, 85],
      fontStyle: 'normal' | 'bold' | 'italic' = 'normal',
      headerText: string = '',
      indentX: number = 0
    ) => {
      if (!text || !text.trim()) return;
      doc.setFont('helvetica', fontStyle).setFontSize(fontSize).setTextColor(...textColor);
      const lines = doc.splitTextToSize(text, contentWidth - indentX);
      for (const line of lines) {
        ensureSpace(lineHeight, headerText);
        doc.text(line, marginX + indentX, y);
        y += lineHeight;
      }
      y += 0.08; // espaçamento entre parágrafos
    };

    // -------------------------------------------------------------
    // PÁGINA 1: CAPA EDITORIAL PROFISSIONAL
    // -------------------------------------------------------------
    this.renderProfessionalCover(doc, plan, author, options.coverDataUrl, pageWidth, pageHeight);

    // -------------------------------------------------------------
    // PÁGINA 2: FOLHA DE ROSTO E APRESENTAÇÃO
    // -------------------------------------------------------------
    addPage();

    // Título Principal (Letras 10% maiores: 26pt)
    doc.setFont('helvetica', 'bold').setFontSize(26).setTextColor(15, 23, 42);
    const titleLines = doc.splitTextToSize(plan.courseTitle, contentWidth);
    for (const line of titleLines) {
      doc.text(line, marginX, y);
      y += 0.44;
    }
    y += 0.1;

    // Subtítulo
    doc.setFont('helvetica', 'normal').setFontSize(14).setTextColor(100, 116, 139);
    const subLines = doc.splitTextToSize(plan.courseSubtitle || 'Manual Técnico e Curso Prático Passo a Passo', contentWidth);
    for (const line of subLines) {
      doc.text(line, marginX, y);
      y += 0.26;
    }
    y += 0.25;

    // Metadados
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(30, 41, 59);
    doc.text(`Instrutor / Autor: ${author}`, marginX, y);
    y += 0.26;
    doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(100, 116, 139);
    doc.text(`Categoria: ${plan.themeCategory} • Nível: ${plan.difficultyLevel.toUpperCase()}`, marginX, y);
    y += 0.35;

    // Caixa de Visão Geral Pedagógica com Altura Dinâmica
    doc.setFont('helvetica', 'normal').setFontSize(11);
    const objLines = doc.splitTextToSize(plan.learningObjective, contentWidth - 0.5);
    const audLines = doc.splitTextToSize(plan.targetAudience, contentWidth - 1.5);
    const preLines = doc.splitTextToSize(plan.prerequisites || 'Nenhum conhecimento prévio exigido', contentWidth - 1.5);
    
    const overviewBoxHeight = 0.55 + (objLines.length * 0.20) + (audLines.length * 0.20) + (preLines.length * 0.20) + 0.4;
    
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, y, contentWidth, overviewBoxHeight, 0.1, 0.1, 'FD');

    let boxY = y + 0.3;
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(15, 23, 42);
    doc.text('Visão Geral e Objetivo da Capacitação', marginX + 0.25, boxY);
    boxY += 0.28;

    doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(51, 65, 85);
    for (const l of objLines) {
      doc.text(l, marginX + 0.25, boxY);
      boxY += 0.20;
    }
    boxY += 0.12;

    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42);
    doc.text('Público-Alvo:', marginX + 0.25, boxY);
    doc.setFont('helvetica', 'normal').setTextColor(71, 85, 105);
    for (const l of audLines) {
      doc.text(l, marginX + 1.35, boxY);
      boxY += 0.20;
    }
    boxY += 0.12;

    doc.setFont('helvetica', 'bold').setTextColor(15, 23, 42);
    doc.text('Pré-Requisitos:', marginX + 0.25, boxY);
    doc.setFont('helvetica', 'normal').setTextColor(71, 85, 105);
    for (const l of preLines) {
      doc.text(l, marginX + 1.35, boxY);
      boxY += 0.20;
    }

    y += overviewBoxHeight + 0.35;

    // Lista de Ferramentas e Materiais Necessários
    ensureSpace(1.8);
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(15, 23, 42);
    doc.text('Ferramental e Materiais Recomendados:', marginX, y);
    y += 0.28;

    doc.setFont('helvetica', 'normal').setFontSize(10.5).setTextColor(51, 65, 85);
    const materials = plan.requiredToolsAndMaterials || [];
    materials.slice(0, 8).forEach((mat) => {
      ensureSpace(0.22);
      const matLines = doc.splitTextToSize(`•  ${mat}`, contentWidth - 0.3);
      for (const ml of matLines) {
        doc.text(ml, marginX + 0.15, y);
        y += 0.20;
      }
    });

    // -------------------------------------------------------------
    // PÁGINA 3: SUMÁRIO DO CURSO
    // -------------------------------------------------------------
    addPage(plan.courseTitle);
    doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(15, 23, 42);
    doc.text('Sumário do Curso', marginX, y);
    y += 0.35;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.015);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 0.28;

    plan.modules.forEach((mod) => {
      ensureSpace(0.4, plan.courseTitle);
      doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(15, 23, 42);
      doc.text(`Módulo ${mod.moduleNumber}: ${mod.title}`, marginX, y);
      y += 0.26;

      mod.lessons.forEach((les) => {
        ensureSpace(0.25, plan.courseTitle);
        doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(71, 85, 105);
        doc.text(`   Aula ${les.lessonNumber}: ${les.title}`, marginX, y);
        y += 0.22;
      });
      y += 0.15;
    });

    // -------------------------------------------------------------
    // MÓDULOS E AULAS
    // -------------------------------------------------------------
    plan.modules.forEach((mod) => {
      const modHeader = `${plan.courseTitle} • Módulo ${mod.moduleNumber}`;
      addPage(modHeader);

      // Banner de Início do Módulo
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(marginX, y, contentWidth, 1.25, 0.08, 0.08, 'F');
      
      doc.setFont('helvetica', 'bold').setFontSize(11.5).setTextColor(245, 158, 11);
      doc.text(`MÓDULO ${mod.moduleNumber}`, marginX + 0.3, y + 0.35);
      
      doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(255, 255, 255);
      const modTitleLines = doc.splitTextToSize(mod.title, contentWidth - 0.6);
      doc.text(modTitleLines, marginX + 0.3, y + 0.68);

      y += 1.45;

      doc.setFont('helvetica', 'italic').setFontSize(11).setTextColor(71, 85, 105);
      const modObjLines = doc.splitTextToSize(`Objetivo do módulo: ${mod.objective}`, contentWidth);
      for (const line of modObjLines) {
        doc.text(line, marginX, y);
        y += 0.22;
      }
      y += 0.35;

      // Iterar Aulas do Módulo
      mod.lessons.forEach((lesson) => {
        const lesHeader = `${plan.courseTitle} • Mód ${mod.moduleNumber} / Aula ${lesson.lessonNumber}`;
        
        // Se a página atual já estiver preenchida acima de 7 polegadas, inicia a aula em página nova
        if (y > 7.0) {
          addPage(lesHeader);
        } else {
          y += 0.2;
        }

        // Título da Aula (Letras 10% maiores: 15.5pt)
        ensureSpace(0.65, lesHeader);
        doc.setFont('helvetica', 'bold').setFontSize(15.5).setTextColor(15, 23, 42);
        const lesTitle = `Aula ${lesson.lessonNumber}: ${lesson.title}`;
        const lesTitleLines = doc.splitTextToSize(lesTitle, contentWidth);
        for (const line of lesTitleLines) {
          doc.text(line, marginX, y);
          y += 0.26;
        }
        y += 0.05;

        // Objetivo da Aula
        doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(2, 132, 199);
        const objTextLines = doc.splitTextToSize(`OBJETIVO: ${lesson.objective}`, contentWidth);
        for (const line of objTextLines) {
          ensureSpace(0.22, lesHeader);
          doc.text(line, marginX, y);
          y += 0.20;
        }
        y += 0.15;

        // Introdução Detalhada
        if (lesson.introduction) {
          printParagraph(lesson.introduction, 11, 0.22, [51, 65, 85], 'normal', lesHeader);
        }

        // Explicação Didática Substancial
        if (lesson.didacticExplanation) {
          printParagraph(lesson.didacticExplanation, 11, 0.22, [51, 65, 85], 'normal', lesHeader);
        }

        // Imagem Principal da Aula (se gerada)
        const lessonImage = (lesson.images || []).find(img => Boolean(img.imageDataUrl || img.imageUrl));
        if (lessonImage && lessonImage.imageDataUrl) {
          ensureSpace(3.6, lesHeader);
          try {
            const imgWidth = 4.6;
            const imgHeight = 3.2;
            const imgX = marginX + (contentWidth - imgWidth) / 2;

            doc.addImage(lessonImage.imageDataUrl, 'PNG', imgX, y, imgWidth, imgHeight, undefined, 'FAST');
            
            // Legenda técnica da imagem
            doc.setFont('helvetica', 'italic').setFontSize(9).setTextColor(100, 116, 139);
            const caption = `Figura ${mod.moduleNumber}.${lesson.lessonNumber} — ${lessonImage.title || 'Demonstração do procedimento técnico'}`;
            doc.text(caption, pageWidth / 2, y + imgHeight + 0.20, { align: 'center' });
            
            y += imgHeight + 0.40;
          } catch (e) {
            console.warn('[CoursePdfExporter] Erro ao renderizar imagem da aula:', e);
          }
        }

        // -------------------------------------------------------------
        // SEÇÃO: COMPARAÇÃO ANTES E DEPOIS (REQUISITO EXPLÍCITO)
        // -------------------------------------------------------------
        const ba = lesson.beforeAfterComparison;
        if (ba && (ba.beforeImageDataUrl || ba.afterImageDataUrl || ba.beforeImageUrl || ba.afterImageUrl)) {
          ensureSpace(3.8, lesHeader);

          doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(15, 23, 42);
          doc.text('Comparação Visual de Resultado: Antes e Depois', marginX, y);
          y += 0.26;

          const colW = (contentWidth - 0.3) / 2;
          const colH = 2.4;
          const beforeX = marginX;
          const afterX = marginX + colW + 0.3;

          // 1. FOTO DO ANTES COM SELO VERMELHO
          if (ba.beforeImageDataUrl || ba.beforeImageUrl) {
            try {
              const bImg = ba.beforeImageDataUrl || ba.beforeImageUrl!;
              doc.addImage(bImg, 'PNG', beforeX, y, colW, colH, undefined, 'FAST');
            } catch {
              doc.setFillColor(241, 245, 249);
              doc.rect(beforeX, y, colW, colH, 'F');
            }
          } else {
            doc.setFillColor(241, 245, 249);
            doc.rect(beforeX, y, colW, colH, 'F');
          }
          // Selo ANTES com fundo VERMELHO no canto superior esquerdo
          doc.setFillColor(220, 38, 38); // Red-600
          doc.rect(beforeX, y, 0.9, 0.28, 'F');
          doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(255, 255, 255);
          doc.text('ANTES', beforeX + 0.15, y + 0.19);

          // 2. FOTO DO DEPOIS COM SELO VERDE
          if (ba.afterImageDataUrl || ba.afterImageUrl) {
            try {
              const aImg = ba.afterImageDataUrl || ba.afterImageUrl!;
              doc.addImage(aImg, 'PNG', afterX, y, colW, colH, undefined, 'FAST');
            } catch {
              doc.setFillColor(241, 245, 249);
              doc.rect(afterX, y, colW, colH, 'F');
            }
          } else {
            doc.setFillColor(241, 245, 249);
            doc.rect(afterX, y, colW, colH, 'F');
          }
          // Selo DEPOIS com fundo VERDE no canto superior esquerdo
          doc.setFillColor(22, 163, 74); // Green-600
          doc.rect(afterX, y, 0.9, 0.28, 'F');
          doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(255, 255, 255);
          doc.text('DEPOIS', afterX + 0.14, y + 0.19);

          y += colH + 0.15;

          // Legendas do Antes e Depois
          doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(71, 85, 105);
          const beforeDesc = doc.splitTextToSize(ba.beforeDescription || 'Estado inicial antes do procedimento técnico.', colW);
          const afterDesc = doc.splitTextToSize(ba.afterDescription || 'Resultado final após a execução com acabamento profissional.', colW);
          doc.text(beforeDesc, beforeX, y);
          doc.text(afterDesc, afterX, y);

          const maxDescLines = Math.max(beforeDesc.length, afterDesc.length);
          y += (maxDescLines * 0.18) + 0.3;
        }

        // -------------------------------------------------------------
        // INSTRUÇÕES PASSO A PASSO (TEXTO NUNCA CORTADO)
        // -------------------------------------------------------------
        if (lesson.stepByStepInstructions && lesson.stepByStepInstructions.length > 0) {
          ensureSpace(0.5, lesHeader);
          doc.setFont('helvetica', 'bold').setFontSize(12.5).setTextColor(15, 23, 42);
          doc.text('Instruções Passo a Passo:', marginX, y);
          y += 0.26;

          lesson.stepByStepInstructions.forEach((step) => {
            // Calcula altura exata necessária para este passo
            doc.setFont('helvetica', 'normal').setFontSize(11);
            const instLines = doc.splitTextToSize(step.instruction, contentWidth - 0.3);
            const techLines = step.technicalNote ? doc.splitTextToSize(`Nota técnica: ${step.technicalNote}`, contentWidth - 0.4) : [];
            const safeLines = step.safetyCaution ? doc.splitTextToSize(`Atenção de segurança: ${step.safetyCaution}`, contentWidth - 0.4) : [];

            const stepHeight = 0.28 + (instLines.length * 0.22) + (techLines.length * 0.20) + (safeLines.length * 0.20) + 0.25;

            ensureSpace(stepHeight, lesHeader);

            // Título do Passo
            doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42);
            doc.text(`[Passo ${step.stepNumber}] ${step.title}`, marginX + 0.15, y);
            y += 0.22;

            // Texto da Instrução
            doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(51, 65, 85);
            for (const line of instLines) {
              doc.text(line, marginX + 0.15, y);
              y += 0.22;
            }

            // Nota Técnica (Totalmente dividida para não vazar a margem direita)
            if (techLines.length > 0) {
              y += 0.04;
              doc.setFont('helvetica', 'italic').setFontSize(9.5).setTextColor(2, 132, 199);
              for (const line of techLines) {
                doc.text(line, marginX + 0.25, y);
                y += 0.18;
              }
            }

            // Atenção de Segurança (Totalmente dividida para não vazar a margem direita)
            if (safeLines.length > 0) {
              y += 0.04;
              doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(220, 38, 38);
              for (const line of safeLines) {
                doc.text(line, marginX + 0.25, y);
                y += 0.18;
              }
            }

            y += 0.16;
          });
        }

        // -------------------------------------------------------------
        // CAIXA DE DICAS PRÁTICAS E ERROS COMUNS (ALTURA DINÂMICA)
        // -------------------------------------------------------------
        if ((lesson.practicalTips && lesson.practicalTips.length > 0) || (lesson.commonMistakes && lesson.commonMistakes.length > 0)) {
          doc.setFont('helvetica', 'normal').setFontSize(9.5);
          const tip = lesson.practicalTips?.[0] || 'Execute a medição com calma antes do corte definitivo.';
          const mistake = lesson.commonMistakes?.[0] || 'Evite pressa no acabamento para não danificar o material.';
          
          const tipLines = doc.splitTextToSize(`• Dica prática: ${tip}`, contentWidth - 0.45);
          const misLines = doc.splitTextToSize(`• Erro a evitar: ${mistake}`, contentWidth - 0.45);

          const tipBoxHeight = 0.40 + (tipLines.length * 0.18) + 0.08 + (misLines.length * 0.18) + 0.25;

          ensureSpace(tipBoxHeight + 0.2, lesHeader);

          doc.setFillColor(254, 243, 199); // Âmbar claro
          doc.setDrawColor(245, 158, 11);
          doc.setLineWidth(0.015);
          doc.roundedRect(marginX, y, contentWidth, tipBoxHeight, 0.08, 0.08, 'FD');

          let boxTextY = y + 0.24;
          doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(180, 83, 9);
          doc.text('DICA PRÁTICA E PREVENÇÃO DE ERROS', marginX + 0.22, boxTextY);
          boxTextY += 0.22;

          doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(69, 26, 3);
          for (const line of tipLines) {
            doc.text(line, marginX + 0.22, boxTextY);
            boxTextY += 0.18;
          }
          boxTextY += 0.06;

          for (const line of misLines) {
            doc.text(line, marginX + 0.22, boxTextY);
            boxTextY += 0.18;
          }

          y += tipBoxHeight + 0.25;
        }

        // -------------------------------------------------------------
        // EXERCÍCIO PRÁTICO DA AULA (ALTURA DINÂMICA)
        // -------------------------------------------------------------
        if (lesson.exercise && lesson.exercise.description) {
          doc.setFont('helvetica', 'normal').setFontSize(9.5);
          const exDescLines = doc.splitTextToSize(lesson.exercise.description, contentWidth - 0.45);
          const exOutcomeLines = lesson.exercise.expectedOutcome
            ? doc.splitTextToSize(`Resultado esperado: ${lesson.exercise.expectedOutcome}`, contentWidth - 0.45)
            : [];

          const exBoxHeight = 0.40 + (exDescLines.length * 0.18) + (exOutcomeLines.length * 0.18) + 0.25;

          ensureSpace(exBoxHeight + 0.2, lesHeader);

          doc.setFillColor(240, 253, 244); // Verde claro
          doc.setDrawColor(34, 197, 94);
          doc.setLineWidth(0.015);
          doc.roundedRect(marginX, y, contentWidth, exBoxHeight, 0.08, 0.08, 'FD');

          let exTextY = y + 0.24;
          doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(22, 101, 52);
          doc.text(`ATIVIDADE PRÁTICA: ${lesson.exercise.title || 'Exercício de Aplicação'}`, marginX + 0.22, exTextY);
          exTextY += 0.22;

          doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(20, 83, 45);
          for (const line of exDescLines) {
            doc.text(line, marginX + 0.22, exTextY);
            exTextY += 0.18;
          }

          if (exOutcomeLines.length > 0) {
            exTextY += 0.06;
            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(22, 101, 52);
            for (const line of exOutcomeLines) {
              doc.text(line, marginX + 0.22, exTextY);
              exTextY += 0.18;
            }
          }

          y += exBoxHeight + 0.30;
        }

        y += 0.15;
      });
    });

    // -------------------------------------------------------------
    // PÁGINA FINAL: CHECKLISTS E CONCLUSÃO
    // -------------------------------------------------------------
    addPage(`${plan.courseTitle} • Conclusão e Checklists`);

    doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(15, 23, 42);
    doc.text('Checklist Operacional e Finalização', marginX, y);
    y += 0.35;

    // Checklists
    const checklists = plan.checklists || [];
    if (checklists.length > 0) {
      checklists.forEach((chk) => {
        ensureSpace(0.4, `${plan.courseTitle} • Conclusão`);
        doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(30, 41, 59);
        doc.text(chk.title, marginX, y);
        y += 0.24;

        (chk.items || []).forEach((item) => {
          ensureSpace(0.24, `${plan.courseTitle} • Conclusão`);
          doc.setFont('helvetica', 'normal').setFontSize(10.5).setTextColor(51, 65, 85);
          const itemLines = doc.splitTextToSize(`[   ]  ${item}`, contentWidth - 0.3);
          for (const line of itemLines) {
            doc.text(line, marginX + 0.15, y);
            y += 0.20;
          }
        });
        y += 0.15;
      });
    }

    // Mensagem de Conclusão
    ensureSpace(1.5, `${plan.courseTitle} • Conclusão`);
    y += 0.2;
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(15, 23, 42);
    doc.text('Mensagem de Conclusão e Próximos Passos', marginX, y);
    y += 0.26;

    printParagraph(
      plan.conclusion || 'Parabéns pela dedicação e conclusão deste curso prático! Aplique os conhecimentos adquiridos na sua rotina profissional.',
      11,
      0.22,
      [51, 65, 85],
      'normal',
      `${plan.courseTitle} • Conclusão`
    );

    return doc;
  }

  /**
   * Constrói o objeto jsPDF pronto para visualização ou manipulação
   */
  static generateCoursePdf(
    plan: CoursePedagogicalPlan,
    options: CoursePdfExportOptions = {}
  ): jsPDF {
    return this.generateCoursePdfDoc(plan, options);
  }

  /**
   * Constrói e retorna o buffer binário Uint8Array do PDF
   */
  static buildCoursePdf(
    plan: CoursePedagogicalPlan,
    options: CoursePdfExportOptions = {}
  ): Uint8Array {
    const doc = this.generateCoursePdfDoc(plan, options);
    return doc.output('arraybuffer') as unknown as Uint8Array;
  }

  /**
   * Renderiza a Capa Oficial com Tipografia Editorial e Alto Contraste
   * GARANTE QUE O TÍTULO ESTEJA PRESENTE E NÃO EXISTAM SELOS ENGANOSOS
   */
  private static renderProfessionalCover(
    doc: jsPDF,
    plan: CoursePedagogicalPlan,
    author: string,
    coverDataUrl: string | undefined,
    pageWidth: number,
    pageHeight: number
  ) {
    if (coverDataUrl) {
      try {
        // 1. Desenha a imagem de fundo em sangria completa
        doc.addImage(coverDataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

        // 2. Overlay elegante superior e inferior para tipografia de alto contraste
        // Faixa escura superior com gradiente visual simulado
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 4.3, 'F');

        // Faixa escura inferior para autor
        doc.setFillColor(15, 23, 42);
        doc.rect(0, pageHeight - 1.6, pageWidth, 1.6, 'F');

        // Linha dourada sutil divisória
        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(0.03);
        doc.line(0.8, 4.3, pageWidth - 0.8, 4.3);
        doc.line(0.8, pageHeight - 1.6, pageWidth - 0.8, pageHeight - 1.6);
      } catch (err) {
        console.warn('[CoursePdfExporter] Erro ao renderizar imagem de capa, usando capa vetorial:', err);
        this.renderFallbackCover(doc, plan, author, pageWidth, pageHeight);
        return;
      }
    } else {
      this.renderFallbackCover(doc, plan, author, pageWidth, pageHeight);
      return;
    }

    // -------------------------------------------------------------
    // TIPOGRAFIA OFICIAL DA CAPA (TÍTULO CLARO, GRANDE E LEGÍVEL)
    // -------------------------------------------------------------
    // Badge de Categoria Técnica Limpa (SEM selos dourados falsos)
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(0.8, 0.8, 3.2, 0.35, 0.05, 0.05, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(15, 23, 42);
    doc.text('CURSO TÉCNICO PROFISSIONAL', 0.95, 1.02);

    // Título Principal do E-book
    doc.setFont('helvetica', 'bold').setFontSize(26).setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(plan.courseTitle, pageWidth - 1.6);
    let titleY = 1.6;
    for (const line of titleLines) {
      doc.text(line, 0.8, titleY);
      titleY += 0.44;
    }

    // Subtítulo
    doc.setFont('helvetica', 'normal').setFontSize(13).setTextColor(203, 213, 225);
    const subLines = doc.splitTextToSize(plan.courseSubtitle || 'Manual Didático com Ilustrações Passo a Passo', pageWidth - 1.6);
    let subY = titleY + 0.1;
    for (const line of subLines) {
      doc.text(line, 0.8, subY);
      subY += 0.24;
    }

    // Rodapé da Capa: Autor e Categoria
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(245, 158, 11);
    doc.text(`ÁREA: ${plan.themeCategory.toUpperCase()}`, 0.8, pageHeight - 1.15);

    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(255, 255, 255);
    doc.text(`Instrutor: ${author}`, 0.8, pageHeight - 0.75);

    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(148, 163, 184);
    doc.text(`Nível: ${plan.difficultyLevel.toUpperCase()} • Didática Prática com Ilustrações`, 0.8, pageHeight - 0.45);
  }

  /**
   * Renderiza uma capa padrão vetorial de alta elegância quando não há imagem Replicate
   */
  private static renderFallbackCover(
    doc: jsPDF,
    plan: CoursePedagogicalPlan,
    author: string,
    pageWidth: number,
    pageHeight: number
  ) {
    // Fundo escuro azul noite executivo
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Moldura dourada
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.02);
    doc.rect(0.5, 0.5, pageWidth - 1.0, pageHeight - 1.0, 'S');

    // Badge
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(1.0, 1.2, 3.2, 0.35, 0.05, 0.05, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(15, 23, 42);
    doc.text('CURSO PROFISSIONALIZANTE', 1.15, 1.42);

    // Título Principal
    doc.setFont('helvetica', 'bold').setFontSize(28).setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(plan.courseTitle, pageWidth - 2.0);
    let ty = 2.4;
    for (const line of titleLines) {
      doc.text(line, 1.0, ty);
      ty += 0.46;
    }

    // Subtítulo
    doc.setFont('helvetica', 'normal').setFontSize(14).setTextColor(203, 213, 225);
    const subLines = doc.splitTextToSize(plan.courseSubtitle || 'Manual Didático com Ilustrações Passo a Passo', pageWidth - 2.0);
    let sy = ty + 0.15;
    for (const line of subLines) {
      doc.text(line, 1.0, sy);
      sy += 0.26;
    }

    // Linha divisória
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.03);
    doc.line(1.0, sy + 0.4, 3.5, sy + 0.4);

    // Área e Nível
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(245, 158, 11);
    doc.text(`Área: ${plan.themeCategory}`, 1.0, 8.5);
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(148, 163, 184);
    doc.text(`Nível: ${plan.difficultyLevel.toUpperCase()} • Didática Ilustrada Oficial`, 1.0, 8.85);

    // Autor
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(255, 255, 255);
    doc.text(`Instrutor: ${author}`, 1.0, 9.6);
  }

  /**
   * Dispara o download imediato do PDF no navegador
   */
  static downloadCoursePdf(plan: CoursePedagogicalPlan, options: CoursePdfExportOptions = {}) {
    const bytes = this.buildCoursePdf(plan, options);
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTitle = (plan.courseTitle || 'curso')
      .replace(/[<>:"/\\|?*]+/g, '-')
      .replace(/\s+/g, '_')
      .toLowerCase();
    link.download = `${cleanTitle}_ebook_curso.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
}
