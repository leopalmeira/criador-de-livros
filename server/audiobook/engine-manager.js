// ================================================================
// TTS ENGINE MANAGER — escolhe o melhor motor automaticamente
// Critérios: idioma, gênero, disponibilidade (health check cacheado),
// qualidade (prioridade), capacidade de manter a mesma voz.
// Falhou? Repete no mesmo motor; continuou falhando? troca de motor.
// O usuário nunca vê nem escolhe o motor.
// ================================================================

import { F5TTSProvider } from './providers/f5tts-provider.js';
import { KokoroProvider } from './providers/kokoro-provider.js';
import { XTTSProvider } from './providers/xtts-provider.js';
import { NeuralCloudProvider } from './providers/neural-cloud-provider.js';
import { BasicFallbackProvider } from './providers/basic-fallback-provider.js';

const sleepReal = (ms) => new Promise((r) => setTimeout(r, ms));

export class TTSEngineManager {
  /**
   * @param {{ providers?: import('./providers/tts-provider.js').TTSProvider[],
   *           attemptsPerEngine?: number, healthTtlMs?: number,
   *           sleep?: (ms:number)=>Promise<void>, logger?: Console }} [options]
   */
  constructor(options = {}) {
    if (options.providers) {
      this.providers = [...options.providers];
    } else if (options.registerDefaults === false) {
      this.providers = [];
    } else {
      this.providers = TTSEngineManager.defaultProviders();
    }
    this.attemptsPerEngine = options.attemptsPerEngine ?? 2;
    this.healthTtlMs = options.healthTtlMs ?? 60_000;
    this.sleep = options.sleep || sleepReal;
    this.logger = options.logger || console;
    this.health = new Map(); // nome -> { ok, checkedAt }
  }

  static defaultProviders(env = process.env) {
    return [
      new F5TTSProvider(env),
      new XTTSProvider(env),
      new KokoroProvider(env),
      new NeuralCloudProvider(),
      new BasicFallbackProvider()
    ];
  }

  /** Registrar novos motores no futuro, sem mexer na interface. */
  register(provider) {
    this.providers.push(provider);
  }

  async checkAvailability(provider, force = false) {
    const cached = this.health.get(provider.name);
    const ttl = cached?.ok ? this.healthTtlMs : Math.min(this.healthTtlMs, 15_000);
    if (!force && cached && Date.now() - cached.checkedAt < ttl) return cached.ok;
    let ok = false;
    try {
      ok = Boolean(await provider.isAvailable());
    } catch {
      ok = false;
    }
    this.health.set(provider.name, { ok, checkedAt: Date.now() });
    return ok;
  }

  markUnhealthy(provider) {
    this.health.set(provider.name, { ok: false, checkedAt: Date.now() });
  }

  /** Motores compatíveis e disponíveis, do melhor para o pior. */
  async rankEngines(language, voiceGender, preferredName) {
    const compatible = this.providers.filter((p) => p.supports(language, voiceGender));
    const available = [];
    for (const p of compatible) {
      if (await this.checkAvailability(p)) available.push(p);
    }
    // Se nenhum estiver disponível no cache, tenta novamente forçando checagem fresca
    if (available.length === 0 && compatible.length > 0) {
      for (const p of compatible) {
        if (await this.checkAvailability(p, true)) available.push(p);
      }
    }
    available.sort((a, b) => {
      // Mesma voz no livro todo: o motor já em uso vem primeiro se não for o "último recurso".
      if (preferredName) {
        if (a.name === preferredName && a.honorsGender) return -1;
        if (b.name === preferredName && b.honorsGender) return 1;
      }
      // Quem respeita o gênero escolhido sempre vence quem não respeita.
      if (a.honorsGender !== b.honorsGender) return a.honorsGender ? -1 : 1;
      return b.priority - a.priority;
    });
    return available;
  }

  /**
   * Gera a fala de um trecho com repetição e troca automática de motor.
   * @returns {Promise<{ audio: Buffer, engine: string, genderHonored: boolean, attempts: number, switched: boolean }>}
   */
  async synthesize(text, language, voiceGender, context = {}) {
    const allRanked = await this.rankEngines(language, voiceGender, context.preferredEngine);
    if (allRanked.length === 0) {
      throw new Error('Nenhum motor de voz disponível no momento');
    }
    // Mantém a mesma voz no livro todo: motores que não respeitam o gênero escolhido
    // só entram como último recurso (ou se forem os únicos disponíveis).
    const faithful = allRanked.filter((p) => p.honorsGender);
    const ranked = context.allowDegraded || faithful.length === 0 ? allRanked : faithful;

    const errors = [];
    let attempts = 0;
    for (let i = 0; i < ranked.length; i++) {
      const provider = ranked[i];
      for (let attempt = 1; attempt <= this.attemptsPerEngine; attempt++) {
        attempts += 1;
        try {
          const audio = await provider.generateSpeech(text, language, voiceGender);
          if (!audio || audio.length < 50) throw new Error('Áudio inválido recebido do motor');
          return {
            audio,
            engine: provider.name,
            genderHonored: provider.honorsGender,
            attempts,
            switched: i > 0
          };
        } catch (err) {
          errors.push({ engine: provider.name, attempt, message: String(err?.message || err).slice(0, 240) });
          this.logger.warn?.(`[Audiobook][${provider.name}] tentativa ${attempt} falhou: ${err?.message || err}`);
          if (attempt < this.attemptsPerEngine) await this.sleep(500 * attempt);
        }
      }
      this.markUnhealthy(provider); // evita insistir num motor que acabou de cair
    }

    const failure = new Error('Todos os motores de voz falharam para este trecho');
    failure.details = errors;
    throw failure;
  }
}
