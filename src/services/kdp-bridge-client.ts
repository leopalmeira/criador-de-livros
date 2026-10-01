// Cliente para comunicação com a ponte local Python do kdp-book (http://127.0.0.1:8765)

export interface BridgeHealthResponse {
  status: 'online' | 'offline';
  message: string;
  python?: string;
  kdp_repo_present?: boolean;
  kdp_runner?: string;
  has_env?: boolean;
}

export interface BridgeRunStatus {
  id: string;
  status: 'iniciando' | 'executando' | 'concluido' | 'erro';
  progress: number;
  logs: string[];
  completed: boolean;
  error?: string;
  command?: string;
}

export interface BridgeBookSummary {
  slug: string;
  path: string;
  has_output: boolean;
  metadata?: any;
  modified: number;
}

export class KdpBridgeClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://127.0.0.1:8765') {
    this.baseUrl = baseUrl;
  }

  // --- CHECA SE O SERVIDOR PONTE PYTHON ESTÁ ATIVO ---
  async checkHealth(): Promise<BridgeHealthResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          status: 'online',
          message: data.message || 'Ponte kdp-book conectada',
          python: data.python,
          kdp_repo_present: data.kdp_repo_present,
          kdp_runner: data.kdp_runner,
          has_env: data.has_env
        };
      }
      return { status: 'offline', message: `Servidor ponte retornou HTTP ${res.status}` };
    } catch {
      return { status: 'offline', message: 'Servidor ponte local offline (http://127.0.0.1:8765)' };
    }
  }

  // --- EXECUTA DOCTOR ---
  async runDoctor(): Promise<{ ok: boolean; output: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/doctor`);
      return await res.json();
    } catch (err: any) {
      return { ok: false, output: `Falha ao conectar à ponte: ${err.message}` };
    }
  }

  // --- INICIA GERAÇÃO DE LIVRO VIA CLI ---
  async startGeneration(params: {
    topic: string;
    book_type: string;
    author?: string;
    language?: string;
    no_images?: boolean;
    quality?: string;
  }): Promise<{ ok: boolean; runId?: string; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Erro ao iniciar geração' };
      }
      return { ok: true, runId: data.runId };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  // --- CONSULTA STATUS E LOGS DA EXECUÇÃO ---
  async getRunStatus(runId: string): Promise<BridgeRunStatus | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/status/${runId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // --- LISTA LIVROS GERADOS PELO KDP-BOOK ---
  async listBooks(): Promise<BridgeBookSummary[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/books`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.books || [];
    } catch {
      return [];
    }
  }

  // --- DETALHES DE UM LIVRO ESPECÍFICO ---
  async getBook(slug: string): Promise<any | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/books/${slug}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}

export const defaultKdpBridge = new KdpBridgeClient();
