import { describe, it, expect } from 'vitest';
import { PageEngine } from '../src/services/page-engine';
import { EditorialHtmlBuilder } from '../src/services/formats/editorial-html';
import { calculateKdpBindingMargin, BookProject } from '../src/types/book-project';

describe('PageEngine & Diagramação Editorial KDP', () => {
  it('gera documento paginado, escapa conteúdo e usa dimensões e margens do projeto', () => {
    const project = {
      id: 'editorial-html',
      title: '<script>alert(1)</script>',
      subtitle: 'Subtítulo',
      author: 'Autora',
      language: 'Português',
      trimSize: '6x9',
      pageSettings: {
        trimSize: '6x9',
        margins: { top: 0.8, bottom: 0.8, inside: 0.9, outside: 0.5 },
        hasRunningHeaders: true,
        hasPageNumbers: true
      },
      kdpChapters: [{ index: 1, title: 'Capítulo 1', prose: 'Texto do capítulo.' }],
      images: []
    } as unknown as BookProject;

    const html = EditorialHtmlBuilder.build(project);

    expect(html).toContain('@page');
    expect(html).toContain('size: 6in 9in');
    expect(html).toContain('0.9in');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('break-before: right');
  });

  it('deve calcular a margem de encadernação KDP (Gutter) com base nas regras oficiais da Amazon', () => {
    // 24 a 150 págs -> 0.375 pol
    expect(calculateKdpBindingMargin(50)).toBe(0.375);
    expect(calculateKdpBindingMargin(150)).toBe(0.375);

    // 151 a 300 págs -> 0.500 pol
    expect(calculateKdpBindingMargin(180)).toBe(0.500);
    expect(calculateKdpBindingMargin(300)).toBe(0.500);

    // 301 a 500 págs -> 0.625 pol
    expect(calculateKdpBindingMargin(350)).toBe(0.625);

    // 501 a 700 págs -> 0.750 pol
    expect(calculateKdpBindingMargin(600)).toBe(0.750);

    // 701+ págs -> 0.875 pol
    expect(calculateKdpBindingMargin(750)).toBe(0.875);
  });

  it('deve gerar páginas visuais completas incluindo meio-rosto, folha de rosto, copyright, sumário e capítulos', () => {
    const mockProject: BookProject = {
      id: 'test_proj',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'ESCREVENDO',
      priority: 'ALTA',
      executionMode: 'assisted',
      title: 'O Mistério da Montanha',
      subtitle: 'Uma jornada investigativa',
      author: 'Carlos Drummond',
      description: 'Livro de suspense e aventura.',
      language: 'Português',
      format: 'Capa Comum',
      trimSize: '6x9',
      paperType: 'bw-cream',
      estimatedPages: 160,
      targetPrice: 29.90,
      currency: 'BRL',
      targetMarketplace: 'amazon.com.br',
      categories: ['thriller'],
      keywords: ['mistério', 'investigação'],
      targetAudience: 'Adulto',
      topic: 'Investigação policial',
      kdpBookType: 'thriller',
      pipelineStage: 'writing',
      pipelineProgress: 50,
      pipelineLog: [],
      tasks: [],
      notes: '',
      competitorsAsins: [],
      currentStage: 'research',
      stageProgress: [],
      stageContents: [],
      stageVersions: [],
      stageApprovals: [],
      kdpChapters: [
        {
          index: 1,
          title: 'O Encontro na Estação',
          summary: 'O detetive chega à cidade sob forte neblina.',
          targetWordCount: 2000,
          scenes: [],
          prose: 'A neblina cobria os trilhos de ferro quando o trem apitou ao longe.\n\nEle sabia que o caso não seria simples.',
          wordCount: 1500
        },
        {
          index: 2,
          title: 'A Mensagem Codificada',
          summary: 'Uma pista encontrada no cofre.',
          targetWordCount: 2000,
          scenes: [],
          prose: 'O papel amarelado continha três números e um símbolo arcaico.\n\nCada segundo contava para decifrar o enigma.',
          wordCount: 1600
        }
      ]
    };

    const pages = PageEngine.generateVisualPagesFromManuscript(mockProject);
    expect(pages.length).toBeGreaterThanOrEqual(6);

    // Verifica Meio-rosto
    expect(pages[0].type).toBe('half-title');
    expect(pages[0].pageNumber).toBe(1);

    // Verifica Folha de rosto
    const titlePage = pages.find(p => p.type === 'title-page');
    expect(titlePage).toBeDefined();

    // Verifica Copyright
    const copyrightPage = pages.find(p => p.type === 'copyright');
    expect(copyrightPage).toBeDefined();

    // Verifica Sumário
    const tocPage = pages.find(p => p.type === 'toc');
    expect(tocPage).toBeDefined();

    // Verifica Abertura de Capítulo
    const chOpener = pages.find(p => p.type === 'chapter-opener');
    expect(chOpener).toBeDefined();
    expect(chOpener?.chapterIndex).toBe(1);
  });

  it('deve reordenar, duplicar e excluir páginas mantendo a sequência de numeração', () => {
    let pages = PageEngine.generateVisualPagesFromManuscript({
      id: 'proj',
      title: 'Teste',
      author: 'Autor',
      trimSize: '6x9',
      kdpChapters: []
    } as any);

    const initialLength = pages.length;

    // Adiciona página
    pages = PageEngine.addPage(pages, 1);
    expect(pages.length).toBe(initialLength + 1);
    expect(pages[pages.length - 1].pageNumber).toBe(pages.length);

    // Duplica página
    pages = PageEngine.duplicatePage(pages, 2);
    expect(pages.length).toBe(initialLength + 2);

    // Move página
    pages = PageEngine.movePage(pages, 0, 3);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[1].pageNumber).toBe(2);

    // Exclui página
    pages = PageEngine.deletePage(pages, 1);
    expect(pages.length).toBe(initialLength + 1);
    expect(pages.every((p, idx) => p.pageNumber === idx + 1)).toBe(true);
  });
});
