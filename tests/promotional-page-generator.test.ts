import { describe, it, expect, vi } from 'vitest';
import * as KdpAiEngine from '../src/services/kdp-ai-engine';
import {
  obterTemaPorGenero,
  gerarConteudoPaginaPromocional,
  getAvailableApiKeys
} from '../src/services/kdp-ai-engine';

describe('BOOK INTEL KDP — Gerador de Página Promocional & KDP Pro Engine', () => {
  it('1. Deve mapear temas visuais adaptativos corretos por gênero', () => {
    const suspenseTheme = obterTemaPorGenero('Thriller / Mistério Investigativo');
    expect(suspenseTheme.name).toBe('Suspense / Mistério');
    expect(suspenseTheme.fontFamilyTitle).toContain('Playfair Display');
    expect(suspenseTheme.bodyBg).toBe('#090a0f');

    const romanceTheme = obterTemaPorGenero('Romance');
    expect(romanceTheme.name).toBe('Romance Contemporâneo');
    expect(romanceTheme.accentColor).toBe('#f472b6');

    const fantasyTheme = obterTemaPorGenero('Fantasia');
    expect(fantasyTheme.name).toBe('Alta Fantasia & Aventura');
    expect(fantasyTheme.fontFamilyTitle).toContain('Cinzel');

    const selfHelpTheme = obterTemaPorGenero('Autoajuda');
    expect(selfHelpTheme.name).toBe('Desenvolvimento Pessoal');
    expect(selfHelpTheme.accentColor).toBe('#34d399');
  });

  it('2. Deve obter chaves de API disponíveis a partir de variáveis de ambiente', () => {
    process.env.VITE_GEMINI_API_KEY = 'test_mock_gemini_key_123';
    const keys = getAvailableApiKeys();
    expect(keys.length).toBeGreaterThan(0);
    expect(keys).toContain('test_mock_gemini_key_123');
  });

  it('3. Deve montar dados completos da página promocional respeitando as 7 seções obrigatórias', async () => {
    // Mock determinístico da resposta da IA para proteger cotas e garantir velocidade
    vi.spyOn(KdpAiEngine, 'chamarGeminiTexto').mockResolvedValue({
      texto: JSON.stringify({
        heroHook: 'O silêncio nunca é vazio quando os segredos têm voz própria.',
        headline: 'Apresentando A Cabana: Um Hóspede Silencioso',
        synopsis: 'Nas montanhas isoladas, um antigo refúgio guarda a chave para um desaparecimento que a polícia declarou insolúvel. Uma trama de tirar o fôlego escrita por Hector Alves.',
        impactQuote: 'O silêncio nunca é vazio.',
        features: [
          { title: 'Atmosfera Claustrofóbica', subtitle: 'Isolamento', description: 'Cenário montanhoso gelado e hostil que amplifica cada passo suspeito.' },
          { title: 'Mistério Investigativo', subtitle: 'Pistas Ocultas', description: 'Quebra-cabeças narrativo onde cada testemunha mente por um motivo diferente.' },
          { title: 'Tensão Psicológica', subtitle: 'Reviravoltas', description: 'Construção psicológica primorosa que redefine a confiança entre os personagens.' }
        ],
        experienceTitle: 'O Universo de A Cabana',
        experienceDescription: 'Uma imersão literária que desafia seus instintos de dedução.',
        experienceItems: [
          'Suspense crescente a cada capítulo',
          'Ambiente isolado nas montanhas',
          'Segredos de família perturbadores',
          'Atmosfera cinematográfica'
        ],
        closingQuestion: 'Você entraria na cabana?',
        closingCtaText: 'Adquira na Amazon KDP',
        closingBadges: 'eBook Kindle · Capa Comum · Kindle Unlimited'
      }),
      modelo: 'gemini-3.8-flash'
    });

    const livroAmostra = {
      title: 'A Cabana',
      subtitle: 'Um Hóspede Silencioso',
      author: 'Hector Alves',
      genre: 'Thriller / Mistério Investigativo',
      topic: 'Um refúgio isolado nas montanhas esconde segredos perturbadores.'
    };

    const promoData = await gerarConteudoPaginaPromocional(
      livroAmostra,
      'data:image/png;base64,mockCapa',
      'data:image/png;base64,mockPromo'
    );

    // 1. Hero
    expect(promoData.title).toBe('A Cabana');
    expect(promoData.heroHook).toBeDefined();
    expect(promoData.heroHook.length).toBeGreaterThan(5);

    // 2. Apresentação
    expect(promoData.headline).toBeDefined();
    expect(promoData.synopsis).toBeDefined();

    // 3. Frase de Impacto
    expect(promoData.impactQuote).toBeDefined();

    // 4. Características (3 cards)
    expect(promoData.features.length).toBe(3);
    expect(promoData.features[0].title).toBeDefined();

    // 5. Imagens
    expect(promoData.coverImageUrl).toContain('mockCapa');
    expect(promoData.promotionalImageUrl).toContain('mockPromo');

    // 6. Experiência
    expect(promoData.experienceTitle).toBeDefined();
    expect(promoData.experienceItems.length).toBeGreaterThanOrEqual(3);

    // 7. Encerramento & CTA
    expect(promoData.closingQuestion).toBeDefined();
    expect(promoData.closingCtaText).toBeDefined();
    expect(promoData.genreTheme).toBeDefined();
  }, 30000);
});
