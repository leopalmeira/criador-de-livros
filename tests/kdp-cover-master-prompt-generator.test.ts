import { describe, it, expect } from 'vitest';
import {
  gerarMasterPromptCapa600a1200Palavras,
  contarPalavras
} from '../src/services/kdp-cover-master-prompt-generator';

describe('KdpCoverMasterPromptGenerator — Prompts com 3.000+ Palavras e Regras Estritas', () => {
  it('1. Deve gerar prompt de Capa Frontal com pelo menos 3.000 palavras reais', () => {
    const result = gerarMasterPromptCapa600a1200Palavras({
      titulo: 'O Segredo Que Ela Levou',
      subtitulo: 'Duas linhas temporais revelam uma mente silenciosa',
      autor: 'Leandro P. Souza',
      genero: 'Suspense psicológico',
      premissa: 'Um detetive investiga um caso arquivado e descobre que a única testemunha é sua própria irmã.',
      idioma: 'pt'
    });

    expect(result.wordCount).toBeGreaterThanOrEqual(3000);
    expect(contarPalavras(result.promptCompleto)).toBeGreaterThanOrEqual(3000);
    expect(result.promptCompleto).toContain('O Segredo Que Ela Levou');
    expect(result.promptCompleto).toContain('Leandro P. Souza');
  });

  it('2. Deve gerar prompt de Contracapa com pelo menos 3.000 palavras reais', () => {
    const result = gerarMasterPromptCapa600a1200Palavras({
      titulo: 'O Segredo Que Ela Levou',
      subtitulo: 'Duas linhas temporais revelam uma mente silenciosa',
      autor: 'Leandro P. Souza',
      genero: 'Suspense psicológico',
      premissa: 'Um detetive investiga um caso arquivado e descobre que a única testemunha é sua própria irmã.',
      idioma: 'pt'
    });

    expect(result.wordCountContracapa).toBeGreaterThanOrEqual(3000);
    expect(contarPalavras(result.promptContracapaIsoladaCompleto)).toBeGreaterThanOrEqual(3000);
    expect(result.promptContracapaIsoladaCompleto).toContain('BREVE LEITURA OFICIAL DE CONTRACAPA');
    expect(result.promptContracapaIsoladaCompleto).toContain('PROIBIÇÃO ABSOLUTA E REGRA MANDATÓRIA: ZERO CÓDIGOS DE BARRA');
  });

  it('3. Deve incluir proibição explícita e negativa de caixas brancas e códigos de barras em todos os prompts', () => {
    const result = gerarMasterPromptCapa600a1200Palavras({
      titulo: 'A Sombra do Alvo',
      autor: 'Leandro Souza',
      genero: 'Crimes reais',
      idioma: 'pt'
    });

    // Proibição negativa nos prompts
    expect(result.promptCompleto).toContain('PROIBIÇÃO TOTAL');
    expect(result.promptParaMotorIa).toContain('--no barcode, barcode box, white box, white rectangle');
    expect(result.promptContracapaIsoladaMotorIa).toContain('--no barcode, barcode box, white box, white rectangle');
    expect(result.promptCapaEContracapaMotorIa).toContain('--no barcode, barcode box, white box, white rectangle');
  });
});

