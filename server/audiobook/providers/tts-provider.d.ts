export class TTSProvider {
  constructor(options?: any);
  name: string;
  priority: number;
  maxChars: number;
  consistentVoice: boolean;
  honorsGender: boolean;
  isAvailable(): Promise<boolean>;
  supports(language: string, voiceGender?: string): boolean;
  synthesizeSegment(
    text: string,
    language: string,
    voiceGender: string,
    options?: { voiceId?: string }
  ): Promise<Buffer>;
  generateSpeech(
    text: string,
    language: string,
    voiceGender: string,
    options?: { voiceId?: string }
  ): Promise<Buffer>;
}
