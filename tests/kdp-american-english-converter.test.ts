import { describe, it, expect } from 'vitest';
import { KdpAmericanEnglishConverter } from '../src/services/kdp-american-english-converter';

describe('KdpAmericanEnglishConverter — Localização para American English Contemporâneo', () => {
  it('formata o título dos capítulos estritamente como "Chapter N: [Title]" e nunca "Capítulo"', () => {
    const raw = `TITULO: Capítulo 1: O Início do Labirinto
TEXTO:
The cold November wind swept across the harbor of Boston as Detective Hayes pulled his coat tighter.`;

    const parsed = (KdpAmericanEnglishConverter as any).parseChapterOutput(raw, 1, 'O Início do Labirinto');
    expect(parsed.titulo).toMatch(/^Chapter 1:/);
    expect(parsed.titulo).not.toContain('Capítulo');
    expect(parsed.texto).toContain('Detective Hayes');
  });

  it('traduz títulos em fallback para equivalentes naturais em inglês americano', () => {
    const title = (KdpAmericanEnglishConverter as any).fallbackTranslateTitle('O Segredo Que Ela Levou');
    expect(title).toBe('The Secret She Kept');
  });

  it('fallback de capítulo substitui travessões por aspas de diálogo e padroniza Chapter', () => {
    const fallback = (KdpAmericanEnglishConverter as any).fallbackChapterLocalization(
      'Capítulo 3: A Pista Oculta',
      '— Precisamos sair daqui agora — disse Sarah, olhando para trás.',
      3
    );

    expect(fallback.titulo).toBe('Chapter 3: A Pista Oculta');
    expect(fallback.texto).toContain('"Precisamos sair daqui agora');
  });
});
