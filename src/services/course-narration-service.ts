// ================================================================
// SERVIÇO DE NARRAÇÃO EM ÁUDIO (VOZ FEMININA) PARA E-BOOKS DE CURSOS
// BookEngin — Síntese Neural Humana da Plataforma em Português
// ================================================================

import { coAuthorVoiceService } from './coauthor-voice-service';

export class CourseNarrationService {
  /**
   * Sintetiza e fala o texto da aula com voz feminina neural da plataforma
   */
  static speak(
    text: string,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): void {
    const cleanText = text
      .replace(/[#*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    coAuthorVoiceService.speak(cleanText, undefined, {
      onStart: options.onStart,
      onEnd: options.onEnd,
      forcePlay: true
    });
  }

  /**
   * Interrompe imediatamente qualquer áudio em reprodução
   */
  static stop(): void {
    coAuthorVoiceService.stop();
  }

  /**
   * Pausa a reprodução atual
   */
  static pause(): void {
    coAuthorVoiceService.stop();
  }

  /**
   * Retoma a reprodução
   */
  static resume(): void {
    // Para simplificação de fluxo contínuo
  }

  /**
   * Verifica se o áudio está tocando
   */
  static isPlaying(): boolean {
    return coAuthorVoiceService.isSpeaking();
  }

  /**
   * Compila o texto completo didático de uma aula para narração contínua
   */
  static composeLessonNarrationText(lesson: {
    lessonNumber: number;
    title: string;
    objective: string;
    introduction?: string;
    didacticExplanation?: string;
    stepByStepInstructions?: Array<{ stepNumber: number; title: string; instruction: string; technicalNote?: string; safetyCaution?: string }>;
    exercise?: { title?: string; description?: string };
  }): string {
    const parts: string[] = [];

    parts.push(`Aula número ${lesson.lessonNumber}. ${lesson.title}.`);
    parts.push(`Objetivo desta aula: ${lesson.objective}.`);

    if (lesson.introduction) {
      parts.push(`Introdução. ${lesson.introduction}`);
    }

    if (lesson.didacticExplanation) {
      parts.push(`Explicação didática. ${lesson.didacticExplanation}`);
    }

    if (lesson.stepByStepInstructions && lesson.stepByStepInstructions.length > 0) {
      parts.push(`Instruções práticas passo a passo.`);
      lesson.stepByStepInstructions.forEach(s => {
        parts.push(`Passo ${s.stepNumber}: ${s.title}. ${s.instruction}.`);
        if (s.technicalNote) parts.push(`Nota técnica: ${s.technicalNote}.`);
        if (s.safetyCaution) parts.push(`Atenção de segurança: ${s.safetyCaution}.`);
      });
    }

    if (lesson.exercise?.description) {
      parts.push(`Atividade prática recomendada. ${lesson.exercise.description}.`);
    }

    return parts.join(' ');
  }
}
