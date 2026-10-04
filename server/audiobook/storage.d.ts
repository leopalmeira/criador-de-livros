export class AudiobookStorage {
  constructor(baseDir?: string);
  baseDir: string;
  assertId(id: string): void;
  chapterPath(projectId: string, file: string): string;
  finalPath(projectId: string): string;
  metadataPath(projectId: string): string;
  manuscriptPath(projectId: string): string;
  exists(p: string): Promise<boolean>;
  readJson(projectId: string, name: string): Promise<any>;
  writeJson(projectId: string, name: string, data: any): Promise<void>;
  writeFileAtomic(p: string, data: Buffer): Promise<void>;
  clearAudio(projectId: string): Promise<void>;
}
