// ================================================================
// REPLICATE BOOK COVER PIPELINE — MOTOR OFICIAL DE CAPA COM IA
// Geração via Replicate FLUX.1 Schnell + Diagramação Tipográfica Estruturada KDP
// Layout: Título grande no topo, Subtítulo acima do autor, Autor na base.
// Gera: 1. Capa Frontal + 2. Contracapa + 3. Capa Aberta Completa KDP (Wrap)
// ================================================================

import { gerarImagemReplicate, REPLICATE_IMAGE_MODELS } from './replicate-service';
import { chamarImagen } from './kdp-ai-engine';
import {
  getCoverTypographyTheme,
  CoverTypographyStyleConfig,
  CoverVisualStyle,
  CoverTitleLayout
} from './kdp-cover-art-direction';
import { PrintCoverService } from './print-cover-service';
import { sanitizarPromptArteSemTexto, sanitizarOrtografiaEditorialCapa } from './kdp-orthography-engine';

export interface ReplicateCoverPipelineParams {
  titulo: string;
  subtitulo?: string;
  autor: string;
  genero: string;
  premissa?: string;
  amostraTexto?: string;
  estiloVisual?: CoverVisualStyle;
  tipoEstilo?: 'modern-magazine' | 'luxury-serif' | 'bold-impact';
  bookType?: string;
  faixaEtaria?: string;
  numeroPaginas?: number;
  customPrompt?: string;
  customTituloConfig?: {
    offsetY?: number;
    fontSize?: number;
    fontFamily?: string;
  };
}

export interface ReplicateCoverPipelineResult {
  promptEstruturado: string;
  fundoImgUrl: string;
  capaFrontalDataUrl: string;
  contracapaDataUrl: string;
  wrapDataUrl: string;
  modeloUsado: string;
}

/**
 * Constrói um prompt em inglês altamente estruturado, coeso e cinematográfico
 * para envio direto à API do Replicate (FLUX.1 Schnell / Dev).
 * Garante composição com respiro superior para título e base para subtítulo/autor,
 * e proíbe estritamente letras, textos ou selos falsos.
 */
export function construirPromptEstruturadoReplicate(dados: {
  titulo: string;
  subtitulo?: string;
  autor: string;
  genero: string;
  premissa?: string;
  amostraTexto?: string;
  estiloVisual?: CoverVisualStyle;
  customPrompt?: string;
  bookType?: string;
  faixaEtaria?: string;
}): string {
  const g = (dados.genero || 'Geral').toLowerCase();
  const premissa = dados.premissa || dados.titulo;
  const isKids =
    dados.bookType === 'children-picture-book' ||
    /infantil|crian[çc]|kids|children|3-5|6-8/i.test(`${g} ${premissa} ${dados.faixaEtaria || ''}`);

  if (isKids) {
    const subject = dados.customPrompt?.trim() || premissa.trim() || dados.titulo;
    const promptKids = `Enchanting and vibrant storybook cover illustration for children. Subject: ${subject}. Visual theme: joyful heartwarming scene with gentle magical ambiance. Character design: friendly, lovable, expressively joyful with smiling eyes. Style: rich Pixar 3D animated or luminous fairytale watercolor, warm comforting light, soft organic textures, cheerful palette. Clean uncluttered upper portion and bottom zone with ample negative space. Strict safety: zero dark, grim or spooky elements.`;
    return sanitizarPromptArteSemTexto(dados.genero, promptKids);
  }

  // Direção de cena e estilo baseada no gênero literário / não-ficção
  let sceneSubject = '';
  let lightingMood = '';
  let colorPalette = '';

  if (g.includes('thriller') || g.includes('suspense') || g.includes('crime') || g.includes('mister')) {
    sceneSubject = `solitary figure silhouette in a fog-veiled metropolitan rain-slicked boulevard at night, neo-noir atmosphere, moody architectural shadows`;
    lightingMood = `dramatic high-contrast chiaroscuro, cold cyan streetlamp mist intersecting warm amber neon reflections`;
    colorPalette = `deep obsidian black, slate midnight blue, glowing tungsten amber highlights`;
  } else if (g.includes('romance') || g.includes('drama') || g.includes('poesia') || g.includes('amor')) {
    sceneSubject = `poetic scenic view of a sun-drenched coastal terrace overlooking calm azure water, delicate wind-blown linen curtains, Mediterranean botanical elements`;
    lightingMood = `luminous golden-hour twilight, soft diffused atmospheric glow, ethereal lens flare`;
    colorPalette = `warm ivory, dusty rose, terracotta, warm gold, serene sky blue`;
  } else if (g.includes('sci-fi') || g.includes('ficcao cientifica') || g.includes('ficção científica') || g.includes('cyber') || g.includes('futuro')) {
    sceneSubject = `breathtaking futuristic skyline with organic biophilic spires soaring into a twilight nebula sky, sleek atmospheric transport trails`;
    lightingMood = `luminescent volumetric god-rays, deep space starlight with subtle iridescent edge rim-light`;
    colorPalette = `deep cosmos violet, electric cyan, obsidian, brushed titanium chrome`;
  } else if (g.includes('fantasia') || g.includes('epico') || g.includes('épico') || g.includes('magia')) {
    sceneSubject = `majestic ancient monolithic castle carved into craggy alpine peaks shrouded in sea of glowing dawn clouds, mythical realm vista`;
    lightingMood = `epic crepuscular sunrise beams cutting through mystic mountain mist, radiant ambient glow`;
    colorPalette = `regal deep navy, antique weathered gold, misty emerald, warm dawn coral`;
  } else if (g.includes('finan') || g.includes('negoc') || g.includes('gestao') || g.includes('gestão') || g.includes('lider')) {
    sceneSubject = `towering architectural glass and brushed metal corporate monolith reflecting clear expansive azure sky and horizon, inspiring structural geometry`;
    lightingMood = `brilliant crisp morning daylight, sharp specular architectural highlights, crystal-clear atmosphere`;
    colorPalette = `prestige navy blue, clean arctic white, subtle polished platinum and gold accents`;
  } else if (g.includes('autoajuda') || g.includes('desenvolvimento') || g.includes('habito') || g.includes('mente')) {
    sceneSubject = `inspiring minimalist open natural horizon with a serene winding pathway through mist toward a glowing dawn summit, profound clarity`;
    lightingMood = `uplifting golden sunrise breaking over tranquil horizons, radiant warmth, peaceful dawn`;
    colorPalette = `serene morning amber, crisp ivory, calm dawn teal, deep grounding earth tones`;
  } else {
    sceneSubject = `artistic fine-art conceptual scene inspired by ${premissa.slice(0, 160)}, harmonious visual metaphor, thoughtful focal balance`;
    lightingMood = `natural gallery studio directional lighting, gentle atmospheric depth, tactile organic texture`;
    colorPalette = `refined editorial palette of charcoal slate, antique gold, pure ivory`;
  }

  const customContext = dados.customPrompt?.trim()
    ? `Specific focal instruction: ${dados.customPrompt.trim()}.`
    : `Context: Inspired by the core premise "${premissa.slice(0, 220)}".`;

  const fullPrompt = [
    `Masterpiece book cover background visual art for "${dados.titulo}".`,
    customContext,
    `Central Scene: ${sceneSubject}.`,
    `Atmosphere & Lighting: ${lightingMood}.`,
    `Harmonious Colors: ${colorPalette}.`,
    `Composition: Vertical 2:3 aspect ratio book cover framing. Generous clean negative space across the upper third for headline book title placement and clean uncluttered lower zone for author name. Believable natural depth of field, authentic fine-art photography aesthetic, Hasselblad medium-format 80mm lens quality.`,
    `CRITICAL STRICT NEGATIVE RULE: Pure visual illustration only. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS, NO TYPOGRAPHY, NO LETTERING, NO FAKE WORDS, NO WATERMARK, NO LOGOS, NO BADGES, NO MEDALS, NO LABELS, NO STAMPS, NO FRAMES, clean pristine artwork.`
  ].join(' ');

  return sanitizarPromptArteSemTexto(dados.genero, fullPrompt);
}

/**
 * Função utilitária para carregar imagem de forma segura em HTML5 Canvas
 */
async function carregarElementoImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Falha ao carregar imagem para o canvas: ' + String(e)));
    img.src = url;
  });
}

/**
 * Quebra linhas de texto respeitando a largura máxima no Canvas
 */
function quebrarLinhasTexto(ctx: CanvasRenderingContext2D, texto: string, larguraMax: number): string[] {
  if (!texto) return [];
  const palavras = texto.trim().split(/\s+/);
  const linhas: string[] = [];
  let linhaAtual = '';

  for (let i = 0; i < palavras.length; i++) {
    const teste = linhaAtual ? `${linhaAtual} ${palavras[i]}` : palavras[i];
    const metrics = ctx.measureText(teste);
    if (metrics.width > larguraMax && linhaAtual) {
      linhas.push(linhaAtual);
      linhaAtual = palavras[i];
    } else {
      linhaAtual = teste;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);
  return linhas;
}

/**
 * Diagrama a Capa Frontal em Canvas de alta definição (1600x2400)
 * Layout estrito solicitado pelo usuário:
 * - TÍTULO: Lá em cima grande!
 * - SUBTÍTULO: Um pouco acima do nome do autor!
 * - NOME DO AUTOR: Na parte de baixo do livro!
 * - FONTE E FUNDO: Coerentes com o gênero da obra.
 */
export async function diagramarCapaFrontalCanvas(params: {
  capaImgUrl: string;
  obraTituloRaw: string;
  obraSubtitulo?: string;
  obraAutor: string;
  obraGenero: string;
  obraPremissa?: string;
  tipoEstilo?: 'modern-magazine' | 'luxury-serif' | 'bold-impact';
  customTituloConfig?: {
    offsetY?: number;
    fontSize?: number;
    fontFamily?: string;
  };
}): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 2400;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível obter contexto 2D do canvas da capa frontal');

  // Sanitização ortográfica editorial rigorosa
  const obraTitulo = sanitizarOrtografiaEditorialCapa(params.obraTituloRaw.trim());
  const obraSubtituloLimpo = params.obraSubtitulo ? sanitizarOrtografiaEditorialCapa(params.obraSubtitulo.trim()) : '';
  const obraAutorLimpo = sanitizarOrtografiaEditorialCapa(params.obraAutor.trim());

  // Carrega e desenha a arte de fundo com corte de 8% inferior para expurgar marcas residuais
  const img = await carregarElementoImagem(params.capaImgUrl);
  const srcW = img.naturalWidth || img.width || canvas.width;
  const srcH = img.naturalHeight || img.height || canvas.height;
  ctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, canvas.width, canvas.height);

  // Obtém as configurações tipográficas de excelência correspondentes ao gênero
  const configTipo = getCoverTypographyTheme(
    params.obraGenero,
    params.tipoEstilo || 'modern-magazine',
    'auto'
  );

  // ================================================================
  // 1. TÍTULO: MECANISMO OBRIGATÓRIO ANTI-CORTE KDP (SAFE-ZONE AUTO-FIT)
  // Margem segura física: 220px em cada lateral (> 0.65" KDP Safe Zone)
  // ================================================================
  let fontSizeTit = params.customTituloConfig?.fontSize || 116;
  if (!params.customTituloConfig?.fontSize) {
    if (obraTitulo.length > 50) fontSizeTit = 78;
    else if (obraTitulo.length > 32) fontSizeTit = 92;
    else if (obraTitulo.length > 20) fontSizeTit = 106;
    else if (obraTitulo.length < 14) fontSizeTit = 126;
  }

  const safeMarginX = 220;
  const larguraMaxTitulo = canvas.width - (safeMarginX * 2);
  const chosenFontFamily = params.customTituloConfig?.fontFamily || configTipo.fontFamilyTitle;

  let linhasTitulo: string[] = [];
  const palavrasTitulo = obraTitulo.toUpperCase().split(/\s+/);

  while (fontSizeTit >= 44) {
    ctx.font = `${configTipo.fontWeightTitle} ${fontSizeTit}px ${chosenFontFamily}`;
    linhasTitulo = quebrarLinhasTexto(ctx, obraTitulo.toUpperCase(), larguraMaxTitulo);
    const maxLinhaW = Math.max(...linhasTitulo.map(l => ctx.measureText(l).width));
    const maxPalavraW = Math.max(...palavrasTitulo.map(p => ctx.measureText(p).width));

    if (maxLinhaW <= larguraMaxTitulo && maxPalavraW <= larguraMaxTitulo) {
      break;
    }
    fontSizeTit -= 2;
  }

  // Posição centralizada no terço superior (lá em cima com respiro)
  const baseCentroTitulo = 420;
  const centroTitulo = baseCentroTitulo + (params.customTituloConfig?.offsetY || 0);

  ctx.font = `${configTipo.fontWeightTitle} ${fontSizeTit}px ${chosenFontFamily}`;
  ctx.shadowColor = configTipo.shadowColor;
  ctx.shadowBlur = configTipo.shadowBlur;
  ctx.textAlign = 'center';

  const lineHTit = Math.round(fontSizeTit * 1.16);
  const alturaTotalTit = linhasTitulo.length * lineHTit;

  let yTit = Math.round(centroTitulo - alturaTotalTit / 2 + fontSizeTit * 0.35);
  const xTitulo = canvas.width / 2;

  // Gradiente vertical para o título conferindo acabamento nobre
  const gradTitulo = ctx.createLinearGradient(0, yTit - lineHTit, 0, yTit + alturaTotalTit);
  gradTitulo.addColorStop(0, configTipo.titleGradient[0]);
  gradTitulo.addColorStop(1, configTipo.titleGradient[1]);

  linhasTitulo.forEach((linha) => {
    ctx.strokeStyle = configTipo.strokeColor;
    ctx.lineWidth = Math.min(configTipo.strokeWidth, Math.round(fontSizeTit * 0.08));
    ctx.strokeText(linha, xTitulo, yTit);
    ctx.fillStyle = gradTitulo;
    ctx.fillText(linha, xTitulo, yTit);
    yTit += lineHTit;
  });

  // ================================================================
  // 2. NOME DO AUTOR: NA PARTE DE BAIXO DO LIVRO (RODAPÉ ANTI-CORTE)
  // ================================================================
  const yAutor = canvas.height - 150;
  ctx.shadowBlur = configTipo.shadowBlur;
  ctx.shadowColor = configTipo.shadowColor;
  let fontSizeAutor = 44;
  ctx.fillStyle = configTipo.authorColor;
  ctx.textAlign = 'center';

  const spacedAutor = configTipo.authorLetterSpacing
    ? obraAutorLimpo.toUpperCase().split('').join(' ')
    : obraAutorLimpo;

  const maxAutorW = canvas.width - (safeMarginX * 2);
  while (fontSizeAutor >= 20) {
    ctx.font = `${configTipo.fontWeightAuthor} ${fontSizeAutor}px ${configTipo.fontFamilyAuthor}`;
    const autorW = ctx.measureText(spacedAutor).width;
    if (autorW <= maxAutorW) {
      break;
    }
    fontSizeAutor -= 2;
  }

  ctx.strokeStyle = configTipo.strokeColor;
  ctx.lineWidth = Math.max(2, configTipo.strokeWidth - 1);
  ctx.strokeText(spacedAutor, canvas.width / 2, yAutor);
  ctx.fillText(spacedAutor, canvas.width / 2, yAutor);

  // ================================================================
  // 3. SUBTÍTULO: UM POUCO ACIMA DO NOME DO AUTOR (ANTI-CORTE)
  // ================================================================
  if (obraSubtituloLimpo) {
    ctx.textAlign = 'center';
    let fontSizeSub = 40;
    if (obraSubtituloLimpo.length > 90) fontSizeSub = 32;
    else if (obraSubtituloLimpo.length > 55) fontSizeSub = 36;

    const margemSubX = 240;
    const larguraMaxSub = canvas.width - (margemSubX * 2);
    let linhasSub: string[] = [];
    const palavrasSub = obraSubtituloLimpo.split(/\s+/);

    while (fontSizeSub >= 20) {
      ctx.font = `${configTipo.fontWeightSubtitle} ${fontSizeSub}px ${configTipo.fontFamilySubtitle}`;
      linhasSub = quebrarLinhasTexto(ctx, obraSubtituloLimpo, larguraMaxSub);
      const maxSubW = Math.max(...linhasSub.map(l => ctx.measureText(l).width));
      const maxPalSubW = Math.max(...palavrasSub.map(p => ctx.measureText(p).width));
      if (maxSubW <= larguraMaxSub && maxPalSubW <= larguraMaxSub) {
        break;
      }
      fontSizeSub -= 2;
    }

    ctx.fillStyle = configTipo.subtitleColor;
    ctx.shadowColor = configTipo.shadowColor;
    ctx.shadowBlur = Math.round(configTipo.shadowBlur * 0.75);

    const lineHSub = Math.round(fontSizeSub * 1.34);
    const alturaTotalSub = linhasSub.length * lineHSub;

    // Posiciona exatamente acima do autor na base inferior
    const yBaseSub = yAutor - 90;
    let ySub = yBaseSub - alturaTotalSub + fontSizeSub;

    linhasSub.forEach((linha) => {
      ctx.strokeStyle = configTipo.strokeColor;
      ctx.lineWidth = Math.max(2, configTipo.strokeWidth - 1);
      ctx.strokeText(linha, canvas.width / 2, ySub);
      ctx.fillText(linha, canvas.width / 2, ySub);
      ySub += lineHSub;
    });
  }

  return canvas.toDataURL('image/png');
}

/**
 * Pipeline Completo: Replicate FLUX.1 + Capa Frontal + Contracapa + Wrap KDP Completo
 */
export async function executarPipelineCompletoCapaReplicate(
  params: ReplicateCoverPipelineParams
): Promise<ReplicateCoverPipelineResult> {
  const obTitle = params.titulo.trim();
  const obSub = params.subtitulo?.trim() || '';
  const obAuthor = params.autor.trim() || 'Autor Book Engin';
  const obGenre = params.genero || 'Geral';
  const obPremise = params.premissa?.trim() || obTitle;
  const numPags = params.numeroPaginas || 100;

  // 1. Gera prompt estruturado em inglês para o Replicate
  const promptEstruturado = construirPromptEstruturadoReplicate({
    titulo: obTitle,
    subtitulo: obSub,
    autor: obAuthor,
    genero: obGenre,
    premissa: obPremise,
    amostraTexto: params.amostraTexto,
    estiloVisual: params.estiloVisual || 'cinematic',
    customPrompt: params.customPrompt,
    bookType: params.bookType,
    faixaEtaria: params.faixaEtaria
  });

  // 2. Chama a API do Replicate (FLUX.1 Schnell) com fallback resiliente
  let fundoImgUrl: string;
  let modeloUsado = 'replicate-flux-1-schnell';

  try {
    fundoImgUrl = await gerarImagemReplicate(promptEstruturado, {
      aspectRatio: '2:3',
      model: REPLICATE_IMAGE_MODELS.FLUX_SCHNELL
    });
  } catch (err: any) {
    console.warn('[Pipeline Replicate] Fallback via chamarImagen:', err?.message);
    fundoImgUrl = await chamarImagen(promptEstruturado, '2:3');
    modeloUsado = 'flux-high-res-engine';
  }

  // 3. Diagrama a Capa Frontal 1600x2400 (Título grande no topo, Subtítulo acima do autor, Autor na base)
  const capaFrontalDataUrl = await diagramarCapaFrontalCanvas({
    capaImgUrl: fundoImgUrl,
    obraTituloRaw: obTitle,
    obraSubtitulo: obSub,
    obraAutor: obAuthor,
    obraGenero: obGenre,
    obraPremissa: obPremise,
    tipoEstilo: params.tipoEstilo || 'modern-magazine',
    customTituloConfig: params.customTituloConfig
  });

  // 4. Diagrama a Contracapa 1600x2400 com gancho, sinopse, benefícios e código de barras KDP
  const contracapaDataUrl = await PrintCoverService.diagramarContracapaCanvas({
    title: obTitle,
    subtitle: obSub,
    author: obAuthor,
    genre: obGenre,
    synopsis: obPremise,
    trimSize: '6x9',
    paperType: 'bw-white',
    textAlign: 'left'
  });

  // 5. Compõe o Wrap Completo KDP aberto (Contracapa + Lombada proporcional + Capa Frontal)
  const wrapDataUrl = await PrintCoverService.diagramarWrapCompositeCanvas({
    frontCoverDataUrl: capaFrontalDataUrl,
    backCoverDataUrl: contracapaDataUrl,
    title: obTitle,
    author: obAuthor,
    pageCount: numPags,
    trimSize: '6x9',
    paperType: 'bw-white',
    showGuides: true
  });

  return {
    promptEstruturado,
    fundoImgUrl,
    capaFrontalDataUrl,
    contracapaDataUrl,
    wrapDataUrl,
    modeloUsado
  };
}
