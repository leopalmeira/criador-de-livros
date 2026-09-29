import { db } from '../database/local-database';

class Logger {
  private debugEnabled: boolean = false;
  private memoryLogs: Array<{ timestamp: number; level: string; context: string; message: string; data?: any }> = [];

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const settings = await db.getSettings();
      this.debugEnabled = !!settings.debugMode;
    } catch {
      this.debugEnabled = false;
    }
  }

  setDebugEnabled(enabled: boolean) {
    this.debugEnabled = enabled;
  }

  info(context: string, message: string, data?: any) {
    this.log('info', context, message, data);
  }

  warn(context: string, message: string, data?: any) {
    this.log('warn', context, message, data);
  }

  error(context: string, message: string, data?: any) {
    this.log('error', context, message, data);
    console.error(`[BookIntel:${context}] ${message}`, data || '');
  }

  debug(context: string, message: string, data?: any) {
    if (this.debugEnabled) {
      this.log('debug', context, message, data);
      console.debug(`[BookIntel:${context}] ${message}`, data || '');
    }
  }

  private log(level: 'info' | 'warn' | 'error' | 'debug', context: string, message: string, data?: any) {
    const entry = {
      timestamp: Date.now(),
      level,
      context,
      message,
      data
    };

    this.memoryLogs.unshift(entry);
    if (this.memoryLogs.length > 200) {
      this.memoryLogs.pop();
    }

    if (this.debugEnabled || level === 'error') {
      db.addDebugLog({ level, context, message, data });
    }
  }

  getRecentLogs() {
    return this.memoryLogs;
  }

  exportAsText(): string {
    return this.memoryLogs.map(l => {
      const time = new Date(l.timestamp).toISOString();
      const dataStr = l.data ? ` | Data: ${JSON.stringify(l.data)}` : '';
      return `[${time}] [${l.level.toUpperCase()}] [${l.context}] ${l.message}${dataStr}`;
    }).join('\n');
  }
}

export const logger = new Logger();
