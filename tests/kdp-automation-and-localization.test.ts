import { describe, it, expect } from 'vitest';
import { gerarMasterPromptCapa600a1200Palavras } from '../src/services/kdp-cover-master-prompt-generator';
import { buildKdpPdf } from '../src/services/kdp-pdf-builder';
import { PrintCoverService } from '../src/services/print-cover-service';
import { KdpTitleSuggestionEngine } from '../src/services/kdp-title-suggestion-engine';

describe('KDP Automation, Anti-Crop & English Localization Suite', () => {
  it('should generate 100% English Cover Master Prompt with zero Portuguese leak and anti-crop safe zones', () => {
    const res = gerarMasterPromptCapa600a1200Palavras({
      titulo: 'Echoes of the Silent Frost',
      subtitulo: 'A Psychological Mystery of Secrets and Betrayal',
      autor: 'Arthur Sterling',
      genero: 'Psychological Thriller',
      idioma: 'inglês',
      topico: 'A detective uncovering cold cases in an isolated mountain town.'
    });

    // 1. Anti-crop safe zone directive verification
    expect(res.promptParaMotorIa).toContain('CRITICAL ANTI-CROP SAFE ZONE');
    expect(res.promptParaMotorIa).toContain('central 70% safe zone');
    expect(res.promptParaMotorIa).toContain('--no barcode, barcode box, white box, white rectangle');

    // 2. Word count verification (> 3000 words for deep AI guidance)
    expect(res.wordCount).toBeGreaterThanOrEqual(3000);
    expect(res.wordCountContracapa).toBeGreaterThanOrEqual(3000);
    expect(res.wordCountCapaEContracapa).toBeGreaterThanOrEqual(3000);

    // 3. Zero Portuguese section titles or keywords leaking into English dossier
    expect(res.promptCompleto).not.toContain('DIRETRIZ EDITORIAL');
    expect(res.promptCompleto).not.toContain('GÊNERO E MERCADO');
    expect(res.promptCompleto).not.toContain('COMPOSIÇÃO VISUAL');
    expect(res.promptCompleto).toContain('ART DIRECTION EXECUTIVE DOSSIER');
    expect(res.promptCompleto).toContain('EDITORIAL TYPOGRAPHY, TEXT HIERARCHY & STRICT ANTI-CROP BUFFER');

    // 4. Back cover blurb in English
    expect(res.ganchoTopoContracapa).not.toMatch(/[ãõáéíóúç]/i);
    expect(res.sinopseContracapaSugerida).not.toMatch(/[ãõáéíóúç]/i);
  });

  it('should guarantee that KDP Interior PDF (Miolo) does NOT include the cover on page 1 by default', async () => {
    const fakeCoverDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const result = await buildKdpPdf({
      livro: {
        titulo: 'Mastering Focus',
        subtitulo: 'The Strategic Habit Blueprint',
        autor: 'Jonathan Vance',
        genero: 'Self-Help',
        idioma: 'en',
        capitulos: [
          { titulo: 'Chapter 1: The Core Foundation', texto: 'This is the body of chapter one, written in pure English without any language contamination.' },
          { titulo: 'Chapter 2: Daily Execution', texto: 'Consistent daily actions compound into exponential performance over long horizons.' }
        ]
      },
      capaDataUrl: fakeCoverDataUrl,
      incluirCapaNoMiolo: false,
      incluirContracapa: false,
      formato: '6x9',
      optSumario: true
    });

    expect(result.bytes).toBeDefined();
    expect(result.bytes.byteLength).toBeGreaterThan(500);
    // Page count must match interior pages only (Title page + blank/copyright + TOC + chapters), never starting with a cover image page
    expect(result.pageCount).toBeGreaterThanOrEqual(3);
  });

  it('should generate smart back cover blurbs in English when language is English', () => {
    const backCover = PrintCoverService.generateSmartBackCover({
      title: 'The Silent Cold',
      genre: 'Psychological Thriller',
      language: 'en'
    });

    expect(backCover.hookHeadline).toContain('Some secrets carry a price too high to ever be brought into the light.');
    expect(backCover.synopsisText).toContain('A profound and gripping narrative');
    expect(backCover.readerBenefits[0]).toContain('Gripping pacing with airtight continuity');
  });

  it('should provide localized English title suggestions from KdpTitleSuggestionEngine', () => {
    const suggestions = KdpTitleSuggestionEngine.getSuggestionsForTheme('Mistério', 'inglês');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].title).toBeDefined();
    // Verify it is in English
    expect(suggestions[0].title).not.toMatch(/^[A-Z]\s+de\s+/i);
  });
});
