import { describe, it, expect, beforeEach } from 'vitest';
import { MultiEngineCoordinator } from '../src/services/multi-engine/multi-engine-coordinator';
import { NarrativeMemoryStore } from '../src/services/multi-engine/narrative-memory-store';
import { WebnovelAuditEngine } from '../src/services/multi-engine/webnovel-audit-engine';
import { AutonomousCorrector } from '../src/services/multi-engine/autonomous-corrector';

describe('BOOKENGIN MULTI-ENGINE — Bateria de Testes Obrigatórios (8 Cenários)', () => {
  let coordinator: MultiEngineCoordinator;
  let memoryStore: NarrativeMemoryStore;
  let auditEngine: WebnovelAuditEngine;
  let corrector: AutonomousCorrector;

  beforeEach(() => {
    coordinator = new MultiEngineCoordinator('test_book_101', 'O Enigma de Vidro', 'Thriller');
    memoryStore = coordinator.getMemoryStore();
    auditEngine = coordinator.getWebnovelAuditor();
    corrector = new AutonomousCorrector(auditEngine, memoryStore);
  });

  // --------------------------------------------------------------------------
  // TESTE 1: Objeto deixado na mesa vs retirado do bolso sem movimentação
  // --------------------------------------------------------------------------
  it('TESTE 1: deve detectar contradição quando um objeto sobre a mesa/estante é retirado do bolso sem movimentação intermediária', async () => {
    // Cenário: João coloca a chave mestra sobre a mesa no capítulo 1
    memoryStore.registerOrUpdateCharacter({
      name: 'João',
      currentLocation: 'Apartamento'
    });

    memoryStore.registerOrUpdateObject({
      name: 'chave mestra',
      currentLocation: 'sobre a mesa da sala',
      currentState: 'sobre a mesa da sala',
      lastManipulatedBy: 'João',
      lastTextEvidence: 'João chegou cansado e colocou a chave mestra sobre a mesa da sala.'
    });

    // Capítulo 2: João retira a chave mestra do bolso (sem ter pego na mesa)
    const cap2Texto = `
      Na manhã seguinte, João desceu até a garagem silenciosa do prédio.
      Sem hesitar um instante, tirou a chave mestra do bolso e tentou abrir o cadeado enferrujado.
    `.trim();

    const report = await auditEngine.auditChapter(2, 'O Cadeado', cap2Texto);

    expect(report.hasBlocking).toBe(true);
    expect(report.approved).toBe(false);
    const issue = report.issues.find(i => i.category === 'setting' && i.description.includes('chave mestra'));
    expect(issue).toBeDefined();
    expect(issue?.blocking).toBe(true);
    expect(issue?.evidence).toContain('sobre a mesa da sala');
    expect(report.dimensionResults.setting.conclusion).toBe('fail');
  });

  // --------------------------------------------------------------------------
  // TESTE 2: Personagem morto que reaparece vivo sem justificativa narrativa
  // --------------------------------------------------------------------------
  it('TESTE 2: deve identificar contradição crítica quando um personagem morto é apresentado vivo e interagindo', async () => {
    // Cenário: Dr. Roberto morreu no capítulo 2
    memoryStore.registerOrUpdateCharacter({
      name: 'Roberto',
      fullName: 'Dr. Roberto Silveira',
      currentLocation: 'Hospital Central'
    });

    memoryStore.killCharacter(
      'Roberto',
      2,
      'O monitor cardíaco parou; o Dr. Roberto faleceu na mesa de cirurgia às 22h.'
    );

    // Capítulo 4: Dr. Roberto entra na sala e conversa normalmente
    const cap4Texto = `
      A reunião na diretoria transcorria tensa.
      De repente, a porta se abriu e Roberto disse que tinha em mãos todos os relatórios financeiros.
      Ele caminhou até o centro da sala com um sorriso irônico.
    `.trim();

    const report = await auditEngine.auditChapter(4, 'A Reunião', cap4Texto);

    expect(report.hasBlocking).toBe(true);
    const deadIssue = report.issues.find(i => i.category === 'character' && i.description.includes('faleceu no capítulo'));
    expect(deadIssue).toBeDefined();
    expect(deadIssue?.severity).toBe('critical');
    expect(deadIssue?.blocking).toBe(true);
    expect(report.dimensionResults.character.conclusion).toBe('fail');
  });

  // --------------------------------------------------------------------------
  // TESTE 3: Personagem desconhece segredo mas o menciona sem ter sido informado
  // --------------------------------------------------------------------------
  it('TESTE 3: deve detectar inconsistência quando personagem menciona segredo que consta como desconhecido na matriz', async () => {
    // Cenário: Mariana desconhece a identidade do traidor 'Corvo'
    const char = memoryStore.registerOrUpdateCharacter({
      name: 'Mariana',
      unknownSecrets: ['Identidade do Corvo é o Senador Vargas']
    });

    // Capítulo 3: Mariana fala expressamente sobre o segredo sem ter recebido a informação
    const cap3Texto = `
      Mariana olhou fixamente para o investigador e disparou sem rodeios:
      — Eu sei que o Senador Vargas é o Corvo e ele nos trairá amanhã.
    `.trim();

    const report = await auditEngine.auditChapter(3, 'Suspeitas', cap3Texto);

    expect(report.hasBlocking).toBe(true);
    const knowledgeIssue = report.issues.find(i => i.category === 'character' && i.description.includes('Violação do Limite de Conhecimento'));
    expect(knowledgeIssue).toBeDefined();
    expect(knowledgeIssue?.blocking).toBe(true);
    expect(knowledgeIssue?.evidence).toContain('doesNotKnow');
  });

  // --------------------------------------------------------------------------
  // TESTE 4: Incompatibilidade temporal e espacial (duas cidades distantes)
  // --------------------------------------------------------------------------
  it('TESTE 4: deve identificar incompatibilidade temporal e espacial de personagem em cidades distantes sem deslocamento', async () => {
    // Cenário: Detetive Helena está em Londres no capítulo 1
    memoryStore.registerOrUpdateCharacter({
      name: 'Helena',
      currentLocation: 'Londres (Gabinete da Scotland Yard)',
      lastAppearedChapter: 1
    });

    // Capítulo 2: No mesmo dia/sem explicação de voo ela aparece em Tóquio
    const cap2Texto = `
      Naquela mesma tarde nublada, Helena caminhava pelas ruas iluminadas de Tóquio observando a multidão.
    `.trim();

    const report = await auditEngine.auditChapter(2, 'O Encontro em Tóquio', cap2Texto);

    expect(report.hasBlocking).toBe(true);
    const timelineIssue = report.issues.find(i => i.category === 'timeline');
    expect(timelineIssue).toBeDefined();
    expect(timelineIssue?.description).toContain('Incompatibilidade temporal e espacial');
    expect(timelineIssue?.blocking).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TESTE 5: Personagem novo introduzido legitimamente NÃO deve ser alucinação
  // --------------------------------------------------------------------------
  it('TESTE 5: NÃO deve classificar como alucinação um personagem novo introduzido legitimamente com apresentação formal', async () => {
    // Texto introduzindo formalmente um novo personagem na narrativa
    const capTexto = `
      O silêncio do necrotério foi quebrado pelo ranger da porta pesada de aço.
      Um homem alto de sobretudo escuro adentrou a sala fria, estendendo um distintivo prateado.
      Apresentou-se como Inspetor Mendes, recém-chegado da corregedoria geral para assumir a investigação.
      Ele observou as gavetas de zinco com olhar clínico e severo.
    `.trim();

    const report = await auditEngine.auditChapter(3, 'A Chegada da Corregedoria', capTexto);

    // O auditor deve aprovar e não acusar alucinação nem blocking
    expect(report.hasBlocking).toBe(false);
    expect(report.approved).toBe(true);
    expect(report.dimensionResults.character.conclusion).toBe('pass');
  });

  // --------------------------------------------------------------------------
  // TESTE 6: Objeto movido legitimamente por personagem que o transportou
  // --------------------------------------------------------------------------
  it('TESTE 6: deve reconhecer movimentação válida de objeto quando transportado legitimamente', async () => {
    // Objeto sobre a escrivaninha
    memoryStore.registerOrUpdateCharacter({
      name: 'Carlos',
      currentLocation: 'Escritório'
    });

    memoryStore.registerOrUpdateObject({
      name: 'diário de couro',
      currentLocation: 'sobre a escrivaninha',
      currentState: 'sobre a escrivaninha',
      lastManipulatedBy: 'Carlos'
    });

    // Movimentação legítima: Carlos pega o diário e o guarda na mochila
    memoryStore.recordObjectMovement(
      'diário de couro',
      2,
      'sobre a escrivaninha',
      'dentro da mochila de Carlos',
      'Carlos',
      'picked_up',
      'Carlos apanhou o diário de couro da escrivaninha e o guardou com cuidado dentro da mochila.'
    );

    // No capítulo 3, Carlos viaja e abre a mochila para ver o diário
    const cap3Texto = `
      No refúgio das montanhas, Carlos sentou-se perto da lareira.
      Abriu o zíper da mochila e retirou o diário de couro para reler as anotações do avô.
    `.trim();

    const report = await auditEngine.auditChapter(3, 'O Refúgio', cap3Texto);

    expect(report.hasBlocking).toBe(false);
    expect(report.approved).toBe(true);
    expect(report.dimensionResults.setting.conclusion).toBe('pass');
  });

  // --------------------------------------------------------------------------
  // TESTE 7: Reinício do servidor e recuperação idempotente sem duplicações
  // --------------------------------------------------------------------------
  it('TESTE 7: deve recuperar memória após reinício sem duplicar capítulos ou eventos', async () => {
    // Grava capítulo 1
    memoryStore.commitChapterMicroMemory(1, 'Capítulo 1: O Começo', {
      openingScene: 'A noite chuvosa cobria a cidade.',
      closingScene: 'Ele fechou a porta com tranca dupla.',
      endingLocation: 'Apartamento 402',
      charactersInvolved: ['Eduardo'],
      events: [
        {
          actor: 'Eduardo',
          action: 'trancou a porta',
          location: 'Apartamento 402',
          objectsAffected: [{ objectName: 'porta', newState: 'trancada com chave' }],
          resultingLocation: 'Apartamento 402',
          textSnippet: 'Eduardo girou a chave duas vezes na tranca.'
        }
      ]
    });
    await memoryStore.save();

    // Simula reinício: cria uma nova instância de NarrativeMemoryStore para o mesmo bookId
    const recoveredStore = new NarrativeMemoryStore('test_book_101');
    await recoveredStore.load('test_book_101');
    const recoveredMem = recoveredStore.getMemory();

    expect(recoveredMem.chapterMemories[1]).toBeDefined();
    expect(recoveredMem.chapterMemories[1].title).toBe('Capítulo 1: O Começo');
    expect(recoveredMem.chapterMemories[1].events.length).toBe(1);

    // Chamada idempotente repetida não deve duplicar o capítulo
    recoveredStore.commitChapterMicroMemory(1, 'Capítulo 1: O Começo', {
      openingScene: 'A noite chuvosa cobria a cidade.',
      closingScene: 'Ele fechou a porta com tranca dupla.',
      endingLocation: 'Apartamento 402',
      charactersInvolved: ['Eduardo'],
      events: [
        {
          actor: 'Eduardo',
          action: 'trancou a porta',
          location: 'Apartamento 402',
          objectsAffected: [{ objectName: 'porta', newState: 'trancada com chave' }],
          resultingLocation: 'Apartamento 402',
          textSnippet: 'Eduardo girou a chave duas vezes na tranca.'
        }
      ]
    });

    const finalSnapshot = recoveredStore.getMemory();
    expect(Object.keys(finalSnapshot.chapterMemories).length).toBe(1);
  });

  // --------------------------------------------------------------------------
  // TESTE 8: Autocorreção que introduz nova contradição é detectada na 2ª auditoria
  // --------------------------------------------------------------------------
  it('TESTE 8: deve detectar na segunda auditoria se a autocorreção introduzir uma nova contradição', async () => {
    // Cenário: João deixou a chave na mesa
    memoryStore.registerOrUpdateObject({
      name: 'chave dourada',
      currentLocation: 'sobre a mesa',
      currentState: 'sobre a mesa',
      lastManipulatedBy: 'João'
    });

    // E Dr. Roberto está morto
    memoryStore.registerOrUpdateCharacter({
      name: 'Roberto',
      currentLocation: 'Cemitério'
    });
    memoryStore.killCharacter('Roberto', 1, 'Roberto faleceu no cap 1');

    // Texto com contradição da chave
    const textoInicial = `
      João entrou na sala fria.
      Sem hesitar, tirou a chave dourada do bolso e abriu a gaveta.
    `.trim();

    const audit1 = await auditEngine.auditChapter(2, 'O Armário', textoInicial);
    expect(audit1.hasBlocking).toBe(true);

    // Mock / Simulação de autocorreção imperfeita que resolve a chave mas coloca o Dr. Roberto morto falando!
    const textoComNovaContradicao = `
      João entrou na sala fria.
      Caminhou até onde havia deixado e pegou as chave dourada sobre a mesa.
      De repente, Roberto disse que estava com fome e sorriu.
    `.trim();

    const audit2 = await auditEngine.auditChapter(2, 'O Armário', textoComNovaContradicao);

    // A segunda auditoria deve detectar que a contradição da chave foi corrigida, mas Roberto (morto) é novo bloqueio!
    expect(audit2.hasBlocking).toBe(true);
    const deadIssueInSecondAudit = audit2.issues.find(i => i.category === 'character' && i.description.includes('faleceu'));
    expect(deadIssueInSecondAudit).toBeDefined();
    expect(deadIssueInSecondAudit?.blocking).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TESTE 9: Auditoria Global da Obra Completa com Pontuação 0 a 100
  // --------------------------------------------------------------------------
  it('TESTE 9: deve auditar a obra completa e gerar relatório global com pontuação editorial de 0 a 100', async () => {
    // Registra personagens e fatos canônicos
    memoryStore.registerOrUpdateCharacter({
      name: 'Leonardo',
      currentLocation: 'Laboratório',
      goals: ['Descobrir a cura']
    });

    const chapters = [
      {
        titulo: 'Capítulo 1: O Início',
        texto: 'Leonardo chegou ao laboratório iluminado. Observou os tubos de ensaio e começou a anotar os resultados com serenidade.'
      },
      {
        titulo: 'Capítulo 2: A Pista',
        texto: 'No dia seguinte, Leonardo reuniu as anotações do laboratório e constatou que a fórmula estava quase pronta.'
      }
    ];

    const globalReport = await coordinator.auditFullBook(chapters);

    expect(globalReport).toBeDefined();
    expect(globalReport.score).toBeGreaterThanOrEqual(80);
    expect(globalReport.approvalStatus).toBe('APROVADO_PARA_KDP');
    expect(globalReport.totalChaptersAudited).toBe(2);
    expect(globalReport.criteriaScores.characterContinuity).toBeGreaterThan(0);
    expect(globalReport.criteriaScores.objectContinuity).toBeGreaterThan(0);
  });
});
