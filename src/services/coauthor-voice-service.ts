// ================================================================
// SERVIÇO DE VOZ FEMININA DO COAUTHOR E ASSISTENTE DE ESCRITA
// BookEngin — Síntese de Voz Natural em Português com Controle Global
// ================================================================

export type VoiceStateListener = (state: { isSpeaking: boolean; currentMessageId: string | null; isEnabled: boolean }) => void;

class CoAuthorVoiceEngine {
  private static STORAGE_KEY = 'bookengin_coauthor_voice_enabled';
  private cachedVoice: SpeechSynthesisVoice | null = null;
  private isSpeakingNow: boolean = false;
  private currentMessageId: string | null = null;
  private listeners: Set<VoiceStateListener> = new Set();
  private speechQueue: string[] = [];
  private currentChunkIndex: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Pré-carrega vozes do navegador
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoices();
        };
      }

      // Sincronização entre abas/janelas
      window.addEventListener('storage', (e) => {
        if (e.key === CoAuthorVoiceEngine.STORAGE_KEY) {
          this.notifyListeners();
        }
      });
    }
  }

  private initVoices(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      this.cachedVoice = this.findBestFemaleVoice(voices);
    }
  }

  /**
   * Encontra a voz feminina de maior naturalidade em Português (Brasil)
   */
  public findBestFemaleVoice(voicesList?: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = voicesList || window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Filtra vozes em português
    const ptVoices = voices.filter(v => v.lang.toLowerCase().startsWith('pt'));
    if (ptVoices.length === 0) {
      // Fallback para qualquer voz disponível
      return voices[0] || null;
    }

    // 2. Busca pelas vozes femininas reconhecidas no Windows/Chrome/Edge/macOS
    const femaleKeywords = [
      'francisca', 'luciana', 'maria', 'leticia', 'fernanda', 
      'heloisa', 'yara', 'helena', 'zira', 'lucia', 'female', 'mulher'
    ];

    const matchedFemale = ptVoices.find(v => {
      const nameLower = v.name.toLowerCase();
      return femaleKeywords.some(keyword => nameLower.includes(keyword));
    });

    if (matchedFemale) return matchedFemale;

    // 3. Fallback: voz pt-BR do Google ou Microsoft
    const brVoice = ptVoices.find(v => v.lang.toLowerCase().includes('br')) || ptVoices[0];
    return brVoice || null;
  }

  /**
   * Verifica se o áudio está habilitado pelo usuário
   */
  public isVoiceEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(CoAuthorVoiceEngine.STORAGE_KEY);
    // Padrão: ativado
    return saved === null ? true : saved === 'true';
  }

  /**
   * Habilita ou desabilita o áudio da voz do CoAuthor
   */
  public setVoiceEnabled(enabled: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CoAuthorVoiceEngine.STORAGE_KEY, enabled ? 'true' : 'false');
      // Se estiver desabilitando e houver áudio tocando, interrompe na hora
      if (!enabled) {
        this.stop();
      }
      this.notifyListeners();
    }
  }

  /**
   * Alterna o estado do áudio (liga/desliga)
   */
  public toggleVoice(): boolean {
    const newState = !this.isVoiceEnabled();
    this.setVoiceEnabled(newState);
    return newState;
  }

  /**
   * Higieniza o texto markdown e remove metadados/comandos técnicos da IA
   */
  public cleanTextForSpeech(text: string): string {
    if (!text) return '';

    return text
      // Remove tags de blocos estruturados de alinhamento e revisão
      .replace(/<<<ALINHAMENTO_CONCLUIDO>>>[\s\S]*?<<<FIM_ALINHAMENTO>>>/gi, '')
      .replace(/<<<SUGESTAO_OBRA_COMPLETA>>>[\s\S]*?<<<FIM_OBRA_COMPLETA>>>/gi, '')
      .replace(/<<<ENRIQUECIMENTO>>>[\s\S]*?<<<FIM_ENRIQUECIMENTO>>>/gi, '')
      // Remove blocos de código
      .replace(/```[\s\S]*?```/g, '')
      // Remove markdown de cabeçalhos, negritos, itálicos, links
      .replace(/#{1,6}\s+/g, '')
      .replace(/[*_`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove bullet points decorativos
      .replace(/^[•\-\*]\s+/gm, '')
      // Remove emojis excessivos ou sequências de pontuação
      .replace(/━━+/g, '')
      .replace(/===+/g, '')
      .replace(/---+/g, '')
      // Normaliza espaçamento
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Divide o texto em fragmentos menores para evitar bug de timeout no Chrome SpeechSynthesis
   */
  private splitIntoChunks(text: string): string[] {
    const clean = this.cleanTextForSpeech(text);
    if (!clean) return [];

    // Quebra por sentenças (ponto final, interrogação, exclamação ou quebras)
    const sentences = clean.split(/(?<=[.?!;:\n])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + ' ' + sentence).length < 200) {
        currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sentence;
      }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks.filter(c => c.trim().length > 0);
  }

  /**
   * Sintetiza e fala o texto da resposta do CoAuthor com a voz feminina
   */
  public speak(
    text: string,
    messageId?: string,
    options: { onStart?: () => void; onEnd?: () => void; forcePlay?: boolean } = {}
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Se o áudio estiver desligado e não for play forçado pelo usuário no botão, não fala
    if (!this.isVoiceEnabled() && !options.forcePlay) {
      return;
    }

    // Interrompe qualquer fala anterior antes de começar a nova
    this.stop();

    const chunks = this.splitIntoChunks(text);
    if (chunks.length === 0) return;

    this.speechQueue = chunks;
    this.currentChunkIndex = 0;
    this.currentMessageId = messageId || null;
    this.isSpeakingNow = true;
    this.notifyListeners();
    options.onStart?.();

    this.playNextChunk(options.onEnd);
  }

  /**
   * Executa a fila de chunks de fala sequencialmente
   */
  private playNextChunk(finalCallback?: () => void): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (this.currentChunkIndex >= this.speechQueue.length) {
      this.isSpeakingNow = false;
      this.currentMessageId = null;
      this.notifyListeners();
      finalCallback?.();
      return;
    }

    const chunk = this.speechQueue[this.currentChunkIndex];
    const utterance = new SpeechSynthesisUtterance(chunk);

    utterance.lang = 'pt-BR';
    utterance.rate = 1.02; // Ritmo ágil e dinâmico
    utterance.pitch = 1.15; // Tom feminino natural e caloroso

    const voice = this.cachedVoice || this.findBestFemaleVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      this.currentChunkIndex++;
      this.playNextChunk(finalCallback);
    };

    utterance.onerror = (e) => {
      console.warn('[CoAuthorVoice] Erro na síntese de voz:', e);
      this.currentChunkIndex++;
      this.playNextChunk(finalCallback);
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Interrompe imediatamente qualquer áudio em reprodução
   */
  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.speechQueue = [];
      this.currentChunkIndex = 0;
      this.isSpeakingNow = false;
      this.currentMessageId = null;
      this.notifyListeners();
    }
  }

  public isSpeaking(): boolean {
    return this.isSpeakingNow;
  }

  public getCurrentMessageId(): string | null {
    return this.currentMessageId;
  }

  /**
   * Inscreve um componente para receber atualizações do estado da voz
   */
  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    // Dispara estado inicial
    listener({
      isSpeaking: this.isSpeakingNow,
      currentMessageId: this.currentMessageId,
      isEnabled: this.isVoiceEnabled()
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = {
      isSpeaking: this.isSpeakingNow,
      currentMessageId: this.currentMessageId,
      isEnabled: this.isVoiceEnabled()
    };
    this.listeners.forEach(l => {
      try {
        l(state);
      } catch (e) {
        console.warn('[CoAuthorVoice] Erro no listener:', e);
      }
    });
  }
}

export const coAuthorVoiceService = new CoAuthorVoiceEngine();
