import { describe, it, expect } from 'vitest';
import { RoyaltyEstimator } from '../src/estimators/royalty-estimation-model';

describe('RoyaltyEstimator', () => {
  const estimator = new RoyaltyEstimator();

  it('deve calcular royalty de 70% para Kindle com preço entre 5.99 e 24.99 BRL', () => {
    const res = estimator.calculate(19.90, 'Kindle', undefined, 10, 300);
    // (19.90 - 0.30 entrega) * 0.70 = 19.60 * 0.70 = 13.72
    expect(res.unitRoyalty).toBeCloseTo(13.72, 1);
    expect(res.royaltyRateFormatted).toBe('70%');
    expect(res.estimatedDailyRoyalty).toBeCloseTo(137.2, 0);
  });

  it('deve calcular royalty de 35% para Kindle com preço fora do intervalo 70%', () => {
    const res = estimator.calculate(4.99, 'Kindle', undefined, 10, 300);
    // 4.99 * 0.35 = 1.7465 -> 1.75
    expect(res.unitRoyalty).toBeCloseTo(1.75, 1);
    expect(res.royaltyRateFormatted).toBe('35%');
  });

  it('deve calcular royalty KDP Print Capa Comum deduzindo custo fixo e páginas', () => {
    // Preço: R$ 45,00, 200 páginas
    // Bruto: 45 * 0.60 = 27.00
    // Custo Impressão: 5.00 + (200 * 0.07) = 5.00 + 14.00 = 19.00
    // Líquido: 27.00 - 19.00 = 8.00
    const res = estimator.calculate(45.00, 'Capa Comum', 200, 5, 150);
    expect(res.unitRoyalty).toBeCloseTo(8.00, 1);
    expect(res.estimatedDailyRoyalty).toBeCloseTo(40.00, 1);
  });

  it('deve retornar null se preço for ausente ou inválido', () => {
    const res = estimator.calculate(undefined, 'Kindle');
    expect(res.unitRoyalty).toBeNull();
    expect(res.estimatedDailyRoyalty).toBeNull();
  });
});
