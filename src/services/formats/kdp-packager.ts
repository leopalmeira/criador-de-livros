// Empacotador do Pacote Completo KDP (.ZIP) conforme especificação oficial do projeto
import JSZip from 'jszip';
import { BookProject } from '../../types/book-project';
import { EpubBuilder } from './epub-builder';
import { PdfBuilder } from './pdf-builder';

export class KdpPackager {
  /**
   * Gera o pacote completo em formato .ZIP organizado para publicação direta no Amazon KDP
   */
  public static async createKdpPackage(project: BookProject): Promise<Blob> {
    return this.packageFullKdpBundle(project);
  }

  public static async packageFullKdpBundle(project: BookProject): Promise<Blob> {
    const zip = new JSZip();
    const slug = (project.title || 'livro-kdp')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const rootFolder = zip.folder(`${slug}-kdp`);
    if (!rootFolder) throw new Error('Falha ao criar pasta raiz do pacote KDP.');

    // 1. ebook/book.epub
    const epubBlob = await EpubBuilder.buildEpub(project);
    rootFolder.folder('ebook')?.file(`${slug}.epub`, epubBlob);

    // 2. paperback/interior.pdf & cover-full-wrap.pdf
    const interiorPdfBlob = await PdfBuilder.buildInteriorPdf(project);
    const coverWrapPdfBlob = await PdfBuilder.buildCoverWrapPdf(project, project.actualPages || project.estimatedPages || 150);
    const paperbackFolder = rootFolder.folder('paperback');
    paperbackFolder?.file('interior.pdf', interiorPdfBlob);
    paperbackFolder?.file('cover-full-wrap.pdf', coverWrapPdfBlob);

    // 3. manuscript/ (.pdf, .md, .html)
    const manuscriptFolder = rootFolder.folder('manuscript');
    manuscriptFolder?.file('manuscript.pdf', interiorPdfBlob);
    manuscriptFolder?.file('manuscript.md', this.generateMarkdownManuscript(project));
    manuscriptFolder?.file('manuscript.html', this.generateHtmlManuscript(project));

    // 4. cover/ (full-wrap.pdf & metadados visuais)
    const coverFolder = rootFolder.folder('cover');
    coverFolder?.file('full-wrap.pdf', coverWrapPdfBlob);
    coverFolder?.file('cover-prompts.txt', this.generateCoverPromptsText(project));

    // 5. metadata/ (metadata.json, description.txt, keywords.txt, categories.txt)
    const metadataFolder = rootFolder.folder('metadata');
    metadataFolder?.file('metadata.json', JSON.stringify(this.generateKdpMetadataJson(project), null, 2));
    metadataFolder?.file('description.txt', project.kdpMetadata?.commercialLongDescription || project.description || '');
    metadataFolder?.file('keywords.txt', (project.kdpMetadata?.keywords7 || project.keywords || []).join('\n'));
    metadataFolder?.file('categories.txt', (project.kdpMetadata?.categoriesPrimary || project.categories || []).join('\n'));

    // 6. validation/quality-report.html
    const validationFolder = rootFolder.folder('validation');
    validationFolder?.file('quality-report.html', this.generateQualityReportHtml(project));

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  }

  private static generateMarkdownManuscript(p: BookProject): string {
    let md = `# ${p.title}\n\n`;
    if (p.subtitle) md += `*${p.subtitle}*\n\n`;
    md += `**Autor:** ${p.author}\n\n---\n\n`;

    if (p.editorialElements?.introduction) {
      md += `## Introdução\n\n${p.editorialElements.introduction}\n\n---\n\n`;
    }

    (p.kdpChapters || []).forEach((ch) => {
      md += `## Capítulo ${ch.index}: ${ch.title}\n\n`;
      if (ch.summary) md += `> *Resumo Editorial: ${ch.summary}*\n\n`;
      md += `${ch.prose || 'Capítulo em elaboração.'}\n\n---\n\n`;
    });

    if (p.editorialElements?.conclusion) {
      md += `## Conclusão\n\n${p.editorialElements.conclusion}\n\n---\n\n`;
    }

    if (p.editorialElements?.aboutAuthor) {
      md += `## Sobre o Autor\n\n${p.editorialElements.aboutAuthor}\n\n`;
    }

    return md;
  }

  private static generateHtmlManuscript(p: BookProject): string {
    const chapters = (p.kdpChapters || []).map(ch => `
      <section class="chapter">
        <h2>Capítulo ${ch.index}: ${ch.title}</h2>
        <div class="prose">${(ch.prose || '').split(/\n\s*\n/).map(para => `<p>${para}</p>`).join('')}</div>
      </section>
    `).join('\n');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${p.title}</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #222; }
    h1 { font-family: sans-serif; text-align: center; margin-bottom: 5px; }
    h2.subtitle { font-family: sans-serif; text-align: center; color: #666; font-weight: normal; margin-top: 0; }
    .author { text-align: center; font-weight: bold; margin-bottom: 40px; }
    .chapter { margin-top: 50px; page-break-before: always; }
    p { text-indent: 1.5em; margin: 0 0 10px 0; text-align: justify; }
  </style>
</head>
<body>
  <h1>${p.title}</h1>
  ${p.subtitle ? `<h2 class="subtitle">${p.subtitle}</h2>` : ''}
  <div class="author">Por ${p.author}</div>
  <hr/>
  ${chapters}
</body>
</html>`;
  }

  private static generateCoverPromptsText(p: BookProject): string {
    const cov = p.kdpCoverDesign;
    return `=== DIRETRIZES DE DESIGN DA CAPA (KDP SPEC) ===
Título: ${p.title}
Subtítulo: ${p.subtitle || 'N/A'}
Autor: ${p.author}
Formato Físico: ${p.trimSize}
Papel: ${p.paperType}
Lombada Estimada: ${cov?.geometry?.spineWidthInches?.toFixed(3) || '0.350'}" polegadas

PROMPT VISUAL DA CAPA FRONTAL (DALL-E / MIDJOURNEY):
${cov?.frontPrompt || 'Capa limpa e minimalista de livro de alto impacto.'}

SINOPSE DA CONTRACAPA (BLURB):
${cov?.backCoverBlurb || p.description || ''}
`;
  }

  private static generateKdpMetadataJson(p: BookProject): any {
    const meta = p.kdpMetadata;
    return {
      title: p.title,
      subtitle: p.subtitle || '',
      author: p.author,
      description: meta?.commercialLongDescription || p.description,
      language: p.language || 'Português',
      keywords: meta?.keywords7 || p.keywords || [],
      categories: meta?.categoriesPrimary || p.categories || [],
      targetAudience: p.targetAudience || 'Geral',
      format: p.format || 'Kindle / Paperback',
      trimSize: p.trimSize,
      paperType: p.paperType,
      pricing: {
        suggestedBrl: meta?.priceSuggestedBrl || 19.90,
        suggestedUsd: meta?.priceSuggestedUsd || 4.99
      },
      exportTimestamp: new Date().toISOString()
    };
  }

  private static generateQualityReportHtml(p: BookProject): string {
    const q = p.kdpQualityReport;
    const score = q?.overallScore;
    const checks = q?.checks || [];

    const checksList = checks.map(c => `
      <li style="margin: 8px 0; color: ${c.passed ? '#15803d' : '#b91c1c'};">
        <strong>${c.passed ? '✓' : '⚠️'} ${c.name}:</strong> ${c.details}
      </li>
    `).join('\n');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Qualidade KDP - ${p.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 24px; color: #1e293b; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; }
    .score { font-size: 36px; font-weight: bold; color: ${score !== undefined && score >= 80 ? '#16a34a' : '#ea580c'}; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Relatório de Auditoria Editorial & KDP Quality Gate</h1>
    <p><strong>Obra:</strong> ${p.title} (${p.author})</p>
    <div class="score">${score === undefined ? '—' : `${score} / 100`}</div>
    <p>Status: <strong>${q?.isReadyForKdp ? 'Checklist concluído — valide no Previewer do KDP' : q ? 'Revisão necessária' : 'Auditoria não executada'}</strong></p>
    <hr/>
    <h3>Checklist de Verificações:</h3>
    <ul>${checksList || '<li>A auditoria de qualidade ainda não foi executada para este projeto.</li>'}</ul>
    <p style="font-size: 12px; color: #64748b; margin-top: 30px;">Gerado pelo BookEngin Editorial Engine em ${new Date().toLocaleString('pt-BR')}.</p>
  </div>
</body>
</html>`;
  }
}
