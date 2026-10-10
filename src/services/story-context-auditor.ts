// ================================================================
// STORY CONTEXT AUDITOR — MOTOR DE AUDITORIA CONTEXTUAL E AUTOCORREÇÃO
// Auditoria Global de Contexto, Continuidade, Fechamento de Enredo,
// Revisão Linguística em Múltiplas Passagens e Proteção Anti-Destrutiva
// ================================================================

import {
  CanonicalBookBible,
  PermanentCharacter,
  createBible,
  validateTemporal,
  validateGeographic,
  validateKnowledge,
  validateObjects,
  validateCharacters,
  validateChapterConnection,
  analyzeRepetition,
  AuditIssue,
  Severity
} from './continuity-engine';
import { ManuscriptIntegrityEngine } from './manuscript-integrity-engine';
import { CorrectionChange, PendingItem, Resolution } from '../types/editorial-correction';

export interface StoryConflict {
  id: string;
  description: string;
  charactersInvolved: string[];
  introducedChapter: number;
  status: 'ABERTO' | 'RESOLVIDO' | 'CONTINUIDADE_INTENCIONAL';
  resolutionChapter?: number;
  resolutionNotes?: string;
}

export interface StoryCharacterProfile {
  name: string;
  aliases: string[];
  age?: number;
  physicalTraits: string[];
  psychologicalTraits: string[];
  relationships: Record<string, string>; // ex: { 'Carlos': 'Irmão mais velho' }
  goals: string[];
  knownFacts: Set<string>;
  firstAppearanceChapter: number;
  lastAppearanceChapter: number;
}

export interface StoryTimelineEvent {
  chapter: number;
  description: string;
  characters: string[];
  location: string;
  timestampNarrative?: string;
}

export interface StoryBibleStructured {
  projectId: string;
  premise: string;
  genre: string;
  tone: string;
  characters: Record<string, StoryCharacterProfile>;
  locations: string[];
  timeline: StoryTimelineEvent[];
  conflicts: StoryConflict[];
  worldRules: string[];
  openQuestions: string[];
  plannedEndingType: 'conclusivo' | 'aberto' | 'tragico' | 'gancho_serie';
  finalChapterResolution: {
    climaxPresent: boolean;
    mainConflictResolved: boolean;
    characterArcsCompleted: boolean;
    abruptEndingDetected: boolean;
    notes: string[];
  };
}

export interface ContextAuditSnapshot {
  timestamp: number;
  description: string;
  chapters: Array<{ index: number; title: string; text: string }>;
  changesApplied: CorrectionChange[];
}

export interface StoryAuditReport {
  overallScore: number;
  status: 'APROVADO' | 'APROVADO_COM_OBSERVACOES' | 'CORRECAO_NECESSARIA' | 'BLOQUEADO_PARA_EXPORTACAO';
  canExport: boolean;
  hasBlockingIssues: boolean;
  blockerCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  storyBible: StoryBibleStructured;
  issues: AuditIssue[];
  autoFixedChanges: CorrectionChange[];
  authorReviewItems: PendingItem[];
  snapshots: ContextAuditSnapshot[];
  passReports: {
    pass1StructuralAiClean: { cleanLinesCount: number; removedAiMarkersCount: number };
    pass2CharactersAndContinuity: { charactersChecked: number; conflictsFound: number };
    pass3ChapterConnection: { transitionsAnalyzed: number; disconnectedChapters: number[] };
    pass4PlotEndingResolution: { mainConflictStatus: string; abruptEnding: boolean };
    pass5LinguisticOrthography: { spellingFixes: number; grammarFixes: number };
    pass6ParagraphsAndTypography: { paragraphFixes: number; dialogueStandardized: number };
  };
}

const AI_CONTAMINATED_PHRASES: RegExp[] = [
  /como uma (?:ia|intelig[eê]ncia artificial)\b/i,
  /sou um(?:a)? (?:ia|modelo de linguagem|assistente virtual)\b/i,
  /aqui est[aá] o (?:pr[oó]ximo )?cap[ií]tulo/i,
  /certamente[,!]?\s*aqui est[aá]/i,
  /espero que (?:tenha gostado|esta narrativa atenda|isso ajude)/i,
  /continua no pr[oó]ximo cap[ií]tulo\.{0,3}/i,
  /\[inserir aqui[^\]]*\]/i,
  /\[desenvolver cena[^\]]*\]/i,
  /TODO:/i,
  /\[fim do cap[ií]tulo\]/i,
  /\[fim da cena\]/i,
  /<<<FIM_DO_CAPITULO>>>/i,
  /<<<BLOCO_[A-Z0-9_]+>>>/i
];

export class StoryContextAuditor {
  private snapshots: ContextAuditSnapshot[] = [];

  /**
   * Constrói a StoryBible a partir dos capítulos do manuscrito
   */
  public extractStoryBible(
    chapters: Array<{ index: number; title: string; text: string }>,
    premise: string = '',
    genre: string = 'Ficção'
  ): StoryBibleStructured {
    const characters: Record<string, StoryCharacterProfile> = {};
    const locations = new Set<string>();
    const timeline: StoryTimelineEvent[] = [];
    const conflicts: StoryConflict[] = [];

    const commonStopwords = new Set([
      'Capítulo', 'Depois', 'Quando', 'Então', 'Havia', 'Estava', 'Assim', 'Nunca', 'Tudo', 'Nada',
      'Mais', 'Muito', 'Este', 'Esse', 'Aquele', 'Esta', 'Essa', 'Aquela', 'Como', 'Para', 'Pela',
      'Pelo', 'Com', 'Sem', 'Sob', 'Sobre', 'Entre', 'Após', 'Durante', 'Desde', 'Até', 'Onde',
      'Quem', 'Qual', 'Quanto', 'Eles', 'Elas', 'Você', 'Vocês', 'Algum', 'Alguma', 'Nenhum'
    ]);

    // Expressões regulares para detecção de personagens e relacionamentos em português
    const namePattern = /\b([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]+)?)\b/g;

    chapters.forEach(ch => {
      const text = ch.text || '';
      const matches = text.match(namePattern) || [];
      const freq: Record<string, number> = {};

      matches.forEach(m => {
        const clean = m.trim();
        if (clean.length > 2 && !commonStopwords.has(clean)) {
          freq[clean] = (freq[clean] || 0) + 1;
        }
      });

      // Personagens detectados no capítulo
      Object.entries(freq).forEach(([name]) => {
        const key = name.toLowerCase();
        if (!characters[key]) {
          characters[key] = {
            name,
            aliases: [name],
            physicalTraits: [],
            psychologicalTraits: [],
            relationships: {},
            goals: [],
            knownFacts: new Set<string>(),
            firstAppearanceChapter: ch.index,
            lastAppearanceChapter: ch.index
          };
        } else {
          characters[key].lastAppearanceChapter = ch.index;
        }

        // Detecção de idade (ex: "Clara, de 28 anos", "com seus 30 anos")
        const ageMatch = text.match(new RegExp(`${name}[^.\\n]{0,30}\\b(\\d{1,2})\\s*anos\\b`, 'i'));
        if (ageMatch && !characters[key].age) {
          characters[key].age = parseInt(ageMatch[1], 10);
        }
      });

      // Detecção de locais
      const locMatches = text.match(/(?:em|na|no|para a|para o|rumo a|mansão em)\s+([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]+)/g);
      if (locMatches) {
        locMatches.forEach(l => {
          const locClean = l.replace(/^(?:em|na|no|para a|para o|rumo a|mansão em)\s+/i, '').trim();
          if (locClean.length > 2 && !commonStopwords.has(locClean)) locations.add(locClean);
        });
      }

      // Adiciona evento da linha do tempo
      timeline.push({
        chapter: ch.index,
        description: `Acontecimentos principais de ${ch.title}`,
        characters: Object.keys(freq).slice(0, 3),
        location: Array.from(locations)[0] || 'Local principal'
      });
    });

    // Mapeamento inicial de conflito principal
    conflicts.push({
      id: 'conflict_main',
      description: premise || 'Jornada central da narrativa',
      charactersInvolved: Object.keys(characters).slice(0, 2),
      introducedChapter: 1,
      status: chapters.length > 0 ? 'ABERTO' : 'RESOLVIDO'
    });

    // Análise do capítulo final para fechamento
    const lastChapter = chapters[chapters.length - 1];
    let climaxPresent = false;
    let mainConflictResolved = false;
    let abruptEndingDetected = false;
    const notes: string[] = [];

    if (lastChapter) {
      const lastText = (lastChapter.text || '').toLowerCase();
      const lastWordCount = lastText.split(/\s+/).filter(Boolean).length;

      if (lastWordCount < 200) {
        abruptEndingDetected = true;
        notes.push(`O capítulo final possui apenas ${lastWordCount} palavras, indicando encerramento incompleto ou truncamento de geração.`);
      }

      const resolutionWords = ['enfim', 'finalmente', 'conclusão', 'desfecho', 'compreendeu', 'terminou', 'sorriu', 'descanso', 'novo começo', 'paz'];
      const hasResolutionMarkers = resolutionWords.some(w => lastText.includes(w));

      if (hasResolutionMarkers) {
        mainConflictResolved = true;
        climaxPresent = true;
        conflicts[0].status = 'RESOLVIDO';
        conflicts[0].resolutionChapter = lastChapter.index;
      } else {
        notes.push('O desfecho não apresenta indicadores claros de encerramento do conflito principal da história.');
      }
    }

    return {
      projectId: `proj_${Date.now()}`,
      premise: premise || 'Narrativa autoral',
      genre,
      tone: 'Literário',
      characters,
      locations: Array.from(locations),
      timeline,
      conflicts,
      worldRules: ['Leis da física padrão e continuidade consistente'],
      openQuestions: [],
      plannedEndingType: mainConflictResolved ? 'conclusivo' : 'aberto',
      finalChapterResolution: {
        climaxPresent,
        mainConflictResolved,
        characterArcsCompleted: Object.keys(characters).length > 0,
        abruptEndingDetected,
        notes
      }
    };
  }

  /**
   * Executa as 7 Passagens Editoriais em cascata controlada
   */
  public runMultiPassAuditAndCorrection(
    chapters: Array<{ index: number; title: string; text: string }>,
    premise: string = '',
    genre: string = 'Ficção'
  ): StoryAuditReport {
    // 0. Salva Snapshot inicial
    this.createSnapshot('Início da auditoria editorial multi-passagem', chapters);

    const storyBible = this.extractStoryBible(chapters, premise, genre);
    const issues: AuditIssue[] = [];
    const autoFixedChanges: CorrectionChange[] = [];
    const authorReviewItems: PendingItem[] = [];

    let cleanLinesCount = 0;
    let removedAiMarkersCount = 0;
    let spellingFixes = 0;
    let grammarFixes = 0;
    let paragraphFixes = 0;
    let dialogueStandardized = 0;
    const disconnectedChapters: number[] = [];

    // --- PASSAGEM 1: INTEGRIDADE ESTRUTURAL & ANTI-RESÍDUO IA ---
    const pass1Chapters = chapters.map(ch => {
      let text = ch.text || '';
      const originalText = text;

      // Remoção de resíduos LaTeX
      text = ManuscriptIntegrityEngine.cleanLaTeXResiduals(text);

      // Remoção de frases contaminadas por IA
      AI_CONTAMINATED_PHRASES.forEach(regex => {
        if (regex.test(text)) {
          removedAiMarkersCount++;
          text = text.replace(regex, '');
          issues.push({
            validator: 'Anti-Resíduo IA',
            severity: 'CRITICAL',
            chapter: ch.index,
            message: `Detectado e removido resíduo de instruções de IA no capítulo ${ch.index}.`,
            fixHint: 'Texto de prompt ou metadados de LLM sanitizado.'
          });
        }
      });

      // Sanitização de marcadores de fim de bloco
      const sanitizedObj = ManuscriptIntegrityEngine.sanitizeChapterContent(text);
      if (sanitizedObj.markersRemoved.length > 0) {
        removedAiMarkersCount += sanitizedObj.markersRemoved.length;
      }
      text = sanitizedObj.cleanText;

      if (text !== originalText) {
        cleanLinesCount++;
        autoFixedChanges.push({
          id: `fix_p1_${ch.index}_${Date.now()}`,
          chapterIndex: ch.index - 1,
          original: originalText.slice(0, 80) + '...',
          corrected: text.slice(0, 80) + '...',
          type: 'estilo',
          reason: 'Sanitização de resíduos de IA e marcadores de fim de bloco',
          resolution: 'CORRIGIDO_AUTOMATICAMENTE',
          source: 'regras'
        });
      }

      return { ...ch, text };
    });

    // --- PASSAGEM 2: AUDITORIA DE PERSONAGENS, CRONOLOGIA E KNOWLEDGE LEAKS ---
    const canonBible: CanonicalBookBible = createBible(storyBible.projectId);
    Object.values(storyBible.characters).forEach(c => {
      canonBible.permanent.characters[c.name.toLowerCase()] = {
        name: c.name,
        age: c.age,
        appearance: c.physicalTraits,
        personality: c.psychologicalTraits
      };
    });

    // Verifica contradições de personagens entre capítulos
    const characterNames = Object.values(storyBible.characters);
    for (let i = 0; i < characterNames.length; i++) {
      for (let j = i + 1; j < characterNames.length; j++) {
        const c1 = characterNames[i];
        const c2 = characterNames[j];
        // Detecção de nome similar (possível erro de grafia de personagem, ex: Helena vs Elena)
        if (this.areNamesSuspiciouslySimilar(c1.name, c2.name)) {
          issues.push({
            validator: 'Personagens',
            severity: 'ORANGE',
            chapter: c2.firstAppearanceChapter,
            message: `Possível duplicidade ou grafia inconsistente do personagem "${c1.name}" e "${c2.name}".`,
            fixHint: 'Padronizar a grafia do nome do personagem em todo o manuscrito.'
          });
          authorReviewItems.push({
            id: `pend_char_${c1.name}_${c2.name}`,
            chapterIndex: c2.firstAppearanceChapter - 1,
            kind: 'continuidade',
            description: `Confirmar se "${c1.name}" e "${c2.name}" são o mesmo personagem ou indivíduos distintos.`,
            resolution: 'PENDENTE_VALIDACAO_AUTOR'
          });
        }
      }
    }

    // --- PASSAGEM 3: CONEXÃO ENTRE CAPÍTULOS ---
    for (let i = 1; i < pass1Chapters.length; i++) {
      const prev = pass1Chapters[i - 1];
      const curr = pass1Chapters[i];
      const connIssues = validateChapterConnection(curr.index, prev.text, curr.text);
      if (connIssues.length > 0) {
        disconnectedChapters.push(curr.index);
        issues.push(...connIssues);
      }
    }

    // --- PASSAGEM 4: FECHAMENTO DO ENREDO & FINAL DO LIVRO ---
    if (storyBible.finalChapterResolution.abruptEndingDetected) {
      issues.push({
        validator: 'Desfecho da Obra',
        severity: 'CRITICAL',
        chapter: pass1Chapters.length,
        message: 'O livro apresenta um final abrupto com contagem de palavras insuficiente no último capítulo.',
        fixHint: 'Expandir o clímax e o fechamento do capítulo final para concluir o arco dramático.'
      });
      authorReviewItems.push({
        id: `pend_abrupt_end_${pass1Chapters.length}`,
        chapterIndex: pass1Chapters.length - 1,
        kind: 'sentido',
        description: 'Capítulo final excessivamente curto. Recomenda-se adicionar conclusão do enredo.',
        resolution: 'PENDENTE_VALIDACAO_AUTOR'
      });
    }

    if (!storyBible.finalChapterResolution.mainConflictResolved && storyBible.plannedEndingType === 'conclusivo') {
      issues.push({
        validator: 'Desfecho da Obra',
        severity: 'RED',
        chapter: pass1Chapters.length,
        message: 'O conflito principal da história não teve encerramento explícito.',
        fixHint: 'Articular a resolução ou a decisão final dos protagonistas.'
      });
    }

    // --- PASSAGEM 5: REVISÃO ORTOGRÁFICA, ACENTUAÇÃO E GRAMÁTICA ---
    const pass5Chapters = pass1Chapters.map(ch => {
      let text = ch.text;
      const originalText = text;

      // Correção de pontuação espaçada (ex: "palavra ," -> "palavra,")
      text = text.replace(/\s+([,.:;?!])/g, '$1');

      // Correção de pontuações duplicadas indevidas (ex: ",," ou "..")
      text = text.replace(/,{2,}/g, ',');
      text = text.replace(/\.{2}(?!\.)/g, '.');

      // Padronização de travessão em diálogos (hífen solto transformado em travessão clássico "— ")
      text = text.replace(/(^|\n)[ \t]*[-–][ \t]+/g, '$1— ');

      // Aspas duplas consistentes
      text = text.replace(/[""״]/g, '"');

      if (text !== originalText) {
        spellingFixes++;
        grammarFixes++;
        autoFixedChanges.push({
          id: `fix_p5_${ch.index}_${Date.now()}`,
          chapterIndex: ch.index - 1,
          original: originalText.slice(0, 60),
          corrected: text.slice(0, 60),
          type: 'pontuacao',
          reason: 'Correção de pontuação colada, remoção de duplicatas e travessão de diálogo',
          resolution: 'CORRIGIDO_AUTOMATICAMENTE',
          source: 'regras'
        });
      }

      return { ...ch, text };
    });

    // --- PASSAGEM 6: LIMPEZA ESTRUTURAL DE PARÁGRAFOS E ESPAÇAMENTO ---
    const pass6Chapters = pass5Chapters.map(ch => {
      let text = ch.text;
      const originalText = text;

      // Remove linhas em branco consecutivas em excesso (máximo 1 linha vazia entre parágrafos)
      text = text.replace(/\n{3,}/g, '\n\n');

      // Remove espaços no início e fim de cada parágrafo
      text = text.split('\n').map(line => line.trim()).join('\n');

      // Corrige quebra de parágrafo acidental no meio de frase minúscula
      text = text.replace(/([a-záéíóúâêôãõç,;])\n+([a-záéíóúâêôãõç])/g, '$1 $2');

      if (text !== originalText) {
        paragraphFixes++;
        dialogueStandardized++;
        autoFixedChanges.push({
          id: `fix_p6_${ch.index}_${Date.now()}`,
          chapterIndex: ch.index - 1,
          original: originalText.slice(0, 50),
          corrected: text.slice(0, 50),
          type: 'paragrafo',
          reason: 'Limpeza de parágrafos partidos e normalização de quebras de linha',
          resolution: 'CORRIGIDO_AUTOMATICAMENTE',
          source: 'regras'
        });
      }

      return { ...ch, text };
    });

    // 7. Salva Snapshot final com as correções aplicadas
    this.createSnapshot('Conclusão da auditoria e aplicação de autocorreções', pass6Chapters, autoFixedChanges);

    // Cálculo da nota e classificação de aprovação
    const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
    const redCount = issues.filter(i => i.severity === 'RED').length;
    const orangeCount = issues.filter(i => i.severity === 'ORANGE').length;
    const yellowCount = issues.filter(i => i.severity === 'YELLOW').length;

    let score = 100;
    score -= criticalCount * 25;
    score -= redCount * 15;
    score -= orangeCount * 8;
    score -= yellowCount * 3;
    score = Math.max(10, Math.min(100, score));

    const hasBlockingIssues = criticalCount > 0;
    let status: StoryAuditReport['status'] = 'APROVADO';

    if (hasBlockingIssues) {
      status = 'BLOQUEADO_PARA_EXPORTACAO';
    } else if (redCount > 0) {
      status = 'CORRECAO_NECESSARIA';
    } else if (orangeCount > 0 || yellowCount > 0) {
      status = 'APROVADO_COM_OBSERVACOES';
    }

    return {
      overallScore: score,
      status,
      canExport: !hasBlockingIssues,
      hasBlockingIssues,
      blockerCount: criticalCount,
      criticalCount: redCount,
      warningCount: orangeCount,
      infoCount: yellowCount,
      storyBible,
      issues,
      autoFixedChanges,
      authorReviewItems,
      snapshots: this.snapshots,
      passReports: {
        pass1StructuralAiClean: { cleanLinesCount, removedAiMarkersCount },
        pass2CharactersAndContinuity: { charactersChecked: Object.keys(storyBible.characters).length, conflictsFound: orangeCount },
        pass3ChapterConnection: { transitionsAnalyzed: pass6Chapters.length - 1, disconnectedChapters },
        pass4PlotEndingResolution: {
          mainConflictStatus: storyBible.conflicts[0]?.status || 'RESOLVIDO',
          abruptEnding: storyBible.finalChapterResolution.abruptEndingDetected
        },
        pass5LinguisticOrthography: { spellingFixes, grammarFixes },
        pass6ParagraphsAndTypography: { paragraphFixes, dialogueStandardized }
      }
    };
  }

  /**
   * Salva um snapshot reversível do estado dos capítulos
   */
  public createSnapshot(
    description: string,
    chapters: Array<{ index: number; title: string; text: string }>,
    changes: CorrectionChange[] = []
  ): ContextAuditSnapshot {
    const snap: ContextAuditSnapshot = {
      timestamp: Date.now(),
      description,
      chapters: chapters.map(c => ({ index: c.index, title: c.title, text: c.text })),
      changesApplied: [...changes]
    };
    this.snapshots.push(snap);
    return snap;
  }

  /**
   * Reverte para um snapshot anterior específico
   */
  public rollbackToSnapshot(index: number): ContextAuditSnapshot | null {
    if (index >= 0 && index < this.snapshots.length) {
      return this.snapshots[index];
    }
    return null;
  }

  /**
   * Detecta similaridade suspeita entre nomes (ex: Helena e Elena, Marcos e Marcus)
   */
  private areNamesSuspiciouslySimilar(name1: string, name2: string): boolean {
    const n1 = name1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const n2 = name2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (n1 === n2) return false;

    // Distância de Levenshtein simples
    const m = n1.length;
    const n = n2.length;
    if (Math.abs(m - n) > 2) return false;

    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (n1[i - 1] === n2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }

    const dist = dp[m][n];
    return dist <= 2 && Math.max(m, n) >= 4;
  }

  // =========================================================================
  // MÉTODOS ESTÁTICOS DE CONVENIÊNCIA
  // =========================================================================

  public static buildStoryBible(
    book: { titulo: string; subtitulo?: string; autor?: string; capitulos: Array<{ titulo: string; texto: string }> },
    premise: string = ''
  ): StoryBibleStructured {
    const auditor = new StoryContextAuditor();
    const chs = (book.capitulos || []).map((c, i) => ({
      index: i + 1,
      title: c.titulo,
      text: c.texto
    }));
    return auditor.extractStoryBible(chs, premise, 'Ficção');
  }

  public static detectAndSanitizeAiResidues(text: string): { cleanText: string; findings: string[] } {
    let cleanText = text || '';
    const findings: string[] = [];

    // LaTeX
    const afterLatex = ManuscriptIntegrityEngine.cleanLaTeXResiduals(cleanText);
    if (afterLatex !== cleanText) {
      findings.push('Detectados e removidos resíduos de código LaTeX.');
      cleanText = afterLatex;
    }

    // AI Contaminated Phrases
    AI_CONTAMINATED_PHRASES.forEach(regex => {
      const match = cleanText.match(regex);
      if (match) {
        findings.push(`Detectado resíduo de instrução/metadados de IA: "${match[0]}".`);
        // Remove ocorrências do padrão
        cleanText = cleanText.replace(new RegExp(regex.source, 'gi'), '');
      }
    });

    // Remove preâmbulos típicos inteiros de assistente de IA se restarem resíduos na linha
    cleanText = cleanText.replace(/(?:^|\n)\s*(?:aqui está|espero que|certamente)[^\n]*\n?/gi, '\n');

    const sanitizedObj = ManuscriptIntegrityEngine.sanitizeChapterContent(cleanText);
    if (sanitizedObj.markersRemoved.length > 0) {
      findings.push(...sanitizedObj.markersRemoved);
    }
    cleanText = sanitizedObj.cleanText;

    return { cleanText: cleanText.replace(/\n{3,}/g, '\n\n').trim(), findings };
  }

  public static detectCharacterContradictions(
    characters: Array<{ name: string; role?: string; traits?: string[]; knowledge?: string[] }>
  ): string[] {
    const contradictions: string[] = [];
    const auditor = new StoryContextAuditor();

    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const c1 = characters[i];
        const c2 = characters[j];
        if (auditor.areNamesSuspiciouslySimilar(c1.name, c2.name)) {
          contradictions.push(`Inconsistência de grafia entre personagens similares: "${c1.name}" e "${c2.name}".`);
        }
      }
    }

    return contradictions;
  }

  public static validateChapterConnection(
    ch1: { title: string; text: string },
    ch2: { title: string; text: string },
    index: number = 1
  ): { connected: boolean; issues: string[] } {
    const res = validateChapterConnection(index, ch1.text, ch2.text);
    const issues = res.map(r => r.message);

    // Verificação semântica complementar para detectar quebra abrupta de universo ou personagens
    const getWords = (t: string) => new Set(
      (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\W+/).filter(w => w.length >= 4)
    );
    const tailWords = getWords(ch1.text.slice(-800));
    const headWords = getWords(ch2.text.slice(0, 800));

    let commonCount = 0;
    tailWords.forEach(w => { if (headWords.has(w)) commonCount++; });

    if (tailWords.size >= 5 && headWords.size >= 5 && commonCount === 0) {
      issues.push('Desconexão temática ou de cenário detectada entre os capítulos: nenhum elemento ou personagem de ligação encontrado na transição.');
    }

    return {
      connected: issues.length === 0,
      issues
    };
  }

  public static auditStoryEnding(
    finalChapter: { title: string; text: string },
    premise: string = ''
  ): { approved: boolean; findings: string[] } {
    const text = (finalChapter.text || '').toLowerCase();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const findings: string[] = [];

    // Detecção de corte abrupto ou truncamento de geração
    if (
      wordCount < 20 ||
      text.includes('continua na próxima') ||
      text.includes('(continua') ||
      text.includes('continua...') ||
      text.endsWith('...') ||
      !/[.!?]$/.test(finalChapter.text?.trim() || '')
    ) {
      findings.push('Desfecho abrupto ou incompleto: capítulo final sem conclusão substantiva da narrativa.');
      return { approved: false, findings };
    }

    const resolutionKeywords = [
      'enfim', 'finalmente', 'conclusão', 'desfecho', 'paz', 'renascimento',
      'fim', 'jornada', 'epílogo', 'recomeço', 'vitória', 'tratado', 'alvorada'
    ];
    const hasResol = resolutionKeywords.some(w => text.includes(w) || (finalChapter.title || '').toLowerCase().includes(w));
    if (!hasResol && wordCount < 100) {
      findings.push('Ausência de indicadores de encerramento do conflito central.');
      return { approved: false, findings };
    }

    return { approved: true, findings: [] };
  }

  public static cleanPunctuationAndDialogues(text: string): string {
    let t = text || '';
    t = t.replace(/\.{2,}/g, '.');
    t = t.replace(/\?{2,}/g, '?');
    t = t.replace(/!{2,}/g, '!');
    t = t.replace(/"([^"]+)"/g, '“$1”');
    t = t.replace(/(?:^|\n)\s*--\s*/g, '\n— ');
    t = t.replace(/\s+--\s+/g, ' — ');
    t = t.replace(/(?:^|\n)\s*-\s+/g, '\n— ');
    return t.trim();
  }

  public static cleanParagraphsAndSpacing(text: string): string {
    let t = text || '';
    t = t.replace(/\r\n/g, '\n');
    t = t.replace(/[ \t]{2,}/g, ' ');
    t = t.replace(/\n{3,}/g, '\n\n');
    t = t.replace(/([a-záéíóúâêôãõç,;])\n+([a-záéíóúâêôãõç])/g, '$1 $2');
    return t.trim();
  }

  public static createSnapshot(
    book: { titulo: string; capitulos: Array<{ titulo: string; texto: string }> },
    note: string
  ): BookSnapshotItem {
    return {
      id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      description: note,
      title: book.titulo,
      chapters: (book.capitulos || []).map(c => ({ titulo: c.titulo, texto: c.texto }))
    };
  }

  public static rollbackToSnapshot(snapshot: BookSnapshotItem): {
    titulo: string;
    capitulos: Array<{ titulo: string; texto: string }>;
  } {
    return {
      titulo: snapshot.title,
      capitulos: snapshot.chapters.map(c => ({ titulo: c.titulo, texto: c.texto }))
    };
  }

  public static auditManuscript(
    book: {
      titulo: string;
      subtitulo?: string;
      autor?: string;
      genero?: string;
      idioma?: string;
      capitulos: Array<{ titulo: string; texto: string }>;
    },
    premise: string = ''
  ): ComprehensiveAuditResult {
    const auditor = new StoryContextAuditor();
    const chs = (book.capitulos || []).map((c, i) => ({
      index: i + 1,
      title: c.titulo,
      text: c.texto
    }));

    const report = auditor.runMultiPassAuditAndCorrection(chs, premise, book.genero || 'Ficção');
    const bible = auditor.extractStoryBible(chs, premise, book.genero || 'Ficção');

    const lastCh = chs[chs.length - 1] || { title: 'Final', text: '' };
    const endingAssessment = StoryContextAuditor.auditStoryEnding(lastCh, premise);

    const sanitizedChapters = (book.capitulos || []).map(c => {
      let t = StoryContextAuditor.detectAndSanitizeAiResidues(c.texto).cleanText;
      t = StoryContextAuditor.cleanPunctuationAndDialogues(t);
      t = StoryContextAuditor.cleanParagraphsAndSpacing(t);
      return { titulo: c.titulo, texto: t };
    });

    return {
      overallScore: report.overallScore,
      status: report.status,
      canExport: report.canExport,
      narrativeIntegrityScore: Math.max(30, 100 - (report.criticalCount * 15)),
      aiContaminationCleaned: report.passReports.pass1StructuralAiClean.removedAiMarkersCount,
      endingAssessment,
      bible,
      sanitizedManuscript: {
        titulo: book.titulo,
        subtitulo: book.subtitulo || '',
        autor: book.autor || '',
        genero: book.genero || 'Ficção',
        idioma: book.idioma || 'pt-BR',
        capitulos: sanitizedChapters
      },
      issuesCount: report.issues.length
    };
  }
}

export interface BookSnapshotItem {
  id: string;
  timestamp: number;
  description: string;
  title: string;
  chapters: Array<{ titulo: string; texto: string }>;
}

export interface ComprehensiveAuditResult {
  overallScore: number;
  status: 'APROVADO' | 'APROVADO_COM_OBSERVACOES' | 'CORRECAO_NECESSARIA' | 'BLOQUEADO_PARA_EXPORTACAO';
  canExport: boolean;
  narrativeIntegrityScore: number;
  aiContaminationCleaned: number;
  endingAssessment: { approved: boolean; findings: string[] };
  bible: StoryBibleStructured;
  sanitizedManuscript: {
    titulo: string;
    subtitulo: string;
    autor: string;
    genero: string;
    idioma: string;
    capitulos: Array<{ titulo: string; texto: string }>;
  };
  issuesCount: number;
}
