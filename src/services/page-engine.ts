import { 
  BookProject, 
  BookVisualPage, 
  PageElement, 
  PageElementType, 
  VisualPageType,
  PageLayoutSettings,
  TypographySettings,
  TRIM_SIZE_METRICS,
  calculateKdpBindingMargin,
  BookImageItem
} from '../types/book-project';
import { LocalAiEngine } from './local-ai-engine';
import { ImageGenerationService } from './image-generation-service';

export const DEFAULT_PAGE_SETTINGS: PageLayoutSettings = {
  trimSize: '6x9',
  margins: {
    top: 0.75,
    bottom: 0.75,
    inside: 0.75,
    outside: 0.50
  },
  autoKdpBindingMargin: true,
  bleedInches: 0.125,
  hasRunningHeaders: true,
  hasPageNumbers: true,
  startNumberingAt: 9
};

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  fontFamily: 'Georgia, serif',
  fontSizePt: 11,
  lineHeight: 1.55,
  paragraphSpacingPt: 6,
  letterSpacingPt: 0,
  textAlign: 'justify',
  headingFont: 'Cinzel, Georgia, serif',
  bodyFont: 'Georgia, serif',
  captionFont: 'Inter, sans-serif',
  quoteFont: 'Georgia, italic',
  dropCap: true
};

export class PageEngine {
  /**
   * Garante que as configurações de layout e tipografia existam no projeto
   */
  public static ensureProjectSettings(project: BookProject): BookProject {
    const updated = { ...project };
    if (!updated.pageSettings) {
      const binding = calculateKdpBindingMargin(updated.estimatedPages || 150);
      updated.pageSettings = {
        ...DEFAULT_PAGE_SETTINGS,
        trimSize: updated.trimSize || '6x9',
        margins: {
          ...DEFAULT_PAGE_SETTINGS.margins,
          inside: binding
        }
      };
    } else if (updated.pageSettings.autoKdpBindingMargin) {
      const binding = calculateKdpBindingMargin(updated.actualPages || updated.estimatedPages || 150);
      updated.pageSettings.margins.inside = binding;
    }

    if (!updated.typography) {
      updated.typography = { ...DEFAULT_TYPOGRAPHY };
    }

    return updated;
  }

  /**
   * Converte a estrutura de capítulos e elementos editoriais em páginas visuais completas
   */
  public static generateVisualPagesFromManuscript(project: BookProject): BookVisualPage[] {
    const pages: BookVisualPage[] = [];
    let pageNum = 1;

    const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // PÁGINA 1: MEIO-ROSTO
    pages.push({
      id: createId('p_halftitle'),
      pageNumber: pageNum++,
      type: 'half-title',
      elements: [
        {
          id: createId('elem'),
          type: 'heading',
          content: project.title || 'Título da Obra',
          alignment: 'center'
        }
      ]
    });

    // PÁGINA 2: EM BRANCO (verso do meio-rosto)
    pages.push({
      id: createId('p_blank'),
      pageNumber: pageNum++,
      type: 'blank',
      elements: []
    });

    // PÁGINA 3: FOLHA DE ROSTO
    pages.push({
      id: createId('p_title'),
      pageNumber: pageNum++,
      type: 'title-page',
      elements: [
        {
          id: createId('elem'),
          type: 'heading',
          content: project.title || 'Título da Obra',
          alignment: 'center'
        },
        ...(project.subtitle ? [{
          id: createId('elem'),
          type: 'subheading' as PageElementType,
          content: project.subtitle,
          alignment: 'center' as const
        }] : []),
        {
          id: createId('elem'),
          type: 'paragraph',
          content: `Por ${project.author || 'Autor'}`,
          alignment: 'center'
        }
      ]
    });

    // PÁGINA 4: COPYRIGHT & CRÉDITOS
    const year = new Date().getFullYear();
    const copyrightText = project.editorialElements?.copyrightNotice || 
      `© ${year} ${project.author || 'Autor'}. Todos os direitos reservados.\nPublicação independente Amazon Kindle Direct Publishing (KDP).\nNenhuma parte desta publicação pode ser reproduzida sem autorização expressa.`;

    pages.push({
      id: createId('p_copyright'),
      pageNumber: pageNum++,
      type: 'copyright',
      elements: [
        {
          id: createId('elem'),
          type: 'paragraph',
          content: copyrightText,
          alignment: 'left'
        }
      ]
    });

    // PÁGINA 5: DEDICATÓRIA / EPÍGRAFE (se houver)
    if (project.editorialElements?.dedication || project.editorialElements?.epigraph) {
      pages.push({
        id: createId('p_dedication'),
        pageNumber: pageNum++,
        type: 'dedication',
        elements: [
          {
            id: createId('elem'),
            type: 'quote',
            content: project.editorialElements.dedication || project.editorialElements.epigraph || '',
            alignment: 'center'
          }
        ]
      });

      pages.push({
        id: createId('p_blank'),
        pageNumber: pageNum++,
        type: 'blank',
        elements: []
      });
    }

    // PÁGINA: SUMÁRIO
    const chapters = project.kdpChapters || [];
    pages.push({
      id: createId('p_toc'),
      pageNumber: pageNum++,
      type: 'toc',
      elements: [
        {
          id: createId('elem'),
          type: 'heading',
          content: 'Sumário',
          alignment: 'center'
        },
        ...chapters.map((ch, idx) => ({
          id: createId('elem'),
          type: 'paragraph' as PageElementType,
          content: `Capítulo ${ch.index || idx + 1}: ${ch.title}`,
          alignment: 'left' as const
        }))
      ]
    });

    // Página par em branco se o sumário terminar em ímpar
    if (pageNum % 2 !== 0) {
      pages.push({
        id: createId('p_blank'),
        pageNumber: pageNum++,
        type: 'blank',
        elements: []
      });
    }

    // INTRODUÇÃO (se houver)
    if (project.editorialElements?.introduction) {
      const introParas = project.editorialElements.introduction.split(/\n\s*\n/).filter(Boolean);
      pages.push({
        id: createId('p_intro'),
        pageNumber: pageNum++,
        type: 'preface',
        headerText: project.title,
        footerText: `${pageNum - 1}`,
        elements: [
          {
            id: createId('elem'),
            type: 'heading',
            content: 'Introdução',
            alignment: 'center'
          },
          ...introParas.slice(0, 3).map(p => ({
            id: createId('elem'),
            type: 'paragraph' as PageElementType,
            content: p,
            alignment: 'justify' as const
          }))
        ]
      });

      // Se a introdução for longa, cria páginas adicionais
      if (introParas.length > 3) {
        for (let i = 3; i < introParas.length; i += 3) {
          pages.push({
            id: createId('p_intro_cont'),
            pageNumber: pageNum++,
            type: 'body',
            headerText: 'Introdução',
            footerText: `${pageNum - 1}`,
            elements: introParas.slice(i, i + 3).map(p => ({
              id: createId('elem'),
              type: 'paragraph' as PageElementType,
              content: p,
              alignment: 'justify' as const
            }))
          });
        }
      }

      if (pageNum % 2 !== 0) {
        pages.push({
          id: createId('p_blank'),
          pageNumber: pageNum++,
          type: 'blank',
          elements: []
        });
      }
    }

    // CAPÍTULOS
    chapters.forEach((chapter, chIdx) => {
      // Abre capítulo sempre na direita (página ímpar)
      if (pageNum % 2 === 0) {
        pages.push({
          id: createId('p_blank'),
          pageNumber: pageNum++,
          type: 'blank',
          elements: []
        });
      }

      const chNumber = chapter.index || chIdx + 1;
      const rawTitle = (chapter.title || '').trim();
      const cleanTitle = rawTitle.replace(new RegExp(`^cap[íi]tulo\\s*${chNumber}[\\s:\\-–—]*`, 'i'), '').trim() || rawTitle || `Capítulo ${chNumber}`;

      // 1. GARANTE QUE O CAPÍTULO TENHA TEXTO DENSO E PROFUNDO (AUTO-REDAÇÃO CASO ESTEJA VAZIO)
      let prose = chapter.prose?.trim() || '';
      if (!prose || prose.length < 120) {
        const fallbackConcept = project.kdpConcept || {
          title: project.title,
          subtitle: project.subtitle || '',
          hook: project.topic || project.title,
          audience: project.targetAudience || 'Leitores em busca de transformação e conhecimento prático',
          readingLevel: 'Intermediário',
          tone: 'Inspirador, didático e prático',
          promise: project.description || `Guia definitivo sobre ${project.title}`,
          differentiator: 'Metodologia acionável passo a passo com profundidade e rigor editorial',
          shortSynopsis: project.description || project.title,
          longSynopsis: project.description || project.title,
          targetWordCount: 25000,
          targetChapterCount: chapters.length,
          targetPages: project.estimatedPages || 160,
          trimSize: project.trimSize || '6x9',
          paperType: project.paperType || 'bw-white',
          comparableTitles: [],
          themes: [project.topic || project.title],
          titleOptions: []
        };
        const fallbackBible = project.kdpBible || {
          characters: [],
          locations: [],
          styleGuide: { artStyle: '', palette: [], tone: '' }
        };
        const written = LocalAiEngine.writeChapter(
          fallbackConcept,
          fallbackBible,
          chapter,
          project.kdpBookType || 'self-help'
        );
        chapter.prose = written.prose;
        chapter.wordCount = written.wordCount;
        prose = written.prose;
      }

      // 2. PARSE DOS BLOCOS DE PARÁGRAFO
      const rawBlocks = prose.split(/\n\s*\n/).filter(Boolean);
      const filteredBlocks = rawBlocks.filter(p => {
        const trimmed = p.trim().replace(/^#+\s*/, '');
        if (new RegExp(`^cap[íi]tulo\\s*${chNumber}`, 'i').test(trimmed)) return false;
        if (trimmed.toLowerCase() === rawTitle.toLowerCase()) return false;
        if (trimmed.toLowerCase() === cleanTitle.toLowerCase()) return false;
        if (trimmed.toLowerCase() === 'título do capítulo' || trimmed.toLowerCase() === 'subtítulo da seção') return false;
        return true;
      });

      // 3. GARANTE ILUSTRAÇÃO CONTEXTUAL REALISTA PARA O CAPÍTULO
      let chapterImg = (project.images || []).find(img => img.chapterIndex === chNumber);
      if (!chapterImg) {
        const chSeed = 1000 + chNumber * 73;
        const prompt = ImageGenerationService.buildChapterPrompt(chapter, project, 'realistic-photo', chSeed);
        const dataUrl = ImageGenerationService.getPollinationsUrl(prompt, 1024, 768, chSeed);
        chapterImg = {
          id: `img_ch_${chNumber}_${chSeed}`,
          name: `Ilustração do Capítulo ${chNumber}: ${cleanTitle}`,
          dataUrl,
          source: 'ai-generated',
          prompt,
          chapterIndex: chNumber,
          createdAt: Date.now()
        };
        if (!project.images) project.images = [];
        project.images.push(chapterImg);
      }

      // 4. PÁGINA 1: ABERTURA DO CAPÍTULO (Harmonia editorial: Título no topo + 1 parágrafo com respiro)
      let openerCount = 1;
      if (filteredBlocks.length > 1 && filteredBlocks[0].trim().startsWith('#')) {
        openerCount = 2; // Subtítulo da primeira seção + primeiro parágrafo
      }
      const openerBlocks = filteredBlocks.slice(0, openerCount);
      const openerElements: PageElement[] = [
        {
          id: createId('elem_ch_num'),
          type: 'chapter-title',
          content: `CAPÍTULO ${chNumber}`,
          alignment: 'center'
        },
        {
          id: createId('elem_ch_heading'),
          type: 'heading',
          content: cleanTitle,
          alignment: 'center'
        }
      ];

      openerBlocks.forEach(block => {
        const isHeader = block.trim().startsWith('###') || block.trim().startsWith('##');
        openerElements.push({
          id: createId(isHeader ? 'elem_h' : 'elem_p'),
          type: isHeader ? 'heading' : 'paragraph',
          content: block.replace(/^#+\s*/, '').trim(),
          alignment: isHeader ? 'left' : 'justify'
        });
      });

      pages.push({
        id: createId(`p_ch_${chNumber}_opener`),
        pageNumber: pageNum++,
        chapterIndex: chNumber,
        type: 'chapter-opener',
        headerText: '',
        footerText: `${pageNum - 1}`,
        elements: openerElements
      });

      // 5. PÁGINAS SUBSEQUENTES (PÁGINA 2 COM ILUSTRAÇÃO NO MEIO E DEMAIS COM TEXTO BALANCEADO)
      const remainingBlocks = filteredBlocks.slice(openerBlocks.length);
      let blockIdx = 0;
      let chapterSubPage = 1;

      while (blockIdx < remainingBlocks.length) {
        chapterSubPage++;
        const pageElements: PageElement[] = [];

        // Na página 2 do capítulo: coloca 1 parágrafo, DEPOIS A ILUSTRAÇÃO NO MEIO, DEPOIS MAIS TEXTO!
        if (chapterSubPage === 2 && chapterImg?.dataUrl) {
          if (blockIdx < remainingBlocks.length) {
            const firstBlock = remainingBlocks[blockIdx++];
            const isHeader = firstBlock.trim().startsWith('###') || firstBlock.trim().startsWith('##');
            pageElements.push({
              id: createId('elem'),
              type: isHeader ? 'heading' : 'paragraph',
              content: firstBlock.replace(/^#+\s*/, '').trim(),
              alignment: isHeader ? 'left' : 'justify'
            });
          }

          // A ILUSTRAÇÃO NO MEIO DO TEXTO COM LEGENDA CONTEXTUAL!
          pageElements.push({
            id: createId('elem_img'),
            type: 'image',
            content: '',
            imageUrl: chapterImg.dataUrl,
            caption: `Cena: Representação visual dos conceitos do Capítulo ${chNumber}`,
            alignment: 'center'
          });

          if (blockIdx < remainingBlocks.length) {
            const nextBlock = remainingBlocks[blockIdx++];
            const isHeader = nextBlock.trim().startsWith('###') || nextBlock.trim().startsWith('##');
            pageElements.push({
              id: createId('elem'),
              type: isHeader ? 'heading' : 'paragraph',
              content: nextBlock.replace(/^#+\s*/, '').trim(),
              alignment: isHeader ? 'left' : 'justify'
            });
          }
        } else {
          // Páginas normais de texto contínuo: 2 a 3 blocos acumulando até ~1.600 caracteres para preenchimento ideal
          let charsAccumulated = 0;
          while (blockIdx < remainingBlocks.length && pageElements.length < 3) {
            const currentBlock = remainingBlocks[blockIdx];
            if (pageElements.length >= 1 && charsAccumulated + currentBlock.length > 1700) {
              break; // Passa para a próxima folha para não vazar a margem inferior
            }
            blockIdx++;
            charsAccumulated += currentBlock.length;
            const isHeader = currentBlock.trim().startsWith('###') || currentBlock.trim().startsWith('##');
            const isQuote = currentBlock.trim().startsWith('>') || currentBlock.trim().startsWith('"');
            pageElements.push({
              id: createId('elem'),
              type: isHeader ? 'heading' : isQuote ? 'quote' : 'paragraph',
              content: currentBlock.replace(/^#+\s*/, '').replace(/^>\s*/, '').trim(),
              alignment: isHeader ? 'left' : isQuote ? 'center' : 'justify'
            });
          }
        }

        pages.push({
          id: createId(`p_ch_${chNumber}_p${chapterSubPage}`),
          pageNumber: pageNum++,
          chapterIndex: chNumber,
          type: 'body',
          headerText: `${cleanTitle}`,
          footerText: `${pageNum - 1}`,
          elements: pageElements
        });
      }
    });

    // CONCLUSÃO (se houver)
    if (project.editorialElements?.conclusion) {
      if (pageNum % 2 === 0) {
        pages.push({
          id: createId('p_blank'),
          pageNumber: pageNum++,
          type: 'blank',
          elements: []
        });
      }

      const concParas = project.editorialElements.conclusion.split(/\n\s*\n/).filter(Boolean);
      pages.push({
        id: createId('p_conclusion'),
        pageNumber: pageNum++,
        type: 'conclusion',
        headerText: project.title,
        footerText: `${pageNum - 1}`,
        elements: [
          {
            id: createId('elem'),
            type: 'heading',
            content: 'Conclusão',
            alignment: 'center'
          },
          ...concParas.map(p => ({
            id: createId('elem'),
            type: 'paragraph' as PageElementType,
            content: p,
            alignment: 'justify' as const
          }))
        ]
      });
    }

    return pages;
  }

  /**
   * Reorganiza a numeração de páginas em sequência
   */
  public static renumberPages(pages: BookVisualPage[]): BookVisualPage[] {
    return pages.map((p, idx) => ({
      ...p,
      pageNumber: idx + 1,
      footerText: p.type === 'blank' || p.type === 'half-title' || p.type === 'title-page' ? '' : `${idx + 1}`
    }));
  }

  /**
   * Move uma página para uma nova posição
   */
  public static movePage(pages: BookVisualPage[], fromIndex: number, toIndex: number): BookVisualPage[] {
    if (fromIndex < 0 || fromIndex >= pages.length || toIndex < 0 || toIndex >= pages.length) {
      return pages;
    }
    const newPages = [...pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);
    return this.renumberPages(newPages);
  }

  /**
   * Duplica uma página
   */
  public static duplicatePage(pages: BookVisualPage[], index: number): BookVisualPage[] {
    if (index < 0 || index >= pages.length) return pages;
    const target = pages[index];
    const copy: BookVisualPage = {
      ...target,
      id: `p_dup_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      elements: target.elements.map(e => ({
        ...e,
        id: `elem_dup_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
      }))
    };
    const newPages = [...pages];
    newPages.splice(index + 1, 0, copy);
    return this.renumberPages(newPages);
  }

  /**
   * Exclui uma página
   */
  public static deletePage(pages: BookVisualPage[], index: number): BookVisualPage[] {
    if (pages.length <= 1 || index < 0 || index >= pages.length) return pages;
    const newPages = pages.filter((_, idx) => idx !== index);
    return this.renumberPages(newPages);
  }

  /**
   * Adiciona uma nova página em branco ou após uma existente
   */
  public static addPage(pages: BookVisualPage[], afterIndex?: number, chapterIndex?: number): BookVisualPage[] {
    const newPage: BookVisualPage = {
      id: `p_new_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      pageNumber: (afterIndex !== undefined ? afterIndex + 2 : pages.length + 1),
      chapterIndex,
      type: 'body',
      elements: [
        {
          id: `elem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'paragraph',
          content: 'Digite o novo conteúdo da página aqui...',
          alignment: 'justify'
        }
      ]
    };

    const newPages = [...pages];
    if (afterIndex !== undefined && afterIndex >= 0 && afterIndex < pages.length) {
      newPages.splice(afterIndex + 1, 0, newPage);
    } else {
      newPages.push(newPage);
    }

    return this.renumberPages(newPages);
  }
}
