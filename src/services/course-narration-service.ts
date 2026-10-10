// ================================================================
// SERVIÇO DE NARRAÇÃO EM ÁUDIO (VOZ FEMININA) PARA E-BOOKS DE CURSOS
// BookEngin — Síntese Neural e Web Speech API Feminina em Português
// ================================================================

export class CourseNarrationService {
  private static activeUtterance: SpeechSynthesisUtterance | null = null;
  private static isSpeakingNow: boolean = false;

  /**
   * Obtém a melhor voz feminina em Português (Brasil) disponível no navegador
   */
  static getPreferredFemaleVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();

    // 1. Vozes femininas explícitas em português
    const ptVoices = voices.filter(v => v.lang.toLowerCase().startsWith('pt'));
    if (ptVoices.length === 0) return null;

    // Prioriza nomes femininos conhecidos (Francisca Neural, Luciana, Maria, Leticia, etc.)
    const femaleNames = ['francisca', 'luciana', 'maria', 'leticia', 'fernanda', 'heloisa', 'yara', 'female', 'mulher'];
    const matchedFemale = ptVoices.find(v => 
      femaleNames.some(name => v.name.toLowerCase().includes(name))
    );
    if (matchedFemale) return matchedFemale;

    // Se houver voz do Google ou Microsoft pt-BR
    const brVoice = ptVoices.find(v => v.lang.toLowerCase().includes('br')) || ptVoices[0];
    return brVoice || null;
  }

  /**
   * Sintetiza e fala o texto da aula com voz feminina ajustada
   */
  static speak(
    text: string,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Seu navegador não possui suporte a síntese de voz.');
      return;
    }

    // Cancela qualquer fala anterior
    this.stop();

    const cleanText = text
      .replace(/[#*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0; // Velocidade natural
    utterance.pitch = 1.15; // Tom feminino natural e agradável

    const voice = this.getPreferredFemaleVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      this.isSpeakingNow = true;
      options.onStart?.();
    };

    utterance.onend = () => {
      this.isSpeakingNow = false;
      this.activeUtterance = null;
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      this.isSpeakingNow = false;
      this.activeUtterance = null;
      options.onError?.(e);
    };

    this.activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Interrompe imediatamente qualquer áudio em reprodução
   */
  static stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.isSpeakingNow = false;
      this.activeUtterance = null;
    }
  }

  /**
   * Pausa a reprodução atual
   */
  static pause(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }

  /**
   * Retoma a reprodução pausada
   */
  static resume(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }

  /**
   * Verifica se o áudio está tocando
   */
  static isPlaying(): boolean {
    return this.isSpeakingNow;
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
