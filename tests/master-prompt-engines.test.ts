import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptyProjectState,
  ProjectStore,
  createMemoryStorage,
  newId,
  assertSameProject,
  EditorialProjectState
} from '../src/services/project-state';
import {
  CanonicalBookBible,
  validateClothing,
  validateGeographic,
  validateKnowledge,
  validateObjects,
  validateTemporal,
  validateChapterConnection,
  validateChapterNotEmpty,
  ChapterSnapshot,
  runAudit
} from '../src/services/continuity-engine';
import {
  analyzeAgeAppropriateness,
  validateAgeRequirement,
  enforceAgeAppropriateness,
  AGE_BANDS
} from '../src/services/age-engine';
import {
  checkTitleSimilarity,
  checkSubtitleSimilarity,
  filterOriginalCandidates,
  compareCovers,
  validateCoverVariants,
  CoverDescriptor
} from '../src/services/similarity-engine';
import {
  normalizeMarketItem,
  displayField,
  labelEstimate,
  describeRank,
  DATA_UNAVAILABLE
} from '../src/services/market-intel';
import {
  preflightFromPages,
  detectBlankPages
} from '../src/services/pdf-preflight';
import {
  canFinalize,
  canGenerateChapter,
  evaluateGates,
  deriveStatus
} from '../src/services/editorial-gates';
import { packContext } from '../src/services/context-packer';
import type { ExtractedPage } from '../src/services/kdp-pdf-validator';

describe('Suíte de Testes Obrigatórios do Prompt Mestre (Regras 1 a 64)', () => {
  let memoryStorage: ReturnType<typeof createMemoryStorage>;
  let store: ProjectStore;

  beforeEach(() => {
    memoryStorage = createMemoryStorage();
    store = new ProjectStore(memoryStorage);
  });

  // 1. Novo projeto inicia vazio
  it('1. Novo projeto inicia completamente vazio (clean state)', () => {
    const p = createEmptyProjectState();
    expect(p.projectId).toBeDefined();
    expect(p.title).toBe('');
    expect(p.subtitle).toBe('');
    expect(p.author).toBe('');
    expect(p.genre).toBe('');
    expect(p.theme).toBe('');
    expect(p.premise).toBe('');
    expect(p.characters).toEqual([]);
    expect(p.chapters).toEqual([]);
    expect(p.bookBible).toBeNull();
    expect(p.outline).toBeNull();
    expect(p.cover).toBeNull();
    expect(p.status).toBe('DRAFT');
  });

  // 2. Novo projeto não carrega último projeto
  it('2. Novo projeto não carrega automaticamente o último projeto', async () => {
    const p1 = createEmptyProjectState();
    p1.title = 'Livro Antigo de Sucesso';
    p1.author = 'Autor Veterano';
    await store.save(p1);

    const p2 = createEmptyProjectState();
    expect(p2.projectId).not.toBe(p1.projectId);
    expect(p2.title).toBe('');
    expect(p2.author).toBe('');
  });

  // 3. Projeto A não contamina Projeto B
  it('3. Projeto A não contamina Projeto B (isolamento estrito)', async () => {
    const projA = createEmptyProjectState();
    projA.title = 'A Mansão dos Segredos';
    projA.characters = [{ id: 'c1', name: 'Laura', permanent: { age: 30, appearance: 'alta, loira' } }];
    await store.save(projA);

    const projB = createEmptyProjectState();
    projB.title = 'Guia de Produtividade';
    await store.save(projB);

    const loadedA = await store.open(projA.projectId);
    const loadedB = await store.open(projB.projectId);

    expect(loadedA?.title).toBe('A Mansão dos Segredos');
    expect(loadedA?.characters).toHaveLength(1);
    expect(loadedB?.title).toBe('Guia de Produtividade');
    expect(loadedB?.characters).toHaveLength(0);
  });

  // 4. Duplicação cria novo projectId e registra duplicatedFromProjectId
  it('4. Duplicação explícita cria novo projectId e registra duplicatedFromProjectId', async () => {
    const original = createEmptyProjectState();
    original.title = 'Obra Matriz';
    await store.save(original);

    const duplicata = await store.duplicate(original.projectId, 'Obra Matriz (Volume 2)');
    expect(duplicata.projectId).not.toBe(original.projectId);
    expect(duplicata.duplicatedFromProjectId).toBe(original.projectId);
    expect(duplicata.title).toBe('Obra Matriz (Volume 2)');
  });

  // 5. Autosave funciona por projectId
  it('5. Autosave persiste dados de forma estritamente isolada por projectId', async () => {
    const pA = createEmptyProjectState();
    const pB = createEmptyProjectState();

    pA.premise = 'Premissa A';
    await store.save(pA);

    pB.premise = 'Premissa B';
    await store.save(pB);

    expect((await store.open(pA.projectId))?.premise).toBe('Premissa A');
    expect((await store.open(pB.projectId))?.premise).toBe('Premissa B');
  });

  // 6. Personagem não muda roupa sem causa
  it('6. Personagem não muda roupa sem justificativa (Clothing Validator)', () => {
    const snap1: ChapterSnapshot = {
      chapter: 1,
      characters: [{
        name: 'Marcos',
        startLocation: 'sala',
        endLocation: 'sala',
        startClothing: ['camisa azul', 'jeans'],
        endClothing: ['camisa azul', 'jeans']
      }]
    };

    const snap2: ChapterSnapshot = {
      chapter: 2,
      characters: [{
        name: 'Marcos',
        startLocation: 'sala',
        endLocation: 'sala',
        startClothing: ['smoking preto'], // Mudou de roupa sem motivo
        endClothing: ['smoking preto']
      }]
    };

    const issues = validateClothing([snap1, snap2]);
    expect(issues.some(i => i.validator === 'Roupas' && i.severity === 'ORANGE')).toBe(true);
  });

  // 7. Personagem não aparece em outro local sem transição
  it('7. Personagem não se teletransporta sem transição geográfica (Geographic Validator)', () => {
    const snap1: ChapterSnapshot = {
      chapter: 1,
      characters: [{
        name: 'Helena',
        startLocation: 'São Paulo',
        endLocation: 'São Paulo'
      }]
    };

    const snap2: ChapterSnapshot = {
      chapter: 2,
      characters: [{
        name: 'Helena',
        startLocation: 'Paris', // Teletransporte sem transição explicada
        endLocation: 'Paris'
      }]
    };

    const issues = validateGeographic([snap1, snap2]);
    expect(issues.some(i => i.validator === 'Geográfico' && i.severity === 'RED')).toBe(true);
  });

  // 8. Personagem não sabe informação futura
  it('8. Personagem não utiliza conhecimento que ainda não descobriu (Knowledge Validator)', () => {
    const snap1: ChapterSnapshot = {
      chapter: 1,
      characters: [{
        name: 'Arthur',
        startLocation: 'sala',
        endLocation: 'sala',
        learned: [{ fact: 'o cofre foi violado' }]
      }]
    };

    const snap2: ChapterSnapshot = {
      chapter: 2,
      characters: [{
        name: 'Arthur',
        startLocation: 'sala',
        endLocation: 'sala',
        actsOn: ['o mordomo é o assassino'] // Age sobre fato que não aprendeu
      }]
    };

    const issues = validateKnowledge([snap1, snap2]);
    expect(issues.some(i => i.validator === 'Conhecimento' && i.severity === 'CRITICAL')).toBe(true);
  });

  // 9. Objeto não desaparece sem explicação
  it('9. Objeto carregado não desaparece sem explicação narrativa (Object Validator)', () => {
    const snap1: ChapterSnapshot = {
      chapter: 1,
      characters: [{
        name: 'Diego',
        startLocation: 'sala',
        endLocation: 'sala',
        startObjects: ['chave mestra', 'carteira'],
        endObjects: ['chave mestra', 'carteira']
      }]
    };

    const snap2: ChapterSnapshot = {
      chapter: 2,
      characters: [{
        name: 'Diego',
        startLocation: 'sala',
        endLocation: 'sala',
        startObjects: ['carteira'], // Perdeu 'chave mestra' sem explicação
        endObjects: ['carteira']
      }]
    };

    const issues = validateObjects([snap1, snap2]);
    expect(issues.some(i => i.validator === 'Objetos' && i.severity === 'RED')).toBe(true);
  });

  // 10. Timeline não possui contradição
  it('10. Timeline detecta regressão ou contradição temporal (Temporal Validator)', () => {
    const snap1: ChapterSnapshot = {
      chapter: 1,
      startMinute: 60,
      endMinute: 120,
      characters: []
    };

    const snap2: ChapterSnapshot = {
      chapter: 2,
      startMinute: 90, // Começa antes do fim do anterior sem ser flashback
      endMinute: 150,
      flashback: false,
      characters: []
    };

    const issues = validateTemporal([snap1, snap2]);
    expect(issues.some(i => i.validator === 'Temporal' && i.severity === 'RED')).toBe(true);
  });

  // 11. Vocabulário infantil acima da idade é detectado
  it('11. Vocabulário infantil acima da idade é detectado e auditado (Age Engine)', () => {
    const textoInadequado = `A epistemologia da relatividade quântica estabelece prerrogativas ontológicas fundamentais para a cognição transcendental de fenômenos hermenêuticos complexos, elucidando assim a conjuntura paradigmática da ciência pós-moderna através de axiomas irrefutáveis.`;
    const analise = analyzeAgeAppropriateness(textoInadequado, '3-5');

    expect(analise.appropriate).toBe(false);
    expect(analise.VOCABULARY_DIFFICULTY_SCORE).toBeGreaterThan(60);
    expect(analise.AGE_APPROPRIATENESS_SCORE).toBeLessThan(50);
    expect(analise.issues.length).toBeGreaterThan(0);
  });

  // 12. Título semelhante é rejeitado
  it('12. Título excessivamente semelhante ao corpus de mercado é rejeitado (Title Similarity Engine)', () => {
    const corpusMercado = ['O Código da Mente', 'Segredos do Silêncio', 'A Garota na Névoa'];
    const candidatoSemelhante = 'O Código da Mente';
    const candidatoOriginal = 'O Labirinto das Sombras Esquecidas';

    const sim1 = checkTitleSimilarity(candidatoSemelhante, corpusMercado);
    expect(sim1.risk).toBe('high');
    expect(sim1.score).toBeGreaterThan(0.7);

    const sim2 = checkTitleSimilarity(candidatoOriginal, corpusMercado);
    expect(sim2.risk).toBe('low');
  });

  // 13. Subtítulo semelhante é rejeitado
  it('13. Subtítulo copiado é rejeitado por similaridade (Subtitle Similarity Engine)', () => {
    const corpus = ['Um thriller psicológico implacável sobre segredos de família'];
    const candidato = 'Um thriller psicológico implacável sobre segredos de família';

    const sim = checkSubtitleSimilarity(candidato, corpus);
    expect(sim.risk).toBe('high');
    expect(sim.score).toBe(1);
  });

  // 14. Capítulo desconectado é detectado
  it('14. Capítulo desconectado semanticamente é detectado (Chapter Connection Validator)', () => {
    const cap1 = 'O detetive Marcos caminhou pela Rua Augusta no cais chuvoso da cidade de Santos.';
    const cap2 = 'A receita do bolo de chocolate leva farinha, manteiga derretida e açúcar refinado.';

    const issues = validateChapterConnection(2, cap1, cap2);
    expect(issues.some(i => i.validator === 'Conexão')).toBe(true);
  });

  // 15. Capítulo vazio é detectado
  it('15. Capítulo vazio ou quase sem palavras é detectado com severidade CRITICAL', () => {
    const issues = validateChapterNotEmpty(1, '', 100);
    expect(issues.some(i => i.validator === 'Capítulo' && i.severity === 'CRITICAL')).toBe(true);
  });

  // 16. Página PDF em branco é detectada
  it('16. Página em branco inesperada é detectada pelo detector de páginas', () => {
    const pages: ExtractedPage[] = [
      { page: 1, text: 'Capítulo 1 Introdução', width: 400, height: 600, lines: 1, hasImage: false, outOfBounds: 0, nearEdge: 0 },
      { page: 2, text: '', width: 400, height: 600, lines: 0, hasImage: false, outOfBounds: 0, nearEdge: 0 }, // Em branco não intencional
      { page: 3, text: 'Continuação da narrativa', width: 400, height: 600, lines: 1, hasImage: false, outOfBounds: 0, nearEdge: 0 }
    ];

    const blanks = detectBlankPages(pages, []);
    expect(blanks).toContain(2);

    const preflight = preflightFromPages(pages, { intentionalBlankPages: [] });
    expect(preflight.ok).toBe(false);
    expect(preflight.issues.some(i => i.message.includes('em branco'))).toBe(true);
  });

  // 17. Texto cortado é detectado
  it('17. Texto fora da margem ou cortado é detectado no preflight', () => {
    const pages: ExtractedPage[] = [
      { page: 1, text: 'Texto com extravasamento', width: 400, height: 600, lines: 5, hasImage: false, outOfBounds: 2, nearEdge: 0 }
    ];

    const preflight = preflightFromPages(pages);
    expect(preflight.issues.some(i => i.message.includes('Texto cortado') && i.severity === 'RED')).toBe(true);
  });

  // 18. Imagem ausente é detectada quando exigida
  it('18. Ausência de capa em livro finalizado é identificada no preflight', () => {
    const pages: ExtractedPage[] = [
      { page: 1, text: 'Sumário Sem Capa', width: 400, height: 600, lines: 5, hasImage: false, outOfBounds: 0, nearEdge: 0 }
    ];

    const preflight = preflightFromPages(pages, { coverRequired: true });
    expect(preflight.issues.some(i => i.message.toLowerCase().includes('capa'))).toBe(true);
  });

  // 19. Erro crítico bloqueia finalização
  it('19. Presença de erro de severidade CRITICAL bloqueia finalização (canFinalize)', () => {
    const state = createEmptyProjectState();
    state.title = 'Livro Quase Pronto';
    state.audit = { critical: 1, red: 0, at: Date.now() };

    const fin = canFinalize(state);
    expect(fin.ok).toBe(false);
    expect(fin.reasons.some(r => r.includes('CRÍTICO') || r.includes('GATE_'))).toBe(true);
  });

  // 20. PDF final passa pelo preflight
  it('20. PDF válido e bem diagramado passa com sucesso pelo preflight', () => {
    const pages: ExtractedPage[] = [
      { page: 1, text: 'Capa da Obra', width: 432, height: 648, lines: 1, hasImage: true, outOfBounds: 0, nearEdge: 0 },
      { page: 2, text: 'O detetive caminhou pela rua deserta na noite chuvosa. Havia mistério em cada esquina.', width: 432, height: 648, lines: 2, hasImage: false, outOfBounds: 0, nearEdge: 0 }
    ];

    const preflight = preflightFromPages(pages, {
      coverRequired: true,
      expectedSizePts: [432, 648]
    });

    expect(preflight.ok).toBe(true);
    expect(preflight.issues.filter(i => i.severity === 'RED' || i.severity === 'CRITICAL')).toHaveLength(0);
  });

  // 21. Capa excessivamente semelhante é rejeitada
  it('21. Capa excessivamente idêntica a variante anterior é rejeitada (Cover Similarity Engine)', () => {
    const cap1: CoverDescriptor = {
      palette: ['#0f172a', '#1e293b'],
      composition: 'central-hero',
      dominantStyle: 'cinematic',
      perceptualHash: '1111222233334444'
    };

    const cap2QuaseIdentica: CoverDescriptor = {
      palette: ['#0f172a', '#1e293b'],
      composition: 'central-hero',
      dominantStyle: 'cinematic',
      perceptualHash: '1111222233334445'
    };

    const comp = compareCovers(cap1, cap2QuaseIdentica);
    expect(comp.similar).toBe(true);

    const validacao = validateCoverVariants([cap1, cap2QuaseIdentica]);
    expect(validacao.ok).toBe(false);
    expect(validacao.rejected.length).toBeGreaterThan(0);
  });

  // 22. Dados Amazon não disponíveis não são inventados
  it('22. Dados de mercado indisponíveis exibem "Dado não disponível" em vez de inventar números', () => {
    const itemSemDados = normalizeMarketItem({ title: 'Obra Rara' }, { source: 'Amazon Search' });
    expect(itemSemDados.bsr).toBeNull();
    expect(displayField(itemSemDados.reviews)).toBe(DATA_UNAVAILABLE);
    expect(displayField(itemSemDados.rating)).toBe(DATA_UNAVAILABLE);
    expect(labelEstimate(null, 'vendas')).toBe(DATA_UNAVAILABLE);
    expect(describeRank(itemSemDados)).toBe(DATA_UNAVAILABLE);
  });

  // 23. Projeto antigo permanece intacto ao criar novo
  it('23. Projeto antigo permanece 100% inalterado ao criar e salvar novo projeto', async () => {
    const antigo = createEmptyProjectState();
    antigo.title = 'Projeto Antigo Consolidado';
    antigo.chapters = [{ index: 1, title: 'Cap 1', text: 'Texto original', versions: [], approved: true, wordCount: 100 }];
    await store.save(antigo);

    const novo = createEmptyProjectState();
    novo.title = 'Novo Projeto Limpo';
    await store.save(novo);

    const conferido = await store.open(antigo.projectId);
    expect(conferido?.title).toBe('Projeto Antigo Consolidado');
    expect(conferido?.chapters).toHaveLength(1);
    expect(conferido?.chapters[0].title).toBe('Cap 1');
  });

  // 24. Book Bible não é compartilhada entre projetos independentes
  it('24. Context Packer impede contaminação e rejeita Book Bible de outro projeto', () => {
    const projA = createEmptyProjectState();
    projA.projectId = 'prj_A_111';

    const projB = createEmptyProjectState();
    projB.projectId = 'prj_B_222';
    projB.bookBible = {
      projectId: 'prj_ESTRANHO_999', // ID divergente do projeto
      permanent: { characters: {}, locations: {}, objects: {}, facts: [] },
      dynamicSnapshots: []
    };

    expect(() => {
      packContext(projB, 1);
    }).toThrow();
  });

  // 56. TESTE DE REGRESSÃO COM "A CABANA"
  describe('56. Teste de Regressão com "A Cabana"', () => {
    it('Detecta inconsistências narrativas (teletransporte, roupa e vazamento de conhecimento) no enredo de "A Cabana"', () => {
      const bibleCabana: CanonicalBookBible = {
        projectId: 'proj_cabana_regressao',
        permanent: {
          characters: {
            'mack': { name: 'Mack', role: 'protagonista', traits: ['luto', 'determinado'] }
          },
          locations: {
            'cidade': { name: 'Cidade', description: 'Casa da família' },
            'cabana': { name: 'Cabana', description: 'Local isolado' }
          },
          objects: {
            'bilhete': { name: 'Bilhete', description: 'Bilhete misterioso' }
          },
          facts: []
        },
        dynamicSnapshots: []
      };

      const snapCap1: ChapterSnapshot = {
        chapter: 1,
        characters: [{
          name: 'Mack',
          startLocation: 'Cidade',
          endLocation: 'Cidade',
          startClothing: ['casaco pesado'],
          endClothing: ['casaco pesado'],
          startObjects: ['bilhete'],
          endObjects: ['bilhete'],
          learned: [{ fact: 'recebeu bilhete misterioso' }]
        }]
      };

      const snapCap2ComRegressao: ChapterSnapshot = {
        chapter: 2,
        characters: [{
          name: 'Mack',
          startLocation: 'Cabana', // Teletransporte sem transição
          endLocation: 'Cabana',
          startClothing: ['camisa polo de verão'], // Mudança brusca sem justificativa
          endClothing: ['camisa polo de verão'],
          startObjects: [], // Perdeu o bilhete misteriosamente
          endObjects: [],
          actsOn: ['sabe a identidade secreta de quem enviou'] // Vazamento de conhecimento
        }]
      };

      const texts = [
        { chapter: 1, text: 'Mack recebeu o bilhete em sua casa na Cidade fria e chuvosa.' },
        { chapter: 2, text: 'Mack estava agora na Cabana ensolarada, sem lembrar de como chegou.' }
      ];

      const audit = runAudit({
        snapshots: [snapCap1, snapCap2ComRegressao],
        bible: bibleCabana,
        texts
      });

      const temTeleporte = audit.issues.some(i => i.validator === 'Geográfico');
      const temTrocaRoupa = audit.issues.some(i => i.validator === 'Roupas');
      const temSumicoObjeto = audit.issues.some(i => i.validator === 'Objetos');
      const temVazamentoConhecimento = audit.issues.some(i => i.validator === 'Conhecimento');

      expect(temTeleporte).toBe(true);
      expect(temTrocaRoupa).toBe(true);
      expect(temSumicoObjeto).toBe(true);
      expect(temVazamentoConhecimento).toBe(true);
      expect(audit.blocked).toBe(true);
    });
  });
});
