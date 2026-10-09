import { sanitizarPromptArteSemTexto } from './kdp-orthography-engine';

export type CoverVisualStyle = 'minimalist' | 'cinematic' | 'concept' | 'abstract';
export type CoverTitleLayout = 'topo' | 'centro' | 'esquerda';
export type CoverTypographyPalette =
  | 'auto'
  | 'gold-luxury'
  | 'crimson-noir'
  | 'platinum-modern'
  | 'cyber-neon'
  | 'amber-warm'
  | 'clean-editorial';

export interface CoverTypographyStyleConfig {
  fontFamilyTitle: string;
  fontFamilySubtitle: string;
  fontFamilyAuthor: string;
  fontWeightTitle: string;
  fontWeightSubtitle: string;
  fontWeightAuthor: string;
  titleGradient: [string, string];
  subtitleColor: string;
  authorColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  authorLetterSpacing: boolean;
}

const COVER_STYLE_DIRECTIONS: Record<CoverVisualStyle, string> = {
  minimalist: 'Premium photorealistic editorial photography, restrained composition, natural directional light, authentic material texture, subtle depth of field, elegant negative space.',
  cinematic: 'Naturalistic cinematic photography on a 35mm lens, believable available light, nuanced shadows, subtle film grain, emotionally specific scene, lifelike materials.',
  concept: 'Handcrafted fine-art editorial illustration, expressive but controlled brushwork, layered pigments, tactile paper or canvas texture, sophisticated color harmony.',
  abstract: 'Intentional geometric fine-art composition, carefully balanced shapes, tactile matte surfaces, deliberate asymmetry, refined editorial color palette; not generic clip art or stock vectors.'
};

/**
 * Constrói cenários atmosféricos dinâmicos e cinematográficos, eliminando
 * cenários genéricos de interiores e ambientes monótonos de sala.
 */
export function buildAtmosphericSceneContext(genre: string, premise: string): string {
  const text = `${genre} ${premise}`.toLowerCase();

  // 1. Thriller Psicológico, Mistério, Suspense, Crime, Manipulação, Narcisismo
  if (
    text.includes('thriller') ||
    text.includes('suspense') ||
    text.includes('psicol') ||
    text.includes('mister') ||
    text.includes('narcis') ||
    text.includes('manipula') ||
    text.includes('crime') ||
    text.includes('paranoia') ||
    text.includes('segredo')
  ) {
    const cenarios = [
      'moody noir city boulevard at dusk in heavy cinematic rain, gleaming wet asphalt reflections, dramatic chiaroscuro contrast, volumetric streetlamp mist',
      'solitary enigmatic silhouette standing before massive brutalist architecture in thick evening fog, deep dramatic shadows, 35mm film grain aesthetic',
      'wind-swept rocky coastal cliff overlooking a tempestuous dark ocean under twilight storm clouds, solitary beacon light in the distance',
      'surreal fine-art architectural corridor of towering shadows and cool tungsten light cuts, dramatic psychological perspective, cinematic depth of field',
      'misty forest road at midnight with glowing car headlights piercing through dense atmospheric haze, ominous high-tension cinematic lighting'
    ];
    // Rotação determinística baseada no comprimento do texto para garantir variedade entre livros
    const index = Math.abs(text.length) % cenarios.length;
    return cenarios[index];
  }

  // 2. Não-Ficção, Negócios, Finanças, Liderança, Produtividade, Carreira
  if (
    text.includes('finan') ||
    text.includes('negoc') ||
    text.includes('lider') ||
    text.includes('invest') ||
    text.includes('carreira') ||
    text.includes('produtiv') ||
    text.includes('dinheiro') ||
    text.includes('gestao')
  ) {
    const cenarios = [
      'monumental modern glass and steel architectural monoliths catching golden hour reflections, expansive open sky, prestigious corporate fine-art minimalism',
      'sculptural obsidian marble geometric structures with subtle warm ambient glow, refined luxury editorial aesthetic, clean atmospheric space',
      'sweeping panoramic suspension bridge spanning across misty coastal harbor at dawn, inspiring horizon, dramatic architectural perspective'
    ];
    return cenarios[Math.abs(text.length) % cenarios.length];
  }

  // 3. Ficção Científica, Distopia, Cyberpunk, Espaço
  if (
    text.includes('sci-fi') ||
    text.includes('ficcao cient') ||
    text.includes('espaco') ||
    text.includes('cyber') ||
    text.includes('distopia') ||
    text.includes('futuro')
  ) {
    const cenarios = [
      'deep cosmos celestial panorama with luminous indigo nebula and distant ringed planet, sleek monolithic spacecraft silhouette',
      'futuristic rain-slicked megacity with soaring neon-lit skybridges and dramatic volumetric light beams, cinematic 35mm anamorphic aesthetic',
      'vast arid planetary desert with crystalline geological formations beneath two glowing twilight moons, epic atmospheric perspective'
    ];
    return cenarios[Math.abs(text.length) % cenarios.length];
  }

  // 4. Fantasia, Épico, Aventura, Mitologia
  if (
    text.includes('fantasia') ||
    text.includes('epico') ||
    text.includes('magia') ||
    text.includes('aventura') ||
    text.includes('reino')
  ) {
    const cenarios = [
      'ancient primeval moss-covered forest with rays of mystical golden morning sunlight filtering through ancient canopy, floating dust motes',
      'crumbling stone fortress ruins perched atop mist-shrouded mountain peaks at sunset, dramatic crimson and amber sky',
      'frozen glacial valley with ethereal emerald aurora borealis reflecting across dark reflective ice lake'
    ];
    return cenarios[Math.abs(text.length) % cenarios.length];
  }

  // 5. Romance, Drama, Sentimentos, Poesia
  if (
    text.includes('romance') ||
    text.includes('amor') ||
    text.includes('poesia') ||
    text.includes('drama') ||
    text.includes('paixao')
  ) {
    const cenarios = [
      'poetic sunset boulevard with soft golden hour light filtering through blossoming cherry trees, delicate warm bokeh, romantic cinematic depth',
      'serene European lakeside dock at twilight with gentle pastel reflections on still water, solitary bench under vintage streetlamp',
      'coastal sand dunes at sunrise with gentle sea mist and warm terracotta horizon light, tender evocative atmosphere'
    ];
    return cenarios[Math.abs(text.length) % cenarios.length];
  }

  // 6. Autoajuda, Espiritualidade, Mindfulness, Filosofia
  const cenariosGerais = [
    'solitary figure gazing at vast sunrise horizon from high mountain summit, golden morning rays piercing through rolling clouds, inspiring open sky',
    'minimalist tranquil zen pebble shoreline with crystal clear water reflections and gentle ambient sunrise, peaceful meditative balance',
    'sunlit forest pathway surrounded by tall towering pines leading toward an open glowing horizon, uplifting clarity'
  ];
  return cenariosGerais[Math.abs(text.length) % cenariosGerais.length];
}

/**
 * Construtor do Prompt de Arte da Capa:
 * Garante variedade cinematográfica e proíbe terminantemente o clichê monótono de sala de estar.
 */
export function buildCoverArtPrompt(
  genre: string,
  premise: string,
  sample: string,
  style: CoverVisualStyle,
  customPrompt = ''
): string {
  const subject = customPrompt.trim() || premise.trim() || sample.trim() || genre;
  const styleDirection = COVER_STYLE_DIRECTIONS[style];
  const sampleContext = sample.trim() && !customPrompt.trim()
    ? `Supporting narrative context: ${sample.trim().slice(0, 500)}.`
    : '';

  const dynamicAtmosphere = buildAtmosphericSceneContext(genre, premise);

  const sceneDirection = `Create a distinctive cinematic visual scene rooted in this exact subject: ${subject}. Genre and visual context: ${genre}. Cinematic environmental setting: ${dynamicAtmosphere}. ${sampleContext} Preserve the subject's real-world details and use a coherent, specific composition rather than a generic template.`;

  const realismDirection = 'Avoid waxy or plastic surfaces, uncanny faces, artificial anatomy, over-smoothed skin, excessive sharpening, generic 3D rendering, and unrelated decorative objects. STRICT SCENE RULE: NEVER generate an ordinary indoor living room, mundane domestic sofa, or generic domestic apartment room.';

  return sanitizarPromptArteSemTexto(
    genre,
    `${sceneDirection} ${styleDirection} ${realismDirection}`
  );
}

/**
 * Retorna as configurações tipográficas de excelência editorial e paleta de cores para a capa
 */
export function getCoverTypographyTheme(
  genre: string,
  tipoEstilo: 'modern-magazine' | 'luxury-serif' | 'bold-impact' = 'modern-magazine',
  paletteChoice: CoverTypographyPalette = 'auto'
): CoverTypographyStyleConfig {
  const g = (genre || '').toLowerCase();

  // Seleção automática da paleta baseada no gênero
  let palette = paletteChoice;
  if (palette === 'auto') {
    if (g.includes('thriller') || g.includes('suspense') || g.includes('crime') || g.includes('terror') || g.includes('mister')) {
      palette = 'crimson-noir';
    } else if (g.includes('fantasia') || g.includes('epico') || g.includes('luxo') || g.includes('historia')) {
      palette = 'gold-luxury';
    } else if (g.includes('sci-fi') || g.includes('ficcao') || g.includes('futuro') || g.includes('cyber')) {
      palette = 'cyber-neon';
    } else if (g.includes('romance') || g.includes('poesia') || g.includes('amor')) {
      palette = 'amber-warm';
    } else if (g.includes('finan') || g.includes('negoc') || g.includes('lider')) {
      palette = 'platinum-modern';
    } else {
      palette = 'clean-editorial';
    }
  }

  // Definição de famílias tipográficas por estilo
  let fontFamilyTitle = '"Montserrat", "Inter", -apple-system, sans-serif';
  let fontFamilySubtitle = '"Inter", "Montserrat", -apple-system, sans-serif';
  let fontFamilyAuthor = '"Montserrat", "Inter", -apple-system, sans-serif';
  let fontWeightTitle = '900';

  if (tipoEstilo === 'luxury-serif') {
    fontFamilyTitle = '"Playfair Display", "Cinzel", "Cormorant Garamond", Georgia, serif';
    fontFamilySubtitle = '"Cormorant Garamond", "Playfair Display", Georgia, serif';
    fontFamilyAuthor = '"Cinzel", "Playfair Display", Georgia, serif';
    fontWeightTitle = '800';
  } else if (tipoEstilo === 'bold-impact') {
    fontFamilyTitle = '"Oswald", "Bebas Neue", "Impact", "Arial Black", sans-serif';
    fontFamilySubtitle = '"Inter", "Montserrat", sans-serif';
    fontFamilyAuthor = '"Oswald", "Montserrat", sans-serif';
    fontWeightTitle = '900';
  }

  switch (palette) {
    case 'crimson-noir':
      return {
        fontFamilyTitle,
        fontFamilySubtitle,
        fontFamilyAuthor,
        fontWeightTitle,
        fontWeightSubtitle: '600',
        fontWeightAuthor: '700',
        titleGradient: ['#ffffff', '#fb7185'], // Branco gélido com dégradé carmim
        subtitleColor: '#f1f5f9',
        authorColor: '#fda4af',
        strokeColor: 'rgba(15, 23, 42, 0.85)',
        strokeWidth: 4,
        shadowColor: 'rgba(0, 0, 0, 0.95)',
        shadowBlur: 32,
        authorLetterSpacing: true
      };

    case 'gold-luxury':
      return {
        fontFamilyTitle: tipoEstilo === 'bold-impact' ? fontFamilyTitle : '"Cinzel", "Playfair Display", Georgia, serif',
        fontFamilySubtitle,
        fontFamilyAuthor,
        fontWeightTitle,
        fontWeightSubtitle: '600',
        fontWeightAuthor: '700',
        titleGradient: ['#fef08a', '#f59e0b'], // Ouro nobre imperial
        subtitleColor: '#fefce8',
        authorColor: '#fde68a',
        strokeColor: 'rgba(69, 26, 3, 0.75)',
        strokeWidth: 3,
        shadowColor: 'rgba(0, 0, 0, 0.95)',
        shadowBlur: 30,
        authorLetterSpacing: true
      };

    case 'platinum-modern':
      return {
        fontFamilyTitle,
        fontFamilySubtitle,
        fontFamilyAuthor,
        fontWeightTitle,
        fontWeightSubtitle: '600',
        fontWeightAuthor: '800',
        titleGradient: ['#ffffff', '#e2e8f0'], // Platina / Prata acetinada
        subtitleColor: '#f8fafc',
        authorColor: '#cbd5e1',
        strokeColor: 'rgba(15, 23, 42, 0.8)',
        strokeWidth: 4,
        shadowColor: 'rgba(0, 0, 0, 0.92)',
        shadowBlur: 28,
        authorLetterSpacing: true
      };

    case 'cyber-neon':
      return {
        fontFamilyTitle,
        fontFamilySubtitle,
        fontFamilyAuthor,
        fontWeightTitle,
        fontWeightSubtitle: '600',
        fontWeightAuthor: '700',
        titleGradient: ['#e0f2fe', '#38bdf8'], // Ciano elétrico
        subtitleColor: '#f0f9ff',
        authorColor: '#7dd3fc',
        strokeColor: 'rgba(8, 47, 73, 0.85)',
        strokeWidth: 4,
        shadowColor: 'rgba(0, 0, 0, 0.96)',
        shadowBlur: 32,
        authorLetterSpacing: true
      };

    case 'amber-warm':
      return {
        fontFamilyTitle: tipoEstilo === 'bold-impact' ? fontFamilyTitle : '"Playfair Display", Georgia, serif',
        fontFamilySubtitle,
        fontFamilyAuthor,
        fontWeightTitle,
        fontWeightSubtitle: '600',
        fontWeightAuthor: '700',
        titleGradient: ['#fef3c7', '#f97316'], // Âmbar terracota caloroso
        subtitleColor: '#fffbeb',
        authorColor: '#fed7aa',
        strokeColor: 'rgba(67, 20, 7, 0.8)',
        strokeWidth: 3,
        shadowColor: 'rgba(0, 0, 0, 0.94)',
        shadowBlur: 28,
        authorLetterSpacing: true
      };

    case 'clean-editorial':
    default:
      return {
        fontFamilyTitle,
        fontFamilySubtitle,
        fontFamilyAuthor,
        fontWeightTitle,
        fontWeightSubtitle: '600',
        fontWeightAuthor: '700',
        titleGradient: ['#ffffff', '#f1f5f9'], // Branco editorial de revista de luxo
        subtitleColor: '#f8fafc',
        authorColor: '#ffffff',
        strokeColor: 'rgba(15, 23, 42, 0.85)',
        strokeWidth: 4,
        shadowColor: 'rgba(0, 0, 0, 0.94)',
        shadowBlur: 26,
        authorLetterSpacing: true
      };
  }
}
