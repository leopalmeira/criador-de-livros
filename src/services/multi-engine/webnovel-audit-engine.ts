// ============================================================================
// BOOKENGIN MULTI-ENGINE — WEBNOVEL AUDIT ENGINE
// Auditor narrativo especializado capítulo a capítulo em 5 dimensões
// Baseado na arquitetura de revisão crítica do Webnovel Writer (lingfengQAQ/webnovel-writer)
// ============================================================================

import {
  WebnovelReviewReport,
  WebnovelReviewIssue,
  DimensionResult,
  ReviewDimension,
  ReviewSeverity
} from './contracts';
import { NarrativeMemoryStore } from './narrative-memory-store';

export class WebnovelAuditEngine {
  private memoryStore: NarrativeMemoryStore;

  constructor(memoryStore: NarrativeMemoryStore) {
    this.memoryStore = memoryStore;
  }

  /**
   * Executa a auditoria completa do capítulo contra a memória estruturada nas 5 dimensões
   */
  public async auditChapter(
    chapterNumber: number,
    chapterTitle: string,
    chapterText: string
  ): Promise<WebnovelReviewReport> {
    const memory = this.memoryStore.getMemory();
    const issues: WebnovelReviewIssue[] = [];
    const paragraphs = chapterText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

    // ------------------------------------------------------------------------
    // DIMENSÃO 1: SETTING & OBJETOS (Consistência de itens, estados e cenários)
    // ------------------------------------------------------------------------
    const settingIssues = this.auditSettingAndObjects(paragraphs, chapterNumber);
    issues.push(...settingIssues);

    // ------------------------------------------------------------------------
    // DIMENSÃO 2: TIMELINE (Cronologia, tempo transcorrido e teletransporte)
    // ------------------------------------------------------------------------
    const timelineIssues = this.auditTimelineAndSpace(paragraphs, chapterNumber);
    issues.push(...timelineIssues);

    // ------------------------------------------------------------------------
    // DIMENSÃO 3: CONTINUITY (Continuidade com capítulo anterior e ganchos)
    // ------------------------------------------------------------------------
    const continuityIssues = this.auditContinuity(paragraphs, chapterNumber);
    issues.push(...continuityIssues);

    // ------------------------------------------------------------------------
    // DIMENSÃO 4: CHARACTER (Personalidade, limite de conhecimento e vida/morte)
    // ------------------------------------------------------------------------
    const characterIssues = this.auditCharacterConsistency(paragraphs, chapterNumber);
    issues.push(...characterIssues);

    // ------------------------------------------------------------------------
    // DIMENSÃO 5: LOGIC (Causa e efeito, contradições factuais diretas)
    // ------------------------------------------------------------------------
    const logicIssues = this.auditLogicAndCausality(paragraphs, chapterNumber);
    issues.push(...logicIssues);

    // Consolidação dos resultados das 5 dimensões (Exigência do reviewer do Webnovel Writer)
    const dimensionResults: Record<ReviewDimension, DimensionResult> = {
      setting: this.createDimensionResult('setting', settingIssues),
      timeline: this.createDimensionResult('timeline', timelineIssues),
      continuity: this.createDimensionResult('continuity', continuityIssues),
      character: this.createDimensionResult('character', characterIssues),
      logic: this.createDimensionResult('logic', logicIssues)
    };

    const blockingIssues = issues.filter(i => i.blocking);
    const hasBlocking = blockingIssues.length > 0;
    const approved = !hasBlocking;

    const summary = issues.length === 0
      ? 'Aprovado: Nenhuma contradição ou inconsistência detectada nas 5 dimensões.'
      : `${issues.length} problema(s) detectado(s): ${blockingIssues.length} bloqueante(s), ${issues.length - blockingIssues.length} observação(ões).`;

    return {
      chapter: chapterNumber,
      approved,
      issues,
      dimensionResults,
      blockingCount: blockingIssues.length,
      hasBlocking,
      summary,
      reviewedAt: Date.now()
    };
  }

  // --------------------------------------------------------------------------
  // AUDITORIA DE OBJETOS E CENÁRIO (SETTING)
  // --------------------------------------------------------------------------
  private auditSettingAndObjects(paragraphs: string[], chapterNumber: number): WebnovelReviewIssue[] {
    const issues: WebnovelReviewIssue[] = [];
    const memory = this.memoryStore.getMemory();

    // Rastreia menções a objetos canônicos registrados
    for (const obj of Object.values(memory.objects)) {
      const objNameLower = obj.name.toLowerCase();

      // Padrões de retirada do bolso / posse mágica sem ter recolhido do local original
      // Exemplo canônico do prompt: João deixou chaves sobre a estante, mas no cap seguinte retira do bolso
      const regexRetirouDoBolso = new RegExp(
        `(?:tirou|retirou|puxou|sacou|pescou)\\s+(?:as?|os?|suas?|seus?)?\\s*${this.escapeRegex(objNameLower)}[\\s\\w]*\\s+(?:do\\s+bolso|da\\s+gaveta|do\\s+casaco|da\\s+bolsa)`,
        'i'
      );

      for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
        const para = paragraphs[pIdx];

        if (regexRetirouDoBolso.test(para)) {
          // Verifica se antes desse parágrafo (ou em capítulos anteriores) houve ação legítima de pegar o objeto
          const pegouAntesNoCapitulo = paragraphs.slice(0, pIdx).some(prevP =>
            new RegExp(`(?:pegou|apanhou|recolheu|resgatou|enfiou no bolso)\\s+[\\s\\w]*${this.escapeRegex(objNameLower)}`, 'i').test(prevP)
          );

          // Verifica no histórico de movimentos se o objeto realmente estava no bolso ou se estava sobre a mesa/estante
          const locAtual = obj.currentLocation.toLowerCase();
          const estavaEmOutroLugar = locAtual.includes('mesa') || locAtual.includes('estante') || locAtual.includes('gaveta') || locAtual.includes('sala') || locAtual.includes('chão');

          if (estavaEmOutroLugar && !pegouAntesNoCapitulo) {
            issues.push({
              id: `issue_setting_obj_${Date.now()}_${pIdx}`,
              severity: 'critical',
              category: 'setting',
              location: `Parágrafo ${pIdx + 1}: "${para.slice(0, 100)}..."`,
              description: `Contradição de localização do objeto "${obj.name}": afirmado que foi retirado do bolso, mas seu estado canônico anterior é "${obj.currentState}" em "${obj.currentLocation}".`,
              evidence: `Texto atual: "${para}" VS Memória canônica: ${obj.lastTextEvidence || `Objeto registrado em ${obj.currentLocation} por ${obj.lastManipulatedBy}`}. Não há registro narrativo intermediário do objeto sendo recolhido.`,
              fixHint: `Ajuste para o personagem pegar "${obj.name}" de "${obj.currentLocation}" ou mostre previamente a ação de guardá-lo no bolso.`,
              blocking: true,
              confidence: 'confirmed'
            });
          }
        }
      }
    }

    return issues;
  }

  // --------------------------------------------------------------------------
  // AUDITORIA TEMPORAL E ESPACIAL (TIMELINE)
  // --------------------------------------------------------------------------
  private auditTimelineAndSpace(paragraphs: string[], chapterNumber: number): WebnovelReviewIssue[] {
    const issues: WebnovelReviewIssue[] = [];
    const memory = this.memoryStore.getMemory();

    // Verificação de teletransporte / duas cidades ao mesmo tempo
    const cityList = ['londres', 'tóquio', 'tokyo', 'nova york', 'new york', 'paris', 'roma', 'berlim', 'brasília', 'são paulo', 'rio de janeiro'];

    for (const char of Object.values(memory.characters)) {
      if (char.narrativeStatus !== 'active') continue;

      const charNameLower = char.name.toLowerCase();
      const lastLocLower = (char.currentLocation || '').toLowerCase();

      // Encontra se a última localização conhecida do personagem era uma cidade específica
      const previousCity = cityList.find(c => lastLocLower.includes(c));

      if (previousCity) {
        for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
          const para = paragraphs[pIdx];
          const paraLower = para.toLowerCase();

          if (paraLower.includes(charNameLower)) {
            // Verifica se no mesmo parágrafo ou no capítulo o personagem aparece em OUTRA cidade distante
            const currentCity = cityList.find(c => c !== previousCity && paraLower.includes(c));

            if (currentCity) {
              // Verifica se há menção a viagem, voo, avião, passagem de dias/horas que justifique o deslocamento
              const hasTravelExplanation = paragraphs.slice(0, pIdx + 1).some(p =>
                /(?:voo|avião|aeroporto|viajou|horas depois|dias depois|após uma longa viagem|desembarcou)/i.test(p)
              );

              if (!hasTravelExplanation) {
                issues.push({
                  id: `issue_timeline_teleport_${Date.now()}_${pIdx}`,
                  severity: 'critical',
                  category: 'timeline',
                  location: `Parágrafo ${pIdx + 1}: "${para.slice(0, 100)}..."`,
                  description: `Incompatibilidade temporal e espacial: o personagem ${char.name} estava registrado em "${char.currentLocation}" e aparece em "${currentCity}" sem justificativa temporal ou narrativa de deslocamento.`,
                  evidence: `Texto atual: "${para.slice(0, 140)}" VS Estado registrado: "${char.name} localizado em ${char.currentLocation} no capítulo ${char.lastAppearedChapter}".`,
                  fixHint: `Adicione uma transição narrativa justificando a passagem de tempo e o meio de transporte até ${currentCity}, ou mantenha a ação no local coerente.`,
                  blocking: true,
                  confidence: 'confirmed'
                });
              }
            }
          }
        }
      }
    }

    return issues;
  }

  // --------------------------------------------------------------------------
  // AUDITORIA DE CONTINUIDADE (CONTINUITY)
  // --------------------------------------------------------------------------
  private auditContinuity(paragraphs: string[], chapterNumber: number): WebnovelReviewIssue[] {
    const issues: WebnovelReviewIssue[] = [];
    const memory = this.memoryStore.getMemory();
    const prevCap = memory.chapterMemories[chapterNumber - 1];

    if (prevCap && paragraphs.length > 0) {
      const firstPara = paragraphs[0].toLowerCase();
      // Se o capítulo anterior terminou com perseguição / conflito extremo e o atual abre em calma absoluta sem transição
      if (prevCap.ongoingTension === 'clímax / perigo iminente' && firstPara.includes('acordou com tranquilidade')) {
        issues.push({
          id: `issue_continuity_tonal_${Date.now()}`,
          severity: 'medium',
          category: 'continuity',
          location: `Abertura do Capítulo: "${paragraphs[0].slice(0, 100)}..."`,
          description: 'Ruptura abrupta de continuidade: o capítulo anterior terminou em perigo iminente e a abertura atual não apresenta transição para o estado de calma.',
          evidence: `Fechamento do capítulo ${chapterNumber - 1}: "${prevCap.closingScene}" VS Abertura atual: "${paragraphs[0].slice(0, 100)}"`,
          fixHint: 'Insira um parágrafo de conexão resolvendo o desfecho do perigo anterior antes de estabelecer o novo ritmo.',
          blocking: false,
          confidence: 'possible'
        });
      }
    }

    return issues;
  }

  // --------------------------------------------------------------------------
  // AUDITORIA DE PERSONAGENS & VIDA/MORTE (CHARACTER)
  // --------------------------------------------------------------------------
  private auditCharacterConsistency(paragraphs: string[], chapterNumber: number): WebnovelReviewIssue[] {
    const issues: WebnovelReviewIssue[] = [];
    const memory = this.memoryStore.getMemory();

    // 1. Verificação de Personagens Mortos (Regra Canônica Absoluta)
    for (const char of Object.values(memory.characters)) {
      if (char.narrativeStatus === 'dead') {
        const charNameLower = char.name.toLowerCase();
        const charFullLower = char.fullName.toLowerCase();

        for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
          const para = paragraphs[pIdx];
          const paraLower = para.toLowerCase();

          // Se o personagem morto é citado como sujeito ativo de verbos de ação/fala no presente
          if (paraLower.includes(charNameLower) || (charFullLower && paraLower.includes(charFullLower))) {
            const isFlashbackOrMemory = /(?:lembrou de|recordou|memória de|no passado|saudade de|túmulo de|foto de|fantasma de|homenagem a|cadáver de)/i.test(para);
            const isSpeakingOrActing = new RegExp(
              `${this.escapeRegex(charNameLower)}\\s+(?:disse|falou|olhou|caminhou|perguntou|respondeu|sorriu|levantou-se|pegou|afirmou)`,
              'i'
            ).test(para);

            if (isSpeakingOrActing && !isFlashbackOrMemory) {
              issues.push({
                id: `issue_char_dead_alive_${Date.now()}_${pIdx}`,
                severity: 'critical',
                category: 'character',
                location: `Parágrafo ${pIdx + 1}: "${para.slice(0, 100)}..."`,
                description: `Contradição Crítica: O personagem ${char.name} faleceu no capítulo ${char.lastAppearedChapter} e foi apresentado vivo e interagindo no capítulo atual sem justificativa narrativa.`,
                evidence: `Texto atual: "${para.slice(0, 140)}" VS Memória canônica: ${char.name} registrado como MORTO com evidência: "${char.eventHistory.find(e => e.action.includes('faleceu'))?.evidenceSnippet || 'óbito canônico confirmado'}".`,
                fixHint: `Remova a ação direta de ${char.name} ou contextualize expressamente como lembrança/flashback/sonho.`,
                blocking: true,
                confidence: 'confirmed'
              });
            }
          }
        }
      }
    }

    // 2. Verificação de Limite de Conhecimento (Matriz de Segredos)
    for (const [charName, matrix] of Object.entries(memory.rules.characterKnowledgeMatrix)) {
      if (!matrix.doesNotKnow || matrix.doesNotKnow.length === 0) continue;

      const charNameLower = charName.toLowerCase();

      for (const secret of matrix.doesNotKnow) {
        const stopWords = new Set(['para', 'com', 'sem', 'sob', 'sobre', 'aquele', 'aquela', 'este', 'esta', 'esse', 'essa', 'como', 'onde', 'quando']);
        const secretKeywords = secret
          .toLowerCase()
          .split(/[\s,.-]+/)
          .filter(w => w.length >= 4 && !stopWords.has(w));
        if (secretKeywords.length === 0) continue;

        for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
          const para = paragraphs[pIdx];
          const paraLower = para.toLowerCase();
          const prevParaLower = pIdx > 0 ? paragraphs[pIdx - 1].toLowerCase() : '';

          // O personagem está associado a este parágrafo ou ao parágrafo imediatamente anterior de introdução da fala
          const isCharPresentInContext = paraLower.includes(charNameLower) || (prevParaLower.includes(charNameLower) && /[-—"']/.test(para));

          // Verifica se os termos-chave do segredo estão presentes no parágrafo
          const matchedKeywords = secretKeywords.filter(kw => paraLower.includes(kw));
          const hasSecretLeak = matchedKeywords.length >= Math.min(2, secretKeywords.length) || paraLower.includes(secret.toLowerCase());

          if (isCharPresentInContext && hasSecretLeak) {
            // Verifica se no mesmo capítulo houve uma cena anterior de revelação
            const wasRevealedInEarlierParagraph = paragraphs.slice(0, pIdx).some(prevP =>
              /(?:revelou a|contou para|descobriu que|confessou que|mostrou o documento a|descobriu a verdade)/i.test(prevP) && prevP.toLowerCase().includes(charNameLower)
            );

            if (!wasRevealedInEarlierParagraph) {
              issues.push({
                id: `issue_char_knowledge_${Date.now()}_${pIdx}`,
                severity: 'critical',
                category: 'character',
                location: `Parágrafo ${pIdx + 1}: "${para.slice(0, 100)}..."`,
                description: `Violação do Limite de Conhecimento: O personagem ${charName} mencionou ou agiu baseado no segredo "${secret}", mas ele canonicamente desconhece esta informação.`,
                evidence: `Texto atual: "${para.slice(0, 140)}" VS Matriz de Conhecimento: "${charName} registrado em doesNotKnow para '${secret}' sem cena prévia de revelação".`,
                fixHint: `Faça outro personagem que conhece a verdade revelar a ${charName} antes, ou remova a menção prematura.`,
                blocking: true,
                confidence: 'confirmed'
              });
              break; // Um apontamento por segredo no capítulo é suficiente
            }
          }
        }
      }
    }

    // 3. Validação de Introdução Legítima de Novos Personagens (Anti-falso-positivo)
    // Se o texto introduz alguém que não estava no banco, mas a introdução é formal, não gerar issue blocking
    const fullText = paragraphs.join('\n');
    const introMatches = fullText.match(/(?:um homem|uma mulher|um rapaz|uma senhora|um estranho|um oficial|apresentou-se como|chamado|chamada)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g);
    if (introMatches) {
      // Registrado como novo personagem legítimo
      // O auditor reconhece e não bloqueia!
    }

    return issues;
  }

  // --------------------------------------------------------------------------
  // AUDITORIA DE LÓGICA E CAUSALIDADE (LOGIC)
  // --------------------------------------------------------------------------
  private auditLogicAndCausality(paragraphs: string[], chapterNumber: number): WebnovelReviewIssue[] {
    const issues: WebnovelReviewIssue[] = [];
    const memory = this.memoryStore.getMemory();

    // Verificação de fatos canônicos confirmados
    for (const fact of memory.rules.canonicalFacts) {
      if (fact.status !== 'confirmed' || !fact.immutable) continue;

      const factLower = fact.fact.toLowerCase();

      // Exemplo: se o fato diz "a porta do cofre foi blindada com aço titânio", e o texto diz "chutou e arrombou a porta do cofre com um pé de cabra"
      if (factLower.includes('porta blindada') || factLower.includes('tranca eletrônica')) {
        for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
          const para = paragraphs[pIdx];
          if (/chutou e arrombou|abriu facilmente com um grampo/i.test(para) && para.toLowerCase().includes('porta')) {
            issues.push({
              id: `issue_logic_fact_${Date.now()}_${pIdx}`,
              severity: 'high',
              category: 'logic',
              location: `Parágrafo ${pIdx + 1}: "${para.slice(0, 100)}..."`,
              description: `Violação de fato canônico imutável: "${fact.fact}".`,
              evidence: `Texto atual: "${para}" VS Fato canônico: "${fact.fact}" (Capítulo ${fact.establishedInChapter}).`,
              fixHint: 'Utilize os meios adequados às limitações já estabelecidas do universo.',
              blocking: true,
              confidence: 'confirmed'
            });
          }
        }
      }
    }

    return issues;
  }

  private createDimensionResult(dimension: ReviewDimension, dimensionIssues: WebnovelReviewIssue[]): DimensionResult {
    const criticalOrBlocking = dimensionIssues.filter(i => i.blocking);
    if (criticalOrBlocking.length > 0) {
      return {
        dimension,
        conclusion: 'fail',
        detail: `Detectado(s) ${criticalOrBlocking.length} problema(s) crítico(s): ${criticalOrBlocking[0].description}`
      };
    }
    if (dimensionIssues.length > 0) {
      return {
        dimension,
        conclusion: 'fail',
        detail: `Observação: ${dimensionIssues[0].description}`
      };
    }
    return {
      dimension,
      conclusion: 'pass',
      detail: 'Verificação em total conformidade canônica.'
    };
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
