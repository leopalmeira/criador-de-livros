// ================================================================
// AGENTE DE DIREÇÃO VISUAL E GERAÇÃO REPLICATE DE IMAGENS DE CURSOS
// BookEngin — Prompts Visuais Estruturados e Geração Oficial via Replicate
// ================================================================

import { 
  CourseLesson, 
  CourseImagePlan, 
  CourseVisualArtStyle,
  CourseImageProfile
} from '../types/course-ebook';
import { gerarImagemReplicate } from './replicate-service';

export class CourseVisualDirector {
  /**
   * Constrói o plano visual de uma aula de acordo com o perfil de imagens escolhido
   */
  static buildImagePlanForLesson(
    lesson: CourseLesson,
    courseTitle: string,
    category: string,
    profile: CourseImageProfile = 'equilibrado',
    visualStyle: CourseVisualArtStyle = 'fotografia-tecnica-instrucional'
  ): CourseImagePlan[] {
    const plans: CourseImagePlan[] = [];
    const steps = lesson.stepByStepInstructions || [];

    // Determina quantos passos recebem imagens de acordo com o perfil
    let stepsToImage: number[] = [];
    if (profile === 'economico') {
      // 1 imagem da etapa mais relevante (passo 2 ou 1)
      stepsToImage = [steps.length > 1 ? 2 : 1];
    } else if (profile === 'equilibrado') {
      // 2 imagens (preparação + execução)
      stepsToImage = [1, Math.min(steps.length, 3)];
    } else {
      // Ilustrado: 3 ou mais passos ilustrados
      stepsToImage = steps.map(s => s.stepNumber).slice(0, 4);
    }

    stepsToImage.forEach((stepNum) => {
      const step = steps.find(s => s.stepNumber === stepNum) || steps[0];
      if (!step) return;

      const planId = `img_${lesson.id}_step${stepNum}_${Math.random().toString(36).substr(2, 6)}`;
      const prompt = this.composeReplicatePrompt({
        courseTitle,
        category,
        lessonTitle: lesson.title,
        stepNumber: stepNum,
        stepTitle: step.title,
        instruction: step.instruction,
        technicalNote: step.technicalNote,
        materials: lesson.requiredMaterials,
        visualStyle
      });

      plans.push({
        id: planId,
        lessonId: lesson.id,
        stepNumber: stepNum,
        title: `${step.title || `Passo ${stepNum}`}`,
        pedagogicalObjective: `Demonstração visual precisa de ${step.title.toLowerCase()}`,
        sceneDescription: step.instruction,
        actionExecuted: `Execução física do passo ${stepNum}: ${step.title}`,
        materialsAndTools: lesson.requiredMaterials.slice(0, 4),
        visualPrompt: prompt,
        negativePrompt: 'blurry, low resolution, distorted hands, extra fingers, cartoon, 3d render, watermark, text, typography, letters, signature, amateur lighting',
        aspectRatio: '3:4',
        status: 'pending'
      });
    });

    return plans;
  }

  /**
   * Constrói o prompt para a Capa Oficial do E-book de Curso
   */
  static buildCoverImagePlan(
    courseTitle: string,
    subtitle: string,
    category: string,
    visualStyle: CourseVisualArtStyle = 'fotografia-tecnica-instrucional'
  ): CourseImagePlan {
    const styleModifiers = this.getStyleModifiers(visualStyle, category);

    const prompt = `Professional masterclass educational course book clean background photograph representing "${courseTitle}". Beautiful, clean, realistic workshop or studio environment related to ${category}. Showcase authentic tools and materials neatly arranged, warm professional studio lighting, depth of field, premium editorial composition, high detail, 8k resolution. ${styleModifiers}. PURE CLEAN PHOTOGRAPHY, NO TEXT, NO LETTERS, NO TYPOGRAPHY, NO BADGES, NO LOGOS, NO SEALS, NO RIBBONS, NO GOLD MEDALS, NO WATERMARKS.`;

    return {
      id: `cover_plan_${Date.now()}`,
      lessonId: 'cover',
      stepNumber: 0,
      title: 'Capa Oficial do E-book de Curso',
      pedagogicalObjective: 'Impacto visual profissional e posicionamento comercial',
      sceneDescription: `Composição de capa de alto padrão representando ${courseTitle}`,
      actionExecuted: 'Apresentação visual da capacitação profissional',
      materialsAndTools: [],
      visualPrompt: prompt,
      negativePrompt: 'text, letters, words, typography, logo, watermark, badge, seal, medal, gold badge, ribbon, sticker, label, blurry, deformed, cartoon, low quality',
      aspectRatio: '3:4',
      status: 'pending'
    };
  }

  /**
   * Constrói prompt para imagem comparativa de Antes ou Depois
   */
  static buildBeforeAfterPrompt(params: {
    courseTitle: string;
    category: string;
    lessonTitle: string;
    isBefore: boolean;
    procedureDescription?: string;
  }): string {
    const categoryGuidance = this.getCategoryVisualGuidance(params.category);
    if (params.isBefore) {
      return `Detailed close-up realistic educational macro photograph showing the INITIAL UNTREATED CONDITION BEFORE PROCEDURE for "${params.lessonTitle}" in ${params.category}. Authentic raw surface, natural texture needing care or professional processing. Environment: ${categoryGuidance}. Clean neutral studio lighting, sharp focus, 8k, photorealistic. PURE PHOTOGRAPHY, NO TEXT, NO LETTERS, NO BADGES, NO LOGOS, NO WATERMARKS.`;
    } else {
      return `Detailed close-up realistic educational macro photograph showing the FLAWLESS FINISHED PROFESSIONAL OUTCOME AFTER PROCEDURE for "${params.lessonTitle}" in ${params.category}. Perfect clean alignment, polished execution, pristine craftsmanship. Environment: ${categoryGuidance}. Clean neutral studio lighting, sharp focus, 8k, photorealistic. PURE PHOTOGRAPHY, NO TEXT, NO LETTERS, NO BADGES, NO LOGOS, NO WATERMARKS.`;
    }
  }

  /**
   * Compõe um prompt visual específico, altamente detalhado para o Replicate FLUX.1 Schnell
   */
  static composeReplicatePrompt(params: {
    courseTitle: string;
    category: string;
    lessonTitle: string;
    stepNumber: number;
    stepTitle: string;
    instruction: string;
    technicalNote?: string;
    materials: string[];
    visualStyle: CourseVisualArtStyle;
  }): string {
    const categoryGuidance = this.getCategoryVisualGuidance(params.category);
    const styleModifier = this.getStyleModifiers(params.visualStyle, params.category);
    const toolsContext = params.materials.slice(0, 3).join(', ');

    return `Create a highly detailed educational instructional photograph for a professional course on "${params.courseTitle}". Show STEP ${params.stepNumber}: ${params.stepTitle}. Scene action: ${params.instruction.slice(0, 180)}. Authentic environment: ${categoryGuidance}. Relevant tools and materials in frame: ${toolsContext || 'standard professional tools'}. Three-quarter overhead camera angle, realistic texture, accurate tool proportions, clean composition, crisp focus, neutral studio lighting. This image represents practical step ${params.stepNumber}. ${styleModifier}. Avoid floating objects, avoid distorted hands, avoid incorrect geometry, avoid logos, watermarks, decorative text, letters, badges or stickers. Suitable for a printed technical manual.`;
  }

  /**
   * Executa a geração oficial via API do Replicate
   */
  static async generateImage(imagePlan: CourseImagePlan): Promise<{
    success: boolean;
    imageUrl?: string;
    imageDataUrl?: string;
    error?: string;
  }> {
    try {
      imagePlan.status = 'generating';
      const prompt = imagePlan.visualPrompt;
      const aspectRatio = imagePlan.aspectRatio || '3:4';

      const dataUrl = await gerarImagemReplicate(prompt, {
        aspectRatio: aspectRatio as any,
        model: 'black-forest-labs/flux-schnell'
      });

      if (!dataUrl) {
        throw new Error('O Replicate não retornou imagem válida.');
      }

      imagePlan.status = 'completed';
      imagePlan.imageDataUrl = dataUrl;
      imagePlan.imageUrl = dataUrl;
      imagePlan.modelUsed = 'black-forest-labs/flux-schnell';
      imagePlan.generatedAt = Date.now();

      return {
        success: true,
        imageUrl: dataUrl,
        imageDataUrl: dataUrl
      };
    } catch (err: any) {
      console.error(`[CourseVisualDirector] Falha ao gerar imagem "${imagePlan.title}":`, err.message);
      imagePlan.status = 'failed';
      imagePlan.errorMessage = err.message || 'Erro na chamada ao Replicate';

      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Regenera uma única imagem com ajuste opcional no prompt
   */
  static async regenerateSingleImage(
    imagePlan: CourseImagePlan,
    customInstructions?: string
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    if (customInstructions && customInstructions.trim()) {
      imagePlan.visualPrompt = `${imagePlan.visualPrompt}, ${customInstructions.trim()}`;
    }
    return this.generateImage(imagePlan);
  }

  // --- MODIFICADORES DE ESTILO E CATEGORIA ---

  private static getCategoryVisualGuidance(category: string): string {
    const cat = category.toLowerCase();
    if (cat.includes('marcenaria') || cat.includes('móveis') || cat.includes('reparos')) {
      return 'woodworking workshop, stable workbench, sawdust-free clean working surface, accurate carpenter tools';
    }
    if (cat.includes('confeitaria') || cat.includes('bolos') || cat.includes('culinária') || cat.includes('gastronomia')) {
      return 'professional kitchen or pastry studio, stainless steel and marble counters, spotless clean utensils, appetizing textures';
    }
    if (cat.includes('massagens') || cat.includes('estética') || cat.includes('beleza') || cat.includes('spa')) {
      return 'serene spa therapy room, neutral warm tones, clean massage table, bamboo and natural wellness elements, respectful ergonomic demonstration';
    }
    if (cat.includes('manicure') || cat.includes('unhas') || cat.includes('nail')) {
      return 'nail designer table with desk lamp, manicured hands, clean professional UV booth, files and sterile tools';
    }
    if (cat.includes('costura') || cat.includes('moda')) {
      return 'tailoring studio, cutting mat, measuring tape, tailor chalk, sharp shears, neat fabric folds';
    }
    if (cat.includes('elétrica') || cat.includes('manutenção') || cat.includes('encanamento') || cat.includes('mecânica')) {
      return 'technical workshop environment, organized tool tray, safety equipment, clear component visualization';
    }
    if (cat.includes('marketing') || cat.includes('informática') || cat.includes('programação') || cat.includes('ia')) {
      return 'modern creative workspace, desk setup, high-resolution monitor displaying clean wireframes or workflows, notebook with sketches';
    }
    if (cat.includes('jardinagem') || cat.includes('plantas') || cat.includes('paisagismo')) {
      return 'greenhouse potting bench, terracotta pots, rich potting soil, healthy green foliage, gardening trowel';
    }
    return 'organized professional work environment with relevant trade tools and natural lighting';
  }

  private static getStyleModifiers(style: CourseVisualArtStyle, category: string): string {
    switch (style) {
      case 'fotografia-tecnica-instrucional':
        return 'technical photography, sharp depth of field, realistic textures, balanced shadows, clear instructional clarity';
      case 'workshop-profissional-realista':
        return 'authentic workshop ambient photography, natural light, realistic workplace setting, high tactile realism';
      case 'estudio-culinario-iluminado':
        return 'bright culinary studio photography, soft diffusion, vibrant natural food colors, high gastronomy lighting';
      case 'macro-detalhes-passo-a-passo':
        return 'macro close-up photography focusing on tool contact and fine details, extreme sharpness, isolated depth of field';
      case 'manual-didatico-moderno':
        return 'clean editorial instructional style, pristine white or neutral background, museum quality lighting, technical manual photography';
      case 'diagrama-infografico-vetorial':
        return 'isometric clean presentation, hyper-detailed schematic photography, ultra clear separation of parts';
      default:
        return 'professional commercial photography, neutral lighting, 8k crisp details, instructional manual aesthetic';
    }
  }
}
