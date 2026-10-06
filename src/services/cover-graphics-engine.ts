// ============================================================================
// MOTOR DE GERAÇÃO GRÁFICA DE CAPAS CONTEXTUAIS E RANDOMÉTRICAS KDP
// Inspirado nas melhores práticas de best-sellers da Amazon KDP.
// Garante que cada capa tenha:
// 1. Tipografia e fontes variadas (Heavy Bold + Ultra Thin Sans, Classical Serif, Condensed, Geometric)
// 2. Layouts e composições diferentes (Emblema Cinematográfico, Tipografia Dominante, Moldura Editorial, Silhueta no Horizonte, etc.)
// 3. Fundos atmosféricos únicos com gradientes ricos, horizontes iluminados, silhuetas e texturas
// 4. Nenhum autor fica com capas repetidas no mesmo padrão
// ============================================================================

export interface CoverGraphicsOptions {
  title: string;
  subtitle?: string;
  author: string;
  genre: string;
  styleId?: string;
  keywords?: string[];
  seedIndex?: number;
}

export type CoverLayoutArchetype = 
  | 'cinematic-emblem-hero'      // Estilo da imagem de referência (Emblema topo, título em duas espessuras, silhueta com cão e horizonte)
  | 'split-contrast-bold'        // Tipografia gigante dominante no topo, 2 cores contrastantes, corte moderno
  | 'editorial-classical-frame'  // Moldura clássica dourada/prateada, serifa nobre, medalhão central
  | 'atmospheric-silhouette-sky' // Céu estrelado/texturizado no topo, horizonte iluminado no centro, silhuetas dramáticas
  | 'diagonal-tech-banner'       // Corte angular dinâmico, linhas técnicas/grid, tipografia condensed
  | 'minimalist-bestseller-icon';// Minimalismo icônico tipo Hábitos Atômicos / Foco Profundo

interface ColorScheme {
  bgTop: string;
  bgMid: string;
  bgBottom: string;
  horizonGlow: string;
  titlePrimary: string;
  titleAccent: string;
  subtitleColor: string;
  authorColor: string;
  badgeBg: string;
  badgeText: string;
  accentStroke: string;
}

export class CoverGraphicsEngine {
  /**
   * Função de hash determinística simples para gerar seeds numéricas
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Seleciona o arquétipo de layout com base no gênero e na semente de variação
   */
  private static resolveLayoutArchetype(genre: string, seed: number): CoverLayoutArchetype {
    const archetypes: CoverLayoutArchetype[] = [
      'cinematic-emblem-hero',
      'split-contrast-bold',
      'editorial-classical-frame',
      'atmospheric-silhouette-sky',
      'diagonal-tech-banner',
      'minimalist-bestseller-icon'
    ];

    const g = (genre || '').toLowerCase();
    // Gêneros de ficção, suspense e ficção científica favorecem o estilo cinematográfico com silhueta e emblema
    if (g.includes('ficção') || g.includes('thriller') || g.includes('scifi') || g.includes('fantasia') || g.includes('mistério')) {
      const fictionSubset: CoverLayoutArchetype[] = ['cinematic-emblem-hero', 'atmospheric-silhouette-sky', 'split-contrast-bold'];
      return fictionSubset[seed % fictionSubset.length];
    }

    // Gêneros técnicos / negócios / produtividade rotacionam todos os estilos
    return archetypes[seed % archetypes.length];
  }

  /**
   * Gera esquemas de cores cinematográficos com variação pseudo-aleatória
   */
  private static resolveColorScheme(genre: string, seed: number): ColorScheme {
    const schemes: ColorScheme[] = [
      // 1. Azul Crepúsculo Profundo com Horizonte Ciano (Estilo "The United World")
      {
        bgTop: '#030a16',
        bgMid: '#0a2240',
        bgBottom: '#040d18',
        horizonGlow: '#38bdf8',
        titlePrimary: '#ffffff',
        titleAccent: '#7dd3fc',
        subtitleColor: '#bae6fd',
        authorColor: '#f0f9ff',
        badgeBg: '#0284c7',
        badgeText: '#ffffff',
        accentStroke: '#38bdf8'
      },
      // 2. Grafite Noir com Horizonte Âmbar/Laranja
      {
        bgTop: '#0c0a09',
        bgMid: '#1c1917',
        bgBottom: '#090807',
        horizonGlow: '#f97316',
        titlePrimary: '#ffffff',
        titleAccent: '#fb923c',
        subtitleColor: '#fed7aa',
        authorColor: '#ffedd5',
        badgeBg: '#ea580c',
        badgeText: '#ffffff',
        accentStroke: '#f97316'
      },
      // 3. Roxo Cósmico / Nebulosa com Horizonte Violeta Elétrico
      {
        bgTop: '#090314',
        bgMid: '#1e0a38',
        bgBottom: '#05020c',
        horizonGlow: '#c084fc',
        titlePrimary: '#ffffff',
        titleAccent: '#e9d5ff',
        subtitleColor: '#d8b4fe',
        authorColor: '#faf5ff',
        badgeBg: '#9333ea',
        badgeText: '#ffffff',
        accentStroke: '#c084fc'
      },
      // 4. Esmeralda Escuro com Horizonte Dourado Aurora
      {
        bgTop: '#021a12',
        bgMid: '#064e3b',
        bgBottom: '#010d08',
        horizonGlow: '#34d399',
        titlePrimary: '#ffffff',
        titleAccent: '#6ee7b7',
        subtitleColor: '#a7f3d0',
        authorColor: '#f0fdf4',
        badgeBg: '#059669',
        badgeText: '#ffffff',
        accentStroke: '#34d399'
      },
      // 5. Escarlate Sombrio / Thriller Crime com Horizonte Sangue
      {
        bgTop: '#140303',
        bgMid: '#2e0a0a',
        bgBottom: '#0a0101',
        horizonGlow: '#ef4444',
        titlePrimary: '#ffffff',
        titleAccent: '#fca5a5',
        subtitleColor: '#fecaca',
        authorColor: '#fef2f2',
        badgeBg: '#dc2626',
        badgeText: '#ffffff',
        accentStroke: '#ef4444'
      },
      // 6. Titânio Real e Ouro Nobre Clássico
      {
        bgTop: '#0f172a',
        bgMid: '#1e293b',
        bgBottom: '#090d16',
        horizonGlow: '#fbbf24',
        titlePrimary: '#ffffff',
        titleAccent: '#fde68a',
        subtitleColor: '#fef3c7',
        authorColor: '#fef9c3',
        badgeBg: '#d97706',
        badgeText: '#000000',
        accentStroke: '#fbbf24'
      },
      // 7. Azul Petróleo e Neon Aqua Minimalista
      {
        bgTop: '#04131f',
        bgMid: '#082f49',
        bgBottom: '#020b12',
        horizonGlow: '#22d3ee',
        titlePrimary: '#ffffff',
        titleAccent: '#67e8f9',
        subtitleColor: '#cffafe',
        authorColor: '#ecfeff',
        badgeBg: '#0891b2',
        badgeText: '#ffffff',
        accentStroke: '#22d3ee'
      }
    ];

    return schemes[seed % schemes.length];
  }

  /**
   * Gera o SVG vetorial do Emblema de Louros com mãos dadas / globo (como na imagem de ficção)
   */
  private static renderLaurelWreathEmblem(accentColor: string, seed: number): string {
    const emblemVariant = seed % 3;

    if (emblemVariant === 0) {
      // Emblema com coroa de louros e mãos unidas (idêntico à imagem de referência)
      return `
        <g stroke="${accentColor}" stroke-width="2.5" fill="none" opacity="0.95">
          <!-- Círculo externo dentado / radiante -->
          <circle cx="0" cy="0" r="58" stroke-width="2" stroke-dasharray="4 3"/>
          <circle cx="0" cy="0" r="50" stroke-width="3"/>
          <circle cx="0" cy="0" r="42" stroke-width="1.5" stroke-dasharray="6 4"/>
          
          <!-- Ramos de Louro Esquerdo -->
          <path d="M-15,40 C-40,30 -45,-15 -25,-42 C-20,-30 -30,-10 -15,5" stroke-width="2.5"/>
          <path d="M-28,25 C-42,18 -46,-2 -32,-25" stroke-width="2"/>
          <ellipse cx="-32" cy="-5" rx="5" ry="9" transform="rotate(-30 -32 -5)" fill="${accentColor}" fill-opacity="0.25"/>
          <ellipse cx="-25" cy="-25" rx="4" ry="8" transform="rotate(-45 -25 -25)" fill="${accentColor}" fill-opacity="0.25"/>
          <ellipse cx="-35" cy="15" rx="5" ry="8" transform="rotate(-15 -35 15)" fill="${accentColor}" fill-opacity="0.25"/>

          <!-- Ramos de Louro Direito -->
          <path d="M15,40 C40,30 45,-15 25,-42 C20,-30 30,-10 15,5" stroke-width="2.5"/>
          <path d="M28,25 C42,18 46,-2 32,-25" stroke-width="2"/>
          <ellipse cx="32" cy="-5" rx="5" ry="9" transform="rotate(30 32 -5)" fill="${accentColor}" fill-opacity="0.25"/>
          <ellipse cx="25" cy="-25" rx="4" ry="8" transform="rotate(45 25 -25)" fill="${accentColor}" fill-opacity="0.25"/>
          <ellipse cx="35" cy="15" rx="5" ry="8" transform="rotate(15 35 15)" fill="${accentColor}" fill-opacity="0.25"/>

          <!-- Centro: Mãos dadas / Aperto de mão e Globo -->
          <circle cx="0" cy="0" r="28" fill="#030a16" fill-opacity="0.8" stroke-width="2"/>
          <!-- Silhueta estilizada do aperto de mãos -->
          <path d="M-18,-4 C-12,-8 -4,-6 0,-2 C4,-6 12,-8 18,-4 L16,4 C10,2 4,6 0,8 C-4,6 -10,2 -16,4 Z" fill="${accentColor}" fill-opacity="0.85"/>
          <line x1="-10" y1="-14" x2="10" y2="-14" stroke-width="1.5" stroke-dasharray="3 3"/>
          <line x1="-12" y1="14" x2="12" y2="14" stroke-width="1.5" stroke-dasharray="3 3"/>
          <circle cx="0" cy="0" r="4" fill="#ffffff"/>
        </g>
      `;
    } else if (emblemVariant === 1) {
      // Rosa dos Ventos / Bússola Celestial com louros
      return `
        <g stroke="${accentColor}" stroke-width="2.5" fill="none" opacity="0.95">
          <circle cx="0" cy="0" r="54" stroke-width="2"/>
          <circle cx="0" cy="0" r="44" stroke-dasharray="4 4"/>
          <!-- Estrela de 8 pontas -->
          <polygon points="0,-40 8,-12 36,-12 14,4 22,32 0,16 -22,32 -14,4 -36,-12 -8,-12" fill="${accentColor}" fill-opacity="0.3"/>
          <circle cx="0" cy="0" r="6" fill="${accentColor}"/>
          <line x1="-50" y1="0" x2="50" y2="0" stroke-width="1.5" opacity="0.5"/>
          <line x1="0" y1="-50" x2="0" y2="50" stroke-width="1.5" opacity="0.5"/>
        </g>
      `;
    } else {
      // Brasão Geométrico Sagrado / Escudo de Honra
      return `
        <g stroke="${accentColor}" stroke-width="2.5" fill="none" opacity="0.95">
          <polygon points="0,-48 42,-20 42,24 0,48 -42,24 -42,-20" stroke-width="2.5"/>
          <polygon points="0,-36 30,-14 30,18 0,36 -30,18 -30,-14" stroke-width="1.5" stroke-dasharray="4 3"/>
          <circle cx="0" cy="0" r="16" fill="${accentColor}" fill-opacity="0.3"/>
          <line x1="0" y1="-42" x2="0" y2="42" stroke-width="2"/>
          <line x1="-36" y1="0" x2="36" y2="0" stroke-width="2"/>
        </g>
      `;
    }
  }

  /**
   * Gera a silhueta atmosférica inferior (cidade/skyline, montanhas, caminhante solitário com cão)
   */
  private static renderSilhouetteLandscape(horizonGlow: string, seed: number): string {
    const horizonType = seed % 3;

    // Elementos celestes (drones / pássaros no céu como na imagem de ficção)
    const aerialElements = `
      <g fill="#020813" opacity="0.75">
        <path d="M220,720 Q228,715 236,720 Q244,715 252,720 Q244,723 236,722 Q228,723 220,720 Z"/>
        <path d="M460,705 Q466,701 472,705 Q478,701 484,705 Q478,708 472,707 Q466,708 460,705 Z" transform="scale(0.85) translate(80, 50)"/>
        <path d="M560,730 Q567,725 574,730 Q581,725 588,730 Q581,733 574,732 Q567,733 560,730 Z" transform="scale(0.7) translate(220, 120)"/>
      </g>
    `;

    // Silhueta do Andarilho com seu Cão (idêntico à imagem de referência do usuário!)
    const wandererAndDog = `
      <g fill="#020710" transform="translate(400, 835)">
        <!-- Brilho de névoa atrás do personagem -->
        <ellipse cx="0" cy="-30" rx="90" ry="70" fill="${horizonGlow}" fill-opacity="0.18"/>

        <!-- Andarilho Humano -->
        <!-- Cabeça com capuz/gorro -->
        <circle cx="-16" cy="-86" r="11"/>
        <!-- Pescoço e jaqueta -->
        <path d="M-30,-72 Q-16,-78 -2,-72 L0,-24 L-8,-24 L-12,0 L-18,0 L-22,-24 L-32,-24 Z"/>
        <!-- Pernas caminhando -->
        <path d="M-26,-24 L-28,26 L-20,26 L-18,-24 Z"/>
        <path d="M-14,-24 L-10,24 L-4,24 L-10,-24 Z"/>
        <!-- Braços -->
        <path d="M-32,-68 L-36,-38 L-30,-36 L-28,-64 Z"/>
        <path d="M-2,-68 L2,-40 L-4,-38 L-8,-64 Z"/>

        <!-- Cão companheiro caminhando ao lado -->
        <!-- Corpo do cão -->
        <ellipse cx="24" cy="5" rx="17" ry="11"/>
        <!-- Cabeça e orelhas alertas -->
        <circle cx="38" cy="-4" r="8"/>
        <polygon points="35,-12 40,-12 41,-5"/>
        <polygon points="39,-12 44,-12 43,-5"/>
        <!-- Focinho -->
        <polygon points="42,-6 50,-2 43,1"/>
        <!-- Patas do cão -->
        <line x1="14" y1="12" x2="12" y2="28" stroke="#020710" stroke-width="4" stroke-linecap="round"/>
        <line x1="20" y1="12" x2="22" y2="28" stroke="#020710" stroke-width="4" stroke-linecap="round"/>
        <line x1="30" y1="10" x2="28" y2="28" stroke="#020710" stroke-width="4" stroke-linecap="round"/>
        <line x1="36" y1="10" x2="38" y2="28" stroke="#020710" stroke-width="4" stroke-linecap="round"/>
        <!-- Rabo em guarda -->
        <path d="M8,0 Q0,-8 5,-14" stroke="#020710" stroke-width="4" fill="none" stroke-linecap="round"/>
      </g>
    `;

    if (horizonType === 0) {
      // Skyline Urbano / Distópico com névoa luminosa e edifícios ao fundo
      return `
        <!-- Brilho de Horizonte Ciano/Céu -->
        <rect x="0" y="660" width="800" height="200" fill="url(#horizonGrad)" opacity="0.85"/>
        
        <!-- Prédios distantes na névoa -->
        <path d="M0,770 L40,770 L40,730 L70,730 L70,750 L110,750 L110,715 L140,715 L140,760 L180,760 L180,725 L210,725 L210,745 L260,745 L260,700 L285,700 L285,750 L330,750 L330,720 L370,720 L370,695 L395,695 L395,740 L440,740 L440,710 L470,710 L470,755 L520,755 L520,705 L550,705 L550,735 L600,735 L600,690 L635,690 L635,745 L680,745 L680,715 L720,715 L720,760 L760,760 L760,730 L800,730 L800,820 L0,820 Z" fill="#041224" opacity="0.6"/>

        <!-- Drones no ar -->
        ${aerialElements}

        <!-- Camada de colina intermediária com árvores em silhueta -->
        <path d="M0,785 Q200,765 400,780 Q600,795 800,775 L800,1200 L0,1200 Z" fill="#020914" opacity="0.9"/>
        <path d="M-20,770 C50,740 120,770 180,790 L0,840 Z" fill="#030d1c" opacity="0.8"/>
        <path d="M620,790 C700,760 760,770 820,760 L800,840 Z" fill="#030d1c" opacity="0.8"/>

        <!-- Chão escuro com o andarilho e o cão -->
        ${wandererAndDog}

        <!-- Estrada / Solo em primeiro plano -->
        <path d="M0,860 Q400,840 800,860 L800,1200 L0,1200 Z" fill="#01050a"/>
        <!-- Textura de chão e folhas nas bordas -->
        <path d="M0,800 Q150,860 0,980 Z" fill="#020812"/>
        <path d="M800,790 Q650,860 800,990 Z" fill="#020812"/>
      `;
    } else if (horizonType === 1) {
      // Cordilheira de Montanhas Nebulosas e Pinheiros
      return `
        <rect x="0" y="650" width="800" height="220" fill="url(#horizonGrad)" opacity="0.85"/>
        <polygon points="0,770 120,710 240,780 380,690 520,770 660,705 800,760 800,850 0,850" fill="#041224" opacity="0.55"/>
        <polygon points="0,810 180,750 360,820 490,740 680,810 800,765 800,870 0,870" fill="#020b17" opacity="0.85"/>
        ${aerialElements}
        ${wandererAndDog}
        <path d="M0,865 Q400,845 800,865 L800,1200 L0,1200 Z" fill="#010408"/>
      `;
    } else {
      // Horizonte Tecnológico / Grade Geométrica Cyberpunk com Névoa
      return `
        <rect x="0" y="660" width="800" height="210" fill="url(#horizonGrad)" opacity="0.9"/>
        <g stroke="${horizonGlow}" stroke-width="1" opacity="0.35">
          <line x1="0" y1="780" x2="800" y2="780"/>
          <line x1="0" y1="810" x2="800" y2="810"/>
          <line x1="0" y1="835" x2="800" y2="835"/>
          ${Array.from({ length: 9 }).map((_, i) => `<line x1="${i * 100}" y1="780" x2="${400 + (i - 4) * 160}" y2="920"/>`).join('')}
        </g>
        ${aerialElements}
        ${wandererAndDog}
        <path d="M0,860 Q400,840 800,860 L800,1200 L0,1200 Z" fill="#01050a"/>
      `;
    }
  }

  /**
   * Divide e quebra títulos para tipografia de duas espessuras (Bold + Ultra Thin)
   * Exemplo: "THE UNITED WORLD" -> Lead: "THE", Bold: "UNITED", Thin: "WORLD"
   */
  private static parseTitleTypographyWords(title: string): { leadWord: string; mainWord1: string; mainWord2: string } {
    const clean = title.replace(/[—\-_:•]/g, ' ').trim();
    const words = clean.split(/\s+/).filter(Boolean);

    if (words.length === 1) {
      return { leadWord: '', mainWord1: words[0].toUpperCase(), mainWord2: '' };
    }
    if (words.length === 2) {
      return { leadWord: '', mainWord1: words[0].toUpperCase(), mainWord2: words[1].toUpperCase() };
    }
    if (words.length === 3) {
      // Se a primeira for curta (O, A, THE, DO, DA, etc.), usa como lead
      if (words[0].length <= 3) {
        return { leadWord: words[0].toUpperCase(), mainWord1: words[1].toUpperCase(), mainWord2: words[2].toUpperCase() };
      }
      return { leadWord: '', mainWord1: `${words[0]} ${words[1]}`.toUpperCase(), mainWord2: words[2].toUpperCase() };
    }

    // 4 ou mais palavras
    const mid = Math.floor(words.length / 2);
    const firstHalf = words.slice(0, mid).join(' ').toUpperCase();
    const secondHalf = words.slice(mid).join(' ').toUpperCase();
    return { leadWord: '', mainWord1: firstHalf, mainWord2: secondHalf };
  }

  /**
   * Quebra títulos longos em linhas equilibradas
   */
  private static wrapTitleToLines(title: string, maxCharsPerLine: number = 18): string[] {
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
    return lines.slice(0, 4);
  }

  /**
   * GERA O SVG COMPLETO EM ALTA DEFINIÇÃO E CONVERTE PARA DATAURL PNG SEGURO
   */
  public static generateHighResCoverDataUrl(options: CoverGraphicsOptions): string {
    const width = 800;
    const height = 1200;

    // Semente determinística combinada de título, autor e seedIndex
    const seed = this.hashString(`${options.title}__${options.author}__${options.seedIndex || 0}__${options.genre}`);
    const archetype = this.resolveLayoutArchetype(options.genre, seed);
    const colors = this.resolveColorScheme(options.genre, seed);

    const titleWords = this.parseTitleTypographyWords(options.title);
    const titleLines = this.wrapTitleToLines(options.title, 18);
    const authorClean = (options.author || 'LEANDRO PALMEIRA').toUpperCase();
    const subtitleClean = (options.subtitle || '').replace(/[<>]/g, '');
    const subtitleLines = this.wrapTitleToLines(subtitleClean, 38).slice(0, 3);

    // Efeitos visuais do céu (gotas de código / matriz / estrelas sutis no topo como na imagem de ficção)
    const skyMatrixNoise = `
      <g stroke="${colors.titleAccent}" stroke-width="1.2" opacity="0.22" stroke-linecap="round">
        ${Array.from({ length: 28 }).map((_, i) => {
          const x = 50 + (i * 26) + ((seed * 7 + i * 13) % 20);
          const y1 = 30 + ((seed * 3 + i * 19) % 80);
          const y2 = y1 + 18 + ((i * 7) % 35);
          return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke-dasharray="3 4"/>`;
        }).join('')}
      </g>
    `;

    let coverContentSvg = '';

    // ========================================================================
    // ARQUÉTIPO 1: CINEMATIC EMBLEM HERO (Como a imagem de capa fornecida pelo usuário)
    // ========================================================================
    if (archetype === 'cinematic-emblem-hero' || archetype === 'atmospheric-silhouette-sky') {
      const emblemSvg = this.renderLaurelWreathEmblem(colors.accentStroke, seed);
      const landscapeSvg = this.renderSilhouetteLandscape(colors.horizonGlow, seed);

      coverContentSvg = `
        <!-- Efeito Matrix/Estrelas no Céu Superior -->
        ${skyMatrixNoise}

        <!-- Tag Superior de Série / Edição Especial KDP -->
        <g transform="translate(400, 68)">
          <text x="0" y="0" font-family="'Inter', 'Montserrat', sans-serif" font-size="13" font-weight="700" fill="${colors.subtitleColor}" text-anchor="middle" letter-spacing="5" text-transform="uppercase" opacity="0.85">
            ${options.genre.toUpperCase().slice(0, 26)} • EDIÇÃO OFICIAL
          </text>
        </g>

        <!-- Emblema de Louros com Mãos Dadas / Brasão Centralizado no Topo -->
        <g transform="translate(400, 165)" filter="url(#glowFilter)">
          ${emblemSvg}
        </g>

        <!-- TÍTULO COM TIPOGRAFIA EM DUAS ESPESSURAS (BOLD + ULTRA THIN SANS) -->
        <g transform="translate(400, 310)" filter="url(#textShadow)">
          ${titleWords.leadWord ? `
            <!-- Palavra Inicial Menor (Ex: THE, O, A) -->
            <text x="0" y="0" font-family="'Inter', 'Montserrat', sans-serif" font-size="28" font-weight="600" fill="${colors.titleAccent}" text-anchor="middle" letter-spacing="6">
              ${titleWords.leadWord}
            </text>
          ` : ''}

          <!-- Palavra Primária em Heavy Bold (Ex: UNITED) -->
          <text x="0" y="${titleWords.leadWord ? 70 : 40}" font-family="'Inter', 'Montserrat', 'Helvetica Neue', sans-serif" font-size="76" font-weight="900" fill="${colors.titlePrimary}" text-anchor="middle" letter-spacing="3" text-transform="uppercase">
            ${titleWords.mainWord1}
          </text>

          ${titleWords.mainWord2 ? `
            <!-- Palavra Secundária em Ultra-Thin / Light Wireframe (Ex: WORLD) -->
            <text x="0" y="${titleWords.leadWord ? 145 : 120}" font-family="'Inter', 'Montserrat', 'Helvetica Neue', sans-serif" font-size="76" font-weight="200" fill="${colors.titleAccent}" text-anchor="middle" letter-spacing="4" text-transform="uppercase">
              ${titleWords.mainWord2}
            </text>
          ` : ''}
        </g>

        <!-- Subtítulo Sutil se houver espaço -->
        ${subtitleLines.length > 0 && !titleWords.mainWord2 ? `
          <g transform="translate(400, 480)" filter="url(#textShadow)">
            <text x="0" y="0" font-family="'Inter', sans-serif" font-size="16" font-weight="500" fill="${colors.subtitleColor}" text-anchor="middle" opacity="0.9">
              ${subtitleLines[0]}
            </text>
          </g>
        ` : ''}

        <!-- Paisagem Atmosférica Inferior (Céu, Silhueta de Cidade, Andarilho e Cão) -->
        ${landscapeSvg}

        <!-- NOME DO AUTOR NO RODAPÉ COM ESPAÇAMENTO LARGO E VIGNETTE -->
        <g transform="translate(400, 1120)" filter="url(#textShadow)">
          <text x="0" y="0" font-family="'Inter', 'Montserrat', sans-serif" font-size="24" font-weight="800" fill="${colors.authorColor}" text-anchor="middle" letter-spacing="6" text-transform="uppercase">
            ${authorClean}
          </text>
        </g>
      `;
    } 
    // ========================================================================
    // ARQUÉTIPO 2: SPLIT CONTRAST BOLD (Tipografia Moderna Dominante em 2 Tons)
    // ========================================================================
    else if (archetype === 'split-contrast-bold') {
      coverContentSvg = `
        <!-- Faixa Geométrica de Fundo -->
        <path d="M0,0 L800,0 L800,520 L0,620 Z" fill="${colors.bgMid}" opacity="0.6"/>
        <line x1="0" y1="620" x2="800" y2="520" stroke="${colors.accentStroke}" stroke-width="4" opacity="0.7"/>

        <!-- Selo de Categoria Topo -->
        <g transform="translate(400, 75)">
          <rect x="-160" y="-16" width="320" height="32" rx="16" fill="${colors.badgeBg}" filter="url(#dropShadow)"/>
          <text x="0" y="5" font-family="'Inter', sans-serif" font-size="12" font-weight="900" fill="${colors.badgeText}" text-anchor="middle" letter-spacing="3" text-transform="uppercase">
            ${options.genre.toUpperCase().slice(0, 24)}
          </text>
        </g>

        <!-- TÍTULO GIGANTE DOMINANTE (Fontes com contraste de cores) -->
        <g transform="translate(400, 230)" filter="url(#dropShadow)">
          ${titleLines.map((line, idx) => {
            const isAccentLine = idx % 2 === 1;
            const fontColor = isAccentLine ? colors.titleAccent : colors.titlePrimary;
            const weight = isAccentLine ? '300' : '900';
            const y = idx * 78;
            return `<text x="0" y="${y}" font-family="'Montserrat', 'Inter', sans-serif" font-size="64" font-weight="${weight}" fill="${fontColor}" text-anchor="middle" letter-spacing="2" text-transform="uppercase">${line}</text>`;
          }).join('')}
        </g>

        <!-- Subtítulo em Cartão Contrastante -->
        <g transform="translate(400, 700)" filter="url(#dropShadow)">
          <rect x="-300" y="-30" width="600" height="${subtitleLines.length * 28 + 36}" rx="8" fill="#000000" fill-opacity="0.65" stroke="${colors.accentStroke}" stroke-width="1.5"/>
          ${subtitleLines.map((s, idx) => `
            <text x="0" y="${idx * 26 + 6}" font-family="'Inter', sans-serif" font-size="16" font-weight="500" fill="${colors.subtitleColor}" text-anchor="middle">${s}</text>
          `).join('')}
        </g>

        <!-- Rodapé do Autor -->
        <g transform="translate(400, 1110)" filter="url(#textShadow)">
          <line x1="-120" y1="-24" x2="120" y2="-24" stroke="${colors.accentStroke}" stroke-width="2"/>
          <text x="0" y="0" font-family="'Inter', sans-serif" font-size="22" font-weight="800" fill="${colors.authorColor}" text-anchor="middle" letter-spacing="5" text-transform="uppercase">
            ${authorClean}
          </text>
        </g>
      `;
    } 
    // ========================================================================
    // ARQUÉTIPO 3: EDITORIAL CLASSICAL FRAME (Moldura Nobre e Tipografia Serif)
    // ========================================================================
    else if (archetype === 'editorial-classical-frame') {
      coverContentSvg = `
        <!-- Moldura Clássica Dupla Dourada / Cromada -->
        <rect x="36" y="36" width="${width - 72}" height="${height - 72}" fill="none" stroke="${colors.accentStroke}" stroke-width="2.5" opacity="0.85"/>
        <rect x="48" y="48" width="${width - 96}" height="${height - 96}" fill="none" stroke="${colors.accentStroke}" stroke-width="1" stroke-dasharray="8 6" opacity="0.6"/>
        <!-- Cantoneiras ornamentais -->
        <polygon points="36,36 60,36 36,60" fill="${colors.accentStroke}"/>
        <polygon points="764,36 740,36 764,60" fill="${colors.accentStroke}"/>
        <polygon points="36,1164 60,1164 36,1140" fill="${colors.accentStroke}"/>
        <polygon points="764,1164 740,1164 764,1140" fill="${colors.accentStroke}"/>

        <!-- Selo Superior Clássico -->
        <g transform="translate(400, 120)">
          <text x="0" y="0" font-family="'Cinzel', 'Playfair Display', 'Georgia', serif" font-size="14" font-weight="700" fill="${colors.titleAccent}" text-anchor="middle" letter-spacing="4" text-transform="uppercase">
            EDIÇÃO EDITORIAL KDP
          </text>
          <line x1="-80" y1="14" x2="80" y2="14" stroke="${colors.accentStroke}" stroke-width="1.5"/>
        </g>

        <!-- TÍTULO EM TIPOGRAFIA SERIFADA DE ALTO PRESTÍGIO (Playfair / Cinzel / Georgia) -->
        <g transform="translate(400, 360)" filter="url(#dropShadow)">
          ${titleLines.map((line, idx) => {
            const y = idx * 68;
            return `<text x="0" y="${y}" font-family="'Playfair Display', 'Cinzel', 'Georgia', serif" font-size="56" font-weight="700" fill="${colors.titlePrimary}" text-anchor="middle" letter-spacing="2">${line}</text>`;
          }).join('')}
        </g>

        <!-- Medalhão Central Clássico -->
        <g transform="translate(400, 680)">
          <circle cx="0" cy="0" r="50" fill="none" stroke="${colors.accentStroke}" stroke-width="2"/>
          <circle cx="0" cy="0" r="42" fill="none" stroke="${colors.accentStroke}" stroke-width="1" stroke-dasharray="4 4"/>
          <polygon points="0,-28 20,0 0,28 -20,0" fill="${colors.accentStroke}" fill-opacity="0.3"/>
        </g>

        <!-- Subtítulo em Small Caps Elegante -->
        <g transform="translate(400, 840)">
          ${subtitleLines.map((s, idx) => `
            <text x="0" y="${idx * 24}" font-family="'Cinzel', 'Georgia', serif" font-size="16" font-weight="400" fill="${colors.subtitleColor}" text-anchor="middle" letter-spacing="1">${s}</text>
          `).join('')}
        </g>

        <!-- Autor em Plinto Clássico -->
        <g transform="translate(400, 1080)">
          <rect x="-180" y="-20" width="360" height="40" fill="${colors.bgMid}" stroke="${colors.accentStroke}" stroke-width="1.5" rx="4"/>
          <text x="0" y="6" font-family="'Cinzel', 'Playfair Display', 'Georgia', serif" font-size="18" font-weight="700" fill="${colors.authorColor}" text-anchor="middle" letter-spacing="4" text-transform="uppercase">
            ${authorClean}
          </text>
        </g>
      `;
    } 
    // ========================================================================
    // ARQUÉTIPO 4: DIAGONAL TECH BANNER (Cyberpunk / Ação / Tecnologia)
    // ========================================================================
    else if (archetype === 'diagonal-tech-banner') {
      coverContentSvg = `
        <!-- Fatias Diagonais Modernas -->
        <polygon points="0,0 800,240 800,800 0,560" fill="${colors.bgMid}" opacity="0.45"/>
        <line x1="0" y1="560" x2="800" y2="800" stroke="${colors.accentStroke}" stroke-width="3" opacity="0.8"/>
        
        <!-- Grid Tecnológico -->
        <g stroke="${colors.accentStroke}" stroke-width="0.8" opacity="0.2">
          ${Array.from({ length: 6 }).map((_, i) => `<line x1="${i * 160}" y1="0" x2="${i * 160}" y2="1200"/>`).join('')}
        </g>

        <!-- Selo Superior -->
        <g transform="translate(400, 80)">
          <text x="0" y="0" font-family="'Courier New', monospace" font-size="13" font-weight="700" fill="${colors.titleAccent}" text-anchor="middle" letter-spacing="6">
            // [SYSTEM_ID: ${seed.toString(16).toUpperCase()}]
          </text>
        </g>

        <!-- TÍTULO CONDENSED / IMPACTANTE -->
        <g transform="translate(400, 280)" filter="url(#dropShadow)">
          ${titleLines.map((line, idx) => {
            const y = idx * 72;
            return `<text x="0" y="${y}" font-family="'Impact', 'Arial Black', sans-serif" font-size="68" fill="${colors.titlePrimary}" text-anchor="middle" letter-spacing="3" text-transform="uppercase">${line}</text>`;
          }).join('')}
        </g>

        <!-- Ícone Tech Central -->
        <g transform="translate(400, 640)" stroke="${colors.accentStroke}" stroke-width="3" fill="none">
          <circle cx="0" cy="0" r="70" opacity="0.4"/>
          <polygon points="0,-50 43,25 -43,25" fill="${colors.accentStroke}" fill-opacity="0.2"/>
          <circle cx="0" cy="0" r="14" fill="${colors.accentStroke}"/>
        </g>

        <!-- Subtítulo em Banner Sólido -->
        <g transform="translate(400, 820)" filter="url(#dropShadow)">
          <rect x="-280" y="-24" width="560" height="${subtitleLines.length * 26 + 32}" fill="#040b14" stroke="${colors.accentStroke}" stroke-width="1.5" rx="6"/>
          ${subtitleLines.map((s, idx) => `
            <text x="0" y="${idx * 24 + 4}" font-family="'Inter', sans-serif" font-size="15" font-weight="600" fill="${colors.subtitleColor}" text-anchor="middle">${s}</text>
          `).join('')}
        </g>

        <!-- Autor em Estilo Militar / Moderno -->
        <g transform="translate(400, 1115)" filter="url(#textShadow)">
          <text x="0" y="0" font-family="'Impact', 'Arial Black', sans-serif" font-size="26" fill="${colors.authorColor}" text-anchor="middle" letter-spacing="6" text-transform="uppercase">
            ${authorClean}
          </text>
        </g>
      `;
    }
    // ========================================================================
    // ARQUÉTIPO 5: MINIMALIST BESTSELLER ICON (Atomic Habits / Deep Work)
    // ========================================================================
    else {
      coverContentSvg = `
        <!-- Círculo Central Gigante com Gradiente Radial -->
        <circle cx="400" cy="620" r="220" fill="none" stroke="${colors.accentStroke}" stroke-width="3" opacity="0.4" stroke-dasharray="12 8"/>
        <circle cx="400" cy="620" r="160" fill="${colors.horizonGlow}" fill-opacity="0.08"/>
        <circle cx="400" cy="620" r="32" fill="${colors.accentStroke}"/>

        <!-- Topo Minimalista -->
        <g transform="translate(400, 100)">
          <line x1="-40" y1="0" x2="40" y2="0" stroke="${colors.accentStroke}" stroke-width="3"/>
        </g>

        <!-- TÍTULO ULTRA BOLD COM MÁXIMO ESPAÇAMENTO NEGATIVO -->
        <g transform="translate(400, 280)" filter="url(#dropShadow)">
          ${titleLines.map((line, idx) => {
            const y = idx * 72;
            return `<text x="0" y="${y}" font-family="'Inter', 'Montserrat', sans-serif" font-size="64" font-weight="900" fill="${colors.titlePrimary}" text-anchor="middle" letter-spacing="2" text-transform="uppercase">${line}</text>`;
          }).join('')}
        </g>

        <!-- Subtítulo Centralizado Limpo -->
        <g transform="translate(400, 880)">
          ${subtitleLines.map((s, idx) => `
            <text x="0" y="${idx * 24}" font-family="'Inter', sans-serif" font-size="16" font-weight="500" fill="${colors.subtitleColor}" text-anchor="middle">${s}</text>
          `).join('')}
        </g>

        <!-- Autor no Rodapé Limpo -->
        <g transform="translate(400, 1110)" filter="url(#textShadow)">
          <text x="0" y="0" font-family="'Inter', sans-serif" font-size="20" font-weight="700" fill="${colors.authorColor}" text-anchor="middle" letter-spacing="5" text-transform="uppercase">
            ${authorClean}
          </text>
        </g>
      `;
    }

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="mainBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${colors.bgTop}"/>
            <stop offset="50%" stop-color="${colors.bgMid}"/>
            <stop offset="100%" stop-color="${colors.bgBottom}"/>
          </linearGradient>

          <linearGradient id="horizonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${colors.horizonGlow}" stop-opacity="0"/>
            <stop offset="50%" stop-color="${colors.horizonGlow}" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="${colors.bgBottom}" stop-opacity="1"/>
          </linearGradient>

          <filter id="glowFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>

          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.85"/>
          </filter>

          <filter id="textShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.95"/>
          </filter>
        </defs>

        <!-- Fundo Degradê Rico -->
        <rect width="${width}" height="${height}" fill="url(#mainBgGrad)"/>

        <!-- Conteúdo Específico do Arquétipo -->
        ${coverContentSvg}
      </svg>
    `;

    // Converte SVG UTF-8 para base64 seguro no Node e Browser
    const base64Svg = typeof window !== 'undefined'
      ? window.btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg).toString('base64');

    return `data:image/svg+xml;base64,${base64Svg}`;
  }
}
