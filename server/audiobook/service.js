// ================================================================
// AUDIOBOOK STUDIO — SERVIÇO DE GERAÇÃO (100% AUTOMÁTICO)
// manuscrito → unidades de narração → motor TTS (automático) → MP3 por
// capítulo → audiobook_final.mp3, com retomada, repetição e metadata.json.
// ================================================================

import fs from 'node:fs';
import path from 'node:path';
import { AudiobookStorage } from './storage.js';
import { TTSEngineManager } from './engine-manager.js';
import { resolveLanguage, resolveGender, GENDER_LABEL } from './languages.js';
import { buildNarrationUnits, splitIntoChunks } from './text-prep.js';
import { concatMp3Buffers, concatMp3Files, mp3DurationSeconds } from './mp3.js';

export class AudiobookError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const MAX_CHAPTERS = 500;
const MAX_CHAPTER_CHARS = 1_500_000;
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const MESSAGES = {
  generating: 'Gerando seu audiobook. Você pode sair desta tela: ao voltar, continuamos de onde parou.',
  partial: 'Alguns capítulos não puderam ser concluídos agora. Clique em Continuar para retomar de onde parou.',
  interrupted: 'A geração foi interrompida. Clique em Continuar para retomar de onde parou.',
  failed: 'Não foi possível gerar o audiobook agora. Tente novamente em instantes.',
  completed: 'Audiobook concluído.',
  idle: ''
};

export class AudiobookService {
  /**
   * @param {{ baseDir?: string, storage?: AudiobookStorage, engineManager?: TTSEngineManager,
   *           logger?: Console, sleep?: (ms:number)=>Promise<void>, maxChapterAttempts?: number,
   *           chunkMaxChars?: number, maxConcurrentJobs?: number, maxConsecutiveFailures?: number }} [options]
   */
  constructor(options = {}) {
    this.storage =
      options.storage ||
      new AudiobookStorage(options.baseDir || process.env.AUDIOBOOKS_DIR || path.join(process.cwd(), 'audiobooks'));
    this.engines = options.engineManager || new TTSEngineManager();
    this.logger = options.logger || console;
    this.sleep = options.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.maxChapterAttempts = options.maxChapterAttempts ?? 3;
    this.chunkMaxChars = options.chunkMaxChars ?? 2400;
    this.maxConcurrentJobs = options.maxConcurrentJobs ?? 3;
    this.maxConsecutiveFailures = options.maxConsecutiveFailures ?? 3;
    /** @type {Map<string, any>} */
    this.jobs = new Map();
    /** @type {Map<string, Promise<any>>} */
    this.recentJobs = new Map();
  }

  // ---------------------------------------------------------------
  // 1. Manuscrito (conteúdo do projeto atual)
  // ---------------------------------------------------------------
  async saveManuscript(projectId, input) {
    this.storage.assertId(projectId);
    const title = clean(input?.title, 300);
    if (!title) throw new AudiobookError('O livro precisa ter um título.', 400, 'INVALID_MANUSCRIPT');

    const rawChapters = Array.isArray(input?.chapters) ? input.chapters : [];
    if (rawChapters.length > MAX_CHAPTERS) throw new AudiobookError('Livro com capítulos demais.', 400, 'INVALID_MANUSCRIPT');
    const chapters = rawChapters
      .map((c) => ({
        title: clean(c?.title ?? c?.titulo, 300),
        text: String(c?.text ?? c?.texto ?? '').slice(0, MAX_CHAPTER_CHARS),
        speakerSegments: Array.isArray(c?.speakerSegments)
          ? c.speakerSegments.slice(0, 2000).map((segment) => ({
              speakerId: clean(segment?.speakerId, 100),
              text: String(segment?.text ?? '').slice(0, MAX_CHAPTER_CHARS),
              voiceId: clean(segment?.voiceId, 200)
            }))
          : []
      }))
      .filter((c) => c.text.trim().length > 0);
    if (chapters.length === 0) {
      throw new AudiobookError('O livro ainda não possui capítulos escritos para narrar.', 400, 'INVALID_MANUSCRIPT');
    }
    for (const chapter of chapters) {
      if (chapter.speakerSegments.length === 0) continue;
      const textFromSegments = chapter.speakerSegments.map((segment) => segment.text).join('');
      if (textFromSegments.replace(/\s+/g, ' ').trim() !== chapter.text.replace(/\s+/g, ' ').trim()) {
        throw new AudiobookError(
          'As falas do elenco não correspondem exatamente ao texto do capítulo. Reanalise os interlocutores.',
          400,
          'INVALID_CAST_SEGMENTS'
        );
      }
      if (chapter.speakerSegments.some((segment) => !segment.speakerId || !segment.text.trim() || !segment.voiceId)) {
        throw new AudiobookError('Cada fala do elenco precisa ter interlocutor e voz Fish Audio.', 400, 'INVALID_CAST_SEGMENTS');
      }
    }

    const manuscript = {
      projectId,
      title,
      subtitle: clean(input?.subtitle, 400),
      author: clean(input?.author, 200),
      preface: String(input?.preface ?? '').slice(0, MAX_CHAPTER_CHARS),
      narratorVoiceId: clean(input?.narratorVoiceId, 200),
      chapters,
      savedAt: Date.now()
    };
    await this.storage.writeJson(projectId, 'manuscript.json', manuscript);
    return { projectId, totalChapters: chapters.length };
  }

  // ---------------------------------------------------------------
  // 2. Iniciar / retomar geração
  // ---------------------------------------------------------------
  async startGeneration({ projectId, language, voiceGender }) {
    this.storage.assertId(projectId);
    const lang = resolveLanguage(language);
    if (!lang) throw new AudiobookError('Idioma não suportado.', 400, 'INVALID_LANGUAGE');
    const gender = resolveGender(voiceGender);
    if (!gender) throw new AudiobookError('Escolha uma voz masculina ou feminina.', 400, 'INVALID_VOICE');

    const running = this.jobs.get(projectId);
    if (running) {
      if (running.language === lang.id && running.voiceGender === gender) return this.getStatus(projectId);
      throw new AudiobookError('Já existe uma geração em andamento para este livro.', 409, 'JOB_RUNNING');
    }
    if (this.jobs.size >= this.maxConcurrentJobs) {
      throw new AudiobookError('O estúdio está ocupado com outros audiobooks. Tente novamente em alguns minutos.', 429, 'BUSY');
    }

    const manuscript = await this.storage.readJson(projectId, 'manuscript.json');
    if (!manuscript) {
      throw new AudiobookError('Projeto não encontrado. Abra o livro e tente novamente.', 404, 'MANUSCRIPT_NOT_FOUND');
    }

    const units = buildNarrationUnits(manuscript, lang.id);
    const previous = await this.storage.readJson(projectId, 'metadata.json');
    const sameVoice = previous && previous.language === lang.id && previous.voiceGender === gender;
    if (previous && !sameVoice) await this.storage.clearAudio(projectId);

    const meta = await this.reconcile(projectId, previous && sameVoice ? previous : null, manuscript, units, lang, gender);
    const job = { projectId, language: lang.id, voiceGender: gender, meta, live: null, cancelled: false, engine: null, promise: null };
    this.jobs.set(projectId, job);
    await this.persist(meta);
    job.promise = this.run(job)
      .catch((err) => {
        this.logger.error?.(`[Audiobook][${projectId}] erro inesperado:`, err);
        meta.status = 'failed';
        meta.errors.push({ at: Date.now(), unit: null, message: String(err?.message || err).slice(0, 300) });
      })
      .then(() => this.persist(meta))
      .catch(() => {})
      .finally(() => this.jobs.delete(projectId));

    this.recentJobs.set(projectId, job.promise);
    return this.getStatus(projectId);
  }

  /** Reaproveita capítulos já concluídos (mesmo texto, mesma voz) e marca o resto como pendente. */
  async reconcile(projectId, previous, manuscript, units, lang, gender) {
    const now = Date.now();
    const prevById = new Map((previous?.units || []).map((u) => [u.id, u]));
    let reusedAny = false;
    const metaUnits = [];
    for (const unit of units) {
      const prev = prevById.get(unit.id);
      const reusable =
        prev && prev.status === 'done' && prev.hash === unit.hash && (await this.storage.exists(this.storage.chapterPath(projectId, unit.file)));
      if (reusable) reusedAny = true;
      metaUnits.push({
        index: unit.index,
        id: unit.id,
        file: unit.file,
        kind: unit.kind,
        chapterNumber: unit.chapterNumber ?? null,
        label: unit.label,
        title: unit.title,
        hash: unit.hash,
        charCount: unit.text.length,
        status: reusable ? 'done' : 'pending',
        attempts: reusable ? prev.attempts || 0 : 0,
        durationSeconds: reusable ? prev.durationSeconds : 0,
        engine: reusable ? prev.engine : null,
        genderHonored: reusable ? prev.genderHonored !== false : true,
        error: null,
        completedAt: reusable ? prev.completedAt : null
      });
    }
    const allDone = metaUnits.every((u) => u.status === 'done');
    if (!allDone) {
      await fs.promises.rm(this.storage.finalPath(projectId), { force: true }).catch(() => {});
    }

    return {
      projectId,
      title: manuscript.title,
      subtitle: manuscript.subtitle,
      author: manuscript.author,
      language: lang.id,
      languageLabel: lang.label,
      voiceGender: gender,
      engine: previous?.engine || null,
      enginesUsed: previous?.enginesUsed || [],
      genderMatched: previous?.genderMatched !== false,
      status: 'generating',
      createdAt: previous?.createdAt || now,
      startedAt: now,
      updatedAt: now,
      finishedAt: null,
      durationSeconds: 0,
      totalUnits: metaUnits.length,
      bookChapters: manuscript.chapters.length,
      units: metaUnits,
      completedChapters: [],
      pendingChapters: [],
      attempts: previous?.attempts || 0,
      errors: previous?.errors?.slice(-30) || [],
      finalFile: null
    };
  }

  async persist(meta) {
    meta.updatedAt = Date.now();
    meta.completedChapters = meta.units.filter((u) => u.status === 'done').map((u) => u.file);
    meta.pendingChapters = meta.units.filter((u) => u.status !== 'done').map((u) => u.file);
    meta.durationSeconds = Math.round(meta.units.filter((u) => u.status === 'done').reduce((s, u) => s + (u.durationSeconds || 0), 0) * 10) / 10;
    await this.storage.writeJson(meta.projectId, 'metadata.json', meta);
  }

  // ---------------------------------------------------------------
  // 3. Execução do job (capítulo a capítulo)
  // ---------------------------------------------------------------
  async run(job) {
    const { meta, projectId } = job;
    const manuscript = await this.storage.readJson(projectId, 'manuscript.json');
    const units = buildNarrationUnits(manuscript, job.language);
    let consecutiveFailures = 0;

    for (const unit of meta.units) {
      if (job.cancelled) break;
      if (unit.status === 'done') continue;
      const source = units[unit.index];
      unit.status = 'processing';
      unit.error = null;
      let success = false;

      for (let attempt = 1; attempt <= this.maxChapterAttempts && !job.cancelled; attempt++) {
        unit.attempts += 1;
        meta.attempts += 1;
        try {
          const result = await this.synthesizeUnit(
            job,
            unit,
            source.text,
            attempt >= this.maxChapterAttempts,
            source.segments
          );
          await this.storage.writeFileAtomic(this.storage.chapterPath(projectId, unit.file), result.audio);
          unit.status = 'done';
          unit.durationSeconds = result.durationSeconds;
          unit.engine = result.engines[result.engines.length - 1];
          unit.genderHonored = result.genderHonored;
          unit.completedAt = Date.now();
          unit.error = null;
          for (const e of result.engines) if (!meta.enginesUsed.includes(e)) meta.enginesUsed.push(e);
          meta.engine = unit.engine;
          if (!result.genderHonored) meta.genderMatched = false;
          success = true;
          break;
        } catch (err) {
          if (job.cancelled) break;
          const message = String(err?.message || err).slice(0, 300);
          unit.error = message;
          meta.errors.push({ at: Date.now(), unit: unit.file, attempt, message, details: err?.details });
          meta.errors = meta.errors.slice(-30);
          this.logger.warn?.(`[Audiobook][${projectId}] ${unit.file} tentativa ${attempt}/${this.maxChapterAttempts}: ${message}`);
          if (attempt < this.maxChapterAttempts) await this.sleep(1500 * attempt);
        }
      }

      job.live = null;
      if (job.cancelled) break;
      if (!success) {
        unit.status = 'failed';
        consecutiveFailures += 1;
      } else {
        consecutiveFailures = 0;
      }
      await this.persist(meta);
      if (consecutiveFailures >= this.maxConsecutiveFailures) break; // falha sistêmica, não isolada
    }

    if (job.cancelled) return;

    const pending = meta.units.filter((u) => u.status !== 'done');
    for (const u of pending) if (u.status === 'processing') u.status = 'pending';
    if (pending.length === 0) {
      await this.finalize(job);
    } else {
      meta.status = 'partial';
    }
    meta.finishedAt = Date.now();
  }

  async synthesizeUnit(job, unit, text, allowDegraded, segments = null) {
    const speechSegments = Array.isArray(segments) && segments.length > 0
      ? segments
      : [{ text, voiceId: null }];
    const chunks = speechSegments.flatMap((segment) =>
      splitIntoChunks(segment.text, this.chunkMaxChars).map((chunk) => ({
        text: chunk,
        voiceId: segment.voiceId
      }))
    );
    if (chunks.length === 0) throw new Error('Capítulo sem texto para narrar');
    job.live = { unitIndex: unit.index, chunkDone: 0, chunkTotal: chunks.length };
    const buffers = [];
    const engines = [];
    let genderHonored = true;
    for (const chunk of chunks) {
      if (job.cancelled) throw new Error('Geração cancelada');
      const r = await this.engines.synthesize(chunk.text, job.language, job.voiceGender, {
        preferredEngine: job.engine,
        allowDegraded: chunk.voiceId ? false : allowDegraded,
        voiceId: chunk.voiceId || undefined
      });
      if (r.genderHonored) job.engine = r.engine;
      else genderHonored = false;
      if (!engines.includes(r.engine)) engines.push(r.engine);
      buffers.push(r.audio);
      job.live.chunkDone += 1;
    }
    const audio = concatMp3Buffers(buffers);
    const durationSeconds = mp3DurationSeconds(audio);
    if (durationSeconds <= 0) throw new Error('Áudio gerado sem duração válida');
    return { audio, durationSeconds, engines, genderHonored };
  }

  async finalize(job) {
    const { meta, projectId } = job;
    const files = meta.units.map((u) => this.storage.chapterPath(projectId, u.file));
    for (const f of files) {
      if (!(await this.storage.exists(f))) throw new Error('Arquivo de capítulo ausente na montagem final');
    }
    await concatMp3Files(files, this.storage.finalPath(projectId));
    meta.finalFile = 'audiobook_final.mp3';
    meta.status = 'completed';
  }

  // ---------------------------------------------------------------
  // 4. Status público (sem nenhum detalhe técnico)
  // ---------------------------------------------------------------
  async getStatus(projectId) {
    this.storage.assertId(projectId);
    const job = this.jobs.get(projectId);
    const hasManuscript = Boolean(await this.storage.readJson(projectId, 'manuscript.json'));
    const meta = job ? job.meta : await this.storage.readJson(projectId, 'metadata.json');
    if (!meta) return { projectId, status: 'idle', hasManuscript, message: MESSAGES.idle };

    let status = meta.status;
    if (status === 'generating' && !job) status = 'interrupted';

    const units = meta.units || [];
    const totalChars = units.reduce((s, u) => s + (u.charCount || 0), 0) || 1;
    let doneChars = units.filter((u) => u.status === 'done').reduce((s, u) => s + (u.charCount || 0), 0);
    let current = null;
    const processing = units.find((u) => u.status === 'processing');
    if (job && processing) {
      const live = job.live && job.live.unitIndex === processing.index ? job.live : null;
      const fraction = live ? live.chunkDone / Math.max(1, live.chunkTotal) : 0;
      doneChars += (processing.charCount || 0) * fraction;
      current = { index: processing.index, label: processing.label, title: processing.title || '', chunkDone: live?.chunkDone || 0, chunkTotal: live?.chunkTotal || 0 };
    }
    const progressPercent = status === 'completed' ? 100 : Math.min(99, Math.floor((doneChars / totalChars) * 100));

    let cursor = 0;
    const chapters = units.map((u) => {
      const start = cursor;
      if (u.status === 'done') cursor += u.durationSeconds || 0;
      return {
        index: u.index,
        kind: u.kind,
        label: u.label,
        title: u.title || '',
        file: u.file,
        status: u.status,
        durationSeconds: u.status === 'done' ? Math.round((u.durationSeconds || 0) * 10) / 10 : 0,
        startSeconds: Math.round(start * 10) / 10
      };
    });

    const failedUnit = units.find((u) => u.status === 'failed');
    const nextPending = units.find((u) => u.status !== 'done');

    return {
      projectId,
      status,
      hasManuscript,
      title: meta.title,
      subtitle: meta.subtitle,
      author: meta.author,
      language: { id: meta.language, label: meta.languageLabel },
      voiceGender: meta.voiceGender,
      voiceLabel: GENDER_LABEL[meta.voiceGender],
      progressPercent,
      totalUnits: units.length,
      completedCount: units.filter((u) => u.status === 'done').length,
      bookChapters: meta.bookChapters ?? units.filter((u) => u.kind === 'chapter').length,
      current,
      resumeFrom: nextPending
        ? { index: nextPending.index, label: failedUnit?.label || nextPending.label, file: nextPending.file }
        : null,
      chapters,
      durationSeconds: Math.round((meta.durationSeconds || 0) * 10) / 10,
      finalReady: status === 'completed' && Boolean(meta.finalFile),
      message: MESSAGES[status] || ''
    };
  }

  // ---------------------------------------------------------------
  // 5. Reiniciar / arquivos / utilitários
  // ---------------------------------------------------------------
  async reset(projectId) {
    this.storage.assertId(projectId);
    const job = this.jobs.get(projectId);
    if (job) {
      job.cancelled = true;
      await job.promise?.catch(() => {});
    }
    await this.storage.clearAudio(projectId);
    return this.getStatus(projectId);
  }

  async waitForJob(projectId) {
    const p = this.jobs.get(projectId)?.promise || this.recentJobs.get(projectId);
    if (p) await p.catch(() => {});
    return this.getStatus(projectId);
  }

  async resolveFile(projectId, which) {
    this.storage.assertId(projectId);
    const meta = await this.storage.readJson(projectId, 'metadata.json');
    if (!meta) return null;
    const base = String(meta.title || 'audiobook').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'audiobook';
    let file;
    let downloadName;
    if (which === 'final') {
      file = this.storage.finalPath(projectId);
      downloadName = `${base}_audiobook.mp3`;
    } else {
      file = this.storage.chapterPath(projectId, which);
      downloadName = which;
    }
    if (!(await this.storage.exists(file))) return null;
    return { path: file, downloadName };
  }

  async listDoneChapterFiles(projectId) {
    const meta = await this.storage.readJson(projectId, 'metadata.json');
    if (!meta) return [];
    const files = [];
    for (const u of meta.units || []) {
      const p = this.storage.chapterPath(projectId, u.file);
      if (u.status === 'done' && (await this.storage.exists(p))) {
        files.push({ file: u.file, absPath: p });
      }
    }
    return files;
  }
}

let defaultService = null;
/** Instância única usada pelo servidor (singleton preguiçoso). */
export function getDefaultAudiobookService() {
  if (!defaultService) defaultService = new AudiobookService();
  return defaultService;
}
