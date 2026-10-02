// Pipeline Autônomo e Especializado de Criação Editorial KDP (Book Engine)
// Inspirado nos repositórios ShonP/kdp-book, wesleyscholl/book-generator, libriscribe e Velith

import { 
  BookType, 
  BOOK_TYPE_CONFIGS, 
  IBookConcept, 
  IBookBible, 
  IBookChapter, 
  IBookEditorReport, 
  IBookCoverDesign, 
  IBookMetadataKdp, 
  IBookQualityReport,
  PipelineStage,
  BookProject,
  TitleOption,
  ContinuityIssue,
  FactCheckItem,
  EditorialElements,
  TrimSize,
  PaperType,
  calculateTargetWordsForPages,
  estimateActualPagesFromWords,
  GenerationCost
} from '../types/book-project';
import { AiService } from './ai-service';
import { LocalAiEngine } from './local-ai-engine';

export interface PipelineProgressCallback {
  (stage: PipelineStage, progress: number, message: string, projectData?: Partial<BookProject>): void;
}

export class KdpBookPipeline {
  private ai: AiService;
  private costTracker: GenerationCost = {
    totalTokens: 0,
    totalCalls: 0,
    estimatedCostUsd: 0,
    estimatedCostBrl: 0,
    stageBreakdown: {}
  };

  constructor(aiService: AiService) {
    this.ai = aiService;
  }

  public getCostTracker(): GenerationCost {
    return this.costTracker;
  }

  private trackUsage(stage: string, tokensEstimate: number, model: string = 'gpt-4o-mini') {
    this.costTracker.totalCalls += 1;
    this.costTracker.totalTokens += tokensEstimate;
    // Custo estimado médio para modelos modernos ($0.15 / 1M input, $0.60 / 1M output)
    const costUsd = (tokensEstimate / 1_000_000) * 0.35;
    this.costTracker.estimatedCostUsd += costUsd;
    this.costTracker.estimatedCostBrl = this.costTracker.estimatedCostUsd * 5.65;

    if (!this.costTracker.stageBreakdown[stage]) {
      this.costTracker.stageBreakdown[stage] = { tokens: 0, calls: 0, costUsd: 0, model };
    }
    this.costTracker.stageBreakdown[stage].tokens += tokensEstimate;
    this.costTracker.stageBreakdown[stage].calls += 1;
    this.costTracker.stageBreakdown[stage].costUsd += costUsd;
  }

  // --- 0. ANÁLISE INICIAL DA IDEIA DO USUÁRIO ---
  async analyzeIdea(
    userIdea: string,
    language: string = 'Português'
  ): Promise<{
    niche: string;
    targetAudience: string;
    recommendedBookType: BookType;
    recommendedTrim: TrimSize;
    recommendedPages: number;
    tone: string;
    summary: string;
  }> {
    if (this.ai.getProvider() === 'local-builtin') {
      return LocalAiEngine.analyzeIdea(userIdea, language);
    }

    try {
      const systemPrompt = `Você é um analista editorial executivo sênior e estrategista de mercado da Amazon KDP.
Analise a ideia inicial ou segmento informado pelo usuário e defina a melhor estratégia de publicação.

Categorias de livros disponíveis:
- children-picture-book (infantil ilustrado)
- illustrated-book (HQ / ilustrado geral)
- self-help (desenvolvimento pessoal / hábitos / produtividade)
- business (negócios / gestão / liderança)
- finance (finanças pessoais / investimentos)
- health-wellness (saúde / nutrição / longevidade)
- education (educação / didática)
- practical-guide (guia prático / tutorial)
- biography (biografia / memórias)
- non-fiction (não-ficção geral)
- fiction-novel (romance / ficção literária)
- romance (romance amoroso / drama)
- fantasy (fantasia épica / magia)
- thriller (mistério / suspense investigativo)
- suspense (suspense psicológico / terror)
- sci-fi (ficção científica / distopia)
- light-novel (ficção ágil / jovem)
- technical-manual (livro técnico / programação)
- short-ebook (e-book rápido Kindle)

Retorne EXCLUSIVAMENTE em formato JSON:
{
  "niche": "string",
  "targetAudience": "string",
  "recommendedBookType": "self-help",
  "recommendedTrim": "6x9",
  "recommendedPages": 160,
  "tone": "string",
  "summary": "string"
}`;

      const userPrompt = `Ideia informada pelo usuário:\n"${userIdea}"\n\nIdioma do projeto: ${language}\nFaça a análise estratégica agora em JSON.`;
      const res = await this.ai.structuredCompletion<any>(systemPrompt, userPrompt);
      this.trackUsage('analysis', 800);
      return res;
    } catch (err: any) {
      console.warn(`[KdpPipeline] Falha na IA (${err.message}). Utilizando Motor Local de Alta Densidade.`);
      return LocalAiEngine.analyzeIdea(userIdea, language);
    }
  }

  // --- 1. CONCEPT AGENT (com múltiplas opções de títulos) ---
  async generateConcept(
    topic: string, 
    bookType: BookType, 
    language: string = 'Português',
    author: string = 'Autor Independente',
    customPages?: number
  ): Promise<IBookConcept> {
    if (this.ai.getProvider() === 'local-builtin') {
      return LocalAiEngine.generateConcept(topic, bookType, language, author, customPages);
    }

    const cfg = BOOK_TYPE_CONFIGS[bookType] || BOOK_TYPE_CONFIGS['self-help'];
    const targetPages = customPages || cfg.targetPages;
    const { targetWords } = calculateTargetWordsForPages(targetPages, cfg.trimSize);

    try {
      const systemPrompt = `Você é um editor sênior de aquisições de uma grande editora comercial e especialista em Kindle Direct Publishing (KDP).
Crie o conceito editorial completo e proponha de 3 a 5 opções de títulos altamente comerciais e apelativos para o mercado KDP.

REGRAS:
- Idioma obrigatório: ${language}.
- titleOptions: array com 3 a 5 opções de títulos diferentes. Cada opção deve ter:
  * id: "opt_1", "opt_2", etc.
  * title: título memorável, forte, conciso (<= 60 caracteres)
  * subtitle: subtítulo complementar com gancho claro (hook)
  * hook: parágrafo vendedor curto (<= 50 palavras)
  * commercialAngle: o ângulo de venda deste título (ex: "direto e confrontador", "baseado em método científico", "emocional e inspirador")
  * targetAppeal: por que atrai o público-alvo
- promise: a grande transformação prometida ao leitor ao terminar de ler a obra.
- differentiator: o que diferencia este livro de todos os concorrentes da categoria.
- shortSynopsis: sinopse de 2 a 3 frases para catálogo.
- longSynopsis: sinopse comercial rica de 3 a 4 parágrafos com bullet points persuasivos para página de vendas da Amazon.
- targetWordCount: aproximadamente ${targetWords} palavras.
- targetChapterCount: entre ${cfg.chapterCount[0]} e ${cfg.chapterCount[1]} capítulos.
- comparableTitles: 3 títulos de livros reais de sucesso do mesmo nicho.
- themes: 3 a 5 temas centrais.

Retorne EXCLUSIVAMENTE em formato JSON:
{
  "title": "string",
  "subtitle": "string",
  "hook": "string",
  "audience": "string",
  "readingLevel": "string",
  "tone": "string",
  "promise": "string",
  "differentiator": "string",
  "shortSynopsis": "string",
  "longSynopsis": "string",
  "targetWordCount": ${targetWords},
  "targetChapterCount": ${cfg.chapterCount[0]},
  "targetPages": ${targetPages},
  "trimSize": "${cfg.trimSize}",
  "paperType": "${cfg.paperType}",
  "comparableTitles": ["string", "string", "string"],
  "themes": ["string", "string"],
  "titleOptions": [
    {
      "id": "opt_1",
      "title": "string",
      "subtitle": "string",
      "hook": "string",
      "commercialAngle": "string",
      "targetAppeal": "string"
    }
  ]
}`;

      const userPrompt = `Tópico / Ideia da Obra: ${topic}
Categoria Editorial: ${cfg.label} (${bookType})
Formato Físico (Trim Size): ${cfg.trimSize}
Páginas Alvo: ~${targetPages} páginas (~${targetWords} palavras)
Autor: ${author}

Gere o conceito estruturado completo agora em JSON.`;

      const res = await this.ai.structuredCompletion<IBookConcept>(systemPrompt, userPrompt);
      this.trackUsage('concept', 2200);
      return res;
    } catch (err: any) {
      console.warn(`[KdpPipeline] Falha no concept via IA (${err.message}). Utilizando Motor Local de Alta Densidade.`);
      return LocalAiEngine.generateConcept(topic, bookType, language, author, customPages);
    }
  }

  // --- 2. OUTLINE AGENT (Estrutura detalhada) ---
  async generateOutline(
    concept: IBookConcept, 
    bookType: BookType, 
    language: string = 'Português'
  ): Promise<IBookChapter[]> {
    if (this.ai.getProvider() === 'local-builtin') {
      return LocalAiEngine.generateOutline(concept, bookType);
    }

    const cfg = BOOK_TYPE_CONFIGS[bookType] || BOOK_TYPE_CONFIGS['self-help'];
    const totalChapters = concept.targetChapterCount || cfg.chapterCount[0];
    const wordsPerChapter = Math.round(concept.targetWordCount / totalChapters);

    try {
      const systemPrompt = `Você é um editor estrutural sênior da Amazon KDP.
Produza a estrutura detalhada capítulo a capítulo (outline) da obra, garantindo progressão lógica e narrativa sólida.

REGRAS RÍGIDAS:
- Idioma obrigatório: ${language}.
- Quantidade exata de capítulos: ${totalChapters} capítulos.
- Para cada capítulo incluir:
  * index: número inteiro (1 a ${totalChapters})
  * title: título persuasivo e claro do capítulo
  * objective: objetivo didático ou narrativo essencial que este capítulo deve cumprir
  * summary: resumo da jornada do capítulo (3 a 4 frases)
  * subtopics: lista de 3 a 5 tópicos ou seções internas
  * targetWordCount: meta em torno de ${wordsPerChapter} palavras
  * estimatedPages: páginas estimadas (~${Math.round(wordsPerChapter / 280)})
  * connectionPrev: como este capítulo se conecta e aprofunda o anterior
  * connectionNext: gancho para o capítulo seguinte
  * pov: voz narrativa ("1ª pessoa", "3ª pessoa", "Mentor direto")
  * scenes: lista de ${cfg.scenesPerChapter[0]} a ${cfg.scenesPerChapter[1]} cenas ou blocos de conteúdo com title, summary, setting, characters e mood.

Retorne EXCLUSIVAMENTE em formato JSON:
{
  "chapters": [
    {
      "index": 1,
      "title": "string",
      "objective": "string",
      "summary": "string",
      "subtopics": ["string", "string"],
      "targetWordCount": ${wordsPerChapter},
      "estimatedPages": 15,
      "connectionPrev": "string",
      "connectionNext": "string",
      "pov": "string",
      "scenes": [
        {
          "index": 1,
          "title": "string",
          "summary": "string",
          "setting": "string",
          "characters": ["string"],
          "mood": "string"
        }
      ]
    }
  ]
}`;

      const userPrompt = `Livro: "${concept.title}"
Subtítulo: "${concept.subtitle || ''}"
Promessa: "${concept.promise}"
Público Alvo: "${concept.audience}"
Tom: "${concept.tone}"
Temas: ${concept.themes.join(', ')}
Capítulos a gerar: exatamente ${totalChapters} capítulos (~${wordsPerChapter} palavras cada)

Gere a estrutura completa de capítulos em JSON.`;

      const res = await this.ai.structuredCompletion<{ chapters: IBookChapter[] }>(systemPrompt, userPrompt);
      this.trackUsage('outline', 3500);
      return res.chapters || [];
    } catch (err: any) {
      console.warn(`[KdpPipeline] Falha no outline via IA (${err.message}). Utilizando Motor Local de Alta Densidade.`);
      return LocalAiEngine.generateOutline(concept, bookType);
    }
  }

  // --- 3. BIBLE AGENT (Bíblia da Obra: Ficção vs Não-Ficção) ---
  async generateBible(
    concept: IBookConcept, 
    chapters: IBookChapter[], 
    bookType: BookType, 
    language: string = 'Português'
  ): Promise<IBookBible> {
    if (this.ai.getProvider() === 'local-builtin') {
      return LocalAiEngine.generateBible(concept, chapters, bookType);
    }

    const cfg = BOOK_TYPE_CONFIGS[bookType] || BOOK_TYPE_CONFIGS['self-help'];
    const isFiction = cfg.category === 'Ficção' || cfg.hasCharacters;

    try {
      const systemPrompt = `Você é o arquiteto de bíblia editorial (Story Bible / Book Bible) para livros comerciais KDP.
Crie o documento canônico de referência que deve ser consultado antes da escrita de cada capítulo para assegurar continuidade inquestionável.

${isFiction ? `MODO FICÇÃO:
- characters: 3 a 6 personagens principais e coadjuvantes essenciais. Cada um com:
  * name: nome completo
  * role: papel ("Protagonista", "Mentor", "Antagonista", "Aliado")
  * age: idade aparente
  * appearance: traços físicos imutáveis (olhos, cabelo, porte, marcas distintivas)
  * costume: vestimenta habitual e estilo
  * palette: cores características
  * personality: temperamento, virtudes e falhas
  * voice: padrões de fala, gírias ou cadência
  * arc: trajetória e transformação ao longo da história
  * relationships: relações com outros personagens
- locations: 3 a 5 cenários marcantes (name, description, palette, mood)
- rulesOfUniverse: 3 a 5 regras invioláveis do universo ou da narrativa
` : `MODO NÃO-FICÇÃO / DESENVOLVIMENTO / NEGÓCIOS:
- coreConcepts: 3 a 6 conceitos centrais da tese da obra (concept, explanation, practicalApplication)
- keyArguments: 3 a 5 argumentos fundamentais que sustentam a autoridade do livro
- terminologyGlossary: termos ou jargões criados ou utilizados no livro com definições precisas
- factualSources: referências factuais, estudos clássicos ou marcos históricos reais que podem ser citados
- characters: avatares do leitor e estudos de caso arquetípicos (mentor, aluno em transição, profissional em crise)
- locations: ambientes de aplicação prática (escritório, ambiente doméstico, rotina matinal)
`}

- styleGuide:
  * artStyle: estilo visual da capa e diagramação
  * palette: 3 a 5 cores principais (ex: ["#0f172a", "#3b82f6", "#f8fafc"])
  * lineWeight: "sóbria e refinada"
  * lighting: clima visual
  * tone: consistência da voz narrativa

Retorne EXCLUSIVAMENTE em formato JSON:
{
  "characters": [
    {
      "name": "string",
      "role": "string",
      "age": "string",
      "appearance": "string",
      "costume": "string",
      "palette": ["string"],
      "personality": "string",
      "voice": "string",
      "arc": "string",
      "relationships": "string"
    }
  ],
  "locations": [
    {
      "name": "string",
      "description": "string",
      "palette": ["string"],
      "mood": "string"
    }
  ],
  "styleGuide": {
    "artStyle": "string",
    "palette": ["string"],
    "lineWeight": "string",
    "lighting": "string",
    "tone": "string",
    "inspirations": ["string"]
  },
  "coreConcepts": [
    { "concept": "string", "explanation": "string", "practicalApplication": "string" }
  ],
  "keyArguments": ["string"],
  "terminologyGlossary": [
    { "term": "string", "definition": "string" }
  ],
  "rulesOfUniverse": ["string"]
}`;

      const chaptersBrief = chapters.map(c => `${c.index}. ${c.title}: ${c.summary}`).join('\n');
      const userPrompt = `Título: ${concept.title}
Gênero/Tipo: ${cfg.label}
Público Alvo: ${concept.audience}
Promessa: ${concept.promise}
Tom: ${concept.tone}
Capítulos:
${chaptersBrief}

Gere a Bíblia completa da obra em JSON.`;

      const res = await this.ai.structuredCompletion<IBookBible>(systemPrompt, userPrompt);
      this.trackUsage('bible', 2800);
      return res;
    } catch (err: any) {
      console.warn(`[KdpPipeline] Falha na bíblia via IA (${err.message}). Utilizando Motor Local de Alta Densidade.`);
      return LocalAiEngine.generateBible(concept, chapters, bookType);
    }
  }

  // --- 4. WRITER AGENT (Escrita de Capítulo com Contexto Holístico) ---
  async writeChapter(
    concept: IBookConcept,
    bible: IBookBible,
    outline: IBookChapter[],
    chapter: IBookChapter,
    bookType: BookType,
    previousSummary: string = '',
    language: string = 'Português'
  ): Promise<{ prose: string; wordCount: number; notes: string[] }> {
    if (this.ai.getProvider() === 'local-builtin') {
      return LocalAiEngine.writeChapter(concept, bible, chapter, bookType, previousSummary);
    }

    const cfg = BOOK_TYPE_CONFIGS[bookType] || BOOK_TYPE_CONFIGS['self-help'];
    const isChildren = bookType === 'children-picture-book';

    try {
      const targetWords = chapter.targetWordCount && chapter.targetWordCount >= 2000 ? chapter.targetWordCount : 2500;
      const isFirstChapter = chapter.index === 1;
      const chapter1SpecialDirective = isFirstChapter ? `
    DIRETRIZ PARA O PRIMEIRO CAPÍTULO:
    - Apresente o tema, o contexto e a pergunta central com clareza, sem prometer resultados que o conteúdo não possa sustentar.
    - Use um exemplo concreto somente se for ficcional ou fornecido pelo autor; identifique exemplos hipotéticos como tais.
    - Evite sensacionalismo e alegações promocionais não comprovadas.` : '';

      const systemPrompt = `Você é um assistente editorial. Gere um RASCUNHO para revisão e edição pelo autor; nunca apresente o resultado como validado ou pronto para publicação.
${chapter1SpecialDirective}

DIRETRIZES DE EXTENSÃO E DENSIDADE (CRÍTICO PARA O KDP):
- Escreva um capítulo COMPLETO e substancial de pelo menos ${targetWords} palavras (mais de 12.000 caracteres de texto real).
- É ESTRITAMENTE PROIBIDO criar resumos curtos, esboços telegráficos ou textos de menos de 1.500 palavras. O leitor comprou um livro completo e aprofundado.
- Cada parágrafo deve ser robusto, denso e bem desenvolvido (mínimo de 4 a 7 frases completas por parágrafo), aprofundando o raciocínio sem superficialidade.
- Estruture o capítulo em seções lógicas usando subtítulos em Markdown (### Nome da Seção) para cada um dos subtópicos planejados.
- Para cada subtópico do capítulo, explore:
  1. O fundamento conceitual e a psicologia/ciência por trás do tema.
  2. Exemplos práticos do cotidiano e estudos de caso vívidos.
  3. Passo a passo e frameworks acionáveis para o leitor aplicar imediatamente.
  4. Armadilhas e erros comuns a evitar.
  5. Reflexões profundas e exercícios práticos de autoanálise.
- Idioma: ${language}.
- Tom da narrativa: "${concept.tone}".
- Produza texto original. Não imite o estilo identificável de autores específicos e não reproduza trechos protegidos.
- Não invente citações, fontes, estudos, estatísticas, credenciais, experiências ou fatos. Se faltar base, sinalize [VERIFICAR FONTE] ou use um exemplo explicitamente hipotético.
- Use informações da Bíblia da obra como material fornecido pelo usuário; não trate essas informações como fatos externos verificados.
- Preserve os fatos, nomes e personagens fornecidos pelo autor.
- NÃO repita o título do capítulo no início. Comece diretamente com uma abertura envolvente que capture o leitor na primeira linha.
${isChildren ? '- Formato Infantil: Narrativa rimada, musical e encantadora, com vocabulário rico e formatado para leitura dinâmica.' : ''}
- Retorne DIRETAMENTE o texto do capítulo em Markdown puro (NÃO envolva em JSON, NÃO use formatação de bloco de código json).`;

      const charsContext = (bible.characters || []).map(c => `- ${c.name} (${c.role}): ${c.appearance}. Temperamento: ${c.personality}`).join('\n');
      const conceptsContext = (bible.coreConcepts || []).map(c => `- ${c.concept}: ${c.explanation}`).join('\n');
      const subtopicsContext = (chapter.subtopics || []).map(s => `  * ${s}`).join('\n');

      const userPrompt = `LIVRO: "${concept.title}"
${concept.subtitle ? `Subtítulo: "${concept.subtitle}"\n` : ''}Capítulo a escrever: Capítulo ${chapter.index} - "${chapter.title}"
Objetivo do capítulo: ${chapter.objective || chapter.summary}
Resumo do capítulo: ${chapter.summary}
Subtópicos obrigatórios a aprofundar:
${subtopicsContext}
Ponto de vista (POV): ${chapter.pov || 'Narrador'}
Meta mínima: ${targetWords} palavras de prosa densa e aprofundada.

${charsContext ? `Personagens e Papéis:\n${charsContext}\n` : ''}${conceptsContext ? `Conceitos Centrais da Obra:\n${conceptsContext}\n` : ''}${previousSummary ? `Contexto do capítulo anterior:\n"${previousSummary}"\n` : ''}
Escreva agora a prosa completa e aprofundada deste capítulo (retorne apenas o texto em Markdown):`;

      const rawProse = await this.ai.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { maxTokens: 8192, temperature: 0.72 });

      // Limpa marcações acidentais de bloco de código
      let prose = (rawProse || '').trim();
      if (prose.startsWith('```markdown')) {
        prose = prose.replace(/^```markdown\s*/i, '').replace(/```\s*$/, '').trim();
      } else if (prose.startsWith('```')) {
        prose = prose.replace(/^```\w*\s*/i, '').replace(/```\s*$/, '').trim();
      }

      // Não substitui silenciosamente uma resposta curta por texto genérico: a etapa continua pendente para nova tentativa ou edição.
      if (prose.length < 1500) {
        throw new Error(`O rascunho retornado ficou muito curto (${prose.length} caracteres). Tente novamente ou escreva esta parte manualmente.`);
      }

      const wordCount = prose.split(/\s+/).filter(Boolean).length;
      this.trackUsage('writer', Math.round(wordCount * 1.4));
      return { 
        prose, 
        wordCount, 
        notes: [`Capítulo ${chapter.index} gerado com sucesso (${wordCount} palavras, ${prose.length} caracteres).`] 
      };
    } catch (err: any) {
      console.warn(`[KdpPipeline] Falha na escrita do capítulo ${chapter.index} via IA (${err.message}). Utilizando Motor Local de Alta Densidade.`);
      return LocalAiEngine.writeChapter(concept, bible, chapter, bookType, previousSummary);
    }
  }

  // --- 5. CONTINUITY AGENT (Verificador de Consistência e Fatos) ---
  async checkContinuity(
    chapter: IBookChapter,
    bible: IBookBible,
    previousChapters: IBookChapter[],
    language: string = 'Português'
  ): Promise<ContinuityIssue[]> {
    if (this.ai.getProvider() === 'local-builtin') {
      return LocalAiEngine.checkContinuity(chapter, bible, previousChapters, language);
    }

    try {
      const systemPrompt = `Você é o auditor de continuidade e consistência editorial sênior da Amazon KDP.
Examine a prosa do capítulo atual e compare-a com a Bíblia da obra e os capítulos anteriores para identificar qualquer contradição.

Exemplos de inconsistências a flagrar:
- Personagem com olhos/cabelo/idade diferentes da Bíblia
- Nome de lugar grafado incorretamente ou distância física contraditória
- Objeto que reaparece sem explicação
- Cronologia quebrada (ex: manhã que virou noite de repente)
- Em não-ficção: contradição entre conselhos ou números apresentados em capítulos anteriores

Se não houver problemas, retorne array vazio.

Retorne EXCLUSIVAMENTE em formato JSON:
{
  "issues": [
    {
      "id": "cont_1",
      "chapterIndex": ${chapter.index},
      "severity": "warning",
      "category": "character",
      "description": "Explicação clara da contradição encontrada...",
      "conflictingChapterIndex": 1,
      "suggestedFix": "Como reescrever ou corrigir o trecho para manter harmonia...",
      "status": "pending"
    }
  ]
}`;

      const prevSummaries = previousChapters.map(c => `Cap ${c.index} (${c.title}): ${c.summary}`).join('\n');
      const userPrompt = `Bíblia da Obra:
${JSON.stringify(bible.characters, null, 2)}
Capítulos Anteriores:
${prevSummaries}

Capítulo Atual em Análise (Capítulo ${chapter.index} - "${chapter.title}"):
"${(chapter.prose || '').substring(0, 3500)}"

Audite a continuidade e aponte quaisquer falhas em JSON.`;

      const res = await this.ai.structuredCompletion<{ issues: ContinuityIssue[] }>(systemPrompt, userPrompt);
      this.trackUsage('continuity', 1200);
      return res.issues || [];
    } catch (err: any) {
      console.warn(`[KdpPipeline] Falha na auditoria de continuidade via IA (${err.message}). Utilizando Motor Local.`);
      return LocalAiEngine.checkContinuity(chapter, bible, previousChapters, language);
    }
  }

  // --- 6. EDITOR AGENT (Revisão de Estilo, Ritmo e Clareza) ---
  async reviewManuscript(
    concept: IBookConcept,
    chapters: IBookChapter[],
    bible: IBookBible,
    language: string = 'Português'
  ): Promise<IBookEditorReport> {
    if (this.ai.getProvider() === 'local-builtin') {
      return LocalAiEngine.reviewManuscript(concept, chapters, bible, language);
    }

    try {
      const systemPrompt = `Você é o editor-chefe de uma grande editora comercial e revisor sênior da Amazon KDP.
Faça uma leitura crítica profunda do manuscrito da obra quanto a clareza, ritmo (pacing), repetição de ideias, naturalidade do texto e impacto comercial.

Avalie:
- score: nota geral de 1 a 100
- strengths: 3 a 5 pontos fortes claros da obra
- issues: problemas editoriais identificados por capítulo com gravidade ('blocker', 'important', 'minor')
- chaptersToRevise: lista com índices dos capítulos que mais merecem polimento
- plagiarismNote: avaliação heurística de originalidade do texto

Retorne EXCLUSIVAMENTE em formato JSON:
{
  "score": 92,
  "summary": "Parecer editorial detalhado...",
  "strengths": ["string", "string"],
  "issues": [
    {
      "chapterIndex": 1,
      "severity": "minor",
      "category": "pacing",
      "note": "string"
    }
  ],
  "chaptersToRevise": [1],
  "plagiarismNote": "Texto com estrutura original e livre de clichês artificiais."
}`;

      const chaptersSample = chapters.map(c => {
        const words = c.wordCount || 0;
        const snippet = (c.prose || '').substring(0, 250);
        return `Capítulo ${c.index}: ${c.title} (${words} palavras)\nAmostra: ${snippet}...`;
      }).join('\n\n');

      const userPrompt = `Livro: "${concept.title}"
Gênero: "${concept.tone}"
Público Alvo: "${concept.audience}"
Capítulos produzidos:\n${chaptersSample}

Faça o parecer editorial completo em JSON.`;

      const res = await this.ai.structuredCompletion<IBookEditorReport>(systemPrompt, userPrompt);
      this.trackUsage('editor', 2400);
      return res;
    } catch (err: any) {
      console.warn(`[KdpPipeline] Falha na revisão crítica via IA (${err.message}). Utilizando Motor Local.`);
      return LocalAiEngine.reviewManuscript(concept, chapters, bible, language);
    }
  }

  // --- 7. EDITORIAL MATTER AGENT (Páginas Preliminares e Finais) ---
  async generateEditorialMatter(
    concept: IBookConcept,
    author: string = 'Autor',
    language: string = 'Português'
  ): Promise<EditorialElements> {
    if (this.ai.getProvider() === 'local-builtin') {
      return LocalAiEngine.generateEditorialMatter(concept, author);
    }

    const year = new Date().getFullYear();

    try {
      const systemPrompt = `Você é um assistente editorial que prepara rascunhos para revisão do autor. Não apresente resultados como prontos para publicação.

Itens obrigatórios:
- halfTitle: título curto
    - titlePage: objeto com title, subtitle, author, publisher (string vazia; não presuma uma editora) e year ("${year}")
    - copyrightNotice: aviso para o autor preencher e revisar titularidade e permissões; não dê aconselhamento legal nem presuma que o autor detém direitos
    - preface: rascunho genérico marcado para revisão; não invente motivações ou experiências pessoais do autor
    - introduction: introdução de rascunho sobre o tema e escopo; não invente fatos, estudos, estatísticas ou fontes
    - conclusion: síntese de rascunho compatível com o conteúdo fornecido; sem promessas ou recomendações sem suporte
    - acknowledgements: string vazia, salvo nomes/contribuições fornecidos pelo autor
    - aboutAuthor: string vazia; não invente biografia, credenciais ou experiência
    - Não crie citações, referências, fontes, atribuições ou alegações de verificação. Marque afirmações sem suporte como [VERIFICAR FONTE].
    - Evite imitar estilos de autores específicos. Todo conteúdo é rascunho que requer conferência humana.

Retorne EXCLUSIVAMENTE em formato JSON:
{
  "halfTitle": "${concept.title}",
  "titlePage": {
    "title": "${concept.title}",
    "subtitle": "${concept.subtitle || ''}",
    "author": "${author}",
    "publisher": "",
    "year": "${year}"
  },
  "copyrightNotice": "string",
  "preface": "string",
  "introduction": "string",
  "conclusion": "string",
  "acknowledgements": "string",
  "aboutAuthor": ""
}`;

      const userPrompt = `Título: ${concept.title}
Subtítulo: ${concept.subtitle || ''}
Promessa: ${concept.promise}
Público Alvo: ${concept.audience}
Autor: ${author}

Gere todos os elementos editoriais em JSON.`;

      const res = await this.ai.structuredCompletion<EditorialElements>(systemPrompt, userPrompt);
      this.trackUsage('editorial_matter', 2200);
      return res;
    } catch (err: any) {
      console.warn(`[KdpPipeline] Falha no editorial via IA (${err.message}). Utilizando Motor Local de Alta Densidade.`);
      return LocalAiEngine.generateEditorialMatter(concept, author);
    }
  }

  // --- 8. COVER AGENT (Geometria KDP + Prompts Visuais) ---
  async generateCoverDesign(
    concept: IBookConcept,
    bible: IBookBible,
    author: string = 'Autor',
    pageCount: number = 160
  ): Promise<IBookCoverDesign> {
    const trim = concept.trimSize || '6x9';
    const paper = concept.paperType || 'bw-white';

    // Cálculo exato de lombada KDP
    const spineInches = paper === 'bw-cream' ? pageCount * 0.0025 : pageCount * 0.002252;
    const bleedInches = 0.125;

    const trimDims: Record<TrimSize, [number, number]> = {
      '5x8': [5, 8],
      '5.25x8': [5.25, 8],
      '5.5x8.5': [5.5, 8.5],
      '6x9': [6, 9],
      '7x10': [7, 10],
      '7.5x9.25': [7.5, 9.25],
      '8x10': [8, 10],
      '8.5x8.5': [8.5, 8.5],
      '8.5x11': [8.5, 11],
      'custom': [6, 9]
    };
    const [w, h] = trimDims[trim] || [6, 9];
    const totalW = (w * 2) + spineInches + (bleedInches * 2);
    const totalH = h + (bleedInches * 2);

    const systemPrompt = `Você é o diretor de arte de capas de livros de alta conversão da Amazon KDP.
Crie o conceito visual e o prompt profissional para renderização da capa no DALL-E / Midjourney, além do texto vendedor da contracapa (blurb).

REGRAS:
- frontPrompt: Prompt em inglês extremamente descritivo para gerador de imagens IA. Deve focar no conceito visual central, iluminação profissional de estúdio editorial, composição limpa e elegante, SEM tentar renderizar textos complexos na imagem.
- backCoverBlurb: Texto persuasivo e elegante para a contracapa (3 parágrafos curtos + 3 bullet points de destaque).

Retorne EXCLUSIVAMENTE em formato JSON:
{
  "frontPrompt": "string",
  "backCoverBlurb": "string"
}`;

    const userPrompt = `Livro: "${concept.title}"
Subtítulo: "${concept.subtitle || ''}"
Gênero: "${concept.tone}"
Público Alvo: "${concept.audience}"
Promessa: "${concept.promise}"
Estilo Visual da Bíblia: "${bible.styleGuide?.artStyle || 'Design minimalista contemporâneo'}"

Gere os dados de design da capa em JSON.`;

    let frontPrompt = `Cinematic book cover art for "${concept.title}", professional typography, modern bestseller aesthetic, dramatic lighting, 8k resolution, photorealistic`;
    let backCoverBlurb = `${concept.shortSynopsis}\n\nUma investigação profunda e imperdível para leitores exigentes.`;

    if (this.ai.getSettings().provider !== 'local-builtin') {
      try {
        const res = await this.ai.structuredCompletion<{ frontPrompt: string; backCoverBlurb: string }>(systemPrompt, userPrompt);
        this.trackUsage('cover', 1100);
        if (res && res.frontPrompt) {
          frontPrompt = res.frontPrompt;
        }
        if (res && res.backCoverBlurb) {
          backCoverBlurb = res.backCoverBlurb;
        }
      } catch (err: any) {
        console.warn(`[KdpPipeline] Falha no cover design via IA (${err.message}). Utilizando Motor Local.`);
      }
    }

    return {
      frontPrompt,
      title: concept.title,
      subtitle: concept.subtitle,
      author,
      backCoverBlurb,
      geometry: {
        trimSize: trim,
        pageCount,
        paperType: paper,
        spineWidthInches: Number(spineInches.toFixed(3)),
        totalCoverWidthInches: Number(totalW.toFixed(3)),
        totalCoverHeightInches: Number(totalH.toFixed(3)),
        bleedInches,
        spineText: `${concept.title}  •  ${author}`
      }
    };
  }

  // --- 9. METADATA AGENT (Metadados Otimizados para o Algoritmo da Amazon KDP) ---
  async generateMetadataKdp(
    concept: IBookConcept,
    chapters: IBookChapter[],
    author: string = 'Autor',
    language: string = 'Português'
  ): Promise<IBookMetadataKdp> {
    if (this.ai.getProvider() === 'local-builtin') {
      return LocalAiEngine.generateMetadataKdp(concept, author);
    }

    try {
      const systemPrompt = `Você é o especialista líder em SEO para Amazon KDP e algoritmo A9/Cosmo.
Crie o pacote de metadados comercial definitivo para maximizar a visibilidade orgânica do livro nas buscas da Amazon.

REGRAS:
- keywords7: EXATAMENTE 7 frases-chave de cauda longa (long-tail keywords) altamente pesquisadas no nicho (sem repetir palavras do título).
- categoriesPrimary: 2 a 3 categorias oficiais BISAC/Amazon exatas para cadastrar no KDP.
- commercialShortDescription: descrição comercial de 2 a 3 frases com gancho irresistível.
- commercialLongDescription: descrição HTML completa formatada com <b>, <i>, <h3>, <ul>, <li> para a página do produto na Amazon (incluindo chamada de benefício, público ideal e chamada para ação).
- salesHooks: 3 a 5 frases de impacto comercial para marketing.

Retorne EXCLUSIVAMENTE em formato JSON:
{
  "commercialShortDescription": "string",
  "commercialLongDescription": "string",
  "salesHooks": ["string", "string"],
  "keywords7": ["frase 1", "frase 2", "frase 3", "frase 4", "frase 5", "frase 6", "frase 7"],
  "categoriesPrimary": ["string", "string"],
  "categoriesSecondary": ["string"],
  "targetAudience": "${concept.audience}",
  "priceSuggestedBrl": 19.90,
  "priceSuggestedUsd": 4.99
}`;

      const chaptersTitles = chapters.map(c => c.title).join(', ');
      const userPrompt = `Título: ${concept.title}
Subtítulo: ${concept.subtitle || ''}
Autor: ${author}
Promessa da obra: ${concept.promise}
Diferencial: ${concept.differentiator}
Capítulos: ${chaptersTitles}

Gere o pacote completo de metadados KDP em JSON.`;

      const res = await this.ai.structuredCompletion<any>(systemPrompt, userPrompt);
      this.trackUsage('metadata', 1500);

      return {
        title: concept.title,
        subtitle: concept.subtitle,
        author,
        descriptionHtml: res.commercialLongDescription,
        commercialShortDescription: res.commercialShortDescription,
        commercialLongDescription: res.commercialLongDescription,
        salesHooks: res.salesHooks || [],
        keywords7: (res.keywords7 || []).slice(0, 7),
        categoriesPrimary: res.categoriesPrimary || [],
        categoriesSecondary: res.categoriesSecondary || [],
        language,
        targetAudience: concept.audience,
        priceSuggestedBrl: res.priceSuggestedBrl || 19.90,
        priceSuggestedUsd: res.priceSuggestedUsd || 4.99
      };
    } catch (err: any) {
      console.warn(`[KdpPipeline] Falha no metadata via IA (${err.message}). Utilizando Motor Local.`);
      return LocalAiEngine.generateMetadataKdp(concept, author);
    }
  }

  // --- 10. QUALITY GATE AGENT (Auditoria de Publicação KDP) ---
  public runQualityGate(project: BookProject): IBookQualityReport {
    const checks: IBookQualityReport['checks'] = [];
    const chapters = project.kdpChapters || [];
    const totalWords = chapters.reduce((s, c) => s + (c.wordCount || 0), 0);

    // 1. Manuscrito Completo
    const hasEnoughWords = totalWords >= 2000;
    checks.push({
      id: 'chk_words',
      name: 'Extensão Mínima do Manuscrito',
      category: 'Manuscrito',
      passed: hasEnoughWords,
      details: hasEnoughWords ? `Manuscrito com ${totalWords.toLocaleString()} palavras registradas.` : `Volume insuficiente de texto (${totalWords} palavras).`,
      severity: 'blocker'
    });

    // 2. Capítulos Preenchidos
    const emptyChapters = chapters.filter(c => !c.prose || c.prose.trim().length < 100);
    checks.push({
      id: 'chk_chapters',
      name: 'Integridade de Capítulos',
      category: 'Estrutura',
      passed: emptyChapters.length === 0 && chapters.length > 0,
      details: emptyChapters.length === 0 ? `Todos os ${chapters.length} capítulos possuem texto completo.` : `${emptyChapters.length} capítulos sem prosa redigida.`,
      severity: 'blocker'
    });

    // 3. Metadados KDP
    const hasMetadata = !!(
      project.kdpMetadata?.keywords7?.length === 7 &&
      project.kdpMetadata.keywords7.every(keyword => keyword.trim().length > 0) &&
      project.kdpMetadata.commercialLongDescription?.trim()
    );
    checks.push({
      id: 'chk_metadata',
      name: 'Metadados e SEO KDP',
      category: 'Metadados',
      passed: hasMetadata,
      details: hasMetadata ? 'Palavras-chave e descrição comercial validadas.' : 'Metadados incompletos ou palavras-chave insuficientes.',
      severity: 'warning'
    });

    // 4. Elementos Editoriais
    const hasEditorial = !!(project.editorialElements?.introduction && project.editorialElements?.copyrightNotice);
    checks.push({
      id: 'chk_editorial',
      name: 'Páginas Preliminares & Direitos',
      category: 'Formatação',
      passed: hasEditorial,
      details: hasEditorial ? 'Folha de rosto, créditos e introdução estruturados.' : 'Páginas preliminares ausentes.',
      severity: 'warning'
    });

    // 5. Capa KDP
    const hasCover = !!(
      project.coverImageUrl || 
      project.kdpCoverDesign?.frontImageUrl || 
      project.stageData?.['book-cover']?.artUrl || 
      project.kdpCoverDesign?.geometry
    );
    checks.push({
      id: 'chk_cover',
      name: 'Capa do Livro & Geometria KDP',
      category: 'Capa',
      passed: hasCover,
      details: hasCover 
        ? `Capa configurada para formato ${project.trimSize || '6x9'} com lombada proporcional.` 
        : 'Capa do livro ainda não foi selecionada ou projetada.',
      severity: 'blocker'
    });

    const blockerCount = checks.filter(c => !c.passed && c.severity === 'blocker').length;
    const warningCount = checks.filter(c => !c.passed && c.severity === 'warning').length;
    const overallScore = Math.max(20, Math.round(100 - (blockerCount * 30) - (warningCount * 10)));
    const isReadyForKdp = blockerCount === 0 && warningCount === 0;
    const recommendations = blockerCount > 0
      ? ['Corrija os bloqueadores antes de gerar o pacote final KDP.']
      : warningCount > 0
        ? ['Revise os avisos antes de exportar. Depois, valide os arquivos no Previewer do KDP.']
        : ['Checklist interno concluído. Valide os arquivos no Previewer do KDP antes de publicar.'];

    return {
      overallScore,
      passed: isReadyForKdp,
      isReadyForKdp,
      blockerCount,
      warningCount,
      checks,
      recommendations,
      timestamp: Date.now()
    };
  }
}
