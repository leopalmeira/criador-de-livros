// ================================================================
// MOTOR DE SILHUETAS MARGINAIS E ILUSTRAÇÕES DE MIOLO KDP
// - Efeito de Silhueta com Sangria Externa (3% da metade da página pra fora)
// - Distribuição por intervalo fixo (a cada X páginas) ou aleatório inteligente
// - Geração de alta fidelidade com Replicate FLUX.1 Schnell
// ================================================================

import { gerarImagemReplicate } from './replicate-service';
import { chamarGeminiTexto } from './kdp-ai-engine';

export interface SilhuetaMarginalConfig {
  ativado: boolean;
  imagemDataUrl?: string | null;
  modo: 'intervalo' | 'aleatorio' | 'capitulos';
  intervalo: number; // ex: 5, 8, 10 páginas
  totalAleatorio: number; // ex: 10 páginas em 100
  opacidade: number; // 0.08 a 0.30
  sangriaPct: number; // 3% da metade da página
  paginasSelecionadas: number[];
}

export const SILHUETA_CONFIG_PADRAO: SilhuetaMarginalConfig = {
  ativado: false,
  imagemDataUrl: null,
  modo: 'aleatorio',
  intervalo: 10,
  totalAleatorio: 10,
  opacidade: 0.18,
  sangriaPct: 0.03, // 3%
  paginasSelecionadas: []
};

/**
 * Calcula de forma determinística e harmoniosa quais páginas físicas do miolo
 * receberão a silhueta decorativa, respeitando as preferências do autor.
 */
export function calcularPaginasSilhueta(
  totalPaginasMiolo: number,
  modo: 'intervalo' | 'aleatorio' | 'capitulos',
  opcoes: {
    intervalo?: number;
    totalAleatorio?: number;
    capitulosStarts?: number[];
  } = {}
): number[] {
  if (totalPaginasMiolo <= 2) return [];

  const paginas: number[] = [];
  const startOffset = 4; // Pula capa, folha de rosto e sumário para não poluir

  if (modo === 'capitulos') {
    if (opcoes.capitulosStarts && opcoes.capitulosStarts.length > 0) {
      return opcoes.capitulosStarts.filter(p => p >= startOffset && p <= totalPaginasMiolo);
    }
    // Fallback: se não tiver a lista de capítulos, marca a cada 8 páginas
    for (let p = startOffset; p <= totalPaginasMiolo; p += 8) {
      paginas.push(p);
    }
    return paginas;
  }

  if (modo === 'intervalo') {
    const step = Math.max(3, opcoes.intervalo || 10);
    for (let p = startOffset; p <= totalPaginasMiolo; p += step) {
      paginas.push(p);
    }
    return paginas;
  }

  // Modo Aleatório Inteligente: Distribui N páginas espaçadas uniformemente
  const desejadas = Math.max(1, Math.min(opcoes.totalAleatorio || 10, Math.floor(totalPaginasMiolo * 0.4)));
  const range = totalPaginasMiolo - startOffset + 1;
  const idealStep = Math.max(3, Math.floor(range / desejadas));

  let current = startOffset + 1;
  while (current <= totalPaginasMiolo && paginas.length < desejadas) {
    // Pequena variação orgânica (+0, +1 ou -1) para não parecer estático
    const jitter = ((current * 17) % 3) - 1;
    const finalPage = Math.min(totalPaginasMiolo, Math.max(startOffset, current + jitter));
    if (!paginas.includes(finalPage)) {
      paginas.push(finalPage);
    }
    current += idealStep;
  }

  return paginas.sort((a, b) => a - b);
}

/**
 * Cria o prompt para gerar a silhueta artística do protagonista no Replicate FLUX
 */
export async function gerarPromptSilhueta(
  titulo: string,
  genero: string,
  personagemFoco: string = ''
): Promise<string> {
  const promptSistema = `Você é um diretor de design de livros impressos de luxo.
Crie um prompt em inglês de 1 parágrafo para gerar uma SILHUETA ARTÍSTICA ELEGANTE do personagem principal para vinheta marginal de página de livro.
Obra: "${titulo}". Gênero: "${genero}". Personagem: "${personagemFoco || 'protagonista da história'}".
REGRAS:
1. O prompt deve especificar "Artistic minimalist silhouette portrait and half-body contour of ${personagemFoco || 'the main character'}".
2. Fundo estritamente branco puro e limpo (pure solid white background, high contrast).
3. Estilo sofisticado de nanquim e vetor editorial (refined dark ink wash vector, crisp outline, poetic atmospheric mood).
4. Sem textos, sem letras, sem marcas d'água.
Retorne APENAS o prompt em inglês.`;

  try {
    const res = await chamarGeminiTexto(promptSistema, { temperature: 0.7, maxTokens: 300 });
    return res.texto.trim();
  } catch (err) {
    return `Exquisite minimalist character silhouette of the main protagonist from "${titulo}", artistic dark ink contour on pure solid white background, high contrast, clean vector silhouette for book page margin decoration, elegant atmospheric aesthetic, zero text, zero gray tones.`;
  }
}

/**
 * Gera a silhueta oficial da obra utilizando o motor Replicate FLUX.1 Schnell
 */
export async function gerarSilhuetaPersonagem(
  titulo: string,
  genero: string,
  personagemFoco: string = '',
  customPrompt?: string
): Promise<{ prompt: string; imageDataUrl: string }> {
  const promptFinal = customPrompt || await gerarPromptSilhueta(titulo, genero, personagemFoco);
  
  // Replicate FLUX gera a silhueta em proporção vertical 2:3 ou 3:4
  const dataUrl = await gerarImagemReplicate(promptFinal, {
    aspectRatio: '3:4',
    model: 'black-forest-labs/flux-schnell'
  });

  return {
    prompt: promptFinal,
    imageDataUrl: dataUrl
  };
}

/**
 * Gera uma ilustração dedicada de abertura de capítulo utilizando Replicate FLUX
 */
export async function gerarIlustracaoCapitulo(
  tituloCapitulo: string,
  resumoCapitulo: string,
  estilo: 'realista' | 'arte_editorial' | 'aquarela' | 'nanquim' = 'arte_editorial'
): Promise<string> {
  const promptCena = `Masterpiece book chapter illustration for: "${tituloCapitulo}". Scene: ${resumoCapitulo.substring(0, 300)}. ` +
    `Style: ${estilo === 'nanquim' ? 'crisp black ink etching, woodcut style' : 'fine artistic storybook editorial illustration'}, ` +
    `award-winning book art, cinematic lighting, captivating depth of field, 8k resolution, no text, no captions.`;

  return await gerarImagemReplicate(promptCena, {
    aspectRatio: '16:9'
  });
}
