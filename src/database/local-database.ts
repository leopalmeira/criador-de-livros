import { 
  Book, 
  Observation, 
  WatchlistItem, 
  NicheSnapshot, 
  AppSettings, 
  SalesModelConfig, 
  DebugLogEntry, 
  Marketplace,
  BookFormat 
} from '../types';
import { 
  BookProject,
  ProjectSummary 
} from '../types/book-project';
import { DEFAULT_SETTINGS, DEFAULT_SALES_MODELS } from './defaults';
import { MigrationService } from '../services/migration-service';

const DB_NAME = 'BookIntelDB';
const DB_VERSION = 2; // Incrementado para suportar bookProjects

class LocalDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const indexedDB = self.indexedDB || (window as any).indexedDB;
      if (!indexedDB) {
        reject(new Error('IndexedDB não suportado neste contexto.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Tabela de Livros
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'asin' });
          bookStore.createIndex('marketplace', 'marketplace', { unique: false });
          bookStore.createIndex('lastSeenAt', 'lastSeenAt', { unique: false });
          bookStore.createIndex('title', 'title', { unique: false });
          bookStore.createIndex('author', 'author', { unique: false });
        }

        // Tabela de Observações de BSR e Métricas
        if (!db.objectStoreNames.contains('observations')) {
          const obsStore = db.createObjectStore('observations', { keyPath: 'id', autoIncrement: true });
          obsStore.createIndex('asin', 'asin', { unique: false });
          obsStore.createIndex('timestamp', 'timestamp', { unique: false });
          obsStore.createIndex('asin_timestamp', ['asin', 'timestamp'], { unique: false });
        }

        // Watchlist / Livros Salvos
        if (!db.objectStoreNames.contains('watchlist')) {
          const wlStore = db.createObjectStore('watchlist', { keyPath: 'asin' });
          wlStore.createIndex('addedAt', 'addedAt', { unique: false });
        }

        // Snapshots de Nicho / Pesquisas
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapStore.createIndex('keyword', 'keyword', { unique: false });
          snapStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Modelos de Vendas Customizados
        if (!db.objectStoreNames.contains('salesModels')) {
          const modelStore = db.createObjectStore('salesModels', { keyPath: 'id' });
          modelStore.createIndex('marketplace', 'marketplace', { unique: false });
        }

        // Logs de Diagnóstico
        if (!db.objectStoreNames.contains('logs')) {
          const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
          logStore.createIndex('level', 'level', { unique: false });
        }

        // Projetos de Livros (Book Creator) - NOVO
        if (!db.objectStoreNames.contains('bookProjects')) {
          const projStore = db.createObjectStore('bookProjects', { keyPath: 'id' });
          projStore.createIndex('status', 'status', { unique: false });
          projStore.createIndex('createdAt', 'createdAt', { unique: false });
          projStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          projStore.createIndex('priority', 'priority', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- LIVROS ---
  async saveBook(book: Book): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      const req = store.put(book);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getBook(asin: string): Promise<Book | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const req = store.get(asin);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllBooks(): Promise<Book[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- OBSERVAÇÕES DE BSR ---
  async recordObservation(observation: Observation): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('observations', 'readwrite');
      const store = tx.objectStore('observations');
      const req = store.add(observation);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  async getObservationsForBook(asin: string, limit: number = 100): Promise<Observation[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('observations', 'readonly');
      const store = tx.objectStore('observations');
      const index = store.index('asin');
      const req = index.getAll(IDBKeyRange.only(asin));

      req.onsuccess = () => {
        const results: Observation[] = req.result || [];
        results.sort((a, b) => a.timestamp - b.timestamp);
        if (limit && results.length > limit) {
          resolve(results.slice(results.length - limit));
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllObservations(): Promise<Observation[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('observations', 'readonly');
      const store = tx.objectStore('observations');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- WATCHLIST ---
  async addToWatchlist(item: WatchlistItem): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('watchlist', 'readwrite');
      const store = tx.objectStore('watchlist');
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async removeFromWatchlist(asin: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('watchlist', 'readwrite');
      const store = tx.objectStore('watchlist');
      const req = store.delete(asin);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getWatchlist(): Promise<WatchlistItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('watchlist', 'readonly');
      const store = tx.objectStore('watchlist');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async isWatchlisted(asin: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('watchlist', 'readonly');
      const store = tx.objectStore('watchlist');
      const req = store.get(asin);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // --- SNAPSHOTS DE NICHO ---
  async saveNicheSnapshot(snapshot: NicheSnapshot): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite');
      const store = tx.objectStore('snapshots');
      const req = store.put(snapshot);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getNicheSnapshots(keyword?: string): Promise<NicheSnapshot[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readonly');
      const store = tx.objectStore('snapshots');
      let req: IDBRequest;
      if (keyword) {
        const index = store.index('keyword');
        req = index.getAll(IDBKeyRange.only(keyword));
      } else {
        req = store.getAll();
      }
      req.onsuccess = () => {
        const list: NicheSnapshot[] = req.result || [];
        list.sort((a, b) => b.timestamp - a.timestamp);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteSnapshot(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite');
      const store = tx.objectStore('snapshots');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- CONFIGURAÇÕES ---
  async getSettings(): Promise<AppSettings> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get(['bookintel_settings'], (result) => {
          if (result && result.bookintel_settings) {
            const merged = { ...DEFAULT_SETTINGS, ...result.bookintel_settings };
            if (merged.aiSettings) {
              if (merged.aiSettings.provider === 'ollama' && (merged.aiSettings.model === 'gpt-4o-mini' || merged.aiSettings.model === 'gpt-4o')) {
                merged.aiSettings.model = 'llama3.1';
              }
            }
            resolve(merged);
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        });
      });
    } else {
      const local = localStorage.getItem('bookintel_settings');
      if (local) {
        try {
          const merged = { ...DEFAULT_SETTINGS, ...JSON.parse(local) };
          if (merged.aiSettings) {
            if (merged.aiSettings.provider === 'ollama' && (merged.aiSettings.model === 'gpt-4o-mini' || merged.aiSettings.model === 'gpt-4o')) {
              merged.aiSettings.model = 'llama3.1';
            }
          }
          return merged;
        } catch {
          return DEFAULT_SETTINGS;
        }
      }
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ bookintel_settings: updated }, () => resolve());
      });
    } else {
      localStorage.setItem('bookintel_settings', JSON.stringify(updated));
    }
    return updated;
  }

  // --- MODELOS DE ESTIMATIVA DE VENDAS ---
  async getSalesModels(): Promise<SalesModelConfig[]> {
    const db = await this.getDB();
    const models: SalesModelConfig[] = await new Promise((resolve, reject) => {
      const tx = db.transaction('salesModels', 'readonly');
      const store = tx.objectStore('salesModels');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (models.length === 0) {
      for (const defModel of DEFAULT_SALES_MODELS) {
        await this.saveSalesModel(defModel);
      }
      return DEFAULT_SALES_MODELS;
    }

    return models;
  }

  async getSalesModelFor(marketplace: Marketplace, format?: BookFormat): Promise<SalesModelConfig> {
    const models = await this.getSalesModels();
    let match = models.find(m => m.marketplace === marketplace && (m.format === format || m.format === 'Todos'));
    if (!match) {
      match = models.find(m => m.marketplace === marketplace);
    }
    if (!match) {
      match = models[0] || DEFAULT_SALES_MODELS[0];
    }
    return match;
  }

  async saveSalesModel(model: SalesModelConfig): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('salesModels', 'readwrite');
      const store = tx.objectStore('salesModels');
      const req = store.put(model);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async resetSalesModels(): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('salesModels', 'readwrite');
      const store = tx.objectStore('salesModels');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    for (const m of DEFAULT_SALES_MODELS) {
      await this.saveSalesModel(m);
    }
  }

  // --- PROJETOS DE LIVROS (BOOK CREATOR) ---
  async saveBookProject(project: BookProject): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('bookProjects', 'readwrite');
      const store = tx.objectStore('bookProjects');
      project.updatedAt = Date.now();
      const req = store.put(project);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getBookProject(id: string): Promise<BookProject | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('bookProjects', 'readonly');
      const store = tx.objectStore('bookProjects');
      const req = store.get(id);
      req.onsuccess = () => {
        const project = req.result || null;
        if (project && MigrationService.needsMigration(project)) {
          resolve(MigrationService.migrateProject(project));
        } else {
          resolve(project);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllBookProjects(): Promise<BookProject[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('bookProjects', 'readonly');
      const store = tx.objectStore('bookProjects');
      const req = store.getAll();
      req.onsuccess = () => {
        const list: BookProject[] = (req.result || []).map(p => 
          MigrationService.needsMigration(p) ? MigrationService.migrateProject(p) : p
        );
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteBookProject(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('bookProjects', 'readwrite');
      const store = tx.objectStore('bookProjects');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getProjectSummaries(): Promise<ProjectSummary[]> {
    const projects = await this.getAllBookProjects();
    return projects.map(p => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle,
      author: p.author,
      status: p.status,
      kdpBookType: p.kdpBookType,
      chaptersCount: p.kdpChapters?.length || p.outline?.length || 0,
      wordsTotal: p.kdpChapters?.reduce((sum, ch) => sum + (ch.wordCount || 0), 0) || 0,
      pagesEstimated: p.actualPages || p.estimatedPages || 0,
      updatedAt: p.updatedAt,
      qualityScore: p.kdpQualityReport?.overallScore,
      isReadyForKdp: p.kdpQualityReport?.isReadyForKdp
    }));
  }

  // --- LOGS DE DIAGNÓSTICO ---
  async addDebugLog(entry: Omit<DebugLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const db = await this.getDB();
      const fullEntry: DebugLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        ...entry
      };
      const tx = db.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      store.add(fullEntry);
    } catch {
      // Silencioso em caso de falha de log
    }
  }

  async getDebugLogs(limit: number = 150): Promise<DebugLogEntry[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('logs', 'readonly');
      const store = tx.objectStore('logs');
      const req = store.getAll();
      req.onsuccess = () => {
        const logs: DebugLogEntry[] = req.result || [];
        logs.sort((a, b) => b.timestamp - a.timestamp);
        resolve(logs.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async clearDebugLogs(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- BACKUP E RESTORE ---
  async exportAllData(): Promise<any> {
    const [books, observations, watchlist, snapshots, salesModels, settings, bookProjects] = await Promise.all([
      this.getAllBooks(),
      this.getAllObservations(),
      this.getWatchlist(),
      this.getNicheSnapshots(),
      this.getSalesModels(),
      this.getSettings(),
      this.getAllBookProjects()
    ]);

    return {
      appName: 'BookIntel Chrome Extension',
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      data: {
        books,
        observations,
        watchlist,
        snapshots,
        salesModels,
        settings,
        bookProjects
      }
    };
  }

  async importBackupData(backup: any): Promise<boolean> {
    if (!backup || !backup.data) return false;
    const { books, observations, watchlist, snapshots, salesModels, settings, bookProjects } = backup.data;

    const db = await this.getDB();

    if (books && Array.isArray(books)) {
      const tx = db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      for (const b of books) store.put(b);
    }

    if (observations && Array.isArray(observations)) {
      const tx = db.transaction('observations', 'readwrite');
      const store = tx.objectStore('observations');
      for (const o of observations) store.put(o);
    }

    if (watchlist && Array.isArray(watchlist)) {
      const tx = db.transaction('watchlist', 'readwrite');
      const store = tx.objectStore('watchlist');
      for (const w of watchlist) store.put(w);
    }

    if (snapshots && Array.isArray(snapshots)) {
      const tx = db.transaction('snapshots', 'readwrite');
      const store = tx.objectStore('snapshots');
      for (const s of snapshots) store.put(s);
    }

    if (salesModels && Array.isArray(salesModels)) {
      const tx = db.transaction('salesModels', 'readwrite');
      const store = tx.objectStore('salesModels');
      for (const m of salesModels) store.put(m);
    }

    if (bookProjects && Array.isArray(bookProjects)) {
      const tx = db.transaction('bookProjects', 'readwrite');
      const store = tx.objectStore('bookProjects');
      for (const p of bookProjects) {
        const migrated = MigrationService.needsMigration(p) ? MigrationService.migrateProject(p) : p;
        store.put(migrated);
      }
    }

    if (settings) {
      await this.saveSettings(settings);
    }

    return true;
  }
}

export const db = new LocalDatabase();
