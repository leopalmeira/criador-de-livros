import { describe, it, expect } from 'vitest';
import { CategoryIntelligenceService } from '../src/services/category-intelligence-service';
import { db } from '../src/database/local-database';

describe('BookEngin — Inteligência Comercial por Gênero (CategoryIntelligenceService)', () => {
  it('deve listar a hierarquia de gêneros e categorias', () => {
    const genres = CategoryIntelligenceService.getGenreHierarchy();
    expect(genres.length).toBeGreaterThan(0);

    const romance = genres.find(g => g.id === 'romance' || g.name.includes('Romance'));
    expect(romance).toBeDefined();

    const contemporary = romance?.categories.find(c => c.name === 'Contemporary Romance');
    expect(contemporary).toBeDefined();
    expect(contemporary?.subcategories.length).toBeGreaterThan(0);
  });

  it('deve coletar, estimar e filtrar best sellers rigorosamente por BSR <= 80 e Rating >= 4.1 no marketplace EUA', async () => {
    const report = await CategoryIntelligenceService.analyzeCategory({
      marketplace: 'amazon.com',
      genre: 'Romance',
      category: 'Contemporary Romance',
      subcategory: 'Enemies to Lovers',
      filterCriteria: {
        maxBsr: 80,
        minRating: 4.1
      }
    });

    expect(report).toBeDefined();
    expect(report.metrics.marketplace).toBe('amazon.com');
    expect(report.metrics.qualified_books).toBeGreaterThan(0);

    // Todos os livros retornados devem satisfazer os filtros
    report.books.forEach(b => {
      expect(b.bsr).toBeLessThanOrEqual(80);
      expect(b.estimatedDailySales).toBeGreaterThan(0);
      expect(b.estimatedMonthlySales).toBeGreaterThan(0);
      expect(b.estimatedDailyRoyalty).toBeGreaterThan(0);
      expect(b.estimatedMonthlyRoyalty).toBeGreaterThan(0);

      // Não confundir receita bruta com royalty líquido KDP
      expect(b.estimatedMonthlyGrossRevenue).toBeGreaterThan(b.estimatedMonthlyRoyalty!);
    });

    // Validar indicadores agregados
    expect(report.metrics.avg_bsr).toBeLessThanOrEqual(80);
    expect(report.metrics.avg_rating).toBeGreaterThanOrEqual(4.1);
    expect(report.metrics.avg_sales_day).toBeGreaterThan(0);
    expect(report.metrics.avg_sales_month).toBeGreaterThan(0);
    expect(report.metrics.avg_royalty_day).toBeGreaterThan(0);
    expect(report.metrics.avg_royalty_month).toBeGreaterThan(0);

    // BSR mínimo e máximo consistentes
    expect(report.metrics.min_bsr).toBeLessThanOrEqual(report.metrics.max_bsr);
  });

  it('deve manter métricas separadas e independentes para Amazon Brasil (amazon.com.br)', async () => {
    const reportBR = await CategoryIntelligenceService.analyzeCategory({
      marketplace: 'amazon.com.br',
      genre: 'Romance',
      category: 'Contemporary Romance',
      filterCriteria: {
        maxBsr: 80,
        minRating: 4.1
      }
    });

    expect(reportBR.metrics.marketplace).toBe('amazon.com.br');
    expect(reportBR.metrics.avg_royalty_month).toBeGreaterThan(0);
    reportBR.books.forEach(b => {
      expect(b.currency).toBe('BRL');
    });
  });

  it('deve extrair padrões do mercado e gerar 3 propostas originais de oportunidades editoriais', async () => {
    const report = await CategoryIntelligenceService.analyzeCategory({
      marketplace: 'amazon.com',
      genre: 'Romance',
      category: 'Contemporary Romance',
      subcategory: 'Small Town'
    });

    expect(report.patterns.titleStructures.length).toBeGreaterThan(0);
    expect(report.patterns.recurringKeywords.length).toBeGreaterThan(0);
    expect(report.patterns.coverVisualPatterns.length).toBeGreaterThan(0);

    // Deve propor exatamente 3 oportunidades originais
    expect(report.opportunities.length).toBe(3);
    report.opportunities.forEach(opp => {
      expect(opp.title).toBeDefined();
      expect(opp.subtitle).toBeDefined();
      expect(opp.positioning).toBeDefined();
      expect(opp.commercialHook).toBeDefined();
      expect(opp.coverArtDirection).toBeDefined();
      expect(opp.estimatedMonthlyRoyaltyPotential).toBeGreaterThan(0);
    });
  });

  it('deve persistir métricas históricas no IndexedDB (categoryMarketMetrics)', async () => {
    const report = await CategoryIntelligenceService.analyzeCategory({
      marketplace: 'amazon.com',
      genre: 'Negócios & Finanças',
      category: 'Investimentos & Finanças Pessoais'
    });

    const latest = await db.getLatestCategoryMetrics('amazon.com', 'Negócios & Finanças', 'Investimentos & Finanças Pessoais');
    expect(latest).toBeDefined();
    expect(latest?.avg_bsr).toBe(report.metrics.avg_bsr);
    expect(latest?.avg_royalty_month).toBe(report.metrics.avg_royalty_month);
  });
});
