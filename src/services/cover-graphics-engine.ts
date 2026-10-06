// ============================================================================
// MOTOR DE GERAÇÃO GRÁFICA DE CAPAS CONTEXTUAIS KDP EM ALTA DEFINIÇÃO
// Gera capas profissionais para a Amazon KDP em formato 6x9 (proporção 1:1.5)
// com arte vetorial contextualizada ao gênero, tipografia impactante,
// sombras, vinhetas e selos editoriais comerciais.
// ============================================================================

export interface CoverGraphicsOptions {
  title: string;
  subtitle?: string;
  author: string;
  genre: string;
  styleId?: string;
  keywords?: string[];
}

interface PaletteTheme {
  bgGradient: [string, string, string];
  titleColor: string;
  subtitleColor: string;
  authorColor: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  iconType: 'compass' | 'brain' | 'circuit' | 'gear' | 'shield' | 'heart' | 'book' | 'mountain' | 'tree' | 'dollar';
}

const PALETTES_BY_GENRE: Record<string, PaletteTheme> = {
  business: {
    bgGradient: ['#0f172a', '#1e293b', '#090d16'],
    titleColor: '#ffffff',
    subtitleColor: '#94a3b8',
    authorColor: '#f8fafc',
    accentColor: '#38bdf8',
    badgeBg: '#0284c7',
    badgeText: '#ffffff',
    iconType: 'compass'
  },
  'self-help': {
    bgGradient: ['#18181b', '#27272a', '#09090b'],
    titleColor: '#fafafa',
    subtitleColor: '#a1a1aa',
    authorColor: '#fbbf24',
    accentColor: '#fbbf24',
    badgeBg: '#d97706',
    badgeText: '#000000',
    iconType: 'brain'
  },
  finance: {
    bgGradient: ['#022c22', '#064e3b', '#021e17'],
    titleColor: '#ffffff',
    subtitleColor: '#6ee7b7',
    authorColor: '#fbbf24',
    accentColor: '#34d399',
    badgeBg: '#059669',
    badgeText: '#ffffff',
    iconType: 'dollar'
  },
  health: {
    bgGradient: ['#064e3b', '#047857', '#022c22'],
    titleColor: '#f0fdf4',
    subtitleColor: '#a7f3d0',
    authorColor: '#ffffff',
    accentColor: '#10b981',
    badgeBg: '#10b981',
    badgeText: '#ffffff',
    iconType: 'tree'
  },
  thriller: {
    bgGradient: ['#1c1917', '#292524', '#0c0a09'],
    titleColor: '#ef4444',
    subtitleColor: '#d6d3d1',
    authorColor: '#fafaf9',
    accentColor: '#dc2626',
    badgeBg: '#991b1b',
    badgeText: '#ffffff',
    iconType: 'shield'
  },
  scifi: {
    bgGradient: ['#0b0f19', '#1e1b4b', '#030712'],
    titleColor: '#38bdf8',
    subtitleColor: '#c7d2fe',
    authorColor: '#818cf8',
    accentColor: '#818cf8',
    badgeBg: '#4f46e5',
    badgeText: '#ffffff',
    iconType: 'circuit'
  },
  fantasy: {
    bgGradient: ['#2e1065', '#3b0764', '#0f051d'],
    titleColor: '#fef08a',
    subtitleColor: '#e9d5ff',
    authorColor: '#fde047',
    accentColor: '#c084fc',
    badgeBg: '#7e22ce',
    badgeText: '#ffffff',
    iconType: 'mountain'
  },
  romance: {
    bgGradient: ['#4c0519', '#701a75', '#1f020a'],
    titleColor: '#ffffff',
    subtitleColor: '#fbcfe8',
    authorColor: '#f472b6',
    accentColor: '#fb7185',
    badgeBg: '#be123c',
    badgeText: '#ffffff',
    iconType: 'heart'
  },
  technical: {
    bgGradient: ['#0c1a2e', '#1e293b', '#060d17'],
    titleColor: '#f8fafc',
    subtitleColor: '#94a3b8',
    authorColor: '#38bdf8',
    accentColor: '#0ea5e9',
    badgeBg: '#0284c7',
    badgeText: '#ffffff',
    iconType: 'gear'
  },
  history: {
    bgGradient: ['#291e14', '#3d2b1f', '#140d07'],
    titleColor: '#fef3c7',
    subtitleColor: '#d1b89d',
    authorColor: '#fcd34d',
    accentColor: '#d97706',
    badgeBg: '#78350f',
    badgeText: '#ffffff',
    iconType: 'book'
  }
};

export class CoverGraphicsEngine {
  /**
   * Identifica o tema estético baseado no gênero e palavras-chave
   */
  private static resolvePalette(genre: string, styleId?: string): PaletteTheme {
    const g = (genre || '').toLowerCase();
    if (g.includes('finan') || g.includes('dinheiro') || g.includes('invest') || g.includes('cripto')) {
      return PALETTES_BY_GENRE.finance;
    }
    if (g.includes('saúde') || g.includes('saude') || g.includes('longevidade') || g.includes('biohack')) {
      return PALETTES_BY_GENRE.health;
    }
    if (g.includes('thriller') || g.includes('mistério') || g.includes('crime') || g.includes('suspense') || g.includes('terror')) {
      return PALETTES_BY_GENRE.thriller;
    }
    if (g.includes('ficção científica') || g.includes('cyber') || g.includes('ia') || g.includes('tecnologia') || g.includes('program')) {
      return PALETTES_BY_GENRE.scifi;
    }
    if (g.includes('fantasia') || g.includes('magia') || g.includes('mitolog')) {
      return PALETTES_BY_GENRE.fantasy;
    }
    if (g.includes('romance') || g.includes('amor')) {
      return PALETTES_BY_GENRE.romance;
    }
    if (g.includes('manual') || g.includes('fazer') || g.includes('diy') || g.includes('marcen') || g.includes('rádio') || g.includes('solar')) {
      return PALETTES_BY_GENRE.technical;
    }
    if (g.includes('história') || g.includes('filosofia') || g.includes('biografia') || g.includes('memórias')) {
      return PALETTES_BY_GENRE.history;
    }
    if (g.includes('autoajuda') || g.includes('hábito') || g.includes('mente') || g.includes('psicolog')) {
      return PALETTES_BY_GENRE['self-help'];
    }
    return PALETTES_BY_GENRE.business;
  }

  /**
   * Desenha ícones vetoriais contextuais centralizados
   */
  private static renderContextualVectorSvg(iconType: string, accentColor: string): string {
    switch (iconType) {
      case 'compass':
        return `
          <g transform="translate(400, 680)" stroke="${accentColor}" stroke-width="6" fill="none">
            <circle cx="0" cy="0" r="140" opacity="0.25"/>
            <circle cx="0" cy="0" r="115" stroke-dasharray="8 6"/>
            <polygon points="0,-100 24,-15 100,0 24,24 0,100 -24,24 -100,0 -24,-15" fill="${accentColor}" fill-opacity="0.2"/>
            <circle cx="0" cy="0" r="12" fill="${accentColor}"/>
            <line x1="-135" y1="0" x2="135" y2="0" opacity="0.4"/>
            <line x1="0" y1="-135" x2="0" y2="135" opacity="0.4"/>
          </g>
        `;
      case 'circuit':
        return `
          <g transform="translate(400, 680)" stroke="${accentColor}" stroke-width="5" fill="none">
            <rect x="-110" y="-110" width="220" height="220" rx="20" stroke-width="6" opacity="0.3"/>
            <rect x="-70" y="-70" width="140" height="140" rx="12" fill="${accentColor}" fill-opacity="0.15"/>
            <circle cx="0" cy="0" r="30" fill="${accentColor}"/>
            <path d="M-110,-50 L-150,-50 M-110,0 L-160,0 M-110,50 L-150,50"/>
            <path d="M110,-50 L150,-50 M110,0 L160,0 M110,50 L150,50"/>
            <path d="M-50,-110 L-50,-150 M0,-110 L0,-160 M50,-110 L50,-150"/>
            <path d="M-50,110 L-50,150 M0,110 L0,160 M50,110 L50,150"/>
          </g>
        `;
      case 'gear':
        return `
          <g transform="translate(400, 680)" stroke="${accentColor}" stroke-width="6" fill="none">
            <circle cx="0" cy="0" r="95" fill="${accentColor}" fill-opacity="0.15"/>
            <circle cx="0" cy="0" r="45" fill="#0f172a" stroke-width="6"/>
            ${Array.from({ length: 8 }).map((_, i) => {
              const deg = i * 45;
              return `<rect x="-18" y="-135" width="36" height="40" rx="6" transform="rotate(${deg})" fill="${accentColor}"/>`;
            }).join('')}
          </g>
        `;
      case 'dollar':
        return `
          <g transform="translate(400, 680)" stroke="${accentColor}" stroke-width="6" fill="none">
            <circle cx="0" cy="0" r="130" opacity="0.3"/>
            <circle cx="0" cy="0" r="110" stroke-dasharray="10 8"/>
            <text x="0" y="55" font-family="'Inter', sans-serif" font-size="160" font-weight="900" fill="${accentColor}" text-anchor="middle" stroke="none">$</text>
          </g>
        `;
      case 'brain':
        return `
          <g transform="translate(400, 680)" stroke="${accentColor}" stroke-width="6" fill="none">
            <circle cx="0" cy="0" r="130" opacity="0.25" stroke-dasharray="12 8"/>
            <path d="M-20,-70 C-70,-70 -95,-30 -85,15 C-95,45 -70,85 -20,80 L-10,80 C-5,80 -5,-70 -20,-70 Z" fill="${accentColor}" fill-opacity="0.2"/>
            <path d="M20,-70 C70,-70 95,-30 85,15 C95,45 70,85 20,80 L10,80 C5,80 5,-70 20,-70 Z" fill="${accentColor}" fill-opacity="0.2"/>
            <line x1="0" y1="-80" x2="0" y2="90" stroke-width="4" stroke-dasharray="6 4"/>
          </g>
        `;
      default:
        return `
          <g transform="translate(400, 680)" stroke="${accentColor}" stroke-width="5" fill="none">
            <circle cx="0" cy="0" r="130" opacity="0.3"/>
            <polygon points="0,-110 95,55 -95,55" fill="${accentColor}" fill-opacity="0.15"/>
            <circle cx="0" cy="0" r="30" fill="${accentColor}"/>
          </g>
        `;
    }
  }

  /**
   * Quebra títulos longos em linhas equilibradas para a capa
   */
  private static wrapTitleToLines(title: string, maxCharsPerLine: number = 20): string[] {
    const words = title.trim().split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const w of words) {
      if (!currentLine) {
        currentLine = w;
      } else if ((currentLine + ' ' + w).length <= maxCharsPerLine) {
        currentLine += ' ' + w;
      } else {
        lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 4); // Limita a 4 linhas no máximo
  }

  /**
   * Gera um SVG completo da capa e converte para DataURL PNG em alta resolução
   */
  public static generateHighResCoverDataUrl(options: CoverGraphicsOptions): string {
    const palette = this.resolvePalette(options.genre, options.styleId);
    const width = 800;
    const height = 1200;

    const titleLines = this.wrapTitleToLines(options.title, 18);
    const titleFontSize = titleLines.length > 2 ? 52 : 62;
    const titleLineHeight = titleFontSize * 1.15;

    // Subtítulo
    const subClean = (options.subtitle || '').replace(/[<>]/g, '');
    const subLines = this.wrapTitleToLines(subClean, 36).slice(0, 3);

    const iconSvg = this.renderContextualVectorSvg(palette.iconType, palette.accentColor);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${palette.bgGradient[0]}"/>
            <stop offset="50%" stop-color="${palette.bgGradient[1]}"/>
            <stop offset="100%" stop-color="${palette.bgGradient[2]}"/>
          </linearGradient>
          <radialGradient id="glowGrad" cx="50%" cy="56%" r="45%">
            <stop offset="0%" stop-color="${palette.accentColor}" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="${palette.accentColor}" stop-opacity="0"/>
          </radialGradient>
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.8"/>
          </filter>
        </defs>

        <!-- Fundo Degradê -->
        <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
        
        <!-- Glow Central -->
        <rect width="${width}" height="${height}" fill="url(#glowGrad)"/>

        <!-- Borda e Moldura Editorial Fina -->
        <rect x="28" y="28" width="${width - 56}" height="${height - 56}" fill="none" stroke="${palette.accentColor}" stroke-opacity="0.3" stroke-width="2"/>
        <rect x="36" y="36" width="${width - 72}" height="${height - 72}" fill="none" stroke="${palette.accentColor}" stroke-opacity="0.15" stroke-width="1"/>

        <!-- Selo de Categoria / Bestseller Topo -->
        <g transform="translate(400, 95)">
          <rect x="-180" y="-18" width="360" height="36" rx="18" fill="${palette.badgeBg}" filter="url(#dropShadow)"/>
          <text x="0" y="6" font-family="'Inter', sans-serif" font-size="12" font-weight="900" fill="${palette.badgeText}" text-anchor="middle" letter-spacing="3" text-transform="uppercase">
            BEST-SELLER OFICIAL AMAZON KDP
          </text>
        </g>

        <!-- Elemento Vetorial Central Contextualizado -->
        ${iconSvg}

        <!-- TÍTULO PRINCIPAL (Com sombra e tipografia forte) -->
        <g transform="translate(400, 220)" filter="url(#dropShadow)">
          ${titleLines.map((line, idx) => {
            const y = idx * titleLineHeight;
            return `<text x="0" y="${y}" font-family="'Inter', 'Montserrat', sans-serif" font-size="${titleFontSize}" font-weight="900" fill="${palette.titleColor}" text-anchor="middle" letter-spacing="1" text-transform="uppercase">${line.replace(/[<>]/g, '')}</text>`;
          }).join('')}
        </g>

        <!-- SUBTÍTULO CONTEXTUAL -->
        <g transform="translate(400, ${220 + (titleLines.length * titleLineHeight) + 24})" filter="url(#dropShadow)">
          <line x1="-80" y1="-14" x2="80" y2="-14" stroke="${palette.accentColor}" stroke-width="3" stroke-linecap="round"/>
          ${subLines.map((sLine, sIdx) => {
            return `<text x="0" y="${sIdx * 24}" font-family="'Inter', sans-serif" font-size="16" font-weight="500" fill="${palette.subtitleColor}" text-anchor="middle">${sLine.replace(/[<>]/g, '')}</text>`;
          }).join('')}
        </g>

        <!-- Barra Divisória Inferior -->
        <g transform="translate(400, 1060)">
          <line x1="-120" y1="0" x2="120" y2="0" stroke="${palette.accentColor}" stroke-width="2" opacity="0.6"/>
          <circle cx="0" cy="0" r="5" fill="${palette.accentColor}"/>
        </g>

        <!-- NOME DO AUTOR -->
        <g transform="translate(400, 1115)" filter="url(#dropShadow)">
          <text x="0" y="0" font-family="'Inter', sans-serif" font-size="22" font-weight="800" fill="${palette.authorColor}" text-anchor="middle" letter-spacing="4" text-transform="uppercase">
            ${(options.author || 'LEANDRO PALMEIRA').replace(/[<>]/g, '')}
          </text>
        </g>
      </svg>
    `;

    // Converte SVG UTF-8 para base64 seguro
    const base64Svg = typeof window !== 'undefined'
      ? window.btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg).toString('base64');

    return `data:image/svg+xml;base64,${base64Svg}`;
  }
}
