import { describe, it, expect, vi } from 'vitest';
import {
  TikTokStoryVideoService,
  AVAILABLE_TIKTOK_VOICES
} from '../src/services/tiktok-story-video-service';

describe('TikTokStoryVideoService — Criação de Vídeos para TikTok / Reels / Shorts', () => {
  const sampleChapter = `
No coração da tempestade, Elena observava os relâmpagos cortarem o céu de ônix. As antigas muralhas de pedra rangiam sob a força do vento impetuoso.
Ela segurava em suas mãos o relicário de prata, o único vestígio deixado por seu pai antes do grande desaparecimento.
Um estrondo distante ecoou nos corredores da catedral esquecida. Passos pesados se aproximavam na escuridão.
"Eles encontraram o caminho", murmurou Elena, preparando-se para a fuga impossível através das passagens subterrâneas.
Com um salto no vazio, ela desapareceu nas sombras, levando consigo o segredo que poderia mudar o destino de todo o reino.
  `.trim();

  it('deve decompor um capítulo em cenas com exatamente 3 takes cinematográficos cada (Plano Geral, Médio e Close-up)', async () => {
    const scenes = await TikTokStoryVideoService.analyzeChapterIntoScenes(
      'O Segredo das Sombras',
      'Capítulo 1: O Despertar da Tempestade',
      sampleChapter,
      'Fantasia Sombria',
      4
    );

    expect(Array.isArray(scenes)).toBe(true);
    expect(scenes.length).toBeGreaterThanOrEqual(1);

    const firstScene = scenes[0];
    expect(firstScene).toHaveProperty('id');
    expect(firstScene).toHaveProperty('sceneNumber');
    expect(firstScene).toHaveProperty('text');
    expect(firstScene).toHaveProperty('speechText');
    expect(firstScene).toHaveProperty('images');
    expect(firstScene.images.length).toBe(3);

    // Valida os 3 takes da cena
    expect(firstScene.images[0].takeNumber).toBe(1);
    expect(firstScene.images[0].label).toContain('Plano Aberto');
    expect(firstScene.images[1].takeNumber).toBe(2);
    expect(firstScene.images[1].label).toContain('Plano Médio');
    expect(firstScene.images[2].takeNumber).toBe(3);
    expect(firstScene.images[2].label).toContain('Close-up');
  });

  it('deve conter catálogo de vozes neurais com Francisca, Antonio, Thalita, Brenda, Fabio e Donato', () => {
    expect(AVAILABLE_TIKTOK_VOICES.length).toBeGreaterThanOrEqual(6);
    const voiceIds = AVAILABLE_TIKTOK_VOICES.map(v => v.id);

    expect(voiceIds).toContain('edge:pt-BR-FranciscaNeural');
    expect(voiceIds).toContain('edge:pt-BR-AntonioNeural');
    expect(voiceIds).toContain('edge:pt-BR-ThalitaMultilingualNeural');
    expect(voiceIds).toContain('edge:pt-BR-BrendaNeural');
    expect(voiceIds).toContain('edge:pt-BR-FabioNeural');
    expect(voiceIds).toContain('edge:pt-BR-DonatoNeural');
  });

  it('deve permitir renderizar frame com opção de legendas no rodapé ou vídeo 100% limpo', () => {
    const canvas = {
      width: 720,
      height: 1280
    } as HTMLCanvasElement;

    const mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn()
      }),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn()
    } as unknown as CanvasRenderingContext2D;

    // Renderiza sem legendas (vídeo limpo)
    TikTokStoryVideoService.renderVideoFrame(
      mockCtx,
      canvas,
      null,
      null,
      0.5,
      0,
      'Legenda teste de cena',
      'Livro Teste',
      0,
      3,
      1,
      { showSubtitles: false, showTopHeader: false }
    );

    expect(mockCtx.fillRect).toHaveBeenCalled();
  });
});
