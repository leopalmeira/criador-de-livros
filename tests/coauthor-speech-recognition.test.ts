import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Define window no ambiente Node se não estiver presente
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}

import { coAuthorSpeechService } from '../src/services/coauthor-speech-recognition-service';

describe('CoAuthorSpeechRecognitionEngine', () => {
  let mockRecognitionInstance: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockRecognitionInstance = {
      lang: '',
      continuous: false,
      interimResults: false,
      maxAlternatives: 1,
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onstart: null,
      onresult: null,
      onerror: null,
      onend: null
    };

    function MockSpeechRecognition() {
      return mockRecognitionInstance;
    }

    // Mock do window.webkitSpeechRecognition e SpeechRecognition com função construtora regular
    (globalThis.window as any).webkitSpeechRecognition = MockSpeechRecognition;
    (globalThis.window as any).SpeechRecognition = MockSpeechRecognition;

    // Mock de AudioContext
    function MockAudioContext() {
      return {
        createOscillator: () => ({
          type: 'sine',
          frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn()
        }),
        createGain: () => ({
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
          connect: vi.fn()
        }),
        createMediaStreamSource: () => ({
          connect: vi.fn()
        }),
        createAnalyser: () => ({
          fftSize: 256,
          smoothingTimeConstant: 0.5,
          frequencyBinCount: 128,
          getByteFrequencyData: vi.fn()
        }),
        destination: {},
        currentTime: 0,
        close: vi.fn()
      };
    }
    (globalThis.window as any).AudioContext = MockAudioContext;
    (globalThis.window as any).webkitAudioContext = MockAudioContext;

    // Mock de navigator.mediaDevices
    if (!globalThis.navigator) {
      (globalThis as any).navigator = {};
    }
    (globalThis.navigator as any).mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }]
      })
    };

    coAuthorSpeechService.cancel();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detecta suporte à Web Speech API nativa', () => {
    expect(coAuthorSpeechService.isSpeechSupported()).toBe(true);
  });

  it('inicia o reconhecimento em pt-BR e notifica ouvintes', async () => {
    const states: any[] = [];
    const unsub = coAuthorSpeechService.subscribe((st) => states.push({ ...st }));

    await coAuthorSpeechService.startListening('pt-BR');
    expect(mockRecognitionInstance.start).toHaveBeenCalled();
    expect(mockRecognitionInstance.lang).toBe('pt-BR');
    expect(mockRecognitionInstance.continuous).toBe(true);
    expect(mockRecognitionInstance.interimResults).toBe(true);

    // Simula evento onstart
    mockRecognitionInstance.onstart();

    const currentState = coAuthorSpeechService.getState();
    expect(currentState.isListening).toBe(true);

    unsub();
  });

  it('processa transcrição interim e final corretamente', async () => {
    await coAuthorSpeechService.startListening('pt-BR');
    mockRecognitionInstance.onstart();

    // Simula evento onresult com fala interim
    const mockEvent1 = {
      resultIndex: 0,
      results: [
        [{ transcript: 'Revisar enredo' }]
      ]
    };
    (mockEvent1.results[0] as any).isFinal = false;

    mockRecognitionInstance.onresult(mockEvent1);

    expect(coAuthorSpeechService.getState().interimTranscript).toBe('Revisar enredo');

    // Simula evento final
    const mockEvent2 = {
      resultIndex: 0,
      results: [
        [{ transcript: 'Revisar enredo da obra toda' }]
      ]
    };
    (mockEvent2.results[0] as any).isFinal = true;

    mockRecognitionInstance.onresult(mockEvent2);

    expect(coAuthorSpeechService.getState().finalTranscript).toBe('Revisar enredo da obra toda');
  });

  it('aciona callback de envio automático ao detectar silêncio', async () => {
    const onSubmitSpy = vi.fn();
    coAuthorSpeechService.setOnSubmit(onSubmitSpy);

    await coAuthorSpeechService.startListening('pt-BR');
    mockRecognitionInstance.onstart();

    const mockEvent = {
      resultIndex: 0,
      results: [
        [{ transcript: 'Criar capa autoral para o livro' }]
      ]
    };
    (mockEvent.results[0] as any).isFinal = true;
    mockRecognitionInstance.onresult(mockEvent);

    // Avança o temporizador de silêncio (1600ms)
    vi.advanceTimersByTime(1700);

    expect(onSubmitSpy).toHaveBeenCalledWith('Criar capa autoral para o livro');
    expect(coAuthorSpeechService.getState().isListening).toBe(false);
  });

  it('permite alternar Modo Conversa Contínua (Viva-Voz)', () => {
    const initial = coAuthorSpeechService.getState().continuousMode;
    const toggled = coAuthorSpeechService.toggleContinuousMode();
    expect(toggled).toBe(!initial);
    expect(coAuthorSpeechService.getState().continuousMode).toBe(!initial);
  });

  it('cancela a escuta e limpa o texto sem disparar callback', async () => {
    const onSubmitSpy = vi.fn();
    coAuthorSpeechService.setOnSubmit(onSubmitSpy);

    await coAuthorSpeechService.startListening('pt-BR');
    mockRecognitionInstance.onstart();

    const mockEvent = {
      resultIndex: 0,
      results: [
        [{ transcript: 'Texto que será cancelado' }]
      ]
    };
    (mockEvent.results[0] as any).isFinal = false;
    mockRecognitionInstance.onresult(mockEvent);

    coAuthorSpeechService.cancel();

    expect(onSubmitSpy).not.toHaveBeenCalled();
    expect(coAuthorSpeechService.getState().isListening).toBe(false);
    expect(coAuthorSpeechService.getState().interimTranscript).toBe('');
    expect(coAuthorSpeechService.getState().finalTranscript).toBe('');
  });
});
