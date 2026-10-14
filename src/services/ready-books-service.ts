// ================================================================
// SERVIÇO CENTRAL DE LIVROS PRONTOS E REVISÃO GLOBAL DO COAUTHOR
// Integra a base de livros escritos (IndexedDB / Projetos / Finais)
// ao CoAuthor e CoAuthor Assistant para revisão e enriquecimento.
// ================================================================

import { db } from '../database/local-database';
import type { FinalBookRecord } from '../types/editorial-correction';
import type { BookProject } from '../types/book-project';
import { chamarGeminiTexto } from './kdp-ai-engine';
import { cleanChapterTitle } from './kdp-editorial-review';

export type CoAuthorBookCategory = 'tecnico' | 'autoajuda' | 'pratico' | 'ficcao';

export interface ReadyBookChapter {
  titulo: string;
  texto: string;
  imagemDataUrl?: string | null;
}

export interface ReadyBookRecord {
  id: string;
  source: 'final_book' | 'project';
  title: string;
  subtitle: string;
  author: string;
  genre: string;
  tipoLivro: CoAuthorBookCategory;
  chaptersCount: number;
  totalWords: number;
  coverDataUrl?: string;
  updatedAt: number;
  capitulos: ReadyBookChapter[];
  meta: {
    palavrasPorCap: number;
    paginasAlvo: number;
  };
}

export interface ChapterEnrichmentProposal {
  chapterNumber: number;
  chapterTitle: string;
  originalWordCount: number;
  rationale: string;
  additionText: string;
  applied?: boolean;
}

export interface GlobalReviewResult {
  bookTitle: string;
  tipoLivro: CoAuthorBookCategory;
  summary: string;
  strengths: string[];
  editorialGaps: string[];
  chaptersReview: ChapterEnrichmentProposal[];
}

/**
 * Converte um texto contínuo de manuscrito em lista de capítulos
 */
function parseManuscriptTextToChapters(text: string, defaultTitle = 'Capítulo'): ReadyBookChapter[] {
  if (!text || !text.trim()) return [];

  // Padrão 1: === CAPÍTULO X: Título ===
  const separatorRegex = /===\s*(?:CAPÍTULO|CHAPTER|PARTE)\s*(\d+)?\s*(?::|-)?\s*([^=]*)\s*===/gi;
  const parts: ReadyBookChapter[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let currentTitle = `${defaultTitle} 1`;

  const matches: Array<{ title: string; index: number; endIndex: number }> = [];

  while ((match = separatorRegex.exec(text)) !== null) {
    const num = match[1] || `${matches.length + 1}`;
    const restTitle = match[2]?.trim() || '';
    const fullTitle = restTitle ? `Capítulo ${num}: ${restTitle}` : `Capítulo ${num}`;
    matches.push({
      title: fullTitle,
      index: match.index,
      endIndex: separatorRegex.lastIndex
    });
  }

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].endIndex;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const chapterBody = text.slice(start, end).trim();
      parts.push({
        titulo: matches[i].title,
        texto: chapterBody
      });
    }
    return parts;
  }

  // Padrão 2: Divisão por linhas duplas de "Capítulo X"
  const capLines = text.split(/\n(?=(?:Capítulo|CAPÍTULO)\s+\d+)/g);
  if (capLines.length > 1) {
    return capLines.map((chunk, idx) => {
      const firstLineEnd = chunk.indexOf('\n');
      const header = firstLineEnd !== -1 ? chunk.slice(0, firstLineEnd).trim() : `Capítulo ${idx + 1}`;
      const body = firstLineEnd !== -1 ? chunk.slice(firstLineEnd).trim() : chunk.trim();
      return {
        titulo: header.replace(/^#+\s*/, '') || `Capítulo ${idx + 1}`,
        texto: body
      };
    });
  }

  // Fallback: Manuscrito como capítulo único
  return [{
    titulo: 'Capítulo 1: Manuscrito Completo',
    texto: text.trim()
  }];
}

/**
 * Dedução precisa do tipo de livro com base no gênero e título
 */
export function inferCoAuthorBookType(genre = '', title = '', topic = ''): CoAuthorBookCategory {
  const combined = `${genre} ${title} ${topic}`.toLowerCase();

  // 1. Técnico / Programação / Ciência / Negócios analíticos
  if (
    /tecnic|técnic|program|python|ia\b|inteligência artificial|dados|software|código|engenhar|arquitet|finanç|invest|cripto|business|negócios|manual|tutorial|guia técnico/i.test(combined)
  ) {
    return 'tecnico';
  }

  // 2. Autoajuda / Desenvolvimento Pessoal / Mentalidade / Hábitos
  if (
    /autoajuda|auto-ajuda|desenvolvimento pessoal|hábito|mindset|foco|produtiv|disciplina|ansiedade|espiritual|medita|propósito|autoestima|inteligência emocional/i.test(combined)
  ) {
    return 'autoajuda';
  }

  // 3. Guia Prático / Passo a Passo / How-to
  if (
    /guia prático|how-to|passo a passo|método|receit|culinária|rotina|guia definitivo|como fazer|prático|pratica/i.test(combined)
  ) {
    return 'pratico';
  }

  // 4. Ficção / Narrativa / Romance / Thriller
  return 'ficcao';
}

/**
 * Busca e unifica todos os livros já escritos/prontos na base de dados
 */
export async function fetchAllReadyBooks(): Promise<ReadyBookRecord[]> {
  const readyBooks: ReadyBookRecord[] = [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();

  try {
    // 1. Carrega livros finalizados e auditados (FinalBookRecord)
    const finalBooks: FinalBookRecord[] = await db.getAllFinalBooks().catch(() => []);

    for (const fb of finalBooks) {
      if (!fb.title || fb.title.trim().length === 0) continue;

      let caps: ReadyBookChapter[] = [];
      if (Array.isArray(fb.chapters) && fb.chapters.length > 0) {
        caps = fb.chapters.map(c => ({
          titulo: c.titulo || 'Capítulo',
          texto: c.texto || ''
        }));
      } else if (fb.manuscriptText && fb.manuscriptText.trim().length > 0) {
        caps = parseManuscriptTextToChapters(fb.manuscriptText, 'Capítulo');
      }

      if (caps.length === 0) continue;

      const totalWords = caps.reduce((acc, c) => acc + (c.texto.split(/\s+/).filter(Boolean).length || 0), 0);
      const normTitle = fb.title.trim().toLowerCase();

      seenIds.add(fb.id);
      seenTitles.add(normTitle);

      readyBooks.push({
        id: fb.id,
        source: 'final_book',
        title: fb.title,
        subtitle: fb.subtitle || '',
        author: fb.author || 'Autor Book Engin',
        genre: fb.genre || 'Geral',
        tipoLivro: inferCoAuthorBookType(fb.genre, fb.title),
        chaptersCount: caps.length,
        totalWords,
        coverDataUrl: fb.coverDataUrl || undefined,
        updatedAt: fb.finalizedAt || Date.now(),
        capitulos: caps,
        meta: {
          palavrasPorCap: Math.round(totalWords / caps.length) || 1200,
          paginasAlvo: fb.pageCount || Math.max(24, Math.round(totalWords / 250))
        }
      });
    }

    // 2. Carrega projetos salvos no IndexedDB (BookProject)
    const projects: BookProject[] = await db.getAllBookProjects().catch(() => []);

    for (const proj of projects) {
      if (!proj.title || proj.title.trim().length === 0) continue;
      const normTitle = proj.title.trim().toLowerCase();

      // Se já temos a versão final desse livro, pula para não duplicar
      if (seenIds.has(proj.id) || seenTitles.has(normTitle)) continue;

      let caps: ReadyBookChapter[] = [];
      if (Array.isArray(proj.kdpChapters) && proj.kdpChapters.length > 0) {
        caps = proj.kdpChapters
          .filter(c => Boolean((c.prose && c.prose.trim().length > 0) || c.title))
          .map(c => ({
            titulo: c.title || `Capítulo ${c.index}`,
            texto: c.prose || c.summary || '',
            imagemDataUrl: c.illustrations?.[0] || null
          }));
      }

      // Se não tem capítulos com texto, pula rascunhos sem conteúdo
      if (caps.length === 0 || caps.every(c => c.texto.trim().length < 50)) continue;

      const totalWords = caps.reduce((acc, c) => acc + (c.texto.split(/\s+/).filter(Boolean).length || 0), 0);

      seenIds.add(proj.id);
      seenTitles.add(normTitle);

      readyBooks.push({
        id: proj.id,
        source: 'project',
        title: proj.title,
        subtitle: proj.subtitle || '',
        author: proj.author || 'Autor Book Engin',
        genre: proj.categories?.[0] || proj.topic || 'Não Ficção',
        tipoLivro: inferCoAuthorBookType(proj.categories?.[0] || proj.topic, proj.title, proj.topic),
        chaptersCount: caps.length,
        totalWords,
        coverDataUrl: proj.coverImageUrl || undefined,
        updatedAt: proj.updatedAt || proj.createdAt || Date.now(),
        capitulos: caps,
        meta: {
          palavrasPorCap: Math.round(totalWords / caps.length) || 1200,
          paginasAlvo: proj.estimatedPages || Math.max(24, Math.round(totalWords / 250))
        }
      });
    }
  } catch (err) {
    console.warn('[ReadyBooksService] Erro ao carregar livros prontos:', err);
  }

  // Ordena pelos mais recentes primeiro
  return readyBooks.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Constrói o contexto resumido de todos os capítulos para a IA
 */
export function buildBookFullContext(book: ReadyBookRecord): string {
  const capsText = book.capitulos.map((c, i) => {
    const totalWords = c.texto.split(/\s+/).filter(Boolean).length;
    const cleanTitle = cleanChapterTitle(c.titulo || `Capítulo ${i + 1}`);
    const trechoInicio = c.texto.slice(0, 1400).replace(/\n+/g, ' ');
    const trechoFim = c.texto.length > 2000 ? ' ... [Final]: ' + c.texto.slice(-800).replace(/\n+/g, ' ') : '';
    return `[CAPÍTULO ${i + 1}: "${cleanTitle}" | ${totalWords} palavras]\nConteúdo:\n"${trechoInicio}${trechoFim}"`;
  }).join('\n\n');

  return `OBRA: "${book.title}"\nSUBTÍTULO: "${book.subtitle}"\nAUTOR: "${book.author}"\nGÊNERO: "${book.genre}"\nTIPO DE LIVRO: ${book.tipoLivro.toUpperCase()}\nTOTAL DE CAPÍTULOS: ${book.capitulos.length}\nTOTAL DE PALAVRAS: ${book.totalWords}\n\n=== CAPÍTULOS DO LIVRO ===\n${capsText}`;
}

/**
 * REVISÃO GLOBAL DE TODA A OBRA DE UMA VEZ COM O COAUTHOR
 */
export async function reviewFullBookWithCoAuthor(
  book: ReadyBookRecord,
  onStatusUpdate?: (status: string) => void
): Promise<GlobalReviewResult> {
  onStatusUpdate?.('Lendo e mapeando todos os capítulos do livro...');

  const bookContext = buildBookFullContext(book);
  const isTechnicalOrPractical = book.tipoLivro === 'tecnico' || book.tipoLivro === 'pratico' || book.tipoLivro === 'autoajuda';

  const systemInstruction = `Você é um Co-Autor Sênior experiente e parceiro humano de escrita.
Você está analisando a obra inteira de uma só vez:
${bookContext}

SUA MISSÃO NA REVISÃO GLOBAL:
${
  isTechnicalOrPractical
    ? `DIRETRIZ PARA LIVRO TÉCNICO / NÃO-FICÇÃO:
- Analise a solidez do conteúdo: clareza do método, aplicabilidade prática, densidade de valor real e didática.
- Identifique lacunas conceituais: onde faltam exemplos reais, passos práticos, dados concretos, analogias ou checklists.
- Elimine enrolação (anti-fluff): certifique-se de que cada capítulo entrega uma solução prática imediata para o leitor.
- NÃO trate como ficção. Não invente personagens nem metáforas dramáticas.`
    : `DIRETRIZ PARA FICÇÃO / NARRATIVA:
- Analise a continuidade narrativa entre todos os capítulos, evolução do enredo e ritmo das cenas.
- Identifique onde a história precisa de mais imersão: ambientação sensorial (visão, sons, clima), tensão dramática, profundidade emocional e diálogos vivos.
- Garanta que o clímax e o fechamento do livro amarrem as pontas soltas sem resoluções apressadas.`
}

REGRAS CONVERSACIONAIS INEGOCIÁVEIS:
1. NUNCA use clichês de IA (ex: "Olá, sou seu assistente de IA", "Como posso ajudar você hoje?", "Com certeza! Como seu coautor").
2. Fale de forma direta, madura, construtiva e perspicaz, como um colega escritor ou editor sentado na mesma mesa.
3. Se um capítulo já estiver excelente, ateste isso com franqueza. Só formule acréscimos onde houver benefício real para o livro.

RETORNO ESTRUTURADO OBRIGATÓRIO:
Para os capítulos que precisam de melhoria ou enriquecimento, inclua o bloco no formato exato:
<<<SUGESTAO_OBRA_COMPLETA>>>
RESUMO: [Visão editorial global da obra em 2 a 3 parágrafos diretos e lúcidos]
PONTOS_FORTES: [Ponto 1] | [Ponto 2] | [Ponto 3]
LACUNAS_IDENTIFICADAS: [Lacuna 1] | [Lacuna 2]
---
CAPITULO: 1
TITULO: [Título do Capítulo 1]
JUSTIFICATIVA: [Por que esse trecho enriquece o capítulo]
TEXTO:
[Texto pronto e detalhado a ser acrescentado ou integrado ao capítulo]
---
CAPITULO: 2
TITULO: [Título do Capítulo 2]
JUSTIFICATIVA: [Justificativa]
TEXTO:
[Texto pronto a ser acrescentado]
<<<FIM_OBRA_COMPLETA>>>`;

  const prompt = `Faça uma revisão editorial global de toda a obra "${book.title}".
Analise a coerência entre os capítulos, identifique onde podemos aprofundar e formule propostas de enriquecimento prontas para os capítulos que se beneficiarão de mais conteúdo e detalhes.`;

  onStatusUpdate?.('CoAuthor formulando o plano editorial de revisão para todos os capítulos...');

  const response = await chamarGeminiTexto(prompt, {
    systemInstruction,
    temperature: 0.75,
    maxTokens: 5000,
    onStatusUpdate
  });

  const rawText = response.texto || '';

  // Parser do retorno estruturado
  const matchBlock = rawText.match(/<<<SUGESTAO_OBRA_COMPLETA>>>([\s\S]*?)<<<FIM_OBRA_COMPLETA>>>/);
  const blockContent = matchBlock ? matchBlock[1] : rawText;

  const resumoMatch = blockContent.match(/RESUMO:\s*([\s\S]*?)(?=PONTOS_FORTES:|$)/i);
  const fortesMatch = blockContent.match(/PONTOS_FORTES:\s*([\s\S]*?)(?=LACUNAS_IDENTIFICADAS:|$)/i);
  const lacunasMatch = blockContent.match(/LACUNAS_IDENTIFICADAS:\s*([\s\S]*?)(?=---|CAPITULO:|$)/i);

  const summary = resumoMatch ? resumoMatch[1].trim() : rawText.split('---')[0].trim();
  const strengths = fortesMatch ? fortesMatch[1].split('|').map(s => s.trim()).filter(Boolean) : ['Estrutura básica bem definida', 'Tema com forte apelo comercial'];
  const editorialGaps = lacunasMatch ? lacunasMatch[1].split('|').map(s => s.trim()).filter(Boolean) : ['Possibilidade de maior aprofundamento e densidade'];

  const chaptersReview: ChapterEnrichmentProposal[] = [];
  const chapterChunks = blockContent.split(/---\s*(?=CAPITULO:)/i);

  for (const chunk of chapterChunks) {
    const capNumMatch = chunk.match(/CAPITULO:\s*(\d+)/i);
    if (!capNumMatch) continue;

    const capNum = parseInt(capNumMatch[1], 10);
    const titMatch = chunk.match(/TITULO:\s*([^\n\r]+)/i);
    const justMatch = chunk.match(/JUSTIFICATIVA:\s*([\s\S]*?)(?=TEXTO:|$)/i);
    const textMatch = chunk.match(/TEXTO:\s*([\s\S]*)/i);

    const origCap = book.capitulos[capNum - 1];
    const origWords = origCap ? origCap.texto.split(/\s+/).filter(Boolean).length : 0;
    const addition = textMatch ? textMatch[1].trim() : '';

    if (addition) {
      chaptersReview.push({
        chapterNumber: capNum,
        chapterTitle: titMatch ? titMatch[1].trim() : origCap?.titulo || `Capítulo ${capNum}`,
        originalWordCount: origWords,
        rationale: justMatch ? justMatch[1].trim() : 'Enriquecimento com mais detalhes e aprofundamento temático.',
        additionText: addition,
        applied: false
      });
    }
  }

  return {
    bookTitle: book.title,
    tipoLivro: book.tipoLivro,
    summary,
    strengths,
    editorialGaps,
    chaptersReview
  };
}

/**
 * ENRIQUECIMENTO PROFUNDO (Ficção: história e drama | Técnico: método e prática)
 */
export async function deepEnrichBookWithCoAuthor(
  book: ReadyBookRecord,
  targetChapterNum?: number,
  onStatusUpdate?: (status: string) => void
): Promise<ChapterEnrichmentProposal[]> {
  const isTechnical = book.tipoLivro === 'tecnico' || book.tipoLivro === 'pratico' || book.tipoLivro === 'autoajuda';

  const capList = targetChapterNum
    ? [book.capitulos[targetChapterNum - 1]].filter(Boolean)
    : book.capitulos;

  const results: ChapterEnrichmentProposal[] = [];

  for (let idx = 0; idx < capList.length; idx++) {
    const c = capList[idx];
    const capRealNum = targetChapterNum || (idx + 1);
    const totalWords = c.texto.split(/\s+/).filter(Boolean).length;

    onStatusUpdate?.(`Enriquecendo Capítulo ${capRealNum}/${book.capitulos.length}: "${c.titulo}"...`);

    const systemInstruction = `Você é um Co-Autor e parceiro humano de escrita experiente.
Obra: "${book.title}" | Gênero: "${book.genre}" | Tipo: ${book.tipoLivro.toUpperCase()}
Capítulo em foco: Capítulo ${capRealNum} ("${c.titulo}").

DIRETRIZ DE ENRIQUECIMENTO:
${
  isTechnical
    ? `LIVRO TÉCNICO / NÃO-FICÇÃO:
- Enriqueça este capítulo adicionando:
  1. Um caso prático ou exemplo de aplicação do mundo real.
  2. Um framework ou passo a passo prático de execução.
  3. Dicas avançadas de solução de problemas e erros comuns a evitar.
- O texto gerado deve ser denso, didático, claro e direto ao ponto.`
    : `LIVRO DE FICÇÃO:
- Enriqueça este capítulo adicionando:
  1. Imersão sensorial profunda (texturas, sons, iluminação, sensações físicas).
  2. Tensão dramática ampliada ou aprofundamento no conflito interno dos personagens.
  3. Diálogos mais afiados, autênticos e expressivos.
- Mantenha o ritmo envolvente e a continuidade estrita da narrativa.`
}

NUNCA use cumprimentos ou frases de IA ("Olá autor", "Aqui está o enriquecimento").
Retorne no formato estruturado:
<<<ENRIQUECIMENTO>>>
JUSTIFICATIVA: [Por que este acréscimo eleva o nível do capítulo]
TEXTO:
[Texto pronto com cerca de 300 a 700 palavras para ser incorporado ao capítulo]
<<<FIM_ENRIQUECIMENTO>>>`;

    const prompt = `Analise o trecho atual do Capítulo ${capRealNum} (${totalWords} palavras):\n\n"${c.texto.slice(0, 3000)}"\n\nCrie um trecho de enriquecimento de alta qualidade para expandir este capítulo.`;

    try {
      const resp = await chamarGeminiTexto(prompt, {
        systemInstruction,
        temperature: 0.8,
        maxTokens: 2500,
        onStatusUpdate
      });

      const match = resp.texto.match(/<<<ENRIQUECIMENTO>>>([\s\S]*?)<<<FIM_ENRIQUECIMENTO>>>/);
      if (match) {
        const bloco = match[1];
        const justMatch = bloco.match(/JUSTIFICATIVA:\s*([\s\S]*?)(?=TEXTO:|$)/i);
        const textMatch = bloco.match(/TEXTO:\s*([\s\S]*)/i);

        if (textMatch && textMatch[1].trim()) {
          results.push({
            chapterNumber: capRealNum,
            chapterTitle: c.titulo,
            originalWordCount: totalWords,
            rationale: justMatch ? justMatch[1].trim() : 'Enriquecimento temático com maior profundidade.',
            additionText: textMatch[1].trim(),
            applied: false
          });
        }
      }
    } catch (err) {
      console.warn(`[ReadyBooksService] Erro ao enriquecer capítulo ${capRealNum}:`, err);
    }
  }

  return results;
}

export const enrichChaptersWithDeepContent = deepEnrichBookWithCoAuthor;

/**
 * Salva a versão atualizada de um livro diretamente no banco de dados local
 */
export async function saveUpdatedBookToDb(book: ReadyBookRecord): Promise<void> {
  try {
    const isProject = book.source === 'project';

    if (isProject) {
      const existing = await db.getBookProject(book.id);
      if (existing) {
        existing.title = book.title;
        existing.subtitle = book.subtitle;
        existing.updatedAt = Date.now();
        existing.kdpChapters = book.capitulos.map((c, i) => ({
          index: i + 1,
          title: c.titulo,
          summary: c.texto.slice(0, 200),
          targetWordCount: book.meta.palavrasPorCap,
          prose: c.texto,
          wordCount: c.texto.split(/\s+/).filter(Boolean).length,
          status: 'REVISADO' as const,
          illustrations: c.imagemDataUrl ? [c.imagemDataUrl] : [],
          scenes: []
        }));
        await db.saveBookProject(existing);
        return;
      }
    }

    // Se for FinalBookRecord ou fallback
    const allFinals = await db.getAllFinalBooks();
    const existingFinal = allFinals.find(f => f.id === book.id || f.bookId === book.id);
    if (existingFinal) {
      existingFinal.title = book.title;
      existingFinal.subtitle = book.subtitle;
      existingFinal.chapters = book.capitulos.map(c => ({
        titulo: c.titulo,
        texto: c.texto
      }));
      existingFinal.manuscriptText = book.capitulos.map((c, i) => `=== CAPÍTULO ${i + 1}: ${c.titulo} ===\n\n${c.texto}`).join('\n\n\n');
      existingFinal.wordCount = book.capitulos.reduce((acc, c) => acc + (c.texto.split(/\s+/).filter(Boolean).length || 0), 0);
      await db.saveFinalBook(existingFinal);
    }
  } catch (err) {
    console.error('[ReadyBooksService] Erro ao persistir livro atualizado no banco:', err);
    throw err;
  }
}
