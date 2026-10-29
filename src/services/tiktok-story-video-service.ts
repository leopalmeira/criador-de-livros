// ============================================================================
// SERVIÇO DE VÍDEO STORY TIKTOK / REELS COM CENAS E VOZ NEURAL (BOOKENGIN)
// Converte capítulos do livro em vídeos virais verticais (9:16) ou horizontais (16:9)
// com 3 imagens por cena (Take 1, Take 2, Take 3), transições suaves em crossfade,
// efeito Ken Burns dinâmico, vozes neurais humanizadas e alternância de diálogos.
// ============================================================================

import { chamarGeminiTexto } from './kdp-ai-engine';
import { coAuthorVoiceService, type VoiceGender } from './coauthor-voice-service';
import { SceneVisualAuditor, type ImageAuditResult } from './scene-visual-auditor';
import { cinematicAudioDirector } from './cinematic-audio-director';
import {
  CinematicTransitionsEngine,
  type CinematicTransitionStyle,
  type TransitionRenderOptions
} from './cinematic-transitions-engine';
import {
  GoogleImageStudioService,
  type VisualContinuityBible,
  type VisualImageEngine
} from './google-image-studio-service';

export interface TikTokSceneImage {
  id: string;
  takeNumber: 1 | 2 | 3;
  label: string; // 'Take 1: Plano Aberto / Ambiente', 'Take 2: Clímax / Ação', 'Take 3: Close-up / Reação'
  prompt: string;
  url?: string;
  isAudited?: boolean;
  auditScore?: number;
  auditNotes?: string[];
  engineUsed?: string;
  isRealPhoto?: boolean;
}

export interface TikTokScene {
  id: string;
  sceneNumber: number;
  speakerType: 'narrator' | 'character_female' | 'character_male' | 'custom';
  speakerName?: string;
  voiceId?: string; // id da voz neural (ex: 'edge:pt-BR-FranciscaNeural', 'edge:pt-BR-AntonioNeural', etc.)
  text: string;
  speechText: string;
  images: TikTokSceneImage[]; // 3 takes por cena
  imagePrompt?: string; // Legado
  imageUrl?: string; // Legado (aponta para images[0].url)
  audioUrl?: string;
  audioDurationSec?: number;
  timeEstimateSec?: number;
  audioElement?: HTMLAudioElement;
}

export interface TikTokVoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male';
  role: 'narrator' | 'character_female' | 'character_male';
  description: string;
  friendlyTag: string;
}

export const AVAILABLE_TIKTOK_VOICES: TikTokVoiceOption[] = [
  {
    id: 'edge:pt-BR-FranciscaNeural',
    name: 'Francisca Neural',
    gender: 'female',
    role: 'narrator',
    description: 'Suave, calorosa e fluida. Perfeita para romances, dramas e narrações envolventes.',
    friendlyTag: 'Narradora Literária'
  },
  {
    id: 'edge:pt-BR-AntonioNeural',
    name: 'Antônio Neural',
    gender: 'male',
    role: 'narrator',
    description: 'Firme, madura e cinematográfica. Tom de suspense, thriller e autoridade épica.',
    friendlyTag: 'Narrador Épico'
  },
  {
    id: 'edge:pt-BR-ThalitaMultilingualNeural',
    name: 'Thalita Neural',
    gender: 'female',
    role: 'character_female',
    description: 'Expressiva, contemporânea e realista. Ótima para protagonistas femininas e diálogos.',
    friendlyTag: 'Protagonista Feminina'
  },
  {
    id: 'edge:pt-BR-BrendaNeural',
    name: 'Brenda Neural',
    gender: 'female',
    role: 'character_female',
    description: 'Jovem, vibrante e direta. Excelente para fantasia jovem, romance e BookTok viral.',
    friendlyTag: 'Jovem / BookTok'
  },
  {
    id: 'edge:pt-BR-FabioNeural',
    name: 'Fábio Neural',
    gender: 'male',
    role: 'character_male',
    description: 'Grave, intimista e denso. Ideal para antagonistas, investigadores e suspense policial.',
    friendlyTag: 'Investigador / Vilão'
  },
  {
    id: 'edge:pt-BR-DonatoNeural',
    name: 'Donato Neural',
    gender: 'male',
    role: 'character_male',
    description: 'Conversacional, jovem e ágil. Perfeito para diálogos rápidos e personagens dinâmicos.',
    friendlyTag: 'Protagonista Masculino'
  }
];

export interface TikTokStoryProject {
  chapterIndex: number;
  chapterTitle: string;
  bookTitle: string;
  bookGenre: string;
  voiceGender: VoiceGender;
  narratorVoiceId: string;
  characterFemaleVoiceId: string;
  characterMaleVoiceId: string;
  aspectRatio: '9:16' | '16:9';
  showSubtitles: boolean;
  showTopHeader: boolean;
  scenes: TikTokScene[];
  totalDurationSec: number;
  visualBible?: VisualContinuityBible;
  transitionStyle?: CinematicTransitionStyle;
  imageEngine?: VisualImageEngine;
}

export class TikTokStoryVideoService {
  /**
   * Adiciona uma nova cena personalizada permitindo total liberdade de quantidade
   */
  public static addScene(
    currentScenes: TikTokScene[],
    atIndex?: number,
    defaultVoiceId: string = 'edge:pt-BR-FranciscaNeural'
  ): TikTokScene[] {
    const newIdx = atIndex !== undefined ? atIndex : currentScenes.length;
    const newSceneNumber = newIdx + 1;
    const now = Date.now();

    const basePrompt = `Cinematic intense scene ${newSceneNumber}, dramatic atmospheric lighting, 8k, photorealistic masterpiece, no text`;

    const newScene: TikTokScene = {
      id: `scene-custom-${now}-${Math.random().toString(36).slice(2, 6)}`,
      sceneNumber: newSceneNumber,
      speakerType: 'narrator',
      speakerName: 'Narrador',
      voiceId: defaultVoiceId,
      text: `Nova cena ${newSceneNumber}. Descreva a narração ou diálogo aqui...`,
      speechText: `Nova cena ${newSceneNumber}.`,
      images: [
        {
          id: `take-${newSceneNumber}-1-${now}`,
          takeNumber: 1,
          label: 'Take 1: Plano Aberto (Ambiente)',
          prompt: `Wide establishing landscape, ${basePrompt}`
        },
        {
          id: `take-${newSceneNumber}-2-${now}`,
          takeNumber: 2,
          label: 'Take 2: Plano Médio (Clímax/Ação)',
          prompt: `Medium action shot, character gesturing, ${basePrompt}`
        },
        {
          id: `take-${newSceneNumber}-3-${now}`,
          takeNumber: 3,
          label: 'Take 3: Close-up (Detalhe/Emoção)',
          prompt: `Intense close-up, dramatic facial expression, ${basePrompt}`
        }
      ],
      timeEstimateSec: 9
    };

    const updated = [...currentScenes];
    updated.splice(newIdx, 0, newScene);
    return updated.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
  }

  /**
   * Remove uma cena da lista e renumera as restantes
   */
  public static removeScene(currentScenes: TikTokScene[], sceneIndex: number): TikTokScene[] {
    if (currentScenes.length <= 1) return currentScenes; // Mantém pelo menos 1 cena
    const filtered = currentScenes.filter((_, idx) => idx !== sceneIndex);
    return filtered.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
  }

  /**
   * Reordena cenas para controle completo da narrativa
   */
  public static reorderScenes(currentScenes: TikTokScene[], fromIndex: number, toIndex: number): TikTokScene[] {
    const list = [...currentScenes];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    return list.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
  }

  /**
   * Decompõe o texto do capítulo em cenas cinematográficas marcantes,
   * gerando para CADA CENA exatamente 3 takes visuais com ângulos e enquadramentos distintos
   * ancorados na Bíblia de Continuidade Visual (mesmo personagem, mesma iluminação).
   */
  /**
   * MAPA AUTOMÁTICO DE VOZES POR TIPO DE FALANTE
   * O sistema atribui vozes diferentes automaticamente sem intervenção do usuário
   */
  private static readonly AUTO_VOICE_MAP: Record<string, string> = {
    'narrator': 'edge:pt-BR-FranciscaNeural',
    'character_female': 'edge:pt-BR-ThalitaMultilingualNeural',
    'character_female_2': 'edge:pt-BR-BrendaNeural',
    'character_male': 'edge:pt-BR-AntonioNeural',
    'character_male_2': 'edge:pt-BR-FabioNeural',
    'character_male_3': 'edge:pt-BR-DonatoNeural',
    'custom': 'edge:pt-BR-FranciscaNeural'
  };

  /**
   * Atribui voz automaticamente baseado no nome do personagem e tipo de falante.
   * Personagens diferentes recebem vozes diferentes automaticamente.
   */
  private static autoAssignVoice(
    speakerType: string,
    speakerName: string,
    characterVoiceTracker: Map<string, string>
  ): string {
    if (speakerType === 'narrator') return this.AUTO_VOICE_MAP['narrator'];

    const nameKey = (speakerName || '').toLowerCase().trim();
    if (characterVoiceTracker.has(nameKey)) {
      return characterVoiceTracker.get(nameKey)!;
    }

    // Atribui a próxima voz disponível para este personagem
    const usedVoices = new Set(characterVoiceTracker.values());
    const femaleVoices = ['edge:pt-BR-ThalitaMultilingualNeural', 'edge:pt-BR-BrendaNeural'];
    const maleVoices = ['edge:pt-BR-AntonioNeural', 'edge:pt-BR-FabioNeural', 'edge:pt-BR-DonatoNeural'];

    const pool = speakerType.includes('female') ? femaleVoices : maleVoices;
    const available = pool.find(v => !usedVoices.has(v)) || pool[0];

    characterVoiceTracker.set(nameKey, available);
    return available;
  }

  /**
   * Higieniza texto narrado/falado removendo reticências artificiais ("...")
   * que quebram o ritmo da voz neural e da legenda.
   */
  public static sanitizeSpokenText(rawText: string): string {
    if (!rawText) return '';
    let t = String(rawText)
      .replace(/^\s*(?:\.{2,}|…+)\s*/g, '')
      .replace(/\s*(?:\.{2,}|…+)\s*$/g, '.')
      .replace(/\s*(?:\.{2,}|…+)\s+([a-zà-ú])/g, ', $1')
      .replace(/\s*(?:\.{2,}|…+)\s+([A-ZÀ-Ú])/g, '. $1')
      .replace(/\s*(?:\.{2,}|…+)\s*/g, ', ')
      .replace(/,\s*,+/g, ',')
      .replace(/\.\s*\.+/g, '.')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (t && !/[.!?"]$/.test(t)) {
      t += '.';
    }
    return t;
  }

  /**
   * Detecta se um texto é narração em 3ª pessoa (ex: "Ela precisava...", "Helena caminhou...")
   * para impedir atribuição incorreta à voz de personagem em vez do Narrador.
   */
  public static isThirdPersonNarration(text: string, speakerName?: string): boolean {
    if (!text) return false;
    const clean = text.replace(/^["'“”«»—–\-\s]+/, '').trim();
    if (/^(ela|ele|eles|elas)\s+(precisava|sabia|sentia|olhou|caminhou|correu|abriu|fechou|pensou|viu|ouviu|estava|tinha|era|foi|decidiu|percebeu|entrou|saiu|respirou|hesitou|lembrou|tentou|queria)\b/i.test(clean)) {
      return true;
    }
    if (speakerName && speakerName !== 'Narrador') {
      const escaped = speakerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const thirdPersonNameRegex = new RegExp(`^${escaped}\\s+(olhou|caminhou|sentiu|pensou|abriu|fechou|correu|disse|falou|respondeu|sabia|precisava|estava|tinha|viu|ouviu|entrou|saiu)\\b`, 'i');
      if (thirdPersonNameRegex.test(clean)) return true;
    }
    if (/\b(na mente dela|na mente dele|em sua mente|o próprio escritório|encará-lo|encarar o marido)\b/i.test(clean) && !/\b(eu|meu|minha|estou|vou|preciso|sei|quero)\b/i.test(clean)) {
      return true;
    }
    return false;
  }

  public static async analyzeChapterIntoScenes(
    bookTitle: string,
    chapterTitle: string,
    chapterText: string,
    genre: string = 'Ficção',
    targetScenesCount: number = 5,
    defaultVoiceId: string = 'edge:pt-BR-FranciscaNeural'
  ): Promise<{ scenes: TikTokScene[]; visualBible: VisualContinuityBible }> {
    const bible = GoogleImageStudioService.createDefaultVisualBible(bookTitle, genre);

    // 1. TENTA PRIMEIRO O AGENTE DE ROTEIRO CINEMATOGRÁFICO NO BACKEND (/api/video-agents/analyze-chapter)
    try {
      const backendResp = await fetch('/api/video-agents/analyze-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle,
          chapterTitle,
          chapterText,
          bookGenre: genre,
          targetScenesCount,
          bible
        }),
        signal: AbortSignal.timeout(35000)
      });

      if (backendResp.ok) {
        const backendData = await backendResp.json();
        const parsedResult = backendData?.result;
        const backendScenes = parsedResult?.scenes || [];
        const backendBible: VisualContinuityBible = parsedResult?.visualContinuity || bible;

        if (Array.isArray(backendScenes) && backendScenes.length > 0) {
          const characterVoiceTracker = new Map<string, string>();
          const scenes: TikTokScene[] = backendScenes.map((item: any, idx: number) => {
            let text = this.sanitizeSpokenText(item.text || `Cena ${idx + 1} da história.`);
            let speakerType = (item.speakerType as TikTokScene['speakerType']) || 'narrator';
            let speakerName = item.speakerName || 'Narrador';

            if (speakerType !== 'narrator' && this.isThirdPersonNarration(text, speakerName)) {
              speakerType = 'narrator';
              speakerName = 'Narrador';
              text = text.replace(/^["“”]+|["“”]+$/g, '').trim();
            }

            const voiceId = this.autoAssignVoice(speakerType, speakerName, characterVoiceTracker);
            const basePrompt = `cinematic scene of ${genre} novel, ${backendBible.protagonistDescription}, ${backendBible.cinematicStyle}, dramatic lighting, 8k resolution, photorealistic masterpiece, no text`;
            const take1 = item.take1Prompt || `Wide establishing shot of Scene ${idx + 1}, ${basePrompt}`;
            const take2 = item.take2Prompt || `Medium action shot of Scene ${idx + 1}, ${basePrompt}`;
            const take3 = item.take3Prompt || `Extreme close-up shot of Scene ${idx + 1}, ${basePrompt}`;

            const images: TikTokSceneImage[] = [
              { id: `take-${idx + 1}-1-${Date.now()}`, takeNumber: 1, label: 'Take 1: Plano Aberto (Ambiente)', prompt: take1 },
              { id: `take-${idx + 1}-2-${Date.now()}`, takeNumber: 2, label: 'Take 2: Plano Médio (Clímax/Ação)', prompt: take2 },
              { id: `take-${idx + 1}-3-${Date.now()}`, takeNumber: 3, label: 'Take 3: Close-up (Detalhe/Emoção)', prompt: take3 }
            ];

            return {
              id: `scene-${Date.now()}-${idx}`,
              sceneNumber: idx + 1,
              speakerType,
              speakerName,
              voiceId,
              text,
              speechText: coAuthorVoiceService.cleanTextForSpeech(text),
              images,
              imagePrompt: take1,
              timeEstimateSec: Math.max(8, Math.round((text.split(/\s+/).length || 20) / 2.5))
            };
          });

          return { scenes, visualBible: backendBible };
        }
      }
    } catch (backendErr) {
      console.warn('[TikTokService] Backend analyze-chapter indisponível, usando motor cliente:', backendErr);
    }

    const prompt = `Você é um diretor cinematográfico e roteirista profissional de audiobooks e vídeos virais BookTok.
Analise o capítulo e transforme-o em ${targetScenesCount} cenas CRONOLÓGICAS e SEM REPETIÇÃO.

## REGRAS INVIOLÁVEIS DE ROTEIRO E NARRAÇÃO:
1. PROGRESSÃO CRONOLÓGICA SEM REPETIÇÃO:
   - Cada cena (Cena 1 a Cena ${targetScenesCount}) deve avançar a história para um NOVO momento.
   - PROIBIDO repetir a mesma frase, ação ou ideia entre duas cenas consecutivas.
2. PROIBIDO USAR RETICÊNCIAS ("..."):
   - NUNCA inicie frases com "..." e NUNCA espalhe "..." pelo texto. Use vírgulas e pontos finais limpos.
3. DISTINÇÃO ESTRITA ENTRE NARRADOR (3ª PESSOA) E PERSONAGEM (1ª PESSOA):
   - "narrator" (speakerName: "Narrador") → Qualquer frase em 3ª pessoa ("Ela precisava...", "Helena entrou no carro...", "O vento cortava a avenida...").
   - "character_female" / "character_male" → EXCLUSIVAMENTE fala direta em 1ª pessoa ("Eu preciso descobrir a verdade", "Não confie nele, Helena").
4. ALINHAMENTO VISUAL E DIVERSIDADE DE TAKES:
   - Todos os ${targetScenesCount * 3} prompts de imagem em inglês devem descrever ações, ângulos e detalhes diferentes.

## CONTINUIDADE VISUAL:
- Protagonista: "${bible.protagonistName}" (${bible.protagonistDescription})
- Cenário: ${bible.settingDescription}
- Estilo: ${bible.cinematicStyle}, ${bible.colorGrade}

Livro: "${bookTitle}" | Capítulo: "${chapterTitle}" | Gênero: "${genre}"

Texto:
"""
${chapterText.slice(0, 4500)}
"""

Retorne APENAS JSON:
{
  "visualContinuity": {
    "protagonistName": "${bible.protagonistName}",
    "protagonistDescription": "${bible.protagonistDescription}",
    "settingDescription": "${bible.settingDescription}",
    "cinematicStyle": "${bible.cinematicStyle}",
    "colorGrade": "${bible.colorGrade}"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "speakerType": "narrator",
      "speakerName": "Narrador",
      "text": "Texto da narração em 3ª pessoa sem reticências (22-42 palavras).",
      "take1Prompt": "Wide establishing shot in English matching scene 1, ${bible.colorGrade}, 8k, no text",
      "take2Prompt": "Medium action shot in English matching scene 1, atmospheric, no text",
      "take3Prompt": "Extreme close-up in English matching scene 1 emotion, no text"
    }
  ]
}`;

    try {
      const rawRes = await chamarGeminiTexto(prompt, { temperature: 0.6, maxTokens: 4000 });
      const texto = typeof rawRes === 'string' ? rawRes : (rawRes?.texto || '');
      const cleanJson = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const parsedScenes = Array.isArray(parsed) ? parsed : (parsed?.scenes || []);
      const parsedBible: VisualContinuityBible = parsed?.visualContinuity || bible;

      if (Array.isArray(parsedScenes) && parsedScenes.length > 0) {
        const characterVoiceTracker = new Map<string, string>();

        const scenes = parsedScenes.map((item, idx) => {
          let text = this.sanitizeSpokenText(item.text || `Cena ${idx + 1} da história.`);
          let speakerType = (item.speakerType as TikTokScene['speakerType']) || 'narrator';
          let speakerName = item.speakerName || 'Narrador';

          if (speakerType !== 'narrator' && this.isThirdPersonNarration(text, speakerName)) {
            speakerType = 'narrator';
            speakerName = 'Narrador';
            text = text.replace(/^["“”]+|["“”]+$/g, '').trim();
          }

          const voiceId = this.autoAssignVoice(speakerType, speakerName, characterVoiceTracker);

          const basePrompt = `cinematic scene of ${genre} novel, ${parsedBible.protagonistDescription}, ${parsedBible.cinematicStyle}, dramatic lighting, 8k resolution, photorealistic masterpiece, no text`;
          const take1 = item.take1Prompt || item.imagePrompt || `Wide establishing shot, ${basePrompt}`;
          const take2 = item.take2Prompt || `Medium shot, character and action, ${basePrompt}`;
          const take3 = item.take3Prompt || `Intense close-up portrait, dramatic expression, ${basePrompt}`;

          const images: TikTokSceneImage[] = [
            { id: `take-${idx + 1}-1-${Date.now()}`, takeNumber: 1, label: 'Take 1: Plano Aberto (Ambiente)', prompt: take1 },
            { id: `take-${idx + 1}-2-${Date.now()}`, takeNumber: 2, label: 'Take 2: Plano Médio (Clímax/Ação)', prompt: take2 },
            { id: `take-${idx + 1}-3-${Date.now()}`, takeNumber: 3, label: 'Take 3: Close-up (Detalhe/Emoção)', prompt: take3 }
          ];

          return {
            id: `scene-${Date.now()}-${idx}`,
            sceneNumber: idx + 1,
            speakerType,
            speakerName,
            voiceId,
            text,
            speechText: coAuthorVoiceService.cleanTextForSpeech(text),
            images,
            imagePrompt: take1,
            timeEstimateSec: Math.max(8, Math.round((text.split(/\s+/).length || 20) / 2.5))
          };
        });

        return { scenes, visualBible: parsedBible };
      }
    } catch (err) {
      console.warn('[TikTokService] Fallback heurístico de cenas com 3 takes:', err);
    }

    // Fallback heurístico inteligente: divide os parágrafos do capítulo em frases completas sem cortar no meio
    const paras = chapterText
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 35 && !p.startsWith('#'));
    const step = Math.max(1, Math.floor(paras.length / targetScenesCount));
    const fallbackScenes: TikTokScene[] = [];

    for (let i = 0; i < Math.min(targetScenesCount, Math.max(1, paras.length)); i++) {
      const p = paras[i * step] || paras[i] || `Cena ${i + 1} do capítulo ${chapterTitle}.`;
      const sentences = p.match(/[^.!?]+[.!?]+/g) || [p];
      let text = '';
      for (const s of sentences) {
        if ((text + ' ' + s).trim().length <= 240 || !text) {
          text = (text + ' ' + s).trim();
        } else {
          break;
        }
      }
      text = this.sanitizeSpokenText(text.slice(0, 260));
      const basePrompt = `Cinematic dramatic scene ${i + 1} for book "${bookTitle}", chapter "${chapterTitle}", depicting "${text.slice(0, 90)}", ${bible.protagonistDescription}, ${bible.cinematicStyle}, ultra detailed, volumetric lighting, photorealistic, no text`;

      const images: TikTokSceneImage[] = [
        {
          id: `take-${i + 1}-1-${Date.now()}`,
          takeNumber: 1,
          label: 'Take 1: Plano Aberto (Ambiente)',
          prompt: `Wide establishing landscape shot of scene ${i + 1}, ${basePrompt}`
        },
        {
          id: `take-${i + 1}-2-${Date.now()}`,
          takeNumber: 2,
          label: 'Take 2: Plano Médio (Clímax/Ação)',
          prompt: `Medium action shot of scene ${i + 1}, dynamic camera angle, ${basePrompt}`
        },
        {
          id: `take-${i + 1}-3-${Date.now()}`,
          takeNumber: 3,
          label: 'Take 3: Close-up (Detalhe/Emoção)',
          prompt: `Intense close-up portrait of scene ${i + 1}, high emotional tension, ${basePrompt}`
        }
      ];

      fallbackScenes.push({
        id: `scene-fallback-${Date.now()}-${i}`,
        sceneNumber: i + 1,
        speakerType: 'narrator',
        speakerName: 'Narrador',
        voiceId: defaultVoiceId,
        text,
        speechText: coAuthorVoiceService.cleanTextForSpeech(text),
        images,
        imagePrompt: images[0].prompt,
        timeEstimateSec: Math.max(8, Math.round(text.split(/\s+/).length / 2.5))
      });
    }

    return { scenes: fallbackScenes, visualBible: bible };
  }

  /**
   * Gera a imagem do take da cena usando a engine de IA visual (Google / Replicate / Fotos Reais) com auditoria anti-alucinação
   */
  public static async generateSceneImage(
    prompt: string,
    aspectRatio: '9:16' | '16:9' = '9:16',
    sceneText?: string,
    takeLabel?: string,
    bookGenre?: string,
    engine: VisualImageEngine = 'hybrid-auto',
    bible?: VisualContinuityBible,
    takeNumber: 1 | 2 | 3 = 1,
    sceneNumber: number = 1
  ): Promise<{ url: string; audit: ImageAuditResult; engineUsed: string; isRealPhoto: boolean }> {
    const audit = SceneVisualAuditor.buildAuditedPrompt(
      prompt,
      sceneText || '',
      takeLabel,
      bookGenre
    );

    const { url, engineUsed, isRealPhoto } = await GoogleImageStudioService.generateImageWithEngine(
      audit.auditedPrompt,
      sceneText || '',
      engine,
      aspectRatio,
      takeNumber,
      bible,
      sceneNumber
    );

    return { url, audit, engineUsed, isRealPhoto };
  }

  /**
   * Sintetiza o áudio da cena com a voz neural escolhida pelo usuário
   */
  public static async synthesizeSceneAudio(
    text: string,
    voiceGender: VoiceGender = 'female',
    lang: string = 'pt-BR',
    voiceId?: string
  ): Promise<{ audioUrl: string; durationSec: number }> {
    const clean = coAuthorVoiceService.cleanTextForSpeech(text);
    const textToSpeak = /[.!?…;:]$/.test(clean.trim()) ? clean.trim() : `${clean.trim()}.`;

    // 1. Tenta endpoint primário de áudio neural (/api/audiobook/preview-voice)
    let blob: Blob | null = null;
    try {
      const res = await fetch('/api/audiobook/preview-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: lang,
          voiceGender,
          voiceId: voiceId || undefined,
          text: textToSpeak
        })
      });
      if (res.ok) {
        blob = await res.blob();
      }
    } catch (e) {
      console.warn('[TikTokService] Endpoint preview-voice falhou, tentando fallback:', e);
    }

    // 2. Tenta rota secundária (/api/tts/synthesize)
    if (!blob || blob.size < 200) {
      try {
        const res2 = await fetch('/api/tts/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            lang,
            voiceGender,
            voiceId: voiceId || undefined
          })
        });
        if (res2.ok) {
          blob = await res2.blob();
        }
      } catch (e2) {
        console.warn('[TikTokService] Falha na síntese neural secundária:', e2);
      }
    }

    if (blob && blob.size > 200) {
      const audioUrl = URL.createObjectURL(blob);
      const durationSec = await this.getAudioDuration(audioUrl);
      return { audioUrl, durationSec };
    }

    // Fallback: estima duração pela taxa média de leitura humana
    const estimatedSec = Math.max(6, Math.round(text.split(/\s+/).length / 2.7));
    return { audioUrl: '', durationSec: estimatedSec };
  }

  /**
   * Mede a duração real do áudio em segundos
   */
  public static getAudioDuration(audioUrl: string): Promise<number> {
    return new Promise((resolve) => {
      const a = new Audio(audioUrl);
      a.onloadedmetadata = () => {
        resolve(a.duration || 8);
      };
      a.onerror = () => {
        resolve(8);
      };
      setTimeout(() => resolve(8), 3000);
    });
  }

  /**
   * Renderiza um frame do vídeo com animação Ken Burns, transição suave crossfade
   * entre os 3 takes da cena (ou entre cenas) e legendas dinâmicas customizáveis.
   */
  public static renderVideoFrame(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    currentImg: HTMLImageElement | null,
    nextImg: HTMLImageElement | null,
    sceneProgress: number, // 0..1 (progresso do take atual)
    transitionAlpha: number, // 0..1 (opacidade do crossfade)
    captionText: string,
    bookTitle: string,
    sceneIndex: number,
    totalScenes: number,
    takeIndex: number = 0, // 0, 1 ou 2
    options: {
      showSubtitles?: boolean;
      showTopHeader?: boolean;
      speakerName?: string;
      transitionStyle?: CinematicTransitionStyle;
      visualEffects?: string[];
    } = {}
  ): void {
    const w = canvas.width;
    const h = canvas.height;
    const {
      showSubtitles = true,
      showTopHeader = true,
      speakerName = '',
      transitionStyle = 'adaptiveCinema',
      visualEffects = ['film-grain-35mm', 'vignette-dramatic']
    } = options;

    // Fundo cinematográfico escuro
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, w, h);

    // Efeito Ken Burns por take:
    // Take 1: zoom in suave (1.00x a 1.07x)
    // Take 2: pan suave + zoom leve (1.03x a 1.09x)
    // Take 3: zoom out dramático (1.08x a 1.01x)
    let zoomScale = 1.0 + (sceneProgress * 0.07);
    let panOffsetX = 0;

    if (takeIndex === 1) {
      zoomScale = 1.03 + (sceneProgress * 0.06);
      panOffsetX = (sceneProgress - 0.5) * (w * 0.04);
    } else if (takeIndex === 2) {
      zoomScale = 1.08 - (sceneProgress * 0.06);
      panOffsetX = (0.5 - sceneProgress) * (w * 0.03);
    }

    // Desenha imagem com cover e escala centralizada
    const drawCoverImage = (img: HTMLImageElement, alpha: number, scale: number, offsetX: number = 0) => {
      if (!img || !img.complete || img.naturalWidth === 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = w / h;

      let drawW = w;
      let drawH = h;
      if (imgAspect > canvasAspect) {
        drawH = h;
        drawW = h * imgAspect;
      } else {
        drawW = w;
        drawH = w / imgAspect;
      }

      drawW *= scale;
      drawH *= scale;

      const drawX = ((w - drawW) / 2) + offsetX;
      const drawY = (h - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    };

    // 1. Renderização das Imagens com Transições Cinematográficas Profissionais
    const effectiveStyle = CinematicTransitionsEngine.resolveStyle(transitionStyle, takeIndex, sceneIndex);

    if (nextImg && transitionAlpha > 0) {
      // Executa transição cinematográfica (Remotion Zoom-Through, 35mm Film Burn, Whip-Pan ou Dip-to-Black)
      CinematicTransitionsEngine.renderTransition(
        ctx,
        w,
        h,
        currentImg,
        nextImg,
        transitionAlpha,
        { style: effectiveStyle }
      );
    } else if (currentImg) {
      drawCoverImage(currentImg, 1.0, zoomScale, panOffsetX);
    }

    // 2. Camada de Efeitos Especiais Cinematográficos (VFX 35mm dirigidos pelo Agente)
    if (Array.isArray(visualEffects) && visualEffects.length > 0) {
      ctx.save();
      if (visualEffects.includes('vignette-dramatic')) {
        const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, h * 0.68);
        vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vig.addColorStop(1, 'rgba(3, 3, 10, 0.58)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
      }
      if (visualEffects.includes('light-leak-warm')) {
        const leakX = w * (0.15 + Math.sin(sceneProgress * Math.PI) * 0.2);
        const leakY = h * 0.25;
        const leak = ctx.createRadialGradient(leakX, leakY, 10, leakX, leakY, w * 0.7);
        leak.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
        leak.addColorStop(0.5, 'rgba(217, 119, 6, 0.08)');
        leak.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = leak;
        ctx.fillRect(0, 0, w, h);
      }
      if (visualEffects.includes('anamorphic-flare')) {
        const flareY = h * (0.34 + takeIndex * 0.08);
        const flare = ctx.createLinearGradient(0, flareY - 8, w, flareY + 8);
        flare.addColorStop(0, 'rgba(56, 189, 248, 0)');
        flare.addColorStop(0.5, 'rgba(56, 189, 248, 0.16)');
        flare.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = flare;
        ctx.fillRect(0, flareY - 18, w, 36);
      }
      if (visualEffects.includes('fog-haze')) {
        const fog = ctx.createLinearGradient(0, h * 0.45, 0, h);
        fog.addColorStop(0, 'rgba(148, 163, 184, 0)');
        fog.addColorStop(0.6, 'rgba(148, 163, 184, 0.12)');
        fog.addColorStop(1, 'rgba(30, 41, 59, 0.22)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, h * 0.45, w, h * 0.55);
      }
      if (visualEffects.includes('rain-mist')) {
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.16)';
        ctx.lineWidth = 1.2;
        for (let r = 0; r < 24; r++) {
          const rx = ((r * 97 + Math.round(sceneProgress * 450)) % w);
          const ry = ((r * 131 + Math.round(sceneProgress * 950)) % h);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 6, ry + 28);
          ctx.stroke();
        }
      }
      if (visualEffects.includes('dust-particles')) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
        for (let p = 0; p < 18; p++) {
          const px = ((p * 83 + Math.round(sceneProgress * 180)) % w);
          const py = ((p * 157 - Math.round(sceneProgress * 220) + h) % h);
          const radius = (p % 3) + 1.2;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (visualEffects.includes('heartbeat-pulse')) {
        const pulse = Math.abs(Math.sin(sceneProgress * Math.PI * 6)) * 0.18;
        const hb = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, h * 0.65);
        hb.addColorStop(0, 'rgba(0, 0, 0, 0)');
        hb.addColorStop(1, `rgba(153, 27, 27, ${pulse.toFixed(3)})`);
        ctx.fillStyle = hb;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }

    // 3. Vinheta e gradientes suaves para legibilidade cinematográfica
    if (showTopHeader) {
      const topGradient = ctx.createLinearGradient(0, 0, 0, h * 0.18);
      topGradient.addColorStop(0, 'rgba(0, 0, 0, 0.70)');
      topGradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = topGradient;
      ctx.fillRect(0, 0, w, h * 0.18);
    }

    if (showSubtitles && captionText) {
      const bottomGradient = ctx.createLinearGradient(0, h * 0.65, 0, h);
      bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
      bottomGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.65)');
      bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
      ctx.fillStyle = bottomGradient;
      ctx.fillRect(0, h * 0.65, w, h * 0.35);
    }

    // 4. Cabeçalho Superior Discreto (se ativado)
    if (showTopHeader) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 8;
      ctx.fillText(bookTitle.toUpperCase(), w / 2, 55);

      // Indicador da Cena e Take (ex: "PARTE 2 DE 5 • TAKE 1/3")
      ctx.fillStyle = '#f59e0b';
      ctx.font = '800 13px -apple-system, sans-serif';
      ctx.fillText(`CENA ${sceneIndex + 1} DE ${totalScenes} • TAKE ${takeIndex + 1}/3`, w / 2, 82);
      ctx.restore();
    }

    // 5. Legendas Dinâmicas no Rodapé (Área inferior segura do TikTok/Reels)
    if (showSubtitles && captionText) {
      ctx.save();
      const fontSize = Math.round(w * 0.044); // ~32px em 720p
      ctx.font = `800 ${fontSize}px -apple-system, BlinkMacSystemFont, "Montserrat", "Inter", sans-serif`;
      ctx.textAlign = 'center';

      // Quebra o texto em linhas de até ~30 caracteres
      const words = captionText.split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length <= 26) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);

      const lineHeight = fontSize * 1.32;
      const totalTextH = lines.length * lineHeight;
      // Posiciona no terço inferior (Y ~ 80% do canvas), deixando o centro da imagem 100% limpo!
      const startY = h * 0.82 - (totalTextH / 2);

      // Pílula moderna de vidro escuro translúcido com cantos arredondados
      const padding = 14;
      ctx.fillStyle = 'rgba(10, 10, 18, 0.65)';
      ctx.beginPath();
      ctx.roundRect(w * 0.06, startY - padding, w * 0.88, totalTextH + (padding * 2), 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Badge opcional com nome do falante/personagem (se houver)
      if (speakerName && speakerName !== 'Narrador') {
        ctx.fillStyle = '#ec4899';
        ctx.font = `700 ${Math.round(fontSize * 0.7)}px -apple-system, sans-serif`;
        ctx.fillText(`🎙️ ${speakerName.toUpperCase()}`, w / 2, startY - 2);
      }

      // Renderiza as linhas da legenda com contorno e realce em amarelo
      lines.forEach((line, idx) => {
        const y = startY + (idx * lineHeight) + fontSize;
        // Contorno preto para máxima legibilidade
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(line, w / 2, y);

        // Preenchimento branco com toque amarelo na última linha
        ctx.fillStyle = idx === lines.length - 1 ? '#fef08a' : '#ffffff';
        ctx.fillText(line, w / 2, y);
      });

      ctx.restore();
    }
  }

  /**
   * Grava e exporta o vídeo WebM em 30 FPS combinando os 3 takes de cada cena,
   * áudio neural da cena e legendas customizadas prontas para download.
   */
  public static async recordAndExportVideo(
    scenes: TikTokScene[],
    bookTitle: string,
    onProgress: (pct: number, msg: string) => void,
    options: {
      showSubtitles?: boolean;
      showTopHeader?: boolean;
      transitionStyle?: CinematicTransitionStyle;
      isBgmActive?: boolean;
      bookGenre?: string;
    } = {}
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280; // Formato 9:16 vertical TikTok HD
    const ctx = canvas.getContext('2d')!;
    const { showSubtitles = true, showTopHeader = true, transitionStyle = 'adaptiveCinema', isBgmActive = true, bookGenre = 'Suspense' } = options;

    // Pré-carrega todas as imagens de cada take de cada cena
    onProgress(5, 'Carregando os 3 takes cinematográficos de cada cena...');
    const loadedSceneImages: Array<(HTMLImageElement | null)[]> = [];

    for (let sIdx = 0; sIdx < scenes.length; sIdx++) {
      const scene = scenes[sIdx];
      const takes = scene.images && scene.images.length >= 3
        ? scene.images
        : [
            { id: 't1', takeNumber: 1 as const, label: 'Take 1', prompt: '', url: scene.imageUrl },
            { id: 't2', takeNumber: 2 as const, label: 'Take 2', prompt: '', url: scene.imageUrl },
            { id: 't3', takeNumber: 3 as const, label: 'Take 3', prompt: '', url: scene.imageUrl }
          ];

      const loadedTakes = await Promise.all(
        takes.map((take) => {
          return new Promise<HTMLImageElement | null>((res) => {
            const url = take.url || scene.imageUrl;
            if (!url) return res(null);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => res(img);
            img.onerror = () => res(null);
            img.src = url;
          });
        })
      );
      loadedSceneImages.push(loadedTakes);
    }

    // Configura o stream do Canvas a 30 FPS
    const canvasStream = canvas.captureStream(30);

    // Configura o AudioContext para capturar o áudio neural de cada cena
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();

    // Combina os tracks de vídeo e áudio
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);

    // Roteia a trilha de fundo se ativa
    if (isBgmActive) {
      try {
        const bgmCtx = cinematicAudioDirector.getAudioContext();
        const masterNode = cinematicAudioDirector.getMasterGainNode();
        if (masterNode) {
          const bgmDest = bgmCtx.createMediaStreamDestination();
          masterNode.connect(bgmDest);
          bgmDest.stream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
        }
      } catch (bgmErr) {
        console.warn('[VideoExport] Falha ao mixar trilha de fundo:', bgmErr);
      }
    }

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 4_000_000 // 4 Mbps HD
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.start(100);

    const totalScenes = scenes.length;

    // Renderiza cena a cena com os 3 takes em transição contínua
    for (let sIdx = 0; sIdx < totalScenes; sIdx++) {
      const scene = scenes[sIdx];
      const sceneTakes = loadedSceneImages[sIdx] || [];
      const nextSceneTakes = sIdx + 1 < totalScenes ? loadedSceneImages[sIdx + 1] : [];
      const durationSec = scene.audioDurationSec || scene.timeEstimateSec || 9;
      const totalFrames = Math.round(durationSec * 30);
      const framesPerTake = Math.max(15, Math.floor(totalFrames / 3));

      onProgress(
        Math.round(10 + (sIdx / totalScenes) * 85),
        `Renderizando Cena ${sIdx + 1} de ${totalScenes} (3 takes • ${Math.round(durationSec)}s)...`
      );

      // Inicia a trilha de fundo contextual para a cena (incluindo BGM e Ambiente dirigidos pelo Agente)
      if (isBgmActive) {
        const sfxMeta = (scene as any).specialEffects;
        cinematicAudioDirector.playScene(
          {
            narrationText: scene.text,
            sceneSummary: scene.text,
            mood: sfxMeta?.bgmMood,
            ambientSound: sfxMeta?.ambientSound
          },
          bookGenre
        );
        cinematicAudioDirector.setDucking(!!scene.audioUrl);
      }

      // Conecta o áudio neural da cena ao stream
      let audioNode: HTMLAudioElement | null = null;
      if (scene.audioUrl) {
        try {
          audioNode = new Audio(scene.audioUrl);
          audioNode.crossOrigin = 'anonymous';
          const source = audioCtx.createMediaElementSource(audioNode);
          source.connect(dest);
          audioNode.play().catch(() => {});
        } catch (e) {
          console.warn('[TikTokVideoRecord] Erro ao conectar áudio:', e);
        }
      }

      // Renderiza frame a frame transitando pelos 3 takes
      for (let f = 0; f < totalFrames; f++) {
        const sceneProgress = f / totalFrames;

        // Determina qual dos 3 takes está ativo no momento
        let takeIdx = 0;
        let takeProgress = 0;
        let curImg: HTMLImageElement | null = null;
        let nxtImg: HTMLImageElement | null = null;
        let transitionAlpha = 0;
        const transitionFrames = 18; // ~0.6s de transição suave

        if (sceneProgress < 0.333) {
          takeIdx = 0;
          const frameInTake = f;
          takeProgress = frameInTake / framesPerTake;
          curImg = sceneTakes[0] || sceneTakes[1] || sceneTakes[2] || null;
          nxtImg = sceneTakes[1] || sceneTakes[2] || null;
          if (frameInTake >= framesPerTake - transitionFrames && nxtImg) {
            transitionAlpha = (frameInTake - (framesPerTake - transitionFrames)) / transitionFrames;
          }
        } else if (sceneProgress < 0.666) {
          takeIdx = 1;
          const frameInTake = f - framesPerTake;
          takeProgress = frameInTake / framesPerTake;
          curImg = sceneTakes[1] || sceneTakes[0] || sceneTakes[2] || null;
          nxtImg = sceneTakes[2] || (nextSceneTakes[0] || null);
          if (frameInTake >= framesPerTake - transitionFrames && nxtImg) {
            transitionAlpha = (frameInTake - (framesPerTake - transitionFrames)) / transitionFrames;
          }
        } else {
          takeIdx = 2;
          const frameInTake = f - (framesPerTake * 2);
          const remainingFrames = totalFrames - (framesPerTake * 2);
          takeProgress = frameInTake / Math.max(1, remainingFrames);
          curImg = sceneTakes[2] || sceneTakes[0] || null;
          nxtImg = nextSceneTakes[0] || null;
          if (f >= totalFrames - transitionFrames && nxtImg) {
            transitionAlpha = (f - (totalFrames - transitionFrames)) / transitionFrames;
          }
        }

        const sfxMeta = (scene as any).specialEffects;
        this.renderVideoFrame(
          ctx,
          canvas,
          curImg,
          nxtImg,
          takeProgress,
          transitionAlpha,
          scene.text,
          bookTitle,
          sIdx,
          totalScenes,
          takeIdx,
          {
            showSubtitles,
            showTopHeader,
            speakerName: scene.speakerName,
            transitionStyle: (scene as any).transitionStyle || transitionStyle,
            visualEffects: sfxMeta?.visualEffects
          }
        );

        await new Promise((r) => setTimeout(r, 33)); // ~30 fps
      }

      if (audioNode) {
        try {
          audioNode.pause();
        } catch {}
      }
    }

    if (isBgmActive) {
      cinematicAudioDirector.stop();
    }

    onProgress(98, 'Finalizando codificação de vídeo HD...');

    return new Promise((resolve) => {
      recorder.onstop = () => {
        if (isBgmActive) {
          cinematicAudioDirector.stop();
        }
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        try {
          audioCtx.close();
        } catch {}
        resolve(videoBlob);
      };
      recorder.stop();
    });
  }
}
