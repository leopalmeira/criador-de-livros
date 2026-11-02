// ============================================================================
// BOOKENGIN MULTI-ENGINE — CONTRATOS E INTERFACES DE INTEGRAÇÃO
// Integração canônica entre BookEngin, InkOS e Webnovel Writer
// ============================================================================

export type NarrativeFactStatus = 'confirmed' | 'hypothesis' | 'narrative_plan' | 'unknown';

export interface CharacterState {
  id: string;
  name: string;
  fullName: string;
  aliases: string[];
  age?: number | string;
  physicalTraits: string;
  personality: string;
  profession?: string;
  relationships: Record<string, string>; // { [charNameOrId]: 'irmão', 'aliado', 'inimigo' }
  goals: string[];
  fears?: string[];
  acquiredKnowledge: string[];
  knownSecrets: string[];
  unknownSecrets: string[];
  emotionalState: string;
  currentLocation: string;
  physicalState: string; // e.g. 'saudável', 'ferido no braço esquerdo', 'exausto'
  narrativeStatus: 'active' | 'dead' | 'absent' | 'resolved';
  lastAppearedChapter: number;
  eventHistory: Array<{
    chapter: number;
    action: string;
    location: string;
    timestamp?: string;
    evidenceSnippet?: string;
  }>;
}

export interface EnvironmentState {
  id: string;
  name: string;
  location: string;
  physicalCharacteristics: string;
  objectsPresent: string[]; // Lista de IDs ou nomes de objetos presentes
  charactersPresent: string[]; // Personagens atualmente neste ambiente
  accessRules: string[]; // e.g. 'trancado com chave tetra', 'restrito a seguranças'
  modifications: string[]; // e.g. 'janela quebrada no cap 3', 'luz apagada'
  associatedChapters: number[];
}

export interface ObjectMovementRecord {
  chapter: number;
  fromLocation: string;
  toLocation: string;
  movedBy: string; // Quem manipulou/transportou
  actionType: 'placed' | 'picked_up' | 'transported' | 'used' | 'dropped' | 'hidden' | 'destroyed';
  textEvidence: string; // Citação exata do texto
  timestamp?: string;
}

export interface ObjectState {
  id: string;
  name: string;
  description: string;
  owner?: string;
  currentLocation: string; // Onde o objeto está no momento presente (ex: 'sobre a estante', 'bolso de João')
  lastManipulatedBy: string; // Última pessoa que tocou ou utilizou
  currentState: string; // e.g. 'sobre a estante', 'retirado do bolso', 'carregado com 6 balas', 'quebrado'
  movementHistory: ObjectMovementRecord[];
  lastTextEvidence: string; // Trecho textual que comprovou a última alteração
}

export interface ChronologyEvent {
  id: string;
  order: number;
  chapterNumber: number;
  date?: string;
  timeOfDay?: string;
  elapsedTime?: string;
  simultaneousEvents?: string[];
  causeAndConsequence: {
    cause?: string;
    consequence?: string;
  };
  lastAppearedCharacters: Record<string, number>; // { charName: chapter }
  description: string;
  isFlashback?: boolean;
}

export interface CanonicalFact {
  id: string;
  fact: string;
  category: 'character' | 'world' | 'event' | 'object' | 'rule' | 'nonfiction';
  status: NarrativeFactStatus;
  establishedInChapter: number;
  textEvidence: string;
  immutable: boolean;
}

export interface NarrativeRules {
  universe: string;
  era: string;
  establishedLimitations: string[];
  canonicalFacts: CanonicalFact[];
  unresolvedMysteries: string[];
  characterKnowledgeMatrix: Record<string, {
    knows: string[];
    doesNotKnow: string[];
  }>;
}

export interface MicroEventItem {
  actor: string;
  action: string;
  location: string;
  objectsAffected: Array<{
    objectName: string;
    previousState?: string;
    newState: string;
  }>;
  resultingLocation: string;
  textSnippet: string;
}

export interface ChapterMicroMemory {
  chapterNumber: number;
  title: string;
  openingScene: string;
  closingScene: string;
  endingLocation: string;
  charactersInvolved: string[];
  events: MicroEventItem[];
  revealedSecrets: string[];
  ongoingTension: string;
}

export interface StructuredNarrativeMemory {
  bookId: string;
  title: string;
  genre: string;
  updatedAt: number;
  characters: Record<string, CharacterState>;
  environments: Record<string, EnvironmentState>;
  objects: Record<string, ObjectState>;
  chronology: ChronologyEvent[];
  rules: NarrativeRules;
  chapterMemories: Record<number, ChapterMicroMemory>;
}

// ============================================================================
// CONTRATOS DO AUDITOR WEBNOVEL WRITER
// ============================================================================

export type ReviewDimension = 'setting' | 'timeline' | 'continuity' | 'character' | 'logic';
export type ReviewSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface WebnovelReviewIssue {
  id: string;
  severity: ReviewSeverity;
  category: ReviewDimension;
  location: string; // Parágrafo ou citação direta
  description: string;
  evidence: string; // Ex: "Texto diz: 'tirou as chaves do bolso' VS Memória canônica: 'chaves foram colocadas sobre a estante no cap 1 e ninguém as recolheu'"
  fixHint: string; // Sugestão técnica de correção contextual
  blocking: boolean; // Se for critical ou contradição confirmada, bloqueia avanço
  confidence: 'confirmed' | 'possible';
}

export interface DimensionResult {
  dimension: ReviewDimension;
  conclusion: 'pass' | 'fail';
  detail: string;
}

export interface WebnovelReviewReport {
  chapter: number;
  approved: boolean;
  issues: WebnovelReviewIssue[];
  dimensionResults: Record<ReviewDimension, DimensionResult>;
  blockingCount: number;
  hasBlocking: boolean;
  summary: string;
  reviewedAt: number;
}

export interface CorrectionCycleResult {
  cycle: number;
  originalText: string;
  correctedText: string;
  fixedIssues: string[];
  secondAudit: WebnovelReviewReport;
  success: boolean;
  introducedNewIssues: boolean;
}

export interface GlobalEditorialAuditReport {
  score: number; // 0 a 100
  criteriaScores: {
    characterContinuity: number; // 0 - 20
    objectContinuity: number; // 0 - 20
    timelineConsistency: number; // 0 - 20
    logicAndCausality: number; // 0 - 20
    plotPayoffAndPacing: number; // 0 - 20
  };
  totalChaptersAudited: number;
  totalWordsAudited: number;
  unresolvedContradictions: WebnovelReviewIssue[];
  resolvedContradictionsCount: number;
  detailedFindings: string[];
  approvalStatus: 'APROVADO_PARA_KDP' | 'APROVADO_COM_RESSALVAS' | 'REQUER_REVISAO_MANUAL';
  auditedAt: number;
}

export interface MultiEngineConfig {
  inkosOrchestrationEnabled: boolean;
  narrativeMemoryEnabled: boolean;
  webnovelAuditorEnabled: boolean;
  autoCorrectionEnabled: boolean;
  maxCorrectionCycles: number; // Padrão: 3
}

export const DEFAULT_MULTI_ENGINE_CONFIG: MultiEngineConfig = {
  inkosOrchestrationEnabled: true,
  narrativeMemoryEnabled: true,
  webnovelAuditorEnabled: true,
  autoCorrectionEnabled: true,
  maxCorrectionCycles: 3
};
