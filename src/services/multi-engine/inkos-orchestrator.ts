// ============================================================================
// BOOKENGIN MULTI-ENGINE — INKOS ORCHESTRATOR
// Orquestrador multiagente de planejamento, recuperação contextual e escrita
// Baseado na arquitetura modular de agentes do InkOS (Narcooo/inkos)
// ============================================================================

import { StructuredNarrativeMemory, CharacterState, ObjectState } from './contracts';
import { NarrativeMemoryStore } from './narrative-memory-store';
import { chamarGeminiTexto, chamarOpenRouterTexto } from '../kdp-ai-engine';

export interface ScenePlan {
  chapterNumber: number;
  chapterTitle: string;
  targetWords: number;
  primaryLocation: string;
  activeCharacters: string[];
  sceneGoal: string;
  conflictOrTension: string;
  climaxOrTurningPoint: string;
  closingHook: string;
}

export interface InkosContextPackage {
  charactersContext: string;
  environmentContext: string;
  objectsContext: string;
  knowledgeBoundaries: string;
  canonicalRules: string;
  previousChapterHook: string;
}

export class InkosOrchestrator {
  private memoryStore: NarrativeMemoryStore;

  constructor(memoryStore: NarrativeMemoryStore) {
    this.memoryStore = memoryStore;
  }

  // --------------------------------------------------------------------------
  // 1. STORYBOARD AGENT: Planejamento Narrativo do Capítulo
  // --------------------------------------------------------------------------
  public async planScene(
    chapterNumber: number,
    outlineTitle: string,
    outlineSummary: string,
    targetWords: number = 1000
  ): Promise<ScenePlan> {
    const memory = this.memoryStore.getMemory();
    const prevMicro = memory.chapterMemories[chapterNumber - 1];

    // Determina personagens ativos baseados no outline ou na cena anterior
    const activeChars: string[] = [];
    for (const [name, char] of Object.entries(memory.characters)) {
      if (char.narrativeStatus === 'active') {
        if (outlineSummary.toLowerCase().includes(char.name.toLowerCase()) || activeChars.length === 0) {
          activeChars.push(char.name);
        }
      }
    }

    if (activeChars.length === 0) {
      activeChars.push('Protagonista');
    }

    const primaryLocation = prevMicro?.endingLocation || 'Local Principal da Trama';

    return {
      chapterNumber,
      chapterTitle: outlineTitle,
      targetWords,
      primaryLocation,
      activeCharacters: activeChars.slice(0, 4),
      sceneGoal: `Avançar o objetivo dramático de ${activeChars[0]} diante de ${outlineTitle}`,
      conflictOrTension: outlineSummary || 'Tensão crescente e revelação de pistas cruciais',
      climaxOrTurningPoint: 'Um momento de decisão ou confronto direto que muda a situação',
      closingHook: 'Um desfecho instigante que exige continuação imediata'
    };
  }

  // --------------------------------------------------------------------------
  // 2. CONTEXT RETRIEVAL AGENT: Recuperação Seletiva e Híbrida
  // --------------------------------------------------------------------------
  public retrieveContext(plan: ScenePlan): InkosContextPackage {
    const memory = this.memoryStore.getMemory();

    // 1. Contexto dos Personagens Ativos
    const charSnippets: string[] = [];
    for (const charName of plan.activeCharacters) {
      const char = this.memoryStore.getCharacter(charName);
      if (char) {
        charSnippets.push(
          `- ${char.name} (${char.profession || 'Papel na trama'}): Status ${char.narrativeStatus.toUpperCase()}, Estado físico: ${char.physicalState}, Emocional: ${char.emotionalState}, Localização: ${char.currentLocation}. Objetivo: ${char.goals.join('; ') || 'sobreviver e investigar'}.`
        );
      }
    }
    const charactersContext = charSnippets.length > 0
      ? charSnippets.join('\n')
      : `- Personagens em foco: ${plan.activeCharacters.join(', ')}`;

    // 2. Ambiente e Objetos no Local
    const env = this.memoryStore.getEnvironment(plan.primaryLocation);
    const envSnippet = env
      ? `Local: ${env.name} (${env.location}). Características: ${env.physicalCharacteristics || 'Ambiente detalhado'}. Regras de acesso: ${env.accessRules.join(', ') || 'Nenhuma restrição'}.`
      : `Local da cena: ${plan.primaryLocation}.`;

    // 3. Objetos Rastreados Relevantes
    const objSnippets: string[] = [];
    for (const obj of Object.values(memory.objects)) {
      // Inclui se estiver no mesmo local ou em posse de personagem ativo
      const isHere = obj.currentLocation.toLowerCase().includes(plan.primaryLocation.toLowerCase());
      const withActiveChar = plan.activeCharacters.some(c => obj.lastManipulatedBy.toLowerCase().includes(c.toLowerCase()));
      if (isHere || withActiveChar) {
        objSnippets.push(
          `- OBJETO: "${obj.name}" | Estado atual: ${obj.currentState} | Localização exata: ${obj.currentLocation} | Última manipulação por: ${obj.lastManipulatedBy}.`
        );
      }
    }
    const objectsContext = objSnippets.length > 0
      ? objSnippets.join('\n')
      : 'Nenhum objeto com restrição especial no início desta cena.';

    // 4. Limite de Conhecimento e Segredos (Prevenção de Alucinação)
    const knowledgeSnippets: string[] = [];
    for (const charName of plan.activeCharacters) {
      const mat = memory.rules.characterKnowledgeMatrix[charName];
      if (mat) {
        if (mat.doesNotKnow && mat.doesNotKnow.length > 0) {
          knowledgeSnippets.push(
            `⚠️ ATENÇÃO: O personagem ${charName} NÃO SABE e NÃO PODE mencionar ou deduzir magicamente: "${mat.doesNotKnow.join('", "')}".`
          );
        }
        if (mat.knows && mat.knows.length > 0) {
          knowledgeSnippets.push(
            `✓ O personagem ${charName} já tem conhecimento comprovado de: "${mat.knows.join('", "')}".`
          );
        }
      }
    }
    const knowledgeBoundaries = knowledgeSnippets.length > 0
      ? knowledgeSnippets.join('\n')
      : 'Personagens devem agir estritamente com base no que vivenciaram até agora.';

    // 5. Fatos Canônicos Imutáveis
    const facts = memory.rules.canonicalFacts
      .filter(f => f.status === 'confirmed')
      .slice(-6)
      .map(f => `- [FATO CONFIRMADO]: ${f.fact}`)
      .join('\n');
    const canonicalRules = facts || 'Preservar as leis da física e a continuidade canônica da obra.';

    // 6. Gancho do Capítulo Anterior
    const prevMem = memory.chapterMemories[plan.chapterNumber - 1];
    const previousChapterHook = prevMem
      ? `Fechamento do capítulo anterior: "${prevMem.closingScene}". O capítulo atual deve iniciar mantendo a coerência imediata com este estado.`
      : 'Início da narrativa. Estabelecer o mundo com vivacidade sensorial.';

    return {
      charactersContext,
      environmentContext: envSnippet,
      objectsContext,
      knowledgeBoundaries,
      canonicalRules,
      previousChapterHook
    };
  }

  // --------------------------------------------------------------------------
  // 3. GENERATION AGENT: Execução com o Motor Atual do BookEngin
  // --------------------------------------------------------------------------
  public async generateChapterProse(
    plan: ScenePlan,
    context: InkosContextPackage,
    systemTone: string = 'Literário, envolvente e sensorial',
    language: string = 'português'
  ): Promise<string> {
    const isEn = language.toLowerCase().includes('ingl') || language.toLowerCase().includes('en');

    const prompt = `
[INKOS ORCHESTRATOR — PROMPT MESTRE DE ESCRITA DE CAPÍTULO]
OBRA: "${this.memoryStore.getMemory().title}"
GÊNERO: ${this.memoryStore.getMemory().genre}
CAPÍTULO ATUAL: ${plan.chapterNumber} — "${plan.chapterTitle}"
META DE EXTENSÃO: Aproximadamente ${plan.targetWords} palavras de prosa densa e envolvente.
IDIOMA OBRIGATÓRIO: ${isEn ? 'American English (Contemporary Best-Seller Prose)' : 'Português Brasileiro Contemporâneo'}

=== MEMÓRIA EDITORIAL E LIMITES CANÔNICOS (NÃO VIOLAR) ===
${context.charactersContext}

${context.environmentContext}

${context.objectsContext}

=== LIMITES DE CONHECIMENTO DOS PERSONAGENS (ANTI-ALUCINAÇÃO) ===
${context.knowledgeBoundaries}

=== FATOS CANÔNICOS CONFIRMADOS ===
${context.canonicalRules}

=== CONEXÃO COM O CAPÍTULO ANTERIOR ===
${context.previousChapterHook}

=== OBJETIVO DRAMÁTICO DA CENA ===
- Meta: ${plan.sceneGoal}
- Conflito: ${plan.conflictOrTension}
- Ponto de Virada / Clímax: ${plan.climaxOrTurningPoint}
- Gancho Final: ${plan.closingHook}

=== DIRETRIZES ESTILÍSTICAS INKOS ===
1. Mostre, não apenas conte (Show, Don't Tell): use sensações táteis, visuais, auditivas e psicológicas.
2. Diálogos naturais com subtexto: pontuação expressiva com travessão e tags de diálogo precisas.
3. Consistência física absoluta: se um personagem manipula um objeto, ele deve pegá-lo explicitamente onde o objeto está.
4. NUNCA ressuscite personagens mortos sem justificativa narrativa explícita.
5. Escreva DIRETAMENTE o texto integral do capítulo, sem introduções de IA como "Aqui está o capítulo" nem comentários posteriores.
`.trim();

    try {
      // 1. Tenta Gemini (motor nativo ultrarrápido)
      const res = await chamarGeminiTexto(prompt, {
        temperature: 0.82,
        maxTokens: 4096,
        systemInstruction: `Você é o Master Writer do motor InkOS + BookEngin. Escreva prosa literária de alto padrão editorial KDP, mantendo 100% de coerência com a memória canônica fornecida.`
      });
      if (res.texto && res.texto.trim().length > 100) {
        return res.texto.trim();
      }
    } catch (geminiErr) {
      console.warn('[InkosOrchestrator] Fallback do Gemini para OpenRouter:', geminiErr);
    }

    try {
      // 2. Fallback transparente para OpenRouter
      const resOr = await chamarOpenRouterTexto(prompt, {
        temperature: 0.82,
        maxTokens: 4096,
        systemInstruction: 'Você é o Master Writer do motor InkOS + BookEngin.'
      });
      if (resOr && resOr.texto && resOr.texto.trim().length > 100) {
        return resOr.texto.trim();
      }
    } catch (orErr) {
      console.error('[InkosOrchestrator] Falha em todos os provedores de IA:', orErr);
    }

    throw new Error('Falha ao gerar prosa do capítulo com os motores de IA disponíveis.');
  }
}
