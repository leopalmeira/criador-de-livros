// ============================================================
// GEMINI BOOK GENERATOR SERVICE
// Motor central de geração assistida do livro completo via API Gemini.
// Cada etapa produz conteúdo real usando a IA com regras de:
//   - Anti-Plágio (conteúdo 100% original)
//   - Anti-Redundância (sem repetições entre seções)
//   - Anti-Alucinação (dados factuais verificáveis)
//   - Coerência Contextual (cada etapa usa o contexto das anteriores)
// ============================================================

import { AiService, ChatMessage } from './ai-service';
import { BookProject, IBookChapter, BOOK_TYPE_CONFIGS, BookType } from '../types/book-project';
import { StageId, getDefaultStageStatuses } from '../types/stages';

export interface GenerationStepResult {
  stageId: StageId;
  success: boolean;
  data: any;
  error?: string;
  tokensUsed?: number;
}

export interface AssistedFlowState {
  currentStep: StageId;
  stepsCompleted: StageId[];
  stepsPending: StageId[];
  isGenerating: boolean;
  lastResult?: GenerationStepResult;
  totalSteps: number;
  completedCount: number;
}

// System prompt base com regras editoriais
const EDITORIAL_SYSTEM_PROMPT = `Você é um editor literário profissional e estrategista editorial da Amazon KDP com mais de 20 anos de experiência.

REGRAS ABSOLUTAS DE GERAÇÃO:
1. ANTI-PLÁGIO: Todo conteúdo gerado DEVE ser 100% original. NUNCA copie trechos de obras existentes. Use referências apenas como inspiração de estrutura.
2. ANTI-REDUNDÂNCIA: NUNCA repita frases, ideias ou parágrafos entre seções. Cada trecho deve conter informação nova e progressiva.
3. ANTI-ALUCINAÇÃO: NÃO invente dados estatísticos, citações de pessoas reais, ou fatos verificáveis sem base. Se precisar de dados, use estimativas claramente marcadas.
4. COERÊNCIA: Mantenha absoluta consistência de tom, voz, personagens e premissa ao longo de todo o livro.
5. QUALIDADE: Escreva como um autor profissional publicado. Frases variadas, ritmo envolvente, vocabulário rico mas acessível.
6. IDIOMA: Sempre em Português do Brasil, exceto quando explicitamente solicitado outro idioma.
7. FORMATO: Responda EXCLUSIVAMENTE no formato solicitado (JSON ou texto). Sem explicações ou notas extras.`;

export class GeminiBookGeneratorService {
  private aiService: AiService;

  constructor(aiService: AiService) {
    this.aiService = aiService;
  }

  /**
   * Verifica se a API Gemini está configurada e funcional
   */
  async isGeminiReady(): Promise<{ ready: boolean; message: string }> {
    const settings = this.aiService.getSettings();
    if (settings.provider !== 'gemini') {
      return { ready: false, message: 'A API Gemini não está configurada. Vá em Configurações > IA e selecione "Google Gemini" como provedor.' };
    }
    if (!settings.apiKey?.trim()) {
      return { ready: false, message: 'Chave de API do Gemini não configurada. Insira sua chave em Configurações > IA.' };
    }
    try {
      const test = await this.aiService.testConnection();
      return { ready: test.success, message: test.message };
    } catch {
      return { ready: false, message: 'Erro ao testar conexão com a API Gemini.' };
    }
  }

  /**
   * Extrai o contexto editorial completo do projeto para alimentar cada prompt
   */
  private buildEditorialContext(project: BookProject): string {
    const data = project.stageData || {};
    const research = data.research;
    const analytics = data.analytics;
    const titles = data['book-titles'];
    const persona = data['author-persona'];
    const purpose = data.purpose;
    const details = data['book-details'];
    const bio = data['author-bio'];
    const chapters = project.kdpChapters || [];

    const parts: string[] = [];

    parts.push(`PROJETO DO LIVRO:`);
    parts.push(`- Título: "${project.title || 'Sem título'}"`);
    if (project.subtitle) parts.push(`- Subtítulo: "${project.subtitle}"`);
    parts.push(`- Autor: ${project.author || 'A definir'}`);
    parts.push(`- Gênero KDP: ${project.kdpBookType || 'não-ficção'}`);
    parts.push(`- Público-Alvo: ${project.targetAudience || 'Público Geral'}`);
    if (project.topic) parts.push(`- Tópico Central: ${project.topic}`);
    parts.push(`- Páginas Alvo: ${project.estimatedPages || project.actualPages || 150}`);
    parts.push(`- Idioma: ${project.language || 'Português'}`);

    if (research) {
      parts.push(`\nPESQUISA EDITORIAL:`);
      if (research.stance) parts.push(`- Posicionamento: ${research.stance}`);
      if (research.standout) parts.push(`- Diferencial: ${research.standout}`);
      if (research.authorTone) parts.push(`- Tom do Autor: ${research.authorTone}`);
    }

    if (analytics?.marketReferences?.length) {
      parts.push(`\nREFERÊNCIAS DE MERCADO (${analytics.marketReferences.length} títulos):`);
      analytics.marketReferences.slice(0, 3).forEach((ref: any) => {
        parts.push(`  • "${ref.title}" (${ref.author}) — BSR: ${ref.bsr || 'N/D'}, Rating: ${ref.rating || 'N/D'}`);
      });
    }

    if (persona?.generatedPersona) {
      parts.push(`\nPERSONA EDITORIAL:\n${persona.generatedPersona.substring(0, 500)}`);
    }

    if (purpose?.generatedProposal) {
      parts.push(`\nPROPOSTA EDITORIAL:\n${purpose.generatedProposal.substring(0, 500)}`);
    }

    if (chapters.length > 0) {
      parts.push(`\nSUMÁRIO EXISTENTE (${chapters.length} capítulos):`);
      chapters.forEach((ch, i) => {
        parts.push(`  Cap. ${i + 1}: ${ch.title}${ch.summary ? ` — ${ch.summary.substring(0, 80)}` : ''}`);
      });
    }

    return parts.join('\n');
  }

  // ============================================================
  // ETAPA 1: PESQUISA & DEFINIÇÃO EDITORIAL
  // ============================================================
  async generateResearch(project: BookProject): Promise<GenerationStepResult> {
    try {
      const topic = project.topic || project.title || 'Livro sem tema definido';
      const genre = project.kdpBookType || 'non-fiction';

      const prompt = `Analise o seguinte projeto de livro e gere os dados de pesquisa editorial completos.

Tema/Ideia do Livro: "${topic}"
Gênero KDP: ${genre}

Retorne EXCLUSIVAMENTE um JSON válido com os campos:
{
  "bookTitle": "título sugerido alinhado ao tema (string)",
  "authorName": "pseudônimo fictício profissional adequado ao gênero (string)",
  "genre": "${genre}",
  "topic": "descrição expandida e estratégica do tópico (string, 2-3 frases)",
  "stance": "posicionamento editorial diferenciado e único (string, 2-3 frases)",
  "standout": "o que torna este livro diferente de todos os concorrentes (string, 2-3 frases)",
  "authorTone": "tom de voz recomendado para a obra (string)",
  "generalAudience": "público amplo (string)",
  "targetAudience": "público-alvo específico com dores e desejos detalhados (string, 2-3 frases)"
}`;

      const response = await this.aiService.generateText(prompt, EDITORIAL_SYSTEM_PROMPT, {
        temperature: 0.7,
        responseFormat: 'json'
      });

      const parsed = this.safeParseJson(response);
      if (!parsed || !parsed.topic) {
        return { stageId: 'research', success: false, data: null, error: 'Resposta da IA sem dados válidos de pesquisa.' };
      }

      return { stageId: 'research', success: true, data: parsed };
    } catch (err: any) {
      return { stageId: 'research', success: false, data: null, error: err.message };
    }
  }

  // ============================================================
  // ETAPA 2: ANÁLISE DE MERCADO
  // ============================================================
  async generateAnalytics(project: BookProject): Promise<GenerationStepResult> {
    try {
      const ctx = this.buildEditorialContext(project);

      const prompt = `${ctx}

Com base no projeto acima, gere uma análise de mercado completa para posicionar este livro na Amazon KDP.

Retorne EXCLUSIVAMENTE um JSON válido com os campos:
{
  "aiAnalysisSummary": "análise estratégica de 3-5 parágrafos sobre o nicho, demanda, concorrência e oportunidades (string)",
  "analysisNotes": "notas táticas de posicionamento e diferenciação (string, 2-3 parágrafos)",
  "searchKeywords": "lista de 15-20 palavras-chave KDP separadas por vírgula (string)",
  "marketReferences": [
    {
      "id": "ref_1",
      "title": "título de livro concorrente real existente na Amazon (string)",
      "author": "autor real (string)",
      "bsr": número estimado de BSR,
      "rating": nota de 4.0 a 5.0,
      "reviewCount": número estimado de avaliações,
      "price": preço em reais,
      "format": "eBook Kindle",
      "selectionReason": "por que este livro é referência relevante (string)",
      "narrativeStructure": "estrutura narrativa resumida (string)",
      "openingHook": "gancho de abertura (string)",
      "commercialPositioning": "posicionamento comercial (string)",
      "ethicalInspirationGuideline": "como se inspirar eticamente sem plagiar (string)",
      "collectedAt": ${Date.now()}
    }
  ]
}

Gere exatamente 5 referências de mercado com livros REAIS existentes na Amazon relevantes ao nicho.`;

      const response = await this.aiService.generateText(prompt, EDITORIAL_SYSTEM_PROMPT, {
        temperature: 0.6,
        responseFormat: 'json',
        maxTokens: 4096
      });

      const parsed = this.safeParseJson(response);
      if (!parsed) {
        return { stageId: 'analytics', success: false, data: null, error: 'Falha ao parsear análise de mercado.' };
      }

      return { stageId: 'analytics', success: true, data: parsed };
    } catch (err: any) {
      return { stageId: 'analytics', success: false, data: null, error: err.message };
    }
  }

  // ============================================================
  // ETAPA 3: TÍTULOS & SUBTÍTULOS
  // ============================================================
  async generateTitles(project: BookProject): Promise<GenerationStepResult> {
    try {
      const ctx = this.buildEditorialContext(project);

      const prompt = `${ctx}

Com base no contexto editorial acima, gere 10 opções de títulos e subtítulos de ALTÍSSIMO impacto comercial para a Amazon KDP.

REGRAS:
- Cada título deve ser memorável, instigante e com forte apelo emocional.
- Cada subtítulo deve explicar o benefício/transformação para o leitor.
- Varie os estilos: provocativo, aspiracional, metodológico, narrativo, etc.
- Todos devem ser originais e NUNCA copiar títulos existentes.

Retorne EXCLUSIVAMENTE um JSON array:
[
  { "id": "title_1", "title": "...", "subtitle": "..." },
  ...
]`;

      const response = await this.aiService.generateText(prompt, EDITORIAL_SYSTEM_PROMPT, {
        temperature: 0.85,
        responseFormat: 'json'
      });

      const parsed = this.safeParseJson(response);
      const titles = Array.isArray(parsed) ? parsed : (parsed?.titles || parsed?.generatedTitles || []);

      if (!titles.length) {
        return { stageId: 'book-titles', success: false, data: null, error: 'Nenhum título gerado.' };
      }

      // Garante IDs únicos
      const withIds = titles.map((t: any, i: number) => ({
        id: t.id || `title_${Date.now()}_${i}`,
        title: t.title || '',
        subtitle: t.subtitle || ''
      }));

      return {
        stageId: 'book-titles',
        success: true,
        data: {
          generatedTitles: withIds,
          selectedTitleId: withIds[0]?.id || '',
          customTitle: withIds[0]?.title || '',
          customSubtitle: withIds[0]?.subtitle || ''
        }
      };
    } catch (err: any) {
      return { stageId: 'book-titles', success: false, data: null, error: err.message };
    }
  }

  // ============================================================
  // ETAPA 5: VOZ & PERSONA DO AUTOR
  // ============================================================
  async generateAuthorPersona(project: BookProject): Promise<GenerationStepResult> {
    try {
      const ctx = this.buildEditorialContext(project);

      const prompt = `${ctx}

Crie uma persona editorial profunda e coesa para o autor deste livro.

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "inspirationAuthors": "3-5 autores de referência cujo estilo inspiraria esta obra (string)",
  "authorDescription": "descrição detalhada do perfil autoral (2-3 parágrafos)",
  "writingSample": "parágrafo de exemplo mostrando exatamente como a voz autoral soa (1 parágrafo denso)",
  "generatedPersona": "perfil editorial completo: tom de voz, cadência, vocabulário, uso de metáforas, nível de autoridade (3-4 parágrafos densos)",
  "tone": "tom de voz principal (string curta)",
  "mood": "atmosfera emocional da obra (string curta)",
  "perspective": "perspectiva narrativa (primeira pessoa, terceira, etc.)",
  "pacingStyle": "ritmo da escrita (ágil, contemplativo, episódico, etc.)"
}`;

      const response = await this.aiService.generateText(prompt, EDITORIAL_SYSTEM_PROMPT, {
        temperature: 0.75,
        responseFormat: 'json',
        maxTokens: 3000
      });

      const parsed = this.safeParseJson(response);
      if (!parsed) {
        return { stageId: 'author-persona', success: false, data: null, error: 'Falha ao gerar persona.' };
      }

      return { stageId: 'author-persona', success: true, data: parsed };
    } catch (err: any) {
      return { stageId: 'author-persona', success: false, data: null, error: err.message };
    }
  }

  // ============================================================
  // ETAPA 6: PROPOSTA EDITORIAL
  // ============================================================
  async generatePurpose(project: BookProject): Promise<GenerationStepResult> {
    try {
      const ctx = this.buildEditorialContext(project);

      const prompt = `${ctx}

Gere uma Proposta Editorial e Posicionamento de Mercado completa.

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "uniqueSellingPoint": "proposta única de valor - por que este livro precisa existir (2-3 parágrafos)",
  "competitiveLandscape": "análise da paisagem competitiva - o que falta nos concorrentes (2-3 parágrafos)",
  "keySellingPoints": ["ponto de venda 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"],
  "proposedAudience": "perfil detalhado do leitor ideal com dores e ambições (2-3 parágrafos)",
  "proposedTone": "tom editorial e promessa central (string)",
  "generatedProposal": "proposta editorial completa integrando todos os blocos acima (4-6 parágrafos)",
  "focusTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "bookPromise": "a promessa central do livro em 1 frase poderosa (string)",
  "transformation": "a transformação específica que o leitor terá ao terminar o livro (string)",
  "authorMotivation": "motivação central do autor para escrever esta obra (string)"
}`;

      const response = await this.aiService.generateText(prompt, EDITORIAL_SYSTEM_PROMPT, {
        temperature: 0.7,
        responseFormat: 'json',
        maxTokens: 3000
      });

      const parsed = this.safeParseJson(response);
      if (!parsed) {
        return { stageId: 'purpose', success: false, data: null, error: 'Falha ao gerar proposta editorial.' };
      }

      // Garante arrays
      if (!parsed.focusTags) parsed.focusTags = [];
      if (!parsed.keySellingPoints) parsed.keySellingPoints = [];
      parsed.customTags = [];

      return { stageId: 'purpose', success: true, data: parsed };
    } catch (err: any) {
      return { stageId: 'purpose', success: false, data: null, error: err.message };
    }
  }

  // ============================================================
  // ETAPA 8: BIOGRAFIA DO AUTOR
  // ============================================================
  async generateAuthorBio(project: BookProject): Promise<GenerationStepResult> {
    try {
      const ctx = this.buildEditorialContext(project);

      const prompt = `${ctx}

Escreva uma biografia editorial de autor oficial para a Amazon KDP e contracapa do livro.

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "nameType": "pen-name",
  "background": "trajetória e vivência do autor que fundamenta a obra (2-3 frases)",
  "achievements": "conquistas, resultados e marcos de reconhecimento (2-3 frases)",
  "personalDetails": "detalhes pessoais e hobbies que criam conexão humana (1-2 frases)",
  "generatedBio": "biografia editorial completa em 3 parágrafos fluídos, em 3ª pessoa, profissional, acolhedora e envolvente. Pronta para publicação na Amazon Author Central e contracapa."
}`;

      const response = await this.aiService.generateText(prompt, EDITORIAL_SYSTEM_PROMPT, {
        temperature: 0.7,
        responseFormat: 'json',
        maxTokens: 2000
      });

      const parsed = this.safeParseJson(response);
      if (!parsed) {
        return { stageId: 'author-bio', success: false, data: null, error: 'Falha ao gerar biografia.' };
      }

      return { stageId: 'author-bio', success: true, data: parsed };
    } catch (err: any) {
      return { stageId: 'author-bio', success: false, data: null, error: err.message };
    }
  }

  // ============================================================
  // ETAPA 9: SUMÁRIO & ESTRUTURA DE CAPÍTULOS
  // ============================================================
  async generateOutline(project: BookProject): Promise<GenerationStepResult> {
    try {
      const ctx = this.buildEditorialContext(project);
      const targetPages = project.estimatedPages || project.actualPages || 150;
      const cfg = BOOK_TYPE_CONFIGS[project.kdpBookType as BookType] || BOOK_TYPE_CONFIGS['non-fiction'];
      const chapterRange = cfg.chapterCount;
      const chapterCount = Math.round((chapterRange[0] + chapterRange[1]) / 2);
      const wordsPerChapter = Math.round(((cfg.wordsPerChapter[0] + cfg.wordsPerChapter[1]) / 2));

      const prompt = `${ctx}

Gere o sumário completo com estrutura detalhada para o livro.

REQUISITOS:
- Gere exatamente ${chapterCount} capítulos para atingir aproximadamente ${targetPages} páginas.
- Cada capítulo deve ter ~${wordsPerChapter} palavras quando escrito.
- O sumário deve ter arco narrativo coerente: introdução → desenvolvimento → clímax → resolução.
- Cada capítulo deve ter propósito claro e progressão lógica.
- Inclua seções dentro de cada capítulo.

Retorne EXCLUSIVAMENTE um JSON array de capítulos:
[
  {
    "title": "título do capítulo (string)",
    "summary": "sinopse do capítulo em 3-5 frases (string)",
    "purpose": "objetivo editorial e de transformação do leitor neste capítulo (string)",
    "sections": ["seção 1", "seção 2", "seção 3"],
    "wordCountTarget": ${wordsPerChapter},
    "hookOpening": "frase de abertura sugerida para este capítulo (string)"
  }
]`;

      const response = await this.aiService.generateText(prompt, EDITORIAL_SYSTEM_PROMPT, {
        temperature: 0.7,
        responseFormat: 'json',
        maxTokens: 4096
      });

      const parsed = this.safeParseJson(response);
      const chapters = Array.isArray(parsed) ? parsed : (parsed?.chapters || []);

      if (!chapters.length) {
        return { stageId: 'outline', success: false, data: null, error: 'Nenhum capítulo gerado.' };
      }

      // Converte para IBookChapter
      const kdpChapters: IBookChapter[] = chapters.map((ch: any, i: number) => ({
        index: i,
        title: ch.title || `Capítulo ${i + 1}`,
        summary: ch.summary || '',
        purpose: ch.purpose || '',
        objective: ch.hookOpening || '',
        sections: ch.sections || [],
        targetWordCount: ch.wordCountTarget || wordsPerChapter,
        status: 'PENDENTE' as const,
        prose: '',
        wordCount: 0,
        scenes: []
      }));

      return { stageId: 'outline', success: true, data: { kdpChapters } };
    } catch (err: any) {
      return { stageId: 'outline', success: false, data: null, error: err.message };
    }
  }

  // ============================================================
  // ETAPA 10: ESCRITA DO CAPÍTULO INDIVIDUAL
  // ============================================================
  async generateChapterContent(project: BookProject, chapterIndex: number): Promise<GenerationStepResult> {
    try {
      const chapters = project.kdpChapters || [];
      const chapter = chapters[chapterIndex];
      if (!chapter) {
        return { stageId: 'write', success: false, data: null, error: `Capítulo ${chapterIndex + 1} não encontrado.` };
      }

      const ctx = this.buildEditorialContext(project);
      const persona = project.stageData?.['author-persona']?.generatedPersona || '';

      const prevChapters = chapters.slice(0, chapterIndex);
      const prevContext = '\n\nRESUMO DOS CAPÍTULOS ANTERIORES (para manter continuidade e evitar redundância):';
      let prevContextStr = prevContext;
      prevChapters.forEach((ch, i) => {
        const summary = ch.prose ? ch.prose.substring(0, 300) + '...' : ch.summary || '';
        prevContextStr += `\n  Cap. ${i + 1} "${ch.title}": ${summary}`;
      });

      const prompt = `${ctx}
${prevChapters.length > 0 ? prevContextStr : ''}

PERSONA EDITORIAL A SEGUIR:
${persona || 'Tom profissional, envolvente e acessível.'}

ESCREVA O CAPÍTULO ${chapterIndex + 1} COMPLETO:
Título: "${chapter.title}"
Sinopse: ${chapter.summary || 'Sem sinopse definida'}
Propósito: ${chapter.purpose || 'Entregar valor ao leitor'}
Seções: ${(chapter.sections || []).map((s: any) => typeof s === 'string' ? s : s.title).join(', ') || 'Livre'}
Meta de palavras: ~${chapter.targetWordCount || 2500} palavras
${chapter.objective ? `Sugestão de abertura: "${chapter.objective}"` : ''}

REGRAS DE ESCRITA:
1. Escreva o capítulo COMPLETO com texto publicável.
2. Use a persona editorial definida para manter coerência de voz.
3. Comece com um gancho de abertura poderoso.
4. Inclua subseções com títulos quando apropriado.
5. Termine com um gancho para o próximo capítulo (se não for o último).
6. NÃO repita ideias já abordadas nos capítulos anteriores.
7. Escreva em prosa fluída e profissional, NOT em formato de lista.
8. Atinja a meta de palavras.

Retorne APENAS o texto do capítulo, sem markdown de código ou JSON.`;

      const response = await this.aiService.generateText(prompt, EDITORIAL_SYSTEM_PROMPT, {
        temperature: 0.8,
        maxTokens: 8192
      });

      if (!response || response.length < 100) {
        return { stageId: 'write', success: false, data: null, error: 'Conteúdo gerado insuficiente.' };
      }

      return {
        stageId: 'write',
        success: true,
        data: {
          chapterIndex,
          prose: response.trim(),
          wordCount: response.trim().split(/\s+/).length
        }
      };
    } catch (err: any) {
      return { stageId: 'write', success: false, data: null, error: err.message };
    }
  }

  // ============================================================
  // ETAPA 11: SINOPSE & COPY DE VENDAS AMAZON
  // ============================================================
  async generateDescription(project: BookProject): Promise<GenerationStepResult> {
    try {
      const ctx = this.buildEditorialContext(project);

      const prompt = `${ctx}

Gere uma copy de vendas profissional e persuasiva para a página do livro na Amazon KDP.

REGRAS:
- Comece com um headline magnético e provocativo.
- Inclua uma seção de identificação com as dores do leitor (2-3 frases).
- Liste 5-7 bullet points de transformação específica.
- Inclua prova social / credibilidade.
- Termine com call-to-action urgente.
- Use formatação com **negrito** para destaques.
- Máximo 4000 caracteres (limite Amazon KDP).

Retorne EXCLUSIVAMENTE um JSON válido:
{
  "headline": "headline magnético (string)",
  "relateSection": "seção de identificação com dores do leitor (string, 2-3 parágrafos)",
  "bulletPoints": ["benefício 1", "benefício 2", "benefício 3", "benefício 4", "benefício 5"],
  "overcomingObjections": "superação de objeções (string, 1-2 parágrafos)",
  "callToAction": "chamada para ação final (string)",
  "fullDescription": "texto completo formatado integrando todos os blocos acima, pronto para colar na Amazon (string)"
}`;

      const response = await this.aiService.generateText(prompt, EDITORIAL_SYSTEM_PROMPT, {
        temperature: 0.75,
        responseFormat: 'json',
        maxTokens: 3000
      });

      const parsed = this.safeParseJson(response);
      if (!parsed) {
        return { stageId: 'description', success: false, data: null, error: 'Falha ao gerar sinopse.' };
      }

      return { stageId: 'description', success: true, data: parsed };
    } catch (err: any) {
      return { stageId: 'description', success: false, data: null, error: err.message };
    }
  }

  // ============================================================
  // APLICAR RESULTADO NO PROJETO
  // ============================================================
  applyResultToProject(project: BookProject, result: GenerationStepResult): BookProject {
    if (!result.success || !result.data) return project;

    const updated = { ...project, updatedAt: Date.now() };
    const stageData = { ...(updated.stageData || {}) };
    const stageStatuses = { ...(updated.stageStatuses || getDefaultStageStatuses()) };

    switch (result.stageId) {
      case 'research':
        stageData.research = result.data;
        stageStatuses.research = 'COMPLETED';
        updated.title = result.data.bookTitle || updated.title;
        updated.author = result.data.authorName || updated.author;
        updated.topic = result.data.topic || updated.topic;
        updated.targetAudience = result.data.targetAudience || updated.targetAudience;
        updated.kdpBookType = result.data.genre || updated.kdpBookType;
        break;

      case 'analytics':
        stageData.analytics = result.data;
        stageStatuses.analytics = 'COMPLETED';
        break;

      case 'book-titles':
        stageData['book-titles'] = result.data;
        stageStatuses['book-titles'] = 'COMPLETED';
        updated.title = result.data.customTitle || updated.title;
        updated.subtitle = result.data.customSubtitle || updated.subtitle;
        break;

      case 'author-persona':
        stageData['author-persona'] = result.data;
        stageStatuses['author-persona'] = 'COMPLETED';
        break;

      case 'purpose':
        stageData.purpose = result.data;
        stageStatuses.purpose = 'COMPLETED';
        break;

      case 'author-bio':
        stageData['author-bio'] = result.data;
        stageStatuses['author-bio'] = 'COMPLETED';
        updated.author = stageData.research?.authorName || updated.author;
        break;

      case 'outline':
        updated.kdpChapters = result.data.kdpChapters;
        stageStatuses.outline = 'COMPLETED';
        break;

      case 'write': {
        const { chapterIndex, prose, wordCount } = result.data;
        const chs = [...(updated.kdpChapters || [])];
        if (chs[chapterIndex]) {
          chs[chapterIndex] = {
            ...chs[chapterIndex],
            prose,
            wordCount,
            status: 'RASCUNHO'
          };
        }
        updated.kdpChapters = chs;
        // Marca 'write' como COMPLETED apenas se todos os capítulos foram escritos
        const allWritten = chs.every(ch => ch.prose && ch.prose.length > 100);
        if (allWritten) stageStatuses.write = 'COMPLETED';
        else stageStatuses.write = 'IN_PROGRESS';
        break;
      }

      case 'description':
        stageData.description = result.data;
        stageStatuses.description = 'COMPLETED';
        updated.description = result.data.fullDescription || updated.description;
        break;
    }

    updated.stageData = stageData;
    updated.stageStatuses = stageStatuses;
    return updated;
  }

  // ============================================================
  // GERAÇÃO ASSISTIDA COMPLETA (etapa por etapa com aprovação)
  // ============================================================
  getAssistedFlowStages(): StageId[] {
    return [
      'research',
      'analytics',
      'book-titles',
      'author-persona',
      'purpose',
      'book-details',
      'author-bio',
      'outline',
      'write',
      'description',
      'book-cover',
      'finish'
    ];
  }

  async generateForStage(project: BookProject, stageId: StageId): Promise<GenerationStepResult> {
    switch (stageId) {
      case 'research':
        return this.generateResearch(project);
      case 'analytics':
        return this.generateAnalytics(project);
      case 'book-titles':
        return this.generateTitles(project);
      case 'author-persona':
        return this.generateAuthorPersona(project);
      case 'purpose':
        return this.generatePurpose(project);
      case 'author-bio':
        return this.generateAuthorBio(project);
      case 'outline':
        return this.generateOutline(project);
      case 'description':
        return this.generateDescription(project);
      default:
        return { stageId, success: true, data: null };
    }
  }

  // ============================================================
  // UTILITÁRIO DE PARSE SEGURO
  // ============================================================
  private safeParseJson(raw: string): any | null {
    if (!raw) return null;
    try {
      // Remove markdown code fences
      let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      // Remove BOM
      if (cleaned.charCodeAt(0) === 0xFEFF) cleaned = cleaned.substring(1);
      return JSON.parse(cleaned);
    } catch {
      // Tenta extrair JSON de dentro do texto
      const match = raw.match(/[\[{][\s\S]*[\]}]/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { /* ignore */ }
      }
      return null;
    }
  }
}
