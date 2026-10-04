import { describe, it, expect } from 'vitest';
import { TTSEngineManager } from '../server/audiobook/engine-manager.js';
import { TTSProvider } from '../server/audiobook/providers/tts-provider.js';

// Cria frame MPEG-2 Layer III válido para mockar retorno de áudio
function dummyMp3Buffer(): Buffer {
  const frame = Buffer.alloc(144);
  frame[0] = 0xff;
  frame[1] = 0xf3;
  frame[2] = 0x64;
  frame[3] = 0xc0;
  return frame;
}

class MockTTSProvider extends TTSProvider {
  constructor(name: string, priority: number, honorsGender = true, failCount = 0) {
    super({ name, priority, honorsGender });
    this.name = name;
    this.priority = priority;
    this.honorsGender = honorsGender;
    this.failRemaining = failCount;
    this.calls = [];
  }

  failRemaining: number;
  calls: Array<{ text: string; language: string; gender: string }>;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  supports(language: string): boolean {
    return true;
  }

  async synthesizeSegment(text: string, language: string, gender: string): Promise<Buffer> {
    this.calls.push({ text, language, gender });
    if (this.failRemaining > 0) {
      this.failRemaining--;
      throw new Error(`Simulated failure in ${this.name}`);
    }
    return dummyMp3Buffer();
  }
}

describe('AudiobookStudio — TTS Engine Manager (Seleção Automática e Recuperação)', () => {
  it('1. Seleciona automaticamente o melhor motor por prioridade e suporte a idioma/gênero', async () => {
    const manager = new TTSEngineManager({ registerDefaults: false });
    const p1 = new MockTTSProvider('low-prio', 10);
    const p2 = new MockTTSProvider('high-prio', 90);
    manager.register(p1);
    manager.register(p2);

    const result = await manager.synthesize('Olá leitor.', 'pt-BR', 'male');
    expect(result.engine).toBe('high-prio');
    expect(result.genderHonored).toBe(true);
    expect(p2.calls.length).toBe(1);
    expect(p1.calls.length).toBe(0);
  });

  it('2. Fallback automático: se o motor principal falhar após repetição, alterna para o próximo', async () => {
    const manager = new TTSEngineManager({ registerDefaults: false });
    // pTop falha sempre
    const pTop = new MockTTSProvider('top-failing', 100, true, 999);
    // pBackup funciona
    const pBackup = new MockTTSProvider('backup-working', 50, true, 0);

    manager.register(pTop);
    manager.register(pBackup);

    const result = await manager.synthesize('Capítulo um.', 'pt-BR', 'female');

    expect(result.engine).toBe('backup-working');
    expect(result.audio).toBeDefined();
    // Tentou o top e depois caiu para o backup
    expect(pTop.calls.length).toBeGreaterThan(0);
    expect(pBackup.calls.length).toBe(1);
  });

  it('3. Sticky Engine: mantém o mesmo motor para os próximos capítulos garantindo a mesma voz', async () => {
    const manager = new TTSEngineManager({ registerDefaults: false });
    const pA = new MockTTSProvider('engine-a', 80);
    const pB = new MockTTSProvider('engine-b', 70);

    manager.register(pA);
    manager.register(pB);

    // Primeira síntese: escolhe engine-a
    const r1 = await manager.synthesize('Introdução.', 'pt-BR', 'male');
    expect(r1.engine).toBe('engine-a');

    // Segunda síntese passando preferredEngine: deve manter engine-a
    const r2 = await manager.synthesize('Capítulo 1.', 'pt-BR', 'male', {
      preferredEngine: r1.engine
    });
    expect(r2.engine).toBe('engine-a');
  });
});
