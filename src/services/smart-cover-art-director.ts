// ================================================================
// SMART COVER ART DIRECTOR — MOTOR INTELIGENTE DE DIREÇÃO DE ARTE
// Variação Visual Real, Histórico Anti-Repetição, Suporte a Séries
// e Biblioteca Tipográfica Profissional por Gênero
// ================================================================

import { CoverTypographyPalette } from './kdp-cover-art-direction';

export type BookCoverGenreCategory =
  | 'thriller-suspense'
  | 'romance-drama'
  | 'ficcao-cientifica'
  | 'fantasia-epico'
  | 'nao-ficcao-negocios'
  | 'autoajuda-desenvolvimento'
  | 'terror-horror'
  | 'policial-crime'
  | 'poesia-literario';

export interface CoverVisualHistoryEntry {
  bookId: string;
  title: string;
  genre: string;
  sceneTheme: string;
  paletteColors: string[];
  cameraAngle: string;
  lightingType: string;
  timestamp: number;
}

export interface CoverTypographyPreset {
  genre: BookCoverGenreCategory;
  name: string;
  titleFont: string;
  subtitleFont: string;
  authorFont: string;
  titleCase: 'uppercase' | 'capitalize' | 'small-caps';
  letterSpacing: string;
  alignment: 'center' | 'left' | 'top';
  palette: CoverTypographyPalette;
  primaryColor: string;
  secondaryColor: string;
  contrastMode: 'dark-background' | 'light-background' | 'vibrant';
}

export interface CoverArtDossier {
  bookId: string;
  title: string;
  subtitle: string;
  author: string;
  genre: string;
  isSeries: boolean;
  seriesId?: string;
  seriesVolumeNumber?: number;
  emotionalTone: string;
  timeEra: string;
  settingLocation: string;
  keyVisualElements: string[];
  selectedPreset: CoverTypographyPreset;
  scenePrompt: string;
  negativePrompt: string;
  composition: {
    cameraAngle: string;
    framing: string;
    lighting: string;
    focalPoint: string;
    paletteColors: string[];
    artStyle: string;
  };
  typographyRules: {
    titleFontFamily: string;
    titleWeight: string;
    titleColor: string;
    titleCase: string;
    subtitleColor: string;
    authorColor: string;
    hasBackdropBand: boolean;
  };
  diversityAnalysis: {
    divergedFromPreviousBook: boolean;
    avoidedThemes: string[];
    preservedSeriesIdentity: boolean;
  };
}

export class SmartCoverArtDirector {
  // Histórico em memória de capas recentes geradas pelo usuário
  private static recentCoversHistory: CoverVisualHistoryEntry[] = [];

  /**
   * Biblioteca de Presets Tipográficos Profissionais por Gênero
   */
  public static readonly TYPOGRAPHY_PRESETS: Record<BookCoverGenreCategory, CoverTypographyPreset[]> = {
    'thriller-suspense': [
      {
        genre: 'thriller-suspense',
        name: 'Noir Impact Condensado',
        titleFont: 'Impact, "Bebas Neue", "Arial Black", sans-serif',
        subtitleFont: '"Helvetica Neue", Arial, sans-serif',
        authorFont: '"Helvetica Neue", Arial, sans-serif',
        titleCase: 'uppercase',
        letterSpacing: '0.15em',
        alignment: 'center',
        palette: 'crimson-noir',
        primaryColor: '#dc2626',
        secondaryColor: '#ffffff',
        contrastMode: 'dark-background'
      },
      {
        genre: 'thriller-suspense',
        name: 'Gélido Psicológico',
        titleFont: '"Oswald", "Trebuchet MS", sans-serif',
        subtitleFont: 'Arial, sans-serif',
        authorFont: 'Arial, sans-serif',
        titleCase: 'uppercase',
        letterSpacing: '0.2em',
        alignment: 'left',
        palette: 'cyber-neon',
        primaryColor: '#38bdf8',
        secondaryColor: '#f1f5f9',
        contrastMode: 'dark-background'
      }
    ],
    'romance-drama': [
      {
        genre: 'romance-drama',
        name: 'Serif Clássico Editorial',
        titleFont: '"Playfair Display", "Times New Roman", Georgia, serif',
        subtitleFont: 'Georgia, serif',
        authorFont: '"Playfair Display", serif',
        titleCase: 'capitalize',
        letterSpacing: '0.05em',
        alignment: 'center',
        palette: 'gold-luxury',
        primaryColor: '#fef08a',
        secondaryColor: '#f8fafc',
        contrastMode: 'dark-background'
      },
      {
        genre: 'romance-drama',
        name: 'Elegância Contemporânea',
        titleFont: '"Cormorant Garamond", "Baskerville", serif',
        subtitleFont: 'Arial, sans-serif',
        authorFont: '"Cormorant Garamond", serif',
        titleCase: 'uppercase',
        letterSpacing: '0.12em',
        alignment: 'center',
        palette: 'amber-warm',
        primaryColor: '#fbbf24',
        secondaryColor: '#ffffff',
        contrastMode: 'dark-background'
      }
    ],
    'ficcao-cientifica': [
      {
        genre: 'ficcao-cientifica',
        name: 'Monolítico Sci-Fi',
        titleFont: '"Michroma", "Montserrat", "Arial Black", sans-serif',
        subtitleFont: '"Roboto Mono", monospace',
        authorFont: '"Montserrat", sans-serif',
        titleCase: 'uppercase',
        letterSpacing: '0.25em',
        alignment: 'center',
        palette: 'cyber-neon',
        primaryColor: '#22d3ee',
        secondaryColor: '#e2e8f0',
        contrastMode: 'dark-background'
      }
    ],
    'fantasia-epico': [
      {
        genre: 'fantasia-epico',
        name: 'Crônicas Lapidares',
        titleFont: '"Cinzel", "Trajan Pro", "Times New Roman", serif',
        subtitleFont: '"Cinzel Decorative", serif',
        authorFont: '"Cinzel", serif',
        titleCase: 'uppercase',
        letterSpacing: '0.18em',
        alignment: 'center',
        palette: 'gold-luxury',
        primaryColor: '#f59e0b',
        secondaryColor: '#ffffff',
        contrastMode: 'dark-background'
      }
    ],
    'nao-ficcao-negocios': [
      {
        genre: 'nao-ficcao-negocios',
        name: 'Monólito Corporativo',
        titleFont: '"Inter", "Helvetica Neue", Arial, sans-serif',
        subtitleFont: '"Inter", sans-serif',
        authorFont: '"Inter", sans-serif',
        titleCase: 'uppercase',
        letterSpacing: '0.08em',
        alignment: 'center',
        palette: 'platinum-modern',
        primaryColor: '#ffffff',
        secondaryColor: '#38bdf8',
        contrastMode: 'dark-background'
      }
    ],
    'autoajuda-desenvolvimento': [
      {
        genre: 'autoajuda-desenvolvimento',
        name: 'Inspiração Editorial Limpa',
        titleFont: '"Lora", Georgia, serif',
        subtitleFont: 'Arial, sans-serif',
        authorFont: '"Lora", serif',
        titleCase: 'capitalize',
        letterSpacing: '0.06em',
        alignment: 'center',
        palette: 'clean-editorial',
        primaryColor: '#ffffff',
        secondaryColor: '#fcd34d',
        contrastMode: 'dark-background'
      }
    ],
    'terror-horror': [
      {
        genre: 'terror-horror',
        name: 'Abismo Sombrio',
        titleFont: '"Nosifer", "Creepster", "Franklin Gothic Heavy", sans-serif',
        subtitleFont: 'Arial, sans-serif',
        authorFont: 'Arial, sans-serif',
        titleCase: 'uppercase',
        letterSpacing: '0.18em',
        alignment: 'center',
        palette: 'crimson-noir',
        primaryColor: '#ef4444',
        secondaryColor: '#cbd5e1',
        contrastMode: 'dark-background'
      }
    ],
    'policial-crime': [
      {
        genre: 'policial-crime',
        name: 'Investigação Forense',
        titleFont: '"Roboto Condensed", "Arial Black", sans-serif',
        subtitleFont: 'Arial, sans-serif',
        authorFont: '"Roboto Condensed", sans-serif',
        titleCase: 'uppercase',
        letterSpacing: '0.14em',
        alignment: 'center',
        palette: 'amber-warm',
        primaryColor: '#f59e0b',
        secondaryColor: '#f8fafc',
        contrastMode: 'dark-background'
      }
    ],
    'poesia-literario': [
      {
        genre: 'poesia-literario',
        name: 'Poética Minimalista',
        titleFont: '"EB Garamond", "Times New Roman", serif',
        subtitleFont: 'Georgia, serif',
        authorFont: '"EB Garamond", serif',
        titleCase: 'capitalize',
        letterSpacing: '0.1em',
        alignment: 'center',
        palette: 'clean-editorial',
        primaryColor: '#ffffff',
        secondaryColor: '#e2e8f0',
        contrastMode: 'dark-background'
      }
    ]
  };

  /**
   * Produz o briefing de direção de arte inteligente com histórico anti-repetição
   */
  public static generateArtDirectionBrief(
    book: {
      id?: string;
      title: string;
      subtitle?: string;
      author?: string;
      genre?: string;
      synopsis?: string;
      audience?: string;
      tone?: string;
      isSeries?: boolean;
      seriesName?: string;
    },
    recentHistory: any[] = []
  ): CoverArtDossier & {
    palette: { background: string; primaryAccent: string; secondaryAccent: string; text: string };
    composition: { cameraPerspective: string; framing: string; lighting: string };
    typography: { bodyFont: string; headingFont: string; titleCase: string };
    seriesConsistency?: { seriesName: string };
  } {
    const rawGenre = (book.genre || 'Ficção').toLowerCase();
    const genreCategory = this.resolveGenreCategory(rawGenre);
    const presets = this.TYPOGRAPHY_PRESETS[genreCategory] || this.TYPOGRAPHY_PRESETS['thriller-suspense'];
    const isSeries = Boolean(book.isSeries);

    const sceneOptions = this.getVariedSceneOptions(genreCategory);
    let chosenScene = sceneOptions[0];

    // Se houver histórico recente, varia para evitar mesmice em livros independentes
    const last = recentHistory[recentHistory.length - 1];
    if (!isSeries && last && last.palette?.background) {
      const altScene = sceneOptions.find(s => s.colors[0] !== last.palette.background) || sceneOptions[1 % sceneOptions.length];
      if (altScene) chosenScene = altScene;
    }

    const preset = presets[0];
    const headingFont = isSeries && last?.typography?.headingFont ? last.typography.headingFont : preset.titleFont;
    const bodyFont = preset.subtitleFont;

    const dossier = this.createCoverArtDossier({
      bookId: book.id || `book_${Date.now()}`,
      title: book.title,
      subtitle: book.subtitle,
      author: book.author || 'Autor da Obra',
      genre: book.genre,
      synopsis: book.synopsis,
      isSeries,
      seriesId: book.seriesName
    });

    return {
      ...dossier,
      palette: {
        background: chosenScene.colors[0] || '#090d16',
        primaryAccent: preset.primaryColor || '#f59e0b',
        secondaryAccent: chosenScene.colors[1] || '#38bdf8',
        text: '#ffffff'
      },
      composition: {
        ...dossier.composition,
        cameraPerspective: chosenScene.cameraAngle
      },
      typography: {
        bodyFont,
        headingFont,
        titleCase: preset.titleCase
      },
      seriesConsistency: isSeries ? { seriesName: book.seriesName || 'Franquia' } : undefined
    };
  }

  /**
   * Renderiza SVG de alta resolução vetorial 2:3 (1600x2400) com tipografia de revista
   */
  public static generateSvgCover(brief: any, versionNumber: number = 1): string {
    const title = (brief.title || 'LIVRO').toUpperCase();
    const author = (brief.author || 'AUTOR').toUpperCase();
    const subtitle = brief.subtitle || '';
    const palette = brief.palette || { background: '#090d16', primaryAccent: '#f59e0b', text: '#ffffff' };
    const font = brief.typography?.headingFont || '"Cinzel", serif';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 2400" width="1600" height="2400">
      <defs>
        <linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.background}" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>
      <rect width="1600" height="2400" fill="url(#bgG)" />
      <rect x="60" y="60" width="1480" height="2280" fill="none" stroke="${palette.primaryAccent}" stroke-width="2" opacity="0.3" />
      <text x="800" y="480" font-family=${font} font-size="84" font-weight="800" fill="${palette.primaryAccent}" text-anchor="middle" letter-spacing="4">
        ${title}
      </text>
      ${subtitle ? `<text x="800" y="580" font-family="Arial, sans-serif" font-size="36" fill="#cbd5e1" text-anchor="middle">${subtitle}</text>` : ''}
      <text x="800" y="2180" font-family=${font} font-size="46" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="6">
        ${author}
      </text>
    </svg>`;
  }

  /**
   * Produz a Ficha de Direção de Arte Exclusiva para a Obra
   */
  public static createCoverArtDossier(params: {
    bookId: string;
    title: string;
    subtitle?: string;
    author: string;
    genre?: string;
    synopsis?: string;
    isSeries?: boolean;
    seriesId?: string;
    seriesVolumeNumber?: number;
  }): CoverArtDossier {
    const rawGenre = (params.genre || 'Ficção').toLowerCase();
    const genreCategory = this.resolveGenreCategory(rawGenre);
    const presets = this.TYPOGRAPHY_PRESETS[genreCategory] || this.TYPOGRAPHY_PRESETS['thriller-suspense'];
    const selectedPreset = presets[0];

    // Consulta histórico recente para forçar diversidade se for livro independente
    const lastCover = this.recentCoversHistory[this.recentCoversHistory.length - 1];
    const isSeries = Boolean(params.isSeries);
    const avoidedThemes: string[] = [];

    // Banco de Variações Cenográficas Ricas por Gênero (Múltiplas opções ortogonais)
    const sceneOptions = this.getVariedSceneOptions(genreCategory);
    let chosenScene = sceneOptions[0];

    if (!isSeries && lastCover) {
      // Se a última capa usou um tema específico, escolhe um diferente
      avoidedThemes.push(lastCover.sceneTheme);
      const filtered = sceneOptions.filter(opt => !opt.theme.includes(lastCover.sceneTheme));
      chosenScene = filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : sceneOptions[1 % sceneOptions.length];
    } else if (isSeries && lastCover && params.seriesId) {
      // Em séries, mantém a paleta e iluminação aproximada para consistência
      chosenScene = {
        theme: `Continuidade da série: ${params.title}`,
        prompt: `${chosenScene.prompt}, unified aesthetic consistent with series universe, recurring visual symbolism`,
        cameraAngle: lastCover.cameraAngle || 'eye-level cinematic',
        framing: 'central heroic',
        lighting: lastCover.lightingType || 'dramatic directional atmospheric',
        colors: lastCover.paletteColors || ['#0f172a', '#d97706', '#f8fafc'],
        artStyle: 'cinematic 35mm photography'
      };
    }

    // Registra no histórico visual recente
    this.recordCoverHistory({
      bookId: params.bookId,
      title: params.title,
      genre: genreCategory,
      sceneTheme: chosenScene.theme,
      paletteColors: chosenScene.colors,
      cameraAngle: chosenScene.cameraAngle,
      lightingType: chosenScene.lighting,
      timestamp: Date.now()
    });

    const fullVisualPrompt = `Award-winning commercial book cover artwork for "${params.title}". ${chosenScene.prompt}. Composition: ${chosenScene.framing}, camera perspective: ${chosenScene.cameraAngle}, lighting: ${chosenScene.lighting}. Clean upper and lower zones for professional typography. High visual contrast, premium cinematic aesthetic, 8k resolution, professional technical execution. NO TEXT, NO LETTERS, NO TYPOGRAPHY, NO BADGES, NO LOGOS, NO WATERMARKS.`;

    const negativePrompt = 'text, letters, typography, words, watermark, logos, blurry, low quality, distorted anatomy, deformed hands, extra fingers, generic stock clip-art, oversaturated amateur illustration';

    return {
      bookId: params.bookId,
      title: params.title,
      subtitle: params.subtitle || '',
      author: params.author,
      genre: genreCategory,
      isSeries,
      seriesId: params.seriesId,
      seriesVolumeNumber: params.seriesVolumeNumber,
      emotionalTone: 'Impactante e envolvente',
      timeEra: 'Contemporâneo / Atemporal',
      settingLocation: chosenScene.theme,
      keyVisualElements: [chosenScene.theme, 'Iluminação focal', 'Contraste dramático'],
      selectedPreset,
      scenePrompt: fullVisualPrompt,
      negativePrompt,
      composition: {
        cameraAngle: chosenScene.cameraAngle,
        framing: chosenScene.framing,
        lighting: chosenScene.lighting,
        focalPoint: chosenScene.theme,
        paletteColors: chosenScene.colors,
        artStyle: chosenScene.artStyle
      },
      typographyRules: {
        titleFontFamily: selectedPreset.titleFont,
        titleWeight: '800',
        titleColor: selectedPreset.primaryColor,
        titleCase: selectedPreset.titleCase,
        subtitleColor: selectedPreset.secondaryColor,
        authorColor: '#ffffff',
        hasBackdropBand: true
      },
      diversityAnalysis: {
        divergedFromPreviousBook: !isSeries && Boolean(lastCover),
        avoidedThemes,
        preservedSeriesIdentity: isSeries
      }
    };
  }

  /**
   * Salva no histórico de capas para prevenção de repetição
   */
  public static recordCoverHistory(entry: CoverVisualHistoryEntry) {
    this.recentCoversHistory.push(entry);
    if (this.recentCoversHistory.length > 20) {
      this.recentCoversHistory.shift();
    }
  }

  /**
   * Retorna o histórico de capas recentes
   */
  public static getRecentHistory(): CoverVisualHistoryEntry[] {
    return [...this.recentCoversHistory];
  }

  /**
   * Limpa o histórico (para testes ou reinicialização)
   */
  public static clearHistory() {
    this.recentCoversHistory = [];
  }

  private static resolveGenreCategory(rawGenre: string): BookCoverGenreCategory {
    const g = rawGenre.toLowerCase();
    if (g.includes('thriller') || g.includes('suspense') || g.includes('mistério')) return 'thriller-suspense';
    if (g.includes('romance') || g.includes('drama')) return 'romance-drama';
    if (g.includes('sci-fi') || g.includes('ficção científica') || g.includes('cyber')) return 'ficcao-cientifica';
    if (g.includes('fantasia') || g.includes('épico') || g.includes('magia')) return 'fantasia-epico';
    if (g.includes('negócio') || g.includes('finança') || g.includes('gestão')) return 'nao-ficcao-negocios';
    if (g.includes('autoajuda') || g.includes('desenvolvimento') || g.includes('hábito')) return 'autoajuda-desenvolvimento';
    if (g.includes('terror') || g.includes('horror')) return 'terror-horror';
    if (g.includes('policial') || g.includes('crime')) return 'policial-crime';
    return 'poesia-literario';
  }

  private static getVariedSceneOptions(genre: BookCoverGenreCategory): Array<{
    theme: string;
    prompt: string;
    cameraAngle: string;
    framing: string;
    lighting: string;
    colors: string[];
    artStyle: string;
  }> {
    switch (genre) {
      case 'thriller-suspense':
      case 'policial-crime':
        return [
          {
            theme: 'Avenida metropolitana sob temporal noturno',
            prompt: 'rain-slicked urban asphalt reflecting neon city lights, dramatic high-contrast noir shadows, solitary trenchcoat silhouette in the distance, volumetric fog',
            cameraAngle: 'low-angle wide shot',
            framing: 'asymmetrical vertical',
            lighting: 'tungsten streetlamp and cold cyan mist',
            colors: ['#090d16', '#0ea5e9', '#dc2626'],
            artStyle: 'hyper-realistic noir cinematography'
          },
          {
            theme: 'Península costeira deserta sob tempestade',
            prompt: 'craggy oceanic sea-cliff lashed by tempestuous waves at twilight, solitary dark lighthouse silhouette on the horizon, ominous thunderclouds',
            cameraAngle: 'three-quarter overhead angle',
            framing: 'dramatic centered',
            lighting: 'pale moonlight slicing through storm clouds',
            colors: ['#0f172a', '#334155', '#94a3b8'],
            artStyle: 'dramatic landscape photography'
          },
          {
            theme: 'Corredor brutalista de concreto e sombras',
            prompt: 'towering brutalist concrete architectural corridors, sharp angular cuts of harsh late-afternoon sunlight, stark deep shadows, minimalist psychological perspective',
            cameraAngle: 'straight-on symmetrical perspective',
            framing: 'severe geometric symmetry',
            lighting: 'hard directional rake light',
            colors: ['#18181b', '#71717a', '#f59e0b'],
            artStyle: 'fine-art architectural minimalism'
          }
        ];

      case 'romance-drama':
        return [
          {
            theme: 'Costa mediterrânea ao entardecer dourado',
            prompt: 'sun-drenched coastal terrace overlooking turquoise waters at golden hour, billowing linen curtains, warm romantic glow, delicate botanical shadows',
            cameraAngle: 'eye-level soft focus',
            framing: 'atmospheric rule of thirds',
            lighting: 'warm golden hour sun flare',
            colors: ['#451a03', '#f59e0b', '#38bdf8'],
            artStyle: 'warm fine-art editorial photography'
          },
          {
            theme: 'Jardim de inverno com pétalas e névoa matinal',
            prompt: 'misty glass botanical greenhouse at dawn, delicate dew drops on glass panes, blooming heritage roses, ethereal soft morning light',
            cameraAngle: 'intimate close perspective with depth',
            framing: 'lush organic framing',
            lighting: 'diffused pastel dawn light',
            colors: ['#064e3b', '#f43f5e', '#fef3c7'],
            artStyle: 'ethereal fine-art romantic portrait'
          }
        ];

      case 'nao-ficcao-negocios':
      case 'autoajuda-desenvolvimento':
        return [
          {
            theme: 'Monólito de vidro e reflexos solares',
            prompt: 'geometric crystalline glass and obsidian monolith soaring into clear azure sky, crisp sharp angles, inspiring horizon line, modern corporate prestige',
            cameraAngle: 'steep upward architectural perspective',
            framing: 'dynamic vertical ascent',
            lighting: 'brilliant natural daylight with sharp specular highlights',
            colors: ['#0284c7', '#0f172a', '#ffffff'],
            artStyle: 'prestige architectural minimalism'
          },
          {
            theme: 'Ponte suspensa estaiada na névoa da alvorada',
            prompt: 'majestic modern suspension bridge towers piercing through peaceful morning fog over still water, metaphorical path forward, serene dawn horizon',
            cameraAngle: 'epic sweeping wide-angle',
            framing: 'leading lines toward infinity',
            lighting: 'subtle rose-gold sunrise gradient',
            colors: ['#1e293b', '#fb923c', '#e0f2fe'],
            artStyle: 'inspirational fine-art photography'
          }
        ];

      default:
        return [
          {
            theme: 'Composição conceitual contemporânea',
            prompt: 'sculptural marble and brushed brass abstract geometry resting in calm minimalist editorial space, tactile organic textures, pristine lighting',
            cameraAngle: 'elevated three-quarter studio view',
            framing: 'balanced editorial center',
            lighting: 'soft diffused gallery illumination',
            colors: ['#1e293b', '#e2e8f0', '#d97706'],
            artStyle: 'premium fine-art still life'
          }
        ];
    }
  }
}
