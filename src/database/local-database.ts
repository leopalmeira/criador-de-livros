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
  ProjectSummary,
  BookAudiobookAsset
} from '../types/book-project';
import { CategoryMarketMetrics } from '../types/category-intelligence';
import type { EditorialJob, FinalBookRecord } from '../types/editorial-correction';
import { DEFAULT_SETTINGS, DEFAULT_SALES_MODELS } from './defaults';

const DB_NAME = 'BookIntelDB';
const DB_VERSION = 4; // v4: editorialJobs + finalBooks (correção editorial e PDFs finais)

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

class LocalDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private inMemoryCategoryMetrics: CategoryMarketMetrics[] = [];
  private activeUserId: string | null = null;

  setAuthenticatedUser(userId: string | null): void {
    this.activeUserId = userId;
  }

  private async cloudRequest<T>(path: string, method = 'GET', payload?: unknown): Promise<T> {
    const response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      throw new Error(result.error || `Falha ao sincronizar os dados da conta (${response.status}).`);
    }
    return result as T;
  }

  private async saveOwnedRecord<T extends object>(
    storeName: string,
    record: T,
    ownerId = this.activeUserId
  ): Promise<void> {
    const db = await this.getDB();
    const scopedRecord = { ...record, ownerId };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(scopedRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  private async getOwnedRecord<T extends { ownerId?: string }>(
    storeName: string,
    id: string,
    ownerId = this.activeUserId
  ): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(id);
      req.onsuccess = () => {
        const record = req.result as T | undefined;
        const ownedByCurrentUser = ownerId
          ? record?.ownerId === ownerId
          : !record?.ownerId;
        resolve(record && ownedByCurrentUser ? record : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  private async replaceOwnedRecords<T extends { ownerId?: string }>(
    storeName: string,
    records: T[],
    getId: (record: T) => IDBValidKey,
    ownerId = this.activeUserId
  ): Promise<void> {
    if (!ownerId) throw new Error('É necessário autenticar uma conta para sincronizar os dados.');
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const getAll = store.getAll();
      getAll.onsuccess = () => {
        for (const record of getAll.result as Array<T & { ownerId?: string }>) {
          if (record.ownerId === ownerId) store.delete(getId(record));
        }
        for (const record of records) store.put({ ...record, ownerId });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  private async deleteOwnedRecord(storeName: string, id: string, ownerId = this.activeUserId): Promise<void> {
    const record = await this.getOwnedRecord<{ ownerId?: string }>(storeName, id, ownerId);
    if (!record) return;
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  private async getAllOwnedRecords<T extends { ownerId?: string }>(
    storeName: string,
    ownerId = this.activeUserId
  ): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      req.onsuccess = () => {
        const records = (req.result as T[]).filter(record => ownerId
          ? record.ownerId === ownerId
          : !record.ownerId);
        resolve(records);
      };
      req.onerror = () => reject(req.error);
    });
  }

  private async saveCloudRecord(collection: string, recordId: string, record: object): Promise<void> {
    await this.cloudRequest(`/api/user-data/${collection}/${encodeURIComponent(recordId)}`, 'PUT', { record });
  }

  private async getCloudRecord<T>(collection: string, recordId: string): Promise<T | null> {
    const response = await this.cloudRequest<{ record: T | null }>(
      `/api/user-data/${collection}/${encodeURIComponent(recordId)}`
    );
    return response.record;
  }

  private async getAllCloudRecords<T>(collection: string): Promise<T[]> {
    const response = await this.cloudRequest<{ records: T[] }>(`/api/user-data/${collection}`);
    return response.records;
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const indexedDB = 
        (typeof self !== 'undefined' ? self.indexedDB : undefined) ||
        (typeof window !== 'undefined' ? (window as any).indexedDB : undefined) ||
        (typeof globalThis !== 'undefined' ? (globalThis as any).indexedDB : undefined);

      if (!indexedDB) {
        reject(new Error('IndexedDB não suportado neste contexto.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
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

        // Projetos de Livros (Book Creator)
        if (!db.objectStoreNames.contains('bookProjects')) {
          const projStore = db.createObjectStore('bookProjects', { keyPath: 'id' });
          projStore.createIndex('status', 'status', { unique: false });
          projStore.createIndex('createdAt', 'createdAt', { unique: false });
          projStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          projStore.createIndex('priority', 'priority', { unique: false });
        }

        // Histórico de Métricas de Mercado por Categoria (Item 16)
        if (!db.objectStoreNames.contains('categoryMarketMetrics')) {
          const metricsStore = db.createObjectStore('categoryMarketMetrics', { keyPath: 'id' });
          metricsStore.createIndex('marketplace', 'marketplace', { unique: false });
          metricsStore.createIndex('category', 'category', { unique: false });
          metricsStore.createIndex('subcategory', 'subcategory', { unique: false });
          metricsStore.createIndex('collected_at', 'collected_at', { unique: false });
        }

        // Jobs de correção editorial capítulo a capítulo (retomáveis)
        if (!db.objectStoreNames.contains('editorialJobs')) {
          const jobStore = db.createObjectStore('editorialJobs', { keyPath: 'bookId' });
          jobStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Livros finalizados e validados (PDF persistido como ArrayBuffer)
        if (!db.objectStoreNames.contains('finalBooks')) {
          const finalStore = db.createObjectStore('finalBooks', { keyPath: 'id' });
          finalStore.createIndex('bookId', 'bookId', { unique: false });
          finalStore.createIndex('finalizedAt', 'finalizedAt', { unique: false });
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
    const settingsKey = this.activeUserId ? `bookintel_settings_${this.activeUserId}` : 'bookintel_settings';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([settingsKey], (result) => {
          if (result && result[settingsKey]) {
            const merged = { ...DEFAULT_SETTINGS, ...result[settingsKey] };
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
      const local = localStorage.getItem(settingsKey);
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
    const settingsKey = this.activeUserId ? `bookintel_settings_${this.activeUserId}` : 'bookintel_settings';

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [settingsKey]: updated }, () => resolve());
      });
    } else {
      localStorage.setItem(settingsKey, JSON.stringify(updated));
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
    const ownerId = this.activeUserId;
    project.updatedAt = Date.now();
    if (ownerId) {
      await this.cloudRequest(`/api/projects/${encodeURIComponent(project.id)}`, 'PUT', { project });
    }
    await this.saveOwnedRecord('bookProjects', project, ownerId);
  }

  async getBookProject(id: string): Promise<BookProject | null> {
    const ownerId = this.activeUserId;
    if (ownerId) {
      const response = await this.cloudRequest<{ project: BookProject | null }>(
        `/api/projects/${encodeURIComponent(id)}`
      );
      if (ownerId !== this.activeUserId) throw new Error('A conta foi alterada durante o carregamento do projeto.');
      if (response.project) await this.saveOwnedRecord('bookProjects', response.project, ownerId);
      return response.project;
    }
    return this.getOwnedRecord<BookProject & { ownerId?: string }>('bookProjects', id);
  }

  async getAllBookProjects(): Promise<BookProject[]> {
    const ownerId = this.activeUserId;
    if (ownerId) {
      const response = await this.cloudRequest<{ projects: BookProject[] }>('/api/projects');
      if (ownerId !== this.activeUserId) throw new Error('A conta foi alterada durante a sincronização dos projetos.');
      await this.replaceOwnedRecords(
        'bookProjects',
        response.projects,
        project => project.id,
        ownerId
      );
      return response.projects.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    const list = await this.getAllOwnedRecords<BookProject & { ownerId?: string }>('bookProjects');
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteBookProject(id: string): Promise<void> {
    const ownerId = this.activeUserId;
    if (ownerId) {
      await this.cloudRequest(`/api/projects/${encodeURIComponent(id)}`, 'DELETE');
    }
    await this.deleteOwnedRecord('bookProjects', id, ownerId);
  }

  // --- AUDIOBOOK ATIVOS E METADADOS DO LIVRO ---
  async saveAudiobookToProject(projectId: string, audiobookData: Partial<BookAudiobookAsset>): Promise<void> {
    try {
      let project = await this.getBookProject(projectId);
      if (!project) {
        const allProjects = await this.getAllBookProjects();
        project = allProjects.find(p => p.id === projectId || (audiobookData.title && p.title.trim().toLowerCase() === audiobookData.title.trim().toLowerCase())) || null;
      }

      const mergedAudiobook: BookAudiobookAsset = {
        id: project?.audiobook?.id || `ab_${projectId}`,
        projectId,
        status: audiobookData.status || project?.audiobook?.status || 'completed',
        title: audiobookData.title || project?.title || 'Audiobook',
        author: audiobookData.author || project?.author || 'Autor',
        narratorVoice: audiobookData.narratorVoice || project?.audiobook?.narratorVoice,
        language: audiobookData.language || project?.audiobook?.language || 'pt-BR',
        voiceGender: audiobookData.voiceGender || project?.audiobook?.voiceGender || 'male',
        durationSeconds: audiobookData.durationSeconds ?? project?.audiobook?.durationSeconds ?? 0,
        totalChapters: audiobookData.totalChapters ?? project?.audiobook?.totalChapters ?? (project?.kdpChapters?.length || 0),
        audioUrl: audiobookData.audioUrl || project?.audiobook?.audioUrl,
        finalFile: audiobookData.finalFile || project?.audiobook?.finalFile,
        mixedMasterUrl: audiobookData.mixedMasterUrl || project?.audiobook?.mixedMasterUrl,
        timelineEvents: audiobookData.timelineEvents || project?.audiobook?.timelineEvents,
        soundDesignSummary: audiobookData.soundDesignSummary || project?.audiobook?.soundDesignSummary,
        chapterMixedAudio: audiobookData.chapterMixedAudio || project?.audiobook?.chapterMixedAudio,
        generatedAt: project?.audiobook?.generatedAt || Date.now(),
        updatedAt: Date.now()
      };

      if (project) {
        project.audiobook = mergedAudiobook;
        await this.saveBookProject(project);
      }

      // Sincroniza também com o registro final do livro (FinalBookRecord) se já catalogado
      const allFinals = await this.getAllFinalBooks();
      const finalBook = allFinals.find(f => 
        f.bookId === projectId || 
        f.id === `final_proj_${projectId}` || 
        (audiobookData.title && f.title.trim().toLowerCase() === audiobookData.title.trim().toLowerCase())
      );
      if (finalBook) {
        finalBook.audiobook = mergedAudiobook;
        await this.saveFinalBook(finalBook);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kdp-final-books-updated'));
        window.dispatchEvent(new CustomEvent('kdp-audiobook-updated', { detail: { projectId, audiobook: mergedAudiobook } }));
      }
    } catch (err) {
      console.error('[LocalDatabase] Erro ao salvar audiobook no projeto:', err);
    }
  }

  async getAudiobookForProject(projectId: string): Promise<BookAudiobookAsset | null> {
    try {
      const project = await this.getBookProject(projectId);
      if (project?.audiobook) return project.audiobook;

      const allFinals = await this.getAllFinalBooks();
      const finalBook = allFinals.find(f => f.bookId === projectId || f.id === `final_proj_${projectId}`);
      if (finalBook?.audiobook) return finalBook.audiobook;

      return null;
    } catch (error) {
      console.error('[LocalDatabase] Erro ao carregar audiobook do projeto:', error);
      return null;
    }
  }

  // --- CORREÇÃO EDITORIAL: JOBS ---
  async saveEditorialJob(job: EditorialJob): Promise<void> {
    const ownerId = this.activeUserId;
    if (ownerId) await this.saveCloudRecord('editorial-jobs', job.bookId, job);
    await this.saveOwnedRecord('editorialJobs', job, ownerId);
  }

  async getEditorialJob(bookId: string): Promise<EditorialJob | null> {
    const ownerId = this.activeUserId;
    if (ownerId) {
      const job = await this.getCloudRecord<EditorialJob>('editorial-jobs', bookId);
      if (ownerId !== this.activeUserId) throw new Error('A conta foi alterada durante o carregamento da revisão editorial.');
      if (job) await this.saveOwnedRecord('editorialJobs', job, ownerId);
      return job;
    }
    return this.getOwnedRecord<EditorialJob & { ownerId?: string }>('editorialJobs', bookId);
  }

  async deleteEditorialJob(bookId: string): Promise<void> {
    const ownerId = this.activeUserId;
    if (ownerId) {
      await this.cloudRequest(`/api/user-data/editorial-jobs/${encodeURIComponent(bookId)}`, 'DELETE');
    }
    await this.deleteOwnedRecord('editorialJobs', bookId, ownerId);
  }

  // --- LIVROS FINAIS (PDF VALIDADO) ---
  async saveFinalBook(rec: FinalBookRecord): Promise<void> {
    const ownerId = this.activeUserId;
    if (ownerId) {
      const cloudRecord = { ...rec, pdf: undefined, pdfBase64: arrayBufferToBase64(rec.pdf) };
      await this.saveCloudRecord('final-books', rec.id, cloudRecord);
    }
    await this.saveOwnedRecord('finalBooks', rec, ownerId);
  }

  async getFinalBook(id: string): Promise<FinalBookRecord | null> {
    const ownerId = this.activeUserId;
    if (ownerId) {
      const cloudRecord = await this.getCloudRecord<FinalBookRecord & { pdfBase64?: string }>('final-books', id);
      if (ownerId !== this.activeUserId) throw new Error('A conta foi alterada durante o carregamento do livro final.');
      if (!cloudRecord) return null;
      const record = { ...cloudRecord, pdf: base64ToArrayBuffer(cloudRecord.pdfBase64 || '') };
      delete (record as FinalBookRecord & { pdfBase64?: string }).pdfBase64;
      await this.saveOwnedRecord('finalBooks', record, ownerId);
      return record;
    }
    return this.getOwnedRecord<FinalBookRecord & { ownerId?: string }>('finalBooks', id);
  }

  async getAllFinalBooks(): Promise<FinalBookRecord[]> {
    const ownerId = this.activeUserId;
    if (ownerId) {
      const cloudRecords = await this.getAllCloudRecords<FinalBookRecord & { pdfBase64?: string }>('final-books');
      if (ownerId !== this.activeUserId) throw new Error('A conta foi alterada durante a sincronização dos livros finais.');
      const localRecords = await this.getAllOwnedRecords<FinalBookRecord & { ownerId?: string }>('finalBooks', ownerId);
      const localById = new Map(localRecords.map(record => [record.id, record]));
      const records = cloudRecords.map(cloudRecord => {
        const record = {
          ...cloudRecord,
          pdf: cloudRecord.pdfBase64
            ? base64ToArrayBuffer(cloudRecord.pdfBase64)
            : localById.get(cloudRecord.id)?.pdf || new ArrayBuffer(0)
        };
        delete (record as FinalBookRecord & { pdfBase64?: string }).pdfBase64;
        return record;
      });
      await this.replaceOwnedRecords('finalBooks', records, record => record.id, ownerId);
      return records.sort((a, b) => b.finalizedAt - a.finalizedAt);
    }
    const list = await this.getAllOwnedRecords<FinalBookRecord & { ownerId?: string }>('finalBooks');
    return list.sort((a, b) => b.finalizedAt - a.finalizedAt);
  }

  async deleteFinalBook(id: string): Promise<void> {
    const ownerId = this.activeUserId;
    if (ownerId) {
      await this.cloudRequest(`/api/user-data/final-books/${encodeURIComponent(id)}`, 'DELETE');
    }
    await this.deleteOwnedRecord('finalBooks', id, ownerId);
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
      for (const project of bookProjects as BookProject[]) {
        await this.saveBookProject(project);
      }
    }

    if (settings) {
      await this.saveSettings(settings);
    }

    return true;
  }

  // --- MÉTRICAS HISTÓRICAS DE CATEGORIA (ITEM 16) ---
  async saveCategoryMetrics(metrics: CategoryMarketMetrics): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('categoryMarketMetrics', 'readwrite');
        const store = tx.objectStore('categoryMarketMetrics');
        const req = store.put(metrics);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback em memória para ambientes sem IndexedDB (Node / SSR / Vitest)
      this.inMemoryCategoryMetrics.push(metrics);
    }
  }

  async getCategoryMetricsHistory(marketplace: Marketplace, category: string, subcategory?: string): Promise<CategoryMarketMetrics[]> {
    const matchCategory = (m: CategoryMarketMetrics) => {
      if (m.marketplace !== marketplace) return false;
      if (subcategory) {
        return (m.category === category && m.subcategory === subcategory) ||
               (m.category === category) ||
               (m.subcategory === subcategory) ||
               (m.category === subcategory);
      }
      return m.category === category || m.subcategory === category;
    };

    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('categoryMarketMetrics', 'readonly');
        const store = tx.objectStore('categoryMarketMetrics');
        const req = store.getAll();
        req.onsuccess = () => {
          const all: CategoryMarketMetrics[] = req.result || [];
          const filtered = all
            .filter(matchCategory)
            .sort((a, b) => b.collected_at - a.collected_at);
          resolve(filtered);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.inMemoryCategoryMetrics
        .filter(matchCategory)
        .sort((a, b) => b.collected_at - a.collected_at);
    }
  }

  async getLatestCategoryMetrics(marketplace: Marketplace, category: string, subcategory?: string): Promise<CategoryMarketMetrics | null> {
    const history = await this.getCategoryMetricsHistory(marketplace, category, subcategory);
    return history.length > 0 ? history[0] : null;
  }
}

export const db = new LocalDatabase();
export const localDatabase = db;
