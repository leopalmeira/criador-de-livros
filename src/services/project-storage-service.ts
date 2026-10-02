import fs from 'fs';
import path from 'path';
import { BookProject, ChapterVersion, AuditLogEntry, PdfVersionItem } from '../types/book-project';

export class ProjectStorageService {
  public static get BASE_DIR(): string {
    const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '';
    return typeof path !== 'undefined' && path.join ? path.join(cwd, 'data', 'projects') : 'data/projects';
  }

  private static ensureDir(dirPath: string) {
    if (typeof fs !== 'undefined' && fs.existsSync && !fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  public static getProjectDir(projectId: string): string {
    const safeId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const base = this.BASE_DIR;
    const projectDir = typeof path !== 'undefined' && path.join ? path.join(base, safeId) : `${base}/${safeId}`;
    this.ensureDir(projectDir);
    return projectDir;
  }

  public static async saveProject(project: BookProject): Promise<BookProject> {
    if (!project || !project.id) {
      throw new Error('Projeto inválido para persistência.');
    }
    const projectDir = this.getProjectDir(project.id);
    const filePath = path.join(projectDir, 'project.json');

    const updated = {
      ...project,
      updatedAt: Date.now()
    };

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');

    // Registrar log de persistência
    await this.logAudit(
      project.id,
      'PROJECT_SAVED',
      `Projeto "${project.title || 'Sem título'}" salvo com sucesso.`,
      true,
      project.currentStage
    );

    return updated;
  }

  public static async getProject(projectId: string): Promise<BookProject | null> {
    if (!projectId) return null;
    const projectDir = this.getProjectDir(projectId);
    const filePath = path.join(projectDir, 'project.json');

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content) as BookProject;
    } catch (err) {
      console.error(`[ProjectStorage] Erro ao ler projeto ${projectId}:`, err);
      return null;
    }
  }

  public static async listProjects(): Promise<BookProject[]> {
    this.ensureDir(this.BASE_DIR);
    const entries = fs.readdirSync(this.BASE_DIR, { withFileTypes: true });
    const list: BookProject[] = [];

    for (const ent of entries) {
      if (ent.isDirectory()) {
        const pPath = path.join(this.BASE_DIR, ent.name, 'project.json');
        if (fs.existsSync(pPath)) {
          try {
            const raw = fs.readFileSync(pPath, 'utf8');
            list.push(JSON.parse(raw));
          } catch {}
        }
      }
    }

    // Ordenar pelos mais recentemente modificados
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return list;
  }

  public static async deleteProject(projectId: string): Promise<boolean> {
    if (!projectId) return false;
    const projectDir = this.getProjectDir(projectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
      return true;
    }
    return false;
  }

  // --- VERSIONAMENTO DE CAPÍTULOS ---
  public static async saveChapterVersion(
    projectId: string,
    chapterIndex: number,
    version: ChapterVersion
  ): Promise<void> {
    const projectDir = this.getProjectDir(projectId);
    const chaptersDir = path.join(projectDir, 'chapters', `chapter_${chapterIndex}`);
    this.ensureDir(chaptersDir);

    const versionId = version.id || `ver_${Date.now()}`;
    const filePath = path.join(chaptersDir, `${versionId}.json`);

    fs.writeFileSync(filePath, JSON.stringify(version, null, 2), 'utf8');

    // Salvar também no project.json para consistência
    const project = await this.getProject(projectId);
    if (project && project.kdpChapters && project.kdpChapters[chapterIndex]) {
      const ch = project.kdpChapters[chapterIndex];
      ch.versions = [version, ...(ch.versions || [])];
      await this.saveProject(project);
    }
  }

  public static async getChapterVersions(
    projectId: string,
    chapterIndex: number
  ): Promise<ChapterVersion[]> {
    const projectDir = this.getProjectDir(projectId);
    const chaptersDir = path.join(projectDir, 'chapters', `chapter_${chapterIndex}`);
    if (!fs.existsSync(chaptersDir)) {
      // Fallback para o project.json
      const project = await this.getProject(projectId);
      return project?.kdpChapters?.[chapterIndex]?.versions || [];
    }

    const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.json'));
    const versions: ChapterVersion[] = [];

    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(chaptersDir, f), 'utf8');
        versions.push(JSON.parse(raw));
      } catch {}
    }

    versions.sort((a, b) => b.timestamp - a.timestamp);
    return versions;
  }

  // --- LOG DE AUDITORIA EDITORIAL ---
  public static async logAudit(
    projectId: string,
    action: string,
    details: string,
    userConfirmed: boolean,
    stageId?: string,
    chapterIndex?: number
  ): Promise<void> {
    const projectDir = this.getProjectDir(projectId);
    const auditFile = path.join(projectDir, 'audit.jsonl');

    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      projectId,
      timestamp: Date.now(),
      action,
      stageId,
      chapterIndex,
      details,
      userConfirmed
    };

    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(auditFile, line, 'utf8');
  }

  public static async getAuditLogs(projectId: string): Promise<AuditLogEntry[]> {
    const projectDir = this.getProjectDir(projectId);
    const auditFile = path.join(projectDir, 'audit.jsonl');
    if (!fs.existsSync(auditFile)) return [];

    const lines = fs.readFileSync(auditFile, 'utf8').split('\n').filter(Boolean);
    const entries: AuditLogEntry[] = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch {}
    }
    entries.sort((a, b) => b.timestamp - a.timestamp);
    return entries;
  }
}
