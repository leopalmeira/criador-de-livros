// ============================================================================
// BOOKENGIN MULTI-ENGINE — BANCO ESTRUTURADO DE MEMÓRIA NARRATIVA PERSISTENTE
// Inspirado nos princípios de retenção de longo prazo de Webnovel Writer e InkOS
// ============================================================================

import {
  StructuredNarrativeMemory,
  CharacterState,
  EnvironmentState,
  ObjectState,
  ChronologyEvent,
  CanonicalFact,
  NarrativeRules,
  ChapterMicroMemory,
  MicroEventItem,
  NarrativeFactStatus
} from './contracts';
import { db } from '../../database/local-database';

export class NarrativeMemoryStore {
  private static sharedMemoryCache: Map<string, StructuredNarrativeMemory> = new Map();
  private memory: StructuredNarrativeMemory;
  private readonly storagePrefix = 'kdp_multi_engine_mem_';

  constructor(bookId: string, title: string = 'Obra Sem Título', genre: string = 'Ficção') {
    const cleanId = bookId.replace('final_proj_', '');
    const cached = NarrativeMemoryStore.sharedMemoryCache.get(cleanId);
    if (cached) {
      this.memory = JSON.parse(JSON.stringify(cached));
    } else {
      this.memory = this.createEmptyMemory(bookId, title, genre);
    }
  }

  private createEmptyMemory(bookId: string, title: string, genre: string): StructuredNarrativeMemory {
    return {
      bookId,
      title,
      genre,
      updatedAt: Date.now(),
      characters: {},
      environments: {},
      objects: {},
      chronology: [],
      rules: {
        universe: 'Mundo Contemporâneo Realista',
        era: 'Presente',
        establishedLimitations: [],
        canonicalFacts: [],
        unresolvedMysteries: [],
        characterKnowledgeMatrix: {}
      },
      chapterMemories: {}
    };
  }

  public getMemory(): StructuredNarrativeMemory {
    return JSON.parse(JSON.stringify(this.memory));
  }

  public getProjectMemory(): StructuredNarrativeMemory {
    return this.getMemory();
  }

  public setMemory(newMem: StructuredNarrativeMemory): void {
    this.memory = JSON.parse(JSON.stringify(newMem));
    this.memory.updatedAt = Date.now();
  }

  // --------------------------------------------------------------------------
  // PERSISTÊNCIA IDEMPOTENTE E TRANSAÇÃO
  // --------------------------------------------------------------------------
  public async load(bookId?: string): Promise<StructuredNarrativeMemory> {
    const targetId = bookId || this.memory.bookId;
    const cleanId = targetId.replace('final_proj_', '');
    // 1. Tentar IndexedDB
    try {
      const stored = await db.getEditorialJob(cleanId);
      if (stored && (stored as any).structuredMemory) {
        this.memory = (stored as any).structuredMemory;
        NarrativeMemoryStore.sharedMemoryCache.set(cleanId, JSON.parse(JSON.stringify(this.memory)));
        return this.getMemory();
      }
    } catch (e) {
      console.warn('[NarrativeMemoryStore] Aviso ao carregar do IndexedDB:', e);
    }

    // 2. Tentar localStorage como fallback rápido
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`${this.storagePrefix}${cleanId}`);
        if (raw) {
          this.memory = JSON.parse(raw);
          NarrativeMemoryStore.sharedMemoryCache.set(cleanId, JSON.parse(JSON.stringify(this.memory)));
          return this.getMemory();
        }
      }
    } catch {}

    // 3. Fallback para cache de memória compartilhado
    const cached = NarrativeMemoryStore.sharedMemoryCache.get(cleanId);
    if (cached) {
      this.memory = JSON.parse(JSON.stringify(cached));
      return this.getMemory();
    }

    return this.getMemory();
  }

  public async save(): Promise<void> {
    this.memory.updatedAt = Date.now();
    const cleanId = this.memory.bookId.replace('final_proj_', '');
    NarrativeMemoryStore.sharedMemoryCache.set(cleanId, JSON.parse(JSON.stringify(this.memory)));

    // 1. Salvar no IndexedDB como parte do job editorial permanente
    try {
      const existing = await db.getEditorialJob(cleanId);
      const updatedJob: any = {
        id: `job_${cleanId}`,
        bookId: cleanId,
        chapterIndex: Object.keys(this.memory.chapterMemories).length,
        totalChapters: Math.max(1, Object.keys(this.memory.chapterMemories).length),
        status: 'completed',
        startedAt: existing?.startedAt || Date.now(),
        updatedAt: Date.now(),
        structuredMemory: this.memory
      };
      await db.saveEditorialJob(updatedJob);
    } catch (e) {
      console.warn('[NarrativeMemoryStore] Aviso ao salvar no IndexedDB:', e);
    }

    // 2. Salvar no localStorage para recuperação instantânea em recarregamentos
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${this.storagePrefix}${cleanId}`, JSON.stringify(this.memory));
      }
    } catch {}
  }

  // --------------------------------------------------------------------------
  // GESTÃO ESTRUTURADA DE PERSONAGENS
  // --------------------------------------------------------------------------
  public registerOrUpdateCharacter(char: Partial<CharacterState> & { name: string }): CharacterState {
    const normKey = this.normalizeKey(char.name);
    const existing = this.memory.characters[normKey];

    const updated: CharacterState = {
      id: existing?.id || `char_${normKey}`,
      name: char.name.trim(),
      fullName: char.fullName || existing?.fullName || char.name.trim(),
      aliases: Array.from(new Set([...(existing?.aliases || []), ...(char.aliases || [])])),
      age: char.age !== undefined ? char.age : existing?.age,
      physicalTraits: char.physicalTraits || existing?.physicalTraits || 'Descrição em consolidação',
      personality: char.personality || existing?.personality || 'Personalidade em desenvolvimento',
      profession: char.profession || existing?.profession,
      relationships: { ...(existing?.relationships || {}), ...(char.relationships || {}) },
      goals: Array.from(new Set([...(existing?.goals || []), ...(char.goals || [])])),
      fears: Array.from(new Set([...(existing?.fears || []), ...(char.fears || [])])),
      acquiredKnowledge: Array.from(new Set([...(existing?.acquiredKnowledge || []), ...(char.acquiredKnowledge || [])])),
      knownSecrets: Array.from(new Set([...(existing?.knownSecrets || []), ...(char.knownSecrets || [])])),
      unknownSecrets: Array.from(new Set([...(existing?.unknownSecrets || []), ...(char.unknownSecrets || [])])),
      emotionalState: char.emotionalState || existing?.emotionalState || 'neutro',
      currentLocation: char.currentLocation || existing?.currentLocation || 'indefinida',
      physicalState: char.physicalState || existing?.physicalState || 'saudável',
      narrativeStatus: char.narrativeStatus || existing?.narrativeStatus || 'active',
      lastAppearedChapter: char.lastAppearedChapter !== undefined ? char.lastAppearedChapter : (existing?.lastAppearedChapter || 1),
      eventHistory: [...(existing?.eventHistory || []), ...(char.eventHistory || [])]
    };

    // Atualiza a matriz de conhecimento
    if (!this.memory.rules.characterKnowledgeMatrix[updated.name]) {
      this.memory.rules.characterKnowledgeMatrix[updated.name] = {
        knows: [],
        doesNotKnow: []
      };
    }
    const mat = this.memory.rules.characterKnowledgeMatrix[updated.name];
    updated.knownSecrets.forEach(s => {
      if (!mat.knows.includes(s)) mat.knows.push(s);
      mat.doesNotKnow = mat.doesNotKnow.filter(item => item !== s);
    });
    updated.unknownSecrets.forEach(s => {
      if (!mat.doesNotKnow.includes(s) && !mat.knows.includes(s)) mat.doesNotKnow.push(s);
    });

    this.memory.characters[normKey] = updated;
    return updated;
  }

  public getCharacter(nameOrAlias: string): CharacterState | null {
    const norm = this.normalizeKey(nameOrAlias);
    if (this.memory.characters[norm]) return this.memory.characters[norm];

    // Busca por alias ou nome aproximado
    for (const char of Object.values(this.memory.characters)) {
      if (this.normalizeKey(char.name) === norm || this.normalizeKey(char.fullName) === norm) {
        return char;
      }
      if (char.aliases.some(a => this.normalizeKey(a) === norm)) {
        return char;
      }
    }
    return null;
  }

  public killCharacter(name: string, chapter: number, textEvidence: string): void {
    const char = this.getCharacter(name);
    if (char) {
      char.narrativeStatus = 'dead';
      char.physicalState = 'morto';
      char.lastAppearedChapter = chapter;
      char.eventHistory.push({
        chapter,
        action: 'faleceu / foi morto',
        location: char.currentLocation,
        evidenceSnippet: textEvidence
      });
      this.registerFact(
        `O personagem ${char.name} faleceu definitivamente no capítulo ${chapter}.`,
        'character',
        'confirmed',
        chapter,
        textEvidence,
        true
      );
    }
  }

  // --------------------------------------------------------------------------
  // GESTÃO ESTRUTURADA DE AMBIENTES
  // --------------------------------------------------------------------------
  public registerOrUpdateEnvironment(env: Partial<EnvironmentState> & { name: string }): EnvironmentState {
    const normKey = this.normalizeKey(env.name);
    const existing = this.memory.environments[normKey];

    const updated: EnvironmentState = {
      id: existing?.id || `env_${normKey}`,
      name: env.name.trim(),
      location: env.location || existing?.location || 'Localização geral',
      physicalCharacteristics: env.physicalCharacteristics || existing?.physicalCharacteristics || '',
      objectsPresent: Array.from(new Set([...(existing?.objectsPresent || []), ...(env.objectsPresent || [])])),
      charactersPresent: Array.from(new Set([...(existing?.charactersPresent || []), ...(env.charactersPresent || [])])),
      accessRules: Array.from(new Set([...(existing?.accessRules || []), ...(env.accessRules || [])])),
      modifications: Array.from(new Set([...(existing?.modifications || []), ...(env.modifications || [])])),
      associatedChapters: Array.from(new Set([...(existing?.associatedChapters || []), ...(env.associatedChapters || [])]))
    };

    this.memory.environments[normKey] = updated;
    return updated;
  }

  public getEnvironment(name: string): EnvironmentState | null {
    const norm = this.normalizeKey(name);
    return this.memory.environments[norm] || null;
  }

  // --------------------------------------------------------------------------
  // GESTÃO ESTRUTURADA DE OBJETOS COM RASTREAMENTO DETERMINÍSTICO
  // --------------------------------------------------------------------------
  public registerOrUpdateObject(obj: Partial<ObjectState> & { name: string; currentLocation: string; currentState: string }): ObjectState {
    const normKey = this.normalizeKey(obj.name);
    const existing = this.memory.objects[normKey];

    const updated: ObjectState = {
      id: existing?.id || `obj_${normKey}`,
      name: obj.name.trim(),
      description: obj.description || existing?.description || 'Objeto da narrativa',
      owner: obj.owner || existing?.owner,
      currentLocation: obj.currentLocation.trim(),
      lastManipulatedBy: obj.lastManipulatedBy || existing?.lastManipulatedBy || 'desconhecido',
      currentState: obj.currentState.trim(),
      movementHistory: obj.movementHistory || existing?.movementHistory || [],
      lastTextEvidence: obj.lastTextEvidence || existing?.lastTextEvidence || ''
    };

    this.memory.objects[normKey] = updated;

    // Atualiza o ambiente correspondente
    const envNorm = this.normalizeKey(updated.currentLocation);
    if (this.memory.environments[envNorm]) {
      if (!this.memory.environments[envNorm].objectsPresent.includes(updated.name)) {
        this.memory.environments[envNorm].objectsPresent.push(updated.name);
      }
    }

    return updated;
  }

  public recordObjectMovement(
    objectName: string,
    chapter: number,
    fromLocation: string,
    toLocation: string,
    movedBy: string,
    actionType: 'placed' | 'picked_up' | 'transported' | 'used' | 'dropped' | 'hidden' | 'destroyed',
    textEvidence: string
  ): ObjectState {
    const normKey = this.normalizeKey(objectName);
    let obj = this.memory.objects[normKey];

    if (!obj) {
      obj = this.registerOrUpdateObject({
        name: objectName,
        currentLocation: toLocation,
        currentState: `em posse de ${movedBy} ou localizado em ${toLocation}`,
        lastManipulatedBy: movedBy,
        lastTextEvidence: textEvidence
      });
    }

    const previousLocation = obj.currentLocation || fromLocation;
    obj.currentLocation = toLocation;
    obj.lastManipulatedBy = movedBy;
    obj.lastTextEvidence = textEvidence;
    obj.currentState = `localizado em ${toLocation} (${actionType} por ${movedBy})`;

    obj.movementHistory.push({
      chapter,
      fromLocation: previousLocation,
      toLocation,
      movedBy,
      actionType,
      textEvidence,
      timestamp: new Date().toISOString()
    });

    // Remove do ambiente antigo se aplicável
    const oldEnvNorm = this.normalizeKey(previousLocation);
    if (this.memory.environments[oldEnvNorm]) {
      this.memory.environments[oldEnvNorm].objectsPresent = this.memory.environments[oldEnvNorm].objectsPresent.filter(
        o => this.normalizeKey(o) !== normKey
      );
    }

    // Adiciona ao novo ambiente
    const newEnvNorm = this.normalizeKey(toLocation);
    if (this.memory.environments[newEnvNorm]) {
      if (!this.memory.environments[newEnvNorm].objectsPresent.includes(obj.name)) {
        this.memory.environments[newEnvNorm].objectsPresent.push(obj.name);
      }
    }

    this.memory.objects[normKey] = obj;
    return obj;
  }

  public getObject(name: string): ObjectState | null {
    const norm = this.normalizeKey(name);
    return this.memory.objects[norm] || null;
  }

  // --------------------------------------------------------------------------
  // FATOS CANÔNICOS E CRONOLOGIA
  // --------------------------------------------------------------------------
  public registerFact(
    fact: string,
    category: CanonicalFact['category'],
    status: NarrativeFactStatus,
    establishedInChapter: number,
    textEvidence: string,
    immutable: boolean = false
  ): CanonicalFact {
    const id = `fact_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newFact: CanonicalFact = {
      id,
      fact: fact.trim(),
      category,
      status,
      establishedInChapter,
      textEvidence,
      immutable
    };

    // Remove fato contraditório anterior se houver substituição canônica legítima
    this.memory.rules.canonicalFacts = this.memory.rules.canonicalFacts.filter(
      f => !(f.fact.toLowerCase() === newFact.fact.toLowerCase() && f.status === 'confirmed')
    );
    this.memory.rules.canonicalFacts.push(newFact);
    return newFact;
  }

  public registerChronologyEvent(event: Omit<ChronologyEvent, 'id' | 'order'>): ChronologyEvent {
    const id = `chrono_${Date.now()}_${this.memory.chronology.length + 1}`;
    const order = this.memory.chronology.length + 1;
    const newEvent: ChronologyEvent = {
      ...event,
      id,
      order
    };
    this.memory.chronology.push(newEvent);
    return newEvent;
  }

  // --------------------------------------------------------------------------
  // MEMÓRIA DETALHADA DE CADA CAPÍTULO (MICRO-ACONTECIMENTOS)
  // --------------------------------------------------------------------------
  public commitChapterMicroMemory(
    chapterNumber: number,
    title: string,
    data: {
      openingScene: string;
      closingScene: string;
      endingLocation: string;
      charactersInvolved: string[];
      events: MicroEventItem[];
      revealedSecrets?: string[];
      ongoingTension?: string;
    }
  ): ChapterMicroMemory {
    const microMem: ChapterMicroMemory = {
      chapterNumber,
      title,
      openingScene: data.openingScene,
      closingScene: data.closingScene,
      endingLocation: data.endingLocation,
      charactersInvolved: data.charactersInvolved,
      events: data.events,
      revealedSecrets: data.revealedSecrets || [],
      ongoingTension: data.ongoingTension || 'estável'
    };

    this.memory.chapterMemories[chapterNumber] = microMem;

    // Atualiza estados dos personagens e objetos a partir dos micro-eventos
    data.events.forEach(ev => {
      // Atualiza personagem
      if (ev.actor) {
        const char = this.getCharacter(ev.actor);
        if (char) {
          char.currentLocation = ev.resultingLocation || ev.location || char.currentLocation;
          char.lastAppearedChapter = chapterNumber;
          char.eventHistory.push({
            chapter: chapterNumber,
            action: ev.action,
            location: ev.resultingLocation || ev.location,
            evidenceSnippet: ev.textSnippet
          });
        }
      }

      // Atualiza objetos afetados
      ev.objectsAffected.forEach(objAff => {
        this.recordObjectMovement(
          objAff.objectName,
          chapterNumber,
          ev.location,
          ev.resultingLocation || ev.location,
          ev.actor,
          'placed',
          ev.textSnippet
        );
      });
    });

    return microMem;
  }

  // --------------------------------------------------------------------------
  // EXTRAÇÃO DETERMINÍSTICA E HÍBRIDA DE ESTADOS DO TEXTO
  // --------------------------------------------------------------------------
  public parseAndExtractMicroEvents(text: string, chapterNumber: number): MicroEventItem[] {
    const events: MicroEventItem[] = [];
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

    // Dicionário de verbos e pistas de movimentação de objetos e ações
    const objectMovementRegex = /(?:colocou|deixou|guardou|largou|jogou|botou|posicionou|escondeu)\s+(?:as?|os?|um|uma|seus?|suas?)?\s*([^,.]+?)\s+(?:sobre|na|no|em|dentro de|ao lado de)\s+([^,.]+)/i;
    const clothingRegex = /(?:retirou|tirou|despiu|desabotoou|arrancou)\s+(?:o|a|os|as|seu|sua)?\s*([^,.]+)/i;
    const locationEntryRegex = /(?:entrou|chegou|adentrou|caminhou até|dirigiu-se a|veio para)\s+(?:no|na|ao|à|ao interior de)?\s*([^,.]+)/i;

    for (const para of paragraphs) {
      // 1. Detecção de colocação de objetos (ex: chaves sobre a estante)
      const objMatch = para.match(objectMovementRegex);
      if (objMatch) {
        const rawObj = objMatch[1].trim().toLowerCase();
        const rawTarget = objMatch[2].trim();
        // Identifica o ator do parágrafo
        const actor = this.findActorInParagraph(para) || 'Protagonista';
        events.push({
          actor,
          action: `colocou ${rawObj} em ${rawTarget}`,
          location: rawTarget,
          objectsAffected: [
            {
              objectName: rawObj,
              newState: `sobre/em ${rawTarget}`
            }
          ],
          resultingLocation: rawTarget,
          textSnippet: para.slice(0, 160)
        });
      }

      // 2. Detecção de roupas / vestimentas deixadas (ex: casaco retirado)
      const clothMatch = para.match(clothingRegex);
      if (clothMatch) {
        const item = clothMatch[1].trim().toLowerCase();
        const actor = this.findActorInParagraph(para) || 'Protagonista';
        events.push({
          actor,
          action: `retirou ${item}`,
          location: 'ambiente atual',
          objectsAffected: [
            {
              objectName: item,
              newState: 'retirado / fora do corpo'
            }
          ],
          resultingLocation: 'ambiente atual',
          textSnippet: para.slice(0, 160)
        });
      }

      // 3. Detecção de mudança de cômodo/ambiente (ex: entrou no banheiro)
      const locMatch = para.match(locationEntryRegex);
      if (locMatch) {
        const dest = locMatch[1].trim();
        const actor = this.findActorInParagraph(para) || 'Protagonista';
        events.push({
          actor,
          action: `entrou em ${dest}`,
          location: dest,
          objectsAffected: [],
          resultingLocation: dest,
          textSnippet: para.slice(0, 160)
        });
      }
    }

    return events;
  }

  private findActorInParagraph(para: string): string | null {
    for (const charName of Object.keys(this.memory.characters)) {
      const char = this.memory.characters[charName];
      if (para.includes(char.name) || (char.fullName && para.includes(char.fullName))) {
        return char.name;
      }
      for (const a of char.aliases) {
        if (para.includes(a)) return char.name;
      }
    }
    return null;
  }

  private normalizeKey(str: string): string {
    return str
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');
  }
}
