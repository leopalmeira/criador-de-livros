import { describe, it, expect, vi } from 'vitest';
import {
  assertNotDiagnosticBook,
  BookEnginEditorialHouse,
  type CharacterProfile,
  type CanonicalLocation,
  type BookEnginEditorialMemory,
  type ProductionStateMachine,
} from '../src/services/editorial-multiagent-house';
import type { BookGlobalMemory } from '../src/services/book-sequential-writing-engine';

describe('BookEngin — Editora Multiagentes e Memória Editorial Persistente', () => {
  describe('1. Guarda Absoluta de Segurança ("The Silent Cold")', () => {
    it('deve bloquear estritamente qualquer tentativa de modificar "The Silent Cold"', () => {
      expect(() => assertNotDiagnosticBook('The Silent Cold')).toThrowError(
        /BLOQUEIO DE SEGURANÇA EDITORIAL/
      );
      expect(() => assertNotDiagnosticBook('the_silent_cold')).toThrowError(
        /BLOQUEIO DE SEGURANÇA EDITORIAL/
      );
      expect(() => assertNotDiagnosticBook('THE SILENT COLD - Revised Edition')).toThrowError(
        /BLOQUEIO DE SEGURANÇA EDITORIAL/
      );
    });

    it('deve permitir a produção normal de novos livros de qualquer gênero', () => {
      expect(() => assertNotDiagnosticBook('O Segredo da Manipulação')).not.toThrow();
      expect(() => assertNotDiagnosticBook('Echoes in the Fog')).not.toThrow();
      expect(() => assertNotDiagnosticBook('O Império das Cinzas')).not.toThrow();
    });
  });

  describe('2. Inicialização da Memória Editorial com Separação Tripartite', () => {
    it('deve inicializar memória estruturada com fatos canônicos, suspeitas e revelações', () => {
      const memory = BookEnginEditorialHouse.agent2NarrativeArchitect({
        bookId: 'proj_thriller_001',
        title: 'Sombras de Manhattan',
        author: 'Arthur Pendelton',
        genre: 'Thriller Psicológico',
        targetAudience: 'Adulto',
        language: 'Português',
        premise: 'Um detetive investiga um desaparecimento na alta sociedade.',
        plannedChapters: 5,
        existingCharacters: [
          {
            id: 'char_1',
            name: 'Lucas Vance',
            fullName: 'Lucas Gabriel Vance',
            role: 'protagonista',
            profession: 'Detetive Particular',
            age: 38,
            physicalAppearance: 'Alto, olhos escuros, sobretudo cinza.',
            personality: 'Metódico, cético e observador.',
            background: 'Ex-investigador de homicídios da polícia de NY.',
            relationships: { Helena: 'Cliente misteriosa' },
            goals: ['Descobrir quem enviou a carta anônima'],
            currentLocation: 'Escritório no 4º andar',
            physicalState: 'Ativo',
            emotionalState: 'Alerta',
            lastAppearedChapter: 1,
          },
        ],
        existingLocations: [
          {
            id: 'loc_1',
            name: 'Edifício Vance & Associados',
            city: 'Nova York',
            country: 'Estados Unidos',
            floor: 4,
            address: '5th Avenue, 1024',
            description: 'Prédio comercial antigo de tijolos escuros.',
          },
        ],
      });

      expect(memory.storyBible.title).toBe('Sombras de Manhattan');
      expect(memory.characters.length).toBe(1);
      expect(memory.characters[0].profession).toBe('Detetive Particular');
      expect(memory.locations[0].floor).toBe(4);
      expect(memory.fatosEstabelecidos.length).toBeGreaterThan(0);
      expect(
        memory.fatosEstabelecidos.some(f => f.fact.includes('Detetive Particular'))
      ).toBe(true);
    });

    it('deve converter com precisão BookGlobalMemory legada para BookEnginEditorialMemory moderna', () => {
      const legacyMemory: BookGlobalMemory = {
        bookId: 'proj_legacy_01',
        version: 1,
        updatedAt: '2026-10-31T12:00:00Z',
        identity: {
          title: 'A Última Evidência',
          subtitle: 'Uma investigação sem volta',
          author: 'Clara Rios',
          language: 'Português',
          genre: 'Ficção Policial',
          targetAudience: 'Geral',
          narrativeTone: 'Tenso',
          literaryStyle: 'Direto e envolvente',
          plannedChapters: 4,
          centralPremise: 'Uma arma de fogo desaparece do cofre da promotoria.',
          mainTheme: 'Corrupção e Lealdade',
          readerPromise: 'Mistério instigante com final surpreendente.',
        },
        characters: [
          {
            id: 'char_clara',
            name: 'Clara',
            fullName: 'Clara Beatriz Rios',
            aliases: ['Promotora Rios'],
            profession: 'Promotora de Justiça',
            physicalAppearance: 'Cabelos castanhos presos.',
            personality: 'Firme e incorruptível.',
            background: 'Dez anos atuando em fraudes corporativas.',
            familyRelations: 'Solteira',
            relationships: { Marcos: 'Investigador assistente' },
            goals: ['Auditar o cofre'],
            fears: ['Perder a credibilidade'],
            motivations: ['Justiça'],
            secrets: ['Possui a chave reserva'],
            knownInfo: ['A fechadura não foi arrombada'],
            unknownInfo: ['Quem tinha a combinação'],
            currentLocation: 'Gabinete 302',
            physicalState: 'Bem',
            emotionalState: 'Preocupada',
            narrativeStatus: 'active',
            introducedChapter: 1,
            lastSeenChapter: 1,
            arcProgress: 'Iniciado',
          },
        ],
        locations: [
          {
            id: 'loc_promotoria',
            name: 'Promotoria Central',
            city: 'São Paulo',
            state: 'SP',
            country: 'Brasil',
            floor: 3,
            associatedChapters: [1],
          },
        ],
        timeline: [],
        plotThreads: [],
        canonicalFacts: [
          {
            id: 'fact_1',
            category: 'event',
            fact: 'A arma estava trancada no cofre às 18h de terça-feira.',
            establishedInChapter: 1,
            immutable: true,
          },
        ],
      };

      const modern = BookEnginEditorialHouse.fromGlobalMemory(legacyMemory);
      expect(modern.bookId).toBe('proj_legacy_01');
      expect(modern.characters[0].name).toBe('Clara');
      expect(modern.characters[0].profession).toBe('Promotora de Justiça');
      expect(modern.fatosEstabelecidos[0].fact).toBe(
        'A arma estava trancada no cofre às 18h de terça-feira.'
      );
    });
  });

  describe('3. Construtor de Prompt do Escritor (Agente 3)', () => {
    it('deve blindar o prompt do escritor com profissão imutável e fatos canônicos', () => {
      const memory = BookEnginEditorialHouse.agent2NarrativeArchitect({
        bookId: 'proj_002',
        title: 'O Veredito Oculto',
        author: 'Sara Ramos',
        genre: 'Suspense',
        targetAudience: 'Adulto',
        language: 'Português',
        premise: 'Um juiz descobre um complô antes do júri.',
        plannedChapters: 3,
        existingCharacters: [
          {
            id: 'char_juiz',
            name: 'Mateus Vale',
            fullName: 'Dr. Mateus Alencar Vale',
            role: 'protagonista',
            profession: 'Juiz Federal',
            physicalAppearance: 'Grisalho, postura ereta.',
            personality: 'Severo e austero.',
            background: 'Vinte anos na magistratura.',
            relationships: {},
            goals: ['Concluir o julgamento em segurança'],
            currentLocation: 'Tribunal',
            physicalState: 'Saudável',
            emotionalState: 'Tenso',
            lastAppearedChapter: 1,
          },
        ],
      });

      const { systemContext, userContext } = BookEnginEditorialHouse.buildWriterPrompt({
        memory,
        chapterNumber: 2,
        totalChapters: 3,
        lastChapterState: {
          chapterNumber: 1,
          title: 'A Convocação',
          factualSummary: 'Mateus recebeu uma pasta anônima em seu gabinete.',
          closingScene: 'A porta se fechou e os passos ecoaram no corredor.',
          endingLocation: { name: 'Gabinete 401', floor: 4 },
          cliffhangerHook: 'Uma voz sussurrou seu nome no interfone.',
          charactersPresent: ['Mateus Vale'],
        },
      });

      expect(userContext).toContain('Mateus Vale');
      expect(userContext).toContain('PROFISSÃO IMUTÁVEL: "Juiz Federal"');
      expect(userContext).toContain('Uma voz sussurrou seu nome no interfone.');
      expect(systemContext).toContain('NUNCA altere a profissão, idade ou identidade de um personagem');
    });
  });

  describe('4. Auditoria Tripla por Capítulo (Agentes 4, 5 e 6) & Corretor Autônomo (Agente 9)', () => {
    it('deve detectar mutação de profissão e corrigi-la sem estragar a narrativa', () => {
      const memory = BookEnginEditorialHouse.agent2NarrativeArchitect({
        bookId: 'proj_003',
        title: 'Noite sem Fim',
        author: 'Autor Teste',
        genre: 'Mistério',
        targetAudience: 'Adulto',
        language: 'Português',
        premise: 'Mistério clássico.',
        plannedChapters: 3,
        existingCharacters: [
          {
            id: 'char_rodrigo',
            name: 'Rodrigo',
            fullName: 'Rodrigo Santoro',
            role: 'protagonista',
            profession: 'Detetive',
            physicalAppearance: 'Forte',
            personality: 'Calmo',
            background: 'Investigador experiente',
            relationships: {},
            goals: [],
            currentLocation: 'Delegacia',
            physicalState: 'Bem',
            emotionalState: 'Normal',
            lastAppearedChapter: 1,
          },
        ],
      });

      // Texto defeituoso onde o autor chamou Rodrigo de jornalista
      const chapterTextDefeituoso =
        'Rodrigo como jornalista investigativo caminhava pela calçada fria da avenida. O jornalista examinava o caderno de anotações com atenção.';

      const audit = BookEnginEditorialHouse.verifyChapterTriplePass({
        chapterText: chapterTextDefeituoso,
        chapterTitle: 'Capítulo 2: A Pista',
        chapterNumber: 2,
        totalChapters: 3,
        memory,
      });

      expect(audit.valid).toBe(false);
      expect(audit.issues.some(i => i.category === 'profissao_mutada')).toBe(true);

      // Agente 9 corrige autonomamente
      const { fixedText, correctionsAppliedCount } = BookEnginEditorialHouse.agent9AutonomousCorrector(
        chapterTextDefeituoso,
        'Capítulo 2: A Pista',
        audit.issues
      );

      expect(correctionsAppliedCount).toBeGreaterThan(0);
      expect(fixedText).toContain('Detetive');
    });

    it('deve detectar e remover metarreferências artificiais proibidas ("no capítulo anterior")', () => {
      const memory = BookEnginEditorialHouse.agent2NarrativeArchitect({
        bookId: 'proj_004',
        title: 'O Enigma da Torre',
        author: 'Autor Teste',
        genre: 'Suspense',
        targetAudience: 'Adulto',
        language: 'Português',
        premise: 'Um mistério na torre.',
        plannedChapters: 3,
      });

      const chapterTextComMetarreferencia =
        'Como vimos no capítulo anterior, as sombras aumentavam. O vento soprava forte na colina.';

      const audit = BookEnginEditorialHouse.verifyChapterTriplePass({
        chapterText: chapterTextComMetarreferencia,
        chapterTitle: 'Capítulo 2: O Avanço',
        chapterNumber: 2,
        totalChapters: 3,
        memory,
      });

      expect(audit.valid).toBe(false);
      expect(audit.issues.some(i => i.category === 'referencia_artificial')).toBe(true);

      const { fixedText } = BookEnginEditorialHouse.agent9AutonomousCorrector(
        chapterTextComMetarreferencia,
        'Capítulo 2: O Avanço',
        audit.issues
      );

      expect(fixedText).not.toContain('no capítulo anterior');
    });
  });

  describe('5. Auditoria Final Independente (Agente 10)', () => {
    it('deve aprovar a obra quando todos os 10 critérios editoriais forem atendidos', () => {
      const memory = BookEnginEditorialHouse.agent2NarrativeArchitect({
        bookId: 'proj_005',
        title: 'O Legado Esquecido',
        author: 'Helena Duarte',
        genre: 'Ficção Histórica',
        targetAudience: 'Geral',
        language: 'Português',
        premise: 'A história de uma família durante a ferrovia do café.',
        plannedChapters: 2,
      });

      const chapters = [
        {
          titulo: 'Capítulo 1: O Início da Linha',
          texto: 'Os trilhos reluziam sob o sol da manhã. Os operários preparavam o terreno com precisão.',
        },
        {
          titulo: 'Capítulo 2: A Chegada do Trem',
          texto: 'A locomotiva apitou no horizonte. A poeira subiu e a cidade comemorou a nova era.',
        },
      ];

      const fakeLayoutReport: any = {
        selectedFormat: '6x9',
        duplicateTocNumbering: false,
        headersCutOrTruncated: false,
        manuscriptWordsPreserved: true,
        pdfValidation: { ok: true, errors: [] },
        epubValidation: { ok: true, errors: [] },
      };

      const fakeGlobalAudit: any = {
        status: 'APROVADA NA AUDITORIA EDITORIAL',
        metrics: { criticalCount: 0, warningCount: 0 },
      };

      const finalAudit = BookEnginEditorialHouse.executeFinalIndependentAudit({
        memory,
        chapters,
        layoutReport: fakeLayoutReport,
        globalAuditResult: fakeGlobalAudit,
      });

      expect(finalAudit.approved).toBe(true);
      expect(finalAudit.status).toBe('APROVADA NA AUDITORIA EDITORIAL INTERNA');
      expect(finalAudit.criteriaPassedCount).toBe(10);
    });
  });

  describe('6. Máquina de Estados da Produção Editorial (6 Etapas)', () => {
    it('deve criar e inicializar a máquina de estados com as 6 etapas estruturadas', () => {
      const state: ProductionStateMachine = BookEnginEditorialHouse.createInitialProductionState(
        'O Labirinto da Verdade',
        4
      );

      expect(state.bookId).toBe('O Labirinto da Verdade');
      expect(state.overallStatus).toBe('IDLE');
      expect(state.totalChapters).toBe(4);
      expect(Object.keys(state.stages)).toEqual([
        'planejamento',
        'escrita',
        'revisao_editorial',
        'revisao_linguistica',
        'diagramacao',
        'auditoria_final',
      ]);
      expect(state.stages.planejamento.order).toBe(1);
      expect(state.stages.escrita.order).toBe(2);
      expect(state.stages.diagramacao.order).toBe(5);
      expect(state.stages.auditoria_final.order).toBe(6);
    });
  });
});
