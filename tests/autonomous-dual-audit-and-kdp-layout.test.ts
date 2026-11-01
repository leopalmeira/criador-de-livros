import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import {
  stripChapterNumbering,
  isIncompleteTitle,
  repairIncompleteTitle,
  shortenTitleSafely,
  normalizeChapterHeading,
  buildStructuredToc,
  validateChapterStructure,
} from '../src/services/chapter-structure';
import {
  BookSequentialWritingEngine,
} from '../src/services/book-sequential-writing-engine';
import {
  WriteLockManager,
  KdpFormatSelector,
  EditorialAuditorAgent,
  IndependentEditorialVerifier,
  EpubValidator,
  LayoutQaAgent,
  runAutonomousEditorialCycle,
} from '../src/services/autonomous-editorial-pipeline';
import { cleanChapterTitle } from '../src/services/kdp-editorial-review';

describe('BOOKENGIN — Correção Universal, Auditoria Autônoma Dupla e Diagramação KDP (17 Testes Obrigatórios)', () => {
  // 1. Numeração única de capítulos
  it('1. Deve garantir numeração única de capítulos e eliminar numeração duplicada ("Capítulo 1: Capítulo 1")', () => {
    const raw1 = 'Capítulo 1: Capítulo 1 - O Despertar na Floresta';
    const stripped1 = stripChapterNumbering(raw1);
    expect(stripped1).toBe('O Despertar na Floresta');

    const normEn = normalizeChapterHeading('Chapter 2 - Chapter II: The Silent Witness', 2, 'English');
    expect(normEn.cleanTitle).toBe('The Silent Witness');
    expect(normEn.fullHeading).toBe('Chapter 2: The Silent Witness');

    const issues = validateChapterStructure([
      { titulo: 'Capítulo 1: Capítulo 1: O Início' },
    ]);
    expect(issues.some(i => i.type === 'numeracao_embutida')).toBe(true);
  });

  // 2. Títulos completos (sem conectivos pendentes no final)
  it('2. Deve impedir e reparar títulos de capítulos incompletos ou terminados em conectivos/preposições', () => {
    expect(isIncompleteTitle('A História Secreta dos Reis de')).toBe(true);
    expect(isIncompleteTitle('The Secret History of the')).toBe(true);
    expect(isIncompleteTitle('O Mistério que')).toBe(true);
    expect(isIncompleteTitle('A Verdade Completa')).toBe(false);

    const repaired = repairIncompleteTitle('O Segredo Escondido de');
    expect(repaired).toBe('O Segredo Escondido');
    expect(isIncompleteTitle(repaired)).toBe(false);

    // Verifica que cleanChapterTitle jamais corta em preposição mesmo em títulos longos
    const longTitle = 'A Grande Jornada Histórica Pelos Caminhos Secretos de Uma Antiga Civilização Esquecida';
    const cleaned = cleanChapterTitle(longTitle);
    expect(isIncompleteTitle(cleaned)).toBe(false);
  });

  // 3. Sumário correto e sincronizado com os capítulos
  it('3. Deve gerar um sumário estruturado fiel aos títulos limpos e à paginação real', () => {
    const chapters = [
      { titulo: 'Capítulo 1: Capítulo 1 - A Carta Misteriosa de', texto: 'A carta chegou de Coimbra pela manhã.' },
      { titulo: 'Capítulo 2: O Encontro na Estação', texto: 'Eles se encontraram na estação central.' },
      { titulo: 'Capítulo 3: A Revelação Final', texto: 'Toda a verdade veio à tona.' },
    ];
    const toc = buildStructuredToc(chapters, 'Português', [3, 9, 15]);
    expect(toc).toHaveLength(3);
    expect(toc[0].chapterNumber).toBe(1);
    expect(toc[0].pageNumber).toBe(3);
    expect(isIncompleteTitle(toc[0].cleanTitle)).toBe(false);
    expect(toc[0].cleanTitle).not.toMatch(/Cap[ií]tulo\s*1/i);
    expect(toc[1].fullHeading).toBe('Capítulo 2: O Encontro na Estação');
  });

  // 4. Preservação de personagens
  it('4. Deve preservar nomes e sobrenomes canônicos de personagens e corrigir mutações involuntárias', () => {
    const memory = BookSequentialWritingEngine.initGlobalMemory({
      bookId: 'test_char_pres',
      title: 'A Sombra do Tribunal',
      author: 'Autor Teste',
      genre: 'Suspense',
      plannedChapters: 3,
      centralPremise: 'Um promotor investiga um caso antigo.',
      existingCharacters: [
        {
          id: 'c1',
          name: 'Gabriel',
          fullName: 'Gabriel Vasconcelos',
          aliases: ['Dr. Vasconcelos'],
          physicalAppearance: 'Alto, cabelos grisalhos',
          personality: 'Determinado',
          profession: 'Promotor',
          background: '20 anos de carreira',
          familyRelations: 'Irmão de Clara',
          relationships: {},
          goals: ['Descobrir a verdade'],
          fears: ['Falhar'],
          motivations: ['Justiça'],
          secrets: [],
          knownInfo: [],
          unknownInfo: [],
          currentLocation: 'Fórum Central',
          physicalState: 'Saudável',
          emotionalState: 'Focado',
          narrativeStatus: 'active',
          lastAppearedChapter: 1,
          associatedChapters: [1],
        },
      ],
    });

    const audit = BookSequentialWritingEngine.validateChapterContinuity({
      chapterText: 'Gabriel Mendonça entrou na sala de audiências e abriu a pasta confidencial.',
      chapterTitle: 'A Audiência',
      chapterNumber: 2,
      totalChapters: 3,
      memory,
      lastChapterState: null,
    });

    expect(audit.issues.some(i => i.category === 'name_mutation')).toBe(true);
    const fixed = BookSequentialWritingEngine.autoFixContinuityIssues(
      'Gabriel Mendonça entrou na sala de audiências e abriu a pasta confidencial.',
      audit.issues
    );
    expect(fixed.fixedText).toContain('Gabriel Vasconcelos');
  });

  // 5. Resolução de eventos, personagens secundários e objetos pendentes
  it('5. Deve rastrear eventos, personagens secundários, objetos e conflitos pendentes até sua resolução', () => {
    const memory = BookSequentialWritingEngine.initGlobalMemory({
      bookId: 'test_pending_elems',
      title: 'O Relógio de Prata',
      author: 'Autor Teste',
      genre: 'Mistério',
      plannedChapters: 3,
      centralPremise: 'Um relógio antigo guarda a combinação de um cofre.',
    });

    const obj = BookSequentialWritingEngine.registerTrackedElement(memory, {
      type: 'object',
      name: 'Relógio de Prata',
      description: 'Relógio com inscrição secreta entregue no capítulo 1',
      introducedInChapter: 1,
    });
    const secChar = BookSequentialWritingEngine.registerTrackedElement(memory, {
      type: 'secondary_character',
      name: 'Inspetor Viana',
      description: 'Policial aposentado que prometeu entregar o laudo',
      introducedInChapter: 1,
    });

    expect(BookSequentialWritingEngine.getPendingElements(memory)).toHaveLength(2);

    // No capítulo final (3), mencionamos o Relógio de Prata, mas esquecemos o Inspetor Viana
    const finalAudit = BookSequentialWritingEngine.validateChapterContinuity({
      chapterText: 'Ao abrir o Relógio de Prata, Marina encontrou a chave dourada e revelou o segredo.',
      chapterTitle: 'O Cofre Aberto',
      chapterNumber: 3,
      totalChapters: 3,
      memory,
      lastChapterState: null,
    });

    // O Relógio de Prata deve ter sido automaticamente marcado como resolvido no cap 3
    expect(memory.trackedElements?.find(e => e.id === obj.id)?.status).toBe('resolved');
    // O Inspetor Viana permaneceu pendente e gerou aviso de elemento não resolvido
    expect(memory.trackedElements?.find(e => e.id === secChar.id)?.status).toBe('pending');
    expect(finalAudit.issues.some(i => i.category === 'unresolved_element')).toBe(true);
  });

  // 6. Continuidade entre capítulos e proibição de "no capítulo anterior"
  it('6. Deve detectar e remover referências artificiais como "no capítulo anterior" / "in the previous chapter" em ficção', () => {
    const memory = BookSequentialWritingEngine.initGlobalMemory({
      bookId: 'test_meta_ref',
      title: 'Noite em Viena',
      author: 'Autor Teste',
      genre: 'Romance Policial',
      plannedChapters: 3,
      centralPremise: 'Investigação em Viena.',
    });

    const textWithMeta =
      'Como vimos no capítulo anterior, Lucas caminhava pelas ruas úmidas de Viena buscando respostas.';
    const audit = BookSequentialWritingEngine.validateChapterContinuity({
      chapterText: textWithMeta,
      chapterTitle: 'Passos na Neblina',
      chapterNumber: 2,
      totalChapters: 3,
      memory,
      lastChapterState: null,
    });

    expect(audit.issues.some(i => i.category === 'meta_reference')).toBe(true);
    const fixed = BookSequentialWritingEngine.autoFixContinuityIssues(textWithMeta, audit.issues);
    expect(fixed.fixedText.toLowerCase()).not.toContain('no capítulo anterior');
    expect(fixed.fixedText).toMatch(/^Lucas caminhava/);
  });

  // 7. Correções realmente salvas e reabertas do banco
  it('7. Deve salvar as correções do Agente 1 no banco de dados e confirmar a persistência reabrindo o registro salvo', async () => {
    const bookId = `test_db_persist_${Date.now()}`;
    const rawChapters = [
      {
        titulo: 'Capítulo 1: Capítulo 1 - O Começo de',
        texto:
          'No capítulo anterior, Helena caminhou até a janela do casarão antigo.\n- Eu preciso saber a verdade\nEla olhou para o jardim silencioso com determinação.',
      },
    ];

    const { report, correctedChapters } = await EditorialAuditorAgent.runAuditAndPersist({
      bookId,
      cycle: 1,
      title: 'O Casarão da Colina',
      author: 'Helena Prado',
      genre: 'Suspense',
      language: 'Português',
      chapters: rawChapters,
    });

    expect(report.persistedVerifiedFromStorage).toBe(true);
    expect(correctedChapters[0].titulo).not.toMatch(/Cap[ií]tulo\s*1/i);
    expect(isIncompleteTitle(correctedChapters[0].titulo)).toBe(false);
    expect(correctedChapters[0].texto.toLowerCase()).not.toContain('no capítulo anterior');
    expect(correctedChapters[0].texto).toContain('— Eu preciso saber a verdade.');

    const fromStorage = await WriteLockManager.readPersistedManuscript(bookId);
    expect(fromStorage).not.toBeNull();
    expect(fromStorage!.chapters[0].texto).toBe(correctedChapters[0].texto);
  });

  // 8. Independência entre EDITORIAL_AUDITOR_AGENT e INDEPENDENT_EDITORIAL_VERIFIER
  it('8. Deve executar o INDEPENDENT_EDITORIAL_VERIFIER abrindo a versão persistida e aplicando regras independentes', async () => {
    const bookId = `test_dual_agents_${Date.now()}`;
    const originalChapters = [
      {
        titulo: 'Capítulo 1: A Promessa de',
        texto:
          'Como vimos no capítulo anterior, Rafael segurava o mapa antigo nas mãos enquanto observava o porto de Lisboa em silêncio absoluto.',
      },
      {
        titulo: 'Capítulo 2: Capítulo 2: O Navio do Norte',
        texto:
          'O vento frio soprava sobre o cais quando o navio finalmente atracou trazendo as caixas seladas.',
      },
    ];

    const agent1 = await EditorialAuditorAgent.runAuditAndPersist({
      bookId,
      cycle: 1,
      title: 'As Cartas do Atlântico',
      author: 'Marco Silva',
      genre: 'Ficção Histórica',
      language: 'Português',
      chapters: originalChapters,
    });

    const agent2 = await IndependentEditorialVerifier.verifyPersistedManuscript({
      bookId,
      cycle: 1,
      originalChapters,
    });

    expect(agent2.report.agentName).toBe('INDEPENDENT_EDITORIAL_VERIFIER');
    expect(agent2.report.loadedDirectlyFromStorage).toBe(true);
    expect(agent2.report.verifiedVersionId).toBe(agent1.report.persistedVersionId);
    expect(agent2.report.persistedVersionId).not.toBe(agent1.report.persistedVersionId);
    expect(agent2.report.independentRulesExecuted.length).toBeGreaterThanOrEqual(7);
    expect(agent2.report.approvedByVerifier).toBe(true);
  });

  // 9. Ausência de conflito de escrita concorrente
  it('9. Deve impedir escrita concorrente no mesmo manuscrito quando um agente detém o bloqueio', () => {
    const bookId = `test_lock_${Date.now()}`;
    const lock = WriteLockManager.acquireLock(bookId, 'EDITORIAL_AUDITOR_AGENT');
    expect(lock.acquired).toBe(true);
    expect(WriteLockManager.isLocked(bookId)).toBe(true);

    // Tentativa de aquisição pelo Agente 2 enquanto o Agente 1 ainda está escrevendo deve lançar erro de bloqueio
    expect(() =>
      WriteLockManager.acquireLock(bookId, 'INDEPENDENT_EDITORIAL_VERIFIER')
    ).toThrow(/Conflito de escrita concorrente bloqueado/);

    WriteLockManager.releaseLock(bookId, 'EDITORIAL_AUDITOR_AGENT');
    expect(WriteLockManager.isLocked(bookId)).toBe(false);

    // Agora o Agente 2 pode adquirir com segurança
    const lock2 = WriteLockManager.acquireLock(bookId, 'INDEPENDENT_EDITORIAL_VERIFIER');
    expect(lock2.acquired).toBe(true);
    WriteLockManager.releaseLock(bookId, 'INDEPENDENT_EDITORIAL_VERIFIER');
  });

  // 10 & 11. Seleção adequada de formato KDP e margens corretas
  it('10 & 11. Deve selecionar o formato KDP correto conforme gênero/extensão/ilustrações e calcular margens/gutter dinâmicos', () => {
    // Novela compacta de ficção -> 5x8
    const compactFiction = KdpFormatSelector.selectOptimalFormat({
      genre: 'Romance Literário',
      wordCount: 22000,
      chapterCount: 10,
      hasIllustrations: false,
    });
    expect(compactFiction.recommendedFormat).toBe('5x8');
    expect(compactFiction.margins.innerGutter).toBeGreaterThanOrEqual(0.625);

    // Ficção de médio porte -> 5.5x8.5
    const midFiction = KdpFormatSelector.selectOptimalFormat({
      genre: 'Suspense Policial',
      wordCount: 44000,
      chapterCount: 18,
      hasIllustrations: false,
    });
    expect(midFiction.recommendedFormat).toBe('5.5x8.5');

    // Infantil ilustrado quadrado -> 8.5x8.5
    const kidsPicture = KdpFormatSelector.selectOptimalFormat({
      genre: 'Infantil Ilustrado',
      wordCount: 2500,
      chapterCount: 12,
      hasIllustrations: true,
      bookType: 'children-picture-book',
    });
    expect(kidsPicture.recommendedFormat).toBe('8.5x8.5');
    expect(kidsPicture.hasBleed).toBe(true);

    // Infantil em capítulos (foco em texto, sem álbum quadrado) -> 5.5x8.5 (não força 8.5x8.5!)
    const kidsText = KdpFormatSelector.selectOptimalFormat({
      genre: 'Infantojuvenil',
      wordCount: 18000,
      chapterCount: 10,
      hasIllustrations: false,
    });
    expect(kidsText.recommendedFormat).toBe('5.5x8.5');

    // Apostila / Livro Técnico -> 8.5x11
    const technicalBook = KdpFormatSelector.selectOptimalFormat({
      genre: 'Manual Técnico e Workbook de Engenharia',
      wordCount: 35000,
      chapterCount: 12,
      hasIllustrations: false,
    });
    expect(technicalBook.recommendedFormat).toBe('8.5x11');
  });

  // 12, 13, 14, 15, 16 & 17. Ciclo completo: PDF, EPUB, cabeçalhos sem cortes, preservação das palavras e aprovação interna
  it('12-17. Deve executar o ciclo autônomo completo (Agente 1 + Agente 2 + Diagramação + Validação PDF e EPUB) preservando 100% do manuscrito', async () => {
    const bookId = `test_full_autonomous_${Date.now()}`;
    const sampleChapters = [
      {
        titulo: 'Capítulo 1: Capítulo 1 - A Descoberta nos Arquivos de',
        texto:
          'O historiador Eduardo Vasconcelos abriu o cofre subterrâneo da Biblioteca Nacional em Lisboa. As cartas imperiais repousavam intocadas sob o selo real.\n\n— Este documento muda tudo o que sabíamos sobre o tratado — afirmou Eduardo, examinando a assinatura com uma lupa de bronze.',
      },
      {
        titulo: 'Capítulo 2: A Viagem Noturna para Coimbra',
        texto:
          'No capítulo anterior, Eduardo guardou os pergaminhos na maleta de couro e partiu no comboio noturno rumo a Coimbra. A chuva batia nas janelas do vagão enquanto ele revisava cada anotação histórica.\n\nAo desembarcar na estação histórica de Coimbra, encontrou a professora Clara Monteiro aguardando sob as luzes amareladas da plataforma.',
      },
      {
        titulo: 'Capítulo 3: O Veredito da História',
        texto:
          'Reunidos no salão nobre da universidade, Eduardo Vasconcelos e Clara Monteiro apresentaram as provas definitivas perante o conselho acadêmico. O mistério secular estava finalmente solucionado com rigor documental.',
      },
    ];

    const cycleResult = await runAutonomousEditorialCycle({
      bookId,
      title: 'Os Arquivos Secretos do Reino',
      subtitle: 'Uma Investigação Histórica',
      author: 'Dr. Eduardo Prado',
      genre: 'Suspense Histórico',
      language: 'Português',
      chapters: sampleChapters,
      maxCycles: 3,
    });

    // 12 & 13: Paginação consistente e cabeçalhos sem cortes ou conectivos finais
    expect(cycleResult.pdfResult.pageCount).toBeGreaterThan(3);
    expect(cycleResult.layoutQaReport.headersCutOrTruncated).toBe(false);
    for (const meta of cycleResult.pdfResult.pageMeta) {
      if (meta.header) {
        expect(meta.header.endsWith('…')).toBe(false);
        expect(isIncompleteTitle(meta.header)).toBe(false);
      }
    }

    // 14 & 15: Preservação integral das palavras durante a diagramação e correspondência do PDF exportado
    expect(cycleResult.layoutQaReport.manuscriptWordsPreserved).toBe(true);
    expect(cycleResult.layoutQaReport.pdfValidation.ok).toBe(true);
    expect(cycleResult.pdfResult.chapterStartPages).toHaveLength(3);

    // 16: Integridade estrutural e sumário navegável do EPUB
    expect(cycleResult.layoutQaReport.epubValidation.ok).toBe(true);
    expect(cycleResult.layoutQaReport.epubValidation.mimetypeValid).toBe(true);
    expect(cycleResult.layoutQaReport.epubValidation.containerXmlValid).toBe(true);
    expect(cycleResult.layoutQaReport.epubValidation.opfValid).toBe(true);
    expect(cycleResult.layoutQaReport.epubValidation.navValid).toBe(true);
    expect(cycleResult.layoutQaReport.epubValidation.spineChapterCount).toBe(3);

    // 17: Critérios completos para APROVADA NA AUDITORIA INTERNA e histórico de versões
    expect(cycleResult.finalStatus).toBe('APROVADA NA AUDITORIA INTERNA');
    expect(Object.values(cycleResult.approvalChecklist).every(Boolean)).toBe(true);
    expect(cycleResult.versionHistory.length).toBeGreaterThanOrEqual(3); // ORIGINAL + AGENT 1 + AGENT 2
    expect(cycleResult.stageHistory.length).toBeGreaterThanOrEqual(8);
  });
});
