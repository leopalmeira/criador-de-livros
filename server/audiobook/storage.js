// ================================================================
// AUDIOBOOK STUDIO — ARMAZENAMENTO EM DISCO
//   /audiobooks/{projectId}/
//     manuscript.json
//     metadata.json
//     audiobook_final.mp3
//     chapters/01-introducao.mp3, 02-capitulo-01.mp3 ...
// Diretório configurável por AUDIOBOOKS_DIR (ex.: disco persistente no Render).
// ================================================================

import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
const CHAPTER_FILE_RE = /^\d{2}-[a-z0-9-]+\.mp3$/;

export const isValidProjectId = (id) => typeof id === 'string' && PROJECT_ID_RE.test(id);
export const isValidChapterFile = (name) => typeof name === 'string' && CHAPTER_FILE_RE.test(name);

export class AudiobookStorage {
  constructor(baseDir) {
    this.baseDir = path.resolve(baseDir);
  }

  assertId(projectId) {
    if (!isValidProjectId(projectId)) {
      const err = new Error('Identificador de projeto inválido');
      err.status = 400;
      err.code = 'INVALID_PROJECT';
      throw err;
    }
  }

  projectDir(projectId) {
    this.assertId(projectId);
    return path.join(this.baseDir, projectId);
  }

  chaptersDir(projectId) {
    return path.join(this.projectDir(projectId), 'chapters');
  }

  chapterPath(projectId, file) {
    if (!isValidChapterFile(file)) {
      const err = new Error('Arquivo inválido');
      err.status = 400;
      throw err;
    }
    return path.join(this.chaptersDir(projectId), file);
  }

  finalPath(projectId) {
    return path.join(this.projectDir(projectId), 'audiobook_final.mp3');
  }

  async ensure(projectId) {
    await fs.promises.mkdir(this.chaptersDir(projectId), { recursive: true });
  }

  async writeJson(projectId, name, data) {
    await this.ensure(projectId);
    const target = path.join(this.projectDir(projectId), name);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.promises.rename(tmp, target);
  }

  async readJson(projectId, name) {
    try {
      const raw = await fs.promises.readFile(path.join(this.projectDir(projectId), name), 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async writeFileAtomic(target, buffer) {
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, buffer);
    await fs.promises.rename(tmp, target);
  }

  async exists(file) {
    try {
      const st = await fs.promises.stat(file);
      return st.isFile() && st.size > 0;
    } catch {
      return false;
    }
  }

  /** Apaga áudios e metadados, mantendo o manuscrito sincronizado. */
  async clearAudio(projectId) {
    const dir = this.projectDir(projectId);
    await fs.promises.rm(path.join(dir, 'chapters'), { recursive: true, force: true });
    await fs.promises.rm(this.finalPath(projectId), { force: true });
    await fs.promises.rm(path.join(dir, 'metadata.json'), { force: true });
  }
}
