// Gerador de Casos, Personagens e Narrativas Investigativas Coerentes para Sudoku KDP
import { 
  SudokuBookConfig, 
  InvestigationCase, 
  Suspect, 
  Victim, 
  CrimeScene, 
  InvestigationClue, 
  SudokuPuzzle, 
  TimelineEvent,
  ClueType 
} from '../types/sudoku-investigative';
import { SudokuEngine } from './sudoku-engine';

export class InvestigativeStoryGenerator {
  private static FIRST_NAMES = [
    'Arthur', 'Helena', 'Vicente', 'Beatriz', 'Sebastião', 'Clarice', 'Rodrigo', 
    'Cecília', 'Eduardo', 'Valéria', 'Maurício', 'Elisa', 'Otávio', 'Lorena',
    'Gaspar', 'Camila', 'Felipe', 'Renata', 'Davi', 'Isadora', 'Guilherme'
  ];

  private static LAST_NAMES = [
    'Blackwood', 'Albuquerque', 'Valadares', 'Macedo', 'Vanderbilt', 'Castanheira',
    'Sterling', 'Fontenele', 'Moreira', 'Montenegro', 'Alencar', 'Silveira',
    'Dumont', 'Carvalho', 'Bragança', 'Noronha', 'Pestana', 'Gusmão'
  ];

  private static PROFESSIONS = [
    'Colecionador de Antiguidades', 'Médico Cirurgião', 'Herdeiro da Família',
    'Advogado Tributarista', 'Mordomo Chefe', 'Governanta', 'Professor Emérito',
    'Crítico de Arte', 'Curador do Museu', 'Empresário Marítimo', 'Jornalista Investigativo',
    'Arquiteto Renomado', 'Químico Industrial', 'Pianista Clássico', 'Contador Particular'
  ];

  private static WEAPONS = [
    'Taça de Cristal Envenenada', 'Adaga Antiga de Prata', 'Corda de Seda Trançada',
    'Castiçal de Bronze Maciço', 'Pistola com Silenciador Fictícia', 'Frasco de Cianeto Raro',
    'Abridor de Cartas de Marfim', 'Peso de Papel de Quartzo'
  ];

  /**
   * Gera um conjunto completo de casos conforme as configurações do livro
   */
  public static generateBookCases(config: SudokuBookConfig): InvestigationCase[] {
    const cases: InvestigationCase[] = [];

    for (let c = 1; c <= config.caseCount; c++) {
      cases.push(this.generateSingleCase(config, c));
    }

    return cases;
  }

  /**
   * Gera um caso criminal individualmente com consistência lógica estrita
   */
  public static generateCase(config: SudokuBookConfig, caseNumber: number): InvestigationCase {
    return this.generateSingleCase(config, caseNumber);
  }

  public static generateSingleCase(config: SudokuBookConfig, caseNumber: number): InvestigationCase {
    const caseId = `case_${caseNumber}_${Date.now()}`;
    const locationName = this.formatLocation(config.location, config.customLocation);
    const eraName = this.formatEra(config.timePeriod, config.customPeriod);

    // 1. Gera Vítima
    const victimName = `${this.getRandomItem(this.FIRST_NAMES)} ${this.getRandomItem(this.LAST_NAMES)}`;
    const victim: Victim = {
      nome: victimName,
      idade: 42 + (caseNumber * 3) % 35,
      profissao: this.getRandomItem(this.PROFESSIONS),
      personalidade: 'Figura influente, reservada e detentora de segredos financeiros e familiares cruciais.',
      historico: `Comandava negociações de alto risco em ${locationName}, acumulando rivalidades veladas.`,
      relacaoComSuspeitos: 'Conhecia todos os presentes intimamente, mantendo acordos confidenciais com cada um.'
    };

    // 2. Define Suspeitos e escolhe o culpado ANTES das pistas
    const suspectCount = config.suspectsPerCase;
    const culpritIndex = (caseNumber * 2 + 1) % suspectCount; // Determinístico e variado
    const weapon = this.getRandomItem(this.WEAPONS);
    const crimeHour = `${21 + (caseNumber % 3)}:${(caseNumber * 13) % 55 < 10 ? '0' : ''}${(caseNumber * 13) % 55}`;
    const crimeRoom = `Quarto ${100 + caseNumber * 4}`;

    const suspects: Suspect[] = [];
    const usedNames = new Set<string>([victimName]);

    for (let i = 0; i < suspectCount; i++) {
      let sName = `${this.getRandomItem(this.FIRST_NAMES)} ${this.getRandomItem(this.LAST_NAMES)}`;
      while (usedNames.has(sName)) {
        sName = `${this.getRandomItem(this.FIRST_NAMES)} ${this.getRandomItem(this.LAST_NAMES)}`;
      }
      usedNames.add(sName);

      const isCulprit = i === culpritIndex;
      suspects.push({
        id: `susp_${caseNumber}_${i + 1}`,
        numero: i + 1,
        nome: sName,
        idade: 25 + ((i * 7 + caseNumber * 5) % 45),
        profissao: this.getRandomItem(this.PROFESSIONS),
        relacionamento: isCulprit ? 'Sócio próximo com interesses em herança/documentos' : 'Conhecido ou funcionário de confiança',
        possivelMotivo: isCulprit 
          ? `Descobriu que a vítima iria deserdá-lo e revelar fraudes contábeis às ${crimeHour}.`
          : 'Divergência contratual antiga, resolvida recentemente.',
        alibi: isCulprit 
          ? `Afirma que esteve na biblioteca lendo até tarde, sem testemunhas diretas.`
          : `Estava no salão de jantar na presença de outras testemunhas.`,
        comportamento: isCulprit ? 'Extremamente cooperativo, mas tenso ao ser questionado sobre horários.' : 'Calmo e colaborativo.',
        segredo: isCulprit ? `Possuía uma cópia oculta da chave de ${crimeRoom}.` : 'Tentava ocultar uma dívida menor de jogo.',
        evidenciasRelacionadas: isCulprit ? `Fibras de tecido idênticas ao seu casaco encontradas na janela de ${crimeRoom}.` : 'Nenhum resíduo físico no local.',
        infoVerdadeira: `Esteve no corredor principal mais cedo para conversar sobre negócios.`,
        infoFalsa: isCulprit ? `Nega veementemente ter subido ao segundo andar após as 21h.` : `Disse que não ouviu barulho algum.`,
        isCulprit
      });
    }

    const culprit = suspects[culpritIndex];

    // 3. Cena do Crime
    const crimeScene: CrimeScene = {
      horaEncontrado: crimeHour,
      localDetalhado: `${crimeRoom} em ${locationName}`,
      descricao: `O corpo de ${victim.nome} foi encontrado em ${crimeRoom}, caído próximo à lareira acesa. Havia sinais de ${weapon.toLowerCase()} sobre a escrivaninha de mogno. Uma janela lateral estava destrancada, e um relógio de bolso antigo parou exatamente às ${crimeHour}.`,
      pistasVisiveis: [
        `Frasco com vestígios químicos ao lado da poltrona`,
        `Papel rasgado com anotações de coordenadas numéricas`,
        `Pegadas tênues de calçado elegante em direção à sacada`
      ]
    };

    // 4. Linha do Tempo do Caso
    const timeline: TimelineEvent[] = [
      { time: '19:30', event: `${victim.nome} foi visto jantando tranquilamente com os convidados.`, verified: true },
      { time: '20:45', event: `Discussão abafada ouvida próxima ao escritório de ${locationName}.`, suspectInvolved: culprit.nome, verified: true },
      { time: crimeHour, event: `Momento exato da execução do crime com ${weapon.toLowerCase()}.`, suspectInvolved: culprit.nome, verified: false },
      { time: '23:50', event: `O corpo é descoberto pelo serviço de quarto e o alarme é acionado.`, verified: true }
    ];

    // 5. Pistas reveladas pelos Sudokus
    const clues: InvestigationClue[] = [];
    const puzzleCount = config.sudokusPerCase;

    const clueTemplates: { type: ClueType; text: string; context: string; points: string }[] = [
      {
        type: 'local',
        text: crimeRoom.toUpperCase(),
        context: `A resolução do enigma revela o cômodo exato onde as evidências foram escondidas.`,
        points: `Indica que o autor do crime teve acesso irrestrito ao ${crimeRoom}.`
      },
      {
        type: 'horario',
        text: crimeHour,
        context: `O enigma decodifica o horário exato em que a janela foi aberta.`,
        points: `Derruba o álibi do suspeito #${culprit.numero} (${culprit.nome}), que jurou estar longe nesse horário.`
      },
      {
        type: 'arma',
        text: weapon.toUpperCase(),
        context: `A posição chave da grade aponta para o artefato utilizado no crime.`,
        points: `O objeto possui as digitais do suspeito #${culprit.numero}.`
      },
      {
        type: 'suspeito',
        text: `SUSPEITO #${culprit.numero}`,
        context: `A combinação numérica interceptada aponta diretamente para o código do suspeito #${culprit.numero}.`,
        points: `Confirma que o suspeito #${culprit.numero} (${culprit.nome}) cometeu a infração.`
      },
      {
        type: 'objeto',
        text: 'CHAVE MESTRA COPIADA',
        context: `A grade do Sudoku revela o paradeiro da chave mestra duplicada.`,
        points: `A chave mestra estava escondida no casaco de ${culprit.nome}.`
      },
      {
        type: 'veiculo',
        text: 'CARRO PRETO NA GARAGEM',
        context: `Identifica o veículo de fuga que aguardava na saída sul.`,
        points: `O veículo está registrado em nome de ${culprit.nome}.`
      },
      {
        type: 'codigo',
        text: `COFRE #${10 + caseNumber * 7}`,
        context: `A sequência revela a senha do cofre de documentos da vítima.`,
        points: `Dentro do cofre estava o testamento original que ${culprit.nome} pretendia queimar.`
      }
    ];

    for (let p = 0; p < puzzleCount; p++) {
      const template = clueTemplates[p % clueTemplates.length];
      clues.push({
        id: `clue_${caseNumber}_${p + 1}`,
        clueNumber: p + 1,
        clueType: template.type,
        revelationText: template.text,
        contextDescription: template.context,
        pointsToCulpritReason: template.points,
        revealedBySudokuId: `sudoku_${caseNumber}_${p + 1}`
      });
    }

    // 6. Geração dos Sudokus matemáticos e amarração com as pistas
    const puzzles: SudokuPuzzle[] = [];
    for (let p = 0; p < puzzleCount; p++) {
      // Dificuldade do Sudoku: se progressivo, escala com o índice
      let diff: 'facil' | 'medio' | 'dificil' | 'expert' = 'medio';
      if (config.difficulty === 'progressivo') {
        const ratio = p / Math.max(1, puzzleCount - 1);
        if (ratio < 0.3) diff = 'facil';
        else if (ratio < 0.7) diff = 'medio';
        else if (ratio < 0.9) diff = 'dificil';
        else diff = 'expert';
      } else {
        diff = config.difficulty as any;
      }

      const generated = SudokuEngine.generatePuzzle(diff);
      const targetR = 4;
      const targetC = 4;
      const targetDigit = generated.solution[targetR][targetC];

      puzzles.push({
        id: `sudoku_${caseNumber}_${p + 1}`,
        caseNumber,
        puzzleIndex: p + 1,
        difficulty: diff,
        grid: generated.puzzle,
        solution: generated.solution,
        clueCell: { row: targetR, col: targetC, targetDigit },
        associatedClue: clues[p],
        instructions: `Resolva a grade e anote o número da célula central destacada (Linha 5, Coluna 5). O dígito encontrado desbloqueia a Pista #${p + 1} no Quadro de Investigação.`
      });
    }

    // 7. Solução Final do Caso
    const caseSolution = {
      culprit,
      motiveExplanation: culprit.possivelMotivo,
      howCrimeHappened: `Na noite do crime em ${locationName}, às ${crimeHour}, ${culprit.nome} utilizou a chave copiada para entrar em ${crimeRoom}. Sabendo que a vítima planejava denunciar fraudes, utilizou ${weapon.toLowerCase()} para silenciá-la, fugindo pela janela e deixando fibras no parapeito.`,
      location: `${crimeRoom} em ${locationName}`,
      time: crimeHour,
      mainEvidences: [
        `Fibras do casaco de ${culprit.nome} no parapeito da janela`,
        `Cópia clandestina da chave de ${crimeRoom}`,
        `Horário de saída desmentido pela pista ${crimeHour}`
      ],
      howCluesLedToSolution: clues.map(c => `• Pista #${c.clueNumber} (${c.revelationText}): ${c.pointsToCulpritReason}`)
    };

    return {
      id: caseId,
      caseNumber,
      title: `Caso #${caseNumber.toString().padStart(3, '0')} — O Mistério de ${locationName}`,
      storyIntroduction: `Na época ${eraName}, um clima de inquietação tomou conta de ${locationName}. A morte repentina de ${victim.nome}, ${victim.profissao.toLowerCase()}, desencadeou uma investigação repleta de depoimentos contraditórios e pistas ocultas. Como detetive encarregado, sua missão é resolver os Sudokus do caso para revelar as pistas e desmascarar o verdadeiro culpado.`,
      victim,
      crimeScene,
      investigatorContext: `Você assume o papel do Detetive Inspetor encarregado da divisão de homicídios. Todos os suspeitos foram retidos no local até o encerramento do inquérito.`,
      suspects,
      initialEvidences: [
        `Um telegrama cifrado recebido horas antes do ocorrido`,
        `Frasco com substância suspeita examinado pelo legista`,
        `Relógio parado que marca o exato instante do crime`
      ],
      timeline,
      puzzles,
      clues,
      finalAccusationDeduction: `Com base nas pistas extraídas dos Sudokus, preencha o Quadro de Investigação, elimine os suspeitos com álibis comprovados e aponte o assassino antes de conferir o gabarito no final do livro.`,
      caseSolution
    };
  }

  private static formatLocation(loc: string, custom?: string): string {
    if (custom && custom.trim().length > 0) return custom.trim();
    switch (loc) {
      case 'mansao': return 'Mansão Blackwood';
      case 'hotel': return 'Grand Hotel Imperial';
      case 'trem': return 'Expresso Transcontinental';
      case 'navio': return 'Transatlântico Poseidon';
      case 'museu': return 'Museu de Belas Artes';
      case 'restaurante': return 'Restaurante Le Petit';
      case 'fazenda': return 'Fazenda Bela Vista';
      case 'escritorio': return 'Edifício Corporate Tower';
      case 'universidade': return 'Universidade de Oxford';
      case 'cidade_pequena': return 'Vila das Colinas';
      case 'cidade_grande': return 'Metrópole Central';
      case 'ilha': return 'Ilha da Névoa';
      default: return 'Mansão Blackwood';
    }
  }

  private static formatEra(era: string, custom?: string): string {
    if (custom && custom.trim().length > 0) return custom.trim();
    switch (era) {
      case 'vitoriana': return 'Era Vitoriana (Fim do Século XIX)';
      case 'anos1950': return 'Anos 1950 (Pós-Guerra Clássico)';
      case 'anos1980': return 'Anos 1980';
      case 'anos1990': return 'Anos 1990';
      case 'anos2000': return 'Anos 2000';
      case 'anos2020': return 'Anos 2020';
      case 'futurista': return 'Era Futurista Cyber-Noir';
      default: return 'Atualidade';
    }
  }

  private static getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
