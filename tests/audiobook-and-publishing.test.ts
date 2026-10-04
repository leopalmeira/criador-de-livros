import { describe, it, expect } from 'vitest';
import {
  DISTRIBUTION_PLATFORMS,
  auditAudiobook,
  generateNotebookLmPackage,
  calculateAudiobookRoyaltySimulation,
  buildPublicationPackageZip
} from '../src/services/audiobook-service';
import { AudiobookConfig, AudiobookChapterItem } from '../src/types/publishing-audiobook';

describe('Audiobook Studio & Publicação Multiplataforma', () => {
  const dummyConfig: AudiobookConfig = {
    title: 'O Silêncio que Restou das Cinzas',
    subtitle: 'Um detetive obstinado desenterra segredos mortais em uma cidade esquecida',
    author: 'Leandro Palmeira',
    narrator: 'Leandro Palmeira (Voz IA Natural)',
    language: 'Português — Brasil',
    type: 'ai-narrated',
    method: 'ai-tts',
    pitch: 1.0,
    rate: 1.0,
    volume: 1.0
  };

  const dummyChapters: AudiobookChapterItem[] = [
    {
      id: 'cap_01',
      chapterIndex: 0,
      title: '01 — As Primeiras Sombras',
      fullText: 'O vento uivava através das janelas quebradas do antigo galpão de madeira.',
      textSnippet: 'O vento uivava...',
      wordCount: 12,
      audioBlobUrl: 'blob:fake-url-1',
      durationSeconds: 120,
      status: 'pronto'
    },
    {
      id: 'cap_02',
      chapterIndex: 1,
      title: '02 — Pistas Ocultas',
      fullText: 'O detetive encontrou uma carta selada com lacre escarlate sobre a mesa empoeirada.',
      textSnippet: 'O detetive encontrou...',
      wordCount: 13,
      audioBlobUrl: 'blob:fake-url-2',
      durationSeconds: 180,
      status: 'pronto'
    }
  ];

  it('1. Deve listar plataformas reais de distribuição sem inventar APIs falsas', () => {
    expect(DISTRIBUTION_PLATFORMS.spotify.name).toBe('Spotify for Authors');
    expect(DISTRIBUTION_PLATFORMS.audible.name).toContain('Amazon / Audible');
    expect(DISTRIBUTION_PLATFORMS.apple.name).toContain('Apple Books');
    expect(DISTRIBUTION_PLATFORMS.google.name).toContain('Google Play Books');
    expect(DISTRIBUTION_PLATFORMS.kobo.name).toContain('Kobo Writing Life');

    // Nenhuma plataforma deve prometer publicação falsa automatizada
    Object.values(DISTRIBUTION_PLATFORMS).forEach(p => {
      expect(p.officialUploadUrl).toMatch(/^https?:\/\//);
      expect(p.audioFormatRequirements).toContain('MP3');
      expect(p.isOfficialIntegrationAvailable).toBe(false);
      expect(p.instructions.length).toBeGreaterThan(0);
    });
  });

  it('2. Deve auditar tecnicamente o audiobook e aprovar quando completo', () => {
    const report = auditAudiobook(dummyConfig, dummyChapters, 'data:image/png;base64,sample');
    expect(report.isReady).toBe(true);
    expect(report.readyChapters).toBe(2);
    expect(report.totalChapters).toBe(2);
    expect(report.totalDurationSeconds).toBe(300);
    expect(report.issues.filter(i => i.level === 'critico')).toHaveLength(0);
  });

  it('3. Deve reprovar a auditoria com erros claros quando capítulos não possuem áudio ou capa ausente', () => {
    const chaptersWithoutAudio: AudiobookChapterItem[] = [
      {
        id: 'cap_01',
        chapterIndex: 0,
        title: '01 — Introdução',
        fullText: 'Texto de teste',
        textSnippet: 'Texto de teste',
        wordCount: 3,
        durationSeconds: 0,
        status: 'pendente'
      }
    ];

    const report = auditAudiobook(dummyConfig, chaptersWithoutAudio, null);
    expect(report.isReady).toBe(false);
    expect(report.issues.some(i => i.level === 'critico' && i.message.includes('áudio'))).toBe(true);
    expect(report.issues.some(i => i.level === 'critico' && i.message.includes('Capa'))).toBe(true);
  });

  it('4. Deve gerar pacote completo de preparação para NotebookLM sem fingir API inexistente', () => {
    const pkg = generateNotebookLmPackage(dummyConfig, dummyChapters);
    expect(pkg.instructionsContent).toContain('NOTEBOOKLM');
    expect(pkg.instructionsContent).toContain('https://notebooklm.google.com');
    expect(pkg.instructionsContent).toContain('O Silêncio que Restou das Cinzas');
    expect(pkg.markdownContent).toContain('CAPÍTULO 01');
    expect(pkg.markdownContent).toContain('AS PRIMEIRAS SOMBRAS');
    expect(pkg.markdownContent).toContain('PISTAS OCULTAS');
  });

  it('5. Deve simular royalties com cenários conservador, intermediário e otimista, rotulando explicitamente como ESTIMATIVA', () => {
    const sim = calculateAudiobookRoyaltySimulation('spotify', 180, 2000, 1);
    expect(sim.platform).toBe('spotify');
    expect(sim.disclaimer).toContain('ESTIMATIVA');
    expect(sim.conservative.estimatedEarningsBrl).toBeGreaterThan(0);
    expect(sim.moderate.estimatedEarningsBrl).toBeGreaterThan(sim.conservative.estimatedEarningsBrl);
    expect(sim.optimistic.estimatedEarningsBrl).toBeGreaterThan(sim.moderate.estimatedEarningsBrl);
    expect(sim.disclaimer).toContain('não representam garantia');
  });

  it('6. Deve compilar pacote zip de publicação com todas as pastas estruturadas', async () => {
    const zipBlob = await buildPublicationPackageZip(
      dummyConfig,
      dummyChapters,
      ['spotify', 'audible', 'apple'],
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    );

    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.size).toBeGreaterThan(100);
  });
});
