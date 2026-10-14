// ============================================================================
// BOOKENGIN — SISTEMA CENTRAL DE GERENCIAMENTO DE CARREGAMENTOS E MENSAGENS
// Controla estados de operações assíncronas, mensagens contextuais reais e
// previne duplicação de cliques ou encerramento indevido de tarefas concorrentes.
// ============================================================================

export type BookEnginTaskCategory =
  | 'livro_geracao'
  | 'capitulo_escrita'
  | 'capa_criacao'
  | 'imagem_geracao'
  | 'revisao_editorial'
  | 'humanizacao_anti_ia'
  | 'preparacao_kdp'
  | 'exportacao_arquivos'
  | 'amazon_pesquisa'
  | 'geral';

export interface BookEnginTaskState {
  id: string;
  category: BookEnginTaskCategory;
  title: string;
  message: string;
  currentStep?: number;
  totalSteps?: number;
  progress?: number; // 0 a 100 se real e mensurável
  startTime: number;
  error?: string | null;
  areaTarget?: string; // ID ou seletor da área onde foi clicado
}

export type BookEnginTaskListener = (tasks: Map<string, BookEnginTaskState>) => void;

export class BookEnginLoadingService {
  private static activeTasks = new Map<string, BookEnginTaskState>();
  private static listeners = new Set<BookEnginTaskListener>();

  /**
   * Catálogo de mensagens contextuais elegantes e autênticas por categoria
   */
  public static readonly CONTEXTUAL_MESSAGES: Record<BookEnginTaskCategory, { defaultTitle: string; messages: string[] }> = {
    livro_geracao: {
      defaultTitle: 'Criando seu Livro Bestseller...',
      messages: [
        'Estruturando o planejamento editorial e o público-alvo KDP...',
        'Formulando a arquitetura de capítulos e ganchos de retenção...',
        'Desenvolvendo a premissa central e a voz autoral...',
        'Organizando o sumário estratégico para a Amazon...'
      ]
    },
    capitulo_escrita: {
      defaultTitle: 'Escrevendo Capítulo...',
      messages: [
        'Redigindo com voz ativa e ritmo dinâmico de bestseller...',
        'Aprofundando os conceitos e exemplos práticos...',
        'Conectando a narrativa e aplicando técnicas de retenção...',
        'Finalizando os parágrafos e revisando a formatação...'
      ]
    },
    capa_criacao: {
      defaultTitle: 'Criando Conceitos Visuais de Capa...',
      messages: [
        'Analisando a paleta de cores e o posicionamento do nicho...',
        'Renderizando a composição visual em alta definição...',
        'Aplicando a hierarquia tipográfica e contraste comercial...',
        'Finalizando a arte nos padrões gráficos da Amazon KDP...'
      ]
    },
    imagem_geracao: {
      defaultTitle: 'Gerando Ilustração...',
      messages: [
        'Interpretando a cena e o estilo artístico do livro...',
        'Compondo luzes, sombras e detalhes da imagem...',
        'Processando a resolução e textura da página...',
        'Finalizando os detalhes da ilustração interna...'
      ]
    },
    revisao_editorial: {
      defaultTitle: 'Auditando Manuscrito...',
      messages: [
        'Verificando a gramática, concordância e pontuação...',
        'Analisando a coesão textual e transição entre parágrafos...',
        'Checando a coerência do enredo e continuidade temática...',
        'Conferindo os padrões de publicação profissional...'
      ]
    },
    humanizacao_anti_ia: {
      defaultTitle: 'Humanizando Conteúdo...',
      messages: [
        'Auditando e removendo clichês mecânicos de inteligência artificial...',
        'Aplicando variação de ritmo autoral (Burstiness)...',
        'Refinando o vocabulário para uma leitura magnética e natural...',
        'Polindo a cadência para soar autêntico e humano...'
      ]
    },
    preparacao_kdp: {
      defaultTitle: 'Preparando para a Amazon KDP...',
      messages: [
        'Formatando recuos de parágrafo e margens espelhadas KDP...',
        'Calculando lombada exata e espessura do miolo de impressão...',
        'Gerando a sinopse comercial em HTML com gatilhos mentais...',
        'Validando metadados de vendas e categorias BISAC...'
      ]
    },
    exportacao_arquivos: {
      defaultTitle: 'Exportando Pacote de Publicação...',
      messages: [
        'Gerando o PDF de miolo pronto para impressão 300 DPI...',
        'Compilando o arquivo EPUB Kindle com tags semânticas...',
        'Construindo a capa aberta com marcas de corte...',
        'Compactando o pacote ZIP oficial para envio...'
      ]
    },
    amazon_pesquisa: {
      defaultTitle: 'Pesquisando na Amazon...',
      messages: [
        'Consultando a barra de pesquisa oficial da Amazon em tempo real...',
        'Identificando os termos mais digitados pelos compradores do nicho...',
        'Filtrando frases de alta conversão sem termos proibidos...',
        'Indexando as 7 palavras-chave estratégicas para seu livro...'
      ]
    },
    geral: {
      defaultTitle: 'Processando com Inteligência Editorial...',
      messages: [
        'Executando a operação com máxima precisão...',
        'Refinando os dados e salvando o progresso...',
        'Quase pronto... finalizando os últimos ajustes...'
      ]
    }
  };

  /**
   * Registra um ouvinte para receber atualizações do estado global de tarefas
   */
  public static subscribe(listener: BookEnginTaskListener): () => void {
    this.listeners.add(listener);
    listener(new Map(this.activeTasks));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners() {
    const snapshot = new Map(this.activeTasks);
    this.listeners.forEach(l => {
      try {
        l(snapshot);
      } catch (err) {
        console.error('[BookEnginLoadingService] Erro no listener:', err);
      }
    });
  }

  /**
   * Inicia uma tarefa assíncrona com identidade e contexto
   */
  public static startTask(
    taskId: string,
    options: {
      category?: BookEnginTaskCategory;
      title?: string;
      message?: string;
      currentStep?: number;
      totalSteps?: number;
      progress?: number;
      areaTarget?: string;
    } = {}
  ): BookEnginTaskState {
    const category = options.category || 'geral';
    const catConfig = this.CONTEXTUAL_MESSAGES[category] || this.CONTEXTUAL_MESSAGES.geral;

    const state: BookEnginTaskState = {
      id: taskId,
      category,
      title: options.title || catConfig.defaultTitle,
      message: options.message || catConfig.messages[0],
      currentStep: options.currentStep,
      totalSteps: options.totalSteps,
      progress: options.progress,
      startTime: Date.now(),
      areaTarget: options.areaTarget,
      error: null
    };

    this.activeTasks.set(taskId, state);
    this.notifyListeners();
    return state;
  }

  /**
   * Atualiza a mensagem, etapa ou progresso real de uma tarefa em andamento
   */
  public static updateTask(taskId: string, updates: Partial<Omit<BookEnginTaskState, 'id' | 'startTime'>>) {
    const current = this.activeTasks.get(taskId);
    if (!current) return;

    const updated: BookEnginTaskState = {
      ...current,
      ...updates
    };

    this.activeTasks.set(taskId, updated);
    this.notifyListeners();
  }

  /**
   * Finaliza com sucesso a tarefa e limpa o indicador
   */
  public static completeTask(taskId: string) {
    if (this.activeTasks.has(taskId)) {
      this.activeTasks.delete(taskId);
      this.notifyListeners();
    }
  }

  /**
   * Registra um erro e encerra o carregamento com segurança
   */
  public static failTask(taskId: string, errorMsg?: string) {
    if (this.activeTasks.has(taskId)) {
      const current = this.activeTasks.get(taskId)!;
      this.activeTasks.set(taskId, {
        ...current,
        error: errorMsg || 'Ocorreu uma instabilidade momentânea na operação.'
      });
      this.notifyListeners();

      // Remove após breve intervalo para dar ciência do erro
      setTimeout(() => {
        this.activeTasks.delete(taskId);
        this.notifyListeners();
      }, 3500);
    }
  }

  /**
   * Verifica se uma tarefa específica está ativa
   */
  public static isTaskActive(taskId: string): boolean {
    return this.activeTasks.has(taskId);
  }

  /**
   * Retorna o estado de uma tarefa ou null
   */
  public static getTask(taskId: string): BookEnginTaskState | null {
    return this.activeTasks.get(taskId) || null;
  }
}
