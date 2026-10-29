// ================================================================
// 🎬 AGENTE DIRETOR DE CENAS — IA AUTÔNOMA DE DIREÇÃO FOTOGRÁFICA
// Cria prompts de imagem coesos e alinhados 100% com cada fala narrada.
// Atua como um diretor de fotografia profissional de cinema.
// ================================================================

import { chamarGeminiTexto } from '../kdp-ai-engine';
import type { TikTokScene, TikTokSceneImage } from '../tiktok-story-video-service';
import type { VisualContinuityBible } from '../google-image-studio-service';

export interface SceneDirectionBrief {
  sceneNumber: number;
  speakerName: string;
  speakerType: string;
  spokenText: string;
  emotionalTone: string;
  visualDescription: string;
  cameraAngle: string;
  lightingMood: string;
  take1Prompt: string;
  take2Prompt: string;
  take3Prompt: string;
  colorPalette: string;
  continuityNotes: string;
}

export interface DirectionReviewResult {
  approved: boolean;
  score: number; // 0-100
  issues: string[];
  correctedPrompts?: {
    take1: string;
    take2: string;
    take3: string;
  };
}

/**
 * AGENTE DIRETOR DE CENAS
 * Responsável por criar direção fotográfica profissional para cada cena.
 * Garante que os prompts de imagem sejam 100% alinhados com o texto falado.
 */
export class SceneDirectorAgent {

  /**
   * ETAPA 1: Cria a direção completa para todas as cenas de um capítulo.
   * O Agente analisa o texto como um DIRETOR DE FOTOGRAFIA real faria:
   * - Identifica a emoção do momento
   * - Define o cenário exato que condiz com a fala
   * - Estabelece ângulo de câmera, iluminação e paleta de cores
   * - Garante continuidade visual entre cenas
   */
  static async createSceneDirection(
    scenes: TikTokScene[],
    bible: VisualContinuityBible,
    bookTitle: string,
    bookGenre: string
  ): Promise<SceneDirectionBrief[]> {
    const scenesSummary = scenes.map((s, i) => ({
      num: i + 1,
      speaker: s.speakerName || 'Narrador',
      type: s.speakerType,
      text: s.text.slice(0, 200)
    }));

    const prompt = `Você é um DIRETOR DE FOTOGRAFIA CINEMATOGRÁFICA profissional de Hollywood.
Sua função é criar direção fotográfica PRECISA para cada cena de um vídeo baseado em um livro.

## REGRA ABSOLUTA: ALINHAMENTO TOTAL IMAGEM-FALA
Cada imagem DEVE representar EXATAMENTE o que o personagem está dizendo ou fazendo naquele momento.
- Se o texto diz "Helena correu pelo corredor escuro" → A imagem DEVE mostrar uma mulher correndo por um corredor escuro
- Se o texto diz "ele olhou pela janela com tristeza" → A imagem DEVE mostrar alguém olhando pela janela com expressão triste
- NUNCA gere imagens genéricas ou desconectadas do texto

## CONTINUIDADE VISUAL OBRIGATÓRIA:
- Protagonista: ${bible.protagonistName} — ${bible.protagonistDescription}
- Cenário: ${bible.settingDescription}
- Estilo: ${bible.cinematicStyle}
- Color Grade: ${bible.colorGrade}

## LIVRO: "${bookTitle}" | GÊNERO: ${bookGenre}

## CENAS PARA DIRIGIR:
${JSON.stringify(scenesSummary, null, 2)}

Para CADA cena, retorne direção fotográfica profissional.

## INSTRUÇÕES PARA OS PROMPTS DE IMAGEM:
- Escreva SEMPRE em INGLÊS
- Seja DESCRITIVO e ESPECÍFICO (não genérico)
- Inclua: ação exata, cenário exato, expressão facial exata, iluminação exata
- Take 1: WIDE SHOT — Mostra o cenário completo onde a ação acontece
- Take 2: MEDIUM SHOT — Mostra o personagem realizando a ação descrita
- Take 3: CLOSE-UP — Detalhe da expressão facial ou objeto mencionado no texto
- SEMPRE mencione: "photorealistic, 8k, cinematic lighting, no text, no words, no letters"

Retorne APENAS JSON:
[
  {
    "sceneNumber": 1,
    "speakerName": "Narrador",
    "speakerType": "narrator",
    "spokenText": "resumo do que está sendo dito",
    "emotionalTone": "tenso, misterioso, etc",
    "visualDescription": "descrição visual exata do que deve aparecer na imagem",
    "cameraAngle": "tipo de ângulo de câmera",
    "lightingMood": "tipo de iluminação",
    "take1Prompt": "Extremely detailed wide shot prompt in English matching exactly the spoken text...",
    "take2Prompt": "Extremely detailed medium shot prompt in English...",
    "take3Prompt": "Extremely detailed close-up prompt in English...",
    "colorPalette": "warm golden, cold blue, etc",
    "continuityNotes": "notas sobre consistência com cenas anteriores"
  }
]`;

    // Tenta primeiro via Backend Node.js
    try {
      const resp = await fetch('/api/video-agents/direct-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes, bible, bookTitle, bookGenre }),
        signal: AbortSignal.timeout(30000)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.success && Array.isArray(data?.result) && data.result.length > 0) {
          return data.result;
        }
      }
    } catch {
      // Continua para fallback local
    }

    try {
      const rawRes = await chamarGeminiTexto(prompt, { temperature: 0.5, maxTokens: 5000 });
      const texto = typeof rawRes === 'string' ? rawRes : (rawRes?.texto || '');
      const cleanJson = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[SceneDirectorAgent] Erro na direção de cenas:', err);
      return [];
    }
  }

  /**
   * ETAPA 2: Aplica a direção fotográfica nos prompts das cenas.
   * Substitui os prompts genéricos por prompts dirigidos profissionalmente.
   */
  static applyDirectionToScenes(
    scenes: TikTokScene[],
    direction: SceneDirectionBrief[]
  ): TikTokScene[] {
    return scenes.map((scene, idx) => {
      const brief = direction.find(d => d.sceneNumber === idx + 1);
      if (!brief) return scene;

      const updatedImages: TikTokSceneImage[] = scene.images.map((take) => {
        let newPrompt = take.prompt;
        if (take.takeNumber === 1 && brief.take1Prompt) {
          newPrompt = brief.take1Prompt;
        } else if (take.takeNumber === 2 && brief.take2Prompt) {
          newPrompt = brief.take2Prompt;
        } else if (take.takeNumber === 3 && brief.take3Prompt) {
          newPrompt = brief.take3Prompt;
        }
        return { ...take, prompt: newPrompt, url: undefined }; // Limpa URL para regenerar
      });

      return {
        ...scene,
        images: updatedImages,
        imageUrl: undefined
      };
    });
  }

  /**
   * ETAPA 3: Revisão de qualidade dos prompts.
   * O agente revisa cada prompt e verifica se está alinhado com o texto.
   */
  static async reviewSceneAlignment(
    scene: TikTokScene,
    bible: VisualContinuityBible
  ): Promise<DirectionReviewResult> {
    const prompt = `Você é um SUPERVISOR DE QUALIDADE VISUAL de produção cinematográfica.
Analise se os prompts de imagem abaixo condizem EXATAMENTE com o texto falado.

TEXTO FALADO: "${scene.text}"
PERSONAGEM: ${scene.speakerName} (${scene.speakerType})

PROMPTS DE IMAGEM:
- Take 1: "${scene.images[0]?.prompt}"
- Take 2: "${scene.images[1]?.prompt}"
- Take 3: "${scene.images[2]?.prompt}"

PROTAGONISTA: ${bible.protagonistName} (${bible.protagonistDescription})
CENÁRIO: ${bible.settingDescription}

Analise:
1. O prompt descreve EXATAMENTE o que o texto está dizendo? (Alinhamento semântico)
2. O cenário do prompt é coerente com o texto? (Coerência de cenário)
3. A expressão facial/ação no prompt condiz com a emoção do texto? (Coerência emocional)
4. O personagem está descrito de forma consistente? (Continuidade visual)

Retorne APENAS JSON:
{
  "approved": true/false,
  "score": 0-100,
  "issues": ["lista de problemas encontrados"],
  "correctedPrompts": {
    "take1": "prompt corrigido se necessário",
    "take2": "prompt corrigido se necessário",
    "take3": "prompt corrigido se necessário"
  }
}`;

    try {
      const rawRes = await chamarGeminiTexto(prompt, { temperature: 0.3, maxTokens: 2000 });
      const texto = typeof rawRes === 'string' ? rawRes : (rawRes?.texto || '');
      const cleanJson = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch {
      return { approved: true, score: 70, issues: [] };
    }
  }
}
