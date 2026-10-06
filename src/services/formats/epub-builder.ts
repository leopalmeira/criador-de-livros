// Construtor profissional de EPUB 3 em conformidade com especificações do Amazon KDP
// Suporta reparação automática de acentuação, formatação XHTML estruturada e inclusão de capa
import JSZip from 'jszip';
import { BookProject } from '../../types/book-project';
import { ManuscriptAccentRepairEngine } from '../manuscript-accent-repair';

export class EpubBuilder {
  /**
   * Constrói um arquivo .epub 3 válido a partir de um BookProject
   */
  public static async buildEpub(project: BookProject): Promise<Blob> {
    const zip = new JSZip();

    // 1. mimetype (DEVE ser o primeiro arquivo e descompactado/STORE)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // 2. META-INF/container.xml
    zip.file(
      'META-INF/container.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    );

    // 3. OEBPS/styles.css profissional para Kindle / Leitores Digitais
    const css = `
body {
  font-family: Georgia, "Times New Roman", "Merriweather", serif;
  font-size: 1.05em;
  line-height: 1.65;
  margin: 5% 8%;
  color: #1a1a1a;
}
h1, h2, h3, h4 {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Montserrat", sans-serif;
  color: #0f172a;
  text-align: center;
}
h1.book-title {
  font-size: 2.2em;
  margin-top: 20%;
  margin-bottom: 0.2em;
  font-weight: 700;
}
h2.book-subtitle {
  font-size: 1.2em;
  font-weight: 400;
  color: #475569;
  margin-bottom: 2em;
  font-style: italic;
}
h3.book-author {
  font-size: 1.1em;
  font-weight: 600;
  margin-top: 2em;
  letter-spacing: 0.05em;
}
h1.chapter-title {
  font-size: 1.65em;
  margin-top: 15%;
  margin-bottom: 1.2em;
  border-bottom: 1px solid #cbd5e1;
  padding-bottom: 0.4em;
  page-break-before: always;
}
h2.section-title {
  font-size: 1.3em;
  text-align: left;
  margin-top: 1.5em;
  margin-bottom: 0.6em;
  color: #1e293b;
}
h3.subsection-title {
  font-size: 1.1em;
  text-align: left;
  margin-top: 1.2em;
  margin-bottom: 0.4em;
  color: #334155;
}
p {
  margin: 0 0 0.8em 0;
  text-indent: 1.5em;
  text-align: justify;
}
p.first-p {
  text-indent: 0;
}
ul, ol {
  margin: 0.8em 0 1.2em 1.5em;
  padding-left: 1em;
}
li {
  margin-bottom: 0.4em;
  line-height: 1.5;
}
.copyright-page {
  font-size: 0.85em;
  color: #64748b;
  margin-top: 25%;
  line-height: 1.6;
}
.toc-list {
  list-style: none;
  padding: 0;
}
.toc-list li {
  margin: 0.8em 0;
}
.toc-list a {
  text-decoration: none;
  color: #0284c7;
  font-weight: 500;
}
.cover-wrapper {
  text-align: center;
  padding: 0;
  margin: 0;
}
.cover-wrapper img {
  max-width: 100%;
  max-height: 100vh;
  object-fit: contain;
}
`;
    zip.file('OEBPS/styles.css', css);

    // Reparação de acentuação do título, subtítulo e autor
    const safeTitle = this.escapeXml(ManuscriptAccentRepairEngine.repairManuscript(project.title || 'Livro KDP'));
    const safeSubtitle = this.escapeXml(ManuscriptAccentRepairEngine.repairManuscript(project.subtitle || ''));
    const safeAuthor = this.escapeXml(ManuscriptAccentRepairEngine.repairManuscript(project.author || 'Autor'));
    const lang = project.language?.toLowerCase().includes('en') ? 'en' : 'pt-BR';
    const uuid = `urn:uuid:${project.id || Date.now()}`;

    const manifestItems: string[] = [
      `<item id="styles" href="styles.css" media-type="text/css"/>`,
      `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
      `<item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>`,
      `<item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>`
    ];

    const spineItems: string[] = [
      `<itemref idref="titlepage"/>`,
      `<itemref idref="copyright"/>`,
      `<itemref idref="nav"/>`
    ];

    const ncxPoints: string[] = [
      `<navPoint id="np-title" playOrder="1"><navLabel><text>Folha de Rosto</text></navLabel><content src="titlepage.xhtml"/></navPoint>`,
      `<navPoint id="np-copyright" playOrder="2"><navLabel><text>Créditos</text></navLabel><content src="copyright.xhtml"/></navPoint>`,
      `<navPoint id="np-nav" playOrder="3"><navLabel><text>Sumário</text></navLabel><content src="nav.xhtml"/></navPoint>`
    ];

    let playOrder = 4;

    // Processamento da Capa se existir
    const coverUrl = project.coverImageUrl || (project as any).coverDataUrl || (project as any).coverUrl;
    if (coverUrl && coverUrl.startsWith('data:image/')) {
      try {
        const matches = coverUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1].toLowerCase().replace('jpeg', 'jpg');
          const base64Data = matches[2];
          const mediaType = `image/${matches[1]}`;
          
          zip.file(`OEBPS/cover.${ext}`, base64Data, { base64: true });
          manifestItems.unshift(`<item id="cover-image" href="cover.${ext}" media-type="${mediaType}" properties="cover-image"/>`);
          manifestItems.unshift(`<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`);
          spineItems.unshift(`<itemref idref="cover"/>`);

          const coverHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
<head>
  <title>Capa</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body style="margin:0; padding:0; text-align:center;">
  <div class="cover-wrapper">
    <img src="cover.${ext}" alt="${safeTitle}"/>
  </div>
</body>
</html>`;
          zip.file('OEBPS/cover.xhtml', coverHtml);
        }
      } catch (err) {
        console.warn('Erro ao embutir capa no EPUB:', err);
      }
    }

    // Folha de Rosto
    const titlePageHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
<head>
  <title>${safeTitle}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div style="text-align: center;">
    <h1 class="book-title">${safeTitle}</h1>
    ${safeSubtitle ? `<h2 class="book-subtitle">${safeSubtitle}</h2>` : ''}
    <div style="height: 40px;"></div>
    <h3 class="book-author">${safeAuthor}</h3>
  </div>
</body>
</html>`;
    zip.file('OEBPS/titlepage.xhtml', titlePageHtml);

    // Copyright / Créditos
    const year = new Date().getFullYear();
    const copyrightHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>Créditos</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="copyright-page">
    <p class="first-p"><strong>${safeTitle}</strong></p>
    ${safeSubtitle ? `<p class="first-p">${safeSubtitle}</p>` : ''}
    <p class="first-p" style="margin-top: 1em;">© ${year} ${safeAuthor}. Todos os direitos reservados.</p>
    <p class="first-p" style="margin-top: 1em;">Nenhuma parte desta publicação pode ser reproduzida, distribuída ou transmitida por qualquer forma ou por qualquer meio sem a prévia autorização por escrito do autor, exceto no caso de breves citações incluídas em revisões críticas.</p>
    <p class="first-p" style="margin-top: 1em;">Edição Digital Amazon KDP • Formato EPUB 3.</p>
  </div>
</body>
</html>`;
    zip.file('OEBPS/copyright.xhtml', copyrightHtml);

    // Introdução (se houver)
    if (project.editorialElements?.introduction) {
      const introId = 'introduction';
      manifestItems.push(`<item id="${introId}" href="${introId}.xhtml" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="${introId}"/>`);
      ncxPoints.push(`<navPoint id="np-${introId}" playOrder="${playOrder++}"><navLabel><text>Introdução</text></navLabel><content src="${introId}.xhtml"/></navPoint>`);

      const repairedIntro = ManuscriptAccentRepairEngine.repairManuscript(project.editorialElements.introduction);
      const introHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>Introdução</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h1 class="chapter-title">Introdução</h1>
  ${this.formatMarkdownToXhtml(repairedIntro)}
</body>
</html>`;
      zip.file(`OEBPS/${introId}.xhtml`, introHtml);
    }

    // Capítulos (suporta kdpChapters, capitulos ou outline)
    const rawChapters = (project.kdpChapters && project.kdpChapters.length > 0)
      ? project.kdpChapters
      : ((project as any).capitulos || []);

    interface FormattedEpubChapter {
      num: number;
      title: string;
      content: string;
    }

    const chapters: FormattedEpubChapter[] = rawChapters.map((ch: any, idx: number): FormattedEpubChapter => {
      const num = ch.index || ch.number || (idx + 1);
      const titleRaw = ch.title || ch.titulo || `Capítulo ${num}`;
      const titleRepaired = ManuscriptAccentRepairEngine.repairManuscript(titleRaw);
      const contentRaw = ch.content || ch.prose || ch.texto || ch.summary || 'Capítulo em elaboração.';
      const contentRepaired = ManuscriptAccentRepairEngine.repairManuscript(contentRaw);

      return {
        num,
        title: titleRepaired,
        content: contentRepaired
      };
    });

    chapters.forEach((ch: FormattedEpubChapter, idx: number) => {
      const chapId = `chapter-${ch.num || idx + 1}`;
      manifestItems.push(`<item id="${chapId}" href="${chapId}.xhtml" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="${chapId}"/>`);
      ncxPoints.push(`<navPoint id="np-${chapId}" playOrder="${playOrder++}"><navLabel><text>${this.escapeXml(ch.title)}</text></navLabel><content src="${chapId}.xhtml"/></navPoint>`);

      const proseHtml = this.formatMarkdownToXhtml(ch.content);
      const chapHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>${this.escapeXml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h1 class="chapter-title">${this.escapeXml(ch.title)}</h1>
  ${proseHtml}
</body>
</html>`;
      zip.file(`OEBPS/${chapId}.xhtml`, chapHtml);
    });

    // Conclusão (se houver)
    if (project.editorialElements?.conclusion) {
      const conclId = 'conclusion';
      manifestItems.push(`<item id="${conclId}" href="${conclId}.xhtml" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="${conclId}"/>`);
      ncxPoints.push(`<navPoint id="np-${conclId}" playOrder="${playOrder++}"><navLabel><text>Conclusão</text></navLabel><content src="${conclId}.xhtml"/></navPoint>`);

      const repairedConcl = ManuscriptAccentRepairEngine.repairManuscript(project.editorialElements.conclusion);
      const conclHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>Conclusão</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h1 class="chapter-title">Conclusão</h1>
  ${this.formatMarkdownToXhtml(repairedConcl)}
</body>
</html>`;
      zip.file(`OEBPS/${conclId}.xhtml`, conclHtml);
    }

    // Navigation Document (nav.xhtml - EPUB 3 Standard)
    const navHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
<head>
  <title>Sumário</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1 class="chapter-title">Sumário</h1>
    <ol class="toc-list">
      <li><a href="titlepage.xhtml">Folha de Rosto</a></li>
      <li><a href="copyright.xhtml">Créditos</a></li>
      ${project.editorialElements?.introduction ? `<li><a href="introduction.xhtml">Introdução</a></li>` : ''}
      ${chapters.map((c: FormattedEpubChapter) => `<li><a href="chapter-${c.num}.xhtml">${this.escapeXml(c.title)}</a></li>`).join('\n      ')}
      ${project.editorialElements?.conclusion ? `<li><a href="conclusion.xhtml">Conclusão</a></li>` : ''}
    </ol>
  </nav>
</body>
</html>`;
    zip.file('OEBPS/nav.xhtml', navHtml);

    // NCX (EPUB 2 compatibility for older Kindles)
    const ncxXml = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${safeTitle}</text></docTitle>
  <navMap>
    ${ncxPoints.join('\n    ')}
  </navMap>
</ncx>`;
    zip.file('OEBPS/toc.ncx', ncxXml);
    manifestItems.push(`<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`);

    // Package Document (OEBPS/content.opf)
    const opfXml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookID">${uuid}</dc:identifier>
    <dc:title>${safeTitle}</dc:title>
    ${safeSubtitle ? `<dc:description>${safeSubtitle}</dc:description>` : ''}
    <dc:creator>${safeAuthor}</dc:creator>
    <dc:language>${lang}</dc:language>
    <dc:publisher>Publicação Independente KDP</dc:publisher>
    <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]{3}/, '')}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
    zip.file('OEBPS/content.opf', opfXml);

    return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  }

  /**
   * Converte texto Markdown para parágrafos, cabeçalhos e listas XHTML válidas
   */
  public static formatMarkdownToXhtml(text: string): string {
    const clean = (text || '').trim();
    if (!clean) return '<p class="first-p">Conteúdo editorial.</p>';

    const lines = clean.split('\n');
    const result: string[] = [];
    let insideList = false;
    let isFirstPara = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        if (insideList) {
          result.push('</ul>');
          insideList = false;
        }
        continue;
      }

      // Cabeçalhos Markdown
      if (line.startsWith('### ')) {
        if (insideList) { result.push('</ul>'); insideList = false; }
        result.push(`<h3 class="subsection-title">${this.escapeXml(line.slice(4))}</h3>`);
        continue;
      }
      if (line.startsWith('## ')) {
        if (insideList) { result.push('</ul>'); insideList = false; }
        result.push(`<h2 class="section-title">${this.escapeXml(line.slice(3))}</h2>`);
        continue;
      }
      if (line.startsWith('# ')) {
        if (insideList) { result.push('</ul>'); insideList = false; }
        result.push(`<h1 class="chapter-title">${this.escapeXml(line.slice(2))}</h1>`);
        continue;
      }

      // Itens de Lista (- ou *)
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!insideList) {
          result.push('<ul>');
          insideList = true;
        }
        const itemText = this.formatInlineMarkdown(line.slice(2));
        result.push(`  <li>${itemText}</li>`);
        continue;
      }

      if (insideList) {
        result.push('</ul>');
        insideList = false;
      }

      // Parágrafo normal
      const cls = isFirstPara ? ' class="first-p"' : '';
      isFirstPara = false;
      const formatted = this.formatInlineMarkdown(line);
      result.push(`<p${cls}>${formatted}</p>`);
    }

    if (insideList) {
      result.push('</ul>');
    }

    return result.join('\n');
  }

  private static formatInlineMarkdown(text: string): string {
    let s = this.escapeXml(text);
    // Negrito: **texto**
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Itálico: *texto* ou _texto_
    s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
    s = s.replace(/_(.*?)_/g, '<em>$1</em>');
    return s;
  }

  private static escapeXml(unsafe: string): string {
    return (unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
