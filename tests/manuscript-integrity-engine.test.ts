import { describe, it, expect } from 'vitest';
import { ManuscriptIntegrityEngine } from '../src/services/manuscript-integrity-engine';
import { sanitizeForPdf } from '../src/services/kdp-pdf-builder';
import { EpubBuilder } from '../src/services/formats/epub-builder';
import { PdfBuilder } from '../src/services/formats/pdf-builder';
import { BookProject } from '../src/types/book-project';

describe('Motor de Integridade e Sanitização Editorial KDP (ManuscriptIntegrityEngine)', () => {

  describe('1. Limpeza e Sanitização de Caracteres Matemáticos / LaTeX Residual (Encoding Fix)', () => {
    it('deve converter $\\hat{E}$, $\\hat{A}$, $\\tilde{A}$, $\\hat{O}$ para caracteres UTF-8 puros', () => {
      const input = '$\\hat{E}$le estava lá. A $\\hat{A}$nsia tomava conta da multid$\\tilde{A}$o no $\\hat{O}$nibus.';
      const output = ManuscriptIntegrityEngine.cleanLaTeXResiduals(input);
      expect(output).toBe('Êle estava lá. A Ânsia tomava conta da multidÃo no Ônibus.');
    });

    it('deve converter variações com acento circunflexo curto e til ($\^E$, $\~A$, $\acute{e}$)', () => {
      const input = 'O sol brilhava em Bel$\\^e$m e no coraç$\\~a$o de Caf$\\acute{e}$.';
      const output = ManuscriptIntegrityEngine.cleanLaTeXResiduals(input);
      expect(output).toBe('O sol brilhava em Belêm e no coração de Café.');
    });

    it('deve limpar macros LaTeX soltas sem cifrão (\\hat{E}, \\tilde{a}, \\acute{o})', () => {
      const input = 'Naquele instante, \\hat{E}le sentiu o coraç\\tilde{a}o bater mais forte na manh\\tilde{a}.';
      const output = ManuscriptIntegrityEngine.cleanLaTeXResiduals(input);
      expect(output).toBe('Naquele instante, Êle sentiu o coração bater mais forte na manhã.');
    });

    it('deve converter letras isoladas delimitadas por $ ($E$ -> E)', () => {
      const input = 'A letra $A$ e o ponto $B$ marcavam a fronteira.';
      const output = ManuscriptIntegrityEngine.cleanLaTeXResiduals(input);
      expect(output).toBe('A letra A e o ponto B marcavam a fronteira.');
    });

    it('deve sanitizar resíduos LaTeX em sanitizeForPdf antes de codificar em WinAnsi', () => {
      const input = '$\\hat{E}$le disse: "Ol$\\acute{a}$ mundo!"';
      const output = sanitizeForPdf(input);
      // No WinAnsi, Ê e á existem normalmente e não devem virar '?' nem imprimir '$\hat{E}$'
      expect(output).not.toContain('$\\hat{E}$');
      expect(output).not.toContain('?');
      expect(output).toContain('Êle disse:');
      expect(output).toContain('Olá mundo!');
    });
  });

  describe('2. Remoção de Metadados e Marcadores de Fim de Bloco', () => {
    it('deve remover marcadores de fim de capítulo em linha isolada ("Fim do Capítulo 18.", "Termina o Capítulo 20.")', () => {
      const input = `Eles finalmente encontraram o refúgio seguro nas montanhas.\n\nFim do Capítulo 18.\n\n`;
      const res = ManuscriptIntegrityEngine.removeChapterBlockMarkers(input);
      expect(res.cleanText).toBe('Eles finalmente encontraram o refúgio seguro nas montanhas.');
      expect(res.removedMarkers).toContain('Fim do Capítulo 18.');
    });

    it('deve remover variações como "[Fim do Capítulo 41]", "--- Fim do Capítulo ---", e notas de IA', () => {
      const input = `O silêncio reinou na sala.\n[Fim do Capítulo 41]\nNota do Autor: Resumo gerado com 350 tokens.`;
      const res = ManuscriptIntegrityEngine.removeChapterBlockMarkers(input);
      expect(res.cleanText).toBe('O silêncio reinou na sala.');
      expect(res.removedMarkers.length).toBe(2);
    });

    it('deve remover marcador de fim de capítulo inline colado no final do parágrafo narrativo', () => {
      const input = `Eles olharam para o horizonte e sorriram. Fim do Capítulo 25.`;
      const res = ManuscriptIntegrityEngine.removeChapterBlockMarkers(input);
      expect(res.cleanText).toBe('Eles olharam para o horizonte e sorriram.');
      expect(res.removedMarkers.some(m => m.includes('Fim do Capítulo 25'))).toBe(true);
    });

    it('deve remover padrões com "Termina o capítulo" em minúsculas ou maiúsculas', () => {
      const input = `A jornada havia acabado por hoje.\n\ntermina o capítulo 12`;
      const res = ManuscriptIntegrityEngine.removeChapterBlockMarkers(input);
      expect(res.cleanText).toBe('A jornada havia acabado por hoje.');
    });
  });

  describe('3. Validação de Integridade e Truncamento de Capítulos (Watchdog de Conclusão)', () => {
    it('deve detectar truncamento abrupto no meio de frase com reticências ("Ele não parecia nem um...")', () => {
      const truncated = 'O vento soprava frio lá fora. Ele não parecia nem um...';
      const check = ManuscriptIntegrityEngine.checkChapterTruncation(truncated);
      expect(check.isTruncated).toBe(true);
      expect(check.reason).toBeDefined();
    });

    it('deve detectar capítulo que termina sem qualquer pontuação final', () => {
      const unclosed = 'Ele caminhou até a porta e girou a maçaneta lentamente';
      const check = ManuscriptIntegrityEngine.checkChapterTruncation(unclosed);
      expect(check.isTruncated).toBe(true);
      expect(check.reason).toContain("não termina com pontuação de fechamento válida");
    });

    it('deve considerar válido capítulo encerrado com pontuação clássica (. ! ? — " ” »)', () => {
      const valid1 = 'Ele partiu em direção ao desconhecido.';
      const valid2 = '— Eu nunca voltarei! — exclamou ela.';
      const valid3 = '"Será este o fim da história?"';
      expect(ManuscriptIntegrityEngine.checkChapterTruncation(valid1).isTruncated).toBe(false);
      expect(ManuscriptIntegrityEngine.checkChapterTruncation(valid2).isTruncated).toBe(false);
      expect(ManuscriptIntegrityEngine.checkChapterTruncation(valid3).isTruncated).toBe(false);
    });

    it('deve reparar truncamentos com conector pendente ("Ele não parecia nem um..." -> fecha período sintático)', () => {
      const input = 'O detetive analisou as pistas na sala escura. Ele não parecia nem um...';
      const repaired = ManuscriptIntegrityEngine.repairTruncatedSentence(input);
      expect(repaired).toBe('O detetive analisou as pistas na sala escura. Ele não parecia.');
      expect(/[.!?]$/.test(repaired)).toBe(true);
    });

    it('deve reparar texto que termina sem pontuação acrescentando ponto final', () => {
      const input = 'A verdade finalmente veio à tona naquele amanhecer';
      const repaired = ManuscriptIntegrityEngine.repairTruncatedSentence(input);
      expect(repaired).toBe('A verdade finalmente veio à tona naquele amanhecer.');
    });

    it('deve validar consistência do livro contra a contagem prevista no sumário (45 previstos vs 41 gerados)', () => {
      const chapters = Array.from({ length: 41 }, (_, i) => ({
        index: i + 1,
        title: `Capítulo ${i + 1}`,
        text: `Conteúdo denso e finalizado do capítulo ${i + 1}.`
      }));

      const report = ManuscriptIntegrityEngine.validateBookConsistency(45, chapters);
      expect(report.isValid).toBe(false);
      expect(report.expectedChaptersCount).toBe(45);
      expect(report.actualChaptersCount).toBe(41);
      expect(report.missingChapters).toEqual([42, 43, 44, 45]);
      expect(report.discrepancyWarning).toContain('Discrepância na contagem de capítulos: previstos 45, compilados 41');
    });

    it('deve validar como íntegro quando todos os 45 capítulos previstos foram gerados e válidos', () => {
      const chapters = Array.from({ length: 45 }, (_, i) => ({
        index: i + 1,
        title: `Capítulo ${i + 1}`,
        text: `Texto narrativo completo do capítulo ${i + 1}.`
      }));

      const report = ManuscriptIntegrityEngine.validateBookConsistency(45, chapters);
      expect(report.isValid).toBe(true);
      expect(report.missingChapters.length).toBe(0);
      expect(report.discrepancyWarning).toBeUndefined();
    });
  });

  describe('4. Padronização Tipográfica de Diálogos', () => {
    it('deve converter hífen solto no início de falas ("- ") para travessão clássico ("— ")', () => {
      const input = `- Você viu o que aconteceu ontem à noite?\n- Eu estava dormindo, mas ouvi os passos.`;
      const output = ManuscriptIntegrityEngine.standardizeDialogueTypography(input);
      expect(output).toBe(`— Você viu o que aconteceu ontem à noite?\n— Eu estava dormindo, mas ouvi os passos.`);
    });

    it('deve converter meia-risca ("– ") e travessão sem espaço ("—Olá") para ("— Olá")', () => {
      const input = `– Não temos tempo a perder!\n—Vamos agora mesmo.`;
      const output = ManuscriptIntegrityEngine.standardizeDialogueTypography(input);
      expect(output).toBe(`— Não temos tempo a perder!\n— Vamos agora mesmo.`);
    });

    it('não deve alterar hífens internos entre palavras compostas', () => {
      const input = `O guarda-chuva azul estava no sofá.\n- Pegue-o depressa!`;
      const output = ManuscriptIntegrityEngine.standardizeDialogueTypography(input);
      expect(output).toContain('guarda-chuva');
      expect(output).toContain('— Pegue-o depressa!');
    });
  });

  describe('5. Execução Unificada e Sanitização Completa do BookProject', () => {
    it('deve executar pipeline unificado em um capítulo com todos os defeitos combinados', () => {
      const dirtyChapter = `- Olá, $\\hat{E}$le disse com voz trêmula.\n- Quem est$\\acute{a}$ a$\\acute{i}$? perguntei.\nEle não parecia nem um...\n\nFim do Capítulo 18.`;
      
      const result = ManuscriptIntegrityEngine.sanitizeChapterContent(dirtyChapter);
      
      // LaTeX limpo
      expect(result.cleanText).toContain('Êle');
      expect(result.cleanText).toContain('está aí?');
      expect(result.cleanText).not.toContain('$\\hat{E}$');
      
      // Diálogos padronizados
      expect(result.cleanText).toContain('— Olá, Êle');
      expect(result.cleanText).toContain('— Quem está');
      
      // Marcador removido
      expect(result.markersRemoved).toContain('Fim do Capítulo 18.');
      expect(result.cleanText).not.toContain('Fim do Capítulo 18');
      
      // Truncamento reparado
      expect(result.wasTruncated).toBe(true);
      expect(result.cleanText.endsWith('.')).toBe(true);
      expect(result.cleanText).toContain('Ele não parecia.');
    });

    it('deve sanitizar 100% dos capítulos e metadados de um BookProject antes de exportar', () => {
      const mockProject: BookProject = {
        id: 'proj-123',
        title: 'O Mist$\\acute{e}$rio de $\\hat{E}$vora',
        author: 'Autor Teste',
        kdpChapters: [
          {
            index: 1,
            title: 'Capítulo 1: O In$\\acute{i}$cio',
            prose: '- Venha cá, disse $\\hat{E}$le.\nEle não sabia de nada...\n\nTermina o Capítulo 1.',
          }
        ]
      } as any;

      const sanitized = ManuscriptIntegrityEngine.sanitizeBookProject(mockProject);
      
      expect(sanitized.title).toBe('O Mistério de Êvora');
      expect(sanitized.kdpChapters![0].title).toBe('Capítulo 1: O Início');
      expect(sanitized.kdpChapters![0].prose).toContain('— Venha cá, disse Êle.');
      expect(sanitized.kdpChapters![0].prose).not.toContain('Termina o Capítulo 1');
      expect(sanitized.kdpChapters![0].prose.endsWith('.')).toBe(true);
    });

    it('deve garantir que EpubBuilder processe o livro sanitizado sem resíduos', async () => {
      const mockProject: BookProject = {
        id: 'proj-epub',
        title: 'Livro $\\hat{E}$pico',
        author: 'Leandro Palmeira',
        kdpChapters: [
          {
            index: 1,
            title: 'Capítulo 1',
            prose: '- Fala com $\\hat{A}$nimo!\nEle não parecia nem um...\n\nFim do Capítulo 1.',
          }
        ]
      } as any;

      const epubBlob = await EpubBuilder.buildEpub(mockProject);
      expect(epubBlob).toBeDefined();
      expect(epubBlob.size).toBeGreaterThan(100);
    });

    it('deve garantir que PdfBuilder processe o miolo sanitizado sem resíduos', async () => {
      const mockProject: BookProject = {
        id: 'proj-pdf',
        title: 'Livro $\\hat{E}$pico',
        author: 'Leandro Palmeira',
        trimSize: '6x9',
        paperType: 'bw-white',
        kdpChapters: [
          {
            index: 1,
            title: 'Capítulo 1',
            prose: ('- Fala com $\\hat{A}$nimo! Ele olhou ao redor e viu o sol nascer no horizonte.\n\nFim do Capítulo 1.\n').repeat(15),
          }
        ]
      } as any;

      const pdfBlob = await PdfBuilder.buildInteriorPdf(mockProject);
      expect(pdfBlob).toBeDefined();
      expect(pdfBlob.size).toBeGreaterThan(500);
    });
  });
});
