// ================================================================
// GERADOR DE HTML OFICIAL PARA AMAZON KDP & PÁGINA PROMOCIONAL
// - Gera HTML da Descrição do Livro 100% compatível com a Amazon KDP
//   (tags permitidas: <h2>, <h3>, <b>, <i>, <p>, <ul>, <li>, <br>)
// - Gera Landing Page HTML standalone completa com capa e tema visual
// ================================================================

import { BookPromotionalPageData } from '../types/promotional-page';
import { obterTemaPorGenero } from './kdp-ai-engine';

export interface BookHtmlDataInput {
  title: string;
  subtitle?: string;
  author: string;
  genre?: string;
  coverDataUrl?: string | null;
  synopsis?: string;
  chapters?: Array<{ titulo: string; texto: string }>;
  promoData?: BookPromotionalPageData | null;
  language?: string;
}

export class KdpHtmlGenerator {
  /**
   * Gera o HTML da DESCRIÇÃO OFICIAL DA AMAZON KDP
   * Usa estritamente tags aceitas pelo campo "Descrição" do KDP:
   * <h2>, <h3>, <b>, <strong>, <i>, <em>, <u>, <ul>, <ol>, <li>, <p>, <br>
   */
  public static generateKdpDescriptionHtml(input: BookHtmlDataInput): string {
    const isEn = Boolean(input.language && /ingl|en/i.test(input.language));
    const title = input.title || (isEn ? 'Untitled Book' : 'Livro Sem Título');
    const subtitle = input.subtitle || '';
    const author = input.author || (isEn ? 'Author' : 'Autor da Obra');
    const genre = input.genre || (isEn ? 'Literature' : 'Literatura');

    const promo = input.promoData;

    // 1. Gancho Principal & Headline
    const defaultHeadline = isEn
      ? `${title.toUpperCase()}: ${subtitle || 'AN UNFORGETTABLE STORY'}`
      : `${title.toUpperCase()}: ${subtitle || 'UMA HISTÓRIA INESQUECÍVEL'}`;
    const headline = promo?.headline || defaultHeadline;

    const defaultHeroHook = isEn
      ? (input.synopsis ? input.synopsis.slice(0, 160) : `A captivating journey into the world of ${genre.toLowerCase()} that will keep you reading from beginning to end.`)
      : (input.synopsis ? input.synopsis.slice(0, 160) : `Um mergulho profundo no universo de ${genre.toLowerCase()} que prenderá sua atenção da primeira à última página.`);
    const heroHook = promo?.heroHook || defaultHeroHook;

    // 2. Sinopse Editorial
    let sinopse = promo?.synopsis || input.synopsis || '';
    if (!sinopse && input.chapters && input.chapters.length > 0) {
      const firstCap = input.chapters[0].texto || '';
      sinopse = firstCap.split(/\n\s*\n/)[0] || (isEn ? 'A gripping story full of unexpected twists.' : 'Uma trama envolvente e repleta de reviravoltas.');
      if (sinopse.length > 300) sinopse = sinopse.slice(0, 300) + '...';
    }
    if (!sinopse) {
      sinopse = isEn
        ? `In "${title}", author ${author} weaves a vivid and cinematic narrative, exploring the frontiers of human nature and choices that change lives forever.`
        : `Em "${title}", o autor ${author} constrói uma narrativa densa e cinematográfica, explorando os limites das escolhas humanas e os segredos que mudam vidas para sempre.`;
    }

    // 3. Frase de Impacto
    const defaultQuote = isEn
      ? 'When the truth finally surfaces, no detail can be left in the shadows.'
      : 'Quando a verdade finalmente vem à tona, nenhum detalhe pode ser ignorado.';
    const impactQuote = promo?.impactQuote || defaultQuote;

    // 4. Características e Destaques (Bullet points)
    let featureBullets: Array<{ title: string; desc: string }> = [];
    if (promo?.features && promo.features.length > 0) {
      featureBullets = promo.features.map(f => ({
        title: f.title,
        desc: f.description || f.subtitle || ''
      }));
    } else if (input.chapters && input.chapters.length > 0) {
      featureBullets = input.chapters.slice(0, 4).map((c, idx) => ({
        title: c.titulo.replace(/^(capítulo|chapter)\s*\d+[:\-]?\s*/i, '') || (isEn ? `Key Reveal Part ${idx + 1}` : `Revelação Parte ${idx + 1}`),
        desc: isEn ? 'A pivotal milestone in character and plot development.' : 'Um marco decisivo no desenvolvimento da trama e dos personagens centrais.'
      }));
    } else {
      featureBullets = isEn ? [
        { title: 'Gripping Storyline', desc: 'Expertly structured to keep readers turning pages until the end.' },
        { title: 'Memorable Characters', desc: 'Realistic human conflicts, authentic voices, and emotional depth.' },
        { title: 'Cinematic Pacing', desc: 'Vivid imagery, rich atmospheric detail, and rising tension.' },
        { title: 'Polished Edition', desc: 'Refined editorial quality formatted specifically for Amazon KDP.' }
      ] : [
        { title: 'Enredo Envolvente', desc: 'Narrativa estruturada para prender a atenção do leitor do início ao fim.' },
        { title: 'Personagens Marcantes', desc: 'Conflitos humanos realistas, diálogos dinâmicos e desenvolvimento autêntico.' },
        { title: 'Ritmo Cinematográfico', desc: 'Cenas detalhadas com ambientação rica e tensão progressiva constante.' },
        { title: 'Edição Primorosa', desc: 'Texto revisado e diagramado sob as rigorosas diretrizes da Amazon KDP.' }
      ];
    }

    // 5. Universo e Provocação Final
    const expTitle = promo?.experienceTitle || (isEn ? 'Why this book is a must-read:' : 'Por que este livro é uma leitura imperdível:');
    const closingQuestion = promo?.closingQuestion || (isEn ? 'How far would you go to discover the ultimate truth?' : 'Até onde você iria para descobrir a verdade definitiva?');
    const ctaText = isEn
      ? '👉 <b>Get your copy today and experience this unforgettable journey!</b>'
      : '👉 <b>Garanta seu exemplar hoje mesmo e descubra este desfecho extraordinário!</b>';

    // Monta o HTML limpo e estrito para o KDP
    const htmlLines: string[] = [
      `<h2><b>${headline.toUpperCase()}</b></h2>`,
      ``,
      `<p><b><i>"${heroHook}"</i></b></p>`,
      ``,
      `<p>${sinopse}</p>`,
      ``,
      `<p><b><i>&ldquo;${impactQuote}&rdquo;</i></b></p>`,
      ``,
      `<h3><b>${expTitle}</b></h3>`,
      `<ul>`,
      ...featureBullets.map(f => `  <li><b>${f.title}:</b> ${f.desc}</li>`),
      `</ul>`,
      ``,
      `<p><b>${closingQuestion}</b></p>`,
      ``,
      `<p>${ctaText}</p>`
    ];

    return htmlLines.join('\n');
  }

  /**
   * Gera a Landing Page HTML STANDALONE completa da página promocional
   * (Inclui CSS embutido, capa em Base64 ou URL, layout responsivo e cards)
   */
  public static generateStandalonePromotionalPageHtml(input: BookHtmlDataInput): string {
    const title = input.title || 'Livro Sem Título';
    const subtitle = input.subtitle || '';
    const author = input.author || 'Autor da Obra';
    const genre = input.genre || 'Literatura';
    const promo = input.promoData;
    const coverUrl = input.coverDataUrl || promo?.coverImageUrl || '';
    const promoImg = promo?.promotionalImageUrl || coverUrl;

    const theme = promo?.genreTheme || obterTemaPorGenero(genre);

    const heroHook = promo?.heroHook || input.synopsis?.slice(0, 160) || `Uma experiência literária inesquecível de ${genre}.`;
    const headline = promo?.headline || `${title}: Uma Nova Referência em ${genre}`;
    const synopsis = promo?.synopsis || input.synopsis || `Uma trama repleta de mistério, escolhas e consequências irreversíveis.`;
    const impactQuote = promo?.impactQuote || `A verdade tem um preço que poucos estão dispostos a pagar.`;
    const closingQuestion = promo?.closingQuestion || 'Você está preparado para esta revelação?';
    const closingCta = promo?.closingCtaText || 'Adquira seu exemplar na Amazon';

    const features = (promo?.features && promo.features.length > 0)
      ? promo.features
      : [
          { title: 'Trama Magnética', subtitle: 'Ritmo Intenso', description: 'Capítulos dinâmicos com ganchos precisos que conduzem a leitura.' },
          { title: 'Conflito Realista', subtitle: 'Psicologia dos Personagens', description: 'Dilemas profundos e escolhas difíceis com impacto duradouro.' },
          { title: 'Desfecho Completo', subtitle: 'Sem Pontas Soltas', description: 'Uma conclusão que entrega respostas e ressoa na mente do leitor.' }
        ];

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Página Promocional Oficial</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${theme.bodyBg};
      color: ${theme.textPrimary};
      font-family: ${theme.fontFamilyBody || "'Inter', sans-serif"};
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
      padding: 48px 24px;
    }
    .wrapper {
      max-width: 1080px;
      margin: 0 auto;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      background: ${theme.atmosphereBadgeBg};
      color: ${theme.atmosphereBadgeColor};
      margin-bottom: 20px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .hero {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 52px;
      align-items: center;
      margin-bottom: 64px;
    }
    @media (max-width: 820px) {
      .hero { grid-template-columns: 1fr; text-align: center; }
    }
    .cover-box {
      text-align: center;
    }
    .cover-box img {
      width: 100%;
      max-width: 340px;
      aspect-ratio: 2 / 3;
      object-fit: cover;
      border-radius: 8px;
      box-shadow: 0 24px 50px rgba(0,0,0,0.65), 0 4px 12px rgba(0,0,0,0.3);
      border: 1px solid ${theme.borderColor};
    }
    h1 {
      font-family: ${theme.fontFamilyTitle || "'Playfair Display', serif"};
      font-size: 2.8rem;
      line-height: 1.15;
      margin-bottom: 12px;
      color: #ffffff;
    }
    .subtitle {
      font-size: 1.25rem;
      font-style: italic;
      color: ${theme.textSecondary};
      margin-bottom: 16px;
    }
    .author {
      font-size: 0.95rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: ${theme.accentColor};
      font-weight: 700;
      margin-bottom: 24px;
    }
    .hook {
      padding: 18px 22px;
      border-left: 4px solid ${theme.accentColor};
      background: rgba(255, 255, 255, 0.03);
      font-size: 1.05rem;
      border-radius: 0 8px 8px 0;
      color: #f1f5f9;
      font-style: italic;
    }
    .synopsis-card {
      background: ${theme.cardBg};
      border: 1px solid ${theme.borderColor};
      border-radius: 12px;
      padding: 38px;
      margin: 48px 0;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    }
    .synopsis-card h2 {
      font-family: ${theme.fontFamilyTitle || "'Playfair Display', serif"};
      font-size: 1.8rem;
      margin-bottom: 16px;
      color: #ffffff;
    }
    .synopsis-card p {
      font-size: 1.1rem;
      color: ${theme.textSecondary};
      line-height: 1.75;
    }
    .quote-box {
      text-align: center;
      margin: 56px 0;
      padding: 32px 20px;
    }
    .quote-box .text {
      font-family: ${theme.fontFamilyTitle || "'Playfair Display', serif"};
      font-size: 2rem;
      font-style: italic;
      color: #f8fafc;
      max-width: 820px;
      margin: 0 auto;
      line-height: 1.35;
    }
    .grid3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 22px;
      margin: 56px 0;
    }
    @media (max-width: 768px) {
      .grid3 { grid-template-columns: 1fr; }
    }
    .tile {
      background: ${theme.cardBg};
      border: 1px solid ${theme.borderColor};
      padding: 28px;
      border-radius: 10px;
      transition: transform 0.2s ease;
    }
    .tile:hover {
      transform: translateY(-4px);
    }
    .tile h3 {
      color: ${theme.accentColor};
      font-size: 1.25rem;
      margin-bottom: 6px;
    }
    .tile .sub {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: ${theme.textSecondary};
      margin-bottom: 12px;
      font-weight: 600;
    }
    .tile p {
      font-size: 0.95rem;
      color: ${theme.textPrimary};
      line-height: 1.6;
    }
    .promo-banner {
      margin: 64px 0;
      text-align: center;
    }
    .promo-banner img {
      width: 100%;
      aspect-ratio: 16 / 9;
      max-height: 480px;
      object-fit: cover;
      border-radius: 12px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.6);
      border: 1px solid ${theme.borderColor};
    }
    .closing-box {
      background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
      border: 1px solid ${theme.borderColor};
      border-radius: 14px;
      padding: 48px 28px;
      text-align: center;
      margin-top: 64px;
    }
    .closing-box h2 {
      font-size: 2rem;
      font-family: ${theme.fontFamilyTitle || "'Playfair Display', serif"};
      margin-bottom: 24px;
      color: #ffffff;
    }
    .cta-btn {
      display: inline-block;
      padding: 16px 36px;
      background: ${theme.accentGradient || 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'};
      color: #0f172a;
      text-decoration: none;
      font-weight: 800;
      font-size: 1.05rem;
      border-radius: 30px;
      box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4);
      letter-spacing: 0.04em;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .cta-btn:hover {
      transform: scale(1.03);
      box-shadow: 0 12px 28px rgba(245, 158, 11, 0.6);
    }
    footer {
      text-align: center;
      margin-top: 64px;
      font-size: 0.85rem;
      color: ${theme.textSecondary};
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 32px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- HERO SECTION COM CAPA E TÍTULO -->
    <div class="hero">
      <div class="cover-box">
        ${coverUrl ? `<img src="${coverUrl}" alt="${title}">` : '<div style="padding: 120px 20px; background: #1e293b; border-radius: 8px;">Capa Oficial</div>'}
      </div>
      <div>
        <span class="badge">${theme.moodTag || genre}</span>
        <h1>${title}</h1>
        ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
        <div class="author">POR ${author}</div>
        <div class="hook">&ldquo;${heroHook}&rdquo;</div>
      </div>
    </div>

    <!-- SINOPSE E APRESENTAÇÃO -->
    <div class="synopsis-card">
      <h2>${headline}</h2>
      <p>${synopsis}</p>
    </div>

    <!-- CITAÇÃO DE IMPACTO -->
    <div class="quote-box">
      <div class="text">&ldquo;${impactQuote}&rdquo;</div>
    </div>

    <!-- 3 CARDS DE DESTAQUE -->
    <div class="grid3">
      ${features.map(f => `
      <div class="tile">
        <h3>${f.title}</h3>
        <div class="sub">${f.subtitle || ''}</div>
        <p>${f.description}</p>
      </div>
      `).join('')}
    </div>

    ${promoImg && promoImg !== coverUrl ? `
    <!-- BANNER NARRATIVO CINEMATOGRÁFICO -->
    <div class="promo-banner">
      <img src="${promoImg}" alt="Cena da narrativa de ${title}">
    </div>
    ` : ''}

    <!-- FECHAMENTO E CHAMADA PARA AÇÃO -->
    <div class="closing-box">
      <h2>${closingQuestion}</h2>
      <a href="https://kdp.amazon.com" target="_blank" class="cta-btn">${closingCta}</a>
    </div>

    <!-- RODAPÉ EDITORIAL -->
    <footer>
      <p>Publicação Oficial Amazon KDP • Todos os direitos reservados a ${author}.</p>
    </footer>
  </div>
</body>
</html>`;
  }

  /**
   * Dispara o download de um arquivo .html no navegador
   */
  public static downloadHtmlFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Copia o texto para a área de transferência com fallback
   */
  public static async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (e) {
      console.error('Falha ao copiar para clipboard:', e);
      return false;
    }
  }
}
