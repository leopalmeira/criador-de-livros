// ================================================================
// EXPORTADOR DE PDF DE E-BOOKS DE CURSOS PROFISSIONAIS
// BookEngin — Diagramação Pedagógica Completa com Imagens do Replicate
// ================================================================

import { jsPDF } from 'jspdf';
import { CoursePedagogicalPlan, CourseEbookData } from '../types/course-ebook';

export interface CoursePdfExportOptions {
  authorName?: string;
  coverDataUrl?: string;
  includeChecklists?: boolean;
  includeGlossary?: boolean;
}

export class CoursePdfExporter {
  /**
   * Constrói o PDF didático diagramado do Curso
   */
  static buildCoursePdf(
    plan: CoursePedagogicalPlan,
    options: CoursePdfExportOptions = {}
  ): Uint8Array {
    // Formato Letter / A4 padrão para apostilas e cursos técnicos (8.5 x 11 polegadas)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: [8.5, 11]
    });

    const author = options.authorName || 'Especialista BookEngin';
    const pageWidth = 8.5;
    const pageHeight = 11;
    const marginX = 0.8;
    const marginY = 0.8;
    const contentWidth = pageWidth - (marginX * 2);
    const bottomLimit = pageHeight - marginY;

    let currentPage = 1;
    let y = marginY;

    // Helper para adicionar nova página com rodapé e cabeçalho
    const addPage = (headerText: string = '') => {
      doc.addPage([8.5, 11], 'portrait');
      currentPage++;
      y = marginY;

      // Cabeçalho discreto
      if (headerText) {
        doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(148, 163, 184);
        doc.text(headerText, marginX, 0.5);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.01);
        doc.line(marginX, 0.55, pageWidth - marginX, 0.55);
      }

      // Rodapé com número de página
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100, 116, 139);
      doc.text(String(currentPage), pageWidth / 2, 10.5, { align: 'center' });
    };

    // -------------------------------------------------------------
    // PÁGINA 1: CAPA
    // -------------------------------------------------------------
    if (options.coverDataUrl) {
      try {
        doc.addImage(options.coverDataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      } catch (err) {
        console.warn('[CoursePdfExporter] Aviso ao inserir imagem de capa:', err);
        this.renderFallbackCover(doc, plan, author, pageWidth, pageHeight);
      }
    } else {
      this.renderFallbackCover(doc, plan, author, pageWidth, pageHeight);
    }

    // -------------------------------------------------------------
    // PÁGINA 2: FOLHA DE ROSTO E APRESENTAÇÃO
    // -------------------------------------------------------------
    addPage();
    doc.setFont('helvetica', 'bold').setFontSize(24).setTextColor(15, 23, 42);
    const titleLines = doc.splitTextToSize(plan.courseTitle, contentWidth);
    doc.text(titleLines, marginX, y);
    y += titleLines.length * 0.4 + 0.1;

    doc.setFont('helvetica', 'normal').setFontSize(13).setTextColor(100, 116, 139);
    const subLines = doc.splitTextToSize(plan.courseSubtitle || 'Manual Técnico e Curso Prático Passo a Passo', contentWidth);
    doc.text(subLines, marginX, y);
    y += subLines.length * 0.25 + 0.3;

    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(30, 41, 59);
    doc.text(`Instrutor / Autor: ${author}`, marginX, y);
    y += 0.25;
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(100, 116, 139);
    doc.text(`Categoria: ${plan.themeCategory} • Nível: ${plan.difficultyLevel.toUpperCase()}`, marginX, y);
    y += 0.4;

    // Caixa de Visão Geral Pedagógica
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, y, contentWidth, 2.6, 0.1, 0.1, 'FD');

    let boxY = y + 0.3;
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(15, 23, 42);
    doc.text('Visão Geral e Objetivo da Capacitação', marginX + 0.25, boxY);
    boxY += 0.25;

    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(51, 65, 85);
    const objLines = doc.splitTextToSize(plan.learningObjective, contentWidth - 0.5);
    doc.text(objLines, marginX + 0.25, boxY);
    boxY += objLines.length * 0.18 + 0.15;

    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(15, 23, 42);
    doc.text('Público-Alvo:', marginX + 0.25, boxY);
    doc.setFont('helvetica', 'normal').setTextColor(71, 85, 105);
    const audLines = doc.splitTextToSize(plan.targetAudience, contentWidth - 1.5);
    doc.text(audLines, marginX + 1.25, boxY);
    boxY += audLines.length * 0.18 + 0.15;

    doc.setFont('helvetica', 'bold').setTextColor(15, 23, 42);
    doc.text('Pré-Requisitos:', marginX + 0.25, boxY);
    doc.setFont('helvetica', 'normal').setTextColor(71, 85, 105);
    const preLines = doc.splitTextToSize(plan.prerequisites || 'Nenhum conhecimento prévio exigido', contentWidth - 1.5);
    doc.text(preLines, marginX + 1.25, boxY);

    y += 2.9;

    // Lista de Ferramentas e Materiais Necessários
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(15, 23, 42);
    doc.text('Ferramental e Materiais Recomendados:', marginX, y);
    y += 0.25;

    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(51, 65, 85);
    const materials = plan.requiredToolsAndMaterials || [];
    materials.slice(0, 6).forEach((mat) => {
      doc.text(`•  ${mat}`, marginX + 0.15, y);
      y += 0.2;
    });

    // -------------------------------------------------------------
    // PÁGINA 3: SUMÁRIO
    // -------------------------------------------------------------
    addPage(plan.courseTitle);
    doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(15, 23, 42);
    doc.text('Sumário do Curso', marginX, y);
    y += 0.35;

    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 0.25;

    plan.modules.forEach((mod) => {
      doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42);
      doc.text(`Módulo ${mod.moduleNumber}: ${mod.title}`, marginX, y);
      y += 0.22;

      mod.lessons.forEach((les) => {
        doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(71, 85, 105);
        doc.text(`   Aula ${les.lessonNumber}: ${les.title}`, marginX, y);
        y += 0.19;
      });
      y += 0.12;
    });

    // -------------------------------------------------------------
    // MÓDULOS E AULAS
    // -------------------------------------------------------------
    plan.modules.forEach((mod) => {
      addPage(`${plan.courseTitle} • Módulo ${mod.moduleNumber}`);

      // Banner do Módulo
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(marginX, y, contentWidth, 1.1, 0.08, 0.08, 'F');
      
      doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(245, 158, 11);
      doc.text(`MÓDULO ${mod.moduleNumber}`, marginX + 0.3, y + 0.35);
      
      doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(255, 255, 255);
      const modTitleLines = doc.splitTextToSize(mod.title, contentWidth - 0.6);
      doc.text(modTitleLines, marginX + 0.3, y + 0.65);

      y += 1.35;

      doc.setFont('helvetica', 'italic').setFontSize(10).setTextColor(71, 85, 105);
      const modObjLines = doc.splitTextToSize(`Objetivo do módulo: ${mod.objective}`, contentWidth);
      doc.text(modObjLines, marginX, y);
      y += modObjLines.length * 0.18 + 0.3;

      // Iterar Aulas
      mod.lessons.forEach((lesson) => {
        if (y > 7.5) {
          addPage(`${plan.courseTitle} • Módulo ${mod.moduleNumber}`);
        }

        // Título da Aula
        doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(15, 23, 42);
        const lesTitle = `Aula ${lesson.lessonNumber}: ${lesson.title}`;
        doc.text(lesTitle, marginX, y);
        y += 0.25;

        // Objetivo da Aula
        doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(2, 132, 199);
        doc.text(`OBJETIVO: ${lesson.objective}`, marginX, y);
        y += 0.25;

        // Introdução
        if (lesson.introduction) {
          doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(51, 65, 85);
          const introLines = doc.splitTextToSize(lesson.introduction, contentWidth);
          doc.text(introLines, marginX, y);
          y += introLines.length * 0.18 + 0.2;
        }

        // Explicação Didática
        if (lesson.didacticExplanation) {
          doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(51, 65, 85);
          const explLines = doc.splitTextToSize(lesson.didacticExplanation, contentWidth);
          doc.text(explLines, marginX, y);
          y += explLines.length * 0.18 + 0.25;
        }

        // Imagem da Aula do Replicate (se houver gerada)
        const lessonImage = (lesson.images || []).find(img => Boolean(img.imageDataUrl || img.imageUrl));
        if (lessonImage && lessonImage.imageDataUrl) {
          if (y > 6.0) {
            addPage(`${plan.courseTitle} • Aula ${lesson.lessonNumber}`);
          }

          try {
            const imgWidth = 4.2;
            const imgHeight = 3.15; // Proporção 4:3 / 3:4 aproximada
            const imgX = marginX + (contentWidth - imgWidth) / 2;

            doc.addImage(lessonImage.imageDataUrl, 'PNG', imgX, y, imgWidth, imgHeight, undefined, 'FAST');
            
            // Legenda técnica da imagem
            doc.setFont('helvetica', 'italic').setFontSize(8.5).setTextColor(100, 116, 139);
            const caption = `Figura ${mod.moduleNumber}.${lesson.lessonNumber} — ${lessonImage.title || 'Procedimento técnico da etapa prática'}`;
            doc.text(caption, pageWidth / 2, y + imgHeight + 0.18, { align: 'center' });
            
            y += imgHeight + 0.35;
          } catch (e) {
            console.warn('[CoursePdfExporter] Erro ao renderizar imagem da aula:', e);
          }
        }

        // Passo a Passo Instrucional
        if (lesson.stepByStepInstructions && lesson.stepByStepInstructions.length > 0) {
          if (y > 7.5) {
            addPage(`${plan.courseTitle} • Aula ${lesson.lessonNumber}`);
          }

          doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42);
          doc.text('Instruções Passo a Passo:', marginX, y);
          y += 0.22;

          lesson.stepByStepInstructions.forEach((step) => {
            if (y > 9.2) {
              addPage(`${plan.courseTitle} • Aula ${lesson.lessonNumber}`);
            }

            // Indicador de Passo
            doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(15, 23, 42);
            doc.text(`[Passo ${step.stepNumber}] ${step.title}`, marginX + 0.15, y);
            y += 0.18;

            doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(51, 65, 85);
            const instLines = doc.splitTextToSize(step.instruction, contentWidth - 0.3);
            doc.text(instLines, marginX + 0.15, y);
            y += instLines.length * 0.16 + 0.08;

            if (step.technicalNote) {
              doc.setFont('helvetica', 'italic').setFontSize(8.5).setTextColor(2, 132, 199);
              doc.text(`Nota técnica: ${step.technicalNote}`, marginX + 0.3, y);
              y += 0.15;
            }

            if (step.safetyCaution) {
              doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(220, 38, 38);
              doc.text(`Atenção de segurança: ${step.safetyCaution}`, marginX + 0.3, y);
              y += 0.16;
            }
            y += 0.08;
          });
        }

        // Caixa de Dicas Práticas e Erros Comuns
        if ((lesson.practicalTips && lesson.practicalTips.length > 0) || (lesson.commonMistakes && lesson.commonMistakes.length > 0)) {
          if (y > 8.0) {
            addPage(`${plan.courseTitle} • Aula ${lesson.lessonNumber}`);
          }

          const boxHeight = 1.35;
          doc.setFillColor(254, 243, 199); // Âmbar claro
          doc.setDrawColor(245, 158, 11);
          doc.roundedRect(marginX, y, contentWidth, boxHeight, 0.06, 0.06, 'FD');

          doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(180, 83, 9);
          doc.text('DICA PRÁTICA E PREVENÇÃO DE ERROS', marginX + 0.2, y + 0.22);

          doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(69, 26, 3);
          const tip = lesson.practicalTips?.[0] || 'Execute a medição com calma antes do corte definitivo.';
          const mistake = lesson.commonMistakes?.[0] || 'Evite pressa no acabamento para não danificar o material.';
          
          const tipLines = doc.splitTextToSize(`• Dica: ${tip}`, contentWidth - 0.4);
          doc.text(tipLines, marginX + 0.2, y + 0.45);

          const misLines = doc.splitTextToSize(`• Erro a evitar: ${mistake}`, contentWidth - 0.4);
          doc.text(misLines, marginX + 0.2, y + 0.85);

          y += boxHeight + 0.25;
        }

        // Exercício Prático da Aula
        if (lesson.exercise && lesson.exercise.description) {
          if (y > 8.2) {
            addPage(`${plan.courseTitle} • Aula ${lesson.lessonNumber}`);
          }

          const exBoxHeight = 1.25;
          doc.setFillColor(240, 253, 244); // Verde claro
          doc.setDrawColor(34, 197, 94);
          doc.roundedRect(marginX, y, contentWidth, exBoxHeight, 0.06, 0.06, 'FD');

          doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(22, 101, 52);
          doc.text(`ATIVIDADE PRÁTICA: ${lesson.exercise.title || 'Exercício de Aplicação'}`, marginX + 0.2, y + 0.25);

          doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(20, 83, 45);
          const exDescLines = doc.splitTextToSize(lesson.exercise.description, contentWidth - 0.4);
          doc.text(exDescLines, marginX + 0.2, y + 0.5);

          if (lesson.exercise.expectedOutcome) {
            doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(22, 101, 52);
            doc.text(`Resultado esperado: ${lesson.exercise.expectedOutcome}`, marginX + 0.2, y + 1.05);
          }

          y += exBoxHeight + 0.3;
        }

        y += 0.25;
      });
    });

    // -------------------------------------------------------------
    // PÁGINA FINAL: CHECKLISTS, GLOSSÁRIO E CONCLUSÃO
    // -------------------------------------------------------------
    addPage(`${plan.courseTitle} • Conclusão e Checklists`);

    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(15, 23, 42);
    doc.text('Checklist Operacional e Finalização', marginX, y);
    y += 0.35;

    // Checklists
    const checklists = plan.checklists || [];
    if (checklists.length > 0) {
      checklists.forEach((chk) => {
        doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(30, 41, 59);
        doc.text(chk.title, marginX, y);
        y += 0.2;

        (chk.items || []).forEach((item) => {
          doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(51, 65, 85);
          doc.text(`[   ]  ${item}`, marginX + 0.15, y);
          y += 0.18;
        });
        y += 0.15;
      });
    }

    // Glossário
    const glossary = plan.glossary || [];
    if (glossary.length > 0) {
      y += 0.2;
      doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42);
      doc.text('Glossário Técnico', marginX, y);
      y += 0.22;

      glossary.slice(0, 5).forEach((item) => {
        doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(30, 41, 59);
        doc.text(`${item.term}: `, marginX + 0.15, y);
        const termWidth = doc.getTextWidth(`${item.term}: `);
        doc.setFont('helvetica', 'normal').setTextColor(71, 85, 105);
        const defLines = doc.splitTextToSize(item.definition, contentWidth - termWidth - 0.3);
        doc.text(defLines, marginX + 0.15 + termWidth, y);
        y += defLines.length * 0.16 + 0.08;
      });
    }

    // Conclusão
    y += 0.25;
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(15, 23, 42);
    doc.text('Mensagem de Conclusão e Próximos Passos', marginX, y);
    y += 0.22;

    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(51, 65, 85);
    const concLines = doc.splitTextToSize(plan.conclusion || 'Parabéns pela conclusão deste curso prático!', contentWidth);
    doc.text(concLines, marginX, y);

    return doc.output('arraybuffer') as unknown as Uint8Array;
  }

  /**
   * Renderiza uma capa padrão de alta elegância quando não há imagem Replicate
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

    // Moldura e detalhes dourados sutis
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.02);
    doc.rect(0.5, 0.5, pageWidth - 1.0, pageHeight - 1.0, 'S');

    // Badge de Curso Profissional
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(1.0, 1.2, 2.5, 0.35, 0.05, 0.05, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(15, 23, 42);
    doc.text('CURSO PROFISSIONALIZANTE', 1.15, 1.42);

    // Título Principal
    doc.setFont('helvetica', 'bold').setFontSize(30).setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(plan.courseTitle, pageWidth - 2.0);
    doc.text(titleLines, 1.0, 2.5);

    // Subtítulo
    const subY = 2.5 + titleLines.length * 0.5 + 0.2;
    doc.setFont('helvetica', 'normal').setFontSize(14).setTextColor(203, 213, 225);
    const subLines = doc.splitTextToSize(plan.courseSubtitle || 'Manual Didático com Ilustrações Passo a Passo', pageWidth - 2.0);
    doc.text(subLines, 1.0, subY);

    // Divisor
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.03);
    doc.line(1.0, subY + 0.6, 3.5, subY + 0.6);

    // Categoria e Nível
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(245, 158, 11);
    doc.text(`Área: ${plan.themeCategory}`, 1.0, 8.5);
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(148, 163, 184);
    doc.text(`Nível: ${plan.difficultyLevel.toUpperCase()} • Didática Ilustrada com IA`, 1.0, 8.8);

    // Autor
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(255, 255, 255);
    doc.text(author, 1.0, 9.6);
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
