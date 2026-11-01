// ============================================================================
// BOOKENGIN — EDITORA MULTIAGENTES AUTÔNOMA E MEMÓRIA EDITORIAL PERSISTENTE
// Arquitetura Multiagentes com 10 Papéis Especializados, Memória Narrativa
// Estruturada em 3 Níveis e Orquestrador de Estados Persistente.
//
// REGRA INEGOCIÁVEL: NÃO MODIFICAR O LIVRO "THE SILENT COLD" (REFERÊNCIA DIAGNÓSTICA).
// ============================================================================

import { localDatabase } from '../database/local-database';
import {
  normalizeChapterHeading,
  isIncompleteTitle,
  repairIncompleteTitle,
  shortenTitleSafely,
  buildStructuredToc,
  validateChapterStructure,
} from './chapter-structure';
import {
  KdpFormatSelector,
  LayoutQaAgent,
  WriteLockManager,
  type SupportedKdpFormat,
  type LayoutQaReport,
} from './autonomous-editorial-pipeline';
import { UniversalEditorialAuditor, type UniversalAuditResult } from './universal-editorial-auditor';
import type { BuildPdfResult } from './kdp-pdf-builder';
import type { BookGlobalMemory } from './book-sequential-writing-engine';

// ----------------------------------------------------------------------------
// 1. TIPOS DA MEMÓRIA EDITORIAL E DOS AGENTES
// ----------------------------------------------------------------------------

export interface CharacterProfile {
  id: string;
  name: string;
  fullName: string;
  role: 'protagonista' | 'antagonista' | 'coadjuvante' | 'mencao';
  profession: string; // IMUTÁVEL: nunca pode mudar ao longo da obra
  age?: number | string;
  physicalAppearance: string;
  personality: string;
  background: string;
  relationships: Record<string, string>;
  goals: string[];
  currentLocation: string;
  physicalState: string;
  emotionalState: string;
  lastAppearedChapter: number;
}

export interface CanonicalLocation {
  id: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  floor?: string | number;
  address?: string;
  description: string;
}

export interface EstablishedFact {
  id: string;
  fact: string;
  establishedInChapter: number;
  category: 'character' | 'location' | 'event' | 'rule' | 'evidence';
  immutable: boolean;
}

export interface CharacterSuspicion {
  id: string;
  characterName: string;
  suspicion: string;
  chapter: number;
  isConfirmed?: boolean;
}

export interface PlannedRevelation {
  id: string;
  plannedChapter: number;
  revelation: string;
  revealed: boolean;
  actualRevealedChapter?: number;
}

export interface TrackedItemEvidence {
  id: string;
  name: string;
  description: string;
  introducedInChapter: number;
  resolvedInChapter?: number;
  status: 'pendente' | 'resolvido';
}

export interface ChapterSummaryState {
  chapterNumber: number;
  title: string;
  factualSummary: string;
  closingScene: string;
  endingLocation: {
    name: string;
    city?: string;
    floor?: string | number;
  };
  timeOfDay?: string;
  charactersPresent: string[];
  cliffhangerHook: string;
}

/**
 * BOOKENGIN EDITORIAL MEMORY
 * Estrutura de memória narrativa persistente global por projeto.
 */
export interface BookEnginEditorialMemory {
  bookId: string;
  version: number;
  updatedAt: string;
  storyBible: {
    title: string;
    subtitle?: string;
    author: string;
    genre: string;
    subgenre?: string;
    targetAudience: string;
    language: string;
    centralPremise: string;
    mainTheme: string;
    readerPromise: string;
    plannedEnding: string;
    totalPlannedChapters: number;
  };
  characters: CharacterProfile[];
  locations: CanonicalLocation[];
  fatosEstabelecidos: EstablishedFact[];
  suspeitasPersonagens: CharacterSuspicion[];
  revelacoesPlanejadas: PlannedRevelation[];
  evidenciasObjetos: TrackedItemEvidence[];
  resumosCapitulos: ChapterSummaryState[];
}

export type ProductionStageId =
  | 'planejamento'
  | 'escrita'
  | 'revisao_editorial'
  | 'revisao_linguistica'
  | 'diagramacao'
  | 'auditoria_final';

export type ProductionStageStatus = 'pendente' | 'em_execucao' | 'concluido' | 'atencao';

export interface ProductionStageCardInfo {
  id: ProductionStageId;
  order: number;
  title: string;
  status: ProductionStageStatus;
  progressReal: string;
  currentWork: string;
  pendingIssues: string[];
}

export interface ProductionStateMachine {
  bookId: string;
  overallStatus: 'IDLE' | 'EXECUTANDO' | 'PAUSADO' | 'CONCLUIDO' | 'ERRO';
  currentStage: ProductionStageId;
  currentChapter: number;
  totalChapters: number;
  tasksCompleted: number;
  totalTasks: number;
  statusMessage: string;
  stages: Record<ProductionStageId, ProductionStageCardInfo>;
  resolvedIssuesCount: number;
  pendingIssuesCount: number;
  kdpFormat?: SupportedKdpFormat;
  totalPages?: number;
  pdfAvailable: boolean;
  epubAvailable: boolean;
  finalAuditStatus?: 'APROVADA NA AUDITORIA EDITORIAL INTERNA' | 'REVISÃO NECESSÁRIA';
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// 2. GUARDA ABSOLUTA DE SEGURANÇA PARA "THE SILENT COLD"
// ----------------------------------------------------------------------------
export function assertNotDiagnosticBook(bookTitleOrId?: string): void {
  if (!bookTitleOrId) return;
  const normalized = bookTitleOrId.toLowerCase().replace(/[-_]/g, ' ');
  if (normalized.includes('the silent cold') || normalized.includes('silent cold')) {
    throw new Error(
      'BLOQUEIO DE SEGURANÇA EDITORIAL: "The Silent Cold" é exclusivamente uma referência diagnóstica. É estritamente proibido modificar, reescrever ou alterar este livro.'
    );
  }
}

// ----------------------------------------------------------------------------
// 3. EDITORA MULTIAGENTES AUTÔNOMA (10 PAPÉIS)
// ----------------------------------------------------------------------------
export class BookEnginEditorialHouse {
  /**
   * Agente 1 — Diretor Editorial
   * Supervisiona qualidade, público-alvo, gênero, planejamento e consistência geral.
   */
  static agent1EditorialDirector(params: {
    title: string;
    genre: string;
    targetAudience: string;
    language: string;
    premise: string;
  }): {
    approved: boolean;
    guidelines: string;
    warnings: string[];
  } {
    assertNotDiagnosticBook(params.title);
    const warnings: string[] = [];

    if (!params.title.trim()) warnings.push('Título da obra está vazio.');
    if (!params.premise.trim()) warnings.push('Premissa editorial da obra está vazia.');

    const guidelines = `DIRETORIA EDITORIAL: Obra "${params.title}" no gênero "${params.genre}", direcionada a "${params.targetAudience}" em idioma "${params.language}". Padrão estrito de publicação comercial KDP sem ambiguidades.`;

    return {
      approved: warnings.length === 0,
      guidelines,
      warnings,
    };
  }

  /**
   * Agente 2 — Arquiteto Narrativo
   * Planeja a Bíblia Narrativa, capítulos, conflitos, evolução de personagens e desfecho.
   */
  static agent2NarrativeArchitect(params: {
    bookId: string;
    title: string;
    subtitle?: string;
    author: string;
    genre: string;
    subgenre?: string;
    targetAudience: string;
    language: string;
    premise: string;
    plannedChapters: number;
    existingCharacters?: CharacterProfile[];
    existingLocations?: CanonicalLocation[];
  }): BookEnginEditorialMemory {
    assertNotDiagnosticBook(params.title);

    const plannedChapters = Math.max(1, params.plannedChapters);

    // Inicializa memória estruturada com separação tripartite
    const memory: BookEnginEditorialMemory = {
      bookId: params.bookId,
      version: 1,
      updatedAt: new Date().toISOString(),
      storyBible: {
        title: params.title,
        subtitle: params.subtitle,
        author: params.author,
        genre: params.genre,
        subgenre: params.subgenre,
        targetAudience: params.targetAudience,
        language: params.language,
        centralPremise: params.premise,
        mainTheme: params.genre,
        readerPromise: `Uma narrativa sólida e impactante de ${params.genre} com começo, meio e desfecho plenamente amarrados.`,
        plannedEnding: `Resolução definitiva de todos os arcos centrais no capítulo ${plannedChapters}.`,
        totalPlannedChapters: plannedChapters,
      },
      characters: params.existingCharacters || [],
      locations: params.existingLocations || [],
      fatosEstabelecidos: [
        {
          id: `fact_init_${Date.now()}`,
          fact: `Premissa canônica inegociável: ${params.premise}`,
          establishedInChapter: 1,
          category: 'event',
          immutable: true,
        },
        ...(params.existingCharacters || []).map((c, idx) => ({
          id: `fact_char_${idx}_${Date.now()}`,
          fact: `Personagem ${c.name} (${c.fullName}) exerce a profissão canônica imutável de ${c.profession}.`,
          establishedInChapter: 1,
          category: 'character' as const,
          immutable: true,
        })),
      ],
      suspeitasPersonagens: [],
      revelacoesPlanejadas: [
        {
          id: `rev_final_${Date.now()}`,
          plannedChapter: plannedChapters,
          revelation: `Desfecho e confronto final decisivo planejado para o encerramento da obra.`,
          revealed: false,
        },
      ],
      evidenciasObjetos: [],
      resumosCapitulos: [],
    };

    return memory;
  }

  /**
   * Converte BookGlobalMemory legada para BookEnginEditorialMemory moderna.
   */
  static fromGlobalMemory(gm: BookGlobalMemory): BookEnginEditorialMemory {
    assertNotDiagnosticBook(gm.identity.title);

    return {
      bookId: gm.bookId,
      version: gm.version || 1,
      updatedAt: gm.updatedAt || new Date().toISOString(),
      storyBible: {
        title: gm.identity.title,
        subtitle: gm.identity.subtitle,
        author: gm.identity.author,
        genre: gm.identity.genre,
        subgenre: gm.identity.subgenre,
        targetAudience: gm.identity.targetAudience,
        language: gm.identity.language,
        centralPremise: gm.identity.centralPremise,
        mainTheme: gm.identity.mainTheme,
        readerPromise: gm.identity.readerPromise || 'Narrativa coesa e profissional.',
        plannedEnding: 'Conclusão e amarração completa de todos os arcos.',
        totalPlannedChapters: gm.identity.plannedChapters || 10,
      },
      characters: (gm.characters || []).map(c => ({
        id: c.id,
        name: c.name,
        fullName: c.fullName || c.name,
        role: (c.narrativeStatus === 'active' ? 'protagonista' : 'coadjuvante') as 'protagonista' | 'coadjuvante',
        profession: c.profession,
        age: c.age,
        physicalAppearance: c.physicalAppearance || 'Aparência canônica',
        personality: c.personality || 'Personalidade canônica',
        background: c.background || 'Histórico canônico',
        relationships: c.relationships || {},
        goals: c.goals || [],
        currentLocation: c.currentLocation || 'Cenário principal',
        physicalState: c.physicalState || 'Ativo',
        emotionalState: c.emotionalState || 'Normal',
        lastAppearedChapter: 1,
      })),
      locations: (gm.locations || []).map(l => ({
        id: l.id,
        name: l.name,
        city: l.city || 'Cidade canônica',
        state: l.state,
        country: l.country || 'Estados Unidos',
        floor: l.floor,
        address: l.address,
        description: l.spatialLayout || l.propertyType || l.name,
      })),
      fatosEstabelecidos: (gm.canonicalFacts || []).map(f => ({
        id: f.id,
        fact: f.fact,
        establishedInChapter: f.establishedInChapter,
        category: (f.category === 'character' || f.category === 'location' || f.category === 'event' || f.category === 'rule')
          ? f.category
          : ('event' as const),
        immutable: f.immutable ?? true,
      })),
      suspeitasPersonagens: [],
      revelacoesPlanejadas: [],
      evidenciasObjetos: (gm.trackedElements || []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        introducedInChapter: t.introducedInChapter,
        resolvedInChapter: t.resolvedInChapter,
        status: t.status === 'resolved' ? ('resolvido' as const) : ('pendente' as const),
      })),
      resumosCapitulos: [],
    };
  }

  /**
   * Constrói o contexto ultra-completo para o Agente 3 (Escritor).
   * Alimenta a IA com fichas canônicas de personagens, profissões imutáveis,
   * fatos estabelecidos, suspeitas dos personagens e estado do capítulo anterior.
   */
  static buildWriterPrompt(params: {
    memory: BookEnginEditorialMemory;
    chapterNumber: number;
    totalChapters: number;
    lastChapterState?: ChapterSummaryState | null;
    chapterDirective?: {
      title?: string;
      objective?: string;
      keyPoints?: string[];
      transition?: string;
    };
  }): {
    systemContext: string;
    userContext: string;
  } {
    const { memory, chapterNumber, totalChapters, lastChapterState, chapterDirective } = params;

    // Fatos estabelecidos que NUNCA podem ser contraditos
    const fatosText =
      memory.fatosEstabelecidos.length > 0
        ? memory.fatosEstabelecidos.map((f, i) => `${i + 1}. [CANÔNICO] ${f.fact}`).join('\n')
        : 'Nenhum fato canônico adicional estabelecido.';

    // Fichas de personagens com profissão imutável
    const personagensText =
      memory.characters.length > 0
        ? memory.characters
            .map(
              c =>
                `• ${c.name} (${c.fullName || c.name}): Papel ${c.role}. PROFISSÃO IMUTÁVEL: "${c.profession || 'Canônica'}". Local atual: ${c.currentLocation || 'Cenário ativo'}. Estado: ${c.physicalState || 'Ativo'}, ${c.emotionalState || 'Normal'}.`
            )
            .join('\n')
        : 'Personagens serão estabelecidos organicamente e congelados na memória editorial.';

    // Suspeitas dos personagens vs revelações planejadas (tripartite separation)
    const suspeitasText =
      memory.suspeitasPersonagens.length > 0
        ? memory.suspeitasPersonagens
            .map(s => `• ${s.characterName} suspeita que: "${s.suspicion}" (Pode conter engano/visão parcial).`)
            .join('\n')
        : 'Nenhuma suspeita divergente registrada.';

    const revelacoesFuturasText = memory.revelacoesPlanejadas
      .filter(r => !r.revealed && r.plannedChapter > chapterNumber)
      .map(r => `• Proibido revelar antes do Cap. ${r.plannedChapter}: ${r.revelation}`)
      .join('\n');

    // Estado do capítulo anterior
    let anteriorText = 'Abertura da obra: Estabeleça o cenário, personagens e incidente incitante.';
    if (lastChapterState) {
      anteriorText = `CENA FINAL DO CAPÍTULO ANTERIOR (Cap. ${lastChapterState.chapterNumber}: "${lastChapterState.title}"):
- Local de término: ${lastChapterState.endingLocation.name}${lastChapterState.endingLocation.floor ? ` (${lastChapterState.endingLocation.floor})` : ''}
- Personagens presentes na cena: ${lastChapterState.charactersPresent.join(', ') || 'Protagonista'}
- Fechamento imediato: "${lastChapterState.closingScene.slice(-220)}"
- Gancho (cliffhanger): "${lastChapterState.cliffhangerHook}"`;
    }

    const isLastChapter = chapterNumber >= totalChapters;
    const isEnglish = /ingl|en/i.test(memory.storyBible.language);

    const systemContext = `BÍBLIA EDITORIAL GLOBAL — BOOKENGIN EDITORIAL MEMORY:
Título da Obra: "${memory.storyBible.title}"
Autor: ${memory.storyBible.author} | Idioma: ${memory.storyBible.language}
Gênero: ${memory.storyBible.genre} | Público: ${memory.storyBible.targetAudience}
Premissa Central da Obra: ${memory.storyBible.centralPremise}

FATOS ESTABELECIDOS INEGOCIÁVEIS (NUNCA CONTRADIZER):
${fatosText}

PERSONAGENS CANÔNICOS (PROFISSÕES E IDENTIDADES IMUTÁVEIS):
${personagensText}

SUSPEITAS DOS PERSONAGENS (DIFERENTES DE FATOS):
${suspeitasText}

${revelacoesFuturasText ? `SEGREDO NARRATIVO RETIDO:\n${revelacoesFuturasText}\n` : ''}
REGRAS INEGOCIÁVEIS DE ESCRITA:
1. NUNCA altere a profissão, idade ou identidade de um personagem.
2. NUNCA use frases artificiais como "no capítulo anterior" ou "como vimos no capítulo passado".
3. Mantenha 100% de consistência no idioma (${memory.storyBible.language}). Não misture línguas.
4. Conecte a abertura deste capítulo diretamente com o local e personagens onde o anterior terminou.
${isLastChapter ? '5. DESFECHO DEFINITIVO: Este é o último capítulo da obra inteira. Você DEVE solucionar os conflitos e entregar o desfecho satisfatório prometido ao leitor.' : '5. NÃO encerre a trama antes da hora. Mantenha os arcos em aberto até o clímax final.'}`;

    const userContext = `━━━ DIRETRIZ DO CAPÍTULO ${chapterNumber} DE ${totalChapters} ━━━
Título Planejado: ${chapterDirective?.title || `Capítulo ${chapterNumber}`}
Objetivo Narrativo: ${chapterDirective?.objective || 'Desenvolver a progressão dramática e causal.'}
Pontos-Chave: ${(chapterDirective?.keyPoints || []).map(p => `- ${p}`).join('\n') || '- Manter coerência e progressão orgânica'}
Transição: ${chapterDirective?.transition || 'Conectar de forma contínua com a próxima etapa.'}

FICHAS DOS PERSONAGENS ATIVOS:
${personagensText}

${anteriorText}

Escreva o capítulo completo em prosa editorial de alta qualidade, parágrafos limpos e diálogos pontuados por travessão (—).`;

    return { systemContext, userContext };
  }

  /**
   * Agente 4 — Editor de Continuidade
   * Agente 5 — Editor Literário
   * Agente 6 — Revisor Linguístico
   * Executa a auditoria tripla imediata pós-escrita do capítulo.
   */
  static verifyChapterTriplePass(params: {
    chapterText: string;
    chapterTitle: string;
    chapterNumber: number;
    totalChapters: number;
    memory: BookEnginEditorialMemory;
    lastChapterState?: ChapterSummaryState | null;
  }): {
    valid: boolean;
    issues: Array<{
      agent: 'Editor de Continuidade' | 'Editor Literário' | 'Revisor Linguístico';
      category: string;
      severity: 'CRITICO' | 'ALTO' | 'MEDIO';
      description: string;
      original: string;
      suggestedFix: string;
    }>;
  } {
    const { chapterText, chapterTitle, chapterNumber, totalChapters, memory, lastChapterState } = params;
    const issues: Array<{
      agent: 'Editor de Continuidade' | 'Editor Literário' | 'Revisor Linguístico';
      category: string;
      severity: 'CRITICO' | 'ALTO' | 'MEDIO';
      description: string;
      original: string;
      suggestedFix: string;
    }> = [];

    // 1. Agente 4: Continuidade de Personagens e Profissões
    for (const char of memory.characters) {
      if (char.profession && char.name) {
        // Detecta se alguém chamou o personagem por outra profissão conflitante
        const wrongProfRegex = new RegExp(`\\b${char.name}\\b[^.\\n]{0,80}\\b(?:o|a)?\\s*(m[eé]dic[oa]|advogad[oa]|policial|detetive|jornalista|engenheir[oa]|professor[a]?|psic[oó]log[oa]|promotor[a]?)\\b`, 'i');
        const match = chapterText.match(wrongProfRegex);
        if (match) {
          const mentionedProf = match[1].toLowerCase();
          const canonicalProf = char.profession.toLowerCase();
          if (!canonicalProf.includes(mentionedProf) && !mentionedProf.includes(canonicalProf)) {
            issues.push({
              agent: 'Editor de Continuidade',
              category: 'profissao_mutada',
              severity: 'CRITICO',
              description: `Profissão do personagem "${char.name}" foi alterada para "${match[1]}", mas sua profissão canônica é "${char.profession}".`,
              original: match[0],
              suggestedFix: `${char.name}, ${char.profession}`,
            });
          }
        }
      }

      // Mutação de sobrenome
      if (char.fullName) {
        const parts = char.fullName.split(/\s+/);
        if (parts.length > 1) {
          const firstName = parts[0];
          const lastName = parts[parts.length - 1];
          const surnameRegex = new RegExp(`\\b${firstName}\\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)\\b`, 'g');
          let sm: RegExpExecArray | null;
          while ((sm = surnameRegex.exec(chapterText)) !== null) {
            if (sm[1].toLowerCase() !== lastName.toLowerCase()) {
              issues.push({
                agent: 'Editor de Continuidade',
                category: 'mutacao_sobrenome',
                severity: 'CRITICO',
                description: `Sobrenome de "${char.fullName}" mutou para "${sm[0]}".`,
                original: sm[0],
                suggestedFix: `${firstName} ${lastName}`,
              });
            }
          }
        }
      }
    }

    // 2. Agente 4: Continuidade de Local / Andar
    for (const loc of memory.locations) {
      if (loc.floor) {
        const floorStr = String(loc.floor).toLowerCase();
        const wrongFloorRegex = /(?:quarto|quinto|sexto|s[eé]timo|oitavo|nono|d[eé]cimo|4[ºoªa]|8[ºoªa])\s+andar/gi;
        const matches = chapterText.match(wrongFloorRegex);
        if (matches) {
          for (const m of matches) {
            const isMatch =
              (floorStr.includes('4') && (m.includes('4') || m.toLowerCase().includes('quarto'))) ||
              (floorStr.includes('8') && (m.includes('8') || m.toLowerCase().includes('oitavo')));
            if (!isMatch) {
              issues.push({
                agent: 'Editor de Continuidade',
                category: 'andar_divergente',
                severity: 'CRITICO',
                description: `Local "${loc.name}" fica no ${loc.floor}, mas o capítulo mencionou "${m}".`,
                original: m,
                suggestedFix: String(loc.floor),
              });
            }
          }
        }
      }
    }

    // 3. Agente 5: Editor Literário (Proibição de meta-referências como "no capítulo anterior")
    const metaRegex = /\b(?:como\s+vimos\s+)?no\s+cap[ií]tulo\s+(?:anterior|passado)\s*,?\s*|\bin\s+the\s+(?:previous|last)\s+chapter\s*,?\s*/gi;
    const metaMatches = chapterText.match(metaRegex);
    if (metaMatches) {
      for (const mm of metaMatches) {
        issues.push({
          agent: 'Editor Literário',
          category: 'referencia_artificial',
          severity: 'ALTO',
          description: `Referência artificial desnecessária dentro da narrativa ficcional ("${mm.trim()}").`,
          original: mm,
          suggestedFix: '',
        });
      }
    }

    // 4. Agente 6: Revisor Linguístico (Títulos incompletos, diálogos e resíduos de IA)
    if (isIncompleteTitle(chapterTitle)) {
      issues.push({
        agent: 'Revisor Linguístico',
        category: 'titulo_incompleto',
        severity: 'ALTO',
        description: `Título do capítulo "${chapterTitle}" está incompleto ou terminado em conectivo.`,
        original: chapterTitle,
        suggestedFix: repairIncompleteTitle(chapterTitle),
      });
    }

    const aiResidueRegex = /(&&|\|\||\$\$|\b\[PROMPT\]\b|\bundefined\b)/g;
    const residueMatch = chapterText.match(aiResidueRegex);
    if (residueMatch) {
      issues.push({
        agent: 'Revisor Linguístico',
        category: 'residuo_ia',
        severity: 'CRITICO',
        description: `Resíduo técnico de código/prompt detectado no texto ("${residueMatch[0]}").`,
        original: residueMatch[0],
        suggestedFix: '',
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'CRITICO' || i.severity === 'ALTO').length === 0,
      issues,
    };
  }

  /**
   * Agente 9 — Corretor Autônomo
   * Executa correções cirúrgicas preservando 100% da voz do autor e o texto já correto.
   */
  static agent9AutonomousCorrector(
    chapterText: string,
    chapterTitle: string,
    issues: ReturnType<typeof BookEnginEditorialHouse.verifyChapterTriplePass>['issues']
  ): {
    fixedText: string;
    fixedTitle: string;
    correctionsAppliedCount: number;
  } {
    let text = chapterText;
    let title = chapterTitle;
    let count = 0;

    for (const iss of issues) {
      if (iss.category === 'profissao_mutada' && iss.suggestedFix) {
        text = text.replace(new RegExp(iss.original, 'g'), iss.suggestedFix);
        count++;
      } else if (iss.category === 'mutacao_sobrenome' && iss.suggestedFix) {
        text = text.replace(new RegExp(`\\b${iss.original}\\b`, 'g'), iss.suggestedFix);
        count++;
      } else if (iss.category === 'andar_divergente' && iss.suggestedFix) {
        text = text.replace(new RegExp(iss.original, 'gi'), iss.suggestedFix);
        count++;
      } else if (iss.category === 'meta_referencia_artificial' || iss.category === 'referencia_artificial') {
        text = text.replace(new RegExp(iss.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
        text = text.replace(/(^|\n\s*|[.!?]\s+)([a-záéíóúâêôãõç])/gm, (_m, p1, p2) => `${p1}${p2.toUpperCase()}`);
        count++;
      } else if (iss.category === 'titulo_incompleto' && iss.suggestedFix) {
        title = iss.suggestedFix;
        count++;
      } else if (iss.category === 'residuo_ia') {
        text = text.replace(new RegExp(iss.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
        count++;
      }
    }

    return {
      fixedText: text,
      fixedTitle: title,
      correctionsAppliedCount: count,
    };
  }

  /**
   * Atualiza a Memória Editorial Global após aprovação do capítulo.
   */
  static updateMemoryAfterChapter(params: {
    memory: BookEnginEditorialMemory;
    chapterNumber: number;
    title: string;
    text: string;
  }): {
    updatedMemory: BookEnginEditorialMemory;
    newChapterState: ChapterSummaryState;
  } {
    const { memory, chapterNumber, title, text } = params;

    const paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const opening = paras[0]?.slice(0, 160) || 'Início da cena.';
    const closing = paras[paras.length - 1]?.slice(0, 220) || 'Fechamento da cena.';
    const sentences = closing.split(/[.!?]\s+/).filter(Boolean);
    const cliffhangerHook = sentences.slice(-2).join('. ') || closing;

    let endingLocName = 'Ambiente final do capítulo';
    let endingFloor: string | undefined = undefined;
    for (const loc of memory.locations) {
      if (new RegExp(`\\b${loc.name}\\b`, 'i').test(closing)) {
        endingLocName = loc.name;
        endingFloor = loc.floor ? String(loc.floor) : undefined;
        break;
      }
    }

    const presentChars: string[] = [];
    for (const char of memory.characters) {
      if (new RegExp(`\\b${char.name}\\b`, 'i').test(text)) {
        presentChars.push(char.name);
        char.lastAppearedChapter = chapterNumber;
      }
    }

    const newSummary: ChapterSummaryState = {
      chapterNumber,
      title,
      factualSummary: `${opening.slice(0, 100)}... Fechamento: ${closing.slice(0, 110)}`,
      closingScene: closing,
      endingLocation: {
        name: endingLocName,
        floor: endingFloor,
      },
      charactersPresent: presentChars,
      cliffhangerHook,
    };

    memory.resumosCapitulos.push(newSummary);
    memory.version += 1;
    memory.updatedAt = new Date().toISOString();

    return {
      updatedMemory: memory,
      newChapterState: newSummary,
    };
  }

  /**
   * Agente 8 — Auditor Editorial
   * Agente 6 — Revisor Linguístico
   * Executa a revisão global completa do manuscrito antes da diagramação.
   */
  static async executeGlobalReview(params: {
    bookId: string;
    title: string;
    subtitle?: string;
    author: string;
    genre: string;
    language: string;
    chapters: Array<{ titulo: string; texto: string }>;
  }): Promise<{
    auditResult: UniversalAuditResult;
    repairedChapters: Array<{ titulo: string; texto: string }>;
  }> {
    assertNotDiagnosticBook(params.title);

    const universal = await UniversalEditorialAuditor.runUniversalAudit(
      {
        titulo: params.title,
        subtitulo: params.subtitle,
        autor: params.author,
        genero: params.genre,
        idioma: params.language,
        capitulos: params.chapters,
      },
      { autoFixSafeIssues: true }
    );

    const repairedChapters = universal.livroRevisado.capitulos.map((c, idx) => {
      const norm = normalizeChapterHeading(c.titulo, idx + 1, params.language, c.texto);
      return {
        titulo: norm.cleanTitle,
        texto: c.texto,
      };
    });

    return {
      auditResult: universal.auditResult,
      repairedChapters,
    };
  }

  /**
   * Agente 7 — Diagramador Editorial
   * Prepara o miolo KDP no formato ideal, margens com medianiz, tipografia e gera PDF e EPUB.
   */
  static async executeEditorialTypesetting(params: {
    bookId: string;
    title: string;
    subtitle?: string;
    author: string;
    genre: string;
    language: string;
    chapters: Array<{ titulo: string; texto: string; imagemDataUrl?: string | null }>;
    capaDataUrl?: string | null;
    contracapaDataUrl?: string | null;
    requestedFormat?: string;
    incluirCapaNoMiolo?: boolean;
  }): Promise<{
    qaReport: LayoutQaReport;
    pdfResult: BuildPdfResult;
    epubBlob: Blob;
  }> {
    assertNotDiagnosticBook(params.title);

    return await LayoutQaAgent.inspectGeneratedFiles({
      bookId: params.bookId,
      title: params.title,
      subtitle: params.subtitle,
      author: params.author,
      genre: params.genre,
      language: params.language,
      approvedChapters: params.chapters,
      capaDataUrl: params.capaDataUrl,
      contracapaDataUrl: params.contracapaDataUrl,
      requestedFormat: params.requestedFormat,
      incluirCapaNoMiolo: params.incluirCapaNoMiolo,
    });
  }

  /**
   * Agente 10 — Auditor Independente
   * Realiza a verificação final de 10 critérios e atesta aprovação interna.
   */
  static executeFinalIndependentAudit(params: {
    memory: BookEnginEditorialMemory;
    chapters: Array<{ titulo: string; texto: string }>;
    layoutReport: LayoutQaReport;
    globalAuditResult: UniversalAuditResult;
  }): {
    approved: boolean;
    status: 'APROVADA NA AUDITORIA EDITORIAL INTERNA' | 'REVISÃO NECESSÁRIA';
    criteriaPassedCount: number;
    checklist: Record<string, boolean>;
  } {
    const { memory, chapters, layoutReport, globalAuditResult } = params;

    const checklist: Record<string, boolean> = {
      todas_as_partes_processadas: chapters.length === memory.storyBible.totalPlannedChapters,
      titulos_completos: chapters.every(c => !isIncompleteTitle(c.titulo)),
      numeracao_unica_sumario: !layoutReport.duplicateTocNumbering,
      sem_referencias_artificiais: !chapters.some(c => /no capítulo anterior/i.test(c.texto)),
      preservacao_palavras_manuscrito: layoutReport.manuscriptWordsPreserved,
      cabecalhos_sem_cortes: !layoutReport.headersCutOrTruncated,
      pdf_kdp_valido: layoutReport.pdfValidation.ok,
      epub_valido: layoutReport.epubValidation.ok,
      zero_erros_criticos_globais: globalAuditResult.metrics.criticalCount === 0,
      idioma_consistente: globalAuditResult.status === 'APROVADA NA AUDITORIA EDITORIAL',
    };

    const criteriaPassedCount = Object.values(checklist).filter(Boolean).length;
    const approved = criteriaPassedCount === Object.keys(checklist).length;

    return {
      approved,
      status: approved ? 'APROVADA NA AUDITORIA EDITORIAL INTERNA' : 'REVISÃO NECESSÁRIA',
      criteriaPassedCount,
      checklist,
    };
  }

  /**
   * Inicializa o estado persistente das 6 etapas da interface de Escrita e Refinamento.
   */
  static createInitialProductionState(bookId: string, totalChapters: number): ProductionStateMachine {
    assertNotDiagnosticBook(bookId);

    return {
      bookId,
      overallStatus: 'IDLE',
      currentStage: 'planejamento',
      currentChapter: 0,
      totalChapters,
      tasksCompleted: 0,
      totalTasks: totalChapters + 5,
      statusMessage: 'Pronto para iniciar a produção editorial automática.',
      stages: {
        planejamento: {
          id: 'planejamento',
          order: 1,
          title: '1. Planejamento & Bíblia Editorial',
          status: 'pendente',
          progressReal: 'Aguardando início',
          currentWork: 'Construir a Bíblia Narrativa e ficha canônica de personagens.',
          pendingIssues: [],
        },
        escrita: {
          id: 'escrita',
          order: 2,
          title: '2. Escrita Sequencial dos Capítulos',
          status: 'pendente',
          progressReal: `0 de ${totalChapters} capítulos escritos`,
          currentWork: 'Aguardando início da redação sequencial contínua.',
          pendingIssues: [],
        },
        revisao_editorial: {
          id: 'revisao_editorial',
          order: 3,
          title: '3. Revisão Editorial & Continuidade',
          status: 'pendente',
          progressReal: 'Pendente',
          currentWork: 'Checagem de locais, personagens, fatos e cronologia.',
          pendingIssues: [],
        },
        revisao_linguistica: {
          id: 'revisao_linguistica',
          order: 4,
          title: '4. Revisão Linguística & Ortografia',
          status: 'pendente',
          progressReal: 'Pendente',
          currentWork: 'Ortografia, pontuação de diálogos e unificação de idioma.',
          pendingIssues: [],
        },
        diagramacao: {
          id: 'diagramacao',
          order: 5,
          title: '5. Diagramação Editorial KDP',
          status: 'pendente',
          progressReal: 'Pendente',
          currentWork: 'Margens, medianiz, cabeçalhos corridos e geração de PDF/EPUB.',
          pendingIssues: [],
        },
        auditoria_final: {
          id: 'auditoria_final',
          order: 6,
          title: '6. Auditoria Final Independente',
          status: 'pendente',
          progressReal: 'Pendente',
          currentWork: 'Avaliação dos 10 critérios e atestado de aprovação interna.',
          pendingIssues: [],
        },
      },
      resolvedIssuesCount: 0,
      pendingIssuesCount: 0,
      pdfAvailable: false,
      epubAvailable: false,
      updatedAt: new Date().toISOString(),
    };
  }
}
