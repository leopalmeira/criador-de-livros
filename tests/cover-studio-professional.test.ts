import { describe, it, expect } from 'vitest';
import { CoverMarketIntelService } from '../src/services/cover-studio/cover-market-intel';
import { CoverPromptEngine } from '../src/services/cover-studio/cover-prompt-engine';
import { ChromiumGeminiBridge } from '../src/services/cover-studio/chromium-gemini-bridge';
import { CoverQualityChecker } from '../src/services/cover-studio/cover-quality-checker';
import { DERIVED_ASSET_TEMPLATES } from '../src/services/cover-studio/cover-derived-assets';
import { BookProject } from '../src/types/book-project';

const mockProject: BookProject = {
  id: 'test_book_cover_123',
  title: 'O Código da Disciplina',
  subtitle: 'Como Construir Hábitos Inabaláveis e Dominar sua Rotina',
  author: 'Leandro Palmeira',
  description: 'Livro sobre disciplina e alta performance.',
  language: 'pt-BR',
  format: 'Capa Comum',
  estimatedPages: 160,
  targetPrice: 29.90,
  currency: 'BRL',
  targetMarketplace: 'amazon.com.br',
  categories: ['Autoajuda'],
  keywords: ['hábitos', 'foco'],
  topic: 'Disciplina e Alta Performance',
  genre: 'autoajuda',
  kdpBookType: 'self-help',
  targetAudience: 'Adultos e profissionais que desejam alta performance',
  status: 'OUTLINE',
  priority: 'ALTA',
  executionMode: 'assisted',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  actualPages: 160,
  trimSize: '6x9',
  paperType: 'bw-white',
  pipelineStage: 'outline',
  pipelineProgress: 50,
  pipelineLog: [],
  tasks: [],
  notes: '',
  competitorsAsins: []
};

describe('Módulo Profissional de Capas KDP (BookCoverStage)', () => {
  describe('1. CoverMarketIntelService (Análise & Direção de Arte)', () => {
    it('deve extrair conceitos semânticos, metáforas visuais e gatilhos emocionais da obra', () => {
      const analysis = CoverMarketIntelService.analyzeBookForCover(mockProject);
      expect(analysis.coreConcept).toBeDefined();
      expect(analysis.visualMetaphors.length).toBeGreaterThan(0);
      expect(analysis.emotionalTrigger).toBeDefined();
      expect(analysis.keyFocalPoint).toBeDefined();
      expect(analysis.genreSymbolism.length).toBeGreaterThan(0);
    });

    it('deve analisar as tendências visuais de mercado KDP e gaps de concorrentes', () => {
      const market = CoverMarketIntelService.analyzeVisualMarket('autoajuda');
      expect(market.genre).toContain('Autoajuda');
      expect(market.bestsellerColorPalette.primaryHex).toBeDefined();
      expect(market.competitorGaps.length).toBeGreaterThan(0);
      expect(market.amazonThumbnailTips.length).toBeGreaterThan(0);
    });

    it('deve gerar o briefing visual completo estruturado em Markdown', () => {
      const briefing = CoverMarketIntelService.generateVisualBriefing(mockProject);
      expect(briefing.fullMarkdownBrief).toContain('# BRIEFING EDITORIAL DE CAPA');
      expect(briefing.fullMarkdownBrief).toContain('O Código da Disciplina');
      expect(briefing.fullMarkdownBrief).toContain('Leandro Palmeira');
      expect(briefing.colorPalette.length).toBe(4);
    });
  });

  describe('2. CoverPromptEngine (Prompts Profissionais & Variações)', () => {
    it('deve formatar prompts específicos para Gemini Imagen 3, Midjourney, FLUX, SDXL e DALL-E 3', () => {
      const geminiPrompt = CoverPromptEngine.buildEnginePrompt('gemini-imagen', 'sunrise over skyscraper', 'Alta Performance');
      expect(geminiPrompt.engineName).toBe('Google Gemini Imagen 3');
      expect(geminiPrompt.positivePrompt).toContain('book cover background art');
      expect(geminiPrompt.positivePrompt).toContain('no text');
      expect(geminiPrompt.negativePrompt).toContain('text, letters, words');

      const midjourneyPrompt = CoverPromptEngine.buildEnginePrompt('midjourney', 'sunrise over skyscraper', 'Alta Performance');
      expect(midjourneyPrompt.readyToCopyCommand).toContain('/imagine prompt:');
      expect(midjourneyPrompt.readyToCopyCommand).toContain('--ar 2:3');

      const fluxPrompt = CoverPromptEngine.buildEnginePrompt('flux-1', 'sunrise over skyscraper', 'Alta Performance');
      expect(fluxPrompt.engineName).toContain('FLUX.1');
    });

    it('deve gerar 6 variações conceituais de capa simultâneas com links de renderização direta', () => {
      const variations = CoverPromptEngine.generateMultiOptionCoverPrompts(mockProject);
      expect(variations.length).toBe(6);
      variations.forEach(v => {
        expect(v.id).toBeDefined();
        expect(v.title).toBeDefined();
        expect(v.curatedDirectUrl).toContain('pollinations.ai');
        expect(v.promptByEngine['gemini-imagen']).toBeDefined();
        expect(v.promptByEngine['midjourney']).toBeDefined();
      });
    });
  });

  describe('3. ChromiumGeminiBridge (Sessão Chromium & Clipboard)', () => {
    it('deve verificar o ambiente Chromium e prover URLs oficiais', () => {
      const status = ChromiumGeminiBridge.checkEnvironment();
      expect(status.geminiWebUrl).toBe('https://gemini.google.com/app');
      expect(status.aiStudioUrl).toBe('https://aistudio.google.com/live');
    });
  });

  describe('4. CoverQualityChecker (Auditoria Técnica KDP)', () => {
    it('deve calcular com precisão a espessura da lombada e dimensões de capa aberta para KDP', () => {
      // 160 páginas em papel branco P&B (0.002252 por folha)
      const geom = CoverQualityChecker.calculateKdpSpineAndCover('6x9', 160, 'bw-white');
      expect(geom.spineWidthInches).toBeCloseTo(160 * 0.002252, 3);
      expect(geom.bleedInches).toBe(0.125);
      expect(geom.totalCoverWidthInches).toBeCloseTo(0.125 + 6.0 + geom.spineWidthInches + 6.0 + 0.125, 3);
      expect(geom.totalCoverHeightInches).toBeCloseTo(0.125 + 9.0 + 0.125, 3);
      expect(geom.totalCoverWidthPixels300Dpi).toBeGreaterThan(3000);
    });

    it('deve aprovar capa completa em auditoria com score >= 80%', () => {
      const audit = CoverQualityChecker.auditCover(
        'O Código da Disciplina',
        'Subtítulo Claro e Objetivo',
        'Leandro Palmeira',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf',
        '6x9',
        160,
        'bw-white',
        true
      );
      expect(audit.overallScore).toBeGreaterThanOrEqual(80);
      expect(audit.isApprovedForKdp).toBe(true);
      expect(audit.failCount).toBe(0);
    });
  });

  describe('5. CoverDerivedAssetsService (Materiais Derivados da Capa)', () => {
    it('deve disponibilizar templates de materiais derivados exclusivamente da capa', () => {
      expect(DERIVED_ASSET_TEMPLATES.length).toBeGreaterThanOrEqual(6);
      const ids = DERIVED_ASSET_TEMPLATES.map(a => a.id);
      expect(ids).toContain('mockup-3d-hardcover');
      expect(ids).toContain('mockup-3d-paperback');
      expect(ids).toContain('instagram-feed');
      expect(ids).toContain('instagram-stories');
      expect(ids).toContain('amazon-aplus-hero');
      expect(ids).toContain('audiobook-square');
    });
  });
});
