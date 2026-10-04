// ================================================================
// TTSProvider — ABSTRAÇÃO DOS MOTORES DE VOZ
// Para adicionar um novo motor: estenda TTSProvider, implemente
// synthesizeSegment() e registre no TTSEngineManager. Nenhuma mudança
// na interface do AudiobookStudio é necessária.
// ================================================================

import { concatMp3Buffers } from '../mp3.js';
import { splitIntoChunks } from '../text-prep.js';

export class TTSProvider {
  /** Identificador interno (nunca exibido ao usuário). */
  name = 'abstract';
  /** Prioridade/qualidade: maior = preferido pelo gerenciador. */
  priority = 0;
  /** Tamanho máximo (caracteres) por requisição ao motor. */
  maxChars = 1000;
  /** Mantém a mesma voz durante todo o livro? */
  consistentVoice = true;
  /** O motor respeita o gênero escolhido? */
  honorsGender = true;

  constructor(options = {}) {
    if (options.name) this.name = options.name;
    if (options.priority !== undefined) this.priority = options.priority;
    if (options.maxChars !== undefined) this.maxChars = options.maxChars;
    if (options.honorsGender !== undefined) this.honorsGender = options.honorsGender;
    if (options.consistentVoice !== undefined) this.consistentVoice = options.consistentVoice;
  }

  /** O motor está configurado e respondendo? (resultado cacheado pelo gerenciador) */
  // eslint-disable-next-line no-unused-vars
  async isAvailable() {
    return false;
  }

  /** O motor suporta este idioma + gênero? */
  // eslint-disable-next-line no-unused-vars
  supports(language, voiceGender) {
    return false;
  }

  /** Sintetiza UM segmento (<= maxChars) e devolve um Buffer MP3. */
  // eslint-disable-next-line no-unused-vars
  async synthesizeSegment(text, language, voiceGender) {
    throw new Error('synthesizeSegment não implementado');
  }

  /**
   * API pública do contrato: gera a fala para um texto de QUALQUER tamanho.
   * Divide internamente nos limites do motor (sempre em frases) e junta o MP3.
   * @returns {Promise<Buffer>} MP3
   */
  async generateSpeech(text, language, voiceGender) {
    const parts = splitIntoChunks(text, this.maxChars);
    if (parts.length === 0) throw new Error('Texto vazio para narração');
    const audio = [];
    for (const part of parts) {
      audio.push(await this.synthesizeSegment(part, language, voiceGender));
    }
    return audio.length === 1 ? audio[0] : concatMp3Buffers(audio);
  }
}

/** fetch com timeout e mensagem de erro limpa. */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export const withTimeout = (promise, ms, label = 'operação') =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Tempo esgotado: ${label}`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
