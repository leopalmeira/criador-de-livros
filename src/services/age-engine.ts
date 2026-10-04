// ================================================================
// AGE_VOCABULARY_ENGINE + AGE_APPROPRIATENESS_ENGINE
// Não usa só Flesch: combina tamanho de frase, comprimento/raridade
// de palavras, subordinação, abstração e densidade de conceitos.
// ================================================================

export type AgeBandId = '3-5' | '6-8' | '9-12' | '13-15' | '16-17';

export interface AgeBandProfile {
  id: AgeBandId;
  label: string;
  maxAvgSentenceWords: number;
  maxSentenceWords: number;
  maxAvgWordLength: number;
  maxLongWordRatio: number;      // palavras com >= 9 letras
  maxSubordinationRatio: number; // conectivos subordinativos por frase
  maxAbstractRatio: number;      // termos abstratos / palavras
  maxChapterWords: number;
  guidance: string[];
}

export const AGE_BANDS: Record<AgeBandId, AgeBandProfile> = {
  '3-5': {
    id: '3-5', label: '3–5 anos', maxAvgSentenceWords: 7, maxSentenceWords: 11,
    maxAvgWordLength: 4.6, maxLongWordRatio: 0.03, maxSubordinationRatio: 0.1,
    maxAbstractRatio: 0.01, maxChapterWords: 350,
    guidance: ['Frases de até 7 palavras em média', 'Palavras concretas e do cotidiano', 'Uma ideia por página', 'Repetição lúdica e sons', 'Instruções diretas e curtas'],
  },
  '6-8': {
    id: '6-8', label: '6–8 anos', maxAvgSentenceWords: 11, maxSentenceWords: 18,
    maxAvgWordLength: 5.0, maxLongWordRatio: 0.06, maxSubordinationRatio: 0.25,
    maxAbstractRatio: 0.02, maxChapterWords: 900,
    guidance: ['Frases curtas, no máximo uma subordinada', 'Vocabulário concreto, poucas palavras novas por página', 'Diálogos simples', 'Enredo linear'],
  },
  '9-12': {
    id: '9-12', label: '9–12 anos', maxAvgSentenceWords: 15, maxSentenceWords: 28,
    maxAvgWordLength: 5.5, maxLongWordRatio: 0.11, maxSubordinationRatio: 0.5,
    maxAbstractRatio: 0.04, maxChapterWords: 2200,
    guidance: ['Frases médias', 'Algum vocabulário novo explicado pelo contexto', 'Enredo com subtramas simples', 'Abstração moderada'],
  },
  '13-15': {
    id: '13-15', label: '13–15 anos', maxAvgSentenceWords: 20, maxSentenceWords: 38,
    maxAvgWordLength: 6.0, maxLongWordRatio: 0.16, maxSubordinationRatio: 0.8,
    maxAbstractRatio: 0.07, maxChapterWords: 3500,
    guidance: ['Sintaxe variada', 'Temas complexos tratados com cuidado', 'Personagens com conflito interno'],
  },
  '16-17': {
    id: '16-17', label: '16–17 anos', maxAvgSentenceWords: 24, maxSentenceWords: 48,
    maxAvgWordLength: 6.4, maxLongWordRatio: 0.2, maxSubordinationRatio: 1.1,
    maxAbstractRatio: 0.1, maxChapterWords: 5000,
    guidance: ['Linguagem próxima à adulta, sem conteúdo impróprio', 'Abstração e ambiguidade permitidas'],
  },
};

export const AGE_BAND_IDS = Object.keys(AGE_BANDS) as AgeBandId[];

const SUBORDINATORS = new Set([
  'que', 'porque', 'embora', 'quando', 'enquanto', 'conforme', 'caso', 'se', 'apesar', 'portanto',
  'contudo', 'entretanto', 'todavia', 'sempre', 'assim', 'logo', 'pois', 'como', 'onde', 'cujo', 'cuja', 'quanto',
]);

const ABSTRACT_STEMS = [
  'conceito', 'paradigma', 'metafor', 'existenc', 'ontolog', 'epistem', 'ideolog', 'subjetiv', 'hegemon',
  'dialétic', 'dialetic', 'filosof', 'abstra', 'transcend', 'consequên', 'consequen', 'probabilid', 'hipótese', 'hipotese',
  'ambiguid', 'dilema', 'moralidade', 'ética', 'etica', 'complexidade', 'perspectiva',
];

/** palavras de alta frequência (curtas/comuns) — não contam como difíceis */
const COMMON_LONG_OK = new Set(['brincadeira', 'passarinho', 'aventura', 'amiguinho', 'chocolate', 'borboleta', 'cachorrinho', 'escorregador']);

export interface AgeAnalysis {
  band: AgeBandId;
  words: number;
  sentences: number;
  avgSentenceWords: number;
  longestSentenceWords: number;
  avgWordLength: number;
  longWordRatio: number;
  subordinationRatio: number;
  abstractRatio: number;
  VOCABULARY_DIFFICULTY_SCORE: number; // 0 fácil … 100 muito difícil
  AGE_APPROPRIATENESS_SCORE: number;   // 0..100 (100 = adequado)
  appropriate: boolean;
  issues: string[];
  longSentences: string[];
  difficultWords: string[];
}

const words = (t: string) => (t.match(/[\p{L}\p{N}'’-]+/gu) || []);
const sentences = (t: string) => t.split(/(?<=[.!?…])\s+|\n{2,}/).map(s => s.trim()).filter(s => words(s).length > 0);

export function analyzeAgeAppropriateness(text: string, band: AgeBandId): AgeAnalysis {
  const p = AGE_BANDS[band];
  const w = words(text);
  const s = sentences(text);
  const n = Math.max(1, w.length);
  const ns = Math.max(1, s.length);
  const lens = s.map(x => words(x).length);
  const avgSentence = w.length / ns;
  const longest = lens.length ? Math.max(...lens) : 0;
  const avgWord = w.reduce((a, x) => a + x.length, 0) / n;
  const difficult = Array.from(new Set(w.filter(x => x.length >= 9 && !COMMON_LONG_OK.has(x.toLowerCase())).map(x => x.toLowerCase())));
  const longRatio = w.filter(x => x.length >= 9 && !COMMON_LONG_OK.has(x.toLowerCase())).length / n;
  const subCount = w.filter(x => SUBORDINATORS.has(x.toLowerCase())).length;
  const subRatio = subCount / ns;
  const abstractCount = w.filter(x => ABSTRACT_STEMS.some(st => x.toLowerCase().startsWith(st))).length;
  const abstractRatio = abstractCount / n;

  const ratio = (v: number, max: number) => v / max;
  const pressures = [
    ratio(avgSentence, p.maxAvgSentenceWords),
    ratio(avgWord, p.maxAvgWordLength),
    ratio(longRatio, Math.max(p.maxLongWordRatio, 0.001)),
    ratio(subRatio, p.maxSubordinationRatio),
    ratio(abstractRatio, Math.max(p.maxAbstractRatio, 0.001)),
  ];
  const mean = pressures.reduce((a, b) => a + Math.min(3, b), 0) / pressures.length;
  const vocabScore = Math.round(Math.min(100, (mean / 1.5) * 100));

  const issues: string[] = [];
  if (avgSentence > p.maxAvgSentenceWords) issues.push(`Frase média de ${avgSentence.toFixed(1)} palavras (máx. ${p.maxAvgSentenceWords} para ${p.label}).`);
  if (longest > p.maxSentenceWords) issues.push(`Frase de ${longest} palavras (máx. ${p.maxSentenceWords}).`);
  if (avgWord > p.maxAvgWordLength) issues.push(`Palavras longas demais (média ${avgWord.toFixed(1)} letras).`);
  if (longRatio > p.maxLongWordRatio) issues.push(`${(longRatio * 100).toFixed(1)}% de palavras difíceis (máx. ${(p.maxLongWordRatio * 100).toFixed(0)}%).`);
  if (subRatio > p.maxSubordinationRatio) issues.push(`Subordinação alta (${subRatio.toFixed(2)} por frase).`);
  if (abstractRatio > p.maxAbstractRatio) issues.push('Abstração acima do adequado para a idade.');
  if (w.length > p.maxChapterWords) issues.push(`Texto com ${w.length} palavras excede o limite de ${p.maxChapterWords} para ${p.label}.`);

  const appropriateness = Math.max(0, Math.round(100 - Math.max(0, (mean - 0.8)) * 90 - issues.length * 3));
  return {
    band, words: w.length, sentences: s.length,
    avgSentenceWords: +avgSentence.toFixed(2), longestSentenceWords: longest,
    avgWordLength: +avgWord.toFixed(2), longWordRatio: +longRatio.toFixed(3),
    subordinationRatio: +subRatio.toFixed(2), abstractRatio: +abstractRatio.toFixed(3),
    VOCABULARY_DIFFICULTY_SCORE: vocabScore,
    AGE_APPROPRIATENESS_SCORE: Math.min(100, appropriateness),
    appropriate: issues.length === 0 && appropriateness >= 70,
    issues,
    longSentences: s.filter(x => words(x).length > p.maxSentenceWords).slice(0, 5),
    difficultWords: difficult.slice(0, 15),
  };
}

/** Diretiva injetada no prompt de geração — a idade controla de fato a escrita. */
export function buildAgeDirective(band: AgeBandId | null): string {
  if (!band) return '';
  const p = AGE_BANDS[band];
  return `FAIXA ETÁRIA OBRIGATÓRIA: ${p.label}.
- Frase média máxima: ${p.maxAvgSentenceWords} palavras; nenhuma frase acima de ${p.maxSentenceWords}.
- Palavra média até ${p.maxAvgWordLength} letras; evite termos difíceis e abstratos.
- Capítulo com no máximo ${p.maxChapterWords} palavras.
${p.guidance.map(g => `- ${g}`).join('\n')}`;
}

export function buildAgeRevisionPrompt(text: string, a: AgeAnalysis): string {
  return `Reescreva o texto abaixo para a faixa ${AGE_BANDS[a.band].label}, mantendo fatos, personagens e eventos IDÊNTICOS.
Problemas detectados:\n${a.issues.map(i => `- ${i}`).join('\n')}
${buildAgeDirective(a.band)}
Retorne apenas o texto reescrito.

TEXTO:
${text}`;
}

/** Faixa etária é obrigatória para livros infantis. */
export function validateAgeRequirement(isChildrenBook: boolean, band: AgeBandId | null): { ok: boolean; reason?: string } {
  if (isChildrenBook && !band) return { ok: false, reason: 'Livros infantis exigem faixa etária definida.' };
  if (band && !AGE_BANDS[band]) return { ok: false, reason: 'Faixa etária inválida.' };
  return { ok: true };
}

/**
 * Loop de revisão automática: analisa, pede revisão à IA, audita novamente.
 * `rewrite` é injetado (Gemini em produção; fake nos testes).
 */
export async function enforceAgeAppropriateness(
  text: string, band: AgeBandId,
  rewrite: (prompt: string) => Promise<string>, maxRounds = 3,
): Promise<{ text: string; analysis: AgeAnalysis; rounds: number }> {
  let current = text;
  let analysis = analyzeAgeAppropriateness(current, band);
  let rounds = 0;
  while (!analysis.appropriate && rounds < maxRounds) {
    current = (await rewrite(buildAgeRevisionPrompt(current, analysis))) || current;
    analysis = analyzeAgeAppropriateness(current, band);
    rounds++;
  }
  return { text: current, analysis, rounds };
}
