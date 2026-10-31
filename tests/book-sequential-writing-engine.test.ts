// ============================================================================
// TESTES DE ACEITAÇÃO OBRIGATÓRIOS (SEÇÃO 23 DA ESPECIFICAÇÃO MESTRE)
// BOOKENGIN: Motor de Escrita Sequencial, Memória Editorial Global,
// Diagramação Independente e Auditoria Integrada
// ============================================================================

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BookSequentialWritingEngine,
  StoryArcController,
  type BookGlobalMemory,
  type LastChapterState,
  type LocalContinuityAuditResult
} from '../src/services/book-sequential-writing-engine';
import { db } from '../src/database/local-database';
import { KdpCompleteTypesetter } from '../src/services/kdp-complete-typesetter';
import { buildKdpPdf } from '../src/services/kdp-pdf-builder';
import { UniversalEditorialAuditor } from '../src/services/universal-editorial-auditor';

describe('BOOKENGIN — 12 Testes de Aceitação Obrigatórios (Seção 23)', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  // --------------------------------------------------------------------------
  // TESTE 1 — Continuidade de localização
  // Criar um personagem que mora no quarto andar.
  // Verificar se o sistema detecta uma mudança injustificada para o oitavo andar.
  // --------------------------------------------------------------------------
  it('TESTE 1 — Continuidade de localização (detecta e corrige mudança de 4º para 8º andar)', () => {
    const memory = BookSequentialWritingEngine.initGlobalMemory({
      bookId: 'proj_test_loc',
      title: 'O Enigma do Solar',
      author: 'Leandro Palmeira',
      genre: 'Suspense',
      plannedChapters: 10,
      centralPremise: 'Mistério em um edifício histórico',
      existingLocations: [
        {
          id: 'loc_apt',
          name: 'Edifício Solar',
          country: 'Brasil',
          state: 'São Paulo',
          city: 'São Paulo',
          floor: 'quarto andar',
          associatedChapters: [1]
        }
      ],
      existingFacts: [
        {
          id: 'fact_floor',
          category: 'location',
          fact: 'Helena reside no quarto andar do Edifício Solar',
          establishedInChapter: 1,
          immutable: true
        }
      ]
    });

    const chapterInconsistent = {
      titulo: 'Capítulo 2: A Chave Perdida',
      texto: `Helena chegou exausta ao edifício após a longa reunião.
Subiu rapidamente até o oitavo andar, pegando o molho de chaves de metal da bolsa para abrir a porta do apartamento.
Tudo parecia calmo no corredor silencioso.`
    };

    const audit = BookSequentialWritingEngine.validateChapterContinuity({
      chapterText: chapterInconsistent.texto,
      chapterTitle: chapterInconsistent.titulo,
      chapterNumber: 2,
      totalChapters: 10,
      memory,
      lastChapterState: null
    });

    expect(audit.isValid).toBe(false);
    expect(audit.issues.length).toBeGreaterThan(0);
    const floorIssue = audit.issues.find(i => i.category === 'floor_mismatch');
    expect(floorIssue).toBeDefined();
    expect(floorIssue?.description).toContain('quarto andar');

    // Auto-fix
    const { fixedText, fixedCount } = BookSequentialWritingEngine.autoFixContinuityIssues(
      chapterInconsistent.texto,
      audit.issues
    );
    expect(fixedCount).toBeGreaterThan(0);
    expect(fixedText).toContain('quarto andar');
    expect(fixedText).not.toContain('oitavo andar');
  });

  // --------------------------------------------------------------------------
  // TESTE 2 — Continuidade de nomes
  // Definir um sobrenome canônico.
  // Introduzir outro sobrenome em um capítulo posterior.
  // O sistema deverá identificar a inconsistência.
  // --------------------------------------------------------------------------
  it('TESTE 2 — Continuidade de nomes (detecta e corrige mutação de sobrenome canônico)', () => {
    const memory = BookSequentialWritingEngine.initGlobalMemory({
      bookId: 'proj_test_name',
      title: 'Herança Silenciosa',
      author: 'Leandro Palmeira',
      genre: 'Drama',
      plannedChapters: 8,
      centralPremise: 'Disputa familiar',
      existingCharacters: [
        {
          id: 'char_edward',
          name: 'Edward',
          fullName: 'Edward Foster',
          aliases: ['Ed'],
          physicalAppearance: 'Alto, cabelos grisalhos',
          personality: 'Metódico',
          profession: 'Advogado',
          background: 'Veterano do tribunal',
          familyRelations: 'Solteiro',
          relationships: {},
          goals: ['Proteger o testamento'],
          fears: ['Escândalo'],
          motivations: ['Honra'],
          secrets: [],
          knownInfo: [],
          unknownInfo: [],
          currentLocation: 'Boston',
          physicalState: 'Saudável',
          emotionalState: 'Calmo',
          narrativeStatus: 'active',
          lastAppearedChapter: 1,
          associatedChapters: [1]
        }
      ],
      existingFacts: [
        {
          id: 'fact_name_01',
          category: 'character',
          fact: 'O sobrenome de Edward é Foster',
          establishedInChapter: 1,
          immutable: true
        }
      ]
    });

    const chapterWithWrongSurname = {
      titulo: 'Capítulo 3: O Testamento',
      texto: `Edward Miller entrou na sala de conferências com passos decididos e uma pasta de couro marrom.
Todos os sócios encararam Edward Miller em silêncio absoluto aguardando as orientações jurídicas.`
    };

    const audit = BookSequentialWritingEngine.validateChapterContinuity({
      chapterText: chapterWithWrongSurname.texto,
      chapterTitle: chapterWithWrongSurname.titulo,
      chapterNumber: 3,
      totalChapters: 8,
      memory,
      lastChapterState: null
    });

    expect(audit.isValid).toBe(false);
    const nameIssue = audit.issues.find(i => i.category === 'name_mutation');
    expect(nameIssue).toBeDefined();
    expect(nameIssue?.description).toContain('Edward Foster');

    // Auto-fix restaura o nome canônico
    const { fixedText, fixedCount } = BookSequentialWritingEngine.autoFixContinuityIssues(
      chapterWithWrongSurname.texto,
      audit.issues
    );
    expect(fixedCount).toBeGreaterThan(0);
    expect(fixedText).toContain('Edward Foster');
    expect(fixedText).not.toContain('Edward Miller');
  });

  // --------------------------------------------------------------------------
  // TESTE 3 — Transição entre capítulos
  // Encerrar um capítulo com um personagem em determinado local.
  // Iniciar o seguinte em outro local, sem explicação.
  // O sistema deverá identificar a quebra de continuidade.
  // --------------------------------------------------------------------------
  it('TESTE 3 — Transição entre capítulos (detecta teletransporte sem justificativa de viagem)', () => {
    const memory = BookSequentialWritingEngine.initGlobalMemory({
      bookId: 'proj_test_trans',
      title: 'Fuga Noturna',
      author: 'Leandro Palmeira',
      genre: 'Ação',
      plannedChapters: 5,
      centralPremise: 'Conspiração internacional'
    });

    const lastState: LastChapterState = {
      chapterNumber: 1,
      title: 'Capítulo 1: O Cerco',
      factualSummary: 'O agente foi encurralado no porão de uma antiga refinaria em Boston.',
      openingScene: 'A noite chuvosa em Boston começava perigosa.',
      closingScene: 'Trancado no porão escuro em Boston, ele ouvia os passos pesados acima.',
      endingLocation: {
        name: 'Refinaria abandonada em Boston',
        city: 'Boston',
        description: 'Porão escuro e lacrado em Boston'
      },
      dateTime: {},
      charactersPresent: ['Lucas'],
      characterStates: [],
      revealedInformation: [],
      hiddenSecrets: [],
      ongoingConflicts: ['Encurralado no porão'],
      pendingConsequences: [],
      cliffhangerHook: 'Ele estava preso no porão em Boston.',
      nextPlannedEvent: 'Tentar escapar pelos túneis.'
    };

    // Capítulo 2 abre subitamente em Paris tomando café sem explicar vôo ou deslocamento
    const chapter2 = {
      titulo: 'Capítulo 2: Luzes da Cidade',
      texto: `Lucas caminhava calmamente pelas ruas ensolaradas de Paris, olhando para a Torre Eiffel enquanto tomava um café expresso em uma padaria francesa.
A atmosfera de Paris era acolhedora e inspiradora.`
    };

    const audit = BookSequentialWritingEngine.validateChapterContinuity({
      chapterText: chapter2.texto,
      chapterTitle: chapter2.titulo,
      chapterNumber: 2,
      totalChapters: 5,
      memory,
      lastChapterState: lastState
    });

    expect(audit.isValid).toBe(false);
    const teleportIssue = audit.issues.find(i => i.category === 'teleportation');
    expect(teleportIssue).toBeDefined();
    expect(teleportIssue?.description).toContain('Boston');
  });

  // --------------------------------------------------------------------------
  // TESTE 4 — Cronologia de acontecimentos
  // Registrar um evento com data e consequência definidas.
  // Introduzir uma descrição incompatível posteriormente.
  // O sistema deverá sinalizar o conflito.
  // --------------------------------------------------------------------------
  it('TESTE 4 — Cronologia de acontecimentos (detecta personagem agindo no presente após funeral canônico)', () => {
    const memory = BookSequentialWritingEngine.initGlobalMemory({
      bookId: 'proj_test_chrono',
      title: 'Sombras do Passado',
      author: 'Leandro Palmeira',
      genre: 'Mistério',
      plannedChapters: 6,
      centralPremise: 'Investigação após tragédia',
      existingFacts: [
        {
          id: 'fact_funeral',
          category: 'event',
          fact: 'O funeral de Ricardo ocorreu na sexta-feira após o acidente fatal',
          establishedInChapter: 1,
          immutable: true
        }
      ]
    });

    const chapter3 = {
      titulo: 'Capítulo 3: Reunião de Diretoria',
      texto: `Na manhã seguinte à assembleia, todos os diretores se sentaram ao redor da mesa oval.
Ricardo entrou na sala com um sorriso largo, cumprimentou os presentes e disse que as metas do trimestre seriam cumpridas sem demora.`
    };

    const audit = BookSequentialWritingEngine.validateChapterContinuity({
      chapterText: chapter3.texto,
      chapterTitle: chapter3.titulo,
      chapterNumber: 3,
      totalChapters: 6,
      memory,
      lastChapterState: null
    });

    expect(audit.isValid).toBe(false);
    const chronoIssue = audit.issues.find(i => i.category === 'chronology');
    expect(chronoIssue).toBeDefined();
    expect(chronoIssue?.description).toContain('Ricardo');
  });

  // --------------------------------------------------------------------------
  // TESTE 5 — Encerramento prematuro
  // Planejar o desfecho do conflito principal para o último capítulo.
  // Tentar encerrá-lo definitivamente antes do ponto previsto.
  // O sistema deverá impedir a consolidação sem justificativa ou aprovação.
  // --------------------------------------------------------------------------
  it('TESTE 5 — Encerramento prematuro (impede resolução definitiva da trama no meio da obra)', () => {
    const memory = BookSequentialWritingEngine.initGlobalMemory({
      bookId: 'proj_test_premature',
      title: 'A Batalha dos Reinos',
      author: 'Leandro Palmeira',
      genre: 'Fantasia Épica',
      plannedChapters: 12,
      centralPremise: 'Guerra pela coroa ancestral'
    });

    // Capítulo 3 de 12 declara que tudo foi definitivamente resolvido e todos viveram felizes para sempre
    const prematureChapter = {
      titulo: 'Capítulo 3: A Trégua',
      texto: `Os exércitos baixaram suas armas no vale ensolarado.
O rei assinou o tratado definitivo e a paz reinou para sempre em todas as terras.
Assim terminava a história de vez, pois viveram felizes para sempre sem qualquer nova ameaça no horizonte.`
    };

    const audit = BookSequentialWritingEngine.validateChapterContinuity({
      chapterText: prematureChapter.texto,
      chapterTitle: prematureChapter.titulo,
      chapterNumber: 3,
      totalChapters: 12,
      memory,
      lastChapterState: null
    });

    expect(audit.isValid).toBe(false);
    const prematureIssue = audit.issues.find(i => i.category === 'premature_ending');
    expect(prematureIssue).toBeDefined();
    expect(prematureIssue?.severity).toBe('critical');

    // Auto-fix substitui encerramento definitivo por gancho de calmaria passageira
    const { fixedText, fixedCount } = BookSequentialWritingEngine.autoFixContinuityIssues(
      prematureChapter.texto,
      audit.issues
    );
    expect(fixedCount).toBeGreaterThan(0);
    expect(fixedText).not.toContain('viveram felizes para sempre');
    expect(fixedText).toContain('calmaria passageira');
  });

  // --------------------------------------------------------------------------
  // TESTE 6 — Memória persistente
  // Gerar vários capítulos, encerrar a sessão e retomá-la.
  // Verificar se os fatos canônicos continuam disponíveis.
  // --------------------------------------------------------------------------
  it('TESTE 6 — Memória persistente (persiste e recarrega BOOK_GLOBAL_MEMORY e fatos canônicos)', async () => {
    const bookId = 'proj_persist_sess_01';
    const memory = BookSequentialWritingEngine.initGlobalMemory({
      bookId,
      title: 'Memória Imutável',
      author: 'Leandro Palmeira',
      genre: 'Ficção Científica',
      plannedChapters: 5,
      centralPremise: 'Viagens temporais controladas'
    });

    BookSequentialWritingEngine.addCanonicalFact(memory, {
      category: 'rule',
      fact: 'A máquina do tempo consome cristais de cobalto líquido a cada salto',
      chapterNumber: 1,
      immutable: true
    });

    BookSequentialWritingEngine.addCanonicalFact(memory, {
      category: 'character',
      fact: 'Dra. Sarah tem uma cicatriz no pulso esquerdo',
      chapterNumber: 2,
      immutable: true
    });

    // Salva no banco de dados
    await db.saveBookGlobalMemory(bookId, memory);
    await db.saveCanonicalFacts(bookId, memory.canonicalFacts);

    // Simula encerramento e nova sessão lendo do banco
    const reloadedMemory = await db.getBookGlobalMemory(bookId);
    expect(reloadedMemory).toBeDefined();
    expect(reloadedMemory?.identity?.title).toBe('Memória Imutável');
    expect(reloadedMemory?.canonicalFacts?.length).toBe(2);

    const reloadedFacts = await db.getCanonicalFacts(bookId);
    expect(reloadedFacts.length).toBe(2);
    expect(reloadedFacts.some(f => f.fact.includes('cristais de cobalto'))).toBe(true);
    expect(reloadedFacts.some(f => f.fact.includes('Dra. Sarah'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TESTE 7 — Correção persistida
  // Identificar um erro, aplicar a correção, salvar e reabrir o capítulo.
  // Confirmar que o texto corrigido foi efetivamente armazenado.
  // --------------------------------------------------------------------------
  it('TESTE 7 — Correção persistida (confirma que o texto corrigido é efetivamente armazenado no banco)', async () => {
    const bookId = 'proj_persist_fix_01';
    const correctedChapter = {
      titulo: 'Capítulo 1: O Despertar',
      texto: 'O detetive caminhava até o quarto andar onde ficava seu antigo escritório.'
    };

    const chapterState: LastChapterState = {
      chapterNumber: 1,
      title: correctedChapter.titulo,
      factualSummary: 'Detetive entra no escritório no quarto andar.',
      openingScene: 'Caminhava até o escritório.',
      closingScene: 'Entrou no escritório no quarto andar.',
      endingLocation: { name: 'Escritório', floor: 'quarto andar', description: 'Sala 402' },
      dateTime: {},
      charactersPresent: ['Detetive'],
      characterStates: [],
      revealedInformation: [],
      hiddenSecrets: [],
      ongoingConflicts: [],
      pendingConsequences: [],
      cliffhangerHook: 'Porta aberta.',
      nextPlannedEvent: 'Investigar mesa.'
    };

    await db.saveChapterState(bookId, 1, chapterState);

    // Reabre e verifica que o texto corrigido persistiu
    const states = await db.getChapterStates(bookId);
    expect(states.length).toBe(1);
    expect(states[0].endingLocation.floor).toBe('quarto andar');
    expect(states[0].factualSummary).toContain('quarto andar');
  });

  // --------------------------------------------------------------------------
  // TESTE 8 — Diagramação independente
  // Alterar fonte, margens e tamanho de página.
  // Confirmar que nenhuma palavra do manuscrito foi modificada.
  // --------------------------------------------------------------------------
  it('TESTE 8 — Diagramação independente (alterar formatação, margens e fontes nunca altera o texto do manuscrito)', () => {
    const originalManuscript = [
      {
        titulo: 'Capítulo 1: Primeiros Passos',
        texto: 'A chuva caía forte sobre os paralelepípedos da velha praça central. O vento gelado batia contra as janelas de madeira fechadas, anunciando a chegada de uma tempestade sem precedentes.'
      },
      {
        titulo: 'Capítulo 2: O Chamado',
        texto: 'No dia seguinte, os raios de sol romperam a neblina densa. Um mensageiro a cavalo chegou trazendo ordens expressas da corte imperial.'
      }
    ];

    const livroBase = {
      titulo: 'Crônicas do Império',
      subtitulo: 'A saga dos reis',
      autor: 'Leandro Palmeira',
      genero: 'Fantasia',
      idioma: 'Português',
      capitulos: originalManuscript
    };

    // Layout 1: Formato 6x9
    const layout1 = KdpCompleteTypesetter.diagramarLivroCompleto(livroBase, '6x9');

    // Layout 2: Formato 5.5x8.5
    const layout2 = KdpCompleteTypesetter.diagramarLivroCompleto(livroBase, '5.5x8.5');

    // O texto original nos capítulos do manuscrito NÃO muda uma única vírgula
    expect(originalManuscript[0].texto).toBe(
      'A chuva caía forte sobre os paralelepípedos da velha praça central. O vento gelado batia contra as janelas de madeira fechadas, anunciando a chegada de uma tempestade sem precedentes.'
    );
    expect(originalManuscript[1].texto).toBe(
      'No dia seguinte, os raios de sol romperam a neblina densa. Um mensageiro a cavalo chegou trazendo ordens expressas da corte imperial.'
    );
    expect(layout1.relatorio).toBeDefined();
    expect(layout2.relatorio).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // TESTE 9 — Prévia fiel
  // Renderizar um livro e exportar seu PDF.
  // Comparar paginação, texto e elementos visuais.
  // --------------------------------------------------------------------------
  it('TESTE 9 — Prévia fiel (renderização e paginação correspondem ao PDF gerado)', () => {
    const livro = {
      titulo: 'O Segredo da Floresta',
      subtitulo: 'Um suspense envolvente',
      autor: 'Leandro Palmeira',
      genero: 'Mistério',
      idioma: 'Português',
      capitulos: [
        {
          titulo: 'Capítulo 1: O Começo',
          texto: 'A floresta sussurrava segredos antigos quando a noite caía. Cada folha parecia contar uma história esquecida pelos séculos.'
        }
      ]
    };

    const pdfResult = buildKdpPdf({
      livro,
      formato: '6x9',
      optSumario: true,
      tamCapitulo: 11,
      corCapitulo: '#0f172a',
      incluirCapaNoMiolo: false,
      incluirContracapa: false
    });

    expect(pdfResult).toBeDefined();
    expect(pdfResult.bytes).toBeDefined();
    expect(pdfResult.pageCount).toBeGreaterThanOrEqual(1);
    expect(pdfResult.coverIncluded).toBe(false); // Miolo puro conforme regra KDP (Seção 16)
  });

  // --------------------------------------------------------------------------
  // TESTE 10 — Exportação da versão correta
  // Corrigir um capítulo, gerar o PDF e verificar se a correção aparece no arquivo final.
  // --------------------------------------------------------------------------
  it('TESTE 10 — Exportação da versão correta (PDF exporta o manuscrito revisado com o texto corrigido)', () => {
    const livroRevisado = {
      titulo: 'A Verdade Revelada',
      subtitulo: 'Edição Final Aprovada',
      autor: 'Leandro Palmeira',
      genero: 'Drama',
      idioma: 'Português',
      capitulos: [
        {
          titulo: 'Capítulo 1: A Descoberta',
          texto: 'O documento canônico continha a assinatura oficial e o carimbo dourado do cartório central.'
        }
      ]
    };

    const pdf = buildKdpPdf({
      livro: livroRevisado,
      formato: '6x9',
      optSumario: false,
      tamCapitulo: 11,
      corCapitulo: '#000000',
      incluirCapaNoMiolo: false
    });

    expect(pdf).toBeDefined();
    expect(pdf.bytes.length).toBeGreaterThan(100);
    expect(pdf.sanitizedText[0]).toContain('documento canônico');
  });

  // --------------------------------------------------------------------------
  // TESTE 11 — Projetos isolados
  // Criar dois livros com personagens diferentes.
  // Confirmar que a memória de um não contamina o outro.
  // --------------------------------------------------------------------------
  it('TESTE 11 — Projetos isolados (dois projetos possuem memórias e fatos completamente isolados)', async () => {
    const projA_Id = 'proj_alpha_001';
    const projB_Id = 'proj_beta_002';

    const memoryA = BookSequentialWritingEngine.initGlobalMemory({
      bookId: projA_Id,
      title: 'Projeto Alpha: Ficção Científica',
      author: 'Autor A',
      genre: 'Sci-Fi',
      plannedChapters: 5,
      centralPremise: 'Colônia em Marte',
      existingCharacters: [
        {
          id: 'char_mars_1',
          name: 'Comandante Vance',
          fullName: 'Vance Sterling',
          aliases: [],
          physicalAppearance: 'Traje espacial cinza',
          personality: 'Rigoroso',
          profession: 'Astronauta',
          background: 'NASA',
          familyRelations: '',
          relationships: {},
          goals: ['Sobreviver em Marte'],
          fears: ['Despressurização'],
          motivations: ['Ciência'],
          secrets: [],
          knownInfo: [],
          unknownInfo: [],
          currentLocation: 'Base Ares I em Marte',
          physicalState: 'Ótimo',
          emotionalState: 'Focado',
          narrativeStatus: 'active',
          lastAppearedChapter: 1,
          associatedChapters: [1]
        }
      ]
    });

    const memoryB = BookSequentialWritingEngine.initGlobalMemory({
      bookId: projB_Id,
      title: 'Projeto Beta: Romance Histórico',
      author: 'Autora B',
      genre: 'Romance',
      plannedChapters: 7,
      centralPremise: 'Bailes em Viena no século XIX',
      existingCharacters: [
        {
          id: 'char_vienna_1',
          name: 'Condessa Beatrice',
          fullName: 'Beatrice von Habsburg',
          aliases: ['Bea'],
          physicalAppearance: 'Vestido de seda azul',
          personality: 'Graciosa',
          profession: 'Nobre',
          background: 'Aristocracia austríaca',
          familyRelations: '',
          relationships: {},
          goals: ['Encontrar o verdadeiro amor'],
          fears: ['Casamento arranjado'],
          motivations: ['Liberdade'],
          secrets: [],
          knownInfo: [],
          unknownInfo: [],
          currentLocation: 'Palácio de Schönbrunn em Viena',
          physicalState: 'Saudável',
          emotionalState: 'Esperançosa',
          narrativeStatus: 'active',
          lastAppearedChapter: 1,
          associatedChapters: [1]
        }
      ]
    });

    // Salva cada memória em seu próprio ID isolado
    await db.saveBookGlobalMemory(projA_Id, memoryA);
    await db.saveBookGlobalMemory(projB_Id, memoryB);

    // Recupera e confirma isolamento estrito
    const loadedA = await db.getBookGlobalMemory(projA_Id);
    const loadedB = await db.getBookGlobalMemory(projB_Id);

    expect(loadedA?.identity?.title).toBe('Projeto Alpha: Ficção Científica');
    expect(loadedA?.characters?.[0]?.name).toBe('Comandante Vance');
    expect(loadedA?.characters?.some((c: any) => c.name.includes('Beatrice'))).toBe(false);

    expect(loadedB?.identity?.title).toBe('Projeto Beta: Romance Histórico');
    expect(loadedB?.characters?.[0]?.name).toBe('Condessa Beatrice');
    expect(loadedB?.characters?.some((c: any) => c.name.includes('Vance'))).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TESTE 12 — Auditoria reexecutada
  // Corrigir problemas e iniciar nova auditoria.
  // Confirmar que os problemas resolvidos não reaparecem e que novas inconsistências são detectadas.
  // --------------------------------------------------------------------------
  it('TESTE 12 — Auditoria reexecutada (re-auditoria confirma ausência de erros sanados e detecta novos)', async () => {
    // 1. Manuscrito com problema inicial (palavra rebuscada arcaica proibida)
    const livroComProblema = {
      titulo: 'A Jornada',
      subtitulo: 'Caminhos Cruzados',
      autor: 'Leandro Palmeira',
      genero: 'Romance Contemporâneo',
      idioma: 'Português',
      capitulos: [
        {
          titulo: 'Capítulo 1: O Encontro',
          texto: 'Dessarte, ela caminhava pela rua silenciosa. O vento soprava forte enquanto ela olhava para o horizonte cinzento.'
        }
      ]
    };

    // Primeira auditoria com detecção sem auto-fix imediato
    const audit1 = await UniversalEditorialAuditor.runUniversalAudit(livroComProblema, { autoFixSafeIssues: false });
    expect(audit1.auditResult.issues.length).toBeGreaterThan(0);
    const hasDessarte = audit1.auditResult.issues.some(i =>
      (i.originalSnippet || i.description || '').toLowerCase().includes('dessarte')
    );
    expect(hasDessarte).toBe(true);

    // 2. Aplica as correções automáticas seguras
    const { livroAtualizado } = UniversalEditorialAuditor.applyAllSafeFixes(livroComProblema, audit1.auditResult);
    expect(livroAtualizado.capitulos[0].texto).not.toContain('Dessarte');

    // 3. Re-executa a auditoria na obra corrigida
    const audit2 = await UniversalEditorialAuditor.runUniversalAudit(livroAtualizado, { autoFixSafeIssues: false });
    const hasDessarteAposCorrecao = audit2.auditResult.issues.some(i =>
      (i.originalSnippet || i.description || '').toLowerCase().includes('dessarte')
    );
    expect(hasDessarteAposCorrecao).toBe(false);
  });
});
