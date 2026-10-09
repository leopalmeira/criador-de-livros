import { describe, it, expect } from 'vitest';
import { CinematicNovelService } from '../src/services/cinematic-novel-service';
import { BOOK_TYPE_CONFIGS } from '../src/types/book-project';

describe('Módulo Romance Cinematográfico Realista — Testes Unitários de Ponta a Ponta', () => {
  it('1. Deve registrar o tipo "cinematic_illustrated_novel" com regras de fotografia realista e textos integrados', () => {
    const config = BOOK_TYPE_CONFIGS['cinematic_illustrated_novel'];
    expect(config).toBeDefined();
    expect(config.id).toBe('cinematic_illustrated_novel');
    expect(config.label).toBe('Romance Cinematográfico Realista');
    expect(config.category).toBe('Ficção');
    expect(config.fullBleed).toBe(true);
    expect(config.paperType).toBe('color');
    expect(config.hasCharacters).toBe(true);
    expect(config.hasArtBible).toBe(true);
    expect(config.editorialRules.some(r => r.includes('sem caixas brancas'))).toBe(true);
  });

  it('2. Deve inicializar o projeto com 17 etapas no Checklist Oficial de Produção', () => {
    const project = CinematicNovelService.createInitialProject({
      title: 'A Última Mentira Perfeita',
      subtitle: 'Capítulo 1: O Despertar no Quarto Cinza',
      author: 'Leandro Palmeira',
      genre: 'suspense-psicologico',
      subgenre: 'Thriller Psicológico',
      language: 'Português',
      targetAudience: 'Adulto',
      premise: 'Helena acorda às 06:17 com lapsos de memória e encontra um bilhete anônimo sobre a noite da ponte.',
      totalChaptersPlanned: 3,
      approximatePages: 12,
      visualStyle: 'Fotografia Cinematográfica 35mm Realista',
      emotionalTone: 'Tenso e claustrofóbico',
      endingType: 'Plot twist',
      narrativePov: 'Terceira pessoa limitada'
    });

    expect(project.id).toMatch(/^cinematic_/);
    expect(project.title).toBe('A Última Mentira Perfeita');
    expect(project.checklist.length).toBe(17);
    expect(project.checklist[0].title).toBe('Conceito aprovado');
    expect(project.checklist[16].title).toBe('Checklist de publicação concluído');
    expect(project.checklist.every(t => t.isCompleted === false)).toBe(true);
  });

  it('3. Deve construir a Story Bible e a Character Bible com traços físicos rigorosos para consistência', async () => {
    const initial = CinematicNovelService.createInitialProject({
      title: 'A Última Mentira Perfeita',
      author: 'Leandro Palmeira',
      genre: 'suspense-psicologico',
      subgenre: 'Thriller',
      language: 'Português',
      targetAudience: 'Adulto',
      premise: 'Helena encontra um bilhete perturbador.',
      totalChaptersPlanned: 2,
      approximatePages: 8,
      visualStyle: 'Fotografia 35mm',
      emotionalTone: 'Tenso',
      endingType: 'Plot twist',
      narrativePov: 'Terceira pessoa'
    });

    const { storyBible, characters } = await CinematicNovelService.generateScriptAndBibles(initial);

    expect(characters.length).toBeGreaterThanOrEqual(1);
    const protagonista = characters[0];
    expect(protagonista.role).toBe('protagonista');
    expect(protagonista.name).toBeTruthy();
    expect(protagonista.faceShape).toBeTruthy();
    expect(protagonista.eyes).toBeTruthy();
    expect(protagonista.hair).toBeTruthy();
    expect(protagonista.costumes.length).toBeGreaterThan(0);

    expect(storyBible.chapterSummaries.length).toBeGreaterThanOrEqual(1);
    expect(storyBible.importantObjects.length).toBeGreaterThanOrEqual(1);
    expect(storyBible.timelineSequence).toBeTruthy();
  });

  it('4. Page Generation Pipeline: cada página DEVE ter um prompt visual próprio e 22 parâmetros estruturados', async () => {
    const initial = CinematicNovelService.createInitialProject({
      title: 'A Última Mentira Perfeita',
      author: 'Leandro Palmeira',
      genre: 'suspense-psicologico',
      subgenre: 'Thriller',
      language: 'Português',
      targetAudience: 'Adulto',
      premise: 'Helena acorda sem memória.',
      totalChaptersPlanned: 2,
      approximatePages: 8,
      visualStyle: '35mm Film',
      emotionalTone: 'Claustrofóbico',
      endingType: 'Plot twist',
      narrativePov: 'Terceira pessoa'
    });

    const { storyBible, characters } = await CinematicNovelService.generateScriptAndBibles(initial);
    initial.storyBible = storyBible;
    initial.characters = characters;

    const page1 = await CinematicNovelService.planPage(initial, 1, 1);
    const page2 = await CinematicNovelService.planPage(initial, 1, 2);

    // 22 campos do pipeline
    expect(page1.bookId).toBe(initial.id);
    expect(page1.chapterNumber).toBe(1);
    expect(page1.pageNumber).toBe(1);
    expect(page1.sceneSummary).toBeTruthy();
    expect(page1.previousNarrativeContext).toBeTruthy();
    expect(page1.dramaticObjective).toBeTruthy();
    expect(page1.charactersPresent.length).toBeGreaterThan(0);
    expect(page1.mandatoryVisualReferences.length).toBeGreaterThan(0);
    expect(page1.charactersAppearance).toBeTruthy();
    expect(page1.costumeAndProps).toBeTruthy();
    expect(page1.environmentSetting).toBeTruthy();
    expect(page1.timeAndLighting).toBeTruthy();
    expect(page1.actionsAndExpressions).toBeTruthy();
    expect(page1.cameraFraming).toBeTruthy();
    expect(page1.imageComposition).toBeTruthy();
    expect(page1.requiredElements.length).toBeGreaterThan(0);
    expect(page1.persistentElements.length).toBeGreaterThan(0);
    expect(page1.narrationText).toBeTruthy();
    expect(page1.speechAttribution).toBeTruthy();
    expect(page1.textPlacementPlan).toBeTruthy();
    expect(page1.reservedVisualSpace).toBeTruthy();
    expect(page1.validationCriteria.length).toBeGreaterThan(0);

    // Regra central: Cada página PRECISA de um prompt visual específico e diferente da outra!
    expect(page1.visualPrompt).toBeTruthy();
    expect(page2.visualPrompt).toBeTruthy();
    expect(page1.visualPrompt).not.toBe(page2.visualPrompt);
  });

  it('5. Deve compilar o livro completo em PDF Full Bleed sem erros de rasterização', async () => {
    const initial = CinematicNovelService.createInitialProject({
      title: 'A Última Mentira Perfeita',
      author: 'Leandro Palmeira',
      genre: 'suspense-psicologico',
      subgenre: 'Thriller',
      language: 'Português',
      targetAudience: 'Adulto',
      premise: 'Helena acorda sem memória.',
      totalChaptersPlanned: 1,
      approximatePages: 2,
      visualStyle: '35mm Film',
      emotionalTone: 'Tenso',
      endingType: 'Plot twist',
      narrativePov: 'Terceira pessoa'
    });

    const { storyBible, characters } = await CinematicNovelService.generateScriptAndBibles(initial);
    initial.storyBible = storyBible;
    initial.characters = characters;

    const page1 = await CinematicNovelService.planPage(initial, 1, 1);
    initial.pages = [page1];

    const pdfBlob = await CinematicNovelService.exportPdfFullBleed(initial);
    expect(pdfBlob).toBeDefined();
    expect(pdfBlob.size).toBeGreaterThan(100);
    expect(pdfBlob.type).toBe('application/pdf');
  });
});
