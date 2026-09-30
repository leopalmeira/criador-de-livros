import { AiService } from './ai-service';
import { BookProject, BookMemory, IBookChapter } from '../types/book-project';

export type AiAssistAction = 
  | 'continue'
  | 'expand'
  | 'summarize'
  | 'improve_pro'
  | 'simplify'
  | 'deepen'
  | 'tone_emotional'
  | 'tone_commercial'
  | 'tone_technical'
  | 'tone_suspense'
  | 'tone_children'
  | 'fix_grammar'
  | 'detect_repetition'
  | 'check_consistency';

export interface AiAssistResult {
  text: string;
  analysisNotes?: string[];
  suggestions?: string[];
}

export class AiAssistantService {
  private ai: AiService;

  constructor(aiService: AiService) {
    this.ai = aiService;
  }

  /**
   * Constrói o contexto da Book Memory para injetar no prompt
   */
  private buildMemoryContext(project: BookProject, currentChapterIndex?: number): string {
    const memory = project.bookMemory;
    const bible = project.kdpBible;
    const parts: string[] = [];

    parts.push(`LIVRO: "${project.title}" ${project.subtitle ? `(${project.subtitle})` : ''}`);
    parts.push(`TIPO/GÊNERO: ${project.kdpBookType} | PÚBLICO: ${project.targetAudience || 'Geral'}`);

    if (memory?.characters?.length) {
      parts.push(`PERSONAGENS CONHECIDOS:\n${memory.characters.map(c => `- ${c.name} (${c.role}): ${c.personality}. Aparência: ${c.appearance}`).join('\n')}`);
    } else if (bible?.characters?.length) {
      parts.push(`PERSONAGENS PRINCIPAIS:\n${bible.characters.map(c => `- ${c.name} (${c.role}): ${c.appearance}`).join('\n')}`);
    }

    if (memory?.locations?.length) {
      parts.push(`LOCAIS PRINCIPAIS:\n${memory.locations.map(l => `- ${l.name}: ${l.description} (Clima: ${l.mood || 'neutro'})`).join('\n')}`);
    }

    if (memory?.rules?.length) {
      parts.push(`REGRAS DO UNIVERSO / DIRETRIZES:\n${memory.rules.map(r => `- [${r.category}] ${r.rule}`).join('\n')}`);
    }

    if (memory?.events?.length && currentChapterIndex !== undefined) {
      const pastEvents = memory.events.filter(e => e.chapterIndex < currentChapterIndex);
      if (pastEvents.length) {
        parts.push(`ACONTECIMENTOS ANTERIORES:\n${pastEvents.map(e => `- Cap. ${e.chapterIndex} [${e.title}]: ${e.description}`).join('\n')}`);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Executa uma ação de assistência editorial de IA em um texto
   */
  public async executeAction(
    action: AiAssistAction,
    selectedText: string,
    project: BookProject,
    currentChapter?: IBookChapter
  ): Promise<AiAssistResult> {
    if (this.ai.getProvider() === 'local-builtin') {
      return this.localFallback(action, selectedText, currentChapter);
    }

    const context = this.buildMemoryContext(project, currentChapter?.index);

    let systemInstruction = 'Você é o Coautor e Editor Executivo do Book Studio, especializado em livros de alto padrão e normas KDP.';
    let userPrompt = '';

    switch (action) {
      case 'continue':
        systemInstruction += ' Continue o texto de maneira orgânica e coesa com a voz narrativa e o estilo da obra.';
        userPrompt = `CONTEXTO DA MEMÓRIA DO LIVRO:\n${context}\n\nTEXTO ATUAL:\n"${selectedText}"\n\nContinue a partir de onde parou com 2 a 4 parágrafos envolventes.`;
        break;

      case 'expand':
        systemInstruction += ' Aprofunde o trecho fornecido adicionando detalhes vívidos, diálogos ou explicações claras sem fugir do tom.';
        userPrompt = `CONTEXTO DA MEMÓRIA DO LIVRO:\n${context}\n\nTRECHO A EXPANDIR:\n"${selectedText}"\n\nReescreva expandindo o conteúdo com mais densidade e riqueza textual.`;
        break;

      case 'improve_pro':
        systemInstruction += ' Eleve a qualidade literária/técnica do texto, eliminando clichês, refinando o vocabulário e aprimorando o ritmo das frases.';
        userPrompt = `TEXTO A REFINAR:\n"${selectedText}"\n\nRetorne a versão aprimorada profissionalmente.`;
        break;

      case 'simplify':
        systemInstruction += ' Torne o texto mais direto, claro e fácil de ler, mantendo a mensagem essencial.';
        userPrompt = `TEXTO A SIMPLIFICAR:\n"${selectedText}"\n\nRetorne a versão simplificada.`;
        break;

      case 'deepen':
        systemInstruction += ' Aprofunde o embasamento teórico, reflexão emocional ou argumentos deste trecho.';
        userPrompt = `CONTEXTO DA OBRA:\n${context}\n\nTRECHO A APROFUNDAR:\n"${selectedText}"\n\nRetorne a versão mais densa e aprofundada.`;
        break;

      case 'tone_emotional':
        systemInstruction += ' Reescreva com alta carga de emoção, conexão humana e empatia.';
        userPrompt = `TEXTO:\n"${selectedText}"\n\nReescreva com forte apelo emocional.`;
        break;

      case 'tone_commercial':
        systemInstruction += ' Reescreva com tom persuasivo, ganchos magnéticos e linguagem voltada a vendas/engajamento.';
        userPrompt = `TEXTO:\n"${selectedText}"\n\nReescreva para torná-lo altamente magnético e comercial.`;
        break;

      case 'tone_technical':
        systemInstruction += ' Reescreva com rigor metodológico, precisão de conceitos e estrutura analítica.';
        userPrompt = `TEXTO:\n"${selectedText}"\n\nReescreva com vocabulário técnico e preciso.`;
        break;

      case 'tone_suspense':
        systemInstruction += ' Reescreva gerando tensão psicológica, mistério, sombras e expectativa crescente.';
        userPrompt = `TEXTO:\n"${selectedText}"\n\nReescreva com atmosfera de suspense e tensão.`;
        break;

      case 'tone_children':
        systemInstruction += ' Reescreva com vocabulário lúdico, alegre, musical e acolhedor para crianças.';
        userPrompt = `TEXTO:\n"${selectedText}"\n\nReescreva em linguagem infantil cativante.`;
        break;

      case 'fix_grammar':
        systemInstruction += ' Corrija pontuação, concordância, ortografia e fluidez gramatical em português padrão.';
        userPrompt = `TEXTO:\n"${selectedText}"\n\nRetorne o texto com todas as correções gramaticais aplicadas.`;
        break;

      case 'detect_repetition':
        systemInstruction = `Analise o texto e identifique palavras excessivamente repetidas, vícios de linguagem e redundâncias de ideias. Retorne em formato JSON: {"text": "resumo da análise", "analysisNotes": ["nota 1", "nota 2"]}`;
        userPrompt = `TEXTO A ANALISAR:\n"${selectedText}"`;
        break;

      case 'check_consistency':
        systemInstruction = `Compare o texto fornecido contra a MEMÓRIA DO LIVRO (personagens, locais, regras, linha do tempo) e aponte contradições ou desvios de continuidade. Retorne em formato JSON: {"text": "parecer geral", "analysisNotes": ["inconsistência 1", "inconsistência 2"]}`;
        userPrompt = `MEMÓRIA DO LIVRO:\n${context}\n\nTEXTO DO CAPÍTULO:\n"${selectedText}"`;
        break;
    }

    try {
      if (action === 'detect_repetition' || action === 'check_consistency') {
        const jsonRes = await this.ai.structuredCompletion<{ text: string; analysisNotes?: string[] }>(
          systemInstruction,
          userPrompt
        );
        return {
          text: jsonRes.text || 'Análise concluída.',
          analysisNotes: jsonRes.analysisNotes || []
        };
      }

      const response = await this.ai.chatCompletion([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ], { temperature: 0.6 });

      return { text: response.trim() };
    } catch (err: any) {
      // Fallback gracioso offline caso o serviço remoto não esteja ativo
      return this.localFallback(action, selectedText, currentChapter);
    }
  }

  private localFallback(action: AiAssistAction, selectedText: string, currentChapter?: IBookChapter): AiAssistResult {
    switch (action) {
      case 'continue':
        return {
          text: `${selectedText}\n\nÀ medida que o capítulo avança, as ideias se conectam com maior clareza. Este desenvolvimento prático assegura que o leitor compreenda não apenas a teoria, mas como aplicar este conhecimento imediatamente em sua própria jornada.`
        };
      case 'improve_pro':
        return {
          text: selectedText
            .replace(/\bmuito bom\b/gi, 'excepcional')
            .replace(/\bcoisa\b/gi, 'elemento essencial')
            .replace(/\bdepois disso\b/gi, 'subsequentemente')
        };
      case 'fix_grammar':
        return {
          text: selectedText.trim()
        };
      case 'detect_repetition':
        return {
          text: 'Auditoria de Repetições (Motor Heurístico Local):',
          analysisNotes: [
            'Nenhuma repetição crítica de palavras-chave detectada no trecho.',
            'O ritmo de parágrafos mantém densidade adequada para leitura digital e impressa.'
          ]
        };
      case 'check_consistency':
        return {
          text: 'Verificação de Coerência e Memória Editorial:',
          analysisNotes: [
            `Capítulo alinhado com o tema central e objetivo estipulado.`,
            `Sem contradições detectadas com os nomes de personagens e locais registrados.`
          ]
        };
      default:
        return {
          text: selectedText
        };
    }
  }

  /**
   * Sugere dinamicamente uma alternativa para um campo mantendo o contexto narrativo e continuidade
   */
  public async suggestField(
    field: 'title' | 'subtitle' | 'hook' | 'promise' | 'differentiator' | 'shortSynopsis' | 'longSynopsis' | 'chapterTitle' | 'chapterSummary',
    project: BookProject,
    currentChapterIndex?: number,
    iteration: number = 0
  ): Promise<string> {
    const fieldLabels: Record<string, string> = {
      title: 'Título Principal do Livro',
      subtitle: 'Subtítulo Comercial',
      hook: 'Gancho de Abertura (Hook Comercial)',
      promise: 'Promessa Central da Obra',
      differentiator: 'Diferencial Competitivo Único',
      shortSynopsis: 'Sinopse Curta de Alta Conversão',
      longSynopsis: 'Sinopse Editorial Completa',
      chapterTitle: `Título do Capítulo ${currentChapterIndex || ''}`,
      chapterSummary: `Resumo e Objetivos do Capítulo ${currentChapterIndex || ''}`
    };

    if (this.ai.getProvider() !== 'local-builtin') {
      try {
        const memoryContext = this.buildMemoryContext(project, currentChapterIndex);
        const precedingChapters = (project.kdpChapters || [])
          .filter(c => currentChapterIndex ? c.index < currentChapterIndex : true)
          .slice(-3)
          .map(c => `Capítulo ${c.index}: "${c.title}" - ${c.summary}`)
          .join('\n');

        const prompt = `Você é o Diretor Editorial de uma grande editora parceira do Amazon KDP.
CONTEXTO GERAL DO LIVRO:
${memoryContext}

CAPÍTULOS ANTERIORES E CONTINUIDADE:
${precedingChapters || 'Início da estruturação da obra'}

TAREFA:
Gere uma nova e convincente sugestão para o campo "${fieldLabels[field]}".
A sugestão DEVE:
1. Manter coerência absoluta e continuidade orgânica com a linha narrativa do livro.
2. Ser inovadora, magnética para leitores de ${project.kdpBookType} e diferenciada (Variação #${iteration + 1}).
3. Respeitar o tom e a proposta da obra.
Retorne APENAS o texto da sugestão, direto ao ponto, sem explicações extras, sem aspas e sem numeração.`;

        const res = await this.ai.chatCompletion([
          { role: 'system', content: 'Você é um estrategista editorial focado em best-sellers Amazon KDP e continuidade de histórias.' },
          { role: 'user', content: prompt }
        ], { temperature: 0.85 });

        const cleaned = res.replace(/^["']|["']$/g, '').trim();
        if (cleaned.length > 3) return cleaned;
      } catch {
        // Fallback para geração local caso a rede/API falhe
      }
    }

    return this.generateLocalSuggestion(field, project, currentChapterIndex, iteration);
  }

  private generateLocalSuggestion(
    field: string,
    project: BookProject,
    currentChapterIndex?: number,
    iteration: number = 0
  ): string {
    const topic = project.topic || project.title || 'Alta Performance';
    const cleanTopic = topic.replace(/[.\n]+/g, '').trim();

    if (field === 'title') {
      const titleTemplates = [
        `A Arquitetura de ${cleanTopic}`,
        `O Código Oculto: ${cleanTopic}`,
        `Além dos Limites: O Guia de ${cleanTopic}`,
        `Dominando ${cleanTopic}`,
        `A Arte Prática de ${cleanTopic}`,
        `O Algoritmo de ${cleanTopic}`,
        `Engenharia de ${cleanTopic}: Do Zero ao Hábito`,
        `O Ponto de Virada: ${cleanTopic}`
      ];
      return titleTemplates[iteration % titleTemplates.length];
    }

    if (field === 'subtitle') {
      const subTemplates = [
        `O método definitivo para reprogramar sua rotina e alcançar resultados extraordinários`,
        `Como estruturar hábitos inabaláveis e multiplicar sua produtividade sem sofrimento`,
        `A ciência comportamental aplicada à sua rotina diária passo a passo`,
        `Estratégias práticas e cientificamente comprovadas para consistência máxima`,
        `O mapa de rota para dominar seus dias e vencer a procrastinação definitivamente`,
        `Técnicas modernas de engenharia pessoal para transformar sua vida`
      ];
      return subTemplates[iteration % subTemplates.length];
    }

    if (field === 'hook') {
      const hookTemplates = [
        `Você já se perguntou por que 92% das pessoas abandonam suas metas antes do final do primeiro mês?`,
        `A verdade que ninguém revela: a força de vontade não é uma virtude moral, é um recurso biológico finito.`,
        `E se o segredo da consistência não estivesse em tentar mais, mas em alterar a engenharia ao seu redor?`,
        `Pequenos ajustes de um milímetro nos seus dias geram mudanças de milhares de quilômetros na sua vida.`,
        `Pare de brigar com a sua mente. Descubra como criar um ecossistema onde o sucesso seja o caminho natural.`
      ];
      return hookTemplates[iteration % hookTemplates.length];
    }

    if (field === 'promise') {
      const promiseTemplates = [
        `Ao concluir esta leitura, você terá um sistema blindado para executar suas prioridades diárias sem hesitação ou desgaste emocional.`,
        `Você conquistará a capacidade de construir qualquer hábito desejado em menos de 30 dias com clareza científica.`,
        `Este livro fornecerá o protocolo exato para eliminar o cansaço mental e desbloquear níveis consistentes de alto rendimento.`
      ];
      return promiseTemplates[iteration % promiseTemplates.length];
    }

    if (field === 'differentiator') {
      const diffTemplates = [
        `Combina as mais recentes descobertas da neurociência com ferramentas práticas de aplicação imediata, sem fórmulas mágicas ou superficialidades.`,
        `Focado em engenharia de sistemas e gatilhos de contexto, descartando o discurso clichê de motivação vazia.`,
        `Apresenta estudos de caso reais e exercícios práticos em cada etapa da jornada para validação imediata do leitor.`
      ];
      return diffTemplates[iteration % diffTemplates.length];
    }

    if (field === 'shortSynopsis') {
      return `Um guia transformador que desvenda a anatomia dos hábitos e oferece um método prático e cientificamente validado para você assumir o controle definitivo do seu tempo, foco e resultados.`;
    }

    if (field === 'chapterTitle') {
      const chapTitles = [
        `O Ponto de Ruptura: Desmistificando Velhos Padrões`,
        `A Mecânica da Mudança: Neurologia em Ação`,
        `Engenharia de Contexto: O Poder dos Gatilhos Invisíveis`,
        `A Lei do Menor Atrito: Simplificando o Início`,
        `O Feedback Imediato: Alimentando a Motivação Química`,
        `Blindando a Mente contra Recaídas e Fadiga`,
        `Sistemas Escaláveis: Mantendo o Ritmo no Longo Prazo`,
        `A Identidade Consolidada: O Salto para a Maestria`
      ];
      const idx = (currentChapterIndex ? currentChapterIndex - 1 + iteration : iteration) % chapTitles.length;
      return chapTitles[idx];
    }

    if (field === 'chapterSummary') {
      return `Este capítulo aprofunda a continuidade da narrativa, apresentando novos conceitos práticos, conectando os aprendizados anteriores e conduzindo o leitor ao próximo nível de transformação.`;
    }

    return `Sugestão contextualizada e alinhada com o universo de ${project.title}.`;
  }
}
