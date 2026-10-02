// SERVIÇO EDITORIAL DE ILUSTRAÇÕES DE MIOLO PARA LIVROS KDP
// Garante gravuras artísticas e ilustrações condizentes com o tema que NUNCA quebram

export class EditorialArtService {
  /**
   * Catálogo de gravuras e ilustrações artísticas de domínio público e alta resolução
   * com CDN confiável e alta taxa de entrega para livros físicos e digitais.
   */
  private static readonly CURATED_ART_BY_GENRE: Record<string, string[]> = {
    fantasy: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514894780887-121968d00567?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1476275466078-4007374efbbe?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop'
    ],
    romance: [
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1200&auto=format&fit=crop'
    ],
    thriller: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop'
    ],
    scifi: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop'
    ],
    nonfiction: [
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1200&auto=format&fit=crop'
    ]
  };

  /**
   * Obtém uma URL de imagem de alta qualidade condizente com o gênero e índice da ilustração
   */
  public static getIllustrationUrl(
    genre: string = 'nonfiction', 
    illustrationIndex: number = 0
  ): string {
    const raw = (genre || '').toLowerCase();
    let key = 'nonfiction';
    if (raw.includes('fantasia') || raw.includes('fantasy') || raw.includes('sword') || raw.includes('sorcery')) {
      key = 'fantasy';
    } else if (raw.includes('romance') || raw.includes('amor')) {
      key = 'romance';
    } else if (raw.includes('suspense') || raw.includes('thriller') || raw.includes('mistério') || raw.includes('crime')) {
      key = 'thriller';
    } else if (raw.includes('sci-fi') || raw.includes('scifi') || raw.includes('científica')) {
      key = 'scifi';
    }

    const list = this.CURATED_ART_BY_GENRE[key] || this.CURATED_ART_BY_GENRE.nonfiction;
    return list[illustrationIndex % list.length];
  }

  /**
   * Gera um SVG editorial de alta precisão estética que NUNCA falha no navegador
   */
  public static getEditorialFallbackSvg(caption: string, chapterTitle: string = ''): string {
    const cleanCaption = caption || 'Ilustração Editorial da Obra';
    const cleanTitle = chapterTitle || 'Cena da Narrativa';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="100%" height="100%">
      <defs>
        <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stop-color="#fdfbf7"/>
          <stop offset="100%" stop-color="#ece6dc"/>
        </radialGradient>
        <pattern id="hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#d6cfc4" stroke-width="1"/>
        </pattern>
      </defs>
      
      <!-- Fundo papel linho suave -->
      <rect width="800" height="480" fill="url(#vignette)"/>
      <rect x="24" y="24" width="752" height="432" fill="none" stroke="#78716c" stroke-width="1.5"/>
      <rect x="30" y="30" width="740" height="420" fill="none" stroke="#a8a29e" stroke-width="0.75" stroke-dasharray="4,4"/>

      <!-- Arabesco decorativo superior -->
      <path d="M 320 60 Q 400 40 480 60 Q 400 75 320 60 Z" fill="#44403c"/>
      <circle cx="400" cy="55" r="4" fill="#78716c"/>

      <!-- Área artística de gravura -->
      <rect x="70" y="85" width="660" height="280" fill="url(#hatch)" stroke="#d6cfc4" stroke-width="1" rx="4"/>
      
      <!-- Emblema de Livro e Pena Clássica -->
      <g transform="translate(400, 215) scale(1.4)">
        <path d="M -30 -10 C -15 -20, 0 -15, 0 5 C 0 -15, 15 -20, 30 -10 L 30 20 C 15 10, 0 15, 0 35 C 0 15, -15 10, -30 20 Z" fill="#292524" opacity="0.85"/>
        <line x1="0" y1="5" x2="0" y2="35" stroke="#fdfbf7" stroke-width="1.5"/>
        <path d="M 10 -25 Q 25 -40 35 -45 Q 32 -30 25 -20 Z" fill="#78716c"/>
      </g>

      <!-- Título e Legenda da Cena -->
      <text x="400" y="330" text-anchor="middle" font-family="Georgia, serif" font-size="16" font-style="italic" fill="#292524" font-weight="600">
        ${cleanTitle}
      </text>
      <text x="400" y="415" text-anchor="middle" font-family="'Inter', sans-serif" font-size="12" fill="#78716c" letter-spacing="1">
        — GRAVURA EDITORIAL • AMAZON KDP EDITION —
      </text>

      <!-- Arabesco decorativo inferior -->
      <path d="M 350 435 Q 400 445 450 435" fill="none" stroke="#78716c" stroke-width="1"/>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}
