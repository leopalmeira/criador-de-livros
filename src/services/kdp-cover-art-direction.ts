import { sanitizarPromptArteSemTexto } from './kdp-orthography-engine';

export type CoverVisualStyle = 'minimalist' | 'cinematic' | 'concept' | 'abstract';
export type CoverTitleLayout = 'topo' | 'centro' | 'esquerda';

const COVER_STYLE_DIRECTIONS: Record<CoverVisualStyle, string> = {
  minimalist: 'Premium photorealistic editorial photography, restrained composition, natural directional light, authentic material texture, subtle depth of field, elegant negative space.',
  cinematic: 'Naturalistic cinematic photography on a 35mm lens, believable available light, nuanced shadows, subtle film grain, emotionally specific scene, lifelike materials.',
  concept: 'Handcrafted fine-art editorial illustration, expressive but controlled brushwork, layered pigments, tactile paper or canvas texture, sophisticated color harmony.',
  abstract: 'Intentional geometric fine-art composition, carefully balanced shapes, tactile matte surfaces, deliberate asymmetry, refined editorial color palette; not generic clip art or stock vectors.'
};

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
  const sceneDirection = `Create a distinctive book-cover artwork rooted in this exact subject: ${subject}. Genre and visual context: ${genre}. ${sampleContext} Preserve the subject's real-world details and use a coherent, specific composition rather than a generic template.`;
  const realismDirection = 'Avoid waxy or plastic surfaces, uncanny faces, artificial anatomy, over-smoothed skin, excessive sharpening, generic 3D rendering, and unrelated decorative objects.';

  return sanitizarPromptArteSemTexto(
    genre,
    `${sceneDirection} ${styleDirection} ${realismDirection}`
  );
}
