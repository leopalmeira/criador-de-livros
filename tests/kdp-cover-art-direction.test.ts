import { describe, expect, it } from 'vitest';
import { buildCoverArtPrompt } from '../src/services/kdp-cover-art-direction';

describe('Direção artística de capas KDP', () => {
  it('combina tema, premissa e estilo visual sem pedir texto dentro da imagem', () => {
    const prompt = buildCoverArtPrompt(
      'Autoajuda',
      'Uma mulher organizando o próprio espaço de trabalho ao amanhecer',
      'A história aborda foco e hábitos sustentáveis.',
      'minimalist'
    );

    expect(prompt).toContain('Uma mulher organizando o próprio espaço de trabalho ao amanhecer');
    expect(prompt).toContain('Premium photorealistic editorial photography');
    expect(prompt).toContain('NO TEXT');
    expect(prompt).toContain('Avoid waxy or plastic surfaces');
  });

  it('produz direções visuais diferentes para fotografia, ilustração e arte abstrata', () => {
    const subject = 'Uma composição botânica inspirada no cerrado';
    const photo = buildCoverArtPrompt('Natureza', subject, '', 'cinematic');
    const illustration = buildCoverArtPrompt('Natureza', subject, '', 'concept');
    const abstract = buildCoverArtPrompt('Natureza', subject, '', 'abstract');

    expect(photo).toContain('35mm lens');
    expect(illustration).toContain('Handcrafted fine-art editorial illustration');
    expect(abstract).toContain('Intentional geometric fine-art composition');
    expect(new Set([photo, illustration, abstract]).size).toBe(3);
  });
});
