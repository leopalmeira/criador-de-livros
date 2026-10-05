// Serviço de Geração de Imagens e Ilustrações Realistas com IA para Livros e Capas KDP
import { BookProject, IBookChapter, BookImageItem } from '../types/book-project';

export type ArtStyleOption = 
  | 'realistic-photo'
  | 'cinematic-3d'
  | 'oil-painting'
  | 'dark-luxury'
  | 'epic-fantasy'
  | 'minimalist-vector'
  | 'vintage-engraving';

export interface StylePreset {
  id: ArtStyleOption;
  label: string;
  description: string;
  promptSuffix: string;
}

export const ART_STYLE_PRESETS: StylePreset[] = [
  {
    id: 'realistic-photo',
    label: 'Fotografia Realista 8K',
    description: 'Iluminação cinematográfica, foco nítido, textura hiper-realista e profundidade de campo.',
    promptSuffix: 'photorealistic photography, 8k resolution, cinematic lighting, sharp focus, hyper-detailed, award-winning national geographic style, atmospheric, professional studio lighting, 35mm lens, no text'
  },
  {
    id: 'cinematic-3d',
    label: 'Render 3D Cinematográfico',
    description: 'Estilo Octane Render, iluminação volumétrica, estética futurista e polida.',
    promptSuffix: 'cinematic 3d octane render, unreal engine 5, volumetric lighting, ray tracing, ultra realistic, highly detailed, dramatic shadows, 8k, modern aesthetic, no text'
  },
  {
    id: 'oil-painting',
    label: 'Pintura Artística & Clássica',
    description: 'Pinceladas expressivas, textura de tela, chiaroscuro e elegância atemporal.',
    promptSuffix: 'masterpiece fine art oil painting, textured brushstrokes, chiaroscuro, rembrandt lighting, rich pigments, highly detailed museum quality, atmospheric, no text'
  },
  {
    id: 'dark-luxury',
    label: 'Minimalista Luxo & Dark Gold',
    description: 'Fundo escuro profundo com detalhes em ouro fosco, geometria refinada e sobriedade.',
    promptSuffix: 'dark luxury aesthetic, deep slate graphite background, subtle glowing gold foil accents, sophisticated modern minimalism, hyper-detailed, premium editorial book cover art, no text, no bestseller badge'
  },
  {
    id: 'epic-fantasy',
    label: 'Fantasia Épica & Mágica',
    description: 'Cenários grandiosos, partículas de luz, névoa mística e atmosfera envolvente.',
    promptSuffix: 'epic fantasy digital art, ethereal magical glowing atmosphere, towering ancient landscape, mystical fog, intricate details, artstation trending, dramatic lighting, 8k, no text'
  },
  {
    id: 'vintage-engraving',
    label: 'Gravura Editorial Vintage',
    description: 'Linhas finas, estética de livro clássico do século XIX e xilogravura elegante.',
    promptSuffix: 'vintage book engraving illustration, fine hatching line art, victorian classic editorial bookplate, sepia and ivory tones, intricate antique woodcut, high resolution, no text'
  }
];

export class ImageGenerationService {
  /**
   * Constrói um prompt hiper-realista contextualizado com o tema, público e gênero do livro
   */
  public static buildCoverPrompt(
    project: BookProject, 
    style: ArtStyleOption = 'realistic-photo',
    customKeyword: string = '',
    variationSeed: number = 0
  ): string {
    const preset = ART_STYLE_PRESETS.find(p => p.id === style) || ART_STYLE_PRESETS[0];
    const topic = project.topic || project.title || 'Livro Profissional';
    const bookType = project.kdpBookType || 'non-fiction';

    let sceneDescription = '';

    if (customKeyword.trim()) {
      sceneDescription = customKeyword.trim();
    } else {
      switch (bookType) {
        case 'self-help':
        case 'business':
        case 'finance':
          sceneDescription = `a symbolic powerful concept of personal discipline, habit formation and high performance: sleek modern architectural interior overlooking a dramatic sunrise, glowing golden morning light rays through floor-to-ceiling glass, solitary focused person silhouette, minimal obsidian desk, hourglass with luminous sand, metaphorical visual representing focus and growth, topic ${topic}`;
          break;
        case 'thriller':
        case 'mystery':
        case 'suspense':
          sceneDescription = `cinematic neo-noir crime thriller atmosphere: moody rain-slicked city avenue at midnight, solitary detective silhouette in trenchcoat under dramatic streetlamp, deep shadows, mist, red and cyan neon reflections, dramatic psychological tension, topic ${topic}`;
          break;
        case 'sci-fi':
          sceneDescription = `epic science fiction scene: futuristic human civilization in orbital megastructure, majestic planetary horizon, glowing quantum energy conduits, sleek starship, cinematic scale and wonder, topic ${topic}`;
          break;
        case 'fantasy':
          sceneDescription = `epic high fantasy realm: ancient mythical citadel surrounded by jagged misty mountains, ethereal celestial auroras in twilight sky, glowing runes, grandeur and mystery, topic ${topic}`;
          break;
        case 'romance':
          sceneDescription = `cinematic emotional romance scene: two lovers silhouettes standing on coastal cliffs during breathtaking golden hour sunset, gentle sea breeze, warm amber and violet skies, dreamy aesthetic, topic ${topic}`;
          break;
        case 'children-picture-book':
        case 'illustrated-book':
          sceneDescription = `enchanting whimsical storybook fairytale forest, adorable animated animal friends exploring a glowing magical hollow, warm fireflies, Disney Pixar storybook lighting, joyful colorful atmosphere, topic ${topic}`;
          break;
        case 'technical-manual':
        case 'practical-guide':
          sceneDescription = `futuristic technological blueprint, glowing neural network graphs, isometric precision engineering modules, sleek dark cobalt blue and cyber teal lighting, clean data visualization, topic ${topic}`;
          break;
        default:
          sceneDescription = `dramatic visual metaphor for ${topic}, elegant composition, atmospheric depth, powerful visual storytelling, award-winning book cover art`;
          break;
      }
    }

    const seedBonus = variationSeed > 0 ? `, alternative angle variation #${variationSeed}, unique perspective` : '';
    return `${sceneDescription}${seedBonus}, ${preset.promptSuffix}`;
  }

  /**
   * Constrói prompt para ilustrações internas de capítulos
   */
  public static buildChapterPrompt(
    chapter: IBookChapter,
    project: BookProject,
    style: ArtStyleOption = 'realistic-photo',
    variationSeed: number = 0
  ): string {
    const preset = ART_STYLE_PRESETS.find(p => p.id === style) || ART_STYLE_PRESETS[0];
    const chTitle = chapter.title || `Capítulo ${chapter.index}`;
    const chSummary = chapter.summary || project.title;

    const base = `editorial book chapter illustration for "${chTitle}", visual scene showing: ${chSummary}, themed around ${project.kdpBookType}`;
    const seedBonus = variationSeed > 0 ? `, variation #${variationSeed}` : '';
    return `${base}${seedBonus}, ${preset.promptSuffix}`;
  }

  /**
   * Gera a URL direta para o motor FLUX / Pollinations AI (100% gratuito, sem chave de API, alta resolução)
   */
  public static getPollinationsUrl(
    prompt: string, 
    width: number = 1024, 
    height: number = 1536, 
    seed?: number
  ): string {
    const cleanPrompt = encodeURIComponent(prompt.trim());
    const actualSeed = seed !== undefined ? seed : Math.floor(Math.random() * 1000000);
    return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${actualSeed}&model=flux&nologo=true`;
  }

  /**
   * Baixa a imagem gerada pela IA e converte em Base64 DataURL
   */
  public static async fetchImageAsDataUrl(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao obter imagem da IA (HTTP ${response.status})`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Gera uma ilustração completa de capítulo e adiciona aos metadados do projeto
   */
  public static async generateChapterIllustration(
    chapter: IBookChapter,
    project: BookProject,
    style: ArtStyleOption = 'realistic-photo',
    seed: number = Math.floor(Math.random() * 999999)
  ): Promise<BookImageItem> {
    const prompt = this.buildChapterPrompt(chapter, project, style, seed);
    const directUrl = this.getPollinationsUrl(prompt, 1024, 1024, seed);

    return {
      id: `img_ch_${chapter.index}_${Date.now()}`,
      name: `Ilustração Cap. ${chapter.index}: ${chapter.title.slice(0, 30)}`,
      dataUrl: directUrl,
      source: 'ai-generated',
      prompt,
      chapterIndex: chapter.index,
      createdAt: Date.now()
    };
  }

  /**
   * Gera um conjunto inicial de ilustrações automáticas para todos os capítulos da obra
   */
  public static generateInitialIllustrationsForProject(
    project: BookProject,
    style: ArtStyleOption = 'cinematic-3d'
  ): BookImageItem[] {
    const chapters = project.kdpChapters || [];
    const images: BookImageItem[] = [];

    // Imagem de capa principal
    const coverPrompt = this.buildCoverPrompt(project, style, '', 1);
    images.push({
      id: `img_cover_${project.id}`,
      name: `Arte de Capa Principal - ${project.title.slice(0, 25)}`,
      dataUrl: this.getPollinationsUrl(coverPrompt, 1200, 1800, 42),
      source: 'ai-generated',
      prompt: coverPrompt,
      createdAt: Date.now()
    });

    // Ilustrações para os primeiros capítulos
    chapters.slice(0, 8).forEach((ch, idx) => {
      const seed = 1000 + idx * 77;
      const prompt = this.buildChapterPrompt(ch, project, style, seed);
      images.push({
        id: `img_ch_${ch.index}_${seed}`,
        name: `Capítulo ${ch.index}: ${ch.title.slice(0, 25)}`,
        dataUrl: this.getPollinationsUrl(prompt, 1024, 1024, seed),
        source: 'ai-generated',
        prompt,
        chapterIndex: ch.index,
        createdAt: Date.now()
      });
    });

    return images;
  }

  // =========================================================================
  // INTEGRAÇÃO COM COMFYUI LOCAL (100% OFFLINE / GPU LOCAL)
  // Repositório: https://github.com/Comfy-Org/ComfyUI.git
  // API Padrão: http://127.0.0.1:8188
  // =========================================================================

  /**
   * Verifica em tempo real se o servidor ComfyUI local está rodando no computador
   */
  public static async checkComfyUIStatus(baseUrl: string = 'http://127.0.0.1:8188'): Promise<{
    online: boolean;
    gpuName?: string;
    vramFreeGb?: number;
    installedModels?: string[];
    error?: string;
  }> {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const statsRes = await fetch(`${cleanUrl}/system_stats`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!statsRes.ok) {
        return { online: false, error: `HTTP ${statsRes.status}` };
      }

      const statsData = await statsRes.json();
      const device = statsData.devices?.[0];
      const gpuName = device?.name || 'GPU Local Detectada';
      const vramFreeGb = device?.vram_free ? Math.round((device.vram_free / (1024 * 1024 * 1024)) * 10) / 10 : undefined;

      // Buscar modelos checkpoints instalados
      let installedModels: string[] = [];
      try {
        const modelsRes = await fetch(`${cleanUrl}/object_info/CheckpointLoaderSimple`);
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          const list = modelsData?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
          if (Array.isArray(list)) {
            installedModels = list;
          }
        }
      } catch {
        // Se falhar a busca de modelos, mantém lista vazia sem quebrar
      }

      return {
        online: true,
        gpuName,
        vramFreeGb,
        installedModels
      };
    } catch (err: any) {
      return {
        online: false,
        error: err.name === 'AbortError' ? 'Tempo de conexão esgotado (ComfyUI fechado)' : (err.message || 'ComfyUI offline')
      };
    }
  }

  /**
   * Constrói o fluxo JSON padrão de geração Text-to-Image para o ComfyUI
   */
  public static buildComfyUIWorkflow(params: {
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    seed?: number;
    modelName?: string;
    steps?: number;
    cfg?: number;
  }): Record<string, any> {
    const seed = params.seed ?? Math.floor(Math.random() * 1000000000);
    const width = params.width ?? 1024;
    const height = params.height ?? 1024;
    const model = params.modelName || 'sd_xl_base_1.0.safetensors';
    const steps = params.steps ?? 25;
    const cfg = params.cfg ?? 7.0;
    const neg = params.negativePrompt || 'text, watermark, low quality, deformed, blurry, ugly, bad anatomy, bad hands, cropped';

    return {
      "3": {
        "inputs": {
          "seed": seed,
          "steps": steps,
          "cfg": cfg,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": {
          "ckpt_name": model
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "width": width,
          "height": height,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": {
          "text": params.prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "text": neg,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "KDP_BookStudio",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      }
    };
  }

  /**
   * Envia uma tarefa de renderização para o ComfyUI Local e aguarda a imagem gerada
   */
  public static async generateWithComfyUI(params: {
    baseUrl?: string;
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    seed?: number;
    modelName?: string;
    onProgress?: (message: string) => void;
  }): Promise<string> {
    const baseUrl = (params.baseUrl || 'http://127.0.0.1:8188').replace(/\/+$/, '');
    const workflow = this.buildComfyUIWorkflow({
      prompt: params.prompt,
      negativePrompt: params.negativePrompt,
      width: params.width,
      height: params.height,
      seed: params.seed,
      modelName: params.modelName
    });

    params.onProgress?.('Enviando prompt para a fila do ComfyUI local...');

    const promptRes = await fetch(`${baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow })
    });

    if (!promptRes.ok) {
      const errText = await promptRes.text();
      throw new Error(`ComfyUI rejeitou o prompt: ${errText || promptRes.statusText}`);
    }

    const { prompt_id } = await promptRes.json();
    params.onProgress?.(`Renderizando na GPU local (ID da tarefa: ${prompt_id.slice(0, 8)})...`);

    // Polling até a imagem estar concluída (máximo de 90 segundos)
    const startTime = Date.now();
    while (Date.now() - startTime < 90000) {
      await new Promise(res => setTimeout(res, 1200));
      try {
        const histRes = await fetch(`${baseUrl}/history/${prompt_id}`);
        if (histRes.ok) {
          const histData = await histRes.json();
          if (histData[prompt_id]) {
            const outputs = histData[prompt_id].outputs;
            // Procura o nó de SaveImage (id 9)
            const saveNode = outputs?.['9'] || Object.values(outputs || {})[0] as any;
            const imgInfo = saveNode?.images?.[0];
            if (imgInfo) {
              params.onProgress?.('Imagem finalizada! Baixando arquivo...');
              const viewUrl = `${baseUrl}/view?filename=${encodeURIComponent(imgInfo.filename)}&subfolder=${encodeURIComponent(imgInfo.subfolder || '')}&type=${encodeURIComponent(imgInfo.type || 'output')}`;
              return await this.fetchImageAsDataUrl(viewUrl);
            }
          }
        }
      } catch (pollErr) {
        // Ignora erros temporários de rede no polling
      }
    }

    throw new Error('Tempo limite de renderização no ComfyUI atingido (90s).');
  }

  /**
   * Motor Híbrido Inteligente:
  // =========================================================================
  // INTEGRAÇÃO COM FLUX.1 LOCAL (BLACK FOREST LABS)
  // Repositório: https://github.com/black-forest-labs/flux
  // Servidor Local: http://127.0.0.1:8080
  // =========================================================================

  /**
   * Verifica se o servidor nativo de inferência local do repositório Black Forest Labs FLUX está ativo
   */
  public static async checkFluxLocalStatus(baseUrl: string = 'http://127.0.0.1:8080'): Promise<{
    online: boolean;
    model?: string;
    error?: string;
  }> {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${cleanUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        return { online: true, model: 'FLUX.1 [schnell/dev]' };
      }
      return { online: false, error: `HTTP ${res.status}` };
    } catch (err: any) {
      return { online: false, error: err.message || 'Servidor FLUX Local offline' };
    }
  }

  /**
   * Envia geração direta para o servidor local do FLUX (Black Forest Labs)
   */
  public static async generateWithFluxLocal(params: {
    baseUrl?: string;
    prompt: string;
    width?: number;
    height?: number;
    seed?: number;
    steps?: number;
    onProgress?: (message: string) => void;
  }): Promise<string> {
    const baseUrl = (params.baseUrl || 'http://127.0.0.1:8080').replace(/\/+$/, '');
    params.onProgress?.('Enviando prompt para o motor FLUX.1 Local (Black Forest Labs)...');

    const response = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        width: params.width || 1024,
        height: params.height || 1024,
        seed: params.seed,
        num_inference_steps: params.steps || 4
      })
    });

    if (!response.ok) {
      throw new Error(`Servidor FLUX Local retornou erro HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.image_base64) {
      return `data:image/png;base64,${data.image_base64}`;
    }
    if (data.image_url) {
      return data.image_url;
    }
    throw new Error('Formato de resposta inesperado do servidor FLUX local.');
  }

  /**
   * Motor Híbrido Inteligente:
   * Suporta ComfyUI Local (8188), Black Forest Labs FLUX Local (8080) e FLUX.1 Nuvem Instantâneo.
   */
  public static async generateSmartImage(params: {
    prompt: string;
    style?: ArtStyleOption;
    width?: number;
    height?: number;
    seed?: number;
    preferredEngine?: 'comfyui' | 'flux-local' | 'cloud-flux' | 'auto';
    comfyBaseUrl?: string;
    comfyModelName?: string;
    fluxLocalBaseUrl?: string;
    onProgress?: (message: string) => void;
  }): Promise<{ dataUrl: string; engineUsed: 'comfyui' | 'flux-local' | 'cloud-flux'; prompt: string }> {
    const style = params.style || 'realistic-photo';
    const preset = ART_STYLE_PRESETS.find(p => p.id === style);
    let finalPrompt = params.prompt.trim();
    if (preset && !finalPrompt.includes(preset.promptSuffix.slice(0, 15))) {
      finalPrompt = `${finalPrompt}, ${preset.promptSuffix}`;
    }

    const width = params.width || 1024;
    const height = params.height || 1024;
    const seed = params.seed ?? Math.floor(Math.random() * 900000) + 100000;
    const engine = params.preferredEngine || 'auto';

    // 1. Tenta FLUX Local Nativo se selecionado ou auto
    if (engine === 'flux-local' || engine === 'auto') {
      const fluxStatus = await this.checkFluxLocalStatus(params.fluxLocalBaseUrl);
      if (fluxStatus.online) {
        try {
          params.onProgress?.('Renderizando via Black Forest Labs FLUX.1 Local (GPU)...');
          const localDataUrl = await this.generateWithFluxLocal({
            baseUrl: params.fluxLocalBaseUrl,
            prompt: finalPrompt,
            width,
            height,
            seed,
            onProgress: params.onProgress
          });
          return { dataUrl: localDataUrl, engineUsed: 'flux-local', prompt: finalPrompt };
        } catch (fluxErr: any) {
          if (engine === 'flux-local') throw fluxErr;
        }
      } else if (engine === 'flux-local') {
        throw new Error(`Servidor FLUX Local não detectado em ${params.fluxLocalBaseUrl || 'http://127.0.0.1:8080'}.`);
      }
    }

    // 2. Tenta ComfyUI Local se selecionado ou auto
    if (engine === 'comfyui' || engine === 'auto') {
      const status = await this.checkComfyUIStatus(params.comfyBaseUrl);
      if (status.online) {
        try {
          params.onProgress?.(`Conectado ao ComfyUI Local (${status.gpuName || 'GPU'}). Renderizando 100% offline...`);
          const modelToUse = params.comfyModelName || status.installedModels?.[0] || 'sd_xl_base_1.0.safetensors';
          const localDataUrl = await this.generateWithComfyUI({
            baseUrl: params.comfyBaseUrl,
            prompt: finalPrompt,
            width,
            height,
            seed,
            modelName: modelToUse,
            onProgress: params.onProgress
          });
          return { dataUrl: localDataUrl, engineUsed: 'comfyui', prompt: finalPrompt };
        } catch (comfyError: any) {
          if (engine === 'comfyui') {
            throw comfyError;
          }
          params.onProgress?.(`ComfyUI falhou (${comfyError.message}). Alternando automaticamente para o motor FLUX.1 instantâneo...`);
        }
      } else if (engine === 'comfyui') {
        throw new Error(`ComfyUI não foi detectado em ${params.comfyBaseUrl || 'http://127.0.0.1:8188'}. Inicie o ComfyUI ou mude para o motor FLUX.1.`);
      }
    }

    // 3. Fallback ou Seleção Direta: Motor FLUX.1 Instantâneo
    params.onProgress?.('Gerando em alta resolução via motor FLUX.1 Neural...');
    const fluxUrl = this.getPollinationsUrl(finalPrompt, width, height, seed);
    return { dataUrl: fluxUrl, engineUsed: 'cloud-flux', prompt: finalPrompt };
  }
}
