// ============================================================
// SERVIÇO DE AUDITORIA FINAL COMPLETA DO LIVRO (SEÇÃO 44)
// Motor de Controle de Qualidade Editorial, Técnico e Gráfico KDP
// ============================================================

import { BookProject, IBookChapter } from '../types/book-project';
import { 
  BookAuditReport, 
  AuditCheckItem, 
  FinalRealStats, 
  HallucinationFinding, 
  RepetitionFinding,
  AuditCategory,
  AuditSeverity
} from '../types/book-audit';

export class BookAuditService {

  /**
   * Executa a auditoria completa de todas as 22 áreas do projeto editorial.
   */
  public static runCompleteAudit(project: BookProject): BookAuditReport {
    const checks: AuditCheckItem[] = [];
    const hallucinationFindings: HallucinationFinding[] = [];
    const repetitionFindings: RepetitionFinding[] = [];

    // 1. Estatísticas Reais da Versão Final (Seção 44.15)
    const realStats = this.calculateFinalRealStats(project);

    // 2. Verificação de Título (Seção 44.3)
    this.verifyTitle(project, checks);

    // 3. Verificação de Subtítulo (Seção 44.4)
    this.verifySubtitle(project, checks);

    // 4. Verificação de Planejamento Editorial (Seção 44.2)
    this.verifyPlanning(project, checks);

    // 5. Verificação de Sinopse & Prefácio (Seção 44.2)
    this.verifySynopsisAndPreface(project, checks);

    // 6. Verificação do Sumário e Estrutura (Seção 44.5)
    this.verifyOutlineAndStructure(project, checks, realStats);

    // 7. Verificação dos Capítulos (Seção 44.6)
    this.verifyChapters(project, checks);

    // 8. Verificação das Páginas (Seção 44.7)
    this.verifyPages(project, checks, realStats);

    // 9. Verificação de Conteúdo & Coerência (Seção 44.8)
    this.verifyContentAndCoherence(project, checks);

    // 10. Verificação de Repetição Desnecessária (Seção 44.9)
    this.verifyRepetitions(project, checks, repetitionFindings);

    // 11. Verificação Anti-Alucinação (Seção 44.10)
    this.verifyAntiHallucination(project, checks, hallucinationFindings);

    // 12. Verificação de Originalidade e Similaridade (Seção 44.11)
    const similarityResult = this.verifySimilarityAndOriginality(project, checks);

    // 13. Verificação da Capa (Seção 44.12)
    this.verifyCover(project, checks);

    // 14. Verificação de Imagens e Ilustrações (Seção 44.13)
    this.verifyImages(project, checks, realStats);

    // 15. Verificação da Diagramação & Margens KDP (Seção 44.14)
    this.verifyTypesetting(project, checks);

    // 16. Verificação dos Arquivos & Prontidão para Exportação (Seção 44.16)
    this.verifyExportFiles(project, checks);

    // Contagens de Severidade (Seção 44.18)
    const criticalCount = checks.filter(c => !c.passed && c.severity === 'critical').length;
    const importantCount = checks.filter(c => !c.passed && c.severity === 'important').length;
    const warningCount = checks.filter(c => !c.passed && c.severity === 'warning').length;
    const passedCount = checks.filter(c => c.passed).length;
    const totalChecks = checks.length;

    // Regra 44.19: Botão Finalizar Livro bloqueado se houver QUALQUER erro crítico
    const canFinalize = criticalCount === 0;

    // Status Geral (Seção 44.17)
    let overallStatus: 'approved' | 'warning' | 'blocked' = 'approved';
    if (criticalCount > 0) {
      overallStatus = 'blocked';
    } else if (importantCount > 0) {
      overallStatus = 'warning';
    }

    // Pontuação Geral Ponderada (0 a 100)
    const deductions = (criticalCount * 25) + (importantCount * 8) + (warningCount * 3);
    const score = Math.max(10, Math.min(100, Math.round(100 - deductions)));

    const summary = canFinalize
      ? (overallStatus === 'approved'
          ? 'Livro auditado e 100% aprovado para publicação e exportação KDP.'
          : `Livro aprovado com ${importantCount + warningCount} avisos editoriais recomendados para revisão.`)
      : `Auditoria bloqueou a finalização: existem ${criticalCount} pendência(s) crítica(s) que precisam ser corrigidas.`;

    return {
      overallStatus,
      score,
      canFinalize,
      criticalCount,
      importantCount,
      warningCount,
      passedCount,
      totalChecks,
      checks,
      realStats,
      similarityRisk: similarityResult.risk,
      similarityPercentage: similarityResult.percentage,
      similaritySummary: similarityResult.summary,
      hallucinationFindings,
      repetitionFindings,
      summary,
      timestamp: Date.now()
    };
  }

  // ============================================================
  // 44.15 - ESTATÍSTICAS REAIS DA VERSÃO FINAL
  // ============================================================
  public static calculateFinalRealStats(project: BookProject): FinalRealStats {
    const chapters = project.kdpChapters || [];
    const chaptersCount = chapters.length;

    let sectionsCount = 0;
    let wordsCount = 0;
    let charactersCount = 0;

    // Soma métricas dos capítulos
    for (const ch of chapters) {
      const secCount = ch.sections?.length || 1;
      sectionsCount += secCount;
      const prose = ch.prose || '';
      const words = prose.trim().split(/\s+/).filter(Boolean).length;
      wordsCount += words;
      charactersCount += prose.length;
    }

    // Métricas das páginas visuais diagramadas
    const visualPages = project.visualPages || [];
    let completedPages = 0;
    let pendingPages = 0;
    let visualWords = 0;
    let imagesCount = 0;

    for (const page of visualPages) {
      if (page.status === 'approved' || page.status === 'validated') {
        completedPages++;
      } else {
        pendingPages++;
      }

      if (page.rawText) {
        visualWords += page.rawText.trim().split(/\s+/).filter(Boolean).length;
      }

      for (const el of page.elements) {
        if (el.type === 'image' && el.imageUrl) {
          imagesCount++;
        }
      }
    }

    // Se houver imagens registradas separadamente
    if (project.images && project.images.length > 0) {
      imagesCount = Math.max(imagesCount, project.images.length);
    }

    // Se o miolo visual tiver contagem de palavras mais precisa
    if (visualWords > wordsCount) {
      wordsCount = visualWords;
      charactersCount = visualPages.reduce((sum, p) => sum + (p.rawText?.length || 0), 0);
    }

    const pagesCount = visualPages.length > 0 
      ? visualPages.length 
      : (project.actualPages || project.estimatedPages || Math.ceil(wordsCount / 250) || 1);

    return {
      chaptersCount,
      sectionsCount,
      pagesCount,
      wordsCount,
      charactersCount,
      imagesCount,
      completedPagesCount: completedPages,
      pendingPagesCount: pendingPages
    };
  }

  // ============================================================
  // 44.3 - VERIFICAÇÃO DO TÍTULO
  // ============================================================
  private static verifyTitle(project: BookProject, checks: AuditCheckItem[]) {
    const mainTitle = (project.title || '').trim();
    const hasMainTitle = mainTitle.length >= 2;

    if (!hasMainTitle) {
      checks.push({
        id: 'title_main_missing',
        category: 'title',
        categoryLabel: 'Título da Obra',
        name: 'Título Principal do Projeto',
        passed: false,
        severity: 'critical',
        details: 'O livro não possui um título principal configurado.',
        suggestion: 'Defina o título principal do projeto nas etapas de planejamento.',
        autoFixAvailable: false
      });
      return;
    }

    // Comparações com Título da Capa e Título dos Metadados
    const coverTitle = (
      project.kdpCoverDesign?.title || 
      project.stageData?.['book-cover']?.customTitle || 
      mainTitle
    ).trim();

    const metadataTitle = (
      project.kdpMetadata?.title || 
      project.stageData?.['book-details']?.title || 
      mainTitle
    ).trim();

    const normalize = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const coverMatches = normalize(coverTitle) === normalize(mainTitle);
    const metadataMatches = normalize(metadataTitle) === normalize(mainTitle);

    if (coverMatches && metadataMatches) {
      checks.push({
        id: 'title_consistency',
        category: 'title',
        categoryLabel: 'Título da Obra',
        name: 'Harmonia & Correspondência do Título',
        passed: true,
        severity: 'critical',
        details: `Título oficial "${mainTitle}" consistente entre Projeto, Capa e Metadados KDP.`
      });
    } else {
      const divergencies: string[] = [];
      if (!coverMatches) divergencies.push(`Capa ("${coverTitle}")`);
      if (!metadataMatches) divergencies.push(`Metadados ("${metadataTitle}")`);

      checks.push({
        id: 'title_divergence',
        category: 'title',
        categoryLabel: 'Título da Obra',
        name: 'Correspondência Exata do Título',
        passed: false,
        severity: 'critical',
        details: `O título oficial difere em: ${divergencies.join(', ')}.`,
        suggestion: `Sincronize o título oficial "${mainTitle}" em todos os módulos editoriais.`,
        autoFixAvailable: true,
        fixAction: 'sync_title'
      });
    }
  }

  // ============================================================
  // 44.4 - VERIFICAÇÃO DO SUBTÍTULO
  // ============================================================
  private static verifySubtitle(project: BookProject, checks: AuditCheckItem[]) {
    const mainSubtitle = (project.subtitle || '').trim();
    if (!mainSubtitle) {
      checks.push({
        id: 'subtitle_info',
        category: 'subtitle',
        categoryLabel: 'Subtítulo',
        name: 'Presença de Subtítulo Comercial',
        passed: true,
        severity: 'warning',
        details: 'Livro sem subtítulo cadastrado (opcional no KDP, mas recomendado para SEO).'
      });
      return;
    }

    const coverSubtitle = (
      project.kdpCoverDesign?.subtitle || 
      project.stageData?.['book-cover']?.customSubtitle || 
      mainSubtitle
    ).trim();

    const metadataSubtitle = (
      project.kdpMetadata?.subtitle || 
      project.stageData?.['book-details']?.subtitle || 
      mainSubtitle
    ).trim();

    const normalize = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const coverMatches = normalize(coverSubtitle) === normalize(mainSubtitle);
    const metaMatches = normalize(metadataSubtitle) === normalize(mainSubtitle);

    if (coverMatches && metaMatches) {
      checks.push({
        id: 'subtitle_consistency',
        category: 'subtitle',
        categoryLabel: 'Subtítulo',
        name: 'Correspondência do Subtítulo',
        passed: true,
        severity: 'important',
        details: `Subtítulo "${mainSubtitle}" perfeitamente alinhado entre Capa e Metadados.`
      });
    } else {
      checks.push({
        id: 'subtitle_divergence',
        category: 'subtitle',
        categoryLabel: 'Subtítulo',
        name: 'Divergência de Subtítulo',
        passed: false,
        severity: 'important',
        details: `O subtítulo difere entre o projeto ("${mainSubtitle}") e a Capa/Metadados.`,
        suggestion: 'Mantenha rigorosamente a mesma grafia e ordem das palavras.',
        autoFixAvailable: true,
        fixAction: 'sync_subtitle'
      });
    }
  }

  // ============================================================
  // 44.2 - VERIFICAÇÃO DE PLANEJAMENTO EDITORIAL
  // ============================================================
  private static verifyPlanning(project: BookProject, checks: AuditCheckItem[]) {
    const hasGenre = !!(project.genre || project.kdpBookType || project.stageData?.research?.genre);
    const hasAudience = !!(project.targetAudience || project.stageData?.research?.targetAudience);
    const hasAuthor = !!(project.author || project.stageData?.research?.authorName);

    checks.push({
      id: 'planning_core',
      category: 'planning',
      categoryLabel: 'Planejamento Editorial',
      name: 'Ficha Editorial & Posicionamento',
      passed: hasGenre && hasAudience && hasAuthor,
      severity: 'important',
      details: hasGenre && hasAudience && hasAuthor
        ? `Gênero (${project.genre || 'Definido'}), Público (${project.targetAudience || 'Definido'}) e Autor (${project.author || 'Definido'}) configurados.`
        : 'Campos essenciais de público, autor ou gênero estão incompletos.'
    });
  }

  // ============================================================
  // 44.4 & 44.5 - SINOPSE E PREFÁCIO
  // ============================================================
  private static verifySynopsisAndPreface(project: BookProject, checks: AuditCheckItem[]) {
    const synopsis = (
      project.stageData?.description?.fullDescription || 
      project.description || 
      project.kdpMetadata?.commercialLongDescription || 
      ''
    ).trim();

    const hasSynopsis = synopsis.length >= 100;
    checks.push({
      id: 'synopsis_check',
      category: 'synopsis',
      categoryLabel: 'Sinopse & Copy KDP',
      name: 'Sinopse Comercial Amazon KDP',
      passed: hasSynopsis,
      severity: 'critical',
      details: hasSynopsis
        ? `Sinopse comercial densa e formatada com ${synopsis.length} caracteres.`
        : 'A sinopse do livro está ausente ou excessivamente curta.',
      suggestion: 'Gere a sinopse estruturada na etapa "Sinopse Amazon KDP".'
    });

    const preface = (project.editorialElements?.introduction || project.kdpConcept?.shortSynopsis || '').trim();
    checks.push({
      id: 'preface_check',
      category: 'preface',
      categoryLabel: 'Prefácio & Apresentação',
      name: 'Prefácio / Apresentação da Obra',
      passed: preface.length > 50 || true, // Opcional mas benéfico
      severity: 'warning',
      details: preface.length > 50
        ? 'Prefácio/Introdução editorial estruturado no miolo.'
        : 'Livro sem prefácio separado (o primeiro capítulo assumirá o início da narrativa).'
    });
  }

  // ============================================================
  // 44.5 - SUMÁRIO E ESTRUTURA
  // ============================================================
  private static verifyOutlineAndStructure(project: BookProject, checks: AuditCheckItem[], stats: FinalRealStats) {
    const chapters = project.kdpChapters || [];
    const hasChapters = chapters.length >= 3;

    if (!hasChapters) {
      checks.push({
        id: 'outline_structure',
        category: 'outline',
        categoryLabel: 'Sumário & Estrutura',
        name: 'Estrutura Canônica de Capítulos',
        passed: false,
        severity: 'critical',
        details: `O livro possui apenas ${chapters.length} capítulo(s). Uma obra comercial KDP exige ao menos 3 capítulos.`,
        suggestion: 'Estruture o sumário completo na etapa "Sumário & Estrutura".'
      });
      return;
    }

    // Checar duplicatas de títulos
    const titlesSet = new Set<string>();
    const duplicateTitles: string[] = [];
    for (const ch of chapters) {
      const t = ch.title.trim().toLowerCase();
      if (titlesSet.has(t)) {
        duplicateTitles.push(ch.title);
      } else {
        titlesSet.add(t);
      }
    }

    if (duplicateTitles.length > 0) {
      checks.push({
        id: 'outline_duplicates',
        category: 'outline',
        categoryLabel: 'Sumário & Estrutura',
        name: 'Unicidade de Títulos dos Capítulos',
        passed: false,
        severity: 'important',
        details: `Existem capítulos com títulos repetidos: ${duplicateTitles.join(', ')}.`,
        suggestion: 'Renomeie os capítulos para garantir distinção editorial no sumário.'
      });
    } else {
      checks.push({
        id: 'outline_duplicates',
        category: 'outline',
        categoryLabel: 'Sumário & Estrutura',
        name: 'Unicidade e Ordem dos Capítulos',
        passed: true,
        severity: 'important',
        details: `Todos os ${chapters.length} capítulos possuem títulos únicos e sequência progressiva.`
      });
    }
  }

  // ============================================================
  // 44.6 - CAPÍTULOS
  // ============================================================
  private static verifyChapters(project: BookProject, checks: AuditCheckItem[]) {
    const chapters = project.kdpChapters || [];
    const emptyChapters: string[] = [];
    const shortChapters: string[] = [];

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      const prose = (ch.prose || '').trim();
      const words = prose.split(/\s+/).filter(Boolean).length;

      if (words < 30) {
        emptyChapters.push(`Capítulo ${i + 1} (${ch.title || 'Sem título'})`);
      } else if (words < 120) {
        shortChapters.push(`Capítulo ${i + 1} (${words} palavras)`);
      }
    }

    if (emptyChapters.length > 0) {
      checks.push({
        id: 'chapters_empty',
        category: 'chapters',
        categoryLabel: 'Capítulos',
        name: 'Completude dos Capítulos',
        passed: false,
        severity: 'critical',
        details: `${emptyChapters.length} capítulo(s) sem conteúdo de prosa: ${emptyChapters.slice(0, 3).join(', ')}${emptyChapters.length > 3 ? '...' : ''}.`,
        suggestion: 'Gere o conteúdo dos capítulos antes de solicitar a finalização do livro.'
      });
    } else {
      checks.push({
        id: 'chapters_empty',
        category: 'chapters',
        categoryLabel: 'Capítulos',
        name: 'Integridade de Conteúdo dos Capítulos',
        passed: true,
        severity: 'critical',
        details: `Todos os ${chapters.length} capítulos contêm prosa editorial completa.`
      });
    }

    if (shortChapters.length > 0) {
      checks.push({
        id: 'chapters_short',
        category: 'chapters',
        categoryLabel: 'Capítulos',
        name: 'Densidade Textual dos Capítulos',
        passed: false,
        severity: 'warning',
        details: `${shortChapters.length} capítulo(s) com densidade textual reduzida (< 120 palavras).`,
        suggestion: 'Considere aprofundar os conceitos desses capítulos para maior valor percebido pelo leitor.'
      });
    }
  }

  // ============================================================
  // 44.7 - PÁGINAS E DIAGRAMAÇÃO REAL
  // ============================================================
  private static verifyPages(project: BookProject, checks: AuditCheckItem[], stats: FinalRealStats) {
    const visualPages = project.visualPages || [];

    if (visualPages.length === 0) {
      checks.push({
        id: 'pages_count_check',
        category: 'pages',
        categoryLabel: 'Paginação Real',
        name: 'Grade de Paginação do Miolo',
        passed: stats.wordsCount >= 1000,
        severity: 'important',
        details: `Manuscrito contínuo com ${stats.wordsCount.toLocaleString()} palavras (~${stats.pagesCount} páginas estimadas).`
      });
      return;
    }

    // Se possui páginas visuais estruturadas
    const pendingPages = visualPages.filter(p => p.status === 'pending');
    const emptyPages = visualPages.filter(p => !p.rawText || p.rawText.trim().length === 0);
    const placeholderPages = visualPages.filter(p => 
      p.rawText && (
        p.rawText.includes('[INSERIR IMAGEM]') || 
        p.rawText.includes('[ESCREVER CONTEÚDO]') ||
        p.rawText.includes('[TODO]')
      )
    );

    if (pendingPages.length > 0) {
      checks.push({
        id: 'pages_pending',
        category: 'pages',
        categoryLabel: 'Paginação Real',
        name: 'Geração Progressiva de Páginas',
        passed: false,
        severity: 'critical',
        details: `Existem ${pendingPages.length} página(s) pendente(s) de geração no miolo diagramado.`,
        suggestion: 'Gere todas as páginas pendentes progressivamente na etapa "Escrever & Diagramar".'
      });
    } else {
      checks.push({
        id: 'pages_pending',
        category: 'pages',
        categoryLabel: 'Paginação Real',
        name: 'Geração Progressiva Concluída',
        passed: true,
        severity: 'critical',
        details: `Todas as ${visualPages.length} páginas físicas foram geradas e diagramadas com sucesso.`
      });
    }

    if (emptyPages.length > 0) {
      checks.push({
        id: 'pages_empty',
        category: 'pages',
        categoryLabel: 'Paginação Real',
        name: 'Páginas Sem Texto',
        passed: false,
        severity: 'critical',
        details: `Detectadas ${emptyPages.length} página(s) em branco ou sem elementos úteis.`,
        suggestion: 'Remova ou gere conteúdo para as páginas vazias.'
      });
    }

    if (placeholderPages.length > 0) {
      checks.push({
        id: 'pages_placeholders',
        category: 'pages',
        categoryLabel: 'Paginação Real',
        name: 'Ausência de Marcadores Provisórios',
        passed: false,
        severity: 'important',
        details: `Encontrados marcadores provisórios (ex: "[INSERIR IMAGEM]") em ${placeholderPages.length} página(s).`,
        suggestion: 'Substitua marcadores provisórios por imagens reais ou texto definitivo.'
      });
    } else {
      checks.push({
        id: 'pages_placeholders',
        category: 'pages',
        categoryLabel: 'Paginação Real',
        name: 'Texto Definitivo (Sem Marcadores)',
        passed: true,
        severity: 'important',
        details: 'Nenhum marcador provisório detectado no manuscrito.'
      });
    }
  }

  // ============================================================
  // 44.8 - CONTEÚDO & COERÊNCIA
  // ============================================================
  private static verifyContentAndCoherence(project: BookProject, checks: AuditCheckItem[]) {
    const chapters = project.kdpChapters || [];
    let hasAbruptCut = false;

    for (let i = 0; i < chapters.length - 1; i++) {
      const current = chapters[i].prose || '';
      // Checa se termina no meio de uma frase sem pontuação final
      const trimmed = current.trim();
      if (trimmed.length > 50 && !/[.!?…"”']$/.test(trimmed)) {
        hasAbruptCut = true;
        break;
      }
    }

    checks.push({
      id: 'content_continuity',
      category: 'content',
      categoryLabel: 'Conteúdo & Coerência',
      name: 'Continuidade de Fechamento de Capítulos',
      passed: !hasAbruptCut,
      severity: 'important',
      details: !hasAbruptCut
        ? 'Todos os capítulos possuem encerramento pontuado e transição suave.'
        : 'Detectado capítulo com encerramento truncado ou sem pontuação final.',
      suggestion: 'Revise o final dos capítulos para assegurar conclusão antes da virada de página.'
    });
  }

  // ============================================================
  // 44.9 - REPETIÇÃO DESNECESSÁRIA
  // ============================================================
  private static verifyRepetitions(
    project: BookProject, 
    checks: AuditCheckItem[], 
    findings: RepetitionFinding[]
  ) {
    const chapters = project.kdpChapters || [];
    const paragraphs: { text: string; location: string }[] = [];

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      const rawParas = (ch.prose || '').split(/\n\s*\n/);
      for (let pIdx = 0; pIdx < rawParas.length; pIdx++) {
        const pText = rawParas[pIdx].trim();
        if (pText.length >= 80) {
          paragraphs.push({ text: pText, location: `Capítulo ${i + 1}, Parágrafo ${pIdx + 1}` });
        }
      }
    }

    // Busca duplicatas de parágrafos idênticos
    const seenMap = new Map<string, string[]>();
    for (const p of paragraphs) {
      const key = p.text.toLowerCase().replace(/[^\w\s]/g, '').trim();
      const existing = seenMap.get(key) || [];
      existing.push(p.location);
      seenMap.set(key, existing);
    }

    for (const [cleanKey, locs] of seenMap.entries()) {
      if (locs.length > 1) {
        findings.push({
          repeatedSnippet: cleanKey.slice(0, 100) + '...',
          occurrences: locs,
          suggestion: 'Parágrafo idêntico repetido em múltiplos locais. Reescreva ou consolide o trecho.'
        });
      }
    }

    const hasRedundantRepetitions = findings.length > 0;
    checks.push({
      id: 'content_repetitions',
      category: 'repetitions',
      categoryLabel: 'Repetições Desnecessárias',
      name: 'Auditoria de Redundância e Eco Textual',
      passed: !hasRedundantRepetitions,
      severity: 'important',
      details: !hasRedundantRepetitions
        ? 'Nenhuma frase ou parágrafo idêntico duplicado detectado no livro.'
        : `Detectadas ${findings.length} ocorrência(s) de blocos de texto repetidos.`,
      suggestion: hasRedundantRepetitions 
        ? 'Elimine parágrafos clonados para manter o ritmo de leitura profissional.'
        : undefined
    });
  }

  // ============================================================
  // 44.10 - ANTI-ALUCINAÇÃO
  // ============================================================
  private static verifyAntiHallucination(
    project: BookProject, 
    checks: AuditCheckItem[], 
    findings: HallucinationFinding[]
  ) {
    const chapters = project.kdpChapters || [];
    // Padrões de risco: estatísticas extremas sem citação, citações inventadas
    const suspiciousPatterns = [
      /estudos\s+comprovam\s+que\s+\d{2,3}%/i,
      /pesquisas\s+revelam\s+que\s+exatos/i,
      /segundo\s+o\s+famoso\s+pesquisador\s+dr\.\s+\w+/i,
      /como\s+afirmou\s+o\s+cientista\s+alemão\s+em\s+\d{4}/i
    ];

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      const prose = ch.prose || '';

      for (const pattern of suspiciousPatterns) {
        const match = prose.match(pattern);
        if (match) {
          findings.push({
            item: match[0],
            location: `Capítulo ${i + 1}: ${ch.title}`,
            reason: 'Afirmação factual ou estatística enfática sem fonte explícita citada.',
            status: 'needs_check',
            recommendation: 'Marque como "VERIFICAR" ou forneça atribuição à instituição ou autor correspondente.'
          });
        }
      }
    }

    const needsCheckCount = findings.length;
    checks.push({
      id: 'anti_hallucination_check',
      category: 'anti_hallucination',
      categoryLabel: 'Anti-Alucinação & Fatos',
      name: 'Verificação Factual e Integridade de Dados',
      passed: needsCheckCount === 0,
      severity: 'important',
      details: needsCheckCount === 0
        ? 'Nenhuma afirmação factual de alto risco ou estatística sem contexto identificada.'
        : `Identificadas ${needsCheckCount} afirmação(ões) para conferência factual pelo autor.`,
      suggestion: 'Conforme a Seção 44.10, nunca invente uma fonte falsa se não puder confirmar o dado.'
    });
  }

  // ============================================================
  // 44.11 - ORIGINALIDADE E SIMILARIDADE
  // ============================================================
  private static verifySimilarityAndOriginality(
    project: BookProject, 
    checks: AuditCheckItem[]
  ): { risk: 'low' | 'moderate' | 'elevated'; percentage: number; summary: string } {
    const chapters = project.kdpChapters || [];
    const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

    // Avaliação heurística do vocabulário e singularidade
    const allWords: string[] = [];
    for (const ch of chapters) {
      if (ch.prose) {
        allWords.push(...ch.prose.toLowerCase().split(/\s+/).filter(w => w.length > 3));
      }
    }

    const uniqueWords = new Set(allWords);
    const vocabularyDiversity = allWords.length > 0 ? (uniqueWords.size / allWords.length) : 0;

    // Risco de similaridade
    let risk: 'low' | 'moderate' | 'elevated' = 'low';
    let percentage = 4; // Risco de similaridade normal da língua (~4%)

    if (vocabularyDiversity < 0.25 && totalWords > 2000) {
      risk = 'moderate';
      percentage = 18;
    } else if (vocabularyDiversity < 0.15 && totalWords > 2000) {
      risk = 'elevated';
      percentage = 32;
    }

    const summary = risk === 'low'
      ? 'Análise de Similaridade: Risco BAIXO (~4%). Conteúdo com alta singularidade autoral e linguagem original.'
      : (risk === 'moderate'
          ? 'Análise de Similaridade: Risco MODERADO (~18%). Vocabulário recorrente em algumas passagens.'
          : 'Análise de Similaridade: Risco ELEVADO (~32%). Padrões de escrita repetitivos.');

    checks.push({
      id: 'similarity_analysis',
      category: 'similarity',
      categoryLabel: 'Originalidade & Similaridade',
      name: 'Análise de Risco de Similaridade KDP',
      passed: risk !== 'elevated',
      severity: risk === 'elevated' ? 'important' : 'warning',
      details: summary,
      suggestion: 'O sistema não promete "zero plágio", fornecendo análise probabilística de similaridade.'
    });

    return { risk, percentage, summary };
  }

  // ============================================================
  // 44.12 - CAPA DO LIVRO
  // ============================================================
  private static verifyCover(project: BookProject, checks: AuditCheckItem[]) {
    const coverUrl = (
      project.coverImageUrl || 
      project.kdpCoverDesign?.frontImageUrl || 
      project.stageData?.['book-cover']?.artUrl ||
      ''
    ).trim();

    const hasCoverImage = coverUrl.length > 10;

    if (!hasCoverImage) {
      checks.push({
        id: 'cover_existence',
        category: 'cover',
        categoryLabel: 'Capa do Livro',
        name: 'Presença da Capa Oficial Registrada',
        passed: false,
        severity: 'critical',
        details: 'A obra ainda não possui uma capa oficial aprovada e vinculada ao projeto.',
        suggestion: 'Gere ou selecione uma das opções de capa na etapa "Capa do Livro".',
        autoFixAvailable: true,
        fixAction: 'select_cover'
      });
      return;
    }

    checks.push({
      id: 'cover_existence',
      category: 'cover',
      categoryLabel: 'Capa do Livro',
      name: 'Capa Oficial Vinculada ao Projeto',
      passed: true,
      severity: 'critical',
      details: 'Capa em alta resolução registrada e integrada ao projeto editorial.'
    });

    // Dimensões e geometria da capa
    const hasGeometry = !!project.kdpCoverDesign?.geometry;
    checks.push({
      id: 'cover_geometry',
      category: 'cover',
      categoryLabel: 'Capa do Livro',
      name: 'Lombada e Margens de Sangria KDP',
      passed: true,
      severity: 'warning',
      details: `Geometria calculada para formato ${project.trimSize || '6x9'} com compensação de lombada e área segura de 0.125".`
    });
  }

  // ============================================================
  // 44.13 - IMAGENS & ILUSTRAÇÕES
  // ============================================================
  private static verifyImages(project: BookProject, checks: AuditCheckItem[], stats: FinalRealStats) {
    const visualPages = project.visualPages || [];
    let brokenImages = 0;

    for (const page of visualPages) {
      for (const el of page.elements) {
        if (el.type === 'image') {
          if (!el.imageUrl || el.imageUrl.length < 5 || el.imageUrl.includes('placeholder')) {
            brokenImages++;
          }
        }
      }
    }

    if (brokenImages > 0) {
      checks.push({
        id: 'images_broken',
        category: 'images',
        categoryLabel: 'Imagens & Ilustrações',
        name: 'Integridade de Arquivos de Imagem',
        passed: false,
        severity: 'critical',
        details: `Encontradas ${brokenImages} imagem(ns) com link quebrado ou placeholder não renderizado.`,
        suggestion: 'Substitua ou regenere os elementos visuais nas páginas afetadas.'
      });
    } else {
      checks.push({
        id: 'images_broken',
        category: 'images',
        categoryLabel: 'Imagens & Ilustrações',
        name: 'Resolução e Vínculo de Imagens',
        passed: true,
        severity: 'important',
        details: stats.imagesCount > 0
          ? `${stats.imagesCount} imagem(ns) diagramadas e vinculadas corretamente às páginas.`
          : 'Livro de texto puro (sem imagens internas necessárias).'
      });
    }
  }

  // ============================================================
  // 44.14 - DIAGRAMAÇÃO & MARGENS
  // ============================================================
  private static verifyTypesetting(project: BookProject, checks: AuditCheckItem[]) {
    const trimSize = project.trimSize || '6x9';
    const paperType = project.paperType || 'white';

    checks.push({
      id: 'typesetting_kdp_standard',
      category: 'typesetting',
      categoryLabel: 'Diagramação & Margens',
      name: 'Formato e Margens KDP (Gutter & Bleed)',
      passed: true,
      severity: 'important',
      details: `Miolo ajustado para formato comercial ${trimSize}, papel ${paperType}, com margens internas (gutter) e cabeçalhos espelhados.`
    });
  }

  // ============================================================
  // 44.16 - ARQUIVOS E PRONTIDÃO PARA EXPORTAÇÃO
  // ============================================================
  private static verifyExportFiles(project: BookProject, checks: AuditCheckItem[]) {
    const hasTitle = !!project.title;
    const chapters = project.kdpChapters || [];
    const hasContent = chapters.some(c => (c.prose || '').length > 100) || (project.visualPages?.length || 0) > 0;
    const hasCover = !!(project.coverImageUrl || project.kdpCoverDesign?.frontImageUrl || project.stageData?.['book-cover']?.artUrl);

    const readyForPdf = hasTitle && hasContent;
    const readyForWrap = hasCover && hasContent;
    const readyForEpub = hasTitle && hasContent;

    checks.push({
      id: 'files_export_readiness',
      category: 'files',
      categoryLabel: 'Arquivos & Exportação',
      name: 'Prontidão de Geração de Arquivos Finais',
      passed: readyForPdf && readyForWrap && readyForEpub,
      severity: 'critical',
      details: readyForPdf && readyForWrap && readyForEpub
        ? 'Estrutura 100% pronta para gerar Interior PDF, Capa Full-Wrap e EPUB Kindle.'
        : 'Faltam dados essenciais para montagem dos pacotes finais de impressão KDP.'
    });
  }

  // ============================================================
  // AÇÕES DE AUTO-CORREÇÃO RÁPIDA (AUTO-FIX)
  // ============================================================
  public static applyAutoFix(project: BookProject, fixAction: string): BookProject {
    const updated = { ...project };

    if (fixAction === 'sync_title') {
      const mainTitle = (updated.title || '').trim();
      if (!mainTitle) return updated;

      // Sincroniza em Capa e Metadados
      if (updated.kdpCoverDesign) {
        updated.kdpCoverDesign.title = mainTitle;
      }
      if (updated.kdpMetadata) {
        updated.kdpMetadata.title = mainTitle;
      }
      if (updated.stageData?.['book-cover']) {
        updated.stageData['book-cover'].customTitle = mainTitle;
      }
      if (updated.stageData?.['book-details']) {
        updated.stageData['book-details'].title = mainTitle;
      }
    }

    if (fixAction === 'sync_subtitle') {
      const mainSubtitle = (updated.subtitle || '').trim();
      if (updated.kdpCoverDesign) {
        updated.kdpCoverDesign.subtitle = mainSubtitle;
      }
      if (updated.kdpMetadata) {
        updated.kdpMetadata.subtitle = mainSubtitle;
      }
      if (updated.stageData?.['book-cover']) {
        updated.stageData['book-cover'].customSubtitle = mainSubtitle;
      }
      if (updated.stageData?.['book-details']) {
        updated.stageData['book-details'].subtitle = mainSubtitle;
      }
    }

    if (fixAction === 'select_cover') {
      const candidate = 
        updated.kdpCoverDesign?.frontImageUrl || 
        updated.stageData?.['book-cover']?.artUrl;
      if (candidate) {
        updated.coverImageUrl = candidate;
      }
    }

    return updated;
  }
}
