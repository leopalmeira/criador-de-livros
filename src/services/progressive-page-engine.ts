import { 
  BookProject, 
  BookVisualPage, 
  PageElement, 
  PageElementType, 
  VisualPageType,
  BookPageContext,
  IBookChapter
} from '../types/book-project';
import { EditorialContextService } from './editorial-context-service';
import { AiService } from './ai-service';
import { EditorialArtService } from './editorial-art-service';

export class ProgressivePageEngine {
  /**
   * Constrói a estrutura editorial e paginação real do livro a partir dos capítulos (Seções 5, 8 e 17)
   * Cada página possui seu próprio título e objetivo pré-definidos como restrição editorial.
   */
  public static initializeBookSkeleton(project: BookProject): BookVisualPage[] {
    const existing = project.visualPages || [];
    // Se já existirem páginas completas com conteúdo real, preserva
    if (existing.length > 6 && existing.some(p => p.rawText && p.rawText.length > 100)) {
      return existing;
    }

    const pages: BookVisualPage[] = [];
    let pageNum = 1;
    const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // PÁGINA 1: MEIO-ROSTO
    pages.push({
      id: createId('p_halftitle'),
      pageNumber: pageNum++,
      type: 'half-title',
      title: project.title,
      goal: 'Apresentação nobre do título da obra',
      status: 'approved',
      elements: [
        {
          id: createId('elem'),
          type: 'heading',
          content: project.title || 'Título da Obra',
          alignment: 'center'
        }
      ],
      rawText: project.title
    });

    // PÁGINA 2: VERSO EM BRANCO
    pages.push({
      id: createId('p_blank'),
      pageNumber: pageNum++,
      type: 'blank',
      title: 'Verso em Branco',
      goal: 'Página em branco regulamentar de transição',
      status: 'approved',
      elements: []
    });

    // PÁGINA 3: FOLHA DE ROSTO
    pages.push({
      id: createId('p_title'),
      pageNumber: pageNum++,
      type: 'title-page',
      title: 'Folha de Rosto Oficial',
      goal: 'Apresentação formal da autoria e subtítulo comercial',
      status: 'approved',
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
      ],
      rawText: `${project.title}\n${project.subtitle || ''}\nPor ${project.author || 'Autor'}`
    });

    // PÁGINA 4: COPYRIGHT & FICHA CATALOGRÁFICA
    const year = new Date().getFullYear();
    const copyrightText = project.editorialElements?.copyrightNotice || 
      `© ${year} ${project.author || 'Autor da Obra'}. Todos os direitos reservados.\nPublicação independente Amazon Kindle Direct Publishing (KDP).\nProibida a reprodução sem autorização expressa dos detentores dos direitos.`;

    pages.push({
      id: createId('p_copyright'),
      pageNumber: pageNum++,
      type: 'copyright',
      title: 'Direitos Autorais e Ficha Catalográfica',
      goal: 'Proteção legal, registro autoral e metadados KDP',
      status: 'approved',
      elements: [
        {
          id: createId('elem'),
          type: 'paragraph',
          content: copyrightText,
          alignment: 'left'
        }
      ],
      rawText: copyrightText
    });

    // PÁGINA 5: DEDICATÓRIA OU EPÍGRAFE
    const dedication = project.editorialElements?.dedication || project.editorialElements?.epigraph || 
      'Dedicado a todos os leitores que buscam transformação real e clareza de propósito.';

    pages.push({
      id: createId('p_dedication'),
      pageNumber: pageNum++,
      type: 'dedication',
      title: 'Dedicatória & Epígrafe',
      goal: 'Conexão afetiva e posicionamento inspirador da obra',
      status: 'approved',
      elements: [
        {
          id: createId('elem'),
          type: 'quote',
          content: dedication,
          alignment: 'center'
        }
      ],
      rawText: dedication
    });

    // PÁGINA 6: VERSO EM BRANCO
    pages.push({
      id: createId('p_blank_ded'),
      pageNumber: pageNum++,
      type: 'blank',
      title: 'Verso em Branco',
      goal: 'Transição harmônica para o Sumário',
      status: 'approved',
      elements: []
    });

    // PÁGINA 7: SUMÁRIO ESTRUTURAL (TOC)
    const chapters = project.kdpChapters || [];
    pages.push({
      id: createId('p_toc'),
      pageNumber: pageNum++,
      type: 'toc',
      title: 'Sumário Geral da Obra',
      goal: 'Mapeamento estrutural da jornada de leitura',
      status: 'approved',
      elements: [
        {
          id: createId('elem'),
          type: 'heading',
          content: 'Sumário',
          alignment: 'center'
        },
        ...chapters.map((ch, idx) => ({
          id: createId('elem_toc'),
          type: 'paragraph' as PageElementType,
          content: `Capítulo ${ch.index || idx + 1}: ${(ch.title || `Capítulo ${idx + 1}`).replace(/^capítulo\s*\d+[:\s-]*/i, '')}`,
          alignment: 'left' as const
        }))
      ],
      rawText: chapters.map((ch, idx) => `Capítulo ${ch.index || idx + 1}: ${ch.title}`).join('\n')
    });

    // Garante que o conteúdo comece em página ímpar (direita)
    if (pageNum % 2 === 0) {
      pages.push({
        id: createId('p_blank_toc'),
        pageNumber: pageNum++,
        type: 'blank',
        title: 'Verso em Branco',
        goal: 'Alinhamento editorial em página ímpar',
        status: 'approved',
        elements: []
      });
    }

    // PÁGINAS DOS CAPÍTULOS (Planejadas progressivamente para escrita e diagramação)
    chapters.forEach((chapter, chIdx) => {
      const chNum = chapter.index || chIdx + 1;
      const chTitle = (chapter.title || `Capítulo ${chNum}`).replace(/^capítulo\s*\d+[:\s-]*/i, '').trim();

      // Página 1 do Capítulo: Abertura
      const openerId = createId(`p_ch_${chNum}_opener`);
      const hasExistingProse = chapter.prose && chapter.prose.length > 200;

      const openerPage: BookVisualPage = {
        id: openerId,
        pageNumber: pageNum++,
        chapterIndex: chNum,
        type: 'chapter-opener',
        title: `Abertura: ${chTitle}`,
        goal: `Introduzir o tema central do Capítulo ${chNum} com gancho narrativo e clareza conceitual.`,
        headerText: '',
        footerText: `${pageNum - 1}`,
        status: hasExistingProse ? 'approved' : 'pending',
        elements: [
          {
            id: createId('elem_ch_num'),
            type: 'chapter-title',
            content: `CAPÍTULO ${chNum}`,
            alignment: 'center'
          },
          {
            id: createId('elem_ch_title'),
            type: 'heading',
            content: chTitle,
            alignment: 'center'
          }
        ]
      };

      if (hasExistingProse && chapter.prose) {
        const paras = chapter.prose.split(/\n\s*\n/).filter(Boolean);
        const firstFew = paras.slice(0, 3);
        firstFew.forEach(p => {
          openerPage.elements.push({
            id: createId('elem_p'),
            type: 'paragraph',
            content: p,
            alignment: 'justify'
          });
        });
        openerPage.rawText = firstFew.join('\n\n');
      }

      pages.push(openerPage);

      // Seções e desdobramentos planejados para este capítulo (3 a 5 páginas por capítulo)
      const rawSections = ((chapter as any).sections as any[]) || [];
      const sectionTitles: string[] = rawSections.length > 0 
        ? rawSections.map((s: any) => typeof s === 'string' ? s : (s.title || 'Seção'))
        : [
          `Fundamentação e Diagnóstico: ${chTitle}`,
          `Estratégia Prática e Passo a Passo`,
          `Estudos de Caso e Aplicação no Mundo Real`,
          `Síntese e Exercício Prático de Ação`
        ];

      sectionTitles.forEach((secTitle: string, secIdx: number) => {
        const pageId = createId(`p_ch_${chNum}_sec_${secIdx + 1}`);
        pages.push({
          id: pageId,
          pageNumber: pageNum++,
          chapterIndex: chNum,
          type: 'body',
          title: secTitle,
          goal: `Desenvolver com profundidade e rigor editorial o tópico "${secTitle}".`,
          sectionTitle: secTitle,
          headerText: `${chTitle.toUpperCase()}`,
          footerText: `${pageNum - 1}`,
          status: 'pending',
          elements: [
            {
              id: createId('elem_heading'),
              type: 'heading',
              content: secTitle,
              alignment: 'left'
            }
          ]
        });
      });
    });

    return pages;
  }

  /**
   * Executa a geração progressiva de uma página específica com IA (Seções 5, 8, 9, 10, 14, 15 e 16)
   */
  public static async generatePageProgressively(
    project: BookProject,
    targetPageIndex: number,
    aiService: AiService
  ): Promise<{ updatedProject: BookProject; generatedPage: BookVisualPage }> {
    const pages = [...(project.visualPages || this.initializeBookSkeleton(project))];
    const targetPage = pages[targetPageIndex];

    if (!targetPage) {
      throw new Error(`Página índice ${targetPageIndex} não encontrada no projeto.`);
    }

    // Identifica a página anterior válida com conteúdo
    const previousPage = targetPageIndex > 0 ? pages[targetPageIndex - 1] : undefined;

    // 1. Constrói o prompt com rigor contextual
    const { systemPrompt, userPrompt } = EditorialContextService.buildProgressivePagePrompt(
      project,
      targetPage,
      previousPage,
      pages
    );

    // 2. Chama a IA via modelo econômico oficial
    let rawResponse = '';
    try {
      rawResponse = await aiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        temperature: 0.65,
        maxTokens: 1200
      });
    } catch (err: any) {
      console.warn('[ProgressivePageEngine] Erro na API de IA:', err.message);
    }

    if (!rawResponse || rawResponse.length < 100 || rawResponse.includes('motor local autônomo')) {
      rawResponse = this.generateFallbackEditorialProse(project, targetPage, previousPage);
    }

    // 3. Validação Editorial Automática (Seção 14)
    const validation = EditorialContextService.validatePageContent(
      project,
      targetPage,
      rawResponse,
      previousPage
    );

    const finalText = validation.cleanedContent;

    // 4. Diagramação Real da Página (Seções 10, 15 e 16)
    const elements: PageElement[] = [];
    const createId = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    if (targetPage.type === 'chapter-opener') {
      const chNum = targetPage.chapterIndex || 1;
      const chapter = (project.kdpChapters || []).find(c => c.index === chNum);
      const chTitle = (chapter?.title || targetPage.title || `Capítulo ${chNum}`)
        .replace(/^capítulo\s*\d+[:\s-]*/i, '')
        .trim();

      elements.push({
        id: createId('elem_chnum'),
        type: 'chapter-title',
        content: `CAPÍTULO ${chNum}`,
        alignment: 'center'
      });

      elements.push({
        id: createId('elem_chtitle'),
        type: 'heading',
        content: chTitle,
        alignment: 'center'
      });
    } else if (targetPage.title) {
      elements.push({
        id: createId('elem_sectitle'),
        type: 'heading',
        content: targetPage.title,
        alignment: 'left'
      });
    }

    // Divide o texto em parágrafos diagramados com recuo editorial
    const paragraphs = finalText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    paragraphs.forEach((pText) => {
      elements.push({
        id: createId('elem_p'),
        type: 'paragraph',
        content: pText.trim(),
        alignment: 'justify'
      });
    });

    // 5. Atualização da Memória Estruturada da Página (Seção 12)
    const pageContext: BookPageContext = EditorialContextService.extractPageStructuredMemory(
      targetPage.pageNumber,
      targetPage.title || `Página ${targetPage.pageNumber}`,
      targetPage.goal || 'Desenvolvimento do conteúdo do capítulo',
      finalText,
      `Capítulo ${targetPage.chapterIndex || 1}`,
      targetPage.sectionTitle
    );

    // 6. Atualização da Página e do Projeto
    const updatedPage: BookVisualPage = {
      ...targetPage,
      elements,
      rawText: finalText,
      status: 'approved',
      pageContext
    };

    pages[targetPageIndex] = updatedPage;

    // Atualiza a lista de contextos de páginas no projeto
    const pageContexts = {
      ...(project.pageContexts || {}),
      [targetPage.pageNumber]: pageContext
    };

    const updatedProject: BookProject = {
      ...project,
      visualPages: pages,
      pageContexts,
      lastGeneratedPage: targetPage.pageNumber,
      updatedAt: Date.now()
    };

    return { updatedProject, generatedPage: updatedPage };
  }

  /**
   * Regenera exclusivamente uma única página mantendo o contexto (Seção 21)
   */
  public static async regenerateSinglePage(
    project: BookProject,
    targetPageIndex: number,
    aiService: AiService
  ): Promise<{ updatedProject: BookProject; generatedPage: BookVisualPage }> {
    return this.generatePageProgressively(project, targetPageIndex, aiService);
  }

  /**
   * Gera prosa editorial sólida em caso de contingência de rede
   */
  private static generateFallbackEditorialProse(
    project: BookProject,
    page: BookVisualPage,
    previousPage?: BookVisualPage
  ): string {
    const title = page.title || 'Fundamentação Prática';
    const bookTitle = project.title || 'Livro Comercial';

    return `Ao analisarmos com atenção o tema "${title}", percebemos que o verdadeiro diferencial em ${bookTitle} reside na capacidade de transformar conceitos teóricos em atitudes práticas no dia a dia. Não se trata apenas de absorver informações, mas de internalizar princípios sólidos que sustentem decisões consistentes ao longo do tempo.

Quando observamos profissionais e leitores de alto rendimento, uma característica comum se destaca: a recusa sistemática em se contentar com soluções rasas ou atalhos passageiros. Em contrapartida, cada etapa é executada com intencionalidade, atenção aos detalhes e respeito aos fundamentos que verdadeiramente geram impacto duradouro.

À medida que avançamos nesta reflexão, fica evidente que o próximo passo exige não apenas compreensão intelectual, mas a aplicação rigorosa das estratégias aqui delineadas. Na sequência prática desta obra, examinaremos exatamente como operacionalizar essas diretrizes no mundo real.`;
  }
}
