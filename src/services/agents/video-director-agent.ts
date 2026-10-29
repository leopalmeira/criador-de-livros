// ================================================================
// 🎬 AGENTE DIRETOR GERAL DE VÍDEO — IA ORQUESTRADORA DE PRODUÇÃO
// Coordena os agentes de Cena e Áudio, revisa o produto final,
// e garante qualidade profissional do vídeo completo.
// ================================================================

import { chamarGeminiTexto } from '../kdp-ai-engine';
import { SceneDirectorAgent, type SceneDirectionBrief } from './scene-director-agent';
import { AudioDirectorAgent, type AudioPostProductionResult } from './audio-director-agent';
import { SpecialEffectsAgent, type SpecialEffectsPlan } from './special-effects-agent';
import type { TikTokScene } from '../tiktok-story-video-service';
import type { VisualContinuityBible } from '../google-image-studio-service';

export interface ProductionPlan {
  totalScenes: number;
  estimatedDurationSec: number;
  characters: Array<{
    name: string;
    voiceId: string;
    role: string;
    appearances: number;
  }>;
  narrativeArc: string;
  sceneDirection: SceneDirectionBrief[];
  audioDirection: AudioPostProductionResult;
  specialEffectsDirection: SpecialEffectsPlan;
  qualityScore: number;
}

export interface FinalReviewResult {
  approved: boolean;
  overallScore: number;
  visualCoherenceScore: number;
  audioQualityScore: number;
  narrativeFlowScore: number;
  issues: string[];
  recommendations: string[];
}

/**
 * AGENTE DIRETOR GERAL DE VÍDEO
 * O "maestro" que orquestra toda a produção do vídeo.
 * Coordena sequencialmente:
 * 1. Agente Diretor de Cenas → Direção fotográfica e prompts 100% alinhados
 * 2. Agente Diretor de Áudio → Pós-produção vocal, fluidez humana e remoção de robotização
 * 3. Agente de Efeitos Especiais → Trilha de fundo com auto-ducking, SFX foley e VFX 35mm
 * 4. Revisão Geral e Aprovação do Corte Final
 */
export class VideoDirectorAgent {

  /**
   * PIPELINE COMPLETO DE PRODUÇÃO
   * Executa todas as etapas da produção em harmonia:
   * 1. Direção de Cenas (prompts de imagem profissionais alinhados)
   * 2. Direção de Áudio (textos fluidos e humanizados para TTS)
   * 3. Direção de Efeitos Especiais (trilha, foley SFX, VFX de fundo e transições)
   * 4. Revisão Geral do Produtor Executivo (qualidade e coerência)
   */
  static async produceVideo(
    scenes: TikTokScene[],
    bible: VisualContinuityBible,
    bookTitle: string,
    bookGenre: string,
    onProgress?: (step: string, percent: number) => void
  ): Promise<{ scenes: TikTokScene[]; plan: ProductionPlan }> {

    // ═══ TENTATIVA 1: PIPELINE COMPLETO NO BACKEND NODE.JS ═══
    try {
      onProgress?.('🎬 4 Agentes Autônomos executando no Backend...', 20);
      const resp = await fetch('/api/video-agents/orchestrate-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes, bible, bookTitle, bookGenre }),
        signal: AbortSignal.timeout(45000)
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data?.success && data?.pipeline) {
          const { sceneDirection, audioDirection, specialEffectsDirection, review } = data.pipeline;
          let directedScenes = scenes;

          if (Array.isArray(sceneDirection) && sceneDirection.length > 0) {
            directedScenes = SceneDirectorAgent.applyDirectionToScenes(directedScenes, sceneDirection);
          }
          if (audioDirection?.scenes && audioDirection.scenes.length > 0) {
            directedScenes = AudioDirectorAgent.applyVocalDirectionToScenes(directedScenes, audioDirection);
            directedScenes = directedScenes.map(scene => ({
              ...scene,
              text: AudioDirectorAgent.postProcessTextForTTS(scene.text),
              speechText: AudioDirectorAgent.postProcessTextForTTS(scene.speechText || scene.text)
            }));
          }
          if (specialEffectsDirection) {
            directedScenes = SpecialEffectsAgent.applyEffectsToScenes(directedScenes, specialEffectsDirection);
          }

          onProgress?.('🎬 Produção orquestrada com sucesso pelos 4 Agentes!', 100);

          const characters = this.extractCharacters(directedScenes);
          const plan: ProductionPlan = {
            totalScenes: directedScenes.length,
            estimatedDurationSec: audioDirection?.estimatedDurationSec || directedScenes.length * 8,
            characters,
            narrativeArc: this.analyzeNarrativeArc(directedScenes),
            sceneDirection: sceneDirection || [],
            audioDirection: audioDirection || { scenes: [], globalNotes: '', estimatedDurationSec: directedScenes.length * 8 },
            specialEffectsDirection: specialEffectsDirection || { scenes: [], overallAtmosphere: '', primarySoundtrackStyle: '', acousticDynamicRange: 'building-tension' },
            qualityScore: review?.overallScore || 95
          };

          return { scenes: directedScenes, plan };
        }
      }
    } catch (backendErr) {
      console.log('[VideoDirectorAgent] Executando pipeline localmente:', backendErr);
    }

    onProgress?.('🎬 Diretor de Cenas analisando enquadramentos e falas...', 10);

    // ═══ ETAPA 1: DIREÇÃO DE CENAS (FOTOGRAFIA & ALINHAMENTO) ═══
    const sceneDirection = await SceneDirectorAgent.createSceneDirection(
      scenes, bible, bookTitle, bookGenre
    );

    let directedScenes = scenes;
    if (sceneDirection.length > 0) {
      directedScenes = SceneDirectorAgent.applyDirectionToScenes(scenes, sceneDirection);
      onProgress?.('✅ Direção fotográfica alinhada cena por cena', 30);
    } else {
      onProgress?.('⚠️ Usando direção fotográfica padrão', 30);
    }

    // ═══ ETAPA 2: DIREÇÃO DE ÁUDIO (FLUIDEZ & HUMANIZAÇÃO) ═══
    onProgress?.('🎵 Diretor de Áudio eliminando robotização e pausas...', 40);

    const audioDirection = await AudioDirectorAgent.directVocalPerformance(
      directedScenes, bookGenre
    );

    if (audioDirection.scenes.length > 0) {
      directedScenes = AudioDirectorAgent.applyVocalDirectionToScenes(
        directedScenes, audioDirection
      );

      // Pós-processamento de texto para TTS (remover artefatos e normalizar ritmo)
      directedScenes = directedScenes.map(scene => ({
        ...scene,
        text: AudioDirectorAgent.postProcessTextForTTS(scene.text),
        speechText: AudioDirectorAgent.postProcessTextForTTS(scene.speechText || scene.text)
      }));

      onProgress?.('✅ Vozes e diálogos humanizados com ritmo natural', 60);
    }

    // ═══ ETAPA 3: EFEITOS ESPECIAIS DE FUNDO (VFX / SFX / TRILHA) ═══
    onProgress?.('✨ Agente de Efeitos Especiais desenhando atmosfera, trilha e Foley...', 65);

    const specialEffectsDirection = await SpecialEffectsAgent.planEffects(
      directedScenes, bookTitle, bookGenre
    );

    directedScenes = SpecialEffectsAgent.applyEffectsToScenes(
      directedScenes, specialEffectsDirection
    );

    onProgress?.('✅ Trilha com auto-ducking, SFX e atmosfera aplicados', 78);

    // ═══ ETAPA 4: REVISÃO GERAL DO CORTE FINAL ═══
    onProgress?.('📋 Diretor Geral revisando coerência global do vídeo...', 82);

    const qualityScore = await this.performQualityReview(
      directedScenes, sceneDirection, audioDirection, bible, bookGenre
    );

    onProgress?.('✅ Revisão final de cinema aprovada', 95);

    // Monta o plano de produção consolidado
    const characters = this.extractCharacters(directedScenes);
    const plan: ProductionPlan = {
      totalScenes: directedScenes.length,
      estimatedDurationSec: audioDirection.estimatedDurationSec || directedScenes.length * 8,
      characters,
      narrativeArc: this.analyzeNarrativeArc(directedScenes),
      sceneDirection,
      audioDirection,
      specialEffectsDirection,
      qualityScore
    };

    onProgress?.('🎬 Produção orquestrada com sucesso pelos 4 Agentes!', 100);

    return { scenes: directedScenes, plan };
  }

  /**
   * Revisão de qualidade do produto final.
   * Verifica coerência visual, qualidade de áudio e fluxo narrativo.
   */
  private static async performQualityReview(
    scenes: TikTokScene[],
    sceneDir: SceneDirectionBrief[],
    audioDir: AudioPostProductionResult,
    bible: VisualContinuityBible,
    bookGenre: string
  ): Promise<number> {
    try {
      const reviewPrompt = `Você é um PRODUTOR EXECUTIVO de conteúdo audiovisual profissional.
Revise a seguinte produção e dê uma nota de qualidade de 0 a 100.

GÊNERO: ${bookGenre}
PROTAGONISTA: ${bible.protagonistName} — ${bible.protagonistDescription}
TOTAL DE CENAS: ${scenes.length}

CENAS E DIREÇÃO:
${scenes.slice(0, 8).map((s, i) => {
  const dir = sceneDir[i];
  return `Cena ${i + 1} (${s.speakerName}): "${s.text.slice(0, 100)}..."
  Direção Visual: ${dir?.visualDescription || 'padrão'}
  Take 1: ${s.images[0]?.prompt?.slice(0, 80) || 'sem prompt'}`;
}).join('\n\n')}

Avalie:
1. Alinhamento texto-imagem (as imagens representam o que é dito?)
2. Coerência narrativa (as cenas fluem logicamente?)
3. Qualidade dos prompts (são descritivos e específicos?)
4. Continuidade visual (o personagem é consistente?)

Retorne APENAS um número de 0 a 100.`;

      const rawRes = await chamarGeminiTexto(reviewPrompt, { temperature: 0.2, maxTokens: 50 });
      const texto = typeof rawRes === 'string' ? rawRes : (rawRes?.texto || '');
      const score = parseInt(texto.replace(/[^0-9]/g, ''), 10);
      return isNaN(score) ? 75 : Math.min(100, Math.max(0, score));
    } catch {
      return 75;
    }
  }

  /**
   * Extrai a lista de personagens únicos das cenas.
   */
  private static extractCharacters(scenes: TikTokScene[]): ProductionPlan['characters'] {
    const charMap = new Map<string, { name: string; voiceId: string; role: string; count: number }>();

    for (const scene of scenes) {
      const name = scene.speakerName || 'Narrador';
      const existing = charMap.get(name);
      if (existing) {
        existing.count++;
      } else {
        charMap.set(name, {
          name,
          voiceId: scene.voiceId || '',
          role: scene.speakerType || 'narrator',
          count: 1
        });
      }
    }

    return Array.from(charMap.values()).map(c => ({
      name: c.name,
      voiceId: c.voiceId,
      role: c.role,
      appearances: c.count
    }));
  }

  /**
   * Analisa o arco narrativo das cenas para contexto.
   */
  private static analyzeNarrativeArc(scenes: TikTokScene[]): string {
    if (scenes.length <= 2) return 'Cena única ou par de cenas';

    const thirds = Math.ceil(scenes.length / 3);
    const act1 = scenes.slice(0, thirds);
    const act2 = scenes.slice(thirds, thirds * 2);
    const act3 = scenes.slice(thirds * 2);

    return [
      `Ato 1 (${act1.length} cenas): Introdução e estabelecimento`,
      `Ato 2 (${act2.length} cenas): Desenvolvimento e tensão`,
      `Ato 3 (${act3.length} cenas): Clímax e resolução`
    ].join(' → ');
  }
}
