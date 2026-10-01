import { BookProject, TRIM_SIZE_METRICS } from '../../types/book-project';

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const safeFontFamily = (value: string | undefined, fallback: string): string => {
  const family = (value || fallback).replace(/[^a-zA-Z0-9 ,.'"-]/g, '').trim();
  return family || fallback;
};

const renderParagraphs = (text: string): string => text
  .split(/\n\s*\n/)
  .map(paragraph => paragraph.trim())
  .filter(Boolean)
  .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
  .join('\n');

const safeImageUrl = (value: string): string | null => {
  if (/^data:image\/(png|jpeg|webp|gif);base64,/i.test(value)) return value;
  return null;
};

export class EditorialHtmlBuilder {
  public static build(project: BookProject): string {
    const trim = project.pageSettings?.trimSize || project.trimSize || '6x9';
    const dimensions = TRIM_SIZE_METRICS[trim] || TRIM_SIZE_METRICS['6x9'];
    const margins = project.pageSettings?.margins || {
      top: 0.75,
      bottom: 0.75,
      inside: 0.75,
      outside: 0.5
    };
    const typography = project.typography;
    const bodyFont = safeFontFamily(typography?.bodyFont || typography?.fontFamily, 'Georgia, serif');
    const headingFont = safeFontFamily(typography?.headingFont, 'Georgia, serif');
    const fontSize = Math.min(24, Math.max(8, typography?.fontSizePt || 11));
    const lineHeight = Math.min(2.5, Math.max(1, typography?.lineHeight || 1.55));
    const title = escapeHtml(project.title || 'Livro sem título');
    const subtitle = escapeHtml(project.subtitle || '');
    const author = escapeHtml(project.author || 'Autor');
    const lang = project.language?.toLowerCase().includes('en') ? 'en' : 'pt-BR';
    const editorial = project.editorialElements;
    const chapters = project.kdpChapters || [];
    const pageWidth = dimensions.widthInches;
    const pageHeight = dimensions.heightInches;
    const headerRule = project.pageSettings?.hasRunningHeaders
      ? '@top-center { content: string(running-title); font: 8pt sans-serif; color: #555; }'
      : '';
    const footerRule = project.pageSettings?.hasPageNumbers
      ? '@bottom-center { content: counter(page); font: 8pt sans-serif; }'
      : '';
    const imageByChapter = new Map<number, string[]>();

    (project.images || []).forEach(image => {
      if (typeof image.chapterIndex !== 'number') return;
      const url = safeImageUrl(image.dataUrl);
      if (!url) return;
      const group = imageByChapter.get(image.chapterIndex) || [];
      group.push(`<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(image.name)}"><figcaption>${escapeHtml(image.name)}</figcaption></figure>`);
      imageByChapter.set(image.chapterIndex, group);
    });

    const chapterMarkup = chapters.map((chapter, index) => {
      const chapterNumber = chapter.index || index + 1;
      const chapterTitle = escapeHtml(chapter.title || `Capítulo ${chapterNumber}`);
      const chapterText = chapter.prose || chapter.summary || '';
      const images = imageByChapter.get(chapterNumber)?.join('\n') || '';
      return `<section class="chapter" id="chapter-${chapterNumber}">
  <h1 class="chapter-title">${chapterTitle}</h1>
  ${renderParagraphs(chapterText)}
  ${images}
</section>`;
    }).join('\n');

    const toc = chapters.map((chapter, index) => {
      const chapterNumber = chapter.index || index + 1;
      return `<li><a href="#chapter-${chapterNumber}">${escapeHtml(chapter.title || `Capítulo ${chapterNumber}`)}</a></li>`;
    }).join('\n');

    const optionalSection = (label: string, content?: string) => content
      ? `<section class="front-matter"><h1>${escapeHtml(label)}</h1>${renderParagraphs(content)}</section>`
      : '';

    return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    @page {
      size: ${pageWidth}in ${pageHeight}in;
      margin: ${margins.top}in ${margins.outside}in ${margins.bottom}in ${margins.inside}in;
      ${headerRule}
      ${footerRule}
    }
    @page :left { margin-left: ${margins.outside}in; margin-right: ${margins.inside}in; }
    @page :right { margin-left: ${margins.inside}in; margin-right: ${margins.outside}in; }
    @page:first { @top-center { content: none; } @bottom-center { content: none; } }
    :root { font-family: ${bodyFont}; font-size: ${fontSize}pt; line-height: ${lineHeight}; color: #171717; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    p { margin: 0 0 ${Math.max(0, typography?.paragraphSpacingPt ?? 6)}pt; text-align: ${typography?.textAlign || 'justify'}; text-indent: 1.5em; orphans: 2; widows: 2; }
    h1, h2, h3 { font-family: ${headingFont}; break-after: avoid; }
    .title-page { break-after: page; text-align: center; padding-top: 30%; }
    .title-page h1 { font-size: 25pt; margin: 0 0 0.6em; }
    .title-page .subtitle { font-size: 14pt; font-weight: normal; }
    .title-page .author { margin-top: 5em; text-indent: 0; text-align: center; }
    .front-matter { break-before: page; break-after: page; }
    .copyright { break-before: page; break-after: page; font-size: 9pt; padding-top: 50%; }
    .copyright p { text-align: left; text-indent: 0; }
    .toc { break-before: page; break-after: page; }
    .toc ol { list-style: none; padding: 0; }
    .toc li { margin: 0.5em 0; }
    .toc a { color: inherit; text-decoration: none; }
    .toc a::after { content: leader('.') target-counter(attr(href), page); }
    .chapter { break-before: right; }
    .chapter-title { string-set: running-title content(text); text-align: center; font-size: 20pt; margin: 20% 0 2em; }
    figure { break-inside: avoid; margin: 1.5em 0; text-align: center; }
    figure img { max-width: 100%; max-height: 7in; height: auto; object-fit: contain; }
    figcaption { font-size: 9pt; font-style: italic; margin-top: 0.5em; }
    blockquote { break-inside: avoid; margin: 1.25em 1.5em; font-style: italic; }
    @media screen { body { max-width: 42em; margin: 0 auto; padding: 1.5rem; } }
  </style>
</head>
<body>
  <section class="title-page">
    <h1>${title}</h1>
    ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
    <p class="author">${author}</p>
  </section>
  <section class="copyright">
    ${renderParagraphs(editorial?.copyrightNotice || `© ${new Date().getFullYear()} ${project.author || 'Autor'}. Todos os direitos reservados.`)}
  </section>
  ${optionalSection('Dedicatória', editorial?.dedication)}
  ${optionalSection('Epígrafe', editorial?.epigraph)}
  ${optionalSection('Prefácio', editorial?.preface)}
  ${optionalSection('Apresentação', editorial?.foreword)}
  <nav class="toc" aria-label="Sumário"><h1>Sumário</h1><ol>${toc}</ol></nav>
  ${optionalSection('Introdução', editorial?.introduction)}
  ${chapterMarkup}
  ${optionalSection('Conclusão', editorial?.conclusion)}
  ${optionalSection('Sobre o Autor', editorial?.aboutAuthor)}
</body>
</html>`;
  }
}