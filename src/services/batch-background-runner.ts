// ============================================================================
// GERENCIADOR DE GERAÇÃO EM LOTE EM SEGUNDO PLANO (BACKGROUND BATCH RUNNER)
// Permite que o lote de livros seja gerado continuamente em segundo plano
// enquanto o usuário navega pela dashboard, exibindo progresso em tempo real.
// ============================================================================

import { 
  BatchBookGeneratorService, 
  BatchGenerationSettings, 
  BatchBookProgress 
} from './batch-book-generator-service';
import { BookProject } from '../types/book-project';

export interface BatchRunnerState {
  isRunning: boolean;
  isPaused: boolean;
  totalBooks: number;
  currentIndex: number;
  currentBookTitle: string;
  currentGenre: string;
  currentStage: string;
  percentage: number;
  completedBooks: BookProject[];
  logs: string[];
  startedAt?: number;
}

const STORAGE_KEY = 'kdp_batch_runner_state';
const EVENT_NAME = 'kdp-batch-runner-updated';

class BatchBackgroundRunnerManager {
  private state: BatchRunnerState = {
    isRunning: false,
    isPaused: false,
    totalBooks: 0,
    currentIndex: 0,
    currentBookTitle: '',
    currentGenre: '',
    currentStage: '',
    percentage: 0,
    completedBooks: [],
    logs: []
  };

  private cancelRequested = false;

  constructor() {
    this.restoreState();
  }

  private restoreState() {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Se o navegador foi recarregado enquanto estava rodando, marca como finalizado
          if (parsed.isRunning) {
            parsed.isRunning = false;
            parsed.logs = [...(parsed.logs || []), 'Sessão anterior finalizada.'];
          }
          this.state = parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao restaurar estado do lote:', e);
    }
  }

  private persistState() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: this.state }));
      }
    } catch {}
  }

  public getState(): BatchRunnerState {
    return { ...this.state };
  }

  public subscribe(listener: (state: BatchRunnerState) => void): () => void {
    const handler = (e: any) => {
      listener(e?.detail || this.state);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(EVENT_NAME, handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(EVENT_NAME, handler);
      }
    };
  }

  public async startBatch(settings: BatchGenerationSettings): Promise<BookProject[]> {
    if (this.state.isRunning) {
      console.warn('Já existe um lote em execução.');
      return this.state.completedBooks;
    }

    this.cancelRequested = false;
    const totalBooks = settings.genres.reduce((acc, g) => acc + g.count, 0);

    this.state = {
      isRunning: true,
      isPaused: false,
      totalBooks,
      currentIndex: 0,
      currentBookTitle: 'Inicializando geração em lote...',
      currentGenre: settings.genres[0]?.genreName || 'Geral',
      currentStage: 'metadados',
      percentage: 2,
      completedBooks: [],
      logs: [
        `Iniciando lote de ${totalBooks} livros KDP em ${settings.genres.length} gênero(s)...`,
        `Configuração: ${settings.chaptersCount} capítulos x ${settings.wordsPerChapter} palavras.`
      ],
      startedAt: Date.now()
    };
    this.persistState();

    try {
      const generated = await BatchBookGeneratorService.executeBatchGeneration(
        settings,
        (progress: BatchBookProgress) => {
          if (this.cancelRequested) {
            throw new Error('Lote cancelado pelo usuário.');
          }

          this.state.currentIndex = progress.currentIndex;
          this.state.totalBooks = progress.totalBooks;
          this.state.currentGenre = progress.currentGenre;
          this.state.currentBookTitle = progress.currentBookTitle;
          this.state.currentStage = progress.currentStage;
          this.state.percentage = progress.percentage;
          this.state.completedBooks = progress.generatedBooks;
          this.state.logs = progress.log;
          this.persistState();
        }
      );

      this.state.isRunning = false;
      this.state.percentage = 100;
      this.state.currentStage = 'concluido';
      this.state.currentBookTitle = `${generated.length} livros gerados com sucesso!`;
      this.state.logs.push(`Lote finalizado com sucesso! ${generated.length} livros adicionados à estante.`);
      this.persistState();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kdp-final-books-updated'));
      }

      return generated;
    } catch (err: any) {
      this.state.isRunning = false;
      this.state.logs.push(`⚠️ ${err?.message || 'Falha na execução do lote.'}`);
      this.persistState();
      throw err;
    }
  }

  public cancelBatch() {
    if (this.state.isRunning) {
      this.cancelRequested = true;
      this.state.isRunning = false;
      this.state.logs.push('Operação de lote interrompida pelo usuário.');
      this.persistState();
    }
  }
}

export const batchBackgroundRunner = new BatchBackgroundRunnerManager();
