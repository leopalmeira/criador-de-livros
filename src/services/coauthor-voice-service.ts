// ================================================================
// SERVIÇO DE VOZ NEURAL HUMANA DO COAUTHOR E ASSISTENTE DE ESCRITA
// BookEngin — Voz Neural Natural da Plataforma (Francisca / Antonio)
// Reprodução de Áudio MP3 em Tempo Real via HTML5 Audio com Prefetch
// ================================================================

export type VoiceGender = 'female' | 'male';

export interface VoiceState {
  isSpeaking: boolean;
  currentMessageId: string | null;
  isEnabled: boolean;
  gender: VoiceGender;
}

export type VoiceStateListener = (state: VoiceState) => void;

class CoAuthorVoiceEngine {
  private static STORAGE_KEY = 'bookengin_coauthor_voice_enabled';
  private static GENDER_KEY = 'bookengin_coauthor_voice_gender';

  private isSpeakingNow: boolean = false;
  private currentMessageId: string | null = null;
  private listeners: Set<VoiceStateListener> = new Set();

  private currentAudio: HTMLAudioElement | null = null;
  private abortController: AbortController | null = null;
  private activePlayToken: number = 0;

  // Cache em memória de áudios sintetizados para resposta instantânea ao clicar replay
  private audioBlobCache: Map<string, string> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      // Sincronização entre abas/janelas
      window.addEventListener('storage', (e) => {
        if (e.key === CoAuthorVoiceEngine.STORAGE_KEY || e.key === CoAuthorVoiceEngine.GENDER_KEY) {
          this.notifyListeners();
        }
      });
    }
  }

  private memoryStore: Map<string, string> = new Map();

  private getItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch {}
    }
    return this.memoryStore.get(key) ?? null;
  }

  private setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {}
    }
    this.memoryStore.set(key, value);
  }

  /**
   * Verifica se o áudio está habilitado pelo usuário
   */
  public isVoiceEnabled(): boolean {
    const saved = this.getItem(CoAuthorVoiceEngine.STORAGE_KEY);
    // Padrão: ativado
    return saved === null ? true : saved === 'true';
  }

  /**
   * Habilita ou desabilita o áudio da voz do CoAuthor
   */
  public setVoiceEnabled(enabled: boolean): void {
    this.setItem(CoAuthorVoiceEngine.STORAGE_KEY, enabled ? 'true' : 'false');
    if (!enabled) {
      this.stop();
    }
    this.notifyListeners();
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
   * Obtém o gênero da voz neural selecionada (padrão: feminina - Francisca Neural)
   */
  public getVoiceGender(): VoiceGender {
    const saved = this.getItem(CoAuthorVoiceEngine.GENDER_KEY);
    return (saved === 'male' || saved === 'female') ? saved : 'female';
  }

  /**
   * Define o gênero da voz neural ('female' ou 'male')
   */
  public setVoiceGender(gender: VoiceGender): void {
    this.setItem(CoAuthorVoiceEngine.GENDER_KEY, gender);
    this.stop();
    this.notifyListeners();
  }

  /**
   * Nome amigável da voz neural ativa na plataforma
   */
  public getActiveVoiceLabel(): string {
    const gender = this.getVoiceGender();
    return gender === 'female' ? 'Francisca Neural (Humana Natural)' : 'Antônio Neural (Humano Natural)';
  }

  /**
   * Higieniza o texto markdown e remove metadados/comandos técnicos da IA antes da síntese
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
      // Remove tabelas em markdown
      .replace(/\|[^\n]+\|/g, '')
      // Remove markdown de cabeçalhos, negritos, itálicos, links
      .replace(/#{1,6}\s+/g, '')
      .replace(/[*_`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove bullet points decorativos
      .replace(/^[•\-\*]\s+/gm, '')
      // Remove sequências de separadores
      .replace(/━━+/g, '')
      .replace(/===+/g, '')
      .replace(/---+/g, '')
      // Normaliza espaçamento
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Divide o texto em fragmentos naturais de frases (~120 a 220 caracteres)
   * Isso permite iniciar a reprodução em menos de 300ms enquanto os próximos blocos
   * são pré-carregados silenciosamente em background.
   */
  public splitIntoChunks(text: string): string[] {
    const clean = this.cleanTextForSpeech(text);
    if (!clean) return [];

    const sentences = clean.split(/(?<=[.?!;:\n])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + ' ' + sentence).length < 220) {
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
   * Sintetiza e fala o texto da resposta do assistente com a voz neural humana da plataforma
   */
  public async speak(
    text: string,
    messageId?: string,
    options: { onStart?: () => void; onEnd?: () => void; forcePlay?: boolean } = {}
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    // Se o áudio estiver desligado e não for play forçado pelo usuário no botão, não fala
    if (!this.isVoiceEnabled() && !options.forcePlay) {
      return;
    }

    // Interrompe imediatamente qualquer fala anterior
    this.stop();

    const clean = this.cleanTextForSpeech(text);
    if (!clean) return;

    const chunks = this.splitIntoChunks(clean);
    if (chunks.length === 0) return;

    const playToken = ++this.activePlayToken;
    this.currentMessageId = messageId || null;
    this.isSpeakingNow = true;
    this.abortController = new AbortController();
    this.notifyListeners();
    options.onStart?.();

    try {
      await this.playChunksSequentially(chunks, playToken, options.onEnd);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('[CoAuthorVoice] Erro ao reproduzir voz neural:', err);
      }
    }
  }

  /**
   * Reproduz os blocos sequencialmente com prefetch paralelo (zero intervalo perceptível)
   */
  private async playChunksSequentially(
    chunks: string[],
    playToken: number,
    finalCallback?: () => void
  ): Promise<void> {
    let nextAudioPromise: Promise<string | null> | null = null;

    for (let i = 0; i < chunks.length; i++) {
      if (this.activePlayToken !== playToken) return;

      const chunk = chunks[i];

      // 1. Obtém áudio do chunk atual
      const audioUrl = nextAudioPromise 
        ? await nextAudioPromise 
        : await this.fetchNeuralAudioUrl(chunk, this.abortController?.signal);

      if (this.activePlayToken !== playToken) return;

      // 2. Pré-carrega o próximo chunk em paralelo enquanto o atual vai tocar
      if (i + 1 < chunks.length) {
        nextAudioPromise = this.fetchNeuralAudioUrl(chunks[i + 1], this.abortController?.signal);
      } else {
        nextAudioPromise = null;
      }

      // 3. Se a síntese neural não retornou áudio (ex: backend offline), tenta fallback gracioso
      if (!audioUrl) {
        await this.fallbackSpeakChunk(chunk, playToken);
        continue;
      }

      // 4. Executa o áudio através de elemento HTMLAudioElement
      await this.playAudioElement(audioUrl, playToken);
    }

    if (this.activePlayToken === playToken) {
      this.isSpeakingNow = false;
      this.currentMessageId = null;
      this.notifyListeners();
      finalCallback?.();
    }
  }

  /**
   * Executa a tag Audio com promessa até o término da fala
   */
  private playAudioElement(audioUrl: string, playToken: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.activePlayToken !== playToken) {
        return resolve();
      }

      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      const cleanup = () => {
        audio.onended = null;
        audio.onerror = null;
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        resolve();
      };

      audio.onended = cleanup;
      audio.onerror = (e) => {
        console.warn('[CoAuthorVoice] Erro no player de áudio:', e);
        cleanup();
      };

      audio.play().catch((playErr) => {
        console.warn('[CoAuthorVoice] Play interrompido ou política de autoplay:', playErr);
        cleanup();
      });
    });
  }

  /**
   * Busca o áudio sintetizado em MP3 da voz neural na plataforma
   */
  private async fetchNeuralAudioUrl(text: string, signal?: AbortSignal): Promise<string | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const gender = this.getVoiceGender();
    const cacheKey = `neural_coauthor_${gender}_${trimmed}`;

    if (this.audioBlobCache.has(cacheKey)) {
      return this.audioBlobCache.get(cacheKey)!;
    }

    // 1. Tenta endpoint direto de prévia vocal (/api/audiobook/preview-voice)
    try {
      const res = await fetch('/api/audiobook/preview-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'pt-BR',
          voiceGender: gender,
          text: trimmed
        }),
        signal
      });

      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 200) {
          const url = URL.createObjectURL(blob);
          this.audioBlobCache.set(cacheKey, url);
          return url;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn('[CoAuthorVoice] Endpoint preview-voice falhou, tentando rota /api/tts/synthesize:', err);
    }

    // 2. Rota alternativa (/api/tts/synthesize)
    try {
      const res = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          lang: 'pt-BR',
          voiceGender: gender
        }),
        signal
      });

      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 200) {
          const url = URL.createObjectURL(blob);
          this.audioBlobCache.set(cacheKey, url);
          return url;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn('[CoAuthorVoice] Rota /api/tts/synthesize indisponível:', err);
    }

    return null;
  }

  /**
   * Fallback de emergência caso o servidor local esteja completamente desconectado
   */
  private fallbackSpeakChunk(chunk: string, playToken: number): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis || this.activePlayToken !== playToken) {
        return resolve();
      }

      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.pitch = 1.1;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Interrompe imediatamente qualquer fala ou áudio em reprodução
   */
  public stop(): void {
    this.activePlayToken++;

    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {}
      this.abortController = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    if (this.isSpeakingNow) {
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
      isEnabled: this.isVoiceEnabled(),
      gender: this.getVoiceGender()
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state: VoiceState = {
      isSpeaking: this.isSpeakingNow,
      currentMessageId: this.currentMessageId,
      isEnabled: this.isVoiceEnabled(),
      gender: this.getVoiceGender()
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
