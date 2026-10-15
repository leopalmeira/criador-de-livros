import { describe, it, expect, beforeEach, vi } from 'vitest';
import { coAuthorVoiceService } from '../src/services/coauthor-voice-service';

describe('CoAuthorVoiceEngine — Síntese Neural Natural da Plataforma', () => {
  beforeEach(() => {
    coAuthorVoiceService.stop();
  });

  it('limpa adequadamente tags de controle de IA, código e markdown', () => {
    const raw = `
      <<<ALINHAMENTO_CONCLUIDO>>>
      {"status": "ok"}
      <<<FIM_ALINHAMENTO>>>
      # Olá Escritor!
      Este é um **teste** com _itálico_ e [link](https://exemplo.com).
      \`\`\`ts
      const x = 10;
      \`\`\`
      | Coluna 1 | Coluna 2 |
      |---|---|
      | A | B |
      • Ponto 1
      • Ponto 2
      ━━━━━━━━━━━━━━━━━━━━
    `;

    const cleaned = coAuthorVoiceService.cleanTextForSpeech(raw);
    expect(cleaned).not.toContain('<<<ALINHAMENTO_CONCLUIDO>>>');
    expect(cleaned).not.toContain('const x = 10');
    expect(cleaned).not.toContain('Coluna 1');
    expect(cleaned).not.toContain('#');
    expect(cleaned).not.toContain('**');
    expect(cleaned).toContain('Olá Escritor!');
    expect(cleaned).toContain('Este é um teste com itálico e link.');
  });

  it('divide textos longos em chunks naturais de frases com tamanho equilibrado', () => {
    const text = 'Esta é a primeira frase da explicação. Aqui está a segunda frase que complementa o pensamento. Por fim, esta é a terceira frase concluindo a resposta com maestria e precisão.';
    const chunks = coAuthorVoiceService.splitIntoChunks(text);

    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(230);
    });
  });

  it('alterna o estado da voz e salva no localStorage', () => {
    const initialState = coAuthorVoiceService.isVoiceEnabled();
    const toggled = coAuthorVoiceService.toggleVoice();
    expect(toggled).toBe(!initialState);
    expect(coAuthorVoiceService.isVoiceEnabled()).toBe(!initialState);

    // Retorna ao estado inicial
    coAuthorVoiceService.setVoiceEnabled(initialState);
    expect(coAuthorVoiceService.isVoiceEnabled()).toBe(initialState);
  });

  it('permite alternar entre as vozes neurais da plataforma (Francisca e Antônio)', () => {
    coAuthorVoiceService.setVoiceGender('female');
    expect(coAuthorVoiceService.getVoiceGender()).toBe('female');
    expect(coAuthorVoiceService.getActiveVoiceLabel()).toContain('Francisca');

    coAuthorVoiceService.setVoiceGender('male');
    expect(coAuthorVoiceService.getVoiceGender()).toBe('male');
    expect(coAuthorVoiceService.getActiveVoiceLabel()).toContain('Antônio');

    // Restaura padrão
    coAuthorVoiceService.setVoiceGender('female');
  });

  it('interrompe imediatamente qualquer reprodução quando stop() é chamado', () => {
    coAuthorVoiceService.stop();
    expect(coAuthorVoiceService.isSpeaking()).toBe(false);
    expect(coAuthorVoiceService.getCurrentMessageId()).toBeNull();
  });
});
