export class TTSEngineManager {
  constructor(options?: any);
  register(provider: any): void;
  synthesize(text: string, language: string, voiceGender: string, context?: any): Promise<any>;
}
