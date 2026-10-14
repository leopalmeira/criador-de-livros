/**
 * KdpHumanizerEngine - Motor Editorial de Humanização e Eliminação de Clichês de IA
 * 
 * Inspirado nas melhores práticas de escrita autoral, técnicas de Burstiness,
 * variação de ritmo e remoção de padrões robóticos detectáveis de LLMs.
 */

import { chamarGeminiTexto } from './kdp-ai-engine';

export interface HumanizeOptions {
  genre?: string;
  tone?: 'caloroso' | 'enérgico' | 'reflexivo' | 'didatico-descontraido' | 'cinematografico';
  targetAudience?: string;
  intensity?: 'moderada' | 'profunda';
}

export interface HumanizationAuditResult {
  score: number; // 0 a 100 (100 = 100% voz humana autêntica)
  clichesDetectados: string[];
  diagnostico: string;
  recomendacoes: string[];
}

// Lista negra de clichês e vícios robóticos comuns de IA em português
export const AI_CLICHES_BLACKLIST = [
  'no mundo de hoje',
  'no mundo contemporâneo',
  'no mundo agitado',
  'é crucial lembrar',
  'é importante notar',
  'vale a pena ressaltar',
  'em suma',
  'em conclusão',
  'uma tapeçaria de',
  'um testemunho de',
  'mergulhar fundo',
  'embarcar nesta jornada',
  'embarque conosco',
  'um divisor de águas',
  'como vimos anteriormente',
  'neste capítulo exploraremos',
  'sem sombra de dúvidas',
  'crucial para o sucesso',
  'multifacetado',
  'intrínseco',
  'farol de esperança',
  'paisagem em constante mudança'
];

export class KdpHumanizerEngine {
  /**
   * Avalia o índice de naturalidade e detecta clichês robóticos de IA no texto
   */
  static auditText(text: string): HumanizationAuditResult {
    const textLower = text.toLowerCase();
    const clichesEncontrados: string[] = [];

    for (const cliche of AI_CLICHES_BLACKLIST) {
      if (textLower.includes(cliche)) {
        clichesEncontrados.push(cliche);
      }
    }

    // Avalia variação de comprimento de frases (Burstiness)
    const frases = text.split(/[.!?]+/).map(f => f.trim()).filter(Boolean);
    const tamanhos = frases.map(f => f.split(/\s+/).length);
    const media = tamanhos.reduce((a, b) => a + b, 0) / (tamanhos.length || 1);
    
    // Calcula desvio para medir ritmo variado
    const variancia = tamanhos.reduce((acc, t) => acc + Math.pow(t - media, 2), 0) / (tamanhos.length || 1);
    const desvioPadrao = Math.sqrt(variancia);

    let score = 95;
    score -= clichesEncontrados.length * 8;
    if (desvioPadrao < 4) score -= 15; // Frases muito monótonas
    if (score < 30) score = 30;

    const recomendacoes: string[] = [];
    if (clichesEncontrados.length > 0) {
      recomendacoes.push(`Eliminar expressões robotizadas como "${clichesEncontrados.slice(0, 3).join('", "')}".`);
    }
    if (desvioPadrao < 4) {
      recomendacoes.push('Variar o tamanho das frases: intercale frases curtas e diretas com períodos mais elaborados para criar ritmo.');
    }
    recomendacoes.push('Usar situações cotidianas reais, diálogos pontuais e sensações físicas para aproximar o leitor.');

    return {
      score: Math.min(100, Math.max(10, score)),
      clichesDetectados: clichesEncontrados,
      diagnostico: score >= 85
        ? 'Texto com excelente naturalidade, voz autoral viva e livre de padrões robóticos de IA.'
        : score >= 65
        ? 'Texto compreensível, mas com alguns vícios de escrita automática que podem ser humanizados.'
        : 'Texto com forte cadência de IA mecânica; recomendamos a humanização com ritmo dinâmico.',
      recomendacoes
    };
  }

  /**
   * Reescreve e humaniza o texto de um capítulo usando IA especializada em voz autoral
   */
  static async humanizeContent(
    text: string,
    chapterTitle: string,
    options: HumanizeOptions = {}
  ): Promise<string> {
    const { genre = 'Autoajuda & Desenvolvimento', tone = 'caloroso' } = options;

    const systemInstruction = `Você é um Editor Sênior de Bestsellers e Especialista em Humanização Textual (Ghostwriter de Elite).
Sua missão é pegar um texto de livro e transformá-lo em uma PROSA VIVA, MAGNETIZANTE E 100% HUMANA.

DIRETRIZES RÍGIDAS DE HUMANIZAÇÃO:
1. RITMO VARIADO (BURSTINESS):
   - Nunca use frases do mesmo tamanho.
   - Alterne frases curtas e impactantes (ex: "Isso muda tudo.", "Pare por um segundo.") com frases mais ricas e contextuais.
2. ZERO CLICHÊS DE IA:
   - Proibido usar: "No mundo de hoje", "É crucial lembrar", "Em suma", "Uma tapeçaria de", "Embarcar nesta jornada", "Um divisor de águas", "Neste capítulo veremos".
   - Comece direto no ponto ou com uma situação instigante.
3. CONEXÃO GENUÍNA:
   - Escreva como uma pessoa real conversando com outra pessoa inteligente.
   - Use exemplos tangíveis, perguntas retóricas provocativas e metáforas do dia a dia (o café esfriando, o trânsito da segunda-feira, a sensação de tela acesa na madrugada).
4. PRESERVAÇÃO DO CONTEÚDO:
   - Mantenha TODOS os ensinamentos, passos práticos ou acontecimentos do capítulo original.
   - Apenas eleve o estilo, a cadência e a beleza do texto.
5. FORMATAÇÃO:
   - Retorne APENAS o texto humanizado pronto, com parágrafos separados por uma linha em branco. Sem cabeçalhos ou comentários sobre o que você fez.`;

    const prompt = `━━━ CAPÍTULO A HUMANIZAR: "${chapterTitle}" ━━━
Gênero da Obra: ${genre}
Tom desejado: ${tone}

━━━ TEXTO ORIGINAL ━━━
${text}

Reescreva este capítulo com voz 100% humana, envolvente e livre de qualquer padrão de IA:`;

    const res = await chamarGeminiTexto(prompt, {
      systemInstruction,
      temperature: 0.85,
      maxTokens: 4000
    });

    const humanizado = (res.texto || '').trim()
      .replace(/^TEXTO HUMANIZADO:\s*/im, '')
      .replace(/^Aqui está o texto humanizado:\s*/im, '')
      .trim();

    return humanizado || text;
  }
}
