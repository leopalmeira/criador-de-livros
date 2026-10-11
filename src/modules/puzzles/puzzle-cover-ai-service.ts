import { gerarImagemReplicate } from '../../services/replicate-service';
import { PuzzleBookConfig, PuzzleLanguage } from './types';

export interface PresetCoverArt {
  id: string;
  name: string;
  palettePrimary: string;
  paletteSecondary: string;
  paletteAccent: string;
  // Ilustração base do livro aberto 3D com lápis e iluminação de estúdio
  backgroundGradient: string;
  bannerColor: string;
  badgeBg: string;
}

export const PRESET_COVER_STYLES: PresetCoverArt[] = [
  {
    id: 'bestseller-carmim',
    name: 'Bestseller Vinho Carmim (Referência Oficial Amazon)',
    palettePrimary: '#7f1d1d',
    paletteSecondary: '#991b1b',
    paletteAccent: '#f59e0b',
    backgroundGradient: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)',
    bannerColor: '#1e3a8a',
    badgeBg: '#1e1b4b'
  },
  {
    id: 'navy-gold',
    name: 'Azul Meia-Noite & Dourado Real',
    palettePrimary: '#0f172a',
    paletteSecondary: '#1e3a8a',
    paletteAccent: '#fbbf24',
    backgroundGradient: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e3a8a 100%)',
    bannerColor: '#d97706',
    badgeBg: '#451a03'
  },
  {
    id: 'emerald-zen',
    name: 'Verde Esmeralda Relax & Foco',
    palettePrimary: '#064e3b',
    paletteSecondary: '#047857',
    paletteAccent: '#34d399',
    backgroundGradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)',
    bannerColor: '#0f766e',
    badgeBg: '#134e4a'
  },
  {
    id: 'royal-purple',
    name: 'Púrpura Criativo & Âmbar',
    palettePrimary: '#3b0764',
    paletteSecondary: '#581c87',
    paletteAccent: '#f59e0b',
    backgroundGradient: 'linear-gradient(135deg, #2e1065 0%, #3b0764 50%, #581c87 100%)',
    bannerColor: '#7c3aed',
    badgeBg: '#1e1b4b'
  }
];

export class PuzzleCoverAiService {
  /**
   * Constrói um prompt cinematográfico para o Replicate (FLUX Schnell / Dev)
   * focado exclusivamente na composição de livro aberto 3D com lápis e iluminação editorial.
   */
  public static buildReplicatePrompt(config: PuzzleBookConfig): string {
    const themeHint = config.wordSearchCount > 0 ? 'word search and sudoku' : 'sudoku and maze';
    const colorDesc = config.coverPrimaryColor === '#7f1d1d' ? 'deep rich carmine wine burgundy' : 'deep rich navy blue and ambient warm amber';

    return `Commercial Amazon KDP bestseller cover illustration for a ${themeHint} puzzle book. High-end professional 3D product photography of an open paperback activity book lying flat on a minimalist wooden studio surface, showing crisp high-contrast black and white puzzle grid pages, two natural sharpened wooden graphite pencils resting across the book spine, beautiful soft realistic drop shadows, upper background in solid elegant ${colorDesc} gradient, warm directional studio lighting, cinematic rim light, crisp 8k resolution, ultra detailed, award-winning book packaging photography, absolutely clean photography without any typography or distorted letters.`;
  }

  /**
   * Gera a arte de fundo com o Replicate via proxy ou API oficial
   */
  public static async generateCoverArtWithReplicate(
    config: PuzzleBookConfig,
    customPrompt?: string
  ): Promise<string> {
    const prompt = customPrompt || this.buildReplicatePrompt(config);

    // Usa o aspect ratio 3:4 ou 2:3 ideal para capas verticais KDP
    const imageDataUrl = await gerarImagemReplicate(prompt, {
      aspectRatio: '3:4'
    });

    return imageDataUrl;
  }
}
