import { describe, it, expect } from 'vitest';
import { AmazonBRParser } from '../src/parsers/amazon-br-parser';
import { AmazonUSParser } from '../src/parsers/amazon-us-parser';
import { parseDateString, calculateAge } from '../src/utils/formatters';

describe('AmazonParser & Formatters', () => {
  const brParser = new AmazonBRParser();
  const usParser = new AmazonUSParser();

  it('deve extrair ASIN a partir de diferentes padrões de URL', () => {
    expect(brParser.extractAsin('https://www.amazon.com.br/dp/B09ABCDEF1')).toBe('B09ABCDEF1');
    expect(brParser.extractAsin('https://www.amazon.com.br/gp/product/B081234567/ref=s9_bw_cg')).toBe('B081234567');
    expect(usParser.extractAsin('https://www.amazon.com/Book-Title/dp/B07XYZ9999')).toBe('B07XYZ9999');
  });

  it('deve extrair e normalizar preços e moedas', () => {
    const brPrice = brParser.parsePrice('R$ 39,90');
    expect(brPrice.price).toBe(39.90);
    expect(brPrice.currency).toBe('BRL');

    const usPrice = usParser.parsePrice('$14.99');
    expect(usPrice.price).toBe(14.99);
    expect(usPrice.currency).toBe('USD');
  });

  it('deve extrair notas médias', () => {
    expect(brParser.parseRating('4,7 de 5 estrelas')).toBe(4.7);
    expect(usParser.parseRating('4.9 out of 5 stars')).toBe(4.9);
  });

  it('deve extrair contagem de avaliações com separadores de milhar', () => {
    expect(brParser.parseReviewCount('1.450 avaliações de clientes')).toBe(1450);
    expect(usParser.parseReviewCount('12,380 ratings')).toBe(12380);
  });

  it('deve fazer parse de datas e calcular idade do livro', () => {
    const ptDate = parseDateString('15 de janeiro de 2022');
    expect(ptDate).not.toBeNull();
    expect(ptDate?.getFullYear()).toBe(2022);
    expect(ptDate?.getMonth()).toBe(0);

    const age = calculateAge('10 de maio de 2021');
    expect(age).not.toBeNull();
    expect(age?.ageDays).toBeGreaterThan(365);
    expect(age?.formatted).toContain('ano');
  });
});
