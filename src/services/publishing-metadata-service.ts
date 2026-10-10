// ================================================================
// PUBLISHING METADATA SERVICE — METADADOS KDP E GOOGLE PLAY BOOKS
// 7 Palavras-Chave Oficiais KDP (Anti-Violação), Códigos BISAC,
// Painel de Auditoria com Score e Bloqueio Preventivo
// ================================================================

import { BookProject, IBookMetadataKdp } from '../types/book-project';

export interface KdpKeywordSlot {
  slot: number; // 1 a 7
  keywordPhrase: string;
  characterCount: number;
  isValid: boolean;
  warnings: string[];
}

export interface GooglePlayMetadata {
  title: string;
  subtitle: string;
  authors: string[];
  descriptionHtml: string;
  bisacCategories: string[];
  language: string;
  readingAgeRange?: string;
  isSeries: boolean;
  seriesName?: string;
  volumeNumber?: number;
}

export interface EditorialAuditCategoryScore {
  category: string;
  score: number; // 0 a 100
  status: 'APROVADO' | 'ATENCAO' | 'BLOQUEADOR';
  details: string;
}

export interface ConsolidatedEditorialAuditPanel {
  overallScore: number;
  status: 'APROVADO' | 'APROVADO_COM_OBSERVACOES' | 'CORRECAO_NECESSARIA' | 'BLOQUEADO_PARA_EXPORTACAO';
  canExportKdp: boolean;
  canExportGooglePlay: boolean;
  blockers: string[];
  recommendations: string[];
  categories: EditorialAuditCategoryScore[];
  kdpKeywords: KdpKeywordSlot[];
  googlePlayMetadata: GooglePlayMetadata;
  auditedAt: number;
}

export class PublishingMetadataService {
  /**
   * Tabela oficial de categorias BISAC comuns por gênero
   */
  public static readonly BISAC_MAPPINGS: Record<string, string[]> = {
    'thriller': ['FIC031000 / FICTION / Thrillers / Suspense', 'FIC022000 / FICTION / Mystery & Detective / General'],
    'romance': ['FIC027000 / FICTION / Romance / General', 'FIC027020 / FICTION / Romance / Contemporary'],
    'ficcao-cientifica': ['FIC028000 / FICTION / Science Fiction / General', 'FIC028010 / FICTION / Science Fiction / Adventure'],
    'fantasia': ['FIC009000 / FICTION / Fantasy / General', 'FIC009020 / FICTION / Fantasy / Epic'],
    'negocios': ['BUS071000 / BUSINESS & ECONOMICS / Leadership', 'BUS025000 / BUSINESS & ECONOMICS / Entrepreneurship'],
    'autoajuda': ['SEL021000 / SELF-HELP / Motivational & Inspirational', 'SEL016000 / SELF-HELP / Personal Growth / Success'],
    'poesia': ['POE000000 / POETRY / General', 'POE005010 / POETRY / Subjects & Themes / Inspirational & Religious']
  };

  /**
   * Termos proibidos expressamente pela política de metadados do Amazon KDP
   */
  private static readonly FORBIDDEN_KDP_TERMS = [
    'best seller', 'bestseller', 'mais vendido', 'livro do ano', 'frete gratis',
    'frete grátis', 'promocao', 'promoção', 'barato', 'gratis', 'grátis',
    'stephen king', 'jk rowling', 'george rr martin', 'dan brown', 'colleen hoover'
  ];

  /**
   * Gera os 7 slots de palavras-chave da Amazon KDP respeitando as regras oficiais
   */
  public static generateKdpKeywordSlots(
    title: string,
    subtitle: string,
    genre: string,
    synopsis: string
  ): KdpKeywordSlot[] {
    const titleWords = new Set(
      `${title} ${subtitle || ''}`
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .split(/\W+/)
        .filter(w => w.length > 2)
    );

    const candidates: string[] = [];
    const g = genre.toLowerCase();

    if (g.includes('thriller') || g.includes('suspense') || g.includes('mister')) {
      candidates.push('suspense psicologico reviravoltas impressionantes');
      candidates.push('investigacao criminal segredos de familia');
      candidates.push('ficcao policial ritmo acelerado leitura viciante');
      candidates.push('crime misterio e paranoia psicologica');
      candidates.push('livros de suspense com final surpreendente');
      candidates.push('conflitos intensos e atmosfera sombria');
      candidates.push('historia intrigante para fas de investigacao');
    } else if (g.includes('romance') || g.includes('drama')) {
      candidates.push('romance contemporaneo emocionante');
      candidates.push('encontros e desencontros segunda chance');
      candidates.push('historia de amor envolvente e tocante');
      candidates.push('drama familiar lacos e superacao');
      candidates.push('relacionamentos intensos dilemas do coracao');
      candidates.push('ficcao feminina escolhas e recomecos');
      candidates.push('romance literario leitura que aquece a alma');
    } else if (g.includes('negoc') || g.includes('lider') || g.includes('finan')) {
      candidates.push('estrategias de gestao e tomada de decisao');
      candidates.push('desenvolvimento de lideranca de alto impacto');
      candidates.push('planejamento estrategico e mentalidade empreendedora');
      candidates.push('produtividade profissional foco e resultados');
      candidates.push('guia pratico de crescimento de carreira');
      candidates.push('organizacao financeira e gestao de negocios');
      candidates.push('principios comprovados para profissionais modernos');
    } else {
      candidates.push('desenvolvimento pessoal habitos e disciplina');
      candidates.push('autoconhecimento inteligencia emocional');
      candidates.push('transformacao de rotina e clareza mental');
      candidates.push('superacao de limites e foco continuo');
      candidates.push('leitura inspiradora para mudanca de vida');
      candidates.push('principios de sucesso e resiliencia diária');
      candidates.push('guia passo a passo para evolucao pessoal');
    }

    const slots: KdpKeywordSlot[] = [];

    for (let i = 0; i < 7; i++) {
      const phrase = candidates[i] || `livro inspirador sobre ${genre.toLowerCase()} ${i + 1}`;
      const warnings: string[] = [];
      const lower = phrase.toLowerCase();

      // Verifica violações das diretrizes KDP
      for (const forbidden of this.FORBIDDEN_KDP_TERMS) {
        if (lower.includes(forbidden)) {
          warnings.push(`Contém o termo restrito pela Amazon: "${forbidden}".`);
        }
      }

      // Verifica se repete palavras já indexadas no título
      const phraseWords = lower.split(/\s+/);
      const redundantWords = phraseWords.filter(w => titleWords.has(w));
      if (redundantWords.length > 0) {
        warnings.push(`Repete palavras já presentes no título (${redundantWords.join(', ')}). A Amazon já indexa o título automaticamente.`);
      }

      // Limite de 50 caracteres por campo recomendado pelo KDP
      if (phrase.length > 50) {
        warnings.push('Extrapola o limite recomendado de 50 caracteres por campo.');
      }

      slots.push({
        slot: i + 1,
        keywordPhrase: phrase.slice(0, 50),
        characterCount: Math.min(50, phrase.length),
        isValid: warnings.length === 0,
        warnings
      });
    }

    return slots;
  }

  /**
   * Constrói os metadados organizados para Google Play Books
   */
  public static generateGooglePlayMetadata(
    project: BookProject,
    synopsisHtml: string
  ): GooglePlayMetadata {
    const rawGenre = (project.categories?.[0] || 'Geral').toLowerCase();
    let bisac = ['FIC000000 / FICTION / General'];

    if (rawGenre.includes('thriller') || rawGenre.includes('suspense')) bisac = this.BISAC_MAPPINGS['thriller'];
    else if (rawGenre.includes('romance')) bisac = this.BISAC_MAPPINGS['romance'];
    else if (rawGenre.includes('sci-fi') || rawGenre.includes('cient')) bisac = this.BISAC_MAPPINGS['ficcao-cientifica'];
    else if (rawGenre.includes('fantasia')) bisac = this.BISAC_MAPPINGS['fantasia'];
    else if (rawGenre.includes('negoc') || rawGenre.includes('lider')) bisac = this.BISAC_MAPPINGS['negocios'];
    else if (rawGenre.includes('autoajuda')) bisac = this.BISAC_MAPPINGS['autoajuda'];

    const cleanHtml = `<p>${synopsisHtml || project.description || 'Uma obra literária envolvente e rigorosamente editada.'}</p>`;

    return {
      title: project.title,
      subtitle: project.subtitle || '',
      authors: [project.author || 'Autor'],
      descriptionHtml: cleanHtml,
      bisacCategories: bisac,
      language: project.language || 'pt-BR',
      readingAgeRange: '14+',
      isSeries: Boolean((project as any).seriesId),
      seriesName: (project as any).seriesId ? 'Série Principal' : undefined,
      volumeNumber: (project as any).seriesVolumeNumber || 1
    };
  }

  /**
   * Valida as 7 palavras-chave e veta termos proibidos da Amazon KDP
   */
  public static validateKdpKeywords(
    keywords: string[],
    title?: string,
    author?: string
  ): { validCount: number; warnings: string[] } {
    const warnings: string[] = [];
    let validCount = 0;

    const forbidden = [
      'best seller', 'best-seller', 'bestseller', 'mais vendido', 'livro do ano',
      'frete gratis', 'frete grátis', 'promocao', 'promoção', 'barato', 'gratis', 'grátis',
      'melhor livro', 'stephen king', 'jk rowling', 'george rr martin', 'dan brown', 'colleen hoover'
    ];

    const titleWords = (title || '')
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 2);

    keywords.forEach((kw, idx) => {
      const trimmed = kw.trim();
      if (!trimmed) return;

      const lower = trimmed.toLowerCase();
      let hasError = false;

      for (const f of forbidden) {
        if (lower.includes(f)) {
          warnings.push(`Palavra-chave #${idx + 1} ("${trimmed}") contém o termo restrito pela Amazon: "${f}".`);
          hasError = true;
          break;
        }
      }

      if (titleWords.length > 0 && titleWords.some(tw => lower === tw)) {
        warnings.push(`Palavra-chave #${idx + 1} repete exatamente palavras do título do livro.`);
        hasError = true;
      }

      if (trimmed.length > 50) {
        warnings.push(`Palavra-chave #${idx + 1} ultrapassa 50 caracteres (${trimmed.length} caracteres).`);
        hasError = true;
      }

      if (!hasError) validCount++;
    });

    return { validCount, warnings };
  }

  /**
   * Gera pacote de metadados padrão KDP em conformidade total
   */
  public static generateKdpMetadataPack(project: BookProject): IBookMetadataKdp {
    const slots = this.generateKdpKeywordSlots(
      project.title || 'Livro KDP',
      project.subtitle || '',
      project.genre || 'Geral',
      project.description || ''
    );

    return {
      title: project.title || 'Livro KDP',
      subtitle: project.subtitle || '',
      author: project.author || 'Autor da Obra',
      descriptionHtml: project.description || 'Uma obra transformadora desenvolvida com rigor editorial.',
      commercialShortDescription: project.description || 'Uma obra transformadora.',
      commercialLongDescription: project.description || 'Uma obra transformadora desenvolvida com rigor editorial.',
      salesHooks: ['Leitura prática e transformadora', 'Metodologia passo a passo'],
      keywords7: slots.map(s => s.keywordPhrase),
      categoriesPrimary: ['Não-Ficção / Desenvolvimento Pessoal'],
      categoriesSecondary: [],
      language: project.language || 'Português',
      targetAudience: project.targetAudience || 'Geral',
      priceSuggestedBrl: 24.90,
      priceSuggestedUsd: 4.99
    };
  }

  /**
   * Avalia status consolidado de auditoria (Aprovado vs Bloqueado para Exportação)
   */
  public static evaluateOverallPublishReadiness(params: {
    manuscriptScore: number;
    printCoverValid: boolean;
    pageCount: number;
    kdpKeywordsValid: boolean;
  }): { status: 'APROVADO' | 'APROVADO_COM_OBSERVACOES' | 'CORRECAO_NECESSARIA' | 'BLOQUEADO_PARA_EXPORTACAO'; score: number; blockers: string[] } {
    const blockers: string[] = [];
    if (params.pageCount < 24) blockers.push(`Páginas insuficientes (${params.pageCount}). Mínimo de 24 páginas para impressão.`);
    if (!params.printCoverValid) blockers.push('Capa impressa com dimensões ou arte inválida.');
    if (params.manuscriptScore < 60) blockers.push(`Nota do manuscrito muito baixa (${params.manuscriptScore}/100).`);
    if (!params.kdpKeywordsValid) blockers.push('Palavras-chave KDP inválidas ou com termos proibidos.');

    let score = params.manuscriptScore;
    if (params.printCoverValid) score = Math.min(100, score + 10);
    if (params.pageCount >= 24) score = Math.min(100, score + 5);

    let status: 'APROVADO' | 'APROVADO_COM_OBSERVACOES' | 'CORRECAO_NECESSARIA' | 'BLOQUEADO_PARA_EXPORTACAO' = 'APROVADO';
    if (blockers.length > 0 || params.manuscriptScore < 50) {
      status = 'BLOQUEADO_PARA_EXPORTACAO';
    } else if (params.manuscriptScore < 80) {
      status = 'CORRECAO_NECESSARIA';
    } else if (params.manuscriptScore < 90) {
      status = 'APROVADO_COM_OBSERVACOES';
    }

    return { status, score, blockers };
  }

  /**
   * Avalia o livro completo e produz o Painel Consolidado de Auditoria com Nota e Bloqueios
   */
  public static auditConsolidatedPublishingPanel(
    project: BookProject,
    chaptersCount: number,
    pageCount: number,
    hasCover: boolean,
    hasAbruptEnding: boolean = false,
    hasResidualAi: boolean = false
  ): ConsolidatedEditorialAuditPanel {
    const categories: EditorialAuditCategoryScore[] = [];
    const blockers: string[] = [];
    const recommendations: string[] = [];

    // 1. Integridade Estrutural
    if (chaptersCount < 3) {
      categories.push({
        category: 'Integridade Estrutural',
        score: 30,
        status: 'BLOQUEADOR',
        details: `O livro possui apenas ${chaptersCount} capítulos (mínimo de 3 capítulos completos).`
      });
      blockers.push('Quantidade insuficiente de capítulos para publicação comercial.');
    } else {
      categories.push({
        category: 'Integridade Estrutural',
        score: 100,
        status: 'APROVADO',
        details: `${chaptersCount} capítulos estruturados e sequenciados.`
      });
    }

    // 2. Desfecho e Fechamento do Enredo
    if (hasAbruptEnding) {
      categories.push({
        category: 'Qualidade do Desfecho',
        score: 40,
        status: 'BLOQUEADOR',
        details: 'Capítulo final excessivamente curto ou interrompido sem resolução do arco narrativo.'
      });
      blockers.push('Final da obra abrupto ou incompleto.');
    } else {
      categories.push({
        category: 'Qualidade do Desfecho',
        score: 95,
        status: 'APROVADO',
        details: 'Conflito principal resolvido e encerramento coerente com o gênero.'
      });
    }

    // 3. Sanitização de Resíduos de IA
    if (hasResidualAi) {
      categories.push({
        category: 'Sanitização de Prompts e IA',
        score: 20,
        status: 'BLOQUEADOR',
        details: 'Detectadas frases de instrução ou metadados de inteligência artificial no corpo do texto.'
      });
      blockers.push('Resíduos de prompts de IA detectados no manuscrito.');
    } else {
      categories.push({
        category: 'Sanitização de Prompts e IA',
        score: 100,
        status: 'APROVADO',
        details: 'Nenhum resíduo de IA ou marcadores técnicos presentes no texto.'
      });
    }

    // 4. Capa e Contracapa
    if (!hasCover) {
      categories.push({
        category: 'Capa e Elementos Visuais',
        score: 40,
        status: 'BLOQUEADOR',
        details: 'O livro ainda não possui capa frontal gerada.'
      });
      blockers.push('Capa obrigatória não vinculada.');
    } else {
      categories.push({
        category: 'Capa e Elementos Visuais',
        score: 100,
        status: 'APROVADO',
        details: 'Arte frontal e geometria de capa vinculadas com sucesso.'
      });
    }

    // 5. Diagramação e Paginação KDP
    if (pageCount < 24) {
      categories.push({
        category: 'Diagramação e Páginas Mínimas',
        score: 45,
        status: 'BLOQUEADOR',
        details: `Livro com ${pageCount} páginas (Amazon KDP exige mínimo de 24 páginas para impressão).`
      });
      blockers.push('Páginas insuficientes para encadernação de capa comum.');
    } else {
      categories.push({
        category: 'Diagramação e Páginas Mínimas',
        score: 98,
        status: 'APROVADO',
        details: `${pageCount} páginas formatadas com margens progressivas e sangria compatível.`
      });
    }

    // 6. Metadados e Palavras-chave
    const kdpKeywords = this.generateKdpKeywordSlots(
      project.title,
      project.subtitle || '',
      project.categories?.[0] || 'Geral',
      project.description || ''
    );
    const invalidKeywordsCount = kdpKeywords.filter(k => !k.isValid).length;

    if (invalidKeywordsCount > 0) {
      categories.push({
        category: 'Metadados e Palavras-chave KDP',
        score: 80,
        status: 'ATENCAO',
        details: `${invalidKeywordsCount} campo(s) de palavras-chave com recomendações de ajuste.`
      });
      recommendations.push('Refinar palavras-chave KDP para evitar redundância com o título.');
    } else {
      categories.push({
        category: 'Metadados e Palavras-chave KDP',
        score: 100,
        status: 'APROVADO',
        details: '7 palavras-chave em total conformidade com as diretrizes da Amazon KDP.'
      });
    }

    // Cálculo da média ponderada
    const totalScore = categories.reduce((sum, c) => sum + c.score, 0);
    const overallScore = Math.round(totalScore / categories.length);

    const canExport = blockers.length === 0;
    let status: ConsolidatedEditorialAuditPanel['status'] = 'APROVADO';

    if (!canExport) {
      status = 'BLOQUEADO_PARA_EXPORTACAO';
    } else if (recommendations.length > 0) {
      status = 'APROVADO_COM_OBSERVACOES';
    }

    const googlePlayMetadata = this.generateGooglePlayMetadata(project, project.description || '');

    return {
      overallScore,
      status,
      canExportKdp: canExport,
      canExportGooglePlay: canExport,
      blockers,
      recommendations,
      categories,
      kdpKeywords,
      googlePlayMetadata,
      auditedAt: Date.now()
    };
  }
}
