// Motor de Geração e Otimização de Prompts Profissionais de Capa para Múltiplos Motores de IA
import { BookProject } from '../../types/book-project';
import { CoverMarketIntelService } from './cover-market-intel';

export type AiImageEngine = 'gemini-imagen' | 'flux-1' | 'midjourney' | 'sdxl-comfy' | 'dalle-3';

export interface CoverEnginePrompt {
  engine: AiImageEngine;
  engineName: string;
  positivePrompt: string;
  negativePrompt: string;
  parameters: string;
  aspectRatio: string;
  readyToCopyCommand: string;
}

export interface CoverPromptVariation {
  id: string;
  title: string;
  styleTag: string;
  visualConcept: string;
  promptByEngine: Record<AiImageEngine, CoverEnginePrompt>;
  curatedDirectUrl: string;
}

export class CoverPromptEngine {
  /**
   * Constrói prompt altamente especializado e formatado para o motor específico
   */
  public static buildEnginePrompt(
    engine: AiImageEngine,
    visualConcept: string,
    topic: string,
    genre: string = 'non-fiction'
  ): CoverEnginePrompt {
    const baseSubject = visualConcept.trim();
    const cleanTopic = topic || 'sucesso, desenvolvimento e alta performance';

    switch (engine) {
      case 'gemini-imagen': {
        const positivePrompt = `A high-end professional book cover background art for a prestigious editorial book about "${cleanTopic}". Visual description: ${baseSubject}. Photorealistic composition, cinematic depth of field, 8k resolution, volumetric atmospheric lighting, pristine studio quality, hyper-detailed textures, elegant lighting gradient leaving ample breathing space at the top and bottom for graphic title overlay, no text, no letters, no words, no watermark, no bestseller badge, no sticker, no ribbon, perfectly composed in 2:3 vertical aspect ratio.`;
        const negativePrompt = `text, letters, words, typography, logo, watermark, signature, bestseller badge, sticker, ribbons, distorted anatomy, blurry, oversaturated, pixelated, ugly borders`;
        const parameters = `aspect_ratio: 2:3, sample_count: 1, quality: high, guidance_scale: 7.5`;
        return {
          engine: 'gemini-imagen',
          engineName: 'Google Gemini Imagen 3',
          positivePrompt,
          negativePrompt,
          parameters,
          aspectRatio: '2:3 (1600x2400)',
          readyToCopyCommand: positivePrompt
        };
      }

      case 'midjourney': {
        const positivePrompt = `editorial book cover art, ${baseSubject}, aesthetic mastery, editorial prestige, cinematic 35mm photography, subtle golden ratio framing, elegant negative space for typography, hyper-detailed lighting --ar 2:3 --v 6.1 --style raw --stylize 250 --no text letters typography signature watermark bestseller badge sticker`;
        const negativePrompt = `text, letters, typography, signature, watermark, bestseller badge, sticker, ribbon, amateur, low quality, blurred`;
        const parameters = `--ar 2:3 --v 6.1 --style raw --stylize 250`;
        return {
          engine: 'midjourney',
          engineName: 'Midjourney v6.1',
          positivePrompt,
          negativePrompt,
          parameters,
          aspectRatio: '2:3 (Aspect Ratio)',
          readyToCopyCommand: `/imagine prompt: ${positivePrompt}`
        };
      }

      case 'flux-1': {
        const positivePrompt = `cinematic hyper-detailed book cover art representing "${cleanTopic}", ${baseSubject}, 8k UHD, prestigious photography, rich chiaroscuro contrast, clean vertical editorial framing, atmospheric haze, volumetric lighting, photorealistic textures, zero text, blank space at top, no bestseller badge`;
        const negativePrompt = `text, watermarks, signatures, fonts, bestseller badge, ribbons, low resolution, deformed, bad composition`;
        const parameters = `width: 1024, height: 1536, steps: 30, guidance: 4.5, model: flux-schnell/dev`;
        return {
          engine: 'flux-1',
          engineName: 'FLUX.1 Pro / Schnell',
          positivePrompt,
          negativePrompt,
          parameters,
          aspectRatio: '1024x1536 (2:3)',
          readyToCopyCommand: positivePrompt
        };
      }

      case 'sdxl-comfy': {
        const positivePrompt = `masterpiece, (best quality:1.2), hyper-detailed, prestigious book cover art, ${baseSubject}, editorial style, highly detailed textures, dramatic lighting, sharp focus, 8k resolution, (empty space for title:1.1), negative space, cinematic, no text, no bestseller badge`;
        const negativePrompt = `(worst quality, low quality:1.4), (text, font, letters, watermark, signature, bestseller badge, ribbon:1.5), deformed, bad hands, blurry, out of frame, cropped`;
        const parameters = `CFG: 7.0, Sampler: DPM++ 2M Karras, Steps: 32, Resolution: 896x1344`;
        return {
          engine: 'sdxl-comfy',
          engineName: 'Stable Diffusion XL (ComfyUI)',
          positivePrompt,
          negativePrompt,
          parameters,
          aspectRatio: '896x1344 (SDXL Optimal 2:3)',
          readyToCopyCommand: positivePrompt
        };
      }

      case 'dalle-3':
      default: {
        const positivePrompt = `An elegant and striking vertical book cover background for a prestigious book about "${cleanTopic}". The composition features ${baseSubject}. The artwork uses dramatic, refined lighting, pristine digital art with no text, letters, words, or bestseller badges anywhere on the image. High contrast with intentional negative space in the upper third to allow placement of title typography.`;
        const negativePrompt = `Do not include any text, typography, title letters, author names, bestseller badge, ribbons, or watermarks.`;
        const parameters = `size: 1024x1792, quality: hd, style: natural`;
        return {
          engine: 'dalle-3',
          engineName: 'OpenAI DALL-E 3',
          positivePrompt,
          negativePrompt,
          parameters,
          aspectRatio: '1024x1792 (Vertical 9:16 / 2:3)',
          readyToCopyCommand: positivePrompt
        };
      }
    }
  }

  /**
   * Gera um conjunto de variações conceituais de capa completas com prompts para todos os motores
   */
  public static generateMultiOptionCoverPrompts(project: BookProject): CoverPromptVariation[] {
    const title = project.title || 'Livro Sem Título';
    const topic = project.topic || title;
    const genre = project.genre || project.kdpBookType || 'não-ficção';
    const baseSeed = Math.floor(Math.random() * 800000) + 100000;

    const variationsDef = [
      {
        id: 'var_1_gold_executive',
        title: 'Opção 1: Bestseller Executivo Dark Gold',
        styleTag: 'Prestígio & Liderança',
        visualConcept: `modern corporate glass skyscraper summit at dusk reflecting warm golden sunlight, sleek geometric lines, deep slate blue shadows with subtle luminous 24k gold leaf accents, prestigious award-winning business aesthetic`
      },
      {
        id: 'var_2_bold_minimalism',
        title: 'Opção 2: Minimalismo Bold de Alto Impacto',
        styleTag: 'Alta Performance & Foco',
        visualConcept: `striking minimalist geometric sculpture in immaculate white marble and intense royal blue, single beam of pure sunlight cutting through negative space, razor-sharp focus, conceptual clarity`
      },
      {
        id: 'var_3_cinematic_noir',
        title: 'Opção 3: Cinematográfico & Tensão Psicológica',
        styleTag: 'Mistério & Suspense',
        visualConcept: `atmospheric moody rain-slicked city avenue at night, solitary mysterious silhouette in dramatic volumetric backlight, deep chiaroscuro crimson and slate shadows, cinematic suspense and intrigue`
      },
      {
        id: 'var_4_heroic_nature',
        title: 'Opção 4: Horizonte Épico & Superação',
        styleTag: 'Transformação & Liberdade',
        visualConcept: `majestic solitary traveler standing on a towering mountain cliff overlooking an ocean of clouds at golden sunrise, expansive atmospheric perspective, breathtaking scale and triumph`
      },
      {
        id: 'var_5_fine_art',
        title: 'Opção 5: Gravura Artística & Clássica',
        styleTag: 'Obra de Referência & Atemporal',
        visualConcept: `classical fine art museum quality oil painting, textured subtle brushstrokes, deep Rembrandt lighting, antique astronomical compass and hourglass resting on aged dark mahogany`
      },
      {
        id: 'var_6_tech_modern',
        title: 'Opção 6: Futurismo Clean & Visão de Futuro',
        styleTag: 'Inovação & Estratégia Digital',
        visualConcept: `sleek isometric precision technological lattice, glowing cyan and deep violet data conduits, clean digital architecture representing strategic intelligence and forward thinking`
      }
    ];

    const engines: AiImageEngine[] = ['gemini-imagen', 'flux-1', 'midjourney', 'sdxl-comfy', 'dalle-3'];

    return variationsDef.map((v, idx) => {
      const promptByEngine: Record<string, CoverEnginePrompt> = {};

      engines.forEach(eng => {
        promptByEngine[eng] = this.buildEnginePrompt(eng, v.visualConcept, topic, genre);
      });

      // URL de renderização direta com motor FLUX gratuito e instantâneo
      const fluxPrompt = encodeURIComponent(promptByEngine['flux-1'].positivePrompt);
      const curatedDirectUrl = `https://image.pollinations.ai/prompt/${fluxPrompt}?width=1024&height=1536&seed=${baseSeed + idx * 7}&model=flux&nologo=true`;

      return {
        id: v.id,
        title: v.title,
        styleTag: v.styleTag,
        visualConcept: v.visualConcept,
        promptByEngine: promptByEngine as Record<AiImageEngine, CoverEnginePrompt>,
        curatedDirectUrl
      };
    });
  }
}
