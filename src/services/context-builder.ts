import { 
  BookProject, 
  IBookConcept, 
  IBookBible, 
  IBookChapter, 
  BookMemory,
  EditorialElements,
  IBookMetadataKdp,
  StageContent,
  EditorialStageKey
} from '../types';

export interface ContextPackage {
  projectIdentity: string;
  projectMeta: string;
  researchContext: string;
  analyticsContext: string;
  titlesContext: string;
  resourcesContext: string;
  personaContext: string;
  purposeContext: string;
  detailsContext: string;
  bioContext: string;
  outlineContext: string;
  writeContext: string;
  descriptionContext: string;
  coverContext: string;
  fullContext: string;
  availableForStage: EditorialStageKey[];
}

export class ContextBuilder {
  private project: BookProject;

  constructor(project: BookProject) {
    this.project = project;
  }

  public static create(project: BookProject): ContextBuilder {
    return new ContextBuilder(project);
  }

  public buildForStage(targetStage: EditorialStageKey): ContextPackage {
    const stagesBeforeTarget = this.getStagesBefore(targetStage);
    
    const contextParts = {
      projectIdentity: this.buildProjectIdentity(),
      projectMeta: this.buildProjectMeta(),
      researchContext: stagesBeforeTarget.includes('research') ? this.buildResearchContext() : '',
      analyticsContext: stagesBeforeTarget.includes('analytics') ? this.buildAnalyticsContext() : '',
      titlesContext: stagesBeforeTarget.includes('titles') ? this.buildTitlesContext() : '',
      resourcesContext: stagesBeforeTarget.includes('resources') ? this.buildResourcesContext() : '',
      personaContext: stagesBeforeTarget.includes('persona') ? this.buildPersonaContext() : '',
      purposeContext: stagesBeforeTarget.includes('purpose') ? this.buildPurposeContext() : '',
      detailsContext: stagesBeforeTarget.includes('details') ? this.buildDetailsContext() : '',
      bioContext: stagesBeforeTarget.includes('bio') ? this.buildBioContext() : '',
      outlineContext: stagesBeforeTarget.includes('outline') ? this.buildOutlineContext() : '',
      writeContext: stagesBeforeTarget.includes('write') ? this.buildWriteContext() : '',
      descriptionContext: stagesBeforeTarget.includes('description') ? this.buildDescriptionContext() : '',
      coverContext: stagesBeforeTarget.includes('cover') ? this.buildCoverContext() : '',
      fullContext: '',
      availableForStage: stagesBeforeTarget
    };

    contextParts.fullContext = this.assembleFullContext(contextParts, targetStage);

    return contextParts;
  }

  public buildForChapter(chapterIndex: number): ContextPackage {
    const baseContext = this.buildForStage('write');
    const chapter = this.project.kdpChapters?.find(c => c.index === chapterIndex);
    const previousChapters = this.project.kdpChapters?.filter(c => c.index < chapterIndex) || [];
    
    const chapterContext = [
      baseContext.fullContext,
      chapter ? this.buildChapterContext(chapter, previousChapters) : ''
    ].filter(Boolean).join('\n\n---\n\n');

    return {
      ...baseContext,
      writeContext: chapterContext,
      fullContext: chapterContext
    };
  }

  public buildForSelection(text: string, contextHint?: string): string {
    const baseContext = this.buildForStage('write');
    return [
      baseContext.fullContext,
      contextHint ? `CONTEXTO ADICIONAL: ${contextHint}` : '',
      `TRECHO SELECIONADO:\n${text}`
    ].filter(Boolean).join('\n\n---\n\n');
  }

  private getStagesBefore(targetStage: EditorialStageKey): EditorialStageKey[] {
    const stageOrder: EditorialStageKey[] = [
      'research', 'analytics', 'titles', 'resources', 
      'persona', 'purpose', 'details', 'bio', 
      'outline', 'write', 'description', 'cover', 'finish'
    ];
    const targetIndex = stageOrder.indexOf(targetStage);
    return stageOrder.slice(0, targetIndex + 1);
  }

  private buildProjectIdentity(): string {
    return `LIVRO: "${this.project.title}"${this.project.subtitle ? ` - ${this.project.subtitle}` : ''}
AUTOR: ${this.project.author}
TIPO: ${this.project.kdpBookType} (${this.getBookTypeLabel(this.project.kdpBookType)})
IDIOMA: ${this.project.language}
FORMATO: ${this.project.format} | ${this.project.trimSize} | ${this.project.paperType}
PÁGINAS ESTIMADAS: ${this.project.estimatedPages} | PÁGINAS REAIS: ${this.project.actualPages || 'N/A'}
PÚBLICO-ALVO: ${this.project.targetAudience}`;
  }

  private buildProjectMeta(): string {
    return `STATUS GERAL: ${this.project.status} | PRIORIDADE: ${this.project.priority}
ETAPA ATUAL: ${this.project.currentStage || 'research'}
PROGRESSO PIPELINE: ${this.project.pipelineProgress}%
CRIADO EM: ${new Date(this.project.createdAt).toLocaleDateString('pt-BR')}
ATUALIZADO EM: ${new Date(this.project.updatedAt).toLocaleDateString('pt-BR')}`;
  }

  private buildResearchContext(): string {
    const content = this.getStageContent('research');
    if (!content) return '';
    
    const data = content.data;
    return `=== ETAPA 01 - RESEARCH ===
TEMA: ${data.topic || this.project.topic}
NICHO: ${data.niche || 'Não definido'}
PÚBLICO: ${data.audience || this.project.targetAudience}
IDIOMA: ${data.language || this.project.language}
PAÍS/MERCADO: ${data.country || 'Brasil'}
GÊNERO: ${data.genre || this.project.kdpBookType}
OBJETIVO: ${data.objective || 'Não definido'}
CONCORRÊNCIA: ${data.competition || 'Não analisada'}
REFERÊNCIAS: ${data.references?.join(', ') || 'Nenhuma'}
TENDÊNCIAS: ${data.trends?.join(', ') || 'Não identificadas'}
OPORTUNIDADES: ${data.opportunities?.join(', ') || 'Não identificadas'}
RISCOS: ${data.risks?.join(', ') || 'Não identificados'}
DIFERENCIAIS: ${data.differentiators?.join(', ') || 'Não definidos'}
PALAVRAS-CHAVE: ${data.keywords?.join(', ') || 'Não definidas'}
PERGUNTAS RELEVANTES: ${data.questions?.join('; ') || 'Nenhuma'}
HIPÓTESES EDITORIAIS: ${data.hypotheses?.join('; ') || 'Nenhuma'}`;
  }

  private buildAnalyticsContext(): string {
    const content = this.getStageContent('analytics');
    if (!content) return '';
    
    const data = content.data;
    return `=== ETAPA 02 - ANALYTICS ===
ANÁLISE DE MERCADO: ${data.marketAnalysis || 'Não realizada'}
PALAVRAS-CHAVE MERCADO: ${data.marketKeywords?.join(', ') || 'Nenhuma'}
POSICIONAMENTO: ${data.positioning || 'Não definido'}
CONCORRÊNCIA: ${data.competition || 'Não analisada'}
TENDÊNCIAS: ${data.trends?.join(', ') || 'Não identificadas'}
OPORTUNIDADES: ${data.opportunities?.join(', ') || 'Não identificadas'}
DIFERENCIAÇÃO: ${data.differentiation || 'Não definida'}

INTELIGÊNCIA AMAZON:
- Referências Encontradas: ${data.marketReferences?.length || 0}
- Filtro BSR ≤ 80: ${data.bsrFilter || 'Ativo'}
- Filtro Rating ≥ 4.1: ${data.ratingFilter || 'Ativo'}
- Média BSR: ${data.avgBsr || 'N/A'}
- Média Rating: ${data.avgRating || 'N/A'}
- Média Reviews: ${data.avgReviews || 'N/A'}
- Média Preço: ${data.avgPrice || 'N/A'}
- Média Páginas: ${data.avgPages || 'N/A'}
- Média Royalty Estimado: ${data.avgRoyalty || 'N/A'}
- Menor Royalty: ${data.minRoyalty || 'N/A'}
- Maior Royalty: ${data.maxRoyalty || 'N/A'}
- Referências com Royalty Calculável: ${data.refsWithRoyalty || 0}
- % Com Dados Completos: ${data.completeDataPct || 0}%

SIMULADOR ROYALTIES:
- 25 vendas/mês: ${data.sim25 || 'N/A'}
- 50 vendas/mês: ${data.sim50 || 'N/A'}
- 100 vendas/mês: ${data.sim100 || 'N/A'}
- 250 vendas/mês: ${data.sim250 || 'N/A'}
- 500 vendas/mês: ${data.sim500 || 'N/A'}
- 1000 vendas/mês: ${data.sim1000 || 'N/A'}`;
  }

  private buildTitlesContext(): string {
    const content = this.getStageContent('titles');
    const concept = this.project.kdpConcept;
    
    let ctx = `=== ETAPA 03 - BOOK TITLES ===`;
    
    if (concept?.titleOptions && concept.titleOptions.length > 0) {
      ctx += `\nOPÇÕES DE TÍTULOS GERADAS:`;
      concept.titleOptions.forEach((opt, i) => {
        ctx += `\n${i + 1}. ${opt.title} | ${opt.subtitle} | Gancho: ${opt.hook} | Ângulo: ${opt.commercialAngle}`;
      });
    }
    
    if (content?.data.selectedTitleId) {
      const selected = concept?.titleOptions?.find(o => o.id === content.data.selectedTitleId);
      if (selected) {
        ctx += `\n\nTÍTULO APROVADO: ${selected.title}`;
        ctx += `\nSUBTÍTULO APROVADO: ${selected.subtitle}`;
      }
    } else if (concept?.title) {
      ctx += `\n\nTÍTULO ATUAL: ${concept.title}`;
      ctx += `\nSUBTÍTULO ATUAL: ${concept.subtitle || 'N/A'}`;
    }
    
    return ctx;
  }

  private buildResourcesContext(): string {
    const content = this.getStageContent('resources');
    if (!content) return '';
    
    const resources = content.data.resources || [];
    return `=== ETAPA 04 - RESOURCES ===
RECURSOS APROVADOS: ${resources.length}
${resources.map((r: any, i: number) => 
  `${i + 1}. ${r.name} (${r.type}) - ${r.origin} - Tags: ${r.tags?.join(', ') || 'sem tags'} - Status: ${r.status}`
).join('\n')}`;
  }

  private buildPersonaContext(): string {
    const content = this.getStageContent('persona');
    if (!content) return '';
    
    const data = content.data;
    return `=== ETAPA 05 - AUTHOR PERSONA ===
NOME: ${data.name || this.project.author}
EXPERIÊNCIA: ${data.experience || 'Não definida'}
PERSONALIDADE: ${data.personality || 'Não definida'}
ESTILO: ${data.style || 'Não definido'}
TOM: ${data.tone || 'Não definido'}
VOZ: ${data.voice || 'Não definida'}
VOCABULÁRIO: ${data.vocabulary || 'Não definido'}
POSICIONAMENTO: ${data.positioning || 'Não definido'}
PÚBLICO: ${data.audience || this.project.targetAudience}
CARACTERÍSTICAS: ${data.characteristics?.join(', ') || 'Não definidas'}`;
  }

  private buildPurposeContext(): string {
    const content = this.getStageContent('purpose');
    const concept = this.project.kdpConcept;
    
    let ctx = `=== ETAPA 06 - PURPOSE ===`;
    
    if (content?.data) {
      const data = content.data;
      ctx += `\nOBJETIVO: ${data.objective || 'Não definido'}
PROMESSA: ${data.promise || concept?.promise || 'Não definida'}
PROBLEMA: ${data.problem || 'Não definido'}
TRANSFORMAÇÃO: ${data.transformation || 'Não definida'}
RESULTADO ESPERADO: ${data.expectedResult || 'Não definido'}
PÚBLICO: ${data.audience || this.project.targetAudience}
PROPOSTA DE VALOR: ${data.valueProposition || concept?.differentiator || 'Não definida'}`;
    } else if (concept) {
      ctx += `\nPROMESSA (do Conceito): ${concept.promise}
DIFERENCIAL (do Conceito): ${concept.differentiator}
PÚBLICO: ${concept.audience}`;
    }
    
    return ctx;
  }

  private buildDetailsContext(): string {
    const content = this.getStageContent('details');
    if (!content) return '';
    
    const data = content.data;
    return `=== ETAPA 07 - BOOK DETAILS (${this.project.kdpBookType}) ===
${Object.entries(data).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('\n')}`;
  }

  private buildBioContext(): string {
    const content = this.getStageContent('bio');
    const editorial = this.project.editorialElements;
    
    let ctx = `=== ETAPA 08 - AUTHOR BIO ===`;
    
    if (content?.data?.bio) {
      ctx += `\nBIOGRAFIA APROVADA:\n${content.data.bio}`;
    } else if (editorial?.aboutAuthor) {
      ctx += `\nBIOGRAFIA (Elementos Editoriais):\n${editorial.aboutAuthor}`;
    }
    
    return ctx;
  }

  private buildOutlineContext(): string {
    const chapters = this.project.kdpChapters || [];
    const content = this.getStageContent('outline');
    
    let ctx = `=== ETAPA 09 - OUTLINE ===
TOTAL DE CAPÍTULOS: ${chapters.length}
${chapters.map(c => `Cap. ${c.index}: ${c.title} (${c.targetWordCount || 0} palavras meta) - ${c.summary}`).join('\n')}`;
    
    if (content?.data?.structureNotes) {
      ctx += `\n\nNOTAS ESTRUTURAIS: ${content.data.structureNotes}`;
    }
    
    return ctx;
  }

  private buildWriteContext(): string {
    const chapters = this.project.kdpChapters || [];
    const writtenChapters = chapters.filter(c => c.prose && c.prose.trim().length > 100);
    
    let ctx = `=== ETAPA 10 - WRITE ===
CAPÍTULOS PLANEJADOS: ${chapters.length}
CAPÍTULOS REDIGIDOS: ${writtenChapters.length}
TOTAL DE PALAVRAS: ${chapters.reduce((s, c) => s + (c.wordCount || 0), 0)}

CONTEÚDO REDIGIDO:`;
    
    writtenChapters.forEach(c => {
      const excerpt = c.prose?.substring(0, 500) + '...';
      ctx += `\n\n--- CAPÍTULO ${c.index}: ${c.title} (${c.wordCount} palavras) ---\n${excerpt}`;
    });
    
    return ctx;
  }

  private buildChapterContext(chapter: IBookChapter, previousChapters: IBookChapter[]): string {
    return `CAPÍTULO ATUAL (${chapter.index}): ${chapter.title}
OBJETIVO: ${chapter.objective || 'Não definido'}
RESUMO: ${chapter.summary}
SUBTÓPICOS: ${chapter.subtopics?.join(', ') || 'Nenhum'}
POV: ${chapter.pov || 'Narrador Onisciente'}
META DE PALAVRAS: ${chapter.targetWordCount}
CONEXÃO COM ANTERIOR: ${chapter.connectionPrev || 'N/A'}
CONEXÃO COM PRÓXIMO: ${chapter.connectionNext || 'N/A'}

CAPÍTULOS ANTERIORES (Resumo):
${previousChapters.map(c => `Cap. ${c.index}: ${c.title} - ${c.summary}`).join('\n')}

PROSA ATUAL DO CAPÍTULO:
${chapter.prose || 'Ainda não redigido'}`;
  }

  private buildDescriptionContext(): string {
    const content = this.getStageContent('description');
    const metadata = this.project.kdpMetadata;
    
    let ctx = `=== ETAPA 11 - DESCRIPTION ===`;
    
    if (content?.data) {
      const data = content.data;
      ctx += `\nDESCRIÇÃO COMERCIAL: ${data.commercialDescription || 'Não definida'}
RESUMO: ${data.summary || 'Não definido'}
PALAVRAS-CHAVE: ${data.keywords?.join(', ') || metadata?.keywords7?.join(', ') || 'Não definidas'}
CATEGORIAS: ${data.categories?.join(', ') || metadata?.categoriesPrimary?.join(', ') || 'Não definidas'}
POSICIONAMENTO: ${data.positioning || 'Não definido'}
PÚBLICO: ${data.audience || this.project.targetAudience}`;
    } else if (metadata) {
      ctx += `\nDESCRIÇÃO COMERCIAL (Metadados KDP): ${metadata.commercialLongDescription}
PALAVRAS-CHAVE: ${metadata.keywords7?.join(', ') || 'Não definidas'}
CATEGORIAS PRIMÁRIAS: ${metadata.categoriesPrimary?.join(', ') || 'Não definidas'}
PÚBLICO: ${metadata.targetAudience || this.project.targetAudience}`;
    }
    
    return ctx;
  }

  private buildCoverContext(): string {
    const cover = this.project.kdpCoverDesign;
    const content = this.getStageContent('cover');
    
    let ctx = `=== ETAPA 12 - BOOK COVER ===`;
    
    if (cover) {
      ctx += `\nTÍTULO: ${cover.title}
SUBTÍTULO: ${cover.subtitle || 'N/A'}
AUTOR: ${cover.author}
BLURB CONTRACAPA: ${cover.backCoverBlurb}
GEOMETRIA KDP:
- Trim Size: ${cover.geometry.trimSize}
- Páginas: ${cover.geometry.pageCount}
- Papel: ${cover.geometry.paperType}
- Largura Lombada: ${cover.geometry.spineWidthInches}"
- Largura Total: ${cover.geometry.totalCoverWidthInches}"
- Altura Total: ${cover.geometry.totalCoverHeightInches}"
- Sangria: ${cover.geometry.bleedInches}"
PROMPT CAPA: ${cover.frontPrompt}`;
    }
    
    if (content?.data?.concepts) {
      ctx += `\n\nCONCEITOS GERADOS: ${content.data.concepts.length}`;
      content.data.concepts.forEach((c: any, i: number) => {
        ctx += `\n${i + 1}. ${c.concept} - Prompt: ${c.prompt}`;
      });
    }
    
    return ctx;
  }

  private getStageContent(stageKey: EditorialStageKey): StageContent | undefined {
    return this.project.stageContents?.find(sc => sc.stageKey === stageKey);
  }

  private assembleFullContext(parts: any, targetStage: EditorialStageKey): string {
    const relevantParts = [
      parts.projectIdentity,
      parts.projectMeta,
      parts.researchContext,
      parts.analyticsContext,
      parts.titlesContext,
      parts.resourcesContext,
      parts.personaContext,
      parts.purposeContext,
      parts.detailsContext,
      parts.bioContext,
      parts.outlineContext,
      parts.writeContext,
      parts.descriptionContext,
      parts.coverContext
    ].filter(Boolean);

    return relevantParts.join('\n\n========================================\n\n');
  }

  private getBookTypeLabel(bookType: string): string {
    // Import would be circular, so inline the key ones
    const labels: Record<string, string> = {
      'fiction-novel': 'Romance / Ficção Geral',
      'romance': 'Romance Amoroso',
      'thriller': 'Thriller / Mistério',
      'fantasy': 'Fantasia Épica',
      'sci-fi': 'Ficção Científica',
      'self-help': 'Desenvolvimento Pessoal',
      'business': 'Negócios',
      'finance': 'Finanças',
      'children-picture-book': 'Infantil Ilustrado',
      'coloring-book': 'Livro de Colorir',
      'workbook': 'Workbook',
      'puzzle-book': 'Puzzle Book',
      'planner': 'Planner',
      'journal': 'Journal/Diário',
      'non-fiction': 'Não-Ficção Geral'
    };
    return labels[bookType] || bookType;
  }
}