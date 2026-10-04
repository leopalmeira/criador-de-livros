// ================================================================
// MOTOR DE LIVROS DE COLORIR KDP (COLORING BOOK ENGINE)
// - Planejamento econômico de páginas via Gemini 3.x (Texto, quase 0 tokens)
// - Geração sob demanda 1-a-1 de ilustrações via Imagen 3 / Gemini Imagem
// - Linhas pretas nítidas sobre fundo branco (sem cinza, sem cores)
// - Diagramação KDP 8.5x11 pol com verso em branco intencional (single-sided)
// ================================================================

import { jsPDF } from 'jspdf';
import { chamarGeminiTexto, chamarImagen } from './kdp-ai-engine';

export interface ColoringPage {
  id: string;
  pageNumber: number;
  title: string;
  description: string;
  prompt: string;
  imageDataUrl?: string;
  status: 'pendente' | 'gerando' | 'concluida' | 'erro';
  error?: string;
}

export interface ColoringBookState {
  theme: string;
  subtheme: string;
  targetAudience: 'infantil' | 'adultos' | 'todos';
  pages: ColoringPage[];
  totalImagesGenerated: number;
}

/**
 * Formata o prompt técnico para o Imagen 3 / Gemini gerar traços de colorir limpos.
 * Evita preenchimentos cinzas, degradês e cores que mancham a impressão KDP.
 */
export function formatColoringPrompt(description: string, targetAudience: 'infantil' | 'adultos' | 'todos' = 'infantil'): string {
  const audienceDetails = targetAudience === 'adultos'
    ? 'complex intricate mandala and zentangle details, fine line art, meditative patterns'
    : 'bold thick clean outlines, simple cheerful shapes, easy to color, friendly cartoon style';

  return `Clean black and white coloring book page for ${targetAudience === 'adultos' ? 'adults' : 'children'}, ` +
    `subject: ${description}. ` +
    `${audienceDetails}, ` +
    `pure white background, solid black outlines, strictly no colors, no shading, no gradients, ` +
    `no grayscale, no gray tones, high contrast vector line art, clean edges, ` +
    `Amazon KDP coloring book interior quality, 300 DPI, sharp masterpiece, no text, no words.`;
}

/**
 * Planeja a lista de páginas de colorir usando apenas Gemini Texto (3.8/3.5 Flash).
 * ZERO créditos de imagem são consumidos nesta etapa.
 */
export async function planejarPaginasColorir(
  tema: string,
  subtema: string,
  qtdPaginas: number = 10,
  publico: 'infantil' | 'adultos' | 'todos' = 'infantil',
  customAiCall?: (prompt: string, opts?: any) => Promise<{ texto: string }>
): Promise<ColoringPage[]> {
  const aiCaller = customAiCall || chamarGeminiTexto;
  const promptSistema = `Você é um diretor de arte sênior especializado em livros de colorir best-sellers para Amazon KDP.
Sua missão é criar o roteiro de ilustrações para um livro de colorir com tema "${tema}" e subtema "${subtema}".
Público-alvo: ${publico}.

Gere EXATAMENTE ${qtdPaginas} conceitos de ilustrações criativas, progressivas e originais.
Responda APENAS com um array JSON válido no seguinte formato:
[
  {
    "pageNumber": 1,
    "title": "Título em português da ilustração",
    "description": "Descrição detalhada dos elementos visuais da cena",
    "promptEnglish": "Brief description in English of the main subject and action for image model"
  }
]`;

  try {
    const res = await aiCaller(
      `Crie o plano de ${qtdPaginas} páginas de colorir sobre "${tema} - ${subtema}" para público ${publico}. Retorne APENAS o JSON puro.`,
      { systemInstruction: promptSistema, temperature: 0.7 }
    );

    // Limpar markdown de código se presente
    const jsonStr = res.texto.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const rawList = JSON.parse(jsonStr);

    if (!Array.isArray(rawList)) {
      throw new Error('A resposta da IA não retornou uma lista válida.');
    }

    return rawList.map((item: any, idx: number) => ({
      id: `col_page_${Date.now()}_${idx + 1}`,
      pageNumber: item.pageNumber || idx + 1,
      title: item.title || `Página ${idx + 1}`,
      description: item.description || tema,
      prompt: formatColoringPrompt(item.promptEnglish || item.description || tema, publico),
      status: 'pendente' as const
    }));
  } catch (err: any) {
    console.warn('Fallback manual para planejamento de páginas:', err.message);
    // Fallback gracioso com conceitos pré-estruturados caso a IA demore
    const fallbackList: ColoringPage[] = [];
    for (let i = 1; i <= qtdPaginas; i++) {
      const desc = `${tema} - Cena ilustrativa ${i} com ${subtema}`;
      fallbackList.push({
        id: `col_page_${Date.now()}_${i}`,
        pageNumber: i,
        title: `Ilustração ${i}: ${subtema || tema}`,
        description: desc,
        prompt: formatColoringPrompt(desc, publico),
        status: 'pendente'
      });
    }
    return fallbackList;
  }
}

/**
 * Gera a ilustração de UMA página individual sob demanda.
 * Só consome crédito quando o usuário clica intencionalmente nesta página.
 */
export async function gerarIlustracaoPaginaColorir(
  page: ColoringPage,
  aspectRatio: '2:3' | '3:4' | '1:1' = '3:4'
): Promise<string> {
  const dataUrl = await chamarImagen(page.prompt, aspectRatio);
  return dataUrl;
}

/**
 * Compila o Livro de Colorir em PDF de Alta Resolução no padrão KDP (8.5 x 11 polegadas).
 * Regra KDP: Verso em branco automático (impressão de lado único) para evitar transferência de tinta.
 */
export async function buildColoringBookPdf(
  titulo: string,
  autor: string,
  pages: ColoringPage[],
  capaDataUrl?: string | null
): Promise<Uint8Array> {
  // 8.5 x 11 polegadas em pontos tipográficos = 612 x 792 pt
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [612, 792]
  });

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 36; // 0.5 polegada de margem de segurança KDP
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = pageHeight - (margin * 2);

  let hasPage = false;

  // 1. Capa incorporada (se fornecida)
  if (capaDataUrl) {
    doc.addImage(capaDataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    doc.addPage([pageWidth, pageHeight], 'portrait');
    hasPage = true;
  }

  // 2. Página de Abertura / Identificação ("Este livro pertence a:")
  if (hasPage) {
    // se teve capa, a página já foi criada
  }
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
  doc.setLineDashPattern([], 0); // reseta tracejado

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Impresso em folhas de face única para não manchar seus desenhos.', pageWidth / 2, 720, { align: 'center' });

  // 3. Verso da página de abertura (em branco)
  doc.addPage([pageWidth, pageHeight], 'portrait');

  // 4. Páginas de Desenho para Colorir
  const pagesComImagem = pages.filter(p => p.imageDataUrl);

  for (let i = 0; i < pagesComImagem.length; i++) {
    const p = pagesComImagem[i];

    // Página Ímpar: Desenho para Colorir
    doc.addPage([pageWidth, pageHeight], 'portrait');

    // Desenha borda sutil se desejado ou insere a imagem centrada
    if (p.imageDataUrl) {
      // Ajusta proporção dentro da área útil
      const imgW = contentWidth;
      const imgH = contentHeight - 40; // deixa espaço para número da página
      const posX = margin;
      const posY = margin + 10;

      try {
        doc.addImage(p.imageDataUrl, 'PNG', posX, posY, imgW, imgH, undefined, 'FAST');
      } catch (err) {
        console.warn(`Erro ao desenhar imagem da página ${i + 1} no PDF:`, err);
      }
    }

    // Rodapé discreto
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(160, 174, 192);
    doc.text(`${i + 1}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

    // Página Par: Verso em branco (Regra KDP de livros de colorir)
    doc.addPage([pageWidth, pageHeight], 'portrait');
    // Deixada intencionalmente em branco
  }

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
