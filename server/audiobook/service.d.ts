export class AudiobookService {
  constructor(options?: any);
  storage: any;
  engines: any;
  saveManuscript(projectId: string, input: any): Promise<any>;
  startGeneration(params: { projectId: string; language: string; voiceGender: string }): Promise<any>;
  waitForJob(projectId: string): Promise<any>;
  getStatus(projectId: string): Promise<any>;
  reset(projectId: string): Promise<any>;
  resolveFile(projectId: string, which: string): Promise<any>;
  listDoneChapterFiles(projectId: string): Promise<any>;
}
export class AudiobookError extends Error {
  status: number;
  code: string;
}
export function getDefaultAudiobookService(): AudiobookService;
