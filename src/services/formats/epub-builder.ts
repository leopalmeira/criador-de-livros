// Construtor profissional de EPUB 3 em conformidade com especificações do Amazon KDP
import JSZip from 'jszip';
import { BookProject } from '../../types/book-project';

export class EpubBuilder {
  /**
   * Constrói um arquivo .epub válido a partir de um BookProject
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

    // 3. OEBPS/styles.css
    const css = `
body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.05em;
  line-height: 1.6;
  margin: 5% 8%;
  color: #1a1a1a;
}
h1, h2, h3, h4 {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #111;
  text-align: center;
}
h1.book-title {
  font-size: 2.2em;
  margin-top: 25%;
  margin-bottom: 0.2em;
}
h2.book-subtitle {
  font-size: 1.2em;
  font-weight: 400;
  color: #555;
  margin-bottom: 2em;
}
h3.book-author {
  font-size: 1.1em;
  font-weight: 600;
  margin-top: 2em;
}
h1.chapter-title {
  font-size: 1.7em;
  margin-top: 15%;
  margin-bottom: 1.5em;
  border-bottom: 1px solid #ddd;
  padding-bottom: 0.4em;
}
p {
  margin: 0;
  text-indent: 1.5em;
  text-align: justify;
}
p.first-p {
  text-indent: 0;
}
p.first-p::first-letter {
  font-size: 2.8em;
  float: left;
  line-height: 0.8;
  margin-right: 0.1em;
  font-weight: 700;
}
.copyright-page {
  font-size: 0.85em;
  color: #666;
  margin-top: 30%;
  line-height: 1.5;
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
  color: #2563eb;
}
`;
    zip.file('OEBPS/styles.css', css);

    const safeTitle = this.escapeXml(project.title || 'Livro KDP');
    const safeSubtitle = this.escapeXml(project.subtitle || '');
    const safeAuthor = this.escapeXml(project.author || 'Autor');
    const lang = project.language?.toLowerCase().includes('en') ? 'en' : 'pt-BR';
    const uuid = `urn:uuid:${project.id}`;

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

    // Copyright
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
    <p class="first-p" style="margin-top: 1em;">Edição Digital KDP.</p>
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

      const introHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>Introdução</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h1 class="chapter-title">Introdução</h1>
  ${this.formatProseToParagraphs(project.editorialElements.introduction)}
</body>
</html>`;
      zip.file(`OEBPS/${introId}.xhtml`, introHtml);
    }

    // Capítulos
    const chapters = project.kdpChapters || [];
    chapters.forEach((ch, idx) => {
      const chapId = `chapter-${ch.index || idx + 1}`;
      manifestItems.push(`<item id="${chapId}" href="${chapId}.xhtml" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="${chapId}"/>`);
      ncxPoints.push(`<navPoint id="np-${chapId}" playOrder="${playOrder++}"><navLabel><text>${this.escapeXml(ch.title || `Capítulo ${ch.index}`)}</text></navLabel><content src="${chapId}.xhtml"/></navPoint>`);

      const proseHtml = this.formatProseToParagraphs(ch.prose || ch.summary || 'Capítulo em elaboração.');
      const chapHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>${this.escapeXml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h1 class="chapter-title">Capítulo ${ch.index}: ${this.escapeXml(ch.title)}</h1>
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

      const conclHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>Conclusão</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h1 class="chapter-title">Conclusão</h1>
  ${this.formatProseToParagraphs(project.editorialElements.conclusion)}
</body>
</html>`;
      zip.file(`OEBPS/${conclId}.xhtml`, conclHtml);
    }

    // Sobre o Autor (se houver)
    if (project.editorialElements?.aboutAuthor) {
      const authorId = 'about-author';
      manifestItems.push(`<item id="${authorId}" href="${authorId}.xhtml" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="${authorId}"/>`);
      ncxPoints.push(`<navPoint id="np-${authorId}" playOrder="${playOrder++}"><navLabel><text>Sobre o Autor</text></navLabel><content src="${authorId}.xhtml"/></navPoint>`);

      const authorHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>Sobre o Autor</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h1 class="chapter-title">Sobre o Autor</h1>
  ${this.formatProseToParagraphs(project.editorialElements.aboutAuthor)}
</body>
</html>`;
      zip.file(`OEBPS/${authorId}.xhtml`, authorHtml);
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
      ${chapters.map(c => `<li><a href="chapter-${c.index}.xhtml">Capítulo ${c.index}: ${this.escapeXml(c.title)}</a></li>`).join('\n      ')}
      ${project.editorialElements?.conclusion ? `<li><a href="conclusion.xhtml">Conclusão</a></li>` : ''}
      ${project.editorialElements?.aboutAuthor ? `<li><a href="about-author.xhtml">Sobre o Autor</a></li>` : ''}
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

  private static formatProseToParagraphs(text: string): string {
    const clean = text.trim();
    if (!clean) return '<p class="first-p">Conteúdo a redigir.</p>';

    const paras = clean.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    return paras.map((p, idx) => {
      const cls = idx === 0 ? ' class="first-p"' : '';
      return `<p${cls}>${this.escapeXml(p)}</p>`;
    }).join('\n');
  }

  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
