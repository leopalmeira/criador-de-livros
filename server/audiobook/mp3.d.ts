export function audioStartOffset(buf: Buffer): number;
export function stripId3(buf: Buffer): Buffer;
export function mp3DurationSeconds(buf: Buffer): number;
export function concatMp3Buffers(buffers: Buffer[]): Buffer;
export function concatMp3Files(files: string[], outputPath: string): Promise<void>;
export function getFfmpegPath(): string;
export function hasFfmpeg(): Promise<boolean>;
export function convertToMp3(input: Buffer): Promise<Buffer>;
export function isMp3(buf: Buffer): boolean;
