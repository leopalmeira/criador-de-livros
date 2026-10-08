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
  modo: 'intervalo' | 'aleatorio' | 'capitulos' | 'todas';
  intervalo: number; // ex: 5, 8, 10 páginas
  totalAleatorio: number; // ex: 10 páginas em 100
  opacidade: number; // 0.01 a 1.00 (ex: 0.10 = 10%)
  sangriaPct: number; // 3%
  paginasSelecionadas: number[];
  modoCobertura: 'full-page' | 'marginal';
  monocromatico: boolean;
  aplicarTodas: boolean;
  nomeSilhueta?: string;
}

export const SILHUETA_CONFIG_PADRAO: SilhuetaMarginalConfig = {
  ativado: false,
  imagemDataUrl: null,
  modo: 'todas',
  intervalo: 10,
  totalAleatorio: 10,
  opacidade: 0.10, // 10% padrão editorial suave
  sangriaPct: 0.03,
  paginasSelecionadas: [],
  modoCobertura: 'full-page',
  monocromatico: true,
  aplicarTodas: true,
  nomeSilhueta: 'Montanhas & Horizonte'
};

// Catálogo de silhuetas e gravuras monocromáticas vetorizadas prontas para miolo KDP
export interface PredefinedSilhouette {
  id: string;
  nome: string;
  categoria: string;
  descricao?: string;
  svgDataUrl: string;
}

const svgToDataUrl = (svgInner: string) => {
  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="800" height="1200"><g fill="#1a1a1a" opacity="0.95">${svgInner}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}`;
};

export const GALERIA_SILHUETAS_PB: PredefinedSilhouette[] = [
  {
    id: 'mountains-horizon',
    nome: 'Montanhas & Horizonte Profundo',
    categoria: 'Natureza & Paisagem',
    svgDataUrl: svgToDataUrl(`
      <path d="M 0 950 L 140 780 L 290 890 L 480 680 L 640 830 L 800 690 L 800 1200 L 0 1200 Z" />
      <path opacity="0.5" d="M 0 1020 L 220 860 L 410 970 L 590 820 L 800 960 L 800 1200 L 0 1200 Z" />
      <circle cx="480" cy="520" r="70" opacity="0.4" />
    `)
  },
  {
    id: 'compass-rose',
    nome: 'Bússola Náutica & Rosa dos Ventos',
    categoria: 'Navegação & Direção',
    svgDataUrl: svgToDataUrl(`
      <circle cx="400" cy="600" r="220" fill="none" stroke="#1a1a1a" stroke-width="12" />
      <circle cx="400" cy="600" r="180" fill="none" stroke="#1a1a1a" stroke-width="4" stroke-dasharray="10 8" />
      <polygon points="400,320 425,580 400,560 375,580" />
      <polygon points="400,880 425,620 400,640 375,620" opacity="0.6" />
      <polygon points="680,600 420,625 440,600 420,575" />
      <polygon points="120,600 380,625 360,600 380,575" opacity="0.6" />
      <circle cx="400" cy="600" r="24" fill="#1a1a1a" />
    `)
  },
  {
    id: 'tree-of-life',
    nome: 'Árvore da Vida & Sabedoria',
    categoria: 'Crescimento & Legado',
    svgDataUrl: svgToDataUrl(`
      <path d="M 370 1050 C 370 900 340 820 310 750 C 260 630 180 600 140 500 C 190 510 240 550 290 620 C 260 510 240 430 200 350 C 270 380 320 440 350 540 C 360 420 370 310 330 200 C 390 260 410 340 410 450 C 430 330 460 250 510 190 C 490 290 480 390 480 500 C 520 420 570 360 630 340 C 590 420 560 500 540 600 C 590 530 650 500 700 490 C 660 590 580 630 520 740 C 490 810 460 890 460 1050 Z" />
    `)
  },
  {
    id: 'soaring-eagle',
    nome: 'Águia Real em Voo Livre',
    categoria: 'Visão & Liderança',
    svgDataUrl: svgToDataUrl(`
      <path d="M 400 440 C 440 380 530 310 680 270 C 640 330 610 390 590 450 C 650 430 710 430 770 450 C 720 480 670 510 610 520 C 650 540 680 570 700 610 C 640 590 580 580 520 570 C 480 620 450 690 420 780 C 400 720 380 640 360 590 C 310 600 240 620 170 650 C 200 600 230 560 280 530 C 220 530 160 500 100 460 C 170 440 230 440 290 460 C 270 390 230 330 180 280 C 320 320 390 390 400 440 Z" />
    `)
  },
  {
    id: 'classic-hourglass',
    nome: 'Ampulheta do Tempo & Foco',
    categoria: 'Disciplina & Produtividade',
    svgDataUrl: svgToDataUrl(`
      <rect x="250" y="260" width="300" height="40" rx="8" />
      <rect x="250" y="900" width="300" height="40" rx="8" />
      <path d="M 280 300 C 280 500 370 580 390 600 C 370 620 280 700 280 900 L 520 900 C 520 700 430 620 410 600 C 430 580 520 500 520 300 Z" fill="none" stroke="#1a1a1a" stroke-width="16" />
      <polygon points="320,380 480,380 400,560" opacity="0.6" />
      <polygon points="400,640 460,860 340,860" opacity="0.6" />
      <line x1="400" y1="560" x2="400" y2="640" stroke="#1a1a1a" stroke-width="8" stroke-dasharray="6 4" />
    `)
  },
  {
    id: 'coastal-lighthouse',
    nome: 'Farol Guia & Oceano',
    categoria: 'Propósito & Segurança',
    svgDataUrl: svgToDataUrl(`
      <polygon points="360,380 440,380 470,960 330,960" />
      <rect x="350" y="320" width="100" height="60" rx="6" />
      <polygon points="330,320 400,240 470,320" />
      <path d="M 400 320 L 760 160 L 780 220 Z" opacity="0.3" />
      <path d="M 400 320 L 40 160 L 20 220 Z" opacity="0.3" />
      <path d="M 100 1020 Q 250 970 400 1020 T 700 1020 L 750 1150 L 50 1150 Z" opacity="0.8" />
    `)
  }
];

/**
 * Calcula de forma determinística e harmoniosa quais páginas físicas do miolo
 * receberão a silhueta decorativa, respeitando as preferências do autor.
 */
export function calcularPaginasSilhueta(
  totalPaginasMiolo: number,
  modo: 'intervalo' | 'aleatorio' | 'capitulos' | 'todas',
  opcoes: {
    intervalo?: number;
    totalAleatorio?: number;
    capitulosStarts?: number[];
  } = {}
): number[] {
  if (totalPaginasMiolo <= 2) return [];

  const paginas: number[] = [];
  const startOffset = 4; // Pula capa, folha de rosto e sumário para não poluir

  if (modo === 'todas') {
    for (let p = startOffset; p <= totalPaginasMiolo; p++) {
      paginas.push(p);
    }
    return paginas;
  }

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
  estilo: 'realista' | 'arte_editorial' | 'aquarela' | 'nanquim' = 'arte_editorial',
  aspectRatio: '16:9' | '1:1' = '16:9'
): Promise<string> {
  const styleDirection = {
    realista: 'naturalistic editorial photograph, believable available light, authentic skin and material texture, realistic anatomy, subtle lens characteristics and restrained color grading',
    arte_editorial: 'considered fine-art editorial illustration, tactile textures, expressive but controlled brushwork, sophisticated composition and intentional color palette',
    aquarela: 'traditional watercolor illustration on textured paper, transparent layered pigments, soft natural edges and restrained color mixing',
    nanquim: 'crisp black ink etching with confident hand-drawn contours, deliberate crosshatching and clear print-friendly contrast'
  }[estilo];
  const promptCena = `Masterpiece book chapter illustration for: "${tituloCapitulo}". Scene: ${resumoCapitulo.substring(0, 300)}. ` +
    `Style: ${styleDirection}. Preserve the people, objects, setting, time of day, and actions described in the scene; do not add unrelated props. ` +
    `Avoid waxy skin, plastic surfaces, uncanny faces, distorted hands, extra limbs, generic 3D rendering, excessive sharpening, and stock-image composition. ` +
    `Natural perspective, coherent light direction, nuanced shadows, believable proportions, no text, no captions, no watermark.`;

  return await gerarImagemReplicate(promptCena, {
    aspectRatio
  });
}
