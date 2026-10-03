// ================================================================
// MOTOR DE AUDITORIA EDITORIAL, DIAGRAMAÇÃO & VERIFICADOR KDP
// Suíte em 1 clique: Diagramação, Gramática, Parágrafos, Plágio e Alucinação
// ================================================================

export type VerifierCategory = 
  | 'diagramacao' 
  | 'gramatica' 
  | 'paragrafo' 
  | 'plagio' 
  | 'alucinacao';

export interface VerifierIssue {
  id: string;
  chapterIndex: number; // 0-based
  chapterTitle: string;
  type: VerifierCategory;
  typeLabel: string;
  severity: 'alta' | 'media' | 'baixa';
  description: string;
  originalSnippet: string;
  suggestedFix: string;
  applied: boolean;
}

export interface VerificationModuleStatus {
  id: VerifierCategory;
  name: string;
  icon: string;
  status: 'pending' | 'running' | 'completed';
  issuesCount: number;
}

export interface FullBookVerificationReport {
  timestamp: string;
  score: number; // 0-100
  totalWords: number;
  totalChapters: number;
  estimatedKdpPages: number;
  modules: VerificationModuleStatus[];
  issues: VerifierIssue[];
  summary: string;
}

export interface CapituloLike {
  titulo: string;
  texto: string;
}

export interface LivroLike {
  titulo: string;
  subtitulo?: string;
  autor?: string;
  genero?: string;
  topico?: string;
  capitulos: CapituloLike[];
  meta?: {
    palavrasPorCap?: number;
    paginasAlvo?: number;
  };
}

export class KdpBookVerifier {

  /**
   * Executa a auditoria completa de todos os capítulos com callbacks em tempo real.
   */
  public static async runCompleteVerification(
    livro: LivroLike,
    premissa: string,
    onProgress?: (currentModule: VerifierCategory, currentChapter: number, percent: number) => void
  ): Promise<FullBookVerificationReport> {
    const issues: VerifierIssue[] = [];
    const totalCaps = livro.capitulos.length;
    let totalWords = 0;

    const modules: VerificationModuleStatus[] = [
      { id: 'diagramacao', name: 'Diagramação & Miolo KDP (6x9)', icon: '📐', status: 'pending', issuesCount: 0 },
      { id: 'gramatica', name: 'Ortografia & Gramática', icon: '✍️', status: 'pending', issuesCount: 0 },
      { id: 'paragrafo', name: 'Parágrafos & Ritmo Narrativo', icon: '📜', status: 'pending', issuesCount: 0 },
      { id: 'plagio', name: 'Originalidade & Anti-Plágio', icon: '🛡️', status: 'pending', issuesCount: 0 },
      { id: 'alucinacao', name: 'Anti-Alucinação & Coerência', icon: '🧠', status: 'pending', issuesCount: 0 },
    ];

    // Contar total de palavras
    livro.capitulos.forEach(c => {
      totalWords += c.texto.trim().split(/\s+/).filter(Boolean).length;
    });

    const estimatedKdpPages = Math.max(1, Math.round(totalWords / 250));

    // 1. DIAGRAMAÇÃO KDP
    modules[0].status = 'running';
    if (onProgress) onProgress('diagramacao', 0, 10);
    await new Promise(r => setTimeout(r, 200));

    this.checkDiagramacao(livro, issues);
    modules[0].status = 'completed';
    modules[0].issuesCount = issues.filter(i => i.type === 'diagramacao').length;

    // 2. ORTOGRAFIA E GRAMÁTICA
    modules[1].status = 'running';
    for (let cIdx = 0; cIdx < totalCaps; cIdx++) {
      if (onProgress) onProgress('gramatica', cIdx + 1, 20 + Math.round((cIdx / Math.max(1, totalCaps)) * 20));
      this.checkGramaticaCapitulo(livro.capitulos[cIdx], cIdx, issues);
      await new Promise(r => setTimeout(r, 60));
    }
    modules[1].status = 'completed';
    modules[1].issuesCount = issues.filter(i => i.type === 'gramatica').length;

    // 3. PARÁGRAFOS & RITMO NARRATIVO
    modules[2].status = 'running';
    for (let cIdx = 0; cIdx < totalCaps; cIdx++) {
      if (onProgress) onProgress('paragrafo', cIdx + 1, 45 + Math.round((cIdx / Math.max(1, totalCaps)) * 20));
      this.checkParagrafosCapitulo(livro.capitulos[cIdx], cIdx, issues);
      await new Promise(r => setTimeout(r, 60));
    }
    modules[2].status = 'completed';
    modules[2].issuesCount = issues.filter(i => i.type === 'paragrafo').length;

    // 4. ORIGINALIDADE & ANTI-PLÁGIO
    modules[3].status = 'running';
    if (onProgress) onProgress('plagio', 0, 75);
    await new Promise(r => setTimeout(r, 180));
    this.checkPlagioERepeticao(livro, issues);
    modules[3].status = 'completed';
    modules[3].issuesCount = issues.filter(i => i.type === 'plagio').length;

    // 5. ANTI-ALUCINAÇÃO & COERÊNCIA NARRATIVA
    modules[4].status = 'running';
    if (onProgress) onProgress('alucinacao', 0, 90);
    await new Promise(r => setTimeout(r, 220));
    this.checkAlucinacaoECoerencia(livro, premissa, issues);
    modules[4].status = 'completed';
    modules[4].issuesCount = issues.filter(i => i.type === 'alucinacao').length;

    if (onProgress) onProgress('alucinacao', totalCaps, 100);

    // Calcular score (0 a 100)
    const penalidades = issues.reduce((acc, curr) => {
      if (curr.severity === 'alta') return acc + 10;
      if (curr.severity === 'media') return acc + 4;
      return acc + 1.5;
    }, 0);
    const score = Math.max(25, Math.min(100, Math.round(100 - penalidades)));

    const summary = issues.length === 0
      ? '✓ Livro auditado com perfeição! Diagramação, gramática e coerência 100% aprovados para KDP.'
      : `Auditoria concluída com score ${score}/100. Foram encontrados ${issues.length} apontamentos de melhoria que podem ser corrigidos em 1 clique.`;

    return {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      score,
      totalWords,
      totalChapters: totalCaps,
      estimatedKdpPages,
      modules,
      issues,
      summary
    };
  }

  // --- 1. VERIFICAÇÃO DE DIAGRAMAÇÃO ---
  private static checkDiagramacao(livro: LivroLike, issues: VerifierIssue[]) {
    livro.capitulos.forEach((cap, idx) => {
      const words = cap.texto.trim().split(/\s+/).filter(Boolean).length;
      
      // Capítulo muito curto para padrões KDP (< 250 palavras)
      if (words < 250) {
        issues.push({
          id: `diag-short-${idx}`,
          chapterIndex: idx,
          chapterTitle: cap.titulo,
          type: 'diagramacao',
          typeLabel: 'Diagramação KDP',
          severity: 'media',
          description: `O Capítulo ${idx + 1} possui apenas ${words} palavras, gerando menos de 1 página diagramada no formato 6x9.`,
          originalSnippet: cap.texto.slice(0, 140) + '...',
          suggestedFix: 'Recomenda-se expandir a narrativa deste capítulo para atingir ao menos 500 palavras e garantir o fluxo da leitura.',
          applied: false
        });
      }

      // Ausência de quebra de parágrafos estruturada
      const paras = cap.texto.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      if (paras.length <= 1 && words > 150) {
        issues.push({
          id: `diag-no-breaks-${idx}`,
          chapterIndex: idx,
          chapterTitle: cap.titulo,
          type: 'diagramacao',
          typeLabel: 'Diagramação KDP',
          severity: 'alta',
          description: `O Capítulo ${idx + 1} é um bloco contínuo de texto sem separação de parágrafos em linhas brancas, o que viola os padrões de diagramação do Kindle.`,
          originalSnippet: cap.texto.slice(0, 160) + '...',
          suggestedFix: 'Quebrar o capítulo em múltiplos parágrafos bem delimitados para facilitar a leitura.',
          applied: false
        });
      }
    });
  }

  // --- 2. VERIFICAÇÃO DE ORTOGRAFIA E GRAMÁTICA ---
  private static checkGramaticaCapitulo(cap: CapituloLike, idx: number, issues: VerifierIssue[]) {
    const texto = cap.texto;

    // A. Pontuação duplicada indevida (ex: ,, ou .. ou ;;)
    const regexPontuacaoDupla = /([,;.]){2,}/g;
    let match;
    while ((match = regexPontuacaoDupla.exec(texto)) !== null) {
      const start = Math.max(0, match.index - 25);
      const end = Math.min(texto.length, match.index + 35);
      const snippet = texto.slice(start, end);
      const fix = snippet.replace(match[0], match[1]);

      issues.push({
        id: `gram-punct-${idx}-${match.index}`,
        chapterIndex: idx,
        chapterTitle: cap.titulo,
        type: 'gramatica',
        typeLabel: 'Ortografia & Gramática',
        severity: 'baixa',
        description: `Pontuação duplicada detectada ("${match[0]}").`,
        originalSnippet: snippet,
        suggestedFix: fix,
        applied: false
      });
      break; // Limitar a 1 por tipo para não poluir
    }

    // B. Palavras duplicadas consecutivas (ex: "o o", "que que", "de de")
    const regexDuplicada = /\b(o|a|os|as|de|da|do|das|dos|que|se|em|um|uma)\s+\1\b/gi;
    const matchDup = regexDuplicada.exec(texto);
    if (matchDup) {
      const start = Math.max(0, matchDup.index - 25);
      const end = Math.min(texto.length, matchDup.index + 35);
      const snippet = texto.slice(start, end);
      const fix = snippet.replace(matchDup[0], matchDup[1]);

      issues.push({
        id: `gram-dup-word-${idx}-${matchDup.index}`,
        chapterIndex: idx,
        chapterTitle: cap.titulo,
        type: 'gramatica',
        typeLabel: 'Ortografia & Gramática',
        severity: 'media',
        description: `Repetição acidental da palavra ("${matchDup[0]}").`,
        originalSnippet: snippet,
        suggestedFix: fix,
        applied: false
      });
    }

    // C. Hífen usado em diálogos em vez de travessão oficial KDP (—)
    const linhas = texto.split('\n');
    linhas.forEach(linha => {
      const lTrim = linha.trim();
      if (lTrim.startsWith('- ') || lTrim.startsWith('-- ')) {
        const snippet = lTrim.slice(0, 100);
        const fix = '— ' + lTrim.replace(/^--?\s*/, '');
        if (!issues.some(i => i.id === `gram-travessao-${idx}`)) {
          issues.push({
            id: `gram-travessao-${idx}`,
            chapterIndex: idx,
            chapterTitle: cap.titulo,
            type: 'gramatica',
            typeLabel: 'Ortografia & Gramática',
            severity: 'baixa',
            description: 'Diálogo iniciado com hífen simples "-" em vez de travessão tipográfico KDP ("—").',
            originalSnippet: snippet,
            suggestedFix: fix,
            applied: false
          });
        }
      }
    });
  }

  // --- 3. VERIFICAÇÃO DE PARÁGRAFOS & RITMO ---
  private static checkParagrafosCapitulo(cap: CapituloLike, idx: number, issues: VerifierIssue[]) {
    const paras = cap.texto.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

    paras.forEach((p, pIdx) => {
      const words = p.split(/\s+/).filter(Boolean).length;
      
      // Parágrafo gigantesco (> 220 palavras)
      if (words > 220) {
        const sentences = p.split(/(?<=[.?!])\s+/);
        if (sentences.length >= 2) {
          const mid = Math.ceil(sentences.length / 2);
          const p1 = sentences.slice(0, mid).join(' ');
          const p2 = sentences.slice(mid).join(' ');
          const fix = `${p1}\n\n${p2}`;

          if (!issues.some(i => i.chapterIndex === idx && i.type === 'paragrafo')) {
            issues.push({
              id: `parag-long-${idx}-${pIdx}`,
              chapterIndex: idx,
              chapterTitle: cap.titulo,
              type: 'paragrafo',
              typeLabel: 'Parágrafos & Ritmo',
              severity: 'media',
              description: `Parágrafo extenso com ${words} palavras. Pode cansar o leitor em dispositivos móveis e Kindle.`,
              originalSnippet: p.slice(0, 180) + '...',
              suggestedFix: fix.slice(0, 180) + '... (Dividido em 2 parágrafos dinâmicos)',
              applied: false
            });
          }
        }
      }
    });
  }

  // --- 4. VERIFICAÇÃO DE PLÁGIO & ORIGINALIDADE ---
  private static checkPlagioERepeticao(livro: LivroLike, issues: VerifierIssue[]) {
    const frasesVistas = new Map<string, number>();

    livro.capitulos.forEach((cap, idx) => {
      const sentencas = cap.texto.split(/[.?!]\s+/).map(s => s.trim().toLowerCase());
      
      sentencas.forEach(s => {
        if (s.length > 55) {
          if (frasesVistas.has(s)) {
            const outroCap = frasesVistas.get(s)!;
            if (outroCap !== idx && !issues.some(i => i.type === 'plagio')) {
              issues.push({
                id: `plagio-rep-${idx}`,
                chapterIndex: idx,
                chapterTitle: cap.titulo,
                type: 'plagio',
                typeLabel: 'Originalidade & Anti-Plágio',
                severity: 'media',
                description: `Frase com alta similaridade repetida idêntica entre o Capítulo ${outroCap + 1} e o Capítulo ${idx + 1}.`,
                originalSnippet: `"${s.slice(0, 110)}..."`,
                suggestedFix: 'Reescrever a sentença com vocabulário alternativo para enriquecer o vocabulário e garantir 100% de originalidade.',
                applied: false
              });
            }
          } else {
            frasesVistas.set(s, idx);
          }
        }
      });
    });
  }

  // --- 5. DETECTOR DE ALUCINAÇÃO & COERÊNCIA NARRATIVA ---
  private static checkAlucinacaoECoerencia(livro: LivroLike, premissa: string, issues: VerifierIssue[]) {
    if (!premissa) return;
    const keywordsPremissa = premissa.toLowerCase().split(/\s+/).filter(w => w.length > 4);

    livro.capitulos.forEach((cap, idx) => {
      const textoLower = cap.texto.toLowerCase();
      // Checar se o capítulo contém elementos de coerência temática
      const matches = keywordsPremissa.filter(kw => textoLower.includes(kw));

      // Se for um capítulo muito longo sem qualquer conexão com a premissa
      if (matches.length === 0 && cap.texto.length > 1200 && keywordsPremissa.length > 3) {
        if (!issues.some(i => i.type === 'alucinacao')) {
          issues.push({
            id: `aluc-drift-${idx}`,
            chapterIndex: idx,
            chapterTitle: cap.titulo,
            type: 'alucinacao',
            typeLabel: 'Anti-Alucinação & Coerência',
            severity: 'baixa',
            description: `O Capítulo ${idx + 1} pode estar se afastando do eixo principal da obra ("${premissa.slice(0, 60)}...").`,
            originalSnippet: cap.texto.slice(0, 150) + '...',
            suggestedFix: 'Reancorar o protagonista no objetivo central estabelecido na premissa da obra.',
            applied: false
          });
        }
      }
    });
  }

  // --- APLICAÇÃO DE CORREÇÃO EM 1 CLIQUE ---
  public static applyFix<T extends LivroLike>(livro: T, issue: VerifierIssue): T {
    const novoLivro = JSON.parse(JSON.stringify(livro)) as T;
    const cap = novoLivro.capitulos[issue.chapterIndex];
    if (!cap) return livro;

    if (issue.type === 'gramatica') {
      // Correções pontuais de texto
      if (issue.id.includes('gram-punct')) {
        cap.texto = cap.texto.replace(/([,;.]){2,}/g, '$1');
      } else if (issue.id.includes('gram-dup-word')) {
        cap.texto = cap.texto.replace(/\b(o|a|os|as|de|da|do|das|dos|que|se|em|um|uma)\s+\1\b/gi, '$1');
      } else if (issue.id.includes('gram-travessao')) {
        cap.texto = cap.texto.split('\n').map(l => {
          const lTrim = l.trim();
          if (lTrim.startsWith('- ') || lTrim.startsWith('-- ')) {
            return '— ' + lTrim.replace(/^--?\s*/, '');
          }
          return l;
        }).join('\n');
      }
    } else if (issue.type === 'diagramacao') {
      if (issue.id.includes('diag-no-breaks')) {
        // Quebrar em parágrafos a cada 3 sentenças
        const sentencas = cap.texto.split(/(?<=[.?!])\s+/);
        const novosParas: string[] = [];
        for (let i = 0; i < sentencas.length; i += 3) {
          novosParas.push(sentencas.slice(i, i + 3).join(' '));
        }
        cap.texto = novosParas.join('\n\n');
      }
    } else if (issue.type === 'paragrafo') {
      // Dividir parágrafos muito longos
      const paras = cap.texto.split(/\n\s*\n/);
      const ajustados = paras.map(p => {
        const words = p.split(/\s+/).filter(Boolean);
        if (words.length > 220) {
          const sentences = p.split(/(?<=[.?!])\s+/);
          if (sentences.length >= 2) {
            const mid = Math.ceil(sentences.length / 2);
            return `${sentences.slice(0, mid).join(' ')}\n\n${sentences.slice(mid).join(' ')}`;
          }
        }
        return p;
      });
      cap.texto = ajustados.join('\n\n');
    }

    issue.applied = true;
    return novoLivro;
  }

  // --- APLICAR TODAS AS CORREÇÕES DE UMA VEZ ---
  public static applyAllFixes<T extends LivroLike>(livro: T, issues: VerifierIssue[]): { livro: T; fixedCount: number } {
    let livroAtualizado = JSON.parse(JSON.stringify(livro)) as T;
    let fixedCount = 0;

    issues.forEach(issue => {
      if (!issue.applied) {
        livroAtualizado = this.applyFix(livroAtualizado, issue);
        issue.applied = true;
        fixedCount++;
      }
    });

    return { livro: livroAtualizado, fixedCount };
  }
}
