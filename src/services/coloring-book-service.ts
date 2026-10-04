// ================================================================
// MOTOR DE LIVROS DE COLORIR KDP (COLORING BOOK ENGINE)
// - Planejamento com contexto e personagem central 100% consistente
// - Primeira geração é SEMPRE a Capa Colorida Vibrante
// - Prompts densos com no mínimo 1500 caracteres de detalhes cênicos por página
// - Geração sob demanda 1-a-1 estritamente sequencial
// - Diagramação KDP 8.5x11 pol com impressão single-sided (verso em branco)
// ================================================================

import { jsPDF } from 'jspdf';
import { chamarGeminiTexto, chamarImagen } from './kdp-ai-engine';

export interface ColoringPage {
  id: string;
  pageNumber: number; // 0 para Capa Colorida, 1..N para páginas de colorir
  isCover?: boolean;
  title: string;
  description: string;
  prompt: string;
  characterVisualGuide?: string;
  imageDataUrl?: string;
  status: 'pendente' | 'gerando' | 'concluida' | 'erro';
  error?: string;
}

export interface ColoringBookPlan {
  theme: string;
  subtheme: string;
  characterBible: string;
  targetAudience: 'infantil' | 'adultos' | 'todos';
  pages: ColoringPage[];
}

/**
 * Cria a Bíblia Visual do Personagem Central para garantir consistência visual em todas as páginas.
 */
export function buildCharacterVisualGuide(tema: string, subtema: string, publico: 'infantil' | 'adultos' | 'todos' = 'infantil'): string {
  const isInfantil = publico === 'infantil' || publico === 'todos';
  const cleanTema = String(tema || 'personagem amigável').trim();
  const cleanSub = String(subtema || 'aventura').trim();

  return `Consistent main character design sheet for ${cleanTema} (${cleanSub}). ` +
    `Exact visual appearance to maintain across all scenes: charismatic, expressive protagonist with clear defining silhouettes. ` +
    `Facial features: big warm joyful circular eyes with bright highlight pupils, friendly gentle smile, rounded soft facial contours, ` +
    `delicate expressive eyebrows that show genuine emotions, adorably proportioned ears with smooth outlines, soft clean snout and cheeks. ` +
    `Anatomy & Proportions: ${isInfantil ? 'chubby cute proportions, rounded paws, soft fluffy textures indicated strictly by clean outer contours without interior shading, comforting and lovable storybook anatomy' : 'refined anatomical lines, graceful aesthetic posture, delicate outline shading, highly harmonious body geometry'}. ` +
    `Signature outfit and accessories: wearable iconic storybook clothing including a cozy tailored adventurer vest with tiny rounded wooden buttons, a stitched pocket on the chest, a soft rolled explorer neckerchief, and a small sturdy satchel slung across one shoulder. ` +
    `Visual style continuity: identical physical features, identical clothing textures, identical facial proportions, identical distinctive personality traits across every single illustration in the book.`;
}

/**
 * Formata um prompt denso de no MÍNIMO 1500 caracteres de cena por página.
 * Inclui:
 * 1. Estilo da página (Capa Colorida Vibrante OU Página de Colorir Preto e Branco sem grayscale).
 * 2. Características idênticas do personagem central (Bíblia Visual).
 * 3. Ação específica da cena e interação.
 * 4. Cenário de primeiro plano, plano médio e plano de fundo riquíssimos em detalhes para colorir.
 * 5. Padrões KDP 300 DPI 8.5x11 polegadas.
 */
export function formatDenseColoringPrompt(
  description: string,
  targetAudience: 'infantil' | 'adultos' | 'todos' = 'infantil',
  characterGuide: string = '',
  isCover: boolean = false,
  pageNumber: number = 1
): string {
  const isAdults = targetAudience === 'adultos';

  // 1. Bloco de Estilo e Mídia
  const styleBlock = isCover
    ? `Masterpiece professional front book cover illustration in stunning full vibrant colors for an Amazon KDP bestselling coloring book. ` +
      `Rich, warm, saturated magical color palette, cinematic lighting, velvety highlights, golden hour glow, award-winning storybook cover art, 8k resolution, ultra-detailed painted textures, captivating depth of field, premium quality.`
    : `Masterpiece black and white coloring book page interior for Amazon KDP publication, ${isAdults ? 'adults and teens meditative coloring' : 'children friendly coloring book'}. ` +
      `Ultra-clean vector line art, pure crisp solid black outlines on a pure solid white background, zero grayscale, zero gray tones, no shaded fills, no gradient fills, no airbrushing, no crosshatching grain, perfectly open areas designed specifically for coloring with crayons and pencils, clean outlines, high contrast 300 DPI print quality.`;

  // 2. Bloco do Personagem Central
  const charBlock = characterGuide
    ? `Consistent central protagonist identity: ${characterGuide}`
    : `Consistently designed hero character: lovable storybook animal character with circular friendly eyes, soft rounded features, iconic cozy stitched vest with little buttons, small explorer backpack, cheerful heartwarming expression, and unmistakable charming silhouette that remains 100% consistent across every single page.`;

  // 3. Bloco da Cena Específica
  const sceneBlock = isCover
    ? `Hero cover composition: The main character is positioned proudly in the center, greeting the viewer with an inviting warm smile and a welcoming wave, surrounded by an enchanting lush forest blooming with wonder. Scene narrative: ${description}.`
    : `Interior story coloring page ${pageNumber}: The main character is actively engaged in the scene. Action and pose: ${description}. Clear dynamic posture, animated body language, joyful storytelling emotion, full body visible in the frame with natural interactive placement.`;

  // 4. Detalhes Ricos do Cenário em Camadas (Foreground, Midground, Background)
  const environmentBlock = `Intricate multilayered environment and setting: ` +
    `Foreground details: delicate wild forest flora, detailed daisy petals, curling fern fronds, smooth river pebbles with clean contour markings, charming mushrooms with spotted caps, tiny ladybugs on leaves, and decorative ornamental border elements inviting creative coloring. ` +
    `Midground details: rustic hollow wooden tree trunk with textured bark rings, hand-carved wooden footbridge over a meandering clear stream, flowering berry bushes, miniature woven basket overflowing with gathered woodland treasures, and winding cobblestone pathways. ` +
    `Background details: rolling whimsical grassy hills, magnificent ancient oak trees with expansive sprawling canopies of individual leaves, distant storybook cottage with a cobblestone chimney puffing soft spiral smoke, gentle puffy cotton clouds in the sky, a warm radiant sun with stylized rays, and playful birds in joyful flight.`;

  // 5. Bloco Técnico e Regras de Qualidade KDP
  const technicalBlock = isCover
    ? `Perfect vertical 8.5x11 portrait book cover framing, gorgeous commercial aesthetic, memorable character focus, high shelf appeal on Amazon bookstore, strictly no text, no title typography, no logos, no watermark, clean visual canvas ready for publishing.`
    : `Amazon KDP 8.5x11 inches portrait coloring page specifications: well-balanced line weight distribution, beautiful negative space for coloring enjoyment, harmoniously spaced lines allowing easy color filling without bleeding, strictly no text, no captions, no numbers, no words, no speech bubbles, no signatures, pristine professional coloring sheet.`;

  // 6. Montagem inicial
  let prompt = `${styleBlock}\n\n${charBlock}\n\n${sceneBlock}\n\n${environmentBlock}\n\n${technicalBlock}`;

  // 7. GARANTIA INEGOCIÁVEL: MÍNIMO DE 1500 CARACTERES DE CENA
  if (prompt.length < 1500) {
    const fillerNeeded = 1500 - prompt.length + 50;
    const enrichment = ` Additional rich scenic textures and detailed elements: ` +
      `Intricate botanical patterns, ornate leafy flourishes, detailed mossy stone walls, decorative butterfly wings with stained-glass patterns, ` +
      `acorns and pinecones scattered across the ground, water ripples expanding in concentric rings across the creek, ` +
      `curved wooden grain textures on fences, tiny lanterns hanging from tree branches with delicate wire frames, ` +
      `soft morning dew drops rendered in distinct clean contour lines, and charming garden fencing with climbing ivy vines. ` +
      `Every single element is thoughtfully structured to provide hours of engaging and relaxing coloring experience with flawless line continuity, ` +
      `artistic elegance, and absolute character recognition throughout the entire book collection.`;

    prompt += `\n\n${enrichment.slice(0, Math.max(fillerNeeded, enrichment.length))}`;
  }

  return prompt;
}

/**
 * Função legado para manter compatibilidade com testes existentes.
 */
export function formatColoringPrompt(description: string, targetAudience: 'infantil' | 'adultos' | 'todos' = 'infantil'): string {
  return formatDenseColoringPrompt(description, targetAudience, '', false, 1);
}

/**
 * Planeja a lista de páginas de colorir usando apenas Gemini Texto (3.8/3.5 Flash).
 * ZERO créditos de imagem são consumidos nesta etapa.
 * A PRIMEIRA PÁGINA (Página 0) É SEMPRE A CAPA COLORIDA DO LIVRO.
 * Todas as páginas seguintes mantêm o mesmo contexto e personagem central consistente.
 */
export async function planejarPaginasColorir(
  tema: string,
  subtema: string,
  qtdPaginas: number = 10,
  publico: 'infantil' | 'adultos' | 'todos' = 'infantil',
  customAiCall?: (prompt: string, opts?: any) => Promise<{ texto: string }>
): Promise<ColoringPage[]> {
  const aiCaller = customAiCall || chamarGeminiTexto;
  const characterGuide = buildCharacterVisualGuide(tema, subtema, publico);

  const promptSistema = `Você é um diretor de arte sênior especializado em livros de colorir infantis e adultos best-sellers para Amazon KDP.
Sua missão é criar o roteiro completo de ilustrações para um livro com tema "${tema}" e subtema "${subtema}".
Público-alvo: ${publico}.

REGRAS OBRIGATÓRIAS DE CONTINUIDADE E PERSONAGEM:
1. DEFINA UM PERSONAGEM PRINCIPAL CENTRAL ÚNICO (ex: um urso específico, raposa, dragão ou protagonista com características físicas, roupas e acessórios inconfundíveis).
2. TODAS AS PÁGINAS DO LIVRO DEVEM MOSTRAR EXATAMENTE ESSE MESMO PERSONAGEM VIVENDO UMA JORNADA RICA EM DETALHES.
3. A PRIMEIRA PÁGINA (Página 0) DEVE SER SEMPRE A CAPA COLORIDA VIBRANTE DO LIVRO COM O PERSONAGEM PRINCIPAL EM DESTAQUE.
4. AS PÁGINAS SEGUINTES (1 a ${qtdPaginas}) SÃO AS PÁGINAS DE COLORIR INTERNAS EM PRETO E BRANCO.
5. CADA PÁGINA DEVE TER UMA DESCRIÇÃO CÊNICA DENSÍSSIMA COM PRIMEIRO PLANO, PLANO MÉDIO E FUNDO CHEIOS DE DETALHES PARA COLORIR.

Responda APENAS com um array JSON válido contendo a Capa (pageNumber: 0) e as ${qtdPaginas} páginas internas:
[
  {
    "pageNumber": 0,
    "isCover": true,
    "title": "Capa Colorida: Título da Obra",
    "description": "Descrição exuberante da capa colorida com o personagem principal em pose de boas-vindas",
    "promptEnglish": "Detailed English scene description for image generation of the colorful cover"
  },
  {
    "pageNumber": 1,
    "isCover": false,
    "title": "Título da Primeira Aventura",
    "description": "Descrição detalhada do mesmo personagem interagindo com a cena",
    "promptEnglish": "Detailed English scene description for image generation"
  }
]`;

  try {
    const res = await aiCaller(
      `Crie o plano de ${qtdPaginas} páginas de colorir sobre "${tema} - ${subtema}" para público ${publico}. Lembre-se: o item 0 é a CAPA COLORIDA e todos os itens retratam rigorosamente o MESMO personagem central. Retorne APENAS o JSON puro.`,
      { systemInstruction: promptSistema, temperature: 0.7 }
    );

    // Limpar markdown de código se presente
    const jsonStr = res.texto.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const rawList = JSON.parse(jsonStr);

    if (!Array.isArray(rawList)) {
      throw new Error('A resposta da IA não retornou uma lista válida.');
    }

    // Se a IA não incluiu a capa explicitamente no retorno, inserimos a capa colorida no início
    let formattedList = [...rawList];
    const hasCover = formattedList.some(item => item.isCover || item.pageNumber === 0);
    if (!hasCover) {
      formattedList.unshift({
        pageNumber: 0,
        isCover: true,
        title: `Capa Colorida: ${tema}`,
        description: `Capa oficial colorida de alto padrão com o protagonista em pose acolhedora em meio à floresta mágica de ${subtema || tema}.`,
        promptEnglish: `Vibrant magnificent book cover of ${tema} with the central hero character smiling warmly in a magical detailed forest`
      });
    }

    return formattedList.map((item: any, idx: number) => {
      const isCoverItem = Boolean(item.isCover || item.pageNumber === 0 || idx === 0);
      const pageNum = isCoverItem ? 0 : (item.pageNumber || idx);
      const desc = item.description || `${tema} - Cena ilustrativa`;
      const promptSeed = item.promptEnglish || desc;

      const densePrompt = formatDenseColoringPrompt(
        promptSeed,
        publico,
        characterGuide,
        isCoverItem,
        pageNum
      );

      return {
        id: `col_page_${Date.now()}_${idx}_${pageNum}`,
        pageNumber: pageNum,
        isCover: isCoverItem,
        title: item.title || (isCoverItem ? `Capa Colorida: ${tema}` : `Página ${pageNum}: ${subtema || tema}`),
        description: desc,
        prompt: densePrompt,
        characterVisualGuide: characterGuide,
        status: 'pendente' as const
      };
    });
  } catch (err: any) {
    console.warn('Fallback para planejamento com contexto e personagem consistente:', err.message);
    const fallbackList: ColoringPage[] = [];

    // 1. Sempre a Capa Colorida primeiro
    const coverPrompt = formatDenseColoringPrompt(
      `Magnificent colorful book cover featuring the central hero character smiling proudly on a mossy hill surrounded by blooming wild blossoms and friendly woodland creatures.`,
      publico,
      characterGuide,
      true,
      0
    );

    fallbackList.push({
      id: `col_page_${Date.now()}_0`,
      pageNumber: 0,
      isCover: true,
      title: `Capa Colorida: ${tema}`,
      description: `Capa frontal oficial colorida com o protagonista em destaque e cenário encantado.`,
      prompt: coverPrompt,
      characterVisualGuide: characterGuide,
      status: 'pendente'
    });

    // 2. Páginas de colorir internas do mesmo personagem
    for (let i = 1; i <= qtdPaginas; i++) {
      const desc = `O mesmo personagem principal explorando uma nova clareira com riacho cristalino, pedras ornamentais e árvores antigas (Cena ${i} da jornada).`;
      const pagePrompt = formatDenseColoringPrompt(
        `The same main character in scene ${i}: happily discovering a new peaceful corner of the woods with playful butterflies, winding river stones, and hollow tree bridges.`,
        publico,
        characterGuide,
        false,
        i
      );

      fallbackList.push({
        id: `col_page_${Date.now()}_${i}`,
        pageNumber: i,
        isCover: false,
        title: `Página ${i}: Aventura do Personagem no Cenário ${i}`,
        description: desc,
        prompt: pagePrompt,
        characterVisualGuide: characterGuide,
        status: 'pendente'
      });
    }

    return fallbackList;
  }
}

import { comporCapaComTipografia } from './kdp-cover-composer';

/**
 * Gera a ilustração de UMA página individual sob demanda.
 * Se for Capa, gera colorida e estampa título, subtítulo e autor; se for página interna, gera line art preto e branco.
 */
export async function gerarIlustracaoPaginaColorir(
  page: ColoringPage,
  aspectRatio: '2:3' | '3:4' | '1:1' = '3:4',
  coverOptions?: {
    titulo: string;
    subtitulo?: string;
    autor: string;
  }
): Promise<string> {
  const chosenRatio = page.isCover ? '2:3' : aspectRatio;
  const rawDataUrl = await chamarImagen(page.prompt, chosenRatio);

  if (page.isCover && coverOptions?.titulo) {
    const capaComposta = await comporCapaComTipografia(rawDataUrl, {
      titulo: coverOptions.titulo,
      subtitulo: coverOptions.subtitulo,
      autor: coverOptions.autor || 'Book Intel KDP',
      selo: 'EDIÇÃO ESPECIAL PARA COLORIR'
    });
    return capaComposta;
  }

  return rawDataUrl;
}

/**
 * Compila o Livro de Colorir em PDF de Alta Resolução no padrão KDP (8.5 x 11 polegadas).
 * - A primeira página do PDF é a Capa Colorida (se gerada).
 * - Página de abertura ("Este livro de colorir pertence a:") com verso em branco.
 * - Cada página de desenho tem o verso em branco intencional (single-sided).
 */
export async function buildColoringBookPdf(
  titulo: string,
  autor: string,
  pages: ColoringPage[],
  capaDataUrl?: string | null
): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [612, 792] // 8.5 x 11 polegadas
  });

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = pageHeight - (margin * 2);

  // 1. Identificar se temos Capa Colorida na lista de páginas ou no argumento
  const coverPage = pages.find(p => p.isCover && p.imageDataUrl);
  const effectiveCoverDataUrl = coverPage?.imageDataUrl || capaDataUrl;

  let hasPage = false;

  // Se tiver capa colorida, ela é a folha frontal do livro
  if (effectiveCoverDataUrl) {
    doc.addImage(effectiveCoverDataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    doc.addPage([pageWidth, pageHeight], 'portrait');
    hasPage = true;
  }

  // 2. Página de Abertura / Identificação ("Este livro pertence a:")
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(30, 41, 59);
  doc.text(titulo.toUpperCase(), pageWidth / 2, 220, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139);
  doc.text(`Por ${autor || 'Book Intel KDP'}`, pageWidth / 2, 255, { align: 'center' });

  // Linha decorativa
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(1.5);
  doc.line(pageWidth / 2 - 120, 280, pageWidth / 2 + 120, 280);

  // Caixa "Este livro de colorir pertence a:"
  doc.setFontSize(13);
  doc.setTextColor(51, 65, 85);
  doc.text('Este livro de colorir pertence a:', pageWidth / 2, 450, { align: 'center' });

  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([4, 4], 0);
  doc.line(margin + 60, 500, pageWidth - margin - 60, 500);
  doc.setLineDashPattern([], 0);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Impresso em folhas de face única para não manchar seus desenhos.', pageWidth / 2, 720, { align: 'center' });

  // 3. Verso da página de abertura (em branco)
  doc.addPage([pageWidth, pageHeight], 'portrait');

  // 4. Páginas Internas de Desenho para Colorir (excluindo a capa se ela foi gerada)
  const paginasInternasComImagem = pages.filter(p => !p.isCover && p.imageDataUrl);

  for (let i = 0; i < paginasInternasComImagem.length; i++) {
    const p = paginasInternasComImagem[i];

    // Página Ímpar: Desenho para Colorir
    doc.addPage([pageWidth, pageHeight], 'portrait');

    if (p.imageDataUrl) {
      const imgW = contentWidth;
      const imgH = contentHeight - 40;
      const posX = margin;
      const posY = margin + 10;

      try {
        doc.addImage(p.imageDataUrl, 'PNG', posX, posY, imgW, imgH, undefined, 'FAST');
      } catch (err) {
        console.warn(`Erro ao desenhar imagem da página ${p.pageNumber} no PDF:`, err);
      }
    }

    // Rodapé discreto
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(160, 174, 192);
    doc.text(`${p.pageNumber || i + 1}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

    // Página Par: Verso em branco (Regra KDP de livros de colorir)
    doc.addPage([pageWidth, pageHeight], 'portrait');
  }

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
