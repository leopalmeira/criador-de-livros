import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AudiobookService } from '../server/audiobook/service.js';
import { AudiobookStorage } from '../server/audiobook/storage.js';
import { TTSEngineManager } from '../server/audiobook/engine-manager.js';
import { TTSProvider } from '../server/audiobook/providers/tts-provider.js';

// Cria frame MPEG-2 Layer III válido para testes rápidos e reproduzíveis
function dummyMp3Buffer(): Buffer {
  const frame = Buffer.alloc(144);
  frame[0] = 0xff;
  frame[1] = 0xf3;
  frame[2] = 0x64;
  frame[3] = 0xc0;
  return frame;
}

class TestableTTSProvider extends TTSProvider {
  constructor(name: string, failOnText: string | null = null, failTimes = 0) {
    super({ name, priority: 100, honorsGender: true });
    this.name = name;
    this.failOnText = failOnText;
    this.failTimes = failTimes;
    this.synthesized = [];
  }

  failOnText: string | null;
  failTimes: number;
  synthesized: Array<{ text: string; language: string; gender: string }>;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  supports(language: string): boolean {
    return true;
  }

  async synthesizeSegment(text: string, language: string, gender: string): Promise<Buffer> {
    this.synthesized.push({ text, language, gender });
    if (this.failOnText && text.includes(this.failOnText) && this.failTimes > 0) {
      this.failTimes--;
      throw new Error(`Falha simulada para teste de resiliência em: ${this.failOnText}`);
    }
    // Retorna alguns frames MP3 válidos
    return Buffer.concat([dummyMp3Buffer(), dummyMp3Buffer()]);
  }
}

describe('AudiobookStudio — Geração Completa, Resiliência e Retomada', () => {
  let tmpDir: string;
  let storage: AudiobookStorage;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kdp-audiobook-suite-'));
    storage = new AudiobookStorage(tmpDir);
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  const sampleBook = {
    title: 'O Enigma de Atlântida',
    subtitle: 'Segredos Submersos Revelados',
    author: 'Estêvão Montenegro',
    chapters: [
      { title: 'O Chamado das Profundezas', text: 'As ondas quebravam contra o casco do navio de exploração.' },
      { title: 'O Mapa Antigo', text: 'No diário de bordo, uma coordenada esquecida apontava para o abismo.' },
      { title: 'A Descoberta', text: 'As luzes do submarino iluminaram colunas esculpidas em pedra milenar.' }
    ]
  };

  it('1. Gera audiobook completo em Português Masculino (3 capítulos + introdução + final)', async () => {
    const provider = new TestableTTSProvider('mock-neural');
    const engineManager = new TTSEngineManager({ registerDefaults: false });
    engineManager.register(provider);

    const service = new AudiobookService({ storage, engineManager, sleep: () => Promise.resolve() });
    const projectId = 'proj_pt_male';

    await service.saveManuscript(projectId, sampleBook);
    await service.startGeneration({ projectId, language: 'pt-BR', voiceGender: 'male' });
    const result = await service.waitForJob(projectId);

    expect(result.status).toBe('completed');
    expect(result.finalReady).toBe(true);
    expect(result.completedCount).toBe(4); // 1 intro + 3 capítulos
    expect(result.totalUnits).toBe(4);
    expect(result.durationSeconds).toBeGreaterThan(0);
    expect(result.voiceGender).toBe('male');
    expect(result.language.id).toBe('pt-BR');

    // Valida arquivos individuais no disco
    const introFile = storage.chapterPath(projectId, '01-introducao.mp3');
    const ch1File = storage.chapterPath(projectId, '02-capitulo-01.mp3');
    const ch2File = storage.chapterPath(projectId, '03-capitulo-02.mp3');
    const ch3File = storage.chapterPath(projectId, '04-capitulo-03.mp3');
    const finalFile = storage.finalPath(projectId);

    expect(fs.existsSync(introFile)).toBe(true);
    expect(fs.existsSync(ch1File)).toBe(true);
    expect(fs.existsSync(ch2File)).toBe(true);
    expect(fs.existsSync(ch3File)).toBe(true);
    expect(fs.existsSync(finalFile)).toBe(true);

    // Valida metadata.json
    const meta = await storage.readJson(projectId, 'metadata.json');
    expect(meta.status).toBe('completed');
    expect(meta.completedChapters.length).toBe(4);
    expect(meta.pendingChapters.length).toBe(0);
  }, 15000);

  it('2. Gera audiobook em Português Feminino e preserva a voz feminina', async () => {
    const provider = new TestableTTSProvider('mock-neural');
    const engineManager = new TTSEngineManager({ registerDefaults: false });
    engineManager.register(provider);

    const service = new AudiobookService({ storage, engineManager, sleep: () => Promise.resolve() });
    const projectId = 'proj_pt_female';

    await service.saveManuscript(projectId, sampleBook);
    await service.startGeneration({ projectId, language: 'pt-BR', voiceGender: 'female' });
    const result = await service.waitForJob(projectId);

    expect(result.status).toBe('completed');
    expect(result.voiceGender).toBe('female');
    for (const call of provider.synthesized) {
      expect(call.gender).toBe('female');
    }
  }, 15000);

  it('3. Gera audiobook em Inglês Masculino e Inglês Feminino', async () => {
    const provider = new TestableTTSProvider('mock-neural');
    const engineManager = new TTSEngineManager({ registerDefaults: false });
    engineManager.register(provider);

    const service = new AudiobookService({ storage, engineManager, sleep: () => Promise.resolve() });

    // Inglês Masculino
    await service.saveManuscript('proj_en_male', sampleBook);
    await service.startGeneration({ projectId: 'proj_en_male', language: 'en-US', voiceGender: 'male' });
    const resMale = await service.waitForJob('proj_en_male');
    expect(resMale.status).toBe('completed');
    expect(resMale.language.id).toBe('en-US');
    expect(resMale.voiceGender).toBe('male');

    // Inglês Feminino
    await service.saveManuscript('proj_en_female', sampleBook);
    await service.startGeneration({ projectId: 'proj_en_female', language: 'en-US', voiceGender: 'female' });
    const resFemale = await service.waitForJob('proj_en_female');
    expect(resFemale.status).toBe('completed');
    expect(resFemale.language.id).toBe('en-US');
    expect(resFemale.voiceGender).toBe('female');
  });

  it('4. Falha temporária em um capítulo: repete automaticamente e conclui sem abortar', async () => {
    // Falha apenas 1 vez no Capítulo 2, depois passa na repetição automática
    const provider = new TestableTTSProvider('mock-neural', 'O Mapa Antigo', 1);
    const engineManager = new TTSEngineManager({ registerDefaults: false });
    engineManager.register(provider);

    const service = new AudiobookService({
      storage,
      engineManager,
      maxChapterAttempts: 3,
      sleep: () => Promise.resolve() // sem delay no teste
    });

    const projectId = 'proj_retry_ok';
    await service.saveManuscript(projectId, sampleBook);
    await service.startGeneration({ projectId, language: 'pt-BR', voiceGender: 'male' });
    const result = await service.waitForJob(projectId);

    expect(result.status).toBe('completed');
    expect(result.completedCount).toBe(4);
  });

  it('5. Retomada transparente: se um capítulo falhar, a continuação NÃO regera os já concluídos', async () => {
    // Provedor falha persistentemente no capítulo 2 na primeira execução
    const provider = new TestableTTSProvider('mock-neural', 'O Mapa Antigo', 99);
    const engineManager = new TTSEngineManager({ registerDefaults: false });
    engineManager.register(provider);

    const service = new AudiobookService({
      storage,
      engineManager,
      maxChapterAttempts: 2,
      sleep: () => Promise.resolve()
    });

    const projectId = 'proj_resume_test';
    await service.saveManuscript(projectId, sampleBook);

    // 1ª Execução: deve concluir intro e cap 1, e parar em estado 'partial' no cap 2
    await service.startGeneration({ projectId, language: 'pt-BR', voiceGender: 'male' });
    const status1 = await service.waitForJob(projectId);

    expect(status1.status).toBe('partial');
    expect(status1.completedCount).toBe(3); // intro + cap 1 + cap 3 prontos; apenas cap 2 falhou
    expect(status1.resumeFrom.file).toBe('03-capitulo-02.mp3');
    expect(status1.resumeFrom.index).toBe(2);

    // Remove a falha simulada (serviço voltou ao normal)
    provider.failTimes = 0;
    const previousSynthesizedCount = provider.synthesized.length;

    // 2ª Execução: continuar de onde parou
    await service.startGeneration({ projectId, language: 'pt-BR', voiceGender: 'male' });
    const status2 = await service.waitForJob(projectId);

    expect(status2.status).toBe('completed');
    expect(status2.completedCount).toBe(4);
    expect(status2.finalReady).toBe(true);

    // Verificação chave de retomada: intro, cap 1 e cap 3 NÃO foram sintetizados novamente!
    // Apenas o capítulo 2 pendente foi sintetizado.
    const newCalls = provider.synthesized.slice(previousSynthesizedCount);
    const reSynthesizedIntro = newCalls.some((c) => c.text.includes('O Enigma de Atlântida') && c.text.includes('Por'));
    const reSynthesizedCap1 = newCalls.some((c) => c.text.includes('O Chamado das Profundezas'));
    const reSynthesizedCap3 = newCalls.some((c) => c.text.includes('A Descoberta'));

    expect(reSynthesizedIntro).toBe(false);
    expect(reSynthesizedCap1).toBe(false);
    expect(reSynthesizedCap3).toBe(false);
    expect(newCalls.length).toBe(1); // sintetizou estritamente apenas o capítulo que faltava!
  });
});
