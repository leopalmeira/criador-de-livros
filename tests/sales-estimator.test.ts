import { describe, it, expect } from 'vitest';
import { SalesEstimator } from '../src/estimators/sales-estimation-model';
import { DEFAULT_SALES_MODELS } from '../src/database/defaults';

describe('SalesEstimator', () => {
  const estimator = new SalesEstimator(30);

  it('deve estimar vendas corretamente para BSR 1 no Brasil', () => {
    const res = estimator.estimate({
      marketplace: 'amazon.com.br',
      bsr: 1
    });

    expect(res.estimatedDailySales).toBeGreaterThan(200);
    expect(res.estimatedMonthlySales).toBe(Math.round((res.estimatedDailySales || 0) * 30));
    expect(res.confidence).toBe('ALTA');
  });

  it('deve interpolar suavemente BSR intermediário entre pontos de calibração', () => {
    const res = estimator.estimate({
      marketplace: 'amazon.com.br',
      bsr: 2500
    });

    expect(res.estimatedDailySales).toBeGreaterThan(3.0);
    expect(res.estimatedDailySales).toBeLessThan(9.5);
  });

  it('deve retornar null se BSR for indefinido ou ausente (nunca inventar dados)', () => {
    const res = estimator.estimate({
      marketplace: 'amazon.com.br',
      bsr: undefined
    });

    expect(res.estimatedDailySales).toBeNull();
    expect(res.estimatedMonthlySales).toBeNull();
    expect(res.confidence).toBe('BAIXA');
  });

  it('deve atribuir confiança ALTA para BSR baixo e BAIXA para BSR acima de 120k', () => {
    const resHigh = estimator.estimate({ marketplace: 'amazon.com.br', bsr: 5000 });
    const resLow = estimator.estimate({ marketplace: 'amazon.com.br', bsr: 150000 });

    expect(resHigh.confidence).toBe('ALTA');
    expect(resLow.confidence).toBe('BAIXA');
  });

  it('deve respeitar o multiplicador de dias (30 vs 30.44)', () => {
    const est30 = new SalesEstimator(30);
    const est3044 = new SalesEstimator(30.44);

    const r1 = est30.estimate({ marketplace: 'amazon.com.br', bsr: 1000 });
    const r2 = est3044.estimate({ marketplace: 'amazon.com.br', bsr: 1000 });

    expect(r2.estimatedMonthlySales).toBeGreaterThanOrEqual(r1.estimatedMonthlySales!);
  });
});
