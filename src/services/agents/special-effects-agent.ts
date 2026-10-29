// ================================================================
// ✨ AGENTE DE EFEITOS ESPECIAIS DE FUNDO (VFX / SFX / BGM)
// IA Autônoma responsável por orquestrar a atmosfera audiovisual:
// 1. Trilha sonora de fundo (BGM) dinâmica com auto-ducking vocal
// 2. Efeitos sonoros foley / pontuais (SFX) sincronizados com a narrativa
// 3. Efeitos visuais cinematográficos de fundo (VFX) e overlays 35mm
// 4. Transições cinematográficas adaptativas entre cenas
// ================================================================

import { chamarGeminiTexto } from '../kdp-ai-engine';
import type { TikTokScene } from '../tiktok-story-video-service';
import type { CinematicTransitionStyle } from '../cinematic-transitions-engine';
import type { SceneMoodType, SceneAmbientType } from '../cinematic-audio-director';

export type VisualEffectType =
  | 'dust-particles'    // Poeira dourada cinematográfica em suspensão
  | 'film-grain-35mm'   // Granulado sutil de película analógica 35mm
  | 'light-leak-warm'   // Vazamento de luz âmbar / dourado anamórfico
  | 'vignette-dramatic' // Vinheta escura radial de foco dramático
  | 'anamorphic-flare'  // Flare azul/ouro sutil de lente cinematográfica
  | 'fog-haze'          // Névoa volumétrica atmosférica
  | 'rain-mist'         // Névoa sutil de chuva
  | 'heartbeat-pulse';  // Pulso sutil de iluminação em momentos de pânico

export interface SoundEffectCue {
  sfxId: string;
  label: string;
  triggerOffsetSec: number; // Ponto da cena em que o efeito toca (segundos)
  volume: number;           // 0.0 a 1.0
  description: string;
}

export interface SceneEffectsBrief {
  sceneNumber: number;
  bgmMood: SceneMoodType;
  bgmDescription: string;
  bgmBaseFrequency: number;
  bgmVolume: number;        // Volume base (ex: 0.35)
  duckingVolume: number;    // Volume durante fala ativa (ex: 0.10)
  ambientSound: SceneAmbientType;
  sfxCues: SoundEffectCue[];
  visualEffects: VisualEffectType[];
  transitionToNext: CinematicTransitionStyle;
  cameraMotion: 'slow-push-in' | 'slow-pull-out' | 'subtle-drift' | 'static-intense';
}

export interface SpecialEffectsPlan {
  scenes: SceneEffectsBrief[];
  overallAtmosphere: string;
  primarySoundtrackStyle: string;
  acousticDynamicRange: 'intimate' | 'building-tension' | 'dramatic-crescendo' | 'explosive';
}

/**
 * AGENTE DE EFEITOS ESPECIAIS DE FUNDO
 * Orquestra toda a camada de atmosfera sonora e visual do vídeo.
 * Trabalha em estreita coordenação com o Diretor Geral de Vídeo.
 */
export class SpecialEffectsAgent {

  /**
   * ETAPA 1: Planeja a atmosfera audiovisual para todas as cenas.
   * Analisa a carga dramática, o gênero da obra e o texto de cada cena
   * para desenhar a trilha, efeitos foley e overlays de cinema ideais.
   */
  static async planEffects(
    scenes: TikTokScene[],
    bookTitle: string,
    bookGenre: string
  ): Promise<SpecialEffectsPlan> {
    const scenesSummary = scenes.map((s, i) => ({
      num: i + 1,
      speaker: s.speakerName || 'Narrador',
      text: s.text.slice(0, 180)
    }));

    const prompt = `Você é um DESIGNER DE SOM E DIRETOR DE EFEITOS ESPECIAIS (VFX / SFX) de cinema de Hollywood.
Sua função é criar a camada de EFEITOS ESPECIAIS DE FUNDO (sonoros e visuais) para um vídeo profissional.

## LIVRO: "${bookTitle}" | GÊNERO: ${bookGenre}

## CENAS DA PRODUÇÃO:
${JSON.stringify(scenesSummary, null, 2)}

## SUAS TAREFAS COMO AGENTE DE EFEITOS ESPECIAIS:
1. **TRILHA SONORA DE FUNDO (BGM - ZERO ZUMBIDOS)**:
   - Escolha o mood harmônico: "suspense-tenso", "misterio-investigacao", "terror-claustrofobico", "drama-emocional", "acao-perigo", "calmaria-introspectiva"
   - Use pads orquestrais cinematográficos com acordes maiores/menores confortáveis (frequências de 110Hz a 390Hz), sem zumbido elétrico.
   - Volume ideal (0.24 a 0.32) e volume com ducking quando há fala (0.08 a 0.12)
2. **AMBIENTE SONORO & FOLEY (SFX)**:
   - Identifique efeitos sonoros pontuais adequados: "chuva", "vento", "trovao", "relogio", "natureza", "quarto-fechado", "nenhum"
   - Cues pontuais acústicos autênticos: chuva na janela, tic-tac analógico, passos discretos, porta, etc.
3. **EFEITOS VISUAIS DE FUNDO (VFX)**:
   - Escolha de 1 a 3 dos seguintes: "dust-particles", "film-grain-35mm", "light-leak-warm", "vignette-dramatic", "anamorphic-flare", "fog-haze", "rain-mist", "heartbeat-pulse"
4. **TRANSIÇÃO CINEMATOGRÁFICA**:
   - Escolha: "zoomThrough", "filmBurn", "whipPan", "lumaDissolve", "dipToBlack", "smoothBezier"

Retorne APENAS um JSON estrito no seguinte formato:
{
  "overallAtmosphere": "Atmosfera cinematográfica acolhedora e dramática",
  "primarySoundtrackStyle": "Pads harmônicos cinematográficos e auto-ducking",
  "acousticDynamicRange": "building-tension",
  "scenes": [
    {
      "sceneNumber": 1,
      "bgmMood": "suspense-tenso",
      "bgmDescription": "Acorde harmônico de cinema com auto-ducking suave",
      "bgmBaseFrequency": 146,
      "bgmVolume": 0.30,
      "duckingVolume": 0.10,
      "ambientSound": "quarto-fechado",
      "sfxCues": [
        {
          "sfxId": "sfx_door_creak",
          "label": "Porta rangendo ao fundo",
          "triggerOffsetSec": 1.5,
          "volume": 0.4,
          "description": "Porta abrindo lentamente"
        }
      ],
      "visualEffects": ["film-grain-35mm", "vignette-dramatic"],
      "transitionToNext": "zoomThrough",
      "cameraMotion": "slow-push-in"
    }
  ]
}`;

    // Tenta primeiro via Backend Node.js
    try {
      const resp = await fetch('/api/video-agents/direct-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes, bookTitle, bookGenre }),
        signal: AbortSignal.timeout(30000)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.success && data?.result) {
          return {
            scenes: Array.isArray(data.result.scenes) ? data.result.scenes : this.buildFallbackScenes(scenes, bookGenre),
            overallAtmosphere: data.result.overallAtmosphere || 'Atmosfera cinematográfica imersiva',
            primarySoundtrackStyle: data.result.primarySoundtrackStyle || 'Trilha ambiente procedural',
            acousticDynamicRange: data.result.acousticDynamicRange || 'building-tension'
          };
        }
      }
    } catch {
      // Continua para fallback local
    }

    try {
      const rawRes = await chamarGeminiTexto(prompt, { temperature: 0.4, maxTokens: 4000 });
      const texto = typeof rawRes === 'string' ? rawRes : (rawRes?.texto || '');
      const cleanJson = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        scenes: Array.isArray(parsed.scenes) ? parsed.scenes : this.buildFallbackScenes(scenes, bookGenre),
        overallAtmosphere: parsed.overallAtmosphere || 'Atmosfera cinematográfica imersiva',
        primarySoundtrackStyle: parsed.primarySoundtrackStyle || 'Trilha ambiente e design sonoro procedural',
        acousticDynamicRange: parsed.acousticDynamicRange || 'building-tension'
      };
    } catch (err) {
      console.warn('[SpecialEffectsAgent] Erro no planejamento de efeitos:', err);
      return {
        scenes: this.buildFallbackScenes(scenes, bookGenre),
        overallAtmosphere: 'Atmosfera cinematográfica calibrada automaticamente',
        primarySoundtrackStyle: 'Design acústico procedural',
        acousticDynamicRange: 'building-tension'
      };
    }
  }

  /**
   * ETAPA 2: Aplica os metadados de efeitos especiais diretamente nas cenas.
   * Enriquece cada cena com as configurações de BGM, VFX, SFX e transições.
   */
  static applyEffectsToScenes(
    scenes: TikTokScene[],
    plan: SpecialEffectsPlan
  ): TikTokScene[] {
    return scenes.map((scene, idx) => {
      const effect = plan.scenes.find(s => s.sceneNumber === idx + 1);
      if (!effect) return scene;

      return {
        ...scene,
        // Efeitos visuais e de transição
        transitionStyle: effect.transitionToNext || 'adaptiveCinema',
        // Injeta os metadados cinematográficos na cena
        specialEffects: {
          bgmMood: effect.bgmMood,
          bgmVolume: effect.bgmVolume,
          duckingVolume: effect.duckingVolume,
          ambientSound: effect.ambientSound,
          sfxCues: effect.sfxCues,
          visualEffects: effect.visualEffects,
          cameraMotion: effect.cameraMotion
        }
      } as TikTokScene & { specialEffects?: any };
    });
  }

  /**
   * Constrói plano de efeitos acústicos e visuais de fallback inteligentes
   * baseado no gênero da obra e no ritmo das cenas.
   */
  private static buildFallbackScenes(scenes: TikTokScene[], genre: string): SceneEffectsBrief[] {
    const genreLower = (genre || '').toLowerCase();
    const isDark = /terror|suspense|thriller|misteri|crime|horror/i.test(genreLower);
    const isAction = /acao|aventura|ficcao|guerra/i.test(genreLower);
    const isDrama = /drama|romance|poesia/i.test(genreLower);

    const defaultMood: SceneMoodType = isDark
      ? 'suspense-tenso'
      : isAction
      ? 'acao-perigo'
      : isDrama
      ? 'drama-emocional'
      : 'calmaria-introspectiva';

    const defaultAmbient: SceneAmbientType = isDark ? 'quarto-fechado' : 'nenhum';

    return scenes.map((_, i) => ({
      sceneNumber: i + 1,
      bgmMood: defaultMood,
      bgmDescription: 'Atmosfera sonora imersiva com drone sub-grave e texturas',
      bgmBaseFrequency: isDark ? 48 : 65,
      bgmVolume: 0.32,
      duckingVolume: 0.10,
      ambientSound: defaultAmbient,
      sfxCues: [],
      visualEffects: isDark
        ? ['film-grain-35mm', 'vignette-dramatic']
        : ['light-leak-warm', 'dust-particles'],
      transitionToNext: (i % 2 === 0 ? 'zoomThrough' : 'filmBurn') as CinematicTransitionStyle,
      cameraMotion: (i % 2 === 0 ? 'slow-push-in' : 'subtle-drift') as any
    }));
  }
}
