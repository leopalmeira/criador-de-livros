// ============================================================================
// BOOKENGIN — MOTOR DE ESCRITA SEQUENCIAL E MEMÓRIA EDITORIAL GLOBAL
// Sistema para escrita sequencial contínua, Bíblia Editorial persistente,
// controle de arco narrativo (STORY_ARC_CONTROLLER), memória do último capítulo
// (LAST_CHAPTER_STATE) e auditoria de continuidade local antes de salvar.
// ============================================================================

import { isIncompleteTitle, normalizeChapterHeading } from './chapter-structure';

export interface TrackedNarrativeElement {
  id: string;
  type: 'event' | 'secondary_character' | 'object' | 'conflict';
  name: string;
  description: string;
  introducedInChapter: number;
  resolvedInChapter?: number;
  status: 'pending' | 'resolved';
}

export interface CharacterMemory {
  id: string;
  name: string;
  fullName: string;
  aliases: string[];
  age?: number | string;
  physicalAppearance: string;
  personality: string;
  profession: string;
  background: string;
  familyRelations: string;
  relationships: Record<string, string>; // { [charId or name]: relação }
  goals: string[];
  fears: string[];
  motivations: string[];
  secrets: string[];
  knownInfo: string[];
  unknownInfo: string[];
  currentLocation: string;
  physicalState: string;
  emotionalState: string;
  narrativeStatus: 'active' | 'dead' | 'absent' | 'resolved';
  lastAppearedChapter: number;
  associatedChapters: number[];
}

export interface LocationMemory {
  id: string;
  name: string;
  country: string;
  state: string;
  city: string;
  neighborhood?: string;
  address?: string;
  propertyType?: string; // e.g. 'apartamento', 'mansão', 'hospital'
  floor?: string | number; // e.g. '4º andar', 4
  spatialLayout?: string;
  importantObjects?: string[];
  modifications?: string[];
  associatedChapters: number[];
}

export interface TimelineEvent {
  id: string;
  chapterNumber: number;
  date?: string;
  timeOfDay?: string;
  duration?: string;
  summary: string;
  causalOrder: number;
  isFlashback?: boolean;
}

export interface PlotThread {
  id: string;
  name: string;
  type: 'main_arc' | 'subplot' | 'mystery' | 'romance' | 'clue';
  status: 'open' | 'developing' | 'false_resolution' | 'climax' | 'resolved';
  plannedResolutionChapter: number;
  introducedChapter: number;
  currentTensionLevel: number; // 1 a 10
}

export interface CanonicalFact {
  id: string;
  category: 'character' | 'location' | 'event' | 'rule' | 'nonfiction';
  fact: string;
  establishedInChapter: number;
  immutable: boolean;
  relatedEntityId?: string;
}

export interface NonFictionMemory {
  centralThesis: string;
  coreConcepts: { term: string; definition: string }[];
  citedData: string[];
  references: string[];
  terminologyGlossary: Record<string, string>;
}

export interface BookGlobalMemory {
  bookId: string;
  version: number;
  updatedAt: string;
  identity: {
    title: string;
    subtitle: string;
    author: string;
    language: string;
    genre: string;
    subgenre?: string;
    targetAudience: string;
    ageRating?: string;
    narrativeTone: string;
    literaryStyle: string;
    plannedChapters: number;
    centralPremise: string;
    mainTheme: string;
    readerPromise: string;
  };
  characters: CharacterMemory[];
  locations: LocationMemory[];
  timeline: TimelineEvent[];
  plotThreads: PlotThread[];
  canonicalFacts: CanonicalFact[];
  trackedElements?: TrackedNarrativeElement[];
  nonFictionData?: NonFictionMemory;
}

export interface LastChapterState {
  chapterNumber: number;
  title: string;
  factualSummary: string;
  openingScene: string;
  closingScene: string;
  endingLocation: {
    locationId?: string;
    name: string;
    city?: string;
    floor?: string | number;
    room?: string;
    description: string;
  };
  dateTime: {
    date?: string;
    timeOfDay?: string;
    elapsedSinceStart?: string;
  };
  charactersPresent: string[];
  characterStates: {
    characterId?: string;
    name: string;
    physicalState: string;
    emotionalState: string;
    lastAction: string;
    lastSpokenPhrase?: string;
    inventory: string[];
  }[];
  revealedInformation: string[];
  hiddenSecrets: string[];
  ongoingConflicts: string[];
  pendingConsequences: string[];
  cliffhangerHook: string;
  nextPlannedEvent: string;
}

export type ContinuityIssueCategory =
  | 'location_inconsistency'
  | 'floor_mismatch'
  | 'name_mutation'
  | 'teleportation'
  | 'chronology'
  | 'premature_ending'
  | 'secret_leak'
  | 'missing_object'
  | 'dialogue_contradiction'
  | 'meta_reference'
  | 'incomplete_title'
  | 'unpunctuated_dialogue'
  | 'unresolved_element'
  | 'repetitive_opening_or_hook';

export interface ContinuityAuditIssue {
  id: string;
  chapterNumber: number;
  severity: 'critical' | 'error' | 'warning' | 'info';
  category: ContinuityIssueCategory;
  description: string;
  originalExcerpt: string;
  suggestedFix: string;
  canonicalReference?: string;
  autoFixApplied?: boolean;
}

export interface LocalContinuityAuditResult {
  isValid: boolean;
  score: number; // 0 a 100
  issues: ContinuityAuditIssue[];
  fixedText?: string;
  fixedTitle?: string;
}

// ============================================================================
// STORY_ARC_CONTROLLER: Controle de Enredo Global e Planejamento do Final
// ============================================================================
export class StoryArcController {
  /**
   * Avalia a posição do capítulo no arco global e retorna as diretrizes
   * narrativas e restrições editoriais inegociáveis.
   */
  static getArcStage(chapterNumber: number, totalChapters: number): {
    stage: 'apresentacao' | 'desenvolvimento' | 'ponto_virada' | 'falsa_resolucao' | 'climax' | 'desfecho';
    label: string;
    directive: string;
    allowDefinitiveResolution: boolean;
    tensionTarget: number; // 1 a 10
  } {
    const total = Math.max(1, totalChapters);
    const ratio = chapterNumber / total;

    if (chapterNumber === 1) {
      return {
        stage: 'apresentacao',
        label: 'Ato I: Apresentação & Incidente Incitante',
        directive: 'Apresentar personagens canônicos, ambiente, tom e o conflito inicial. Não resolver nada do conflito central.',
        allowDefinitiveResolution: false,
        tensionTarget: 4
      };
    }

    if (chapterNumber === total) {
      return {
        stage: 'desfecho',
        label: 'Ato III: Desfecho & Resolução Plena',
        directive: 'Resolver todos os arcos principais e subtramas. Entregar o desfecho plenamente satisfatório e definitivo prometido ao leitor.',
        allowDefinitiveResolution: true,
        tensionTarget: 5
      };
    }

    if (chapterNumber === total - 1 && total > 2) {
      return {
        stage: 'climax',
        label: 'Ato III: Clímax & Ponto Crítico',
        directive: 'Confrontação máxima entre as forças em conflito. Tensão no ápice absoluto. Preparar o desfecho final sem encerrar o livro antes da hora.',
        allowDefinitiveResolution: false,
        tensionTarget: 10
      };
    }

    if (ratio >= 0.45 && ratio <= 0.65) {
      return {
        stage: 'falsa_resolucao',
        label: 'Ato II-B: Midpoint / Falsa Vitória ou Reviravolta',
        directive: 'Acontece uma virada importante ou uma falsa vitória que se complica em seguida. Distinguir claramente entre resolução temporária e final.',
        allowDefinitiveResolution: false,
        tensionTarget: 8
      };
    }

    if (ratio > 0.65) {
      return {
        stage: 'ponto_virada',
        label: `Ato II-C: Convergência Rumo ao Clímax (Cap. ${chapterNumber}/${total})`,
        directive: 'Acelerar a convergência de todas as subtramas e segredos. Aumentar a urgência.',
        allowDefinitiveResolution: false,
        tensionTarget: 8.5
      };
    }

    return {
      stage: 'desenvolvimento',
      label: `Ato II-A: Desenvolvimento & Progressão (Cap. ${chapterNumber}/${total})`,
      directive: 'Aprofundar os conflitos, explorar consequências dos capítulos anteriores e semear pistas sem revelar o segredo final antecipadamente.',
      allowDefinitiveResolution: false,
      tensionTarget: 6
    };
  }

  /**
   * Verifica se o capítulo tenta encerrar prematuramente o conflito central.
   */
  static checkPrematureEnding(
    chapterText: string,
    chapterNumber: number,
    totalChapters: number
  ): ContinuityAuditIssue | null {
    if (chapterNumber >= totalChapters) {
      return null; // No capítulo final, encerramento é permitido e esperado
    }

    // Padrões de encerramento definitivo prematuro
    const prematurePatterns = [
      /viveram felizes para sempre/i,
      /tudo foi (finalmente|definitivamente) resolvido/i,
      /o mist[eé]rio estava (totalmente|completamente) desvendado e conclu[ií]do/i,
      /a paz reinou para sempre/i,
      /todos os problemas haviam terminado de vez/i,
      /assim terminava a hist[oó]ria de vez/i,
      /o mal foi erradicado para sempre/i
    ];

    for (const pat of prematurePatterns) {
      const match = chapterText.match(pat);
      if (match) {
        return {
          id: `premature_${chapterNumber}_${Date.now()}`,
          chapterNumber,
          severity: 'critical',
          category: 'premature_ending',
          description: `O capítulo ${chapterNumber} tenta encerrar prematuramente o conflito da obra com expressões de encerramento definitivo ("${match[0]}"). O livro possui ${totalChapters} capítulos planejados.`,
          originalExcerpt: match[0],
          suggestedFix: 'Substituir a resolução definitiva por uma vitória parcial, falsa resolução ou gancho de tensão que mantenha o conflito ativo até o clímax.',
          autoFixApplied: false
        };
      }
    }

    return null;
  }
}

// ============================================================================
// BOOK_SEQUENTIAL_WRITING_ENGINE: Motor Sequencial Central
// ============================================================================
export class BookSequentialWritingEngine {
  /**
   * Inicializa ou carrega a Bíblia Editorial Global (BOOK_GLOBAL_MEMORY)
   * a partir do projeto existente.
   */
  static initGlobalMemory(params: {
    bookId: string;
    title: string;
    subtitle?: string;
    author: string;
    language?: string;
    genre: string;
    subgenre?: string;
    targetAudience?: string;
    narrativeTone?: string;
    literaryStyle?: string;
    plannedChapters: number;
    centralPremise: string;
    mainTheme?: string;
    readerPromise?: string;
    existingCharacters?: CharacterMemory[];
    existingLocations?: LocationMemory[];
    existingFacts?: CanonicalFact[];
  }): BookGlobalMemory {
    const memory: BookGlobalMemory = {
      bookId: params.bookId,
      version: 1,
      updatedAt: new Date().toISOString(),
      identity: {
        title: params.title,
        subtitle: params.subtitle || '',
        author: params.author,
        language: params.language || 'Português',
        genre: params.genre,
        subgenre: params.subgenre || '',
        targetAudience: params.targetAudience || 'Público Geral',
        narrativeTone: params.narrativeTone || 'Equilibrado e envolvente',
        literaryStyle: params.literaryStyle || 'Contemporâneo acessível',
        plannedChapters: Math.max(1, params.plannedChapters),
        centralPremise: params.centralPremise,
        mainTheme: params.mainTheme || params.genre,
        readerPromise: params.readerPromise || 'Uma narrativa imersiva com começo, meio e fim perfeitamente amarrados.'
      },
      characters: params.existingCharacters || [],
      locations: params.existingLocations || [],
      timeline: [],
      plotThreads: [
        {
          id: 'main_arc_01',
          name: `Conflito Central: ${params.title}`,
          type: 'main_arc',
          status: 'open',
          plannedResolutionChapter: params.plannedChapters,
          introducedChapter: 1,
          currentTensionLevel: 4
        }
      ],
      canonicalFacts: params.existingFacts || [],
      trackedElements: []
    };

    return memory;
  }

  /**
   * Registra um evento, personagem secundário, objeto/pista ou conflito pendente na memória global,
   * identificando onde foi introduzido e acompanhando até sua resolução.
   */
  static registerTrackedElement(
    memory: BookGlobalMemory,
    element: {
      type: 'event' | 'secondary_character' | 'object' | 'conflict';
      name: string;
      description: string;
      introducedInChapter: number;
    }
  ): TrackedNarrativeElement {
    if (!memory.trackedElements) memory.trackedElements = [];
    const existing = memory.trackedElements.find(
      e => e.name.toLowerCase() === element.name.trim().toLowerCase() && e.type === element.type
    );
    if (existing) return existing;

    const item: TrackedNarrativeElement = {
      id: `trk_${element.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: element.type,
      name: element.name.trim(),
      description: element.description.trim(),
      introducedInChapter: element.introducedInChapter,
      status: 'pending'
    };
    memory.trackedElements.push(item);
    memory.version += 1;
    memory.updatedAt = new Date().toISOString();
    return item;
  }

  /**
   * Marca um elemento rastreado (evento, personagem secundário, objeto ou conflito) como resolvido.
   */
  static resolveTrackedElement(
    memory: BookGlobalMemory,
    idOrName: string,
    resolvedInChapter: number
  ): boolean {
    if (!memory.trackedElements) return false;
    const target = memory.trackedElements.find(
      e => e.id === idOrName || e.name.toLowerCase() === idOrName.trim().toLowerCase()
    );
    if (!target) return false;
    target.status = 'resolved';
    target.resolvedInChapter = resolvedInChapter;
    memory.version += 1;
    memory.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Retorna todos os elementos narrativos pendentes (eventos, personagens secundários, objetos, conflitos).
   */
  static getPendingElements(memory: BookGlobalMemory): TrackedNarrativeElement[] {
    return (memory.trackedElements || []).filter(e => e.status === 'pending');
  }

  /**
   * Registra um fato canônico imutável na memória global.
   */
  static addCanonicalFact(
    memory: BookGlobalMemory,
    fact: {
      category: 'character' | 'location' | 'event' | 'rule' | 'nonfiction';
      fact: string;
      chapterNumber: number;
      immutable?: boolean;
      relatedEntityId?: string;
    }
  ): CanonicalFact {
    const canonical: CanonicalFact = {
      id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category: fact.category,
      fact: fact.fact.trim(),
      establishedInChapter: fact.chapterNumber,
      immutable: fact.immutable !== false,
      relatedEntityId: fact.relatedEntityId
    };

    // Evita duplicatas idênticas
    const exists = memory.canonicalFacts.some(
      f => f.fact.toLowerCase() === canonical.fact.toLowerCase()
    );
    if (!exists) {
      memory.canonicalFacts.push(canonical);
      memory.version += 1;
      memory.updatedAt = new Date().toISOString();
    }
    return canonical;
  }

  /**
   * Constrói o contexto ultra-completo para o prompt do próximo capítulo,
   * garantindo que a IA receba a Bíblia Editorial, LAST_CHAPTER_STATE,
   * restrições narrativas e fatos canônicos que NÃO podem ser contraditos.
   */
  static buildChapterPromptContext(params: {
    memory: BookGlobalMemory;
    lastChapterState: LastChapterState | null;
    chapterNumber: number;
    totalChapters: number;
    outlineDirective?: {
      title?: string;
      objective?: string;
      keyPoints?: string[];
      transition?: string;
    };
    previousChapters?: Array<{ titulo: string; texto: string }>;
  }): {
    systemContext: string;
    userContext: string;
    arcDirective: string;
  } {
    const { memory, lastChapterState, chapterNumber, totalChapters, outlineDirective, previousChapters } = params;
    const arcInfo = StoryArcController.getArcStage(chapterNumber, totalChapters);

    // 1. Resumo dos Fatos Canônicos
    const canonicalFactsText = memory.canonicalFacts.length > 0
      ? memory.canonicalFacts.map((f, i) => `${i + 1}. [${f.category.toUpperCase()}] ${f.fact}`).join('\n')
      : 'Nenhum fato canônico cadastrado previamente.';

    // 2. Personagens Canônicos Ativos
    const charactersText = memory.characters.length > 0
      ? memory.characters.map(c => `• ${c.name} (${c.fullName || c.name}) - ${c.profession || 'Papel principal'}. Local atual: ${c.currentLocation || 'Desconhecido'}. Estado: ${c.physicalState || 'Normal'}, ${c.emotionalState || 'Estável'}. Conhece: [${(c.knownInfo || []).join(', ') || 'Informações padrão'}]. Segredos: [${(c.secrets || []).join(', ') || 'Nenhum'}].`).join('\n')
      : 'Personagens serão consolidados a partir da narrativa.';

    // 3. Locais Canônicos
    const locationsText = memory.locations.length > 0
      ? memory.locations.map(l => `• ${l.name}: ${l.city}, ${l.state}, ${l.country}${l.floor ? ` (${l.floor})` : ''}${l.address ? ` - Endereço: ${l.address}` : ''}`).join('\n')
      : 'Locais canônicos serão registrados conforme introduzidos.';

    // 4. Continuidade do Capítulo Anterior (LAST_CHAPTER_STATE)
    let continuitySection = 'Este é o primeiro capítulo da obra. Estabeleça a ambientação canônica e o tom editorial.';
    if (lastChapterState) {
      continuitySection = `━━━ MEMÓRIA DO CAPÍTULO ANTERIOR (Capítulo ${lastChapterState.chapterNumber}: "${lastChapterState.title}") ━━━
• Resumo factual: ${lastChapterState.factualSummary}
• Cena final exata: ${lastChapterState.closingScene}
• Local onde terminou: ${lastChapterState.endingLocation.name} (${lastChapterState.endingLocation.floor || 'Mesmo andar/cômodo'}, ${lastChapterState.endingLocation.city || ''})
• Personagens presentes: ${lastChapterState.charactersPresent.join(', ')}
• Gancho imediato (cliffhanger): "${lastChapterState.cliffhangerHook}"
• Conflitos e consequências ativas: ${lastChapterState.ongoingConflicts.join('; ') || 'Nenhum conflito isolado'}
• Próximo acontecimento planejado: ${lastChapterState.nextPlannedEvent || 'Continuidade orgânica direta'}`;
    }

    // 5. Histórico resumido de capítulos anteriores
    let priorHistory = '';
    if (previousChapters && previousChapters.length > 0) {
      priorHistory = previousChapters.map((c, idx) => {
        const preview = c.texto.slice(0, 160).replace(/\n/g, ' ');
        return `• Cap. ${idx + 1} ("${c.titulo}"): ${preview}...`;
      }).join('\n');
    }

    // 6. Elementos Pendentes Rastreados (Eventos, Personagens Secundários, Objetos e Conflitos)
    const pendingElements = BookSequentialWritingEngine.getPendingElements(memory);
    const pendingElementsText = pendingElements.length > 0
      ? pendingElements.map(e => `• [${e.type.toUpperCase()}] "${e.name}" (Introduzido no Cap. ${e.introducedInChapter}): ${e.description}`).join('\n')
      : 'Nenhum elemento pendente sem acompanhamento no momento.';

    // 7. Diretiva do Arco
    const arcDirective = `ESTÁGIO NARRATIVO: ${arcInfo.label} (Tensão Alvo: ${arcInfo.tensionTarget}/10)
DIRETRIZ DE ARCO: ${arcInfo.directive}
${arcInfo.allowDefinitiveResolution
  ? 'ATENÇÃO: Este é o encerramento final do livro. Você DEVE solucionar os mistérios centrais, resolver todos os elementos pendentes e cumprir todas as promessas da obra.'
  : 'PROIBIÇÃO ABSOLUTA: NÃO resolva definitivamente o conflito principal neste capítulo. Mantenha os arcos abertos e a tensão narrativa crescente.'}`;

    const antiErrorPromptRules = `━━━ REGRAS DE OURO DE ESCRITA E CONTINUIDADE (OBRIGATÓRIO) ━━━
1. TÍTULOS COMPLETOS E SEM NUMERAÇÃO DUPLICADA: Nunca termine títulos de capítulos com conectivos ou preposições sem complemento ("de", "da", "do", "que", "com", "para", "of", "with", "to"). Nunca duplique a numeração no título (proibido "Capítulo 1: Capítulo 1").
2. PROIBIDO REFERÊNCIAS ARTIFICIAIS: Nunca use frases meta-narrativas como "no capítulo anterior", "como vimos no capítulo passado" ou "in the previous chapter" dentro de narrativas ficcionais.
3. VARIEDADE NARRATIVA: Evite repetição excessiva de descrições, aberturas de capítulos e ganchos finais idênticos aos capítulos anteriores.
4. PRESERVAÇÃO DE ELEMENTOS: Não abandone personagens secundários, objetos importantes, pistas ou conflitos pendentes sem resolução.
5. COERÊNCIA TEMPORAL E ESPACIAL: Não mude de local, horário ou tempo verbal sem transição clara e justificada.
6. PONTUAÇÃO DE DIÁLOGOS: Todos os diálogos devem ter travessão ou aspas padronizadas e pontuação final adequada.`;

    const systemContext = `BÍBLIA EDITORIAL GLOBAL DO LIVRO (BOOK_GLOBAL_MEMORY):
Título: "${memory.identity.title}" | Subtítulo: "${memory.identity.subtitle}"
Autor: ${memory.identity.author} | Idioma: ${memory.identity.language}
Gênero: ${memory.identity.genre} | Público-alvo: ${memory.identity.targetAudience}
Tom: ${memory.identity.narrativeTone} | Estilo: ${memory.identity.literaryStyle}

FATOS CANÔNICOS INEGOCIÁVEIS (NUNCA CONTRADIZER):
${canonicalFactsText}

PERSONAGENS CANÔNICOS:
${charactersText}

LOCAIS CANÔNICOS:
${locationsText}

ELEMENTOS PENDENTES (EVENTOS, PERSONAGENS SECUNDÁRIOS, OBJETOS E CONFLITOS):
${pendingElementsText}

${antiErrorPromptRules}`;

    const userContext = `━━━ DIRETRIZES DO CAPÍTULO ${chapterNumber} DE ${totalChapters} ━━━
Título Planejado: ${outlineDirective?.title || `Capítulo ${chapterNumber}`}
Objetivo Narrativo: ${outlineDirective?.objective || 'Desenvolver a progressão e aprofundar conflitos.'}
Pontos-Chave: ${(outlineDirective?.keyPoints || []).map(p => `- ${p}`).join('\n') || '- Manter coerência e progressão direta'}
Transição Planejada: ${outlineDirective?.transition || 'Conectar com o próximo capítulo.'}

${arcDirective}

${continuitySection}

${priorHistory ? `━━━ HISTÓRICO DE CAPÍTULOS ANTERIORES ━━━\n${priorHistory}` : ''}`;

    return { systemContext, userContext, arcDirective };
  }

  /**
   * Executa a Auditoria Local de Continuidade ANTES de salvar o capítulo.
   * Verifica nomes, localizações, andares, teletransporte, cronologia e encerramento prematuro.
   */
  static validateChapterContinuity(params: {
    chapterText: string;
    chapterTitle: string;
    chapterNumber: number;
    totalChapters: number;
    memory: BookGlobalMemory;
    lastChapterState: LastChapterState | null;
  }): LocalContinuityAuditResult {
    const { chapterText, chapterNumber, totalChapters, memory, lastChapterState } = params;
    const issues: ContinuityAuditIssue[] = [];

    // 1. Verificação de Encerramento Prematuro (STORY_ARC_CONTROLLER)
    const prematureIssue = StoryArcController.checkPrematureEnding(chapterText, chapterNumber, totalChapters);
    if (prematureIssue) {
      issues.push(prematureIssue);
    }

    // 2. Verificação de Andar / Localização Específica (TESTE 1: 4º andar vs 8º andar)
    for (const loc of memory.locations) {
      if (loc.floor) {
        const canonicalFloorStr = String(loc.floor).toLowerCase();
        // Detecta menções a andares contraditórios no texto (ex: se canônico é 4º andar, detecta 8º andar)
        const floorRegex = /(?:quarto|quinto|sexto|s[eé]timo|oitavo|nono|d[eé]cimo|1[ºoªa]|2[ºoªa]|3[ºoªa]|4[ºoªa]|5[ºoªa]|6[ºoªa]|7[ºoªa]|8[ºoªa]|9[ºoªa]|10[ºoªa])\s+andar/gi;
        const matches = chapterText.match(floorRegex);
        if (matches) {
          for (const match of matches) {
            const mentionedFloor = match.toLowerCase();
            const isMatchCanonical =
              (canonicalFloorStr.includes('4') && (mentionedFloor.includes('4') || mentionedFloor.includes('quarto'))) ||
              (canonicalFloorStr.includes('8') && (mentionedFloor.includes('8') || mentionedFloor.includes('oitavo'))) ||
              mentionedFloor === canonicalFloorStr;

            if (!isMatchCanonical) {
              issues.push({
                id: `floor_mismatch_${chapterNumber}_${Date.now()}`,
                chapterNumber,
                severity: 'critical',
                category: 'floor_mismatch',
                description: `Inconsistência de localização em "${loc.name}": O fato canônico estabelece que o local fica no ${loc.floor}, mas o capítulo menciona "${match}" sem justificativa de mudança de imóvel.`,
                originalExcerpt: match,
                suggestedFix: `${loc.floor}`,
                canonicalReference: `Local ${loc.name} fica no ${loc.floor}`,
                autoFixApplied: false
              });
            }
          }
        }
      }
    }

    // Também verifica fatos canônicos de andar genéricos
    for (const fact of memory.canonicalFacts) {
      if (fact.category === 'location' && /andar/i.test(fact.fact)) {
        const numMatch = fact.fact.match(/(quarto|4[ºoªa]|oitavo|8[ºoªa])/i);
        if (numMatch) {
          const canonicalTerm = numMatch[1].toLowerCase();
          const isQuarto = canonicalTerm.includes('4') || canonicalTerm.includes('quarto');
          const isOitavo = canonicalTerm.includes('8') || canonicalTerm.includes('oitavo');

          if (isQuarto && /(oitavo|8[ºoªa])\s+andar/i.test(chapterText)) {
            const found = chapterText.match(/(oitavo|8[ºoªa])\s+andar/i)![0];
            issues.push({
              id: `fact_floor_mismatch_${chapterNumber}_${Date.now()}`,
              chapterNumber,
              severity: 'critical',
              category: 'floor_mismatch',
              description: `Conflito com fato canônico ("${fact.fact}"): O texto menciona "${found}" em vez de quarto andar.`,
              originalExcerpt: found,
              suggestedFix: 'quarto andar',
              canonicalReference: fact.fact,
              autoFixApplied: false
            });
          } else if (isOitavo && /(quarto|4[ºoªa])\s+andar/i.test(chapterText)) {
            const found = chapterText.match(/(quarto|4[ºoªa])\s+andar/i)![0];
            issues.push({
              id: `fact_floor_mismatch_${chapterNumber}_${Date.now()}`,
              chapterNumber,
              severity: 'critical',
              category: 'floor_mismatch',
              description: `Conflito com fato canônico ("${fact.fact}"): O texto menciona "${found}" em vez de oitavo andar.`,
              originalExcerpt: found,
              suggestedFix: 'oitavo andar',
              canonicalReference: fact.fact,
              autoFixApplied: false
            });
          }
        }
      }
    }

    // 3. Verificação de Nomes e Sobrenomes de Personagens (TESTE 2: Mutação de sobrenome)
    for (const char of memory.characters) {
      if (char.fullName && char.name) {
        const nameParts = char.fullName.split(/\s+/);
        if (nameParts.length > 1) {
          const canonicalSurname = nameParts[nameParts.length - 1];
          const firstName = nameParts[0];

          // Procura por mutações do tipo: "FirstName OutroSobrenome"
          const surnameRegex = new RegExp(`\\b${firstName}\\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)\\b`, 'g');
          let m: RegExpExecArray | null;
          while ((m = surnameRegex.exec(chapterText)) !== null) {
            const capturedSurname = m[1];
            // Se o sobrenome capturado for diferente do canônico e não for um dos apelidos/aliases
            const isCanonical =
              capturedSurname.toLowerCase() === canonicalSurname.toLowerCase() ||
              (char.aliases || []).some(a => a.toLowerCase().includes(capturedSurname.toLowerCase()));

            if (!isCanonical) {
              issues.push({
                id: `name_mutation_${chapterNumber}_${Date.now()}`,
                chapterNumber,
                severity: 'critical',
                category: 'name_mutation',
                description: `Mutação involuntária no sobrenome do personagem: O personagem canônico "${char.fullName}" foi chamado de "${m[0]}" (sobrenome "${capturedSurname}" em vez de "${canonicalSurname}").`,
                originalExcerpt: m[0],
                suggestedFix: `${firstName} ${canonicalSurname}`,
                canonicalReference: `Personagem: ${char.fullName}`,
                autoFixApplied: false
              });
            }
          }
        }
      }
    }

    // Também verifica fatos canônicos de sobrenome
    for (const fact of memory.canonicalFacts) {
      if (fact.category === 'character' && /sobrenome/i.test(fact.fact)) {
        const match = fact.fact.match(/sobrenome\s+(?:de\s+)?([A-Za-zÀ-ÿ]+)\s+[eé]\s+([A-Za-zÀ-ÿ]+)/i);
        if (match) {
          const firstName = match[1];
          const canonicalSurname = match[2];
          const checkRegex = new RegExp(`\\b${firstName}\\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)\\b`, 'g');
          let m2: RegExpExecArray | null;
          while ((m2 = checkRegex.exec(chapterText)) !== null) {
            if (m2[1].toLowerCase() !== canonicalSurname.toLowerCase()) {
              issues.push({
                id: `fact_name_mutation_${chapterNumber}_${Date.now()}`,
                chapterNumber,
                severity: 'critical',
                category: 'name_mutation',
                description: `Conflito de sobrenome com fato canônico ("${fact.fact}"): O texto traz "${m2[0]}" em vez de "${firstName} ${canonicalSurname}".`,
                originalExcerpt: m2[0],
                suggestedFix: `${firstName} ${canonicalSurname}`,
                canonicalReference: fact.fact,
                autoFixApplied: false
              });
            }
          }
        }
      }
    }

    // 4. Verificação de Transição Espacial / Teletransporte (TESTE 3)
    if (lastChapterState && chapterNumber > 1) {
      const lastLoc = lastChapterState.endingLocation;
      if (lastLoc && lastLoc.name) {
        // Primeiros 2 parágrafos do novo capítulo
        const firstParagraphs = chapterText.split(/\n\s*\n/).slice(0, 2).join(' ');
        
        // Se o capítulo anterior terminou em local muito específico (ex: "porão", "cela", "sala de cirurgia", "Boston")
        // e o novo capítulo começa em outro país/cidade sem transição explicada
        const cityTeleportPatterns = [
          { from: /Boston/i, to: /Paris|Londres|T[oó]quio/i },
          { from: /Nova York|New York/i, to: /Los Angeles|Roma|Madrid/i },
          { from: /São Paulo/i, to: /Rio de Janeiro|Lisboa|Nova York/i }
        ];

        for (const tp of cityTeleportPatterns) {
          if (tp.from.test(lastLoc.name) || tp.from.test(lastLoc.city || '')) {
            if (tp.to.test(firstParagraphs) && !/(voou|avião|embarcou|viagem|horas depois|dias depois|semanas depois|meses depois)/i.test(firstParagraphs)) {
              issues.push({
                id: `teleport_${chapterNumber}_${Date.now()}`,
                chapterNumber,
                severity: 'critical',
                category: 'teleportation',
                description: `Quebra de continuidade espacial e teletransporte: O capítulo ${lastChapterState.chapterNumber} terminou com os personagens em "${lastLoc.name}", e o capítulo ${chapterNumber} abre subitamente em local distante sem contextualizar a viagem ou passagem de tempo.`,
                originalExcerpt: firstParagraphs.slice(0, 180),
                suggestedFix: `Adicionar transição contextualizando a passagem de tempo e a viagem a partir de ${lastLoc.name}.`,
                canonicalReference: `Local anterior: ${lastLoc.name}`,
                autoFixApplied: false
              });
            }
          }
        }
      }
    }

    // 5. Verificação de Cronologia de Eventos (TESTE 4)
    for (const fact of memory.canonicalFacts) {
      if (fact.category === 'event') {
        // Ex: "O funeral de Ricardo ocorreu na sexta-feira" -> texto posterior diz que Ricardo estava no escritório vivo sem ser flashback
        if (/funeral|morte|faleceu|assassinado/i.test(fact.fact)) {
          const matchName = fact.fact.match(/([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)/);
          if (matchName) {
            const deadName = matchName[1];
            // Se o personagem morto aparece agindo no presente sem marcador de flashback
            const aliveActionRegex = new RegExp(`\\b${deadName}\\s+(disse|falou|caminhou|entrou|olhou|sorriu|respondeu)\\b`, 'i');
            if (aliveActionRegex.test(chapterText) && !/(lembrança|memória|flashback|anos antes|no passado|recordou)/i.test(chapterText)) {
              issues.push({
                id: `chronology_event_${chapterNumber}_${Date.now()}`,
                chapterNumber,
                severity: 'critical',
                category: 'chronology',
                description: `Inconsistência cronológica com o evento canônico ("${fact.fact}"): O personagem "${deadName}" realiza ações no presente ("${chapterText.match(aliveActionRegex)![0]}"), contradizendo o evento registrado sem contextualização de flashback.`,
                originalExcerpt: chapterText.match(aliveActionRegex)![0],
                suggestedFix: `Contextualizar a cena como lembrança/flashback de ${deadName} ou referir-se à sua memória.`,
                canonicalReference: fact.fact,
                autoFixApplied: false
              });
            }
          }
        }
      }
    }

    // 6. Verificação de Título Incompleto ou Numeração Duplicada (Seção 1)
    let fixedTitle: string | undefined;
    if (params.chapterTitle) {
      const normalizedTitle = normalizeChapterHeading(params.chapterTitle, chapterNumber, memory.identity.language, chapterText);
      const hasDupNum = /^(?:cap[ií]tulo|chapter|cap\.?)\s*\d+\s*[:.\-–—]+\s*(?:cap[ií]tulo|chapter|cap\.?)\s*\d+/i.test(params.chapterTitle.trim());
      if (isIncompleteTitle(params.chapterTitle) || normalizedTitle.wasRepaired || hasDupNum) {
        fixedTitle = normalizedTitle.cleanTitle;
        issues.push({
          id: `incomplete_title_${chapterNumber}_${Date.now()}`,
          chapterNumber,
          severity: 'error',
          category: 'incomplete_title',
          description: `Título do capítulo ${chapterNumber} incompleto, terminado em conectivo ou com numeração duplicada ("${params.chapterTitle}").`,
          originalExcerpt: params.chapterTitle,
          suggestedFix: normalizedTitle.cleanTitle,
          autoFixApplied: false
        });
      }
    }

    // 7. Proibição de Referências Artificiais ("no capítulo anterior" / "in the previous chapter")
    const isNonFiction = /n[aã]o[\s-]?fic|t[eé]cnic|educacion|did[aá]tic|autoajuda|neg[oó]cios/i.test(memory.identity.genre || '');
    if (!isNonFiction) {
      const metaPatterns = [
        /\b(?:como\s+vimos\s+)?no\s+cap[ií]tulo\s+anterior\s*,?\s*/gi,
        /\bconforme\s+(?:visto|relatado|descrito)\s+no\s+cap[ií]tulo\s+(?:anterior|passado)\s*,?\s*/gi,
        /\b(?:as\s+seen\s+)?in\s+the\s+(?:previous|last)\s+chapter\s*,?\s*/gi,
        /\bno\s+cap[ií]tulo\s+passado\s*,?\s*/gi
      ];
      for (const mp of metaPatterns) {
        const match = chapterText.match(mp);
        if (match) {
          issues.push({
            id: `meta_ref_${chapterNumber}_${Date.now()}`,
            chapterNumber,
            severity: 'error',
            category: 'meta_reference',
            description: `Referência meta-narrativa artificial detectada em obra ficcional ("${match[0].trim()}").`,
            originalExcerpt: match[0],
            suggestedFix: '',
            autoFixApplied: false
          });
        }
      }
    }

    // 8. Verificação de Elementos Pendentes no Capítulo Final
    if (chapterNumber >= totalChapters && memory.trackedElements && memory.trackedElements.length > 0) {
      for (const elem of memory.trackedElements) {
        if (elem.status === 'pending') {
          const elemRegex = new RegExp(`\\b${elem.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (elemRegex.test(chapterText)) {
            elem.status = 'resolved';
            elem.resolvedInChapter = chapterNumber;
          } else {
            issues.push({
              id: `unresolved_elem_${chapterNumber}_${elem.id}`,
              chapterNumber,
              severity: 'warning',
              category: 'unresolved_element',
              description: `Elemento pendente (${elem.type}: "${elem.name}", introduzido no Cap. ${elem.introducedInChapter}) não foi mencionado ou resolvido até o capítulo final.`,
              originalExcerpt: elem.name,
              suggestedFix: `Integrar resolução de "${elem.name}" (${elem.description}) no desfecho.`,
              canonicalReference: `Introduzido no Cap. ${elem.introducedInChapter}`,
              autoFixApplied: false
            });
          }
        }
      }
    }

    const score = Math.max(0, 100 - issues.reduce((acc, iss) => acc + (iss.severity === 'critical' ? 30 : iss.severity === 'error' ? 15 : 5), 0));

    return {
      isValid: issues.filter(i => i.severity === 'critical').length === 0,
      score,
      issues,
      fixedTitle
    };
  }

  /**
   * Aplica correções automáticas seguras no texto do capítulo com base nas inconsistências detectadas.
   */
  static autoFixContinuityIssues(
    chapterText: string,
    issues: ContinuityAuditIssue[]
  ): { fixedText: string; fixedCount: number } {
    let text = chapterText;
    let fixedCount = 0;

    for (const issue of issues) {
      if (issue.category === 'floor_mismatch' && issue.suggestedFix) {
        // Substitui menção errônea pelo andar canônico
        const regex = new RegExp(issue.originalExcerpt, 'gi');
        if (regex.test(text)) {
          text = text.replace(regex, issue.suggestedFix);
          issue.autoFixApplied = true;
          fixedCount++;
        }
      } else if (issue.category === 'name_mutation' && issue.suggestedFix) {
        // Substitui sobrenome mutado pelo nome canônico
        const regex = new RegExp(`\\b${issue.originalExcerpt}\\b`, 'g');
        if (regex.test(text)) {
          text = text.replace(regex, issue.suggestedFix);
          issue.autoFixApplied = true;
          fixedCount++;
        }
      } else if (issue.category === 'premature_ending' && issue.suggestedFix) {
        // Substitui clichê de encerramento prematuro por gancho de tensão continuada
        const regex = new RegExp(issue.originalExcerpt, 'gi');
        if (regex.test(text)) {
          text = text.replace(
            regex,
            'uma calmaria passageira se instaurou, mas sob a superfície novas sombras e perguntas continuavam à espreita'
          );
          issue.autoFixApplied = true;
          fixedCount++;
        }
      } else if (issue.category === 'meta_reference') {
        const escaped = issue.originalExcerpt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'gi');
        if (regex.test(text)) {
          text = text.replace(regex, (_match, offset, fullStr) => {
            // Se estava no início de período, capitaliza a próxima letra na limpeza pós-replace
            return offset === 0 || /[.!?]\s+$/.test(fullStr.slice(0, offset)) ? '' : '';
          });
          // Limpa espaços duplos e garante letra maiúscula após ponto ou início de parágrafo
          text = text.replace(/(^|\n\s*|[.!?]\s+)([a-záéíóúâêôãõç])/gm, (_m, p1, p2) => `${p1}${p2.toUpperCase()}`);
          issue.autoFixApplied = true;
          fixedCount++;
        }
      }
    }

    return { fixedText: text, fixedCount };
  }

  /**
   * Atualiza a Memória Editorial Global (BOOK_GLOBAL_MEMORY) após a conclusão e validação
   * de um capítulo, construindo o novo LAST_CHAPTER_STATE para o próximo.
   */
  static updateGlobalMemoryAfterChapter(params: {
    memory: BookGlobalMemory;
    chapter: { titulo: string; texto: string };
    chapterNumber: number;
    auditResult: LocalContinuityAuditResult;
  }): {
    updatedMemory: BookGlobalMemory;
    newChapterState: LastChapterState;
  } {
    const { memory, chapter, chapterNumber } = params;

    const paragraphs = chapter.texto
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);

    const openingScene = paragraphs[0]?.slice(0, 220) || 'Início do capítulo.';
    const closingScene = paragraphs[paragraphs.length - 1]?.slice(0, 260) || 'Fechamento do capítulo.';

    // Factual summary simples
    const factualSummary = `${openingScene.slice(0, 110)}... Conclusão da cena: ${closingScene.slice(0, 120)}`;

    // Extrai personagens mencionados
    const charactersPresent: string[] = [];
    for (const char of memory.characters) {
      const rx = new RegExp(`\\b${char.name}\\b`, 'i');
      if (rx.test(chapter.texto)) {
        charactersPresent.push(char.name);
        char.lastAppearedChapter = chapterNumber;
        if (!char.associatedChapters.includes(chapterNumber)) {
          char.associatedChapters.push(chapterNumber);
        }
      }
    }

    // Local de encerramento
    let endingLocName = 'Ambiente da cena final';
    let endingFloor: string | undefined = undefined;
    for (const loc of memory.locations) {
      const rx = new RegExp(`\\b${loc.name}\\b`, 'i');
      if (rx.test(closingScene)) {
        endingLocName = loc.name;
        endingFloor = loc.floor ? String(loc.floor) : undefined;
        if (!loc.associatedChapters.includes(chapterNumber)) {
          loc.associatedChapters.push(chapterNumber);
        }
        break;
      }
    }

    const sentences = closingScene.split(/[.!?]\s+/).filter(Boolean);
    const cliffhangerHook = sentences.slice(-2).join('. ') || closingScene;

    const newChapterState: LastChapterState = {
      chapterNumber,
      title: chapter.titulo,
      factualSummary,
      openingScene,
      closingScene,
      endingLocation: {
        name: endingLocName,
        floor: endingFloor,
        description: closingScene.slice(0, 140)
      },
      dateTime: {
        date: undefined,
        timeOfDay: undefined
      },
      charactersPresent: charactersPresent.length > 0 ? charactersPresent : ['Protagonista'],
      characterStates: charactersPresent.map(name => ({
        name,
        physicalState: 'Ativo',
        emotionalState: 'Em tensão com os acontecimentos recentes',
        lastAction: 'Participou das ações decisivas do capítulo',
        inventory: []
      })),
      revealedInformation: [],
      hiddenSecrets: [],
      ongoingConflicts: [
        `Conflito em andamento do capítulo ${chapterNumber} desdobrando-se para o capítulo seguinte.`
      ],
      pendingConsequences: [],
      cliffhangerHook,
      nextPlannedEvent: `Conectar imediatamente com o fechamento do capítulo ${chapterNumber}.`
    };

    // Registra evento na linha do tempo
    const timelineEvent: TimelineEvent = {
      id: `evt_cap_${chapterNumber}`,
      chapterNumber,
      summary: factualSummary,
      causalOrder: chapterNumber
    };
    memory.timeline.push(timelineEvent);

    memory.version += 1;
    memory.updatedAt = new Date().toISOString();

    return {
      updatedMemory: memory,
      newChapterState
    };
  }
}

