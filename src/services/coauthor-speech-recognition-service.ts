// ================================================================
// SERVIÇO DE RECONHECIMENTO DE VOZ E CONVERSAÇÃO AO VIVO DO COAUTHOR
// BookEngin — Conversa Fluida por Áudio com o Agente CoAuthor Editorial
// Baseado no padrão Web Speech API (W3C / Google Speech Engine pt-BR)
// Inclui Analisador de Áudio em Tempo Real (VAD), Barge-in (Interrupção por Voz) e Viva-Voz Contínuo
// ================================================================

export interface SpeechRecognitionState {
  isSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  interimTranscript: string;
  finalTranscript: string;
  audioLevel: number; // 0 a 100
  continuousMode: boolean;
  isLiveSessionActive: boolean;
  error: string | null;
  silenceCountdownMs: number | null;
}

export type SpeechStateListener = (state: SpeechRecognitionState) => void;

class CoAuthorSpeechRecognitionEngine {
  private static STORAGE_CONTINUOUS_KEY = 'bookengin_coauthor_continuous_voice';

  private recognition: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  private isListeningInternal = false;
  private isUserSpeakingInternal = false;
  private interimTranscriptInternal = '';
  private finalTranscriptInternal = '';
  private audioLevelInternal = 0;
  private continuousModeInternal = true; // Por padrão ativado para conversa fluida
  private isLiveSessionActiveInternal = false;
  private errorInternal: string | null = null;

  private silenceTimer: any = null;
  private countdownInterval: any = null;
  private silenceCountdownMs: number | null = null;
  private readonly SILENCE_DELAY_MS = 1400; // 1.4s de pausa na fala para despacho natural

  private listeners: Set<SpeechStateListener> = new Set();
  private onMessageSubmitCallback: ((transcript: string) => void) | null = null;
  private onUserInterruptedCallback: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedContinuous = localStorage.getItem(CoAuthorSpeechRecognitionEngine.STORAGE_CONTINUOUS_KEY);
        if (savedContinuous !== null) {
          this.continuousModeInternal = savedContinuous === 'true';
        }
      } catch {}
    }
  }

  /**
   * Verifica se o navegador atual suporta reconhecimento de fala nativo (Chrome, Edge, Safari, etc.)
   */
  public isSpeechSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  /**
   * Inscreve um ouvinte para atualizações reativas de estado
   */
  public subscribe(listener: SpeechStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): SpeechRecognitionState {
    return {
      isSupported: this.isSpeechSupported(),
      isListening: this.isListeningInternal,
      isSpeaking: this.isUserSpeakingInternal,
      interimTranscript: this.interimTranscriptInternal,
      finalTranscript: this.finalTranscriptInternal,
      audioLevel: this.audioLevelInternal,
      continuousMode: this.continuousModeInternal,
      isLiveSessionActive: this.isLiveSessionActiveInternal,
      error: this.errorInternal,
      silenceCountdownMs: this.silenceCountdownMs
    };
  }

  private notify() {
    const st = this.getState();
    this.listeners.forEach(l => {
      try { l(st); } catch (e) { console.warn('[CoAuthorSpeech] Erro no listener:', e); }
    });
  }

  /**
   * Define o callback que será disparado quando uma fala completa for finalizada
   */
  public setOnSubmit(callback: (transcript: string) => void) {
    this.onMessageSubmitCallback = callback;
  }

  /**
   * Define callback de Barge-In (quando o usuário começa a falar enquanto a IA fala, ela se cala)
   */
  public setOnUserInterrupted(callback: () => void) {
    this.onUserInterruptedCallback = callback;
  }

  /**
   * Ativa ou desativa a sessão de Conversa por Voz Viva-Voz
   */
  public setLiveSessionActive(active: boolean) {
    this.isLiveSessionActiveInternal = active;
    if (!active) {
      this.stopListening(false);
    }
    this.notify();
  }

  /**
   * Ativa ou desativa o Modo Conversa Contínua (Hands-Free / Viva-Voz)
   */
  public setContinuousMode(enabled: boolean) {
    this.continuousModeInternal = enabled;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CoAuthorSpeechRecognitionEngine.STORAGE_CONTINUOUS_KEY, enabled ? 'true' : 'false');
      }
    } catch {}
    this.notify();
  }

  public toggleContinuousMode(): boolean {
    this.setContinuousMode(!this.continuousModeInternal);
    return this.continuousModeInternal;
  }

  /**
   * Toca um bip de feedback auditivo suave via Web Audio API
   */
  private playChime(type: 'start' | 'stop' | 'cancel') {
    if (typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'start') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.1);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'stop') {
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.11);
        osc.start(now);
        osc.stop(now + 0.11);
      } else {
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(260, now + 0.08);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }

      setTimeout(() => {
        try { ctx.close(); } catch {}
      }, 250);
    } catch {}
  }

  /**
   * Inicia o analisador de volume e onda de áudio do microfone
   */
  private async startAudioAnalyser(): Promise<void> {
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof requestAnimationFrame === 'undefined'
    ) {
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.isListeningInternal || !this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));

        this.audioLevelInternal = normalized;
        const speakingNow = normalized > 13;
        this.isUserSpeakingInternal = speakingNow;

        // BARGE-IN: Se o usuário falou enquanto o agente estava falando, aciona interrupção imediata!
        if (speakingNow && this.onUserInterruptedCallback) {
          this.onUserInterruptedCallback();
        }

        this.notify();
        this.animationFrameId = requestAnimationFrame(checkVolume);
      };

      this.animationFrameId = requestAnimationFrame(checkVolume);
    } catch (err) {
      console.warn('[CoAuthorSpeech] Analisador de microfone não iniciado:', err);
    }
  }

  /**
   * Para o analisador de áudio e libera os canais do microfone
   */
  private stopAudioAnalyser(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch {}
      this.audioContext = null;
    }
    this.analyser = null;
    this.audioLevelInternal = 0;
    this.isUserSpeakingInternal = false;
  }

  /**
   * Dispara ou renova o temporizador de detecção de silêncio para envio automático
   */
  private resetSilenceTimer(): void {
    this.clearSilenceTimer();

    const fullText = (this.finalTranscriptInternal + ' ' + this.interimTranscriptInternal).trim();
    if (!fullText) return;

    let remainingMs = this.SILENCE_DELAY_MS;
    this.silenceCountdownMs = remainingMs;
    this.notify();

    this.countdownInterval = setInterval(() => {
      remainingMs -= 150;
      this.silenceCountdownMs = Math.max(0, remainingMs);
      this.notify();
    }, 150);

    this.silenceTimer = setTimeout(() => {
      this.clearSilenceTimer();
      this.commitAndSubmit();
    }, this.SILENCE_DELAY_MS);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.silenceCountdownMs = null;
  }

  /**
   * Inicia o reconhecimento de voz do microfone
   */
  public async startListening(lang: string = 'pt-BR'): Promise<void> {
    if (typeof window === 'undefined') return;

    if (!this.isSpeechSupported()) {
      this.errorInternal = 'Seu navegador não suporta a Web Speech API nativa. Recomendamos o Google Chrome ou Edge.';
      this.notify();
      return;
    }

    if (this.isListeningInternal) {
      return;
    }

    this.errorInternal = null;
    this.interimTranscriptInternal = '';
    this.finalTranscriptInternal = '';
    this.clearSilenceTimer();

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.lang = lang;
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListeningInternal = true;
        this.playChime('start');
        this.notify();
      };

      this.recognition.onresult = (event: any) => {
        // BARGE-IN: Ao receber som/palavras reconhecidas, cala o assistente caso ele ainda esteja falando
        if (this.onUserInterruptedCallback) {
          this.onUserInterruptedCallback();
        }

        let interim = '';
        let finalSegment = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0]?.transcript || '';
          if (res.isFinal) {
            finalSegment += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        if (finalSegment) {
          this.finalTranscriptInternal = (this.finalTranscriptInternal + ' ' + finalSegment).trim();
        }
        this.interimTranscriptInternal = interim.trim();

        this.resetSilenceTimer();
        this.notify();
      };

      this.recognition.onerror = (event: any) => {
        console.warn('[CoAuthorSpeech] Evento de erro:', event.error);
        if (event.error === 'not-allowed') {
          this.errorInternal = 'Acesso ao microfone negado. Por favor, permita o microfone no ícone de cadeado do navegador.';
          this.stopListening(false);
        } else if (event.error === 'network') {
          this.errorInternal = 'Erro de rede na transcrição de voz. Verifique sua conexão com a internet.';
          this.stopListening(false);
        } else if (event.error !== 'no-speech') {
          this.errorInternal = `Erro no reconhecimento: ${event.error}`;
        }
        this.notify();
      };

      this.recognition.onend = () => {
        // Se ainda está na sessão de conversa e deve continuar escutando
        if (this.isListeningInternal && !this.errorInternal) {
          try {
            this.recognition?.start();
          } catch {
            this.isListeningInternal = false;
            this.stopAudioAnalyser();
            this.notify();
          }
        } else {
          this.isListeningInternal = false;
          this.stopAudioAnalyser();
          this.notify();
        }
      };

      this.recognition.start();
      await this.startAudioAnalyser();
    } catch (err: any) {
      console.warn('[CoAuthorSpeech] Falha ao iniciar reconhecimento:', err);
      this.errorInternal = 'Não foi possível acessar o microfone: ' + (err?.message || err);
      this.isListeningInternal = false;
      this.stopAudioAnalyser();
      this.notify();
    }
  }

  /**
   * Finaliza a fala atual e despacha a mensagem transcrita para a IA
   */
  public commitAndSubmit(): void {
    const fullText = (this.finalTranscriptInternal + ' ' + this.interimTranscriptInternal).trim();
    this.stopListening(false);

    if (fullText) {
      this.playChime('stop');
      if (this.onMessageSubmitCallback) {
        this.onMessageSubmitCallback(fullText);
      }
    }

    this.interimTranscriptInternal = '';
    this.finalTranscriptInternal = '';
    this.notify();
  }

  /**
   * Para o reconhecimento de voz
   * @param playCancelChime se deve tocar som de cancelamento
   */
  public stopListening(playCancelChime = true): void {
    this.clearSilenceTimer();
    this.isListeningInternal = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    this.stopAudioAnalyser();

    if (playCancelChime) {
      this.playChime('cancel');
    }

    this.interimTranscriptInternal = '';
    this.notify();
  }

  /**
   * Cancela a escuta atual sem enviar nada
   */
  public cancel(): void {
    this.finalTranscriptInternal = '';
    this.interimTranscriptInternal = '';
    this.stopListening(true);
  }
}

export const coAuthorSpeechService = new CoAuthorSpeechRecognitionEngine();
