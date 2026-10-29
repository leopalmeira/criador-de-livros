// ================================================================
// 🎵 AGENTE DIRETOR DE ÁUDIO — IA AUTÔNOMA DE PÓS-PRODUÇÃO VOCAL
// Trata os parâmetros de voz para torná-la mais fluida e humanizada.
// Remove pausas artificiais, ajusta ritmo e entonação por personagem.
// ================================================================

import { chamarGeminiTexto } from '../kdp-ai-engine';
import type { TikTokScene } from '../tiktok-story-video-service';

export interface VoiceDirectionParams {
  sceneIndex: number;
  speakerName: string;
  speakerType: string;
  originalText: string;
  directedText: string;       // Texto otimizado para TTS fluido
  ssmlMarkup?: string;        // SSML para controle avançado de voz
  pacing: 'slow' | 'normal' | 'fast' | 'urgent';
  emotionalTone: string;
  breathPauses: number[];     // Posições de pausas naturais em ms
  emphasisWords: string[];    // Palavras que devem ser enfatizadas
  volumeAdjust: number;       // -1.0 a 1.0 (ajuste relativo)
}

export interface AudioPostProductionResult {
  scenes: VoiceDirectionParams[];
  globalNotes: string;
  estimatedDurationSec: number;
}

/**
 * AGENTE DIRETOR DE ÁUDIO
 * Responsável por tornar as vozes neurais mais fluidas e humanizadas.
 * Atua em 3 frentes:
 * 1. TEXTO: Reescreve o texto para ser mais natural quando lido em voz alta
 * 2. RITMO: Define pausas e ênfases para evitar robotização
 * 3. DIREÇÃO: Define tom emocional para cada fala de cada personagem
 */
export class AudioDirectorAgent {

  /**
   * ETAPA 1: Dirige a performance vocal de todas as cenas.
   * Reescreve o texto para ser mais fluido na fala (remove construções
   * que soam robóticas quando lidas por TTS) e adiciona direção vocal.
   */
  static async directVocalPerformance(
    scenes: TikTokScene[],
    bookGenre: string
  ): Promise<AudioPostProductionResult> {
    const scenesSummary = scenes.map((s, i) => ({
      num: i + 1,
      speaker: s.speakerName || 'Narrador',
      type: s.speakerType,
      text: s.text
    }));

    const prompt = `Você é um DIRETOR DE ÁUDIO profissional de audiobooks e dublagem cinematográfica.
Sua função é transformar textos escritos em TEXTOS OTIMIZADOS PARA VOZ NEURAL (TTS).

## PROBLEMAS COMUNS QUE VOCÊ DEVE CORRIGIR:
1. Pausas artificiais longas entre frases → Conecte as frases com fluidez
2. Texto que soa robótico quando lido → Reescreva de forma mais natural e conversacional
3. Frases muito longas sem respiração → Quebre em frases menores com pausas naturais
4. Números e siglas → Escreva por extenso
5. Pontuação que causa pausas estranhas → Ajuste para fluidez
6. Diálogos que soam como narração → Torne mais conversacionais e emotivos

## REGRAS DE OURO:
- O texto DEVE manter o MESMO significado original
- Diálogos devem soar como conversa REAL entre pessoas
- Narração deve soar como um narrador profissional contando uma história
- Palavras-chave emocionais devem ser enfatizadas
- NUNCA adicione informações que não estão no texto original

## GÊNERO DO LIVRO: ${bookGenre}

## CENAS PARA DIRIGIR:
${JSON.stringify(scenesSummary, null, 2)}

Para CADA cena, retorne a direção vocal completa.

Retorne APENAS JSON:
{
  "scenes": [
    {
      "sceneIndex": 0,
      "speakerName": "Narrador",
      "speakerType": "narrator",
      "originalText": "texto original",
      "directedText": "texto reescrito mais fluido e natural para TTS, sem pausas artificiais",
      "pacing": "normal",
      "emotionalTone": "misterioso e envolvente",
      "breathPauses": [500, 300],
      "emphasisWords": ["palavra1", "palavra2"],
      "volumeAdjust": 0
    }
  ],
  "globalNotes": "notas gerais sobre a direção de áudio",
  "estimatedDurationSec": 45
}`;

    // Tenta primeiro via Backend Node.js
    try {
      const resp = await fetch('/api/video-agents/direct-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes, bookGenre }),
        signal: AbortSignal.timeout(30000)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.success && data?.result?.scenes) {
          return {
            scenes: data.result.scenes,
            globalNotes: data.result.globalNotes || '',
            estimatedDurationSec: data.result.estimatedDurationSec || scenes.length * 8
          };
        }
      }
    } catch {
      // Continua para fallback local
    }

    try {
      const rawRes = await chamarGeminiTexto(prompt, { temperature: 0.5, maxTokens: 4000 });
      const texto = typeof rawRes === 'string' ? rawRes : (rawRes?.texto || '');
      const cleanJson = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        scenes: parsed.scenes || [],
        globalNotes: parsed.globalNotes || '',
        estimatedDurationSec: parsed.estimatedDurationSec || scenes.length * 8
      };
    } catch (err) {
      console.warn('[AudioDirectorAgent] Erro na direção vocal:', err);
      return {
        scenes: scenes.map((s, i) => ({
          sceneIndex: i,
          speakerName: s.speakerName || 'Narrador',
          speakerType: s.speakerType || 'narrator',
          originalText: s.text,
          directedText: s.text,
          pacing: 'normal' as const,
          emotionalTone: 'neutro',
          breathPauses: [],
          emphasisWords: [],
          volumeAdjust: 0
        })),
        globalNotes: 'Direção padrão aplicada',
        estimatedDurationSec: scenes.length * 8
      };
    }
  }

  /**
   * ETAPA 2: Aplica a direção vocal nas cenas.
   * Substitui o texto original pelo texto otimizado para TTS e corrige atribuição de narrador/personagem.
   */
  static applyVocalDirectionToScenes(
    scenes: TikTokScene[],
    direction: AudioPostProductionResult
  ): TikTokScene[] {
    return scenes.map((scene, idx) => {
      const vocalDir = direction.scenes.find(d => d.sceneIndex === idx);
      if (!vocalDir || !vocalDir.directedText) return scene;

      const updatedSpeakerType = (vocalDir.speakerType as TikTokScene['speakerType']) || scene.speakerType;
      const updatedSpeakerName = vocalDir.speakerName || scene.speakerName;
      let updatedVoiceId = scene.voiceId;

      if (updatedSpeakerType === 'narrator' && scene.speakerType !== 'narrator') {
        updatedVoiceId = 'edge:pt-BR-FranciscaNeural';
      }

      return {
        ...scene,
        speakerType: updatedSpeakerType,
        speakerName: updatedSpeakerName,
        voiceId: updatedVoiceId,
        text: vocalDir.directedText,
        speechText: vocalDir.directedText,
        audioUrl: undefined // Limpa para regenerar com texto otimizado
      };
    });
  }

  /**
   * ETAPA 3: Pós-processa o texto para remover artefatos comuns de TTS.
   * - Elimina reticências ("...") que quebram a fluidez e causam pausas robóticas
   * - Normaliza pontuação para fluidez natural
   * - Garante que o texto termina com pontuação final limpa
   */
  static postProcessTextForTTS(text: string): string {
    let processed = text
      // Elimina reticências no início e fim
      .replace(/^\s*(?:\.{2,}|…+)\s*/g, '')
      .replace(/\s*(?:\.{2,}|…+)\s*$/g, '.')
      // Substitui reticências no meio por vírgula ou ponto fluido
      .replace(/\s*(?:\.{2,}|…+)\s+([a-zà-ú])/g, ', $1')
      .replace(/\s*(?:\.{2,}|…+)\s+([A-ZÀ-Ú])/g, '. $1')
      .replace(/\s*(?:\.{2,}|…+)\s*/g, ', ')
      // Reduz pausas duplas de vírgula ou ponto
      .replace(/,\s*,+/g, ',')
      .replace(/\.\s*\.+/g, '.')
      // Remove espaços múltiplos
      .replace(/\s{2,}/g, ' ')
      // Normaliza travessões longos
      .replace(/—{2,}/g, ' — ')
      .replace(/–{2,}/g, ' — ')
      // Remove parênteses (TTS lê de forma estranha)
      .replace(/\(([^)]+)\)/g, ', $1,')
      // Remove colchetes
      .replace(/\[([^\]]+)\]/g, '$1')
      // Escreve números pequenos por extenso
      .replace(/\b(\d{1,2})\b/g, (_, n) => {
        const nums: Record<string, string> = {
          '0': 'zero', '1': 'um', '2': 'dois', '3': 'três', '4': 'quatro',
          '5': 'cinco', '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove',
          '10': 'dez', '11': 'onze', '12': 'doze'
        };
        return nums[n] || n;
      })
      .trim();

    // Garante pontuação final
    if (processed && !/[.!?"]$/.test(processed)) {
      processed += '.';
    }

    return processed;
  }
}
