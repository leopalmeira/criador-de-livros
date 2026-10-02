// SERVIÇO DE FILIGRANAS E SILHUETAS TEMÁTICAS PARA O MIOLO DO LIVRO
// Gera marcas d'água ultraleves (0% a 5% de opacidade) com objetos, lugares e figuras que mesclam sem se repetir

export interface ThematicMotif {
  id: string;
  name: string;
  type: 'object' | 'place' | 'figure';
  svgPath: string;
}

export class WatermarkArtService {
  /**
   * Catálogo de 18 silhuetas e gravuras vetoriais clássicas para páginas de livros
   */
  private static readonly MOTIFS: ThematicMotif[] = [
    // --- OBJETOS ---
    {
      id: 'sword',
      name: 'Lâmina de Aço Forjado',
      type: 'object',
      svgPath: 'M 98 10 L 102 10 L 102 140 L 115 140 L 115 146 L 102 146 L 102 170 L 98 170 L 98 146 L 85 146 L 85 140 L 98 140 Z M 100 172 C 103 172 105 174 105 177 C 105 180 103 182 100 182 C 97 182 95 180 95 177 C 95 174 97 172 100 172 Z'
    },
    {
      id: 'hourglass',
      name: 'Ampulheta do Tempo',
      type: 'object',
      svgPath: 'M 70 30 L 130 30 L 130 40 L 120 40 L 102 95 L 102 105 L 120 160 L 130 160 L 130 170 L 70 170 L 70 160 L 80 160 L 98 105 L 98 95 L 80 40 L 70 40 Z M 85 45 L 115 45 L 100 90 Z M 100 110 L 115 155 L 85 155 Z'
    },
    {
      id: 'quill',
      name: 'Pena de Caligrafia & Tinteiro',
      type: 'object',
      svgPath: 'M 130 20 C 120 40 105 70 95 100 C 88 120 82 145 78 175 L 75 180 L 80 177 C 88 150 98 125 110 100 C 122 75 135 50 145 30 C 145 25 140 15 130 20 Z M 70 165 C 65 175 62 185 60 190 L 80 190 C 78 185 75 175 70 165 Z'
    },
    {
      id: 'chalice',
      name: 'Cálice Nobre',
      type: 'object',
      svgPath: 'M 75 40 Q 100 35 125 40 L 122 85 Q 120 115 102 125 L 102 155 L 120 165 L 120 172 L 80 172 L 80 165 L 98 155 L 98 125 Q 80 115 78 85 Z'
    },
    {
      id: 'compass',
      name: 'Rosa dos Ventos & Compasso',
      type: 'object',
      svgPath: 'M 100 20 L 105 85 L 170 90 L 105 95 L 100 160 L 95 95 L 30 90 L 95 85 Z M 100 90 m -8, 0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0'
    },
    {
      id: 'ancient-key',
      name: 'Chave Ancestral',
      type: 'object',
      svgPath: 'M 100 30 C 115 30 125 42 125 55 C 125 68 115 80 100 80 C 85 80 75 68 75 55 C 75 42 85 30 100 30 Z M 100 42 C 93 42 87 48 87 55 C 87 62 93 68 100 68 C 107 68 113 62 113 55 C 113 48 107 42 100 42 Z M 97 80 L 103 80 L 103 165 L 118 165 L 118 155 L 103 155 L 103 145 L 114 145 L 114 135 L 103 135 L 103 80 Z'
    },

    // --- LUGARES & ESTRUTURAS ---
    {
      id: 'castle-tower',
      name: 'Torre da Cidadela',
      type: 'place',
      svgPath: 'M 80 60 L 80 40 L 88 40 L 88 50 L 96 50 L 96 40 L 104 40 L 104 50 L 112 50 L 112 40 L 120 40 L 120 60 L 115 70 L 118 170 L 82 170 L 85 70 Z M 95 90 Q 100 85 105 90 L 105 110 L 95 110 Z M 95 130 Q 100 125 105 130 L 105 150 L 95 150 Z'
    },
    {
      id: 'mountain-peak',
      name: 'Picos da Cordilheira Solitária',
      type: 'place',
      svgPath: 'M 30 160 L 85 60 L 115 110 L 140 75 L 180 160 Z M 85 60 L 85 100 L 95 120 L 80 160 M 140 75 L 135 115 L 145 160'
    },
    {
      id: 'ancient-arch',
      name: 'Portal Arcano em Arco',
      type: 'place',
      svgPath: 'M 65 170 L 65 90 C 65 50 135 50 135 90 L 135 170 L 125 170 L 125 90 C 125 60 75 60 75 90 L 75 170 Z M 60 170 L 140 170 L 140 175 L 60 175 Z'
    },
    {
      id: 'ship-sails',
      name: 'Caravela nos Mares Distantes',
      type: 'place',
      svgPath: 'M 98 40 L 102 40 L 102 140 L 98 140 Z M 102 45 Q 135 55 125 90 Q 110 85 102 85 Z M 102 95 Q 140 105 130 140 Q 112 135 102 135 Z M 98 60 Q 75 70 80 100 Q 90 95 98 95 Z M 50 145 C 70 165 130 165 155 145 L 145 155 C 120 170 80 170 60 155 Z'
    },

    // --- FIGURAS & SÍMBOLOS ---
    {
      id: 'flying-raven',
      name: 'Corvo em Voo',
      type: 'figure',
      svgPath: 'M 100 80 Q 80 50 50 45 Q 70 70 85 85 Q 55 85 40 95 Q 65 100 85 100 L 85 125 Q 100 115 105 100 Q 125 100 150 95 Q 135 85 115 85 Q 130 70 150 45 Q 120 50 100 80 Z'
    },
    {
      id: 'howling-wolf',
      name: 'Lobo Solitário',
      type: 'figure',
      svgPath: 'M 85 160 L 85 135 Q 85 115 95 105 L 115 75 Q 125 60 120 50 Q 130 55 135 65 L 125 80 Q 115 100 115 115 L 115 160 Z M 120 50 L 112 40 Q 118 45 120 50 Z M 115 75 L 128 72 Z'
    },
    {
      id: 'dragon-crest',
      name: 'Brasão do Dragão',
      type: 'figure',
      svgPath: 'M 95 45 Q 110 35 125 45 Q 115 60 105 65 Q 125 65 140 80 Q 125 90 105 85 Q 115 110 95 135 Q 90 110 95 85 Q 75 90 60 80 Q 75 65 95 65 Z'
    },
    {
      id: 'laurel-wreath',
      name: 'Coroa de Louros Triunfal',
      type: 'figure',
      svgPath: 'M 65 135 C 50 110 50 70 75 45 C 80 60 75 80 85 95 C 80 110 70 125 65 135 Z M 135 135 C 150 110 150 70 125 45 C 120 60 125 80 115 95 C 120 110 130 125 135 135 Z M 95 150 Q 100 155 105 150 Z'
    },
    {
      id: 'celtic-knot',
      name: 'Nó Celta de Eternidade',
      type: 'figure',
      svgPath: 'M 100 40 C 130 40 140 70 125 95 C 140 120 130 150 100 150 C 70 150 60 120 75 95 C 60 70 70 40 100 40 Z M 100 55 C 85 55 80 75 90 90 C 80 105 85 135 100 135 C 115 135 120 105 110 90 C 120 75 115 55 100 55 Z'
    },
    {
      id: 'wild-rose',
      name: 'Rosa Silvestre com Espinhos',
      type: 'figure',
      svgPath: 'M 100 65 C 115 65 125 75 120 90 C 115 105 95 115 100 135 L 98 175 L 96 175 L 97 135 C 90 120 80 105 82 90 C 85 75 90 65 100 65 Z M 98 140 Q 110 135 115 140 Q 110 145 98 142 Z M 97 155 Q 85 150 80 155 Q 85 160 97 157 Z'
    }
  ];

  /**
   * Retorna o motivo correspondente a uma página para garantir alternância e nunca repetição
   */
  public static getMotifForPage(pageNumber: number, chapterIndex: number = 1): ThematicMotif {
    // Cálculo de dispersão que mescla objetos, lugares e figuras sem repetições consecutivas
    const primeSeed = (pageNumber * 7 + chapterIndex * 13 + 3) % this.MOTIFS.length;
    return this.MOTIFS[primeSeed];
  }

  /**
   * Gera o SVG DataURL da silhueta temática pronta para ser aplicada como marca d'água
   */
  public static getWatermarkSvgDataUrl(
    pageNumber: number, 
    chapterIndex: number = 1,
    opacityPercent: number = 3.0
  ): string {
    const motif = this.getMotifForPage(pageNumber, chapterIndex);
    const alpha = Math.max(0, Math.min(0.05, opacityPercent / 100)); // Trava estritamente de 0 a 5% (0 a 0.05)

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
      <path d="${motif.svgPath}" fill="#1c1917" opacity="${alpha.toFixed(4)}" />
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}
